Physics is an experimental science built upon our ability to accurately measure the universe. Before exploring the laws of motion, we must establish a rigorous language for these measurements. This chapter introduces the International System of Units (SI), the rules of significant figures, and dimensional analysis to ensure our equations are physically sound.

Additionally, because many physical quantities require a direction, we will explore the mathematics of vectors. By learning to resolve vectors into components within Cartesian coordinate systems, you will build the essential analytical framework needed to solve complex physics problems.

## 1.1 The International System of Units (SI)

Physics is fundamentally an experimental science. It relies on precise measurements to understand, test, and formulate the laws of the universe. To communicate these measurements unambiguously across the globe, scientists use a standardized framework known as the International System of Units, abbreviated as **SI** (from the French *Système international d'unités*).

### Base Quantities and Units

The SI framework is built upon seven fundamental physical quantities, known as **base quantities**. Every other measurable quantity in physics—whether it is the speed of a galaxy, the pressure of a gas, or the energy of a photon—can be expressed as a mathematical combination of these seven base units.

| Base Quantity | SI Base Unit | Symbol |
| --- | --- | --- |
| **Length** | meter | m |
| **Mass** | kilogram | kg |
| **Time** | second | s |
| **Electric current** | ampere | A |
| **Thermodynamic temperature** | kelvin | K |
| **Amount of substance** | mole | mol |
| **Luminous intensity** | candela | cd |

### Modern Definitions Based on Universal Constants

Historically, SI units were defined by physical artifacts. For instance, the kilogram was originally defined by a specific platinum-iridium cylinder kept in a vault in France. However, physical artifacts can degrade, gather dust, or change mass slightly over time.

To achieve absolute precision and universal accessibility, the scientific community undertook a major revision of the SI in 2019. Today, all seven base units are defined not by physical objects, but by fixing the exact numerical values of fundamental constants of nature.

For example:

* **The meter (m)** is defined by setting the speed of light in a vacuum ($c$) exactly to **299,792,458 m/s**.
* **The second (s)** is defined by taking the fixed numerical value of the cesium frequency ($\Delta \nu_{Cs}$), the unperturbed ground-state hyperfine transition frequency of the cesium-133 atom.
* **The kilogram (kg)** is defined by taking the fixed numerical value of the Planck constant ($h$).

Because these constants are assumed to be identical everywhere in the universe, our system of measurement is now truly universal.

### Derived Units

When we combine base units through multiplication or division, we create **derived units**. Many derived units are given special names for convenience. For instance, velocity is defined as length divided by time, so its SI unit is **m/s**.

Force, which is mass multiplied by acceleration, has the base units of **kg·m/s^2**. Instead of writing this cumbersome combination every time, physicists give it a special derived name, the **newton (N)**:

$$1 \text{ N} = 1 \text{ kg} \cdot \frac{\text{m}}{\text{s}^2}$$

Similarly, the unit of energy is the **joule (J)**, which is equivalent to a newton-meter, or **kg·m^2/s^2**.

### SI Prefixes

Physicists study phenomena on vastly different scales, from the diameter of a proton to the width of the observable universe. To avoid writing unwieldy numbers with many zeros, the SI utilizes a standard set of prefixes that represent powers of ten. These prefixes are attached directly to the base or derived units.

| Prefix | Symbol | Multiplier | \| | Prefix | Symbol | Multiplier |
| --- | --- | --- | --- | --- | --- | --- |
| yotta | Y | 10^24 | \| | deci | d | 10^-1 |
| zetta | Z | 10^21 | \| | centi | c | 10^-2 |
| exa | E | 10^18 | \| | milli | m | 10^-3 |
| peta | P | 10^15 | \| | micro | μ | 10^-6 |
| tera | T | 10^12 | \| | nano | n | 10^-9 |
| giga | G | 10^9 | \| | pico | p | 10^-12 |
| mega | M | 10^6 | \| | femto | f | 10^-15 |
| kilo | k | 10^3 | \| | atto | a | 10^-18 |

**Usage Examples:**

* A length of **5,000,000 m** can be written as **5 megameters (5 Mm)**.
* A time interval of **0.000000001 s** can be written as **1 nanosecond (1 ns)**.
* The mass of a common insect might be **2 milligrams (2 mg)**, which is **2 × 10^-3 g** or **2 × 10^-6 kg**. Note that while "kilogram" is the base unit for mass, prefixes are mathematically applied to the "gram" to avoid double-prefixes (we do not write "microkilogram").

## 1.2 Dimensional Analysis and Significant Figures

### The Concept of Dimensions

In physics, the word "dimension" refers to the physical nature of a quantity, regardless of the specific units used to measure it. For example, whether a distance is measured in meters, feet, or light-years, its underlying dimension is always **Length**.

We typically denote the dimensions of a physical quantity using square brackets $[ ]$. The three most fundamental dimensions in mechanics are:

* **Length:** $[L]$
* **Mass:** $[M]$
* **Time:** $[T]$

Derived quantities can be expressed as algebraic combinations of these base dimensions. For instance, speed $v$ is a length divided by a time, so its dimension is written as:

$$[v] = \frac{[L]}{[T]} = [L][T]^{-1}$$

Similarly, acceleration $a$, which is the change in speed over time, has the dimensions:

$$[a] = \frac{[L]/[T]}{[T]} = \frac{[L]}{[T]^2} = [L][T]^{-2}$$

### Dimensional Analysis

Dimensional analysis is a powerful analytical tool used to check the mathematical validity of equations and to assist in deriving relationships between physical variables. It relies on a simple but absolute rule: **Quantities can only be added, subtracted, or equated if they have the identical dimensions.**

You cannot add a mass to a length, just as you cannot equate an area to a volume. If a physics equation is derived correctly, both sides of the equals sign must have the exact same dimensions. This property is known as **dimensional consistency**.

**Example: Checking a Kinematic Equation**
Consider the equation for the position $x$ of an object undergoing constant acceleration $a$ for a time $t$, with an initial velocity $v_0$:

$$x = v_0 t + \frac{1}{2} a t^2$$

Let us analyze the dimensions of each term individually:

1. **Position term:** $[x] = [L]$
2. **Velocity-time term:** $[v_0 t] = \left( \frac{[L]}{[T]} \right) [T] = [L]$
3. **Acceleration-time term:** $\left[ \frac{1}{2} a t^2 \right] = \left( \frac{[L]}{[T]^2} \right) [T]^2 = [L]$

*Note: Pure numbers, such as $\frac{1}{2}$ or $\pi$, and trigonometric functions like $\sin(\theta)$ are dimensionless and do not affect the dimensional analysis.*

Because every term in the equation reduces to the dimension of length $[L]$, the equation is dimensionally consistent. While dimensional consistency does not definitively prove an equation is correct (it cannot verify the dimensionless fraction $\frac{1}{2}$), an equation that is *dimensionally inconsistent* is guaranteed to be physically incorrect.

### Uncertainty in Measurement and Significant Figures

Physics is an experimental science, and no physical measurement is perfectly precise. There is always some degree of uncertainty depending on the quality of the measuring instrument and the skill of the observer. To properly communicate this uncertainty without writing tedious error bounds for every number, scientists use **significant figures** (often called significant digits).

The number of significant figures in a measurement includes all the reliably known digits plus one final digit that is an estimate.

```text
Anatomy of Significant Figures:
    
      0 . 0 0 4 5 0
      │   │ │ │ │ │
      └───┴─┘ │ │ │
         │    │ │ └─ Trailing zero AFTER a decimal: SIGNIFICANT
         │    │ └─── Non-zero digit: SIGNIFICANT
         │    └───── Non-zero digit: SIGNIFICANT
         └────────── Leading zeros: NOT SIGNIFICANT (Just placeholders)
         
      Total Significant Figures: 3

```

#### Rules for Identifying Significant Figures

1. **All non-zero digits are significant:** $1.234$ kg has four significant figures.
2. **Zeros between non-zero digits are significant:** $30.07$ m has four significant figures.
3. **Leading zeros are strictly placeholders and are never significant:** $0.005$ s has one significant figure.
4. **Trailing zeros are significant ONLY if the number contains a decimal point:**

* $4.00$ A has three significant figures.
* $400$ m is ambiguous (it could represent one, two, or three significant figures). To eliminate this ambiguity, scientists use scientific notation: writing $4.00 \times 10^2$ m explicitly shows three significant figures, while $4 \times 10^2$ m shows exactly one.

#### Rules for Calculations

When combining measurements mathematically, the final result cannot claim to be more precise than the least precise measurement used in the calculation. There are two distinct rules depending on the mathematical operation:

**1. Multiplication and Division:**
The final answer must have the same number of significant figures as the measurement with the *fewest* significant figures.

* *Example:* Calculating the area of a rectangle with sides $4.5$ cm (two sig figs) and $7.34$ cm (three sig figs):

$$4.5 \text{ cm} \times 7.34 \text{ cm} = 33.03 \text{ cm}^2$$

Because the least precise input ($4.5$) has only two significant figures, we must round our answer to two significant figures: **$33 \text{ cm}^2$**.

**2. Addition and Subtraction:**
The final answer must have the same number of *decimal places* as the measurement with the *fewest* decimal places, regardless of the total number of significant figures.

* *Example:* Adding masses on a scale:

$$12.11 \text{ kg (two decimal places)} + 18.0 \text{ kg (one decimal place)} = 30.11 \text{ kg}$$

Because the least precise input ($18.0$) is only known to the tenths place, we must round our answer to the tenths place: **$30.1 \text{ kg}$**.

## 1.3 Properties of Vectors and Scalars

In physics, the quantities we measure and calculate fall into two broad categories based on whether they require a direction to be fully described: scalars and vectors. Understanding the distinction between these two, and the mathematical rules that govern them, is essential for analyzing motion, forces, and fields.

### Scalars and Vectors

A **scalar** is a physical quantity that is completely described by a single number (with appropriate units). It has magnitude but no direction.

* **Examples of scalars:** Mass, temperature, time, volume, speed, and energy.
* The mathematics of scalars is the ordinary arithmetic of real numbers. For instance, if you add $2 \text{ kg}$ of water to $3 \text{ kg}$ of water, you have $5 \text{ kg}$ of water.

A **vector** is a physical quantity that has both magnitude and a specific direction in space.

* **Examples of vectors:** Displacement, velocity, acceleration, force, and momentum.
* Specifying that a car is moving at $100 \text{ km/h}$ describes a scalar (speed). Specifying that the car is moving at $100 \text{ km/h}$ *due north* describes a vector (velocity).

### Vector Notation

To distinguish vectors from scalars in text, physicists use specific notations:

* **Vectors** are typically written with an arrow over the symbol (e.g., $\vec{A}$, $\vec{v}$, $\vec{F}$) or in boldface type (e.g., **A**, **v**, **F**). In this text, we will primarily use the arrow notation: $\vec{A}$.
* The **magnitude** of a vector—which is a scalar representing its length or size—is written in italics without the arrow ($A$), or enclosed in absolute value bars ($|\vec{A}|$). By definition, the magnitude of a vector is always positive or zero; it cannot be negative.

Graphically, a vector is represented by an arrow. The length of the arrow is proportional to the vector's magnitude, and the arrow points in the direction of the vector.

```text
       Tail                     Tip
        +------------------------>
           Length = Magnitude (A)
           Direction = Arrowhead

```

### Equality of Vectors

Two vectors, $\vec{A}$ and $\vec{B}$, are defined to be equal ($\vec{A} = \vec{B}$) if and only if they have the same magnitude and the same direction. It does not matter where the vectors are located in space. If you translate (move without rotating) a vector so its tail sits at a new location, it remains the exact same vector.

### Vector Addition: Graphical Methods

Because vectors include direction, they cannot be added using simple scalar arithmetic. If you walk $3 \text{ m}$ East and then $4 \text{ m}$ North, your total distance (scalar) is $7 \text{ m}$, but your net displacement (vector) is $5 \text{ m}$ in a northeasterly direction.

There are two primary graphical methods for adding vectors:

**1. The Tip-to-Tail Method (Triangle Method)**
To add vector $\vec{B}$ to vector $\vec{A}$:

1. Draw vector $\vec{A}$.
2. Draw vector $\vec{B}$, placing its tail exactly at the tip of $\vec{A}$.
3. Draw the **resultant vector**, $\vec{R} = \vec{A} + \vec{B}$, originating from the tail of $\vec{A}$ and ending at the tip of $\vec{B}$.

```text
                  Tip of B
                 ^
                /|
               / |
            B /  |
             /   | R = A + B
            /    |
           /     |
  Tip of A +     |
           |     |
         A |     |
           |     |
           |     |
           +-----+
       Tail of A

```

**2. The Parallelogram Method**
Alternatively, place the tails of both $\vec{A}$ and $\vec{B}$ at the same starting point. Draw lines parallel to each vector to form a parallelogram. The diagonal of the parallelogram drawn from the common origin represents the resultant vector $\vec{R}$.

```text
                .....................> Tip
               /                   /
            B /                 R /
             /                   /
            /                   /
    Origin +------------------->
                     A

```

### Properties of Vector Addition

Vector addition obeys fundamental mathematical laws that mirror scalar addition:

* **Commutative Law:** The order in which vectors are added does not affect the result.

$$\vec{A} + \vec{B} = \vec{B} + \vec{A}$$

* **Associative Law:** When adding three or more vectors, the grouping does not matter.

$$(\vec{A} + \vec{B}) + \vec{C} = \vec{A} + (\vec{B} + \vec{C})$$

### The Negative of a Vector and Subtraction

The **negative** of a vector $\vec{A}$, written as $-\vec{A}$, is defined as a vector with the exact same magnitude as $\vec{A}$ but pointing in the *opposite* direction. Adding a vector to its negative results in the zero vector (a vector with zero magnitude and undefined direction):

$$\vec{A} + (-\vec{A}) = 0$$

**Vector subtraction** makes use of this definition. To subtract vector $\vec{B}$ from vector $\vec{A}$, you simply add the negative of $\vec{B}$ to $\vec{A}$:

$$\vec{A} - \vec{B} = \vec{A} + (-\vec{B})$$

Graphically, to find $\vec{A} - \vec{B}$, you flip the direction of $\vec{B}$ by $180^\circ$ and then use the tip-to-tail or parallelogram method to add it to $\vec{A}$.

### Multiplication of a Vector by a Scalar

A vector $\vec{A}$ can be multiplied by a scalar $c$. The result is a new vector, $c\vec{A}$.

* **Magnitude:** The magnitude of the new vector is $|c|$ times the magnitude of $\vec{A}$.
* **Direction:** If $c$ is positive, the new vector points in the same direction as $\vec{A}$. If $c$ is negative, the new vector points in the exact opposite direction.

For example, $2\vec{A}$ is a vector twice as long as $\vec{A}$ pointing in the same direction, while $-0.5\vec{A}$ is a vector half as long as $\vec{A}$ pointing in the opposite direction.

## 1.4 Coordinate Systems and Unit Vectors

While graphical methods for vector addition are excellent for conceptualizing physical situations, they are often imprecise and cumbersome for detailed calculations. To analyze vectors mathematically with absolute precision, physicists rely on coordinate systems and analytical methods.

### The Cartesian Coordinate System

The most common framework used in introductory physics is the **Cartesian coordinate system** (or rectangular coordinate system). In two dimensions, this consists of two mutually perpendicular axes: the horizontal $x$-axis and the vertical $y$-axis. The point where they intersect is the origin ($0,0$).

For three-dimensional space, a third axis, the $z$-axis, is added perpendicular to both the $x$ and $y$ axes. Physicists conventionally use a **right-handed coordinate system**: if you point the fingers of your right hand in the direction of the positive $x$-axis and curl them toward the positive $y$-axis, your thumb points in the direction of the positive $z$-axis.

### Unit Vectors

A **unit vector** is a vector that has a magnitude of exactly 1 and points in a particular direction. It carries no physical units or dimensions; its sole purpose is to act as a directional signpost. We denote unit vectors by placing a "hat" (caret) over the symbol.

In the Cartesian coordinate system, we define three special unit vectors corresponding to the positive directions of the axes:

* $\hat{i}$ points in the $+x$ direction.
* $\hat{j}$ points in the $+y$ direction.
* $\hat{k}$ points in the $+z$ direction.

Because their magnitudes are 1, multiplying a scalar by a unit vector gives the scalar a specific direction without changing its size. For example, a force of $5 \text{ N}$ acting in the positive $x$-direction can be written exactly as $\vec{F} = 5\hat{i} \text{ N}$.

### Vector Components

Any vector in two-dimensional space can be broken down, or **resolved**, into two perpendicular vectors parallel to the $x$ and $y$ axes. These are called the **components** of the vector.

Consider a vector $\vec{A}$ lying in the $xy$-plane, making an angle $\theta$ measured counterclockwise from the positive $x$-axis.

```text
          y
          ^
          |
          |       /|
      A_y |      / |
          |   A /  |
          |    /   |
          |   /    |
          |  /     |
          | / ) θ  |
          +----------------> x
                 A_x

```

Vector $\vec{A}$ can be expressed as the vector sum of its $x$-component vector ($\vec{A}_x$) and its $y$-component vector ($\vec{A}_y$):

$$\vec{A} = \vec{A}_x + \vec{A}_y$$

Using unit vector notation, we write this as:

$$\vec{A} = A_x\hat{i} + A_y\hat{j}$$

Here, $A_x$ and $A_y$ are scalar components. They can be positive, negative, or zero, depending on the quadrant the vector points into. Using right-triangle trigonometry, we can determine these scalar components from the vector's magnitude $A$ and angle $\theta$:

$$A_x = A \cos \theta$$

$$A_y = A \sin \theta$$

Conversely, if we know the components $A_x$ and $A_y$, we can reconstruct the original vector. The magnitude of $\vec{A}$ is found using the Pythagorean theorem:

$$A = |\vec{A}| = \sqrt{A_x^2 + A_y^2}$$

The directional angle $\theta$ is found using the inverse tangent function:

$$\theta = \tan^{-1} \left( \frac{A_y}{A_x} \right)$$

*(Note: When calculating this angle, always check the signs of $A_x$ and $A_y$ to ensure $\theta$ places the vector in the correct physical quadrant.)*

In three dimensions, the logic extends naturally. A vector $\vec{A}$ is written as:

$$\vec{A} = A_x\hat{i} + A_y\hat{j} + A_z\hat{k}$$

And its magnitude is:

$$A = \sqrt{A_x^2 + A_y^2 + A_z^2}$$

### Vector Addition Using Components

The primary advantage of the component method is that it transforms complex vector geometry into simple scalar arithmetic. Because perpendicular dimensions are independent of one another in basic mechanics, you can add vectors simply by adding their respective components.

If you have two vectors, $\vec{A} = A_x\hat{i} + A_y\hat{j}$ and $\vec{B} = B_x\hat{i} + B_y\hat{j}$, their resultant vector $\vec{R} = \vec{A} + \vec{B}$ is found by:

$$\vec{R} = (A_x + B_x)\hat{i} + (A_y + B_y)\hat{j}$$

Therefore, the components of the resultant vector are:

$$R_x = A_x + B_x$$

$$R_y = A_y + B_y$$

To analytically solve any vector addition problem:

1. Resolve every vector into its $x$, $y$, (and $z$) components.
2. Sum all the $x$-components to find $R_x$.
3. Sum all the $y$-components to find $R_y$.
4. Recombine $R_x$ and $R_y$ using the Pythagorean theorem and inverse tangent to find the magnitude and direction of the final resultant vector $\vec{R}$.

---

## Chapter 1 Summary

* **The International System of Units (SI):** Physics relies on standardized measurements based on seven base quantities (length, mass, time, electric current, temperature, amount of substance, luminous intensity). These units are strictly defined by fundamental constants of the universe. Metric prefixes (kilo-, milli-, nano-, etc.) are used to express very large or very small numbers efficiently.
* **Dimensional Analysis and Significant Figures:** Every physical quantity has a dimension (e.g., Length $[L]$, Mass $[M]$, Time $[T]$). Equations must be dimensionally consistent to be physically valid. Significant figures communicate the precision of a measurement; rules of arithmetic dictate that final calculations cannot be more precise than the least precise input data.
* **Properties of Vectors and Scalars:** Scalars represent magnitude only (e.g., mass, time), while vectors represent both magnitude and direction (e.g., displacement, force). Vectors can be represented graphically by arrows and added using graphical techniques like the tip-to-tail method or the parallelogram method.
* **Coordinate Systems and Unit Vectors:** To manipulate vectors analytically, they are placed within a coordinate system and broken down into independent components. Unit vectors ($\hat{i}, \hat{j}, \hat{k}$) indicate direction along the Cartesian axes. A vector $\vec{A}$ can be written as $\vec{A} = A_x\hat{i} + A_y\hat{j} + A_z\hat{k}$. Vectors are added algebraically by summing their respective $x$, $y$, and $z$ components.
