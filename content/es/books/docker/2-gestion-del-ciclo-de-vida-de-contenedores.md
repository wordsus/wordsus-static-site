Dominar Docker requiere trascender el simple lanzamiento de servicios; implica gobernar el flujo completo de un contenedor desde su nacimiento hasta su eliminación. En este capítulo, desglosaremos la **CLI de Docker** para manipular estados de ejecución, flujos de datos y políticas de resiliencia. Aprenderás a orquestar el aislamiento mediante la gestión de puertos y variables de entorno, y a extraer telemetría crítica mediante herramientas de inspección. El objetivo es transformar la interacción manual en una operativa senior capaz de garantizar la **alta disponibilidad** y el diagnóstico preciso en entornos locales y productivos.

## 2.1. Comandos esenciales del Docker CLI (`run`, `ps`, `stop`, `rm`, `exec`)

En el capítulo anterior, exploramos cómo el cliente de Docker se comunica con el demonio (Daemon) a través de una API REST. Ahora, es el momento de poner las manos en el teclado. La Interfaz de Línea de Comandos (CLI) de Docker será tu herramienta de trabajo diaria; dominarla es el primer paso real hacia la fluidez operativa.

Para entender cómo interactúan los comandos esenciales, primero debemos visualizar el ciclo de vida básico de un contenedor.

**Diagrama de estados y comandos:**

```text
  (Registro local/remoto)
       [ Imagen ]
           |
           | docker run
           v
   [ En Ejecución ] <-----------+
           |                    |
           | docker exec        |
       (Proceso                 | docker start
        nuevo)                  |
           |                    |
           | docker stop        |
           v                    |
     [ Detenido ] --------------+
           |
           | docker rm
           v
     [ Eliminado ]

```

A continuación, desglosaremos los "Cinco Grandes" comandos que utilizarás para gobernar este ciclo de vida.

### 1. `docker run`: La navaja suiza de la creación

Si hay un comando que ejecutarás miles de veces en tu carrera, es este. `docker run` es, en realidad, una operación compuesta. Cuando lo ejecutas, el demonio de Docker hace lo siguiente en segundo plano:

1. **Pull:** Busca la imagen localmente; si no existe, la descarga del Registry.
2. **Create:** Crea un contenedor inyectando una capa de lectura/escritura sobre la imagen base.
3. **Start:** Arranca el contenedor y ejecuta el comando principal definido en la imagen.

**Sintaxis básica:**

```bash
docker run [OPCIONES] <NOMBRE_DE_LA_IMAGEN> [COMANDO]

```

*Ejemplo:* `docker run nginx` iniciará un servidor web, aunque bloqueará tu terminal. En las próximas secciones (2.2 y 2.3) aprenderemos a utilizar modificadores cruciales para ejecutarlo en segundo plano, asignarle nombres, exponer puertos y pasarle configuraciones.

### 2. `docker ps`: Tu radar de contenedores

Una vez que tienes contenedores corriendo, necesitas saber qué está pasando en tu host. `docker ps` (Process Status) es el equivalente al comando `ps` de Linux, pero aislado al ecosistema de contenedores.

Si ejecutas `docker ps` a secas, verás **únicamente los contenedores que están actualmente en ejecución**.

**Sintaxis básica:**

```bash
docker ps

```

La salida te mostrará columnas vitales:

* **CONTAINER ID:** El hash alfanumérico único del contenedor.
* **IMAGE:** La imagen base que está utilizando.
* **COMMAND:** El proceso principal que mantiene vivo al contenedor.
* **STATUS:** El tiempo que lleva en ejecución (ej. `Up 5 minutes`).
* **NAMES:** Un nombre legible. Si no le asignas uno al crearlo, Docker generará uno aleatorio (como `jovial_turing` o `sleepy_einstein`).

*Pro-Tip Senior:* Para ver **todos** los contenedores, incluidos los detenidos o los que fallaron al arrancar, utiliza la bandera `-a` (all): `docker ps -a`.

### 3. `docker exec`: Infiltración quirúrgica

Un error muy común al empezar con Docker es pensar que un contenedor es como una máquina virtual a la que te conectas por SSH. No lo es. Sin embargo, a veces necesitas entrar a un contenedor que ya está corriendo para depurar algo, revisar un archivo de configuración o lanzar una consulta a una base de datos.

Aquí es donde brilla `docker exec`. Este comando te permite ejecutar un **nuevo proceso** dentro del namespace de un contenedor que ya está en funcionamiento.

**Sintaxis básica:**

```bash
docker exec [OPCIONES] <NOMBRE_O_ID_DEL_CONTENEDOR> <COMANDO>

```

*Ejemplo:* Si tienes un contenedor llamado `mi_nginx` y quieres ver el contenido de un archivo sin modificar tu terminal actual:

```bash
docker exec mi_nginx cat /etc/nginx/nginx.conf

```

*(Nota: Más adelante veremos cómo usar `exec` de forma interactiva para abrir una consola bash/sh dentro del contenedor).*

### 4. `docker stop`: El apagado elegante

Cuando un contenedor ya no es necesario o requiere ser reiniciado, debes detenerlo. `docker stop` envía una señal `SIGTERM` (Signal Terminate) al proceso principal del contenedor (el PID 1).

Esta señal le dice a la aplicación: *"Por favor, termina lo que estás haciendo, guarda tus datos, cierra las conexiones y apágate"*. Es un apagado controlado (Graceful Shutdown).

**Sintaxis básica:**

```bash
docker stop <NOMBRE_O_ID_DEL_CONTENEDOR>

```

*Pro-Tip Senior:* Por defecto, Docker espera 10 segundos después de enviar el `SIGTERM`. Si el proceso no se ha detenido en ese tiempo, Docker asume que el proceso está congelado o ignorando la señal, y procederá a enviar un `SIGKILL`, matando el proceso inmediatamente. Nunca uses `docker kill` directamente a menos que `docker stop` haya fallado o estés en una emergencia, ya que puedes corromper datos.

### 5. `docker rm`: Limpieza del entorno

Detener un contenedor no lo borra del disco. Queda en un estado de letargo (`Exited`), conservando su capa de lectura/escritura por si quieres volver a iniciarlo con `docker start`. Sin embargo, las buenas prácticas de DevOps dictan que los contenedores son efímeros; si se detienen por una actualización, se borran y se lanzan de nuevo.

Para eliminar un contenedor de forma permanente, utilizamos `docker rm`.

**Sintaxis básica:**

```bash
docker rm <NOMBRE_O_ID_DEL_CONTENEDOR>

```

**Regla de oro:** Por seguridad, Docker no te permitirá eliminar un contenedor que esté en estado `Running`. Primero debes detenerlo con `docker stop`. Aunque existe la bandera `-f` (force) para obligar su eliminación (`docker rm -f contenedor`), su uso regular es un "anti-patrón" en producción, ya que equivale a arrancar el cable de alimentación de un servidor en lugar de apagarlo correctamente.

## 2.2. Modos de ejecución: Detached, Interactive y TTY

En la sección anterior vimos que `docker run` es el motor de arranque de nuestros contenedores. Sin embargo, si ejecutas un servidor web o una base de datos simplemente con `docker run nginx`, notarás un comportamiento particular: tu terminal queda bloqueada, secuestrada por los logs del proceso. Si presionas `Ctrl+C` para liberar tu terminal, el contenedor muere.

Para dominar Docker, debes entender cómo se manejan los flujos estándar del sistema operativo (Standard Streams) entre tu host y el contenedor.

**Diagrama de flujos estándar en Docker:**

```text
[ Tu Terminal / Host ]                    [ Contenedor Docker ]
                                          
   Teclado (Entrada)  ------ STDIN ------>  [ Proceso PID 1 ]
   Pantalla (Salida)  <----- STDOUT ------          |
   Pantalla (Errores) <----- STDERR ------          |

```

Por defecto, Docker "conecta" (attaches) la salida (STDOUT) y los errores (STDERR) del contenedor a tu terminal actual, pero no la entrada (STDIN). Dependiendo de lo que necesites lograr, Docker ofrece distintos modos de ejecución mediante banderas o *flags*.

### 1. Modo Foreground (Primer plano)

Es el comportamiento por defecto. Es útil cuando estás depurando un contenedor efímero y necesitas ver los logs en tiempo real directamente en tu pantalla.

* **Ventaja:** Visibilidad inmediata de lo que hace la aplicación al arrancar.
* **Desventaja:** Inutiliza la ventana de la terminal.

### 2. Modo Detached (`-d`): El contenedor en las sombras

En entornos de producción o en tu trabajo diario de DevOps, querrás que los servicios (como bases de datos, APIs o colas de mensajes) se ejecuten en segundo plano (background) para poder seguir usando la terminal.

Para lograr esto, utilizamos la bandera `-d` (Detached).

**Sintaxis:**

```bash
docker run -d nginx

```

**¿Qué sucede bajo el capó?**
Docker arranca el contenedor, desconecta los flujos STDOUT y STDERR de tu terminal, y te devuelve inmediatamente el ID largo del contenedor (un hash alfanumérico). El contenedor sigue vivo y trabajando en las sombras.
*(Nota: En la sección 2.4 veremos cómo leer los logs de un contenedor que está corriendo en modo detached).*

> **⚠️ Advertencia Senior:** Un contenedor en modo *detached* solo se mantendrá vivo si su proceso principal (PID 1) se mantiene en ejecución de forma continua. Si ejecutas `docker run -d ubuntu apt-get update`, el contenedor se ejecutará en segundo plano, completará la actualización y se apagará inmediatamente (estado `Exited`). El modo `-d` no es magia; no mantiene vivo un proceso que está diseñado para terminar.

### 3. Modo Interactive (`-i`) y TTY (`-t`): Tomando el control

¿Qué pasa si necesitas abrir una consola de comandos (shell) dentro de un contenedor Linux, como si te hubieras conectado por SSH a un servidor? Aquí es donde entran en juego `-i` y `-t`. Aunque casi siempre se usan juntas (`-it`), entenderlas por separado marca la diferencia entre un usuario novato y uno avanzado.

* **`-i` (Interactive):** Le dice a Docker que mantenga abierto el canal STDIN, incluso si no estás conectado directamente al contenedor. Esto permite que el contenedor reciba la entrada de tu teclado.
* **`-t` (TTY):** Asigna un pseudo-terminal (teletipo). Esto es lo que le da formato a la salida, colorea los textos, muestra un *prompt* (como `root@container_id:/#`) y permite que funcionen atajos de teclado o señales como tabulación.

**El combo perfecto (`-it`):**
Cuando combinas ambas, conviertes tu terminal en una ventana directa al interior del contenedor.

**Ejemplo:**

```bash
docker run -it ubuntu /bin/bash

```

Al ejecutar esto, tu terminal cambiará. Ya no estarás en el host, sino operando como el usuario `root` dentro de un sistema Ubuntu completamente aislado.

### El truco ninja: Salir sin matar el contenedor

Un escenario clásico: entraste a un contenedor usando `docker run -it`, hiciste tus comprobaciones y ahora quieres salir. Si escribes `exit` o presionas `Ctrl+D`, cerrarás el proceso `bash` (el PID 1 de ese contenedor) y, en consecuencia, **el contenedor se apagará**.

*Pro-Tip Senior:* Si quieres salir del contenedor dejándolo en ejecución en segundo plano (pasarlo de *foreground* a *detached* sin detenerlo), debes usar la secuencia de escape de Docker:
**Presiona `Ctrl+P` y luego `Ctrl+Q`.**

Esto desconectará (detach) tu terminal de los flujos del contenedor, devolviéndote a tu host, pero dejando el contenedor en estado `Up`.

## 2.3. Asignación de puertos y variables de entorno

Hasta este punto, sabemos cómo iniciar y mantener vivo un contenedor. Sin embargo, por diseño, un contenedor de Docker es una caja fuerte aislada. Si inicias un servidor web Nginx o una base de datos PostgreSQL, los procesos estarán escuchando en sus puertos internos (como el 80 o el 5432), pero **nadie desde fuera del contenedor podrá acceder a ellos**.

Para que nuestros contenedores sean útiles, necesitamos abrir "puertas" controladas hacia el host y tener una forma de inyectarles configuración sin modificar su código.

### 1. Publicación de puertos (`-p` / `--publish`)

La publicación de puertos es el mecanismo que mapea un puerto de la máquina anfitriona (tu laptop o servidor) hacia un puerto específico dentro de la red del contenedor.

**Diagrama de mapeo de puertos:**

```text
      [ Tu Host / Servidor ]                 [ Contenedor Nginx ]
                                                     
    Petición externa ---> (Puerto 8080) ======Mapeo======> (Puerto 80)

```

**Sintaxis básica:**

```bash
docker run -p <PUERTO_HOST>:<PUERTO_CONTENEDOR> <IMAGEN>

```

**Ejemplo práctico:**
Si queremos ejecutar Nginx y acceder a él desde nuestro navegador web escribiendo `http://localhost:8080`, usaríamos:

```bash
docker run -d -p 8080:80 nginx

```

> **🛡️ Pro-Tip Senior (Seguridad):** > Por defecto, usar `-p 8080:80` publica el puerto en **todas** las interfaces de red del host (`0.0.0.0`). Esto significa que cualquiera en tu misma red local (o en internet, si es un servidor público sin firewall) podría acceder a tu contenedor.
> Para entornos de desarrollo local, la mejor práctica es enlazar (bind) el puerto únicamente a la interfaz de *loopback* (localhost):
>
> ```bash
> docker run -d -p 127.0.0.1:8080:80 nginx
> 
> ```
>
>
> De esta forma, el servicio solo será accesible desde tu propia máquina.

También puedes especificar el protocolo (TCP/UDP). Si omites esta parte, Docker asume TCP por defecto. Para servicios como un servidor DNS, especificarías UDP: `-p 53:53/udp`.

### 2. Variables de entorno (`-e` / `--env`)

La metodología de las *12-Factor Apps* (que abordaremos a fondo en el Capítulo 12) dicta que la configuración de una aplicación debe separarse estrictamente de su código. Las variables de entorno son el estándar de la industria para lograr esto.

Las imágenes oficiales de bases de datos son el mejor ejemplo. No puedes arrancar un contenedor de MySQL o PostgreSQL sin decirle primero qué contraseña quieres asignarle al usuario administrador.

**Sintaxis básica:**

```bash
docker run -e CLAVE=valor <IMAGEN>

```

**Ejemplo práctico con PostgreSQL:**

```bash
docker run -d \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=supersecreto \
  -e POSTGRES_DB=mi_base_datos \
  postgres:15

```

*(Nota: El uso de `\` en bash permite saltar de línea para que el comando sea legible).*

### El peligro del historial y el uso de `--env-file`

Pasar secretos (contraseñas, tokens de API) usando la bandera `-e` directamente en la terminal es funcional, pero tiene una falla crítica de seguridad: **los comandos quedan registrados en el historial del shell (`~/.bash_history`)**. Cualquier persona u otro proceso con acceso al host podría leer esas credenciales.

**La solución elegante:**
Usa un archivo de configuración. Puedes crear un archivo de texto plano llamado `.env` (o cualquier otro nombre):

```text
# Archivo: config.env
POSTGRES_USER=admin
POSTGRES_PASSWORD=supersecreto
POSTGRES_DB=mi_base_datos

```

Y luego inyectar todo el archivo en el momento de la ejecución usando la bandera `--env-file`:

```bash
docker run -d --env-file ./config.env postgres:15

```

Esto mantiene tu historial de comandos limpio y tus secretos un paso más seguros (aunque más adelante, en el Capítulo 8, veremos soluciones de DevSecOps aún más robustas como Docker Secrets o HashiCorp Vault).

### El Comando "Senior" Combinado

Ahora que dominamos la ejecución en segundo plano (`-d`), el nombramiento (`--name`, que simplifica la gestión), el mapeo de puertos (`-p`) y la inyección de configuración (`-e`), podemos lanzar servicios de grado de producción con una sola instrucción:

```bash
docker run -d \
  --name mi_postgres_local \
  -p 127.0.0.1:5432:5432 \
  --env-file ./db-config.env \
  postgres:15

```

Con este comando, tienes una base de datos segura, corriendo silenciosamente, accesible solo por ti y configurada exactamente a tu medida.

## 2.4. Inspección de contenedores (`docker inspect`, `logs`, `stats`)

Cuando lanzamos un contenedor en modo *detached* (como vimos en la sección 2.2), este opera en segundo plano como una "caja negra". Si la aplicación falla, se vuelve lenta o necesitamos conocer su IP interna, no podemos depender de la intuición.

Docker proporciona una suite de comandos nativos de telemetría y diagnóstico que te permiten ver exactamente qué está ocurriendo dentro y alrededor de tus contenedores, sin necesidad de instalar agentes de monitoreo de terceros.

### 1. `docker logs`: El latido de la aplicación

En la arquitectura de microservicios moderna, las aplicaciones no deben escribir sus registros en archivos estáticos dentro del contenedor (ya que se perderían si el contenedor es destruido). La mejor práctica es que envíen sus registros a la salida estándar (`STDOUT`) y a la salida de errores (`STDERR`).

El comando `docker logs` captura estos flujos y te los muestra, permitiéndote diagnosticar por qué una aplicación falló al arrancar o qué peticiones está recibiendo.

**Sintaxis básica:**

```bash
docker logs <NOMBRE_O_ID_DEL_CONTENEDOR>

```

**Modificadores indispensables para el día a día:**
Si un contenedor lleva días ejecutándose, un simple `docker logs` podría escupir millones de líneas en tu terminal. Para manejar esto, utilizamos modificadores:

* **`-f` (Follow):** Sigue los logs en tiempo real, similar a `tail -f` en Linux. Ideal para ver cómo responde un contenedor a peticiones en vivo.
* **`--tail N`:** Muestra solo las últimas *N* líneas del registro.
* **`-t` (Timestamps):** Agrega una marca de tiempo exacta a cada línea de log, crucial para correlacionar eventos durante un incidente.

**Ejemplo de diagnóstico rápido:**

```bash
docker logs --tail 50 -f -t mi_api_backend

```

### 2. `docker stats`: El monitor de signos vitales

Si `docker logs` te dice *qué* está haciendo la aplicación, `docker stats` te dice *cuánto esfuerzo* le está costando. Es el equivalente a ejecutar `top` o `htop` en Linux, pero enfocado exclusivamente en tus contenedores.

**Sintaxis básica:**

```bash
docker stats

```

Al ejecutarlo, tu terminal se convertirá en un panel en tiempo real con las siguientes métricas clave:

* **CPU %:** Porcentaje de procesamiento que está consumiendo el contenedor.
* **MEM USAGE / LIMIT:** Memoria RAM utilizada frente al límite máximo disponible (por defecto, la memoria total del host).
* **MEM %:** Porcentaje de memoria utilizada. *(Advertencia: si esto roza el 100%, tu contenedor está a punto de sufrir un OOM Kill - Out Of Memory).*
* **NET I/O:** Tráfico de red entrante y saliente.
* **BLOCK I/O:** Operaciones de lectura y escritura en el disco.

*Pro-Tip Senior:* Si solo necesitas una captura estática del momento para enviarla a un reporte o procesarla en un script automatizado, evita que el comando se quede refrescando la pantalla con la bandera `--no-stream`:

```bash
docker stats --no-stream

```

### 3. `docker inspect`: La radiografía a bajo nivel

Mientras que los logs y las estadísticas nos dan información dinámica, `docker inspect` nos entrega el "ADN" estático del contenedor. Este comando devuelve un extenso documento JSON con absolutamente todos los metadatos y configuraciones del objeto evaluado.

**Sintaxis básica:**

```bash
docker inspect <NOMBRE_O_ID_DEL_CONTENEDOR>

```

El resultado incluye variables de entorno inyectadas, el estado exacto de ejecución, los volúmenes montados, los puertos mapeados y, muy importante, la configuración de red (incluyendo su dirección IP interna).

**El superpoder Senior: Filtrado con Go Templates**
Leer un JSON de 200 líneas buscando un solo dato es ineficiente. `docker inspect` soporta el motor de plantillas de Go (`--format`), lo que te permite extraer valores específicos directamente.

*Ejemplo 1: Obtener solo la dirección IP interna del contenedor:*

```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mi_base_datos

```

*Ejemplo 2: Descubrir si un contenedor está reiniciándose constantemente (Crashlooping):*

```bash
docker inspect -f '{{.State.Restarting}}' mi_api_backend

```

Dominar la extracción de datos con `--format` transformará tu capacidad para escribir scripts de automatización (bash/python) que interactúen dinámicamente con tus contenedores.

## 2.5. Políticas de reinicio (Restart policies) para alta disponibilidad local

Hasta ahora hemos operado bajo la premisa de que nosotros, como ingenieros, estamos frente al teclado iniciando y deteniendo contenedores manualmente. Pero, ¿qué ocurre a las 3:00 a.m. si el proceso de Node.js dentro de tu contenedor sufre una excepción no capturada y muere? ¿O qué pasa si el servidor físico (host) se reinicia por una actualización del sistema operativo?

En un entorno de producción (o incluso en un entorno de desarrollo robusto), no puedes depender de la intervención humana para levantar los servicios caídos. Aquí es donde entran las **Políticas de Reinicio (Restart Policies)**.

Estas políticas son instrucciones directas al demonio de Docker sobre cómo debe reaccionar cuando el proceso principal (PID 1) de un contenedor termina.

### Las 4 Políticas de Reinicio de Docker

Docker ofrece cuatro comportamientos definidos mediante la bandera `--restart`. Elegir la correcta depende de la naturaleza de tu carga de trabajo.

**1. `no` (El comportamiento por defecto)**
Si no especificas nada, Docker no reiniciará el contenedor automáticamente bajo ninguna circunstancia.

* **Caso de uso:** Scripts de un solo uso, migraciones de bases de datos efímeras o tareas cronométricas donde un fallo debe ser reportado, no reintentado ciegamente.

**2. `on-failure[:max-retries]` (Reintento ante errores)**
Esta política le dice a Docker: *"Reinicia el contenedor solo si el proceso terminó con un código de salida (exit code) distinto de cero"*. Un código `0` significa éxito; cualquier otro número indica un error.
Puedes limitar el número de intentos agregando `:max-retries`.

* **Sintaxis:** `docker run -d --restart on-failure:5 mi_app`
* **Caso de uso Senior:** Aplicaciones que dependen de servicios externos que podrían tardar en levantar. Si tu API arranca antes que la base de datos, fallará. Con `on-failure`, la API morirá, Docker la reiniciará y, en el segundo o tercer intento, la base de datos ya estará lista y la API quedará estable.

**3. `always` (Fuerza bruta continua)**
Como su nombre indica, el demonio reiniciará el contenedor siempre, sin importar el código de salida. Además, si el demonio de Docker se reinicia (por ejemplo, al reiniciar el servidor host), todos los contenedores con esta política arrancarán automáticamente.

* **El peligro oculto:** Si detienes un contenedor manualmente con `docker stop`, permanecerá detenido... *hasta que el demonio de Docker se reinicie*. Tras el reinicio del host, el contenedor ignorará tu parada manual y volverá a arrancar. Esto puede causar estragos si habías apagado un servicio por mantenimiento.

**4. `unless-stopped` (La elección del profesional)**
Esta es la política preferida para la gran mayoría de los servicios de infraestructura (bases de datos, proxies inversos, cachés). Funciona exactamente igual que `always`, garantizando que el contenedor se levante si falla o si el servidor se reinicia.
Sin embargo, **respeta tu autoridad**: si tú, como administrador, ejecutas explícitamente `docker stop`, el contenedor permanecerá apagado incluso si el servidor entero se reinicia.

### Implementación práctica

Para aplicar una política desde la creación del contenedor, simplemente añade la bandera al comando `run`:

```bash
docker run -d \
  --name mi_redis_cache \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:alpine

```

**Árbol de decisión rápido para políticas de reinicio:**

```text
¿Es un proceso que debe ejecutarse continuamente (ej. servidor web)?
 ├── NO (Es un script/tarea finita) 
 │    └── ¿Debe reintentar si hay un error no previsto?
 │         ├── SÍ: Usa 'on-failure'
 │         └── NO: Usa 'no'
 │
 └── SÍ (Es un demonio/servicio)
      └── ¿Quieres que permanezca apagado si lo detienes manualmente antes de un reinicio del host?
           ├── SÍ: Usa 'unless-stopped' (Recomendado)
           └── NO: Usa 'always'

```

### Pro-Tip Senior: Cambiar políticas al vuelo (`docker update`)

Un error de *junior* es pensar que, para cambiar la política de reinicio de un contenedor que ya está en producción, debes destruirlo y volver a crearlo con el nuevo parámetro.

Docker provee el comando `update`, que permite modificar la configuración de recursos y políticas de un contenedor **en caliente**, sin interrumpir el servicio:

```bash
# Cambiar la política de un contenedor existente a unless-stopped
docker update --restart unless-stopped mi_contenedor_existente

```

Con este conocimiento, has dominado el ciclo de vida, la inspección y la resiliencia básica de los contenedores. Estás listo para dejar de depender de imágenes creadas por otros y empezar a construir las tuyas propias.
