## 8.1 Lectura y escritura de archivos locales

Hasta este punto del libro, los datos con los que hemos trabajado vivían exclusivamente en la memoria RAM. Esto significa que al terminar la ejecución del script, la información desaparecía. Para lograr la **persistencia**, el primer paso fundamental es aprender a interactuar con el sistema de archivos del sistema operativo mediante operaciones de entrada y salida (I/O).

En Python, la función integrada `open()` es la puerta de enlace para trabajar con archivos locales. 

### La función `open()` y los Modos de Apertura

La firma básica de la función es `open(file, mode='r', encoding=None)`. Antes de leer o escribir, debemos indicar a Python *qué* queremos hacer con el archivo mediante el **modo de apertura**.

A continuación, un diagrama en texto plano que resume los modos principales y el comportamiento del puntero (el cursor que indica dónde se realizará la próxima operación de lectura/escritura):

```text
+------+---------------------------+------------------------+--------------------------+
| Modo | Descripción               | Puntero al inicio en   | ¿Crea el archivo si      |
|      |                           |                        | no existe?               |
+------+---------------------------+------------------------+--------------------------+
| 'r'  | Solo lectura (por defecto)| Principio del archivo  | No (Lanza FileNotFoundError)
| 'w'  | Solo escritura            | Principio (Trunca/Borra| Sí                       |
|      |                           | el contenido previo)   |                          |
| 'a'  | Añadir (Append)           | Final del archivo      | Sí                       |
| 'x'  | Creación exclusiva        | Principio              | Sí (Falla si ya existe)  |
| 'r+' | Lectura y escritura       | Principio              | No                       |
+------+---------------------------+------------------------+--------------------------+
 Modificadores: 't' (texto, por defecto), 'b' (binario). Ejemplo: 'rb', 'wb'.
```

### Lectura de Archivos: De la forma tradicional a las "Mejores Prácticas"

Como vimos en el **Capítulo 6**, gestionar los recursos adecuadamente es vital. Si abrimos un archivo, debemos cerrarlo con `.close()` para liberar el descriptor de archivo a nivel del sistema operativo. Sin embargo, la forma "Senior" y recomendada (Pythonic) es utilizar el gestor de contexto `with`, el cual garantiza el cierre del archivo incluso si ocurre una excepción durante la lectura.

#### 1. Leer todo el contenido (Cuidado con la memoria)
El método `.read()` carga todo el contenido del archivo en un solo *string*. Es útil para archivos pequeños, pero un antipatrón absoluto si el archivo pesa varios Gigabytes.

```python
# Ejemplo de lectura completa
with open("mensaje.txt", "r", encoding="utf-8") as archivo:
    contenido = archivo.read()
    print(contenido)
```
> **Nota de Senior:** Siempre especifica `encoding="utf-8"` cuando trabajes con texto. Si omites este parámetro, Python usará la codificación por defecto del sistema operativo (por ejemplo, `cp1252` en Windows), lo que provocará errores al leer caracteres especiales o emojis creados en sistemas basados en Unix.

#### 2. Lectura línea por línea (El enfoque eficiente)
Para procesar archivos grandes, en lugar de usar `.readlines()` (que carga todas las líneas en una lista en memoria), debemos aprovechar que **los objetos de archivo en Python son iterables**. 

```python
# Procesamiento eficiente en memoria (O(1) en RAM)
with open("logs_servidor.txt", "r", encoding="utf-8") as archivo:
    for linea in archivo:
        # .strip() elimina el salto de línea '\n' al final de cada iteración
        print(linea.strip()) 
```

### Escritura y Añadido de Datos

Para escribir, usamos los modos `'w'` (sobrescribir) o `'a'` (añadir). Los métodos principales son `.write(string)` y `.writelines(iterable)`. Es importante destacar que, a diferencia de la función `print()`, el método `.write()` **no añade un salto de línea automáticamente**; debes incluir `\n` explícitamente.

```python
# Modo 'w': Crea el archivo o sobrescribe si ya existe
lineas_de_texto = [
    "Primera línea del reporte.\n",
    "Segunda línea con datos actualizados.\n"
]

with open("reporte.txt", "w", encoding="utf-8") as archivo:
    # Escribiendo una sola cadena
    archivo.write("--- INICIO DEL REPORTE ---\n")
    
    # Escribiendo un iterable de cadenas
    archivo.writelines(lineas_de_texto)

# Modo 'a': Añade contenido al final sin borrar lo anterior
with open("reporte.txt", "a", encoding="utf-8") as archivo:
    archivo.write("--- FIN DEL REPORTE ---\n")
```

### Archivos Binarios (`'b'`)

No todos los archivos son texto plano. Imágenes, PDFs o ejecutables son archivos binarios. Para manipularlos, añadimos el modificador `'b'` al modo de apertura. En lugar de cadenas de texto (`str`), las operaciones de lectura y escritura utilizarán objetos `bytes`.

```python
# Copiando una imagen byte a byte
with open("logo.png", "rb") as origen:
    with open("logo_copia.png", "wb") as destino:
        # Leemos el contenido binario y lo escribimos directamente
        destino.write(origen.read())
```

### Manejo Moderno de Rutas con `pathlib`

Históricamente, las rutas de los archivos se manejaban como simples cadenas de texto mediante el módulo `os.path`. A partir de Python 3.4, la biblioteca estándar incluye `pathlib`, que introduce un enfoque Orientado a Objetos mucho más robusto e independiente del sistema operativo (evitando los clásicos problemas entre las barras `/` de Linux/Mac y las barras invertidas `\` de Windows).

El objeto `Path` incluso nos permite leer y escribir texto sin necesidad de invocar explícitamente `open()` o `with` en casos sencillos, ya que sus métodos encapsulan la apertura y el cierre:

```python
from pathlib import Path

# Definir una ruta multiplataforma
ruta_archivo = Path("datos") / "configuracion.txt"

# Crear el directorio si no existe (parents=True evita errores si falta 'datos')
ruta_archivo.parent.mkdir(parents=True, exist_ok=True)

# Escritura rápida (sobrescribe por defecto)
ruta_archivo.write_text("parametros_inicializados = True", encoding="utf-8")

# Lectura rápida
if ruta_archivo.exists():
    contenido = ruta_archivo.read_text(encoding="utf-8")
    print(contenido)
```

Con estas bases sólidas sobre cómo interactuar con el sistema de archivos a nivel de texto plano y bytes, estamos listos para estructurar nuestra información. En la siguiente sección (8.2), abandonaremos el texto libre para explorar formatos estandarizados que nos permitirán intercambiar datos estructurados con otros sistemas y lenguajes.

## 8.2 Manipulación de formatos estándar: JSON, CSV y YAML

En la sección anterior dominamos la interacción con el sistema de archivos mediante texto plano y bytes. Sin embargo, en el mundo del desarrollo de software rara vez intercambiamos información como texto libre. Necesitamos estructuras, jerarquías y reglas que tanto humanos como máquinas puedan interpretar de manera predecible. 

A continuación, exploraremos los tres formatos de serialización más utilizados en la industria, cómo manejarlos en Python y, lo más importante, cuándo elegir cada uno.

### 1. JSON (JavaScript Object Notation)

JSON es el rey indiscutible de la web. Es el formato estándar de facto para las APIs RESTful y la comunicación entre microservicios. En Python, su estructura se mapea de forma casi natural con los diccionarios y listas.

La biblioteca estándar incluye el módulo `json`. La clave para dominar este módulo es entender la diferencia entre las funciones que terminan en "s" (de *string*) y las que no:

* `json.dump()` / `json.load()`: Operan directamente sobre **archivos** (objetos tipo archivo).
* `json.dumps()` / `json.loads()`: Operan sobre **cadenas de texto** en memoria.

```python
import json

datos_usuario = {
    "id": 1042,
    "username": "dev_ninja",
    "activo": True,
    "roles": ["admin", "editor"],
    "metadatos": None
}

# ESCRITURA: Guardar el diccionario en un archivo JSON
with open("usuario.json", "w", encoding="utf-8") as archivo:
    # indent=4 formatea el archivo para que sea legible por humanos
    json.dump(datos_usuario, archivo, indent=4)

# LECTURA: Cargar el archivo JSON de vuelta a un diccionario Python
with open("usuario.json", "r", encoding="utf-8") as archivo:
    datos_cargados = json.load(archivo)
    print(datos_cargados["roles"][0])  # Salida: admin
```

> **Nota de Senior:** Observa la conversión de tipos bajo el capó. El valor `True` de Python se convierte en `true` en JSON, y `None` se traduce como `null`. Al cargar el archivo de vuelta, Python restaura los tipos nativos correctamente.

### 2. CSV (Comma-Separated Values)

Cuando trabajas con datos tabulares (hojas de cálculo, exportaciones de bases de datos o data science básico), CSV es el estándar. Aunque podrías procesar un CSV separando líneas con el método `.split(',')`, **no lo hagas**. El formato CSV es engañosamente complejo (manejo de comillas, comas dentro de valores, saltos de línea internos).

El módulo integrado `csv` maneja todas estas singularidades. Aunque existe `csv.reader` y `csv.writer` basados en listas, la práctica recomendada y más robusta es utilizar **`DictReader`** y **`DictWriter`**. Esto permite acceder a las columnas por su nombre en lugar de por un índice numérico, haciendo el código inmune a cambios en el orden de las columnas.

```python
import csv

usuarios = [
    {"nombre": "Ana", "edad": 28, "ciudad": "Madrid"},
    {"nombre": "Carlos", "edad": 34, "ciudad": "Bogotá"}
]

campos = ["nombre", "edad", "ciudad"]

# ESCRITURA: Guardar lista de diccionarios en CSV
# newline='' es obligatorio en Windows para evitar saltos de línea dobles
with open("usuarios.csv", "w", encoding="utf-8", newline="") as archivo:
    escritor = csv.DictWriter(archivo, fieldnames=campos)
    
    escritor.writeheader() # Escribe la primera fila con los nombres de las columnas
    escritor.writerows(usuarios)

# LECTURA: Leer CSV como diccionarios
with open("usuarios.csv", "r", encoding="utf-8") as archivo:
    lector = csv.DictReader(archivo)
    for fila in lector:
        print(f"{fila['nombre']} vive en {fila['ciudad']}")
```

### 3. YAML (YAML Ain't Markup Language)

Si JSON es para las APIs y CSV para los datos tabulares, YAML es el rey de la **configuración**. Lo encontrarás en Docker Compose, Kubernetes, flujos de CI/CD (como GitHub Actions) y configuraciones de frameworks. Es más legible para humanos que JSON, soporta comentarios nativos y permite estructuras complejas con menos "ruido" visual (sin llaves ni comillas obligatorias).

A diferencia de JSON y CSV, **YAML no viene incluido en la biblioteca estándar de Python**. Necesitas instalar un paquete de terceros, recordando lo aprendido en el Capítulo 7 sobre gestión de dependencias:

```bash
pip install pyyaml
```

Una vez instalado, el uso es muy similar al de JSON. Sin embargo, hay una regla de oro en ciberseguridad al leer YAML.

> **Advertencia de Seguridad:** Nunca uses `yaml.load()` a menos que confíes plenamente en la fuente del archivo. YAML es tan poderoso que permite instanciar objetos de Python arbitrarios directamente desde el archivo de configuración, lo que puede llevar a la ejecución de código malicioso. Utiliza siempre **`yaml.safe_load()`**.

```python
import yaml

# LECTURA: Cargar un archivo de configuración YAML
with open("config.yaml", "r", encoding="utf-8") as archivo:
    # Usamos safe_load por seguridad
    configuracion = yaml.safe_load(archivo)
    
    puerto = configuracion.get("servidor", {}).get("puerto", 8080)
    print(f"Iniciando servidor en puerto {puerto}")

# ESCRITURA: Guardar un diccionario como YAML
ajustes = {
    "entorno": "produccion",
    "debug": False,
    "base_datos": ["localhost", 5432]
}

with open("ajustes_exportados.yaml", "w", encoding="utf-8") as archivo:
    # default_flow_style=False fuerza la estructura de bloques (más legible)
    yaml.dump(ajustes, archivo, default_flow_style=False)
```

### Resumen: ¿Cuál elegir?

La arquitectura de tu aplicación dictará el formato. Aquí tienes una matriz de decisión rápida:

```text
+---------+---------------------------------+----------------------------------------+
| Formato | Caso de Uso Principal           | Ventajas Clave                         |
+---------+---------------------------------+----------------------------------------+
| JSON    | APIs REST, comunicación web     | Soporte nativo universal, ligero       |
| CSV     | Datos tabulares, Data Science   | Extremadamente eficiente para tablas   |
| YAML    | Archivos de configuración       | Comentarios, máxima legibilidad humana |
+---------+---------------------------------+----------------------------------------+
```

Dominar estos tres formatos garantiza que tu aplicación Python pueda comunicarse sin fricciones con el 99% del ecosistema tecnológico moderno. En la siguiente sección, exploraremos `pickle`, una herramienta nativa de Python útil para guardar estados internos complejos, pero que viene con sus propias limitaciones y riesgos.

## 8.3 Serialización nativa con el módulo `pickle`

En la sección anterior aprendimos a comunicarnos con el mundo exterior utilizando JSON, CSV y YAML. Estos formatos son excelentes porque son universales (independientes del lenguaje). Sin embargo, tienen una limitación estricta: **solo pueden almacenar tipos de datos básicos** (cadenas, números, booleanos, listas y diccionarios).

¿Qué sucede si necesitamos guardar el estado exacto de un objeto complejo, como una instancia de una clase personalizada que creamos en el **Capítulo 5**, un *Set* o una tupla anidada? Al intentar pasar esto a JSON, Python lanzará un error porque no sabe cómo traducir una instancia de clase a texto estándar. Aquí es donde entra `pickle`.

### ¿Qué es `pickle`?

`pickle` es un módulo integrado en Python diseñado para la **serialización y deserialización binaria de objetos nativos**. 
* **Serializar (Pickling):** Convertir una jerarquía de objetos de Python en un flujo de bytes (byte stream).
* **Deserializar (Unpickling):** Tomar ese flujo de bytes y reconstruir la jerarquía de objetos original en memoria.

Como `pickle` trabaja a nivel de bytes, es obligatorio recordar lo aprendido en la sección 8.1 y utilizar los modos de apertura **`'wb'`** (escritura binaria) y **`'rb'`** (lectura binaria).

### Uso básico: Guardando el estado de la aplicación

Veamos un ejemplo donde guardamos y recuperamos una instancia de una clase personalizada.

```python
import pickle
from dataclasses import dataclass

# Usamos las dataclasses aprendidas en el Capítulo 5
@dataclass
class Personaje:
    nombre: str
    nivel: int
    inventario: set  # Nota: JSON no soporta 'sets' nativamente

# 1. Creamos el objeto en memoria
jugador = Personaje(nombre="DevNinja", nivel=42, inventario={"espada", "escudo", "poción"})

# 2. ESCRITURA: Serializamos el objeto y lo guardamos en un archivo binario
with open("partida_guardada.pkl", "wb") as archivo:
    pickle.dump(jugador, archivo)
    print("Partida guardada exitosamente.")

# --- Simulamos que reiniciamos el script ---

# 3. LECTURA: Restauramos el objeto desde el archivo binario
with open("partida_guardada.pkl", "rb") as archivo:
    jugador_cargado = pickle.load(archivo)
    
    print(f"Bienvenido de nuevo, {jugador_cargado.nombre}.")
    print(f"Tu inventario es: {jugador_cargado.inventario}")
    print(f"¿Es un objeto Personaje real? {isinstance(jugador_cargado, Personaje)}") 
    # Salida: True
```

**Importante:** Para que `pickle.load()` funcione con objetos personalizados, **la definición de la clase (`class Personaje`) debe existir en el entorno** donde se está leyendo el archivo. `pickle` guarda los datos y el *nombre* de la clase, pero no el código fuente de la clase en sí.

### Alternativas en memoria: `dumps` y `loads`

Al igual que el módulo `json`, `pickle` ofrece funciones para trabajar directamente en la memoria RAM sin tocar el disco duro. En lugar de generar cadenas de texto, `pickle.dumps()` genera objetos `bytes`.

```python
import pickle

datos = {"tupla_secreta": (1, 2, 3), "complejo": 4 + 3j}

# Convertir a bytes
bytes_serializados = pickle.dumps(datos)
print(bytes_serializados) # Salida ilegible para humanos: b'\x80\x04\x95...

# Restaurar desde bytes
datos_recuperados = pickle.loads(bytes_serializados)
```

### El Lado Oscuro: Riesgos y Cuándo NO usar `pickle`

Llegar a nivel "Senior" implica no solo saber cómo usar una herramienta, sino **cuándo evitarla**. `pickle` tiene dos grandes desventajas que limitan severamente su uso en producción:

#### 1. Incompatibilidad entre lenguajes y versiones
Un archivo `.pkl` solo puede ser leído por Python. Peor aún, si guardas un objeto con una versión muy nueva de Python, es posible que una versión más antigua no pueda leerlo. **Nunca uses `pickle` para almacenamiento de datos a largo plazo.**

#### 2. La vulnerabilidad de ejecución de código (RCE)
> **⚠️ Advertencia Crítica de Seguridad:** NUNCA, bajo ninguna circunstancia, deserialices (`pickle.load`) datos provenientes de una fuente no confiable (usuarios de internet, redes públicas, archivos descargados). 

El formato de `pickle` permite insertar instrucciones que Python ejecutará inmediatamente al deserializar el objeto. Un atacante puede crear un archivo `.pkl` modificado que, al ser leído por tu servidor, ejecute comandos en el sistema operativo (por ejemplo, borrar la base de datos o abrir una puerta trasera).

### Matriz de Decisión Final del Capítulo 8

Para cerrar nuestro aprendizaje sobre persistencia de datos, aquí tienes el resumen estratégico:

```text
+-------------------+---------------------------------------------------------+
| Herramienta       | Veredicto de Uso en Producción                          |
+-------------------+---------------------------------------------------------+
| JSON              | El estándar de oro. Úsalo para APIs y datos simples.    |
| CSV               | Úsalo para exportar/importar tablas e informes.         |
| YAML              | Ideal para archivos de configuración humanos.           |
| pickle            | Úsalo SÓLO para cachés internos temporales o para pasar |
|                   | estado entre procesos de Python en entornos 100% seguros|
+-------------------+---------------------------------------------------------+
```

Con la persistencia de datos dominada, tu código ya no es efímero. Tus aplicaciones ahora pueden recordar, configurar y compartir información. En la **Parte III: Python Avanzado**, daremos un salto evolutivo para entender cómo Python maneja la memoria y el flujo bajo el capó, comenzando con la iteración avanzada y los generadores.