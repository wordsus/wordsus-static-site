La verdadera maestría en SQL comienza cuando dejamos de ver las tablas como entidades estáticas y aprendemos a tratarlas como bloques lógicos dinámicos. En este capítulo, exploraremos cómo anidar consultas para resolver problemas complejos donde un simple `JOIN` no es suficiente.

Aprenderás a descomponer desafíos de datos en piezas manejables: desde el uso de **subconsultas escalares** para cálculos precisos, hasta el poder de los **operadores EXISTS y ANY/ALL**. Finalmente, dominaremos las **CTEs**, la herramienta definitiva para escribir código limpio, legible y recursivo, transformando consultas densas en narrativas estructuradas y eficientes.

## 7.1. Subconsultas escalares y de lista

Hasta este punto del libro, hemos aprendido a combinar datos de múltiples tablas utilizando la cláusula `JOIN` (Capítulo 5). Sin embargo, SQL nos ofrece otra herramienta sumamente poderosa para cruzar y evaluar información: **las subconsultas** (también conocidas como *subqueries* o consultas anidadas).

Una subconsulta no es más que una sentencia `SELECT` que se encuentra incrustada dentro de otra consulta principal (u otra subconsulta). Siempre se encierran entre paréntesis y, por lo general, el motor de base de datos evalúa primero la consulta interna y utiliza su resultado para resolver la consulta externa.

En esta sección, nos enfocaremos en los dos tipos más fundamentales e independientes: las subconsultas escalares y las subconsultas de lista.

---

### 1. Subconsultas Escalares

En matemáticas y en programación, un valor "escalar" se refiere a un único valor atómico. De la misma manera, una **subconsulta escalar** es aquella que, tras ejecutarse, devuelve **exactamente una sola fila y una sola columna**.

Debido a que devuelven un único valor, las subconsultas escalares pueden utilizarse en casi cualquier lugar donde pondrías un número, un texto o una fecha estática; por ejemplo, en la cláusula `SELECT`, `WHERE` o `HAVING`.

**Ejemplo de uso en la cláusula `WHERE`:**
Imagina que necesitas obtener una lista de todos los empleados cuyo salario sea estrictamente mayor al salario promedio de toda la empresa. No puedes usar `WHERE salario > AVG(salario)` porque las funciones de agregación no están permitidas directamente en el `WHERE` sin agrupar. La solución es una subconsulta escalar:

```sql
SELECT 
    nombre, 
    apellido, 
    salario
FROM 
    empleados
WHERE 
    salario > (SELECT AVG(salario) FROM empleados);

```

**¿Cómo procesa esto el motor de SQL?**

1. Primero, ejecuta la subconsulta interna: `(SELECT AVG(salario) FROM empleados)`. Supongamos que el resultado es `2500`.
2. Luego, sustituye la subconsulta por ese valor en la consulta externa.
3. Finalmente, ejecuta: `SELECT nombre, apellido, salario FROM empleados WHERE salario > 2500;`.

**Ejemplo de uso en la cláusula `SELECT`:**
También puedes usar subconsultas escalares para mostrar un valor calculado junto a las filas de detalle, algo muy útil para calcular diferencias o porcentajes.

```sql
SELECT 
    nombre,
    salario,
    (SELECT MAX(salario) FROM empleados) AS salario_maximo_empresa,
    (SELECT MAX(salario) FROM empleados) - salario AS diferencia_con_maximo
FROM 
    empleados;

```

> **Nota importante:** Si una subconsulta que está diseñada para ser escalar devuelve más de una fila o más de una columna, el motor de SQL arrojará un error de ejecución. Debes asegurarte de que la lógica de tu subconsulta (usando funciones de agregación o filtros de claves primarias) garantice un único valor.

---

### 2. Subconsultas de Lista (o de Columna)

A diferencia de las escalares, una **subconsulta de lista** devuelve **una única columna, pero múltiples filas**. Esencialmente, genera una lista de valores unidimensional (por ejemplo: `10, 15, 20, 45`).

Dado que devuelve múltiples valores, no podemos utilizar operadores de comparación simples como `=`, `<` o `>`. En su lugar, debemos utilizar operadores lógicos diseñados para manejar conjuntos de datos, siendo el más común el operador `IN` (o su negación, `NOT IN`), los cuales vimos en el Capítulo 2.

**Ejemplo de uso con `IN`:**
Supongamos que quieres obtener los datos de los clientes que han realizado compras en el último mes. Tienes una tabla `clientes` y una tabla `ventas`. Aunque esto se puede resolver con un `INNER JOIN`, una subconsulta de lista lo expresa de forma muy natural:

```sql
SELECT 
    id_cliente, 
    nombre_completo, 
    email
FROM 
    clientes
WHERE 
    id_cliente IN (
        SELECT DISTINCT id_cliente 
        FROM ventas 
        WHERE fecha_venta >= '2023-10-01'
    );

```

**Ventajas de este enfoque:**

* **Legibilidad:** La consulta se lee casi como lenguaje natural: *"Selecciona los clientes cuyo ID esté en la lista de IDs que compraron recientemente"*.
* **Evita duplicados:** A diferencia de un `JOIN` que podría multiplicar las filas de los clientes si tienen múltiples ventas, la subconsulta con `IN` simplemente evalúa si el `id_cliente` existe en la lista generada, devolviendo al cliente una sola vez sin necesidad de agrupar.

**Ejemplo de uso con `NOT IN`:**
Las subconsultas de lista brillan especialmente cuando queremos encontrar registros que **no** tienen correspondencia en otra tabla (lo que comúnmente llamamos una consulta de exclusión). Por ejemplo, encontrar productos que *nunca* se han vendido:

```sql
SELECT 
    id_producto, 
    nombre_producto
FROM 
    productos
WHERE 
    id_producto NOT IN (SELECT id_producto FROM detalles_venta);

```

> **Cuidado con los valores NULL:** Al usar `NOT IN` con subconsultas de lista, debes ser extremadamente cauteloso si la subconsulta puede devolver un valor `NULL`. Si la lista generada por la subconsulta contiene al menos un `NULL`, la evaluación de `NOT IN` siempre resultará en "Desconocido" (Unknown) para todos los registros, y tu consulta principal devolverá cero filas. Se recomienda filtrar los nulos en la subconsulta usando `IS NOT NULL`.

## 7.2. Subconsultas correlacionadas

En la sección anterior exploramos las subconsultas independientes, aquellas que el motor de base de datos ejecuta una sola vez y cuyo resultado se pasa a la consulta principal. Sin embargo, existe otro tipo de subconsulta que opera con una lógica completamente distinta y requiere una conexión más íntima con la consulta externa: **la subconsulta correlacionada**.

Una subconsulta correlacionada es aquella que hace referencia a una o más columnas de la consulta principal (externa). Debido a esta dependencia, la subconsulta no puede evaluarse de manera independiente. En su lugar, el motor de SQL debe ejecutar la subconsulta **una vez por cada fila** procesada por la consulta principal.

---

### 1. ¿Cómo funciona la correlación? (El bucle implícito)

Para entender una subconsulta correlacionada, puedes imaginarla como un bucle `FOR` o `WHILE` en un lenguaje de programación tradicional. El proceso lógico del motor de SQL es el siguiente:

1. Lee la primera fila de la tabla externa.
2. Toma el valor de la columna necesaria de esa fila y lo inyecta en la subconsulta interna.
3. Ejecuta la subconsulta con ese valor específico.
4. Evalúa la condición (en el `WHERE` o `SELECT`) para esa fila.
5. Pasa a la siguiente fila de la tabla externa y repite el proceso desde el paso 2.

### 2. Ejemplo práctico: Comparación por categorías

Retomemos el ejemplo de los salarios. En la sección 7.1, buscamos a los empleados que ganaban más que el promedio de *toda la empresa*. Pero, ¿qué pasa si queremos encontrar a los empleados que ganan más que el promedio de **su propio departamento**?

Aquí es donde brilla la subconsulta correlacionada:

```sql
SELECT 
    e1.nombre, 
    e1.apellido, 
    e1.salario, 
    e1.id_departamento
FROM 
    empleados e1
WHERE 
    e1.salario > (
        SELECT AVG(e2.salario)
        FROM empleados e2
        WHERE e1.id_departamento = e2.id_departamento
    );

```

**Desglose de la consulta:**

* Hemos utilizado **alias de tablas** (`e1` para la consulta externa y `e2` para la interna). Esto es obligatorio en las subconsultas correlacionadas cuando consultamos la misma tabla, ya que necesitamos que el motor distinga a qué contexto pertenece cada columna.
* La magia ocurre en la línea `WHERE e1.id_departamento = e2.id_departamento`. Esta es la **condición de correlación**.
* Por cada empleado evaluado en `e1`, la subconsulta calcula el promedio salarial únicamente de los empleados en `e2` que comparten el mismo departamento.

### 3. Uso en la cláusula SELECT

Al igual que las subconsultas escalares independientes, las correlacionadas pueden usarse en el `SELECT` para agregar información de contexto a cada fila.

Por ejemplo, si tienes una tabla de `clientes` y quieres mostrar el número total de pedidos que ha realizado cada uno consultando la tabla de `pedidos`:

```sql
SELECT 
    c.nombre_completo,
    (
        SELECT COUNT(*) 
        FROM pedidos p 
        WHERE p.id_cliente = c.id_cliente
    ) AS total_pedidos
FROM 
    clientes c;

```

### 4. Consideraciones de rendimiento

El gran poder de las subconsultas correlacionadas viene acompañado de una advertencia importante: **el costo de rendimiento**.

Si la tabla principal (`clientes` en el ejemplo anterior) tiene 100,000 registros, la subconsulta interna se ejecutará, lógicamente, 100,000 veces. Aunque los motores modernos (RDBMS) están muy optimizados y a menudo reescriben internamente estas consultas para hacerlas más eficientes, una subconsulta correlacionada mal estructurada o sin los índices adecuados (tema del Capítulo 10) puede volver tu sistema extremadamente lento.

> **Nota para el futuro:** Muchos de los problemas que resolvemos con subconsultas correlacionadas hoy en día se pueden solucionar de forma mucho más eficiente (y limpia) utilizando **Funciones de Ventana (Window Functions)**, las cuales exploraremos a fondo en el Capítulo 9.

## 7.3. Operadores `EXISTS` y `ANY/ALL`

Estos operadores se utilizan exclusivamente con subconsultas y permiten evaluar condiciones basadas en la presencia de datos o en comparaciones múltiples.

### 1. El operador `EXISTS` (y `NOT EXISTS`)

El operador `EXISTS` es, probablemente, uno de los más utilizados en las **subconsultas correlacionadas**. Su función no es devolver datos, sino responder a una pregunta de verdadero o falso: **¿Existe al menos una fila que cumpla con esta condición en la subconsulta?**

A diferencia de `IN`, que descarga una lista de valores en memoria para compararlos, `EXISTS` se detiene tan pronto como encuentra la primera coincidencia, lo que lo hace extremadamente eficiente para verificar relaciones.

**Ejemplo: Clientes con pedidos superiores a 500€**

```sql
SELECT 
    nombre, 
    email
FROM 
    clientes c
WHERE EXISTS (
    SELECT 1 
    FROM pedidos p 
    WHERE p.id_cliente = c.id_cliente 
      AND p.monto > 500
);

```

* **El `SELECT 1**`: Verás que en la subconsulta usamos `SELECT 1`. Como a `EXISTS` solo le importa si hay una fila o no (y no el contenido de la columna), poner un `1` es una convención de rendimiento que indica "no gastes recursos recuperando datos reales, solo confírmame que hay algo ahí".
* **`NOT EXISTS`**: Es la herramienta perfecta para encontrar "lo que falta". Por ejemplo, para listar clientes que **nunca** han realizado un pedido:

```sql
SELECT nombre FROM clientes c
WHERE NOT EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id_cliente = c.id_cliente
);

```

---

### 2. Los operadores `ANY` y `ALL`

Estos operadores actúan como un puente entre una comparación escalar (como `=` o `>`) y una lista de valores. Se colocan justo después de un operador de comparación estándar.

#### A. El operador `ANY` (o `SOME`)

La condición es verdadera si la comparación se cumple para **al menos uno** de los valores devueltos por la subconsulta. Es equivalente a una serie de condiciones unidas por `OR`.

**Ejemplo:** Encontrar productos cuyo precio sea menor a *cualquiera* de los precios de la categoría 'Electrónica'.

```sql
SELECT nombre_producto, precio
FROM productos
WHERE precio < ANY (
    SELECT precio 
    FROM productos 
    WHERE categoria = 'Electrónica'
);

```

Si la subconsulta devuelve `{100, 200, 300}`, la condición será verdadera para cualquier producto con un precio menor a 300 (ya que con ser menor que el más alto, ya es menor que "alguno").

> **Dato curioso:** `= ANY` es exactamente lo mismo que usar el operador `IN`.

#### B. El operador `ALL`

La condición es verdadera solo si la comparación se cumple para **todos** los valores de la lista. Es equivalente a una serie de condiciones unidas por `AND`.

**Ejemplo:** Encontrar el producto más caro de la tienda (sin usar `MAX`).

```sql
SELECT nombre_producto
FROM productos
WHERE precio >= ALL (
    SELECT precio FROM productos
);

```

Aquí, un producto solo aparecerá en el resultado si su precio es mayor o igual a **todos** los precios de la tabla, lo cual lógicamente nos devuelve el valor máximo.

---

### 3. Cuadro Comparativo de Uso

| Operador | ¿Qué evalúa? | Mejor uso |
| --- | --- | --- |
| **`EXISTS`** | Existencia de registros. | Validar relaciones entre tablas sin duplicar filas. |
| **`IN`** | Igualdad contra una lista. | Filtrado sencillo contra valores conocidos o listas cortas. |
| **`ANY`** | Comparación contra algún elemento. | Rangos dinámicos donde basta con cumplir una sola condición. |
| **`ALL`** | Comparación contra todos los elementos. | Validaciones restrictivas y búsqueda de extremos (mínimos/máximos). |

## 7.4. CTEs (Common Table Expressions) con la cláusula `WITH`

A medida que tus consultas SQL se vuelven más avanzadas, es muy probable que te encuentres anidando subconsultas dentro de otras subconsultas. Aunque el motor de base de datos puede procesar esto sin problemas, para el ojo humano el código puede volverse denso, difícil de leer y todo un dolor de cabeza de mantener.

Aquí es donde entran al rescate las **CTEs (Common Table Expressions o Expresiones de Tabla Comunes)**.

Una CTE es un conjunto de resultados temporal al que le asignas un nombre y que existe únicamente durante la ejecución de una consulta `SELECT`, `INSERT`, `UPDATE` o `DELETE`. Piensa en ellas como "variables de tabla" o "vistas temporales" que declaras al principio de tu script para usarlas más adelante.

---

### 1. Sintaxis básica de una CTE

Las CTEs se definen utilizando la cláusula `WITH`, seguida del nombre que le quieras dar, la palabra clave `AS` y, entre paréntesis, la consulta que generará los datos.

```sql
WITH NombreDeTuCTE AS (
    -- Aquí va tu consulta SQL (la definición de la CTE)
    SELECT columna1, columna2
    FROM tu_tabla
    WHERE condicion = verdadera
)
-- Aquí va tu consulta principal, que utiliza la CTE como si fuera una tabla real
SELECT * FROM NombreDeTuCTE;

```

### 2. CTEs vs. Subconsultas en el FROM (Tablas Derivadas)

Para entender su verdadero valor, comparemos cómo resolveríamos un mismo problema con y sin una CTE.

**El problema:** Queremos obtener una lista de los departamentos (con su nombre) cuyo salario promedio sea mayor al salario promedio de toda la empresa.

**Enfoque 1: Usando subconsultas tradicionales (Tablas Derivadas)**

```sql
SELECT 
    d.nombre_departamento, 
    promedios.salario_promedio_dept
FROM 
    departamentos d
INNER JOIN (
    SELECT id_departamento, AVG(salario) AS salario_promedio_dept
    FROM empleados
    GROUP BY id_departamento
) promedios ON d.id_departamento = promedios.id_departamento
WHERE 
    promedios.salario_promedio_dept > (SELECT AVG(salario) FROM empleados);

```

Aunque esta consulta funciona perfectamente, la lógica principal está "enterrada" en medio del `JOIN` y requiere leer de adentro hacia afuera para entenderla.

**Enfoque 2: Usando una CTE**

```sql
WITH PromediosPorDepartamento AS (
    SELECT 
        id_departamento, 
        AVG(salario) AS salario_promedio_dept
    FROM 
        empleados
    GROUP BY 
        id_departamento
),
PromedioGlobal AS (
    SELECT AVG(salario) AS salario_promedio_empresa 
    FROM empleados
)

SELECT 
    d.nombre_departamento, 
    p.salario_promedio_dept
FROM 
    departamentos d
INNER JOIN 
    PromediosPorDepartamento p ON d.id_departamento = p.id_departamento
CROSS JOIN 
    PromedioGlobal pg
WHERE 
    p.salario_promedio_dept > pg.salario_promedio_empresa;

```

**Ventajas evidentes de las CTEs:**

1. **Lectura secuencial (De arriba hacia abajo):** El código narra una historia. Primero definimos los promedios por departamento, luego el promedio global, y finalmente unimos esas piezas en una consulta principal limpia.
2. **Reutilización:** Si necesitas referenciar `PromediosPorDepartamento` varias veces en tu consulta principal, puedes hacerlo sin tener que reescribir toda la subconsulta.

### 3. Múltiples CTEs en una sola consulta

Como notaste en el ejemplo anterior, puedes definir múltiples CTEs en una sola cláusula `WITH`. Simplemente sepáralas por una coma (`,`). La palabra `WITH` solo se escribe una vez al principio.

Además, **una CTE puede hacer referencia a una CTE definida anteriormente** en la misma cláusula. Esto es extremadamente potente para construir lógica por pasos:

```sql
WITH VentasTotales AS (
    -- Paso 1: Calculamos el total por cliente
    SELECT id_cliente, SUM(monto) AS total_gastado
    FROM ventas
    GROUP BY id_cliente
),
MejoresClientes AS (
    -- Paso 2: Usamos la primera CTE para filtrar a los clientes VIP
    SELECT id_cliente
    FROM VentasTotales
    WHERE total_gastado > 10000
)
-- Paso 3: Usamos la segunda CTE para obtener los detalles finales
SELECT c.nombre, c.email
FROM clientes c
INNER JOIN MejoresClientes mc ON c.id_cliente = mc.id_cliente;

```

> **Consejo de Maestro:** Acostúmbrate a usar CTEs cuando sientas que tu consulta está requiriendo demasiadas subconsultas en el `FROM`. Tu "yo" del futuro (y tus compañeros de equipo) agradecerán enormemente la claridad y legibilidad de tu código.

## 7.5. CTEs recursivas

Llegamos a la joya de la corona de este capítulo y a uno de los conceptos más fascinantes —y a veces intimidantes— de SQL: **la recursividad**.

Si en la sección anterior vimos que una CTE es como una tabla temporal que definimos para organizar nuestra consulta, una **CTE recursiva** es una CTE que **se llama a sí misma** repetidamente hasta que se cumple una condición de parada.

¿Para qué sirve esto en el mundo real? Las bases de datos relacionales son excelentes para datos planos, pero tradicionalmente sufren cuando intentan representar **jerarquías o árboles**. Si necesitas consultar un organigrama de empleados (quién reporta a quién), un árbol de categorías de productos (Ropa > Hombre > Camisas > Manga Larga) o generar una secuencia de fechas, las CTEs recursivas son la herramienta perfecta.

---

### 1. Anatomía de una CTE recursiva

Toda CTE recursiva tiene una estructura muy estricta compuesta por tres partes fundamentales. Si falta alguna, la magia no funciona (o peor, creas un bucle infinito).

1. **El Miembro Ancla (Anchor Member):** Es la consulta base. Es el punto de partida de nuestra recursividad y **no** hace referencia a la CTE. Se ejecuta una sola vez.
2. **El Operador `UNION ALL`:** Sirve como pegamento para unir los resultados del miembro ancla con los resultados de las iteraciones recursivas.
3. **El Miembro Recursivo (Recursive Member):** Es la segunda consulta, la cual **sí hace referencia** al nombre de la CTE. Esta consulta se ejecutará una y otra vez. En cada iteración, toma como datos de entrada *exclusivamente* las filas que fueron generadas en el paso inmediatamente anterior. El bucle se detiene automáticamente cuando este miembro recursivo no devuelve ninguna fila nueva.

### 2. Ejemplo 1: Generar una secuencia numérica (El "Hola Mundo" de la recursividad)

Para entender el flujo, vamos a crear una tabla temporal al vuelo que cuente del 1 al 5.

```sql
WITH RECURSIVE Contador AS (
    -- 1. Miembro Ancla: Empezamos en el número 1
    SELECT 1 AS numero
    
    UNION ALL
    
    -- 2. Miembro Recursivo: Sumamos 1 al resultado anterior
    SELECT numero + 1
    FROM Contador
    WHERE numero < 5 -- 3. Condición de parada implícita
)

SELECT * FROM Contador;

```

**¿Cómo procesa esto el motor?**

* **Paso 1 (Ancla):** Devuelve `1`.
* **Paso 2 (Iteración 1):** El miembro recursivo toma el `1`, le suma 1 y devuelve `2`. Como `1 < 5`, procede.
* **Paso 3 (Iteración 2):** Toma el `2`, le suma 1 y devuelve `3`.
* ... continúa hasta que la condición `numero < 5` ya no se cumple. Al no devolver filas nuevas, el bucle termina.

> **Nota de compatibilidad:** En PostgreSQL, MySQL y SQLite es obligatorio usar la palabra clave `WITH RECURSIVE`. En SQL Server y Oracle, simplemente se usa `WITH` y el motor detecta automáticamente la recursividad.

### 3. Ejemplo 2: Resolviendo un Organigrama (Jerarquías)

Este es el caso de uso rey. Imagina una tabla `empleados` que tiene un `id_empleado`, un `nombre`, y un `id_jefe` (que es una clave foránea que apunta al `id_empleado` de su manager en la misma tabla).

Queremos obtener una lista de todos los empleados, indicando su nivel jerárquico dentro de la empresa:

```sql
WITH RECURSIVE Organigrama AS (
    -- Miembro Ancla: Buscamos al CEO (el que no tiene jefe)
    SELECT 
        id_empleado, 
        nombre, 
        id_jefe, 
        1 AS nivel_jerarquico
    FROM 
        empleados
    WHERE 
        id_jefe IS NULL
    
    UNION ALL
    
    -- Miembro Recursivo: Buscamos a los subordinados del nivel anterior
    SELECT 
        e.id_empleado, 
        e.nombre, 
        e.id_jefe, 
        o.nivel_jerarquico + 1
    FROM 
        empleados e
    INNER JOIN 
        Organigrama o ON e.id_jefe = o.id_empleado
)

SELECT * FROM Organigrama ORDER BY nivel_jerarquico;

```

Aquí, la recursividad nos permite recorrer la cadena de mando de arriba hacia abajo, sin importar si la empresa tiene 2 niveles jerárquicos o 50. El `INNER JOIN` en el miembro recursivo es la clave: empareja a los empleados de la tabla original con los "jefes" que acabamos de descubrir en la iteración anterior.

### 4. Precauciones con la Recursividad

El mayor riesgo de una CTE recursiva es el **bucle infinito**. Si tus datos tienen una referencia circular (por ejemplo, el Empleado A es jefe del Empleado B, y un error en los datos dice que el Empleado B es jefe del Empleado A), la consulta nunca se detendrá por sí sola.

Para protegerse contra esto, muchos motores de bases de datos tienen un límite de recursión por defecto (generalmente 100 iteraciones). Si prevés que tu jerarquía es más profunda, motores como SQL Server te permiten ajustar esto al final de la consulta externa usando `OPTION (MAXRECURSION n)`.
