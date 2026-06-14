Tras dominar la consulta y manipulación de registros, es momento de tomar las herramientas de arquitectura. El **Lenguaje de Definición de Datos (DDL)** nos permite trascender el papel de usuarios para convertirnos en diseñadores. En este capítulo, aprenderás a construir el "esqueleto" de una base de datos desde cero. Exploraremos cómo la sentencia `CREATE` da vida a las tablas, cómo `ALTER` permite adaptarlas al cambio y cómo las **Restricciones** actúan como guardianes de la integridad. Finalmente, descubriremos las **Vistas**, potentes abstracciones que simplifican la complejidad, transformando consultas extensas en estructuras virtuales elegantes y seguras.

## 8.1. Creación y alteración de tablas (`CREATE`, `ALTER`)

Hasta este punto del libro, hemos asumido que las tablas ya existían. Has aprendido a consultarlas (DQL) y a modificar sus datos (DML). Ahora, en este capítulo, damos un salto hacia el **Lenguaje de Definición de Datos (DDL)**. Como arquitecto de la base de datos, necesitas saber cómo construir los cimientos donde residirá la información.

Las sentencias `CREATE` y `ALTER` son tus herramientas de construcción y remodelación.

---

### 1. Creación de Tablas (`CREATE TABLE`)

La sentencia `CREATE TABLE` le indica al motor de base de datos que reserve espacio y defina la estructura de una nueva entidad en tu esquema.

Para crear una tabla, necesitas tres elementos esenciales que ya introdujimos en el Capítulo 1: el nombre de la tabla, los nombres de sus columnas y los tipos de datos que albergará cada una.

**Sintaxis básica:**

```sql
CREATE TABLE nombre_de_la_tabla (
    columna1 tipo_de_dato,
    columna2 tipo_de_dato,
    columna3 tipo_de_dato,
    ...
);

```

**Ejemplo práctico:**
Imagina que necesitamos crear una tabla para gestionar los proyectos de nuestra empresa. Sabiendo cómo funcionan las Claves Primarias (Capítulo 5.1) y los tipos de datos (Capítulo 1.4), estructuraríamos la tabla de la siguiente manera:

```sql
CREATE TABLE Proyectos (
    ProyectoID INT PRIMARY KEY,
    NombreProyecto VARCHAR(100),
    FechaInicio DATE,
    Presupuesto DECIMAL(12, 2)
);

```

> **Nota para el mundo real:** Muchos motores de bases de datos soportan la cláusula `IF NOT EXISTS` (ej. `CREATE TABLE IF NOT EXISTS Proyectos...`). Esto es una excelente práctica en scripts automatizados para evitar errores si la tabla ya fue creada previamente.

**Clonación de tablas (CTAS)**
Una técnica avanzada y sumamente útil es crear una tabla a partir del resultado de una consulta utilizando **CREATE TABLE AS SELECT** (conocida como CTAS). Esto copia tanto la estructura de las columnas como los datos resultantes de tu `SELECT`.

```sql
CREATE TABLE Proyectos_Historicos AS
SELECT ProyectoID, NombreProyecto, Presupuesto
FROM Proyectos
WHERE FechaInicio < '2020-01-01';

```

---

### 2. Alteración de Tablas (`ALTER TABLE`)

Las aplicaciones evolucionan, y con ellas, los requerimientos de datos. Rara vez la estructura inicial de una base de datos permanece estática. La sentencia `ALTER TABLE` te permite modificar la estructura de una tabla existente sin tener que eliminarla (lo cual borraría todos sus datos).

Puedes usar `ALTER` principalmente para tres operaciones: añadir, modificar o eliminar columnas.

**A. Añadir una nueva columna (`ADD`)**
Si el departamento de finanzas ahora requiere rastrear el estado actual de cada proyecto, podemos añadir la columna fácilmente:

```sql
ALTER TABLE Proyectos
ADD Estado VARCHAR(20);

```

*Atención:* Cuando añades una columna a una tabla que ya contiene registros, esta nueva columna se llenará con valores `NULL` para todas las filas existentes (a menos que definas un valor por defecto, lo cual veremos en la sección 8.2).

**B. Modificar una columna existente (`ALTER COLUMN` / `MODIFY`)**
Supongamos que los proyectos han crecido y el límite de 12 dígitos para el presupuesto ya no es suficiente. Queremos ampliarlo a 15 dígitos.

*La sintaxis aquí puede variar ligeramente dependiendo de tu RDBMS (Relational Database Management System):*

```sql
-- En PostgreSQL y SQL Server:
ALTER TABLE Proyectos
ALTER COLUMN Presupuesto DECIMAL(15, 2);

-- En MySQL y Oracle:
ALTER TABLE Proyectos
MODIFY Presupuesto DECIMAL(15, 2);

```

**C. Eliminar una columna (`DROP COLUMN`)**
Si una columna se vuelve obsoleta y deseas recuperar espacio o limpiar tu esquema, puedes eliminarla de forma definitiva.

```sql
ALTER TABLE Proyectos
DROP COLUMN Estado;

```

> **Advertencia de Nivel Avanzado:** Usar `ALTER TABLE` (especialmente para añadir o modificar columnas) en tablas gigantes en un entorno de producción puede bloquear la tabla, impidiendo que otras consultas se ejecuten mientras dura el cambio. En el Capítulo 10 abordaremos consideraciones de rendimiento, pero ten en mente que los cambios estructurales deben planificarse cuidadosamente.

En esta sección hemos construido el "esqueleto" de nuestras tablas. Sin embargo, una base de datos robusta necesita reglas estrictas para garantizar la calidad y coherencia de los datos que ingresan a este esqueleto.

## 8.2. Restricciones (Constraints): `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`

En la sección anterior construimos el "esqueleto" de nuestras tablas con `CREATE` y `ALTER`. Sin embargo, una estructura sin reglas es propensa al caos. Si dejas que cualquier tipo de dato entre en tus tablas, eventualmente tu base de datos perderá confiabilidad.

Aquí es donde entran las **Restricciones (Constraints)**. Son las reglas de negocio y las "leyes" que impones a tus columnas para garantizar la integridad de los datos. Ya analizamos las restricciones de relación en el Capítulo 5 (Claves Primarias y Foráneas). Ahora, exploraremos cuatro restricciones fundamentales para controlar la calidad de la información a nivel de columna.

### 1. `NOT NULL` (Evitando los vacíos)

Por defecto, cualquier columna en SQL acepta valores nulos (`NULL`), lo que significa "ausencia de datos". La restricción `NOT NULL` prohíbe explícitamente que una fila se guarde si esa columna está vacía. Es ideal para datos obligatorios.

```sql
CREATE TABLE Empleados (
    EmpleadoID INT PRIMARY KEY,
    -- Un empleado DEBE tener un nombre. No se acepta NULL.
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL
);

```

### 2. `UNIQUE` (Garantizando la exclusividad)

La restricción `UNIQUE` asegura que todos los valores de una columna sean distintos entre sí. Es similar a una Clave Primaria, pero con dos diferencias clave:

1. Una tabla solo puede tener **una** Clave Primaria, pero puede tener **múltiples** restricciones `UNIQUE`.
2. Dependiendo del motor de base de datos, una columna `UNIQUE` generalmente permite registrar un único valor `NULL` (ya que `NULL` no es igual a otro `NULL`).

```sql
CREATE TABLE Usuarios (
    UsuarioID INT PRIMARY KEY,
    -- Dos usuarios no pueden registrarse con el mismo correo.
    Email VARCHAR(100) UNIQUE,
    Username VARCHAR(30) UNIQUE
);

```

### 3. `DEFAULT` (Valores por defecto)

Cuando insertas un registro (como vimos en el Capítulo 6.1) y omites una columna, SQL insertará un `NULL`. La restricción `DEFAULT` cambia este comportamiento, inyectando un valor predeterminado que tú definas. Es excelente para ahorrar tiempo y estandarizar datos.

```sql
CREATE TABLE Tareas (
    TareaID INT PRIMARY KEY,
    Descripcion VARCHAR(200),
    -- Si no se especifica el estado al crear la tarea, será 'Pendiente'.
    Estado VARCHAR(20) DEFAULT 'Pendiente',
    -- Usa funciones del sistema para registrar la fecha actual.
    FechaCreacion DATE DEFAULT CURRENT_DATE
);

```

### 4. `CHECK` (Validación lógica personalizada)

El `CHECK` es la restricción más flexible. Te permite definir una condición lógica (muy similar a lo que harías en una cláusula `WHERE`) que el dato debe cumplir para ser aceptado. Si la condición resulta falsa, la base de datos rechaza la inserción o actualización, lanzando un error.

```sql
CREATE TABLE Productos (
    ProductoID INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    -- El precio jamás puede ser negativo.
    Precio DECIMAL(10, 2) CHECK (Precio >= 0),
    -- La categoría debe ser una de estas tres opciones.
    Categoria VARCHAR(20) CHECK (Categoria IN ('Electrónica', 'Hogar', 'Juguetes'))
);

```

---

### Poniendo todo junto y nombrándolas

Aunque puedes definir las restricciones directamente al lado del tipo de dato, una excelente práctica profesional es **darles un nombre explícito** usando la palabra clave `CONSTRAINT`. Esto facilita enormemente identificarlas si en el futuro necesitas modificarlas o eliminarlas con un `ALTER TABLE`.

Veamos un ejemplo consolidado:

```sql
CREATE TABLE Suscripciones (
    SuscripcionID INT PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    Plan VARCHAR(20) DEFAULT 'Básico',
    Precio DECIMAL(8,2),
    
    -- Nombrando restricciones a nivel de tabla
    CONSTRAINT uq_suscripcion_email UNIQUE (Email),
    CONSTRAINT chk_precio_valido CHECK (Precio >= 0)
);

```

Si en el futuro quisieras eliminar la regla del precio utilizando lo que aprendimos en la sección 8.1, simplemente harías:
`ALTER TABLE Suscripciones DROP CONSTRAINT chk_precio_valido;`

Con estas restricciones, tus tablas no solo tienen estructura, sino que actúan como guardianes de la calidad de tus datos.

## 8.3. Creación y gestión de Vistas (`VIEW`)

Hasta ahora, hemos trabajado con tablas físicas: estructuras reales que ocupan espacio en el disco de tu servidor y almacenan datos de forma permanente. Sin embargo, a medida que domines los `JOIN` (Capítulo 5) y las Subconsultas (Capítulo 7), notarás que algunas consultas se vuelven inmensamente largas y complejas.

¿Qué pasa si tu equipo necesita ejecutar un reporte de 50 líneas de código todos los días? Copiar y pegar esa consulta no es eficiente ni seguro. La solución a esto son las **Vistas (`VIEW`)**.

Una Vista es, en esencia, una **tabla virtual**. No almacena datos por sí misma; lo que guarda es la *consulta* que genera esos datos. Actúa como una ventana a través de la cual puedes mirar la información de tus tablas base, pero pre-formateada y lista para usarse.

---

### 1. Creación de una Vista (`CREATE VIEW`)

Crear una vista es tan sencillo como tomar tu consulta `SELECT` favorita y ponerle un nombre usando la instrucción `CREATE VIEW`.

**Sintaxis básica:**

```sql
CREATE VIEW nombre_de_la_vista AS
SELECT columna1, columna2
FROM tabla_base
WHERE condicion;

```

**Ejemplo práctico:**
Imagina que frecuentemente necesitas un reporte que una la tabla de `Proyectos` con la de `Empleados` para ver quién es el responsable de cada proyecto activo y cuál es su presupuesto. En lugar de escribir el `INNER JOIN` cada vez, creas una vista:

```sql
CREATE VIEW vista_proyectos_activos AS
SELECT 
    p.NombreProyecto, 
    p.Presupuesto, 
    e.Nombre AS Responsable, 
    e.Apellido
FROM Proyectos p
INNER JOIN Empleados e ON p.ResponsableID = e.EmpleadoID
WHERE p.Estado = 'En curso';

```

Una vez creada, puedes consultarla exactamente igual que si fuera una tabla normal, usando todo lo que aprendiste en la Parte I y II del libro:

```sql
-- Ahora tu consulta compleja se reduce a esto:
SELECT * FROM vista_proyectos_activos 
ORDER BY Presupuesto DESC;

```

---

### 2. Modificación y eliminación de Vistas

Las reglas de negocio cambian, y es probable que necesites ajustar la consulta que da vida a tu vista.

**Modificar (`CREATE OR REPLACE VIEW` / `ALTER VIEW`):**
La mayoría de los motores modernos (como PostgreSQL, MySQL y Oracle) soportan la cláusula `OR REPLACE`, que sobrescribe la vista si ya existe. En SQL Server, se utiliza `ALTER VIEW`.

```sql
-- Ejemplo en PostgreSQL / MySQL: Añadiendo una columna extra a la vista
CREATE OR REPLACE VIEW vista_proyectos_activos AS
SELECT 
    p.NombreProyecto, 
    p.Presupuesto, 
    p.FechaInicio, -- ¡Nueva columna añadida!
    e.Nombre AS Responsable
FROM Proyectos p
INNER JOIN Empleados e ON p.ResponsableID = e.EmpleadoID
WHERE p.Estado = 'En curso';

```

**Eliminar (`DROP VIEW`):**
Si la vista ya no es necesaria, puedes destruirla sin miedo. Al eliminar una vista, **no borras ningún dato**, ya que los datos reales viven en las tablas base. Solo estás eliminando la "ventana".

```sql
DROP VIEW vista_proyectos_activos;

```

---

### 3. ¿Por qué deberías usar Vistas? (Casos de uso clave)

Más allá de ahorrarte escribir código repetitivo, las vistas son fundamentales en el diseño de bases de datos por dos grandes razones:

* **Seguridad y Restricción de Acceso:** Imagina que tienes una tabla `Empleados` que contiene sus salarios. Quieres que el equipo de IT pueda ver los nombres y correos, pero *no* los salarios. Puedes crear una vista que solo seleccione las columnas no sensibles y darle al equipo de IT acceso únicamente a esa vista, bloqueando su acceso a la tabla original.
* **Abstracción de la Complejidad:** Si tienes una lógica de negocio muy compleja (por ejemplo, el cálculo de impuestos a través de varias tablas), puedes encapsular esa lógica en una vista. Si la fórmula de impuestos cambia mañana, solo actualizas la vista; el resto de las aplicaciones que leen esa vista no tendrán que modificar su código.

> **Nota importante:** En la mayoría de los casos, las vistas son de **solo lectura**. Si intentas hacer un `INSERT`, `UPDATE` o `DELETE` directamente sobre una vista que contiene `JOINs`, agrupaciones (`GROUP BY`) o funciones agregadas, el motor de base de datos te devolverá un error. Las operaciones DML pesadas deben ir directamente a las tablas base.

Con esto concluimos el Capítulo 8 y tu dominio sobre el Lenguaje de Definición de Datos (DDL). Ya sabes cómo construir, alterar, restringir y virtualizar tus estructuras de datos.
