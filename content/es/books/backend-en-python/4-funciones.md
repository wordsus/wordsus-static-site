Las funciones son el corazón de la arquitectura en Python. En esta sección, descubrirás cómo transformar bloques de código aislados en herramientas reutilizables y predecibles. Aprenderás que una función es mucho más que un grupo de instrucciones: es un ecosistema con sus propias reglas de visibilidad, donde la **Regla LEGB** dicta cómo se resuelven los nombres de las variables. Exploraremos la flexibilidad extrema del lenguaje para inyectar datos mediante argumentos posicionales, nombrados y empaquetados (`*args` y `**kwargs`). Finalmente, elevaremos tu nivel al tratar las funciones como "objetos de primera clase", sentando las bases para el paradigma funcional y el código limpio.

## 4.1 Definición, retorno y el alcance de las variables (Regla LEGB)

A medida que tus scripts en Python crecen más allá de unas pocas líneas, la necesidad de estructurar y reutilizar la lógica se vuelve primordial. Las funciones son el bloque de construcción fundamental para lograr esta modularidad. En esta sección, no solo veremos cómo crearlas, sino también cómo Python gestiona el ciclo de vida y la visibilidad de las variables que viven dentro y fuera de ellas.

### Definición de Funciones

En Python, una función se define utilizando la palabra clave `def`, seguida del nombre de la función, paréntesis y dos puntos. El bloque de código que constituye el cuerpo de la función debe estar indentado. 

Por convención (PEP 8), los nombres de las funciones deben escribirse en minúsculas, separando las palabras con guiones bajos (`snake_case`).

```python
def saludar_usuario(nombre):
    """
    Imprime un saludo personalizado.
    Esta cadena de texto es un docstring, utilizado para documentar.
    """
    print(f"¡Hola, {nombre}! Bienvenido al sistema.")

saludar_usuario("Ana")  # Llamada a la función
```

### El valor de Retorno (`return`)

A diferencia de otros lenguajes que hacen una distinción estricta entre procedimientos (que no devuelven nada) y funciones (que sí lo hacen), en Python **todas las funciones retornan un valor**. 

Utilizamos la palabra clave `return` para enviar un resultado de vuelta al punto donde la función fue invocada. En el momento en que Python ejecuta un `return`, la función termina inmediatamente.

```python
def calcular_descuento(precio_base, porcentaje):
    descuento = precio_base * (porcentaje / 100)
    precio_final = precio_base - descuento
    return precio_final

total = calcular_descuento(1000, 15) # total será 850.0
```

**Comportamientos clave del retorno en Python:**

* **Retorno implícito:** Si una función no tiene una instrucción `return`, o si el `return` está vacío, Python devuelve automáticamente el valor `None`.
* **Retorno múltiple:** Como vimos en el capítulo de estructuras de datos, Python permite retornar múltiples valores. Bajo el capó, Python empaqueta estos valores en una tupla, que luego puede ser desempaquetada por el llamador.

```python
def obtener_coordenadas():
    # Retorna una tupla de forma implícita
    return 40.4168, -3.7038 

latitud, longitud = obtener_coordenadas() # Desempaquetado
```

---

### El Alcance de las Variables y la Regla LEGB

Uno de los conceptos que separa a los principiantes de los desarrolladores avanzados es la comprensión exacta de cómo Python resuelve los nombres de las variables. Cuando haces referencia a una variable dentro de una función, Python busca su valor siguiendo un orden estricto conocido como la **Regla LEGB**.

Este acrónimo define la jerarquía de los ámbitos (scopes) de resolución:

```text
Jerarquía de Búsqueda de Variables (Desde adentro hacia afuera)
+-------------------------------------------------------------+
|  B - Built-in (Integrado)                                   |
|  Funciones nativas como print(), len(), TypeError           |
|  +-------------------------------------------------------+  |
|  | G - Global (Módulo)                                   |  |
|  | Variables definidas a nivel del archivo .py           |  |
|  | +---------------------------------------------------+ |  |
|  | | E - Enclosing (Ámbito envolvente)                 | |  |
|  | | Variables en la función externa (funciones anidadas)| |  |
|  | | +-----------------------------------------------+ | |  |
|  | | | L - Local                                     | | |  |
|  | | | Variables creadas dentro de la función actual | | |  |
|  | | +-----------------------------------------------+ | |  |
|  | +---------------------------------------------------+ |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

Veamos cómo funciona esto en la práctica. Cuando Python encuentra una variable, buscará en el siguiente orden:

1.  **L (Local):** Primero busca dentro del cuerpo de la función actual.
2.  **E (Enclosing):** Si no la encuentra, busca en el ámbito local de cualquier función contenedora (si estamos dentro de una función anidada).
3.  **G (Global):** Si sigue sin encontrarla, busca a nivel global en el módulo actual.
4.  **B (Built-in):** Como último recurso, busca en el módulo predeterminado de Python (donde viven funciones como `print`, `sum`, o `len`). Si no está aquí, lanza un `NameError`.

A continuación, un ejemplo que ilustra los cuatro niveles:

```python
# G: Ámbito Global
mensaje = "Global"

def funcion_externa():
    # E: Ámbito Enclosing (Envolvente para la función interna)
    mensaje = "Enclosing"
    
    def funcion_interna():
        # L: Ámbito Local
        mensaje = "Local"
        
        # B: Built-in (print es una función integrada)
        print(mensaje) 
        
    funcion_interna()

funcion_externa() # Imprimirá "Local"
```
*Si comentas la línea `mensaje = "Local"`, imprimirá "Enclosing". Si también comentas `mensaje = "Enclosing"`, imprimirá "Global".*

### Modificando el Alcance: `global` y `nonlocal`

Por defecto, si intentas asignar un valor a una variable dentro de una función, Python asume que quieres crear una **nueva variable local**, incluso si ya existe una variable global con ese nombre. 

Para modificar variables en ámbitos superiores, Python provee dos palabras clave:

* **`global`:** Permite modificar una variable del ámbito global desde dentro de una función.
* **`nonlocal`:** Permite modificar una variable del ámbito envolvente (Enclosing) desde una función anidada. (Este concepto será crucial cuando veamos *Closures* en el Capítulo 10).

```python
contador_global = 0

def incrementar():
    global contador_global
    contador_global += 1  # Modifica la variable global, no crea una local

incrementar()
print(contador_global)  # Salida: 1
```

> **Nota de Arquitectura:** Aunque `global` y `nonlocal` son herramientas válidas, su uso excesivo es considerado un *anti-patrón*. Modificar estados globales desde funciones puras dificulta el rastreo de errores, complica la concurrencia (como veremos en la Parte IV) y rompe la encapsulación. En código Senior, el estado se pasa a través de argumentos y se retorna mediante valores, o se gestiona utilizando Programación Orientada a Objetos.

## 4.2 Manejo de argumentos: posicionales, nombrados, `*args` y `**kwargs`

Una vez que comprendemos cómo viven y mueren las variables dentro de una función, el siguiente paso evolutivo es dominar cómo inyectarles datos. La flexibilidad en el manejo de argumentos es, sin duda, una de las características más expresivas de Python. A diferencia de lenguajes más rígidos, Python nos ofrece un arsenal de herramientas para crear firmas de funciones dinámicas, robustas y, sobre todo, legibles.

### Argumentos Posicionales y Nombrados

Hasta ahora, la forma más intuitiva de pasar argumentos es por **posición**. El primer argumento en la llamada se asigna al primer parámetro en la definición, el segundo al segundo, y así sucesivamente.

Sin embargo, cuando una función recibe múltiples parámetros, depender exclusivamente de la posición puede hacer que el código sea difícil de leer y propenso a errores. Aquí entran los **argumentos nombrados** (keyword arguments).

```python
def conectar_bd(host, puerto, usuario, contraseña):
    print(f"Conectando a {host}:{puerto} como {usuario}...")

# Llamada posicional (Rígida, requiere memorizar el orden)
conectar_bd("localhost", 5432, "admin", "1234")

# Llamada con argumentos nombrados (Clara, el orden ya no importa)
conectar_bd(usuario="admin", contraseña="1234", host="localhost", puerto=5432)
```

**Regla de oro:** En una llamada a una función, los argumentos posicionales *siempre* deben ir antes que los argumentos nombrados. `conectar_bd(host="localhost", 5432, ...)` lanzará un `SyntaxError`.

### Valores por defecto y la trampa de la mutabilidad

Podemos asignar valores por defecto a los parámetros en la definición de la función. Si el usuario no proporciona ese argumento, Python utilizará el valor predeterminado.

```python
def saludar(nombre, saludo="Hola"):
    return f"{saludo}, {nombre}"
```

> **Nota de Arquitectura (De Cero a Senior): El Antipatrón del Argumento Mutable**
> Uno de los errores más clásicos (y difíciles de depurar) en Python es usar estructuras de datos mutables (como listas o diccionarios) como valores por defecto.
>
> ```python
> # ❌ MALA PRÁCTICA
> def agregar_empleado(nombre, equipo=[]):
>     equipo.append(nombre)
>     return equipo
> 
> print(agregar_empleado("Ana"))    # Salida: ['Ana']
> print(agregar_empleado("Carlos")) # Salida: ['Ana', 'Carlos'] - ¡Cuidado!
> ```
> **¿Por qué ocurre esto?** Los valores por defecto se evalúan *una sola vez* cuando la función es definida (al momento de importar o leer el script), no cada vez que se llama. La lista `equipo` es la misma instancia en memoria para todas las llamadas.
>
> ```python
> # ✅ BUENA PRÁCTICA
> def agregar_empleado(nombre, equipo=None):
>     if equipo is None:
>         equipo = []
>     equipo.append(nombre)
>     return equipo
> ```

### `*args`: Empaquetado de Posicionales Arbitrarios

A veces no sabemos de antemano cuántos argumentos posicionales recibirá nuestra función. Python nos permite capturar un número arbitrario de ellos utilizando un asterisco (`*`) antes del nombre del parámetro. 

Por convención universal se utiliza la palabra `args` (arguments), pero la verdadera magia reside en el asterisco. Python tomará todos los argumentos posicionales adicionales y los empaquetará en una **tupla**.

```python
def calcular_promedio(titulo, *args):
    if not args:
        return f"{titulo}: Sin datos"
    promedio = sum(args) / len(args)
    return f"{titulo}: {promedio}"

# 'Matemáticas' va a 'titulo', el resto se empaqueta en la tupla 'args'
print(calcular_promedio("Matemáticas", 90, 85, 95)) 
# Salida: Matemáticas: 90.0
```

### `**kwargs`: Empaquetado de Nombrados Arbitrarios

De manera similar, si queremos aceptar un número indefinido de argumentos *nombrados*, utilizamos dos asteriscos (`**`). Por convención se le llama `kwargs` (keyword arguments). Python agrupará todos estos pares clave-valor adicionales en un **diccionario**.

```python
def crear_perfil_usuario(username, email, **kwargs):
    perfil = {
        "user": username,
        "email": email,
        "metadata": kwargs # El resto de argumentos nombrados caen aquí
    }
    return perfil

usuario = crear_perfil_usuario(
    "dev_guru", 
    "dev@example.com", 
    rol="admin", 
    tema="oscuro", 
    notificaciones=True
)
# 'kwargs' contendrá: {'rol': 'admin', 'tema': 'oscuro', 'notificaciones': True}
```

### Anatomía y Orden Exacto de los Parámetros

Cuando diseñas funciones complejas que utilizan todos estos mecanismos simultáneamente, debes respetar una jerarquía estricta en la definición de la función. Si rompes este orden, Python lanzará un error de sintaxis.

```text
Orden de Declaración de Parámetros:
1. Posicionales estándar (ej. `a`, `b`)
2. Posicionales con valor por defecto (ej. `c=10`)
3. Captura de posicionales arbitrarios (`*args`)
4. Argumentos que deben ser nombrados obligatoriamente (Keyword-only)
5. Captura de nombrados arbitrarios (`**kwargs`)
```

**Ejemplo integrador:**

```python
def arrancar_servicio(nombre, puerto=8080, *args, modo_debug=False, **kwargs):
    print(f"Servicio: {nombre}")
    print(f"Puerto: {puerto}")
    print(f"Argumentos extra (args): {args}")
    print(f"Debug: {modo_debug}")
    print(f"Configuraciones extra (kwargs): {kwargs}")

arrancar_servicio("API_Usuarios", 3000, "fast_start", "log_verbose", modo_debug=True, timeout=60, retries=3)
```

### Funciones de Nivel Senior: Forzando la Claridad (`*` y `/`)

En bases de código modernas e interfaces de librerías (APIs), a veces es necesario restringir cómo el usuario puede llamar a una función para evitar ambigüedades.

* **Forzar argumentos nombrados (`*`):** Si colocas un asterisco solitario en la firma, todos los parámetros a su derecha *deben* pasarse obligatoriamente por nombre (Keyword-only). Esto mejora enormemente la legibilidad al evitar llamadas como `transferir(100, 50, 200)` donde no sabemos qué es cada número.

```python
def transferir_fondos(origen, destino, *, cantidad, moneda="USD"):
    pass

# transferir_fondos(1, 2, 500) # ❌ TypeError
transferir_fondos(1, 2, cantidad=500) # ✅ Obliga a especificar 'cantidad'
```

* **Forzar argumentos posicionales (`/`):** Introducido en Python 3.8, la barra diagonal indica que los parámetros a su izquierda *solo* pueden pasarse por posición (Positional-only). Es útil cuando los nombres de los parámetros no aportan valor semántico o podrían cambiar en el futuro sin querer romper la compatibilidad con el código cliente (como en funciones nativas escritas en C, ej: `len(obj)` en lugar de `len(obj=mi_lista)`).

```python
def capitalizar(texto, /):
    return texto.capitalize()

# capitalizar(texto="hola") # ❌ TypeError
capitalizar("hola")         # ✅ Correcto
```

## 4.3 Funciones anónimas (Lambda)

Hasta ahora hemos construido funciones utilizando la declaración `def`, dándoles un nombre, un bloque de código y, a menudo, una documentación detallada. Sin embargo, en el día a día del desarrollo, a veces necesitamos una función minúscula, de un solo uso, que no justifica la ceremonia de una definición completa. Para estos casos, Python nos ofrece las **funciones anónimas**, más conocidas como funciones **lambda**.

El término "lambda" proviene del Cálculo Lambda (un sistema formal en lógica matemática), pero en la práctica de Python, simplemente significa: *una función sin nombre de una sola línea*.

### Sintaxis y Naturaleza de una Lambda

La sintaxis de una función lambda es extremadamente minimalista. Se define con la palabra clave `lambda`, seguida de los parámetros, dos puntos (`:`) y, finalmente, **una única expresión** que será evaluada y retornada automáticamente.

```python
# Sintaxis general:
# lambda argumentos: expresion
```

A diferencia de una función regular, no se utilizan paréntesis para los argumentos, no se requiere la palabra `return` (es implícito) y todo debe caber lógicamente en una sola línea.

Veamos la comparación directa:

```python
# Función tradicional con 'def'
def elevar_al_cuadrado(x):
    return x ** 2

# Función anónima equivalente
lambda x: x ** 2
```

Si quisiéramos usar la función lambda anterior por sí sola (algo que rara vez haremos, como veremos en las buenas prácticas), tendríamos que invocarla inmediatamente:

```python
resultado = (lambda x: x ** 2)(5)
print(resultado)  # Salida: 25
```

### ¿Cuándo usar Lambdas realmente? (El parámetro `key`)

El verdadero poder de las funciones lambda no reside en llamarlas directamente, sino en **pasarlas como argumentos a otras funciones** que esperan recibir una función (comportamiento). 

El caso de uso más idiomático y frecuente en código de producción es como argumento `key` en funciones de ordenamiento como `sorted()`, `min()` o `max()`.

Imagina que tienes una lista de diccionarios que representan usuarios y quieres ordenarlos por edad:

```python
usuarios = [
    {"nombre": "Carlos", "edad": 35, "rol": "Admin"},
    {"nombre": "Ana", "edad": 28, "rol": "Dev"},
    {"nombre": "Luis", "edad": 42, "rol": "Dev"}
]

# Ordenar por edad ascendente usando una lambda
usuarios_por_edad = sorted(usuarios, key=lambda u: u["edad"])

# Ordenar por longitud del nombre
usuarios_por_nombre_corto = sorted(usuarios, key=lambda u: len(u["nombre"]))
```

En estos ejemplos, la lambda actúa como un extractor rápido de datos. Crear una función `def extraer_edad(u): return u["edad"]` solo para usarla una vez en el `sorted()` añadiría ruido innecesario al archivo.

### Limitaciones Estrictas

Para mantener la simplicidad, Python impone restricciones severas a las lambdas que las diferencian de sus contrapartes en lenguajes como JavaScript (donde las *arrow functions* pueden tener bloques enteros de código):

1. **Una sola expresión, ninguna declaración (statement):** El cuerpo de una lambda debe ser algo que pueda ser evaluado a un valor. No puedes usar declaraciones como `if`, `while`, `for`, `pass`, `return` o asignaciones de variables (`x = 5`).
2. **Excepción con el operador ternario:** Aunque no puedes usar un bloque `if` tradicional, sí puedes usar una expresión condicional (operador ternario) porque, al fin y al cabo, se evalúa a un valor.
   ```python
   # Válido: Es una expresión
   clasificar = lambda nota: "Aprobado" if nota >= 60 else "Reprobado"
   ```
3. **Depuración opaca:** Si ocurre una excepción dentro de una lambda, el *Traceback* (rastreo de pila) de Python mostrará el error originado en `<lambda>`, sin el nombre descriptivo que tendría una función `def`. Esto dificulta encontrar errores si abusas de ellas.

> **Nota de Arquitectura (De Cero a Senior): El Antipatrón de Asignación y Abuso**
> 
> Un error de estilo muy común entre desarrolladores junior es asignar una lambda a una variable para usarla como una función normal.
> 
> ```python
> # ❌ MALA PRÁCTICA (Viola la guía de estilo PEP 8)
> multiplicar = lambda a, b: a * b
> resultado = multiplicar(5, 4)
> ```
> 
> **¿Por qué está mal?** El propósito principal de una lambda es ser *anónima*. Al asignarla a un identificador (`multiplicar`), anulas ese propósito. Además, si esa función falla, el error dirá `<lambda>`, no `multiplicar`. **La regla de oro del PEP 8 es:** Si vas a darle un nombre a la función, usa `def`.
> 
> ```python
> # ✅ BUENA PRÁCTICA
> def multiplicar(a, b):
>     return a * b
> ```
> 
> Como desarrollador Senior, también debes evitar anidar lambdas o crear lambdas excesivamente largas que requieran saltos de línea con `\`. Si tienes que detenerte a descifrar qué hace una lambda de tres líneas disfrazada de una, refactorízala inmediatamente a una función con `def`. La legibilidad siempre vence a la brevedad.

## 4.4 Funciones de primera clase y de orden superior (map, filter, reduce)

Para dominar verdaderamente Python y dar el salto hacia un nivel Senior, es fundamental cambiar la forma en que percibimos las funciones. En lenguajes más antiguos o rígidos, las funciones son constructos especiales. En Python, sin embargo, rige una filosofía unificadora: **todo es un objeto**.

Esta premisa nos lleva directamente al concepto de funciones de "primera clase" y cómo estas habilitan el paradigma de la programación funcional dentro de Python.

### Funciones de Primera Clase (First-Class Citizens)

Decir que las funciones son "ciudadanos de primera clase" significa que el lenguaje las trata exactamente igual que a cualquier otro tipo de dato (como un entero, una cadena o una lista). 

En la práctica, esto implica que puedes:
1. Asignar funciones a variables.
2. Almacenarlas en estructuras de datos (como listas o diccionarios).
3. Pasarlas como argumentos a otras funciones.
4. Retornarlas como resultado desde otras funciones.

```python
def gritar(texto):
    return texto.upper() + "!!!"

# 1. Asignar a una variable (sin paréntesis, no la estamos ejecutando)
mi_funcion = gritar 
print(mi_funcion("hola"))  # Salida: HOLA!!!

# 2. Almacenar en estructuras de datos
operaciones = {
    "mayusculas": gritar,
    "minusculas": str.lower
}
print(operaciones["mayusculas"]("peligro")) # Salida: PELIGRO!!!
```

### Funciones de Orden Superior (Higher-Order Functions)

Una función de orden superior es simplemente una función que cumple con al menos una de estas dos condiciones: **acepta una o más funciones como argumentos**, o **devuelve una función como resultado**. 

El uso de funciones lambda (que vimos en la sección anterior) como argumentos de `sorted()` es un ejemplo perfecto de esto. Históricamente, el paradigma funcional nos ha legado tres funciones de orden superior clásicas para el procesamiento de colecciones: `map`, `filter` y `reduce`.

---

### 1. Transformación con `map()`

La función `map()` aplica una función específica a cada uno de los elementos de un iterable (como una lista) y devuelve un nuevo iterador con los resultados.

**Sintaxis:** `map(funcion_a_aplicar, iterable)`

```python
precios_sin_iva = [100, 250, 50]

# Usando map con una lambda para calcular el precio final (21% IVA)
# Nota: map devuelve un 'map object' (iterador), por lo que usamos list() para verlo
precios_finales = list(map(lambda p: p * 1.21, precios_sin_iva))

print(precios_finales) # Salida: [121.0, 302.5, 60.5]
```
*Detalle técnico:* En Python 3, `map` evalúa de forma perezosa (*lazy evaluation*). No calcula todos los valores de golpe, sino a medida que se los pides. Esto es altamente eficiente en memoria para grandes volúmenes de datos.

---

### 2. Selección con `filter()`

Como su nombre indica, `filter()` evalúa cada elemento de un iterable pasándolo por una función que debe devolver un booleano (`True` o `False`). Si la función devuelve `True`, el elemento se conserva; si es `False`, se descarta.

**Sintaxis:** `filter(funcion_condicion, iterable)`

```python
usuarios = [
    {"nombre": "Ana", "activo": True},
    {"nombre": "Luis", "activo": False},
    {"nombre": "Carlos", "activo": True}
]

# Filtramos solo los usuarios activos
activos = list(filter(lambda u: u["activo"], usuarios))

print(activos) 
# Salida: [{'nombre': 'Ana', 'activo': True}, {'nombre': 'Carlos', 'activo': True}]
```

---

### 3. Acumulación con `reduce()`

A diferencia de `map` y `filter`, que devuelven colecciones, `reduce()` está diseñado para reducir un iterable a **un único valor acumulado**. Para usarlo en Python 3, debemos importarlo del módulo estándar `functools`.

`reduce()` toma los dos primeros elementos del iterable, les aplica la función, toma ese resultado y lo aplica junto con el tercer elemento, y así sucesivamente.

```text
Visualización de reduce(lambda x, y: x + y, [1, 2, 3, 4])

Paso 1:  1 + 2 = 3
Paso 2:      3 + 3 = 6
Paso 3:          6 + 4 = 10  <-- Resultado final
```

**Sintaxis:** `reduce(funcion_acumuladora, iterable, [valor_inicial])`

```python
from functools import reduce

ventas_diarias = [150, 300, 200, 500]

# Calculamos el total de ventas sumando acumulativamente
total = reduce(lambda acumulado, actual: acumulado + actual, ventas_diarias)

print(f"Total de ventas: ${total}") # Salida: Total de ventas: $1150
```

---

> **Nota de Arquitectura (De Cero a Senior): El estilo "Pythonic" vs Funcional**
> 
> Aunque dominar `map`, `filter` y `reduce` es vital para entender la programación funcional y leer código heredado, en el ecosistema Python moderno **se prefiere fuertemente el uso de Comprensiones (Comprehensions)** para las operaciones de mapeo y filtrado.
> 
> El propio creador de Python, Guido van Rossum, ha expresado que las comprensiones son más legibles y, a menudo, ligeramente más rápidas.
> 
> ```python
> numeros = [1, 2, 3, 4, 5]
> 
> # Estilo Funcional (map + filter + lambda):
> pares_al_cuadrado = list(map(lambda x: x**2, filter(lambda x: x % 2 == 0, numeros)))
> 
> # Estilo Pythonic (List Comprehension): ¡Mucho más claro!
> pares_al_cuadrado = [x**2 for x in numeros if x % 2 == 0]
> ```
> 
> En cuanto a `reduce()`, su uso se desaconseja a menos que la lógica de acumulación sea compleja. Para sumas, es mejor usar la función nativa `sum()`. Para verificar condiciones en toda la lista, es mejor usar `all()` o `any()`. Un desarrollador Senior sabe que el mejor código no es el que usa las funciones más abstractas, sino el que resulta más fácil de leer para el resto del equipo.