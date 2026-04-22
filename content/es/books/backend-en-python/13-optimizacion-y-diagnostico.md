Optimizar código no es una cuestión de instinto, sino de rigor científico. Como ingeniero senior, tu labor no es escribir el código más rápido a la primera, sino el más legible, y luego usar herramientas de diagnóstico para atacar los cuellos de botella reales. En este capítulo, aprenderás a trascender las conjeturas mediante el perfilado de precisión. Utilizaremos `timeit` para micro-optimizaciones, `cProfile` para identificar las funciones que ralentizan tu flujo de ejecución y `tracemalloc` para cazar retenciones de memoria. Finalmente, veremos cómo el uso estratégico del módulo `collections` puede transformar un algoritmo ineficiente en una solución de alto rendimiento.

## 13.1 Perfilado de código (Profiling) con `cProfile` y `timeit`

Uno de los mayores errores en el desarrollo de software es la optimización prematura. Como desarrolladores, nuestra intuición sobre qué parte del código es lenta suele ser sorprendentemente inexacta. Antes de reescribir un algoritmo, implementar multiprocesamiento (como vimos en el Capítulo 12) o refactorizar estructuras de datos, debemos seguir una regla de oro fundamental: **no adivines, mide**.

El perfilado (profiling) es el proceso de analizar la ejecución de un programa para determinar dónde se consume el tiempo y los recursos. En Python, contamos con dos herramientas nativas esenciales para esta tarea, cada una con un propósito específico: `timeit` para micro-perfilado y `cProfile` para macro-perfilado.

### El Ciclo de Optimización

Antes de entrar en las herramientas, es crucial entender el flujo de trabajo correcto cuando buscamos rendimiento:

```text
+----------------+      +-------------------+      +--------------------------+
| 1. Escribir    | ---> | 2. Medir          | ---> | 3. Identificar Cuellos   |
|    código base |      |    (Profiling)    |      |    de Botella (Bottleneck|
+----------------+      +-------------------+      +--------------------------+
        ^                                                       |
        |                                                       v
+----------------+      +-------------------+      +--------------------------+
| 6. Repetir si  | <--- | 5. Verificar con  | <--- | 4. Optimizar SOLO la     |
|    es necesario|      |    nuevas medidas |      |    parte identificada    |
+----------------+      +-------------------+      +--------------------------+
```

---

### Micro-perfilado con `timeit`

Cuando necesitas comparar la velocidad de pequeñas porciones de código (por ejemplo, evaluar si una comprensión de lista es más rápida que usar `map` para un caso específico), `timeit` es la herramienta adecuada. 

`timeit` aísla el código, lo ejecuta miles o millones de veces para obtener un promedio estadísticamente significativo y, lo más importante, **deshabilita temporalmente el recolector de basura (Garbage Collector)** de Python. Esto evita que la recolección de memoria interfiera con la medición del tiempo de CPU.

**Uso desde la línea de comandos (CLI)**

La forma más rápida y común de usar `timeit` es desde la terminal. Supongamos que queremos comparar la concatenación de strings mediante un bucle generador versus una comprensión de lista.

```bash
# Opción A: Expresión generadora
$ python -m timeit "'-'.join(str(n) for n in range(100))"
20000 loops, best of 5: 14.2 usec per loop

# Opción B: Comprensión de lista
$ python -m timeit "'-'.join([str(n) for n in range(100)])"
20000 loops, best of 5: 12.1 usec per loop
```
*El resultado muestra que la comprensión de lista es ligeramente más rápida porque genera todos los elementos en memoria en C antes de pasarlos a `join`, evitando la sobrecarga del protocolo de iteración en cada paso.*

**Uso programático**

También puedes usar `timeit` dentro de tus scripts, lo cual es útil para pruebas de regresión de rendimiento:

```python
import timeit

setup_code = """
import random
datos = [random.random() for _ in range(1000)]
"""

test_code = """
ordenados = sorted(datos)
"""

# Ejecutará el 'setup_code' una vez, y el 'test_code' 10,000 veces
tiempo = timeit.timeit(stmt=test_code, setup=setup_code, number=10000)
print(f"Tiempo de ejecución: {tiempo:.4f} segundos")
```

---

### Macro-perfilado con `cProfile`

Mientras `timeit` es un microscopio, `cProfile` es un dron que te da una vista panorámica de toda tu aplicación. Es un perfilador determinista escrito en C (lo que garantiza una sobrecarga mínima) que registra la frecuencia y el tiempo de ejecución de cada función y método en tu programa.

*(Nota: Existe también el módulo `profile`, pero está escrito en Python puro y añade demasiada sobrecarga. Utiliza siempre `cProfile`).*

**Uso básico desde la terminal**

Puedes perfilar un script completo sin modificar ni una sola línea de código fuente:

```bash
python -m cProfile mi_script.py
```

Esto imprimirá un informe en la consola al finalizar la ejecución. Sin embargo, para aplicaciones reales, el output puede ser masivo e ilegible. 

**Entendiendo el output de cProfile**

Veamos un ejemplo de salida y cómo interpretar sus métricas fundamentales, ya que esta es la habilidad principal del perfilado:

```text
         105 function calls in 0.450 seconds

   Ordered by: standard name

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.000    0.000    0.450    0.450 mi_script.py:1(<module>)
      100    0.400    0.004    0.400    0.004 mi_script.py:5(procesar_datos)
        4    0.050    0.012    0.050    0.012 {built-in method time.sleep}
```

* **ncalls:** Número de veces que se llamó a la función. (Si ves fracciones como `3/1`, indica recursividad: 3 llamadas totales, 1 llamada primitiva/raíz).
* **tottime:** El tiempo total gastado **dentro** de la función, *excluyendo* el tiempo gastado en llamadas a sub-funciones. **(Esta es la métrica clave para encontrar cuellos de botella reales).**
* **percall (primero):** `tottime` dividido por `ncalls`.
* **cumtime:** El tiempo acumulado gastado en la función **y en todas las sub-funciones** que esta haya llamado.
* **percall (segundo):** `cumtime` dividido por llamadas primitivas.

**Análisis avanzado con `pstats`**

Para hacer el output manejable, es una práctica estándar de nivel senior exportar los datos y analizarlos con el módulo `pstats`.

```bash
# Guardamos los resultados en un archivo binario
python -m cProfile -o salida.prof mi_script.py
```

Luego, en una consola interactiva de Python o en un script de análisis:

```python
import pstats

# Cargar el archivo de perfilado
p = pstats.Stats('salida.prof')

# Ordenar por tiempo acumulado (cumtime) y mostrar el top 10
print("--- Top 10 por tiempo acumulado (Flujo general) ---")
p.sort_stats('cumtime').print_stats(10)

# Ordenar por tiempo interno (tottime) y mostrar el top 10
# Aquí es donde realmente se esconde el código ineficiente
print("--- Top 10 por tiempo interno (Cuellos de botella) ---")
p.sort_stats('tottime').print_stats(10)

# Ver quién llamó a una función problemática específica
p.print_callers('procesar_datos')
```

**Consejo Profesional:** Aunque `pstats` es potente, la terminal tiene sus límites. En entornos de producción y desarrollo moderno, esos archivos `.prof` generados por `cProfile` se suelen abrir con herramientas de visualización gráfica como **SnakeViz** o **KCachegrind**, que generan diagramas de fuego (Flame Graphs) o grafos de llamadas (Call Graphs) en el navegador, permitiendo identificar la ruta crítica de ejecución visualmente en segundos.

## 13.2 Análisis de consumo de memoria

Optimizar el uso de la CPU es solo la mitad de la batalla en el desarrollo de software de alto rendimiento. En Python, la memoria suele ser un recurso mucho más crítico e impredecible. Debido a que Python gestiona la memoria automáticamente mediante **conteo de referencias (reference counting)** y un **recolector de basura cíclico (cyclic garbage collector)**, es muy fácil desarrollar una falsa sensación de seguridad. 

Aunque técnicamente Python no tiene "fugas de memoria" (memory leaks) en el sentido tradicional de C o C++ (memoria asignada y nunca liberada), sí sufre de **retención de objetos indeseada**. Esto ocurre cuando mantenemos referencias vivas a objetos que ya no necesitamos (por ejemplo, en variables globales, cachés sin límite o clausuras), impidiendo que el recolector de basura los destruya.

Para diagnosticar estos problemas, pasamos del análisis de tiempo al análisis de espacio utilizando tres enfoques distintos.

### Nivel 1: Inspección superficial con `sys.getsizeof`

La forma más básica de medir la memoria es preguntar cuánto ocupa un objeto individual. La biblioteca estándar proporciona `sys.getsizeof()`. 

Sin embargo, tiene una trampa fundamental que todo desarrollador Senior debe conocer: **solo mide el tamaño del contenedor, no el de sus elementos referenciados**.

```python
import sys

lista_vacia = []
lista_llena = [str(i) for i in range(1000)]

print(f"Lista vacía: {sys.getsizeof(lista_vacia)} bytes")
# Salida: Lista vacía: 56 bytes (depende de la arquitectura)

print(f"Lista llena: {sys.getsizeof(lista_llena)} bytes")
# Salida: Lista llena: 8856 bytes
```

Aunque `lista_llena` muestra 8856 bytes, esto es solo el tamaño de la matriz de punteros de la lista. El tamaño real (sumando los 1000 objetos string que contiene) es mucho mayor. Por esta razón, `getsizeof` rara vez es suficiente para estructuras de datos complejas.

### Nivel 2: Diagnóstico de fugas con `tracemalloc`

Introducido en Python 3.4, `tracemalloc` es la herramienta nativa definitiva para rastrear asignaciones de memoria a nivel de bloque. Su superpoder es la capacidad de tomar **instantáneas (snapshots)** en diferentes momentos de la ejecución y compararlas para ver exactamente en qué archivo y línea de código está creciendo la memoria.

```text
+-------------------+      +-------------------+      +------------------------+
| 1. Iniciar        | ---> | 2. Snapshot A     | ---> | 3. Ejecutar operación  |
|    tracemalloc    |      |    (Estado base)  |      |    sospechosa          |
+-------------------+      +-------------------+      +------------------------+
                                                                |
+-------------------+      +-------------------+                v
| 6. Analizar       | <--- | 5. Comparar B - A | <--- | 4. Snapshot B          |
|    diferencias    |      |    (Diferencia)   |      |    (Estado alterado)   |
+-------------------+      +-------------------+      +------------------------+
```

Veamos cómo implementarlo en código para cazar una retención de memoria:

```python
import tracemalloc

def operacion_que_retiene_memoria():
    # Simulamos una caché global que crece sin control
    global_cache = []
    for i in range(100000):
        global_cache.append(f"Dato procesado número {i} con un string largo")
    return global_cache

# 1. Iniciar el rastreo
tracemalloc.start()

# 2. Tomar la primera instantánea
snapshot1 = tracemalloc.take_snapshot()

# 3. Ejecutar el código sospechoso
datos = operacion_que_retiene_memoria()

# 4. Tomar la segunda instantánea
snapshot2 = tracemalloc.take_snapshot()

# 5. Comparar y mostrar el Top 3 de incrementos
estadisticas = snapshot2.compare_to(snapshot1, 'lineno')

print("--- Top 3 líneas que consumieron más memoria ---")
for stat in estadisticas[:3]:
    print(stat)

# Limpiar
tracemalloc.stop()
```

**Salida típica:**
```text
--- Top 3 líneas que consumieron más memoria ---
mi_script.py:7: size=8543 KiB (+8543 KiB), count=100000 (+100000), average=87 B
mi_script.py:6: size=800 KiB (+800 KiB), count=1 (+1), average=800 KiB
...
```
*Aquí vemos claramente que la línea 7 (`global_cache.append(...)`) es la responsable de asignar más de 8 MB de memoria.*

### Nivel 3: Perfilado línea por línea con `memory_profiler`

Mientras `tracemalloc` es excelente para comparar estados, a veces necesitas ver la evolución del consumo de RAM línea por línea dentro de una función específica. Para esto, utilizamos una herramienta externa muy popular llamada `memory_profiler`.

Primero debes instalarla: `pip install memory-profiler`.

Su uso es extraordinariamente simple: solo necesitas decorar la función que deseas analizar con `@profile`.

```python
# script_memoria.py
from memory_profiler import profile

@profile
def procesamiento_masivo():
    a = [1] * (10 ** 6)  # Asignamos una lista grande
    b = [2] * (2 * 10 ** 7) # Asignamos una lista aún mayor
    del b # Liberamos explícitamente 'b'
    return a

if __name__ == '__main__':
    procesamiento_masivo()
```

Ejecutamos el script pasándolo por el módulo `memory_profiler`:

```bash
python -m memory_profiler script_memoria.py
```

**Salida generada:**
```text
Line #    Mem usage    Increment  Occurrences   Line Contents
=============================================================
     4     14.2 MiB     14.2 MiB           1   @profile
     5                                         def procesamiento_masivo():
     6     21.8 MiB      7.6 MiB           1       a = [1] * (10 ** 6)
     7    174.4 MiB    152.6 MiB           1       b = [2] * (2 * 10 ** 7)
     8     21.8 MiB   -152.6 MiB           1       del b
     9     21.8 MiB      0.0 MiB           1       return a
```

**Interpretación de columnas:**
* **Mem usage:** Memoria total utilizada por el proceso de Python en ese instante.
* **Increment:** Cuánta memoria **añadió (o liberó)** esa línea de código en particular respecto a la línea anterior. Aquí reside el valor real de la herramienta.

> **Advertencia de rendimiento:** `memory_profiler` ralentiza masivamente la ejecución de tu código (puede ser de 10 a 100 veces más lento). **Nunca** lo dejes activo en entornos de producción. Úsalo exclusivamente como herramienta de diagnóstico en tu entorno de desarrollo y elimina el decorador `@profile` al terminar.

Dominar estas herramientas te permitirá transicionar de decir *"mi aplicación consume mucha RAM"* a *"mi aplicación retiene 400 MB adicionales en la línea 42 debido a una lista que no se recolecta"*, una diferencia que define el nivel Senior. En la siguiente sección, exploraremos cómo estructuras de datos alternativas pueden mitigar estos cuellos de botella.

## 13.3 Estructuras de datos de alto rendimiento del módulo `collections`

Como descubrimos en las secciones anteriores utilizando `cProfile` y `tracemalloc`, identificar un cuello de botella en CPU o memoria es solo el primer paso. Frecuentemente, el problema raíz no es una lógica de negocio ineficiente, sino el uso de la estructura de datos incorrecta para el patrón de acceso requerido. 

Python proporciona listas, diccionarios, tuplas y sets nativos que son extremadamente versátiles. Sin embargo, para operaciones altamente especializadas, la biblioteca estándar ofrece el módulo `collections`, escrito e hiperoptimizado en C. En esta sección nos centraremos en las dos estructuras más críticas para el rendimiento: `deque` y `Counter`.

### `deque`: La solución al problema de O(n) en listas

En CPython, la estructura nativa `list` no es una lista enlazada como su nombre podría sugerir, sino un **arreglo dinámico de punteros** contiguos en memoria. 

Esto hace que acceder a un elemento por su índice (`lista[50]`) o añadir al final (`lista.append(x)`) sea rapidísimo, con una complejidad temporal de **O(1)**. Sin embargo, ¿qué ocurre si necesitamos insertar o eliminar el primer elemento (`lista.insert(0, x)` o `lista.pop(0)`)?

Al ser un arreglo contiguo, Python se ve obligado a desplazar *todos* los elementos restantes un espacio hacia la derecha o hacia la izquierda. Si la lista tiene un millón de elementos, es un millón de operaciones de reasignación en memoria. Su complejidad es **O(n)**.

```text
Lista dinámica (list) - pop(0):
[ A, B, C, D, E ] -> Extraer 'A'
[ _, B, C, D, E ] -> Hueco en el índice 0
[ B, _, C, D, E ] -> Mover B al índice 0
[ B, C, _, D, E ] -> Mover C al índice 1 ... (Ineficiente)
```

Aquí es donde entra **`deque`** (Double-Ended Queue o Cola de Doble Extremo). Internamente, está implementada como una lista doblemente enlazada de bloques. Esto permite que las inserciones y eliminaciones *en ambos extremos* sean **O(1)**.

```text
Cola de doble extremo (deque) - popleft():
(Nodos independientes enlazados)
[A] <-> [B] <-> [C] <-> [D]
Extraer 'A' simplemente rompe el enlace entre A y B. No hay desplazamiento.
```

**Demostración empírica del rendimiento:**

```python
import collections
import timeit

# Configuración de listas y deques grandes
setup_code = """
import collections
lista = list(range(100_000))
cola = collections.deque(range(100_000))
"""

# Evaluando pop en el extremo izquierdo
tiempo_lista = timeit.timeit("lista.pop(0)", setup=setup_code, number=1000)
tiempo_deque = timeit.timeit("cola.popleft()", setup=setup_code, number=1000)

print(f"Lista pop(0):   {tiempo_lista:.6f} segundos")
print(f"Deque popleft(): {tiempo_deque:.6f} segundos")

# RESULTADO TÍPICO:
# Lista pop(0):   0.015400 segundos
# Deque popleft(): 0.000080 segundos  <-- ~190 veces más rápido
```

**Uso Avanzado: Ventanas Deslizantes (Sliding Windows)**

Un patrón de nivel Senior con `deque` es el uso del parámetro `maxlen`. Si creas un `deque` con una longitud máxima, al añadir elementos cuando está llena, automáticamente descartará los elementos del extremo opuesto. Esto es perfecto para retener las últimas *N* líneas de un archivo de log, o calcular medias móviles de sensores sin tener que gestionar la limpieza de memoria manualmente.

```python
from collections import deque

# Solo mantendrá los últimos 3 elementos
historial_comandos = deque(maxlen=3)

historial_comandos.append("git status")
historial_comandos.append("git add .")
historial_comandos.append("git commit -m 'Fix'")
print(historial_comandos) 
# deque(['git status', 'git add .', "git commit -m 'Fix'"], maxlen=3)

# Al añadir un cuarto, el primero ("git status") es eliminado en O(1)
historial_comandos.append("git push")
print(historial_comandos) 
# deque(['git add .', "git commit -m 'Fix'", 'git push'], maxlen=3)
```

---

### `Counter`: Conteo en C optimizado

Un requerimiento ubicuo en backend y análisis de datos es contar la frecuencia de elementos. El enfoque "Junior" suele involucrar bucles y el método `.count()` de las listas (lo cual es catastrófico, con complejidad **O(n²)**). El enfoque intermedio usa un diccionario con `dict.get(key, 0) + 1` o un `defaultdict(int)`.

El enfoque Senior utiliza `collections.Counter`, una subclase de diccionario diseñada específicamente para la tabulación matemática.

```python
from collections import Counter

logs_http = [
    "200", "404", "200", "500", "200", "401", "404", "200"
]

# Tabulación instantánea en C
frecuencias = Counter(logs_http)
print(frecuencias)
# Salida: Counter({'200': 4, '404': 2, '500': 1, '401': 1})
```

**Características de alto rendimiento de Counter:**

1. **`most_common(n)`:** En lugar de ordenar todo el diccionario por sus valores (lo que costaría **O(n log n)**), este método utiliza una estructura de datos de Montículo (Heap, a través del módulo `heapq`) por debajo, logrando extraer los top N elementos de forma mucho más eficiente.
   
   ```python
   # Obtener los 2 códigos más frecuentes
   print(frecuencias.most_common(2))
   # Salida: [('200', 4), ('404', 2)]
   ```

2. **Matemática de multiconjuntos:** `Counter` sobreescribe operadores mágicos para permitir sumar, restar o intersectar contadores en un nivel bajo, sin necesidad de iterar manualmente en Python.

   ```python
   dia1 = Counter({'200': 1500, '404': 20, '500': 2})
   dia2 = Counter({'200': 1800, '404': 50, '503': 5})

   # Suma total de peticiones
   total = dia1 + dia2
   print(total['404']) # Salida: 70

   # Encontrar códigos que aumentaron en el día 2 respecto al día 1
   incrementos = dia2 - dia1
   print(incrementos)
   # Salida: Counter({'200': 300, '404': 30, '503': 5})
   ```

En resumen, la biblioteca estándar de Python ya ha resuelto la mayoría de los problemas algorítmicos clásicos en su capa de C. Antes de escribir lógica compleja para gestionar el estado, sumar frecuencias o manipular colecciones, verifica si el módulo `collections` tiene un primitivo de alto rendimiento listo para usar.