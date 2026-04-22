La Programación Orientada a Objetos (POO) en Python no es solo una forma de organizar código, sino una filosofía para modelar la realidad. Mientras que la programación procedimental se centra en "qué debe pasar" (funciones), la POO se enfoca en "qué es esto" (objetos). Una clase actúa como el plano arquitectónico que define estructura y comportamiento, mientras que las instancias son las construcciones reales en memoria. A través del uso de `self`, los métodos mágicos y la herencia, Python nos permite crear sistemas donde el estado y la lógica conviven de forma coherente. Este capítulo te llevará desde los cimientos del objeto hasta la eficiencia moderna de las *dataclasses*.

## 5.1 Clases, instancias, y el uso de `self`

Hasta este punto en el libro, hemos manejado el estado y la lógica de nuestros programas utilizando tipos de datos integrados (como diccionarios y listas) y agrupando operaciones en funciones. Este enfoque imperativo y procedimental es poderoso, pero a medida que las aplicaciones crecen en complejidad, modelar entidades del mundo real únicamente con diccionarios y funciones independientes puede volverse frágil y difícil de mantener.

Aquí es donde entra la **Programación Orientada a Objetos (POO)**. Este paradigma nos permite agrupar **estado** (datos) y **comportamiento** (funciones) en una única entidad lógica: el objeto.

### Clases vs. Instancias: El plano y la casa

Para entender la POO en Python, es fundamental trazar una línea divisoria clara entre dos conceptos: la clase y la instancia.

* **Clase:** Es la definición abstracta, el molde o la plantilla. Define qué datos tendrá el objeto y qué acciones podrá realizar, pero no contiene los datos en sí. Por convención en Python (PEP 8), los nombres de las clases se escriben en *CamelCase* (o *PascalCase*).
* **Instancia:** Es la materialización concreta de esa clase en la memoria. Si la clase es el plano arquitectónico de una casa, la instancia es la casa ya construida en la que puedes entrar a vivir.

```text
+-----------------------+
|    CLASE: Usuario     |  <--- El plano (Define qué es un usuario)
+-----------------------+
            |
            | (Instanciación)
            v
+-----------------------+    +-----------------------+
| INSTANCIA 1 (Usuario) |    | INSTANCIA 2 (Usuario) |
| nombre: "Alice"       |    | nombre: "Bob"         | <--- Las casas (Objetos reales en memoria)
| rol: "Admin"          |    | rol: "Editor"         |
+-----------------------+    +-----------------------+
```

### Creando tu primera Clase

La sintaxis básica para definir una clase utiliza la palabra reservada `class`. Veamos un ejemplo creando la estructura base de un usuario:

```python
class Usuario:
    """Clase base que representa un usuario del sistema."""
    
    def __init__(self, nombre_usuario, correo):
        # Atributos de instancia (estado)
        self.nombre_usuario = nombre_usuario
        self.correo = correo
        self.activo = True  # Valor por defecto

    # Método de instancia (comportamiento)
    def desactivar_cuenta(self):
        self.activo = False
        print(f"La cuenta de {self.nombre_usuario} ha sido desactivada.")
```

### El método `__init__`

Cuando creamos una nueva instancia llamando a la clase como si fuera una función (`usuario1 = Usuario(...)`), Python asigna memoria para el nuevo objeto e inmediatamente llama al método `__init__`.

Este método es el **inicializador** (a menudo llamado constructor, aunque estrictamente en Python la construcción en memoria recae en otro método llamado `__new__`, el cual se abordará superficialmente en la próxima sección de *Dunder methods*). Su único propósito es configurar el estado inicial de la nueva instancia.

### El misterio y la necesidad de `self`

Si vienes de lenguajes como Java o C++, estarás acostumbrado a que la referencia al propio objeto (`this`) esté implícita y oculta. Python, siguiendo su filosofía de que *"explícito es mejor que implícito"*, te obliga a declarar explícitamente esa referencia en la firma del método. A esto le llamamos `self`.

**`self` no es una palabra reservada del lenguaje**, es simplemente una convención inquebrantable de la comunidad. Podrías llamarlo `este_objeto` o `yo`, pero romperías las convenciones y harías tu código ilegible para otros desarrolladores.

**¿Cómo funciona `self` bajo el capó?**

Cuando creamos instancias y llamamos a sus métodos, ocurre un paso de argumentos automático:

```python
# 1. Instanciación
user1 = Usuario("dev_jr", "jr@empresa.com")
user2 = Usuario("sysadmin", "admin@empresa.com")

# 2. Llamada a un método de instancia
user1.desactivar_cuenta() 
```

Fíjate en la última línea: al llamar a `user1.desactivar_cuenta()`, no estamos pasando ningún argumento, a pesar de que en la definición del método (`def desactivar_cuenta(self):`) declaramos que requiere uno. 

Esto funciona porque cuando llamas a un método desde una instancia, Python transforma esa llamada de forma transparente en esto:

```python
# Lo que tú escribes:
user1.desactivar_cuenta()

# Lo que Python ejecuta realmente:
Usuario.desactivar_cuenta(user1)
```

Python inyecta automáticamente la instancia sobre la cual se invocó el método como el **primer argumento posicional** (`self`). Por eso es crucial incluir `self` en:

1.  **La definición de los métodos:** Para poder recibir la referencia de la instancia.
2.  **El acceso a los atributos:** Al usar `self.nombre_usuario = nombre_usuario`, le estamos diciendo explícitamente a Python: *"toma el valor local que me pasaron y guárdalo en el espacio de memoria de ESTA instancia en particular, no como una variable local de la función"*.

Si olvidamos poner `self.` al declarar un atributo dentro de `__init__`, ese dato morirá en el momento en que el método termine su ejecución (recordando la regla LEGB que vimos en el Capítulo 4 sobre el alcance local de las funciones). `self` es el puente que ancla los datos a la persistencia del objeto.

## 5.2 El Modelo de Datos de Python: Métodos mágicos (Dunder methods)

En la sección anterior aprendimos a crear nuestras propias clases para encapsular estado y comportamiento. Sin embargo, si intentas sumar dos instancias de tu clase `Usuario` con el operador `+`, o si intentas obtener su longitud con `len(usuario1)`, Python lanzará un error (`TypeError`). Para el intérprete, tus objetos son "ciudadanos de segunda clase"; no saben cómo interactuar con la sintaxis nativa del lenguaje de la misma manera que lo hace una lista, un diccionario o un *string*.

Aquí es donde brilla el **Modelo de Datos de Python** (Python Data Model). Esencialmente, es una API formal que te permite integrar tus objetos personalizados con las funciones integradas y la sintaxis básica de Python.

La forma de interactuar con este modelo de datos es a través de los **métodos mágicos**, coloquialmente conocidos como **métodos Dunder** (una abreviatura de *Double UNDERscore*, debido a que sus nombres empiezan y terminan con un doble guion bajo, como `__init__`).

### El ciclo de vida: `__new__` y `__init__`

En el capítulo 5.1 mencionamos que `__init__` es el inicializador, no el constructor estricto. Ahora que estamos en las entrañas del modelo de datos, es momento de aclarar esto:

1.  **`__new__(cls, ...)`**: Es el verdadero constructor. Es un método a nivel de clase que se encarga de asignar el espacio en memoria para el nuevo objeto y retornarlo. Rara vez necesitarás sobreescribir este método en el día a día, a menos que estés implementando el patrón *Singleton* o heredando de tipos inmutables como `tuple` o `str`.
2.  **`__init__(self, ...)`**: Una vez que `__new__` retorna la instancia recién creada en memoria, Python se la pasa automáticamente a `__init__` (como `self`) para que configures su estado inicial.

### Representación de Objetos: `__str__` vs. `__repr__`

Si imprimes un objeto personalizado sin configurar su representación, Python te devolverá algo críptico y poco útil, como `<__main__.Usuario object at 0x7f8b9c...>`. Para solucionar esto, el modelo de datos nos ofrece dos métodos fundamentales:

* **`__repr__(self)`**: Debe devolver una cadena que represente al objeto de forma **inequívoca**. Su objetivo principal es ayudar en la depuración (debugging) y el registro (logging). Está pensado para desarrolladores. Como regla general, si es posible, el texto devuelto por `__repr__` debería ser código Python válido que permita recrear el objeto.
* **`__str__(self)`**: Debe devolver una cadena legible y amigable, pensada para el **usuario final**. Es lo que llama la función `print()` o `str()`.

Si implementas `__repr__` pero no `__str__`, Python usará `__repr__` como respaldo (fallback) cuando se llame a `print()`.

```python
class Coordenada:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        # Representación técnica y sin ambigüedades
        return f"Coordenada({self.x}, {self.y})"

    def __str__(self):
        # Representación amigable
        return f"({self.x} N, {self.y} E)"

punto = Coordenada(10, 20)
print(punto)        # Salida: (10 N, 20 E) -> Usa __str__
print(repr(punto))  # Salida: Coordenada(10, 20) -> Usa __repr__
```

### Emulando el comportamiento de tipos integrados

El verdadero poder de los métodos Dunder radica en permitir que tus objetos se comporten como tipos nativos.

**1. Sobrecarga de Operadores (Aritmética y Comparación)**

Puedes definir cómo actúan los operadores matemáticos (`+`, `-`, `*`) y de comparación (`==`, `<`, `>`) sobre tus objetos.

```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        
    def __add__(self, otro_vector):
        # Define el comportamiento del operador '+'
        if not isinstance(otro_vector, Vector):
            return NotImplemented
        return Vector(self.x + otro_vector.x, self.y + otro_vector.y)
        
    def __eq__(self, otro_vector):
        # Define el comportamiento del operador '=='
        if not isinstance(otro_vector, Vector):
            return False
        return self.x == otro_vector.x and self.y == otro_vector.y

v1 = Vector(2, 3)
v2 = Vector(4, 1)
v3 = v1 + v2  # Internamente ejecuta: v1.__add__(v2)

print(v3.x, v3.y)  # Salida: 6 4
print(v1 == Vector(2, 3)) # Salida: True (Internamente ejecuta: v1.__eq__(...))
```

**2. Colecciones y Contenedores**

Si estás creando una clase que agrupa otros objetos (como un inventario, una baraja de cartas o un sistema de colas), puedes hacer que soporte funciones como `len()`, o que se pueda acceder a sus elementos mediante corchetes `[]` y buscar si un elemento existe con la palabra clave `in`.

* `__len__(self)`: Invocado por `len(objeto)`.
* `__getitem__(self, index)`: Invocado al hacer `objeto[index]`.
* `__contains__(self, item)`: Invocado al usar el operador de pertenencia (`item in objeto`).

```python
class Inventario:
    def __init__(self):
        self._articulos = []
        
    def agregar(self, articulo):
        self._articulos.append(articulo)
        
    def __len__(self):
        # Permite usar len(inventario)
        return len(self._articulos)
        
    def __getitem__(self, indice):
        # Permite usar inventario[0], e incluso slicing inventario[0:2]
        return self._articulos[indice]

mochila = Inventario()
mochila.agregar("Poción")
mochila.agregar("Espada")

print(len(mochila))   # Salida: 2
print(mochila[1])     # Salida: "Espada"
```

El modelo de datos de Python es extenso e incluye métodos mágicos para el control de acceso a atributos (`__getattr__`, `__setattr__`), la conversión a tipos numéricos (`__int__`, `__float__`), o el llamado a un objeto como si fuera una función (`__call__`). Dominar los métodos Dunder es el paso definitivo para escribir código verdaderamente "Pythónico", creando interfaces elegantes, intuitivas y que se integren de forma natural con el ecosistema del lenguaje.

## 5.3 Herencia (simple y múltiple), Polimorfismo y el MRO (Method Resolution Order)

Una de las promesas fundamentales de la Programación Orientada a Objetos es la reutilización de código. En lugar de copiar y pegar la misma lógica en múltiples lugares, la POO nos permite crear jerarquías donde las entidades más específicas heredan y extienden el comportamiento de entidades más generales. 

### Herencia Simple y la función `super()`

La herencia establece una relación de tipo "es un" (is-a). Si tenemos una clase `Vehiculo`, una clase `Coche` *es un* vehículo y, por lo tanto, debería tener acceso a las características básicas de un vehículo, además de definir las suyas propias.

En Python, la herencia se indica pasando la clase padre entre paréntesis al definir la clase hija:

```python
class Empleado:
    def __init__(self, nombre, salario_base):
        self.nombre = nombre
        self.salario_base = salario_base

    def trabajar(self):
        return f"{self.nombre} está realizando tareas generales."

class Desarrollador(Empleado):
    def __init__(self, nombre, salario_base, lenguaje):
        # Delegamos la inicialización básica a la clase padre
        super().__init__(nombre, salario_base)
        # Añadimos el estado específico de esta subclase
        self.lenguaje = lenguaje

    def programar(self):
        return f"{self.nombre} está escribiendo código en {self.lenguaje}."

dev = Desarrollador("Ana", 40000, "Python")
print(dev.trabajar())  # Heredado: "Ana está realizando tareas generales."
print(dev.programar()) # Específico: "Ana está escribiendo código en Python."
```

La función `super()` es crucial aquí. Actúa como un proxy que nos da acceso a los métodos de la clase padre (también llamada superclase). En el método `__init__` del `Desarrollador`, usamos `super().__init__(...)` para asegurarnos de que el nombre y el salario se configuren correctamente según la lógica de `Empleado`, evitando duplicar código.

### Polimorfismo y la filosofía "Duck Typing"

El polimorfismo (del griego "muchas formas") es la capacidad de diferentes objetos de responder de manera distinta a la misma llamada de método. 

En lenguajes estrictamente tipados (como Java o C#), el polimorfismo suele depender de interfaces explícitas. Python, siendo de tipado dinámico, adopta una filosofía conocida como **Duck Typing** (Tipado del pato): *"Si camina como un pato y grazna como un pato, entonces debe ser un pato"*. 

A Python no le importa de qué clase exacta provenga un objeto, siempre y cuando implemente el método que se está invocando. A menudo, esto se logra **sobrescribiendo** (overriding) los métodos de la clase padre en las subclases:

```python
class Diseñador(Empleado):
    # Sobrescribimos el método trabajar
    def trabajar(self):
        return f"{self.nombre} está diseñando interfaces en Figma."

# Otra subclase que también sobrescribe el método
class Desarrollador(Empleado):
    def trabajar(self):
        return f"{self.nombre} está resolviendo bugs."

empleados = [
    Empleado("Carlos", 30000),
    Desarrollador("Ana", 40000),
    Diseñador("Luis", 35000)
]

# Polimorfismo en acción: la misma llamada, distintos comportamientos
for empleado in empleados:
    print(empleado.trabajar())
```

El bucle `for` no necesita saber de qué subclase específica es cada `empleado`. Simplemente confía en que el método `trabajar()` existe, y cada objeto ejecuta su propia versión del mismo.

### Herencia Múltiple y el "Problema del Diamante"

A diferencia de otros lenguajes como Java, Python soporta **herencia múltiple**, lo que significa que una clase puede tener más de un padre directo. Esto se logra separando las clases padre por comas: `class Hija(Padre1, Padre2):`.

Aunque poderosa, la herencia múltiple introduce una ambigüedad clásica conocida como el **Problema del Diamante**. Observa el siguiente diagrama:

```text
      ClaseBase
       /     \
   PadreA   PadreB
       \     /
      ClaseHija
```

Si `PadreA` y `PadreB` sobrescriben un método de `ClaseBase` (por ejemplo, `procesar()`), y `ClaseHija` llama a `self.procesar()`, ¿qué versión del método debería ejecutar Python? ¿La de `PadreA` o la de `PadreB`?

### El MRO (Method Resolution Order)

Para resolver ambigüedades en la herencia múltiple, Python utiliza un algoritmo llamado **C3 Linearization** para calcular el **MRO (Orden de Resolución de Métodos)**. El MRO es simplemente una lista plana y ordenada de las clases por las que Python buscará un método cuando lo invoques.

Las reglas básicas del MRO de Python son:
1.  Busca primero en la clase actual.
2.  Luego busca en las clases padre, de **izquierda a derecha** (según el orden en que se declararon en los paréntesis).
3.  Busca en la jerarquía hacia arriba (profundidad), pero **retrasando la búsqueda en ancestros comunes** hasta que todos los descendientes de ese ancestro hayan sido revisados.

Puedes inspeccionar el MRO de cualquier clase utilizando el atributo mágico `__mro__` o el método `.mro()`:

```python
class Base:
    def saludar(self):
        print("Hola desde Base")

class PadreA(Base):
    def saludar(self):
        print("Hola desde PadreA")

class PadreB(Base):
    def saludar(self):
        print("Hola desde PadreB")

# Hereda de A primero, luego de B
class Hija(PadreA, PadreB):
    pass

instancia = Hija()
instancia.saludar()  # Salida: Hola desde PadreA

# Inspeccionando el MRO
print(Hija.mro())
# Salida: [<class '__main__.Hija'>, <class '__main__.PadreA'>, <class '__main__.PadreB'>, <class '__main__.Base'>, <class 'object'>]
```

En el ejemplo superior, como pasamos `PadreA` primero (`class Hija(PadreA, PadreB):`), Python encuentra y ejecuta el método de `PadreA` e ignora el resto. Si hubiéramos escrito `class Hija(PadreB, PadreA):`, la salida habría sido "Hola desde PadreB".

Comprender el MRO es vital para arquitecturas avanzadas en Python, especialmente cuando se utilizan **Mixins** (clases pequeñas diseñadas exclusivamente para añadir funcionalidades específicas a través de herencia múltiple, sin tener estado propio).

## 5.4 Encapsulamiento, decoradores de clase y propiedades (`@property`)

Al diseñar sistemas orientados a objetos, no solo debemos preocuparnos por cómo interactúan las clases entre sí, sino también por cómo protegemos su estado interno. Si cualquier parte del código puede modificar directamente los datos de un objeto, corremos el riesgo de dejarlo en un estado inconsistente o inválido.

### Encapsulamiento: La filosofía de los "Adultos Consensuados"

En lenguajes como Java o C++, existen palabras reservadas (`private`, `protected`, `public`) que imponen restricciones estrictas a nivel del compilador sobre quién puede acceder a qué. Python adopta una postura radicalmente diferente, a menudo resumida en la frase comunitaria: *"Aquí todos somos adultos consensuados"*.

Python no tiene verdaderos atributos privados. En su lugar, confía en **convenciones de nomenclatura** para indicar la intención del desarrollador:

**1. Atributos "Protegidos" (Un guion bajo inicial)**

Si un atributo o método comienza con un guion bajo (por ejemplo, `_saldo` o `_conectar_bd()`), le estás diciendo a otros programadores: *"Esto es para uso interno de la clase. Por favor, no lo toques desde afuera, la API podría cambiar sin previo aviso"*. Sin embargo, el intérprete de Python no te impedirá acceder a él. Es puramente una advertencia visual.

**2. Atributos "Privados" y el *Name Mangling* (Doble guion bajo inicial)**

Si necesitas una capa extra de protección (generalmente para evitar colisiones de nombres en jerarquías de herencia complejas), puedes usar dos guiones bajos iniciales (ej. `__contrasena`). 

Al hacer esto, Python aplica un mecanismo llamado **Name Mangling** (alteración de nombres). El intérprete reescribe el nombre del atributo internamente, anteponiendo `_NombreDeLaClase` al inicio.

```python
class Boveda:
    def __init__(self):
        self.publico = "Dato accesible"
        self._protegido = "Dato interno (convención)"
        self.__privado = "Dato altamente interno (Name Mangling)"

caja = Boveda()
print(caja.publico)    # OK
print(caja._protegido) # Funciona, pero rompe la convención

# print(caja.__privado) # ❌ Lanza AttributeError

# El secreto revelado: Name Mangling en acción
print(caja._Boveda__privado) # Funciona (demuestra que no hay privacidad real)
```

Como ves, la privacidad real no existe en Python; el *Name Mangling* es un mecanismo de seguridad contra sobreescrituras accidentales, no contra accesos malintencionados.

### Adiós a `get_x()` y `set_x()`: La elegancia de `@property`

El encapsulamiento suele requerir la validación de los datos antes de modificarlos. En otros lenguajes, esto se logra creando métodos "Getters" y "Setters".

**El estilo "Anti-Python":**
```python
class Termostato:
    def __init__(self):
        self._temperatura = 20

    def get_temperatura(self):
        return self._temperatura

    def set_temperatura(self, valor):
        if valor < -50 or valor > 50:
            raise ValueError("Temperatura fuera de rango")
        self._temperatura = valor

# Uso incómodo
t = Termostato()
t.set_temperatura(25)
print(t.get_temperatura())
```

Este enfoque rompe la elegancia de la sintaxis de Python. Queremos usar `t.temperatura = 25` pero manteniendo la validación de `set_temperatura`. La solución es el decorador **`@property`**.

Una "propiedad" permite definir métodos que se comportan como si fueran atributos normales.

**El estilo "Pythónico":**
```python
class Termostato:
    def __init__(self):
        self._temperatura = 20

    # 1. El "Getter" se define con @property
    @property
    def temperatura(self):
        """Devuelve la temperatura actual."""
        return self._temperatura

    # 2. El "Setter" se define con @nombre_propiedad.setter
    @temperatura.setter
    def temperatura(self, valor):
        if valor < -50 or valor > 50:
            raise ValueError("Temperatura fuera de rango")
        self._temperatura = valor

# Uso limpio y natural
t = Termostato()
print(t.temperatura)  # Llama al getter (salida: 20)
t.temperatura = 25    # Llama al setter con validación
# t.temperatura = 100 # ❌ Lanzaría ValueError
```

Las propiedades son excelentes para:
* Exponer atributos internos (`_algo`) de forma controlada.
* Crear **propiedades calculadas** (ej. un método `area` que se calcula al vuelo multiplicando `ancho * alto`, pero se accede como `rectangulo.area`).
* Refactorizar código antiguo: Si empezaste usando atributos públicos y luego necesitas añadir validación, puedes convertirlos en propiedades sin romper el código que ya dependía de la sintaxis `objeto.atributo`.

### Decoradores de Clase

Ya vimos que un decorador (como `@property`) modifica el comportamiento de un método. En Python, también podemos aplicar decoradores directamente a la definición de una **clase entera**.

Un decorador de clase es simplemente una función que recibe una clase como argumento, la altera (añadiendo métodos, atributos o registrándola en algún sistema) y devuelve la clase modificada. 

*Nota: Profundizaremos en la creación desde cero de decoradores avanzados en el Capítulo 10, pero aquí veremos su uso práctico.*

Imagina que quieres que ciertas clases de tu sistema tengan siempre un atributo de "versión" de la API:

```python
# Definición básica de un decorador de clase
def versionar_api(cls):
    cls.API_VERSION = "v1.5"
    return cls

@versionar_api
class ServicioUsuarios:
    def obtener_usuarios(self):
        return ["Ana", "Bob"]

print(ServicioUsuarios.API_VERSION) # Salida: v1.5
```

Los decoradores de clase evitan tener que usar herencia (crear una clase base `ServicioVersionado`) para compartir comportamientos transversales simples. 

De hecho, uno de los decoradores de clase más potentes e importantes del ecosistema moderno de Python es el que veremos en la siguiente sección: `@dataclass`, que utiliza la metaprogramación para escribir automáticamente el código repetitivo (`__init__`, `__repr__`, `__eq__`) por ti.

## 5.5 Dataclasses para la gestión eficiente del estado

Al final de la sección anterior, mencionamos que los decoradores de clase nos permiten inyectar comportamientos repetitivos de forma automática. El mejor ejemplo de esto en la biblioteca estándar de Python (introducido en la versión 3.7) es el módulo `dataclasses`.

En la programación del día a día, a menudo necesitamos crear clases cuyo propósito principal no es ejecutar lógica de negocio compleja, sino actuar como simples contenedores de datos (lo que en otros lenguajes se conoce como DTOs o *Data Transfer Objects*).

### El problema: Código repetitivo (Boilerplate)

Imagina que necesitamos una clase para representar un producto en un carrito de compras. Usando el enfoque tradicional que vimos en las secciones 5.1 y 5.2, tendríamos que escribir algo como esto:

```python
class Producto:
    def __init__(self, nombre, precio, cantidad=0):
        self.nombre = nombre
        self.precio = precio
        self.cantidad = cantidad

    # Si no escribimos esto, print(producto) devolverá un texto ilegible
    def __repr__(self):
        return f"Producto(nombre='{self.nombre}', precio={self.precio}, cantidad={self.cantidad})"

    # Si no escribimos esto, producto1 == producto2 devolverá False 
    # incluso si tienen exactamente los mismos datos
    def __eq__(self, otro):
        if not isinstance(otro, Producto):
            return NotImplemented
        return (self.nombre, self.precio, self.cantidad) == (otro.nombre, otro.precio, otro.cantidad)
```

Son muchas líneas de código solo para guardar tres variables. Esto no solo es tedioso, sino que es propenso a errores: si mañana añades un atributo `descuento`, tendrás que acordarte de actualizar manualmente el `__init__`, el `__repr__` y el `__eq__`.

### La solución: `@dataclass`

El decorador `@dataclass` utiliza metaprogramación para inspeccionar tu clase y generar automáticamente todos esos métodos Dunder por detrás de escena.

Veamos el equivalente exacto del código anterior usando *dataclasses*:

```python
from dataclasses import dataclass

@dataclass
class Producto:
    nombre: str
    precio: float
    cantidad: int = 0
```

¡Eso es todo! Con solo unas pocas líneas, esta clase ya tiene un inicializador completo, una representación en texto amigable (`__repr__`) y capacidad para comparar instancias por su contenido (`__eq__`).

**Un detalle crucial sobre el tipado:** Notarás que hemos utilizado sintaxis como `nombre: str`. En las *dataclasses*, el uso de **Type Hints** (anotaciones de tipo) es estrictamente obligatorio para declarar los atributos. El decorador `@dataclass` busca específicamente estas anotaciones para saber qué variables debe incluir en el `__init__`. *(Profundizaremos en el tipado estricto en el Capítulo 11).*

### Trampas comunes: El problema de los mutables y `default_factory`

¿Qué pasa si queremos que nuestro producto tenga una lista de etiquetas (tags) por defecto? 

Si intentas hacer `etiquetas: list = []`, Python levantará un error. Esto te protege de un error clásico del lenguaje: usar estructuras mutables como valores por defecto hace que todas las instancias compartan exactamente la misma lista en memoria.

Para resolver esto, `dataclasses` nos proporciona la función `field`:

```python
from dataclasses import dataclass, field

@dataclass
class Producto:
    nombre: str
    precio: float
    # Genera una NUEVA lista vacía para cada instancia
    etiquetas: list[str] = field(default_factory=list) 
```

### Inmutabilidad garantizada con `frozen=True`

Si quieres estar absolutamente seguro de que los datos de tu clase no cambien una vez instanciada (un principio muy útil en la programación funcional o al diseñar arquitecturas concurrentes), puedes "congelar" la *dataclass*.

```python
@dataclass(frozen=True)
class ConfiguracionRed:
    ip: str
    puerto: int

config = ConfiguracionRed("192.168.1.1", 8080)
# config.puerto = 9000  # ❌ Esto lanzará un FrozenInstanceError
```

Una ventaja oculta de usar `frozen=True` es que Python generará automáticamente el método mágico `__hash__`. Esto significa que tus objetos congelados podrán usarse como claves en un diccionario o añadirse a un `set` de forma segura.

### Validación tardía: El gancho `__post_init__`

Puesto que `@dataclass` genera el `__init__` por ti, ¿dónde pones la lógica si necesitas validar datos o crear un atributo calculado a partir de otros? 

Para esto existe un método especial reservado llamado `__post_init__`, que la clase ejecutará automáticamente justo después de terminar la inicialización generada.

```python
@dataclass
class UsuarioVIP:
    nombre: str
    gasto_total: float
    nivel: str = field(init=False) # Excluye este campo del __init__

    def __post_init__(self):
        # Validamos los datos de entrada
        if self.gasto_total < 0:
            raise ValueError("El gasto no puede ser negativo")
            
        # Calculamos atributos dependientes
        if self.gasto_total > 10000:
            self.nivel = "Platino"
        elif self.gasto_total > 5000:
            self.nivel = "Oro"
        else:
            self.nivel = "Plata"

vip = UsuarioVIP("Elena", 7500)
print(vip.nivel) # Salida: Oro
```

Con las *dataclasses*, cerramos los fundamentos de la Programación Orientada a Objetos en Python. Ahora tienes las herramientas para modelar datos de forma elegante, proteger el estado interno, extender el comportamiento mediante herencia y abstraer la complejidad. En el siguiente capítulo, dejaremos el diseño arquitectónico de lado por un momento para centrarnos en la resiliencia: cómo anticipar y gestionar los errores para que nuestros programas no colapsen en producción.