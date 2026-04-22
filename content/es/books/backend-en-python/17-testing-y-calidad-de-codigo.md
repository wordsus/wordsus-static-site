Escribir código que funcione hoy es solo la mitad del trabajo de un ingeniero senior; la otra mitad es asegurar que siga funcionando mañana tras cientos de cambios. En este capítulo, exploraremos cómo transformar el testing de una tarea tediosa a una ventaja competitiva. Dominaremos el ecosistema de **pytest** y **unittest** para construir una red de seguridad inquebrantable, aprenderemos a aislar lógica compleja mediante **Mocks** y **Fixtures**, y automatizaremos la estética y salud de nuestro código con **Ruff** y **pre-commit**. El objetivo es simple pero ambicioso: alcanzar un ciclo de desarrollo donde la calidad no sea una opinión, sino una garantía matemática.

## 17.1 Pruebas unitarias con `pytest` y `unittest`

A medida que tu software crece, la confianza en que los cambios no romperán la funcionalidad existente se vuelve primordial. A nivel senior, las pruebas unitarias no son solo una herramienta para encontrar *bugs*; son la primera línea de documentación viva de tu código y un mecanismo de retroalimentación sobre la calidad de tu diseño. Si una función es difícil de probar, probablemente esté mal diseñada (violando principios como la Responsabilidad Única).

Toda prueba unitaria bien estructurada sigue el patrón mental **AAA** (Arrange, Act, Assert):

```text
+----------------------+
|  Arrange (Preparar)  | -> Configurar el estado inicial, variables y dependencias.
+----------------------+
           |
           v
+----------------------+
|     Act (Actuar)     | -> Ejecutar específicamente la unidad de código a evaluar.
+----------------------+
           |
           v
+----------------------+
|   Assert (Afirmar)   | -> Verificar que el resultado (o estado) sea el esperado.
+----------------------+
```

En el ecosistema de Python, existen dos gigantes para llevar a cabo esta tarea: `unittest` (incluido en la biblioteca estándar) y `pytest` (el estándar de facto de la industria).

---

### `unittest`: El enfoque clásico y orientado a objetos

Inspirado en JUnit de Java, `unittest` viene incluido en Python, lo que significa que no necesitas instalar dependencias de terceros para empezar a probar. Su diseño es estrictamente orientado a objetos, requiriendo que tus pruebas residan dentro de clases que heredan de `unittest.TestCase`.

Veamos un ejemplo probando una función de validación simple:

```python
import unittest

def aplicar_descuento(precio: float, descuento: float) -> float:
    if descuento < 0 or descuento > 1:
        raise ValueError("El descuento debe estar entre 0 y 1")
    return precio * (1 - descuento)

class TestAplicarDescuento(unittest.TestCase):
    
    # El método setUp se ejecuta antes de CADA prueba (fase de Arrange común)
    def setUp(self):
        self.precio_base = 100.0

    def test_descuento_valido(self):
        # Act
        resultado = aplicar_descuento(self.precio_base, 0.2)
        # Assert
        self.assertEqual(resultado, 80.0)

    def test_descuento_invalido_lanza_excepcion(self):
        # Assert / Act
        with self.assertRaises(ValueError):
            aplicar_descuento(self.precio_base, 1.5)
```

**Ventajas y Desventajas:**
* **Pros:** Viene "fuera de la caja". Su estructura basada en clases agrupa lógicamente las pruebas y los métodos `setUp` y `tearDown` facilitan la preparación del entorno.
* **Contras:** Requiere mucho código repetitivo (*boilerplate*). Además, sus métodos de aserción (`assertEqual`, `assertTrue`, `assertDictEqual`) obligan a memorizar una API específica (estilo *camelCase*, poco "pythónico") en lugar de usar los operadores estándar del lenguaje.

---

### `pytest`: El estándar moderno y pythónico

Mientras que `unittest` te obliga a adaptarte a su API, `pytest` se adapta a Python. Es un framework de terceros que ha dominado la industria gracias a su filosofía de "menos es más". En lugar de heredar de clases y usar métodos de aserción específicos, escribes funciones simples y usas la palabra clave nativa `assert`.

El mismo ejemplo anterior, reescrito para `pytest`, se ve así:

```python
import pytest

# La función aplicar_descuento sigue siendo la misma

def test_descuento_valido():
    precio_base = 100.0
    resultado = aplicar_descuento(precio_base, 0.2)
    assert resultado == 80.0  # Uso directo del operador de igualdad

def test_descuento_invalido_lanza_excepcion():
    with pytest.raises(ValueError):
        aplicar_descuento(100.0, 1.5)
```

Bajo el capó, `pytest` realiza una introspección profunda del AST (Abstract Syntax Tree) de Python. Cuando un `assert` falla, `pytest` desglosa la expresión y te muestra exactamente qué valor tenía cada variable en el momento del fallo, eliminando la necesidad de los verbosos métodos `assert*` de `unittest`.

### El poder de la Parametrización en `pytest`

Una de las características más potentes que separar a un desarrollador junior de un senior es cómo maneja los casos de prueba múltiples. En lugar de escribir diez pruebas casi idénticas o usar un bucle `for` (que al fallar detiene la ejecución sin evaluar el resto de casos), `pytest` ofrece el decorador `@pytest.mark.parametrize`.

Este decorador permite inyectar diferentes conjuntos de datos en una misma función de prueba, generando una prueba independiente para cada conjunto:

```python
import pytest

@pytest.mark.parametrize("precio, descuento, esperado", [
    (100.0, 0.0, 100.0),    # Sin descuento
    (100.0, 0.5, 50.0),     # 50% de descuento
    (200.0, 0.25, 150.0),   # 25% de descuento
    (0.0, 0.1, 0.0),        # Precio cero
])
def test_aplicar_descuento_multiples_casos(precio, descuento, esperado):
    assert aplicar_descuento(precio, descuento) == esperado
```

En este ejemplo, `pytest` reportará 4 pruebas distintas. Si la segunda falla, las demás se seguirán ejecutando. Esto reduce drásticamente el código y aumenta la cobertura real evaluada.

### ¿Cuál elegir?

Hoy en día, la respuesta en el 95% de los proyectos profesionales es **`pytest`**. Su legibilidad, su potente ecosistema de plugins (como `pytest-cov` para cobertura o `pytest-asyncio` para probar el código asíncrono que vimos en el Capítulo 12) y su sistema de *Fixtures* lo hacen superior. 

Sin embargo, comprender `unittest` es fundamental porque te encontrarás con muchas bases de código *legacy* que lo utilizan. Afortunadamente, `pytest` es compatible hacia atrás y puede ejecutar suites de pruebas escritas en `unittest` sin necesidad de modificarlas.

*(Nota: En la siguiente sección, 17.2, exploraremos cómo aislar estas unidades de código de bases de datos o APIs externas utilizando Mocks, y profundizaremos en el revolucionario sistema de Fixtures de pytest para reemplazar los clásicos `setUp` y `tearDown`).*

## 17.2 Aislamiento de pruebas mediante Mocks, Stubs y Fixtures

Existe una regla de oro en el *testing* avanzado: **Si tu prueba hace una petición a la red, escribe en el disco duro o consulta una base de datos real, no es una prueba unitaria; es una prueba de integración.** Para que una prueba unitaria sea rápida y determinista (que no falle aleatoriamente porque el WiFi se cayó o la base de datos está lenta), debemos aislar el **Sistema Bajo Prueba** (SUT - *System Under Test*) de sus dependencias externas. Aquí es donde entran en juego los "Dobles de Prueba" (*Test Doubles*) y los Fixtures.

```text
+-------------------+       evalúa       +---------------------------+
|  Prueba Unitaria  | -----------------> | SUT (Tu función / Clase)  |
+-------------------+                    +---------------------------+
                                                      |
                                                      | (Llamadas interceptadas)
                                                      v
                                         +---------------------------+
                                         |    Dobles de Prueba       |
                                         | (Mocks, Stubs, Dummies)   |
                                         +---------------------------+
                                                      |
                                                      X (Barrera de Aislamiento)
                                                      |
                                         +---------------------------+
                                         |   Dependencias Reales     |
                                         |   (APIs, BD, Archivos)    |
                                         +---------------------------+
```

### Stubs vs Mocks: Entendiendo la diferencia

A menudo, los desarrolladores usan las palabras "mock" y "stub" de forma intercambiable, pero en ingeniería de software tienen propósitos distintos:

* **Stub:** Es un objeto que devuelve una respuesta "enlatada" (predefinida). Su único objetivo es permitir que la prueba se ejecute sin errores proporcionando el estado necesario. No le importa cuántas veces fue llamado.
* **Mock:** Es un objeto inteligente que, además de poder devolver respuestas predefinidas, **registra cómo interactúan con él**. Se utiliza para verificar comportamiento. Te permite afirmar: *"Asegúrate de que el SUT llamó a la función `enviar_email()` exactamente una vez y con este asunto"*.

### Aislamiento con `unittest.mock`

Python incluye una potente librería en su módulo estándar para manejar dobles de prueba: `unittest.mock`. La herramienta más utilizada aquí es `patch`, que permite reemplazar temporalmente objetos reales por Mocks durante la prueba.

Supongamos que tenemos una función que consulta una API externa para obtener el clima:

```python
import requests

def obtener_temperatura(ciudad: str) -> float:
    respuesta = requests.get(f"https://api.clima.com/v1/{ciudad}")
    respuesta.raise_for_status()
    datos = respuesta.json()
    return datos["temperatura"]
```

Si probamos esto directamente, dependeremos de que `api.clima.com` esté en línea. Vamos a aislarlo usando `patch` como decorador:

```python
from unittest.mock import patch
import pytest
from mi_modulo import obtener_temperatura

# Parcheamos 'requests.get' EN EL MÓDULO donde se usa (mi_modulo), no donde se define
@patch("mi_modulo.requests.get")
def test_obtener_temperatura_valida(mock_get):
    # 1. Configurar el Stub (la respuesta simulada)
    mock_respuesta = mock_get.return_value
    mock_respuesta.json.return_value = {"temperatura": 25.5}
    mock_respuesta.raise_for_status.return_value = None # No lanza excepción

    # 2. Act (Ejecutar la función)
    temperatura = obtener_temperatura("Madrid")

    # 3. Assert de Estado
    assert temperatura == 25.5

    # 4. Assert de Comportamiento (Validamos la interacción con el Mock)
    mock_get.assert_called_once_with("https://api.clima.com/v1/Madrid")
```

En este ejemplo, `requests.get` nunca realiza una petición HTTP real. En su lugar, interceptamos la llamada y controlamos exactamente lo que devuelve, garantizando una prueba rápida y predecible.

### El poder de los Fixtures en `pytest`

Mientras que los Mocks aíslan las dependencias dinámicas, los **Fixtures** en `pytest` son la forma moderna y modular de inyectar el estado inicial y las dependencias estáticas en tus pruebas (reemplazando los antiguos métodos `setUp` y `tearDown` de `unittest`).

Un fixture es simplemente una función decorada con `@pytest.fixture`. `pytest` utiliza Inyección de Dependencias: si tu función de prueba incluye un argumento con el mismo nombre que un fixture, `pytest` lo ejecutará e inyectará su resultado automáticamente.

```python
import pytest

# Definición del fixture
@pytest.fixture
def usuario_premium():
    # Esta es la fase 'Arrange'
    return {"id": 1, "nombre": "Ada Lovelace", "suscripcion": "premium"}

# Uso del fixture (Inyección de dependencias)
def test_descuento_aplicado_a_usuario_premium(usuario_premium):
    # 'usuario_premium' ya contiene el diccionario inyectado
    assert usuario_premium["suscripcion"] == "premium"
```

#### Fixtures con `yield`: Setup y Teardown limpios

La verdadera magia de los fixtures ocurre cuando necesitas limpiar recursos después de la prueba (cerrar conexiones, borrar archivos temporales). Usando la palabra clave `yield`, todo lo que está antes del `yield` es preparación (*setup*), y todo lo que está después es limpieza (*teardown*), sin importar si la prueba falló o tuvo éxito.

```python
import pytest
import sqlite3

@pytest.fixture
def base_de_datos_en_memoria():
    # --- SETUP ---
    conexion = sqlite3.connect(":memory:")
    cursor = conexion.cursor()
    cursor.execute("CREATE TABLE usuarios (id INTEGER PRIMARY KEY, nombre TEXT)")
    
    # Entregamos el recurso a la prueba
    yield conexion 
    
    # --- TEARDOWN --- (Se ejecuta después de que la prueba termina)
    conexion.close()

def test_insertar_usuario(base_de_datos_en_memoria):
    cursor = base_de_datos_en_memoria.cursor()
    cursor.execute("INSERT INTO usuarios (nombre) VALUES ('Guido')")
    
    cursor.execute("SELECT nombre FROM usuarios")
    resultado = cursor.fetchone()
    
    assert resultado[0] == 'Guido'
```

### Advertencia de Arquitectura: El peligro del "Over-mocking"

A nivel senior, es fundamental entender los riesgos del aislamiento excesivo. Si *mockeas* demasiadas dependencias, terminas escribiendo pruebas tautológicas: pruebas que solo validan que tus mocks hacen lo que tú les dijiste que hicieran, perdiendo cualquier relación con el comportamiento real del software. 

La regla general de la **Arquitectura Limpia** para el testing es: mockea las barreras de I/O (red, disco, bases de datos), pero usa instancias reales para las clases y funciones de dominio internas.

*(Nota: Con las unidades aisladas y funcionando perfectamente, el siguiente paso lógico es ensamblar las piezas y probar que funcionan juntas. En la sección 17.3, abordaremos las pruebas de Integración, el testing End-to-End y cómo medir la cobertura de nuestro código).*

## 17.3 Pruebas de integración, E2E y análisis de cobertura (Coverage)

En las secciones anteriores aprendimos a aislar nuestro código mediante *mocks* y a probarlo en pequeñas burbujas unitarias. Sin embargo, existe un viejo chiste en la ingeniería de software: *"Las pruebas unitarias pasaron, pero el sistema no funciona. Es como probar que el paracaídas abre en tierra, pero olvidar probar si se puede atar al saltador"*. 

Para asegurar que nuestro software funciona en el mundo real, necesitamos escalar en la **Pirámide de Pruebas** (Test Pyramid):

```text
               / \
              /   \
             / E2E \       <-- Lentas / Frágiles / Costosas / Muy reales
            /-------\
           /         \
          /Integración\    <-- Velocidad media / Conectan piezas reales
         /-------------\
        /               \
       /    Unitarias    \ <-- Veloces / Aisladas / Abundantes / Económicas
      ---------------------
```

A nivel Senior, tu responsabilidad no es solo escribir pruebas, sino diseñar una estrategia donde cada capa de la pirámide cumpla su propósito sin ralentizar el ciclo de desarrollo (CI/CD).

---

### Pruebas de Integración: Conectando las piezas

Las pruebas de integración verifican que dos o más módulos de tu aplicación (que pasaron sus pruebas unitarias de forma aislada) se comuniquen correctamente entre sí o con infraestructura externa real, como bases de datos, cachés de Redis o sistemas de archivos.

**La regla de oro de la Integración:** Aquí **no** usamos mocks para la infraestructura local. Si quieres probar cómo tu repositorio interactúa con PostgreSQL, pruebas contra un PostgreSQL real (generalmente instanciado efímeramente).

*Ejemplo: Probando la capa de persistencia con SQLAlchemy y pytest*

Para evitar ensuciar nuestra base de datos de desarrollo o producción, levantamos una base de datos de prueba exclusiva. Una práctica moderna es usar contenedores Docker efímeros (ej. con la librería `testcontainers`), pero un enfoque más ligero para bases de datos relacionales es configurar un *Fixture* que cree tablas vacías y haga un *rollback* o borrado al terminar.

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from mi_app.modelos import Base, Usuario
from mi_app.repositorio import crear_usuario

# Usamos SQLite en memoria para pruebas de integración ultrarrápidas 
# (Nota: en proyectos estrictos, usa el motor exacto de producción, ej. Postgres)
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def session():
    # Setup: Crear el esquema de la BD
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    yield db  # Entregamos la sesión a la prueba
    
    # Teardown: Limpiar la BD para la siguiente prueba
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_crear_usuario_guarda_en_base_de_datos(session):
    # Act: Ejecutamos el componente que orquesta la lógica y la BD
    usuario_creado = crear_usuario(session, nombre="Ada", email="ada@lovelace.com")
    
    # Assert: Verificamos en la BD REAL (de prueba)
    usuario_en_db = session.query(Usuario).filter_by(email="ada@lovelace.com").first()
    
    assert usuario_creado.id is not None
    assert usuario_en_db.nombre == "Ada"
```

---

### Pruebas End-to-End (E2E): El viaje completo

Las pruebas E2E evalúan el sistema completo desde la perspectiva del cliente, desde la petición HTTP inicial hasta el almacenamiento en la base de datos y la respuesta HTTP final. En el backend, esto significa golpear los *endpoints* de tu API como si fueras un usuario real o un frontend cliente.

Frameworks modernos como **FastAPI** y **Django** proporcionan clientes de prueba nativos (`TestClient`) que simulan peticiones HTTP sin necesidad de levantar el servidor web real (Gunicorn/Uvicorn), lo que las hace notablemente rápidas.

```python
from fastapi.testclient import TestClient
from mi_app.main import app

# Instanciamos el cliente de prueba de FastAPI
client = TestClient(app)

def test_flujo_registro_usuario_e2e():
    # 1. Petición HTTP al endpoint de registro
    response = client.post(
        "/api/v1/usuarios/",
        json={"nombre": "Alan Turing", "email": "alan@turing.com", "password": "segura"}
    )
    
    # 2. Validamos el contrato HTTP
    assert response.status_code == 201
    datos = response.json()
    assert datos["email"] == "alan@turing.com"
    assert "id" in datos
    assert "password" not in datos  # Seguridad: la contraseña nunca debe filtrarse
    
    # 3. Validamos comportamiento posterior (ej. intentar leer el perfil)
    response_perfil = client.get(f"/api/v1/usuarios/{datos['id']}")
    assert response_perfil.status_code == 200
```

Si el proyecto incluye un frontend complejo que requiera renderizado de JavaScript (SPA), las pruebas E2E darían el salto fuera de Python hacia herramientas como **Playwright** o **Selenium**, ejecutando navegadores reales (Chromium, Firefox) en modo *headless*.

---

### Análisis de Cobertura (Coverage): ¿Estamos probando lo suficiente?

La cobertura de código métrica indica qué porcentaje de tu código fuente se ejecutó mientras corrías tu suite de pruebas. En Python, la herramienta estándar de la industria es `coverage.py`, frecuentemente integrada con pytest a través del plugin **`pytest-cov`**.

Para generar un reporte de cobertura, ejecutas en tu terminal:

```bash
# Instalar dependencias
pip install pytest-cov

# Ejecutar pruebas y generar reporte de cobertura para la carpeta 'mi_app'
pytest --cov=mi_app --cov-report=term-missing
```

La salida (tipo `term-missing`) te mostrará no solo el porcentaje global, sino exactamente **qué líneas** no fueron tocadas por ninguna prueba:

```text
Name                  Stmts   Miss  Cover   Missing
---------------------------------------------------
mi_app/main.py           45      0   100%
mi_app/modelos.py        20      2    90%   18-19
mi_app/servicios.py      80     16    80%   50-65
---------------------------------------------------
TOTAL                   145     18    87%
```

También puedes generar un reporte HTML (`--cov-report=html`) que crea un sitio web navegable donde las líneas de código no evaluadas se resaltan en rojo, facilitando enormemente su ubicación.

#### La trampa del 100% de Cobertura (Perspectiva Senior)

Existe un antipatrón común en equipos inmaduros: forzar un 100% de cobertura en sus pipelines de CI/CD. Esto casi siempre conduce a aplicar la **Ley de Goodhart**: *"Cuando una medida se convierte en un objetivo, deja de ser una buena medida"*.

Obligar el 100% de cobertura provoca:
1. Pruebas inútiles (*tautológicas*) que solo buscan pasar por la línea de código sin afirmar nada (`assert True`).
2. Desgaste del equipo probando *getters*, *setters* y configuraciones triviales.
3. Código altamente *mockeado* que es frágil ante refactorizaciones estructurales.

**Mejores prácticas para la Cobertura:**
* Utiliza la cobertura para **descubrir áreas críticas sin probar**, no como una métrica de desempeño del desarrollador.
* Un objetivo saludable en la industria oscila entre el **75% y el 85%**.
* En el 15%-25% restante suele estar el código de "pegamento", scripts de configuración de despliegue y validaciones exóticas de infraestructura, cuyo costo de probar aislando dependencias es mayor que el beneficio obtenido. Enfoca tus esfuerzos en probar exhaustivamente la **lógica de negocio central** (Domain).

## 17.4 Linters y formateadores (Ruff, Flake8, Black, pre-commit hooks)

A medida que un equipo crece, mantener la coherencia en la base de código se vuelve un desafío monumental. En el nivel senior, entiendes una verdad fundamental: **el tiempo invertido discutiendo sobre el estilo del código en las revisiones de *Pull Requests* (PRs) es tiempo perdido.** Si un desarrollador está comentando sobre espacios en blanco, comillas simples versus dobles, o la longitud de una línea, tu proceso de ingeniería está fallando.

Las computadoras son excelentes para aplicar reglas de formato; los humanos, no. Para resolver esto, delegamos la calidad sintáctica y estilística a herramientas automáticas: los linters y los formateadores.

---

### Formateadores vs. Linters: Entendiendo la diferencia

Aunque a menudo se mencionan juntos, cumplen roles distintos y complementarios:

* **Formateadores (Formatters):** Reescriben tu código. Toman tu código fuente, analizan su Árbol de Sintaxis Abstracta (AST) y lo vuelven a imprimir siguiendo un conjunto estricto de reglas de espaciado y estructura (basadas en PEP 8). No les importa si la lógica es correcta, solo que se vea bien.
* **Linters:** Analizan tu código de forma estática en busca de errores de programación, "code smells" (malas prácticas) y violaciones de estilo que un formateador no puede arreglar. Te advierten sobre variables no utilizadas, importaciones faltantes, complejidad ciclomática alta o posibles errores de tipado.

---

### El enfoque clásico: `Black` y `Flake8`

Durante muchos años, el estándar de la industria en Python se basó en una combinación de varias herramientas:

1.  **Black (El formateador "inquebrantable"):** Se autodenomina *The uncompromising code formatter*. Black toma las decisiones por ti. Al adoptarlo, el equipo acepta ceder el control sobre el micro-formato a cambio de tener una base de código 100% uniforme.

    *Código antes de Black:*
    ```python
    def funcion_fea( arg1,arg2,
        arg3):
      return { 'a': 1,'b':2}
    ```
    *Código después de `black .`:*
    ```python
    def funcion_fea(arg1, arg2, arg3):
        return {"a": 1, "b": 2}
    ```

2.  **Flake8 (El linter clásico):** Es un envoltorio que combina varias herramientas de análisis estático (`PyFlakes`, `pycodestyle` y `mccabe`). Si escribes `import os` pero nunca usas el módulo, Flake8 hará fallar tu construcción advirtiéndote: `F401 'os' imported but unused`.

3.  **isort:** Una herramienta adicional puramente dedicada a ordenar alfabéticamente y agrupar tus importaciones (biblioteca estándar, dependencias de terceros, módulos locales).

---

### La revolución moderna: `Ruff`

En 2022, el panorama cambió drásticamente con la llegada de **Ruff**. Escrito en Rust, Ruff es un linter y formateador extremadamente rápido (entre 10 y 100 veces más rápido que las herramientas existentes).

A nivel de arquitectura de proyectos modernos, **Ruff reemplaza a Flake8, Black, isort, pyupgrade y docformatter**. Consolidar estas herramientas en un solo ejecutable no solo acelera radicalmente los pipelines de CI/CD, sino que simplifica enormemente el archivo `pyproject.toml`.

*Ejemplo de configuración de Ruff en `pyproject.toml`:*

```toml
[tool.ruff]
# Longitud máxima de línea (Black usa 88, PEP8 dice 79, muchos equipos prefieren 100-120)
line-length = 100
target-version = "py311"

[tool.ruff.lint]
# Seleccionamos las reglas a evaluar: 
# E (pycodestyle), F (Pyflakes), I (isort), UP (pyupgrade)
select = ["E", "F", "I", "UP"]
ignore = []

# Permitir que Ruff elimine automáticamente importaciones no usadas
fixable = ["ALL"] 
```

Con esta configuración, un solo comando (`ruff check --fix .` seguido de `ruff format .`) limpia, optimiza y formatea todo tu proyecto en milisegundos.

---

### Automatización con Pre-commit Hooks (El enfoque "Shift-Left")

Tener las mejores herramientas no sirve de nada si los desarrolladores olvidan ejecutarlas antes de subir su código. En la ingeniería moderna aplicamos la filosofía *"Shift-Left"* (mover las validaciones lo más a la izquierda o lo más temprano posible en el ciclo de vida del desarrollo).

Aquí es donde entra **`pre-commit`**. Es un framework que te permite gestionar *hooks* (ganchos) de Git. Se asegura de que ciertas validaciones pasen **antes** de que Git permita crear un *commit*.

```text
+-------------------+       +-----------------------+       +-------------------+
| Desarrollador     |       | Pre-commit Hooks      |       | Repositorio Git   |
| ejecuta:          | ----> | 1. ruff check (Lint)  | ----> | Si todo pasa, el  |
| git commit -m ... |       | 2. ruff format        |       | commit se crea.   |
+-------------------+       | 3. mypy (Tipado)      |       +-------------------+
                            +-----------------------+
                                        | (Si algo falla)
                                        v
                            +-----------------------+
                            | Commit rechazado.     |
                            | El dev debe arreglar. |
                            +-----------------------+
```

Para implementarlo, instalas la herramienta (`pip install pre-commit`) y creas un archivo `.pre-commit-config.yaml` en la raíz de tu proyecto:

```yaml
# .pre-commit-config.yaml
repos:
  # Hooks genéricos para evitar cosas como contraseñas en el código o archivos enormes
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-added-large-files
      - id: detect-private-key

  # Integración de Ruff
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
        args: [ --fix ] # Intenta arreglar errores automáticamente
      - id: ruff-format # Reemplaza a Black
```

Una vez configurado, el desarrollador ejecuta `pre-commit install` por única vez. A partir de ese momento, Git orquestará las validaciones silenciosamente.

Con pruebas unitarias robustas, aislamiento de componentes, análisis de cobertura y un pipeline automatizado de linters y formateadores, tu código backend ahora es predecible, legible y seguro contra regresiones funcionales. El siguiente paso en tu viaje de ingeniería senior es blindar estas aplicaciones contra amenazas externas, lo cual abordaremos en el **Capítulo 18: Seguridad en el Backend**.