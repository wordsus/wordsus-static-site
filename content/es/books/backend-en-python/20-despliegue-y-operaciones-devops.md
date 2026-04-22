La transición de un script local a una solución empresarial exige trascender el código. En este capítulo final, aprenderás a transformar tus aplicaciones en unidades portables y escalables. Iniciaremos con Docker, la pieza angular para garantizar entornos idénticos desde el desarrollo hasta la nube, optimizando imágenes para producción. Descubrirás el rol crítico de Gunicorn y Uvicorn para servir tráfico masivo con eficiencia asíncrona. Finalmente, cerraremos el ciclo con pipelines de CI/CD para automatizar entregas y sistemas de observabilidad (logs, métricas y trazas) que te darán ojos sobre lo invisible. Es el paso definitivo del desarrollador al ingeniero de software.

## 20.1 Contenerización de aplicaciones Python con Docker y Docker Compose

En el Capítulo 7 exploramos cómo aislar las dependencias de nuestros proyectos utilizando entornos virtuales (`venv`) y gestores modernos como Poetry. Sin embargo, en un entorno de producción o en un equipo de desarrollo distribuido, aislar los paquetes de Python no es suficiente. ¿Qué ocurre con la versión del sistema operativo, las bibliotecas del sistema a nivel de C, o los servicios externos como bases de datos y colas de mensajes? 

Aquí es donde entra **Docker**. La contenerización nos permite empaquetar nuestra aplicación junto con todo su entorno de ejecución a nivel de sistema operativo, garantizando la promesa de: *"Si funciona en mi máquina, funcionará en producción"*.

A continuación, nos alejaremos de los ejemplos básicos de Docker y construiremos configuraciones orientadas a un nivel Senior, aplicando mejores prácticas de seguridad, optimización de caché y reducción del tamaño de imagen.

### El Flujo de Contenerización

Conceptualmente, la contenerización sigue un flujo estricto y unidireccional:

```text
+-------------------+       docker build        +-------------------+
|  Código Fuente +  | ------------------------> |   Imagen Docker   |
|    Dockerfile     |  (Construcción por capas) |  (Artefacto base) |
+-------------------+                           +-------------------+
                                                          |
                                                          | docker run / compose up
                                                          v
                                                +-------------------+
                                                |   Contenedor(es)  |
                                                |   en Ejecución    |
                                                +-------------------+
```

### Diseñando un `Dockerfile` para Producción (Multi-stage)

Un error común es utilizar imágenes base excesivamente pesadas (como `python:3.11`) o dejar herramientas de compilación en la imagen final, lo que aumenta tanto el peso del contenedor como la superficie de ataque (vulnerabilidades). 

Para aplicaciones serias (por ejemplo, una API en FastAPI como vimos en el Capítulo 16, que requiere compilar drivers como `asyncpg`), la mejor práctica es utilizar **Multi-stage builds** (Construcción en múltiples etapas) y ejecutar la aplicación como un usuario sin privilegios.

```dockerfile
# ==========================================
# Etapa 1: Builder (Compilación de dependencias)
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /app

# 1. Instalamos dependencias del sistema necesarias para compilar (ej. gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Copiamos SOLO los requerimientos para aprovechar la caché de capas de Docker
COPY requirements.txt .

# 3. Compilamos las dependencias en formato "wheel" para no instalar basuras de compilación
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


# ==========================================
# Etapa 2: Runner (Imagen final optimizada)
# ==========================================
FROM python:3.11-slim

# 4. Variables de entorno críticas para Python en Docker
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 5. Dependencias en tiempo de ejecución (ej. cliente de postgres)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 6. Crear un usuario sin privilegios root por motivos de seguridad (Práctica OWASP)
RUN addgroup --system appgroup && adduser --system --group appuser

# 7. Copiar los wheels de la etapa anterior e instalarlos limpios
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

# 8. Copiar el código fuente
COPY . .

# 9. Ajustar permisos y cambiar al usuario no root
RUN chown -R appuser:appgroup /app
USER appuser

# 10. Exponer el puerto (Documentación)
EXPOSE 8000

# El comando de arranque se verá en profundidad en la sección 20.2 (Servidores ASGI/WSGI)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Variables de Entorno Clave
En el bloque anterior hemos definido dos variables fundamentales para Python:
* `PYTHONDONTWRITEBYTECODE=1`: Evita que Python escriba archivos `.pyc` en el disco. En un contenedor efímero, esto es escritura innecesaria que degrada el rendimiento.
* `PYTHONUNBUFFERED=1`: Fuerza a que la salida estándar (stdout/stderr) no se almacene en búfer. Esto garantiza que los logs de tu aplicación (Capítulo 20.4) lleguen instantáneamente al sistema de observabilidad del contenedor.

#### El archivo `.dockerignore`
Al igual que Git, Docker necesita saber qué archivos **no** enviar al demonio de Docker durante el `build`. Un archivo `.dockerignore` es vital para evitar sobreescribir configuraciones del contenedor con archivos locales o subir accidentalmente secretos.

```text
# .dockerignore
.git
__pycache__/
*.pyc
.env
venv/
.pytest_cache/
.coverage
```

### Orquestación Local con Docker Compose

Si tu aplicación implementa una arquitectura limpia y separada (Capítulo 19), es altamente probable que necesites más de un servicio. Una API típica dependerá de una base de datos (PostgreSQL), un caché/broker (Redis) y quizás un worker asíncrono (Celery).

`docker-compose.yml` es la herramienta de facto para declarar y gestionar esta topología como código (Infrastructure as Code).

```yaml
version: '3.8'

services:
  api:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      # Sincronización de código en local (solo para desarrollo)
      - .:/app
    environment:
      - DATABASE_URL=postgresql+asyncpg://admin:supersecreto@db:5432/app_db
      - REDIS_URL=redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    networks:
      - backend_net

  worker:
    build: .
    command: celery -A core.celery_app worker --loglevel=info
    environment:
      - REDIS_URL=redis://cache:6379/0
    depends_on:
      - cache
    networks:
      - backend_net

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: supersecreto
      POSTGRES_DB: app_db
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      # Verificamos que PostgreSQL esté listo para aceptar conexiones
      test: ["CMD-SHELL", "pg_isready -U admin -d app_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend_net

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - backend_net

# Persistencia de datos nativa de Docker
volumes:
  pg_data:

# Aislamiento de red
networks:
  backend_net:
    driver: bridge
```

#### Aspectos Arquitectónicos del Compose
1. **Resolución de DNS interna:** No necesitas conocer la IP de la base de datos. En la variable `DATABASE_URL` de la API, el host es simplemente `db` (el nombre del servicio). Docker incluye un servidor DNS interno que resuelve los nombres de los servicios dentro de la misma red (`backend_net`).
2. **Healthchecks (Controles de salud):** Nota cómo el servicio `api` tiene una dependencia con `db` usando `condition: service_healthy`. Un contenedor de base de datos arranca rápido, pero el motor SQL tarda unos segundos en inicializarse. Si la API arranca inmediatamente, fallará al intentar conectarse (un crash por excepción de red). El `healthcheck` garantiza que la API solo se levante cuando la base de datos informe que está *lista* para recibir queries.
3. **Persistencia (Volumes):** Los contenedores son efímeros. Si borras el contenedor `db`, pierdes los datos. Mapear un volumen gestionado (`pg_data`) al directorio interno de Postgres (`/var/lib/postgresql/data`) asegura que los datos de la base de datos sobrevivan a la destrucción del contenedor.

Con la aplicación empaquetada e integrada a su ecosistema de red, el siguiente paso crítico en producción es entender cómo se está ejecutando el código de Python internamente para manejar miles de peticiones. Esto nos lleva directamente a la elección y configuración de nuestro servidor de aplicaciones.

## 20.2 Diferencias y configuración de servidores WSGI (Gunicorn) y ASGI (Uvicorn)

En la sección anterior logramos encapsular nuestra aplicación dentro de un contenedor Docker. Sin embargo, si ejecutáramos el servidor de desarrollo por defecto que incluyen frameworks como Flask o Django (`app.run()` o `manage.py runserver`), nuestra aplicación colapsaría en producción. Estos servidores integrados están diseñados para depuración local; son de un solo hilo, ineficientes y no pueden manejar múltiples peticiones concurrentes de manera segura.

Para conectar el mundo web (peticiones HTTP) con el ecosistema de Python en un entorno de producción, necesitamos una interfaz estándar. Aquí es donde entran en juego **WSGI** y **ASGI**.

### El Problema de la Comunicación Web

Los servidores web de alto rendimiento (como Nginx o el balanceador de carga de AWS) no entienden el código Python de forma nativa. Necesitan un "traductor" que tome una petición HTTP pura y la convierta en un diccionario de datos que Python pueda procesar. 

```text
[Cliente] ---> [Servidor Web / Proxy (Nginx)] ---> [Traductor (WSGI/ASGI)] ---> [Framework (Django/FastAPI)]
```

### WSGI (Web Server Gateway Interface)

Introducido hace años (PEP 3333), WSGI es el estándar tradicional y **síncrono** para aplicaciones web en Python. 

* **Comportamiento:** Es puramente secuencial. Por cada petición entrante, el servidor asigna un "worker" (un proceso o un hilo de ejecución). Si ese worker tiene que esperar a que la base de datos responda, se queda bloqueado (I/O bound, como vimos en el Capítulo 12) y no puede atender otra petición hasta terminar.
* **Casos de uso:** Aplicaciones Django tradicionales, Flask (sin soporte asíncrono avanzado).
* **El Estándar de la Industria:** **Gunicorn** (Green Unicorn).

#### Configuración de Gunicorn

Gunicorn utiliza un modelo *pre-fork*. Esto significa que un proceso maestro central arranca y "bifurca" (forks) múltiples procesos trabajadores (workers) que se encargan de las peticiones reales.

Para ejecutar una aplicación WSGI (por ejemplo, `core/wsgi.py` en Django) con Gunicorn, un comando básico de producción sería:

```bash
gunicorn core.wsgi:application --workers=4 --threads=2 --bind=0.0.0.0:8000
```

**La regla de oro para los workers en Gunicorn:**
La fórmula recomendada oficialmente para determinar el número de workers es: `(2 x Número de Núcleos de CPU) + 1`. Si tu contenedor corre en una máquina de 2 núcleos, configurarías 5 workers.

### ASGI (Asynchronous Server Gateway Interface)

Con la llegada de `asyncio` y la necesidad de manejar conexiones persistentes (como WebSockets, Cap. 14.4) o miles de peticiones simultáneas sin consumir un hilo de sistema operativo por cada una, WSGI se quedó corto. ASGI es su sucesor espiritual.

* **Comportamiento:** Soporta código asíncrono (`async` / `await`). Si una petición debe esperar a la base de datos, el Event Loop (Bucle de eventos) pausa esa tarea y el worker queda libre para atender la siguiente petición HTTP.
* **Casos de uso:** FastAPI, Django (en modo asíncrono con Channels), Starlette.
* **El Estándar de la Industria:** **Uvicorn**.

#### Configuración de Uvicorn

Uvicorn es un servidor ASGI ultrarrápido basado en `uvloop` y `httptools`. Para ejecutar una aplicación FastAPI (por ejemplo, la instancia `app` en `main.py`), usarías:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### La Arquitectura Senior: Combinando Gunicorn y Uvicorn

Aunque Uvicorn tiene un argumento `--workers` para levantar múltiples procesos, el propio creador de Uvicorn recomienda no usarlo como gestor de procesos en entornos de producción críticos. Uvicorn es excelente ejecutando el bucle de eventos, pero Gunicorn es el rey indiscutible gestionando procesos (reiniciando workers muertos, manejando señales del sistema operativo, etc.).

La mejor práctica es **usar Gunicorn como el gestor de procesos, y que cada proceso worker ejecute una instancia de Uvicorn**.

Para lograr esto, Gunicorn permite especificar una clase de worker personalizada (Worker Class).

```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Refinando la configuración (Gunicorn Conf)

A nivel Senior, no pasamos decenas de argumentos por línea de comandos. Creamos un archivo de configuración de Python para el servidor, típicamente llamado `gunicorn_conf.py`.

```python
# gunicorn_conf.py
import multiprocessing

# Enlazar al puerto expuesto
bind = "0.0.0.0:8000"

# Usar el worker asíncrono de Uvicorn
worker_class = "uvicorn.workers.UvicornWorker"

# Cálculo dinámico de workers según el hardware disponible
cores = multiprocessing.cpu_count()
workers_per_core = 2
default_web_concurrency = workers_per_core * cores + 1
workers = default_web_concurrency

# Tiempos de espera y reinicios de seguridad
timeout = 120
keepalive = 5
max_requests = 1000 # Reinicia el worker tras 1000 peticiones para evitar fugas de memoria (Memory Leaks)
max_requests_jitter = 50

# Integración con el sistema de logging (que veremos en la sección 20.4)
accesslog = "-" # Stdout
errorlog = "-"  # Stderr
loglevel = "info"
```

De esta manera, en nuestro `Dockerfile` de la sección anterior, el comando final de arranque se simplifica enormemente, siendo a la vez dinámico y robusto frente a fallos:

```dockerfile
# En la etapa final del Dockerfile
CMD ["gunicorn", "-c", "gunicorn_conf.py", "main:app"]
```

## 20.3 Integración y Despliegue Continuo (Pipelines de CI/CD)

Hasta este punto, tenemos una aplicación Python robusta, empaquetada en una imagen Docker optimizada (Sección 20.1) y servida a través de una combinación eficiente de Gunicorn y Uvicorn (Sección 20.2). El siguiente desafío de un ingeniero Senior es la automatización: **¿Cómo llevamos el código desde nuestra máquina local hasta producción de forma segura, predecible y sin intervención manual?**

La respuesta es la implementación de un pipeline de Integración Continua (CI) y Despliegue/Entrega Continua (CD). Atrás quedaron los días de conectarse por SSH al servidor de producción, hacer un `git pull` y reiniciar servicios a mano, una práctica propensa a errores catastróficos.

### Anatomía de un Pipeline Moderno

Un pipeline es una secuencia automatizada de pasos (o "trabajos") que se dispara ante un evento en el sistema de control de versiones (por ejemplo, un `git push` a la rama `main`). 

Podemos visualizar el flujo estándar de la siguiente manera:

```text
 Evento: git push origin main
       |
       v
+-------------------------------------------------------------+
|                     FASE 1: CI (Integración)                |
|                                                             |
|  [1. Análisis Estático] -----> [2. Pruebas Automatizadas]   |
|  - Linters (Ruff/Flake8)       - Unitarias (pytest)         |
|  - Tipado (mypy)               - Integración                |
+-------------------------------------------------------------+
       | (Si falla, se detiene y notifica al equipo)
       | (Si pasa, avanza)
       v
+-------------------------------------------------------------+
|                     FASE 2: CD (Despliegue)                 |
|                                                             |
|  [3. Construcción (Build)] --> [4. Despliegue (Deploy)]     |
|  - docker build                - SSH al servidor            |
|  - Push a Docker Registry      - docker compose pull        |
|    (DockerHub, AWS ECR...)     - docker compose up -d       |
+-------------------------------------------------------------+
```

### Implementación con GitHub Actions

Hoy en día, **GitHub Actions** (junto con GitLab CI) es el estándar de la industria. Nos permite definir la infraestructura de nuestro pipeline como código (YAML) y mantenerla versionada junto con nuestra aplicación.

A continuación, crearemos un pipeline maduro. Lo guardaremos en el archivo `.github/workflows/produccion.yml`.

#### 1. Definición y Fase de CI (Testing)

El objetivo de la fase de Integración Continua es garantizar que el nuevo código no rompe la aplicación ni degrada su calidad.

```yaml
name: CI/CD Pipeline a Producción

# El pipeline se ejecutará cuando haya un push a 'main'
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  # ==========================================
  # TRABAJO 1: Integración Continua (Testing)
  # ==========================================
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Clonar el repositorio
        uses: actions/checkout@v4

      - name: Configurar entorno Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: 'pip' # Optimización Senior: Caché de dependencias para acelerar el pipeline

      - name: Instalar dependencias
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install ruff mypy pytest pytest-cov

      - name: Linters y Calidad de Código (Capítulo 17.4)
        run: ruff check .

      - name: Análisis Estático de Tipos (Capítulo 11.3)
        run: mypy .

      - name: Ejecutar Pruebas con Cobertura (Capítulo 17.3)
        run: pytest --cov=core --cov-report=term-missing
```

#### 2. Fase de CD (Construcción y Despliegue)

Si el trabajo de `test` termina en verde, pasamos a la fase de Despliegue. Este trabajo construirá la imagen Docker final usando el `Dockerfile` *multi-stage* que creamos en la Sección 20.1, la subirá a un registro (ej. DockerHub) y le dirá al servidor de producción que se actualice.

```yaml
  # ==========================================
  # TRABAJO 2: Despliegue Continuo
  # ==========================================
  deploy:
    runs-on: ubuntu-latest
    # Este trabajo DEPENDE estrictamente de que 'test' pase con éxito
    needs: test
    # Solo desplegamos si el evento fue un push a la rama principal
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Clonar el repositorio
        uses: actions/checkout@v4

      - name: Iniciar sesión en Docker Hub
        uses: docker/login-action@v3
        with:
          # Las credenciales NUNCA van en texto plano. Usamos GitHub Secrets.
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Construir y subir imagen Docker
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          # Etiquetamos la imagen con 'latest' y con el hash del commit para trazabilidad
          tags: |
            miusuario/mi-api-python:latest
            miusuario/mi-api-python:${{ github.sha }}

      - name: Despliegue en Servidor de Producción por SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          # Comandos a ejecutar en el servidor de producción remoto
          script: |
            cd /opt/mi-aplicacion
            # 1. Descargar la nueva imagen que acabamos de compilar
            docker compose pull api
            # 2. Recrear el contenedor sin tiempo de inactividad (Zero-downtime aproximado)
            docker compose up -d --no-deps --build api
            # 3. Limpiar imágenes huérfanas antiguas para no llenar el disco del servidor
            docker image prune -f
```

### Conceptos Clave del Pipeline Senior

1. **Inmutabilidad de Artefactos:** Observa cómo en el bloque `tags` etiquetamos la imagen con `${{ github.sha }}`. Esto significa que cada versión de tu código genera una imagen Docker única e inmutable ligada al commit exacto. Si el código en producción falla críticamente, puedes hacer un "Rollback" (marcha atrás) instantáneo simplemente desplegando el hash de la imagen anterior.
2. **Uso de Secretos:** La seguridad perimetral es vital (Capítulo 18). Tokens, contraseñas y llaves SSH se inyectan en tiempo de ejecución a través del bóveda de secretos de la plataforma CI (como *GitHub Secrets*), asegurando que ninguna credencial quede expuesta en el código fuente.
3. **Optimización con Caché:** En la fase de `test`, la instrucción `cache: 'pip'` evita descargar todas las librerías de internet en cada ejecución. El pipeline reutiliza las descargas previas, reduciendo el tiempo de Integración de minutos a apenas segundos. El tiempo del desarrollador es costoso; un pipeline rápido mejora significativamente la moral y la velocidad del equipo.

Con nuestro código testeado, empaquetado y desplegado de manera automatizada, nuestra aplicación ya está sirviendo tráfico en el mundo real. Sin embargo, un sistema en producción es como una caja negra. Si algo falla o se vuelve lento, ¿cómo nos enteramos antes que los usuarios? Para esto necesitamos establecer un sistema de observabilidad, que abordaremos en la sección final.

## 20.4 Observabilidad total: Logging estructurado, monitoreo y trazabilidad distribuida

Desplegar nuestra aplicación en producción a través de un pipeline automatizado (Sección 20.3) es un gran hito, pero no es el final del camino. Una vez que el código se enfrenta al tráfico real, entramos en la fase operativa. En sistemas distribuidos y arquitecturas de microservicios, la pregunta ya no es *si* algo va a fallar, sino *cuándo* y, lo más importante, *qué tan rápido podemos descubrir por qué falló*.

Mientras que el "monitoreo" tradicional te dice si un sistema está funcionando o no (ej. "el uso de CPU está al 90%"), la **Observabilidad** te permite entender el estado interno de un sistema a partir de sus salidas externas para responder preguntas complejas (ej. "¿por qué las peticiones de pago de los usuarios de esta región están tardando 5 segundos más de lo normal?").

La observabilidad moderna se sostiene sobre tres pilares fundamentales: Logs, Métricas y Trazas.

```text
+---------------------------------------------------------------+
|                 La Tríada de la Observabilidad                |
+---------------------------------------------------------------+
|                                                               |
|  1. LOGS                 2. MÉTRICAS           3. TRAZAS      |
|  (Eventos discretos)     (Agregaciones)        (Flujo global) |
|                                                               |
|  [ { "level": "error",   [ http_requests_total [ Trace_ID: X  |
|      "user": 123,          {status="200"} 45     Span 1: API  |
|      "msg": "Timeout" } ]  ]                     Span 2: DB ] |
|                                                               |
|  Herramientas típicas:   Herramientas típicas: Herramientas:  |
|  ELK Stack, Loki,        Prometheus, Datadog   Jaeger, Tempo, |
|  CloudWatch              Grafana               OpenTelemetry  |
+---------------------------------------------------------------+
```

### 1. Logging Estructurado: Más allá del `print()`

En las primeras etapas del desarrollo, solemos usar `print()` o el módulo estándar `logging` emitiendo cadenas de texto (ej. `INFO: Usuario 42 inició sesión`). En producción, buscar errores usando expresiones regulares (`grep`) sobre gigabytes de texto plano es una pesadilla insostenible.

El enfoque Senior es el **Logging Estructurado**. Esto significa que cada línea de log se emite como un objeto estructurado (generalmente **JSON**), lo que permite a las herramientas de indexación buscar, filtrar y agregar datos instantáneamente.

En Python, la biblioteca líder para esto es `structlog`.

```python
# Ejemplo de configuración con structlog para un entorno de producción
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,    # Inyecta "level": "info/error"
        structlog.stdlib.add_logger_name,  # Inyecta el nombre del módulo
        structlog.processors.TimeStamper(fmt="iso"), # Tiempo exacto UTC
        structlog.processors.dict_tracebacks,        # Formatea excepciones como diccionarios
        structlog.processors.JSONRenderer()          # Salida final en JSON
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger("auth_service")

# Uso en la lógica de negocio
def procesar_pago(user_id: int, amount: float):
    # Añadimos contexto que viajará con todos los logs posteriores de esta función
    log = logger.bind(user_id=user_id, transaction_amount=amount)
    
    log.info("Iniciando procesamiento de pago")
    try:
        # Lógica de cobro simulada
        if amount > 10000:
            raise ValueError("Límite de tarjeta excedido")
        log.info("Pago procesado exitosamente")
    except Exception as e:
        log.error("Fallo al procesar el pago", error_detail=str(e), exc_info=True)

procesar_pago(user_id=884, amount=15000.00)
```

**Salida resultante (formato JSON de una sola línea, legible por máquinas):**
```json
{"user_id": 884, "transaction_amount": 15000.0, "event": "Fallo al procesar el pago", "error_detail": "L\u00edmite de tarjeta excedido", "level": "error", "logger": "auth_service", "timestamp": "2023-10-27T10:00:00Z", "exc_info": "..."}
```

### 2. Monitoreo y Métricas con Prometheus

Los logs son costosos de almacenar y procesar. Para saber la "salud general" del sistema (cuántas peticiones estamos recibiendo, cuál es la latencia promedio, cuánta memoria consumimos), usamos **Métricas**. Las métricas son datos numéricos agregados a lo largo del tiempo.

El estándar de la industria es **Prometheus**, un sistema basado en un modelo *pull*: tu aplicación expone un endpoint HTTP (usualmente `/metrics`) y el servidor de Prometheus lo consulta periódicamente ("scraps") para recolectar los datos.

Para exponer estas métricas en una aplicación FastAPI o Flask, utilizamos el cliente oficial de Prometheus para Python.

```python
# Integración básica de métricas en FastAPI
from fastapi import FastAPI, Request
from prometheus_client import make_asgi_app, Counter, Histogram
import time

app = FastAPI()

# Definimos nuestras métricas
# Counter: Solo sube (ej. total de peticiones)
REQUEST_COUNT = Counter(
    "http_requests_total", 
    "Total de peticiones HTTP", 
    ["method", "endpoint", "http_status"]
)

# Histogram: Mide distribuciones (ej. latencia)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", 
    "Latencia de la petición en segundos",
    ["method", "endpoint"]
)

# Middleware para interceptar todas las peticiones y medir
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Registramos la latencia y el incremento de la petición
    process_time = time.time() - start_time
    REQUEST_LATENCY.labels(request.method, request.url.path).observe(process_time)
    REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
    
    return response

# Exponemos el endpoint de métricas en otra ruta
app.mount("/metrics", make_asgi_app())
```

Una vez que Prometheus recolecta estos datos, se utiliza **Grafana** para crear paneles de control (dashboards) visuales y configurar alertas automatizadas (ej. "Enviar un mensaje a Slack si los errores 500 superan el 2% en los últimos 5 minutos").

### 3. Trazabilidad Distribuida (Distributed Tracing)

Si tu arquitectura evoluciona hacia microservicios (Capítulo 19.3), un log aislado pierde su utilidad. Si un usuario hace clic en "Comprar", la petición HTTP entra por el *API Gateway*, va al *Servicio de Carrito*, luego al *Servicio de Pagos* y finalmente al *Servicio de Inventario*. Si el proceso tarda 8 segundos, ¿qué servicio es el cuello de botella?

La **Trazabilidad Distribuida** resuelve esto utilizando **OpenTelemetry** (el estándar CNCF de la industria).

* **Trace (Traza):** Representa el viaje completo de una petición a través de toda la arquitectura. Tiene un ID único (Trace ID).
* **Span (Tramo):** Representa una unidad de trabajo individual dentro de la traza (ej. una consulta a la base de datos, una llamada a otra API). Cada Span tiene un inicio, un fin y metadatos.

#### El Mecanismo de Inyección de Contexto
Para que todos los servicios sepan que pertenecen a la misma "petición padre", el Trace ID se inyecta en las cabeceras HTTP (usualmente la cabecera `traceparent` bajo el estándar W3C) cuando la petición viaja de un servicio a otro.

```text
[Cliente] 
   | (Genera Trace ID: abc-123)
   v
[Microservicio A (API Web)] --- (Span 1: 100ms)
   |
   |-- (Llamada HTTP POST con Header 'traceparent: abc-123') -->
   v
[Microservicio B (Pagos)] ----- (Span 2: 500ms)
   |
   |-- (Query SQL asociada a Trace ID abc-123) -->
   v
[Base de Datos PostgreSQL] ---- (Span 3: 400ms)
```

En Python, instrumentar OpenTelemetry es sorprendentemente fácil porque provee instrumentación automática. Con ejecutar tu servidor utilizando el envoltorio de OpenTelemetry, bibliotecas como `requests`, `FastAPI`, `Django`, `psycopg2` (PostgreSQL) y `Redis` se parchean automáticamente para propagar y emitir Spans sin modificar tu código de negocio.

```bash
# Instalación de herramientas de instrumentación
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install

# Ejecutar Gunicorn/Uvicorn envuelto en OpenTelemetry (sin tocar el código base)
OTEL_SERVICE_NAME="api_pagos" \
OTEL_TRACES_EXPORTER="otlp" \
opentelemetry-instrument \
    gunicorn -c gunicorn_conf.py main:app
```

### El Paradigma Final

Un desarrollador Junior mira la terminal para ver si su script de Python se ejecutó. Un ingeniero Senior construye sistemas donde los Logs Estructurados nos dicen **qué** pasó, las Métricas nos avisan **cuándo** hay un problema general, y las Trazas Distribuidas nos muestran exactamente **dónde** está ocurriendo. Al integrar estas tres dimensiones, logramos una observabilidad total, cerrando el ciclo de vida de una aplicación Python robusta, escalable y mantenible a nivel empresarial.