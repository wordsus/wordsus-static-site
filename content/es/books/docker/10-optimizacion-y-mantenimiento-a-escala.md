Operar Docker en producción exige trascender la creación de contenedores para enfocarse en la sostenibilidad del ecosistema. Este capítulo aborda la transición de entornos artesanales a infraestructuras industriales mediante la automatización de la higiene del disco y el control férreo del hardware. Aprenderás a implementar políticas de limpieza agresivas, establecer fronteras de recursos para neutralizar el efecto "Noisy Neighbor" y diagnosticar los temidos fallos por memoria (OOM Kills). Finalmente, elevamos el estándar operativo hacia el cumplimiento normativo (Compliance), transformando el flujo de eventos en un rastro de auditoría inmutable y profesional.

## 10.1. Limpieza agresiva de recursos (`docker system prune` automatizado)

A medida que operas Docker a escala, especialmente en entornos de integración continua (CI) o en servidores de desarrollo compartidos, descubrirás rápidamente una realidad ineludible: **Docker es un acaparador digital por naturaleza**.

Cada compilación fallida, cada contenedor que se detiene y no se elimina, cada imagen base descargada para una prueba efímera y cada capa de caché generada por BuildKit consumen espacio en disco. Si este comportamiento se ignora, la inevitable consecuencia es una alerta de monitoreo en la madrugada o, peor aún, un fallo catastrófico en producción provocado por el infame error `No space left on device`.

En esta sección, pasaremos de la limpieza manual esporádica a la implementación de estrategias de recolección de basura (Garbage Collection) automatizadas, seguras y predecibles.

---

### Anatomía del comando `docker system prune`

El comando `docker system prune` es la herramienta principal para recuperar espacio. Sin embargo, su comportamiento por defecto es conservador para evitar la pérdida accidental de datos.

Por defecto, ejecutar `docker system prune` eliminará:

* **Contenedores detenidos** (aquellos que no corrieron con la flag `--rm`).
* **Redes sin usar** (que no están asociadas a ningún contenedor activo).
* **Imágenes "Dangling"** (imágenes sin etiqueta, que aparecen como `<none>:<none>` al ejecutar `docker images`, generalmente resultado de sobrescribir un *tag* durante un build).
* **Caché de construcción "Dangling"** (capas de caché de builds anteriores que ya no están referenciadas).

> **Advertencia de Nivel Senior:** Por defecto, `docker system prune` **no elimina volúmenes**. Como vimos en el Capítulo 4, los volúmenes tienen un ciclo de vida independiente al de los contenedores. Para incluirlos en la purga, debes pasar explícitamente la bandera `--volumes`. Úsala con extrema precaución, ya que eliminará cualquier volumen que no esté montado en un contenedor *en ese momento exacto*.

```text
Estructura de consumo de disco en Docker:

[ Disco del Host ]
 ├── En Uso (Protegido por el daemon)
 │    ├── Contenedores en ejecución (Up)
 │    ├── Imágenes base asociadas a contenedores activos
 │    ├── Volúmenes montados
 │    └── Redes con endpoints activos
 │
 └── Basura Acumulada (Objetivos del Prune)
      ├── Contenedores Exited / Dead --------> prune por defecto
      ├── Imágenes Dangling (<none>:<none>) -> prune por defecto
      ├── Redes huérfanas -------------------> prune por defecto
      ├── Caché de Build obsoleto -----------> prune por defecto
      ├── Imágenes sin usar (Con tag) -------> Requiere flag '-a'
      └── Volúmenes huérfanos ---------------> Requiere flag '--volumes'

```

### Filtros Avanzados: Quirúrgico vs. Nuclear

Ejecutar `docker system prune -a --volumes -f` es el equivalente a una opción nuclear: limpiará absolutamente todo lo que no esté corriendo en ese milisegundo. En producción, esto es peligroso y destruirá tu caché de capas, haciendo que tus próximos despliegues o builds tarden significativamente más (como analizamos en el Capítulo 3).

La mejor práctica es utilizar la bandera `--filter` para aplicar una ventana de tiempo. Por ejemplo, podemos instruir al demonio para que solo elimine recursos que lleven inactivos más de una semana (168 horas):

```bash
# Elimina todo (imágenes, contenedores, redes) que no se haya usado en las últimas 168 horas.
docker system prune -a --filter "until=168h" -f

```

---

### Automatización en Producción: Systemd Timers

Un error común de nivel junior es meter el comando directamente en un `cron` clásico. Aunque funciona, `cron` es opaco, maneja mal los logs y no gestiona dependencias de manera nativa (por ejemplo, asegurar que el demonio de Docker esté corriendo antes de intentar limpiarlo).

En sistemas modernos basados en Linux, la solución más robusta y auditable para automatizar la limpieza es usar **Systemd Timers**.

**Paso 1: Crear el servicio Systemd**
Crea un archivo llamado `/etc/systemd/system/docker-prune.service`. Este archivo define *qué* acción se va a ejecutar.

```ini
[Unit]
Description=Limpieza agresiva y automatizada de recursos de Docker
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
# Limpia recursos sin usar de más de 3 días de antigüedad. Ajusta según tus necesidades.
ExecStart=/usr/bin/docker system prune -a --volumes --filter "until=72h" -f

```

**Paso 2: Crear el Timer**
Crea un archivo llamado `/etc/systemd/system/docker-prune.timer`. Este archivo define *cuándo* se ejecutará el servicio.

```ini
[Unit]
Description=Programación diaria para la limpieza de Docker

[Timer]
# Se ejecuta todos los días a las 3:00 AM
OnCalendar=*-*-* 03:00:00
# Si el servidor estaba apagado a esa hora, se ejecuta inmediatamente al iniciar
Persistent=true

[Install]
WantedBy=timers.target

```

**Paso 3: Habilitar y verificar el Timer**
Finalmente, recarga el demonio de Systemd y activa el timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now docker-prune.timer

# Para verificar cuándo será la próxima ejecución:
systemctl list-timers | grep docker-prune

```

### Consideraciones para Nodos de CI/CD

Si administras runners de GitLab CI, GitHub Actions o Jenkins (tema que profundizamos en el Capítulo 7), la agresividad de tu política de limpieza debe dictarla tu capacidad de almacenamiento versus el tiempo que estás dispuesto a esperar por los builds.

En nodos de CI con alto tráfico, la limpieza no debe depender del tiempo (`until=Xh`), sino de eventos. Es una práctica recomendada en DevOps ejecutar un `docker system prune -f` ligero al finalizar cada pipeline de compilación, o configurar el demonio del runner para que monitoree el límite de disco y purgue el caché de BuildKit (`docker builder prune`) automáticamente al alcanzar un umbral crítico de almacenamiento.

## 10.2. Límites estrictos de recursos (CPU, Memoria, PIDs) para evitar el "Noisy Neighbor"

Por defecto, un contenedor de Docker nace con privilegios absolutos sobre el hardware de su anfitrión: si el host tiene 64 GB de RAM y 32 núcleos de CPU, un solo contenedor mal configurado puede consumir los 64 GB y saturar los 32 núcleos.

Cuando operas clústeres donde múltiples servicios comparten el mismo nodo físico o virtual, esta libertad por defecto da lugar al **síndrome del "Noisy Neighbor" (Vecino Ruidoso)**. Si un contenedor entra en un bucle infinito de CPU o sufre una fuga de memoria drástica, monopolizará los recursos del host, degradando el rendimiento de todos los demás contenedores y, potencialmente, volviendo inestable al propio sistema operativo subyacente.

Como vimos en el **Capítulo 1.4**, Docker utiliza los *Control Groups (cgroups)* del kernel de Linux para aislar y limitar el uso de recursos. En esta sección, aprenderemos a instrumentar esos cgroups para crear fronteras estrictas (Hard Limits) y reservas (Soft Limits).

---

### 1. Límite de Memoria (RAM y Swap)

Establecer un límite de memoria es la regla número uno en la contenerización a escala.

* **Límite estricto (Hard Limit):** Define el máximo absoluto de memoria que un contenedor puede usar. Si el proceso interno intenta exceder este límite, el kernel de Linux intervendrá.

```bash
# Limita el contenedor a 512 Megabytes de RAM
docker run -d --name app_backend -m 512m mi_imagen:latest

```

*(Nota: Las consecuencias de sobrepasar este límite, conocidas como OOM Kills, las analizaremos a fondo en la siguiente sección, 10.3).*

* **Reserva de memoria (Soft Limit):** Permite al contenedor usar tanta memoria como necesite, pero si el host detecta escasez de RAM, forzará a los contenedores a reducir su consumo hasta el límite establecido en la reserva.

```bash
docker run -d --name app_backend -m 1g --memory-reservation 512m mi_imagen:latest

```

> **Advertencia de Nivel Senior respecto al Swap:** Un error muy común es definir el límite de RAM (`-m`) y olvidar el Swap. Por defecto en Docker, si limitas la memoria a `512m`, a ese contenedor se le otorgan `512m` *adicionales* de Swap (1 GB en total). Si quieres que un contenedor falle rápido antes de empezar a usar el disco como memoria (lo cual destruirá el rendimiento de I/O de todo el host), debes igualar el límite de swap al límite de memoria:
> `docker run -m 512m --memory-swap 512m ...`

### 2. Restricción de CPU (Cuotas y Pesos)

A diferencia de la memoria, donde el exceso suele resultar en la terminación del proceso, la CPU es un recurso "compresible". Si un contenedor agota su asignación de CPU, simplemente se ejecutará más lento (throttling), pero no morirá.

Existen dos enfoques principales para limitar la CPU:

* **Asignación Absoluta (`--cpus`):** Es la forma más moderna y recomendada. Define cuántos "núcleos" efectivos puede usar un contenedor. No ata el contenedor a un núcleo físico específico, sino que limita su tiempo de procesamiento total.

```bash
# Permite al contenedor usar el equivalente a 1 núcleo y medio.
docker run -d --name app_worker --cpus="1.5" mi_imagen:latest

```

* **Pesos Relativos (`--cpu-shares`):** En lugar de un límite estricto, define una prioridad. Por defecto, todos los contenedores tienen un peso de `1024`. Si el host tiene la CPU al 100%, un contenedor con `--cpu-shares=2048` recibirá el doble de tiempo de procesador que uno con `1024`. Si el host *no* está saturado, ambos pueden usar toda la CPU que necesiten. Es ideal para priorizar servicios críticos sobre tareas de fondo.

### 3. Protección contra Fork Bombs: Límite de PIDs

Un vector de ataque (o un simple error de programación) altamente destructivo es el "Fork Bomb": un proceso que se replica a sí mismo infinitamente hasta agotar el espacio en la tabla de procesos del kernel del host. Una vez que esto ocurre, el host entero queda congelado porque no puede iniciar ni un solo proceso nuevo (ni siquiera para abrir una terminal SSH de rescate).

Para mitigar esto, debemos limitar el número máximo de procesos (PIDs) que un contenedor tiene permitido crear.

```bash
# Permite un máximo de 100 procesos concurrentes dentro del contenedor
docker run -d --name api_gateway --pids-limit 100 nginx:alpine

```

---

### Implementación en Infraestructura como Código (Docker Compose)

En entornos productivos y orquestados (como analizamos en el **Capítulo 6**), rara vez pasamos estos parámetros por la línea de comandos. La especificación actual de Compose gestiona los límites a través del bloque `deploy > resources`.

El siguiente ejemplo muestra un servicio de aplicación blindado contra el efecto *Noisy Neighbor*:

```yaml
services:
  webapp:
    image: mi_empresa/webapp:v2.1
    ports:
      - "8080:80"
    deploy:
      resources:
        # Hard limits: El contenedor no puede exceder esto bajo ninguna circunstancia
        limits:
          cpus: '0.50'          # Máximo medio núcleo de CPU
          memory: 512M          # Máximo 512 Megabytes de RAM
          pids: 64              # Límite anti-fork-bomb
        
        # Soft limits: Lo que el contenedor tiene garantizado/reservado
        reservations:
          cpus: '0.10'
          memory: 128M

```

Al aplicar estos tres límites —CPU, Memoria y PIDs— transformamos un conjunto de contenedores impredecibles en una flota de aplicaciones contenidas con un comportamiento determinista, garantizando que un fallo en el servicio A jamás derrumbe por inanición de recursos al servicio B.

## 10.3. Prevención y mitigación de fugas de memoria (OOM Kills)

En la sección anterior (10.2) establecimos que limitar la memoria es esencial para proteger la integridad del host. Sin embargo, imponer un límite estricto (Hard Limit) introduce un nuevo escenario operativo: ¿Qué sucede exactamente cuando un contenedor intenta consumir más RAM de la que tiene asignada?

La respuesta del sistema operativo es brutal y fulminante: invoca al **OOM Killer (Out Of Memory Killer)**.

El OOM Killer es un mecanismo de autodefensa del kernel de Linux. Cuando el sistema (o un cgroup específico, como el de nuestro contenedor) se queda sin memoria, el kernel escanea los procesos en ejecución, calcula una "puntuación de maldad" (*oom_score*) basándose en cuánta memoria están acaparando, y envía una señal `SIGKILL` (Kill -9) incondicional al infractor para liberar recursos inmediatamente.

A diferencia de un `SIGTERM`, un `SIGKILL` no puede ser interceptado. La aplicación no tiene tiempo de cerrar conexiones de base de datos, guardar estado o escribir un log de despedida; simplemente deja de existir.

---

### Anatomía y Diagnóstico de un OOM Kill

Cuando un contenedor desaparece misteriosamente o se reinicia constantemente, el OOM Kill es el principal sospechoso. Como la aplicación muere instantáneamente, **no verás el error en los logs de la aplicación** (e.g., `docker logs mi_app` no mostrará una excepción de falta de memoria).

El diagnóstico debe hacerse a nivel de infraestructura:

**1. Verificación del estado del contenedor (Exit Code 137)**
En el mundo de los contenedores, un código de salida **137** es el indicador universal de un OOM Kill. El número 137 proviene de la suma del código base de error fatal (128) más el número de la señal `SIGKILL` (9).

Puedes confirmar esto inspeccionando el contenedor:

```bash
# Inspecciona el contenedor para ver si el flag OOMKilled está en true
docker inspect app_backend --format='{{.State.OOMKilled}}'
# Salida esperada: true

docker inspect app_backend --format='{{.State.ExitCode}}'
# Salida esperada: 137

```

**2. Auditoría a nivel del Kernel (Host)**
Si sospechas que el OOM Killer del host (no el del cgroup del contenedor) eliminó el proceso porque el servidor entero se quedó sin RAM, debes revisar los logs del kernel (requiere acceso al host):

```bash
# Busca eventos OOM en los mensajes del kernel, mostrando marcas de tiempo
dmesg -T | grep -i oom

```

```text
[Diagrama en texto plano: Flujo de un evento OOM Kill]

1. App solicita RAM  -->  2. Kernel evalúa cgroup  --> 3. ¿Excede el Hard Limit (-m)?
                                                           |
      [Límite no excedido] <-------------------------------+
      |                                                    |
   4. RAM Asignada                                 [Límite excedido]
                                                           |
                                                   5. Kernel invoca OOM Killer
                                                           |
                                                   6. Envía SIGKILL (Kill -9) al PID 1
                                                           |
                                                   7. Contenedor muere (Exit 137)

```

---

### Estrategias de Mitigación y Prevención

Abordar los OOM Kills requiere una estrategia en dos frentes: configuración de Docker y corrección a nivel de código (desarrollo).

#### 1. Ajuste del OOM Score (`--oom-score-adj`)

Docker permite manipular la preferencia del OOM Killer del host. Puedes asignar un valor entre `-1000` (inmune al OOM Killer) y `1000` (el primero en la línea de fuego).

Si tienes un servicio crítico (como un proxy inverso o un demonio de monitoreo) que comparte nodo con aplicaciones menos importantes, puedes protegerlo reduciendo su puntuación:

```bash
# Hace que este contenedor sea menos propenso a ser asesinado por el host
docker run -d --name nginx_proxy --oom-score-adj -500 nginx:alpine

```

> **Advertencia de Nivel Senior:** Existe una bandera `--oom-kill-disable`. **Nunca la uses en producción**. Si deshabilitas el OOM Killer en un contenedor con límite de memoria y este sufre una fuga, el proceso se congelará indefinidamente esperando RAM que nunca llegará. Es preferible que el contenedor muera y sea reiniciado por la política `restart: always` a tener un proceso "zombie" que no responde pero sigue consumiendo recursos y aparentando estar vivo ante los balanceadores de carga.

#### 2. Dimensionamiento de la Máquina Virtual de Java (JVM) y Node.js

Una causa clásica de OOM Kills ocurre al contenerizar aplicaciones Java o Node.js. Estos *runtimes* pre-asignan memoria basándose en la RAM total del *host*, ignorando (en versiones antiguas) los límites del cgroup de Docker.

* **Para Java (10+):** Asegúrate de usar las opciones `XX:+UseContainerSupport` y `-XX:MaxRAMPercentage=75.0`. Esto le dice a la JVM que calcule su *Heap* basándose en el límite de Docker (`-m`), dejando un 25% libre para el sistema operativo base del contenedor.
* **Para Node.js:** Node por defecto limita su memoria a ~1.5GB. Si tu contenedor tiene 4GB de límite y Node necesita más, debes pasarle la variable de entorno `NODE_OPTIONS="--max-old-space-size=3072"` para que sepa cuánta RAM real tiene disponible antes de que el Garbage Collector actúe agresivamente.

#### 3. Profiling de Fugas de Memoria (Memory Leaks)

Si un contenedor sufre OOM Kills recurrentes, aumentar el límite de RAM (`-m`) es solo un parche temporal; la fuga de memoria terminará alcanzando el nuevo límite.

La solución definitiva en DevOps implica habilitar herramientas de *profiling* en caliente. Para aplicaciones complejas, integra herramientas como pprof (Go), jemalloc (C/Rust) o volcados de Heap (Java/Node) que se activen justo antes de alcanzar el 90% del límite de memoria del contenedor, capturando el estado de la RAM para que el equipo de desarrollo identifique el objeto que no está siendo liberado por el recolector de basura.

## 10.4. Auditoría de eventos de Docker para cumplimiento (Compliance)

A lo largo del libro hemos configurado, optimizado y asegurado contenedores para que funcionen con la máxima eficiencia. Sin embargo, cuando operas infraestructuras en industrias reguladas (finanzas, salud, gobierno) o bajo normativas estrictas como **SOC 2, PCI-DSS o HIPAA**, garantizar que un sistema "funciona bien" no es suficiente. Debes poder *demostrar* quién hizo qué, cuándo lo hizo y desde dónde.

Mientras que en el **Capítulo 9** nos enfocamos en el *logging* de las aplicaciones (lo que ocurre *dentro* del contenedor), la auditoría de cumplimiento se enfoca en el **plano de control**: los eventos del propio demonio de Docker.

Si un ingeniero ejecuta un `docker exec` para abrir una terminal interactiva en la base de datos de producción, o si un pipeline automatizado modifica la configuración del demonio, ese evento debe quedar registrado de forma inmutable.

---

### 1. El flujo de eventos en tiempo real: `docker events`

El demonio de Docker emite un flujo continuo de eventos detallando cada acción que ocurre en el sistema (creación, destrucción, montaje de volúmenes, conexiones de red).

La herramienta nativa para observar esto es `docker events`. Aunque es excelente para depuración y *troubleshooting* en caliente, es fundamental para construir un rastro de auditoría (Audit Trail).

Podemos aplicar filtros para monitorizar acciones altamente sensibles. Por ejemplo, capturar en tiempo real cualquier intento de inyectar procesos en un contenedor en ejecución (una acción que debería estar estrictamente prohibida en producción):

```bash
# Escucha de forma continua solo los eventos de tipo 'exec_create' o 'exec_start'
docker events --filter 'event=exec_create' --filter 'event=exec_start' --format '{{json .}}'

```

*Salida JSON típica (simplificada):*

```json
{
  "status": "exec_create: /bin/sh",
  "id": "e9b5c...",
  "from": "postgres:14",
  "Type": "container",
  "Action": "exec_create",
  "Actor": {
    "Attributes": {
      "execID": "f7a9d...",
      "name": "prod_db_primary"
    }
  },
  "time": 1709240000
}

```

> **Nota de Arquitectura:** `docker events` solo retiene información en la memoria del demonio por un corto período (usualmente hasta 1000 eventos). Para fines de *compliance*, este flujo debe ser redirigido y persistido en un sistema externo inmediatamente.

---

### 2. Auditoría a nivel del Kernel: La integración con `auditd`

El estándar de oro para el cumplimiento normativo en sistemas Linux no es depender de los logs de la propia aplicación (en este caso, Docker), sino utilizar el sistema de auditoría del kernel: **`auditd`**.

Si un atacante o un administrador malintencionado obtiene acceso root, podría manipular los logs de Docker o detener el contenedor que envía los eventos. `auditd` opera a un nivel inferior, registrando cualquier acceso o modificación a los archivos críticos de Docker antes de que el usuario pueda borrar sus huellas.

Para cumplir con las guías de seguridad de CIS (Center for Internet Security) para Docker, debes configurar `auditd` para vigilar los siguientes componentes críticos.

**Configuración de Reglas ( `/etc/audit/rules.d/docker.rules` ):**

```text
# 1. Auditar el demonio de Docker (el binario en sí)
-w /usr/bin/dockerd -k docker_daemon

# 2. Auditar el socket de Docker (quien acceda aquí tiene control total)
-w /var/run/docker.sock -k docker_socket

# 3. Auditar la configuración del demonio
-w /etc/docker/daemon.json -p wa -k docker_config

# 4. Auditar los certificados TLS (si el registry/demonio está asegurado)
-w /etc/docker/certs.d/ -p wa -k docker_certs

# 5. Auditar el directorio raíz donde residen contenedores y volúmenes
-w /var/lib/docker -k docker_data

```

*(Explicación de los flags: `-w` observa el archivo/directorio, `-p wa` registra escrituras y modificaciones de atributos, `-k` asigna una clave de búsqueda para facilitar la localización de los eventos).*

---

### 3. Inmutabilidad y Centralización (SIEM)

Para que una auditoría tenga validez forense, los registros capturados tanto por `docker events` como por `auditd` deben ser enviados inmediatamente a un sistema externo de solo lectura (SIEM - Security Information and Event Management), como Splunk, Datadog Security, o un bucket S3 inmutable.

```text
[Diagrama de Arquitectura de Auditoría Compliance]

  [ Host de Docker ]
         │
         ├── Operación: `docker exec -it webapp /bin/bash`
         │
         ├── Capa Docker:
         │    └─> Emite evento 'exec_start' ──────────┐
         │                                            │
         └── Capa Kernel (auditd):                    │
              └─> Registra acceso a docker.sock ──────┤
                                                      │
                                                      ▼
                                           [ Agente Recolector ] (ej. Fluent-bit / Datadog Agent)
                                                      │ (Enriquecimiento con metadatos del host/nube)
                                                      ▼
                                       [ Sistema SIEM Inmutable ] (Splunk / AWS CloudTrail / S3)
                                                      │
                                                      └─> Dispara alertas de seguridad
                                                      └─> Genera reportes para Auditores (SOC2/PCI)

```

### Conclusión de la Sección

Implementar límites de recursos (10.2) y limpiezas automatizadas (10.1) asegura que tu infraestructura sobreviva a la carga técnica del día a día. Sin embargo, establecer un canal de auditoría estricto (10.4) es lo que asegura que tu empresa sobreviva a una auditoría legal o a una brecha de seguridad post-mortem. Un ingeniero Senior no solo diseña sistemas para que funcionen, los diseña para que sean transparentes y responsables de cada acción ejecutada en ellos.
