Dominar Linux para DevOps no consiste en memorizar comandos aislados, sino en entender cómo conectarlos. En la filosofía UNIX, cada herramienta debe hacer una sola cosa y hacerla bien; la magia surge al unirlas. Este capítulo explora los canales de comunicación del sistema: **stdin**, **stdout** y **stderr**.

Aprenderás a redirigir flujos hacia archivos, descartar errores en "agujeros negros" como `/dev/null` y construir potentes cadenas de montaje de datos mediante **tuberías**. Estas capacidades son el tejido conectivo de la automatización, permitiéndote transformar salidas crudas en información valiosa sin intervención manual.

## 7.1 Entradas, salidas y errores estándar (stdin, stdout, stderr)

En la filosofía de UNIX y Linux, existe un mantra fundamental: **"Todo es un archivo"**. Esto no solo aplica a los documentos en tu disco duro, sino también a los teclados, las pantallas y, lo más importante para la automatización, a los canales de comunicación de los procesos.

Cuando inicias un proceso en Linux (ya sea ejecutando un simple `ls` o levantando un servidor web), el sistema operativo le asigna automáticamente tres canales de comunicación predeterminados. A estos canales se les conoce como **Flujos Estándar** (Standard Streams) y se identifican mediante un número entero llamado **Descriptor de Archivo** (File Descriptor o FD).

Para entender cómo fluye la información en la terminal, imagina un proceso como una fábrica de procesamiento de datos:

```text
                           +-------------------+
    Entrada Estándar       |                   |      Salida Estándar
    (stdin - FD 0)         |   Proceso Linux   |      (stdout - FD 1)
  -----------------------> |   (Ej. Comando)   | ----------------------->
    Por defecto: Teclado   |                   |      Por defecto: Pantalla
                           +-------------------+
                                     |
                                     | Error Estándar
                                     | (stderr - FD 2)
                                     v
                           Por defecto: Pantalla

```

Analicemos cada uno de estos tres pilares de la comunicación en Linux:

**1. Standard Input (stdin) - Descriptor de Archivo 0**
Es el canal por el cual un proceso recibe la información o los datos que necesita para trabajar.

* **Comportamiento por defecto:** El teclado de la terminal interactiva.
* **Ejemplo conceptual:** Cuando ejecutas el comando `cat` sin ningún argumento, el proceso se queda "escuchando" el teclado. Todo lo que escribas entrará por el *stdin* del proceso.

**2. Standard Output (stdout) - Descriptor de Archivo 1**
Es el canal principal por donde el proceso envía el resultado exitoso de su ejecución.

* **Comportamiento por defecto:** La pantalla de la terminal.
* **Ejemplo conceptual:** Cuando ejecutas `pwd`, la ruta del directorio actual que ves impresa en tu pantalla ha sido enviada a través del *stdout*.

**3. Standard Error (stderr) - Descriptor de Archivo 2**
Es un canal exclusivo y separado que los procesos utilizan únicamente para enviar mensajes de error, diagnósticos o advertencias.

* **Comportamiento por defecto:** La pantalla de la terminal (al igual que stdout).
* **Ejemplo conceptual:** Si intentas leer un archivo que no existe con `cat archivo_falso.txt`, el mensaje "No existe el archivo o el directorio" se emite a través del *stderr*, no del *stdout*.

### La perspectiva DevOps: ¿Por qué separar la salida del error?

Si tanto *stdout* como *stderr* imprimen su texto en la misma pantalla por defecto, podrías preguntarte: *¿Para qué tener dos canales separados si el resultado visual es el mismo?*

La respuesta es la **automatización y el registro de eventos (logging)**.

Imagina que tienes un script en Bash que procesa miles de archivos y envía el resultado a una base de datos. Si un archivo está corrupto, el comando fallará. Si Linux mezclara los resultados exitosos y los errores en un solo canal de salida, tu base de datos terminaría ingiriendo mensajes de error ("Permission denied") como si fueran datos válidos.

Al tener *stdout* y *stderr* separados, el sistema te permite (como veremos en la siguiente sección) tomar el flujo de datos limpios (*stdout*) para enviarlos a otra herramienta, y tomar los errores (*stderr*) para enviarlos silenciosamente a un archivo de log (`/var/log/errores_script.log`) sin interrumpir la tubería principal de datos.

### Las entrañas del sistema: Viendo los descriptores en vivo

Si quieres comprobar que estos flujos son tratados como archivos reales por el sistema, puedes inspeccionar el directorio de dispositivos virtuales `/dev/`. Linux crea enlaces simbólicos dinámicos para el proceso actual:

```bash
ls -l /dev/std*

```

Verás que apuntan al pseudo-sistema de archivos `/proc` asociado a tu sesión de terminal:

* `/dev/stdin` apunta a `/proc/self/fd/0`
* `/dev/stdout` apunta a `/proc/self/fd/1`
* `/dev/stderr` apunta a `/proc/self/fd/2`

Comprender que el "0, 1 y 2" representan las puertas de entrada y salida de todo programa es el primer paso para dominar la magia negra de la terminal. En la siguiente sección, aprenderemos a desconectar estos cables de la pantalla y el teclado para enrutarlos hacia archivos mediante los operadores de redirección.

## 7.2 Redirección de flujos (`>`, `>>`, `<`, `2>&1`)

En la sección anterior vimos que todo proceso nace con tres canales de comunicación conectados por defecto a tu terminal: *stdin* (0), *stdout* (1) y *stderr* (2). La verdadera potencia de la línea de comandos de Linux despierta cuando aprendemos a desconectar esos canales de la pantalla o el teclado, y los conectamos a archivos. A esto lo llamamos **redirección**.

Los operadores de redirección son las "tuberías físicas" que alteran el destino u origen de los flujos estándar.

### 1. Controlando el destino: Redirección de Salida (`>` y `>>`)

La redirección de salida es el pan de cada día en DevOps. Se utiliza para capturar el resultado exitoso de un comando (*stdout*, FD 1) y guardarlo en un archivo en lugar de imprimirlo en la pantalla.

* **El operador `>` (Sobrescribir):** Crea un archivo nuevo con la salida del comando. **Cuidado:** Si el archivo ya existe, su contenido anterior será borrado y reemplazado por completo (truncado).

```bash
# Guarda la lista de procesos actuales en un archivo nuevo
ps aux > procesos_actuales.txt

```

* **El operador `>>` (Añadir / Append):** Funciona igual que el anterior, pero si el archivo ya existe, añade la nueva salida al final del archivo sin borrar el contenido previo. Es fundamental para crear y mantener logs.

```bash
# Añade una nueva línea de registro al final del log
echo "Servicio reiniciado a las $(date)" >> /var/log/miservicio.log

```

### 2. Alimentando procesos: Redirección de Entrada (`<`)

Así como enviamos datos hacia afuera, podemos inyectar datos hacia adentro. El operador `<` toma el contenido de un archivo y lo envía directamente a la entrada estándar (*stdin*, FD 0) de un comando, sustituyendo al teclado.

```bash
# El comando 'wc -l' (word count, lines) cuenta las líneas de lo que recibe
wc -l < /etc/passwd

```

*Nota:* Aunque muchos comandos (como `cat` o `wc`) pueden recibir el nombre del archivo directamente como argumento (`wc -l /etc/passwd`), usar `<` es útil cuando un comando o script está diseñado estrictamente para leer desde su entrada estándar.

### 3. Domando el caos: Redirección del Error (`2>` y `2>>`)

Como vimos, el *stderr* viaja por el descriptor de archivo 2. Para redirigir específicamente los errores, debemos anteponer el número `2` al operador de redirección.

Imagina que buscas un archivo de configuración en todo el disco duro como un usuario sin privilegios. Recibirás cientos de mensajes de "Permiso denegado". Podemos limpiar nuestra pantalla enviando esos errores a un archivo de registro:

```bash
# La salida exitosa se verá en pantalla, pero los errores irán al log
find / -name "nginx.conf" 2> errores_busqueda.log

```

Al igual que con la salida estándar, puedes usar `2>>` si deseas ir acumulando los errores sin sobrescribir el archivo de logs.

### 4. La combinación maestra: Unificando flujos (`2>&1` y `&>`)

En la automatización de tareas (como en un script ejecutado por *cron*), a menudo necesitamos guardar **absolutamente todo** lo que produjo un comando, tanto sus aciertos como sus fallos, en un mismo archivo de log.

Para lograr esto de forma segura, usamos una sintaxis que a primera vista parece críptica: `2>&1`.

```bash
# Ejecuta un script, guarda la salida en backup.log y une el error a la salida
/opt/scripts/backup.sh > /var/log/backup.log 2>&1

```

**¿Cómo se lee esto?**

1. `> /var/log/backup.log`: Primero, redirige la salida estándar (FD 1) al archivo.
2. `2>&1`: Luego, dile al Error Estándar (FD 2) que se redirija (*>*) a la misma dirección de memoria (*&*) a la que está apuntando actualmente el FD 1. Como el FD 1 ya apunta al archivo, ambos flujos terminan escribiendo en el mismo lugar de forma sincronizada.

*Nota moderna:* En versiones recientes de Bash y Zsh, existe un atajo para hacer exactamente lo mismo (redirigir 1 y 2 al mismo archivo) de forma más limpia usando el operador `&>`:

```bash
/opt/scripts/backup.sh &> /var/log/backup.log

```

### 5. El Agujero Negro: `/dev/null`

Todo administrador de sistemas conoce el archivo especial `/dev/null`. Es un dispositivo virtual que actúa como un agujero negro: cualquier dato que le envíes desaparecerá para siempre y sin dejar rastro.

Es extremadamente útil cuando quieres ejecutar un comando en silencio, descartando su salida, sus errores, o ambos:

```bash
# Ejecuta el script de limpieza de forma completamente silenciosa
/opt/scripts/limpieza.sh > /dev/null 2>&1

```

Con esto, ya tenemos dominada la manipulación de flujos hacia y desde los archivos estáticos. Pero en el mundo DevOps real rara vez guardamos datos en disco si podemos procesarlos al vuelo. La sección 7.3 te introducirá a las tuberías o "Pipes" (`|`), la herramienta que nos permite conectar la salida de un proceso directamente a la entrada de otro, creando cadenas de montaje de datos imparables.

## 7.3 Conectando comandos con tuberías (`|`)

Hasta ahora hemos aprendido a enviar el resultado de un comando a un archivo en el disco usando la redirección (`>`). Sin embargo, en el día a día de un ingeniero DevOps, crear archivos temporales para cada paso del procesamiento de datos es ineficiente, lento y ensucia el sistema.

¿Qué pasaría si pudieras tomar la salida de un programa y conectarla directamente a la entrada de otro, en tiempo real y en la memoria RAM, sin tocar el disco duro? Aquí es donde entra la herramienta más elegante y poderosa de la terminal de Linux: **la tubería o *pipe* (`|`).**

El símbolo `|` (generalmente ubicado al lado del número 1 o la tecla Tab en la mayoría de los teclados, o con `Alt Gr + 1`) actúa como un acople directo entre dos procesos.

Técnicamente hablando, la tubería toma la Salida Estándar (*stdout*, FD 1) del comando de la izquierda y la inyecta directamente como la Entrada Estándar (*stdin*, FD 0) del comando de la derecha.

```text
                           EL CONCEPTO DEL PIPE (|)

+---------------+                                         +---------------+
|               |       (stdout)           (stdin)        |               |
|   Comando A   | ===================|==================> |   Comando B   |
|               |     Flujo de datos en la memoria        |               |
+---------------+                                         +---------------+

```

### 1. Casos de uso básicos y cotidianos

El uso más clásico del *pipe* es controlar salidas de texto que son demasiado largas para caber en una sola pantalla.

Imagina que listas el contenido del directorio `/etc`, que contiene cientos de archivos. Si ejecutas `ls -la /etc`, el texto pasará volando por tu pantalla. En su lugar, puedes "entubar" esa salida hacia el comando `less` (un paginador de texto):

```bash
ls -la /etc | less

```

Ahora puedes navegar por la lista de archivos usando las flechas del teclado, presionar la barra espaciadora para avanzar de página, y la tecla `q` para salir.

Otro clásico indiscutible es la búsqueda de procesos en ejecución. Si quieres saber si tu servidor web Nginx está corriendo, combinas `ps` (que lista los procesos) con `grep` (que filtra texto):

```bash
ps aux | grep nginx

```

En este caso, `ps aux` no imprime nada en tu pantalla; le pasa su inmensa lista de procesos a `grep`. Luego, `grep` lee esa lista interna, busca la palabra "nginx" y, finalmente, imprime en *su* salida estándar las líneas que coinciden.

### 2. Encadenamiento múltiple: La cadena de montaje de datos

La verdadera magia de las tuberías es que no estás limitado a dos comandos. Puedes encadenar tantos *pipes* como tu memoria RAM permita. Esto transforma a Linux en una línea de ensamblaje de procesamiento de datos.

Supongamos que quieres saber **cuántos** errores de autenticación han ocurrido en tu servidor hoy. Podrías construir esta cadena:

```bash
cat /var/log/auth.log | grep "Failed password" | wc -l

```

**Anatomía de esta cadena de montaje:**

1. `cat` lee el archivo de log completo y lo escupe hacia el primer *pipe*.
2. `grep` recibe todo el log, filtra solo las líneas que contienen "Failed password", y escupe esas líneas hacia el segundo *pipe*.
3. `wc -l` (Word Count, lines) recibe únicamente las líneas filtradas, las cuenta, y finalmente imprime un solo número en la pantalla (ej. `42`).

*Nota del autor:* Aunque el ejemplo anterior es muy ilustrativo para entender el encadenamiento, es técnicamente un uso redundante de `cat` (conocido coloquialmente como *Useless Use of Cat* o UUOC). `grep` puede leer archivos directamente, por lo que el comando óptimo y más profesional sería: `grep "Failed password" /var/log/auth.log | wc -l`.

### 3. El comportamiento del Error Estándar (*stderr*) en las tuberías

Es crucial entender una regla de oro de los *pipes*: **Por defecto, el operador `|` SOLO transporta la Salida Estándar (*stdout*).**

Si el "Comando A" genera un error (por ejemplo, intentas leer un directorio sin permisos), ese error viajará por el *stderr* (FD 2). Como la tubería solo está conectada al FD 1, el mensaje de error "saltará" la tubería y se imprimirá en tu pantalla de todas formas, arruinando posiblemente la limpieza de tu script.

Si necesitas que un comando posterior procese tanto los aciertos como los errores del primer comando, debes unificar los flujos antes de pasarlos por el tubo. Para ello usamos la técnica aprendida en la sección anterior (`2>&1`):

```bash
# Busca un archivo, unifica errores con salida estándar, y cuenta el total de líneas
find / -name "config.yml" 2>&1 | wc -l

```

**El atajo moderno (`|&`)**
En versiones de Bash 4.0 o superior (y en Zsh), existe un operador específico llamado `|&` que realiza exactamente esta misma función (entubar *stdout* y *stderr* simultáneamente) de forma mucho más legible:

```bash
find / -name "config.yml" |& wc -l

```

## 7.4 El comando `tee` y la manipulación segura de flujos

A lo largo de este capítulo hemos visto cómo las redirecciones (`>`) envían datos a un archivo y las tuberías (`|`) envían datos a otro proceso. Pero en la práctica diaria de DevOps, a menudo nos topamos con un dilema: **necesitamos ver la salida de un comando en la pantalla en tiempo real para supervisarlo, pero también necesitamos guardar esa misma salida en un archivo de log.**

Si usas `comando > archivo.log`, la pantalla se queda en blanco (pierdes la visibilidad). Si usas `comando | less`, lo ves en pantalla pero no se guarda nada en el disco.

Para solucionar este enigma de bifurcación, los creadores de UNIX se inspiraron en la fontanería del mundo real y crearon el comando `tee` (llamado así por las conexiones de tuberías en forma de "T").

### 1. ¿Cómo funciona `tee`?

El comando `tee` hace exactamente una cosa: lee de su Entrada Estándar (*stdin*) y escribe simultáneamente esa misma información en su Salida Estándar (*stdout*) **y** en uno o más archivos.

```text
                           EL CONCEPTO DE TEE

                            +-----------------+
                            |                 | ===> (stdout) Pantalla o siguiente Pipe
 (stdin) Flujo de datos ===>|   Comando tee   | 
                            |                 | ===> Archivo en disco (Ej. log.txt)
                            +-----------------+

```

La sintaxis básica es colocar `tee` justo después de una tubería:

```bash
# Hacemos ping a un servidor, vemos el resultado en vivo y lo guardamos en un log
ping 8.8.8.8 | tee ping_google.log

```

Al ejecutar esto, verás las respuestas del ping desfilando por tu terminal, pero si cancelas el comando y revisas el archivo `ping_google.log`, verás que todo ha quedado perfectamente registrado.

### 2. Añadiendo contenido sin sobrescribir (`tee -a`)

Por defecto, `tee` se comporta como el operador `>` (sobrescribe el archivo destino). En la automatización, normalmente queremos acumular registros a lo largo del tiempo. Para emular el comportamiento del operador de adición (`>>`), utilizamos la bandera `-a` (*append*):

```bash
# Instalamos un paquete y adjuntamos el registro al final del archivo existente
apt-get install nginx -y | tee -a /var/log/instalaciones_sistema.log

```

### 3. El truco Senior: `tee` y el muro de `sudo`

Aquí es donde `tee` demuestra su verdadero valor en la administración de sistemas e infraestructura.

Existe un error clásico que comete el 100% de los administradores cuando están aprendiendo. Imagina que necesitas escribir una configuración en un archivo protegido del sistema (como `/etc/sysctl.conf`). Intentas hacerlo como un usuario normal pero usando `sudo` para elevar tus privilegios:

```bash
# ¡ESTO FALLARÁ!
sudo echo "net.ipv4.ip_forward = 1" > /etc/sysctl.conf
-bash: /etc/sysctl.conf: Permiso denegado

```

**¿Por qué falla si hemos usado `sudo`?**
Por el orden en que la *shell* (Bash) procesa la línea. Bash evalúa y prepara la redirección (`> /etc/sysctl.conf`) **antes** de ejecutar el comando `sudo`. Como tu usuario actual no tiene permisos para escribir en `/etc/`, Bash bloquea la operación antes de que `sudo` tenga la oportunidad de hacer nada. El privilegio de `sudo` solo se aplicó al inofensivo comando `echo`.

**La solución elegante con `tee`:**
Para evadir este problema, ejecutamos el `echo` sin privilegios, pasamos el texto por una tubería, y elevamos los privilegios **únicamente** del comando `tee`, que es el que realmente escribirá en el archivo:

```bash
# LA FORMA CORRECTA Y SEGURA
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

```

En este escenario:

1. `echo` escupe el texto.
2. La tubería lo pasa a `tee`.
3. `sudo tee` (ahora corriendo como *root*) toma el texto, lo imprime en tu pantalla para confirmarte qué está haciendo, y lo escribe exitosamente en el archivo protegido.

Si además quieres que esta operación sea silenciosa (para usarla dentro de un script automatizado donde no quieres ensuciar la salida estándar), puedes redirigir el *stdout* de `tee` al agujero negro que aprendimos en la sección anterior:

```bash
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf > /dev/null

```

---

**Conclusión del Capítulo 7:**
Dominar los flujos estándar (*stdin*, *stdout*, *stderr*), las redirecciones y las tuberías es el punto de inflexión donde dejas de "usar" Linux para empezar a "programar" Linux. Has construido las cañerías; ahora es momento de aprender a filtrar, transformar y esculpir los datos que viajan por ellas.
