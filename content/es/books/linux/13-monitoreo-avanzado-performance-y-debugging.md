El rendimiento no es un estado estático, sino un equilibrio dinámico. En este capítulo, dejamos atrás el modo "supervivencia" para entrar en la maestría del sistema. Un DevOps Senior no se conforma con saber que un servidor está lento; identifica si la causa es un bloqueo de I/O, un hilo de CPU saturado o una latencia imperceptible en el kernel. A través de herramientas como `htop`, `strace` y la potencia moderna de eBPF, aprenderás a diseccionar el comportamiento del software en tiempo real. Esta sección te dotará de la visión de rayos X necesaria para resolver incidentes complejos bajo presión, transformando datos brutos en diagnósticos precisos y soluciones definitivas.

## 13.1 Monitoreo de recursos en tiempo real (`top`, `htop`, `atop`, `glances`)

Cuando una alerta de PagerDuty suena a las 3:00 a.m. indicando que un clúster está degradado, el primer paso de un ingeniero DevOps no es reiniciar servicios a ciegas, sino **observar**. Ya dominas el ciclo de vida de los procesos y sabes cómo listarlos con `ps` (Capítulo 4), pero en un escenario de crisis necesitas una vista dinámica, interactiva y en tiempo real del sistema.

En esta sección, exploraremos las cuatro herramientas fundamentales de monitoreo en tiempo real, desde el clásico universal hasta dashboards avanzados, entendiendo exactamente cuándo utilizar cada una.

---

### 1. `top`: El Clásico Universal

Si te conectas por SSH a un servidor *legacy*, a una instancia mínima de Alpine Linux en un contenedor o a un router embebido, es probable que no tengas herramientas modernas instaladas. Sin embargo, `top` **siempre estará ahí**. Es el denominador común del monitoreo en UNIX.

Más allá de listar procesos, el verdadero valor de `top` para un perfil Senior radica en saber leer su cabecera (las primeras 5 líneas), ya que ofrece un resumen instantáneo de la salud del host.

**Métricas críticas en la cabecera de `top`:**

* **Load Average (Carga del sistema):** Muestra tres valores (ej. `1.50, 0.90, 0.45`) que representan la carga media en los últimos 1, 5 y 15 minutos. Si el número supera la cantidad de núcleos físicos/lógicos de tu servidor, hay procesos esperando por CPU o disco.
* **Estados de la CPU:** Aquí es donde se diagnostican los cuellos de botella iniciales. Presta especial atención a estos tres:
* `%us` (User): Tiempo gastado en procesos de usuario (tu aplicación, Node.js, Python).
* `%wa` (IOWait): Tiempo que la CPU pasa ociosa esperando a que responda el disco o la red. Si este valor es alto, tienes un problema de I/O (que analizaremos a fondo en la sección 13.3 con `iostat`).
* `%st` (Steal Time): Crítico en la nube (AWS, GCP). Es el tiempo que el hipervisor físico le "robó" a tu máquina virtual para dárselo a otro *tenant* ruidoso. Si tienes un alto `%st`, tu proveedor de nube te está limitando (throttling).



**Atajos interactivos clave en `top`:**

* `P`: Ordenar por uso de CPU (por defecto).
* `M`: Ordenar por uso de Memoria RAM (ideal para cazar *memory leaks*).
* `1`: Desglosar el uso de CPU por cada núcleo individual.
* `c`: Mostrar la ruta completa del comando que ejecutó el proceso.

### 2. `htop`: El Estándar Moderno y Visual

`htop` es la evolución natural de `top`. Aunque requiere instalación (`apt install htop` o `yum install htop`), se ha convertido en el estándar de facto por su interfaz intuitiva basada en `ncurses`, soporte para ratón y codificación por colores.

**¿Por qué preferir `htop` en el día a día?**

1. **Lectura de barras de colores:** Las barras de CPU diferencian visualmente el tiempo de usuario (verde), sistema/kernel (rojo) y baja prioridad/nice (azul). Las barras de memoria separan la RAM usada (verde) de la caché (amarillo), evitando el pánico de los *juniors* al ver la memoria "llena" por culpa de la caché del sistema de archivos.
2. **Vista de árbol (`F5` o `t`):** En arquitecturas de microservicios o aplicaciones como Nginx/Apache y bases de datos, los procesos generan múltiples procesos hijos (workers) o hilos. La vista de árbol te permite colapsar y entender la jerarquía real de ejecución (quién llamó a quién).
3. **Filtrado interactivo (`\`):** Permite aislar rápidamente procesos escribiendo parte de su nombre, sin perder el ordenamiento dinámico.

### 3. `atop`: El "Grabador de Vuelo" del Sistema

Si `htop` es excelente para el "ahora", `atop` (Advanced System & Process Monitor) es la herramienta definitiva para el análisis forense y los cuellos de botella granulares.

La superpotencia de `atop` no es solo su vista en vivo, sino su **demonio en segundo plano** que guarda instantáneas del estado del sistema (normalmente cada 10 o 20 minutos) en `/var/log/atop/`.

**Casos de uso Senior para `atop`:**

* **Análisis post-mortem:** "El servidor se cayó a las 4:15 a.m. y se recuperó solo, ¿qué pasó?". Con `atop` puedes viajar en el tiempo ejecutando: `atop -r /var/log/atop/atop_20260329 -b 04:00`. Presionando `t` avanzas en el tiempo y `T` retrocedes.
* **Procesos efímeros:** A diferencia de `top`, `atop` registra procesos que nacieron y murieron dentro del intervalo de recolección de datos, mostrándolos entre corchetes `<cron>`.
* **Identificación visual de cuellos de botella:** La interfaz resalta automáticamente en rojo el recurso que está saturado (ej. disco DSK, red NET o memoria MEM).

### 4. `glances`: El Dashboard Integral (Cross-Platform)

Escrito en Python, `glances` es la herramienta más moderna y pesada de las cuatro, pero también la más completa. Actúa como un *dashboard* consolidado que empaqueta información que normalmente requeriría usar 5 o 6 comandos distintos.

**Características destacadas para DevOps:**

* **Todo en uno:** Muestra CPU, Memoria, I/O de disco, tráfico de red por interfaz, sensores de temperatura, e incluso **métricas de contenedores Docker** nativamente en la misma pantalla.
* **Modo Cliente/Servidor:** Puedes iniciar Glances en un servidor remoto en modo servidor (`glances -s`) y conectarte desde tu máquina local (`glances -c IP_SERVIDOR`), o usar su servidor web integrado (`glances -w`) para ver las métricas directamente en tu navegador.
* **Exportación de datos:** Permite exportar sus métricas en tiempo real a sistemas como InfluxDB, Prometheus, o ElasticSearch para integrarlo en tu stack de observabilidad.

---

## Cuadro Resumen: ¿Cuál elegir?

| Herramienta | Ventaja Principal | Caso de Uso Ideal en DevOps |
| --- | --- | --- |
| **`top`** | Ubicuidad. Está en todas partes. | Tienes acceso a un servidor por primera vez y necesitas un pantallazo rápido sin instalar nada. |
| **`htop`** | Interfaz visual y gestión de procesos. | Monitoreo interactivo diario, matar procesos de forma visual y analizar árboles de dependencias. |
| **`atop`** | Análisis histórico y persistencia de datos. | Resolución de incidentes en diferido (post-mortem) y detección de recursos saturados a nivel de hardware. |
| **`glances`** | Visión holística y API/Exportación. | Necesitas ver red, disco, contenedores y sistema al mismo tiempo, o exportar datos rápidamente. |

Una vez que identificas con estas herramientas qué subsistema (CPU, Memoria, Disco o Red) está sufriendo, es momento de utilizar herramientas especializadas para hacer *drill-down*. Si notas que el problema es la CPU o la memoria RAM, pasa a la siguiente sección (13.2) donde desglosaremos las métricas con `vmstat` y `mpstat`.

## 13.2 Análisis de cuellos de botella de CPU y Memoria (`vmstat`, `free`, `mpstat`)

En la sección anterior aprendimos a utilizar herramientas como `htop` o `glances` para detectar que "algo" anda mal en el servidor. Sin embargo, cuando la alarma indica que el sistema está lento o la carga es anormalmente alta, la vista panorámica ya no es suficiente; necesitas sacar el bisturí.

Un ingeniero Senior no reinicia servicios con la esperanza de que el problema desaparezca. En su lugar, aísla el subsistema responsable. En esta sección nos enfocaremos en dos de los sospechosos más habituales: la Memoria RAM y la CPU, utilizando herramientas nativas que responden a la pregunta: *"¿Qué está limitando exactamente a mi aplicación?"*.

---

### 1. `free`: Entendiendo la gestión real de la memoria

El comando `free` es probablemente el más malinterpretado por quienes recién inician en Linux. La queja típica es: *"¡Mi servidor no tiene memoria libre, hay que ampliar la RAM!"*, cuando en realidad el sistema está funcionando a la perfección.

Para entender por qué, ejecutemos `free -h` (el parámetro `-h` lo hace *human-readable*, mostrando megabytes o gigabytes en lugar de bytes):

```bash
$ free -h
              total        used        free      shared  buff/cache   available
Mem:           15Gi       4.2Gi       1.1Gi        50Mi       9.7Gi        10Gi
Swap:         4.0Gi          0B       4.0Gi

```

**La filosofía de Linux: "Memoria no usada es memoria desperdiciada"**

* **`free` (La trampa):** En el ejemplo, solo hay 1.1Gi estrictamente "libres". Un junior entraría en pánico.
* **`buff/cache` (El secreto):** Linux toma toda la RAM que las aplicaciones no están usando activamente y la utiliza para almacenar en caché el acceso al disco (lecturas y escrituras recientes). Esto acelera enormemente el sistema operativo. Si una aplicación necesita esa RAM, Linux libera la caché instantáneamente.
* **`available` (La métrica Senior):** Este es el número que realmente importa. Indica cuánta memoria está *disponible* para iniciar nuevas aplicaciones sin tener que recurrir al Swap. En el ejemplo, tenemos 10Gi disponibles. ¡El servidor está sano!

**El peligro del Swap:**
La fila `Swap` muestra el espacio en disco usado como "memoria de emergencia". Si ves que el valor `used` del Swap está aumentando constantemente, tu servidor está haciendo *swapping* (moviendo datos entre la RAM y el disco). Esto destruye el rendimiento.

---

### 2. `vmstat`: El pulso del sistema en un solo comando

Si `free` te da una foto estática de la RAM, `vmstat` (Virtual Memory Statistics) te da un electrocardiograma en tiempo real de la memoria, el disco y la CPU simultáneamente.

El patrón de uso estándar es `vmstat <intervalo> <repeticiones>`. Ejecutar `vmstat 1` actualizará las métricas cada segundo de forma indefinida:

```bash
$ vmstat 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 3  0      0 120540  45600 102430    0    0    12    34  120  450 45 10 45  0  0
 5  0      0 119000  45600 102450    0    0     0    50  145  600 85 15  0  0  0

```

**¿Dónde poner el ojo para cazar cuellos de botella?**

* **Columna `r` (Run Queue) bajo `procs`:** Muestra la cantidad de procesos que están ejecutándose o *esperando* su turno para usar la CPU. **Regla de oro:** Si el valor de `r` es consistentemente mayor que el número de núcleos de CPU de tu servidor, tienes un cuello de botella de CPU.
* **Columna `b` (Blocked) bajo `procs`:** Procesos en espera ininterrumpible (casi siempre esperando por el disco o la red). Si `b` es mayor a 0 frecuentemente, tu problema no es la CPU, es el almacenamiento (I/O).
* **Columnas `si` (Swap In) y `so` (Swap Out) bajo `swap`:** Indican la cantidad de memoria que se está leyendo o escribiendo en la partición Swap en disco por segundo. Si estos números son mayores a 0 de forma constante, tu servidor se quedó sin memoria RAM real (el infame *Thrashing*).

---

### 3. `mpstat`: Diseccionando la CPU núcleo por núcleo

Si `vmstat` te indicó que tienes un problema de CPU (columna `r` alta), el siguiente paso es entender *cómo* se está distribuyendo esa carga. A veces un servidor con 16 núcleos reporta un uso de CPU del 6% y, sin embargo, la aplicación va lenta.

Aquí entra `mpstat` (parte del paquete `sysstat`). Ejecutando `mpstat -P ALL 1` desglosamos el uso por cada núcleo individual:

```bash
$ mpstat -P ALL 1
10:00:01 AM  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %idle
10:00:02 AM  all   12.50    0.00    2.00    0.00    0.00    0.00    0.00    0.00  85.50
10:00:02 AM    0  100.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00   0.00
10:00:02 AM    1    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00 100.00
10:00:02 AM    2    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00 100.00
10:00:02 AM    3    0.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00 100.00

```

**El diagnóstico Senior:** En el bloque superior vemos que la CPU global (`all`) está al ~14% de uso. ¡Parece un servidor relajado! Pero al mirar los núcleos individuales, descubrimos que la **CPU 0 está al 100% de uso (`%usr`)**, mientras los demás núcleos están inactivos (`%idle`).

Esto indica un cuello de botella clásico: tu aplicación es *single-threaded* (usa un solo hilo) o está atrapada en un bucle infinito en un solo proceso. Añadir más núcleos a este servidor no solucionará el problema; la aplicación necesita ser optimizada o configurada para procesar en paralelo (ej. aumentar los workers en Node.js o Gunicorn).

---

### Diagrama de Flujo: Triage de Rendimiento (CPU vs Memoria)

```text
                  [ ALARMA: Carga Alta en el Sistema ]
                                   |
                                   v
                      Ejecutar:  vmstat 1
                                   |
               +-------------------+-------------------+
               |                                       |
       Columna 'r' > # Cores              Columnas 'si' / 'so' > 0
               |                                       |
               v                                       v
    [ CUELLO DE BOTELLA: CPU ]             [ CUELLO DE BOTELLA: MEMORIA ]
               |                                       |
      Ejecutar: mpstat -P ALL 1               Ejecutar: free -h  /  top (M)
               |                                       |
      ¿Un solo núcleo al 100%?              ¿La RAM 'available' es baja?
      - Sí: App Single-threaded             - Sí: Hay Memory Leak o falta RAM
      - No: Capacidad insuficiente          - Solución: Aislar proceso en top

```

---

Al dominar `free`, `vmstat` y `mpstat`, pasas de adivinar a diagnosticar basándote en datos empíricos del kernel.

## 13.3 Análisis de cuellos de botella de Disco/IO (`iostat`, `iotop`)

Si en el paso anterior `vmstat` reveló que tienes procesos bloqueados (una columna `b` alta) o `top` te mostró un porcentaje de `wa` (IOWait) elevado, el diagnóstico es claro: tu CPU está perdiendo un tiempo valioso cruzada de brazos, esperando a que el disco duro o la red terminen de leer o escribir datos.

El almacenamiento, incluso en la era de los discos NVMe, sigue siendo el componente más lento de un servidor. Cuando una base de datos realiza una consulta pesada sin índices, o un proceso comienza a escribir logs frenéticamente, el sistema entero puede paralizarse. Para diagnosticar esto, pasamos de las métricas generales a las herramientas especializadas de bloque: `iostat` y `iotop`.

---

### 1. `iostat`: La radiografía del hardware de almacenamiento

Así como `mpstat` disecciona la CPU, `iostat` (también parte del paquete `sysstat`) disecciona tus dispositivos de bloques (discos). Su función principal es decirte **si el hardware está saturado**.

El comando de oro que todo Senior utiliza es `iostat -xz 1`.

* `-x`: Muestra estadísticas e**x**tendidas (vital para ver la latencia y saturación).
* `-z`: Oculta los discos que no tienen actividad (limpia el ruido visual).
* `1`: Refresca cada segundo.

Veamos un ejemplo de un servidor de base de datos sufriendo:

```bash
$ iostat -xz 1
Device:         rrqm/s   wrqm/s     r/s     w/s    rkB/s    wkB/s avgrq-sz avgqu-sz   await r_await w_await  svctm  %util
sda               0.00     0.00    0.00    0.00     0.00     0.00     0.00     0.00    0.00    0.00    0.00   0.00   0.00
sdb               0.00    12.50  150.00  320.00  4096.00  8192.00    52.17    15.40   45.50   12.00   61.20   2.10 100.00

```

**Métricas críticas para el Triage de I/O:**

1. **`%util` (Saturación):** Muestra el porcentaje de tiempo que el disco estuvo ocupado procesando peticiones. En el ejemplo, `sdb` está al **100%**. Si tienes discos mecánicos (HDD), un `%util` alto es catastrófico. En discos SSD/NVMe modernos, un 100% no siempre significa colapso total (porque manejan operaciones en paralelo), pero definitivamente indica que el disco está trabajando al máximo de su capacidad.
2. **`await` (Latencia):** ¡Esta es la métrica más importante! Es el tiempo promedio (en milisegundos) que una petición de I/O tardó en ser atendida (tiempo en la cola + tiempo de servicio). En nuestro ejemplo, `45.50 ms` es altísimo para una base de datos moderna (lo ideal en SSDs es estar por debajo de 2-5 ms). Tu disco está formando un "embotellamiento".
3. **`r/s` y `w/s` (IOPS):** Lecturas (Reads) y Escrituras (Writes) por segundo. Te dice si la carga es intensiva en lectura o en escritura.
4. **`rkB/s` y `wkB/s` (Throughput/Ancho de banda):** Kilobytes leídos/escritos por segundo. A veces un disco tiene pocas IOPS, pero está moviendo archivos gigantes (como un backup de base de datos o un volcado de logs).

---

### 2. `iotop`: El francotirador de procesos

Si `iostat` te dice *que* el disco `sdb` está sufriendo, `iotop` te dice *quién* lo está haciendo sufrir. Es el equivalente a `top`, pero exclusivamente para Entrada/Salida de disco.

*Nota: A diferencia de `top`, `iotop` requiere privilegios de superusuario (`sudo`) porque necesita interactuar directamente con el kernel para rastrear la I/O por proceso.*

Al ejecutar `sudo iotop -o` (la bandera `-o` es crucial porque oculta los procesos inactivos y te muestra solo los culpables actuales), verás algo así:

```bash
Total DISK READ :       0.00 B/s | Total DISK WRITE :      12.50 M/s
Actual DISK READ:       0.00 B/s | Actual DISK WRITE:      15.20 M/s
  PID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
 5432 be/4 mysql       0.00 B/s   10.50 M/s  0.00 % 85.40 % mysqld
 8910 be/4 root        0.00 B/s    2.00 M/s  0.00 % 10.20 % rsync -avz /var/log/ /backup/

```

**¿Cómo interpretar `iotop` en una crisis?**

* **La cabecera global:** Te muestra el ancho de banda total. Si ves que "Total DISK WRITE" está al límite máximo de la velocidad de tu disco proporcionado por tu nube (por ejemplo, 125 MB/s para discos estándar en AWS), ya sabes por qué todo está lento: has agotado tu cuota.
* **Columna `IO>`:** Muestra el porcentaje de tiempo que el proceso pasó esperando a que el disco respondiera. En este caso, MySQL (`mysqld`) está pasando el 85.40% de su tiempo congelado esperando al disco.
* **Identificación del problema:** Aquí descubrimos que no solo MySQL está escribiendo intensamente (`10.50 M/s`), sino que alguien programó un trabajo de `rsync` de logs en el mismo disco (`sdb`) al mismo tiempo, compitiendo por los recursos físicos y causando la latencia vista en `iostat`.

---

### Diagrama de Resolución (Troubleshooting IO)

```text
[ ALARMA: Latencia alta en la App / Load Average elevado con IOWait ]
                               |
                               v
                  Ejecutar: iostat -xz 1
                               |
             ¿Hay algún disco con %util cerca de 100% 
                    o un 'await' de > 20ms?
                               |
            +------------------+------------------+
            |                                     |
           NO                                     SÍ
            |                                     |
    Revisar Red o CPU                       Cuello de botella en Almacenamiento
    (No es problema de disco)                     |
                                                  v
                                     Ejecutar: sudo iotop -o
                                                  |
                                ¿Qué proceso domina la columna DISK WRITE/READ?
                                                  |
                                  +---------------+---------------+
                                  |                               |
                           Proceso Esperado                 Proceso Inesperado
                           (Ej. Base de datos)             (Ej. Backup, Log rotado, Updatedb)
                                  |                               |
                        - Optimizar consultas.            - Detener el proceso (kill/systemctl).
                        - Añadir índices.                 - Reprogramar para horas valle (cron).
                        - Escalar disco (Más IOPS).       - Mover I/O a otro disco.

```

Al igual que un buen médico, un DevOps Senior primero usa `iostat` para confirmar el síntoma físico (el disco está saturado) y luego usa `iotop` para aislar el virus (el proceso culpable).

Una vez que identificamos el proceso problemático (digamos, MySQL o tu aplicación backend), a veces no basta con saber que está escribiendo en disco; necesitamos saber *exactamente qué archivos* está tocando y qué está intentando hacer a nivel de sistema operativo.

## 13.4 Intercepción de llamadas al sistema (System Calls) para depuración (`strace`, `ltrace`)

Hasta ahora hemos cazado cuellos de botella físicos: CPU al 100%, memoria agotada o discos saturados. Pero, ¿qué pasa cuando los recursos están intactos (CPU al 5%, RAM de sobra) y, aun así, tu aplicación se cuelga, falla silenciosamente o devuelve un genérico y frustrante "Error 500"? Peor aún, ¿qué haces cuando la aplicación no deja ningún registro en sus archivos de log?

Aquí es donde se separa un administrador de sistemas tradicional de un ingeniero Senior. Cuando no hay logs, no adivinamos: **escuchamos la conversación entre la aplicación y el sistema operativo**. Para eso utilizamos `strace` y `ltrace`.

Para entender estas herramientas, primero debemos visualizar la frontera más importante de Linux: la barrera entre el Espacio de Usuario y el Espacio del Kernel.

### Diagrama: ¿Dónde actúan `strace` y `ltrace`?

```text
       [ Espacio de Usuario (User Space) ]
  
  Tu Aplicación (ej. Nginx, Node.js, Python)
                 |
                 v    <--- ltrace intercepta aquí (Library Calls)
  Bibliotecas Dinámicas (ej. glibc: fopen(), malloc(), strcmp())
                 |
  ===============|====================================== (Frontera)
                 v    <--- strace intercepta aquí (System Calls)
       [ Espacio del Kernel (Kernel Space) ]
  
  Kernel de Linux (Gestión real de hardware: open(), brk(), read())

```

Ninguna aplicación puede tocar el hardware directamente. Si tu código quiere abrir un archivo, enviar un paquete de red o reservar memoria, debe pedirle permiso al Kernel a través de una **Llamada al Sistema (System Call o Syscall)**.

---

### 1. `strace`: El microscopio del Kernel

`strace` (System Trace) captura y registra todas las llamadas al sistema realizadas por un proceso y las señales que recibe. Es la herramienta de depuración definitiva en caja negra (cuando no tienes el código fuente).

**Casos de uso críticos en DevOps:**

* **El misterio del archivo faltante ("No such file or directory"):**
Imagina que un servicio falla al arrancar, pero no te dice qué archivo de configuración le falta. Puedes arrancar el servicio a través de `strace`:
```bash
$ strace -e trace=open,openat,stat cat archivo_misterioso.txt
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "archivo_misterioso.txt", O_RDONLY) = -1 ENOENT (No such file or directory)

```


*Diagnóstico:* Al filtrar solo las syscalls de apertura de archivos (`-e trace=open,openat,stat`), vemos exactamente dónde busca el proceso y el error exacto (`ENOENT`), revelando la ruta que el desarrollador olvidó documentar.
* **Aplicaciones congeladas ("Hangs"):**
Si un proceso se queda bloqueado, puedes "enganchar" `strace` a su PID en vivo usando `-p`:
```bash
$ sudo strace -p 1234
strace: Process 1234 attached
recvfrom(5, 

```


*Diagnóstico:* Si al ejecutar el comando la salida se queda pausada en `recvfrom` o `connect`, tu aplicación no está rota; está esperando indefinidamente a que un servicio de red externo (como una base de datos o una API) le responda. Tienes un problema de timeout, no de código.
* **Perfilado de rendimiento (Profiling) con `strace -c`:**
Si tu aplicación es lenta pero la CPU global está bien, puedes contar cuántas syscalls hace y cuánto tiempo le toman:
```bash
$ sudo strace -c -p 1234
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 85.50    0.054321         120       452           select
 10.20    0.006432          15       420           read
  4.30    0.002130           5       420           write
------ ----------- ----------- --------- --------- ----------------
100.00    0.062883                   1292         total

```


*Diagnóstico:* La aplicación está perdiendo el 85% de su tiempo en la syscall `select`, lo que indica ineficiencia en cómo maneja múltiples conexiones de red o descriptores de archivos.

---

### 2. `ltrace`: Depurando a nivel de bibliotecas (Library Calls)

A veces, `strace` es *demasiado* de bajo nivel. Una simple instrucción de impresión en pantalla (como `printf` en C) puede generar docenas de llamadas al sistema complejas. Si quieres ver qué funciones de alto nivel está invocando la aplicación desde las bibliotecas compartidas del sistema (como `glibc`), utilizas `ltrace`.

**Ejemplo de uso:**
Imagina que un binario de terceros falla al validar una contraseña y quieres entender cómo la está comparando:

```bash
$ ltrace ./mi_programa_de_login
puts("Ingrese contraseña: ")                     = 21
getline(0x7ffd9a, 0x7ffd90, 0x7f8a1b)            = 8
strcmp("admin123", "P@ssw0rd_Secreta")           = -1
puts("Acceso denegado")                          = 16

```

*Diagnóstico:* Gracias a `ltrace`, interceptamos la llamada a la función `strcmp` (String Compare) de la biblioteca estándar de C. Acabamos de ver en texto plano la contraseña que ingresó el usuario ("admin123") y la contraseña real contra la que se está comparando ("P@ssw0rd_Secreta"), sin necesidad de descompilar el binario ni leer el código fuente.

**Advertencia de Seguridad:** Como puedes notar, `strace` y `ltrace` son herramientas increíblemente poderosas que pueden exponer contraseñas, tokens y datos sensibles en memoria. Por esta razón, requieren privilegios de `root` para interceptar procesos que no te pertenecen, y en contenedores modernos o sistemas con hardening (como vimos en el Capítulo 11 con SELinux/AppArmor o seccomp), estas herramientas suelen estar bloqueadas por defecto para evitar fugas de información.

Con `strace` y `ltrace` has llegado al nivel de inspección más profundo a nivel de host individual. Sin embargo, en el mundo real, los problemas a menudo no están dentro de tu servidor, sino en los cables (o redes virtuales) que lo conectan con el mundo.

## 13.5 Captura y análisis profundo de tráfico de red (`tcpdump`, `tshark`)

En las secciones anteriores hemos analizado todo lo que ocurre *dentro* del servidor: desde el agotamiento físico de la CPU o el disco, hasta la intercepción de llamadas al Kernel con `strace`. Pero en la arquitectura moderna de microservicios y la nube, tu servidor casi nunca trabaja solo.

¿Qué haces cuando la CPU está inactiva, la memoria sobra, los discos giran felizmente, pero tu API sigue fallando con un "Timeout" al intentar comunicarse con la base de datos? Cuando el problema no está en el host, está en el cable. Es hora de ponerse el sombrero de analista de redes y capturar paquetes en pleno vuelo.

---

### 1. `tcpdump`: El francotirador de la capa de red

`tcpdump` es la herramienta de captura de paquetes (sniffer) más antigua, ubicua y confiable de UNIX. Opera a nivel de la Capa de Enlace/Red (Capas 2 y 3 del modelo OSI), capturando el tráfico que entra y sale de tus interfaces de red antes de que las reglas restrictivas de los firewalls locales (como `iptables`) lo procesen, o justo después de que salgan.

**El error de novato (y cómo evitarlo):**
Si ejecutas `tcpdump` sin argumentos en un servidor ocupado, tu terminal se inundará de miles de líneas indescifrables por segundo, tu conexión SSH podría colapsar y no entenderás nada. El secreto de `tcpdump` radica en dominar **BPF (Berkeley Packet Filter)**, un lenguaje de sintaxis diseñado para filtrar paquetes a nivel del kernel *antes* de que lleguen a la herramienta, ahorrando muchísima CPU.

**Los mandamientos de `tcpdump` para un Senior:**

1. **Siempre usa `-nn`:** Esto le dice a `tcpdump` que no intente resolver direcciones IP a nombres de host (DNS) ni números de puerto a servicios (ej. `80` a `http`). Si tienes un problema de red y `tcpdump` intenta hacer una consulta DNS por cada paquete que captura, no solo será lentísimo, sino que generarás una tormenta de tráfico recursivo.
2. **Limita la captura a una interfaz:** Usa `-i eth0` (o `any` si no estás seguro de por dónde viaja el tráfico).

**Casos de uso críticos:**

* **Verificar si el tráfico llega al servidor:**
Supongamos que un cliente dice que no puede acceder a tu puerto 443 (HTTPS), pero tu aplicación está corriendo perfectamente.
```bash
$ sudo tcpdump -i eth0 -nn port 443

```


*Diagnóstico:* Si no ves paquetes entrar cuando el cliente hace la petición, el problema no es tu servidor; es un firewall externo (AWS Security Group, balanceador de carga, etc.) que está bloqueando el tráfico antes de que llegue a ti.
* **Aislar la comunicación entre dos hosts:**
Tu API (10.0.0.5) se comunica con la Base de Datos (10.0.0.50). Quieres ver solo ese tráfico bidireccional:
```bash
$ sudo tcpdump -i any -nn host 10.0.0.5 and host 10.0.0.50

```


* **Capturar para análisis forense (El estándar de la industria):**
En una crisis a las 3:00 a.m., no te pones a leer paquetes en la terminal. Los guardas en un archivo `.pcap` para analizarlos más tarde en tu laptop con una interfaz gráfica cómoda como Wireshark.
```bash
$ sudo tcpdump -i eth0 -nn -w captura_incidente.pcap -s 0

```


*(Nota: `-s 0` le indica que capture el paquete completo, sin recortarlo).*

---

### 2. `tshark`: El bisturí de la capa de aplicación

Mientras que `tcpdump` es excelente para saber *si* los paquetes viajan (viendo IPs, puertos y flags TCP como SYN/ACK), es bastante "tonto" respecto al contenido de esos paquetes. Si quieres leer el cuerpo de una petición HTTP en texto plano o ver exactamente qué consulta SQL falló, `tcpdump` te mostrará un volcado hexadecimal difícil de leer.

Aquí entra `tshark` (Terminal Wireshark). Es la versión de línea de comandos del famoso analizador de protocolos Wireshark. Su superpoder es la **Inspección Profunda de Paquetes (DPI)**: entiende cientos de protocolos de la Capa de Aplicación (Capa 7).

**Casos de uso avanzados con `tshark`:**

* **Analizar un archivo PCAP generado por `tcpdump`:**
En lugar de descargar el `.pcap` a tu máquina, lo analizas directamente en el servidor.
```bash
$ tshark -r captura_incidente.pcap -Y "http.request.method == GET"

```


*Diagnóstico:* Esto filtra un archivo crudo gigante y te muestra únicamente las peticiones HTTP tipo GET, en un formato humanamente legible.
* **Cazar latencia en consultas DNS:**
Si el sistema se siente "lento" de forma intermitente, suele ser culpa del DNS. Podemos usar `tshark` en vivo para imprimir solo las consultas DNS que tardan más de un tiempo determinado:
```bash
$ sudo tshark -i eth0 -f "udp port 53" -Y "dns.time > 0.1" -T fields -e dns.qry.name -e dns.time

```


*Diagnóstico:* Esto imprimirá en pantalla únicamente los dominios que tardaron más de 100ms en resolverse, identificando inmediatamente si tu servidor DNS primario está degradado.

---

### Diagrama de Flujo: El Ciclo del Análisis de Red DevOps

```text
[ ALARMA: Timeout entre Microservicio A y Microservicio B ]
                               |
                               v
            ¿Están las IPs y puertos correctos? (Revisar logs/configs)
                               |
            +------------------+------------------+
            |                                     |
    Ejecutar: tcpdump -i eth0 -nn port [X]        |
            |                                     |
      ¿Llegan los paquetes (Flags SYN)?           |
            |                                     |
    +-------+-------+                     ¿Se establece la conexión (3-way handshake)
    |               |                     pero la app da error lógico/HTTP 500?
    SÍ              NO                            |
    |               |                             v
    v               v               Ejecutar: tshark -i eth0 -Y "http.response.code == 500"
 El host B       Firewall / VPC                   |
 no responde.    bloqueando.                      v
 (Revisar App B  (Revisar red             Inspeccionar el payload/cabeceras
 o iptables)     cloud)                   para entender el fallo a nivel App.

```

Dominar `tcpdump` y `tshark` elimina el juego de las adivinanzas entre los equipos de desarrollo y los de infraestructura. Cuando un desarrollador dice *"La red está cortando mi conexión"*, un ingeniero DevOps Senior no discute: simplemente le envía un archivo `.pcap` que demuestra empíricamente si el tráfico llegó o si la aplicación cerró la conexión prematuramente (un flag TCP `RST` o `FIN`).

Con esto cerramos las herramientas de depuración tradicionales. Sin embargo, en los últimos años, el ecosistema de Linux ha sufrido una revolución absoluta en observabilidad que permite inspeccionar el Kernel y la red casi sin impacto en el rendimiento.

## 13.6 Introducción al trazado moderno y observabilidad (eBPF, `bcc-tools`)

En la sección anterior aprendimos a capturar paquetes de red y en la 13.4 vimos cómo `strace` intercepta llamadas al sistema. Sin embargo, si eres un ingeniero DevOps Senior y ejecutas `strace` o `tcpdump` en un servidor de producción con alta concurrencia (por ejemplo, una base de datos procesando miles de transacciones por segundo), cometerás un error fatal: **derribarás el servidor por la sobrecarga**.

`strace` detiene el proceso cada vez que hace una llamada al sistema, copia los datos al espacio de usuario, y luego reanuda el proceso. Esto puede ralentizar una aplicación hasta un 80%. ¿Cómo logran empresas como Netflix, Meta o Google monitorear servidores masivos sin impacto en el rendimiento? La respuesta es la revolución más grande de Linux en la última década: **eBPF**.

---

### 1. ¿Qué es eBPF? (El JavaScript del Kernel)

Históricamente, si querías cambiar la forma en que el Kernel de Linux monitoreaba algo, tenías dos opciones horribles: escribir un módulo del Kernel (que si tenía un *bug*, causaba un Kernel Panic y apagaba el servidor) o esperar años a que la comunidad de Linux aceptara tu parche.

**eBPF (Extended Berkeley Packet Filter)** cambia las reglas del juego. Permite ejecutar programas personalizados y aislados (*sandboxed*) **directamente dentro del Kernel de Linux**, en tiempo real, de forma 100% segura y sin necesidad de reiniciar.

Si el navegador web usa JavaScript para volverse interactivo sin recompilar el código del navegador, Linux usa eBPF para volverse programable sin recompilar el Kernel.

**Diagrama: El paradigma tradicional vs. eBPF**

```text
[ ENFOQUE TRADICIONAL (ej. strace) ]
  User Space:   App  <--->  strace (Lento, mucho salto de contexto)
                 |            ^
                 v            | (Sobrecarga de copia de datos)
  Kernel Space: Syscall ------+


[ ENFOQUE eBPF ]
  User Space:   App         Herramienta de Observabilidad
                 |            ^
                 v            | (Solo envía resúmenes asíncronos)
  Kernel Space: Syscall ---> [ Programa eBPF ] -> (Procesa y filtra a velocidad nativa)

```

En lugar de extraer cada evento al Espacio de Usuario para analizarlo, **eBPF analiza los eventos directamente dentro del Kernel** y solo envía los resúmenes (ej. "Esta syscall falló 50 veces") a tu terminal. La sobrecarga es prácticamente nula (del orden del 1% o 2%).

---

### 2. `bcc-tools`: Tu navaja suiza de eBPF

Escribir código eBPF puro en lenguaje C es complejo. Afortunadamente, no tienes que hacerlo. La comunidad ha creado la **BPF Compiler Collection (BCC)**, un paquete que incluye decenas de scripts listos para usar (normalmente escritos en Python) que inyectan programas eBPF por ti.

En distribuciones basadas en Debian/Ubuntu, se instalan con `apt install bpfcc-tools`. En RHEL/CentOS con `yum install bcc-tools`. Todas estas herramientas suelen llevar el sufijo `-bpfcc` o simplemente ejecutarse como scripts.

Aquí tienes el arsenal fundamental de `bcc-tools` para un DevOps:

**A) `execsnoop` (Cazando procesos efímeros)**
A veces un servidor tiene picos de carga inexplicables, pero cuando miras `htop`, no ves nada. Esto ocurre por "procesos de vida corta" (ej. un *cronjob* mal configurado o un script de Bash llamando miles de veces a `sed` o `awk`). `execsnoop` registra cada comando que se ejecuta en el sistema en el milisegundo en que nace.

```bash
$ sudo execsnoop-bpfcc
PCOMM            PID    PPID   RET ARGS
updatedb         12345  1      0   /usr/bin/updatedb
grep             12346  12345  0   grep -v /var/lib/docker

```

*Diagnóstico:* Has descubierto que el culpable de la lentitud es el actualizador de la base de datos de archivos (`updatedb`), que se disparó en segundo plano.

**B) `opensnoop` (El reemplazo seguro de strace para archivos)**
Te permite ver todos los archivos que se están abriendo en el sistema en tiempo real, a través de todos los procesos, sin la sobrecarga de `strace`.

```bash
$ sudo opensnoop-bpfcc
PID    COMM               FD ERR PATH
981    mysqld             34   0 /var/lib/mysql/ibdata1
2341   python3            -1   2 /etc/mi_app/config.ini

```

*Diagnóstico:* El script de Python está intentando abrir un archivo de configuración, pero devuelve el error `2` (`ENOENT`: No such file). Has encontrado el problema sin tocar el código de la aplicación.

**C) `ext4slower` / `xfs_slower` (Latencia real de disco)**
`iostat` (visto en la sección 13.3) te muestra si el hardware de almacenamiento está lento. Pero a veces el hardware está bien, y el problema es la forma en que el sistema de archivos (ext4, xfs) está gestionando la cola de datos. Estas herramientas te muestran **únicamente** las operaciones de lectura/escritura que superan un umbral de tiempo (ej. más de 10 milisegundos).

```bash
$ sudo ext4slower-bpfcc 10
TIME     COMM           PID    T BYTES   OFF_KB   LAT(ms)
10:15:02 dockerd        1532   W 8192    0          15.23
10:15:10 postgres       2931   S 0       0          22.10

```

*Diagnóstico:* La letra `S` indica un "Sync" (forzar escritura a disco). Postgres está sufriendo una latencia de 22ms para sincronizar datos, lo que explica por qué las transacciones están lentas, aunque el disco en promedio no parezca saturado.

**D) `tcplife` (El ciclo de vida de la red)**
En lugar de capturar paquetes masivos con `tcpdump`, `tcplife` registra asíncronamente las conexiones TCP *solo cuando se cierran*, mostrándote quién se conectó, por cuánto tiempo y cuántos datos transmitió.

```bash
$ sudo tcplife-bpfcc
PID   COMM       LADDR           LPORT RADDR           RPORT TX_KB RX_KB MS
2231  nginx      10.0.0.5        443   192.168.1.50    54321   154     2 120.5

```

*Diagnóstico:* Un simple vistazo te permite auditar el tráfico, ver qué conexiones están consumiendo más ancho de banda y detectar micro-cortes si el tiempo (MS) es inusualmente bajo para conexiones que deberían ser persistentes.

---

### Resumen del Capítulo

Llegar a este nivel de depuración es lo que define a un Senior en DevOps y Site Reliability Engineering (SRE). Hemos recorrido el camino completo:

1. Vista global con **`htop` y `glances`**.
2. Diagnóstico de hardware (CPU/RAM/Disco) con **`vmstat`, `mpstat` e `iostat`**.
3. Inspección profunda de procesos con **`strace`**.
4. Análisis de red con **`tcpdump`**.
5. Observabilidad de nueva generación y cero impacto con **eBPF (`bcc-tools`)**.

El hardware rara vez miente. Cuando la aplicación no deja logs, el Kernel de Linux siempre tiene la respuesta, siempre y cuando sepas qué comando utilizar para preguntarle.
