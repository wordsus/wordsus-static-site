La inmutabilidad es el pilar de la infraestructura moderna: una imagen de contenedor debe ser la misma en desarrollo y en producción. El desafío reside en cómo inyectar parámetros y credenciales sin comprometer la seguridad ni la portabilidad. En este capítulo, desglosaremos el uso de **ConfigMaps** para datos públicos y **Secrets** para información sensible. Evolucionaremos desde la inyección básica mediante variables de entorno hasta arquitecturas de nivel senior que integran **encriptación en reposo** y bóvedas externas como **HashiCorp Vault**. Aprenderás a desacoplar la lógica del entorno, garantizando un despliegue seguro, auditable y escalable en Kubernetes.

## 6.1 ConfigMaps: Inyección de configuración mediante variables de entorno y volúmenes

Uno de los principios fundamentales de la metodología *Twelve-Factor App* es la estricta separación entre el código de la aplicación y su configuración. Un contenedor bien diseñado debe ser inmutable; la misma imagen de contenedor (el artefacto construido) debe poder ejecutarse en los entornos de desarrollo, *staging* y producción sin sufrir modificaciones. Aquí es donde entran en juego los **ConfigMaps**.

Un ConfigMap es un objeto de la API de Kubernetes diseñado para almacenar datos no confidenciales en pares clave-valor. Su propósito principal es desacoplar la configuración específica del entorno de las imágenes de los contenedores, lo que permite que tus aplicaciones sean verdaderamente portables.

> **Nota de seguridad:** Los ConfigMaps no proporcionan encriptación ni ocultación. Deben usarse exclusivamente para datos en texto plano como URLs de bases de datos, niveles de log, archivos de configuración (como un `nginx.conf`) o banderas de ejecución. Para credenciales o tokens, delegaremos la responsabilidad a los *Secrets*, que abordaremos en la sección 6.2.

A nivel de arquitectura, los ConfigMaps se almacenan en la base de datos distribuida del clúster (`etcd`) y el componente `kubelet` de cada nodo de trabajo es el encargado de materializarlos dentro de los Pods. Existen dos estrategias principales para inyectar esta configuración: variables de entorno y volúmenes.

### Anatomía de un ConfigMap

Antes de inyectarlo, debemos definirlo. Aunque puedes generar ConfigMaps imperativamente usando `kubectl create configmap`, en un entorno DevOps y GitOps (como veremos en el Capítulo 11), siempre trabajaremos de forma declarativa:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: produccion
data:
  # Claves simples para variables de entorno
  LOG_LEVEL: "info"
  DB_HOST: "database.internal.svc.cluster.local"
  
  # Archivos completos para montar como volúmenes
  game.properties: |
    enemies=aliens
    lives=3
    secret.code.allowed=true

```

### Estrategia 1: Inyección mediante Variables de Entorno

La inyección por variables de entorno es la forma más directa y común para aplicaciones nativas de la nube que leen su configuración al arrancar.

Puedes inyectar claves individuales usando `valueFrom`, o volcar todo el contenido del ConfigMap en el entorno del contenedor utilizando `envFrom`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: backend-app
spec:
  containers:
    - name: node-app
      image: node:18-alpine
      env:
        # Inyección de una clave específica
        - name: DATABASE_ENDPOINT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_HOST
      envFrom:
        # Inyección de todas las claves como variables
        - configMapRef:
            name: app-config

```

**Consideraciones operativas:**

* **Evaluación al inicio:** Las variables de entorno se resuelven en el momento en que se crea el contenedor.
* **Ausencia de actualizaciones dinámicas:** Si el ConfigMap original se modifica, el contenedor *no* verá los cambios reflejados en sus variables de entorno. Para aplicar los cambios, el Pod debe ser reiniciado (por ejemplo, mediante un *rollout restart* del Deployment que lo gestiona).

### Estrategia 2: Inyección mediante Volúmenes

Cuando tu aplicación espera leer un archivo de configuración del sistema de archivos (por ejemplo, un servidor web leyendo `nginx.conf` o una aplicación Java leyendo `application.properties`), debes montar el ConfigMap como un volumen.

En este modelo, cada clave del ConfigMap se convierte en un archivo dentro del directorio montado, y el valor de la clave se convierte en el contenido del archivo.

```text
[ ConfigMap ] --> [ Definición de Volumen ] --> [ Montaje en el Contenedor ]
Clave: config.yml     name: config-vol             mountPath: /app/config/
Valor: "port: 80"                                  Archivo resultante: /app/config/config.yml

```

El manifiesto para lograr esto requiere dos partes: definir el volumen a nivel del Pod y montarlo a nivel del contenedor:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
    - name: nginx
      image: nginx:alpine
      volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/conf.d/
  volumes:
    - name: config-volume
      configMap:
        name: app-config

```

**Consideraciones operativas:**

* **Actualizaciones dinámicas:** A diferencia de las variables de entorno, cuando montas un ConfigMap como volumen en un directorio, `kubelet` se encarga de mantener los archivos sincronizados. Si actualizas el ConfigMap en la API de Kubernetes, el archivo dentro del contenedor se actualizará automáticamente (generalmente con un retraso de 1 a 2 minutos).
* **Recarga de aplicaciones:** Aunque el archivo cambie, tu aplicación debe estar diseñada para detectar este cambio en el sistema de archivos y recargar su configuración (hot-reloading), de lo contrario, seguirá usando en memoria la configuración antigua.

### Conceptos Avanzados (Nivel Senior)

Para dominar los ConfigMaps en entornos de producción complejos, debes comprender los siguientes mecanismos:

#### El uso de `subPath` para evitar la sobreescritura

Un error común al montar un ConfigMap en un directorio existente del contenedor (como `/etc/`) es que el montaje del volumen oculta todos los archivos que ya existían en ese directorio dentro de la imagen original. Si solo quieres inyectar un único archivo sin afectar el resto del directorio, debes usar `subPath`:

```yaml
      volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/nginx.conf # Ruta al archivo, no al directorio
          subPath: custom-nginx.conf       # Nombre de la clave en el ConfigMap

```

*Advertencia:* Los montajes realizados con `subPath` pierden la capacidad de actualización dinámica. Si el ConfigMap cambia, el archivo montado con `subPath` no se actualizará sin reiniciar el Pod.

#### ConfigMaps Inmutables

En clústeres a gran escala con miles de ConfigMaps y Pods, el proceso del `kubelet` que vigila constantemente los cambios en los ConfigMaps puede generar una carga significativa en el API Server. Si sabes que la configuración de una versión de tu aplicación nunca cambiará, puedes declarar el ConfigMap como inmutable:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v1
immutable: true
data:
  version: "1.0.0"

```

Esta práctica no solo mejora el rendimiento general del clúster (al cancelar los *watches* sobre este objeto), sino que también protege contra alteraciones accidentales que podrían causar una caída del servicio. Si necesitas cambiar la configuración, el patrón correcto es crear un nuevo ConfigMap (ej. `app-config-v2`) y actualizar el Deployment para que apunte a él.

#### Límites de tamaño

Dado que los ConfigMaps se almacenan directamente en `etcd`, están sujetos a sus limitaciones técnicas. El tamaño máximo absoluto de un ConfigMap es de **1 MiB**. Si necesitas inyectar archivos de configuración que superen este tamaño, estás frente a un anti-patrón; deberías considerar construir la configuración dentro de la imagen del contenedor, o utilizar un *init container* que descargue los archivos desde un almacenamiento externo (como un bucket S3) a un volumen de tipo `emptyDir` antes de que arranque la aplicación principal.

## 6.2 Secrets: Gestión básica de credenciales nativas

Si en la sección anterior establecimos que los ConfigMaps son el vehículo ideal para la configuración general, los **Secrets** son la respuesta nativa de Kubernetes para la inyección de información confidencial. Contraseñas de bases de datos, tokens de APIs, claves SSH y certificados TLS pertenecen estrictamente a este tipo de recurso.

A nivel de diseño, un Secret opera de manera casi idéntica a un ConfigMap: es un objeto de la API que almacena pares clave-valor y que puede inyectarse en los Pods mediante variables de entorno o volúmenes montados. Sin embargo, su propósito es aislar el material sensible para aplicar controles de acceso (RBAC) más estrictos y manejarlos de forma diferenciada en el plano de control.

> **⚠️ La gran advertencia de seguridad (El mito de la encriptación):**
> Es un error de concepto muy común (incluso en niveles intermedios) creer que los Secrets de Kubernetes son inherentemente seguros. Por defecto, **los datos en un Secret no están encriptados, solo están codificados en Base64**. Cualquiera con acceso al clúster para leer el Secret, o con acceso a la base de datos `etcd` subyacente, puede decodificar las credenciales instantáneamente. La verdadera seguridad requiere configuraciones adicionales que abordaremos en las secciones 6.3 y 6.4.

### Creación y Tipos de Secrets

La API de Kubernetes soporta varios tipos de Secrets predefinidos para facilitar integraciones específicas, aunque el más común es el de propósito general.

* `Opaque`: El tipo por defecto. Contiene pares clave-valor arbitrarios.
* `kubernetes.io/tls`: Diseñado para almacenar certificados y claves privadas (usado extensamente por Ingress Controllers).
* `kubernetes.io/dockerconfigjson`: Almacena credenciales para descargar imágenes desde *registries* privados (Docker Hub, ECR, GCR).
* `kubernetes.io/service-account-token`: Tokens autogenerados para Service Accounts (aunque las versiones modernas de K8s usan la API de TokenRequest).

#### El manifiesto: `data` vs `stringData`

Al definir un Secret declarativamente, Kubernetes requiere que los valores bajo el campo `data` estén codificados en Base64.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: produccion
type: Opaque
data:
  # 'admin' en base64
  username: YWRtaW4= 
  # 'supersecreto123' en base64
  password: c3VwZXJzZWNyZXRvMTIz 

```

Para facilitar la vida de los operadores y evitar tener que codificar manualmente cada valor al escribir manifiestos, Kubernetes introdujo el campo **`stringData`**. Este campo permite escribir los valores en texto plano; el API Server se encargará de convertirlos a Base64 automáticamente cuando el objeto sea guardado.

```yaml
# Mismo resultado que el anterior, pero más fácil de escribir
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: supersecreto123

```

*Nota operativa:* Cuando consultes este Secret más tarde usando `kubectl get secret db-credentials -o yaml`, el campo `stringData` no aparecerá; todo se mostrará bajo `data` ya codificado en Base64.

### Inyección de Secrets en los Pods

Al igual que los ConfigMaps, los Secrets se pueden entregar al contenedor de dos maneras.

#### 1. Inyección por Variables de Entorno

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: backend-api
spec:
  containers:
    - name: api
      image: mi-api:v1.2
      env:
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password

```

**Riesgo asociado (Perspectiva Senior):** Inyectar secretos como variables de entorno es una práctica común, pero conlleva riesgos arquitectónicos. Las variables de entorno pueden filtrarse fácilmente en mensajes de error de la aplicación, *crash dumps*, o ser visibles para cualquier proceso hijo dentro del contenedor (o herramientas de APM que capturen el entorno).

#### 2. Inyección por Volúmenes (El enfoque recomendado)

Montar los Secrets como archivos en un volumen es generalmente más seguro.

```text
+------------------+       +-------------------------+       +------------------------+
| API de K8s       |       | Worker Node (Kubelet)   |       | Contenedor (Pod)       |
|                  |       |                         |       |                        |
| Secret: db-creds | ----> | Crea volumen en memoria | ----> | Monta en: /etc/secrets |
| (Base64)         |       | (tmpfs). NUNCA en disco |       | - username             |
+------------------+       +-------------------------+       | - password             |
                                                             +------------------------+

```

Cuando montas un Secret mediante un volumen, `kubelet` crea un sistema de archivos temporal en memoria (**tmpfs**) respaldado por la RAM del nodo. **El secreto nunca se escribe en el disco duro físico del Worker Node**. Tan pronto como el Pod es destruido, el volumen `tmpfs` desaparece sin dejar rastro.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: backend-api
spec:
  containers:
    - name: api
      image: mi-api:v1.2
      volumeMounts:
        - name: secret-vol
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secret-vol
      secret:
        secretName: db-credentials

```

Al igual que con los ConfigMaps, si el Secret se actualiza en la API, el archivo montado en el volumen se actualizará dinámicamente, mientras que las variables de entorno permanecerán estáticas hasta que el Pod se reinicie.

### Prácticas de Gobernanza y GitOps

El mayor desafío con los Secrets nativos no es cómo inyectarlos, sino **cómo gestionarlos en el repositorio de código**. Si aplicamos la filosofía GitOps (que detallaremos en el Capítulo 11), todos nuestros manifiestos deben vivir en Git. Sin embargo, cometer un archivo YAML con un Secret —incluso si está codificado en Base64— es una brecha de seguridad crítica.

Las soluciones a este problema marcan la diferencia entre un entorno Junior y uno Senior, y nos preparan para las siguientes secciones:

1. Nunca commitear Secrets en texto plano ni en Base64 en repositorios públicos o privados.
2. Utilizar herramientas de sellado criptográfico (como *Sealed Secrets*).
3. Delegar la fuente de la verdad a un gestor de identidades externo e inyectarlos dinámicamente (lo que exploraremos a fondo en la sección 6.4).

## 6.3 Encriptación de secretos en reposo (etcd encryption)

Como advertimos en la sección anterior, el comportamiento predeterminado de Kubernetes es almacenar los Secrets en la base de datos `etcd` codificados en Base64. Esto significa que si un atacante logra acceso al sistema de archivos de los nodos del Plano de Control (Control Plane), obtiene una copia de seguridad de `etcd`, o explota una vulnerabilidad de lectura en el entorno, tendrá acceso inmediato a todas las contraseñas, tokens y certificados del clúster en texto plano.

Para mitigar este vector de ataque crítico, Kubernetes ofrece la **encriptación en reposo**. Esta funcionalidad asegura que los datos sensibles sean encriptados de forma transparente por el API Server *antes* de ser escritos en el disco de `etcd`.

### Arquitectura de la Encriptación

En este modelo, el `kube-apiserver` actúa como la frontera criptográfica. Los clientes (usuarios con `kubectl` o Pods) siguen interactuando con la API usando Secrets estándar (que el API Server muestra decodificados si el usuario tiene permisos RBAC), pero el almacenamiento subyacente está cifrado.

```text
+-----------+    Texto Plano     +----------------+    Cifrado (AES)   +--------------+
| Usuario / | -----------------> |                | -----------------> |              |
| Pod       | <----------------- | kube-apiserver | <----------------- | etcd (Disco) |
+-----------+                    +----------------+                    +--------------+
                                         |
                                [ Proveedor de Claves ]

```

### Configuración del Proveedor de Encriptación

Para habilitar esta característica, debemos proporcionar al `kube-apiserver` un archivo de configuración de tipo `EncryptionConfiguration`. Este archivo define qué recursos deben encriptarse y qué algoritmos (proveedores) utilizar.

Existen varios proveedores disponibles:

* **`identity`**: El valor por defecto. Escribe los datos en texto plano. Se usa para desactivar la encriptación o como *fallback*.
* **`aescbc`**: El estándar recomendado para encriptación local. Es rápido y seguro (AES-CBC con PKCS#7).
* **`secretbox`**: Utiliza el algoritmo Poly1305 y XSalsa20.
* **`kms` (Key Management Service)**: Delega la gestión de las claves a un proveedor externo (AWS KMS, Azure Key Vault, Google Cloud KMS). *Profundizaremos en esto en la sección 6.4.*

A continuación, se muestra un ejemplo de un archivo `encryption-config.yaml` configurado para usar `aescbc`:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              # La clave debe ser de 32 bytes codificada en Base64
              secret: +xyz123supersecretkeygeneratedbyadmin123456=
      # Siempre se debe incluir identity al final para poder leer secretos 
      # que fueron creados antes de habilitar la encriptación.
      - identity: {}

```

> **Consejo Senior:** La clave (`secret`) en este archivo debe generarse criptográficamente de forma segura, por ejemplo, usando `head -c 32 /dev/urandom | base64`.

### Implementación en el Clúster

Una vez creado el archivo, debe ubicarse en los nodos del Plano de Control (usualmente en `/etc/kubernetes/pki/` o un directorio similar seguro). Luego, se debe modificar el manifiesto estático del `kube-apiserver` (típicamente en `/etc/kubernetes/manifests/kube-apiserver.yaml`) para incluir la siguiente bandera de ejecución y montar el volumen del archivo:

```yaml
# Fragmento del manifiesto de kube-apiserver
spec:
  containers:
  - command:
    - kube-apiserver
    - --encryption-provider-config=/etc/kubernetes/pki/encryption-config.yaml
    # ... otras configuraciones ...

```

Al guardar este archivo, el componente `kubelet` del nodo maestro detectará el cambio y reiniciará automáticamente el API Server con la nueva configuración.

### Operaciones "Día 2": Encriptando Secretos Existentes

Un error muy común al implementar esta medida es asumir que el clúster ya está seguro tras reiniciar el API Server. **La encriptación en reposo solo se aplica a los objetos cuando son creados o actualizados.** Los Secrets que ya existían en `etcd` antes de habilitar la configuración seguirán estando en texto plano.

Para forzar la encriptación de todos los Secrets preexistentes, debes realizar una operación de lectura y reescritura masiva. Puedes lograr esto ejecutando el siguiente comando con credenciales de administrador de clúster:

```bash
kubectl get secrets --all-namespaces -o json | kubectl replace -f -

```

Este comando extrae todos los Secrets del clúster y los vuelve a insertar a través del API Server. Al pasar nuevamente por la frontera criptográfica, el API Server aplicará la nueva política y los escribirá en `etcd` utilizando el proveedor `aescbc`.

### Limitaciones de las Claves Locales

Si bien utilizar `aescbc` protege el disco de `etcd`, introduce un nuevo problema: **¿Cómo protegemos el archivo `encryption-config.yaml`?** Si un atacante roba el disco del nodo maestro, se llevará tanto la base de datos `etcd` como el archivo de configuración que contiene la clave para desencriptarla.

Para entornos verdaderamente empresariales y de alta seguridad, almacenar la clave de encriptación en el mismo servidor no es aceptable. La solución arquitectónica a este problema es la integración con proveedores KMS y bóvedas externas, el tema que abordaremos a continuación en la sección 6.4.

## 6.4 Integración con bóvedas externas (HashiCorp Vault, AWS Secrets Manager, External Secrets Operator)

A medida que una organización madura hacia un entorno DevOps empresarial, la gestión de secretos puramente nativa en Kubernetes —incluso con *etcd encryption*— empieza a mostrar sus limitaciones. Los equipos de seguridad y cumplimiento normativo suelen exigir:

1. **Centralización:** Un único lugar ("Fuente de la Verdad") para gestionar credenciales, no solo para Kubernetes, sino para bases de datos heredadas, CI/CD y servicios en la nube.
2. **Auditoría estricta:** Saber exactamente quién, cuándo y por qué se accedió a una contraseña.
3. **Rotación dinámica:** Capacidad de generar credenciales temporales con un tiempo de vida (TTL) corto.

Para resolver esto, la arquitectura "Senior" dicta que **Kubernetes no debe ser el dueño de los secretos, sino un mero consumidor de ellos.** Las bóvedas externas (Secret Managers) asumen el rol principal.

Existen dos patrones arquitectónicos dominantes para lograr esta integración: la sincronización de secretos y la inyección directa mediante volúmenes CSI.

### Patrón 1: Sincronización con External Secrets Operator (ESO)

El **External Secrets Operator (ESO)** es un proyecto *open source* (ahora bajo la CNCF) que se ha convertido en el estándar de facto para la sincronización. Su filosofía es simple: lee secretos de una API externa (AWS Secrets Manager, Google Secret Manager, Azure Key Vault, HashiCorp Vault) y crea de forma automatizada un objeto `Secret` nativo de Kubernetes.

#### Arquitectura de ESO

ESO introduce Custom Resource Definitions (CRDs) para abstraer la integración:

* **`SecretStore` (o `ClusterSecretStore`):** Define *cómo* conectarse al proveedor externo (autenticación y endpoint).
* **`ExternalSecret`:** Define *qué* secreto extraer de la bóveda y cómo mapearlo al objeto `Secret` de K8s que la aplicación consumirá.

```text
[ Bóveda Externa ] (Ej. AWS Secrets Manager)
       ^
       | (Llamada API / Fetch)
       v
+-------------------------------+
| External Secrets Operator     |
| (Controlador en K8s)          |
+-------------------------------+
       | (Genera / Sincroniza)
       v
[ K8s Native Secret ] ----> [ Pod de la Aplicación ]

```

#### Manifiesto de ejemplo

Una vez configurado el `SecretStore`, un desarrollador solo necesita desplegar un `ExternalSecret` junto a su aplicación:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials-sync
spec:
  refreshInterval: "1h" # ESO verificará cambios en la bóveda cada hora
  secretStoreRef:
    name: aws-secrets-manager # Referencia al SecretStore configurado por el admin
    kind: ClusterSecretStore
  target:
    name: app-db-secret # El nombre del Secret nativo de K8s que se creará
    creationPolicy: Owner
  data:
  - secretKey: password # Clave resultante en el Secret de K8s
    remoteRef:
      key: prod/rds/app-db # Ruta del secreto en AWS
      property: master-password # Clave específica dentro del JSON de AWS

```

**Ventaja principal:** Las aplicaciones no necesitan modificar su código; siguen consumiendo Secrets nativos de K8s a través de volúmenes o variables de entorno.
**Desventaja:** Los secretos terminan existiendo (aunque sea momentáneamente) en el interior de `etcd`, por lo que sigues dependiendo del RBAC local y de la encriptación de `etcd` para mantenerlos seguros.

### Patrón 2: Inyección Directa (Secrets Store CSI Driver y HashiCorp Vault)

Para entornos con requerimientos de seguridad extremos (nivel militar o financiero), la sincronización nativa no es suficiente, ya que el mero hecho de que el secreto exista como un objeto en la API de K8s se considera un riesgo.

La solución a esto es el **Secrets Store CSI (Container Storage Interface) Driver**. Este patrón permite que los contenedores monten secretos almacenados en bóvedas externas directamente en sus Pods como un volumen, **evitando por completo la creación de un objeto Secret en Kubernetes**.

HashiCorp Vault es el líder indiscutible en este espacio, aunque los proveedores de nube también soportan este driver.

#### Arquitectura del CSI Driver

```text
+-----------------------+        +--------------------------------+
| Worker Node           |        | Bóveda Externa                 |
|                       |        | (HashiCorp Vault / AWS KMS)    |
|  [ Pod (App) ]        |        +--------------------------------+
|        | (Montaje)    |                        ^
|        v              |                        | (Autenticación mutua / JWT)
|  [ CSI Driver ]       | -----------------------+
|  (Recupera en RAM)    |
+-----------------------+

```

1. El Pod solicita un volumen de tipo CSI.
2. El `kubelet` contacta al driver CSI de Secrets Store en ese nodo.
3. El driver se autentica contra la bóveda externa (generalmente usando la identidad del `ServiceAccount` del Pod a través de OIDC/JWT).
4. El driver descarga el secreto y lo monta directamente en la memoria RAM (tmpfs) del contenedor.

#### Integración Avanzada con HashiCorp Vault: El patrón Agent Sidecar

HashiCorp Vault ofrece una alternativa al CSI llamada **Vault Agent Injector**. Mediante un *Mutating Admission Webhook* (concepto que veremos en el Capítulo 8), Vault intercepta la creación de tu Pod y le inyecta un contenedor secundario (*sidecar*).

Este agente se encarga de:

1. Autenticarse contra Vault usando la identidad de K8s.
2. Obtener los secretos especificados en las *annotations* del Pod.
3. Escribir los secretos en un volumen de memoria compartido con el contenedor de tu aplicación.
4. (Punto estrella): **Renovar credenciales dinámicas**. Si usas Vault para generar credenciales de base de datos de un solo uso que expiran en 15 minutos, el *sidecar* se encarga de solicitar nuevas credenciales antes de que expiren y actualizar el archivo, todo sin que tu aplicación deba reiniciarse ni conocer la API de Vault.

```yaml
# Ejemplo de Pod usando Vault Agent Injector
apiVersion: v1
kind: Pod
metadata:
  name: backend-app
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "backend-role"
    vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/backend-app"
spec:
  serviceAccountName: backend-sa
  containers:
  - name: my-app
    image: my-company/app:v2
    # La aplicación simplemente lee el archivo inyectado en /vault/secrets/db-creds

```

### Resumen de Estrategia para el Arquitecto DevOps

* **Nivel Básico (Startups, entornos locales):** Secrets nativos de K8s gestionados cuidadosamente.
* **Nivel Intermedio (Pymes, adopción Cloud):** Secrets nativos respaldados por `etcd encryption` o uso de *Sealed Secrets* en el repositorio Git.
* **Nivel Avanzado (Enterprise):** External Secrets Operator sincronizando desde AWS Secrets Manager o GCP Secret Manager.
* **Nivel Experto / Zero Trust:** HashiCorp Vault con Agent Injector o Secrets Store CSI Driver. Ningún secreto vive en K8s; credenciales efímeras con rotación automática.
