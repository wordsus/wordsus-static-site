Este capítulo explora el tejido conectivo fundamental de las infraestructuras de red: la **Capa de Enlace de Datos**. Mientras que el direccionamiento IP nos permite navegar por la web, la Capa 2 es la responsable de que los datos se muevan con éxito entre dos puntos físicos en una red local (LAN).

Como profesional DevOps, comprender este nivel es vital para diagnosticar latencias, configurar redes de contenedores y asegurar la alta disponibilidad. Analizaremos desde la identidad física de los dispositivos (**MAC**) y la eficiencia del transporte (**MTU**), hasta la segmentación inteligente mediante **VLANs** y los mecanismos de resiliencia frente a bucles (**STP**).

## 2.1 Direccionamiento físico: Entendiendo las Direcciones MAC

Para que la comunicación exista en una red local, no basta con conectar cables o emitir señales Wi-Fi; los dispositivos necesitan saber quién es quién en el medio físico. Aquí es donde entra en juego la **Dirección MAC** (Media Access Control), el identificador fundamental de la Capa de Enlace de Datos (Capa 2).

A diferencia de las direcciones IP (que son lógicas y enrutables a través de Internet, como veremos en el Capítulo 3), la dirección MAC es **física y local**. Se graba en la Tarjeta de Interfaz de Red (NIC) durante su fabricación y, en teoría, es globalmente única e inmutable.

Para usar una analogía clásica: si la dirección IP es tu dirección postal (que cambia si te mudas de ciudad), la dirección MAC es tu número de pasaporte o documento de identidad (va contigo sin importar dónde estés).

### Estructura de una Dirección MAC

Una dirección MAC está compuesta por **48 bits** (6 bytes). Para facilitar su lectura, se representa en formato hexadecimal, dividida en seis pares de caracteres.

Su estructura no es aleatoria; está dividida exactamente por la mitad para identificar tanto al creador del hardware como al dispositivo específico:

```text
+---------------------------------------+---------------------------------------+
|        OUI (24 bits / 3 bytes)        |        NIC / UAA (24 bits / 3 bytes)  |
+---------------------------------------+---------------------------------------+
|     00   :   1A   :   2B              |     3C   :   4D   :   5E              |
+---------------------------------------+---------------------------------------+
| Identificador Único de Organización   | Asignado por el fabricante            |
| Asignado por el IEEE al fabricante    | (Identificador único del dispositivo) |
| (Ej. Intel, Cisco, Apple, VMware)     |                                       |
+---------------------------------------+---------------------------------------+

```

* **OUI (Organizationally Unique Identifier):** Los primeros 24 bits identifican al fabricante del hardware. El IEEE (Institute of Electrical and Electronics Engineers) gestiona y asigna estos bloques.
* **NIC/UAA (Universally Administered Address):** Los últimos 24 bits son asignados secuencialmente por el fabricante para garantizar que no existan dos tarjetas de red con la misma MAC en el mundo.

### Formatos de representación

Dependiendo del sistema operativo o el fabricante del equipo de red, puedes encontrarte la misma dirección MAC escrita de diferentes maneras:

* **Linux / macOS:** `00:1A:2B:3C:4D:5E` (Separado por dos puntos).
* **Windows:** `00-1A-2B-3C-4D-5E` (Separado por guiones).
* **Cisco / Equipos de red:** `001A.2B3C.4D5E` (Separado por puntos en grupos de cuatro).

### Tipos de Direcciones MAC

En una red local, los switches utilizan las direcciones MAC para decidir por qué puerto físico deben enviar los datos (las tramas). Existen tres formas en las que una MAC puede ser utilizada como destino:

1. **Unicast (Uno a Uno):** Dirigida a una única interfaz de red específica. Es el tráfico normal entre dos hosts.
2. **Multicast (Uno a Varios):** Dirigida a un grupo de dispositivos suscritos a un flujo de datos específico. El primer bit del primer byte de la MAC siempre es `1` en estas direcciones (Ej. `01:00:5E:...` para IPv4 Multicast).
3. **Broadcast (Uno a Todos):** Dirigida a absolutamente todos los dispositivos en el mismo segmento de red (Dominio de Broadcast). La dirección MAC de broadcast es siempre `FF:FF:FF:FF:FF:FF`.

### ¿Por qué le importa la Dirección MAC a un DevOps?

Aunque la dirección MAC parece un concepto de infraestructura pura, tiene implicaciones directas en el despliegue de software, la nube y los contenedores:

* **Infraestructura como Código (Cloud):** Cuando provisionas una Elastic Network Interface (ENI) en AWS usando Terraform, a esa interfaz virtual se le asigna una dirección MAC virtual. Si un software tiene licenciamiento atado a la MAC (legacy), migrarlo a la nube requiere gestionar estas MACs estáticas.
* **Seguridad y Spoofing:** Aunque la MAC viene grabada de fábrica, los sistemas operativos modernos permiten alterarla temporalmente por software (MAC Spoofing). Esto es útil para privacidad en redes públicas, pero también es un vector de ataque para suplantar identidades en una LAN.
* **Contenedores y Virtualización:** Motores como Docker o hipervisores como KVM generan direcciones MAC virtuales de forma dinámica para cada contenedor o máquina virtual (las interfaces `veth`). Identificar la OUI de una MAC te puede decir rápidamente si el tráfico proviene de un contenedor local, una VM de VMware o hardware físico.

Puedes verificar las direcciones MAC (denominadas `link/ether`) de tu entorno Linux actual inspeccionando las interfaces con el comando `ip`:

```bash
# El comando ip link muestra la capa L2 de las interfaces de red
$ ip link show eth0

2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff

```

> **Nota:** En el ejemplo anterior, `link/ether 02:42:ac:11:00:02` representa la dirección MAC de la interfaz `eth0`, mientras que `brd ff:ff:ff:ff:ff:ff` es la dirección de broadcast en esa red.

## 2.2 Tramas Ethernet y MTU (Maximum Transmission Unit)

Una vez que los dispositivos pueden identificarse mediante sus direcciones MAC, necesitan un formato estandarizado para enviarse información a través del cable físico o el aire. En la Capa de Enlace de Datos (Capa 2), la unidad fundamental de transmisión se denomina **trama** (frame).

Es crucial hacer una distinción en la nomenclatura que a menudo confunde en los inicios: en la Capa 2 hablamos de *tramas*, mientras que en la Capa 3 (IP) hablaremos de *paquetes*. La función principal de la trama Ethernet es encapsular el paquete IP, añadirle las direcciones MAC de origen y destino, y enviarlo al siguiente salto físico.

### Estructura de una Trama Ethernet (802.3)

Imagina la trama como un sobre de correo físico. El sobre tiene un remitente, un destinatario, un sello que indica el tipo de envío, el contenido en sí mismo y un precinto de seguridad. A nivel de bits, se ve de la siguiente manera:

```text
+-----------+-----------+-----------+-----------+-------------------------+-----------+
| Preámbulo | MAC Dest. | MAC Orig. | EtherType | DATOS (Payload / MTU)   | FCS       |
| (8 bytes) | (6 bytes) | (6 bytes) | (2 bytes) | (46 a 1500 bytes)       | (4 bytes) |
+-----------+-----------+-----------+-----------+-------------------------+-----------+
                      \___________________/
                           Cabecera L2

```

* **Preámbulo:** Una secuencia de bits que sirve para sincronizar los relojes del emisor y el receptor.
* **MAC de Destino y Origen:** Direccionamiento físico (lo que vimos en la sección 2.1).
* **EtherType:** Indica qué protocolo de capa superior viene dentro de la sección de datos (por ejemplo, `0x0800` para IPv4, `0x86DD` para IPv6, o `0x0806` para ARP).
* **Datos (Payload):** El paquete IP real que se está transportando.
* **FCS (Frame Check Sequence):** Un valor de comprobación (generalmente un hash CRC32) que el receptor utiliza para verificar si la trama se corrompió por ruido eléctrico o colisiones durante el viaje. Si el FCS no coincide, la trama se descarta silenciosamente.

### El concepto de MTU (Maximum Transmission Unit)

Observa la sección de "DATOS" en el diagrama anterior. Su tamaño máximo predeterminado en el estándar Ethernet tradicional es de **1500 bytes**. A este límite exacto se le conoce como **MTU**.

El MTU define el tamaño máximo del paquete de Capa 3 (IP) que puede ser introducido dentro de una sola trama de Capa 2 sin necesidad de ser fragmentado.

### ¿Por qué el MTU es un dolor de cabeza (y una herramienta) para DevOps?

En un entorno tradicional de oficina, rara vez tocas el MTU. Sin embargo, en arquitecturas Cloud, redes de contenedores y VPNs, el MTU es una de las causas más comunes de problemas de rendimiento y caídas silenciosas de conexión.

**1. El problema del "Overhead" (Sobrecarga de Encapsulamiento)**
Cuando construyes infraestructuras modernas, a menudo creas redes virtuales sobre redes físicas (Overlay Networks). Tecnologías como las VPNs (IPsec, WireGuard) o los plugins de red de Kubernetes (Flannel con VXLAN, Cilium) funcionan metiendo un paquete IP entero dentro de *otro* paquete IP.
Cada vez que encapsulas, añades cabeceras adicionales. Si la red física base tiene un MTU de 1500, y tu túnel VXLAN en Kubernetes añade 50 bytes de cabecera, tu contenedor ya no puede enviar paquetes de 1500 bytes; su MTU interno debe reducirse a **1450 bytes** (`1500 - 50 = 1450`). Si esto no se configura correctamente, los paquetes grandes se descartan o se fragmentan excesivamente.

**2. Fragmentación y Rendimiento**
Si un dispositivo intenta enviar un paquete de 1600 bytes por una interfaz con un MTU de 1500, el protocolo IP (Capa 3) tendrá que dividirlo en dos paquetes más pequeños (fragmentación). Esto consume ciclos de CPU en los routers, aumenta la latencia y, si un solo fragmento se pierde, el paquete entero debe ser retransmitido.

**3. Jumbo Frames**
En centros de datos modernos, redes de almacenamiento (SAN, iSCSI, NFS) o clústeres de bases de datos de alto rendimiento, 1500 bytes es un tamaño ineficiente. Mover gigabytes de datos en trozos de 1.5 KB satura la CPU procesando cabeceras de red. Para solucionarlo, se habilitan los **Jumbo Frames**, que aumentan el MTU hasta **9000 bytes**.
*Nota crítica:* Para que los Jumbo Frames funcionen, **todos** los dispositivos en la ruta L2 (tarjetas de red, switches físicos, switches virtuales) deben estar configurados para soportar un MTU de 9000.

### Diagnóstico de MTU en la línea de comandos

Como ingeniero, puedes verificar y probar el comportamiento del MTU rápidamente.

Para revisar el MTU configurado en tus interfaces locales en Linux:

```bash
# El valor mtu te indicará el límite actual de la interfaz
$ ip link show | grep mtu
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
3: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1420 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000

```

*(Observa cómo la interfaz VPN `wg0` de WireGuard tiene un MTU menor (1420) para acomodar la sobrecarga de cifrado).*

Para descubrir el MTU real de una ruta de red (Path MTU Discovery) forzando envíos sin fragmentación:

```bash
# Linux: Enviamos un payload de 1472 bytes. 
# (1472 payload + 8 cabecera ICMP + 20 cabecera IP = 1500 bytes totales L3)
# -M do: "Do Not Fragment" (No fragmentar)
$ ping -M do -s 1472 8.8.8.8

# Si intentamos enviar 1473 (excediendo el límite de 1500):
$ ping -M do -s 1473 8.8.8.8
ping: local error: message too long, mtu=1500

```

## 2.3 VLANs (Virtual LANs) y el protocolo 802.1Q (Trunking)

En las secciones anteriores vimos cómo los dispositivos se identifican (MAC) y cómo empaquetan la información (Tramas). Pero surge un problema de escalabilidad físico: por defecto, todos los dispositivos conectados a un mismo switch reciben los mensajes de *broadcast* (como las peticiones ARP que veremos más adelante). Si tienes cientos de servidores, bases de datos y balanceadores en la misma red física, el "ruido" de fondo saturará la red y representará un riesgo de seguridad masivo.

La solución clásica sería comprar switches físicos separados para cada tipo de tráfico. La solución inteligente de Capa 2 es usar **VLANs (Virtual Local Area Networks)**.

Una VLAN te permite segmentar lógicamente un único switch físico en múltiples switches virtuales independientes. Los dispositivos en la VLAN 10 (ej. Servidores Web) no pueden "escuchar" ni comunicarse directamente en Capa 2 con los dispositivos de la VLAN 20 (ej. Bases de Datos), aunque estén conectados al mismo hardware de red. Para que hablen entre sí, el tráfico debe subir a la Capa 3 (pasar por un router o firewall).

### El estándar 802.1Q: Etiquetando las tramas

Para que el switch sepa a qué red virtual pertenece cada paquete de datos, debe marcar las tramas de alguna manera. Aquí es donde entra el protocolo **IEEE 802.1Q**.

Lo que hace el 802.1Q es literalmente inyectar una "etiqueta" (Tag) de **4 bytes** dentro de la trama Ethernet estándar que vimos en la sección 2.2, justo después de las direcciones MAC y antes del EtherType:

```text
+-----------+-----------+-----------+---------------+-----------+--------------------+-----------+
| Preámbulo | MAC Dest. | MAC Orig. |  Etiqueta     | EtherType | DATOS (Payload)    | FCS       |
| (8 bytes) | (6 bytes) | (6 bytes) |  802.1Q (4 B) | (2 bytes) | (46 a 1500 bytes)  | (4 bytes) |
+-----------+-----------+-----------+---------------+-----------+--------------------+-----------+
                                           |
        +----------------------------------+--------------------------------+
        | TPID (2 bytes) | PCP (3 bits) | DEI (1 bit) |   VID (12 bits)     |
        | 0x8100         | Prioridad L2 | Drop Elig.  |   VLAN ID (1-4094)  |
        +---------------------------------------------+---------------------+

```

El campo más importante de esta etiqueta es el **VID (VLAN ID)**, un número de 12 bits que permite crear hasta **4094 VLANs** utilizables (la 0 y la 4095 están reservadas).

> **Impacto en el MTU:** Recuerda la sección 2.2. Al insertar estos 4 bytes adicionales, la trama completa pasa de un tamaño máximo de 1518 bytes a **1522 bytes**. El hardware de red moderno soporta estas tramas ligeramente más grandes (conocidas como *Baby Giant Frames*) sin necesidad de alterar la configuración de MTU a 1500 del sistema operativo, pero es un detalle vital al diagnosticar equipos muy antiguos o túneles de red anidados.

### Puertos de Acceso vs. Puertos Trunk

Para gestionar estas etiquetas, los switches configuran sus puertos físicos en dos modos principales:

* **Puertos de Acceso (Access Ports):** Están asignados a una única VLAN. Se conectan a los dispositivos finales (un servidor físico o un PC). El switch **elimina** la etiqueta 802.1Q antes de entregar la trama al servidor, y se la **añade** cuando el servidor envía datos. Desde la perspectiva del sistema operativo del servidor, la VLAN es completamente invisible.
* **Puertos Troncales (Trunk Ports):** Pueden transportar tráfico de **múltiples VLANs** simultáneamente. Por aquí transitan las tramas *con* su etiqueta 802.1Q intacta. Se utilizan para conectar un switch con otro switch, o un switch con un router (para enrutar tráfico entre VLANs).

### VLANs en el mundo DevOps (Linux y Virtualización)

El concepto de Trunking no se limita al hardware de Cisco o Juniper. En entornos de virtualización (VMware, Proxmox) o servidores físicos robustos (Bare-Metal Kubernetes), el servidor mismo debe entender el estándar 802.1Q.

En estos casos, el puerto físico del switch se configura como *Trunk*, enviando tramas etiquetadas directamente al servidor Linux. Es el kernel de Linux (o el vSwitch del hipervisor) el encargado de leer las etiquetas y separar el tráfico en interfaces virtuales (subinterfaces).

Como ingeniero, puedes crear estas interfaces VLANadas en Linux utilizando el comando `iproute2`. Esto te permite conectar un mismo servidor físico a múltiples redes lógicas aisladas:

```bash
# 1. Crear una subinterfaz VLAN (VLAN ID 20) vinculada a la interfaz física eth0
$ ip link add link eth0 name eth0.20 type vlan id 20

# 2. Asignarle una dirección IP (Capa 3) a la nueva interfaz virtual
$ ip addr add 192.168.20.10/24 dev eth0.20

# 3. Levantar la interfaz
$ ip link set dev eth0.20 up

# Si revisas las interfaces, verás la relación:
$ ip -d link show eth0.20
4: eth0.20@eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
    vlan protocol 802.1Q id 20 <REORDER_HDR>

```

Dominar la segmentación L2 es el primer paso antes de entender cómo tecnologías modernas como VXLAN (que veremos más adelante) intentan resolver la limitación de 4094 VLANs en centros de datos a gran escala y entornos Cloud.

## 2.4 Prevención de bucles: STP (Spanning Tree Protocol) y sus variantes

En infraestructura, la redundancia es sinónimo de resiliencia. Si un cable se corta o un switch se apaga, queremos que el tráfico tome una ruta alternativa de forma automática. El problema es que conectar switches entre sí formando un círculo (topología de anillo o malla) crea un desastre absoluto en la Capa 2: los **bucles de red**.

A diferencia de los paquetes IP en la Capa 3, que tienen un mecanismo de autodestrucción llamado TTL (*Time To Live*), **las tramas Ethernet en la Capa 2 no tienen fecha de caducidad**.

Si un servidor envía una trama de *broadcast* (como vimos en la sección 2.1) en una red con un bucle físico, los switches la reenviarán por todos sus puertos indefinidamente. Esto genera una **Tormenta de Broadcast** (*Broadcast Storm*): las tramas se multiplican exponencialmente, la CPU de los switches llega al 100%, las tablas MAC se corrompen y, en cuestión de segundos, la red entera colapsa.

Para tener redundancia física sin bucles lógicos, Radia Perlman inventó el **Spanning Tree Protocol (STP)**, estandarizado como **IEEE 802.1D**.

### ¿Cómo funciona STP? Construyendo un árbol sin ramas cruzadas

El objetivo de STP es descubrir la topología física de la red y bloquear estratégicamente ciertos puertos para que solo exista **un único camino lógico y activo** entre cualquier par de dispositivos.

```text
    Topología Física (Con bucle)           Topología Lógica STP (Sin bucle)
    
           [Switch A]                                 [Switch A] (Root)
          /          \                               /          \
         /            \                             /            \
 [Switch B] -------- [Switch C]             [Switch B]      X   [Switch C]
                                                  \____________/
                                               (Puerto bloqueado por STP)

```

Para lograr esto, los switches intercambian constantemente pequeños mensajes de control llamados **BPDUs** (*Bridge Protocol Data Units*). El proceso resumido es:

1. **Elección del Root Bridge:** Los switches votan para elegir a un "Rey" de la red (el Root Bridge). Todos los cálculos de rutas se harán desde la perspectiva de este switch central.
2. **Cálculo de la ruta más corta:** Cada switch evalúa el "costo" de sus enlaces (basado en el ancho de banda; enlaces de 10Gbps cuestan menos que los de 1Gbps) para llegar al Root Bridge.
3. **Bloqueo de puertos:** Si un switch detecta que tiene dos caminos para llegar al mismo destino, desactiva lógicamente el camino más "costoso" poniéndolo en estado de **Bloqueo** (*Blocking*). Si el enlace principal cae, STP lo detecta y vuelve a activar el enlace bloqueado.

### La evolución: Variantes de STP

El STP original (802.1D) era lento. Si un cable se desconectaba, la red podía tardar hasta **50 segundos** en recalcular la topología y restaurar el tráfico, un tiempo inaceptable para aplicaciones modernas. Por ello, surgieron nuevas variantes:

* **RSTP (Rapid Spanning Tree Protocol - 802.1w):** Es el estándar de facto hoy en día. Reduce el tiempo de convergencia de 50 segundos a unos pocos milisegundos o un par de segundos.
* **PVST+ (Per-VLAN Spanning Tree):** Una invención de Cisco que ejecuta una instancia de STP independiente por cada VLAN. Permite balancear la carga (ej. bloquear el enlace izquierdo para la VLAN 10, pero bloquear el derecho para la VLAN 20).
* **MSTP (Multiple Spanning Tree Protocol - 802.1s):** La versión estándar y más escalable de PVST+. Permite agrupar múltiples VLANs bajo una misma instancia de STP para ahorrar CPU en los switches.

### STP en la trinchera DevOps y Cloud

Aunque STP parece territorio exclusivo de los administradores de red tradicionales, impacta directamente en el trabajo de un ingeniero DevOps o SRE en varios escenarios:

* **El problema del Provisioning (PXE / DHCP):** Cuando un servidor físico o máquina virtual arranca, intenta obtener una IP por DHCP casi de inmediato. Si el switch está ejecutando STP tradicional, el puerto tardará unos 30 segundos en pasar por los estados de escucha y aprendizaje antes de enviar datos (*Forwarding*). Para cuando el puerto esté activo, el DHCP del servidor ya habrá hecho *timeout*. La solución es configurar los puertos que van a servidores finales en modo **PortFast** (o *Edge Port*), lo que le dice a STP: *"Confía en mí, aquí hay un servidor, no un switch; activa el puerto instantáneamente"*.
* **Redes de Contenedores y Linux Bridges:** Los motores como Docker y los hipervisores como KVM utilizan puentes virtuales en Linux (como `docker0` o `virbr0`). Por defecto, estas interfaces virtuales **tienen STP desactivado** porque se asume que no crearás bucles complejos dentro de un mismo host, y activar STP añadiría una latencia innecesaria al inicio de los contenedores.

```bash
# Puedes verificar si STP está activo en un bridge de Linux con:
$ ip -d link show docker0 | grep stp
# O usando la herramienta clásica de bridges:
$ brctl show

```

* **El paradigma Cloud y SDN:** En proveedores como AWS, GCP o Azure, **STP no existe**. Las redes virtuales en la nube (VPCs) están diseñadas bajo arquitecturas SDN (Software Defined Networking) que operan principalmente en Capa 3. Los proveedores de nube eliminan los bucles L2 por diseño en su infraestructura subyacente (usando protocolos modernos como VXLAN o enrutamiento IP puro), lo que te permite diseñar arquitecturas sin preocuparte por tormentas de broadcast.

## 2.5 Protocolo de Resolución de Direcciones (ARP) y RARP

Hasta este punto, hemos visto cómo las tramas Ethernet viajan por la red local utilizando direcciones MAC. Sin embargo, las aplicaciones y los ingenieros no se comunican usando direcciones MAC; usamos direcciones IP (Capa 3).

Aquí surge el problema fundamental de la conectividad local: si el Servidor A (IP `192.168.1.10`) quiere enviar un paquete al Servidor B (IP `192.168.1.20`), el Servidor A debe encapsular ese paquete IP dentro de una trama Ethernet. Para construir esa trama, **necesita conocer la dirección MAC exacta del Servidor B**.

¿Cómo traduce una dirección IP lógica a una dirección MAC física? A través del **ARP (Address Resolution Protocol)**.

### El funcionamiento de ARP paso a paso

ARP opera de manera dinámica e invisible en segundo plano. Cuando un nodo necesita enviar datos a una IP en su misma red local, el proceso es el siguiente:

1. **Consulta de la Caché Local:** Antes de preguntar a la red, el sistema operativo revisa su propia tabla ARP (una caché en memoria) para ver si ya conoce la MAC asociada a esa IP. Si la encuentra, construye la trama y la envía. Si no, pasa al paso 2.
2. **El ARP Request (Petición - Broadcast):** El Servidor A genera un mensaje que dice esencialmente: *"¿Quién tiene la IP 192.168.1.20? Por favor, responda a la IP 192.168.1.10"*. Como no sabe a quién enviárselo, lo envía a la dirección MAC de broadcast (`FF:FF:FF:FF:FF:FF`). Todos los switches reenviarán este mensaje a todos los dispositivos de esa VLAN.
3. **El ARP Reply (Respuesta - Unicast):** Todos los dispositivos reciben la petición, pero solo el Servidor B, al ver que la IP solicitada coincide con la suya, responde. La respuesta dice: *"Yo soy 192.168.1.20 y mi MAC es 00:1A:2B:3C:4D:5E"*. Esta respuesta se envía directamente (unicast) a la MAC del Servidor A.
4. **Actualización de Caché:** El Servidor A recibe la respuesta, guarda la relación IP-MAC en su tabla ARP para no tener que volver a preguntar a corto plazo, y finalmente transmite los datos originales.

```text
[Servidor A]                                                 [Servidor B]
IP: 192.168.1.10                                             IP: 192.168.1.20
MAC: AA:AA:AA...                                             MAC: BB:BB:BB...

      |---------- ARP Request (Broadcast: FF:FF:FF...) ---------->|
      | "¿Quién tiene 192.168.1.20? Dime tu MAC"                  |
      |                                                           |
      |<--------- ARP Reply (Unicast a AA:AA:AA...) --------------|
      | "Yo tengo 192.168.1.20. Mi MAC es BB:BB:BB..."            |

```

> **Regla de oro L2/L3:** ARP **solo funciona dentro de la misma red local (dominio de broadcast / VLAN)**. Si el Servidor A detecta que la IP de destino está en otra red (por ejemplo, en Internet), no hará un ARP preguntando por la IP remota; hará un ARP preguntando por la MAC de su **Default Gateway** (el Router), para entregarle el paquete y que este se encargue de enrutarlo (tema central del Capítulo 3).

### RARP (Reverse ARP): Una reliquia histórica

Si ARP traduce de IP a MAC, **RARP** (introducido en 1984) hacía exactamente lo contrario: traducir de MAC a IP.

Se utilizaba en "estaciones de trabajo sin disco" (diskless workstations) que, al arrancar, solo conocían su propia dirección MAC física. El equipo enviaba un RARP Request a la red preguntando: *"Esta es mi MAC, ¿qué dirección IP debo usar?"*. Un servidor RARP centralizado consultaba una base de datos estática y le asignaba una IP.

Hoy en día, **RARP está obsoleto**. Fue reemplazado por BOOTP y, posteriormente, por **DHCP** (que veremos en el Capítulo 5), ya que DHCP no solo asigna una IP, sino también la máscara de subred, el gateway, los servidores DNS y otros parámetros esenciales.

### ARP en el día a día del DevOps y SRE

ARP es un protocolo simple, pero es el protagonista de varios escenarios críticos en la administración de infraestructuras:

**1. Diagnóstico de conectividad (Neighbor Table)**
Cuando un servidor no puede alcanzar a otro en la misma subred, el primer paso de L2 es verificar si la resolución ARP está funcionando. En Linux, la herramienta moderna para esto es `ip neigh` (reemplazo del antiguo comando `arp`):

```bash
# Ver la tabla de vecinos (ARP cache) en Linux
$ ip neigh show
192.168.1.1 dev eth0 lladdr 00:50:56:c0:00:08 REACHABLE
192.168.1.20 dev eth0 lladdr 00:1a:2b:3c:4d:5e STALE
192.168.1.50 dev eth0  FAILED

```

*Nota: Si ves un estado `FAILED` (o `(incomplete)` con el comando `arp`), significa que el servidor envió el ARP Request, pero nadie respondió. El destino está apagado, un firewall bloquea ARP, o hay un problema físico.*

**2. Alta Disponibilidad (HA) y Gratuitous ARP (GARP)**
Esta es quizás la aplicación más importante de ARP para un SRE. Cuando configuras un clúster activo/pasivo con herramientas como **Keepalived, HAProxy o pfSense**, utilizas una "IP Flotante" (Virtual IP o VIP).
Si el Nodo 1 (Activo) muere, el Nodo 2 (Pasivo) asume la IP Flotante. Pero hay un problema: los demás servidores y switches de la red siguen teniendo en su caché la MAC del Nodo 1 asociada a esa IP.
Para solucionar esto, el Nodo 2 emite un **Gratuitous ARP (GARP)**. Es un mensaje de broadcast no solicitado que le grita a toda la red: *"¡Actualicen sus tablas! La IP Flotante ahora pertenece a mi MAC"*. Esto permite que la conmutación por error (failover) ocurra en milisegundos sin esperar a que las cachés expiren de forma natural.

**3. El problema de ARP en la Nube Pública**
En entornos on-premise, ARP depende del tráfico de broadcast. En la nube pública (AWS, GCP, Azure), las redes VPC son masivas y el tráfico de broadcast (como las peticiones ARP) suele estar **estrictamente bloqueado** por la infraestructura subyacente para evitar tormentas de broadcast multitenant.
En la nube, cuando tu instancia EC2 hace un ARP Request, el hipervisor subyacente de AWS (Nitro) intercepta la petición, consulta su propia base de datos interna de la VPC y responde directamente a la instancia suplantando el destino (Proxy ARP). Esta es la razón por la cual ciertas tecnologías de clustering on-premise que dependen de GARP no funcionan de forma nativa en la nube sin configuraciones especiales de API.

¡Con esto cerramos el Capítulo 2! Hemos cubierto el flujo completo de la Capa de Enlace de Datos, desde las direcciones físicas (MAC), el empaquetado (Tramas y MTU), la segmentación (VLANs), la prevención de desastres (STP) y finalmente, el puente hacia la red lógica (ARP).
