We know magnetic fields exert forces on moving charges, but what creates these fields? Just as stationary charges produce electric fields, moving charges and steady currents generate magnetic fields. This chapter uncovers the fundamental laws governing their creation. We begin with the Biot-Savart law to calculate the magnetic field from any current distribution. For symmetric systems, we introduce Ampère’s law, a powerful tool analogous to Gauss's law. After applying these laws to parallel wires and solenoids, we conclude by exploring the atomic origins of magnetism to understand how solid matter interacts with and creates magnetic fields.

## 23.1 The Biot-Savart Law

In Chapter 18, we established that a stationary electric charge produces an electric field in the space around it, which can be calculated using Coulomb's law. When electric charges are in motion, they constitute an electric current. Just as a stationary charge is the fundamental source of an electric field, a moving charge—and by extension, an electric current—is the fundamental source of a magnetic field.

Shortly after Hans Christian Ørsted discovered in 1820 that a compass needle is deflected by a current-carrying conductor, Jean-Baptiste Biot and Félix Savart performed quantitative experiments on the force exerted by an electric current on a nearby magnet. From their experimental results, they deduced a mathematical expression that gives the magnetic field at some point in space in terms of the current that produces the field. This expression is now known as the **Biot-Savart Law**.

### The Mathematical Formulation

Consider a wire carrying a steady (time-independent) current $I$. We want to determine the magnetic field $d\mathbf{B}$ at a specific point $P$ created by a very small segment of the wire. We define a vector length element $d\mathbf{s}$ whose magnitude is the length of the differential segment and whose direction is that of the current $I$.

The Biot-Savart Law states that the differential magnetic field $d\mathbf{B}$ at point $P$ due to the current element $I d\mathbf{s}$ is given by:

$$d\mathbf{B} = \frac{\mu_0}{4\pi} \frac{I d\mathbf{s} \times \mathbf{\hat{r}}}{r^2}$$

Let us break down the components of this fundamental equation:

* $d\mathbf{B}$ is the differential magnetic field vector at point $P$.
* $I$ is the steady current flowing through the wire.
* $d\mathbf{s}$ is the differential vector length element pointing in the direction of the current.
* $r$ is the distance from the current element to point $P$.
* $\mathbf{\hat{r}}$ is the unit vector pointing from the current element $d\mathbf{s}$ toward point $P$.
* $\mu_0$ is a proportionality constant known as the **permeability of free space**.

The constant $\mu_0$ has an exact defined value in the SI system:

$$\mu_0 = 4\pi \times 10^{-7} \text{ T}\cdot\text{m/A}$$

### Vector Relationships and Direction

The cross product in the numerator, $d\mathbf{s} \times \mathbf{\hat{r}}$, mathematically enforces several critical observations made by Biot and Savart:

1. The vector $d\mathbf{B}$ is perpendicular to both $d\mathbf{s}$ (the direction of the current) and $\mathbf{\hat{r}}$ (the vector directed from the element to the point of interest).
2. The magnitude of $d\mathbf{B}$ is inversely proportional to $r^2$, displaying an inverse-square relationship identical to Coulomb's law.
3. The magnitude of $d\mathbf{B}$ is proportional to the current $I$ and the length $ds$.
4. The magnitude of $d\mathbf{B}$ is proportional to $\sin\theta$, where $\theta$ is the angle between the vectors $d\mathbf{s}$ and $\mathbf{\hat{r}}$. Thus, the magnetic field is zero along the line defined by the wire itself ($\theta = 0^\circ$ or $180^\circ$) and reaches a maximum when point $P$ is perpendicular to the wire segment ($\theta = 90^\circ$).

To find the direction of $d\mathbf{B}$ without formally calculating the cross product, you can use the right-hand rule established in Section 9.1: point the fingers of your right hand in the direction of the current element $d\mathbf{s}$, curl them toward the point $P$ (the direction of $\mathbf{\hat{r}}$), and your extended thumb will point in the direction of $d\mathbf{B}$.

```text
Visualizing the Vectors:

                 d\mathbf{B} (points INTO the page, denoted by 'x')
                  x P
                  |
                  | r
                  |
                  | \theta
        ----------+---------> I
                 d\mathbf{s}

If point P were located above the wire in this plane, d\mathbf{B} 
would point OUT of the page (denoted by a dot '.').

```

### Calculating the Total Magnetic Field

The Biot-Savart Law gives the magnetic field produced by only a differential segment of a continuous current. To find the total magnetic field $\mathbf{B}$ created at a point by a circuit of finite size, we must sum up the contributions from all current elements $I d\mathbf{s}$ that make up the circuit. Because the magnetic field obeys the superposition principle, we evaluate this sum by integrating over the entire path of the current:

$$\mathbf{B} = \frac{\mu_0 I}{4\pi} \int \frac{d\mathbf{s} \times \mathbf{\hat{r}}}{r^2}$$

When performing this integration, it is crucial to remember that the integral is a vector sum. Depending on the geometry of the wire, the direction of $d\mathbf{B}$ may change for different segments $d\mathbf{s}$, meaning you must carefully decompose the vectors into Cartesian components before integrating.

### Application: Magnetic Field at the Center of a Circular Loop

A classic application of the Biot-Savart Law is finding the magnetic field at the exact center of a circular wire loop of radius $R$ carrying a steady current $I$.

Let the loop lie in the $xy$-plane with its center at the origin. We want to find $\mathbf{B}$ at the origin.

1. **Analyze the vectors:** For any infinitesimal segment $d\mathbf{s}$ on the ring, the vector points tangentially along the circle. The unit vector $\mathbf{\hat{r}}$ points from the wire toward the center (the origin).
2. **Determine the angle:** Because the tangent to a circle is always perpendicular to the radial line drawn to the point of tangency, the angle $\theta$ between $d\mathbf{s}$ and $\mathbf{\hat{r}}$ is exactly $90^\circ$ for all segments around the loop.
3. **Evaluate the cross product:** The magnitude of the cross product simplifies beautifully: $|d\mathbf{s} \times \mathbf{\hat{r}}| = ds (1) \sin(90^\circ) = ds$.
4. **Determine the direction:** Using the right-hand rule, if the current flows counterclockwise, $d\mathbf{s} \times \mathbf{\hat{r}}$ points entirely in the positive $z$-direction (out of the page) for *every* segment of the ring. Since all $d\mathbf{B}$ vectors point in the same direction, we can simply integrate their magnitudes.

The distance $r$ from any segment to the center is simply the radius of the loop, $R$. Substituting these into the Biot-Savart Law yields:

$$dB = \frac{\mu_0 I}{4\pi} \frac{ds}{R^2}$$

Since $\mu_0$, $I$, and $R$ are constants, we can pull them out of the integral:

$$B = \int dB = \frac{\mu_0 I}{4\pi R^2} \oint ds$$

The integral $\oint ds$ is simply the total arc length of the circular loop, which is its circumference, $2\pi R$.

$$B = \frac{\mu_0 I}{4\pi R^2} (2\pi R) = \frac{\mu_0 I}{2R}$$

This result gives the magnitude of the magnetic field at the center of a single circular loop. If we have a tightly wound coil of $N$ identical turns, the fields from each turn superimpose, and the total magnetic field at the center becomes $B = \frac{\mu_0 N I}{2R}$.

## 23.2 The Magnetic Force Between Two Parallel Conductors

In Chapter 22, we learned that a magnetic field exerts a force on a current-carrying conductor. In Section 23.1, we established via the Biot-Savart Law that a current-carrying conductor *produces* a magnetic field. Combining these two concepts leads to an important conclusion: two current-carrying conductors placed near each other will exert magnetic forces on one another.

To analyze this interaction, we will look at the simplest and most common geometry: two long, straight, parallel wires separated by a distance $d$ and carrying steady currents $I_1$ and $I_2$.

### The Magnetic Field of a Long, Straight Wire

Before determining the force between the wires, we must know the magnetic field produced by one of them. By integrating the Biot-Savart Law for an infinitely long, straight wire carrying a current $I$, it can be shown that the magnitude of the magnetic field at a perpendicular distance $r$ from the wire is:

$$B = \frac{\mu_0 I}{2\pi r}$$

The magnetic field lines form concentric circles around the wire. The direction of the field is given by the **Right-Hand Rule**: if you point your right thumb in the direction of the current, your fingers curl in the direction of the circular magnetic field lines.

### Calculating the Force Between the Wires

Let us place two long, straight, parallel wires, Wire 1 and Wire 2, a distance $d$ apart. Wire 1 carries current $I_1$ and Wire 2 carries current $I_2$.

We can determine the force on Wire 2 by treating it as a conductor sitting in the external magnetic field created by Wire 1.

1. **The Field from Wire 1:** The current $I_1$ produces a magnetic field $\mathbf{B}_1$ at the location of Wire 2. Because Wire 2 is at a distance $d$ from Wire 1, the magnitude of this field is:

$$B_1 = \frac{\mu_0 I_1}{2\pi d}$$

1. **The Force on Wire 2:** Wire 2, which carries current $I_2$ and has length $L$, experiences a magnetic force due to $\mathbf{B}_1$. From Chapter 22, the magnetic force on a straight wire is $\mathbf{F} = I \mathbf{L} \times \mathbf{B}$. Because the wires are parallel, the current in Wire 2 is perfectly perpendicular to the magnetic field lines generated by Wire 1 at that location ($\theta = 90^\circ$). The magnitude of the force on a length $L$ of Wire 2 is therefore:

$$F_2 = I_2 L B_1$$

1. **Combining the Equations:** Substituting the expression for $B_1$ into the force equation gives the magnitude of the magnetic force between the two wires:

$$F_2 = I_2 L \left( \frac{\mu_0 I_1}{2\pi d} \right) = \frac{\mu_0 I_1 I_2}{2\pi d} L$$

Because the wires are assumed to be very long, it is usually more practical to express this interaction as the **magnetic force per unit length** ($F/L$), which is constant along the wires:

$$\frac{F}{L} = \frac{\mu_0 I_1 I_2}{2\pi d}$$

By Newton's Third Law, Wire 2 exerts an equal and opposite force on Wire 1. If we repeat the calculation for the force Wire 2 exerts on Wire 1, we will find exactly the same magnitude: $F_1 = F_2$.

### Direction of the Force: Attraction and Repulsion

The direction of the force depends on the relative directions of the two currents. We can determine this by applying the Right-Hand Rule twice: first to find the direction of the magnetic field, and second to find the direction of the force ($\mathbf{F} = I \mathbf{L} \times \mathbf{B}$).

* **Parallel Currents (Attraction):** If $I_1$ and $I_2$ flow in the *same* direction, the magnetic field $\mathbf{B}_1$ at Wire 2 points inward (perpendicular to the wire). Applying the right-hand rule for the cross product $\mathbf{L} \times \mathbf{B}_1$ yields a force vector $\mathbf{F}_2$ pointing *toward* Wire 1. Thus, **parallel currents attract each other**.
* **Antiparallel Currents (Repulsion):** If $I_1$ and $I_2$ flow in *opposite* directions, the force vectors point away from the opposing wires. Thus, **antiparallel currents repel each other**.

```text
Visualizing the Forces:

      CASE A: Parallel Currents             CASE B: Antiparallel Currents
           (Attraction)                              (Repulsion)

       I_1 ^             ^ I_2                   I_1 ^             | I_2
           |             |                           |             |
           |             |                           |             v
           |  F_1   F_2  |                      F_1  |             |  F_2
           | -----> <-----|                   <----- |             | ----->
           |             |                           |             |
           |             |                           |             |
        Wire 1        Wire 2                      Wire 1        Wire 2

(Note: The force vectors F_1 and F_2 are equal in magnitude in both cases.)

```

### The Historical Definition of the Ampere

The equation for the force per unit length between parallel wires is more than just a standard calculation; for decades, it served as the official operational definition of the SI unit of electric current, the **ampere** (A).

Historically (from 1948 until 2019), the ampere was defined as follows:

> *If two long, parallel wires separated by a distance of exactly 1 meter in a vacuum carry identical currents, the current in each wire is defined to be exactly 1 ampere if the magnetic force per unit length between them is exactly $2 \times 10^{-7} \text{ N/m}$.*

You can verify this historically defined value by plugging $I_1 = I_2 = 1 \text{ A}$, $d = 1 \text{ m}$, and $\mu_0 = 4\pi \times 10^{-7} \text{ T}\cdot\text{m/A}$ into the force per unit length equation.

*(Note: In 2019, the SI system was redefined, and the ampere is now defined by fixing the elementary charge $e$ to an exact numerical value. However, the operational relationship between current and magnetic force remains practically identical in laboratory settings.)*

## 23.3 Ampère's Law

In Chapter 19, we saw that Gauss's law provides a powerful, elegant alternative to Coulomb's law for calculating electric fields when the charge distribution possesses a high degree of symmetry. A similar relationship exists for magnetic fields. While the Biot-Savart law can be used to calculate the magnetic field from any given current distribution, it often requires complex vector calculus. For current distributions with a high degree of symmetry, a much simpler method exists, formulated by the French physicist André-Marie Ampère.

Ampère's law relates the magnetic field along a closed loop to the electric current passing through the surface defined by that loop.

### The Line Integral of a Magnetic Field

To understand Ampère's law, we first define a mathematical operation: the line integral of the magnetic field vector $\mathbf{B}$ around a closed path.

Imagine an arbitrary, imaginary closed loop in space—often called an **Amperian loop**. We divide this loop into infinitesimal vector segments $d\mathbf{s}$ pointing along the path. At each segment, we evaluate the dot product of the magnetic field $\mathbf{B}$ and the path segment $d\mathbf{s}$. Finally, we sum all these dot products around the entire closed loop:

$$\oint \mathbf{B} \cdot d\mathbf{s}$$

The circle on the integral sign indicates that the integration is performed over a continuous, completely closed path. The dot product $\mathbf{B} \cdot d\mathbf{s}$ means that only the component of the magnetic field parallel to the path segment contributes to the integral.

### Statement of Ampère's Law

Ampère's law states that the line integral of $\mathbf{B} \cdot d\mathbf{s}$ around any closed path is directly proportional to the net steady current $I_{\text{enc}}$ passing through any surface bounded by that closed path.

Mathematically, Ampère's law is expressed as:

$$\oint \mathbf{B} \cdot d\mathbf{s} = \mu_0 I_{\text{enc}}$$

Where:

* $\oint \mathbf{B} \cdot d\mathbf{s}$ is the line integral of the magnetic field around the closed Amperian loop.
* $\mu_0$ is the permeability of free space.
* $I_{\text{enc}}$ is the net current enclosed by the loop.

### Evaluating the Enclosed Current

The term $I_{\text{enc}}$ requires careful accounting of directions. A single closed loop might enclose multiple wires carrying currents in different directions. Furthermore, currents flowing outside the loop do *not* contribute to $I_{\text{enc}}$, even though they may contribute to the magnetic field $\mathbf{B}$ at various points along the path.

```text
Visualizing an Amperian Loop:

                 Amperian Loop (Integration Path)
                    _ _ - > - _ _ 
                 /                 \
                |    (I_1 x)        |      (I_3 x)  <-- Outside
                v                   ^
                |         (I_2 .)   |
                 \                 /
                   - _ _ < _ _ - 

Currents:
(x) indicates current flowing INTO the page.
(.) indicates current flowing OUT of the page.

```

To determine the correct sign (+ or -) for each enclosed current, we use a specific **Right-Hand Rule**:

1. Curl the fingers of your right hand in the direction you choose to integrate around the Amperian loop (the direction of the $d\mathbf{s}$ vectors).
2. Your extended right thumb points in the direction of *positive* current.

Applying this rule to the diagram above, if we integrate clockwise, our thumb points into the page. Therefore, currents going into the page are positive, and currents coming out of the page are negative.

* $I_1$ is positive (flows into the page).
* $I_2$ is negative (flows out of the page).
* $I_3$ is not enclosed by the loop, so it is ignored.

For this specific loop, $I_{\text{enc}} = I_1 - I_2$.

### Application: Magnetic Field of a Long, Straight Wire

The true utility of Ampère's law lies in calculating magnetic fields for highly symmetric geometries. Let us use it to find the magnetic field at a distance $r$ from a long, straight, cylindrical wire carrying a steady current $I$. (We derived this in Section 23.2 using the Biot-Savart law and Newton's Third Law, but Ampère's law provides a much more direct proof).

1. **Choose an Amperian loop:** We must select a path that takes advantage of the system's symmetry. Because a straight wire has cylindrical symmetry, we choose a circular Amperian loop of radius $r$ centered on the wire, lying in a plane perpendicular to the wire.
2. **Analyze the dot product:** Based on symmetry and the right-hand rule, the magnetic field $\mathbf{B}$ must point in concentric circles around the wire. Therefore, at every point on our circular Amperian loop, $\mathbf{B}$ is parallel to the path segment $d\mathbf{s}$. The dot product simplifies: $\mathbf{B} \cdot d\mathbf{s} = B ds \cos(0^\circ) = B ds$.
3. **Evaluate the integral:** Because every point on the circular loop is the same distance $r$ from the wire, the magnitude of the magnetic field $B$ must be constant everywhere along the path. We can pull it out of the integral:

$$\oint \mathbf{B} \cdot d\mathbf{s} = \oint B ds = B \oint ds$$

The integral $\oint ds$ is simply the total circumference of the circular loop, $2\pi r$. Therefore, the left side of Ampère's law evaluates to $B(2\pi r)$.
4. **Apply Ampère's Law:** The net current enclosed by this loop is simply the total current in the wire, $I$. Setting the left side equal to $\mu_0 I_{\text{enc}}$ yields:

$$B(2\pi r) = \mu_0 I$$

1. **Solve for B:**

$$B = \frac{\mu_0 I}{2\pi r}$$

In just a few steps of algebra, Ampère's law yields the exact same result that required setting up a complex integral using the Biot-Savart law. However, it is important to remember the limitation of Ampère's law: while the law is *always* true, it is only *useful* for calculating magnetic fields when the physical system possesses enough symmetry to pull $B$ out of the integral. If the current distribution lacks symmetry (like a short, bent piece of wire), you must rely on the Biot-Savart law.

## 23.4 The Magnetic Field of a Solenoid and Toroid

Ampère's law is most powerful when applied to highly symmetric current distributions. Two of the most important practical applications of Ampère's law are determining the magnetic fields inside a solenoid and a toroid. These devices are ubiquitous in electronics and electromagnetism, serving as the magnetic equivalents of capacitors—they are designed to store magnetic energy and create specific, controlled magnetic fields.

### The Solenoid

A **solenoid** is a long wire wound in the form of a tightly packed helix. When carrying a steady current $I$, the solenoid acts like an electromagnet, generating a magnetic field.

To understand the field of a solenoid, consider the superposition of the fields created by each individual turn of the wire. Inside the solenoid, the magnetic field vectors from each turn point in the same direction, adding together to create a strong field. In the space between the turns, the fields tend to cancel out. Outside the solenoid, the field lines spread out over a large volume, meaning the external magnetic field is relatively weak.

In an **ideal solenoid**—one that is infinitely long and whose turns are tightly packed—the internal magnetic field is perfectly uniform and parallel to the central axis, while the external magnetic field is exactly zero. Real solenoids approximate this ideal behavior well, especially near their centers and when their length is much greater than their radius.

We can use Ampère's law to calculate the uniform magnetic field inside an ideal solenoid.

```text
Cross-Section of an Ideal Solenoid:

        (.)  (.)  (.)  (.)  (.)  (.)  (.)  (.)   <-- Current OUT of page
        --------------------------------------
                             |
         Magnetic Field (B)  |   Path 2
         ------------------->V 
           a +-----------------------+ b
             |                       |
      Path 4 |    Amperian Loop      | Path 3
             |                       |
           d +-----------------------+ c
        
        --------------------------------------
        (x)  (x)  (x)  (x)  (x)  (x)  (x)  (x)   <-- Current INTO page

(Path 1 is the segment from a to b, inside the solenoid.)

```

Let us choose a rectangular Amperian loop $abcd$ of length $L$ and width $w$, positioned such that side $ab$ (Path 1) is entirely inside the solenoid and parallel to its axis, while side $cd$ is entirely outside. We evaluate the line integral $\oint \mathbf{B} \cdot d\mathbf{s}$ around this closed path by breaking it into four segments:

$$\oint \mathbf{B} \cdot d\mathbf{s} = \int_a^b \mathbf{B} \cdot d\mathbf{s} + \int_b^c \mathbf{B} \cdot d\mathbf{s} + \int_c^d \mathbf{B} \cdot d\mathbf{s} + \int_d^a \mathbf{B} \cdot d\mathbf{s}$$

Let's evaluate each term based on the properties of an ideal solenoid:

1. **Path $a \rightarrow b$:** The magnetic field $\mathbf{B}$ is uniform and parallel to $d\mathbf{s}$. The integral simplifies to $BL$.
2. **Path $b \rightarrow c$:** This path is perpendicular to the magnetic field. Therefore, $\mathbf{B} \cdot d\mathbf{s} = 0$, and the integral is zero.
3. **Path $c \rightarrow d$:** This path lies completely outside the ideal solenoid, where $\mathbf{B} = 0$. The integral is zero.
4. **Path $d \rightarrow a$:** Like path $b \rightarrow c$, this is perpendicular to the internal field and exists in the zero-field region outside. The integral is zero.

The entire line integral thus reduces strictly to the contribution from the inner path:

$$\oint \mathbf{B} \cdot d\mathbf{s} = BL$$

Next, we evaluate the enclosed current, $I_{\text{enc}}$. If the rectangular loop has length $L$, and the solenoid has $N$ turns of wire enclosed within that length, the total current passing through the Amperian loop is $N$ times the current $I$ in a single wire:

$$I_{\text{enc}} = NI$$

Applying Ampère's law ($\oint \mathbf{B} \cdot d\mathbf{s} = \mu_0 I_{\text{enc}}$), we get:

$$BL = \mu_0 NI$$

Dividing by $L$ gives the magnitude of the magnetic field inside the solenoid:

$$B = \mu_0 \frac{N}{L} I$$

It is standard convention to define a lowercase $n$ as the **number of turns per unit length** ($n = N/L$). The equation is most commonly written as:

$$B = \mu_0 n I$$

This result demonstrates that the magnetic field inside an ideal solenoid is independent of the distance from the central axis; it is uniform everywhere inside the coils.

### The Toroid

A **toroid** can be thought of as a solenoid that has been bent into a circle, forming a doughnut shape. Toroids are highly useful because, unlike straight solenoids, they have no "ends" for magnetic field lines to "leak" out of. The magnetic field is completely confined within the volume of the torus.

```text
Top-Down View of a Toroid:

               . - ~ ~ ~ - . 
             /   (x) (x) (x)   \
            | (x)  . - - .  (x) |
           | (x) /   (.)   \ (x) |  <-- Inner turns: Current OUT
           | (x)|    (.)    |(x) |
           | (x) \   (.)   / (x) |
            | (x)  ` - - '  (x) |
             \   (x) (x) (x)   /    <-- Outer turns: Current INTO page
               ` - _ _ _ - '
                   
      (The dashed line inside represents a circular Amperian loop of radius r)

```

Consider a toroid consisting of $N$ tightly wound turns carrying a steady current $I$. By symmetry, the magnetic field lines inside the toroid must form concentric circles.

To find the magnetic field at a distance $r$ from the central axis (where $r$ is a point inside the hollow volume of the doughnut), we choose a circular Amperian loop of radius $r$, concentric with the toroid.

Because the magnetic field $\mathbf{B}$ is everywhere tangent to this circular path, the dot product $\mathbf{B} \cdot d\mathbf{s}$ is simply $B ds$. Furthermore, by symmetry, the magnitude of $\mathbf{B}$ is constant everywhere along this loop. We can evaluate the line integral:

$$\oint \mathbf{B} \cdot d\mathbf{s} = \oint B ds = B \oint ds = B(2\pi r)$$

Now we determine the enclosed current. Every single turn of the toroid passes through the surface bounded by our Amperian loop exactly once. Since there are $N$ turns, each carrying current $I$, the total enclosed current is:

$$I_{\text{enc}} = NI$$

Equating the two sides according to Ampère's law:

$$B(2\pi r) = \mu_0 NI$$

Solving for the magnetic field magnitude $B$ yields:

$$B = \frac{\mu_0 NI}{2\pi r}$$

Notice that unlike the solenoid, the magnetic field inside a toroid is **not strictly uniform**. Because $B$ is inversely proportional to $r$, the magnetic field is slightly stronger near the inner edge of the torus than it is near the outer edge. However, if the cross-sectional diameter of the toroid is very small compared to its overall radius $r$, the field can often be treated as approximately uniform across its interior cross-section.

If we choose an Amperian loop completely outside the toroid (either smaller than the inner radius or larger than the outer radius), the net enclosed current is zero. (For a loop larger than the toroid, every wire going *up* through the loop is perfectly balanced by a wire going *down*). Thus, according to Ampère's law, the ideal magnetic field everywhere outside a toroid is identically zero.

## 23.5 Magnetism in Matter

Up to this point, we have primarily considered magnetic fields in a vacuum, generated by macroscopic currents in wires. However, when matter is placed in a magnetic field, the material itself alters the total magnetic field in its vicinity. To understand how this happens, we must look at the microscopic structure of atoms and the fundamental origins of magnetic fields.

### The Atomic Origins of Magnetism

Just as macroscopic loops of wire generate magnetic fields, microscopic currents within atoms also generate magnetic fields. Every atom contains electrons that exhibit two specific quantum mechanical properties that contribute to the atom's total magnetic dipole moment:

1. **Orbital Magnetic Moment:** Electrons can be thought of as orbiting the atomic nucleus. This motion constitutes a tiny, microscopic current loop, producing a magnetic dipole moment analogous to the field at the center of a circular wire (Section 23.1).
2. **Spin Magnetic Moment:** Electrons possess an intrinsic quantum property called *spin*. While an electron is not literally spinning like a top, it behaves as if it were a rotating sphere of charge, producing its own intrinsic magnetic dipole moment. In most magnetic materials, electron spin is the dominant contributor to macroscopic magnetism.

In many atoms, the magnetic moments of paired electrons point in opposite directions, perfectly canceling each other out. Atoms with completely filled electron shells have a net magnetic moment of zero. However, atoms with partially filled shells (such as iron, nickel, or rare-earth elements) possess an unpaired electron, giving the atom a net, permanent magnetic dipole moment.

### The Magnetization Vector

When a material is placed in an external magnetic field $\mathbf{B}_0$, the atomic dipoles within the material interact with the field. The state of magnetic polarization of the material is described by the **magnetization vector**, $\mathbf{M}$, defined as the magnetic dipole moment per unit volume.

The total magnetic field $\mathbf{B}$ inside a material is the vector sum of the external applied field $\mathbf{B}_0$ and the additional field generated by the magnetized material itself, $\mu_0 \mathbf{M}$:

$$\mathbf{B} = \mathbf{B}_0 + \mu_0 \mathbf{M}$$

For a large class of materials, the induced magnetization is directly proportional to the applied field. This linear relationship is expressed as:

$$\mathbf{M} = \chi \frac{\mathbf{B}_0}{\mu_0}$$

Here, $\chi$ (the Greek letter chi) is a dimensionless proportionality constant called the **magnetic susceptibility** of the material. By substituting this back into our total field equation, we can write the total field as:

$$\mathbf{B} = \mathbf{B}_0 (1 + \chi) = \frac{\mu}{\mu_0} \mathbf{B}_0$$

Where $\mu = \mu_0(1 + \chi)$ is the **magnetic permeability** of the material. Depending on the value of $\chi$, materials are classified into three primary categories of magnetism: diamagnetism, paramagnetism, and ferromagnetism.

### 1. Diamagnetism

In **diamagnetic** materials, atoms do not possess permanent magnetic dipole moments. However, when an external magnetic field is applied, it induces a slight change in the orbital motion of the electrons. According to Lenz's Law (which we will explore thoroughly in Chapter 24), this induced change creates a small magnetic moment that *opposes* the applied external field.

As a result, diamagnetic materials have a small, negative magnetic susceptibility ($\chi < 0$, typically on the order of $-10^{-5}$).

* They are weakly repelled by regions of strong magnetic fields.
* Because this effect relies purely on orbital motion, diamagnetism is present in *all* matter. However, it is so weak that it is usually entirely masked if the material exhibits paramagnetism or ferromagnetism. Examples include copper, water, and living tissue.

### 2. Paramagnetism

In **paramagnetic** materials, atoms or molecules do possess permanent magnetic dipole moments. In the absence of an external field, thermal agitation causes these dipoles to orient randomly, resulting in a net magnetization of zero ($\mathbf{M} = 0$).

When an external magnetic field is applied, it exerts a torque on the atomic dipoles (Section 22.4), tending to align them parallel to the field. This alignment creates a net internal magnetic field that *adds* to the external field.

* Paramagnetic materials have a small, positive magnetic susceptibility ($\chi > 0$, typically $10^{-5}$ to $10^{-3}$).
* They are weakly attracted to regions of strong magnetic fields.
* The degree of alignment competes with thermal randomization, so paramagnetism decreases as temperature increases. Examples include aluminum, platinum, and liquid oxygen.

### 3. Ferromagnetism

**Ferromagnetism** is the phenomenon responsible for the strong magnets we encounter in everyday life, such as refrigerator magnets or compass needles. Like paramagnetic materials, ferromagnetic atoms have permanent dipole moments. However, due to a quantum mechanical effect known as *exchange coupling*, the dipoles of adjacent atoms interact strongly and align themselves parallel to one another, even in the absence of an external field.

This alignment occurs over microscopic regions called **magnetic domains** (typically 0.1 to 1 mm across). Within a single domain, all atomic dipoles are aligned. In an unmagnetized piece of iron, the domains are randomly oriented, so their fields cancel out.

```text
Visualizing Magnetic Domains in a Ferromagnet:

  Unmagnetized (Random Domains)        Magnetized (Aligned Domains)
   +---------+---------+                +---------+---------+
   |    ^    |    >    |                |    ^    |    ^    |
   |  <      |      v  |                |  ^      |      ^  |
   +---------+---------+      ===>      +---------+---------+
   |    v    |    <    |   Apply B_ext  |    ^    |    ^    |
   |      >  |  ^      |                |  ^      |      ^  |
   +---------+---------+                +---------+---------+
   Net Magnetization = 0                Net Magnetization > 0

```

When an external magnetic field is applied, domains aligned with the field grow at the expense of those opposing it, and the dipoles within opposing domains may suddenly flip to align with the field. This results in an enormous internal magnetic field.

* Ferromagnetic materials have a massive, positive, and non-linear effective susceptibility ($\chi$ can be $10^3$ to $10^5$).
* They are strongly attracted to magnets.
* **Hysteresis:** When the external field is removed, the domains do not completely randomize. The material retains a "memory" of the applied field and becomes a permanent magnet.
* **Curie Temperature:** If a ferromagnet is heated above a critical temperature called the Curie temperature ($T_C$), thermal agitation overwhelms the exchange coupling. The domains collapse, and the material becomes purely paramagnetic. For iron, $T_C = 1043 \text{ K}$.

---

## Chapter Summary

* **The Biot-Savart Law:** Moving charges (currents) are the source of magnetic fields. The magnetic field $d\mathbf{B}$ created by a differential current element $I d\mathbf{s}$ is $d\mathbf{B} = \frac{\mu_0}{4\pi} \frac{I d\mathbf{s} \times \mathbf{\hat{r}}}{r^2}$. The magnetic field at the center of a circular loop of radius $R$ is $B = \frac{\mu_0 I}{2R}$.
* **Forces Between Conductors:** Two parallel wires carrying steady currents exert magnetic forces on each other. The force per unit length is $\frac{F}{L} = \frac{\mu_0 I_1 I_2}{2\pi d}$. Parallel currents attract, while antiparallel currents repel.
* **Ampère's Law:** For closed paths, the line integral of the magnetic field is proportional to the net enclosed steady current: $\oint \mathbf{B} \cdot d\mathbf{s} = \mu_0 I_{\text{enc}}$. It is particularly useful for finding magnetic fields of highly symmetric current distributions, such as long straight wires ($B = \frac{\mu_0 I}{2\pi r}$).
* **Solenoids and Toroids:** An ideal solenoid produces a uniform internal magnetic field $B = \mu_0 n I$, where $n$ is the number of turns per unit length. A toroid confines the magnetic field entirely within its core, with a field magnitude of $B = \frac{\mu_0 NI}{2\pi r}$.
* **Magnetism in Matter:** Materials alter the magnetic field around them based on the properties of their atomic dipoles.
* *Diamagnetism* occurs in all matter, opposing applied fields ($\chi < 0$).
* *Paramagnetism* occurs in materials with permanent atomic dipoles that weakly align with applied fields ($\chi > 0$).
* *Ferromagnetism* (e.g., iron) involves strong exchange coupling that creates magnetic domains, allowing the material to become a permanent magnet and retain a massive field even after the external field is removed.
