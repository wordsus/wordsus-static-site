Un script de infraestructura en producción es una pieza de software crítica, no un simple borrador. En el ecosistema DevOps, la resiliencia se construye sustituyendo la intuición por metodologías rigurosas. Este capítulo aborda la transformación de Bash en un entorno de desarrollo profesional: desde el rastreo quirúrgico con `set -x` y la telemetría avanzada mediante un `PS4` dinámico, hasta la implementación de *stack traces* manuales con `caller`. Estableceremos el análisis estático con ShellCheck como barrera infranqueable en el CI y culminaremos con el desarrollo guiado por pruebas (TDD) usando BATS, garantizando que cada automatización sea auditable, robusta y libre de efectos laterales.

## 7.1. Técnicas de rastreo de ejecución: Uso inteligente de `set -x` y personalización dinámica del prompt de debug (`PS4`)

Cuando los scripts de infraestructura crecen en complejidad, la técnica clásica de esparcir `echo "Llegó aquí"` o `echo "Valor: $var"` por todo el código deja de ser escalable y se convierte en una carga técnica. Para diagnosticar comportamientos inesperados, Bash proporciona un microscopio integrado: el modo de rastreo de ejecución (*xtrace*), activado mediante `set -x`.

Sin embargo, en el contexto DevOps, habilitar el rastreo de forma global (`bash -x script.sh`) en un pipeline de CI/CD o en un proceso de despliegue generará miles de líneas de ruido, ocultando la verdadera causa del problema. El dominio de esta herramienta radica en su **uso quirúrgico y en la personalización del contexto** que nos devuelve.

### El uso inteligente de `set -x` (xtrace)

El comportamiento por defecto de `set -x` es imprimir cada comando en la salida de error estándar (stderr) *después* de que Bash haya resuelto todas las expansiones de variables, sustituciones de comandos y evaluaciones lógicas, pero *antes* de ejecutarlo.

**1. Activación y desactivación selectiva**
En lugar de rastrear todo el script, envuelve únicamente la sección crítica que está fallando. Esto limita el ruido en los logs.

```bash
# ... código previo sin rastrear ...

set -x # Activa el modo debug (xtrace)
resultado=$(realizar_calculo_complejo "$parametro")
procesar_resultado "$resultado"
set +x # Desactiva el modo debug

# ... el script continúa silenciosamente ...

```

**2. Aislamiento de logs de rastreo con `BASH_XTRACEFD`**
Este es uno de los secretos mejor guardados en el desarrollo avanzado de Bash. Por defecto, `set -x` envía su salida al descriptor de archivo 2 (stderr). Si tu script está siendo consumido por otra herramienta que falla si detecta texto en stderr, habilitar `set -x` romperá el pipeline.

Como vimos en el capítulo sobre descriptores de archivos (FDs), podemos desviar exclusivamente el tráfico de depuración hacia un archivo de logs dedicado utilizando la variable de entorno `BASH_XTRACEFD`.

```bash
# Asignamos el FD 3 a un archivo de log temporal
exec 3> /var/log/mi_script_debug.log

# Le decimos a Bash que envíe el rastreo de 'set -x' al FD 3
export BASH_XTRACEFD=3

set -x
echo "Este comando se ejecuta normalmente"
# El rastreo del comando anterior (ej. '+ echo ...') fue directamente al log,
# dejando intactos stdout (1) y stderr (2).
set +x

```

### Personalización dinámica del prompt de debug (`PS4`)

Cada vez que `set -x` imprime la evaluación de un comando, lo precede con el valor de la variable de entorno `PS4`. Por defecto, el valor de `PS4` es simplemente `+` (un signo más seguido de un espacio).

Este valor por defecto aporta cero contexto. Si tienes un script de 500 líneas o dependes fuertemente de funciones, un simple `+` no te dirá dónde ocurrió la ejecución. Podemos inyectar variables dinámicas en `PS4` para crear un prompt de depuración de nivel profesional.

**Variables esenciales para un `PS4` avanzado:**

* `$LINENO`: (Se profundizará en la siguiente sección) Muestra el número de línea exacto.
* `${BASH_SOURCE[0]}`: El nombre del archivo o librería que se está ejecutando (vital si aplicas la arquitectura modular del Capítulo 4).
* `$FUNCNAME`: El nombre de la función actual.
* `$SECONDS` o llamadas al comando `date`: Para añadir marcas de tiempo (timestamps) a cada paso.

**Implementación de un `PS4` para DevOps:**

```bash
# Definimos un PS4 rico en contexto.
# Nota: Usamos comillas simples para que la expansión ocurra EN TIEMPO DE EJECUCIÓN, 
# no en el momento de definir la variable.

export PS4='+ [$(date "+%H:%M:%S.%3N")] [${BASH_SOURCE[0]}:$LINENO] [${FUNCNAME[0]:-main}] '

set -x
funcion_despliegue() {
    local target=$1
    echo "Desplegando en $target"
}

funcion_despliegue "producción"
set +x

```

**Salida resultante:**

```text
+ [14:22:15.123] [script.sh:10] [main] funcion_despliegue producción
+ [14:22:15.125] [script.sh:7] [funcion_despliegue] local target=producción
+ [14:22:15.126] [script.sh:8] [funcion_despliegue] echo 'Desplegando en producción'
Desplegando en producción

```

*Observa cómo la personalización del `PS4` transforma un log ininteligible en una traza de auditoría precisa, ideal para indexar en sistemas como Elasticsearch o Datadog.*

### La magia del primer carácter de `PS4` (Indicador de profundidad)

Es importante entender por qué el `PS4` por defecto comienza con un `+`. Bash tiene una característica oculta: **replica el primer carácter de `PS4` tantas veces como niveles de profundidad existan** en subshells o evaluaciones anidadas.

Si cambias el `PS4` y no incluyes un carácter repetible al inicio, perderás la capacidad de ver a simple vista la anidación (un concepto vital cuando usas sustitución de procesos o subshells).

```text
========================================================================
       DIAGRAMA: EVALUACIÓN DE PROFUNDIDAD CON PS4 (Primer carácter: '+')
========================================================================

Nivel 0 (Main)     | + [script.sh:20] echo "Iniciando..."
                   |
Nivel 1 (Subshell) | ++ [script.sh:21] date +%s
                   |
Nivel 2 (Anidado)  | +++ [script.sh:21] ls -l /tmp
                   |
Nivel 0 (Main)     | + [script.sh:22] echo "Fin."
========================================================================

```

**Mejores prácticas para configurar `PS4`:**

1. **Siempre inicia con un carácter especial:** Preferiblemente `+`, seguido de un espacio u otro delimitador.
2. **Usa comillas simples al exportarlo:** Si usas comillas dobles (`export PS4="+ $LINENO "`), la línea se evaluará *una sola vez* al asignarla. Si usas comillas simples (`export PS4='+ $LINENO '`), la variable se evaluará dinámicamente en cada línea ejecutada.
3. **Cuidado con las llamadas costosas:** Incluir `$(date)` en el `PS4` hace un "fork" del proceso de Bash por cada línea de código ejecutada. En scripts de rendimiento crítico o bucles masivos, esto añadirá un *overhead* significativo. En esos casos, prefiere la variable nativa `$SECONDS`.

## 7.2. Trazabilidad de errores complejos y stack traces manuales con la variable `$LINENO` y el comando `caller`

Como vimos en el Capítulo 1, la activación del "Strict Mode" (`set -euo pipefail`) es innegociable para scripts de infraestructura. Sin embargo, su principal ventaja (abortar inmediatamente ante un fallo) es también su mayor inconveniente operativo: cuando un script de 1,000 líneas aborta silenciosamente, averiguar *dónde* y *por qué* falló se convierte en un trabajo de adivinanza.

A diferencia de lenguajes de alto nivel como Python o Java, Bash no imprime un "stack trace" (traza de la pila de llamadas) por defecto cuando ocurre una excepción. Para sistemas DevOps resilientes, debemos construir esta funcionalidad manualmente combinando variables de entorno dinámicas y comandos internos del shell.

### El límite de `$LINENO`

La variable especial `$LINENO` contiene el número de línea actual del script o función que se está ejecutando. Es útil para logs simples:

```bash
echo "[ERROR] Fallo en la conexión a la base de datos (Línea: $LINENO)"

```

Sin embargo, en arquitecturas modulares (Capítulo 4), un error rara vez ocurre en el script principal. Suele ocurrir profundamente anidado dentro de una librería. Si una función `validar_formato` falla en la línea 45, `$LINENO` valdrá 45, pero **no te dirá qué parte de tu script llamó a esa función** con parámetros inválidos. Para resolver esto, necesitamos mirar hacia atrás en el historial de llamadas.

### El comando `caller`: La pieza faltante del rompecabezas

`caller` es un comando interno (*builtin*) de Bash diseñado específicamente para el debugging. Su propósito es devolver el contexto de cualquier subrutina activa (función o script cargado con `source`).

Toma un único argumento numérico que representa los *frames* (marcos) de la pila de llamadas hacia atrás que deseas consultar:

* `caller 0`: Devuelve información sobre el padre inmediato (quien llamó a la función actual).
* `caller 1`: Devuelve información sobre el "abuelo" (quien llamó al padre).

**Formato de salida de `caller`:**
El comando devuelve una cadena separada por espacios con tres valores fundamentales: `numero_de_linea nombre_de_subrutina nombre_del_archivo`.

```text
========================================================================
       DIAGRAMA: DESENROLLANDO LA PILA CON 'caller'
========================================================================

[Pila de ejecución]                         [Retorno de 'caller' en Func_B]

Nivel Superior: main.sh (Línea 10)      <-- caller 1 (Devuelve: 10 main main.sh)
      |
      v
Nivel 1: Func_A (Línea 25 en util.sh)   <-- caller 0 (Devuelve: 25 Func_A util.sh)
      |
      v
Nivel 2: Func_B (¡FALLO AQUÍ!)          <-- ¡El contexto actual!
========================================================================

```

### Implementación: Construyendo un Stack Trace de nivel Producción

Para crear un sistema de trazabilidad automatizado, combinaremos `caller`, `$LINENO`, la variable `$BASH_COMMAND` (que guarda el texto exacto del comando que se está ejecutando o que acaba de fallar), y el manejo de señales con `trap` (visto en el Capítulo 6.3).

El siguiente patrón debe incluirse en la cabecera de tus scripts principales o en tu librería base:

```bash
#!/bin/bash
set -euo pipefail

# 1. Definimos la función manejadora del error
generar_stack_trace() {
    # Capturamos el código de salida del comando que falló
    local exit_code=$? 
    # Recibimos la línea y el comando exacto desde el trap
    local error_line=$1
    local failed_command=$2

    echo -e "\n========================================" >&2
    echo "[FATAL] El script ha abortado inesperadamente." >&2
    echo "  -> Código de error: $exit_code" >&2
    echo "  -> Línea de fallo : $error_line" >&2
    echo "  -> Comando exacto : $failed_command" >&2
    echo "----------------------------------------" >&2
    echo "Stack Trace:" >&2

    local frame=0
    # caller fallará (devolverá false) cuando alcance el nivel superior, rompiendo el bucle
    while caller_info=$(caller $frame); do
        # Extraemos los datos usando read (aprovechando que la salida está separada por espacios)
        read -r c_line c_sub c_file <<< "$caller_info"
        
        # Formateamos la salida para emular el estilo de otros lenguajes
        echo "  at $c_sub ($c_file:$c_line)" >&2
        
        ((frame++))
    done
    echo "========================================" >&2
    
    # Propagamos el error original hacia afuera
    exit "$exit_code"
}

# 2. Conectamos la función a la señal ERR (Se dispara cuando 'set -e' detecta un fallo)
# Pasamos $LINENO y $BASH_COMMAND evaluados en el momento del fallo
trap 'generar_stack_trace $LINENO "$BASH_COMMAND"' ERR

# ==========================================
# Demostración del Stack Trace en acción
# ==========================================

aplicar_configuracion() {
    local target=$1
    # Simulamos un comando que fallará si el target es inválido
    ls "/directorio/inexistente/$target" 
}

desplegar_infra() {
    aplicar_configuracion "cluster-prod"
}

# Iniciamos la cadena de llamadas
desplegar_infra

```

**Salida generada al fallar:**

```text
ls: no se puede acceder a '/directorio/inexistente/cluster-prod': No existe el archivo o el directorio

========================================
[FATAL] El script ha abortado inesperadamente.
  -> Código de error: 2
  -> Línea de fallo : 42
  -> Comando exacto : ls "/directorio/inexistente/$target"
----------------------------------------
Stack Trace:
  at aplicar_configuracion (script.sh:46)
  at desplegar_infra (script.sh:50)
  at main (script.sh:54)
========================================

```

**Beneficios de esta arquitectura para DevOps:**

1. **Reducción del MTTR (Mean Time To Recovery):** El equipo de operaciones no necesita adivinar el flujo de ejecución; el log les dice exactamente la ruta desde el `main` hasta la función fallida en la librería de utilidades.
2. **Auditoría precisa:** Al usar `>&2` dentro de la función, garantizamos que el stack trace fluya por *stderr*, permitiendo que herramientas de recolección de logs (Filebeat, Fluentd) capturen el volcado completo como un evento de error estructural, sin contaminar la salida estándar esperada del pipeline.

## 7.3. Análisis estático y linting: Integración obligatoria de `ShellCheck` en pipelines de CI

En las secciones anteriores exploramos cómo diagnosticar scripts en tiempo de ejecución (dinámicamente). Sin embargo, en la ingeniería de confiabilidad (SRE) y DevOps existe una máxima fundamental: **el error más barato de solucionar es aquel que nunca llega a ejecutarse**.

Bash es un lenguaje excepcionalmente poderoso, pero su diseño histórico lo hace implacable con los errores de sintaxis invisible, la separación de palabras (word splitting) y las expansiones de comodines (globbing) no deseadas. Confiar únicamente en la revisión humana (Code Review) para detectar la falta de unas comillas dobles en un script de 800 líneas es una garantía de fallo. Aquí es donde entra **ShellCheck**.

### ¿Qué es ShellCheck y por qué es innegociable?

ShellCheck es una herramienta de análisis estático (linter) específica para lenguajes de shell (Bash, sh, ksh). No se limita a verificar que la sintaxis sea válida; actúa como un experto en Bash que lee tu código buscando semántica peligrosa, comportamientos indefinidos, antipatrones heredados y vulnerabilidades de seguridad clásicas.

Veamos un ejemplo clásico de código que "funciona" en pruebas locales pero es una bomba de tiempo en producción:

```bash
# Código frágil (Antipatrón)
directorio_temporal="/tmp/backup_$(date +%Y%m%d)"
for archivo in $(ls $directorio_temporal/*.tar.gz); do
    rm $archivo
done

```

Si pasamos este fragmento por ShellCheck, fallará inmediatamente arrojando los siguientes códigos de error (SC):

* **`SC2045`**: Iterar sobre la salida de `ls` es frágil. Fallará si los nombres de archivo contienen espacios o saltos de línea. Usa globbing nativo (`for archivo in "$directorio_temporal"/*.tar.gz`).
* **`SC2086`**: La expansión de `$directorio_temporal` y `$archivo` no está entre comillas dobles. Esto causará *word splitting* y puede borrar archivos equivocados si las variables contienen espacios.

La versión refactorizada y segura, aprobada por el linter, sería:

```bash
# Código robusto (Aprobado por ShellCheck)
directorio_temporal="/tmp/backup_$(date +%Y%m%d)"
for archivo in "$directorio_temporal"/*.tar.gz; do
    # Evita iterar literalmente si no hay coincidencias
    [[ -e "$archivo" ]] || break 
    rm "$archivo"
done

```

### Integración "Shift-Left": Bloqueando código defectuoso en el CI

Para que el análisis estático sea efectivo, no debe depender de que el desarrollador recuerde ejecutar la herramienta en su terminal. Debe ser una barrera automatizada e inquebrantable en el flujo de integración continua.

```text
========================================================================
       DIAGRAMA: PIPELINE DE PREVENCIÓN DE ERRORES (SHIFT-LEFT)
========================================================================

[Desarrollador] ---> (git push) ---> [Servidor CI (GitHub/GitLab)]
                                              |
                                  [Ejecución de ShellCheck]
                                    /                   \
                            (Fallo - Exit > 0)     (Éxito - Exit 0)
                                  /                       \
[❌ Bloqueo de Merge a Main] <---/                         \---> [✅ Testing / Build]
========================================================================

```

**Ejemplo de implementación en GitHub Actions:**

Añadir este paso al inicio de tu pipeline garantiza que no se desperdicie tiempo de cómputo en levantar entornos de prueba si el script tiene errores estructurales.

```yaml
# .github/workflows/linting.yml
name: Bash Linting

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  shellcheck:
    name: Análisis Estático de Scripts
    runs-on: ubuntu-latest
    steps:
      - name: Descargar repositorio
        uses: actions/checkout@v4

      - name: Ejecutar ShellCheck
        # Escanea todos los archivos .sh en el repositorio de forma recursiva
        run: |
          find . -type f -name "*.sh" -print0 | xargs -0 shellcheck --color=always

```

### Gestión pragmática de reglas: Excepciones explícitas

En el desarrollo de infraestructura real, habrá momentos donde *necesites* romper una regla de ShellCheck intencionalmente (por ejemplo, cuando dependes de que ocurra el *word splitting* para pasar múltiples argumentos almacenados en una variable).

En lugar de desactivar el linter globalmente o ignorar el fallo en el CI, Bash permite inyectar directivas como comentarios para silenciar advertencias específicas **solo en la línea siguiente**. Esto actúa como documentación explícita para otros ingenieros.

```bash
opciones_curl="--silent --fail --max-time 10"

# Explicación: Necesitamos que $opciones_curl se expanda como argumentos separados,
# por lo que intencionalmente evitamos las comillas dobles aquí.

# shellcheck disable=SC2086
curl $opciones_curl "https://api.mi-infra.com/health"

```

**Mejores prácticas para la adopción en repositorios heredados (Legacy):**
Si estás introduciendo ShellCheck en un repositorio antiguo con cientos de scripts, habilitarlo de golpe romperá el CI permanentemente. En estos escenarios, utiliza el flag `--severity`:

1. **Fase 1:** `shellcheck --severity=error` (Solo falla si hay errores críticos de sintaxis o inyecciones evidentes).
2. **Fase 2:** `shellcheck --severity=warning` (El nivel estándar, corrige el *quoting* y antipatrones comunes).
3. **Fase 3:** `shellcheck --severity=info` (Sugerencias estilísticas y mejoras menores).

Al integrar este análisis estático de manera obligatoria, el equipo deja de discutir sobre comillas y corchetes en los Pull Requests, delegando la revisión sintáctica a la máquina y reservando el cerebro humano para analizar la lógica de negocio y la arquitectura del despliegue.

## 7.4. Desarrollo Guiado por Pruebas (TDD) para scripts de infraestructura usando frameworks como `BATS` (Bash Automated Testing System)

Históricamente, los scripts de Bash han sido tratados como "ciudadanos de segunda clase" en el ecosistema del desarrollo de software. Se escriben rápido, se prueban ejecutándolos una vez en la terminal local, y se envían a producción. En un entorno DevOps moderno, donde un script de 50 líneas tiene el poder de aprovisionar o destruir clústeres enteros de Kubernetes o bases de datos de producción, esta aproximación es inaceptable.

El Desarrollo Guiado por Pruebas (TDD - *Test-Driven Development*) cambia el paradigma: escribimos las pruebas que definen el comportamiento esperado *antes* de escribir la lógica del script. Para lograr esto en Bash con rigor ingenieril, el estándar de la industria es **BATS (Bash Automated Testing System)**.

### ¿Qué es BATS?

BATS es un framework de testing para Bash que cumple con el protocolo TAP (*Test Anything Protocol*), lo que significa que sus resultados son nativamente interpretables por plataformas de CI/CD como Jenkins, GitLab CI o GitHub Actions.

BATS proporciona un entorno controlado que aísla la ejecución de tus funciones, evalúa sus códigos de salida (Exit Codes) y permite realizar aserciones sobre lo que el script imprime en `stdout` o `stderr`.

### Anatomía de una suite de pruebas en BATS

Un archivo BATS (generalmente con extensión `.bats`) es esencialmente un script de Bash estructurado con directivas especiales.

```text
========================================================================
       DIAGRAMA: CICLO DE VIDA DE UNA PRUEBA BATS
========================================================================

[ Suite de Pruebas (archivo.bats) ]
  │
  ├── setup()     --> Se ejecuta ANTES de cada bloque @test.
  │                   Ideal para: Crear carpetas /tmp, inicializar variables.
  │
  ├── @test "A"   --> Ejecuta el comando aislado usando `run`.
  │                   Realiza aserciones sobre $status y $output.
  │
  ├── teardown()  --> Se ejecuta DESPUÉS de cada bloque @test (incluso si falla).
  │                   Ideal para: Limpiar FDs, borrar archivos basura.
  │
  └── [Repite ciclo para @test "B", "C", etc...]
========================================================================

```

### Implementación del flujo TDD (Red-Green-Refactor)

Imaginemos que necesitamos construir una función `validar_entorno` que verifique si existe una variable `API_TOKEN`. Si no existe, debe abortar con un código de error específico.

**Paso 1: Escribir la prueba (El estado "Red" - Fallido)**
Creamos el archivo `tests/validar.bats`.

```bash
#!/usr/bin/env bats

# Cargamos el script que vamos a probar (aún no existe o está vacío)
setup() {
    source ./infra_utils.sh
}

@test "Falla y emite error si API_TOKEN no está definido" {
    # 1. Nos aseguramos de que el entorno esté limpio
    unset API_TOKEN
    
    # 2. 'run' es el comando mágico de BATS. 
    # Atrapa la ejecución, captura la salida y EVITA que un 'set -e' mate el test.
    run validar_entorno
    
    # 3. Aserciones (usamos sintaxis clásica de test [ ])
    [ "$status" -eq 1 ]
    [ "$output" = "ERROR: API_TOKEN no está definido." ]
}

@test "Pasa silenciosamente si API_TOKEN está presente" {
    export API_TOKEN="super_secreto_123"
    run validar_entorno
    
    [ "$status" -eq 0 ]
    [ "$output" = "" ]
}

```

Si ejecutamos esto mediante el comando `bats tests/`, las pruebas fallarán porque `validar_entorno` no existe.

**Paso 2: Escribir la implementación (El estado "Green" - Exitoso)**
Ahora, desarrollamos la función en `infra_utils.sh` aplicando los principios de validación robusta:

```bash
#!/bin/bash
# infra_utils.sh

validar_entorno() {
    # Usamos la expansión de parámetros avanzada (Cap. 2.1)
    if [[ -z "${API_TOKEN:-}" ]]; then
        echo "ERROR: API_TOKEN no está definido." >&2
        return 1
    fi
}

```

Al volver a ejecutar BATS, obtenemos la salida limpia y conforme al estándar TAP:

```text
 ✓ Falla y emite error si API_TOKEN no está definido
 ✓ Pasa silenciosamente si API_TOKEN está presente

2 tests, 0 failures

```

### Técnicas DevOps: "Mocking" de binarios y dependencias externas

El mayor desafío al probar scripts de infraestructura es que interactúan con el mundo exterior: realizan llamadas a AWS (`aws-cli`), interactúan con Kubernetes (`kubectl`) o reinician servicios (`systemctl`). No queremos que nuestros tests unitarios en el CI intenten destruir un clúster real o fallen porque `kubectl` no está instalado en el *runner*.

Aquí es donde entra la técnica de **Mocking** (Simulación) nativa en Bash. En BATS, puedes sobrescribir temporalmente un comando del sistema declarando una función con el mismo nombre dentro del archivo de test.

```bash
@test "El script de despliegue invoca a kubectl apply con los argumentos correctos" {
    
    # 1. Creamos un MOCK del comando kubectl
    kubectl() {
        # Validamos qué argumentos intentó pasarle nuestro script
        if [[ "$1" == "apply" && "$2" == "-f" ]]; then
            echo "Mock: Aplicando $3 exitosamente"
            return 0 # Simulamos éxito
        else
            echo "Mock: Comando incorrecto"
            return 1 # Simulamos fallo
        fi
    }
    # Exportamos la función para que los subshells/scripts la utilicen en lugar del binario real
    export -f kubectl

    # 2. Ejecutamos el script que por dentro hace llamadas a kubectl
    run desplegar_manifiesto "/tmp/deployment.yaml"

    # 3. Validamos que el script reaccionó correctamente a la salida simulada
    [ "$status" -eq 0 ]
    
    # La variable especial ${lines[@]} de BATS contiene la salida como un array
    [ "${lines[0]}" = "Iniciando despliegue..." ]
    [ "${lines[1]}" = "Mock: Aplicando /tmp/deployment.yaml exitosamente" ]
}

```

**Por qué esta técnica es crítica para la resiliencia:**
Al simular fallos (`return 1`, `return 503`), puedes escribir pruebas que garanticen que la lógica de reintentos dinámicos (*Exponential Backoff*, Cap. 9.3) de tu script funciona perfectamente ante caídas transitorias de red, **sin tener que derribar una red real para comprobarlo**. Integrar BATS junto con ShellCheck convierte tu código Bash en software de grado de producción, predecible y seguro frente a regresiones.
