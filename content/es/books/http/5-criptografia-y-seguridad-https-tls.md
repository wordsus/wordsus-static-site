La seguridad en la web ha dejado de ser una característica opcional para convertirse en el estándar operativo de cualquier infraestructura moderna. En este capítulo, exploraremos cómo el protocolo HTTP se transforma en HTTPS mediante la integración de TLS, analizando desde la optimización de latencia en el handshake de la versión 1.3 hasta la implementación de arquitecturas Zero Trust con mTLS. Como administrador de sistemas, no solo aprenderás a cifrar el tráfico, sino a orquestar políticas de seguridad avanzadas mediante cabeceras estrictas, gestionar la identidad multitenant con SNI y dominar la gobernanza del intercambio de recursos entre orígenes (CORS).

## 5.1. El Handshake TLS (versiones 1.2 vs 1.3) y su impacto en la latencia de HTTP
Para garantizar la confidencialidad, integridad y autenticidad del tráfico web, HTTP debe encapsularse dentro de una capa de seguridad (TLS, *Transport Layer Security*), dando lugar a lo que conocemos como HTTPS. Sin embargo, la criptografía introduce un costo operativo inevitable: la latencia inicial de negociación o **Handshake**.

Para un administrador de sistemas, comprender cómo este apretón de manos afecta el *Time to First Byte* (TTFB) es fundamental para optimizar el rendimiento de aplicaciones, APIs y microservicios. En las redes modernas, el cuello de botella rara vez es la capacidad de procesamiento criptográfico del servidor (CPU), sino el **RTT (Round Trip Time)**: el tiempo que tarda un paquete de datos en viajar desde el cliente hasta el servidor y volver.

A continuación, analizaremos la evolución arquitectónica desde TLS 1.2 hasta TLS 1.3 y su impacto directo en la latencia.

---

### El problema de la latencia en TLS 1.2
Estandarizado en 2008, TLS 1.2 fue el pilar de la web segura durante más de una década. Sin embargo, su diseño requiere múltiples viajes de ida y vuelta (RTTs) simplemente para acordar los parámetros criptográficos antes de que se pueda enviar el primer byte de datos HTTP.

Para una conexión HTTPS estándar sobre TCP, el flujo con TLS 1.2 es el siguiente:

1. **1-RTT para TCP:** Sincronización a nivel de red (SYN, SYN-ACK, ACK).
2. **2-RTT para TLS 1.2:** Negociación de cifrado e intercambio de claves.
3. **Envío de datos HTTP:** El cliente finalmente envía su petición (ej. `GET / HTTP/1.1`).

Esto significa que, en el mejor de los casos, **el cliente debe esperar 3 RTTs completos** antes de que el servidor reciba la petición HTTP.

```text
Secuencia de Handshake en TLS 1.2 (2-RTT)
-------------------------------------------------------------------------
Cliente                                                       Servidor
   |                                                             |
   | [TCP Handshake (SYN -> SYN/ACK -> ACK)]                     | (1 RTT)
   |============================================================>|
   |                                                             |
   | 1. ClientHello (Cifrados soportados)                        | -> Inicio TLS
   |------------------------------------------------------------>|
   |<------------------------------------------------------------| 2. ServerHello, Certificado, ServerKeyExchange
   |                                                             | (Fin del 1er RTT TLS)
   | 3. ClientKeyExchange, ChangeCipherSpec, Finished            | 
   |------------------------------------------------------------>|
   |<------------------------------------------------------------| 4. ChangeCipherSpec, Finished
   |                                                             | (Fin del 2do RTT TLS)
   | [Petición HTTP encriptada (Ej. GET /)]                      | -> Datos
   |============================================================>|

```

**Impacto operativo:** Si un usuario en Madrid se conecta a un servidor en Nueva York (RTT aproximado de 100 ms), el navegador pasará 300 ms bloqueado únicamente estableciendo la conexión, sin haber descargado ni un solo recurso. En conexiones móviles de alta latencia, este retraso degrada severamente la experiencia de usuario.

---

### La revolución del rendimiento: TLS 1.3
Aprobado en 2018 (RFC 8446), TLS 1.3 no fue solo una actualización menor, sino una reescritura drástica del protocolo. Desde la perspectiva de un administrador, sus dos grandes logros son la eliminación de algoritmos criptográficos obsoletos y débiles (limpiando la superficie de ataque) y, crucialmente, la **reducción del handshake a 1-RTT**.

TLS 1.3 logra esto combinando los pasos de negociación. El cliente no solo envía los cifrados que soporta en el `ClientHello`, sino que asume (adivina) el algoritmo de intercambio de claves que el servidor preferirá (típicamente curvas elípticas como X25519) y envía directamente su parte de la clave matemática (`KeyShare`).

```text
Secuencia de Handshake en TLS 1.3 (1-RTT)
-------------------------------------------------------------------------
Cliente                                                       Servidor
   |                                                             |
   | [TCP Handshake (SYN -> SYN/ACK -> ACK)]                     | (1 RTT)
   |============================================================>|
   |                                                             |
   | 1. ClientHello + KeyShare (Adivinanza de clave)             | -> Inicio TLS
   |------------------------------------------------------------>|
   |<------------------------------------------------------------| 2. ServerHello, Certificado, Finished
   |                                                             | (Fin del 1er RTT TLS)
   | [Petición HTTP encriptada (Ej. GET /)]                      | -> Datos
   |============================================================>|

```

**Impacto operativo:** Volviendo al ejemplo del RTT de 100 ms, TLS 1.3 reduce el tiempo de establecimiento de 300 ms a solo 200 ms. Se ahorra un viaje completo de red, lo que resulta en una mejora del rendimiento inmediato de cara al usuario final, simplemente actualizando la configuración de Nginx, HAProxy o el balanceador de carga.

---

### Reanudación de sesión y 0-RTT (Early Data)
TLS 1.3 introduce una optimización aún más agresiva para clientes que ya han visitado el servidor recientemente: **0-RTT o "Early Data"**.

Si el cliente y el servidor ya establecieron una conexión previa, pueden guardar un ticket de sesión (o un identificador PSK - *Pre-Shared Key*). En la siguiente visita, el cliente puede adjuntar la petición HTTP cifrada directamente dentro del primer paquete del handshake TLS.

* **TCP + TLS 1.3 (0-RTT) = 1 RTT total** antes de que el servidor procese el HTTP. *(Nota: En HTTP/3 sobre QUIC, esto se optimiza aún más a nivel de red, como se detalló en el Capítulo 4).*

#### La trampa de seguridad de 0-RTT para administradores
Aunque 0-RTT suena ideal, conlleva un riesgo arquitectónico grave: los **Ataques de Repetición (Replay Attacks)**. Dado que los datos tempranos (Early Data) se envían antes de que el servidor confirme la frescura del handshake, un atacante en la red podría interceptar este paquete inicial y reenviarlo múltiples veces al servidor.

**Regla de oro operativa para 0-RTT:**
Como administradores, si habilitamos `ssl_early_data on;` (en Nginx, por ejemplo), debemos asegurarnos estrictamente de que la aplicación y el proxy inverso solo permitan solicitudes **idempotentes y seguras** (ver sección 1.5) a través de Early Data. Nunca se debe procesar un `POST`, `PUT` o `DELETE` mediante 0-RTT, ya que un atacante podría duplicar transacciones financieras, envíos de formularios o alteraciones de estado simplemente repitiendo el paquete interceptado. La mayoría de los servidores modernos mitigan esto permitiendo Early Data solo para métodos `GET` sin parámetros sensibles en la URL.

### Resumen comparativo para diagnóstico de latencia
Al analizar trazas de red (Capítulo 8) o configurar arquitecturas de balanceo de carga (Capítulo 7), tenga en cuenta la siguiente tabla de latencia antes del primer byte útil (Payload HTTP):

| Protocolo Subyacente | Versión TLS | Tipo de Conexión | RTTs hasta enviar HTTP |
| --- | --- | --- | --- |
| TCP | TLS 1.2 | Nueva conexión | 3-RTT |
| TCP | TLS 1.2 | Reanudación de sesión | 2-RTT |
| TCP | **TLS 1.3** | **Nueva conexión** | **2-RTT** |
| TCP | **TLS 1.3** | **0-RTT (Early Data)** | **1-RTT** |

La adopción de TLS 1.3 no es solo una medida de seguridad dictada por el cumplimiento normativo; es una herramienta de optimización de rendimiento de primer nivel para reducir drásticamente la latencia de las transacciones HTTP.

## 5.2. Terminación TLS (Offloading) vs. TLS Passthrough en Balanceadores de Carga
En una arquitectura de alta disponibilidad, el balanceador de carga (LB) actúa como la puerta de entrada para el tráfico HTTPS. Una de las decisiones de diseño más críticas para un administrador de sistemas es determinar dónde debe ocurrir el proceso de cifrado y descifrado. Esta elección impacta directamente en la seguridad, el rendimiento del backend y la capacidad de inspección del tráfico.

Existen dos estrategias principales, cada una con implicaciones operativas profundas: **Terminación TLS (Offloading)** y **TLS Passthrough**.

---

### 1. Terminación TLS (TLS Termination / Offloading)
En este modelo, el balanceador de carga recibe la conexión HTTPS, realiza el handshake con el cliente (utilizando sus propios certificados) y descifra los datos. Una vez descifrados, el LB reenvía la petición al servidor backend, generalmente a través de HTTP plano (puerto 80) sobre una red privada segura.

#### Diagrama de flujo (Offloading):
```text
CLIENTE --[HTTPS (Cifrado)]--> BALANCEADOR (Descifrado) --[HTTP (Plano)]--> BACKEND
   |                              | (Certificado SSL reside aquí)         |
   |<------[Handshake TLS]------->|                                       |

```

**Ventajas:**

* **Reducción de carga (Offloading):** Libera a los servidores de aplicaciones del costo computacional de gestionar handshakes y cifrado simétrico, permitiéndoles dedicar más CPU al procesamiento de lógica de negocio.
* **Inspección de Capa 7 (L7):** Al tener el tráfico en plano, el LB puede leer cabeceras, cookies y la URL. Esto permite aplicar reglas de **WAF (Web Application Firewall)**, persistencia de sesión por cookie e inserción de cabeceras como `X-Forwarded-Proto`.
* **Gestión Centralizada:** Los certificados se instalan y renuevan únicamente en el balanceador, simplificando la administración de PKI.

**Desventajas:**

* **Tráfico interno en plano:** Si un atacante compromete la red interna entre el LB y el backend, puede capturar datos sensibles.
* **Punto único de confianza:** El balanceador debe ser extremadamente seguro, ya que posee todas las claves privadas.

---

### 2. TLS Passthrough
En el modo Passthrough, el balanceador actúa simplemente como un reenvío de nivel de red (Capa 4 / TCP). El handshake TLS no ocurre en el LB, sino directamente entre el cliente y el servidor backend. El balanceador solo ve paquetes TCP cifrados que no puede inspeccionar.

#### Diagrama de flujo (Passthrough):
```text
CLIENTE --[HTTPS (Cifrado)]--> BALANCEADOR (Reenvío L4) --[HTTPS (Cifrado)]--> BACKEND
   |                              | (No ve el contenido)                  |
   |<---------------------------[Handshake TLS]-------------------------->|

```

**Ventajas:**

* **Seguridad End-to-End:** El tráfico permanece cifrado en todo su trayecto, incluso dentro de la red del centro de datos. Cumple con normativas estrictas de seguridad (como PCI-DSS en ciertos contextos).
* **Autenticación del Cliente:** Facilita el uso de certificados de cliente (mTLS) sin configuraciones complejas en el LB.

**Desventajas:**

* **Ceguera del LB:** El balanceador no puede ver las cabeceras HTTP. No puede realizar enrutamiento basado en URL (ej. `/api` vs `/web`), ni insertar cabeceras `X-Forwarded-For`, ni aplicar reglas de WAF.
* **Carga en el Backend:** Cada servidor backend debe procesar el handshake y el cifrado, aumentando el uso de recursos.
* **Gestión Descentralizada:** Los certificados deben distribuirse en todos los nodos del backend.

---

### 3. El enfoque híbrido: TLS Bridging (Re-encryption)
Para escenarios que requieren máxima seguridad e inspección, existe el **TLS Bridging**. El LB termina la conexión TLS del cliente, inspecciona el tráfico y luego inicia una **nueva** conexión TLS hacia el backend. Es la opción más segura pero la más costosa en latencia y CPU.

### Resumen de Criterios de Selección
| Característica | TLS Termination (Offloading) | TLS Passthrough |
| --- | --- | --- |
| **Nivel de OSI** | Capa 7 (Aplicación) | Capa 4 (Transporte) |
| **Visibilidad HTTP** | Total (Headers, Cookies, URL) | Ninguna (Cifrado) |
| **Carga en Backend** | Baja (Recibe HTTP plano) | Alta (Procesa TLS) |
| **Seguridad Interna** | Menor (Tráfico plano en LAN) | Máxima (E2E Encrypted) |
| **Complejidad Certs** | Baja (Solo en LB) | Alta (En todos los Backends) |

## 5.3. Indicación de Nombre del Servidor (SNI) y despliegue de múltiples certificados
En los primeros días de la web segura, los administradores de sistemas se enfrentaban a un dilema fundamental conocido como el "Catch-22" del alojamiento HTTPS.

En HTTP en texto plano, alojar cientos de dominios en una sola dirección IP es trivial: el servidor web simplemente lee la cabecera `Host` (ej. `Host: www.ejemplo.com`) introducida en HTTP/1.1 y enruta la petición al *Virtual Host* o *Server Block* correspondiente.

Sin embargo, en HTTPS, **la cabecera `Host` viaja cifrada**. El servidor necesita enviar su certificado de seguridad al cliente *antes* de establecer el canal seguro, pero no puede saber qué dominio está solicitando el cliente hasta que descifre la petición. Al no saber qué dominio se solicita, el servidor solo podía devolver un único certificado por dirección IP. Este límite arquitectónico exacerbó enormemente el agotamiento de direcciones IPv4, ya que cada dominio SSL requería una IP dedicada.

La solución a este problema es la **Indicación de Nombre del Servidor (SNI, *Server Name Indication*)**.

---

### La Mecánica de SNI: Desbloqueando el Virtual Hosting en HTTPS
SNI (estandarizado en RFC 6066) es una extensión del protocolo TLS. Su funcionamiento es tan elegante como simple: **el cliente inyecta el nombre del dominio que desea visitar en texto plano directamente en el mensaje inicial `ClientHello**`, mucho antes de que se inicie el cifrado.

Al inspeccionar el tráfico con herramientas como Wireshark o `tcpdump` (como veremos en el Capítulo 8), un administrador verá esta estructura durante el inicio de la conexión:

```text
Inspección de un paquete ClientHello con SNI
-------------------------------------------------------------------------
Capa de Transporte: TCP (Destino Puerto 443)
Capa de Seguridad:  TLS 1.2 / 1.3
  Mensaje:          Handshake Protocol: ClientHello
    - Versión:      TLS 1.2 (o 1.3)
    - Cifrados:     [Lista de Cipher Suites]
    - Extensiones:
        -> Extension: server_name (len=20)
           - Server Name Indication extension
           - Server Name Type: host_name (0)
           - Server Name: www.api-produccion.com  <-- ¡El dominio en plano!

```

Cuando el Balanceador de Carga o Servidor Web recibe este `ClientHello`, extrae el campo `Server Name`, busca en su configuración qué certificado corresponde a `www.api-produccion.com`, y responde en el `ServerHello` presentando exactamente ese certificado.

---

### Implicaciones Operativas y Estrategias de Despliegue
Para un administrador de infraestructuras, SNI cambió radicalmente la forma de gestionar certificados y arquitecturas web. Hoy en día, podemos consolidar miles de certificados en un clúster de balanceadores de carga bajo unas pocas IPs públicas. Sin embargo, esto requiere dominar ciertas configuraciones operativas:

#### 1. El concepto del Certificado "Default" (Fallback)
¿Qué ocurre si un cliente se conecta directamente a la dirección IP del servidor en el puerto 443 (sin enviar nombre de dominio), o envía un SNI que no coincide con ninguno de los dominios configurados?

Los servidores modernos requieren que el administrador defina un **comportamiento por defecto**. Dependiendo de la postura de seguridad, hay dos enfoques:

* **Enfoque Permisivo (Común):** Servir un certificado comodín (Wildcard) genérico o el certificado del dominio principal. Esto generará una alerta de "Certificado Inválido" en el navegador del usuario si el dominio no coincide, pero la conexión no se aborta de inmediato a nivel de red.
* **Enfoque Estricto (Recomendado para APIs y Zero Trust):** Terminar (Drop) la conexión TCP inmediatamente si el SNI no coincide o no está presente.

**Ejemplo de configuración estricta en Nginx (Rechazar conexiones sin SNI válido):**

```nginx
# Bloque de captura por defecto
server {
    listen 443 ssl default_server;
    server_name _;
    
    # Certificado dummy autogenerado (necesario para Nginx, pero no se validará)
    ssl_certificate /etc/nginx/ssl/dummy.crt;
    ssl_certificate_key /etc/nginx/ssl/dummy.key;

    # Rechazar la conexión cerrando el handshake sin enviar datos
    return 444; 
}

# Bloque de aplicación real (Depende de SNI)
server {
    listen 443 ssl;
    server_name api.miempresa.com;
    
    ssl_certificate /etc/nginx/ssl/api.miempresa.com.crt;
    ssl_certificate_key /etc/nginx/ssl/api.miempresa.com.key;
    
    location / {
        proxy_pass http://backend_api;
    }
}

```

#### 2. SNI vs. Certificados SAN (Subject Alternative Name)
Aunque SNI permite instalar múltiples certificados individuales, gestionar miles de archivos `.crt` y `.key` puede ser una pesadilla operativa, incluso con automatización (ej. certbot).

La alternativa/complemento a SNI es el uso de certificados **SAN**. Un único certificado SAN puede amparar múltiples dominios (ej. `miempresa.com`, `www.miempresa.com`, `app.miempresa.com`). Operativamente, es más eficiente cargar un único certificado SAN en la memoria de un balanceador de carga como HAProxy que cargar cien certificados individuales vía SNI, reduciendo el consumo de RAM.

#### 3. El talón de Aquiles de la privacidad: ESNI y ECH
Como administradores, debemos ser conscientes de que SNI tiene un grave problema de privacidad: al viajar en texto plano, cualquier intermediario (ISPs, gobiernos, administradores de red de una cafetería) puede ver exactamente qué dominios están visitando los usuarios, incluso si todo el tráfico HTTP y el URI están cifrados.

Para solucionar esto, la industria está migrando hacia **ECH (Encrypted Client Hello)**, una evolución del previo ESNI. Con ECH, el cliente cifra la extensión SNI utilizando una clave pública que obtiene previamente a través de consultas DNS seguras (DoH - DNS over HTTPS).

**Impacto futuro para SysAdmins:** El despliegue de ECH requerirá una coordinación estrecha entre la infraestructura DNS (para publicar las claves de ECH en registros HTTPS) y el terminador TLS (Nginx, Cloudflare, Envoy), añadiendo una nueva capa de complejidad a la observabilidad, ya que la inspección de tráfico de Capa 7 basada en SNI (muy usada en firewalls corporativos) dejará de funcionar.

## 5.4. Autenticación Mutua (mTLS) para comunicación entre microservicios (Zero Trust)
En la administración de sistemas tradicional, la seguridad solía basarse en el modelo de "perímetro": una red interna confiable protegida por un firewall robusto. Sin embargo, en arquitecturas modernas de microservicios y entornos cloud-native, este modelo ha quedado obsoleto. El paradigma **Zero Trust** (Confianza Cero) asume que la red interna ya está comprometida y, por lo tanto, cada solicitud de servicio a servicio debe ser verificada explícitamente.

Aquí es donde entra la **Autenticación Mutua TLS (mTLS)**. A diferencia del TLS estándar (donde solo el cliente verifica la identidad del servidor), mTLS requiere que **ambas partes** presenten y validen certificados digitales antes de establecer una conexión.

---

### Diferencia entre TLS Estándar y mTLS
En una conexión HTTPS convencional (un navegador visitando un sitio web), el proceso es unidireccional: el servidor entrega su certificado y el cliente lo valida contra una Autoridad de Certificación (CA) de confianza. El servidor, por su parte, no sabe nada sobre la identidad del cliente a nivel de red (Capa 4/5).

En **mTLS**, el servidor también solicita una prueba de identidad al cliente. Esto garantiza que solo los clientes (microservicios) que poseen un certificado firmado por la CA interna de la organización puedan comunicarse con la API.

#### El flujo del Handshake mTLS (Visualización técnica)
```text
CLIENTE (Servicio A)                                         SERVIDOR (Servicio B)
   |                                                             |
   | 1. ClientHello (Cifrados soportados)                        |
   |------------------------------------------------------------>|
   |                                                             |
   | 2. ServerHello, Certificado del Servidor                    |
   | 3. Certificate Request (¡El servidor pide el cert al cliente!)|
   |<------------------------------------------------------------|
   |                                                             |
   | 4. Certificado del Cliente                                  |
   | 5. ClientKeyExchange                                        |
   | 6. CertificateVerify (Firma digital para probar posesión)    |
   |------------------------------------------------------------>|
   |                                                             |
   | 7. ChangeCipherSpec                                         |
   |<------------------------------------------------------------|
   |                                                             |
   | [ Canal Seguro mTLS Establecido: Comunicación Bidireccional ]|
   |============================================================>|

```

---

### Implementación en Microservicios: El rol del Sidecar
Implementar mTLS directamente en el código de cada microservicio (usando librerías de lenguaje) es una pesadilla operativa: requiere gestionar la rotación de certificados, las CAs y la lógica de validación en cada aplicación.

La solución estándar para los administradores de sistemas es el uso de un **Service Mesh** (como Istio o Linkerd). En este modelo, cada microservicio tiene un proxy "Sidecar" (usualmente Envoy) que maneja el tráfico.

1. **Abstracción:** El microservicio envía tráfico en HTTP plano al proxy local (localhost).
2. **Cifrado:** El Sidecar intercepta el tráfico, le añade el certificado de identidad del servicio y establece la conexión mTLS con el Sidecar del servicio de destino.
3. **Descifrado:** El Sidecar de destino valida el certificado del cliente, descifra el tráfico y lo entrega al microservicio local.

---

### Ventajas Operativas de mTLS
* **Identidad Fuerte:** No se depende de direcciones IP para la autenticación (las IPs son efímeras en Kubernetes). La identidad reside en el certificado (campo `Subject` o `SAN`).
* **Segmentación por defecto:** Se pueden crear políticas donde el "Servicio A" solo puede hablar con el "Servicio B" si su certificado pertenece a un grupo específico.
* **Cifrado en tránsito:** Protege contra el *sniffing* de red dentro del propio centro de datos o cluster.

### Desafíos de Administración
Como administrador, el mayor reto de mTLS no es el cifrado, sino la **Gestión del Ciclo de Vida de los Certificados**:

* **Emisión:** Necesitas una infraestructura de clave pública (PKI) capaz de emitir miles de certificados con tiempos de vida cortos (ej. 24 horas).
* **Rotación Automática:** Los certificados deben renovarse sin intervención humana ni reinicios de servicio.
* **Revocación:** Si un microservicio es comprometido, su certificado debe ser invalidado inmediatamente.

## 5.5. Cabeceras de Seguridad Estrictas: HSTS, CSP y prevención de ataques (XSS, Clickjacking)
Asegurar la capa de transporte con TLS 1.3 y mTLS es solo la mitad de la batalla. Si el servidor web confía ciegamente en el navegador del cliente para manejar el contenido y las redirecciones, la aplicación sigue siendo vulnerable a ataques de degradación y manipulación de la capa de aplicación.

Como administradores de sistemas, nuestra herramienta más efectiva en el perímetro (balanceador de carga o proxy inverso) es la inyección de **Cabeceras de Seguridad HTTP**. Estas directivas instruyen al navegador sobre cómo debe comportarse de manera segura, cerrando vectores de ataque antes de que el código de la aplicación (backend) sea siquiera evaluado.

---

### 1. HSTS (Strict-Transport-Security): Forzando el canal seguro
Incluso con redirecciones 301 de HTTP a HTTPS configuradas en Nginx o HAProxy, existe una ventana de vulnerabilidad. Si un usuario teclea `miempresa.com` en su navegador, la primera petición viaja en texto plano (HTTP). Un atacante en la red (ej. en una red Wi-Fi pública) puede interceptar esta petición mediante un ataque de **SSL Stripping**, actuando como intermediario y manteniendo al usuario en una versión HTTP fraudulenta del sitio.

**HSTS** soluciona esto. Cuando el servidor envía esta cabecera, le ordena al navegador: *"A partir de ahora, y durante el tiempo especificado, comunícate conmigo única y exclusivamente a través de HTTPS. Si intentas usar HTTP, conviértelo internamente a HTTPS antes de que la petición salga a la red"*.

**Sintaxis y directivas:**

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

```

* `max-age`: Tiempo en segundos que el navegador recordará esta política (31536000 equivale a 1 año).
* `includeSubDomains`: (Opcional pero recomendado) Aplica la regla a todos los subdominios.
* `preload`: (Opcional) Indica que el dominio está autorizado para ser incluido en la lista "hardcodeada" de dominios seguros de los navegadores modernos. Si un dominio está en la lista *preload*, el navegador jamás intentará una conexión HTTP, ni siquiera en la primera visita histórica del usuario.

#### ⚠️ Advertencia Operativa (El riesgo de "Bricking")
HSTS es una directiva de "tierra quemada". Como administrador, si habilitas HSTS con un `max-age` largo y posteriormente tu certificado TLS expira, tu proxy falla, o decides volver a HTTP, **tus usuarios no podrán acceder al sitio**. El navegador mostrará un error de seguridad que *no se puede saltar* (no hay botón de "Continuar de todos modos").

* **Mejor práctica de despliegue:** Comience con un `max-age=300` (5 minutos). Monitoree los logs en busca de errores. Suba progresivamente a 1 semana, 1 mes y finalmente 1 año.

---

### 2. CSP (Content-Security-Policy): La guillotina del XSS
El **Cross-Site Scripting (XSS)** ocurre cuando un atacante logra inyectar código JavaScript malicioso en una página web, el cual es ejecutado por el navegador de la víctima.

Históricamente, los desarrolladores intentaban sanitizar los inputs para prevenir XSS. Desde la perspectiva de infraestructura, **CSP** asume que la inyección ocurrirá y neutraliza el daño creando una **lista blanca estricta (Allowlist)** de los orígenes desde los cuales el navegador tiene permitido cargar recursos (scripts, estilos, imágenes, iframes).

**Ejemplo de implementación estricta:**

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://apis.google.com; object-src 'none';

```

En este escenario:

1. Todo el contenido (imágenes, fuentes, etc.) solo puede cargar desde el propio dominio (`'self'`).
2. Los scripts solo pueden cargar desde el propio dominio y desde `apis.google.com`.
3. Si el atacante inyecta `<script src="http://dominio-hacker.com/malware.js"></script>`, el navegador leerá la política CSP y **bloqueará** la ejecución instantáneamente.
4. Cualquier script en línea (ej. `<script>alert('xss')</script>`) o ejecuciones de `eval()` son bloqueadas por defecto a menos que se use la directiva insegura `'unsafe-inline'`.

#### Estrategia de Despliegue en Producción (Report-Only)
Implementar CSP en un sitio heredado (Legacy) romperá la aplicación casi con total seguridad, ya que bloqueará scripts en línea y recursos de terceros no documentados. El patrón arquitectónico correcto es usar el modo auditoría primero:

```nginx
# Configuración en Nginx para modo auditoría
add_header Content-Security-Policy-Report-Only "default-src 'self'; report-uri /endpoint-de-monitoreo";

```

En este modo, el navegador *no bloqueará* nada, pero enviará una petición JSON (reporte) a la URI especificada cada vez que un recurso viole la política. El equipo de operaciones puede analizar estos logs, ajustar las reglas de la CSP y, una vez que el ruido baje a cero, cambiar la cabecera a `Content-Security-Policy` para aplicar los bloqueos reales.

---

### 3. Prevención de Clickjacking y MIME-Sniffing
Además de HSTS y CSP, un bastionado HTTP completo requiere cubrir otros vectores comunes:

#### Clickjacking (Secuestro de clics)
Un atacante crea un sitio web malicioso y carga nuestro sitio legítimo (ej. un portal bancario) dentro de un `<iframe>` invisible (opacidad cero), superponiéndolo sobre botones falsos como "¡Gana un premio!". Cuando el usuario hace clic, en realidad está haciendo clic en el botón "Transferir Fondos" de nuestro sitio.

**Solución Clásica (`X-Frame-Options`):**

```http
X-Frame-Options: DENY
# o
X-Frame-Options: SAMEORIGIN

```

Esta cabecera prohíbe explícitamente que el navegador renderice la página dentro de un frame, iframe u object.

**Solución Moderna (vía CSP):**
La cabecera `X-Frame-Options` está siendo deprecada en favor de la directiva `frame-ancestors` de CSP, que es más granular:

```http
Content-Security-Policy: frame-ancestors 'self' https://socios.miempresa.com;

```

#### MIME-Sniffing (Ataques de confusión de tipo de contenido)
A veces, los desarrolladores permiten a los usuarios subir imágenes (ej. avatar.jpg), pero un atacante sube un archivo `.jpg` que internamente contiene código JavaScript. Si el navegador examina el contenido (hace "sniffing") y decide que parece código, podría ejecutarlo, logrando un XSS.

Para forzar al navegador a respetar estrictamente el `Content-Type` declarado por el servidor web y desactivar su capacidad de deducir el tipo de archivo, inyectamos:

```http
X-Content-Type-Options: nosniff

```

---

### Plantilla de Bastionado para Servidores Web
Para consolidar estos conceptos, aquí tiene una configuración base recomendada (aplicable en el bloque `server` de Nginx o `Frontend` de HAProxy) que establece un estándar alto de seguridad sin romper la funcionalidad de la mayoría de las aplicaciones modernas:

```nginx
# HSTS (6 meses), aplicar a subdominios
add_header Strict-Transport-Security "max-age=15768000; includeSubDomains" always;

# Prevenir Clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevenir MIME-Sniffing
add_header X-Content-Type-Options "nosniff" always;

# CSP Básico (Bloquea objetos como Flash/Java y requiere HTTPS para descargas)
add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; object-src 'none'; upgrade-insecure-requests;" always;

# Ocultar la versión del servidor web (Seguridad por oscuridad, pero buena práctica)
server_tokens off;

```

Nota: La cabecera `X-XSS-Protection` que solía ser estándar ya no se recomienda, ya que los navegadores modernos han eliminado esa funcionalidad por introducir vulnerabilidades propias; una política CSP robusta la reemplaza por completo.

## 5.6. CORS (Cross-Origin Resource Sharing): Preflight requests (`OPTIONS`) y configuración de origen
Si existe un concepto en HTTP que genera más fricción diaria entre los equipos de desarrollo (Frontend) y operaciones (SysAdmins/DevOps), es sin duda **CORS**. "El servidor me da un error de CORS" es un ticket de soporte clásico. Como administradores, nuestra responsabilidad es comprender qué es, por qué ocurre y cómo configurarlo de forma segura en la capa de infraestructura (proxies inversos o balanceadores) sin abrir brechas de seguridad.

### El origen del problema: La Política del Mismo Origen (SOP)
Para entender CORS, primero debemos entender la **Same-Origin Policy (SOP)**. Por diseño, los navegadores web restringen severamente la capacidad de un script (JavaScript) cargado en un origen (ej. `https://mi-frontend.com`) para realizar peticiones HTTP a un origen diferente (ej. `https://api.backend.com`).

Un "Origen" se define por la combinación estricta de tres elementos: **Esquema (Protocolo) + Host (Dominio) + Puerto**. Si alguno de los tres cambia, es un origen diferente.

*SOP es un mecanismo de seguridad fundamental del navegador para evitar que sitios maliciosos roben datos del usuario de otros sitios web donde están autenticados.*

**CORS (Cross-Origin Resource Sharing)** es la "válvula de escape" controlada para la SOP. Es un mecanismo basado en cabeceras HTTP que permite a un servidor declarar explícitamente: *"Sí, autorizo a que el código JavaScript que se ejecuta en `https://mi-frontend.com` lea las respuestas de mis APIs"*.

#### Aclaración crítica para SysAdmins:
CORS **no** es una protección del servidor. El servidor recibe la petición, la procesa y devuelve los datos. **Es el navegador web del usuario el que intercepta la respuesta, lee las cabeceras CORS del servidor y decide si oculta los datos al código JavaScript o se los entrega.** Herramientas como `cURL` o Postman ignoran CORS por completo porque no son navegadores.

---

### Peticiones Simples vs. Peticiones Preflight (`OPTIONS`)
El estándar CORS divide las peticiones HTTP en dos grandes categorías, lo que impacta directamente en el tráfico y la latencia de nuestros servidores:

#### 1. Peticiones Simples (Simple Requests)
Son peticiones que se consideran "seguras" y compatibles con la web antigua (antes de CORS). El navegador envía la petición real inmediatamente.

* **Métodos permitidos:** `GET`, `POST`, `HEAD`.
* **Cabeceras permitidas:** Solo las estándar (`Accept`, `Accept-Language`, `Content-Language`).
* **Content-Type permitidos:** `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`. *(Nota: `application/json` **NO** es simple).*

En estas peticiones, el navegador envía la cabecera `Origin`. Si el servidor responde con un `Access-Control-Allow-Origin` que coincide, el navegador entrega la respuesta al Frontend.

#### 2. Peticiones con Preflight (El método `OPTIONS`)
Si la petición altera el estado (ej. `PUT`, `DELETE`, `PATCH`), o si incluye cabeceras personalizadas (ej. `Authorization: Bearer <token>`, `X-Api-Key`), o usa `application/json`, el navegador considera la petición como "compleja".

Para evitar que el servidor procese una acción destructiva de un origen no autorizado, el navegador envía automáticamente una petición previa de "vuelo de reconocimiento" llamada **Preflight**. Utiliza el método HTTP `OPTIONS`.

```text
Flujo de una petición Preflight (CORS)
-------------------------------------------------------------------------
Navegador (Frontend en mi-app.com)                             API Server
   |                                                             |
   | 1. [PREFLIGHT] OPTIONS /api/data HTTP/1.1                   |
   |    Origin: https://mi-app.com                               |
   |    Access-Control-Request-Method: DELETE                    |
   |    Access-Control-Request-Headers: Authorization            |
   |------------------------------------------------------------>|
   |                                                             |
   | 2. [RESPUESTA PREFLIGHT] HTTP/1.1 204 No Content            |
   |    Access-Control-Allow-Origin: https://mi-app.com          |
   |    Access-Control-Allow-Methods: GET, POST, DELETE          |
   |    Access-Control-Allow-Headers: Authorization              |
   |    Access-Control-Max-Age: 86400                            |
   |<------------------------------------------------------------|
   |                                                             |
   | 3. [El navegador evalúa las cabeceras. ¡Todo coincide!]     |
   |                                                             |
   | 4. [PETICIÓN REAL] DELETE /api/data HTTP/1.1                |
   |    Origin: https://mi-app.com                               |
   |    Authorization: Bearer xyz123                             |
   |------------------------------------------------------------>|
   |                                                             |
   | 5. [RESPUESTA REAL] HTTP/1.1 200 OK                         |
   |    Access-Control-Allow-Origin: https://mi-app.com          |
   |<------------------------------------------------------------|

```

**Impacto en Latencia y la cabecera `Max-Age`:**
Como SysAdmin, notarás que las peticiones Preflight duplican el número de requests HTTP (y la latencia, sumando un RTT adicional). Para mitigarlo, es vital devolver la cabecera `Access-Control-Max-Age`, que le indica al navegador durante cuántos segundos (ej. 86400 = 24 horas) puede cachear el resultado del Preflight y no volver a enviar un `OPTIONS` para ese mismo endpoint y origen.

---

### Estrategias de Configuración de Origen
Configurar `Access-Control-Allow-Origin` (ACAO) correctamente es crucial para la seguridad.

#### El peligroso Comodín (`*`)
```http
Access-Control-Allow-Origin: *

```

Esto permite que **cualquier** sitio web del mundo haga peticiones a tu API. Si es una API pública (como un catálogo del clima abierto), es correcto. Pero si es una API interna o transaccional, es un riesgo.
Además, el estándar CORS prohíbe el uso de `*` si la petición requiere enviar credenciales (Cookies de sesión o autenticación HTTP básica). Si necesitas `Access-Control-Allow-Credentials: true`, el ACAO debe ser un dominio explícito.

#### El Patrón Recomendado: Evaluación Dinámica del Origen
No puedes enviar múltiples dominios en la cabecera ACAO (ej. `Access-Control-Allow-Origin: dominio1.com, dominio2.com` es sintaxis inválida). La solución a nivel de servidor web (Nginx/HAProxy) es leer la cabecera `Origin` entrante, validarla contra una lista blanca (Regex o Map), y si coincide, devolver ese mismo `Origin` en la cabecera de respuesta.

**Ejemplo de implementación robusta en Nginx:**

```nginx
# 1. Definimos una lista blanca usando un mapa (fuera del bloque server)
map $http_origin $cors_origin {
    default "";
    "~^https://(www\.)?miempresa\.com$" "$http_origin";
    "~^https://admin\.miempresa\.com$" "$http_origin";
    "~^http://localhost:3000$"         "$http_origin"; # Solo para dev
}

server {
    listen 443 ssl;
    server_name api.miempresa.com;

    location / {
        # Interceptar el Preflight (OPTIONS)
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' $cors_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Request-Id' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            
            # Devolver 204 sin procesar el backend
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Peticiones reales (GET, POST, etc.)
        # Nota: Usamos 'always' para asegurar que la cabecera se envíe incluso en errores 4xx o 5xx
        add_header 'Access-Control-Allow-Origin' $cors_origin always;
        add_header 'Access-Control-Expose-Headers' 'X-Request-Id' always;
        
        proxy_pass http://backend_api;
    }
}
