La resiliencia de un SysAdmin no se mide solo por la disponibilidad de sus servicios, sino por su capacidad para gestionar lo inesperado. En este capítulo final, trascendemos la configuración de servicios para adentrarnos en la defensa activa y el análisis forense. Aprenderás a transformar cada VPS en una caja negra auditable mediante **HIDS** como Wazuh, a supervisar el kernel con **auditd** y a confinar procesos con **AppArmor** o **SELinux**. Además, exploraremos la automatización de parches y el **Livepatching** para eliminar vulnerabilidades sin sacrificar el *uptime*. Finalmente, estableceremos un protocolo de respuesta para actuar con precisión cuando la seguridad perimetral falle.

## 10.1. Sistemas de Detección de Intrusos en Host (HIDS): OSSEC y Wazuh

En el Capítulo 3 construimos muros altos mediante firewalls dinámicos, `nftables` y herramientas de reputación perimetral como CrowdSec. En el Capítulo 8, establecimos torres de vigilancia para observar el rendimiento y centralizar logs. Sin embargo, la seguridad perimetral asume que el atacante está *afuera*. ¿Qué sucede si una vulnerabilidad de día cero en tu aplicación web permite a un atacante evadir el firewall y obtener una shell interactiva? ¿O si un administrador legítimo realiza un cambio no autorizado en una configuración crítica?

Aquí es donde entran los **Sistemas de Detección de Intrusos en Host (HIDS)**. A diferencia de un NIDS (Network IDS) que inspecciona el tráfico de red, un HIDS opera desde las entrañas del propio sistema operativo. Su objetivo es detectar anomalías, modificaciones no autorizadas y comportamientos sospechosos directamente en la instancia VPS.

---

### De OSSEC a Wazuh: La Evolución del HIDS

El estándar histórico de facto para HIDS en entornos Unix/Linux ha sido **OSSEC** (Open Source HIDS Security). Creado a principios de los 2000, OSSEC introdujo un motor de reglas ligero y altamente efectivo para analizar logs, verificar la integridad de los archivos (FIM), detectar rootkits y ejecutar respuestas activas.

Sin embargo, a medida que las infraestructuras crecieron de instancias aisladas a flotas distribuidas, el modelo de gestión plana de OSSEC comenzó a mostrar limitaciones en escalabilidad y visualización.

De esta necesidad nació **Wazuh**, originalmente un fork de OSSEC que ha evolucionado hasta convertirse en una plataforma XDR (Extended Detection and Response) y SIEM de código abierto. Wazuh mantiene la ligereza del agente OSSEC en los endpoints, pero revoluciona el backend integrando un motor de indexación (basado en OpenSearch/Elasticsearch) y paneles de control avanzados para la gestión de flotas masivas y el cumplimiento normativo.

> **Nota del SysAdmin:** Para infraestructuras modernas de múltiples VPS, **Wazuh es la opción recomendada**. Su capacidad para gestionar miles de agentes de forma centralizada y su integración mediante API lo hacen ideal para arquitecturas IaC (como las que vimos en el Capítulo 5).

---

### Arquitectura de Despliegue de Wazuh

En una infraestructura resiliente, Wazuh opera bajo un modelo cliente-servidor descentralizado, ideal para comunicarse a través de las redes VPN tipo malla (WireGuard, Tailscale) que configuramos en el Capítulo 6.

```text
+-------------------+       +-------------------+       +--------------------+
|  VPS 1..N (Nodos) |       |   Wazuh Server    |       |   SysAdmin / SOC   |
|                   |       |                   |       |                    |
| +---------------+ |       | +---------------+ |       | +----------------+ |
| | Wazuh Agent   | | MQT   | | Wazuh Manager | | REST  | | Wazuh          | |
| | - Recolección | +------>| | - Análisis    | +------>| | Dashboard      | |
| | - FIM         | | 1514  | | - Reglas      | | 55000 | | - Visualización| |
| | - Rootcheck   | | TCP   | | - Alertas     | | TCP   | | - Gestión      | |
| +---------------+ |       | +-------+-------+ |       | +----------------+ |
+-------------------+       +---------|---------+       +--------------------+
                                      | Alertas JSON
                                      v
                            +-------------------+
                            |  Wazuh Indexer    |
                            | - Almacenamiento  |
                            | - Búsqueda rápida |
                            +-------------------+

```

1. **Wazuh Agent:** Se instala en cada VPS de tu infraestructura. Es extremadamente ligero y se encarga de recolectar datos a nivel del kernel y sistema de archivos.
2. **Wazuh Manager:** Recibe los datos de los agentes, los decodifica y los evalúa contra su motor de reglas (MITRE ATT&CK, PCI DSS, etc.).
3. **Wazuh Indexer & Dashboard:** El motor de base de datos no relacional y la interfaz gráfica que permite al SysAdmin cazar amenazas, auditar configuraciones y visualizar vulnerabilidades.

---

### Capacidades Core de un HIDS Moderno

Un despliegue correcto de Wazuh/OSSEC dota a tus servidores de los siguientes "superpoderes" de auditoría:

#### 1. File Integrity Monitoring (FIM)

El módulo `syscheck` escanea periódicamente o en tiempo real (mediante `inotify` en el kernel de Linux) los directorios críticos del sistema. Crea hashes criptográficos (MD5, SHA1, SHA256) de los archivos y emite una alerta crítica si detecta alteraciones, cambios de permisos o modificaciones de propietarios.

*Caso de uso:* Si un atacante modifica `/etc/passwd` o inserta una web shell en `/var/www/html/wp-includes/`, el HIDS alertará inmediatamente.

#### 2. Detección de Anomalías y Rootkits

El agente busca firmas de malware conocido a nivel de sistema de archivos, procesos ocultos que no aparecen con un simple `ps aux`, y puertos de escucha silenciosos.

#### 3. Respuesta Activa (Active Response)

Aunque el HIDS está enfocado en la "Detección", cuenta con capacidades de "Prevención". Puedes configurar Wazuh para que reaccione automáticamente ante alertas específicas. Por ejemplo, si el Manager detecta múltiples intentos de explotación de una vulnerabilidad web, puede instruir al Agente para que ejecute un script local que bloquee la IP ofensiva usando `nftables` o `iptables`.

*(Atención: Debes coordinar estas respuestas con Fail2Ban/CrowdSec para evitar reglas duplicadas y bloqueos accidentales a tus propias IPs de administración).*

---

### Ejemplo Práctico: Configurando FIM en un Agente

Una vez que has desplegado el agente en tu VPS y lo has conectado al servidor manager, la configuración principal del agente reside en `/var/ossec/etc/ossec.conf`.

Para habilitar la monitorización de integridad de archivos en tiempo real para configuraciones críticas y reportar exactamente qué usuario realizó el cambio (usando los subsistemas de auditoría que profundizaremos en la sección 10.2), puedes agregar o modificar el siguiente bloque:

```xml
<syscheck>
  <frequency>43200</frequency>

  <directories check_all="yes" realtime="yes" report_changes="yes">/etc</directories>
  <directories check_all="yes" realtime="yes" report_changes="yes">/var/www/html</directories>
  <directories check_all="yes" realtime="yes">/bin,/sbin,/boot</directories>

  <ignore>/etc/mtab</ignore>
  <ignore>/etc/hosts.deny</ignore>
  <ignore>/etc/mail/statistics</ignore>
  <ignore type="sregex">.log$|.tmp$</ignore>
</syscheck>

```

**Desglose de la configuración:**

* `check_all="yes"`: Verifica tamaño, permisos, propietario, grupo y hashes (MD5, SHA1, SHA256).
* `realtime="yes"`: Usa eventos del kernel para detectar el cambio en milisegundos, en lugar de esperar al escaneo programado de 12 horas (`43200` segundos).
* `report_changes="yes"`: No solo alerta que el archivo cambió, sino que guarda una copia del archivo en texto plano y envía un parche unificado (diff) al Manager, mostrándote exactamente qué línea se agregó o borró.

### Consideraciones de Rendimiento ("Steal Time" y Recursos)

Relacionado con los conceptos de virtualización que vimos en el Capítulo 1, los HIDS pueden consumir recursos significativos (CPU y disco IOPS) durante sus escaneos completos, lo que podría elevar el *Steal Time* en instancias VPS pequeñas con recursos compartidos.

**Mejores prácticas en VPS:**

1. Nunca actives el monitoreo en tiempo real (`realtime="yes"`) en directorios de bases de datos (`/var/lib/mysql`) o directorios de logs locales (`/var/log`), ya que el I/O constante colapsará el agente y el disco virtual.
2. Desfasa los escaneos (`frequency`) usando cron o configuraciones aleatorias si tienes decenas de VPS compartiendo el mismo hipervisor subyacente, para evitar "tormentas de I/O" simultáneas.

La implementación de un HIDS transforma tu VPS de una simple caja negra a un entorno altamente transparente, sentando las bases necesarias para el análisis forense que abordaremos al final de este capítulo.

## 10.2. Auditoría del kernel y llamadas al sistema con `auditd` y AppArmor/SELinux

En la sección anterior vimos cómo un HIDS como Wazuh actúa como el sistema nervioso central de nuestra seguridad, alertándonos si un archivo crítico es modificado. Sin embargo, cuando ocurre un incidente complejo, saber *qué* cambió no es suficiente; necesitamos saber *quién* lo hizo, *cómo* lo hizo y mediante qué proceso exacto.

Para lograr este nivel forense microscópico, debemos descender desde el espacio de usuario (Userland) hasta las profundidades del **Kernel de Linux**. Aquí es donde entran en juego el subsistema de auditoría (`auditd`) y los controles de acceso obligatorio (MAC) como AppArmor y SELinux.

---

### El Flujo de una Llamada al Sistema (Syscall)

Para entender cómo interactúan estas tecnologías, primero debemos visualizar qué sucede cuando un proceso (por ejemplo, tu servidor web Nginx o un usuario conectado por SSH) intenta acceder a un recurso del VPS, como leer un archivo o abrir un puerto de red. Esto se hace mediante una llamada al sistema o *syscall* (como `open()`, `read()`, `execve()`).

```text
+-------------------+       +-------------------+
| Espacio de Usuario|       | Proceso Atacante  |
| (Userland)        |       | (ej. web shell)   |
+---------+---------+       +---------+---------+
          |                           | Syscall: execve("/bin/bash")
==========|===========================|==================== Límite del Kernel
          v                           v
+-------------------------------------------------------+
|                    KERNEL LINUX                       |
|                                                       |
|  1. DAC (Control Discrecional)                        |
|     ¿El usuario de Nginx tiene permisos rwx?          |
|          | (Sí)                                       |
|          v                                            |
|  2. MAC (AppArmor / SELinux)                          |
|     ¿El perfil permite a Nginx ejecutar /bin/bash?    |
|          | (Bloqueado)                                |
|          v                                            |
|  3. Subsistema Audit (auditd)                         |
|     Registra el intento, el PID, el UID y el rechazo. |
|                                                       |
+-------------------------------------------------------+
                            |
                            v
                Logs enviados a Wazuh/Loki

```

---

### 1. `auditd`: La Caja Negra del Servidor

El demonio de auditoría de Linux (`auditd`) se integra directamente en el kernel para registrar eventos a un nivel que los logs tradicionales (como `syslog` o `journald`) simplemente no pueden alcanzar. Si un atacante compromete a un usuario y borra su archivo `.bash_history`, `auditd` aún tendrá el registro exacto de los comandos ejecutados, porque la recolección de datos ocurre *antes* de que el comando se complete en el espacio de usuario.

**Casos de uso críticos en un VPS:**

* **Rastreo de ejecución (`execve`):** Registrar cada comando ejecutado por el usuario `root`.
* **Vigilancia de archivos (Watches):** Similar al FIM de Wazuh, pero a nivel de syscall.
* **Auditoría de red:** Registrar llamadas para crear sockets de red no autorizados.

**Configuración Práctica (Reglas de `auditd`)**
Las reglas se definen en `/etc/audit/rules.d/audit.rules`. Un conjunto de reglas básicas para un VPS en producción debería incluir:

```bash
# Borrar reglas existentes antes de aplicar nuevas
-D

# Incrementar el tamaño del buffer para evitar pérdida de logs en picos de tráfico
-b 8192

# 1. Rastrear modificaciones en configuraciones de red (Watch)
-w /etc/systemd/network/ -p wa -k network_modifications
-w /etc/nftables.conf -p wa -k firewall_mod

# 2. Registrar cualquier comando ejecutado por root (EUID 0) o escalado vía sudo
-a always,exit -F arch=b64 -S execve -F euid=0 -k root_actions
-a always,exit -F arch=b32 -S execve -F euid=0 -k root_actions

# 3. Registrar accesos no autorizados (fallos de permisos)
-a always,exit -F arch=b64 -S open,creat,truncate -F exit=-EACCES -k access_denied
-a always,exit -F arch=b64 -S open,creat,truncate -F exit=-EPERM -k access_denied

# Hacer la configuración inmutable (requiere reinicio para cambiar reglas)
-e 2

```

> **Nota de Integración:** Los logs generados en `/var/log/audit/audit.log` son densos y crípticos. La mejor práctica (vista en el Capítulo 8 y 10.1) es hacer que el agente de Wazuh o Promtail lea este archivo. Wazuh, por ejemplo, incluye decodificadores nativos para traducir los códigos de syscall de `auditd` a alertas legibles en tu dashboard.

---

### 2. MAC: Controles de Acceso Obligatorio (AppArmor y SELinux)

El modelo de permisos tradicional de Linux se llama **DAC (Discretionary Access Control)**. Se basa en usuarios, grupos y permisos de lectura/escritura/ejecución (el clásico `chmod 755`). El gran problema del DAC es que si un proceso corre como `root`, tiene acceso absoluto al sistema. Si tu servicio de base de datos es explotado, el atacante hereda los permisos del usuario que ejecuta ese servicio.

El **MAC (Mandatory Access Control)** rompe esta regla. Define políticas estrictas a nivel del kernel sobre lo que un *proceso* puede o no puede hacer, independientemente del usuario que lo ejecute.

Dependiendo de la distribución de tu VPS, te encontrarás con uno de estos dos titanes:

#### SELinux (Security-Enhanced Linux)

Estándar en la familia RHEL (AlmaLinux, Rocky Linux, Fedora). Es un sistema de etiquetado extremadamente potente. Cada archivo, proceso y puerto de red recibe un "contexto" (etiqueta). Las políticas de SELinux dictan cómo estos contextos interactúan.

* **Comportamiento:** Si a tu servidor web (contexto `httpd_t`) se le inyecta un script PHP que intenta leer `/etc/shadow` (contexto `shadow_t`), SELinux bloqueará la syscall a nivel del kernel, incluso si los permisos DAC lo permitieran, y generará un log de "AVC Denial".
* **Estados:** Funciona en modo `Enforcing` (bloquea y loguea) o `Permissive` (solo loguea, ideal para crear políticas sin romper servicios).
* **Gestión rápida:** Nunca desactives SELinux (`setenforce 0` de forma permanente es un antipatrón grave). Aprende a leer los logs con `audit2allow` para crear excepciones específicas.

#### AppArmor

Estándar en la familia Debian/Ubuntu y SUSE. En lugar de usar etiquetas complejas, AppArmor confina los programas utilizando rutas de archivos (paths). Es más fácil de implementar para SysAdmins que no tienen experiencia previa con MAC.

* **Comportamiento:** Se asigna un "perfil" a un binario específico (ej. `/usr/sbin/nginx`). El perfil lista exactamente a qué directorios puede acceder y qué capacidades del sistema puede usar. Si el proceso intenta salirse de esa ruta, es bloqueado.
* **Estados:** Funciona en modo `Enforce` o `Complain` (equivalente al Permissive de SELinux).
* **Comprobación:** Usar `aa-status` te mostrará rápidamente cuántos perfiles están cargados y cuántos procesos están confinados actualmente en tu VPS.

### Estrategia en Infraestructuras Resilientes

En una arquitectura moderna gestionada por Ansible (Capítulo 5), tu aproximación a `auditd` y MAC debe ser estandarizada:

1. **Imágenes Golden (Packer):** Asegúrate de que `auditd` y SELinux/AppArmor estén habilitados en modo restrictivo desde la compilación de la imagen.
2. **Ajuste fino:** Usa los modos `Permissive/Complain` durante los despliegues de pre-producción para capturar el comportamiento normal de tus aplicaciones. Usa las herramientas de generación de perfiles (`audit2allow` o `aa-genprof`) para crear reglas precisas.
3. **Inmutabilidad:** Una vez validado, pasa a `Enforcing/Enforce` en producción. Cualquier desviación de este comportamiento generará ruido inmediato en tu SIEM centralizado.

Con el HIDS vigilando las anomalías y el kernel fuertemente auditado y confinado, el radio de explosión (blast radius) de un VPS comprometido se reduce drásticamente, preparando el terreno para la respuesta a incidentes.

## 10.3. Gestión de vulnerabilidades y automatización de parches (Livepatching)

En las secciones anteriores armamos a nuestro VPS con capacidades forenses y de detección (Wazuh, `auditd`). Sin embargo, la mejor respuesta a un incidente es evitar que ocurra. Los atacantes suelen explotar vulnerabilidades públicas conocidas (CVEs) semanas o meses después de que los parches han sido liberados, aprovechándose de la ventana de exposición de servidores desactualizados.

El dilema clásico del SysAdmin es el equilibrio entre la seguridad y la disponibilidad: aplicar un parche requiere reiniciar servicios (o el servidor entero), lo que causa tiempo de inactividad (downtime). En esta sección, abordaremos cómo automatizar la mitigación de vulnerabilidades y cómo aplicar parches críticos al kernel sin perder un solo segundo de *uptime*.

---

### 1. Gestión Continua de Vulnerabilidades

Escanea tu infraestructura antes de que lo haga un atacante. En un entorno de múltiples VPS gestionados con Infraestructura como Código (Capítulo 5), el escaneo debe ser sistemático.

* **Integración con Wazuh:** Si implementaste Wazuh (Sección 10.1), puedes activar el módulo *Vulnerability Detector*. Este módulo cruza el inventario de software de tus agentes con las bases de datos del National Vulnerability Database (NVD) para generar alertas de dependencias obsoletas.
* **Escáneres sin agente (Trivy / Vuls):** Herramientas como Trivy no solo son excelentes para los contenedores (Capítulo 9), sino que pueden escanear el sistema de archivos raíz (`trivy fs /`) para encontrar paquetes de SO e incluso librerías específicas de lenguajes (Node.js, Python, Ruby) que contengan vulnerabilidades conocidas.

**Priorización basada en Riesgo:** No todos los parches son urgentes. Debes priorizar basándote en la métrica CVSS (Common Vulnerability Scoring System) combinada con la exposición real. Un fallo crítico en una librería de compresión de imágenes es urgente si tu servidor web procesa avatares de usuarios, pero tiene baja prioridad en un servidor de base de datos aislado en una red privada (Capítulo 3.4).

---

### 2. Automatización de Parches en el Espacio de Usuario (Userland)

Aplicar actualizaciones manualmente con `apt upgrade` o `dnf update` en decenas de servidores es inmanejable y propenso al error humano. La solución es automatizar la instalación de parches, pero **limitándolo estrictamente a actualizaciones de seguridad** para evitar que nuevas versiones de paquetes rompan compatibilidades.

**En Debian / Ubuntu: `unattended-upgrades`**
Esta herramienta descarga e instala silenciosamente los parches de seguridad. Puedes configurarla editando `/etc/apt/apt.conf.d/50unattended-upgrades`:

```bash
# Solo permitir actualizaciones del repositorio de seguridad
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    // "${distro_id}:${distro_codename}-updates"; // <-- Desactivado para evitar romper servicios
};

# Bloquear la actualización de paquetes críticos que requieren intervención manual
Unattended-Upgrade::Package-Blacklist {
    "nginx";
    "postgresql-*";
};

# Evitar reinicios automáticos por defecto
Unattended-Upgrade::Automatic-Reboot "false";

```

**En RHEL / AlmaLinux / Rocky Linux: `dnf-automatic`**
La filosofía es idéntica. En `/etc/dnf/automatic.conf`, configuras el sistema para descargar y aplicar únicamente actualizaciones de seguridad:

```ini
[commands]
upgrade_type = security
random_sleep = 360 # Desfase para evitar sobrecarga simultánea en el hipervisor
network_online_timeout = 60

[emitters]
emit_via = email

[email]
email_to = soc@tudominio.com

```

---

### 3. El Santo Grial: Kernel Livepatching

El verdadero desafío aparece cuando la vulnerabilidad reside en el Kernel de Linux (por ejemplo, fallos de escalada de privilegios locales como *Dirty COW*). Tradicionalmente, actualizar el kernel requiere un reinicio completo del VPS.

El **Livepatching** soluciona esto parcheando el kernel en memoria mientras el sistema sigue en ejecución. No hay interrupción de conexiones TCP, no hay caída de bases de datos, no hay pérdida de contexto.

#### ¿Cómo funciona el Livepatching?

El Livepatching utiliza mecanismos del kernel (como `ftrace` o `kprobes`) para desviar el flujo de ejecución de una función vulnerable hacia una nueva función parcheada que se carga dinámicamente como un módulo del kernel.

```text
Flujo de ejecución de un programa en el Kernel:

[Llamada a syscall]
        |
        v
+-----------------------+      (Activación de Livepatch)
| Función Original      | <==== Redirección (ftrace) en la primera instrucción
| (Con vulnerabilidad)  | - - - - - - - - - - - - - +
| ...                   |                           |
+-----------------------+                           v
                                        +-----------------------+
                                        | Función Parcheada     |
                                        | (Segura)              |
                                        | ...                   |
                                        +-----------------------+
                                                    |
[Retorno al espacio de usuario] <-------------------+

```

#### Implementaciones Principales

* **Canonical Livepatch Service:** Nativo para Ubuntu LTS. Requiere una cuenta de Ubuntu Pro (gratuita para hasta 5 máquinas personales, de pago para flotas empresariales). Se habilita de manera muy sencilla con un token: `pro enable livepatch`.
* **kpatch / kGraft:** Tecnologías de código abierto desarrolladas por Red Hat y SUSE. Permiten construir tus propios parches en caliente, aunque requieren un profundo conocimiento del kernel.
* **TuxCare (KernelCare):** Una solución comercial altamente popular independiente de la distribución que permite aplicar livepatches en RHEL, Debian, Ubuntu y CentOS sin necesidad de reiniciar, cubriendo vulnerabilidades automáticamente cada pocas horas.

> **Regla de oro del SysAdmin:** El Livepatching no reemplaza el reinicio, solo lo pospone. Te otorga la tranquilidad de asegurar tus sistemas un viernes por la tarde frente a un Zero-Day crítico, permitiéndote programar el reinicio planificado (para aplicar el parche permanente en el disco) durante tu ventana de mantenimiento habitual un domingo por la madrugada.

## 10.4. Análisis forense básico de un VPS comprometido

A pesar de haber implementado firewalls dinámicos (Capítulo 3), monitoreo estricto (Capítulo 8) y sistemas de detección avanzados (Secciones 10.1 a 10.3), la regla de oro de la ciberseguridad es asumir la brecha. Cuando ocurre lo impensable y recibes una alerta crítica confirmando que un VPS ha sido comprometido, el pánico es tu peor enemigo; un procedimiento forense estructurado es tu mejor aliado.

El objetivo del análisis forense básico no es necesariamente llevar a un atacante ante la justicia, sino responder a tres preguntas vitales: **¿Cómo entraron? ¿Qué se llevaron? ¿Dejaron puertas traseras?**

---

### Paso 1: Contención y Preservación (La regla de "No Reiniciar")

El instinto natural de muchos administradores al detectar una intrusión es apagar o reiniciar el servidor. **Esto es un error crítico.** Al reiniciar, destruyes la memoria RAM, los procesos en ejecución, las conexiones de red activas y el estado del sistema virtual (`/proc` y `/sys`), que es exactamente donde residen los rootkits modernos y el malware "fileless" (sin archivos).

**Protocolo de Aislamiento:**
En lugar de apagar el VPS, debes aislarlo utilizando las herramientas del proveedor Cloud (Capítulo 1.4) o del hipervisor, operando *fuera* del sistema operativo comprometido.

```text
ESTADO NORMAL:
[Internet] <== (Tráfico HTTP/SSH) ==> [VPS Comprometido] <== (Tráfico Interno) ==> [BBDD / VPC]

ESTADO DE CONTENCIÓN (Vía Panel Cloud / API):
[Internet] <== (BLOQUEADO) =========x [VPS Comprometido] x== (BLOQUEADO) ========> [BBDD / VPC]
                                           ^
[Tu IP Segura] <== (Solo SSH) =============+

```

1. **Aislar la red:** Cambia el Security Group / Firewall de red a nivel del proveedor Cloud. Bloquea todo el tráfico entrante y saliente, **excepto** una conexión SSH estricta desde la IP de tu estación de trabajo forense. Esto evita que el atacante extraiga datos o reciba comandos de su servidor C2 (Command & Control).
2. **Snapshot Inmediato:** Realiza un snapshot del volumen de bloques (Capítulo 4.4). Esto te proporciona una imagen exacta del disco en el momento del incidente para un análisis offline posterior.

---

### Paso 2: Triaje Volátil (Live Forensics)

Con el VPS aislado pero encendido, debes extraer la información volátil antes de que desaparezca.

> **Advertencia Forense:** En un sistema comprometido, no puedes confiar en los binarios locales. El atacante podría haber reemplazado `ls`, `ps` o `netstat` con versiones modificadas que ocultan sus procesos. Si es posible, ejecuta comandos utilizando binarios estáticos compilados montados desde un volumen externo o descarga un kit de herramientas confiable.

Si debes usar las herramientas locales, extrae la siguiente información y guárdala **en un servidor externo** (nunca en el disco local del servidor comprometido):

**1. Conexiones de red activas y sockets en escucha:**

```bash
# Ver conexiones establecidas y puertos abiertos con sus procesos asociados
ss -tupn > /tmp/conexiones_red.txt
lsof -i -P -n > /tmp/archivos_abiertos_red.txt

```

**2. Procesos extraños en ejecución:**

```bash
# Capturar el árbol de procesos completo con argumentos
ps auxwwf > /tmp/procesos.txt

```

*Qué buscar:* Procesos ejecutándose desde `/tmp`, `/dev/shm` o `/var/tmp` (directorios con permisos de escritura comunes). Procesos disfrazados con nombres legítimos pero rutas incorrectas (ej. `/usr/local/bin/sshd` en lugar de `/usr/sbin/sshd`).

**3. Volcado de memoria (Opcional pero recomendado):**
Si sospechas de malware avanzado, herramientas como `LiME` (Linux Memory Extractor) te permiten volcar la RAM entera a un archivo para analizarla posteriormente con *Volatility*.

---

### Paso 3: Búsqueda de Persistencia y Artefactos (Análisis No Volátil)

Una vez capturada la memoria y los datos en vivo, los atacantes buscarán la manera de sobrevivir a un reinicio. Debes buscar los mecanismos de persistencia típicos en Linux.

**1. Tareas programadas (Cron):**
Revisa no solo los cronjobs de root, sino los de usuarios de aplicaciones (ej. `www-data` o `nginx`).

```bash
cat /etc/crontab
ls -la /etc/cron.*
cat /var/spool/cron/crontabs/*

```

**2. Servicios Systemd ocultos:**
Los atacantes modernos crean temporizadores o servicios en systemd para mantener acceso.

```bash
# Buscar servicios modificados recientemente
find /etc/systemd/system -type f -mtime -7

```

**3. Llaves SSH inyectadas:**
Revisa todos los archivos `authorized_keys`. Un atacante suele añadir su propia llave pública para evitar tener que vulnerar el sistema dos veces. (Referencia: Capítulo 3.1).

```bash
find / -name "authorized_keys" -exec cat {} \; -print

```

**4. Verificación de integridad de paquetes:**
¿El atacante modificó binarios legítimos? Si estás en una distribución basada en Debian/Ubuntu, puedes usar `debsums`. En RHEL/AlmaLinux, usa `rpm`.

```bash
# Debian/Ubuntu (requiere instalar debsums previamente)
debsums -c 

# RHEL/AlmaLinux
rpm -Va

```

---

### Paso 4: El Valor Incalculable de los Logs Centralizados

Si el atacante obtuvo privilegios de `root`, su siguiente paso garantizado fue ejecutar `rm -rf /var/log/*` o editar `/var/log/auth.log` para borrar sus huellas.

Aquí es donde la arquitectura que construimos en el **Capítulo 8** te salva la vida. El análisis forense real no se hace en el VPS comprometido, se hace en tu servidor centralizado de logs (Loki, ELK) o en el Manager de Wazuh (Capítulo 10.1).

En tus logs centralizados (que el atacante no pudo borrar porque son de solo escritura desde la perspectiva del agente), debes buscar:

1. **Alertas de `auditd` (Capítulo 10.2):** Buscar `execve` (comandos ejecutados) en el marco de tiempo de la brecha.
2. **Alertas FIM de Wazuh:** ¿Qué archivo cambió primero? Esto suele indicar el punto de entrada (ej. un plugin de WordPress vulnerable que fue modificado).
3. **Logs de Proxy Inverso/WAF:** Si el ataque fue web, buscar en los logs de Nginx/Traefik el payload exacto que explotó la vulnerabilidad.

---

### La Regla de la Erradicación: Inmutabilidad al Rescate

Una vez que has identificado cómo entraron (el vector de ataque) y qué hicieron, llega la fase de erradicación.

**Jamás intentes "limpiar" un servidor comprometido para devolverlo a producción.** Es imposible garantizar con un 100% de certeza que has eliminado todos los rootkits.

Gracias a las prácticas de **Infraestructura como Código (Capítulo 5)**, la respuesta correcta es:

1. Extraer los datos válidos (bases de datos, archivos de usuarios).
2. Parchear la vulnerabilidad en tu código de configuración (Ansible) o en la imagen base (Packer).
3. **Destruir (Terminar) el VPS comprometido.**
4. Desplegar un VPS completamente nuevo, limpio y parcheado usando tus pipelines automatizados.

Este enfoque transforma un incidente catastrófico en un simple ejercicio de recolección de datos y redespliegue, demostrando la verdadera resiliencia de una infraestructura moderna.

## Epílogo: El SysAdmin Ante la Infraestructura Resiliente

Has recorrido el camino desde la provisión de una instancia aislada hasta la orquestación de entornos seguros y automatizados. La administración de sistemas modernos no reside en el mantenimiento reactivo, sino en la construcción de arquitecturas capaces de resistir el fallo y la intrusión por diseño. Al dominar la Infraestructura como Código, la observabilidad y la defensa profunda, dejas de ser un apagafuegos para convertirte en un arquitecto de sistemas resilientes. El VPS es ahora solo una pieza de un engranaje superior que controlas con precisión. Mantén tus imágenes actualizadas, tus logs centralizados y tu curiosidad intacta. El despliegue continuo apenas comienza.
