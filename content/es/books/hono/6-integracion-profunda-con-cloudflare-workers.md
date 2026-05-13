Este capítulo explora la simbiosis entre **Hono** y el ecosistema de **Cloudflare Workers**, elevando el desarrollo en el *Edge* a un estándar de ingeniería superior. Tras dominar el enrutamiento y el contexto, profundizamos en la inyección estricta de **Bindings** para gestionar D1, KV y R2 con total seguridad de tipos. Analizamos patrones de concurrencia avanzada mediante **Durable Objects**, la implementación de **WebSockets** para tiempo real y el procesamiento asíncrono con **Queues** y **Cron Triggers**. Finalmente, abordamos el manejo eficiente de grandes volúmenes de datos mediante **Streaming** y **SSE**, garantizando aplicaciones escalables, seguras y de ultra baja latencia.

## 6.1. Inyección estricta de Bindings (D1, KV, R2, Queues, AI) en el contexto de Hono

En el ecosistema de Cloudflare Workers, los *Bindings* son el puente vital entre tu código *stateless* (sin estado) que se ejecuta en el Edge y la infraestructura de datos *stateful* (con estado) de Cloudflare. Como vimos en el Capítulo 3, Hono provee un objeto de contexto (`c`) altamente tipado. Sin embargo, para un desarrollo verdaderamente robusto a nivel *Senior*, no basta con simplemente declarar que una variable de entorno existe; debemos asegurar un tipado estricto *end-to-end* (E2E) que refleje exactamente la configuración de nuestro `wrangler.toml` e inyectar estas dependencias de forma que no acoplen nuestra lógica de negocio al framework.

### El Contrato de Bindings (Type Safety Foundation)

El primer paso para una inyección estricta es definir la interfaz de nuestros Bindings utilizando los tipos nativos proporcionados por `@cloudflare/workers-types`. Esta interfaz actuará como la única fuente de la verdad para nuestro entorno de ejecución.

```typescript
// types/env.ts
import type { D1Database, KVNamespace, R2Bucket, Queue, Ai } from '@cloudflare/workers-types';

export interface CloudflareBindings {
  // Bases de datos y Almacenamiento
  DB_USERS: D1Database;
  CACHE_SESSION: KVNamespace;
  STORAGE_ASSETS: R2Bucket;
  
  // Procesamiento asíncrono
  EMAIL_QUEUE: Queue;
  
  // Modelos de Machine Learning
  AI_MODELS: Ai;
  
  // Variables de entorno estáticas (Secretos)
  API_KEY_STRIPE: string;
}

// Extendemos el entorno genérico de Hono
export type AppEnvironment = {
  Bindings: CloudflareBindings;
  // Preparando el terreno para el middleware de inyección (Variables de estado)
  Variables: {
    userId?: string;
  };
};

```

Al pasar `AppEnvironment` al instanciar Hono (`new Hono<AppEnvironment>()`), el compilador de TypeScript ahora vigilará cada acceso a `c.env`, eliminando los errores de *runtime* causados por *typos* o bindings no configurados.

### Acceso Directo vs. Inyección de Dependencias (DI)

El enfoque más directo es consumir los Bindings directamente desde el handler de la ruta:

```typescript
// Enfoque Directo (Acoplado)
import { Hono } from 'hono';
import type { AppEnvironment } from './types/env';

const app = new Hono<AppEnvironment>();

app.get('/users/:id', async (c) => {
  const userId = c.req.param('id');
  
  // TypeScript sabe que DB_USERS es D1Database
  const { results } = await c.env.DB_USERS.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).all();

  return c.json(results);
});

```

Si bien esto es rápido de escribir, **es un antipatrón para aplicaciones a gran escala**. Acopla fuertemente el controlador HTTP (Hono) con la implementación de la base de datos (D1).

Para aplicaciones empresariales (tema que expandiremos en el Capítulo 8 sobre Arquitectura Limpia), la mejor práctica es utilizar los **Middlewares de Hono como contenedores de Inyección de Dependencias**.

### El Patrón de Inyección vía Middleware

En lugar de leer `c.env` en las rutas, extraemos los Bindings en un middleware global y los usamos para instanciar repositorios o servicios, inyectándolos posteriormente en `c.var`.

```typescript
// 1. Ampliamos nuestras Variables de Hono para incluir los Repositorios
export type AppEnvironment = {
  Bindings: CloudflareBindings;
  Variables: {
    userRepo: UserRepository;
    aiService: AiTextService;
  };
};

// 2. Middleware de Inyección
app.use('*', async (c, next) => {
  // Extraemos los bindings
  const { DB_USERS, AI_MODELS } = c.env;

  // Instanciamos nuestras clases de dominio puras pasándoles la infraestructura
  const userRepository = new CloudflareD1UserRepository(DB_USERS);
  const aiService = new CloudflareAiService(AI_MODELS);

  // Inyectamos en el contexto de la petición
  c.set('userRepo', userRepository);
  c.set('aiService', aiService);

  await next();
});

// 3. Controlador limpio y desacoplado
app.post('/users/bio', async (c) => {
  const { name } = await c.req.json();
  
  // Consumimos los servicios inyectados desde c.var
  const ai = c.get('aiService');
  const repo = c.get('userRepo');

  const generatedBio = await ai.generateBiography(name); // Lógica de dominio abstraída
  const user = await repo.create({ name, bio: generatedBio });

  // Publicar en la cola (Ejemplo de uso directo justificado para dispatchers simples)
  await c.env.EMAIL_QUEUE.send({ type: 'WELCOME', email: user.email });

  return c.json(user, 201);
});

```

### Consideraciones especiales por tipo de Binding en Hono:

* **D1 (SQL Database):** D1 utiliza sentencias preparadas. Al inyectar D1 en repositorios, asegúrate de tipar correctamente los retornos usando genéricos en las consultas (`.all<User>()`), ya que por defecto D1 retorna objetos genéricos.
* **KV y R2 (Key-Value & Object Storage):** Las operaciones de lectura de KV y R2 son ideales para ser interceptadas por un middleware de caché de Hono (como veremos en rendimiento) antes de llegar a la lógica del controlador.
* **Queues:** A diferencia del resto de bindings que se *consumen* en una petición HTTP, Hono (como framework HTTP) típicamente actúa como un *Productor* (Publisher) para las colas mediante `c.env.MI_COLA.send()`. El *Consumidor* de la cola reside fuera del ciclo de vida de Hono, un patrón que abordaremos en detalle en la sección 6.4.
* **AI (Workers AI):** El binding de IA puede requerir un alto tiempo de cómputo. Es crucial inyectarlo con precaución en rutas síncronas para no golpear los límites de CPU time de Workers. Considera siempre ejecutar las inferencias complejas usando `c.executionCtx.waitUntil()` si la respuesta HTTP no depende del resultado inmediato.

## 6.2. Hono y Durable Objects: Instanciando Hono dentro del ciclo de vida de un Durable Object (Patrones de concurrencia stateful)

Hasta ahora, hemos tratado a Hono bajo el paradigma natural del Edge: computación puramente *stateless* (sin estado) y efímera. Sin embargo, cuando construimos aplicaciones complejas como editores colaborativos, salas de chat, limitadores de tasa (rate limiters) precisos o sistemas de colas en tiempo real, necesitamos estado fuertemente consistente. Aquí es donde entran los **Durable Objects (DOs)** de Cloudflare.

Un Durable Object garantiza una única instancia coordinada globalmente a la que se le asigna un estado persistente (transaccional). El desafío arquitectónico es: ¿Cómo manejamos la lógica de enrutamiento y validación *dentro* de esa única instancia sin volver al código espagueti de `switch(request.url)`?

La respuesta es elegante: **Podemos instanciar una aplicación de Hono completamente funcional dentro del ciclo de vida de un Durable Object.**

### El Patrón de Enrutamiento Anidado (Worker -> DO -> Hono)

En este patrón de concurrencia, tu Worker principal actúa como un API Gateway *stateless*. Su única responsabilidad es autenticar la petición, determinar a qué instancia de Durable Object pertenece (el `ObjectId`), y hacer un proxy de la petición hacia él.

Una vez que la petición llega al Durable Object, una instancia interna de Hono toma el control, manejando el enrutamiento, los middlewares y la mutación del estado persistente.

Veamos la implementación en código estructurado para producción:

```typescript
import { Hono } from 'hono';
import { DurableObject } from 'cloudflare:workers';

// 1. Tipado de Bindings (Como vimos en 6.1)
type Bindings = {
  ROOM_DO: DurableObjectNamespace;
};

// ============================================================================
// 2. EL DURABLE OBJECT (Stateful)
// ============================================================================
export class RoomDurableObject extends DurableObject {
  private app: Hono;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    
    // Instanciamos Hono DENTRO del Durable Object
    this.app = new Hono();

    // Middleware interno del DO: útil para logging a nivel de instancia
    this.app.use('*', async (c, next) => {
      console.log(`[DO Request] ${c.req.method} ${c.req.path}`);
      await next();
    });

    // Mutación de estado con concurrencia segura
    this.app.post('/messages', async (c) => {
      const { user, text } = await c.req.json();
      
      // ctx.storage garantiza transacciones ACID
      let messages = await this.ctx.storage.get<any[]>('messages') || [];
      const newMessage = { user, text, timestamp: Date.now() };
      messages.push(newMessage);
      
      await this.ctx.storage.put('messages', messages);
      
      return c.json({ success: true, message: newMessage }, 201);
    });

    // Lectura de estado
    this.app.get('/messages', async (c) => {
      const messages = await this.ctx.storage.get<any[]>('messages') || [];
      return c.json(messages);
    });
  }

  // Cloudflare Workers llama a este método. Hono lo intercepta.
  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

// ============================================================================
// 3. EL WORKER PRINCIPAL (Stateless Gateway)
// ============================================================================
const app = new Hono<{ Bindings: Bindings }>();

app.route('/rooms/:roomId/*', async (c) => {
  const roomId = c.req.param('roomId');
  
  // Derivamos el ID único basado en el nombre de la sala
  const id = c.env.ROOM_DO.idFromName(roomId);
  
  // Obtenemos el "Stub" (el cliente RPC local para hablar con el DO)
  const stub = c.env.ROOM_DO.get(id);
  
  // Hacemos proxy de la petición original directamente al Durable Object.
  // La instancia de Hono dentro del DO se encargará del resto.
  return stub.fetch(c.req.raw);
});

export default app;

```

### Consideraciones Avanzadas de Concurrencia

Al inyectar Hono dentro de un DO, como desarrollador Senior debes tener en cuenta los siguientes comportamientos del motor V8 bajo el capó:

1. **Single-Threaded por Instancia:** Aunque instancies Hono dentro del DO, el DO sigue procesando peticiones en un solo hilo. Esto significa que si tienes una ruta en tu Hono interno que hace una operación síncrona pesada (como un bucle criptográfico o manipulación intensiva de strings), bloquearás a *todos* los demás usuarios que estén intentando acceder a esa misma sala/instancia de DO.
2. **`ctx.storage` y la Promesa Resoluta:** La API de almacenamiento del DO está diseñada para evitar condiciones de carrera (race conditions). Las operaciones de lectura y escritura (`get`, `put`) son asíncronas pero se ejecutan en memoria, lo que significa que el I/O al disco es manejado en segundo plano por Cloudflare. Hono se beneficia enormemente de esto: puedes mutar el estado dentro de tus *handlers* de Hono sin preocuparte por bloqueos de base de datos tradicionales.
3. **El Contexto (`c`) Anidado:** Es vital entender que la petición (`c.req.raw`) que llega al Hono interno es la *misma* que envió el Worker principal. Si tu Worker principal muta los headers o añade información (por ejemplo, validando un JWT y añadiendo un header `X-User-ID`), el Hono interno dentro del DO podrá leer esos headers. Este es el patrón recomendado para transferir el contexto de autenticación desde el Gateway *stateless* hacia el DO *stateful*.

## 6.3. Manejo de WebSockets en Hono usando Cloudflare Workers (`HonoWebSocket`)

El protocolo HTTP convencional, por su naturaleza de petición-respuesta, es insuficiente para aplicaciones que requieren comunicación bidireccional en tiempo real de baja latencia. Cloudflare Workers soporta WebSockets de forma nativa a través de la API `WebSocketPair`, pero manejar el *handshake* (el intercambio 101 Switching Protocols) y el enrutamiento de estas conexiones manualmente introduce un código repetitivo (boilerplate) considerable.

Hono abstrae esta complejidad mediante su módulo de WebSockets (`@hono/ws`), permitiéndote tratar una actualización a WebSocket casi como si fuera una ruta HTTP normal, manteniendo el acceso al contexto (`c`) y a los Bindings de forma estricta.

### La Abstracción `upgradeWebSocket`

Para manejar WebSockets en Hono sobre Cloudflare Workers, utilizamos el *helper* `upgradeWebSocket`. Este interceptor evalúa si la petición entrante contiene los *headers* correctos de actualización (`Upgrade: websocket`). Si es así, realiza el *handshake* internamente y expone los manejadores de eventos.

Veamos un ejemplo de un servidor *stateless* (sin estado) tipo "Echo", útil para streams de datos donde no necesitamos que los clientes se comuniquen entre sí:

```typescript
import { Hono } from 'hono';
import { createServer } from 'node:http'; // Solo para tipado estricto si se comparte código
import { upgradeWebSocket } from 'hono/cloudflare-workers';

// Definimos nuestros Bindings (Contexto E2E)
type AppEnvironment = {
  Bindings: {
    API_TOKEN: string;
  };
};

const app = new Hono<AppEnvironment>();

// Ruta interceptada para WebSockets
app.get(
  '/ws/echo',
  upgradeWebSocket((c) => {
    // 1. Aquí todavía tenemos acceso al contexto de Hono.
    // Podríamos validar tokens de URL, cookies o headers antes de aceptar la conexión.
    const token = c.req.query('token');
    if (token !== c.env.API_TOKEN) {
       // Si lanzamos un error o retornamos undefined, Hono rechaza el handshake.
       throw new Error('Unauthorized WebSocket connection');
    }

    // 2. Retornamos el contrato de eventos del WebSocket
    return {
      onMessage(event, ws) {
        console.log(`Mensaje recibido: ${event.data}`);
        // Hacemos eco del mensaje de vuelta al cliente
        ws.send(`Echo desde el Edge: ${event.data}`);
      },
      onOpen(_event, ws) {
        console.log('Nueva conexión establecida');
        ws.send('Conexión inicializada con éxito');
      },
      onClose(event, ws) {
        console.log(`Conexión cerrada. Código: ${event.code}`);
      },
      onError(error, ws) {
        console.error('Error en el socket:', error);
      }
    };
  })
);

export default app;

```

### El Desafío del Estado: WebSockets + Durable Objects

El ejemplo anterior es elegante, pero en el mundo real, los casos de uso para WebSockets (salas de chat, cursores colaborativos, juegos multijugador) requieren **Broadcasting** (enviar un mensaje a múltiples clientes conectados).

Dado que un Cloudflare Worker regular es efímero y *stateless*, no puedes simplemente guardar las conexiones en un array global `const clients = []`, ya que la infraestructura de Cloudflare instanciará múltiples aislamientos (isolates) independientes en diferentes centros de datos.

Como vimos en la sección **6.2**, la solución a la concurrencia *stateful* son los **Durable Objects**. Para construir un sistema de WebSockets de grado de producción, la arquitectura correcta es usar Hono como enrutador Gateway y derivar la conexión al Durable Object.

A nivel Senior, en lugar de usar `upgradeWebSocket` dentro del DO, la mejor práctica actual de Cloudflare es utilizar la **API de Hibernación de WebSockets (WebSocket Hibernation)** nativa del Durable Object. Hono simplemente facilita el puente:

```typescript
// Worker principal (Hono)
app.get('/ws/room/:id', async (c) => {
  const roomId = c.req.param('id');
  
  // Exigimos que la petición sea un intento de upgrade
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  // 1. Obtenemos la instancia única del Durable Object para esta sala
  const id = c.env.ROOM_DO.idFromName(roomId);
  const stub = c.env.ROOM_DO.get(id);

  // 2. Pasamos la petición de upgrade al DO. 
  // Hono termina su trabajo aquí de forma limpia.
  return stub.fetch(c.req.raw);
});

```

Dentro del Durable Object, interceptarás esta petición HTTP, crearás el `WebSocketPair` nativo y registrarás el *socket* en el estado del DO (`this.ctx.acceptWebSocket(ws)`), permitiendo que el DO entre en modo de hibernación para no facturar tiempo de CPU mientras la conexión WebSocket sigue abierta esperando mensajes.

### Consideraciones de Rendimiento y Seguridad

* **Timeouts de inactividad:** En Workers puros (fuera de un DO), las conexiones WebSocket se cerrarán si el aisalmiento subyacente se reinicia o tras periodos largos de inactividad. Es imperativo implementar una lógica de reconexión (Backoff exponencial) en el código del cliente (Frontend).
* **Ping/Pong:** Utiliza *heartbeats* (mensajes vacíos periódicos) para mantener vivas las conexiones a través de los balanceadores de carga y detectar "conexiones zombie" que no se cerraron limpiamente.
* **Validación de Mensajes:** Dado que Hono delega el evento `onMessage` a una función nativa, pierdes temporalmente la validación automática de schemas que ofrece `@hono/zod-validator` para rutas HTTP. Debes instanciar manualmente tu validador Zod dentro del `onMessage` y hacer un `try/catch` para parsear `event.data` antes de procesar la lógica de negocio.

## 6.4. Procesamiento en background: Exponiendo handlers para Scheduled Events (Cron Triggers) y Queue Consumers manteniendo la inyección de dependencias de Hono

Hasta ahora hemos tratado a Hono como el punto de entrada principal de nuestra aplicación. Sin embargo, en arquitecturas empresariales, el ciclo de vida de petición-respuesta HTTP no es suficiente. Tareas como la limpieza de bases de datos, el envío masivo de correos o la generación de reportes pesados requieren **procesamiento asíncrono en segundo plano**.

Cloudflare Workers maneja estos eventos a través de exportaciones específicas en el entry point de tu Worker: `scheduled` para Cron Triggers y `queue` para consumidores de colas (Cloudflare Queues).

El dilema arquitectónico es evidente: **Hono se monta sobre el handler `fetch`, pero ¿cómo reutilizamos nuestros repositorios, servicios y tipado estricto (Bindings) en los handlers `scheduled` y `queue` sin duplicar código?**

Existen dos patrones avanzados para resolver esto.

### Patrón 1: La Factoría de Servicios Compartida (Recomendado para Dominio Puro)

Si seguiste las buenas prácticas del Capítulo 6.1, tus repositorios y casos de uso están desacoplados del framework HTTP. En lugar de instanciarlos directamente en un middleware de Hono, creamos una "Factoría de Dependencias" pura que toma el entorno (`env`) y devuelve los servicios.

De esta manera, tanto Hono como los *handlers* de background pueden hidratar su capa de dominio usando exactamente la misma lógica.

```typescript
import { Hono } from 'hono';
import type { D1Database, Queue, ExecutionContext } from '@cloudflare/workers-types';

// 1. Tipado E2E
type Bindings = {
  DB_USERS: D1Database;
  MAIL_QUEUE: Queue;
};

// 2. Factoría de Inyección de Dependencias
// Esta es la clave: es agnóstica a si la llamada viene de HTTP, Cron o Queue
const createContainer = (env: Bindings) => {
  return {
    userRepo: new UserRepository(env.DB_USERS),
    emailService: new EmailService(env.MAIL_QUEUE),
  };
};

type AppEnvironment = {
  Bindings: Bindings;
  Variables: {
    container: ReturnType<typeof createContainer>;
  };
};

const app = new Hono<AppEnvironment>();

// 3. Hono hidrata su contexto usando la factoría
app.use('*', async (c, next) => {
  c.set('container', createContainer(c.env));
  await next();
});

app.post('/users', async (c) => {
  // Lógica HTTP normal...
  return c.text('User created');
});

// ============================================================================
// 4. EL ENTRY POINT DEL WORKER (El "Pegamento" de Cloudflare)
// ============================================================================
export default {
  // A. Tráfico HTTP (Hono toma el control)
  fetch: app.fetch,

  // B. Cron Triggers (Eventos programados)
  async scheduled(event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    // Reutilizamos la misma factoría exacta
    const container = createContainer(env);
    
    // Usamos ctx.waitUntil para asegurar que el worker no muera prematuramente
    ctx.waitUntil(
      container.userRepo.cleanupExpiredSessions()
    );
  },

  // C. Consumidores de Colas (Procesamiento por lotes)
  async queue(batch: MessageBatch<any>, env: Bindings, ctx: ExecutionContext) {
    const container = createContainer(env);

    // Procesamos el batch de mensajes
    for (const message of batch.messages) {
      try {
        await container.emailService.send(message.body);
        message.ack(); // Marcamos como completado
      } catch (error) {
        message.retry(); // Reencolamos en caso de fallo
      }
    }
  }
};

```

Este enfoque es el más limpio a nivel de *Clean Architecture*, ya que mantiene la lógica de negocio completamente separada de la capa de transporte (HTTP vs Eventos).

### Patrón 2: Enrutamiento Sintético (Reutilizando Middlewares de Hono)

Existe un escenario alternativo: ¿Qué pasa si tienes *middlewares* muy complejos en Hono (por ejemplo, *loggers* personalizados hacia Datadog/Axiom que envuelven el `c.req`) y quieres que tus Cron Triggers pasen por esa misma tubería de observabilidad?

Puedes crear **Peticiones HTTP Sintéticas** (Fake Requests) directamente en el Edge y pasárselas al método `app.request()` o `app.fetch()`.

```typescript
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    // 1. Creamos un Request falso apuntando a una ruta interna de Hono
    const syntheticRequest = new Request('https://internal.app/cron/daily-cleanup', {
      method: 'POST',
      headers: {
        'X-Cron-Secret': env.CRON_SECRET // Simulamos autenticación interna
      }
    });

    // 2. Inyectamos la petición directamente en el router de Hono.
    // Esto ejecutará todos los middlewares globales como si fuera tráfico real.
    ctx.waitUntil(
      app.fetch(syntheticRequest, env, ctx).then(res => {
        if (!res.ok) console.error('Cron job failed with status:', res.status);
      })
    );
  }
};

```

*Nota del autor:* Usa el Patrón 2 (Enrutamiento Sintético) solo si la reutilización de *middlewares* HTTP es estrictamente necesaria. Para la mayoría de arquitecturas empresariales sólidas, el Patrón 1 (Factoría Compartida) es superior, ya que evita la sobrecarga de simular el ciclo de vida de HTTP (parseo de headers, routing regex, etc.) para tareas de background que deberían ser de procesamiento directo.

## 6.5. Streaming de respuestas de gran volumen (SSE y ReadableStreams)

Uno de los errores más comunes al transicionar arquitecturas tradicionales al Edge es ignorar los límites estrictos de memoria. En Cloudflare Workers, un aislamiento (isolate) típico tiene un límite de memoria de 128 MB (o algo más en planes de pago). Si intentas cargar un reporte JSON de 200 MB desde D1 o un archivo de video desde R2 en la memoria RAM del Worker antes de enviarlo al cliente (haciendo un *buffer* completo), tu Worker sufrirá un colapso por `Out of Memory` (Error 1102).

La solución nativa de la plataforma web, adoptada elegantemente por Hono, es el uso de **Streams**. Al procesar y enviar los datos en pequeños fragmentos (*chunks*), el consumo de memoria se mantiene plano y predecible, independientemente de si estás enviando 10 MB o 10 GB.

Hono ofrece varios *helpers* dentro del módulo `hono/streaming` para facilitar este patrón arquitectónico sin lidiar directamente con el bajo nivel de la API `ReadableStream`.

### 1. Streaming Binario Básico y Zero-Copy con R2

El caso de uso más directo es servir archivos masivos. Afortunadamente, los bindings de Cloudflare (como R2) ya devuelven un `ReadableStream` nativo en su propiedad `body`. Hono está diseñado para entender estos streams directamente en la respuesta sin necesidad de utilidades extra.

Esto permite un patrón de **Zero-Copy Streaming**: el Worker actúa como un tubo transparente, moviendo los bytes desde R2 hasta la red del cliente sin almacenarlos en sus propias variables.

```typescript
import { Hono } from 'hono';
import type { R2Bucket } from '@cloudflare/workers-types';

type Bindings = {
  STORAGE_ASSETS: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/downloads/:filename', async (c) => {
  const filename = c.req.param('filename');
  const object = await c.env.STORAGE_ASSETS.get(filename);

  if (!object) return c.notFound();

  // Pasamos el ReadableStream nativo directamente a c.body()
  // El uso de memoria del Worker se mantiene en unos pocos megabytes.
  return c.body(object.body, 200, {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Length': object.size.toString(), // Vital para que el cliente calcule el progreso
    'ETag': object.httpEtag
  });
});

```

### 2. Generación Dinámica con `stream`

Cuando no tienes un stream preparado (como el de R2) y necesitas generar el contenido al vuelo, Hono proporciona el helper `stream`. Esto es útil para exportaciones pesadas de bases de datos donde consultas por lotes (paginación de cursores) y envías los datos fragmento a fragmento.

```typescript
import { stream } from 'hono/streaming';

app.get('/export/logs', (c) => {
  // Configura los headers para forzar la descarga en el navegador
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="logs.csv"');

  return stream(c, async (stream) => {
    // Escribimos la cabecera del CSV
    await stream.write('id,level,message,timestamp\n');

    let cursor = 0;
    let hasMore = true;

    while (hasMore) {
      // Simulamos una consulta paginada a D1
      const { results, nextCursor } = await fetchLogsFromD1(c.env.DB, cursor);
      
      for (const row of results) {
        // Escribimos chunk a chunk directamente en el socket TCP
        await stream.write(`${row.id},${row.level},${row.message},${row.timestamp}\n`);
      }

      cursor = nextCursor;
      hasMore = !!nextCursor;
      
      // Opcional: pausar la ejecución brevemente para liberar el event loop si el chunk es masivo
      await stream.sleep(10); 
    }
  });
});

```

### 3. Server-Sent Events (SSE) para Respuestas de IA

Mientras que los WebSockets (sección 6.3) son bidireccionales, gran parte de la web moderna requiere simplemente *streaming unidireccional* del servidor al cliente. El caso paradigmático actual es la generación de texto de Inteligencia Artificial (estilo ChatGPT).

Los Server-Sent Events (SSE) operan sobre HTTP estándar, son mucho más ligeros de configurar que los WebSockets y manejan la reconexión automáticamente. Hono provee `streamSSE` para manejar el protocolo.

```typescript
import { streamSSE } from 'hono/streaming';

app.post('/ai/chat', async (c) => {
  const { prompt } = await c.req.json();

  return streamSSE(c, async (stream) => {
    // 1. Iniciamos la llamada al binding de AI de Cloudflare (Workers AI)
    // Asumiendo que el binding soporta streaming (stream: true)
    const aiResponseStream = await c.env.AI_MODELS.run(
      '@cf/meta/llama-2-7b-chat-int8',
      { messages: [{ role: 'user', content: prompt }], stream: true }
    );

    // 2. Leemos el ReadableStream devuelto por el modelo
    const reader = aiResponseStream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      
      // 3. Escribimos en formato estándar SSE: "data: {chunk}\n\n"
      await stream.writeSSE({
        data: chunk,
        event: 'message', // Evento por defecto
        id: crypto.randomUUID() // Opcional para control de estado
      });
    }

    // El cierre del stream cierra la conexión HTTP limpiamente
  });
});

```

### Resumen Arquitectónico del Capítulo 6

A lo largo de este capítulo, hemos transformado a Hono de un simple enrutador HTTP en un ciudadano de primera clase dentro del ecosistema de Cloudflare Workers. Has aprendido a inyectar bases de datos (D1) sin acoplar tu dominio, gestionar concurrencia fuerte con Durable Objects, habilitar tiempo real con WebSockets y enviar gigabytes de datos sin agotar la memoria. Todo esto manteniendo la seguridad de tipos estricta que caracteriza a TypeScript.
