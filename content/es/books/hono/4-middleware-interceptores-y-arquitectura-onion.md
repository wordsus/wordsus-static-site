Este capítulo aborda la columna vertebral lógica de Hono: su sistema de middlewares basado en el modelo **Onion**. A diferencia de los flujos lineales tradicionales, la "cebolla" permite interceptar la ejecución tanto en la fase de entrada (*downstream*) como en la de salida (*upstream*), facilitando la manipulación avanzada de la respuesta. Exploraremos el uso de herramientas nativas optimizadas para el Edge como `cors` y `cache`, la creación de interceptores personalizados con **TypeScript** estricto mediante `createMiddleware`, y las estrategias de autenticación y gestión de errores globales para construir aplicaciones robustas, seguras y de latencia ultra baja.

## 4.1. El modelo Onion (Cebolla) en Hono: Flujo de entrada y salida (`await next()`)

Para los desarrolladores que provienen del ecosistema de Express, el modelo de middleware suele entenderse como una tubería lineal: la petición entra, pasa por una serie de funciones y, eventualmente, una de ellas devuelve la respuesta, terminando el ciclo. Sin embargo, Hono hereda y perfecciona el **modelo Onion (cebolla)**, popularizado originalmente por Koa.

En este modelo, el flujo de ejecución no es unidireccional. Cada middleware envuelve a los siguientes, permitiendo interceptar la petición en dos fases distintas dentro de la misma función:

1. **Downstream (Flujo de entrada):** El código que se ejecuta *antes* de llamar a `await next()`. Ideal para validaciones, inyección de estado en el contexto y parsing preliminar.
2. **Upstream (Flujo de salida):** El código que se ejecuta *después* de que `await next()` se resuelve. En este punto, el handler final ya se ejecutó, el objeto `Response` ya existe en el contexto, y es el momento perfecto para mutar cabeceras, registrar tiempos de ejecución o transformar la respuesta antes de que abandone el Edge.

### La anatomía de `await next()`

El método `next()` devuelve una Promesa que se resuelve cuando todos los middlewares subsiguientes y el handler de la ruta han terminado su trabajo. Omitir el `await` frente a `next()` es uno de los antipatrones más comunes y peligrosos, ya que rompe la cadena asíncrona, provocando que el middleware evalúe su fase *upstream* prematuramente (antes de que exista una respuesta real) o que el runtime del Edge congele la ejecución por promesas flotantes.

Veamos la implementación clásica de un logger de latencia para visualizar este flujo:

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.use('*', async (c, next) => {
  // 1. Fase Downstream (Entrada)
  const start = Date.now()
  console.log(`[1] Entrando a la ruta: ${c.req.path}`)

  // 2. Ceder el control al siguiente middleware/handler
  await next()

  // 3. Fase Upstream (Salida)
  const ms = Date.now() - start
  console.log(`[4] Saliendo de la ruta. Tiempo total: ${ms}ms`)
  
  // Mutando la respuesta en la salida
  c.res.headers.set('X-Response-Time', `${ms}ms`)
})

app.get('/api/data', async (c) => {
  console.log('[2] Ejecutando el handler de la ruta')
  
  // Simulando trabajo I/O asíncrono
  await new Promise(resolve => setTimeout(resolve, 50))
  
  console.log('[3] Handler finalizado, preparando respuesta')
  return c.json({ data: 'Edge Speed' })
})

```

La consola imprimirá el orden exacto [1] -> [2] -> [3] -> [4], demostrando cómo el middleware envuelve temporalmente la ejecución completa del Request/Response.

### Manipulación avanzada de la Respuesta en el flujo Upstream

Dado que ya hemos cubierto el objeto Context (`c`) en el Capítulo 3, sabes que Hono trabaja directamente con las Fetch APIs estándar (`Request` y `Response`). Esto introduce un paradigma crucial en el modelo Onion de Hono: **Las instancias de `Response` son inmutables por defecto en los Web Standards, pero Hono expone `c.res` como una referencia mutable dentro del pipeline.**

Cuando te encuentras en la fase de salida (después de `await next()`), `c.res` contiene la respuesta generada por el handler. Si necesitas modificar el *body* de la respuesta (no solo los headers), no puedes simplemente editarlo. Debes construir una nueva instancia de `Response` y reasignarla a `c.res`.

```typescript
app.use('/api/secure/*', async (c, next) => {
  await next() // Esperamos a que el handler genere la respuesta

  // Interceptamos la respuesta generada
  const contentType = c.res.headers.get('Content-Type')

  // Si es JSON, inyectamos un meta-tag de seguridad a nivel de payload
  if (contentType && contentType.includes('application/json')) {
    // Clonamos la respuesta para poder leer el body original
    // (Consumir un stream de Web API sin clonar lo bloquea)
    const originalBody = await c.res.clone().json()
    
    const modifiedBody = {
      ...originalBody,
      _meta: { secure_edge: true, timestamp: Date.now() }
    }

    // Reconstruimos la respuesta usando las APIs estándar
    // Manteniendo el status original pero inyectando el nuevo body
    c.res = new Response(JSON.stringify(modifiedBody), {
      status: c.res.status,
      headers: c.res.headers
    })
  }
})

```

### Consideraciones de Performance en el Edge

El modelo Onion no es gratuito. Cada `async/await` en la cadena de middlewares crea un nuevo closure y añade un micro-tick al event loop. Sin embargo, Hono optimiza esto internamente evitando la instanciación de clases pesadas (como hace NestJS) y manteniendo el pipeline como un simple array de funciones ejecutadas de forma secuencial y recursiva.

**Regla de oro para el Senior Dev:** Mantén la cadena de middlewares lo más plana posible. Utiliza el enrutamiento inteligente de Hono (Capítulo 2) para aplicar middlewares *exclusivamente* en las rutas que lo necesitan (`app.use('/api/*', ...)`), en lugar de declarar middlewares globales gigantes que contengan declaraciones `if/else` para discriminar rutas, lo cual contamina el flujo Onion innecesariamente y degrada el rendimiento en milisegundos críticos para arquitecturas serverless.

## 4.2. Middlewares nativos esenciales: `logger`, `cors`, `secureHeaders`, `cache`

A diferencia de entornos como Express, donde dependes de un ecosistema fragmentado de terceros (`morgan`, `cors`, `helmet`), Hono incluye baterías nativas altamente optimizadas. Estos middlewares no son simples *ports* de Node.js; están construidos desde cero utilizando las Web Standard APIs. Esto significa que no tienen dependencias externas, su impacto en el tamaño del bundle es mínimo y se ejecutan a velocidad nativa en el Edge.

A continuación, diseccionamos los cuatro middlewares más críticos y cómo configurarlos para un entorno de producción de alta exigencia.

### 1. `logger`: Observabilidad estructurada

El middleware `logger` de Hono es extremadamente ligero. Si bien su uso básico (`app.use(logger())`) imprime logs con el método HTTP, la ruta y el código de estado, en un entorno de producción (especialmente serverless) querrás formatear estos logs para sistemas de observabilidad como Datadog, Grafana Loki o CloudWatch.

Puedes pasarle una función de impresión personalizada para estructurar la salida en JSON:

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'

const app = new Hono()

// Logger estructurado para ingesta en sistemas de monitoreo
const customPrint = (str: string, ...rest: string[]) => {
  // Hono envía internamente una cadena preformateada a esta función,
  // pero podemos extraer los argumentos o imprimir nuestro propio contexto.
  console.log(JSON.stringify({
    level: 'info',
    message: str,
    timestamp: new Date().toISOString(),
    edge_region: process.env.REGION || 'unknown' 
  }))
}

app.use('*', logger(customPrint))

```

### 2. `cors`: Dominando el Preflight en el Edge

El manejo de *Cross-Origin Resource Sharing* (CORS) en el Edge tiene un matiz de rendimiento crítico: las peticiones *preflight* (`OPTIONS`). Si tu frontend SPA está en un dominio distinto al de tu API en Hono, el navegador enviará un `OPTIONS` antes de peticiones mutables (POST, PUT, DELETE) o cuando se usan cabeceras personalizadas.

Si no configuras correctamente el CORS, estarás duplicando la latencia de cada interacción, ya que forzarás dos viajes completos al Edge.

```typescript
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  // Configuración dinámica basada en expresiones regulares o arrays
  origin: (origin) => {
    if (origin.endsWith('.midominio.com') || origin === 'https://midominio.com') {
      return origin
    }
    return 'https://midominio.com' // Fallback seguro
  },
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 86400, // ¡CRÍTICO! Cachea el preflight en el navegador por 24 horas
  credentials: true,
}))

```

> **Pro-Tip:** El uso de `maxAge` es innegociable en APIs de alto tráfico. Instruye al navegador para que recuerde la respuesta del `OPTIONS` y no vuelva a preguntar durante el tiempo especificado, reduciendo a la mitad las llamadas reales a tu worker.

### 3. `secureHeaders`: Seguridad por defecto (El Helmet de Hono)

La seguridad no debe ser una idea de último momento. `secureHeaders` inyecta automáticamente cabeceras defensivas para mitigar ataques como XSS, Clickjacking y Sniffing de MIME types.

Es recomendable aplicarlo globalmente en la instancia base de tu aplicación, pero permitiendo sobrescrituras puntuales, especialmente para la Política de Seguridad de Contenido (CSP), que suele ser el mayor dolor de cabeza al integrar scripts de terceros.

```typescript
import { secureHeaders } from 'hono/secure-headers'

app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xXssProtection: '1; mode=block',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https://imagedelivery.net"]
  }
}))

```

### 4. `cache`: Explotando la Cache API del Runtime

Aquí es donde Hono brilla frente a los frameworks tradicionales de Node.js. El middleware `cache` no implementa un diccionario en memoria (lo cual sería inútil en un entorno serverless donde los workers se destruyen y recrean constantemente). En su lugar, utiliza la interfaz estándar **`CacheStorage`** (la misma que usan los Service Workers en el navegador y que está implementada nativamente en Cloudflare, Deno y Fastly).

Esto permite almacenar la respuesta *directamente en el nodo del Edge* más cercano al usuario.

```typescript
import { cache } from 'hono/cache'

// Almacenar en caché endpoints de lectura pesados (ej. catálogos, artículos)
app.get(
  '/api/catalogo',
  cache({
    cacheName: 'mi-app-catalogo-v1', // Versionar la caché facilita la invalidación
    cacheControl: 'max-age=3600',    // TTL de 1 hora
    wait: true // 'true' obliga a esperar a que la promesa de guardado en caché se resuelva 
               // (útil en Cloudflare si no pasas c.executionCtx.waitUntil)
  }),
  async (c) => {
    // Si la ruta está en la caché del Edge, este código NO se ejecutará.
    // Si no está (Cache Miss), se ejecuta, genera el JSON, 
    // y el middleware lo guardará en la Cache API automáticamente.
    const dbData = await fetchExpensiveDatabaseData()
    return c.json(dbData)
  }
)

```

**Nota Arquitectónica:** El middleware de `cache` respeta el flujo Onion. Intercepta la petición en la fase *downstream*; si encuentra un acierto (Cache Hit), devuelve la respuesta inmediatamente, cortocircuitando el handler. Si hay un fallo (Cache Miss), cede el control con `await next()`, permite que el handler genere la respuesta, y en la fase *upstream* captura esa respuesta, la clona y la guarda en `CacheStorage` antes de enviarla al cliente.

## 4.3. Creación de middlewares personalizados altamente tipados y reutilizables

En el ecosistema de Node.js tradicional (Express, Koa), extender el objeto `Request` o el contexto general para pasar datos de un middleware a un controlador siempre ha sido un punto de fricción en TypeScript. Generalmente requería hacer *module augmentation* sobre las interfaces globales de la librería, lo cual es propenso a errores, colisiones y pérdida de encapsulamiento.

Hono aborda este problema de raíz. Gracias a su diseño basado en genéricos explícitos y la inferencia de TypeScript, podemos crear middlewares que inyectan variables en el contexto (`c.set()`) garantizando que los handlers subsiguientes tendrán autocompletado y validación de tipos estricta al recuperarlas (`c.get()`).

A partir de las versiones recientes de Hono, la forma canónica de lograr esto es abandonando el tipado manual complejo en favor de la utilidad `createMiddleware` importada de `hono/factory`.

### El patrón Factory con `createMiddleware`

Para que un middleware sea verdaderamente reutilizable en múltiples proyectos, debe encapsularse en una función que acepte opciones de configuración (un *Factory*). Además, debe declarar explícitamente qué inyecta en el entorno (`Env`) de Hono.

Imaginemos un caso de uso real: un middleware que intercepta un token de autorización, lo decodifica y muta el contexto inyectando el ID del usuario autenticado y su rol, listo para ser consumido por el controlador.

```typescript
import { createMiddleware } from 'hono/factory'

// 1. Definimos el "contrato" de este middleware.
// ¿Qué variables inyecta? ¿Qué Bindings de Cloudflare necesita que existan?
type AuthEnv = {
  Bindings: {
    JWT_SECRET: string // Requerimos que la app tenga este secreto en su entorno
  }
  Variables: {
    user: {
      id: string
      role: 'admin' | 'user'
    }
  }
}

// Opciones de configuración del middleware
interface AuthOptions {
  requireAdmin?: boolean
}

// 2. Creamos la función Factory
export const authMiddleware = (options?: AuthOptions) => {
  // 3. Usamos createMiddleware pasando nuestro contrato (AuthEnv)
  return createMiddleware<AuthEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Token no proporcionado' }, 401)
    }

    const token = authHeader.split(' ')[1]
    
    // Aquí validaríamos el token con c.env.JWT_SECRET (ignorado por brevedad)
    const isValid = token === 'super-secret-token' 
    
    if (!isValid) {
      return c.json({ error: 'Token inválido' }, 403)
    }

    // Simulamos la decodificación del payload
    const decodedPayload = { id: 'usr_123', role: 'admin' as const }

    if (options?.requireAdmin && decodedPayload.role !== 'admin') {
      return c.json({ error: 'Permisos insuficientes' }, 403)
    }

    // 4. Inyección segura de estado. 
    // TypeScript fallaría aquí si intentamos hacer c.set('user', 'un_string')
    c.set('user', decodedPayload)

    await next()
  })
}

```

### Consumo e Inferencia en la Aplicación

El verdadero poder de esta arquitectura se despliega cuando conectamos nuestro middleware a una instancia de Hono. Para que TypeScript sepa que la ruta `/api/perfil` tiene garantizada la existencia de `c.var.user`, debemos combinar el tipo `AuthEnv` con el entorno global de nuestra aplicación.

```typescript
import { Hono } from 'hono'
// Importamos el middleware y su tipo de entorno
import { authMiddleware } from './middleware/auth'

// Definimos el entorno global de la app, fusionando contratos
type AppEnv = {
  Bindings: {
    JWT_SECRET: string
    DB: any // Ejemplo de base de datos
  }
  Variables: {
    // Aquí declaramos explícitamente las variables que nuestros 
    // middlewares inyectarán a lo largo de la app
    user: { id: string; role: 'admin' | 'user' }
  }
}

// Instanciamos Hono con nuestro tipo global
const app = new Hono<AppEnv>()

// Aplicamos el middleware
app.use('/api/admin/*', authMiddleware({ requireAdmin: true }))
app.use('/api/user/*', authMiddleware())

app.get('/api/admin/dashboard', (c) => {
  // Inferencia total: `c.get('user')` no es `any` ni `unknown`.
  // TypeScript sabe que tiene las propiedades `id` y `role`.
  const currentUser = c.get('user')

  return c.json({
    message: `Bienvenido administrador ${currentUser.id}`
  })
})

```

### Beneficios a escala empresarial

1. **Seguridad en refactorizaciones:** Si el día de mañana el payload del JWT cambia y el `user` pasa a tener una propiedad `uuid` en lugar de `id`, actualizar la interfaz `AuthEnv` provocará errores de compilación instantáneos en todos los controladores que consumían la propiedad antigua, evitando bugs silenciosos en producción.
2. **Testabilidad:** Aislar la lógica transversal en factorías puras creadas con `createMiddleware` permite instanciar el middleware en tests unitarios inyectando objetos de contexto (`c`) mockeados, sin necesidad de levantar toda la aplicación Hono de principio a fin.
3. **Composición limpia:** Al mantener el contrato explícito en el tipado `Env`, puedes encadenar múltiples middlewares complejos sabiendo exactamente qué dependencias de `Bindings` exigen y qué `Variables` proporcionan, eliminando la clásica "magia oscura" de las aplicaciones Node.js legacy.

## 4.4. Manejo de Autenticación en el Edge: JWT, Bearer Auth y validación de tokens a velocidad de latencia ultrabaja

El Edge computing obliga a replantear los patrones de autenticación. En una arquitectura tradicional (Node.js + Express), validar una sesión suele implicar una consulta a una base de datos (PostgreSQL) o a una caché en memoria compartida (Redis) en cada petición. En el Edge, hacer esto destruye la ventaja de la proximidad geográfica: si tu Worker se ejecuta en Tokio pero tu base de datos centralizada está en Virginia, añadirás latencia transatlántica a cada validación.

Por ello, la autenticación en el Edge debe ser **estricta y preferentemente *stateless***. Hono proporciona herramientas nativas construidas sobre la **Web Crypto API**, lo que significa que la verificación criptográfica ocurre a nivel del motor V8 sin depender de pesadas librerías de Node.js, garantizando tiempos de ejecución de un solo dígito en milisegundos.

### 1. El Middleware `bearerAuth`: Seguridad para APIs M2M

Para escenarios de comunicación Máquina a Máquina (M2M), webhooks, o microservicios internos donde solo necesitas validar un token estático, Hono ofrece el middleware `bearerAuth`.

Es extremadamente rápido y realiza una comparación segura en tiempo constante (para mitigar ataques de *timing*) de forma interna. Al ser un entorno serverless, el token no se hardcodea, sino que se inyecta dinámicamente desde el contexto:

```typescript
import { bearerAuth } from 'hono/bearer-auth'

// Aplicamos la autenticación condicionalmente usando un factory
app.use('/api/m2m/*', (c, next) => {
  // Inicializamos el middleware leyendo el secreto desde los Bindings (ej. Cloudflare Env)
  const auth = bearerAuth({ token: c.env.INTERNAL_API_KEY })
  return auth(c, next)
})

```

### 2. `hono/jwt`: Verificación Stateless y Firma en el Edge

Para usuarios finales, los **JSON Web Tokens (JWT)** son el estándar de facto. Hono incluye soporte completo para firmar (`sign`), verificar (`verify`) y decodificar (`decode`) tokens usando criptografía asimétrica y simétrica.

El mayor desafío en plataformas como Cloudflare Workers es que las variables de entorno (`c.env`) solo están disponibles *dentro* del ciclo de vida de la petición. No puedes inicializar un middleware global de JWT estáticamente. Hono resuelve esto de forma elegante permitiendo que el secreto sea una función que evalúa el contexto en tiempo de ejecución:

```typescript
import { jwt } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'

// Extendemos nuestro entorno para incluir las variables que inyectará el JWT
type AppEnv = {
  Bindings: { JWT_SECRET: string }
  Variables: JwtVariables
}

const app = new Hono<AppEnv>()

// Protección de rutas con JWT.
// 'jwt' extrae automáticamente el token del header 'Authorization: Bearer <token>'
app.use(
  '/api/protegido/*',
  jwt({
    // Proveedor dinámico del secreto
    secret: (c) => c.env.JWT_SECRET,
    // (Opcional) Validar el algoritmo explícitamente para evitar ataques de downgrade
    alg: 'HS256' 
  })
)

app.get('/api/protegido/perfil', (c) => {
  // El middleware inyecta el payload verificado en `c.var.jwtPayload`
  const payload = c.get('jwtPayload')
  return c.json({ user_id: payload.sub, role: payload.role })
})

```

### 3. Arquitectura Avanzada: Autenticación Distribuida con JWKS

A nivel Senior, es raro que el propio backend del Edge firme los tokens. Lo habitual es delegar la identidad a un IdP (Identity Provider) externo como Auth0, Clerk, Firebase o un servidor Keycloak centralizado.

Estos sistemas usan firmas asimétricas (usualmente `RS256`). El IdP firma el token con su clave privada, y tu Worker en Hono debe verificarlo usando la clave pública del IdP. Descargar o hardcodear estas claves es un antipatrón, ya que los IdPs las rotan frecuentemente. La solución es **JWKS (JSON Web Key Set)**.

Hono soporta JWKS nativamente a través del middleware `@hono/jwks`. Esto permite que el Edge verifique tokens de terceros consultando la URL pública de claves del proveedor, y lo más importante: **cachea las claves públicas en memoria o en la Cache API** para no añadir latencia de red a cada validación.

```typescript
// Requiere instalación: npm install @hono/jwks
import { jwks } from '@hono/jwks'

app.use(
  '/api/external-auth/*',
  jwks({
    // URL donde tu Identity Provider expone sus claves públicas
    jwks_uri: 'https://mi-tenant.eu.auth0.com/.well-known/jwks.json',
    
    // Algoritmo esperado
    alg: 'RS256',
    
    // El middleware se encarga de:
    // 1. Extraer el 'kid' (Key ID) del header del JWT entrante.
    // 2. Buscar esa clave en la respuesta cachead de la jwks_uri.
    // 3. Verificar criptográficamente la firma con la Web Crypto API.
  })
)

```

### Consideraciones críticas de rendimiento (CPU vs. Wall Time)

Debes tener en cuenta cómo facturan los proveedores de Edge. Cloudflare Workers, por ejemplo, diferencia entre *Wall Time* (el tiempo real que la petición está viva, esperando a I/O) y *CPU Time* (el tiempo que el procesador está ejecutando instrucciones).

La verificación de un JWT (especialmente firmas asimétricas grandes) consume *CPU Time*. Gracias a que Hono utiliza los enlaces C++ nativos de V8 bajo el capó (Web Crypto API) en lugar de implementaciones en JavaScript puro, el coste de CPU se mantiene típicamente por debajo de `1ms`. Sin embargo, si tu payload de JWT es masivamente grande o usas algoritmos complejos (como `PS512`), podrías acercarte a los límites restrictivos de CPU del tier gratuito de algunos proveedores serverless (generalmente 10ms a 50ms por petición).

Mantén tus JWT pequeños (sólo claims esenciales como `sub`, `exp` y `role`) para asegurar que el Edge mantenga su promesa de ultra-baja latencia y bajo consumo de CPU.

## 4.5. Captura global de excepciones (`app.onError`) y manejo de rutas no encontradas (`app.notFound`)

En arquitecturas distribuidas y entornos serverless, el manejo de errores no es solo una cuestión de experiencia de usuario, sino de seguridad y observabilidad. Dejar que una excepción no controlada alcance el runtime del Edge puede resultar en respuestas genéricas del proveedor (como el temido *Error 1101* de Cloudflare) o, peor aún, en la fuga de *stack traces* con información sensible.

Hono proporciona un mecanismo centralizado y tipado para gobernar el ciclo de vida de los errores, eliminando la necesidad de bloques `try/catch` repetitivos en cada controlador mediante `app.notFound` y `app.onError`.

### 1. Estandarizando el 404: `app.notFound`

Por defecto, cuando una petición no coincide con ninguna ruta en el árbol (TrieRouter), Hono devuelve un texto plano: `404 Not Found`. Para una API REST o GraphQL, esto rompe el contrato visual de la aplicación, ya que los clientes esperan una respuesta en formato JSON.

Sobrescribir este comportamiento es trivial, pero en un entorno de producción, debemos asegurar que el formato coincida con el estándar de errores de nuestra API (por ejemplo, siguiendo el estándar RFC 7807 *Problem Details*).

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.notFound((c) => {
  // Retornamos un JSON estructurado en lugar de texto plano
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `El recurso solicitado en [${c.req.method}] ${c.req.path} no existe.`,
        timestamp: new Date().toISOString()
      }
    },
    404
  )
})

```

### 2. Excepciones Controladas: `HTTPException`

Antes de capturar errores globalmente, necesitamos una forma limpia de lanzarlos. En Express, lanzar un error dentro de un handler asíncrono requería pasarlo a `next(err)`. En Hono, puedes simplemente lanzar una instancia de la clase nativa `HTTPException`.

Esta clase aborta la ejecución del controlador inmediatamente y delega el control al manejador global de errores, preservando el código de estado HTTP y los headers que necesites inyectar.

```typescript
import { HTTPException } from 'hono/http-exception'

app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await db.findUser(id)

  if (!user) {
    // HTTPException corta la ejecución aquí.
    // No necesitas retornar c.json() manualmente.
    throw new HTTPException(404, { 
      message: `Usuario con ID ${id} no encontrado en la base de datos.` 
    })
  }

  return c.json(user)
})

```

### 3. La red de seguridad absoluta: `app.onError`

El método `app.onError` es el *Error Boundary* definitivo de tu aplicación. Captura absolutamente todo: desde una `HTTPException` lanzada intencionalmente, hasta un `TypeError` causado por acceder a una propiedad indefinida, o un fallo de red al consultar una base de datos externa.

A nivel Senior, tu manejador de errores debe cumplir tres funciones críticas:

1. **Discriminación de errores:** Diferenciar entre errores operacionales (controlados) y errores de programación (bugs inesperados).
2. **Conciencia del entorno (Environment Awareness):** Mostrar el *stack trace* en desarrollo (`localhost`), pero ocultarlo completamente en producción.
3. **Observabilidad:** Enviar los errores críticos a tu sistema de telemetría (Sentry, Datadog, Axiom).

Veamos la implementación de un manejador de errores de grado empresarial:

```typescript
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

type AppEnv = {
  Bindings: {
    ENVIRONMENT: 'development' | 'production' | 'staging'
  }
}

const app = new Hono<AppEnv>()

app.onError((err, c) => {
  const isDev = c.env.ENVIRONMENT === 'development'

  // 1. Manejo de Errores Controlados (HTTPException)
  if (err instanceof HTTPException) {
    // Obtenemos la respuesta original si fue inyectada en la excepción
    return err.getResponse() || c.json({
      error: {
        code: `HTTP_${err.status}`,
        message: err.message,
      }
    }, err.status)
  }

  // 2. Manejo de Errores Inesperados (Bugs, Caídas de DB, etc.)
  // Aquí es donde registrarías el error en tu sistema de observabilidad.
  // Ej: context.executionCtx.waitUntil(sentry.captureException(err))
  
  console.error(`[FATAL ERROR] Ruta: ${c.req.path}`, err)

  // 3. Respuesta condicional basada en el entorno
  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ha ocurrido un error inesperado en el servidor.',
        // Solo filtramos el stack trace si estamos en desarrollo
        ...(isDev && { stack: err.stack }),
      }
    },
    500
  )
})

```

**Nota sobre `c.executionCtx.waitUntil` en el manejo de errores:**
Si decides enviar el registro de un error grave a un servicio externo (como Sentry) dentro de `app.onError`, es vital que envuelvas esa promesa de red en `c.executionCtx.waitUntil()`. Si no lo haces, y retornas la respuesta `c.json(...)` al usuario, el Edge (Cloudflare/Deno) congelará o destruirá el Worker inmediatamente para ahorrar recursos, cancelando la petición HTTP a Sentry y perdiendo el log del error para siempre.

Con esta sección, hemos completado de forma exhaustiva el **Capítulo 4**. Hemos cubierto la arquitectura Onion, los middlewares nativos, la creación de factories tipados, el manejo de autenticación ultra-rápida y el control robusto de excepciones.
