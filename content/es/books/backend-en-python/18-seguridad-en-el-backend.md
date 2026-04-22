## 18.1 Mecanismos de Autenticación y Autorización (JWT, OAuth2)

A estas alturas del libro, ya eres capaz de construir APIs robustas, gestionar bases de datos y manejar el asincronismo en Python. Sin embargo, una API expuesta al mundo sin medidas de seguridad es como un edificio sin cerraduras. En esta sección abordaremos cómo responder a las dos preguntas fundamentales de la seguridad en el backend: **¿Quién eres?** (Autenticación) y **¿Qué tienes permitido hacer?** (Autorización).

Es vital entender la diferencia entre ambos conceptos. La **autenticación (AuthN)** verifica la identidad de un usuario o servicio (ej. comprobar usuario y contraseña). La **autorización (AuthZ)** determina si esa identidad autenticada tiene los privilegios necesarios para acceder a un recurso específico (ej. verificar si el usuario tiene el rol de administrador).

En el ecosistema web moderno y las arquitecturas de microservicios, los estándares dominantes para manejar estos procesos son JWT y OAuth2.

---

### JSON Web Tokens (JWT)

El estándar JWT (RFC 7519) es un mecanismo para transmitir información de forma segura entre dos partes como un objeto JSON. Su principal ventaja en arquitecturas modernas es que es **stateless (sin estado)**: el servidor no necesita guardar un registro de la sesión en la base de datos o en memoria (como hacíamos tradicionalmente con las cookies de sesión), porque toda la información necesaria para verificar al usuario viaja autocontenida en el propio token.

Un JWT es simplemente una cadena de texto larga dividida en tres partes por puntos (`.`):

```text
+-----------------+       +-----------------+       +-----------------+
|                 |       |                 |       |                 |
|     HEADER      |       |     PAYLOAD     |       |    SIGNATURE    |
|  (Algoritmo y   |   .   | (Datos del user |   .   | (Firma digital  |
|  tipo de token) |       |  y caducidad)   |       | para validación)|
|                 |       |                 |       |                 |
+-----------------+       +-----------------+       +-----------------+

Ejemplo visual:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ . SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

1. **Header (Cabecera):** Define el tipo de token (JWT) y el algoritmo de firma (como HMAC SHA256 o RSA).
2. **Payload (Cuerpo):** Contiene los *claims* o declaraciones (datos sobre el usuario). Existen claims registrados estándar como `sub` (subject/identificador), `exp` (expiration time) o `iat` (issued at).
3. **Signature (Firma):** Se genera combinando el Header y el Payload codificados en Base64Url, firmados con un secreto o una clave privada. **Esta firma es lo que garantiza que el token no ha sido alterado en tránsito.**

**⚠️ Advertencia de Seguridad:** Aunque el JWT está firmado, su contenido (Header y Payload) está codificado en Base64, *no cifrado*. Cualquier persona puede decodificarlo y leer su contenido. **Nunca incluyas información sensible** (como contraseñas o números de tarjetas de crédito) en el payload de un JWT.

#### Implementación en Python con `PyJWT`

Para trabajar con JWT en Python, la librería más estándar es `PyJWT`. Veamos un ejemplo de cómo generar y validar un token, aplicando buenas prácticas como el manejo de tipos y el control de errores que vimos en el Capítulo 6.

```python
import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

# En un entorno real, este secreto debe venir de variables de entorno (Capítulo 20)
SECRET_KEY = "tu_super_secreto_no_compartir_en_produccion"
ALGORITHM = "HS256"

def create_access_token(data: Dict[str, Any], expires_delta: timedelta) -> str:
    """Genera un JWT firmado con un tiempo de expiración."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    
    # jwt.encode retorna un string en las versiones modernas de PyJWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """Verifica y decodifica un JWT, manejando posibles excepciones."""
    try:
        decoded_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_payload
    except jwt.ExpiredSignatureError:
        raise ValueError("El token ha expirado. Por favor, inicie sesión nuevamente.")
    except jwt.InvalidTokenError:
        raise ValueError("Token inválido o corrupto.")

# Uso:
if __name__ == "__main__":
    user_data = {"sub": "usuario_123", "role": "admin"}
    token = create_access_token(user_data, timedelta(minutes=15))
    
    print(f"Token generado: {token[:30]}...")
    
    # Validando el token
    payload = verify_token(token)
    print(f"Payload decodificado: {payload}")
```

---

### OAuth2: El Marco de Autorización Delegada

Mientras que JWT es un formato de token, **OAuth2** es un marco (framework) de autorización. Su propósito original no es la autenticación (para eso se construyó OpenID Connect sobre OAuth2), sino permitir que una aplicación obtenga acceso limitado a una cuenta de usuario en un servicio de terceros, sin exponer la contraseña del usuario. 

Piensa en el clásico botón de *"Iniciar sesión con Google"* o *"Autorizar a esta app para leer tus repositorios de GitHub"*.

OAuth2 define cuatro roles principales:
1. **Resource Owner (Propietario del recurso):** El usuario final.
2. **Client (Cliente):** La aplicación que solicita acceso a los datos del usuario (tu backend o frontend).
3. **Authorization Server (Servidor de autorización):** El servidor que autentica al usuario y emite los tokens (ej. los servidores de Google).
4. **Resource Server (Servidor de recursos):** El servidor que aloja los datos protegidos y acepta los tokens.

#### Flujo de Código de Autorización (Authorization Code Flow)

El flujo más seguro y utilizado para aplicaciones web tradicionales y backends en Python es el *Authorization Code Flow*. Evita enviar tokens directamente al navegador, mitigando riesgos.

```text
[Cliente/Tu App]                                [Authorization Server]
       |                                                  |
       | 1. Redirige al usuario pidiendo autorización     |
       |------------------------------------------------->|
       |                                                  |
       |                 (El usuario inicia sesión y aprueba el acceso)
       |                                                  |
       | 2. Redirige de vuelta al Cliente con un CÓDIGO   |
       |<-------------------------------------------------|
       |                                                  |
       | 3. El backend intercambia el CÓDIGO + su Secreto |
       |    por un Access Token (usualmente un JWT)       |
       |------------------------------------------------->|
       |                                                  |
       | 4. Retorna el Access Token (y Refresh Token)     |
       |<-------------------------------------------------|
```

#### Integración en Frameworks Modernos (FastAPI)

En Python moderno, frameworks como FastAPI (visto en el Capítulo 16) facilitan enormemente la implementación de estos estándares. FastAPI incluye utilidades bajo `fastapi.security` que combinan la especificación de OAuth2 (específicamente el flujo `password` o `authorization_code`) con tokens JWT.

El siguiente es un esquema mental de cómo se acoplan ambos mundos usando el sistema de inyección de dependencias de FastAPI:

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

app = FastAPI()

# Le indicamos a FastAPI dónde (en qué endpoint) el cliente debe ir para obtener el token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Esta dependencia se ejecutará en cada petición a rutas protegidas.
    Extrae automáticamente el token del header 'Authorization: Bearer <token>'.
    """
    try:
        # Aquí reutilizaríamos nuestra función verify_token definida arriba
        payload = verify_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError()
        return user_id # O buscar el objeto User en la BD
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

# Protegiendo una ruta usando la dependencia
@app.get("/api/v1/datos-sensibles")
async def read_sensitive_data(current_user_id: str = Depends(get_current_user)):
    return {"mensaje": "Acceso concedido", "usuario": current_user_id}
```

**Resumen Arquitectónico:**
Al combinar JWT y OAuth2, logras un sistema donde el servidor de autorización se encarga de las reglas complejas de identidad, y tus microservicios (Resource Servers) solo necesitan la clave pública o secreta para verificar los JWT que reciben en las cabeceras HTTP de cada petición. Esto reduce drásticamente las consultas a la base de datos (I/O bound) durante la verificación de sesiones, mejorando el rendimiento global de tu arquitectura. 

En la siguiente sección (18.2), exploraremos cómo proteger estos mismos endpoints contra ataques maliciosos comunes como Inyección SQL y Cross-Site Scripting.

## 18.2 Mitigación de vulnerabilidades OWASP (SQLi, XSS, CSRF)

Desarrollar software funcional es solo la mitad del trabajo; la otra mitad es asegurar que sea resistente a ataques malintencionados. El proyecto **OWASP** (Open Worldwide Application Security Project) mantiene un documento estándar llamado *OWASP Top 10*, que clasifica los riesgos de seguridad más críticos en aplicaciones web. 

Como desarrolladores backend en Python, estamos en la primera línea de defensa. A continuación, analizaremos tres de las vulnerabilidades históricamente más explotadas y cómo mitigarlas en nuestro código.

---

### 1. Inyección SQL (SQLi)

La Inyección SQL ocurre cuando los datos proporcionados por un usuario se incluyen directamente en una consulta a la base de datos sin ser validados o escapados correctamente. Esto permite al atacante manipular la consulta para leer, modificar o eliminar datos a los que no debería tener acceso.

**El mecanismo del ataque:**
Imagina un endpoint de login que busca usuarios construyendo la consulta concatenando cadenas (una práctica terrible):

```text
Entrada del usuario (email): admin@app.com' OR '1'='1
Consulta resultante: 
SELECT * FROM users WHERE email = 'admin@app.com' OR '1'='1' AND password = '...'
```
Como `'1'='1'` es siempre verdadero, el atacante podría evadir la autenticación por completo.

**Mitigación en Python:**
La regla de oro es **nunca usar concatenación de cadenas o f-strings para construir consultas SQL**. 

* **Uso de ORMs:** Herramientas como SQLAlchemy (visto en el Capítulo 15) o el ORM de Django mitigan esta vulnerabilidad automáticamente por diseño, ya que parametrizan las consultas en segundo plano.
* **Consultas parametrizadas (Drivers nativos):** Si debes usar SQL puro (por ejemplo, con `asyncpg` o `psycopg2`), utiliza siempre los marcadores de posición del driver.

```python
# ❌ INCORRECTO Y VULNERABLE (¡Nunca hagas esto!)
query = f"SELECT * FROM users WHERE username = '{user_input}'"
cursor.execute(query)

# ✅ CORRECTO (Driver nativo, usando tuplas para los parámetros)
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (user_input,))

# ✅ CORRECTO (Usando SQLAlchemy Core/ORM)
from sqlalchemy import text
query = text("SELECT * FROM users WHERE username = :username")
result = session.execute(query, {"username": user_input})
```

---

### 2. Cross-Site Scripting (XSS)

El XSS ocurre cuando una aplicación incluye datos no confiables en una página web sin la validación o el escape adecuados. Esto permite a un atacante ejecutar scripts maliciosos (generalmente JavaScript) en el navegador de la víctima. 

Aunque el XSS se ejecuta en el *frontend*, el *backend* es el responsable de almacenar (XSS Almacenado) o reflejar (XSS Reflejado) el código malicioso.

**Mitigación en el Backend (Python):**

1.  **Escapar la salida (Output Encoding):** Si tu backend renderiza HTML (por ejemplo, usando Flask y Jinja2 o Django Templates), los motores de plantillas modernos escapan automáticamente las variables por defecto. Convierte caracteres peligrosos como `<` en `&lt;`. 
    * *Precaución:* Nunca desactives este comportamiento con filtros como `|safe` (Jinja2) a menos que estés absolutamente seguro del origen de los datos.
2.  **Validación y Sanitización de entrada:** No confíes en lo que envía el cliente. Si tu API solo debe recibir texto alfanumérico, rechaza cualquier input que contenga etiquetas HTML. Si *necesitas* permitir HTML (ej. un editor de texto enriquecido), usa librerías como `bleach` para limpiar etiquetas maliciosas antes de guardar en la base de datos:

```python
import bleach

def sanitize_user_bio(bio_text: str) -> str:
    # Solo permitimos negritas y cursivas
    allowed_tags = ['b', 'i', 'strong', 'em']
    clean_bio = bleach.clean(bio_text, tags=allowed_tags)
    return clean_bio
```

3.  **Cabeceras de Seguridad (CSP):** Configura tu backend para enviar la cabecera HTTP `Content-Security-Policy`. Esto le dice al navegador desde qué dominios está permitido ejecutar scripts, bloqueando la ejecución de scripts inyectados inline.

---

### 3. Cross-Site Request Forgery (CSRF)

El CSRF (Falsificación de Petición en Sitios Cruzados) engaña al navegador de un usuario autenticado para que realice una acción no deseada en tu aplicación sin su consentimiento.

**El mecanismo del ataque:**
```text
1. El usuario inicia sesión en tu app (banco.com). El navegador guarda una Cookie de sesión.
2. El usuario visita un sitio malicioso (gatosgraciosos.com) en otra pestaña.
3. El sitio malicioso tiene un formulario oculto que envía un POST a banco.com/transferir.
4. El navegador del usuario adjunta automáticamente la Cookie de banco.com a esa petición.
5. Tu servidor recibe la petición, ve una cookie válida y procesa la transferencia.
```

**La relación con JWT (Sección 18.1):**
Si tu API web utiliza JWT enviados explícitamente en la cabecera `Authorization: Bearer <token>` mediante código JavaScript (fetch/axios), **eres naturalmente inmune al CSRF**, ya que el navegador no adjunta cabeceras personaladas de forma automática al hacer peticiones cruzadas. 
Sin embargo, si guardas tus JWT en *Cookies HTTPOnly* (una práctica recomendada para evitar ataques XSS), vuelves a ser vulnerable a CSRF.

**Mitigación en Python:**

1.  **Atributo SameSite en Cookies:** Es la primera y más efectiva línea de defensa moderna. Al configurar tus cookies (sea de sesión o con JWT), asegúrate de usar `SameSite=Lax` o `SameSite=Strict`. Esto impide que el navegador envíe la cookie si la petición se origina desde un dominio diferente.

```python
# Ejemplo en FastAPI devolviendo una cookie segura
from fastapi import Response

@app.post("/login")
def login(response: Response):
    # Lógica de autenticación...
    response.set_cookie(
        key="access_token", 
        value=token, 
        httponly=True, 
        secure=True, # Solo HTTPS
        samesite="lax" # Prevención CSRF
    )
    return {"msg": "Login exitoso"}
```

2.  **Tokens Anti-CSRF:** Es el método clásico. El servidor genera un token criptográfico único y lo envía al frontend. El frontend debe incluir ese token en un campo oculto del formulario o en una cabecera HTTP (`X-CSRFToken`) en las peticiones mutables (POST, PUT, DELETE).
    * **Django:** Lo incluye de forma nativa. Solo necesitas agregar `{% csrf_token %}` en tus formularios HTML, o el middleware `CsrfViewMiddleware` rechazará la petición.
    * **FastAPI / Flask:** Existen extensiones (como `fastapi-csrf-protect` o `Flask-WTF`) que implementan este patrón si estás construyendo aplicaciones con renderizado del lado del servidor.

## 18.3 Manejo seguro de contraseñas (hashing con bcrypt/Argon2) y secretos

La regla número uno de la seguridad de datos es asumir que, en algún momento, tu base de datos podría verse comprometida. Si un atacante logra acceder a la tabla de usuarios, las contraseñas deben ser matemáticamente imposibles de revertir a su forma original. Aquí es donde entra el almacenamiento seguro de credenciales y la gestión estricta de secretos.

---

### 1. La Evolución del Hashing de Contraseñas

Es fundamental entender por qué las técnicas antiguas ya no sirven. 

* **El error del texto plano:** Guardar `password = "123456"` es negligencia pura.
* **El error de los hashes rápidos (MD5, SHA-1, SHA-256):** Las funciones de hash criptográficas tradicionales están diseñadas para ser **extremadamente rápidas** (para verificar la integridad de archivos grandes, por ejemplo). Un hardware moderno puede calcular miles de millones de hashes SHA-256 por segundo. Si usas SHA-256, un atacante puede usar ataques de fuerza bruta o *Rainbow Tables* (tablas precalculadas) para descifrar las contraseñas en minutos.
* **La solución: Salting + Algoritmos Lentos (KDF):** Para almacenar contraseñas, necesitamos Funciones de Derivación de Claves (KDF). Estas funciones añaden una **"Salt"** (una cadena aleatoria única para cada usuario que neutraliza las Rainbow Tables) y son deliberadamente **lentas**. Introducen un "factor de trabajo" o costo que hace que calcular un hash tome, por ejemplo, 300 milisegundos. Para un usuario que inicia sesión, 300ms es imperceptible; para un atacante intentando miles de millones de combinaciones, representa años de procesamiento.

```text
Flujo seguro de creación de contraseña:
[Contraseña Plana] + [Salt Aleatoria] ---> (Algoritmo Lento KDF) ---> [Hash Almacenado]

Flujo de verificación (Login):
[Contraseña de Entrada] + [Salt Extraída del Hash] ---> (Algoritmo Lento KDF) ---> ¿Es igual al Hash Almacenado?
```

### 2. bcrypt vs. Argon2

En el desarrollo backend moderno, hay dos estándares principales:

1.  **bcrypt:** Es el estándar de la industria desde hace más de dos décadas. Su principal característica es que es intensivo en CPU y permite ajustar su "costo" (rounds) a medida que el hardware mejora.
2.  **Argon2:** Es el ganador de la *Password Hashing Competition* (2015) y es el estándar moderno recomendado por organizaciones como OWASP. A diferencia de bcrypt, Argon2 (específicamente la variante `Argon2id`) es intensivo no solo en CPU, sino también en **memoria RAM**. Esto lo hace altamente resistente a ataques que utilizan hardware especializado como GPUs o ASICs, los cuales tienen mucha capacidad de cálculo pero memoria limitada.

### 3. Implementación en Python con `passlib`

Aunque puedes usar las librerías `bcrypt` o `argon2-cffi` directamente, la práctica recomendada en Python (especialmente en frameworks como FastAPI) es utilizar **`passlib`**. Esta librería abstrae la complejidad y maneja los "contextos", permitiéndote actualizar los algoritmos en el futuro sin romper los inicios de sesión de los usuarios existentes.

Primero, instala las dependencias (usaremos bcrypt para el ejemplo, pero el esquema es idéntico para Argon2):
```bash
pip install "passlib[bcrypt]"
# O para Argon2: pip install "passlib[argon2]"
```

A continuación, la implementación de un gestor de contraseñas:

```python
from passlib.context import CryptContext

# Configuramos el contexto. Passlib manejará la generación de la "salt" automáticamente.
# 'deprecated="auto"' permite migrar contraseñas viejas a esquemas nuevos si cambias de algoritmo.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Genera un hash seguro a partir de una contraseña en texto plano."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con el hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)

# --- Uso Práctico ---
if __name__ == "__main__":
    password_usuario = "MiSuperSecreta123!"
    
    # 1. Registro: Generamos el hash y lo guardamos en la Base de Datos
    hash_guardado = get_password_hash(password_usuario)
    print(f"Hash almacenado en BD:\n{hash_guardado}\n")
    # Nota: El string resultante incluye el algoritmo, el costo, la salt y el hash final.
    # Ejemplo: $2b$12$DkI... (2b=bcrypt, 12=costo, resto=salt+hash)

    # 2. Login: Verificamos
    intento_correcto = verify_password("MiSuperSecreta123!", hash_guardado)
    intento_fallido = verify_password("password_equivocada", hash_guardado)

    print(f"¿Login correcto?: {intento_correcto}")   # True
    print(f"¿Login incorrecto?: {intento_fallido}") # False
```

---

### 4. Gestión Segura de Secretos

El código fuente de tu aplicación, incluso en repositorios privados, nunca debe contener credenciales, claves de APIs, o secretos JWT. Si un desarrollador sube accidentalmente estas claves a GitHub (un evento alarmantemente común), tu infraestructura queda expuesta de inmediato.

**La Regla de Oro:** Todo secreto debe inyectarse en la aplicación a través del entorno de ejecución (Environment Variables).

**Nivel 1: Archivos `.env` (Desarrollo local)**
Utiliza librerías como `python-dotenv` para cargar variables de entorno desde un archivo `.env` que **nunca** debe ser versionado (debe estar en tu `.gitignore`).

**Nivel 2: Pydantic Settings (Aplicaciones Modernas)**
Si utilizas FastAPI o Pydantic (como vimos en el Capítulo 16), la mejor forma de gestionar la configuración es utilizando `pydantic-settings`. Esto valida que las variables de entorno existan y tengan el tipo correcto antes de que la aplicación arranque, evitando fallos silenciosos en producción.

```python
# pip install pydantic-settings
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    app_name: str = "Mi API Segura"
    # SecretStr evita que el valor se imprima accidentalmente en los logs
    database_url: SecretStr 
    jwt_secret_key: SecretStr
    
    # Busca estas variables en el sistema o en un archivo .env local
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

# Instanciar la configuración al inicio de la app
settings = Settings()

# Para usar el valor real en tu conexión a la BD, usas .get_secret_value()
print(f"Conectando a BD con credenciales ocultas...")
# connection_string = settings.database_url.get_secret_value() 
```

**Nivel 3: Gestores de Secretos Cloud (Nivel Senior)**
Para entornos de producción distribuidos y arquitecturas de microservicios (Capítulos 19 y 20), depender de variables de entorno estáticas puede ser insuficiente o difícil de auditar. 

En arquitecturas Senior, la aplicación al arrancar se autentica contra un servicio dedicado como **AWS Secrets Manager**, **Google Secret Manager** o **HashiCorp Vault**. Estos sistemas permiten rotar las contraseñas de las bases de datos automáticamente cada ciertos días sin que tengas que reiniciar tu aplicación en Python ni cambiar código, llevando la seguridad a su máximo nivel.