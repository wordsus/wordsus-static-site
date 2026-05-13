Calculating electric fields via Coulomb's Law is daunting for complex charge distributions. In this chapter, we introduce Gauss's Law, a profound principle relating electric flux through a closed surface to its enclosed charge. This provides a powerful shortcut to finding electric fields for highly symmetric geometries. Next, we transition from vector forces to scalar energy by exploring electric potential energy and electric potential (voltage). Using equipotential surfaces, these tools offer a mathematically simpler and highly intuitive framework for analyzing complex electrostatic interactions.

## 19.1 Electric Flux

In Chapter 18, we introduced electric field lines as a powerful way to visualize the magnitude and direction of an electric field. We now formalize this visualization by introducing the concept of **electric flux**. The word *flux* comes from the Latin word *fluxus*, meaning "flow." While there is no physical substance flowing in a static electric field, the mathematical framework we use is identical to the one used for fluid volume flow rate (as discussed in Section 14.3).

Conceptually, electric flux is a measure of the number of electric field lines penetrating a specific surface.

### Flux of a Uniform Electric Field Through a Flat Surface

Consider a uniform electric field $\vec{E}$ passing through a flat surface of area $A$. To quantify the flux, we must first define the orientation of the surface. We do this using an **area vector**, denoted as $\vec{A}$.

The magnitude of the area vector is the surface area $A$, and its direction is perpendicular (or *normal*) to the surface. We can write this as $\vec{A}=A\hat{n}$, where $\hat{n}$ is a unit vector pointing out of the surface.

```text
               ^ Area vector (A)
              /
             / 
            /  θ 
  E  -----> * -----> E
           /|
          / | 
 Surface /  |

```

Let $\theta$ be the angle between the electric field vector $\vec{E}$ and the area vector $\vec{A}$. The electric flux, denoted by the uppercase Greek letter Phi ($\Phi_E$), is defined as the scalar (dot) product of the electric field and the area vector:

$$\Phi_E=\vec{E}\cdot\vec{A}=EA\cos\theta$$

The SI unit for electric flux is the newton-meter squared per coulomb ($\text{N}\cdot\text{m}^2/\text{C}$).

Let us examine three specific cases based on this definition:

1. **Maximum Flux ($\theta=0^\circ$):** When the surface is perfectly perpendicular to the electric field lines, the area vector $\vec{A}$ is parallel to $\vec{E}$. In this orientation, $\cos(0^\circ)=1$, and the flux is at its maximum value: $\Phi_E=EA$. This corresponds to the maximum number of field lines piercing the surface.
2. **Zero Flux ($\theta=90^\circ$):** If the surface is oriented parallel to the field lines, the area vector $\vec{A}$ is perpendicular to $\vec{E}$. Here, $\cos(90^\circ)=0$, resulting in $\Phi_E=0$. The field lines simply skim along the surface without penetrating it.
3. **Negative Flux ($90^\circ<\theta\le180^\circ$):** If the field lines point in the opposite general direction of the chosen area vector, the cosine of the angle becomes negative, yielding a negative electric flux.

### Flux of a Non-Uniform Field Through a Curved Surface

If the electric field is not uniform (it varies in magnitude or direction) or if the surface is curved, we cannot simply multiply the total area by the electric field. Instead, we must use calculus.

We divide the large surface into infinitesimally small area elements, $d\vec{A}$. Each element is small enough that we can treat it as perfectly flat, and the electric field $\vec{E}$ passing through it as perfectly uniform.

The infinitesimal flux $d\Phi_E$ through this small area element is:

$$d\Phi_E=\vec{E}\cdot d\vec{A}$$

To find the total electric flux passing through the entire macroscopic surface, we sum the contributions from all these infinitesimal elements by taking the surface integral:

$$\Phi_E=\int\vec{E}\cdot d\vec{A}$$

### Electric Flux Through a Closed Surface

In the next section, we will establish Gauss's Law, which deals exclusively with **closed surfaces**. A closed surface (such as the surface of a sphere, a cube, or an irregular balloon) completely encloses a volume, clearly separating space into an "inside" and an "outside."

When dealing with a closed surface, there is an ambiguity regarding the direction of the area vector $d\vec{A}$, as a normal vector could point inward or outward. By convention, **the area vector $d\vec{A}$ always points outward from the enclosed volume**.

Because of this convention, the sign of the electric flux through a closed surface tells us about the direction of the field relative to the enclosed volume:

* **Positive Flux:** Electric field lines are pointing *out* of the volume ($\vec{E}$ and $d\vec{A}$ are in the same general direction, $\theta<90^\circ$).
* **Negative Flux:** Electric field lines are pointing *into* the volume ($\vec{E}$ and $d\vec{A}$ are in opposite general directions, $\theta>90^\circ$).

To explicitly indicate that a surface integral is being evaluated over a closed surface, we add a circle to the integral sign:

$$\Phi_E=\oint\vec{E}\cdot d\vec{A}$$

The net electric flux through a closed surface is directly proportional to the net number of lines leaving the surface. If more lines leave the surface than enter it, the net flux is positive. If more lines enter than leave, the net flux is negative. If an equal number of lines enter and leave, the net flux is zero.

## 19.2 Gauss's Law

In Section 19.1, we defined electric flux as a measure of the number of electric field lines passing through a surface. We now turn to a profound relationship between the net electric flux through a *closed* surface and the electric charge enclosed by that surface. This relationship, formulated by the German mathematician and physicist Carl Friedrich Gauss, is known as **Gauss's Law**.

Gauss's Law is one of the four fundamental equations of electromagnetism (Maxwell's equations) and represents a cornerstone of classical physics.

### The Statement of Gauss's Law

Gauss's Law states that the net electric flux ($\Phi_E$) through any hypothetical closed surface is directly proportional to the net electric charge ($q_{\text{enc}}$) enclosed within that surface.

Mathematically, it is expressed as:

$$\Phi_E = \oint \vec{E} \cdot d\vec{A} = \frac{q_{\text{enc}}}{\epsilon_0}$$

Where:

* $\oint \vec{E} \cdot d\vec{A}$ is the surface integral representing the net electric flux over the closed surface.
* $q_{\text{enc}}$ is the algebraic sum of all enclosed charges.
* $\epsilon_0$ is the vacuum permittivity constant ($\approx 8.854 \times 10^{-12} \text{ C}^2/(\text{N}\cdot\text{m}^2)$).

The imaginary closed surface we choose for our calculations is called a **Gaussian surface**. It is important to realize that this surface does not need to correspond to any physical object; it is a purely mathematical construct we place in space to evaluate the field.

### Understanding the Enclosed Charge ($q_{\text{enc}}$)

The term $q_{\text{enc}}$ refers strictly to the *net* charge residing inside the Gaussian surface.

```text
       Gaussian Surface (S)
        _ . - ~ ~ - . _
    . '                 ' .
  /        +q_1             \
 |            \              |
|              \--> E         |
|                             |
 |       -q_2                |
  \                         /
    ' . _             _ . '
          ~ - . . - ~

                              +q_3 (Outside)

```

In the scenario illustrated above, the Gaussian surface $S$ encloses two charges, $+q_1$ and $-q_2$. A third charge, $+q_3$, sits outside the surface.

* **Internal Charges:** The net enclosed charge is simply the algebraic sum of the charges inside: $q_{\text{enc}} = q_1 - q_2$. If $q_1 > q_2$, the net enclosed charge is positive, and the net flux through the surface will be outward (positive).
* **External Charges:** The charge $+q_3$ does not factor into $q_{\text{enc}}$. While $+q_3$ certainly creates its own electric field that passes through the surface $S$, every field line from $+q_3$ that enters the surface on one side must eventually exit the surface on the other side. The negative inward flux exactly cancels the positive outward flux, resulting in zero *net* flux contributed by any external charge.

**Crucial Distinction:** While only the *enclosed* charges dictate the *net flux* through the entire surface, the electric field $\vec{E}$ at any specific point on the boundary of the surface is the vector sum of the fields produced by **all** charges, both inside and outside.

### Verifying Gauss's Law for a Point Charge

To see how Gauss's Law emerges from concepts we already know, let us derive it for the simplest possible case: a single positive point charge $q$.

We begin by drawing a spherical Gaussian surface of radius $r$ centered perfectly on the point charge.

```text
             ^ dArea
             |
        _ . -|- ~ ~ - . _
    . '      |          ' .
  /          |              \
 |           | E             |
|            |                |
|            o +q             |
|           /                 |
 |         /                 |
  \       / r               /
    ' . _/            _ . '
          ~ - . . - ~

```

1. **Symmetry of the Electric Field:** From Coulomb's Law, we know the electric field of a point charge points radially outward. Because the sphere is centered on the charge, the electric field vector $\vec{E}$ at any point on the surface is perfectly perpendicular to the surface.
2. **Alignment with Area Vector:** By definition, the area vector $d\vec{A}$ for a closed surface also points radially outward. Therefore, at every point on the sphere, $\vec{E}$ and $d\vec{A}$ are parallel, and the angle $\theta$ between them is $0^\circ$.
3. **Evaluating the Dot Product:** Because they are parallel, the dot product simplifies to scalar multiplication: $\vec{E} \cdot d\vec{A} = E \, dA \cos(0^\circ) = E \, dA$.
4. **Constant Field Magnitude:** Furthermore, every point on the spherical surface is exactly the same distance $r$ from the charge. This means the magnitude of the electric field, $E$, is constant everywhere on the surface and can be pulled out of the integral:

$$\oint \vec{E} \cdot d\vec{A} = \oint E \, dA = E \oint dA$$

1. **Integrating the Area:** The integral of $dA$ over the entire surface of a sphere is simply the surface area of the sphere, $4\pi r^2$.

$$\Phi_E = E (4\pi r^2)$$

1. **Substituting Coulomb's Law:** We already know the magnitude of the electric field for a point charge is $E = \frac{1}{4\pi\epsilon_0} \frac{q}{r^2}$. Substituting this into our flux equation yields:

$$\Phi_E = \left( \frac{1}{4\pi\epsilon_0} \frac{q}{r^2} \right) (4\pi r^2)$$

Notice how the $4\pi$ and the $r^2$ terms cancel out perfectly, leaving us with:

$$\Phi_E = \frac{q}{\epsilon_0}$$

We have just proven Gauss's Law for a spherical surface enclosing a point charge. Remarkably, the radius $r$ cancelled out completely. This means the flux is identical whether the enclosing sphere is the size of a marble or the size of a galaxy. While we used a highly symmetric sphere for this proof, Gauss's brilliant mathematical contribution was proving that this relationship holds true for a closed surface of **any** conceivable shape.

## 19.3 Applications of Gauss's Law

Gauss's Law, $\oint \vec{E} \cdot d\vec{A} = q_{\text{enc}} / \epsilon_0$, is a universal truth of electromagnetism; it holds for any closed surface, regardless of its shape or the complexity of the enclosed charge distribution. However, evaluating the surface integral can be mathematically daunting if the electric field varies in magnitude and direction across the chosen surface.

The true power of Gauss's Law as a calculational tool emerges when we apply it to charge distributions exhibiting a high degree of spatial symmetry. By carefully selecting a Gaussian surface that mirrors the symmetry of the charge distribution, we can simplify the integral and easily solve for the electric field.

To achieve this, we must choose a Gaussian surface that satisfies one or more of the following conditions:

1. **Constant Magnitude:** The electric field vector $\vec{E}$ has a constant magnitude over the surface (or over well-defined portions of the surface) due to symmetry. This allows $E$ to be pulled outside the integral.
2. **Parallel Vectors:** The electric field vector $\vec{E}$ is parallel to the area vector $d\vec{A}$ ($\theta = 0^\circ$), so $\vec{E} \cdot d\vec{A} = E \, dA$.
3. **Perpendicular Vectors:** The electric field vector $\vec{E}$ is perpendicular to the area vector $d\vec{A}$ ($\theta = 90^\circ$), making the flux through that portion of the surface exactly zero ($\vec{E} \cdot d\vec{A} = 0$).

Let us explore the three primary types of symmetry: cylindrical, planar, and spherical.

### 1. Cylindrical Symmetry: The Infinite Line of Charge

Consider an infinitely long, straight wire carrying a uniform linear charge density $\lambda$ (charge per unit length). We wish to find the electric field at a radial distance $r$ from the wire.

Because the wire is infinite and uniform, the electric field must point radially outward from the wire (assuming positive charge). It cannot have a component parallel to the wire, because there is no physical difference between "up" or "down" the infinite wire. Furthermore, the magnitude of the field can only depend on the radial distance $r$, not on the angle around the wire.

We construct a cylindrical Gaussian surface of radius $r$ and arbitrary length $L$, coaxial with the wire.

```text
              Gaussian Cylinder
           . ------------------- .
      . '  |                     |  ' .
    /      |                     |      \
   |  <--- |---------------------| --->  | Area vector
 dA|   E   |  + + + + + + + + +  |   E   | dA (end cap)
   |       |    Line of charge   |       |
    \      |                     |      /
      ' .  |                     |  . '
           ' ------------------- '
               | Area vector dA
               V (barrel)

```

The Gaussian cylinder consists of three parts: two flat end caps and the curved barrel.

* **The End Caps:** The area vectors $d\vec{A}$ for the flat ends point parallel to the wire. The electric field $\vec{E}$ points radially outward. Thus, $\vec{E}$ and $d\vec{A}$ are everywhere perpendicular on the end caps, meaning the flux through the ends is zero.
* **The Barrel:** For the curved portion, $d\vec{A}$ points radially outward, exactly parallel to $\vec{E}$. Furthermore, every point on the barrel is at the same distance $r$ from the wire, so the magnitude of $E$ is constant.

Applying Gauss's Law:

$$\oint \vec{E} \cdot d\vec{A} = \int_{\text{barrel}} E \, dA = E \int_{\text{barrel}} dA = E(2\pi r L)$$

The charge enclosed by our Gaussian cylinder is the charge on the segment of the wire of length $L$: $q_{\text{enc}} = \lambda L$. Setting the flux equal to $q_{\text{enc}}/\epsilon_0$:

$$E(2\pi r L) = \frac{\lambda L}{\epsilon_0}$$

Solving for $E$, we see that the arbitrary length $L$ cancels out:

$$E = \frac{\lambda}{2\pi\epsilon_0 r}$$

### 2. Planar Symmetry: The Infinite Sheet of Charge

Imagine an infinite, flat sheet carrying a uniform surface charge density $\sigma$ (charge per unit area).

By symmetry, the electric field must be perpendicular to the sheet and point away from it on both sides (assuming $\sigma$ is positive). To exploit this, we choose a Gaussian surface in the shape of a "pillbox" (a small cylinder) that pierces the sheet, with its flat end faces of area $A$ parallel to the sheet and equidistant from it.

```text
               Area vector dA
               ^
               |   E
            . -|- .
          |         |
          |         |
--------- | - + + - | --------- Infinite Sheet (+σ)
          |         |
          |         |
            ' -|- '
               |   E
               V
               Area vector dA

```

* **The Sides:** The area vector of the curved side of the pillbox is parallel to the sheet. Because $\vec{E}$ is perpendicular to the sheet, it never pierces the sides of the pillbox. The flux through the sides is zero.
* **The End Faces:** There are two end faces. On each face, $\vec{E}$ and $d\vec{A}$ are parallel. Because both faces are at the same distance from the sheet, the magnitude of $E$ is the same. The total flux is the sum of the flux through both faces: $EA + EA = 2EA$.

The charge enclosed by the pillbox is simply the surface charge density multiplied by the area of the pillbox cross-section: $q_{\text{enc}} = \sigma A$.

$$2EA = \frac{\sigma A}{\epsilon_0}$$

Solving for $E$, the area $A$ cancels out:

$$E = \frac{\sigma}{2\epsilon_0}$$

Remarkably, the electric field produced by an infinite sheet of charge is uniform; it does not depend on the distance from the sheet.

### 3. Spherical Symmetry: The Uniformly Charged Insulating Sphere

Consider a solid insulating sphere of radius $R$ that has a total positive charge $Q$ uniformly distributed throughout its volume. Its volume charge density is $\rho = Q / (\frac{4}{3}\pi R^3)$. We must find the electric field both outside and inside the sphere.

**Outside the Sphere ($r \ge R$):**
We draw a spherical Gaussian surface of radius $r$ centered on the insulating sphere. As shown in Section 19.2, spherical symmetry dictates that $\vec{E}$ is radial and constant over the surface. The flux is $E(4\pi r^2)$.

Because $r \ge R$, the Gaussian surface completely encloses the entire insulating sphere, so $q_{\text{enc}} = Q$.

$$E(4\pi r^2) = \frac{Q}{\epsilon_0} \quad \Rightarrow \quad E = \frac{1}{4\pi\epsilon_0}\frac{Q}{r^2}$$

Outside any spherically symmetric charge distribution, the electric field behaves exactly as if all the charge were concentrated at a single point at the center.

**Inside the Sphere ($r < R$):**
We draw a new spherical Gaussian surface of radius $r$, where $r$ is smaller than the sphere's radius $R$. The symmetry arguments are identical, so the flux remains $E(4\pi r^2)$.

However, the enclosed charge is now only a fraction of the total charge. The volume enclosed by the Gaussian surface is $\frac{4}{3}\pi r^3$. The enclosed charge is the volume charge density multiplied by this enclosed volume:

$$q_{\text{enc}} = \rho V_{\text{enc}} = \left( \frac{Q}{\frac{4}{3}\pi R^3} \right) \left( \frac{4}{3}\pi r^3 \right) = Q \frac{r^3}{R^3}$$

Applying Gauss's Law:

$$E(4\pi r^2) = \frac{1}{\epsilon_0} \left( Q \frac{r^3}{R^3} \right)$$

$$E = \left(\frac{1}{4\pi\epsilon_0} \frac{Q}{R^3}\right) r$$

Inside a uniform spherical distribution of charge, the electric field drops to zero at the center ($r=0$) and increases linearly as you move outward toward the surface.

## 19.4 Electric Potential Energy

In Chapter 6, we learned that when a conservative force does work on an object, that work can be expressed as a negative change in the object's potential energy ($\Delta U = -W$). Because the electrostatic force described by Coulomb's Law is a conservative force—just like the gravitational force—we can assign a potential energy to a system of interacting charges. This is called **electric potential energy** ($U$).

Using energy concepts provides a powerful alternative to calculating complex vector forces. Because energy is a scalar quantity, analyzing a system using electric potential energy often vastly simplifies calculations.

### Work and Potential Energy

Consider a test charge $q_0$ moving through an electric field $\vec{E}$ created by some source charge distribution. The electric force exerted on the test charge is $\vec{F}_e = q_0\vec{E}$.

As the charge moves from an initial point $A$ to a final point $B$ along a path $d\vec{s}$, the work $W$ done by the electric force is the line integral of the force along that path:

$$W = \int_{A}^{B} \vec{F}_e \cdot d\vec{s} = \int_{A}^{B} q_0\vec{E} \cdot d\vec{s}$$

Because the electric force is conservative, this work depends only on the endpoints $A$ and $B$, not on the specific path taken between them. The change in the system's electric potential energy, $\Delta U$, is defined as the negative of the work done by the internal conservative force:

$$\Delta U = U_B - U_A = -W = -q_0 \int_{A}^{B} \vec{E} \cdot d\vec{s}$$

Just as with gravitational potential energy, only the *change* in electric potential energy is physically meaningful. We are free to define the zero point of potential energy ($U=0$) wherever it is most mathematically convenient.

### Potential Energy in a Uniform Electric Field

To build intuition, let us examine the simplest case: a positive charge $q$ moving in a uniform electric field $\vec{E}$, such as the field found between two large, oppositely charged parallel plates.

```text
  Positive Plate                       Negative Plate
       (+)                                  (-)
        |                                    |
        |  ---------- E (Field) ---------->  |
        |                                    |
        |                 O +q               |
        |                  \                 |
        |                   \ d (path)       |
        |                    \               |
        |                     v              |
        |                                    |

```

If the charge $q$ moves a straight-line distance $d$ in the exact direction of the electric field, the force and the displacement are parallel ($\theta = 0^\circ$). The work done by the electric field is simply $W = Fd = (qE)d$.

The change in electric potential energy is therefore:

$$\Delta U = -qEd$$

Because $\Delta U$ is negative, the system *loses* potential energy. This is entirely analogous to dropping a mass $m$ in a uniform gravitational field $g$; as it falls a distance $h$, the gravitational field does positive work ($mgh$), and the mass loses gravitational potential energy ($\Delta U = -mgh$).

Conversely, if an external agent forces the positive charge $q$ to move *against* the electric field, the electric field does negative work, and the potential energy of the system *increases*.

* **Positive charges** naturally accelerate in the direction of the electric field, moving toward lower potential energy.
* **Negative charges** naturally accelerate in the opposite direction of the electric field, also moving toward lower potential energy.

### Potential Energy of Two Point Charges

Now consider a system of two point charges, $q_1$ and $q_2$, separated by a distance $r$. We want to find the potential energy of this specific arrangement.

By convention, we define the zero point of electric potential energy to be when the charges are infinitely far apart ($r = \infty$, so $U = 0$). The potential energy $U$ at a separation distance $r$ is equal to the negative of the work done by the electric force as $q_2$ is brought from infinity to $r$.

Using Coulomb's Law for the electric force ($\vec{F} = \frac{1}{4\pi\epsilon_0} \frac{q_1 q_2}{r^2} \hat{r}$), the integral yields:

$$U = \frac{1}{4\pi\epsilon_0} \frac{q_1 q_2}{r}$$

Notice that this equation contains the algebraic signs of the charges $q_1$ and $q_2$. The sign of the potential energy tells us about the nature of the interaction:

1. **Like Charges (Both positive or both negative):** The product $q_1 q_2$ is positive, so $U$ is positive. Because they repel, you (an external agent) would have to do positive work to push them together from infinity. The system stores this work as positive potential energy.
2. **Opposite Charges (One positive, one negative):** The product $q_1 q_2$ is negative, so $U$ is negative. The attractive force between them does positive work as they come together. A negative potential energy indicates a *bound system* (like an electron bound to a proton in a hydrogen atom); you must add energy to the system to separate the charges to infinity.

### Potential Energy of a System of Multiple Charges

The electric potential energy of a system containing more than two charges is calculated using the principle of superposition. The total potential energy is the algebraic sum of the potential energies for every unique pair of interacting charges in the system.

Consider a system of three point charges: $q_1$, $q_2$, and $q_3$.

```text
                q1 (+)
                 /  \
            r12 /    \ r13
               /      \
          (-) q2 ----- q3 (+)
                  r23

```

The total electric potential energy $U$ is the sum of the pair $q_1$ & $q_2$, the pair $q_1$ & $q_3$, and the pair $q_2$ & $q_3$:

$$U = U_{12} + U_{13} + U_{23}$$

$$U = \frac{1}{4\pi\epsilon_0} \left( \frac{q_1 q_2}{r_{12}} + \frac{q_1 q_3}{r_{13}} + \frac{q_2 q_3}{r_{23}} \right)$$

This total scalar value $U$ represents the net work required by an external agent to assemble this exact configuration of charges by bringing them one by one from infinity to their final positions. Because $U$ is a scalar, we simply add the numbers, being careful to include the positive or negative signs of the charges. There is no need to break forces into $x$, $y$, and $z$ components.

## 19.5 Electric Potential and Equipotential Surfaces

In the previous section, we defined the electric potential energy ($U$) of a system of charges. While potential energy is incredibly useful, it depends on the specific charges involved in the interaction. It is often more advantageous to describe the electric environment created by a source charge distribution *independent* of any test charge placed within it. To do this, we introduce the concept of **electric potential**.

### Electric Potential and Potential Difference

The electric potential, denoted by $V$, is defined as the electric potential energy per unit charge. If a test charge $q_0$ placed at a point in an electric field has a potential energy $U$, the electric potential $V$ at that point is:

$$V = \frac{U}{q_0}$$

Because potential energy is a scalar quantity, electric potential is also a scalar. The SI unit of electric potential is the **volt** (V), named in honor of the Italian physicist Alessandro Volta. From the definition, we see that $1 \text{ V} = 1 \text{ J/C}$ (one joule per coulomb).

Just as with potential energy, the absolute value of electric potential at a single point is physically meaningless without a reference point; only the *difference* in electric potential between two points is physically significant.

The **potential difference**, $\Delta V$, between two points $A$ and $B$ is the change in potential energy per unit charge as a test charge moves between those points:

$$\Delta V = V_B - V_A = \frac{\Delta U}{q_0} = -\frac{W}{q_0}$$

Where $W$ is the work done by the electric field on the charge as it moves from $A$ to $B$. Potential difference is commonly referred to as **voltage**.

Because $\Delta U = -q_0 \int_{A}^{B} \vec{E} \cdot d\vec{s}$, we can express the potential difference directly in terms of the electric field:

$$\Delta V = -\int_{A}^{B} \vec{E} \cdot d\vec{s}$$

This equation shows that the electric field can be interpreted as a measure of the rate of change of the electric potential with respect to position. Consequently, the SI unit for electric field, the newton per coulomb (N/C), is mathematically equivalent to the volt per meter (V/m).

### Potential in a Uniform Electric Field

Consider two points $A$ and $B$ separated by a distance $d$ in a uniform electric field $\vec{E}$. If we move in the direction of the electric field from $A$ to $B$, the path vector $d\vec{s}$ and the field vector $\vec{E}$ are parallel ($\theta = 0^\circ$).

$$\Delta V = -\int_{A}^{B} E \, ds \cos(0^\circ) = -E \int_{A}^{B} ds = -Ed$$

The negative sign indicates that the electric potential decreases as you move in the direction of the electric field. Electric field lines always point from regions of higher potential toward regions of lower potential.

### Electric Potential of a Point Charge

To find the electric potential created by a single point charge $q$ at a distance $r$, we use the definition $\Delta V = -\int \vec{E} \cdot d\vec{s}$. By convention, we set the potential $V = 0$ at $r = \infty$. Integrating the electric field of a point charge ($E = \frac{1}{4\pi\epsilon_0}\frac{q}{r^2}$) from infinity to a distance $r$ yields:

$$V = \frac{1}{4\pi\epsilon_0} \frac{q}{r}$$

A positive point charge creates a positive electric potential everywhere in space (which decreases toward zero at infinity), while a negative point charge creates a negative electric potential everywhere in space (which increases toward zero at infinity).

For a system of multiple point charges, the total electric potential at a given point is simply the algebraic sum of the potentials created by each individual charge at that point:

$$V = \sum_{i} V_i = \frac{1}{4\pi\epsilon_0} \sum_{i} \frac{q_i}{r_i}$$

This is the principle of superposition applied to electric potential. Because $V$ is a scalar, this sum is much easier to evaluate than the vector sum required to find the net electric field.

### Equipotential Surfaces

We can visualize the electric potential in a region of space using **equipotential surfaces**. An equipotential surface is a three-dimensional surface on which every point has the same electric potential ($V = \text{constant}$).

Because the potential difference $\Delta V$ between any two points on an equipotential surface is zero, the work done by the electric field to move a charge along this surface is also zero ($W = -q_0 \Delta V = 0$).

For the work to be zero as a charge moves along a surface, the electric force (and thus the electric field) must be perfectly perpendicular to the displacement at every point. This leads to a fundamental rule of electrostatics:

**Electric field lines are always perpendicular to equipotential surfaces.**

```text
       Equipotential Surfaces in a Uniform Field

           100 V     80 V      60 V      40 V
             |         |         |         |
             |         |         |         |
     E ----------------------------------------->
             |         |         |         |
     E ----------------------------------------->
             |         |         |         |
     E ----------------------------------------->
             |         |         |         |
             |         |         |         |


```

In a uniform electric field, the equipotential surfaces are flat, parallel planes equally spaced apart, oriented perpendicular to the field lines.

```text
       Equipotential Surfaces for a Point Charge

                    . - ~ ~ ~ - .
                . '      |      ' .
              /       .-~|~-.       \
             |      /    |    \      |
             |     |     |     |     |
     E <-----------|---- +q ---|-----------> E
             |     |     |     |     |
             |      \    |    /      |
              \       `-_|_-'       /
                . '      |      ' .
                    ~ - _|_ - ~
                         |
                         V E

```

For an isolated point charge, the electric field lines point radially outward (or inward). The surfaces that are everywhere perpendicular to these radial lines are concentric spheres centered on the charge. As you move farther from the point charge, the equipotential surfaces for equal voltage steps become farther apart, indicating that the magnitude of the electric field is decreasing.

## 19.6 Calculating the Field from the Potential

In Section 19.5, we established how to find the electric potential $V$ if the electric field $\vec{E}$ is known, using the integral relationship $\Delta V = -\int \vec{E} \cdot d\vec{s}$. We now examine the reverse process: determining the electric field from a known electric potential distribution. Because finding the potential requires integration, finding the field from the potential requires the inverse mathematical operation: differentiation.

This reverse process is extraordinarily useful in physics. Because electric potential is a scalar quantity, it is often much easier to calculate the total potential $V$ of a complex charge distribution first (using algebraic superposition) and then take the derivative to find the vector electric field $\vec{E}$, rather than calculating the vector field directly.

### The One-Dimensional Case

Consider a region of space where the electric potential varies only along the $x$-axis, so $V = V(x)$.

Recall the differential form of the potential difference equation for an infinitesimal displacement $d\vec{s}$:

$$dV = -\vec{E} \cdot d\vec{s}$$

If we restrict our movement strictly along the $x$-axis, our displacement is $d\vec{s} = dx\,\hat{i}$. The electric field can be written in its component form as $\vec{E} = E_x\hat{i} + E_y\hat{j} + E_z\hat{k}$.

Evaluating the dot product for this specific movement yields:

$$dV = -(E_x\hat{i} + E_y\hat{j} + E_z\hat{k}) \cdot (dx\,\hat{i}) = -E_x\,dx$$

Solving for the $x$-component of the electric field gives:

$$E_x = -\frac{dV}{dx}$$

This equation states that the $x$-component of the electric field is equal to the negative of the rate of change of the electric potential with respect to $x$.

We can visualize this relationship using equipotential lines. Consider a uniform electric field where the potential decreases at a constant rate.

```text
       V = 20 V      V = 15 V      V = 10 V
          |             |             |
          |      E      |      E      |
          |   ------->  |   ------->  |
          |             |             |
       x = 0 m       x = 2 m       x = 4 m

```

Using our equation in discrete form ($E_x \approx -\frac{\Delta V}{\Delta x}$), we can calculate the field between $x=0$ and $x=2$ m:

$$E_x = -\frac{15\text{ V} - 20\text{ V}}{2\text{ m} - 0\text{ m}} = -\frac{-5\text{ V}}{2\text{ m}} = +2.5\text{ V/m}$$

The positive result indicates that the electric field points in the $+x$ direction, which perfectly aligns with the rule established in Section 19.5: electric fields point in the direction of decreasing potential.

Furthermore, this relationship explains why the spacing of equipotential lines indicates the strength of the field. If equipotential lines for equal voltage steps (e.g., every 5 V) are packed closely together, $dx$ is very small, making the derivative $dV/dx$ very large. Therefore, densely packed equipotential surfaces indicate a strong electric field, while widely spaced surfaces indicate a weak field.

### The Three-Dimensional Case and the Gradient

In a general three-dimensional space, the electric potential is a function of all three coordinates: $V = V(x, y, z)$.

If we displace a test charge by an arbitrary infinitesimal amount $d\vec{s} = dx\,\hat{i} + dy\,\hat{j} + dz\,\hat{k}$, the change in potential is:

$$dV = -\vec{E} \cdot d\vec{s} = -(E_x\,dx + E_y\,dy + E_z\,dz)$$

From multivariate calculus, the total differential $dV$ of a function $V(x,y,z)$ is defined using partial derivatives:

$$dV = \frac{\partial V}{\partial x}dx + \frac{\partial V}{\partial y}dy + \frac{\partial V}{\partial z}dz$$

Comparing these two expressions for $dV$ term by term, we obtain the components of the electric field:

$$E_x = -\frac{\partial V}{\partial x}, \quad E_y = -\frac{\partial V}{\partial y}, \quad E_z = -\frac{\partial V}{\partial z}$$

*(Note: The partial derivative symbol $\partial$ means that when taking the derivative with respect to one variable, such as $x$, all other variables, $y$ and $z$, are treated as constants).*

We can combine these components back into the full electric field vector:

$$\vec{E} = -\left( \frac{\partial V}{\partial x}\hat{i} + \frac{\partial V}{\partial y}\hat{j} + \frac{\partial V}{\partial z}\hat{k} \right)$$

The mathematical operation in the parentheses is known as the **gradient** of the scalar function $V$. It is commonly denoted by the "del" operator ($\nabla$). Thus, the relationship between the electric field and the electric potential is compactly written as:

$$\vec{E} = -\nabla V$$

### Physical Interpretation of the Gradient

The gradient of a scalar function produces a vector that points in the direction of the maximum spatial rate of increase of that function.

Because of the negative sign in the equation $\vec{E} = -\nabla V$, the electric field vector always points in the direction of the **maximum rate of decrease** of the electric potential.

Imagine standing on a hillside, where your altitude represents the electric potential $V$.

* The equipotential lines are the topographical contour lines of the hill (paths where your altitude doesn't change).
* If you drop a ball, it will naturally roll straight down the steepest part of the hill.
* The direction the ball rolls is the direction of the electric field $\vec{E}$.
* The steepness of the hill at your exact location is the magnitude of the electric field.

## Chapter Summary

* **Electric Flux ($\Phi_E$):** A measure of the number of electric field lines passing through a surface. For a uniform field and flat surface, $\Phi_E = \vec{E} \cdot \vec{A} = EA\cos\theta$. For a varying field or curved surface, it is the surface integral $\Phi_E = \int \vec{E} \cdot d\vec{A}$.
* **Gauss's Law:** States that the net electric flux through any hypothetical closed surface (Gaussian surface) is directly proportional to the net charge enclosed within it: $\oint \vec{E} \cdot d\vec{A} = \frac{q_{\text{enc}}}{\epsilon_0}$. It is most useful for calculating electric fields of highly symmetric charge distributions (planar, cylindrical, spherical).
* **Electric Potential Energy ($U$):** The energy stored in a system of charges due to their electrostatic interactions. The change in potential energy is the negative of the work done by the electric force: $\Delta U = -W$. For two point charges, $U = \frac{1}{4\pi\epsilon_0} \frac{q_1 q_2}{r}$.
* **Electric Potential ($V$):** The electric potential energy per unit charge: $V = \frac{U}{q_0}$. The potential difference (voltage) between two points is $\Delta V = -\int \vec{E} \cdot d\vec{s}$. For a point charge, $V = \frac{1}{4\pi\epsilon_0} \frac{q}{r}$.
* **Equipotential Surfaces:** Surfaces composed of points that all have the exact same electric potential. Electric field lines are always perfectly perpendicular to equipotential surfaces and point from higher potential to lower potential.
* **Calculating Field from Potential:** The electric field is the negative gradient of the electric potential: $\vec{E} = -\nabla V$. In one dimension, this simplifies to $E_x = -\frac{dV}{dx}$. The field points in the direction of the steepest decrease in potential.
