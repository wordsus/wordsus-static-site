## 11.1 Type Hints y la evolución del tipado en Python

Desde sus inicios, Python fue diseñado con una filosofía clara: ser un lenguaje de tipado dinámico y fuerte. Como vimos en los primeros capítulos, esto significa que las variables no están atadas a un tipo de dato específico, sino que son simples etiquetas que apuntan a objetos en memoria; son los objetos los que poseen un tipo. Esta flexibilidad, combinada con el popular *Duck Typing* ("si camina como un pato y grazna como un pato, entonces debe ser un pato"), permitió iteraciones rápidas y un desarrollo sumamente ágil.

Sin embargo, a medida que Python conquistó la industria y comenzó a utilizarse en sistemas empresariales masivos con millones de líneas de código, la comunidad se topó con un muro estructural: **la carga cognitiva y la fragilidad del mantenimiento.**

### El problema de la escala y el código opaco

En bases de código pequeñas, la inferencia mental del desarrollador es suficiente para saber qué tipo de dato requiere una función. Pero en proyectos de nivel Senior, donde múltiples equipos interactúan con módulos que no escribieron, el tipado dinámico puro genera fricción.

Observa este ejemplo tradicional:

```python
def procesar_pago(usuario, monto, descuento):
    # Lógica de procesamiento
    pass
```

Al leer esta firma, surgen preguntas inmediatas que el código no responde por sí solo:
* ¿Es `usuario` un string con el ID, un diccionario con datos, o una instancia de la clase `Usuario`?
* ¿Es `monto` un entero (centavos) o un flotante?
* ¿Es `descuento` un porcentaje (float) o un valor booleano indicando si aplica o no?

Históricamente, la solución en Python era documentar extensamente usando *Docstrings*. No obstante, la documentación tiende a desactualizarse y, lo que es peor, las herramientas de desarrollo (IDEs) no pueden garantizar matemáticamente que se esté cumpliendo lo documentado, lo que lleva a errores en tiempo de ejecución (el temido `AttributeError` o `TypeError` en producción).

### La llegada del Tipado Gradual (PEP 484)

Para solucionar esto sin perder la esencia del lenguaje, Python introdujo en su versión 3.5 (a través del PEP 484) el concepto de **Type Hints** (Sugerencias de Tipo) o **Tipado Gradual**. 

La evolución fue sutil pero revolucionaria: Python sigue siendo dinámico, pero ahora permite *anotar* opcionalmente qué tipos de datos se esperan. 

El código anterior, modernizado con Type Hints, se transforma en código autodocumentado y predecible:

```python
class Usuario:
    pass

def procesar_pago(usuario: Usuario, monto: float, descuento: bool = False) -> bool:
    # Lógica de procesamiento
    return True
```

La sintaxis es directa:
* Variables y argumentos se anotan usando dos puntos: `variable: tipo`.
* El valor de retorno de una función se anota usando una flecha: `-> tipo`.

> **Nota arquitectónica crucial:** Los Type Hints en Python son ignorados por el intérprete en tiempo de ejecución. No hacen que tu código sea más rápido ni validan los tipos al ejecutar el script. Son metadatos diseñados para ser consumidos por humanos y por herramientas de análisis estático (que configuraremos en la sección 11.3).

### El flujo de trabajo: Dinámico vs. Estático

La introducción de los Type Hints cambió drásticamente el ciclo de vida del desarrollo en Python, desplazando el descubrimiento de errores desde la ejecución hacia la escritura.

```text
Flujo Tradicional (Dinámico Puro)
[Escribir Código] ---> [Ejecutar Script / Tests] ---> ¡Fallo en Tiempo de Ejecución! (TypeError)
                                         |
                                         +--- (Requiere debug manual y rastreo del stacktrace)

Flujo Moderno (Tipado Gradual)
[Escribir Código] ---> [El IDE subraya el error al instante] ---> [Corregir en el acto]
                                         |
                                         +--- (El código llega limpio a la fase de pruebas)
```

### Beneficios de adoptar Type Hints

El salto de "escribir scripts" a "ingeniería de software" en Python está fuertemente ligado a la adopción de estas anotaciones. Sus ventajas principales incluyen:

* **Autocompletado inteligente:** Al saber qué tipo de objeto recibe una función, tu IDE te sugerirá únicamente los métodos y atributos válidos para ese objeto de forma precisa.
* **Documentación viva:** El código se convierte en la principal fuente de verdad. Si cambias el tipo de un parámetro, la firma de la función lo refleja inmediatamente.
* **Refactorización segura:** En el Capítulo 19 veremos cómo la arquitectura evoluciona. Con Type Hints, renombrar un método o cambiar la estructura de un dato dispara alertas en todas las partes del proyecto que lo consumen, antes siquiera de ejecutar los tests.
* **Reducción de tests triviales:** Ya no necesitas escribir pruebas unitarias cuyo único propósito sea verificar si una función lanza una excepción cuando se le pasa un *string* en lugar de un *entero*.

### La transición hacia el estándar moderno

Es importante destacar que el sistema de tipado ha evolucionado rápidamente desde su concepción. Mientras que en versiones antiguas se requería importar herramientas engorrosas para tipar estructuras complejas, a partir de Python 3.9 las colecciones nativas que estudiamos en el Capítulo 3 pueden usarse directamente como anotaciones:

```python
# Tipado moderno de colecciones (Python 3.9+)
def procesar_lote(nombres: list[str], configuraciones: dict[str, int]) -> tuple[bool, str]:
    if not nombres:
        return False, "Lista vacía"
    return True, "Procesado"
```

El tipado en Python no busca convertirlo en Java o C++, sino ofrecer lo mejor de ambos mundos: la velocidad de desarrollo de un lenguaje dinámico para el prototipado, y la robustez de un lenguaje estático cuando el proyecto escala y llega a producción. En la siguiente sección, exploraremos cómo manejar situaciones de tipado más complejas, como variables que pueden aceptar múltiples tipos o funciones que operan de manera genérica.

## 11.2 El módulo `typing`: Union, Optional, Callable y genéricos

En la sección anterior vimos cómo anotar tipos nativos como enteros, cadenas o listas. Sin embargo, el mundo real del desarrollo backend y la ingeniería de software rara vez es tan rígido. ¿Qué sucede cuando una función puede devolver un diccionario o `None`? ¿Cómo tipamos un argumento que debe ser otra función (un *callback*)? ¿O una clase constructora que debe manejar un tipo de dato genérico dependiendo del contexto?

Para resolver estos escenarios, Python introdujo el módulo `typing`. Aunque las versiones recientes de Python (3.9 y 3.10+) han integrado mucha de esta funcionalidad directamente en la sintaxis del lenguaje, un desarrollador Senior debe dominar el módulo `typing`, ya que forma la columna vertebral de bases de código *legacy* y sigue alojando herramientas avanzadas indispensables.

A continuación, desglosaremos las herramientas más críticas de este módulo.

### 1. Múltiples posibilidades: `Union` y `Optional`

En un sistema dinámico, es común que una variable pueda aceptar más de un tipo de dato. Por ejemplo, un identificador de usuario podría venir de una API como un *string* ("10045") o de una base de datos como un *integer* (10045).

Para esto utilizamos `Union`:

```python
from typing import Union

def procesar_identificador(user_id: Union[int, str]) -> str:
    # Garantizamos que la salida sea siempre un string
    return str(user_id).strip()
```

Un caso particular (y extremadamente común) de `Union` ocurre cuando una función puede devolver un valor esperado o "nada" (`None`). Para hacer la intención más semántica, el módulo `typing` ofrece `Optional`.

```python
from typing import Optional

def buscar_usuario(email: str) -> Optional[dict]:
    usuario = db.query(email=email)
    if usuario:
        return usuario
    return None  # Optional[dict] es exactamente lo mismo que Union[dict, None]
```

> **Evolución en Python 3.10+ (PEP 604):**
> La comunidad notó que importar `Union` y `Optional` era verboso. En código moderno, puedes usar el operador *pipe* (`|`) para expresar uniones de forma nativa:
> 
> ```python
> # Equivalente moderno de Union e Optional
> def buscar_usuario(user_id: int | str) -> dict | None:
>     pass
> ```

### 2. Funciones como ciudadanos de primera clase: `Callable`

Dado que en Python las funciones pueden pasarse como argumentos a otras funciones (como vimos en decoradores y programación funcional), necesitamos una forma de tipar la firma de la función que estamos recibiendo.

Aquí entra `Callable`. Su sintaxis requiere dos partes: una lista con los tipos de los argumentos que la función espera, y el tipo de retorno.

`Callable[[TipoArg1, TipoArg2], TipoRetorno]`

Veamos un ejemplo práctico implementando una función de reintento (*retry*), muy común en resiliencia de red:

```python
from typing import Callable
import time

# Esperamos una función que reciba una URL (str), un timeout (int) y retorne un booleano
def ejecutar_con_reintento(
    tarea: Callable[[str, int], bool], 
    url: str, 
    max_intentos: int = 3
) -> bool:
    
    for intento in range(max_intentos):
        if tarea(url, 5):  # Pasamos str y int, tal como dicta el Callable
            return True
        time.sleep(1)
    
    return False
```

Si el desarrollador intenta pasar a `ejecutar_con_reintento` una función que no concuerda con esa firma (por ejemplo, una función que no acepta argumentos), las herramientas de análisis estático lanzarán una alerta inmediatamente.

### 3. Abstracción pura: Genéricos (`TypeVar` y `Generic`)

Llegamos a uno de los conceptos más poderosos de la arquitectura orientada a objetos tipada. Imagina que estás construyendo una estructura de datos abstracta, como una Pila (Stack) o una respuesta envoltorio de API.

Si usas el tipo `Any` (que desactiva el chequeo de tipos), pierdes toda la seguridad:

```python
# MALA PRÁCTICA (Uso de Any)
from typing import Any

class RespuestaAPI:
    def __init__(self, data: Any):
        self.data = data

# El IDE no sabe qué métodos tiene 'data'
respuesta = RespuestaAPI(data={"nombre": "Ana"})
respuesta.data.append(1)  # El IDE no avisa del error (dict no tiene 'append')
```

Para crear componentes reutilizables pero tipados de forma segura, usamos **Genéricos**. Definimos una variable de tipo con `TypeVar` y hacemos que nuestra clase herede de `Generic`. 

```python
from typing import TypeVar, Generic

# 1. Declaramos una variable de tipo (convencionalmente se usa 'T')
T = TypeVar('T')

# 2. La clase hereda de Generic[T]
class RespuestaAPI(Generic[T]):
    def __init__(self, data: T, status_code: int):
        self.data: T = data
        self.status_code = status_code

# --- Uso del Genérico ---

# Especificamos que ESTA instancia de RespuestaAPI contendrá un diccionario
respuesta_dict = RespuestaAPI[dict](data={"usuario": "admin"}, status_code=200)

# El IDE sabe exactamente que respuesta_dict.data es un diccionario.
print(respuesta_dict.data.keys())

# Si intentamos inicializarlo con un tipo incorrecto, el analizador fallará:
# respuesta_erronea = RespuestaAPI[list](data="soy un string", status_code=400) # <- ERROR de tipado
```

**Esquema mental de un Genérico:**
```text
      [Plantilla: RespuestaAPI[T]]
              |
              |-- (Si T es list) --> RespuestaAPI[list] (data solo acepta listas)
              |
              |-- (Si T es dict) --> RespuestaAPI[dict] (data solo acepta diccionarios)
```

Los Genéricos permiten escribir lógica abstracta una sola vez (DRY - *Don't Repeat Yourself*) manteniendo una estricta validación de contratos en toda la aplicación. En frameworks modernos como FastAPI o herramientas de ORM como SQLAlchemy 2.0, el uso de Genéricos es omnipresente para inyectar dependencias y modelos de base de datos de manera segura.

Al dominar `Union`, `Callable` y los Genéricos, tienes el vocabulario completo para describir matemáticamente las interfaces de tu código. En la siguiente sección, pondremos estas anotaciones a trabajar en el mundo real, integrando el analizador estático `mypy` en un flujo de integración continua (CI/CD).

## 11.3 Integración de análisis estático en CI/CD con `mypy`

En las secciones anteriores dotamos a nuestro código de semántica y contratos claros gracias a los *Type Hints*. Sin embargo, como mencionamos en la regla de oro del tipado en Python: **el intérprete ignora estas anotaciones en tiempo de ejecución**. Si pasas un *string* a una función que espera un *entero*, Python intentará ejecutarlo de todos modos.

Para que el esfuerzo de tipar el código tenga un impacto real en la seguridad del software, necesitamos una herramienta que actúe como un "compilador estricto", analizando el código en busca de inconsistencias antes de que llegue a producción. Esa herramienta es **`mypy`**.

Respaldado por el propio creador de Python (Guido van Rossum), `mypy` es el analizador estático de referencia. Su trabajo es leer tu código, entender las anotaciones y simular matemáticamente si los tipos fluyen correctamente a través de la aplicación.

### El primer paso: Uso local y configuración

Antes de llevar el análisis a la nube, debemos dominarlo en nuestro entorno de desarrollo. La instalación es sencilla (`pip install mypy`). Una vez instalado, su uso básico consiste en apuntarlo hacia tu código:

```bash
mypy mi_modulo.py
```

Si tenemos el siguiente código en `pagos.py`:

```python
def calcular_impuesto(monto: float) -> float:
    return monto * 0.21

# Error sutil: le pasamos un string numérico en lugar de un float
total = calcular_impuesto("100.50") 
```

Al ejecutar `mypy pagos.py`, obtendremos inmediatamente:
`pagos.py:5: error: Argument 1 to "calcular_impuesto" has incompatible type "str"; expected "float"`

#### Configuración a nivel Senior (`pyproject.toml`)

En un proyecto real, ejecutar `mypy` con su configuración por defecto suele generar falsos positivos, especialmente al interactuar con librerías de terceros (como Pandas o Django) que no siempre tienen sus propios *Type Hints*.

Un desarrollador Senior no deja el comportamiento al azar, sino que lo define en el archivo central del proyecto (hoy en día, preferentemente `pyproject.toml`):

```toml
[tool.mypy]
# Define la versión de Python objetivo para garantizar consistencia
python_version = "3.11"

# Advierte si una función no devuelve nada pero debería
warn_no_return = true

# Evita que el código no tipado se mezcle silenciosamente
disallow_untyped_defs = true

# Ignora errores en librerías externas que no tienen Type Hints
[[tool.mypy.overrides]]
module = "libreria_legacy_sin_tipos.*"
ignore_missing_imports = true
```

### Automatización: Llevando mypy al Pipeline de CI/CD

El verdadero valor del tipado estático se desbloquea cuando eliminamos el factor humano. Si un desarrollador olvida ejecutar `mypy` en su máquina, el error podría filtrarse a la rama principal (main/master).

Para evitar esto, implementamos una estrategia de **Shift-Left Testing** (mover la detección de errores lo más a la izquierda posible en el ciclo de vida del desarrollo) integrando `mypy` en nuestro flujo de Integración Continua (CI).

El objetivo es crear un guardián automatizado que bloquee cualquier *Pull Request* (PR) que introduzca violaciones de tipo.

**Arquitectura del Pipeline de Validación:**

```text
[Desarrollador hace Push] 
       │
       ▼
[CI Server (ej. GitHub Actions / GitLab CI)]
       │
       ├── Paso 1: Checkout del código
       ├── Paso 2: Configurar Python
       ├── Paso 3: Instalar dependencias
       └── Paso 4: Ejecutar `mypy`
              │
              ├── [ÉXITO] ──> Permite revisar y fusionar el PR.
              └── [FALLO] ──> Bloquea el PR y notifica al desarrollador.
```

#### Ejemplo práctico: GitHub Actions

A continuación, se muestra cómo definir este flujo en un archivo `.github/workflows/analisis_estatico.yml`:

```yaml
name: Python Static Analysis

on:
  pull_request:
    branches: [ "main", "develop" ]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout del código
      uses: actions/checkout@v3

    - name: Configurar Python
      uses: actions/setup-python@v4
      with:
        python-version: "3.11"
        cache: 'pip'

    - name: Instalar dependencias y mypy
      run: |
        python -m pip install --upgrade pip
        # Idealmente, instalas tus dependencias desde requirements.txt o Poetry
        pip install -r requirements.txt
        pip install mypy

    - name: Ejecutar verificación de tipos
      # Ejecuta mypy leyendo la configuración del pyproject.toml
      run: mypy .
```

### La estrategia de adopción: El Tipado Gradual en la vida real

Uno de los mayores errores arquitectónicos que cometen los equipos al adoptar `mypy` es intentar encender el "modo estricto" (`strict = True`) en una base de código *legacy* de la noche a la mañana. Esto generará miles de errores y frustrará al equipo.

La evolución del tipado en proyectos maduros debe ser, por diseño, **gradual**:

1. **Aislar lo nuevo:** Configura tu CI/CD para que exija *Type Hints* únicamente en el código nuevo o en los archivos modificados en el PR actual. Herramientas como *pre-commit* son excelentes para esto.
2. **Ignorar temporalmente el legado:** Excluye carpetas *legacy* en el `pyproject.toml` usando directivas como `exclude`.
3. **Refactorización oportunista (Regla del Boy Scout):** Acuerda con el equipo que cada vez que alguien toque un módulo antiguo para añadir una *feature*, debe aprovechar para añadir las firmas de tipo en ese módulo específico.

Integrar `mypy` en tu CI/CD transforma el tipado dinámico de Python de un riesgo en sistemas a gran escala a una herramienta de documentación matemática y verificable, acercando la robustez del código a lenguajes como Go o Java, pero conservando la elegancia que hace a Python único.