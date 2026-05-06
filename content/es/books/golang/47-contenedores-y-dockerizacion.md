En el ecosistema **Cloud Native**, un binario de Go es solo la mitad de la solución. El despliegue moderno exige encapsular la lógica en artefactos inmutables, ligeros y seguros. Este capítulo analiza cómo transformar tus aplicaciones en contenedores de producción siguiendo la filosofía de **máximo rendimiento y mínima superficie de ataque**.

Exploraremos desde la estructura idiomática de un `Dockerfile` hasta técnicas avanzadas de **compilación Multi-stage**, que permiten reducir imágenes de cientos de megabytes a solo unos pocos, utilizando la imagen `scratch`. Finalmente, optimizaremos el ciclo de vida del desarrollo gestionando eficientemente la caché de módulos para lograr compilaciones ultrarrápidas.

## 47.1. Mejores prácticas para escribir Dockerfiles para Go

A diferencia de los lenguajes interpretados o aquellos que dependen de máquinas virtuales pesadas (como Node.js o Java), la naturaleza compilada de Go ofrece una ventaja táctica significativa al trabajar con contenedores. El resultado de compilar una aplicación Go es un binario único que, en la mayoría de los casos, contiene todas sus dependencias. 

Sin embargo, escribir un `Dockerfile` idiomático y seguro para Go requiere más que simplemente ejecutar `go build` dentro de un contenedor. A continuación, se detallan las mejores prácticas fundamentales que debes aplicar, preparando el terreno para las optimizaciones avanzadas de las siguientes secciones.

### 1. El uso estricto de `.dockerignore`

El primer paso para un `Dockerfile` eficiente no ocurre dentro del archivo en sí, sino en el `.dockerignore`. Cuando ejecutas `docker build`, el demonio de Docker empaqueta todo el directorio actual (el contexto de construcción) y lo envía al motor. 

Enviar archivos innecesarios aumenta drásticamente el tiempo de construcción, consume memoria y, lo más crítico, puede exponer secretos o configuraciones locales en la imagen final.

**Ejemplo de un `.dockerignore` robusto para Go:**

```ignore
# Control de versiones y metadatos
.git
.gitignore

# Entornos de desarrollo y editores
.vscode/
.idea/
*.swp

# Dependencias locales (si usas vendoring local, aunque Go Modules es el estándar)
vendor/

# Binarios previos y archivos de pruebas
*.exe
*.test
*.out
bin/

# Archivos de entorno y secretos
.env
.env.*

# El propio Dockerfile
Dockerfile
```

### 2. Selección determinista de la imagen base

Nunca utilices la etiqueta `latest` para tus imágenes base (ej. `FROM golang:latest`). Esto rompe el principio de inmutabilidad y reproducibilidad; una construcción que funciona hoy podría fallar mañana si la imagen `latest` se actualiza a una nueva versión mayor de Go que introduzca cambios incompatibles.

Debes anclar (pin) tanto la versión de Go como la distribución subyacente del sistema operativo.

```dockerfile
# Mal: Sujeto a cambios impredecibles
FROM golang:latest

# Bien: Determinista y específico
FROM golang:1.21.5-bookworm
```

*Nota: La elección entre distribuciones basadas en Debian (como `bookworm` o `bullseye`) y Alpine Linux (`alpine`) tiene implicaciones directas en el uso de Cgo, que discutimos en el Capítulo 46. Si tu aplicación requiere Cgo, las imágenes basadas en Debian suelen presentar menos problemas de compatibilidad con la biblioteca estándar de C (glibc vs musl).*

### 3. Configuración del entorno de compilación (Flags)

El compilador de Go es altamente configurable a través de variables de entorno. Al construir dentro de Docker, debes ser explícito sobre la arquitectura y el sistema operativo objetivo, especialmente si estás preparando el terreno para binarios estáticos.

```dockerfile
ENV GOOS=linux
ENV GOARCH=amd64
ENV CGO_ENABLED=0
```

* `GOOS` y `GOARCH`: Aseguran que el binario compilado corresponda a la arquitectura del contenedor final, independientemente de la máquina anfitriona que ejecute el `docker build`.
* `CGO_ENABLED=0`: Esta es quizás la variable más importante. Desactiva Cgo, forzando a Go a compilar un binario 100% estático. Esto significa que el binario no dependerá de bibliotecas dinámicas del sistema operativo (como `libc`), lo cual es un requisito previo indispensable para usar imágenes mínimas como `scratch` (tema que profundizaremos en la sección 47.2).

### 4. Ejecución sin privilegios (Principio de Mínimo Privilegio)

Por defecto, los contenedores de Docker ejecutan sus procesos como el usuario `root`. En un entorno de producción, esto es un riesgo de seguridad crítico (una vulnerabilidad en tu aplicación Go podría dar a un atacante acceso de superusuario dentro del contenedor o, en caso de una mala configuración del runtime, en el host).

La mejor práctica es crear un usuario no privilegiado explícitamente para ejecutar el binario.

```dockerfile
# Crear un usuario y grupo sin privilegios
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup --no-create-home --uid 1000 appuser

# ... (Instrucciones de compilación) ...

# Cambiar al usuario no privilegiado antes de ejecutar la aplicación
USER appuser:appgroup

ENTRYPOINT ["/ruta/al/binario"]
```

### 5. Exposición de puertos y metadatos

Aunque la instrucción `EXPOSE` en un `Dockerfile` no publica los puertos automáticamente (eso se hace en tiempo de ejecución con `docker run -p`), sirve como documentación vital para los consumidores de tu imagen y para herramientas de orquestación.

Además, el uso de etiquetas (`LABEL`) ayuda a mantener la trazabilidad de la imagen en tu registro de contenedores.

```dockerfile
LABEL maintainer="equipo-backend@empresa.com"
LABEL version="1.0"
LABEL description="Microservicio de procesamiento de pagos"

# Documentar el puerto en el que escucha el servidor net/http (Capítulo 24)
EXPOSE 8080
```

### 6. Ordenación lógica de las capas (Layers)

Docker construye las imágenes mediante capas apiladas y utiliza un sistema de caché. Si una capa cambia, Docker invalida la caché de esa capa y de todas las subsecuentes. Por lo tanto, debes ordenar las instrucciones de tu `Dockerfile` de las que cambian con **menor frecuencia** a las que cambian con **mayor frecuencia**.

El código fuente de tu aplicación cambia constantemente, pero tus dependencias (`go.mod`) cambian con mucha menos frecuencia. Separar la copia de las dependencias de la copia del código fuente es una técnica crucial para la velocidad de iteración. 

*(La implementación técnica y optimización profunda de esta caché de módulos, `GOMODCACHE`, se abordará de manera exhaustiva en la sección 47.3).*

## 47.2. Compilaciones Multi-stage y generación de binarios estáticos ultraligeros (`scratch`)

En la sección anterior establecimos las bases de un `Dockerfile` seguro y predecible. Sin embargo, si nos detenemos ahí y utilizamos la imagen oficial de Go (por ejemplo, `golang:1.22-bookworm`) como el entorno de ejecución final, nos enfrentaremos a un problema grave: **el tamaño y la superficie de ataque**.

Una imagen base de Go incluye el compilador, herramientas del sistema operativo (bash, curl, apt), librerías dinámicas y el código fuente completo. Esto genera imágenes que fácilmente superan los 800 MB. Enviar todo este herramental a un entorno de producción es ineficiente a nivel de red, costoso en almacenamiento y, desde el punto de vista de la seguridad, proporciona a un atacante potencial un entorno sumamente rico para ejecutar código malicioso.

Aquí es donde brilla una de las características más potentes del ecosistema de Go: la capacidad de generar **binarios estáticos autocontenidos** y combinarlos con el patrón de **compilación Multi-stage** (Multi-stage builds) de Docker.

### 1. El concepto de Multi-stage Build

Una compilación Multi-stage nos permite usar múltiples instrucciones `FROM` en un solo `Dockerfile`. Cada `FROM` inicia una nueva "etapa" de construcción. La magia radica en que podemos copiar selectivamente artefactos de una etapa anterior a la etapa final, descartando todo el entorno de compilación que ya no necesitamos.

Típicamente, dividimos el proceso en dos etapas:
1.  **El Builder (Constructor):** Utiliza una imagen pesada con el compilador de Go. Aquí descargamos dependencias, ejecutamos tests y compilamos el código fuente.
2.  **El Runner (Ejecutor):** Utiliza una imagen base mínima (o vacía). Copiamos *únicamente* el binario compilado desde el Builder y lo ejecutamos.

### 2. La imagen `scratch`: El vacío absoluto

Docker proporciona una imagen especial y reservada llamada `scratch`. Es una imagen literalmente vacía: 0 bytes. No tiene sistema operativo, no tiene shell (`/bin/sh`), no tiene gestor de paquetes y no tiene sistema de archivos predeterminado.

Dado que Go, con `CGO_ENABLED=0`, compila binarios 100% estáticos que ya contienen en sí mismos todo lo necesario para interactuar directamente con el kernel de Linux (sin requerir bibliotecas dinámicas en el espacio de usuario como `libc`), `scratch` es el destino perfecto para nuestras aplicaciones.

### 3. Los "Gotchas" de usar `scratch`

El vacío absoluto de `scratch` trae consigo desafíos técnicos que deben resolverse en la etapa del *Builder* antes de copiar el binario. Si simplemente copias tu aplicación a `scratch`, es probable que te encuentres con pánicos y errores en tiempo de ejecución:

* **Falta de Certificados Raíz:** Si tu aplicación realiza peticiones HTTP a APIs externas (Capítulo 24), fallará al verificar la conexión TLS porque `scratch` no tiene el archivo de certificados raíz (`ca-certificates`).
* **Falta de Información de Zonas Horarias:** Si utilizas funciones del paquete `time` como `time.LoadLocation` (Capítulo 14), la aplicación entrará en pánico porque no existe el directorio `/usr/share/zoneinfo`.
* **Falta de Usuarios:** En la sección 47.1 aprendimos a no ejecutar procesos como `root`. Sin embargo, en `scratch` no existe el archivo `/etc/passwd`. No puedes usar la instrucción `USER appuser` si el sistema no sabe qué es ese usuario.

### 4. El Dockerfile Definitivo para Producción

Para resolver todos estos problemas de forma elegante, el *Builder* debe preparar tanto el binario como los metadatos del sistema operativo.

A continuación, se presenta un `Dockerfile` idiomático y completo que aplica estos conceptos:

```dockerfile
# ==========================================
# Etapa 1: Builder
# ==========================================
FROM golang:1.22-bookworm AS builder

# Configuración estricta para compilación estática (Ver 47.1)
ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

WORKDIR /build

# 1. Preparar dependencias del sistema operativo (Certificados y Timezones)
RUN apt-get update && apt-get install -y ca-certificates tzdata && update-ca-certificates

# 2. Crear un usuario sin privilegios en el Builder
# Utilizamos flags específicos para asegurar que sea un usuario de sistema sin shell
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid 1000 \
    appuser

# 3. Descargar módulos de Go (Preparando terreno para 47.3)
COPY go.mod go.sum ./
RUN go mod download

# 4. Copiar el código y compilar
COPY . .
# Optimizamos el binario: -w (quita DWARF) y -s (quita tabla de símbolos)
RUN go build -ldflags="-w -s" -o /build/api-server ./cmd/api


# ==========================================
# Etapa 2: Runner (La imagen final)
# ==========================================
FROM scratch

# Documentación básica
LABEL maintainer="equipo-backend@empresa.com"
EXPOSE 8080

# 1. Importar los certificados TLS y la zona horaria desde el Builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# 2. Importar el usuario y grupo sin privilegios
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# 3. Importar el binario compilado
COPY --from=builder /build/api-server /api-server

# Cambiar al usuario importado antes de arrancar
USER appuser:appuser

# Punto de entrada inmutable
ENTRYPOINT ["/api-server"]
```

### Anatomía de la optimización del binario

En el comando de compilación del ejemplo anterior, hemos introducido las banderas del enlazador (linker flags): `-ldflags="-w -s"`. 

* `-w`: Omite la generación de información de depuración DWARF.
* `-s`: Omite la tabla de símbolos.

Al prescindir de esta información (que no es útil en un entorno de producción cerrado, ya que el trazado distribuido y el logging estructurado —Partes 11 y 12 del libro— son nuestras verdaderas herramientas de diagnóstico), podemos reducir el peso del binario final hasta en un 30%. 

El resultado de esta compilación Multi-stage es una imagen final de Docker que pesa exactamente lo mismo que el binario de tu aplicación (a menudo entre 10 MB y 25 MB). Tienes una imagen hiper-segura, sin shell interactivo, que arranca en milisegundos y está perfectamente alineada con la filosofía Cloud Native.

## 47.3. Gestión de la caché de módulos (GOMODCACHE) y compilación durante la construcción de imágenes

Hemos logrado reducir drástically el tamaño y la superficie de ataque de nuestra imagen final mediante compilaciones Multi-stage y el uso de `scratch`. Sin embargo, si observas el tiempo que tarda en ejecutarse el comando `docker build` en un entorno de integración continua (o en tu máquina local tras limpiar el sistema), notarás un cuello de botella evidente: la descarga iterativa de dependencias.

Go es rápido compilando, pero la red es el eslabón más débil. Descargar docenas (o cientos) de megabytes de módulos externos en cada construcción rompe el ciclo rápido de retroalimentación que buscamos. Aquí es donde entra en juego la gestión avanzada de la caché de Docker en combinación con las variables de entorno de Go: `GOMODCACHE` y `GOCACHE`.

### 1. La estrategia base: Invalidadción de capas (Layer Caching)

Como adelantamos brevemente en las secciones anteriores, la primera línea de defensa contra construcciones lentas es entender cómo Docker invalida sus capas. Docker procesa el `Dockerfile` de arriba hacia abajo. Si un archivo copiado cambia, esa capa y **todas las siguientes** se invalidan y deben reconstruirse desde cero.

El código fuente de tu aplicación cambia constantemente. Tus dependencias (`go.mod` y `go.sum`) cambian con mucha menor frecuencia. 

**El patrón estándar (y obligatorio):**

```dockerfile
# MAL: Invalida la descarga de módulos con cualquier cambio en el código
COPY . .
RUN go mod download
RUN go build -o api-server .

# BIEN: Utiliza la caché de capas de Docker
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o api-server .
```

En el patrón correcto, mientras no modifiques `go.mod` o `go.sum`, Docker utilizará la versión en caché de la capa `RUN go mod download`. El paso `COPY . .` posterior detectará los cambios en tu código fuente y solo reejecutará el `go build`.

### 2. El problema del patrón estándar

El enfoque anterior es bueno, pero tiene un límite estricto: ¿Qué sucede cuando agregas una sola dependencia nueva a tu proyecto? 

El archivo `go.mod` cambia. Docker invalida la caché de la capa `RUN go mod download`. Como resultado, Go vuelve a descargar **absolutamente todos** los módulos desde cero, no solo el nuevo. En proyectos grandes, esto puede añadir minutos valiosos al tiempo de construcción.

### 3. La solución definitiva: Docker BuildKit y `--mount=type=cache`

Para resolver este problema de raíz, debemos dejar de depender exclusivamente de la caché de capas de Docker y empezar a utilizar los montajes de caché de **BuildKit** (el motor de construcción moderno de Docker, activo por defecto en versiones recientes).

BuildKit nos permite montar un directorio persistente que sobrevive entre diferentes ejecuciones de `docker build`. Le diremos a Docker que guarde los módulos descargados (`GOMODCACHE`) y los artefactos de compilación intermedios (`GOCACHE`) en este volumen temporal.

**Implementación avanzada en el Builder:**

```dockerfile
FROM golang:1.22-bookworm AS builder

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

WORKDIR /build

COPY go.mod go.sum ./

# Montamos el GOMODCACHE de Go en una caché de BuildKit.
# El target estándar para la caché de módulos en Linux es /go/pkg/mod
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Montamos tanto GOMODCACHE como GOCACHE.
# GOCACHE almacena resultados de compilación parciales para acelerar 'go build'.
# El target estándar de GOCACHE para el usuario root es /root/.cache/go-build
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags="-w -s" -o /build/api-server ./cmd/api
```

### ¿Cómo funciona esto por debajo?

1.  **Persistencia real:** Cuando ejecutas `docker build`, la instrucción `RUN --mount=type=cache...` adjunta un volumen temporal administrado por el demonio de Docker. 
2.  **Adición de dependencias:** Si modificas tu `go.mod` añadiendo un nuevo paquete, la capa se invalida y el comando `go mod download` se ejecuta. Sin embargo, gracias al montaje de caché, el directorio `/go/pkg/mod` **ya contiene** todos los módulos descargados en construcciones anteriores. Go solo descargará el paquete nuevo, reduciendo el tiempo de red a casi cero.
3.  **Aceleración de compilación (`GOCACHE`):** Al montar también `/root/.cache/go-build` durante el comando `go build`, el compilador de Go reutiliza los paquetes de tu propio proyecto que no han sufrido modificaciones desde la última vez que construiste la imagen.

### Consideraciones en entornos CI/CD

Esta técnica es brillante para el desarrollo local, pero requiere una configuración específica cuando nos movemos a plataformas de integración continua (como GitHub Actions o GitLab CI). Dado que los "runners" de CI suelen ser efímeros (se destruyen tras cada ejecución), la caché interna de BuildKit también se perdería. 

En la próxima sección de tu libro (Capítulo 48), deberás abordar cómo exportar e importar estas cachés de BuildKit utilizando el backend externo del registro de contenedores (`--cache-to` y `--cache-from`) o las acciones específicas de la plataforma, así como la configuración de la variable `GOPRIVATE` para descargar módulos desde repositorios privados durante esta fase de construcción.
