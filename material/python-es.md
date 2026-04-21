## Parte I: Fundamentos del Lenguaje

**Capítulo 1: Primeros Pasos y Entorno**
* 1.1 Instalación, gestores de versiones (pyenv) y configuración del entorno (IDEs).
* 1.2 El REPL de Python y la ejecución de scripts.
* 1.3 Tipos de datos primitivos (int, float, bool, str) y variables.
* 1.4 Mutabilidad e inmutabilidad básica en Python.

**Capítulo 2: Flujo de Control y Lógica**
* 2.1 Condicionales (if, elif, else) y expresiones condicionales.
* 2.2 Bucles (for, while) y la cláusula else en bucles.
* 2.3 Control de iteraciones (break, continue, pass).
* 2.4 Operadores lógicos, de identidad (`is`) y de pertenencia (`in`).

**Capítulo 3: Estructuras de Datos Integradas**
* 3.1 Listas y Tuplas: Uso, diferencias y métodos.
* 3.2 Diccionarios y Sets: Tablas hash bajo el capó.
* 3.3 Comprensiones (Comprehensions) de listas, diccionarios y sets.
* 3.4 Desempaquetado avanzado de secuencias (Unpacking).

**Capítulo 4: Funciones**
* 4.1 Definición, retorno y el alcance de las variables (Regla LEGB).
* 4.2 Manejo de argumentos: posicionales, nombrados, `*args` y `**kwargs`.
* 4.3 Funciones anónimas (Lambda).
* 4.4 Funciones de primera clase y de orden superior (map, filter, reduce).

---

## Parte II: Paradigmas y Herramientas Intermedias

**Capítulo 5: Programación Orientada a Objetos (POO)**
* 5.1 Clases, instancias, y el uso de `self`.
* 5.2 El Modelo de Datos de Python: Métodos mágicos (Dunder methods).
* 5.3 Herencia (simple y múltiple), Polimorfismo y el MRO (Method Resolution Order).
* 5.4 Encapsulamiento, decoradores de clase y propiedades (`@property`).
* 5.5 Dataclasses para la gestión eficiente del estado.

**Capítulo 6: Gestión de Errores y Recursos**
* 6.1 Bloques de excepciones: try, except, else, finally.
* 6.2 Creación de jerarquías de excepciones personalizadas.
* 6.3 Gestores de contexto (Context Managers): la declaración `with` y `contextlib`.

**Capítulo 7: Ecosistema y Modularidad**
* 7.1 Importaciones de módulos y estructura de paquetes (`__init__.py`).
* 7.2 Aislamiento de proyectos: Entornos virtuales (venv).
* 7.3 Gestión moderna de dependencias (pip, requirements.txt, Poetry).

**Capítulo 8: Persistencia de Datos Básica**
* 8.1 Lectura y escritura de archivos locales.
* 8.2 Manipulación de formatos estándar: JSON, CSV y YAML.
* 8.3 Serialización nativa con el módulo `pickle`.

---

## Parte III: Python Avanzado

**Capítulo 9: Iteración Avanzada**
* 9.1 El protocolo de iteración: `__iter__` y `__next__`.
* 9.2 Funciones generadoras y la palabra clave `yield`.
* 9.3 Expresiones generadoras y evaluación perezosa (Lazy evaluation).
* 9.4 Cadenas de iteración eficientes con el módulo `itertools`.

**Capítulo 10: Metaprogramación y Decoradores**
* 10.1 Closures (Cierres) y retención de estado.
* 10.2 Creación de decoradores de funciones y clases.
* 10.3 Preservación de metadatos con `functools.wraps`.
* 10.4 Introducción a Metaclases: controlando la creación de clases.

**Capítulo 11: Tipado Estático**
* 11.1 Type Hints y la evolución del tipado en Python.
* 11.2 El módulo `typing`: Union, Optional, Callable y genéricos.
* 11.3 Integración de análisis estático en CI/CD con `mypy`.

---

## Parte IV: Concurrencia y Rendimiento

**Capítulo 12: Modelos de Concurrencia**
* 12.1 Entendiendo el GIL (Global Interpreter Lock) de CPython.
* 12.2 Multithreading: Casos de uso (I/O bound) y bloqueos.
* 12.3 Multiprocessing: Aprovechando múltiples núcleos (CPU bound).
* 12.4 Programación asíncrona moderna: El event loop, `asyncio`, `async` y `await`.

**Capítulo 13: Optimización y Diagnóstico**
* 13.1 Perfilado de código (Profiling) con `cProfile` y `timeit`.
* 13.2 Análisis de consumo de memoria.
* 13.3 Estructuras de datos de alto rendimiento del módulo `collections` (deque, Counter).

---

## Parte V: Desarrollo Backend Core

**Capítulo 14: Fundamentos de Red y APIs**
* 14.1 Profundización en HTTP/HTTPS, métodos, cabeceras y códigos de estado.
* 14.2 Diseño de APIs RESTful: Mejores prácticas y versionado.
* 14.3 Alternativas a REST: Conceptos de GraphQL y gRPC.
* 14.4 Comunicación bidireccional con WebSockets.

**Capítulo 15: Bases de Datos y ORMs**
* 15.1 Bases de datos relacionales y drivers asíncronos (`asyncpg`).
* 15.2 Motores NoSQL: Cuándo usar MongoDB, Redis o Elasticsearch.
* 15.3 Mapeo Objeto-Relacional (ORMs): SQLAlchemy (Core y ORM) y Django ORM.
* 15.4 Gestión de esquemas y migraciones con Alembic.

**Capítulo 16: Frameworks de Aplicación**
* 16.1 Django: El patrón MVT, el panel de administración y Django REST Framework.
* 16.2 FastAPI: Tipado estricto con Pydantic, inyección de dependencias y asincronía.
* 16.3 Flask: Construcción de microservicios desde cero.

---

## Parte VI: Ingeniería Senior, Arquitectura y DevOps

**Capítulo 17: Testing y Calidad de Código**
* 17.1 Pruebas unitarias con `pytest` y `unittest`.
* 17.2 Aislamiento de pruebas mediante Mocks, Stubs y Fixtures.
* 17.3 Pruebas de integración, E2E y análisis de cobertura (Coverage).
* 17.4 Linters y formateadores (Ruff, Flake8, Black, pre-commit hooks).

**Capítulo 18: Seguridad en el Backend**
* 18.1 Mecanismos de Autenticación y Autorización (JWT, OAuth2).
* 18.2 Mitigación de vulnerabilidades OWASP (SQLi, XSS, CSRF).
* 18.3 Manejo seguro de contraseñas (hashing con bcrypt/Argon2) y secretos.

**Capítulo 19: Arquitectura de Software**
* 19.1 Implementación de Patrones de Diseño del GoF en Python.
* 19.2 Arquitectura Limpia (Clean Architecture) y Arquitectura Hexagonal.
* 19.3 Transición de Monolitos a Microservicios: Trade-offs.
* 19.4 Procesamiento asíncrono y colas de mensajes (Celery, RabbitMQ, Redis).

**Capítulo 20: Despliegue y Operaciones (DevOps)**
* 20.1 Contenerización de aplicaciones Python con Docker y Docker Compose.
* 20.2 Diferencias y configuración de servidores WSGI (Gunicorn) y ASGI (Uvicorn).
* 20.3 Integración y Despliegue Continuo (Pipelines de CI/CD).
* 20.4 Observabilidad total: Logging estructurado, monitoreo y trazabilidad distribuida.
