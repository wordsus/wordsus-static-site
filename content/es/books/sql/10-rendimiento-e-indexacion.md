El éxito de una base de datos no se mide solo por la integridad de sus datos, sino por la **velocidad** con la que entrega respuestas. En este capítulo, dejamos de lado la sintaxis básica para entrar en la ingeniería del rendimiento. Entenderás que un índice no es magia, sino una estructura física basada en **B-Trees** y **Hashes** que evita el costoso escaneo total de tablas. Aprenderás a diferenciar dónde residen tus datos con los índices **agrupados**, a diagnosticar cuellos de botella mediante el comando **EXPLAIN** y, finalmente, a dominar la **SARGability** para que tus consultas nunca ignoren los atajos que has construido. Bienvenida al arte de la optimización.

## 10.1. ¿Cómo funciona un Índice? (B-Tree, Hash)

Imagina que tienes en tus manos un directorio telefónico con un millón de páginas, pero los nombres están completamente desordenados. Si te pido que busques a "Zoe Martínez", tendrías que leer el libro página por página desde el principio hasta encontrarla. En bases de datos, este proceso se llama **Full Table Scan** (Escaneo Completo de Tabla) y es el enemigo público número uno del rendimiento.

Para resolver esto en la vida real, los directorios están ordenados alfabéticamente o tienen un índice al final. En SQL, un **índice** es exactamente eso: una estructura de datos adicional, independiente de la tabla original, que mantiene copias de ciertas columnas ordenadas y con "punteros" (direcciones) que indican exactamente dónde reside el registro completo en el disco duro.

Existen varios tipos de estructuras de datos para crear estos índices, pero los dos motores principales que debes dominar son el **B-Tree** y el **Hash**.

### Índices B-Tree (Balanced Tree)

El árbol B (Árbol Balanceado) es el rey indiscutible de las bases de datos relacionales. Cuando ejecutas un `CREATE INDEX` en tu RDBMS sin especificar el tipo, en el 99% de los casos estás creando un B-Tree.

**¿Cómo funciona?**
Visualiza un árbol invertido.

1. **Nodo Raíz:** Tienes un punto de entrada que evalúa tu búsqueda y decide si ir hacia la izquierda o hacia la derecha.
2. **Nodos Rama:** Filtran aún más el rango de valores, dividiendo la búsqueda de forma logarítmica (descartando la mitad de los datos en cada paso).
3. **Nodos Hoja:** En la base del árbol, estos nodos contienen los valores ordenados y el puntero hacia el registro en la tabla física. Al estar "balanceado", el motor de base de datos siempre recorrerá la misma cantidad de niveles para encontrar cualquier dato, garantizando un tiempo de respuesta predecible y rápido.

**¿Para qué es ideal?**
Dado que los nodos hoja están entrelazados de manera secuencial, los índices B-Tree son perfectos para:

* Búsquedas exactas (`WHERE edad = 30`)
* Búsquedas por rangos (`WHERE edad BETWEEN 20 AND 40`, `WHERE precio > 100`)
* Ordenamiento (`ORDER BY fecha_registro DESC`)
* Búsquedas con prefijos (`WHERE apellido LIKE 'Gar%'`)

**Ejemplo de código:**

```sql
-- Creación de un índice B-Tree clásico
-- Mejorará las búsquedas, rangos y ordenamientos por la columna 'apellido'
CREATE INDEX idx_empleados_apellido 
ON empleados(apellido);

```

### Índices Hash

A diferencia del B-Tree que organiza la información jerárquicamente, un índice Hash funciona como un diccionario de acceso directo, apoyándose en una función matemática (función Hash).

**¿Cómo funciona?**
El motor toma el valor de la columna que quieres indexar (por ejemplo, un código de usuario `"USR-992"`) y lo pasa por una función matemática. Esta función devuelve un código único (un *hash*) que indica directamente el "cubo" (bucket) de memoria donde se encuentra la dirección de ese registro. No hay navegación a través de ramas; es un salto directo a la ubicación de los datos.

**¿Para qué es ideal?**
Los índices Hash son extremadamente rápidos (más que los B-Tree), pero tienen una gran limitación: **solo sirven para coincidencias exactas (`=`)**.

Dado que la función Hash transforma el valor original en un número aparentemente aleatorio, se pierde cualquier noción de orden. Por lo tanto, un índice Hash es inútil si usas operadores como `<`, `>`, `BETWEEN` o quieres hacer un `ORDER BY`.

**Ejemplo de código:**
*Nota: No todos los RDBMS soportan la creación explícita de índices Hash para tablas en disco. PostgreSQL es uno de los que sí permite esta sintaxis.*

```sql
-- Creación de un índice Hash en PostgreSQL
-- Ideal para búsquedas exactas como: WHERE token_sesion = 'abc123xyz'
CREATE INDEX idx_sesiones_token 
ON sesiones USING HASH (token_sesion);

```

### En resumen: B-Tree vs Hash

| Característica | Índice B-Tree | Índice Hash |
| --- | --- | --- |
| **Estructura** | Árbol jerárquico y balanceado | Tabla de correspondencia (Hash map) |
| **Búsquedas exactas (`=`)** | Muy rápido | **Extremadamente rápido** |
| **Búsquedas por rangos (`<`, `>`)** | **Excelente** | Inútil (No soportado) |
| **Ordenamiento (`ORDER BY`)** | **Excelente** | Inútil (No soportado) |
| **Caso de uso común** | Claves foráneas, fechas, precios, nombres. | Tokens de sesión, IDs únicos de exactitud estricta. |

Crear un índice es el primer paso para optimizar, pero no todos los índices se almacenan de la misma manera en relación con los datos de tu tabla.

## 10.2. Índices agrupados (Clustered) vs No agrupados

En la sección anterior vimos cómo un índice actúa como una estructura auxiliar para no tener que escanear toda una tabla. Sin embargo, la forma en que este índice se relaciona con los datos reales almacenados en el disco duro puede ser de dos maneras muy distintas: agrupada o no agrupada.

### Índice Agrupado (Clustered Index)

Un índice agrupado no solo es una estructura de búsqueda; **es la tabla en sí misma**. En un índice agrupado, el nivel más bajo del B-Tree (los nodos hoja) contiene las filas completas de datos de tu tabla.

Esto significa que el índice agrupado **dicta el orden físico** en el que se guardan los registros en el disco duro.

**La regla de oro:** Dado que los datos físicos solo pueden estar ordenados de una única manera, **solo puedes tener un (1) índice agrupado por tabla**.

* **La analogía perfecta:** Piensa en un diccionario o en un directorio telefónico impreso. Los datos están físicamente ordenados alfabéticamente de la "A" a la "Z". El "índice" y los "datos" son la misma cosa.
* **Comportamiento por defecto:** En la gran mayoría de los RDBMS (como SQL Server, MySQL con InnoDB, o PostgreSQL), cuando defines una **Clave Primaria (Primary Key)**, el motor crea automáticamente un índice agrupado sobre esa columna, asumiendo que será la forma más común de buscar o relacionar esa tabla.

**Ejemplo de código:**
Aunque suele crearse implícitamente con la Clave Primaria, también puedes crearlo explícitamente (sintaxis común en SQL Server):

```sql
-- Creación de un índice agrupado explícito
-- Los datos físicos de la tabla se reordenarán en disco según la 'fecha_registro'
CREATE CLUSTERED INDEX idx_clientes_fecha 
ON clientes(fecha_registro);

```

### Índice No Agrupado (Non-Clustered Index)

Si el índice agrupado es el diccionario, el índice no agrupado es el **índice temático al final de un libro de texto**.

En un índice no agrupado, la estructura del B-Tree está completamente separada de los datos reales. Cuando llegas al nodo hoja de este árbol, no encuentras la fila completa con todos los datos. En su lugar, encuentras un **puntero** (una dirección o localizador) que te dice exactamente dónde ir a buscar esa fila en la tabla física (que suele ser el índice agrupado).

* **La ventaja:** Como no alteran el orden físico de la tabla, **puedes tener múltiples índices no agrupados** en una misma tabla (por ejemplo, uno para el `email`, otro para el `apellido` y otro para el `documento_identidad`).
* **El costo (Bookmark Lookup):** Si buscas a un cliente por su `email` (índice no agrupado) y en tu `SELECT` pides también su `direccion` y `telefono`, el motor primero navegará por el índice del email, encontrará el puntero, y luego tendrá que dar un "salto" hacia la tabla principal (el índice agrupado) para recuperar el resto de las columnas. Este salto adicional consume recursos.

**Ejemplo de código:**
Cuando usas el comando estándar para crear un índice, estás creando uno no agrupado por defecto.

```sql
-- Creación de un índice no agrupado
-- Crea una estructura separada para buscar rápidamente por email
CREATE NONCLUSTERED INDEX idx_clientes_email 
ON clientes(email); 

-- Nota: En muchos RDBMS como PostgreSQL o MySQL, 
-- la palabra NONCLUSTERED se omite, ya que es el comportamiento por defecto.
CREATE INDEX idx_clientes_email ON clientes(email);

```

### Resumen de la batalla

| Característica | Índice Agrupado (Clustered) | Índice No Agrupado (Non-Clustered) |
| --- | --- | --- |
| **¿Qué hay en los nodos hoja?** | Las filas completas de datos (la tabla real). | Un puntero hacia la fila de datos real. |
| **Límite por tabla** | Solo uno (1). | Múltiples (decenas o cientos, aunque no es recomendable abusar). |
| **Orden físico en disco** | Sí, los datos se ordenan físicamente según este índice. | No afecta el orden físico de los datos en la tabla. |
| **Uso ideal** | Claves primarias, columnas usadas frecuentemente en `JOINs` o rangos (`BETWEEN`). | Columnas usadas frecuentemente en `WHERE` (como emails, estados, apellidos). |

Comprender esta diferencia es lo que separa a un desarrollador que simplemente "crea índices a lo loco" de uno que diseña bases de datos eficientes.

## 10.3. Análisis de planes de ejecución (`EXPLAIN`)

Hasta ahora has aprendido que SQL es un lenguaje **declarativo**. Esto significa que tú escribes *qué* datos quieres (usando `SELECT`, `JOIN`, `WHERE`), pero nunca le dices a la base de datos *cómo* debe buscarlos.

El responsable de decidir el "cómo" es un componente interno llamado **Optimizador de Consultas (Query Optimizer)**. El optimizador evalúa tu consulta, mira los índices disponibles, analiza las estadísticas de la tabla y calcula múltiples "rutas" posibles. Finalmente, elige la ruta que considera más "barata" en términos de recursos (CPU, memoria y lecturas de disco). A esta ruta ganadora se le llama **Plan de Ejecución**.

El comando `EXPLAIN` te permite "espiar" ese plan de ejecución antes o después de que la consulta se realice.

### ¿Cómo leer un Plan de Ejecución? Los tipos de "Scan"

Aunque cada RDBMS (PostgreSQL, MySQL, SQL Server, Oracle) muestra el plan de ejecución con un formato distinto —algunos como texto tabular, otros como diagramas visuales o formato JSON—, todos comparten los mismos conceptos básicos.

Lo más importante que debes buscar en un plan de ejecución es la palabra **Scan** (Escaneo). Te indicará cómo la base de datos accedió a tus tablas:

1. **Sequential Scan / Full Table Scan (El camino largo):** El motor leyó la tabla entera, fila por fila, desde el principio hasta el final. Si tu tabla tiene millones de registros y ves esto para una búsqueda específica, es una señal de alerta roja. Significa que falta un índice o que el optimizador decidió ignorarlo.
2. **Index Scan (El atajo):** ¡Buenas noticias! El motor utilizó un índice B-Tree (como los que vimos en la sección 10.1) para encontrar los registros rápidamente. Navegó por el árbol, encontró el puntero y luego dio un pequeño salto a la tabla (índice agrupado) para recuperar el resto de los datos.
3. **Index Only Scan / Covering Index (El Santo Grial):** Es el escenario más óptimo posible. Ocurre cuando **todas** las columnas que pediste en tu `SELECT` ya están presentes dentro del propio índice no agrupado. El motor lee el índice y, como ya tiene todo lo que necesita, ni siquiera se molesta en visitar la tabla principal.

### Usando `EXPLAIN` en la práctica

Veamos un ejemplo de cómo diagnosticar una consulta. Supongamos que tenemos una tabla `empleados` con 5 millones de registros y queremos buscar a alguien por su correo electrónico.

**Escenario 1: Sin índices (El desastre)**

```sql
EXPLAIN 
SELECT id_empleado, nombre, apellido 
FROM empleados 
WHERE email = 'zmartinez@empresa.com';

```

*Salida simulada (estilo PostgreSQL):*

```text
Seq Scan on empleados  (cost=0.00..105000.00 rows=1 width=45)
  Filter: ((email)::text = 'zmartinez@empresa.com'::text)

```

*Diagnóstico:* El motor está haciendo un **Seq Scan** (Sequential Scan). El "costo" es altísimo. Va a revisar los 5 millones de registros uno por uno.

**Escenario 2: Aplicando un índice (La solución)**

Creamos un índice no agrupado sobre la columna `email`:

```sql
CREATE INDEX idx_empleados_email ON empleados(email);

```

Ahora volvemos a ejecutar exactamente el mismo `EXPLAIN`:

```sql
EXPLAIN 
SELECT id_empleado, nombre, apellido 
FROM empleados 
WHERE email = 'zmartinez@empresa.com';

```

*Salida simulada:*

```text
Index Scan using idx_empleados_email on empleados  (cost=0.43..8.45 rows=1 width=45)
  Index Cond: ((email)::text = 'zmartinez@empresa.com'::text)

```

*Diagnóstico:* ¡Éxito! El motor ahora usa un **Index Scan**. El costo bajó drásticamente de 105,000 a 8. La consulta pasó de tardar segundos (o minutos) a milisegundos.

### `EXPLAIN` vs `EXPLAIN ANALYZE`

Es vital entender una diferencia conceptual que ofrecen motores como PostgreSQL o MySQL:

* **`EXPLAIN` a secas:** Es una **estimación**. Le pide al Optimizador que le muestre el plan que *planea* usar, basándose en la teoría y las estadísticas guardadas. **No ejecuta** realmente la consulta. Es seguro usarlo en producción, incluso con `UPDATE` o `DELETE`.
* **`EXPLAIN ANALYZE`:** Esto **sí ejecuta** la consulta en la realidad. Te muestra el plan estimado, pero añade el tiempo *real* que tardó cada paso y cuántas filas exactas se procesaron.

```sql
-- Ejecuta la consulta y muestra estadísticas reales de tiempo
EXPLAIN ANALYZE 
SELECT * FROM empleados WHERE departamento_id = 5;

```

*Nota de precaución:* Nunca uses `EXPLAIN ANALYZE` con un `DELETE` o `UPDATE` en producción a menos que lo envuelvas en una transacción (`BEGIN` / `ROLLBACK`), ¡porque la consulta se ejecutará de verdad y alterarás los datos!

Saber leer un plan de ejecución te da el superpoder de auditar el rendimiento. Sin embargo, a veces tienes el índice perfecto creado, miras el `EXPLAIN`, y descubres con horror que el motor sigue haciendo un *Full Table Scan*. ¿Por qué ocurre esto?

A menudo, la culpa la tiene la forma en que escribimos el `WHERE`.

## 10.4. SARGability: Escribir consultas que aprovechen los índices

**SARGable** es un acrónimo en inglés que significa *Search ARGument ABLE* (Capaz de usar argumentos de búsqueda). En términos sencillos, una consulta es SARGable cuando está escrita de tal manera que el motor de la base de datos **puede usar los índices existentes** para encontrar los datos. Si no es SARGable, el motor se verá obligado a ignorar el índice y escanear toda la tabla, sin importar cuántos índices hayas creado.

### La Regla de Oro: Deja la columna "desnuda"

El error más común que destruye la SARGability es **aplicar funciones o cálculos matemáticos directamente sobre la columna indexada** en la cláusula `WHERE`.

Imagina que tienes un diccionario ordenado alfabéticamente (tu índice) y te pido que busques todas las palabras que, *si les quitamos las dos primeras letras*, empiezan por "M". Tu índice alfabético ya no sirve de nada; tendrías que leer cada palabra del diccionario, hacer el cálculo mental (quitar las letras) y comprobar si coincide.

El motor de base de datos hace exactamente lo mismo. Si modificas la columna, el B-Tree ya no coincide con tu búsqueda.

### Ejemplos Clásicos: Lo Malo vs. Lo Bueno

Veamos los "asesinos de índices" más comunes y cómo reescribirlos para que sean SARGable.

#### 1. Funciones de Fecha

Este es, con diferencia, el error más frecuente. Quieres buscar todos los registros de un año o mes específico.

**❌ No SARGable (Ignora el índice):**
Al usar la función `YEAR()`, el motor debe evaluar cada fila de la tabla, extraer el año y luego compararlo.

```sql
SELECT id_pedido, total 
FROM pedidos 
WHERE YEAR(fecha_compra) = 2023;

```

**✅ SARGable (Usa el índice):**
Define un rango literal. Ahora el motor puede usar el B-Tree para saltar directamente al 1 de enero y detenerse antes del 1 de enero del año siguiente.

```sql
SELECT id_pedido, total 
FROM pedidos 
WHERE fecha_compra >= '2023-01-01' AND fecha_compra < '2024-01-01';

```

#### 2. Operaciones Matemáticas

Si haces cálculos sobre la columna indexada, despídete del índice. Debes aislar la columna a un lado del operador de comparación y pasar los cálculos al otro lado.

**❌ No SARGable:**

```sql
SELECT nombre, salario 
FROM empleados 
WHERE salario * 1.10 > 50000; -- Aplica el cálculo a cada fila

```

**✅ SARGable:**

```sql
SELECT nombre, salario 
FROM empleados 
WHERE salario > 50000 / 1.10; -- El motor resuelve la división una vez y usa el índice

```

#### 3. El uso del comodín `%` en `LIKE`

Como vimos en la sección 10.1, un índice B-Tree se lee de izquierda a derecha. Si pones un comodín al principio del texto, el motor no sabe por dónde empezar a buscar en el árbol.

**❌ No SARGable (Wildcard inicial):**
Buscar cualquier cosa que termine en "Gómez" obliga a escanear toda la tabla.

```sql
SELECT nombre, apellido 
FROM clientes 
WHERE apellido LIKE '%Gómez';

```

**✅ SARGable (Wildcard final):**
Al dar el prefijo exacto, el motor usa el índice para saltar a la letra "G", luego a la "o", etc.

```sql
SELECT nombre, apellido 
FROM clientes 
WHERE apellido LIKE 'Gómez%';

```

#### 4. Concatenación de columnas

Unir columnas para hacer una búsqueda es una mala práctica si esperas que se use el índice de alguna de ellas.

**❌ No SARGable:**

```sql
SELECT id_usuario 
FROM usuarios 
WHERE CONCAT(nombre, ' ', apellido) = 'Ana Silva';

```

**✅ SARGable:**

```sql
SELECT id_usuario 
FROM usuarios 
WHERE nombre = 'Ana' AND apellido = 'Silva';

```

### Resumen de SARGability

| Evita hacer esto (No SARGable) | Haz esto en su lugar (SARGable) |
| --- | --- |
| `WHERE LEFT(codigo, 3) = 'ABC'` | `WHERE codigo LIKE 'ABC%'` |
| `WHERE precio + 10 = 50` | `WHERE precio = 50 - 10` |
| `WHERE ISNULL(estado, 'Activo') = 'Activo'` | `WHERE estado = 'Activo' OR estado IS NULL` |
| `WHERE MONTH(fecha) = 1` | `WHERE fecha >= '2023-01-01' AND fecha < '2023-02-01'` |

Escribir consultas SARGable es la diferencia entre una aplicación que se "congela" cada vez que un usuario hace clic en buscar, y una que responde instantáneamente. Es el arte de dejar que los índices hagan el trabajo pesado para el que fueron diseñados.

¡Con esto concluimos el Capítulo 10 y la teoría fundamental sobre rendimiento e indexación!
