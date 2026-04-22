En este capítulo exploraremos las herramientas que transforman a Python en un lenguaje capaz de gestionar datos a gran escala: las estructuras integradas. Comenzaremos por las **listas** y **tuplas**, entendiendo cómo la mutabilidad de una y la inmutabilidad de la otra dictan su uso en memoria. Luego, descenderemos al corazón del rendimiento con **diccionarios** y **sets**, desvelando cómo las **tablas hash** permiten búsquedas instantáneas. Finalmente, dominaremos la elegancia del código "Pythonic" mediante las **comprensiones** de datos y técnicas de **desempaquetado avanzado**, herramientas esenciales para cualquier desarrollador que aspire a la eficiencia y la arquitectura senior.

## 3.1 Listas y Tuplas: Uso, diferencias y métodos

Hasta ahora hemos trabajado con tipos de datos primitivos y estructuras de control. Sin embargo, en el mundo real, los programas necesitan gestionar colecciones de datos. Python nos ofrece varias estructuras integradas para este propósito, siendo las **secuencias** las más fundamentales. 

En esta sección profundizaremos en las dos secuencias más utilizadas: las **listas** y las **tuplas**. Ambas permiten almacenar múltiples elementos ordenados, pero tienen propósitos, comportamientos y optimizaciones bajo el capó muy diferentes.

---

### Listas: Dinamismo y Mutabilidad

Una lista (`list`) es una colección ordenada, heterogénea (puede contener diferentes tipos de datos) y, lo más importante, **mutable** (como vimos en el Capítulo 1.4). Su naturaleza dinámica la convierte en la estructura de datos más versátil de Python, ideal para colecciones de elementos que cambiarán a lo largo de la ejecución del programa.

Se definen utilizando corchetes `[]` o mediante la función constructora `list()`.

```python
# Creación de listas
tecnologias = ["Python", "Docker", "PostgreSQL"]
mixta = [42, 3.14, "Código", True, [1, 2]] # Lista anidada y heterogénea
```

Bajo el capó en CPython, las listas no son listas enlazadas (linked lists) tradicionales, sino **arreglos dinámicos** (dynamic arrays) de punteros. Esto significa que Python reserva un espacio en memoria ligeramente mayor al necesario. Cuando la lista crece y supera esta capacidad, Python crea un nuevo arreglo más grande en memoria, copia los elementos y destruye el antiguo.

#### Métodos principales de las listas

Debido a su mutabilidad, las listas poseen una rica variedad de métodos para alterar su estado (modificarlas *in-place*):

* **Agregar elementos:**
    * `.append(x)`: Añade el elemento `x` al final de la lista. (Operación $O(1)$ en promedio).
    * `.extend(iterable)`: Desempaqueta un iterable y añade sus elementos al final.
    * `.insert(i, x)`: Inserta `x` en el índice `i`. Puede ser costoso ($O(n)$) si se inserta al principio, ya que desplaza los demás elementos en memoria.
* **Eliminar elementos:**
    * `.pop([i])`: Elimina y retorna el elemento en la posición `i`. Si no se especifica `i`, elimina el último elemento.
    * `.remove(x)`: Elimina la primera aparición del valor `x`. Lanza `ValueError` si no existe.
    * `.clear()`: Vacía la lista por completo.
* **Organización:**
    * `.sort()`: Ordena la lista *in-place*.
    * `.reverse()`: Invierte el orden de los elementos *in-place*.

```python
servidores = ["web_01", "db_01"]

servidores.append("cache_01")
# ['web_01', 'db_01', 'cache_01']

servidores.insert(1, "web_02")
# ['web_01', 'web_02', 'db_01', 'cache_01']

eliminado = servidores.pop() 
# eliminado = "cache_01", servidores = ['web_01', 'web_02', 'db_01']

servidores.sort(reverse=True)
# ['web_02', 'web_01', 'db_01']
```

---

### Tuplas: Integridad e Inmutabilidad

Una tupla (`tuple`) es, en esencia, una lista **inmutable**. Una vez que se crea una tupla, no se pueden añadir, eliminar ni cambiar sus elementos. 

Curiosamente, lo que define a una tupla en Python no son los paréntesis `()`, sino **las comas** `,`. Los paréntesis se utilizan para agrupar y evitar ambigüedades, pero la coma es el operador real de creación (excepto para la tupla vacía).

```python
# Distintas formas de crear tuplas
coordenadas = (40.7128, -74.0060)
rgb_blanco = 255, 255, 255          # Los paréntesis son opcionales
tupla_un_elemento = ("Python",)     # La coma final es OBLIGATORIA
no_es_tupla = ("Python")            # Esto es solo un string entre paréntesis
```

#### Métodos de las tuplas

Dado que no pueden modificarse, las tuplas carecen de métodos como `append`, `remove` o `sort`. Su interfaz se reduce a operaciones de solo lectura:

* `.count(x)`: Devuelve el número de veces que aparece `x` en la tupla.
* `.index(x)`: Devuelve el primer índice donde se encuentra `x`.

**El "Gotcha" de la inmutabilidad:**
Aunque la tupla en sí es inmutable (los "punteros" a los objetos no pueden cambiar), si una tupla contiene objetos mutables (como una lista), **esos objetos internos sí pueden ser modificados**.

```python
tupla_trampa = (1, 2, ["a", "b"])
# tupla_trampa[0] = 10  # Lanza TypeError: 'tuple' object does not support item assignment

tupla_trampa[2].append("c") # Esto SÍ es válido
print(tupla_trampa)         # Salida: (1, 2, ['a', 'b', 'c'])
```

---

### Diferencias Clave: Cuándo usar cada una

La decisión entre usar una lista o una tupla no es arbitraria; obedece a razones semánticas, de rendimiento y de arquitectura de la memoria.

#### 1. Semántica: Homogeneidad vs. Heterogeneidad
Convencionalmente (y de forma idiomática en Python), **las listas se usan para datos homogéneos** (colecciones de elementos del mismo tipo, como una lista de nombres o de objetos de una clase). El orden y la posición no tienen un significado intrínseco más allá de la secuencia.

Por el contrario, **las tuplas se usan para datos heterogéneos** donde la posición de cada elemento tiene un significado específico, actuando a menudo como un "registro" o "struct" ligero sin nombres de campo (por ejemplo, una tupla `(nombre, edad, peso)` o coordenadas `(x, y)`).

#### 2. Rendimiento y Asignación de Memoria (Over-allocation)
Como se mencionó, las listas deben prever el crecimiento. Las tuplas, al ser estáticas, conocen su tamaño exacto al momento de la creación. Esto hace que las tuplas ocupen menos memoria y sean ligeramente más rápidas de instanciar e iterar.

```text
Representación simplificada en memoria:

LISTA (Arreglo Dinámico con Over-allocation)
[ Puntero_1 | Puntero_2 | Puntero_3 | Espacio_Libre | Espacio_Libre ]  <- Tamaño variable

TUPLA (Arreglo Estático)
[ Puntero_1 | Puntero_2 | Puntero_3 ]  <- Tamaño exacto y fijo, memoria contigua optimizada
```

#### 3. Hasheabilidad (Hashability)
Esta es una diferencia técnica crucial de cara al próximo capítulo (3.2). Como las listas pueden cambiar, no son *hashables* (su valor hash cambiaría, perdiendo su ubicación). Las tuplas puras (que solo contienen otros objetos inmutables) **sí son hashables**. 

Esto significa que **una tupla puede ser usada como clave en un diccionario o como elemento de un Set**, mientras que una lista no puede.

| Característica | `list` `[]` | `tuple` `()` |
| :--- | :--- | :--- |
| **Mutabilidad** | Mutable (dinámica) | Inmutable (estática) |
| **Sintaxis** | Corchetes `[1, 2]` | Comas `1, 2` o `(1, 2)` |
| **Tamaño en memoria** | Mayor (Over-allocation) | Menor (Ajuste exacto) |
| **Uso idiomático** | Colecciones de ítems similares | Registros, coordenadas, datos heterogéneos |
| **¿Hashable?** | ❌ No | ✅ Sí (si sus elementos son inmutables) |

## 3.2 Diccionarios y Sets: Tablas hash bajo el capó

Mientras que las listas y las tuplas son **secuencias** (donde los elementos se indexan mediante números enteros basados en su posición), los diccionarios y los sets pertenecen a una categoría completamente diferente. No se basan en el orden, sino en la **búsqueda eficiente por valor o clave**.

Para lograr esto, Python utiliza una de las estructuras de datos más brillantes de la informática: la **tabla hash**. Entender cómo funcionan es la línea divisoria entre escribir código que simplemente "funciona" y código altamente optimizado.

---

### Diccionarios (`dict`): Mapeo de Clave-Valor

Un diccionario es una colección mutable de pares clave-valor (key-value). Funciona como una base de datos en miniatura en la memoria RAM: tú le das una clave, y el diccionario te devuelve el valor asociado casi instantáneamente, sin importar si tiene diez elementos o diez millones.

```python
# Creación de diccionarios
usuario = {
    "username": "jdoe",
    "rol": "admin",
    "activo": True
}

# Alternativa usando el constructor dict()
config = dict(host="localhost", puerto=5432)
```

#### Métodos principales de los diccionarios

La manipulación de diccionarios es el pan de cada día en el desarrollo backend, especialmente al procesar JSONs o respuestas de bases de datos.

* **Acceso seguro:**
    * `dict["clave"]`: Devuelve el valor, pero lanza un `KeyError` si la clave no existe.
    * `.get("clave", valor_por_defecto)`: Intenta obtener el valor. Si la clave no existe, devuelve el valor por defecto (o `None` si no se especifica), evitando que el programa colapse.
* **Modificación:**
    * `.update(otro_dict)`: Actualiza el diccionario actual con los pares del nuevo. Si la clave ya existe, sobrescribe el valor.
    * `.setdefault("clave", valor)`: Si la clave no existe, la inserta con el valor especificado. Si ya existe, simplemente devuelve el valor actual.
* **Vistas (Iteración):**
    * `.keys()`: Retorna una vista de las claves.
    * `.values()`: Retorna una vista de los valores.
    * `.items()`: Retorna una vista de tuplas `(clave, valor)`, ideal para bucles `for`.

```python
# Acceso seguro
rol = usuario.get("rol", "invitado")  # 'admin'
email = usuario.get("email")          # None

# Iteración idiomática
for clave, valor in usuario.items():
    print(f"{clave}: {valor}")
```

---

### Sets: Conjuntos matemáticos puros

Un `set` (conjunto) es una colección mutable y no ordenada de elementos **únicos**. Puedes pensar en un set como un diccionario que solo tiene claves, sin valores. Su propósito principal es eliminar duplicados rápidamente y realizar operaciones de teoría de conjuntos (intersecciones, uniones, etc.).

**Cuidado con la sintaxis:** Para crear un set vacío, **debes** usar `set()`. Si usas `{}`, Python creará un diccionario vacío.

```python
# Eliminación de duplicados en $O(n)$
ips_visitantes = ["192.168.1.1", "10.0.0.5", "192.168.1.1"]
ips_unicas = set(ips_visitantes)
# {'192.168.1.1', '10.0.0.5'}

backend_devs = {"Ana", "Carlos", "David"}
frontend_devs = {"Carlos", "Elena", "Ana"}

# Operaciones matemáticas ultra-optimizadas
fullstack = backend_devs & frontend_devs  # Intersección: {'Carlos', 'Ana'}
todos = backend_devs | frontend_devs      # Unión: {'Ana', 'Carlos', 'David', 'Elena'}
solo_back = backend_devs - frontend_devs  # Diferencia: {'David'}
```

---

### Bajo el Capó: La magia de las Tablas Hash

Tanto los diccionarios como los sets logran sus tiempos de búsqueda en $O(1)$ (tiempo constante) gracias a las **tablas hash**. Cuando insertas un par en un diccionario o un elemento en un set, Python no busca secuencialmente dónde guardarlo. Sigue este proceso:

1.  **Cálculo del Hash:** Python pasa la clave por una función matemática incorporada llamada `hash()`. Esta función toma el dato y devuelve un número entero pseudoaleatorio pero determinista.
2.  **Módulo (Indexación):** Toma ese número grande y aplica una operación de módulo (`%`) basada en el tamaño actual del arreglo de la tabla hash en memoria. Esto genera un índice exacto.
3.  **Almacenamiento:** El par clave-valor se guarda en ese índice específico (llamado "bucket").

Cuando pides el valor de una clave, Python no tiene que buscar en toda la lista. Simplemente vuelve a calcular el hash, va directamente a esa dirección de memoria y extrae el dato.

```text
Flujo interno al hacer: dict["edad"] = 30

1. hash("edad") -----> 87463524912
2. 87463524912 % 8 (tamaño de tabla) -----> Índice 3

Memoria (Arreglo bajo el capó):
[0] -> Vacío
[1] -> Vacío
[2] -> Vacío
[3] -> ("edad", 30)  <-- Inserción/Lectura directa
[4] -> Vacío
...
```

#### La restricción de oro: Hasheabilidad y Colisiones

Para que este sistema funcione, **el valor del hash nunca debe cambiar durante la vida del objeto**. Si cambiara, perderíamos su ubicación en la memoria. 

Por esta razón, **solo los objetos inmutables pueden ser claves de diccionario o elementos de un set** (como strings, enteros, flotantes y tuplas que contengan elementos inmutables). Como vimos en el capítulo anterior, las listas no son *hashables* porque si mutan, su valor interior cambia.

```python
valido = { ("coord_x", "coord_y"): 100 } # La tupla es hashable
# invalido = { ["coord_x", "coord_y"]: 100 } # Lanza TypeError: unhashable type: 'list'
```

**¿Qué pasa con las colisiones?**
A veces, dos claves diferentes generan el mismo índice (colisión). CPython maneja esto usando un método llamado *Open Addressing* (Direccionamiento abierto) con sondeo (probing) pseudoaleatorio: si el "bucket" ya está ocupado, Python usa una fórmula matemática rápida para saltar a otro bucket vacío predecible.

#### El orden de inserción (Una nota histórica)

Históricamente, debido a la naturaleza de las tablas hash, los diccionarios y sets no garantizaban el orden. Las claves aparecían "desordenadas" al imprimirlas. 

Sin embargo, a partir de **Python 3.7**, los diccionarios garantizan **preservar el orden de inserción**. Esto se logró separando la tabla de índices dispersos del arreglo donde se guardan realmente los pares clave-valor. Esto no solo hizo que los diccionarios fueran ordenados, sino que redujo su consumo de memoria entre un 20% y un 25%. (Nota: Los `sets`, por el contrario, siguen sin tener un orden garantizado).

## 3.3 Comprensiones (Comprehensions) de listas, diccionarios y sets

En Python, la legibilidad es un principio fundamental. Cuando necesitamos transformar o filtrar una colección de datos para crear una nueva, el enfoque tradicional imperativo (usar un bucle `for` vacío, iterar, aplicar lógica y añadir elementos uno a uno mediante `.append()`) puede volverse verboso. 

Las **comprensiones** (o *comprehensions*) son una de las características más amadas y distintivas del lenguaje. Nos permiten crear nuevas secuencias de manera **declarativa**, expresando *qué* queremos obtener en lugar de detallar paso a paso *cómo* construirlo.

Además de ser más legibles (una vez que te acostumbras a la sintaxis), las comprensiones son **más rápidas**. Al estar optimizadas en C a nivel del intérprete (CPython), evitan la sobrecarga de buscar y llamar al método `.append()` en cada iteración del bucle.

---

### Comprensiones de Listas (List Comprehensions)

La sintaxis de una comprensión de lista encapsula un bucle `for` y un bloque `if` opcional dentro de un par de corchetes `[]`.

```text
Anatomía de una comprensión:

NUEVA_LISTA = [ expresión   for elemento in iterable   if condición ]
                   |                 |                      |
             1. ¿Qué guardo?   2. ¿De dónde lo saco?  3. ¿El filtro? (Opcional)
```

**De Imperativo a Declarativo:**
Imagina que queremos obtener los cuadrados de los números pares del 0 al 9.

```python
# Enfoque tradicional (Imperativo)
cuadrados_pares = []
for i in range(10):
    if i % 2 == 0:
        cuadrados_pares.append(i**2)

# Enfoque Pythonic (Declarativo)
cuadrados_pares = [i**2 for i in range(10) if i % 2 == 0]
```

El resultado es el mismo (`[0, 4, 16, 36, 64]`), pero el segundo enfoque requiere una sola línea y describe directamente la intención matemática.

---

### Comprensiones de Diccionarios y Sets

Las comprensiones no se limitan a las listas. Introducidas en Python 2.7, las comprensiones de diccionarios y sets aplican el mismo concepto usando llaves `{}`.

#### Set Comprehensions
Si usamos llaves y proveemos una sola expresión, Python creará un Set. Esto es extremadamente útil para extraer valores únicos y transformarlos al mismo tiempo.

```python
# Extraer los dominios únicos de una lista de correos
emails = ["ana@python.org", "luis@gmail.com", "carlos@python.org", "eva@yahoo.com"]

# Usamos llaves {} para garantizar unicidad y O(1) en búsquedas futuras
dominios_unicos = {correo.split('@')[1] for correo in emails}
# Resultado: {'python.org', 'gmail.com', 'yahoo.com'}
```

#### Dictionary Comprehensions
Si usamos llaves pero separamos dos expresiones con dos puntos `clave: valor`, Python creará un Diccionario. Un caso de uso clásico en el desarrollo backend es invertir las claves y valores de un diccionario existente.

```python
# Mapeo de IDs de base de datos
usuarios = {"jdoe": 101, "msmith": 102, "aroz": 103}

# Invertir el diccionario (suponiendo que los valores también son únicos)
id_a_usuario = {v: k for k, v in usuarios.items()}
# Resultado: {101: 'jdoe', 102: 'msmith', 103: 'aroz'}
```

---

### Nivel Senior: Lógica Avanzada y Antipatrones

Para dominar las comprensiones, es vital entender cómo anidar lógica y, sobre todo, cuándo **no** usarlas.

#### 1. El operador ternario en la expresión (Filtrar vs. Transformar)
Un error muy común es confundir el `if` de filtrado (al final) con una bifurcación de transformación (al principio). 
Si quieres omitir elementos, el `if` va al final. Si quieres modificar el elemento dependiendo de una condición, debes usar una expresión condicional (operador ternario) al inicio.

```python
numeros = [1, -5, 3, -2, 8]

# FILTRAR: Solo quiero los positivos
positivos = [x for x in numeros if x > 0]
# [1, 3, 8]

# TRANSFORMAR: Quiero todos, pero reemplazo los negativos por 0
normalizados = [x if x > 0 else 0 for x in numeros]
# [1, 0, 3, 0, 8]
```

#### 2. Comprensiones Anidadas (Aplanando estructuras)
Puedes usar múltiples `for` en una sola comprensión. El orden de evaluación es de izquierda a derecha, idéntico a cómo se anidarían los bucles tradicionales.

```python
# Matriz 2D (Lista de listas)
matriz = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

# Aplanar la matriz en una lista de una dimensión (1D)
plana = [numero for fila in matriz for numero in fila]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]
```
*Modelo mental para anidamiento:* Lee siempre el primer `for` como el bucle exterior, y el siguiente `for` como el bucle interior.

#### 3. El Antipatrón de la "Comprensión Ilegible" (Zen de Python)
El Zen de Python dicta que *"la legibilidad cuenta"* y *"simple es mejor que complejo"*. Aunque es técnicamente posible anidar múltiples `for`, `if` y operadores ternarios en una sola línea, **rara vez es una buena idea en un entorno profesional**.

```python
# ❌ Antipatrón: Técnicamente correcto, pero imposible de mantener
datos = [x**2 if x % 2 == 0 else x**3 for sub in matriz for x in sub if x > 1]

# ✅ Solución Senior: Volver al bucle tradicional o extraer lógica a una función
datos = []
for fila in matriz:
    for x in fila:
        if x > 1:
            if x % 2 == 0:
                datos.append(x**2)
            else:
                datos.append(x**3)
```

**Regla de oro:** Si tu comprensión ocupa más de dos líneas para ser leída o requiere que otro desarrollador detenga su vista más de 5 segundos para entenderla, sacrifica ese microsegundo de rendimiento, despídete de la comprensión y escribe un bucle `for` tradicional bien documentado. Las comprensiones son herramientas de claridad, no desafíos de "código en una línea" (code golf).

## 3.4 Desempaquetado avanzado de secuencias (Unpacking)

El desempaquetado (unpacking) es una de las características más elegantes y "Pythonicas" del lenguaje. Permite extraer elementos de iterables (como listas, tuplas, cadenas de texto o generadores) y asignarlos a múltiples variables en una sola línea de código, de forma limpia y declarativa.

Más allá de ahorrar líneas de código, el desempaquetado profundo comunica instantáneamente la estructura de los datos con los que estás trabajando, haciendo que tu código sea auto-documentado.

---

### 1. Desempaquetado Básico y la variable "Dummy" (`_`)

El caso más elemental ocurre cuando el número de variables a la izquierda del signo igual coincide exactamente con el número de elementos de la secuencia a la derecha.

```python
# Asignación múltiple clásica
coordenadas = (4.5981, -74.0758)
latitud, longitud = coordenadas

# Intercambio de variables sin variable temporal (Swapping)
a, b = 10, 20
a, b = b, a  # a = 20, b = 10
```

**La convención del guion bajo (`_`):**
A menudo, recibimos una tupla o lista donde solo nos interesan ciertos valores. Para evitar declarar variables que nunca usaremos (lo cual activaría advertencias en linters como Flake8 o Pylint), la comunidad de Python utiliza el guion bajo `_` como una variable "desechable" (dummy variable).

```python
registro_usuario = ("jdoe", "jdoe@email.com", "127.0.0.1", "2023-10-25")

# Solo nos interesa el username y la fecha de registro
username, _, _, fecha_registro = registro_usuario
```
*Nota técnica:* `_` es una variable real y válida en Python, y de hecho almacenará el valor asignado. Sin embargo, por convención universal, indica al lector humano y a las herramientas de análisis de código que ese valor será ignorado intencionalmente.

---

### 2. Desempaquetado con Asterisco (`*`): Capturando el "Resto"

Introducido en PEP 3132, el uso del operador `*` (asterisco o *splat*) llevó el desempaquetado a un nivel superior. Permite agrupar dinámicamente una cantidad arbitraria de elementos restantes en una lista. 

Esto es extremadamente útil cuando la longitud del iterable es desconocida o variable.

```text
Visualización del Desempaquetado con *

Datos:         [ 10,  20,  30,  40,  50 ]
                 |    |----|----|    |
primero, *medio, ultimo      |
   |        |                |
   v        v                v
  10     [20, 30, 40]       50
```

**Patrones comunes de uso:**

```python
notas = [95, 82, 75, 100, 88, 91]

# Extraer el primero y agrupar el resto
primera, *resto = notas
# primera = 95, resto = [82, 75, 100, 88, 91]

# Ignorar los extremos y quedarse con el centro
_, *calificaciones_validas, _ = notas
# calificaciones_validas = [82, 75, 100, 88]

# Extraer el último elemento dinámicamente
*historial, comando_actual = ["cd /var", "ls", "grep error", "tail -f log"]
# historial = ['cd /var', 'ls', 'grep error'], comando_actual = 'tail -f log'
```

*Importante:* La variable precedida por `*` **siempre** se convertirá en una lista, incluso si captura cero elementos (en cuyo caso será una lista vacía `[]`). Solo puede haber un operador `*` en una expresión de desempaquetado.

---

### 3. Desempaquetado Profundo (Deep Unpacking)

El desempaquetado puede anidarse para coincidir con la estructura exacta de datos complejos, como listas que contienen tuplas. Esto es muy útil al consumir respuestas de APIs o procesar datos estructurados.

```python
# Una lista de tuplas, donde cada tupla contiene (Nombre, (Latitud, Longitud))
ubicaciones = [
    ("Bogotá", (4.5981, -74.0758)),
    ("Buenos Aires", (-34.6037, -58.3816))
]

# Desempaquetado directamente en el bucle for
for ciudad, (lat, lon) in ubicaciones:
    print(f"La latitud de {ciudad} es {lat}")
```

Al especificar la forma `(lat, lon)` dentro de la declaración del `for`, Python extrae automáticamente los valores internos, evitando que tengamos que hacer `coords = ubicacion[1]` y luego `lat = coords[0]`.

---

### 4. Fusión de Estructuras: `*` para iterables y `**` para diccionarios

A partir de Python 3.5 (PEP 448), los operadores de desempaquetado pueden usarse de manera independiente dentro de las declaraciones de estructuras de datos para "aplanarlas" o fusionarlas.

**Fusionando Listas y Sets:**
Puedes usar `*` para desempaquetar el contenido de un iterable directamente en otro iterable.

```python
base_numeros = [1, 2, 3]
mas_numeros = [4, 5]

# Fusión declarativa
combinados = [*base_numeros, *mas_numeros, 6, 7]
# [1, 2, 3, 4, 5, 6, 7]
```

**Fusionando Diccionarios con `**`:**
Mientras que un asterisco `*` extrae claves o elementos secuenciales, el doble asterisco `**` extrae pares clave-valor. Esto permite combinar diccionarios de forma inmutable, reemplazando el uso del método `.update()`.

```python
config_por_defecto = {"host": "localhost", "port": 8080, "debug": False}
config_usuario = {"port": 5000, "debug": True}

# El diccionario a la derecha sobrescribe las claves duplicadas del de la izquierda
config_final = {**config_por_defecto, **config_usuario}

# config_final = {'host': 'localhost', 'port': 5000, 'debug': True}
```

*Nota para el Capítulo 4:* Este mismo concepto de `*` y `**` es la base fundamental de cómo Python maneja la recepción de un número variable de argumentos en las funciones (`*args` y `**kwargs`), tema que exploraremos a profundidad en la siguiente sección.