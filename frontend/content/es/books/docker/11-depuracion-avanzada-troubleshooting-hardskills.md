En el ciclo de vida de DevOps, la diferencia entre un perfil junior y uno senior reside en la capacidad de resolver incidentes críticos bajo presión. Este capítulo aborda el diagnóstico forense de contenedores cuando las herramientas convencionales fallan. Aprenderás a diseccionar el estado **Crashlooping** mediante códigos de salida, a intervenir imágenes **Distroless** sin shell mediante *namespaces* compartidos y a realizar análisis de bajo nivel con `strace` y `tcpdump` desde el host. Finalmente, optimizaremos el rendimiento identificando cuellos de botella de I/O en **overlay2**, garantizando infraestructuras resilientes y de alto rendimiento.

## 11.1. Depuración de contenedores que fallan al iniciar ("Crashlooping")

El término *Crashlooping* (heredado a menudo del estado `CrashLoopBackOff` en Kubernetes) describe uno de los escenarios más frustrantes en el ciclo de vida de un contenedor: el contenedor se instancia, intenta ejecutar su proceso principal, falla casi de inmediato y, si tiene una política de reinicio configurada (`--restart always` o `on-failure`), entra en un bucle infinito de caídas y reinicios.

A diferencia de un contenedor que degrada su rendimiento con el tiempo, un contenedor que falla en el arranque rara vez te da la oportunidad de entrar en él con `docker exec` para diagnosticar el problema, ya que el contenedor simplemente no existe en estado *running* el tiempo suficiente.

Para un perfil Senior, la depuración de este escenario no se basa en adivinar, sino en un proceso sistemático de análisis forense.

### 1. El lenguaje de los Códigos de Salida (Exit Codes)

Cuando un proceso en Linux termina, devuelve un código de salida al sistema operativo. Docker captura este código del proceso principal (PID 1) y lo asigna como el código de salida del contenedor. Conocer estos números de memoria te ahorrará horas de diagnóstico.

Puedes aislar el código de salida del último fallo utilizando `docker inspect` con plantillas Go:

```bash
docker inspect --format='{{.State.ExitCode}} - {{.State.Error}}' <nombre_o_id_del_contenedor>

```

**Tabla de Códigos de Salida Críticos:**

| Código | Significado Unix/Docker | Diagnóstico DevOps |
| --- | --- | --- |
| **0** | Éxito intencional. | Si tu contenedor web/API sale con 0, el proceso se demonizó (pasó a *background*). Recuerda que Docker requiere que el PID 1 se ejecute en *foreground*. (Ej: Olvidaste `daemon off;` en Nginx). |
| **1** | Fallo general de la aplicación. | Error a nivel de código (ej. excepción en Python/Node, error de conexión a base de datos en el inicio, archivo de configuración YAML malformado). Requiere inspeccionar los logs. |
| **126** | Comando invocado no ejecutable. | Problema de permisos. El archivo definido en `CMD` o `ENTRYPOINT` no tiene permisos de ejecución (`chmod +x`). |
| **127** | Archivo o comando no encontrado. | Falla el *shebang* (`#!/bin/bash` pero la imagen es Alpine y usa `sh`), falta una librería dinámica de C, o **el script tiene saltos de línea de Windows (CRLF) en lugar de Linux (LF)**. |
| **137** | SIGKILL (Terminación forzada). | Generalmente causado por el *OOM Killer* del host (ver sección 10.3). El contenedor consumió más RAM de la asignada en sus *cgroups*. |
| **139** | SIGSEGV (Segmentation Fault). | Falla a nivel de memoria del binario. Común al usar binarios compilados para arquitecturas distintas o bugs en librerías nativas (C/C++). |

### 2. Árbol de Decisión para Troubleshooting Rápido

Para estructurar la depuración, sigue este diagrama de flujo lógico:

```text
[Inicio del Contenedor] ---> [Fallo Inmediato (Exit Code != 0)]
                                      |
                                      v
                        ¿Hay salida en 'docker logs'?
                               /             \
                             SÍ               NO
                            /                   \
            [Problema de Aplicación]        [Problema de Infra/SO]
            - Credenciales inválidas        - Código 126: Permisos denegados
            - Variables de entorno          - Código 127: Faltan binarios/CRLF
              faltantes o erróneas          - Código 137: OOMKilled
            - Puerto ya en uso              - Entrypoint mal definido
            - Dependencia caída             - Volúmenes montados incorrectamente

```

### 3. Técnicas de Intervención Directa

Dado que no puedes usar `docker exec` en un contenedor muerto, debes alterar la forma en que la imagen arranca para mantener el contenedor vivo de forma artificial y poder explorar su interior.

#### Técnica A: Sobrescribir el Entrypoint (El "Paso Atrás")

Si el contenedor falla porque su `ENTRYPOINT` está corrompido o falla, puedes lanzar un contenedor efímero a partir de la misma imagen, pero reemplazando el comando de inicio por una shell interactiva.

*Nota: Esto asume que la imagen tiene una shell disponible. Si es una imagen "Distroless", aplicaremos las técnicas de la sección 11.2.*

```bash
# Anula el entrypoint original y lanza una shell de Bourne (común en Alpine y Debian)
docker run --rm -it --entrypoint /bin/sh mi-imagen:latest

```

Una vez dentro, puedes ejecutar el script de inicio manualmente (ej. `./start.sh`) y observar exactamente en qué línea falla, o verificar si las variables de entorno inyectadas están llegando correctamente usando el comando `env`.

#### Técnica B: El parche del "Sleep Infinito"

A veces, el problema no está en el `ENTRYPOINT`, sino en el entorno de red o en los volúmenes montados en el clúster o servidor de producción. Sobrescribir el Entrypoint a veces elimina el contexto del problema. En su lugar, puedes inyectar un comando neutral que mantenga el contenedor con vida bajo las mismas condiciones (misma red, mismos volúmenes):

En tu archivo `docker-compose.yml` (o equivalente en CLI), modifica temporalmente el comando de inicio:

```yaml
services:
  app-rota:
    image: mi-imagen:latest
    # Reemplazamos el CMD original por un proceso que no hace nada
    command: ["tail", "-f", "/dev/null"]
    # o alternativamente: command: ["sleep", "infinity"]

```

Levanta el servicio. Ahora el contenedor se quedará "congelado" en estado de ejecución. En este punto, ya puedes usar tu herramienta habitual:

```bash
docker exec -it <id_contenedor> /bin/sh

```

#### Técnica C: Auditoría Post-Mortem de Sistemas de Archivos (Exportación)

Existen casos donde la aplicación arranca, modifica archivos, sufre un pánico severo y muere sin dejar rastros en `stdout`. Si sobrescribes el entrypoint, no verás qué archivos temporales creó la aplicación antes de morir.

Para estos casos, puedes inspeccionar el cadáver del contenedor. Docker mantiene la capa de lectura/escritura (R/W) del contenedor detenido hasta que lo eliminas con `docker rm`.

Puedes exportar todo el sistema de archivos del contenedor fallido a un archivo *tar* para inspeccionarlo en tu máquina host:

```bash
# 1. Identifica el ID del contenedor fallido (incluso si está en status Exited)
docker ps -a

# 2. Exporta su sistema de archivos completo
docker export <id_contenedor_muerto> > contenedor_muerto.tar

# 3. Descomprime y analiza (ej. buscando archivos de volcado de memoria o logs internos)
mkdir analisis_postmortem && tar -xf contenedor_muerto.tar -C analisis_postmortem

```

### 4. El "Asesino Silencioso": Saltos de línea CRLF vs LF

Merece una mención especial el error **127 (Command not found)** que vuelve locos a muchos desarrolladores que utilizan Windows como estación de trabajo.

Si clonas un repositorio en Windows, Git puede convertir los saltos de línea de los scripts bash de Linux (`\n`, LF) al estándar de Windows (`\r\n`, CRLF). Cuando Docker construye la imagen y copia este script, el kernel de Linux dentro del contenedor intenta ejecutar la primera línea: `#!/bin/bash\r`.

Dado que `/bin/bash\r` (con el retorno de carro incrustado en el nombre) no existe, el contenedor falla inmediatamente en el arranque.

**Solución DevOps:**
Asegúrate de configurar `.gitattributes` en tu repositorio para forzar siempre el formato LF en los scripts, o utiliza la herramienta `dos2unix` directamente dentro de tu `Dockerfile` antes de definir el comando de ejecución:

```dockerfile
# Fragmento de Dockerfile para sanear scripts conflictivos
COPY entrypoint.sh /usr/local/bin/
RUN apk add --no-cache dos2unix && \
    dos2unix /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]

```

Dominar la lectura de códigos de salida y saber cómo "pausar" el inicio de un contenedor son habilidades fundamentales que marcan la línea entre intentar arrancar un contenedor esperando un milagro y auditar su fallo como un verdadero ingeniero de sistemas.

## 11.2. Intervención en contenedores sin shell (Distroless) usando herramientas efímeras

La adopción de imágenes *Distroless* (como las provistas por Google) o construcciones desde `scratch` representa el pináculo de la seguridad y optimización en la contenerización. Al eliminar gestores de paquetes, utilidades del sistema y, lo más importante, la *shell* (`/bin/sh` o `/bin/bash`), reduces drásticamente la superficie de ataque y la presencia de vulnerabilidades (CVEs).

Sin embargo, esta victoria en seguridad crea una pesadilla operativa cuando las cosas fallan: si intentas el clásico `docker exec -it <id> sh`, te encontrarás con un muro de ladrillos en forma de error: `OCI runtime exec failed: exec failed: container_linux.go:380: starting container process caused: exec: "sh": executable file not found in $PATH`.

Para un ingeniero Senior, la ausencia de una shell no significa que el contenedor sea una caja negra impenetrable. La solución radica en aprovechar la arquitectura de *namespaces* de Linux mediante el uso de **herramientas efímeras** o contenedores "sidecar" de depuración.

### 1. El Patrón Sidecar de Depuración (Compartir Namespaces)

Dado que un contenedor es fundamentalmente una agrupación de procesos aislados por *namespaces*, podemos lanzar un **segundo contenedor** (repleto de herramientas de diagnóstico) y configurarlo para que comparta los *namespaces* críticos con nuestro contenedor Distroless objetivo.

Una de las imágenes más populares en la industria para este propósito es `nicolaka/netshoot`, la cual contiene utilidades como `tcpdump`, `strace`, `curl`, `dig`, y `jq`.

Para inyectar este contenedor de depuración en el entorno del contenedor ciego, ejecutamos:

```bash
# Asumiendo que 'app-distroless' es el nombre o ID de tu contenedor fallido/bloqueado
docker run --rm -it \
  --name depurador-efimero \
  --pid=container:app-distroless \
  --network=container:app-distroless \
  nicolaka/netshoot

```

**¿Qué logramos con este comando?**

```text
+-------------------------------------------------------------+
|                        Docker Host                          |
|                                                             |
|   [Contenedor Distroless]        [Contenedor Depurador]     |
|   (App Java/Go/Node)             (Netshoot / Alpine)        |
|                                                             |
|   Namespace de Red <================> Namespace de Red      |
|   (Misma IP, mismos puertos)                                |
|                                                             |
|   Namespace PID <===================> Namespace PID         |
|   (Ven los mismos procesos)           (Herramientas ricas)  |
|                                                             |
|   Namespace Mount (Archivos) =X=      Namespace Mount       |
|   (Sistema base mínimo)               (Binarios de Linux)   |
+-------------------------------------------------------------+

```

Al compartir los *namespaces* de Red y PID (`--network` y `--pid`), desde dentro de la terminal de tu contenedor depurador puedes ejecutar `ps aux` y **verás el proceso de tu aplicación Distroless**. Puedes ejecutar `netstat -tulpn` y verás los puertos que está abriendo. Puedes incluso ejecutar `strace -p <PID>` para rastrear las llamadas al sistema que está haciendo la aplicación bloqueada, todo sin haber instalado nada en la imagen original.

### 2. Acceso al Sistema de Archivos del Contenedor Ciego (El Truco de `/proc`)

Si observas el diagrama anterior, notarás que el *namespace Mount* (el sistema de archivos) **no** se comparte. Esto significa que si intentas hacer un `cat /app/config.json` desde el contenedor depurador, no encontrarás el archivo, ya que estás navegando por el disco de `netshoot`, no por el de tu app Distroless.

Aquí es donde entra el conocimiento profundo de Linux. El pseudo-sistema de archivos `/proc` contiene una representación en memoria de los procesos. Ya que compartimos el *namespace PID*, podemos acceder a la raíz del sistema de archivos de cualquier proceso visible a través de `/proc/<PID>/root`.

Sabiendo que el proceso principal de tu app en el contenedor Distroless suele ser el PID 1 (o visible fácilmente con `ps`), puedes navegar por sus entrañas usando tu contenedor depurador:

```bash
# Desde dentro de la terminal interactiva del depurador (netshoot):

# Listar los archivos en el directorio raíz del contenedor Distroless
ls -la /proc/1/root/

# Leer un archivo de configuración de la aplicación Distroless
cat /proc/1/root/app/config/settings.yaml

# Copiar un volcado de memoria (heap dump) o log generado por la app
cp /proc/1/root/tmp/error.log /workspace/

```

Este es un "truco de magia" esencial en SRE: estás leyendo y operando sobre el disco de un contenedor sin shell, utilizando los binarios de otro contenedor.

### 3. Inyección Manual de Binarios Estáticos (Método Alternativo)

Si por alguna restricción de políticas de seguridad en tu entorno no puedes lanzar contenedores privilegiados o manipular los *namespaces* libremente, existe un enfoque de fuerza bruta: inyectar temporalmente una shell compilada estáticamente (como `busybox`) directamente en el contenedor Distroless en tiempo de ejecución.

```bash
# 1. Descargamos un binario de busybox estático en el host
wget https://www.busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox

# 2. Le damos permisos de ejecución
chmod +x busybox

# 3. Lo copiamos dentro del contenedor ciego en ejecución
docker cp busybox app-distroless:/busybox

# 4. Usamos exec para invocar la shell que acabamos de inyectar
docker exec -it app-distroless /busybox sh

```

*Nota Senior:* Este método es útil, pero fallará si el contenedor fue instanciado con buenas prácticas de seguridad y tiene su sistema de archivos en modo solo lectura (`read_only: true` en Docker Compose o `--read-only` en CLI). En esos casos, debes depender obligatoriamente del patrón Sidecar explicado en el punto 1.

### 4. La Evolución: Preparando el camino hacia Kubernetes

Dominar estas técnicas a nivel de motor Docker es crucial porque asienta las bases para lo que encontrarás en orquestadores de mayor escala.

El patrón de inyectar un contenedor temporal compartiendo *namespaces* que acabamos de hacer a mano con `docker run`, es exactamente el mismo mecanismo subyacente que utiliza el comando avanzado `kubectl debug` (Ephemeral Containers) en Kubernetes, permitiéndote diagnosticar Pods colapsados en clústeres de producción sin comprometer su inmutabilidad o postura de seguridad.

## 11.3. Análisis de procesos a bajo nivel: uso de `nsenter`, `strace` y `tcpdump` desde el host

Llega un punto en la carrera de todo ingeniero de infraestructura en el que las abstracciones estorban. ¿Qué sucede cuando las políticas de seguridad de tu entorno (como un clúster productivo bloqueado) prohíben estrictamente el lanzamiento de contenedores *sidecar* o el uso de privilegios adicionales? ¿Qué haces cuando el contenedor está tan degradado que ni siquiera puede sostener un proceso secundario?

Es aquí donde debemos recordar la máxima del Capítulo 1: **Los contenedores no existen**. Son una ilusión construida sobre características del kernel de Linux (Namespaces y cgroups). A nivel del sistema operativo *host*, tu contenedor web hiper-seguro y aislado no es más que un proceso regular (usualmente ejecutándose como un proceso hijo del demonio `containerd`).

Si tienes acceso por SSH al nodo o máquina *host* donde se ejecuta Docker, tienes el control absoluto. Puedes auditar, espiar e intervenir el contenedor sin tocar la API de Docker y sin que el contenedor se entere.

### 1. El Santo Grial: Encontrar el Host PID

El paso cero para cualquier técnica de depuración a bajo nivel desde el host es mapear el identificador del contenedor hacia el Identificador de Proceso (PID) real en el sistema operativo anfitrión.

```bash
# Obtener el PID real del host para el proceso raíz del contenedor
docker inspect --format '{{.State.Pid}}' <id_o_nombre_del_contenedor>

```

Supongamos que este comando nos devuelve el PID **`4132`**. A partir de este momento, dejamos de usar comandos de `docker` y comenzamos a hablar directamente con el kernel de Linux.

### 2. Rompiendo la pared con `nsenter` (Namespace Enter)

La herramienta `nsenter` permite a un proceso (como tu sesión de terminal actual en el host) "entrar" en uno o más *namespaces* de otro proceso existente. Es el equivalente a teletransportarse dentro del perímetro de seguridad del contenedor, pero usando los binarios que tienes instalados en tu máquina host.

**Diagrama de Arquitectura Lógica de nsenter:**

```text
[ HOST LINUX ]
 ├─ /bin/bash (Tu sesión SSH) ---> Herramientas ricas (curl, vim, htop)
 │
 └─ Proceso PID 4132 (Tu contenedor Distroless)
     ├─ Namespace de Red (IP aislada)
     ├─ Namespace de Montaje (Sistema de archivos aislado)
     └─ Namespace de PID (Árbol de procesos aislado)

Comando: nsenter -t 4132 -n
Resultado: Tu sesión SSH ahora usa la tarjeta de red del contenedor, 
           pero sigues viendo los archivos y binarios del Host.

```

**Casos de uso clave de `nsenter`:**

* **Auditoría de Red sin tocar el contenedor:**
Si quieres ver qué reglas de iptables tiene el contenedor o probar su conectividad DNS, puedes entrar *solo* a su namespace de red (`-n`).

```bash
# Ejecuta 'ip addr' y 'curl' usando la red del contenedor, pero desde el host
nsenter -t 4132 -n ip addr
nsenter -t 4132 -n curl http://servicio-interno.local

```

* **Invasión total (El reemplazo definitivo de `docker exec`):**
Si quieres entrar a todos los namespaces (Montaje, Red, IPC, UTS y PID), usas:

```bash
nsenter -t 4132 -m -u -i -n -p /bin/sh

```

### 3. Radiografía en tiempo real con `strace`

A veces el contenedor no muere, pero se queda "colgado" (deadlock) o consumiendo 100% de CPU sin emitir un solo log. ¿Cómo sabes qué está haciendo el código si no tienes métricas internas?

`strace` intercepta y registra las llamadas al sistema (syscalls) que un proceso hace al kernel. Dado que todas las operaciones importantes (leer un archivo, abrir un socket de red, asignar memoria) requieren una llamada al kernel, `strace` te permite ver los pensamientos íntimos de la aplicación.

```bash
# Rastrear al proceso principal y a todos sus subprocesos/hilos (-f)
strace -p 4132 -f -e trace=file,network

```

**Diagnóstico SRE típico usando strace:**
Imagina que ejecutas el comando anterior y ves un flujo infinito de este error:
`openat(AT_FDCWD, "/etc/app/secrets/token.key", O_RDONLY) = -1 EACCES (Permission denied)`

Acabas de encontrar el problema. La aplicación está en un bucle intentando leer un archivo de secretos montado vía volumen, pero el usuario no-root dentro del contenedor (Capítulo 8) no tiene permisos de lectura a nivel del sistema de archivos del host. Todo esto descubierto sin mirar un solo log de la aplicación.

### 4. Análisis de paquetes con `tcpdump` y las interfaces `veth`

La depuración de redes suele ser el punto más débil de los desarrolladores. Si un contenedor afirma que "no puede llegar a la base de datos", un SRE no asume que es un error de código; verifica los paquetes a nivel TCP/IP.

Instalar `tcpdump` dentro de una imagen de producción es una pésima práctica de seguridad. En su lugar, capturamos el tráfico desde el exterior.

Cuando Docker crea una red tipo *bridge*, empareja la interfaz virtual del contenedor (`eth0`) con una interfaz virtual en el host, generalmente llamada `vethXXXXXXX`. Todo el tráfico del contenedor pasa por este túnel.

**Paso 1: Identificar la interfaz `veth` del contenedor en el host.**
*Puedes usar un pequeño truco consultando el índice del enlace de red dentro del namespace del contenedor y buscándolo en el host:*

```bash
# 1. Obtener el índice de la interfaz eth0 del contenedor
nsenter -t 4132 -n ip link show eth0 | grep -oP '(?<=eth0@if)\d+'
# Supongamos que devuelve "15"

# 2. Buscar esa interfaz en el host
ip link | grep -E "^15:"
# Resultado: 15: veth9a8b7c6@if14: <BROADCAST,MULTICAST,UP,LOWER_UP>...

```

**Paso 2: Iniciar la captura desde el host.**
Ahora que sabemos que el tráfico del contenedor fluye a través de `veth9a8b7c6`, usamos el `tcpdump` instalado en nuestro servidor host para espiar exclusivamente esa tubería:

```bash
# Capturar todo el tráfico del contenedor en formato pcap (para analizar en Wireshark)
tcpdump -i veth9a8b7c6 -nn -s0 -w analisis_db.pcap

# O espiar las peticiones HTTP/DNS en texto plano en tiempo real
tcpdump -i veth9a8b7c6 -nn -A port 80 or port 53

```

El dominio de `nsenter`, `strace` y `tcpdump` transforma a un administrador de sistemas en un cirujano. Te otorgan la capacidad de diagnosticar cajas negras absolutas, validar hipótesis de conectividad o I/O sin modificar el estado de ejecución, y mantener intacta la postura de seguridad (inmutabilidad) de tu infraestructura contenerizada.

## 11.4. Diagnóstico de cuellos de botella de I/O en sistemas de archivos overlay2

El driver de almacenamiento `overlay2` es el estándar de facto en Docker. Es brillante para la deduplicación y el arranque rápido de contenedores, ya que permite que múltiples instancias compartan las mismas capas base de solo lectura. Sin embargo, esta eficiencia arquitectónica esconde un depredador silencioso del rendimiento: la penalización del **Copy-on-Write (CoW)**.

Uno de los errores más comunes —y destructivos— en entornos contenerizados es permitir que aplicaciones con alta intensidad de entrada/salida (I/O), como bases de datos (PostgreSQL, MySQL), brokers de mensajería (Kafka) o cachés en disco, escriban directamente en la capa efímera del contenedor.

Para un perfil Senior, diagnosticar un cuello de botella de I/O no se trata solo de ver que "el disco está lento", sino de rastrear la contención exacta a través de la pila del sistema de archivos *UnionFS* de Docker.

### 1. Entendiendo la Penalización Copy-on-Write (CoW)

En `overlay2`, el sistema de archivos de un contenedor se compone visualmente de la siguiente manera:

```text
+-------------------------------------------------------------+
| Capa del Contenedor (UpperDir)  [Lectura/Escritura]         |
|   ↳ Aquí van los cambios efímeros.                          |
+-------------------------------------------------------------+
| Capa de Imagen (LowerDir)       [Solo Lectura]              |
|   ↳ Código fuente, librerías instaladas vía Dockerfile.     |
+-------------------------------------------------------------+
| Capa Base (LowerDir)            [Solo Lectura]              |
|   ↳ Sistema operativo base (ej. Alpine, Ubuntu).            |
+-------------------------------------------------------------+

```

Cuando un proceso dentro del contenedor lee un archivo, la operación es casi nativa y muy rápida. Pero, ¿qué pasa cuando el proceso intenta **modificar** un archivo de 1 GB que reside en una capa inferior (LowerDir)?

1. El driver `overlay2` intercepta la petición.
2. Busca el archivo en las capas de solo lectura de arriba hacia abajo.
3. **Copia** el archivo completo desde el `LowerDir` al `UpperDir` (la capa R/W del contenedor).
4. Recién entonces, permite que la aplicación escriba la modificación.

Si la aplicación hace esto miles de veces por segundo sobre archivos diferentes, o sobre archivos muy pesados, el disco del host colapsará por las operaciones de lectura y escritura redundantes, disparando el uso de CPU y el I/O Wait.

### 2. Sintomatología a nivel de Host

El primer indicador de que `overlay2` está sufriendo ocurre a nivel del sistema operativo anfitrión. Si notas latencia en los servicios, entra al nodo y ejecuta `top` o `htop`.

Busca la métrica **`wa`** (I/O Wait). Si este porcentaje es constantemente alto (ej. > 15-20%), la CPU está pasando demasiado tiempo ociosa esperando a que el disco físico termine de procesar las operaciones.

Para confirmar la saturación física, utiliza `iostat` (del paquete `sysstat`):

```bash
# Monitorear discos cada 2 segundos
iostat -x 2

```

Presta atención a las columnas **`%util`** (qué tan saturado está el dispositivo físico) y **`await`** (el tiempo promedio, en milisegundos, de espera para las peticiones I/O). Si `%util` se acerca al 100%, tienes un cuello de botella severo.

### 3. Cacería del culpable: De la saturación al Contenedor

Saber que el disco está saturado no te dice *qué* contenedor lo está causando. Aquí es donde combinamos herramientas del host con el CLI de Docker.

**Paso 1: Identificar el proceso abusivo con `pidstat` o `iotop`**

```bash
# Listar los procesos ordenados por uso de I/O de disco (kB_read/s y kB_ccwr/s)
sudo pidstat -d 2

```

Supongamos que el resultado muestra un proceso `java` o `mysqld` con el **PID `8432**` escribiendo docenas de megabytes por segundo de forma sostenida.

**Paso 2: Mapear el PID del host al Contenedor de Docker**

Dado que el PID 8432 es el identificador en el host, necesitamos encontrar a qué contenedor pertenece. Puedes usar este bucle en bash para escanear todos los contenedores en ejecución e imprimir cuál contiene ese proceso principal:

```bash
#!/bin/bash
TARGET_PID=8432
for container in $(docker ps -q); do
    CPID=$(docker inspect --format '{{.State.Pid}}' $container)
    if [ "$CPID" -eq "$TARGET_PID" ]; then
        docker inspect --format 'El culpable es: {{.Name}}' $container
        break
    fi
done

```

*Nota: Alternativamente, puedes usar `crictl ps` si estás en un entorno Kubernetes/containerd puro, o buscar el PID en los cgroups: `cat /proc/8432/cgroup`.*

### 4. Análisis profundo con `docker diff` y solución

Una vez identificado el contenedor culpable, el diagnóstico final es confirmar qué archivos está modificando en la capa R/W de `overlay2`. Docker tiene un comando nativo (aunque poco usado) para esto:

```bash
# Muestra los archivos modificados (C), añadidos (A) o eliminados (D) en la capa efímera
docker diff <nombre_del_contenedor>

```

Si ejecutas esto y ves una lista interminable de archivos terminados en `.log`, o bases de datos SQLite (`.db`), o archivos temporales de sesión, has encontrado el cuello de botella. El proceso está pagando el impuesto de CoW masivamente.

### 5. Remediación (La Regla de Oro del I/O en Docker)

La solución a la saturación de `overlay2` nunca es cambiar la configuración del kernel ni comprar discos más rápidos (escalado vertical perezoso). La solución estructural es **esquivar el storage driver (UnionFS)**.

1. **Montaje de Volúmenes (Volumes / Bind Mounts):** Cualquier directorio donde tu aplicación escriba frecuentemente debe ser mapeado como un Volumen. Los volúmenes montan el sistema de archivos nativo del host (ext4, xfs) directamente en el contenedor, saltándose el driver `overlay2` y logrando un rendimiento de I/O nativo (sin penalización CoW).

```yaml
# Ejemplo en docker-compose
services:
  base_datos:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data # <--- Bypassea overlay2

```

1. **Uso de `tmpfs` para datos efímeros:**
Si la aplicación requiere escribir archivos temporales que no necesitan persistir reinicios (ej. cachés de plantillas, procesamiento en memoria de imágenes), monta ese directorio en RAM usando `tmpfs`.

```bash
docker run -d \
  --name mi-app-intensiva \
  --tmpfs /app/cache:rw,noexec,nosuid,size=512m \
  mi-imagen:latest

```

Comprender cómo `overlay2` gestiona las escrituras permite a un ingeniero SRE transformar una infraestructura inestable y lenta en un entorno predecible y altamente performante, simplemente redirigiendo el flujo de los datos.
