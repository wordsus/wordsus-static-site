Este capítulo explora la capacidad de Python para trascender la ejecución de código lineal y adentrarse en la **metaprogramación**: el arte de escribir código que manipula código. Comenzaremos con los **closures**, donde las funciones aprenden a "recordar" su entorno, permitiendo una retención de estado elegante sin recurrir a clases. Esta base nos permitirá dominar los **decoradores**, herramientas esenciales para inyectar lógica transversal de forma limpia y profesional. Finalmente, llegaremos a las **metaclases**, la capa más profunda del lenguaje, donde tomaremos el control del proceso de creación de clases para imponer reglas arquitectónicas y automatizar comportamientos complejos.

## 10.1 Closures (Cierres) y retención de estado

En el Capítulo 4 establecimos dos pilares fundamentales: la regla LEGB para la resolución de alcances (sección 4.1) y el hecho de que en Python las funciones son ciudadanas de primera clase (sección 4.4). Un *closure* (o cierre) es la culminación elegante de estos dos conceptos y representa el puente conceptual necesario para dominar los decoradores en la próxima sección.

Un **closure** ocurre cuando una función anidada "recuerda" el estado de su entorno léxico (las variables de su función contenedora) incluso después de que la función exterior haya terminado su ejecución. Es, en esencia, una función atada a un paquete de datos persistente.

Para que exista un closure en Python, deben cumplirse tres condiciones:
1. Debe haber una función anidada (una función dentro de otra).
2. La función anidada debe hacer referencia a un valor definido en la función exterior.
3. La función exterior debe retornar la función anidada.

### Anatomía de un Closure

Veamos un ejemplo clásico: un generador de multiplicadores.

```python
def crear_multiplicador(factor):
    # 'factor' es una variable local de la función exterior
    
    def multiplicar(numero):
        # La función interior utiliza 'factor' de su entorno (Enclosing scope)
        return numero * factor
        
    return multiplicar  # Retornamos la función sin ejecutarla

# Creamos dos closures distintos
duplicar = crear_multiplicador(2)
triplicar = crear_multiplicador(3)

print(duplicar(5))  # Salida: 10
print(triplicar(5)) # Salida: 15
```

Cuando llamamos a `crear_multiplicador(2)`, la función termina y su alcance local (donde `factor = 2`) normalmente sería destruido por el recolector de basura. Sin embargo, la función `multiplicar` que hemos retornado ha formado un *closure*. Ha "atrapado" la variable `factor` para poder usarla en el futuro.

### Bajo el capó: Celdas (Cells) y el atributo `__closure__`

Como desarrolladores Senior, no nos basta con saber que funciona; debemos entender *cómo* Python retiene este estado. 

Cuando Python compila una función anidada que referencia variables de un alcance superior, no guarda simplemente el valor numérico. En su lugar, crea un objeto intermedio llamado **Cell** (celda). La función interior y el entorno exterior apuntan a esta misma celda.

Podemos inspeccionar esto directamente usando los métodos mágicos (dunder methods) del objeto función:

```python
print(duplicar.__code__.co_freevars) 
# Salida: ('factor',) -> Indica qué variables han sido capturadas

print(duplicar.__closure__)
# Salida: (<cell at 0x...: int object at 0x...>,)

# Accediendo al valor real guardado dentro de la celda:
print(duplicar.__closure__[0].cell_contents) 
# Salida: 2
```

El siguiente diagrama ilustra cómo se mapea la memoria en la retención de estado:

```text
+-------------------------+
|   Espacio Global        |
|                         |
| duplicar ------------+  |
+----------------------|--+
                       |
                       v
            +---------------------+
            | Objeto Función      |
            | (multiplicar)       |
            |                     |
            | __closure__[0] ---- | ----+
            +---------------------+     |
                                        v
                               +-------------------+
                               |   Objeto Cell     |
                               | cell_contents: 2  | <--- El estado retenido
                               +-------------------+
```

### Mutando el estado retenido: `nonlocal`

Una de las características más potentes de los closures es que no solo pueden *leer* el estado retenido, sino también *modificarlo*. Sin embargo, por la regla LEGB, si intentamos asignar un nuevo valor a una variable libre dentro de la función anidada, Python asumirá que estamos intentando crear una nueva variable local, lanzando un `UnboundLocalError`.

Para solucionar esto, utilizamos la declaración `nonlocal`. A diferencia de `global`, `nonlocal` le dice a Python: *"No crees una nueva variable local; busca esta variable en el alcance de la función exterior más próxima y modifícala allí"*.

```python
def crear_alcancia():
    total = 0  # Estado que será retenido y modificado
    
    def depositar(cantidad):
        nonlocal total  # Declaramos nuestra intención de mutar la variable capturada
        total += cantidad
        return f"Depositado: {cantidad}. Saldo actual: {total}"
        
    return depositar

mi_alcancia = crear_alcancia()

print(mi_alcancia(100))  # Salida: Depositado: 100. Saldo actual: 100
print(mi_alcancia(50))   # Salida: Depositado: 50. Saldo actual: 150
```

### Closures vs Clases

Si observamos el ejemplo de la alcancía, notaremos que un closure resuelve un problema muy similar al que resolveríamos con la Programación Orientada a Objetos (Capítulo 5). De hecho, existe un viejo adagio en ciencias de la computación:

> *"Un closure es el equivalente para un programador funcional a lo que es un objeto para un programador orientado a objetos."*

* **POO (Clases):** Datos (estado) con métodos (comportamiento) adjuntos.
* **Closures:** Funciones (comportamiento) con un entorno de datos (estado) adjunto.

Para interfaces de un solo método (como nuestro `depositar`), un closure suele ser más rápido de instanciar, consume menos memoria y resulta más elegante que definir una clase completa con un método `__init__` y un método `__call__`. 

Comprender la retención de estado mediante closures es el requisito indispensable para dar el siguiente paso en la metaprogramación: envolver funciones con otras funciones para extender su comportamiento, técnica que en Python conocemos formalmente como **Decoradores** y que abordaremos en la próxima sección.

## 10.2 Creación de decoradores de funciones y clases

En la sección anterior vimos cómo los *closures* permiten a una función recordar su estado léxico. Los **decoradores** son la aplicación práctica más célebre de este concepto. En términos estrictos, un decorador es simplemente una función (o clase) invocable que toma otra función (o clase) como argumento, añade o modifica algún comportamiento, y devuelve una nueva función (o clase) sin alterar el código fuente original.

El símbolo `@` que solemos ver sobre las funciones es puro *azúcar sintáctico* (syntactic sugar). Escribir esto:

```python
@mi_decorador
def saludar():
    pass
```

Es exactamente el equivalente bajo el capó a esto:

```python
def saludar():
    pass
saludar = mi_decorador(saludar)
```

### La estructura base: Decoradores de funciones

Para crear un decorador robusto que pueda envolver cualquier función sin importar cuántos argumentos reciba, debemos aprovechar el empaquetado de parámetros con `*args` y `**kwargs` que revisamos en el Capítulo 4.

Veamos un patrón estándar implementando un decorador que mide el tiempo de ejecución (una herramienta esencial para el *profiling* que veremos en el Capítulo 13):

```python
import time

def medir_tiempo(func):
    # 'wrapper' es el closure que retiene acceso a 'func'
    def wrapper(*args, **kwargs):
        inicio = time.perf_counter()
        
        # Ejecutamos la función original con sus argumentos
        resultado = func(*args, **kwargs) 
        
        fin = time.perf_counter()
        print(f"[{func.__name__}] ejecutada en {fin - inicio:.6f} segundos.")
        
        # Retornamos el resultado original para no romper el contrato de la función
        return resultado
        
    return wrapper

@medir_tiempo
def procesar_datos(lote):
    time.sleep(0.5) # Simulando carga de trabajo I/O
    return [x * 2 for x in lote]

datos = procesar_datos([1, 2, 3])
```

#### El modelo de "Cebolla" (The Onion Model)

Cuando aplicamos múltiples decoradores, estos se apilan desde el más cercano a la función hacia arriba, pero **se ejecutan de afuera hacia adentro** (y luego de regreso).

```text
Flujo de ejecución de múltiples decoradores:

@autenticar
@medir_tiempo
def consultar_db(): ...

+-------------------------------------------------------+
|  Capa Externa: autenticar                             |
|  -> Verifica token                                    |
|  +-------------------------------------------------+  |
|  |  Capa Interna: medir_tiempo                     |  |
|  |  -> Inicia cronómetro                           |  |
|  |  +-------------------------------------------+  |  |
|  |  |  NÚCLEO: consultar_db()                   |  |  |
|  |  |  -> Ejecuta la lógica real                |  |  |
|  |  +-------------------------------------------+  |  |
|  |  <- Detiene cronómetro                          |  |
|  +-------------------------------------------------+  |
|  <- Retorna datos al usuario o lanza error            |
+-------------------------------------------------------+
```

### Decoradores que aceptan argumentos (Fábricas de decoradores)

¿Qué ocurre si queremos pasarle argumentos al decorador en sí, como `@reintentar(max_intentos=3)`? Aquí es donde el nivel de abstracción sube. Necesitamos un *closure dentro de un closure*: una función que reciba el argumento, y retorne el decorador real, que a su vez retornará el `wrapper`.

```python
def reintentar(max_intentos=3, delay=1):
    def decorador(func):
        def wrapper(*args, **kwargs):
            intentos = 0
            while intentos < max_intentos:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    intentos += 1
                    print(f"Fallo {intentos}/{max_intentos} en {func.__name__}: {e}")
                    if intentos == max_intentos:
                        raise e
                    time.sleep(delay)
        return wrapper
    return decorador

@reintentar(max_intentos=5, delay=2)
def conectar_servicio_inestable():
    # Lógica que podría fallar
    pass
```

### Clases como decoradores vs. Decoradores de clases

Es crucial como desarrolladores Senior no confundir estos dos conceptos. Tienen propósitos arquitectónicos distintos.

#### 1. Clases como decoradores (Gestionando el estado)
A veces, un decorador necesita mantener un estado complejo a lo largo de las ejecuciones (por ejemplo, limitar la tasa de peticiones o hacer una caché). Si bien podemos hacerlo con closures y `nonlocal` (como vimos en 10.1), usar una clase aprovechando el método mágico `__call__` (visto en el Capítulo 5) resulta mucho más limpio.

```python
class LimitadorTasa:
    def __init__(self, max_llamadas):
        self.max_llamadas = max_llamadas
        self.llamadas_actuales = 0

    def __call__(self, func):
        def wrapper(*args, **kwargs):
            if self.llamadas_actuales >= self.max_llamadas:
                raise PermissionError(f"Límite excedido: {self.max_llamadas} llamadas permitidas.")
            self.llamadas_actuales += 1
            return func(*args, **kwargs)
        return wrapper

# Instanciamos el decorador directamente en la sintaxis
@LimitadorTasa(max_llamadas=2)
def peticion_api():
    return "Datos de la API"

print(peticion_api()) # Ok
print(peticion_api()) # Ok
# print(peticion_api()) # Lanzará PermissionError
```

#### 2. Decoradores de clases (Modificando clases enteras)
En lugar de decorar una función, podemos decorar la definición de una clase completa. El decorador recibe la clase como argumento y devuelve la clase (generalmente la misma, pero modificada). Es una alternativa más legible y directa a las metaclases (que veremos en la sección 10.4) cuando solo necesitamos inyectar propiedades o métodos simples.

```python
def inyectar_auditoria(cls):
    """Añade atributos de auditoría estándar a una clase."""
    # Modificamos la clase original
    cls.creado_en = time.time()
    cls.auditado = True
    
    # Podemos inyectar métodos
    def reporte(self):
        return f"{self.__class__.__name__} auditable. Instanciado."
    
    cls.reporte = reporte
    return cls

@inyectar_auditoria
class TransaccionFinanciera:
    def __init__(self, monto):
        self.monto = monto

tx = TransaccionFinanciera(500)
print(tx.auditado)      # Salida: True
print(tx.reporte())     # Salida: TransaccionFinanciera auditable. Instanciado.
```

Tanto las fábricas de decoradores como el manejo de decoradores basados en clases nos dan herramientas de diseño extremadamente poderosas para aplicar principios DRY (Don't Repeat Yourself) y de separación de responsabilidades (Separation of Concerns). Sin embargo, esta alteración dinámica tiene un costo: la pérdida de metadatos originales de la función (como su docstring y su nombre), un problema crítico que solucionaremos en la próxima sección mediante `functools.wraps`.

## 10.3 Preservación de metadatos con `functools.wraps`

En la sección anterior, concluimos con una advertencia sobre un efecto secundario crítico de los decoradores: la alteración dinámica de una función provoca la pérdida de su identidad original. 

Cuando decoramos una función, lo que realmente estamos haciendo es sustituir la función original por el *closure* (el `wrapper`) que hemos definido dentro del decorador. Para el intérprete de Python, la función resultante es literalmente otra función, con otro nombre, otra ubicación en memoria y otra documentación.

### El problema: Crisis de identidad y pérdida de introspección

Veamos qué ocurre exactamente cuando implementamos un decorador estándar sin precauciones:

```python
def rastrear_llamada(func):
    def wrapper(*args, **kwargs):
        """Función interna que envuelve y rastrea."""
        print(f"Llamando a {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@rastrear_llamada
def calcular_impuesto(monto, porcentaje):
    """
    Calcula el impuesto aplicable a un monto dado.
    :param monto: Float o Int
    :param porcentaje: Porcentaje en formato decimal (ej: 0.21)
    """
    return monto * porcentaje

# Inspección de la función decorada
print(calcular_impuesto.__name__) 
# Salida: 'wrapper' (¡Debería ser 'calcular_impuesto'!)

print(calcular_impuesto.__doc__)  
# Salida: 'Función interna que envuelve y rastrea.' (¡Hemos perdido la documentación real!)
```

Para un script de 50 líneas, esto podría parecer un detalle menor. Para un ingeniero Senior trabajando en código de producción, es un desastre:
1. **El autocompletado en los IDEs** (VS Code, PyCharm) mostrará la firma y el docstring del `wrapper`, dejando al desarrollador a ciegas sobre qué argumentos reales necesita la función.
2. Herramientas de generación automática de documentación como **Sphinx o pdoc** generarán páginas inútiles llenas de funciones llamadas `wrapper`.
3. El **debugging** se vuelve una pesadilla, ya que el trazado de pila (stack trace) y los perfiladores (profilers) apuntarán repetidamente a la función interna del decorador en lugar de a la función original que falló.

### La solución estándar: `@functools.wraps`

La biblioteca estándar de Python nos proporciona una solución elegante e integrada en el módulo `functools`. La función `wraps` es un decorador diseñado específicamente para decorar la función `wrapper` dentro de tu propio decorador.

Su único trabajo es copiar los metadatos de la función original a la función envolvente.

```python
from functools import wraps

def rastrear_llamada_seguro(func):
    
    # Aplicamos @wraps pasándole la función original como argumento
    @wraps(func)
    def wrapper(*args, **kwargs):
        """Función interna que envuelve y rastrea."""
        print(f"Llamando a {func.__name__}")
        return func(*args, **kwargs)
        
    return wrapper

@rastrear_llamada_seguro
def calcular_impuesto_seguro(monto, porcentaje):
    """Calcula el impuesto aplicable a un monto dado."""
    return monto * porcentaje

# Inspección con el problema resuelto
print(calcular_impuesto_seguro.__name__) 
# Salida: 'calcular_impuesto_seguro'

print(calcular_impuesto_seguro.__doc__)  
# Salida: 'Calcula el impuesto aplicable a un monto dado.'
```

### Bajo el capó: ¿Qué transfiere `wraps` exactamente?

`functools.wraps` es en realidad una conveniencia sobre otra función llamada `functools.update_wrapper`. Cuando utilizas `@wraps(func)`, Python actualiza silenciosamente los atributos mágicos (dunder attributes) del `wrapper` para que coincidan con los de `func`.

Específicamente, copia los siguientes atributos por defecto:

* `__module__`: El nombre del módulo donde se definió la función.
* `__name__`: El nombre de la función original.
* `__qualname__`: El nombre cualificado (útil si la función es un método de una clase).
* `__doc__`: El docstring original.
* `__annotations__`: Los Type Hints (vitales para el Capítulo 11 y herramientas como `mypy` o FastAPI).

Además, actualiza el diccionario interno (`__dict__`) del wrapper con el de la función original.

#### El "pasadizo secreto": El atributo `__wrapped__`

Un detalle avanzado extremadamente útil que implementa `wraps` es la creación automática de un atributo llamado `__wrapped__`. Este atributo guarda una referencia directa a la función original *sin decorar*.

Esto es invaluable en testing o si necesitas "saltarte" la lógica del decorador temporalmente en un caso extremo:

```python
# Podemos invocar la función original, evadiendo completamente el print() del decorador
resultado_puro = calcular_impuesto_seguro.__wrapped__(100, 0.21)
```

**Regla de oro profesional:** Todo decorador de funciones o métodos que escribas en un entorno profesional debe utilizar `@functools.wraps`. Es considerado un estándar innegociable en el desarrollo de bibliotecas y frameworks en Python (como Django, Flask o FastAPI), ya que garantiza que la abstracción del decorador no destruya la interfaz introspectiva de la aplicación.

## 10.4 Introducción a Metaclases: controlando la creación de clases

En el Capítulo 5 (Programación Orientada a Objetos) establecimos una premisa fundamental: en Python, **absolutamente todo es un objeto**. Los números son objetos, las funciones son objetos (como vimos en 10.1) y, por supuesto, las instancias de tus clases son objetos. 

Pero esto nos lleva a una pregunta inevitable: si una instancia es un objeto creado por una clase, y todo es un objeto... **¿quién crea a la clase misma?**

La respuesta es la **metaclase**. Así como una clase define el comportamiento de sus instancias, una metaclase define el comportamiento de las clases. 

### El creador maestro: `type`

La mayoría de los desarrolladores conocen la función `type()` como una herramienta para inspeccionar el tipo de un objeto (`type(42)` devuelve `<class 'int'>`). Sin embargo, `type` tiene una doble vida. Cuando se invoca con tres argumentos, no inspecciona un objeto, sino que **crea una clase dinámicamente**.

La firma secreta de `type` es: `type(nombre, bases, diccionario_atributos)`

```python
# Crear una clase de forma tradicional
class MiClase:
    x = 5

# Crear exactamente la misma clase usando la metaclase 'type'
MiClaseDinamica = type('MiClaseDinamica', (), {'x': 5})

print(MiClaseDinamica.x) # Salida: 5
```

Bajo el capó, cada vez que usas la palabra reservada `class`, Python recopila el nombre, las clases base (herencia) y los atributos/métodos definidos en el bloque, y se los pasa a `type` para que construya el objeto clase.

El flujo de creación se puede visualizar así:

```text
+-------------------+        crea        +-------------------+        crea        +-------------------+
|  Metaclase        | -----------------> |  Clase            | -----------------> |  Instancia        |
|  (ej. type)       |                    |  (ej. Usuario)    |                    |  (ej. user_1)     |
+-------------------+                    +-------------------+                    +-------------------+
```

### Creando tu propia Metaclase

Para intervenir en el proceso de creación de una clase, debemos heredar de `type` y sobrescribir sus métodos mágicos, principalmente `__new__` (que asigna la memoria y construye la clase) y `__init__` (que la inicializa). 

El uso clásico de una metaclase es **imponer reglas o estándares** en el momento de la definición de la clase, antes incluso de que exista una sola instancia de la misma.

Imaginemos que somos los arquitectos de un framework y queremos obligar a que todos los desarrolladores escriban *docstrings* en los métodos de sus clases. Podemos forzar esta regla mediante una metaclase:

```python
class ValidarDocstringsMeta(type):
    """Metaclase que exige documentación en todos los métodos."""
    
    def __new__(mcs, nombre, bases, dct):
        # 'mcs' es la metaclase (ValidarDocstringsMeta)
        # 'nombre' es el nombre de la clase que se está creando
        # 'bases' es la tupla de clases padre
        # 'dct' es el diccionario con los atributos y métodos de la clase
        
        for nombre_attr, valor_attr in dct.items():
            # Si el atributo es una función y no es un método mágico (__algo__)
            if callable(valor_attr) and not nombre_attr.startswith("__"):
                if not valor_attr.__doc__:
                    raise TypeError(f"Error arquitectónico: El método '{nombre_attr}' en '{nombre}' carece de docstring.")
        
        # Si todo está correcto, delegamos la creación real a 'type'
        return super().__new__(mcs, nombre, bases, dct)

# Aplicamos la metaclase usando el argumento 'metaclass'
class ServicioAPI(metaclass=ValidarDocstringsMeta):
    
    def conectar(self):
        """Establece la conexión con el servidor."""
        pass
        
    # Descomentar el siguiente método lanzará un TypeError en tiempo de importación/definición
    # def desconectar(self):
    #     pass 
```

Notemos algo crucial: el error se lanzaría en el momento en que Python lee el archivo y define la clase, no cuando intentamos instanciar `ServicioAPI`. Esto convierte a las metaclases en herramientas de validación estática en tiempo de ejecución muy potentes.

### Patrones comunes con Metaclases

Además de la validación, las metaclases se utilizan en el desarrollo de librerías Senior para:
1. **Patrón Singleton:** Alterar el método `__call__` de la metaclase para interceptar la instanciación y asegurar que solo exista un objeto de la clase.
2. **Registro Automático (Registry):** Guardar automáticamente cada subclase que se crea en un diccionario central (muy útil para sistemas de plugins o serializadores).
3. **Modificación de atributos (ORMs):** Transformar campos declarativos en descriptores complejos. Así es exactamente como frameworks como Django ORM o SQLAlchemy Core convierten clases simples en representaciones de tablas de bases de datos.

### Metaclases vs Decoradores de Clases vs `__init_subclass__`

Llegados a este punto, podrías notar que algunas cosas que hace una metaclase también podrían lograrse con un decorador de clase (sección 10.2). ¿Cuándo usar qué?

1. **Decorador de clase:** Se ejecuta *después* de que la clase ha sido creada. Es ideal para añadir métodos, registrar la clase o alterar atributos existentes. Es más legible y menos intrusivo.
2. **`__init_subclass__`:** Un método de clase introducido en Python 3.6 que permite a una clase padre reaccionar cuando es heredada. Cubre el 80% de los casos de uso (como registros de plugins) que antiguamente requerían metaclases, sin la complejidad de estas.
3. **Metaclases:** Se ejecutan *durante* la creación. Úsalas solo cuando necesites alterar el diccionario de la clase antes de que la clase exista, o cuando necesites controlar el comportamiento de instanciación global (como modificar el `__call__` de la clase base).

Para cerrar este capítulo sobre metaprogramación, es casi un rito de paso citar al legendario desarrollador del núcleo de Python, Tim Peters, sobre las metaclases:

> *"Las metaclases son magia mucho más profunda de lo que el 99% de los usuarios debería preocuparse. Si te preguntas si las necesitas, no las necesitas (las personas que realmente las necesitan lo saben con certeza y no necesitan una explicación sobre por qué)."*

Conclosures, decoradores y metaclases en tu arsenal, has cruzado formalmente la frontera hacia la manipulación avanzada del comportamiento del lenguaje. Ahora estamos listos para explorar cómo Python ha evolucionado para incorporar estructuras estáticas en un mundo dinámico mediante el Tipado Estático (Capítulo 11).