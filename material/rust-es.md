## Parte I: Fundamentos del Lenguaje
**Capítulo 1: Ecosistema y Configuración Inicial**
* 1.1 Instalación y gestión con `rustup`
* 1.2 `cargo`: El gestor de paquetes y dependencias
* 1.3 Estructura de un proyecto en Rust
* 1.4 Formateo y linting (`rustfmt` y `clippy`)

**Capítulo 2: Sintaxis Básica y Tipos de Datos**
* 2.1 Variables, inmutabilidad por defecto y shadowing
* 2.2 Tipos escalares (enteros, flotantes, booleanos, caracteres)
* 2.3 Tipos compuestos (tuplas y arreglos)
* 2.4 Control de flujo (`if`, `else`, `loop`, `while`, `for`)

**Capítulo 3: El Sistema de Tipos Principal**
* 3.1 Structs y sus variantes
* 3.2 Enums y el patrón de diseño Algebraic Data Types (ADT)
* 3.3 Implementación de métodos con `impl`
* 3.4 Pattern Matching avanzado con `match` e `if let`

**Capítulo 4: Ownership y Borrowing (El Corazón de Rust)**
* 4.1 La pila (Stack) vs. El montículo (Heap)
* 4.2 Reglas estrictas de Ownership
* 4.3 Referencias y Borrowing (préstamos mutables e inmutables)
* 4.4 Slices y referencias a porciones de memoria

## Parte II: Conceptos Intermedios y Avanzados
**Capítulo 5: Manejo de Errores**
* 5.1 Errores irrecuperables: la macro `panic!`
* 5.2 Errores recuperables: el enum `Result<T, E>`
* 5.3 Propagación de errores con el operador `?`
* 5.4 Creación de tipos de error personalizados con `thiserror` y `anyhow`

**Capítulo 6: Colecciones y Tipos Estándar**
* 6.1 Vectores (`Vec<T>`)
* 6.2 Representaciones de texto (`String` vs `&str`)
* 6.3 Mapas Hash y Conjuntos (`HashMap` y `HashSet`)
* 6.4 El enum `Option<T>` para valores nulos

**Capítulo 7: Abstracción y Reutilización de Código**
* 7.1 Funciones y tipos genéricos
* 7.2 Traits: Definiendo comportamiento compartido
* 7.3 Trait Bounds y el uso de `where`
* 7.4 Trait Objects y Dynamic Dispatch (`dyn Trait`)

**Capítulo 8: Lifetimes (Tiempos de Vida)**
* 8.1 El comprobador de préstamos (Borrow Checker)
* 8.2 Anotación de Lifetimes en funciones y structs
* 8.3 Elisión de Lifetimes (Reglas implícitas)
* 8.4 El Lifetime estático (`'static`)

**Capítulo 9: Programación Funcional en Rust**
* 9.1 Closures y captura de entorno
* 9.2 Traits de Closures (`Fn`, `FnMut`, `FnOnce`)
* 9.3 Iteradores y sus métodos de consumo
* 9.4 Adaptadores de iteradores (map, filter, fold, collect)

**Capítulo 10: Macros y Metaprogramación**
* 10.1 Macros declarativas (`macro_rules!`)
* 10.2 Macros procedurales personalizadas
* 10.3 Macros tipo Derive (`#[derive(...)]`)
* 10.4 Macros tipo atributo y función

## Parte III: La Standard Library de Rust
**Capítulo 11: Fundamentos de la Standard Library (std)**
* 11.1 El `prelude` y los módulos principales
* 11.2 Core vs. Alloc vs. Std (`no_std` environments)
* 11.3 Operaciones matemáticas y primitivas avanzadas
* 11.4 Manipulación del tiempo (`std::time`)

**Capítulo 12: Entrada/Salida (I/O) y Sistema de Archivos**
* 12.1 Lectura y escritura de archivos (`std::fs`)
* 12.2 Manejo eficiente con buffers (`BufReader`, `BufWriter`)
* 12.3 Interacción con la entrada y salida estándar (`stdin`, `stdout`)
* 12.4 Rutas de archivos multiplataforma (`std::path::Path` y `PathBuf`)

**Capítulo 13: Redes en la Standard Library**
* 13.1 Conexiones TCP (`TcpListener`, `TcpStream`)
* 13.2 Comunicación UDP (`UdpSocket`)
* 13.3 Resolución de direcciones IP y manipulación de Sockets
* 13.4 Limitaciones de redes síncronas

**Capítulo 14: Concurrencia Síncrona y Sincronización**
* 14.1 Creación de hilos del sistema operativo (`std::thread`)
* 14.2 Estado compartido: `Mutex` y `RwLock`
* 14.3 Paso de mensajes con canales (`std::sync::mpsc`)
* 14.4 Variables atómicas y ordenamiento de memoria (`std::sync::atomic`)

## Parte IV: Desarrollo de APIs RESTful
**Capítulo 15: Fundamentos Web y Serialización**
* 15.1 El ecosistema web de Rust
* 15.2 Serialización y deserialización con `serde` y `serde_json`
* 15.3 Estructuración de requests y responses HTTP
* 15.4 Manejo avanzado de rutas y queries

**Capítulo 16: El Framework Actix-Web**
* 16.1 Configuración de servidores y workers
* 16.2 Extractors (Path, Query, Json, Form)
* 16.3 Gestión del estado compartido de la aplicación
* 16.4 Creación y uso de Middlewares

**Capítulo 17: El Framework Axum (Ecosistema Tokio)**
* 17.1 Enrutamiento y Handlers asíncronos
* 17.2 Integración profunda con `tower` y servicios HTTP
* 17.3 Extracción de datos y validación
* 17.4 Websockets nativos en Axum

**Capítulo 18: Autenticación y Autorización**
* 18.1 Implementación de JSON Web Tokens (JWT) con `jsonwebtoken`
* 18.2 Manejo de sesiones y cookies
* 18.3 Flujos de OAuth2 y OpenID Connect
* 18.4 Control de Acceso Basado en Roles (RBAC) en endpoints

## Parte V: Persistencia de Datos y Bases de Datos
**Capítulo 19: Conectividad y Drivers Básicos**
* 19.1 Pools de conexiones con `deadpool` o `bb8`
* 19.2 Drivers asíncronos para PostgreSQL (`tokio-postgres`)
* 19.3 Migraciones de esquemas (herramientas como `refinery` o `dbmate`)
* 19.4 Ejecución de sentencias SQL planas

**Capítulo 20: SQLx (El Estándar Asíncrono de Facto)**
* 20.1 Consultas comprobadas en tiempo de compilación (`query!`)
* 20.2 Mapeo de resultados a Structs de Rust
* 20.3 Manejo de transacciones y deadlocks
* 20.4 Integración nativa de migraciones en SQLx

**Capítulo 21: Object-Relational Mapping (ORM)**
* 21.1 Diesel: Generación de código y seguridad de tipos (Síncrono/Asíncrono)
* 21.2 SeaORM: El ORM asíncrono para bases de datos relacionales
* 21.3 Construcción dinámica de queries complejas
* 21.4 Relaciones Uno-a-Uno, Uno-a-Muchos y Muchos-a-Muchos

**Capítulo 22: Bases de Datos NoSQL y Caché**
* 22.1 Integración con MongoDB (Driver asíncrono oficial)
* 22.2 Uso de Redis para caché y rate limiting (`redis-rs`)
* 22.3 Bases de datos columnares (Cassandra/ScyllaDB)
* 22.4 Almacenamiento Clave-Valor rápido (RocksDB, Sled)

## Parte VI: Testing a fondo, incluyendo Testcontainers
**Capítulo 23: Testing Unitario y de Integración**
* 23.1 El framework de pruebas integrado (`#[test]`)
* 23.2 Asserts personalizados e igualdades estructuradas
* 23.3 Directorio `tests/` para pruebas de integración de caja negra
* 23.4 Setup, teardown y paralelización de pruebas

**Capítulo 24: Técnicas de Mocking y Stubs**
* 24.1 Cuándo usar Mocks en Rust
* 24.2 Creación de Mocks manuales mediante Traits
* 24.3 Uso del crate `mockall`
* 24.4 Inyección de dependencias para facilitar el testing

**Capítulo 25: Property-Based Testing y Fuzzing**
* 25.1 Pruebas basadas en propiedades con `proptest`
* 25.2 Generación de datos arbitrarios
* 25.3 Fuzzing continuo con `cargo-fuzz` (libFuzzer)
* 25.4 Descubrimiento de pánicos y edge-cases ocultos

**Capítulo 26: Testcontainers para Entornos Efímeros**
* 26.1 Fundamentos del crate `testcontainers-rs`
* 26.2 Configuración de bases de datos de prueba en Docker (Postgres, Redis)
* 26.3 Aislamiento de tests en servicios dependientes
* 26.4 Optimización de tiempos de ejecución de Testcontainers en CI

**Capítulo 27: Benchmarking de Código**
* 27.1 Benchmarks básicos con Cargo
* 27.2 Análisis estadístico avanzado con `criterion`
* 27.3 Detección de regresiones de rendimiento en CI/CD
* 27.4 Perfilado de memoria durante el testing

## Parte VII: Arquitectura y Diseño de Software
**Capítulo 28: Patrones de Diseño Adaptados a Rust**
* 28.1 El patrón Builder y el patrón Typestate (Estados en compilación)
* 28.2 El patrón Newtype para seguridad de dominio
* 28.3 Command Pattern y Estrategias mediante Traits
* 28.4 Anti-patrones comunes en Rust orientado a objetos

**Capítulo 29: Arquitectura Limpia (Clean Architecture)**
* 29.1 Principios SOLID aplicados a Rust
* 29.2 Capa de Entidades y Casos de Uso
* 29.3 Aislamiento de frameworks y la base de datos
* 29.4 Inversión de dependencias utilizando `dyn Trait` y Genéricos

**Capítulo 30: Arquitectura Hexagonal (Ports & Adapters)**
* 30.1 Definición de Puertos de Entrada y Salida (Traits)
* 30.2 Adaptadores Primarios (Controladores API, CLI)
* 30.3 Adaptadores Secundarios (Repositorios, Clientes HTTP externos)
* 30.4 Ensamblaje de la aplicación (El patrón Registry / AppState)

**Capítulo 31: Domain-Driven Design (DDD)**
* 31.1 Modelado del Dominio Rico vs Anémico
* 31.2 Value Objects inmutables con semántica de Rust
* 31.3 Entidades, Agregados y Raíces de Agregación
* 31.4 Eventos de Dominio y consistencia eventual

## Parte VIII: Comunicación Avanzada y Microservicios
**Capítulo 32: Ecosistema Asíncrono Profundo (Tokio)**
* 32.1 El Trait `Future` bajo el capó (Pin, Unpin, Context, Waker)
* 32.2 El runtime de Tokio: Threads, I/O Polling y Task Scheduling
* 32.3 Streams y asincronía basada en eventos
* 32.4 Select, Join y control de concurrencia avanzado

**Capítulo 33: Comunicación RPC con gRPC**
* 33.1 Protocol Buffers (Protobuf) e IDL
* 33.2 Construcción de servidores y clientes gRPC con `tonic`
* 33.3 Streaming Unidireccional y Bidireccional
* 33.4 Interceptors y autenticación en gRPC

**Capítulo 34: APIs en Tiempo Real y WebSockets**
* 34.1 El protocolo WebSocket en el ecosistema Rust
* 34.2 Uso de `tokio-tungstenite`
* 34.3 Canales de Tokio para broadcasting a múltiples clientes
* 34.4 Server-Sent Events (SSE)

**Capítulo 35: Interacción con Colas de Mensajes y Eventos**
* 35.1 Producción y consumo con Apache Kafka (`rdkafka`)
* 35.2 RabbitMQ / AMQP con `lapin`
* 35.3 Patrones de resiliencia: Dead Letter Queues y Circuit Breakers
* 35.4 CQRS y Event Sourcing en Rust

**Capítulo 36: GraphQL en el Backend**
* 36.1 Schemas, Queries y Mutaciones con `async-graphql`
* 36.2 Resolvers asíncronos y contexto
* 36.3 Problema de N+1 consultas (Dataloaders en Rust)
* 36.4 Subscripciones vía WebSockets en GraphQL

## Parte IX: Observabilidad y Monitoreo
**Capítulo 37: Logging Estructurado**
* 37.1 El facade de `log` vs el ecosistema `tracing`
* 37.2 Creación de Spans y eventos jerárquicos
* 37.3 Filtrado dinámico de logs (EnvFilter)
* 37.4 Salida JSON y exportación a ELK/Loki

**Capítulo 38: Métricas de Aplicación**
* 38.1 Exportación de métricas con formato Prometheus (`metrics-rs`)
* 38.2 Contadores, Gauges e Histogramas
* 38.3 Instrumentación del uso de memoria y CPU del proceso
* 38.4 Integración de endpoints `/metrics`

**Capítulo 39: Tracing Distribuido**
* 39.1 Introducción a OpenTelemetry en Rust
* 39.2 Propagación del contexto en peticiones HTTP y gRPC
* 39.3 Exportación de trazas a Jaeger, Zipkin o Datadog
* 39.4 Trazabilidad en operaciones de base de datos asíncronas

**Capítulo 40: Health Checks y Resiliencia en Kubernetes**
* 40.1 Diseño de endpoints Liveness y Readiness
* 40.2 Graceful Shutdown (Apagado elegante) en Tokio
* 40.3 Manejo de señales del sistema operativo (SIGTERM, SIGINT)
* 40.4 Recuperación ante pánicos sin tirar el servidor

## Parte X: Seguridad en Aplicaciones Backend
**Capítulo 41: Criptografía Práctica**
* 41.1 Hashing seguro de contraseñas (Argon2, bcrypt)
* 41.2 Uso avanzado del crate `ring` y `rustls` (Alternativa a OpenSSL)
* 41.3 Cifrado simétrico y asimétrico (AEAD)
* 41.4 Generación de números pseudoaleatorios seguros (`rand_core`)

**Capítulo 42: Prevención de Vulnerabilidades Web (OWASP)**
* 42.1 Mitigación de Inyección SQL (Uso estricto de binds en SQLx/Diesel)
* 42.2 Sanitización de inputs y prevención de XSS
* 42.3 Cross-Site Request Forgery (CSRF) tokens
* 42.4 Rate Limiting para prevenir fuerza bruta y DDoS

**Capítulo 43: Gestión de Secretos**
* 43.1 Carga segura de variables de entorno (`dotenvy`)
* 43.2 Integración con HashiCorp Vault
* 43.3 Uso de AWS Secrets Manager / Azure Key Vault
* 43.4 Prevención de fugas de secretos en Logs y Pánicos

**Capítulo 44: Seguridad en la Cadena de Suministro (Supply Chain)**
* 44.1 Auditoría de dependencias con `cargo-audit`
* 44.2 Restricción de licencias y crates de confianza con `cargo-deny`
* 44.3 Reproducibilidad de builds
* 44.4 Análisis estático de vulnerabilidades

## Parte XI: Internals y Optimización
**Capítulo 45: El Compilador (rustc) y LLVM**
* 45.1 Fases del compilador: AST, HIR, MIR
* 45.2 Cómo funciona el Monomorfismo de Genéricos
* 45.3 LLVM IR y optimizaciones de paso a paso
* 45.4 Perfilado de tiempos de compilación y optimización de CI

**Capítulo 46: Gestión de Memoria Avanzada**
* 46.1 Layout de structs en memoria y padding (`#[repr(C)]`, `#[repr(packed)]`)
* 46.2 Custom Allocators y uso de `jemalloc` / `mimalloc`
* 46.3 Smart Pointers avanzados (`Rc`, `Arc`, `RefCell`, `Cell`)
* 46.4 Fugas de memoria voluntarias (`Box::leak`) e involuntarias (Ciclos de referencias)

**Capítulo 47: Unsafe Rust y FFI (Foreign Function Interface)**
* 47.1 Los 5 superpoderes del código `unsafe`
* 47.2 Punteros crudos (Raw Pointers)
* 47.3 Llamando a librerías de C desde Rust y viceversa
* 47.4 Creación de abstracciones seguras sobre código inseguro

**Capítulo 48: Optimización de Rendimiento Extrema**
* 48.1 Profiling de CPU con Flamegraphs
* 48.2 Localidad de caché y diseño orientado a datos (DOD)
* 48.3 Paralelismo de datos con instrucciones SIMD
* 48.4 Zero-copy parsing e I/O con herramientas como `nom`
