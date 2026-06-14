En este capítulo, trascendemos el uso básico de contenedores para dominar el arte de la creación de imágenes profesionales. Comprender la **anatomía por capas** y el sistema **UnionFS** es el primer paso para dejar de tratar a las imágenes como cajas negras y empezar a verlas como estructuras de datos optimizables. A través del dominio del **Dockerfile**, exploraremos técnicas de **BuildKit**, **multi-stage builds** y el uso de imágenes **Scratch** o **Alpine**. El objetivo es claro: transformar el proceso de construcción en una ventaja competitiva, garantizando artefactos ultraligeros, trazables y con una superficie de ataque mínima para entornos productivos.

## 3.1. Anatomía de una imagen de Docker y el sistema de archivos por capas (UnionFS)

En los capítulos anteriores, desmitificamos la ejecución de los contenedores y cómo interactúan con el kernel del host a través de *namespaces* y *cgroups*. Ahora, es el momento de diseccionar el artefacto que hace todo esto posible: **la imagen de Docker**.

Para un ingeniero DevOps, concebir una imagen simplemente como "un archivo que contiene mi aplicación" es un error conceptual peligroso. A diferencia de las máquinas virtuales tradicionales que utilizan discos virtuales monolíticos (como `.vmdk` o `.qcow2`), las imágenes de Docker no son un único bloque de datos. Son, en realidad, un sofisticado rompecabezas compuesto por múltiples componentes independientes y de solo lectura.

### El concepto de Capas (Layers)

La característica arquitectónica más importante de una imagen de Docker es que está construida mediante **capas**. Cada vez que una instrucción en un Dockerfile (que exploraremos a fondo en la próxima sección) modifica el sistema de archivos—por ejemplo, instalando un paquete, copiando código fuente o cambiando permisos—Docker crea una nueva capa.

Estas capas tienen tres características fundamentales:

1. **Son inmutables:** Una vez que una capa se construye, no puede ser modificada.
2. **Son apilables:** Cada nueva capa se coloca exactamente encima de la anterior, registrando únicamente las diferencias (los cambios o adiciones) respecto a la capa subyacente.
3. **Son compartidas:** Si dos imágenes diferentes utilizan la misma capa base (por ejemplo, ambas parten de `ubuntu:22.04`), Docker almacena esa capa base solo una vez en el disco físico del host. Esto ahorra drásticamente espacio de almacenamiento y tiempo de transferencia en la red.

### UnionFS: La magia de la unificación

Si una imagen está compuesta por docenas de capas separadas, ¿cómo es que cuando entras a un contenedor con un comando `exec` (como vimos en el Capítulo 2) ves un único sistema de archivos coherente? Aquí es donde entra en juego el **Union File System (UnionFS)**.

UnionFS es un servicio del sistema operativo que permite montar múltiples directorios (en este caso, las capas de Docker) en un único punto de montaje virtual. En las versiones modernas de Docker, el driver de almacenamiento por defecto que implementa esta lógica en Linux suele ser **`overlay2`**.

Imagina el sistema de archivos como unas láminas de acetato transparente apiladas una sobre otra:

```text
+-------------------------------------------------------+
|  CAPA DEL CONTENEDOR (Lectura/Escritura - Efímera)    |  <-- Creada al hacer `docker run`
+-------------------------------------------------------+
|  Capa 4: Código fuente de la App (Solo lectura)       |  <-- Instrucción COPY
+-------------------------------------------------------+
|  Capa 3: Dependencias de NodeJS (Solo lectura)        |  <-- Instrucción RUN npm install
+-------------------------------------------------------+
|  Capa 2: Actualizaciones del OS (Solo lectura)        |  <-- Instrucción RUN apt-get update
+-------------------------------------------------------+
|  Capa 1: Imagen Base / RootFS (Solo lectura)          |  <-- Instrucción FROM ubuntu
+-------------------------------------------------------+

```

* **Visibilidad descendente:** Si un archivo existe en la Capa 4 y en la Capa 1, UnionFS te mostrará el de la Capa 4. La capa superior siempre "eclipsa" u oculta a los archivos con el mismo nombre en las capas inferiores.
* **La Capa del Contenedor:** Cuando inicias un contenedor, Docker añade una capa superior, delgada y vacía, de **lectura/escritura (R/W)** encima de la pila de capas de solo lectura de la imagen. Todos los cambios que el contenedor hace durante su ejecución (crear archivos, escribir logs locales, modificar configuraciones) ocurren *exclusivamente* en esta capa superior.

### Copy-on-Write (CoW): Eficiencia en tiempo de ejecución

Como DevOps, debes comprender perfectamente el mecanismo **Copy-on-Write (CoW)**. Es la estrategia que usa Docker para maximizar la eficiencia y proteger la inmutabilidad de la imagen.

¿Qué sucede si un contenedor necesita modificar un archivo que existe en una de las capas inferiores de solo lectura?

1. **Búsqueda (Search):** Docker busca el archivo a través de UnionFS, de arriba hacia abajo, hasta encontrarlo.
2. **Copia (Copy):** Docker copia ese archivo desde la capa inferior de solo lectura hacia la capa superior de lectura/escritura del contenedor.
3. **Escritura (Write):** El contenedor realiza la modificación sobre esa copia en su propia capa. El archivo original en la capa de la imagen permanece intacto.

> **Nota de rendimiento:** El proceso de copiar un archivo grande (por ejemplo, una base de datos o un log pesado) hacia la capa R/W por primera vez induce latencia y consume I/O. Esta es la razón principal por la que **nunca** debes usar el sistema de archivos del contenedor para persistir datos pesados o de bases de datos, un problema que solucionaremos usando Volúmenes en el Capítulo 4.

### Inspeccionando la anatomía interna

Aunque un contenedor se abstraiga de esta complejidad, los metadatos de la imagen exponen su verdadera estructura. Si utilizas el comando de inspección, puedes ver exactamente qué identificadores SHA256 componen el `RootFS` (Root File System) de tu imagen:

```bash
# Inspeccionando las capas de una imagen
$ docker inspect --format='{{json .RootFS.Layers}}' nginx:alpine

[
  "sha256:82436d40f4e3c9...",
  "sha256:5b671a8163f9a7...",
  "sha256:1a84b069fae5dc...",
  "sha256:d82dc8122d2568...",
  "sha256:4a0c84c16b20ed..."
]

```

*Cada hash en este array representa el contenido comprimido de una capa individual.*

Además de las capas, la anatomía de una imagen se completa con un **Manifest (Manifiesto)** en formato JSON. Este archivo actúa como el "mapa del tesoro", indicándole a Docker el orden exacto en el que debe apilar estas capas, junto con configuraciones por defecto (como puertos a exponer, variables de entorno y el comando de inicio que se ejecutará).

Comprender esta arquitectura estratificada es el requisito número uno para escribir Dockerfiles eficientes. Cada capa añade peso, y entender cómo el sistema UnionFS las consolida será tu principal ventaja táctica al optimizar los tiempos de despliegue y el tamaño de tus artefactos en las siguientes secciones.

## 3.2. Instrucciones fundamentales del Dockerfile (`FROM`, `RUN`, `COPY`, `ADD`, `CMD`, `ENTRYPOINT`)

Si la imagen de Docker es el artefacto final y UnionFS es el motor que la consolida, el **Dockerfile** es el código fuente. Para un ingeniero DevOps, un Dockerfile no es simplemente un script de instalación; es una declaración de infraestructura inmutable. Cada instrucción que escribes aquí dicta cómo se formarán las capas que analizamos en la sección anterior.

Para dominar la creación de imágenes, debes interiorizar el propósito y el impacto de las seis instrucciones fundamentales. Podemos dividirlas conceptualmente en tres categorías: **fundación**, **construcción** y **ejecución**.

### 1. La Fundación: `FROM`

Todo Dockerfile válido debe comenzar con la instrucción `FROM` (con la única excepción técnica de los argumentos `ARG` previos). Esta instrucción define la **imagen base** sobre la cual construirás tu aplicación.

```dockerfile
# Sintaxis: FROM <imagen>:<etiqueta>
FROM ubuntu:22.04

```

> **Consejo Senior:** Nunca utilices la etiqueta `latest` en entornos de producción. Rompe el principio de inmutabilidad y reproducibilidad. Si `ubuntu:latest` se actualiza mañana, una reconstrucción de tu imagen podría introducir cambios no probados que rompan tu aplicación. Fija siempre versiones específicas (ej. `node:18.17.0-alpine3.18`).

### 2. Tiempo de Construcción (Build Time): `RUN`, `COPY` y `ADD`

Estas instrucciones son los "obreros" de tu imagen. Modifican el sistema de archivos y, como aprendimos, **cada una de ellas genera una nueva capa** en tu imagen final.

#### `RUN`

Ejecuta cualquier comando en una nueva capa sobre la imagen actual y consolida los resultados (hace un *commit* de la capa). Es la herramienta principal para instalar paquetes, compilar código o crear directorios.

```dockerfile
# Forma Shell (ejecuta a través de /bin/sh -c)
RUN apt-get update && apt-get install -y curl

# Forma Exec (arreglo JSON, no invoca un shell por defecto)
RUN ["apt-get", "install", "-y", "nginx"]

```

**Nota de optimización:** Notarás que en el primer ejemplo encadenamos los comandos con `&&`. Si hiciéramos un `RUN apt-get update` seguido de un `RUN apt-get install` en líneas separadas, crearíamos dos capas distintas. Esto arruina la eficiencia del caché de Docker (un tema que abordaremos a fondo en la sección 3.4).

#### `COPY` y `ADD`

Ambas instrucciones sirven para transferir archivos o directorios desde tu máquina host (el contexto de construcción o *build context*) hacia el sistema de archivos de la imagen.

```dockerfile
# Sintaxis: COPY <origen> <destino>
COPY ./app/package.json /usr/src/app/

```

* **`COPY`:** Es la forma directa, transparente y predecible de copiar archivos y directorios locales.
* **`ADD`:** Hace lo mismo que `COPY`, pero con "superpoderes" adicionales: puede descargar archivos desde URLs remotas y puede extraer automáticamente archivos comprimidos (tar) soportados en el destino.

*(Profundizaremos en la regla de oro sobre cuándo usar exactamente cada una en la sección 3.3).*

### 3. Tiempo de Ejecución (Runtime): `CMD` y `ENTRYPOINT`

Mientras que `RUN` se ejecuta al construir la imagen (`docker build`), `CMD` y `ENTRYPOINT` **no ejecutan nada durante la construcción**. Su único propósito es definir la configuración por defecto de lo que sucederá cuando el contenedor arranque (`docker run`).

#### `CMD` (Comando por defecto)

Define el comando y/o los parámetros por defecto que se ejecutarán en el contenedor.

```dockerfile
# Ejecuta el servidor de desarrollo de Node
CMD ["npm", "start"]

```

La característica principal de `CMD` es que **es fácilmente reemplazable**. Si un usuario ejecuta `docker run mi-imagen bash`, el comando `bash` sobreescribe completamente el `CMD` definido en el Dockerfile.

#### `ENTRYPOINT` (Punto de entrada)

Configura el contenedor para que se ejecute como un ejecutable estricto.

```dockerfile
# Obliga al contenedor a ejecutar siempre este binario
ENTRYPOINT ["nginx", "-g", "daemon off;"]

```

A diferencia de `CMD`, `ENTRYPOINT` es mucho más difícil de ignorar al ejecutar el contenedor (requiere el flag `--entrypoint`). Si pasas argumentos adicionales al final de `docker run`, estos no reemplazarán al `ENTRYPOINT`, sino que se añadirán al final del mismo como parámetros.

## 3.3. Diferencias críticas: `COPY` vs `ADD` y `CMD` vs `ENTRYPOINT`

En la sección anterior vimos la sintaxis básica de las instrucciones de construcción y ejecución. Sin embargo, en el día a día de un ingeniero DevOps, la elección entre `COPY` y `ADD`, o entre `CMD` y `ENTRYPOINT`, suele ser fuente constante de errores, vulnerabilidades de seguridad y contenedores que se comportan de forma impredecible.

A continuación, desglosaremos estas similitudes engañosas y estableceremos reglas claras para su uso.

### 1. La batalla de la transferencia de archivos: `COPY` vs `ADD`

Ambas instrucciones tienen el mismo objetivo fundamental: introducir archivos desde el contexto de construcción (tu máquina o servidor CI) al sistema de archivos de la imagen. La diferencia radica en la "magia" implícita que incluye `ADD`.

| Característica | `COPY` | `ADD` |
| --- | --- | --- |
| **Copia de archivos locales** | Sí | Sí |
| **Descarga desde URLs remotas** | No | Sí |
| **Extracción automática de `.tar` locales** | No | Sí |
| **Predictibilidad** | Alta (Lo que ves es lo que hay) | Baja (Comportamiento variable según el origen) |

**El problema con `ADD`:**
Históricamente, `ADD` fue la primera instrucción en existir. Su capacidad para descargar desde URLs parece útil, pero tiene un defecto fatal en el diseño de capas: **no te permite eliminar el archivo descargado en la misma capa**.

Si haces un `ADD https://ejemplo.com/archivo.tar.gz /tmp/` y luego un `RUN rm /tmp/archivo.tar.gz`, el archivo ya quedó solidificado en la capa de la instrucción `ADD`, inflando el tamaño de tu imagen para siempre.

> **Regla de Oro (Best Practice):** Utiliza **siempre `COPY**`. La instrucción `COPY` es transparente y explícita.
> Solo debes usar `ADD` en un caso muy específico: cuando necesitas extraer automáticamente un archivo comprimido local (tar, gzip, bzip2) directamente en el sistema de archivos de la imagen (ej. `ADD rootfs.tar.xz /`). Para descargar archivos de internet, utiliza `RUN wget ... && tar ... && rm ...` en una sola capa.

### 2. La batalla del arranque: `CMD` vs `ENTRYPOINT`

Aquí es donde ocurren el 90% de las confusiones en tiempo de ejecución. Ambas instrucciones le dicen al contenedor qué hacer al arrancar, pero tienen roles arquitectónicos muy distintos.

* **`CMD` define argumentos o comandos por defecto.** Es complaciente; si el usuario pasa un argumento al final de `docker run`, `CMD` se hace a un lado y es sobrescrito por completo.
* **`ENTRYPOINT` define el binario principal.** Es estricto; convierte a tu contenedor en un ejecutable cerrado. Los argumentos que pase el usuario en `docker run` no lo sobrescribirán, sino que se le añadirán como parámetros extra.

#### La matriz de interacción

El verdadero poder (y complejidad) surge cuando **combinas ambas instrucciones** en un mismo Dockerfile. Cuando haces esto, `CMD` deja de ser un comando y se convierte en los *argumentos por defecto* que se le pasarán al `ENTRYPOINT`.

Observa cómo interactúan en el siguiente diagrama de texto plano:

```text
# Dockerfile
ENTRYPOINT ["ping"]
CMD ["-c", "3", "localhost"]

```

**Escenario A: Ejecución sin argumentos**
`$ docker run mi-ping`
*Resultado:* Docker concatena ambas instrucciones y ejecuta `ping -c 3 localhost`.

**Escenario B: El usuario inyecta argumentos**
`$ docker run mi-ping google.com`
*Resultado:* El argumento `google.com` **sobrescribe** al `CMD`, pero respeta al `ENTRYPOINT`. Docker ejecuta `ping google.com`.

| Escenario de uso ideal | Instrucción recomendada |
| --- | --- |
| Contenedor de propósito general (ej. una imagen base de Ubuntu donde el usuario podría querer abrir un `bash` o iniciar un servicio). | Solo **`CMD`** |
| Contenedor de propósito único diseñado para actuar como un binario de CLI (ej. un contenedor que solo ejecuta Terraform o AWS CLI). | **`ENTRYPOINT`** (con **`CMD`** opcional para argumentos por defecto). |

#### La trampa del formato: Shell vs. Exec

Existe un detalle crítico de bajo nivel que debes dominar. Ambas instrucciones pueden escribirse en dos formatos:

1. **Formato Shell:** `CMD node index.js`
2. **Formato Exec (Recomendado):** `CMD ["node", "index.js"]`

Si utilizas el formato Shell (sin los corchetes JSON), Docker antepone automáticamente `/bin/sh -c` a tu comando. Esto significa que el proceso principal (PID 1) de tu contenedor será el shell de Linux, no tu aplicación NodeJS.

¿Por qué es esto peligroso en DevOps? Porque si le envías una señal de apagado al contenedor (`docker stop`, que envía un `SIGTERM`), el shell atrapará esa señal y **no se la pasará a tu aplicación**. Tu aplicación nunca sabrá que debe cerrarse limpiamente, lo que puede corromper datos o retrasar los reinicios en Kubernetes. Usar siempre el **formato Exec (JSON)** asegura que tu aplicación sea el PID 1 y reciba las señales del sistema operativo correctamente.

Con estas diferencias aclaradas, ya tienes la base para crear Dockerfiles funcionales y seguros.

## 3.4. Optimización del caché de construcción (Build cache)

En un entorno local, esperar cinco minutos a que se construya una imagen puede parecer un simple inconveniente. Sin embargo, en un pipeline de CI/CD corporativo donde decenas de desarrolladores hacen *push* de código constantemente, esos cinco minutos se multiplican, creando un cuello de botella masivo que retrasa las entregas y consume recursos de cómputo costosos.

Dominar el **caché de construcción (Build cache)** de Docker es, sin duda, una de las habilidades de mayor impacto inmediato que un ingeniero DevOps puede aportar a un equipo.

### ¿Cómo funciona la invalidación del caché?

Como vimos en la sección 3.1, cada instrucción en tu Dockerfile (`RUN`, `COPY`, `ADD`) genera una nueva capa. Durante el proceso de compilación (`docker build`), Docker revisa si ya existe en su sistema una capa idéntica creada previamente. Si la encuentra, la reutiliza (*Caché Hit*); si no, la construye desde cero (*Caché Miss*).

La regla fundamental y más implacable del caché de Docker es la **invalidación en cascada**: si el caché de una capa se invalida, **todas las capas subsecuentes también se invalidan automáticamente**, sin importar si sus instrucciones cambiaron o no.

Observa el efecto de cascada en este diagrama en texto plano de una reconstrucción cuando solo hemos modificado una línea de nuestro código fuente:

```text
[ CACHÉ HIT ]  Capa 1: FROM node:18-alpine
[ CACHÉ HIT ]  Capa 2: WORKDIR /app
[ CACHÉ MISS]  Capa 3: COPY . .         <-- Detecta un cambio en el código fuente (Invalidado)
[ REBUILD ]    Capa 4: RUN npm install  <-- Se reconstruye obligatoriamente, ignorando el caché
[ REBUILD ]    Capa 5: CMD ["npm", "start"]

```

En este escenario desastroso, un simple cambio en el texto de un `index.html` obliga a Docker a reinstalar cientos de megabytes de dependencias (Capa 4), porque la capa anterior (Capa 3) fue invalidada.

### La Regla de Oro: Ordenar de Menor a Mayor Volatilidad

Para evitar la situación anterior, debes estructurar tu Dockerfile siguiendo un principio estricto: **coloca las instrucciones que cambian con menor frecuencia en la parte superior, y las que cambian constantemente en la parte inferior.**

#### El antipatrón de las dependencias (La trampa del Junior)

El error más común al empaquetar aplicaciones (Node.js, Python, Go, etc.) es copiar todo el directorio de trabajo antes de instalar las dependencias.

**❌ Dockerfile ineficiente (El código fuente invalida las dependencias):**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
# Copiamos TODO (código + requirements.txt)
COPY . .
# Cualquier cambio en el código fuerza una reinstalación de pip
RUN pip install -r requirements.txt
CMD ["python", "app.py"]

```

#### La solución Senior: Separación de la copia

Para optimizar esto, debemos separar la copia de los archivos que declaran las dependencias (`requirements.txt`, `package.json`, `go.mod`) del resto del código fuente.

**✅ Dockerfile optimizado (El caché protege a las dependencias):**

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# 1. Copiamos SOLO el archivo de dependencias
COPY requirements.txt .

# 2. Instalamos las dependencias (Esta capa se cacheará a menos que requirements.txt cambie)
RUN pip install -r requirements.txt

# 3. Copiamos el resto del código fuente (Altamente volátil)
COPY . .

CMD ["python", "app.py"]

```

Con esta pequeña refactorización geométrica, la capa de `RUN pip install` aprovechará el caché en el 99% de los *builds*. Solo cuando un desarrollador agregue o actualice una librería en el `requirements.txt`, Docker ejecutará la instalación nuevamente.

### Manejo de caché en gestores de paquetes del OS (`apt-get`, `apk`)

Otra trampa común ocurre al instalar paquetes del sistema operativo. Considera el siguiente escenario:

```dockerfile
RUN apt-get update
RUN apt-get install -y nginx

```

Si ejecutas esto hoy, Docker cachea ambas capas. Si dentro de tres meses añades `curl` a la segunda línea (`RUN apt-get install -y nginx curl`), Docker invalidará la segunda capa, pero **reutilizará el caché de la primera**. Esto significa que intentará instalar los paquetes usando una lista de repositorios obsoleta de hace tres meses, lo que provocará fallos de "paquete no encontrado".

> **Mejor Práctica (Cache Busting):** Siempre encadena `update` e `install` en la misma capa lógica, y limpia los archivos temporales al final para no inflar la imagen.
>
> ```dockerfile
> RUN apt-get update && apt-get install -y \
>     nginx \
>     curl \
>     && rm -rf /var/lib/apt/lists/*
> 
> ```
>
>
> De esta forma, si cambias los paquetes a instalar, toda la instrucción se invalida, forzando un `update` fresco.

### Banderas útiles de CLI para el caché

Como ingeniero, habrá momentos donde necesites intervenir manualmente en este comportamiento:

* **`docker build --no-cache`**: Ignora completamente el caché local y reconstruye todo desde cero. Útil para depurar o forzar la obtención de parches de seguridad de la imagen base.
* **`docker build --build-arg BUILDKIT_INLINE_CACHE=1`**: Etiqueta la imagen con metadatos de caché incrustados, permitiendo que los sistemas de CI/CD utilicen imágenes del registry como fuente de caché distribuido (un tema que abordaremos en profundidad en el Capítulo 7).

Con una estrategia de caché sólida, tus tiempos de construcción caerán drásticamente.

## 3.5. Builds Multi-etapa (Multi-stage builds) para imágenes ligeras

En las secciones anteriores aprendimos a optimizar el caché y a reducir el número de capas. Sin embargo, existe un problema estructural inherente a la creación de contenedores para lenguajes compilados (como Go, Java, C++) o aplicaciones de frontend complejas (como React o Angular): **necesitamos herramientas pesadas para construir el código, pero no para ejecutarlo.**

Para un ingeniero DevOps, enviar una imagen de producción de 1.2 GB que incluye compiladores, librerías de desarrollo, el código fuente original y tokens de acceso temporales es un fallo crítico de diseño. No solo encarece los costos de almacenamiento y transferencia, sino que expande masivamente la **superficie de ataque** ante posibles vulnerabilidades (CVEs).

### El viejo paradigma: El "Builder Pattern"

Antes de la versión 17.05 de Docker, la comunidad resolvía esto usando dos Dockerfiles distintos y un script bash intermediario:

1. Se construía una imagen "builder" pesada.
2. Se creaba un contenedor temporal a partir de ella para extraer el binario compilado mediante un volumen o `docker cp`.
3. Se construía una segunda imagen "limpia" inyectando ese binario.

Este enfoque era funcional pero rústico, difícil de mantener y rompía la elegancia de tener toda la definición en un solo lugar. La solución definitiva llegó con los **Builds Multi-etapa (Multi-stage builds)**.

### La mecánica del Multi-stage Build

Un Dockerfile multi-etapa te permite utilizar múltiples instrucciones `FROM` en un mismo archivo. Cada `FROM` inicia una nueva "etapa" (stage) de construcción con su propio sistema de archivos independiente.

La verdadera magia ocurre porque **puedes copiar selectivamente artefactos de una etapa anterior hacia la etapa final**, desechando todo lo demás. La imagen resultante solo contendrá las capas de la última etapa.

Observa este flujo en el siguiente diagrama conceptual:

```text
+---------------------------------------------------+
|  ETAPA 1: "builder" (Imagen pesada: golang:1.20)  |
|  - Instala dependencias                           |
|  - Copia código fuente (.go)                      |
|  - Ejecuta 'go build' -> Genera binario 'api'     |
+---------------------------------------------------+
                          |
     (Se desechan SDKs, código fuente y cachés)
                          |
                          v  Instrucción: COPY --from=builder /app/api /usr/bin/
+---------------------------------------------------+
|  ETAPA 2: Final (Imagen ligera: alpine:latest)    |
|  - Recibe SOLO el binario compilado               |
|  - Define el ENTRYPOINT ["api"]                   |
+---------------------------------------------------+
= IMAGEN FINAL PARA PRODUCCIÓN (Tamaño: ~15 MB)

```

### Ejemplo Práctico: Compilando una API en Go

Veamos cómo se traduce esta arquitectura en un Dockerfile de nivel Senior. Usaremos Go por ser el estándar de facto en herramientas Cloud Native, pero el principio aplica exactamente igual para compilar un `.jar` de Java o los estáticos de un `npm run build` en Node.js.

```dockerfile
# --- ETAPA 1: Construcción (Builder) ---
# Nombramos la etapa usando 'AS builder'
FROM golang:1.20-alpine AS builder

WORKDIR /src

# Optimizamos el caché descargando dependencias primero
COPY go.mod go.sum ./
RUN go mod download

# Copiamos el código fuente y compilamos
COPY . .
# CGO_ENABLED=0 asegura un binario estático sin dependencias de C
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/mi-api main.go

# --- ETAPA 2: Producción (Release) ---
# Iniciamos una imagen completamente nueva y ligera
FROM alpine:3.18

WORKDIR /app

# Importante: Copiamos SOLO el binario desde la etapa 'builder'
COPY --from=builder /app/mi-api .

# Configuramos la ejecución
EXPOSE 8080
ENTRYPOINT ["./mi-api"]

```

### Impacto en el ciclo de vida de la aplicación

Adoptar este patrón tiene ramificaciones profundas y positivas en toda tu infraestructura:

1. **Reducción de tamaño extremo:** Pasas de una imagen base de Golang de ~800 MB a una imagen de Alpine de ~5 MB más el peso de tu binario (aprox. 15-20 MB en total).
2. **Seguridad por diseño:** Al no incluir el sistema operativo completo, ni shells (`/bin/sh`), ni gestores de paquetes (`apt`, `apk`), mitigas drásticamente el riesgo de que un atacante pueda ejecutar comandos si logra vulnerar tu aplicación.
3. **Protección de la propiedad intelectual:** El código fuente original jamás forma parte de la imagen final que subes a tu Docker Registry; solo viaja el artefacto compilado.
4. **Caché inteligente por etapas:** Docker es lo suficientemente inteligente como para no reconstruir la etapa `builder` si detecta que otra etapa independiente falló, aislando los procesos de caché.

El uso de builds multi-etapa es la línea divisoria más clara entre un contenedor creado para desarrollo y un artefacto profesional listo para despliegues masivos en Kubernetes o entornos Serverless.

## 3.6. Reducción drástica del tamaño de la imagen (Alpine Linux, Scratch)

En la sección anterior vimos cómo los *Multi-stage builds* nos permiten separar las herramientas de compilación del artefacto final. Ahora la pregunta crítica es: ¿sobre qué base vamos a ejecutar ese artefacto limpio?

Para un ingeniero DevOps Senior, utilizar imágenes base como `ubuntu` (aprox. 70 MB) o `node` (aprox. 300 MB) a la ligera es una mala práctica. Estas imágenes incluyen un sistema operativo casi completo con gestores de paquetes, utilidades de red (`curl`, `wget`) y un shell (`bash`). En producción, cada megabyte adicional aumenta los tiempos de despliegue, el costo de almacenamiento y, lo más grave, **expande la superficie de ataque**. Si un atacante logra comprometer tu aplicación, encontrará un ecosistema completo de herramientas listas para usar dentro del contenedor.

La solución definitiva es reducir el sistema operativo base a su mínima expresión utilizando **Alpine Linux** o **Scratch**.

### Alpine Linux: El equilibrio perfecto

Alpine Linux es una distribución de Linux orientada a la seguridad, ligera y sencilla. Mientras que la imagen base de Ubuntu pesa decenas de megabytes, la imagen base de Alpine pesa apenas **5 MB**.

Lo logra reemplazando las herramientas estándar de GNU con alternativas ultraligeras:

* **BusyBox:** Proporciona las utilidades del sistema de forma compacta.
* **musl libc:** Reemplaza a la tradicional `glibc` de Linux.
* **apk:** Su propio gestor de paquetes ultrarrápido (`apk add --no-cache`).

**El "Gotcha" de Alpine (Conocimiento Senior):**
El cambio de `glibc` a `musl` es la principal fuente de dolores de cabeza para los desarrolladores. Si intentas ejecutar un binario precompilado que depende dinámicamente de `glibc` (como muchas librerías de C/C++ en Python, o extensiones nativas en Node.js) dentro de Alpine, fallará silenciosamente o lanzará errores de "archivo no encontrado" aunque el archivo exista.

Si tu aplicación requiere `glibc` estrictamente y el rendimiento de la compilación desde cero en Alpine es inaceptable, las imágenes tipo `slim` (como `debian:bullseye-slim`) son un punto intermedio válido.

```dockerfile
# Ejemplo de etapa final con Alpine
FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/mi-api .
# apk add --no-cache permite instalar sin dejar residuos temporales
RUN apk add --no-cache ca-certificates tzdata
CMD ["./mi-api"]

```

### Scratch: La nada absoluta

Si Alpine es el minimalismo, `scratch` es el vacío. En el ecosistema de Docker, `scratch` es una palabra reservada que hace referencia a una imagen literalmente vacía. Tiene 0 bytes. No hay sistema de archivos, no hay shell, no hay binarios.

Esta es la opción más segura y eficiente posible, pero está reservada casi exclusivamente para **lenguajes compilados que generan binarios estáticos** (como Go, Rust, C o C++), donde todas las dependencias se empaquetan dentro del mismo archivo ejecutable.

```dockerfile
# Ejemplo de etapa final usando scratch
FROM scratch
WORKDIR /
COPY --from=builder /app/mi-api /mi-api
ENTRYPOINT ["/mi-api"]

```

**Los tres desafíos de usar Scratch en producción:**
Al no haber sistema operativo, te enfrentarás a problemas de infraestructura que normalmente das por sentados. Un ingeniero DevOps debe saber cómo inyectar estos elementos desde la etapa de *build*:

1. **Resolución de nombres (DNS):** Muchos binarios fallarán al intentar resolver dominios si no tienen configuraciones de red básicas.
2. **Peticiones HTTPS (Certificados CA):** Si tu aplicación en Go intenta hacer una petición a una API externa con HTTPS, fallará por falta de certificados de confianza. Debes copiar los certificados desde la imagen constructora: `COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/`
3. **Usuarios y permisos:** `scratch` no tiene un archivo `/etc/passwd`. Si quieres ejecutar el contenedor como un usuario no root (una práctica obligatoria en DevSecOps), debes crear el usuario en el *builder* y copiar los archivos `/etc/passwd` y `/etc/group` a la imagen `scratch`.

### Tabla comparativa para la toma de decisiones

| Característica | Ubuntu / Debian | Alpine | Scratch |
| --- | --- | --- | --- |
| **Tamaño Base** | ~70 MB | ~5 MB | 0 Bytes |
| **Librería C** | glibc | musl libc | N/A |
| **Shell incluido** | Sí (bash) | Sí (ash) | No |
| **Casos de uso ideales** | Desarrollo, debug, apps legacy pesadas. | APIs, microservicios, Node.js, Python, Ruby. | Binarios estáticos (Go, Rust). Seguridad extrema. |
| **Superficie de ataque** | Alta | Baja | Nula |

Dominar el espectro desde imágenes pesadas hasta el uso de `scratch` es lo que te permite diseñar arquitecturas verdaderamente eficientes para la nube.

## 3.7. Gestión de metadatos (`LABEL`) y argumentos de construcción (`ARG`)

Hasta ahora hemos construido imágenes estáticas, rápidas y seguras. Sin embargo, en un ecosistema DevOps maduro, una imagen de Docker rara vez existe en el vacío. Debe interactuar con pipelines de CI/CD, herramientas de escaneo de seguridad y orquestadores. Para lograr esto sin modificar el código fuente del contenedor, Docker nos proporciona dos herramientas fundamentales: **`LABEL`** para la descripción y **`ARG`** para la parametrización.

Es crucial entender que estas instrucciones operan en un plano administrativo y no añaden peso al sistema de archivos del contenedor.

### 1. `LABEL`: El ADN de tu imagen

La instrucción `LABEL` permite agregar metadatos a una imagen mediante pares clave-valor. A diferencia de un archivo `README.md` que reside dentro del contenedor, los *labels* son legibles desde el exterior usando el demonio de Docker, sin necesidad de ejecutar o instanciar la imagen.

```dockerfile
# Sintaxis básica
LABEL mantenedor="equipo-devops@empresa.com"
LABEL version="1.5.0"
LABEL entorno="produccion"

```

**El estándar de la industria (OCI Annotations):**
Un ingeniero Senior no inventa sus propias claves de metadatos a menos que sea estrictamente necesario. La comunidad ha estandarizado un conjunto de etiquetas bajo la **Open Container Initiative (OCI)**. Adoptar este estándar garantiza que herramientas de terceros (como GitHub Container Registry, GitLab CI o ArgoCD) puedan leer y categorizar tus imágenes automáticamente.

```dockerfile
# Ejemplo de uso de OCI Annotations
LABEL org.opencontainers.image.title="Microservicio de Pagos"
LABEL org.opencontainers.image.description="Procesa transacciones con Stripe"
LABEL org.opencontainers.image.source="https://github.com/empresa/pagos"
LABEL org.opencontainers.image.licenses="MIT"

```

**Filtrado operativo:**
En el día a día, los *labels* son extremadamente útiles para la limpieza y el mantenimiento. Puedes instruir a Docker para que elimine solo las imágenes que coincidan con ciertas etiquetas:

```bash
# Elimina todos los contenedores creados para el entorno de pruebas
$ docker system prune --filter "label=entorno=testing"

```

### 2. `ARG`: Parametrización en tiempo de construcción

Si necesitas que tu Dockerfile sea reutilizable para diferentes entornos o versiones, la instrucción `ARG` es la respuesta. Define variables que los usuarios pueden pasar al demonio en el momento exacto de ejecutar `docker build`.

**Características clave de `ARG`:**

* **Vida efímera:** Las variables `ARG` **no existen** dentro del contenedor en tiempo de ejecución (a diferencia de `ENV`). Desaparecen en cuanto finaliza el *build*.
* **Flexibilidad de la imagen base:** Es la única instrucción que puede preceder al primer `FROM`.

```dockerfile
# Permite inyectar la versión de Node desde el pipeline de CI/CD
ARG NODE_VERSION=18-alpine

# El FROM utiliza el argumento
FROM node:${NODE_VERSION}

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]

```

Para sobreescribir el valor por defecto (`18-alpine`) durante la construcción, usarías la bandera `--build-arg`:

```bash
docker build --build-arg NODE_VERSION=20-alpine -t mi-app:v2 .

```

### 3. La sinergia perfecta: Trazabilidad absoluta con CI/CD

El uso más poderoso de estas dos instrucciones ocurre cuando las combinamos. Una de las prácticas fundamentales en DevSecOps es la trazabilidad: dada una imagen en producción, debes ser capaz de saber exactamente de qué *commit* de Git provino.

Podemos lograr esto inyectando el hash del commit desde nuestro pipeline (GitHub Actions, Jenkins, etc.) mediante un `ARG`, y plasmándolo permanentemente en la imagen usando un `LABEL`.

```dockerfile
FROM golang:1.20-alpine AS builder
# ... (etapa de construcción) ...

FROM alpine:3.18
COPY --from=builder /app/api /api

# 1. Declaramos que esperamos recibir este argumento durante el build
ARG GIT_COMMIT_HASH

# 2. Asignamos ese argumento a un metadato permanente de la imagen
LABEL org.opencontainers.image.revision=${GIT_COMMIT_HASH}

ENTRYPOINT ["/api"]

```

Durante el pipeline, el comando de compilación se vería así:

```bash
docker build --build-arg GIT_COMMIT_HASH=$(git rev-parse HEAD) -t mi-api:latest .

```

### La advertencia Senior: El peligro de los secretos en `ARG`

Existe un antipatrón crítico de seguridad que debes evitar a toda costa. Es tentador usar `ARG` para pasar tokens de acceso privados (por ejemplo, un token de NPM o una llave SSH para descargar repositorios privados durante el `RUN npm install`).

**Nunca uses `ARG` para datos sensibles.**

Aunque la variable no persista como variable de entorno en el contenedor final, **sí queda registrada en el historial de construcción de la imagen**. Cualquier persona con acceso a la imagen descargada puede ejecutar `$ docker history mi-imagen` y ver tu token en texto plano expuesto en la capa donde se utilizó el argumento.

Abordaremos la forma correcta y segura de inyectar secretos usando BuildKit en el próximo capítulo de Seguridad y en la sección 3.8.

## 3.8. Uso de BuildKit para construcciones paralelas y eficientes

Hasta hace algunos años, el motor de construcción por defecto de Docker (el *Legacy Builder*) leía el Dockerfile línea por línea, de arriba hacia abajo, y ejecutaba cada instrucción de forma estrictamente secuencial. Si tenías un *Multi-stage build* con una etapa para compilar el frontend y otra para el backend, el motor esperaba a terminar una para empezar la otra, desperdiciando valiosos recursos de CPU.

Todo esto cambió con la llegada de **BuildKit**.

BuildKit es el motor de construcción de nueva generación para Docker. Es tan superior en rendimiento, seguridad y eficiencia que Docker lo ha convertido en el estándar por defecto en las versiones modernas (a partir de Docker Engine 23.0 y Docker Desktop). Para asegurarte de que lo estás usando en entornos más antiguos, basta con exportar la variable de entorno `DOCKER_BUILDKIT=1` antes de ejecutar `docker build`.

Para habilitar las características avanzadas de BuildKit en tu Dockerfile, es una buena práctica (y a veces obligatorio) incluir la directiva de sintaxis en la primera línea de tu archivo:

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04

```

Como ingeniero DevOps, hay tres "superpoderes" de BuildKit que debes dominar e implementar en tus pipelines:

### 1. Grafo de dependencias y Ejecución Paralela

BuildKit no lee tu Dockerfile como un script secuencial. En su lugar, lo analiza completo y construye un **Grafo Acíclico Dirigido (DAG)**. Esto le permite entender qué etapas dependen de cuáles.

Si tienes etapas independientes, **BuildKit las compilará en paralelo**. Además, si defines una etapa en tu Dockerfile pero el resultado final (la etapa exportada) no la utiliza, BuildKit es lo suficientemente inteligente como para ignorarla por completo, ahorrando tiempo.

```text
Flujo Legacy (Secuencial y lento):
[Inicio] -> [Construir Frontend] -> [Construir Backend] -> [Ensamblar Imagen Final] -> [Fin]

Flujo BuildKit (Paralelo e inteligente):
[Inicio] ---> [Construir Frontend] ---\
                                       ---> [Ensamblar Imagen Final] -> [Fin]
         ---> [Construir Backend]  ---/

```

### 2. Resolución del problema de los secretos (`--mount=type=secret`)

En la sección 3.7 advertimos que usar `ARG` o `ENV` para pasar tokens de acceso (como credenciales de AWS o tokens de NPM para repositorios privados) es un fallo crítico de seguridad, ya que los secretos quedan incrustados en el historial de la imagen.

BuildKit soluciona esto introduciendo los **montajes de tipo secreto**. Esto permite que el contenedor acceda a un secreto *solo* durante la ejecución de la instrucción `RUN` específica, sin guardarlo en el sistema de archivos final ni en el historial de capas.

**Ejemplo: Instalando dependencias de Node.js desde un registro privado**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:18-alpine
WORKDIR /app
COPY package.json .

# El archivo .npmrc se monta temporalmente solo para este comando
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    npm install

COPY . .
CMD ["npm", "start"]

```

Al construir la imagen, le pasamos el secreto desde nuestra máquina local o pipeline:

```bash
docker build --secret id=npm_token,src=$HOME/.npmrc -t mi-app-segura .

```

*Resultado:* Las dependencias se instalan, el archivo `.npmrc` jamás forma parte de la imagen final y `$ docker history` no mostrará ninguna credencial.

### 3. Agentes SSH sin comprometer llaves (`--mount=type=ssh`)

Si tu aplicación necesita clonar un repositorio privado de Git durante la compilación, copiar tu llave privada `id_rsa` dentro de la imagen es otra práctica inaceptable. BuildKit te permite reenviar la conexión de tu agente SSH local directamente al constructor.

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine
# Instalamos git y ssh
RUN apk add --no-cache git openssh-client

# Configuramos github.com en los hosts conocidos
RUN mkdir -p -m 0700 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts

# Clonamos usando el agente SSH reenviado
RUN --mount=type=ssh git clone git@github.com:mi-empresa/repo-privado.git /app

```

Ejecución:

```bash
# Permite a Docker usar tu agente SSH actual
$ docker build --ssh default -t mi-app-git .

```

### 4. Caché de compilación avanzado (`--mount=type=cache`)

En la sección 3.4 optimizamos el caché estructurando bien nuestras capas. Pero, ¿qué pasa si invalidamos la capa de dependencias? Herramientas como `npm`, `pip` o `go` tienen que volver a descargar todo desde internet, aunque muchos de esos paquetes ya se hubieran descargado en compilaciones anteriores de otros proyectos.

BuildKit permite montar un directorio persistente en el host dedicado exclusivamente a guardar el caché de estas herramientas entre múltiples compilaciones (incluso si la capa de Docker se invalida).

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.20-alpine AS builder
WORKDIR /src
COPY . .

# Mantenemos el caché de Go entre builds para evitar descargas redundantes
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -o /app/api main.go

```

Con estas herramientas en tu arsenal, tus Dockerfiles ya no son simples scripts de empaquetado; son pipelines de construcción profesionales, seguros y altamente optimizados.

¡Con esto concluimos el **Capítulo 3** completo! Hemos pasado desde la anatomía más básica hasta las optimizaciones de nivel Senior con BuildKit.
