En la ingeniería DevOps, la eficiencia de un script de automatización no solo reside en su lógica, sino en cómo gestiona la información en memoria. Este capítulo profundiza en el motor nativo de Bash para procesar datos sin depender de procesos externos costosos. Aprenderás a dominar la expansión de parámetros para sanear entradas y definir valores por defecto, a implementar indirecciones para arquitecturas dinámicas y a estructurar datos complejos mediante arreglos y diccionarios. Finalmente, exploraremos el uso de *namerefs* para pasar referencias de forma segura entre funciones, elevando tus scripts a un estándar de desarrollo profesional, modular y de alto rendimiento.

## 2.1. Expansión de parámetros a nivel experto: Valores por defecto, sustituciones, extracción de subcadenas y cambio de mayúsculas/minúsculas sin usar utilidades externas

En el ecosistema DevOps, la eficiencia y la resiliencia de un script son primordiales. Un antipatrón clásico en Bash es abusar de tuberías (`pipes`) hacia utilidades externas como `sed`, `awk`, `cut` o `tr` para tareas simples de manipulación de cadenas. Cada vez que invocas un binario externo, el sistema operativo debe realizar un *fork* y ejecutar un nuevo proceso. Si esto ocurre dentro de un bucle masivo (como procesar miles de logs o recursos en la nube), el rendimiento de tu script colapsará.

Bash posee un motor nativo de expansión de parámetros extremadamente potente. Dominar estas expansiones te permite manipular datos directamente en la memoria del shell actual, resultando en ejecuciones órdenes de magnitud más rápidas y con menos dependencias.

---

### Valores por defecto y asignación condicional

Al construir herramientas de automatización, raramente puedes confiar en que el entorno de ejecución proporcionará todas las variables esperadas. Los operadores de expansión condicional te permiten manejar valores nulos o no definidos con elegancia, evitando que tu script falle silenciosamente o ejecute comandos destructivos.

La siguiente tabla resume los cuatro operadores fundamentales. El uso de los dos puntos (`:`) antes del operador evalúa si la variable está **no definida o vacía**. Si omites los dos puntos, solo evalúa si está no definida.

| Sintaxis | Nombre | Comportamiento si `VAR` está vacía o no definida | Comportamiento si `VAR` tiene valor |
| --- | --- | --- | --- |
| `${VAR:-default}` | **Valor por defecto** | Retorna la cadena "default". | Retorna el valor original de `VAR`. |
| `${VAR:=default}` | **Asignación por defecto** | Asigna "default" a `VAR` y luego lo retorna. | Retorna el valor original de `VAR`. |
| `${VAR:?mensaje}` | **Validación estricta** | Imprime "mensaje" en `stderr` y aborta el script. | Retorna el valor original de `VAR`. |
| `${VAR:+alterno}` | **Valor alternativo** | Retorna una cadena vacía (no hace nada). | Retorna la cadena "alterno" (oculta el original). |

**Casos de uso en infraestructura:**

```bash
# 1. Asignar un puerto por defecto si el entorno no lo provee
API_PORT="${APP_PORT:-8080}"

# 2. Asignar un directorio de trabajo y guardarlo en la variable si no existía
WORKDIR="${CI_WORKSPACE:=/tmp/default-build}"

# 3. Abortar la ejecución inmediatamente si falta una credencial crítica
# (Excelente complemento al 'set -e' que vimos en la sección 1.2)
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:?Falta la credencial de AWS}"

# 4. Construir flags opcionales solo si una variable existe
# Si $DEBUG_MODE tiene algún valor, se pasa "--verbose" al comando
helm upgrade mi-app ./chart ${DEBUG_MODE:+--verbose}

```

> **Nota:** El operador `:=` no puede utilizarse con parámetros posicionales (`$1`, `$2`) porque son de solo lectura en Bash. Para ellos, utiliza siempre `:-`.

---

### Extracción y eliminación de prefijos y sufijos

Extraer nombres de archivos de una ruta larga o quitar extensiones son tareas cotidianas. En lugar de usar `basename` o `dirname`, Bash permite recortar patrones desde el inicio (izquierda) o el final (derecha) de una cadena.

**Diagrama de operadores de recorte:**

```text
[ Inicio de la cadena ] ------------------------- [ Fin de la cadena ]
   #  Corta la coincidencia más CORTA desde la izquierda
   ## Corta la coincidencia más LARGA desde la izquierda
   %  Corta la coincidencia más CORTA desde la derecha
   %% Corta la coincidencia más LARGA desde la derecha

```

Estos operadores utilizan "Globbing" (patrones de shell como `*` o `?`), no expresiones regulares puras.

**Ejemplos prácticos:**

```bash
ARCHIVO_PATH="/var/log/containers/nginx-ingress.tar.gz"

# Eliminar desde la izquierda (Prefijos)
echo "${ARCHIVO_PATH#*/}"   # Retorna: var/log/containers/nginx-ingress.tar.gz (Corta hasta el primer '/')
echo "${ARCHIVO_PATH##*/}"  # Retorna: nginx-ingress.tar.gz (Simula 'basename', corta hasta el último '/')

# Eliminar desde la derecha (Sufijos)
echo "${ARCHIVO_PATH%.*}"   # Retorna: /var/log/containers/nginx-ingress.tar (Corta la última extensión)
echo "${ARCHIVO_PATH%%.*}"  # Retorna: /var/log/containers/nginx-ingress (Corta todas las extensiones)

```

---

### Extracción dinámica por Offset y Longitud

Si necesitas extraer una subcadena basada en posiciones exactas, utiliza la sintaxis `${VARIABLE:offset:longitud}`. El índice comienza en cero.

Esta técnica es especialmente útil en pipelines de CI/CD para generar identificadores cortos (como hashes de Git) o leer porciones específicas de un payload.

```bash
GIT_COMMIT="a1b2c3d4e5f6g7h8i9j0"

# Extraer los primeros 7 caracteres (Short SHA clásico de Git/Docker)
SHORT_SHA="${GIT_COMMIT:0:7}"  # Resultado: a1b2c3d

# Omitir los primeros 4 caracteres y capturar el resto
RESTO="${GIT_COMMIT:4}"        # Resultado: c3d4e5f6g7h8i9j0

# Extraer los últimos 5 caracteres (Nota: el offset negativo requiere un espacio previo o paréntesis)
ULTIMOS="${GIT_COMMIT: -5}"    # Resultado: 8i9j0

```

---

### Búsqueda y Reemplazo de Patrones

Sustituir texto al vuelo sin invocar `sed` reduce drásticamente la latencia de ejecución. La sintaxis base es `${VARIABLE/busqueda/reemplazo}`.

* Un solo `/` reemplaza la **primera** ocurrencia.
* Doble `//` reemplaza **todas** las ocurrencias.
* Prefijar la búsqueda con `#` obliga a que coincida solo al **inicio**.
* Prefijar la búsqueda con `%` obliga a que coincida solo al **final**.

```bash
# Formateo de ARNs o recursos en la nube
INSTANCE_TYPE="aws:ec2:t3.micro:us-east-1"

# Reemplazar el primer ':' por '-'
echo "${INSTANCE_TYPE/:/-}"    # aws-ec2:t3.micro:us-east-1

# Reemplazar TODOS los ':' por '-'
echo "${INSTANCE_TYPE//:/-}"   # aws-ec2-t3.micro-us-east-1

# Eliminar una subcadena (al omitir el reemplazo, se borra)
echo "${INSTANCE_TYPE//aws:/}" # ec2:t3.micro:us-east-1

```

---

### Modificación nativa de Mayúsculas y Minúsculas

A partir de Bash 4.0, se integraron operadores nativos para la manipulación de la capitalización. Esto elimina por completo la necesidad de utilizar estructuras engorrosas como `echo "$VAR" | tr '[:upper:]' '[:lower:]'`.

En entornos de infraestructura, normalizar el *input* del usuario o estandarizar variables de entorno es una práctica de seguridad básica para evitar colisiones lógicas.

* `^` : Convierte la primera letra a mayúscula.
* `^^`: Convierte toda la cadena a mayúsculas.
* `,` : Convierte la primera letra a minúscula.
* `,,`: Convierte toda la cadena a minúsculas.
* `~` : Invierte la capitalización (poco común en DevOps, pero disponible).

**Ejemplo de normalización de entornos:**

```bash
USER_INPUT="pRoDuCcIoN"

# Forzar todo a minúsculas para comparaciones seguras
ENV_NORMALIZADO="${USER_INPUT,,}" # Retorna: produccion

# Forzar todo a mayúsculas para definir variables globales
EXPORT_VAR="${USER_INPUT^^}"      # Retorna: PRODUCCION

```

Al dominar la expansión de parámetros, tus scripts no solo se vuelven independientes de la disponibilidad de herramientas GNU específicas en la imagen base (crucial al usar contenedores *Alpine* o *Distroless*), sino que su tiempo de ejecución se minimiza, un factor vital en automatizaciones a gran escala.

## 2.2. Expansión indirecta (`${!var}`) y generación de variables dinámicas

En la automatización de infraestructuras complejas, a menudo nos enfrentamos a escenarios donde el nombre exacto de la variable que necesitamos leer no se conoce hasta el tiempo de ejecución. Esto es habitual al procesar configuraciones generadas dinámicamente, matrices de despliegue en CI/CD, o cuando se diseñan scripts genéricos que deben adaptarse a múltiples entornos (ej. `PROD_DB_HOST` vs. `DEV_DB_HOST`).

La expansión indirecta de Bash, utilizando la sintaxis `${!variable}`, permite tratar el *valor* de una variable como el *nombre* de otra. En términos de programación, actúa como un mecanismo de indirección o puntero ligero nativo del shell.

---

### El problema histórico: El peligroso uso de `eval`

Antes de que la expansión indirecta fuera introducida de forma nativa en Bash 2.0, los administradores de sistemas recurrían al comando `eval` para forzar una doble pasada de análisis sobre una cadena de texto.

**El antipatrón (NO utilizar):**

```bash
ENTORNO="PROD"
VAR_NAME="${ENTORNO}_API_KEY"
PROD_API_KEY="sk_live_12345"

# Método arcaico y peligroso
API_KEY=$(eval echo \$$VAR_NAME)

```

El uso de `eval` es un riesgo crítico de seguridad. Como exploraremos a fondo en el **Capítulo 8 (Prevención de Inyección de Comandos)**, si un atacante logra manipular la variable `VAR_NAME` para inyectar comandos (`VAR_NAME="x; rm -rf /; x"`), `eval` los ejecutará con los privilegios del script.

---

### La solución nativa y segura: `${!var}`

La sintaxis `${!variable}` resuelve este problema evaluando la variable de forma estricta y segura en la memoria del shell, sin invocar un subproceso ni re-evaluar la cadena entera como un comando.

**Diagrama de resolución interna:**

```text
[ 1. Definición ]   PUNTERO="SECRETO_REAL"
[ 2. Definición ]   SECRETO_REAL="super-password-db"

[ 3. Invocación ]   echo "${!PUNTERO}"
                      │
                      ├──> a. Bash lee el valor de $PUNTERO ("SECRETO_REAL")
                      └──> b. Bash busca el valor de la variable llamada "SECRETO_REAL"
                            │
[ 4. Resultado  ]   <───────┴─ Retorna: "super-password-db"

```

**Ejemplo de uso en un Wrapper DevOps:**
Imagina un script de despliegue que recibe el nombre del entorno como argumento y necesita cargar las credenciales correspondientes a ese entorno.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Variables de entorno preexistentes (inyectadas por Jenkins, GitLab CI, etc.)
STG_DATABASE_URL="postgres://user:pass@stg-db:5432/db"
PRD_DATABASE_URL="postgres://user:pass@prd-db:5432/db"

ENVIRONMENT=${1:-STG} # STG por defecto

# 1. Generamos dinámicamente el NOMBRE de la variable objetivo
TARGET_VAR="${ENVIRONMENT}_DATABASE_URL"

# 2. Extraemos el VALOR de la variable objetivo de forma indirecta
DB_URL="${!TARGET_VAR}"

echo "Conectando a la base de datos de ${ENVIRONMENT}..."
# ejecutar_migracion --url "$DB_URL"

```

---

### Listado dinámico: Expansión de prefijos (`${!PREFIJO@}` y `${!PREFIJO*}`)

Una variante sumamente poderosa de la expansión indirecta, introducida en Bash 3.0, permite listar los **nombres** de todas las variables actualmente definidas en el entorno que comiencen con un prefijo específico.

Esta característica es invaluable para construir *parsers* dinámicos que agrupen configuraciones. Por ejemplo, al leer múltiples secretos de AWS o nodos de un clúster sin tener que codificar (hardcodear) cuántos existen.

* `${!PREFIJO@}`: Expande a los nombres de las variables, separándolos de forma segura para iterar (respeta los espacios).
* `${!PREFIJO*}`: Expande a los nombres como una sola cadena concatenada (separada por el primer carácter de `IFS`).

**Caso de uso: Autodescubrimiento de configuraciones**

```bash
# Definimos varias variables dinámicas (simulando inyección externa)
KAFKA_BROKER_1="10.0.1.51:9092"
KAFKA_BROKER_2="10.0.1.52:9092"
KAFKA_BROKER_3="10.0.1.53:9092"
IGNORE_THIS_VAR="no-importa"

echo "Detectando brokers de Kafka configurados:"

# Iteramos sobre todos los NOMBRES de variables que empiecen por "KAFKA_BROKER_"
for broker_var in "${!KAFKA_BROKER_@}"; do
    
    # Usamos expansión indirecta para obtener el VALOR
    broker_ip="${!broker_var}"
    
    echo " -> Encontrado: ${broker_var} con IP ${broker_ip}"
    
    # Aquí podríamos agregarlos dinámicamente a un archivo de configuración
done

```

> **Nota arquitectónica:** Aunque la expansión indirecta (`${!var}`) es robusta, puede volverse difícil de rastrear visualmente en funciones complejas. Como veremos en la **sección 2.4**, Bash 4.3 introdujo la directiva `declare -n` (namerefs), que ofrece un mecanismo aún más limpio y estructurado para pasar variables por referencia, siendo hoy en día el estándar de la industria para scripts modulares. Sin embargo, para extraer valores a partir de cadenas dinámicas simples y para compatibilidad con versiones antiguas (como Bash 3.2 en macOS), `${!var}` sigue siendo una herramienta obligatoria en el arsenal de cualquier ingeniero DevOps.

## 2.3. Arreglos (Arrays) indexados y asociativos (diccionarios): Declaración, iteración, manipulación y borrado seguro

En el desarrollo de scripts de infraestructura, es increíblemente común lidiar con listas de elementos: direcciones IP, nombres de contenedores, identificadores de instancias de AWS o rutas de archivos. El enfoque novato suele consistir en almacenar estos elementos en una única variable de texto separada por espacios o saltos de línea. Sin embargo, esto colapsa tan pronto como un elemento contiene un espacio en blanco (como el nombre de un archivo), provocando vulnerabilidades lógicas y comportamientos impredecibles.

Bash soporta estructuras de datos reales: **Arreglos Indexados** (listas numéricas) y **Arreglos Asociativos** (diccionarios clave-valor, introducidos en Bash 4.0). Su uso correcto es el estándar de oro para manejar colecciones de datos en DevOps.

---

### Arreglos Indexados: Gestión segura de listas

Los arreglos indexados utilizan números enteros como índices (comenzando desde cero). No es estrictamente necesario declararlos previamente, ya que Bash asume que cualquier asignación múltiple es un arreglo indexado, pero usar `declare -a` es una buena práctica de autodocumentación.

**Declaración y Asignación:**

```bash
# Declaración explícita (Recomendado)
declare -a SERVIDORES

# Asignación múltiple
SERVIDORES=("web-01" "db-01" "cache-01")

# Asignación individual
SERVIDORES[3]="worker-01"

# Añadir elementos de forma segura (Append) sin conocer el último índice
SERVIDORES+=("worker-02" "worker-03")

```

**La regla de oro de la iteración:**
El error más común en Bash es usar `*` en lugar de `@` para expandir un arreglo, o no rodear la expansión con comillas dobles.

* `"${ARREGLO[@]}"`: Expande cada elemento como una palabra separada y protegida. **(Úsalo siempre para iterar)**.
* `"${ARREGLO[*]}"`: Concatena todos los elementos en una sola cadena masiva, separados por el primer carácter de la variable `IFS`.

**Ejemplo de iteración robusta:**

```bash
NOMBRES_CON_ESPACIOS=("Archivo Uno.txt" "Archivo Dos.txt")

# CORRECTO: Bash respeta los espacios internos de cada elemento
for archivo in "${NOMBRES_CON_ESPACIOS[@]}"; do
    echo "Procesando: $archivo"
done

```

---

### Arreglos Asociativos (Diccionarios): Mapeo de datos complejos

A partir de Bash 4.0, puedes usar cadenas de texto como índices. Esto te permite crear mapas de configuración directamente en memoria, eliminando la necesidad de invocar utilidades externas como `jq` o crear múltiples bloques `case` para traducciones simples.

**Obligatorio:** Los arreglos asociativos **deben** declararse explícitamente usando `declare -A` (nota la 'A' mayúscula).

**Declaración y uso en infraestructura:**

```bash
# Declaración obligatoria
declare -A REGION_AMIS

# Asignación de pares clave-valor
REGION_AMIS=(
    ["us-east-1"]="ami-0c55b159cbfafe1f0"
    ["eu-west-1"]="ami-08d9a380ce97b6920"
    ["ap-southeast-2"]="ami-02a599eb01e3b3c5b"
)

# Agregar un nuevo par dinámicamente
REGION_AMIS["sa-east-1"]="ami-037c192f0fa52a358"

REGION_ACTUAL="eu-west-1"
echo "La AMI para la región es: ${REGION_AMIS[$REGION_ACTUAL]}"

```

**Iteración sobre Diccionarios:**
A diferencia de los arreglos indexados, en los diccionarios a menudo necesitas conocer la "clave" (key). Bash permite extraer solo las claves añadiendo el operador `!` antes del nombre de la variable.

```bash
# Extraer las CLAVES usando ${!ARREGLO[@]}
for region in "${!REGION_AMIS[@]}"; do
    ami="${REGION_AMIS[$region]}"
    echo "Desplegando en $region usando la imagen $ami"
done

```

---

### Manipulación Avanzada: Longitud y Slicing

Bash permite consultar y recortar arreglos con una sintaxis idéntica a la expansión de cadenas que vimos en la sección 2.1.

* **Longitud del arreglo (Conteo de elementos):** Anteponer `#` al nombre del arreglo.
* **Slicing (Paginación/Extracción):** `${ARREGLO[@]:offset:longitud}`

```bash
NODOS=("nodo-1" "nodo-2" "nodo-3" "nodo-4" "nodo-5")

# 1. ¿Cuántos nodos tenemos?
echo "Total de nodos: ${#NODOS[@]}" # Retorna: 5

# 2. Extraer el primer elemento (útil como nodo líder/master)
LIDER="${NODOS[0]}"

# 3. Extraer el resto (Workers) saltando el primer índice
WORKERS=("${NODOS[@]:1}") 
# WORKERS ahora es ("nodo-2" "nodo-3" "nodo-4" "nodo-5")

# 4. Extraer un lote específico (ej. 2 nodos empezando desde el índice 2)
LOTE=("${NODOS[@]:2:2}")
# LOTE ahora es ("nodo-3" "nodo-4")

```

---

### Borrado Seguro y el fenómeno de los "Arreglos Dispersos"

Eliminar datos en Bash requiere el comando `unset`. Un error crítico es intentar "vaciar" un elemento asignándole una cadena vacía (`ARREGLO[1]=""`). Esto no elimina el elemento; simplemente deja un elemento vacío en esa posición, lo cual romperá la lógica que dependa de la longitud del arreglo.

**El comando correcto:**

```bash
declare -a PROCESOS=("init" "nginx" "cron" "ssh")

# Borrar un elemento específico
unset 'PROCESOS[2]' # Elimina "cron"

# Borrar el arreglo completo (liberar memoria)
unset PROCESOS

```

**Diagrama conceptual: Arreglos Dispersos (Sparse Arrays)**

Cuando usas `unset` en un arreglo indexado, Bash **no reordena** los elementos restantes. Deja un "hueco" en el índice.

```text
[ Estado Inicial ]
Índice:    0        1        2        3
Valor:  [ init ] [ nginx ] [ cron ] [ ssh ]

[ Ejecutando: unset 'PROCESOS[2]' ]
Índice:    0        1                 3
Valor:  [ init ] [ nginx ] [ vacío] [ ssh ]

```

Si intentas acceder a `${PROCESOS[2]}` no obtendrás un error, sino un valor nulo. Sin embargo, si iteras correctamente usando `"${PROCESOS[@]}"`, Bash es lo suficientemente inteligente como para saltarse los huecos e iterar solo sobre los 3 elementos existentes.

Para "reempaquetar" un arreglo disperso y reasignar los índices de forma contigua, debes reasignarlo a sí mismo:

```bash
# Reempaquetado seguro para eliminar huecos de índices
PROCESOS=("${PROCESOS[@]}")

```

El dominio de los arreglos te permite construir scripts de orquestación donde las configuraciones complejas se validan, filtran y transforman en memoria de manera estrictamente tipada (dentro de los límites de Bash), garantizando que las invocaciones posteriores a APIs o herramientas CLI reciban argumentos perfectamente formateados.

## 2.4. Referencias a nombres (`declare -n` / namerefs): Creación de punteros para pasar variables complejas entre contextos

En la sección 2.2 exploramos la expansión indirecta (`${!var}`) para leer variables generadas dinámicamente. Sin embargo, cuando la arquitectura de tu script requiere **modificar** esas variables o, más críticamente, pasar estructuras complejas (como los arreglos y diccionarios de la sección 2.3) hacia adentro de una función, la sintaxis tradicional colapsa.

Hasta Bash 4.2, la única forma de pasar un arreglo a una función era expandiéndolo como una cadena de texto (lo que destruye los índices y mezcla elementos si contienen espacios) o recurriendo nuevamente al peligroso `eval`.

Bash 4.3 cambió las reglas del juego introduciendo las referencias a nombres o **namerefs** mediante `declare -n`. Un nameref es un **puntero transparente**: cualquier operación de lectura, escritura o iteración que realices sobre el nameref, Bash la ejecutará directamente sobre la variable a la que apunta.

---

### El concepto fundamental: Punteros transparentes

Para crear una referencia, utilizas la bandera `-n` al declarar la variable. El valor que le asignes será tratado como el *nombre* de la variable objetivo.

**Diagrama de resolución de Namerefs:**

```text
[ Memoria del Shell ]

Nombre:  APP_STATUS
Valor:   [ "PENDING" ] <-------------------------+
                                                 |
                                                 | (Resolución transparente)
Nombre:  PUNTERO_ESTADO                          |
Valor:   [ "APP_STATUS" ] (declare -n) ----------+

```

**Ejemplo de manipulación directa:**

```bash
AWS_VPC_ID="vpc-12345abc"

# Creamos el puntero
declare -n REF_VPC="AWS_VPC_ID"

# Modificamos el puntero
REF_VPC="vpc-99999xyz"

# La variable original fue alterada
echo "$AWS_VPC_ID"  # Imprime: vpc-99999xyz

```

---

### El "Santo Grial": Pasar arreglos y diccionarios a funciones

El caso de uso definitivo en DevOps para los namerefs es la modularización del código. Imagina que tienes un diccionario con metadatos de configuración (etiquetas, endpoints, límites de recursos) y necesitas pasarlo a una función encargada de generar un archivo YAML o realizar una llamada a una API.

En lugar de intentar pasar los valores, pasamos el **nombre** del arreglo como primer argumento (`$1`) y lo capturamos con `local -n` dentro de la función.

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Definimos nuestro diccionario de configuración (Global)
declare -A POD_LABELS=(
    ["app"]="nginx"
    ["tier"]="frontend"
    ["env"]="production"
)

# 2. Función genérica que recibe cualquier diccionario por referencia
generar_etiquetas_json() {
    # Capturamos el nombre del diccionario pasado como primer argumento
    local -n _ref_diccionario="$1"
    
    echo "{"
    local iteracion=0
    local total=${#_ref_diccionario[@]}
    
    # Iteramos sobre el puntero exactamente igual que un diccionario real
    for clave in "${!_ref_diccionario[@]}"; do
        valor="${_ref_diccionario[$clave]}"
        iteracion=$((iteracion + 1))
        
        if [[ $iteracion -eq $total ]]; then
            echo "  \"$clave\": \"$valor\""
        else
            echo "  \"$clave\": \"$valor\","
        fi
    done
    echo "}"
}

# 3. Invocamos la función pasando solo el NOMBRE de la variable
generar_etiquetas_json "POD_LABELS"

```

Esta técnica te permite construir librerías de funciones altamente reutilizables y tipadas de forma estricta (dentro de las capacidades de Bash), logrando un diseño modular digno de lenguajes de más alto nivel como Python o Go.

---

### Retorno de múltiples valores y modificación de estado

Las funciones en Bash no pueden hacer un `return` de una cadena de texto o un arreglo; el `return` estándar solo devuelve códigos de salida numéricos (0-255). Para devolver datos, la técnica habitual es hacer un `echo` y capturarlo en un subshell: `RESULTADO=$(mi_funcion)`.

Como veremos más a fondo en el **Capítulo 4**, los subshells son costosos a nivel de rendimiento. Los namerefs permiten a las funciones inyectar los resultados directamente en una variable del ámbito superior que se le haya pasado por referencia.

```bash
# Función que calcula memoria límite y request
calcular_recursos_kubernetes() {
    local base_ram_mb="$1"
    local -n _ref_resultado="$2" # Puntero donde guardaremos la respuesta
    
    # Lógica de negocio (modificamos el puntero directamente)
    _ref_resultado["request"]="${base_ram_mb}Mi"
    _ref_resultado["limit"]="$((base_ram_mb * 2))Mi"
}

# Preparamos el diccionario vacío
declare -A RECURSOS_APP

# Llamamos a la función indicando DÓNDE debe inyectar la respuesta
calcular_recursos_kubernetes 512 "RECURSOS_APP"

echo "Request: ${RECURSOS_APP[request]}" # Imprime: 512Mi
echo "Limit:   ${RECURSOS_APP[limit]}"   # Imprime: 1024Mi

```

---

### Precaución: El antipatrón de la referencia circular

Existe un "gotcha" crítico al usar `local -n` en funciones. Si la variable local (el nameref) tiene **exactamente el mismo nombre** que la variable global a la que intenta apuntar, Bash lanzará un error de referencia circular (circular name reference).

**El error:**

```bash
# MAL USO:
mi_funcion() {
    local -n CONFIG_APP="$1" # ¡Peligro si $1 es "CONFIG_APP"!
}

```

**La solución arquitectónica:**
Para evitar colisiones de nombres espurias en bases de código grandes, adopta una convención de nomenclatura estricta para tus namerefs locales. El estándar *de facto* es utilizar el prefijo `_ref_` u otro identificador exclusivo, garantizando que nunca coincidirán con los nombres de las variables globales de infraestructura que se les están pasando.
