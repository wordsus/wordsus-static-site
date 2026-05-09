Este capítulo sienta las bases del mundo de los datos. Antes de escribir código, es crucial entender el entorno donde operamos: el **RDBMS**, el software que actúa como motor y guardián de la información. Exploraremos el **modelo relacional**, una estructura lógica donde los datos se organizan en **tablas**, **columnas** y **filas** para garantizar orden y eficiencia. También aprenderás a jerarquizar tu base de datos mediante **esquemas** y a definir la naturaleza de la información usando **tipos de datos** (textos, números y fechas). Dominar estos conceptos es el primer paso para convertirte en un maestro de SQL, transformando datos brutos en activos valiosos.

## 1.1. ¿Qué es un RDBMS?

Para empezar nuestro viaje hacia el dominio de SQL, primero debemos entender dónde "vive" y opera este lenguaje. Aquí es donde entra en juego el acrónimo **RDBMS**, que significa *Relational Database Management System* (en español: Sistema de Gestión de Bases de Datos Relacionales).

Para entenderlo fácilmente, dividamos el concepto en dos partes:

1. **La Base de Datos (DB):** Es la colección de datos en sí misma. Imagina una inmensa biblioteca digital donde se guarda la información de tu empresa: clientes, inventario, ventas, etc.
2. **El Sistema de Gestión (DBMS):** Es el software especializado que actúa como intermediario entre tú (o tus aplicaciones) y esos datos. Es el bibliotecario experto.

Un **RDBMS** es, por lo tanto, el software que te permite crear, leer, actualizar y administrar una base de datos estructurada de forma *relacional* (un concepto en el que profundizaremos en la siguiente sección). El RDBMS se encarga del trabajo pesado: gestionar el almacenamiento en el disco duro, asegurar que múltiples usuarios puedan acceder a los datos al mismo tiempo sin causar conflictos, y mantener la integridad de la información.

### El motor y el lenguaje

Es muy común confundir el sistema con el lenguaje. **SQL** (Structured Query Language) no es una base de datos; es el idioma que utilizamos para darle instrucciones al RDBMS.

Imagina que el RDBMS es el motor de un coche. No necesitas saber exactamente cómo inyecta el combustible o cómo giran los engranajes internos; solo necesitas saber cómo usar los pedales y el volante. SQL es ese volante.

Por ejemplo, si necesitas saber el correo electrónico de tus usuarios mayores de edad, no tienes que programar un algoritmo de búsqueda en el disco duro. Simplemente le pasas esta instrucción en SQL al RDBMS:

```sql
-- Le pedimos al RDBMS que busque y nos entregue esta información específica
SELECT nombre, email
FROM usuarios
WHERE edad >= 18;

```

El RDBMS recibe este código, lo interpreta, busca la forma más eficiente de encontrar esos datos y te devuelve el resultado final.

### Ejemplos de RDBMS en la vida real

Existen múltiples "marcas" o motores de RDBMS en el mercado. Aunque todos entienden SQL estándar, cada uno tiene sus propias características, optimizaciones y pequeños "dialectos". Los más populares a nivel mundial son:

* **PostgreSQL:** Conocido por ser de código abierto, extremadamente robusto y apegado a los estándares de SQL.
* **MySQL:** Muy popular en el desarrollo web y también de código abierto.
* **SQL Server:** La solución empresarial desarrollada por Microsoft.
* **Oracle Database:** Un gigante histórico utilizado en corporaciones masivas.
* **SQLite:** Un motor ligero que se guarda en un solo archivo, ideal para aplicaciones móviles.

Sin importar cuál de estos sistemas elijas en el futuro, los fundamentos de SQL que aprenderás en este libro te servirán para comunicarte con cualquiera de ellos.

## 1.2. El modelo relacional: Tablas, Filas y Columnas

En la sección anterior vimos que el RDBMS es el motor que gestiona nuestros datos. Ahora, la pregunta natural es: ¿cómo organiza ese motor la información? La respuesta es el **modelo relacional**.

Este modelo, propuesto en 1970 por el matemático Edgar F. Codd, revolucionó la informática al establecer una forma lógica, estructurada y predecible de guardar la información. Para entenderlo de forma sencilla, puedes imaginar el modelo relacional como un libro de hojas de cálculo de Excel o Google Sheets, pero con reglas mucho más estrictas.

En este modelo, toda la información se organiza en tres componentes fundamentales: Tablas, Columnas y Filas.

### 1. Tablas (El contenedor principal)

Una base de datos relacional está compuesta por una o más **tablas**. Cada tabla está diseñada para almacenar información sobre una única "entidad" o tema específico.

Si estás creando una tienda en línea, no mezclas todo en un solo lugar. Tendrás una tabla dedicada exclusivamente a los `clientes`, otra tabla para los `productos` y otra para los `pedidos`.

### 2. Columnas (La estructura o atributos)

Las tablas están formadas por **columnas** (también conocidas como *campos* o *atributos*). Las columnas definen la estructura de la tabla, es decir, **qué tipo de información** se va a guardar.

En nuestra tabla de `clientes`, las columnas podrían ser: `id_cliente`, `nombre`, `correo` y `fecha_registro`.

> **Nota clave:** A diferencia de una hoja de cálculo normal donde puedes escribir texto en una celda y números en la siguiente, en una base de datos relacional las reglas son estrictas. Si defines que la columna `fecha_registro` es para fechas, el RDBMS no te permitirá guardar un texto como "Ayer" en ese lugar. (Profundizaremos en los tipos de datos en la sección 1.4).

### 3. Filas (Los datos o registros)

Mientras que las columnas definen la estructura, las **filas** (también llamadas *registros* o *tuplas*) contienen los datos reales. Cada fila representa un elemento individual y único dentro de esa tabla.

Siguiendo nuestro ejemplo, una fila entera representaría a un solo cliente con todos sus datos asociados.

Para visualizarlo, una tabla de `clientes` se vería conceptualmente así:

| id_cliente | nombre | correo | fecha_registro |
| --- | --- | --- | --- |
| 1 | Ana López | <ana@email.com> | 2023-01-15 |
| 2 | Carlos Ruiz | <carlos@email.com> | 2023-02-10 |
| 3 | María Silva | <maria@email.com> | 2023-02-11 |

En este ejemplo:

* Tenemos **1 tabla** (`clientes`).
* Tenemos **4 columnas** que dictan qué datos se guardan.
* Tenemos **3 filas**, lo que significa que hay tres clientes registrados en nuestro sistema.

### ¿Por qué se llama "relacional"?

Se llama así porque estas tablas independientes no están aisladas; pueden **relacionarse** entre sí.

En lugar de guardar toda la información de un producto dentro de la tabla del cliente que lo compró (lo cual generaría un caos de datos repetidos), el RDBMS permite vincular la tabla de `clientes` con la tabla de `pedidos`. Así, el sistema sabe perfectamente que "Ana López" compró el pedido número "#554", manteniendo la información organizada, eficiente y sin duplicados innecesarios. Exploraremos exactamente cómo se conectan estas tablas en el Capítulo 5 (Relaciones y Joins).

Por ahora, lo fundamental es que comprendas que al escribir código SQL, el 90% del tiempo estarás diciendo: *"Busca en esta **tabla**, filtra estas **filas** y devuélveme estas **columnas**"*.

```sql
-- Un adelanto conceptual de cómo interactuamos con esta estructura
SELECT nombre, correo   -- (1) Elegimos las columnas
FROM clientes           -- (2) Elegimos la tabla
WHERE id_cliente = 1;   -- (3) Filtramos la fila específica

```

## 1.3. Concepto de Esquema (Schema)

Ya sabemos que la base de datos es el gran contenedor de nuestra información y que los datos específicos viven organizados en tablas. Pero, ¿qué ocurre cuando una empresa crece y su base de datos pasa de tener cinco tablas a tener quinientas o mil? Mantener todo en un solo lugar se volvería caótico.

Para resolver este problema de organización, los RDBMS utilizan el concepto de **Esquema (Schema)**.

Imagina que tu base de datos es un gran archivero metálico en una oficina. Si guardas todos los documentos (las tablas) sueltos en el cajón principal, encontrar lo que buscas será una pesadilla. Para solucionarlo, utilizas carpetas o separadores. Un esquema es exactamente eso: **una carpeta o contenedor lógico** dentro de tu base de datos que te permite agrupar y organizar tablas y otros objetos relacionados.

### ¿Por qué son tan útiles los esquemas?

El uso de esquemas no solo es una cuestión de orden visual; cumple tres funciones vitales en el manejo profesional de bases de datos:

1. **Organización lógica:** Te permite agrupar objetos por su función o departamento. Por ejemplo, podrías tener un esquema llamado `ventas` (para facturas, clientes, catálogos) y otro llamado `recursos_humanos` (para empleados, nóminas, vacaciones).
2. **Seguridad y permisos:** Los esquemas actúan como barreras de seguridad. Un administrador puede darle acceso a un analista financiero únicamente al esquema `finanzas`, bloqueando por completo su acceso al esquema de `recursos_humanos` donde están los salarios de sus compañeros.
3. **Evitar conflictos de nombres (Namespaces):** En una base de datos grande, es común que distintos departamentos usen nombres similares. Gracias a los esquemas, puedes tener una tabla llamada `empleados` en el esquema `ventas` y otra tabla completamente distinta llamada `empleados` en el esquema `logistica` sin que el RDBMS se confunda.

### La notación de punto (`.`)

Para decirle a SQL exactamente en qué "carpeta" debe buscar una tabla, utilizamos la notación de punto. La estructura siempre es `esquema.tabla`.

Observa este ejemplo de código, donde consultamos dos tablas que se llaman igual, pero que viven en esquemas diferentes:

```sql
-- Consultamos a los empleados del departamento de ventas
SELECT nombre, comision 
FROM ventas.empleados;

-- Consultamos a los empleados del departamento de logística
SELECT nombre, ruta_asignada 
FROM logistica.empleados;

```

### El esquema por defecto

Si has visto tutoriales o código SQL básico antes, es muy probable que nunca hayas visto la notación de esquema. Esto se debe a que casi todos los motores de bases de datos crean un **esquema predeterminado** automáticamente.

* En PostgreSQL, el esquema por defecto suele llamarse `public`.
* En SQL Server de Microsoft, suele ser `dbo` (Database Owner).
* En MySQL, el concepto de esquema y base de datos es prácticamente el mismo (son sinónimos).

Cuando escribes una consulta simple como `SELECT * FROM clientes;`, el RDBMS asume implícitamente que estás buscando en ese esquema predeterminado. Sin embargo, a medida que avances hacia un nivel intermedio y experto (como veremos en capítulos posteriores), trabajar con múltiples esquemas será el estándar en tu día a día.

## 1.4. Tipos de datos básicos (Strings, Integers, Decimals, Booleans, Dates)

En la sección 1.2 mencionamos que las columnas de una tabla tienen reglas muy estrictas. La regla principal y más importante es el **tipo de dato**.

Cuando diseñas una tabla en una base de datos relacional, debes decirle al RDBMS exactamente qué tipo de información va a almacenar cada columna. Esto no es un capricho del sistema; le sirve para saber cuánto espacio en disco debe reservar y qué operaciones matemáticas o lógicas están permitidas (por ejemplo, tiene sentido sumar dos salarios, pero no tiene sentido intentar sumar el nombre "Carlos" con el nombre "Ana").

Aunque cada motor de base de datos (PostgreSQL, MySQL, SQL Server) tiene sus propios nombres específicos o variantes avanzadas, casi todos comparten cinco grandes familias de datos básicos:

### 1. Cadenas de texto (Strings)

Se utilizan para almacenar letras, palabras, frases o cualquier combinación de caracteres alfanuméricos (como códigos postales o contraseñas).

* **`VARCHAR` (Variable Character):** Es el rey de los textos. Le indicas un límite máximo, pero solo ocupa el espacio que realmente usas. Por ejemplo, `VARCHAR(50)` permite guardar nombres de hasta 50 letras.
* **`CHAR`:** Almacena texto de longitud fija. Si defines `CHAR(5)` y guardas la palabra "Sol" (3 letras), el RDBMS rellenará los otros dos espacios en blanco. Es ideal para códigos uniformes, como un código de país ("MX", "ES", "AR").
* **`TEXT`:** Se usa para bloques largos de texto sin un límite estricto, como los comentarios de un blog o la descripción detallada de un producto.

### 2. Números enteros (Integers)

Son números completos, sin decimales. Son perfectos para contar cosas, identificar registros (como el `id_cliente`) o guardar edades.

* **`INT` o `INTEGER`:** El estándar para números enteros. Puede almacenar números desde los millones negativos hasta los millones positivos.
* **`SMALLINT` y `BIGINT`:** Variantes para cuando necesitas almacenar números muy pequeños (para ahorrar espacio) o ridículamente grandes (como el número de visualizaciones de un video viral).

### 3. Números decimales (Decimals/Floats)

Se utilizan cuando la precisión es clave y necesitas fracciones. Son indispensables para el dinero, porcentajes o mediciones físicas.

* **`DECIMAL` o `NUMERIC`:** Son exactos. Cuando los defines, especificas la precisión total y la escala (cuántos números van después de la coma). Por ejemplo, `DECIMAL(10,2)` significa que el número puede tener 10 dígitos en total, de los cuales 2 son decimales (ej. `12345678.90`). Es el formato obligatorio para trabajar con moneda.
* **`FLOAT` o `REAL`:** Son números de "coma flotante". Son aproximados y se usan para cálculos científicos donde una minúscula variación en el decimal número 15 no arruina el resultado, pero nunca deben usarse para dinero.

### 4. Valores lógicos (Booleans)

Son el tipo de dato más simple. Representan una respuesta binaria a una pregunta.

* **`BOOLEAN`:** Solo puede almacenar tres valores: `TRUE` (Verdadero), `FALSE` (Falso) o `NULL` (Desconocido). Es perfecto para columnas como `es_suscripcion_activa` o `email_verificado`. *Nota: En algunos motores como SQL Server se utiliza el tipo `BIT` (1 o 0) para representar esto.*

### 5. Fechas y Horas (Dates)

El tiempo es una dimensión crítica en cualquier negocio. Guardar las fechas correctamente te permite calcular rangos (¿cuánto vendimos el mes pasado?).

* **`DATE`:** Almacena solo la fecha (Año, Mes, Día). Ej: `2023-10-25`.
* **`TIME`:** Almacena solo la hora. Ej: `14:30:00`.
* **`TIMESTAMP` o `DATETIME`:** Combina ambos. Guarda el instante exacto en el que ocurrió un evento. Ej: `2023-10-25 14:30:00`.

### Juntándolo todo

Aunque aprenderemos a crear nuestras propias tablas en el Capítulo 8, observar cómo se aplican estos tipos de datos en código real ayuda a consolidar el concepto. Así es como se le dictan estas reglas al RDBMS:

```sql
-- Ejemplo conceptual de cómo se asignan los tipos de datos a las columnas
CREATE TABLE productos (
    id_producto INT,                  -- Número entero
    nombre_producto VARCHAR(100),     -- Texto de hasta 100 caracteres
    precio DECIMAL(10,2),             -- Número exacto con 2 decimales
    esta_disponible BOOLEAN,          -- Verdadero o Falso
    fecha_lanzamiento DATE            -- Solo la fecha
);

```

¡Felicidades! Con esto terminamos la teoría estructural. Ya entiendes qué es una base de datos, cómo se organiza en esquemas, tablas, filas y columnas, y qué tipos de información puede almacenar. Ahora estamos listos para encender el motor.
