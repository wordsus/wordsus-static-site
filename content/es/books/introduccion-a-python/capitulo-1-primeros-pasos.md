# Primeros Pasos con Python

¡Bienvenido a **Introducción a Python**! Este capítulo te guiará a través de los conceptos básicos para configurar tu entorno y escribir tu primer programa en Python.

## ¿Qué es Python?

Python es un lenguaje de programación interpretado de alto nivel, conocido por su simplicidad y legibilidad. Creado por Guido van Rossum y lanzado por primera vez en 1991, Python se ha convertido en uno de los lenguajes de programación más populares del mundo.

```python
# Tu primer programa en Python
print("¡Hola, Mundo!")
```

## Instalando Python

Antes de comenzar a programar, necesitas instalar Python en tu sistema.

### Windows

1. Visita [python.org](https://python.org)
2. Descarga la última versión (Python 3.x)
3. Ejecuta el instalador y marca **"Add Python to PATH"**

### macOS

La forma más fácil es usando Homebrew:

```bash
brew install python3
```

### Linux

La mayoría de las distribuciones Linux incluyen Python. Puedes instalar o actualizar con:

```bash
sudo apt update && sudo apt install python3
```

## Tu Primer Programa

Abre un editor de texto y crea un archivo llamado `hola.py`:

```python
# hola.py
nombre = input("¿Cómo te llamas? ")
print(f"¡Hola, {nombre}! Bienvenido a Python.")
```

Ejecútalo desde tu terminal:

```bash
python3 hola.py
```

## Resumen

En este capítulo aprendiste:

- Qué es Python y por qué es tan popular
- Cómo instalar Python en diferentes sistemas operativos
- Cómo escribir y ejecutar tu primer programa en Python

En el próximo capítulo exploraremos las **Variables y Tipos de Datos**.
