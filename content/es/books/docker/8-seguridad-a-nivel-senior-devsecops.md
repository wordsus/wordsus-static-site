Operar contenedores en producción exige trascender la funcionalidad para abrazar la **resiliencia**. En este capítulo, desmantelamos la falsa sensación de seguridad del aislamiento nativo. Aprenderás que un contenedor es, ante todo, un proceso compartiendo el kernel del host, lo que obliga a implementar una estrategia de **Defensa en Profundidad**.

Desde la erradicación del uso de `root` y la adopción del modo *Rootless*, hasta el filtrado quirúrgico de llamadas al sistema con Seccomp y AppArmor, transformaremos imágenes vulnerables en artefactos firmados y verificados. Este es el camino para convertir Docker en el eslabón más fuerte de tu cadena de suministro de software.

## 8.1. Principio de menor privilegio: El problema de ejecutar como `root`

Si has seguido los capítulos anteriores, a estas alturas ya sabes cómo empaquetar aplicaciones, gestionar su ciclo de vida y orquestarlas. Sin embargo, en el mundo real (y especialmente en entornos empresariales regidos por normativas de seguridad), hacer que un contenedor "funcione" es solo la mitad del trabajo. La otra mitad es garantizar que no se convierta en la puerta de entrada para vulnerar toda tu infraestructura.

Aquí es donde entra en juego el **Principio de Menor Privilegio (PoLP)**. Este principio de seguridad informática establece que un proceso, usuario o programa debe tener únicamente los privilegios estrictamente necesarios para realizar su función, y nada más. En el ecosistema Docker, la violación más común y peligrosa de este principio es la ejecución de aplicaciones dentro del contenedor como el usuario `root`.

### La ilusión del aislamiento y el peligro del UID 0

Como vimos en el Capítulo 1, los contenedores no son máquinas virtuales aisladas por un hipervisor; son procesos que comparten el kernel del host, separados lógicamente mediante *Namespaces* y *cgroups*.

Por defecto, cuando no especificas un usuario en tu `Dockerfile`, Docker ejecuta el proceso principal del contenedor como `root` (UID 0). El peligro radica en un hecho fundamental de la arquitectura de Linux: **el UID 0 dentro del contenedor es el mismo UID 0 en el host**.

```text
+-----------------------------------+             +-----------------------------------+
|            Contenedor             |             |            Host Linux             |
|                                   |  Mapeo de   |                                   |
|  Proceso: app.py                  |     UID     |  Kernel compartido                |
|  Usuario interno: root (UID 0)    |  ========>  |  Permisos reales: root (UID 0)    |
|                                   |             |                                   |
+-----------------------------------+             +-----------------------------------+

```

Si un atacante logra comprometer la aplicación dentro del contenedor (por ejemplo, a través de una vulnerabilidad de inyección de código en tu app Node.js o Python), obtendrá acceso a una *shell* con privilegios de `root`. Aunque esté limitado por los *namespaces*, cualquier error de configuración, un *bind mount* mal asegurado (Capítulo 4) o una vulnerabilidad no parcheada en el propio motor de Docker podría permitirle un escape del contenedor (*Container Breakout*), otorgándole control total sobre el servidor host.

Un ejemplo clásico de este riesgo se materializa si montas directorios sensibles del host por error o necesidad:

```bash
# Un escenario catastrófico: Un contenedor comprometido ejecutándose como root
# con acceso al sistema de archivos del host.
docker run -d -v /:/host_root mi_imagen_vulnerable

```

Si el atacante entra a ese contenedor, puede modificar `/host_root/etc/shadow` o inyectar claves SSH en `/host_root/root/.ssh/authorized_keys`, comprometiendo el servidor anfitrión instantáneamente.

### Implementando el Principio de Menor Privilegio

La solución estructural a este problema es simple de enunciar, aunque a veces tediosa de implementar: **nunca ejecutes tus aplicaciones como `root` si no es absolutamente necesario**.

Para lograrlo, disponemos de dos enfoques complementarios: a nivel de construcción (Build) y a nivel de ejecución (Runtime).

#### 1. Configuración en el `Dockerfile` (Build Time)

La mejor práctica es definir un usuario sin privilegios directamente en la imagen utilizando la instrucción `USER`.

Es importante crear explícitamente el grupo y el usuario, asignar los permisos necesarios a los directorios de trabajo **antes** de cambiar de usuario, y luego usar la directiva `USER` para que todas las instrucciones subsiguientes (y el `CMD`/`ENTRYPOINT`) se ejecuten con esos privilegios reducidos.

**Ejemplo de un Dockerfile seguro para Node.js:**

```dockerfile
FROM node:18-alpine

# 1. Definimos variables para mayor claridad
ENV HOME=/usr/src/app

# 2. Creamos el directorio de la aplicación y cambiamos el propietario
# Usamos el usuario 'node' que ya viene preconfigurado en las imágenes oficiales de Node.
RUN mkdir -p $HOME && chown -R node:node $HOME

# 3. Establecemos el directorio de trabajo
WORKDIR $HOME

# 4. Copiamos los archivos de dependencias asignando los permisos correctos
COPY --chown=node:node package*.json ./

# 5. Cambiamos al usuario sin privilegios ANTES de instalar dependencias
USER node

# 6. Instalamos dependencias
RUN npm ci --only=production

# 7. Copiamos el resto del código
COPY --chown=node:node . .

# 8. Exponemos un puerto mayor a 1024
EXPOSE 8080

CMD ["node", "server.js"]

```

> **Nota Senior:** Observa que en el paso 8 exponemos el puerto `8080`. En sistemas Linux, los usuarios sin privilegios (no root) no pueden vincular procesos a puertos por debajo del 1024 (conocidos como *privileged ports*). Si tu aplicación intentara escuchar en el puerto `80` o `443` bajo un usuario sin privilegios, fallaría al iniciar.

#### 2. Sobrescritura en la Ejecución (Runtime)

A veces utilizas imágenes de terceros que, lamentablemente, fueron construidas para ejecutarse como `root`. En lugar de reconstruirlas, o como capa adicional de seguridad, puedes forzar el UID/GID en tiempo de ejecución utilizando el flag `--user` (o `-u`) en el CLI, o la directiva `user` en Docker Compose (como veremos reforzado en el Capítulo 6).

```bash
# Ejecutar un contenedor forzando el UID 1000 y GID 1000
docker run -d -p 8080:8080 --user 1000:1000 mi_imagen_backend

```

En `docker-compose.yml`:

```yaml
services:
  api:
    image: mi_imagen_backend
    user: "1000:1000"
    ports:
      - "8080:8080"

```

### Los desafíos comunes al abandonar `root`

A medida que implementes estas prácticas, te encontrarás con el error más frustrante y común en la vida de un DevOps: `Permission denied`.

1. **Problemas con volúmenes montados:** Cuando montas un *Bind Mount* desde el host (ej. `./data:/app/data`), los archivos dentro del contenedor heredarán los permisos del propietario en el host. Si el directorio en el host pertenece a `root` (o a un UID diferente al de tu contenedor), tu aplicación sin privilegios no podrá escribir en él. La solución temporal es hacer un `chown` en el host; la solución elegante es emparejar los UIDs o utilizar volúmenes gestionados por Docker (*Named Volumes*), inicializando los permisos correctamente en un *init container* o un script *entrypoint* temporal.
2. **Scripts de Entrypoint:** A menudo, los scripts de inicialización (`docker-entrypoint.sh`) necesitan ejecutar comandos que requieren `root` (como crear directorios temporales, ajustar configuraciones del sistema o hacer `chown` a volúmenes dinámicos) antes de lanzar la aplicación principal. El patrón avanzado para resolver esto es dejar que el contenedor inicie como `root`, permitir que el script haga sus preparativos, y al final utilizar la herramienta `gosu` (o `su-exec` en Alpine) para "dejar caer" los privilegios de `root` y ejecutar la aplicación final con el usuario restringido.

```bash
#!/bin/bash
# Ejemplo de entrypoint avanzado

# 1. Tareas que requieren root
chown -R appuser:appgroup /var/lib/app_data

# 2. Transición a usuario sin privilegios usando gosu para el proceso principal
exec gosu appuser "$@"

```

Retirar los privilegios de `root` a los procesos internos de tus contenedores es el paso fundacional del DevSecOps. Sin embargo, como veremos en las próximas secciones (8.2 y 8.3), incluso un usuario restringido puede abusar de ciertas capacidades del kernel, y el propio demonio de Docker sigue ejecutándose como `root` en el host. Abordaremos estas vulnerabilidades estructurales a continuación.

## 8.2. Implementación de Docker Rootless (Ejecución sin demonio root)

En la sección anterior (8.1) resolvimos la mitad del problema: evitamos que las aplicaciones se ejecuten como `root` *dentro* del contenedor. Sin embargo, nos queda una vulnerabilidad estructural mucho más profunda. Por defecto, el demonio de Docker (`dockerd`) se ejecuta como el usuario `root` en el sistema host.

Esto tiene una implicación crítica: **cualquier usuario o proceso que tenga acceso al socket de Docker (`/var/run/docker.sock`) tiene, de facto, acceso `root` al servidor anfitrión.** Para mitigar este riesgo de raíz, la comunidad y los ingenieros de Docker introdujeron **Docker Rootless Mode**. Esta arquitectura permite ejecutar tanto el demonio de Docker como los contenedores sin privilegios de `root` en el host, encapsulando todo el entorno dentro de los privilegios de un usuario estándar.

### La magia bajo el capó: User Namespaces y Mapeo de UIDs

El modo Rootless no es una simple bandera de configuración; es un rediseño que se apoya fuertemente en una característica del kernel de Linux llamada **User Namespaces** (`user_namespaces(7)`).

El concepto clave es la traducción o "mapeo" de identificadores de usuario (UIDs) y grupos (GIDs). Cuando configuras Docker Rootless, el sistema operativo le asigna a tu usuario sin privilegios (ej. `devops_user` con UID 1000) un bloque gigante de UIDs "subordinados" (típicamente 65,536 UIDs), definidos en los archivos `/etc/subuid` y `/etc/subgid`.

Veamos cómo funciona esto en la práctica mediante un diagrama de mapeo:

```text
+-------------------------------------------------------------+
|                        HOST LINUX                           |
|                                                             |
|  Usuario real: devops_user (UID: 1000)                      |
|  Rango subordinado asignado: 100000 hasta 165535            |
|                                                             |
|       +---------------------------------------------+       |
|       |               CONTENEDOR                    |       |
|       |                                             |       |
|       |  Usuario interno: root (UID: 0)   =======> Mapeado a UID 1000 en el host
|       |                                             |       |
|       |  Usuario interno: node (UID: 1000)=======> Mapeado a UID 101000 en el host
|       |                                             |       |
|       +---------------------------------------------+       |
+-------------------------------------------------------------+

```

Si un atacante logra un *container breakout* desde un contenedor que internamente corría como `root`, al salir al host se encontrará atrapado bajo los permisos limitados del usuario `devops_user` (UID 1000). No podrá modificar archivos del sistema, instalar módulos del kernel ni afectar a otros usuarios.

### Requisitos e Instalación

Para implementar Docker Rootless en un entorno de producción, el host debe cumplir con ciertos requisitos modernos:

1. **Paquetes `uidmap`:** Proveen las herramientas `newuidmap` y `newgidmap` necesarias para establecer los mapeos de namespace.
2. **Cgroups v2:** Aunque Rootless puede funcionar con cgroups v1, la gestión de límites de recursos (CPU, memoria, PIDs) para usuarios sin privilegios **solo** funciona correctamente si el host utiliza cgroups v2 y tiene la delegación de systemd habilitada.
3. **Stack de Red de Usuario:** Como un usuario sin privilegios no puede crear interfaces de red virtuales (veth) en el host, Docker Rootless utiliza `slirp4netns` (o VPNKit) para enrutar el tráfico de red desde el namespace del contenedor hacia el exterior.

**Pasos de implementación:**

Si ya tienes Docker instalado a nivel de sistema, debes detenerlo y deshabilitarlo. Luego, como el usuario sin privilegios, ejecutas el script de instalación oficial:

```bash
# Ejecutar como el usuario estándar (ej. devops_user), NO como root
dockerd-rootless-setuptool.sh install

```

Una vez instalado, el demonio de Docker ya no escuchará en `/var/run/docker.sock`. Escuchará en un socket dentro del directorio de usuario. Para que el cliente CLI de Docker sepa dónde conectarse, debes exportar la variable de entorno `DOCKER_HOST`:

```bash
# Añadir al ~/.bashrc o ~/.zshrc del usuario
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock

```

Para asegurar que el demonio se inicie con el sistema y se mantenga activo aunque el usuario cierre sesión, debes habilitar el *lingering* de systemd:

```bash
# Habilitar persistencia de procesos de usuario
loginctl enable-linger $(whoami)
# Iniciar y habilitar el servicio de usuario
systemctl --user enable --now docker.service

```

### Limitaciones y Workarounds (Nivel Senior)

Adoptar Docker Rootless aumenta drásticamente la seguridad, pero introduce fricciones operativas que debes conocer para hacer un *troubleshooting* efectivo:

**1. Puertos privilegiados (Privileged Ports):**
Por diseño en Linux, un usuario no-root no puede exponer puertos por debajo del 1024 (como el 80 para HTTP o 443 para HTTPS). Si intentas hacer `docker run -p 80:80 nginx`, fallará.

* **Solución recomendada:** Exponer puertos altos (ej. `-p 8080:80`) y usar un proxy inverso (como HAProxy o Nginx) ejecutado a nivel de sistema que redirija el tráfico 80/443 hacia el puerto 8080 de tu usuario.
* **Solución alternativa (menos estricta):** Otorgar capacidades extendidas al binario `rootlesskit` temporalmente:

```bash
sudo setcap CAP_NET_BIND_SERVICE=+ep $(which rootlesskit)

```

**2. Rendimiento de Red (Network Overhead):**
El uso de `slirp4netns` para la red de usuario introduce un cuello de botella debido a la traducción de paquetes en espacio de usuario (Userland NAT). En aplicaciones con tráfico intensivo, notarás una degradación en el ancho de banda y latencia.

* **Mitigación:** Para cargas de trabajo extremas, puedes configurar un *bypass* de red utilizando el driver `l2tp` o recurrir a redes *host* (con extrema precaución, ya que rompe el aislamiento de red).

**3. Ping desde contenedores (ICMP):**
Los usuarios sin privilegios no pueden enviar paquetes ICMP por defecto en muchas distribuciones, lo que hará que el comando `ping` falle dentro de tus contenedores, dificultando el diagnóstico.

* **Solución:** Debes ampliar el rango de grupos permitidos para enviar pings a nivel del host modificando `sysctl`:

```bash
# En el host, como root:
echo "net.ipv4.ping_group_range = 0 2147483647" > /etc/sysctl.d/99-rootless-ping.conf
sysctl --system

```

Implementar Docker Rootless es el estándar de oro actual para entornos DevSecOps donde Kubernetes aún no es una opción o donde se utilizan nodos de CI/CD compartidos. Cambia el paradigma de "confiar en el demonio" a una arquitectura inherentemente desconfiada por diseño.

## 8.3. Restricción de capacidades del kernel (`--cap-drop`, `--cap-add`)

En las secciones anteriores hemos lidiado con el usuario `root` a nivel de sistema de archivos e identidad de procesos. Sin embargo, en el entorno Linux, el poder real de `root` interactuando con el sistema operativo no se define simplemente por tener el UID 0, sino por un conjunto de privilegios granulares conocidos como **Linux Capabilities**.

Históricamente, en los sistemas Unix, los privilegios eran binarios: o eras un usuario sin privilegios, o eras el superusuario (`root`) con acceso absoluto. Las *Capabilities* fragmentan ese poder absoluto en docenas de permisos específicos y delegables.

Incluso si tu contenedor se ejecuta como `root`, lo que realmente determina si puede, por ejemplo, cambiar la hora del sistema, cargar módulos del kernel o manipular la red a bajo nivel, son las capacidades que el motor de Docker le haya concedido.

### La postura por defecto de Docker

Por diseño, Docker implementa un nivel de seguridad base bastante decente. Un contenedor normal no recibe todas las capacidades disponibles en el kernel de Linux (que son unas 40 en las versiones modernas). Docker, al iniciar un contenedor, **elimina la mayoría y conserva por defecto un conjunto de 14 capacidades**.

Algunas de las capacidades que Docker **mantiene habilitadas** por defecto incluyen:

* `CAP_CHOWN`: Permite cambiar el propietario de los archivos.
* `CAP_NET_BIND_SERVICE`: Permite vincular un socket a puertos privilegiados (menores a 1024).
* `CAP_FOWNER`: Ignora las restricciones de permisos de archivos.
* `CAP_NET_RAW`: Permite usar sockets RAW y PACKET (necesario para comandos como `ping`).

Aunque este subconjunto es mucho más seguro que un acceso `root` completo (Docker deniega por defecto capacidades peligrosas como `CAP_SYS_ADMIN`, que es prácticamente la llave maestra del sistema), **sigue siendo demasiado permisivo para la mayoría de las aplicaciones modernas**.

¿Realmente necesita tu API en Node.js o tu backend en Java la capacidad de enviar paquetes de red crudos (`CAP_NET_RAW`) o cambiar la propiedad de los archivos (`CAP_CHOWN`)? En el 99% de los casos, la respuesta es no. Si un atacante compromete tu contenedor, podría usar `CAP_NET_RAW` para realizar *spoofing* o escaneos de red internos.

### La estrategia Senior: "Drop All, Add Specific"

La regla de oro en DevSecOps respecto a las capacidades del kernel es aplicar una política de denegación por defecto. En lugar de intentar adivinar qué capacidades peligrosas debes quitar, debes **eliminar todas las capacidades y añadir explícitamente solo las que tu aplicación necesita para funcionar**.

```text
[Kernel de Linux (40+ Capabilities)]
       |
       |-- (Docker por defecto) --> [14 Capabilities habilitadas] (Riesgo moderado/alto)
       |
       |-- (Estrategia Senior)  --> [--cap-drop=ALL] --> [0 Capabilities]
                                           |
                                           +-- [--cap-add=...] --> [Solo lo estrictamente necesario] (Riesgo mínimo)

```

### Implementación práctica

La manipulación de capacidades se realiza mediante las banderas `--cap-drop` y `--cap-add` en el CLI de Docker, o sus directivas equivalentes en Docker Compose.

**1. Ejemplo CLI: Un servidor web ultraseguro**

Imagina que ejecutas un servidor Nginx. Este necesita unirse al puerto 80, por lo que requerirá `CAP_NET_BIND_SERVICE`, y quizás `CAP_CHOWN` si sus scripts de inicio ajustan permisos. Le quitaremos todo lo demás:

```bash
docker run -d --name nginx-seguro \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --cap-add=CHOWN \
  -p 80:80 \
  nginx:alpine

```

*(Nota: Al especificar las capacidades en Docker, se omite el prefijo `CAP_`)*

**2. Ejemplo CLI: Bloqueando herramientas de diagnóstico de red**

Si ejecutas un contenedor estándar y entras en él, normalmente puedes hacer ping al exterior:

```bash
docker run --rm -it alpine ping -c 1 8.8.8.8
# Resultado: 1 packets transmitted, 1 packets received

```

Si aplicamos el principio de menor privilegio y retiramos todas las capacidades, el comando fallará instantáneamente, neutralizando una herramienta clave para un atacante que busque pivotar en tu red:

```bash
docker run --rm -it --cap-drop=ALL alpine ping -c 1 8.8.8.8
# Resultado: ping: Lacking privilege for raw socket.

```

**3. Implementación en Docker Compose**

En entornos multi-contenedor, esta práctica debe estar documentada en tu `docker-compose.yml`. Es especialmente crítico para servicios expuestos al exterior (frontends, gateways).

```yaml
services:
  backend-api:
    image: mi_api:v1.2
    # El backend escucha en el puerto 8080 (no requiere NET_BIND_SERVICE)
    # y no manipula archivos a nivel de root. No necesita NADA.
    cap_drop:
      - ALL
    ports:
      - "8080:8080"
    user: "1000:1000" # Combinado con el enfoque de la sección 8.1

  redis-cache:
    image: redis:alpine
    cap_drop:
      - ALL
    # Redis suele requerir SETUID/SETGID para hacer drop de privilegios internamente
    # o DAC_OVERRIDE dependiendo de cómo esté configurado su entrypoint.
    cap_add:
      - SETUID
      - SETGID

```

### La capacidad prohibida: `--privileged`

Es imposible hablar de capacidades sin mencionar la antítesis de la seguridad: el flag `--privileged`.

Utilizar `--privileged` le indica a Docker que anule todo el aislamiento de capacidades y *cgroups*, otorgando al contenedor acceso total a los dispositivos del host y **habilitando absolutamente todas las capacidades del kernel**.

```bash
# NUNCA uses esto en producción a menos que sepas exactamente lo que haces (ej. DinD)
docker run -d --privileged mi_imagen

```

Un contenedor privilegiado es, a efectos prácticos, equivalente a tener acceso `root` sin restricciones en el servidor host. En un entorno DevSecOps maduro, el uso de `--privileged` en producción suele estar bloqueado a nivel de orquestador (como veremos más adelante al hablar de las *Pod Security Admission* en Kubernetes) o activará alertas críticas en cualquier auditoría de seguridad. Si crees que necesitas `--privileged`, lo que probablemente necesitas es perfilar qué capacidades específicas te faltan mediante `--cap-add`, o repensar la arquitectura de tu solución.

## 8.4. Perfiles de seguridad: AppArmor y Seccomp

Incluso después de implementar el modo *Rootless* y restringir las capacidades (Capabilities) al mínimo absoluto, tus contenedores siguen interactuando directamente con el kernel del host. Si existe una vulnerabilidad de día cero (zero-day) en el kernel de Linux que pueda explotarse mediante una llamada al sistema (syscall) específica, un atacante podría comprometer el nodo anfitrión.

Para construir una verdadera estrategia de **Defensa en Profundidad (Defense in Depth)**, debemos limitar drásticamente el vocabulario con el que el contenedor puede "hablarle" al kernel y los recursos físicos que puede tocar. Aquí es donde brillan dos tecnologías nativas de Linux: **Seccomp** y **AppArmor**.

Ambas se gestionan en Docker mediante la bandera `--security-opt`, pero operan en diferentes capas de abstracción y tienen propósitos distintos.

---

### Seccomp: El filtro de llamadas al sistema

**Seccomp (Secure Computing Mode)** es una característica del kernel de Linux que permite restringir las llamadas al sistema (syscalls) que un proceso puede realizar. El kernel moderno de Linux tiene más de 300 syscalls. Una aplicación típica (como un servidor web o una base de datos) rara vez necesita más de 50 a 70.

El perfil Seccomp actúa como un firewall de bajo nivel entre la aplicación y el kernel:

```text
+----------------+        +--------------------------+        +-----------------+
|   Contenedor   |        | Filtro Seccomp (BPF)     |        |   Kernel Host   |
|                |        |                          |        |                 |
| Intenta hacer: | =====> | Evalúa la syscall:       | =====> | Ejecuta la      |
| syscall `read` |        | ¿Está en la lista blanca?| (SÍ)   | acción.         |
|                |        |                          |        |                 |
| Intenta hacer: | =====> | Evalúa la syscall:       |   X    | Operación       |
| syscall `kcmp` |        | ¿Está en la lista blanca?| (NO)   | denegada (EPERM)|
+----------------+        +--------------------------+        +-----------------+

```

#### El perfil por defecto de Docker

Por defecto, Docker aplica un perfil Seccomp a todos los contenedores (a menos que uses `--privileged`). Este perfil predeterminado es una lista blanca (whitelist) bastante equilibrada que **bloquea aproximadamente 44 syscalls** consideradas peligrosas, permitiendo el resto.

Por ejemplo, Docker bloquea llamadas como:

* `reboot`: Un contenedor no debería poder reiniciar el host.
* `ptrace`: Evita que procesos dentro del contenedor inspeccionen la memoria de otros procesos, mitigando ataques de escalada de privilegios.
* `unshare`: Bloquea la creación de nuevos namespaces internos sin autorización.

#### Implementando perfiles Seccomp estrictos (Modo Senior)

En entornos de alta seguridad, el perfil por defecto no es suficiente. Debes perfilar tu aplicación, descubrir exactamente qué syscalls necesita y crear un archivo JSON personalizado que bloquee absolutamente todo lo demás.

**Ejemplo simplificado de un perfil Seccomp (`perfil-estricto.json`):**

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "exit", "sigreturn", "bind", "listen", "accept"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}

```

*Nota: `SCMP_ACT_ERRNO` significa que si la aplicación intenta usar una syscall no listada, el kernel devolverá un error de "Permiso denegado" sin matar el proceso inmediatamente.*

Para aplicar este perfil en tiempo de ejecución:

```bash
docker run -d --security-opt seccomp=/ruta/al/perfil-estricto.json mi_aplicacion

```

---

### AppArmor: Control de Acceso Obligatorio (MAC)

Mientras que Seccomp filtra *verbos* (las acciones hacia el kernel), **AppArmor** (Application Armor) filtra *sustantivos* (archivos, directorios, redes). Es un módulo de seguridad de Linux (LSM) que implementa **Control de Acceso Obligatorio (MAC)**.

En el modelo tradicional de Linux (DAC - Discretionary Access Control), si eres el propietario de un archivo (o eres `root`), puedes leerlo o modificarlo. AppArmor ignora eso. Si un perfil de AppArmor dice que Nginx no puede leer el directorio `/etc/`, Nginx no podrá leerlo, **incluso si Nginx se está ejecutando como root**.

#### El perfil `docker-default`

Al instalar Docker en un sistema que soporta AppArmor (como Ubuntu o Debian), el demonio carga automáticamente un perfil en el kernel llamado `docker-default`. Este perfil se aplica a todos los contenedores y protege rutas críticas del sistema de archivos del host que se exponen dentro del contenedor.

Por ejemplo, el perfil `docker-default` deniega la escritura en los directorios `/sys` y `/proc/sys`, lo que impide que un atacante modifique parámetros globales del kernel incluso si ha logrado montar estas carpetas desde el host.

#### Creación e inyección de perfiles personalizados

Si tienes una aplicación que, por ejemplo, solo debería tener acceso de lectura a `/app/config` y acceso de escritura a `/app/logs`, puedes crear un perfil de AppArmor específico.

**1. Definir el perfil (`mi-app-perfil`):**

```text
#include <tunables/global>

profile mi-app-perfil flags=(attach_disconnected,mediate_deleted) {
  # Incluir abstracciones base
  #include <abstractions/base>

  # Permisos de red básicos
  network inet tcp,
  network inet udp,

  # Denegar todo por defecto a nivel de archivos sensibles
  deny /etc/** rwklx,
  deny /sys/** rwklx,

  # Permisos explícitos para la aplicación
  /app/bin/ejecutable ix,       # Permiso de ejecución (inherit execute)
  /app/config/** r,             # Solo lectura
  /app/logs/** rw,              # Lectura y escritura
}

```

**2. Cargar el perfil en el kernel del host:**
*(Esto requiere privilegios de root en el host)*

```bash
sudo apparmor_parser -r -W mi-app-perfil

```

**3. Ejecutar el contenedor usando el perfil:**

```bash
docker run -d --security-opt apparmor=mi-app-perfil mi_aplicacion

```

---

### Estrategia combinada en Docker Compose

En el mundo real, Seccomp y AppArmor no son excluyentes; se complementan. Seccomp protege el kernel de vulnerabilidades de bajo nivel, y AppArmor protege el sistema de archivos y el entorno de comportamientos anómalos.

Implementar esto de forma declarativa en tu orquestación local o en tu pipeline se vería así:

```yaml
services:
  api-financiera:
    image: api-financiera:v2
    # Combinando todo lo aprendido en el Capítulo 8:
    user: "1000:1000"
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true # Evita que procesos hijos ganen más privilegios (ej. sudo)
      - apparmor=perfil-api-financiera
      - seccomp=./seccomp-api-profile.json

```

> **Nota Senior de Depuración:** Crear perfiles de Seccomp y AppArmor desde cero escribiendo a mano es prácticamente imposible para aplicaciones complejas. La práctica de la industria es ejecutar la aplicación exhaustivamente en un entorno de QA utilizando herramientas de rastreo (como `strace` para Seccomp, o usando AppArmor en `complain mode`). Estas herramientas registrarán todas las syscalls y accesos a archivos realizados, permitiéndote autogenerar un perfil ajustado a la realidad de tu contenedor. Utilidades de código abierto como `bane` (para AppArmor) facilitan enormemente este proceso.

## 8.5. Escaneo de vulnerabilidades estáticas en imágenes (Trivy, Clair)

En las secciones anteriores construimos un foso y muros altos alrededor de nuestro contenedor: ejecutamos sin ser `root`, eliminamos capacidades del kernel y aplicamos perfiles de llamadas al sistema. Sin embargo, toda esta defensa perimetral es inútil si introducimos un "Caballo de Troya" en nuestro sistema de archivos.

Una imagen de Docker es, en esencia, una instantánea estática de un sistema operativo recortado y una pila de dependencias (librerías de Python, módulos de Node.js, binarios de C, etc.). En el momento en que construyes esa imagen con `docker build`, estas dependencias comienzan a envejecer. Lo que ayer era seguro, hoy puede tener un **CVE** (Common Vulnerabilities and Exposures) crítico publicado, como nos enseñó amargamente el incidente de *Log4Shell*.

Aquí es donde entra el **Escaneo Estático de Imágenes**. Es el proceso de analizar el sistema de archivos de una imagen de contenedor en busca de paquetes de software y librerías conocidas por tener vulnerabilidades de seguridad, *antes* de que la imagen se despliegue en producción.

### ¿Cómo funciona el escaneo estático bajo el capó?

El escaneo no ejecuta tu código ni lanza el contenedor. En su lugar, realiza un proceso de dos pasos:

1. **Generación del SBOM (Software Bill of Materials):** La herramienta de escaneo desempaqueta las capas de la imagen (el *tarball* de UnionFS) y analiza los gestores de paquetes del SO (como `dpkg` en Debian o `apk` en Alpine) y los archivos de bloqueo de dependencias de tu aplicación (`package-lock.json`, `requirements.txt`, `Gemfile.lock`, `pom.xml`). Con esto, crea un inventario exacto de todo lo que hay dentro.
2. **Cruce con Bases de Datos de Inteligencia de Amenazas:** El SBOM generado se compara contra múltiples bases de datos de vulnerabilidades mantenidas por proveedores de SO (Alpine SecDB, Red Hat CVE database) y bases de datos globales (como la NVD del gobierno de EE. UU. o GitHub Advisories).

```text
[Imagen de Docker] 
       |
       v
+-------------+      +--------------------------+      +-------------------+
|  Analizador | ---> | SBOM (Lista de paquetes) | ---> | Motor de cruce    |
|  de capas   |      +--------------------------+      | (Bases de datos)  |
+-------------+                                        +-------------------+
                                                                |
                                                                v
                                                       [Reporte de CVEs]
                                                       - Severidad
                                                       - Versión parcheada

```

### Los titanes del ecosistema: Trivy vs. Clair

Históricamente, el ecosistema de contenedores ha dependido de varias herramientas, pero hoy en día destacan dos enfoques principales:

**1. Clair (por Quay / CoreOS):**
Clair fue uno de los pioneros en el escaneo de contenedores. Su arquitectura está diseñada para integrarse profundamente en Registries a nivel empresarial (es el motor detrás de Quay.io y Harbor).

* **Pro:** Excelente para escaneos a gran escala y centralizados en un Registry.
* **Contra:** Su arquitectura es pesada. Requiere mantener una base de datos PostgreSQL propia para almacenar el estado de las vulnerabilidades, lo que lo hace complejo de ejecutar como un simple linter en la terminal de un desarrollador.

**2. Trivy (por Aqua Security):**
Trivy se ha convertido en el estándar de facto de la industria (y la herramienta recomendada para esta etapa de tu carrera). Su filosofía es "Stateless" (sin estado) y orientada al desarrollador.

* **Pro:** Es un binario único. Descarga su base de datos de vulnerabilidades al vuelo, escanea la imagen en segundos y termina. Escanea tanto paquetes del SO como dependencias de lenguajes de programación, e incluso busca secretos quemados en la imagen (hardcoded secrets).
* **Contra:** En entornos de CI/CD muy agresivos, la descarga constante de la base de datos puede ralentizar los pipelines si no se configura una caché local.

### Implementación práctica de Trivy en el flujo DevSecOps

A nivel Senior, no escaneamos imágenes manualmente para leer un reporte interminable; **automatizamos el escaneo en el pipeline de CI/CD para romper la construcción (fail the build)** si se detectan vulnerabilidades inaceptables.

Ejemplo de cómo ejecutar Trivy localmente o en un script de CI, configurándolo para que devuelva un código de salida `1` (que detendrá el pipeline) solo si encuentra vulnerabilidades de severidad `HIGH` o `CRITICAL`:

```bash
# 1. Construir la imagen localmente
docker build -t mi_api_financiera:v2.0 .

# 2. Escanear la imagen con Trivy
trivy image \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  --exit-code 1 \
  mi_api_financiera:v2.0

```

> **Nota Senior sobre `--ignore-unfixed`:** Esta bandera es crucial para la cordura de tu equipo. Muchas veces, los escáneres detectan vulnerabilidades en paquetes del sistema operativo base para las cuales los mantenedores (ej. Debian o Canonical) aún no han publicado un parche. Si no puedes arreglarlo actualizando, no deberías bloquear tu pipeline por ello. Esta bandera oculta las vulnerabilidades que no tienen un parche disponible.

### Gestión del ruido y Falsos Positivos

El mayor reto del escaneo estático no es configurarlo, es lidiar con la fatiga de alertas (*Alert Fatigue*). Un escáner te dirá que tienes una vulnerabilidad crítica en `curl` dentro de tu imagen base. Pero, ¿tu aplicación realmente invoca a `curl`? Si tu contenedor corre una app en Go compilada estáticamente que jamás usa la shell, esa vulnerabilidad, aunque exista en el disco, no es **explotable** en tu contexto.

Para gestionar esto de forma profesional, debes utilizar un archivo de excepciones, comúnmente llamado `.trivyignore`. Aquí documentas explícitamente qué CVEs has analizado y decidido aceptar como riesgo residual, para que el pipeline no falle.

**Ejemplo de archivo `.trivyignore` en la raíz de tu proyecto:**

```text
# Falso positivo: Esta vulnerabilidad afecta a bash, pero usamos el contenedor en modo distroless
CVE-2019-18276

# Riesgo aceptado: Vulnerabilidad en una librería de test que no se empaqueta en el multi-stage build final
CVE-2021-34567

```

El escaneo de vulnerabilidades es un chequeo de higiene fundamental. Nos asegura que no estamos enviando software podrido a producción. Sin embargo, no detecta problemas arquitectónicos o credenciales expuestas si no están en texto plano. En la siguiente sección (8.6), abordaremos precisamente el manejo seguro de secretos, evitando que las contraseñas acaben en nuestro código o en el historial de capas de Docker.

## 8.6. Gestión segura de secretos en tiempos de construcción y ejecución

Las contraseñas, tokens de API, llaves privadas SSH y certificados TLS son el botín más codiciado por un atacante. En las secciones anteriores aseguramos el perímetro del contenedor, pero si dejamos las llaves del reino expuestas en texto plano, todo ese esfuerzo será en vano.

El manejo de secretos en Docker tiene una regla fundamental: **Un secreto nunca debe formar parte del código fuente, ni debe quedar registrado en el historial de capas (layers) de la imagen.**

Para abordar este desafío como un ingeniero Senior, debemos dividir el problema en dos fases con naturalezas tecnológicas muy distintas: la fase de construcción (Build Time) y la fase de ejecución (Runtime).

---

### 1. Secretos en Tiempo de Construcción (Build Time)

A menudo, necesitas credenciales para poder *construir* tu imagen. El caso de uso más clásico es descargar dependencias de un repositorio privado (como un paquete de NPM alojado en GitHub Packages o un módulo de Go en un repositorio privado de Bitbucket).

**El Antipatrón (Lo que NO debes hacer):**
El error más común es usar la instrucción `ARG` o copiar las credenciales al contenedor.

```dockerfile
# ¡PELIGRO! Esto dejará el token expuesto en el historial de la imagen
ARG GITHUB_TOKEN
RUN echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc
RUN npm install

```

Incluso si borras el archivo `.npmrc` en una capa posterior con `RUN rm .npmrc`, el archivo seguirá existiendo en la capa anterior. Cualquier persona con acceso a la imagen puede hacer un `docker history` o usar herramientas como *Dive* para extraer tu token.

**La Solución Senior: BuildKit y `--mount=type=secret`**

Docker BuildKit introdujo una forma segura de inyectar secretos durante la construcción. Los secretos montados de esta manera se almacenan en un sistema de archivos temporal en memoria (`tmpfs`) y **nunca** se escriben en las capas de la imagen. Una vez que el comando `RUN` termina, el secreto desaparece.

**Ejemplo de implementación:**

Primero, actualizamos nuestro `Dockerfile` para requerir el montaje del secreto:

```dockerfile
# syntax=docker/dockerfile:1.2
FROM node:18-alpine
WORKDIR /app
COPY package.json .

# Montamos el secreto temporalmente solo para esta instrucción
RUN --mount=type=secret,id=mi_token_npm \
    export NPM_TOKEN=$(cat /run/secrets/mi_token_npm) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && \
    rm -f .npmrc

```

Luego, al construir la imagen, pasamos el secreto desde nuestra máquina local (o desde el runner de CI/CD) sin que este toque el disco del contenedor:

```bash
# El secreto se lee desde un archivo local o variable de entorno
docker build --secret id=mi_token_npm,src=./token_secreto.txt -t mi_app .

```

---

### 2. Secretos en Tiempo de Ejecución (Runtime)

Una vez que la imagen está construida de forma segura, llega el momento de ejecutarla. La aplicación necesita conectarse a la base de datos de producción o a una API de terceros.

**Las Variables de Entorno y sus límites**

La metodología de las *12-Factor Apps* (que profundizaremos en el Capítulo 12) dicta que la configuración debe almacenarse en el entorno (Environment Variables). Esto es inmensamente mejor que quemar contraseñas en el código, pero en Docker tiene una vulnerabilidad conocida:

Si pasas un secreto usando `docker run -e DB_PASS=supersecreto`, cualquier usuario con acceso al demonio de Docker en el host puede ejecutar `docker inspect <container_id>` y ver la variable en texto plano. Además, muchas aplicaciones vuelcan las variables de entorno en los logs cuando ocurre un error crítico (Crash/Panic).

**La Solución Senior: Volúmenes en Memoria y Docker Secrets**

El estándar de la industria para inyectar secretos en tiempo de ejecución es montarlos como archivos de solo lectura dentro del contenedor, idealmente respaldados por la memoria RAM (`tmpfs`).

Docker (especialmente con Docker Compose y Docker Swarm) tiene soporte nativo para esto mediante la directiva `secrets`.

**Ejemplo en `docker-compose.yml`:**

```yaml
services:
  api-backend:
    image: mi_api:v2
    secrets:
      - db_password
      - api_key
    environment:
      # Le decimos a la app DÓNDE encontrar el secreto, no el secreto en sí
      - DB_PASSWORD_FILE=/run/secrets/db_password
      
secrets:
  db_password:
    file: ./secrets/db_prod_password.txt
  api_key:
    # En entornos cloud, esto podría integrarse con un manejador externo
    environment: "API_KEY_VAR" 

```

**¿Cómo debe reaccionar tu aplicación?**

Para que esta arquitectura funcione, tu aplicación debe estar programada para leer de archivos en lugar de solo buscar variables de entorno directas. Un patrón común (que usan las imágenes oficiales de bases de datos como MySQL o Postgres) es buscar variables con el sufijo `_FILE`.

*Ejemplo de lógica en un script de arranque (`entrypoint.sh`) o directamente en el código de tu app:*

```bash
#!/bin/sh
# Si existe la variable *_FILE, lee el contenido del archivo
if [ ! -z "$DB_PASSWORD_FILE" ]; then
    export DB_PASSWORD=$(cat $DB_PASSWORD_FILE)
fi

# Iniciar la aplicación principal
exec mi_aplicacion_binario

```

> **Nota Senior:** En entornos verdaderamente empresariales, la gestión de secretos no reside en archivos de texto en el host, sino que se delega a sistemas externos de gestión de identidad y secretos como **HashiCorp Vault**, **AWS Secrets Manager** o **Azure Key Vault**. En esos escenarios, el contenedor suele arrancar sin secretos, y un proceso interno (o un *sidecar container*) se autentica contra la bóveda externa mediante roles de IAM (por ejemplo, OIDC o AWS IAM Roles for Service Accounts) para recuperar el secreto directamente en la memoria de la aplicación.

## 8.7. Firmado y verificación de imágenes (Docker Content Trust / Notary)

A lo largo de este capítulo hemos construido una fortaleza: nuestras aplicaciones no son `root` (8.1), el demonio está aislado (8.2), las capacidades del kernel están restringidas (8.3), las llamadas al sistema están filtradas (8.4), no hay vulnerabilidades estáticas conocidas (8.5) y los secretos están protegidos (8.6).

Pero queda un vector de ataque crítico y silencioso: **los ataques a la cadena de suministro (Supply Chain Attacks)**.

Imagina este escenario: Escaneas tu imagen `mi_api:v2`, pasa todas las pruebas y la subes a tu Docker Registry. Sin embargo, un atacante logra comprometer las credenciales del Registry (o realiza un ataque *Man-in-the-Middle* en tu red) y reemplaza silenciosamente la etiqueta `v2` con una imagen maliciosa que contiene un *backdoor*. Cuando tu servidor de producción ejecuta `docker pull mi_api:v2`, descarga y ejecuta el malware.

Para evitar esto, necesitamos garantizar dos cosas criptográficamente antes de ejecutar cualquier contenedor:

1. **Procedencia:** ¿Esta imagen fue realmente creada por mi equipo (o por un proveedor oficial)?
2. **Integridad:** ¿Los bytes de esta imagen han sido alterados desde que fue publicada?

La respuesta nativa del ecosistema a este problema es **Docker Content Trust (DCT)**.

### ¿Qué es Docker Content Trust y Notary?

Docker Content Trust es una característica integrada en el CLI de Docker que utiliza **Notary** (un proyecto de código abierto de la CNCF basado en *The Update Framework* o TUF) para firmar y verificar imágenes mediante criptografía de clave pública y privada.

El flujo de confianza funciona de la siguiente manera:

```text
+-----------------------+                                +-------------------------+
|     Desarrollador /   |                                |    Servidor de Prod /   |
|     Pipeline CI       |                                |    Motor Docker         |
|                       |  1. Push + Firma               |                         |
|  [Clave Privada]      | ================> [ Registry ] |                         |
|  Firma el hash de la  |                   [ + Notary ] |  2. Pull + Verificación |
|  imagen al subirla.   | <================ ================== [Clave Pública]     |
+-----------------------+   3. Bloqueo si la firma falla |  Valida la procedencia  |
                                                         |  antes de ejecutar.     |
                                                         +-------------------------+

```

### Activando y utilizando DCT

A diferencia de otras herramientas complejas, DCT está integrado en el binario de Docker. Su activación depende de una única y poderosa variable de entorno: `DOCKER_CONTENT_TRUST`.

**1. Firmando una imagen (Push Time)**

Para firmar una imagen, el entorno que realiza el `docker push` (ya sea tu máquina local o un runner de CI) debe tener DCT habilitado.

```bash
# Habilitar DCT en la sesión actual de la terminal
export DOCKER_CONTENT_TRUST=1

# Construir y etiquetar normalmente
docker build -t mi_registro.com/proyecto/api:v2 .

# Al hacer push, Docker interceptará el comando e iniciará el proceso de firma
docker push mi_registro.com/proyecto/api:v2

```

La primera vez que firmas una imagen en un repositorio, Docker generará automáticamente un conjunto de claves criptográficas en el directorio `~/.docker/trust/`:

* **Root Key (Clave Raíz):** Es la clave maestra. Se utiliza para crear y firmar claves de repositorio. **Es el activo criptográfico más importante de tu infraestructura de contenedores.** Si pierdes esta clave o es comprometida, pierdes el control sobre la confianza de todos tus repositorios.
* **Repository Key (Clave de Repositorio):** Se utiliza para firmar las etiquetas (tags) de las imágenes de un repositorio específico. Es la que usarán tus pipelines de CI/CD cotidianamente.

Durante el proceso, Docker te pedirá que establezcas contraseñas (passphrases) para proteger estas claves.

> **Regla de Oro DevSecOps:** La Clave Raíz (Root Key) *nunca* debe vivir en un servidor de CI/CD ni en la laptop de un desarrollador. Debe generarse de forma segura, guardarse en almacenamiento en frío (offline, como un YubiKey o una bóveda física de hardware) y solo utilizarse para rotar claves de repositorio.

**2. Verificando una imagen (Runtime / Pull Time)**

Para que la seguridad sea efectiva, tus servidores de producción (o tu orquestador) deben estar configurados para exigir imágenes firmadas. Si configuras `DOCKER_CONTENT_TRUST=1` en el entorno de producción, el comportamiento del demonio cambia radicalmente:

```bash
# Servidor de Producción con DCT=1

# Intento 1: Tirar de una imagen firmada
docker pull mi_registro.com/proyecto/api:v2
# Resultado: Éxito. Docker descarga la firma, la valida con la clave pública y descarga la imagen.

# Intento 2: Tirar de una imagen NO firmada (o modificada maliciosamente)
docker pull imagen_sospechosa:latest
# Resultado: Error: remote trust data does not exist for docker.io/library/imagen_sospechosa...

```

Con DCT habilitado, es literalmente imposible que el motor de Docker descargue o ejecute una imagen que no cuente con una firma criptográfica válida.

### Inspección de firmas

Como administrador, puedes auditar quién ha firmado qué en tu repositorio utilizando la herramienta `trust` del CLI:

```bash
docker trust inspect --pretty mi_registro.com/proyecto/api:v2

```

Esto te devolverá un informe detallado con las firmas administrativas, las claves de los firmantes (Signers) y qué etiquetas exactas están verificadas.

### La Evolución Senior: De DCT a Sigstore/Cosign

Es mi deber como autor prepararte para el mundo real. Aunque Docker Content Trust (Notary v1) fue pionero, su adopción masiva se vio frenada por la inmensa fricción operativa que supone gestionar, rotar y distribuir las claves criptográficas (el problema de la "fatiga de claves").

Hoy en día, el ecosistema Cloud Native y Kubernetes está migrando agresivamente hacia un nuevo paradigma para la firma de artefactos: **Sigstore y su herramienta Cosign**.

Mientras que DCT almacena las firmas en un servidor Notary paralelo, **Cosign** permite almacenar las firmas directamente en el Registro OCI (junto a la propia imagen) y soporta la firma "Keyless" (sin claves) mediante la integración con identidades OpenID Connect (OIDC) como GitHub, Google o Microsoft.

*Ejemplo de cómo se ve el futuro (y el presente en empresas de vanguardia) con Cosign:*

```bash
# Firmar una imagen usando Cosign y un proveedor de identidad
cosign sign --keyless mi_registro.com/proyecto/api:v2

# Verificar la firma
cosign verify --keyless mi_registro.com/proyecto/api:v2

```

## Resumen del Capítulo

Dominar la seguridad en contenedores separa a un operador estándar de un verdadero Ingeniero Senior DevSecOps. Al combinar la ejecución sin privilegios (Rootless), la reducción de la superficie de ataque del kernel (Capabilities, Seccomp, AppArmor), la higiene de la cadena de suministro (Trivy, DCT/Cosign) y una gestión hermética de los secretos, transformarás tus contenedores de potenciales caballos de Troya en fortalezas inexpugnables.
