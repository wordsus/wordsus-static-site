Hasta ahora has aprendido a extraer y filtrar filas individuales, pero el verdadero poder del análisis de datos reside en la capacidad de sintetizar grandes volúmenes de información. En este capítulo, dejarás de ver registros aislados para enfocarte en el panorama general. Dominarás las funciones de agregación para calcular totales y promedios, y descubrirás cómo `GROUP BY` y `HAVING` te permiten segmentar datos y filtrar resultados complejos. Estas herramientas transformarán tu base de datos en una fuente de respuestas estratégicas, permitiéndote pasar de la simple lectura de datos a la generación de conocimiento e informes de valor.

## 4.1. Funciones básicas: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`

Hasta este punto del libro, nuestras consultas con `SELECT` nos han devuelto información fila por fila. Si pedíamos 100 registros, obteníamos 100 filas de resultados. Sin embargo, en el mundo real, rara vez queremos ver cada transacción individual; lo más común es que necesitemos **resumir** esa información para obtener respuestas a preguntas de negocio: *¿Cuántos clientes tenemos? ¿Cuál es el total de ventas del mes? ¿Cuál es el producto más barato?*

Aquí es donde entran las **funciones de agregación**. Estas funciones toman múltiples valores de una columna y los procesan para devolver un **único valor resumido**.

Para ilustrar cómo funciona cada una, imaginemos que tenemos la siguiente tabla llamada `productos`, la cual ya hemos filtrado previamente usando los conocimientos del Capítulo 2:

| id_producto | nombre | categoria | precio | stock |
| --- | --- | --- | --- | --- |
| 1 | Laptop | Electrónica | 1200.00 | 10 |
| 2 | Ratón | Electrónica | 25.00 | 50 |
| 3 | Teclado | Electrónica | 45.00 | NULL |
| 4 | Silla | Muebles | 150.00 | 20 |

---

### 1. `COUNT`: Contando registros

La función `COUNT` sirve para contar cuántas filas devuelve nuestra consulta. Es, con diferencia, la función de agregación más utilizada. Tiene tres variaciones importantes que debes conocer:

* **`COUNT(*)`:** Cuenta absolutamente todas las filas, independientemente de si contienen valores nulos.
* **`COUNT(nombre_columna)`:** Cuenta solo las filas donde la columna especificada **no es nula** (`IS NOT NULL`).
* **`COUNT(DISTINCT nombre_columna)`:** Cuenta los valores únicos y no nulos de una columna (combinando lo que aprendimos en la sección 2.3).

**Ejemplo de código:**

```sql
SELECT 
    COUNT(*) AS total_productos,
    COUNT(stock) AS productos_con_stock_registrado,
    COUNT(DISTINCT categoria) AS categorias_unicas
FROM productos;

```

**Resultado:**

| total_productos | productos_con_stock_registrado | categorias_unicas |
| --- | --- | --- |
| 4 | 3 | 2 |

> **Nota clave:** Observa cómo `COUNT(stock)` devuelve 3 en lugar de 4. Esto se debe a que el "Teclado" tiene un valor `NULL` en su stock, y la función lo ignora automáticamente.

---

### 2. `SUM`: Sumando valores

La función `SUM` calcula la suma total de los valores de una columna numérica. Si intentas usar `SUM` en una columna de texto (Strings) o fechas (Dates), el motor de base de datos te devolverá un error.

**Ejemplo de código:**
Si queremos saber cuántas unidades tenemos en total en nuestro almacén:

```sql
SELECT SUM(stock) AS unidades_totales
FROM productos;

```

**Resultado:**

| unidades_totales |
| --- |
| 80 |

Al igual que `COUNT(columna)`, `SUM` simplemente ignora los valores `NULL` antes de realizar la suma matemática (10 + 50 + 20).

---

### 3. `AVG`: Calculando el promedio

`AVG` (del inglés *Average*) calcula el valor medio de una columna numérica. Es la suma de los valores dividida por la cantidad de valores no nulos.

**Ejemplo de código:**
Para saber el precio promedio de nuestros productos:

```sql
SELECT AVG(precio) AS precio_promedio
FROM productos;

```

**Resultado:**

| precio_promedio |
| --- |
| 355.00 |

> **Cuidado con los Nulos:** Al calcular el promedio del `stock`, `AVG` sumará 80 (10+50+20) y lo dividirá entre 3 (las filas que tienen dato), no entre 4. Si los nulos deben considerarse como ceros para tu cálculo, necesitarás reemplazarlos previamente (veremos funciones para esto más adelante).

---

### 4. `MIN` y `MAX`: Encontrando los extremos

Como sus nombres indican, `MIN` encuentra el valor mínimo y `MAX` el valor máximo de una columna. A diferencia de `SUM` o `AVG`, estas funciones son increíblemente versátiles porque **funcionan con casi cualquier tipo de dato básico** (sección 1.4):

* **Números:** Encuentra el más bajo/alto.
* **Fechas (Dates):** Encuentra la fecha más antigua (`MIN`) o la más reciente (`MAX`).
* **Textos (Strings):** Encuentra el primer (`MIN`) o último (`MAX`) valor según el orden alfabético.

**Ejemplo de código:**

```sql
SELECT 
    MIN(precio) AS precio_mas_bajo,
    MAX(precio) AS precio_mas_alto,
    MIN(nombre) AS primer_producto_alfabetico
FROM productos;

```

**Resultado:**

| precio_mas_bajo | precio_mas_alto | primer_producto_alfabetico |
| --- | --- | --- |
| 25.00 | 1200.00 | Laptop |

---

### Combinando todo en una sola consulta

Una de las grandes ventajas de SQL es que puedes combinar múltiples funciones de agregación en un único `SELECT` para generar un reporte completo en un solo paso.

```sql
SELECT 
    COUNT(*) AS total_articulos,
    SUM(precio * stock) AS valor_total_inventario,
    MAX(precio) AS articulo_mas_caro
FROM productos
WHERE categoria = 'Electrónica';

```

En este caso, primero aplicamos el filtro `WHERE` (sección 2.4) para quedarnos solo con la Electrónica, y luego el motor calcula todas las métricas de agregación sobre ese subconjunto de datos.

Como puedes ver, estas funciones son muy poderosas para resumir **toda** una tabla o un resultado filtrado. Pero, ¿qué ocurre si queremos ver estos mismos cálculos desglosados *por cada categoría* de forma individual, sin tener que hacer múltiples consultas? Ese es exactamente el propósito de la cláusula `GROUP BY`, que exploraremos en la siguiente sección.

## 4.2. Agrupar datos con `GROUP BY`

En la sección anterior aprendimos a calcular totales, promedios y extremos. Sin embargo, aplicamos esos cálculos a **toda la tabla** de una sola vez (o a un subconjunto previamente filtrado con `WHERE`).

Pero, ¿qué sucede cuando las preguntas de negocio se vuelven más específicas? Imagina que tu jefe te pregunta: *"¿Cuántos productos tenemos y cuál es el stock total **por cada categoría**?"*.

Podrías escribir una consulta filtrando por "Electrónica" y luego otra consulta filtrando por "Muebles". Esto funciona si tienes dos categorías, pero sería una pesadilla si tuvieras cien. Para resolver esto de forma elegante y eficiente, SQL nos ofrece la cláusula `GROUP BY`.

---

### ¿Cómo funciona `GROUP BY`?

La instrucción `GROUP BY` toma las filas de tu tabla que comparten el mismo valor en una (o varias) columnas y las agrupa en una única "fila de resumen". Una vez agrupadas, el motor de base de datos aplica las funciones de agregación (`SUM`, `COUNT`, `AVG`, etc.) a cada uno de esos grupos de manera independiente.

Recuperemos nuestra tabla `productos`:

| id_producto | nombre | categoria | precio | stock |
| --- | --- | --- | --- | --- |
| 1 | Laptop | Electrónica | 1200.00 | 10 |
| 2 | Ratón | Electrónica | 25.00 | 50 |
| 3 | Teclado | Electrónica | 45.00 | NULL |
| 4 | Silla | Muebles | 150.00 | 20 |

**Ejemplo de código:**

Vamos a agrupar nuestra tabla por la columna `categoria` y calcularemos la cantidad de productos, el stock total y el precio promedio para cada una.

```sql
SELECT 
    categoria,
    COUNT(*) AS cantidad_productos,
    SUM(stock) AS stock_total,
    AVG(precio) AS precio_promedio
FROM productos
GROUP BY categoria;

```

**Resultado:**

| categoria | cantidad_productos | stock_total | precio_promedio |
| --- | --- | --- | --- |
| Electrónica | 3 | 60 | 423.33 |
| Muebles | 1 | 20 | 150.00 |

Como puedes observar, SQL identificó los valores únicos en la columna `categoria` ("Electrónica" y "Muebles"), creó un grupo para cada uno y luego calculó el `COUNT`, `SUM` y `AVG` internamente para las filas que pertenecían a cada grupo.

---

### La Regla de Oro del `GROUP BY`

Al empezar a escribir consultas con agrupamientos, el error más común (y que provocará que la base de datos te devuelva un error) es olvidar la relación matemática estricta que exige el `SELECT` cuando usas `GROUP BY`.

> **Regla de Oro:** Si en tu consulta estás utilizando `GROUP BY`, **cualquier columna** que aparezca en el `SELECT` tiene que cumplir obligatoriamente una de estas dos condiciones:
>
> 1. Formar parte de la cláusula `GROUP BY` (es la columna por la que estamos agrupando).
> 2. Estar envuelta dentro de una función de agregación (`SUM`, `MAX`, etc.).
>
>

**Ejemplo del error común:**

```sql
-- ❌ ESTO DARÁ ERROR
SELECT categoria, nombre, SUM(stock)
FROM productos
GROUP BY categoria;

```

¿Por qué falla? Porque estamos agrupando por `categoria`, lo que significa que la salida tendrá una fila para "Electrónica". Pero dentro de "Electrónica" tenemos tres nombres distintos (Laptop, Ratón, Teclado). El motor de SQL no sabe cuál de los tres nombres poner en esa única fila de resumen.

Para solucionarlo, debes quitar `nombre` del `SELECT`, agregarlo al `GROUP BY` (si quieres agrupar por categoría Y nombre), o aplicar una función de agregación sobre él, como `MAX(nombre)`.

---

### Filtrar antes de agrupar (`WHERE` vs `GROUP BY`)

Es perfectamente válido y muy común usar `WHERE` y `GROUP BY` en la misma consulta. Es vital entender el orden en que SQL procesa la información:

1. Primero, el `WHERE` filtra las filas individuales de la tabla original.
2. Luego, el `GROUP BY` agrupa únicamente las filas que sobrevivieron al filtro.
3. Finalmente, se calculan las agregaciones del `SELECT`.

```sql
-- Queremos el stock por categoría, pero solo de los productos caros (más de 100)
SELECT 
    categoria, 
    SUM(stock) AS stock_productos_caros
FROM productos
WHERE precio > 100.00
GROUP BY categoria;

```

Pero, ¿qué pasa si queremos filtrar **después** de haber agrupado? Por ejemplo, ¿qué tal si solo queremos ver las categorías cuyo *stock total* sea mayor a 50? El `WHERE` no nos sirve aquí, porque el stock total es un cálculo que aún no existe en el paso de filtrado inicial.

Para resolver este enigma necesitamos una cláusula nueva.

## 4.3. Filtrado de grupos con `HAVING` (Diferencia con `WHERE`)

En la sección anterior nos topamos con un problema fundamental: ¿qué ocurre si queremos filtrar nuestros resultados basándonos en el resultado de una función de agregación? Por ejemplo, si queremos ver únicamente las categorías que tienen un *stock total* superior a 50 unidades.

Intuitivamente, podríamos intentar usar la cláusula `WHERE` que aprendimos en el Capítulo 2. Sin embargo, si escribes algo como `WHERE SUM(stock) > 50`, el motor de la base de datos te devolverá un error inmediato.

¿Por qué? Porque **`WHERE` no sabe nada sobre agrupaciones ni totales**. `WHERE` evalúa fila por fila *antes* de que ocurra cualquier cálculo matemático o agrupamiento. Para solucionar este problema, SQL introduce la cláusula `HAVING`.

---

### ¿Qué es `HAVING`?

La cláusula `HAVING` es exactamente igual que `WHERE`, pero con una diferencia crucial: **`HAVING` filtra grupos, no filas individuales**. Se ejecuta *después* de que la cláusula `GROUP BY` haya hecho su trabajo y las funciones de agregación se hayan calculado.

Retomemos nuestra tabla `productos` y resolvamos el problema planteado: queremos saber qué categorías tienen un stock total sumado mayor a 50.

**Ejemplo de código:**

```sql
SELECT 
    categoria,
    SUM(stock) AS stock_total
FROM productos
GROUP BY categoria
HAVING SUM(stock) > 50;

```

**Resultado:**

| categoria | stock_total |
| --- | --- |
| Electrónica | 60 |

Como el grupo "Muebles" tenía un stock total de 20, la cláusula `HAVING` lo descartó del resultado final.

---

### `WHERE` y `HAVING` trabajando juntos

El verdadero dominio de SQL llega cuando comprendes que `WHERE` y `HAVING` no son excluyentes; de hecho, trabajan de maravilla juntos en la misma consulta. La clave está en el **orden de ejecución lógico** que sigue el motor de la base de datos:

1. **`FROM`**: ¿De qué tabla sacamos los datos?
2. **`WHERE`**: Filtra las filas individuales que no cumplen la condición.
3. **`GROUP BY`**: Agrupa las filas sobrevivientes.
4. **`HAVING`**: Filtra los grupos que no cumplen la condición.
5. **`SELECT`**: Devuelve las columnas y cálculos finales.

Veamos un ejemplo avanzado donde usamos ambos. Imagina que queremos saber qué categorías tienen más de 1 producto en el inventario, pero **no queremos tener en cuenta los productos que cuestan menos de 30.00**.

**Ejemplo de código:**

```sql
SELECT 
    categoria,
    COUNT(*) AS cantidad_productos_caros
FROM productos
WHERE precio >= 30.00  -- 1. Descartamos el "Ratón" (cuesta 25.00) ANTES de agrupar.
GROUP BY categoria     -- 2. Agrupamos lo que queda.
HAVING COUNT(*) > 1;   -- 3. Filtramos los grupos que tengan más de 1 producto.

```

**Resultado:**

| categoria | cantidad_productos_caros |
| --- | --- |
| Electrónica | 2 |

*Nota: La categoría "Muebles" tenía solo 1 producto (Silla), por lo que fue eliminada por el `HAVING`. La categoría "Electrónica" tenía 3 productos originalmente, pero como el "Ratón" fue eliminado por el `WHERE`, el conteo final para ese grupo es 2.*

---

### Resumen: `WHERE` vs. `HAVING`

Para que nunca más dudes cuál utilizar, aquí tienes la regla definitiva:

| Característica | `WHERE` | `HAVING` |
| --- | --- | --- |
| **¿Qué filtra?** | Filas individuales (registros). | Grupos de filas (resultados de agregación). |
| **¿Cuándo se ejecuta?** | **Antes** de agrupar los datos (`GROUP BY`). | **Después** de agrupar los datos (`GROUP BY`). |
| **¿Puede usar funciones de agregación (`SUM`, `COUNT`)?** | ❌ No. | ✅ Sí. |
| **¿Es obligatorio usar `GROUP BY`?** | No. | Sí (en el 99% de los casos prácticos). |

Con esta sección, hemos obtenido las herramientas necesarias para resumir y analizar grandes volúmenes de datos de forma independiente.
