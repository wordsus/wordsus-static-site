En el ecosistema DevOps, los datos son el combustible y el texto es el formato universal. Este capítulo aborda el dominio de las herramientas que permiten a un Senior transformar un mar de logs caóticos en información accionable. A través de la combinación de `grep` para la búsqueda precisa, `sed` para la edición quirúrgica y `awk` para el análisis estructurado de datos, aprenderás a automatizar tareas que a otros les tomaría horas de trabajo manual. Estas utilidades, complementadas con comandos de filtrado y ordenación, forman el núcleo de la eficiencia en Linux, permitiéndote diagnosticar incidentes y procesar configuraciones a una velocidad y escala profesionales.

## 8.1 Búsqueda de patrones con Expresiones Regulares (`grep`, `egrep`, `zgrep`)

En el día a día de un ingeniero DevOps o Administrador de Sistemas, rara vez lees un archivo de principio a fin. Lo normal es buscar una aguja en un pajar: un error específico en un log de 5 GB, una directiva mal configurada en `/etc/ssh/sshd_config`, o una IP atacante. Aquí es donde entra en juego `grep`.

El nombre `grep` proviene del comando del antiguo editor `ed`: `g/re/p` *(Global Regular Expression Print)*. Su función es simple pero devastadoramente efectiva: lee texto (ya sea de un archivo o de la entrada estándar gracias a las tuberías que vimos en el Capítulo 7), busca un patrón específico y devuelve las líneas que coinciden.

---

### 1. El arsenal básico de `grep`

La sintaxis fundamental es: `grep [OPCIONES] PATRÓN [ARCHIVO...]`

Aunque buscar palabras exactas (como `grep "ERROR" /var/log/syslog`) es útil, el verdadero poder de `grep` se desbloquea con sus opciones (flags). Como profesional, debes memorizar estas banderas esenciales:

* **`-i` (ignore case):** Ignora mayúsculas y minúsculas. `grep -i "error"` encontrará "Error", "ERROR" y "error".
* **`-v` (invert match):** Muestra todo lo que **no** coincida. Ideal para filtrar ruido. Ejemplo: `grep -v "INFO" app.log` (muestra todo excepto las líneas informativas).
* **`-r` o `-R` (recursive):** Busca en todos los archivos dentro de un directorio. (Nota: `-R` sigue enlaces simbólicos, `-r` no).
* **`-n` (line number):** Imprime el número de línea junto a la coincidencia. Vital para luego abrir el archivo con `vi` o `nano` e ir directo al problema.
* **`-l` (files with matches):** En lugar de mostrar el texto, solo devuelve los *nombres de los archivos* que contienen el patrón. Muy útil en scripts.
* **`-c` (count):** Solo cuenta cuántas líneas coinciden. Útil para métricas rápidas (ej. ¿Cuántos errores 404 hubo?).

**Controlando el contexto (`-A`, `-B`, `-C`)**
A veces, el error en sí no te dice nada sin el contexto de lo que ocurrió milisegundos antes o después. Trata estos flags como una máquina del tiempo para tus logs:

* `-A 3` (After): Muestra la coincidencia y las 3 líneas **siguientes**.
* `-B 2` (Before): Muestra la coincidencia y las 2 líneas **anteriores**.
* `-C 4` (Context): Muestra 4 líneas antes **y** 4 líneas después.

```bash
# Ejemplo: Buscar un error fatal en un log de Nginx y ver qué petición lo causó (contexto previo)
grep -B 2 "FATAL" /var/log/nginx/error.log

```

---

### 2. Expresiones Regulares Básicas (BRE)

Buscar cadenas literales es de principiantes. Los Seniors usan **Expresiones Regulares (RegEx)**, un metalenguaje para describir patrones de texto.

Por defecto, `grep` usa *Basic Regular Expressions* (BRE). Aquí tienes los anclajes y comodines fundamentales:

| Símbolo | Significado | Ejemplo Práctico |
| --- | --- | --- |
| `^` | Inicio de línea | `^root` (Líneas que *empiezan* con la palabra root) |
| `$` | Fin de línea | `bash$` (Líneas que *terminan* con la palabra bash) |
| `.` | Cualquier carácter único | `r..t` (Coincide con root, r00t, rXyt) |
| `*` | Cero o más del elemento anterior | `ab*c` (Coincide con ac, abc, abbc, abbbc) |
| `[]` | Lista de caracteres permitidos | `[eE]rror` (Coincide con error o Error) |
| `[^]` | Lista de caracteres denegados | `[^0-9]` (Cualquier carácter que NO sea un número) |

**El patrón de la línea vacía:**
Una combinación clásica es `^$`, que significa "inicio de línea seguido inmediatamente por fin de línea". Para ver un archivo de configuración sin los comentarios (líneas que empiezan con `#`) ni las líneas vacías, puedes encadenar `grep`:

```bash
# Filtra líneas comentadas y luego filtra líneas vacías
grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"

```

---

### 3. Llevándolo al límite con `egrep` (o `grep -E`)

Las Expresiones Regulares Extendidas (ERE) añaden operadores lógicos y cuantificadores más avanzados. Tradicionalmente se usaba el comando `egrep`, pero en los sistemas modernos está deprecado en favor de `grep -E`.

Las ERE te dan acceso a estos superpoderes sin tener que escapar los caracteres con barras invertidas (`\`):

| Símbolo (ERE) | Significado | Ejemplo Práctico |
| --- | --- | --- |
| `+` | Uno o más del elemento anterior | `[0-9]+` (Uno o varios números seguidos) |
| `?` | Cero o uno (opcional) | `https?` (Coincide con http o https) |
| ` | ` | Operador OR (o lógico) |
| `()` | Agrupación | `(sudo |
| `{n,m}` | Cuantificador exacto (de *n* a *m* veces) | `[0-9]{3}` (Exactamente 3 números seguidos) |

**Ejemplo DevOps del mundo real:**
Imagina que quieres extraer todas las direcciones IPv4 válidas (o aproximadas) de un log de acceso de Apache. Usarías `grep -E`:

```bash
# Busca patrones de números separados por tres puntos (Aprox. IPv4)
grep -E -o "([0-9]{1,3}\.){3}[0-9]{1,3}" /var/log/apache2/access.log

```

*(Nota: El flag `-o` o `--only-matching` es un truco excelente: le dice a `grep` que no imprima toda la línea, sino **únicamente** la parte de la línea que coincidió con la RegEx. Vital para limpiar datos antes de pasarlos a `awk`).*

---

### 4. Investigando el pasado: `zgrep`

En el Capítulo 5 hablamos de compresión y en el Capítulo 4 de la rotación de logs. En un servidor de producción, los logs antiguos se comprimen en archivos `.gz` para ahorrar espacio de almacenamiento (por ejemplo, `syslog.2.gz`).

Si tienes que investigar un incidente que ocurrió la semana pasada, descomprimir todos los logs temporalmente (usando `gunzip`) consumiría demasiado disco e IOPS, lo cual podría tirar el servidor.

`zgrep` es un "wrapper" que te permite hacer un `grep` directamente sobre archivos comprimidos con gzip **al vuelo**, extrayéndolos solo en memoria.

```bash
# Buscar intentos de inicio de sesión fallidos en un log rotado del mes pasado
zgrep -i "failed password" /var/log/auth.log.4.gz

```

Todos los flags que funcionan con `grep` (`-i`, `-v`, `-c`, `-E`) funcionan de manera idéntica en `zgrep`.

## 8.2 Edición de flujos y sustitución de texto (`sed`)

Si `grep` es tu lupa para encontrar información, `sed` (Stream Editor) es tu bisturí automatizado. Como ingeniero DevOps, a menudo necesitarás modificar archivos de configuración sobre la marcha dentro de un script de despliegue (CI/CD) o limpiar la salida de un comando antes de pasarla a otra herramienta. Abrir `nano` o `vim` manualmente no es escalable cuando tienes que actualizar la configuración en 50 servidores.

`sed` lee el texto línea por línea, aplica las instrucciones que le des y escupe el resultado en la salida estándar (stdout), todo de forma silenciosa y sin interfaz gráfica.

---

### 1. La anatomía de la sustitución (El comando `s`)

El 90% de las veces que uses `sed`, será para buscar y reemplazar texto. La sintaxis fundamental utiliza el comando `s` (substitute) y se estructura de la siguiente manera:

```text
Estructura del comando de sustitución en sed:

     s/patrón_a_buscar/texto_de_reemplazo/banderas
     |       |                 |             |
 Acción    Patrón            Nuevo       Comportamiento
(Sustituir)                 Texto      (Ej. 'g' para global)

```

**Ejemplo básico:**
Supongamos que tienes un archivo de configuración y quieres cambiar el entorno de "desarrollo" a "produccion":

```bash
sed 's/desarrollo/produccion/' config.yml

```

**El problema del primer coincidente:**
Por defecto, `sed` solo reemplaza la **primera** coincidencia que encuentra en cada línea. Si la palabra "desarrollo" aparece tres veces en la misma línea, solo cambiará la primera. Para arreglar esto, usamos la bandera `g` (global):

```bash
sed 's/desarrollo/produccion/g' config.yml

```

### 2. Modificando archivos "In-Place" (El peligroso flag `-i`)

Hasta ahora, `sed` solo imprime el resultado en la pantalla. El archivo original (`config.yml`) permanece intacto. Para guardar los cambios directamente en el archivo, usamos el flag `-i` (in-place).

⚠️ **Advertencia de Senior:** Usar `sed -i` en un script puede ser destructivo si tu expresión regular es incorrecta. Las buenas prácticas dictan crear siempre una copia de seguridad automáticamente añadiendo una extensión al flag:

```bash
# Modifica el archivo original, pero crea un backup llamado 'sshd_config.bak'
sed -i.bak 's/Port 22/Port 2222/g' /etc/ssh/sshd_config

```

---

### 3. Evitando el "Síndrome del Palillo Inclinado"

¿Qué pasa si necesitas reemplazar una ruta de directorio, como `/var/www/html` por `/opt/nginx/public`?
Si usas las barras `/` como delimitadores, tendrás que "escaparlas" con barras invertidas `\`, creando un monstruo ilegible conocido como el *Leaning Toothpick Syndrome* (Síndrome del palillo inclinado):

```bash
# ❌ Forma difícil de leer:
sed 's/\/var\/www\/html/\/opt\/nginx\/public/g' config.conf

```

**El truco:** `sed` es lo suficientemente inteligente como para permitirte cambiar el delimitador. El carácter que pongas inmediatamente después de la `s` se convertirá en el nuevo delimitador. Los más comunes son `|`, `#` o `@`:

```bash
# ✅ Forma limpia y profesional:
sed 's|/var/www/html|/opt/nginx/public|g' config.conf

```

---

### 4. Borrado de líneas y direccionamiento

`sed` no solo sirve para sustituir. Puedes indicarle que aplique acciones solo a líneas específicas o que borre contenido usando el comando `d` (delete).

| Comando `sed` | Acción | Caso de Uso |
| --- | --- | --- |
| `sed '3d' archivo` | Borra la línea 3 | Eliminar una cabecera estática. |
| `sed '1,5d' archivo` | Borra de la línea 1 a la 5 | Limpiar bloques de introducción en un log. |
| `sed '/ERROR/d' archivo` | Borra las líneas que contengan "ERROR" | Filtrar ruido no deseado (inverso a `grep`). |
| `sed '/^#/d' archivo` | Borra líneas que empiecen con `#` | Eliminar comentarios de un archivo config. |
| `sed '/^$/d' archivo` | Borra líneas vacías | Compactar un archivo disperso. |

*Nota: Puedes encadenar comandos separándolos con un punto y coma `;` o usando múltiples flags `-e`.*

```bash
# Limpia un archivo de configuración eliminando comentarios Y líneas vacías en una sola pasada:
sed -e '/^#/d' -e '/^$/d' /etc/redis/redis.conf

```

---

### 5. Magia Senior: Grupos de Captura (Backreferences)

Aquí es donde separas a los administradores novatos de los ingenieros automatizadores. Puedes usar paréntesis `()` en tu patrón de búsqueda para "capturar" fragmentos de texto y luego reutilizarlos en tu texto de reemplazo usando `\1`, `\2`, etc.

*(Importante: En `sed` estándar debes escapar los paréntesis `\(\)` o usar el flag `-E` para usar expresiones regulares extendidas, igual que en `grep -E`).*

**Escenario:** Tienes una lista de nombres en formato `Nombre Apellido` y necesitas invertirla a `Apellido, Nombre`.

```bash
echo "Linus Torvalds" | sed -E 's/([A-Za-z]+) ([A-Za-z]+)/\2, \1/'
# Salida: Torvalds, Linus

```

**¿Qué pasó aquí?**

1. `([A-Za-z]+)` captura el primer nombre (Linus) y lo guarda en la memoria `\1`.
2. Hay un espacio intermedio.
3. `([A-Za-z]+)` captura el apellido (Torvalds) y lo guarda en la memoria `\2`.
4. En la sección de reemplazo, reordenamos la salida: `\2, \1`.

## 8.3 Extracción y procesamiento avanzado de columnas (`awk`)

Para completar la Santísima Trinidad del procesamiento de texto, llegamos a `awk`. Si `grep` es tu lupa y `sed` tu bisturí, `awk` es tu hoja de cálculo programable de línea de comandos.

Diseñado en los años 70 por Aho, Weinberger y Kernighan (de ahí sus siglas), `awk` no es solo un comando, es un lenguaje de programación Turing completo (o casi) diseñado específicamente para el procesamiento de datos estructurados. Mientras que `sed` y `grep` ven el texto como secuencias de caracteres, `**awk` ve el texto como datos organizados en filas y columnas**.

Un error clásico de principiante es encadenar un `grep`, seguido de un `tr`, seguido de un `cut` para obtener un dato. Un Senior hace todo eso con una sola invocación de `awk`.

---

### 1. La visión matricial de `awk`

Para dominar `awk`, debes entender cómo lee la información. Por defecto, procesa el texto línea por línea (a las que llama **Registros** o *Records*) y divide cada línea en palabras separadas por espacios o tabulaciones (a las que llama **Campos** o *Fields*).

Aquí tienes un diagrama conceptual en texto plano de cómo `awk` mapea internamente una línea de salida típica (por ejemplo, de `ls -l`):

```text
Entrada:  -rw-r--r--  1 root root  1024 May 15 10:30 config.yml
          |_________| | |__| |__| |___| |__________| |________|
               |      |   |    |    |        |           |
Variables:    $1     $2  $3   $4   $5    $6, $7, $8     $9

Línea completa (Registro total) = $0

```

#### Variables integradas esenciales

`awk` tiene variables predefinidas que son el núcleo de su poder. Memoriza esta tabla:

| Variable | Significado | Uso Práctico |
| --- | --- | --- |
| `$0` | La línea (registro) completa. | Imprimir toda la línea si se cumple una condición. |
| `$1, $2... $N` | El campo (columna) número N. | Extraer solo el nombre de usuario (`$1`) de una lista. |
| `NF` | *Number of Fields* (Cantidad de columnas). | `$NF` siempre imprimirá la **última** columna. |
| `NR` | *Number of Records* (Número de línea actual). | Imprimir rangos de líneas (ej. líneas 5 a 10). |
| `FS` | *Field Separator* (Delimitador de entrada). | Por defecto es el espacio. Se cambia con `-F`. |
| `OFS` | *Output Field Separator* (Delimitador de salida). | Por defecto es el espacio. Cambia cómo se imprime. |

---

### 2. Extracción y formateo básico

La sintaxis general de `awk` es: `awk 'condición { acción }' archivo`
Si omites la condición, la acción se aplica a todas las líneas.

**Ejemplo 1: Extracción simple**
Imagina que quieres ver solo los permisos y los nombres de los archivos en un directorio:

```bash
ls -l | awk '{print $1, $9}'

```

*(Nota: La coma `,` entre `$1` y `$9` es crucial; le dice a `awk` que inserte un espacio entre las variables al imprimir. Si los pegas como `$1$9`, el texto saldrá unido).*

**Ejemplo 2: Cambiando el delimitador (`-F`)**
Archivos críticos de Linux como `/etc/passwd` no usan espacios, usan dos puntos `:` para separar columnas. Aquí extraemos solo los nombres de usuario y sus shells por defecto:

```bash
awk -F ':' '{print "Usuario:", $1, "-> Shell:", $7}' /etc/passwd

```

---

### 3. Condicionales: Filtrando como un Senior

`awk` puede evaluar datos numéricos y cadenas de texto directamente en columnas específicas, algo que `grep` sufre para hacer de forma limpia.

**Ejemplo 3: Filtrado numérico**
Digamos que tienes un disco lleno y haces un `df -h`, pero quieres que la terminal te alerte solo de las particiones que están al 100% de capacidad (columna 5). En lugar de usar expresiones regulares complejas, `awk` lo hace semánticamente:

```bash
# Nota: Sumamos 0 (+0) para forzar a awk a tratar "100%" como el número 100, ignorando el símbolo %.
df -h | awk '($5+0) >= 90 {print "ALERTA: " $1 " está al " $5}'

```

**Ejemplo 4: Filtrado por coincidencia en columna (El reemplazo de `grep`)**
Si quieres buscar procesos del usuario "postgres", pero solo quieres que busque en la columna del propietario (la `$1` de `ps aux`), y no si la palabra "postgres" aparece por casualidad en el comando ejecutado:

```bash
# El operador ~ significa "coincide con la expresión regular"
ps aux | awk '$1 ~ /^postgres$/ {print $2, $11}'

```

---

### 5. Los bloques `BEGIN` y `END`: Procesamiento de datos

Como lenguaje de programación, `awk` puede declarar sus propias variables y hacer cálculos matemáticos sobre la marcha. Para esto usa dos bloques especiales:

* `BEGIN { ... }`: Se ejecuta **una vez** antes de procesar la primera línea. Ideal para definir variables o imprimir encabezados.
* `END { ... }`: Se ejecuta **una vez** después de procesar la última línea. Ideal para imprimir sumatorias o promedios.

**Ejemplo 5: El caso de uso DevOps definitivo (Sumar memoria)**
Estás depurando un servidor y necesitas saber rápidamente cuántos Kilobytes de memoria RAM están consumiendo todos los procesos de Apache juntos. `ps aux` muestra el consumo de RAM (RSS) en la sexta columna (`$6`).

```bash
ps aux | awk '
BEGIN { suma_ram = 0; print "Calculando RAM de Apache..." }
$11 ~ /apache2/ { suma_ram += $6 }
END { print "Total consumido: " suma_ram / 1024 " MB" }
'

```

**¿Qué está pasando aquí?**

1. Antes de leer nada, inicializamos `suma_ram = 0`.
2. Para cada línea, si el comando (columna 11) contiene "apache2", sumamos el valor de la columna 6 a nuestra variable `suma_ram`.
3. Al terminar de leer todas las líneas, dividimos el total entre 1024 para convertir de KB a MB y lo imprimimos.

Todo en una sola pasada, sin archivos temporales, a una velocidad increíble.

## 8.4 Herramientas complementarias de texto (`cut`, `sort`, `uniq`, `tr`, `wc`)

Aunque `awk` (como vimos en la sección anterior) es lo suficientemente potente como para reemplazar a casi todas las demás herramientas de procesamiento de texto, a veces usar un cañón para matar un mosquito es innecesario.

La filosofía original de UNIX establece: *"Escribe programas que hagan una sola cosa y la hagan bien. Escribe programas que trabajen juntos"*. Aquí es donde brillan las herramientas complementarias. Son pequeñas, extremadamente rápidas y, cuando las unes con tuberías (`|`), forman comandos de una sola línea (one-liners) que resuelven problemas complejos en segundos.

---

### 1. `cut`: Extracción rápida de columnas

Si solo necesitas extraer una columna específica y el archivo tiene un delimitador muy claro (como comas o dos puntos), `cut` es más rápido de escribir que `awk`.

Sus banderas principales son:

* `-d`: Define el delimitador (por defecto es el tabulador).
* `-f`: Define el campo (columna) a extraer.

**Ejemplo DevOps:**
Extraer solo la lista de usuarios del sistema desde `/etc/passwd`:

```bash
cut -d ':' -f 1 /etc/passwd

```

También puedes pedir rangos, como `-f 1,3` (columnas 1 y 3) o `-f 2-5` (de la 2 a la 5).

---

### 2. `tr`: El traductor de caracteres

`tr` (Translate) no lee por palabras o columnas, sino carácter por carácter. Se utiliza principalmente para cambiar mayúsculas/minúsculas o eliminar caracteres molestos. A diferencia de otras herramientas, `tr` **solo** acepta entrada estándar (stdin), por lo que siempre debe usarse con tuberías o redirecciones.

**Ejemplos prácticos:**

```bash
# Convertir todo un texto a mayúsculas
cat archivo.txt | tr 'a-z' 'A-Z'

# Eliminar caracteres específicos (el flag -d es 'delete')
# Clásico problema DevOps: Limpiar los retornos de carro de Windows (\r) en un script de Linux
cat script_windows.sh | tr -d '\r' > script_linux.sh

```

---

### 3. `wc`: Contando el volumen de datos

`wc` (Word Count) hace exactamente lo que promete, pero como administradores de sistemas, rara vez nos importan las "palabras". Nos importan las **líneas**.

* `wc -l`: Cuenta el número de líneas.
* `wc -c`: Cuenta los bytes.

**Caso de uso:**
¿Cuántos paquetes tienes instalados en tu sistema Debian/Ubuntu?

```bash
dpkg -l | wc -l

```

O, ¿cuántos errores ocurrieron hoy?

```bash
grep "ERROR" /var/log/syslog | wc -l

```

---

### 4. `sort` y `uniq`: El dúo dinámico del análisis

Estas dos herramientas casi siempre trabajan juntas.

* **`sort`**: Ordena las líneas alfabética o numéricamente.
* **`uniq`**: Filtra líneas duplicadas contiguas.

⚠️ **Regla de oro de UNIX:** `uniq` **solo** detecta duplicados si están en líneas adyacentes. Por lo tanto, **siempre debes pasar los datos por `sort` antes de pasarlos por `uniq`**.

Banderas clave de `sort`:

* `-n`: Orden numérico (para que el "10" sea mayor que el "2", de lo contrario, alfabéticamente el "2" iría después del "1").
* `-r`: Orden inverso (Reverse), de mayor a menor.

Banderas clave de `uniq`:

* `-c`: Cuenta (Count) cuántas veces apareció cada línea duplicada.

---

### 5. El One-Liner Supremo (Uniendo todo)

Para cerrar la "Santísima Trinidad del Procesamiento de Texto" y este capítulo, veamos cómo un Senior combina estas pequeñas herramientas en un caso del mundo real.

**El Escenario:** Tienes un servidor web Apache o Nginx bajo un posible ataque de denegación de servicio (DDoS). Quieres saber rápidamente cuáles son las 5 direcciones IP que más peticiones han hecho a tu servidor hoy.

**El Comando:**

```bash
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 5

```

**Anatomía del pipeline en texto plano:**

```text
1. awk '{print $1}'   -> Lee el log y extrae SOLO la primera columna (la IP).
2. sort               -> Agrupa las IPs idénticas poniéndolas una debajo de otra.
3. uniq -c            -> Colapsa las IPs duplicadas y añade un contador al inicio.
                         (Ej: "500 192.168.1.10")
4. sort -nr           -> Ordena el resultado de forma Numérica (-n) y Reversa (-r), 
                         dejando los números más altos arriba.
5. head -n 5          -> Recorta la salida para mostrar solo el "Top 5".

```

Con estas herramientas en tu cinturón, has pasado de simplemente "mirar" logs a analizarlos como un científico de datos desde la propia terminal, sin necesidad de exportar nada a Excel.

