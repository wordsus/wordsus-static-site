Escribir código que funcione es el primer paso, pero escribir código mantenible, escalable y robusto requiere dominar el arte del diseño de software. En este capítulo, exploramos cómo los principios clásicos de la ingeniería se adaptan a la filosofía pragmática de Go. Analizaremos la aplicación idiomática de **SOLID**, donde la composición y las interfaces implícitas redefinen la flexibilidad. También abordaremos la importancia de una nomenclatura precisa, la gestión profesional de configuraciones y las estrategias de inyección de dependencias. El objetivo es transformar un desarrollo funcional en una obra de ingeniería limpia, alineada con los estándares de la industria.

## 20.1. Aplicación idiomática de los principios SOLID en Go

Los principios SOLID fueron concebidos en una era dominada por lenguajes orientados a objetos basados en clases y jerarquías de herencia profundas (como Java o C++). Go, con su enfoque pragmático, rechaza la herencia en favor de la composición y utiliza un sistema de tipos basado en interfaces implícitas (Duck Typing, como vimos en el Capítulo 7). 

Por lo tanto, aplicar SOLID en Go no consiste en transcribir patrones de diseño tradicionales línea por línea, sino en reinterpretar su filosofía central a través del "Go Way". A continuación, desglosamos cómo se materializan de forma idiomática.

### 1. Single Responsibility Principle (SRP) - Principio de Responsabilidad Única
> *Una estructura o paquete debe tener una sola razón para cambiar.*

En Go, el SRP se aplica tanto a nivel de funciones y `structs` como a nivel de **paquetes**. Un error común al migrar desde otros lenguajes es crear paquetes genéricos como `utils` o `helpers`, que terminan siendo un cajón desastre con múltiples razones para cambiar.

Idiomáticamente, el SRP fomenta paquetes pequeños y altamente cohesivos. A nivel de código, evitamos mezclar la lógica de dominio con detalles de infraestructura (por ejemplo, decodificar JSON y ejecutar una consulta SQL en la misma función).

```go
// Antipatrón: Múltiples responsabilidades
func UpdateUser(w http.ResponseWriter, r *http.Request) {
    // 1. Parsing de HTTP
    // 2. Lógica de validación de negocio
    // 3. Persistencia en Base de Datos SQL
}

// Idiomático: Separación mediante interfaces y composición
type UserUpdater interface {
    Update(ctx context.Context, u User) error
}

type UserHandler struct {
    updater UserUpdater // El Handler solo sabe de HTTP, delega el negocio.
}
```

### 2. Open/Closed Principle (OCP) - Principio de Abierto/Cerrado
> *El software debe estar abierto a la extensión, pero cerrado a la modificación.*

Dado que Go no tiene herencia explícita (`extends`), el OCP se logra a través de la **composición de Structs (Embedding)** (sección 6.3) y el polimorfismo mediante **interfaces**. 

En lugar de modificar una estructura existente para añadir un comportamiento, envolvemos o componemos tipos, o diseñamos funciones que acepten interfaces en lugar de tipos concretos.

```go
// Interfaz que nos permite extender el comportamiento
type Notifier interface {
    Send(message string) error
}

// Service no necesita modificarse si mañana añadimos un SlackNotifier
type AlertService struct {
    notifier Notifier
}

func (s *AlertService) TriggerAlert(msg string) {
    s.notifier.Send(msg)
}
```

### 3. Liskov Substitution Principle (LSP) - Principio de Sustitución de Liskov
> *Los subtipos deben ser sustituibles por sus tipos base sin alterar la corrección del programa.*

En Go, las interfaces *son* el contrato. El LSP dicta que si un tipo afirma implementar una interfaz, debe cumplir con las expectativas de comportamiento de ese contrato, no solo con las firmas de los métodos. 

Si tienes una interfaz `Repository` con un método `Save(User) error`, una implementación que de repente lance un `panic` en lugar de devolver un `error` (sección 4.4) estaría violando el LSP, ya que el consumidor de la interfaz no espera que la aplicación colapse.

El LSP en Go exige que las implementaciones de interfaces sean predecibles y mantengan las precondiciones y postcondiciones tácitas del sistema.

### 4. Interface Segregation Principle (ISP) - Principio de Segregación de Interfaces
> *Es mejor tener muchas interfaces pequeñas y específicas del cliente que una sola interfaz general.*

Rob Pike, uno de los creadores de Go, inmortalizó este principio con la frase: *"The bigger the interface, the weaker the abstraction"* (Cuanto más grande es la interfaz, más débil es la abstracción).

Como aprendimos en el Capítulo 12 con `io.Reader` e `io.Writer`, las interfaces más poderosas en Go tienen uno o dos métodos. Las interfaces monolíticas acoplan innecesariamente a los clientes con comportamientos que no necesitan.

```go
// Antipatrón: Interfaz "gorda"
type FileSystem interface {
    Read(path string) ([]byte, error)
    Write(path string, data []byte) error
    Delete(path string) error
    ChangePermissions(path string, mode os.FileMode) error
}

// Idiomático: Interfaces segregadas
type Reader interface {
    Read(path string) ([]byte, error)
}

type Writer interface {
    Write(path string, data []byte) error
}
```

Al segregar, si una función solo necesita leer archivos, aceptará `Reader`. Esto reduce el acoplamiento y facilita enormemente la creación de Mocks para testing (como vimos en el Capítulo 17).

### 5. Dependency Inversion Principle (DIP) - Principio de Inversión de Dependencias
> *Los módulos de alto nivel no deben depender de los de bajo nivel. Ambos deben depender de abstracciones.*

En el ecosistema Go, este principio se resume en un proverbio de diseño muy extendido: **"Acepta interfaces, devuelve structs"** (*Accept interfaces, return structs*).

Los paquetes de alto nivel (tu dominio o lógica de negocio) deben definir las interfaces que *necesitan*, y los paquetes de bajo nivel (bases de datos, clientes HTTP) deben implementar esas interfaces. Las interfaces implícitas de Go hacen que el paquete que *define* la interfaz no necesite saber absolutamente nada del paquete que la *implementa*, invirtiendo la dependencia de forma natural.

```go
// Paquete 'domain' (Alto nivel)
type PaymentGateway interface {
    Process(amount float64) error
}

type OrderProcessor struct {
    gateway PaymentGateway
}

func NewOrderProcessor(gw PaymentGateway) *OrderProcessor {
    return &OrderProcessor{gateway: gw}
}

// Paquete 'stripe' (Bajo nivel)
type StripeAdapter struct { /* ... */ }

// Cumple la interfaz PaymentGateway implícitamente
func (s *StripeAdapter) Process(amount float64) error { 
    return nil 
}
```

Aplicando SOLID de esta manera idiomática, tu código Go no solo será robusto y altamente testeable, sino que además se sentirá natural para cualquier otro desarrollador de la comunidad.

## 20.2. Nomenclatura, exportación de variables y organización de paquetes

En Go, la legibilidad y la simplicidad no son solo sugerencias estéticas, son pilares de su diseño. A diferencia de lenguajes más verbosos, Go prefiere convenciones claras e implícitas. La forma en que nombras tus variables, decides qué exportar y cómo agrupas tus archivos dicta directamente la calidad y mantenibilidad de la arquitectura de tu aplicación.

### 1. Nomenclatura Idiomática: Claridad sin verbosidad

La filosofía de Go sobre el nombramiento de variables se resume en una regla de oro: **la longitud del nombre de una variable debe ser proporcional a la distancia entre su declaración y su uso**. 

* **Ámbitos cortos, nombres cortos:** Si una variable tiene un ciclo de vida de apenas unas pocas líneas (por ejemplo, dentro de un bucle `for` o un condicional corto), nombres como `i`, `v`, `req` o `err` son perfectamente válidos y preferidos.
* **Ámbitos amplios, nombres descriptivos:** Las variables a nivel de paquete o los parámetros de configuración global deben ser mucho más explícitos (ej. `MaxIdleConnections`).
* **Evitar el "Tartamudeo" (Stuttering):** El nombre del paquete ya provee contexto. Cuando uses una variable o tipo desde otro paquete, el nombre del paquete y el tipo se leen juntos.
    * *Antipatrón:* `usuario.UsuarioManager` (se lee como `usuario.UsuarioManager`).
    * *Idiomático:* `usuario.Manager` (se lee elegantemente como `usuario.Manager`).
* **Acrónimos en mayúsculas:** En Go, los acrónimos deben mantener su capitalización uniforme. Escribe `ServeHTTP` o `ParseURL`, no `ServeHttp` ni `ParseUrl`.
* **Interfaces con sufijo "-er":** Como vimos en el Capítulo 12 con `io.Reader` e `io.Writer`, las interfaces de un solo método suelen nombrarse añadiendo el sufijo "-er" al verbo que describen (ej. `Doer`, `Notifier`, `Formatter`).

```go
// Antipatrón: Verbosidad innecesaria y tartamudeo
package server

type ServerConfig struct {
    ServerPort int
    ServerHost string
}

func (serverConfig *ServerConfig) StartServerProcess() error { /*...*/ }

// Idiomático: Nombres concisos, apoyándose en el contexto del paquete
package server

type Config struct {
    Port int
    Host string
}

func (c *Config) Start() error { /*...*/ }
```

### 2. Exportación de variables y reducción de la superficie de la API

Ya sabemos desde el Capítulo 2 que en Go la visibilidad (pública o privada) se define por la capitalización de la primera letra. Sin embargo, en el diseño avanzado de software, la regla principal es **minimizar la superficie de la API exportada**.

Exportar una variable, función o estructura es un compromiso (contractual) con los consumidores de tu paquete. Cuanto más exportes, más difícil será refactorizar el código interno en el futuro sin romper la compatibilidad hacia atrás.

* **Exporta solo lo estrictamente necesario:** Oculta el estado interno. Si un `struct` necesita ser modificado, hazlo a través de métodos exportados en lugar de exportar sus campos directamente. Esto garantiza la integridad de los datos.
* **Devolver tipos no exportados a través de interfaces exportadas:** Esta es una técnica poderosa para lograr un encapsulamiento estricto. Puedes definir una interfaz pública, pero hacer que la implementación concreta sea privada.

```go
package repository

// La interfaz es pública. El resto de la aplicación interactúa con esto.
type Store interface {
    Save(data []byte) error
}

// El struct es privado. Nadie fuera de este paquete puede instanciarlo directamente.
type memoryStore struct {
    buffer []byte
}

func (m *memoryStore) Save(data []byte) error {
    m.buffer = append(m.buffer, data...)
    return nil
}

// El constructor es la única vía de entrada pública.
func NewMemoryStore() Store {
    return &memoryStore{
        buffer: make([]byte, 0),
    }
}
```

### 3. Organización de Paquetes orientada a Dominio

El diseño de paquetes en Go debe centrarse en lo que el código *hace*, no en lo que el código *es*. 

* **Prohibidos los paquetes cajón de sastre:** Nombres como `util`, `common`, `helpers` o `base` son antipatrones severos en Go. No aportan ningún contexto sobre su contenido. Si tienes una función para formatear fechas, ponla en un paquete `timeutil` o de formato de fechas, no en `utils`.
* **Agrupación por contexto/dominio:** En lugar de organizar tu código como en los frameworks MVC tradicionales (un paquete `controllers`, otro `models`, otro `services`), Go favorece la agrupación temática. Por ejemplo, un paquete `invoicing` contendría la lógica de negocio, los modelos y posiblemente los manejadores HTTP relacionados exclusivamente con la facturación.
* **El poder del directorio `internal/`:** Go tiene una característica especial de compilación: cualquier código dentro de un directorio llamado `internal` solo puede ser importado por los paquetes que comparten su mismo árbol de directorios raíz. Es la herramienta definitiva para crear utilidades compartidas dentro de tu propio módulo sin exponerlas accidentalmente como API pública al resto del mundo.

Aplicar estas convenciones no solo hará que tu código apruebe las revisiones de `go vet` y `golint`, sino que facilitará enormemente la navegación cognitiva de la base de código a medida que el proyecto escale hacia arquitecturas más complejas.

## 20.3. Manejo centralizado de configuraciones (Viper, variables de entorno)

Una aplicación bien diseñada debe mantener una estricta separación entre su código fuente y su configuración. Siguiendo la metodología *12-Factor App*, la configuración (credenciales, puertos, URLs de bases de datos) debe almacenarse en el entorno, permitiendo que el mismo binario compilado se ejecute sin modificaciones en desarrollo, *staging* o producción. 

Aunque la biblioteca estándar de Go nos provee herramientas como `os.Getenv` (Capítulo 12) y el paquete `flag` para leer variables y argumentos, gestionar esto manualmente en aplicaciones complejas rápidamente se vuelve frágil y propenso a errores. Es aquí donde entra el manejo centralizado y fuertemente tipado.

### 1. Limitaciones del enfoque rudimentario

Depender exclusivamente de `os.Getenv` esparcido por todo tu dominio o infraestructura es un antipatrón. Rompe el Principio de Responsabilidad Única (SRP) y oculta las dependencias de tu aplicación.

```go
// Antipatrón: Configuración oculta y esparcida
func ConnectDatabase() error {
    // Si la variable no existe, devuelve un string vacío sin avisar.
    host := os.Getenv("DB_HOST") 
    port := os.Getenv("DB_PORT") // Todo es string, requiere casting manual a int.
    // ...
}
```

### 2. Centralización y Tipado Fuerte

La práctica idiomática en arquitecturas limpias es definir una única estructura (`struct`) que represente toda la configuración de la aplicación y validarla en el momento del arranque (*fail-fast*). 

Para poblar esta estructura de manera flexible desde múltiples fuentes (archivos YAML, JSON, variables de entorno o *flags* de consola), el estándar de facto en la comunidad Go es la librería **Viper** (`github.com/spf13/viper`).

### 3. Implementando Viper en la práctica

Viper brilla por su capacidad de fusionar configuraciones de distintas fuentes, dándole prioridad natural a las variables de entorno (ideal para despliegues en Docker o Kubernetes, como veremos en el Capítulo 47 y 49).

Para inyectar la configuración directamente en nuestras estructuras, Viper utiliza internamente la librería `mapstructure`. Por lo tanto, debemos usar las etiquetas (Struct Tags, sección 6.4) correspondientes.

```go
package config

import (
    "log"
    "github.com/spf13/viper"
)

// Config centraliza todas las variables de entorno necesarias.
type Config struct {
    AppEnv     string `mapstructure:"APP_ENV"`
    ServerPort int    `mapstructure:"SERVER_PORT"`
    DBHost     string `mapstructure:"DB_HOST"`
    DBUser     string `mapstructure:"DB_USER"`
}

// LoadConfig lee la configuración desde un archivo o variables de entorno.
func LoadConfig(path string) (*Config, error) {
    viper.AddConfigPath(path)
    viper.SetConfigName("app") // Busca app.env, app.yaml, etc.
    viper.SetConfigType("env") // Formato fallback

    // Habilita la lectura automática de variables de entorno del sistema
    viper.AutomaticEnv()

    var cfg Config

    // Intenta leer el archivo (útil para desarrollo local)
    if err := viper.ReadInConfig(); err != nil {
        log.Printf("No se encontró archivo de configuración, usando variables de entorno nativas: %v", err)
    }

    // Vuelca los valores en la estructura tipada
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, err
    }

    return &cfg, nil
}
```

### 4. Jerarquía y sobrescritura de valores

Una de las características más potentes de Viper es su orden de precedencia. Si defines un valor en un archivo `app.yaml`, pero al ejecutar el binario inyectas una variable de entorno con el mismo nombre, **Viper priorizará la variable de entorno**. 

El orden de prioridad de Viper (de mayor a menor) es:
1. Llamadas explícitas a `Set()` en el código.
2. *Flags* de línea de comandos.
3. Variables de entorno.
4. Archivo de configuración.
5. Valores por defecto (usando `viper.SetDefault()`).

### 5. Inyección en la aplicación

Una vez que la estructura `Config` está inicializada al arrancar el `main.go`, esta debe ser inyectada **solo** en los componentes que la necesiten, respetando la inversión de dependencias y evitando variables globales (`var GlobalConfig Config`), lo cual dificultaría enormemente el Testing (Capítulo 16).

```go
func main() {
    cfg, err := config.LoadConfig(".")
    if err != nil {
        log.Fatalf("Error crítico al cargar configuración: %v", err)
    }

    // Inyectamos solo la parte de la configuración necesaria (SRP)
    db := repository.NewPostgresDB(cfg.DBHost, cfg.DBUser)
    server := api.NewServer(cfg.ServerPort, db)
    
    server.Start()
}
```

Al adoptar este patrón, garantizamos que si falta una configuración crítica, la aplicación fallará de inmediato en el arranque, en lugar de generar errores silenciosos o pánicos inesperados horas después durante la ejecución.

## 20.4. Frameworks de Inyección de Dependencias (Wire, Dig) vs. Inyección manual

A diferencia de lenguajes como Java o C#, donde la Inyección de Dependencias (DI) suele estar fuertemente acoplada a *frameworks* monolíticos (como Spring) que utilizan anotaciones y reflexión masiva, el ecosistema de Go aborda la DI desde una perspectiva minimalista y explícita. 

En esencia, la inyección de dependencias en Go no es más que pasar parámetros a un constructor o a una función (como vimos en el principio de Inversión de Dependencias en la sección 20.1). Sin embargo, a medida que la arquitectura crece —especialmente en microservicios complejos o aplicaciones basadas en Arquitectura Hexagonal (Capítulo 21)— el grafo de dependencias puede volverse inmanejable. Es aquí donde surgen diferentes estrategias para cablear nuestra aplicación.

### 1. Inyección Manual (El "Go Way")

La forma más idiomática, pura y recomendada de hacer DI en Go es la inyección manual. Se realiza instanciando las dependencias base y pasándolas explícitamente hacia arriba en la cadena de abstracción, generalmente en el `main.go` o en un paquete `cmd/server`.

**Ventajas:**
* **Seguridad en tiempo de compilación:** Si falta una dependencia o hay un desajuste de tipos, el compilador falla inmediatamente.
* **Cero magia:** Cualquier desarrollador puede seguir el flujo de ejecución (haciendo *Ctrl+Click* en su IDE) desde el `main` hasta la capa más profunda. No hay comportamientos ocultos.
* **Rendimiento:** Al no usar reflexión, no hay penalización durante el arranque de la aplicación.

**Desventajas:**
* En aplicaciones de nivel empresarial, el archivo de inicialización puede crecer hasta cientos de líneas, convirtiéndose en un tedioso bloque de código repetitivo (conocido coloquialmente como *Dependency Hell*).

```go
// Ejemplo de Inyección Manual en el main.go
func main() {
    cfg := config.Load()
    
    // Nivel más bajo
    db := database.NewPostgres(cfg.DBConn)
    logger := log.NewLogger()

    // Capa intermedia (Dominio/Servicios)
    userRepo := repository.NewUserRepository(db, logger)
    emailService := external.NewSendgridClient(cfg.EmailAPIKey)
    
    userService := service.NewUserService(userRepo, emailService, logger)

    // Capa más alta (Handlers/Controladores)
    userHandler := handler.NewUserHandler(userService)
    
    server.Start(cfg.Port, userHandler)
}
```

### 2. Frameworks basados en Reflexión (Uber Dig)

Para evitar escribir el código manual de inicialización, surgieron contenedores de inyección de dependencias similares a los de otros lenguajes. **Uber Dig** es uno de los más populares en esta categoría (frecuentemente utilizado bajo el paraguas del *framework* Fx, también de Uber).

Dig funciona registrando constructores (proveedores) en un contenedor y luego resolviendo el grafo de dependencias en tiempo de ejecución utilizando el paquete `reflect` (Capítulo 14).

**Ventajas:**
* Reduce drásticamente el código repetitivo de inicialización. Añadir una nueva dependencia a un servicio solo requiere modificar su constructor; el contenedor se encarga del resto.

**Desventajas (y por qué suele evitarse en Go purista):**
* **Errores en tiempo de ejecución:** Si olvidas registrar un repositorio que un servicio necesita, tu código compilará perfectamente, pero la aplicación sufrirá un `panic` (crash) al momento de arrancar.
* **Caja negra:** Rompe la legibilidad lineal de Go. Entender de dónde viene una instancia requiere rastrear el registro del contenedor.

```go
// Ejemplo conceptual con Uber Dig
func BuildContainer() *dig.Container {
    container := dig.New()
    
    // Registramos los constructores (Devuelven interfaces o structs)
    container.Provide(database.NewPostgres)
    container.Provide(repository.NewUserRepository)
    container.Provide(service.NewUserService)
    container.Provide(handler.NewUserHandler)
    
    return container
}

func main() {
    c := BuildContainer()
    // El contenedor resuelve mágicamente las dependencias necesarias mediante reflexión
    err := c.Invoke(func(h *handler.UserHandler) {
        server.Start(":8080", h)
    })
    if err != nil {
        panic(err)
    }
}
```

### 3. Inyección basada en Generación de Código (Google Wire)

Google identificó los problemas de ambas aproximaciones: la inyección manual es tediosa y la reflexión es insegura y opaca. La solución fue **Wire**.

Wire es una herramienta de **generación de código** en tiempo de compilación. Tú defines *Providers* (constructores) y *Provider Sets* (agrupaciones lógicas de constructores) en un archivo especial (usualmente `wire.go`). Luego, ejecutas el comando `wire` en tu terminal y la herramienta analiza tu código para generar un archivo `wire_gen.go` que contiene la **inyección manual pura**, escrita por la máquina en lugar de por ti.

**Ventajas:**
* **Lo mejor de ambos mundos:** Tienes la automatización de Dig, pero el código final generado goza de la misma seguridad en tiempo de compilación, legibilidad y rendimiento que la inyección manual.
* Si el grafo de dependencias está incompleto o hay dependencias cíclicas, Wire fallará durante la generación de código, antes de la compilación de Go, evitando sorpresas en producción.

```go
// wire.go (Archivo de definición que escribes tú)
//go:build wireinject

package main

import "github.com/google/wire"

// Agrupamos dependencias relacionadas
var UserSet = wire.NewSet(
    repository.NewUserRepository,
    service.NewUserService,
    handler.NewUserHandler,
)

func InitializeUserHandler(db *sql.DB) *handler.UserHandler {
    // Wire reemplazará este panic con el código real
    wire.Build(UserSet)
    return &handler.UserHandler{} 
}
```

Al ejecutar `wire`, la herramienta genera automáticamente el código manual exacto que vimos en el primer ejemplo, ahorrándote el trabajo de cablear todo a mano.

### El Veredicto

La regla de oro en el diseño arquitectónico en Go es: **Empieza con inyección manual**. Es explícita, simple y no requiere dependencias externas. 

Solo debes considerar escalar a herramientas como **Google Wire** cuando tu proyecto cruce el umbral de complejidad donde mantener el `main.go` se convierta en un cuello de botella para el equipo. Por otro lado, la recomendación general de la comunidad es evitar contenedores basados en reflexión como Dig, a menos que estés construyendo plataformas dinámicas o *plugins* donde las dependencias no se conocen en tiempo de compilación.

