La evolución de un sistema monolítico hacia una arquitectura de microservicios en Go no es solo un reto de infraestructura, sino una redefinición de los límites de dominio y la tolerancia a fallos. En este capítulo, exploramos cómo fragmentar aplicaciones complejas manteniendo la cohesión mediante el desacoplamiento estratégico. Analizaremos patrones críticos como el Service Discovery para la localización dinámica de instancias y la configuración distribuida para la gestión centralizada. Finalmente, abordaremos la resiliencia mediante Circuit Breakers y Retries, garantizando que nuestro ecosistema sea capaz de resistir y recuperarse ante las inevitables fallos de red.

## 32.1. Desacoplamiento de dominios y comunicación inter-servicios

La transición de una arquitectura monolítica a un ecosistema de microservicios no es simplemente un cambio de infraestructura; es una reestructuración fundamental de cómo interactúan las reglas de negocio. En Go, donde la simplicidad y la compilación estática fomentan la creación de binarios únicos e independientes, dividir un sistema requiere un enfoque meticuloso para no caer en el antipatrón del "monolito distribuido", donde los servicios están tan acoplados que fallan y se despliegan juntos, pero con el costo añadido de la latencia de red.

### Identificación y separación de contextos (Bounded Contexts)

Como exploramos en el Capítulo 22 (DDD), el diseño guiado por el dominio nos da las herramientas lógicas para separar responsabilidades. Al llevar esto a microservicios, estos límites lógicos (*Bounded Contexts*) se convierten en límites físicos (de red y de proceso).

Una regla de oro al desacoplar dominios es **evitar compartir el modelo de base de datos**. Si dos microservicios en Go acceden a las mismas tablas, no están desacoplados. La comunicación entre ellos debe darse estrictamente a través de APIs bien definidas. En lugar de compartir estructuras profundas, los servicios deben compartir identificadores y referencias.

**Antipatrón en Go (Monolito):**
Compartir un `struct` global y un pool de conexiones `*sql.DB` entre dominios de Facturación y Envíos.

**Patrón correcto (Microservicios):**
El servicio de Envíos solo conoce el `OrderID`. Si necesita detalles de la factura, consulta al servicio de Facturación a través de la red o reacciona a un evento, utilizando interfaces en Go para abstraer el origen de los datos.

### Abstracción de la comunicación mediante Interfaces

Para mantener la Arquitectura Limpia (Capítulo 21) al comunicarnos con otros servicios, el dominio de nuestra aplicación no debe saber si la comunicación se realiza vía HTTP REST, gRPC o un Message Broker. Go brilla en este aspecto gracias a su tipado estructural (Duck Typing).

El consumidor del servicio debe definir la interfaz que necesita, y la capa de infraestructura proveerá la implementación concreta.

```go
package domain

import "context"

// User representa la entidad mínima que este dominio necesita conocer
type User struct {
 ID    string
 Email string
}

// UserDirectory es la interfaz que abstrae la comunicación inter-servicios.
// Pertenece al dominio que la consume, no al que la provee.
type UserDirectory interface {
 FetchUserByID(ctx context.Context, id string) (*User, error)
}
```

Al utilizar `context.Context` en la firma, nos aseguramos de que los tiempos de espera (timeouts) y la cancelación (Capítulo 13), así como la propagación del trazado distribuido (Capítulo 41), puedan gestionarse correctamente al atravesar los límites de la red.

La implementación en la capa de infraestructura (por ejemplo, un adaptador HTTP) quedaría así:

```go
package infrastructure

import (
 "context"
 "encoding/json"
 "fmt"
 "net/http"
 "net/url"
)

// HTTPUserClient implementa domain.UserDirectory
type HTTPUserClient struct {
 client  *http.Client
 baseURL string
}

func NewHTTPUserClient(client *http.Client, baseURL string) *HTTPUserClient {
 return &HTTPUserClient{
  client:  client,
  baseURL: baseURL,
 }
}

func (c *HTTPUserClient) FetchUserByID(ctx context.Context, id string) (*domain.User, error) {
 endpoint := fmt.Sprintf("%s/v1/users/%s", c.baseURL, url.PathEscape(id))
 
 req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
 if err != nil {
  return nil, fmt.Errorf("error creando request: %w", err)
 }

 resp, err := c.client.Do(req)
 if err != nil {
  return nil, fmt.Errorf("error llamando al servicio de usuarios: %w", err)
 }
 defer resp.Body.Close()

 if resp.StatusCode != http.StatusOK {
  return nil, fmt.Errorf("respuesta inesperada del servicio de usuarios: %d", resp.StatusCode)
 }

 var user domain.User
 if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
  return nil, fmt.Errorf("error decodificando payload: %w", err)
 }

 return &user, nil
}
```

### Paradigmas de Comunicación: Síncrona vs. Asíncrona

El desacoplamiento de dominios impone decidir cómo interactuarán. La elección del paradigma afecta directamente la latencia, la resiliencia y la consistencia del sistema general.

1. **Comunicación Síncrona (Request-Response):**
    * **Cuándo usarla:** Para consultas de lectura (Queries) o flujos donde el cliente requiere una respuesta inmediata para proceder.
    * **Implementación común:** REST (JSON sobre HTTP/1.1) o gRPC (Protobuf sobre HTTP/2).
    * **Desafíos:** Acoplamiento temporal. Si el Servicio B está caído, el Servicio A no puede completar su tarea. Además, la latencia se suma secuencialmente.

2. **Comunicación Asíncrona (Event-Driven):**
    * **Cuándo usarla:** Para mutaciones de estado (Commands) donde la consistencia eventual es aceptable (ej. "Enviar email de bienvenida tras el registro").
    * **Implementación común:** Publicación/Suscripción a través de Message Brokers como RabbitMQ o Kafka (que abordaremos a fondo en el Capítulo 34).
    * **Desafíos:** Mayor complejidad operativa, depuración asíncrona y necesidad de implementar estrategias de compensación (Sagas) en caso de fallos.

### Consistencia Eventual y el Patrón Outbox

Uno de los problemas más complejos al comunicar servicios en Go es garantizar que una actualización en la base de datos local y la emisión de un evento a otro servicio se realicen de forma atómica. No existe una transacción distribuida simple que cubra PostgreSQL y Kafka simultáneamente sin penalizar masivamente el rendimiento (como el Two-Phase Commit).

Para resolver esto sin perder el desacoplamiento, se utiliza el **Patrón Outbox**. La idea es usar la transacción local de la base de datos (Capítulo 30) para guardar tanto la actualización del negocio como un registro en una tabla `outbox`. Un proceso secundario (un worker o goroutine dedicada) leerá de esta tabla y enviará el evento de forma asíncrona, garantizando una entrega *At-Least-Once* (al menos una vez).

El diseño de estos límites de red y patrones de consistencia es lo que verdaderamente convierte una arquitectura en microservicios, en lugar de un conjunto de pequeños monolitos frágiles que se comunican por HTTP.

## 32.2. Patrones de Service Discovery y Configuración Distribuida

En un monolito, la comunicación entre componentes es trivial: una simple llamada a una función en el mismo espacio de memoria. Sin embargo, al migrar a microservicios, la red se convierte en el intermediario. En entornos modernos (basados en contenedores y la nube), las direcciones IP de los servicios son efímeras; las instancias escalan horizontalmente, se reinician o mueren constantemente.

Para que un Servicio A pueda comunicarse con un Servicio B, necesita saber dónde está. Y para que 50 instancias del Servicio A se comporten igual, necesitan una fuente única de verdad para su configuración. Aquí es donde entran el *Service Discovery* y la *Configuración Distribuida*.

### Patrones de Service Discovery (Descubrimiento de Servicios)

El descubrimiento de servicios resuelve la pregunta: *"¿En qué IP y puerto está ejecutándose el servicio que necesito consultar ahora mismo?"*. Existen dos patrones arquitectónicos principales para resolver esto:

#### 1. Client-Side Discovery (Descubrimiento del lado del cliente)

En este modelo, el cliente (el microservicio que realiza la petición) es responsable de determinar las ubicaciones de red de las instancias disponibles y de balancear la carga entre ellas.

El flujo es el siguiente:

1. El cliente consulta un **Service Registry** (como HashiCorp Consul, etcd o Apache ZooKeeper).
2. El registro devuelve una lista de IPs y puertos sanos.
3. El cliente aplica un algoritmo (como *Round-Robin*) y realiza la petición HTTP/gRPC.

**Ventajas:** Elimina el salto extra de red de un balanceador de carga central.
**Desventajas:** Acopla la lógica de balanceo y descubrimiento al código de la aplicación.

#### 2. Server-Side Discovery (Descubrimiento del lado del servidor)

Este es el patrón más prevalente en la actualidad, especialmente en ecosistemas orquestados (como veremos en el Capítulo 49 con Kubernetes). El cliente hace la petición a una dirección estática (un *Load Balancer* o *API Gateway*), y este intermediario se encarga de consultar el Service Registry y enrutar el tráfico a la instancia correcta.

**Resolución nativa mediante DNS en Go:**
En entornos como Kubernetes, el descubrimiento de servicios del lado del servidor se abstrae elegantemente mediante DNS internos (Kube-DNS/CoreDNS). Go, a través de su paquete estándar `net`, es extremadamente eficiente resolviendo registros `SRV` o `A`, lo que permite un descubrimiento nativo sin dependencias externas pesadas.

```go
package discovery

import (
 "context"
 "fmt"
 "net"
)

// ResolveService utiliza el resolver DNS nativo de Go para encontrar
// instancias de un servicio, ideal para entornos como Kubernetes o Consul DNS.
func ResolveService(ctx context.Context, serviceName string) ([]string, error) {
 var endpoints []string

 // net.DefaultResolver respeta la configuración /etc/resolv.conf del contenedor
 _, addrs, err := net.DefaultResolver.LookupSRV(ctx, "http", "tcp", serviceName)
 if err != nil {
  return nil, fmt.Errorf("fallo al resolver el servicio %s: %w", serviceName, err)
 }

 for _, addr := range addrs {
  // Construimos el endpoint combinando el target y el puerto devuelto por el registro SRV
  endpoints = append(endpoints, fmt.Sprintf("%s:%d", addr.Target, addr.Port))
 }

 return endpoints, nil
}
```

### Configuración Distribuida

A medida que el número de microservicios crece, gestionar configuraciones locales (`.env` o archivos `config.yaml` empaquetados en el binario) se vuelve insostenible. Si necesitas cambiar el nivel de log de `INFO` a `DEBUG` para rastrear un error, no deberías tener que recompilar y redesplegar el servicio.

La configuración distribuida centraliza estos valores en un almacén de clave-valor (KV Store) altamente disponible, como **Consul** o **etcd**.

#### Integración idiomática con Viper

En el Capítulo 20 exploramos `Viper` para la configuración local. Viper también brilla en ecosistemas distribuidos gracias a su capacidad para conectarse a proveedores remotos y **observar (watch)** cambios en tiempo real, actualizando la configuración en memoria de la aplicación Go de forma segura ante la concurrencia.

Para implementar esto, necesitamos importar el paquete remoto de Viper. A continuación, un ejemplo de cómo conectar nuestro servicio a Consul para leer su configuración de forma dinámica:

```go
package config

import (
 "fmt"
 "log/slog"

 "github.com/spf13/viper"
 _ "github.com/spf13/viper/remote" // Importación anónima necesaria para los proveedores remotos
)

func LoadDistributedConfig(consulEndpoint, servicePath string) error {
 // Configuramos Consul como nuestro proveedor
 err := viper.AddRemoteProvider("consul", consulEndpoint, servicePath)
 if err != nil {
  return fmt.Errorf("error configurando proveedor remoto: %w", err)
 }

 viper.SetConfigType("json") // El formato que esperamos leer desde Consul

 // Leemos la configuración inicial
 if err := viper.ReadRemoteConfig(); err != nil {
  return fmt.Errorf("error leyendo la configuración distribuida: %w", err)
 }

 // Iniciamos un hilo (goroutine interna de Viper) para observar cambios en tiempo real
 go func() {
  for {
   err := viper.WatchRemoteConfig()
   if err != nil {
    slog.Error("fallo al observar cambios en la configuración", "error", err)
    continue
   }
   slog.Info("Configuración actualizada dinámicamente desde Consul")
   // Aquí podrías disparar eventos internos para reconfigurar conexiones si es necesario
  }
 }()

 return nil
}
```

### El equilibrio entre resiliencia y complejidad

Delegar el estado (configuración) y la topología (descubrimiento) a sistemas externos como Consul o etcd introduce puntos únicos de fallo. ¿Qué pasa si el microservicio en Go no puede contactar al Service Registry al arrancar?

El código robusto en Go siempre debe prever la degradación elegante:

1. **Mecanismos de Fallback:** Mantener una configuración caché local en disco para arrancar si el sistema de configuración distribuida no responde.
2. **Reintentos Inteligentes:** Utilizar *Backoffs exponenciales* (que veremos en la próxima sección) al intentar resolver la red.

## 32.3. Implementación de resiliencia: Circuit Breaker y Retries

En una arquitectura monolítica, si un componente falla, normalmente el error se propaga por la pila de llamadas hasta ser capturado o causar un pánico. En un ecosistema de microservicios, la introducción de la red cambia las reglas del juego: **los fallos no son una posibilidad, son una garantía**.

Latencia impredecible, particiones de red, reinicios efímeros de contenedores y servicios dependientes sobrecargados son el pan de cada día. Si un microservicio en Go no está diseñado para tolerar estos fallos de forma elegante, un problema localizado puede provocar un efecto dominó que derribe todo el sistema (fallo en cascada).

Para evitar esto, implementamos patrones de resiliencia fundamentales: **Retries** (Reintentos) con Backoff, y **Circuit Breakers** (Cortocircuitos).

### Retries, Jitter y el cliente Heimdall

El instinto básico ante un error de red (como un timeout o un HTTP 503 Service Unavailable) es volver a intentar la petición. Sin embargo, si 100 instancias de nuestro microservicio intentan reintentar peticiones fallidas al mismo tiempo sin ningún tipo de retraso, provocaremos un ataque DDoS interno (conocido como *Thundering Herd* o Tormenta de Reintentos), terminando de hundir al servicio que ya estaba sufriendo.

Para que los reintentos sean seguros, deben cumplir dos reglas:

1. **Solo reintentar operaciones idempotentes** (ej. peticiones `GET`, o `PUT`/`POST` diseñadas con claves de idempotencia).
2. **Utilizar Exponential Backoff con Jitter** (esperar un tiempo que crece exponencialmente entre intentos, sumándole un factor de aleatoriedad para evitar que todos los clientes reintenten en el mismo milisegundo exacto).

El paquete `github.com/gojek/heimdall` es una excelente abstracción sobre el `net/http` estándar (que estudiamos en el Capítulo 24) que implementa estas políticas por defecto.

```go
package resilience

import (
 "fmt"
 "io"
 "net/http"
 "time"

 "github.com/gojek/heimdall/v7/httpclient"
 "github.com/gojek/heimdall/v7"
)

// FetchUserData realiza una llamada HTTP resiliente con reintentos configurados
func FetchUserData(endpoint string) ([]byte, error) {
 // Configuramos un backoff exponencial: 
 // Inicia en 10ms, máximo 50ms, con un multiplicador de 2 y un jitter aleatorio.
 initalTimeout := 10 * time.Millisecond
 maxTimeout := 50 * time.Millisecond
 exponentFactor := 2.0
 maximumJitterInterval := 5 * time.Millisecond

 backoff := heimdall.NewExponentialBackoff(initalTimeout, maxTimeout, exponentFactor, maximumJitterInterval)

 // Creamos un cliente Heimdall con un timeout duro y un máximo de 3 reintentos
 retrier := heimdall.NewRetrier(backoff)
 client := httpclient.NewClient(
  httpclient.WithHTTPTimeout(2 * time.Second),
  httpclient.WithRetrier(retrier),
  httpclient.WithRetryCount(3),
 )

 // Heimdall abstrae el bucle de reintentos. Si falla 3 veces, devolverá el último error.
 req, _ := http.NewRequest(http.MethodGet, endpoint, nil)
 resp, err := client.Do(req)
 if err != nil {
  return nil, fmt.Errorf("operación fallida tras reintentos: %w", err)
 }
 defer resp.Body.Close()

 if resp.StatusCode >= 500 {
  return nil, fmt.Errorf("error del servidor remoto: estado %d", resp.StatusCode)
 }

 return io.ReadAll(resp.Body)
}
```

### El Patrón Circuit Breaker con Hystrix-Go

Los reintentos son útiles para fallos transitorios (un micro-corte de red). Pero, ¿qué ocurre si el servicio dependiente está completamente caído y tardará 5 minutos en reiniciar la base de datos? Reintentar ciegamente solo agota los recursos de nuestro propio servicio (conexiones TCP bloqueadas, goroutines en espera, memoria no liberada).

El patrón **Circuit Breaker** (inspirado en los interruptores eléctricos) actúa como un proxy de estado para la operación:

1. **Cerrado (Closed):** Todo funciona bien. Las peticiones fluyen hacia el servicio dependiente. Si los errores superan un umbral predefinido (ej. 50% de fallos en los últimos 10 segundos), el circuito se *abre*.
2. **Abierto (Open):** El servicio dependiente se considera "caído". Todas las peticiones fallan inmediatamente (Fail Fast) devolviendo un error o ejecutando una función de *Fallback* (plan B), sin ni siquiera intentar la llamada de red.
3. **Semi-abierto (Half-Open):** Tras un tiempo de espera (ej. 30 segundos), el circuito permite pasar una cantidad limitada de peticiones de prueba. Si tienen éxito, el circuito se *cierra*. Si fallan, vuelve a estado *Abierto*.

La librería `github.com/afex/hystrix-go` popularizó este patrón en Go (basada en el Hystrix original de Netflix). Aunque existen alternativas modernas como `sony/gobreaker`, `hystrix-go` sigue siendo un estándar educativo de la industria.

Así se implementa un bloque protegido por un Circuit Breaker:

```go
package resilience

import (
 "errors"
 "fmt"
 "log/slog"

 "github.com/afex/hystrix-go/hystrix"
)

func init() {
 // Configuramos el comportamiento del Circuit Breaker "user_service"
 hystrix.ConfigureCommand("user_service", hystrix.CommandConfig{
  Timeout:                1000, // Timeout estricto de 1 segundo
  MaxConcurrentRequests:  100,  // Máximo de goroutines permitidas simultáneamente
  ErrorPercentThreshold:  25,   // Abrir si el 25% de peticiones fallan
  SleepWindow:            5000, // Tiempo en estado 'Abierto' antes de probar 'Semi-abierto' (5s)
  RequestVolumeThreshold: 10,   // Mínimo de peticiones antes de calcular porcentajes de error
 })
}

// GetUserWithFallback ejecuta una llamada de red protegida y define una ruta de degradación
func GetUserWithFallback(userID string) (string, error) {
 var result string

 // hystrix.Do recibe el nombre del comando, la función principal, y la función de Fallback
 err := hystrix.Do("user_service", func() error {
  // Aquí iría tu llamada HTTP o gRPC real (puede usar el client de Heimdall)
  // Simulamos un fallo de red devolviendo un error
  return errors.New("timeout de red conectando con el servicio de usuarios")
  
 }, func(err error) error {
  // FALLBACK: ¿Qué hacemos si el circuito está abierto o la función principal falla?
  // Registramos el incidente y devolvemos un valor en caché o una respuesta degradada aceptable.
  slog.Warn("Circuit Breaker ejecutando Fallback", "motivo", err.Error(), "usuario", userID)
  result = "Usuario Anónimo (Modo Degradado)"
  return nil // Retornamos nil para que el consumidor no falle, asumiendo la degradación
 })

 if err != nil {
  return "", fmt.Errorf("operación fallida y sin fallback disponible: %w", err)
 }

 return result, nil
}
```

### Combinando Patrones de forma Idiomática

En aplicaciones Go de grado de producción, no usas uno u otro; **los apilas**. Lo idiomático es envolver tu cliente HTTP (configurado con reintentos mediante Heimdall) dentro de un comando de Circuit Breaker (con Hystrix o GoBreaker).

De este modo:

1. Heimdall absorbe los pequeños parpadeos de la red reintentando un par de veces de forma aislada.
2. Si Heimdall agota sus reintentos, devuelve un error a Hystrix.
3. Si los errores se acumulan indicando una caída sistémica, Hystrix abre el circuito, cortando los reintentos inútiles y permitiendo que tu aplicación sobreviva sirviendo datos cacheados mediante su Fallback.

Esta combinación garantiza un sistema que reacciona proactivamente a los fallos en lugar de ser víctima de ellos, concluyendo así las bases de una transición madura hacia los microservicios.
