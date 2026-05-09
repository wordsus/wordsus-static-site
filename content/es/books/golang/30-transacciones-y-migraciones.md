La persistencia de datos en aplicaciones de alto rendimiento exige más que simples consultas; requiere integridad absoluta y capacidad de evolución. Este capítulo aborda la orquestación de operaciones atómicas bajo el estándar **ACID**, garantizando que el estado de la base de datos sea predecible incluso ante fallos críticos. Exploraremos el manejo idiomático de `sql.Tx` en Go, el control de niveles de aislamiento para gestionar la concurrencia y las estrategias de **migración de esquemas** con herramientas como `golang-migrate` y `goose`. Finalmente, dominaremos técnicas de despliegue sin tiempo de inactividad, asegurando que la infraestructura crezca sin interrumpir el servicio.

## 30.1. Manejo de Transacciones (Tx) y propiedades ACID

En el desarrollo de aplicaciones backend robustas, interactuar con la base de datos de forma aislada a través de consultas individuales rara vez es suficiente. Cuando una operación de negocio requiere múltiples mutaciones de estado (por ejemplo, transferir fondos entre dos cuentas o registrar un usuario y asignarle roles por defecto), necesitamos garantizar que todas las operaciones triunfen en conjunto o fallen sin dejar rastro.

Aquí es donde entran en juego las **Transacciones** y las **propiedades ACID**. Aunque delegamos gran parte de esta responsabilidad al motor de la base de datos relacional (PostgreSQL, MySQL, etc.), Go proporciona abstracciones precisas en el paquete `database/sql` para orquestar este flujo de forma segura y concurrente.

---

### Recordatorio Arquitectónico: Las propiedades ACID

Como desarrolladores backend, no solo debemos entender ACID teóricamente, sino cómo se mapea a nuestra implementación en Go:

* **Atomicidad (Atomicity):** "Todo o nada". Si nuestro código Go falla a la mitad de un bloque transaccional, el método `Rollback()` asegura que el estado previo se restaure.
* **Consistencia (Consistency):** Garantizada por los *constraints* de la base de datos (Foreign Keys, Checks), pero propagada a Go mediante los errores que retorna el motor al intentar hacer un `Commit()` o `Exec()`.
* **Aislamiento (Isolation):** Define cómo las transacciones concurrentes se ven afectadas entre sí. Go nos permite configurar el nivel de aislamiento a través de `sql.TxOptions` (lo abordaremos en profundidad en la sección *30.2. Control de niveles de aislamiento*).
* **Durabilidad (Durability):** Una vez que `tx.Commit()` en Go retorna `<nil>`, tenemos la garantía de que el motor de base de datos ha persistido los cambios en disco (típicamente a través del Write-Ahead Log o WAL), incluso si hay un corte de energía un milisegundo después.

---

### La anatomía de `sql.Tx` en Go

Como vimos en el Capítulo 28, el objeto `sql.DB` no es una conexión, sino un *pool* de conexiones. Cuando ejecutas `db.Exec()` o `db.Query()`, Go toma una conexión del pool, ejecuta la consulta de forma *autocommit*, y la devuelve al pool.

Por el contrario, un objeto `sql.Tx` **secuestra y retiene una única conexión del pool** durante todo su ciclo de vida. Esto es vital: todas las consultas ejecutadas sobre esa instancia `tx` viajarán exactamente por la misma conexión TCP subyacente hacia el motor de base de datos.

#### El ciclo de vida transaccional idiomático

El manejo de transacciones en Go tiene un patrón idiomático muy marcado que aprovecha la instrucción `defer` para blindarnos contra fugas de conexiones y estados intermedios corruptos.

```go
package repository

import (
 "context"
 "database/sql"
 "fmt"
)

// TransferFunds ejemplifica una transacción ACID clásica.
func TransferFunds(ctx context.Context, db *sql.DB, fromAccountID, toAccountID int, amount float64) error {
 // 1. Iniciamos la transacción pasándole el Contexto (Capítulo 13)
 // Usamos nil en las TxOptions para adoptar el nivel de aislamiento por defecto del motor.
 tx, err := db.BeginTx(ctx, nil)
 if err != nil {
  return fmt.Errorf("error iniciando transacción: %w", err)
 }

 // 2. LA REGLA DE ORO: Deferimos el Rollback.
 // Si la función retorna tempranamente por un error o un panic, esto revierte los cambios.
 // Si la transacción ya hizo Commit(), Rollback() simplemente retornará sql.ErrTxDone y no hará nada.
 defer tx.Rollback()

 // 3. Ejecutamos las operaciones usando el objeto `tx`, NO el `db`.
 const debitQuery = `UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1`
 res, err := tx.ExecContext(ctx, debitQuery, amount, fromAccountID)
 if err != nil {
  return fmt.Errorf("error debitando cuenta origen: %w", err) // El defer hará rollback
 }

 rowsAffected, err := res.RowsAffected()
 if err != nil || rowsAffected == 0 {
  return fmt.Errorf("fondos insuficientes o cuenta origen no encontrada") // El defer hará rollback
 }

 const creditQuery = `UPDATE accounts SET balance = balance + $1 WHERE id = $2`
 _, err = tx.ExecContext(ctx, creditQuery, amount, toAccountID)
 if err != nil {
  return fmt.Errorf("error acreditando cuenta destino: %w", err) // El defer hará rollback
 }

 // 4. Consolidamos los cambios.
 if err := tx.Commit(); err != nil {
  return fmt.Errorf("error consolidando la transacción: %w", err)
 }

 return nil
}
```

### Antipatrones y peligros comunes

Trabajar con `sql.Tx` introduce vectores de error sutiles que pueden derribar una aplicación en producción. Aquí detallamos los más críticos:

#### 1. Usar el `db` global dentro del bloque transaccional

Un error clásico es iniciar una transacción y, por descuido, usar la variable original `db` (el pool) para ejecutar una de las consultas intermedias.

> **Peligro:** La consulta hecha con `db.Exec()` se ejecutará fuera del contexto transaccional (rompiendo la Atomicidad). Peor aún, si la transacción actual mantiene un bloqueo de fila (Row Lock) y la consulta externa intenta modificar esa misma fila, tu aplicación de Go sufrirá un **Deadlock** instantáneo, agotando eventualmente el pool de conexiones.

#### 2. Concurrencia dentro de un `sql.Tx`

Vimos en la Parte 3 que las goroutines son baratas y abundantes. Sin embargo, **el objeto `sql.Tx` no es seguro para el uso concurrente**.
Dado que `sql.Tx` envuelve una *única* conexión física subyacente, lanzar múltiples goroutines que intenten ejecutar consultas simultáneas llamando a `tx.Exec()` o `tx.Query()` generará una carrera de datos (Data Race) en el driver SQL o corromperá la trama de red enviada al motor. Las consultas dentro de una transacción deben ser estrictamente secuenciales.

#### 3. Olvidar el Contexto (`Begin` vs `BeginTx`)

En bases de código antiguas de Go es común ver el uso de `db.Begin()`. Como desarrollador avanzado, debes usar **siempre** `db.BeginTx(ctx, options)`. Si el cliente HTTP cancela la petición o el tiempo límite (Timeout) expira (conceptos vistos en el Capítulo 13), el uso del contexto cancelará la transacción en la base de datos de forma proactiva, liberando bloqueos costosos y salvando valiosos recursos del motor SQL.

## 30.2. Control de niveles de aislamiento (Isolation Levels)

En la sección anterior establecimos que la propiedad de Aislamiento (Isolation) en ACID garantiza que las transacciones concurrentes no interfieran entre sí. Sin embargo, en la ingeniería de bases de datos del mundo real, el aislamiento absoluto es extremadamente costoso a nivel de rendimiento. Para mitigar esto, los motores relacionales ofrecen un espectro de **niveles de aislamiento**, permitiéndonos equilibrar la integridad estricta de los datos frente a la concurrencia y el rendimiento.

Go proporciona un control granular sobre este comportamiento directamente a través del paquete `database/sql`, utilizando la estructura `sql.TxOptions` al momento de iniciar la transacción con `db.BeginTx()`.

---

### Entendiendo los fenómenos de lectura

Antes de configurar el nivel de aislamiento en Go, es crucial entender qué anomalías de concurrencia estamos intentando prevenir. Los motores de bases de datos definen sus niveles de aislamiento en función de su capacidad para evitar tres fenómenos principales:

1. **Lecturas Sucias (Dirty Reads):** Una transacción lee datos que han sido modificados por otra transacción concurrente, pero que aún no han hecho *commit*. Si la segunda transacción hace *rollback*, la primera habrá operado con datos que nunca existieron oficialmente.
2. **Lecturas No Repetibles (Non-repeatable Reads):** Una transacción lee la misma fila dos veces y obtiene datos diferentes porque otra transacción modificó y consolidó esa fila entre ambas lecturas.
3. **Lecturas Fantasma (Phantom Reads):** Una transacción ejecuta una consulta de búsqueda (ej. `SELECT * WHERE age > 20`) dos veces. Entre ambas ejecuciones, otra transacción inserta o elimina filas que cumplen con la condición, cambiando el conjunto de resultados.

---

### Configurando el aislamiento en Go con `sql.TxOptions`

Por defecto, si pasamos `nil` como opciones en `db.BeginTx(ctx, nil)`, Go delegará la decisión al motor subyacente (por ejemplo, PostgreSQL usa *Read Committed* por defecto, mientras que MySQL con InnoDB usa *Repeatable Read*).

Para tomar el control explícito, instanciamos `sql.TxOptions` y utilizamos las constantes de tipo `sql.IsolationLevel`.

#### Los niveles estándar soportados por Go

Go mapea los estándares de SQL (y algunas extensiones específicas de ciertos motores) en las siguientes constantes:

* `sql.LevelReadUncommitted`: El nivel más bajo. Permite lecturas sucias.
* `sql.LevelReadCommitted`: Previene lecturas sucias. (Estándar en la mayoría de sistemas).
* `sql.LevelRepeatableRead`: Previene lecturas sucias y no repetibles.
* `sql.LevelSerializable`: El nivel más estricto. Previene todos los fenómenos, incluyendo lecturas fantasma, simulando que las transacciones se ejecutan secuencialmente.
* *Niveles extendidos:* Go también define `sql.LevelSnapshot` (común en SQL Server), `sql.LevelWriteCommitted` y `sql.LevelLinearizable`, aunque su soporte depende enteramente del driver que estés utilizando.

#### Ejemplo práctico: Transacción Serializable y de Solo Lectura

Imaginemos que necesitamos generar un reporte financiero de fin de mes. Queremos garantizar que los datos no muten en absoluto mientras nuestras consultas de agregación se ejecutan, requiriendo el nivel `Serializable`. Además, Go nos permite marcar la transacción como de **solo lectura** (`ReadOnly`), lo cual es una excelente práctica que permite a muchos drivers optimizar la ejecución o enrutar la consulta a una réplica de lectura.

```go
package reports

import (
 "context"
 "database/sql"
 "fmt"
)

// GenerateMonthlyReport ejecuta una transacción serializable de solo lectura.
func GenerateMonthlyReport(ctx context.Context, db *sql.DB) error {
 // Configuramos las opciones de la transacción
 opts := &sql.TxOptions{
  Isolation: sql.LevelSerializable,
  ReadOnly:  true, // Optimización: indicamos que no haremos mutaciones (INSERT/UPDATE/DELETE)
 }

 tx, err := db.BeginTx(ctx, opts)
 if err != nil {
  return fmt.Errorf("no se pudo iniciar la transacción de reporte: %w", err)
 }
 defer tx.Rollback() // Seguro: si es ReadOnly, el Rollback simplemente libera la conexión

 // 1. Ejecutar consultas de lectura complejas
 var totalRevenue float64
 err = tx.QueryRowContext(ctx, "SELECT SUM(amount) FROM ledger WHERE month = 'current'").Scan(&totalRevenue)
 if err != nil {
  return fmt.Errorf("error calculando ingresos: %w", err)
 }

 // 2. Ejecutar más consultas...
 // Al ser Serializable, garantizamos que las filas no cambiarán 
 // (ni aparecerán nuevas) respecto a la primera consulta.

 // Para transacciones ReadOnly, un Commit o un Rollback tienen un efecto similar 
 // en cuanto a la liberación de recursos, pero Commit indica que todo fue exitoso.
 if err := tx.Commit(); err != nil {
  return fmt.Errorf("error finalizando la transacción de lectura: %w", err)
 }

 fmt.Printf("Reporte generado. Ingresos totales: %.2f\n", totalRevenue)
 return nil
}
```

### Consideraciones críticas y limitaciones del Driver

El paquete `database/sql` de Go actúa como una interfaz abstracta; el trabajo real recae en el driver específico (como `github.com/lib/pq` o `github.com/go-sql-driver/mysql`). Esto introduce matices importantes:

1. **Rechazo vs. Promoción Silenciosa:** Si solicitas un nivel de aislamiento que el motor de base de datos no soporta, el comportamiento depende del motor. Por ejemplo, PostgreSQL no soporta *Read Uncommitted*; si solicitas `sql.LevelReadUncommitted` en Go, Postgres lo promoverá silenciosamente a *Read Committed*. Otros drivers podrían devolver un error explícito durante el `BeginTx()`.
2. **Errores de Serialización:** Cuando usas niveles estrictos como `sql.LevelSerializable`, debes estar preparado para que `tx.Commit()` (o incluso `tx.Exec()`) retorne un error si el motor detecta un conflicto irresoluble entre dos transacciones concurrentes. En aplicaciones avanzadas, tu código Go debe capturar este error específico y aplicar un patrón de **Retry** (reintentar la transacción completa).

## 30.3. Herramientas de migración de esquemas (golang-migrate, goose)

En el ciclo de vida de cualquier aplicación backend que utilice una base de datos relacional, el esquema de datos evolucionará constantemente. Añadir tablas, modificar columnas o crear índices son operaciones cotidianas. Ejecutar estos cambios manualmente a través de un cliente SQL en producción es una receta garantizada para el desastre, inconsistencias y pérdida de datos.

La solución profesional es tratar la base de datos como código (Database-as-Code) mediante **migraciones de esquemas**. Una migración es un script versionado e inmutable que describe un cambio en el estado de la base de datos. En el ecosistema de Go, destacan dos herramientas estándar de facto: `golang-migrate/migrate` y `pressly/goose`.

---

### 1. `golang-migrate/migrate`: El estándar agnóstico

`golang-migrate` es probablemente la herramienta más popular en Go para esta tarea. Su filosofía se basa en utilizar scripts SQL puros y mantener un registro del estado actual en una tabla especial dentro de tu base de datos (típicamente llamada `schema_migrations`).

Esta herramienta impone una convención estricta: cada cambio requiere dos archivos con un prefijo de versión (usualmente un *timestamp* o un número secuencial), uno para aplicar el cambio (`up`) y otro para revertirlo (`down`).

```text
000001_create_users_table.up.sql
000001_create_users_table.down.sql
000002_add_status_to_users.up.sql
000002_add_status_to_users.down.sql
```

#### Ejecución programática con `go:embed`

Aunque `golang-migrate` proporciona una CLI excelente (ideal para usar en pipelines de CI/CD), una práctica avanzada y muy común en microservicios Go es embeber los archivos SQL directamente en el binario compilado usando la directiva `//go:embed` (introducida en Go 1.16) y ejecutar las migraciones programáticamente al arrancar la aplicación. Esto garantiza que el binario de tu aplicación es autocontenido y siempre funcionará contra el esquema correcto.

```go
package database

import (
 "database/sql"
 "embed"
 "fmt"

 "github.com/golang-migrate/migrate/v4"
 "github.com/golang-migrate/migrate/v4/database/postgres"
 "github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var fs embed.FS

// RunMigrations aplica las migraciones pendientes al arrancar el servicio.
func RunMigrations(db *sql.DB, dbName string) error {
 // 1. Configuramos el sistema de archivos embebido como origen de datos
 sourceDriver, err := iofs.New(fs, "migrations")
 if err != nil {
  return fmt.Errorf("error cargando archivos embebidos: %w", err)
 }

 // 2. Configuramos el driver de base de datos (PostgreSQL en este ejemplo)
 dbDriver, err := postgres.WithInstance(db, &postgres.Config{})
 if err != nil {
  return fmt.Errorf("error creando driver de postgres para migraciones: %w", err)
 }

 // 3. Instanciamos el motor de migración
 m, err := migrate.NewWithInstance("iofs", sourceDriver, dbName, dbDriver)
 if err != nil {
  return fmt.Errorf("error instanciando golang-migrate: %w", err)
 }

 // 4. Ejecutamos las migraciones 'Up'
 if err := m.Up(); err != nil && err != migrate.ErrNoChange {
  return fmt.Errorf("error aplicando migraciones: %w", err)
 }

 return nil
}
```

Un detalle arquitectónico a tener en cuenta con `golang-migrate` es su manejo de errores: si una migración falla a la mitad (y el motor no soporta DDL transaccional, como ocurre en MySQL), la base de datos quedará marcada como "sucia" (*dirty flag* en `schema_migrations`), requiriendo intervención manual para arreglar el estado antes de poder ejecutar nuevas migraciones.

---

### 2. `pressly/goose`: Migraciones dinámicas en código Go

Mientras que `golang-migrate` te obliga a usar archivos SQL puros, `goose` brilla por ofrecer una alternativa poderosa: **escribir migraciones directamente en Go**.

¿Por qué querríamos escribir migraciones en Go en lugar de SQL? En sistemas complejos, a veces una migración requiere lógica que SQL no puede manejar fácilmente. Por ejemplo:

* Hacer backfill de datos iterando sobre millones de registros por lotes.
* Encriptar contraseñas antiguas usando `bcrypt` u otro paquete criptográfico.
* Consultar una API externa de terceros para enriquecer datos existentes antes de guardarlos en una nueva columna.

Con `goose`, puedes registrar funciones Go que actúan como operaciones `Up` y `Down`. La herramienta inyectará un objeto `*sql.Tx` para que puedas operar de forma segura.

#### Ejemplo de migración escrita en Go con `goose`

```go
package migrations

import (
 "database/sql"

 "github.com/pressly/goose/v3"
)

// Utilizamos la función init() para registrar la migración en el binario.
func init() {
 goose.AddMigration(upBackfillUserUUIDs, downBackfillUserUUIDs)
}

func upBackfillUserUUIDs(tx *sql.Tx) error {
 // Esta consulta iteraría sobre los usuarios sin UUID y generaría uno
 // usando una librería de Go, algo complejo de hacer con SQL estándar en ciertos motores.
 rows, err := tx.Query("SELECT id FROM users WHERE external_uuid IS NULL")
 if err != nil {
  return err
 }
 defer rows.Close()

 // ... Lógica de iteración, generación de UUIDs y ejecución de sentencias UPDATE ...

 return nil
}

func downBackfillUserUUIDs(tx *sql.Tx) error {
 // En una operación down lógica, podríamos anular los UUIDs (aunque rara vez se hace en producción)
 _, err := tx.Exec("UPDATE users SET external_uuid = NULL")
 return err
}
```

Para aplicar estas migraciones, simplemente importaríamos nuestro paquete de migraciones en el `main.go` y utilizaríamos la API de `goose` (`goose.Up(db, ".")`) de forma muy similar a como lo hicimos en el ejemplo anterior.

### ¿Cuál elegir?

Como arquitecto de software en Go, tu decisión dependerá del contexto del equipo:

* Usa **`golang-migrate`** si prefieres mantener un límite estricto donde la base de datos solo se modifica mediante SQL declarativo puro, lo cual facilita que los DBAs revisen los scripts.
* Usa **`goose`** si prevés que tu aplicación requerirá transformaciones de datos complejas durante las migraciones, aprovechando todo el ecosistema de librerías de Go.

## 30.4. Estrategias para migraciones de bases de datos sin tiempo de inactividad

En aplicaciones modernas con alta disponibilidad, detener el tráfico web o poner el sistema en "modo mantenimiento" para ejecutar un `ALTER TABLE` simplemente no es una opción aceptable. Las bases de datos relacionales aplican bloqueos (locks) exclusivos al modificar esquemas; si una tabla tiene millones de registros, este bloqueo puede durar minutos, provocando que tu API en Go agote el *pool* de conexiones, dispare *timeouts* y colapse.

Para evolucionar la base de datos sin tiempo de inactividad (*Zero-Downtime Migrations*), debemos desacoplar el despliegue del código Go de la ejecución de los scripts SQL. La estrategia fundamental para lograr esto es el patrón **Expand and Contract** (también conocido como *Parallel Change*).

---

### El patrón Expand and Contract

Este patrón divide un cambio destructivo (como renombrar una columna, cambiar su tipo o dividir una tabla) en una serie de pasos seguros y retrocompatibles. Ningún paso rompe la versión del código Go que se está ejecutando actualmente en producción.

Imagina que necesitamos unificar las columnas `first_name` y `last_name` en una sola columna `full_name` en nuestra tabla `users`. El proceso consta de cinco fases estrictas:

1. **Expandir (Migración SQL):** Añadimos la nueva columna `full_name` a la tabla permitiendo valores nulos (`NULL`). No tocamos las columnas originales. El código Go actual ignora esta nueva columna.
2. **Doble Escritura (Despliegue Go):** Desplegamos una nueva versión de nuestro backend. El repositorio ahora escribe tanto en las columnas antiguas como en la nueva al insertar o actualizar, pero **sigue leyendo de las antiguas**.
3. **Backfill (Migración de Datos):** Ejecutamos un script (o una migración en Go con `goose`, como vimos en la sección anterior) para poblar la nueva columna `full_name` concatenando `first_name` y `last_name` para todos los registros antiguos que aún lo tienen en nulo.
4. **Transición (Despliegue Go):** Desplegamos otra versión del backend. Ahora el código lee exclusivamente de la nueva columna `full_name`. Las escrituras pueden dejar de poblar las columnas antiguas.
5. **Contraer (Migración SQL):** Una vez que estamos seguros de que no hay errores y no necesitamos hacer *rollback* de nuestra aplicación Go, ejecutamos una última migración SQL para eliminar (`DROP`) las columnas `first_name` y `last_name`.

---

### Implementando la Doble Escritura en Go

La fase más crítica para el desarrollador backend es la Fase 2. Durante este periodo, la aplicación debe garantizar que ambos esquemas se mantengan sincronizados temporalmente.

Aquí tienes un ejemplo de cómo se adapta el patrón de repositorio en Go para manejar esta transición de forma segura:

```go
package repository

import (
 "context"
 "database/sql"
 "fmt"
)

type User struct {
 ID        int
 FirstName string // Próximo a ser obsoleto
 LastName  string // Próximo a ser obsoleto
 FullName  string // Nueva columna
}

// CreateUser demuestra el patrón de doble escritura (Fase 2 de Expand and Contract).
func CreateUser(ctx context.Context, db *sql.DB, u User) error {
 // Calculamos el nuevo campo en memoria
 u.FullName = fmt.Sprintf("%s %s", u.FirstName, u.LastName)

 // La consulta SQL inserta en TODAS las columnas (antiguas y nueva)
 const query = `
  INSERT INTO users (first_name, last_name, full_name)
  VALUES ($1, $2, $3)
  RETURNING id
 `
 
 err := db.QueryRowContext(ctx, query, u.FirstName, u.LastName, u.FullName).Scan(&u.ID)
 if err != nil {
  return fmt.Errorf("error insertando usuario con doble escritura: %w", err)
 }

 return nil
}
```

---

### Operaciones SQL seguras vs. peligrosas

Más allá del patrón lógico en Go, debes conocer el comportamiento físico de tu motor de base de datos. Lo que es instantáneo en PostgreSQL podría requerir una reescritura completa de la tabla en MySQL.

La siguiente tabla resume reglas generales para migraciones sin inactividad:

| Operación SQL | Nivel de Riesgo | Estrategia Segura |
| :--- | :--- | :--- |
| Añadir columna sin valor por defecto | **Bajo** | Ejecución directa (`ALTER TABLE ... ADD COLUMN`). Operación de metadatos casi instantánea. |
| Añadir columna con valor por defecto | **Alto** (Motor dependiente) | En PostgreSQL 11+, es instantáneo. En motores antiguos, bloquea la tabla. Mejor añadir sin defecto, luego establecer el defecto, luego hacer *backfill*. |
| Cambiar tipo de dato de una columna | **Muy Alto** | Bloquea la tabla. Usar *Expand and Contract*: crear columna nueva, doble escritura, *backfill*, cambiar código, borrar vieja. |
| Añadir Índice | **Medio** | Bloquea escrituras. Usar creación concurrente (ej. `CREATE INDEX CONCURRENTLY` en Postgres o `ALGORITHM=INPLACE` en MySQL). |
| Renombrar tabla o columna | **Muy Alto** | Rompe las consultas en vuelo. Usar vistas temporales o aplicar *Expand and Contract*. |

### Prevención de Deadlocks con Timeouts de Bloqueo

Incluso con operaciones seguras, una migración puede quedarse atascada esperando a que las transacciones de Go liberen sus bloqueos. Una excelente práctica al escribir migraciones SQL es configurar un tiempo de espera de bloqueo (*Lock Timeout*) al inicio del script.

Si configuras `SET lock_timeout TO '5s';` antes de tu `ALTER TABLE`, te aseguras de que si la base de datos no puede adquirir el bloqueo exclusivo en 5 segundos, la migración fallará y se abortará, en lugar de encolar y bloquear todo el tráfico entrante de tu API.
