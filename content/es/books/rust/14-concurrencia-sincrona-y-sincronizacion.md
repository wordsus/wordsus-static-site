Dominar la concurrencia es el paso definitivo hacia el nivel senior en Rust. En este capítulo, exploramos cómo el lenguaje materializa su promesa de "concurrencia sin miedo". Aprenderás a orquestar hilos del sistema operativo con `std::thread`, garantizando la seguridad de memoria mediante el sistema de ownership. Analizaremos el estado compartido mediante `Arc`, `Mutex` y `RwLock`, y el elegante paso de mensajes con canales `mpsc`. Finalmente, profundizaremos en el rendimiento extremo con variables atómicas y ordenamiento de memoria. Aquí, el compilador deja de ser un obstáculo para convertirse en tu mejor aliado, eliminando las carreras de datos antes de que lleguen a producción.

## 14.1 Creación de hilos del sistema operativo (`std::thread`)

En el desarrollo backend, aprovechar al máximo los recursos de hardware multicore es imperativo. Rust aborda la concurrencia con una filosofía clara: **concurrencia sin miedo** (*fearless concurrency*). El sistema de tipos y el *borrow checker* que estudiamos en la Parte I se aseguran en tiempo de compilación de que tu código concurrente esté libre de *data races* (carreras de datos).

La biblioteca estándar de Rust ofrece un modelo de hilos **1:1**. Esto significa que un hilo creado en Rust se mapea directamente a un hilo nativo del sistema operativo.

> **Nota arquitectónica:** A diferencia de lenguajes como Go (con sus *goroutines*) o Erlang, Rust no incluye un runtime pesado para manejar "hilos verdes" (green threads) en su biblioteca estándar. Esto mantiene a Rust sin sobrecarga (zero-cost abstractions), delegando la planificación (scheduling) directamente al sistema operativo.

### Creación básica y el `JoinHandle`

Para crear un nuevo hilo, utilizamos la función `thread::spawn`. Esta función toma como argumento un closure (revisado en el Capítulo 9) que contiene el código que el nuevo hilo ejecutará de forma independiente.

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("Mensaje {} desde el hilo secundario", i);
            thread::sleep(Duration::from_millis(10));
        }
    });

    for i in 1..=3 {
        println!("Mensaje {} desde el hilo principal", i);
        thread::sleep(Duration::from_millis(10));
    }

    // Esperamos a que el hilo secundario termine
    handle.join().unwrap();
}
```

En este ejemplo, ocurren dos cosas fundamentales:

1. **Ejecución paralela:** El hilo principal y el hilo secundario se ejecutan al mismo tiempo. Si no forzamos al hilo principal a esperar, el programa terminaría y el hilo secundario se destruiría abruptamente, sin importar si terminó su trabajo o no.
2. **El método `join`:** `thread::spawn` devuelve un `JoinHandle`. Al llamar a `.join()` sobre este manejador, bloqueamos el hilo actual (en este caso, el principal) hasta que el hilo representado por el `JoinHandle` haya terminado de ejecutarse.

### Closures `move`, Ownership y el límite `'static`

Dado que ya dominas las reglas de Ownership (Capítulo 4) y los Lifetimes (Capítulo 8), la creación de hilos en Rust te presentará un desafío familiar. Observa este escenario intuitivo pero inválido:

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];

    // ESTO NO COMPILARÁ
    thread::spawn(|| {
        println!("Los datos son: {:?}", data);
    });
}
```

El compilador rechazará este código con un error relacionado con el lifetime. La firma de `thread::spawn` exige que el closure tenga un lifetime `'static`. ¿Por qué? Porque el sistema operativo podría ejecutar el hilo *después* de que la función `main` haya retornado y destruido el vector `data`. El hilo tendría una referencia colgante (*dangling reference*).

Para solucionarlo, debemos transferir el ownership de las variables capturadas al closure utilizando la palabra clave `move`:

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];

    // Ahora el hilo es dueño de `data`
    let handle = thread::spawn(move || {
        println!("Los datos son: {:?}", data);
    });

    handle.join().unwrap();
    // println!("{:?}", data); // Error: `data` ya fue movido
}
```

Al usar `move`, garantizamos que el hilo es el propietario absoluto de la memoria que necesita, desvinculando su ciclo de vida del ámbito donde fue creado. (En la sección 14.2 veremos cómo compartir estado entre hilos sin moverlo exclusivamente a uno solo usando `Arc` y `Mutex`).

### Retornando valores desde un hilo y manejo de Pánicos

Un hilo en Rust no solo ejecuta código, sino que puede devolver valores. El valor de retorno del closure pasado a `thread::spawn` será capturado por el `JoinHandle`.

Además, el método `.join()` devuelve un `Result` (Capítulo 5). Esto es crucial porque los hilos en Rust están aislados a nivel de pánico. Si un hilo secundario hace `panic!`, no derribará inmediatamente al hilo principal (a menos que configures `panic = "abort"` en tu `Cargo.toml`). El pánico es capturado y devuelto como el error (`Err`) del `Result` de `.join()`.

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        let mut suma = 0;
        for i in 1..=100 {
            suma += i;
        }
        // Retornamos el valor implícitamente
        suma
    });

    // join() devuelve Result<T, Any>, donde T es el tipo retornado por el closure (i32)
    match handle.join() {
        Ok(resultado) => println!("El hilo calculó: {}", resultado),
        Err(e) => println!("El hilo entró en pánico: {:?}", e),
    }
}
```

### Configuración avanzada: `thread::Builder`

Para aplicaciones backend de nivel producción, usar `thread::spawn` a veces es insuficiente porque crea hilos anónimos con configuraciones por defecto. Cuando estás depurando un sistema complejo o analizando logs, tener hilos sin nombre es una pesadilla.

La biblioteca estándar proporciona `thread::Builder`, que te permite nombrar tus hilos y configurar el tamaño de su pila (stack size), algo muy útil si tu hilo realizará llamadas recursivas profundas.

```rust
use std::thread;

fn main() {
    let builder = thread::Builder::new()
        .name("worker-procesamiento-pagos".to_string())
        .stack_size(32 * 1024); // 32 KB de stack

    let handle = builder.spawn(|| {
        // En logs o panic traces, este hilo aparecerá como "worker-procesamiento-pagos"
        let hilo_actual = thread::current();
        println!("Ejecutando desde el hilo: {}", hilo_actual.name().unwrap_or("desconocido"));
    }).expect("Fallo al crear el hilo del sistema operativo");

    handle.join().unwrap();
}
```

Usar `Builder` es una práctica recomendada en el desarrollo de demonios o workers en background, ya que facilita enormemente la observabilidad (un tema que profundizaremos en la Parte IX).

## 14.2 Estado compartido: `Mutex` y `RwLock`

En la sección anterior vimos cómo transferir la propiedad de los datos a un hilo usando closures `move`. Sin embargo, en arquitecturas backend reales (como al mantener un pool de conexiones, una caché en memoria o contadores de métricas), a menudo necesitamos que múltiples hilos accedan y modifiquen *la misma* estructura de datos simultáneamente.

En muchos lenguajes, el estado mutable compartido es la principal fuente de *data races* y bugs en producción. Rust permite el estado mutable compartido, pero su sistema de tipos te obliga a sincronizar el acceso correctamente. Si no lo haces, el código simplemente no compilará.

### `Mutex<T>`: Exclusión Mutua y el patrón RAII

Un `Mutex` (Mutual Exclusion) garantiza que solo un hilo pueda acceder a los datos internos a la vez. Para leer o modificar los datos, un hilo debe primero adquirir el *lock* (bloqueo).

En Rust, `Mutex<T>` es un *smart pointer*. Al llamar al método `.lock()`, bloqueas el hilo actual hasta obtener acceso. Lo que devuelve este método (si tiene éxito) es un `MutexGuard`, el cual te permite acceder a los datos internos a través de la desreferenciación (`*`).

La genialidad del diseño de Rust radica en que **no existe un método `.unlock()`**. El `MutexGuard` utiliza el patrón RAII (Resource Acquisition Is Initialization). Cuando el `MutexGuard` sale de su ámbito (*scope*), el trait `Drop` se ejecuta automáticamente y libera el lock. Es imposible olvidar desbloquear un Mutex en Rust.

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        // Adquirimos el lock. unwrap() maneja posibles pánicos (explicado más abajo)
        let mut num = m.lock().unwrap();
        *num = 10; // Modificamos el valor interno
        // Al final de este bloque, `num` sale de scope y el lock se libera automáticamente.
    }

    println!("m = {:?}", m);
}
```

### Compartiendo el Mutex entre hilos: `Arc<T>`

Si intentas pasar un `Mutex` a múltiples hilos usando un bucle, te enfrentarás a un error de *Ownership*. No puedes mover el mismo Mutex a varios hilos.

Para compartir la propiedad del Mutex, necesitamos usar un contador de referencias. Aunque conocimos `Rc<T>` para este propósito en capítulos anteriores, `Rc<T>` **no es seguro para hilos** (no implementa el trait `Send`). La solución es `Arc<T>` (*Atomic Reference Counted*).

Veamos el patrón clásico del backend en Rust: `Arc<Mutex<T>>`.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Creamos un contador envuelto en un Mutex, y este a su vez en un Arc
    let contador = Arc::new(Mutex::new(0));
    let mut manejadores = vec![];

    for _ in 0..10 {
        // Clonamos el Arc para aumentar el conteo de referencias, no los datos
        let contador_clonado = Arc::clone(&contador);
        
        let manejador = thread::spawn(move || {
            // Cada hilo adquiere el lock de forma segura
            let mut num = contador_clonado.lock().unwrap();
            *num += 1;
        });
        
        manejadores.push(manejador);
    }

    for manejador in manejadores {
        manejador.join().unwrap();
    }

    // Extraemos el valor final. El Mutex garantiza que sea exactamente 10.
    println!("Resultado: {}", *contador.lock().unwrap());
}
```

> **Nota sobre *Poisoning* (Envenenamiento):** ¿Por qué llamamos `.unwrap()` después de `.lock()`? Si un hilo entra en pánico (*panic!*) mientras mantiene el lock del Mutex, el Mutex queda "envenenado" (poisoned). Rust asume que los datos dentro del Mutex podrían haber quedado en un estado inconsistente. Llamar a `lock()` en un Mutex envenenado devuelve un `Err`, y usar `unwrap()` propagará el pánico, protegiendo a otros hilos de usar datos corruptos.

### Optimizando lecturas concurrentes con `RwLock<T>`

Un `Mutex` es estricto: bloquea a *todos* los demás hilos, sin importar si solo quieren leer los datos sin modificarlos. En escenarios backend como una caché de configuración (donde las lecturas ocurren miles de veces por segundo, pero las actualizaciones son raras), un `Mutex` crearía un cuello de botella severo (*lock contention*).

Para estos casos, la biblioteca estándar ofrece `std::sync::RwLock<T>` (Read-Write Lock). Sus reglas son idénticas a las del *Borrow Checker* pero aplicadas en tiempo de ejecución:

1. Puedes tener **múltiples lectores simultáneos** (`.read()`).
2. **O** puedes tener **un único escritor** (`.write()`).

```rust
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;

fn main() {
    // Simulamos una configuración global compartida
    let config = Arc::new(RwLock::new(String::from("v1.0")));
    let mut manejadores = vec![];

    // Lanzamos 3 hilos lectores
    for id in 1..=3 {
        let config_clonada = Arc::clone(&config);
        manejadores.push(thread::spawn(move || {
            // Múltiples hilos pueden adquirir el lock de lectura al mismo tiempo
            let version = config_clonada.read().unwrap();
            println!("Lector {} ve la versión: {}", id, *version);
        }));
    }

    // Lanzamos 1 hilo escritor
    let config_escritor = Arc::clone(&config);
    manejadores.push(thread::spawn(move || {
        thread::sleep(Duration::from_millis(50));
        // Para escribir, este hilo debe esperar a que no haya ningún lector activo
        let mut version = config_escritor.write().unwrap();
        *version = String::from("v2.0");
        println!("Escritor actualizó la configuración a v2.0");
    }));

    for m in manejadores {
        m.join().unwrap();
    }
}
```

### La advertencia sobre los Deadlocks

Es crucial entender que **el sistema de tipos de Rust no previene los *deadlocks* (bloqueos mutuos)**. Si el Hilo A bloquea el `Mutex X` y espera por el `Mutex Y`, y el Hilo B bloquea el `Mutex Y` y espera por el `Mutex X`, tu programa se quedará congelado para siempre.

En el desarrollo de APIs, para evitar deadlocks, la regla de oro es mantener el alcance (scope) del lock lo más pequeño posible. Evita realizar operaciones de entrada/salida (I/O), peticiones de red o cálculos pesados mientras sostienes un `MutexGuard`. Haz el cálculo, adquiere el lock, actualiza el estado rápidamente y libera el lock.

> **Avance hacia Tokio:** En la Parte VIII (Capítulo 32), veremos que retener un `std::sync::Mutex` a través de un punto `.await` en código asíncrono es un antipatrón que puede bloquear todo el *runtime*. En esos escenarios, utilizaremos las versiones asíncronas provistas por `tokio::sync`.

## 14.3 Paso de mensajes con canales (`std::sync::mpsc`)

En la sección anterior exploramos cómo compartir estado de forma segura utilizando `Mutex` y `RwLock`. Sin embargo, compartir memoria suele introducir cuellos de botella por la contención de los bloqueos (*lock contention*) y aumenta el riesgo de *deadlocks* a medida que la arquitectura crece.

Existe una filosofía alternativa muy popularizada por lenguajes como Go, pero que encaja a la perfección con la semántica de Rust: *"No te comuniques compartiendo memoria; comparte memoria comunicándote"*.

En Rust, esta filosofía se implementa mediante **canales** (channels). Un canal es una estructura de datos unidireccional que permite a un hilo enviar mensajes a otro. La biblioteca estándar provee el módulo `std::sync::mpsc`, que significa **M**ultiple **P**roducer, **S**ingle **C**onsumer (Múltiples Productores, Único Consumidor).

### Anatomía de un Canal: `Sender` y `Receiver`

Un canal se crea utilizando la función `mpsc::channel()`, la cual devuelve una tupla con dos mitades: el transmisor (`Sender`) y el receptor (`Receiver`). Por convención, solemos llamarlos `tx` y `rx`.

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    // Creamos el canal. Rust inferirá el tipo del mensaje (en este caso, String)
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let mensaje = String::from("Sistema inicializado");
        // tx.send() devuelve un Result. Fallará si el receptor (rx) ya fue destruido.
        tx.send(mensaje).unwrap();
        
        // println!("Mensaje enviado: {}", mensaje); // ¡ERROR DE COMPILACIÓN!
    });

    // rx.recv() bloquea el hilo principal hasta que llegue un mensaje.
    let recibido = rx.recv().unwrap();
    println!("El hilo principal recibió: {}", recibido);
}
```

**La magia del Ownership en los canales:** Observa la línea comentada en el código anterior. Cuando llamas a `tx.send(mensaje)`, el transmisor toma posesión (*ownership*) de la variable `mensaje` y la mueve al hilo receptor. Esto es brillante a nivel arquitectónico: es imposible que ambos hilos modifiquen la variable simultáneamente, eliminando las carreras de datos por diseño sin necesidad de utilizar un `Mutex`.

### Múltiples Productores (El patrón MPSC)

En un backend real, un patrón común es tener múltiples hilos "worker" procesando tareas en paralelo (por ejemplo, redimensionando imágenes o calculando hashes) y enviando los resultados a un único hilo consolidador que escribe en la base de datos o genera un reporte.

Dado que `mpsc` soporta múltiples productores, podemos clonar el `Sender` (`tx`) para repartirlo entre varios hilos.

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    for i in 1..=3 {
        // Clonamos el transmisor para este hilo específico
        let tx_clonado = tx.clone();
        
        thread::spawn(move || {
            let log = format!("Worker {} completó su tarea", i);
            tx_clonado.send(log).unwrap();
            thread::sleep(Duration::from_millis(50));
        });
    }

    // Importante: Destruimos el `tx` original del hilo principal.
    // Si no lo hacemos, el bucle for de abajo nunca terminará, porque rx 
    // pensará que aún hay un transmisor activo que podría enviar mensajes.
    drop(tx);

    // Podemos iterar directamente sobre el receptor.
    // El bucle terminará automáticamente cuando todos los transmisores (tx) se hayan cerrado.
    for mensaje in rx {
        println!("Consolidador recibió: {}", mensaje);
    }
}
```

### Canales Asíncronos vs. Síncronos (Manejo de Backpressure)

Hasta ahora hemos usado `mpsc::channel()`. Este tipo de canal es **asíncrono y sin límite de capacidad** (*unbounded*). El transmisor nunca se bloqueará al hacer `.send()`; simplemente añadirá el mensaje a una cola infinita.

**Advertencia de Seniority:** En producción, los canales ilimitados son una bomba de relojería. Si tus hilos productores generan mensajes más rápido de lo que el consumidor puede procesarlos (por ejemplo, si el consumidor está haciendo inserts lentos en la base de datos), la cola de mensajes crecerá indefinidamente hasta consumir toda la memoria RAM, provocando un error *Out Of Memory* (OOM) y tirando tu servidor.

Para sistemas resilientes, necesitas **Backpressure** (Contrapresión). Rust lo proporciona mediante `mpsc::sync_channel(capacidad)`.

Un `sync_channel` tiene un búfer con un tamaño fijo. Si el búfer está lleno, la llamada a `tx.send()` bloqueará al hilo productor hasta que el consumidor lea un mensaje y libere espacio.

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    // Creamos un canal síncrono que solo puede almacenar 2 mensajes a la vez.
    let (tx, rx) = mpsc::sync_channel(2);

    thread::spawn(move || {
        println!("Enviando 1...");
        tx.send(1).unwrap(); // Pasa inmediatamente (1 en búfer)
        
        println!("Enviando 2...");
        tx.send(2).unwrap(); // Pasa inmediatamente (2 en búfer - Lleno)
        
        println!("Enviando 3... (El hilo se bloqueará aquí)");
        // Este `send` detendrá la ejecución del hilo hasta que el principal haga un `recv()`
        tx.send(3).unwrap(); 
        
        println!("El hilo productor pudo continuar.");
    });

    // Simulamos un consumidor lento
    thread::sleep(std::time::Duration::from_secs(2));
    
    println!("Consumidor leyó: {}", rx.recv().unwrap()); // Lee 1, libera espacio, el hilo productor se desbloquea.
    println!("Consumidor leyó: {}", rx.recv().unwrap()); // Lee 2
    println!("Consumidor leyó: {}", rx.recv().unwrap()); // Lee 3
}
```

Usar `sync_channel` obliga a que la velocidad de los productores se adapte a la del consumidor, garantizando un uso de memoria predecible y estable en entornos de alta carga.

## 14.4 Variables atómicas y ordenamiento de memoria (`std::sync::atomic`)

Hasta ahora hemos protegido el estado compartido utilizando `Mutex` y `RwLock`. Aunque son herramientas robustas, tienen un costo de rendimiento: implican llamadas al sistema operativo para bloquear y desbloquear hilos (context switching). Si todo lo que necesitas es incrementar un contador de métricas o verificar una bandera booleana para detener un servicio, usar un `Mutex` es matar moscas a cañonazos.

Para estos casos de uso, Rust ofrece primitivas en el módulo `std::sync::atomic`. Las variables atómicas permiten operaciones de lectura y escritura seguras entre hilos **sin usar bloqueos** (*lock-free*), apoyándose directamente en instrucciones de hardware a nivel de CPU.

### Primitivas Atómicas Básicas

La biblioteca estándar proporciona tipos atómicos equivalentes a los tipos primitivos más comunes: `AtomicBool`, `AtomicIsize`, `AtomicUsize`, entre otros.

A diferencia de un `Mutex`, una variable atómica no necesita envolver el dato (no devuelve un "guardia"); el tipo en sí mismo expone métodos para mutar el valor de forma atómica a través de referencias compartidas (`&T`), lo que lo hace perfecto para usarlo junto a `Arc`.

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    // Un contador global atómico inicializado en 0
    let peticiones_procesadas = Arc::new(AtomicUsize::new(0));
    let mut workers = vec![];

    for _ in 0..4 {
        let contador_clonado = Arc::clone(&peticiones_procesadas);
        workers.push(thread::spawn(move || {
            for _ in 0..1000 {
                // Incrementamos el valor atómicamente de forma segura
                contador_clonado.fetch_add(1, Ordering::SeqCst);
            }
        }));
    }

    for worker in workers {
        worker.join().unwrap();
    }

    // Leemos el valor final
    let total = peticiones_procesadas.load(Ordering::SeqCst);
    println!("Total de peticiones procesadas: {}", total);
}
```

El código es más limpio y mucho más rápido que usar un `Arc<Mutex<usize>>`. Sin embargo, habrás notado el segundo parámetro en las funciones `fetch_add` y `load`: el misterioso `Ordering::SeqCst`.

### El abismo del Ordenamiento de Memoria (Memory Ordering)

Aquí es donde se separa a los desarrolladores intermedios de los verdaderamente Senior. Cuando trabajas sin *locks*, el compilador y el procesador se sienten con la libertad de reordenar las instrucciones de tu código para optimizar el rendimiento, siempre y cuando el resultado parezca el mismo *para ese hilo individual*. En un entorno multihilo, este reordenamiento puede causar estragos si no estableces límites.

El enum `std::sync::atomic::Ordering` le dice al compilador y a la CPU qué restricciones de reordenamiento de memoria deben respetar.

1. **`Ordering::Relaxed` (Relajado):**
   * Es la opción más rápida.
   * **Garantiza:** Que la operación sobre *esa variable específica* es atómica (no habrá lecturas a medias).
   * **No garantiza:** Nada sobre el orden relativo de otras operaciones en memoria.
   * **Uso en Backend:** Ideal para contadores de métricas aislados, donde no importa si la actualización ocurre una fracción de nanosegundo antes o después en relación con otra parte del sistema.

2. **`Ordering::Acquire` y `Ordering::Release`:**
   * Operan en pareja para sincronizar hilos.
   * Una operación de escritura usa `Release`, garantizando que cualquier escritura en memoria previa a esa instrucción sea visible.
   * Una operación de lectura usa `Acquire`, garantizando que las lecturas posteriores vean los cambios publicados por el `Release`.
   * **Uso en Backend:** Banderas de estado (*flags*). Por ejemplo, un hilo prepara datos complejos y luego pone una bandera atómica a `true` (Release). Otro hilo lee la bandera (Acquire) y, si es `true`, tiene la garantía de ver los datos preparados correctamente.

3. **`Ordering::SeqCst` (Sequential Consistency):**
   * Es el ordenamiento más estricto y seguro.
   * Garantiza que todos los hilos verán las operaciones atómicas en el mismo orden universal exacto.
   * Es más costoso a nivel de rendimiento que los anteriores debido a las barreras de memoria a nivel de hardware que impone.
   * **Regla de oro:** Si no estás 100% seguro de cómo funcionan los reordenamientos de CPU de bajo nivel, **usa siempre `SeqCst`**.

### Compare-And-Swap (CAS)

El patrón más poderoso en el mundo *lock-free* es el "Compara e Intercambia" (CAS, por sus siglas en inglés). En Rust, esto se implementa mediante el método `compare_exchange` (o `compare_exchange_weak` en bucles).

Este método permite actualizar una variable atómica *solo si* su valor actual coincide con un valor que esperamos. Si otro hilo lo modificó un instante antes, la operación falla, permitiéndonos reintentar o abortar lógicamente.

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let max_conexiones = AtomicUsize::new(10);
    
    // Queremos cambiar de 10 a 20.
    // Parámetros: valor esperado (10), nuevo valor (20), Ordering de éxito, Ordering de fallo.
    let resultado = max_conexiones.compare_exchange(
        10, 
        20, 
        Ordering::SeqCst, 
        Ordering::Relaxed
    );

    match resultado {
        Ok(valor_previo) => println!("Éxito. El valor era {}", valor_previo),
        Err(valor_actual) => println!("Fallo. Alguien más lo cambió. Ahora es {}", valor_actual),
    }
}
```

El patrón CAS es el bloque de construcción fundamental sobre el cual se construyen estructuras de datos concurrentes avanzadas (como colas lock-free o canales), evitando los bloqueos mutuos (*deadlocks*) por completo.
