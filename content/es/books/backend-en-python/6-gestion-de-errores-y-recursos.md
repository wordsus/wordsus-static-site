Desarrollar software robusto implica aceptar una realidad inevitable: las cosas fallarán. Una conexión caída o un dato mal formateado no deben colapsar tu sistema. En este capítulo, aprenderás a transformar errores fatales en eventos controlados mediante el bloque **try/except**, separando el "camino feliz" de la lógica de recuperación con **else** y **finally**. Elevaremos tu nivel profesional diseñando **jerarquías de excepciones** que hablan el lenguaje de tu negocio, y finalizaremos dominando los **Gestores de Contexto**. Estos últimos te permitirán gestionar recursos de forma elegante y automática, eliminando fugas de memoria y garantizando la limpieza de tu código.

## 6.1 Bloques de excepciones: try, except, else, finally

En el mundo real, el software falla. Las redes se caen, los usuarios introducen texto donde se esperaban números y los archivos desaparecen. En Python, cuando una operación no puede ejecutarse correctamente durante el tiempo de ejecución (runtime), el intérprete levanta una **excepción**. Si esta excepción no es capturada y gestionada, el programa se detiene abruptamente y muestra un *traceback* (el historial de llamadas que provocó el error).

Para construir aplicaciones robustas, Python proporciona un mecanismo de control de flujo diseñado específicamente para el manejo de errores: los bloques `try`, `except`, `else` y `finally`.

---

### Anatomía y Flujo de Ejecución

El manejo de excepciones no solo trata de "evitar que el programa explote", sino de canalizar el flujo de ejecución de manera controlada. A continuación se presenta un diagrama en texto plano que ilustra la ruta que toma el intérprete:

```text
       [ Inicio del bloque ]
                 |
              [ try ] ------------------+
                 |                      | (Si ocurre una excepción)
         (Si no hay error)              |
                 |                      v
              [ else ]              [ except ]
                 |                      |
                 +----------+-----------+
                            |
                       [ finally ]
                            |
                   [ Continúa el código ]
```

### 1. El bloque `try`: Protegiendo el código

El bloque `try` define la zona de riesgo. Aquí es donde colocas el código que sospechas que podría fallar.

> **Regla de oro Senior:** El bloque `try` debe ser lo más reducido posible. Incluye únicamente la línea o líneas específicas que pueden lanzar la excepción. Envolver decenas de líneas en un solo `try` es un antipatrón, ya que dificulta saber exactamente qué instrucción originó el fallo.

### 2. El bloque `except`: Capturando el error

Si ocurre una excepción dentro del bloque `try`, el resto de ese bloque se cancela y el intérprete salta inmediatamente al bloque `except`. 

Como vimos en el Capítulo 5 (POO), las excepciones en Python son objetos (instancias de clases que heredan de `BaseException`). Esto nos permite capturar tipos de errores específicos y reaccionar de forma distinta a cada uno.

```python
def procesar_entrada(valor_usuario):
    try:
        # Intentamos convertir la entrada a entero
        numero = int(valor_usuario)
        resultado = 100 / numero
    except ValueError:
        print("Error: Debes ingresar un número válido, no texto.")
    except ZeroDivisionError as e:
        # Capturamos la instancia de la excepción con 'as e'
        print(f"Error matemático: No se puede dividir por cero. Detalles: {e}")
```

**Antipatrón a evitar (Bare except):**
Nunca utilices un `except:` vacío o `except Exception:` sin registrar (loggear) o relanzar el error, a menos que tengas una razón arquitectónica muy específica. Hacerlo silencia errores inesperados (como un `NameError` por una variable mal escrita) y convierte tu código en una pesadilla de depuración.

### 3. El bloque `else`: El "Happy Path"

El bloque `else` es quizás el menos comprendido y el más infrautilizado por los desarrolladores junior. Este bloque **solo se ejecuta si el bloque `try` terminó sin lanzar ninguna excepción**.

¿Por qué no poner ese código simplemente al final del bloque `try`? Para mantener el `try` al mínimo absoluto. El código en `else` es seguro; si lanza una excepción, no será capturada por el `except` superior, lo cual es correcto porque no era el error que estábamos previendo.

```python
def actualizar_perfil(datos_json):
    try:
        usuario = datos_json["username"]
    except KeyError:
        print("Error: El JSON no contiene la clave 'username'.")
    else:
        # Solo llegamos aquí si la clave existía. 
        # Si esta función falla por otra razón, queremos saberlo, no ocultarlo.
        guardar_en_base_de_datos(usuario)
```

### 4. El bloque `finally`: Limpieza garantizada

El bloque `finally` se ejecutará **siempre**, independientemente de si el `try` tuvo éxito, si saltó un `except`, o si se ejecutó el `else`. Su propósito principal es la liberación de recursos externos (cerrar conexiones a bases de datos, cerrar archivos, liberar locks de concurrencia).

```python
def consultar_base_datos():
    conexion = conectar_db()
    try:
        datos = conexion.ejecutar("SELECT * FROM usuarios")
        return datos
    except ConexionError:
        print("Fallo de red al consultar.")
        return None
    finally:
        # Esto se ejecutará INCLUSO si hay un 'return' en el try o en el except
        print("Cerrando la conexión a la base de datos...")
        conexion.cerrar()
```

> **Nota Avanzada:** Si hay una declaración `return`, `break` o `continue` dentro de un bloque `try` o `except`, el bloque `finally` se ejecuta *justo antes* de que esa declaración tome efecto. Además, si el propio bloque `finally` contiene un `return`, este anulará cualquier `return` previo del `try` o `except`.

---

### EAFP vs LBYL en Python

Para cerrar esta sección, es crucial entender la filosofía de diseño de Python respecto a las excepciones. En otros lenguajes (como C o Java), se estila el patrón **LBYL** (*Look Before You Leap* - Mira antes de saltar), donde se comprueban exhaustivamente las condiciones antes de realizar una acción:

```python
# Estilo LBYL (Poco Pythónico)
if "clave" in mi_diccionario:
    valor = mi_diccionario["clave"]
else:
    valor = "defecto"
```

Python favorece fuertemente el patrón **EAFP** (*Easier to Ask for Forgiveness than Permission* - Es más fácil pedir perdón que permiso). Se asume que la operación será exitosa y se captura la excepción si no lo es. Esto suele ser más rápido (evita múltiples comprobaciones) y evita condiciones de carrera en entornos concurrentes.

```python
# Estilo EAFP (Idiomático en Python)
try:
    valor = mi_diccionario["clave"]
except KeyError:
    valor = "defecto"
```

Dominar la sintaxis de `try/except/else/finally` es el primer paso para dominar EAFP. En la siguiente sección (6.2), subiremos el nivel viendo cómo crear y levantar nuestras propias jerarquías de excepciones para comunicar la semántica de negocio de nuestras aplicaciones. (Nota: Más adelante, en la sección 6.3, veremos cómo los Gestores de Contexto y la declaración `with` abstraen y reemplazan gran parte de la necesidad de usar `finally` para el manejo de recursos).

## 6.2 Creación de jerarquías de excepciones personalizadas

Las excepciones integradas (built-in) de Python, como `ValueError`, `TypeError` o `KeyError`, son excelentes para comunicar errores genéricos de programación. Sin embargo, a medida que tus aplicaciones crecen y modelan reglas de negocio complejas, estas excepciones genéricas pierden expresividad. 

Si estás programando una pasarela de pagos y un usuario intenta retirar más dinero del que tiene, podrías levantar un `ValueError`. Pero, semánticamente, "Error de Valor" no comunica el problema real ni a los otros desarrolladores ni al sistema de monitoreo. Aquí es donde entran las **excepciones personalizadas**.

### ¿Por qué crear tu propia jerarquía?

1. **Semántica de Negocio:** Una excepción llamada `FondosInsuficientesError` explica el problema instantáneamente sin necesidad de leer el *traceback* o el mensaje adjunto.
2. **Granularidad en la captura (Catching):** Permite a los consumidores de tu código (otros módulos, o desarrolladores usando tu API) decidir si quieren capturar todos los errores de tu módulo de golpe, o reaccionar a errores muy específicos.
3. **Encapsulamiento de metadatos:** Puedes inyectar estado (variables, IDs de transacción, códigos de error) directamente en la excepción para que el bloque `except` tenga todo el contexto necesario para actuar.

### Diseñando la Jerarquía (El patrón de la Clase Base)

El estándar de la industria en Python (y en muchos otros lenguajes) es crear una **excepción base** vacía para tu módulo o paquete, y hacer que todos los errores específicos hereden de ella.

A nivel estructural, se vería así:

```text
 BaseException (Clase raíz de Python - NUNCA heredar de aquí directamente)
  └── Exception (Clase base para errores lógicos)
       │
       └── SistemaPagosError (Tu clase base personalizada)
            ├── AutenticacionPasarelaError
            ├── TransaccionRechazadaError
            │    ├── FondosInsuficientesError
            │    └── TarjetaExpiradaError
            └── LimiteDiarioExcedidoError
```

> **Regla de oro Senior:** Nunca heredes directamente de `BaseException`. Esa clase está reservada para eventos de nivel de sistema, como `SystemExit` o `KeyboardInterrupt` (cuando el usuario presiona Ctrl+C). Debes heredar siempre de `Exception` o de alguna de sus subclases.

### Implementación en Código

Veamos cómo traducir el diagrama anterior a código real, aprovechando la orientación a objetos que vimos en el Capítulo 5 para enriquecer nuestros errores.

```python
# 1. Definimos la excepción base del módulo
class SistemaPagosError(Exception):
    """Clase base para todas las excepciones de nuestra pasarela de pagos."""
    pass

# 2. Definimos excepciones específicas que heredan de la base
class LimiteDiarioExcedidoError(SistemaPagosError):
    """Se levanta cuando una cuenta supera su límite de transferencias."""
    pass

# 3. Excepciones enriquecidas con estado interno
class TransaccionRechazadaError(SistemaPagosError):
    """Base para transacciones fallidas, almacena el ID de la transacción."""
    def __init__(self, mensaje: str, transaccion_id: str):
        super().__init__(mensaje)
        self.transaccion_id = transaccion_id

class FondosInsuficientesError(TransaccionRechazadaError):
    """Error específico con cálculo de déficit."""
    def __init__(self, transaccion_id: str, saldo_actual: float, monto_requerido: float):
        self.saldo_actual = saldo_actual
        self.monto_requerido = monto_requerido
        self.deficit = monto_requerido - saldo_actual
        
        mensaje = (f"Fondos insuficientes para la transacción {transaccion_id}. "
                   f"Faltan ${self.deficit:.2f}.")
        # Inicializamos la clase padre (TransaccionRechazadaError)
        super().__init__(mensaje, transaccion_id)
```

### El poder de la captura polimórfica

Ahora, conectemos esto con los bloques `try/except` que aprendimos en la sección 6.1. La magia de tener una jerarquía es que un solo `except` puede capturar a la clase padre y, por definición (polimorfismo), capturará a todas sus hijas.

Esto le da al desarrollador que usa tu código una flexibilidad enorme:

```python
def procesar_pago(usuario_id, monto):
    # Lógica simulada
    raise FondosInsuficientesError(transaccion_id="TXN-9982", saldo_actual=50.0, monto_requerido=200.0)

# Escenario de uso:
try:
    procesar_pago(usuario_id=101, monto=200.0)

except FondosInsuficientesError as e:
    # Captura hiper-específica: Tenemos acceso a los atributos personalizados
    print(f"Notificando al usuario: Te faltan ${e.deficit} para esta compra.")

except TransaccionRechazadaError as e:
    # Captura intermedia: Cualquier otro rechazo (ej. TarjetaExpirada) cae aquí
    print(f"La transacción {e.transaccion_id} fue denegada por el banco.")
    
except SistemaPagosError as e:
    # Captura genérica del dominio: Captura LimiteDiarioExcedidoError y otros
    print(f"Fallo general en el sistema de pagos: {e}")
    
except Exception as e:
    # El comodín: Captura errores estándar de Python (TypeError, KeyError, etc.)
    print(f"Error inesperado en la aplicación: {e}")
```

Al diseñar tus paquetes y arquitecturas (tema que profundizaremos en el Capítulo 7 y 19), empaquetar tus propios errores de esta manera no es solo una "buena práctica", es una firma de madurez en tu código. Evita que detalles internos (como que la base de datos lanzó un `psycopg2.OperationalError`) se filtren a las capas superiores de tu aplicación, traduciéndolos primero a un error de dominio de tu propia jerarquía.

## 6.3 Gestores de contexto (Context Managers): la declaración `with` y `contextlib`

En la sección 6.1 vimos cómo el bloque `finally` garantiza la ejecución de código de limpieza, como cerrar un archivo o liberar un bloqueo (lock). Sin embargo, escribir bloques `try/finally` para cada recurso que abrimos resulta repetitivo, propenso a errores humanos (¿qué pasa si olvidas el `finally`?) y ensucia visualmente el código.

Python introduce los **Gestores de Contexto** (Context Managers) y la palabra reservada `with` para resolver exactamente este problema. Su propósito es encapsular la lógica de inicialización y limpieza de recursos de forma segura y elegante.

### La evolución hacia el `with`

Observa cómo el manejo manual de un archivo evoluciona hacia un gestor de contexto:

```python
# El enfoque tradicional (Largo y propenso a olvidos)
archivo = open("datos.txt", "w")
try:
    archivo.write("Hola, mundo!")
finally:
    archivo.close()

# El enfoque idiomático y seguro (Gestor de Contexto)
with open("datos.txt", "w") as archivo:
    archivo.write("Hola, mundo!")
# Aquí, el archivo YA está cerrado automáticamente.
```

El bloque `with` garantiza que, sin importar lo que ocurra dentro de su indentación (incluso si ocurre una excepción severa, un `return` o un `break`), el recurso se cerrará o liberará correctamente al salir.

### El Protocolo del Gestor de Contexto bajo el capó

Para que un objeto pueda usarse junto a la palabra `with`, debe implementar el **Protocolo de Gestor de Contexto**. Como aprendimos en el Capítulo 5 con el Modelo de Datos, esto significa que la clase debe definir dos métodos mágicos (dunder methods):

1.  `__enter__(self)`: Se ejecuta al entrar al bloque `with`. Lo que retorna este método es lo que se asigna a la variable después de la palabra `as`.
2.  `__exit__(self, exc_type, exc_val, exc_tb)`: Se ejecuta al salir del bloque `with`. Recibe tres argumentos que contienen la información de la excepción (si es que ocurrió alguna dentro del bloque). Si no hubo errores, los tres valores serán `None`.

Aquí tienes un diagrama en texto plano del ciclo de vida:

```text
      [ Declaración 'with' ]
                |
          ( Llama a __enter__ )
                |
        [ Bloque de código ] ------+
                |                  | (Si ocurre un error)
                v                  |
          ( Llama a __exit__ ) <---+ (Recibe exc_type, exc_val, exc_tb)
                |
    [ Continúa la ejecución normal ]
```

### Creando tus propios Gestores de Contexto

Existen dos formas principales de crear un gestor de contexto: usando clases (ideal para mantener estado complejo) y usando el módulo `contextlib` (ideal para lógica funcional rápida).

#### 1. Basado en Clases (El enfoque Clásico)

Imagina que queremos medir cuánto tarda en ejecutarse un bloque de código específico. Podemos crear un gestor de contexto para ello:

```python
import time

class Cronometro:
    def __enter__(self):
        self.inicio = time.perf_counter()
        # Retornamos self por si el usuario quiere acceder a atributos con 'as'
        return self 

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.fin = time.perf_counter()
        tiempo_total = self.fin - self.inicio
        print(f"El bloque tardó {tiempo_total:.4f} segundos en ejecutarse.")
        
        # Si __exit__ retorna True, suprime la excepción (la traga).
        # Si retorna False (o None por defecto), la excepción se propaga.
        return False

# Uso del gestor:
with Cronometro() as crono:
    # Simulamos un proceso costoso
    time.sleep(1.2)
    print("Proceso finalizado.")
```

#### 2. Basado en Generadores: `@contextlib.contextmanager`

Para casos donde no necesitas una clase entera para mantener el estado, la biblioteca estándar ofrece `contextlib`. A través del decorador `@contextmanager` y la palabra clave `yield` (que estudiaremos a fondo en el Capítulo 9), puedes transformar una función normal en un gestor de contexto.

Todo el código antes del `yield` equivale a `__enter__`, y todo el código después del `yield` equivale a `__exit__`.

```python
from contextlib import contextmanager

@contextmanager
def cambiar_directorio(ruta_temporal):
    import os
    ruta_original = os.getcwd() # Guardamos dónde estamos
    os.chdir(ruta_temporal)     # __enter__: Cambiamos a la nueva ruta
    
    try:
        yield # Aquí se cede el control al interior del bloque 'with'
    finally:
        os.chdir(ruta_original) # __exit__: Restauramos la ruta original

# Uso del gestor:
print("Inicio:", os.getcwd())

with cambiar_directorio("/tmp"):
    # Dentro de este bloque, nuestro directorio de trabajo es /tmp
    print("Dentro del with:", os.getcwd())
    # Cualquier error aquí no impedirá que regresemos a la ruta original
    
print("Fin:", os.getcwd())
```

> **Consejo Senior:** El módulo `contextlib` tiene herramientas increíblemente útiles. Por ejemplo, `contextlib.suppress(FileNotFoundError)` te permite ignorar silenciosamente excepciones específicas en un bloque de código, reemplazando el feo patrón `try: ... except FileNotFoundError: pass`.

Con la comprensión de excepciones y gestores de contexto, tienes las herramientas necesarias para escribir código a prueba de balas. Has completado los fundamentos de control de flujo y manejo de estado. En la Parte II, Capítulo 7, daremos un paso atrás para ver el panorama general: cómo organizar, importar y empaquetar este código utilizando el rico ecosistema de módulos y dependencias de Python.