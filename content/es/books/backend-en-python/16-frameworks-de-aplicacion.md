## 16.1 Django: El patrón MVT, el panel de administración y Django REST Framework

Si en el mundo de Python existe un peso pesado para el desarrollo web, ese es Django. Su filosofía fundamental es *"Batteries Included"* (baterías incluidas), lo que significa que el framework te proporciona de fábrica casi todo lo que necesitas para lanzar una aplicación a producción: enrutamiento, autenticación, un ORM potente (que exploramos en el capítulo 15), mitigación de vulnerabilidades y un panel de administración listo para usar. 

A diferencia de los microframeworks que veremos más adelante, Django toma decisiones arquitectónicas por ti. Esto reduce la fatiga de decisión y estandariza el código, permitiendo que un desarrollador Senior pueda entender rápidamente el proyecto de otro equipo.

### El Patrón MVT (Model-View-Template)

Históricamente, el desarrollo web ha estado dominado por el patrón MVC (Modelo-Vista-Controlador). Django utiliza una ligera variación semántica de este patrón llamada **MVT (Model-View-Template)**.

La diferencia radica en cómo Django delega las responsabilidades. En Django, el framework en sí mismo actúa como el "Controlador" (gestionando el enrutamiento y la petición HTTP subyacente), dejándonos las siguientes tres capas:

* **Model (Modelo):** La capa de acceso a datos. Como vimos en el capítulo 15, aquí definimos nuestras clases que heredan de `models.Model` y el ORM se encarga de traducirlas a tablas SQL.
* **View (Vista):** La lógica de negocio. Es el equivalente al Controlador en MVC. La vista recibe la petición web (`HttpRequest`), consulta los modelos necesarios, aplica la lógica y devuelve una respuesta (`HttpResponse`).
* **Template (Plantilla):** La capa de presentación. Es el equivalente a la Vista en MVC. Es un archivo HTML inyectado con el lenguaje de plantillas de Django (DTL) que permite renderizar datos dinámicos.

#### Flujo de una petición en Django

Para visualizar cómo interactúan estas piezas, analicemos el ciclo de vida de una petición HTTP:

```text
[Cliente] (Navegador/App)
   |
   | 1. Petición HTTP
   v
[urls.py] (URL Dispatcher) ---> Compara la URL solicitada con los patrones definidos.
   |
   | 2. Enruta a la Vista correcta
   v
[views.py] (Vista) 
   |   \
   |    \ 3. Consulta/Actualiza datos
   |     v
   |   [models.py] (Modelo) <---> [Base de Datos]
   |
   | 4. Pasa los datos al Template
   v
[plantilla.html] (Template) ---> Genera el HTML final.
   |
   | 5. Respuesta HTTP (HTML/JSON)
   v
[Cliente]
```

### El Panel de Administración: El "Killer Feature" de Django

Si hay una característica que ha cimentado la popularidad de Django a lo largo de los años, es su panel de administración autogenerado. Django inspecciona los metadatos de tus modelos (definidos en `models.py`) y construye dinámicamente una interfaz web completa para realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar).

Esto es invaluable al inicio de un proyecto, ya que permite a los equipos de operaciones o a los clientes gestionar el contenido sin que tengas que escribir una sola línea de código frontend o de lógica de panel de control.

Para exponer un modelo en el administrador, simplemente lo registramos en el archivo `admin.py` de nuestra aplicación. Django nos permite personalizar esta interfaz fácilmente mediante clases `ModelAdmin`:

```python
# admin.py
from django.contrib import admin
from .models import Articulo

@admin.register(Articulo)
class ArticuloAdmin(admin.ModelAdmin):
    # Campos que se mostrarán en la lista principal
    list_display = ('titulo', 'autor', 'fecha_publicacion', 'esta_publicado')
    
    # Agrega un panel de filtros lateral
    list_filter = ('esta_publicado', 'fecha_publicacion')
    
    # Permite buscar por texto en campos específicos
    search_fields = ('titulo', 'contenido')
```

Con estas simples líneas, Django genera una interfaz profesional, segura (integrada con el sistema de autenticación y permisos de Django) y lista para producción.

### Django REST Framework (DRF)

El patrón MVT tradicional de Django está optimizado para devolver HTML renderizado en el servidor. Sin embargo, como discutimos en el Capítulo 14, la arquitectura web moderna suele separar completamente el backend del frontend, comunicándolos a través de APIs RESTful.

Aquí es donde entra **Django REST Framework (DRF)**. DRF es una biblioteca externa, pero es el estándar de facto para construir APIs web con Django. Su objetivo es tomar la arquitectura existente de Django (Modelos y Vistas) y adaptarla para recibir y devolver JSON.

DRF introduce tres conceptos clave que se acoplan perfectamente al ecosistema Django:

#### 1. Serializers (Serializadores)
Los serializadores actúan como traductores. Toman instancias complejas, como los *QuerySets* del ORM de Django, y las convierten en tipos de datos nativos de Python que luego pueden ser fácilmente renderizados a JSON. También hacen el proceso inverso, validando los datos JSON entrantes para crear o actualizar instancias del modelo.

```python
# serializers.py
from rest_framework import serializers
from .models import Articulo

class ArticuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Articulo
        # "__all__" expone todos los campos, o puedes definir una tupla: ('id', 'titulo')
        fields = '__all__' 
```

#### 2. Views y ViewSets
Mientras que Django tiene vistas genéricas para HTML, DRF provee vistas genéricas para APIs. Los **ViewSets** llevan esto un paso más allá combinando la lógica de múltiples acciones (lista, creación, obtención, actualización, eliminación) en una sola clase, eliminando código repetitivo.

```python
# views.py
from rest_framework import viewsets
from .models import Articulo
from .serializers import ArticuloSerializer

class ArticuloViewSet(viewsets.ModelViewSet):
    """
    Este ViewSet proporciona automáticamente acciones 'list', 'create', 
    'retrieve', 'update' y 'destroy'.
    """
    queryset = Articulo.objects.all()
    serializer_class = ArticuloSerializer
```

#### 3. Routers
Dado que un `ViewSet` ya sabe qué acciones puede realizar (GET para listar, POST para crear, etc.), DRF proporciona **Routers** que generan las URLs de la API automáticamente, asegurando que sigan las convenciones RESTful sin que tengas que definirlas manualmente una por una.

```python
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticuloViewSet

# Creamos el router y registramos nuestro ViewSet
router = DefaultRouter()
router.register(r'articulos', ArticuloViewSet)

# Las URLs de la API ahora son generadas automáticamente
urlpatterns = [
    path('api/v1/', include(router.urls)),
]
```

**Resumen del flujo con DRF:**
Con esta configuración, al hacer una petición `GET` a `/api/v1/articulos/`, el `Router` dirige la petición al `ArticuloViewSet`. El ViewSet extrae los datos usando el ORM (`queryset = Articulo.objects.all()`), se los pasa al `ArticuloSerializer` para convertirlos en una lista de diccionarios Python, y finalmente los retorna al cliente como un bloque JSON estandarizado, con los códigos de estado HTTP correctos (vistos en el capítulo 14). Todo esto en menos de 20 líneas de código.

## 16.2 FastAPI: Tipado estricto con Pydantic, inyección de dependencias y asincronía

Si Django es una caja de herramientas completa que incluye todo lo necesario para construir una casa, FastAPI es como un torno CNC de alta precisión: minimalista, moderno y extremadamente rápido. Creado por Sebastián Ramírez, este microframework ha revolucionado el desarrollo de APIs en Python al adoptar nativamente las características más modernas del lenguaje.

Mientras que en Django (como vimos en la sección anterior) el framework toma muchas decisiones arquitectónicas por ti, FastAPI te da libertad total. Su diseño se basa en tres pilares fundamentales que cambian por completo la experiencia de desarrollo: el tipado estricto para la validación, la ejecución asíncrona de alto rendimiento y un elegante sistema de inyección de dependencias.

### 1. Tipado estricto con Pydantic y Autodocumentación

Recordarás del Capítulo 11 cómo los *Type Hints* (pistas de tipado) mejoran la legibilidad del código y permiten el análisis estático con herramientas como `mypy`. FastAPI lleva esto un paso más allá convirtiendo estos tipos estáticos en **validación de datos en tiempo de ejecución**.

El motor detrás de esta magia es **Pydantic**. En lugar de escribir lógica manual para verificar si un dato en un JSON entrante es un entero o si una cadena tiene el formato de un correo electrónico, simplemente defines un modelo de Pydantic. FastAPI intercepta la petición HTTP, lee el JSON y lo pasa por el modelo. Si los datos no coinciden con los tipos definidos, FastAPI devuelve automáticamente un error HTTP 422 (Unprocessable Entity) con un detalle exacto de lo que falló.

Como efecto secundario brillante de esta validación basada en esquemas, FastAPI genera automáticamente la documentación interactiva de tu API (usando Swagger UI y ReDoc) basada en el estándar OpenAPI.

### 2. Asincronía Nativa (ASGI)

FastAPI está construido sobre **Starlette**, un microframework web ASGI (Asynchronous Server Gateway Interface, que contrastaremos con WSGI en el Capítulo 20). Esto significa que soporta de forma nativa `async` y `await` (conceptos que dominamos en el Capítulo 12). 

En el desarrollo web moderno, la mayoría de los cuellos de botella no están en el procesamiento de la CPU, sino en la espera de operaciones I/O (lectura de bases de datos, llamadas a APIs externas). Al declarar los *endpoints* con `async def`, FastAPI puede manejar miles de conexiones simultáneas en un solo hilo de ejecución, liberando el *Event Loop* mientras espera la respuesta de la base de datos (por ejemplo, al usar un driver asíncrono como `asyncpg`, visto en la sección 15.1).

### 3. Inyección de Dependencias

La inyección de dependencias (DI) es un patrón de diseño donde un componente no crea sus propias dependencias, sino que las recibe de una fuente externa. FastAPI tiene un sistema de DI incorporado, intuitivo y poderoso, utilizando la función `Depends()`.

En lugar de que cada *endpoint* tenga que instanciar una conexión a la base de datos, extraer un token de los *headers* o validar la paginación, creas una función (la dependencia) que hace ese trabajo. Luego, simplemente la declaras como un parámetro en tu ruta. FastAPI se encarga de ejecutar la dependencia, resolverla y pasar el resultado a tu función.

#### El flujo arquitectónico de FastAPI

Podemos visualizar cómo interactúan estos tres pilares en el ciclo de vida de una petición:

```text
[Cliente HTTP] ---> Envía JSON y Headers
      |
      v
[Router de FastAPI] ---> Identifica la ruta solicitada
      |
      +--> 1. [Inyección de Dependencias] 
      |       (Ej: ¿El token es válido? ¿Me das la sesión de la BD?)
      |
      +--> 2. [Pydantic: Validación de Entrada] 
      |       (Ej: ¿El payload coincide con el modelo 'UsuarioCreate'?)
      |
      v
[Endpoint (async def)] ---> Ejecuta la lógica de negocio usando 'await'
      |                     para no bloquear el hilo principal.
      v
      +--> 3. [Pydantic: Serialización de Salida] 
      |       (Ej: Convierte el modelo de la BD al modelo 'UsuarioResponse')
      |
[Respuesta JSON] <--- Retorna al cliente
```

#### Ejemplo integrador

Veamos cómo se traduce todo esto a código real. En este ejemplo, combinaremos Pydantic, asincronía y dependencias en un solo archivo:

```python
from fastapi import FastAPI, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import asyncio

app = FastAPI(title="API de Usuarios")

# --- 1. Modelos Pydantic ---
class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=50)
    email: str
    edad: int = Field(..., gt=0, description="La edad debe ser mayor a 0")

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    # Omitimos la edad en la respuesta por diseño

# --- 2. Inyección de Dependencias ---
async def obtener_conexion_db():
    """
    Simula una conexión a base de datos asíncrona.
    En la vida real, aquí usarías sessionmaker de SQLAlchemy o asyncpg.
    """
    print("Abriendo conexión a BD...")
    await asyncio.sleep(0.1) # Simulamos latencia I/O
    try:
        yield "db_session_fake"
    finally:
        print("Cerrando conexión a BD...")

def paginacion(limit: int = Query(10, le=100), offset: int = 0):
    """Dependencia simple para estandarizar la paginación."""
    return {"limit": limit, "offset": offset}

# --- 3. Endpoints Asíncronos ---
@app.post("/usuarios/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(
    usuario: UsuarioCreate, 
    db=Depends(obtener_conexion_db)
):
    """
    El cuerpo de la petición es validado automáticamente contra UsuarioCreate.
    Si falta un campo o el tipo es incorrecto, no se ejecuta esta función.
    """
    # Simulamos el guardado en base de datos
    await asyncio.sleep(0.2) 
    
    # Retornamos un diccionario (o un modelo ORM), FastAPI y Pydantic 
    # lo filtrarán y validarán contra 'UsuarioResponse'
    return {
        "id": 101,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "edad": usuario.edad, # Este campo será ignorado en la salida final
        "secreto_interno": "xyz" # También será ignorado
    }

@app.get("/usuarios/", response_model=list[UsuarioResponse])
async def listar_usuarios(
    paginacion_params: dict = Depends(paginacion),
    db=Depends(obtener_conexion_db)
):
    """Ejemplo usando la dependencia de paginación."""
    # En un entorno real: db.query(User).offset(offset).limit(limit).all()
    return [
        {"id": 1, "nombre": "Alice", "email": "alice@example.com"},
        {"id": 2, "nombre": "Bob", "email": "bob@example.com"}
    ]
```

En poco más de 40 líneas de código, hemos definido un servicio asíncrono con validación estricta de entrada y salida, inyección de dependencias para la base de datos y la paginación, y hemos generado documentación Swagger gratuita y lista para ser consumida. Esta combinación de robustez de tipado estático y velocidad de desarrollo es lo que ha consolidado a FastAPI como una herramienta indispensable para el Backend en Python.

## 16.3 Flask: Construcción de microservicios desde cero

Si Django es la caja de herramientas completa y FastAPI es el torno de alta precisión, **Flask** es la navaja suiza: minimalista, maduro, increíblemente versátil y con un ecosistema de extensiones gigante. Creado originalmente como una broma del *April Fools' Day* por Armin Ronacher, Flask se ha consolidado como uno de los frameworks web más populares del mundo.

La filosofía central de Flask es ser un **microframework**. Esto no significa que carezca de potencia para aplicaciones grandes, sino que el framework principal es extremadamente ligero, manteniendo una base de código pequeña y dejando las decisiones arquitectónicas en tus manos. De fábrica, Flask solo te proporciona dos cosas principales:
1.  **Werkzeug:** Un robusto conjunto de herramientas WSGI para gestionar el enrutamiento y las peticiones HTTP.
2.  **Jinja2:** Un potente motor de plantillas (aunque en el contexto de microservicios modernos, rara vez lo usaremos).

No incluye ORM, ni validación de formularios, ni sistema de autenticación. Tú eliges qué piezas acoplar (por ejemplo, usando SQLAlchemy para la base de datos, como vimos en el Capítulo 15). Esta ausencia de "equipaje" lo convierte en el candidato perfecto para la **arquitectura de microservicios**, donde cada servicio debe ser pequeño, tener una única responsabilidad y consumir los mínimos recursos posibles.

### El Contexto de la Petición (Request Context)

Una de las diferencias de diseño más notables de Flask respecto a Django o FastAPI es cómo maneja los datos de la petición HTTP. En lugar de pasar un objeto `request` explícitamente como argumento a cada vista o *endpoint*, Flask utiliza variables globales locales al hilo (*thread-locals*).

Importas el objeto `request` directamente de Flask, y el framework se encarga mágicamente de que, cuando lo leas dentro de una ruta, contenga los datos de la petición HTTP específica que disparó esa función, sin mezclarla con las peticiones de otros usuarios concurrentes.

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/ping', methods=['GET'])
def health_check():
    """Un endpoint de salud básico, esencial en microservicios."""
    return jsonify({"status": "ok", "servicio": "pagos"}), 200

@app.route('/api/echo', methods=['POST'])
def echo_data():
    """Ejemplo del uso del objeto request global."""
    # request.get_json() extrae y parsea el cuerpo de la petición
    datos = request.get_json() 
    
    if not datos or 'mensaje' not in datos:
        return jsonify({"error": "Falta el campo 'mensaje'"}), 400
        
    return jsonify({"recibido": datos['mensaje']}), 200
```

### Modularidad en Microservicios: Blueprints

Construir un microservicio no significa escribir todo en un solo archivo `app.py`. A medida que el servicio crece (por ejemplo, un microservicio de inventario que maneja productos, categorías y proveedores), necesitas estructurar el código.

Para esto, Flask ofrece los **Blueprints** (Planos). Un Blueprint te permite definir rutas, manejadores de errores y lógica en módulos separados, que luego se registran (se "ensamblan") en la aplicación principal. Esto promueve la reutilización y el desacoplamiento, principios clave de la Ingeniería Senior.

Veamos cómo estructurar un microservicio de "Usuarios" usando Blueprints:

**1. El módulo de rutas (Blueprint):**
```python
# usuarios/rutas.py
from flask import Blueprint, request, jsonify

# Creamos el Blueprint. El prefijo de URL se aplicará a todas las rutas aquí dentro.
usuarios_bp = Blueprint('usuarios', __name__, url_prefix='/api/v1/usuarios')

@usuarios_bp.route('/', methods=['POST'])
def crear_usuario():
    datos = request.get_json()
    # Aquí iría la lógica de negocio (validación, guardado en BD con SQLAlchemy, etc.)
    return jsonify({"id": 123, "nombre": datos.get('nombre')}), 201

@usuarios_bp.route('/<int:usuario_id>', methods=['GET'])
def obtener_usuario(usuario_id):
    # Simulamos una consulta a la BD
    if usuario_id == 123:
        return jsonify({"id": 123, "nombre": "Ana"}), 200
    return jsonify({"error": "Usuario no encontrado"}), 404
```

**2. El ensamblaje de la aplicación:**
```python
# app.py (Punto de entrada del microservicio)
from flask import Flask
from usuarios.rutas import usuarios_bp

def create_app():
    """Patrón de Fábrica de Aplicaciones (Application Factory)"""
    app = Flask(__name__)
    
    # Configuraciones de la app (variables de entorno, BD, etc.)
    app.config['ENV'] = 'production'
    
    # Registramos nuestros módulos
    app.register_blueprint(usuarios_bp)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000)
```
*Nota Senior: Hemos utilizado el patrón `create_app()` (Application Factory). Este patrón es fundamental para el testing (Capítulo 17), ya que te permite instanciar múltiples versiones de la aplicación con diferentes configuraciones de prueba sin conflictos de estado global.*

### Ecosistema y Flexibilidad

En una arquitectura de microservicios en el mundo real, tu ecosistema se verá más como una red de pequeñas aplicaciones Flask independientes, coordinadas por una capa superior.

```text
                        [Cliente HTTP]
                              |
                              v
                [API Gateway / Balanceador de Carga]
                              |
      +-----------------------+-----------------------+
      |                       |                       |
      v                       v                       v
[Microservicio]         [Microservicio]         [Microservicio]
 [ Usuarios ]            [ Inventario ]            [ Pagos ]
   (Flask)                 (Flask)                 (Flask)
      |                       |                       |
      v                       v                       v
(BD PostgreSQL)          (BD MongoDB)           (API Externa)
```

Flask brilla en este escenario porque te permite ser pragmático:
* ¿El microservicio de Usuarios requiere datos relacionales estrictos? Instalas `Flask-SQLAlchemy`.
* ¿El de Inventario necesita alta flexibilidad de esquema? Usas `PyMongo` sin que el framework se queje.
* ¿Necesitas integrar un linter estricto y serialización robusta porque te gusta lo que hace Pydantic en FastAPI? Puedes instalar `Flask-Pydantic` o usar `Marshmallow`.

### Resumen del Capítulo: Elegir la herramienta adecuada

Con esta sección cerramos la triada de los frameworks backend de Python. Como desarrollador Senior, tu trabajo no es casarte con un framework, sino entender sus *trade-offs* para elegir el adecuado según el proyecto:

1.  **Django:** Elígelo cuando necesites construir un monolito robusto y rápido, cuando el panel de administración autogenerado ahorre semanas de trabajo, o cuando el proyecto requiera renderizado del lado del servidor pesado.
2.  **FastAPI:** Elígelo cuando construyas APIs de alto rendimiento que requieran asincronía pura (I/O intensivo), cuando necesites autodocumentación estricta y cuando la validación de tipos sea crucial desde el primer día.
3.  **Flask:** Elígelo para construir microservicios pequeños e independientes, cuando necesites control absoluto sobre las bibliotecas de terceros que utilizas, o cuando estés modernizando un sistema *legacy* pieza por pieza.