La seguridad en el backend no es una capa opcional, sino el cimiento sobre el cual se construye la confianza del usuario. En este capítulo, exploramos cómo Rust garantiza la integridad y confidencialidad de los datos mediante herramientas que priorizan la seguridad de memoria. Analizamos desde el **hashing de contraseñas** con Argon2 para neutralizar ataques de fuerza bruta, hasta la implementación de **TLS nativo** con `rustls` y `ring`, eliminando la dependencia de librerías críticas en C. Finalmente, abordamos el cifrado **AEAD** y la gestión de entropía con **CSPRNGs**, asegurando que cada byte de aleatoriedad en tu sistema sea matemáticamente impredecible y robusto.

## 41.1 Hashing seguro de contraseñas (Argon2, bcrypt)

Almacenar contraseñas en texto plano es, indiscutiblemente, uno de los peores errores de diseño en cualquier aplicación backend. Sin embargo, no basta con simplemente "hashear" la contraseña. Funciones criptográficas como SHA-256 o SHA-3 están diseñadas para ser extremadamente rápidas y eficientes, lo cual es una desventaja en el almacenamiento de credenciales: un atacante con hardware moderno (especialmente GPUs o ASICs) puede calcular miles de millones de hashes por segundo para ejecutar ataques de fuerza bruta o de diccionario.

Para proteger las contraseñas, necesitamos **Funciones de Derivación de Claves (KDF)** o algoritmos de hashing de contraseñas. Estos algoritmos están diseñados intencionalmente para ser lentos y consumir recursos (CPU y/o memoria), lo que encarece exponencialmente el coste de un ataque. En el ecosistema moderno de Rust, los dos estándares principales son **Argon2** y **bcrypt**.

### El estándar moderno: Argon2

Argon2 fue el ganador de la *Password Hashing Competition* (PHC) en 2015 y es la recomendación actual de organizaciones como OWASP. Su principal ventaja es que es "duro de memoria" (*memory-hard*), lo que significa que requiere una cantidad significativa de memoria RAM para calcularse, neutralizando la ventaja de las granjas de GPUs de los atacantes.

Argon2 tiene tres variantes:

* **Argon2d:** Maximiza la resistencia a ataques de cracking por GPU, pero es vulnerable a ataques de canal lateral (*side-channel attacks*).
* **Argon2i:** Optimizado contra ataques de canal lateral, pero menos robusto frente a cracking por hardware.
* **Argon2id:** Una combinación de ambos. **Esta es la variante recomendada para aplicaciones backend y web.**

En Rust, la implementación estándar de facto pertenece al proyecto *RustCrypto* mediante el crate `argon2`. Para usarlo, normalmente requerimos habilitar características adicionales para la gestión de generación de "salts" aleatorios.

**Dependencias en `Cargo.toml`:**

```toml
[dependencies]
argon2 = { version = "0.5", features = ["std"] }
rand_core = { version = "0.6", features = ["std"] } # Para la generación de la salt
```

**Implementación de Hashing y Verificación:**

A continuación, abstraemos la lógica de Argon2. Observa cómo el propio crate gestiona la generación de la *salt* (un valor aleatorio único por contraseña) de forma transparente cuando usamos `OsRng` (generador de números aleatorios del sistema operativo, concepto que profundizaremos en la sección 41.4).

```rust
use argon2::{
    password_hash::{
        rand_core::OsRng,
        Error as PasswordError, PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2,
};

pub struct PasswordManager;

impl PasswordManager {
    /// Toma una contraseña en texto plano y retorna el hash formateado en cadena (PHC format).
    pub fn hash_password(password: &str) -> Result<String, PasswordError> {
        // Generamos una salt criptográficamente segura
        let salt = SaltString::generate(&mut OsRng);
        
        // Instanciamos Argon2 con la configuración por defecto (Argon2id)
        let argon2 = Argon2::default();
        
        // Calculamos el hash y lo convertimos a String
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
        Ok(password_hash.to_string())
    }

    /// Compara una contraseña en texto plano con un hash almacenado en la base de datos.
    pub fn verify_password(password: &str, hashed_password: &str) -> Result<bool, PasswordError> {
        let parsed_hash = PasswordHash::new(hashed_password)?;
        let argon2 = Argon2::default();
        
        // verify_password devuelve un Result. Si es Ok(()), la contraseña es válida.
        match argon2.verify_password(password.as_bytes(), &parsed_hash) {
            Ok(_) => Ok(true),
            Err(argon2::password_hash::Error::Password) => Ok(false), // Hash no coincide
            Err(e) => Err(e), // Otros errores (formato inválido, etc.)
        }
    }
}
```

El string resultante devuelto por `hash_password` es compatible con el formato estándar PHC (por ejemplo: `$argon2id$v=19$m=19456,t=2,p=1$...`), el cual incluye la versión del algoritmo, los parámetros de costo de memoria (`m`), iteraciones de tiempo (`t`), grado de paralelismo (`p`), la salt y el propio hash. Esto facilita futuras migraciones si necesitas ajustar los parámetros de costo de Argon2.

### La alternativa robusta: bcrypt

Aunque Argon2 es superior técnicamente, **bcrypt** ha estado en producción desde 1999 y sigue siendo una opción perfectamente válida y extremadamente extendida. Está basado en el cifrador de bloques Blowfish y, a diferencia de Argon2, solo penaliza la CPU (no es *memory-hard*).

Si necesitas integrarte con sistemas *legacy* o bases de datos compartidas donde otra aplicación (escrita en Node.js, Python, PHP, etc.) ya usa bcrypt, usar el crate `bcrypt` en Rust será tu mejor opción.

**Dependencias en `Cargo.toml`:**

```toml
[dependencies]
bcrypt = "0.15"
```

**Ejemplo de uso de bcrypt:**

```rust
use bcrypt::{hash, verify, DEFAULT_COST};

pub fn hash_with_bcrypt(password: &str) -> Result<String, bcrypt::BcryptError> {
    // DEFAULT_COST es actualmente 12. Aumentar este número duplica el tiempo de cálculo.
    let hashed = hash(password, DEFAULT_COST)?;
    Ok(hashed)
}

pub fn verify_with_bcrypt(password: &str, hashed: &str) -> Result<bool, bcrypt::BcryptError> {
    let valid = verify(password, hashed)?;
    Ok(valid)
}
```

### Consideración Crítica Arquitectónica: Hashing y Asincronía

Como vimos en el Capítulo 32 (El runtime de Tokio), bloquear un hilo del *worker* con operaciones intensivas en CPU arruina el rendimiento y la concurrencia de tu servidor asíncrono.

Tanto Argon2 como bcrypt están diseñados, **por definición**, para bloquear el procesador durante fracciones de segundo. Si ejecutas estas funciones directamente dentro de un *handler* de Axum o Actix-Web, detendrás el procesamiento de otras requests concurrentes que compartan ese hilo de Tokio.

Para solucionar esto en arquitecturas de backend modernas, **siempre** debes delegar el hashing de contraseñas al pool de hilos dedicados a operaciones bloqueantes utilizando `tokio::task::spawn_blocking`:

```rust
use tokio::task;

// Dentro de tu handler asíncrono (ej. Axum o Actix)
pub async fn register_user_handler(payload: RegisterPayload) -> Result<HttpResponse, CustomError> {
    let plain_password = payload.password;
    
    // Delegamos la carga de CPU a un hilo bloqueante para no asfixiar el runtime asíncrono
    let hashed_password = task::spawn_blocking(move || {
        PasswordManager::hash_password(&plain_password)
    })
    .await
    .map_err(|_| CustomError::InternalServerError)? // Manejo del error del JoinHandle
    .map_err(|_| CustomError::HashingError)?;      // Manejo del error de Argon2

    // Procedemos a guardar `hashed_password` en la base de datos...
    // ...
}
```

Esta separación entre la concurrencia asíncrona de I/O y la ejecución intensiva de CPU criptográfica es una de las marcas definitorias de una aplicación backend de nivel senior en Rust.

## 41.2 Uso avanzado del crate `ring` y `rustls` (Alternativa a OpenSSL)

Si has desarrollado backends en otros lenguajes, es muy probable que estés acostumbrado a depender de OpenSSL para todo lo relacionado con criptografía y conexiones TLS/SSL. En el ecosistema de Rust, usar OpenSSL a través del crate `openssl` (y su contraparte insegura `openssl-sys`) es posible, pero suele convertirse rápidamente en un dolor de cabeza a nivel operativo.

**El problema con OpenSSL en Rust:**

1. **Compilación cruzada (Cross-compilation):** Intentar compilar un binario de Rust desde macOS o Windows para un entorno Linux Alpine (`x86_64-unknown-linux-musl`) utilizando OpenSSL requiere configurar toolchains de C y compilar la librería estática de OpenSSL a mano.
2. **Seguridad de memoria:** OpenSSL está escrito en C. Por más seguro que sea tu código en Rust, si dependes de una librería en C, heredas sus vulnerabilidades de memoria (como el infame *Heartbleed*).
3. **Imágenes Docker pesadas:** Requiere instalar paquetes del sistema como `libssl-dev` o `openssl-dev`, impidiendo el uso de imágenes Docker ultraligeras tipo *scratch* o *distroless*.

Para solucionar esto, el ecosistema de Rust ha madurado hacia soluciones puras (o casi puras) en Rust: **`ring`** para las primitivas criptográficas y **`rustls`** para el protocolo TLS.

---

### Primitivas criptográficas de alto rendimiento con `ring`

El crate `ring` está enfocado en exponer un subconjunto de primitivas criptográficas de forma extremadamente segura y rápida. Combina código en Rust con rutinas en lenguaje ensamblador extraídas de BoringSSL (el fork de OpenSSL de Google) para garantizar un rendimiento óptimo sin sacrificar la seguridad.

Un caso de uso backend avanzado y muy común para `ring` es la validación de firmas **HMAC** (Hash-based Message Authentication Code). Esto es fundamental al construir integraciones con terceros, como validar que un evento Webhook realmente proviene de Stripe o GitHub y no de un atacante.

**Dependencias en `Cargo.toml`:**

```toml
[dependencies]
ring = "0.17"
```

**Ejemplo: Validación de firmas Webhook con HMAC-SHA256**

```rust
use ring::{hmac, error::Unspecified};

pub struct WebhookVerifier {
    key: hmac::Key,
}

impl WebhookVerifier {
    /// Inicializa el verificador con el secreto compartido (ej. variable de entorno)
    pub fn new(secret: &str) -> Self {
        let key = hmac::Key::new(hmac::HMAC_SHA256, secret.as_bytes());
        Self { key }
    }

    /// Verifica que el payload coincide con la firma recibida en los headers
    pub fn verify_signature(&self, payload: &[u8], signature_hex: &str) -> Result<(), Unspecified> {
        // En un caso real, primero decodificaríamos el hex a bytes. 
        // Aquí asumimos una función auxiliar `hex_to_bytes`.
        let signature_bytes = hex_to_bytes(signature_hex).map_err(|_| Unspecified)?;
        
        // ring realiza la comparación en tiempo constante (constant-time) 
        // para prevenir ataques de canal lateral (timing attacks).
        hmac::verify(&self.key, payload, &signature_bytes)
    }
}

// Función auxiliar (implementación simplificada para el ejemplo)
fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, ()> {
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).map_err(|_| ()))
        .collect()
}
```

*Nota arquitectónica:* Fíjate que `hmac::verify` mitiga automáticamente los *timing attacks* (ataques de tiempo). Si compararas la firma usando un simple `==` en Rust, la operación terminaría antes si los primeros caracteres fallan, revelando información al atacante. `ring` nos protege de esto por defecto.

---

### TLS nativo y seguro con `rustls`

Mientras `ring` maneja los algoritmos (SHA, AES, Curvas Elípticas), `rustls` implementa el protocolo TLS propiamente dicho. `rustls` está escrito 100% en código seguro de Rust, lo que elimina categorías enteras de vulnerabilidades presentes en implementaciones de C.

Para un desarrollador backend, el uso más crítico de `rustls` es servir APIs sobre HTTPS o realizar peticiones HTTP a otros servicios.

**Ejemplo: Servidor HTTPS con Axum y Rustls**

Para integrar `rustls` en el framework web Axum (cubierto en el Capítulo 17), solemos usar herramientas del ecosistema como `axum-server`, que manejan el "acceptor" TLS de forma asíncrona.

**Dependencias en `Cargo.toml`:**

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
axum-server = { version = "0.6", features = ["tls-rustls"] }
```

**Implementación del servidor:**

```rust
use axum::{routing::get, Router};
use axum_server::tls_rustls::RustlsConfig;
use std::net::SocketAddr;
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/secure-data", get(|| async { "Información cifrada nativamente en Rust" }));

    // Rutas a tus certificados (usualmente generados por Let's Encrypt / Certbot)
    let cert_path = PathBuf::from("certs/cert.pem");
    let key_path = PathBuf::from("certs/key.pem");

    // Cargamos la configuración de Rustls. 
    // Esto fallará rápido (panic) si los archivos no existen o son inválidos.
    let config = RustlsConfig::from_pem_file(cert_path, key_path)
        .await
        .expect("Fallo al cargar los certificados TLS");

    let addr = SocketAddr::from(([0, 0, 0, 0], 8443));
    println!("Servidor HTTPS escuchando en {}", addr);

    // Arrancamos el servidor usando el acceptor de axum-server respaldado por rustls
    axum_server::bind_rustls(addr, config)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

**El impacto en producción:**
Al usar la combinación de `ring` y `rustls`, tu binario resultante dependerá únicamente de librerías del sistema muy básicas. Podrás compilar tu aplicación con el *target* `x86_64-unknown-linux-musl`, obtener un ejecutable único y estático, y desplegarlo en un contenedor Docker de apenas un par de megabytes (usando `scratch`), reduciendo drásticamente la superficie de ataque y los tiempos de despliegue.

## 41.3 Cifrado simétrico y asimétrico (AEAD)

En el desarrollo backend, constantemente necesitamos proteger datos en reposo (en la base de datos) o en tránsito (comunicación entre microservicios). Para ello, recurrimos al cifrado, el cual se divide en dos grandes familias: **simétrico** (una única clave compartida para cifrar y descifrar) y **asimétrico** (un par de claves: pública para cifrar/verificar, privada para descifrar/firmar).

La regla de oro en la arquitectura moderna es: **el cifrado asimétrico es lento y costoso; el simétrico es extremadamente rápido**. Por lo tanto, en sistemas reales utilizamos criptografía híbrida: usamos algoritmos asimétricos (como RSA o Curvas Elípticas) para intercambiar de forma segura una clave simétrica temporal, y luego usamos cifrado simétrico (como AES o ChaCha20) para cifrar el volumen real de datos. (Esto es exactamente lo que hace TLS bajo el capó, como vimos en la sección anterior con `rustls`).

### El estándar moderno en cifrado simétrico: AEAD

Durante años, esquemas simétricos como AES-CBC fueron el estándar. Sin embargo, tenían un defecto fatal: garantizaban la *confidencialidad* (nadie podía leer los datos), pero no la *integridad* (un atacante podía manipular los bytes cifrados, provocando comportamientos inesperados o vulnerabilidades como el *Padding Oracle Attack*).

La solución definitiva en la criptografía moderna es **AEAD** (*Authenticated Encryption with Associated Data*). AEAD no solo cifra el mensaje, sino que genera una etiqueta de autenticación (MAC). Si un solo bit del texto cifrado es alterado, la fase de descifrado fallará rotundamente, protegiendo a tu aplicación de procesar datos corruptos o maliciosos. Además, permite adjuntar "Datos Asociados" (*Associated Data*): metadatos en texto plano (como el ID de un usuario o cabeceras de red) que no se cifran, pero cuya integridad sí se verifica junto con el mensaje.

Los dos algoritmos AEAD más utilizados hoy en día son **AES-GCM** (acelerado por hardware en casi todas las CPUs modernas) y **ChaCha20-Poly1305** (extremadamente rápido en software, ideal para móviles o dispositivos IoT).

En el ecosistema de Rust, el proyecto *RustCrypto* provee abstracciones de primer nivel mediante el trait `Aead`.

**Dependencias en `Cargo.toml`:**

```toml
[dependencies]
aes-gcm = "0.10"
rand_core = { version = "0.6", features = ["std"] }
```

**Implementación de cifrado y descifrado con AES-256-GCM:**

```rust
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce, Key
};

pub struct EncryptionService {
    cipher: Aes256Gcm,
}

impl EncryptionService {
    /// Inicializa el servicio con una clave de 32 bytes (256 bits).
    /// En producción, esta clave debería venir de un gestor de secretos (Capítulo 43).
    pub fn new(key_bytes: &[u8; 32]) -> Self {
        let key = Key::<Aes256Gcm>::from_slice(key_bytes);
        let cipher = Aes256Gcm::new(key);
        Self { cipher }
    }

    /// Cifra un mensaje y retorna una tupla con (nonce, texto_cifrado).
    pub fn encrypt_data(&self, plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), aes_gcm::Error> {
        // 1. Generar un Nonce (Number used ONCE) criptográficamente seguro.
        // NUNCA debes reutilizar un nonce con la misma clave.
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

        // 2. Cifrar los datos. El método encrypt añade automáticamente la etiqueta MAC al final.
        let ciphertext = self.cipher.encrypt(&nonce, plaintext)?;

        // Retornamos ambos, ya que el Nonce es necesario para descifrar.
        // El Nonce NO es un secreto, puede guardarse en texto plano junto al ciphertext.
        Ok((nonce.to_vec(), ciphertext))
    }

    /// Descifra el mensaje garantizando su confidencialidad e integridad.
    pub fn decrypt_data(&self, nonce_bytes: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        let nonce = Nonce::from_slice(nonce_bytes);
        
        // Si el ciphertext fue modificado, esto devolverá un Error::AeadError
        let plaintext = self.cipher.decrypt(nonce, ciphertext)?;
        
        Ok(plaintext)
    }
}
```

### Cifrado Asimétrico en el Backend

Mientras que el cifrado simétrico AEAD es tu herramienta diaria para proteger datos de usuarios en la base de datos (por ejemplo, cifrando PII o información financiera a nivel de aplicación), el cifrado asimétrico en un backend moderno se utiliza principalmente para **Firmas Digitales**.

Como vimos en el Capítulo 18 al hablar de JWTs, no solemos usar RSA o Curvas Elípticas para "ocultar" un JSON, sino para "firmarlo". El servidor usa su clave privada para generar una firma sobre el JWT, y cualquier cliente (o microservicio) puede usar la clave pública del servidor para verificar matemáticamente que ese token fue emitido por ti y no ha sido alterado.

Actualmente, el estándar de facto para firmas digitales rápidas y seguras es **Ed25519** (basado en curvas elípticas). A diferencia de RSA, las claves de Ed25519 son minúsculas (32 bytes), las firmas son pequeñas (64 bytes) y las operaciones son inmunes a ataques de canal lateral por diseño. Puedes implementar firmas Ed25519 muy fácilmente tanto con el crate `ring` que vimos en la sección anterior, como con el crate `ed25519-dalek` del ecosistema RustCrypto.

## 41.4 Generación de números pseudoaleatorios seguros (`rand_core`)

Para cerrar el capítulo sobre criptografía, debemos abordar un pilar fundamental en el que se basan todos los algoritmos que hemos visto: la aleatoriedad. Ya sea para generar la *salt* de una contraseña en Argon2, el *nonce* en AES-GCM, claves asimétricas o tokens de sesión para tus APIs, necesitas números aleatorios.

Sin embargo, los ordenadores son máquinas deterministas. No saben ser aleatorios por naturaleza. Para solucionar esto, utilizamos algoritmos matemáticos llamados **PRNGs** (Generadores de Números Pseudoaleatorios). El problema radica en que los PRNGs estándar están diseñados para ser rápidos y tener una buena distribución estadística (útiles para simulaciones o videojuegos), pero **son predecibles**. Si un atacante descubre la semilla (*seed*) inicial o el estado interno de un PRNG estándar, puede predecir todos los números pasados y futuros, comprometiendo todo tu sistema de seguridad.

En el backend, debemos utilizar exclusivamente **CSPRNGs** (Generadores de Números Pseudoaleatorios Criptográficamente Seguros). Estos algoritmos están diseñados para que, incluso si un atacante observa una secuencia inmensa de números generados, le sea computacionalmente imposible deducir el estado interno o predecir el siguiente número.

### El ecosistema de aleatoriedad en Rust

En Rust, la aleatoriedad no forma parte de la Standard Library (fue extraída para permitir una evolución más ágil). En su lugar, utilizamos un conjunto de crates modulares mantenidos por la comunidad. Para entender cómo funciona a nivel avanzado, debes conocer las tres capas principales:

1. **`getrandom`**: Es la capa más baja. Se comunica directamente con la fuente de entropía del Sistema Operativo (por ejemplo, `/dev/urandom` en Linux o `BCryptGenRandom` en Windows). Extraer datos del OS es lento por el cambio de contexto, por lo que rara vez lo usamos directamente.
2. **`rand_core`**: Define los *traits* fundamentales que estandarizan cómo debe comportarse cualquier generador de números aleatorios.
3. **`rand`**: El crate de alto nivel que proporciona implementaciones concretas de PRNGs y utilidades convenientes.

### El superpoder del trait `CryptoRng`

Aquí es donde el sistema de tipos de Rust brilla de forma espectacular. ¿Cómo evitas que un desarrollador junior de tu equipo le pase un generador rápido pero inseguro (como `SmallRng`) a una función que genera tokens de reseteo de contraseñas?

El crate `rand_core` expone un *Marker Trait* (un trait sin métodos) llamado `CryptoRng`. Su única función es actuar como un "sello de garantía" a nivel del compilador. Si un PRNG implementa `CryptoRng`, sus autores certifican que es criptográficamente seguro.

**Dependencias en `Cargo.toml`:**

```toml
[dependencies]
rand_core = { version = "0.6", features = ["std"] }
rand = "0.8"
hex = "0.4" # Para codificar los bytes a un string legible
```

**Diseño de APIs seguras por defecto:**

Veamos cómo podemos crear una utilidad para generar tokens de sesión (como los que guardaríamos en Redis) obligando al compilador a rechazar generadores inseguros.

```rust
use rand_core::{CryptoRng, OsRng, RngCore};
use rand::rngs::ThreadRng;

pub struct TokenGenerator;

impl TokenGenerator {
    /// Genera un token seguro en formato hexadecimal.
    /// El `Trait Bound` `<R: RngCore + CryptoRng>` es la clave arquitectónica aquí.
    /// Garantiza en tiempo de compilación que solo se acepten CSPRNGs.
    pub fn generate_secure_token<R>(rng: &mut R, byte_length: usize) -> String
    where
        R: RngCore + CryptoRng,
    {
        let mut buffer = vec![0u8; byte_length];
        // Llenamos el buffer con entropía pura
        rng.fill_bytes(&mut buffer);
        
        // Lo codificamos a hexadecimal para poder enviarlo en un JSON o Cookie
        hex::encode(buffer)
    }
}

// --- Ejemplos de uso en tu aplicación ---

pub fn create_session() {
    // 1. OsRng: La opción más segura. 
    // Extrae entropía directamente del Sistema Operativo.
    // Es un poco más lento, pero ideal para claves a largo plazo o salts.
    let token_os = TokenGenerator::generate_secure_token(&mut OsRng, 32);
    println!("Token generado con OsRng: {}", token_os);

    // 2. ThreadRng: La opción balanceada.
    // Es un CSPRNG local al hilo (actualmente usa el algoritmo ChaCha12).
    // Se inicializa (seeding) periódicamente desde OsRng de forma automática.
    // Es muy rápido e ideal para tokens de corta vida (sesiones temporales, nonces).
    let mut thread_rng = rand::thread_rng();
    let token_thread = TokenGenerator::generate_secure_token(&mut thread_rng, 32);
    println!("Token generado con ThreadRng: {}", token_thread);

    // 3. ¡ERROR DE COMPILACIÓN!
    // Si intentáramos usar un PRNG rápido y no seguro como `SmallRng`,
    // el compilador nos detendría, ya que no implementa `CryptoRng`.
    /*
    use rand::rngs::SmallRng;
    use rand::SeedableRng;
    let mut insecure_rng = SmallRng::from_entropy();
    // Esto fallaría en compilación:
    TokenGenerator::generate_secure_token(&mut insecure_rng, 32);
    */
}
```

### Resumen de buenas prácticas de aleatoriedad en el Backend

1. **Nunca uses `rand::random()` para criptografía:** Esta función usa `ThreadRng` bajo el capó. Aunque `ThreadRng` es criptográficamente seguro hoy, la documentación oficial advierte que esto no es una garantía inmutable para `rand::random()`.
2. **Usa `OsRng` para material criptográfico de larga duración:** Claves privadas, *salts* de contraseñas y claves maestras deben derivarse siempre directamente del sistema operativo con `OsRng` para maximizar la imprevisibilidad.
3. **Usa `CryptoRng` en tus interfaces:** Si escribes una función que requiere aleatoriedad para algo sensible, no instancies `OsRng` directamente dentro de la función. Inyéctalo como dependencia usando el trait bound `<R: RngCore + CryptoRng>`. Esto facilita enormemente el testing, ya que podrás inyectar un CSPRNG simulado con una semilla conocida (*seeded*) en tus pruebas unitarias para que sean deterministas, manteniendo la seguridad en producción.
