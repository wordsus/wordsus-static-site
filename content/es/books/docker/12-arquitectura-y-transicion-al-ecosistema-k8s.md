Dominar Docker es solo el inicio. En este capítulo final, elevamos la perspectiva desde el contenedor individual hacia el diseño de sistemas resilientes y escalables. Exploraremos la metodología de las **12-Factor Apps** y la **infraestructura inmutable** como pilares para construir software nativo de la nube. Analizaremos el rol estratégico de **Docker Swarm** frente a la complejidad de **Kubernetes**, desmitificaremos el cambio hacia *runtimes* como **Containerd** y aprenderemos a usar **Kompose** para transformar flujos de desarrollo locales en manifiestos listos para producción. Es el puente definitivo entre el despliegue artesanal y la orquestación profesional.

## 12.1. Aplicaciones de 12 factores (12-Factor Apps) contenerizadas

A lo largo de los capítulos anteriores, hemos dominado la mecánica de Docker: desde la construcción de imágenes eficientes y la gestión de redes, hasta la seguridad y el monitoreo. Sin embargo, dominar la herramienta no garantiza el éxito arquitectónico. Para que un contenedor no sea simplemente una "máquina virtual empaquetada", sino una pieza nativa de la nube lista para escalar en orquestadores como Kubernetes, la aplicación que reside en su interior debe diseñarse bajo ciertos principios.

Aquí es donde entra la metodología de las **12-Factor Apps** (Aplicaciones de 12 Factores). Creada originalmente por los ingenieros de Heroku, esta metodología es el estándar de oro para construir aplicaciones de software como servicio (SaaS) y arquitecturas *Cloud Native*.

A continuación, analizaremos cómo Docker nos permite cumplir e implementar cada uno de estos doce factores desde una perspectiva de DevOps Senior, preparándonos para la transición inminente a Kubernetes.

---

### I. Código base (Codebase)

**"Un código base rastreado en control de versiones, múltiples despliegues."**
En el ecosistema Docker, existe una relación directa de 1:1 entre un repositorio de Git, una imagen de Docker y su ciclo de vida. No debes tener múltiples repositorios para generar una sola imagen, ni un repositorio monolítico que genere imágenes no relacionadas sin una estrategia clara (monorepos con pipelines bien definidos). El código base es la única fuente de verdad, y los despliegues (Dev, QA, Prod) son simplemente instanciaciones de la imagen construida a partir de ese código base con diferentes configuraciones.

### II. Dependencias (Dependencies)

**"Declarar y aislar explícitamente las dependencias."**
Docker resuelve esto por naturaleza. Una aplicación de 12 factores nunca confía en la existencia implícita de herramientas en el sistema host. El `Dockerfile` es la manifestación definitiva de este factor. Gracias al uso de imágenes base específicas y a la instalación explícita de paquetes (como vimos en el Capítulo 3 con los *Multi-stage builds*), garantizamos un aislamiento absoluto.

### III. Configuraciones (Config)

**"Guardar la configuración en el entorno."**
Una violación clásica de este factor es "quemar" credenciales o URLs de bases de datos dentro de la imagen o en archivos de configuración estáticos. En Docker, la configuración que varía entre despliegues debe inyectarse puramente a través de variables de entorno (`ENV` en Dockerfile para valores por defecto, y la bandera `-e` o archivos `.env` en Compose durante la ejecución).

```yaml
# Anti-patrón: Configuración acoplada al código
# No utilizar archivos como config.prod.json dentro del contenedor.

# Patrón 12-Factor: Uso estricto del entorno
services:
  api:
    image: mi-empresa/api:v2.1.0
    environment:
      - DB_HOST=${DB_HOST}
      - LOG_LEVEL=warn

```

### IV. Servicios de respaldo (Backing services)

**"Tratar los servicios de respaldo como recursos conectables."**
Bases de datos, cachés (Redis), colas de mensajería (RabbitMQ) o servicios SMTP no deben estar fuertemente acoplados a la aplicación. Para el contenedor, la base de datos es solo una URL inyectada por el entorno (Factor III). Si mañana migras tu base de datos local (en un contenedor de la red `bridge`) a un servicio gestionado como Amazon RDS, el contenedor de tu aplicación no debe requerir ninguna reconstrucción, solo un cambio en la variable de entorno.

### V. Construir, desplegar, ejecutar (Build, release, run)

**"Separar estrictamente las etapas de construcción y ejecución."**
Este es el flujo de trabajo fundamental de un pipeline CI/CD (Capítulo 7). Docker cristaliza esta separación mejor que cualquier otra tecnología:

```text
[ CÓDIGO FUENTE ] -> (Build) -> [ IMAGEN DOCKER ] -> (Release) -> [ REGISTRY + TAG ] -> (Run) -> [ CONTENEDOR EN SWARM/K8S ]

```

* **Build:** El `docker build` empaqueta el código.
* **Release:** La imagen se etiqueta de forma inmutable y se empuja al Registry.
* **Run:** El orquestador hace un `docker run` en el entorno de destino.
Es imposible (y una pésima práctica) alterar el código en la etapa de ejecución (`docker exec` para parchear código en producción está estrictamente prohibido en esta metodología).

### VI. Procesos (Processes)

**"Ejecutar la aplicación como uno o más procesos sin estado."**
Los contenedores deben ser efímeros. Cualquier dato que necesite persistir debe almacenarse en un servicio de respaldo con estado (Factor IV) o en un volumen externo (como vimos en el Capítulo 4). Si tu contenedor guarda sesiones de usuario en su sistema de archivos local o en memoria, fallará catastróficamente al intentar escalar horizontalmente detrás de un balanceador de carga.

### VII. Asignación de puertos (Port binding)

**"Publicar servicios mediante asignación de puertos."**
La aplicación dentro del contenedor no debe depender de un servidor web externo (como un Apache instalado en el host) para enrutar el tráfico. La aplicación misma debe escuchar en un puerto determinado (ej. un microservicio en Node.js escuchando en el puerto 8080). La instrucción `EXPOSE` y el mapeo de puertos de Docker (`-p 80:8080`) manejan la interfaz con el mundo exterior.

### VIII. Concurrencia (Concurrency)

**"Escalar mediante el modelo de procesos."**
En lugar de crear un contenedor masivo que ejecute múltiples servicios y procesos internos (violando el principio de un proceso por contenedor), la concurrencia se logra escalando horizontalmente. Si necesitas más capacidad de procesamiento asíncrono, no aumentas los hilos internos del contenedor web; despliegas réplicas de un contenedor tipo *worker* dedicado.

### IX. Desechabilidad (Disposability)

**"Maximizar la robustez con inicios rápidos y apagados elegantes (graceful shutdowns)."**
Fundamental para la orquestación. Los orquestadores como Kubernetes destruyen y crean contenedores constantemente. Tu aplicación debe:

1. **Iniciar rápido:** Evitar inicializaciones lentas en el arranque del contenedor.
2. **Apagar limpiamente:** Capturar señales del sistema operativo (como `SIGTERM`), cerrar conexiones a la base de datos de manera ordenada y terminar. Como vimos en el Capítulo 11, un mal manejo del PID 1 puede causar que el contenedor ignore la señal `SIGTERM`, forzando a Docker a enviar un `SIGKILL` después de 10 segundos, corrompiendo transacciones en vuelo.

### X. Paridad en desarrollo y producción (Dev/prod parity)

**"Mantener desarrollo, staging y producción tan similares como sea posible."**
Este es el superpoder principal de Docker. Atrás quedaron los días de *"en mi máquina funciona"*. Al utilizar la misma imagen inmutable (`mi-app:1.2.3`) en el portátil del desarrollador (vía Docker Compose) y en los clústeres de producción, cerramos la brecha de comportamiento, tiempo y personal.

### XI. Historiales (Logs)

**"Tratar los logs como flujos de eventos (event streams)."**
Como se abordó en el Capítulo 9, un contenedor jamás debe preocuparse por rotar archivos de log, comprimirlos o enviarlos a un servidor. La aplicación debe imprimir sus eventos estrictamente a la salida estándar (`stdout`) y error estándar (`stderr`). El demonio de Docker y sus *logging drivers* (y posteriormente recolectores como Fluentd en K8s) se encargarán del enrutamiento, almacenamiento y análisis.

### XII. Procesos de administración (Admin processes)

**"Ejecutar tareas de administración/gestión como procesos únicos."**
Las tareas como migraciones de bases de datos o scripts de limpieza (REPLs) no deben ejecutarse entrando mediante SSH al host ni manipulando el contenedor en ejecución. Deben ejecutarse en un contenedor efímero a partir de la misma imagen y configuración que la aplicación principal.

```bash
# Ejecución correcta de un proceso de administración (ej. migración de DB)
docker run --rm --env-file .env.prod mi-empresa/api:v2.1.0 npm run db:migrate

```

---

**Conclusión de la sección:**
Evaluar tu aplicación bajo el lente de los 12 factores no es un ejercicio teórico; es un *checklist* obligatorio antes de dar el salto a arquitecturas distribuidas complejas. Un contenedor que respeta estos principios es un componente "elástico", preparado para ser desplegado, destruido, replicado y movido a través de los nodos de un clúster de Kubernetes sin ninguna intervención manual.

## 12.2. Infraestructura Inmutable como filosofía principal

Si la metodología de las *12-Factor Apps* define cómo debemos estructurar nuestra aplicación, la **Infraestructura Inmutable** dicta cómo debemos gestionar el entorno donde esta se ejecuta. En el viaje de "Cero a Senior", comprender y abrazar la inmutabilidad es el punto de inflexión definitivo que separa a un administrador de sistemas tradicional de un ingeniero Cloud Native.

Tradicionalmente, los servidores se gestionaban como infraestructura **mutable**. Si había que actualizar una librería, parchear una vulnerabilidad o cambiar un archivo de configuración, un operador accedía por SSH al servidor de producción y ejecutaba los comandos necesarios (o en el mejor de los casos, usaba herramientas como Ansible o Chef para hacerlo).

Este enfoque genera lo que en DevOps conocemos como **"Servidores Copo de Nieve" (Snowflake Servers)**: cada servidor se vuelve único, irrepetible y frágil. Con el tiempo, la configuración real del servidor se desvía de lo que está documentado o automatizado, un fenómeno conocido como *Configuration Drift* (Deriva de la configuración).

### El Cambio de Paradigma: Mascotas vs. Ganado (Pets vs. Cattle)

Para entender la infraestructura inmutable, debemos recurrir a la analogía más famosa del ecosistema DevOps:

* **Servidores como Mascotas (Mutable):** Tienen nombres propios (ej. `db-master-gandalf`), los cuidas cuando enferman (te conectas por SSH a arreglarlos) y su pérdida es una tragedia que requiere intervención manual extensa.
* **Servidores como Ganado (Inmutable):** Tienen números (ej. `web-node-a4b9`), son idénticos entre sí, y si uno "enferma" o falla, no lo curas: lo destruyes y lo reemplazas por uno nuevo exactamente igual.

En una infraestructura inmutable, **una vez que un componente se despliega, jamás se modifica**. Si se requiere un cambio (código, dependencias, sistema operativo), se construye una imagen completamente nueva y el componente antiguo es reemplazado por el nuevo.

### Docker: El vehículo perfecto para la inmutabilidad

Docker está diseñado desde sus cimientos para forzar esta filosofía. Como vimos en el Capítulo 3, las imágenes de Docker son de solo lectura (Read-Only). Cuando inicias un contenedor, Docker añade una fina capa de escritura superior, pero la filosofía de inmutabilidad exige que **no utilicemos esa capa para cambios persistentes**.

```text
+---------------------------------------------------------+
|      Flujo Mutable (El Anti-Patrón en Docker)           |
+---------------------------------------------------------+
1. docker run mi-app:v1
2. docker exec -it <id> /bin/sh
3. apt-get update && apt-get install lib-nueva            <-- ¡Peligro!
4. nano config.js                                         <-- ¡Configuration Drift!

+---------------------------------------------------------+
|      Flujo Inmutable (El Estándar Senior)               |
+---------------------------------------------------------+
1. Modificar Dockerfile y código en Git.
2. docker build -t mi-app:v2 .
3. docker push mi-app:v2
4. docker stop <id_v1> && docker rm <id_v1>
5. docker run mi-app:v2                                   <-- Despliegue limpio

```

El uso de `docker exec` para alterar el estado interno de un contenedor en producción es considerado un "pecado capital" en DevOps. Si modificas un contenedor en ejecución y este se reinicia o el nodo físico muere, todos tus cambios se perderán, devolviendo al contenedor al estado de su imagen base.

### Beneficios Críticos de la Inmutabilidad

Adoptar la inmutabilidad a través de contenedores aporta ventajas inmediatas a nivel de arquitectura:

1. **Certeza y Previsibilidad Absoluta:** Lo que testeas en tu pipeline de CI/CD es exactamente, bit por bit, lo que se ejecutará en producción. Eliminas por completo la incertidumbre de si el entorno de producción tiene las mismas dependencias que el entorno de *Staging*.
2. **Rollbacks Triviales e Inmediatos:** Si la versión `v2.0` falla en producción, no necesitas ejecutar scripts de desinstalación o revertir migraciones de sistema operativo. El *rollback* consiste simplemente en destruir el contenedor actual e instanciar uno nuevo usando la imagen `v1.9`.
3. **Seguridad Mejorada (Superficie de ataque estática):** Al combinar la inmutabilidad con contenedores *Rootless* (Capítulo 8) e imágenes *Distroless* (Capítulo 11), y montar el sistema de archivos principal como solo lectura (`docker run --read-only`), haces que sea extremadamente difícil para un atacante inyectar malware persistente, ya que no puede escribir en el disco del contenedor.
4. **Escalado Horizontal sin Fricción:** Como los contenedores no guardan estado local ni configuraciones únicas, el orquestador puede lanzar 10 o 100 réplicas idénticas en segundos sin miedo a inconsistencias.

### Preparando el terreno para Kubernetes

Entender la infraestructura inmutable no es opcional si tu objetivo es dominar Kubernetes. En Kubernetes, la unidad mínima de despliegue (el *Pod*) es inherentemente efímera. Kubernetes asume que los Pods pueden morir, ser expulsados de un nodo por falta de recursos (Eviction) o ser reprogramados en otro servidor en cualquier milisegundo.

Si tu aplicación y tu arquitectura dependen de la mutabilidad (guardar archivos locales, parchear en caliente, configuraciones manuales post-despliegue), tu transición al ecosistema Kubernetes será un fracaso absoluto, plagado de pérdida de datos e inestabilidad. Docker nos enseña la disciplina de la inmutabilidad; Kubernetes simplemente la exige como requisito de entrada.

## 12.3. Docker Swarm: Cuándo usarlo y cuándo evitarlo

Una vez que hemos empaquetado nuestra aplicación siguiendo los 12 factores (12.1) y hemos adoptado la mentalidad de infraestructura inmutable (12.2), surge el siguiente desafío logístico: ¿Cómo gestionamos cientos de contenedores efímeros repartidos en múltiples servidores físicos o virtuales? Necesitamos un **orquestador**.

Históricamente, la "guerra de la orquestación" tuvo tres grandes contendientes: Apache Mesos, Docker Swarm y Kubernetes. Como sabrás hoy en día, Kubernetes ganó la batalla por goleada y se convirtió en el estándar de la industria. Sin embargo, descartar a Docker Swarm por completo es un error de novato. Un ingeniero DevOps Senior sabe elegir la herramienta adecuada para el problema adecuado, y Swarm sigue siendo una pieza brillante de ingeniería.

Docker Swarm es el orquestador nativo integrado directamente en el motor de Docker. No requiere instalaciones adicionales; si tienes Docker instalado, ya tienes Swarm.

A continuación, analizaremos su arquitectura base y definiremos pragmáticamente cuándo es tu mejor opción y cuándo debes huir de él hacia Kubernetes.

### Arquitectura simplificada de Swarm

Swarm transforma un grupo de motores Docker independientes en un único clúster virtual. Utiliza una arquitectura de clúster descentralizada basada en dos roles:

```text
                      +-----------------------------------+
                      |          DOCKER SWARM             |
                      +-----------------------------------+
                                       |
          +----------------------------+----------------------------+
          |                            |                            |
+-------------------+        +-------------------+        +-------------------+
|  MANAGER NODE 1   |        |  MANAGER NODE 2   |        |  MANAGER NODE 3   |
|  (Líder Raft)     |<------>|  (Réplica Raft)   |<------>|  (Réplica Raft)   |
+-------------------+        +-------------------+        +-------------------+
          |                            |                            |
          +----------------------------+----------------------------+
                                       | (Despliegue de Tareas)
          +----------------------------+----------------------------+
          |                            |                            |
+-------------------+        +-------------------+        +-------------------+
|   WORKER NODE A   |        |   WORKER NODE B   |        |   WORKER NODE C   |
| [Contenedor Web]  |        | [Contenedor API]  |        | [Contenedor DB]   |
| [Contenedor Web]  |        | [Contenedor API]  |        | [Contenedor Web]  |
+-------------------+        +-------------------+        +-------------------+

```

* **Managers:** Mantienen el estado del clúster mediante el algoritmo de consenso *Raft*, despachan tareas a los *workers* y exponen la API de Swarm.
* **Workers:** Su única misión es ejecutar los contenedores (llamados "tareas" o *tasks* en la jerga de Swarm) que los Managers les asignan.

### Cuándo USAR Docker Swarm (Tus "Green Flags")

1. **Transición rápida desde Docker Compose:** Si tu equipo ya domina `docker-compose.yml` (Capítulo 6), el salto a Swarm es casi transparente. Swarm utiliza la misma especificación de Compose (con la adición del bloque `deploy`). Puedes orquestar un clúster de producción con los mismos archivos que usas en desarrollo.
2. **Equipos pequeños y falta de "Platform Engineers":** Kubernetes es un monstruo complejo que requiere un equipo dedicado para mantener el clúster (actualizaciones de *control plane*, rotación de certificados de etcd, gestión de CNI/CSI). Si eres el único DevOps o sysadmin en una startup, Swarm te da alta disponibilidad, balanceo de carga nativo y *rolling updates* en minutos, sin sobrecarga operativa.
3. **Entornos con recursos limitados (Edge Computing/IoT):** El agente de Kubernetes (Kubelet) y su ecosistema consumen una cantidad significativa de CPU y memoria solo por existir. Swarm, al estar integrado en el demonio de Docker, es extremadamente ligero. Es ideal para clústeres de Raspberry Pis, dispositivos *Edge* o servidores muy limitados.
4. **Sistemas aislados (Air-gapped) o puramente locales:** Montar un clúster de Swarm *on-premise* sin acceso a internet es trivial: `docker swarm init` en el manager y `docker swarm join` en los workers. Listo.

### Cuándo EVITAR Docker Swarm (Tus "Red Flags")

1. **Arquitecturas Complejas y Microservicios a gran escala:** A medida que creces, las limitaciones de Swarm se hacen evidentes. Carece de un ecosistema rico para inyección de *sidecars* (como Istio para Service Mesh) o control granular de red avanzado a nivel de pod.
2. **Ecosistema y Herramientas de Terceros:** El ecosistema *Cloud Native* (CNCF) construye herramientas para Kubernetes. Si quieres usar Prometheus Operator, ArgoCD para GitOps, Helm charts prefabricados, o Cert-Manager, descubrirás que el soporte para Swarm es nulo, mantenido por la comunidad (y a menudo abandonado) o requiere integraciones manuales dolorosas.
3. **Gestión avanzada de persistencia (Stateful Workloads):** Aunque Swarm soporta volúmenes, la gestión del almacenamiento distribuido o dinámico (equivalente a los *Persistent Volume Claims* y *Storage Classes* de K8s) es rudimentaria y propensa a fallos si un nodo muere y el volumen no está respaldado por una red de área de almacenamiento (SAN) muy bien configurada.
4. **Automatización e Infraestructura como Código (IaC) moderna:** Kubernetes funciona mediante un modelo de estado deseado altamente declarativo basado en la API (*Custom Resource Definitions* - CRDs). Swarm es más imperativo en su manejo subyacente. Herramientas como Terraform tienen proveedores mucho más maduros y flexibles para Kubernetes.

### Cuadro Comparativo de Decisión

| Característica | Docker Swarm | Kubernetes (K8s) |
| --- | --- | --- |
| **Curva de Aprendizaje** | Muy baja (horas/días) | Muy empinada (semanas/meses) |
| **Complejidad de Instalación** | Trivial (integrado en Docker) | Compleja (Requiere Kubeadm, Kubespray o Managed Cloud) |
| **Consumo de Recursos (Overhead)** | Muy bajo | Alto |
| **Ecosistema / Extensibilidad** | Estancado / Limitado | Masivo (CNCF), estándar de la industria |
| **Auto-escalado de nodos (Cloud)** | Difícil/Manual | Nativo (Cluster Autoscaler, Karpenter) |
| **Definición de despliegue** | `docker-compose.yml` | Manifiestos YAML, Helm, Kustomize |

**Conclusión de la sección:**
No cometas el error de migrar a Kubernetes simplemente por "currículum" (Hype-Driven Development) si tu aplicación solo consta de un backend de Node.js, un frontend de React y una base de datos PostgreSQL. Para el 60% de las aplicaciones pequeñas y medianas, Docker Swarm es más que suficiente y te ahorrará meses de dolores de cabeza operativos.

Sin embargo, si tu empresa está apuntando a un crecimiento exponencial, necesitas una separación estricta de responsabilidades entre equipos, o planeas desplegar docenas de microservicios interconectados, Swarm será un cuello de botella. En ese caso, es hora de mirar hacia adelante.

## 12.4. El rol actual de Docker frente a Containerd y CRI-O

A finales del año 2020, la comunidad DevOps sufrió un pequeño ataque de pánico colectivo. Internet se llenó de titulares sensacionalistas que proclamaban: *"Kubernetes abandona Docker"*. Muchos ingenieros asumieron que todo lo que habían aprendido sobre Docker se había vuelto obsoleto de la noche a la mañana.

La realidad era mucho menos dramática y mucho más interesante a nivel arquitectónico. Para entender tu rol como DevOps Senior en el ecosistema actual, debemos diseccionar qué significa realmente ese "abandono" y cómo se posiciona Docker hoy frente a tecnologías como **Containerd** y **CRI-O**.

### La deconstrucción del monolito: Docker no es una sola cosa

En sus inicios, Docker era un monolito masivo. Hacía absolutamente todo: proporcionaba la CLI para el usuario, construía las imágenes, descargaba los binarios, gestionaba los volúmenes, configuraba la red y ejecutaba los procesos.

Sin embargo, a medida que la industria maduró, se establecieron estándares a través de la **OCI (Open Container Initiative)**. Docker, demostrando un excelente liderazgo técnico, comenzó a desmembrar su monolito, donando sus piezas fundamentales a la comunidad:

1. **`runc`:** El componente de más bajo nivel. Es la herramienta que literalmente habla con el kernel de Linux (cgroups y namespaces) para crear el contenedor.
2. **`containerd`:** Un demonio de nivel intermedio que gestiona el ciclo de vida completo del contenedor (descarga de imágenes, ejecución de `runc`, gestión de almacenamiento e interfaces de red).

Por lo tanto, cuando instalas Docker hoy, en realidad estás instalando una interfaz amigable (Docker CLI + Docker API) que por debajo utiliza `containerd`, que a su vez utiliza `runc`.

### El problema con Kubernetes: El nacimiento de CRI

Cuando Kubernetes comenzó a dominar la orquestación, utilizaba Docker como su motor de contenedores predeterminado. Pero había un problema de diseño: Kubernetes no necesitaba la CLI de Docker, ni su constructor de imágenes, ni la gestión de volúmenes de Docker. Solo necesitaba ejecutar contenedores.

Tener todo el motor de Docker (`dockerd`) corriendo en cada nodo de Kubernetes solo para llegar a `containerd` era ineficiente, pesado y añadía una superficie de ataque innecesaria.

Para solucionar esto, Kubernetes creó la **CRI (Container Runtime Interface)**, un estándar que permite a K8s comunicarse con cualquier motor de contenedores de forma agnóstica. Como Docker no era compatible con CRI de forma nativa, Kubernetes tuvo que mantener un "parche" llamado `dockershim` para traducir las órdenes de K8s a Docker.

El famoso titular *"Kubernetes abandona Docker"* simplemente significaba que Kubernetes iba a eliminar el parche `dockershim`. Kubernetes pasaría a hablar directamente mediante la interfaz CRI.

### Containerd y CRI-O: Los nuevos reyes de la producción

Al eliminar a Docker como intermediario en Kubernetes, surgieron dos grandes alternativas como *runtimes* de producción, ambas 100% compatibles con CRI y los estándares OCI:

1. **Containerd:** Como ya mencionamos, es el "motor" extraído del propio Docker. Al adoptar Containerd en Kubernetes, estás ejecutando exactamente el mismo código subyacente que usa Docker, pero sin toda la carga (CLI, constructores, etc.) que K8s no necesita. Es el estándar de facto actual en la mayoría de servicios *Cloud* (EKS, AKS, GKE).
2. **CRI-O:** Desarrollado principalmente por Red Hat e IBM, CRI-O fue creado desde cero con un único propósito: ser el *runtime* más ligero y seguro exclusivamente para Kubernetes. No tiene utilidades extra, no intenta ser amigable para humanos; es puro código para que Kubelet (el agente de K8s) ejecute contenedores. Es el motor por defecto en plataformas como OpenShift.

A continuación, un diagrama que ilustra esta evolución arquitectónica en los nodos de Kubernetes:

```text
+-------------------------------------------------------------------+
|                     Evolución del Runtime en K8s                  |
+-------------------------------------------------------------------+

1. LA ERA DOCKER (Con dockershim - Obsoleto)
[ Kubelet ] ---> [ dockershim ] ---> [ dockerd ] ---> [ containerd ] ---> [ runc ]
                   (Parche)        (Peso muerto)

2. LA ERA ACTUAL (Containerd puro)
[ Kubelet ] ---> [ CRI plugin ] --------------------> [ containerd ] ---> [ runc ]
                                                       (Eficiente)

3. LA ALTERNATIVA MINIMALISTA (CRI-O)
[ Kubelet ] ----------------------------------------> [   CRI-O    ] ---> [ runc ]
                                                     (Solo para K8s)

```

### Entonces, ¿Para qué sirve Docker hoy?

Si Kubernetes ya no usa Docker en producción, ¿hemos perdido el tiempo en los 11 capítulos anteriores? En absoluto. **Las imágenes que construye Docker son imágenes estándar OCI.** Una imagen construida con `docker build` en tu portátil se ejecutará perfectamente en un clúster de Kubernetes usando Containerd o CRI-O.

El rol de Docker ha evolucionado, pero sigue siendo el pilar de la filosofía DevOps. Hoy en día, las responsabilidades se dividen claramente:

* **El Dominio de Docker (Desarrollo y CI/CD):** Docker es la herramienta definitiva para los humanos. Es lo que instalan los desarrolladores en sus portátiles (Docker Desktop). Es la sintaxis que usamos para empaquetar software (`Dockerfile`). Es el motor que usamos en Docker Compose para levantar entornos locales y es la herramienta que ejecuta los pipelines de construcción en GitLab CI, GitHub Actions o Jenkins.
* **El Dominio de Containerd/CRI-O (Producción Orquestada):** Son herramientas para máquinas. Son los motores silenciosos, invisibles y altamente optimizados que ejecutan esas imágenes a gran escala en los nodos de Kubernetes.

Como DevOps Senior, tu trabajo es usar la ergonomía y potencia de Docker para la **construcción y prueba** de la infraestructura inmutable (Capítulo 12.2), y confiar en Containerd/CRI-O para la **ejecución** eficiente de esas mismas cargas de trabajo en tus clústeres de producción. Entender dónde termina uno y empieza el otro es fundamental para diseñar *pipelines* eficientes y clústeres seguros.

## 12.5. De Docker Compose a Kubernetes: Preparando manifiestos con Kompose

Llegamos al puente final de nuestro viaje. A estas alturas, dominas la creación de entornos multicontenedor con `docker-compose.yml` (Capítulo 6), has estructurado tu aplicación bajo los 12 factores (12.1) y comprendes por qué Kubernetes (K8s) utiliza Containerd o CRI-O bajo el capó (12.4). El siguiente paso lógico es desplegar tu aplicación en Kubernetes.

Sin embargo, aquí nos topamos con la "Gran Muralla del YAML".

Mientras que Docker Compose te permite definir redes, volúmenes y múltiples servicios en un único archivo YAML altamente legible de 30 líneas, Kubernetes requiere una verbosidad mucho mayor. En K8s, cada concepto es un objeto independiente (un *Resource*) que requiere su propio manifiesto YAML: *Deployments*, *Services*, *PersistentVolumeClaims* (PVCs), *ConfigMaps*, *Secrets*, *Ingresses*, etc.

Traducir mentalmente un `docker-compose.yml` complejo a manifiestos nativos de Kubernetes puede ser abrumador al principio. Para suavizar esta curva de aprendizaje y acelerar la migración, la comunidad de Kubernetes incubó una herramienta vital: **Kompose**.

### ¿Qué es Kompose?

Kompose es una herramienta oficial de migración que toma un archivo `docker-compose.yml` y lo traduce automáticamente a los recursos equivalentes de Kubernetes. Su filosofía es simple: *"Trae tu Docker Compose, nosotros te damos Kubernetes"*.

El mapeo conceptual que realiza Kompose bajo el capó es fundamental para entender la arquitectura de K8s:

| Concepto en Docker Compose | Traducción en Kubernetes (Kompose) |
| --- | --- |
| `services` (ej. `web`, `db`) | `Deployment` (y `Pod` mediante un *ReplicaSet*) |
| `ports: ["80:8080"]` | `Service` (Típicamente tipo *ClusterIP* o *LoadBalancer*) |
| `volumes: ["datos:/var/lib/mysql"]` | `PersistentVolumeClaim` (PVC) |
| `environment` o `env_file` | `ConfigMap` o `Secret` |
| `deploy.replicas: 3` | Campo `replicas: 3` en el `Deployment` |

### Ejemplo Práctico de Migración

Imaginemos un archivo `docker-compose.yml` clásico para una aplicación web con una caché en Redis:

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: mi-empresa/frontend:v2.0
    ports:
      - "8080:80"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data

volumes:
  redis-data:

```

Para convertir este entorno, simplemente instalamos la CLI de Kompose en nuestra máquina y ejecutamos el comando de conversión en el mismo directorio donde reside el archivo Compose:

```bash
$ kompose convert
INFO Kubernetes file "web-service.yaml" created         
INFO Kubernetes file "web-deployment.yaml" created      
INFO Kubernetes file "redis-deployment.yaml" created    
INFO Kubernetes file "redis-data-persistentvolumeclaim.yaml" created 

```

Como por arte de magia, Kompose ha diseccionado nuestro archivo único en cuatro manifiestos nativos de Kubernetes. Si inspeccionamos el archivo `web-deployment.yaml` generado, veremos la estructura estándar de K8s:

```yaml
# web-deployment.yaml generado por Kompose
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: web
  template:
    metadata:
      labels:
        io.kompose.service: web
    spec:
      containers:
        - env:
            - name: REDIS_HOST
              value: redis
          image: mi-empresa/frontend:v2.0
          name: web
          ports:
            - containerPort: 80

```

A partir de este momento, podrías desplegar la aplicación en tu clúster (por ejemplo, en Minikube o un clúster de EKS) usando la herramienta nativa de Kubernetes: `kubectl apply -f .`

### La perspectiva Senior: Limitaciones y Mejores Prácticas

Como ingeniero DevOps, es crucial que no veas a Kompose como una "caja negra mágica" para enviar aplicaciones directamente a producción. Kompose es un **traductor y un acelerador de aprendizaje**, pero tiene limitaciones inherentes:

1. **No conoce tu infraestructura subyacente:** Kompose creará un PVC genérico para tu volumen de Redis, pero no sabe si en producción prefieres usar un disco SSD de AWS (gp3) o almacenamiento en red (NFS). Eso requiere ajustar el campo `storageClassName` manualmente.
2. **Ignora configuraciones muy específicas de Compose:** Ciertas directivas de *build* locales o configuraciones avanzadas de red (drivers macvlan) no tienen una traducción directa 1:1 en K8s y serán ignoradas o lanzarán advertencias durante la conversión.
3. **Falta de objetos avanzados de K8s:** Kompose no generará automáticamente un *Ingress* sofisticado con terminación TLS, ni configurará reglas de anti-afinidad (*Anti-Affinity*) para asegurar que tus réplicas de Node.js caigan en nodos físicos distintos, ni creará *NetworkPolicies* de seguridad profunda.

**El flujo de trabajo recomendado (El "Golden Path"):**

1. Usa `docker-compose.yml` para el desarrollo local; es insuperable en ergonomía.
2. Usa `kompose convert` como tu primer borrador (Boilerplate) cuando decidas migrar un servicio a Kubernetes.
3. Audita, limpia y refina manualmente los archivos YAML generados. Añade *Liveness/Readiness probes* y cuotas de recursos (CPU/RAM).
4. Finalmente, empaqueta esos manifiestos mejorados utilizando gestores de paquetes nativos de K8s como **Helm** o herramientas de superposición como **Kustomize** para inyectarlos en tu pipeline de CI/CD (GitOps).

---

## Conclusión del Libro

Has llegado al final de **"Docker para DevOps: De Cero a Senior"**.

Comenzamos explorando los oscuros callejones de los *namespaces* y *cgroups* del kernel de Linux, y hemos escalado hasta arquitecturas inmutables, *pipelines* distribuidos y la frontera con Kubernetes.

El ecosistema de contenedores seguirá evolucionando, nacerán nuevas herramientas y los orquestadores cambiarán de nombre. Sin embargo, los fundamentos que has adquirido en estas páginas —la persistencia, el aislamiento de red, la seguridad sin privilegios, la observabilidad y las metodologías de 12 factores— son conocimientos agnósticos y atemporales.

Ya no eres un usuario que simplemente ejecuta `docker run` y cruza los dedos. Ahora comprendes el motor bajo el capó, sabes cómo diagnosticar sus fallos a bajo nivel y, lo más importante, tienes el criterio arquitectónico para diseñar sistemas resilientes a gran escala.

Bienvenido a la ingeniería *Cloud Native*.
