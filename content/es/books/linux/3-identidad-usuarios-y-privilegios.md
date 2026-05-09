La seguridad en Linux no es un parche, es su cimiento. Este capítulo desglosa cómo el sistema gestiona quién eres y qué puedes tocar. Desde la creación técnica de cuentas con `useradd` hasta la sutil jerarquía de permisos estándar (UGO). Entenderás por qué `sudo` es preferible a `su` y cómo las ACLs resuelven conflictos de acceso complejos en entornos DevOps. Dominar estas herramientas es la diferencia entre un servidor vulnerable y una infraestructura profesional, permitiéndote aplicar el principio de menor privilegio de forma precisa y automatizada.

## 3.1 Gestión de usuarios y grupos (`useradd`, `usermod`, `userdel`, `groupadd`)

En el mundo de DevOps y la administración de sistemas, el concepto de "usuario" va mucho más allá de una persona física tecleando frente a una pantalla. Los usuarios y los grupos son la base del aislamiento de procesos y la seguridad del sistema. Cuando despliegas una base de datos PostgreSQL, un servidor Nginx o un agente de monitoreo, la mejor práctica de seguridad (el *Principio de Menor Privilegio*) dicta que cada uno de estos servicios debe ejecutarse bajo su propio usuario, sin acceso a los archivos de los demás.

Antes de manipular identidades, es vital entender dónde vive esta información en texto plano (la filosofía UNIX):

* `/etc/passwd`: Define a los usuarios, sus IDs (UID), su directorio personal (Home) y su Shell por defecto.
* `/etc/group`: Define los grupos y sus IDs (GID), y qué usuarios pertenecen a ellos.
* `/etc/shadow`: Almacena las contraseñas hasheadas (encriptadas) de forma segura.

A continuación, exploraremos las herramientas no interactivas estándar para gestionar estas entidades.

> **Nota para DevOps:** En algunas distribuciones (como Ubuntu/Debian) existe el comando `adduser`. Aunque es amigable e interactivo, **rara vez lo usarás en scripts de Bash, Dockerfiles o Ansible**. Como ingenieros de automatización, preferimos la familia de comandos subyacentes (`useradd`, `usermod`, `userdel`), que son estándares en casi cualquier distribución y se diseñaron para ejecutarse sin intervención humana.

---

### 1. Creación de identidades: `useradd` y `groupadd`

El comando `useradd` crea un nuevo usuario en el sistema. Si se ejecuta sin parámetros, creará el usuario basándose en configuraciones por defecto (que a menudo no crean el directorio home ni asignan la shell que deseas). Por ello, siempre lo acompañamos de banderas (*flags*).

**Crear un usuario estándar para un desarrollador:**

```bash
useradd -m -s /bin/bash jdoe

```

* `-m`: Fuerza la creación del directorio personal (`/home/jdoe`).
* `-s /bin/bash`: Define la shell por defecto para cuando el usuario inicie sesión.

**Crear un grupo:**
Los grupos agrupan usuarios para otorgarles permisos colectivos.

```bash
groupadd developers

```

**Crear un usuario de sistema (El estándar DevOps):**
Cuando instalas un servicio (por ejemplo, Prometheus), necesitas un usuario que no pueda iniciar sesión interactiva y que no necesite un directorio home lleno de archivos de configuración de usuario.

```bash
useradd -r -s /sbin/nologin prometheus

```

* `-r`: Crea un **usuario de sistema**. Le asignará un UID bajo (típicamente menor a 1000) y no creará el directorio home por defecto.
* `-s /sbin/nologin` (o `/bin/false`): Una medida de seguridad crítica. Impide que alguien (o un atacante) inicie una sesión de terminal usando esta cuenta.

---

### 2. Modificación de identidades: `usermod`

El comando `usermod` modifica las propiedades de una cuenta existente. Es, con diferencia, el comando que más utilizarás en tu día a día, especialmente para gestionar la pertenencia a grupos.

**El mapa conceptual de grupos en Linux:**

```text
+----------------+      Pertenencia principal     +-------------------+
|  Usuario (UID) | -----------------------------> | Grupo Primario    |
+----------------+                                | (Mismo nombre)    |
        |                                         +-------------------+
        |               Pertenencia secundaria
        +---------------------------------------> +-------------------+
                                                  | Grupos Anexos     |
                                                  | (docker, wheel,   |
                                                  |  developers)      |
                                                  +-------------------+

```

**El peligro del flag `-G` (La trampa del novato):**
Imagina que `jdoe` pertenece al grupo `developers`. Ahora necesitas que también pueda ejecutar contenedores, por lo que debes añadirlo al grupo `docker`.

❌ **INCORRECTO:**

```bash
usermod -G docker jdoe

```

*Advertencia:* El flag `-G` (sin la 'a') **reemplaza** la lista de grupos secundarios. El comando anterior sacaría a `jdoe` de `developers` y lo dejaría solo en `docker`.

✅ **CORRECTO (Añadir/Append):**

```bash
usermod -aG docker jdoe

```

El flag `-a` (*append*) le dice al sistema que añada el grupo `docker` a la lista existente de grupos secundarios del usuario.

**Otras modificaciones útiles con `usermod`:**

| Comando | Acción | Caso de uso DevOps |
| --- | --- | --- |
| `usermod -L jdoe` | Bloquea (Lock) la cuenta de usuario. | Revocar temporalmente el acceso de un empleado sin borrar sus datos. |
| `usermod -U jdoe` | Desbloquea (Unlock) la cuenta. | Restaurar el acceso. |
| `usermod -d /new/home -m jdoe` | Cambia y mueve el directorio home. | Migraciones de almacenamiento de datos de usuarios. |

---

### 3. Destrucción de identidades: `userdel`

Cuando un usuario ya no es necesario, debe ser eliminado por motivos de higiene y seguridad.

**Eliminar un usuario (manteniendo sus archivos):**

```bash
userdel jdoe

```

Esto elimina el usuario del sistema, pero deja intacto `/home/jdoe`. Esto es útil si necesitas auditar o respaldar el código del desarrollador que acaba de abandonar la empresa.

**Eliminar un usuario y borrar todo su rastro:**

```bash
userdel -r jdoe

```

El flag `-r` (*remove*) elimina la cuenta, borra el directorio personal (`/home/jdoe`) y también elimina la cola de correos local del usuario (`/var/mail/jdoe`).

## 3.2 El modelo de permisos estándar de UNIX (`chmod`, `chown`, `chgrp`)

En la sección anterior aprendimos a crear entidades (usuarios y grupos), pero en aislamiento no sirven de mucho. La verdadera magia de Linux y la base de su seguridad reside en cómo estas entidades interactúan con el sistema de archivos. En UNIX, *todo es un archivo*, y cada archivo tiene un dueño, un grupo asociado y un candado de tres combinaciones: lectura, escritura y ejecución.

Para un ingeniero DevOps, dominar este modelo no es opcional. Un permiso mal configurado puede significar que tu servidor web devuelva un error `403 Forbidden`, que una clave SSH sea rechazada por ser "demasiado pública", o en el peor de los casos, dejar una brecha de seguridad crítica en el sistema.

---

### 1. Anatomía de los permisos (El candado de tres piezas)

Cuando ejecutas `ls -l` en la terminal, te encuentras con una cadena de caracteres al principio de cada línea. Esta cadena es el ADN de la seguridad de ese archivo.

**Desglose visual de los permisos:**

```text
- rwx rw- r--  1 jdoe developers  4096 Oct 24 10:00 script.sh
^ ^^^ ^^^ ^^^    ^^^^ ^^^^^^^^^^
|  |   |   |      |       |
|  |   |   |      |       +--- Grupo propietario (developers)
|  |   |   |      +----------- Usuario propietario (jdoe)
|  |   |   +------------------ Permisos para "Otros" (Cualquier otro usuario)
|  |   +---------------------- Permisos para el "Grupo" (Miembros de 'developers')
|  +-------------------------- Permisos para el "Dueño" (El usuario 'jdoe')
+----------------------------- Tipo (-: archivo, d: directorio, l: enlace simbólico)

```

El significado de `r` (Read), `w` (Write) y `x` (Execute) cambia sutilmente dependiendo de si se aplican a un archivo o a un directorio:

| Permiso | En un Archivo | En un Directorio |
| --- | --- | --- |
| **`r` (Lectura)** | Permite ver el contenido del archivo (`cat`, `less`). | Permite listar los archivos dentro del directorio (`ls`). |
| **`w` (Escritura)** | Permite modificar o vaciar el archivo. | Permite crear, renombrar o borrar archivos *dentro* del directorio. |
| **`x` (Ejecución)** | Permite ejecutar el archivo como un programa o script. | Permite "entrar" al directorio (`cd`) y acceder a sus archivos. |

> **Nota para DevOps:** El permiso de ejecución (`x`) en un directorio es vital. Si un usuario web (ej. `www-data`) tiene permisos de lectura (`r`) en una carpeta, pero no de ejecución (`x`), no podrá acceder a los archivos web que están dentro. El sistema le bloqueará el paso.

---

### 2. Cambiando de manos: `chown` y `chgrp`

Cuando creas un archivo, tú eres el dueño y tu grupo principal es el grupo del archivo. En entornos de servidores, frecuentemente necesitamos transferir esa propiedad a los servicios que consumen esos datos.

**Cambiar el dueño y el grupo simultáneamente (La forma DevOps):**
Aunque existe `chgrp` para cambiar solo el grupo, en la práctica utilizamos `chown` para hacer ambas cosas a la vez separando el usuario y el grupo con dos puntos (`:`).

```bash
# Formato: chown usuario:grupo archivo
chown nginx:nginx /var/www/html/index.html

```

**Cambio recursivo (`-R`):**
Si estás desplegando una aplicación completa, necesitarás cambiar la propiedad de toda una estructura de directorios.

```bash
chown -R postgres:postgres /var/lib/postgresql/data

```

*Advertencia de Senior:* Usa `-R` con extremo cuidado. Ejecutar `chown -R` en el directorio equivocado (como `/etc` o `/`) puede destruir tu sistema operativo instantáneamente, requiriendo una reinstalación.

---

### 3. Modificando los candados: `chmod`

Existen dos formas de cambiar los permisos de un archivo: el modo simbólico (amigable para humanos) y el modo octal (amigable para la automatización).

**A. El Modo Simbólico (Relativo)**
Utiliza letras para referirse a a quién le cambias el permiso (`u` dueño, `g` grupo, `o` otros, `a` todos) y operadores lógicos (`+` añadir, `-` quitar, `=` establecer exactamente).

```bash
# Hacer que un script sea ejecutable para el dueño
chmod u+x deploy.sh

# Quitar el permiso de escritura a "otros"
chmod o-w config.yml

# Dar permisos de lectura y ejecución a todos
chmod a+rx script.py

```

**B. El Modo Octal (Absoluto y Estándar DevOps)**
En la automatización (Ansible, Terraform, Dockerfiles), no usamos el modo simbólico. Usamos números octales porque definen el estado *exacto y absoluto* de los permisos en una sola pasada, sin importar el estado previo.

Cada permiso tiene un valor numérico:

* **Lectura (`r`)** = 4
* **Escritura (`w`)** = 2
* **Ejecución (`x`)** = 1

Para obtener el permiso de un bloque (Dueño, Grupo u Otros), simplemente sumas los números.

* `rwx` = 4 + 2 + 1 = **7**
* `rw-` = 4 + 2 + 0 = **6**
* `r--` = 4 + 0 + 0 = **4**
* `---` = 0 + 0 + 0 = **0**

**Los "Grandes Éxitos" del `chmod` en DevOps:**

| Comando Octal | Resultado | Caso de uso clásico en Servidores |
| --- | --- | --- |
| `chmod 644 file` | `-rw-r--r--` | **Archivos estándar**. El dueño edita, el resto solo lee. Típico para código fuente y configuraciones (`nginx.conf`). |
| `chmod 755 dir` | `drwxr-xr-x` | **Directorios estándar y scripts**. El dueño hace de todo, el resto puede entrar y leer. |
| `chmod 600 key` | `-rw-------` | **Privacidad máxima**. Solo el dueño puede leer/escribir. **Obligatorio para claves privadas SSH** (`id_rsa`). |
| `chmod 700 dir` | `drwx------` | **Directorios privados**. Nadie más puede entrar (ej. la carpeta `~/.ssh`). |
| `chmod 777 file` | `-rwxrwxrwx` | ❌ **Antipatrón de seguridad.** Si usas esto para "solucionar un problema de permisos", estás abriendo una brecha. ¡Nunca lo uses en producción! |

## 3.3 Escalado de privilegios de forma segura (`su`, `sudo`, `visudo`)

Si el modelo de permisos y la propiedad de archivos (que vimos en la sección anterior) son las cerraduras del sistema, el usuario `root` es la llave maestra. El usuario `root` (UID 0) ignora por completo los permisos; puede leer, modificar o destruir cualquier archivo del sistema.

En los primeros días de la administración de sistemas, era común iniciar sesión directamente como `root`. Hoy en día, en la cultura DevOps y de Seguridad (SecOps), **iniciar sesión como `root` directamente se considera una negligencia grave**. Si un equipo de cinco ingenieros comparte la contraseña de `root` y un servidor se cae por un comando mal ejecutado, es imposible auditar quién fue el responsable.

Aquí es donde entra el "escalado de privilegios": la capacidad de entrar al sistema como un usuario normal (sin privilegios) y elevar tus permisos temporalmente solo cuando es estrictamente necesario.

---

### 1. El método clásico (y problemático): `su` (Substitute User)

El comando `su` te permite cambiar a la sesión de otro usuario durante tu sesión actual. Si no especificas un usuario, asume que quieres ser `root`.

**El error de entorno (`su` vs `su -`):**
Esta es una clásica pregunta de entrevista para administradores de sistemas.

* **`su` (Incorrecto la mayoría de las veces):** Cambias al usuario `root`, pero mantienes las variables de entorno (como tu `$PATH` y tu directorio actual) de tu usuario original. Esto puede causar comportamientos inesperados al ejecutar scripts administrativos.
* **`su -` o `su -l` (Correcto):** El guion le dice al sistema que simule un inicio de sesión completo (*login shell*). Te mueve al directorio `/root` y carga el entorno exacto del superusuario.

**El problema de `su` para los equipos:**
Para usar `su -`, **necesitas conocer la contraseña del usuario de destino**. Si quieres ser `root`, necesitas la contraseña de `root`. Esto nos devuelve al problema de compartir credenciales, lo cual es inaceptable en auditorías de seguridad (como SOC2 o ISO 27001).

```text
Flujo de su:
[Usuario: jdoe] ---> Ejecuta `su -` ---> [Ingresa contraseña de ROOT] ---> Acceso

```

---

### 2. El estándar moderno de la industria: `sudo` (Superuser DO)

`sudo` fue diseñado para resolver los problemas de `su`. En lugar de requerir la contraseña del superusuario, `sudo` **te pide tu propia contraseña** para confirmar tu identidad, y luego verifica en un archivo de configuración si tienes permiso para ejecutar el comando solicitado.

**Beneficios clave en DevOps:**

1. **Auditoría (Trazabilidad):** Cada vez que alguien usa `sudo`, el comando exacto, el usuario y la hora quedan registrados (usualmente en `/var/log/auth.log` o `/var/log/secure`).
2. **Granularidad:** Puedes darle permiso a un desarrollador para reiniciar *solo* el servicio de Nginx, sin darle acceso a toda la máquina.
3. **Revocación inmediata:** Si un ingeniero deja la empresa, simplemente bloqueas o eliminas su cuenta (`jdoe`), y automáticamente pierde sus privilegios. No hay que cambiar la contraseña de `root` en 500 servidores.

**Uso común:**

```bash
# Ejecutar un solo comando como root
sudo cat /etc/shadow

# Abrir una shell interactiva como root (El equivalente moderno a "su -")
sudo -i

```

```text
Flujo de sudo:
[Usuario: jdoe] ---> Ejecuta `sudo cat` ---> [Ingresa contraseña de JDOE] ---> Verifica Reglas ---> Ejecuta

```

---

### 3. El cerebro de las reglas: El archivo `sudoers` y `visudo`

¿Cómo sabe `sudo` quién puede hacer qué? Toda esa lógica vive en el archivo `/etc/sudoers` (y en los archivos dentro del directorio `/etc/sudoers.d/`).

> **Regla de Oro (Nivel Senior):** NUNCA edites el archivo `/etc/sudoers` directamente usando `vim /etc/sudoers` o `nano`. Nunca.

Si cometes un solo error de sintaxis (una coma mal puesta o un error de tipeo) y guardas el archivo, **el comando `sudo` dejará de funcionar para todo el mundo**. Te habrás quedado fuera (lockout) de tu propio servidor sin forma de recuperar privilegios para arreglarlo.

Para evitar esto, **siempre debes usar el comando `visudo`**.

`visudo` abre el archivo en tu editor de texto por defecto, pero cuando intentas guardar y salir, primero analiza el archivo en busca de errores de sintaxis. Si encuentra un error, rechaza los cambios y te avisa, salvándote de destruir el acceso al servidor.

**Anatomía de una regla en sudoers:**

El formato puede parecer intimidante al principio, pero sigue una estructura lógica:

```text
[Quién]    [Dónde] = ([Como quién]) [Opciones]: [Qué comandos]

```

**Ejemplos prácticos para DevOps:**

**1. Acceso total (El grupo wheel o sudo):**
Normalmente, no asignas permisos de administrador usuario por usuario. Creas un grupo (como `%sudo` en Ubuntu o `%wheel` en CentOS/RHEL) y metes a los ingenieros ahí.

```text
%wheel    ALL=(ALL:ALL) ALL

```

*(Cualquiera en el grupo wheel, en todos los hosts, puede correr como cualquier usuario/grupo, todos los comandos).*

**2. Delegación sin contraseña (Automatización):**
En DevOps, a menudo tenemos herramientas (como Jenkins, Ansible o un script de CI/CD) que necesitan ejecutar comandos con privilegios, pero no hay un humano para tipear una contraseña.

```text
jenkins   ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp.service

```

*(El usuario jenkins puede ejecutar exactamente ese comando como root, y NO se le pedirá contraseña).*

**3. Acceso restringido para un desarrollador:**
Imagina que el desarrollador `jdoe` necesita ver los logs en vivo de un contenedor web, pero no quieres que haga nada más.

```text
jdoe      ALL=(root) /usr/bin/docker logs -f web_container

```

## 3.4 Listas de Control de Acceso (ACLs) para permisos granulares (`getfacl`, `setfacl`)

En la sección 3.2 vimos que el modelo estándar de UNIX (Dueño, Grupo, Otros) es elegante y robusto. Sin embargo, en entornos empresariales complejos, este candado de tres piezas tiene una limitación matemática severa: un archivo solo puede tener **un** dueño y **un** grupo propietario.

**El problema clásico de DevOps:** Imagina un archivo de configuración crítico `/etc/app/config.yml` que pertenece al usuario `appuser` y al grupo `appgroup`.

* Necesitas que el desarrollador `alice` tenga permisos de lectura y escritura.
* Necesitas que el auditor `bob` tenga solo permisos de lectura.
* Necesitas que el grupo de monitoreo `zabbix` tenga solo permisos de lectura.

Intentar resolver esto creando nuevos grupos cruzados para cada combinación posible convertirá tu sistema en un infierno administrativo. Aquí es donde entran al rescate las **ACLs (Access Control Lists)**, permitiéndote "pegar" permisos adicionales y específicos directamente a usuarios o grupos individuales, sin alterar la propiedad original del archivo.

---

### 1. El síntoma: El símbolo `+` oculto

Antes de aprender a crear ACLs, debes saber cómo detectarlas. Cuando un archivo tiene permisos granulares configurados, el comando clásico `ls -l` te avisa sutilmente agregando un signo más (`+`) al final de la cadena de permisos.

```bash
# Un archivo normal
-rw-r--r--  1 appuser appgroup  1024 Oct 24 config.yml

# Un archivo con ACLs activas
-rw-rwxr--+ 1 appuser appgroup  1024 Oct 24 config.yml
          ^
          |__ ¡Atención! Hay permisos ocultos aquí.

```

> **Nota para DevOps:** Si alguna vez un usuario tiene acceso a un archivo que, según `ls -l`, no debería tener, o viceversa, busca el `+`. Es la principal causa de dolores de cabeza en auditorías de permisos.

---

### 2. Revelando la verdad: `getfacl`

Para ver exactamente quién tiene acceso mediante ACLs, usamos el comando `getfacl` (Get File Access Control Lists).

```bash
getfacl config.yml

```

**Salida típica:**

```text
# file: config.yml
# owner: appuser
# group: appgroup
user::rw-
user:alice:rw-         <-- Regla ACL específica para Alice
user:bob:r--           <-- Regla ACL específica para Bob
group::r--
group:zabbix:r--       <-- Regla ACL específica para el grupo Zabbix
mask::rw-              <-- Límite máximo de permisos para las ACLs
other::r--

```

---

### 3. Inyectando permisos: `setfacl`

El comando `setfacl` te permite modificar estas listas. La bandera principal que usarás es `-m` (*modify*), seguida de una regla con el formato `tipo:nombre:permisos`.

* `u` = user (usuario)
* `g` = group (grupo)

**Ejemplos prácticos:**

| Objetivo | Comando |
| --- | --- |
| Dar a `alice` permisos de lectura/escritura | `setfacl -m u:alice:rw config.yml` |
| Dar al grupo `zabbix` permiso de lectura | `setfacl -m g:zabbix:r config.yml` |
| Quitar (remover) la regla de `bob` | `setfacl -x u:bob config.yml` |
| Borrar **todas** las ACLs del archivo | `setfacl -b config.yml` |

---

### 4. ACLs por defecto (El superpoder para directorios)

Este es el caso de uso más valioso para un Senior DevOps. A menudo tenemos un directorio compartido (por ejemplo, `/var/www/html` para despliegues web). Queremos que cualquier desarrollador pueda crear archivos allí, pero **necesitamos garantizar que el servidor web (`nginx`) siempre tenga permisos de lectura sobre los archivos nuevos**, sin importar quién los haya creado.

Las ACLs por defecto (`-d` o `--default`) se aplican a un directorio y obligan a que todo archivo o subdirectorio creado en su interior herede automáticamente esas reglas.

```bash
# 1. Aseguramos que el usuario nginx siempre pueda leer y ejecutar (entrar) por defecto
setfacl -d -m u:nginx:rx /var/www/html/

# 2. (Opcional) Aplicar la misma regla a los archivos que YA existen
setfacl -R -m u:nginx:rx /var/www/html/

```

**Regla de Arquitectura Senior:**
Las ACLs son increíblemente potentes, pero añaden "carga cognitiva" e invisibilidad al sistema. Úsalas solo cuando el modelo estándar (UGO) y la pertenencia a grupos no puedan resolver el problema de forma limpia. La simplicidad siempre es más segura que la complejidad.

Con esto concluimos la **Parte I: Los Cimientos del Sistema**. Ya dominas la navegación, los archivos, los usuarios y la seguridad base.
