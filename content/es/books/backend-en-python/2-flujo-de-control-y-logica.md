## 2.1 Condicionales (if, elif, else) y expresiones condicionales

Hasta este punto, hemos visto cómo Python ejecuta las instrucciones de manera secuencial, línea por línea. Sin embargo, en el mundo real, los programas necesitan tomar decisiones y reaccionar de manera diferente según el estado de los datos. Aquí es donde entra el flujo de control, siendo las estructuras condicionales su bloque de construcción más fundamental.

En Python, la toma de decisiones se maneja a través de las sentencias `if`, `elif` y `else`. A diferencia de otros lenguajes que utilizan llaves `{}` para delimitar los bloques de código, Python utiliza la **indentación** (espacios en blanco al inicio de la línea) para definir qué código pertenece a qué bloque.

### La sentencia `if`

La estructura más básica es el `if`. Evalúa una expresión; si el resultado de esa evaluación es verdadero (`True`), el bloque de código indentado debajo de él se ejecutará. Si es falso (`False`), el bloque se ignora.

```python
edad = 20

if edad >= 18:
    # Este bloque pertenece al 'if' por la indentación
    print("Eres mayor de edad.")
    print("Puedes acceder al sistema.")

# Esta línea se ejecuta siempre, ya no está indentada
print("Fin del programa.")
```

### Añadiendo alternativas: `else` y `elif`

Rara vez un programa tiene un solo camino posible. Cuando necesitas ejecutar un código alternativo si la condición inicial falla, utilizas `else` (si no). 

Si tienes más de dos caminos posibles, utilizas `elif` (una contracción de "else if"). Puedes encadenar tantos `elif` como necesites, pero solo puede haber un `else` al final, y este actuará como el caso por defecto.

```python
calificacion = 85

if calificacion >= 90:
    print("Excelente")
elif calificacion >= 80:
    print("Muy bien")
elif calificacion >= 70:
    print("Bien")
else:
    print("Necesitas mejorar")
```

En cuanto Python encuentra una condición que se evalúa como `True`, ejecuta su bloque correspondiente e **ignora el resto de la estructura**. Es decir, las condiciones son mutuamente excluyentes en la ejecución.

### Diagrama de Flujo Lógico

Visualmente, podemos representar la estructura `if-elif-else` de la siguiente manera:

```text
       [Inicio de la evaluación]
                  |
            (¿Condición 1?) ===== Sí ====> [Bloque if] ========
                  |                                           |
                  No                                          |
                  |                                           |
            (¿Condición 2?) ===== Sí ====> [Bloque elif] ======
                  |                                           |
                  No                                          |
                  |                                           |
             [Bloque else] ====================================
                                                              |
                                                              V
                                                      (Fin del bloque)
```

### Truthiness: Evaluación booleana implícita

Como vimos en el Capítulo 1, Python tiene el tipo primitivo `bool` (`True` o `False`). Sin embargo, el `if` en Python no exige que la expresión retorne estrictamente un booleano. Python evalúa el "valor de verdad" (truthiness) de cualquier objeto. 

Por regla general, todo en Python se considera `True` **excepto**:
* El valor nulo: `None`
* El cero en cualquier tipo numérico: `0`, `0.0`
* Secuencias y colecciones vacías: `""` (string vacío), `[]` (lista vacía), `{}` (diccionario vacío)
* El propio booleano `False`

Esto permite escribir código idiomático y limpio sin hacer comparaciones explícitas de longitud o igualdad:

```python
# ❌ Estilo poco idiomático (Código "Junior")
nombre = ""
if len(nombre) == 0:
    print("No ingresaste un nombre.")

# ✅ Estilo idiomático Pythonic (Código "Senior")
nombre = ""
if not nombre: # Como el string está vacío, se evalúa como Falso.
    print("No ingresaste un nombre.")
```

### Expresiones Condicionales (Operador Ternario)

Cuando necesitas asignar un valor a una variable basándote en una condición, utilizar un bloque `if-else` completo puede resultar verboso. Python ofrece las **expresiones condicionales**, conocidas en otros lenguajes como operadores ternarios.

La sintaxis es una lectura directa y natural en inglés:
`valor_si_verdadero if condicion else valor_si_falso`

```python
# Enfoque tradicional
estado_cuenta = "Activa"
if estado_cuenta == "Activa":
    color_boton = "Verde"
else:
    color_boton = "Gris"

# Enfoque con expresión condicional
estado_cuenta = "Activa"
color_boton = "Verde" if estado_cuenta == "Activa" else "Gris"
```

> **Perspectiva Senior: Evita la anidación profunda (Arrow Code)**
> 
> Uno de los errores más comunes al empezar a usar condicionales es anidarlos unos dentro de otros excesivamente, creando un código con forma de flecha (`>`). A medida que avances en este libro, verás que es mejor invertir las condiciones y manejar los casos de error primero (un patrón conocido como *Return Early* o Cláusulas de Guarda). Mantener un nivel de indentación bajo es un indicador directo de código maduro y mantenible.

## 2.2 Bucles (for, while) y la cláusula else en bucles

La iteración es la capacidad de ejecutar un bloque de código repetidamente. En Python, a diferencia de lenguajes de bajo nivel donde los bucles suelen estar ligados a contadores aritméticos, la iteración está profundamente integrada con el concepto de **iterables**.

### El bucle `for`

En Python, el bucle `for` es en realidad un bucle "foreach". No se define por una condición de parada aritmética (como en C o Java), sino que recorre los elementos de un objeto iterable (una lista, una tupla, un diccionario o un rango).

```python
# Iteración sobre una secuencia
frutas = ["manzana", "pera", "uva"]
for fruta in frutas:
    print(f"Procesando: {fruta}")

# Uso de range() para secuencias numéricas
# range(inicio, fin, paso)
for i in range(0, 10, 2):
    print(f"Número par: {i}")
```

**Perspectiva Senior:** Bajo el capó, el bucle `for` solicita un *iterador* al objeto y llama al método `__next__()` repetidamente hasta que se agotan los elementos. Esta es la base de la eficiencia en Python: no necesitamos conocer el tamaño de la colección de antemano.

### El bucle `while`

El bucle `while` repite un bloque de código mientras una condición booleana sea `True`. Es ideal cuando no sabemos de antemano cuántas veces necesitaremos iterar (iteración indefinida).

```python
energia = 3
while energia > 0:
    print(f"Trabajando... Energía restante: {energia}")
    energia -= 1  # Es vital modificar la condición para evitar bucles infinitos

print("Batería agotada.")
```

### La cláusula `else` en bucles: El concepto incomprendido

Una de las características más singulares de Python es que tanto `for` como `while` pueden tener una cláusula `else`. Contrario a la intuición inicial, el bloque `else` **no** se ejecuta si el bucle falla, sino que se ejecuta **únicamente si el bucle termina su ciclo completo de forma natural**.

Si el bucle se interrumpe mediante una sentencia `break` (que veremos en la sección 2.3), el bloque `else` se ignora.

**Caso de uso: Búsqueda de elementos**
Sin `else`, necesitaríamos una variable "bandera" (flag) para saber si encontramos algo. Con `else`, el código es mucho más limpio:

```python
usuarios = ["Alice", "Bob", "Charlie"]
objetivo = "Diana"

for usuario in usuarios:
    if usuario == objetivo:
        print("¡Usuario encontrado!")
        break
else:
    # Este bloque solo corre si el 'for' terminó sin encontrar el 'break'
    print("El usuario no existe en la base de datos.")
```

### Diagrama de flujo lógico de `else` en bucles

```text
       [ Entrada al Bucle ]
               |
      /-----------------\
      | ¿Hay elementos? | <----\
      | (o condición?)  |      |
      \-----------------/      |
          /        \           |
        [No]       [Sí]        |
         |          |          |
         |    [¿Hay break?] --/ (Continúa iterando)
         |          |
         |        [Sí] ----> [ Salida inmediata ]
         |                   (Ignora el ELSE)
         V
    [ Bloque ELSE ]
         |
    [ Fin del Programa ]
```

### Comparativa: ¿Cuándo usar cada uno?

1.  **`for`**: Úsalo siempre que tengas una colección de datos o un rango definido. Es más seguro, más legible y generalmente más rápido en Python.
2.  **`while`**: Úsalo cuando la condición de parada dependa de un factor externo (una respuesta de un servidor, la entrada de un usuario o un sensor) y no de una secuencia predefinida.

> **Nota para el futuro Senior:** Evita usar `while` para recorrer listas mediante índices (`while i < len(lista)`). Esto se considera un anti-patrón en Python. Siempre prefiere el acceso directo con `for elemento in lista` o, si necesitas el índice, utiliza la función `enumerate()`, que estudiaremos más adelante.

## 2.3 Control de iteraciones (break, continue, pass)

Aunque los bucles `for` y `while` tienen un flujo natural de ejecución (terminar de recorrer la secuencia o que la condición se vuelva falsa), a menudo nos encontramos con situaciones donde necesitamos alterar este comportamiento de forma abrupta. 

Para gestionar estas anomalías o requisitos específicos dentro de las iteraciones, Python nos proporciona tres declaraciones fundamentales: `break`, `continue` y `pass`.

### `break`: La salida de emergencia

La sentencia `break` se utiliza para **terminar por completo** el bucle en el que se encuentra. En el momento en que Python lee un `break`, abandona inmediatamente la iteración actual, ignora cualquier elemento restante de la secuencia (o la condición del `while`), y continúa con la primera línea de código que haya *después* de todo el bloque del bucle.

Como vimos en la sección anterior, es importante recordar que si un bucle finaliza a causa de un `break`, **la cláusula `else` del bucle no se ejecutará**.

```python
# Ejemplo: Sistema de seguridad bloqueando acceso tras múltiples intentos
intentos_fallidos = 0

while True: # Bucle infinito intencional
    password = input("Ingrese contraseña: ")
    
    if password == "secreto123":
        print("Acceso concedido.")
        break # Salimos del bucle infinito exitosamente
        
    intentos_fallidos += 1
    print("Contraseña incorrecta.")
    
    if intentos_fallidos >= 3:
        print("Cuenta bloqueada por seguridad.")
        break # Salimos por exceso de intentos
```

### `continue`: Saltando al siguiente turno

Mientras que `break` destruye el bucle, `continue` es mucho más sutil. Cuando Python encuentra un `continue`, **interrumpe únicamente la iteración actual**. El código que se encuentre por debajo del `continue` no se ejecutará en ese ciclo, y el programa saltará directamente de vuelta al inicio del bucle para evaluar el siguiente elemento o condición.

Es sumamente útil para filtrar datos o ignorar casos que no requieren procesamiento, reduciendo la necesidad de anidar bloques `if`.

```python
# Ejemplo: Procesando solo archivos válidos (Early return pattern en bucles)
archivos = ["reporte.csv", "imagen.png", "datos.csv", "sistema.dll"]

for archivo in archivos:
    if not archivo.endswith(".csv"):
        # Ignoramos lo que no sea CSV y pasamos al siguiente archivo
        continue 
        
    # Este código solo se ejecuta para los .csv
    print(f"Procesando datos de: {archivo}")
    # (Lógica compleja de procesamiento...)
```

### Diagrama de flujo: `break` vs `continue`

```text
       [ Inicio del Bucle ] <---------------------------+
               |                                        |
               V                                        |
      ( ¿Hay elementos? ) === No ===> [ Fin Bucle ]     |
               |                                        |
               Sí                                       |
               |                                        |
      [ Código inicial ]                                |
               |                                        |
        ( ¿continue? ) ====== Sí =======================+ (Vuelve arriba)
               |
               No
               |
         ( ¿break? ) ======== Sí ===> [ Salida inmediata al Fin Bucle ]
               |
               No
               |
      [ Resto del código ]
               |
               +----------------------------------------+
```

### `pass`: El marcador de posición

A diferencia de `break` y `continue`, la declaración `pass` **no hace absolutamente nada**. Su existencia responde a una necesidad puramente sintáctica. 

Dado que Python utiliza la indentación para delimitar bloques de código, estructuras como `if`, `for`, `while`, `def` (funciones) o `class` (clases) requieren obligatoriamente tener al menos una línea de código indentada debajo de ellas. Si estás diseñando la estructura de tu programa y aún no has escrito la lógica de un bloque, dejarlo vacío causará un error de sintaxis (`IndentationError`). Aquí es donde entra `pass`.

```python
# Diseñando la estructura base de un programa (Mocking mental)
def procesar_pago(monto):
    # TODO: Implementar integración con la pasarela de pagos
    pass 

usuarios = ["Ana", "Luis"]
for usuario in usuarios:
    # Aún no decido qué hacer con cada usuario
    pass

print("El programa se ejecuta sin errores de sintaxis.")
```

> **Perspectiva Senior: El uso (y abuso) del control de flujo**
> 
> 1. **Cuidado con el código espagueti:** Un bucle con múltiples `break` y `continue` esparcidos por doquier se vuelve cognitivamente costoso de leer. Si tu bucle necesita demasiadas interrupciones, suele ser un síntoma de que la lógica dentro del bucle debería extraerse a una función independiente.
> 2. **El peligroso `pass` en el manejo de errores:** Un error clásico de nivel Junior es usar `pass` para silenciar excepciones silenciosamente (`except Exception: pass`). Esto entierra los errores en lugar de manejarlos, convirtiendo el "debugging" (depuración) en una pesadilla. Veremos esto a fondo en el Capítulo 6, pero grábatelo desde ahora: los errores nunca deben pasar en silencio.

## 2.4 Operadores lógicos, de identidad (`is`) y de pertenencia (`in`)

Para construir sistemas robustos, rara vez nos basta con evaluar una sola condición aislada. Necesitamos combinar múltiples afirmaciones, verificar el tipo o la ubicación en memoria de un objeto, o comprobar si un dato existe dentro de una colección. Python proporciona tres familias de operadores específicos para estas tareas, diseñados para leerse casi como lenguaje natural.

### Operadores Lógicos (`and`, `or`, `not`)

Los operadores lógicos nos permiten combinar múltiples expresiones booleanas.

* `and`: Retorna `True` si **todas** las condiciones son verdaderas.
* `or`: Retorna `True` si **al menos una** condición es verdadera.
* `not`: Invierte el valor de verdad de la expresión.

**Perspectiva Senior: Evaluación de Cortocircuito (Short-circuiting)**

Python no evalúa las expresiones lógicas ciegamente de izquierda a derecha hasta el final. Utiliza una técnica llamada evaluación de cortocircuito (o perezosa): **se detiene en el momento exacto en que el resultado final es predecible.**

* En un `and`, si la primera condición es `False`, es imposible que toda la expresión sea verdadera, por lo que Python **no evalúa** la segunda condición.
* En un `or`, si la primera condición es `True`, toda la expresión ya es verdadera, por lo que ignora la segunda.

Esta característica no es solo una optimización de rendimiento; es una herramienta de diseño defensivo fundamental. Te permite escribir "guardias" en la misma línea:

```python
usuario = obtener_usuario_de_db() # Puede retornar un objeto Usuario o None

# ❌ Código propenso a errores (Lanzará AttributeError si usuario es None)
# if usuario.is_admin() and usuario is not None: 

# ✅ Patrón de cortocircuito seguro
if usuario is not None and usuario.is_admin():
    print("Acceso total concedido.")
```
En el código correcto, si `usuario` es `None`, la primera evaluación es `False`. Python "hace cortocircuito", ignora el resto y evita el fatal `AttributeError` al intentar llamar a `.is_admin()` sobre un objeto nulo.

### Operadores de Identidad (`is`, `is not`)

Una de las trampas más clásicas en la transición de Junior a Semi-Senior en Python es confundir la igualdad de valor (`==`) con la identidad de objeto (`is`).

* `==` compara **valores**: ¿Tienen estos dos objetos el mismo contenido? (Bajo el capó, llama al método mágico `__eq__` que veremos en el Capítulo 5).
* `is` compara **identidad**: ¿Son estos dos objetos *exactamente el mismo espacio en memoria*? (Compara los resultados de la función `id()`).

```python
lista_a = [1, 2, 3]
lista_b = [1, 2, 3]
lista_c = lista_a

print(lista_a == lista_b)  # True: Tienen el mismo contenido.
print(lista_a is lista_b)  # False: Son dos listas distintas en memoria.
print(lista_a is lista_c)  # True: Ambas variables apuntan a la misma dirección.
```

**El caso del Caching de Enteros (Interning)**

En la implementación estándar de Python (CPython), por motivos de eficiencia matemática, los números enteros pequeños (del -5 al 256) y los strings cortos son cacheados (interning) al inicio del programa. Esto causa un comportamiento que a menudo confunde a los principiantes:

```python
a = 100
b = 100
print(a is b) # True (Ambos apuntan al mismo 100 en el caché)

x = 1000
y = 1000
print(x is y) # False (1000 está fuera del caché, son objetos distintos en memoria)
# Nota: Si ejecutas esto en un archivo (script) el compilador podría optimizarlo y dar True,
# pero en el REPL (consola interactiva) siempre dará False.
```

> **Regla de Oro de PEP 8:**
> Siempre utiliza `is` o `is not` cuando compares contra el objeto Singleton `None` (ej. `if variable is None:`). Las clases personalizadas pueden sobreescribir el operador `==` para dar falsos positivos, pero no pueden sobreescribir `is`.

### Operadores de Pertenencia (`in`, `not in`)

Estos operadores se utilizan para comprobar si un valor específico se encuentra dentro de una secuencia (como un `str`, `list`, o `tuple`) o una colección (como un `set` o `dict`). 

Su legibilidad es excelente, eliminando la necesidad de usar bucles explícitos solo para buscar:

```python
# En cadenas de texto (búsqueda de subcadenas)
print("Python" in "Amo programar en Python")  # True

# En listas
tecnologias = ["Docker", "Kubernetes", "AWS"]
if "AWS" in tecnologias:
    print("Despliegue en la nube detectado.")

# En diccionarios (por defecto busca solo en las CLAVES, no en los valores)
configuracion = {"host": "localhost", "puerto": 8080}
print("host" in configuracion)   # True
print(8080 in configuracion)     # False
```

**Perspectiva Senior: La complejidad algorítmica importa**

Aunque `in` se ve igual en todos los casos, su rendimiento bajo el capó varía drásticamente dependiendo de la estructura de datos que uses. Como profundizaremos en el **Capítulo 3**:

* Usar `in` en una **lista o tupla** requiere iterar elemento por elemento (búsqueda lineal o complejidad $O(n)$). Si la lista tiene un millón de elementos, Python podría hacer un millón de comprobaciones.
* Usar `in` en un **set (conjunto) o un diccionario** utiliza tablas hash (complejidad $O(1)$). El tiempo que tarda en verificar si el elemento existe es constante y casi instantáneo, independientemente de si la colección tiene diez elementos o diez millones. Elegir la estructura correcta antes de usar `in` es crucial para el rendimiento del Backend.