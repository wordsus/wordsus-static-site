La administración moderna de WordPress exige abandonar la gestión manual para adoptar la **Cultura DevOps**. En este capítulo, transformamos la instalación tradicional en una infraestructura inmutable y escalable. Exploraremos cómo **WP-CLI** optimiza tareas masivas y cómo la **Infraestructura como Código (IaC)** con Terraform y Ansible garantiza entornos replicables. Elevaremos el stack hacia la alta disponibilidad mediante la **dockerización** con imágenes ligeras Alpine y la orquestación en **Kubernetes**. Finalmente, implementaremos **pipelines de CI/CD** para lograr despliegues *zero-downtime*, asegurando que cada actualización de código sea invisible para el usuario y segura para el servidor.

## **8.1 WP-CLI (WordPress Command Line Interface): Gestión de plugins, temas, regeneración de caché y operaciones masivas desde la terminal**

En entornos de alto rendimiento y alta disponibilidad, depender de la interfaz gráfica de WordPress (wp-admin) para tareas administrativas es ineficiente y, a menudo, arriesgado. La ejecución de procesos pesados a través del navegador web está sujeta a los límites de tiempo de espera y memoria impuestos por el servidor web y PHP-FPM (como vimos en los Capítulos 2 y 3 con `max_execution_time` y los buffers de NGINX).

Aquí es donde **WP-CLI** se convierte en una herramienta indispensable para el SysAdmin y el ingeniero DevOps. WP-CLI permite interactuar con el *Core* de WordPress, la base de datos y la caché directamente desde la terminal, utilizando PHP en modo CLI.

### **Diferencia de Ejecución: Web vs. CLI**

El siguiente diagrama en texto plano ilustra por qué WP-CLI es superior para tareas masivas y de mantenimiento:

```text
[Ejecución vía Web]
Navegador ---> NGINX ---> PHP-FPM (Límites estrictos) ---> WP Core ---> [Riesgo de Error 502/504 por Timeout]

[Ejecución vía WP-CLI]
Terminal/SSH ---> PHP CLI (Límites relajados/ilimitados) ---> WP Core ---> [Ejecución estable, ideal para operaciones masivas]

```

Al operar fuera del ciclo de vida de una petición HTTP convencional, WP-CLI elimina la sobrecarga del servidor web, previene cortes abruptos en medio de una actualización y permite la automatización mediante *scripts* bash o herramientas de provisionamiento (como Ansible, que veremos en la sección 8.2).

---

### **1. Gestión Ágil de Plugins y Temas**

Mantener los componentes actualizados es vital tanto para el rendimiento como para la seguridad. WP-CLI permite realizar estas operaciones en segundos.

* **Instalación y activación concurrente:**

```bash
wp plugin install query-monitor redis-cache --activate

```

* **Actualización masiva de todo el ecosistema:**
En lugar de arriesgarse a un *timeout* en el panel de control al actualizar múltiples plugins, el proceso se vuelve seguro:

```bash
wp plugin update --all
wp theme update --all
wp core update

```

* **El salvavidas: Bypassing de código problemático:**
Si una actualización o un plugin mal programado provoca un *Fatal Error* (Pantalla Blanca de la Muerte), wp-admin quedará inaccesible. Con WP-CLI, puedes aislar y desactivar el problema saltándote la carga del código conflictivo:

```bash
# Lista los plugins saltándose la ejecución de los mismos para evitar el error fatal
wp plugin list --skip-plugins --skip-themes

# Desactiva el plugin causante
wp plugin deactivate nombre-del-plugin-conflictivo

```

---

### **2. Manipulación y Regeneración de Caché**

Como analizamos en el Capítulo 5, la arquitectura de caché multicapa es el corazón del rendimiento en WordPress. WP-CLI expone comandos directos para invalidar y reconstruir estos almacenes sin necesidad de interfaces gráficas.

* **Vaciado de la Object Cache Persistente:**
Si estás utilizando Redis o Memcached a través del *drop-in* `object-cache.php`, el siguiente comando purgará los datos directamente en el almacén en memoria:

```bash
wp cache flush

```

* **Gestión de Transients:**
Los *transients* caducados o corruptos pueden inflar la tabla `wp_options` (problema de *autoload* del Capítulo 1). Puedes limpiarlos proactivamente:

```bash
wp transient delete --all

```

* **Precarga de Caché (Cache Warming):**
Combinado con herramientas de *Page Caching* (FastCGI o Varnish), puedes usar WP-CLI para iterar sobre las URLs y generar la caché antes de que los usuarios reales lleguen al sitio:

```bash
for url in $(wp post list --post_type=post --field=url); do curl -s -o /dev/null $url; done

```

---

### **3. Operaciones Masivas y de Alto Consumo**

Ciertas tareas son simplemente inviables desde el panel de administración en sitios con miles de entradas o gigabytes de medios.

**A. Búsqueda y Reemplazo en Base de Datos (`search-replace`)**
Crucial para migraciones de dominio o transiciones de HTTP a HTTPS. WP-CLI maneja la serialización de PHP automáticamente, algo que las consultas SQL crudas (`UPDATE wp_posts...`) romperían.

```bash
# El flag --dry-run permite simular los cambios antes de aplicarlos en producción
wp search-replace 'http://dominio-viejo.com' 'https://dominio-nuevo.com' --dry-run

# Ejecución real saltando la caché de objetos para evitar inconsistencias
wp search-replace 'http://dominio-viejo.com' 'https://dominio-nuevo.com' --skip-columns=guid --skip-object-cache

```

**B. Regeneración de Miniaturas (`media regenerate`)**
Al cambiar de tema o modificar los tamaños de imágenes, WordPress necesita recortar nuevamente las imágenes originales. En un sitio grande, esto es una tarea intensiva de CPU.

```bash
# Regenera imágenes mostrando una barra de progreso limpia y saltando las ya procesadas
wp media regenerate --skip-delete --only-missing

```

---

### **4. Integración con el Sistema Operativo: El Cron Real**

En la sección 10.5 profundizaremos en el impacto negativo del WP-Cron virtual (`wp-cron.php`). El estándar en infraestructura de alto rendimiento es deshabilitar la ejecución de cron basada en el tráfico web (`DISABLE_WP_CRON`) y delegarla a un Cron Job del sistema operativo utilizando WP-CLI.

Esto garantiza que las tareas programadas (publicación de posts, copias de seguridad, limpieza de transients) se ejecuten con precisión temporal, sin penalizar el Tiempo de Respuesta (TTFB) del primer visitante que "despierta" el cron virtual.

**Ejemplo de entrada en crontab (`crontab -e`):**

```bash
# Ejecutar los eventos pendientes de WordPress cada 5 minutos
*/5 * * * * cd /var/www/wordpress && wp cron event run --due-now > /dev/null 2>&1

```

En resumen, WP-CLI es el puente que permite a WordPress integrarse de manera fluida en metodologías de infraestructura moderna. Transforma un CMS diseñado para ser gestionado visualmente en una aplicación completamente manipulable a través de código y terminal, abriendo la puerta a despliegues automatizados y tuberías de CI/CD sin tiempo de inactividad (*Zero-Downtime*).

## **8.2 Infraestructura como Código (IaC): Provisionamiento de entornos optimizados para WP con Ansible y Terraform**

En los capítulos anteriores hemos definido configuraciones de alta precisión: afinación del kernel, directivas avanzadas de NGINX, cálculos estrictos para PHP-FPM y arquitecturas de caché multicapa. Sin embargo, aplicar todas estas configuraciones manualmente mediante SSH en cada servidor (creando lo que en la industria se conoce como "servidores copo de nieve" o *snowflake servers*) es insostenible en entornos de Alta Disponibilidad (HA). Un error humano al teclear un valor en `php.ini` o `nginx.conf` en un solo nodo puede desestabilizar todo el clúster.

La solución es la **Infraestructura como Código (IaC)**. Al codificar nuestra infraestructura, obtenemos entornos predecibles, auditables, versionables (mediante Git) y 100% reproducibles. Para lograr esto en un stack de WordPress, el estándar de la industria combina dos herramientas que, aunque a menudo se confunden, tienen propósitos complementarios: **Terraform** y **Ansible**.

### **El Flujo de Trabajo: Orquestación vs. Configuración**

El siguiente diagrama ilustra cómo interactúan ambas herramientas para desplegar la arquitectura distribuida que diseñamos en el Capítulo 7:

```text
[Repositorio Git (Código IaC)]
       |
       |-- 1. Ejecuta: `terraform apply`
       |
       v
[TERRAFORM] (Provisionamiento del Hardware y Red)
  |-- Crea VPC, Subredes y Security Groups.
  |-- Levanta Load Balancer (AWS ALB / HAProxy).
  |-- Despliega instancias de cómputo vacías (Nodos Web).
  |-- Provisiona bases de datos gestionadas (Amazon Aurora) y Caché (Redis/ElastiCache).
       |
       |-- 2. Devuelve: Direcciones IP dinámicas de los nodos creados.
       |
       v
[ANSIBLE] (Gestión de la Configuración del Software)
  |-- Conecta vía SSH a los Nodos Web.
  |-- Aplica Tuning de Sysctl (Cap. 2).
  |-- Instala y configura NGINX + PHP-FPM (Cap. 3 y 5).
  |-- Monta el sistema de archivos distribuido (NFS/EFS) (Cap. 7).
  |-- Usa WP-CLI para instalar WordPress y configurar object-cache.php (Cap. 8.1).

```

---

### **1. Terraform: El Arquitecto de la Nube**

Terraform es una herramienta declarativa. En lugar de decirle *cómo* hacer las cosas, le describes a Terraform *qué* infraestructura necesitas y él se encarga de hablar con la API del proveedor (AWS, Google Cloud, DigitalOcean) para construirla.

Para un clúster de WordPress optimizado, Terraform es el encargado de levantar la "cáscara".

**Ejemplo de código HCL (HashiCorp Configuration Language) para provisionar un nodo web en AWS:**

```hcl
# main.tf - Creación de un nodo web para WordPress
resource "aws_instance" "wp_web_node" {
  count         = 3 # Escalamos a 3 nodos instantáneamente
  ami           = "ami-0c55b159cbfafe1f0" # Ubuntu 22.04 LTS
  instance_type = "c6g.large" # Nodos optimizados para cómputo (Graviton)
  
  vpc_security_group_ids = [aws_security_group.wp_web_sg.id]
  key_name               = "sysadmin-ssh-key"

  tags = {
    Name        = "WP-Web-Node-${count.index + 1}"
    Environment = "Production"
    Role        = "Web"
  }
}

```

La ventaja de Terraform es su capacidad para gestionar el estado. Si cambias el `count` de 3 a 5 debido a un pico de tráfico, Terraform no destruye los 3 existentes; entiende la diferencia (*delta*) y simplemente provisiona 2 nodos adicionales.

---

### **2. Ansible: El Administrador de Sistemas Automatizado**

Una vez que Terraform levanta las máquinas (que por defecto vienen solo con un sistema operativo base), entra **Ansible**. A diferencia de Terraform, Ansible suele ser imperativo/procedural y sin agentes (*agentless*); solo necesita SSH y Python en el servidor destino.

Ansible utiliza *Playbooks* (archivos YAML) que describen el estado deseado de la máquina. Aquí es donde convertimos el conocimiento de los Capítulos 2 al 6 en código automatizado.

**Ejemplo de un Playbook de Ansible (`wp-setup.yml`):**

```yaml
---
- name: Configurar Nodos Web de WordPress
  hosts: web_nodes
  become: yes # Ejecutar como root (sudo)

  tasks:
    - name: Aplicar parámetros de sysctl para alto tráfico (TCP BBR)
      ansible.posix.sysctl:
        name: net.ipv4.tcp_congestion_control
        value: bbr
        state: present
        reload: yes

    - name: Desplegar archivo nginx.conf optimizado
      template:
        src: templates/nginx/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Reiniciar NGINX

    - name: Ajustar pm.max_children en PHP-FPM
      lineinfile:
        path: /etc/php/8.2/fpm/pool.d/www.conf
        regexp: '^pm.max_children ='
        line: 'pm.max_children = 150' # Valor calculado en el Capítulo 3
      notify: Reiniciar PHP-FPM

    - name: Instalar y activar Redis Object Cache usando WP-CLI
      command: wp plugin install redis-cache --activate --allow-root
      args:
        chdir: /var/www/wordpress
      become_user: www-data

  handlers:
    - name: Reiniciar NGINX
      service:
        name: nginx
        state: restarted
    - name: Reiniciar PHP-FPM
      service:
        name: php8.2-fpm
        state: restarted

```

### **El Principio de Idempotencia**

El concepto más crítico que aporta IaC a la administración de WordPress es la **idempotencia**. Esto significa que puedes ejecutar el Playbook de Ansible cien veces y el resultado será exactamente el mismo que si lo ejecutas una sola vez. Si Ansible detecta que `pm.max_children` ya está en 150, no hará nada.

Esto nos permite aplicar auditorías de configuración de forma constante. Si un administrador junior entra por SSH y modifica a mano un archivo de configuración para "probar algo" y olvida revertirlo, la próxima ejecución programada de Ansible sobrescribirá ese cambio manual, asegurando que la infraestructura siempre sea un reflejo exacto del repositorio de código.

### **Recuperación ante Desastres (Disaster Recovery)**

La combinación de Terraform y Ansible transforma la recuperación ante desastres. Si un centro de datos entero cae, o si un servidor es comprometido, el SysAdmin no necesita pasar 10 horas reconfigurando el entorno. Simplemente apunta Terraform a una nueva región (por ejemplo, de `us-east-1` a `eu-west-1`), ejecuta los scripts y, en minutos, tendrá un clúster de WordPress con la arquitectura exacta, listo para recibir la importación de la base de datos y los archivos estáticos.

## **8.3 Dockerización de WordPress: Creación de imágenes ligeras (Alpine) y gestión de persistencia con volúmenes**

En la sección anterior automatizamos la creación de nuestra infraestructura base. Ahora damos el paso definitivo hacia la **inmutabilidad** y la portabilidad: encapsular WordPress en contenedores.

En un entorno tradicional, el código, el servidor web y las dependencias viven acoplados en el sistema operativo. En una arquitectura nativa de la nube, la meta es que nuestra aplicación sea descartable. Si un nodo falla, el orquestador simplemente destruye el contenedor y levanta uno nuevo idéntico en milisegundos. Sin embargo, para que esto sea eficiente, no podemos usar las imágenes oficiales de WordPress tal cual vienen "de fábrica".

---

### **1. El Problema de la Imagen Oficial y la Ventaja de Alpine Linux**

La imagen oficial de Docker para WordPress (`wordpress:latest`) suele estar basada en Debian y, por defecto, incluye Apache. Como establecimos en el Capítulo 2, nuestro estándar de alto rendimiento es **NGINX + PHP-FPM**. Usar la imagen oficial con Apache rompería nuestra arquitectura. Además, las imágenes basadas en Debian superan fácilmente los 500 MB, lo que ralentiza los tiempos de despliegue (*pull/push*) y aumenta la superficie de ataque.

La solución es construir nuestra propia imagen utilizando **Alpine Linux** (`php:8.x-fpm-alpine`). Alpine es una distribución orientada a la seguridad que utiliza `musl libc` y `busybox`, logrando que la imagen base pese apenas unos 5 MB.

**Diagrama de Arquitectura de Contenedores:**

```text
[Tráfico HTTP/S]
       |
       v
+---------------------------------------+
|        Contenedor NGINX (Alpine)      |  <-- Sirve estáticos y hace proxy inverso
+---------------------------------------+
       | (Tráfico FastCGI - Puerto 9000)
       v
+---------------------------------------+
|     Contenedor PHP-FPM WP (Alpine)    |  <-- Solo procesa PHP y aloja el Core
|                                       |
|  [Capas Inmutables: Core + Código]    |
+---------------------------------------+
       |
       +---> [Red Docker] ---> Base de Datos (Externa - Cap. 4.5)
       |
       +---> [Red Docker] ---> Redis Object Cache (Externa - Cap. 5.2)
       |
       v
[Volumen Persistente / NFS] <-- Solo para wp-content/uploads

```

---

### **2. Creación del `Dockerfile` Optimizado**

A continuación, diseñamos un `Dockerfile` que compila las extensiones necesarias (como Redis y OPcache, vistas en los Capítulos 3 y 5) y mantiene el tamaño al mínimo eliminando las dependencias de compilación en el mismo paso.

```dockerfile
# Usamos PHP-FPM sobre Alpine como base
FROM php:8.2-fpm-alpine

# Metadatos
LABEL maintainer="SysAdmin Team"
LABEL description="WordPress PHP-FPM Alpine optimizado para HA"

# Instalación de dependencias del sistema y extensiones PHP
# Usamos apk --no-cache para no almacenar índices de paquetes y reducir tamaño
RUN apk add --no-cache \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    libzip-dev \
    imagemagick-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd mysqli pdo_mysql zip opcache \
    # Instalación de Redis (Compilación desde PECL)
    && apk add --no-cache --virtual .build-deps autoconf g++ make \
    && pecl install redis \
    && docker-php-ext-enable redis \
    # Limpieza de paquetes de compilación para reducir peso de la imagen
    && apk del .build-deps

# Copiar configuración optimizada de PHP-FPM (Capítulo 3)
COPY ./config/php/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY ./config/php/php.ini /usr/local/etc/php/php.ini

# Establecer directorio de trabajo
WORKDIR /var/www/html

# Descargar e instalar WP-CLI para tareas internas (Capítulo 8.1)
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x wp-cli.phar \
    && mv wp-cli.phar /usr/local/bin/wp

# Exponer el puerto de PHP-FPM
EXPOSE 9000

# Comando de inicio nativo de la imagen base
CMD ["php-fpm"]

```

---

### **3. Gestión de Persistencia: El Reto de los Volúmenes**

La regla de oro de Docker es que **los contenedores son efímeros**. Si un contenedor muere, todo dato escrito en su sistema de archivos interno desaparece.

WordPress, por su naturaleza, es una aplicación "con estado" (*stateful*). Constantemente genera archivos estáticos (imágenes subidas) e instala plugins. Para lograr el modelo "Stateless WordPress" del Capítulo 7.1 dentro de Docker, debemos separar el código de los datos dinámicos utilizando **Volúmenes**.

**Estrategia de Volúmenes en Alta Disponibilidad:**

1. **El Core, Temas y Plugins (Inmutables):** En un entorno de producción estricto, no deberías permitir que los usuarios instalen plugins desde el *wp-admin*. El código (Core, temas y plugins) debe ser inyectado dentro de la imagen de Docker durante el proceso de compilación (lo veremos en la sección de CI/CD 8.5). El directorio de WordPress se monta como **Read-Only** (Solo lectura) para evitar manipulaciones maliciosas si hay una brecha de seguridad.
2. **La carpeta de subidas (`wp-content/uploads`):**
Esta es la única carpeta que requiere persistencia y escritura. Si tienes un solo servidor, puedes usar un *Bind Mount* o un Volumen local de Docker. Si tienes múltiples servidores detrás de un balanceador, debes mapear esta ruta a un almacenamiento compartido (como un volumen montado por red vía NFS, Amazon EFS) o, idealmente, utilizar el *offloading* a S3 (Capítulo 7.3).

**Ejemplo de implementación con `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  php-fpm:
    build: 
      context: .
      dockerfile: Dockerfile
    image: custom-wordpress-fpm:alpine
    restart: always
    volumes:
      # El código base puede ser de solo lectura en producción
      - ./src/wordpress:/var/www/html:ro 
      # SOLO la carpeta de uploads tiene permisos de escritura
      - wp_uploads:/var/www/html/wp-content/uploads
    environment:
      WORDPRESS_DB_HOST: ${DB_HOST} # Apunta a BD Externa
      WORDPRESS_DB_USER: ${DB_USER}
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - php-fpm
    volumes:
      # NGINX necesita leer los archivos estáticos para servirlos
      - ./src/wordpress:/var/www/html:ro
      - wp_uploads:/var/www/html/wp-content/uploads:ro
      # Configuración de NGINX (Capítulo 2)
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro

volumes:
  # Declaración del volumen persistente
  # En HA, esto sería un driver que apunte a NFS/EFS
  wp_uploads:

```

Al utilizar este enfoque basado en contenedores ligeros y aislar la persistencia en volúmenes específicos, hemos desacoplado la aplicación por completo de la infraestructura subyacente. Esto nos deja el camino preparado para la orquestación masiva, que es exactamente lo que abordaremos en la siguiente sección con Kubernetes.

## **8.4 Orquestación con Kubernetes: Helm charts para WordPress, *Auto-scaling groups* y manejo de *Secrets***

En la sección 8.3 logramos encapsular nuestro WordPress optimizado en contenedores Alpine inmutables. Sin embargo, en un entorno de Alta Disponibilidad (HA), tener contenedores aislados no es suficiente. ¿Qué ocurre si el servidor físico que aloja el contenedor falla? ¿Cómo distribuimos el tráfico entre 50 réplicas idénticas durante un pico masivo? ¿Cómo realizamos actualizaciones de versión sin tiempo de inactividad?

Aquí es donde entra **Kubernetes (K8s)**, el estándar absoluto para la orquestación de contenedores. K8s toma nuestras imágenes de Docker y se encarga de programarlas, escalarlas y mantenerlas vivas a través de un clúster de servidores (nodos).

El siguiente diagrama ilustra la arquitectura lógica de WordPress dentro de Kubernetes:

```text
[Tráfico Externo] ---> [Load Balancer de la Nube (AWS/GCP)]
                               |
                               v
                    [K8s Ingress Controller (ej. NGINX Ingress)]
                               |
                               v
                     [K8s Service (ClusterIP)] ---> Balancea tráfico interno
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
  [Pod WP #1]            [Pod WP #2]            [Pod WP #3]  <-- HPA escala estos
  (NGINX + PHP-FPM)      (NGINX + PHP-FPM)      (NGINX + PHP-FPM)
        |                      |                      |
        +----------------------+----------------------+
                               |
          +--------------------+--------------------+
          |                    |                    |
          v                    v                    v
[K8s PVC (EFS/NFS)]    [External DB (Aurora)]  [External Cache (Redis)]
(wp-content/uploads)       (Capítulo 4.5)          (Capítulo 5.2)

```

---

### **1. Helm Charts: El Gestor de Paquetes de Kubernetes**

Desplegar WordPress en K8s de forma manual requiere escribir y mantener docenas de archivos YAML complejos (`Deployments`, `Services`, `Ingress`, `PersistentVolumeClaims`, etc.). Para simplificar esto, utilizamos **Helm**.

Helm es el "gestor de paquetes" (como `apt` o `yum`) para Kubernetes. Empaqueta todos esos recursos en una sola plantilla llamada **Chart**. En lugar de modificar los YAML directamente, modificamos un único archivo llamado `values.yaml` para inyectar nuestra configuración, y Helm renderiza los manifiestos finales.

**Ejemplo de personalización en un `values.yaml` (usando una imagen personalizada):**

```yaml
# values.yaml
image:
  repository: mi-registro.com/custom-wordpress-fpm
  tag: "alpine-v1.0"
  pullPolicy: IfNotPresent

replicaCount: 3 # Número mínimo de pods en ejecución

resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"

persistence:
  enabled: true
  storageClass: "aws-efs" # Sistema de archivos en red (Capítulo 7.3)
  size: 50Gi

```

Para aplicar este entorno completo en el clúster, el comando es sumamente sencillo:

```bash
helm upgrade --install mi-wordpress ./wp-chart -f values.yaml --namespace produccion

```

---

### **2. Escalado Automático (Auto-scaling Groups)**

La magia de Kubernetes radica en su capacidad de adaptación en tiempo real. Para un sitio de noticias que publica una exclusiva mundial, el tráfico puede pasar de 100 a 10,000 usuarios concurrentes en minutos. K8s maneja esto en dos dimensiones:

**A. Horizontal Pod Autoscaler (HPA): Escalado a nivel de aplicación**
El HPA monitorea métricas en tiempo real (por defecto CPU y RAM, pero puede configurarse para leer métricas de NGINX o peticiones HTTP) y añade o elimina réplicas (Pods) de WordPress según sea necesario.

**Manifiesto de HPA para WordPress:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: wordpress-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mi-wordpress
  minReplicas: 3
  maxReplicas: 50 # El clúster escalará hasta 50 contenedores bajo estrés
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75 # Escala si el uso promedio de CPU supera el 75%

```

**B. Cluster Autoscaler: Escalado a nivel de infraestructura**
Si el HPA solicita crear 20 nuevos Pods de WordPress, pero los servidores físicos (nodos) del clúster se quedan sin RAM o CPU, esos Pods quedarán en estado `Pending`. El **Cluster Autoscaler** detecta esto y se comunica automáticamente con el proveedor de la nube (AWS EC2, GKE, AKS) para encender nuevos servidores de forma dinámica. Cuando el tráfico baja y los Pods se destruyen, el Autoscaler apaga los servidores vacíos para ahorrar costes.

---

### **3. Manejo Avanzado de Secrets**

En el modelo de la vieja escuela, las contraseñas de la base de datos, las claves de las APIs y las *salts* de WordPress se guardaban en texto plano dentro del archivo `wp-config.php`. En un entorno nativo de la nube, esto es una vulnerabilidad crítica, especialmente si el código base está en repositorios compartidos o se inyecta en contenedores.

Kubernetes resuelve esto separando la configuración sensible del código mediante **Secrets**.

**Paso 1: Declarar el Secret en K8s (o inyectarlo vía HashiCorp Vault / AWS Secrets Manager)**
K8s almacena los datos codificados en base64 en su base de datos interna (`etcd`):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: wp-db-credentials
type: Opaque
data:
  db-password: c3VwZXJfc2VjcmV0YV9wYXNzd29yZA== # "super_secreta_password" codificado

```

**Paso 2: Consumir el Secret en el Deployment**
El contenedor de WordPress no contiene la contraseña. K8s inyecta el Secret en el contenedor en el momento de la ejecución, ya sea como un archivo oculto o, más comúnmente, como variables de entorno que el `wp-config.php` puede leer usando `getenv()`.

```yaml
# Fragmento del Deployment de K8s
containers:
  - name: wordpress
    image: mi-registro.com/custom-wordpress-fpm:alpine-v1.0
    env:
      - name: WORDPRESS_DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: wp-db-credentials
            key: db-password

```

**Ventaja evolutiva:** Si la contraseña de la base de datos se ve comprometida, no tienes que reconstruir las imágenes de Docker ni editar archivos PHP. Simplemente actualizas el *Secret* en Kubernetes y rotas los Pods. Esta separación estricta entre código (imagen Docker), configuración de entorno (`ConfigMaps`) y credenciales (`Secrets`) es la base metodológica de las *Twelve-Factor Apps*, un pilar para la estabilidad en clústeres de Alta Disponibilidad.

## **8.5 Pipelines CI/CD: Despliegues *Zero-Downtime* de código de temas y plugins sin afectar la caché de producción**

En los capítulos anteriores transformamos WordPress de una aplicación monolítica tradicional a una arquitectura distribuida, inmutable y orquestada por Kubernetes. Sin embargo, surge un problema operativo crítico: ¿cómo actualizamos el código de un tema personalizado o un plugin sin causar tiempo de inactividad, y sin que la experiencia del usuario se degrade por problemas de caché?

En entornos de Alta Disponibilidad, el uso de FTP, SSH manual o la edición de archivos en vivo a través de *wp-admin* están estrictamente prohibidos. Todo cambio debe fluir a través de una tubería de **Integración Continua y Despliegue Continuo (CI/CD)**.

El siguiente diagrama en texto plano ilustra un flujo de trabajo moderno usando herramientas como GitLab CI o GitHub Actions:

```text
[1. Commit/Push] ---> Repositorio Git (Rama 'main')
                             |
[2. Build]                   v
                      CI/CD Pipeline: Construye la nueva imagen Docker 
                      (Copia el nuevo tema/plugin en la imagen base Alpine)
                             |
[3. Test]                    v
                      Ejecuta Pruebas: PHPUnit, Linting (PHPCS) y Análisis Estático
                             |
[4. Push to Registry]        v
                      Sube la imagen etiquetada (ej. v1.4.2) al Container Registry
                             |
[5. Deploy]                  v
                      Actualiza el Deployment en Kubernetes (Rolling Update)
                             |
[6. Post-Deploy]             v
                      Ejecuta scripts WP-CLI para invalidación selectiva de caché

```

---

### **1. Despliegues *Zero-Downtime* (Actualizaciones sin cortes)**

El objetivo de un despliegue *Zero-Downtime* es que el usuario final nunca vea una página de mantenimiento, un error 502 (Bad Gateway) o un sitio roto mientras se aplican los cambios.

Dado que nuestro código ahora vive dentro de contenedores inmutables (Sección 8.3), desplegar una nueva versión del tema implica desplegar nuevos Pods en Kubernetes (Sección 8.4) y destruir los antiguos. K8s logra esto mediante una estrategia llamada **Rolling Updates** (Actualizaciones continuas).

Para que K8s sepa exactamente cuándo el nuevo contenedor de WordPress está listo para recibir tráfico (y cuándo es seguro apagar el contenedor viejo), debemos configurar **Probes** (sondas de salud) en nuestro manifiesto:

```yaml
# Fragmento del Deployment de K8s para Zero-Downtime
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0 # Ningún pod viejo se apaga hasta que el nuevo esté listo
    maxSurge: 1       # Crea un pod extra por encima del límite para la transición
containers:
  - name: wordpress
    image: mi-registro.com/custom-wordpress-fpm:v1.4.2
    readinessProbe:
      httpGet:
        path: /wp-admin/install.php # O un endpoint personalizado ligero
        port: 80
      initialDelaySeconds: 10
      periodSeconds: 5

```

Con esta configuración, el balanceador de carga dirige el tráfico a la versión antigua (v1.4.1) de forma ininterrumpida hasta que el contenedor v1.4.2 responde con un código HTTP 200. En ese milisegundo, el tráfico se redirige y el contenedor antiguo se destruye.

---

### **2. El Desafío de la Caché: Evitando el "Cache Stampede"**

El mayor error en los despliegues de WordPress es el paso posterior al despliegue. Es una práctica común entre desarrolladores ejecutar `wp cache flush` o purgar toda la CDN para que los nuevos cambios sean visibles.

En un entorno de alto tráfico, purgar toda la caché simultáneamente provoca un **Cache Stampede** (o *efecto de manada atronadora*). De repente, miles de peticiones HTTP concurrentes ignoran Varnish/Redis y golpean directamente a PHP-FPM y la base de datos para reconstruir la caché, provocando una caída instantánea del servidor por agotamiento de recursos (CPU/RAM).

Para evitar esto, el pipeline CI/CD debe manejar la caché en dos frentes de forma estratégica:

**A. Caché de Navegador y CDN (Cache Busting para Assets)**
Nunca debes confiar en purgar la CDN para actualizar archivos estáticos (CSS/JS). En su lugar, debes forzar al navegador a descargar el nuevo archivo cambiando su nombre o cadena de consulta (*query string*).

En lugar de encolar scripts en WordPress de forma estática, debes leer el *hash* del archivo o la fecha de modificación (`filemtime`) durante el empaquetado.

```php
// functions.php - Estrategia de Cache Busting dinámico
$css_path = get_template_directory() . '/assets/css/main.css';
$css_url = get_template_directory_uri() . '/assets/css/main.css';

// WP añade automáticamente ?ver=123456789 (timestamp del archivo)
// Esto asegura que la CDN/Navegador pida la nueva versión SOLO si el archivo cambió.
wp_enqueue_style( 'mi-tema-principal', $css_url, array(), filemtime( $css_path ) );

```

**B. Caché de Servidor (Varnish/Nginx) y Object Cache**
Si el despliegue incluye cambios en plantillas PHP que afectan el HTML generado, no purges todo. El pipeline debe usar un script de WP-CLI (visto en la Sección 8.1) configurado como un *Job* de Kubernetes para invalidar **solamente** las URLs afectadas.

```bash
# Script de Post-Deploy ejecutado por el Pipeline CI/CD

# 1. Purgar solo la caché de la portada y la página de contacto en Varnish/FastCGI
wp varnish purge /
wp varnish purge /contacto/

# 2. Reconstruir fragmentos específicos de la Object Cache en Redis
wp transient delete menu_principal_cache
wp transient delete widget_ultimas_noticias

# 3. Precargar las URLs purgadas (Cache Warming) para el primer visitante
curl -s -o /dev/null https://midominio.com/
curl -s -o /dev/null https://midominio.com/contacto/

```

### **Conclusión del Flujo**

Al combinar contenedores inmutables, el orquestador de Kubernetes con *Rolling Updates*, y una estrategia quirúrgica de invalidación de caché gestionada por pipelines CI/CD, logramos aislar por completo el código de la infraestructura. El resultado es un entorno de WordPress predecible, altamente escalable y capaz de recibir decenas de actualizaciones diarias en producción sin que un solo visitante experimente lentitud o interrupciones.
