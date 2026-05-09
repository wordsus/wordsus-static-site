Dominar la red es lo que separa a un administrador de sistemas de un verdadero ingeniero DevOps. En entornos de nube y microservicios, la infraestructura es dinámica y los fallos de comunicación son la causa más común de caídas de servicio. Este capítulo te dotará de las herramientas críticas para diagnosticar el flujo de datos: desde la configuración de interfaces y tablas de enrutamiento con la suite `iproute2`, hasta la inspección profunda de latencia con `mtr`, la depuración de jerarquías DNS con `dig` y el análisis de sockets con `ss`. Aprenderás a ver más allá de la superficie, identificando si un problema reside en el enlace físico, el firewall o la lógica de la aplicación.

## 10.1 Interfaces de red y enrutamiento (`ip a`, `ip route`)

Durante décadas, el comando `ifconfig` (del paquete `net-tools`) fue el estándar indiscutible para gestionar la red en Linux. Sin embargo, en el ecosistema DevOps actual, `ifconfig` se considera obsoleto y carece de soporte para características modernas de red. Su sucesor, la suite `**iproute2`**, utiliza el poderoso comando `ip`.

Como profesional DevOps, interactuarás con `ip` constantemente: al depurar la conectividad de un pod en Kubernetes, al configurar redes virtuales en AWS (VPCs) o al entender por qué un contenedor de Docker no tiene acceso a Internet.

### 1. Inspección de Interfaces: `ip a`

El comando `ip a` (abreviatura de `ip address show`) te muestra la configuración IP de todas las interfaces de red presentes en el sistema.

Ejecutemos el comando en un servidor típico:

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.15/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86100sec preferred_lft 86100sec
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:c7:af:b2:10 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever

```

**Anatomía de la salida (lo que realmente importa):**

* **Los nombres de las interfaces:**
* `lo`: La interfaz de bucle local (*loopback*). Fundamental para que los servicios internos del servidor se comuniquen entre sí (siempre usa `127.0.0.1`).
* `eth0` (o `ens33`, `enp3s0`): La interfaz Ethernet principal conectada a la red.
* `docker0`: Un puente virtual (*bridge*) creado por Docker.


* **El estado del enlace (`<...,UP,LOWER_UP>`):**
* `UP`: La interfaz ha sido activada a nivel de software (Capa 3).
* `LOWER_UP`: El cable físico (o su equivalente virtual) está conectado (Capa 1/2). Si ves `UP` pero no `LOWER_UP`, tienes un problema físico o el hipervisor desconectó la red virtual.


* **Direcciones MAC e IP:**
* `link/ether`: Tu dirección MAC (Capa 2).
* `inet`: Tu dirección IPv4 acompañada de su máscara de red en notación CIDR (ej. `/24`, que equivale a `255.255.255.0`).
* `inet6`: Tu dirección IPv6 (si estuviera habilitada).



#### Gestión rápida de interfaces y direcciones

A veces, en medio de un *troubleshooting*, necesitas apagar una interfaz o asignarle una IP temporal.

```bash
# Apagar una interfaz (como sacar el cable)
$ sudo ip link set dev eth0 down

# Encenderla de nuevo
$ sudo ip link set dev eth0 up

# Añadir una IP secundaria a una interfaz temporalmente
$ sudo ip a add 10.0.0.50/24 dev eth0

```

> **Trampa de Junior:** Los cambios realizados directamente con el comando `ip` residen **solo en memoria**. Si reinicias el servidor, desaparecerán. Para hacerlos persistentes, debes modificar los archivos de configuración de tu gestor de red (como `/etc/netplan/*.yaml` en Ubuntu o `/etc/sysconfig/network-scripts/` en RHEL).

---

### 2. Entendiendo el Mapa: `ip route`

Tener una dirección IP no sirve de nada si el servidor no sabe cómo llegar a su destino. La tabla de enrutamiento es el mapa que el kernel de Linux consulta cada vez que necesita enviar un paquete de datos.

Veamos una tabla de enrutamiento clásica usando `ip route`:

```bash
$ ip route
default via 192.168.1.1 dev eth0 proto dhcp metric 100 
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.15 metric 100 

```

**Cómo lee Linux este mapa (Regla del "Match más específico"):**

```text
[Paquete Saliente: Destino 8.8.8.8]
       |
       v
+------------------------------------------+
| Evaluación en la Tabla de Enrutamiento   |
+------------------------------------------+
       |
       |-- ¿Es 8.8.8.8 parte de 172.17.0.0/16 (Docker)? -> NO.
       |
       |-- ¿Es 8.8.8.8 parte de 192.168.1.0/24 (LAN)?   -> NO.
       |
       +-- Al no haber coincidencia, usar la ruta 'default' (0.0.0.0/0)
       |
       v
[Gateway: Enviar paquete a 192.168.1.1 a través de eth0] -> Salida a Internet

```

* **`default via 192.168.1.1`**: Esta es tu **Puerta de Enlace (Gateway)**. Es la ruta de último recurso. Todo tráfico hacia Internet va por aquí.
* **`192.168.1.0/24 dev eth0...`**: Esta es una **ruta local**. Indica que cualquier máquina en la misma subred puede ser alcanzada directamente enviando el paquete por `eth0`, sin pasar por el router.

#### El Truco Senior: `ip route get`

Cuando gestionas servidores con múltiples interfaces, túneles VPN o redes superpuestas en Kubernetes (como Calico o Flannel), leer la tabla completa puede ser abrumador.

Si quieres saber exactamente por dónde saldrá un paquete hacia una IP específica y qué IP de origen usará tu servidor, no adivines. Pregúntale al kernel:

```bash
$ ip route get 8.8.8.8
8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.15 uid 1000 
    cache 

```

Este comando es oro puro para depurar *asymmetric routing* (cuando un paquete entra por una interfaz pero el servidor intenta responder por otra).

#### Manipulación de Rutas

Si configuras un túnel VPN temporal para alcanzar una red privada (por ejemplo, `10.50.0.0/16`), necesitarás indicarle a Linux que el tráfico para esa red no debe ir hacia Internet, sino hacia la interfaz de la VPN (`tun0`).

```bash
# Añadir una ruta estática
$ sudo ip route add 10.50.0.0/16 via 10.8.0.1 dev tun0

# Eliminar una ruta que está causando problemas
$ sudo ip route del 10.50.0.0/16

```

### Resumen de Supervivencia

* `ip a`: "Quién soy y qué interfaces tengo".
* `ip link`: "Cuál es el estado físico de mis tarjetas de red".
* `ip route`: "Hacia dónde envío los paquetes que no son para mí".
* `ip route get <IP>`: "Muéstrame exactamente el camino que tomará este paquete".

## 10.2 Diagnóstico de conectividad y latencia (`ping`, `traceroute`, `mtr`)

En la sección anterior aprendimos a leer el mapa de la red (`ip route`). Sin embargo, tener el mapa no garantiza que la carretera esté abierta. Cuando un servicio falla, la pregunta inmediata de un DevOps es: *"¿El problema es nuestra red, un firewall intermedio, el proveedor de nube o el servidor de destino?"*.

Para responder esto, utilizamos herramientas de diagnóstico activo que envían sondas a través de la red y miden las respuestas.

### 1. `ping`: El pulso de la red (ICMP)

`ping` es la herramienta más antigua y ubicua para comprobar la disponibilidad de un host. Utiliza el protocolo ICMP (Internet Control Message Protocol) enviando paquetes *Echo Request* y esperando un *Echo Reply*.

El uso básico lo conoce todo el mundo (`ping 8.8.8.8`), pero en entornos de producción necesitamos ir más allá.

**Anatomía de un `ping` exitoso:**

```bash
$ ping -c 3 1.1.1.1
PING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.
64 bytes from 1.1.1.1: icmp_seq=1 ttl=59 time=14.2 ms
64 bytes from 1.1.1.1: icmp_seq=2 ttl=59 time=13.8 ms
64 bytes from 1.1.1.1: icmp_seq=3 ttl=59 time=14.0 ms

--- 1.1.1.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 13.821/14.010/14.215/0.161 ms

```

* **`ttl` (Time to Live):** Nos da una pista de cuántos "saltos" (routers) dio el paquete antes de llegar.
* **`time` (Latencia):** El tiempo de ida y vuelta (Round Trip Time o RTT).
* **`packet loss`:** El indicador más crítico. Un 0% es ideal; cualquier valor por encima del 1-2% en una red cableada/nube indica problemas graves de congestión o fallos de hardware.

#### El Truco Senior: Auditoría de red con `ping`

Como DevOps, rara vez harás un simple `ping`. Usarás flags (argumentos) para simular diferentes condiciones:

```bash
# Ping rápido: Envía 100 paquetes muy rápido (cada 0.1s) para detectar micro-cortes
$ sudo ping -c 100 -i 0.1 8.8.8.8

# Prueba de MTU (Maximum Transmission Unit): 
# Útil para diagnosticar problemas en túneles VPN (IPsec/Wireguard) donde 
# los paquetes grandes se fragmentan o descartan silenciosamente.
# Enviamos un paquete de 1472 bytes (1500 - 28 bytes de cabecera ICMP/IP) y prohibimos la fragmentación (-M do).
$ ping -M do -s 1472 8.8.8.8

```

---

### 2. `traceroute`: Mapeando el camino

Si `ping` falla o muestra alta latencia, necesitamos saber *dónde* ocurre el problema. `traceroute` muestra cada enrutador (salto) por el que pasa el paquete hasta llegar a su destino.

**¿Cómo funciona la magia bajo el capó?**
Se basa en una trampa inteligente utilizando el valor **TTL** (Time To Live). Cada vez que un paquete pasa por un router, su TTL disminuye en 1. Si llega a 0, el router descarta el paquete y devuelve un mensaje ICMP de error ("Time Exceeded") al origen.

```text
[Tu Servidor] 
      |-- (Paquete con TTL=1) --> [Router 1] (TTL=0 -> Devuelve Error a Tu Servidor. ¡Salto 1 descubierto!)
      |-- (Paquete con TTL=2) --> [Router 1] --> [Router 2] (TTL=0 -> Devuelve Error. ¡Salto 2 descubierto!)
      |-- (Paquete con TTL=3) --> [Router 1] --> [Router 2] --> [Destino] (Responde OK. Fin.)

```

**Salida típica:**

```bash
$ traceroute google.com
traceroute to google.com (142.250.190.46), 30 hops max, 60 byte packets
 1  _gateway (192.168.1.1)  1.213 ms  1.102 ms  1.055 ms
 2  10.20.30.1 (ISP-Gateway)  12.450 ms  12.331 ms  12.210 ms
 3  * * * <-- (Un router configurado para ignorar ICMP/Traceroute)
 4  72.14.242.222 (Google-edge) 14.882 ms 15.012 ms 14.991 ms
 5  mad08s10-in-f14.1e100.net (142.250.190.46) 15.111 ms 15.222 ms 15.198 ms

```

> **Trampa de Junior:** Ver asteriscos (`* * *`) en medio de un `traceroute` no significa necesariamente que haya una caída. Muchos routers troncales de ISPs están configurados para priorizar el tráfico real y descartar (o no responder) paquetes de diagnóstico para ahorrar CPU. Si los saltos posteriores responden, la red funciona bien.

#### El Truco Senior: Traceroute por TCP (Evasión de Firewalls)

Por defecto, `traceroute` en Linux usa paquetes UDP, y en Windows (`tracert`) usa ICMP. En producción, la mayoría de los firewalls bloquean UDP e ICMP hacia el exterior. Para ver si *realmente* puedes alcanzar un puerto específico (ej. un servidor web en el puerto 443), usa TCP:

```bash
# Obliga a traceroute a usar TCP (-T) en el puerto 443 (-p 443)
$ sudo traceroute -T -p 443 api.miservicio.com

```

---

### 3. `mtr`: La navaja suiza de la latencia (My Traceroute)

Mientras que `ping` te da estadísticas estáticas y `traceroute` te da una foto instantánea del camino, `**mtr` combina ambos en una vista dinámica y en tiempo real**. Es la herramienta definitiva para diagnosticar cuellos de botella e inestabilidad en la red.

`mtr` ejecuta un `traceroute` continuo y calcula la pérdida de paquetes y la latencia para cada salto a lo largo del tiempo.

**Modo de uso en Terminal interactiva:**

```bash
$ sudo mtr 8.8.8.8

```

**Análisis de la salida (Modo Reporte para tickets de soporte):**
A menudo necesitarás enviar pruebas a un proveedor de red o adjuntarlas a un ticket de Jira. Usa el modo reporte (`-r`), que realiza un número específico de ciclos (`-c`) y genera un resumen:

```bash
$ mtr -r -c 10 1.1.1.1
HOST: server-prod-01              Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 10.0.0.1                     0.0%    10    0.3   0.3   0.2   0.5   0.1
  2.|-- vpn-gateway.aws.com          0.0%    10   12.1  12.5  11.9  14.2   0.6
  3.|-- isp-backbone.net            40.0%    10   45.2  46.1  40.1  55.3   5.2  <-- ¡Problema aquí!
  4.|-- one.one.one.one             40.0%    10   46.1  47.0  41.0  56.1   5.5

```

**Cómo leer `mtr` como un Senior:**

1. **Loss% (Pérdida):** Si ves pérdida de paquetes en un salto intermedio (ej. Salto 3), **y esa pérdida se arrastra a todos los saltos posteriores** (Salto 4), has encontrado exactamente el router defectuoso o saturado. Si solo el salto intermedio tiene pérdida, pero el destino final tiene 0%, es solo *Rate Limiting* (el router prioriza ignorarte pero deja pasar el tráfico real).
2. **StDev (Jitter / Variación de latencia):** Si el promedio (`Avg`) es de 40ms pero la desviación estándar (`StDev`) es de 30ms, tu conexión es extremadamente inestable ("a tirones"), lo cual destruye el rendimiento de bases de datos o llamadas VoIP, incluso si no hay pérdida de paquetes.

## 10.3 Resolución y depuración de DNS (`dig`, `nslookup`, `host`, `/etc/hosts`)

El Sistema de Nombres de Dominio (DNS) es el directorio telefónico de Internet. Traduce nombres legibles para humanos (como `api.empresa.com`) en direcciones IP que las máquinas necesitan para comunicarse.

Cuando un servicio se cae "misteriosamente" a pesar de que la red física funciona (los `ping` por IP responden), el culpable número uno suele ser un fallo en la resolución de nombres. Como DevOps, debes saber exactamente cómo tu servidor resuelve los nombres de dominio, paso a paso.

### 1. La primera parada: `/etc/hosts`

Antes de que un servidor Linux consulte a un servidor DNS externo, siempre revisa su archivo local de hosts. Esto está definido por el sistema de nombres del sistema operativo (usualmente configurado en `/etc/nsswitch.conf`).

**Flujo de Resolución en Linux:**

```text
[Aplicación pide "db.interna.com"]
       |
       v
1. ¿Está en /etc/hosts? 
   ├── SI -> Devuelve la IP (Fin).
   └── NO -> Continúa al paso 2.
       |
       v
2. ¿Está en la caché local? (ej. systemd-resolved)
   ├── SI -> Devuelve la IP (Fin).
   └── NO -> Continúa al paso 3.
       |
       v
3. Consulta al servidor DNS configurado (en /etc/resolv.conf)

```

**Uso de `/etc/hosts` en DevOps:**
Este archivo es tu mejor amigo para probar migraciones. Si estás moviendo un sitio web a un nuevo servidor y quieres probarlo antes de cambiar los registros DNS públicos, puedes "engañar" a tu máquina local:

```bash
# /etc/hosts
127.0.0.1   localhost
::1         localhost ip6-localhost ip6-loopback

# Override manual para pruebas de migración
192.168.100.50   api.miempresa.com

```

> **Trampa de Junior:** Olvidarse de que se dejó una entrada "quemada" en el `/etc/hosts` para una prueba hace seis meses. Te pasarás horas preguntándote por qué tu servidor se niega a ver la nueva IP pública de un servicio. Siempre que depures DNS localmente, tira un `cat /etc/hosts` primero.

---

### 2. Búsquedas rápidas: `host` y `nslookup`

Si solo necesitas una respuesta rápida sin demasiados detalles técnicos, estas dos herramientas son suficientes.

* **`host`:** Es la forma más limpia de preguntar "qué IP tiene este nombre" o hacer resolución inversa ("qué nombre tiene esta IP").
```bash
$ host google.com
google.com has address 142.250.190.46
google.com mail is handled by 10 smtp.google.com.

# Resolución inversa (PTR)
$ host 142.250.190.46
46.190.250.142.in-addr.arpa domain name pointer mad08s10-in-f14.1e100.net.

```


* **`nslookup`:** Es una herramienta heredada. Sigue siendo muy popular porque viene preinstalada en Windows, pero en el ecosistema Linux se considera obsoleta frente a `dig`. Úsala solo si no tienes otra opción en el sistema.

---

### 3. El estándar de la industria: `dig` (Domain Information Groper)

`dig` es la navaja suiza para depurar DNS. A diferencia de `ping` o los navegadores web, `dig` no utiliza la caché local del sistema operativo por defecto; interroga directamente a los servidores DNS, devolviendo la cruda realidad.

**Uso básico y lectura de la salida:**

```bash
$ dig misitio.com

```

La salida de `dig` puede ser intimidante. Aquí está lo que realmente importa:

1. **Header:** Te indica la versión de `dig` y si la consulta tuvo éxito (`status: NOERROR`). Si ves `status: NXDOMAIN`, el dominio no existe o no se ha propagado.
2. **QUESTION SECTION:** Lo que le preguntaste al servidor (por defecto, busca registros tipo `A` - direcciones IPv4).
3. **ANSWER SECTION:** ¡La respuesta! Aquí verás el nombre, el TTL (Time To Live, o cuánto tiempo los servidores pueden cachear esta respuesta), la clase (IN de Internet) y la IP.
4. **SERVER:** Al final, te muestra qué servidor DNS específico respondió tu consulta y cuánto tardó.

#### El Truco Senior: Dominando `dig`

Como ingeniero de infraestructura, rara vez harás un `dig` sin modificadores. Aquí tienes tu arsenal diario:

**1. Aislando la respuesta para scripts (`+short`)**
Si estás escribiendo un script en Bash y solo necesitas la IP, sin toda la verbosidad:

```bash
$ dig +short google.com
142.250.190.46

```

**2. Consultando servidores específicos (`@servidor`)**
Imagina que un cliente dice que no puede ver el nuevo subdominio que acabas de crear. Tú lo ves bien, pero él no. Puedes usar `dig` para preguntarle *directamente* al servidor DNS del proveedor de internet del cliente o a los servidores públicos principales, para ver si el cambio ya se propagó por el mundo.

```bash
# Preguntándole a Cloudflare (1.1.1.1)
$ dig @1.1.1.1 api.misitio.com +short

# Preguntándole a Google (8.8.8.8)
$ dig @8.8.8.8 api.misitio.com +short

```

*En Kubernetes, usarás esto constantemente (ej. `dig @10.96.0.10 miservicio.default.svc.cluster.local`) para verificar si CoreDNS está funcionando correctamente dentro del clúster.*

**3. Buscando tipos de registros específicos (`-t`)**
El DNS no es solo para IPs. Sirve para validar correos electrónicos, certificados SSL y redirecciones.

```bash
# Ver quién maneja los correos de un dominio (Registros MX)
$ dig -t MX misitio.com +short
10 aspmx.l.google.com.

# Ver validaciones de seguridad de correo (SPF) o verificaciones de dominio (Registros TXT)
$ dig -t TXT misitio.com +short
"v=spf1 include:_spf.google.com ~all"

# Ver si un dominio es un alias de otro (Registro CNAME)
$ dig -t CNAME www.misitio.com +short
misitio.com.

```

**4. Rastreando la delegación: `+trace`**
Esta es la "bomba nuclear" del diagnóstico DNS. Si un dominio se rompe por completo y nadie sabe por qué, `+trace` le pide a `dig` que simule ser un servidor DNS y haga la ruta completa: desde los servidores raíz de internet (`.`), pasando por los servidores de dominio superior (`.com`), hasta llegar a los servidores autoritativos (ej. Route53 o Cloudflare) que alojan tu dominio.

```bash
$ dig misitio.com +trace

```

*Si la traza se detiene a la mitad, sabrás exactamente qué proveedor intermedio está fallando en la cadena de delegación.*

## 10.4 Análisis de puertos abiertos y conexiones (`ss`, `netstat`, `lsof -i`)

En el mundo de los contenedores y microservicios, los conflictos de puertos son el pan de cada día. Despliegas una nueva versión de tu API en Node.js o Python, y el contenedor colapsa inmediatamente con un error fatídico: `EADDRINUSE` (Address already in use).

O peor aún: configuras una base de datos PostgreSQL, pero las aplicaciones no pueden conectarse porque, por defecto, se configuró para escuchar solo en `localhost` y no en la interfaz de red pública.

Para resolver esto, necesitas mirar dentro de la tabla de sockets del kernel. Aquí tienes las tres herramientas fundamentales para hacerlo.

### 1. El clásico (y obsoleto): `netstat`

Al igual que `ifconfig`, `netstat` pertenece al paquete heredado `net-tools`. Aunque técnicamente está obsoleto en distribuciones modernas, te lo encontrarás en casi cualquier servidor heredado que toques.

El único comando de `netstat` que necesitas memorizar tiene una regla nemotécnica sencilla: **"TULPN"** (o "tulipán" sin las vocales).

```bash
$ sudo netstat -tulpn
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:80              0.0.0.0:* LISTEN      1453/nginx: master  
tcp        0      0 127.0.0.1:5432          0.0.0.0:* LISTEN      892/postgres        
tcp6       0      0 :::22                   :::* LISTEN      645/sshd: /usr/sbin 
udp        0      0 0.0.0.0:123             0.0.0.0:* 712/chronyd         

```

**¿Qué significa `-tulpn`?**

* **`-t` (TCP):** Muestra conexiones TCP.
* **`-u` (UDP):** Muestra conexiones UDP.
* **`-l` (Listening):** Muestra solo los puertos que están "escuchando" (esperando conexiones), ocultando las conexiones de clientes salientes.
* **`-p` (Program):** Muestra el PID y el nombre del proceso dueño del puerto (**requiere `sudo`**, de lo contrario esta columna saldrá vacía).
* **`-n` (Numeric):** Muestra direcciones IP y puertos en formato numérico (ej. `80`) en lugar de intentar resolver sus nombres (ej. `http`), lo cual acelera drásticamente el comando.

> **Trampa de Junior:** Observa la línea de `postgres` arriba. Su `Local Address` es `127.0.0.1:5432`. Esto significa que la base de datos está atada (*bound*) **estrictamente a la interfaz de loopback**. Ninguna máquina externa podrá conectarse, sin importar si el firewall del servidor tiene el puerto 5432 abierto. Para que acepte conexiones externas, debería decir `0.0.0.0:5432` (todas las interfaces IPv4) o la IP específica de la LAN.

---

### 2. El estándar moderno: `ss` (Socket Statistics)

`ss` es el sucesor directo de `netstat` (parte del paquete `iproute2`). Es significativamente más rápido porque no lee archivos pesados en `/proc`, sino que consulta la información de los sockets directamente al kernel a través de una API (Netlink).

Afortunadamente, los desarrolladores mantuvieron los mismos flags, por lo que tu memoria muscular seguirá funcionando:

```bash
$ sudo ss -tulpn
Netid  State   Recv-Q  Send-Q     Local Address:Port      Peer Address:Port  Process                                       
tcp    LISTEN  0       511              0.0.0.0:80             0.0.0.0:* users:(("nginx",pid=1454,fd=6),("nginx",pid=1453,fd=6))
tcp    LISTEN  0       128            127.0.0.1:5432           0.0.0.0:* users:(("postgres",pid=892,fd=5))

```

#### El Truco Senior: Filtros avanzados con `ss`

Donde `ss` realmente brilla y destruye a `netstat` es en su motor de filtrado interno. En servidores de alta carga con miles de conexiones concurrentes, usar `netstat | grep ...` es ineficiente y lento. `ss` filtra a nivel de kernel.

**Escenario:** Quieres ver cuántas conexiones activas (no escuchando, sino tráfico real) hay hacia el puerto 443 (HTTPS):

```bash
# Filtra por estado 'established' y puerto de destino local 443
$ ss -tan state established '( sport = :443 )'

```

**Escenario:** Estás sufriendo un ataque DDoS y quieres ver qué IPs remotas están abriendo conexiones TCP de forma masiva:

```bash
# Muestra conexiones TCP establecidas y extrae solo la columna de IPs remotas
$ ss -tn state established | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -n 5
    154 203.0.113.50
     12 198.51.100.2
      4 10.0.0.15

```

---

### 3. El francotirador: `lsof -i` (List Open Files)

En Linux y UNIX, la filosofía principal es: **"Todo es un archivo"**. Esto incluye los sockets de red. Por lo tanto, el comando `lsof` (diseñado para listar qué procesos tienen archivos abiertos) es una herramienta fantástica para depurar redes.

Mientras que `ss` y `netstat` te dan una vista general ("¿Qué puertos están abiertos?"), `lsof` responde mejor a la pregunta inversa: **"¿Exactamente quién demonios está usando el puerto X?"**

```text
[Aplicación (PID 2045)] <--- Mapeo de Sockets en Kernel ---> [Puerto TCP 8080]
                                      ^
                 lsof -i te muestra esta relación directa

```

**Escenario:** Intentas levantar un contenedor en el puerto 8080 y falla. Quieres aniquilar el proceso que lo está bloqueando.

```bash
$ sudo lsof -i :8080
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    20455 node   18u  IPv4 123456      0t0  TCP *:8080 (LISTEN)

```

Ahora sabes que es un proceso de Node.js con el PID `20455`. Puedes proceder a investigar por qué está ahí o directamente matarlo (`kill -9 20455`).

#### Casos de uso clave para `lsof -i`:

* **Ver todas las conexiones de un proceso específico:**
```bash
$ lsof -i -a -p 20455

```


*(El `-a` significa "AND": muestra archivos que sean de red **Y** que pertenezcan al PID 20455).*
* **Identificar conexiones salientes extrañas (Malware/Miners):**
Si sospechas que un servidor está comprometido y haciendo "call-home" a un servidor de comando y control (C2):
```bash
# Lista todas las conexiones de red establecidas que no sean puertos comunes (80, 443, 22)
$ sudo lsof -i | grep ESTABLISHED | egrep -v ":(http|https|ssh)"

```



### Resumen de Supervivencia

* Usa `ss -tulpn` (o `netstat`) para obtener una **auditoría general** de qué servicios están escuchando en tu máquina y en qué interfaces IP están atados.
* Usa `ss` con filtros avanzados para diagnosticar **conexiones activas y rendimiento** en servidores con mucho tráfico.
* Usa `lsof -i :<puerto>` como tu herramienta de acción rápida cuando necesites **identificar y matar** al culpable de un conflicto de puertos.

## 10.5 Clientes HTTP de línea de comandos (`curl`, `wget`)

Un navegador web tradicional (como Chrome o Firefox) hace demasiado trabajo por ti: renderiza HTML, ejecuta JavaScript, sigue redirecciones automáticamente y oculta los detalles crudos del protocolo HTTP.

Como DevOps, a menudo no te importa cómo se *ve* una página web; te importa qué código de estado HTTP devuelve, qué cabeceras envía, o necesitas inyectar un *payload* JSON directamente en la API de Kubernetes. Para esto, bajamos al barro con `wget` y `curl`.

Aunque a menudo se confunden, tienen filosofías muy distintas: **`wget` está diseñado para descargar archivos**, mientras que `**curl` está diseñado para hablar y diagnosticar protocolos**.

### 1. `wget`: El descargador incansable

`wget` (Web Get) brilla cuando tu objetivo principal es traer un archivo desde un servidor a tu disco duro. Es robusto, maneja caídas de red excepcionalmente bien y puede descargar directorios enteros recursivamente.

**Uso básico:**

```bash
# Descarga un archivo y lo guarda con su nombre original
$ wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso

```

**Escenarios DevOps cotidianos:**

* **Descargas masivas a prueba de fallos (`-c`):** Imagina que estás descargando un volcado de base de datos de 50 GB y tu conexión VPN parpadea al 99%. `wget` te salva la vida permitiéndote continuar desde donde se cortó.
```bash
$ wget -c https://backup-server.local/db-prod-dump.tar.gz

```


* **Descargas en segundo plano (`-b`):** Si estás conectado por SSH y necesitas lanzar una descarga larga sin bloquear tu terminal (ni usar `tmux` o `nohup`).
```bash
$ wget -b https://midominio.com/archivo-gigante.zip
# La salida se enviará a un archivo 'wget-log'

```



---

### 2. `curl`: La navaja suiza de las APIs

`curl` (Client URL) es, sin duda, la herramienta HTTP más utilizada por los ingenieros de infraestructura. Por defecto, `curl` no guarda nada en el disco; escupe la respuesta directamente a la salida estándar (stdout), lo que lo hace perfecto para tuberías (`pipes`).

**Las bases:**

```bash
# Muestra el código HTML/JSON en la pantalla
$ curl https://api.ipify.org?format=json

# Guarda la salida en un archivo (comportamiento tipo wget)
$ curl -O https://misitio.com/script.sh

```

#### Inspección y Diagnóstico

Cuando un balanceador de carga o un proxy inverso (como Nginx o Traefik) está fallando, necesitas ver las **cabeceras HTTP** crudas.

```bash
# Pide solo las cabeceras (-I o --head)
$ curl -I https://google.com
HTTP/2 301 
location: https://www.google.com/
content-type: text/html; charset=UTF-8
...

```

> **Trampa de Junior:** Haces un `curl https://misitio.com` y no devuelve nada. Asumes que el servidor está caído. ¡Error! Muchos servidores devuelven una redirección (HTTP 301/302), pero `curl` no las sigue por defecto. Para decirle que siga el camino hasta el final, **siempre usa el flag `-L` (Location)**.
> `$ curl -L https://misitio.com`

#### Interactuando con APIs REST (El pan de cada día)

En la nube, interactuarás constantemente con APIs modificando el método HTTP (`-X`), añadiendo cabeceras personalizadas (`-H`) y enviando datos (`-d`).

```bash
# Crear un recurso enviando un JSON (POST)
$ curl -X POST https://api.mi-infra.com/v1/usuarios \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer mi_token_secreto" \
     -d '{"nombre": "admin", "rol": "devops"}'

```

---

### 3. El Truco Senior: Midiendo el rendimiento con `curl`

Si un desarrollador te dice: *"La API va lenta, creo que es la red"*, puedes usar `curl` como una herramienta de *profiling* para diseccionar exactamente dónde se está perdiendo el tiempo en la capa HTTP.

`curl` tiene un flag `-w` (write-out) que te permite extraer métricas detalladas del ciclo de vida de la petición.

Crea un archivo llamado `curl-format.txt`:

```text
Tiempo DNS:      %{time_namelookup} s
Tiempo Conexión: %{time_connect} s
Tiempo TLS/SSL:  %{time_appconnect} s
Tiempo TTFB:     %{time_starttransfer} s (Time To First Byte)
Tiempo Total:    %{time_total} s\n

```

Y luego ejecútalo contra la API sospechosa, silenciando la salida normal (`-s`) y la barra de progreso (`-o /dev/null`):

```bash
$ curl -w "@curl-format.txt" -o /dev/null -s https://api.lenta.com/datos
Tiempo DNS:      0.012 s
Tiempo Conexión: 0.045 s
Tiempo TLS/SSL:  0.150 s
Tiempo TTFB:     4.500 s  <-- ¡AQUÍ ESTÁ EL PROBLEMA!
Tiempo Total:    4.550 s

```

**Diagnóstico rápido:** La red física está perfecta (la conexión tomó 45ms), el cifrado es rápido, pero el servidor tardó **4.5 segundos** en procesar la consulta a la base de datos antes de empezar a enviar el primer byte (TTFB). Puedes devolverle el ticket al equipo de desarrollo: *"No es la red, es una query no indexada en la base de datos"*.

#### El Botón del Pánico: Ignorando Certificados Rotos

A veces, en entornos de desarrollo local o servidores internos, te encontrarás con certificados SSL autofirmados o caducados. `curl` abortará la conexión por seguridad. Para decirle *"confía en mí, sé lo que hago"*, usa el flag **inseguro (`-k` o `--insecure`)**:

```bash
$ curl -k https://192.168.1.50/api/test

```

*(Nota: ¡Nunca automatices scripts de producción usando `-k`!)*

### Resumen del Capítulo 10

Con `ip route` conoces el mapa, con `mtr` revisas el tráfico en la carretera, con `dig` te aseguras de que el GPS funcione, con `ss` validas que la puerta del edificio esté abierta, y con `curl` tocas el timbre y hablas con el que está adentro. Ya tienes el cinturón negro en *troubleshooting* de red.
