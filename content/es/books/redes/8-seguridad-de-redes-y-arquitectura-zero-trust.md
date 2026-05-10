En el ecosistema DevOps, la seguridad ha dejado de ser un paso final para convertirse en el tejido mismo de la infraestructura. Este capítulo aborda la transición desde las defensas perimetrales clásicas —como firewalls con y sin estado— hacia estrategias avanzadas de seguridad en la nube. Exploraremos la importancia del WAF, la mitigación de ataques DDoS y el control granular mediante Security Groups y Network Policies en Kubernetes. Finalmente, nos sumergiremos en la filosofía **Zero Trust**, asumiendo que el perímetro ha desaparecido y que la identidad, el cifrado y la verificación continua son las únicas constantes para proteger servicios modernos contra amenazas como el MITM o el spoofing.

## 8.1 Firewalls: Filtrado sin estado (Stateless) vs. con estado (Stateful), y NGFW

En el núcleo de la seguridad de red tradicional y moderna se encuentra el firewall, un componente diseñado para establecer una barrera entre redes de confianza y redes no confiables. Aunque en el Capítulo 8.6 abordaremos cómo el modelo *Zero Trust* desafía la idea de un perímetro estático, los firewalls siguen siendo la primera línea de defensa para controlar el flujo de tráfico.

Para un ingeniero DevOps, configurar firewalls ya no implica conectar cables en un appliance de hardware, sino definir reglas en código (IaC), configurar tablas de enrutamiento en la nube o inyectar políticas en un clúster de Kubernetes. Para hacerlo correctamente, es imperativo entender cómo las diferentes tecnologías de firewall inspeccionan y toman decisiones sobre los paquetes.

### Filtrado sin estado (Stateless Firewalls)

El filtrado sin estado es la forma más básica y antigua de control de tráfico. Un firewall *stateless* evalúa cada paquete de red de forma completamente aislada. No tiene "memoria" de los paquetes que pasaron antes ni comprende el concepto de una sesión o conexión.

Sus decisiones se basan exclusivamente en los metadatos de las capas 3 y 4 del modelo OSI (que cubrimos en los Capítulos 3 y 4), revisando las siguientes cabeceras:

* IP de origen y destino.
* Puerto de origen y destino.
* Protocolo (TCP, UDP, ICMP).

**El desafío del tráfico de retorno:**
Dado que TCP requiere un flujo bidireccional (solicitud y respuesta), el mayor dolor de cabeza operativo de un firewall sin estado es que **debes abrir reglas en ambas direcciones de forma explícita**. Si un cliente se conecta a tu servidor web por el puerto 443, el servidor responderá utilizando un puerto efímero (normalmente en el rango 32768–65535 o 1024-65535). En un modelo *stateless*, debes crear una regla de entrada para el puerto 443 y una regla de salida enorme que permita el tráfico hacia todos los puertos efímeros.

**Casos de uso en DevOps:**
A pesar de sus limitaciones lógicas, el filtrado sin estado es **extremadamente rápido** y consume muy pocos recursos (CPU/RAM), ya que no necesita mantener bases de datos en memoria. Por ello, se sigue utilizando en la capa de infraestructura perimetral para mitigar ataques volumétricos (DDoS) descartando tráfico basura a la velocidad del hardware. En entornos Cloud, las **Network ACLs (NACLs)** son el ejemplo perfecto de firewalls *stateless*.

### Filtrado con estado (Stateful Firewalls)

Los firewalls *stateful* representan una evolución significativa. Estos sistemas sí tienen memoria: mantienen una "tabla de estados" (State Table) donde registran todas las conexiones activas que atraviesan el dispositivo.

Cuando un paquete llega al firewall, este verifica primero si el paquete pertenece a una conexión ya establecida y registrada en su tabla.

1. Si **es parte de una conexión activa** (por ejemplo, el servidor respondiendo a un cliente), el firewall permite el paso del paquete automáticamente, sin siquiera leer las reglas de filtrado.
2. Si **es el primer paquete de una conexión** (como un paquete TCP `SYN`), el firewall consulta la lista de reglas configuradas por el administrador. Si la regla lo permite, el firewall deja pasar el paquete y crea una nueva entrada en la tabla de estados.

```text
+-------------------------------------------------------------+
|               TABLA DE ESTADOS (Ejemplo simplificado)       |
+---------+-----------------+-----------------+-------+-------+
| PROTO   | IP ORIGEN       | IP DESTINO      | PUERTO| ESTADO|
+---------+-----------------+-----------------+-------+-------+
| TCP     | 203.0.113.5     | 10.0.0.5        | 443   | ESTAB |
| UDP     | 198.51.100.22   | 8.8.8.8         | 53    | RESP  |
+---------+-----------------+-----------------+-------+-------+

```

**Ventajas operativas:**
El filtrado *stateful* simplifica enormemente la gestión. Solo necesitas crear una regla de entrada (Inbound) para permitir el tráfico a tu servicio; el tráfico de respuesta (Outbound) se permite dinámicamente gracias a la tabla de estados. En el ecosistema DevOps, los **Security Groups** de AWS/GCP y el sistema `conntrack` de Linux (utilizado internamente por `iptables` y Kubernetes a nivel de nodo) son ejemplos de filtrado *stateful*.

A nivel de Linux, una regla clásica de `iptables` que demuestra este comportamiento se ve así:

```bash
# Se permite automáticamente el tráfico de conexiones ya establecidas
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Solo se evalúan conexiones nuevas (ej. abriendo el puerto 22)
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT

```

**El punto débil:**
Dado que la tabla de estados se almacena en la memoria RAM, los firewalls *stateful* son vulnerables a ataques de agotamiento de estado (State Exhaustion). Un ataque como un *SYN Flood* busca inundar la tabla con conexiones a medio abrir, consumiendo toda la memoria hasta que el firewall no puede procesar tráfico legítimo.

---

### Diagrama Comparativo: Resolución de una petición HTTP

Para visualizar la diferencia operativa, observa cómo deben configurarse ambos tipos de firewall para permitir que un cliente acceda a un servidor web en el puerto 80:

```text
[CLIENTE] (Puerto Efímero: 54321)  ==== Petición HTTP ===> [SERVIDOR] (Puerto: 80)
                                   <=== Respuesta HTTP ===

============== FIREWALL STATELESS =============================================
REGLAS NECESARIAS:
1. INBOUND:  Permitir origen CUALQUIERA al destino SERVIDOR en puerto 80.
2. OUTBOUND: Permitir origen SERVIDOR al destino CUALQUIERA en puertos 1024-65535.
(Problema: La regla 2 abre una brecha de seguridad masiva para conexiones salientes).

============== FIREWALL STATEFUL ==============================================
REGLAS NECESARIAS:
1. INBOUND: Permitir origen CUALQUIERA al destino SERVIDOR en puerto 80.
(Solución: El firewall detecta el "estado" de la conexión y permite dinámicamente
el flujo de retorno al puerto 54321 del cliente. No requiere regla OUTBOUND).

```

---

### Next-Generation Firewalls (NGFW)

Mientras que los firewalls *stateful* toman decisiones basándose en la capa 3 (IP) y la capa 4 (Puertos TCP/UDP), el tráfico moderno ha hecho que este enfoque sea insuficiente. Hoy en día, casi todo el tráfico (legítimo y malicioso) viaja encapsulado dentro de los puertos 80 y 443 a través de HTTP/HTTPS. Un firewall *stateful* tradicional dejará pasar un paquete malicioso simplemente porque va dirigido al puerto 443 abierto.

Aquí entran los **Next-Generation Firewalls (NGFW)**. Estos operan hasta la **Capa 7 (Aplicación)** del modelo OSI.

Un NGFW no se conforma con saber que la conexión va por el puerto 443; realiza **DPI (Deep Packet Inspection)** para analizar el contenido del paquete (el *payload*).

**Características clave de un NGFW:**

1. **Conciencia de Aplicación (Application Awareness):** Puede distinguir si el tráfico en el puerto 443 es una consulta a una API REST legítima, un usuario subiendo archivos a Dropbox, o un malware comunicándose con un servidor de Comando y Control (C2). Permite crear reglas como: *"Permitir Slack, bloquear BitTorrent"*.
2. **Inspección SSL/TLS:** Como vimos en el Capítulo 5, el tráfico moderno está cifrado. Un NGFW actúa como un proxy (a veces interceptando certificados de forma controlada en redes corporativas) para descifrar el tráfico, analizarlo en busca de amenazas y volver a cifrarlo antes de enviarlo a su destino.
3. **Integración con IPS/IDS:** A diferencia de los sistemas antiguos donde el firewall y el Sistema de Prevención de Intrusos (que veremos en detalle en la sección 8.4) eran cajas separadas, un NGFW unifica estas funciones. Si la firma de un paquete coincide con un exploit conocido (ej. Log4Shell), el NGFW corta la conexión inmediatamente.
4. **Integración de Identidad:** Las políticas pueden basarse en roles de usuarios (ej. integración con Active Directory o IAM en la nube) en lugar de direcciones IP estáticas.

**El NGFW en el pipeline DevOps:**
En infraestructuras ágiles, desplegar un NGFW tradicional (que suele requerir configuraciones manuales o interfaces gráficas pesadas) es un anti-patrón. Sin embargo, los proveedores modernos (como Palo Alto, Fortinet o servicios gestionados como AWS Network Firewall) ofrecen APIs y providers de Terraform. Esto permite a los equipos DevOps inyectar políticas de DPI directamente a través de sus pipelines de CI/CD, asegurando que la inspección profunda de paquetes escale automáticamente junto con los grupos de auto-escalado de la aplicación.

## 8.2 Seguridad perimetral y de aplicación: WAF (Web Application Firewall) y protección DDoS

En la sección anterior vimos cómo los firewalls tradicionales y los NGFW protegen la red evaluando puertos, protocolos y, en cierta medida, el comportamiento de las aplicaciones. Sin embargo, cuando exponemos una aplicación web o una API a Internet, **debemos dejar los puertos 80 y 443 abiertos por diseño**. Esto crea una autopista directa hacia la lógica de nuestra aplicación y nuestras bases de datos.

Para proteger esa autopista, necesitamos herramientas especializadas que entiendan la semántica de la web y puedan absorber impactos masivos. Aquí es donde entran el WAF y la protección DDoS.

### WAF (Web Application Firewall)

Un WAF es una capa de seguridad que opera exclusivamente en la **Capa 7 (Aplicación)** del modelo OSI. Su trabajo no es mirar direcciones IP o puertos, sino realizar una inspección profunda del contenido del tráfico HTTP/HTTPS (las cabeceras, las cookies, el *query string* y el *payload* o cuerpo del mensaje).

Su objetivo principal es proteger las aplicaciones contra vulnerabilidades a nivel de código, mitigando ataques que buscan explotar fallos en el software.

**¿Qué bloquea un WAF?**
El estándar de la industria para las reglas de un WAF es el **OWASP Top 10** (Open Worldwide Application Security Project). Un WAF está diseñado para detectar y bloquear en tiempo real ataques como:

* **Inyección SQL (SQLi):** Intentos de manipular las consultas a la base de datos a través de campos de formulario o parámetros en la URL (ej. `?id=1' OR '1'='1`).
* **Cross-Site Scripting (XSS):** Inyección de scripts maliciosos en la respuesta de la web.
* **Ejecución Remota de Código (RCE):** Explotación de vulnerabilidades conocidas para ejecutar comandos en el servidor.
* **Path Traversal:** Intentos de acceder a archivos del sistema fuera del directorio raíz del servidor web (ej. `../../../../etc/passwd`).

**El WAF en el paradigma DevOps:**
Tradicionalmente, configurar un WAF como ModSecurity requería una afinación manual tediosa y propensa a falsos positivos (bloquear a usuarios legítimos). Hoy, en un entorno de nube (como AWS WAF, Cloudflare o Azure Web Application Firewall), el WAF se gestiona como código (*Security as Code*).

Los equipos DevOps pueden desplegar reglas gestionadas por los proveedores (que se actualizan automáticamente ante nuevas amenazas o vulnerabilidades *Zero-Day*) o crear reglas personalizadas (ej. *Rate Limiting* por IP o bloqueo de tráfico proveniente de la red Tor) directamente a través de Terraform.

### Protección DDoS (Distributed Denial of Service)

Mientras que un WAF protege contra ataques "inteligentes" y precisos, la protección DDoS defiende contra la "fuerza bruta". Un ataque DDoS busca abrumar los recursos de tu infraestructura para que los usuarios legítimos no puedan acceder a tus servicios.

Los ataques DDoS se dividen generalmente en dos categorías que requieren diferentes estrategias de mitigación:

**1. Ataques Volumétricos y de Red (Capas 3 y 4):**
Buscan saturar el ancho de banda de tu red o agotar los recursos de procesamiento de tus enrutadores y firewalls perimetrales (ej. *UDP Floods*, *SYN Floods*, Ataques de Amplificación DNS vistos en capítulos anteriores).

* **Cómo se mitiga:** Ningún servidor individual puede soportar un ataque de 500 Gbps. La mitigación se realiza mediante redes **Anycast** masivas (como Cloudflare o AWS Shield). Estas redes distribuyen el tráfico hostil entre decenas de centros de datos alrededor del mundo (Scrubbing Centers) para absorber el impacto antes de que llegue a tu nube privada virtual (VPC).

**2. Ataques a nivel de Aplicación (Capa 7):**
Son mucho más sofisticados y difíciles de detectar. En lugar de enviar gigabytes de tráfico basura, el atacante envía miles de peticiones HTTP aparentemente legítimas a las rutas más pesadas de tu aplicación (ej. una búsqueda en la base de datos, o la generación de un reporte PDF). Esto consume toda la CPU y memoria de tus servidores web o pods de Kubernetes.

* **Cómo se mitiga:** Aquí el WAF y la protección DDoS trabajan en conjunto. Se utilizan técnicas como **Rate Limiting** (limitar el número de peticiones por segundo que una IP puede realizar a un endpoint específico), análisis de comportamiento (detectar *bots* vs. humanos usando desafíos de JavaScript o CAPTCHAs) y análisis de anomalías en el tráfico.

---

### Diagrama: Arquitectura Perimetral Moderna

En una arquitectura Cloud-Native, la seguridad perimetral se diseña en capas, alejando el tráfico malicioso lo máximo posible de los servidores de cómputo (K8s, EC2, etc.).

```text
[ INTERNET ]
     |
     v
+-------------------------------------------------------------+
| 1. RED ANYCAST / PROTECCIÓN DDoS (Capa 3/4)                 |  <- AWS Shield / Cloudflare
|    (Absorbe ataques volumétricos, SYN Floods, UDP Floods)   |
+-------------------------------------------------------------+
     | Tráfico L3/L4 limpio
     v
+-------------------------------------------------------------+
| 2. CDN & WAF (Capa 7)                                       |  <- AWS WAF / Cloudflare WAF
|    (Inspecciona peticiones HTTP, bloquea SQLi/XSS,          |
|     aplica Rate Limiting y cachea contenido estático)       |
+-------------------------------------------------------------+
     | Tráfico HTTP/HTTPS seguro y validado
     v
+-------------------------------------------------------------+
| 3. CLOUD VPC / RED PRIVADA                                  |
|                                                             |
|   [ Application Load Balancer (ALB) ]                       |
|          |                                                  |
|          v                                                  |
|   [ Ingress Controller / Service Mesh ]                     |
|          |                                                  |
|          v                                                  |
|   ( Pods de Kubernetes / Lógica de Aplicación )             |
+-------------------------------------------------------------+

```

Al desplegar estas capas en el borde de la red (Edge), no solo garantizamos la disponibilidad frente a ataques, sino que reducimos drásticamente los costos de transferencia de datos y cómputo que se generarían si nuestro backend tuviera que procesar todas esas peticiones maliciosas.

## 8.3 Control de acceso en la nube: Security Groups (L4) y Network ACLs

Una vez que el tráfico ha superado nuestras defensas perimetrales (WAF y mitigación DDoS) y entra en nuestra Nube Privada Virtual (VPC), necesitamos controlar cómo fluye internamente. En entornos on-premise, esto solía requerir enrutar el tráfico a través de firewalls físicos internos. En la nube, esta segmentación está definida por software e integrada en la propia infraestructura de red (SDN - Software Defined Networking).

Los dos mecanismos principales para lograr esto, estandarizados por proveedores como AWS, son los **Security Groups (SGs)** y las **Network Access Control Lists (NACLs)**. Aunque ambos operan principalmente en la Capa 4 (evaluando IPs y puertos), sus propósitos, alcances y comportamientos son fundamentalmente distintos y complementarios.

### Security Groups (SGs): La barrera a nivel de instancia

Un Security Group actúa como un firewall virtual asociado directamente a una interfaz de red (ENI), un servidor virtual (ej. EC2) o un nodo/Pod.

**Características clave para DevOps:**

1. **Son Stateful (Con estado):** Como aprendimos en la sección 8.1, si permites que una petición entrante llegue por el puerto 443, la respuesta de salida se permite automáticamente, sin importar el puerto efímero.
2. **Solo reglas de "Permitir" (Allow):** No puedes crear una regla en un SG que diga "Denegar tráfico desde la IP X". Por defecto, todo el tráfico entrante está denegado de forma implícita a menos que exista una regla que lo permita.
3. **Encadenamiento lógico (El superpoder Cloud):** En redes tradicionales, abres puertos hacia direcciones IP. En la nube, las IPs cambian constantemente debido al Auto-Scaling. Los SGs permiten que el origen de una regla sea *otro Security Group*.

* *Ejemplo:* Puedes configurar el SG de tu Base de Datos para que solo acepte tráfico en el puerto 5432 si proviene del "SG de los Servidores Web". No importa si hay 2 o 500 servidores web encendidos; si tienen ese SG asociado, la red confía en ellos.

### Network ACLs (NACLs): La barrera a nivel de subred

Mientras que los SGs protegen el recurso final, las NACLs actúan como una cerca alrededor de toda una **Subred**. Es la primera línea de defensa interna cuando el tráfico entra a la VPC o se mueve entre diferentes subredes.

**Características clave para DevOps:**

1. **Son Stateless (Sin estado):** El tráfico de retorno no se evalúa automáticamente. Si permites la entrada HTTP (puerto 80), debes crear una regla explícita de salida que permita el tráfico hacia los puertos efímeros del cliente (típicamente 1024-65535).
2. **Permiten reglas de "Denegar" (Deny):** Las NACLs son ideales para bloquear tráfico hostil conocido. Si detectas que un bloque CIDR malicioso está atacando tu infraestructura, puedes agregar una regla rápida de DENY en la NACL para bloquearlo antes de que siquiera llegue a tus instancias y consuma ancho de banda.
3. **Procesamiento ordenado:** Las reglas tienen un número (ej. 100, 110, 120) y se evalúan en orden ascendente. En cuanto hay una coincidencia, se aplica la regla y se detiene la evaluación.

---

### Tabla Comparativa de Diseño

| Característica | Security Groups (SG) | Network ACLs (NACL) |
| --- | --- | --- |
| **Alcance** | Interfaz de Red / Instancia / Pod. | Toda la Subred. |
| **Estado** | **Stateful** (Recuerda conexiones). | **Stateless** (Olvida conexiones, requiere reglas In/Out). |
| **Tipos de Regla** | Solo permiten *ALLOW*. | Permiten *ALLOW* y *DENY*. |
| **Evaluación** | Evalúa todas las reglas antes de decidir. | Evalúa en orden numérico (la regla más baja gana). |
| **Caso de uso principal** | Microsegmentación lógica de aplicaciones. | Defensa en profundidad y listas negras globales de IPs. |

---

### Diagrama: El flujo del tráfico en capas

La seguridad en la nube se basa en la "Defensa en Profundidad". Cuando un paquete viaja desde Internet hacia una aplicación de backend, debe atravesar ambas capas:

```text
[ INTERNET ]
     |
     v
+-----------------------+
|  Internet Gateway     |
+-----------------------+
     |
     | (Tráfico ingresa a la Subred Pública)
     v
=======================================================================
|  [ NACL de la Subred ]  -- (Regla 100: ALLOW TCP Inbound Port 443)  |  <- Evaluación STATELESS
=======================================================================
     |
     v
+-------------------------------------------------------------+
|  [ Security Group del Load Balancer ]                       |  <- Evaluación STATEFUL
|  (Regla Inbound: ALLOW 443 desde 0.0.0.0/0)                 |
+-------------------------------------------------------------+
     |
     | (Tráfico enrutado a la Subred Privada)
     v
=======================================================================
|  [ NACL de la Subred Privada ]                              |
=======================================================================
     |
     v
+-------------------------------------------------------------+
|  [ Security Group del Servidor Backend ]                    |  <- MICROSEGMENTACIÓN LÓGICA
|  (Regla Inbound: ALLOW 8080 desde "SG del Load Balancer")   |
+-------------------------------------------------------------+
     |
     v
[ Lógica de Aplicación (Instancia EC2 / Pod) ]

```

### Infraestructura como Código (IaC): Encadenamiento de SGs

Para un ingeniero DevOps, implementar la lógica del diagrama anterior usando Terraform se vería así. Nota cómo evitamos usar IPs, haciendo la arquitectura completamente elástica:

```hcl
# Security Group para el Balanceador de Carga (Público)
resource "aws_security_group" "alb_sg" {
  name        = "alb-security-group"
  description = "Permite trafico web desde Internet"
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Abierto al mundo
  }
}

# Security Group para el Backend (Privado)
resource "aws_security_group" "backend_sg" {
  name        = "backend-security-group"
  description = "Permite trafico SOLO desde el ALB"
  
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    # Referencia directa al SG del Load Balancer (Cero IPs quemadas en código)
    security_groups = [aws_security_group.alb_sg.id] 
  }
}

```

Este enfoque garantiza que si el balanceador de carga escala de 2 a 10 nodos, el backend confiará automáticamente en las nuevas instancias sin tocar una sola regla de red.

## 8.4 Sistemas de Detección y Prevención de Intrusos (IDS/IPS)

Hasta ahora hemos configurado defensas perimetrales para permitir o denegar tráfico basándonos en puertos y protocolos (SGs, NACLs) y hemos protegido nuestras aplicaciones web de ataques HTTP específicos (WAF). Sin embargo, ¿qué sucede si un atacante utiliza un puerto permitido, pero el *payload* (la carga útil) del paquete contiene un *exploit* para una vulnerabilidad de base de datos, o intenta realizar un escaneo interno de la red (movimiento lateral)?

Aquí es donde entran los **Sistemas de Detección de Intrusos (IDS)** y los **Sistemas de Prevención de Intrusos (IPS)**. Mientras que un firewall tradicional actúa como un guardia de seguridad verificando identificaciones en la puerta, un IDS/IPS actúa como un detective analizando el comportamiento y el contenido de lo que hacen las personas una vez dentro.

### IDS vs. IPS: Diferencias Arquitectónicas

Aunque comparten los mismos motores de análisis (como Suricata, Snort o Zeek), su ubicación en la topología de red y su capacidad de respuesta son diferentes:

**1. IDS (Modo Pasivo / Fuera de banda):**
El IDS funciona como una cámara de vigilancia. Recibe una *copia* del tráfico de red (mediante un puerto SPAN en un switch físico, o mediante *VPC Traffic Mirroring* en la nube).

* **Acción:** Analiza la copia del tráfico en tiempo real o en diferido. Si detecta algo malicioso, genera una alerta y la envía a un SIEM (Security Information and Event Management).
* **Ventaja:** No introduce latencia en la conexión y, si el IDS falla, la red sigue funcionando.
* **Desventaja:** No puede bloquear el ataque inicial; para cuando la alerta se emite, el paquete malicioso ya llegó a su destino.

**2. IPS (Modo Activo / En línea):**
El IPS se sitúa directamente en la ruta del tráfico (*in-line*). Todo paquete debe atravesarlo antes de llegar al destino.

* **Acción:** Analiza el paquete y toma una decisión activa: permitirlo, descartarlo (Drop) o resetear la conexión TCP.
* **Ventaja:** Bloquea las amenazas antes de que comprometan el sistema.
* **Desventaja:** Añade un ligero sobrecoste computacional (latencia) y es susceptible a falsos positivos (bloquear tráfico legítimo por error, afectando la disponibilidad).

---

### Diagrama: Flujo de Tráfico IDS vs. IPS

```text
================ Flujo IDS (Detección Pasiva - Fuera de Banda) ================

[ INTERNET ] ====(Tráfico Original)====> [ SWITCH / VPC ROUTER ] ====> [ SERVIDOR ]
                                                |
                                          (Tráfico Espejo)
                                                |
                                                v
                                         [ SISTEMA IDS ] ---> Genera Alerta / Log

================ Flujo IPS (Prevención Activa - En Línea) =====================

[ INTERNET ] ====(Tráfico)====> [ SISTEMA IPS ] ====(Si es seguro)====> [ SERVIDOR ]
                                       |
                                (Si es malicioso)
                                       v
                             [ PAQUETE DESCARTADO ]

```

---

### Métodos de Análisis: Firmas vs. Anomalías

Tanto los IDS como los IPS utilizan dos enfoques principales para identificar tráfico hostil:

1. **Basado en Firmas (Signature-based):** Funciona como un antivirus tradicional. Compara los paquetes contra una base de datos de *exploits* conocidos. Es extremadamente rápido y preciso para vulnerabilidades documentadas (CVEs), pero es ciego ante ataques de Día Cero (*Zero-Days*).
2. **Basado en Anomalías (Behavioral/Heuristic-based):** Construye una "línea base" de lo que es el tráfico normal en tu red. Si de repente un servidor web que normalmente solo habla con la base de datos empieza a enviar peticiones SSH a otros nodos, el sistema lanza una alerta. Es vital para detectar amenazas nuevas, pero requiere *Machine Learning* y un período de entrenamiento, generando más falsos positivos.

### NIDS vs HIDS en la era de los Contenedores (Cloud-Native)

En arquitecturas tradicionales, hablábamos de **NIDS** (Network IDS, analizando el tráfico que fluye por los cables) y **HIDS** (Host IDS, analizando llamadas al sistema operativo de un servidor físico). En el paradigma DevOps y de contenedores, estos conceptos se han modernizado:

* **NIDS en la Nube:** Proveedores como AWS ofrecen servicios gestionados (ej. *AWS Network Firewall*), que en el fondo ejecutan motores *open-source* como **Suricata**. Esto permite a los equipos de plataforma inyectar miles de firmas de seguridad perimetral a través de Terraform sin gestionar servidores. Servicios como *Amazon GuardDuty* llevan el concepto de IDS a la nube analizando *VPC Flow Logs* y eventos de DNS mediante *Machine Learning* sin necesidad de instalar agentes.
* **HIDS en Kubernetes (Seguridad en Tiempo de Ejecución):** En un clúster de Kubernetes, el tráfico entre Pods a menudo está cifrado (mTLS) y es extremadamente efímero, lo que vuelve ciegos a los NIDS tradicionales. Aquí es donde brillan herramientas de HIDS modernas como **Falco** (proyecto graduado de la CNCF). Falco se integra profundamente en el kernel de Linux utilizando **eBPF** (que exploraremos a fondo en el Capítulo 7.8) para auditar qué hace cada contenedor en tiempo de ejecución.

**DevOps en Acción: Reglas como Código (IaC)**

Para un ingeniero DevOps, la configuración de un sistema de detección no se hace mediante una interfaz gráfica, sino a través de código versionado en Git. Aquí tienes un ejemplo de una regla de **Falco** que actúa como un HIDS, detectando si alguien (o un atacante) abre una terminal de comandos dentro de un contenedor en producción:

```yaml
# Regla de Falco para detectar shells interactivos en contenedores
- rule: Terminal shell in container
  desc: A shell was used as the entrypoint/exec point into a container with an attached terminal.
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and container_entrypoint
  output: >
    A shell was spawned in a container with an attached terminal
    (user=%user.name pod=%k8s.pod.name container=%container.name command=%proc.cmdline)
  priority: WARNING
  tags: [container, mitre_execution]

```

Al tratar las firmas de seguridad y las políticas de detección como código, se pueden realizar pruebas automatizadas en los pipelines de CI/CD para asegurar que una nueva versión de la aplicación no viole ninguna política de seguridad antes de ser desplegada.

## 8.5 Microsegmentación de redes y Network Policies en Kubernetes

Hasta ahora hemos hablado extensamente de la seguridad perimetral: el tráfico que entra o sale de nuestra infraestructura hacia Internet (lo que en redes se conoce como tráfico **Norte-Sur**). Sin embargo, en arquitecturas modernas basadas en microservicios, el mayor volumen de tráfico fluye internamente entre los propios servidores o contenedores (tráfico **Este-Oeste**).

Si un atacante logra comprometer un contenedor expuesto al público (por ejemplo, explotando una vulnerabilidad en el WAF o a través de una inyección de código), su siguiente paso será el **movimiento lateral**: escanear la red interna para atacar bases de datos u otros servicios críticos. Para evitar esto, utilizamos la **microsegmentación**.

### El concepto de Microsegmentación

La microsegmentación es una técnica de seguridad que divide el centro de datos o el entorno de nube en segmentos lógicos minúsculos, a menudo bajando hasta el nivel de la carga de trabajo individual (una máquina virtual o un contenedor). En lugar de confiar en que todo el interior de la red es seguro, se aplican políticas de firewall restrictivas a cada microservicio de forma independiente.

Es el equivalente a diseñar un submarino: en lugar de un único casco (que si se perfora, hunde la nave), el submarino tiene decenas de compartimentos estancos. Si una sección se inunda, las compuertas se cierran y el resto del sistema sobrevive.

### El problema de la red plana en Kubernetes

Por diseño, **Kubernetes implementa una red plana**. La premisa fundamental del modelo de red de K8s (que vimos en la sección 7.3) es que *cualquier Pod puede comunicarse con cualquier otro Pod en el clúster*, incluso si pertenecen a diferentes *Namespaces*.

Desde una perspectiva operativa, esto es excelente para la facilidad de despliegue. Desde una perspectiva de seguridad, es un riesgo inmenso. Si no se interviene, un Pod de un entorno de "Desarrollo" podría conectarse directamente a la base de datos del entorno de "Producción" si están en el mismo clúster.

### Network Policies: Los "Security Groups" de Kubernetes

Para resolver esto, Kubernetes ofrece un recurso nativo de la API llamado **Network Policy** (Política de Red). Podríamos considerarlos el equivalente de los Security Groups de la nube (sección 8.3), pero diseñados específicamente para el dinamismo de los contenedores.

**Características clave:**

1. **Basados en Etiquetas (Labels):** A diferencia de los firewalls tradicionales que usan direcciones IP (las cuales cambian constantemente en Kubernetes cuando los Pods se reinician), las Network Policies seleccionan sus objetivos utilizando `podSelector` y `namespaceSelector`. Las reglas se aplican a "los Pods con la etiqueta `app=backend`", sin importar qué IP tengan.
2. **Operan en Capa 3/4:** Filtran el tráfico basándose en bloques CIDR, protocolos (TCP/UDP/SCTP) y puertos.
3. **Tráfico de Entrada (Ingress) y Salida (Egress):** Permiten controlar de forma granular quién puede iniciar una conexión hacia un Pod y hacia dónde puede un Pod iniciar una conexión.

**La dependencia crítica del CNI:**
Es vital entender que Kubernetes *define* la Network Policy, pero **no la aplica**. Quien realiza el filtrado real de los paquetes en el kernel del nodo anfitrión es el plugin **CNI (Container Network Interface)**.

* Si utilizas un CNI básico como *Flannel*, puedes crear docenas de Network Policies, pero Kubernetes las ignorará silenciosamente porque Flannel no soporta esta función.
* Debes utilizar CNIs avanzados como **Calico, Cilium o Weave** (vistos en 7.4) para que estas políticas tengan efecto.

---

### Implementación DevOps: El enfoque de "Default Deny"

La mejor práctica de seguridad (y el primer paso hacia una arquitectura *Zero Trust*) es implementar una política de **Denegación por Defecto (Default Deny)** en cada *Namespace*. Una vez aplicada, ningún Pod podrá enviar ni recibir tráfico, obligando a los desarrolladores a declarar explícitamente qué comunicaciones son legítimas.

**Paso 1: Bloquear todo el tráfico en un Namespace**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: produccion
spec:
  podSelector: {} # Un selector vacío selecciona TODOS los pods del namespace
  policyTypes:
  - Ingress
  - Egress

```

**Paso 2: Permitir comunicación explícita (Frontend a Backend)**
Una vez que el entorno está bloqueado, abrimos "compuertas" específicas. En este ejemplo, permitimos que solo los Pods etiquetados como `frontend` se comuniquen con los Pods `backend` en el puerto 8080.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: produccion
spec:
  # 1. ¿A quién aplica esta regla? (El objetivo)
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  # 2. ¿Qué tráfico de entrada se permite?
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend # Solo pods con esta etiqueta
    ports:
    - protocol: TCP
      port: 8080        # Solo en este puerto

```

---

### Diagrama: Efecto de la Microsegmentación

```text
Sin Network Policies (Red Plana y vulnerable):
[ Pod: Atacante ] --------(Escaneo de red)-------> [ Pod: Base de Datos ] (¡Conexión Exitosa!)
[ Pod: Frontend ] --------(Tráfico legítimo)-----> [ Pod: Base de Datos ] (¡Conexión Exitosa!)

Con Network Policies (Default Deny + Reglas Explícitas):
[ Pod: Atacante ] --X-----(Conexión Bloqueada)---X [ Pod: Base de Datos ] (Tráfico descartado)
[ Pod: Frontend ] --------(Tráfico legítimo)-----> [ Pod: Base de Datos ] (¡Conexión Exitosa!)

```

Al tratar estas políticas como Infraestructura como Código (IaC) y versionarlas junto con el código de la aplicación, los equipos DevOps aseguran que la seguridad nazca integrada (*Shift-Left Security*) y que ninguna aplicación se despliegue en producción sin su microsegmentación correspondiente.

## 8.6 Arquitectura Zero Trust: "Nunca confíes, siempre verifica"

A lo largo de este capítulo hemos construido defensas asumiendo una topología clásica: firewalls en el borde, WAFs protegiendo aplicaciones y microsegmentación en el interior. Históricamente, la seguridad de redes se basaba en el modelo de **"Castillo y foso"** (Castle-and-Moat): todo lo que está fuera de la red corporativa (Internet) es hostil, y todo lo que está dentro de la red local (LAN o VPN) es confiable.

El problema de este modelo es evidente: si un atacante logra cruzar el foso (por ejemplo, mediante *phishing* robando las credenciales de una VPN), tendrá acceso libre a los recursos internos porque la red asume que "si estás dentro, eres de confianza". La arquitectura **Zero Trust** (Confianza Cero) destruye esa suposición.

### El cambio de paradigma

Zero Trust no es una herramienta que se compra, ni un protocolo específico; es un **marco de trabajo y una filosofía de diseño**. Su premisa fundamental es: **La ubicación en la red ya no es un indicador válido de confianza.** No importa si la petición proviene de la red Wi-Fi de las oficinas centrales, de una VPN o de una cafetería pública; cada solicitud de acceso debe ser tratada como si proviniera de una red abierta y hostil.

### Los tres pilares de Zero Trust

Para implementar Zero Trust en un entorno Cloud o DevOps, nos basamos en tres principios rectores:

1. **Verificación Explícita (Identidad y Contexto):**
En lugar de confiar en una dirección IP, la autorización se basa en la identidad del usuario (mediante un *Identity Provider* o IdP) y el contexto de la solicitud. Antes de otorgar acceso, el sistema evalúa:

* ¿Quién es el usuario? (Requiriendo Autenticación Multifactor - MFA).
* ¿Desde qué dispositivo se conecta? (¿Es un equipo corporativo gestionado? ¿Tiene el antivirus actualizado?).
* ¿Es inusual su ubicación o comportamiento?

1. **Acceso de Menor Privilegio (Least Privilege):**
Los usuarios y los servicios (máquinas) solo deben tener el acceso estrictamente necesario para realizar su trabajo, y solo durante el tiempo que lo necesiten. Esto en DevOps se traduce en evitar el uso de credenciales estáticas de larga duración en favor de credenciales efímeras (generadas dinámicamente mediante herramientas como **HashiCorp Vault**) y accesos *Just-In-Time* (JIT).
2. **Asumir la Brecha (Assume Breach):**
Se debe diseñar la infraestructura asumiendo que el atacante *ya está dentro* de la red. Esto justifica las prácticas que vimos en secciones anteriores: cifrar todo el tráfico interno (incluso en la VPC) y aplicar una microsegmentación estricta para limitar el radio de explosión (*blast radius*) de un ataque.

### Zero Trust en la práctica: Del VPN al IAP

Para entender cómo afecta Zero Trust a la arquitectura, comparemos cómo un desarrollador accede a un panel de administración interno.

**El modelo tradicional (VPN):**
El desarrollador se conecta a la VPN. Una vez establecida la conexión de Capa 3, su máquina recibe una IP interna. A partir de ese momento, puede hacer *ping* y escanear cualquier puerto del servidor de administración (y probablemente de otros servidores en la misma subred). El control de acceso recae en la red.

**El modelo Zero Trust (Identity-Aware Proxy - IAP):**
En un modelo Zero Trust (popularizado por el framework *BeyondCorp* de Google), la VPN desaparece. El panel de administración se publica en Internet a través de un **Proxy Consciente de la Identidad** (como Cloudflare Access, AWS EC2 Instance Connect Endpoint o GCP IAP).

1. El desarrollador intenta acceder a `admin.empresa.com`.
2. El Proxy intercepta la petición HTTP (Capa 7).
3. Redirige al usuario a su proveedor de identidad (Okta, Entra ID, Google Workspace) para aplicar MFA y verificar la postura del dispositivo.
4. Si se aprueba, el Proxy permite que pasen *solo* las peticiones HTTP al servidor web backend. El desarrollador nunca obtiene acceso de red (Capa 3) al servidor.

```text
================ Modelo VPN (Tradicional / Confianza Implícita) ================

[ Usuario ] ===(Túnel L3)===> [ Servidor VPN ] ---> (Acceso a la subred interna)
                                       |
                                       +---> [ Servidor Admin ]
                                       +---> [ Base de Datos ] (Riesgo lateral)

================ Modelo IAP (Zero Trust / Verificación Continua) ===============

[ Usuario ] ===(Petición HTTPS)===> [ Identity-Aware Proxy ]
                                            |
                                  (Verifica MFA / Contexto)
                                            |
                                            v
                                     [ Servidor Admin ]
           (La Base de datos está microsegmentada y el proxy no enruta hacia ella)

```

### Zero Trust de Máquina a Máquina (Workload Identity)

Zero Trust no solo aplica a humanos; de hecho, en arquitecturas de microservicios, el 90% del tráfico es de máquina a máquina.

En un clúster de Kubernetes, implementar Zero Trust significa que un contenedor no confía en otro contenedor solo porque están en el mismo nodo. Esto se resuelve implementando un **Service Mesh** (como Istio o Linkerd, vistos en el Capítulo 7.7), que asigna una identidad criptográfica (un certificado) a cada Pod. Toda la comunicación entre ellos se realiza a través de **mTLS (Mutual TLS)**, garantizando que el tráfico no solo esté cifrado, sino que ambos extremos verifiquen criptográficamente quién es el otro en cada solicitud.

## 8.7 Vectores de ataque comunes: Man-in-the-Middle (MITM), Spoofing de IP/ARP y amplificación DNS

Para diseñar arquitecturas resilientes y políticas Zero Trust efectivas, un ingeniero DevOps debe comprender cómo piensan los atacantes y cómo explotan las vulnerabilidades inherentes a los protocolos base de Internet (TCP/IP), los cuales fueron diseñados hace décadas primando la conectividad sobre la seguridad.

A continuación, analizaremos tres de los vectores de ataque de red más clásicos, cómo funcionan a nivel de protocolo y cómo los mitigamos en entornos Cloud y Cloud-Native.

### 1. Man-in-the-Middle (MITM)

En un ataque MITM, un actor malicioso intercepta secretamente y posiblemente altera la comunicación entre dos partes que creen estar comunicándose directamente entre sí.

**Cómo funciona:**
El atacante logra enrutar el tráfico a través de su propia máquina. Si el tráfico viaja en texto plano (como HTTP o Telnet), el atacante puede leer credenciales, *tokens* de sesión o inyectar código malicioso en las respuestas.

**La mitigación DevOps (Criptografía aplicada):**
Como vimos en la sección 5.3 y 8.6, la defensa principal contra el MITM no es un firewall, sino la **criptografía fuerte en tránsito**.

* **En el perímetro (Norte-Sur):** Se fuerza el uso de HTTPS. Se implementa **HSTS (HTTP Strict Transport Security)** en los balanceadores de carga o Ingress Controllers para obligar a los navegadores a rechazar cualquier intento de conexión no cifrada, evitando ataques de *downgrade* (donde el atacante fuerza a la víctima a usar HTTP).
* **En la red interna (Este-Oeste):** Se asume que la red interna ya está comprometida (Zero Trust). Por ello, se despliegan Service Meshes (Istio, Linkerd) en Kubernetes para garantizar que toda la comunicación entre microservicios utilice **mTLS (Mutual TLS)**, cifrando el payload y autenticando ambos extremos, haciendo que cualquier interceptación MITM resulte en datos ilegibles.

### 2. Spoofing de IP y ARP

El *spoofing* (suplantación de identidad) consiste en falsificar los campos de origen en las cabeceras de los paquetes de red para hacerse pasar por una máquina de confianza. Esto ocurre en dos capas distintas:

**ARP Spoofing / Poisoning (Capa 2 - Enlace de Datos):**
El protocolo ARP (sección 2.5) traduce IPs a direcciones MAC en una red local. Carece de mecanismos de autenticación. Un atacante en la misma red local puede enviar mensajes "Gratuitos ARP" falsos, indicando: *"Hola a todos, la IP del router principal (192.168.1.1) ahora está en mi dirección MAC (AA:BB:CC:DD:EE:FF)"*. Todo el tráfico de la subred pasará por el atacante, facilitando un ataque MITM.

* **Mitigación Cloud:** En los proveedores de nube pública (AWS, GCP, Azure), la red está definida por software (SDN) en la capa del hipervisor. **El hipervisor bloquea por diseño las difusiones ARP no autorizadas y el tráfico L2 malicioso**, haciendo que el ARP Spoofing sea inefectivo en VPCs nativas.

**IP Spoofing (Capa 3 - Red):**
El atacante modifica la IP de origen en la cabecera del paquete IP (sección 3.1). Esto se usa a menudo para saltarse firewalls mal configurados que confían ciegamente en IPs internas, o para enmascarar el origen de un ataque.

* **Mitigación Cloud:** Las VPCs implementan controles anti-spoofing estrictos. Si una instancia EC2 intenta enviar un paquete cuya IP de origen no coincide con la IP asignada a su interfaz de red (ENI), el hipervisor descarta el paquete silenciosamente. *(Nota DevOps: Esta es la razón por la que debes deshabilitar la comprobación "Source/Destination Check" cuando configuras una instancia EC2 para que actúe como un NAT Gateway o firewall personalizado).*

### 3. Amplificación DNS (Ataque DDoS Asimétrico)

Este es uno de los ataques DDoS volumétricos más destructivos, explotando la naturaleza "sin estado" (Stateless) del protocolo UDP (sección 4.3).

**Cómo funciona:**
Combina IP Spoofing con la explotación de servidores DNS mal configurados (Resolutores Abiertos).

1. El atacante envía una consulta DNS (ej. solicitando todos los registros del dominio `ejemplo.com`) a un servidor DNS público.
2. La clave del ataque: **El atacante falsifica la IP de origen (IP Spoofing)** poniendo la IP de la víctima en la petición.
3. La petición del atacante es pequeña (aprox. 60 bytes).
4. El servidor DNS responde con una respuesta masiva (hasta 4000 bytes) y, como la IP de origen estaba falsificada, envía esta avalancha de datos a la víctima.

```text
================ Diagrama: Ataque de Amplificación DNS =====================

[ Red de Bots ] --- (1. Petición DNS de 60 Bytes) ----> [ Servidor DNS Abierto ]
  (IP Origen Falsificada = IP de la Víctima)

[ Servidor DNS Abierto ] --- (2. Respuesta DNS de 4000 Bytes) ---> [ VÍCTIMA ]
                            (¡Factor de amplificación: ~66x!)

```

Si el atacante usa una *botnet* para enviar 1 Gigabit por segundo (Gbps) de peticiones DNS falsificadas, el servidor DNS reflejará y amplificará eso enviando **66 Gbps** de tráfico basura a la víctima, saturando instantáneamente su ancho de banda.

**La mitigación DevOps:**

* **Internamente:** Asegurar que los servidores DNS internos (como CoreDNS en Kubernetes o servidores Bind) no actúen como "resolutores abiertos" para Internet. Solo deben responder a IPs de la VPC.
* **Perimetralmente:** Como vimos en la sección 8.2, ningún servidor individual puede soportar un ataque de 66 Gbps. La mitigación requiere situar la aplicación detrás de servicios de protección DDoS Anycast perimetrales (AWS Shield, Cloudflare) que absorben el impacto volumétrico antes de que ingrese a la VPC del cliente.

Con esta sección, hemos completado formalmente el **Capítulo 8**. Hemos establecido una base de seguridad sólida que va desde la comprensión de los firewalls y el WAF, pasando por la microsegmentación en Kubernetes, hasta la adopción del modelo Zero Trust.
