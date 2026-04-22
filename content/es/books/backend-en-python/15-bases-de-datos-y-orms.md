## 15.1 Bases de datos relacionales y drivers asíncronos (`asyncpg`)

Hasta ahora, hemos visto cómo el *Event Loop* de Python (Capítulo 12) nos permite manejar miles de conexiones I/O sin bloquear el hilo principal. Sin embargo, en el desarrollo backend, la operación I/O por excelencia es la comunicación con la base de datos. 

Si construyes una API ultrarrápida pero utilizas un driver de base de datos síncrono clásico (como el tradicional `psycopg2` para PostgreSQL o `sqlite3`), cada vez que ejecutes una consulta, **bloquearás el Event Loop por completo**. Mientras esperas la respuesta de la base de datos, tu servidor no podrá atender a ningún otro usuario. Para resolver este cuello de botella, necesitamos **drivers asíncronos**.

En esta sección nos centraremos en **`asyncpg`**, el driver asíncrono nativo por excelencia para PostgreSQL en Python.

### ¿Por qué `asyncpg`?

A diferencia de otros drivers que actúan como envoltorios (wrappers) sobre bibliotecas en C (como `libpq`), `asyncpg` está escrito desde cero en Python y Cython, implementando el protocolo binario de PostgreSQL de forma directa. 

Esto le otorga ventajas clave:
* **Velocidad extrema:** Es consistentemente evaluado como uno de los drivers más rápidos del ecosistema, superando con creces a opciones síncronas tradicionales.
* **Soporte nativo para tipos de datos:** Mapea automáticamente tipos complejos de PostgreSQL (como JSONB, arrays o UUIDs) a estructuras de Python sin configuraciones adicionales.
* **Caché de sentencias preparadas:** Optimiza automáticamente las consultas recurrentes para evitar sobrecarga en la red.

### El flujo de ejecución: Síncrono vs. Asíncrono

Para visualizar la diferencia en el backend, observa cómo se comportan las conexiones:

```text
=============================================================================
Modelo Síncrono Tradicional (Cuello de botella)
-----------------------------------------------------------------------------
Petición Web A ---> [ Driver Síncrono ] --(Espera 100ms)--> PostgreSQL
Petición Web B ---> [ BLOQUEADO ]                             |
Petición Web C ---> [ BLOQUEADO ]                             v
                                                       Respuesta a Petición A
                                                       (Recién ahora B avanza)

=============================================================================
Modelo Asíncrono con asyncpg (No bloqueante)
-----------------------------------------------------------------------------
Petición Web A ---> [ asyncpg ] --(Avisa al Event Loop)--> PostgreSQL
Petición Web B ---> [ asyncpg ] --(Avisa al Event Loop)--> PostgreSQL
Petición Web C ---> [ asyncpg ] --(Avisa al Event Loop)--> PostgreSQL
                    [ El Event Loop sigue trabajando ]     (Las respuestas
                                                            llegan y se
                                                            procesan a medida
                                                            que están listas)
=============================================================================
```

### Operaciones Básicas: Conexión y Consultas

Para comenzar a utilizarlo, necesitas instalarlo en tu entorno (preferiblemente configurado según lo visto en el Capítulo 7):

```bash
pip install asyncpg
```

Veamos cómo establecer una conexión y ejecutar consultas básicas. Aprovecharemos el tipado estático (Capítulo 11) para mantener el código robusto.

```python
import asyncio
import asyncpg
from typing import Optional

async def main() -> None:
    # 1. Establecer la conexión
    conn = await asyncpg.connect(
        user='tu_usuario',
        password='tu_password',
        database='tu_base_de_datos',
        host='127.0.0.1'
    )
    
    try:
        # 2. Ejecutar comandos DDL o inserciones sin esperar retorno de datos (.execute)
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id serial PRIMARY KEY,
                nombre text,
                edad int
            )
        ''')
        
        # Insertar datos utilizando parámetros posicionales ($1, $2) para evitar SQL Injection
        await conn.execute(
            'INSERT INTO usuarios(nombre, edad) VALUES($1, $2)', 
            'Ana', 28
        )
        
        # 3. Obtener un único valor (.fetchval)
        conteo: Optional[int] = await conn.fetchval('SELECT count(*) FROM usuarios')
        print(f"Total de usuarios: {conteo}")
        
        # 4. Obtener un registro específico (.fetchrow)
        usuario = await conn.fetchrow('SELECT * FROM usuarios WHERE nombre = $1', 'Ana')
        if usuario:
            print(f"Usuario encontrado: {usuario['nombre']}, Edad: {usuario['edad']}")
            
        # 5. Obtener múltiples registros (.fetch)
        filas = await conn.fetch('SELECT * FROM usuarios')
        for fila in filas:
            print(dict(fila)) # Los registros (Record) de asyncpg se pueden convertir a diccionarios
            
    finally:
        # 6. Siempre debemos cerrar la conexión
        await conn.close()

# Ejecutar el event loop
if __name__ == '__main__':
    asyncio.run(main())
```

> **Nota sobre seguridad:** Observa el uso de `$1` y `$2`. En `asyncpg`, los parámetros posicionales utilizan esta sintaxis propia de PostgreSQL en lugar de los clásicos `%s` o `?`. **Nunca** concatentes *strings* para armar consultas SQL; utilizar parámetros delegará la sanitización al motor de la base de datos, previniendo inyecciones SQL (algo en lo que profundizaremos en el Capítulo 18).

### Pools de Conexiones: Arquitectura para Producción

En el ejemplo anterior, abrimos y cerramos la conexión por cada bloque de ejecución. En una aplicación real de alto tráfico, el *handshake* de red y la autenticación necesarios para abrir una conexión a PostgreSQL son operaciones muy costosas a nivel computacional.

Para resolver esto a nivel *Senior*, utilizamos un **Pool de Conexiones** (Connection Pool). Un pool mantiene un conjunto de conexiones abiertas en memoria. Cuando tu aplicación necesita hablar con la base de datos, "toma prestada" una conexión del pool, realiza la consulta y la devuelve, evitando el costo de inicialización.

`asyncpg` integra esta funcionalidad de manera nativa mediante gestores de contexto asíncronos (`async with`):

```python
import asyncio
import asyncpg

async def proceso_intensivo(pool: asyncpg.Pool, id_proceso: int) -> None:
    # Tomamos prestada una conexión del pool
    async with pool.acquire() as conn:
        valor = await conn.fetchval('SELECT $1::int', id_proceso)
        print(f"Proceso {id_proceso} completado con valor {valor}")

async def main() -> None:
    # Crear el pool (configurando min y max conexiones según la capacidad del servidor)
    pool = await asyncpg.create_pool(
        user='tu_usuario',
        password='tu_password',
        database='tu_base_de_datos',
        host='127.0.0.1',
        min_size=5,
        max_size=20
    )
    
    # Lanzamos 50 tareas concurrentes; el pool gestionará la distribución 
    # eficiente utilizando un máximo de 20 conexiones simultáneas.
    tareas = [proceso_intensivo(pool, i) for i in range(50)]
    await asyncio.gather(*tareas)
    
    # Cerrar el pool al apagar la aplicación
    await pool.close()

if __name__ == '__main__':
    asyncio.run(main())
```

### Transacciones Atómicas

Mantener la integridad de los datos es crítico. Si necesitas ejecutar múltiples operaciones y asegurar que todas se apliquen o ninguna lo haga (Atomicidad), debes usar transacciones.

En `asyncpg`, puedes utilizar el método `transaction()` combinado con un bloque `async with`. Si ocurre una excepción dentro del bloque, `asyncpg` ejecutará un `ROLLBACK` automáticamente. Si el bloque finaliza con éxito, ejecutará un `COMMIT`.

```python
async def transferir_fondos(pool: asyncpg.Pool, origen_id: int, destino_id: int, cantidad: float):
    async with pool.acquire() as conn:
        # Iniciar la transacción
        async with conn.transaction():
            # Operación 1: Descontar de la cuenta origen
            await conn.execute(
                'UPDATE cuentas SET balance = balance - $1 WHERE id = $2', 
                cantidad, origen_id
            )
            
            # Simulamos una validación que podría fallar
            if cantidad <= 0:
                raise ValueError("La cantidad a transferir debe ser positiva")
                
            # Operación 2: Acreditar en la cuenta destino
            await conn.execute(
                'UPDATE cuentas SET balance = balance + $1 WHERE id = $2', 
                cantidad, destino_id
            )
            
        # Si llegamos aquí, se hizo el COMMIT automáticamente.
        # Si el raise se ejecutó o hubo un error de SQL, se hizo ROLLBACK.
```

Comprender cómo interactúa Python nativamente de forma asíncrona con el motor de base de datos es fundamental. Sin embargo, en el día a día, escribir SQL crudo (*raw SQL*) puede volverse difícil de mantener en bases de código grandes. Por ello, estas herramientas suelen servir como motor subyacente para capas de abstracción superiores, como veremos más adelante en la sección 15.3 con SQLAlchemy 2.0 y su integración asíncrona.

## 15.2 Motores NoSQL: Cuándo usar MongoDB, Redis o Elasticsearch

En la sección anterior exploramos cómo interactuar de forma ultrarrápida con PostgreSQL. Las bases de datos relacionales son excelentes cuando tus datos tienen una estructura clara y requieres garantías ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad) estrictas. Sin embargo, a medida que un sistema escala, surgen problemas que el modelo relacional no resuelve de manera óptima: la necesidad de esquemas dinámicos, búsquedas de texto completo difusas o tiempos de respuesta por debajo del milisegundo.

Aquí es donde entran los motores **NoSQL** (Not Only SQL). Un desarrollador Senior entiende que NoSQL no es un reemplazo de SQL, sino un conjunto de herramientas especializadas. Analizaremos los tres exponentes más importantes en la industria y cómo integrarlos asíncronamente en Python.

### 1. MongoDB: El almacén de documentos (Document Store)

MongoDB guarda la información en formato BSON (una representación binaria de JSON). En lugar de filas y columnas, tienes "Colecciones" y "Documentos". 

**¿Cuándo usarlo?**
* **Esquemas dinámicos:** Cuando la estructura de los datos cambia constantemente o difiere entre registros (ej. catálogos de productos donde una "laptop" tiene atributos muy distintos a una "camiseta").
* **Prototipado rápido:** Al no requerir migraciones de esquema previas (como vimos con Alembic), acelera el desarrollo inicial.
* **Jerarquías anidadas:** Cuando prefieres guardar un objeto complejo y sus relaciones directas en un solo documento en lugar de hacer múltiples `JOINs` costosos.

**Integración en Python (`motor`):**
Para mantener nuestro servidor no bloqueante, no usaremos el driver síncrono estándar (`pymongo`), sino su contraparte asíncrona oficial: **Motor**. Dado que los documentos de Mongo se mapean perfectamente a diccionarios en Python, su uso es muy natural.

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any

async def gestionar_catalogo():
    # Conexión al cluster
    cliente = AsyncIOMotorClient('mongodb://localhost:27017')
    db = cliente['tienda_db']
    coleccion = db['productos']

    # Insertar un documento con estructura libre (sin esquema previo)
    producto: Dict[str, Any] = {
        "nombre": "Laptop Pro",
        "precio": 1200.50,
        "especificaciones": {"ram": "16GB", "almacenamiento": "1TB SSD"},
        "tags": ["tecnología", "computación", "oferta"]
    }
    
    await coleccion.insert_one(producto)

    # Búsqueda asíncrona de documentos que contengan un tag específico
    cursor = coleccion.find({"tags": "tecnología"})
    async for doc in cursor:
        print(f"Encontrado: {doc['nombre']} a ${doc['precio']}")

if __name__ == '__main__':
    asyncio.run(gestionar_catalogo())
```

### 2. Redis: Almacenamiento Clave-Valor en Memoria

Redis (Remote Dictionary Server) es una base de datos que vive enteramente en la memoria RAM. Esto la hace ridículamente rápida, pero limita la cantidad de datos que puedes guardar. En una arquitectura Senior, Redis rara vez es la base de datos principal; actúa como una capa de apoyo vital.

**¿Cuándo usarlo?**
* **Caché (Caching):** Guardar el resultado de una consulta SQL pesada o de una llamada a una API externa durante unos minutos para aliviar la carga del servidor principal.
* **Manejo de Sesiones y Tokens:** Ideal para almacenar tokens JWT revocados o sesiones de usuario de forma centralizada pero veloz.
* **Rate Limiting:** Controlar cuántas peticiones por segundo puede hacer un usuario a nuestra API.
* **Colas de tareas simples y Pub/Sub:** Para comunicación entre microservicios (lo veremos más a fondo en el Capítulo 19).

**Integración en Python (`redis.asyncio`):**
El paquete oficial `redis` ya incluye soporte nativo para `asyncio`.

```python
import asyncio
import redis.asyncio as redis

async def sistema_cache():
    # Conexión asíncrona a Redis
    cliente_redis = await redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Simulamos cachear un valor costoso con un tiempo de vida (TTL) de 10 segundos
    llave = "usuario:105:perfil"
    
    # Intentamos obtener el dato
    perfil_cacheado = await cliente_redis.get(llave)
    
    if perfil_cacheado:
        print(f"Dato obtenido de Redis: {perfil_cacheado}")
    else:
        print("Dato no encontrado en caché. Calculando/Consultando DB SQL...")
        # Simulamos I/O pesado
        await asyncio.sleep(1) 
        perfil_db = '{"nombre": "Carlos", "rol": "Admin"}'
        
        # Guardamos en Redis (setex = set with expiration)
        await cliente_redis.setex(llave, 10, perfil_db)
        print("Dato guardado en Redis para futuras peticiones.")

    await cliente_redis.aclose()

if __name__ == '__main__':
    asyncio.run(sistema_cache())
```

### 3. Elasticsearch: El Motor de Búsqueda y Analítica

Si alguna vez has intentado hacer una búsqueda de texto en PostgreSQL usando `SELECT * FROM tabla WHERE texto LIKE '%palabra%'`, sabrás que cuando la tabla tiene millones de registros, el rendimiento colapsa. Las bases de datos tradicionales no están optimizadas para buscar palabras sueltas dentro de grandes bloques de texto, ni contemplan errores tipográficos (fuzzy matching).

Elasticsearch está construido sobre Apache Lucene y utiliza una estructura llamada **índice invertido** (similar al índice alfabético al final de un libro impreso).

**¿Cuándo usarlo?**
* **Búsquedas Full-Text:** Barras de búsqueda en e-commerce, foros o blogs que necesitan autocompletado, tolerancia a errores ortográficos y relevancia por puntuación (scoring).
* **Observabilidad y Logs:** Es la "E" del famoso stack ELK (Elasticsearch, Logstash, Kibana). Excelente para ingerir, buscar y analizar millones de líneas de logs generados por tu backend.
* **Geolocalización compleja:** Búsquedas eficientes del tipo "restaurantes a menos de 5km de esta coordenada que tengan la palabra 'vegan'".

**Integración en Python (`elasticsearch`):**
Al igual que las anteriores, utilizaremos la clase asíncrona oficial.

```python
import asyncio
from elasticsearch import AsyncElasticsearch

async def buscador_inteligente():
    # Conexión al motor de búsqueda
    es = AsyncElasticsearch("http://localhost:9200")

    # Indexar (guardar) un documento preparándolo para búsqueda
    doc = {
        "titulo": "Aprende Python Asíncrono",
        "contenido": "La concurrencia es clave para APIs rápidas con FastAPI y asyncpg."
    }
    await es.index(index="articulos", id=1, document=doc)

    # Realizar una búsqueda difusa (fuzzy match)
    # Encontrará el documento aunque busquemos "concurrensia" (con error ortográfico)
    consulta = {
        "match": {
            "contenido": {
                "query": "concurrensia",
                "fuzziness": "AUTO"
            }
        }
    }
    
    respuesta = await es.search(index="articulos", query=consulta)
    
    print(f"Resultados encontrados: {respuesta['hits']['total']['value']}")
    for hit in respuesta['hits']['hits']:
        print(f"Score: {hit['_score']} - Título: {hit['_source']['titulo']}")

    await es.close()

if __name__ == '__main__':
    asyncio.run(buscador_inteligente())
```

### Resumen: Matriz de Decisión Arquitectónica

Como ingeniero de software, rara vez elegirás una sola base de datos. Una arquitectura de microservicios robusta suele combinar varias tecnologías, un patrón conocido como **Persistencia Políglota** (Polyglot Persistence). Aquí tienes una matriz rápida para guiar tu decisión:

```text
+-------------------+----------------------------+-------------------------------------+
| Necesidad         | Herramienta Recomendada    | Razón Principal                     |
+-------------------+----------------------------+-------------------------------------+
| Datos financieros | PostgreSQL / Relacional    | Transacciones ACID, integridad      |
| Catálogo dinámico | MongoDB                    | Flexibilidad BSON, sin migraciones  |
| Caché o Sesiones  | Redis                      | Acceso en memoria (sub-milisegundo) |
| Búsqueda de texto | Elasticsearch              | Índices invertidos, Fuzzy matching  |
| Analítica/Logs    | Elasticsearch              | Ingesta masiva y agregaciones       |
+-------------------+----------------------------+-------------------------------------+
```

La clave del rendimiento no es solo optimizar tu código Python o usar `async/await`, sino delegar el trabajo a la herramienta de persistencia diseñada específicamente para resolver el problema que tienes entre manos.

## 15.3 Mapeo Objeto-Relacional (ORMs): SQLAlchemy (Core y ORM) y Django ORM

En la sección 15.1 aprendimos a interactuar directamente con la base de datos utilizando SQL puro y `asyncpg`. Aunque esto ofrece un rendimiento inigualable, escribir y mantener cientos de consultas SQL en formato *string* (cadenas de texto) dentro del código Python se vuelve insostenible a medida que el proyecto crece. 

Además, existe un problema fundamental en la ingeniería de software conocido como la **Impedancia Objeto-Relacional (Object-Relational Impedance Mismatch)**: las bases de datos relacionales agrupan datos en tablas y filas (basadas en matemáticas de conjuntos), mientras que Python maneja la información mediante objetos, atributos y grafos de referencias cruzadas. 

Para tender un puente entre estos dos mundos, utilizamos un **ORM (Object-Relational Mapper)**.

```text
=============================================================================
Arquitectura de un ORM
-----------------------------------------------------------------------------
[ Dominio de Python ]           [ Capa ORM ]            [ Dominio de BD ]

 class Usuario:    -------->   Traducción SQL   -------->  TABLA 'usuarios'
   nombre = "Ana"  <--------   Mapeo de Filas   <--------  FILA (id=1, "Ana")

(Orientado a Objetos)        (El intermediario)         (Modelo Relacional)
=============================================================================
```

En el ecosistema de Python, dos gigantes dominan el paisaje de los ORMs, pero cada uno implementa un patrón de diseño arquitectónico completamente distinto: **Django ORM** (Active Record) y **SQLAlchemy** (Data Mapper).

### 1. Django ORM: El Patrón "Active Record"

El ORM de Django es la definición de "baterías incluidas". Implementa el patrón *Active Record*, donde **la clase representa la tabla, y la instancia de la clase representa la fila**. En este patrón, el objeto mismo sabe cómo guardarse en la base de datos.

**Ventajas:**
* **Desarrollo ultrarrápido:** Su API intuitiva permite construir CRUDs (Create, Read, Update, Delete) en minutos.
* **Ergonomía:** Oculta casi por completo el SQL subyacente.
* **Integración:** Está profundamente acoplado al framework Django (Capítulo 16), facilitando la creación de formularios y paneles de administración de forma automática.

**Desventajas:**
* **Acoplamiento fuerte:** Es muy difícil extraer el ORM de Django para usarlo en un script independiente o en otro framework como FastAPI.
* **Problemas de rendimiento ocultos:** Su facilidad de uso a menudo lleva a realizar consultas ineficientes (como el famoso problema "N+1" de consultas) si el desarrollador no conoce cómo funciona por debajo.

**Ejemplo representativo (Django ORM):**
```python
from django.db import models

# 1. Definición del modelo (La Clase es la Tabla)
class Empleado(models.Model):
    nombre = models.CharField(max_length=100)
    departamento = models.CharField(max_length=50)

# 2. Uso (La Instancia es la Fila)
# Crear y guardar un registro es un método del propio objeto
nuevo_empleado = Empleado(nombre="Ana", departamento="Ingeniería")
nuevo_empleado.save()  # <--- Active Record: El objeto se guarda a sí mismo

# 3. Consultas (A través del 'Manager' objects)
ingenieros = Empleado.objects.filter(departamento="Ingeniería")
```

### 2. SQLAlchemy: El Patrón "Data Mapper" y la API Core

SQLAlchemy es la herramienta de persistencia más poderosa y flexible del ecosistema Python. A diferencia de Django, implementa el patrón *Data Mapper*. Aquí, **el modelo de objetos y el esquema de la base de datos están separados**. Un objeto no sabe cómo guardarse a sí mismo; delegamos esa tarea a una "Sesión" que actúa como gestora de la persistencia.

SQLAlchemy se divide en dos capas distintas que puedes usar juntas o por separado:

#### A. SQLAlchemy Core (SQL Expression Language)
Es una abstracción directa sobre SQL. Te permite escribir consultas SQL utilizando código Python. Es extremadamente rápido y predecible. Es la base sobre la que se construye el ORM.

#### B. SQLAlchemy ORM
La capa de abstracción orientada a objetos. En su versión 2.0 (la cual usaremos), SQLAlchemy abrazó fuertemente el **tipado estático** (Capítulo 11) y la **asincronía nativa** (Capítulo 12).

**Ejemplo moderno (SQLAlchemy 2.0 Asíncrono):**
Para este ejemplo, combinaremos SQLAlchemy con el driver `asyncpg` que vimos en la sección 15.1, logrando lo mejor de ambos mundos: tipado estricto, abstracción orientada a objetos y concurrencia de alto rendimiento.

```python
import asyncio
from typing import Optional
from sqlalchemy import String, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# 1. Base declarativa
class Base(DeclarativeBase):
    pass

# 2. Definición del Modelo (Aprovechando Type Hints modernos)
class Usuario(Base):
    __tablename__ = "usuarios"

    # Mapped[] le indica a Mypy el tipo exacto, mapped_column() configura la BD
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50))
    # Optional[] indica que puede ser NULL en la base de datos
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True)

    def __repr__(self):
        return f"<Usuario(id={self.id}, nombre='{self.nombre}')>"

# 3. Configuración del Motor Asíncrono (Notar el prefijo postgresql+asyncpg)
engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/tu_bd", echo=False)

# 4. Fábrica de sesiones asíncronas
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def operaciones_bd():
    # Usar el Context Manager asíncrono para gestionar la conexión de forma segura
    async with AsyncSessionLocal() as session:
        
        # A. Crear (Data Mapper: La sesión maneja el objeto, el objeto no se guarda solo)
        nuevo_user = Usuario(nombre="Carlos", email="carlos@empresa.com")
        session.add(nuevo_user)
        await session.commit() # Impactamos la base de datos
        
        # B. Leer (Utilizando la nueva sintaxis select() estilo Core)
        stmt = select(Usuario).where(Usuario.nombre == "Carlos")
        resultado = await session.execute(stmt)
        
        # .scalar_one_or_none() extrae el objeto Usuario del resultado de la fila
        usuario_db = resultado.scalar_one_or_none()
        
        if usuario_db:
            print(f"Encontrado: {usuario_db.nombre} con email {usuario_db.email}")

if __name__ == "__main__":
    asyncio.run(operaciones_bd())
```

> **El poder de SQLAlchemy 2.0:** Observa cómo `stmt = select(Usuario).where(Usuario.nombre == "Carlos")` se evalúa perezosamente (Capítulo 9). La consulta no toca la base de datos hasta que se la pasamos a `await session.execute(stmt)`. Esto permite componer y reutilizar filtros dinámicos antes de golpear el motor SQL.

### Resumen: ¿Cuál elegir?

A nivel de arquitectura (Capítulo 19), la elección del ORM dictará gran parte del diseño de tu aplicación.

| Característica | Django ORM | SQLAlchemy 2.0 |
| :--- | :--- | :--- |
| **Patrón de Diseño** | Active Record | Data Mapper / Core |
| **Curva de Aprendizaje**| Suave (Ideal para empezar) | Pronunciada (Requiere entender sus capas) |
| **Asincronía** | Soporte parcial (en evolución) | Soporte de primera clase (Nativo y maduro) |
| **Tipado Estricto** | Difícil (Requiere plugins como `django-stubs`) | Excelente (Soporte nativo con Mypy y `Mapped`) |
| **Uso Principal** | Proyectos monolíticos en Django | Microservicios, FastAPI, arquitecturas limpias |

En el desarrollo de backend moderno en Python, la dupla ganadora para APIs de alto rendimiento suele ser **FastAPI + SQLAlchemy 2.0 + asyncpg**. Sin embargo, si estás desarrollando un producto de negocio complejo donde el tiempo de salida al mercado (Time to Market) es crítico, el ecosistema integrado de **Django ORM** sigue siendo una herramienta formidable.

Cualquiera sea tu elección, una vez definidos los modelos en código, surge otro desafío: ¿Cómo trasladamos la creación de estas tablas a la base de datos sin hacerlo a mano? Eso nos lleva al siguiente tema: la gestión de esquemas y migraciones con herramientas como Alembic (sección 15.4).

## 15.4 Gestión de esquemas y migraciones con Alembic

En la sección 15.3 aprendimos a definir nuestra base de datos utilizando modelos de SQLAlchemy. En un entorno de desarrollo temprano o en tutoriales básicos, es común ver que las tablas se crean usando un comando como `Base.metadata.create_all()`. Sin embargo, un desarrollador Senior sabe que **esto es inaceptable en producción**. 

Las bases de datos no son estáticas. A medida que tu aplicación evoluciona, necesitarás agregar nuevas columnas, cambiar tipos de datos o eliminar tablas. Si usas `create_all()`, SQLAlchemy no sabrá cómo alterar tablas existentes sin borrar tus datos. Aquí es donde entran las **migraciones de base de datos**.

Las migraciones son un sistema de control de versiones (como Git) pero para el esquema de tu base de datos. En el ecosistema de SQLAlchemy, la herramienta estándar de facto para esto es **Alembic**.

### El Flujo de Trabajo con Alembic

Alembic inspecciona tus modelos de SQLAlchemy en código, los compara con el estado actual de tu base de datos, y genera un *script* (la migración) con las instrucciones SQL necesarias para llevar la base de datos al nuevo estado.

```text
=============================================================================
Arquitectura de Migraciones
-----------------------------------------------------------------------------
1. Modificas código:    class Usuario(Base): 
                            # Nueva columna
                            edad: Mapped[int] = mapped_column(Integer)

2. Alembic compara:     [ Modelos Python ]  vs  [ Esquema PostgreSQL ]
                        (Detecta que falta la columna 'edad')

3. Alembic genera:      Un archivo de migración con:
                        - upgrade(): ALTER TABLE usuarios ADD COLUMN edad INT;
                        - downgrade(): ALTER TABLE usuarios DROP COLUMN edad;

4. Aplicas migración:   Alembic ejecuta upgrade() en la BD de producción.
=============================================================================
```

### Configuración de Alembic en un Entorno Asíncrono

Dado que en este libro estamos construyendo un backend moderno utilizando `asyncpg` (Sección 15.1), debemos configurar Alembic para que soporte operaciones asíncronas.

**1. Inicializar el entorno**
En lugar del comando de inicialización clásico, utilizaremos el *template* asíncrono desde la raíz de nuestro proyecto:

```bash
pip install alembic
alembic init -t async migraciones
```

Esto creará una carpeta llamada `migraciones/` (que contiene la lógica de Alembic) y un archivo `alembic.ini` (donde configuramos la URL de conexión).

**2. Conectar Alembic a nuestros Modelos (`env.py`)**
El archivo más importante que se generó es `migraciones/env.py`. Este script es el que Alembic ejecuta cada vez que corre. Debemos editarlo para decirle a Alembic dónde están nuestros modelos y cómo conectarse a la base de datos.

Abre `migraciones/env.py` y busca la sección `target_metadata`. Debes importar tu base declarativa (la clase `Base` que creamos en la sección 15.3):

```python
# Dentro de migraciones/env.py

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# 1. IMPORTANTE: Importa tus modelos para que Alembic los pueda leer
from mi_proyecto.database import Base # Ajusta este import a la ruta real de tu proyecto
import mi_proyecto.models # Asegúrate de que los modelos estén cargados en memoria

# 2. Asigna la metadata de tus modelos a target_metadata
target_metadata = Base.metadata

# ... el resto de la configuración de env.py (run_migrations_offline, etc.) se mantiene ...
```

*Nota: Asegúrate de que la URL de tu base de datos en `alembic.ini` utilice el driver asíncrono: `sqlalchemy.url = postgresql+asyncpg://usuario:password@localhost/tu_bd`*

### Ciclo de Vida de una Migración

Una vez configurado, el flujo de trabajo diario consta de dos pasos fundamentales: crear la migración y aplicarla.

#### Paso 1: Generar la revisión (Autogenerate)

Supongamos que has creado el modelo `Usuario` por primera vez. Ejecutas el siguiente comando en tu terminal:

```bash
alembic revision --autogenerate -m "crear_tabla_usuarios"
```

Alembic detectará que la tabla `usuarios` existe en tus modelos pero no en la base de datos, y creará un nuevo archivo en la carpeta `migraciones/versions/` (por ejemplo: `1a2b3c4d5e6f_crear_tabla_usuarios.py`).

**Regla de Oro Senior:** *Nunca confíes ciegamente en el `--autogenerate`.* Siempre debes abrir el archivo generado y leerlo. Alembic es excelente detectando nuevas tablas y columnas, pero puede confundirse con cambios de nombre de columnas o tipos de datos complejos.

El archivo generado se verá así:

```python
"""crear_tabla_usuarios

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2023-10-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# Identificadores de revisión
revision = '1a2b3c4d5e6f'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Alembic detectó la necesidad de crear la tabla
    op.create_table('usuarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

def downgrade() -> None:
    # La operación inversa en caso de que necesitemos deshacer la migración
    op.drop_table('usuarios')
```

#### Paso 2: Aplicar la migración (Upgrade)

Una vez revisado el script, lo aplicamos a nuestra base de datos con:

```bash
alembic upgrade head
```

El término `head` le dice a Alembic que aplique todas las migraciones pendientes hasta llegar a la última versión disponible. Si alguna vez introduces un *bug* crítico en producción relacionado con la base de datos, puedes usar `alembic downgrade -1` para revertir la última migración (ejecutando la función `downgrade()` de tu script).

### Mejores Prácticas en Equipos (Nivel Senior)

Cuando trabajas solo, las migraciones son lineales. Cuando trabajas en un equipo de 10 desarrolladores, ocurren los **conflictos de ramas (Branch Conflicts)**.

Si el Desarrollador A y el Desarrollador B crean una migración en sus respectivas ramas de Git al mismo tiempo, ambas migraciones tendrán el mismo `down_revision` (el mismo punto de partida). Cuando ambas ramas se fusionan (*merge*) a la rama principal (main), Alembic lanzará un error porque hay "múltiples cabezas" (multiple heads).

Para resolver esto como un profesional:
1. Siempre haz `git pull` y actualiza tu rama antes de generar una migración.
2. Si ocurre el conflicto, Alembic provee un comando para reconciliarlas: `alembic merge heads -m "merge_migraciones"`.
3. En entornos de CI/CD (que veremos a fondo en el Capítulo 20), el pipeline debe ejecutar `alembic upgrade head` automáticamente antes de desplegar el nuevo código, garantizando que la base de datos esté siempre sincronizada con la versión del backend que está corriendo.

Con este conocimiento, ya no solo sabes cómo comunicarte asíncronamente con una base de datos, sino cómo evolucionar su estructura de manera segura, predecible y lista para producción.