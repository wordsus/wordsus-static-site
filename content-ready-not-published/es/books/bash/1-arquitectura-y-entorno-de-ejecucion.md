Este capítulo disecciona los cimientos operativos donde Bash despliega su verdadera potencia en infraestructuras críticas. No se trata solo de escribir comandos, sino de entender cómo la gestión de subshells, la atomización del error con el *Strict Mode* y la jerarquía de contextos de ejecución determinan la resiliencia de un pipeline. Dominar estas sutilezas es lo que separa un script frágil de una automatización de grado industrial.

**Nota:** Este libro asume un dominio total sobre comandos de Linux. Si necesitas repasarlos, puedes consultar nuestro libro [Linux para DevOps](https://wordsus.com/es/linux).

## 1.1. Anatomía del entorno: Diferencias críticas entre Subshells `( )`, agrupación de comandos `{ }` y el entorno actual

En el desarrollo de automatizaciones para DevOps, la predictibilidad del estado es un principio innegociable. Uno de los errores más comunes y frustrantes al escribir scripts en Bash proviene de no comprender **dónde** se está ejecutando un bloque de código. Bash maneja la ejecución de comandos a través de distintos entornos, y la elección entre usar paréntesis `( )` o llaves `{ }` puede determinar si una variable retiene su valor, si el directorio de trabajo cambia permanentemente o si el rendimiento de tu pipeline de CI/CD se degrada por la creación innecesaria de procesos.

Para dominar Bash, primero debemos diseccionar su entorno de ejecución.

---

### El Entorno Actual (The Current Environment)

Cuando ejecutas un script de Bash, se lanza un proceso principal. Este proceso posee un estado: un directorio de trabajo actual (PWD), un conjunto de variables de entorno y locales definidas, descriptores de archivos abiertos y trampas de señales (que exploraremos en el Capítulo 6). Este es tu **entorno actual**.

Cualquier comando estándar o función ejecutada directamente altera o lee este entorno principal. Sin embargo, cuando necesitamos agrupar comandos —ya sea para redirigir sus salidas conjuntas o para control de flujo lógico— tenemos dos herramientas principales, cada una con un impacto arquitectónico diametralmente opuesto.

---

### Agrupación de Comandos con `{ }` (El Entorno Actual)

Las llaves `{ }` agrupan una lista de comandos para que se ejecuten en el **mismo proceso** del shell actual. No hay bifurcación (*fork*), no se crea un proceso hijo.

**Características clave:**

* **Mutación de estado:** Cualquier cambio en las variables, alias o el directorio de trabajo (`cd`) dentro de las llaves afectará al script principal.
* **Rendimiento:** Al no requerir la creación de un nuevo proceso a nivel del sistema operativo, su ejecución es extremadamente rápida.
* **Sintaxis estricta:** En Bash, `{` y `}` son palabras reservadas (*keywords*), no metacaracteres. Esto significa que **deben estar separados por espacios** de los comandos que encierran, y el último comando debe terminar obligatoriamente con un punto y coma `;` o un salto de línea.

**Ejemplo de comportamiento:**

```bash
#!/bin/bash
DIRECTORIO_ACTUAL=$PWD
VERSION="1.0"

# Agrupación de comandos en el entorno actual
{
    cd /tmp || exit
    VERSION="2.0"
    echo "Dentro de { }: Directorio=$PWD, Versión=$VERSION"
}

echo "Fuera de { }: Directorio=$PWD, Versión=$VERSION"

```

*Resultado:* El estado fue mutado permanentemente. El script principal ahora está operando en `/tmp` y la variable `VERSION` es `2.0`.

---

### Subshells con `( )` (El Entorno Aislado)

Los paréntesis `( )` agrupan una lista de comandos, pero instruyen a Bash a crear una copia exacta del entorno actual lanzando un proceso hijo (un *Subshell*).

**Características clave:**

* **Aislamiento total (Sandbox):** El subshell hereda una copia de las variables y configuraciones del proceso padre, pero **cualquier modificación que realice se destruirá** en el momento en que el subshell termine.
* **Penalización de rendimiento:** Cada subshell requiere una llamada al sistema `clone()` o `fork()`. En bucles cerrados que se ejecutan miles de veces, esto puede añadir segundos o minutos al tiempo total de ejecución.
* **Sintaxis flexible:** Los paréntesis son metacaracteres. No requieren espacios a su alrededor ni un punto y coma final (aunque es una buena práctica de legibilidad).

**Ejemplo de comportamiento:**

```bash
#!/bin/bash
DIRECTORIO_ACTUAL=$PWD
VERSION="1.0"

# Ejecución en un subshell
(
    cd /tmp || exit
    VERSION="2.0"
    echo "Dentro de ( ): Directorio=$PWD, Versión=$VERSION"
)

echo "Fuera de ( ): Directorio=$PWD, Versión=$VERSION"

```

*Resultado:* El estado principal está intacto. El script sigue en su directorio original y `VERSION` sigue siendo `1.0`. El cambio a `/tmp` y la actualización de la variable desaparecieron con el proceso hijo.

---

### Diagrama de Flujo del Estado

Para visualizar la diferencia a nivel arquitectónico, observa cómo fluye el estado de las variables y el directorio de trabajo (PWD):

```text
[ PROCESO PADRE BASH (PID: 100) ]
  |-- Estado: PWD=/opt/app, VAR="A"
  |
  |=== Camino 1: Agrupación { } ===> Ejecución IN-PLACE
  |    |-- Se ejecuta dentro del PID 100
  |    |-- cd /var/log
  |    |-- VAR="B"
  |    +-- (El Padre ahora tiene PWD=/var/log y VAR="B")
  |
  |=== Camino 2: Subshell ( ) ===> Llamada Fork()
       |
       +--> [ PROCESO HIJO BASH (PID: 101) ]
              |-- Hereda copia: PWD=/opt/app, VAR="A"
              |-- cd /tmp
              |-- VAR="C"
              +-- (Fin de ejecución. El estado muere con el PID 101)

```

---

### Casos de Uso en Operaciones DevOps

Saber elegir entre ambas estructuras no es solo una cuestión de sintaxis, sino de diseño de sistemas.

**¿Cuándo usar `( )` Subshells?**

1. **Ejecución contextual efímera:** Si necesitas compilar un binario en un directorio específico pero no quieres que tu pipeline de CI quede "atrapado" en esa ruta.

```bash
# Compila en /tmp sin afectar el resto del script
(cd /tmp/repo && make install)
# El script continúa en el directorio original

```

1. **Protección del entorno:** Al importar archivos externos (como `.env`) temporalmente para un comando específico sin contaminar el entorno global del script.

**¿Cuándo usar `{ }` Agrupación de comandos?**

1. **Redirección de flujos unificada:** Si necesitas que varios comandos escriban en el mismo archivo o fluyan por la misma tubería sin lanzar procesos adicionales.

```bash
# Se abre el archivo de log una sola vez para ambos comandos
{
    echo "Iniciando despliegue..."
    kubectl apply -f deployment.yaml
} >> deploy.log 2>&1

```

1. **Construcción de variables o mutación de estado:** Cuando un bloque lógico debe calcular valores que serán utilizados posteriormente en el pipeline.

Comprender esta frontera de aislamiento es el primer paso para escribir scripts de infraestructura que sean seguros, predecibles y modulares. En el próximo apartado, veremos cómo configurar este entorno base para que no tolere errores silenciosos usando el *Strict Mode*.

## 1.2. El "Strict Mode" no oficial de Bash: Implementación y casos de uso de `set -euo pipefail`

En la ingeniería de confiabilidad (SRE) y la automatización DevOps, la esperanza no es una estrategia. Un script de despliegue o aprovisionamiento de infraestructura debe ser determinista: o tiene éxito en su totalidad, o falla de manera ruidosa y segura en el primer error.

Por defecto, la filosofía de diseño original de Bash es extremadamente permisiva. Si un comando falla, Bash imprimirá un error en la salida estándar (stderr), ignorará el fallo y continuará alegremente con la ejecución del siguiente comando. En un pipeline de CI/CD, este comportamiento silente puede resultar en bases de datos borradas, despliegues a medias o falsos positivos (scripts que fallan catastróficamente pero devuelven un código de salida `0` de éxito).

Para forzar a Bash a adoptar una postura defensiva ("Fail-Fast"), la comunidad adoptó lo que hoy se conoce como el **"Strict Mode" no oficial**: la instrucción `set -euo pipefail`.

---

### Desglosando el "Strict Mode"

Esta directiva se coloca habitualmente justo debajo del *shebang* (`#!/bin/bash`) al inicio del script. Cada letra representa un escudo contra comportamientos ambiguos:

#### 1. `set -e` (Exit on Error)

Instruye al script a abortar su ejecución inmediatamente si cualquier comando devuelve un código de salida distinto de cero (indicador de error).

* **El problema original:** Si un comando como `cd /directorio/critico` falla (por ejemplo, porque el directorio no existe), el script continuará ejecutando el siguiente comando, como `rm -rf *`, pero en el directorio equivocado.
* **La solución:** Con `-e`, el fallo del `cd` detiene el script de inmediato, previniendo el desastre.

#### 2. `set -u` (Treat Unset Variables as Errors)

Provoca que Bash trate cualquier referencia a una variable no definida previamente como un error fatal, deteniendo la ejecución.

* **El problema original:** Bash evalúa las variables no definidas como cadenas vacías sin emitir advertencias. Imagina el comando `rm -rf /opt/app/${VERSION}/`. Si olvidaste definir la variable `VERSION`, Bash ejecutará `rm -rf /opt/app//`, borrando potencialmente todas las versiones de tu aplicación.
* **La solución:** Con `-u`, el script se detendrá antes de ejecutar el borrado, quejándose explícites de que `VERSION` no está asignada.

#### 3. `set -o pipefail` (Pipeline Failure)

Modifica el comportamiento de los códigos de salida en las tuberías (pipes `|`).

* **El problema original:** En Bash, el código de salida de una tubería completa es el código de salida del **último comando** (el situado más a la derecha). Si ejecutas `make build | tee build.log`, y `make build` falla espectacularmente pero `tee` logra escribir el error en el archivo, el pipeline devolverá `0` (éxito) porque `tee` funcionó. Tu servidor de CI lo marcará como un pase verde.
* **La solución:** `pipefail` asegura que el código de salida de un pipeline sea el código del último comando (leyendo de derecha a izquierda) que devolvió un estado distinto de cero. Si todos tienen éxito, devuelve `0`. Si `make build` falla, todo el pipeline reporta fallo.

---

### Tabla Resumen de Comportamiento

| Directiva | Comportamiento por defecto (Off) | Comportamiento Estricto (On) | Impacto en DevOps |
| --- | --- | --- | --- |
| **`-e`** | Ignora errores, continúa la ejecución. | Aborta el script en el primer fallo. | Previene la ejecución de acciones destructivas fuera de contexto. |
| **`-u`** | Variables vacías se evalúan como `""`. | Aborta si lee una variable no declarada. | Previene inyecciones vacías y borrados accidentales de raíz. |
| **`-o pipefail`** | Retorna el código del último comando del pipe. | Retorna error si *cualquier* comando del pipe falla. | Evita falsos positivos en pipelines de CI/CD (ej. Jenkins, GitLab CI). |

---

### Casos de Uso y Manejo de Excepciones (Los "Gotchas")

Activar el Strict Mode es fácil, pero adaptar tu código a este rigor requiere disciplina. Habrá momentos donde *esperas* que un comando falle o que una variable esté vacía de forma legítima. Así es como debes manejar estas excepciones sin desactivar el modo estricto:

**Manejando comandos que pueden fallar (Bypass de `-e`):**
Si quieres ejecutar un comando que sabes que puede devolver un código distinto de cero y no quieres que el script muera, puedes encadenarlo con un operador lógico `||` o evaluarlo en un condicional.

```bash
#!/bin/bash
set -euo pipefail

# Error: Detendrá el script si 'grep' no encuentra coincidencias (código 1)
# cat config.txt | grep "DEBUG=true"

# Correcto: Evaluamos la salida de forma segura
if grep -q "DEBUG=true" config.txt; then
    echo "Modo debug activado."
else
    echo "Modo debug desactivado."
fi

# Correcto: Obligamos a que la línea devuelva 0 usando "|| true"
# Esto es útil si solo queremos limpiar algo que quizá no exista
rm /tmp/archivo_temporal 2>/dev/null || true

```

**Manejando variables opcionales (Bypass de `-u`):**
Si necesitas leer variables de entorno que el usuario podría no haber configurado, en lugar de desactivar `-u`, debes usar la **expansión de parámetros predeterminada** de Bash (que veremos en profundidad en el Capítulo 2).

```bash
#!/bin/bash
set -euo pipefail

# Asigna "produccion" si AMBIENTE no está definida, evitando el error de -u
ENTORNO=${AMBIENTE:-"produccion"}

echo "Desplegando en: $ENTORNO"

```

El uso de `set -euo pipefail` no es un parche mágico que arreglará la mala lógica, pero actúa como un arnés de seguridad obligatorio para cualquier script que manipule infraestructura crítica. Al adoptarlo, transformas los errores silenciosos e impredecibles en fallos ruidosos y depurables.

## 1.3. Opciones avanzadas del shell (`shopt` y `set`) esenciales para la predictibilidad de los scripts

Si el "Strict Mode" (`set -euo pipefail`) es la red de seguridad principal de tu script, las opciones avanzadas de `shopt` (Shell Options) y otras banderas de `set` son los anclajes que evitan que esa red se rompa en casos límite.

Bash hereda comportamientos de sus predecesores (como `sh`) que priorizan la conveniencia interactiva sobre la predictibilidad programática. Para el desarrollo en DevOps, donde un script maneja archivos de configuración, secretos y artefactos de despliegue, necesitamos alterar ese comportamiento base.

Primero, aclaremos la diferencia anatómica: `set` controla banderas estandarizadas (muchas heredadas de POSIX), mientras que `shopt` controla extensiones específicas y modernas de Bash.

---

### 1. Controlando la Expansión de Archivos (Globbing)

El manejo de comodines (`*`, `?`) en Bash es una fuente silenciosa de desastres. Por defecto, si Bash no encuentra archivos que coincidan con un patrón, **devuelve el patrón como una cadena literal**.

Imagina este escenario de limpieza de logs:

```bash
# Si no hay archivos .log, Bash ejecuta: rm "*.log"
rm *.log

```

Si por casualidad existe un archivo que literalmente se llama `*.log`, será borrado. Si no, `rm` fallará, y si tienes `set -e` activado, tu script se detendrá por un error trivial de limpieza.

Para solucionar esto, utilizamos opciones de `shopt`:

* **`shopt -s nullglob`**: Si un patrón no coincide con nada, se expande a "nada" (una cadena vacía) en lugar del patrón literal.
* *Uso:* Excelente para bucles `for` dinámicos. Si no hay archivos, el bucle simplemente no se ejecuta.

* **`shopt -s failglob`**: Más estricto que `nullglob`. Si un patrón no coincide, Bash lanza un error inmediatamente.
* *Uso:* Ideal cuando la existencia de archivos es un requisito absoluto (ej. cargar certificados con `cat certs/*.pem`).

* **`shopt -s dotglob`**: Por defecto, el comodín `*` ignora los archivos ocultos (los que empiezan por punto, como `.env` o `.git`). Al activar `dotglob`, `*` los incluye.
* *Uso:* Crítico al copiar o mover directorios de proyectos completos. Sin esto, `cp -r /app/* /backup/` dejará atrás archivos de configuración vitales.

---

### 2. Garantizando la Herencia de Reglas (`inherit_errexit` y `set -E`)

En la sección 1.1 vimos cómo los subshells crean entornos aislados. Históricamente, Bash tenía un comportamiento errático: las reglas estrictas como `set -e` a veces no se heredaban correctamente dentro de sustituciones de comandos `$(...)` o funciones, dependiendo de la versión del shell.

Para garantizar que el rigor arquitectónico penetre en cada nivel del script, necesitamos forzar la herencia:

* **`shopt -s inherit_errexit` (Disponible desde Bash 4.4):** Fuerza a que las sustituciones de comandos hereden el comportamiento de `set -e`. Sin esto, un comando como `DATOS=$(comando_que_falla)` podría fallar silenciosamente y asignar una cadena vacía a `DATOS`, saltándose la protección principal.
* **`set -E` (o `set -o errtrace`):**
Asegura que cualquier trampa de error (`trap ... ERR`) que configures en el proceso padre sea heredada por funciones del shell, sustituciones de comandos y subshells. (Profundizaremos en la captura de señales y trampas en el Capítulo 6, pero esta bandera es el prerrequisito para que funcionen).

---

### 3. Prevención de Sobrescritura Accidental (`set -C`)

La redirección estándar con `>` truncará (vaciará) un archivo existente antes de escribir en él. Un error tipográfico en una variable puede destruir un archivo de configuración crítico instantáneamente.

* **`set -C` (o `set -o noclobber`):**
Impide que el operador `>` sobrescriba archivos existentes. Si el archivo ya existe, Bash arrojará un error.

**Ejemplo de protección:**

```bash
set -C
echo "nueva ip" > /etc/resolv.conf  # ERROR: El archivo existe, Bash lo protege.

# Si realmente necesitas sobrescribirlo de forma intencional, usas '>|'
echo "nueva ip" >| /etc/resolv.conf # ÉXITO: Sobrescritura forzada.

```

---

### El Preámbulo Definitivo para DevOps

Combinando lo aprendido en la sección anterior y en esta, podemos ensamblar un bloque de configuración inicial que debería encabezar todo script de infraestructura. Este "boilerplate" transforma Bash de un shell interactivo permisivo a un lenguaje de scripting estricto y predecible:

```bash
#!/bin/bash

# ==============================================================================
# CONFIGURACIÓN DEL ENTORNO DE EJECUCIÓN (Strict Mode + Predictibilidad)
# ==============================================================================

# 1. Fallo rápido y variables seguras
set -euo pipefail

# 2. Herencia profunda de errores y trampas
set -E
shopt -s inherit_errexit

# 3. Predictibilidad en la expansión de archivos
shopt -s nullglob  # Evita iterar sobre el literal '*.txt' si no hay archivos
shopt -s dotglob   # Asegura que cp * o mv * incluyan archivos .ocultos

# 4. Protección contra sobrescritura por redirección (Opcional pero recomendado)
# set -C 

```

**Nota sobre la portabilidad:** Mientras que `set -euo pipefail` funciona en casi cualquier contenedor con `bash` o `sh` moderno, opciones como `shopt -s inherit_errexit` requieren Bash 4.4+ (lanzado en 2016). Si tus scripts deben correr en sistemas legacy extremos (como un macOS antiguo o RHEL 6), considera validar la versión de Bash con la variable nativa `BASH_VERSINFO` antes de invocar comandos `shopt` específicos.

## 1.4. Contextos de ejecución: Login vs. Non-login, Interactive vs. Non-interactive y su impacto en las variables de entorno

Existe un rito de iniciación universal en DevOps: escribes un script, lo pruebas en tu terminal local y funciona perfectamente. Luego, lo programas en un `cron`, lo integras en una tubería de Jenkins o lo lanzas vía `ssh usuario@host "comando"`, y de repente falla catastróficamente indicando que `comando no encontrado` o que variables críticas están vacías.

Este fenómeno no es magia negra; es el resultado de la estricta y a menudo incomprendida jerarquía de **contextos de ejecución** de Bash. Dependiendo de *cómo* se invoque Bash, este cargará diferentes archivos de configuración predeterminados, alterando radicalmente el entorno (`$PATH`, alias, variables exportadas).

Podemos dividir el comportamiento de Bash en dos dimensiones ortogonales: **Interactividad** y **Autenticación (Login)**.

---

### 1. La Dimensión de Interactividad

Esta dimensión define si el shell está conectado a un terminal humano (TTY) o si está procesando un flujo de texto de manera automatizada.

* **Interactive Shell (Shell Interactivo):**
Es el shell que usas cuando abres tu terminal. Está diseñado para un humano: muestra un prompt (`$PS1`), habilita el historial de comandos y permite el uso de alias.
* *Cómo detectarlo programáticamente:* Puedes verificar si la variable `$-` contiene la letra `i`, o si `$PS1` está definida.

* **Non-interactive Shell (Shell No Interactivo):**
Es el modo en el que operan el 99% de los scripts de DevOps. Cuando ejecutas `./deploy.sh` o Bash procesa un script de CI/CD, no hay humano al teclado.
* *Impacto crítico:* Los alias están desactivados por defecto y el historial no se guarda. Si tu script depende de un alias definido en tu máquina local (`alias k='kubectl'`), fallará.

---

### 2. La Dimensión de Autenticación (Login)

Esta dimensión define si el shell considera que acaba de iniciar una "sesión" en el sistema operativo.

* **Login Shell:**
Se inicia cuando te conectas vía SSH (`ssh user@server`), inicias sesión en una terminal tty física, o fuerzas el modo con `bash --login` o `su - usuario`.
* *Comportamiento:* Como es la primera puerta de entrada, Bash asume que debe cargar toda la configuración global y personal desde cero.

* **Non-login Shell:**
Ocurre cuando abres una nueva pestaña en tu emulador de terminal (GNOME Terminal, iTerm2), ejecutas un script normal, o lanzas un subshell.
* *Comportamiento:* Bash asume que el proceso padre ya cargó el entorno pesado, por lo que solo carga configuraciones ligeras específicas del shell.

---

### El Laberinto de Archivos de Configuración (Dotfiles)

El verdadero problema radica en qué archivos lee Bash dependiendo de la intersección de estas dos dimensiones.

```text
[ DIAGRAMA DE CARGA DE ENTORNO EN BASH ]

1. INTERACTIVE LOGIN SHELL (ej. SSH inicial)
   |-- Lee: /etc/profile
   |-- Lee (el primero que exista): ~/.bash_profile -> ~/.bash_login -> ~/.profile
   +-- (Nota: Por convención, ~/.bash_profile suele contener un 'source ~/.bashrc')

2. INTERACTIVE NON-LOGIN SHELL (ej. Nueva pestaña en tu terminal)
   |-- Lee: /etc/bash.bashrc (depende de la distro)
   +-- Lee: ~/.bashrc

3. NON-INTERACTIVE SHELL (ej. Ejecución de ./script.sh, Cron, CI/CD)
   |-- ¡NO LEE NINGUNO DE LOS ANTERIORES!
   +-- Lee: El archivo apuntado por la variable de entorno $BASH_ENV (casi nunca se usa)

```

### Tabla Matriz de Contextos DevOps

Para aterrizar estos conceptos en la realidad de la infraestructura, veamos dónde caen las herramientas más comunes:

| Herramienta / Método de Ejecución | Interactivo | Login | Archivo(s) cargado(s) | Impacto / Riesgo |
| --- | --- | --- | --- | --- |
| **Sesión SSH estándar** | Sí | Sí | `~/.bash_profile` | Tienes todo tu entorno disponible. Peligro de falsa confianza. |
| **Ejecución directa (`./script.sh`)** | No | No | *Ninguno* | Depende de lo que exportó el shell padre. |
| **Jenkins / GitLab CI** | No | No | *Ninguno* | `$PATH` mínimo. Si dependes de `~/.bashrc`, fallará. |
| **Cron Jobs (`* * * * * bash ...`)** | No | No | *Ninguno* | Entorno completamente limpio. `$PATH` suele ser solo `/usr/bin:/bin`. |
| **SSH con comando (`ssh user@ip "df -h"`)** | No | No | *Ninguno* | No carga `.bashrc`. Comandos no estándar no se encontrarán en el `$PATH`. |
| **`docker run ubuntu bash`** | Sí (con `-it`) | No | `~/.bashrc` | Contexto de contenedor interactivo. |

---

### Principios Arquitectónicos para Scripts Resilientes

Entender que tus scripts de infraestructura casi siempre se ejecutarán en un contexto **Non-interactive / Non-login** dicta las siguientes reglas de oro:

1. **Jamás dependas del entorno local (`~/.bashrc`, `~/.profile`):**
Las variables exportadas en tu perfil de usuario no existirán en el pipeline de despliegue.
2. **Inyección de Dependencias (El patrón `.env`):**
Si tu script necesita variables externas, cárgalas explícitamente en tiempo de ejecución.

```bash
# Dentro del script, forzamos la carga del entorno si el archivo existe
if [[ -f "/etc/miapp/.env" ]]; then
    source "/etc/miapp/.env"
fi

```

1. **Rutas absolutas o redefinición de `$PATH`:**
En entornos como `cron`, el `$PATH` es minúsculo. Si usas herramientas como `aws-cli`, `jq` o `terraform`, debes proporcionar la ruta completa (`/usr/local/bin/terraform`) o redefinir el `$PATH` al inicio de tu script.

```bash
#!/bin/bash
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

```

1. **Variables de entorno de alcance global (`/etc/environment`):**
Si necesitas que una variable persista a través de contenedores, scripts y cron, y tu sistema está basado en `systemd`/PAM, colócala en `/etc/environment` (que no es un script de Bash, sino un archivo clave=valor leído por el sistema operativo).

Dominar los contextos de ejecución cierra la brecha entre un "script que funciona en mi laptop" y una "herramienta de infraestructura de grado de producción". Con el entorno bajo control absoluto, el Capítulo 2 nos sumergirá en cómo manipular de forma avanzada y nativa los datos que fluyen por estos procesos.
