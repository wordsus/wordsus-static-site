Dominar el entorno DevOps exige trascender el código para entender el terreno donde este habita. Este capítulo sienta las bases estructurales de la comunicación digital, desde la abstracción del **Modelo OSI** hasta el pragmatismo del **Modelo TCP/IP**. Analizaremos cómo las **topologías de red** definen la resiliencia de un sistema y cómo los distintos tipos de redes, desde una **LAN** hasta la **SD-WAN**, impactan en la latencia y escalabilidad. Finalmente, desmitificaremos el hardware esencial, traduciendo switches y routers físicos a las abstracciones virtuales que gobiernan la infraestructura moderna en la nube y contenedores.

## 1.1 El Modelo OSI (Open Systems Interconnection) y sus 7 capas

En el mundo del desarrollo y las operaciones (DevOps), los problemas rara vez se limitan a "el código falla" o "el servidor está caído". A menudo, los errores residen en la comunicación entre microservicios, configuraciones de bases de datos, balanceadores de carga o firewalls. Para aislar, diagnosticar y resolver estos problemas sin dar palos de ciego, necesitamos un lenguaje común y un mapa conceptual. Ese mapa es el **Modelo OSI**.

Creado por la Organización Internacional de Normalización (ISO) en 1984, el Modelo OSI es un marco de referencia teórico que divide la comunicación de red en siete capas abstractas e independientes. Aunque en la práctica moderna utilizamos el modelo TCP/IP (que abordaremos en la siguiente sección), el modelo OSI sigue siendo el estándar de oro de la industria para el *troubleshooting* y el diseño de arquitecturas.

Cuando un ingeniero de red te dice "tenemos un problema de Capa 3" o cuando configuras un "Balanceador de carga de Capa 7" en tu proveedor Cloud, están haciendo referencia directa a este modelo.

### El concepto de Encapsulación (PDU)

Antes de explorar las capas, es vital entender cómo viajan los datos. Cuando una aplicación envía información, esta desciende por las 7 capas del modelo. Cada capa añade su propia información de control (cabeceras) a los datos originales, en un proceso llamado **encapsulación**.

La unidad de datos en cada capa recibe un nombre específico, conocido como **PDU (Protocol Data Unit)**. Al llegar al destino, el proceso se invierte (desencapsulación), subiendo por las capas hasta llegar a la aplicación receptora.

A continuación, visualizamos este flujo y las 7 capas de arriba hacia abajo (desde la perspectiva del software hacia el hardware):

```text
+-------------------------------------------------------------------+
|               TRANSMISIÓN DE DATOS EN EL MODELO OSI               |
+---+-----------------+---------------------------------------------+
| N | CAPA            | PDU (Unidad de Datos de Protocolo)          |
+---+-----------------+---------------------------------------------+
| 7 | Aplicación      | Datos                                       |
| 6 | Presentación    | Datos                                       |
| 5 | Sesión          | Datos                                       |
+---+-----------------+---------------------------------------------+
| 4 | Transporte      | [Cabecera L4] + [Datos] = SEGMENTO          |
+---+-----------------+---------------------------------------------+
| 3 | Red             | [Cabecera L3] + [Segmento] = PAQUETE        |
+---+-----------------+---------------------------------------------+
| 2 | Enlace de Datos | [Cabecera L2] + [Paquete] + [FCS] = TRAMA   |
+---+-----------------+---------------------------------------------+
| 1 | Física          | [ 101010111000110... ] = BITS               |
+---+-----------------+---------------------------------------------+
                            |
                            V (Medio de transmisión: Cobre, Fibra, Aire)

```

### Desglose de las 7 Capas (Enfoque DevOps)

**Capa 7: Aplicación (Application)**
Es la capa más cercana al usuario final y a tu código. No se refiere a la aplicación de software en sí (como tu contenedor en Node.js o Python), sino a los *protocolos* que tu aplicación utiliza para comunicarse sobre la red.

* **Contexto DevOps:** Aquí viven protocolos como HTTP/HTTPS, DNS, SSH, y SMTP (los exploraremos a fondo en el **Capítulo 5**). Cuando configuras un *Ingress Controller* en Kubernetes o un WAF (Web Application Firewall), estás operando y filtrando tráfico en esta capa, tomando decisiones basadas en rutas de URL o cabeceras HTTP.

**Capa 6: Presentación (Presentation)**
Actúa como el traductor de la red. Se encarga de formatear los datos para que la capa de aplicación pueda entenderlos, independientemente del sistema operativo o la arquitectura subyacente.

* **Contexto DevOps:** Sus funciones principales incluyen la serialización de datos (como convertir objetos a JSON o XML), la compresión de datos y, crucialmente, la **encriptación y desencriptación** (como el handshake TLS/SSL).

**Capa 5: Sesión (Session)**
Establece, gestiona y termina las conexiones ("sesiones") entre aplicaciones cooperantes. Controla el diálogo entre los equipos, determinando quién transmite, cuándo y por cuánto tiempo.

* **Contexto DevOps:** Hoy en día, muchas de las funciones de las capas 5 y 6 están integradas en los protocolos de la Capa 7 o en bibliotecas de la aplicación. Sin embargo, conceptos como mantener conexiones persistentes en bases de datos (connection pooling) o flujos RPC (Remote Procedure Call) residen conceptualmente aquí.

**Capa 4: Transporte (Transport)**
Responsable de la entrega de extremo a extremo (host-a-host) del mensaje completo. Se asegura de que los datos lleguen libres de errores y en el orden correcto. Su PDU es el **Segmento** (o Datagrama).

* **Contexto DevOps:** Aquí reinan **TCP** y **UDP** (**Capítulo 4**). Esta capa introduce el concepto de **Puertos** lógicos (ej. puerto 80, 443, 3306). Un "Network Load Balancer" (NLB) opera aquí: es extremadamente rápido porque solo mira direcciones IP y Puertos, sin inspeccionar el contenido HTTP de la Capa 7.

**Capa 3: Red (Network)**
Determina la mejor ruta física para que los datos lleguen a su destino a través de múltiples redes conectadas. Su PDU es el **Paquete**.

* **Contexto DevOps:** Esta capa trata sobre el direccionamiento lógico (**IPv4 e IPv6**) y el enrutamiento (Routers). Cuando diseñas tu VPC en la nube, defines rangos CIDR o configuras un NAT Gateway (**Capítulo 3 y 6**), estás diseñando topologías de Capa 3. Si un microservicio no puede alcanzar una API externa, un simple comando `ping` o `traceroute` te ayudará a diagnosticar si el paquete de Capa 3 se está perdiendo en el camino.

**Capa 2: Enlace de Datos (Data Link)**
Proporciona la transferencia de datos nodo a nodo dentro de la *misma* red local. Detecta y, en algunos casos, corrige errores que puedan ocurrir en la Capa Física. Su PDU es la **Trama** (Frame).

* **Contexto DevOps:** Aquí se utiliza el direccionamiento físico (**Direcciones MAC**) y operan los **Switches**. En entornos Cloud modernos, la Capa 2 suele estar abstraída (Software-Defined Networking), pero es fundamental comprenderla al trabajar con redes de contenedores (CNI), VLANs o al depurar problemas de ARP (**Capítulo 2**).

**Capa 1: Física (Physical)**
La base metálica, óptica o de radio de la red. Transmite el flujo de bits (0s y 1s) en bruto a través de un medio físico. Su PDU es el **Bit**.

* **Contexto DevOps:** Cables, fibra óptica, transceptores, tarjetas de red (NICs). Como ingeniero DevOps o Cloud, rara vez tocarás esta capa directamente a menos que trabajes en despliegues *on-premise* o *bare-metal*, pero debes saber que una falla aquí (un cable roto en el centro de datos de AWS) afectará a todas las capas superiores.

### Por qué este modelo es tu mejor herramienta de diagnóstico

El Modelo OSI te permite aplicar la regla de "divide y vencerás". Ante una caída del sistema, los ingenieros experimentados suelen seguir uno de estos enfoques:

1. **Top-Down (Arriba hacia abajo):** Empiezan por la aplicación (¿El certificado TLS expiró en la Capa 6? ¿El servidor web devuelve un error 500 en la Capa 7?) y bajan.
2. **Bottom-Up (Abajo hacia arriba):** Empiezan por la base (¿El cable está conectado? L1 -> ¿Tiene IP configurada? L3 -> ¿El puerto está abierto en el firewall? L4).

Tener este modelo mental claro evitará que pierdas horas buscando un bug en tu código de Kubernetes (Capa 7), cuando en realidad las políticas de red (Security Groups) están bloqueando el tráfico del puerto en la Capa 4.

## 1.2 El Modelo TCP/IP y su relación con el Modelo OSI

Si en la sección anterior establecimos que el Modelo OSI es el "mapa conceptual" perfecto para entender y diagnosticar las redes, el **Modelo TCP/IP** es el terreno real. Mientras que OSI fue un esfuerzo teórico y estandarizado, TCP/IP (creado por el Departamento de Defensa de EE. UU., DoD) fue diseñado con un objetivo pragmático: construir una red de comunicaciones robusta, descentralizada y capaz de sobrevivir a fallos masivos (lo que hoy conocemos como Internet).

En el día a día de un ingeniero DevOps o SRE, implementamos, configuramos y securizamos protocolos de la suite TCP/IP, aunque sigamos usando la terminología del Modelo OSI para comunicarnos.

### La Arquitectura Condensada: Las 4 Capas de TCP/IP

El modelo TCP/IP agrupa las funciones del modelo OSI en una arquitectura más compacta de solo cuatro capas. Esta simplificación refleja cómo funciona realmente el software moderno, donde las fronteras entre ciertas operaciones (como la encriptación y la lógica de la aplicación) suelen estar difuminadas dentro del mismo código.

A continuación, detallamos sus 4 capas de arriba hacia abajo:

**4. Capa de Aplicación (Application Layer)**
Esta capa colapsa las tres capas superiores del modelo OSI (Aplicación, Presentación y Sesión). Aquí es donde reside la lógica de red de tu software.

* **En la práctica:** Agrupa la creación de la carga útil (datos), su formato, encriptación y el control del diálogo. Protocolos como HTTP, SSH, DNS y TLS operan íntegramente en esta capa consolidada.

**3. Capa de Transporte (Transport Layer)**
Es el equivalente directo a la Capa 4 de OSI. Su misión es idéntica: gestionar la comunicación de extremo a extremo, garantizar el control de flujo y la multiplexación mediante el uso de puertos.

* **En la práctica:** Aquí reinan los dos pilares del transporte moderno: **TCP** (fiable, orientado a conexión) y **UDP** (rápido, sin conexión).

**2. Capa de Internet (Internet Layer)**
Equivale a la Capa 3 (Red) del modelo OSI. Su propósito es enrutar los paquetes a través de múltiples redes independientes para que lleguen a su destino.

* **En la práctica:** Esta capa está dominada casi exclusivamente por el protocolo **IP** (Internet Protocol, tanto IPv4 como IPv6) y protocolos de diagnóstico como ICMP (el motor detrás del comando `ping`).

**1. Capa de Acceso a la Red (Network Access / Link Layer)**
Esta capa fusiona las Capas 1 (Física) y 2 (Enlace de Datos) del modelo OSI. Se encarga de todo lo necesario para transmitir un paquete IP a través de un medio físico local.

* **En la práctica:** Incluye las direcciones MAC, las tramas Ethernet, el hardware de red (NICs, switches, cables) y protocolos de resolución local como ARP. En entornos Cloud, esta capa suele estar completamente gestionada por el proveedor (AWS, Azure, GCP), presentándote interfaces de red elásticas (como las ENI) que abstraen la complejidad subyacente.

### Comparativa Visual: OSI vs. TCP/IP

Para entender por qué usamos ambos modelos simultáneamente en la industria, observa cómo se mapean entre sí:

```text
+-----------------------+-----------------------+
|      MODELO OSI       |     MODELO TCP/IP     |
+-----------------------+-----------------------+
| 7. Aplicación         |                       |
| 6. Presentación       | 4. Aplicación         |
| 5. Sesión             |                       |
+-----------------------+-----------------------+
| 4. Transporte         | 3. Transporte         |
+-----------------------+-----------------------+
| 3. Red                | 2. Internet           |
+-----------------------+-----------------------+
| 2. Enlace de Datos    |                       |
| 1. Física             | 1. Acceso a la Red    |
+-----------------------+-----------------------+

```

### La Paradoja del Vocabulario DevOps

Llegados a este punto, podrías preguntarte: *"Si Internet funciona con TCP/IP de 4 capas, ¿por qué sigo escuchando hablar de problemas de Capa 7 o Capa 4?"*

Esta es la paradoja del vocabulario de infraestructura moderno: **Hablamos en OSI, pero ejecutamos en TCP/IP.**

* Cuando configuras un **ALB (Application Load Balancer)** en AWS, la documentación dice que es un balanceador de **Capa 7**. Se refiere a la Capa 7 de OSI (analiza cabeceras HTTP), aunque en TCP/IP corresponda a la Capa 4 (Aplicación).
* Cuando configuras un **NLB (Network Load Balancer)**, se describe como un balanceador de **Capa 4**. Se refiere a la Capa 4 de OSI (analiza puertos TCP/UDP), que casualmente coincide con la Capa 3 (Transporte) de TCP/IP en función, pero no en número.
* Cuando configuras reglas en un **Security Group** o un Firewall moderno, bloqueas el tráfico basándote en IPs (**Capa 3** OSI) y Puertos (**Capa 4** OSI).

Comprender esta relación dual es lo que separa a un operador que simplemente "copia y pega configuraciones" de un ingeniero capaz de diseñar arquitecturas resilientes y diagnosticar problemas complejos de conectividad entre microservicios y nubes.

## 1.3 Topologías de red físicas y lógicas (Estrella, Malla, Árbol, Anillo)

Cuando diseñamos la arquitectura de una aplicación, decidimos cómo se comunican los microservicios entre sí. De manera análoga, en el diseño de redes, la **topología** es el mapa estructural que define cómo se interconectan los nodos (servidores, routers, switches).

Para un ingeniero DevOps o Cloud, comprender estas estructuras es fundamental, ya que los patrones de diseño físico tradicionales han evolucionado y se han transformado en los patrones de arquitectura lógica que usamos hoy en la nube y en Kubernetes.

Antes de explorar los tipos, debemos establecer una distinción crucial:

* **Topología Física:** Es la disposición real de los cables y el hardware. Si entras a un Centro de Datos, esto es lo que ves.
* **Topología Lógica:** Es la forma en que los datos fluyen a través de la red, independientemente de cómo estén conectados físicamente los cables. En la nube pública (AWS, Azure, GCP), la topología física está completamente abstraída; tu trabajo se centra 100% en diseñar la topología lógica (redes definidas por software).

A continuación, analizamos las cuatro topologías clásicas y su traducción al entorno DevOps moderno.

### 1. Topología en Estrella (Star)

Es el diseño más común en las redes locales (LAN) modernas. Todos los nodos (ordenadores, servidores) se conectan a un dispositivo central, normalmente un Switch o un Hub. Toda la comunicación pasa obligatoriamente por este nodo central.

```text
        [Nodo A]
           |
[Nodo B]--[SWITCH CENTRAL]--[Nodo C]
           |
        [Nodo D]

```

* **Ventajas:** Fácil de instalar y escalar. Si el cable del Nodo A se rompe, el resto de la red sigue funcionando. El diagnóstico de problemas (troubleshooting) es sencillo.
* **Desventajas:** El switch central es un **Punto Único de Fallo (SPOF - Single Point of Failure)**. Si el switch cae, toda la red se paraliza.
* **El enfoque DevOps (Hub and Spoke):** En Cloud, rara vez conectamos VPCs (Virtual Private Clouds) todas contra todas. En su lugar, usamos una topología en estrella lógica conocida como *Hub and Spoke*. Un enrutador central (como un *AWS Transit Gateway* o un *Azure Virtual WAN*) actúa como el Hub central, y las diferentes VPCs de desarrollo, producción y bases de datos actúan como los radios (Spokes).

### 2. Topología en Malla (Mesh)

En una red en malla, los nodos están interconectados entre sí. En una **malla completa (Full Mesh)**, cada nodo tiene una conexión directa con todos los demás nodos de la red. En una **malla parcial**, solo algunos nodos críticos tienen conexiones múltiples.

```text
      [Nodo A]--------[Nodo B]
       |  \          /  |
       |    \      /    |
       |      \  /      |
       |      /  \      |
       |    /      \    |
       |  /          \  |
      [Nodo C]--------[Nodo D]

```

* **Ventajas:** Tolerancia a fallos extrema. Si un enlace se corta, el tráfico se enruta automáticamente por un camino alternativo.
* **Desventajas:** A nivel físico, es costosísima y muy compleja de cablear y configurar (la cantidad de conexiones crece exponencialmente con la fórmula `n(n-1)/2`).
* **El enfoque DevOps (Service Mesh y Peering):** La malla es un concepto vital hoy en día.

1. **VPC Peering:** Si conectas 5 VPCs entre sí de forma directa (sin un Hub central), estás creando una malla lógica.
2. **Service Mesh (Istio, Linkerd):** En Kubernetes, un Service Mesh crea una red en malla de proxies (sidecars) que controlan la comunicación lógica directa entre microservicios, ofreciendo resiliencia y rutas alternativas si un pod falla.

### 3. Topología en Árbol (Tree / Jerárquica)

Es una combinación de múltiples topologías en estrella conectadas a un bus central o a switches de nivel superior. Crea una jerarquía estructurada de nodos.

```text
               [Switch Core (Núcleo)]
                 /                \
   [Switch Distribución]       [Switch Distribución]
      /           \               /           \
[Switch Acceso] [Switch Acceso] [Switch Acceso] [Switch Acceso]
   /    \          /    \          /    \          /    \
[Nodos] [Nodos] [Nodos] [Nodos] [Nodos] [Nodos] [Nodos] [Nodos]

```

* **Ventajas:** Altamente escalable y estructurada. Divide la red en zonas lógicas y manejables.
* **Desventajas:** Dependencia jerárquica. Si un switch de distribución falla, toda la "rama" inferior queda aislada.
* **El enfoque DevOps (Centros de Datos y DNS):** Esta es la arquitectura física de los centros de datos masivos (arquitecturas *Spine-and-Leaf* derivadas del árbol). A nivel lógico, el protocolo DNS (Domain Name System) que configurarás a diario (Capítulo 5) funciona exactamente como un árbol jerárquico distribuido globalmente.

### 4. Topología en Anillo (Ring)

Los nodos se conectan en un círculo cerrado. Los datos viajan en una única dirección (o en ambas, si es un anillo doble para redundancia) pasando por cada nodo hasta llegar a su destino.

```text
        [Nodo A]------[Nodo B]
       /                      \
   [Nodo F]                [Nodo C]
       \                      /
        [Nodo E]------[Nodo D]

```

* **Ventajas:** No requiere un nodo central para gestionar la conectividad, y el rendimiento es predecible bajo alta carga.
* **Desventajas:** En un anillo simple, si un nodo o enlace falla, el anillo se rompe y la red cae. Añadir un nuevo nodo interrumpe temporalmente la red.
* **El enfoque DevOps (Bases de datos distribuidas):** A nivel de red física de área local, el anillo (como *Token Ring*) está obsoleto frente a la topología en Estrella con Ethernet. Sin embargo, a nivel lógico, el concepto sobrevive. Sistemas distribuidos modernos, como la base de datos NoSQL **Apache Cassandra** o el enrutamiento de peticiones P2P, utilizan "Token Rings" lógicos para distribuir la carga y replicar los datos de manera uniforme entre múltiples nodos.

## 1.4 Tipos de redes según su alcance (LAN, WAN, MAN, PAN, SD-WAN)

En la arquitectura de sistemas y el despliegue de aplicaciones, la distancia física y lógica importa. La latencia, el ancho de banda y las estrategias de redundancia cambian drásticamente si dos microservicios se comunican dentro del mismo rack de servidores o si lo hacen a través del océano.

Clasificar las redes según su alcance geográfico nos ayuda a entender las limitaciones físicas y los protocolos adecuados para cada escenario. Aunque en el mundo Cloud estas fronteras físicas están abstraídas, comprenderlas es vital para diseñar sistemas distribuidos resilientes y configurar los *timeouts* correctos en nuestro código.

Aquí tienes la clasificación escalonada de las redes, desde la más pequeña hasta la más extensa, con su traducción al mundo DevOps.

### 1. PAN (Personal Area Network)

Es la red de menor alcance, diseñada para cubrir el entorno inmediato de una persona (generalmente unos pocos metros).

* **Tecnologías comunes:** Bluetooth, USB, NFC, Zigbee.
* **Contexto DevOps:** Prácticamente nulo en el día a día de infraestructura Cloud o Backend. Su relevancia se limita a equipos que desarrollan software para dispositivos IoT (Internet of Things) o *wearables*, donde las limitaciones de energía y el tamaño de los paquetes de datos son críticos.

### 2. LAN (Local Area Network)

Una red de área local conecta dispositivos dentro de un área geográfica limitada, como una oficina, un edificio o un centro de datos. Se caracterizan por ofrecer altísimas velocidades (1 Gbps a 100 Gbps+) y latencias minúsculas (a menudo por debajo de 1 milisegundo).

* **Tecnologías comunes:** Ethernet, Wi-Fi (WLAN).
* **Contexto DevOps:** La LAN es tu entorno de trabajo por defecto. Cuando despliegas un clúster de Kubernetes, los nodos se comunican a través de una LAN subyacente. A nivel Cloud, una **Subred (Subnet)** dentro de una VPC es la representación lógica de una LAN. Las bases de datos y sus réplicas de lectura principales deben estar siempre en la misma LAN lógica para garantizar la consistencia y el rendimiento.

### 3. MAN (Metropolitan Area Network)

Su alcance es intermedio, abarcando una ciudad o un campus corporativo grande. Suele interconectar varias LANs utilizando infraestructura de fibra óptica de alta capacidad.

* **Tecnologías comunes:** Anillos de fibra óptica, Metro Ethernet.
* **Contexto DevOps (Zonas de Disponibilidad):** En la nube pública, la MAN equivale a la interconexión entre las **Availability Zones (AZs)** dentro de una misma Región. Por ejemplo, `us-east-1a` y `us-east-1b` en AWS son centros de datos físicamente separados por varios kilómetros en la misma región metropolitana, conectados por fibra dedicada para ofrecer latencias de un solo dígito (1-2 ms). Diseñar para alta disponibilidad implica desplegar en múltiples AZs, aprovechando la resiliencia de una topología MAN.

### 4. WAN (Wide Area Network)

Las redes de área amplia conectan múltiples LANs o MANs a través de grandes distancias geográficas (países o continentes). Internet es, por definición, la WAN más grande del mundo. Las velocidades varían enormemente y la latencia es un factor crítico (generalmente entre 20 ms y más de 200 ms).

* **Tecnologías comunes:** MPLS, Fibra transoceánica, Satélite, 5G.
* **Contexto DevOps:** Operas en la WAN cuando replicas datos entre diferentes regiones (ej. de Europa a EE. UU.) para *Disaster Recovery*, o cuando configuras una CDN (Content Delivery Network) para acercar el contenido estático a los usuarios finales y mitigar la latencia de la WAN.

### 5. SD-WAN (Software-Defined Wide Area Network)

Esta no es una clasificación por tamaño, sino **una revolución en cómo gestionamos la WAN**. Tradicionalmente, conectar sucursales y centros de datos (WAN) requería hardware costoso y enlaces dedicados rígidos (como MPLS) configurados manualmente. SD-WAN aplica los principios de las redes definidas por software (SDN) a las conexiones de larga distancia.

* **El cambio de paradigma:** SD-WAN desacopla el plano de control (el "cerebro" que decide por dónde va el tráfico) del plano de datos (los cables y routers físicos). Permite agrupar diferentes tipos de conexiones (Internet de banda ancha, 4G/5G, MPLS) y enrutar el tráfico dinámicamente según el rendimiento en tiempo real.
* **Contexto DevOps:** SD-WAN trata la infraestructura de red como código (IaC). En lugar de entrar por SSH a 50 routers diferentes, un ingeniero puede aplicar políticas de enrutamiento a través de una API centralizada. Por ejemplo, se puede programar una política que diga: *"El tráfico de Zoom debe usar la conexión de fibra primaria, pero las copias de seguridad de la base de datos pueden ir por la conexión 5G secundaria"*.

---

### Resumen visual de alcance y latencia esperada:

```text
Menor Distancia / Menor Latencia / Mayor Ancho de Banda
  ^
  |  [PAN]    ~ 1 a 10 metros         (Bluetooth)
  |  [LAN]    ~ 10 a 1,000 metros     (< 1 ms, Centro de Datos / Subredes)
  |  [MAN]    ~ 1 a 100 kilómetros    (1-5 ms, Zonas de Disponibilidad / AZs)
  |  [WAN]    ~ Global / Continentes  (20-300+ ms, Internet / Inter-Región)
  v
Mayor Distancia / Mayor Latencia / Menor Ancho de Banda Garantizado

* SD-WAN = La capa de software (orquestación) que gestiona y optimiza de forma 
           programática la conectividad WAN.

```

Comprender esta escala de alcance te permite tomar decisiones arquitectónicas críticas. Si un microservicio A llama a un microservicio B 1000 veces por segundo, ambos deben estar en la misma LAN (Subred). Si están separados por una WAN, la latencia acumulada colapsará tu aplicación instantáneamente.

## 1.5 Hardware de red esencial: Switches, Routers, Hubs y Puntos de Acceso

Como profesionales DevOps, SREs o ingenieros Cloud, pasamos nuestros días escribiendo código en Terraform, configurando VPCs o definiendo políticas de red en Kubernetes. Es fácil caer en la ilusión de que la red es puramente código. Sin embargo, la nube sigue siendo, en última instancia, **el hardware de otra persona**.

Comprender los dispositivos físicos tradicionales no es un ejercicio de nostalgia; es estrictamente necesario porque **las abstracciones de red definidas por software (SDN) en la nube y en los contenedores simulan exactamente el comportamiento de este hardware**.

A continuación, desmitificamos los cuatro pilares del hardware de red y revelamos su equivalente en tu día a día.

### 1. Hubs (Concentradores): El eco del pasado (Capa 1)

Un Hub es el dispositivo de interconexión más básico y, hoy en día, obsoleto. Opera exclusivamente en la **Capa 1 (Física)** del Modelo OSI.

* **¿Cómo funciona?** Es un simple repetidor multipuerto. Cuando recibe una señal eléctrica (bits) por un puerto, la amplifica y la copia "a ciegas" hacia *todos* los demás puertos, sin importar quién sea el destinatario real.
* **El problema:** Al enviar todo a todos, crea un enorme **Dominio de Colisión**. Si dos equipos hablan al mismo tiempo, las señales chocan, se corrompen y deben retransmitirse, hundiendo el rendimiento de la red.
* **Contexto DevOps:** Físicamente ya no los verás. Sin embargo, conceptualmente te enseñan por qué el tráfico de *broadcast* indiscriminado es peligroso. Si alguna vez configuras mal una red *overlay* en Kubernetes y generas una "tormenta de broadcast", estarás replicando el caos que solía causar un Hub físico.

### 2. Switches (Conmutadores): Los reyes de la red local (Capa 2)

Si el Hub era ciego, el Switch tiene memoria fotográfica. Opera en la **Capa 2 (Enlace de Datos)** y es el dispositivo principal para construir una LAN.

* **¿Cómo funciona?** Un Switch inspecciona las **direcciones MAC** de las tramas Ethernet que recibe. Construye dinámicamente una tabla en su memoria (la Tabla CAM) que mapea cada dirección MAC al puerto físico específico donde está conectado ese dispositivo. Cuando el Servidor A envía datos al Servidor B, el Switch reenvía el tráfico *únicamente* al puerto del Servidor B.
* **El beneficio:** Elimina las colisiones y permite comunicaciones simultáneas a máxima velocidad (Unicast).
* **Contexto DevOps / Nube:** Esta es la abstracción que más utilizarás.
* Cuando Docker crea su red por defecto (`docker0`), está instanciando un **Linux Bridge**, que es literalmente un Switch virtual por software dentro del kernel de tu servidor.
* Cuando hipervisores como VMware o KVM alojan máquinas virtuales, utilizan *vSwitches* (Virtual Switches) para que las VMs hablen entre sí antes de salir al hardware físico.

### 3. Routers (Enrutadores): Las fronteras de Internet (Capa 3)

Mientras que los Switches conectan dispositivos dentro de la *misma* red, los Routers conectan **redes diferentes** entre sí. Operan en la **Capa 3 (Red)** del Modelo OSI.

* **¿Cómo funciona?** Los Routers no entienden de direcciones MAC, hablan en **direcciones IP**. Inspeccionan el paquete IP, consultan su **Tabla de Enrutamiento** (un mapa lógico de redes conocidas) y deciden cuál es el mejor salto (*next hop*) para acercar ese paquete a su destino final. También suelen encargarse de traducir IPs privadas a públicas mediante NAT (Network Address Translation).
* **Contexto DevOps / Nube:** El enrutamiento es el corazón de la infraestructura Cloud.
* En AWS o GCP, un **Internet Gateway (IGW)** o un **NAT Gateway** son Routers virtuales altamente disponibles.
* Las **Route Tables** (Tablas de Enrutamiento) que defines en Terraform son las instrucciones directas que le das a los routers virtuales del proveedor Cloud sobre qué hacer con el tráfico (ej. "Todo el tráfico `0.0.0.0/0` mándalo al IGW").

### 4. Puntos de Acceso (Access Points o APs): El puente inalámbrico (Capas 1 y 2)

Un AP extiende una red cableada (Ethernet) hacia el espectro inalámbrico (Wi-Fi).

* **¿Cómo funciona?** Recibe las señales de radiofrecuencia (Capa 1), las decodifica y las traduce a tramas Ethernet estándar (Capa 2) para inyectarlas en el Switch físico de la red local. Actúan como un "puente" (*bridge*) entre dos medios físicos distintos (aire y cobre/fibra).
* **Contexto DevOps:** Como ingeniero de infraestructura backend, rara vez gestionarás APs, a menos que administres la infraestructura de oficinas bajo un modelo de **Zero Trust Network Access (ZTNA)**, donde debes asegurar que un desarrollador conectado al Wi-Fi corporativo tenga el mismo nivel de autenticación rigurosa que alguien conectado desde una cafetería pública.

---

### Mapa conceptual de equivalencias: Del Hardware al Software

Para resumir este capítulo y consolidar tu modelo mental, observa cómo los equipos físicos pesados de los años 90 se han convertido en líneas de código YAML o HCL en la actualidad:

```text
+-------------------+----------------------+------------------------------------------+
| Dispositivo Físico| Capa OSI Principal   | Equivalente en Cloud / DevOps (Software) |
+-------------------+----------------------+------------------------------------------+
| Cable / Fibra     | Capa 1 (Física)      | VPC Peering / Direct Connect             |
| Switch            | Capa 2 (Enlace)      | Linux Bridge (Docker) / vSwitch          |
| Router            | Capa 3 (Red)         | VPC Route Table / Transit Gateway        |
| Firewall Físico   | Capa 3, 4 y 7        | Security Groups / Network Policies (K8s) |
| Balanceador Físico| Capa 4 y 7           | ALB / NLB / Ingress Controller           |
+-------------------+----------------------+------------------------------------------+

```

Con este sólido fundamento sobre cómo se mueven los bits y paquetes en la base de la infraestructura, estamos listos para descender a las trincheras y analizar cómo los dispositivos se encuentran y se comunican dentro de una red local.
