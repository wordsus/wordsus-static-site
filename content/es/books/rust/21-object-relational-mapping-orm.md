La persistencia de datos es el núcleo de cualquier aplicación backend, pero el puente entre el mundo relacional de SQL y el sistema de tipos de Rust puede ser complejo. En este capítulo, exploramos el ecosistema de los **Object-Relational Mappers (ORM)**, herramientas diseñadas para abstraer la interacción con la base de datos mediante estructuras nativas del lenguaje.

Analizaremos la seguridad extrema en tiempo de compilación que ofrece **Diesel**, la flexibilidad asíncrona de **SeaORM** y cómo construir consultas dinámicas sin sacrificar el rendimiento. El objetivo es dominar la gestión de relaciones complejas manteniendo un código mantenible, tipado y libre de errores en ejecución.

## 21.1 Diesel: Generación de código y seguridad de tipos (Síncrono/Asíncrono)

Si en el capítulo anterior vimos cómo SQLx nos ofrece seguridad mediante la verificación de consultas contra una base de datos viva, **Diesel** toma un camino filosóficamente distinto: **representar el esquema de tu base de datos directamente en el sistema de tipos de Rust**.

Diesel es el ORM (Object-Relational Mapper) más maduro del ecosistema. Su promesa principal es contundente: si tu código con Diesel compila, es virtualmente imposible que tu consulta SQL falle en tiempo de ejecución por errores de sintaxis o desajustes de tipos.

Para lograr esto, Diesel se apoya fuertemente en dos pilares: una potente generación de código a través de macros y un uso exhaustivo de los *Traits* de Rust.

### Generación de código y el archivo `schema.rs`

A diferencia de otros lenguajes donde el ORM inspecciona las clases para crear las tablas (Code-First), Diesel adopta un enfoque **Database-First** o basado en migraciones.

Utilizando su herramienta de línea de comandos (`diesel-cli`), Diesel lee el esquema actual de tu base de datos y genera automáticamente un archivo llamado `schema.rs`. Este archivo utiliza la macro `table!` para declarar módulos y estructuras que el compilador de Rust puede entender.

```rust
// Ejemplo de código generado automáticamente en src/schema.rs
// ¡No debes editar este archivo manualmente!

diesel::table! {
    users (id) {
        id -> Uuid,
        username -> Varchar,
        email -> Varchar,
        active -> Bool,
        created_at -> Timestamp,
    }
}
```

Esta macro es el corazón de la seguridad de Diesel. Genera código (structs unitarios y traits) que representan cada tabla y cada columna. Cuando escribes una consulta, estás utilizando estos tipos generados. Si intentas comparar un `username` (Varchar) con un número entero, el compilador de Rust lo detendrá inmediatamente con un error de *Type Mismatch*, sin necesidad de conectarse a la base de datos.

### Seguridad de tipos mediante Modelos y Macros Derive

Para mapear los resultados de la base de datos a tus estructuras de dominio, Diesel utiliza macros de derivación (`#[derive(...)]`). Las dos más fundamentales son:

* **`Queryable`**: Permite que los datos recuperados de una consulta `SELECT` se mapeen a tu struct. El orden y los tipos de los campos en el struct **deben coincidir exactamente** con lo que devuelve la consulta.
* **`Insertable`**: Permite que una instancia de tu struct sea utilizada en una sentencia `INSERT`. Requiere indicar a qué tabla pertenece mediante `#[diesel(table_name = ...)]`.

```rust
use diesel::prelude::*;
use uuid::Uuid;
use chrono::NaiveDateTime;
use crate::schema::users;

// Modelo para leer de la base de datos
#[derive(Queryable, Selectable, Debug)]
#[diesel(table_name = users)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub active: bool,
    pub created_at: NaiveDateTime,
}

// Modelo independiente para insertar (id y created_at se generan en la BD)
#[derive(Insertable)]
#[diesel(table_name = users)]
pub struct NewUser<'a> {
    pub username: &'a str,
    pub email: &'a str,
}
```

### El dilema: Síncrono vs. Asíncrono

Dado que Diesel fue creado antes de que el ecosistema asíncrono de Rust (`std::future`, Tokio) se estabilizara, su núcleo histórico es **estrictamente síncrono**. Esto presenta un desafío arquitectónico que debes comprender bien al integrarlo con frameworks como Axum o Actix-Web (que exploramos en la Parte IV).

**1. El enfoque Síncrono tradicional (Blocking I/O)**
Si utilizas el crate `diesel` estándar, las llamadas a la base de datos bloquearán el hilo actual. En un runtime asíncrono como Tokio, bloquear un hilo de trabajo (*worker thread*) es un antipatrón crítico que degradará severamente el rendimiento.
Para solucionarlo, debes enviar las consultas de Diesel a un pool de hilos dedicados a operaciones bloqueantes (usando funciones como `tokio::task::spawn_blocking` o `web::block` en Actix).

**2. El enfoque Asíncrono moderno (`diesel-async`)**
Para evitar la sobrecarga de cambiar de contexto entre hilos asíncronos y bloqueantes, la comunidad desarrolló `diesel-async`. Este crate envuelve el generador de consultas de Diesel puro pero reemplaza la capa de conexión con drivers asíncronos nativos (como `tokio-postgres`, visto en el Capítulo 19).

Hoy en día, para un backend concurrente, **`diesel-async` es la ruta recomendada**.

A continuación, un ejemplo de cómo se ve una consulta utilizando el enfoque asíncrono moderno con un pool de conexiones `bb8` (conceptos del Cap. 19):

```rust
use diesel_async::{RunQueryDsl, AsyncConnection, pooled_connection::bb8::Pool};
use diesel_async::AsyncPgConnection;
use crate::schema::users::dsl::*;

// Asumimos que `pool` viene inyectado desde el estado de la aplicación (Ej: Axum State)
pub async fn get_active_users(
    pool: &Pool<AsyncPgConnection>
) -> Result<Vec<User>, diesel::result::Error> {
    
    // Obtenemos una conexión asíncrona del pool
    let mut conn = pool.get().await.expect("Fallo al obtener conexión del pool");

    // Construcción de la consulta con tipado fuerte y ejecución asíncrona
    let active_users = users
        .filter(active.eq(true))
        .limit(50)
        .select(User::as_select())
        .load_async::<User>(&mut conn) // <- Interfaz de diesel-async
        .await?;

    Ok(active_users)
}
```

**Ventajas y Desventajas de Diesel:**

* **Pros:** Seguridad inigualable en tiempo de compilación, excelente rendimiento, permite reutilización de fragmentos de consultas (Query Builder composable).
* **Contras:** Tiempos de compilación más lentos debido a la pesada expansión de macros; curva de aprendizaje pronunciada frente a errores de compilación complejos originados por la falta de un *Trait Bound* específico.

## 21.2 SeaORM: El ORM asíncrono para bases de datos relacionales

Si Diesel representa la vieja guardia adaptándose al mundo asíncrono, **SeaORM** es el nativo digital de esta era. Construido directamente sobre el ecosistema de Tokio y utilizando **SQLx** bajo el capó para la interacción con los drivers, SeaORM fue diseñado desde el día cero para ser 100% asíncrono y amigable con los runtimes modernos de Rust.

Mientras que Diesel brilla por su verificación en tiempo de compilación extrema (a costa de tiempos de compilación largos y errores crípticos), SeaORM opta por un equilibrio pragmático: ofrece abstracciones seguras mediante macros y traits, pero delega parte de la flexibilidad a la construcción dinámica de consultas en tiempo de ejecución a través de su motor interno, `SeaQuery`.

### El modelo de datos: Entities, Models y ActiveModels

La arquitectura de SeaORM se aleja del monolítico `schema.rs` de Diesel y abraza un diseño más modular basado en el patrón *Data Mapper* mezclado con conceptos de *Active Record*. Cada tabla en tu base de datos se representa mediante un conjunto de componentes llamados colectivamente **Entity**:

1. **Model:** Un struct inmutable de Rust que representa una fila existente leída de la base de datos.
2. **ActiveModel:** Un struct mutable que rastrea qué campos han cambiado. Se utiliza exclusivamente para insertar (`INSERT`) o actualizar (`UPDATE`) registros.
3. **Entity:** Un struct unitario que actúa como la API principal para realizar operaciones CRUD sobre esa tabla específica.

Al igual que con Diesel, puedes escribir estas entidades a mano (Code-First) o generarlas a partir de una base de datos existente utilizando su CLI (`sea-orm-cli generate entity`).

Veamos cómo se define una entidad básica:

```rust
use sea_orm::entity::prelude::*;

// 1. El Model (Lectura)
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub username: String,
    pub email: String,
    pub active: bool,
}

// 2. Relaciones (Las veremos a fondo en la sección 21.4)
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

// 3. Comportamiento base
impl ActiveModelBehavior for ActiveModel {}
```

### Operaciones CRUD asíncronas

La ventaja de que SeaORM esté construido sobre SQLx es que hereda su excelente manejo de pools de conexiones y su rendimiento asíncrono. No necesitas preocuparte por `spawn_blocking` o hilos dedicados; todo el I/O es no bloqueante.

Aquí tienes un ejemplo de cómo interactuar con la entidad que acabamos de definir, asumiendo que tienes una conexión `DatabaseConnection` (`db`):

```rust
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use crate::entity::{users, users::Entity as User};

pub async fn seaorm_examples(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    
    // --- LECTURA (SELECT) ---
    // Buscar un usuario por ID
    let user: Option<users::Model> = User::find_by_id(1).one(db).await?;

    // Buscar múltiples usuarios con filtros
    let active_users: Vec<users::Model> = User::find()
        .filter(users::Column::Active.eq(true))
        .all(db)
        .await?;

    // --- ESCRITURA (INSERT) ---
    // Para insertar, usamos ActiveModel. 'Set' indica qué campos queremos mutar.
    // Los campos no definidos (como un ID autoincremental) usarán 'NotSet'.
    let new_user = users::ActiveModel {
        username: Set("rust_dev".to_owned()),
        email: Set("dev@example.com".to_owned()),
        active: Set(true),
        ..Default::default() // El ID queda como NotSet
    };

    let inserted_user: users::Model = new_user.insert(db).await?;

    Ok(())
}
```

### Diesel vs. SeaORM: ¿Cuál elegir?

Llegados a este punto en tu arquitectura, la elección entre Diesel y SeaORM suele dictar la experiencia de desarrollo de todo el equipo:

* **Elige SeaORM si:** Quieres un flujo de trabajo 100% asíncrono sin fricciones, necesitas construir consultas muy dinámicas (por ejemplo, filtros complejos basados en la entrada del usuario donde los campos varían), prefieres tiempos de compilación más rápidos y valoras una API orientada a objetos más tradicional (Modelos/Entidades).
* **Elige Diesel si:** Tu prioridad número uno es la corrección estricta. Si valoras que un error de tipo en tu SQL detenga la compilación de inmediato y estás dispuesto a lidiar con el paradigma de generación de esquemas restrictivo a cambio de un rendimiento ligeramente superior y seguridad absoluta.

## 21.3 Construcción dinámica de queries complejas

En el desarrollo de APIs en el mundo real, las consultas a la base de datos rara vez son estáticas. Piensa en un endpoint de búsqueda o en una tabla de panel de administración: el cliente puede enviar múltiples parámetros opcionales (filtros por nombre, estado, fechas, ordenamiento dinámico y paginación).

En lenguajes dinámicos o frameworks menos estrictos, esto a menudo se resuelve concatenando fragmentos de strings SQL. En Rust, sin embargo, nos enfrentamos a un reto fascinante: **¿Cómo construimos una consulta dinámicamente si el ORM exige conocer la estructura exacta en tiempo de compilación?**

Tanto Diesel como SeaORM abordan este problema, pero lo hacen con filosofías distintas basadas en su diseño subyacente.

### El reto de los tipos en Diesel y la solución: `into_boxed()`

En Diesel, cada vez que encadenas un método como `.filter()` o `.inner_join()`, estás creando un **nuevo tipo** en tiempo de compilación. Si intentas mutar una variable de consulta reasignándola dentro de un bloque `if`, el compilador de Rust protestará con un error de "mismatch types", porque una consulta filtrada no es del mismo tipo que una consulta sin filtrar.

Para solucionar esto y permitir la construcción dinámica, Diesel proporciona el método **`into_boxed()`**. Este método realiza un "borrado de tipos" (*type erasure*) guardando la consulta en el montículo (*heap*) a través de un `Box`. Esto unifica el tipo de retorno, permitiéndote aplicar filtros condicionalmente.

Aquí tienes un ejemplo de cómo implementar un buscador dinámico en Diesel:

```rust
use diesel::prelude::*;
use diesel_async::{RunQueryDsl, AsyncPgConnection};
use crate::schema::users::dsl::*;
use crate::models::User;

// Función asíncrona usando diesel-async
pub async fn search_users_diesel(
    conn: &mut AsyncPgConnection,
    search_name: Option<String>,
    is_active: Option<bool>,
) -> Result<Vec<User>, diesel::result::Error> {
    
    // 1. Iniciamos la consulta y la convertimos en "Boxed"
    let mut query = users.into_boxed();

    // 2. Aplicamos filtros dinámicamente según la entrada
    if let Some(name) = search_name {
        // Usamos ilike para una búsqueda case-insensitive
        query = query.filter(username.ilike(format!("%{}%", name)));
    }

    if let Some(active_status) = is_active {
        query = query.filter(active.eq(active_status));
    }

    // 3. Opcionalmente añadimos ordenamiento estático al final
    query = query.order(created_at.desc());

    // 4. Ejecutamos la consulta
    query.load_async::<User>(conn).await
}
```

> **Nota arquitectónica:** Usar `into_boxed()` tiene un costo de rendimiento mínimo debido a la asignación en el *heap* (Box), pero en el 99% de las aplicaciones web, este costo es absolutamente imperceptible frente a la latencia de la propia red o de la base de datos.

### Condicionales ergonómicos en SeaORM: El motor `SeaQuery`

SeaORM brilla especialmente en este apartado. Como fue diseñado para consumir directamente parámetros de APIs web y no está atado a la validación extrema de tipos de Diesel, ofrece una API mucho más fluida para construir condiciones dinámicas mediante su estructura `Condition`.

Puedes usar `Condition::all()` para agrupar filtros con `AND`, o `Condition::any()` para agruparlos con `OR`.

Veamos el mismo ejemplo de búsqueda, pero implementado con SeaORM:

```rust
use sea_orm::{entity::prelude::*, QueryFilter, QueryOrder, Condition};
use crate::entity::{users, users::Entity as User};

pub async fn search_users_seaorm(
    db: &DatabaseConnection,
    search_name: Option<String>,
    is_active: Option<bool>,
) -> Result<Vec<users::Model>, DbErr> {
    
    // 1. Inicializamos un contenedor de condiciones (AND lógico por defecto)
    let mut conditions = Condition::all();

    // 2. Agregamos filtros dinámicamente
    if let Some(name) = search_name {
        conditions = conditions.add(users::Column::Username.contains(&name));
    }

    if let Some(active_status) = is_active {
        conditions = conditions.add(users::Column::Active.eq(active_status));
    }

    // 3. Ejecutamos la consulta aplicando el bloque de condiciones completo
    User::find()
        .filter(conditions)
        .order_by_desc(users::Column::CreatedAt)
        .all(db)
        .await
}
```

### Patrón Recomendado: Criterios de Búsqueda Estructurados

Para aplicaciones a nivel Senior, es un anti-patrón pasar decenas de parámetros `Option<T>` a la firma de tus funciones de repositorio. Lo ideal es agruparlos en un struct de "Criterios" que pueda ser deserializado directamente desde la URL (query parameters) en tu framework web (como Axum o Actix).

```rust
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct UserSearchCriteria {
    pub name_contains: Option<String>,
    pub is_active: Option<bool>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}
```

Puedes pasar este struct completo a tus funciones `search_users`, encapsulando toda la lógica de paginación y filtrado dinámico en un solo lugar, manteniendo los controladores de tu API completamente limpios.

## 21.4 Relaciones Uno-a-Uno, Uno-a-Muchos y Muchos-a-Muchos

El verdadero poder de una base de datos relacional reside, como su nombre indica, en las relaciones. Sin embargo, mapear estas relaciones al estricto sistema de tipos de Rust presenta un desafío arquitectónico notable.

En lenguajes como Python (Django) o Java (Hibernate), es común el concepto de *Lazy Loading* (carga perezosa), donde acceder a `user.posts` dispara una consulta a la base de datos de forma transparente. **En Rust, el Lazy Loading implícito es prácticamente un antipatrón** (y en ecosistemas asíncronos, directamente imposible sin hacks severos) debido a las reglas de *Ownership* y a que las operaciones I/O requieren un `.await` explícito.

Por lo tanto, los ORMs en Rust adoptan un enfoque de **Eager Loading** (carga anticipada) explícito. Veamos cómo modelar e interactuar con estas relaciones, contrastando las filosofías de Diesel y SeaORM.

### 1. Relaciones Uno-a-Muchos (One-to-Many)

Esta es la relación más común (ej. un `User` tiene múltiples `Posts`).

**El enfoque de Diesel (`Associations`)**
Diesel maneja esto mediante el trait `Associations` y la macro `#[diesel(belongs_to(...))]`. La filosofía de Diesel es cargar los datos en vectores planos y luego agruparlos en memoria usando la función `grouped_by()`.

```rust
use diesel::prelude::*;
use crate::schema::{users, posts};

#[derive(Queryable, Identifiable, Selectable, Debug, PartialEq)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i32,
    pub username: String,
}

// La macro Associations requiere que definamos a quién pertenece este registro
#[derive(Queryable, Identifiable, Selectable, Associations, Debug, PartialEq)]
#[diesel(belongs_to(User))]
#[diesel(table_name = posts)]
pub struct Post {
    pub id: i32,
    pub user_id: i32,
    pub title: String,
}

// Ejemplo de uso (síncrono por simplicidad visual):
pub fn get_users_with_posts(conn: &mut PgConnection) -> QueryResult<Vec<(User, Vec<Post>)>> {
    // 1. Cargamos todos los usuarios
    let all_users = users::table.load::<User>(conn)?;
    
    // 2. Cargamos todos los posts que pertenecen a esos usuarios
    let all_posts = Post::belonging_to(&all_users).load::<Post>(conn)?;
    
    // 3. Agrupamos los posts por usuario en memoria (evita el problema N+1)
    let grouped_posts = all_posts.grouped_by(&all_users);
    
    // 4. Combinamos los resultados usando el iterador zip
    Ok(all_users.into_iter().zip(grouped_posts).collect())
}
```

**El enfoque de SeaORM (`Related`)**
SeaORM utiliza sus definiciones de relaciones en el enum `Relation` dentro de la entidad. Para recuperar datos relacionados, ofrece métodos ergonómicos como `find_with_related()`.

```rust
// Dentro de src/entity/users.rs
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub username: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::posts::Entity")]
    Posts,
}

impl Related<super::posts::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Posts.def()
    }
}

// Ejemplo de uso:
// Retorna un Vec< (Usuario, Vec<Posts>) >
let users_with_posts = User::find()
    .find_with_related(super::posts::Entity)
    .all(db)
    .await?;
```

### 2. Relaciones Uno-a-Uno (One-to-One)

Las relaciones Uno-a-Uno (ej. `User` y `Profile`) se configuran de manera casi idéntica a las Uno-a-Muchos. La diferencia semántica radica en la recuperación de los datos.

* **En Diesel:** Utilizas exactamente la misma macro `#[diesel(belongs_to(User))]`, pero al extraer los datos, asumes que habrá como máximo un elemento asociado por padre.
* **En SeaORM:** Cambias la macro en la definición de la relación de `has_many` a `has_one`. Al usar `find_also_related()`, SeaORM cambiará el tipo de retorno de `Vec<(Padre, Vec<Hijo>)>` a `Vec<(Padre, Option<Hijo>)>`, lo cual es semánticamente perfecto en Rust.

### 3. Relaciones Muchos-a-Muchos (Many-to-Many)

Las relaciones Muchos-a-Muchos requieren una tabla intermedia (Junction Table). Por ejemplo, `Users` y `Roles` unidos por una tabla `UserRoles`.

**En Diesel:**
Diesel no tiene soporte "mágico" para resolver tablas intermedias automáticamente en una sola llamada de agrupación. Debes hacer un `INNER JOIN` explícito a través de las tres tablas o cargar la tabla intermedia y luego cargar los datos finales. Esto fuerza al desarrollador a ser muy consciente de la carga computacional y la memoria utilizada.

**En SeaORM (`Linked` Trait):**
SeaORM abstrae este patrón maravillosamente a través del trait `Linked`. Defines cómo saltar de la Entidad A, a través de la Entidad Intermedia, hacia la Entidad B.

```rust
// Definiendo el enlace en SeaORM
use sea_orm::entity::prelude::*;

pub struct UserToRole;

impl Linked for UserToRole {
    type FromEntity = super::users::Entity;
    type ToEntity = super::roles::Entity;

    fn link(&self) -> Vec<RelationDef> {
        vec![
            // 1er salto: De User a la tabla intermedia UserRole
            super::user_role::Relation::User.def().rev(),
            // 2do salto: De la tabla intermedia UserRole a Role
            super::user_role::Relation::Role.def(),
        ]
    }
}

// Uso:
// SeaORM se encarga de construir el JOIN complejo por ti
let users_with_roles = User::find()
    .find_also_linked(UserToRole)
    .all(db)
    .await?;
```

### El problema N+1 y la postura de Rust

Tanto Diesel como SeaORM (e incluso si usas consultas planas con SQLx) te empujan a evitar el "Problema N+1" (hacer 1 consulta para obtener 100 usuarios, y luego 100 consultas para obtener los posts de cada uno).

Al obligarte a pensar en términos de carga anticipada (Eager Loading) mediante `.belonging_to()` en Diesel o `.find_with_related()` en SeaORM, el código en Rust compila sabiendo exactamente qué datos van a viajar a través de la red, garantizando un rendimiento backend óptimo y predecible desde el diseño.
