La eficiencia en DevOps depende de la capacidad de Bash para ejecutar tareas en paralelo sin comprometer la integridad del sistema. Este capítulo aborda la transición de scripts secuenciales a arquitecturas concurrentes robustas. Aprenderás a orquestar procesos en segundo plano mediante el control nativo de **Jobs** y PIDs, a implementar **Rate Limiting** dinámico para proteger tus APIs y a construir scripts resilientes que limpian sus propios recursos ante fallos mediante el manejo avanzado de señales POSIX (**trap**). Finalmente, garantizaremos la consistencia de datos en entornos multihilo utilizando bloqueos de archivos con **flock**, eliminando las peligrosas condiciones de carrera.

## 6.1. Control nativo de "Jobs" en scripts: Lanzamiento en background (`&`), recolección segura (`wait`), y gestión de PIDs hijos

En el desarrollo de automatizaciones para infraestructura, la ejecución secuencial es a menudo un cuello de botella inaceptable. Si necesitamos descargar artefactos de tres buckets de S3 diferentes, aprovisionar varios nodos o consultar múltiples APIs, hacerlo uno tras otro desperdicia un tiempo valioso. Bash nos provee primitivas nativas de concurrencia que, si bien son de bajo nivel, resultan extremadamente poderosas si se gestionan con rigor.

Es importante hacer una distinción fundamental: en un entorno de terminal interactiva, solemos utilizar comandos como `jobs`, `fg` o `bg`. Sin embargo, en la ejecución de scripts (entornos no interactivos, como vimos en el Capítulo 1.4), el "Job Control" del shell está desactivado por defecto. En automatización no hablamos con "jobs" interactivos, sino que operamos directamente a nivel de sistema operativo mediante **PIDs (Process IDs)**.

### Lanzamiento de procesos en segundo plano: El operador `&` y la variable `$!`

Para desacoplar la ejecución de un comando del hilo principal del script, basta con añadir el operador de control `&` al final de la instrucción. Esto instruye a Bash a realizar un *fork* del proceso (ejecutándolo en una subshell) y devolver el control al script principal de forma inmediata, sin esperar a que la tarea termine.

El desafío en DevOps no es lanzar procesos, sino no perder su rastro. En el milisegundo exacto en que enviamos un proceso al background, Bash actualiza una variable especial de solo lectura: **`$!`**. Esta variable contiene el PID del último proceso puesto en segundo plano.

```bash
#!/usr/bin/env bash
set -euo pipefail # Recordemos el Strict Mode (Capítulo 1.2)

echo "[MAIN] Iniciando respaldo de base de datos..."

# Lanzamos una tarea pesada al background
pg_dump -U admin db_produccion > /backup/db_prod.sql 2> /backup/db_prod.log &

# Capturamos el PID inmediatamente
PID_RESPALDO=$!

echo "[MAIN] Respaldo ejecutándose en el PID: $PID_RESPALDO"
echo "[MAIN] El script principal puede continuar con otras tareas..."

```

**Advertencia de concurrencia:** Si lanzas múltiples comandos con `&` muy rápido, `$!` se sobrescribirá con el PID del *último* comando lanzado. Debes guardar el valor de `$!` en tu propia variable inmediatamente después de cada lanzamiento.

### Gestión de múltiples PIDs hijos mediante Arrays

Cuando necesitamos paralelizar una carga de trabajo variable (por ejemplo, iterar sobre una lista de servidores), la mejor estrategia es combinar el lanzamiento en background con los Arrays indexados que dominamos en el Capítulo 2.3.

```bash
#!/usr/bin/env bash

SERVIDORES=("web-01" "web-02" "web-03" "web-04")
declare -a PIDS_HIJOS=()

for server in "${SERVIDORES[@]}"; do
    echo "Lanzando actualización en $server..."
    
    # Simulamos una tarea remota vía SSH
    ssh "admin@$server" 'apt-get update && apt-get upgrade -y' > "/var/log/update_${server}.log" 2>&1 &
    
    # Almacenamos el PID en nuestro array
    PIDS_HIJOS+=($!)
done

echo "Se han lanzado ${#PIDS_HIJOS[@]} tareas en paralelo. PIDs: ${PIDS_HIJOS[*]}"

```

*Nota sobre I/O:* Observa cómo en el ejemplo anterior redirigimos la salida estándar y de error a archivos independientes basados en el nombre del servidor. Si múltiples procesos en background escriben a `stdout` simultáneamente sin redirección, los flujos se intercalarán, corrompiendo la salida (tema que profundizamos en el Capítulo 5).

### Sincronización y recolección segura: El comando `wait`

Lanzar procesos al vacío es peligroso. Un script de DevOps robusto debe bloquearse en un punto estratégico y esperar a que sus hijos terminen antes de proceder al siguiente paso (por ejemplo, no puedes reiniciar un balanceador de carga hasta que todos los nodos web hayan terminado de actualizarse).

Aquí es donde entra el comando nativo `wait`.

#### Diagrama de flujo de ejecución con `wait`

```text
Tiempo
  |    [Script Principal]
  |      |
  |      +---(Comando A &)-----> [Proceso Hijo A]
  |      |                          |
  |      +---(Comando B &)-----> [Proceso Hijo B]
  |      |                          |
  |    [ wait $PID_A $PID_B ]       |
  |      |  (Bloqueado)             |
  |      |                          X (A termina)
  |      |                          |
  |      |                          X (B termina)
  |      V
  |    (Desbloqueado - Continúa la ejecución)
  V

```

`wait` puede utilizarse de dos formas principales:

**1. `wait` (sin argumentos):**
Pausa el script principal hasta que **todos** los procesos hijos en background hayan terminado. Es útil para scripts simples, pero tiene una deficiencia crítica para DevOps: siempre devuelve un código de salida `0`, ocultando si alguno de los hijos falló.

**2. `wait <PID1> <PID2> ...` (Recomendado):**
Espera a procesos específicos. Su superpoder es que **adopta el código de salida (exit code) del proceso que acaba de esperar**. Esto nos permite implementar manejo de errores estricto en flujos paralelos.

### Implementando recolección estricta de códigos de salida

Para asegurar que ninguna falla pase desapercibida (un requisito fundamental para no romper la regla `set -e` de nuestro Strict Mode), debemos iterar sobre nuestros PIDs guardados e inspeccionar cómo terminaron:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ... (código previo donde llenamos el array PIDS_HIJOS) ...

ERRORES=0

echo "[MAIN] Esperando a que las tareas finalicen..."

# Iteramos sobre los PIDs guardados para recolectar sus exit codes
for pid in "${PIDS_HIJOS[@]}"; do
    # Desactivamos temporalmente 'set -e' solo para el wait, 
    # de lo contrario, un wait fallido mataría el script principal de inmediato.
    set +e
    wait "$pid"
    EXIT_CODE=$?
    set -e
    
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo "❌ ERROR: El proceso hijo con PID $pid falló (Exit Code: $EXIT_CODE)."
        ((ERRORES++))
    else
        echo "✅ Proceso hijo con PID $pid completado exitosamente."
    fi
done

if [[ $ERRORES -gt 0 ]]; then
    echo "CRÍTICO: $ERRORES tarea(s) en background fallaron. Abortando pipeline."
    exit 1
fi

echo "[MAIN] Todas las tareas paralelas finalizaron correctamente."

```

### Consideraciones sobre procesos huérfanos

Es vital entender que `wait` solo bloquea la ejecución del script padre; no vincula el ciclo de vida de los procesos. Si el script principal es interrumpido abruptamente (por ejemplo, recibiendo un `SIGINT` con Ctrl+C, o si el contenedor es destruido), los procesos lanzados con `&` **seguirán ejecutándose en el sistema operativo** como procesos huérfanos, consumiendo recursos o alterando estados de manera incontrolada.

Para construir scripts verdaderamente resilientes que limpien sus propios hijos al morir, necesitaremos combinar esta gestión de PIDs con las trampas POSIX (`trap`), un concepto vital que integraremos en la sección **6.3**.

## 6.2. Técnicas de paralelización de tareas y control de colas (Rate limiting) nativo en Bash

En la sección anterior vimos cómo lanzar procesos al background con `&` y esperar por ellos con `wait`. Sin embargo, en el mundo real del DevOps, lanzar tareas de forma ilimitada es una receta para el desastre. Si intentamos paralelizar la descarga de 5,000 logs desde S3 iterando con un `&` desenfrenado, provocaremos un agotamiento de memoria (OOM), nos quedaremos sin File Descriptors, o sufriremos un bloqueo por *Rate Limiting* (HTTP 429) por parte de la API de AWS.

Necesitamos limitar la concurrencia. A continuación, exploraremos tres arquitecturas nativas en Bash para gestionar colas de trabajo, desde la más básica hasta un patrón avanzado de semáforos.

### Nivel 1: Procesamiento por Lotes (El enfoque "Ingenuo")

La forma más sencilla de limitar procesos es agruparlos en lotes o *batches*. Lanzamos `N` tareas, usamos `wait` (sin argumentos o iterando), y luego lanzamos el siguiente lote. Para esto, utilizamos el operador módulo `%`.

```bash
#!/usr/bin/env bash
set -euo pipefail

TAREAS=( {1..50} )
MAX_CONCURRENCIA=5

echo "[INFO] Iniciando procesamiento por lotes (Max: $MAX_CONCURRENCIA)..."

for i in "${!TAREAS[@]}"; do
    tarea="${TAREAS[$i]}"
    
    # Simulamos una tarea en background (ej. compresión de imagen o llamada API)
    sleep "$((RANDOM % 3 + 1))" & 
    
    # Si alcanzamos el límite del lote, esperamos a que TODOS terminen
    if (( (i + 1) % MAX_CONCURRENCIA == 0 )); then
        wait
        echo "Lote completado. Continuando..."
    fi
done
wait # Esperar a los remanentes del último lote incompleto

```

**El problema de este enfoque:** Sufre del "síndrome del cuello de botella". Si en un lote de 5 tareas, 4 terminan en 1 segundo pero la quinta tarda 30 segundos, los otros 4 "slots" de ejecución quedarán inactivos durante 29 segundos. No es una cola eficiente.

### Nivel 2: La Cola Deslizante con `wait -n` (Bash 4.3+)

Para mantener siempre el nivel máximo de concurrencia activo sin importar cuánto tarde cada tarea individual, necesitamos saber cuándo termina *cualquier* proceso hijo para lanzar inmediatamente el siguiente.

A partir de Bash 4.3, el comando `wait` introdujo la bandera `-n`, que en lugar de esperar a un proceso específico, **espera a que el primer proceso en background termine** y devuelve el control al script.

```bash
#!/usr/bin/env bash
# Requiere Bash >= 4.3

TAREAS=( "nodo-a" "nodo-b" "nodo-c" "nodo-d" "nodo-e" "nodo-f" )
MAX_WORKERS=3
ACTIVOS=0

for tarea in "${TAREAS[@]}"; do
    # Lanzar tarea
    (
        echo " -> Procesando $tarea..."
        sleep "$((RANDOM % 4))"
    ) &
    
    ((ACTIVOS++))
    
    # Si llegamos al límite de workers, esperamos a que UNO (cualquiera) termine
    if (( ACTIVOS >= MAX_WORKERS )); then
        wait -n
        ((ACTIVOS--)) # Liberamos un slot
    fi
done

# Esperamos a que terminen los workers restantes
wait
echo "Procesamiento de cola deslizante completado."

```

Este modelo maximiza el uso de CPU/Red, ya que la cola fluye dinámicamente.

### Nivel 3: El patrón "Semáforo" con File Descriptors y FIFOs (Nivel Experto)

El método con `wait -n` es excelente, pero en scripts muy masivos o cuando manejamos concurrencia desde múltiples funciones (o incluso subshells), llevar la cuenta con la variable `ACTIVOS` puede volverse inestable o propicio a *Race Conditions*.

Aquí es donde aplicamos el poder de los Descriptores de Archivos (Capítulo 5). Podemos construir un **Semáforo** robusto a nivel de sistema operativo utilizando un *Named Pipe* (FIFO).

#### Diagrama de arquitectura del Semáforo en Bash

```text
       [ Tubería FIFO (Descriptor 3) ]
       | Token | Token | Token | (Max 3)
       +-------+-------+-------+

[Bucle Principal]
 1. Intenta leer un Token (read -u 3). Si la FIFO está vacía, se bloquea.
 2. Si obtiene un Token, lanza la tarea en background (&).
 
 [Proceso Hijo en Background]
 1. Ejecuta la carga de trabajo útil.
 2. Al terminar, devuelve un Token a la FIFO (echo >&3) para liberar el espacio.

```

#### Implementación del Semáforo

Esta técnica es infalible porque la sincronización de bloqueo la gestiona el kernel de Linux a través del pipe, no nuestra lógica de script.

```bash
#!/usr/bin/env bash
set -euo pipefail

CONCURRENCIA=4
FIFO_PATH=$(mktemp -u) # Generamos un nombre temporal

# 1. Creamos la tubería nombrada (FIFO)
mkfifo "$FIFO_PATH"

# 2. Asignamos el Descriptor de Archivos 3 a la FIFO para lectura/escritura (Capítulo 5.1)
exec 3<> "$FIFO_PATH"

# Borramos el archivo del disco; el sistema lo mantiene vivo 
# en memoria porque el FD 3 lo está usando. (Seguridad: Capítulo 8.1)
rm -f "$FIFO_PATH"

# 3. Inicializamos el Semáforo (Cargamos los "Tokens")
for ((i=0; i<CONCURRENCIA; i++)); do
    echo >&3 
done

echo "[MAIN] Semáforo inicializado con $CONCURRENCIA tokens de concurrencia."

# 4. Bucle de procesamiento
for iteracion in {1..20}; do
    
    # Bloqueante: Tomamos un token de la FIFO. 
    # Si no hay, el bucle se pausa mágicamente aquí hasta que un hijo libere uno.
    read -u 3
    
    # Subshell para el worker
    (
        # Simular trabajo
        printf "Iniciando worker %02d...\n" "$iteracion"
        sleep "$((RANDOM % 3 + 1))"
        
        # Devolver el token a la FIFO al terminar para desbloquear el bucle principal
        echo >&3
    ) &

done

# Esperar a que terminen los últimos hijos en ejecución
wait

# Limpieza profunda: cerramos el Descriptor de Archivos 3
exec 3>&-

echo "[MAIN] Operación masiva paralelizada finalizada con éxito."

```

### Cuándo elegir qué técnica

1. **Lotes (`%` y `wait`):** Útil para APIs que limitan estrictamente por *ráfagas* de tiempo (Ej: "Máximo 50 peticiones cada 10 segundos"). En lugar de fluir constantemente, fuerzas una pausa estricta por lote.
2. **Cola deslizante (`wait -n`):** El estándar moderno para paralelizar tareas locales simples (compresión de archivos, resolución de DNS masiva). Rápido de implementar y fácil de leer.
3. **Semáforo (FIFO + FDs):** El patrón arquitectónico definitivo para scripts pesados de infraestructura. Es thread-safe por naturaleza, permite encolamiento desde múltiples sub-procesos concurrentes y soporta cargas de trabajo altamente impredecibles sin corromper el estado de las variables.

Con el control de *jobs* y concurrencia dominados, el siguiente paso crítico es prever qué sucede si un usuario cancela este script paralelo a la mitad de su ejecución. ¿Cómo matamos a todos estos hijos sin dejar procesos zombie? Lo resolveremos en la **Sección 6.3** mediante el manejo avanzado de señales (`trap`).

## 6.3. Manejo avanzado de señales POSIX: Captura y limpieza profunda con `trap` (SIGINT, SIGTERM, EXIT, ERR)

En el ecosistema DevOps, los scripts no se ejecutan en el vacío. Corren en contenedores de Kubernetes que pueden recibir un `SIGTERM` para escalar hacia abajo, en pipelines de CI que pueden ser cancelados por un desarrollador (`SIGINT`), o pueden fallar catastróficamente debido a una red inestable (`ERR`).

Un script profesional debe ser **bien educado**: si va a morir, debe limpiar su entorno. Para ello, utilizamos el comando nativo `trap`.

### El comando `trap`: El interruptor de emergencia

`trap` permite registrar una pieza de código (usualmente una función de limpieza) que Bash ejecutará automáticamente cuando el script reciba una señal específica del sistema operativo.

**Sintaxis fundamental:**
`trap 'comando_o_funcion' SEÑAL1 SEÑAL2 ...`

#### Las señales críticas en DevOps

1. **`EXIT` (Pseudo-señal):** Es la más útil. Se dispara siempre que el script termina, ya sea por éxito, error o porque llegó al final. Es el lugar ideal para borrar archivos temporales.
2. **`SIGINT` (Signal 2):** Se envía cuando alguien presiona `Ctrl+C`.
3. **`SIGTERM` (Signal 15):** La señal estándar de terminación. Es la que envían herramientas como `docker stop` o `kubectl` para pedirle a un proceso que se detenga elegantemente.
4. **`ERR` (Pseudo-señal):** Se dispara cada vez que un comando falla (devuelve un código distinto de 0). Es la base para implementar *Stack Traces* (que veremos en el Capítulo 7.2).

### Patrón de diseño: La función `cleanup`

La mejor práctica es centralizar toda la lógica de salida en una única función.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Creamos un recurso temporal
TEMP_DIR=$(mktemp -d)
echo "[INFO] Trabajando en $TEMP_DIR"

# Definimos la limpieza
cleanup() {
    local exit_code=$? # Capturamos el último código de salida
    echo "[CLEANUP] Recibida señal de salida. Código: $exit_code"
    
    # Borrar archivos temporales
    rm -rf "$TEMP_DIR"
    echo "[CLEANUP] Archivos temporales eliminados."
    
    exit "$exit_code"
}

# Registramos la trampa para EXIT, SIGINT y SIGTERM
trap cleanup EXIT SIGINT SIGTERM

# Simulación de carga de trabajo
sleep 10

```

### Gestión de "Hijos Zombies": Limpieza en procesos paralelos

Un error común en la paralelización (sección 6.2) es que, al recibir un `SIGINT`, el script principal muere pero sus procesos hijos (`&`) siguen corriendo. Para evitar esto, debemos matar explícitamente al grupo de procesos.

```bash
declare -a PIDS_HIJOS=()

lanzar_worker() {
    ( sleep 30 ) &
    PIDS_HIJOS+=($!)
}

cleanup_profundo() {
    echo "[WARNING] Interrupción detectada. Matando procesos hijos..."
    for pid in "${PIDS_HIJOS[@]}"; do
        # Matamos al hijo solo si sigue vivo
        kill "$pid" 2>/dev/null || true
    done
    exit 1
}

trap cleanup_profundo SIGINT SIGTERM

```

#### Diagrama de flujo de una señal interceptada

```text
Flujo Normal              Evento Externo              Flujo de Trampa
------------              --------------              ---------------
[Ejecutando...]                                       
      |                                               
      | <--------------- [ Recibe SIGTERM ]           
      |                                               
(Pausa ejecución) ----------------------------------> [ Ejecuta cleanup() ]
                                                            |
                                                      [ Borra temporales ]
                                                            |
                                                      [ Mata hijos PIDs ]
                                                            |
<---------------------------------------------------- [ exit $code ]
(Proceso finaliza)

```

### Consideraciones Avanzadas

* **Herencia de trampas:** Las subshells `( ... )` heredan las trampas del padre, pero pueden sobrescribirlas. Esto es vital cuando diseñas funciones complejas.
* **Señal `SIGKILL` (Signal 9):** Esta señal **no puede ser capturada**. Si el kernel envía un `kill -9`, tu script morirá instantáneamente sin ejecutar el `cleanup`. Por ello, en Kubernetes, siempre debemos dar tiempo entre el `SIGTERM` y el `SIGKILL` (el `terminationGracePeriodSeconds`).

## 6.4. Sincronización y prevención de condiciones de carrera (Race Conditions) mediante bloqueos de descriptores con `flock`

Con la capacidad de paralelizar procesos (6.2) y manejar señales de limpieza (6.3), surge un nuevo y peligroso problema: las **Condiciones de Carrera (Race Conditions)**.

En DevOps, una condición de carrera ocurre cuando dos o más procesos intentan leer, modificar y escribir sobre un recurso compartido al mismo tiempo. Si dos pipelines de CI paralelos intentan actualizar el mismo archivo de estado de Terraform o escribir en el mismo manifiesto de Kubernetes de forma simultánea, el resultado será un archivo corrupto o la pérdida silenciosa de datos.

Dado que Bash no posee *mutexes* o semáforos en memoria nativos como lenguajes de alto nivel (Go o Python), debemos recurrir al sistema de archivos del kernel de Linux mediante el comando **`flock`** (File Lock).

### El principio de los bloqueos consultivos (Advisory Locks)

Es fundamental entender que `flock` en Linux implementa "bloqueos consultivos". Esto significa que el kernel no impide físicamente que otro proceso modifique el archivo; el bloqueo solo funciona **si todos los procesos competidores acuerdan usar `flock**` antes de interactuar con el recurso. Es un sistema basado en el honor.

### Método 1: Envoltorio de comandos (Command Wrapper)

La forma más sencilla de usar `flock` es como un envoltorio externo. Es el estándar de oro para prevenir que un *Cronjob* se superponga consigo mismo si la ejecución anterior tardó más de lo esperado.

```bash
# En el crontab (ejecutando cada minuto)
* * * * * root flock -n /var/lock/backup_db.lock /usr/local/bin/backup_db.sh

```

* **`-n` (`--nonblock`):** Si el bloqueo ya existe (el script anterior sigue corriendo), `flock` fallará inmediatamente con un código de salida `1` en lugar de quedarse esperando infinitamente.

Si prefieres esperar un tiempo prudencial antes de rendirte, puedes usar un *timeout*:

```bash
# Espera hasta 30 segundos por el bloqueo; si no, falla.
flock -w 30 /var/lock/deploy.lock ./deploy.sh

```

### Método 2: Bloqueo de Descriptores de Archivos (El enfoque arquitectónico)

Aplicar `flock` desde fuera de un script está bien para crons, pero cuando construimos herramientas complejas, necesitamos gestionar las "secciones críticas" de código internamente. Aquí es donde combinamos `flock` con la manipulación de Descriptores de Archivos (FDs) que dominamos en el **Capítulo 5**.

Podemos abrir un Descriptor de Archivos hacia un archivo de bloqueo, aplicar `flock` a ese descriptor, ejecutar nuestra lógica y luego cerrar el descriptor.

#### Diagrama de resolución de Race Condition con `flock`

```text
Tiempo
  |       [Worker 1]                             [Worker 2]
  |    (Llega al bloque)                      (Llega al bloque)
  |    flock FD 9 (ÉXITO)                     flock FD 9 (BLOQUEADO)
  |           |                                      |
  |    [ SECCIÓN CRÍTICA ]                           | (En espera)
  |    (Lee estado.json)                             |
  |    (Modifica datos)                              |
  |    (Escribe estado.json)                         |
  |           |                                      |
  |    Cierra FD 9 (Libera) ----------------> flock FD 9 (ÉXITO)
  |           |                               [ SECCIÓN CRÍTICA ]
  V    (Continúa ejecución)                   (Lee estado.json actualizado)

```

#### Implementación en Bash puro

Imagina que tenemos un script donde múltiples procesos paralelos en background necesitan escribir en un archivo maestro de logs o actualizar un inventario unificado sin sobreescribirse.

```bash
#!/usr/bin/env bash
set -euo pipefail

INVENTARIO="/tmp/inventario_global.txt"
LOCK_FILE="/tmp/inventario.lock"

# Aseguramos que el archivo de lock existe
touch "$LOCK_FILE"

actualizar_inventario() {
    local servidor=$1
    local estado=$2
    
    echo "[$servidor] Preparando actualización..."
    # (Simulamos trabajo previo a la sección crítica)
    sleep "$((RANDOM % 3))"

    # --- INICIO DE SECCIÓN CRÍTICA ---
    # Asignamos el Descriptor de Archivos 9 (arbitrario) al archivo de lock
    exec 9> "$LOCK_FILE"
    
    # Adquirimos el bloqueo (se pausa aquí hasta que esté libre)
    flock 9
    
    echo "[$servidor] ---> LOCK ADQUIRIDO. Escribiendo en inventario..."
    # Solo un proceso a la vez puede ejecutar este bloque
    echo "$(date '+%H:%M:%S') - $servidor: $estado" >> "$INVENTARIO"
    sleep 1 # Simulamos I/O lento
    
    # Liberamos el bloqueo cerrando el Descriptor de Archivos 9
    exec 9>&-
    # --- FIN DE SECCIÓN CRÍTICA ---
    
    echo "[$servidor] <--- LOCK LIBERADO."
}

# Lanzamos actualizaciones concurrentes que causarían una Race Condition sin flock
actualizar_inventario "web-01" "ACTUALIZADO" &
actualizar_inventario "web-02" "ACTUALIZADO" &
actualizar_inventario "db-01"  "REINICIADO" &

wait
echo "[MAIN] Ejecución concurrente finalizada sin corrupción de datos."
cat "$INVENTARIO"

```

### Ventaja de seguridad: Prevención de Deadlocks (Interbloqueos)

Una de las grandes ventajas de usar `flock` sobre Descriptores de Archivos en Bash es su **limpieza automática garantizada por el kernel**.

Si analizamos el script anterior bajo el lente del manejo de errores (Capítulo 6.3), ¿qué ocurre si el proceso es aniquilado con `SIGKILL` (kill -9) justo mientras está dentro de la sección crítica (teniendo el lock adquirido)? ¿Quedará el sistema bloqueado para siempre (Deadlock)?

**La respuesta es No.** `flock` asocia el bloqueo al archivo abierto, no al proceso físico en sí. Cuando el proceso muere (sin importar cuán abruptamente), el kernel de Linux recolecta y cierra automáticamente todos los Descriptores de Archivos asociados a ese proceso. Al cerrarse el descriptor, **el bloqueo se libera instantáneamente en el sistema de archivos**, permitiendo que el siguiente proceso en la fila (Worker 2 en nuestro diagrama) proceda sin intervención manual.

Con esto, nuestra caja de herramientas de concurrencia está completa. Podemos lanzar procesos paralelos (`&`), mantener colas limitadas (`wait -n`), limpiar la "basura" en caso de cancelación (`trap`), y garantizar la atomicidad de los datos compartidos (`flock`).
