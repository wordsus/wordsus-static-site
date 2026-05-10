La virtualización ligera ha transformado el despliegue de software, pero su verdadero poder reside en la conectividad. Este capítulo desglosa la evolución del networking en el ecosistema de contenedores, desde los fundamentos del **modelo CNM** en Docker y sus modos de red (*bridge, host, overlay*), hasta la estandarización industrial mediante la interfaz **CNI**.

Exploraremos el modelo de red plano de **Kubernetes**, donde cada Pod posee una identidad IP única, y compararemos soluciones líderes como Calico y Cilium. Finalmente, analizaremos la gestión avanzada del tráfico mediante **Gateway API** y **Service Mesh**, culminando en el alto rendimiento que ofrece **eBPF** en el kernel de Linux.

## 7.1 Redes en Docker: Modos bridge, host, none y overlay

Antes de sumergirnos en la orquestación a gran escala con Kubernetes, es fundamental comprender cómo Docker resuelve el problema de la conectividad a nivel de un único host y cómo sienta las bases para arquitecturas distribuidas. Docker implementa su arquitectura de red utilizando el **Container Network Model (CNM)**.

El CNM abstrae la complejidad de la red mediante el uso intensivo de *Network Namespaces* (que proporcionan aislamiento a nivel del kernel de Linux) y pares de interfaces virtuales (*veth pairs*). Dependiendo de los requisitos de aislamiento, rendimiento y topología, Docker ofrece cuatro modos de red principales o "drivers".

### 1. Modo Bridge (El puente por defecto)

Cuando ejecutas un contenedor sin especificar una red, Docker lo conecta a la red `bridge` por defecto (comúnmente la interfaz `docker0` en el host).

Un *bridge* en Linux es un switch virtual por software (capa 2). Docker asigna a cada contenedor conectado a este puente una dirección IP privada (generalmente dentro del rango `172.17.0.0/16`). Para que los contenedores se comuniquen con el exterior, Docker configura automáticamente reglas de enmascaramiento (**NAT/PAT**) utilizando `iptables`.

```text
+-------------------------------------------------------------+
|                        Docker Host                          |
|                                                             |
|  +-----------------+                 +-----------------+    |
|  |  Contenedor A   |                 |  Contenedor B   |    |
|  |  IP: 172.17.0.2 |                 |  IP: 172.17.0.3 |    |
|  |  [eth0]         |                 |  [eth0]         |    |
|  +----|------------+                 +----|------------+    |
|       | (veth pair)                       | (veth pair)     |
|       |                                   |                 |
|  +----|-----------------------------------|------------+    |
|  |                    docker0 (Bridge)                 |    |
|  |                    IP: 172.17.0.1                   |    |
|  +-------------------------|---------------------------+    |
|                            | Enrutamiento y NAT (iptables)  |
|                       [eth0 (Host)]                         |
|                       IP: 192.168.1.50                      |
+----------------------------|--------------------------------+
                             v
                        Hacia Internet / LAN

```

* **Exposición de puertos:** Como los contenedores tienen IPs privadas inaccesibles desde fuera del host, debemos mapear puertos del host hacia los puertos del contenedor (`docker run -p 8080:80`).
* **Casos de uso:** Aplicaciones *standalone* que se ejecutan en un único host, entornos de desarrollo local y pruebas.

### 2. Modo Host (Priorizando el rendimiento)

El modo `host` elimina por completo la segregación de red entre el contenedor y el host de Docker. Si un contenedor usa este modo, **no obtiene su propia dirección IP ni su propio *Network Namespace***.

Si ejecutas un servidor web en el puerto 80 dentro de un contenedor en modo host, la aplicación estará disponible directamente en el puerto 80 de la dirección IP del servidor físico o máquina virtual que aloja Docker.

```bash
# Ejemplo de ejecución en modo host
docker run -d --network host nginx

```

* **Ventajas:** Elimina la sobrecarga (overhead) del puente virtual y la traducción de direcciones (NAT), maximizando el rendimiento (throughput) y reduciendo la latencia.
* **Desventajas:** Conflictos de puertos. No puedes ejecutar dos contenedores que escuchen el mismo puerto en el mismo host. Además, reduce la postura de seguridad al compartir la pila de red del sistema operativo base.
* **Casos de uso:** Balanceadores de carga perimetrales, agentes de monitoreo de red o aplicaciones que manejan grandes volúmenes de tráfico L4/L7.

### 3. Modo None (Aislamiento absoluto)

Como su nombre indica, el modo `none` aísla completamente al contenedor a nivel de red. El contenedor recibe su propio *Network Namespace*, pero Docker no configura ninguna interfaz de red en su interior, a excepción de la interfaz de *loopback* (`lo`).

Este contenedor no podrá resolver DNS, ni alcanzar Internet, ni comunicarse con otros contenedores.

* **Casos de uso:** Procesamiento por lotes (batch processing) de archivos montados mediante volúmenes locales donde la seguridad es crítica, almacenamiento de credenciales en memoria, o cuando un administrador de red necesita inyectar una interfaz de red personalizada manualmente (usando herramientas como `iproute2` desde el host).

### 4. Modo Overlay (Cruzando fronteras de hosts)

El modo `overlay` resuelve el problema fundamental de la escalabilidad: ¿Cómo se comunican dos contenedores que residen en distintos servidores físicos sin exponer sus puertos a la red pública?

Este driver crea una red distribuida entre múltiples daemons de Docker (típicamente utilizado en clústeres de Docker Swarm). Para lograr esto, Docker utiliza encapsulamiento **VXLAN** (Virtual eXtensible Local Area Network). VXLAN encapsula las tramas L2 del contenedor dentro de paquetes UDP (L4) del host, creando un túnel transparente.

```text
+-------------------+                            +-------------------+
|      Host 1       |                            |      Host 2       |
|  +-------------+  |                            |  +-------------+  |
|  | Cont. Web   |  |                            |  | Cont. DB    |  |
|  | IP: 10.0.9.2|  |      Túnel VXLAN (UDP)     |  | IP: 10.0.9.3|  |
|  +------|------+  |                            |  +------|------+  |
|         |         | <========================> |         |         |
|  [Red Overlay]    |  (A través de la LAN/WAN)  |  [Red Overlay]    |
+-------------------+                            +-------------------+

```

Para que una red overlay funcione, los hosts deben tener conectividad L3 entre ellos y un almacén de clave-valor distribuido (como el que Swarm integra nativamente) para sincronizar el estado de la red y el mapeo de endpoints.

* **Casos de uso:** Microservicios distribuidos en múltiples nodos. (Nota: Aunque conceptualmente fundamental, en entornos empresariales modernos este rol es típicamente asumido por los plugins CNI de Kubernetes, que exploraremos en la siguiente sección).

---

### Resumen Comparativo

| Modo de Red | Nivel de Aislamiento | Rendimiento | Comunicación Multi-Host | Caso de uso típico |
| --- | --- | --- | --- | --- |
| **Bridge** | Alto (Namespace propio + NAT) | Medio (Sobrecarga de NAT) | No (Solo un host) | Desarrollo, apps aisladas en 1 nodo. |
| **Host** | Nulo (Comparte red del host) | Alto (Sin NAT/Routing extra) | No aplica (Usa IP del host) | Agentes de red, máxima performance. |
| **None** | Total (Sin interfaces) | N/A | No | Tareas seguras offline, networking manual. |
| **Overlay** | Alto (Red virtualizada) | Medio/Bajo (Encapsulamiento VXLAN) | Sí (Túneles UDP) | Clusters Swarm, apps distribuidas. |

## 7.2 CNI (Container Network Interface): Estándares y arquitectura

Si en la sección anterior vimos cómo Docker resolvía la conectividad local mediante su propio modelo (CNM - Container Network Model), al escalar hacia clústeres heterogéneos y orquestadores como Kubernetes, la industria necesitaba un enfoque más agnóstico, estandarizado y modular. Aquí es donde nace **CNI (Container Network Interface)**.

Impulsado por la Cloud Native Computing Foundation (CNCF), CNI no es una herramienta o un programa per se; es una **especificación** y un conjunto de bibliotecas para escribir plugins que configuran interfaces de red en contenedores Linux. Su filosofía es minimalista: solo se preocupa por la conectividad de red del contenedor cuando se crea y por la limpieza de los recursos asignados cuando el contenedor se destruye.

### 1. El estándar CNI: ¿Por qué triunfó sobre CNM?

Mientras que el modelo CNM de Docker exigía un motor centralizado y gestionaba aspectos más amplios (como el Service Discovery), CNI adoptó un enfoque puramente funcional y descentralizado.

Las ventajas de este estándar son:

* **Simplicidad:** Se ejecuta como un binario de un solo uso que recibe un JSON por entrada estándar (stdin) y devuelve el resultado por salida estándar (stdout).
* **Independencia del orquestador:** Funciona igual para Kubernetes, OpenShift, Amazon ECS o Cloud Foundry.
* **Modularidad extrema:** Permite encadenar múltiples plugins (por ejemplo, un plugin principal para crear la interfaz y conectarla a la red, seguido de un plugin de *tuning* para ajustar reglas de sysctl o anchos de banda).

### 2. Arquitectura y Flujo de Ejecución

La arquitectura de CNI se basa en la interacción entre el **Container Runtime** (el software que ejecuta el contenedor, como *containerd* o *CRI-O*) y el **CNI Plugin** (el ejecutable binario proporcionado por soluciones como Flannel, Calico o Cilium).

El flujo de trabajo cuando se despliega un Pod/Contenedor es el siguiente:

1. **Creación del Namespace:** El Container Runtime crea un nuevo *Network Namespace* para el contenedor, aislándolo de la red del host.
2. **Llamada al Plugin:** El Runtime invoca al ejecutable del plugin CNI configurado en el nodo, pasándole variables de entorno (como el nombre del contenedor y el ID del namespace) y un archivo de configuración en formato JSON.
3. **Configuración de Red:** El plugin realiza el trabajo pesado:

* Pide una IP a un submódulo llamado **IPAM** (IP Address Management).
* Crea un par de interfaces virtuales (*veth pair*).
* Inserta un extremo en el *Network Namespace* del contenedor (típicamente renombrándolo a `eth0`) y lo configura con la IP asignada.
* Conecta el otro extremo a la infraestructura de red subyacente del nodo (un bridge, un enrutador virtual o un túnel BGP/VXLAN).

1. **Confirmación:** El plugin devuelve al Runtime un JSON confirmando la IP asignada, las rutas y las interfaces configuradas.

**Diagrama de Arquitectura CNI (Flujo de Adición):**

```text
+-----------------------+        Configuración JSON        +-----------------------+
|   Container Runtime   | -------------------------------> |      CNI Plugin       |
| (containerd / CRI-O)  |  (Comando: ADD, DEL, CHECK)      | (Binario ejecutable)  |
+-----------------------+ <------------------------------- +-----------------------+
        |       ^                Respuesta (IP, Rutas)               |
        |       |                                                    |
        v       | (Asigna NetNS)                                     v
+-------------------------------------------------------------------------------+
|                            Pod / Contenedor (App)                             |
|                                                                               |
|   [ Network Namespace Aislado ] <========>  [ Interfaz eth0 configurada ]     |
+-------------------------------------------------------------------------------+

```

### 3. Operaciones fundamentales de la especificación

La especificación define cuatro comandos principales que todo plugin CNI debe saber manejar (enviados a través de la variable de entorno `CNI_COMMAND`):

* **`ADD`:** Inserta el contenedor en la red y le asigna una dirección IP.
* **`DEL`:** Elimina el contenedor de la red y libera la dirección IP para que el módulo IPAM la devuelva a su pool.
* **`CHECK`:** Verifica que la red del contenedor está configurada según lo esperado (útil para diagnósticos y reparaciones automáticas).
* **`VERSION`:** Reporta la versión de la especificación CNI que soporta el plugin.

### 4. IPAM (IP Address Management)

Es importante destacar que el enrutamiento de red y la asignación de IPs son problemas distintos. CNI delega la gestión de IPs a plugins específicos llamados **IPAM plugins** (como `host-local` o `dhcp`). Esto permite que un plugin de red complejo delegue la tarea de "llevar la cuenta" de qué IPs están libres u ocupadas en cada nodo a una herramienta especializada.

```json
/* Ejemplo simplificado del JSON que el Runtime pasa al CNI Plugin */
{
  "cniVersion": "1.0.0",
  "name": "minired",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.22.0.0/16",
    "routes": [
      { "dst": "0.0.0.0/0" }
    ]
  }
}

```

## 7.3 El modelo de red de Kubernetes: Comunicación Pod-to-Pod y Node-to-Pod

Si el modelo por defecto de Docker (Bridge + NAT) estaba diseñado para simplificar la ejecución de aplicaciones aisladas en una sola máquina, Kubernetes asume desde el primer día que operamos en un sistema distribuido. Manejar puertos dinámicos y reglas NAT complejas entre miles de contenedores distribuidos en cientos de nodos sería una pesadilla operativa y un cuello de botella para el rendimiento.

Para resolver esto, Kubernetes impone un modelo de red "plano" y altamente opinionado. En lugar de adaptar la red a los contenedores, Kubernetes exige que la infraestructura de red subyacente (a través de CNI) cumpla con un contrato estricto.

### 1. El Contrato de Red de Kubernetes (Los 3 Mandamientos)

Cualquier clúster de Kubernetes, independientemente de si se ejecuta en *bare-metal*, AWS o una Raspberry Pi, debe garantizar las siguientes tres reglas fundamentales:

1. **Todos los Pods pueden comunicarse con todos los demás Pods sin usar NAT.**
2. **Todos los Nodos pueden comunicarse con todos los Pods (y viceversa) sin usar NAT.**
3. **La IP que un Pod ve para sí mismo es exactamente la misma IP que los demás ven para él.**

Este enfoque elimina la necesidad de mapear puertos (el infame `-p 8080:80` de Docker). Cada Pod recibe su propia dirección IP enrutable dentro del clúster (el modelo *IP-per-Pod*). A nivel de red, un Pod se comporta como si fuera una máquina virtual o un host físico tradicional.

### 2. Anatomía del Pod a nivel de Red: El contenedor "Pause"

Antes de ver cómo viaja el tráfico, es vital entender qué es la red de un Pod. Un Pod puede contener múltiples contenedores, pero todos comparten el mismo **Network Namespace**.

Kubernetes logra esto inyectando un contenedor invisible y ultraligero llamado `pause` (o *sandbox container* en arquitecturas más modernas con containerd/CRI-O). Este contenedor es el primero en arrancar y su única función es "sostener" el *Network Namespace*, la dirección IP y los puertos. Los contenedores de aplicación que arrancan después se unen a este *namespace* existente.

> **Implicación directa:** Dos contenedores dentro del mismo Pod se comunican entre sí a través de `localhost` (127.0.0.1) usando la interfaz de *loopback*. Esto es ideal para arquitecturas *Sidecar* (como veremos al hablar de Service Mesh).

### 3. Comunicación Intra-Nodo (Pod-to-Pod en el mismo servidor)

Cuando dos Pods que residen en el mismo Nodo físico o virtual necesitan comunicarse, el tráfico nunca abandona el servidor.

El plugin CNI configura un puente virtual local (típicamente llamado `cbr0` o `cni0`). Cada Pod está conectado a este puente mediante un par de interfaces virtuales (*veth pair*).

```text
+------------------------------------------------------------------+
|                             Nodo 1                               |
|                                                                  |
|   +-------------------+              +-------------------+       |
|   |       Pod A       |              |       Pod B       |       |
|   |  IP: 10.244.1.2   |              |  IP: 10.244.1.3   |       |
|   |    [ eth0 ]       |              |    [ eth0 ]       |       |
|   +-------|-----------+              +-------|-----------+       |
|           | (veth1)                          | (veth2)           |
|           v                                  v                   |
|   +-------|----------------------------------|-----------+       |
|   |                 Bridge Virtual (cni0)                |       |
|   |                 IP: 10.244.1.1/24                    |       |
|   +------------------------------------------------------+       |
|                                                                  |
|   [ Interfaz Física (eth0) - IP: 192.168.10.10 ]                 |
+------------------------------------------------------------------+

```

**Flujo de la trama L2:**

1. El Pod A envía un paquete hacia la IP del Pod B (`10.244.1.3`).
2. La tabla de enrutamiento local del Pod A envía el tráfico por su `eth0` por defecto.
3. El paquete atraviesa el *veth pair* y llega al puente `cni0`.
4. El puente inspecciona la dirección MAC de destino (resuelta vía ARP) y conmuta la trama directamente hacia la interfaz `veth2`.
5. El paquete llega a la interfaz `eth0` del Pod B. Todo ocurre en Capa 2, con latencia mínima.

### 4. Comunicación Inter-Nodo (Pod-to-Pod cruzando la red)

Aquí es donde el modelo se vuelve interesante y donde la elección del plugin CNI (que veremos en la sección 7.4) determina el mecanismo exacto (BGP, VXLAN, IP-in-IP). Sin embargo, el flujo lógico general es el siguiente:

```text
+--------------------------------+          +--------------------------------+
|             Nodo 1             |          |             Nodo 2             |
|  [ Pod A - IP: 10.244.1.2 ]    |          |  [ Pod C - IP: 10.244.2.2 ]    |
|               |                |          |               |                |
|       [ Bridge (cni0) ]        |          |       [ Bridge (cni0) ]        |
|               |                |          |               |                |
|  [ Reglas de Enrutamiento ]    |          |  [ Reglas de Enrutamiento ]    |
|               |                |          |               |                |
|  [ eth0 (IP: 192.168.10.10) ]  |          |  [ eth0 (IP: 192.168.10.11) ]  |
+---------------|----------------+          +---------------|----------------+
                |                                           |
                +-------------------------------------------+
                      Red Subyacente (VPC / LAN L2/L3)

```

**Flujo del paquete L3:**

1. El Pod A (`10.244.1.2`) quiere hablar con el Pod C (`10.244.2.2`).
2. El paquete llega al puente `cni0` en el Nodo 1.
3. Como la IP de destino no pertenece a la subred del Nodo 1 (`10.244.1.0/24`), el puente pasa el paquete a la tabla de enrutamiento principal del Nodo 1.
4. Aquí actúa el CNI. El Nodo 1 tiene una ruta instalada (ya sea por BGP o estática) que le indica: *"Para llegar a la red `10.244.2.0/24`, envía el paquete al Nodo 2 (`192.168.10.11`)"*.
5. El paquete sale por la interfaz física `eth0` del Nodo 1 hacia la red subyacente. **Crucial:** La IP de origen del paquete sigue siendo `10.244.1.2` y la de destino `10.244.2.2`. No hay SNAT en este punto.
6. El paquete llega a `eth0` en el Nodo 2. La tabla de enrutamiento del Nodo 2 sabe que la red `10.244.2.0/24` es local y lo redirige a su propio puente `cni0`.
7. El puente `cni0` del Nodo 2 entrega el paquete al Pod C.

### 5. Node-to-Pod y Pod-to-Node

Gracias a la integración del CNI con las tablas de enrutamiento del host Linux, la comunicación entre un servicio del sistema operativo del Nodo (por ejemplo, el agente `kubelet` o un demonio de monitoreo) y un Pod se resuelve con naturalidad.

* **Node -> Pod local:** El Nodo consulta su tabla de enrutamiento, ve que la subred del Pod pertenece al puente local `cni0` y enruta el paquete hacia abajo a través de la interfaz virtual.
* **Node -> Pod remoto:** El Nodo evalúa las reglas generadas por el CNI, encapsula o enruta el tráfico hacia la IP del Nodo remoto que aloja a ese Pod, donde el proceso se repite.

Este diseño elegante transforma un clúster de máquinas dispares en un gigantesco switch/router lógico distribuido, preparando el terreno para implementar lógicas L4/L7 encima, como los K8s Services y las Network Policies.

## 7.4 Plugins CNI populares: Flannel, Calico, Weave y Cilium

El ecosistema de Kubernetes ofrece una amplia variedad de plugins CNI, cada uno diseñado con diferentes prioridades: simplicidad, rendimiento, seguridad o topologías complejas. Elegir el CNI correcto es una de las decisiones arquitectónicas más críticas al desplegar un clúster, ya que migrar de uno a otro en producción es una tarea compleja.

A continuación, analizaremos los cuatro plugins más representativos de la industria.

### 1. Flannel: La simplicidad por bandera

Desarrollado originalmente por CoreOS, Flannel es uno de los CNIs más antiguos y sencillos. Su objetivo principal es cumplir el contrato de Kubernetes con la menor fricción posible.

* **Cómo funciona:** Flannel se centra exclusivamente en el enrutamiento de capa 3. Asigna una subred (por ejemplo, `/24`) a cada nodo del clúster.
* **Backends de comunicación:**
* **VXLAN (Por defecto):** Encapsula los paquetes L2 dentro de paquetes UDP L4 para cruzar la red física. Funciona en casi cualquier infraestructura, pero añade sobrecarga (*overhead*) de procesamiento y ancho de banda.
* **Host-GW:** Crea rutas estáticas L3 directamente en las tablas de enrutamiento de los nodos. Es extremadamente rápido (sin encapsulamiento), pero exige que todos los nodos residan en el mismo dominio de broadcast (capa 2 plana), lo cual no siempre es posible en la nube.

* **Limitaciones:** Flannel **no** soporta *Network Policies* (políticas de red) de Kubernetes por sí solo. Si necesitas microsegmentación y seguridad, deberás combinarlo con otro motor (como Canal, que es Flannel para red + Calico para políticas).
* **Veredicto:** Ideal para entornos de desarrollo, clústeres pequeños o infraestructuras donde la simplicidad operativa prime sobre la seguridad avanzada.

### 2. Calico: Rendimiento puro y microsegmentación

Tigera creó Calico con dos pilares en mente: rendimiento a gran escala y seguridad Zero Trust dentro del clúster. Es, indiscutiblemente, el estándar de facto en entornos empresariales tradicionales.

* **Cómo funciona (Enrutamiento BGP):** A diferencia de la encapsulación de Flannel, Calico trata cada nodo de Kubernetes como un router tradicional. Utiliza **BGP (Border Gateway Protocol)** —el mismo protocolo que hace funcionar Internet— para propagar las rutas de los Pods entre los nodos.
* **Flujo sin encapsular:** Cuando un Pod envía tráfico a otro nodo, el paquete viaja "desnudo" (IP puro), sin cabeceras VXLAN adicionales, obteniendo un rendimiento casi nativo (*bare-metal*).

```text
Comparativa de Tráfico: Flannel (VXLAN) vs Calico (BGP Puro)

[ Flannel VXLAN ]
Pod A ---> [ Cabecera MAC [ IP Nodo [ UDP [ VXLAN [ IP Pod [ Payload ]]]]]] ---> Nodo B
           (Alta sobrecarga por encapsulamiento)

[ Calico BGP ]
Pod A ---> [ Cabecera MAC [ IP Pod [ Payload ]]] ---> Enrutador Físico ---> Nodo B
           (Tráfico nativo L3, máxima eficiencia)

```

* **Seguridad:** Calico es famoso por su robusta implementación de *Network Policies*. Permite denegar o permitir tráfico L3/L4 basándose en etiquetas (labels) de Kubernetes, namespaces o bloques CIDR.
* **Veredicto:** La mejor opción para clústeres grandes en producción que requieren alto rendimiento y políticas de seguridad estrictas. (Nota: Si la red subyacente bloquea BGP, Calico puede recurrir a encapsulamiento IP-in-IP o VXLAN).

### 3. Weave (Weave Net): Malla descentralizada y cifrado

Weave adopta un enfoque diferente al crear una red en malla (*mesh*) virtual que conecta todos los nodos.

* **Cómo funciona:** A diferencia de Flannel o Calico, que dependen de un almacén de datos centralizado (como `etcd`) para conocer la topología, los routers de Weave instalados en cada nodo intercambian información mediante un **protocolo de cotilleo (Gossip Protocol)**. Esto lo hace extremadamente resiliente a particiones de red.
* **Cifrado nativo:** Su característica estrella es la capacidad de cifrar todo el tráfico entre nodos utilizando IPsec (Fast Datapath) con un simple cambio de configuración, lo cual es vital al extender clústeres a través de redes públicas o híbridas.
* **Veredicto:** Excelente para clústeres dispersos geográficamente, entornos híbridos o donde el cifrado del tráfico en tránsito sea un requisito normativo innegociable. *(Nota del autor: Es importante mencionar que Weaveworks cerró sus operaciones a principios de 2024, por lo que su mantenimiento a largo plazo recae ahora enteramente en la comunidad open-source).*

### 4. Cilium: La revolución del Kernel con eBPF

Cilium representa la nueva generación de networking para contenedores y está redefiniendo los estándares de la industria, siendo adoptado por proveedores como Google Cloud (GKE Dataplane V2) y AWS.

* **El poder de eBPF:** En lugar de depender del pesado stack de red de Linux y de miles de reglas secuenciales en `iptables` (el gran cuello de botella de Kube-Proxy en clústeres masivos), Cilium utiliza **eBPF (Extended Berkeley Packet Filter)**. eBPF permite inyectar programas seguros y de alto rendimiento directamente en el núcleo (kernel) de Linux.
* **Capacidades L7:** Mientras que Calico filtra por IP/Puerto (L4), Cilium entiende protocolos de capa de aplicación. Puede aplicar políticas como: *"El Pod A solo puede hacer peticiones HTTP GET a la ruta /api del Pod B"*.
* **Observabilidad:** Gracias a eBPF, Cilium proporciona visibilidad profunda del flujo de paquetes a través de su herramienta *Hubble*, permitiendo rastrear latencias DNS o caídas de conexiones TCP sin necesidad de modificar el código de las aplicaciones.
* **Veredicto:** El presente y futuro del networking nativo de la nube. Indispensable para orquestación masiva, observabilidad profunda y para entornos que buscan reemplazar sidecars tradicionales de Service Mesh.

---

### Tabla Resumen para Toma de Decisiones

| CNI Plugin | Enfoque Principal | Mecanismo Base | Soporte Network Policies | ¿Cuándo elegirlo? |
| --- | --- | --- | --- | --- |
| **Flannel** | Simplicidad | VXLAN / Host-GW | No (Requiere Calico) | PoCs, laboratorios, clústeres pequeños sin requisitos de seguridad. |
| **Calico** | Rendimiento y L4 | L3 Puro (BGP) / IP-in-IP | Sí (Excelente L3/L4) | Producción estándar empresarial, alta escalabilidad. |
| **Weave** | Resiliencia y Cifrado | Overlay Mesh (Gossip) | Sí | Clústeres en redes no confiables, necesidad de cifrado IPsec rápido. |
| **Cilium** | Observabilidad y L7 | eBPF | Sí (Avanzado L3-L7) | Clústeres modernos masivos, necesidad de observabilidad L7 sin sidecars. |

## 7.5 Exposición de aplicaciones: K8s Services (ClusterIP, NodePort, LoadBalancer)

Hasta ahora hemos garantizado que cualquier Pod pueda comunicarse con otro gracias al CNI. Sin embargo, en un entorno dinámico, los Pods son efímeros: mueren, se escalan, se actualizan y, por ende, **sus direcciones IP cambian constantemente**.

Depender de la IP de un Pod para la comunicación es una receta para el desastre. Kubernetes resuelve esto mediante la abstracción del **Service (Servicio)**, una API de capa 4 (TCP/UDP) que proporciona una dirección IP Virtual (VIP) estable, un puerto persistente y balanceo de carga básico hacia un conjunto dinámico de Pods, identificados a través de *Labels* (etiquetas) y *Selectors*.

¿Quién ejecuta esta "magia" en la red? Tradicionalmente, un agente llamado **`kube-proxy`** que corre en cada nodo. `kube-proxy` observa la API de Kubernetes y actualiza las reglas de red locales (usando `iptables` o `IPVS`) para interceptar el tráfico destinado a la IP del Servicio y redirigirlo a la IP del Pod correspondiente.

Existen tres tipos principales de Servicios para publicar nuestras aplicaciones, ordenados de menor a mayor exposición:

### 1. ClusterIP (Tráfico Interno Estándar)

Es el tipo de Servicio por defecto. Al crearlo, Kubernetes le asigna una IP virtual desde un rango interno específico del clúster (distinto al rango del CNI).

* **Comportamiento:** Esta IP **solo es enrutable desde dentro del clúster**. Los Pods pueden hacer peticiones a esta IP (o a su nombre DNS interno, gestionado por CoreDNS), y el tráfico se balanceará equitativamente entre los Pods de backend.
* **Casos de uso:** Comunicación interna entre microservicios (por ejemplo, un backend de Node.js consultando a una base de datos PostgreSQL o a una caché Redis).

### 2. NodePort (Abriendo la puerta del clúster)

Si necesitamos que una aplicación sea accesible desde el exterior (la red de la oficina o Internet), `ClusterIP` no es suficiente. El tipo `NodePort` se construye *sobre* la base de un `ClusterIP`.

* **Comportamiento:** Además de crear la VIP interna, Kubernetes reserva un puerto estático en **todos y cada uno de los Nodos del clúster** (por defecto, en el rango `30000 - 32767`). Cualquier tráfico enviado a la `IP_DEL_NODO:NODE_PORT` será interceptado y enrutado hacia los Pods correspondientes.
* **El salto inter-nodo:** Un detalle crucial a nivel de red es que si un cliente ataca la IP del *Nodo A* en el puerto 30080, pero el Pod destino reside en el *Nodo B*, `kube-proxy` realizará un enrutamiento interno (haciendo SNAT) para enviar el paquete del Nodo A al Nodo B.
* **Casos de uso:** Entornos de desarrollo, integraciones con balanceadores de carga *on-premise* heredados (como un F5 o HAProxy externo), o aplicaciones donde no existe un proveedor de nube que gestione balanceadores.

### 3. LoadBalancer (Integración Cloud Nativa)

En producción, dar a tus usuarios una IP dinámica de un nodo y un puerto en el rango 30000 no es viable. El tipo `LoadBalancer` es la evolución directa de `NodePort` y está diseñado para interactuar con la infraestructura subyacente.

* **Comportamiento:** Se construye sobre `NodePort` (que a su vez se construye sobre `ClusterIP`). Cuando solicitas un Servicio de tipo `LoadBalancer`, el *Cloud Controller Manager* de Kubernetes realiza llamadas a la API de tu proveedor (AWS, GCP, Azure) para provisionar de forma asíncrona un **Network Load Balancer (NLB)** real en la nube.
* **Flujo de tráfico:** El balanceador de nube recibe una IP pública y distribuye el tráfico externo hacia las IPs de los Nodos de Kubernetes, específicamente apuntando al puerto `NodePort` expuesto.

```text
Flujo de Red de un Servicio tipo LoadBalancer:

[ Cliente Externo / Internet ]
           |
           v
+-----------------------------+
|    Cloud Load Balancer      |  <-- Creado dinámicamente vía API (Ej: AWS NLB)
|    IP Pública: 203.0.113.5  |
+-----------------------------+
           |
           | Balancea tráfico a los Nodos del Clúster
           v
+-----------------------------+       +-----------------------------+
|           NODO 1            |       |           NODO 2            |
| (eth0 IP: 192.168.1.10)     |       | (eth0 IP: 192.168.1.11)     |
| Puerto abierto: 31500       |       | Puerto abierto: 31500       |
+--------------|--------------+       +--------------|--------------+
               |                                     |
               +-----------------+-------------------+
                                 | (Reglas iptables/eBPF interceptan tráfico)
                                 v
                     +-----------------------+
                     |  Service: ClusterIP   |  <-- VIP: 10.96.0.10
                     +-----------------------+
                                 |
                     +-----------+-----------+
                     |                       |
                     v                       v
               [ Pod A ]                 [ Pod B ]
           (IP: 10.244.1.5)          (IP: 10.244.2.8)

```

**Consideración de Red (External Traffic Policy):**
Por defecto, como vimos en NodePort, el tráfico que entra por un nodo puede saltar a otro, lo que añade un "hop" extra (latencia) y oscurece la IP de origen del cliente (debido al SNAT). Para aplicaciones que necesitan conocer la IP real del cliente de L3, se utiliza la directiva `externalTrafficPolicy: Local`. Esto fuerza a que el tráfico entrante a un nodo solo sea entregado a los Pods *locales* de ese nodo; si el nodo no tiene Pods para ese servicio, descarta el tráfico (dejando que el Load Balancer externo lo detecte como insano y redirija el tráfico a un nodo que sí tenga Pods).

Con estas abstracciones (L3 y L4) bien definidas, Kubernetes resuelve la conectividad básica. Pero, ¿qué ocurre cuando necesitamos exponer múltiples servicios web (HTTP/HTTPS) por un mismo puerto 443, aplicar terminación TLS o enrutar basado en la URL?

## 7.6 Enrutamiento avanzado L7 en K8s: Ingress Controllers y la nueva Gateway API

Como vimos en la sección anterior, los Servicios de tipo `LoadBalancer` resuelven la conectividad de capa 4. Sin embargo, en arquitecturas de microservicios modernas, este enfoque presenta dos problemas graves:

1. **Coste e ineficiencia:** Por cada Servicio `LoadBalancer` expuesto, el proveedor de nube aprovisiona un balanceador físico o virtual dedicado (y facturable). Exponer 50 microservicios web implicaría pagar por 50 balanceadores.
2. **Falta de inteligencia de aplicación:** Un balanceador L4 (TCP/UDP) no entiende de URLs, rutas, cabeceras HTTP, ni certificados SSL/TLS. No puede enrutar el tráfico basándose en si el usuario solicita `api.midominio.com/v1` o `midominio.com/blog`.

Para solucionar esto, Kubernetes introdujo el concepto de **Ingress**, que consolida el enrutamiento L7 detrás de un único punto de entrada público.

### 1. La arquitectura clásica: Ingress e Ingress Controllers

El modelo de Ingress en Kubernetes se divide en dos componentes fundamentales: el **recurso Ingress** (la regla estática) y el **Ingress Controller** (el motor dinámico que aplica la regla).

* **El Recurso Ingress:** Es un objeto YAML nativo de Kubernetes donde los desarrolladores declaran las reglas de enrutamiento (ej. "Enruta el tráfico del host `app.com` hacia el Servicio `frontend`, y el path `/api` hacia el Servicio `backend`").
* **El Ingress Controller:** Kubernetes *no* incluye un controlador por defecto. Debes desplegar uno (usualmente basado en proxies inversos consolidados como NGINX, Traefik o HAProxy). Este controlador se expone al exterior mediante un único Servicio de tipo `LoadBalancer` o `NodePort`. Su trabajo es leer constantemente la API de Kubernetes en busca de nuevos objetos Ingress y reescribir su propia configuración interna (`nginx.conf`, por ejemplo) al vuelo.

```text
Flujo de tráfico con Ingress Controller:

[ Internet ] ---> (HTTPS / 443)
      |
      v
+-----------------------------+
|    Cloud Load Balancer      | (Único NLB de capa 4 / Coste unificado)
+-----------------------------+
      |
      v
+-----------------------------+
|    Ingress Controller       | (Ej: NGINX corriendo como un Pod en K8s)
|   (Terminación TLS L7)      |
+-----------------------------+
      |----------------------------------+
      | (Regla: host=api.com)            | (Regla: path=/blog)
      v                                  v
[ Servicio API ]                   [ Servicio Blog ]
      |                                  |
   [Pod API]                          [Pod Blog]

```

**Limitaciones del Ingress clásico:**
Aunque útil, la API de Ingress original demostró ser demasiado simple. Carecía de soporte nativo para características avanzadas como enrutamiento basado en cabeceras HTTP, división de tráfico (*traffic splitting* para despliegues Canary) o redirecciones complejas. Para lograr esto, los administradores se vieron obligados a abusar de las **Annotations** en los YAMLs (ej. `nginx.ingress.kubernetes.io/rewrite-target`), creando configuraciones frágiles y acopladas a controladores específicos.

### 2. La evolución: Gateway API

Para resolver las deficiencias del Ingress clásico, el grupo de trabajo de redes de Kubernetes (SIG-NETWORK) diseñó una especificación completamente nueva, expresiva y extensible: la **Gateway API**.

A diferencia de Ingress, que mezclaba las responsabilidades en un solo objeto, Gateway API está diseñada desde cero con un enfoque **orientado a roles** (Role-Oriented Design), reconociendo que la gestión de redes en entornos empresariales involucra a diferentes equipos.

La arquitectura se divide en tres capas de recursos:

1. **GatewayClass (Proveedor de Infraestructura):** Define el tipo de balanceador o proxy que se utilizará (ej. `istio`, `cilium`, o un balanceador de nube nativo como ALB de AWS).
2. **Gateway (Administrador del Clúster):** Define un punto de entrada físico a la red. El administrador especifica aquí los puertos, los listeners (HTTP/HTTPS) y adjunta los certificados TLS centralizados.
3. **HTTPRoute / TLSRoute / TCPRoute (Desarrollador de Aplicaciones):** Aquí reside la verdadera potencia. Los desarrolladores definen las reglas de enrutamiento L7. Un `HTTPRoute` se "engancha" a un `Gateway` específico.

**Ventajas clave de Gateway API sobre Ingress:**

* **Delegación segura (Cross-Namespace):** Un administrador puede crear un `Gateway` en el namespace `infra` y permitir que equipos de desarrollo en los namespaces `frontend` y `backend` enganchen sus propios `HTTPRoutes` de forma autónoma, sin pisarse las configuraciones.
* **Funcionalidad L7 nativa:** Permite coincidencia exacta de cabeceras, reescritura de URLs, división de tráfico basada en pesos (ej. 90% a la versión v1, 10% a la v2) y configuración de timeouts directamente en la API de Kubernetes, eliminando la dependencia de las *annotations* propietarias.
* **Más allá de HTTP:** Soporta protocolos nativos TCP, UDP y gRPC mediante sus rutas específicas (`TCPRoute`, `GRPCRoute`).

```text
Modelo de Roles en Gateway API:

[ Equipo de Infraestructura ] ---> Despliega: GatewayClass
                                              |
[ Administrador del Clúster ] ---> Despliega: Gateway (Abre puerto 443, asocia TLS)
                                              |
                                     +--------+--------+
                                     |                 |
[ Equipo Dev A ] ---> Despliega: HTTPRoute        [ Equipo Dev B ] ---> Despliega: HTTPRoute
                      (Path: /pagos)                                    (Path: /usuarios)
                      (Match Header: env=prod)                          (Weight: 50/50 Canary)

```

La adopción de la Gateway API marca un antes y un después, estandarizando funciones que antes requerían implementaciones complejas, y sentando las bases para integrar de manera natural el enrutamiento perimetral (North-South) con el enrutamiento interno entre microservicios (East-West).

## 7.7 Service Mesh (Istio, Linkerd): Sidecars, mTLS, Traffic Splitting y Circuit Breaking

A medida que las arquitecturas monolíticas se dividen en docenas o cientos de microservicios, la red interna del clúster (el tráfico *East-West*) se vuelve caótica. CNI y Kubernetes Services garantizan que los paquetes lleguen de un punto A a un punto B, pero no abordan problemas de nivel de aplicación: ¿Qué pasa si el servicio B responde lento? ¿Cómo reintentamos una petición fallida sin sobrecargar la red? ¿Cómo garantizamos que la comunicación interna esté cifrada?

Históricamente, los desarrolladores integraban estas lógicas (reintentos, timeouts, telemetría) directamente en el código de la aplicación usando bibliotecas específicas del lenguaje (como Netflix OSS/Hystrix en Java). Un **Service Mesh** (Malla de Servicios) extrae toda esta lógica de red y la empuja hacia la infraestructura, haciéndola agnóstica al lenguaje de programación.

### 1. La Arquitectura Base: El patrón Sidecar

El Service Mesh tradicional funciona interceptando todo el tráfico de red de un microservicio sin que este se dé cuenta. Esto se logra mediante el patrón **Sidecar**.

Cuando despliegas un Pod, el Service Mesh inyecta automáticamente un segundo contenedor (un proxy de red ligero, como **Envoy** o **Linkerd-proxy**) dentro del mismo *Network Namespace* del Pod. Todo el tráfico que entra o sale del contenedor de tu aplicación es forzado a pasar primero por este proxy mediante reglas locales de `iptables`.

La arquitectura se divide en dos planos:

* **Plano de Datos (Data Plane):** El conjunto de todos los proxies sidecar distribuidos por el clúster. Son los que realmente mueven, inspeccionan y modifican los paquetes.
* **Plano de Control (Control Plane):** El cerebro central (ej. `istiod`). No toca el tráfico de red, pero empuja las configuraciones de enrutamiento, políticas y certificados a los proxies del plano de datos.

```text
Arquitectura de Service Mesh (Tráfico Pod-to-Pod)

      [ PLANO DE CONTROL ] (Gestiona políticas, telemetría y certificados)
               |
  (Sincronización de configuración vía gRPC)
               |
+--------------v--------------+               +--------------v--------------+
|            POD A            |               |            POD B            |
|                             |               |                             |
|  [ App A ] <---> [ Proxy ]  | <===========> |  [ Proxy ] <---> [ App B ]  |
|                  (Sidecar)  |   Tráfico     |  (Sidecar)                  |
+-----------------------------+   de Red      +-----------------------------+

```

### 2. Capacidades Fundamentales de un Service Mesh

Al tener un proxy L7 en ambos extremos de cada conexión, el Service Mesh desbloquea características avanzadas de resiliencia y seguridad:

#### A. mTLS (Mutual TLS) y Zero Trust Interno

En una red tradicional, una vez que el tráfico atraviesa el firewall perimetral, viaja en texto plano. En un Service Mesh, el proxy del Pod A negocia dinámicamente una conexión TLS con el proxy del Pod B.

* **Autenticación Mutua:** El Pod A verifica la identidad del Pod B, y el Pod B verifica al Pod A basándose en certificados criptográficos atados a sus Service Accounts de Kubernetes.
* **Cifrado Transparente:** La aplicación envía tráfico HTTP normal (puerto 80) hacia `localhost`. El proxy lo intercepta, lo cifra y lo envía por la red. El proxy receptor lo descifra y se lo entrega a la aplicación destino en texto plano.

#### B. Traffic Splitting (Enrutamiento Ponderado)

Permite desviar un porcentaje exacto del tráfico hacia diferentes versiones de un servicio, ideal para despliegues **Canary** o pruebas **A/B**.
Por ejemplo, puedes configurar el plano de control para que: *"El 95% del tráfico dirigido al `Servicio-Pagos` vaya a la versión v1, y el 5% vaya a la nueva versión v2"*.

#### C. Circuit Breaking (Cortocircuitos) y Reintentos

Diseñado para evitar fallos en cascada. Si el `Servicio-BaseDatos` está sufriendo lentitud extrema y fallando peticiones, seguir enviándole tráfico solo empeorará su estado y bloqueará los hilos del servicio cliente.

* **Circuit Breaker:** El proxy detecta que el servicio destino ha cruzado un umbral de fallos (ej. 5 errores 5xx consecutivos) y "abre el circuito". Inmediatamente devuelve errores al cliente sin intentar contactar al destino, dándole tiempo para recuperarse.
* **Reintentos Inteligentes:** Si una petición GET falla por un microcorte de red, el proxy puede configurarse para reintentar la petición 3 veces con un retroceso exponencial (*exponential backoff*) antes de devolver un error a la aplicación.

### 3. Principales Implementaciones en el Mercado

Aunque existen varias opciones, el mercado está dominado por dos grandes actores con filosofías distintas:

* **Istio:** Respaldado por Google e IBM, es la solución más robusta y rica en características. Utiliza **Envoy Proxy** en su plano de datos. Históricamente criticado por su complejidad y alto consumo de recursos, Istio ha evolucionado recientemente con **Ambient Mesh**, una arquitectura "sidecarless" (sin sidecar) que utiliza proxies compartidos por nodo (ztunnels) para reducir la sobrecarga, acercándose conceptualmente a lo que hacen herramientas basadas en eBPF.
* **Linkerd:** Creado por Buoyant y parte de la CNCF, se promociona como el Service Mesh ultraligero y centrado en la seguridad. A diferencia de Istio, Linkerd construyó su propio proxy en **Rust** (Linkerd2-proxy), diseñado específicamente para ser diminuto y extremadamente rápido (micro-proxy). Su lema es la simplicidad operativa, ofreciendo mTLS por defecto sin configuraciones complejas.

---

### Resumen Estratégico

Implementar un Service Mesh introduce una penalización de latencia (típicamente de 1 a 3 milisegundos por salto debido a la inspección L7 de los proxies) y una mayor complejidad operativa. No obstante, para organizaciones que operan arquitecturas distribuidas complejas, los beneficios en visibilidad (trazabilidad distribuida), resiliencia de red y postura de seguridad (mTLS estandarizado) superan con creces los costes computacionales.

## 7.8 Revolución en el kernel: eBPF (Extended Berkeley Packet Filter) aplicado al networking y seguridad de contenedores

A lo largo de este capítulo, hemos visto cómo herramientas como `kube-proxy`, los Ingress Controllers y los Service Meshes (mediante sidecars) resuelven problemas complejos de enrutamiento y seguridad. Sin embargo, todos comparten un defecto arquitectónico fundamental: dependen del espacio de usuario (*user-space*) o de subsistemas heredados del kernel de Linux, como `iptables` o `Netfilter`, que no fueron diseñados para la escala dinámica de Kubernetes.

Aquí es donde **eBPF (Extended Berkeley Packet Filter)** cambia las reglas del juego. eBPF es una tecnología revolucionaria que permite ejecutar programas en un entorno aislado (*sandbox*) directamente dentro del kernel de Linux, sin necesidad de modificar el código fuente del núcleo ni cargar módulos de kernel (`.ko`) arriesgados.

A menudo se utiliza una analogía muy precisa: **eBPF es para el kernel de Linux lo que JavaScript es para el navegador web**. Permite inyectar lógica dinámica y segura en eventos del sistema (como la llegada de un paquete de red o la apertura de un socket) en tiempo real.

### 1. El problema de iptables y el salto al $O(1)$

Tradicionalmente, `kube-proxy` utiliza `iptables` para enrutar el tráfico de los Servicios (ClusterIP, NodePort). `iptables` evalúa las reglas de forma secuencial. Si tienes un clúster con 10.000 Servicios, un paquete podría tener que ser evaluado contra decenas de miles de reglas antes de ser enrutado. Esto representa una complejidad algorítmica de $O(n)$, lo que provoca una degradación severa de la latencia (latencia de cola o *tail latency*) a medida que el clúster crece.

Los programas eBPF, por el contrario, utilizan mapas hash integrados en el kernel (*eBPF maps*) para realizar búsquedas de IP y puertos. Esto reduce la complejidad de búsqueda a $O(1)$, manteniendo un rendimiento constante e instantáneo sin importar si hay 10 o 100.000 Servicios en el clúster.

### 2. Redefiniendo el Datapath: El bypass del TCP/IP

En un entorno tradicional con Service Mesh, cuando el *Contenedor A* quiere hablar con el *Contenedor B* en el mismo nodo, el paquete debe atravesar toda la pila TCP/IP del kernel varias veces (ida y vuelta a través de los proxies sidecar).

eBPF tiene la capacidad de interceptar el tráfico a nivel de los *sockets* de red. Si eBPF detecta que dos procesos en el mismo host están intentando comunicarse, puede puentear por completo la compleja pila TCP/IP de Netfilter y copiar los datos directamente del socket de origen al socket de destino.

```text
Flujo Tradicional (Con iptables y Sidecars) vs. Flujo eBPF

[ TRADICIONAL ]
App A -> Socket -> TCP/IP -> iptables -> veth -> TCP/IP -> Proxy Sidecar -> TCP/IP -> veth ... (Y repite hacia App B)
(Alta sobrecarga por múltiples cruces entre User-Space y Kernel-Space)

[ ACELERACIÓN eBPF (Ej: Cilium) ]
App A -> Socket (Interceptado por eBPF) =====[ Redirección directa ]====> Socket -> App B
(La red como un bus de memoria de altísima velocidad)

```

### 3. XDP (eXpress Data Path): Seguridad en la tarjeta de red

Otra capacidad crítica de eBPF aplicada al networking es **XDP**. XDP permite adjuntar programas eBPF directamente al controlador de la tarjeta de red (NIC).

Esto significa que un programa eBPF puede inspeccionar un paquete entrante y decidir descartarlo (*drop*) o redirigirlo antes de que el kernel de Linux asigne memoria para él (el `sk_buff`).

* **Caso de uso:** Es la defensa definitiva contra ataques DDoS volumétricos. Con XDP, un nodo de Kubernetes puede descartar millones de paquetes maliciosos por segundo consumiendo apenas un par de ciclos de CPU, algo imposible con firewalls tradicionales basados en `iptables`.

### 4. Observabilidad profunda y el fin del Sidecar obligatorio

Al estar incrustado en el kernel, eBPF "ve" todo. Entiende qué proceso exacto (PID) y qué contenedor específico está abriendo una conexión.

* **Contexto de Kubernetes en el Kernel:** Históricamente, el kernel solo entendía de IPs y Puertos. Con eBPF (utilizado por herramientas como **Cilium** o **Pixie**), la telemetría de red se enriquece directamente con los metadatos de Kubernetes. Si hay un pico de latencia, eBPF no te dice "la IP 10.0.5.2 está lenta"; te dice "el Pod `frontend-v2`, en el namespace `produccion`, con el label `team=pagos`, está experimentando latencia en consultas HTTP GET".
* **Service Mesh sin Sidecar:** Gracias a esta visibilidad en L7 (interceptando funciones de bibliotecas criptográficas o llamadas HTTP en el socket), la industria está pivotando hacia mallas de servicios basadas en eBPF, eliminando la necesidad de inyectar un proxy de Envoy en cada Pod, lo que reduce drásticamente el consumo de RAM y CPU del clúster.

### 5. Conclusión del Capítulo

El ecosistema de redes de contenedores ha madurado rápidamente. Hemos pasado de puentes locales simples en Docker (Modo Bridge), al establecimiento de estándares agnósticos (CNI), hasta llegar a la creación de redes virtuales distribuidas e inteligentes manejadas directamente en las entrañas del sistema operativo con eBPF.

Comprender estas capas es lo que separa a un administrador de sistemas tradicional de un verdadero ingeniero Cloud Native.
