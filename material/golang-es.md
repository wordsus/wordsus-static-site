## Parte 1: Fundamentos del Lenguaje Go

**Capítulo 1: Introducción y Entorno de Desarrollo**
1.1. Historia, filosofía y diseño de Go
1.2. Instalación y configuración del workspace (GOPATH vs Go Modules)
1.3. Dominando la CLI de Go (build, run, fmt, vet, doc)
1.4. Estructura estándar de un proyecto (Standard Go Project Layout)

**Capítulo 2: Sintaxis Básica y Tipos de Datos Primarios**
2.1. Declaración de variables, constantes y el operador `:=`
2.2. Tipos de datos numéricos, booleanos y cadenas de texto
2.3. Conversión de tipos explícita (Casting)
2.4. Ámbito de las variables (Scope) y variables no utilizadas (Blank identifier)

**Capítulo 3: Flujo de Control**
3.1. Condicionales: if, else if, else (y sentencias de inicialización)
3.2. Declaraciones switch (múltiples casos, fallthrough) y select
3.3. El único bucle de Go: for (clásico, condicional, infinito) y for range
3.4. Control de saltos: break, continue y goto

**Capítulo 4: Funciones y Manejo Básico de Errores**
4.1. Declaración de funciones y múltiples valores de retorno
4.2. Funciones variádicas
4.3. Funciones anónimas y cierres (Closures)
4.4. El tipo `error` y el paradigma idiomático de control de errores
4.5. Control de pánico: defer, panic y recover

## Parte 2: Tipos Compuestos y Orientación a Objetos en Go

**Capítulo 5: Estructuras de Datos Integradas**
5.1. Arrays y sus limitaciones de memoria
5.2. Slices: anatomía interna (longitud, capacidad, puntero subyacente)
5.3. Funciones nativas para Slices (append, copy) y gestión de memoria
5.4. Maps: declaración, iteración, borrado y comprobación de existencia

**Capítulo 6: Punteros y Estructuras (Structs)**
6.1. Punteros en Go: paso por valor vs. paso por referencia
6.2. Definición, inicialización y campos anónimos en Structs
6.3. Composición de Structs (Embedding) en lugar de herencia
6.4. Etiquetas de Structs (Struct Tags) para metadatos

**Capítulo 7: Métodos e Interfaces**
7.1. Declaración de métodos: Receptores de valor vs. Receptores de puntero
7.2. Interfaces implícitas (Duck Typing) y satisfacción de contratos
7.3. La interfaz vacía (`interface{}` / `any`)
7.4. Aserciones de tipo (Type Assertions) y Type Switches

## Parte 3: Concurrencia en Go

**Capítulo 8: Goroutines**
8.1. El modelo de concurrencia M:N de Go
8.2. Creación, ejecución y ciclo de vida de una Goroutine
8.3. Entendiendo el Planificador de Go (Go Scheduler)
8.4. Prevención de fugas de Goroutines (Goroutine Leaks)

**Capítulo 9: Canales (Channels)**
9.1. Canales con y sin búfer (Buffered vs Unbuffered)
9.2. Operaciones de envío, recepción y cierre de canales
9.3. Iteración segura sobre canales usando `range`
9.4. Direccionalidad de canales y multiplexación con la instrucción `select`

**Capítulo 10: Sincronización y Data Races**
10.1. El paquete `sync`: Mutex y RWMutex
10.2. WaitGroup y Cond
10.3. Optimizaciones con `sync.Once` y `sync.Pool`
10.4. El detector de carreras de datos (Race Detector)
10.5. Operaciones atómicas con el paquete `sync/atomic`

**Capítulo 11: Patrones de Concurrencia**
11.1. Patrón Worker Pool
11.2. Patrón Fan-in y Fan-out
11.3. Patrón Pipeline
11.4. Patrón Semaphore

## Parte 4: La Standard Library de Go

**Capítulo 12: Fundamentos de I/O**
12.1. Interfaces maestras: `io.Reader` e `io.Writer`
12.2. Manejo y lectura de archivos con el paquete `os`
12.3. Entrada y salida optimizada con búfer (`bufio`)
12.4. Manipulación segura de rutas de archivos (`path/filepath`)

**Capítulo 13: El Paquete Context**
13.1. Propósito y valores del Contexto en el ciclo de vida de una petición
13.2. Contextos con cancelación manual (`WithCancel`)
13.3. Contextos con límites de tiempo (`WithTimeout`, `WithDeadline`)
13.4. Antipatrones: Cuándo y cómo pasar valores a través del Contexto

**Capítulo 14: Fechas, Utilidades y Reflexión**
14.1. Manejo del tiempo, duraciones y temporizadores (`time`)
14.2. Expresiones regulares en Go (`regexp`)
14.3. Reflexión en tiempo de ejecución (`reflect`) y sus penalizaciones de rendimiento
14.4. Manipulación de strings y codificaciones (`strings`, `unicode`)

**Capítulo 15: Criptografía Básica y Codificación**
15.1. Serialización y deserialización de JSON y XML nativa
15.2. Codificación Base64 y Hexadecimal
15.3. Generación de Hashes criptográficos (SHA-256, MD5)

## Parte 5: Testing a Fondo

**Capítulo 16: Fundamentos de Testing en Go**
16.1. La convención de archivos `_test.go` y el paquete `testing`
16.2. Table-Driven Tests (Pruebas basadas en tablas)
16.3. Manejo de estado: `Setup` y `Teardown` en tests
16.4. Análisis de cobertura de código (Code Coverage)

**Capítulo 17: Mocks, Stubs, Fakes y TDD**
17.1. Inyección de dependencias enfocada al Testing
17.2. Creación manual de Mocks y Stubs utilizando Interfaces
17.3. Herramientas del ecosistema (Gomock, Mockery, Testify)
17.4. Behavior-Driven Development (BDD) en Go con Ginkgo

**Capítulo 18: Testing de Integración y Testcontainers**
18.1. Diferencias de alcance entre tests unitarios y de integración
18.2. Introducción y configuración de Testcontainers-go
18.3. Instanciación efímera de Bases de Datos (PostgreSQL, Redis, MongoDB)
18.4. Gestión de ciclos de vida de contenedores y limpieza de estado
18.5. Carga de datos de prueba (Fixtures) en entornos Testcontainers

**Capítulo 19: Benchmarking y Fuzzing**
19.1. Escritura y ejecución de pruebas de rendimiento (`testing.B`)
19.2. Análisis de asignaciones de memoria en tests (`-benchmem`)
19.3. Conceptos fundamentales de Fuzz Testing nativo
19.4. Creación de Fuzz targets (`testing.F`) para descubrir casos límite

## Parte 6: Arquitectura y Diseño de Software

**Capítulo 20: Principios de Diseño y Clean Code en Go**
20.1. Aplicación idiomática de los principios SOLID en Go
20.2. Nomenclatura, exportación de variables y organización de paquetes
20.3. Manejo centralizado de configuraciones (Viper, variables de entorno)
20.4. Frameworks de Inyección de Dependencias (Wire, Dig) vs. Inyección manual

**Capítulo 21: Arquitectura Limpia y Hexagonal**
21.1. Principio de separación de responsabilidades
21.2. Puertos y Adaptadores (Ports and Adapters)
21.3. Estructuración de capas: Dominio, Aplicación e Infraestructura
21.4. Inversión de dependencias en la práctica

**Capítulo 22: Domain-Driven Design (DDD) Básico**
22.1. Modelado de Entidades, Value Objects y Agregados en Structs
22.2. Implementación de Repositorios y Factorías
22.3. Manejo de Eventos de Dominio en memoria
22.4. Mapeo del Lenguaje Ubicuo al código fuente

**Capítulo 23: Patrones de Diseño Clásicos en Go**
23.1. Patrones Creacionales (Builder, Singleton seguro en concurrencia)
23.2. Patrones Estructurales (Adapter, Decorator, Facade)
23.3. Patrones de Comportamiento (Strategy, Observer)

## Parte 7: Desarrollo de APIs RESTful

**Capítulo 24: Fundamentos HTTP en Go**
24.1. El paquete `net/http`: Servidores y Clientes robustos
24.2. Creación de Handlers y uso del `ServeMux` nativo
24.3. Lectura de Request Body, Query Params y escritura de Responses
24.4. Manejo correcto de cabeceras y códigos de estado HTTP

**Capítulo 25: Enrutamiento (Routers) y Middlewares**
25.1. El enrutador avanzado de la standard library (Go 1.22+)
25.2. Routers de terceros de alto rendimiento (Chi, Gin, Echo)
25.3. Diseño, implementación y encadenamiento de Middlewares
25.4. Middlewares esenciales: Logging, Recovery y CORS

**Capítulo 26: Validación, Paginación y Respuestas**
26.1. Validación estructurada de payloads (go-playground/validator)
26.2. Estrategias de paginación de datos (Offset/Limit vs Cursor-based)
26.3. Filtros dinámicos y ordenamiento en peticiones GET
26.4. Respuestas estandarizadas y manejo de errores (Problem Details RFC 7807)

**Capítulo 27: Documentación de APIs**
27.1. Especificación OpenAPI / Swagger
27.2. Generación automática de documentación a partir del código (swaggo)
27.3. Versionado de APIs RESTful en Go

## Parte 8: Persistencia de Datos y Bases de Datos

**Capítulo 28: SQL y el paquete database/sql**
28.1. Conexión a bases de datos relacionales y manejo del Ping
28.2. Ejecución de consultas preparadas (Prepared Statements) de forma segura
28.3. Configuración y optimización de Connection Pools
28.4. Escaneo manual de filas (Rows) a Structs

**Capítulo 29: Herramientas SQL Avanzadas, Query Builders y ORMs**
29.1. Uso de `sqlx` para simplificar el mapeo de datos
29.2. Construcción dinámica de consultas con Query Builders (Squirrel)
29.3. Generación de código Go a partir de SQL puro (sqlc)
29.4. Mapeo Objeto-Relacional (ORMs): GORM y Ent
29.5. Análisis comparativo: Cuándo usar ORM vs SQL puro

**Capítulo 30: Transacciones y Migraciones**
30.1. Manejo de Transacciones (Tx) y propiedades ACID
30.2. Control de niveles de aislamiento (Isolation Levels)
30.3. Herramientas de migración de esquemas (golang-migrate, goose)
30.4. Estrategias para migraciones de bases de datos sin tiempo de inactividad

**Capítulo 31: Bases de Datos NoSQL y Caché**
31.1. Integración con Redis (go-redis) y estrategias de caching distribuido
31.2. Modelado de documentos y conexión con MongoDB (mongo-go-driver)
31.3. Uso de bases de datos clave-valor embebidas en Go (bbolt, BadgerDB)

## Parte 9: Comunicación Avanzada y Microservicios

**Capítulo 32: De Monolito a Microservicios**
32.1. Desacoplamiento de dominios y comunicación inter-servicios
32.2. Patrones de Service Discovery y Configuración Distribuida
32.3. Implementación de resiliencia: Circuit Breaker y Retries (paquete hystrix-go o heimdall)

**Capítulo 33: gRPC y Protocol Buffers**
33.1. Introducción a Protobuf: Sintaxis y compilador (`protoc`)
33.2. Definición de servicios, mensajes y generación de código Go
33.3. Implementación de servidores y clientes gRPC
33.4. Patrones de comunicación: Streaming Unario, Servidor, Cliente y Bidireccional
33.5. Interceptores gRPC (Middlewares para gRPC)

**Capítulo 34: Message Brokers y Event-Driven Architecture**
34.1. Conceptos fundamentales de sistemas orientados a eventos
34.2. Producción y consumo asíncrono con RabbitMQ (AMQP)
34.3. Procesamiento masivo de flujos de datos con Apache Kafka (sarama / confluent-kafka-go)
34.4. NATS y NATS JetStream para alta disponibilidad y baja latencia

**Capítulo 35: GraphQL en Go**
35.1. Diferencias arquitectónicas entre REST y GraphQL
35.2. Definición de Esquemas, Queries, Mutations y Subscriptions
35.3. Implementación de servidores usando `gqlgen`
35.4. Optimización de consultas de bases de datos y el patrón Dataloader (Resolución N+1)

## Parte 10: Seguridad en Aplicaciones Backend

**Capítulo 36: Vulnerabilidades Comunes y Mitigación**
36.1. OWASP Top 10 aplicado a aplicaciones Go
36.2. Prevención de Cross-Site Scripting (XSS) mediante `html/template`
36.3. Protección contra Inyección SQL nativa y mitigación de CSRF
36.4. Análisis estático de seguridad en pipelines automatizados (gosec)

**Capítulo 37: Autenticación, Autorización y Criptografía Aplicada**
37.1. Generación y validación segura de JSON Web Tokens (JWT / PASETO)
37.2. Integración de flujos OAuth2 y OpenID Connect
37.3. Hashing de contraseñas seguro (Bcrypt, Argon2)
37.4. Modelos de autorización: RBAC y ABAC con Casbin

**Capítulo 38: Seguridad a Nivel de Red y Aplicación**
38.1. Configuración de servidores HTTPS seguros (TLS moderno)
38.2. Manejo y rotación de secretos en producción (HashiCorp Vault)
38.3. Implementación de Rate Limiting (`golang.org/x/time/rate`) contra ataques de fuerza bruta y DDoS

## Parte 11: Observabilidad y Monitoreo

**Capítulo 39: Logging Estructurado**
39.1. La evolución hacia el logging estructurado
39.2. Dominando el nuevo estándar de Go: el paquete `log/slog`
39.3. Librerías de terceros (Zap, Zerolog) y su impacto en rendimiento
39.4. Rastreo de peticiones con IDs de correlación a través de microservicios

**Capítulo 40: Métricas**
40.1. Tipos de métricas: Counters, Gauges, Histograms, Summaries
40.2. Instrumentación de código Go para Prometheus
40.3. Exposición y securización de endpoints `/metrics`
40.4. Creación de dashboards efectivos en Grafana

**Capítulo 41: Tracing Distribuido**
41.1. Anatomía de un Trace: Trazas y Spans
41.2. Instrumentación neutral de proveedores con OpenTelemetry (OTel)
41.3. Propagación de contexto W3C a través de HTTP y gRPC
41.4. Visualización de cuellos de botella con Jaeger o herramientas Cloud

**Capítulo 42: Health Checks y Probes**
42.1. Implementación profunda de Liveness y Readiness probes
42.2. Exposición del estado interno de dependencias (Bases de datos, Caches)
42.3. Monitoreo continuo de variables expuestas del runtime (`expvar`)

## Parte 12: Internals y Optimización

**Capítulo 43: El Garbage Collector (GC) de Go**
43.1. Arquitectura del recolector de basura: Concurrent Mark and Sweep
43.2. Entendiendo las pausas Stop-The-World (STW) y los Pacing algorithms
43.3. Ajuste fino del GC en producción (`GOGC`, `GOMEMLIMIT`)
43.4. Estrategias de minimización de presión sobre el GC

**Capítulo 44: Gestión de Memoria y Compilador**
44.1. Asignaciones de memoria: El Stack vs. El Heap
44.2. Análisis de escape (Escape Analysis)
44.3. Entendiendo el Inlining de funciones
44.4. Optimización estructural: Padding y Alineación de Memoria en Structs

**Capítulo 45: Profiling Avanzado (pprof y trace)**
45.1. Generación e interpretación de perfiles de CPU y Memoria (`go tool pprof`)
45.2. Análisis de bloqueos (Block Profiling) y contención de Mutexes
45.3. Visualización milimétrica de Goroutines con el Execution Tracer (`go tool trace`)
45.4. Exposición segura de endpoints pprof en entornos de producción

**Capítulo 46: Cgo, Llamadas al Sistema e Inseguridad**
46.1. Integración con librerías C existentes usando Cgo
46.2. El coste de rendimiento al cruzar la frontera entre Go y C
46.3. Llamadas directas a la API del sistema operativo (Syscalls)
46.4. Manipulación de memoria fuera del sistema de tipos con el paquete `unsafe`

## Parte 13: Despliegue y Herramientas del Ecosistema

**Capítulo 47: Contenedores y Dockerización**
47.1. Mejores prácticas para escribir Dockerfiles para Go
47.2. Compilaciones Multi-stage y generación de binarios estáticos ultraligeros (`scratch`)
47.3. Gestión de la caché de módulos (GOMODCACHE) durante la construcción de imágenes

**Capítulo 48: CI/CD y Calidad Continua del Código**
48.1. Integración de meta-linters (`golangci-lint`) con reglas personalizadas
48.2. Automatización de flujos de trabajo en GitHub Actions / GitLab CI
48.3. Gestión de repositorios privados, GOPRIVATE y Go Proxies

**Capítulo 49: Go en entornos Cloud Native y Kubernetes**
49.1. Implementación de apagado elegante (Graceful Shutdown) en contenedores efímeros
49.2. Serverless Computing con Go (AWS Lambda, Google Cloud Functions)
49.3. Go como el lenguaje de facto para escribir Operadores de Kubernetes (Kubebuilder)
