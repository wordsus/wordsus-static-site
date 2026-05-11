La revolución DevOps no comenzó con una herramienta, sino con un cambio de arquitectura: pasar de gestionar servidores como "mascotas" a tratarlos como "ganado" inmutable. En este capítulo, exploramos el viaje tecnológico desde las primitivas jaulas `chroot` de 1979 hasta la democratización del aislamiento con Docker en 2013. Analizaremos por qué un contenedor no es una máquina virtual ligera y cómo el kernel de Linux utiliza Namespaces y cgroups para orquestar recursos de forma segura. Finalmente, configuraremos un entorno profesional, preparando el motor (`daemon.json`) para los retos de escalabilidad y rendimiento que exige la industria actual.

## 1.1. Historia y evolución: De Chroot a Máquinas Virtuales y Contenedores

Para entender verdaderamente qué problema resuelve Docker y por qué revolucionó la industria del desarrollo y las operaciones (DevOps), primero debemos entender cómo llegamos hasta aquí. La tecnología rara vez nace en un vacío; es casi siempre una respuesta iterativa a las frustraciones del pasado.

En el caso de los contenedores, esa frustración tiene un nombre muy conocido: *"En mi máquina sí funciona"*.

La historia de la contenerización es, en esencia, la historia de nuestra búsqueda por el **aislamiento** y la **portabilidad**. Veamos cómo evolucionó esta necesidad a lo largo de las décadas.

### 1. La Era del Bare Metal y el "Infierno de las Dependencias"

Antes de la virtualización masiva, el software se desplegaba directamente sobre servidores físicos (*bare metal*). Un servidor, un sistema operativo, múltiples aplicaciones.

El problema de este paradigma era el acoplamiento y el conflicto de dependencias. Si la Aplicación A requería la versión 1.4 de una librería (por ejemplo, Java o Python) y la Aplicación B requería la versión 2.0, el conflicto era inevitable. Los ingenieros de operaciones pasaban noches en vela configurando servidores como "mascotas" (sistemas únicos, frágiles y mantenidos a mano), lo que hacía que escalar o migrar aplicaciones fuera una pesadilla logística.

Necesitábamos una forma de separar los entornos de ejecución.

### 2. Los Primeros Pasos del Aislamiento: Chroot (1979)

La primera semilla de lo que hoy conocemos como contenedores se plantó en 1979 durante el desarrollo de Unix V7 con la introducción de la llamada al sistema `chroot` (Change Root).

`chroot` permitía cambiar el directorio raíz aparente para un proceso en ejecución y sus hijos. Básicamente, le mentía a un programa diciéndole que un subdirectorio específico era el directorio raíz (`/`) de todo el sistema.

```text
Estructura de un entorno chroot:

/ (Raíz real del servidor)
├── bin/
├── var/
└── jaulas/
    └── app_aislada/     <-- El proceso cree que esto es "/"
        ├── bin/         <-- Binarios exclusivos para la app
        ├── lib/         <-- Librerías exclusivas
        └── app.sh

```

A este entorno se le empezó a llamar "jaula chroot" (*chroot jail*). Resolvía parcialmente el problema de las dependencias de archivos, ya que la aplicación no podía ver ni modificar archivos fuera de su jaula. Sin embargo, **no era un aislamiento real**. Los procesos dentro de la jaula seguían compartiendo la misma red, la misma memoria y podían ver (e incluso matar) procesos fuera de la jaula si tenían los permisos adecuados.

### 3. Jails y Zones: Evolucionando la Jaula (2000 - 2004)

Entrados los años 2000, los sistemas operativos derivados de UNIX dieron el siguiente paso lógico: aislar no solo el sistema de archivos, sino el entorno completo.

* **FreeBSD Jails (2000):** Expandió el concepto de `chroot` añadiendo aislamiento de procesos y de red. A cada "jaula" se le podía asignar su propia dirección IP y sus propios usuarios.
* **Solaris Zones (2004):** Sun Microsystems introdujo un concepto similar pero mucho más maduro, permitiendo ejecutar aplicaciones en entornos aislados con sus propios límites de recursos dentro de un único kernel de Solaris.

Ambas tecnologías fueron pioneras de la "virtualización a nivel de sistema operativo", pero estaban limitadas a sus respectivos sistemas operativos (FreeBSD y Solaris), los cuales eventualmente perderían terreno frente a la adopción masiva de Linux en los servidores.

### 4. La Era Dorada de las Máquinas Virtuales (2001 en adelante)

Mientras UNIX experimentaba con jaulas, el mundo x86 adoptó una solución mucho más pesada pero radicalmente efectiva: la **Máquina Virtual (VM)** y el **Hipervisor** (popularizado por empresas como VMware y proyectos open-source como KVM/Xen).

Las VMs resolvieron un problema de negocio masivo: la subutilización del hardware físico. Permitían particionar un servidor gigante en múltiples servidores virtuales más pequeños, cada uno con su propio Sistema Operativo Huésped (*Guest OS*).

```text
Evolución del Aislamiento:

[ Bare Metal ] -----> [ Chroot / Jails ] -----> [ Máquinas Virtuales ]
  (Conflictos)         (Aislamiento ligero)       (Aislamiento pesado
                        pero incompleto)           basado en hardware)

```

**El costo de las VMs:**
Aunque solucionaron los conflictos de dependencias (cada app vivía en su propia VM), introdujeron un nuevo cuello de botella: **el peso**. Cada VM requería arrancar un sistema operativo completo, desperdiciando gigabytes de RAM y preciosos ciclos de CPU solo para mantener vivos múltiples kernels repetidos en la misma máquina física. Eran geniales para el equipo de Infraestructura, pero lentas y pesadas para el ciclo diario de los Desarrolladores.

### 5. El Ecosistema Linux se Prepara: LXC (2008)

El mundo de Linux necesitaba lo mejor de ambos mundos: la ligereza de las *Solaris Zones* y el nivel de aislamiento de una *Máquina Virtual*.

Entre 2002 y 2008, ingenieros de empresas como IBM y Google contribuyeron con dos piezas fundamentales al kernel de Linux: los *Namespaces* (para aislar lo que un proceso puede ver) y los *Control Groups o cgroups* (para limitar lo que un proceso puede usar). *(Nota: Profundizaremos en estas dos piezas maestras en la sección 1.4).*

La unión de estas tecnologías dio a luz a **LXC (Linux Containers)** en 2008. LXC fue la primera implementación completa de gestor de contenedores en Linux. Permitía correr múltiples entornos Linux aislados en un solo host sin necesidad de hipervisores.

**¿Por qué LXC no dominó el mundo inmediatamente?**
Porque era difícil de usar. Requería un conocimiento profundo del sistema operativo de Linux, de redes complejas y de bash scripting para configurar y destruir contenedores. Era una herramienta de nicho para administradores de sistemas (*Sysadmins*), no una herramienta ágil para desarrolladores. Faltaba una capa de abstracción.

### 6. 2013: La Llegada de Docker y el Cambio de Paradigma

Aquí es donde entra Docker. Nació originalmente como un proyecto interno dentro de una empresa de Platform-as-a-Service (PaaS) llamada *dotCloud*, fundada por Solomon Hykes.

Es vital entender esto: **Docker no inventó los contenedores**. En sus inicios, Docker era simplemente una envoltura (*wrapper*) escrita en Go alrededor de LXC.

El golpe de genialidad de Docker no fue la tecnología subyacente de aislamiento, sino la **experiencia de usuario (UX) y el empaquetado**. Docker introdujo:

1. **La Imagen:** Un formato estándar, inmutable y empaquetado para distribuir aplicaciones con todas sus dependencias.
2. **El Dockerfile:** Una receta simple y versionable para construir esas imágenes.
3. **El Registry (Docker Hub):** Un lugar para compartir y descargar imágenes con la facilidad con la que descargamos apps en un smartphone.

Docker tomó una tecnología cruda y compleja del kernel de Linux (LXC) y la democratizó, creando una interfaz de línea de comandos (CLI) intuitiva. De repente, cualquier desarrollador podía empaquetar su entorno en su laptop, enviarlo a producción y tener la garantía matemática de que, sin importar si el servidor era Ubuntu, Red Hat o un entorno en AWS, el contenedor se ejecutaría exactamente igual.

El aislamiento había dejado de ser una herramienta exclusiva de operaciones para convertirse en la piedra angular del movimiento DevOps.

## 1.2. ¿Qué es Docker? Arquitectura básica (Cliente, Daemon, Registry)

En la sección anterior vimos que Docker no inventó los contenedores, sino que empaquetó tecnologías preexistentes del kernel de Linux en un formato accesible e inmutable. Pero, ¿qué es Docker exactamente hoy en día?

Técnicamente hablando, Docker no es un solo programa, sino una **plataforma completa de desarrollo, empaquetado y ejecución** basada en una arquitectura Cliente-Servidor. Esta separación de responsabilidades es lo que permite que Docker sea tan flexible: puedes interactuar con contenedores en tu laptop de la misma manera que interactúas con contenedores en un servidor en la nube.

Para entender cómo funciona Docker bajo el capó, debemos desglosar sus tres componentes principales: el **Cliente**, el **Demonio (Host)** y el **Registro**.

A continuación, un diagrama conceptual de su arquitectura:

```text
                               +-------------------------+
                               |     DOCKER HOST         |
+------------------+           |                         |           +------------------+
|                  |           |   +-----------------+   |           |                  |
|  DOCKER CLIENT   |==========>|   |  Docker Daemon  |   |<==========| DOCKER REGISTRY  |
|  (CLI / API)     |  REST API |   |   (dockerd)     |   |   HTTPS   | (Docker Hub/ECR) |
|                  |           |   +-----------------+   |           |                  |
+------------------+           |     |     |      |      |           +------------------+
   - docker build              |     v     v      v      |             - Imágenes
   - docker pull               |   [Imágenes] [Contenedores]           - Repositorios
   - docker run                |   [Redes]    [Volúmenes]              - Tags
                               +-------------------------+

```

Veamos el rol de cada pieza en este engranaje:

### 1. El Cliente de Docker (`docker`)

El cliente de Docker es la interfaz principal a través de la cual los usuarios interactúan con la plataforma. Cuando abres tu terminal y escribes un comando como `docker run` o `docker ps`, estás utilizando el cliente.

El cliente no ejecuta ni compila los contenedores. Su único trabajo es **tomar tu comando, traducirlo a una petición HTTP (REST API) y enviarlo al Demonio de Docker**.

* **Flexibilidad:** Por defecto, el cliente se comunica con un demonio local a través de un socket UNIX (usualmente en `/var/run/docker.sock`). Sin embargo, utilizando la variable de entorno `DOCKER_HOST`, puedes apuntar tu cliente local a un demonio que esté corriendo en un servidor remoto mediante TCP. Esta es una característica vital para el trabajo en DevOps y pipelines de CI/CD.

### 2. El Demonio de Docker (`dockerd` / Docker Host)

El Demonio (Daemon) es el verdadero motor de Docker. Es un proceso en segundo plano (background) que se ejecuta en el sistema operativo anfitrión (Host) y escucha continuamente las peticiones de la API provenientes del Cliente.

Sus responsabilidades son pesadas y fundamentales. El demonio es quien se encarga de crear, ejecutar, monitorizar y destruir los "Objetos de Docker". Estos objetos incluyen:

* **Imágenes:** Plantillas de solo lectura con las instrucciones para crear un contenedor.
* **Contenedores:** Las instancias en ejecución de una imagen.
* **Redes:** Interfaces aisladas para que los contenedores se comuniquen entre sí o con el exterior.
* **Volúmenes:** Mecanismos para persistir los datos generados por los contenedores más allá de su ciclo de vida efímero.

Además, el demonio de Docker puede comunicarse con otros demonios para gestionar servicios distribuidos (como veremos más adelante en el ecosistema Swarm o en orquestadores mayores).

### 3. El Registro (Docker Registry)

Si el Cliente es el volante y el Demonio es el motor, el Registro es la biblioteca global de piezas. Un Docker Registry es un sistema de almacenamiento y distribución estandarizado para imágenes de Docker.

* **Público vs. Privado:** Por defecto, Docker está configurado para buscar imágenes en **Docker Hub**, el registro público oficial donde existen millones de imágenes listas para usar (desde distribuciones Linux limpias hasta bases de datos preconfiguradas). En entornos corporativos, por motivos de seguridad y latencia, el equipo de DevOps suele configurar registros privados (como AWS ECR, GitHub Container Registry o Harbor).
* **Mecánica:** Cuando ejecutas `docker pull ubuntu`, el Demonio verifica si tiene la imagen de Ubuntu localmente. Si no la tiene, se conecta al Registro, la descarga (pull) por capas y la guarda en el Host. Cuando usas `docker push`, envías tu imagen construida localmente hacia el Registro para que otros sistemas puedan consumirla.

### Entendiendo el flujo completo: El comando `docker run`

Para consolidar esta arquitectura, analicemos qué ocurre paso a paso, en cuestión de milisegundos, cuando ejecutas el siguiente comando:

```bash
docker run -d -p 8080:80 nginx

```

1. **El Cliente entra en acción:** Tu terminal intercepta el comando. El cliente empaqueta la orden (ejecutar `nginx` en modo desconectado `-d` mapeando el puerto 8080 al 80) y la envía vía REST API al socket del Demonio.
2. **El Demonio verifica el almacenamiento local:** `dockerd` recibe la instrucción. Lo primero que hace es buscar en su caché local si existe la imagen llamada `nginx:latest`.
3. **Llamada al Registro (si es necesario):** Si la imagen no está en el Host, el Demonio se conecta a Docker Hub (el Registro), autentica la petición de forma anónima y descarga las capas de la imagen de Nginx.
4. **Creación del Contenedor:** Con la imagen ya en disco, el Demonio crea un nuevo contenedor (asignándole un Namespace y limitándolo con cgroups), configura la red puente (bridge) para exponer el puerto 80 al 8080 del host, e inicia el proceso principal definido dentro de la imagen.
5. **Respuesta al Cliente:** El Demonio responde al Cliente con el ID único (hash) del contenedor recién creado, y el Cliente te lo imprime en la pantalla de tu terminal.

Esta arquitectura desacoplada es lo que hace a Docker tan poderoso y escalable. Sin embargo, antes de aprender a operarlo, debemos entender por qué esta estructura es fundamentalmente distinta a la virtualización tradicional que la precedió.

En la siguiente sección desmitificaremos uno de los debates más comunes en el mundo de la infraestructura: en qué se diferencia estructural y físicamente un contenedor de una máquina virtual.

## 1.3. Diferencias estructurales entre Contenedores y Máquinas Virtuales

Uno de los debates más comunes (y a menudo peor entendidos) cuando se introduce Docker en un equipo tradicional de operaciones es la idea de que "un contenedor es solo una máquina virtual más pequeña". Esta afirmación es fundamentalmente incorrecta.

Aunque ambos resuelven el problema del aislamiento de aplicaciones, lo abordan desde capas de abstracción completamente diferentes. Para un ingeniero DevOps, comprender esta distinción no es solo teoría; es la base para diseñar arquitecturas escalables, calcular costes de infraestructura y optimizar pipelines de CI/CD.

Analicemos la anatomía de ambas tecnologías.

### 1. El modelo de la Máquina Virtual (Virtualización de Hardware)

Las Máquinas Virtuales (VMs) se basan en la **virtualización a nivel de hardware**. El objetivo de una VM es engañar a un sistema operativo completo haciéndole creer que tiene acceso exclusivo a CPU, memoria y discos físicos.

Para lograr esto, se utiliza un componente llamado **Hipervisor** (como VMware ESXi, KVM o Hyper-V). El hipervisor se sitúa entre el hardware (o el Sistema Operativo Host) y las máquinas virtuales, interceptando y traduciendo las llamadas al procesador.

```text
=========================================================
                 MÁQUINAS VIRTUALES (VMs)
=========================================================
  +---------------+  +---------------+  +---------------+
  | Aplicación A  |  | Aplicación B  |  | Aplicación C  |
  | (Bins / Libs) |  | (Bins / Libs) |  | (Bins / Libs) |
  +---------------+  +---------------+  +---------------+
  |   GUEST OS    |  |   GUEST OS    |  |   GUEST OS    | <-- El gran cuello de botella
  |  (10-50+ GB)  |  |  (10-50+ GB)  |  |  (10-50+ GB)  |
  +---------------+  +---------------+  +---------------+
=========================================================
                        HIPERVISOR
=========================================================
                  SISTEMA OPERATIVO HOST
=========================================================
                  INFRAESTRUCTURA FÍSICA
=========================================================

```

**El costo estructural:** Cada VM requiere su propio Sistema Operativo Invitado (*Guest OS*). Si tienes tres aplicaciones aisladas en tres VMs diferentes, estás ejecutando **tres núcleos (kernels) completos**, tres gestores de memoria y tres planificadores de procesos, además del sistema operativo anfitrión. Esto consume una cantidad masiva de RAM y CPU solo para mantener los sistemas operativos encendidos, dejando menos recursos para la aplicación real.

### 2. El modelo del Contenedor (Virtualización de Sistema Operativo)

Los contenedores descartan la idea de virtualizar el hardware. En su lugar, utilizan la **virtualización a nivel de sistema operativo**.

Aquí no hay hipervisor ni múltiples *Guest OS*. Docker (o cualquier otro motor de contenedores) se ejecuta como un proceso nativo en el Sistema Operativo Host. Su trabajo no es traducir instrucciones de hardware, sino crear "burbujas" aisladas (gracias a características del kernel como namespaces y cgroups) donde las aplicaciones creen estar solas, **pero todas comparten el mismo Kernel subyacente del Host**.

```text
=========================================================
                 CONTENEDORES (DOCKER)
=========================================================
  +---------------+  +---------------+  +---------------+
  | Aplicación A  |  | Aplicación B  |  | Aplicación C  |
  | (Bins / Libs) |  | (Bins / Libs) |  | (Bins / Libs) |
  +---------------+  +---------------+  +---------------+
=========================================================
              MOTOR DE CONTENEDORES (DOCKER)
=========================================================
        SISTEMA OPERATIVO HOST (Un solo Kernel)
=========================================================
                 INFRAESTRUCTURA FÍSICA
=========================================================

```

**La ventaja estructural:** Como los contenedores no incluyen un kernel ni los procesos de arranque de un SO completo, su huella en disco pasa de Gigabytes a Megabytes (o incluso Kilobytes). Un contenedor no se "arranca" en el sentido tradicional; simplemente se inicia el proceso de la aplicación. Por eso, un contenedor arranca en milisegundos.

### Cuadro Comparativo: VMs vs. Contenedores

Para consolidar las diferencias, evaluémoslas desde la perspectiva de operaciones:

| Característica | Máquina Virtual (VM) | Contenedor (Docker) |
| --- | --- | --- |
| **Aislamiento** | A nivel de Hardware (Fuerte). | A nivel de Proceso/Sistema Operativo (Ligero). |
| **Compartición** | Recursos de hardware particionados. | El Kernel del host se comparte entre todos. |
| **Tamaño en disco** | Gigabytes (Requiere un OS completo). | Megabytes / Kilobytes (Solo librerías y dependencias). |
| **Tiempo de arranque** | Minutos (Boot del OS + Init system). | Milisegundos (Solo inicia el proceso principal). |
| **Sobrecarga (Overhead)** | Alta. El hipervisor y el Guest OS consumen recursos pasivos. | Mínima. Los procesos corren nativamente en el host. |
| **Portabilidad** | Limitada (Depende del formato del hipervisor, ej. OVA, VMDK). | Excelente. Una imagen de Docker corre igual en cualquier host con Docker. |

### ¿Son entonces enemigos? La regla de la coexistencia

Es un mito que los contenedores vinieron a asesinar a las máquinas virtuales. En arquitecturas Cloud modernas (AWS, GCP, Azure) e infraestructuras *On-Premise* de grado empresarial, **ambas tecnologías coexisten sistemáticamente**.

Las VMs proporcionan la segmentación de seguridad pesada y la abstracción del hardware físico (te permiten trocear un servidor de 128 núcleos en 8 VMs de 16 núcleos). Sobre esas VMs ligeras, instalamos Docker (o Kubernetes) y empaquetamos las aplicaciones en decenas de contenedores.

Las VMs te dan una infraestructura elástica; los contenedores te dan aplicaciones inmutables y de despliegue ultrarrápido.

Con esta diferencia clara, seguramente te estés preguntando: si todos los contenedores comparten el mismo Kernel del host, ¿cómo garantiza Linux que un contenedor no consuma toda la RAM o espíe los archivos de otro? La respuesta reside en la magia del motor bajo el capó, que exploraremos en la siguiente sección.

## 1.4. El motor bajo el capó: Namespaces y Control Groups (cgroups)

En la sección anterior concluimos con una gran incógnita: si los contenedores no tienen un hipervisor ni un sistema operativo invitado, y todos comparten el mismo Kernel del host, ¿cómo es posible que el Contenedor A no pueda leer los archivos del Contenedor B, o peor aún, consumir toda la memoria RAM del servidor y tumbar a los demás?

La respuesta no reside en Docker en sí, sino en dos características fundamentales y primitivas del Kernel de Linux: los **Namespaces** y los **Control Groups (cgroups)**.

Si tuviéramos que resumirlo en una frase de oro para DevOps: **Los Namespaces limitan lo que un contenedor puede *ver*, y los cgroups limitan lo que un contenedor puede *usar*.**

Desglosemos cada uno.

### 1. Namespaces: El Aislamiento de Visibilidad

Los Namespaces son una característica del kernel de Linux que particiona los recursos del sistema de tal forma que un grupo de procesos ve un conjunto de recursos, mientras que otro grupo ve un conjunto completamente distinto. Es el equivalente a ponerle anteojeras a un caballo: el proceso cree que está completamente solo en el servidor.

Cuando Docker arranca un contenedor, crea un conjunto de *namespaces* específicos para ese contenedor. Los más críticos son:

* **PID (Process ID):** Aísla el árbol de procesos. En un servidor Linux normal, el proceso `systemd` suele tener el PID 1. Dentro de un contenedor, tu aplicación (por ejemplo, Nginx o Node) toma el PID 1. El contenedor no tiene idea de que existen otros procesos en el host.
* **NET (Network):** Proporciona aislamiento de red. Cada contenedor recibe su propia interfaz de red virtual (normalmente `eth0`), su propia dirección IP, su propia tabla de enrutamiento y sus propias reglas de firewall (iptables).
* **MNT (Mount):** Es la evolución del antiguo `chroot`. Aísla los puntos de montaje del sistema de archivos. El contenedor ve su propio sistema de archivos raíz (`/`) y no puede acceder al disco del host a menos que se lo permitamos explícitamente mediante un Volumen (lo veremos en el Capítulo 4).
* **UTS (UNIX Timesharing System):** Permite que cada contenedor tenga su propio nombre de host (*hostname*) y nombre de dominio, independiente del host físico.
* **IPC (Inter-Process Communication):** Previene que procesos de diferentes contenedores se comuniquen directamente a través de la memoria compartida del sistema.
* **USER:** (Introducido más tarde) Permite mapear un usuario `root` dentro del contenedor a un usuario sin privilegios fuera de él, añadiendo una capa vital de seguridad.

### 2. Control Groups (cgroups): El Límite de Recursos

Si los Namespaces construyen las paredes de la habitación, los **cgroups** son el contador de la luz y el agua.

Desarrollados originalmente por ingenieros de Google (bajo el nombre de *Process Containers*) y fusionados en el kernel de Linux en 2007, los cgroups permiten medir, limitar y priorizar los recursos de hardware (CPU, memoria, I/O de disco, red) que puede utilizar un conjunto de procesos.

**El problema del "Vecino Ruidoso" (Noisy Neighbor):**
Imagina que tienes un contenedor ejecutando una base de datos y otro ejecutando un script mal optimizado que sufre una fuga de memoria (*memory leak*). Sin cgroups, el script consumiría toda la RAM del servidor, provocando que el kernel entre en pánico y empiece a matar procesos al azar (incluyendo tu base de datos).

Docker utiliza cgroups para imponer límites estrictos de hardware:

* **Memoria:** Puedes decirle a Docker: *"Este contenedor de Redis solo puede usar un máximo de 512 MB de RAM"*. Si intenta usar 513 MB, el kernel lo liquida inmediatamente (OOM Kill) para proteger al resto del sistema.
* **CPU:** Puedes restringir un contenedor para que use solo medio núcleo de CPU, o fijar su prioridad para que ceda el procesador si otro contenedor más importante lo necesita.
* **Block I/O:** Permite limitar la velocidad de lectura y escritura en disco, evitando que un contenedor monopolice el almacenamiento.

### Diagrama de la anatomía del motor

A nivel conceptual, la unión de estas piezas dentro del host físico se ve así:

```text
========================================================================
                      SISTEMA OPERATIVO HOST (LINUX)
========================================================================
                 KERNEL DE LINUX (Gestor de recursos reales)
========================================================================

    +-------------------+                 +-------------------+
    |   CONTENEDOR 1    |                 |   CONTENEDOR 2    |
    |                   |                 |                   |
    | [PID 1: python]   | <- Namespaces-> | [PID 1: nginx]    |
    | [Net: 172.17.0.2] |    garantizan   | [Net: 172.17.0.3] |
    | [Mnt: /app]       |    aislamiento  | [Mnt: /usr/share] |
    +-------------------+                 +-------------------+
             |                                     |
    [cgroup: Max 256MB]                   [cgroup: Max 512MB]
    [cgroup: 0.5 CPU]                     [cgroup: 1.0 CPU]
             |                                     |
========================================================================
                           HARDWARE FÍSICO
========================================================================

```

> **Nota de Arquitectura:** Docker es, en su forma más pura, una excelente interfaz de usuario (CLI y API) automatizada para gestionar estas complejas reglas de `Namespaces` y `cgroups` del kernel de Linux, combinadas con un sistema de archivos por capas (UnionFS).

Al comprender cómo interactúan estas piezas a bajo nivel, un ingeniero DevOps deja de ver a Docker como una "caja negra" mágica y comienza a entenderlo como lo que realmente es: un director de orquesta que organiza las herramientas más robustas de Linux.

## 1.5. Instalación y configuración del entorno (Linux, Windows WSL2, macOS)

Hasta este punto, hemos hablado de Docker asumiendo que el sistema operativo anfitrión (*host*) es Linux. Como vimos en la sección anterior, los contenedores dependen directamente de primitivas del kernel de Linux (*namespaces* y *cgroups*).

Esto plantea una pregunta crucial para el entorno de desarrollo local: ¿Qué pasa si mi equipo de ingeniería usa Windows o macOS?

La respuesta corta es que **Docker solo se ejecuta de forma verdaderamente nativa en Linux**. En Windows y macOS, Docker necesita virtualizar un entorno Linux de forma transparente para poder operar. Entender esta diferencia es vital para diagnosticar problemas de rendimiento o de montaje de volúmenes en el futuro.

A continuación, abordaremos la instalación y las mejores prácticas para los tres ecosistemas principales.

### 1. Linux: El Entorno Nativo y de Producción

En Linux, la instalación es directa y sin intermediarios. Instalaremos **Docker Engine** (la versión comunitaria subyacente), que es exactamente lo que usarás en servidores de producción.

Aunque los repositorios oficiales de distribuciones como Ubuntu o Debian incluyen un paquete llamado `docker.io`, la mejor práctica en DevOps es instalar siempre la versión oficial proporcionada por el propio repositorio de Docker para asegurar actualizaciones tempranas.

**Pasos generales (Ejemplo para Ubuntu/Debian):**

1. **Configurar el repositorio oficial:**

```bash
# Actualizar dependencias e instalar herramientas previas
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg

# Añadir la clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Configurar el repositorio
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

```

1. **Instalar Docker Engine:**

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

```

1. **Post-instalación crítica (El grupo `docker`):**
Por defecto, el demonio de Docker se enlaza a un socket UNIX que pertenece al usuario `root`. Para no tener que escribir `sudo` antes de cada comando (lo cual es tedioso y mala práctica en pipelines locales), debes añadir tu usuario al grupo `docker`:

```bash
sudo usermod -aG docker $USER
# Deberás cerrar sesión y volver a entrar para que los cambios surtan efecto.

```

> **Nota de Seguridad:** En el Capítulo 8 veremos por qué pertenecer al grupo `docker` es técnicamente equivalente a tener privilegios de `root` en la máquina anfitriona, y cómo mitigarlo en producción.

### 2. Windows: El Cambio de Paradigma con WSL2

Históricamente, usar Docker en Windows era doloroso y requería una Máquina Virtual pesada gestionada por Hyper-V. Esto cambió radicalmente con la llegada de **WSL2 (Windows Subsystem for Linux v2)**.

WSL2 no es un simple emulador; es un kernel de Linux real y optimizado que Microsoft ejecuta junto al kernel de Windows de forma ultraligera.

**Opciones de instalación:**

* **Opción A (Docker Desktop):** Es la vía más sencilla. Instalas el ejecutable de Docker Desktop para Windows y, en la configuración, te aseguras de marcar la opción "Use the WSL 2 based engine". Docker se encargará de inyectar el demonio dentro de tu distribución Linux de WSL2 (como Ubuntu).
* *Advertencia comercial:* Docker Desktop requiere una licencia de pago para empresas grandes (más de 250 empleados o >$10M en ingresos anuales).

* **Opción B (Docker Engine directo en WSL2):** Para esquivar las licencias corporativas o buscar el máximo rendimiento, muchos ingenieros DevOps instalan una distribución de Ubuntu desde la Microsoft Store, abren esa terminal y siguen exactamente los mismos pasos de instalación de Linux descritos arriba, ejecutando el demonio directamente dentro de WSL2.

### 3. macOS: La Máquina Virtual Oculta

El kernel de Apple (Darwin) está basado en UNIX, pero no es Linux. No tiene *cgroups* ni *namespaces*. Por lo tanto, para correr en una Mac, Docker levanta una Máquina Virtual ligera de Linux en segundo plano (usando el framework Hypervisor nativo de macOS) y ejecuta el demonio allí, sincronizando los archivos y la red con tu Mac de forma casi invisible.

**Opciones de instalación:**

* **Docker Desktop para Mac:** Al igual que en Windows, es la herramienta oficial. Funciona excelentemente tanto en procesadores Intel como en la arquitectura Apple Silicon (M1/M2/M3).
* **Alternativas Senior (OrbStack o Colima):** Debido al consumo de batería y memoria que a veces presenta Docker Desktop en Mac, la comunidad DevOps ha adoptado alternativas de alto rendimiento.
* **OrbStack:** Una alternativa a Docker Desktop ultrarrápida, escrita en Rust, que consume significativamente menos CPU y RAM.
* **Colima:** Una herramienta CLI open-source que provisiona tiempos de ejecución de contenedores en macOS usando instancias ligeras de `Lima`. Se instala fácilmente vía Homebrew (`brew install colima docker`).

### 4. Verificando la instalación (El "Hola Mundo" de la infraestructura)

Independientemente de tu sistema operativo y método de instalación, el momento de la verdad es el mismo. Abre tu terminal y ejecuta:

```bash
docker run hello-world

```

Si todo está configurado correctamente, verás cómo el cliente de Docker no encuentra la imagen localmente, hace un *pull* desde Docker Hub, instancia el contenedor, e imprime un mensaje de éxito explicándote exactamente los pasos que acaba de realizar bajo el capó.

Tu entorno está listo.

## 1.6. Configuración del demonio de Docker (`daemon.json`)

Una vez instalado Docker, este viene preconfigurado con valores por defecto que son excelentes para que un desarrollador empiece a trabajar en su máquina local en cuestión de minutos. Sin embargo, en un entorno de producción o en una estación de trabajo de un ingeniero DevOps avanzado, los valores por defecto rara vez son suficientes.

El comportamiento del motor de Docker se controla de forma centralizada a través de un único archivo de configuración estructurado: el `daemon.json`.

### ¿Dónde vive este archivo?

La ubicación del archivo varía según el sistema operativo y el método de instalación:

* **Linux (Nativo):** `/etc/docker/daemon.json`
* **Linux (Modo Rootless):** `~/.config/docker/daemon.json`
* **Windows / macOS (Docker Desktop):** Aunque se puede acceder desde la interfaz gráfica (Settings > Docker Engine), físicamente reside en `~/.docker/daemon.json`.

Si el archivo no existe tras una instalación limpia en Linux, simplemente debes crearlo.

### La anatomía de un `daemon.json` para Producción

Como su nombre indica, el archivo utiliza formato JSON puro. Esto significa que es estricto: una coma mal colocada evitará que el servicio de Docker arranque.

A continuación, analizaremos un ejemplo de configuración típica para un servidor de producción o un nodo de CI/CD, abordando los problemas más comunes a los que se enfrenta un equipo de operaciones.

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  },
  "bip": "172.26.0.1/16",
  "default-address-pools": [
    {
      "base": "172.27.0.0/16",
      "size": 24
    }
  ],
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,
  "insecure-registries": ["registry.mi-empresa.local:5000"],
  "storage-driver": "overlay2"
}

```

Desglosemos por qué cada una de estas directivas es un salvavidas operacional:

**1. Prevención del colapso por Logs (`log-opts`)**
Este es, con diferencia, el "Incidente de Nivel 1" más común para quienes recién adoptan Docker. Por defecto, Docker captura la salida estándar (`stdout` y `stderr`) de cada contenedor y la guarda en un archivo JSON en el disco del host. El problema es que **no tiene límite de tamaño**. Un contenedor que escupa muchos logs (como una base de datos o un balanceador de carga) llenará el disco duro del servidor al 100%, tumbando la máquina completa.
Con las opciones `max-size: "50m"` y `max-file: "3"`, le indicamos al demonio que aplique una rotación automática: cada contenedor solo podrá generar un máximo de 3 archivos de 50 MB cada uno. *(Nota: Profundizaremos en el envío de logs a sistemas centralizados como ELK en el Capítulo 9).*

**2. Prevención de conflictos de red corporativos (`bip` y `default-address-pools`)**
Por defecto, Docker asigna a su red puente (`docker0`) el rango de IPs `172.17.0.0/16`. En muchos entornos corporativos o infraestructuras Cloud (AWS VPC), este rango ya está siendo utilizado por redes locales o VPNs. Si hay un solapamiento, el servidor perderá conectividad hacia esas redes externas.
Definir el `bip` (Bridge IP) y los `default-address-pools` obliga a Docker a utilizar un rango de subredes que tú determines explícitamente como seguro.

**3. Observabilidad y Métricas (`metrics-addr` y `experimental`)**
Para poder monitorizar la salud del motor de Docker (cuántos contenedores fallan, uso de memoria del demonio, etc.), podemos habilitar el endpoint de métricas. Al fijar el puerto `9323` y habilitar las funciones experimentales, Docker expondrá automáticamente sus métricas internas en formato compatible con **Prometheus**, permitiéndonos crear dashboards en Grafana de forma inmediata.

**4. Registros Inseguros (`insecure-registries`)**
Por razones de seguridad, Docker solo se comunica con registros de imágenes mediante HTTPS (TLS). Sin embargo, en entornos locales o redes de CI/CD estrictamente aisladas, a veces levantamos registros temporales que no tienen certificados SSL válidos. Esta directiva le dice al demonio: *"Confía en esta IP o dominio específico y permítele descargar imágenes en texto plano"*.

**5. Driver de Almacenamiento (`storage-driver`)**
Define cómo Docker maneja el sistema de archivos por capas. Hoy en día, `overlay2` es el estándar absoluto por su excelente rendimiento y madurez en kernels modernos. Es buena práctica dejarlo explícito para evitar que Docker intente usar un *fallback* menos eficiente (como `vfs` o `devicemapper` en sistemas legacy) si hay problemas de particionamiento.

### Aplicando los cambios

Una vez que modificas o creas el `/etc/docker/daemon.json`, el demonio no leerá los cambios mágicamente. Debes recargar la configuración de `systemd` y reiniciar el servicio de Docker:

```bash
# Validar la configuración de systemd
sudo systemctl daemon-reload

# Reiniciar el motor de Docker (¡Atención! Esto detendrá los contenedores en ejecución)
sudo systemctl restart docker

# Verificar que el servicio arrancó correctamente
sudo systemctl status docker

```

Con un demonio correctamente configurado y asegurado, la infraestructura base está lista. Hemos superado la teoría estructural de la contenerización y tenemos el motor en marcha.
