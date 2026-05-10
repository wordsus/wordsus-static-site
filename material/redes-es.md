#### **Capítulo 1: Fundamentos de Redes y Arquitectura Base**

* **1.1** El Modelo OSI (Open Systems Interconnection) y sus 7 capas.
* **1.2** El Modelo TCP/IP y su relación con el Modelo OSI.
* **1.3** Topologías de red físicas y lógicas (Estrella, Malla, Árbol, Anillo).
* **1.4** Tipos de redes según su alcance (LAN, WAN, MAN, PAN, SD-WAN).
* **1.5** Hardware de red esencial: Switches, Routers, Hubs y Puntos de Acceso.

#### **Capítulo 2: Capa de Enlace de Datos y Redes Locales (L2)**

* **2.1** Direccionamiento físico: Entendiendo las Direcciones MAC.
* **2.2** Tramas Ethernet y MTU (Maximum Transmission Unit).
* **2.3** VLANs (Virtual LANs) y el protocolo 802.1Q (Trunking).
* **2.4** Prevención de bucles: STP (Spanning Tree Protocol) y sus variantes.
* **2.5** Protocolo de Resolución de Direcciones (ARP) y RARP.

#### **Capítulo 3: Capa de Red, Direccionamiento IP y Enrutamiento (L3)**

* **3.1** Protocolo de Internet versión 4 (IPv4): Clases y direccionamiento privado vs. público.
* **3.2** Protocolo de Internet versión 6 (IPv6): Estructura, ventajas y adopción.
* **3.3** Diseño de subredes: Subnetting, CIDR (Classless Inter-Domain Routing) y VLSM.
* **3.4** Enrutamiento estático vs. Enrutamiento dinámico.
* **3.5** Protocolos de Enrutamiento Interior (IGP): OSPF e IS-IS.
* **3.6** Protocolos de Enrutamiento Exterior (EGP): BGP (Border Gateway Protocol) a fondo.
* **3.7** Traducción de direcciones: NAT (Network Address Translation) y PAT.
* **3.8** Diagnóstico de capa 3: El protocolo ICMP.

#### **Capítulo 4: Capa de Transporte y Flujo de Datos (L4)**

* **4.1** Puertos lógicos y el concepto de Sockets.
* **4.2** TCP (Transmission Control Protocol): Confiabilidad, 3-way handshake, control de flujo y congestión.
* **4.3** UDP (User Datagram Protocol): Casos de uso de baja latencia (streaming, DNS).
* **4.4** Multiplexación de conexiones y manejo de estados.

#### **Capítulo 5: Capa de Aplicación y Protocolos Clave (L7)**

* **5.1** DNS (Domain Name System): Jerarquía, tipos de registros (A, CNAME, TXT, MX), resolución iterativa/recursiva y DNSSEC.
* **5.2** HTTP y HTTPS: Métodos, cabeceras, códigos de estado, evolución (HTTP/1.1, HTTP/2, HTTP/3/QUIC).
* **5.3** Criptografía en red: TLS/SSL, proceso de Handshake, infraestructura de clave pública (PKI) y gestión de certificados (Let's Encrypt, ACME).
* **5.4** Protocolos de transferencia y gestión: SSH, FTP/SFTP.
* **5.5** Protocolos de asignación y sincronización: DHCP y NTP.
* **5.6** Protocolos de correo electrónico (conceptos básicos): SMTP, POP3, IMAP.

#### **Capítulo 6: Redes en la Nube (Cloud Networking)**

* **6.1** Redes Virtuales Privadas en Cloud (VPC en AWS/GCP, VNet en Azure).
* **6.2** Diseño de topologías Cloud: Subredes públicas, privadas y aisladas.
* **6.3** Puertas de enlace: Internet Gateways, NAT Gateways y Egress-only Gateways.
* **6.4** Interconexión de VPCs: VPC Peering y Transit Gateways / Hub and Spoke.
* **6.5** Balanceo de carga L4 (Network Load Balancers) vs. L7 (Application Load Balancers).
* **6.6** Entrega de contenido y latencia: CDNs (Content Delivery Networks) y Edge Computing.
* **6.7** Conectividad híbrida: VPNs Site-to-Site (IPsec), Client VPNs (OpenVPN, WireGuard) y conexiones dedicadas (Direct Connect, ExpressRoute).

#### **Capítulo 7: Redes de Contenedores y Orquestación (Kubernetes)**

* **7.1** Redes en Docker: Modos bridge, host, none y overlay.
* **7.2** CNI (Container Network Interface): Estándares y arquitectura.
* **7.3** El modelo de red de Kubernetes: Comunicación Pod-to-Pod y Node-to-Pod.
* **7.4** Plugins CNI populares: Flannel, Calico, Weave y Cilium.
* **7.5** Exposición de aplicaciones: K8s Services (ClusterIP, NodePort, LoadBalancer).
* **7.6** Enrutamiento avanzado L7 en K8s: Ingress Controllers y la nueva Gateway API.
* **7.7** Service Mesh (Istio, Linkerd): Sidecars, mTLS, Traffic Splitting y Circuit Breaking.
* **7.8** Revolución en el kernel: eBPF (Extended Berkeley Packet Filter) aplicado al networking y seguridad de contenedores.

#### **Capítulo 8: Seguridad de Redes y Arquitectura Zero Trust**

* **8.1** Firewalls: Filtrado sin estado (Stateless) vs. con estado (Stateful), y NGFW.
* **8.2** Seguridad perimetral y de aplicación: WAF (Web Application Firewall) y protección DDoS.
* **8.3** Control de acceso en la nube: Security Groups (L4) y Network ACLs.
* **8.4** Sistemas de Detección y Prevención de Intrusos (IDS/IPS).
* **8.5** Microsegmentación de redes y Network Policies en Kubernetes.
* **8.6** Arquitectura Zero Trust: "Nunca confíes, siempre verifica".
* **8.7** Vectores de ataque comunes: Man-in-the-Middle (MITM), Spoofing de IP/ARP y amplificación DNS.

#### **Capítulo 9: Observabilidad, Monitoreo y Troubleshooting de Red**

* **9.1** Herramientas de diagnóstico de línea de comandos: `ping`, `traceroute/mtr`, `netstat/ss`, `iproute2`, `dig/nslookup`.
* **9.2** Análisis de paquetes a bajo nivel: `tcpdump` y Wireshark.
* **9.3** Análisis de puertos y seguridad: `nmap` y `netcat` (`nc`).
* **9.4** Métricas clave de rendimiento: Latencia, Jitter, Packet Loss y Throughput.
* **9.5** Análisis de flujos de tráfico: NetFlow, sFlow y VPC Flow Logs.
* **9.6** Monitoreo sintético y RUM (Real User Monitoring) para redes.

#### **Capítulo 10: Automatización e Infraestructura como Código (IaC) para Redes**

* **10.1** Definición de topologías de red con Terraform y Pulumi.
* **10.2** Gestión de la configuración de dispositivos de red físicos y virtuales con Ansible.
* **10.3** GitOps aplicado al networking: Gestión de cambios de red a través de repositorios Git y pipelines de CI/CD.
* **10.4** Pruebas automatizadas de configuración y políticas de red.
