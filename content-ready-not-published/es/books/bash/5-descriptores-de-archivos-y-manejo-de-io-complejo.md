En el ecosistema DevOps, la eficiencia de un script reside en cómo gestiona sus flujos de datos. Más allá de las redirecciones básicas, este capítulo profundiza en el control granular de la entrada y salida mediante descriptores de archivos (FDs) personalizados. Aprenderás a orquestar múltiples canales de comunicación, automatizar el registro de logs sin ensuciar la terminal con `exec`, y procesar datos en memoria mediante sustitución de procesos para eliminar la dependencia de archivos temporales. Finalmente, dominaremos la comunicación bidireccional asíncrona con coprocesos, transformando scripts lineales en herramientas de automatización de alto rendimiento y grado profesional.

## 5.1. Manipulación de descriptores de archivos (FDs): Más allá de stdin (0), stdout (1) y stderr (2); creando FDs personalizados (3+)

Cualquier ingeniero DevOps está familiarizado con la trinidad básica de entrada y salida estándar en sistemas POSIX: `stdin` (0), `stdout` (1) y `stderr` (2). Estos tres flujos son suficientes para la mayoría de las operaciones básicas. Sin embargo, cuando construyes herramientas de automatización complejas, dependes exclusivamente de estos tres canales puede llevar a código espagueti, pérdida de datos o la creación innecesaria de archivos temporales.

Bash permite gestionar hasta 255 descriptores de archivos por defecto. Aprender a abrir, utilizar y cerrar descriptores personalizados (del 3 en adelante) te permite manejar múltiples flujos de lectura y escritura simultáneamente, aislar logs de auditoría, e incluso interactuar directamente con sockets de red.

### El modelo conceptual de los FDs en Bash

Un descriptor de archivo no es más que un puntero (un número entero) que el sistema operativo asigna a un archivo abierto, tubería (pipe) o socket de red asociado a un proceso.

```text
+-------------------------------------------------+
|             Proceso Bash (ej. PID 8452)         |
|                                                 |
|  FD 0 (stdin)  <================  Teclado/Pipe  |
|  FD 1 (stdout) =================> Terminal      |
|  FD 2 (stderr) =================> Terminal      |
|                                                 |
|  [ FDs Personalizados creados por el usuario ]  |
|  FD 3 (salida) =================> /var/log/app  |
|  FD 4 (entrada)<================  /etc/conf.ini |
|  FD 5 (i/o)    <===============>  Socket TCP    |
+-------------------------------------------------+

```

### Creación y cierre manual de FDs (Método Tradicional)

Para asignar un descriptor de archivo a un destino específico, utilizamos el comando incorporado `exec`. Aunque profundizaremos en el uso global de `exec` en la siguiente sección (5.2), aquí lo usaremos estrictamente para inicializar nuestros FDs personalizados (3+).

**1. Abrir un FD para escritura (`>`) o adición (`>>`):**

```bash
# Abre el descriptor 3 apuntando a un archivo, truncándolo si existe
exec 3> /var/log/deploy_audit.log

# Abre el descriptor 4 en modo "append" (añadir)
exec 4>> /var/log/deploy_metrics.log

```

**2. Abrir un FD para lectura (`<`):**

```bash
# Abre el descriptor 5 para leer un archivo de configuración
exec 5< /etc/infra/config.json

```

**3. Cerrar un FD (`>&-` o `<&-`):**
Es una buena práctica liberar los descriptores cuando ya no se necesitan para evitar bloqueos o fugas de recursos.

```bash
exec 3>&-  # Cierra el FD 3 (escritura)
exec 5<&-  # Cierra el FD 5 (lectura)

```

### Interactuando con FDs Personalizados

Una vez que un FD está abierto, puedes redirigir la salida de comandos individuales hacia él, o leer desde él, sin afectar la salida estándar de tu script.

**Escribiendo en un FD (usando `>&`):**

```bash
echo "Iniciando aprovisionamiento..." >&3
date "+%s" >&4

```

*Nota: Si el FD 3 no estuviera abierto, Bash arrojaría un error: `Bad file descriptor`.*

**Leyendo de un FD:**
Puedes redirigir la entrada de un comando de lectura usando `<&` o usar la bandera `-u` del comando `read`.

```bash
# Leyendo línea por línea desde el FD 5
while read -r -u 5 linea_config; do
    echo "Procesando: $linea_config"
done

```

### Pro-Tip: Asignación dinámica de FDs (Bash 4.1+)

Manejar números fijos (3, 4, 5) puede generar colisiones en scripts muy grandes o modulares. A partir de Bash 4.1, el shell puede encontrar automáticamente el primer FD libre disponible y asignarlo a una variable. Esto se logra usando una variable rodeada por llaves `{}`.

```bash
# Bash asigna un FD libre (ej. 10) a la variable LOG_FD
exec {LOG_FD}>/var/log/dynamic_process.log

# Usamos la variable para escribir
echo "Despliegue exitoso en $(hostname)" >&"$LOG_FD"

# Cerramos el FD dinámico de forma segura
exec {LOG_FD}>&-

```

*Esta técnica es altamente recomendada para scripts de infraestructura modernos, ya que previene conflictos entre librerías (que cubriremos en el Capítulo 4).*

### Caso de Uso DevOps: Conexiones TCP directas (El operador `<>`)

Bash tiene una característica pseudo-nativa muy potente: el mapeo del sistema de archivos `/dev/tcp` y `/dev/udp`. Combinado con el operador de lectura/escritura (`<>`), puedes abrir un socket de red interactivo sin necesidad de instalar herramientas de terceros como `netcat` o `curl` en contenedores efímeros.

```bash
# 1. Abrimos el FD 3 para lectura y escritura contra un servidor web
exec 3<> /dev/tcp/www.example.com/80

# 2. Enviamos una petición HTTP cruda al FD 3
echo -e "GET / HTTP/1.1\r\nhost: www.example.com\r\nConnection: close\r\n\r\n" >&3

# 3. Leemos la respuesta del servidor desde el FD 3 e imprimimos en stdout
cat <&3

# 4. Limpiamos
exec 3>&-

```

Al dominar los FDs personalizados, aislas los flujos de datos de tu automatización. Puedes mantener `stdout` limpio para que tus scripts puedan ser encadenados mediante tuberías (`|`) en pipelines de CI/CD, mientras envías información de depuración estructurada, métricas y logs de auditoría a sus respectivos destinos en segundo plano.

## 5.2. Redirección persistente y global dentro del script usando `exec`

En la sección anterior vimos cómo crear descriptores de archivos personalizados. Sin embargo, el comando `exec` tiene un comportamiento dual fascinante en Bash que es la piedra angular para la creación de automatizaciones robustas y silenciosas (o altamente detalladas).

Por diseño, el comando `exec` reemplaza el proceso actual del shell con un nuevo comando (el PID no cambia, pero el shell muere y es reemplazado). Sin embargo, **cuando `exec` se invoca sin ningún comando y solo con redirecciones**, altera permanentemente los descriptores de archivos del script en ejecución.

Esta técnica nos permite establecer políticas de I/O globales sin tener que añadir `>> log.txt` al final de cada línea de nuestro código.

### El patrón de Centralización de Logs

El caso de uso más común en DevOps para la redirección global es la captura de toda la salida de un script de aprovisionamiento o despliegue hacia un archivo de auditoría, aislando el ruido de la terminal.

```bash
#!/usr/bin/env bash
set -euo pipefail # Recordando nuestro Strict Mode (Capítulo 1)

LOG_FILE="/var/log/deploy_$(date +%F).log"

# 1. Redirigimos globalmente stdout (1) al archivo de log
exec 1> "$LOG_FILE"

# 2. Redirigimos globalmente stderr (2) hacia donde apunte stdout (1)
exec 2>&1

echo "Iniciando despliegue..." # Esto va directo al archivo
apt-get update -y              # Toda esta salida masiva va al archivo
echo "Despliegue finalizado."  # Esto también va al archivo

# La terminal del usuario permanece completamente limpia.

```

**Diagrama de estado de los FDs con `exec`:**

```text
ESTADO INICIAL:
FD 1 (stdout) ----> [Terminal (tty)]
FD 2 (stderr) ----> [Terminal (tty)]

DESPUÉS DE `exec 1> deploy.log`:
FD 1 (stdout) ----> [/var/log/deploy.log]
FD 2 (stderr) ----> [Terminal (tty)]

DESPUÉS DE `exec 2>&1`:
FD 1 (stdout) ----> [/var/log/deploy.log]
FD 2 (stderr) ----> [/var/log/deploy.log]

```

### El dilema de la ceguera: Guardando y restaurando FDs

Redirigir todo globalmente es excelente para la ejecución desatendida, pero presenta un problema crítico en scripts interactivos: ¿Qué sucede si después de registrar mil líneas de instalación en segundo plano, necesitas pedirle confirmación al usuario en la terminal?

Si perdiste el puntero original de la terminal, tu script quedará "ciego y mudo". La solución es combinar lo aprendido en la sección 5.1 (FDs personalizados) para crear "copias de seguridad" de la pantalla y el teclado.

**Patrón de Backup y Restauración de TTY:**

```bash
#!/usr/bin/env bash

# --- FASE 1: Backup ---
# Guardamos la salida estándar (Terminal) en el FD 3
exec 3>&1 
# Guardamos la entrada estándar (Teclado) en el FD 4 (por si acaso)
exec 4>&0 

# --- FASE 2: Redirección Global ---
exec 1> /tmp/background_task.log 2>&1

echo "Instalando dependencias pesadas..."
# ... (cientos de comandos ruidosos que van al log) ...

# --- FASE 3: Interacción directa saltando la redirección ---
# Imprimimos explícitamente en el FD 3 (la terminal)
echo "Atención: La base de datos necesita reiniciarse." >&3
echo -n "¿Desea continuar? [y/N]: " >&3

# Leemos explícitamente desde el FD 4 (el teclado)
read -r respuesta <&4

if [[ "$respuesta" != "y" ]]; then
    echo "Abortando..." >&3
    exit 1
fi

# --- FASE 4: Restauración ---
# Devolvemos stdout (1) a donde apunta el FD 3 (Terminal)
exec 1>&3 
# Cerramos los FDs de backup porque ya no los necesitamos
exec 3>&- 
exec 4>&- 

echo "El script ha vuelto a la normalidad. La terminal vuelve a ser el destino por defecto."

```

### Bloques de redirección vs. Redirección Global (`exec`)

Es importante entender la diferencia arquitectónica entre usar `exec` y usar un bloque de agrupación `{ }` para redirigir.

**Agrupación `{ } > log.txt`:**

* **Ventaja:** El alcance es visualmente claro y limitado.
* **Desventaja:** Si la lógica es muy extensa o abarca cientos de líneas y múltiples funciones, indentar todo el código dentro de llaves puede hacer que el script sea ilegible y difícil de mantener.

**Global (`exec > log.txt`):**

* **Ventaja:** Ideal para la inicialización. Se define en la cabecera del script (junto a `set -e`) y aplica a todo el proceso actual y a cualquier subshell o comando hijo que se genere a partir de ese punto.
* **Desventaja:** Requiere gestión manual del estado (guardar y restaurar) si se necesita volver al comportamiento original.

*Nota de transición: En el estado actual de este script, nuestra redirección con `exec` envía los datos al log de forma silenciosa. En la próxima sección (5.3. Sustitución de procesos), veremos cómo usar `exec` junto con utilidades como `tee` para lograr que los logs se guarden en disco y, al mismo tiempo, se muestren en la terminal en tiempo real.*

## 5.3. Sustitución de procesos (`<()`, `>()`): Procesamiento de flujos al vuelo para evitar la creación de archivos temporales en disco

En las secciones anteriores dominamos los flujos estándar y la redirección persistente. Sin embargo, en el día a día de DevOps nos encontramos frecuentemente con una limitación estricta de las tuberías clásicas (`|`): el operador `|` solo puede conectar la salida estándar de *un* proceso con la entrada estándar de *otro* proceso.

¿Qué sucede cuando una herramienta (como `diff`, `comm`, o `join`) requiere estrictamente **dos o más rutas de archivos** como argumentos en lugar de leer de `stdin`?

La solución clásica (y anti-patrón) es crear archivos temporales en el disco, ejecutar el comando, y luego recordar borrar esos archivos. Esto genera sobrecarga de I/O en el disco, expone datos temporalmente (riesgo de seguridad) y ensucia el código. Aquí es donde entra la **Sustitución de Procesos**.

### ¿Qué es la Sustitución de Procesos?

Las construcciones `<(comando)` y `>(comando)` le indican a Bash que ejecute el `comando` en una subshell y exponga su entrada o salida como si fuera la ruta a un archivo físico.

Bajo el capó, Bash no escribe en el disco duro. En su lugar, crea un enlace dinámico hacia un descriptor de archivo virtual (generalmente en `/dev/fd/`) o utiliza tuberías nombradas (FIFOs) de forma transparente.

```text
+-------------------+                      +-------------------+
|  Subproceso Bash  | ==/dev/fd/63==> (fd) | Comando Principal |
|  (ej. curl, ls)   |                      | (ej. diff, cat)   |
+-------------------+                      +-------------------+

```

### 1. Sustitución de Entrada: `<(comando)`

Se utiliza cuando un comando espera leer un archivo, pero queremos pasarle el resultado de otro comando directamente desde la memoria. El comando principal verá la ruta virtual (ej. `/dev/fd/63`) y leerá de ella.

**El clásico ejemplo de `diff`:**
Supongamos que queremos comparar los paquetes instalados en dos servidores remotos sin descargar ningún archivo a nuestra máquina local.

*En lugar de hacer esto (Lento y sucio):*

```bash
ssh user@server1 "dpkg -l" > server1_pkgs.txt
ssh user@server2 "dpkg -l" > server2_pkgs.txt
diff server1_pkgs.txt server2_pkgs.txt
rm server1_pkgs.txt server2_pkgs.txt

```

*Hacemos esto (Elegante y en memoria):*

```bash
diff <(ssh user@server1 "dpkg -l") <(ssh user@server2 "dpkg -l")

```

**Caso de Uso DevOps: Validación de certificados SSL al vuelo:**
Extraer y leer la fecha de expiración de un certificado remoto pasándolo directamente a `openssl x509`, el cual espera leer un archivo de certificado o de stdin, pero usando sustitución mantenemos el comando en una sola línea clara:

```bash
openssl x509 -noout -dates -in <(openssl s_client -connect myapi.com:443 -showcerts 2>/dev/null)

```

### 2. Sustitución de Salida: `>(comando)`

Esta es la funcionalidad que prometimos en la sección 5.2. Se utiliza cuando un comando espera escribir en un archivo, pero queremos que esos datos fluyan directamente hacia la entrada estándar de otro proceso.

El uso más poderoso de `>()` se da en combinación con la herramienta `tee`, permitiendo el **Multiplexado de Flujos** (enviar la misma salida a múltiples comandos analíticos y logs simultáneamente).

**Caso de Uso DevOps: El pipeline de logging perfecto**

Imagina un script de copia de seguridad masiva. Quieres:

1. Ver el progreso en la terminal (stdout).
2. Guardar un log completo en disco.
3. Enviar solo los errores (filtrados por "ERROR") a un sistema de alertas vía API, todo en tiempo real.

```bash
#!/usr/bin/env bash

# Ejecutamos nuestro proceso ruidoso
./backup_masivo.sh | tee /var/log/backup.log >(grep "ERROR" | curl -X POST -d @- https://api.alertas.com/webhook)

```

**Anatomía de este flujo:**

1. `backup_masivo.sh` emite datos.
2. `|` envía esos datos a `tee`.
3. `tee` hace tres cosas simultáneamente:

* Escribe en `/var/log/backup.log` (archivo físico).
* Escribe en el descriptor virtual creado por `>(grep... )`. Este subproceso filtra y envía el POST.
* Emite de vuelta a `stdout` (tu terminal).

### Sinergia: Combinando `exec` con Sustitución de Procesos

Para cerrar el círculo con el Capítulo 5, podemos aplicar la sustitución de salida de forma global en nuestro script. Si queremos que *todo* lo que hace nuestro script se guarde en un archivo, pero que también se añada un timestamp a cada línea antes de guardarlo en disco, sin afectar lo que ve el usuario:

```bash
#!/usr/bin/env bash

# Redirigimos globalmente la salida hacia un subproceso que formatea y guarda
exec 1> >(awk '{print strftime("[%Y-%m-%d %H:%M:%S]"), $0}' > /var/log/app_audit.log)

echo "Iniciando despliegue de base de datos..."
sleep 2
echo "Aplicando migraciones..."

```

*En este ejemplo, la terminal no verá nada (ya que la salida se la quedó la sustitución de procesos), pero el archivo de log tendrá cada línea perfectamente estampada con fecha y hora, sin necesidad de usar un archivo temporal intermedio ni llamar a `date` en cada `echo`.*

### Advertencias Críticas (El "Gotcha" de los subprocesos)

Debes tener cuidado con las condiciones de carrera (Race Conditions). Cuando usas la sustitución de procesos, Bash lanza los comandos dentro de `<()` o `>()` en segundo plano **de forma asíncrona**.

El comando principal no esperará automáticamente a que los procesos dentro de `>()` terminen de cerrarse antes de pasar a la siguiente línea del script. Si necesitas sincronización estricta (por ejemplo, esperar a que el log termine de escribirse por completo antes de comprimirlo), requerirás técnicas de control de `wait`, las cuales abordaremos en el **Capítulo 6**.

## 5.4. Here-Documents (`<<EOF`) tabulados y Here-Strings (`<<<`) dinámicos

Hasta ahora hemos explorado cómo redirigir la entrada y salida de comandos hacia archivos u otros procesos. Sin embargo, en el ámbito DevOps es extremadamente común necesitar inyectar bloques de texto de múltiples líneas (como archivos de configuración) o cadenas de texto dinámicas directamente en la entrada estándar (`stdin`) de un comando, sin depender de archivos externos.

Para resolver esto con elegancia y rendimiento, Bash ofrece dos estructuras fundamentales: los **Here-Documents** y los **Here-Strings**.

---

### Here-Documents (`<<`): Inyección de bloques multilínea

Un Here-Document permite pasar un bloque de texto de múltiples líneas a un comando como si fuera un archivo. La sintaxis básica utiliza `<<` seguido de una palabra delimitadora (tradicionalmente `EOF`, *End Of File*, pero puede ser cualquier palabra como `CONFIG` o `SQL`).

```bash
cat <<EOF > /etc/mi-app/config.yml
server:
  port: 8080
  host: $(hostname)
EOF

```

En el ejemplo anterior, Bash lee todo el contenido hasta encontrar el delimitador `EOF` (que debe estar solo en su propia línea) y lo envía a `cat`, que a su vez lo redirige al archivo `config.yml`. Notarás que `$(hostname)` se expandirá dinámicamente antes de escribirse.

#### El problema de la indentación y el operador `<<-`

Cuando escribes scripts limpios y modulares (como vimos en el Capítulo 4), tu código estará indentado dentro de funciones o bucles. Usar el operador estándar `<<` rompe la estética del código, ya que el delimitador final y el contenido no pueden estar indentados, o Bash no los reconocerá.

Para solucionar esto, utilizamos el operador **tabulado** `<<-`. Este operador le indica a Bash que **ignore todas las tabulaciones iniciales** (leading tabs) en el bloque de texto y en el delimitador final.

```bash
generar_configuracion() {
    local db_host="db.interna.local"
    
    # Usamos <<- para mantener el código indentado
    cat <<-EOF > /tmp/db_config.ini
  [database]
  host=$db_host
  port=5432
  EOF
}

```

> **⚠️ Advertencia Crítica:** El operador `<<-` **solo ignora tabulaciones (Tabs)**, no espacios en blanco. Si tu editor de código está configurado para reemplazar Tabs por espacios, este operador fallará y el script se romperá. Asegúrate de usar verdaderas tabulaciones para la indentación del bloque.

#### Control de Expansión de Variables (El truco de las comillas)

Al aprovisionar infraestructura (por ejemplo, generando un script `cloud-init` o un `DaemonSet` de Kubernetes desde Bash), a menudo necesitas escribir literales de variables (`$VAR`) sin que el shell actual las evalúe.

Si **entrecomillas el delimitador** (`'EOF'`, `"EOF"` o `\EOF`), le ordenas a Bash que trate todo el bloque de texto de forma completamente literal, deshabilitando la expansión de parámetros y la sustitución de comandos.

```bash
# Generando un script secundario. Queremos que $1 se evalúe cuando 
# el script secundario se ejecute, NO ahora.
cat <<'SCRIPT' > /usr/local/bin/wrapper.sh
#!/bin/bash
echo "El argumento pasado es: $1"
SCRIPT

```

Si hubiéramos usado `<<SCRIPT` sin comillas, `$1` se habría reemplazado por el primer argumento del script *actual*, arruinando el wrapper.

---

### Here-Strings (`<<<`): Eficiencia para cadenas de una sola línea

Es un anti-patrón muy común en Bash usar `echo` combinado con una tubería (`|`) para pasar una variable a un comando:

```bash
# Anti-patrón: Lento y crea una subshell innecesaria
echo "$JSON_DATA" | jq '.status'

```

Además de ser ligeramente ineficiente al crear un proceso adicional, la tubería genera una subshell. Si el comando de la derecha modifica variables del entorno, esos cambios se perderán (como vimos en el Capítulo 1).

La alternativa nativa, limpia y rápida es el **Here-String (`<<<`)**. Este operador toma una cadena de texto o una variable y la inyecta directamente en la entrada estándar del comando, ejecutándolo todo en el contexto actual.

```bash
# Patrón recomendado: Directo, sin subshells
jq '.status' <<< "$JSON_DATA"

# Evaluando expresiones matemáticas rápidamente con bc
bc <<< "scale=2; 100 / 3"

# Buscando dentro de una variable sin archivos temporales
grep -q "ERROR" <<< "$LOG_OUTPUT" && echo "Fallo detectado"

```

#### ¿Qué ocurre bajo el capó con `<<<`?

Es interesante saber que `<<<` no usa tuberías tradicionales. Cuando invocas un Here-String, Bash crea internamente un archivo temporal oculto (o un buffer en memoria si el sistema operativo lo soporta), escribe tu cadena en él y luego abre el comando adjuntando este archivo a su descriptor de archivo 0 (`stdin`). Es una operación atómica y altamente optimizada para flujos de datos cortos.

Dominar `<<-EOF` y `<<<` te permite escribir scripts de despliegue que generan su propia configuración de forma dinámica, manteniendo un código fuente elegante, seguro frente a inyecciones no deseadas, y altamente eficiente en el uso de recursos de I/O.

## 5.5. Coprocesos (`coproc`): Estableciendo comunicación bidireccional persistente con procesos en segundo plano

Hasta el momento, hemos dominado los flujos unidireccionales. Con las tuberías (`|`) enviamos datos en una dirección, y con la sustitución de procesos (`<()`, `>()`) enlazamos salidas o entradas al vuelo. Pero, ¿qué sucede cuando necesitamos una **conversación** con un proceso?

Imagina que tienes una automatización que debe consultar miles de veces una base de datos o una API externa durante su ejecución. Iniciar una nueva conexión (un nuevo proceso `psql`, `redis-cli` o `curl`) para cada consulta añade una latencia inaceptable. La solución arquitectónica es levantar un proceso "esclavo" en segundo plano, mantener su conexión abierta y enviarle/recibir datos dinámicamente.

Aquí es donde brilla el comando nativo `coproc`.

### Anatomía de un Coproceso

Cuando invocas `coproc`, Bash lanza el comando especificado en segundo plano (similar a usar `&`) pero con un superpoder: **crea automáticamente dos tuberías (pipes)** conectando el script principal con la entrada estándar (`stdin`) y la salida estándar (`stdout`) del proceso en segundo plano.

Los descriptores de archivos de estas tuberías se guardan automáticamente en un array indexado (conceptos vistos en el Capítulo 2).

**Diagrama de Arquitectura:**

```text
+----------------------+                       +-----------------------+
|   Script Principal   |                       |  Coproceso (Subshell) |
|                      |                       |                       |
| ARRAY_COPROC[1] (FD) | =====(Escribe a)====> | stdin (0)             |
| ARRAY_COPROC[0] (FD) | <====(Lee desde)===== | stdout (1)            |
+----------------------+                       | stderr (2) -> tty     |
                                               +-----------------------+

```

### Sintaxis Básica y Declaración

Puedes declarar un coproceso de dos formas: anónima (por defecto usa el array `COPROC`) o nombrada. En DevOps, siempre usaremos la **nombrada** para mantener un código legible y prevenir colisiones.

```bash
# Declaración de un coproceso llamado "WORKER"
coproc WORKER { 
    while read -r comando; do
        # Lógica del trabajador
        echo "PROCESADO: $comando"
    done
}

```

Al ejecutar esto, Bash crea la variable array `$WORKER`.

* `${WORKER[1]}` contiene el FD para **escribirle** al coproceso.
* `${WORKER[0]}` contiene el FD para **leer** del coproceso.

### Caso de Uso DevOps: Worker de Traducción en Memoria

Supongamos que estamos parseando un log masivo de auditoría y necesitamos traducir IDs de usuarios a nombres reales. En lugar de hacer miles de llamadas externas, inicializamos un coproceso que simulará mantener un estado.

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Definimos nuestro coproceso con estado persistente
coproc DB_WORKER {
    # El worker entra en un bucle infinito escuchando su stdin
    while read -r user_id; do
        # Simulación de una consulta que costaría mucho iniciar cada vez
        case "$user_id" in
            100) echo "admin_root" ;;
            101) echo "deploy_bot" ;;
            *)   echo "usuario_desconocido" ;;
        esac
    done
}

echo "Iniciando análisis de logs..."

# 2. Simulamos la lectura de un log (podría venir de un archivo)
for id in 100 999 101; do
    # 3. ESCRIBIMOS al coproceso usando su FD de escritura
    echo "$id" >&"${DB_WORKER[1]}"
    
    # 4. LEEMOS la respuesta del coproceso usando su FD de lectura
    read -r -u "${DB_WORKER[0]}" username
    
    echo "Log auditado: ID $id pertenece a $username"
done

# 5. Cierre limpio: Cerramos el canal de escritura. 
# Esto envía una señal EOF (End Of File) al bucle 'while read' del worker,
# haciendo que termine su ejecución de forma natural.
exec {DB_WORKER[1]}>&-

```

### El problema crítico de los Coprocesos: "Buffering" y "Deadlocks"

Los coprocesos son increíblemente potentes, pero tienen dos trampas mortales que todo ingeniero debe conocer:

**1. Deadlocks (Abrazos mortales):**
Si le escribes datos a un coproceso y te pones a leer la respuesta (`read -u`), pero el coproceso decide no responder (o falla), tu script principal **se quedará colgado (congelado) para siempre** esperando datos. Para evitar esto, puedes usar un timeout en la lectura:

```bash
if ! read -t 2 -r -u "${WORKER[0]}" respuesta; then
    echo "Error: El worker no respondió a tiempo."
fi

```

**2. El Bloqueo por Buffering (Librerías C):**
En el ejemplo anterior usamos un bucle `while read` nativo de Bash, el cual responde línea por línea. Sin embargo, si tu coproceso es una utilidad externa (como `awk`, `grep`, `bc` o una herramienta CLI), estas herramientas de C detectan que *no están conectadas a una terminal interactiva* (porque están conectadas a un pipe) y cambian su comportamiento a **Block Buffering** (almacenan en caché 4KB de salida antes de enviar nada).

Si intentas leer de un comando externo cacheados, tu script se congelará esperando porque la herramienta aún no ha vaciado (flush) su buffer.

*Solución:* Debes forzar a la herramienta externa a usar "Line Buffering" usando la utilidad `stdbuf` (o `unbuffer`).

```bash
# Anti-patrón (Se congelará porque 'grep' cachea la salida)
# coproc FILTRO { grep "ERROR"; }

# Patrón correcto (Forzamos a grep a escupir línea por línea)
coproc FILTRO { stdbuf -oL grep "ERROR"; }

```

### Resumen de limpieza de FDs

Al igual que vimos en la sección 5.1, dejar FDs abiertos y procesos huérfanos es una mala práctica. Cuando termines con un coproceso, asegúrate de:

1. Cerrar la tubería de escritura (`exec {NOMBRE_COPROC[1]}>&-`).
2. Opcionalmente, esperar a que el proceso termine usando el comando `wait` sobre el PID del coproceso (el cual Bash guarda en una variable especial llamada `NOMBRE_COPROC_PID`).

Exploraremos la recolección de procesos hijos y el uso avanzado de `wait` en el próximo capítulo: **Concurrencia, Señales y Gestión de Procesos**.
