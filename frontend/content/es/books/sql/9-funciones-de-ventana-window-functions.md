Dominar SQL implica pasar de ver los datos como bloques rígidos a verlos como flujos dinámicos. En este capítulo, exploraremos las **Window Functions**, una herramienta de nivel avanzado que permite realizar cálculos complejos (como promedios móviles, rankings o comparaciones interanuales) sin perder el detalle de las filas individuales. A diferencia de `GROUP BY`, que colapsa la información, la cláusula `OVER` crea "ventanas" de análisis que conviven con tus registros originales. Aprenderás a particionar datos, establecer órdenes lógicos y "viajar" entre registros con `LAG` y `LEAD`, desbloqueando una capacidad analítica que distingue a un usuario promedio de un verdadero maestro de SQL.

## 9.1. La cláusula `OVER` y `PARTITION BY`

Hasta este punto del libro, ya dominas cómo agrupar datos y realizar cálculos matemáticos usando `GROUP BY` y funciones de agregación como `SUM`, `AVG` o `COUNT` (vistas en el Capítulo 4). Sin embargo, `GROUP BY` tiene una limitación estricta: **colapsa las filas**. Si tienes 100 empleados repartidos en 5 departamentos y agrupas por departamento, el resultado final tendrá solo 5 filas. Pierdes el detalle individual de cada empleado.

¿Qué sucede si necesitas ver el salario de *cada empleado* (detalle) junto al salario promedio de *su departamento* (agregación) en la misma consulta?

Aquí es donde entran las **Funciones de Ventana (Window Functions)**, uno de los conceptos más poderosos en SQL. Y la puerta de entrada a este mundo es la cláusula `OVER`.

### ¿Qué hace la cláusula `OVER`?

La palabra clave `OVER` le indica a SQL que aplique una función sobre un conjunto de filas (la "ventana"), pero **sin colapsarlas en una sola fila de resultados**. Cada fila original se mantiene intacta, y el cálculo se añade como una nueva columna.

Veamos un ejemplo. Imagina una tabla `ventas_empleados`:

| id_empleado | departamento | monto_venta |
| --- | --- | --- |
| 1 | IT | 1500 |
| 2 | IT | 2000 |
| 3 | Ventas | 5000 |
| 4 | Ventas | 3000 |

Si queremos ver la venta de cada empleado y, al lado, el total global de ventas de toda la empresa, usamos `OVER()` vacío:

```sql
SELECT 
    id_empleado,
    departamento,
    monto_venta,
    SUM(monto_venta) OVER() AS total_global
FROM ventas_empleados;

```

**Resultado:**

| id_empleado | departamento | monto_venta | total_global |
| --- | --- | --- | --- |
| 1 | IT | 1500 | 11500 |
| 2 | IT | 2000 | 11500 |
| 3 | Ventas | 5000 | 11500 |
| 4 | Ventas | 3000 | 11500 |

> **Nota clave:** Al dejar los paréntesis de `OVER()` vacíos, le decimos a SQL que nuestra "ventana" de cálculo es el conjunto completo de resultados de la consulta.

### Dividiendo la ventana con `PARTITION BY`

Rara vez vas a querer comparar una fila contra el total absoluto. Lo normal es querer comparar un dato contra su categoría o grupo. Para eso utilizamos `PARTITION BY` dentro de los paréntesis de `OVER`.

`PARTITION BY` funciona de manera conceptualmente idéntica a `GROUP BY`, pero opera exclusivamente dentro de la función de ventana. Su trabajo es reiniciar el cálculo cada vez que cambia el valor de la columna especificada.

Si queremos calcular el total de ventas **por departamento** sin perder el detalle del empleado, lo escribimos así:

```sql
SELECT 
    id_empleado,
    departamento,
    monto_venta,
    SUM(monto_venta) OVER(PARTITION BY departamento) AS total_departamento
FROM ventas_empleados;

```

**Resultado:**

| id_empleado | departamento | monto_venta | total_departamento |
| --- | --- | --- | --- |
| 1 | IT | 1500 | 3500 |
| 2 | IT | 2000 | 3500 |
| 3 | Ventas | 5000 | 8000 |
| 4 | Ventas | 3000 | 8000 |

Como puedes observar, para los empleados de IT, la suma se calcula solo sobre las filas de IT (1500 + 2000 = 3500). Cuando el motor SQL pasa a las filas de Ventas, la ventana "se reinicia" y suma solo las ventas de ese departamento (5000 + 3000 = 8000).

### Diferencias fundamentales: `GROUP BY` vs. `PARTITION BY`

Para que este concepto quede cimentado de una vez por todas, aquí tienes las diferencias clave:

* **Impacto en las filas:** `GROUP BY` reduce el número de filas en el resultado final. `PARTITION BY` devuelve exactamente el mismo número de filas de la consulta original.
* **Columnas permitidas:** Con `GROUP BY`, el `SELECT` solo puede contener las columnas agrupadas o funciones de agregación. Con `PARTITION BY`, puedes seleccionar cualquier columna de la tabla junto con tu cálculo de ventana.
* **Contexto:** `GROUP BY` es una cláusula que afecta a toda la consulta. `PARTITION BY` vive estrictamente dentro de los paréntesis de una cláusula `OVER` y solo afecta a esa columna específica.

Puedes tener múltiples funciones de ventana en un mismo `SELECT`, cada una particionada por columnas diferentes. Esta flexibilidad te permite, por ejemplo, ver en una sola consulta cómo rinde un empleado respecto a su departamento y respecto a su ciudad.

## 9.2. Funciones de ranking (`ROW_NUMBER`, `RANK`, `DENSE_RANK`)

Ahora que entiendes cómo crear "ventanas" de datos usando `OVER` y `PARTITION BY`, es hora de aplicar funciones específicas dentro de esas ventanas. Las funciones de ranking son, sin duda, las más utilizadas. Te permiten asignar una posición o número secuencial a cada fila basándose en un criterio específico.

Para usar funciones de ranking, introducimos una regla de oro: **La cláusula `OVER()` debe incluir un `ORDER BY`.** Este `ORDER BY` interno no ordena el resultado final de tu consulta, sino que le indica al motor de base de datos *bajo qué criterio* debe calcular el ranking.

Para entender la diferencia entre las tres funciones principales, imaginemos una tabla de `puntajes_juego` en un torneo:

| jugador | puntos |
| --- | --- |
| Ana | 150 |
| Luis | 150 |
| Carlos | 120 |
| Diana | 100 |

Observa que Ana y Luis tienen un empate (150 puntos). Veamos cómo cada función maneja esta situación. Escribiremos una sola consulta para comparar las tres:

```sql
SELECT 
    jugador,
    puntos,
    ROW_NUMBER() OVER(ORDER BY puntos DESC) AS row_num,
    RANK() OVER(ORDER BY puntos DESC) AS ranking,
    DENSE_RANK() OVER(ORDER BY puntos DESC) AS dense_ranking
FROM puntajes_juego;

```

**Resultado:**

| jugador | puntos | row_num | ranking | dense_ranking |
| --- | --- | --- | --- | --- |
| Ana | 150 | 1 | 1 | 1 |
| Luis | 150 | 2 | 1 | 1 |
| Carlos | 120 | 3 | 3 | 2 |
| Diana | 100 | 4 | 4 | 3 |

Analicemos qué hizo exactamente cada función:

### 1. `ROW_NUMBER()`: El contador estricto

Esta función asigna un número secuencial único a cada fila, comenzando desde 1. **No le importan los empates.** Si dos filas tienen el mismo valor, `ROW_NUMBER()` le dará el 1 a una y el 2 a otra de forma arbitraria (a menos que añadas más columnas a tu `ORDER BY` para desempatar).

* *Uso típico:* Eliminar filas duplicadas (quedándote con la fila donde `row_num = 1`) o paginar resultados.

### 2. `RANK()`: El ranking con saltos

Esta es la forma en la que funcionan los rankings olímpicos. Si Ana y Luis empatan en el primer lugar, ambos reciben la medalla de oro (rango 1). Sin embargo, la siguiente posición (el rango 2) se omite. Carlos pasa directamente al tercer lugar (rango 3).

* *Uso típico:* Cuando necesitas reflejar exactamente el salto provocado por un empate en una competencia o evaluación.

### 3. `DENSE_RANK()`: El ranking denso (sin saltos)

Funciona igual que `RANK()`, otorgando el mismo lugar a los empates, pero **no deja huecos en la numeración**. Ana y Luis son los número 1, y el siguiente en la lista (Carlos) recibe inmediatamente el número 2.

* *Uso típico:* Cuando necesitas saber "quiénes tienen la segunda mejor puntuación", independientemente de cuántas personas estén empatadas en el primer puesto.

### El poder combinado: `PARTITION BY` + `ORDER BY`

El verdadero potencial de estas funciones se desbloquea al combinarlas con `PARTITION BY` (visto en la sección 9.1). Esto te permite crear "Top N por categoría", un problema clásico que no se puede resolver fácilmente con un simple `GROUP BY`.

Imagina que quieres obtener al **empleado con el salario más alto de cada departamento**. Podrías asignar un `ROW_NUMBER()` reiniciando el conteo por cada departamento y ordenando por salario descendente:

```sql
SELECT 
    nombre,
    departamento,
    salario,
    ROW_NUMBER() OVER(PARTITION BY departamento ORDER BY salario DESC) AS posicion
FROM empleados;

```

Si luego utilizas esta consulta como una subconsulta (o un CTE, como vimos en el Capítulo 7) y filtras donde `posicion = 1`, obtendrás exactamente al empleado que más gana en cada departamento.

## 9.3. Funciones de valor (`LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE`)

Hasta ahora hemos visto cómo agrupar ventanas de datos (con `PARTITION BY`) y cómo clasificar su contenido (con `ORDER BY` y funciones de ranking). Las **funciones de valor** dan un paso más allá: te permiten "viajar en el tiempo" dentro de tus datos.

Estas funciones acceden al valor de una fila diferente a la actual, sin necesidad de recurrir a los complejos `SELF JOIN` que estudiamos en el Capítulo 5. Son el estándar de oro en la industria para calcular crecimientos mensuales, variaciones de inventario o tiempos de respuesta.

### Mirando al pasado y al futuro: `LAG` y `LEAD`

Para que `LAG` (retraso/anterior) y `LEAD` (adelanto/siguiente) funcionen, **siempre deben ir acompañadas de un `ORDER BY**` dentro de la cláusula `OVER`. El motor SQL necesita saber en qué orden lógico debe buscar la fila "anterior" o "siguiente".

Imagina una tabla de `ventas_mensuales`:

| mes | ingresos |
| --- | --- |
| Enero | 1000 |
| Febrero | 1200 |
| Marzo | 1500 |
| Abril | 1300 |

Si queremos comparar los ingresos del mes actual con los del mes anterior y los del mes siguiente en una sola vista, lo haríamos así:

```sql
SELECT 
    mes,
    ingresos,
    LAG(ingresos) OVER(ORDER BY mes) AS ingresos_mes_anterior,
    LEAD(ingresos) OVER(ORDER BY mes) AS ingresos_mes_siguiente
FROM ventas_mensuales;

```

**Resultado:**

| mes | ingresos | ingresos_mes_anterior | ingresos_mes_siguiente |
| --- | --- | --- | --- |
| Enero | 1000 | *NULL* | 1200 |
| Febrero | 1200 | 1000 | 1500 |
| Marzo | 1500 | 1200 | 1300 |
| Abril | 1300 | 1500 | *NULL* |

> **Nota clave:** Observa que Enero no tiene un mes anterior, por lo que `LAG` devuelve `NULL`. Lo mismo ocurre con `LEAD` en Abril. Estas funciones aceptan un segundo parámetro opcional para reemplazar ese `NULL` por un valor por defecto (ej. `LAG(ingresos, 1, 0)` devolvería un 0 en lugar de `NULL`).

El uso más poderoso de `LAG` es realizar operaciones matemáticas en la misma línea. Por ejemplo, para calcular el crecimiento mes a mes: `ingresos - LAG(ingresos) OVER(ORDER BY mes)`.

### Los extremos de la ventana: `FIRST_VALUE` y `LAST_VALUE`

Como sus nombres indican, estas funciones obtienen el primer y el último valor de un conjunto de datos particionado u ordenado.

Si retomamos la idea de la tabla de empleados del capítulo anterior, podríamos querer ver el salario de cada empleado junto al salario del empleado que *menos* gana (`FIRST_VALUE`) y el que *más* gana (`LAST_VALUE`) en su mismo departamento.

```sql
SELECT 
    nombre,
    departamento,
    salario,
    FIRST_VALUE(salario) OVER(PARTITION BY departamento ORDER BY salario ASC) AS salario_minimo,
    LAST_VALUE(salario) OVER(
        PARTITION BY departamento 
        ORDER BY salario ASC 
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS salario_maximo
FROM empleados;

```

**⚠️ El comportamiento oculto de `LAST_VALUE`**

Seguramente notaste algo extraño en el código de `LAST_VALUE`: la línea `ROWS BETWEEN...`. Esto es un detalle técnico crucial que suele frustrar a los principiantes.

Cuando usas un `ORDER BY` dentro de la cláusula `OVER`, SQL aplica un "marco" (frame) por defecto a tu ventana que va **desde la primera fila hasta la fila actual** (`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`).

* Para `FIRST_VALUE`, esto no es problema, porque el primer valor siempre está al principio.
* Para `LAST_VALUE`, esto es un desastre: como la ventana "termina" en la fila actual, el "último valor" siempre será el de la fila que estás leyendo en ese momento.

Para solucionar esto y obtener el verdadero último valor de toda la partición, debemos redefinir el marco explícitamente agregando `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` (desde la primera fila hasta la última fila de la partición), como se muestra en el ejemplo anterior.
