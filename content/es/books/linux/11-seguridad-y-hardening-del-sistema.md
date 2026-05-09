En la era del DevOps, la seguridad no es un paso final, sino un componente intrínseco del ciclo de vida del software (DevSecOps). Este capítulo aborda las herramientas críticas para blindar la infraestructura desde el corazón del sistema operativo. Comenzamos dominando la **integridad de datos** y la **codificación** con sumas de verificación y Base64. Elevamos el estándar de **acceso remoto** mediante el endurecimiento de SSH y el uso estratégico de túneles. Finalmente, establecemos perímetros defensivos con **firewalls** de host y aplicamos **control de acceso mandatorio** (SELinux/AppArmor) para contener posibles brechas, asegurando que un compromiso parcial no signifique la caída total del sistema.

## 11.1 Criptografía básica y sumas de verificación (`md5sum`, `sha256sum`, base64)

Antes de levantar firewalls o configurar accesos remotos, un ingeniero DevOps debe comprender cómo se representa, se verifica y se protege la información a nivel de sistema. En el mundo real, constantemente estarás manejando secretos en Kubernetes, descargando binarios de repositorios externos o construyendo imágenes de contenedores. En todas estas tareas, herramientas como `base64`, `md5sum` y `sha256sum` son tu pan de cada día.

Para empezar, debemos trazar una línea dura entre dos conceptos que los principiantes suelen confundir: **Codificación** (Encoding) y **Hashing** (Sumas de verificación). Ninguna de estas dos cosas es **Encriptación** (la cual requiere una llave para ocultar datos).

A continuación, un diagrama que ilustra la diferencia fundamental:

```text
+--------------------------------------------------------------------+
|                DIFERENCIAS CLAVE EN LA TRANSFORMACIÓN              |
+--------------------------------------------------------------------+

1. CODIFICACIÓN (Base64) -> [ REVERSIBLE, NO ES SEGURIDAD ]
   Propósito: Transportar datos binarios en formatos de texto (JSON, YAML).
   
   "Hola"  ----( Codificar )----> "SG9sYQ=="
   "SG9sYQ==" -( Decodificar )--> "Hola"

2. HASHING (md5, sha256) -> [ IRREVERSIBLE, IDENTIDAD DEL ARCHIVO ]
   Propósito: Verificar la integridad. Es la "huella dactilar" del dato.
   
   "Hola"  ----( SHA-256 )----> "b221d9dbb083...[hash_largo]...ddb79"
   "Hola!" ----( SHA-256 )----> "67b841ee1eec...[hash_diferente]..1d4a"
   *(Nota: Modificar un solo bit cambia drásticamente el hash final)*

```

---

### Base64: La navaja suiza de la codificación de datos

`base64` no cifra nada; toma cualquier dato (texto, imágenes, certificados) y lo traduce a un alfabeto de 64 caracteres legibles en ASCII. Esto es vital en DevOps porque protocolos como HTTP o formatos como JSON/YAML (usados en Kubernetes o Ansible) se rompen si intentas inyectarles binarios crudos o caracteres especiales.

**El error clásico del Junior:**
Al codificar contraseñas de forma rápida, muchos usan `echo`. El problema es que `echo` añade un salto de línea (`\n`) invisible al final, y `base64` también codificará ese salto, generando un valor incorrecto.

**La forma correcta (Senior):**
Usa el flag `-n` en `echo` para evitar el salto de línea, o usa `printf`.

```bash
# FORMA INCORRECTA (Codifica "mi_password\n")
$ echo "mi_password" | base64
bWlfcGFzc3dvcmQK

# FORMA CORRECTA (Codifica solo "mi_password")
$ echo -n "mi_password" | base64
bWlfcGFzc3dvcmQ=

```

Para decodificar (por ejemplo, al auditar un *Secret* de Kubernetes), utilizamos el flag `-d`:

```bash
$ echo "bWlfcGFzc3dvcmQ=" | base64 -d
mi_password

```

> **Advertencia de Seguridad:** Nunca uses Base64 para "proteger" contraseñas en bases de datos o scripts. Cualquiera que vea la cadena puede revertirla instantáneamente. Su único fin es el *transporte* seguro de datos, no la confidencialidad.

---

### Sumas de verificación (Checksums): Asegurando la integridad

Una suma de verificación (hash) es el resultado de pasar un archivo o texto por un algoritmo matemático. Si el archivo descargado tiene exactamente el mismo hash que el autor publicó en su web, sabes dos cosas: el archivo no se corrompió durante la descarga, y no ha sido alterado por un atacante (Supply Chain Attack).

#### `md5sum`: El veterano rápido (y roto)

MD5 fue el estándar durante años. Genera un hash de 32 caracteres hexadecimales.

```bash
# Generar el hash de un archivo de configuración
$ md5sum nginx.conf
d41d8cd98f00b204e9800998ecf8427e  nginx.conf

```

**Realidad DevOps:** Criptográficamente, MD5 está roto. Es muy fácil para un atacante crear un archivo malicioso que tenga exactamente el mismo hash MD5 que un archivo legítimo (lo que se conoce como "colisión").

* **¿Cuándo usarlo?** Para comprobaciones rápidas de integridad no relacionadas con la seguridad. (Ej. ¿Se copió bien este log gigante de 50GB de un servidor a otro? `md5sum` es más rápido de procesar que SHA-256).
* **¿Cuándo NO usarlo?** Validar firmas de software, certificados SSL o almacenar contraseñas.

#### `sha256sum`: El estándar moderno de la industria

SHA-256 (parte de la familia SHA-2) es el estándar actual para garantizar la integridad en entornos de alta seguridad. Es lo que usa Docker para los *digests* de sus imágenes y lo que los proveedores de software (HashiCorp, Kubernetes, etc.) usan para firmar sus binarios.

**Flujo de trabajo real: Verificando un binario**

Imagina que descargas una nueva versión de una herramienta. El proveedor siempre te dará el archivo y un archivo `.sha256` o un texto con el hash esperado.

1. Descargas el archivo:

```bash
wget https://ejemplo.com/devops-tool-v1.tar.gz

```

1. Generas el hash localmente y lo comparas "a ojo" con el de la web:

```bash
$ sha256sum devops-tool-v1.tar.gz
8a4f8...[hash_generado]... devops-tool-v1.tar.gz

```

1. **El método automatizado (Senior):** Si tienes un archivo que contiene el hash original y el nombre del archivo (usualmente llamado `checksums.txt` o similar), puedes usar el flag `-c` (check) para que Linux haga la validación por ti:

```bash
# El comando lee el archivo original, calcula el hash, y lo compara con el texto
$ sha256sum -c checksums.txt
devops-tool-v1.tar.gz: La suma coincide

```

Si el archivo hubiera sido modificado aunque sea en un solo byte por un ataque de intermediario (MITM), el comando arrojaría un error crítico indicando que la suma falló, salvándote de instalar malware en tu infraestructura.

## 11.2 Acceso remoto seguro (SSH, `ssh-keygen`, `ssh-copy-id`, túneles SSH, `sshd_config`)

Si la línea de comandos es tu herramienta de trabajo, SSH (Secure Shell) es el vehículo que te lleva a la oficina. Atrás quedaron los días de Telnet y FTP, donde las contraseñas viajaban en texto plano listas para ser interceptadas. SSH crea un canal seguro y cifrado sobre una red insegura, utilizando precisamente los conceptos criptográficos que vimos en la sección anterior.

En el mundo DevOps, SSH no solo sirve para "entrar a un servidor". Es el protocolo subyacente que usan Ansible para configurar flotas de máquinas, Git para empujar código y Rsync para sincronizar backups.

### 1. La Identidad Criptográfica: `ssh-keygen`

La autenticación por contraseña es el primer vector de ataque en cualquier servidor expuesto a Internet (los bots intentarán ataques de fuerza bruta 24/7). La solución profesional es la **autenticación por llave pública**.

Esto funciona mediante un par de llaves:

1. **Llave Privada:** Se queda en tu máquina local. Es tu identidad y nunca, bajo ninguna circunstancia, debe ser compartida o subida a un repositorio.
2. **Llave Pública:** Es el "candado". Puedes distribuirla libremente a cualquier servidor al que desees acceder.

**El estándar Senior:**
Durante años, RSA fue el rey. Hoy, el estándar de la industria es **Ed25519** (basado en curvas elípticas). Es más rápido, genera llaves más cortas y criptográficamente más robustas.

```bash
# Generar un par de llaves Ed25519
$ ssh-keygen -t ed25519 -C "mi_usuario@estacion_de_trabajo"

# El sistema te pedirá una "passphrase" (contraseña). 
# ¡Un DevOps Senior NUNCA deja esto en blanco para sus llaves personales!

```

Esto generará dos archivos en tu directorio `~/.ssh/`: `id_ed25519` (tu llave privada) y `id_ed25519.pub` (tu llave pública).

### 2. Distribución de llaves: `ssh-copy-id`

Para que un servidor te deje entrar sin contraseña, necesita conocer tu llave pública. La forma manual implica copiar el texto de tu llave pública y pegarlo en el archivo `~/.ssh/authorized_keys` del servidor remoto, asegurándote de que los permisos del directorio sean `700` y los del archivo `600`.

La forma automatizada y segura es usar `ssh-copy-id`:

```bash
# Instala tu llave pública en el servidor destino
$ ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@10.0.0.50

```

Una vez ejecutado, la próxima vez que hagas `ssh admin@10.0.0.50`, el servidor te retará criptográficamente usando la llave pública, tu cliente resolverá el reto con la llave privada, y entrarás instantáneamente.

### 3. Hardening: Asegurando el castillo (`sshd_config`)

Configurar tus llaves es solo la mitad del trabajo. Ahora debes decirle al servidor que rechace cualquier otro método inseguro. Esto se hace editando el archivo de configuración del demonio SSH: `/etc/ssh/sshd_config`.

Aplica siempre esta "Trinidad del Hardening SSH" en tus servidores de producción:

```text
# 1. Prohibir el acceso directo al usuario root (Obliga a usar un usuario normal + sudo)
PermitRootLogin no

# 2. Deshabilitar por completo la entrada con contraseña (Solo llaves)
PasswordAuthentication no

# 3. Asegurar que la autenticación por llave esté activa
PubkeyAuthentication yes

```

Tras modificar el archivo, debes reiniciar el servicio para aplicar los cambios (asegúrate de no cerrar tu sesión actual antes de probar que aún puedes entrar, o podrías quedarte fuera de tu propio servidor):

```bash
sudo systemctl restart sshd

```

### 4. Túneles SSH (Port Forwarding): El superpoder del DevOps

Aquí es donde se separa a los principiantes de los veteranos. A menudo tendrás bases de datos o servicios internos (como un panel de Redis o un clúster de Kubernetes) que **no están expuestos a Internet**, sino que viven en una subred privada detrás de un servidor "Bastión" (Jump Host).

¿Cómo accedes a esa base de datos desde tu cliente SQL local? Usando **Local Port Forwarding** (`-L`).

```text
+---------------+        SSH Tunnel         +----------------+        Red Privada        +-----------------+
| Tu Laptop     | ========================> | Servidor       | ------------------------> | Base de Datos   |
| (Localhost)   |    (Puerto encriptado)    | Bastión        |    (Tráfico en claro)     | PostgreSQL      |
| Puerto: 8080  |                           | (IP Pública)   |                           | IP: 10.0.1.5    |
+---------------+                           +----------------+                           | Puerto: 5432    |
+-----------------+

```

El comando mágico:

```bash
# Sintaxis: ssh -L [Puerto_Local]:[IP_Destino_Final]:[Puerto_Destino] usuario@bastion
$ ssh -L 8080:10.0.1.5:5432 admin@bastion.midominio.com -N -f

```

* `-L 8080:10.0.1.5:5432`: Toma el puerto `8080` de tu máquina local y envíalo a través del túnel hacia el puerto `5432` de la IP `10.0.1.5` (que el bastión sí puede ver).
* `-N`: No ejecutes un comando remoto (solo abre el túnel).
* `-f`: Manda el proceso de SSH al segundo plano (background).

Ahora, puedes abrir tu cliente de base de datos local (como DBeaver o pgAdmin) y conectarte a `localhost:8080`. Todo el tráfico viajará cifrado hasta el bastión, y de ahí saltará a la base de datos privada.

Con el acceso remoto asegurado y dominando los túneles, ya puedes gestionar infraestructuras complejas a distancia de forma segura.

## 11.3 Gestión de Firewalls de host (`iptables`, `ufw`, `firewalld`)

Un error de concepto muy común en la era del Cloud es pensar: *"Ya configuré los Security Groups en AWS (o el firewall administrado de mi proveedor), no necesito configurar el firewall interno del servidor"*. Esto viola el principio de **Defensa en Profundidad** (Defense in Depth). Si un atacante logra comprometer una aplicación dentro de tu red privada, un firewall de host bien configurado evitará que haga movimientos laterales hacia otras máquinas o que extraiga datos (exfiltración).

En Linux, el filtrado de paquetes ocurre a nivel del kernel mediante un subsistema llamado **Netfilter**. Sin embargo, rara vez interactuamos con Netfilter directamente; en su lugar, usamos herramientas de espacio de usuario.

Aquí tienes un mapa mental en texto plano de cómo se relacionan estas herramientas:

```text
+----------------------------------------------------+
|               INTERFACES AMIGABLES                 |
|      (Lo que usas para configurar el día a día)    |
|                                                    |
|      [ UFW ] (Ubuntu/Debian)   [ Firewalld ] (RHEL)|
+---------|----------------------------|-------------+
          | Traducen comandos hacia    |
+---------v----------------------------v-------------+
|               EL MOTOR DE REGLAS                   |
|      (Lo que Docker y Kubernetes manipulan)        |
|                                                    |
|               [ iptables / nftables ]              |
+-------------------------|--------------------------+
                          | Reglas aplicadas a       |
+-------------------------v--------------------------+
|                  KERNEL DE LINUX                   |
|                   [ Netfilter ]                    |
+----------------------------------------------------+

```

### 1. `iptables`: El motor clásico que todo Senior debe entender

Aunque distribuciones modernas lo están reemplazando por `nftables`, la sintaxis y lógica de `iptables` sigue siendo el estándar de facto. `iptables` organiza las reglas en **Tablas** (como *filter* o *nat*) y **Cadenas** (Chains).

Las tres cadenas principales de la tabla de filtrado son:

1. **INPUT:** Tráfico que entra al servidor.
2. **OUTPUT:** Tráfico que sale del servidor.
3. **FORWARD:** Tráfico que el servidor enruta de una red a otra (crítico para contenedores y VPNs).

**Comandos esenciales de diagnóstico:**

Como DevOps, muchas veces entrarás a un servidor a entender por qué falla la red. El primer paso es ver qué reglas existen:

```bash
# Listar reglas detalladas, sin resolver DNS (-n) para que sea rápido
$ sudo iptables -L -v -n

```

**Ejemplo de manipulación manual:**
Para bloquear todo el tráfico proveniente de una IP específica (por ejemplo, si detectas un ataque de denegación de servicio en tus logs):

```bash
# -A (Append) a la cadena INPUT, -s (Source), -j (Jump a la acción DROP)
$ sudo iptables -A INPUT -s 192.168.1.50 -j DROP

```

> **La advertencia del veterano:** Las reglas de `iptables` se leen de arriba hacia abajo. Si la regla 1 permite todo el tráfico, y la regla 2 bloquea una IP, la regla 2 jamás se ejecutará. Además, `iptables` **no es persistente por defecto**; si reinicias el servidor, las reglas se borran a menos que uses paquetes como `iptables-persistent`.

### 2. `ufw` (Uncomplicated Firewall): El estándar en Debian/Ubuntu

Gestionar `iptables` a mano es tedioso y propenso a errores catastróficos (como bloquear tu propia sesión SSH). Para simplificar esto, Canonical creó `ufw`.

`ufw` abstrae la complejidad y permite definir reglas legibles para humanos.

**El flujo de trabajo estándar de inicialización:**

Antes de encender `ufw`, siempre, **siempre**, debes permitir el puerto SSH, o te quedarás fuera del servidor.

```bash
# 1. Definir las políticas por defecto (Denegar entrada, permitir salida)
$ sudo ufw default deny incoming
$ sudo ufw default allow outgoing

# 2. Permitir conexiones esenciales (Puedes usar el nombre del servicio o el puerto)
$ sudo ufw allow ssh
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp

# 3. Encender el firewall
$ sudo ufw enable

# 4. Verificar el estado
$ sudo ufw status verbose

```

**El "Caso Trampa" de DevOps: Docker vs. UFW**
Una de las peores sorpresas para un administrador es descubrir que Docker expone puertos al mundo exterior ignorando las reglas de UFW. ¿Por qué? Porque UFW es solo una interfaz de `iptables`, y Docker también inyecta reglas directamente en `iptables` (en la cadena *PREROUTING*), saltándose las restricciones de UFW. Resolver esto requiere modificar `/etc/default/ufw` o reconfigurar el daemon de Docker, un escenario clásico de *troubleshooting* avanzado.

### 3. `firewalld`: La aproximación por Zonas (RHEL/CentOS/Fedora)

Mientras que UFW se basa en reglas simples de "permitir/denegar", el ecosistema de Red Hat introdujo `firewalld`, cuyo paradigma se basa en **Zonas de Confianza**.

En lugar de aplicar reglas a puertos aleatorios, asignas interfaces de red a zonas predefinidas (ej. `public`, `internal`, `trusted`) y luego aplicas reglas a esas zonas.

**Comandos clave con `firewall-cmd`:**

```bash
# Ver qué zona está activa y qué interfaces tiene
$ sudo firewall-cmd --get-active-zones

# Permitir un servicio en la zona pública (temporal, se pierde al reiniciar)
$ sudo firewall-cmd --zone=public --add-service=https

# Hacer que el cambio sea permanente (agregando --permanent)
$ sudo firewall-cmd --zone=public --add-service=https --permanent
$ sudo firewall-cmd --zone=public --add-port=8080/tcp --permanent

# Recargar las reglas para aplicar los cambios permanentes sin tirar las conexiones activas
$ sudo firewall-cmd --reload

```

El enfoque de `firewalld` es excelente para servidores con múltiples tarjetas de red (por ejemplo, una conectada a Internet y otra a la red de bases de datos), permitiéndote tratar cada segmento con un nivel de paranoia distinto.

Con el conocimiento de criptografía, SSH y ahora la gestión de puertos y tráfico a nivel de host, el sistema está fuertemente protegido contra ataques externos.

## 11.4 Conceptos de Control de Acceso Mandatorio (SELinux, AppArmor)

Llegas a un servidor nuevo, configuras Nginx, los permisos de los archivos en `/var/www/html` están en `755`, el propietario es `www-data`, el firewall tiene el puerto 80 abierto... pero al entrar a la web, recibes un error **"403 Forbidden"**.

Buscas en internet y la respuesta más votada dice: *"Ejecuta `setenforce 0` y reinicia"*. Lo haces, la web funciona y cierras el ticket.

**Acabas de cometer el pecado capital del DevOps.** Has desactivado el Control de Acceso Mandatorio (MAC).

Hasta ahora, hemos hablado del Control de Acceso Discrecional (DAC) mediante `chmod` y `chown`. El problema del DAC es que si un atacante encuentra una vulnerabilidad en Nginx y logra escalar privilegios al usuario `root`, **el sistema es suyo**. Puede hacer lo que quiera.

Aquí es donde entra el MAC (SELinux en Red Hat, AppArmor en Debian/Ubuntu). El MAC actúa como un campo de fuerza a nivel del Kernel que dice: *"No me importa si eres root. El perfil de Nginx dice que solo puede leer `/var/www` y escribir en `/var/log`. Si Nginx intenta abrir `/etc/shadow`, lo bloqueo instantáneamente"*.

```text
+--------------------------------------------------------------------------+
|                     ¿QUIÉN TIENE LA ÚLTIMA PALABRA?                      |
+--------------------------------------------------------------------------+
|                                                                          |
|  [ USUARIO / PROCESO ] ---> [ PERMISOS DAC ] ---> [ POLÍTICAS MAC ]      |
|     (Nginx / root)         (chmod 777 / chown)    (SELinux / AppArmor)   |
|                                                                          |
|  Escenario: Nginx intenta leer /home/usuario/secreto.txt                 |
|                                                                          |
|  1. DAC evalúa: ¿Tiene permiso de lectura? -> SÍ (es root o 777).        |
|  2. MAC evalúa: ¿Está en el contexto de Nginx? -> NO.                    |
|  Resultado: ACCESO DENEGADO (A nivel de Kernel).                         |
+--------------------------------------------------------------------------+

```

### 1. SELinux (Security-Enhanced Linux)

Desarrollado originalmente por la NSA, es el estándar en RHEL, CentOS, Fedora y Rocky Linux. Funciona etiquetando *absolutamente todo* (archivos, procesos, puertos) con un **Contexto**.

**Diagnóstico rápido (El flujo de trabajo Senior):**

1. **Verificar el estado:**

```bash
$ sestatus
SELinux status:                 enabled
Current mode:                   enforcing

```

* `enforcing`: Bloquea y registra violaciones.
* `permissive`: **No bloquea**, solo registra (Ideal para debuggear sin romper producción).
* `disabled`: Apagado (Mala práctica).

1. **Ver los contextos de seguridad (El flag `-Z`):**
Casi todos los comandos clásicos aceptan `-Z` para mostrar la etiqueta de SELinux.

```bash
# Ver contexto de un archivo
$ ls -lZ /var/www/html/index.html
-rw-r--r--. root root unconfined_u:object_r:httpd_sys_content_t:s0 /var/www/html/index.html

# Ver contexto de un proceso
$ ps -eZ | grep nginx
system_u:system_r:httpd_t:s0    1234 ?        00:00:00 nginx

```

En el ejemplo anterior, el proceso Nginx (`httpd_t`) está autorizado a leer archivos etiquetados como contenido web (`httpd_sys_content_t`).

**Cómo arreglar problemas de SELinux sin apagarlo:**

Si copiaste archivos desde tu `/home` a `/var/www/html`, conservarán el contexto de tu directorio personal y Nginx no podrá leerlos. La solución no es apagar SELinux, es restaurar el contexto correcto con `restorecon`:

```bash
# Aplica recursivamente (-R) el contexto por defecto del directorio
$ sudo restorecon -R -v /var/www/html/

```

Otra herramienta vital son los **Booleanos**. A veces SELinux bloquea acciones por diseño (ej. evitar que Nginx se conecte a una base de datos externa para prevenir exfiltración). Puedes activar este permiso con un interruptor:

```bash
# Ver booleanos relacionados con httpd
$ getsebool -a | grep httpd
httpd_can_network_connect --> off

# Encender el permiso de forma persistente (-P)
$ sudo setsebool -P httpd_can_network_connect 1

```

### 2. AppArmor

AppArmor es la alternativa que encontrarás por defecto en Ubuntu y Debian. Es considerablemente más fácil de administrar que SELinux porque se basa en **rutas de archivos (paths)** en lugar de etiquetas e inodos.

AppArmor utiliza **Perfiles** cargados en el kernel para restringir las capacidades de los programas.

**Diagnóstico básico:**

```bash
# Ver el estado general y qué perfiles están activos
$ sudo aa-status

```

Al igual que SELinux, los perfiles de AppArmor pueden estar en dos modos útiles:

* **Enforce:** Bloquea la acción no permitida.
* **Complain:** Permite la acción, pero registra la violación en `/var/log/syslog` (o journalctl).

**Modificando el comportamiento (Ejemplo práctico):**

Si instalas un servicio y AppArmor lo está bloqueando por un perfil muy estricto, el flujo de trabajo correcto para depurar es pasarlo a modo "queja" (complain), ver qué intenta hacer, ajustar el perfil y volverlo a poner en "enforce".

```bash
# Pasar un perfil específico a modo queja (requiere el paquete apparmor-utils)
$ sudo aa-complain /usr/sbin/nginx

# Volver a activar la protección estricta
$ sudo aa-enforce /usr/sbin/nginx

```

> **La Regla de Oro del Senior:** Nunca asumas que un error de permisos es culpa de `chmod`. Si los permisos tradicionales están bien, el usuario es el correcto y aún hay un "Access Denied", el culpable es SELinux o AppArmor al 99%. Revisa `/var/log/audit/audit.log` o `dmesg` antes de tocar nada más.

Con esto hemos asegurado las llaves, cerrado las puertas de la red y configurado el campo de fuerza del Kernel. Estamos listos para el siguiente nivel de abstracción.
