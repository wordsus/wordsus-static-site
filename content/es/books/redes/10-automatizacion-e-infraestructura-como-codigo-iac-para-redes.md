La agilidad del modelo DevOps exige que el networking abandone la configuración manual para integrarse en el ciclo de vida del software. En este capítulo, exploraremos cómo transformar topologías físicas y virtuales en artefactos de código. Analizaremos el despliegue de infraestructuras con **Terraform y Pulumi**, la gestión de configuraciones con **Ansible** y la implementación de flujos **GitOps** para garantizar trazabilidad. Finalmente, estudiaremos técnicas de **pruebas automatizadas** para validar cambios de red antes de que impacten en producción, asegurando una conectividad robusta, escalable y libre de errores humanos.

## 10.1 Definición de topologías de red con Terraform y Pulumi

En los capítulos anteriores, hemos explorado desde los fundamentos del modelo OSI hasta las complejas arquitecturas de red en la nube y Kubernetes. Sin embargo, en un entorno DevOps moderno, la creación manual de estas estructuras es un antipatrón. La **Infraestructura como Código (IaC)** nos permite definir topologías de red mediante archivos de configuración legibles, versionables y reproducibles.

En esta sección, analizaremos cómo las dos herramientas líderes del mercado, **Terraform** y **Pulumi**, abordan la creación de redes, permitiéndonos pasar de diagramas lógicos a infraestructuras reales de forma automatizada.

---

### 1. Enfoque Declarativo vs. Imperativo en Redes

Aunque ambas herramientas son técnicamente declarativas (buscan alcanzar un "estado final"), su aproximación varía:

* **Terraform (HCL):** Utiliza un lenguaje de dominio específico (*HashiCorp Configuration Language*). Es ideal para administradores de red que prefieren una sintaxis estructurada y estática que se asemeja a un archivo de configuración tradicional.
* **Pulumi (Lenguajes de Propósito General):** Permite usar Python, TypeScript, Go o C#. Es la opción predilecta cuando la topología de red depende de lógica compleja, bucles dinámicos o integración directa con SDKs de aplicaciones.

---

### 2. Definición de Redes con Terraform

Terraform se basa en **recursos** y **módulos**. Para definir una topología básica (VPC, Subredes y Tablas de Enrutamiento), el flujo de trabajo consiste en declarar el estado deseado y dejar que el *provider* gestione las dependencias.

#### Ejemplo: Topología Hub-and-Spoke simplificada

En este bloque, definimos una red virtual y una subred utilizando el proveedor de AWS:

```hcl
# Definición de la VPC (Capa 3 - Networking)
resource "aws_vpc" "main_network" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "devops-book-vpc" }
}

# Definición de una Subred Privada
resource "aws_subnet" "private_zone" {
  vpc_id            = aws_vpc.main_network.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "private-subnet-iaac" }
}

```

**Ventaja clave:** Terraform entiende el grafo de dependencias. Sabe que no puede crear la subred antes de que la VPC tenga un ID asignado.

---

### 3. Definición de Redes con Pulumi

Pulumi utiliza objetos y clases. Al usar lenguajes como TypeScript, podemos aplicar validaciones de red (como verificar que los CIDR no se solapen) utilizando librerías estándar del lenguaje.

#### Ejemplo: Creación de red con abstracción de alto nivel

Pulumi suele ofrecer paquetes "Crosswalk" que simplifican la creación de topologías siguiendo buenas prácticas:

```typescript
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Creación de una VPC con subredes públicas y privadas automáticamente
const vpc = new awsx.ec2.Vpc("custom-vpc", {
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    subnetSpecs: [
        { type: "Public", name: "frontend" },
        { type: "Private", name: "backend" }
    ],
});

export const vpcId = vpc.vpcId;

```

**Ventaja clave:** La capacidad de usar estructuras de control (`if`, `for`) permite generar cientos de subredes o conexiones de *peering* de forma programática y dinámica.

---

### 4. Comparativa de Flujo de Trabajo para Networking

A continuación, se presenta una tabla comparativa sobre cómo gestionan los aspectos críticos de red:

| Característica | Terraform | Pulumi |
| --- | --- | --- |
| **Lenguaje** | HCL (Estático) | TS, Python, Go, C# (Dinámico) |
| **Manejo de Estado** | Archivo `.tfstate` (Local/Remoto) | Backend de Pulumi o Nube |
| **Abstracción** | Módulos (comunidad/propios) | Clases y Componentes |
| **Testing de Red** | `terraform plan` y herramientas como `tflint` | Pruebas unitarias nativas (Jest, PyTest) |

---

### 5. El Grafo de Dependencias en IaC

Es crucial entender cómo estas herramientas visualizan la red. No es solo una lista de recursos, sino un **Grafo Acíclico Dirigido (DAG)**.

```text
[Internet Gateway] <--- [Route Table] <--- [Subnet] <--- [Network Interface]
                               |
                        [VPC CIDR Block]

```

Cuando defines un cambio en el CIDR de la VPC en tu código, tanto Terraform como Pulumi detectarán que todos los recursos "hijos" (subredes, rutas) deben ser actualizados o recreados, garantizando la integridad de la topología.

---

### 6. Consideraciones de Diseño para DevOps

1. **Inmutabilidad:** Trata a tu red como inmutable. En lugar de modificar una regla de firewall manualmente, cambia el código y despliega.
2. **Modularización:** No definas toda la red en un solo archivo. Separa el "Core Networking" (VPCs, Tránsito, VPNs) de los "Application Resources" (Subredes específicas, Security Groups).
3. **Gestión de Secretos:** Nunca incluyas claves compartidas de VPN o contraseñas de routers en el código de IaC. Utiliza integraciones con Vault o Secrets Manager.

## 10.2 Gestión de la configuración de dispositivos de red físicos y virtuales con Ansible

Mientras que Terraform y Pulumi (vistos en la sección 10.1) se especializan en el **aprovisionamiento** de la infraestructura (crear la "caja" o la red virtual), **Ansible** se destaca en la **gestión de la configuración**. En el mundo del Networking para DevOps, Ansible es el puente entre el mundo del hardware tradicional y la agilidad del software.

A diferencia de los servidores Linux/Windows donde Ansible instala agentes o usa Python sobre SSH, en los dispositivos de red (switches, routers, firewalls) se utiliza un enfoque **"Agentless"** basado en módulos específicos que traducen YAML en comandos CLI o llamadas API (Netconf/Restconf).

---

### 1. El Inventario de Red: Más allá de las IPs

En el networking, el inventario no solo lista hosts, sino que define variables críticas como el sistema operativo de red (**NOS**).

```yaml
# inventory.ini o hosts.yml
[routers_cisco]
rtr-madrid-01 ansible_host=192.168.1.1
rtr-madrid-02 ansible_host=192.168.1.2

[routers_cisco:vars]
ansible_network_os=ios
ansible_connection=network_cli
ansible_user=admin_devops

```

* **`ansible_network_os`**: Indica si el dispositivo es Cisco (ios/nxos), Juniper (junos), Arista (eos), o VyOS.
* **`ansible_connection`**: Crucial para redes. `network_cli` mantiene una sesión SSH abierta para ejecutar múltiples comandos, optimizando el rendimiento.

---

### 2. Módulos de Red: Imperativos vs. Declarativos

Ansible para networking ha evolucionado de ejecutar comandos crudos a gestionar estados.

#### A. Módulos de Comando (Imperativos)

Se usan para tareas de diagnóstico o cambios puntuales. No son idempotentes (se ejecutan siempre, aunque el cambio ya exista).

* *Ejemplo:* `cisco.ios.ios_command`

#### B. Módulos de Configuración de Recursos (Declarativos)

Siguen la filosofía de IaC: tú defines el estado deseado y Ansible se encarga de la lógica para llegar a él.

* *Ejemplo:* `cisco.ios.ios_l3_interfaces`

```yaml
- name: Configurar interfaz GigabitEthernet1
  cisco.ios.ios_l3_interfaces:
    config:
      - name: GigabitEthernet1
        ipv4:
          - address: 192.168.10.1/24
    state: merged  # Opciones: merged, replaced, overridden, deleted

```

> **Nota:** El estado `overridden` es el más potente y peligroso, ya que eliminará cualquier configuración en el dispositivo que no esté definida en tu archivo YAML.

---

### 3. Abstracción con Roles y Jinja2

Una de las mayores ventajas de Ansible en redes es la capacidad de generar configuraciones complejas a partir de plantillas **Jinja2**. Esto permite estandarizar configuraciones de VLANs o BGP en múltiples proveedores (Multivendor).

**Estructura de una plantilla (`snmp.j2`):**

```jinja2
snmp-server community {{ snmp_community }} RO
snmp-server location {{ physical_location }}
snmp-server contact {{ admin_email }}

```

Esto separa los **datos** (variables) de la **lógica** (plantilla), permitiendo que un cambio en el estándar de seguridad de la empresa se despliegue en mil dispositivos con un solo *playbook*.

---

### 4. Gestión de Dispositivos Virtuales (SDN y Cloud)

Ansible no se limita al hierro físico. Es una herramienta fundamental para gestionar:

* **Firewalls Virtuales:** Modificación de reglas en Fortinet o CheckPoint mediante APIs.
* **SD-WAN:** Orquestación de túneles entre sucursales.
* **Instancias Cloud:** Configuración de tablas de rutas dentro de una instancia de router virtual (como un CSR1000v) que vive en AWS.

---

### 5. Flujo de ejecución en Networking

A diferencia de la gestión de servidores, el tráfico de control en red sigue este esquema:

1. **Local Execution**: El módulo no se ejecuta en el router (el router no tiene Python), se ejecuta en el **Control Node** (tu máquina o servidor de CI/CD).
2. **Transporte**: Ansible abre una conexión (SSH/HTTPS) hacia el dispositivo.
3. **Traducción**: El motor de Ansible convierte el YAML en la sintaxis específica del fabricante (ej. `set interfaces...` para Juniper o `interface...` para Cisco).
4. **Verificación**: Ansible comprueba si el cambio es necesario (Idempotencia).

---

### 6. Buenas Prácticas y Seguridad

* **Idempotencia siempre:** Prefiere módulos de recursos sobre módulos de comandos (`ios_config`).
* **Check Mode (`--check`)**: Ejecuta siempre un "simulacro" antes de aplicar cambios en producción para ver el "diff" de configuración.
* **Ansible Vault**: Cifra las credenciales de acceso a los dispositivos de red y las claves de SNMP o BGP.
* **Backup automático**: Usa el parámetro `backup: yes` en los módulos de configuración para generar una copia del estado previo antes de cualquier modificación.

## 10.3 GitOps aplicado al networking: Gestión de cambios de red a través de repositorios Git y pipelines de CI/CD

El concepto de **GitOps** traslada las mejores prácticas del desarrollo de software (control de versiones, colaboración y entrega continua) directamente a la gestión de infraestructuras. Aplicado al networking, GitOps significa que el **repositorio de Git es la única fuente de verdad** (*Source of Truth*) para el estado de la red.

Si un ingeniero desea cambiar una regla de firewall o crear una nueva VLAN, no accede al dispositivo ni ejecuta un script localmente; realiza un `Pull Request` (PR).

---

### 1. Los Pilares de GitOps en Redes

Para que una estrategia de GitOps sea efectiva en networking, debe cumplir cuatro principios:

1. **Declarativo:** La red se define mediante archivos (YAML/HCL) que describen el estado deseado, no los pasos para lograrlo.
2. **Versionado e Inmutable:** Todo cambio queda registrado en el historial de Git (quién, qué y por qué).
3. **Aprobación mediante Pull Requests:** Los cambios son revisados por pares antes de aplicarse, eliminando errores de configuración manual ("fat-finger errors").
4. **Autorreparación (Drift Detection):** Un agente o pipeline detecta si la configuración real del switch/router se desvía de lo que dice Git y la corrige automáticamente.

---

### 2. Flujo de Trabajo (Pipeline CI/CD)

El ciclo de vida de un cambio de red bajo GitOps sigue este flujo lógico:

```text
[Ingeniero de Red] -> [Git Branch] -> [Pull Request] -> [CI Pipeline (Tests)]
                                           |
                                   [Aprobación Senior]
                                           |
[Red Real] <------- [CD Pipeline (Deploy)] <------- [Merge a Main]

```

#### Fase de Integración Continua (CI - Validación)

Antes de tocar la red, el pipeline ejecuta pruebas automatizadas:

* **Linting:** ¿Es válido el YAML de Ansible o el HCL de Terraform?
* **Políticas de Seguridad:** ¿La nueva regla de firewall abre un puerto prohibido? (Uso de herramientas como `Checkov` o `tfsec`).
* **Simulación:** En redes complejas, se puede levantar un "Gemelo Digital" (usando contenedores como `Containerlab` o `GNS3`) para verificar que el enrutamiento BGP no se rompa.

#### Fase de Entrega Continua (CD - Despliegue)

Una vez aprobado el PR, el pipeline (GitHub Actions, GitLab CI, Jenkins) ejecuta la herramienta de IaC:

* `terraform apply --auto-approve`
* `ansible-playbook site.yml`

---

### 3. Herramientas Específicas para GitOps de Red

Dependiendo del entorno (Cloud o Físico), las herramientas varían:

* **ArgoCD / Flux:** Estándares en Kubernetes. Si usas **Cilium** o **Istio** (vistos en el Cap. 7), estas herramientas sincronizan automáticamente tus `NetworkPolicies` desde Git.
* **NetBox:** Actúa a menudo como la "Fuente de Verdad" dinámica que alimenta a Git.
* **Batfish:** Una herramienta de análisis de configuración de red que permite predecir el comportamiento de la red antes de desplegar, integrándose perfectamente en el pipeline de CI.

---

### 4. Ejemplo Práctico: Cambio de VLAN vía GitOps

Imagina que necesitas añadir la `VLAN 200` para un nuevo clúster de base de datos.

1. **Modificación en Git:** Editas el archivo `vars/vlans.yml`.

```yaml
vlans:
  - id: 100
    name: Frontend
  - id: 200
    name: Database_New  # Nueva entrada

```

1. **Pull Request:** El sistema de CI detecta el cambio y ejecuta un `ansible-playbook --check`. El reporte indica: *"Se añadirá la VLAN 200 en 4 switches Core"*.
2. **Merge:** Tras la revisión, se fusiona a la rama `main`.
3. **Ejecución:** El pipeline de CD aplica el cambio real. Si un administrador intentara borrar la VLAN manualmente desde la consola del switch, el próximo ciclo del pipeline la volvería a crear.

---

### 5. Desafíos del Networking GitOps

* **El "Out-of-Band" Problem:** Si alguien cambia algo manualmente por consola de emergencia, Git puede quedar desincronizado. La disciplina de equipo es vital.
* **Rollbacks complejos:** Revertir un commit en Git es fácil, pero en redes, un "rollback" de una configuración de enrutamiento puede dejar al propio pipeline sin conectividad para arreglarlo.
* **Secretos:** El manejo de certificados TLS y llaves SSH debe hacerse mediante gestores de secretos (HashiCorp Vault) integrados en el pipeline, nunca en texto plano en Git.

GitOps transforma el networking de una tarea artesanal a un proceso de ingeniería de software robusto.

## 10.4 Pruebas automatizadas de configuración y políticas de red

En el modelo tradicional de networking, la "prueba" consistía en aplicar un cambio y esperar a que el teléfono no sonara. En el ecosistema DevOps, esto es inaceptable. Las **pruebas automatizadas** cierran el ciclo de IaC y GitOps, asegurando que la intención definida en el código se traduzca en un comportamiento real y seguro en la red.

Podemos dividir las pruebas de red en tres capas: **Estáticas**, **Simuladas** y **Dinámicas**.

---

### 1. Análisis Estático: El "Linter" de Red

Antes de tocar un solo cable virtual, debemos validar la sintaxis y el cumplimiento de reglas de negocio.

* **Linter de IaC:** Herramientas como `tflint` o `ansible-lint` aseguran que el código sea limpio y siga las mejores prácticas.
* **Análisis de Políticas:** Herramientas como **Checkov** o **Terrascan** analizan el código de Terraform para detectar errores de seguridad (ej. "Esta regla de Firewall permite tráfico SSH desde cualquier IP 0.0.0.0/0").
* **Validación de Tipos:** Asegurar que las IPs estén en formato CIDR correcto y que no haya solapamiento de subredes.

---

### 2. Análisis de Configuración (Pre-despliegue) con Batfish

**Batfish** es una de las herramientas más potentes para el networking moderno. No necesita conectarse a los equipos; analiza los archivos de configuración (Cisco, Juniper, etc.) y construye un **modelo matemático** de la red.

Permite hacer preguntas de tipo "Qué pasaría si..." (*What-if analysis*):

* ¿Si se cae el Router A, el tráfico llegará al Nodo B?
* ¿Hay alguna ruta que cause un bucle infinito?
* ¿Esta ACL bloquea realmente el tráfico entre la VLAN 10 y la 20?

**Ejemplo de flujo en un Pipeline:**

1. El ingeniero sube un cambio de BGP.
2. Batfish carga la configuración actual + el cambio propuesto.
3. El pipeline ejecuta un test: `assert_no_forwarding_loops()`.
4. Si el test falla, el despliegue se detiene automáticamente.

---

### 3. Pruebas Dinámicas y de Conectividad (Post-despliegue)

Una vez que la configuración se ha aplicado, debemos verificar que el plano de datos funciona como se espera.

#### A. pyATS (Python Automated Test System)

Desarrollado originalmente por Cisco pero compatible con múltiples fabricantes, permite realizar "Snapshots" del estado de la red antes y después de un cambio para compararlos.

```python
# Ejemplo conceptual de test con pyATS
def test_check_interface_status(self):
    # Obtener estado de interfaces
    interfaces = self.device.learn('interface')
    for intf in interfaces:
        # Verificar que ninguna interfaz crítica esté 'down'
        assert intf.status == 'up'

```

#### B. Suites de Pruebas Basadas en Intenciones

Se enfocan en el usuario final. No importa si el protocolo es OSPF o BGP, lo que importa es el alcance:

* **Pruebas de Accesibilidad:** ¿Puede el servidor de App llegar a la Base de Datos en el puerto 5432?
* **Pruebas de Latencia:** ¿El ping entre regiones es menor a 50ms?

---

### 4. Pruebas de Políticas de Seguridad (Compliance)

En entornos como Kubernetes o Cloud, las políticas de red (*Network Policies*) deben ser testeadas con herramientas de **Chaos Engineering** o escaneo de red activo.

* **Sonobuoy:** Para certificar que el networking de un clúster de Kubernetes cumple con los estándares.
* **Netperf / Iperf:** Para validar que el ancho de banda disponible es el contratado o el configurado tras aplicar políticas de QoS (Calidad de Servicio).

---

### 5. Resumen del Pipeline de Calidad de Red

| Fase | Herramienta Típica | Objetivo |
| --- | --- | --- |
| **Linting** | `ansible-lint`, `tflint` | Errores de sintaxis y formato. |
| **Security Scanning** | `Checkov`, `tfsec` | Cumplimiento de políticas de seguridad. |
| **Modelado** | `Batfish` | Validar lógica de enrutamiento sin hardware. |
| **Verificación** | `pyATS`, `Robot Framework` | Comprobar estado operativo post-cambio. |
| **End-to-End** | `Pytest` + `Requests` | Validar que la aplicación sigue funcionando. |

### Conclusión del Capítulo 10

La automatización no se trata solo de escribir código para configurar routers, sino de construir un sistema de confianza donde cada cambio sea validado, auditado y probado. Al combinar **Terraform/Pulumi** para la estructura, **Ansible** para el detalle, **GitOps** para el control y **Pruebas Automatizadas** para la seguridad, el equipo de DevOps logra una agilidad que antes era imposible en el networking tradicional.

## Conclusión: El Futuro del Networking en la Era DevOps

Dominar las redes hoy no consiste solo en entender protocolos, sino en saber integrarlos en un ecosistema automatizado y seguro. A lo largo de este libro, hemos recorrido desde los fundamentos del modelo OSI hasta la orquestación con GitOps y arquitecturas Zero Trust. El rol del profesional DevOps exige ser el puente entre el hardware, la nube y el código. Al cerrar estas páginas, tienes las herramientas para diseñar infraestructuras resilientes y programables. La red ya no es un silo estático; es un software dinámico que evoluciona con tu aplicación. ¡Sigue automatizando, sigue probando y lleva tu conectividad al siguiente nivel!
