Hasta este punto, hemos tratado a la base de datos como un almacén de información consultado de forma externa. Sin embargo, para alcanzar el nivel de **Maestro**, es vital entender que el servidor SQL es un entorno de computación capaz de ejecutar procesos complejos por sí mismo.

En este capítulo, aprenderás a encapsular reglas de negocio mediante **Procedimientos Almacenados**, a crear herramientas personalizadas con **UDFs** y a automatizar respuestas ante cambios de datos mediante **Triggers**. Al trasladar esta lógica al servidor, no solo optimizarás el rendimiento reduciendo el tráfico de red, sino que dotarás a tu base de datos de una capa de inteligencia, seguridad y consistencia sin precedentes.

## 12.1. Procedimientos Almacenados (Stored Procedures)

A lo largo de los capítulos anteriores, hemos enviado instrucciones a la base de datos de manera individual: una consulta para extraer datos, un comando para actualizarlos o un bloque para gestionar una transacción. Sin embargo, en el desarrollo de aplicaciones reales, es común que ciertas secuencias de operaciones SQL se repitan constantemente o requieran lógica condicional compleja. Aquí es donde entran en juego los **Procedimientos Almacenados**.

Un Procedimiento Almacenado (o *Stored Procedure* en inglés) es un conjunto de instrucciones SQL precompiladas y guardadas directamente en el servidor de la base de datos bajo un nombre específico. Puedes pensar en ellos como "mini-programas" o funciones dentro de tu motor de base de datos que puedes ejecutar con una sola llamada.

### La Anatomía de un Procedimiento Almacenado

Aunque la sintaxis exacta varía ligeramente dependiendo del Sistema Gestor de Bases de Datos (RDBMS) que utilices (T-SQL en SQL Server, PL/pgSQL en PostgreSQL, o el dialecto de MySQL), la estructura lógica es universal. Un procedimiento típico incluye:

1. **Declaración:** El nombre del procedimiento.
2. **Parámetros:** Variables de entrada (para recibir datos) y/o de salida (para devolver datos).
3. **Cuerpo:** El bloque de código (`BEGIN ... END`) que contiene la lógica SQL (DQL, DML y TCL).

### Ejemplo 1: Un Procedimiento Básico con Parámetros de Entrada

Imaginemos que necesitamos actualizar frecuentemente el salario de los empleados en un departamento específico. En lugar de escribir el `UPDATE` cada vez, podemos encapsularlo.

*Nota: Este ejemplo utiliza una sintaxis estándar similar a SQL Server (T-SQL) por su legibilidad, pero el concepto aplica a cualquier motor.*

```sql
CREATE PROCEDURE ActualizarSalarioDepartamento
    @DepartamentoID INT,
    @PorcentajeAumento DECIMAL(5,2)
AS
BEGIN
    -- Actualizamos el salario multiplicándolo por el porcentaje de aumento
    UPDATE Empleados
    SET Salario = Salario + (Salario * (@PorcentajeAumento / 100))
    WHERE DepartamentoID = @DepartamentoID;
    
    -- Devolvemos un resumen de los empleados afectados
    SELECT EmpleadoID, Nombre, Salario AS NuevoSalario
    FROM Empleados
    WHERE DepartamentoID = @DepartamentoID;
END;

```

Para ejecutar este bloque de código, el cliente (ya sea una aplicación en Python, Java, o tú mismo desde la consola SQL) solo necesita llamar al procedimiento y pasarle los argumentos:

```sql
-- Ejecutamos el procedimiento para el departamento 3 con un 10% de aumento
EXECUTE ActualizarSalarioDepartamento @DepartamentoID = 3, @PorcentajeAumento = 10.00;

```

*(En MySQL o PostgreSQL, la llamada suele hacerse con la instrucción `CALL NombreProcedimiento(...);`)*

### Ejemplo 2: Lógica Transaccional Compleja

Como vimos en el **Capítulo 11**, garantizar las propiedades ACID es vital. Los procedimientos almacenados son el ecosistema perfecto para encapsular la lógica transaccional, asegurando que si un paso falla, se revierta todo el proceso de manera controlada.

Veamos un ejemplo clásico: transferir fondos entre dos cuentas bancarias.

```sql
CREATE PROCEDURE TransferirFondos
    @CuentaOrigen INT,
    @CuentaDestino INT,
    @Monto DECIMAL(10,2)
AS
BEGIN
    -- Iniciamos el bloque transaccional
    BEGIN TRANSACTION;

    BEGIN TRY
        -- 1. Descontar de la cuenta origen
        UPDATE Cuentas 
        SET Saldo = Saldo - @Monto 
        WHERE CuentaID = @CuentaOrigen;

        -- 2. Sumar a la cuenta destino
        UPDATE Cuentas 
        SET Saldo = Saldo + @Monto 
        WHERE CuentaID = @CuentaDestino;

        -- 3. Registrar el movimiento en un historial
        INSERT INTO HistorialTransacciones (Origen, Destino, Monto, Fecha)
        VALUES (@CuentaOrigen, @CuentaDestino, @Monto, CURRENT_TIMESTAMP);

        -- Si todo sale bien, confirmamos los cambios
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Si ocurre cualquier error en los pasos anteriores, revertimos
        ROLLBACK TRANSACTION;
        -- Aquí podríamos registrar el error o lanzar una alerta
        PRINT 'Error en la transacción. Se han revertido los cambios.';
    END CATCH
END;

```

### ¿Por qué utilizar Procedimientos Almacenados?

Delegar lógica al servidor mediante procedimientos almacenados ofrece ventajas estructurales importantes:

* **Reducción del tráfico de red:** En lugar de enviar cientos de líneas de código SQL desde tu aplicación al servidor de base de datos a través de la red, solo envías el nombre del procedimiento y sus parámetros.
* **Mantenibilidad y Modularidad:** Si las reglas de negocio cambian (por ejemplo, el cálculo de un impuesto), solo actualizas el procedimiento en la base de datos. No necesitas recompilar ni redesplegar tus aplicaciones web o móviles que lo consumen.
* **Seguridad:** Puedes restringir el acceso directo de los usuarios a las tablas (`INSERT`, `UPDATE`, `DELETE`) y darles permisos únicamente para ejecutar ciertos procedimientos. Esto previene modificaciones no autorizadas y mitiga drásticamente ataques de *SQL Injection*.
* **Rendimiento:** Al ser creados, muchos RDBMS compilan y guardan el plan de ejecución del procedimiento en caché (relacionado con lo que vimos en el Capítulo 10). Las ejecuciones subsecuentes son más rápidas porque el motor ya sabe cómo procesar las consultas óptimamente.

## 12.2. Funciones definidas por el usuario (UDFs)

En el **Capítulo 4** exploramos las funciones integradas que los motores de bases de datos ya traen consigo, como `SUM()`, `COUNT()` o funciones para manipular textos y fechas. Pero, ¿qué sucede cuando la lógica de tu negocio requiere un cálculo específico que usarás en múltiples consultas y no existe una función nativa para ello? La solución es crear tus propias **Funciones Definidas por el Usuario** (UDFs, por sus siglas en inglés).

Una UDF es una rutina de código SQL que acepta parámetros, ejecuta una lógica determinada y **siempre devuelve un resultado**.

### Diferencias clave con los Procedimientos Almacenados

Es muy común confundir las UDFs con los procedimientos almacenados que vimos en la sección **12.1**, ya que ambos encapsulan código. Sin embargo, tienen propósitos y reglas muy distintas:

1. **Retorno obligatorio:** Un procedimiento almacenado puede devolver datos o no (puede simplemente actualizar una tabla). Una función **siempre** debe devolver un valor o una tabla.
2. **Uso en consultas:** Esta es la diferencia más poderosa. Puedes usar una UDF directamente dentro de un `SELECT`, un `WHERE` o un `JOIN`. Los procedimientos almacenados no pueden invocarse dentro de estas cláusulas (requieren la instrucción `EXECUTE` o `CALL`).
3. **Prohibido alterar el estado:** Las funciones están diseñadas para *leer* y *calcular*, no para modificar. Dentro de una UDF no puedes usar `INSERT`, `UPDATE` o `DELETE` sobre tablas permanentes de la base de datos.
4. **Sin control de transacciones:** No puedes abrir (`BEGIN TRANSACTION`) ni cerrar (`COMMIT` / `ROLLBACK`) transacciones dentro de una función.

### Tipos de Funciones Definidas por el Usuario

Dependiendo de lo que devuelvan, las UDFs se dividen principalmente en dos categorías:

#### 1. Funciones Escalares

Devuelven un único valor (un número, un texto, una fecha). Son ideales para encapsular fórmulas o cálculos matemáticos complejos que necesitas aplicar fila por fila.

**Ejemplo:** Imagina que tu sistema necesita calcular frecuentemente el precio final de un producto aplicando un impuesto variable según la categoría.

```sql
CREATE FUNCTION CalcularPrecioConImpuesto
(
    @PrecioBase DECIMAL(10,2),
    @TasaImpuesto DECIMAL(5,2)
)
RETURNS DECIMAL(10,2) -- Especificamos el tipo de dato que devolverá
AS
BEGIN
    DECLARE @PrecioFinal DECIMAL(10,2);
    
    -- Calculamos el valor
    SET @PrecioFinal = @PrecioBase + (@PrecioBase * (@TasaImpuesto / 100));
    
    -- Devolvemos el resultado
    RETURN @PrecioFinal;
END;

```

Una vez creada, puedes usarla en tus consultas como si fuera una función nativa:

```sql
SELECT 
    NombreProducto, 
    PrecioBase, 
    dbo.CalcularPrecioConImpuesto(PrecioBase, 21.00) AS PrecioConIVA
FROM Productos
WHERE dbo.CalcularPrecioConImpuesto(PrecioBase, 21.00) < 500.00;

```

#### 2. Funciones con Valores de Tabla (Table-Valued Functions - TVFs)

En lugar de devolver un solo valor, estas funciones devuelven un conjunto de resultados (una tabla completa). Puedes pensar en ellas como **Vistas parametrizadas** (vimos las Vistas regulares en el **Capítulo 8**).

Son extremadamente útiles cuando necesitas filtrar un conjunto de datos complejo basándote en variables dinámicas.

**Ejemplo:** Una función que devuelve todos los empleados de un departamento específico que ganan más de un monto determinado.

```sql
CREATE FUNCTION EmpleadosPorIngreso
(
    @DepartamentoID INT,
    @SalarioMinimo DECIMAL(10,2)
)
RETURNS TABLE
AS
RETURN
(
    -- La consulta que genera la tabla resultante
    SELECT EmpleadoID, Nombre, Cargo, Salario
    FROM Empleados
    WHERE DepartamentoID = @DepartamentoID 
      AND Salario >= @SalarioMinimo
);

```

Para consumir esta función, la tratas exactamente igual que a una tabla en tu cláusula `FROM`:

```sql
SELECT Nombre, Cargo
FROM dbo.EmpleadosPorIngreso(3, 2500.00)
ORDER BY Salario DESC;

```

### Una advertencia sobre el Rendimiento

Relacionando este tema con el **Capítulo 10 (Rendimiento e Indexación)**, es crucial usar las funciones escalares con precaución.

Cuando colocas una función escalar en una cláusula `SELECT` o `WHERE` sobre una tabla con un millón de registros, el motor de la base de datos podría verse obligado a invocar esa función un millón de veces, fila por fila (un problema conocido como *RBAR: Row By Agonizing Row*). En conjuntos de datos masivos, esto puede degradar el rendimiento severamente. Las Funciones con Valores de Tabla (TVFs), en cambio, suelen ser optimizadas por el motor de base de datos de manera mucho más eficiente, integrándolas en el plan de ejecución general.

## 12.3. Disparadores (Triggers)

Hasta ahora, en este capítulo hemos visto cómo ejecutar bloques de código bajo demanda (Procedimientos Almacenados) y cómo integrarlos dentro de nuestras consultas (Funciones Definidas por el Usuario). Pero, ¿qué sucede si necesitamos que una acción se ejecute *automáticamente* en respuesta a un cambio en los datos, sin que el usuario o la aplicación tengan que invocarla? Ese es exactamente el trabajo de los **Disparadores** o *Triggers*.

Un Trigger es un tipo especial de procedimiento almacenado que se ejecuta (o "dispara") de forma automática cuando ocurre un evento específico en la base de datos. En el contexto del desarrollo de aplicaciones, los más comunes son los **Triggers DML**, que reaccionan a las operaciones de manipulación de datos que estudiamos en el **Capítulo 6**: `INSERT`, `UPDATE` y `DELETE`.

### Momentos de Ejecución (Timing)

Los triggers no solo responden a un evento, sino que se configuran para actuar en un momento preciso relativo a ese evento. Generalmente, existen dos momentos principales:

1. **Triggers `AFTER` (o `FOR`):** Se ejecutan *después* de que la instrucción DML (y cualquier restricción de la tabla, como vimos en el **Capítulo 8**) se haya completado con éxito. Son ideales para tareas de auditoría, registro de historiales o actualización de tablas de resumen.
2. **Triggers `BEFORE` (o `INSTEAD OF`):** Se ejecutan *antes* de que la acción modifique los datos reales en la tabla, o incluso *en lugar* de la acción original. Son perfectos para realizar validaciones de negocio complejas que no pueden resolverse con simples restricciones (`CHECK`), o para redirigir inserciones en Vistas hacia sus tablas base.

### Las Tablas "Mágicas": El Contexto del Trigger

Para que un trigger sea útil, necesita saber qué datos están cambiando. El motor de la base de datos proporciona acceso temporal a los registros afectados mediante tablas virtuales especiales (que solo existen durante la ejecución del trigger).

Dependiendo del motor (SQL Server usa `INSERTED` y `DELETED`, mientras que MySQL y PostgreSQL usan los prefijos `NEW` y `OLD`), la lógica es la misma:

* **En un `INSERT`:** La tabla virtual nueva (`INSERTED` o `NEW`) contiene las filas que se están agregando.
* **En un `DELETE`:** La tabla virtual vieja (`DELETED` o `OLD`) contiene las filas que se están borrando.
* **En un `UPDATE`:** ¡Tienes ambas! La tabla vieja contiene los valores originales y la nueva contiene los valores actualizados.

### Ejemplo: Un Sistema de Auditoría Automático

Imaginemos que necesitamos mantener un registro estricto cada vez que el salario de un empleado es modificado, guardando el valor anterior, el nuevo y la fecha del cambio. Un trigger `AFTER UPDATE` es la herramienta perfecta.

*Nota: Este ejemplo utiliza sintaxis de SQL Server (T-SQL) con las tablas `INSERTED` y `DELETED`.*

```sql
CREATE TRIGGER trg_AuditarCambioSalario
ON Empleados
AFTER UPDATE
AS
BEGIN
    -- La función UPDATE() verifica si la columna específica fue parte de la sentencia DML
    IF UPDATE(Salario)
    BEGIN
        -- Insertamos el registro en nuestra tabla de auditoría uniendo las tablas virtuales
        INSERT INTO AuditoriaSalarios (EmpleadoID, SalarioAnterior, SalarioNuevo, FechaModificacion)
        SELECT 
            i.EmpleadoID,
            d.Salario AS SalarioAnterior, -- El valor antes del UPDATE (de la tabla DELETED)
            i.Salario AS SalarioNuevo,    -- El valor después del UPDATE (de la tabla INSERTED)
            CURRENT_TIMESTAMP
        FROM inserted i
        INNER JOIN deleted d ON i.EmpleadoID = d.EmpleadoID
        WHERE i.Salario <> d.Salario; -- Aseguramos que el monto realmente cambió
    END
END;

```

Ahora, si ejecutamos un simple `UPDATE Empleados SET Salario = 5000 WHERE EmpleadoID = 10;`, el motor actualizará la tabla `Empleados` e, inmediatamente después y de forma invisible para el usuario, ejecutará el trigger insertando el historial en `AuditoriaSalarios`.

### El Lado Oscuro de los Triggers: Precauciones

Aunque los triggers parecen la solución mágica para automatizar reglas de negocio, deben usarse con extrema precaución:

* **Son invisibles:** Para un desarrollador que está depurando un sistema, un `UPDATE` que tarda 5 segundos puede ser un misterio hasta que descubre que hay tres triggers ejecutándose en cascada por detrás.
* **Impacto en Transacciones:** Un trigger se ejecuta dentro de la misma transacción (visto en el **Capítulo 11**) que la instrucción DML que lo disparó. Si el trigger falla, toda la transacción falla y hace un `ROLLBACK`. Además, si el trigger hace operaciones pesadas, mantendrá bloqueada la tabla original durante más tiempo, afectando el rendimiento y la concurrencia.
* **Efecto Cascada:** Un trigger en la Tabla A podría hacer un `UPDATE` en la Tabla B, lo que a su vez dispara otro trigger en la Tabla B, y así sucesivamente. Esto puede llevar a errores de límite de anidamiento y lógicas muy difíciles de mantener.

La regla de oro para los triggers es: **mantenlos simples, rápidos y úsalos solo cuando no haya una mejor alternativa** (como hacerlo directamente desde el Procedimiento Almacenado o la capa de la aplicación).

## Epílogo: El camino del Maestro

Con el dominio de la lógica en el servidor, has cerrado el círculo de tu aprendizaje. Desde la primera consulta `SELECT` hasta la automatización con `Triggers`, has transformado tu relación con los datos: ya no solo los extraes, ahora diseñas ecosistemas inteligentes y resilientes.

"El libro de SQL: De Cero a Maestro" termina aquí, pero tu práctica apenas comienza. Los datos son el lenguaje del mundo moderno y tú ya hablas su dialecto con fluidez. Sigue optimizando, sigue construyendo y, sobre todo, sigue cuestionando cada plan de ejecución. El servidor está listo para tus órdenes. ¡Mucho éxito en tu carrera como experto en SQL!