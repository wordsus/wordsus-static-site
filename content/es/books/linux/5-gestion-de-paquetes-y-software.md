Administrar software en Linux es el arte de mantener el equilibrio entre estabilidad y vanguardia. Para un perfil DevOps, esto trasciende la simple instalación de programas; implica automatizar despliegues, garantizar la seguridad mediante firmas criptográficas y optimizar imágenes de contenedores para entornos productivos.

En este capítulo, exploramos el ecosistema de **Debian/Ubuntu** con el estándar `apt` y la robustez corporativa de **RHEL/CentOS** mediante `dnf`. Analizamos la anatomía de los repositorios y finalizamos dominando el empaquetado con `tar`, herramientas esenciales para mover artefactos y gestionar dependencias sin comprometer la integridad del sistema.

## 5.1 Gestión en sistemas basados en Debian/Ubuntu (`apt`, `apt-get`, `dpkg`)

Si trabajas en DevOps, es una garantía casi absoluta que pasarás una gran parte de tu tiempo interactuando con sistemas basados en Debian (como Ubuntu). Esto se debe a que una inmensa mayoría de las imágenes base de contenedores y servidores en la nube utilizan esta familia de distribuciones.

En este ecosistema, el software se distribuye empaquetado en archivos con la extensión `.deb`. Sin embargo, rara vez manipularás estos archivos a mano. En su lugar, utilizarás un conjunto de herramientas de diferentes niveles. Entender la jerarquía entre `dpkg`, `apt-get` y `apt` es lo que separa a un usuario casual de un ingeniero que escribe automatizaciones robustas.

### La Arquitectura de la Gestión de Paquetes

Antes de teclear comandos, visualicemos cómo interactúan estas herramientas:

```text
[ Repositorios Remotos ] (Internet / Intranet)
         |
         | (1. Busca, descarga y resuelve dependencias)
         v
  [ apt / apt-get ]  <---> [ Caché de metadatos (/var/lib/apt) ]
         |
         | (2. Pasa los archivos .deb locales para su instalación)
         v
      [ dpkg ]       <---> [ Base de datos local (/var/lib/dpkg) ]
         |
         | (3. Desempaqueta y ubica archivos en el sistema: /usr, /etc, etc.)
         v
[ Archivos instalados en tu Linux ]

```

### Nivel 1: `dpkg` (El Motor Subyacente)

`dpkg` (Debian Package) es la herramienta de más bajo nivel. Solo entiende de archivos `.deb` que ya tienes descargados localmente. **Su mayor limitación es que no sabe cómo descargar cosas de internet ni cómo resolver dependencias automáticamente.**

Si intentas instalar un paquete con `dpkg` y le falta una dependencia, fallará y te lo hará saber.

**Comandos clave de `dpkg`:**

* **Instalar un paquete local:** `sudo dpkg -i paquete_1.0_amd64.deb`
* **Eliminar un paquete:** `sudo dpkg -r nombre_del_paquete` (Nota: usa el nombre del software, no el nombre del archivo `.deb`).
* **Listar todo lo instalado:** `dpkg -l` (Útil para auditar qué hay en un servidor).
* **Ver el contenido de un .deb sin instalarlo:** `dpkg -c paquete.deb`

> **DevOps Rescue Tip:** Si instalaste algo con `dpkg -i` y se rompió por falta de dependencias (quedando en un estado "half-installed"), puedes forzar al sistema a buscar y descargar lo que falta con: `sudo apt-get install -f` (Fix broken).

### Nivel 2: `apt` vs. `apt-get` (El dilema del Senior)

Para solucionar la falta de resolución de dependencias de `dpkg`, nacieron las herramientas APT (Advanced Package Tool). Estas herramientas consultan los repositorios, calculan el árbol de dependencias, descargan los `.deb` y luego llaman a `dpkg` por ti.

Aquí es donde muchos tropiezan: **¿Cuál es la diferencia entre `apt` y `apt-get`?**

1. **`apt-get` (La herramienta para máquinas):** Es más antigua, robusta y su salida de texto es estable. Está diseñada para no cambiar entre versiones, lo que la hace **obligatoria para scripts, pipelines de CI/CD y Dockerfiles.**
2. **`apt` (La herramienta para humanos):** Introducida más recientemente, unifica comandos dispersos de `apt-get` y `apt-cache`. Tiene barras de progreso, colores e interacciones dinámicas. **Úsala cuando estés escribiendo en la terminal interactivamente.** *Nunca la uses en scripts automatizados*, ya que su formato de salida puede cambiar o bloquearse esperando confirmación visual.

### Operaciones del Día a Día

Ya sea que uses `apt` (en terminal) o `apt-get` (en scripts), las operaciones fundamentales son las mismas:

**1. Sincronizar el mapa del tesoro (`update`)**
Antes de instalar nada, tu sistema necesita saber qué software existe en el mundo exterior.

```bash
sudo apt update

```

*Nota: Esto NO actualiza el software. Solo actualiza el índice local de metadatos desde los repositorios. Siempre es el paso 1.*

**2. Instalar software (`install`)**

```bash
sudo apt install nginx

```

**3. Actualizar el sistema (`upgrade`)**
Instala las versiones más recientes de todos los paquetes que ya tienes en el sistema.

```bash
sudo apt upgrade

```

**4. Eliminar software (`remove` vs `purge`)**

* `sudo apt remove nginx`: Desinstala los binarios, pero **conserva los archivos de configuración** (generalmente en `/etc`). Útil si planeas reinstalarlo en el futuro y no quieres perder tus ajustes.
* `sudo apt purge nginx`: Destruye el paquete y **borra todas sus configuraciones**. Es la opción preferida en servidores para no dejar "basura" huérfana.

**5. Limpieza general (`autoremove`)**
A medida que instalas y desinstalas cosas, quedan dependencias huérfanas (librerías que se instalaron para un programa que ya no existe). Para limpiar el sistema y liberar espacio:

```bash
sudo apt autoremove --purge

```

---

### DevOps Masterclass: `apt` en Automatización y Docker

Cuando escribes un `Dockerfile` o un script de aprovisionamiento (como bash o Ansible), debes asegurarte de que la instalación sea "silenciosa" y eficiente. Un prompt preguntando *"¿Deseas continuar [Y/n]?"* arruinará todo tu pipeline porque no hay un humano para presionar 'Y'.

Aquí tienes el "Patrón de Oro" para usar en contenedores o scripts de CI/CD:

```bash
# Ejemplo clásico dentro de un Dockerfile
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

```

**¿Por qué este bloque es código de nivel Senior?**

1. **`apt-get` en lugar de `apt`:** Evita warnings de uso en scripts.
2. **`DEBIAN_FRONTEND=noninteractive`:** Le dice al sistema que no hay pantalla. Si un paquete intenta lanzar un menú interactivo (como preguntar por la zona horaria), tomará las opciones por defecto sin bloquear el despliegue.
3. **`-y` (Yes):** Asume "Sí" a todas las preguntas de confirmación.
4. **`--no-install-recommends`:** Por defecto, Ubuntu instala paquetes "recomendados" adicionales al software que pediste. En un contenedor, cada megabyte cuenta. Esto instala *estrictamente* lo necesario para que el programa funcione.
5. **`rm -rf /var/lib/apt/lists/*`:** Elimina la caché de repositorios que `apt-get update` descargó. Si no haces esto en la misma capa del `Dockerfile`, tu imagen final pesará decenas de megabytes más sin ninguna razón útil.

## 5.2 Gestión en sistemas basados en RHEL/CentOS (`yum`, `dnf`, `rpm`)

Si el mundo Debian domina los contenedores base y las startups, el ecosistema de Red Hat (RHEL, CentOS, Rocky Linux, AlmaLinux, Fedora) es el rey indiscutible de los entornos corporativos tradicionales, la banca y las telecomunicaciones.

En esta familia, los paquetes se distribuyen con la extensión `.rpm` (Red Hat Package Manager). Al igual que en Ubuntu, existe una jerarquía clara de herramientas. Comprender la evolución de estas herramientas y sus diferencias te ahorrará dolores de cabeza al migrar scripts antiguos a servidores modernos.

### La Arquitectura de Gestión: El paso de YUM a DNF

La estructura subyacente es conceptualmente idéntica a la de Debian, pero los actores cambian:

```text
[ Repositorios Remotos ] (Archivos configurados en /etc/yum.repos.d/)
         |
         | (1. Resuelve dependencias y descarga)
         v
    [ dnf / yum ]    <---> [ Caché de metadatos (/var/cache/dnf) ]
         |
         | (2. Pasa los .rpm locales para instalación)
         v
       [ rpm ]       <---> [ Base de datos local (/var/lib/rpm) ]
         |
         | (3. Instala los binarios y configuraciones)
         v
[ Archivos en tu sistema Linux ]

```

### Nivel 1: `rpm` (El nivel más bajo)

Al igual que `dpkg`, el comando `rpm` opera estrictamente sobre paquetes locales y **no sabe resolver dependencias**. Si intentas instalar un `.rpm` que requiere librerías adicionales, `rpm` se detendrá y te mostrará un error.

Como ingeniero DevOps, rara vez usarás `rpm` para instalar software (para eso están `yum`/`dnf`), pero es una herramienta de auditoría invaluable.

**Comandos clave de `rpm`:**

* **Instalar un paquete local (modo clásico):** `sudo rpm -ivh paquete.rpm` (Instala, muestra progreso de forma *Verbose* e imprime un *Hash* de progreso).
* **Listar todo el software instalado:** `rpm -qa` (Query All).
* **Averiguar a qué paquete pertenece un archivo:** `rpm -qf /etc/httpd/conf/httpd.conf` (Útil cuando encuentras un archivo de configuración y no sabes qué programa lo creó).
* **Ver los archivos que instalará un .rpm:** `rpm -qlp paquete.rpm` (Query List Package).

### Nivel 2: `yum` vs. `dnf` (La evolución de la especie)

Para manejar repositorios y dependencias, Red Hat creó **`yum`** (Yellowdog Updater, Modified). Fue el estándar de la industria durante más de una década (muy común en CentOS 7). Sin embargo, `yum` estaba escrito en Python 2, consumía mucha memoria y su algoritmo de resolución de dependencias era lento.

Para solucionarlo, nació **`dnf`** (Dandified YUM). `dnf` es el reemplazo moderno, estándar en RHEL 8+, Rocky Linux y Fedora. Utiliza una biblioteca de resolución de dependencias mucho más rápida en C/C++ (`libsolv`).

> **DevOps Tip:** En sistemas modernos, si escribes `yum install nginx`, el sistema en realidad ejecutará `dnf` por debajo mediante un enlace simbólico. Acostúmbrate a usar `dnf` en tus scripts nuevos para asegurar compatibilidad futura.

### Operaciones del Día a Día (`dnf`)

La sintaxis de `dnf` es muy limpia y similar a la que ya conoces:

**1. Instalar y actualizar**

* **Instalar:** `sudo dnf install nginx`
* **Actualizar un solo paquete:** `sudo dnf upgrade nginx`
* **Actualizar todo el sistema:** `sudo dnf upgrade` (Nota: En DNF, `update` y `upgrade` hacen esencialmente lo mismo, a diferencia de APT).

**2. Búsqueda e información**

* **Buscar un paquete:** `dnf search apache`
* **Ver información de un paquete:** `dnf info nginx`

**3. La "Máquina del Tiempo" (Nivel Senior)**
Esta es la característica "killer" de `dnf` que APT no tiene de forma nativa. DNF registra todas las transacciones (instalaciones, actualizaciones, borrados).

Si una actualización rompe tu servidor de producción, puedes revertirla fácilmente:

```bash
# 1. Mira el historial de transacciones
sudo dnf history

# (Verás una lista con un ID de transacción, digamos la número 45)

# 2. Revertir exactamente lo que hizo esa transacción
sudo dnf history undo 45

```

---

### DevOps Masterclass: `dnf` en Automatización y Docker

Cuando construyes imágenes de contenedores (por ejemplo, basadas en `registry.access.redhat.com/ubi8/ubi`), debes optimizar tus comandos `dnf` para mantener la imagen ligera y evitar bloqueos interactivos.

El "Patrón de Oro" para Red Hat / Rocky Linux en un `Dockerfile`:

```bash
RUN dnf update -y && \
    dnf install -y --setopt=install_weak_deps=False \
    git \
    curl \
    httpd && \
    dnf clean all && \
    rm -rf /var/cache/dnf

```

**Análisis del código:**

1. **`-y`:** Al igual que en APT, responde "Sí" automáticamente para que el script no se quede colgado.
2. **`--setopt=install_weak_deps=False`:** Es el equivalente exacto a `--no-install-recommends` de APT. Evita que `dnf` instale documentación pesada o complementos opcionales que no necesitas en un contenedor.
3. **`dnf clean all`:** Borra la caché de metadatos de los repositorios que se descargó durante la actualización.
4. **`rm -rf /var/cache/dnf`:** Garantiza la destrucción total de archivos temporales que `dnf` pueda haber dejado atrás, ahorrando valiosos megabytes en tu imagen final.

## 5.3 Gestión de repositorios y resolución de dependencias

Instalar un paquete con `apt` o `dnf` parece magia, pero detrás de esa simplicidad hay un sistema estricto de fuentes de confianza y firmas criptográficas. Un repositorio no es más que un servidor web (o FTP) que aloja un índice de paquetes y los binarios correspondientes.

Como ingeniero DevOps, rara vez te limitarás a usar los repositorios oficiales de la distribución. Tarde o temprano necesitarás instalar versiones específicas de Docker, HashiCorp Terraform, Node.js o PostgreSQL directamente desde los repositorios de sus creadores. Entender cómo configurar esto correctamente es vital para la reproducibilidad de tu infraestructura.

### El Ecosistema Debian/Ubuntu (`/etc/apt/sources.list`)

En los sistemas basados en Debian, las fuentes de software se definen principalmente en el archivo `/etc/apt/sources.list` y en los archivos `.list` dentro del directorio `/etc/apt/sources.list.d/`.

> **DevOps Tip:** La regla de oro moderna es **nunca tocar el archivo `sources.list` original**. Cuando agregues un repositorio de terceros (como Docker o Nginx), crea siempre un archivo nuevo dentro de `/etc/apt/sources.list.d/`. Esto facilita la automatización con herramientas como Ansible y permite eliminar el repositorio simplemente borrando un archivo.

**Anatomía de una línea de repositorio APT:**

```text
deb  [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg]  https://download.docker.com/linux/ubuntu  jammy  stable
(1)  (2)                                                  (3)                                       (4)    (5)

```

1. **Tipo de archivo:** `deb` (para binarios precompilados) o `deb-src` (para el código fuente).
2. **Opciones (Moderno):** Define la arquitectura (ej. `amd64`, `arm64`) y, críticamente, **la ruta a la clave GPG** que verifica las firmas de este repositorio específico.
3. **URL:** La dirección del servidor.
4. **Distribución (Codename):** El nombre en clave de tu versión del SO (ej. `jammy` para Ubuntu 22.04, `bookworm` para Debian 12).
5. **Componentes:** Categorías del software (ej. `main`, `restricted`, `universe`, `stable`).

#### El fin de `apt-key` y la seguridad moderna

En el pasado, se usaba `sudo apt-key add` para confiar en las claves de los repositorios. **Esto es una práctica obsoleta y un riesgo de seguridad**, ya que daba a esa clave permisos para firmar *cualquier* paquete en el sistema. Hoy, la práctica "Senior" es descargar la clave en `/etc/apt/keyrings/` y referenciarla explícitamente en el archivo `.list` (como se ve en la opción `signed-by` arriba).

### El Ecosistema RHEL/CentOS (`/etc/yum.repos.d/`)

El mundo Red Hat organiza las cosas de forma un poco más estructurada usando archivos con formato INI. Todos los repositorios de terceros deben ir en `/etc/yum.repos.d/` con la extensión `.repo`.

**Anatomía de un archivo `.repo`:**

```ini
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key

```

* **`[nginx-stable]`:** El ID interno del repositorio (debe ser único).
* **`baseurl`:** La URL donde están los paquetes. Nota el uso inteligente de variables dinámicas como `$releasever` (versión del SO) y `$basearch` (arquitectura del procesador). Esto hace que el mismo archivo `.repo` sirva para múltiples máquinas.
* **`gpgcheck=1`:** Obliga a DNF/YUM a verificar criptográficamente cada paquete antes de instalarlo. **Nunca pongas esto en 0 en producción.**
* **`enabled=1`:** Activa (1) o desactiva (0) el repositorio sin tener que borrar el archivo.

Puedes gestionar estos archivos a mano, o usar la herramienta oficial para automatizarlo:

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

```

### Resolución de Dependencias: El Árbol de Ejecución

Cuando pides instalar una herramienta, el gestor de paquetes construye un **Grafo Acíclico Dirigido (DAG)**. Es un mapa matemático que dice: *"Para instalar A, primero necesito B y C. Pero C requiere la versión 2.0 de D. Sin embargo, ya tienes instalada la versión 1.5 de D para el programa E"*.

Si el gestor de paquetes no puede resolver este rompecabezas sin romper el programa E, te encontrarás con el infame **"Dependency Hell"** (Infierno de dependencias).

**¿Cómo diagnosticar y solucionar conflictos?**

* **En APT:** Puedes simular una instalación para ver el árbol de decisiones sin modificar el sistema usando la bandera `-s` (simulate):
```bash
apt-get install -s paquete_conflictivo

```


* **En DNF:** Puedes usar el comando `repoquery` para analizar de qué depende un paquete antes de hacer nada:
```bash
dnf repoquery --requires nginx

```



---

### DevOps Masterclass: Fijación de Versiones (Version Locking)

El mayor enemigo de la infraestructura inmutable es un `apt-get upgrade` que actualiza silenciosamente una base de datos o un runtime, rompiendo tu aplicación. Un ingeniero Senior no confía en la suerte; **fija (bloquea) las versiones críticas.**

**En Debian/Ubuntu (APT Pinning):**
Se utilizan archivos de preferencias en `/etc/apt/preferences.d/`. Para evitar que un paquete específico (por ejemplo, `kubelet`) se actualice accidentalmente:

```bash
# Se crea un archivo con reglas de prioridad
cat <<EOF | sudo tee /etc/apt/preferences.d/kubelet
Package: kubelet
Pin: version 1.28.*
Pin-Priority: 1000
EOF

```

*También puedes usar un atajo más simple, aunque menos flexible:* `sudo apt-mark hold kubelet`.

**En RHEL/CentOS (DNF Versionlock):**
DNF requiere un plugin específico para esto, que es indispensable en servidores de producción:

```bash
# 1. Instalar el plugin
sudo dnf install 'dnf-command(versionlock)'

# 2. Bloquear una versión específica
sudo dnf versionlock add docker-ce

# 3. Ver qué paquetes están bloqueados
sudo dnf versionlock list

```

Bloquear versiones garantiza que tus servidores de desarrollo, staging y producción ejecuten exactamente el mismo código, mitigando el síndrome de *"en mi máquina sí funciona"*.

## 5.4 Empaquetado y compresión de archivos (`tar`, `gzip`, `zip`, `unzip`)

En el día a día de un ingeniero DevOps, mover miles de archivos sueltos de un servidor a otro es una receta para el desastre: es lento, ineficiente y propenso a errores de red. Ya sea que estés respaldando una base de datos, rotando logs antiguos o empaquetando el artefacto de una aplicación para su despliegue, necesitas dominar el empaquetado y la compresión.

Una confusión muy común al principio es pensar que empaquetar y comprimir son lo mismo. En el ecosistema UNIX, son dos procesos distintos que la historia ha terminado fusionando en comandos combinados.

### El Concepto: Empaquetar vs. Comprimir

Visualicemos la diferencia antes de tocar la terminal:

```text
1. Archivos Sueltos:   [file1.txt] [file2.log] [dir/file3.conf]
                              |
      (Empaquetado) --------> | (Herramienta: tar)
                              v
2. El "Tarball":       [ archivo_unico.tar ]  <-- (Es un solo archivo, pero NO está comprimido. Pesa lo mismo que los 3 juntos).
                              |
      (Compresión) ---------> | (Herramienta: gzip, bzip2, xz)
                              v
3. Archivo Final:      [ archivo_unico.tar.gz ] <-- (Un solo archivo, mucho más ligero).

```

### Nivel 1: El Estándar UNIX (`tar` y `gzip`)

La herramienta reina indiscutible es `tar` (Tape Archive, un remanente de la era en que los respaldos se hacían en cintas magnéticas). Hoy en día, `tar` es capaz de llamar a programas de compresión como `gzip` internamente.

La sintaxis de `tar` puede parecer intimidante, pero se basa en "banderas" (flags) que indican la acción a realizar.

**Las banderas fundamentales:**

* `-c` (Create): Crea un archivo nuevo.
* `-x` (eXtract): Extrae un archivo existente.
* `-z` (gZip): Comprime o descomprime usando `gzip` (extensión `.tar.gz` o `.tgz`).
* `-v` (Verbose): Muestra en pantalla cada archivo que está procesando.
* `-f` (File): Indica el nombre del archivo resultante (debe ser siempre la última bandera antes del nombre del archivo).

**Operaciones del Día a Día:**

**1. Crear un archivo comprimido:**
Empaquetar y comprimir la carpeta `/var/log/nginx` en un archivo llamado `logs_backup.tar.gz`:

```bash
tar -czvf logs_backup.tar.gz /var/log/nginx

```

**2. Extraer un archivo comprimido:**
Descomprimir el archivo en el directorio actual:

```bash
tar -xzvf logs_backup.tar.gz

```

*(Nota: Si quieres extraerlo en una ruta específica, usa la bandera `-C`: `tar -xzvf archivo.tar.gz -C /opt/destino/`)*

**3. Inspeccionar sin extraer (Auditoría):**
Si descargas un `.tar.gz` de internet, nunca lo extraigas a ciegas. Revisa su contenido primero usando la bandera `-t` (lisT):

```bash
tar -tzvf misterio.tar.gz

```

> **DevOps Tip:** En scripts de CI/CD (como en GitHub Actions o Jenkins), **NUNCA uses la bandera `-v`**. Si comprimes un directorio de `node_modules` con 50,000 archivos, la terminal imprimirá 50,000 líneas. Esto satura el buffer de logs de tu herramienta de CI, enlenteciendo el pipeline y a veces provocando que falle por falta de memoria. Usa simplemente `tar -czf`.

### Nivel 2: El Mundo Multiplataforma (`zip` y `unzip`)

Aunque `tar.gz` es el estándar en Linux, ocasionalmente tendrás que interactuar con el formato `.zip`. Esto ocurre comúnmente en dos escenarios DevOps:

1. Compartir artefactos con desarrolladores que usan Windows.
2. Empaquetar código para funciones Serverless (AWS Lambda y Google Cloud Functions exigen que el código se suba en formato `.zip`).

A diferencia de `tar`, `zip` comprime y empaqueta en un solo paso de forma nativa.

**Comandos clave:**

* **Comprimir un directorio entero:**
```bash
zip -r mi_lambda.zip /ruta/al/codigo/

```


*(El `-r` es por recursivo, vital para incluir subdirectorios).*
* **Descomprimir:**
```bash
unzip mi_lambda.zip -d /ruta/destino/

```



---

### DevOps Masterclass: Streaming, Pipes y Rendimiento

Aquí es donde la magia ocurre y justificas tu salario.

**1. Compresión y Transferencia al Vuelo (Sin tocar el disco local)**
Imagina que tienes que respaldar una carpeta de 100 GB a otro servidor, pero tu disco local solo tiene 5 GB libres. No puedes crear el `.tar.gz` localmente.
La solución es canalizar (piping) la salida estándar de `tar` directamente a través de `ssh` hacia el servidor remoto:

```bash
tar -czf - /var/www/html | ssh usuario@ip_remota "cat > /backups/html_backup.tar.gz"

```

*El guion solitario `-` le dice a `tar`: "no crees un archivo, envía los datos binarios directamente a la terminal (stdout)". El pipeline `|` lo captura y lo envía por la red segura.*

**2. Aceleración Multihilo con `pigz`**
El algoritmo tradicional de `gzip` funciona en un solo hilo (single-core). Si estás comprimiendo un dump de base de datos masivo en un servidor con 32 núcleos de CPU, `gzip` usará 1 núcleo al 100% y dejará 31 durmiendo.
Los Senior instalan `pigz` (Parallel Implementation of GZIP), que usa todos los núcleos disponibles de forma nativa.

Puedes decirle a `tar` que use `pigz` en lugar de `gzip` así:

```bash
tar -I pigz -cvf backup_masivo.tar.gz /datos_pesados/

```

Esto puede reducir una compresión que tomaba 40 minutos a tan solo 4 o 5 minutos.
