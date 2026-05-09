Para un DevOps, los contenedores no deben ser "cajas negras", sino procesos bajo control. Este capítulo desmitifica la tecnología de virtualización a nivel de S.O. analizando los pilares del Kernel que la hacen posible.

Comenzamos con **chroot**, el aislamiento clásico de archivos, para luego evolucionar hacia los **Namespaces**, que segmentan la visión de red y procesos. Veremos cómo los **cgroups** imponen límites físicos de CPU y memoria, evitando que un proceso agote el host. Finalmente, dominaremos **nsenter** para diagnosticar contenedores "ciegos" desde el exterior. Aquí aprenderás que un contenedor es, en esencia, un proceso Linux con límites y una realidad alterada.

## 12.1 Aislamiento de procesos clásico (`chroot`)

Mucho antes de que existieran Docker, Kubernetes o la palabra "contenedor" en el ecosistema DevOps, los administradores de sistemas ya tenían la necesidad de aislar procesos. Querían ejecutar aplicaciones en un entorno donde, si un atacante lograba vulnerarlas, no pudiera ver ni destruir el resto del sistema operativo.

La primera herramienta nativa de UNIX para lograr esto fue `chroot` (Change Root), introducida en 1979. Como su nombre indica, esta utilidad permite cambiar el directorio raíz (`/`) aparente para un proceso en ejecución y todos sus procesos hijos.

Cuando un proceso se ejecuta dentro de un entorno `chroot` (comúnmente llamado **"jaula chroot"** o *chroot jail*), no puede leer ni escribir archivos fuera del nuevo directorio raíz que se le ha asignado. Para el proceso, ese directorio *es* todo el disco duro.

### La ilusión del sistema de archivos

Para entender `chroot`, imagina que creamos un directorio en `/var/jaula`. Si ejecutamos un proceso haciendo `chroot` hacia ese directorio, la visión del sistema de archivos cambia radicalmente para ese proceso:

```text
Visión del Sistema Host                 Visión del Proceso en chroot
-----------------------                 ----------------------------
/ (Raíz real)
├── boot
├── etc
├── home
├── usr
└── var
    └── jaula         ===============>  / (Raíz aparente)
        ├── bin                         ├── bin
        ├── lib                         └── lib
        └── tmp                         └── tmp

```

Desde la perspectiva del proceso enjaulado, intentar navegar a `cd /etc` lo llevará a `/var/jaula/etc` (si existe), no al `/etc` real del servidor. Es imposible hacer `cd ..` para escapar de la raíz aparente.

### Construyendo tu primer "proto-contenedor" a mano

Para comprender realmente cómo funcionan los contenedores modernos, debes construir uno de la vieja escuela. Vamos a crear una jaula `chroot` mínima para ejecutar una shell `bash`.

**Paso 1: Crear la estructura de directorios**
Primero, creamos el nuevo directorio raíz y las carpetas básicas que cualquier entorno Linux necesita.

```bash
sudo mkdir -p /tmp/mi_jaula/{bin,lib,lib64}

```

**Paso 2: Copiar el binario objetivo**
Queremos ejecutar `bash` dentro de la jaula, así que debemos copiar el ejecutable desde el sistema host.

```bash
sudo cp /bin/bash /tmp/mi_jaula/bin/

```

**Paso 3: Resolver y copiar dependencias (Librerías compartidas)**
Si intentas ejecutar `sudo chroot /tmp/mi_jaula /bin/bash` en este punto, fallará. Un error común de principiante es olvidar que los binarios compilados dinámicamente dependen de librerías del sistema.

Usamos el comando `ldd` (List Dynamic Dependencies) para ver qué necesita `bash`:

```bash
ldd /bin/bash

```

Salida típica:

```text
linux-vdso.so.1 (0x00007ffcc8193000)
libtinfo.so.6 => /lib/x86_64-linux-gnu/libtinfo.so.6 (0x00007fb1b6aa3000)
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fb1b68b1000)
/lib64/ld-linux-x86-64.so.2 (0x00007fb1b6df0000)

```

Debemos copiar exactamente esas librerías manteniendo su estructura de directorios dentro de nuestra jaula:

```bash
# Nota: Las rutas exactas pueden variar según tu distribución
sudo mkdir -p /tmp/mi_jaula/lib/x86_64-linux-gnu
sudo cp /lib/x86_64-linux-gnu/libtinfo.so.6 /tmp/mi_jaula/lib/x86_64-linux-gnu/
sudo cp /lib/x86_64-linux-gnu/libc.so.6 /tmp/mi_jaula/lib/x86_64-linux-gnu/
sudo cp /lib64/ld-linux-x86-64.so.2 /tmp/mi_jaula/lib64/

```

**Paso 4: Entrar a la jaula**
Ahora ejecutamos `chroot` apuntando a nuestro directorio y especificando el comando a correr.

```bash
sudo chroot /tmp/mi_jaula /bin/bash

```

¡Felicidades! Tu prompt cambiará y estarás dentro de la jaula. Si ejecutas `pwd`, te dirá que estás en `/`. Si intentas ejecutar `ls`, el sistema te dirá que el comando no se encuentra, porque no hemos copiado el binario `/bin/ls` ni sus dependencias a la jaula. Estás completamente aislado a nivel de archivos.

Para salir, simplemente escribe `exit`.

### El gran problema: ¿Por qué chroot no es seguridad?

`chroot` fue diseñado para aislar el sistema de archivos, **no para ser una barrera de seguridad infranqueable**. Este es un concepto crítico para un ingeniero Senior.

Si un proceso dentro de la jaula se ejecuta con privilegios de `root` (como lo hicimos en el ejemplo anterior), el aislamiento es ilusorio. Un usuario `root` malicioso dentro de un `chroot` puede usar llamadas al sistema (System Calls) para escapar.

Además, `chroot` tiene limitaciones severas respecto a lo que consideramos un contenedor hoy en día:

* **No aísla procesos:** Si montamos el sistema de archivos `/proc` dentro de la jaula, el usuario enjaulado podrá ver todos los procesos del sistema host (algo que ya aprendiste a gestionar en el Capítulo 4).
* **No aísla la red:** El proceso enjaulado comparte la misma dirección IP, interfaces de red y puertos que el host.
* **No limita recursos:** El proceso puede consumir el 100% de la CPU o la memoria RAM del servidor host, provocando un ataque de denegación de servicio (DoS).

Para solucionar estas carencias y llegar a la era de los contenedores modernos, el Kernel de Linux tuvo que evolucionar e introducir nuevas capas de aislamiento.

## 12.2 Aislamiento de recursos: Namespaces (PID, Mount, Network)

Si `chroot` fue el abuelo de los contenedores que intentó aislar el sistema de archivos, los **Namespaces** son los cimientos arquitectónicos modernos sobre los que se construyen herramientas como Docker, Podman o Kubernetes.

Introducidos gradualmente en el Kernel de Linux a partir de 2002, los Namespaces resuelven la mayor falla de `chroot`: la visibilidad compartida. Su objetivo es muy simple pero inmensamente poderoso: **mentirle a los procesos**. Un namespace envuelve un recurso global del sistema y hace que los procesos dentro de ese namespace crean que tienen una instancia dedicada y aislada de dicho recurso.

Existen varios tipos de namespaces en Linux (User, IPC, UTS, etc.), pero para dominar el núcleo de los contenedores, debes entender profundamente la "Trinidad" del aislamiento: **PID, Mount y Network**.

### 1. PID Namespace (Aislamiento de Procesos)

Como vimos en el Capítulo 4, en un sistema Linux estándar existe un único árbol de procesos. El proceso de inicialización (generalmente `systemd`) tiene el PID 1, y todos los demás cuelgan de él.

El namespace de PID permite crear árboles de procesos anidados. Cuando un proceso se ejecuta dentro de un nuevo PID Namespace, el Kernel le asigna el **PID 1 dentro de ese contexto**, aislándolo de los procesos del host.

```text
Visión Global del Kernel (Host)           Visión dentro del PID Namespace
-------------------------------           -------------------------------
PID 1   (systemd)
PID 50  (sshd)
PID 1024 (bash) ========================> PID 1 (bash)
PID 1025 (nginx) =======================> PID 2 (nginx)

```

Desde el sistema host, el administrador sigue viendo los procesos con sus PIDs reales (1024, 1025). Sin embargo, el proceso `bash` enjaulado cree genuinamente que es el PID 1 y que solo existe él y su hijo `nginx`. Si `bash` intenta enviar una señal `kill` a un proceso del host, el Kernel lo bloqueará, ya que esos PIDs simplemente no existen en su universo.

### 2. Mount Namespace (El `chroot` con esteroides)

Fue el primer namespace introducido en Linux. Mientras que `chroot` simplemente cambiaba el directorio raíz aparente, el Mount Namespace le da al proceso **su propia tabla de puntos de montaje**.

Esto significa que un proceso dentro de este namespace puede montar y desmontar particiones o sistemas de archivos virtuales (como `/proc` o `/sys`, que viste en el Capítulo 6) sin afectar al sistema host en absoluto. En un contenedor moderno, el Mount Namespace es lo que permite que el contenedor tenga sus propias librerías, binarios y un sistema de archivos raíz (`/`) completamente distinto al del servidor físico.

### 3. Network Namespace (Aislamiento de Red)

Imagina que tienes dos servicios web que exigen escuchar en el puerto 80. En un sistema tradicional, el segundo fallará con un error `Bind: Address already in use`.

El Network Namespace aísla por completo la pila de red (stack TCP/IP). Un proceso dentro de un namespace de red tiene sus propias:

* Interfaces de red (puedes tener una interfaz `eth0` independiente de la del host).
* Tablas de enrutamiento (`ip route`).
* Reglas de firewall (`iptables`, como vimos en el Capítulo 11).
* Direcciones IP y puertos.

Esto permite que cien contenedores en un mismo servidor host tengan todos una interfaz local (`lo`), su propia IP privada, y todos puedan estar escuchando en su propio puerto 80 sin colisionar entre sí.

### Hands-on: Construyendo un contenedor con `unshare`

Para demostrar que los contenedores no son magia, sino puras llamadas al Kernel de Linux, no necesitamos Docker. Podemos usar el comando estándar `unshare` (que permite "descompartir" namespaces con el proceso padre).

Vamos a crear un entorno que combine un **PID Namespace** y un **Mount Namespace**:

```bash
# Ejecutamos unshare para crear nuevos namespaces y lanzar bash
sudo unshare --pid --fork --mount-proc /bin/bash

```

**Desglosando el comando:**

* `--pid`: Crea un nuevo Namespace de procesos.
* `--fork`: Hace que el comando (`bash`) se ejecute como un proceso hijo de `unshare`, necesario para que tome el PID 1 del nuevo namespace.
* `--mount-proc`: Crea un nuevo Mount Namespace y automáticamente monta un nuevo sistema de archivos `/proc`. Sin esto, herramientas como `ps` o `top` seguirían leyendo el `/proc` del host y mostrarían todos los procesos, rompiendo la ilusión.

Una vez que ejecutes el comando, tu prompt de la terminal no cambiará mucho, pero estás en un universo paralelo. Verifícalo comprobando los procesos que se están ejecutando en ese momento:

```bash
ps aux

```

**Salida dentro del Namespace:**

```text
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1   9836  4136 pts/1    S    14:20   0:00 /bin/bash
root          14  0.0  0.1  11492  3388 pts/1    R+   14:22   0:00 ps aux

```

¡Misión cumplida! Acabas de aislar `bash`. Para este proceso, el mundo exterior no existe. No hay `systemd`, no hay otros usuarios conectados por SSH, nada. Escribe `exit` para destruir los namespaces y volver al host.

### El límite de los Namespaces

Los namespaces son excelentes para crear paredes entre procesos, construyendo las "habitaciones" de nuestros contenedores. Sin embargo, ¿qué pasa si el proceso del PID 1 en nuestra habitación aislada decide ejecutar un bucle infinito y consumir el 100% de la CPU física del servidor host?

Los namespaces te dicen **qué** puedes ver, pero no **cuánto** puedes usar.

## 12.3 Limitación de recursos: Control Groups (`cgroups`)

Como vimos en la sección anterior, los Namespaces construyen los muros de la habitación donde encerramos a un proceso, definiendo **qué puede ver**. Sin embargo, si ese proceso decide ejecutar un bucle infinito o almacenar basura en la memoria RAM hasta agotar la capacidad del servidor, los Namespaces no harán nada para detenerlo. Necesitamos una forma de definir **cuánto puede consumir**.

Aquí es donde entran los **Control Groups (cgroups)**.

Desarrollados originalmente por ingenieros de Google en 2006 (bajo el nombre de *process containers*) e integrados al Kernel de Linux poco después, los `cgroups` permiten limitar, medir y priorizar los recursos del sistema (CPU, memoria, I/O de disco, red) para grupos de procesos.

### La jerarquía virtual: `/sys/fs/cgroup`

Los cgroups no se gestionan mediante comandos arcanos compilados, sino a través de un pseudo-sistema de archivos montado en `/sys/fs/cgroup`. Al igual que `/proc` o `/dev`, los archivos dentro de este directorio no existen en tu disco duro; son una interfaz directa para hablar con el Kernel.

*Nota de Senior:* Hoy en día, la mayoría de las distribuciones modernas (Ubuntu 20.04+, RHEL 8+, Debian 11+) utilizan **cgroups v2** (Jerarquía Unificada), el cual soluciona muchos problemas de diseño de la versión original. Nos enfocaremos en esta versión, ya que es el estándar actual.

La estructura es un árbol. Si creas un directorio dentro de `/sys/fs/cgroup`, el Kernel automáticamente lo poblará con archivos de configuración para ese nuevo grupo.

```text
/sys/fs/cgroup/
├── cgroup.controllers      # Qué recursos se pueden controlar aquí
├── cgroup.procs            # Qué procesos (PIDs) pertenecen a este grupo
├── cpu.max                 # Límites de CPU
├── memory.max              # Límites absolutos de Memoria
└── mi_contenedor/          ====> (Tu nuevo cgroup)
    ├── cgroup.procs
    ├── cpu.max
    ├── memory.max
    └── ...

```

### Hands-on: Poniendo a dieta a un proceso

Vamos a crear un límite de memoria estricto de 50 Megabytes para un proceso de terminal, simulando exactamente lo que hace Docker cuando ejecutas un contenedor con el flag `--memory="50m"`.

**Paso 1: Crear el grupo de control**
Basta con crear un directorio dentro de la jerarquía de `cgroups`. El Kernel hará el resto.

```bash
sudo mkdir /sys/fs/cgroup/mi_contenedor

```

Si inspeccionas el directorio recién creado (`ls /sys/fs/cgroup/mi_contenedor`), verás decenas de archivos que tú no creaste. Es el Kernel ofreciéndote los controles para ese grupo.

**Paso 2: Establecer el límite de memoria**
Escribimos el límite en bytes (o usando sufijos como M o G) en el archivo `memory.max`.

```bash
echo "50M" | sudo tee /sys/fs/cgroup/mi_contenedor/memory.max

```

**Paso 3: Asignar un proceso al grupo**
Para meter un proceso en este grupo de control, simplemente escribimos su PID en el archivo `cgroup.procs`. Vamos a meter nuestra shell actual (`$$` es la variable que contiene el PID de tu bash actual).

```bash
echo $$ | sudo tee /sys/fs/cgroup/mi_contenedor/cgroup.procs

```

A partir de este exacto milisegundo, tu terminal está restringida.

**Paso 4: Comprobar la guillotina (OOM Killer)**
¿Qué pasa si intentas consumir más de 50MB? El Kernel invocará al OOM Killer (Out of Memory Killer) específicamente para este cgroup y asesinará el proceso, sin afectar al resto del sistema operativo.

Puedes intentar estresar la memoria (si no tienes una herramienta instalada, un simple array masivo temporal en Python u otro lenguaje bastará). El sistema matará silenciosamente el proceso que supere la cuota y la terminal se cerrará o mostrará un mensaje de `Killed`.

### Restringiendo la CPU

El límite de CPU en cgroups v2 se maneja mediante el archivo `cpu.max`. Este archivo acepta dos valores: la cuota (quota) y el período (period) en microsegundos.

El formato es: `CUOTA PERIODO`

El período por defecto suele ser `100000` (100 milisegundos). Si queremos limitar nuestro grupo a usar un máximo del **20% de un núcleo de CPU**, le decimos al Kernel que el proceso solo puede ejecutarse 20.000 microsegundos de cada 100.000:

```bash
echo "20000 100000" | sudo tee /sys/fs/cgroup/mi_contenedor/cpu.max

```

Si ejecutas un comando pesado como un bucle infinito (`while true; do :; done`) o calculas el valor de Pi, y observas el proceso desde otra terminal usando `top` (Capítulo 13), verás que el consumo de CPU de ese proceso se queda clavado exactamente en el 20.0%, sin importar cuánto intente acelerar.

### La ecuación final de los contenedores

Si lo piensas bien, acabas de desentrañar el gran secreto de la industria actual:

**Namespaces (Aislamiento de visión) + cgroups (Límites de consumo) + chroot/Pivot Root (Aislamiento de archivos) = Contenedor.**

Herramientas como Docker, containerd o CRI-O no son máquinas virtuales. Son simplemente orquestadores de alto nivel ("wrappers") que, por debajo, ejecutan de forma rápida y automatizada las mismas llamadas a `unshare` (Namespaces) y escrituras en `/sys/fs/cgroup` que acabas de hacer tú manualmente.

Ahora que entiendes cómo se aísla un proceso por completo en el sistema host, surge un problema del día a día de todo DevOps: ¿Cómo entro a diagnosticar un proceso que está enjaulado en sus propios Namespaces sin usar SSH ni herramientas instaladas dentro del contenedor?

## 12.4 Inspección y depuración de contenedores desde el nodo host (`nsenter`)

A estas alturas del capítulo, ya sabes que un contenedor no es más que un proceso (o grupo de procesos) envuelto en Namespaces y restringido por cgroups. Entender esto te da una ventaja táctica masiva en el día a día de un ingeniero DevOps, especialmente cuando las cosas se rompen.

Imagina este escenario: Tienes una aplicación en producción corriendo en un contenedor de Docker o un Pod de Kubernetes. De repente, pierde conectividad con la base de datos. Tu primer instinto podría ser usar `docker exec -it mi_contenedor bash` para entrar y lanzar un `ping` o revisar las conexiones con `ss` (herramientas que vimos en el Capítulo 10).

¿El problema? Las buenas prácticas de seguridad (DevSecOps) dictan que los contenedores en producción deben usar imágenes mínimas, como **Distroless** o **Scratch**. Estas imágenes contienen *exclusivamente* el binario de tu aplicación. No hay `bash`, no hay `ping`, no hay `curl`, no hay `netstat` ni gestor de paquetes para instalarlos.

Si no puedes entrar al contenedor porque no hay una shell, y no puedes instalar herramientas de diagnóstico, ¿cómo depuras el problema de red?

### La magia de `/proc/[PID]/ns/` y `nsenter`

La respuesta está en el sistema host. Tu servidor físico (o máquina virtual) ya tiene todas las herramientas de depuración instaladas. Lo único que necesitas es una forma de ejecutar una herramienta del host, pero forzándola a mirar a través de las "gafas" (Namespaces) del contenedor.

Para esto existe **`nsenter`** (Namespace Enter).

El Kernel de Linux expone los Namespaces a los que pertenece cada proceso a través del sistema de archivos virtual `/proc`. Si conoces el PID del proceso enjaulado (visto desde la perspectiva del host), puedes listar sus Namespaces:

```bash
# Supongamos que el PID del proceso principal del contenedor en el host es 4512
sudo ls -l /proc/4512/ns/

```

Salida típica:

```text
lrwxrwxrwx 1 root root 0 oct 24 10:00 cgroup -> cgroup:[4026531835]
lrwxrwxrwx 1 root root 0 oct 24 10:00 mnt -> mnt:[4026532841]
lrwxrwxrwx 1 root root 0 oct 24 10:00 net -> net:[4026532844]
lrwxrwxrwx 1 root root 0 oct 24 10:00 pid -> pid:[4026532842]

```

Cada uno de esos enlaces representa una "habitación" de aislamiento. `nsenter` toma un comando del host y lo introduce en una o varias de esas habitaciones.

### Arquitectura de inyección de comandos

```text
    Sistema Host (Herramientas ricas)        Contenedor (Imagen Distroless)
   -----------------------------------      --------------------------------
                                              Namespace de Red [4026532844]
   /usr/bin/ss   ======(nsenter)=======>      (Interfaz lo, eth0 local)
   /usr/sbin/tcpdump ==(nsenter)=======>      (Reglas iptables del contenedor)

```

El binario (`ss` o `tcpdump`) se lee desde el disco duro del host, pero cuando se ejecuta, sus llamadas al sistema consultan la tabla de red o de procesos del contenedor.

### Hands-on: Depuración de red sin entrar al contenedor

Vamos a resolver el escenario inicial: auditar las conexiones de red de un contenedor sin shell.

**Paso 1: Obtener el PID del contenedor**
Necesitamos el PID real del proceso tal como lo ve el Kernel del host, no el PID 1 interno. Si usas Docker, puedes obtenerlo así:

```bash
PID=$(docker inspect -f '{{.State.Pid}}' nombre_del_contenedor)
echo "El PID en el host es: $PID"

```

**Paso 2: Inyectar una herramienta de red**
Ahora, usamos `nsenter`. Le indicamos el PID objetivo con `-t` (target) y especificamos qué Namespaces queremos invadir. Para auditar la red, usamos `-n` (Network Namespace).

Ejecutaremos el comando `ss -tuln` (visto en el Capítulo 10) que reside en nuestro host:

```bash
sudo nsenter -t $PID -n ss -tuln

```

¡Boom! La salida que verás no son los puertos abiertos de tu servidor host, sino **los puertos abiertos exclusivamente dentro de ese contenedor**.

**Paso 3: Análisis de tráfico profundo (Nivel Senior)**
Si `ss` no es suficiente y sospechas de un problema de resolución DNS o paquetes descartados, puedes inyectar un sniffer de red como `tcpdump` directamente en la interfaz del contenedor:

```bash
sudo nsenter -t $PID -n tcpdump -i eth0 -nn

```

Estarás capturando el tráfico en vivo del contenedor utilizando el binario `tcpdump` de tu máquina host. Ningún atacante que vulnere el contenedor podrá usar tu `tcpdump`, porque no existe dentro de su Mount Namespace, pero tú puedes usarlo desde afuera para observar todo lo que hace.

### Opciones clave de `nsenter`

Puedes combinar múltiples flags para entrar en diferentes contextos según lo que necesites diagnosticar:

* `-m` o `--mount`: Entra al namespace de puntos de montaje. Útil si necesitas listar los archivos (`ls`) que el contenedor está viendo.
* `-n` o `--net`: Entra al namespace de red. Ideal para `ip a`, `ss`, `ping`, `tcpdump`.
* `-p` o `--pid`: Entra al namespace de procesos. Útil para hacer un `ps` y ver el árbol de procesos interno.
* `-u` o `--uts`: Entra al namespace UTS (hostname).

Por ejemplo, para ejecutar una shell completa (del host) con la visión total (red, montaje y procesos) del contenedor:

```bash
sudo nsenter -t $PID -m -p -n /bin/bash

```

*(Nota: Al usar `-m`, el directorio raíz cambiará al del contenedor. Si el contenedor no tiene `/bin/bash` montado o enlazado desde el host, este comando específico fallará. Para esos casos extremos, herramientas de más alto nivel como `docker debug` o `kubectl debug` automatizan montajes efímeros).*

### Conclusión del capítulo

Herramientas de orquestación como Kubernetes abstraen toda esta complejidad, pero un perfil Junior se queda atascado cuando el orquestador falla. Al entender `chroot`, Namespaces, cgroups y `nsenter`, ya no ves los contenedores como "cajas negras mágicas", sino como procesos Linux altamente configurables. Tienes las llaves del reino.

¡Con esto concluimos el Capítulo 12 y la disección de los contenedores!