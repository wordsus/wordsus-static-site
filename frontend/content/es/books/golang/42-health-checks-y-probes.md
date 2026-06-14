En sistemas distribuidos de alto rendimiento, la visibilidad sobre el estado de salud de cada nodo es el pilar de la resiliencia. Un binario de Go que "está en ejecución" no garantiza una aplicación funcional. Este capítulo aborda la implementación avanzada de sondas de **Liveness** y **Readiness**, diferenciando entre la supervivencia del proceso y su capacidad real para procesar tráfico. Exploraremos cómo evaluar de forma concurrente y segura dependencias críticas como bases de datos y cachés, y cómo exponer métricas internas del *runtime* mediante `expvar`. Aprenderás a transformar tu servicio en una entidad transparente y predecible para orquestadores como Kubernetes.

## 42.1. Implementación profunda de Liveness y Readiness probes

En la arquitectura moderna de microservicios y despliegues nativos de la nube (especialmente bajo orquestadores como Kubernetes, que abordaremos a fondo en el Capítulo 49), exponer el estado interno de la aplicación no es opcional, es un requisito para la resiliencia del sistema. Sin embargo, un error muy común es tratar *Liveness* y *Readiness* como sinónimos o agruparlos en un único endpoint `/health`.

Para implementar estos patrones correctamente en Go, debemos comprender su propósito arquitectónico y cómo interactúan con las primitivas de concurrencia y contexto que hemos visto en capítulos anteriores.

### La dicotomía: Liveness vs. Readiness

* **Liveness (Supervivencia):** Responde a la pregunta *"¿Está la aplicación bloqueada en un estado irrecuperable?"*. Si esta prueba falla de forma continua, la infraestructura (ej. Kubernetes) matará el proceso y reiniciará el contenedor. **Debe ser una prueba extremadamente ligera**. No debe consultar bases de datos ni servicios externos. Si la base de datos cae, tu aplicación no debe ser reiniciada (eso no solucionará la base de datos); simplemente debe dejar de recibir tráfico.
* **Readiness (Disposición):** Responde a la pregunta *"¿Está la aplicación lista para procesar tráfico HTTP/gRPC exitosamente?"*. Si falla, el orquestador retira temporalmente la instancia del balanceador de carga, pero el proceso sigue vivo. Aquí **sí** debemos evaluar la conectividad con dependencias críticas (bases de datos, cachés, brokers de mensajes).

### Diseño de un Gestor de Estado Avanzado

En lugar de definir handlers anónimos diseminados por el código, la práctica idiomática en aplicaciones avanzadas de Go es definir un contrato basado en interfaces para evaluar las dependencias, orquestado por un registro centralizado.

A continuación, implementaremos un `HealthManager` que permite registrar dependencias dinámicamente y evaluarlas de forma concurrente, aprovechando `sync.WaitGroup` (Capítulo 10) y el paquete `context` (Capítulo 13) para evitar bloqueos.

```go
package health

import (
 "context"
 "encoding/json"
 "net/http"
 "sync"
 "time"
)

// Checker define el contrato para cualquier dependencia que deba ser evaluada.
// Por ejemplo, un wrapper de base de datos puede implementar este método usando sql.DB.PingContext().
type Checker interface {
 Check(ctx context.Context) error
}

// Manager administra y aísla la lógica de las sondas de estado.
type Manager struct {
 mu        sync.RWMutex
 readiness map[string]Checker
}

// NewManager inicializa un nuevo gestor de estado.
func NewManager() *Manager {
 return &Manager{
  readiness: make(map[string]Checker),
 }
}

// AddReadinessCheck registra una nueva dependencia a evaluar.
func (m *Manager) AddReadinessCheck(name string, c Checker) {
 m.mu.Lock()
 defer m.mu.Unlock()
 m.readiness[name] = c
}
```

### Implementando el Handler de Liveness

El Liveness probe solo necesita demostrar que el bucle de eventos HTTP no está en *deadlock* (es decir, que las goroutines pueden seguir despachando peticiones) y que no hay pánicos fatales sin recuperar.

```go
// LivenessHandler es intencionalmente minimalista.
// Ruta recomendada: /livez
func (m *Manager) LivenessHandler(w http.ResponseWriter, r *http.Request) {
 w.Header().Set("Content-Type", "application/json")
 w.WriteHeader(http.StatusOK)
 // Solo confirmamos que el proceso responde.
 w.Write([]byte(`{"status":"UP"}`)) 
}
```

### Implementando el Handler de Readiness (Evaluación Concurrente)

El Readiness probe es más complejo. Si tenemos 5 dependencias y las evaluamos secuencialmente, un timeout en una de ellas retrasará toda la respuesta. Evaluaremos el mapa de dependencias usando el patrón *fan-out* gestionado por un `WaitGroup`.

Es vital inyectar un timeout estricto a través del contexto de la petición. El orquestador espera una respuesta rápida (generalmente en menos de 1 o 2 segundos); si el *probe* tarda demasiado, se considerará fallido (timeout).

```go
// ReadinessHandler evalúa las dependencias en paralelo.
// Ruta recomendada: /readyz
func (m *Manager) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
 m.mu.RLock()
 checks := m.readiness
 m.mu.RUnlock()

 // 1. Derivamos un contexto con timeout estricto para evitar bloqueos.
 ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
 defer cancel()

 results := make(map[string]string)
 var wg sync.WaitGroup
 var muResults sync.Mutex // Protege la escritura en el mapa 'results'
 isReady := true

 // 2. Evaluamos dependencias concurrentemente
 for name, checker := range checks {
  wg.Add(1)
  go func(n string, c Checker) {
   defer wg.Done()
   
   // Si la dependencia falla o el contexto expira, Check devolverá error
   err := c.Check(ctx)
   
   muResults.Lock()
   defer muResults.Unlock()
   
   if err != nil {
    results[n] = "DOWN: " + err.Error()
    isReady = false
   } else {
    results[n] = "UP"
   }
  }(name, checker)
 }

 // 3. Esperamos a que todas las rutinas terminen (o fallen por el contexto)
 wg.Wait()

 // 4. Formateamos la respuesta usando códigos HTTP semánticos
 w.Header().Set("Content-Type", "application/json")
 if !isReady {
  // 503 indica explícitamente al balanceador que no envíe tráfico
  w.WriteHeader(http.StatusServiceUnavailable) 
 } else {
  w.WriteHeader(http.StatusOK)
 }

 statusStr := "UP"
 if !isReady {
  statusStr = "DOWN"
 }

 json.NewEncoder(w).Encode(map[string]interface{}{
  "status":  statusStr,
  "details": results,
 })
}
```

### Consideración Avanzada: Caché y DDoSing interno

En sistemas de alta carga, la infraestructura puede hacer llamadas al endpoint `/readyz` cada 1 a 3 segundos. Si tienes 5 réplicas de tu aplicación, esto significa 15 pings por segundo a tu base de datos únicamente para verificar salud.

En un entorno avanzado, si el chequeo de una dependencia es pesado (por ejemplo, una consulta compleja de validación en lugar de un simple ping de TCP), es altamente recomendable envolver el `Checker` con un mecanismo de expiración (un TTL o *Time-To-Live*). En lugar de ejecutar la consulta en cada petición HTTP, almacenas el resultado del último chequeo válido en memoria usando un `sync.RWMutex` o la librería `sync/atomic`, y devuelves ese estado en caché si no han pasado más de "X" segundos desde la última evaluación real.

## 42.2. Exposición del estado interno de dependencias (Bases de datos, Caches)

En la sección anterior establecimos un contrato mediante la interfaz `Checker`. Ahora debemos materializar ese contrato conectándolo con los componentes de infraestructura reales de nuestra aplicación.

Verificar una dependencia no significa simplemente comprobar que la variable o el puntero del cliente (como `*sql.DB` o `*redis.Client`) no sea `nil`. En Go, la mayoría de los clientes de bases de datos y cachés gestionan *pools* de conexiones en segundo plano (como vimos en los Capítulos 28 y 31). Un cliente puede estar inicializado correctamente en memoria, pero las conexiones de red subyacentes podrían estar caídas, agotadas o bloqueadas por el firewall.

Para exponer el estado real, debemos realizar operaciones activas pero de muy bajo coste computacional, propagando siempre el `context.Context` para garantizar que nuestras sondas respeten los límites de tiempo.

### Implementación para Bases de Datos Relacionales (`database/sql`)

El paquete estándar `database/sql` expone el método `PingContext`. Este método es ideal para nuestras sondas de *Readiness*, ya que verifica si la conexión a la base de datos sigue viva, estableciendo una conexión si es necesario, pero sin ejecutar consultas pesadas.

```go
package health

import (
 "context"
 "database/sql"
 "fmt"
)

// SQLChecker implementa la interfaz Checker para cualquier base de datos
// compatible con el paquete estándar database/sql (PostgreSQL, MySQL, etc.).
type SQLChecker struct {
 db *sql.DB
}

// NewSQLChecker inicializa el checker con un pool de conexiones existente.
func NewSQLChecker(db *sql.DB) *SQLChecker {
 return &SQLChecker{db: db}
}

// Check evalúa la conectividad real con el motor de base de datos.
func (s *SQLChecker) Check(ctx context.Context) error {
 if s.db == nil {
  return fmt.Errorf("el pool de conexiones de la base de datos no está inicializado (nil)")
 }
 // PingContext fuerza un viaje de ida y vuelta (round-trip) a la base de datos.
 // Respetará automáticamente el timeout impuesto por el contexto en el ReadinessHandler.
 if err := s.db.PingContext(ctx); err != nil {
  return fmt.Errorf("fallo al hacer ping a la base de datos: %w", err)
 }
 return nil
}
```

### Implementación para Cachés Distribuidas (Redis)

De forma análoga, al trabajar con cachés como Redis (usualmente a través de la librería `go-redis`, tratada en el Capítulo 31), no basta con saber que el cliente está configurado. Debemos enviar el comando `PING` al servidor de Redis.

```go
package health

import (
 "context"
 "fmt"
 "github.com/redis/go-redis/v9"
)

// RedisChecker implementa la interfaz Checker para clústeres o instancias de Redis.
type RedisChecker struct {
 client redis.UniversalClient
}

// NewRedisChecker inicializa el checker. Usamos UniversalClient para soportar
// tanto clientes simples como clústeres o sentinels.
func NewRedisChecker(client redis.UniversalClient) *RedisChecker {
 return &RedisChecker{client: client}
}

// Check envía un comando PING a Redis.
func (r *RedisChecker) Check(ctx context.Context) error {
 if r.client == nil {
  return fmt.Errorf("el cliente de Redis no está inicializado")
 }
 
 // El comando Ping() devolverá un error si hay partición de red
 // o si el timeout del contexto expira.
 if err := r.client.Ping(ctx).Err(); err != nil {
  return fmt.Errorf("redis inalcanzable: %w", err)
 }
 return nil
}
```

### Sondas Lógicas y Degradación Elegante

En arquitecturas muy críticas, un simple `Ping` puede no ser suficiente. Por ejemplo, en un entorno de réplicas de bases de datos, el nodo esclavo podría responder al `Ping` pero tener un *replication lag* (retraso de replicación) de varias horas, devolviendo datos obsoletos.

En estos escenarios, un `Checker` avanzado puede ejecutar una consulta lógica rápida:

```go
func (s *AdvancedSQLChecker) Check(ctx context.Context) error {
 // Verificamos si la base de datos está en modo solo lectura de forma inesperada
 // o comprobamos el lag de replicación (ejemplo conceptual para PostgreSQL).
 var isRecovery bool
 err := s.db.QueryRowContext(ctx, "SELECT pg_is_in_recovery()").Scan(&isRecovery)
 if err != nil {
  return fmt.Errorf("fallo al evaluar el estado del nodo: %w", err)
 }
 
 if s.requiresPrimary && isRecovery {
  return fmt.Errorf("el nodo está en modo recuperación (solo lectura), se requiere primario")
 }
 return nil
}
```

Finalmente, es importante integrar esta exposición de dependencias con los **Circuit Breakers** (Capítulo 32). Si tu aplicación depende de una API REST externa de terceros que está caída, el estado de tu *Readiness probe* debe decidir si esa caída es "fatal" para tu servicio (y por tanto debe devolver un HTTP 503 en `/readyz`) o si tu servicio puede funcionar con una **degradación elegante** (Graceful Degradation). Si la dependencia es opcional (como un servicio de envío de correos asíncrono), el `Checker` debería registrar el error en las métricas, pero no hacer fallar el *Readiness probe* global.

## 42.3. Monitoreo continuo de variables expuestas del runtime (`expvar`)

Aunque en el Capítulo 40 exploramos Prometheus y OpenTelemetry como los estándares de la industria para la telemetría y el análisis de series temporales, la biblioteca estándar de Go incluye una herramienta minimalista, libre de dependencias y extremadamente rápida para la inspección del estado interno en tiempo real: el paquete `expvar` (Exported Variables).

`expvar` proporciona un mecanismo estandarizado para exponer variables de estado de la aplicación a través de HTTP en formato JSON puro. Su diseño está orientado a la simplicidad y a la concurrencia, ofreciendo tipos de datos atómicos que evitan la necesidad de gestionar bloqueos manuales (`sync.Mutex`) al actualizar contadores desde múltiples goroutines.

### Comportamiento por defecto y `runtime.MemStats`

Con la simple importación lateral (`import _ "expvar"`), el paquete se registra automáticamente en el enrutador global `http.DefaultServeMux` bajo la ruta `/debug/vars`. De forma nativa, expone dos variables de alto valor para el diagnóstico:

1. **`cmdline`**: Los argumentos con los que se inició el binario.
2. **`memstats`**: Un volcado completo y actualizado de la estructura `runtime.MemStats`, permitiendo observar en tiempo real la presión sobre el Garbage Collector (Capítulo 43), los bytes asignados en el Heap y la cantidad de goroutines en ejecución.

### Implementación segura con enrutadores personalizados

Como discutimos en los Capítulos 24 y 25, depender de `http.DefaultServeMux` en producción es un antipatrón grave de seguridad, ya que podríamos exponer información sensible del *runtime* al internet público.

La práctica recomendada es instanciar las métricas de `expvar` explícitamente y servirlas en un puerto de administración interno (aislado mediante red) o detrás de un middleware de autenticación estricta.

```go
package health

import (
 "expvar"
 "net/http"
)

// Definimos métricas globales thread-safe provistas por expvar.
var (
 // ActiveConnections mantiene un conteo en vivo de conexiones en vuelo.
 ActiveConnections = expvar.NewInt("active_connections")
 
 // ProcessedJobs segrega el estado de trabajos en un mapa concurrente.
 ProcessedJobs = expvar.NewMap("processed_jobs")
 
 // Uptime expone una cadena de texto estática o actualizable.
 SystemState = expvar.NewString("system_state")
)

func init() {
 // Inicializamos estados por defecto
 SystemState.Set("booting")
 ProcessedJobs.Add("success", 0)
 ProcessedJobs.Add("failed", 0)
}

// SetupAdminServer levanta un servidor HTTP independiente y privado
// exclusivo para tareas de observabilidad y health checks.
func SetupAdminServer(addr string) *http.Server {
 mux := http.NewServeMux()
 
 // Montamos expvar manualmente en nuestro propio ServeMux
 mux.Handle("/debug/vars", expvar.Handler())
 
 // Podemos montar aquí también los Liveness y Readiness probes
 // vistos en las secciones 42.1 y 42.2
 
 SystemState.Set("running")
 
 return &http.Server{
  Addr:    addr,
  Handler: mux,
 }
}
```

### Uso dinámico en la lógica de dominio

La principal ventaja de `expvar` radica en su integración transparente con la lógica de negocio. Al ser operaciones basadas en el paquete `sync/atomic` bajo el capó (Capítulo 10), la penalización de rendimiento por actualizar estas variables es casi inexistente.

```go
// Ejemplo de uso dentro de un Worker (Capítulo 11)
func processJob(job Job) {
 ActiveConnections.Add(1)
 defer ActiveConnections.Add(-1)

 err := execute(job)
 if err != nil {
  // El mapa de expvar actualiza las claves concurrentemente
  ProcessedJobs.Add("failed", 1)
  return
 }
 
 ProcessedJobs.Add("success", 1)
}
```

### `expvar` vs. Prometheus

Es fundamental entender arquitectónicamente el lugar de `expvar`. A diferencia de un sistema de métricas completo:

* `expvar` expone el estado **absoluto actual** (una foto del instante de la petición). No guarda un registro histórico, no calcula percentiles ni genera alertas nativas.
* Es ideal para monitoreo de "caja blanca" súper ligero, herramientas de consola de administración interna (como `expvarmon`), o para integrarlo como un endpoint base que luego sea *scrapeado* y transformado por un agente externo si no se desea acoplar la aplicación con librerías pesadas de terceros.
