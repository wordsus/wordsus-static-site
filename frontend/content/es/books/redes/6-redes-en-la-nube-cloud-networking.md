## 6.1 Redes Virtuales Privadas en Cloud (VPC en AWS/GCP, VNet en Azure)

Hasta ahora hemos analizado cómo fluyen los datos a través de cables, switches y routers físicos, y cómo los protocolos estructuran ese flujo. Al dar el salto a la nube pública, la infraestructura física desaparece de nuestro control directo. Ya no conectamos cables a un switch; en su lugar, interactuamos con **Redes Definidas por Software (SDN)**.

El bloque fundacional de cualquier arquitectura de red en la nube es la Red Virtual Privada, conocida como **VPC (Virtual Private Cloud)** en Amazon Web Services (AWS) y Google Cloud Platform (GCP), y como **VNet (Virtual Network)** en Microsoft Azure.

### El Cambio de Paradigma: De lo Físico a la SDN

En un entorno local (On-Premise), una red está limitada por el hardware. En la nube, una VPC o VNet es una **frontera lógica de aislamiento**. Cuando creas una, estás reservando un "pedazo" de la red del proveedor (aislado criptográficamente y a nivel de hipervisor de los demás inquilinos) sobre el cual tienes control total de la topología IP.

Para un ingeniero DevOps, es vital entender dos diferencias fundamentales de estas redes virtuales respecto a las tradicionales (Capítulos 1 y 2):

1. **Ausencia de Capa 2 real:** Aunque configures bloques IP, en la nube pública tradicionalmente **no existen los dominios de broadcast**. El tráfico L2 típico (como el de ARP que vimos en la sección 2.5) es interceptado y respondido directamente por el hipervisor de la nube. No puedes hacer *sniffing* promiscuo de red L2.
2. **Elasticidad y Estado:** La red ahora es código. Una VPC no es un chasis físico, es un objeto de la API del proveedor de nube.

### Diferencias Arquitectónicas por Proveedor

Aunque el concepto es el mismo, la forma en que AWS, GCP y Azure implementan su capa base de red difiere significativamente en su alcance (*scope*). Esto afecta directamente cómo diseñaremos la infraestructura como código más adelante.

**1. AWS VPC (Amazon Web Services)**

* **Alcance:** **Regional**. Una VPC en AWS vive estrictamente dentro de una única región (ej. `us-east-1`).
* **Comportamiento:** Al crearla, debes asignarle obligatoriamente un bloque CIDR IPv4 (y opcionalmente IPv6). Esta VPC servirá como el contenedor principal para todo lo que despliegues en esa región. Si necesitas que los recursos se comuniquen con otra región, tendrás que crear una segunda VPC y enrutarlas (concepto que veremos en la sección 6.4).

**2. Azure VNet (Microsoft Azure)**

* **Alcance:** **Regional**. Al igual que AWS, una VNet está confinada a una región específica (ej. `West Europe`).
* **Comportamiento:** Las VNets se despliegan dentro de un *Resource Group* (Grupo de Recursos) y requieren la definición de uno o más bloques de direcciones (Address Spaces). Azure maneja de forma nativa ciertos servicios inyectándolos directamente en la VNet mediante delegación de subredes.

**3. GCP VPC (Google Cloud Platform)**

* **Alcance:** **Global**. Este es el gran diferenciador de Google. Una sola VPC en GCP abarca todo el mundo.
* **Comportamiento:** No le asignas un bloque CIDR a la VPC en sí. La VPC es simplemente un contenedor global. Las subredes (que sí son regionales y tienen bloques CIDR) se asocian a esta red global. Esto significa que una máquina virtual en Tokio y otra en São Paulo pueden estar en la misma VPC y comunicarse mediante direcciones IP privadas sin necesidad de configurar túneles o peering adicionales.

### Representación Estructural (El Alcance Lógico)

Para visualizar la diferencia fundamental entre el modelo de AWS/Azure y el de GCP, observa el siguiente esquema de la anatomía de la red:

```text
=======================================================================
 MODELO AWS / AZURE (VPC/VNet Regional)
=======================================================================
[ Cuenta / Suscripción ]
   |
   +-- Región A (ej. us-east-1)
   |      |
   |      +-- VPC 1 (CIDR: 10.0.0.0/16)  <-- Frontera de red L3
   |
   +-- Región B (ej. eu-west-1)
          |
          +-- VPC 2 (CIDR: 10.1.0.0/16)  <-- Frontera de red L3 separada

* Requiere interconexión explícita entre VPC 1 y VPC 2.

=======================================================================
 MODELO GCP (VPC Global)
=======================================================================
[ Proyecto ]
   |
   +-- VPC Global (Red unificada subyacente) <-- Frontera de red L3
          |
          +-- Subred en Región A (CIDR: 10.0.0.0/24)
          |
          +-- Subred en Región B (CIDR: 10.1.0.0/24)

* Ruteo interno automático entre Región A y B de forma predeterminada.
=======================================================================

```

### La Perspectiva de Infraestructura como Código (IaC)

Para un DevOps, la VPC/VNet es el recurso padre en cualquier módulo de Terraform o Pulumi. Todo lo demás (instancias, bases de datos, balanceadores) hereda de este bloque. A modo ilustrativo, nota cómo la declaración mínima en código refleja la teoría de alcance (scope) que acabamos de ver:

```hcl
# AWS: Requiere el CIDR a nivel de la VPC
resource "aws_vpc" "mi_red_aws" {
  cidr_block = "10.0.0.0/16"
}

# Azure: Requiere el CIDR (Address Space) y asociarse a un Grupo de Recursos
resource "azurerm_virtual_network" "mi_red_azure" {
  name                = "vnet-principal"
  resource_group_name = "rg-produccion"
  location            = "westeurope"
  address_space       = ["10.0.0.0/16"]
}

# GCP: No requiere CIDR a nivel de VPC, pero te permite elegir 
# si creará subredes automáticamente en cada región del mundo o no.
resource "google_compute_network" "mi_red_gcp" {
  name                    = "vpc-global-prod"
  auto_create_subnetworks = false # Buena práctica: siempre manual (Custom)
}

```

Crear la VPC es solo encender el lienzo en blanco. Para que esta red sea funcional y pueda hospedar recursos, necesitamos dividir este gran bloque en segmentos manejables y seguros, lo cual nos lleva a la arquitectura interna de la nube.

## 6.2 Diseño de topologías Cloud: Subredes públicas, privadas y aisladas

Una vez definida la VPC o VNet (como vimos en la sección 6.1), tenemos un bloque de direcciones IP grande (por ejemplo, el bloque CIDR `10.0.0.0/16`). El siguiente paso lógico y arquitectónico es segmentar ese espacio en **subredes** (subnets).

En el entorno Cloud, el diseño de subredes no responde a los límites de *broadcast* como en las redes físicas (Capítulo 2), sino que se rige por tres pilares fundamentales: **enrutamiento hacia internet, alta disponibilidad (aislamiento físico en Zonas de Disponibilidad) y seguridad (reducción de la superficie de ataque)**.

En la nube, lo que define si una subred es pública, privada o aislada **no es su rango IP**, sino las reglas configuradas en su **Tabla de Enrutamiento (Route Table)**. Todo diseño estándar de arquitectura de tres capas (3-tier) clasifica las subredes de la siguiente manera:

### 1. Subredes Públicas (Public Subnets)

* **Definición:** Tienen una ruta directa hacia internet. Su tabla de enrutamiento envía el tráfico con destino `0.0.0.0/0` (cualquier IP externa) hacia un Internet Gateway (IGW).
* **Características:** Los recursos desplegados aquí necesitan direcciones IP públicas para poder responder a las peticiones entrantes desde internet.
* **Casos de uso DevOps:** Exclusivamente para recursos de borde (*edge*). Aquí residen los Balanceadores de Carga de Aplicación (ALB), Bastion Hosts (Jumpboxes) o servidores VPN, y los NAT Gateways. **Nunca** se despliegan servidores de aplicaciones o bases de datos aquí.

### 2. Subredes Privadas (Private Subnets)

* **Definición:** Tienen capacidad de salir a internet para descargar actualizaciones o parches, pero **no** pueden recibir conexiones directas iniciadas desde el exterior.
* **Características:** Su ruta por defecto (`0.0.0.0/0`) apunta a un componente intermediario, generalmente un **NAT Gateway**, que reside en la subred pública. Las instancias aquí solo poseen IPs privadas.
* **Casos de uso DevOps:** Es el "caballo de batalla" de la topología. Aquí se despliegan los nodos *worker* de Kubernetes, máquinas virtuales de backend, funciones Serverless y agentes de CI/CD (como los runners de GitLab o GitHub).

### 3. Subredes Aisladas (Isolated / Data Subnets)

* **Definición:** No tienen ningún tipo de ruta hacia internet, ni de entrada ni de salida. Su tabla de enrutamiento solo permite tráfico interno (`local`) dentro de la propia VPC.
* **Características:** Es el entorno más seguro. Si un recurso necesita actualizarse o comunicarse con una API externa (como S3 o un Key Vault), debe hacerlo exclusivamente a través de **VPC Endpoints** o PrivateLinks, asegurando que el tráfico no abandone el backbone del proveedor de nube.
* **Casos de uso DevOps:** Bases de datos relacionales (RDS, Cloud SQL), clústeres de caché (Redis, Memcached) y almacenamiento de datos altamente sensibles.

### Diseño Multi-AZ (Alta Disponibilidad)

Para garantizar la tolerancia a fallos, un ingeniero DevOps nunca despliega toda su infraestructura en un solo centro de datos. Los proveedores dividen sus Regiones en **Zonas de Disponibilidad (AZ)**. Una buena topología replica las tres subredes descritas en al menos dos o tres AZs distintas:

```text
+-----------------------------------------------------------------------+
|                         VPC (CIDR: 10.0.0.0/16)                       |
|                                                                       |
|  +-------------------------+             +-------------------------+  |
|  | Zona de Disponibilidad A|             | Zona de Disponibilidad B|  |
|  |                         |             |                         |  |
|  | +---------------------+ |             | +---------------------+ |  |
|  | | Subred Pública A    | |             | | Subred Pública B    | |  |
|  | | 10.0.1.0/24         | |             | | 10.0.2.0/24         | |  |
|  | | (ALB, NAT Gateway)  | |             | | (ALB, NAT Gateway)  | |  |
|  | +---------------------+ |             | +---------------------+ |  |
|  |           |             |   Ruteo     |           |             |  |
|  | +---------------------+ |  Interno    | +---------------------+ |  |
|  | | Subred Privada A    | | <=========> | | Subred Privada B    | |  |
|  | | 10.0.11.0/24        | |             | | 10.0.12.0/24        | |  |
|  | | (App / K8s Nodes)   | |             | | (App / K8s Nodes)   | |  |
|  | +---------------------+ |             | +---------------------+ |  |
|  |           |             |             |           |             |  |
|  | +---------------------+ |             | +---------------------+ |  |
|  | | Subred Aislada A    | |             | | Subred Aislada B    | |  |
|  | | 10.0.21.0/24        | |             | | 10.0.22.0/24        | |  |
|  | | (Bases de Datos)    | |             | | (Bases de Datos)    | |  |
|  | +---------------------+ |             | +---------------------+ |  |
|  +-------------------------+             +-------------------------+  |
+-----------------------------------------------------------------------+

```

### La Perspectiva como Código

Para consolidar la idea de que "la tabla de enrutamiento define la subred", observa cómo se declara esta lógica en Terraform. La subred en sí es un recurso "tonto"; su naturaleza pública o privada se la da la asociación posterior:

```hcl
# 1. Definimos las subredes (Aún no son ni públicas ni privadas)
resource "aws_subnet" "frontend" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_subnet" "backend" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.11.0/24"
}

# 2. Las Tablas de Enrutamiento definen su comportamiento
resource "aws_route_table" "ruta_publica" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id # Salida directa a Internet
  }
}

resource "aws_route_table" "ruta_privada" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id  # Salida ofuscada mediante NAT
  }
}

# 3. La asociación "mágica" que convierte la subred en pública o privada
resource "aws_route_table_association" "asociar_publica" {
  subnet_id      = aws_subnet.frontend.id
  route_table_id = aws_route_table.ruta_publica.id
}

```

Aquí tienes el desarrollo de la sección **6.3**. Siguiendo la línea arquitectónica, aquí es donde le damos vida a las rutas que definimos en la sección anterior, conectando nuestros entornos aislados con el resto del mundo.

---

## 6.3 Puertas de enlace: Internet Gateways, NAT Gateways y Egress-only Gateways

Si las subredes son las habitaciones de nuestra infraestructura y las tablas de enrutamiento son los pasillos, las puertas de enlace (Gateways) son las puertas que dan a la calle. En el entorno Cloud, un Gateway no es un *appliance* físico o un router virtualizado que pueda sufrir cuellos de botella por hardware; es un componente lógico, redundante y escalable horizontalmente, gestionado íntegramente por el proveedor de nube (AWS, GCP, Azure).

Para un ingeniero DevOps, elegir el Gateway correcto es una cuestión que equilibra tres factores: **conectividad, seguridad y costos**.

### 1. Internet Gateway (IGW)

El Internet Gateway es el componente fundamental que permite la comunicación **bidireccional** entre los recursos de tu VPC y el internet público.

* **¿Cómo funciona?** El IGW realiza una traducción estática 1:1. Cuando una instancia (por ejemplo, un balanceador de carga) envía tráfico a internet, el IGW reemplaza de forma transparente la dirección IP privada de la instancia por su IP pública asignada. Cuando el tráfico regresa, hace el proceso inverso.
* **Características clave:** Es un servicio de alta disponibilidad por diseño. No impone restricciones de ancho de banda y, por lo general, no tiene un costo por hora de ejecución (solo pagas por el tráfico de datos transferido).
* **Regla de Arquitectura:** Para que un recurso use un IGW, debe cumplir dos condiciones irrefutables: estar en una subred con una ruta hacia el IGW (Subred Pública) **y** tener una dirección IP pública asociada.

### 2. NAT Gateway (Network Address Translation Gateway)

Como vimos en la sección anterior, los recursos de backend (bases de datos, *workers* de K8s) residen en subredes privadas sin IPs públicas. Sin embargo, necesitan salir a internet para descargar parches de seguridad, interactuar con APIs externas o hacer *pull* de imágenes de contenedores. Aquí entra el NAT Gateway.

* **¿Cómo funciona?** Implementa NAT dinámico o PAT (Port Address Translation). Toma el tráfico de múltiples instancias privadas y lo enmascara detrás de una **única IP pública** (la IP del propio NAT Gateway). Es una comunicación **unidireccional**: permite respuestas a peticiones iniciadas desde adentro, pero bloquea cualquier intento de conexión iniciado desde internet.
* **Arquitectura:** El NAT Gateway **debe desplegarse siempre en una Subred Pública**. Esto a veces confunde a los perfiles Junior: el NAT Gateway da servicio a la subred privada, pero necesita vivir en la pública para poder alcanzar el Internet Gateway.
* **Consideraciones DevOps:** A diferencia del IGW, los NAT Gateways suelen tener un costo fijo por hora de ejecución más un cargo por cada Gigabyte procesado. En arquitecturas de alto tráfico cruzado, una mala configuración del NAT Gateway puede disparar la factura mensual.

### 3. Egress-Only Internet Gateway

Este Gateway es una solución específica para un problema introducido por **IPv6**.

* **El problema:** En IPv4, usamos NAT para mitigar la escasez de IPs y ocultar nuestros recursos. En IPv6, el espacio de direcciones es tan inmenso que *todas* las IPs son globales y enrutables (públicas). Si le asignas una IPv6 a una instancia en una subred, automáticamente es alcanzable desde internet. No existe el concepto de "NAT para IPv6" en la nube estándar.
* **La solución:** El *Egress-Only Internet Gateway* funciona como un dique stateful (con estado). Permite que las instancias envíen tráfico IPv6 hacia el exterior, pero descarta sistemáticamente cualquier tráfico IPv6 entrante que no sea una respuesta a una conexión previamente establecida desde adentro. Proporciona la seguridad unidireccional de un NAT Gateway, pero sin alterar las cabeceras IP (sin traducción).

### Flujo de Tráfico y Arquitectura (Diagrama Lógico)

Para visualizar cómo interactúan estos tres componentes en una VPC moderna de doble pila (IPv4/IPv6):

```text
[ INTERNET PÚBLICO ]
       ^      ^
       |      | (Tráfico IPv4 e IPv6 bidireccional)
       v      v
+-------------------------------------------------------+
|                 INTERNET GATEWAY (IGW)                |
+-------------------------------------------------------+
       ^      |
 IPv4  |      | IPv4 
 Salida|      | Entrada
       |      v
+--------------------------+
|     SUBRED PÚBLICA       |
|  [Balanceador ALB]       |
|  [NAT GATEWAY] <---------+--- (El NAT GW tiene IP Pública)
+--------------------------+
       ^                   
       | (Tráfico IPv4 de salida enmascarado)
       |
+--------------------------+        +-------------------------------+
|     SUBRED PRIVADA       |        | EGRESS-ONLY INTERNET GATEWAY  |
|  [Worker Node K8s] ------+        +-------------------------------+
|  (Solo IP Privada IPv4)  |                        ^
|  (IP Global IPv6)        |------------------------+ 
+--------------------------+  (Tráfico IPv6 de salida, entrada bloqueada)

```

### Implementación como Código (Terraform)

En IaC, la instanciación de estos componentes revela claramente sus dependencias. Observa cómo el NAT Gateway requiere explícitamente una IP Elástica (EIP) y depender del IGW:

```hcl
# 1. El Internet Gateway se asocia a la VPC
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

# 2. Asignamos una IP Pública Estática (Elastic IP) para el NAT Gateway
resource "aws_eip" "nat_ip" {
  domain = "vpc"
}

# 3. El NAT Gateway se ubica en la Subred PÚBLICA y usa la EIP
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat_ip.id
  subnet_id     = aws_subnet.publica.id

  # Buena práctica: Asegurar que el IGW exista antes de crear el NAT
  depends_on = [aws_internet_gateway.igw]
}

# 4. Egress-Only Gateway para subredes con IPv6
resource "aws_egress_only_internet_gateway" "eigw" {
  vpc_id = aws_vpc.main.id
}

```

Al dominar estos Gateways, controlamos el perímetro Norte-Sur (entrada y salida de la nube). El siguiente paso natural es dominar el perímetro Este-Oeste (comunicación interna entre diferentes redes).

## 6.4 Interconexión de VPCs: VPC Peering y Transit Gateways / Hub and Spoke

A medida que una organización crece o adopta una arquitectura de microservicios, el diseño de red evoluciona. Ya no basta con tener una única "mega VPC" para todo. Las mejores prácticas (y los límites de cuotas de las cuentas) dictan que debemos separar los entornos: una VPC para Producción, otra para Desarrollo, otra para Servicios Compartidos (como repositorios de artefactos o herramientas de monitoreo), e incluso VPCs separadas por unidades de negocio o adquisiciones.

El desafío arquitectónico es: **¿Cómo conectamos estas redes aisladas para que se comuniquen de forma privada, segura y sin salir a Internet?** Para resolver esto, los proveedores de nube ofrecen dos enfoques principales que todo DevOps debe dominar.

### 1. VPC Peering (Emparejamiento de VPCs)

El VPC Peering es la forma más directa y sencilla de conectar dos redes virtuales. Crea un túnel de red punto a punto utilizando la infraestructura subyacente del proveedor de nube.

* **Características:** Al ser una conexión física a nivel del *backbone* del proveedor, no hay un "Gateway" en medio que pueda ser un cuello de botella. Ofrece el máximo ancho de banda y la menor latencia posible.
* **El gran límite: La No-Transitividad.** Este es el concepto más crítico que debes memorizar. Si la `VPC A` está conectada con la `VPC B`, y la `VPC B` está conectada con la `VPC C`, **la `VPC A` NO puede hablar con la `VPC C**`. El tráfico no puede "transitar" a través de una VPC intermedia.
* **El problema de escala:** Debido a la no-transitividad, si necesitas que todas tus VPCs se comuniquen entre sí, debes crear una topología de "malla completa" (Full Mesh). El número de conexiones crece exponencialmente mediante la fórmula matemática n(n-1)/2. Para 4 VPCs necesitas 6 conexiones; pero para 10 VPCs, necesitas 45 conexiones. Esto se vuelve una pesadilla operativa para gestionar tablas de enrutamiento y políticas de seguridad como código.

### 2. Transit Gateways y el modelo Hub and Spoke

Para resolver la pesadilla del enrutamiento punto a punto, la industria adoptó el modelo **Hub and Spoke** (Centro y Radios), materializado en servicios como AWS Transit Gateway, Azure Virtual WAN (o VNet Peering con Gateway Transit) y Google Cloud Router / Network Connectivity Center.

* **El concepto:** En lugar de conectar cada VPC con todas las demás, conectas cada VPC (los radios o *spokes*) a un único enrutador central en la nube (el *hub*).
* **Ventajas operativas:** 1. **Enrutamiento transitivo:** El Transit Gateway sí permite que la `VPC A` hable con la `VPC C` pasando por el centro, siempre que las tablas de rutas del Gateway lo permitan.

1. **Escalabilidad:** Para conectar 10 VPCs, solo necesitas 10 conexiones al Transit Gateway.
2. **Gestión centralizada:** Puedes aplicar políticas de seguridad e inspección de tráfico en un solo lugar (por ejemplo, forzando que todo el tráfico entre VPCs pase por un Firewall de Próxima Generación antes de llegar a su destino).

* **Desventajas:** Añade un ligero salto de latencia y tiene un costo asociado por hora y por gigabyte procesado que el VPC Peering no tiene.

### Representación Estructural: Malla vs. Hub & Spoke

```text
=======================================================================
 1. VPC PEERING (Topología Full Mesh)
=======================================================================
 Complejidad operativa alta. Requiere actualizar rutas en cada VPC.

         [VPC A] <============> [VPC B]
          ^   \                  /   ^
          |    \                /    |
          |     \              /     |
          |      v            v      |
         [VPC C] <============> [VPC D]

=======================================================================
 2. TRANSIT GATEWAY (Topología Hub and Spoke)
=======================================================================
 Complejidad operativa baja. Enrutamiento centralizado.

                 [VPC B]
                    ^
                    | (Attachment)
                    v
 [VPC A] <==> [TRANSIT GATEWAY] <==> [VPC C]
              (Enrutador Central)
                    ^
                    | (Attachment)
                    v
                 [VPC D]
=======================================================================

```

### La Perspectiva de Infraestructura como Código (IaC)

El despliegue de un VPC Peering requiere un "apretón de manos" (*handshake*). Una cuenta/VPC actúa como solicitante (*requester*) y la otra como aceptador (*accepter*). En Terraform, si ambas VPCs están en la misma cuenta, el código refleja este proceso de solicitud y aceptación automática:

```hcl
# 1. Creamos la conexión de Peering desde la VPC A hacia la VPC B
resource "aws_vpc_peering_connection" "conexion_ab" {
  vpc_id      = aws_vpc.vpc_a.id       # El solicitante
  peer_vpc_id = aws_vpc.vpc_b.id       # El destino
  auto_accept = true                   # Solo funciona si ambas están en la misma cuenta

  tags = {
    Name = "Peering-Produccion-a-SharedServices"
  }
}

# 2. Vital: El peering no sirve de nada sin actualizar las Tablas de Enrutamiento
# Ruta en VPC A hacia el CIDR de VPC B
resource "aws_route" "ruta_a_hacia_b" {
  route_table_id            = aws_route_table.rt_vpc_a.id
  destination_cidr_block    = aws_vpc.vpc_b.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.conexion_ab.id
}

# Ruta en VPC B hacia el CIDR de VPC A
resource "aws_route" "ruta_b_hacia_a" {
  route_table_id            = aws_route_table.rt_vpc_b.id
  destination_cidr_block    = aws_vpc.vpc_a.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.conexion_ab.id
}

```

La clave para el perfil DevOps aquí es la **automatización de las rutas**. Es un error muy común crear la conexión de peering (el cable lógico) y olvidar inyectar las reglas en las tablas de enrutamiento de las subredes correspondientes, lo que resulta en paquetes perdidos silenciosamente.

## 6.5 Balanceo de carga L4 (Network Load Balancers) vs. L7 (Application Load Balancers)

En una arquitectura nativa de la nube, nunca apuntamos el tráfico de los usuarios directamente a una única máquina virtual o pod de Kubernetes. Si ese nodo falla o se satura, el servicio colapsa. Para resolver esto, introducimos un componente mediador: el **Balanceador de Carga (Load Balancer)**.

Mientras que en los centros de datos tradicionales esto requería costosos *appliances* de hardware (como F5 o Citrix NetScaler), en la nube los balanceadores son servicios administrados y elásticos. Para un ingeniero DevOps, la decisión de diseño más crítica no es el tamaño del balanceador, sino en qué capa del **Modelo OSI** (Capítulo 1) debe operar. Las dos opciones principales son la Capa 4 (L4) y la Capa 7 (L7).

Para entender la diferencia, usaremos una analogía clásica: **El balanceador L4 es un clasificador de correspondencia que solo lee el código postal y el destinatario exterior; el balanceador L7 es un asistente que abre la carta, lee el contenido y decide a qué departamento enviarla.**

### 1. Network Load Balancer (Balanceo L4)

El balanceador de red opera en la **Capa de Transporte**. En AWS se le conoce como *Network Load Balancer (NLB)*, y en GCP y Azure simplemente como *TCP/UDP Load Balancer*.

* **¿Qué "ve" el balanceador?** Solo entiende de direcciones IP (origen y destino) y puertos lógicos (TCP o UDP). Es completamente ciego al contenido del paquete.
* **Comportamiento:** No establece una conexión separada con el cliente y otra con el servidor (como hace un proxy tradicional). En su lugar, modifica la cabecera del paquete al vuelo y lo reenvía al backend. Esto significa que la IP de origen del cliente suele preservarse de forma nativa.
* **Ventajas:** * **Rendimiento extremo:** Al no analizar el *payload* (carga útil), puede procesar millones de peticiones por segundo manteniendo latencias ultrabajas (microsegundos).
* **IPs Estáticas:** Es el único balanceador en AWS que te permite asignar una IP pública estática (Elastic IP) directamente al servicio de entrada.

* **Casos de uso DevOps:** Tráfico en tiempo real (servidores de videojuegos, streaming UDP), dispositivos IoT (MQTT), o como punto de entrada de alto rendimiento que redirige todo el tráfico L4 hacia un *Ingress Controller* dentro de Kubernetes.

### 2. Application Load Balancer (Balanceo L7)

El balanceador de aplicaciones opera en la **Capa de Aplicación**. En AWS es el *Application Load Balancer (ALB)*, en GCP el *HTTP(S) Load Balancer* y en Azure el *Application Gateway*.

* **¿Qué "ve" el balanceador?** Entiende los protocolos de alto nivel, principalmente **HTTP, HTTPS y gRPC**.
* **Comportamiento:** Actúa como un proxy inverso completo. Termina la conexión TCP y la sesión TLS/SSL con el cliente, "abre" el paquete para inspeccionar las cabeceras HTTP (URL, cookies, *User-Agent*), toma una decisión de enrutamiento y abre una *nueva* conexión hacia el servidor backend.
* **Ventajas:**
* **Enrutamiento inteligente:** Puedes dirigir el tráfico basándote en la ruta (`/api/v1/*` va a un grupo de microservicios, `/web/*` va a otro) o en el dominio (*Host-based routing*).
* **Terminación TLS/SSL:** Descarga a los servidores backend del esfuerzo computacional de descifrar el tráfico criptográfico (descrito en la sección 5.3).
* **Seguridad (WAF):** Al poder leer el contenido HTTP, es el lugar ideal para acoplar un *Web Application Firewall* y bloquear ataques como inyección SQL o Cross-Site Scripting (XSS).

* **Casos de uso DevOps:** Microservicios RESTful, aplicaciones web modernas, despliegues *Blue/Green* o *Canary* nativos (enrutando un % del tráfico basado en cabeceras HTTP).

### Tabla Comparativa de Decisiones de Arquitectura

| Característica | L4 (Network Load Balancer) | L7 (Application Load Balancer) |
| --- | --- | --- |
| **Protocolos soportados** | TCP, UDP, TLS | HTTP, HTTPS, gRPC, WebSockets |
| **Latencia** | Ultrabaja (Microsegundos) | Baja (Milisegundos) |
| **Terminación SSL/TLS** | Sí (pero menos flexible) | **Excelente** (Gestión centralizada de certificados) |
| **Reglas de enrutamiento** | Basadas en IP y Puerto | Basadas en URL, Host, Cabeceras HTTP, Cookies |
| **Modificación de la IP Origen** | Preserva la IP del cliente (Passthrough) | Modifica la IP (Usa la cabecera `X-Forwarded-For` para pasar la IP original) |
| **Integración con WAF** | No | **Sí** |

### La Perspectiva de Infraestructura como Código (IaC)

Al definir estos balanceadores como código, la complejidad del ALB (L7) se hace evidente debido a sus capacidades de enrutamiento. Mientras que un NLB solo necesita apuntar un puerto a un grupo de servidores, un ALB requiere definir **Listeners** (quién escucha) y **Reglas de oyente** (qué hacer según la URL).

Observa este ejemplo conceptual en Terraform de un ALB configurando enrutamiento basado en la ruta (Path-based routing):

```hcl
# 1. Definimos el balanceador L7 (Application)
resource "aws_lb" "alb_app" {
  name               = "app-load-balancer"
  load_balancer_type = "application"
  subnets            = [aws_subnet.publica_a.id, aws_subnet.publica_b.id]
}

# 2. Creamos un Listener (Escucha en el puerto 80)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb_app.arn
  port              = "80"
  protocol          = "HTTP"

  # Acción por defecto si no coincide ninguna regla (Ej. devolver un error 404)
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Ruta no encontrada"
      status_code  = "404"
    }
  }
}

# 3. La magia L7: Enrutar el tráfico de "/api" hacia un microservicio específico
resource "aws_lb_listener_rule" "enrutamiento_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  condition {
    path_pattern {
      values = ["/api/*"] # Inspección L7 del path HTTP
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.microservicio_backend.arn
  }
}

```

El conocimiento de estas dos capas te permite diseñar sistemas resilientes. Normalmente, una arquitectura robusta utiliza ambos: un NLB en el borde extremo para manejar picos masivos de conexiones TCP a nivel de clúster, el cual redirige el tráfico a un Ingress Controller (que actúa como un balanceador L7 interno) para gestionar la lógica de enrutamiento de la aplicación.

## 6.6 Entrega de contenido y latencia: CDNs (Content Delivery Networks) y Edge Computing

Incluso con el mejor balanceador de carga L7 (como vimos en la sección 6.5) y un backend optimizado, si tu infraestructura está alojada en un centro de datos en Frankfurt y un usuario intenta acceder desde Buenos Aires, la latencia de red será notable. Cada paquete TCP y cada *handshake* TLS debe cruzar el océano, sumando cientos de milisegundos a la carga de la aplicación.

Para resolver este problema de topología global sin tener que replicar toda nuestra infraestructura en cada continente, la industria confía en el borde de la red (*The Edge*) a través de las **CDNs** y el **Edge Computing**.

### 1. CDNs (Content Delivery Networks)

Una CDN es una red distribuida globalmente de servidores proxy, conocidos como **Puntos de Presencia (PoPs)**. Su propósito principal es acercar el contenido al usuario final para reducir drásticamente la latencia y descargar de trabajo a los servidores principales (*Origins*).

* **El Origen (Origin):** Es la fuente de la verdad de tus datos. Puede ser un *bucket* de almacenamiento de objetos (como Amazon S3) o un balanceador de carga (ALB) que apunta a tus microservicios.
* **El Borde (Edge / PoP):** Son los servidores de la CDN desplegados en cientos de ciudades alrededor del mundo (ej. Cloudflare, AWS CloudFront, Akamai).
* **El Mecanismo (Caché):** Cuando un usuario en Tokio solicita una imagen o un archivo JavaScript, la petición se enruta (vía DNS Anycast) al PoP más cercano en Japón. Si el PoP no tiene el archivo (*Cache Miss*), lo busca en el Origen, lo entrega al usuario y guarda una copia local. La próxima vez que cualquier usuario en la región pida el mismo archivo (*Cache Hit*), el PoP lo entregará instantáneamente, sin molestar al Origen.

**Perspectiva DevOps: Gestión de la Caché y CI/CD**
Para un ingeniero DevOps, la CDN no es solo un acelerador, es una pieza móvil que debe integrarse en el ciclo de despliegue.

* **TTL (Time to Live):** Debes definir mediante cabeceras HTTP (`Cache-Control`) cuánto tiempo es válido un recurso en el borde antes de volver a consultar al origen.
* **Invalidación de Caché:** Cuando despliegas una nueva versión de una aplicación de frontend (SPA en React/Angular), debes ejecutar comandos en tu pipeline de CI/CD para purgar la caché de la CDN. Si omites esto, los usuarios seguirán viendo la versión antigua de la web.

### 2. Edge Computing (Computación en el Borde)

La evolución natural de las CDNs fue pasar de simplemente almacenar archivos estáticos a **ejecutar código dinámico**. El Edge Computing permite correr funciones ligeras (Serverless) directamente en los PoPs, a milisegundos del usuario.

* **Tecnologías clave:** AWS Lambda@Edge, Cloudflare Workers, Fastly Compute.
* **Casos de uso DevOps:**
* **Manipulación de cabeceras HTTP:** Añadir cabeceras de seguridad (HSTS, CSP) antes de entregar la respuesta al cliente.
* **A/B Testing en el borde:** Inspeccionar una cookie del usuario y redirigir la petición a un *bucket* S3 u otro de forma totalmente transparente, sin que la petición llegue siquiera a tu infraestructura principal.
* **Autenticación (JWT Verification):** Validar *tokens* de acceso en el borde. Si el token es inválido, el Edge rechaza la petición con un error 401, protegiendo a tus servidores de backend de tráfico no autenticado (y ahorrando costos de cómputo).

### Representación Estructural: Flujo de Tráfico

```text
[ USUARIO EN TOKIO ]                  [ USUARIO EN MADRID ]
         |                                     |
   (Latencia: 10ms)                      (Latencia: 15ms)
         v                                     v
+------------------+                  +------------------+
| PoP CDN (Japón)  |                  | PoP CDN (España) |
| (Caché + Edge)   |                  | (Caché + Edge)   |
+------------------+                  +------------------+
         |                                     |
   (Cache Miss)                          (Cache Miss)
         |                                     |
         +-----------------+-------------------+
                           |
                   (Latencia: 150ms+)
                           v
              +-------------------------+
              |    INFRAESTRUCTURA      |
              |       CENTRAL           |
              |  (Ej. Región us-east-1) |
              |                         |
              |  [ Origen: ALB / S3 ]   |
              +-------------------------+

```

### La Perspectiva de Infraestructura como Código (IaC)

Desplegar una CDN requiere vincularla a un Origen y definir el comportamiento de la caché. Nota en este ejemplo de Terraform cómo se configura una distribución de AWS CloudFront apuntando a un ALB, y cómo se especifica qué métodos HTTP se almacenan en caché y cuáles pasan directamente al backend:

```hcl
resource "aws_cloudfront_distribution" "mi_cdn" {
  enabled = true

  # 1. Definimos el Origen (Nuestro Balanceador L7)
  origin {
    domain_name = aws_lb.alb_app.dns_name
    origin_id   = "ALB-Produccion"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # 2. Comportamiento por defecto (Caché)
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"] # Solo cacheamos lecturas
    target_origin_id = "ALB-Produccion"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none" # No reenviar cookies para maximizar el cache hit ratio
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600  # 1 hora
    max_ttl                = 86400 # 24 horas
  }

  # 3. Restricciones geográficas (opcional pero común en seguridad)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

```

La combinación de un Load Balancer regional y una CDN global nos da una arquitectura altamente disponible y de baja latencia. El último eslabón para dominar las redes Cloud es entender cómo conectamos nuestras oficinas físicas y centros de datos tradicionales a esta nueva infraestructura en la nube.

## 6.7 Conectividad híbrida: VPNs Site-to-Site (IPsec), Client VPNs y conexiones dedicadas

La utopía del "100% Cloud" rara vez existe en corporaciones establecidas. La realidad del ingeniero DevOps está plagada de migraciones graduales, bases de datos *legacy* (heredadas) que aún residen en un centro de datos físico, y equipos de desarrollo distribuidos que necesitan acceso seguro a recursos internos.

A esta convivencia entre la infraestructura local (On-Premise) y la nube pública se le llama **Arquitectura Híbrida**. Para que funcione, el tráfico debe fluir de manera segura. Exploraremos las tres vías principales para lograrlo, ordenadas de menor a mayor complejidad y costo.

### 1. Client VPNs (Point-to-Site / Acceso Remoto)

Esta es la solución orientada al usuario final. Permite que un ingeniero desde su laptop en una cafetería se conecte de forma segura a la VPC para administrar servidores en subredes privadas, o acceder a dashboards internos (como Grafana o ArgoCD) sin exponerlos a Internet.

* **El Mecanismo:** El usuario instala un cliente de software. Este cliente establece un túnel cifrado contra un *Endpoint* gestionado en la nube (ej. AWS Client VPN) o contra una máquina virtual configurada como servidor VPN (bastion host) en una subred pública.
* **Protocolos Clave:**
* **OpenVPN:** El estándar de la industria basado en TLS/SSL. Altamente configurable, maduro, pero con un código base pesado que puede introducir latencia.
* **WireGuard:** La revolución moderna. Integrado directamente en el kernel de Linux (y soportado globalmente), utiliza criptografía de última generación (Curve25519, ChaCha20). Es inmensamente más rápido, consume menos batería en los clientes y su código base es auditablemente minúsculo en comparación con OpenVPN.

* **Visión DevOps:** La gestión de usuarios estáticos aquí es un antipatrón. Las Client VPNs modernas deben integrarse siempre con proveedores de identidad (IdP) mediante SAML o integraciones OIDC (Google Workspace, Okta, Entra ID) para garantizar el acceso basado en roles y revocar permisos automáticamente cuando un empleado deja la empresa.

### 2. VPN Site-to-Site (Sitio a Sitio vía IPsec)

Mientras que la Client VPN conecta a un humano, la **Site-to-Site VPN** conecta redes enteras. Es el puente estándar para unir el centro de datos físico (o la oficina principal) con tu VPC en la nube, usando el Internet público como medio de transporte.

* **El Mecanismo:** Un router o firewall físico en la oficina (llamado *Customer Gateway* o CGW) establece un túnel **IPsec** continuo contra el enrutador virtual de la nube (llamado *Virtual Private Gateway* o VGW). Todo el tráfico que entra al túnel se cifra en origen y se descifra en destino.
* **Enrutamiento (Dinámico vs. Estático):** Aunque puedes configurar las rutas a mano, la mejor práctica es habilitar **BGP (Border Gateway Protocol)** a través del túnel (como vimos en la sección 3.6). Si agregas una nueva subred en la nube, BGP la anunciará automáticamente al router de tu oficina, eliminando el trabajo manual.
* **El Problema del Medio:** Al viajar por el Internet público, estás sujeto a la latencia impredecible de los proveedores de servicios de Internet (ISPs). Los paquetes pueden tomar rutas subóptimas y sufrir variaciones (Jitter), lo que lo hace inadecuado para replicación de bases de datos síncronas de alto volumen.

### 3. Conexiones Dedicadas (Direct Connect, ExpressRoute)

Cuando la imprevisibilidad del Internet es inaceptable, o el volumen de datos (Terabytes diarios) haría que los costos de transferencia saliente por VPN fueran prohibitivos, las empresas recurren a enlaces de fibra óptica dedicados. Hablamos de **AWS Direct Connect**, **Azure ExpressRoute** o **GCP Cloud Interconnect**.

* **El Mecanismo:** Tu empresa (o un socio de telecomunicaciones como Equinix) tira un cable físico literal cruzando un centro de datos asociado (*Meet-me room*) para conectarlo directamente a un puerto en un enrutador de borde de AWS/Azure/GCP.
* **Características Clave:**
* **No toca el Internet público:** Es una extensión de tu red de área local (LAN) directa al *backbone* del proveedor de nube.
* **Velocidad y Consistencia:** Se contratan anchos de banda garantizados (desde 1 Gbps hasta 100 Gbps). La latencia es constante y mínima.
* **Costos:** Requiere contratos a largo plazo con ISPs, equipos físicos costosos y tarifas de puerto mensuales. Sin embargo, el precio por Gigabyte transferido *hacia afuera* de la nube es drásticamente inferior al del Internet estándar.

### Representación Estructural de Conectividad Híbrida

```text
=======================================================================
[ INFRAESTRUCTURA ON-PREMISE ]                [ INFRAESTRUCTURA CLOUD ]
=======================================================================

 1. CLIENT VPN (Remote Worker)
 [Laptop con WireGuard] ==== (Túnel sobre Internet) ====> [Client VPN Endpoint] 
                                                                 |
 2. SITE-TO-SITE VPN                                             v
 [Router Físico / Firewall] ==== (Túnel IPsec/BGP) =====> [Virtual Private Gateway]
    (Red 192.168.0.0/16)       (Sujeto a latencia web)           |
                                                                 v
 3. CONEXIÓN DEDICADA                                  [ VPC (10.0.0.0/16) ]
 [Router de Borde] <-------- (Fibra Óptica Privada) ----> [Direct Connect Gateway]
                              (Garantía de Latencia)
=======================================================================

```

### La Perspectiva de Infraestructura como Código (IaC)

Desplegar un enlace físico dedicado requiere tickets de soporte y técnicos *in situ*, pero una VPN Site-to-Site se puede levantar completamente mediante código en minutos. Observa los tres componentes clave en AWS mediante Terraform:

```hcl
# 1. Definimos nuestro router físico (Customer Gateway) con su IP pública estática
resource "aws_customer_gateway" "oficina_principal" {
  bgp_asn    = 65000 # Número de Sistema Autónomo BGP de nuestra oficina
  ip_address = "203.0.113.12"
  type       = "ipsec.1"
}

# 2. Definimos el lado de la nube (Virtual Private Gateway) y lo atamos a la VPC
resource "aws_vpn_gateway" "vpn_gw" {
  vpc_id = aws_vpc.main.id
}

# 3. Creamos la conexión (El Túnel IPsec)
resource "aws_vpn_connection" "conexion_hibrida" {
  vpn_gateway_id      = aws_vpn_gateway.vpn_gw.id
  customer_gateway_id = aws_customer_gateway.oficina_principal.id
  type                = "ipsec.1"
  static_routes_only  = false # Falso significa que usaremos BGP
}

# (Opcional) Terraform te devolverá las claves precompartidas (PSK) 
# y la configuración necesaria para aplicarla en tu router Cisco/Juniper físico.

```

Con estas herramientas de conectividad, tu infraestructura Cloud deja de ser un silo aislado y se convierte en una extensión natural y segura de las operaciones de la empresa.
