En Kubernetes, la red no es un mero canal de datos, sino el tejido conectivo que define la resiliencia y escalabilidad del sistema. Este capítulo desglosa el modelo de comunicación **IP-per-Pod**, eliminando la fricción de los mapeos de puertos tradicionales. Exploraremos cómo el estándar **CNI** permite la interoperabilidad de diversos motores de red y cómo **CoreDNS** facilita el descubrimiento dinámico mediante nombres legibles. Desde el balanceo de carga con **Services** hasta el enrutamiento inteligente de **Ingress** y la moderna **Gateway API**, aprenderás a orquestar el tráfico de forma eficiente, culminando con políticas de seguridad que garantizan un entorno de confianza cero.

## 4.1 El modelo de red de Kubernetes y el estándar CNI (Container Network Interface)

Si vienes del mundo de Docker tradicional o Docker Compose, probablemente estés acostumbrado a lidiar con el mapeo de puertos (Port Mapping) y las redes NAT (Network Address Translation). En ese modelo, si tienes tres contenedores ejecutando un servidor web en el puerto 80 en el mismo host, te ves obligado a mapearlos a puertos dinámicos en la máquina anfitriona (por ejemplo, 8080, 8081 y 8082) para evitar colisiones.

Kubernetes elimina esta complejidad desde la raíz imponiendo un modelo de red radicalmente distinto, plano y sin fricciones, conocido como el modelo **IP-per-Pod** (una IP por Pod).

### Las 3 reglas de oro del modelo de red de Kubernetes

Para que un clúster de Kubernetes funcione correctamente, la red subyacente debe cumplir con tres requisitos fundamentales. Cualquier implementación de red en Kubernetes debe garantizar que:

1. **Cualquier Pod puede comunicarse con cualquier otro Pod en cualquier nodo sin usar NAT.** (Comunicación Pod-a-Pod directa).
2. **Los agentes de un nodo (como el `kubelet` o demonios del sistema) pueden comunicarse con todos los Pods de ese mismo nodo.**
3. **La IP que un Pod ve para sí mismo es exactamente la misma IP que los demás ven para él.** No hay enmascaramiento ni traducción de IPs en la comunicación interna.

Este enfoque simplifica enormemente la vida de los desarrolladores y las aplicaciones. Si un Pod de un microservicio quiere hablar con un Pod de base de datos, simplemente se conecta a su IP y a su puerto nativo (por ejemplo, el 5432 para PostgreSQL). No hay mapeos complejos de por medio.

### Anatomía de la comunicación Pod-a-Pod

Para entender cómo se logra esto bajo el capó (nivel Senior), debemos mirar las primitivas de red de Linux. Cuando se crea un Pod, se le asigna su propio **Network Namespace** (un entorno de red aislado). Para que este Pod se comunique con el exterior, se utiliza un par de interfaces Ethernet virtuales, conocidas como **veth pair**.

Imagina un `veth pair` como un cable de red virtual: un extremo se conecta dentro del Network Namespace del Pod (usualmente como `eth0`) y el otro extremo se conecta en el Network Namespace del nodo anfitrión (host), uniéndose a un puente de red virtual (Virtual Bridge), a menudo llamado `cni0` o `docker0`.

```text
+-------------------------------------------------------------+
|                           NODO (Worker)                     |
|                                                             |
|  +-------------------+               +-------------------+  |
|  |       Pod A       |               |       Pod B       |  |
|  |   IP: 10.244.1.2  |               |   IP: 10.244.1.3  |  |
|  |                   |               |                   |  |
|  |  [eth0] (veth-A1) |               |  [eth0] (veth-B1) |  |
|  +-----|-------------+               +-----|-------------+  |
|        |                                   |                |
|        +-----------+           +-----------+                |
| (Cable virtual)    |           |    (Cable virtual)         |
|                    v           v                            |
|                  [veth-A2]   [veth-B2]                      |
|          +-----------------------------------+              |
|          |         Puente Virtual (cni0)     |              |
|          +-----------------|-----------------+              |
|                            |                                |
|                        [ eth0 ] (Interfaz física del Nodo)  |
|                            |   IP: 192.168.1.10             |
+----------------------------|--------------------------------+
                             |
                             v
                    Hacia otros Nodos / Red Física

```

Si el Pod A quiere hablar con el Pod B en el mismo nodo, el tráfico viaja a través del puente virtual local. Si el Pod A quiere hablar con un Pod C en un **nodo distinto**, el tráfico sale del puente virtual, atraviesa la interfaz física del nodo y viaja por la red de la infraestructura hacia el nodo de destino, donde el proceso se invierte.

### El estándar CNI (Container Network Interface)

Kubernetes en sí mismo **no** implementa la red de los contenedores. Solo define el modelo (las 3 reglas mencionadas) y delega la ejecución real a un plugin de red. Aquí es donde entra en juego **CNI**.

CNI es una especificación (un proyecto de la CNCF) que define una interfaz estándar entre los Container Runtimes (como containerd o CRI-O) y los plugins de red.

**¿Cómo funciona el flujo?**

1. El `kubelet` recibe la instrucción del API Server de crear un Pod.
2. El `kubelet` instruye al Container Runtime (CRI) para que cree el contenedor "pause" (que inicializa el Network Namespace del Pod).
3. El Container Runtime ejecuta el binario del plugin CNI configurado en el nodo (usualmente ubicado en `/opt/cni/bin/`).
4. El plugin CNI recibe una orden de tipo `ADD`, asigna una IP al Pod, configura el `veth pair`, actualiza las rutas en el host y devuelve el resultado al Runtime.
5. Cuando el Pod se elimina, el proceso se repite con una orden `DEL` para limpiar las reglas y liberar la IP.

La configuración de CNI en un nodo suele residir en `/etc/cni/net.d/`. Un archivo de configuración básico (en formato JSON) se ve así:

```json
{
  "cniVersion": "0.4.0",
  "name": "mi-red-k8s",
  "type": "flannel",
  "delegate": {
    "isDefaultGateway": true
  }
}

```

### Overlay vs. Underlay Networks

A medida que avances en arquitecturas de red, te encontrarás con dos enfoques principales que los plugins CNI utilizan para enrutar el tráfico entre nodos:

1. **Redes Overlay (Superpuestas):** Utilizadas por plugins como Flannel o Calico (por defecto). Crean una red virtual encima de la red física existente. Utilizan tecnologías de encapsulamiento como **VXLAN** o **IP-in-IP**. El paquete original del Pod se "envuelve" dentro de un paquete UDP estándar del nodo para viajar por la red física. Es fácil de instalar en cualquier infraestructura, pero añade una ligera sobrecarga (overhead) por la encapsulación y desencapsulación computacional.
2. **Redes Underlay (Subyacentes):** Utilizadas por plugins como AWS VPC CNI o Azure CNI. Aquí, los Pods reciben direcciones IP de la red real subyacente (por ejemplo, IPs directamente de las subredes de la VPC de AWS). No hay encapsulamiento. Esto ofrece un rendimiento de red nativo y permite que recursos externos (como máquinas virtuales fuera del clúster) se comuniquen directamente con los Pods por sus IPs, aunque consume las IPs de tu red corporativa o de nube más rápidamente.

### Plugins CNI Populares

Existen docenas de plugins CNI, cada uno con sus fortalezas. Como ingeniero DevOps o Arquitecto, la elección del CNI es una de las primeras y más críticas decisiones al desplegar un clúster:

* **Flannel:** El más simple. Ideal para aprender. Configura una red Overlay básica utilizando VXLAN. No soporta Network Policies por sí solo.
* **Calico:** El estándar de la industria para entornos on-premise y muchas nubes. Soporta tanto Overlay como redes enrutadas puras (usando BGP). Su punto más fuerte es la implementación nativa y robusta de Network Policies (que exploraremos en la sección 4.6).
* **AWS VPC CNI / Azure CNI / GKE Native:** Los plugins nativos de los proveedores de nube. Altamente optimizados para rendimiento en sus respectivos ecosistemas utilizando redes Underlay.
* **Cilium:** La nueva generación. Utiliza una tecnología del kernel de Linux llamada **eBPF** para manejar la red y la seguridad a un nivel de abstracción y rendimiento altísimo, saltándose las limitaciones de `iptables`. (Profundizaremos en el potencial de eBPF y Cilium en el Capítulo 13).

Comprender este modelo y el rol del CNI es el cimiento necesario. Ahora que sabemos cómo los Pods obtienen sus IPs y se comunican, el siguiente desafío lógico es cómo encontrarlos dinámicamente, lo que nos lleva directamente al DNS interno del clúster.

## 4.2 DNS interno del clúster (CoreDNS)

En la sección anterior establecimos cómo el CNI y el modelo de red garantizan que cada Pod tenga una IP única y pueda comunicarse con cualquier otro. Sin embargo, en un entorno nativo de la nube, depender de direcciones IP directas es una receta para el desastre.

Los Pods son efímeros; nacen, mueren, son reemplazados por nuevas versiones o movidos a otros nodos si hay un fallo de hardware. Cada vez que esto ocurre, sus direcciones IP cambian. Si tu aplicación *frontend* tiene configurada la IP `10.244.1.3` para hablar con tu *backend*, esa conexión se romperá en el momento en que el Pod del backend sea recreado.

Para solucionar este problema de descubrimiento dinámico, Kubernetes utiliza un sistema de nombres de dominio (DNS) interno. Desde la versión 1.13, el estándar absoluto para esto es **CoreDNS**.

### La Arquitectura de CoreDNS

CoreDNS no es un ente mágico fuera del clúster; es simplemente otra carga de trabajo de Kubernetes. Se ejecuta típicamente como un `Deployment` (usualmente con dos réplicas para alta disponibilidad) dentro del namespace `kube-system`.

Su función principal es escuchar los eventos del API Server. Cada vez que creas un **Service** (que analizaremos a fondo en la sección 4.3), CoreDNS crea automáticamente un registro DNS para él.

¿Cómo sabe un Pod recién creado a quién preguntarle para resolver un nombre? El `kubelet` de cada nodo se encarga de inyectar la configuración del DNS directamente dentro de los contenedores del Pod. Si examinas el archivo `/etc/resolv.conf` dentro de casi cualquier Pod de tu clúster, verás algo como esto:

```bash
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5

```

La IP `10.96.0.10` es la dirección estática del Service de CoreDNS. Todo el tráfico de resolución de nombres dentro del contenedor será enviado allí primero.

### El Estándar de Nombres (FQDN) en Kubernetes

Kubernetes sigue una convención estricta para formar el *Fully Qualified Domain Name* (FQDN) de los recursos internos. La estructura es la siguiente:

`<nombre-del-servicio>.<namespace>.svc.cluster.local`

Esta estructura jerárquica permite una comunicación muy fluida, gobernada por los dominios de búsqueda (`search`) configurados en el archivo `resolv.conf` visto anteriormente:

1. **Comunicación en el mismo Namespace:** Si un Pod de *frontend* quiere hablar con un *backend* que está en su **mismo** namespace, el desarrollador solo necesita usar el nombre corto: `http://backend`. CoreDNS usará el dominio de búsqueda y lo autocompletará a `backend.default.svc.cluster.local`.
2. **Comunicación cruzando Namespaces:** Si el *frontend* está en el namespace `web` y el *backend* en el namespace `database`, el nombre corto fallará. El desarrollador debe especificar el namespace para encontrarlo: `http://backend.database`.

```text
+-------------------------------------------------------------+
|                        CLÚSTER                              |
|                                                             |
|  +-------------------+               +-------------------+  |
|  | Namespace: web    |               | Namespace: db     |  |
|  |                   |               |                   |  |
|  |  [Pod Frontend]   |               |  [Pod Backend]    |  |
|  |                   |               |                   |  |
|  +--------|----------+               +--------^----------+  |
|           | 1. GET http://backend.db          | 4. Tráfico  |
|           |                                   |             |
|           v 2. ¿Qué IP es 'backend.db'?       |             |
|  +-------------------------------------------------------+  |
|  |                       CoreDNS                         |  |
|  |  (Respuesta: "backend.db" tiene la IP 10.100.5.22)    |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+

```

### El "Corefile": Configuración bajo el capó

CoreDNS es altamente modular y se configura mediante un archivo llamado `Corefile`, el cual se almacena en Kubernetes como un `ConfigMap`. Esto te permite personalizar cómo se resuelven los nombres.

Un `Corefile` estándar se ve así:

```text
.:53 {
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}

```

El plugin `kubernetes` es el que conecta CoreDNS con el API Server. El bloque `forward . /etc/resolv.conf` es crucial: le dice a CoreDNS que cualquier nombre que **no** pertenezca al dominio `cluster.local` (por ejemplo, `google.com` o una API externa) debe ser reenviado a los servidores DNS configurados en el nodo anfitrión para que salgan a Internet.

### Nivel Senior: El problema de `ndots:5` y el rendimiento

Uno de los problemas de rendimiento de red más comunes (y una pregunta clásica en entrevistas para arquitectos de Kubernetes) es la sobrecarga causada por la configuración `ndots:5` en entornos con alto tráfico.

La directiva `ndots:5` indica que si un dominio consultado tiene **menos de 5 puntos**, el sistema operativo debe intentar resolverlo añadiendo secuencialmente los dominios de búsqueda locales antes de intentar tratarlo como un dominio absoluto.

Si tu aplicación hace una petición a `api.stripe.com` (2 puntos), el Pod intentará resolver:

1. `api.stripe.com.default.svc.cluster.local` (Falla)
2. `api.stripe.com.svc.cluster.local` (Falla)
3. `api.stripe.com.cluster.local` (Falla)
4. Finalmente: `api.stripe.com` (Éxito mediante forward)

Esto significa que una sola petición externa genera **4 consultas DNS** contra CoreDNS, lo que aumenta la latencia de tu aplicación y sobrecarga el servicio interno.

**¿Cómo se soluciona?**
Para aplicaciones que hacen llamadas externas masivas, se recomienda modificar la política de DNS del Pod (usando el campo `dnsConfig` en el manifiesto del Deployment) para reducir el valor de `ndots` a `2` o `1`, o bien, instruir a los desarrolladores para que agreguen un punto final a las URLs externas en su código (`api.stripe.com.`), lo que le indica al sistema que es un FQDN absoluto y evita la iteración por los dominios de búsqueda.

## 4.3 Services: ClusterIP, NodePort, LoadBalancer y ExternalName

En la sección anterior vimos cómo CoreDNS resuelve nombres de dominio dentro del clúster, pero dejamos una pregunta fundamental en el aire: ¿Hacia qué dirección IP apuntan exactamente esos registros DNS? Como ya establecemos, apuntar directamente a la IP efímera de un Pod es una mala práctica.

Aquí es donde entra la primitiva más importante de Kubernetes para la conectividad: el **Service** (Servicio).

Un Service es una abstracción lógica que agrupa un conjunto de Pods (usualmente determinados por *Labels* o etiquetas) y define una política estable para acceder a ellos. Mientras que los Pods nacen y mueren, el Service tiene un ciclo de vida independiente, manteniendo una dirección IP estática y un nombre DNS constante durante toda su existencia.

Existen cuatro tipos principales de Services en Kubernetes, cada uno diseñado para resolver un patrón de conectividad específico, y se construyen uno sobre el otro de forma concéntrica.

### 1. ClusterIP (El estándar interno)

Es el tipo de Service por defecto. Cuando creas un Service sin especificar su tipo, Kubernetes le asigna una **ClusterIP**.

Esta es una dirección IP virtual que solo es accesible **desde dentro del clúster**. Es el mecanismo ideal para la comunicación entre microservicios internos (por ejemplo, tu aplicación *backend* comunicándose con tu base de datos o una caché de Redis).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - port: 80        # El puerto que expone el Service
      targetPort: 8080 # El puerto real donde escucha el contenedor en el Pod

```

**Flujo de tráfico:**
Un Pod hace una petición a `backend-service` (Puerto 80) -> CoreDNS resuelve a la IP del Service (ej. `10.96.10.10`) -> El tráfico es balanceado aleatoriamente hacia uno de los Pods que tengan la etiqueta `app: backend` en el puerto 8080.

### 2. NodePort (Abriendo puertas al exterior)

Si necesitas acceder a tu aplicación desde fuera del clúster (por ejemplo, para pruebas o porque no estás en un entorno de nube pública), utilizas un **NodePort**.

Al crear un Service de este tipo, Kubernetes primero asigna una ClusterIP interna y, adicionalmente, abre un puerto estático en **todos y cada uno de los Nodos** del clúster (por defecto en el rango `30000-32767`). Cualquier tráfico externo que llegue a la IP de un Nodo en ese puerto específico será enrutado hacia el Service y, en última instancia, hacia los Pods.

```text
+-------------------------------------------------------------+
|                     Usuario / Internet                      |
|                              |                              |
|          +-------------------+-------------------+          |
|          | Petición a: IP_NODO_1:30050           |          |
|          v                                       v          |
| +------------------+                   +------------------+ |
| |      NODO 1      |                   |      NODO 2      | |
| | (IP: 192.168...1)|                   | (IP: 192.168...2)| |
| | Puerto: 30050    |                   | Puerto: 30050    | |
| +--------|---------+                   +--------|---------+ |
|          |                                      |           |
|          +--------------+        +--------------+           |
|                         v        v                          |
|                     [ Service: NodePort ]                   |
|                     [   (ClusterIP)     ]                   |
|                               |                             |
|                               v                             |
|                        [ Pod Destino ]                      |
+-------------------------------------------------------------+

```

*Nota para operaciones:* Aunque es útil, el NodePort no es ideal para producción expuesta al público directamente, ya que requiere que gestiones la seguridad de los nodos y balancees la carga entre ellos externamente.

### 3. LoadBalancer (El estándar de producción en la nube)

El tipo **LoadBalancer** es la forma nativa de exponer un servicio a Internet cuando operas en un proveedor de nube (AWS, GCP, Azure).

Se construye sobre las capas anteriores: Kubernetes crea un NodePort, que a su vez crea un ClusterIP. La diferencia clave es que Kubernetes invoca al controlador de la nube subyacente (Cloud Controller Manager) para aprovisionar un Balanceador de Carga externo y real (como un ALB/NLB en AWS). Este balanceador externo dirigirá el tráfico a los NodePorts de tus Nodos de forma automática.

**Ventajas y Desventajas:**

* **Pro:** Es la forma más robusta y sin fricciones de recibir tráfico de Internet.
* **Contra (Arquitecto):** Cada Service de tipo LoadBalancer aprovisiona una infraestructura física o virtual distinta en la nube, lo cual genera un costo adicional por cada servicio expuesto. Por ello, rara vez se usa un LoadBalancer por cada microservicio; en su lugar, se usa para exponer un `Ingress Controller` (que veremos en la sección 4.4).

### 4. ExternalName (El alias DNS)

Este tipo de Service es fundamentalmente distinto a los tres anteriores. No usa selectores de Pods, ni asigna una IP virtual, ni hace balanceo de carga interno.

Su único propósito es mapear el nombre del Service a un nombre DNS externo mediante un registro CNAME a nivel de CoreDNS.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: base-de-datos-legacy
  namespace: prod
spec:
  type: ExternalName
  externalName: my-rds-db.cx89djs.eu-west-1.rds.amazonaws.com

```

**Caso de uso Senior:** Imagina que estás migrando a Kubernetes, pero tu base de datos sigue en un servicio gestionado externo (como Amazon RDS). Si configuras tu aplicación para apuntar a `base-de-datos-legacy`, y el día de mañana decides mover esa base de datos dentro del clúster, solo tienes que cambiar este Service a tipo ClusterIP. No tendrás que tocar el código de la aplicación ni sus variables de entorno.

### Nivel Senior: ¿Cómo funciona el enrutamiento bajo el capó? (`kube-proxy`)

Es un error común pensar que el Service es un proceso que "escucha" en un puerto y actúa como un proxy inverso tradicional (como NGINX). Las ClusterIPs de los Services son "IPs falsas"; no pertenecen a ninguna interfaz de red real (no las verás al ejecutar `ifconfig` o `ip a` en un nodo).

La magia del balanceo de carga de los Services la realiza un componente llamado **`kube-proxy`**, que se ejecuta como un DaemonSet en cada nodo del clúster.

`kube-proxy` observa constantemente el API Server en busca de Services y Endpoints (las IPs de los Pods). Su trabajo es traducir esa información en reglas de red en el sistema operativo anfitrión. Tiene dos modos de operación principales:

1. **Modo `iptables` (El estándar habitual):** `kube-proxy` crea largas cadenas de reglas `iptables` en el kernel de Linux. Cuando un paquete intenta ir a una ClusterIP, las reglas de `iptables` interceptan el paquete en el kernel, reescriben la dirección IP de destino (DNAT) por la IP de uno de los Pods válidos, y el paquete continúa su camino. Es confiable, pero si tienes miles de Services, evaluar secuencialmente las reglas `iptables` genera un cuello de botella en la CPU.
2. **Modo `IPVS` (IP Virtual Server):** Diseñado para clústeres masivos. IPVS es un módulo del kernel de Linux específicamente diseñado para el balanceo de carga en la capa 4 de red. En lugar de cadenas secuenciales de reglas, utiliza tablas hash, lo que permite un balanceo de carga `O(1)` (tiempo constante), escalando sin problemas incluso con decenas de miles de Services.

## 4.4 Ingress y Ingress Controllers (NGINX, Traefik, HAProxy)

En la sección anterior vimos que exponer aplicaciones al exterior utilizando Services de tipo `LoadBalancer` es efectivo, pero tiene un costo oculto: por cada Service que expones, tu proveedor de nube aprovisiona un balanceador de carga físico o virtual dedicado. Si tienes 50 microservicios orientados al cliente, terminarás pagando por 50 balanceadores de carga en la nube. Además, los Services operan en la **Capa 4** del modelo OSI (TCP/UDP), lo que significa que no entienden de dominios web, rutas URL ni certificados SSL/HTTPS.

Para solucionar el problema del enrutamiento inteligente (Capa 7) y consolidar el tráfico en un único punto de entrada, Kubernetes introdujo el concepto de **Ingress**.

Para entender cómo funciona, es vital separar el concepto en dos partes fundamentales: el recurso *Ingress* (las reglas) y el *Ingress Controller* (el motor).

### 1. El Recurso Ingress (El mapa de rutas)

Un recurso `Ingress` es simplemente un manifiesto de Kubernetes (un objeto de la API) que define un conjunto de reglas de enrutamiento HTTP y HTTPS. Actúa como un mapa que dice: *"Si una petición llega pidiendo el dominio X y la ruta Y, envíala al Service Z"*.

Un manifiesto clásico de Ingress se ve así:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: mi-empresa.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: backend-v1-service
            port: 
              number: 80
      - path: /pagos
        pathType: Exact
        backend:
          service:
            name: payments-service
            port: 
              number: 8080

```

Si aplicas este manifiesto en un clúster "limpio", **no pasará absolutamente nada**. El recurso Ingress por sí solo es letra muerta; necesita a alguien que lea esas reglas y las ejecute. Ese "alguien" es el Ingress Controller.

### 2. El Ingress Controller (El motor de ejecución)

Un Ingress Controller es una aplicación (típicamente un proxy inverso como NGINX o HAProxy) que se ejecuta dentro de tu clúster, usualmente como un `Deployment` o `DaemonSet`.

Su trabajo es doble:

1. Observar constantemente el API Server de Kubernetes en busca de nuevos objetos `Ingress` (o modificaciones en los existentes).
2. Traducir dinámicamente esas reglas YAML a su propio archivo de configuración nativo (por ejemplo, `nginx.conf`) y recargar su proceso para aplicar los cambios sin perder conexiones.

**Arquitectura de Consolidación:**
En un entorno de producción, solo expones el **Ingress Controller** al exterior mediante un único Service de tipo `LoadBalancer`. Todo el tráfico de Internet entra por ese único embudo, y el Controller se encarga de repartirlo internamente basándose en los dominios y las rutas (Capa 7).

```text
+-------------------------------------------------------------+
|                        INTERNET                             |
|                           |                                 |
|          [ Balanceador de Carga de la Nube (Un solo IP) ]   |
|                           |                                 |
+---------------------------|---------------------------------+
                            v
            +-------------------------------+
            |      INGRESS CONTROLLER       |  <-- (Lee las reglas
            |   (ej. ingress-nginx-pod)     |       del objeto Ingress)
            +---------------+---------------+
                            |
         +------------------+------------------+
         | (Si la ruta es)  | (Si la ruta es)  |
         v                  v                  v
    mi-empresa.com/        /api/v1           /pagos
         |                  |                  |
   [ Service: ]       [ Service: ]       [ Service: ]
   [ frontend ]       [ backend  ]       [ payments ]
         |                  |                  |
     [ Pods ]           [ Pods ]           [ Pods ]

```

### Terminación TLS (Manejo de HTTPS)

Una de las responsabilidades más críticas del Ingress Controller es la "Terminación TLS". En lugar de configurar certificados SSL en cada uno de tus 50 microservicios, configuras el certificado en el Ingress.

El tráfico viaja encriptado desde el cliente (navegador) hasta el Ingress Controller. El Ingress desencripta la petición (termina el TLS) y envía el tráfico en texto plano (HTTP) hacia los microservicios dentro de la red segura del clúster. Para automatizar la emisión y renovación de estos certificados (por ejemplo, con Let's Encrypt), el estándar de la industria es integrar el Ingress con una herramienta llamada **`cert-manager`**.

### Ecosistema de Ingress Controllers: ¿Cuál elegir?

A diferencia del `kube-controller-manager`, el Ingress Controller no viene instalado por defecto en Kubernetes. Debes elegir e instalar uno.

* **NGINX Ingress Controller:** Es el "caballo de batalla" de Kubernetes. Es el más popular, cuenta con la comunidad más grande y está soportado oficialmente por el proyecto Kubernetes. Se configura fuertemente mediante *Annotations* (anotaciones) en el YAML para activar funciones como rate-limiting, CORS o reescritura de URLs. Ideal para la mayoría de los casos de uso convencionales.
* **Traefik:** Diseñado desde cero para ser dinámico y nativo de la nube. Mientras que NGINX a veces necesita recargar sus procesos internamente para aplicar nuevas rutas, Traefik detecta los cambios y enruta el tráfico al instante sin recargas. Es muy popular en distribuciones ligeras como K3s y utiliza sus propios *Custom Resource Definitions* (CRDs) como `IngressRoute` para configuraciones más legibles y avanzadas que las anotaciones.
* **HAProxy Ingress:** Reconocido mundialmente por su eficiencia de CPU y su latencia extremadamente baja. Si tu clúster maneja un volumen masivo de transacciones por segundo y necesitas exprimir cada milisegundo (por ejemplo, en plataformas de trading en tiempo real o streaming de alta concurrencia), HAProxy suele superar a NGINX en rendimiento puro.

### Nivel Senior: El Bypass de `kube-proxy`

Un detalle arquitectónico que separa a un operador básico de un experto es entender cómo viaja el paquete *después* de pasar por el Ingress Controller.

En la teoría básica, el Ingress Controller lee la regla y envía la petición a la ClusterIP del `Service` de destino. Si recuerdas la sección 4.3, esto significaría que el paquete tendría que pasar por el balanceo de carga de `kube-proxy` (iptables/IPVS) para finalmente llegar al Pod.

**Esto es ineficiente.** Añade un salto de red innecesario.

En la realidad, los Ingress Controllers modernos (como NGINX o Traefik) operan de forma más inteligente. No envían el tráfico a la IP del Service. En su lugar, el Controller se suscribe a los **Endpoints** del Service a través del API Server. Esto significa que el Ingress Controller mantiene en su propia memoria una lista actualizada de las IPs directas de todos los Pods que respaldan a ese Service.

Cuando llega una petición web, el Ingress Controller hace su propio balanceo de carga (usualmente Round Robin o Least Connections) y envía el paquete de red **directamente a la IP del Pod de destino**, ignorando por completo el Service y el cuello de botella potencial de `kube-proxy`. Esto reduce la latencia de cola y mejora sustancialmente el rendimiento de las aplicaciones expuestas.

## 4.5 Gateway API: El nuevo estándar de enrutamiento avanzado

En la sección anterior exploramos cómo **Ingress** resolvió el problema de exponer múltiples servicios a través de un único punto de entrada utilizando enrutamiento HTTP de Capa 7. Si Ingress es tan útil, ¿por qué la comunidad de Kubernetes ha invertido años en crear un estándar completamente nuevo?

La respuesta corta es: **El "Infierno" de las Anotaciones (Annotation Hell).**

El recurso `Ingress` original fue diseñado de manera muy simple. Solo entiende nativamente tres cosas: un nombre de host (dominio), una ruta (path) y un Service de destino. Sin embargo, las aplicaciones modernas requieren mucho más: despliegues *Canary* (dividir el tráfico 90/10), enrutamiento basado en cabeceras HTTP (Headers), redirecciones, o soporte nativo para gRPC y WebSockets.

Como el objeto `Ingress` no soporta estas funciones de forma nativa, los desarrolladores de Ingress Controllers (NGINX, Traefik, etc.) comenzaron a inyectar esta lógica utilizando `annotations` en el YAML. Esto provocó que un manifiesto de Ingress para NGINX fuera completamente incompatible con uno para HAProxy. La promesa de "portabilidad" de Kubernetes se rompió.

Para solucionar esto de raíz, el grupo de redes de Kubernetes (SIG-NETWORK) creó la **Gateway API**.

### El cambio de paradigma: Orientación a Roles

El mayor problema arquitectónico de Ingress es que junta la infraestructura y las reglas de la aplicación en un solo archivo YAML. El operador del clúster (que gestiona los certificados y los puertos) y el desarrollador (que gestiona las rutas de su microservicio) terminan peleando por modificar el mismo manifiesto.

La Gateway API resuelve esto dividiendo el enrutamiento en un conjunto de **Custom Resource Definitions (CRDs)**, diseñados para separar las responsabilidades según el rol del usuario:

1. **GatewayClass (El Proveedor de Infraestructura):** Define *qué* tecnología subyacente se utilizará (por ejemplo, el balanceador de AWS, Cilium, o Istio). Es de alcance global (Cluster-scoped).
2. **Gateway (El Operador / Admin del Clúster):** Representa una instancia física o lógica del balanceador de carga. El administrador define aquí qué puertos escuchar (ej. 80 y 443) y qué certificados TLS utilizar.
3. **HTTPRoute (El Desarrollador de la Aplicación):** Son las reglas de enrutamiento. El desarrollador crea este objeto en su propio Namespace y lo "engancha" al Gateway público. Define qué rutas, cabeceras o pesos dirigen el tráfico a sus Services.

### Anatomía de la Gateway API

Visualicemos cómo interactúan estos componentes sin chocar entre sí:

```text
+-----------------------------------------------------------------------+
|                       ROLES Y RECURSOS EN GATEWAY API                 |
|                                                                       |
|  [ Proveedor de Nube / Infra ]                                        |
|         Administra ->   GatewayClass (Ej. "aws-application-load-balancer")
|                              |                                        |
|------------------------------|----------------------------------------|
|  [ Operador de Plataforma ]  |                                        |
|         Administra ->     Gateway (Ej. "gateway-publico-empresa")     |
|                              |      (Escucha en Puerto 443 + TLS)     |
|                              |                                        |
|------------------------------|----------------------------------------|
|                              |                                        |
|  [ Desarrollador Team A ]    |          [ Desarrollador Team B ]      |
|  Namespace: "ventas"         |          Namespace: "pagos"            |
|                              |                                        |
|    HTTPRoute ("ruta-ventas") |            HTTPRoute ("ruta-pagos")    |
|    (Match: /ventas) ---------+            (Match: Header `env: beta`) |
|          |                                            |               |
|          v                                            v               |
|    Service (ventas-v1)                      Service (pagos-v2)        |
+-----------------------------------------------------------------------+

```

### Enrutamiento Avanzado Nativo (Nivel Intermedio/Senior)

La magia de la Gateway API es que capacidades complejas que antes requerían anotaciones propietarias ahora son ciudadanas de primera clase en el YAML.

Imagina que quieres hacer un despliegue *Canary*, enviando el 90% del tráfico a la versión 1 de tu aplicación y el 10% a la versión 2 para probarla. Con la Gateway API, un desarrollador solo necesita desplegar este `HTTPRoute`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-route
  namespace: produccion
spec:
  parentRefs:
  - name: gateway-publico-empresa # Se engancha al Gateway del Operador
    namespace: infraestructura
  hostnames:
  - "api.mi-empresa.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1/data
    backendRefs:
    - name: backend-v1-service # 90% del tráfico va aquí
      port: 8080
      weight: 90
    - name: backend-v2-service # 10% del tráfico va aquí
      port: 8080
      weight: 10

```

Observa la claridad del bloque `backendRefs` y `weight`. Este YAML funcionará exactamente igual independientemente de si debajo tienes NGINX, Cilium, Istio o un ALB de AWS.

### Nivel Senior: Más allá de HTTP y el Service Mesh (GAMMA)

Como arquitecto, debes saber que la Gateway API no se limita al tráfico web (HTTP/HTTPS) como lo hacía Ingress. La API incluye recursos como **`TCPRoute`**, **`UDPRoute`** y **`TLSRoute`**, lo que te permite balancear tráfico de bases de datos, servidores de juegos o colas de mensajería (Kafka, RabbitMQ) de forma nativa.

Además, el alcance de la Gateway API se ha expandido a través de la iniciativa **GAMMA** (Gateway API for Mesh Management and Administration). Esto significa que la Gateway API no solo es el nuevo estándar para el tráfico *Norte-Sur* (tráfico de Internet hacia el clúster), sino que también se está convirtiendo en el estándar para configurar el tráfico *Este-Oeste* (comunicación Pod-a-Pod dentro de un Service Mesh como Istio o Linkerd), unificando por fin la forma en que pensamos sobre las redes en Kubernetes.

Con una red conectada, expuesta de forma segura y enrutada inteligentemente, el siguiente paso crítico para un entorno de producción es aprender a restringir quién puede hablar con quién, lo que nos lleva directamente al mundo de las **Network Policies**.

## 4.6 Network Policies: Aislamiento y seguridad de red (Capa 4 y Capa 7)

Si recuerdas la sección 4.1, la primera "regla de oro" de la red en Kubernetes establece que cualquier Pod puede comunicarse con cualquier otro Pod de forma predeterminada. Esta red plana y sin fricciones es excelente para el desarrollo inicial, pero es una pesadilla absoluta para la seguridad en un entorno de producción.

Imagina que tienes una aplicación con un *frontend* orientado a Internet, un *backend* de lógica de negocio y una *base de datos* con información de tarjetas de crédito, todos en el mismo clúster. Si un atacante logra comprometer un Pod del *frontend* a través de una vulnerabilidad web, la red plana por defecto le permite hacer ping, escanear y conectarse directamente a la IP de la *base de datos*, saltándose por completo el *backend*.

Para implementar una arquitectura de **Zero Trust** (Confianza Cero) dentro del clúster, Kubernetes nos ofrece las **Network Policies** (Políticas de Red).

### ¿Qué es una Network Policy?

Una Network Policy es el equivalente a un firewall virtual a nivel de Pod. Es un objeto de la API de Kubernetes que especifica cómo se permite que un grupo de Pods se comunique con otros Pods y con otros puntos de red (endpoints).

Las Network Policies se basan en **etiquetas (Labels)** y **selectores (Selectors)**, no en direcciones IP. Esto es crucial porque, como sabemos, las IPs de los Pods cambian constantemente.

**La Regla del Aislamiento (El concepto más importante):**

* **Pods no aislados:** Por defecto, un Pod no está aislado. Acepta tráfico de cualquier origen y puede enviar tráfico a cualquier destino.
* **Pods aislados:** En el momento en que *al menos una* Network Policy selecciona a un Pod, ese Pod pasa a estar **aislado**. A partir de ese instante, todo el tráfico hacia (Ingress) o desde (Egress) ese Pod que no esté explícitamente permitido por una regla, será **bloqueado**.

```text
+-------------------------------------------------------------+
|                        CLÚSTER KUBERNETES                   |
|                                                             |
|  [ Atacante / Pod Comprometido ]                            |
|                 |                                           |
|                 | (Intento de conexión al puerto 5432)      |
|                 X [ BLOQUEADO por Network Policy ]          |
|                 |                                           |
|                 v                                           |
|  [ Pod Backend ] ---------------> [ Pod Base de Datos ]     |
|  (app: backend)    (PERMITIDO)    (app: database)           |
|                                                             |
+-------------------------------------------------------------+

```

### La Dependencia Crítica: El CNI

Aquí hay una "trampa" clásica en la que caen muchos administradores Junior: Kubernetes define la API para las Network Policies, pero **no las ejecuta**.

El responsable de interceptar el tráfico y aplicar estas reglas (ya sea configurando `iptables` o usando eBPF) es el **plugin CNI** que instalaste (revisar sección 4.1). Si tu clúster utiliza *Flannel*, puedes crear cientos de manifiestos de Network Policies; el API Server los guardará felizmente, pero **el tráfico no se bloqueará** porque Flannel no soporta esta funcionalidad. Para usar Network Policies, necesitas un CNI robusto como **Calico**, **Cilium** o **Weave Net**.

### Sintaxis y Prácticas Base (Nivel Intermedio)

Las políticas se dividen en dos direcciones de tráfico:

* **Ingress:** Tráfico entrante al Pod.
* **Egress:** Tráfico saliente desde el Pod.

La práctica recomendada por excelencia en Kubernetes (y el primer paso de seguridad en cualquier clúster de producción) es implementar una política de **"Default Deny-All"** (Denegar todo por defecto) en cada Namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: produccion
spec:
  podSelector: {} # Un selector vacío selecciona TODOS los Pods en este namespace
  policyTypes:
  - Ingress
  - Egress

```

Una vez aplicado esto, todos los Pods en el namespace `produccion` quedan incomunicados. Ahora, debes abrir "agujeros" quirúrgicos en ese firewall virtual para permitir solo el tráfico legítimo. Por ejemplo, permitir que el *frontend* hable con el *backend* en el puerto 8080:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: permitir-frontend-a-backend
  namespace: produccion
spec:
  podSelector:
    matchLabels:
      app: backend # Esta política se aplica a los Pods del backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend # Solo se permite tráfico originado en los Pods del frontend
    ports:
    - protocol: TCP
      port: 8080

```

### Nivel Senior: Limitaciones de Capa 4 y el salto a Capa 7

Las Network Policies nativas de Kubernetes operan estrictamente en la **Capa 3 y Capa 4** del modelo OSI. Esto significa que solo pueden filtrar tráfico basándose en:

* Direcciones IP (bloques CIDR).
* Protocolos (TCP, UDP, SCTP).
* Puertos.

**El problema arquitectónico:**
¿Qué sucede si necesitas bloquear tráfico saliente hacia una API externa específica, pero esa API usa IPs dinámicas (ej. `api.github.com`)? Una Network Policy estándar no entiende de dominios DNS, por lo que no puedes escribir una regla `Egress` que apunte a un dominio.

¿Y qué pasa si el *frontend* puede hacer una petición `GET /usuarios` al *backend*, pero por seguridad quieres prohibirle estrictamente hacer un `DELETE /usuarios`? Ambos van por el puerto 8080, así que una política de Capa 4 lo permitirá todo o lo bloqueará todo; es "ciega" a los métodos HTTP o rutas URL.

**La solución moderna (Capa 7):**
Para lograr seguridad a nivel de aplicación (Capa 7), los Arquitectos de Kubernetes delegan esta responsabilidad en herramientas más avanzadas:

1. **CNIs de nueva generación (Cilium):** Cilium no solo implementa las Network Policies estándar, sino que introduce sus propios *Custom Resources* (`CiliumNetworkPolicy`). Al estar basado en eBPF y tener conocimiento nativo de protocolos como HTTP, gRPC y Kafka, puedes escribir políticas que digan: *"Permitir que el frontend hable con el backend en el puerto 8080, **PERO SOLO** si el método es GET y la ruta empieza por /api/v1"*, o *"Permitir salida solo al dominio externo *<https://www.google.com/search?q=.stripe.com>"*.
2. **Service Meshes (Istio, Linkerd):** Otra forma común de aplicar políticas de Capa 7 es a través de una malla de servicios, donde sidecars proxy (como Envoy) interceptan cada petición HTTP y evalúan reglas de autorización avanzadas (AuthorizationPolicies) basadas en la identidad criptográfica del Pod (mTLS), cabeceras HTTP y rutas.

Al dominar el aislamiento de red, cierras uno de los vectores de ataque más críticos en Kubernetes. Con esto concluye nuestro recorrido por la arquitectura de red y el enrutamiento. A continuación, en el **Capítulo 5**, abordaremos el almacenamiento persistente, enfrentando el reto de no perder nuestros datos cuando estos Pods efímeros inevitablemente mueran.
