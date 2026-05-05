Asegurar que los componentes de un sistema Go funcionen en aislamiento es solo el primer paso hacia la resiliencia. En este capítulo, elevamos el rigor técnico para validar la interacción real entre nuestro código y la infraestructura. Exploraremos cómo superar las limitaciones de los mocks mediante el uso de **Testcontainers-go**, permitiendo instanciar bases de datos y servicios efímeros directamente desde el ciclo de vida de nuestras pruebas. Aprenderás a orquestar entornos deterministas, gestionar el estado de los datos y garantizar que el "mundo exterior" no sea una fuente de incertidumbre, sino una extensión verificable de tu lógica de negocio.

## 18.1. Diferencias de alcance entre tests unitarios y de integración

En los capítulos anteriores (16 y 17), exploramos cómo probar la lógica de nuestra aplicación en total aislamiento. Utilizamos inyección de dependencias y herramientas como *Mocks* y *Stubs* para simular cualquier componente externo. Sin embargo, un sistema donde cada unidad funciona perfectamente por separado puede fallar catastróficamente cuando esas unidades interactúan. 

Es aquí donde entra en juego el testing de integración. Para dominar el testing en Go y construir aplicaciones resilientes, es fundamental trazar una línea clara entre qué probamos en una prueba unitaria y qué delegamos a una prueba de integración.

### El límite de la I/O (Entrada/Salida)

La diferencia arquitectónica más importante entre ambos enfoques es **el cruce de las fronteras de Entrada/Salida (I/O)**. 

* **Tests Unitarios:** Se ejecutan estrictamente en memoria (CPU y RAM). No tocan el disco, no abren conexiones de red, no leen variables de entorno externas ni interactúan con bases de datos reales. Su objetivo es validar la lógica de negocio pura, algoritmos y transformaciones de datos.
* **Tests de Integración:** Cruzan deliberadamente la barrera de I/O. Su propósito es validar que nuestro código Go se comunica correctamente con el mundo exterior: que nuestras sentencias SQL son válidas en el motor de base de datos real, que el mapeo de JSON de una API externa es correcto, o que las políticas de reintento de un cliente HTTP funcionan frente a latencia real.

### Gestión del alcance mediante Build Tags

En Go, la forma idiomática de separar estos alcances no es creando carpetas distintas (como `src/test/java` y `src/integration-test/java` en otros lenguajes), sino utilizando directivas de compilación (**Build Tags**). Esto permite usar el comando estándar `go test` de forma selectiva.

Veamos un ejemplo de cómo se contrastan ambos alcances en el mismo paquete:

```go
// Archivo: user_service_test.go
// Alcance Unitario: Rápido, determinista y aislado.

package user_test

import (
	"testing"
	"tu-proyecto/internal/user"
	"tu-proyecto/internal/user/mocks" // Generado en el Cap. 17
)

func TestService_CreateUser_Unit(t *testing.T) {
	// 1. Instanciamos el mock (Cero I/O)
	mockRepo := mocks.NewMockRepository(t)
	mockRepo.EXPECT().Save(mock.Anything).Return(nil)

	// 2. Probamos la lógica del servicio aislada
	svc := user.NewService(mockRepo)
	err := svc.CreateUser("gopher@golang.org")

	if err != nil {
		t.Fatalf("se esperaba éxito, se obtuvo: %v", err)
	}
}
```

Ahora, observemos el test de integración para el mismo dominio. Nota la directiva `//go:build integration` en la primera línea.

```go
// Archivo: user_repository_integration_test.go
// Alcance de Integración: Lento, dependiente del entorno, valida la I/O.

//go:build integration

package user_test

import (
	"context"
	"testing"
	"tu-proyecto/internal/user/postgres"
	// Asumimos un helper para conectar a la DB
	"tu-proyecto/pkg/testutils" 
)

func TestRepository_Save_Integration(t *testing.T) {
	// 1. Conexión a un recurso real (I/O). 
	// (En la sección 18.2 veremos cómo Testcontainers automatiza esto).
	db := testutils.SetupTestDB(t) 
	repo := postgres.NewRepository(db)

	// 2. Ejecución contra el motor real
	err := repo.Save(context.Background(), user.User{Email: "real@golang.org"})
	
	if err != nil {
		t.Fatalf("fallo al guardar en la base de datos real: %v", err)
	}

	// 3. Verificación de estado en el mundo exterior
	count := testutils.CountUsersInDB(t, db)
	if count != 1 {
		t.Errorf("se esperaba 1 usuario, hay %d", count)
	}
}
```

Para ejecutar solo las pruebas unitarias, usaríamos `go test ./...`. Para incluir las de integración, ejecutaríamos `go test -tags=integration ./...`.

### Comparativa de propiedades arquitectónicas

Para visualizar rápidamente en qué contexto nos encontramos al escribir una prueba, la siguiente tabla resume los compromisos (trade-offs) de cada alcance. Según los estándares de la industria (la pirámide de testing), se recomienda que aproximadamente un **70%** de tu suite sean pruebas unitarias, un **20%** de integración y un **10%** end-to-end (E2E).

| Característica | Test Unitario (Cap. 16-17) | Test de Integración (Cap. 18) |
| :--- | :--- | :--- |
| **Velocidad de ejecución** | Milisegundos. Toda la suite debe correr en segundos. | Segundos a minutos. Depende de la latencia de la red y el disco. |
| **Determinismo** | Altísimo. Dado el mismo input, siempre da el mismo output. | Propenso a ser *flaky* (frágil) por timeouts, bloqueos de DB o estado compartido. |
| **Descubrimiento de bugs** | Errores lógicos, condicionales mal evaluados, pánicos en memoria. | Errores de sintaxis SQL, fallos de conexión, incompatibilidad de esquemas, errores de serialización. |
| **Dependencias externas** | Simuladas (*Mocks*, *Stubs*, *Fakes*). | Reales (PostgreSQL, Redis, Kafka, APIs de terceros). |
| **Paralelismo (`t.Parallel()`)**| Seguro por defecto. | Requiere diseño cuidadoso (bases de datos efímeras, transacciones con rollback). |

El principal desafío del testing de integración en Go siempre ha sido la gestión de esas dependencias externas (las bases de datos o brokers de mensajes reales que vemos en la tabla). Tradicionalmente, esto requería scripts de Bash complejos, Docker Compose local compartido o bases de datos de "testing" en la nube que generaban colisiones de datos si dos desarrolladores ejecutaban pruebas al mismo tiempo.

Para resolver este problema exacto y devolverle el determinismo y aislamiento a los tests de integración, la comunidad de Go ha adoptado masivamente **Testcontainers**, que es exactamente lo que abordaremos en la siguiente sección.

## 18.2. Introducción y configuración de Testcontainers-go

Como vimos en la sección anterior, el mayor obstáculo de los tests de integración es garantizar un entorno determinista y aislado cuando dependemos de infraestructura externa. Históricamente, los equipos de desarrollo recurrían a bases de datos compartidas (que causan colisiones de datos) o a complejos scripts de `docker-compose` externos al ciclo de vida del test (que son difíciles de orquestar y limpiar).

**Testcontainers-go** emerge como la solución idiomática y definitiva a este problema en el ecosistema Go. Es una librería que proporciona APIs para instanciar contenedores Docker efímeros directamente desde tu código de pruebas. 

En lugar de requerir que la infraestructura esté levantada *antes* de correr `go test`, el propio test solicita, configura, espera y destruye la infraestructura que necesita.

### Conceptos Core de la Librería

Testcontainers no es un simple *wrapper* para ejecutar comandos de consola `docker run`. Interactúa directamente con la API del demonio de Docker y expone tres conceptos fundamentales:

1.  **ContainerRequest:** Una estructura (`struct`) declarativa donde defines qué imagen necesitas, qué puertos exponer, variables de entorno y mapeos de volúmenes.
2.  **Wait Strategies:** El componente más crítico. Un contenedor puede estar "corriendo" según Docker, pero el servicio interno (ej. el motor de base de datos) podría tardar varios segundos en estar listo para recibir conexiones. Las estrategias de espera pausan la ejecución del test hasta que se cumpla una condición (un log específico, un puerto a la escucha, o un script de healthcheck exitoso).
3.  **Lifecycle Management:** Métodos nativos integrados con el `context.Context` de Go para garantizar que los contenedores se destruyan al finalizar la prueba, evitando el consumo de recursos (contenedores "zombies").

> **Requisito indispensable:** Para que Testcontainers-go funcione, la máquina donde se ejecuta `go test` (ya sea el ordenador del desarrollador o el agente de CI/CD) debe tener un demonio de Docker compatible ejecutándose (Docker Desktop, Colima, Rancher Desktop, o el motor Docker nativo en Linux).

### Instalación y Configuración Inicial

Para añadir la librería a tu módulo de Go, ejecuta el siguiente comando en la raíz de tu proyecto:

```bash
go get github.com/testcontainers/testcontainers-go
```

### Anatomía de una petición Testcontainers

Aunque en la sección 18.3 profundizaremos en bases de datos específicas usando los módulos prefabricados de la librería, es fundamental entender cómo levantar un contenedor genérico utilizando la API base. 

A continuación, se muestra un ejemplo introductorio levantando un servidor Nginx efímero para validar la sintaxis y configuración básica. Observa cómo integramos el paquete `testing`, el paquete `context` (visto en el Capítulo 13) y la estrategia de espera:

```go
//go:build integration

package infrastructure_test

import (
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestGenericContainer_Nginx(t *testing.T) {
	ctx := context.Background()

	// 1. Definimos la petición del contenedor
	req := testcontainers.ContainerRequest{
		Image:        "nginx:alpine",
		ExposedPorts: []string{"80/tcp"},
		// Estrategia de espera: el test se pausa hasta que el puerto 80 responda
		WaitingFor:   wait.ForListeningPort("80/tcp"),
	}

	// 2. Instanciamos el contenedor
	nginxC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true, // Arrancar inmediatamente tras crearlo
	})
	if err != nil {
		t.Fatalf("No se pudo iniciar el contenedor de Nginx: %v", err)
	}

	// 3. Garantizamos la limpieza al finalizar el test (Crucial)
	// Profundizaremos en la limpieza avanzada en la sección 18.4
	defer func() {
		if err := nginxC.Terminate(ctx); err != nil {
			t.Fatalf("Fallo al terminar el contenedor: %v", err)
		}
	}()

	// 4. Obtenemos el host y el puerto mapeado aleatoriamente
	// Docker mapea el puerto 80 interno a un puerto efímero disponible en el host
	ip, err := nginxC.Host(ctx)
	if err != nil {
		t.Fatalf("No se pudo obtener la IP del host: %v", err)
	}

	mappedPort, err := nginxC.MappedPort(ctx, "80")
	if err != nil {
		t.Fatalf("No se pudo obtener el puerto mapeado: %v", err)
	}

	// 5. Ejecutamos nuestra prueba HTTP real contra el contenedor efímero
	uri := "http://" + ip + ":" + mappedPort.Port()
	resp, err := http.Get(uri)
	if err != nil {
		t.Fatalf("Fallo en la petición HTTP: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Se esperaba código 200, se obtuvo %d", resp.StatusCode)
	}
}
```

### Ventajas del puerto dinámico (`MappedPort`)

Uno de los detalles más potentes expuestos en el código anterior es el uso de puertos dinámicos. Fíjate que solicitamos exponer `"80/tcp"`, pero no forzamos que se mapee al puerto `8080` de nuestra máquina local (como haríamos habitualmente con `-p 8080:80` en la CLI de Docker). 

Testcontainers asigna automáticamente **un puerto libre aleatorio** en la máquina host. Esto elimina por completo el temido error `bind: address already in use`, permitiendo que:
* Múltiples tests de integración se ejecuten en paralelo (`t.Parallel()`).
* Varios desarrolladores o pipelines de CI puedan correr baterías de tests concurrentemente en servidores compartidos sin interferir entre sí.

## 18.3. Instanciación efímera de Bases de Datos (PostgreSQL, Redis, MongoDB)

En la sección 18.2 vimos cómo levantar un contenedor genérico utilizando la estructura `ContainerRequest`. Si bien esto es funcional para cualquier imagen de Docker, configurar manualmente las estrategias de espera (Wait Strategies), las variables de entorno de autenticación y extraer las cadenas de conexión (Connection Strings) para bases de datos complejas puede volverse tedioso y propenso a errores.

Para resolver esto, el ecosistema de Testcontainers-go ofrece **Módulos prefabricados** (Modules). Estos módulos son abstracciones construidas sobre la API genérica, diseñadas específicamente para las bases de datos y servicios más populares. Encapsulan las mejores prácticas, las comprobaciones de estado de salud (Healthchecks) nativas del motor y métodos de conveniencia para integrarse directamente con los drivers de Go.

A continuación, exploraremos cómo instanciar las tres bases de datos más comunes en arquitecturas backend modernas: PostgreSQL (Relacional), Redis (Caché/Clave-Valor) y MongoDB (Documental).

### PostgreSQL: El estándar relacional

Para utilizar el módulo de PostgreSQL, primero debemos instalarlo, ya que los módulos se distribuyen como submódulos del paquete principal para no engordar las dependencias de tu proyecto si no los necesitas:

```bash
go get github.com/testcontainers/testcontainers-go/modules/postgres
```

El módulo de Postgres nos permite definir el nombre de la base de datos, el usuario y la contraseña mediante opciones funcionales (*Functional Options*). Lo más potente es el método `ConnectionString`, que formatea automáticamente la URI de conexión usando el puerto aleatorio mapeado por Docker.

```go
//go:build integration

package database_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	_ "github.com/lib/pq" // Driver de Postgres
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestPostgresIntegration(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 1. Instanciación del contenedor con opciones específicas del módulo
	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:15-alpine"),
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("gopher"),
		postgres.WithPassword("secret"),
		// La estrategia de espera de Postgres ya está implícita en RunContainer
	)
	if err != nil {
		t.Fatalf("fallo al iniciar Postgres: %v", err)
	}

	// Limpieza delegada al sistema de testing de Go (más seguro que defer)
	t.Cleanup(func() {
		if err := pgContainer.Terminate(context.Background()); err != nil {
			t.Fatalf("fallo al terminar el contenedor: %v", err)
		}
	})

	// 2. Obtención mágica de la cadena de conexión
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("fallo al obtener connection string: %v", err)
	}

	// 3. Conexión real usando el driver database/sql
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("fallo al abrir la base de datos: %v", err)
	}
	defer db.Close()

	// 4. Verificación de conectividad (I/O real)
	if err := db.Ping(); err != nil {
		t.Fatalf("fallo al hacer ping a Postgres: %v", err)
	}
}
```

### Redis: Caché y estructuras de datos efímeras

El patrón es idéntico para Redis. La ventaja aquí es que el contenedor de Redis arranca en fracciones de segundo, haciendo que los tests de integración que dependen de él sean casi tan rápidos como los unitarios.

Instalación:
```bash
go get github.com/testcontainers/testcontainers-go/modules/redis
```

Implementación:

```go
//go:build integration

package cache_test

import (
	"context"
	"testing"

	"github.com/redis/go-redis/v9"
	"github.com/testcontainers/testcontainers-go"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

func TestRedisIntegration(t *testing.T) {
	ctx := context.Background()

	redisContainer, err := tcredis.RunContainer(ctx,
		testcontainers.WithImage("redis:7-alpine"),
	)
	if err != nil {
		t.Fatalf("fallo al iniciar Redis: %v", err)
	}
	t.Cleanup(func() {
		if err := redisContainer.Terminate(ctx); err != nil {
			t.Fatalf("fallo al terminar el contenedor: %v", err)
		}
	})

	uri, err := redisContainer.ConnectionString(ctx)
	if err != nil {
		t.Fatalf("fallo al obtener URI de Redis: %v", err)
	}

	// Configuración del cliente go-redis usando la URI dinámica
	opt, err := redis.ParseURL(uri)
	if err != nil {
		t.Fatalf("fallo al parsear URL: %v", err)
	}
	client := redis.NewClient(opt)
	defer client.Close()

	// Prueba real contra Redis
	err = client.Set(ctx, "clave_test", "valor_go", 0).Err()
	if err != nil {
		t.Fatalf("fallo al escribir en Redis: %v", err)
	}
}
```

### MongoDB: Bases de datos NoSQL

Para sistemas orientados a documentos, Testcontainers también ofrece soporte de primera clase. A diferencia de Redis o Postgres, MongoDB (especialmente si se configura como un Replica Set para soportar transacciones) puede tardar un poco más en inicializarse. El módulo de Testcontainers se encarga de sondear el estado del clúster hasta que está listo para recibir operaciones de lectura/escritura.

Instalación:
```bash
go get github.com/testcontainers/testcontainers-go/modules/mongodb
```

Implementación (fragmento clave):

```go
import "github.com/testcontainers/testcontainers-go/modules/mongodb"

// Dentro del test...
mongoContainer, err := mongodb.RunContainer(ctx, testcontainers.WithImage("mongo:6.0"))
// Manejo de errores y t.Cleanup() ...

uri, err := mongoContainer.ConnectionString(ctx)
// Usar uri con go.mongodb.org/mongo-driver/mongo
```

### El valor de la inmutabilidad en las pruebas

Al usar Testcontainers para instanciar estas bases de datos de forma efímera, logramos que cada ejecución de `go test` inicie con un entorno de infraestructura "en blanco" (*tabula rasa*). Esto elimina la necesidad de escribir complejos scripts de limpieza manual antes o después de ejecutar la suite de pruebas a nivel global. Sin embargo, surge un nuevo desafío: si un mismo contenedor efímero se reutiliza para varias sub-pruebas dentro del mismo paquete para ahorrar tiempo de arranque, ¿cómo evitamos que los datos creados por el `TestA` afecten los resultados del `TestB`?

## 18.4. Gestión de ciclos de vida de contenedores y limpieza de estado

En la sección anterior, instanciamos contenedores directamente dentro de nuestras funciones de prueba (por ejemplo, dentro de `TestPostgresIntegration`). Aunque este enfoque garantiza un aislamiento absoluto (una base de datos virgen para cada test), introduce un problema crítico a medida que la aplicación crece: **la penalización de rendimiento**.

Si levantar un contenedor de PostgreSQL tarda 3 segundos, y tenemos 50 tests de integración en nuestro paquete, ejecutar la suite completa tomará más de 2 minutos. En el desarrollo moderno, los bucles de retroalimentación deben ser rápidos. Para solucionar esto, debemos cambiar la estrategia: **instanciar el contenedor una sola vez para toda la suite de pruebas del paquete y reutilizarlo**.

Sin embargo, reutilizar un contenedor nos devuelve al problema original del estado compartido. Si el Test A inserta un usuario y el Test B espera que la tabla esté vacía, el Test B fallará de forma errática. A continuación, veremos cómo dominar ambos aspectos: el ciclo de vida global y el aislamiento de datos.

### 1. Gestión del ciclo de vida con `TestMain`

En Go, la función `TestMain(m *testing.M)` es el punto de entrada global para las pruebas de un paquete. Se ejecuta antes que cualquier función `TestX` y nos permite realizar configuraciones pesadas (como levantar Testcontainers) exactamente una vez.

Veamos cómo estructurar el archivo base de tests de nuestro paquete de repositorios:

```go
//go:build integration

package repository_test

import (
	"context"
	"database/sql"
	"log"
	"os"
	"testing"

	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

// Variable global accesible por todos los tests del paquete
var testDB *sql.DB

func TestMain(m *testing.M) {
	ctx := context.Background()

	// 1. Setup Global: Levantar el contenedor UNA VEZ
	pgContainer, err := postgres.RunContainer(ctx,
		postgres.WithDatabase("integration_db"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
	)
	if err != nil {
		log.Fatalf("Fallo fatal al iniciar Postgres: %v", err)
	}

	// 2. Extraer conexión y guardarla en la variable global
	connStr, _ := pgContainer.ConnectionString(ctx, "sslmode=disable")
	testDB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Fallo al conectar a la DB: %v", err)
	}

	// 3. Ejecutar todos los tests del paquete
	// m.Run() bloquea hasta que todos los tests finalizan y devuelve el código de salida
	exitCode := m.Run()

	// 4. Teardown Global: Limpiar recursos
	testDB.Close()
	if err := pgContainer.Terminate(ctx); err != nil {
		log.Fatalf("Fallo al destruir el contenedor: %v", err)
	}

	// 5. Salir con el código resultante de las pruebas
	os.Exit(exitCode)
}
```

Con este patrón, el costo de arranque de 3 segundos se paga solo una vez. Todos los tests subsiguientes en ese paquete usarán la conexión `testDB`.

### 2. Estrategias de limpieza de estado (State Isolation)

Ahora que tenemos una base de datos compartida, debemos asegurar que cada test deje la base de datos exactamente como la encontró. Existen dos enfoques principales en el ecosistema Go:

**A. Truncado físico de tablas (Hard Reset)**

Consiste en ejecutar un comando de limpieza al inicio (o final) de cada test. Es fácil de entender pero más lento en ejecución, ya que requiere I/O real contra el disco para borrar los datos.

* **En SQL:** Ejecutar `TRUNCATE TABLE users, orders CASCADE;`
* **En Redis:** Ejecutar el comando `FLUSHALL`.
* **En MongoDB:** Ejecutar `db.dropDatabase()` y recrear colecciones.

Ejemplo en Redis:
```go
func TestUserRepository_Cache(t *testing.T) {
	// Limpiar la caché antes de empezar la prueba
	redisClient.FlushAll(context.Background())
	
	// ... ejecución del test ...
}
```

**B. Transacciones con Rollback (Aislamiento perfecto para SQL)**

Esta es la **estrategia idiomática y más eficiente** para bases de datos relacionales en Go. En lugar de borrar datos físicamente, envolvemos toda la ejecución de la prueba en una transacción SQL (Tx) y, pase lo que pase, hacemos un `Rollback` al final. Los datos nunca llegan a persistirse de forma permanente en la base de datos compartida, y la operación en memoria es extremadamente rápida.

Para que esto funcione, la arquitectura de tu aplicación debe permitir inyectar una transacción (o usar un gestor de transacciones) en tus repositorios.

```go
func TestRepository_CreateOrder_Isolated(t *testing.T) {
	// 1. Iniciamos una transacción desde la conexión global compartida
	tx, err := testDB.Begin()
	if err != nil {
		t.Fatalf("Fallo al iniciar transacción: %v", err)
	}
	
	// 2. Garantizamos el rollback sin importar cómo termine el test
	// Esto limpia la base de datos mágicamente sin hacer TRUNCATE
	defer tx.Rollback()

	// 3. Instanciamos el repositorio pasándole la transacción en lugar de la DB
	// (Requiere que tu repositorio acepte una interfaz que abstraiga *sql.DB y *sql.Tx)
	repo := repository.NewOrderRepository(tx)

	// 4. Ejecutamos la prueba con normalidad
	err = repo.Create(context.Background(), domain.Order{ID: 1, Total: 100})
	if err != nil {
		t.Errorf("No se esperaba error al crear orden: %v", err)
	}

	// Como nunca llamamos a tx.Commit(), al salir de la función el defer
	// hace Rollback y el siguiente test encuentra la base de datos vacía.
}
```

### Resumen comparativo de estrategias de aislamiento

| Estrategia | Velocidad | Casos de uso ideales | Desventajas |
| :--- | :--- | :--- | :--- |
| **Contenedor por test** | Muy Lenta | Sistemas muy complejos donde el estado no se puede limpiar fácilmente. | Inviable para suites de cientos de pruebas. |
| **Truncado / Flush** | Media | Bases de datos NoSQL, Redis, o código legacy SQL que no soporta transacciones. | Requiere mantenimiento manual de las listas de tablas a borrar. |
| **Rollback de Tx** | Muy Rápida | Bases de datos relacionales (Postgres, MySQL) con repositorios inyectables. | Requiere adaptar el diseño de código (interfaces) para aceptar `*sql.Tx`. |

Al combinar `TestMain` para la infraestructura y el patrón de Rollback de Transacciones para los datos, logramos tests de integración que no solo son absolutamente deterministas, sino que se ejecutan a la velocidad del rayo, compitiendo casi en rapidez con los tests unitarios.

## 18.5. Carga de datos de prueba (Fixtures) en entornos Testcontainers

Tener un contenedor efímero y garantizar un estado aislado es solo la mitad de la batalla. Cuando Testcontainers levanta una base de datos desde cero, esta nace completamente vacía: sin tablas, sin índices y, por supuesto, sin datos. Para que una prueba de integración sea útil y determinista, necesitamos preparar el terreno estableciendo el esquema relacional y poblando la base de datos con un estado conocido. A este estado inicial predecible lo llamamos **Fixture**.

Existen múltiples estrategias para inyectar este estado en el ecosistema Go, variando desde la configuración estática durante el arranque del contenedor hasta la inserción programática dinámica.

### 1. Carga de Fixtures en el arranque del contenedor (Init Scripts)

La forma más nativa y eficiente de cargar el esquema base y los catálogos estáticos es delegar el trabajo al propio contenedor durante su fase de inicialización. Los módulos oficiales de Testcontainers-go para bases de datos relacionales (como PostgreSQL y MySQL) ofrecen opciones funcionales específicas, como `WithInitScripts`, para ejecutar archivos `.sql` antes de que el contenedor reporte estar listo para aceptar conexiones desde Go.

```go
//go:build integration

package repository_test

import (
	"context"
	"testing"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestMain(m *testing.M) {
	ctx := context.Background()

	// Inicializamos el contenedor inyectando el esquema y datos semilla
	pgContainer, err := postgres.RunContainer(ctx,
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		// Los scripts se ejecutan en orden secuencial por convención de nombres
		postgres.WithInitScripts(
			"../../testdata/01_schema.sql",
			"../../testdata/02_fixtures.sql",
		),
	)
	
	// ... manejo de la conexión global y ciclo de vida (visto en 18.4) ...
}
```

* **Ventaja:** Es extremadamente rápido, ya que la ejecución de los scripts ocurre directamente en la red interna de Docker, optimizando el tiempo de arranque global de la suite.
* **Desventaja:** Genera un estado global. Al aplicarse en el `TestMain`, estos datos existirán para todos los tests. Si utilizas esta técnica, es estrictamente necesario combinarla con el patrón de **Transacciones con Rollback** (visto en la sección 18.4) para evitar que los tests muten este estado base y se afecten entre sí.

### 2. Carga programática de Fixtures (Patrón Test Data Builder)

Cuando los tests requieren estados muy específicos o combinaciones complejas de datos (por ejemplo, validar si un usuario con rol de administrador y una suscripción caducada puede acceder a un recurso), depender de archivos SQL estáticos globales vuelve la suite inmanejable y oculta el contexto de la prueba.

La alternativa idiomática en Go es utilizar el **Patrón Builder** (o *Test Factories*) para inyectar los datos programáticamente de forma explícita dentro del flujo de la prueba.

```go
func TestUserRepository_FindActiveUsers(t *testing.T) {
	// 1. Iniciamos transacción aislada (garantizamos la limpieza con defer)
	tx := testutils.BeginTransaction(t, globalDB)
	defer tx.Rollback()

	repo := user.NewRepository(tx)

	// 2. Arrange: Carga de fixtures programática y explícita para este test.
	// Se usan helpers (factories) que insertan la entidad o fallan el test.
	factory.CreateUser(t, tx, factory.User{Status: "active", Email: "a@test.com"})
	factory.CreateUser(t, tx, factory.User{Status: "inactive", Email: "b@test.com"})
	factory.CreateUser(t, tx, factory.User{Status: "active", Email: "c@test.com"})

	// 3. Act: Ejecutamos el método del dominio
	users, err := repo.FindActiveUsers(context.Background())

	// 4. Assert: Verificamos contra el estado que acabamos de construir localmente
	if err != nil {
		t.Fatalf("error inesperado en el repositorio: %v", err)
	}
	if len(users) != 2 {
		t.Errorf("se esperaban 2 usuarios activos, se obtuvieron %d", len(users))
	}
}
```

* **Ventaja:** La prueba es completamente autocontenida y legible. Cualquier desarrollador que lea la función entiende inmediatamente qué estado exacto de la base de datos se está evaluando, sin tener que hacer malabares mentales saltando a un archivo `.sql` externo.

### 3. Herramientas del ecosistema: `go-testfixtures`

Si tu arquitectura requiere cargar un volumen masivo de datos interrelacionados para pruebas muy complejas (por ejemplo, árboles jerárquicos de categorías o un historial denso de auditoría), escribir `INSERTs` programáticos o lidiar con el ordenamiento manual de claves foráneas en SQL puede volverse tedioso.

Para resolver esto, el estándar *de facto* en la comunidad es el paquete `github.com/go-testfixtures/testfixtures`. Esta herramienta permite definir el estado de la base de datos utilizando archivos YAML y se encarga automáticamente de desactivar y resolver las restricciones de claves foráneas (Foreign Keys) durante la inserción, limpiando y repoblando la base de datos entre test y test si es necesario.

> **Nota arquitectónica:** Aunque herramientas como `go-testfixtures` son excepcionales (especialmente si migras a Go desde ecosistemas como Ruby on Rails o Django), prioriza siempre las factorías programáticas (enfoque 2) cuando sea posible. Las factorías en Go te permiten aprovechar la principal ventaja del lenguaje: **el tipado estático**. Si el esquema de tu base de datos cambia y actualizas tus structs, el compilador atrapará los errores en tus factorías programáticas instantáneamente, mientras que un archivo YAML estropeado solo fallará en tiempo de ejecución.
