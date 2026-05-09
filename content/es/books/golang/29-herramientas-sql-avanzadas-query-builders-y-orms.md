Tras dominar los fundamentos de `database/sql`, el desarrollador de Go se enfrenta a un dilema: mantener el control total del SQL o ganar velocidad mediante la abstracción. En este capítulo, exploraremos cómo elevar la productividad sin sacrificar la robustez. Analizaremos **sqlx** para eliminar el tedio del mapeo manual, **Squirrel** para resolver la complejidad de las consultas dinámicas y **sqlc** como la cima de la seguridad tipada. Finalmente, contrastaremos estas herramientas con los ORMs **GORM** y **Ent**, definiendo cuándo la "magia" arquitectónica es una aliada y cuándo un lastre para el rendimiento. Bienvenido a la ingeniería de persistencia avanzada.

## 29.1. Uso de `sqlx` para simplificar el mapeo de datos

Como vimos en el capítulo anterior (específicamente en la sección 28.4), extraer datos con el paquete estándar `database/sql` requiere escanear manualmente cada columna en las variables correspondientes utilizando `rows.Scan(&var1, &var2, ...)`. En aplicaciones reales con tablas de decenas de columnas, este proceso no solo es tedioso y verboso, sino también extremadamente propenso a errores (por ejemplo, alterar el orden de las variables o añadir una columna en la consulta y olvidar actualizar el `Scan`).

Aquí es donde entra en juego **`sqlx`** (`github.com/jmoiron/sqlx`).

`sqlx` no es un ORM (Mapeo Objeto-Relacional). Es, en cambio, una extensión ligera que envuelve a `database/sql`, manteniendo su misma interfaz subyacente pero añadiendo capacidades avanzadas de mapeo mediante reflexión (reflect). Te permite seguir escribiendo SQL puro, dándote control absoluto sobre el rendimiento y la sintaxis, pero elimina casi toda la fricción al mover datos entre la base de datos y tus `structs` de Go.

### El mapeo a través de etiquetas (Struct Tags)

El núcleo de la magia de `sqlx` reside en el uso de la etiqueta `db` en tus estructuras. Esta etiqueta le indica a `sqlx` qué columna de la base de datos corresponde a qué campo del `struct`.

```go
package main

import (
 "fmt"
 "log"

 "github.com/jmoiron/sqlx"
 _ "github.com/lib/pq" // Driver de PostgreSQL
)

// User representa a un usuario en la base de datos.
type User struct {
 ID        int    `db:"id"`
 FirstName string `db:"first_name"`
 LastName  string `db:"last_name"`
 Email     string `db:"email"`
}
```

Para inicializar `sqlx`, puedes usar `sqlx.Connect`, que internamente hace el `sql.Open` y el `Ping` que discutimos en la sección 28.1:

```go
db, err := sqlx.Connect("postgres", "user=postgres dbname=test sslmode=disable")
if err != nil {
    log.Fatalln(err)
}
defer db.Close()
```

### Sustituyendo `QueryRow` y `Query`: `Get` y `Select`

Las dos operaciones de lectura más revolucionarias que introduce `sqlx` son `Get` y `Select`. Ambas se encargan de iterar sobre las filas (si aplica), escanear las columnas y cerrar los recursos, todo en una sola línea.

* **`Get`**: Se utiliza cuando esperas exactamente un resultado (reemplaza a `QueryRow` + `Scan`).
* **`Select`**: Se utiliza cuando esperas múltiples resultados. Mapea directamente las filas a un *Slice* de `structs` (reemplaza a `Query` + bucle `for rows.Next()` + `Scan` + `append`).

```go
// 1. Obtener un único usuario usando Get
var user User
err = db.Get(&user, "SELECT * FROM users WHERE id=$1", 1)
if err != nil {
    log.Printf("Error obteniendo usuario: %v\n", err)
}
fmt.Printf("Usuario encontrado: %s %s\n", user.FirstName, user.LastName)

// 2. Obtener múltiples usuarios usando Select
var users []User
err = db.Select(&users, "SELECT * FROM users ORDER BY last_name ASC")
if err != nil {
    log.Printf("Error obteniendo lista de usuarios: %v\n", err)
}

for _, u := range users {
    fmt.Printf("- %s (%s)\n", u.FirstName, u.Email)
}
```

**Nota de rendimiento:** Como aprendimos en el capítulo 14.3, la reflexión tiene un costo. Sin embargo, `sqlx` mitiga este impacto almacenando en caché de forma agresiva los metadatos de las estructuras la primera vez que se mapean, logrando un rendimiento casi idéntico al escaneo manual tradicional.

### Consultas Nombradas (Named Queries)

Otro gran dolor de cabeza en SQL puro es la inserción o actualización masiva de campos utilizando marcadores de posición posicionales (`$1, $2, $3` en Postgres, o `?, ?, ?` en MySQL). Contar los signos de interrogación y hacerlos coincidir con el orden de las variables es un antipatrón de mantenibilidad.

`sqlx` resuelve esto con **Consultas Nombradas**. Te permite usar la sintaxis `:nombre_campo` en tu SQL y pasar el `struct` completo; `sqlx` extraerá los valores basándose en las etiquetas `db`.

#### Inserción con `NamedExec`

```go
newUser := User{
    FirstName: "Ada",
    LastName:  "Lovelace",
    Email:     "ada@example.com",
}

// NamedExec mapea :first_name al campo con `db:"first_name"`, etc.
query := `INSERT INTO users (first_name, last_name, email) 
          VALUES (:first_name, :last_name, :email)`

result, err := db.NamedExec(query, &newUser)
if err != nil {
    log.Fatal(err)
}
```

#### Lectura con `NamedQuery`

De manera similar, puedes realizar lecturas complejas pasando estructuras o incluso mapas (`map[string]interface{}`) como parámetros vinculantes:

```go
// Buscando usuarios con un mapa de parámetros
params := map[string]interface{}{
    "domain": "%@example.com",
}

rows, err := db.NamedQuery("SELECT * FROM users WHERE email LIKE :domain", params)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

// Aquí puedes seguir usando struct scanning fila por fila si lo necesitas
for rows.Next() {
    var u User
    err := rows.StructScan(&u)
    // ...
}
```

### El salvavidas de las cláusulas IN (`sqlx.In`)

En el paquete `database/sql` estándar, ejecutar una consulta del tipo `SELECT * FROM users WHERE id IN (1, 2, 3)` requiriendo parámetros dinámicos es un proceso complejo que obliga a construir la cadena SQL manualmente con múltiples `?`.

`sqlx.In` expande automáticamente un Slice de Go en el número correcto de marcadores de posición posicionales:

```go
targetIDs := []int{1, 5, 10, 15}

// sqlx.In construye la consulta con los marcadores de posición correctos
query, args, err := sqlx.In("SELECT * FROM users WHERE id IN (?)", targetIDs)
if err != nil {
    log.Fatal(err)
}

// Es crucial re-vincular (Rebind) la consulta al formato del motor específico 
// (ej. de '?' a '$1, $2, $3, $4' si usamos PostgreSQL)
query = db.Rebind(query)

var matchedUsers []User
err = db.Select(&matchedUsers, query, args...)
```

### Resumen

`sqlx` es el puente perfecto para los desarrolladores que buscan mantener la previsibilidad, seguridad y el rendimiento de las consultas SQL manuales, pero que desean la comodidad de las asignaciones automáticas a `structs` que ofrecen frameworks de mayor nivel.

## 29.2. Construcción dinámica de consultas con Query Builders (Squirrel)

Aunque herramientas como `sqlx` (vistas en la sección anterior) son excepcionales para mapear resultados, siguen dependiendo de que escribamos las sentencias SQL como cadenas de texto (`strings`). Cuando las consultas son estáticas, esto no supone un problema. Sin embargo, en el desarrollo de APIs modernas (como las que construiremos en la Parte 7 de este libro), es muy común enfrentarse a **consultas dinámicas**.

Imagina un *endpoint* de búsqueda de usuarios donde los filtros por nombre, edad, estado activo y fecha de registro son todos **opcionales**. Intentar construir esta cláusula `WHERE` concatenando fragmentos de cadenas (`" AND age > "` + `ageVar`) no solo produce un código espagueti difícil de leer y mantener, sino que abre la puerta a vulnerabilidades críticas como la Inyección SQL si no manejamos perfectamente los marcadores de posición.

Para resolver este problema arquitectónico sin tener que recurrir a un ORM completo, la comunidad de Go adoptó el patrón **Query Builder** (Constructor de Consultas). Y en este ecosistema, la librería más destacada y madura es **Squirrel** (`github.com/Masterminds/squirrel`).

### ¿Qué es Squirrel?

Squirrel es una librería que proporciona una interfaz fluida (*fluent interface*) para construir sentencias SQL de forma programática y segura. Su única responsabilidad es generar la cadena SQL final y el *Slice* de argumentos correspondientes. **No ejecuta la consulta ni mapea los datos** (para eso seguimos usando `database/sql` o `sqlx`).

Para instalarlo en tu módulo:

```bash
go get github.com/Masterminds/squirrel
```

### Configuración del Formato de Placeholders (Marcadores)

El primer concepto crítico al usar Squirrel es el formato de los marcadores de posición (*placeholders*). Por defecto, Squirrel utiliza el formato de interrogación `?` (típico de MySQL o SQLite). Si utilizas PostgreSQL, debes indicarle explícitamente que genere marcadores en formato dólar (`$1, $2, $3...`).

La forma idiomática de hacer esto y evitar repetirlo en cada consulta es crear una instancia de construcción configurada a nivel de paquete o de repositorio:

```go
package repository

import (
 sq "github.com/Masterminds/squirrel"
)

// psql es nuestro constructor base configurado para PostgreSQL.
// Almacenar esta variable nos ahorra llamar a PlaceholderFormat en cada consulta.
var psql = sq.StatementBuilder.PlaceholderFormat(sq.Dollar)
```

### El verdadero poder: Construcción Condicional (Select)

Veamos cómo Squirrel brilla al resolver el problema de los filtros opcionales. El patrón consiste en inicializar una consulta base e ir encadenando o reasignando cláusulas según el estado de las variables.

```go
import (
 "database/sql"
 "fmt"
 "log"
 
 sq "github.com/Masterminds/squirrel"
)

// Filtros simula los parámetros recibidos, por ejemplo, en un Query String HTTP.
type Filtros struct {
 Nombre     string
 EdadMinima int
 SoloActivos bool
}

func BuscarUsuarios(db *sql.DB, f Filtros) {
 // 1. Iniciamos la consulta base
 query := psql.Select("id", "nombre", "email").From("usuarios")

 // 2. Añadimos condiciones de forma dinámica
 if f.Nombre != "" {
  // Eq es un atajo para igualdades exactas, pero aquí usamos LIKE
  query = query.Where(sq.ILike{"nombre": fmt.Sprintf("%%%s%%", f.Nombre)})
 }

 if f.EdadMinima > 0 {
  query = query.Where(sq.GtOrEq{"edad": f.EdadMinima})
 }

 if f.SoloActivos {
  query = query.Where(sq.Eq{"estado": "activo"})
 }

 // 3. Compilamos la consulta final
 sqlQuery, args, err := query.ToSql()
 if err != nil {
  log.Fatalf("Error construyendo SQL: %v", err)
 }

 // Imprimimos para propósitos de depuración (Logging estructurado en producción)
 fmt.Printf("SQL Generado: %s\n", sqlQuery)
 fmt.Printf("Argumentos: %v\n", args)

 // 4. Ejecutamos usando database/sql (o sqlx)
 rows, err := db.Query(sqlQuery, args...)
 // ... manejo estándar de filas ...
}
```

Al compilar esto (`query.ToSql()`), Squirrel se encarga automáticamente de contar los argumentos introducidos mediante `Eq`, `GtOrEq` o `ILike`, y de colocar correctamente `$1, $2, $3` en la cadena SQL en el orden exacto.

### Actualizaciones e Inserciones Parciales

Otro caso de uso excepcional para Squirrel son las peticiones `PATCH` en REST, donde el cliente solo envía los campos que desea actualizar. En lugar de sobreescribir toda la fila o escribir un `UPDATE` complejo con `COALESCE`, iteramos sobre los campos proporcionados:

```go
func ActualizarPerfil(db *sql.DB, userID int, actualizaciones map[string]interface{}) error {
 if len(actualizaciones) == 0 {
  return nil // Nada que actualizar
 }

 // Iniciamos el constructor de Update
 updateBuilder := psql.Update("usuarios")

 // Iteramos sobre el mapa y añadimos dinámicamente cada campo usando Set
 for columna, valor := range actualizaciones {
  // Nota de seguridad: En producción, asegúrate de validar o establecer
  // una "lista blanca" (allowlist) de claves permitidas en el mapa.
  updateBuilder = updateBuilder.Set(columna, valor)
 }

 // Establecemos la condición y el valor de retorno (si es necesario)
 updateBuilder = updateBuilder.Where(sq.Eq{"id": userID}).Suffix("RETURNING id")

 sqlQuery, args, err := updateBuilder.ToSql()
 if err != nil {
  return err
 }

 var updatedID int
 return db.QueryRow(sqlQuery, args...).Scan(&updatedID)
}
```

### Integración armónica entre Squirrel y `sqlx`

Squirrel se enfoca exclusivamente en la **generación sintáctica**. Por lo tanto, conforma una pareja arquitectónica ideal con `sqlx`. Podemos usar Squirrel para gestionar la complejidad condicional del `WHERE` y dejar que `sqlx` se encargue del mapeo final mediante reflexión.

```go
// Ejemplo de integración
sqlQuery, args, err := query.ToSql()
if err != nil {
    return err
}

var resultados []Usuario
// Usamos el Select de sqlx enviando la cadena generada por Squirrel
err = sqlxDB.Select(&resultados, sqlQuery, args...)
```

### Cuándo evitar un Query Builder

Es importante ejercer el pragmatismo: si tus consultas son estáticas (`SELECT * FROM configuracion WHERE id = $1`), incluir Squirrel solo añade una capa de abstracción innecesaria, consumo de CPU por el ensamblaje en memoria y pérdida de legibilidad nativa. Reserva Squirrel estrictamente para aquellos repositorios donde la variabilidad de la consulta haga que la concatenación de *strings* sea un peligro o un problema de mantenimiento.

## 29.3. Generación de código Go a partir de SQL puro (sqlc)

En las secciones anteriores exploramos cómo manejar SQL desde el código Go: `sqlx` nos facilita el mapeo en tiempo de ejecución mediante reflexión, y `Squirrel` nos permite construir sentencias dinámicas. Sin embargo, ambos enfoques tienen un denominador común: los errores de sintaxis SQL o los desajustes de tipos (por ejemplo, intentar mapear un `VARCHAR` de la base de datos a un `int` en Go) **solo se descubren en tiempo de ejecución** (runtime).

¿Qué pasaría si pudiéramos detectar estos errores en **tiempo de compilación** y, además, eliminar por completo la penalización de rendimiento que supone la reflexión? Ese es exactamente el paradigma que introduce **`sqlc`** (`github.com/sqlc-dev/sqlc`).

A diferencia de un ORM o un Query Builder, `sqlc` es un **compilador**. Tú escribes esquemas y consultas en archivos `.sql` puros, y `sqlc` los analiza para generar código Go idiomático, seguro (type-safe) y altamente optimizado.

### El flujo de trabajo con `sqlc`

El enfoque de `sqlc` invierte el proceso de desarrollo. En lugar de escribir *structs* en Go y adaptarlos a la base de datos, escribes SQL y dejas que Go se adapte a él. El flujo consta de tres elementos principales:

#### 1. Definición del Esquema (DDL)

Primero, le proporcionas a `sqlc` tus sentencias de creación de tablas. Esto le permite al motor interno de `sqlc` (que entiende dialectos como PostgreSQL, MySQL o SQLite) conocer los tipos de datos exactos.

```sql
-- archivo: schema.sql
CREATE TABLE authors (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT      NOT NULL,
  bio  TEXT
);
```

#### 2. Consultas Anotadas (DML)

Luego, escribes tus consultas SQL habituales en otro archivo, utilizando comentarios especiales de `sqlc` para definir el nombre de la función Go que se generará y el tipo de resultado esperado (`:one` para un solo registro, `:many` para múltiples, o `:exec` para inserciones/actualizaciones que no devuelven filas).

```sql
-- archivo: query.sql

-- name: GetAuthor :one
SELECT * FROM authors
WHERE id = $1 LIMIT 1;

-- name: ListAuthors :many
SELECT * FROM authors
ORDER BY name;

-- name: CreateAuthor :one
INSERT INTO authors (name, bio)
VALUES ($1, $2)
RETURNING *;

-- name: DeleteAuthor :exec
DELETE FROM authors
WHERE id = $1;
```

#### 3. Configuración y Generación

A través de un archivo `sqlc.yaml`, le indicas al compilador dónde están tus archivos SQL y dónde debe depositar el código generado. Al ejecutar el comando en tu terminal:

```bash
sqlc generate
```

`sqlc` leerá el esquema y las consultas, y generará un paquete Go (generalmente llamado `db` o `queries`) que contendrá:

1. Un `struct` para cada tabla (ej. `Author`).
2. Una interfaz y métodos con firmas fuertemente tipadas para cada consulta anotada.

### Usando el código generado en Go

El código resultante no utiliza reflexión; utiliza la librería estándar `database/sql` por debajo, escaneando los valores manualmente. Esto significa que obtienes la ergonomía de un ORM con el rendimiento absoluto del SQL puro.

Así es como se consume en tu lógica de aplicación:

```go
package main

import (
 "context"
 "database/sql"
 "log"

 "mi-proyecto/db/queries" // El paquete generado por sqlc
 _ "github.com/lib/pq"
)

func main() {
 ctx := context.Background()
 
 conn, err := sql.Open("postgres", "user=postgres dbname=test sslmode=disable")
 if err != nil {
  log.Fatal(err)
 }
 defer conn.Close()

 // Inicializamos las consultas generadas envolviendo la conexión
 q := queries.New(conn)

 // 1. Crear un autor (notemos que los argumentos están fuertemente tipados)
 // CreateAuthorParams es un struct generado automáticamente por sqlc
 newAuthor, err := q.CreateAuthor(ctx, queries.CreateAuthorParams{
  Name: "Jorge Luis Borges",
  Bio:  sql.NullString{String: "Escritor argentino", Valid: true},
 })
 if err != nil {
  log.Fatal(err)
 }

 // 2. Obtener un autor (devuelve directamente el struct Author, no hay que hacer Scan)
 author, err := q.GetAuthor(ctx, newAuthor.ID)
 if err != nil {
  log.Fatal(err)
 }

 log.Printf("Autor recuperado: %s", author.Name)
}
```

### Ventajas de `sqlc`

1. **Seguridad en tiempo de compilación (Type Safety):** Si cambias el nombre de una columna en tu `schema.sql` y olvidas actualizar el `query.sql`, `sqlc generate` fallará y te avisará. Si pasas un `string` donde se esperaba un `int` en Go, el compilador de Go fallará.
2. **Cero Reflexión:** Al generar el código de los `Scan()` de forma explícita, es tan rápido como escribir el código a mano.
3. **Lenguaje Ubicuo (SQL):** No tienes que aprender el "dialecto" de un ORM (como los métodos `.Where()` o `.Preload()`). Si sabes SQL, sabes usar `sqlc`.

### El Talón de Aquiles: Consultas Dinámicas

Es crucial entender los límites de esta herramienta. **`sqlc` es pésimo para consultas dinámicas.**

Si recuerdas el ejemplo de la sección anterior con `Squirrel` (filtros opcionales de búsqueda por nombre, edad o estado), intentar replicar eso en `sqlc` requiere escribir combinaciones exhaustivas de consultas SQL o abusar de cláusulas poco eficientes como `WHERE (name = $1 OR $1 IS NULL)`.

Por esta razón, en arquitecturas avanzadas, es muy común y totalmente aceptable implementar un **enfoque híbrido**:

* Usar **`sqlc`** para el 80-90% de las consultas estáticas del sistema (inserciones, lecturas por ID, borrados, listados fijos), aprovechando su rendimiento y seguridad.
* Usar **`Squirrel` + `sqlx`** (o `database/sql` puro) exclusivamente para ese 10-20% de consultas complejas de informes o búsquedas con múltiples filtros dinámicos opcionales.

## 29.4. Mapeo Objeto-Relacional (ORMs): GORM y Ent

Hasta ahora hemos explorado herramientas que se mantienen muy cerca del metal (SQL puro) o que ofrecen abstracciones ligeras (`sqlx`, `Squirrel`, `sqlc`). Sin embargo, en el ecosistema Go también existen los **ORMs (Object-Relational Mappers) completos**.

Aunque la filosofía idiomática de Go tiende a favorecer la simplicidad y el control explícito, rechazando la "magia" oculta de los grandes frameworks, la realidad de la industria es que los ORMs aceleran drásticamente el desarrollo de aplicaciones CRUD estándar. En este espacio, dos gigantes dominan el panorama, cada uno con una filosofía de diseño diametralmente opuesta: **GORM** y **Ent**.

### GORM: El estándar pragmático (basado en reflexión)

**GORM** (`gorm.io/gorm`) es, con diferencia, el ORM más popular en Go. Su diseño está fuertemente inspirado en patrones clásicos como *Active Record* (visto en Ruby on Rails o Eloquent en Laravel), priorizando la velocidad de desarrollo y la conveniencia por encima de la rigurosidad estricta.

GORM funciona utilizando **reflexión (reflect)** en tiempo de ejecución. Defines tus modelos como estructuras de Go, utilizas etiquetas (`struct tags`) para configurar el comportamiento y dependes de los métodos encadenables de GORM para interactuar con la base de datos.

#### Características principales de GORM

* **Auto-migración:** Puede crear y modificar esquemas de bases de datos automáticamente basándose en tus `structs` (aunque en producción, como veremos en el Capítulo 30, es preferible usar migraciones versionadas).
* **Asociaciones mágicas:** Maneja relaciones (Has One, Has Many, Belongs To, Many To Many) y permite cargarlas fácilmente con el método `Preload()`.
* **Hooks del ciclo de vida:** Permite ejecutar lógica automática `BeforeSave`, `AfterCreate`, etc.

#### Ejemplo de uso de GORM

```go
package main

import (
 "log"

 "gorm.io/driver/postgres"
 "gorm.io/gorm"
)

// Definición del modelo con etiquetas GORM
type User struct {
 gorm.Model // Añade automáticamente ID, CreatedAt, UpdatedAt, DeletedAt (Soft Delete)
 Name       string
 Email      string `gorm:"uniqueIndex"`
 Posts      []Post // Relación "Has Many" (Un usuario tiene muchos posts)
}

type Post struct {
 gorm.Model
 Title  string
 UserID uint // Clave foránea
}

func main() {
 dsn := "host=localhost user=postgres password=secret dbname=test port=5432 sslmode=disable"
 db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
 if err != nil {
  log.Fatal("Error conectando a la base de datos")
 }

 // Auto-migración (crea las tablas si no existen)
 db.AutoMigrate(&User{}, &Post{})

 // 1. Creación e inserción
 newUser := User{Name: "Alan Turing", Email: "alan@enigma.com"}
 db.Create(&newUser) // Se ejecuta un INSERT y newUser.ID se puebla

 // 2. Consulta con asociaciones (Preload evita el problema N+1 internamente)
 var user User
 db.Preload("Posts").First(&user, "email = ?", "alan@enigma.com")

 log.Printf("Usuario: %s, Posts: %d", user.Name, len(user.Posts))
}
```

El gran inconveniente de GORM es que, al depender de la reflexión e interfaces vacías (`interface{}` / `any`), **pierdes la seguridad de tipos estricta**. Si te equivocas en el nombre de una columna en un string (`db.Where("emial = ?", email)`), el compilador de Go no te avisará; fallará en tiempo de ejecución.

---

### Ent: El enfoque tipado y basado en grafos (Generación de código)

**Ent** (`entgo.io`), creado originalmente por Facebook, es la respuesta moderna a las deficiencias de los ORMs tradicionales en Go. En lugar de usar reflexión, Ent utiliza **generación de código** (al igual que `sqlc`, pero a un nivel de abstracción superior).

Ent modela la base de datos como un **Grafo**, donde las tablas son "Nodos" y las relaciones (Foreign Keys) son "Aristas" (Edges).

#### El flujo de trabajo con Ent

En Ent, no escribes los `structs` directamente. Escribes el **esquema** utilizando código Go declarativo.

**1. Definición del Esquema (`ent/schema/user.go`):**

```go
package schema

import (
 "entgo.io/ent"
 "entgo.io/ent/schema/edge"
 "entgo.io/ent/schema/field"
)

// User define el esquema de la entidad Usuario.
type User struct {
 ent.Schema
}

// Fields (Columnas) de User.
func (User) Fields() []ent.Field {
 return []ent.Field{
  field.String("name").NotEmpty(),
  field.String("email").Unique(),
 }
}

// Edges (Relaciones) de User.
func (User) Edges() []ent.Edge {
 return []ent.Edge{
  edge.To("posts", Post.Type),
 }
}
```

**2. Generación y Uso:**

Tras ejecutar `go generate ./ent`, Ent crea un cliente masivo con métodos fuertemente tipados. El uso resultante es extremadamente seguro y autocompletable por el IDE:

```go
package main

import (
 "context"
 "log"

 "mi-proyecto/ent"
 "mi-proyecto/ent/user" // Paquete generado específicamente para los filtros de Usuario
 _ "github.com/lib/pq"
)

func main() {
 client, err := ent.Open("postgres", "host=localhost user=postgres dbname=test sslmode=disable")
 if err != nil {
  log.Fatalf("Fallo abriendo conexión: %v", err)
 }
 defer client.Close()
 ctx := context.Background()

 // 1. Creación fluida y segura
 u, err := client.User.Create().
  SetName("Grace Hopper").
  SetEmail("grace@navy.mil").
  Save(ctx)

 // 2. Consulta 100% Type-Safe (Sin strings mágicos)
 grace, err := client.User.Query().
  Where(user.EmailEQ("grace@navy.mil")). // Esto es código generado, no compila si te equivocas
  WithPosts().                           // Equivalente al Preload de GORM, pero tipado
  Only(ctx)                              // Espera exactamente 1 resultado
}
```

#### Ventajas y Desventajas de Ent

* **Pros:** Seguridad de tipos total en tiempo de compilación. Las consultas complejas a través de relaciones son muy intuitivas gracias a la navegación de grafos (`client.User.Query().QueryPosts().Where(...)`). Excelente rendimiento al no usar reflexión.
* **Contras:** La curva de aprendizaje es empinada. El código generado puede ser abrumador (cientos de archivos para esquemas grandes). Requiere ejecutar comandos de generación constantemente durante el desarrollo.

### Resumen de filosofías

* Elige **GORM** si necesitas prototipar rápidamente, vienes de ecosistemas como Rails/Laravel, y aceptas un pequeño coste en rendimiento y tipado a cambio de una curva de aprendizaje suave.
* Elige **Ent** si estás construyendo un sistema grande con un modelo de dominio complejo, múltiples relaciones relacionales intrincadas, y donde la seguridad en tiempo de compilación es innegociable.

## 29.5. Análisis comparativo: Cuándo usar ORM vs SQL puro

A lo largo de este capítulo hemos escalado por la pirámide de abstracción de bases de datos en Go: comenzamos en el nivel más bajo interactuando directamente con el driver mediante `database/sql`, añadimos ergonomía con `sqlx`, construimos consultas dinámicas con `Squirrel`, garantizamos la seguridad en tiempo de compilación con `sqlc`, y finalmente delegamos el modelado completo a ORMs pesados como `GORM` y `Ent`.

Llegados a este punto, la pregunta inevitable que surge en todo equipo de arquitectura es: **¿Qué enfoque debemos elegir para nuestro proyecto?**

La respuesta corta y pragmática es que no existe una "bala de plata". La elección depende íntimamente de la complejidad del dominio, los requisitos de rendimiento y la experiencia previa del equipo. A continuación, desglosaremos un marco de decisión para ayudarte a elegir la herramienta correcta.

### Tabla Comparativa de Herramientas

Para visualizar las compensaciones (trade-offs) de cada enfoque, revisemos la siguiente tabla comparativa:

| Enfoque / Herramienta | Control de SQL | Seguridad de Tipos | Rendimiento | Curva de Aprendizaje | Ideal para... |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`database/sql` puro** | Absoluto | Baja (Runtime) | Máximo | Baja | Librerías base, scripts de ultra-bajo nivel. |
| **`sqlx`** | Alto | Baja (Runtime) | Muy Alto | Baja | Proyectos donde el equipo domina SQL y busca ergonomía sin perder control. |
| **Query Builders (`Squirrel`)**| Medio-Alto | Baja (Runtime) | Alto | Media | APIs con múltiples filtros de búsqueda dinámicos y opcionales. |
| **SQL First (`sqlc`)** | Absoluto | Alta (Compilación) | Máximo | Media | Equipos DB-centric, consultas estáticas complejas, máximo rendimiento. |
| **ORM Activo (`GORM`)** | Bajo | Baja (Runtime) | Medio | Baja-Media | Prototipado rápido, aplicaciones CRUD estándar, equipos que vienen de Rails/Django. |
| **ORM de Grafos (`Ent`)** | Bajo | Alta (Compilación) | Alto | Alta | Dominios muy complejos con muchas relaciones, arquitecturas empresariales estrictas. |

### Cuándo usar SQL puro o Abstracciones Ligeras (`sqlx`, `sqlc`)

La filosofía idiomática de Go ("The Go Way") prefiere lo explícito sobre lo implícito. Por ello, la comunidad de Go tiende a rechazar la "magia" de los ORMs tradicionales en favor de herramientas más cercanas al metal.

**Deberías elegir este camino si:**

* **El rendimiento es crítico:** No puedes permitirte la sobrecarga de reflexión o la generación de consultas subóptimas (el clásico problema N+1 de los ORMs).
* **Tienes un equipo "DB-centric":** Tus desarrolladores (o DBAs) son expertos en SQL y prefieren aprovechar características específicas del motor (como funciones de ventana, CTEs complejos, o extensiones como PostGIS).
* **Mantenibilidad a largo plazo:** El código SQL puro sobrevive a las modas de los frameworks. Migrar de `sqlx` a otra herramienta ligera es infinitamente más fácil que desenredar tu lógica de negocio de un ORM pesado.

### Cuándo usar un Query Builder (`Squirrel`)

Como mencionamos en la sección 29.2, los constructores de consultas no son un reemplazo de las herramientas anteriores, sino un complemento táctico.

**Deberías integrarlo si:**

* **Tienes requerimientos de búsqueda dinámicos:** Construir endpoints REST o GraphQL donde el cliente puede combinar docenas de filtros, ordenamientos y paginaciones distintas. Concatenar `strings` SQL manualmente en estos escenarios es insostenible y peligroso (riesgo de inyección SQL).

### Cuándo usar un ORM completo (`GORM`, `Ent`)

A pesar de la preferencia de la comunidad por lo simple, los ORMs resuelven problemas reales de productividad en las empresas.

**Deberías elegir un ORM si:**

* **Velocidad de entrega (Time-to-market):** Estás en una startup o fase de prototipado y necesitas levantar una API CRUD con decenas de tablas en pocos días. GORM, por ejemplo, es imbatible aquí.
* **El modelo de dominio es altamente relacional:** Si tienes una red compleja de relaciones (Usuarios, Permisos, Roles, Organizaciones) y necesitas navegar por ellas constantemente en el código. Ent brilla en la representación de estos grafos de datos.
* **Desacoplamiento del motor:** Aunque rara vez ocurre en la práctica, si existe un requisito real de soportar múltiples motores de bases de datos (por ejemplo, SQLite para local/testing y PostgreSQL en producción) sin reescribir consultas.

### Arquitecturas Híbridas (El enfoque recomendado)

En aplicaciones de nivel empresarial (Enterprise), rara vez se utiliza una sola herramienta. El patrón más exitoso en Go es la **arquitectura híbrida o poligota a nivel de repositorio**:

1. Usa **`sqlc`** o **`sqlx`** para el 80% de tus operaciones: inserciones rápidas, lecturas por ID, y operaciones de alto rendimiento.
2. Usa **`Squirrel`** para el 15% de tus operaciones: endpoints de listado complejos y dinámicos.
3. Reserva un **ORM** (si es estrictamente necesario) para el 5% restante: scripts administrativos complejos o migraciones de estado masivas donde el rendimiento no penaliza al usuario final.
