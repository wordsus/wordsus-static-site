Tras dominar la extracción y el análisis de información en los niveles anteriores, es momento de tomar las riendas de la base de datos. En este capítulo, exploraremos el **Data Manipulation Language (DML)**, el conjunto de instrucciones que nos permite alterar el estado real de nuestras tablas.

Aprenderás a poblar estructuras vacías mediante `INSERT`, a corregir o actualizar información crítica con `UPDATE` y a gestionar la depuración de registros con `DELETE` y `TRUNCATE`. Este capítulo marca la transición de ser un espectador de los datos a convertirte en un gestor activo, capaz de mantener la integridad y relevancia de la información en un entorno dinámico y profesional.

## 6.1. Inserción de registros (`INSERT INTO`)

Hasta este punto del libro, nos hemos enfocado exclusivamente en consultar y relacionar información que ya existía en nuestra base de datos (utilizando el lenguaje de consulta, DQL). Ahora, damos un paso fundamental: aprender a poblar esas tablas. Aquí es donde entra en juego el **Data Manipulation Language (DML)**, comenzando por la instrucción esencial para agregar nuevos datos: `INSERT INTO`.

La sentencia `INSERT INTO` permite añadir una o más filas nuevas a una tabla. Dependiendo de tus necesidades, existen diferentes formas de utilizarla.

### La sintaxis básica

La forma más común y segura de insertar un registro es especificando explícitamente tanto las columnas que vamos a poblar como los valores que les corresponden.

```sql
INSERT INTO nombre_tabla (columna1, columna2, columna3)
VALUES (valor1, valor2, valor3);

```

**Ejemplo práctico:**
Imagina que tenemos una tabla `Empleados`. Para dar de alta a una nueva empleada, la consulta sería:

```sql
INSERT INTO Empleados (id_empleado, nombre, apellido, departamento, salario)
VALUES (101, 'Ana', 'García', 'Ventas', 4500.50);

```

> **Nota importante:** El orden de los valores en la cláusula `VALUES` **debe coincidir exactamente** con el orden de las columnas listadas en los paréntesis iniciales. Además, los tipos de datos deben ser compatibles (recuerda lo visto en el Capítulo 1 sobre *Strings*, *Integers*, etc.).

### Inserción omitiendo columnas

No siempre es obligatorio listar todas las columnas de una tabla al hacer un `INSERT`. Puedes omitir columnas en los siguientes escenarios:

1. La columna permite valores nulos (conceptos del apartado 2.6).
2. La columna tiene un valor por defecto asignado (algo que profundizaremos en el Capítulo 8).
3. La columna es auto-incremental (como suele ocurrir con las Claves Primarias).

```sql
-- Suponiendo que 'id_empleado' es auto-incremental y 'salario' permite nulos
INSERT INTO Empleados (nombre, apellido, departamento)
VALUES ('Carlos', 'López', 'Marketing');

```

En este caso, el motor de base de datos generará automáticamente el `id_empleado` y dejará el `salario` como `NULL`.

### Insertando múltiples filas (Bulk Insert)

Si necesitas insertar varios registros al mismo tiempo, no es necesario escribir múltiples sentencias `INSERT INTO`. Puedes separar los conjuntos de valores utilizando comas. Esto no solo es más cómodo de leer, sino que es mucho más eficiente para el rendimiento del servidor.

```sql
INSERT INTO Empleados (nombre, apellido, departamento, salario)
VALUES 
    ('Lucía', 'Martínez', 'IT', 5200.00),
    ('Miguel', 'Fernández', 'Ventas', 4600.00),
    ('Sofía', 'Pérez', 'Recursos Humanos', 4100.00);

```

### Insertar datos a partir de otra tabla (`INSERT INTO ... SELECT`)

Una de las herramientas más potentes del DML es la capacidad de combinar la inserción con lo que aprendimos en el Capítulo 2. Puedes usar una sentencia `SELECT` para tomar datos de una tabla (o varias, usando *Joins*) e insertarlos directamente en otra.

En este caso, **no se utiliza la palabra clave `VALUES**`.

```sql
-- Copiando empleados del departamento de IT a una tabla histórica o de respaldo
INSERT INTO Empleados_IT_Backup (nombre, apellido, salario)
SELECT nombre, apellido, salario
FROM Empleados
WHERE departamento = 'IT';

```

Esta técnica es extremadamente útil para procesos de migración de datos, creación de tablas de archivo histórico, o para transformar y volcar datos masivamente.

## 6.2. Actualización de datos (`UPDATE`)

Una vez que los datos han sido insertados en nuestras tablas, es natural que con el tiempo necesiten modificaciones. Un empleado puede cambiar de departamento, el precio de un producto puede subir o una dirección de envío puede corregirse. Para alterar los datos que **ya existen** en la base de datos, utilizamos la sentencia `UPDATE`.

La instrucción `UPDATE` permite modificar los valores de una o más columnas en las filas que cumplan con una condición específica.

### La sintaxis básica

La estructura de una actualización requiere tres componentes fundamentales: la tabla que vamos a modificar, las columnas con sus nuevos valores (cláusula `SET`) y la condición que define qué filas se verán afectadas (cláusula `WHERE`).

```sql
UPDATE nombre_tabla
SET columna1 = nuevo_valor1, columna2 = nuevo_valor2
WHERE condicion;

```

### La regla de oro: El peligro de olvidar el `WHERE`

Antes de ver un ejemplo práctico, es fundamental hacer una advertencia crucial. Si ejecutas una sentencia `UPDATE` y omites la cláusula `WHERE`, **el motor de la base de datos aplicará el cambio a absolutamente todas las filas de la tabla**. Este es uno de los errores más temidos (y comunes) entre quienes comienzan a usar SQL.

Apóyate siempre en lo que aprendimos en el apartado 2.4 sobre el filtrado básico para asegurarte de afectar solo los registros deseados. Por lo general, se recomienda filtrar utilizando la Clave Primaria (Capítulo 5) para garantizar que actualizas la fila exacta.

**Ejemplo práctico:**
Imagina que el empleado con el `id_empleado` 101 ha sido transferido al departamento de Marketing.

```sql
UPDATE Empleados
SET departamento = 'Marketing'
WHERE id_empleado = 101;

```

### Actualización de múltiples columnas

Puedes modificar varias columnas en una sola consulta separándolas con comas en la cláusula `SET`.

Supongamos que el mismo empleado no solo cambió de departamento, sino que también recibió un ajuste salarial a 4800.00:

```sql
UPDATE Empleados
SET departamento = 'Marketing', salario = 4800.00
WHERE id_empleado = 101;

```

### Actualizaciones relativas (basadas en el valor actual)

Un uso muy potente del `UPDATE` es modificar un dato utilizando su valor existente sin necesidad de saber cuál es de antemano. Esto es ideal para aplicar incrementos, descuentos o cálculos matemáticos simples.

Si queremos aplicar un aumento del 10% al salario de todos los empleados que pertenecen al departamento de 'Ventas', la consulta sería:

```sql
UPDATE Empleados
SET salario = salario * 1.10
WHERE departamento = 'Ventas';

```

En este caso, SQL toma el valor actual de la columna `salario` para cada fila que cumple la condición, lo multiplica por 1.10 y sobrescribe el dato original con el nuevo resultado.

## 6.3. Eliminación de datos (`DELETE` vs `TRUNCATE`)

El último pilar fundamental de la manipulación de datos es la eliminación. Cuando un registro caduca, se vuelve irrelevante o se insertó por error, necesitamos limpiar nuestra base de datos. SQL nos ofrece dos comandos principales para vaciar datos de una tabla: `DELETE` y `TRUNCATE`. Aunque a simple vista parecen hacer lo mismo, su funcionamiento interno y sus casos de uso son radicalmente distintos.

### El comando `DELETE`: Precisión quirúrgica

`DELETE` es un comando DML (Data Manipulation Language) que elimina filas de una tabla **una por una**. Su mayor ventaja es que permite utilizar la cláusula `WHERE`, lo que te da un control total sobre qué registros exactos deseas borrar.

```sql
DELETE FROM nombre_tabla
WHERE condicion;

```

**Ejemplo práctico:**
Si un empleado renuncia y necesitamos eliminar su registro (suponiendo que no mantengamos un histórico), ejecutaríamos:

```sql
DELETE FROM Empleados
WHERE id_empleado = 101;

```

> **La misma regla de oro que en `UPDATE`:** Si ejecutas un `DELETE FROM Empleados` y olvidas la cláusula `WHERE`, borrarás **todas** las filas de la tabla. Al ser una operación fila por fila, si la tabla es gigantesca, este proceso será lento y consumirá muchos recursos del servidor.

### El comando `TRUNCATE`: El botón de reinicio

A diferencia de `DELETE`, `TRUNCATE` no es un comando DML, sino que técnicamente pertenece al **DDL** (Data Definition Language, que veremos a fondo en el Capítulo 8). `TRUNCATE` no borra los datos fila por fila, sino que directamente vacía la tabla completa de un solo golpe liberando las páginas de datos en el disco.

```sql
TRUNCATE TABLE Empleados;

```

**Características clave de `TRUNCATE`:**

1. **No admite la cláusula `WHERE`:** Es todo o nada. No puedes truncar solo una parte de la tabla.
2. **Es extremadamente rápido:** Al no registrar la eliminación de cada fila individual en el registro de transacciones, es casi instantáneo, incluso en tablas con millones de registros.
3. **Resetea los contadores:** Si tu tabla tiene una columna auto-incremental (como un ID que suma de 1 en 1), `TRUNCATE` reiniciará ese contador a su valor inicial. `DELETE`, por el contrario, mantiene el contador donde estaba.

### Comparativa: ¿Cuándo usar cuál?

Para resumir y evitar confusiones, aquí tienes las diferencias clave entre ambos comandos. Algunos de estos conceptos, como las transacciones y los disparadores, los profundizaremos en la Parte IV del libro (Capítulos 11 y 12).

| Característica | `DELETE` | `TRUNCATE` |
| --- | --- | --- |
| **Tipo de lenguaje** | DML (Manipulación) | DDL (Definición) |
| **Uso de `WHERE**` | Sí (permite borrado parcial) | No (borra todo) |
| **Velocidad** | Más lento (borra fila por fila) | Muy rápido (libera páginas de datos) |
| **Auto-incrementales** | Continúan desde el último valor | Se reinician al valor por defecto |
| **Disparadores (Triggers)** | Activa los triggers de borrado | No activa los triggers |
| **Espacio en disco** | No siempre libera el espacio inmediatamente | Libera el espacio asignado a la tabla inmediatamente |

**Conclusión práctica:** Usa `DELETE` cuando necesites borrar registros específicos de forma controlada. Usa `TRUNCATE` cuando necesites vaciar completamente una tabla temporal o reiniciar un entorno de pruebas de forma rápida.
