La verdadera utilidad de los datos no reside solo en su almacenamiento, sino en nuestra capacidad para presentarlos de forma estructurada. En este capítulo, aprenderás a transformar resultados caóticos en listas organizadas y manejables. Primero, dominaremos la cláusula `ORDER BY` para clasificar información bajo criterios alfabéticos, numéricos o cronológicos, tanto de forma ascendente como descendente. Finalmente, exploraremos las técnicas de restricción de filas mediante `LIMIT`, `TOP` y `FETCH FIRST`, herramientas esenciales para optimizar el rendimiento de las consultas y gestionar la paginación en aplicaciones reales. Es el paso final para que tus consultas pasen de simples a profesionales.

## 3.1. Ordenar resultados con `ORDER BY` (ASC/DESC)

Hasta este punto del libro, has aprendido a extraer las columnas que necesitas y a filtrar las filas para obtener exactamente los datos que buscas. Sin embargo, si has ejecutado consultas en tu gestor de base de datos, probablemente hayas notado algo importante: **los resultados no tienen un orden predecible**.

En el modelo relacional, las tablas son conjuntos matemáticos y, por definición, los conjuntos no tienen un orden inherente. Si ejecutas la misma consulta `SELECT` varias veces sin especificar un orden, el motor de la base de datos es libre de devolverte las filas en la secuencia que le resulte más rápida o conveniente en ese momento.

Para tomar el control y organizar nuestra información de forma lógica (por ejemplo, del producto más barato al más caro, o alfabéticamente de la A a la Z), utilizamos la cláusula **`ORDER BY`**.

---

### Sintaxis básica y Direcciones de Ordenamiento

La cláusula `ORDER BY` se coloca al final de tu consulta, justo después del `WHERE` (si es que estás usando uno). Su comportamiento se controla mediante dos palabras clave principales:

* **`ASC` (Ascendente):** Ordena de menor a mayor (1 al 9), alfabéticamente de la A a la Z, o desde la fecha más antigua a la más reciente. **Es el valor por defecto.** Si escribes `ORDER BY columna` y omites la dirección, SQL asumirá que es `ASC`.
* **`DESC` (Descendente):** Ordena de mayor a menor (9 al 1), alfabéticamente de la Z a la A, o desde la fecha más reciente a la más antigua.

**Ejemplo básico:**
Imagina que tenemos una tabla llamada `Empleados`. Queremos ver a todos los empleados del departamento de 'Ventas', pero ordenados desde el que tiene el salario más alto hasta el más bajo.

```sql
SELECT nombre, apellido, salario
FROM Empleados
WHERE departamento = 'Ventas'
ORDER BY salario DESC;

```

---

### Ordenar por múltiples columnas

El verdadero poder de `ORDER BY` se revela cuando necesitas organizar los datos utilizando más de un criterio. Cuando especificas varias columnas separadas por comas, SQL ordena primero por la primera columna indicada. Si encuentra empates (filas que tienen exactamente el mismo valor en esa primera columna), entonces utiliza la segunda columna para desempatar, y así sucesivamente.

**Ejemplo con múltiples columnas:**
Queremos un listado de empleados ordenado primero alfabéticamente por su departamento (de la A a la Z). Dentro de cada departamento, queremos que los empleados se muestren desde el contratado más recientemente al más antiguo.

```sql
SELECT nombre, departamento, fecha_contratacion
FROM Empleados
ORDER BY departamento ASC, fecha_contratacion DESC;

```

> **Nota del Maestro:** Observa cómo cada columna en el `ORDER BY` puede tener su propia dirección de ordenamiento (`ASC` o `DESC`). Son completamente independientes.

---

### Trucos de sintaxis: Alias y Posiciones

Dado que en el orden de evaluación lógico de SQL la cláusula `SELECT` se procesa *antes* que el `ORDER BY`, el motor ya conoce los alias de columnas que hayas definido (tema que vimos en la sección 2.2). Por lo tanto, puedes ordenar utilizando esos alias.

```sql
SELECT nombre, (salario * 1.20) AS salario_proyectado
FROM Empleados
ORDER BY salario_proyectado DESC;

```

Además de los nombres o alias de las columnas, SQL permite ordenar **utilizando el número de posición** de la columna dentro de tu `SELECT`.

```sql
SELECT nombre, departamento, salario
FROM Empleados
ORDER BY 2 ASC, 3 DESC;

```

En el código anterior, `2` representa a `departamento` y `3` representa a `salario`.

> **Advertencia de buenas prácticas:** Aunque ordenar por números de posición es rápido para consultas ad-hoc o pruebas rápidas, **se desaconseja en código en producción**. Si alguien modifica el `SELECT` en el futuro añadiendo o quitando columnas, los números cambiarán de significado, rompiendo silenciosamente la lógica de ordenamiento de tu aplicación. Es mejor ser explícito y usar los nombres de las columnas.

## 3.2. Restricción de filas (`LIMIT`, `TOP` o `FETCH FIRST`)

Imagina que trabajas en una tienda en línea y te piden "los 5 productos más vendidos". Gracias a la sección anterior, ya sabes cómo ordenar los productos de mayor a menor ventas usando `ORDER BY`. Sin embargo, la consulta te devolverá *todos* los productos del catálogo. ¿Cómo le decimos a SQL que se detenga después de encontrar los primeros 5?

Aquí es donde entran las cláusulas de restricción de filas.

A diferencia de `SELECT`, `WHERE` o `ORDER BY`, que son universales, **la forma de limitar filas es uno de los pocos casos donde el lenguaje SQL varía significativamente dependiendo del motor de base de datos (RDBMS)** que estés utilizando.

A continuación, veremos las tres formas principales de lograr este objetivo.

---

### 1. La cláusula `LIMIT` (MySQL, PostgreSQL, SQLite)

Esta es, probablemente, la sintaxis más popular y amigable. Se coloca al final absoluto de tu consulta, justo después del `ORDER BY`.

**Ejemplo:** Obtener los 3 empleados con los salarios más altos.

```sql
SELECT nombre, apellido, salario
FROM Empleados
ORDER BY salario DESC
LIMIT 3;

```

**El superpoder de `LIMIT`: La Paginación con `OFFSET`**
Si estás creando una página web y quieres mostrar los resultados "de 10 en 10", puedes combinar `LIMIT` con `OFFSET`. El `OFFSET` le indica a la base de datos cuántas filas debe "saltarse" antes de empezar a contar el límite.

```sql
-- Salta los primeros 10 resultados y muestra los siguientes 5
SELECT nombre, salario
FROM Empleados
ORDER BY salario DESC
LIMIT 5 OFFSET 10; 

```

---

### 2. La cláusula `TOP` (SQL Server)

Si trabajas en el ecosistema de Microsoft (SQL Server), la palabra clave `LIMIT` no existe. En su lugar, se utiliza `TOP`. La principal diferencia sintáctica es que `TOP` **se escribe inmediatamente después del `SELECT**`, antes de nombrar las columnas.

**Ejemplo:** Obtener los 3 empleados con los salarios más altos en SQL Server.

```sql
SELECT TOP 3 nombre, apellido, salario
FROM Empleados
ORDER BY salario DESC;

```

> **Nota del Maestro:** En SQL Server, también puedes usar `TOP 10 PERCENT` para obtener un porcentaje de las filas en lugar de un número fijo, una característica muy útil para análisis de datos rápidos.

---

### 3. El estándar ANSI: `FETCH FIRST` (Oracle, DB2 y RDBMS modernos)

Para intentar unificar estas diferencias, el comité que estandariza SQL (ANSI) introdujo una sintaxis oficial. Aunque es un poco más larga de escribir, es la forma más estándar y hoy en día es soportada por versiones modernas de casi todos los motores grandes (Oracle, PostgreSQL, SQL Server).

Se coloca al final de la consulta, similar a `LIMIT`.

**Ejemplo:**

```sql
SELECT nombre, apellido, salario
FROM Empleados
ORDER BY salario DESC
FETCH FIRST 3 ROWS ONLY;

```

Si deseas replicar el comportamiento del `OFFSET` (paginación) con el estándar ANSI, la sintaxis completa sería:

```sql
SELECT nombre, salario
FROM Empleados
ORDER BY salario DESC
OFFSET 10 ROWS 
FETCH NEXT 5 ROWS ONLY;

```

---

### La regla de oro: Nunca limites sin ordenar

Es vital comprender que **limitar filas sin usar un `ORDER BY` previo es una mala práctica**.

Si ejecutas una consulta como `SELECT * FROM Empleados LIMIT 5;` sin ordenar primero, la base de datos simplemente te arrojará las primeras 5 filas que encuentre en su memoria en ese instante. Los resultados serán impredecibles y podrían cambiar de una ejecución a otra. **Siempre combina tu límite con un orden lógico.**
