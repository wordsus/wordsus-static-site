## **Parte I: Los Cimientos del Sistema**

*Esta sección cubre lo necesario para moverse con soltura por el sistema operativo, entender su estructura y realizar operaciones diarias sin depender de una interfaz gráfica.*

**Capítulo 1: Fundamentos y Filosofía de Linux**

* 1.1 ¿Qué es Linux? Kernel, Shell y el Espacio de Usuario
* 1.2 La Terminal vs. La Shell (Bash, Zsh)
* 1.3 El árbol de directorios estándar (`/etc`, `/var`, `/home`, `/usr`)
* 1.4 Navegación básica y rutas absolutas vs. relativas (`pwd`, `cd`, `ls`)
* 1.5 Obtención de ayuda en la terminal (`man`, `--help`, `info`, `apropos`)

**Capítulo 2: Manipulación de Archivos y Directorios**

* 2.1 Creación y destrucción de entidades (`touch`, `mkdir`, `rm`, `rmdir`)
* 2.2 Movimiento y clonación de datos (`cp`, `mv`)
* 2.3 Visualización e inspección de archivos (`cat`, `less`, `tail`, `head`, `watch`)
* 2.4 Enlaces duros y simbólicos (`ln`, `ln -s`)
* 2.5 Búsqueda de archivos en el sistema (`find`, `locate`, `which`, `whereis`)

**Capítulo 3: Identidad, Usuarios y Privilegios**

* 3.1 Gestión de usuarios y grupos (`useradd`, `usermod`, `userdel`, `groupadd`)
* 3.2 El modelo de permisos estándar de UNIX (`chmod`, `chown`, `chgrp`)
* 3.3 Escalado de privilegios de forma segura (`su`, `sudo`, `visudo`)
* 3.4 Listas de Control de Acceso (ACLs) para permisos granulares (`getfacl`, `setfacl`)

## **Parte II: Operaciones e Infraestructura**

*Aquí damos el salto a la administración del sistema. Estas son las herramientas críticas para mantener servidores corriendo, actualizar software y gestionar tareas.*

**Capítulo 4: Gestión de Procesos y Servicios**

* 4.1 El ciclo de vida de un proceso (PID, PPID, Estados)
* 4.2 Listado y búsqueda de procesos (`ps`, `pgrep`)
* 4.3 Señales y terminación de procesos (`kill`, `killall`, `pkill`)
* 4.4 Procesos en primer y segundo plano (`&`, `bg`, `fg`, `jobs`, `nohup`, `tmux`/`screen`)
* 4.5 El gestor de inicio Systemd (`systemctl`, unidades, targets)
* 4.6 Análisis de logs del sistema (`journalctl`)

**Capítulo 5: Gestión de Paquetes y Software**

* 5.1 Gestión en sistemas basados en Debian/Ubuntu (`apt`, `apt-get`, `dpkg`)
* 5.2 Gestión en sistemas basados en RHEL/CentOS (`yum`, `dnf`, `rpm`)
* 5.3 Gestión de repositorios y resolución de dependencias
* 5.4 Empaquetado y compresión de archivos (`tar`, `gzip`, `zip`, `unzip`)

**Capítulo 6: Almacenamiento y Sistemas de Archivos**

* 6.1 Inspección de discos y bloques (`lsblk`, `df`, `du`)
* 6.2 Particionado de discos (`fdisk`, `parted`)
* 6.3 Creación de sistemas de archivos (`mkfs.ext4`, `mkfs.xfs`)
* 6.4 Montaje temporal y persistente (`mount`, `umount`, `/etc/fstab`)
* 6.5 Gestión de Volúmenes Lógicos (LVM: `pvcreate`, `vgcreate`, `lvcreate`, `lvextend`)

## **Parte III: Automatización y Procesamiento de Datos**

*Un DevOps no hace tareas manuales repetitivas. Esta sección es el corazón de la automatización y el análisis rápido de logs.*

**Capítulo 7: Tuberías (Pipes) y Redirecciones**

* 7.1 Entradas, salidas y errores estándar (stdin, stdout, stderr)
* 7.2 Redirección de flujos (`>`, `>>`, `<`, `2>&1`)
* 7.3 Conectando comandos con tuberías (`|`)
* 7.4 El comando `tee` y la manipulación segura de flujos

**Capítulo 8: La Santísima Trinidad del Procesamiento de Texto**

* 8.1 Búsqueda de patrones con Expresiones Regulares (`grep`, `egrep`, `zgrep`)
* 8.2 Edición de flujos y sustitución de texto (`sed`)
* 8.3 Extracción y procesamiento avanzado de columnas (`awk`)
* 8.4 Herramientas complementarias de texto (`cut`, `sort`, `uniq`, `tr`, `wc`)

**Capítulo 9: Scripting Avanzado en Bash**

* 9.1 Shebangs, ejecución y variables de entorno (`export`, `env`)
* 9.2 Condicionales y operadores lógicos (`if`, `case`, `&&`, `||`)
* 9.3 Ciclos de iteración (`for`, `while`)
* 9.4 Funciones, parámetros posicionales y manejo de errores (Exit codes)
* 9.5 Automatización basada en tiempo (`cron`, `crontab`, `at`)

## **Parte IV: Redes, Seguridad y El Ecosistema DevOps**

*El terreno de los Senior. Aquí conectas servidores, diagnosticas caídas de red, aseguras el sistema y entiendes cómo funcionan los contenedores por debajo.*

**Capítulo 10: Redes y Troubleshooting de Conectividad**

* 10.1 Interfaces de red y enrutamiento (`ip a`, `ip route`)
* 10.2 Diagnóstico de conectividad y latencia (`ping`, `traceroute`, `mtr`)
* 10.3 Resolución y depuración de DNS (`dig`, `nslookup`, `host`, `/etc/hosts`)
* 10.4 Análisis de puertos abiertos y conexiones (`ss`, `netstat`, `lsof -i`)
* 10.5 Clientes HTTP de línea de comandos (`curl`, `wget`)

**Capítulo 11: Seguridad y Hardening del Sistema**

* 11.1 Criptografía básica y sumas de verificación (`md5sum`, `sha256sum`, base64)
* 11.2 Acceso remoto seguro (SSH, `ssh-keygen`, `ssh-copy-id`, túneles SSH, `sshd_config`)
* 11.3 Gestión de Firewalls de host (`iptables`, `ufw`, `firewalld`)
* 11.4 Conceptos de Control de Acceso Mandatorio (SELinux, AppArmor)

**Capítulo 12: Las Entrañas de los Contenedores (Linux Internals)**

* 12.1 Aislamiento de procesos clásico (`chroot`)
* 12.2 Aislamiento de recursos: Namespaces (PID, Mount, Network)
* 12.3 Limitación de recursos: Control Groups (`cgroups`)
* 12.4 Inspección y depuración de contenedores desde el nodo host (`nsenter`)

**Capítulo 13: Monitoreo Avanzado, Performance y Debugging (Nivel Senior)**

* 13.1 Monitoreo de recursos en tiempo real (`top`, `htop`, `atop`, `glances`)
* 13.2 Análisis de cuellos de botella de CPU y Memoria (`vmstat`, `free`, `mpstat`)
* 13.3 Análisis de cuellos de botella de Disco/IO (`iostat`, `iotop`)
* 13.4 Intercepción de llamadas al sistema (System Calls) para depuración (`strace`, `ltrace`)
* 13.5 Captura y análisis profundo de tráfico de red (`tcpdump`, `tshark`)
* 13.6 Introducción al trazado moderno y observabilidad (eBPF, `bcc-tools`)
