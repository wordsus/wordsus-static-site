La gestión manual de servidores es el mayor enemigo de la escalabilidad y la seguridad. En este capítulo, transformamos la administración de sistemas en ingeniería de software aplicada. Dejamos atrás la fragilidad de los servidores "copo de nieve" para adoptar el paradigma de la **infraestructura inmutable**, donde cada cambio es predecible y reversible. A través de **Terraform**, aprenderás a orquestar redes y recursos de cálculo de forma declarativa, mientras que con **Ansible** automatizaremos la configuración interna y la protección de secretos. El objetivo es claro: sustituir la intervención humana por procesos repetibles, versionables y altamente resilientes.

## 5.1. Introducción al paradigma de infraestructura inmutable

Durante décadas, la administración de sistemas se basó en un enfoque artesanal. Desplegábamos un servidor, nos conectábamos por SSH, instalábamos paquetes, modificábamos archivos de configuración y lo manteníamos vivo aplicando parches a lo largo del tiempo. Este modelo, conocido como **infraestructura mutable**, funciona hasta que la escala o la necesidad de alta disponibilidad rompen su frágil equilibrio.

El paradigma de la **infraestructura inmutable** propone un cambio radical en esta filosofía: **una vez que un servidor es instanciado, nunca se modifica**. Si se requiere una actualización de software, un parche de seguridad o un cambio de configuración, no se actualiza el servidor existente; se construye una nueva imagen con los cambios aplicados, se despliega una nueva instancia a partir de ella y la antigua se destruye.

---

### El problema de la mutabilidad: Deriva y Copos de Nieve

Para entender por qué la inmutabilidad es necesaria cuando pasamos de instancias aisladas a infraestructuras resilientes, primero debemos comprender los problemas inherentes al modelo tradicional:

* **Deriva de configuración (Configuration Drift):** Con el tiempo, los servidores en un clúster sufren pequeñas modificaciones (un `sysctl` ajustado rápidamente para mitigar un incidente, un paquete actualizado manualmente, un certificado renovado de forma no estándar). Eventualmente, el entorno de producción deja de coincidir con el entorno de desarrollo y con la documentación.
* **Servidores "Copo de Nieve" (Snowflake Servers):** Como resultado de la deriva, el servidor se vuelve único, irrepetible y extremadamente delicado. Nadie en el equipo sabe exactamente cómo reconstruirlo desde cero si el hardware subyacente falla. El miedo a reiniciar o actualizar estos servidores paraliza las operaciones.

> El clásico adagio DevOps de **"Mascotas vs. Ganado" (Pets vs. Cattle)** resume esta transición. En el modelo mutable, los servidores son mascotas: tienen nombre, los cuidamos cuando enferman y lloramos si mueren. En la infraestructura inmutable, los servidores son ganado: tienen números, y si uno "enferma", simplemente lo reemplazamos por uno nuevo.

---

### Diagrama del flujo Inmutable vs. Mutable

Para ilustrar la diferencia en el ciclo de vida de una actualización, observemos el siguiente esquema en texto plano:

```text
[ PARADIGMA MUTABLE ]
Riesgo de "Configuration Drift" e inconsistencias.

(v1.0) VPS Activo --(SSH / apt upgrade)--> (v1.1) VPS Activo --(Ajuste manual)--> (v1.1.?) Snowflake ❄️
                                                                                    (Estado desconocido)

=======================================================================================================

[ PARADIGMA INMUTABLE ]
Predecible, versionable y fácilmente replicable.

Repositorio Git (Código v1.0)
       |
       v
[ Packer hornea imagen ] ---> [ Imagen de SO v1.0 ] ---> [ Terraform despliega ] ---> VPS Activo v1.0
                                                                                            |
Repositorio Git (Código v1.1)                                                               | (Tráfico desviado)
       |                                                                                    v (VPS v1.0 Destruido)
       v                                                                                    
[ Packer hornea imagen ] ---> [ Imagen de SO v1.1 ] ---> [ Terraform despliega ] ---> VPS Activo v1.1

```

---

### Principios Fundamentales del Paradigma Inmutable

Adoptar este enfoque requiere un cambio tanto cultural como técnico. Se asienta sobre los siguientes pilares:

1. **Construcción de artefactos previos al despliegue (Baking):** Como vimos en el Capítulo 2, herramientas como Packer son cruciales aquí. En lugar de arrancar un VPS base y usar `cloud-init` o un script para instalar la aplicación (lo que alarga el tiempo de inicio y depende de repositorios externos en tiempo de ejecución), todo el software y la configuración se "hornean" en una *Golden Image*.
2. **Desacoplamiento estricto del estado:** Si vamos a destruir un VPS cada vez que actualizamos la configuración de Nginx, los datos persistentes no pueden residir en el disco local de la instancia. Este paradigma **obliga** a utilizar las estrategias de almacenamiento del Capítulo 4 (Volúmenes de bloques, bases de datos externas, Object Storage). El VPS se convierte en una unidad de cómputo efímera, separada de los datos.
3. **Auditoría y control de versiones:** La infraestructura se define en código (IaC). Si quieres saber qué está corriendo en producción, no ejecutas `cat /etc/nginx/nginx.conf` en el servidor; miras la rama `main` en tu repositorio de Git.

---

### Beneficios tácticos para el SysAdmin

* **Rollbacks instantáneos y garantizados:** Si la versión 2.0 de tu infraestructura tiene un bug catastrófico, el rollback no consiste en intentar desinstalar paquetes o revertir configuraciones (un proceso propenso a errores). Simplemente le indicas a tu orquestador que vuelva a desplegar las instancias utilizando la *Golden Image* de la versión 1.9.
* **Consistencia absoluta entre entornos:** La imagen que pruebas en *Staging* es, bit a bit, la misma imagen que se despliega en Producción. Las variables de entorno o los *Instance Metadata Services* (sección 2.4) inyectan las diferencias (como credenciales de bases de datos), pero el sistema base es idéntico.
* **Escalado predecible:** Al auto-escalar, levantar un nuevo nodo toma solo los segundos que tarda el hipervisor del proveedor en encender la imagen pre-horneada, sin esperar minutos a que se descarguen e instalen dependencias.

### Preparando el terreno para la Infraestructura como Código (IaC)

Entender la inmutabilidad es el paso previo necesario antes de ensuciarnos las manos con las herramientas de los próximos apartados.

En una arquitectura moderna, **Packer** construye la plantilla inmutable, **Terraform** (sección 5.2) se encarga de definir cuántas instancias necesitamos y de destruir las viejas para dar paso a las nuevas, y **Ansible** (sección 5.4) deja de ser una herramienta que se ejecuta constantemente contra servidores vivos en producción (lo que fomentaría la mutabilidad), para convertirse en el motor que aprovisiona internamente la imagen *mientras Packer la está construyendo*.

Adoptar la inmutabilidad requiere disciplina al principio: la tentación de entrar por SSH para "arreglar un problemita rápido" será fuerte. Sin embargo, al dominar este paradigma, se pasa de administrar servidores frágiles a gobernar plataformas verdaderamente resilientes.

## 5.2. Despliegue de infraestructura de red y cálculo con Terraform

En la sección anterior establecimos un principio fundamental: en una infraestructura resiliente, los servidores son entidades efímeras y predecibles (ganado, no mascotas). Aprendimos que herramientas como Packer (sección 2.3) nos permiten "hornear" *Golden Images*. Sin embargo, tener una imagen perfecta almacenada en nuestro proveedor no sirve de nada si el proceso de aprovisionar la red, instanciar los servidores y configurar los firewalls sigue siendo un proceso manual y propenso a errores.

Aquí es donde entra **Terraform**, convirtiéndose en el director de orquesta que traduce nuestras intenciones en llamadas a las APIs de los proveedores Cloud (sección 1.4).

---

### El Enfoque Declarativo (HCL)

A diferencia de los scripts de Bash tradicionales, que son **imperativos** (dictan el paso a paso: "ejecuta este comando de `curl`, luego espera 5 segundos, luego ejecuta este otro"), Terraform es **declarativo**. Utiliza su propio lenguaje, HashiCorp Configuration Language (HCL), para describir el *estado final deseado* de la infraestructura.

Tú declaras: *"Quiero una red privada, tres VPS de 4GB de RAM usando mi Golden Image, y un balanceador de carga"*. Terraform se encarga de calcular las dependencias, determinar en qué orden debe crear los recursos y ejecutar las llamadas a la API necesarias para lograr ese estado. Si cambias la declaración a *"Quiero cinco VPS"*, Terraform no recreará los tres primeros; entenderá el diferencial y simplemente instanciará dos más.

---

### 1. Desplegando la Infraestructura de Red (VPC)

Antes de levantar cualquier instancia de cálculo, debemos preparar el terreno. Como discutimos en el Capítulo 3, aislar nuestros recursos en una VPC (Virtual Private Cloud) es el primer paso para un hardening efectivo.

En Terraform, esto se define mediante bloques `resource`. A continuación, un ejemplo agnóstico (basado en la sintaxis típica de proveedores de VPS como DigitalOcean o Hetzner) para definir una red privada aislada:

```hcl
# Definición de la red privada (VPC)
resource "proveedor_vpc" "red_produccion" {
  name     = "vpc-produccion"
  region   = "fra1"
  ip_range = "10.10.10.0/24"
}

# Definición de reglas de Firewall Perimetral
resource "proveedor_firewall" "reglas_web" {
  name = "fw-web-estricto"

  # Permitir tráfico HTTP/HTTPS solo desde el exterior
  inbound_rule {
    protocol   = "tcp"
    port_range = "80"
    sources    = ["0.0.0.0/0", "::/0"]
  }
  
  inbound_rule {
    protocol   = "tcp"
    port_range = "443"
    sources    = ["0.0.0.0/0", "::/0"]
  }

  # SSH restringido solo a la IP de la VPN de administración (Sección 6.2)
  inbound_rule {
    protocol   = "tcp"
    port_range = "22"
    sources    = ["198.51.100.45/32"] 
  }
}

```

Al separar la red del cálculo, garantizamos que, aunque destruyamos y recreemos nuestros VPS decenas de veces al día, el enrutamiento interno y las políticas de seguridad perimetral se mantengan constantes e inmutables.

---

### 2. Desplegando la Infraestructura de Cálculo (VPS)

Con la red lista, procedemos a instanciar los servidores. El verdadero poder de Terraform en el paradigma inmutable brilla cuando usamos bloques `data` para localizar automáticamente la última versión de nuestra *Golden Image* creada por Packer, sin tener que copiar y pegar IDs manualmente.

```hcl
# 1. Buscamos la última imagen construida por Packer
data "proveedor_image" "golden_image_app" {
  name_regex  = "^app-golden-image-v.*"
  most_recent = true
}

# 2. Desplegamos un clúster de VPS usando esa imagen
resource "proveedor_instancia_vps" "nodos_web" {
  count    = 3 # Terraform creará exactamente 3 instancias idénticas
  
  name     = "web-node-${count.index + 1}" # Genera web-node-1, web-node-2, web-node-3
  image    = data.proveedor_image.golden_image_app.id
  region   = "fra1"
  size     = "2vcpu-4gb"
  
  # Conectamos las instancias a la VPC y al Firewall creados anteriormente
  vpc_id       = resource.proveedor_vpc.red_produccion.id
  firewall_ids = [resource.proveedor_firewall.reglas_web.id]
  
  # Inyectamos la llave pública SSH del equipo de SysAdmins (Sección 3.1)
  ssh_keys = ["ssh-ed25519 AAAAC3NzaC1..."]
}

```

Observa la variable `count = 3`. Esta simple línea reemplaza docenas de clics en un panel de control. Si nuestro monitoreo (Capítulo 8) indica que necesitamos más capacidad, basta con cambiar ese número a `5` y Terraform hará el resto.

---

### El Flujo de Trabajo: Planificar antes de Ejecutar

Una regla de oro para cualquier SysAdmin que adopte IaC es nunca confiar ciegamente en el código. Terraform mitiga el riesgo de destrucción accidental mediante la separación de la planificación y la ejecución:

1. `terraform init`: Inicializa el directorio de trabajo y descarga los plugins necesarios para comunicarse con tu proveedor de VPS.
2. `terraform plan`: **El salvavidas del SysAdmin.** Terraform compara tu código HCL con lo que realmente existe en la nube y genera un "plan de ejecución". Te mostrará un *diff* detallado (con signos `+` verdes para adiciones, `-` rojos para destrucciones y `~` amarillos para modificaciones) de exactamente qué va a hacer.
3. `terraform apply`: Solo después de revisar minuciosamente el plan generado en el paso anterior, aplicas los cambios.

### Resumen del ciclo de vida

En la infraestructura inmutable que estamos diseñando, Terraform es el puente entre el código estático y los servidores reales. Packer crea la plantilla, Terraform prepara la red segura y lanza las instancias. Sin embargo, para que Terraform sepa qué destruir y qué mantener en futuras ejecuciones, necesita recordar qué fue lo que creó en primer lugar. Este "recuerdo" introduce uno de los conceptos más críticos y delicados de la herramienta, el cual abordaremos en el siguiente apartado: la gestión del estado.

## 5.3. Gestión del estado de Terraform y bloqueos de backend

En el apartado anterior, vimos cómo Terraform utiliza archivos HCL para declarar la infraestructura de forma descriptiva. Sin embargo, Terraform no consulta la API de tu proveedor cada vez que quieres hacer un cambio para "adivinar" qué existe. En su lugar, utiliza una fuente de verdad propia llamada **Estado (State)**.

### El archivo `terraform.tfstate`

Cuando ejecutas un `terraform apply`, Terraform crea un archivo JSON llamado `terraform.tfstate`. Este archivo es el mapa que vincula tus declaraciones de código con los IDs reales de los recursos en la nube.

* **Mapeo de identidades:** Si en tu código tienes un recurso llamado `"servidor_web"`, el estado guarda que ese nombre lógico corresponde al ID físico `vps_987654` en la infraestructura del proveedor.
* **Metadatos de rendimiento:** Almacena atributos para evitar llamadas innecesarias a la API (actúa como una caché de la realidad de tus VPS).
* **Seguimiento de dependencias:** Sabe qué recursos deben destruirse o crearse antes que otros basándose en el historial de despliegue.

> **Advertencia de Seguridad:** El archivo de estado contiene **toda** la información de tu infraestructura en texto plano, incluyendo contraseñas de bases de datos, llaves privadas o tokens iniciales. **Nunca** debes subir el archivo `.tfstate` a un repositorio de Git público o compartido sin cifrar.

---

### El problema del estado local: Race Conditions y Desincronización

Si trabajas solo, el archivo local funciona bien. Pero en un entorno de "Infraestructuras Resilientes" donde varios SysAdmins colaboran, el estado local se convierte en un peligro:

1. **SysAdmin A** crea un balanceador de carga; su archivo `.tfstate` local se actualiza.
2. **SysAdmin B** intenta añadir un VPS, pero su archivo local no sabe que el balanceador existe.
3. Terraform, al ver que el código de B tiene un balanceador pero su estado no, intentará crearlo de nuevo, causando conflictos o duplicidad de costes.

Para solucionar esto, pasamos de un **Local Backend** a un **Remote Backend**.

---

### Remote Backends y State Locking (Bloqueo de Estado)

Un *backend* determina dónde se almacena el estado. Los backends remotos (como Amazon S3, Google Cloud Storage, Terraform Cloud o sistemas basados en HTTP) ofrecen dos ventajas fundamentales:

1. **Almacenamiento compartido:** Todos los miembros del equipo apuntan a la misma fuente de verdad centralizada.
2. **Bloqueo de estado (State Locking):** Es el mecanismo que impide que dos personas modifiquen la infraestructura al mismo tiempo. Si el SysAdmin A lanza un `apply`, Terraform "bloquea" el archivo. Si el SysAdmin B intenta lanzar otro comando, recibirá un error indicando que el estado está ocupado.

#### Ejemplo de configuración (S3 con bloqueo mediante DynamoDB)

Para proveedores que no soportan bloqueo nativo en sus buckets de almacenamiento (como S3), se suele usar una base de datos auxiliar para gestionar los "locks":

```hcl
terraform {
  backend "s3" {
    bucket         = "infra-resiliente-terraform-state"
    key            = "produccion/vps-cluster.tfstate"
    region         = "us-east-1"
    
    # DynamoDB se encarga de gestionar quién tiene el permiso de escritura
    dynamodb_table = "terraform-lock-table"
    encrypt        = true
  }
}

```

---

### Buenas prácticas para la gestión del estado

* **Aislamiento por entorno:** No uses el mismo archivo de estado para *Staging* y *Producción*. Si el estado se corrompe en una prueba, no querrás que afecte a tus servidores productivos.
* **Habilitar Versionado:** En backends como S3, habilita el versionado del bucket. Si alguien comete un error catastrófico (como un `terraform state rm` accidental), puedes recuperar la versión anterior del JSON del estado.
* **Reconciliación (Drift):** Si alguien hace un cambio manual en el panel de control del VPS (fuera de Terraform), se produce una "deriva" (drift). El comando `terraform plan` detectará esta diferencia comparando el Estado con la Realidad de la nube, permitiéndote volver al estado deseado.

Comprender el ciclo de vida del estado es lo que diferencia a un usuario ocasional de Terraform de un SysAdmin capaz de gestionar infraestructuras críticas sin causar colisiones de configuración.

## 5.4. Gestión de la configuración interna del VPS con Ansible (Playbooks, Roles, Ansible Vault)

Si Terraform (5.2) es el arquitecto que construye el edificio y traza las calles (redes y VPS), **Ansible** es el diseñador de interiores. Se encarga de instalar el software, configurar los demonios, establecer los permisos y dejar el sistema operativo listo para ejecutar nuestras aplicaciones.

Sin embargo, debemos hacer una aclaración vital para mantener la coherencia con nuestro diseño. En el modelo clásico (mutable), Ansible se conectaba por SSH a los servidores de producción para aplicar cambios. **En el paradigma de infraestructura inmutable (5.1), el rol de Ansible cambia:** ya no lo ejecutamos contra la flota en producción, sino que lo utilizamos como el **provisionador interno de Packer** (Capítulo 2) para "hornear" la configuración dentro de nuestra *Golden Image*.

Ansible brilla en este ecosistema por ser *Agentless* (no requiere instalar un agente en el servidor destino, solo necesita Python y acceso SSH) y por su naturaleza declarativa e **idempotente** (si le dices que un servicio debe estar encendido, y ya lo está, Ansible no hace nada).

---

### 1. Playbooks: El manifiesto de configuración

Los Playbooks son archivos escritos en YAML que describen las tareas que deben ejecutarse en la máquina destino. Un Playbook está compuesto por uno o más "Plays" (jugadas), que mapean un grupo de hosts con una lista de tareas.

Imaginemos que Packer levanta una instancia temporal y llama a este Playbook de Ansible para preparar una imagen de un servidor web seguro:

```yaml
---
- name: Provisión de Golden Image para Servidor Web
  hosts: all # En el contexto de Packer, 'all' es la instancia temporal
  become: yes # Ejecutar tareas con privilegios de sudo/root

  tasks:
    - name: Asegurar que el sistema base está actualizado
      apt:
        update_cache: yes
        upgrade: dist

    - name: Instalar Nginx y dependencias de seguridad
      apt:
        name:
          - nginx
          - fail2ban
          - ufw
        state: present

    - name: Copiar configuración optimizada de Nginx
      template:
        src: ./templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
      notify: Reiniciar Nginx

  handlers:
    - name: Reiniciar Nginx
      service:
        name: nginx
        state: restarted

```

**Conceptos clave en este Playbook:**

* **Módulos (`apt`, `template`, `service`):** Son las herramientas de Ansible. En lugar de escribir comandos de Bash (`apt-get install -y nginx`), usamos módulos que garantizan la idempotencia.
* **Templates (Plantillas Jinja2):** El módulo `template` permite inyectar variables dinámicas en archivos de configuración (por ejemplo, ajustar el número de *worker_processes* de Nginx según los núcleos del VPS).
* **Handlers:** Son tareas que solo se ejecutan si son notificadas por un cambio. Si el archivo `nginx.conf` no ha cambiado, el handler "Reiniciar Nginx" se omite, ahorrando tiempo.

---

### 2. Roles: Escalando y estructurando el código

A medida que tu infraestructura crece, tener un Playbook gigante de 1000 líneas se vuelve inmanejable. Aquí entran los **Roles**.

Un Rol es una forma de empaquetar de forma estructurada e independiente tareas, variables, archivos y plantillas relacionados con un propósito específico (por ejemplo, un rol para "Hardening SSH", otro para "Nginx", otro para "Agentes de Monitoreo").

El paso de un Playbook monolítico a Roles se visualiza en la siguiente estructura de directorios:

```text
ansible-project/
├── site.yml                 # Playbook principal que invoca los roles
├── environments/
│   └── prod/
│       └── group_vars/      # Variables específicas del entorno
│           └── all.yml
└── roles/
    ├── common/              # Rol: Instalación de utilidades base y NTP
    │   ├── tasks/main.yml
    │   └── handlers/main.yml
    ├── security/            # Rol: Fail2ban, SSHD config (Capítulo 3)
    │   ├── tasks/main.yml
    │   ├── templates/sshd_config.j2
    │   └── defaults/main.yml
    └── webserver/           # Rol: Nginx y configuración de sitios
        ├── tasks/main.yml
        └── files/index.html

```

Tu archivo `site.yml` ahora será extremadamente limpio:

```yaml
---
- name: Construir Imagen Base
  hosts: all
  become: yes
  roles:
    - common
    - security
    - webserver

```

> **Tip para SysAdmins:** Antes de escribir un rol desde cero, revisa **Ansible Galaxy** (el repositorio oficial de la comunidad). Es probable que alguien ya haya escrito y optimizado un rol para instalar Docker o Prometheus.

---

### 3. Ansible Vault: Protegiendo los secretos

Si toda tu infraestructura está definida como código (IaC) y versionada en Git, surge un problema crítico: ¿Dónde guardamos las contraseñas de las bases de datos, los tokens de las APIs o los certificados SSL privados? **Nunca** en texto plano.

**Ansible Vault** es una herramienta integrada que cifra variables y archivos sensibles utilizando AES-256.

Puedes cifrar un archivo de variables entero:

```bash
# Crea un archivo cifrado nuevo y solicita una contraseña
ansible-vault create roles/webserver/vars/secrets.yml

# Cifra un archivo existente
ansible-vault encrypt environments/prod/group_vars/db_passwords.yml

```

O, de forma mucho más elegante, cifrar solo cadenas específicas dentro de un archivo YAML convencional (String encryption):

```yaml
# archivo de variables normal: group_vars/all.yml
api_endpoint: "https://api.miproveedor.com/v1"
db_user: "app_produccion"

# La contraseña está cifrada, el resto del archivo es legible en Git
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          36663539656461326466316238383236353633653139366431666133376262333633623737383233
          3637313038663866383637653664323265663737346162630a656635663562626535316362636263
          ...

```

Cuando Packer ejecuta Ansible, simplemente le pasas la contraseña del Vault (a través de una variable de entorno en tu pipeline de CI/CD o un archivo temporal local) y Ansible descifrará los secretos en memoria durante el tiempo de ejecución para inyectarlos en la imagen.

---

### Resumen del Capítulo 5: La Trinidad de la Infraestructura Inmutable

Con este apartado cerramos el círculo de la Automatización e Infraestructura como Código (IaC). Para lograr despliegues predecibles y resilientes, hemos establecido un flujo de trabajo profesional:

1. **Ansible** escribe el "cómo": define el estado interno, instala paquetes y asegura los servicios.
2. **Packer** (sección 2.3) ejecuta Ansible en una máquina temporal, toma una "fotografía" y genera una *Golden Image* inmutable.
3. **Terraform** (sección 5.2 y 5.3) toma esa imagen, aprovisiona la red, ajusta los firewalls y despliega un clúster de VPS garantizando que la realidad de la nube coincida con el código.

Al dominar esta trilogía, dejamos de administrar servidores individuales y pasamos a administrar *sistemas enteros*, preparando el terreno para interconectarlos de forma segura, como veremos en el **Capítulo 6: Redes Superpuestas y VPNs**.
