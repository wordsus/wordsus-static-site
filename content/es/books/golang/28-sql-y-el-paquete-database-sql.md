La persistencia de datos es el núcleo de la mayoría de las aplicaciones empresariales. En Go, la interacción con bases de datos relacionales no se realiza a través de un framework pesado, sino mediante la interfaz `database/sql`. Este enfoque prioriza el rendimiento y la transparencia, permitiendo a los desarrolladores mantener un control total sobre las consultas.

En este capítulo, exploraremos cómo gestionar el ciclo de vida de las conexiones, desde la validación inicial mediante **Ping** hasta el ajuste fino del **pool de conexiones**. Aprenderás a ejecutar consultas de forma segura contra ataques de inyección y a mapear manualmente los resultados a estructuras de Go, sentando las bases para una capa de datos robusta y escalable.

## 28.1. Conexión a bases de datos relacionales y manejo del Ping

El paquete nativo `database/sql` proporciona una interfaz genérica y ligera en torno a las bases de datos relacionales (SQL). Es fundamental comprender que este paquete no se comunica directamente con la base de datos; en su lugar, actúa como una capa de abstracción que delega la comunicación real a un **driver** específico (como PostgreSQL, MySQL o SQLite).

### Importación de drivers y el identificador en blanco

Para que `database/sql` sepa cómo comunicarse con tu motor de base de datos, debes importar el driver correspondiente. Como vimos en el Capítulo 2 sobre el ámbito de las variables, utilizamos el identificador en blanco (`_`) para importar el paquete exclusivamente por sus efectos secundarios (la función `init()` del driver, que lo registra en `database/sql`), sin llamar a sus funciones directamente en nuestro código.

```go
import (
    "database/sql"
    "time"

    // Se importa el driver de PostgreSQL
    _ "github.com/lib/pq"
)
```

### La naturaleza perezosa de `sql.Open`

Uno de los errores más comunes al trabajar con bases de datos en Go es malinterpretar el comportamiento de la función `sql.Open()`.

```go
db, err := sql.Open("postgres", "postgres://usuario:password@localhost/midb?sslmode=disable")
```

A diferencia de otros lenguajes, `sql.Open` **no establece una conexión de red con la base de datos**. Su única responsabilidad es validar los argumentos proporcionados (el nombre del driver y el *Data Source Name* o DSN) y preparar la estructura interna `*sql.DB`, la cual gestionará un *pool* de conexiones subyacente de forma transparente (tema que profundizaremos en la sección 28.3).

El error devuelto por `sql.Open` rara vez indicará un fallo de credenciales o de red; típicamente solo fallará si el driver especificado ("postgres" en el ejemplo) no ha sido registrado.

### Validación real: El manejo del Ping

Dado que `sql.Open` es "perezoso" (lazy), la forma idiomática y segura de garantizar que la base de datos está accesible y las credenciales son válidas es forzar una comunicación de red. Esto se logra mediante el método `Ping` o, siguiendo las mejores prácticas que aprendimos en el Capítulo 13, su variante controlada por contexto: `PingContext`.

El método `PingContext` solicita al pool una conexión y emite un paquete de prueba hacia el motor de base de datos. Si la base de datos es inalcanzable, el contexto expira, o las credenciales son incorrectas, este método devolverá el error real.

### Ejemplo de inicialización robusta

A continuación, se presenta un patrón idiomático para inicializar la base de datos de manera robusta en el arranque de la aplicación, utilizando un contexto con límite de tiempo para no bloquear el inicio indefinidamente si la base de datos está caída:

```go
package database

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    _ "github.com/lib/pq"
)

// NewConnection inicializa y valida la conexión a la base de datos.
func NewConnection(dsn string) (*sql.DB, error) {
    // 1. Preparamos el pool de conexiones (No conecta físicamente aún)
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("error configurando la base de datos: %w", err)
    }

    // 2. Creamos un contexto con un timeout estricto de 5 segundos
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // 3. Forzamos la conexión de red para validar el DSN y la disponibilidad
    if err := db.PingContext(ctx); err != nil {
        // Es crucial cerrar el pool si el ping falla para liberar recursos inicializados
        db.Close() 
        return nil, fmt.Errorf("error al conectar con la base de datos (ping fallido): %w", err)
    }

    return db, nil
}
```

### Consideraciones sobre el ciclo de vida (`db.Close()`)

El objeto `*sql.DB` está diseñado para ser longevo. Debes instanciarlo una única vez al iniciar tu aplicación y pasarlo (o inyectarlo, como veremos en los capítulos de Arquitectura) a los componentes que lo necesiten.

Aunque es una práctica habitual usar `defer db.Close()` inmediatamente después de una inicialización exitosa en la función `main`, en la mayoría de los demonios web o microservicios, la base de datos rara vez se cierra explícitamente hasta que la aplicación recibe una señal de apagado elegante (Graceful Shutdown). No debes abrir y cerrar conexiones por cada petición HTTP; el `*sql.DB` es seguro para uso concurrente (thread-safe) y se encarga de multiplexar las goroutines sobre su pool interno.

## 28.2. Ejecución de consultas preparadas (Prepared Statements) de forma segura

Una vez que la aplicación ha establecido una conexión validada con la base de datos, el siguiente paso crítico es la ejecución de consultas de manera eficiente y, sobre todo, segura. En el ecosistema de Go, el paquete `database/sql` abstrae el manejo de las consultas preparadas (Prepared Statements) para proteger tus aplicaciones contra la inyección SQL, un vector de ataque que analizaremos más a fondo en el Capítulo 36.

La regla de oro al interactuar con bases de datos relacionales en Go es **nunca concatenar strings para construir consultas dinámicas con datos de usuario**. En su lugar, se deben utilizar parámetros enlazados (bind parameters).

### Consultas Preparadas Implícitas

En la gran mayoría de los casos, no necesitas preparar una sentencia explícitamente. Los métodos principales del `*sql.DB` (`QueryContext`, `QueryRowContext` y `ExecContext`) manejan la preparación de forma transparente si les proporcionas argumentos adicionales.

Cuando ejecutas una consulta parametrizada a través de estos métodos, Go realiza, bajo el capó, las siguientes operaciones:

1. Pide al motor de la base de datos que prepare la sentencia.
2. Ejecuta la sentencia preparada enviando los argumentos provistos.
3. Cierra la sentencia preparada en la base de datos para liberar recursos.

```go
// Ejemplo de consulta segura usando QueryRowContext
// Nota: Utilizamos $1 porque estamos usando el driver de PostgreSQL. 
// Para MySQL o SQLite se utilizaría el símbolo ?.
func ObtenerUsuarioPorEmail(ctx context.Context, db *sql.DB, email string) (*Usuario, error) {
    query := `SELECT id, nombre, activo FROM usuarios WHERE email = $1 AND eliminado = false`
    
    var u Usuario
    // QueryRowContext es ideal cuando esperamos exactamente una fila (o ninguna)
    err := db.QueryRowContext(ctx, query, email).Scan(&u.ID, &u.Nombre, &u.Activo)
    
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            // ErrNoRows es un centinela nativo que indica que la consulta no devolvió datos
            return nil, fmt.Errorf("usuario no encontrado")
        }
        return nil, fmt.Errorf("error al ejecutar la consulta: %w", err)
    }
    
    return &u, nil
}
```

Al utilizar este enfoque, el driver asegura que el valor de la variable `email` sea tratado estrictamente como datos literales y nunca como instrucciones ejecutables por el analizador sintáctico (parser) de la base de datos.

### Consultas Preparadas Explícitas (`db.Prepare`)

Aunque la preparación implícita es conveniente y segura, conlleva una pequeña penalización de rendimiento (múltiples viajes de red) porque Go prepara y cierra la sentencia en cada ejecución. Si necesitas ejecutar exactamente la **misma consulta miles de veces** en un proceso (por ejemplo, en un *worker* de procesamiento masivo o la carga de *fixtures* que veremos en el Capítulo 18), es mucho más eficiente usar `db.PrepareContext`.

```go
func InsertarUsuariosMasivamente(ctx context.Context, db *sql.DB, usuarios []Usuario) error {
    // 1. Preparamos la sentencia explícitamente UNA sola vez
    stmt, err := db.PrepareContext(ctx, "INSERT INTO usuarios (nombre, email) VALUES ($1, $2)")
    if err != nil {
        return fmt.Errorf("error preparando la sentencia: %w", err)
    }
    // 2. CRÍTICO: Las sentencias preparadas ocupan memoria en la base de datos. 
    // Deben cerrarse explícitamente para evitar fugas de recursos (Memory Leaks).
    defer stmt.Close()

    // 3. Ejecutamos la misma sentencia precompilada múltiples veces
    for _, u := range usuarios {
        // ExecContext se usa para consultas que no devuelven filas (INSERT, UPDATE, DELETE)
        _, err := stmt.ExecContext(ctx, u.Nombre, u.Email)
        if err != nil {
            return fmt.Errorf("error insertando a %s: %w", u.Nombre, err)
        }
    }

    return nil
}
```

### Advertencia sobre la sintaxis de los marcadores de posición (Placeholders)

Un error común al migrar código entre diferentes motores de bases de datos es asumir que `database/sql` unifica la sintaxis de los marcadores. **No es así**. El paquete envía la consulta directamente al driver. Debes usar la sintaxis nativa de tu motor:

* **PostgreSQL (`lib/pq`, `pgx`):** `$1`, `$2`, `$3`... (Permite reusar el mismo parámetro en varias partes de la query).
* **MySQL / MariaDB (`go-sql-driver/mysql`):** `?`, `?` (Marcadores posicionales secuenciales).
* **SQLite (`mattn/go-sqlite3`):** `?` o soporte para parámetros nombrados.
* **Oracle / SQL Server:** Sintaxis específica como `:1`, `:name`, o `@p1`.

Si estás construyendo aplicaciones que deben ser agnósticas a la base de datos (lo cual discutiremos en el Capítulo 29 sobre Query Builders y ORMs), deberás gestionar la traducción de estos marcadores dinámicamente o usar herramientas de terceros como `sqlx`.

## 28.3. Configuración y optimización de Connection Pools

Como adelantamos en la sección 28.1, la estructura `*sql.DB` no representa una única conexión de red, sino un **pool de conexiones (Connection Pool)** gestionado internamente por Go. Este diseño multiplexa de forma segura el acceso concurrente desde múltiples *goroutines* hacia la base de datos.

Sin embargo, el comportamiento por defecto de este pool en Go es sumamente agresivo: **no tiene límite en la cantidad máxima de conexiones abiertas**. Si tu aplicación recibe un pico repentino de tráfico y las consultas toman tiempo en resolverse, Go abrirá tantas conexiones como sean necesarias para satisfacer las *goroutines* bloqueadas. En un entorno de producción, esto habitualmente resulta en el temido error `FATAL: sorry, too many clients already` por parte del motor de base de datos, provocando caídas en cascada.

Para construir servicios resilientes, es obligatorio afinar explícitamente el comportamiento del pool utilizando cuatro métodos fundamentales de `*sql.DB`.

### Los 4 pilares de la configuración del Pool

#### 1. `SetMaxOpenConns(n int)`

Define el límite absoluto de conexiones físicas que la aplicación puede establecer con la base de datos simultáneamente (tanto en uso como inactivas).

* **Comportamiento:** Si se alcanza este límite y una nueva *goroutine* necesita ejecutar una consulta, se quedará bloqueada esperando a que otra conexión se libere y regrese al pool (o hasta que su contexto expire, como vimos en el Capítulo 13).
* **Recomendación:** Este valor debe calcularse en función de los límites de tu infraestructura. Si tu base de datos admite 100 conexiones y tienes 4 réplicas de tu microservicio, el valor de `MaxOpenConns` no debería superar 25 por instancia.

#### 2. `SetMaxIdleConns(n int)`

Establece el número máximo de conexiones que pueden mantenerse abiertas pero inactivas (esperando nuevas consultas) dentro del pool.

* **Comportamiento:** Si hay más conexiones inactivas que este límite, Go cerrará el excedente. Por defecto, este valor es 2.
* **Recomendación:** Para aplicaciones con tráfico constante, se recomienda que `MaxIdleConns` sea igual a `MaxOpenConns`. Esto evita el alto coste en latencia de establecer (TCP *handshake* y autenticación) y destruir conexiones continuamente ante variaciones rápidas (ráfagas) de tráfico.

#### 3. `SetConnMaxLifetime(d time.Duration)`

Indica el tiempo máximo absoluto que una conexión puede ser reutilizada antes de ser marcada para su destrucción, independientemente de si está activa o inactiva.

* **Comportamiento:** Es una de las configuraciones más críticas en entornos *Cloud Native* (como veremos en el Capítulo 49). Muchos balanceadores de carga (HAProxy, AWS ALB) o firewalls de red cierran silenciosamente las conexiones TCP de larga duración (por ejemplo, después de 5 minutos). Si el pool de Go no sabe esto, intentará usar una conexión "muerta", resultando en errores de red en la aplicación.
* **Recomendación:** Establécelo siempre en un valor ligeramente inferior al límite de *timeout* inactivo de tu infraestructura de red o base de datos.

#### 4. `SetConnMaxIdleTime(d time.Duration)`

Introducido en Go 1.15, define el tiempo máximo que una conexión puede permanecer inactiva en el pool antes de ser cerrada.

* **Comportamiento:** A diferencia de `MaxLifetime` (que es absoluto), esto permite que el pool "se encoja" y libere recursos (memoria y descriptores de archivos) durante periodos de bajo tráfico.

### Ejemplo de implementación óptima

Integrando estos conceptos, así es como deberíamos enriquecer nuestra función de inicialización:

```go
func ConfigurarPool(db *sql.DB) {
    // Evita saturar la base de datos. Ajustar según réplicas e infraestructura.
    db.SetMaxOpenConns(25)

    // Mantenemos las 25 calientes si hay tráfico, evitando re-conexiones constantes.
    db.SetMaxIdleConns(25)

    // Reciclamos conexiones cada 5 minutos de tiempo de vida total.
    // Crucial para evitar conexiones zombis por firewalls o balanceadores.
    db.SetConnMaxLifetime(5 * time.Minute)

    // Si la conexión lleva 1 minuto sin usarse en el pool, se cierra
    // para liberar recursos durante periodos "valle".
    db.SetConnMaxIdleTime(1 * time.Minute)
}
```

### Monitoreo del Pool en Producción

El ajuste de estos valores rara vez es una ciencia exacta desde el día uno. Afortunadamente, Go expone el estado interno del pool a través del método `db.Stats()`, el cual devuelve una estructura `sql.DBStats`.

Como abordaremos en profundidad en el **Capítulo 40 (Métricas)**, es una práctica estándar de la industria inyectar esta información en sistemas como Prometheus. Monitorizar campos como `WaitCount` (cuántas consultas tuvieron que esperar por una conexión) o `WaitDuration` te indicará objetivamente si tu `MaxOpenConns` es demasiado restrictivo o si las consultas están tardando demasiado en liberar sus recursos.

## 28.4. Escaneo manual de filas (Rows) a Structs

A diferencia de lenguajes o frameworks que incluyen un ORM (Mapeo Objeto-Relacional) por defecto, la filosofía de la Standard Library de Go con el paquete `database/sql` es mantener las operaciones explícitas, transparentes y cercanas al metal. Esto significa que Go no mapeará de forma "mágica" las columnas devueltas por una consulta SQL a los campos de un Struct. Esta responsabilidad recae puramente en el desarrollador a través del proceso de escaneo (scanning).

### Iteración sobre múltiples resultados (`sql.Rows`)

Cuando ejecutamos una consulta que puede devolver múltiples registros utilizando `QueryContext`, obtenemos un puntero a `sql.Rows`. Este objeto actúa como un cursor iterador sobre el conjunto de resultados que transmite el motor de la base de datos.

Para extraer los datos correctamente, debemos implementar un patrón idiomático de cinco pasos:

1. Ejecutar la consulta y obtener el iterador `Rows`.
2. Garantizar el cierre del cursor mediante `defer rows.Close()`.
3. Iterar registro a registro llamando a `rows.Next()`.
4. Escanear las columnas de la fila actual hacia variables de Go usando `rows.Scan()`.
5. Comprobar si ocurrió algún error *después* del bucle iterativo con `rows.Err()`.

### El peligro de las fugas de conexiones (Connection Leaks)

Como detallamos en la sección anterior (28.3), el pool de conexiones es el corazón del rendimiento de tu aplicación. **Mientras un objeto `sql.Rows` esté abierto, mantiene un bloqueo exclusivo sobre una conexión física del pool.** Si olvidas llamar a `rows.Close()`, o si la ejecución de la función es interrumpida prematuramente, esa conexión jamás regresará al pool. Esto provoca una fuga de conexiones (*connection leak*) que eventualmente saturará tu base de datos y causará el colapso de tu servicio. Siempre, sin excepción, utiliza `defer rows.Close()` inmediatamente después de comprobar el error inicial de la consulta.

### Implementación del patrón de escaneo

Veamos cómo se materializa este patrón en código, asumiendo que ya tenemos un Struct `Usuario` definido (aplicando los conceptos del Capítulo 6 sobre punteros y asignación de memoria):

```go
type Usuario struct {
    ID       int
    Nombre   string
    Email    string
    CreadoEn time.Time
}

func ObtenerUsuariosActivos(ctx context.Context, db *sql.DB) ([]Usuario, error) {
    // Es vital que el orden del SELECT coincida luego con el orden del Scan
    query := `SELECT id, nombre, email, creado_en FROM usuarios WHERE activo = true`
    
    rows, err := db.QueryContext(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("error ejecutando consulta: %w", err)
    }
    // CRÍTICO: Libera la conexión de vuelta al pool al finalizar la función
    defer rows.Close()

    var usuarios []Usuario

    // rows.Next() avanza el cursor a la siguiente fila disponible. 
    // Devuelve false cuando no hay más registros o si la conexión falla.
    for rows.Next() {
        var u Usuario
        
        // Scan requiere punteros a las variables destino para poder mutarlas.
        // El orden de los argumentos DEBE ser idéntico al del SELECT de SQL.
        err := rows.Scan(&u.ID, &u.Nombre, &u.Email, &u.CreadoEn)
        if err != nil {
            return nil, fmt.Errorf("error escaneando fila: %w", err)
        }
        
        usuarios = append(usuarios, u)
    }

    // Es obligatorio comprobar si el bucle terminó de forma natural 
    // o debido a un error de red/parseo silenciado durante la iteración.
    if err = rows.Err(); err != nil {
        return nil, fmt.Errorf("error durante la iteración de resultados: %w", err)
    }

    return usuarios, nil
}
```

### El desafío de los valores NULL

Un obstáculo clásico al mapear SQL a tipos fuertemente tipados en Go es el manejo de los valores nulos (`NULL`). Si intentas escanear un `NULL` proveniente de la base de datos directamente en un tipo primario como `string` o `int`, la función `Scan()` devolverá un error inmediatamente, ya que los tipos primarios en Go no admiten el concepto de ausencia de valor (siempre tienen un *zero value*).

Para solventar esto de forma segura, el paquete `database/sql` proporciona "tipos envoltorio" (wrapper types) especializados:

* `sql.NullString`
* `sql.NullInt64`
* `sql.NullBool`
* `sql.NullFloat64`
* `sql.NullTime`

Estas estructuras contienen internamente el valor real y un booleano llamado `Valid` que actúa como bandera para indicar si el valor existía o era `NULL`.

```go
// Supongamos que la columna 'telefono' admite valores NULL
var telefonoDB sql.NullString

err := rows.Scan(&u.ID, &u.Nombre, &telefonoDB)
// ... manejo del error del Scan ...

if telefonoDB.Valid {
    u.Telefono = telefonoDB.String // Asignamos el valor extraído
} else {
    u.Telefono = "No proporcionado" // Lógica de negocio para manejar el valor nulo
}
```

> **Nota avanzada:** Dependiendo del driver SQL subyacente que utilices, también es una práctica cada vez más común escanear valores opcionales directamente hacia **punteros a tipos primarios** (por ejemplo, `*string`), apoyándose en el hecho de que los punteros en Go sí pueden evaluar a `nil`. Sin embargo, los tipos `sql.Null*` siguen siendo la forma más universal y estandarizada dentro de la Standard Library.
