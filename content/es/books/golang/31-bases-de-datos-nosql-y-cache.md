En el desarrollo de sistemas de alto rendimiento, la base de datos relacional no siempre es la solución óptima. Este capítulo explora cómo trascender el modelo SQL para alcanzar niveles superiores de escalabilidad y baja latencia. Analizaremos la integración avanzada con **Redis** para implementar estrategias de caching distribuido que protejan nuestros servicios de la saturación. También abordaremos el modelo documental de **MongoDB**, ideal para esquemas flexibles y grandes volúmenes de datos. Finalmente, descubriremos el potencial de motores embebidos como **bbolt** y **BadgerDB**, que permiten persistencia local de ultra baja latencia sin dependencias externas.

## 31.1. Integración con Redis (go-redis) y estrategias de caching distribuido

A medida que nuestras aplicaciones escalan, depender exclusivamente de bases de datos relacionales para consultas de lectura intensiva se convierte rápidamente en un cuello de botella. Redis, operando como un almacén de estructuras de datos en memoria, es la herramienta por excelencia en el ecosistema Go para mitigar esta carga mediante el caching distribuido, gestión de sesiones y control de colas efímeras.

En Go, el estándar de facto para interactuar con Redis es la librería `go-redis` (específicamente la versión `v9`, que está fuertemente acoplada al paquete `context` nativo). A diferencia de clientes más antiguos, `go-redis` maneja automáticamente su propio *Connection Pool* de forma concurrente y segura (thread-safe), por lo que instanciarás un único cliente para toda la vida de tu aplicación.

### Configuración e inicialización del Cliente

Para comenzar, debemos importar el paquete `github.com/redis/go-redis/v9`. La conexión básica es directa, pero en un entorno de producción, es crucial configurar los tiempos de espera y el tamaño del pool para evitar la saturación de descriptores de archivos.

```go
package cache

import (
 "context"
 "time"

 "github.com/redis/go-redis/v9"
)

// NewRedisClient inicializa una conexión a Redis lista para producción.
func NewRedisClient(addr, password string) *redis.Client {
 client := redis.NewClient(&redis.Options{
  Addr:         addr,
  Password:     password,
  DB:           0, // Base de datos por defecto
  PoolSize:     100, // Número máximo de conexiones en el pool
  MinIdleConns: 10,  // Conexiones mínimas abiertas para evitar latencia inicial
  ReadTimeout:  3 * time.Second,
  WriteTimeout: 3 * time.Second,
 })

 return client
}
```

> **Nota arquitectónica:** Como vimos en el Capítulo 13, toda llamada de red debe estar gobernada por un `context.Context`. `go-redis/v9` exige que el primer parámetro de cada operación sea un contexto, permitiéndonos propagar cancelaciones o timeouts desde la petición HTTP original (Capítulo 24) directamente hasta la capa de caché.

### Patrón Cache-Aside (Lazy Loading)

Existen múltiples estrategias de caching, pero la más utilizada y segura en arquitecturas de microservicios es el **Cache-Aside**. La lógica es imperativa y recae en la aplicación (Go), no en la base de datos:

1. **Lectura:** La aplicación intenta leer los datos de Redis.
2. **Acierto (Hit):** Si el dato existe, se retorna inmediatamente.
3. **Fallo (Miss):** Si no existe, la aplicación consulta la base de datos primaria (ej. PostgreSQL).
4. **Escritura:** La aplicación guarda el resultado en Redis con un Tiempo de Vida (TTL) y lo retorna al cliente.

El siguiente ejemplo demuestra este patrón, asumiendo la serialización en JSON (Capítulo 15):

```go
import (
 "context"
 "encoding/json"
 "errors"
 "time"
 "github.com/redis/go-redis/v9"
)

type User struct {
 ID   int    `json:"id"`
 Name string `json:"name"`
}

// GetUser implementa el patrón Cache-Aside
func GetUser(ctx context.Context, rdb *redis.Client, db *sql.DB, userID string) (*User, error) {
 cacheKey := "user:" + userID

 // 1. Intentar obtener de Redis
 val, err := rdb.Get(ctx, cacheKey).Result()
 if err == nil {
  var user User
  if err := json.Unmarshal([]byte(val), &user); err != nil {
   return nil, err
  }
  return &user, nil // Cache Hit
 }

 // Si el error no es "redis.Nil" (clave no encontrada), hay un problema real
 if !errors.Is(err, redis.Nil) {
  return nil, err
 }

 // 2. Cache Miss: Consultar base de datos primaria
 // (Imaginemos que fetchUserFromDB hace la consulta con database/sql)
 user, err := fetchUserFromDB(ctx, db, userID)
 if err != nil {
  return nil, err
 }

 // 3. Escribir en caché para futuras peticiones
 userData, _ := json.Marshal(user)
 // Guardamos con un TTL de 10 minutos para evitar datos rancios (Stale Data)
 _ = rdb.Set(ctx, cacheKey, userData, 10*time.Minute).Err()

 return user, nil
}
```

### Previniendo la "Estampida de Caché" (Cache Stampede)

En sistemas de alto tráfico, el patrón Cache-Aside puro presenta una vulnerabilidad letal conocida como *Cache Stampede* o *Thundering Herd*.

**El problema:** Imagina que un dato extremadamente solicitado (por ejemplo, la configuración global del sistema o los datos de un producto en Black Friday) expira en Redis. En el milisegundo en que la clave desaparece, 1,000 goroutines que procesan peticiones HTTP intentan hacer `rdb.Get`. Todas reciben `redis.Nil` (Cache Miss). Como consecuencia, las 1,000 goroutines dispararán consultas idénticas a la base de datos SQL simultáneamente, colapsándola al instante.

**La solución idiomática en Go:** El paquete `golang.org/x/sync/singleflight`.

Como sugiere su nombre, `singleflight` agrupa llamadas concurrentes idénticas en vuelo para que solo una goroutine ejecute la operación pesada (la consulta a la base de datos y la escritura en Redis), mientras las demás esperan y comparten el resultado.

```go
import (
 "context"
 "golang.org/x/sync/singleflight"
 // ... otras importaciones
)

// Compartido a nivel de paquete o inyectado en la estructura del servicio
var requestGroup singleflight.Group

func GetUserResilient(ctx context.Context, rdb *redis.Client, db *sql.DB, userID string) (*User, error) {
 cacheKey := "user:" + userID

 // Intento rápido de lectura en caché
 val, err := rdb.Get(ctx, cacheKey).Result()
 if err == nil {
  var user User
  json.Unmarshal([]byte(val), &user)
  return &user, nil
 } else if !errors.Is(err, redis.Nil) {
  return nil, err
 }

 // Usamos singleflight para colapsar múltiples peticiones concurrentes a la DB
 // "cacheKey" actúa como el identificador único de la operación en vuelo.
 v, err, _ := requestGroup.Do(cacheKey, func() (interface{}, error) {
  // Esta función anónima SÓLO será ejecutada por la primera goroutine que llegue.
  user, dbErr := fetchUserFromDB(ctx, db, userID)
  if dbErr != nil {
   return nil, dbErr
  }

  userData, _ := json.Marshal(user)
  _ = rdb.Set(ctx, cacheKey, userData, 10*time.Minute).Err()

  return user, nil
 })

 if err != nil {
  return nil, err
 }

 // "v" es el resultado de la función anónima, compartido con todas las goroutines bloqueadas
 return v.(*User), nil
}
```

Esta combinación de `go-redis` para la capa de acceso a datos de latencia ultra baja y `singleflight` para gobernar el comportamiento concurrente durante los fallos de caché representa la arquitectura base para sistemas distribuidos altamente resilientes en Go.

## 31.2. Modelado de documentos y conexión con MongoDB (mongo-go-driver)

Mientras que Redis brilla en el almacenamiento efímero y estructurado en clave-valor, MongoDB se posiciona como el estándar para persistencia NoSQL orientada a documentos. Su naturaleza flexible (schemaless) encaja de manera peculiar con el sistema de tipos estricto de Go. Para tender un puente entre ambos mundos, utilizamos el driver oficial: `go.mongodb.org/mongo-driver/mongo`.

A diferencia de los ORMs tradicionales del mundo SQL (como vimos en el Capítulo 29), el driver de MongoDB interactúa de forma mucho más directa con las estructuras de Go mediante la serialización a BSON (Binary JSON).

### Gestión de la Conexión y el Cliente

Al igual que con `database/sql` y `go-redis`, el cliente de MongoDB (`*mongo.Client`) está diseñado para ser seguro para el uso concurrente y gestiona internamente su propio *Connection Pool*. Debes inicializarlo una sola vez durante el arranque de la aplicación.

El proceso de conexión requiere dos pasos críticos: la instanciación del cliente y la verificación de la topología del clúster mediante un `Ping`.

```go
package database

import (
 "context"
 "time"

 "go.mongodb.org/mongo-driver/mongo"
 "go.mongodb.org/mongo-driver/mongo/options"
 "go.mongodb.org/mongo-driver/mongo/readpref"
)

// NewMongoClient establece y verifica la conexión con el clúster de MongoDB.
func NewMongoClient(ctx context.Context, uri string) (*mongo.Client, error) {
 // Configuramos las opciones, incluyendo el Connection Pool
 clientOptions := options.Client().
  ApplyURI(uri).
  SetMaxPoolSize(50).
  SetMinPoolSize(10)

 // mongo.Connect inicializa el cliente, pero no bloquea ni verifica la red
 client, err := mongo.Connect(ctx, clientOptions)
 if err != nil {
  return nil, err
 }

 // Usamos un timeout estricto para la verificación inicial
 pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
 defer cancel()

 // Ping fuerza la verificación real contra el servidor primario
 if err := client.Ping(pingCtx, readpref.Primary()); err != nil {
  return nil, err
 }

 return client, nil
}
```

### Modelado de Documentos: Structs y BSON

El motor interno de MongoDB no habla JSON, sino BSON. El driver de Go utiliza reflection (Capítulo 14) para mapear nuestros *Structs* a documentos BSON utilizando etiquetas de estructura (`bson:"..."`), de manera casi idéntica a como funciona el paquete `encoding/json`.

El identificador principal en MongoDB (`_id`) suele ser un `ObjectId`, un tipo de dato nativo de 12 bytes. En Go, lo representamos usando `primitive.ObjectID`.

```go
package domain

import (
 "time"
 "go.mongodb.org/mongo-driver/bson/primitive"
)

// Product representa nuestro modelo de dominio mapeado a BSON
type Product struct {
 // omitempty es crucial: si el ID es nulo al insertar, Mongo generará uno automáticamente.
 ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
 Name        string             `bson:"name" json:"name"`
 Price       float64            `bson:"price" json:"price"`
 Tags        []string           `bson:"tags,omitempty" json:"tags,omitempty"`
 CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}
```

> **Nota de diseño:** Es una práctica común en Arquitectura Limpia (Capítulo 21) mantener las etiquetas `bson` y `json` en el mismo struct si el modelo de dominio es idéntico a la representación de la API y de persistencia, aunque los puristas prefieren separar el DTO del modelo de base de datos.

### Operaciones CRUD y el ecosistema bson (D, M, A)

El driver expone varios tipos para construir filtros y actualizaciones dinámicas sin sacrificar el tipado estático:

* `bson.D` (Document): Un slice ordenado de pares clave-valor. Ideal para comandos y ordenamiento, donde el orden exacto de las claves es obligatorio para MongoDB.
* `bson.M` (Map): Un mapa desordenado (`map[string]interface{}`). Es más corto de escribir y perfecto para filtros simples (`find` o `update`).
* `bson.A` (Array): Para definir arreglos, comúnmente usado con operadores como `$in` o `$or`.

Veamos cómo se integran estos tipos en un repositorio práctico que inserta y busca un documento, controlando los errores específicos del driver:

```go
package repository

import (
 "context"
 "errors"
 "time"

 "go.mongodb.org/mongo-driver/bson"
 "go.mongodb.org/mongo-driver/bson/primitive"
 "go.mongodb.org/mongo-driver/mongo"
 "mi-proyecto/domain"
)

type ProductRepository struct {
 collection *mongo.Collection
}

func NewProductRepository(db *mongo.Database) *ProductRepository {
 return &ProductRepository{
  collection: db.Collection("products"),
 }
}

// Create inserta un nuevo producto y devuelve el ID generado
func (r *ProductRepository) Create(ctx context.Context, p *domain.Product) (primitive.ObjectID, error) {
 p.CreatedAt = time.Now().UTC()

 result, err := r.collection.InsertOne(ctx, p)
 if err != nil {
  return primitive.NilObjectID, err
 }

 // El InsertedID se devuelve como un interface{}, requerimos Type Assertion
 oid, ok := result.InsertedID.(primitive.ObjectID)
 if !ok {
  return primitive.NilObjectID, errors.New("error al castear InsertedID a ObjectID")
 }

 return oid, nil
}

// FindByID recupera un producto. Retorna error si no existe.
func (r *ProductRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
 // Usamos bson.M para un filtro simple y rápido
 filter := bson.M{"_id": id}

 var product domain.Product
 err := r.collection.FindOne(ctx, filter).Decode(&product)
 
 if err != nil {
  // Control de error idiomático: diferenciamos "no encontrado" de errores de red/DB
  if errors.Is(err, mongo.ErrNoDocuments) {
   return nil, errors.New("producto no encontrado")
  }
  return nil, err
 }

 return &product, nil
}
```

Esta separación entre el modelo (`Product`), la colección (representada en el `mongo.Database`) y el control fino del contexto garantiza que nuestras integraciones NoSQL mantengan los mismos estándares de robustez que exigiríamos a una base de datos relacional tradicional en Go.

## 31.3. Uso de bases de datos clave-valor embebidas en Go (bbolt, BadgerDB)

En arquitecturas donde la latencia de red es inaceptable, o cuando desarrollamos herramientas CLI, agentes locales y aplicaciones de escritorio (single-binary), depender de un servidor externo como Redis o PostgreSQL rompe la promesa de portabilidad de Go. Aquí es donde brillan las bases de datos embebidas (embedded databases).

Estas bases de datos se compilan directamente dentro de tu binario de Go y almacenan sus datos en el sistema de archivos local. Al interactuar directamente mediante llamadas al sistema operativo (evitando el stack TCP/IP), ofrecen latencias de microsegundos. En el ecosistema Go, dos motores dominan este espacio, cada uno con una arquitectura de almacenamiento radicalmente distinta: **bbolt** y **BadgerDB**.

### bbolt: Estabilidad transaccional y árboles B+

Originalmente conocido como BoltDB (creado por Ben Johnson) y ahora mantenido por el equipo de etcd (`go.etcd.io/bbolt`), bbolt es un motor puramente escrito en Go que implementa un árbol B+ (B+Tree).

Su diseño prioriza la lectura y la consistencia absoluta. Mapea el archivo de base de datos directamente a memoria usando `mmap`, lo que significa que las lecturas son increíblemente rápidas y el sistema operativo se encarga del caché de páginas. bbolt soporta transacciones ACID completas con una regla estricta: permite múltiples transacciones de lectura simultáneas, pero **solo una transacción de escritura a la vez**.

Los datos en bbolt se organizan en **Buckets**, que actúan como espacios de nombres (similares a las tablas en SQL).

```go
package embedded

import (
 "fmt"
 "log"

 "go.etcd.io/bbolt"
)

func BboltExample() {
 // Abrimos la base de datos (se crea el archivo si no existe)
 db, err := bbolt.Open("app_data.db", 0600, nil)
 if err != nil {
  log.Fatal(err)
 }
 defer db.Close()

 // Transacción de lectura-escritura (bloquea otras escrituras)
 err = db.Update(func(tx *bbolt.Tx) error {
  // Creamos o recuperamos un Bucket
  b, err := tx.CreateBucketIfNotExists([]byte("Usuarios"))
  if err != nil {
   return fmt.Errorf("error al crear bucket: %v", err)
  }

  // Insertamos un par clave-valor (ambos deben ser []byte)
  if err := b.Put([]byte("user:123"), []byte(`{"nombre": "Gopher"}`)); err != nil {
   return err
  }
  return nil
 })

 // Transacción de solo lectura (concurrente, sin bloqueos)
 db.View(func(tx *bbolt.Tx) error {
  b := tx.Bucket([]byte("Usuarios"))
  if b == nil {
   return fmt.Errorf("bucket no encontrado")
  }

  v := b.Get([]byte("user:123"))
  fmt.Printf("Valor recuperado de bbolt: %s\n", v)
  return nil
 })
}
```

> **Casos de uso ideales:** Configuración local, caché de agentes de monitoreo, o el almacenamiento interno de herramientas como Consul y etcd (que lo usan bajo el capó).

### BadgerDB: Rendimiento extremo y árboles LSM

Mientras bbolt sufre cuando hay escrituras masivas o el tamaño de la base de datos supera la memoria RAM disponible, **BadgerDB** (`github.com/dgraph-io/badger/v4`) fue diseñado específicamente para resolver esto.

Creado por Dgraph Labs, Badger utiliza una arquitectura basada en árboles LSM (Log-Structured Merge-tree) inspirada en el paper *WiscKey*. A diferencia de un árbol B+, las escrituras en Badger son secuenciales (anexando a un log), lo que lo hace ridículamente rápido para operaciones de escritura masiva. Para lograr esto, Badger separa las claves (que se mantienen en memoria organizadas en el LSM) de los valores (que se escriben en un log circular en disco). Además, hace un uso intensivo de Goroutines en segundo plano para compactar los datos (Garbage Collection).

A diferencia de bbolt, Badger no tiene el concepto de "Buckets". Todo es un espacio plano, por lo que la agrupación se logra mediante prefijos en las claves.

```go
package embedded

import (
 "fmt"
 "log"

 "github.com/dgraph-io/badger/v4"
)

func BadgerExample() {
 // Configuramos Badger. Usamos opciones por defecto orientadas a disco.
 opts := badger.DefaultOptions("./badger_data")
 
 // Si quisiéramos usar Badger solo en memoria RAM (modo efímero):
 // opts = badger.DefaultOptions("").WithInMemory(true)

 db, err := badger.Open(opts)
 if err != nil {
  log.Fatal(err)
 }
 defer db.Close()

 // Transacción de escritura
 err = db.Update(func(txn *badger.Txn) error {
  // En Badger, usamos prefijos para simular "tablas" o "colecciones"
  err := txn.Set([]byte("user:123"), []byte(`{"nombre": "Gopher Veloz"}`))
  return err
 })

 // Transacción de lectura
 db.View(func(txn *badger.Txn) error {
  item, err := txn.Get([]byte("user:123"))
  if err != nil {
   return err
  }

  // Badger requiere que consumamos el valor dentro del closure del Item
  // para evitar copias innecesarias de memoria (Zero-copy).
  err = item.Value(func(val []byte) error {
   fmt.Printf("Valor recuperado de Badger: %s\n", val)
   return nil
  })
  return err
 })
}
```

### Tabla de decisión: ¿Cuál elegir?

| Característica | bbolt (`go.etcd.io/bbolt`) | BadgerDB (`github.com/dgraph-io/badger`) |
| :--- | :--- | :--- |
| **Estructura subyacente** | Árbol B+ (B+Tree) | Árbol LSM (Log-Structured Merge) |
| **Patrón óptimo** | 99% Lecturas, 1% Escrituras | Alta concurrencia, Escrituras masivas |
| **Consumo de Memoria** | Muy bajo (delegado al OS vía `mmap`) | Alto (requiere RAM para MemTables y Bloom Filters) |
| **Tamaño de la base de datos** | Funciona mejor si cabe entera en RAM | Supera con creces el límite de la RAM |
| **Gestión de espacio** | Archivo único que crece (fragmentación) | Múltiples archivos, requiere GC manual/programado |

Ambas opciones son excelentes ejemplos de ingeniería en Go, aprovechando al máximo el control de memoria (`unsafe` en el caso de bbolt para el `mmap`) y la concurrencia nativa (las rutinas de compactación en Badger).
