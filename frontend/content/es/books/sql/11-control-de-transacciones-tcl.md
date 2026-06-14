En el mundo real, los datos no viven en un vacío. Una sola acción de un usuario, como comprar un libro o transferir dinero, suele desencadenar múltiples cambios en la base de datos que deben ocurrir en conjunto para tener sentido. ¿Qué pasa si el sistema falla a mitad de una operación? ¿Cómo evitamos que dos usuarios modifiquen el mismo registro al mismo tiempo?

En este capítulo, aprenderás a dominar el **Lenguaje de Control de Transacciones (TCL)**. Exploraremos el blindaje **ACID** que garantiza la integridad de la información, el uso de comandos como `COMMIT` y `ROLLBACK` para gestionar el éxito o fracaso de tus consultas, y los niveles de aislamiento para controlar el tráfico de datos.

## 11.1. Propiedades ACID

Hasta este punto del libro, hemos aprendido a insertar, actualizar y eliminar datos utilizando comandos DML (Capítulo 6). Sin embargo, en el mundo real, las operaciones en una base de datos rara vez ocurren de forma aislada. A menudo, necesitamos agrupar varias consultas para que se ejecuten juntas como una sola **unidad lógica de trabajo**. A esta unidad la llamamos **transacción**.

Para garantizar que los datos mantengan su integridad y fiabilidad, especialmente cuando ocurren errores del sistema, fallos de red o accesos simultáneos por múltiples usuarios, los Sistemas de Gestión de Bases de Datos Relacionales (RDBMS) modernos se apoyan en cuatro propiedades fundamentales conocidas por el acrónimo **ACID**:

---

### 1. A - Atomicidad (Atomicity)

La atomicidad es el principio de **"todo o nada"**. Significa que todas las operaciones dentro de una transacción se completan con éxito de manera conjunta, o ninguna de ellas se aplica. No puede existir un estado intermedio o una ejecución parcial.

**El ejemplo clásico: Una transferencia bancaria**
Imagina que queremos transferir $100 de la cuenta de Ana a la cuenta de Bruno. Esta operación requiere dos pasos: descontar el dinero a Ana y sumárselo a Bruno. Si el servidor se apaga justo después del primer paso, el dinero desaparecería. La atomicidad previene esto.

```sql
-- Inicio de la unidad lógica de trabajo
BEGIN TRANSACTION;

-- Paso 1: Restar $100 a la cuenta de Ana
UPDATE Cuentas 
SET saldo = saldo - 100 
WHERE titular = 'Ana';

-- Paso 2: Sumar $100 a la cuenta de Bruno
UPDATE Cuentas 
SET saldo = saldo + 100 
WHERE titular = 'Bruno';

-- Si ambos pasos tienen éxito, se guardan permanentemente.
-- Si el Paso 2 falla, la transacción entera se cancela y el saldo de Ana regresa a su estado original.

```

*(Nota: Profundizaremos en cómo confirmar o revertir estos pasos exactos en la sección 11.2 con `COMMIT` y `ROLLBACK`).*

### 2. C - Consistencia (Consistency)

La consistencia asegura que una transacción solo puede llevar a la base de datos de un **estado válido a otro estado válido**.

Esto significa que cualquier dato modificado debe respetar todas las reglas, restricciones (*constraints*) y desencadenadores (*triggers*) definidos en el esquema. Como vimos en el Capítulo 8, si una tabla tiene una restricción `CHECK (saldo >= 0)` y una transacción intenta dejar el saldo en números negativos, la propiedad de consistencia obligará a la base de datos a rechazar la operación entera para no violar las reglas de negocio.

### 3. I - Aislamiento (Isolation)

En sistemas de producción, miles de transacciones se ejecutan al mismo tiempo (concurrencia). El aislamiento asegura que las transacciones que se están ejecutando simultáneamente **no interfieran entre sí**.

Desde la perspectiva de cada transacción en curso, pareciera que es la única ejecutándose en el servidor en ese momento. Por ejemplo, si una transacción está calculando el balance total de un cliente mientras otra está agregando una nueva compra, el aislamiento define qué datos ve cada una en ese milisegundo preciso.

Dado que aislar absolutamente todas las operaciones puede afectar el rendimiento (tratado en el Capítulo 10), SQL ofrece diferentes "grados" de separación. Exploraremos estos detalles técnicos exhaustivamente en la sección **11.3. Niveles de aislamiento**.

### 4. D - Durabilidad (Durability)

Una vez que una transacción se completa con éxito y es confirmada, **sus efectos son permanentes**, incluso si hay un fallo catastrófico en el sistema (como un corte de energía o un error del sistema operativo) inmediatamente después.

Para lograr esto, los RDBMS utilizan archivos de registro transaccionales (*transaction logs*). Antes de darle al usuario el mensaje de "éxito", el sistema escribe en el disco duro (no solo en la memoria RAM) el registro de lo que acaba de hacer. Gracias a la durabilidad, si el servidor colapsa, al reiniciarse leerá el registro y restaurará los datos confirmados.

## 11.2. `COMMIT`, `ROLLBACK` y `SAVEPOINT`

Ahora que comprendemos la teoría detrás de las propiedades ACID (sección 11.1), es momento de llevarlas a la práctica. Para controlar estas "unidades lógicas de trabajo", SQL utiliza un conjunto de comandos conocido como **TCL** (*Transaction Control Language* o Lenguaje de Control de Transacciones).

Por defecto, la mayoría de los motores de bases de datos operan en un modo llamado **Autocommit** (Autoconfirmación). Esto significa que cada instrucción `INSERT`, `UPDATE` o `DELETE` que has escrito hasta ahora en el Capítulo 6 se ha tratado como una transacción individual que se guarda automáticamente.

Para agrupar múltiples operaciones, primero debemos desactivar este comportamiento temporalmente iniciando una transacción explícita (generalmente con `BEGIN TRANSACTION` o `START TRANSACTION`, dependiendo del motor). Una vez iniciada, controlamos su destino final con tres comandos clave:

---

### 1. `COMMIT`: El sello de aprobación

El comando `COMMIT` le indica a la base de datos que la transacción ha finalizado con éxito y que todos los cambios realizados deben guardarse de forma **permanente** (garantizando la Durabilidad). Una vez que ejecutas un `COMMIT`, los cambios se vuelven visibles para el resto de los usuarios del sistema y ya no hay vuelta atrás.

### 2. `ROLLBACK`: El botón de pánico

Si durante la ejecución de tu transacción ocurre un error (por ejemplo, una de las consultas falla, se viola una restricción o tu propia lógica de negocio detecta un problema), debes usar `ROLLBACK`. Este comando cancela la transacción completa y deshace cualquier modificación realizada desde el `BEGIN`. La base de datos regresa exactamente al estado en el que estaba antes de empezar (garantizando la Atomicidad).

### 3. `SAVEPOINT`: El punto de control

A veces, no quieres deshacer *toda* la transacción si ocurre un error menor. Un `SAVEPOINT` te permite crear un marcador o "punto de guardado" dentro de una transacción en curso. Si algo sale mal más adelante, puedes hacer un `ROLLBACK` específicamente hasta ese marcador, conservando el progreso realizado antes de él, sin cancelar la transacción entera.

---

### Ejemplo práctico: Gestión de un carrito de compras

Veamos cómo interactúan estos tres comandos en un escenario real donde registramos una compra y aplicamos un descuento opcional.

```sql
-- 1. Iniciamos la transacción
BEGIN TRANSACTION;

-- 2. Insertamos la orden de compra
INSERT INTO Ordenes (id_orden, cliente_id, fecha) 
VALUES (1050, 42, CURRENT_DATE);

-- 3. Actualizamos el inventario del producto vendido
UPDATE Productos 
SET stock = stock - 1 
WHERE id_producto = 7;

-- 4. Creamos un punto de guardado porque los pasos críticos ya pasaron
SAVEPOINT CompraBasica;

-- 5. Intentamos aplicar un cupón de descuento complejo (que podría fallar)
UPDATE Ordenes 
SET total = total * 0.80 
WHERE id_orden = 1050 AND cupon = 'VIP20';

-- Imaginemos que la lógica de nuestra aplicación detecta que el cupón estaba vencido.
-- En lugar de cancelar toda la compra (y perder la venta), revertimos solo el descuento:

-- 6. Deshacemos hasta el punto de guardado
ROLLBACK TO CompraBasica;

-- La orden sigue creada y el stock sigue descontado.
-- 7. Guardamos los cambios definitivamente
COMMIT;

```

> **Nota importante:** Los comandos DDL (como `CREATE TABLE` o `ALTER TABLE` vistos en el Capítulo 8) en algunos motores como Oracle o MySQL provocan un `COMMIT` implícito automático, por lo que no pueden revertirse con un `ROLLBACK`. PostgreSQL y SQL Server, sin embargo, sí permiten revertir operaciones DDL.

## 11.3. Niveles de aislamiento (Isolation Levels)

Retomando la propiedad de Aislamiento (Isolation) que vimos en la sección 11.1, sabemos que en una base de datos real hay múltiples usuarios ejecutando transacciones de forma simultánea. Si el motor de la base de datos aísla completamente cada transacción (ejecutándolas una por una), no habría errores, pero el rendimiento caería drásticamente (un tema crítico que abordamos en el Capítulo 10).

Para equilibrar **consistencia** y **rendimiento**, el estándar SQL define diferentes "Niveles de Aislamiento". Antes de conocerlos, debemos entender los tres problemas principales (fenómenos de lectura) que ocurren cuando las transacciones se cruzan:

1. **Lectura sucia (Dirty Read):** Una transacción lee datos que han sido modificados por otra transacción que aún no ha ejecutado un `COMMIT`. Si esa segunda transacción hace un `ROLLBACK`, la primera habrá trabajado con datos que técnicamente nunca existieron.
2. **Lectura no repetible (Non-Repeatable Read):** Una transacción lee la misma fila dos veces. Entre ambas lecturas, otra transacción actualiza (`UPDATE`) esa fila y hace `COMMIT`. La primera transacción obtiene resultados distintos para la misma fila.
3. **Lectura fantasma (Phantom Read):** Una transacción consulta un conjunto de filas basándose en una condición (ej. `WHERE saldo > 100`). Otra transacción inserta (`INSERT`) o elimina (`DELETE`) filas que cumplen esa condición y hace `COMMIT`. Al repetir la consulta, la primera transacción ve filas "fantasma" aparecer o desaparecer.

Para mitigar estos fenómenos, podemos configurar nuestra transacción en uno de los **cuatro niveles de aislamiento estándar**, ordenados de menor a mayor rigurosidad:

### 1. READ UNCOMMITTED (Lectura no confirmada)

Es el nivel más bajo y rápido. Permite que ocurran los tres fenómenos, incluidas las lecturas sucias. Es útil solo en escenarios donde la velocidad extrema es más importante que la precisión exacta de los datos (por ejemplo, calcular un promedio de visualizaciones de un video en tiempo real).

### 2. READ COMMITTED (Lectura confirmada)

Es el nivel por defecto en motores como PostgreSQL y SQL Server. Garantiza que solo leerás datos que ya han sido confirmados (`COMMIT`) por otras transacciones, evitando las **lecturas sucias**. Sin embargo, aún pueden ocurrir lecturas no repetibles y lecturas fantasma.

### 3. REPEATABLE READ (Lectura repetible)

Es el nivel por defecto en MySQL (InnoDB). Asegura que si lees una fila, cualquier lectura subsecuente de esa *misma* fila dentro de tu transacción devolverá exactamente los mismos datos, bloqueándola para que otras transacciones no puedan modificarla. Evita las lecturas sucias y no repetibles, pero aún es vulnerable a las **lecturas fantasma** (pueden aparecer nuevas filas en consultas de rangos).

### 4. SERIALIZABLE (Serializable)

El nivel más estricto y seguro, pero el más lento. El motor de la base de datos adquiere bloqueos severos para asegurar que el resultado de ejecutar las transacciones concurrentemente sea idéntico a si se ejecutaran secuencialmente (una tras otra). Evita los tres fenómenos por completo. Se usa en operaciones financieras críticas donde un error de cálculo es inaceptable.

---

### ¿Cómo configurar el nivel de aislamiento?

Puedes definir el nivel de aislamiento justo antes de iniciar tu transacción o al momento de declararla. La sintaxis exacta puede variar ligeramente entre motores, pero el estándar general es:

```sql
-- Configuramos el nivel de aislamiento a Serializable para máxima seguridad
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN TRANSACTION;

-- Consultamos el total de fondos
SELECT SUM(saldo) FROM Cuentas WHERE sucursal = 'Centro';

-- Gracias al nivel Serializable, ninguna otra transacción podrá insertar,
-- actualizar o borrar cuentas de la sucursal 'Centro' hasta que terminemos.

-- Hacemos nuestro cuadre de caja...
-- ...

COMMIT;

```

> **Consejo de Maestro:** Elegir el nivel de aislamiento adecuado es un arte. Por regla general, mantén el nivel por defecto de tu RDBMS (`READ COMMITTED` o `REPEATABLE READ`) a menos que tengas un requerimiento de negocio muy específico. Usar `SERIALIZABLE` por defecto causará bloqueos constantes y frustrará a los usuarios de tu aplicación.

Con esto concluimos el **Capítulo 11**. Has dominado cómo proteger la integridad de tus datos mediante transacciones, propiedades ACID y niveles de aislamiento.
