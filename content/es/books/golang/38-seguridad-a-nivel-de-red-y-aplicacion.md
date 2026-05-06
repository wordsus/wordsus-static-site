En el desarrollo de servicios críticos, la seguridad no es una capa superficial, sino un pilar estructural. Go, con su robusto enfoque en la eficiencia y la simplicidad, ofrece herramientas poderosas para blindar nuestras aplicaciones desde el núcleo. En este capítulo, elevamos el estándar de protección analizando la implementación de **TLS moderno** para cifrar comunicaciones, el manejo dinámico de secretos mediante **HashiCorp Vault** para eliminar credenciales estáticas, y el uso de **Rate Limiting** para mitigar abusos y ataques DoS. Aquí aprenderás a transformar un servicio funcional en una fortaleza resiliente preparada para los desafíos del entorno de producción actual.

## 38.1. Configuración de servidores HTTPS seguros (TLS moderno)

En el Capítulo 24 exploramos cómo levantar servidores HTTP robustos utilizando `net/http` y cómo configurar correctamente los tiempos de espera (timeouts) para mitigar ataques como *Slowloris*. Sin embargo, cuando exponemos una API o un servicio web a Internet, cifrar la comunicación en tránsito no es opcional. 

Aunque el método `http.ListenAndServeTLS` proporciona una forma rápida de levantar un servidor HTTPS, su configuración por defecto busca un equilibrio entre seguridad y máxima compatibilidad con clientes antiguos. En un entorno de producción moderno o bajo normativas estrictas (como PCI-DSS o HIPAA), debemos tomar el control explícito del paquete `crypto/tls` para endurecer la configuración, forzando protocolos modernos y suites de cifrado seguras.

### 1. Anatomía de `tls.Config`

El corazón de la seguridad de red en Go reside en la estructura `tls.Config`. Al inyectar esta configuración en nuestro `http.Server`, podemos dictar las reglas criptográficas del apretón de manos (handshake) TLS.

Las tres áreas críticas que debemos auditar y configurar son:

1.  **Versiones del Protocolo (MinVersion / MaxVersion):** Hoy en día, TLS 1.0 y TLS 1.1 se consideran obsoletos y vulnerables. Debemos exigir **TLS 1.2 como mínimo absoluto**, siendo TLS 1.3 la opción ideal.
2.  **Suites de Cifrado (CipherSuites):** Si permitimos TLS 1.2, debemos restringir los algoritmos de cifrado para evitar aquellos que usan CBC (Cipher Block Chaining) o cifrados débiles como RC4 o 3DES. Optaremos siempre por AEAD (Authenticated Encryption with Associated Data) como GCM o ChaCha20-Poly1305.
3.  **Curvas Elípticas (CurvePreferences):** Determinan el algoritmo utilizado para el intercambio de claves (Key Exchange). `CurveP256` y `X25519` ofrecen el mejor equilibrio entre seguridad y rendimiento.

*Nota de diseño de Go:* A partir de Go 1.13, el protocolo TLS 1.3 está habilitado por defecto. Es importante destacar que, por diseño, **Go ignora la configuración de `CipherSuites` cuando negocia una conexión TLS 1.3**. El equipo de Go tomó esta decisión para evitar que los desarrolladores introduzcan accidentalmente configuraciones criptográficas débiles, ya que TLS 1.3 solo soporta suites AEAD inherentemente seguras. Las restricciones de `CipherSuites` que definamos solo se aplicarán si el cliente fuerza un *downgrade* a TLS 1.2.

### 2. Implementación de un Servidor TLS Endurecido

A continuación, implementaremos un servidor que exige TLS moderno, integrando además una cabecera de seguridad fundamental: **HSTS** (Strict-Transport-Security). Como vimos en el Capítulo 25, la mejor forma de aplicar estas cabeceras es mediante un middleware.

```go
package main

import (
	"crypto/tls"
	"log"
	"net/http"
	"time"
)

// hstsMiddleware inyecta la cabecera Strict-Transport-Security
// Esto instruye a los navegadores a comunicarse EXCLUSIVAMENTE por HTTPS.
func hstsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// max-age = 2 años. includeSubDomains asegura que todos los subdominios también estén protegidos.
		w.Header().Add("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/secure", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Conexión 100% segura mediante TLS moderno"))
	})

	// 1. Definimos las reglas criptográficas estrictas
	tlsConfig := &tls.Config{
		// Forzar TLS 1.2 como mínimo. Adiós a POODLE y vulnerabilidades antiguas.
		MinVersion: tls.VersionTLS12,
		
		// Priorizar curvas de intercambio de claves eficientes y seguras
		CurvePreferences: []tls.CurveID{
			tls.X25519,
			tls.CurveP256,
		},
		
		// Suites de cifrado permitidas (Solo aplicable si el cliente negocia TLS 1.2)
		// Solo permitimos algoritmos ECDHE (Forward Secrecy) y cifrados AEAD.
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
	}

	// 2. Acoplamos la configuración TLS al servidor HTTP configurado con Timeouts (Cap. 24)
	srv := &http.Server{
		Addr:         ":443",
		Handler:      hstsMiddleware(mux),
		TLSConfig:    tlsConfig,
		ReadTimeout:  5 * time.Second,  // Prevenir ataques de retención de conexión (Slowloris)
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Println("Servidor HTTPS endurecido iniciando en el puerto 443...")
	
	// Requiere certificados válidos generados por una CA (ej. Let's Encrypt) o mkcert para local
	err := srv.ListenAndServeTLS("server.crt", "server.key")
	if err != nil {
		log.Fatalf("Fallo crítico en el servidor TLS: %v", err)
	}
}
```

### 3. Certificados Dinámicos en Producción (Autocert)

Manejar manualmente los archivos `server.crt` y `server.key` es propenso a errores, especialmente en arquitecturas de microservicios (Capítulo 32) donde la rotación de certificados (Capítulo 38.2) debe ser constante. 

Para despliegues en producción orientados a Internet, la comunidad Go recomienda utilizar el paquete oficial `golang.org/x/crypto/acme/autocert`. Este paquete se encarga de negociar automáticamente la emisión y renovación de certificados con Let's Encrypt (o cualquier proveedor que soporte el protocolo ACME). Simplemente se inyecta su `Manager` dentro de nuestro `tlsConfig.GetCertificate`, logrando lo que se conoce como configuración TLS de *mantenimiento cero*.

## 38.2. Manejo y rotación de secretos en producción (HashiCorp Vault)

En el **Capítulo 20.3**, establecimos cómo gestionar la configuración de nuestras aplicaciones utilizando variables de entorno y herramientas como Viper. Sin embargo, para un entorno de producción seguro, **las variables de entorno no son el lugar adecuado para almacenar secretos** (contraseñas de bases de datos, claves de API, certificados privados). Las variables de entorno pueden filtrarse fácilmente a través de volcados de memoria (crash dumps), sistemas de monitoreo (como `expvar`, visto en el Cap. 42), o por procesos hijos que heredan `os.Environ()`.

Para mitigar este riesgo, las arquitecturas modernas delegan la responsabilidad a sistemas de gestión de secretos, siendo **HashiCorp Vault** el estándar de la industria. Vault no solo almacena secretos de forma cifrada (Key-Value), sino que introduce el concepto de **secretos dinámicos** y **arrendamientos (leases)**, permitiendo que una credencial tenga un tiempo de vida (TTL) estrictamente limitado y forzando su rotación automática.

### 1. Integración del Cliente de Vault en Go

Para comunicarnos con Vault, utilizaremos su cliente oficial (`github.com/hashicorp/vault/api`). Al igual que con cualquier cliente HTTP en Go (Capítulo 24), debemos asegurarnos de configurar correctamente los *timeouts* y, por supuesto, exigir la comunicación a través del canal seguro TLS que configuramos en la sección anterior (38.1).

Veamos cómo inicializar un cliente robusto y leer un secreto estático de un motor Key-Value (KV v2):

```go
package secret

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	vault "github.com/hashicorp/vault/api"
)

// VaultManager encapsula la lógica de interacción con HashiCorp Vault
type VaultManager struct {
	client *vault.Client
}

// NewVaultManager inicializa una conexión segura con Vault
func NewVaultManager(vaultAddr, token string) (*VaultManager, error) {
	config := vault.DefaultConfig()
	config.Address = vaultAddr

	// Configuramos un cliente HTTP con Timeouts estrictos
	config.HttpClient = &http.Client{
		Timeout: 10 * time.Second,
	}

	client, err := vault.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("error inicializando cliente de Vault: %w", err)
	}

	// En producción, la autenticación rara vez usa un Token estático.
	// Comúnmente se utiliza AppRole, o Kubernetes Auth (Cap. 49).
	client.SetToken(token)

	return &VaultManager{client: client}, nil
}

// GetAPIKey obtiene una clave estática desde el motor KV versión 2
func (v *VaultManager) GetAPIKey(ctx context.Context, path string) (string, error) {
	// KV v2 almacena los datos bajo la clave "data" interna
	secret, err := v.client.Logical().ReadWithContext(ctx, path)
	if err != nil {
		return "", fmt.Errorf("error leyendo secreto en %s: %w", path, err)
	}
	if secret == nil || secret.Data == nil {
		return "", fmt.Errorf("el secreto no existe en el path: %s", path)
	}

	// Navegando la estructura del motor KV v2
	data, ok := secret.Data["data"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("formato de datos inválido en KV v2")
	}

	apiKey, ok := data["api_key"].(string)
	if !ok {
		return "", fmt.Errorf("clave 'api_key' no encontrada en el secreto")
	}

	return apiKey, nil
}
```

### 2. Secretos Dinámicos y Rotación Automática

El verdadero poder de Vault en ecosistemas Go reside en los **secretos dinámicos**. Supongamos que nuestro servicio necesita conectarse a PostgreSQL (Capítulo 28). En lugar de tener un usuario y contraseña fijos, el servicio solicita credenciales a Vault. Vault se conecta a PostgreSQL, crea un usuario efímero con permisos limitados y devuelve esas credenciales a Go con un TTL (ej. 1 hora).

Si el servicio Go falla y muere, el TTL expira y Vault revoca automáticamente el usuario en PostgreSQL, reduciendo la superficie de ataque a cero.

Para mantener la conexión viva mientras el servicio Go siga funcionando, debemos implementar un mecanismo de **rotación y renovación (Renewer)**. Go, gracias a sus Goroutines (Capítulo 8), es excepcionalmente bueno para mantener estos *leases* en segundo plano sin bloquear el flujo principal de ejecución.

El cliente oficial de Vault nos provee un `Renewer` que podemos ejecutar asíncronamente:

```go
// RenewDynamicSecret inicia un proceso en background para mantener viva una credencial
func (v *VaultManager) RenewDynamicSecret(ctx context.Context, secret *vault.Secret) {
	renewer, err := v.client.NewRenewer(&vault.RenewerInput{
		Secret: secret,
		// Opcional: forzar un período de renovación o dejar que Vault decida
	})
	if err != nil {
		log.Fatalf("Fallo al inicializar el Renewer de Vault: %v", err)
	}

	// Arrancamos el proceso de renovación en una Goroutine dedicada
	go renewer.Renew()

	// Monitoreamos los canales del Renewer para reaccionar a eventos
	go func() {
		defer renewer.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("Contexto cancelado. Deteniendo renovación de secretos.")
				return
			case err := <-renewer.DoneCh():
				if err != nil {
					// Aquí se debería disparar una alerta de monitoreo (Cap. 40)
					log.Printf("El Renewer falló y se ha detenido: %v", err)
					// Dependiendo de la criticidad, podríamos forzar un reinicio (Panic)
					// para que el orquestador (Kubernetes) levante un nuevo pod.
				}
				log.Println("Renovación de secreto finalizada.")
				return
			case renewal := <-renewer.RenewCh():
				log.Printf("Secreto renovado exitosamente. Próxima expiración en: %d segundos", renewal.Secret.Auth.LeaseDuration)
			}
		}
	}()
}
```

### 3. Carga Inicial y Estrategia de Fallo (Fail-Fast)

Una regla de oro al diseñar microservicios robustos en Go (como vimos en el Capítulo 32.3) es el principio *Fail-Fast* (fallar rápido). Si tu aplicación arranca y no puede comunicarse con Vault, o las credenciales iniciales son inválidas, la aplicación no debe iniciar con un estado degradado; debe hacer `panic` o salir con un código de error fatal inmediatamente (`log.Fatal`). Esto permite que el sistema de orquestación (como Kubernetes, Capítulo 49) detecte que el *Liveness Probe* falló y reintente el despliegue de forma limpia.

## 38.3. Implementación de Rate Limiting (`golang.org/x/time/rate`) contra ataques de fuerza bruta y DDoS

En el **Capítulo 25**, estudiamos cómo los middlewares nos permiten interceptar y modificar el flujo de las peticiones HTTP. Una de las aplicaciones más críticas de este patrón en la capa de seguridad es el **Rate Limiting** (limitación de tasa). Sin una política de limitación estricta, nuestras APIs quedan expuestas a ataques de denegación de servicio a nivel de aplicación (DDoS de Capa 7) y a ataques de fuerza bruta orientados a la enumeración de credenciales o tokens.

Aunque existen múltiples algoritmos para implementar esta protección (Leaky Bucket, Fixed Window, Sliding Window), el ecosistema de Go ha estandarizado el uso del algoritmo **Token Bucket** a través del paquete cuasi-oficial `golang.org/x/time/rate`. 

Este algoritmo funciona analógicamente como una cubeta que contiene *tokens*. Cada petición HTTP consume un token. Si la cubeta está vacía, la petición es rechazada. Simultáneamente, la cubeta se rellena a una tasa constante hasta alcanzar su capacidad máxima (el *burst* o ráfaga permitida).

### 1. Limitación Global vs. Limitación por IP

Implementar un único limitador global para todo el servidor web es un antipatrón en la mayoría de los casos. Si un atacante agota los tokens globales, causará una denegación de servicio a todos los usuarios legítimos.

El enfoque correcto, y el que abordaremos a continuación, es la **limitación por identificador único**, siendo la dirección IP del cliente (o un ID de usuario/tenant si la ruta está autenticada) el factor de agrupación más común.

Dado que cada petición HTTP en Go se ejecuta en su propia Goroutine (**Capítulo 8**), nuestro almacén de limitadores por IP será accedido de forma concurrente. Como aprendimos en el **Capítulo 10**, los mapas nativos de Go no son seguros para el acceso concurrente, por lo que deberemos proteger nuestro registro con un `sync.RWMutex`.

### 2. Implementación de un Middleware de Rate Limiting en Memoria

A continuación, construiremos un limitador de tasa robusto. Definiremos una estructura que mantenga un mapa de limitadores por IP y un middleware que evalúe cada petición en tiempo real.

```go
package middleware

import (
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// IPRateLimiter gestiona los limitadores de tasa individuales para cada dirección IP.
type IPRateLimiter struct {
	ips map[string]*rate.Limiter
	mu  *sync.RWMutex
	r   rate.Limit
	b   int
}

// NewIPRateLimiter inicializa el gestor.
// r: Tasa de recarga (ej. 1 token por segundo)
// b: Capacidad máxima (burst) de la cubeta (ej. 5 peticiones concurrentes permitidas)
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	i := &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}
	return i
}

// GetLimiter obtiene el limitador para una IP dada, creándolo si no existe.
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.RLock()
	limiter, exists := i.ips[ip]
	i.mu.RUnlock()

	if !exists {
		i.mu.Lock()
		defer i.mu.Unlock()
		// Verificamos nuevamente (Double-checked locking) para evitar condiciones de carrera
		limiter, exists = i.ips[ip]
		if !exists {
			limiter = rate.NewLimiter(i.r, i.b)
			i.ips[ip] = limiter
		}
	}

	return limiter
}

// RateLimitMiddleware intercepta la petición y aplica la política de restricción.
func (i *IPRateLimiter) RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extraemos la IP del cliente de forma segura, descartando el puerto
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			log.Printf("Error obteniendo IP: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		// Si operamos detrás de un proxy/balanceador (Nginx, AWS ALB),
		// deberíamos leer la cabecera X-Forwarded-For o X-Real-IP aquí.

		limiter := i.GetLimiter(ip)

		// limiter.Allow() consume un token. Si devuelve false, la cubeta está vacía.
		if !limiter.Allow() {
			// RFC 6585: 429 Too Many Requests
			http.Error(w, "Has excedido el límite de peticiones. Intenta más tarde.", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

### 3. Consideraciones Críticas para Producción

1.  **Prevención de Fugas de Memoria (Memory Leaks):** En el código anterior, el mapa `ips` crecerá indefinidamente con cada nueva dirección IP que visite nuestro servidor. En un entorno de producción, esto generará una fuga de memoria (**Capítulo 44**). Es estrictamente necesario implementar un proceso secundario (una Goroutine) que barra el mapa periódicamente, eliminando las entradas de las direcciones IP que no han sido vistas en los últimos minutos (usando, por ejemplo, un mapa de *último acceso*).
2.  **Rate Limiting Distribuido:** Esta implementación en memoria es excepcional para un único nodo (Monolito). Sin embargo, si hemos escalado nuestra arquitectura a múltiples instancias detrás de un balanceador de carga (**Capítulo 32.1**), los limitadores en memoria serán independientes por cada nodo, volviendo la limitación inconsistente. Para microservicios, la estrategia obligatoria es externalizar el estado, utilizando Redis (visto en el **Capítulo 31**) y bibliotecas como `go-redis/redis_rate`, que implementan el Token Bucket evaluado mediante scripts Lua atómicos directamente en la base de datos en memoria.
