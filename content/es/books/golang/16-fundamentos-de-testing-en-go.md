El testing en Go no es un añadido opcional, sino un componente intrínseco del diseño del lenguaje. A diferencia de otros ecosistemas que requieren dependencias externas, Go ofrece un **toolchain** nativo y un paquete `testing` de alto rendimiento diseñados para la simplicidad y la velocidad. En este capítulo, exploraremos cómo la convención de archivos `_test.go` permite una separación limpia entre la lógica de negocio y las pruebas, y cómo el patrón de **Table-Driven Tests** se ha convertido en el estándar de oro para escribir suites de pruebas mantenibles, legibles y robustas que garantizan la integridad de aplicaciones críticas a gran escala.

## 16.1. La convención de archivos `_test.go` y el paquete `testing`

A diferencia de muchos otros lenguajes de programación donde el *testing* requiere la instalación y configuración de pesados *frameworks* de terceros (como JUnit en Java o Jest en JavaScript), Go fue diseñado con las pruebas como un ciudadano de primera clase. Las herramientas para escribir, ejecutar y analizar pruebas están integradas directamente en el código fuente del lenguaje a través de su CLI (`go test`) y su biblioteca estándar.

El punto de entrada a este ecosistema se basa en dos pilares fundamentales: una convención de nomenclatura estricta a nivel de sistema de archivos y el uso del paquete nativo `testing`.

### La convención del sufijo `_test.go`

En Go, el *toolchain* utiliza el sistema de archivos para determinar qué código pertenece a la lógica de la aplicación y qué código pertenece a las pruebas. Cualquier archivo cuyo nombre termine exactamente con el sufijo `_test.go` es identificado automáticamente como un archivo de pruebas. 

Esta convención tiene una implicación crucial en la compilación: **los archivos `_test.go` son ignorados por completo cuando ejecutas `go build`, `go run` o `go install`**. Solo se compilan y ejecutan cuando invocas el comando `go test`. Esto garantiza que el código de tus pruebas, así como cualquier dependencia exclusiva de las mismas, nunca infle el tamaño del binario final ni afecte el rendimiento en producción.

**Estrategias de empaquetado: Pruebas de caja blanca vs. caja negra**

Cuando creas un archivo `_test.go`, Go te permite elegir entre dos formas de declarar el paquete en la cabecera del archivo. Esta decisión arquitectónica define la visibilidad que tendrán tus tests sobre el código bajo prueba:

1.  **Caja blanca (Mismo paquete):** Si tu código está en `package mathutil`, tu archivo de pruebas también declara `package mathutil`. Esto permite que tus tests accedan a identificadores no exportados (funciones, variables o *structs* que comienzan con minúscula). Es útil para probar lógica interna compleja de forma aislada.
2.  **Caja negra (Paquete con sufijo `_test`):** Tu archivo de pruebas declara `package mathutil_test`. En este escenario, el archivo de pruebas es tratado como un paquete externo que importa tu paquete principal. Solo podrás acceder a la API pública (identificadores exportados) de `mathutil`. Esta es la práctica más recomendada e idiomática en Go, ya que te obliga a probar el comportamiento de tu API tal y como la consumiría un cliente real, evitando que los tests se acoplen a los detalles de implementación interna.

### El paquete `testing` y el tipo `testing.T`

Para que el comando `go test` reconozca una función como una prueba válida, esta debe cumplir con una firma específica proporcionada por el paquete `testing`:

```go
func TestNombreDeLaPrueba(t *testing.T) {
    // Lógica de la prueba
}
```

La convención exige que el nombre de la función comience con la palabra `Test` seguida de una letra mayúscula (generalmente el nombre de la función que se está probando, por ejemplo, `TestCalculateTaxes`).

El parámetro `t *testing.T` es el motor que controla la ejecución de la prueba. Expone métodos para registrar información, marcar la prueba como fallida o detener su ejecución.

Los métodos más importantes que debes dominar de `*testing.T` se dividen en dos categorías: **registro** y **falla**.

* **`t.Log(args ...any)` / `t.Logf(format string, args ...any)`:** Imprime texto en la salida estándar de la prueba. Esta salida solo es visible si la prueba falla o si ejecutas `go test` con el flag de verbosidad (`-v`).
* **`t.Fail()`:** Marca la prueba como fallida, pero **permite que la ejecución de la función continúe**.
* **`t.FailNow()`:** Marca la prueba como fallida y **detiene la ejecución actual inmediatamente** (internamente invoca `runtime.Goexit`). Las pruebas posteriores en otros archivos o funciones seguirán ejecutándose.

Para simplificar el código, Go proporciona métodos combinados que son los que utilizarás el 99% del tiempo:

* **`t.Error` / `t.Errorf`:** Equivale a llamar a `t.Log` seguido de `t.Fail()`. Es ideal cuando estás comprobando múltiples aserciones en un solo test y quieres ver todos los errores antes de abortar.
* **`t.Fatal` / `t.Fatalf`:** Equivale a llamar a `t.Log` seguido de `t.FailNow()`. Se utiliza cuando una aserción falla de tal manera que carece de sentido o es peligroso continuar con el resto de la prueba (por ejemplo, falló la conexión a una base de datos efímera).

### Ejemplo práctico

A continuación, un ejemplo que ilustra la convención de archivos y el uso de `*testing.T` utilizando el enfoque de caja negra (`_test`).

Supongamos que tenemos un archivo `divide.go` en el paquete `calc`:

```go
// divide.go
package calc

import "errors"

var ErrDivideByZero = errors.New("cannot divide by zero")

// Divide realiza la división de dos números flotantes.
func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, ErrDivideByZero
    }
    return a / b, nil
}
```

El archivo de pruebas correspondiente sería `divide_test.go`:

```go
// divide_test.go
package calc_test // Uso de caja negra

import (
    "testing"
    "tu-proyecto/calc" // Importamos nuestro propio paquete
)

func TestDivide_Success(t *testing.T) {
    resultado, err := calc.Divide(10.0, 2.0)
    
    // Usamos t.Fatal porque si hay un error, no tiene sentido verificar el resultado
    if err != nil {
        t.Fatalf("se esperaba nil, se obtuvo el error: %v", err)
    }

    if resultado != 5.0 {
        // Usamos t.Errorf porque es un fallo de validación de estado
        t.Errorf("se esperaba 5.0, se obtuvo %v", resultado)
    }
}

func TestDivide_ByZero(t *testing.T) {
    _, err := calc.Divide(10.0, 0)
    
    if err == nil {
        t.Fatal("se esperaba un error por división por cero, pero se obtuvo nil")
    }

    if err != calc.ErrDivideByZero {
        t.Errorf("se esperaba el error ErrDivideByZero, se obtuvo: %v", err)
    }
}
```

Al ejecutar `go test -v`, el *toolchain* buscará los archivos `_test.go`, compilará el binario de pruebas en memoria de forma transparente, inyectará el objeto `*testing.T` en cada función que comience por `Test` y reportará los resultados. Este diseño minimalista es el cimiento sobre el cual se construyen patrones más avanzados como las pruebas basadas en tablas, que exploraremos en la siguiente sección.

## 16.2. Table-Driven Tests (Pruebas basadas en tablas)

Escribir una función de prueba distinta para cada escenario posible (éxito, fallo, casos límite), tal como se ilustró en la sección anterior, rápidamente se vuelve insostenible. El código se llena de duplicación (*boilerplate*) y el mantenimiento se encarece. Para resolver esto, la comunidad de Go adoptó un patrón arquitectónico que hoy es el estándar absoluto de la industria: los **Table-Driven Tests** (Pruebas basadas en tablas).

Este patrón no es una característica mágica del lenguaje ni una librería externa, sino una forma estructurada e idiomática de organizar el código utilizando las herramientas nativas que ya conoces: *slices*, *structs* anónimos y bucles `for`.

### La anatomía de un Table-Driven Test

El concepto fundamental es separar la **lógica de la prueba** de los **datos de la prueba**. En lugar de repetir aserciones, defines una "tabla" (un *slice*) donde cada fila representa un caso de prueba único con sus entradas (*inputs*) y salidas esperadas (*expected outputs*).

Una tabla típicamente se construye usando un *slice* de *structs* anónimos que contiene, como mínimo, los siguientes elementos:

* **`name` (string):** Un identificador descriptivo del caso (vital para depuración).
* **Parámetros de entrada:** Los argumentos que recibirá la función a probar.
* **Resultados esperados:** El valor (o valores) que debería retornar la función.
* **Errores esperados:** Una forma de validar si la función debe fallar y cómo.

### Subtests con `t.Run`

Iterar sobre la tabla con un bucle `for` simple funciona, pero si un caso falla, la ejecución se detiene (si usas `t.Fatal`) o se ensucia la salida estándar, dificultando identificar qué fila exacta falló. 

Para solucionar esto, Go 1.7 introdujo el método `t.Run(name string, f func(t *testing.T))`. Este método permite ejecutar cada iteración del bucle como un **subtest** aislado. Si un subtest falla con `t.Fatal`, solo se detiene esa iteración; el resto de la tabla continuará ejecutándose. Además, permite aislar la ejecución de casos específicos desde la CLI usando expresiones regulares (ej. `go test -run TestDivide/División_por_cero`).

### Ejemplo práctico: Refactorizando a Table-Driven Tests

Tomemos los tests de la función `Divide` del capítulo anterior y consolidémoslos en una estructura robusta y escalable:

```go
package calc_test

import (
	"testing"
	"tu-proyecto/calc"
)

func TestDivide(t *testing.T) {
	// 1. Definición de la tabla de casos
	tests := []struct {
		name    string  // Nombre del subtest
		a       float64 // Entrada A
		b       float64 // Entrada B
		want    float64 // Resultado esperado
		wantErr error   // Error esperado (nil si debe ser exitoso)
	}{
		{
			name:    "División exacta positiva",
			a:       10.0,
			b:       2.0,
			want:    5.0,
			wantErr: nil,
		},
		{
			name:    "División con resultado decimal",
			a:       5.0,
			b:       2.0,
			want:    2.5,
			wantErr: nil,
		},
		{
			name:    "División por cero",
			a:       10.0,
			b:       0.0,
			want:    0.0, // El valor por defecto al fallar
			wantErr: calc.ErrDivideByZero,
		},
	}

	// 2. Iteración y ejecución de subtests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.Divide(tt.a, tt.b)

			// Validación de errores
			if err != tt.wantErr {
				t.Fatalf("Divide() error = %v, wantErr %v", err, tt.wantErr)
			}

			// Validación de resultados (solo si no se esperaba error)
			if err == nil && got != tt.want {
				t.Errorf("Divide() = %v, want %v", got, tt.want)
			}
		})
	}
}
```

### Paralelización y la trampa de los bucles (Contexto Go 1.22+)

Un beneficio masivo de aislar los casos en `t.Run` es que puedes ejecutar la tabla de forma concurrente inyectando `t.Parallel()` dentro del subtest. Esto reduce drásticamente el tiempo total de ejecución en baterías de pruebas grandes (o que involucren I/O).

> **Nota arquitectónica clave:** En versiones anteriores a Go 1.22, usar `t.Parallel()` dentro de un bucle `for` creaba una condición de carrera (*data race*) con la variable de iteración (en nuestro ejemplo, `tt`). Todos los subtests paralelos terminaban referenciando el último elemento del *slice*, obligando a reasignar la variable dentro del bucle (`tt := tt`). **A partir de Go 1.22, la semántica del bucle `for` cambió para crear una nueva instancia de la variable en cada iteración**, haciendo que ejecutar Table-Driven Tests en paralelo sea seguro por defecto y eliminando una de las trampas más notorias del lenguaje.

## 16.3. Manejo de estado: `Setup` y `Teardown` en tests

En los *frameworks* de pruebas tradicionales orientados a objetos (como JUnit en Java o pytest en Python), el manejo del estado antes y después de las pruebas se delega a funciones mágicas o decoradores como `@BeforeEach`, `@AfterAll` o `setUp/tearDown`. Fiel a su filosofía, Go rechaza este enfoque implícito en favor de un control de flujo explícito y herramientas integradas en el paquete `testing`.

El ecosistema de Go divide la preparación (*setup*) y limpieza (*teardown*) del estado en dos niveles arquitectónicos: el nivel de paquete (global) y el nivel de prueba/subprueba (local).

### Nivel de paquete: La función `TestMain`

Cuando necesitas inicializar recursos pesados que serán compartidos por todas las pruebas de un mismo paquete —como establecer la conexión a un contenedor de base de datos o arrancar un servidor HTTP efímero—, Go proporciona la función especial `TestMain`.

Si un archivo de pruebas incluye una función llamada `TestMain(m *testing.M)`, el *toolchain* de Go no ejecutará las pruebas directamente. En su lugar, invocará a `TestMain`, delegándote la responsabilidad de orquestar el ciclo de vida de la batería de pruebas y llamar explícitamente a `m.Run()`.

```go
package repository_test

import (
	"fmt"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	// 1. SETUP GLOBAL: Se ejecuta una sola vez antes de todos los tests
	fmt.Println("[Setup] Iniciando conexión a la base de datos de prueba...")
	
	// Simulación de configuración de recursos
	dbConn := "postgres://user:pass@localhost:5432/testdb"
	os.Setenv("TEST_DB_DSN", dbConn)

	// 2. EJECUCIÓN: Corre todos los TestXxx del paquete
	// m.Run() retorna el código de salida (0 si pasan, 1 si fallan)
	exitVal := m.Run()

	// 3. TEARDOWN GLOBAL: Se ejecuta una sola vez al finalizar
	fmt.Println("[Teardown] Cerrando conexiones y limpiando estado...")
	os.Unsetenv("TEST_DB_DSN")

	// 4. SALIDA: Es obligatorio salir con el código devuelto por m.Run()
	os.Exit(exitVal)
}
```

**Advertencia sobre `TestMain`:** Su uso excesivo es un antipatrón. El estado global compartido entre pruebas puede introducir *data races* inadvertidos o hacer que las pruebas fallen intermitentemente (flaky tests) si se ejecutan en paralelo. Resérvalo estrictamente para recursos costosos donde la instanciación por prueba sea prohibitiva.

### Nivel local: La superioridad de `t.Cleanup` sobre `defer`

Para la inmensa mayoría de los casos, el *setup* se realiza simplemente escribiendo código secuencial al inicio de tu función `TestXxx`. Sin embargo, el *teardown* ha evolucionado significativamente.

Históricamente, los desarrolladores de Go utilizaban la instrucción `defer` para asegurar la limpieza de recursos. Aunque `defer` funciona (incluso si la prueba falla con `t.Fatal()`, que internamente llama a `runtime.Goexit`), presenta problemas de ergonomía cuando la lógica de inicialización se extrae a funciones auxiliares (*helpers*). 

Para solucionar esto, Go 1.14 introdujo `t.Cleanup(func())`. Este método registra una función que se ejecutará automáticamente cuando el test (o subtest) finalice, independientemente del resultado.

**¿Por qué `t.Cleanup` es el estándar moderno?**
Permite encapsular completamente la lógica de limpieza dentro de las funciones de *setup*, liberando a la prueba principal de recordar llamar a `defer`. Las funciones registradas se ejecutan en orden LIFO (último en entrar, primero en salir).

Observemos el patrón idiomático de un *Test Helper* utilizando `t.Cleanup`:

```go
package fileutil_test

import (
	"os"
	"testing"
)

// setupTempFile es un helper que crea un archivo temporal y asegura su borrado.
// Al recibir *testing.T, asume la responsabilidad del teardown.
func setupTempFile(t *testing.T, content string) *os.File {
	// t.Helper() marca esta función para que, si falla, la traza de error 
	// apunte a la línea donde se llamó al helper, no dentro de él.
	t.Helper() 

	tmpFile, err := os.CreateTemp("", "testfile_*.txt")
	if err != nil {
		t.Fatalf("falló la creación del archivo temporal: %v", err)
	}

	// TEARDOWN LOCAL: Se garantiza su ejecución al terminar el test que llamó a este helper
	t.Cleanup(func() {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
	})

	if _, err := tmpFile.WriteString(content); err != nil {
		t.Fatalf("falló la escritura en el archivo temporal: %v", err)
	}

	return tmpFile
}

func TestProcessFile(t *testing.T) {
	// SETUP: Llamamos al helper. No necesitamos usar 'defer'.
	file := setupTempFile(t, "datos de configuración críticos")

	// LÓGICA DE PRUEBA
	info, err := file.Stat()
	if err != nil {
		t.Fatalf("error al leer stats: %v", err)
	}

	if info.Size() == 0 {
		t.Errorf("se esperaba un archivo con contenido, tamaño obtenido: %d", info.Size())
	}
	
	// Al terminar esta función, t.Cleanup entrará en acción cerrando y borrando el archivo.
}
```

La combinación de `t.Helper()` y `t.Cleanup()` es una de las herramientas de diseño más potentes en el arsenal de pruebas de Go. Este patrón lo aplicaremos intensivamente en el **Capítulo 18**, cuando gestionemos el ciclo de vida efímero de bases de datos utilizando Testcontainers.

## 16.4. Análisis de cobertura de código (Code Coverage)

El análisis de cobertura de código responde a una pregunta fundamental: ¿qué porcentaje de nuestro código fuente de producción está siendo ejecutado realmente por nuestras pruebas? 

A diferencia de otros lenguajes que dependen de herramientas de terceros complejas (como JaCoCo en Java o Istanbul en el ecosistema de JavaScript) que a menudo instrumentan el código compilado o utilizan *hooks* en la máquina virtual, Go adopta un enfoque radicalmente distinto. El *toolchain* de Go realiza la instrumentación **modificando el Árbol de Sintaxis Abstracta (AST)** del código fuente antes de compilarlo. Inserta contadores de forma transparente en cada bloque lógico (sentencias de control, funciones, ramas de condicionales) y luego compila ese código modificado. 

Este enfoque nativo hace que el análisis de cobertura en Go sea increíblemente rápido, preciso y fácil de utilizar, sin dependencias externas.

### Generación y visualización de perfiles de cobertura

Para obtener una métrica rápida de la cobertura de un paquete, basta con añadir la bandera `-cover` al comando de pruebas:

```bash
$ go test -cover ./...
ok      tu-proyecto/calc        0.012s  coverage: 100.0% of statements
ok      tu-proyecto/repository  0.045s  coverage: 78.4% of statements
```

Sin embargo, el verdadero valor de la herramienta reside en saber **qué líneas exactas** no están siendo probadas. Para ello, debemos generar un "perfil de cobertura" (*cover profile*) y luego visualizarlo.

1.  **Generar el perfil:**
    ```bash
    $ go test -coverprofile=coverage.out ./...
    ```
    Esto creará un archivo de texto (`coverage.out`) que contiene metadatos sobre cada bloque de código y cuántas veces fue ejecutado.

2.  **Visualizar los resultados:**
    Go incluye una herramienta nativa para interpretar este archivo. Puedes ver un resumen en la terminal por cada función:
    ```bash
    $ go tool cover -func=coverage.out
    tu-proyecto/calc/divide.go:9:    Divide          100.0%
    tu-proyecto/repository/db.go:24: Connect         85.0%
    tu-proyecto/repository/db.go:40: Ping            0.0%
    total:                           (statements)    82.5%
    ```

    O, mucho más útil, puedes generar una representación visual en HTML que se abrirá automáticamente en tu navegador:
    ```bash
    $ go tool cover -html=coverage.out
    ```
    En esta vista HTML, el código fuente se colorea:
    * **Gris:** Código no ejecutable (declaraciones, firmas de funciones).
    * **Verde:** Código cubierto por al menos una prueba.
    * **Rojo:** Código que las pruebas jamás alcanzaron.

### Modos de cobertura (`-covermode`)

El comportamiento de los contadores inyectados por Go puede ajustarse dependiendo de lo que necesites medir, utilizando la bandera `-covermode`. Existen tres modos:

1.  **`set` (Por defecto):** Registra un valor booleano. ¿Se ejecutó esta sentencia, sí o no? Es el modo más rápido y el predeterminado si no estás ejecutando el detector de carreras (*race detector*).
2.  **`count`:** Registra *cuántas veces* se ejecutó una sentencia. La vista HTML mostrará el código verde en distintas intensidades (verde más brillante para los *hot paths* o rutas de código muy transitadas). Es útil para identificar cuellos de botella probabilísticos.
3.  **`atomic`:** Idéntico a `count`, pero utiliza operaciones atómicas del paquete `sync/atomic` para incrementar los contadores. **Es obligatorio usar este modo si estás probando código concurrente o utilizando `-race`**, ya que de lo contrario, la propia instrumentación de cobertura causaría *data races* al incrementar contadores compartidos desde múltiples Goroutines. (Si usas `-race` y `-coverprofile` juntos, Go activa `atomic` automáticamente).

### Cobertura en pruebas de integración (La revolución de Go 1.20+)

Históricamente, la cobertura en Go estaba estrictamente limitada a las pruebas unitarias ejecutadas mediante `go test`. No había una forma sencilla de saber qué código ejecutaba un binario compilado durante una prueba de integración *End-to-End* (por ejemplo, levantando el servidor HTTP y haciéndole peticiones externas con Postman o Cypress).

**Go 1.20 introdujo la capacidad de compilar binarios instrumentados para cobertura.** Esta característica avanzada cambia las reglas del juego para las pruebas de integración:

1.  Compilas tu aplicación de producción con la bandera de cobertura:
    ```bash
    $ go build -cover -o mi-api-server main.go
    ```
2.  Ejecutas el binario definiendo la variable de entorno `GOCOVERDIR` para indicarle dónde volcar los datos al finalizar:
    ```bash
    $ GOCOVERDIR=./datos_cobertura ./mi-api-server
    ```
3.  Lanzas tus pruebas externas (scripts de bash, Cypress, llamadas curl).
4.  Al apagar el servidor de forma elegante (*graceful shutdown*), el binario escribirá los perfiles en el directorio especificado. Luego puedes usar `go tool covdata` para unificarlos y generar el clásico archivo `coverage.out` legible por `go tool cover`.

**Una advertencia arquitectónica final:**
La cobertura de código es una excelente herramienta para descubrir "puntos ciegos" (código no probado), pero es una pésima métrica de calidad por sí sola. Alcanzar un 100% de cobertura suele requerir pruebas sin valor que solo buscan complacer a la herramienta (probando *getters*, *setters* o aserciones triviales). El objetivo del ingeniero avanzado no es el 100%, sino tener la certeza de que las rutas críticas de negocio y los casos límite están protegidos contra regresiones.

