La seguridad de un VPS no es un estado estático, sino un proceso de reducción continua de la superficie de ataque. En este capítulo, transformamos la instancia vulnerable por defecto en una fortaleza invisible. Evolucionamos de claves RSA básicas a la robustez de **Ed25519** y el control dinámico de los **Certificados SSH**. Implementamos capas de invisibilidad mediante **Single Packet Authorization (SPA)** para ocultar servicios críticos y desplegamos defensas inteligentes con **CrowdSec** y **nftables**. Finalmente, orquestamos el aislamiento total mediante **VPCs**, garantizando que la exposición sea una decisión táctica y no una debilidad del sistema.

## 3.1. Auditoría y reemplazo de configuraciones SSH predeterminadas (Ed25519, MFA/PAM en SSH, certificados SSH)

Secure Shell (SSH) es la principal línea de vida hacia tus instancias VPS, pero también es el vector de ataque número uno en cualquier infraestructura expuesta a Internet. Depender de las configuraciones predeterminadas de los proveedores cloud (que a menudo priorizan la conveniencia sobre la seguridad estricta) es un riesgo inaceptable para una infraestructura resiliente.

El proceso de *hardening* de SSH no consiste solo en deshabilitar contraseñas; implica modernizar la criptografía, añadir capas de validación y cambiar el paradigma de confianza estática por uno dinámico.

### Auditoría de la configuración base

El primer paso al provisionar un VPS (incluso si se hizo mediante `cloud-init`, como vimos en el Capítulo 2) es auditar el demonio SSH (`sshd`). Las distribuciones modernas utilizan `/etc/ssh/sshd_config` o el directorio `/etc/ssh/sshd_config.d/` para la configuración.

Debes asegurar que las siguientes directivas estén configuradas explícitamente para cerrar la superficie de ataque inicial:

```sshdconfig
# Deshabilitar autenticación por contraseña
PasswordAuthentication no
PermitEmptyPasswords no

# Deshabilitar el acceso directo a root. Las tareas administrativas 
# deben hacerse escalando privilegios (sudo) desde usuarios sin privilegios.
PermitRootLogin no

# Deshabilitar el reenvío de puertos si no es estrictamente necesario,
# para evitar que el VPS se use como pivote interno.
AllowTcpForwarding no
X11Forwarding no

# Limitar los usuarios que pueden autenticarse mediante SSH
AllowUsers sysadmin deployer

```

### Transición a Criptografía Moderna: Ed25519

Históricamente, RSA (con claves de 2048 o 4096 bits) ha sido el estándar de facto. Sin embargo, RSA es computacionalmente más pesado y propenso a ciertas vulnerabilidades si no se implementa perfectamente. Hoy en día, el estándar de oro en seguridad y rendimiento es **Ed25519**, basado en curvas elípticas (Curve25519).

Ed25519 ofrece claves públicas y privadas mucho más cortas, tiempos de validación extremadamente rápidos y resistencia comprobada contra ataques de canal lateral.

**1. Generación de la clave en el cliente:**

```bash
ssh-keygen -t ed25519 -C "admin@mi-estacion-trabajo"

```

**2. Restricción en el servidor (VPS):**
Para forzar que el servidor *solo* acepte claves y negocie conexiones usando algoritmos seguros, debes eliminar los `HostKey` legados (como RSA o ECDSA, este último apoyado en curvas del NIST que han generado dudas en la comunidad criptográfica) en el `sshd_config`:

```sshdconfig
# Comentar o eliminar las referencias a RSA y ECDSA
# HostKey /etc/ssh/ssh_host_rsa_key
# HostKey /etc/ssh/ssh_host_ecdsa_key

# Forzar explícitamente solo Ed25519
HostKey /etc/ssh/ssh_host_ed25519_key

```

### Autenticación Multifactor (MFA) vía PAM en SSH

Incluso una clave Ed25519 puede ser comprometida si el equipo del operador es vulnerado. La implementación de MFA (Multi-Factor Authentication) a nivel de SSH añade una barrera crítica. En Linux, esto se logra vinculando SSH con el módulo PAM (Pluggable Authentication Modules) de Google Authenticator (que implementa el estándar abierto TOTP).

**1. Instalación y configuración del TOTP:**
En el VPS, instala el paquete necesario (por ejemplo, `libpam-google-authenticator` en Debian/Ubuntu). Cada usuario debe ejecutar el comando `google-authenticator` en su sesión para generar su semilla (código QR), la cual escaneará con una app como Aegis, FreeOTP o Google Authenticator.

**2. Configuración de PAM (`/etc/pam.d/sshd`):**
Añade la siguiente línea al final del archivo para requerir el token TOTP:

```text
auth required pam_google_authenticator.so

```

**3. Enlace en `sshd_config`:**
Es fundamental configurar OpenSSH para que exija **ambos** factores (Clave Pública + Token), no solo uno de ellos. Si no defines `AuthenticationMethods`, SSH permitirá el acceso si *cualquiera* de los métodos es exitoso.

```sshdconfig
# Habilitar la interacción con PAM para solicitar el código (antiguamente ChallengeResponseAuthentication)
KbdInteractiveAuthentication yes
UsePAM yes

# Obligar a que el usuario provea su clave pública Y el token interactivo
AuthenticationMethods publickey,keyboard-interactive

```

### El siguiente nivel: Certificados SSH

Gestionar el archivo `~/.ssh/authorized_keys` es viable para unas pocas instancias. Pero cuando pasas a infraestructuras de decenas o cientos de VPS, distribuir, rotar y revocar claves públicas se convierte en una pesadilla operativa. Aquí es donde brillan los **Certificados SSH**.

En lugar del modelo *TOFU* (Trust On First Use) y confianza estática, configuras una Autoridad Certificadora (CA) propia.

**Diagrama lógico de autenticación por Certificados SSH:**

```text
[ Administrador ]                                      [ Autoridad Certificadora (CA) ]
       |                                                             |
       | 1. Pide firmar su clave pública (id_ed25519.pub)            |
       |------------------------------------------------------------>|
       |                                                             |
       | 2. La CA valida la identidad y devuelve un CERTIFICADO      |
       |    (con fecha de caducidad, ej. 8 horas)                    |
       |<------------------------------------------------------------|
       |
       | 3. Conexión SSH enviando el Certificado
       |=====================================================================> [ Servidor VPS ]
                                                                                      |
                                                                       4. Verifica la firma de la CA
                                                                          (No necesita conocer la
                                                                           clave del usuario, solo
                                                                           confía en la CA)

```

**Implementación básica:**

1. **Crear la CA (En una máquina segura, idealmente aislada o usando un Vault):**

```bash
ssh-keygen -t ed25519 -f ca_user_key -C "CA_Usuarios"

```

1. **Configurar el VPS para confiar en la CA:**
Se copia *únicamente la clave pública* de la CA (`ca_user_key.pub`) al VPS, por ejemplo en `/etc/ssh/ca_user_key.pub`. En el `sshd_config` del VPS se añade:

```sshdconfig
TrustedUserCAKeys /etc/ssh/ca_user_key.pub

```

*A partir de este momento, puedes vaciar todos los archivos `authorized_keys` del VPS.*
3. **Firmar la clave del usuario:**
Cuando el SysAdmin necesita acceder, la CA firma su clave pública otorgándole permisos. Es una buena práctica usar el flag `-V` para que el certificado expire rápidamente (ej. en 8 horas, cubriendo un turno de trabajo):

```bash
ssh-keygen -s ca_user_key -I "identidad_auditoria_sysadmin1" -n sysadmin -V +8h id_ed25519.pub

```

Esto genera `id_ed25519-cert.pub`. Cuando el SysAdmin intente hacer SSH, el cliente ofrecerá automáticamente este certificado.

El uso de certificados SSH resuelve el problema de la rotación de claves, elimina la necesidad de pre-provisionar accesos y mejora la auditoría, ya que el identificador (`-I`) quedará registrado en los logs del sistema del VPS cada vez que el certificado sea utilizado, facilitando la observabilidad de seguridad que se discutirá más adelante en el Capítulo 8.

## 3.2. Implementación de Port Knocking y Single Packet Authorization (SPA)

En la sección anterior, blindamos el servicio SSH asumiendo que el puerto estaba expuesto y recibiendo conexiones. Sin embargo, en el paradigma del *hardening* perimetral, la mejor defensa contra un escaneo automatizado (como los realizados constantemente por botnets o motores como Shodan) es la invisibilidad. Si un atacante no sabe que el servicio existe, no puede atacarlo.

Aquí es donde entran en juego los mecanismos de autorización silenciosa. El objetivo es mantener el firewall configurado para denegar todo el tráfico de entrada (`DEFAULT DROP`), abriendo el puerto de administración de forma dinámica y temporal solo para los clientes que puedan demostrar criptográficamente su autorización *antes* de establecer la conexión TCP.

### Port Knocking: El enfoque clásico

El **Port Knocking** (golpeo de puertos) es la implementación original de este concepto. Funciona configurando un demonio en el servidor que monitorea los logs del firewall o escucha pasivamente en la interfaz de red. El cliente debe intentar conectarse a una secuencia secreta de puertos cerrados en un orden específico. Si la secuencia es correcta, el demonio ejecuta un comando (generalmente una regla de `iptables` o `nftables`) para abrir el puerto SSH a la IP origen.

**Diagrama lógico de Port Knocking:**

```text
[ Cliente ]                                      [ Firewall / Servidor (Puerto 22 cerrado) ]
     |                                                             |
     | 1. SYN a Puerto 7000 (Rechazado)                            |
     |------------------------------------------------------------>|
     | 2. SYN a Puerto 8500 (Rechazado)                            |
     |------------------------------------------------------------>|
     | 3. SYN a Puerto 9000 (Rechazado)                            |
     |------------------------------------------------------------>|
     |                                                             |
     |                           [Demonio detecta la secuencia y abre el puerto 22 a la IP]
     |                                                             |
     | 4. Conexión a Puerto 22 (Éxito)                             |
     |============================================================>|

```

**Implementación con `knockd`:**
El demonio más común es `knockd`. Una configuración típica en `/etc/knockd.conf` se vería así:

```ini
[options]
    UseSyslog
    Interface = eth0

[openSSH]
    sequence    = 7000,8500,9000
    seq_timeout = 5
    command     = /sbin/iptables -I INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

[closeSSH]
    sequence    = 9000,8500,7000
    seq_timeout = 5
    command     = /sbin/iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

```

**Las limitaciones del Port Knocking:**
Aunque efectivo contra escaneos aleatorios, el Port Knocking es inherentemente frágil. Sus principales defectos son:

1. **Vulnerabilidad a ataques de repetición (Replay Attacks):** Si un atacante está "esnifando" (sniffing) la red, puede capturar la secuencia de puertos y reproducirla.
2. **Problemas de latencia y NAT:** Si los paquetes se desordenan en Internet debido a la latencia, la secuencia fallará. Además, detrás de NATs agresivos, el origen puede verse alterado.
3. **Ruido en la red:** Genera múltiples paquetes anómalos que pueden disparar alertas en un IDS (Sistema de Detección de Intrusos).

### Single Packet Authorization (SPA): La evolución moderna

Para resolver las deficiencias del Port Knocking, nació **SPA (Single Packet Authorization)**. En lugar de una secuencia de paquetes a puertos aleatorios, SPA envía un *único* paquete de datos, generalmente sobre UDP (para evitar el handshake TCP), dirigido a un puerto que también está configurado para "dropear" (descartar) paquetes.

El truco es que el demonio SPA intercepta este paquete mediante la librería `libpcap` *antes* de que sea descartado por el firewall. El contenido de este paquete está cifrado asimétricamente y firmado mediante HMAC.

Si la firma es válida, el tiempo de generación es reciente (evitando replay attacks) y el usuario tiene permisos, el demonio SPA modifica el firewall para dejar pasar a esa IP.

**Diagrama lógico de SPA:**

```text
[ Cliente (con clave SPA) ]                      [ Firewall / Servidor (Todos los puertos cerrados) ]
     |                                                             |
     | 1. Envía 1 paquete UDP encriptado (Payload: "Abrir p.22")   |
     |------------------------------------------------------------>| (Paquete es descartado por el firewall)
     |                                                             | 
     |                           [Demonio fwknop lee el paquete vía pcap, verifica firma HMAC y timestamp]
     |                           [Abre dinámicamente el puerto 22 a la IP por 30 segundos]
     |                                                             |
     | 2. Conexión a Puerto 22 (Éxito)                             |
     |============================================================>|

```

**Implementación con `fwknop` (FireWall KNock OPerator):**
`fwknop` es el estándar de la industria para SPA en Linux. Su arquitectura consta del cliente (`fwknop`) y el servidor (`fwknopd`).

1. **Generación de claves en el cliente:**
El SysAdmin genera una clave simétrica (o mejor aún, usa GPG para criptografía asimétrica) y una clave HMAC en su estación de trabajo.

```bash
fwknop -A tcp/22 -a <IP_DEL_CLIENTE> -D <IP_DEL_VPS> --key-gen

```

Esto genera las claves y el archivo de configuración `~/.fwknoprc`.
2. **Configuración del servidor (`/etc/fwknop/access.conf`):**
En el VPS, configuras a quién se le permite el acceso, definiendo las claves compartidas y cuánto tiempo permanecerá abierta la regla de firewall.

```text
SOURCE          ANY
REQUIRE_USERNAME sysadmin
KEY_BASE64      <Clave_Base64_generada>
HMAC_KEY_BASE64 <Clave_HMAC_generada>
FW_ACCESS_TIMEOUT 30

```

1. **Ejecución del cliente:**
Cuando el SysAdmin necesita acceder al VPS, lanza el cliente SPA y luego su conexión SSH habitual:

```bash
fwknop -n mi_vps_perfil
ssh sysadmin@<IP_DEL_VPS>

```

### Conclusión táctica para SysAdmins

Implementar SPA añade una capa de "Seguridad por Invisibilidad" (Security through Obscurity) respaldada por criptografía matemática real, algo que el Port Knocking clásico no logra.

Para una infraestructura resiliente, mantener el puerto 22 cerrado al público y usar SPA como la "llave del candado" antes de usar tu certificado Ed25519 garantiza que tu VPS tenga un perfil de ataque perimetral prácticamente nulo. Sin embargo, no es un reemplazo para el monitoreo constante; como veremos en la siguiente sección, las herramientas como Fail2Ban y CrowdSec siguen siendo vitales para gestionar el comportamiento anómalo una vez que el tráfico ha sido permitido.

## 3.3. Firewalls dinámicos y protección contra intrusos: Fail2Ban avanzado, CrowdSec y `nftables`

Aunque en la sección anterior limitamos drásticamente la exposición del puerto SSH, un VPS de producción inevitablemente expondrá otros servicios al mundo (como puertos 80/443 para tráfico web, APIs, o servidores de correo). Un firewall estático que solo abre o cierra puertos es insuficiente contra ataques de fuerza bruta distribuidos, escaneos de vulnerabilidades automatizados o ataques de denegación de servicio a nivel de aplicación (Capa 7).

Necesitamos pasar de un modelo estático a uno **dinámico**: una infraestructura que lea su entorno, detecte anomalías y modifique sus propias reglas de acceso en tiempo real.

### El motor subyacente: Transición a `nftables`

Antes de hablar de detección, debemos hablar del motor de bloqueo. Históricamente, `iptables` ha sido el estándar, pero su arquitectura lineal genera un alto coste de procesamiento (overhead) cuando las listas de bloqueo crecen a miles de IPs.

El estándar moderno en el kernel de Linux es **`nftables`**. Sus principales ventajas para un SysAdmin incluyen:

1. **Actualizaciones atómicas:** Aplica cambios sin tener que vaciar y recargar todo el conjunto de reglas.
2. **Sintaxis unificada:** Combina IPv4, IPv6, ARP y puentes de red en un solo marco.
3. **Sets y Maps (La clave dinámica):** Permite agrupar miles de IPs en una estructura de datos optimizada (como un hash o un árbol) de la cual el firewall puede leer en una fracción de milisegundo, en lugar de procesar miles de reglas individuales.

**Ejemplo de una estructura base en `nftables` usando Sets:**

```nftables
table inet filter {
    # Definimos un "Set" dinámico para IPs maliciosas
    set blackhole {
        type ipv4_addr
        flags dynamic, timeout
        size 65536
    }

    chain input {
        type filter hook input priority 0; policy drop;

        # Conexiones establecidas y locales
        ct state established,related accept
        iif "lo" accept

        # Bloqueo inmediato a cualquier IP dentro del Set "blackhole"
        ip saddr @blackhole counter drop

        # Tráfico web legítimo
        tcp dport { 80, 443 } accept
    }
}

```

Cualquier sistema de detección de intrusos (IDS/IPS) que utilicemos, deberá alimentar este `set blackhole`.

### Fail2Ban Avanzado: Optimizando el estándar clásico

Fail2Ban es una herramienta probada que funciona mediante el análisis (parsing) continuo de archivos de registro (logs) en busca de patrones de error predefinidos mediante expresiones regulares (regex). Cuando una IP cruza un umbral de errores, Fail2Ban ejecuta una "acción".

**Limitaciones típicas a evitar:** La configuración por defecto de Fail2Ban suele llamar al binario de `iptables` por cada IP bloqueada y desbloqueada, lo cual es ineficiente y no sobrevive a reinicios (las reglas se pierden).

**Prácticas avanzadas con Fail2Ban:**

1. **Acción `nftables-multiport`:** Configura tus *jails* (cárceles) para que en lugar de ejecutar comandos lentos, inyecten la IP directamente en el Set de `nftables` que definimos anteriormente.
2. **La cárcel `recidive`:** Muchos ataques rotan IPs o esperan a que el baneo de 10 minutos expire para volver a intentar. Habilitar la cárcel *recidive* hace que Fail2Ban analice sus propios logs (`/var/log/fail2ban.log`). Si ve que una misma IP ha sido baneada múltiples veces en un día, le aplica un baneo a largo plazo (ej. una semana).

**Fragmento en `/etc/fail2ban/jail.local`:**

```ini
[DEFAULT]
# Cambiar el motor de baneo predeterminado a nftables
banaction = nftables-multiport
banaction_allports = nftables-allports

[recidive]
enabled = true
logpath  = /var/log/fail2ban.log
banaction = nftables-allports
bantime  = 1w   ; Bloqueo de 1 semana
findtime = 1d   ; Si fue baneado varias veces en 1 día
maxretry = 3

```

### CrowdSec: El IPS Colaborativo de Próxima Generación

Mientras que Fail2Ban es excelente, tiene dos problemas arquitectónicos graves para el internet moderno:

1. **Es ciego al exterior:** Solo aprende de los ataques que *tu* servidor ya ha sufrido.
2. **Uso de CPU:** Evaluar regex complejas en logs masivos bajo un ataque severo (Capa 7) puede consumir todos los recursos del VPS.

**CrowdSec** es un IPS (Sistema de Prevención de Intrusos) moderno escrito en Go que resuelve esto separando la detección de la mitigación y añadiendo Inteligencia de Amenazas (CTI) colaborativa.

**Arquitectura de CrowdSec:**

```text
  [ Entorno del VPS ]                               [ Red Global (CTI) ]
                                                           |
1. Logs (Nginx, SSH, etc.)                                 |
      |                                                    v
      v                                      4. Sincronización de IPs maliciosas
2. Agente CrowdSec (Parser YAML + Escenarios) <======================> (Comunidad CrowdSec)
      |                                        (Aporta y recibe IPs de atacantes confirmados)
      | 3. Decisión Local (Ban)
      v
[ API Local de CrowdSec ]
      ^
      | 5. Consulta periódica o push
      v
[ Bouncer (ej. cs-firewall-bouncer) ]
      |
      v
6. Modificación de nftables / ipsets

```

**Ventajas operativas de CrowdSec:**

* **Bouncers desacoplados:** El agente de CrowdSec solo detecta. La acción la toma un *Bouncer*. Puedes tener un Bouncer a nivel de red (`nftables`), o un Bouncer a nivel de aplicación (ej. un módulo en Nginx que en lugar de bloquear la IP, le presenta un CAPTCHA de Cloudflare, reduciendo falsos positivos).
* **Parsers eficientes:** No usa regex pesadas a menos que sea estrictamente necesario; utiliza parsers precompilados en YAML basados en grok, siendo mucho más ligero que Fail2Ban.
* **Inmunidad de rebaño:** Cuando instalas CrowdSec, recibes inmediatamente una lista de decenas de miles de IPs que actualmente están atacando a otros servidores en la red global. Tu VPS las bloquea antes de que siquiera intenten su primer ataque contra ti.

### Estrategia combinada para SysAdmins

En una infraestructura resiliente, no tienes que elegir exclusivamente uno. La mejor estrategia es:

1. Utilizar **`nftables`** como la barrera fundamental de alto rendimiento en el kernel.
2. Implementar **CrowdSec** para todos los servicios estándar expuestos (SSH, Nginx/HAProxy, bases de datos expuestas) para aprovechar la inteligencia global y la mitigación eficiente de Capa 7.
3. Mantener **Fail2Ban** para aplicaciones internas personalizadas o scripts propios donde escribir un parser en CrowdSec sería demasiado complejo o innecesario, utilizando Fail2Ban simplemente para alimentar los sets locales de `nftables`.

## 3.4. Aislamiento de redes privadas y VPCs (Virtual Private Clouds)

Hasta ahora, hemos construido muros muy altos y robustos alrededor de nuestras instancias expuestas a Internet (SSH modernizado, SPA, `nftables` y CrowdSec). Sin embargo, el principio fundamental de la seguridad en profundidad (*Defense in Depth*) dicta que la mejor manera de proteger un recurso crítico es, simplemente, no conectarlo a Internet en absoluto.

Cuando pasamos de "instancias aisladas" a "infraestructuras resilientes", el diseño de la red debe cambiar. No todos los VPS necesitan una IP pública. Aquí es donde la adopción de **VPCs (Virtual Private Clouds)** y el aislamiento de redes se convierte en el pilar arquitectónico de tu entorno.

### La evolución: De la Red Privada Compartida a la VPC Aislada

En los primeros días del hosting VPS, los proveedores ofrecían una "interfaz de red privada" (generalmente en el rango `10.x.x.x`). El peligro oculto era que, a menudo, esta red era una gran VLAN compartida con otros clientes del mismo centro de datos. Si no configurabas un firewall interno, un vecino comprometido podía escanear y atacar tus puertos "privados".

Hoy en día, los proveedores modernos implementan **VPCs respaldadas por SDN (Software-Defined Networking)**. Esto garantiza que tu subred privada (ej. `10.10.0.0/16`) sea una red superpuesta aislada criptográficamente (a menudo usando VXLAN o protocolos propietarios) a la que solo tus instancias tienen acceso.

### Arquitectura de Aislamiento: DMZ y Subredes Privadas

El objetivo de una VPC es segmentar el tráfico en niveles de confianza. En una arquitectura estándar de tres capas (Balanceador, Aplicación, Base de Datos), solo la primera capa debe tener contacto directo con el exterior.

**Diagrama lógico de una arquitectura VPC:**

```text
[ Internet Público ]
         |
         v
+-- VPC (Ej. 10.10.0.0/16) -----------------------------------------------+
|                                                                         |
|  +-- Subred Pública (Perímetro / DMZ) -------------------------------+  |
|  |                                                                   |  |
|  |  [ Balanceador de Carga ]         [ Bastion Host (Jump Server) ]  |  |
|  |  - IP Pública: 203.0.113.10       - IP Pública: 203.0.113.20      |  |
|  |  - IP Privada: 10.10.1.10         - IP Privada: 10.10.1.20        |  |
|  |  - Puertos expuestos: 80, 443     - Puertos expuestos: SPA + 22   |  |
|  +-------------------------------------------------------------------+  |
|            |                                   |                        |
|            v                                   v                        |
|  +-- Subred Privada (Aplicación) ------------------------------------+  |
|  |                                                                   |  |
|  |  [ Nodo App 01 ]                  [ Nodo App 02 ]                 |  |
|  |  - IP Pública: NINGUNA            - IP Pública: NINGUNA           |  |
|  |  - IP Privada: 10.10.2.11         - IP Privada: 10.10.2.12        |  |
|  |                                                                   |  |
|  +-------------------------------------------------------------------+  |
|            |                                   |                        |
|            +-----------------+-----------------+                        |
|                              |                                          |
|                              v                                          |
|  +-- Subred Privada (Datos - Máximo Aislamiento) --------------------+  |
|  |                                                                   |  |
|  |                 [ Cluster de Base de Datos ]                      |  |
|  |                 - IP Privada: 10.10.3.50                          |  |
|  |                 - Firewall: Solo acepta tráfico de 10.10.2.0/24   |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+

```

### Gestión del Acceso: El Bastion Host y `ProxyJump`

Si tus nodos de aplicación y bases de datos no tienen IP pública, ¿cómo los administras? La respuesta es el **Bastion Host** (o Jump Server).

Este es un VPS minimalista ubicado en la subred pública. Su única función es servir como punto de entrada auditado hacia la red privada. Al Bastion le aplicarás todas las técnicas aprendidas en las secciones 3.1, 3.2 y 3.3 (Ed25519, SPA, CrowdSec).

**El error común (SSH Agent Forwarding):** Históricamente, los SysAdmins enviaban sus claves privadas a través del Bastion usando `ssh -A`. Esto es un riesgo masivo: si el Bastion es comprometido, un atacante con permisos de root puede secuestrar tu socket de agente y usar tus claves para saltar al resto de la infraestructura.

**La solución moderna (`ProxyJump`):** OpenSSH permite enrutar tu conexión TCP directamente a través del Bastion hacia el servidor de destino final, realizando el saludo criptográfico de extremo a extremo. El Bastion solo ve tráfico cifrado, no tus claves.

Configuración en el cliente del SysAdmin (`~/.ssh/config`):

```ssh-config
# 1. Configuración del Bastion (Asumiendo que pasaste la autorización SPA previamente)
Host bastion-prod
    HostName 203.0.113.20
    User sysadmin
    IdentityFile ~/.ssh/id_ed25519

# 2. Configuración de los nodos internos usando el Bastion como puente
Host app-* db-*
    ProxyJump bastion-prod
    User deploy
    IdentityFile ~/.ssh/id_ed25519

Host app-01
    HostName 10.10.2.11

Host db-master
    HostName 10.10.3.50

```

Con esto, ejecutar `ssh db-master` te conectará directamente y de forma segura a la base de datos aislada, pasando invisiblemente por el Bastion.

### Gestión del Tráfico de Salida (Egress / NAT)

Los servidores en la subred privada no pueden recibir conexiones de Internet, pero ¿qué pasa cuando necesitan descargar actualizaciones del sistema operativo (`apt upgrade`) o conectarse a una API externa (ej. Stripe o SendGrid)? Necesitan acceso de **salida** (Egress).

Existen dos vías para resolver esto en entornos VPS:

1. **NAT Gateway Gestionado:** Muchos proveedores cloud (AWS, DigitalOcean, Hetzner) ofrecen routers/gateways NAT gestionados que puedes adjuntar a tu VPC. Es la opción más limpia y de alta disponibilidad, aunque suele tener un coste adicional.
2. **NAT en el Bastion (Do-It-Yourself):** Si buscas optimizar costes, puedes configurar tu Bastion Host para que actúe como un router NAT usando `nftables`. Deberás habilitar el reenvío de paquetes en el kernel del Bastion (`sysctl -w net.ipv4.ip_forward=1`) y aplicar una regla de enmascaramiento (Masquerade) para que el tráfico de la red `10.10.x.x` salga hacia Internet disfrazado con la IP pública del Bastion.

### Microsegmentación Interna (Zero Trust)

Implementar una VPC no significa que debas confiar ciegamente en todo el tráfico interno. Si un atacante logra comprometer un `App Server` a través de una vulnerabilidad web (Capa 7), ya estará dentro de tu VPC.

Es imperativo aplicar **Microsegmentación**. Utilizando `nftables` (como vimos en 3.3) o los "Cloud Firewalls" del proveedor, debes definir políticas estrictas:

* El servidor de Base de Datos *solo* debe aceptar conexiones en el puerto 5432 provenientes del bloque de IPs de la subred de Aplicación y del Bastion (para mantenimiento).
* Los Nodos de Aplicación no deben poder hacer SSH entre sí (evitando el movimiento lateral).
* Todo tráfico no explícitamente permitido internamente debe ser bloqueado (`DEFAULT DROP`).

Al combinar la reducción absoluta de la superficie de exposición externa mediante VPCs con una estricta microsegmentación interna, logramos aislar las vulnerabilidades y limitar drásticamente el "radio de explosión" de cualquier incidente de seguridad.
