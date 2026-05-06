La seguridad en el backend trasciende la simple restricción de acceso; es el arte de garantizar la integridad y confidencialidad en un entorno hostil. En este capítulo, exploramos cómo Go implementa estándares críticos para proteger identidades y recursos. Analizaremos desde la generación de **tokens sin estado** (JWT y PASETO), evitando vulnerabilidades de diseño, hasta la delegación de identidad mediante **OAuth2 y OpenID Connect**. Finalmente, abordaremos la persistencia segura de credenciales con **hashing de última generación** y la gestión de permisos complejos mediante modelos **RBAC y ABAC**, dotando a nuestras aplicaciones de una arquitectura defensiva robusta y escalable.

## 37.1. Generación y validación segura de JSON Web Tokens (JWT / PASETO)

En arquitecturas distribuidas y microservicios (como vimos en la Parte 9), la autenticación sin estado (*stateless*) es el estándar de facto. Al no depender de una sesión almacenada en el servidor o en una base de datos (evitando cuellos de botella), delegamos la confianza en la criptografía. En esta sección abordaremos cómo implementar tokens de forma segura en Go, cubriendo el omnipresente JWT y su alternativa moderna y robusta: PASETO.

Dado que ya dominas los fundamentos criptográficos (Capítulo 15) y la inyección de middlewares (Capítulo 25), nos centraremos estrictamente en las mecánicas de generación, firmado y validación para evitar las vulnerabilidades más críticas descritas por OWASP.

---

### JSON Web Tokens (JWT): Implementación defensiva en Go

El estándar JWT (RFC 7519) es extremadamente flexible, pero esa flexibilidad es su mayor debilidad. Históricamente, permitir que el cliente dicte el algoritmo de firma a través de la cabecera `alg` (incluyendo el nefasto `alg: "none"`) ha causado estragos en la seguridad de muchas APIs.

Para trabajar con JWT en Go, el estándar actual de la comunidad es el paquete `github.com/golang-jwt/jwt/v5`. La regla de oro al validar un JWT en Go es **forzar y verificar explícitamente el método de firma** en la función de recuperación de la clave (`Keyfunc`).

A continuación, se detalla un ejemplo robusto utilizando criptografía simétrica (HMAC-SHA256):

```go
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// CustomClaims extiende las claims estándar con datos específicos del dominio.
type CustomClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerarJWT crea un token firmado. Las claves simétricas deben rotarse y protegerse (Capítulo 38).
func GenerarJWT(userID, role string, secretKey []byte) (string, error) {
	claims := CustomClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)), // Tiempo de vida corto
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "mi-api-auth",
			Subject:   userID,
			ID:        uuid.NewString(), // JTI único para mitigación de repetición/revocación
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secretKey)
}

// ValidarJWT parsea y valida el token asegurando que el algoritmo no ha sido alterado.
func ValidarJWT(tokenString string, secretKey []byte) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// ¡CRÍTICO! Validar explícitamente el algoritmo de firma esperado.
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
		}
		return secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("error al procesar el token: %w", err)
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("token inválido")
}
```

**Consideraciones críticas para JWT:**
* **Asimetría recomendada:** Si múltiples servicios necesitan validar el token pero no generarlo, sustituye `HS256` (simétrico) por `RS256` o `ES256` (asimétrico, usando pares de claves pública/privada).
* **Tiempo de vida:** Mantén el `ExpiresAt` corto (10-15 minutos). Si requieres sesiones largas, implementa un flujo de *Refresh Tokens* opaco almacenado en base de datos.

---

### PASETO (Platform-Agnostic Security Tokens)

PASETO es una alternativa diseñada para corregir los errores arquitectónicos de JWT. En lugar de darle al desarrollador un "menú" de algoritmos criptográficos donde es fácil elegir mal, PASETO utiliza **versiones** (`v1`, `v2`, `v3`, `v4`). Cada versión encapsula una suite criptográfica fuerte y predefinida. Actualmente, se recomienda usar la versión 4 (v4).

PASETO define dos propósitos principales:
1.  **Local (Symmetric):** El payload está *encriptado* y autenticado (AEAD). El cliente no puede leer el contenido del token.
2.  **Public (Asymmetric):** El payload está codificado (como en JWT) y firmado digitalmente (Ed25519). Cualquiera con la clave pública puede leerlo y validarlo.

Utilizando el paquete `github.com/aidarkhanov/paseto` (una implementación moderna y auditada para v4 en Go), podemos generar tokens inmunes a los ataques de confusión de algoritmos.

```go
package auth

import (
	"time"
	"github.com/aidarkhanov/paseto"
	"github.com/aidarkhanov/paseto/token"
)

// GenerarPASETO crea un token V4 Local (encriptado simétricamente).
func GenerarPASETO(userID string, symmetricKey []byte) (string, error) {
	// PASETO v4 requiere una clave simétrica exacta de 32 bytes.
	secretKey, err := paseto.NewV4SymmetricKeyFromBytes(symmetricKey)
	if err != nil {
		return "", err
	}

	t := token.NewToken()
	t.SetAudience("mi-api-clientes")
	t.SetJti("identificador-unico-token")
	t.SetExpiration(time.Now().Add(15 * time.Minute))
	t.SetString("user_id", userID) // Custom claim

	// Genera el token: v4.local.xxxxx
	return paseto.MakeV4Local(t, secretKey)
}

// ValidarPASETO desencripta y valida automáticamente la expiración y las reglas criptográficas.
func ValidarPASETO(tokenString string, symmetricKey []byte) (string, error) {
	secretKey, err := paseto.NewV4SymmetricKeyFromBytes(symmetricKey)
	if err != nil {
		return "", err
	}

	parser := paseto.NewParserWithoutExpiryCheck() // Validaremos claims manualmente por control
	
	// Analiza y desencripta
	t, err := parser.ParseV4Local(secretKey, tokenString, nil)
	if err != nil {
		return "", err
	}

	// Validaciones de tiempo y negocio
	if err := paseto.ValidateExpectedClaims(t, paseto.ExpectedClaims{
		Audience: "mi-api-clientes",
	}); err != nil {
		return "", err
	}

	expireTime, err := t.GetExpiration()
	if err != nil || time.Now().After(expireTime) {
		return "", paseto.ErrTokenExpired
	}

	return t.GetString("user_id")
}
```

**¿Por qué preferir PASETO sobre JWT en nuevos proyectos Go?**
* **A prueba de tontos (Foolproof):** La librería en Go no te preguntará qué algoritmo usar al validar. La versión del token (`v4.local`) dicta la regla criptográfica, eliminando la ambigüedad.
* **Privacidad por defecto:** A diferencia de JWT, donde los datos son visibles en base64url, `v4.local` encripta el contenido. Puedes incluir correos electrónicos o roles sin exponerlos al cliente.

---
**Nota de arquitectura:** Ambas estrategias (JWT y PASETO) devuelven `strings` que deben ser extraídos idealmente de la cabecera `Authorization: Bearer <token>` dentro de tus Middlewares (Capítulo 25). Nunca almacenes estos tokens en variables globales ni asumas su validez sin pasarlos por las funciones de validación mostradas.

## 37.2. Integración de flujos OAuth2 y OpenID Connect

En la sección anterior vimos cómo emitir y validar nuestros propios tokens. Sin embargo, en el ecosistema actual es una práctica estándar delegar la gestión de identidades a un Proveedor de Identidad (IdP) externo, como Google, GitHub, Auth0 o Keycloak. Para ello, utilizamos **OAuth2** (el protocolo de autorización) y **OpenID Connect (OIDC)** (la capa de autenticación construida sobre OAuth2). 

La distinción es crucial: OAuth2 otorga *acceso* a una API (mediante un `access_token`), mientras que OIDC certifica *quién* es el usuario (mediante un `id_token`, que típicamente es un JWT como los que analizamos en la sección 37.1).

En Go, no necesitamos implementar los detalles criptográficos del protocolo desde cero. El ecosistema oficial nos provee el paquete `golang.org/x/oauth2`, y para la capa de identidad usaremos `github.com/coreos/go-oidc/v3/oidc`.

---

### 1. Configuración del Proveedor y el Cliente

El flujo más seguro y recomendado para aplicaciones backend (server-side) es el **Flujo de Código de Autorización (Authorization Code Flow)**. Antes de registrar nuestros Handlers (como vimos en el Capítulo 24), debemos inicializar la configuración del cliente.

```go
package auth

import (
	"context"
	"log"
	"os"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

var (
	OAuthConfig *oauth2.Config
	OIDCProvider *oidc.Provider
	Verifier     *oidc.IDTokenVerifier
)

// InicializarOAuth se llama al arrancar el servidor.
// Los secretos deben inyectarse de forma segura (ver Capítulo 38), nunca harcodearse.
func InicializarOAuth(ctx context.Context) {
	provider, err := oidc.NewProvider(ctx, "https://accounts.google.com")
	if err != nil {
		log.Fatalf("Error inicializando el proveedor OIDC: %v", err)
	}
	OIDCProvider = provider

	OIDCConfig := &oidc.Config{
		ClientID: os.Getenv("OAUTH_CLIENT_ID"),
	}
	Verifier = provider.Verifier(OIDCConfig)

	OAuthConfig = &oauth2.Config{
		ClientID:     os.Getenv("OAUTH_CLIENT_ID"),
		ClientSecret: os.Getenv("OAUTH_CLIENT_SECRET"),
		Endpoint:     provider.Endpoint(),
		RedirectURL:  "https://mi-api.com/auth/callback",
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}
}
```

---

### 2. Implementación de Handlers Seguros: Redirección y Callback

Para ejecutar el flujo, necesitamos dos endpoints. El primero redirige al usuario al proveedor. El segundo es el *callback* al que el proveedor redirigirá al usuario una vez que se haya autenticado, devolviendo un código que debemos intercambiar por los tokens.

**Mitigación de CSRF (Cross-Site Request Forgery):**
Como se discutió en el Capítulo 36, el parámetro `state` es obligatorio para evitar ataques CSRF en flujos OAuth2. En producción, este `state` debe ser un valor aleatorio criptográficamente seguro, atado a la sesión del usuario (por ejemplo, guardado en una cookie encriptada) y verificado a la vuelta.

```go
package auth

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"
)

// GenerarState crea un token aleatorio seguro.
func generarState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// HandleLogin inicia el flujo OAuth2.
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	state := generarState()
	
	// En un entorno real, guardamos el 'state' en una cookie HttpOnly, Secure
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Expires:  time.Now().Add(10 * time.Minute),
		HttpOnly: true,
		Secure:   true, // Requiere HTTPS (Capítulo 38)
	})

	// Redirigimos al usuario al IdP
	url := OAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}
```

El Handler del callback es donde ocurre el intercambio de contexto y la validación final. Es vital utilizar el `context.Context` del *Request* (Capítulo 13) para asegurar que si el cliente cancela la petición, no nos quedemos colgados esperando al proveedor de identidad.

```go
// HandleCallback procesa la respuesta del IdP.
func HandleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. Validar el parámetro State contra la cookie
	cookieState, err := r.Cookie("oauth_state")
	if err != nil || r.FormValue("state") != cookieState.Value {
		http.Error(w, "Estado OAuth inválido (Posible ataque CSRF)", http.StatusBadRequest)
		return
	}

	// 2. Intercambiar el Código de Autorización por un Token
	oauth2Token, err := OAuthConfig.Exchange(r.Context(), r.FormValue("code"))
	if err != nil {
		http.Error(w, "Fallo al intercambiar el token", http.StatusInternalServerError)
		return
	}

	// 3. Extraer y verificar el ID Token (OIDC)
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		http.Error(w, "No se encontró el id_token en la respuesta", http.StatusInternalServerError)
		return
	}

	idToken, err := Verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		http.Error(w, "ID Token inválido", http.StatusUnauthorized)
		return
	}

	// 4. Extraer los Claims (Datos del usuario)
	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
	}
	
	if err := idToken.Claims(&claims); err != nil {
		http.Error(w, "Fallo al decodificar claims", http.StatusInternalServerError)
		return
	}

	// Llegados a este punto, el usuario está autenticado. 
	// Aquí normalmente generaríamos nuestra propia sesión o JWT (Sección 37.1)
	// y redirigiríamos al cliente al frontend.
	
	w.Write([]byte("Bienvenido, " + claims.Name))
}
```

---

### Consideraciones adicionales de seguridad en Go

1. **PKCE (Proof Key for Code Exchange):** Aunque PKCE (RFC 7636) se diseñó originalmente para clientes públicos (SPAs, aplicaciones móviles), actualmente es una buena práctica recomendada también para clientes confidenciales (nuestro backend en Go). Puedes implementarlo añadiendo las opciones `oauth2.SetAuthURLParam("code_challenge", ...)` en el redireccionamiento y `oauth2.SetAuthURLParam("code_verifier", ...)` durante el intercambio (Exchange).
2. **AccessTypeOffline:** Como se observa en el método `AuthCodeURL`, solicitar acceso *offline* le indica al proveedor que deseamos un `refresh_token`. Esto es útil si nuestro backend necesita actuar en nombre del usuario de forma asíncrona cuando este ya no está conectado.

## 37.3. Hashing de contraseñas seguro (Bcrypt, Argon2)

Como analizamos en el Capítulo 15, las funciones de hash criptográfico como SHA-256 o (el ya obsoleto) MD5 son excelentes para verificar la integridad de archivos o firmar tokens. Sin embargo, **nunca deben utilizarse para almacenar contraseñas**. Están diseñadas para ser extremadamente rápidas, lo que permite a un atacante con hardware moderno (GPUs o ASICs) calcular miles de millones de hashes por segundo, facilitando los ataques de fuerza bruta y el uso de tablas *Rainbow*.

Para las contraseñas, necesitamos **Funciones de Derivación de Claves (KDF)**. Estas funciones son intencionadamente lentas y computacionalmente costosas. Además, incorporan automáticamente una "sal" (*salt*), un valor aleatorio que asegura que dos usuarios con la misma contraseña tengan hashes completamente diferentes. En el ecosistema de Go, las dos opciones estándar recomendadas residen en el repositorio extendido `golang.org/x/crypto`.

---

### 1. Bcrypt: El estándar probado en batalla

Bcrypt ha sido el estándar de la industria durante más de dos décadas. Su principal mecanismo de defensa es el **coste computacional** (Work Factor), que determina cuántas iteraciones del algoritmo se ejecutarán. A medida que el hardware mejora, simplemente aumentamos el coste.

La librería `golang.org/x/crypto/bcrypt` es extremadamente ergonómica, ya que el hash resultante incluye automáticamente el algoritmo, el coste, la sal y el hash final en una única cadena (por ejemplo: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`).

```go
package auth

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
)

// HashearPassword genera un hash Bcrypt a partir de una contraseña en texto plano.
func HashearPassword(password string) (string, error) {
	// bcrypt.DefaultCost es actualmente 10. Para mayor seguridad,
	// puedes aumentarlo (ej. 12 o 14), pero aumentará el tiempo de respuesta de tu API.
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerificarPassword compara una contraseña en texto plano con un hash Bcrypt.
func VerificarPassword(password, hash string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return errors.New("credenciales inválidas")
		}
		return err
	}
	return nil
}
```

**Limitaciones de Bcrypt:**
Aunque es seguro, Bcrypt solo consume CPU. Los atacantes modernos utilizan GPUs, que pueden paralelizar masivamente operaciones de CPU, reduciendo la efectividad del "coste" de Bcrypt.

---

### 2. Argon2: El estándar moderno (Resistente a memoria)

Argon2 fue el ganador de la *Password Hashing Competition* (PHC) en 2015. Su principal innovación es que no solo es computacionalmente costoso (CPU), sino que es **"Hard-Memory"** (intensivo en memoria). Exige que el hardware asigne una gran cantidad de memoria RAM para calcular el hash. Dado que la RAM en las GPUs es limitada y costosa, Argon2 neutraliza casi por completo los ataques basados en tarjetas gráficas y ASICs personalizados.

Existen tres variantes, pero la recomendada por OWASP es **Argon2id** (una combinación que protege tanto contra ataques de canales laterales como contra ataques de fuerza bruta por GPU).

En Go, usamos `golang.org/x/crypto/argon2`. A diferencia de Bcrypt, Argon2 en Go no genera automáticamente la cadena formateada con la sal y los parámetros, por lo que debemos manejar la generación de la sal mediante `crypto/rand` (Capítulo 15) y empaquetar los datos para su almacenamiento.

```go
package auth

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Parámetros recomendados por OWASP para Argon2id
type ArgonConfig struct {
	Time    uint32 // Iteraciones
	Memory  uint32 // Memoria en KB (ej. 64*1024 = 64MB)
	Threads uint8  // Grado de paralelismo
	KeyLen  uint32 // Longitud del hash generado
}

var defaultConfig = ArgonConfig{
	Time:    1,
	Memory:  64 * 1024,
	Threads: 4,
	KeyLen:  32,
}

// HashearArgon2id genera un hash seguro y lo devuelve en formato PHC.
func HashearArgon2id(password string) (string, error) {
	// 1. Generar una sal criptográficamente segura (16 bytes)
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	// 2. Generar el hash usando Argon2id
	hash := argon2.IDKey([]byte(password), salt, defaultConfig.Time, defaultConfig.Memory, defaultConfig.Threads, defaultConfig.KeyLen)

	// 3. Codificar en formato estándar (ej. $argon2id$v=19$m=65536,t=1,p=4$salBase64$hashBase64)
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encodedHash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, defaultConfig.Memory, defaultConfig.Time, defaultConfig.Threads, b64Salt, b64Hash)

	return encodedHash, nil
}

// VerificarArgon2id extrae los parámetros de la cadena y valida la contraseña.
func VerificarArgon2id(password, encodedHash string) error {
	// Parsear la cadena formateada (omito validaciones exhaustivas de longitud por brevedad)
	partes := strings.Split(encodedHash, "$")
	if len(partes) != 6 || partes[1] != "argon2id" {
		return errors.New("formato de hash no soportado")
	}

	var memory uint32
	var time uint32
	var threads uint8
	_, err := fmt.Sscanf(partes[3], "m=%d,t=%d,p=%d", &memory, &time, &threads)
	if err != nil {
		return err
	}

	salt, err := base64.RawStdEncoding.DecodeString(partes[4])
	if err != nil {
		return err
	}

	hashGuardado, err := base64.RawStdEncoding.DecodeString(partes[5])
	if err != nil {
		return err
	}

	// Volver a calcular el hash con los parámetros extraídos
	hashCalculado := argon2.IDKey([]byte(password), salt, time, memory, threads, uint32(len(hashGuardado)))

	// Comparación en tiempo constante para evitar ataques de timing (Timing Attacks)
	if subtle.ConstantTimeCompare(hashGuardado, hashCalculado) == 1 {
		return nil
	}
	return errors.New("credenciales inválidas")
}
```
*(Nota: Asegúrate de importar `crypto/subtle` para usar `ConstantTimeCompare`, vital para evitar que un atacante deduzca información midiendo el tiempo de respuesta de la comparación).*

### Resumen de decisión para tu API en Go:
* Usa **Bcrypt** si estás manteniendo un sistema *legacy*, si necesitas la máxima simplicidad en el código y si el riesgo de ataques dirigidos con granjas de GPUs es bajo.
* Usa **Argon2id** para cualquier desarrollo nuevo (Greenfield). El coste de escribir unas líneas extra para estructurar el string compensa con creces su superioridad arquitectónica contra hardware especializado.

## 37.4. Modelos de autorización: RBAC y ABAC con Casbin

Una vez que hemos resuelto la **autenticación** (quién es el usuario) en las secciones anteriores, nos enfrentamos al problema de la **autorización** (qué puede hacer ese usuario). En aplicaciones triviales, solemos ver sentencias dispersas por el código como `if user.Role == "admin"`. En sistemas empresariales y arquitecturas de microservicios, esta práctica genera deuda técnica, lógica fragmentada y fallos de seguridad.

Para resolver esto de forma escalable, la industria confía en modelos formales de control de acceso. Los dos más adoptados son:
* **RBAC (Role-Based Access Control):** Los permisos se asignan a roles (ej. *Admin*, *Editor*, *Viewer*), y los usuarios adquieren esos permisos al asumir un rol. Es excelente para dominios estructurados y jerárquicos.
* **ABAC (Attribute-Based Access Control):** Las políticas se evalúan dinámicamente basándose en atributos del usuario, del recurso y del entorno (ej. *"Un usuario puede editar un documento si el departamento del usuario coincide con el del documento y la hora actual está dentro del horario laboral"*). Ofrece una granularidad extrema a costa de mayor complejidad computacional.

En el ecosistema Go, la herramienta definitiva para unificar y abstraer esta lógica es **Casbin** (`github.com/casbin/casbin/v2`).

---

### 1. La anatomía de Casbin: El metamodelo PERM

Casbin no impone un modelo específico (no es estrictamente una librería RBAC o ABAC). En su lugar, utiliza el metamodelo **PERM** (Policy, Effect, Request, Matchers) configurado a través de un archivo `.conf`. Esto permite cambiar el modelo de autorización de toda la aplicación sin tocar una sola línea de código Go.

* **Request (`[request_definition]`):** Los argumentos que tu API enviará a Casbin (usualmente `sub` = sujeto/usuario, `obj` = objeto/recurso, `act` = acción).
* **Policy (`[policy_definition]`):** La estructura de las reglas almacenadas (ej. la tupla `admin, /api/users, GET`).
* **Effect (`[policy_effect]`):** Qué sucede si múltiples políticas coinciden (ej. "permitir si al menos una regla lo aprueba").
* **Matchers (`[matchers]`):** La expresión lógica que evalúa si el *Request* cumple con la *Policy*.

---

### 2. Implementación de RBAC con Casbin

Para implementar RBAC, necesitamos definir nuestro modelo. Generalmente, este archivo (`rbac_model.conf`) se define una vez y raramente cambia.

```ini
# rbac_model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _  # Define la jerarquía: "El usuario X tiene el rol Y"

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
# Verdadero si el usuario tiene el rol (g), el recurso coincide y la acción coincide.
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act || r.sub == "root"
```

En desarrollo, las políticas (`p`) y las asignaciones de roles (`g`) se pueden cargar desde un archivo `.csv`. Sin embargo, **en producción, debes usar un Adapter** (como GORM o sqlx, cubiertos en el Capítulo 29) para persistir estas reglas en tu base de datos relacional.

```go
package authz

import (
	"log"
	"github.com/casbin/casbin/v2"
)

// InicializarRBAC crea el Enforcer de Casbin.
// En producción, reemplazaríamos "policy.csv" por un adaptador de base de datos.
func InicializarRBAC() *casbin.Enforcer {
	enforcer, err := casbin.NewEnforcer("rbac_model.conf", "policy.csv")
	if err != nil {
		log.Fatalf("Fallo al inicializar Casbin: %v", err)
	}
	
	// Carga las reglas a memoria (esencial para rendimiento)
	enforcer.LoadPolicy()
	return enforcer
}

// VerificarPermiso evalúa la petición contra el motor de Casbin.
func VerificarPermiso(e *casbin.Enforcer, usuario, recurso, accion string) bool {
	// e.Enforce evalúa los parámetros contra los [matchers] del modelo.
	ok, err := e.Enforce(usuario, recurso, accion)
	if err != nil {
		// Loggear el error interno (Capítulo 39)
		return false
	}
	return ok
}
```

Al integrarlo en tu API, típicamente envolverás `e.Enforce` dentro de un **Middleware** (Capítulo 25). El middleware extraerá el `sub` (el ID del usuario) del JWT decodificado en el contexto de la petición, el `obj` de la URL (`r.URL.Path`) y el `act` del método HTTP (`r.Method`).

---

### 3. Evolucionando hacia ABAC

Cuando RBAC se queda corto (por ejemplo, si necesitas la regla: *"Un usuario con rol 'autor' solo puede editar los artículos donde él mismo sea el propietario"*), Casbin permite pasar **estructuras (structs) de Go** directamente al motor de evaluación.

El modelo ABAC puro en Casbin prescinde de los roles estáticos y evalúa las propiedades de los objetos en tiempo de ejecución mediante la función `eval()` o accediendo directamente a los campos.

```ini
# abac_model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
# Evaluamos directamente las propiedades de las estructuras Go inyectadas
m = r.sub.Role == "admin" || (r.sub.Department == r.obj.Department && r.act == p.act)
```

En Go, definimos nuestras entidades del dominio (Capítulo 22) y se las pasamos a Casbin:

```go
package authz

import (
	"fmt"
	"github.com/casbin/casbin/v2"
)

type Usuario struct {
	ID         int
	Role       string
	Department string
}

type Documento struct {
	ID         int
	Title      string
	Department string
}

func EvaluarABAC(e *casbin.Enforcer) {
	usuarioActual := Usuario{ID: 101, Role: "empleado", Department: "Finanzas"}
	documento := Documento{ID: 50, Title: "Balance Q3", Department: "Finanzas"}

	// Casbin usará reflexión (Capítulo 14) para acceder a los campos de los structs en el matcher
	permitido, _ := e.Enforce(usuarioActual, documento, "write")
	
	if permitido {
		fmt.Println("Acceso concedido mediante evaluación de atributos.")
	} else {
		fmt.Println("Acceso denegado.")
	}
}
```

**Consideraciones de rendimiento en Casbin:**
Casbin es extremadamente rápido porque almacena las políticas compiladas en memoria. Sin embargo, en arquitecturas de microservicios con múltiples réplicas de una API, si modificas una regla en la base de datos, debes notificar a las demás instancias para que invaliden y recarguen su caché en memoria. Para esto, Casbin soporta **Watchers** (usualmente respaldados por Redis Pub/Sub o etcd), garantizando consistencia eventual en entornos distribuidos.
