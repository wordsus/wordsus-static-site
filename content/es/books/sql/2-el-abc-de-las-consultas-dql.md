Dominar SQL comienza con la capacidad de interrogar a la base de datos de manera precisa. En este capítulo, exploraremos el **Lenguaje de Consulta de Datos (DQL)** a través de su eje central: la sentencia `SELECT`. Aprenderás no solo a extraer columnas específicas y a renombrarlas mediante alias para mejorar la legibilidad, sino también a refinar tus resultados eliminando duplicados y aplicando filtros estratégicos. Desde el uso de operadores lógicos hasta el manejo de la ausencia de datos con valores nulos, sentarás las bases para transformar tablas masivas de información en respuestas útiles y claras para la toma de decisiones.

## 2.1. La sentencia `SELECT`: Selección de columnas

En el mundo de las bases de datos relacionales, recuperar información es la tarea más frecuente. Para ello, SQL nos proporciona la herramienta más importante y versátil de todo el lenguaje: la sentencia `SELECT`.

Si recuerdas el capítulo anterior sobre el modelo relacional, las tablas almacenan datos en filas y columnas. La cláusula `SELECT` te permite elegir exactamente *qué columnas* deseas extraer y visualizar de una tabla específica.

### La sintaxis básica

Toda consulta de extracción de datos comienza con dos componentes obligatorios:

1. **`SELECT`**: Indica qué columnas quieres recuperar.
2. **`FROM`**: Indica de qué tabla provienen esas columnas.

La estructura fundamental se ve así:

```sql
SELECT columna1, columna2, columna3
FROM nombre_tabla;

```

> **Nota importante:** Aunque en muchos sistemas gestores (RDBMS) el uso del punto y coma (`;`) al final de la consulta es opcional, es una excelente práctica incluirlo siempre, ya que marca el final estándar de una instrucción SQL.

---

### Seleccionando todas las columnas (`*`)

Para ilustrar cómo funciona, imaginemos que tenemos una tabla llamada `Empleados` (la cual hace uso de los tipos de datos que vimos en el Capítulo 1) con las siguientes columnas: `id_empleado`, `nombre`, `apellido`, `email` y `salario`.

Si deseas ver **absolutamente toda la información** almacenada en la tabla sin descartar ninguna columna, puedes usar el comodín asterisco (`*`):

```sql
SELECT *
FROM Empleados;

```

El asterisco le dice a la base de datos: *"Devuélveme todas las columnas de esta tabla en el orden exacto en el que fueron definidas en el esquema"*.

#### ¿Por qué usar (o no usar) `SELECT *`?

* **Es útil para:** Explorar rápidamente los datos cuando estás analizando una tabla nueva y necesitas conocer su contenido y estructura visual.
* **Es una mala práctica en producción porque:**
* Consume más recursos de red y memoria de tu servidor al descargar datos que quizás la aplicación final no necesita.
* Si el esquema de la tabla cambia en el futuro (por ejemplo, si un administrador añade una columna con información sensible o pesada), tu consulta devolverá esos datos inesperados de forma automática, lo que puede romper el código de las aplicaciones que dependen de esa consulta.

---

### Seleccionando columnas específicas

En el desarrollo profesional, la regla de oro es **pedir únicamente los datos que necesitas**. Si para un reporte solo requerimos ver el nombre y el correo electrónico de los empleados, debemos especificar esas columnas explícitamente, separándolas por comas:

```sql
SELECT nombre, email
FROM Empleados;

```

Al ejecutar esta instrucción, el motor de la base de datos ignorará el resto de las columnas (`id_empleado`, `apellido`, `salario`) y te devolverá un conjunto de resultados mucho más liviano y eficiente.

**Puntos clave a tener en cuenta al seleccionar columnas:**

* **El orden de visualización depende de ti:** Las columnas aparecerán en los resultados exactamente en el mismo orden en el que las escribas en tu instrucción `SELECT`, sin importar cómo estén estructuradas físicamente en la tabla subyacente. Si escribes `SELECT email, nombre`, el correo aparecerá primero.
* **Convenciones de formato:** Generalmente, las palabras clave de SQL (`SELECT`, `FROM`) se escriben en mayúsculas por convención y para facilitar la lectura del código, pero SQL no distingue entre mayúsculas y minúsculas (*case-insensitive*) en sus comandos.

Con esta base, ya sabes cómo proyectar las columnas de tu interés. En la siguiente sección, veremos cómo modificar los nombres de estas columnas en nuestros resultados para hacerlos más legibles.

## 2.2. Alias de columnas y tablas (`AS`)

En la sección anterior vimos cómo proyectar las columnas exactas que necesitamos. Sin embargo, en el mundo real, los nombres de las columnas en una base de datos suelen estar diseñados para ser eficientes y seguir reglas técnicas (por ejemplo, `id_empleado`, `fec_nac`, `val_tot`). Estos nombres rara vez son atractivos o fáciles de entender para un usuario final que lee un reporte.

Para solucionar esto, SQL nos permite asignar **alias**: nombres temporales que le damos a una columna o a una tabla, exclusivamente para la consulta que estamos ejecutando.

### Alias de Columnas

Para renombrar temporalmente una columna en tus resultados, utilizamos la palabra clave `AS` justo después del nombre original de la columna, seguido del nuevo nombre que deseamos mostrar.

Retomando nuestra tabla `Empleados`, imagina que quieres mostrar el nombre y el salario, pero quieres que los encabezados de tu resultado sean más descriptivos y limpios:

```sql
SELECT 
    nombre AS "Nombre del Empleado", 
    salario AS "Sueldo Mensual"
FROM Empleados;

```

**Reglas clave para los alias de columnas:**

* **Espacios en blanco:** Si tu alias contiene espacios (como en `"Nombre del Empleado"`), **debes** encerrarlo entre comillas dobles (`""`) o comillas simples (`''`), dependiendo del motor de base de datos que uses (las comillas dobles son el estándar ANSI para identificadores). Si el alias es una sola palabra continua (ej. `Sueldo`), las comillas son opcionales.
* **La palabra `AS` es opcional:** En la mayoría de los motores SQL (como PostgreSQL, MySQL o SQL Server), puedes omitir la palabra `AS` y simplemente dejar un espacio: `SELECT nombre "Nombre del Empleado"`. Sin embargo, escribir `AS` es una **excelente práctica** porque hace que tu código sea mucho más fácil de leer y mantener.
* **No modifican la tabla real:** Es fundamental entender que un alias *solo* cambia cómo se visualizan los datos en el resultado de esa consulta específica. No renombra la columna en el esquema (Schema) de tu base de datos.

### Alias de Tablas

Al igual que con las columnas, también puedes asignar un alias a la tabla en la cláusula `FROM`. Por lo general, se utilizan abreviaturas de una o dos letras.

```sql
SELECT 
    emp.nombre, 
    emp.email
FROM Empleados AS emp;

```

En este ejemplo, le hemos dicho a SQL: *"De ahora en adelante en esta consulta, me referiré a la tabla `Empleados` simplemente como `emp`"*. Luego, en el `SELECT`, usamos la sintaxis `alias.columna` (`emp.nombre`) para indicar explícitamente de dónde viene ese dato.

#### ¿Por qué querría darle un alias a una tabla?

Si solo estás consultando una tabla, como hemos hecho hasta ahora, usar un alias de tabla puede parecer un trabajo extra innecesario. Sin embargo, te estamos preparando para el **Capítulo 5**.

Cuando llegues a los `JOINs` (donde combinaremos datos de múltiples tablas al mismo tiempo), es muy común que dos tablas distintas tengan columnas con el mismo nombre (por ejemplo, una tabla `Empleados` y una tabla `Clientes` podrían tener ambas una columna llamada `id_ciudad`). Los alias de tabla serán obligatorios allí para decirle a SQL exactamente de qué tabla debe sacar el dato, evitando así consultas ambiguas y errores.

## 2.3. Eliminación de duplicados con `DISTINCT`

Hasta ahora, nuestras consultas han extraído filas tal y como están almacenadas en la base de datos. Sin embargo, en la práctica es muy común encontrarnos con valores repetidos dentro de una misma columna.

Imaginemos que a nuestra tabla `Empleados` le hemos añadido una columna llamada `departamento`. Si tenemos 50 empleados y la mitad trabaja en "Ventas", al hacer una consulta básica obtendremos la palabra "Ventas" repetida 25 veces:

```sql
SELECT departamento
FROM Empleados;

```

Si lo que realmente queremos es responder a la pregunta: *"¿Cuáles son los distintos departamentos que existen en la empresa?"*, esa lista interminable y repetitiva no nos sirve de mucho. Aquí es donde entra en juego la palabra clave `DISTINCT`.

### Cómo funciona `DISTINCT`

La cláusula `DISTINCT` se coloca inmediatamente después de la palabra `SELECT` y antes de los nombres de las columnas. Su función es evaluar el conjunto de resultados y **eliminar las filas duplicadas**, devolviendo únicamente valores únicos.

```sql
SELECT DISTINCT departamento
FROM Empleados;

```

Al ejecutar esta instrucción, el motor de la base de datos agrupará las repeticiones y te devolverá una lista limpia (por ejemplo: 'Ventas', 'IT', 'Recursos Humanos', 'Marketing'), donde cada departamento aparecerá una única vez.

### `DISTINCT` con múltiples columnas

El comportamiento de `DISTINCT` se vuelve muy interesante (y a veces confuso para los principiantes) cuando seleccionamos más de una columna.

Si aplicas `DISTINCT` a varias columnas, SQL no busca valores únicos por cada columna de manera individual, sino que evalúa **la combinación única de todas las columnas** especificadas.

Imagina que queremos saber en qué ciudades tenemos empleados trabajando para cada departamento:

```sql
SELECT DISTINCT departamento, ciudad_origen
FROM Empleados;

```

El resultado de esta consulta no te dará una lista de departamentos únicos y una lista de ciudades únicas por separado. En su lugar, te dará **pares únicos**. Si tienes tres empleados de "Ventas" en "Madrid" y dos de "Ventas" en "Barcelona", el resultado mostrará:

| departamento | ciudad_origen |
| --- | --- |
| Ventas | Madrid |
| Ventas | Barcelona |

El par `(Ventas, Madrid)` se muestra una sola vez, sin importar cuántos empleados cumplan con esa condición.

### Una advertencia sobre el rendimiento

Aunque `DISTINCT` es una herramienta excepcionalmente útil, **no debe usarse a la ligera**.

Para que la base de datos pueda identificar y eliminar los duplicados, internamente debe realizar operaciones adicionales de ordenamiento o clasificación (hashing) de los datos. En tablas con millones de registros, esto requiere tiempo, memoria y capacidad de procesamiento.

> **Buenas prácticas:** Utiliza `DISTINCT` solo cuando sea estrictamente necesario para responder a una pregunta de negocio. Un error muy común en niveles intermedios (que veremos en el **Capítulo 5** sobre `JOINs`) es usar `DISTINCT` para "ocultar" filas duplicadas que aparecen por haber escrito mal una relación entre tablas. ¡Nunca uses `DISTINCT` como un parche para una consulta mal construida!

## 2.4. Filtrado básico con `WHERE`

Hasta este punto del capítulo, hemos aprendido a controlar "verticalmente" nuestra tabla: usamos `SELECT` para decidir qué columnas queremos ver. Sin embargo, si ejecutamos `SELECT nombre, salario FROM Empleados`, la base de datos nos devolverá esa información para **todas las filas** que existan en la tabla.

Si tu empresa tiene miles de empleados, leer esa lista interminable no es práctico. ¿Qué pasa si solo queremos ver a los empleados que ganan más de cierta cantidad de dinero, o a los que pertenecen a un departamento específico? Para controlar nuestros datos "horizontalmente" (es decir, filtrar qué filas queremos recuperar), utilizamos la cláusula `WHERE`.

### La sintaxis del filtro

La cláusula `WHERE` actúa como un embudo. Se coloca inmediatamente después de la cláusula `FROM` y evalúa una condición para cada fila de la tabla. Si la condición se cumple (es verdadera o *True*), la fila se incluye en el resultado; si no se cumple (es falsa o *False*), la fila se descarta.

La estructura básica es la siguiente:

```sql
SELECT columna1, columna2
FROM nombre_tabla
WHERE condicion;

```

### Operadores de comparación básicos

Para construir la condición de filtrado, SQL utiliza operadores matemáticos muy intuitivos. Los más comunes son:

* `=` : Igual a
* `>` : Mayor que
* `<` : Menor que
* `>=` : Mayor o igual que
* `<=` : Menor o igual que
* `<>` o `!=` : Distinto de (No igual a)

#### Filtrando datos numéricos

Si queremos encontrar a todos los empleados de nuestra tabla cuyo salario sea estrictamente mayor a 3000, la consulta sería:

```sql
SELECT nombre, apellido, salario
FROM Empleados
WHERE salario > 3000;

```

#### Filtrando cadenas de texto (Strings)

Recordando los tipos de datos que vimos en el **Capítulo 1**, es crucial saber que cuando filtramos por texto, **debemos encerrar el valor entre comillas simples (`' '`)**.

Si queremos buscar a todos los empleados que trabajan en el departamento de "Ventas", lo escribiremos así:

```sql
SELECT nombre, email
FROM Empleados
WHERE departamento = 'Ventas';

```

> **Nota importante sobre el texto:** Dependiendo de la configuración de tu base de datos (lo que se conoce como *Collation*), las búsquedas de texto pueden ser sensibles a mayúsculas y minúsculas (*case-sensitive*). En algunos sistemas, buscar `'Ventas'` no arrojará los mismos resultados que buscar `'ventas'`. Ante la duda, es mejor escribir el valor exactamente como está almacenado.

### Un detalle crucial: El orden de ejecución

Un concepto que diferencia a los principiantes de los profesionales en SQL es entender el orden en el que la base de datos procesa la consulta (que no es el mismo orden en el que la escribimos).

Cuando ejecutas una consulta con `WHERE`, el motor de la base de datos hace lo siguiente:

1. Va a la tabla indicada en el **`FROM`**.
2. Filtra las filas según la condición del **`WHERE`**.
3. Finalmente, proyecta las columnas que pediste en el **`SELECT`**.

Esto significa algo maravilloso: **puedes filtrar por una columna que no vas a mostrar en tu resultado final.**

Por ejemplo, puedes pedir solo los nombres de los empleados de IT, sin necesidad de mostrar la columna "departamento":

```sql
SELECT nombre
FROM Empleados
WHERE departamento = 'IT';

```

Esta consulta es perfectamente válida y muy común en el desarrollo de aplicaciones.

Con el `WHERE` básico podemos hacer preguntas directas a nuestra base de datos. Pero, ¿qué ocurre si necesitamos condiciones más complejas, como buscar empleados que ganen más de 3000 **Y** que además trabajen en 'Ventas'?

## 2.5. Operadores lógicos (`AND`, `OR`, `NOT`, `IN`, `BETWEEN`, `LIKE`)

En la sección anterior aprendimos a filtrar datos usando una única condición con la cláusula `WHERE`. Sin embargo, en el mundo real, las preguntas que le hacemos a una base de datos rara vez son tan simples.

¿Qué sucede si necesitamos encontrar a los empleados del departamento de 'Ventas' **que además** ganen más de 3000? ¿O si queremos ver a los empleados que trabajan en 'Ventas' **o** en 'Marketing'? Para combinar múltiples condiciones y realizar búsquedas de patrones, SQL nos ofrece los **operadores lógicos**.

### Combinando condiciones: `AND`, `OR` y `NOT`

Estos tres operadores son la base de la lógica booleana en SQL y te permiten encadenar tantas condiciones como necesites.

#### 1. El operador `AND` (Y)

Exige que **todas** las condiciones separadas por él sean verdaderas (`True`) para que la fila sea incluida en el resultado. Actúa como un filtro estricto.

```sql
SELECT nombre, apellido, departamento, salario
FROM Empleados
WHERE departamento = 'Ventas' 
  AND salario > 3000;

```

*(Solo devolverá a los vendedores que superen ese umbral salarial; si alguien es de Ventas pero gana 2500, será descartado).*

#### 2. El operador `OR` (O)

Es mucho más permisivo. Solo requiere que **al menos una** de las condiciones sea verdadera para incluir la fila.

```sql
SELECT nombre, departamento
FROM Empleados
WHERE departamento = 'Ventas' 
   OR departamento = 'Marketing';

```

> **Regla de oro con los paréntesis:** Cuando combines `AND` y `OR` en la misma consulta, **usa siempre paréntesis** para agrupar tu lógica. SQL procesa el `AND` antes que el `OR` por defecto. Los paréntesis aseguran que la base de datos entienda exactamente lo que quieres preguntar, evitando resultados inesperados.

#### 3. El operador `NOT` (NO)

Simplemente invierte o niega una condición. Devuelve las filas donde la condición sea falsa.

```sql
SELECT nombre, departamento
FROM Empleados
WHERE NOT departamento = 'IT';

```

---

### Operadores avanzados de filtrado: `IN`, `BETWEEN` y `LIKE`

SQL también incluye operadores diseñados para simplificar consultas que, de otro modo, requerirían escribir cadenas interminables de `AND` y `OR`.

#### El operador `IN`

Imagina que quieres filtrar empleados de cuatro departamentos distintos. Usar `OR` repetidamente (`departamento = 'A' OR departamento = 'B'...`) es tedioso. `IN` te permite comprobar si un valor coincide con cualquier elemento dentro de una lista específica.

```sql
SELECT nombre, departamento
FROM Empleados
WHERE departamento IN ('Ventas', 'Marketing', 'Finanzas', 'RRHH');

```

*(Puedes combinarlo con `NOT`: usar `NOT IN` te devolverá a todos los empleados que **no** pertenezcan a esa lista).*

#### El operador `BETWEEN`

Se utiliza para filtrar valores dentro de un rango específico. Es ideal para números y fechas (tipos de datos que vimos en el Capítulo 1). **Un detalle crucial:** `BETWEEN` es *inclusivo*, lo que significa que incluye los valores de inicio y fin que especifiques.

```sql
SELECT nombre, salario
FROM Empleados
WHERE salario BETWEEN 3000 AND 5000;

```

*(Esto es exactamente equivalente a escribir `WHERE salario >= 3000 AND salario <= 5000`, pero mucho más limpio).*

#### El operador `LIKE` (Búsqueda de patrones)

A veces no sabes el valor exacto que estás buscando. Quizás solo recuerdas que el apellido de un empleado empieza con la letra "G" o que su correo electrónico contiene la palabra "gmail". `LIKE` se usa para buscar patrones en cadenas de texto (*Strings*) mediante el uso de dos comodines principales:

* **`%` (Porcentaje):** Representa cero, uno o múltiples caracteres.
* **`_` (Guion bajo):** Representa **exactamente un** carácter.

**Ejemplos prácticos con `LIKE`:**

* **Empieza con 'G':** `LIKE 'G%'` (Encontrará 'Garcia', 'Gomez', 'G').
* **Termina con 'ez':** `LIKE '%ez'` (Encontrará 'Perez', 'Lopez').
* **Contiene 'ana':** `LIKE '%ana%'` (Encontrará 'Ana', 'Mariana', 'Banano').
* **Tiene una 'a' en la segunda posición:** `LIKE '_a%'` (Encontrará 'Garcia', 'Martin', pero no 'Ana').

```sql
SELECT nombre, apellido
FROM Empleados
WHERE apellido LIKE 'G%';

```

Con estos operadores, tu capacidad para explorar y auditar datos acaba de multiplicarse exponencialmente. Estás pasando de hacer simples lecturas a formular preguntas complejas y precisas.

## 2.6. Manejo de valores nulos (`IS NULL`, `IS NOT NULL`)

En el **Capítulo 1**, al explorar los tipos de datos, aprendimos que las columnas almacenan números, textos o fechas. Pero, ¿qué ocurre cuando simplemente *no tenemos* el dato para un empleado en particular?

Imagina que a nuestra tabla `Empleados` le añadimos una columna llamada `telefono_secundario`. Es muy probable que no todos los empleados tengan un segundo número. En las bases de datos relacionales, cuando un dato falta, es desconocido o no aplica, se representa con un marcador especial llamado **`NULL`**.

### ¿Qué es exactamente `NULL`?

El concepto más importante que debes grabar a fuego en tu mente es este: **`NULL` no es un cero (0) y no es un texto vacío (`''`).** `NULL` significa, literalmente, *ausencia de valor* o *valor desconocido*.

* Un salario de `0` significa que el empleado trabaja gratis (conocemos el valor, y es cero).
* Un salario `NULL` significa que *no sabemos* cuánto cobra el empleado (el valor es desconocido).

### El problema de comparar lo desconocido

Dado que `NULL` significa "desconocido", la lógica matemática tradicional se rompe. Si intentas usar los operadores de comparación que vimos en la sección 2.4 (`=`, `<`, `>`) con un valor nulo, el resultado nunca será verdadero.

Si escribes la siguiente consulta para encontrar a los empleados sin teléfono secundario, **no funcionará**:

```sql
-- ESTO ES UN ERROR COMÚN Y NO DEVOLVERÁ NINGUNA FILA
SELECT nombre, apellido
FROM Empleados
WHERE telefono_secundario = NULL;

```

¿Por qué falla? Porque le estás preguntando a la base de datos: *"¿Es este valor desconocido exactamente igual a este otro valor desconocido?"*. Como SQL no puede garantizar que dos cosas desconocidas sean iguales, el resultado de esa evaluación no es *True* ni *False*, sino `NULL`. Y la cláusula `WHERE` solo devuelve las filas que evalúan estrictamente como verdaderas (*True*).

### La solución: `IS NULL` y `IS NOT NULL`

Para interactuar con la ausencia de datos, SQL nos provee de dos operadores lógicos diseñados exclusivamente para este propósito.

#### 1. Buscar valores faltantes con `IS NULL`

Para encontrar los registros donde un dato está ausente, utilizamos `IS NULL`. Esta es la forma correcta de reescribir nuestra consulta anterior:

```sql
SELECT nombre, apellido
FROM Empleados
WHERE telefono_secundario IS NULL;

```

*(Esta instrucción sí te devolverá la lista de todos los empleados que no tienen un teléfono secundario registrado).*

#### 2. Buscar valores existentes con `IS NOT NULL`

Por el contrario, si queremos filtrar nuestra tabla para ver únicamente a aquellos empleados que **sí** tienen un dato registrado en esa columna (sin importar cuál sea ese dato), utilizamos `IS NOT NULL`.

```sql
SELECT nombre, email, telefono_secundario
FROM Empleados
WHERE telefono_secundario IS NOT NULL;

```

### La importancia de los Nulos a futuro

Comprender cómo y cuándo filtrar los valores `NULL` es vital no solo para el `SELECT` básico. Como veremos en el **Capítulo 4 (Funciones de Agregación)**, los valores nulos pueden afectar drásticamente los cálculos matemáticos como los promedios (`AVG`) o las sumas (`SUM`). Además, en el **Capítulo 5**, aprenderemos que las combinaciones de tablas (`LEFT JOIN`, `RIGHT JOIN`) generan valores `NULL` intencionalmente cuando no encuentran coincidencias entre los registros.

¡Dominar `IS NULL` y `IS NOT NULL` desde ahora te ahorrará muchos errores de lógica en reportes avanzados!

¡Con esto damos por concluido el Capítulo 2! Ya tienes dominado el "ABC de las Consultas" (DQL) y eres capaz de extraer, renombrar, limpiar y filtrar datos con precisión.
