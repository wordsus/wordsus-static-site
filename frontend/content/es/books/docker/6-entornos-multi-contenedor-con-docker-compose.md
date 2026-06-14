Dominar Docker requiere trascender el contenedor individual para gestionar ecosistemas de servicios interconectados. En este capítulo, exploramos **Docker Compose**, la herramienta esencial para orquestar infraestructuras complejas de forma declarativa. Aprenderás a transformar scripts imperativos en archivos YAML robustos, definiendo servicios, redes y volúmenes con precisión. Analizaremos desde la gestión de dependencias y pruebas de salud (*healthchecks*), hasta técnicas avanzadas de perfiles y extensibilidad. Al finalizar, serás capaz de desplegar entornos completos, seguros y escalables con un solo comando, optimizando el flujo desde el desarrollo local hasta el pipeline de CI/CD.

## 6.1. Introducción a la especificación de Compose (YAML)

Hasta este punto del libro, hemos gestionado el ciclo de vida de los contenedores de forma individual. Hemos configurado redes personalizadas (Capítulo 5), montado volúmenes para la persistencia (Capítulo 4) y construido imágenes eficientes (Capítulo 3). Sin embargo, en el mundo real, una aplicación rara vez vive en un solo contenedor. Un entorno típico requiere una base de datos, una API, un frontend y quizás una capa de caché en Redis.

Levantar toda esta infraestructura utilizando comandos `docker run` individuales es ineficiente, propenso a errores y difícil de documentar. Aquí es donde ocurre el cambio de paradigma más importante en tu camino hacia el nivel Senior: **pasar de un modelo imperativo a uno declarativo**.

En lugar de decirle a Docker *cómo* hacer cada paso secuencialmente mediante extensos scripts de Bash, utilizamos Docker Compose para decirle a Docker *qué* estado final deseamos.

### ¿Qué es la Especificación de Compose?

Originalmente, Docker Compose (escrito en Python y ejecutado como `docker-compose`) era una herramienta externa. Con el tiempo, los archivos de configuración evolucionaron a través de varias versiones (v1, v2, v2.1, v3). Esta fragmentación generaba confusión sobre qué versión usar según el entorno (desarrollo local vs. Docker Swarm).

Hoy en día, esto se ha unificado en la **Compose Specification** (Especificación de Compose). Ya no se trata solo de un archivo de configuración para una herramienta específica, sino de un estándar abierto agnóstico a la plataforma. Además, la herramienta de línea de comandos ha sido reescrita en Go e integrada directamente en el CLI de Docker como un plugin (ahora usamos `docker compose` sin el guion).

```text
[Flujo Imperativo vs. Declarativo]

Imperativo (CLI tradicional):
Tú -> `docker network create mi_red` -> `docker run -d --net mi_red db` -> `docker run -d --net mi_red app` -> (Complejidad mental alta)

Declarativo (Compose):
Tú -> Escribes `compose.yaml` -> Ejecutas `docker compose up` -> Compose Engine -> (Se encarga de crear redes, volúmenes y contenedores en el orden correcto)

```

### Fundamentos de YAML para DevOps

La especificación de Compose se escribe en **YAML** (YAML Ain't Markup Language). Es un formato de serialización de datos diseñado para ser legible por humanos. A diferencia de JSON o XML, YAML minimiza el uso de llaves o etiquetas, dependiendo casi exclusivamente de la indentación.

Para dominar Compose, debes respetar estrictamente estas cuatro reglas de YAML:

1. **Indentación estricta (Espacios, NUNCA Tabulaciones):** La jerarquía de los datos se define por los espacios al inicio de la línea. Por convención estandarizada en la industria, se utilizan **2 espacios** por cada nivel de indentación. Mezclar espacios y tabulaciones provocará un error de sintaxis inmediato.
2. **Pares Clave-Valor:** Es la estructura base. Se separan por dos puntos y un espacio (`clave: valor`).
3. **Listas (Arrays):** Se representan utilizando un guion seguido de un espacio (`-`) en el mismo nivel de indentación.
4. **Comentarios:** Todo lo que sigue a un símbolo de numeral (`#`) es ignorado por el motor de Compose.

**Ejemplo comparativo de sintaxis YAML:**

```yaml
# 1. Par Clave-Valor simple
nombre_proyecto: mi_tienda_online

# 2. Diccionario (Objeto anidado mediante indentación de 2 espacios)
configuracion_db:
  puerto: 5432
  usuario: admin

# 3. Lista (Colección de elementos)
puertos_expuestos:
  - "80:80"
  - "443:443"

```

### Anatomía de Alto Nivel de un Archivo Compose

Un archivo Compose (preferiblemente nombrado `compose.yaml` o `docker-compose.yml`) se estructura en "elementos de nivel superior" (Top-level elements). En esta sección nos limitaremos a conocer la estructura esqueleto; en la sección 6.2 profundizaremos en su configuración.

Los cinco bloques principales reconocidos por la especificación actual son:

* **`version`:** (Opcional/Obsoleto). Anteriormente se usaba para definir la versión del formato (ej. `"3.8"`). La especificación moderna lo considera meramente informativo y recomienda omitirlo, ya que Compose ahora asume la especificación unificada por defecto.
* **`name`:** (Opcional). Define el nombre del proyecto. Si se omite, Compose utiliza el nombre del directorio donde se encuentra el archivo.
* **`services`:** (Requerido). El corazón del archivo. Aquí se definen los contenedores que compondrán tu aplicación (web, worker, database).
* **`networks`:** (Opcional). Permite crear y configurar redes personalizadas de forma declarativa, aplicando los conceptos que vimos en el Capítulo 5.
* **`volumes`:** (Opcional). Define los volúmenes gestionados por Docker para asegurar la persistencia de datos (Capítulo 4) a nivel de todo el entorno.

**Esqueleto visual de la especificación:**

```yaml
name: "mi-app-empresarial"

services:
  # Definición del contenedor 1...
  # Definición del contenedor 2...

networks:
  # Definición de las reglas de red (Drivers, IPAM)...

volumes:
  # Definición de discos persistentes...

```

Comprender esta estructura jerárquica y el comportamiento estricto de YAML es el paso crítico antes de empezar a escribir código. Una vez dominada la sintaxis base, traducir comandos de terminal a código declarativo se vuelve un proceso natural.

## 6.2. Definición de servicios, redes y volúmenes en `docker-compose.yml`

En la sección anterior conocimos el esqueleto de la Especificación de Compose. Ahora vamos a dotar a ese esqueleto de órganos funcionales. En el ecosistema de Compose, tu aplicación se modela a través de tres pilares fundamentales: **Servicios** (los contenedores en ejecución), **Redes** (las vías de comunicación) y **Volúmenes** (la persistencia de los datos).

Para entender cómo interactúan, vamos a construir paso a paso la arquitectura clásica de una aplicación web: una base de datos PostgreSQL y una API backend, completamente aisladas, pero comunicadas entre sí de forma segura.

### 1. El bloque `services`: El corazón de tu aplicación

Un "servicio" en Compose es, en esencia, la definición declarativa de cómo debe ejecutarse un contenedor. Cada clave dentro de `services` representa un contenedor individual. En lugar de pasar flags a `docker run` (como `-p`, `-e`, o `-v`), definimos estas propiedades como pares clave-valor en YAML.

```yaml
services:
  api-backend:
    image: mi-registro.com/api-backend:v1.2  # Equivalente a definir la imagen al final del docker run
    ports:
      - "8080:80"                            # Equivalente a -p 8080:80
    environment:
      - NODE_ENV=production                  # Equivalente a -e NODE_ENV=production
      - DB_HOST=base-de-datos                # Resolución DNS nativa de Compose

```

**Atributos clave de un servicio:**

* **`image` vs `build`:** Puedes levantar un servicio usando una imagen preexistente (`image`) o indicarle a Compose que la construya en el momento usando un Dockerfile (`build: ./ruta/al/directorio`).
* **`environment` o `env_file`:** Para inyectar variables de entorno. Las mejores prácticas dictan usar `env_file: .env` para no exponer secretos directamente en el código YAML.
* **`ports` vs `expose`:** `ports` mapea puertos del contenedor al host (haciéndolo accesible desde el exterior), mientras que `expose` solo abre el puerto para otros contenedores en la misma red interna.

### 2. El bloque `networks`: Topología y aislamiento

Por defecto, si no defines ninguna red, Compose crea una red tipo `bridge` automáticamente y conecta todos los servicios a ella. Sin embargo, a nivel Senior, **el aislamiento explícito es innegociable**.

Definimos las redes en la raíz del documento (Top-level) y luego asignamos cada servicio a las redes correspondientes. Esto nos permite, por ejemplo, que el backend se comunique con la base de datos, pero que la base de datos no tenga salida a internet ni sea accesible desde el exterior.

```yaml
services:
  base-de-datos:
    image: postgres:15
    networks:
      - red-interna-db  # Este servicio solo existe en esta red

networks:
  red-interna-db:
    driver: bridge      # Red explícita y aislada

```

*Nota de Arquitectura:* Observa en el bloque `environment` del servicio anterior (`api-backend`) cómo pasamos `DB_HOST=base-de-datos`. Compose integra un servidor DNS interno; los contenedores en la misma red pueden descubrirse mutuamente utilizando el nombre del servicio como hostname.

### 3. El bloque `volumes`: Persistencia declarativa

Al igual que las redes, los volúmenes gestionados (*Named Volumes*) se declaran a nivel raíz para que Docker los cree y administre. Luego, se "montan" dentro de los servicios específicos. Esto soluciona el problema de perder los datos de la base de datos si el contenedor se destruye.

Existen dos formas de mapear volúmenes a nivel de servicio:

1. **Named Volumes:** Referencian un volumen declarado en el bloque principal `volumes`. Son ideales para bases de datos.
2. **Bind Mounts:** Mapean una ruta directa de tu máquina host. Son ideales para entornos de desarrollo local (ej. mapear tu código fuente para ver cambios en tiempo real sin reconstruir la imagen).

### Poniendo todo junto: El Manifiesto Completo

Veamos cómo se integran estos tres bloques en un archivo `compose.yaml` listo para producción (o un entorno de staging avanzado):

```yaml
name: "sistema-pagos"

services:
  # --- Capa de Aplicación ---
  api:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./codigo-fuente:/app        # Bind mount: Código local montado en el contenedor
    ports:
      - "3000:3000"                 # Expuesto al mundo exterior
    environment:
      - DB_USER=admin
      - DB_PASS=secreto123          # (En el Cap 6.6 veremos cómo asegurar esto)
      - DB_HOST=db                  # Apunta al nombre del servicio de la BD
    networks:
      - frontend-net
      - backend-net                 # Conectado a ambas redes
    command: npm run start

  # --- Capa de Datos ---
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=secreto123
      - POSTGRES_DB=pagos_db
    volumes:
      - pg-data:/var/lib/postgresql/data # Named volume: Persistencia segura
    networks:
      - backend-net                 # Solo conectado a la red interna (Aislado)

# --- Declaración de Recursos Top-Level ---
networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true                  # Aísla la red de accesos externos al host

volumes:
  pg-data:                          # Docker gestiona este volumen
    driver: local

```

### Diagrama de Arquitectura Resultante

Al ejecutar `docker compose up -d` con el archivo anterior, Compose orquesta la siguiente topología de forma automática:

```text
                        +-----------------------------------------+
                        |               DOCKER HOST               |
                        |                                         |
[Internet/Usuario] ---> | (Puerto 3000)                           |
                        |       |                                 |
                        |  [Red: frontend-net]                    |
                        |       |                                 |
                        | +-----v-----+                           |
                        | | Servicio: |                           |
[Directorio Local] <=====>|   "api"   | (Bind Mount: ./codigo)    |
                        | +-----+-----+                           |
                        |       |                                 |
                        |  [Red: backend-net (internal=true)]     |
                        |       |                                 |
                        | +-----v-----+                           |
                        | | Servicio: |                           |
                        | |   "db"    | ===> [Volumen: pg-data]   |
                        | +-----------+                           |
                        +-----------------------------------------+

```

Con este único archivo, hemos pasado de ejecutar múltiples comandos frágiles a tener un entorno reproducible, documentado y controlable bajo sistemas de versionado como Git.

## 6.3. Gestión de dependencias entre servicios (`depends_on`, `healthchecks`)

En la sección anterior logramos levantar nuestra API y nuestra base de datos PostgreSQL utilizando un único manifiesto. Sin embargo, si ejecutas ese entorno en el mundo real, es muy probable que te encuentres con un problema clásico de concurrencia: **la API falla al iniciar porque la base de datos aún no está lista para aceptar conexiones.**

Por defecto, cuando ejecutas `docker compose up`, el motor intenta iniciar todos los contenedores simultáneamente para ahorrar tiempo. Si tu backend arranca en 2 segundos pero PostgreSQL tarda 10 segundos en inicializar sus archivos por primera vez, la API lanzará un error de conexión ("Connection refused") y su contenedor morirá.

Para resolver esto a nivel Senior, no recurrimos a scripts mágicos con comandos `sleep` dentro de la imagen. Utilizamos los mecanismos nativos de Compose: `depends_on` y `healthchecks`.

### El mito del `depends_on` simple

La instrucción `depends_on` permite definir un orden de inicio y apagado entre servicios. Si decimos que la `api` depende de `db`, Compose iniciará la base de datos primero.

```yaml
services:
  api:
    image: mi-api
    depends_on:
      - db  # Solución ingenua
  db:
    image: postgres:15

```

**El problema:** En su forma básica, `depends_on` solo espera a que el contenedor de la dependencia cambie su estado a *Running* (ejecutándose). A Docker no le importa qué ocurre dentro del contenedor. El proceso de PostgreSQL puede estar ejecutándose, pero aún en fase de asignación de memoria o recuperación de logs, rechazando conexiones entrantes.

### La solución real: Healthchecks (Pruebas de salud)

Para que Docker sepa cuándo un servicio está genuinamente listo, debemos enseñarle a "preguntar" por su salud. Un `healthcheck` es un comando periódico que se ejecuta *dentro* del contenedor para verificar que la aplicación principal está operativa.

Si el comando devuelve un código de salida `0`, el contenedor está `healthy` (sano). Si devuelve `1`, está `unhealthy` (enfermo).

Veamos los parámetros clave de un healthcheck:

* **`test`**: El comando a ejecutar (ej. un `curl`, un `ping` o una utilidad de base de datos como `pg_isready`).
* **`interval`**: El tiempo de espera entre cada intento de comprobación (ej. `10s`).
* **`timeout`**: Cuánto tiempo esperar a que el comando responda antes de considerarlo fallido (ej. `5s`).
* **`retries`**: Número de fallos consecutivos permitidos antes de marcar el contenedor como `unhealthy` (ej. `3`).
* **`start_period`**: (Muy importante) Un período de gracia inicial para aplicaciones lentas. Los fallos durante este período no cuentan para los `retries` máximos.

### Sincronización Avanzada: `condition: service_healthy`

El verdadero poder surge cuando combinamos un `healthcheck` robusto con una forma extendida de `depends_on`. En lugar de depender de que el contenedor *exista*, dependemos de que esté *sano*.

Aquí tienes la implementación correcta y lista para producción de nuestra arquitectura anterior:

```yaml
name: "sistema-pagos-resiliente"

services:
  api:
    image: node:18-alpine
    command: npm run start
    # La API no iniciará hasta que la DB esté completamente operativa
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-net

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=secreto
    networks:
      - app-net
    # Definición del estado de salud de PostgreSQL
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

networks:
  app-net:
    driver: bridge

```

### Diagrama de Flujo del Ciclo de Vida (con Healthchecks)

Para visualizar lo que ocurre bajo el capó al ejecutar este código, observa la siguiente línea de tiempo:

```text
Tiempo (seg) | Servicio DB (Postgres)                   | Servicio API (Node)
-------------|------------------------------------------|---------------------------------
    0s       | [START] Contenedor creado y corriendo.   | [WAIT] Esperando condición...
    1s       | Postgres inicia, asignando memoria.      | [WAIT] Esperando...
   10s       | Healthcheck 1: pg_isready falla (Exit 1).| [WAIT] Esperando...
             | (Ignorado por start_period de 15s).      | 
   20s       | Healthcheck 2: pg_isready falla (Exit 1).| [WAIT] Esperando...
             | (Cuenta como intento 1/5).               |
   25s       | Postgres abre el puerto 5432.            | [WAIT] Esperando...
   30s       | Healthcheck 3: pg_isready OK (Exit 0).   | [START] Condición cumplida.
             | Estado cambia a: HEALTHY                 | Contenedor creado y corriendo.
   32s       | Recibiendo conexiones normales.          | API conecta con éxito a la DB.

```

Implementar esta dupla (`healthchecks` + `depends_on` condicional) no solo estabiliza el entorno de desarrollo local, sino que es una práctica mandatoria al construir pipelines de Integración Continua (CI), donde los runners automatizados necesitan certezas milimétricas sobre cuándo comenzar a ejecutar los tests contra la infraestructura temporal.

## 6.4. Uso de perfiles (Profiles) para entornos de desarrollo y testing

Hasta ahora, nuestro archivo `compose.yaml` levanta toda la infraestructura de golpe. Pero, ¿qué ocurre a medida que el proyecto crece?

Imagina que para desarrollar en local necesitas un cliente gráfico para la base de datos (como pgAdmin o DBeaver web), un contenedor adicional que inyecte datos de prueba (un *seeder*), y tal vez un mock de un servicio externo. Sin embargo, cuando ejecutas los tests en tu pipeline de CI/CD, no necesitas el cliente gráfico, pero sí necesitas un contenedor de pruebas (como Cypress). Y en producción, no quieres **ninguno** de estos contenedores extra por razones evidentes de seguridad y rendimiento.

La solución junior (u *old-school*) a este problema es crear múltiples archivos: `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.test.yml`, etc. Esto rompe el principio DRY (Don't Repeat Yourself) y genera una pesadilla de mantenimiento ("configuration drift").

La solución a nivel Senior es mantener una única fuente de verdad y utilizar **Perfiles de Compose (Profiles)**.

### ¿Qué son los Perfiles?

Los perfiles te permiten etiquetar servicios para que solo se inicien condicionalmente. Puedes agrupar servicios bajo un mismo perfil (por ejemplo, `dev`, `test`, `debug`) y decidir en tiempo de ejecución qué grupos deseas "encender".

**Regla de oro de los perfiles:**

* Si un servicio **no tiene** la etiqueta `profiles` definida, pertenece al perfil por defecto y se iniciará **siempre**.
* Si un servicio **sí tiene** la etiqueta `profiles`, permanecerá apagado a menos que actives ese perfil explícitamente.

### Implementación de Perfiles en YAML

Vamos a evolucionar nuestro manifiesto anterior para incluir herramientas de desarrollo y testing, asignándoles perfiles específicos:

```yaml
name: "sistema-pagos-multi-entorno"

services:
  # --- SERVICIOS CORE (Siempre se ejecutan) ---
  api:
    image: node:18-alpine
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=secreto
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  # --- HERRAMIENTAS DE DESARROLLO (Perfil: dev) ---
  db-admin:
    image: dpage/pgadmin4
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@local.com
      - PGADMIN_DEFAULT_PASSWORD=admin
    ports:
      - "8080:80"
    profiles:
      - dev              # <--- Este servicio solo arranca si activamos 'dev'
    depends_on:
      - db

  # --- HERRAMIENTAS DE TESTING (Perfil: testing) ---
  e2e-tests:
    image: cypress/included:12.0.0
    environment:
      - CYPRESS_baseUrl=http://api:3000
    profiles:
      - testing          # <--- Este servicio solo arranca si activamos 'testing'
    depends_on:
      api:
        condition: service_started

```

### Diagrama Lógico de Activación

Dependiendo de cómo invoques a Compose, la topología resultante será diferente:

```text
[Comando Ejecutado]                       [Servicios Levantados]

docker compose up -d                 =>   [ api ] + [ db ]
                                          (Ideal para producción/staging base)

docker compose --profile dev up -d   =>   [ api ] + [ db ] + [ db-admin ]
                                          (Ideal para el programador local)

docker compose --profile testing up  =>   [ api ] + [ db ] + [ e2e-tests ]
                                          (Ideal para el pipeline de CI/CD)

```

### Mecanismos de Activación

Existen dos formas estándar en la industria para activar perfiles:

**1. Mediante banderas (Flags) en la línea de comandos:**
Ideal para ejecuciones ad-hoc o manuales. Puedes pasar la bandera múltiples veces si necesitas combinar perfiles.

```bash
docker compose --profile dev --profile debug up -d

```

**2. Mediante Variables de Entorno (`COMPOSE_PROFILES`):**
Esta es la práctica recomendada para integrarlo en pipelines de CI/CD o en archivos `.env` locales de los desarrolladores, ya que evita tener que escribir comandos largos repetitivamente. Puedes separar múltiples perfiles por comas.

```bash
# En tu terminal o en un script de CI
export COMPOSE_PROFILES=dev,testing
docker compose up -d

```

### Casos de Uso Avanzados para Perfiles

Como Ingeniero DevOps, querrás usar perfiles estratégicamente para:

* **Agentes de Monitoreo:** Etiquetar servicios como Datadog Agent, Promtail o Node Exporter bajo un perfil `metrics` para activarlos solo en entornos que requieran observabilidad.
* **Migraciones y Seeders:** Crear servicios efímeros que ejecuten scripts de migración de base de datos (`flyway`, `prisma migrate`) bajo un perfil `migrate`, ejecutándolos solo cuando sea necesario.
* **Simuladores (Mocks):** En arquitecturas de microservicios, si un equipo de frontend solo necesita la API pero no quiere levantar las 15 bases de datos subyacentes, puedes crear un servicio de *mocking* (como WireMock) bajo un perfil `frontend-dev`.

Aunque los perfiles son increíblemente potentes, a veces hay configuraciones (como cambiar completamente de imagen base o modificar los mapeos de puertos para producción) que requieren un nivel de reescritura que los perfiles no pueden manejar limpiamente.

## 6.5. Extensión de configuraciones: Múltiples archivos Compose y `extends`

En la sección anterior utilizamos perfiles para encender o apagar servicios completos. Pero, ¿qué ocurre cuando necesitas que el *mismo* servicio se comporte de manera estructuralmente distinta según el entorno?

Imagina tu servicio `api`. En desarrollo, necesitas montar tu código local con un *bind mount* y abrir el puerto 3000 para probarlo directamente. En producción, la imagen ya contiene el código compilado (no hay *bind mount*), no debes exponer el puerto 3000 (porque estará detrás de un Nginx o un Load Balancer), y necesitas añadir políticas de reinicio agresivas (`restart: always`).

Usar perfiles aquí no sirve, porque tendrías que declarar dos servicios distintos (`api-dev` y `api-prod`), duplicando código. Para resolver este desafío sin violar el principio DRY (Don't Repeat Yourself), la especificación de Compose nos ofrece dos mecanismos a nivel Senior: **El patrón de archivos múltiples (Overrides)** y **la herencia mediante `extends**`.

---

### 1. El Patrón de Múltiples Archivos (Overrides)

Compose tiene una característica de diseño brillante: puede leer múltiples archivos YAML secuencialmente y fusionarlos en una única configuración final en memoria. El orden es vital: **el último archivo leído tiene la última palabra y sobrescribe a los anteriores.**

Por defecto, si ejecutas `docker compose up`, el motor busca automáticamente un archivo llamado `compose.yaml` y, si existe, aplica inmediatamente las reglas de un archivo llamado `compose.override.yaml` por encima de él.

Sin embargo, para entornos de despliegue específicos (CI/CD, Staging, Prod), la práctica estándar es ser explícito utilizando la bandera `-f` (file):

```bash
# Entorno de Producción: Une el archivo base con las reglas de producción
docker compose -f compose.yaml -f compose.prod.yaml up -d

```

**¿Cómo funciona la fusión (Merge)?**

Para dominar este patrón, debes entender cómo Compose decide qué conservar y qué sobrescribir:

1. **Valores de un solo elemento (Strings, booleanos):** El nuevo valor reemplaza completamente al original. (Ej. `image`, `command`).
2. **Diccionarios (Mapas clave-valor):** Se fusionan. Si la clave existe en ambos, gana el nuevo valor. Si son claves distintas, se combinan. (Ej. `environment`, `labels`).
3. **Listas (Arrays):** Generalmente se concatenan, pero en casos como `ports` o `volumes`, si colisionan en el mapeo del contenedor, el nuevo reemplaza al anterior.

**Ejemplo de Arquitectura Base + Override:**

*Archivo 1: `compose.yaml` (La base universal, agnóstica al entorno)*

```yaml
services:
  web:
    image: mi-empresa/frontend:latest
    environment:
      - API_URL=http://api:8080
    networks:
      - internal-net

```

*Archivo 2: `compose.dev.yaml` (Lo que el desarrollador ejecuta en local)*

```yaml
services:
  web:
    build: .                  # Sobrescribe la imagen preconstruida por un build local
    volumes:
      - ./src:/app/src        # Añade un volumen para hot-reloading
    ports:
      - "80:80"               # Expone el puerto al host local
    environment:
      - DEBUG_MODE=true       # Se fusiona con API_URL

```

El resultado final en memoria cuando el desarrollador ejecuta `docker compose -f compose.yaml -f compose.dev.yaml up` será un contenedor que se construye localmente, expone puertos, tiene el volumen montado y contiene ambas variables de entorno.

---

### 2. La directiva `extends`: Herencia de Servicios

Mientras que los archivos múltiples son ideales para adaptar *entornos* (Dev vs Prod), la directiva `extends` es perfecta para compartir configuraciones *entre servicios* dentro del mismo proyecto.

Supongamos que tienes una arquitectura basada en microservicios o procesos asíncronos donde tienes una `api`, un `worker-emails` y un `worker-pagos`. Los tres usan la misma imagen base, las mismas credenciales de base de datos y la misma configuración de logging. Escribir eso tres veces es un error.

Con `extends`, creas un servicio "plantilla" y haces que los demás hereden de él.

**Ejemplo de herencia con `extends`:**

```yaml
name: "sistema-workers"

services:
  # 1. El servicio base (Puede o no ejecutarse por sí solo)
  common-config:
    image: python:3.10-slim
    environment:
      - DB_HOST=postgres
      - DB_USER=admin
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # 2. El servicio real que hereda
  api-principal:
    extends:
      service: common-config   # Hereda todo lo de arriba
    command: uvicorn main:app --port 8000
    ports:
      - "8000:8000"

  # 3. Otro servicio que hereda la misma base
  worker-reportes:
    extends:
      service: common-config   # Hereda todo lo de arriba
    command: celery -A tareas worker --loglevel=info
    # Tiene una variable extra que se fusiona con las de base de datos
    environment:
      - COLA_PRIORIDAD=alta

```

**Nota Senior:** Puedes incluso extender servicios desde *otros archivos*. Por ejemplo: `file: plantillas.yaml` y `service: common-config`. Esto es útil en repositorios monorepo gigantes donde varios equipos comparten configuraciones base de seguridad estandarizadas por el equipo de plataforma.

---

### Resumen del Flujo de Decisión

```text
¿Necesitas modificar la configuración?
  |
  +-- ¿Es para encender/apagar herramientas extra? -> Usa PROFILES (6.4)
  |
  +-- ¿Es porque el entorno cambia (Dev/QA/Prod)?  -> Usa MÚLTIPLES ARCHIVOS (-f override)
  |
  +-- ¿Es para no repetir código entre 2 servicios? -> Usa EXTENDS

```

Dominar estas tres herramientas elimina el 90% del "código espagueti" en los manifiestos de infraestructura y prepara el terreno para automatizaciones elegantes.

## 6.6. Variables de entorno avanzadas y archivos `.env`

A lo largo de este capítulo, hemos definido variables de entorno directamente en nuestros archivos `compose.yaml` (por ejemplo, `POSTGRES_PASSWORD=secreto`). Para un entorno de prueba local rápido, esto es aceptable. Sin embargo, en el mundo real, subir credenciales, tokens de API o claves criptográficas a un repositorio de Git en texto plano es un incidente de seguridad grave (un antipatrón).

Además de la seguridad, la flexibilidad es clave. No deberías tener que editar el archivo `compose.yaml` cada vez que quieras cambiar el puerto de exposición de tu API o la etiqueta (tag) de la imagen a desplegar.

Para alcanzar el nivel Senior, debes dominar cómo Docker Compose maneja las variables de entorno, entendiendo una distinción que confunde a la mayoría de los principiantes: **Variables para Compose vs. Variables para el Contenedor.**

### La Gran Diferencia: Interpolación vs. Inyección

1. **Interpolación (Variables para Compose):** Son variables que el *motor* de Docker Compose lee desde tu máquina host para construir y evaluar el archivo YAML *antes* de crear los contenedores.
2. **Inyección (Variables para el Contenedor):** Son las variables que finalmente se inyectan dentro del sistema operativo aislado del contenedor para que tu aplicación (Node, Python, Java) las consuma.

```text
[Flujo de Variables de Entorno]

Tu Máquina (Host) / CI Pipeline
       |
       v
Archivo `.env` (Oculto, no versionado)
       |
       v
[ MOTOR DOCKER COMPOSE ] -- (Evalúa e interpola variables como ${TAG})
       |
       v
Archivo `compose.yaml` (Plantilla versionada)
       |
       v
[ CONTENEDORES EN EJECUCIÓN ] -- (Reciben variables vía 'environment' o 'env_file')

```

### 1. El archivo `.env` por defecto (Interpolación)

Por convención, si colocas un archivo llamado exactamente `.env` en el mismo directorio que tu `compose.yaml`, Docker Compose lo leerá automáticamente.

**Archivo `.env` (¡Asegúrate de añadirlo a tu `.gitignore`!):**

```env
# Variables dinámicas de configuración
API_PORT=8080
IMAGE_TAG=v2.1.0
DB_PASS=SuperSecretoProduccion99!

```

**Archivo `compose.yaml`:**

```yaml
services:
  api:
    # Compose reemplaza ${IMAGE_TAG} por v2.1.0
    image: mi-empresa/api:${IMAGE_TAG}
    ports:
      # Compose reemplaza ${API_PORT} por 8080
      - "${API_PORT}:3000"
    environment:
      # Inyectamos el valor evaluado al interior del contenedor
      - DATABASE_PASSWORD=${DB_PASS}

```

### 2. Sintaxis avanzada de interpolación en Bash

Compose soporta la sintaxis estándar de shell para manejar variables ausentes o vacías, lo cual hace que tus manifiestos sean a prueba de fallos:

* **Valores por defecto (`:-`):** `${API_PORT:-3000}`. Si `API_PORT` no está definida o está vacía en el entorno, Compose usará `3000`.
* **Errores obligatorios (`:?`):** `${DB_PASS:?La contraseña de BD es obligatoria}`. Si `DB_PASS` no existe, Compose abortará la ejecución inmediatamente y mostrará ese mensaje de error. Esto es vital en pipelines de CI/CD para evitar desplegar bases de datos sin contraseñas seguras.

### 3. La directiva `env_file` (Inyección masiva)

Si tu aplicación requiere 30 variables de entorno distintas (URLs de servicios, configuraciones de caché, tokens de SendGrid, etc.), listar cada una en el bloque `environment` del YAML lo hará ilegible.

Para solucionarlo, utilizamos la directiva `env_file`, que toma un archivo de texto plano y carga todas sus líneas directamente como variables de entorno *dentro* del contenedor.

```yaml
services:
  backend-pesado:
    image: django-app:latest
    env_file:
      - .env.shared           # Variables comunes (no sensibles)
      - .env.production.local # Secretos específicos del entorno

```

**Orden de precedencia crítico:** ¿Qué pasa si la misma variable existe en varios lugares? Docker Compose sigue un orden de prioridad estricto (del más fuerte al más débil):

1. Bloque `environment` en el `compose.yaml`.
2. El entorno del Shell desde donde ejecutas `docker compose up`.
3. El archivo pasado en `env_file`.
4. El archivo `.env` por defecto.
5. Las variables definidas en el Dockerfile mediante la instrucción `ENV`.

### Buenas prácticas definitivas para el control de versiones

El archivo `compose.yaml` **siempre** debe ir a tu repositorio (Git).
El archivo que contiene tus secretos (ej. `.env` o `.env.production`) **nunca** debe ir a Git.

Para mantener la experiencia de desarrollo (Developer Experience) fluida para los nuevos integrantes del equipo, crea siempre un archivo llamado `.env.example` o `.env.template` y súbelo al repositorio. Este archivo debe contener las claves, pero con valores de relleno o ficticios:

**Archivo `.env.example` (Este SÍ se sube a Git):**

```env
API_PORT=3000
IMAGE_TAG=latest
DB_PASS=cambiame_en_tu_entorno_local

```

Cuando un nuevo desarrollador clona el proyecto, su primer paso documentado será ejecutar: `cp .env.example .env` y ajustar los valores locales.

Con esto concluimos el Capítulo 6 y el bloque dedicado a Docker Compose. Has pasado de ejecutar comandos aislados a orquestar topologías multi-contenedor robustas, aisladas, seguras y parametrizadas dinámicamente.
