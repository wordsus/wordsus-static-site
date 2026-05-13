From ancient lodestones to modern particle accelerators, magnetism is a fundamental force shaping our universe. In this chapter, we explore how magnetic fields interact with moving electric charges and current-carrying conductors, highlighting the profound differences between electric and magnetic forces. We will analyze the circular and helical trajectories of charged particles in uniform fields, discover the physical principles driving electric motors through the torque exerted on current loops, and finally probe the microscopic, quantum nature of conduction charge carriers using the elegant geometry of the Hall effect.

## 22.1 The Magnetic Field and Magnetic Force

For centuries, humans have observed magnetic effects, from the natural alignment of lodestone to the complex dynamics of the Earth's magnetic field. Just as an electric charge creates an electric field in the space around it, a moving charge or a magnetic object creates a **magnetic field**. We use the symbol $\mathbf{B}$ to represent the magnetic field vector.

In Chapter 18, we defined the electric field $\mathbf{E}$ operationally by the electric force $\mathbf{F}_E$ exerted on a test charge $q$, such that $\mathbf{F}_E = q\mathbf{E}$. We define the magnetic field $\mathbf{B}$ in a similar operational manner, but based on the magnetic force $\mathbf{F}_B$ exerted on a test charge moving through the field.

### The Magnetic Force on a Moving Charge

Extensive experiments on the motion of charged particles in magnetic fields yield the following empirical observations about the magnetic force $\mathbf{F}_B$:

1. The magnitude $F_B$ of the magnetic force exerted on the particle is proportional to the charge $q$ and to the speed $v$ of the particle.
2. The magnitude and direction of $\mathbf{F}_B$ depend on the velocity of the particle and on the magnitude and direction of the magnetic field $\mathbf{B}$.
3. When a charged particle moves parallel or antiparallel to the magnetic field vector, the magnetic force acting on it is zero.
4. When the particle's velocity vector makes any angle $\theta \neq 0$ with the magnetic field, the magnetic force acts in a direction perpendicular to both $\mathbf{v}$ and $\mathbf{B}$.
5. The magnetic force exerted on a positive charge is in the direction opposite the direction of the magnetic force exerted on a negative charge moving in the same direction.
6. The magnitude of the magnetic force is proportional to $\sin\theta$, where $\theta$ is the angle between the particle's velocity $\mathbf{v}$ and the magnetic field $\mathbf{B}$.

These observations can be summarized in a single, elegant vector equation using the cross product (introduced in Section 9.1):

$$\mathbf{F}_B = q\mathbf{v} \times \mathbf{B}$$

This equation is the fundamental definition of the magnetic field $\mathbf{B}$. It tells us that the magnetic force is always perpendicular to both the velocity of the charge and the magnetic field.

The magnitude of the magnetic force is given by the properties of the cross product:

$$F_B = |q|vB\sin\theta$$

where $\theta$ is the smaller angle between $\mathbf{v}$ and $\mathbf{B}$ (so $0^\circ \leq \theta \leq 180^\circ$).

### The Right-Hand Rule

Because the magnetic force involves a vector cross product, its direction is determined by the **right-hand rule**.

```text
      ^ F_B (for positive charge q)
      |
      |
      +---------> B
     /
    /
   v  v

```

*Figure 22.1.1: The relationship between velocity $\mathbf{v}$, magnetic field $\mathbf{B}$, and magnetic force $\mathbf{F}_B$.*

To find the direction of the magnetic force on a positive charge:

1. Point the fingers of your right hand in the direction of the velocity vector $\mathbf{v}$.
2. Curl your fingers toward the direction of the magnetic field vector $\mathbf{B}$.
3. Your extended thumb points in the direction of the magnetic force $\mathbf{F}_B$.

If the charge $q$ is negative, the direction of the force is exactly opposite to that predicted by the right-hand rule. Alternatively, for negative charges, you can use your left hand in the same manner.

### Units of the Magnetic Field

The SI unit of magnetic field is the **tesla** (T). From the magnetic force equation, we can derive the units of $\mathbf{B}$:

$$1 \text{ T} = \frac{1 \text{ N}}{1 \text{ C} \cdot 1 \text{ m/s}}$$

Since one coulomb per second is one ampere (**1 A = 1 C/s**), we usually express the tesla as:

$$1 \text{ T} = 1 \frac{\text{N}}{\text{A} \cdot \text{m}}$$

A non-SI magnetic-field unit in common use is the **gauss** (G), which is related to the tesla through the conversion **1 T = 10⁴ G**. The Earth's magnetic field is relatively weak, on the order of **0.5 G** or **5 × 10⁻⁵ T**, while strong laboratory electromagnets can produce fields from **1 T** to **10 T**.

### Comparing Electric and Magnetic Forces

It is crucial to understand the fundamental differences between the electric force and the magnetic force acting on a charged particle:

| Feature | Electric Force ($\mathbf{F}_E = q\mathbf{E}$) | Magnetic Force ($\mathbf{F}_B = q\mathbf{v} \times \mathbf{B}$) |
| --- | --- | --- |
| **Direction** | Parallel or antiparallel to $\mathbf{E}$. | Perpendicular to both $\mathbf{v}$ and $\mathbf{B}$. |
| **Velocity Dependence** | Acts on charges regardless of velocity. | Acts only on moving charges ($v > 0$). |
| **Work Performed** | Does work displacing the charge. | Does **no work** on the charge. |

The last point is of profound importance. Because the magnetic force $\mathbf{F}_B$ is always perpendicular to the velocity $\mathbf{v}$ (and therefore perpendicular to the instantaneous displacement $d\mathbf{s}$), the work $W$ done by the magnetic force on a charged particle is always zero:

$$dW = \mathbf{F}_B \cdot d\mathbf{s} = (\mathbf{F}_B \cdot \mathbf{v}) dt = 0$$

Since no work is done, the work-kinetic energy theorem (Section 5.3) dictates that **a static magnetic field cannot change the kinetic energy or the speed of a charged particle.** A magnetic field can only alter the *direction* of the velocity vector, never its magnitude.

## 22.2 Motion of a Charged Particle in a Magnetic Field

In Section 22.1, we established that the magnetic force $\mathbf{F}_B$ exerted on a charged particle is always perpendicular to its velocity vector $\mathbf{v}$. Because the force has no component parallel to the direction of motion, a static magnetic field cannot do work on the particle. It cannot change the particle's speed or kinetic energy; it can only alter its direction. This property leads to specific, highly predictable trajectories for charged particles moving through magnetic fields.

### Uniform Circular Motion in a Magnetic Field

Consider a particle of mass $m$ and positive charge $q$ moving with a constant speed $v$ in a uniform magnetic field $\mathbf{B}$. Suppose the particle's initial velocity is directed exactly perpendicular to the magnetic field.

According to the right-hand rule, the magnetic force will be perpendicular to both $\mathbf{v}$ and $\mathbf{B}$. As the force continually deflects the particle, it remains perpendicular to the velocity at all times. A constant force that is always perpendicular to the velocity is the exact condition required for **uniform circular motion**.

```text
    Uniform Magnetic Field B directed INTO the page (x)

    x      x      x      x      x      x      x
                  _ . - ^ - . _
    x      x   /                 \   x      x
              |        v          |
    x      x  |        ^          |  x      x
              |        |          |
    x      x  |    F_B +<-- q(+)  |  x      x
               \                 /
    x      x     ` - . _ _ _ . - '   x      x

    x      x      x      x      x      x      x

```

*Figure 22.2.1: A positive charge moving perpendicular to a uniform magnetic field undergoes uniform circular motion. The magnetic force provides the necessary centripetal acceleration.*

To find the radius $r$ of the circular path, we equate the magnitude of the magnetic force to the mass times the centripetal acceleration ($F_c = ma_c$). Since $\mathbf{v}$ is perpendicular to $\mathbf{B}$, the angle $\theta$ is $90^\circ$, and $\sin(90^\circ) = 1$.

$$|q|vB = m\frac{v^2}{r}$$

Solving for the radius $r$, we obtain:

$$r = \frac{mv}{|q|B}$$

This equation reveals several important proportionalities:

* The radius is directly proportional to the linear momentum of the particle ($p = mv$). Faster or more massive particles sweep out larger circles.
* The radius is inversely proportional to the magnitude of the charge and the magnetic field. Stronger fields or highly charged particles result in tighter curves.

### Cyclotron Frequency and Period

We can determine the time it takes for the particle to complete one full revolution, known as the period $T$. The period is the circumference of the circular path divided by the linear speed:

$$T = \frac{2\pi r}{v}$$

Substituting our expression for $r$ into this equation yields:

$$T = \frac{2\pi \left(\frac{mv}{|q|B}\right)}{v} = \frac{2\pi m}{|q|B}$$

The angular speed $\omega$ of the particle, often called the **cyclotron frequency**, is related to the period by $\omega = 2\pi / T$:

$$\omega = \frac{|q|B}{m}$$

A remarkable feature of these two equations is that **both the period and the angular speed are independent of the linear speed $v$ and the radius $r$ of the path**. A fast-moving particle will travel in a large circle, and a slow-moving particle will travel in a small circle, but both will take the exact same amount of time to complete one revolution in a given uniform magnetic field (provided they are not moving at relativistic speeds). This principle is the basis for the cyclotron, a type of particle accelerator.

### Helical Motion

What happens if the charged particle's initial velocity vector $\mathbf{v}$ is *not* entirely perpendicular to the uniform magnetic field $\mathbf{B}$?

In this case, we can resolve the velocity vector into two components:

1. **$v_{\parallel}$**: The component of velocity parallel to the magnetic field.
2. **$v_{\perp}$**: The component of velocity perpendicular to the magnetic field.

The parallel component, $v_{\parallel}$, results in no magnetic force ($\sin(0^\circ) = 0$). Therefore, according to Newton's first law, the particle will continue to move in the direction of the magnetic field with a constant speed $v_{\parallel}$.

Simultaneously, the perpendicular component, $v_{\perp}$, experiences a magnetic force that causes the particle to undergo circular motion around the magnetic field lines.

The superposition of uniform linear motion along the field lines and uniform circular motion around the field lines results in a **helical path** (a spiral).

```text
       y
       ^
       |     Magnetic Field B
       |    -------------------------> x
       |      _       _       _
  v    |    /   \   /   \   /   \
   \   |   |     | |     | |     |
    \  |    \ _ /   \ _ /   \ _ /
     \ |
      \|-----------------------------> x
      /
     /
    v
   z

```

*Figure 22.2.2: Helical motion of a charged particle. The particle spirals around the magnetic field lines.*

The radius of this helix is dictated purely by the perpendicular velocity component:

$$r = \frac{mv_{\perp}}{|q|B}$$

The distance the particle translates parallel to the magnetic field during one full period of its circular motion is called the **pitch** ($p$) of the helix. It can be calculated using the parallel velocity component and the period:

$$p = v_{\parallel} T = v_{\parallel} \left( \frac{2\pi m}{|q|B} \right)$$

### Non-Uniform Magnetic Fields and Magnetic Bottles

In realistic scenarios, such as the magnetic field of the Earth or fields created by specialized coils, the magnetic field is not perfectly uniform. If a charged particle moves into a region where the magnetic field becomes stronger, the magnetic field lines converge.

As the particle spirals into the stronger field region, the converging field exerts a force component that points opposite to the particle's forward motion. This causes the parallel component of the velocity, $v_{\parallel}$, to decrease. If the field becomes strong enough, $v_{\parallel}$ reaches zero, and the particle is reflected back toward the weaker field region.

This effect creates a **magnetic mirror**. By using two such mirrors facing each other, physicists create a "magnetic bottle," which is used to confine high-energy plasmas in experimental nuclear fusion reactors, preventing the extremely hot plasma from touching the physical walls of the container. A natural example of this phenomenon occurs in Earth's magnetosphere, where charged particles from the solar wind are trapped and spiral back and forth between the magnetic poles, eventually colliding with atmospheric gases to produce the auroras.

## 22.3 Magnetic Force on a Current-Carrying Conductor

In Section 22.1, we established that a magnetic field exerts a force on a single moving charged particle. Because an electric current is essentially a collection of many charged particles in macroscopic motion, it follows logically that a wire carrying a current will also experience a force when placed in a magnetic field. This macroscopic force is simply the vector sum of all the individual microscopic magnetic forces acting on the charge carriers within the conductor.

### Force on a Straight Wire in a Uniform Field

Consider a straight segment of wire of length $L$ and cross-sectional area $A$, carrying a constant current $I$ in a uniform magnetic field $\mathbf{B}$. To find the total force on this wire segment, we will sum the forces on the individual charge carriers.

Assume the current consists of positive charge carriers (conventional current) moving with an average drift velocity $\mathbf{v}_d$. The magnetic force on a single charge carrier $q$ is:

$$\mathbf{F}_{\text{single}} = q\mathbf{v}_d \times \mathbf{B}$$

To find the total force, we must multiply this individual force by the total number of moving charges, $N$, in the wire segment. If $n$ is the number density of charge carriers (charges per unit volume), the volume of the wire segment is $AL$, and the total number of carriers is $N = nAL$.

The total magnetic force $\mathbf{F}_B$ on the wire segment is therefore:

$$\mathbf{F}_B = (nAL)(q\mathbf{v}_d \times \mathbf{B})$$

We can rearrange the terms to group the scalar quantities together:

$$\mathbf{F}_B = (nqAv_d)\mathbf{L} \times \mathbf{B}$$

Here, we have defined a length vector $\mathbf{L}$. The magnitude of $\mathbf{L}$ is the length of the segment $L$, and its direction is the direction of the conventional current $I$ (which is parallel to $\mathbf{v}_d$).

Recall from Chapter 21 that the macroscopic current $I$ is related to the microscopic drift velocity by the equation $I = nqAv_d$. Substituting $I$ into our force equation yields the fundamental expression for the magnetic force on a straight current-carrying wire:

$$\mathbf{F}_B = I\mathbf{L} \times \mathbf{B}$$

The magnitude of this force is $F_B = ILB\sin\theta$, where $\theta$ is the angle between the wire's length vector $\mathbf{L}$ and the magnetic field $\mathbf{B}$.

### Direction of the Force

The direction of the magnetic force on a wire is determined by the cross product $\mathbf{L} \times \mathbf{B}$, which can be evaluated using a variation of the right-hand rule:

1. Point the fingers of your right hand in the direction of the current $I$ (the vector $\mathbf{L}$).
2. Curl your fingers toward the direction of the magnetic field $\mathbf{B}$.
3. Your extended thumb points in the direction of the magnetic force $\mathbf{F}_B$.

```text
       Uniform Magnetic Field B directed INTO the page (x)

       x      x      x      x      x      x      x

       x      x      ^ F_B  x      x      x      x
                     |
       x      x      |      x      x      x      x
      ===========================================> I (Vector L)
       x      x      x      x      x      x      x

       x      x      x      x      x      x      x

```

*Figure 22.3.1: A straight wire carrying conventional current $I$ to the right in a uniform magnetic field directed into the page. By the right-hand rule, the magnetic force $\mathbf{F}_B$ pushes the wire toward the top of the page.*

### Force on an Arbitrarily Shaped Wire

If the wire is not straight, or if the magnetic field is not uniform, we cannot use $\mathbf{F}_B = I\mathbf{L} \times \mathbf{B}$ directly. Instead, we must apply the calculus principle of superposition. We divide the wire into infinitesimally short segments, each represented by a vector $d\mathbf{s}$ pointing in the direction of the current.

The infinitesimally small magnetic force $d\mathbf{F}_B$ on the segment $d\mathbf{s}$ is:

$$d\mathbf{F}_B = I d\mathbf{s} \times \mathbf{B}$$

To find the total net force on the entire wire, we integrate this expression along the length of the wire from its starting point $a$ to its ending point $b$:

$$\mathbf{F}_B = I \int_a^b d\mathbf{s} \times \mathbf{B}$$

#### Special Cases of Integration

Two important special cases arise from this integral when the magnetic field $\mathbf{B}$ is **uniform** across the entire region containing the wire:

**1. A Curved Wire in a Uniform Field:**
Because $\mathbf{B}$ is uniform, it is a constant vector and can be factored out of the integral:

$$\mathbf{F}_B = I \left( \int_a^b d\mathbf{s} \right) \times \mathbf{B}$$

The integral $\int_a^b d\mathbf{s}$ is simply the vector sum of all the infinitesimal displacement vectors along the wire, which equals the straight-line vector $\mathbf{L}'$ pointing from the start point $a$ directly to the end point $b$. Thus, the net magnetic force is $\mathbf{F}_B = I\mathbf{L}' \times \mathbf{B}$.
*Conclusion:* The magnetic force on a curved wire in a uniform magnetic field is identical to the force on a straight wire connecting the same initial and final points.

**2. A Closed Loop in a Uniform Field:**
If the wire forms a closed loop, the start point $a$ and end point $b$ are the same location. The vector integral of displacement around any closed path is zero: $\oint d\mathbf{s} = 0$.
*Conclusion:* The net magnetic force on any closed current loop in a uniform magnetic field is identically zero. (Note: While the *net translational force* is zero, the magnetic field may still exert a *torque* on the loop, causing it to rotate. This crucial distinction will be explored in Section 22.4).

## 22.4 Torque on a Current Loop

In Section 22.3, we established that the net translational magnetic force on any closed current loop placed in a uniform magnetic field is exactly zero. However, this does not mean the magnetic field has no effect on the loop. While the forces on different segments of the loop vectorially cancel each other out, they may not act along the same line of action. When forces are offset in this manner, they create a **torque** ($\boldsymbol{\tau}$), which tends to rotate the loop. This rotational effect is the fundamental operating principle behind electric motors and analog measuring instruments like galvanometers.

### Torque on a Rectangular Loop

To understand this effect quantitatively, let us examine a rectangular current loop with sides of length $a$ and $b$, carrying a constant current $I$. The loop is placed in a uniform magnetic field $\mathbf{B}$ that is parallel to the plane of the loop.

Imagine the loop is mounted on an axis of rotation that passes through the centers of the two sides of length $a$.

```text
    Axis of Rotation
           |
           |
   +-------+-------+  <-- side 'a'
   |       |       |
   |       |       |  side 'b'
   |       |       |
   +-------+-------+
           |
           |

```

Let the magnetic field $\mathbf{B}$ point to the right. We analyze the magnetic force $\mathbf{F}_B = I\mathbf{L} \times \mathbf{B}$ acting on each of the four sides of the rectangle:

1. **Sides of length $a$:** The current in these sides flows parallel (or antiparallel) to the magnetic field $\mathbf{B}$. Because the angle $\theta$ between the current and the field is either $0^\circ$ or $180^\circ$, the cross product is zero ($\sin(0^\circ) = \sin(180^\circ) = 0$). Therefore, the magnetic field exerts **zero net force** on these two sides.
2. **Sides of length $b$:** The current in these sides flows perpendicular to the magnetic field ($\theta = 90^\circ$). According to the right-hand rule, one side experiences a force directed *out of the page*, and the opposite side experiences a force directed *into the page*.

Let's look at this loop from a top-down perspective, looking directly down the axis of rotation:

```text
          Normal Vector (n)
                ^
                |   Side 'a' viewed edge-on
      F_out <---*-----------------*---> F_in
                |                 |
                |                 v Magnetic Field B
             Axis (O)

```

The forces $F_{\text{out}}$ and $F_{\text{in}}$ have equal magnitudes given by $F = IbB$. These two equal and opposite forces form a *force couple*. They do not translate the loop, but they cause it to rotate about the axis $O$.

The total torque $\tau$ is the sum of the torques produced by each force. The moment arm for each force is half the length of side $a$ ($a/2$). Therefore, the maximum torque (when the loop is parallel to the field) is:

$$\tau_{\text{max}} = F_{\text{out}}\left(\frac{a}{2}\right) + F_{\text{in}}\left(\frac{a}{2}\right) = (IbB)\left(\frac{a}{2}\right) + (IbB)\left(\frac{a}{2}\right) = IbBa$$

Since the area of the rectangular loop is $A = ab$, we can rewrite the maximum torque as:

$$\tau_{\text{max}} = IAB$$

### Torque at an Arbitrary Angle

As the loop rotates, the angle between the plane of the loop and the magnetic field changes. The moment arm for the forces is no longer $a/2$, but rather $(a/2)\sin\theta$, where $\theta$ is the angle between the magnetic field $\mathbf{B}$ and a vector normal (perpendicular) to the plane of the loop.

```text
             Normal vector
                  ^
                   \
                    \  theta
                     \ . . . . . . . . . >  Magnetic Field B
                      |
            F_out     |
                ^     |
                |     | (side a viewed edge-on)
                +-----O-----+
               /             \
              /               \
             /                 \
            +                   +
                                |
                                v  F_in

```

*Figure 22.4.1: Top-down view of the current loop rotated by an angle $\theta$ relative to the magnetic field.*

At any arbitrary angle $\theta$, the magnitude of the torque is:

$$\tau = IAB\sin\theta$$

Notice that the torque is maximum when $\theta = 90^\circ$ (the magnetic field is parallel to the plane of the loop) and zero when $\theta = 0^\circ$ or $180^\circ$ (the magnetic field is perpendicular to the plane of the loop).

### The Magnetic Dipole Moment

The torque equation $\tau = IAB\sin\theta$ is independent of the shape of the loop. It holds true for rectangular, circular, or irregularly shaped planar loops, provided they are perfectly flat.

To formalize this relationship using vectors, physicists define a new vector quantity called the **magnetic dipole moment**, denoted by the Greek letter $\boldsymbol{\mu}$ (mu). For a single planar loop of wire carrying current $I$ and having area $A$, the magnitude of the magnetic dipole moment is defined as:

$$\mu = IA$$

The SI unit for the magnetic dipole moment is the **ampere-meter squared** ($\text{A} \cdot \text{m}^2$).

The direction of the magnetic dipole moment vector $\boldsymbol{\mu}$ is always perpendicular to the plane of the loop and is determined by a variation of the **right-hand rule**:

* Curl the fingers of your right hand around the perimeter of the loop in the direction of the conventional current $I$.
* Your extended thumb points in the direction of the magnetic dipole moment $\boldsymbol{\mu}$ (which is also the direction of the normal vector to the area).

If a coil consists of $N$ tightly wound, identical loops of wire (a multi-turn coil), the currents from all loops add together, and the total magnetic dipole moment is:

$$\boldsymbol{\mu} = NI\mathbf{A}$$

where $\mathbf{A}$ is the vector area of the loop.

### Vector Form of Torque

Using the definition of the magnetic dipole moment, we can express the torque on a current loop in a highly compact and universal vector form. Since the magnitude of the cross product of two vectors is $|\mathbf{u} \times \mathbf{v}| = uv\sin\theta$, we can rewrite $\tau = \mu B\sin\theta$ as a cross product:

$$\boldsymbol{\tau} = \boldsymbol{\mu} \times \mathbf{B}$$

This profound equation dictates both the magnitude and the direction of the torque on a current loop. The torque always acts to rotate the loop such that its magnetic dipole moment $\boldsymbol{\mu}$ aligns with the external magnetic field $\mathbf{B}$, much like a compass needle (a permanent magnetic dipole) rotates to align with the Earth's magnetic field.

### Potential Energy of a Magnetic Dipole

Because the magnetic field exerts a torque on the magnetic dipole that attempts to align it with the field, work must be done by an external agent to rotate the dipole away from this alignment. Consequently, a magnetic dipole has orientational **potential energy** ($U$) when placed in a magnetic field.

Using the relationship between work and potential energy for rotational motion ($dW = \tau d\theta$), integrating the torque equation yields the potential energy of the system:

$$U = -\boldsymbol{\mu} \cdot \mathbf{B}$$

This scalar dot product expands to $U = -\mu B\cos\theta$. This equation reveals three critical energy states for the dipole:

1. **Stable Equilibrium ($\theta = 0^\circ$):** The dipole moment $\boldsymbol{\mu}$ is perfectly parallel to $\mathbf{B}$. The potential energy is at its minimum ($U_{\text{min}} = -\mu B$). If slightly perturbed, the restoring torque pushes it back to this position.
2. **Zero Energy Position ($\theta = 90^\circ$):** The dipole moment is perpendicular to the field. By convention, this is defined as the state where $U = 0$.
3. **Unstable Equilibrium ($\theta = 180^\circ$):** The dipole moment $\boldsymbol{\mu}$ is perfectly antiparallel to $\mathbf{B}$. The potential energy is at its maximum ($U_{\text{max}} = +\mu B$). The torque is momentarily zero, but any infinitesimal perturbation will cause the loop to rapidly flip around to align with the field.

## 22.5 The Hall Effect

In 1879, Edwin Hall, then a graduate student, discovered an ingenious way to probe the microscopic nature of electric currents. Prior to his experiment, it was known that a magnetic field exerts a force on a current-carrying wire, but it was entirely unknown whether the charge carriers constituting that current were positive charges moving in the direction of the current, or negative charges moving in the opposite direction.

The **Hall effect** is the generation of a transverse electrical potential difference (a voltage) across a solid conductor when it carries an electric current and is placed in a magnetic field perpendicular to the current. This effect not only resolves the sign of the charge carriers but also allows us to determine their number density.

### The Mechanism of the Hall Effect

Consider a flat, rectangular conducting strip of width $d$ and thickness $t$, carrying a conventional current $I$ to the right. A uniform magnetic field $\mathbf{B}$ is applied perpendicular to the flat face of the strip, pointing into the page.

Let us analyze the magnetic force on the charge carriers for two distinct cases: one where the carriers are positive, and one where they are negative.

```text
Case 1: Positive Charge Carriers (q = +e)

        Top Edge (Accumulates + charges, Higher Potential)
       +  +  +  +  +  +  +  +  +  +  +
     +---------------------------------+
     |   ^ F_B                         |
     |   |                             | d
 I   |  (+) ----> v_d                  |   I
---> |                                 | --->
     |                                 |
     +---------------------------------+
       -  -  -  -  -  -  -  -  -  -  -
        Bottom Edge (Lower Potential)

Field B is directed INTO the page (x)

```

If the current is carried by **positive charges**, they move to the right with a drift velocity $\mathbf{v}_d$. According to the right-hand rule ($\mathbf{v}_d \times \mathbf{B}$), the magnetic force $\mathbf{F}_B$ pushes these positive charges toward the **top edge** of the strip. Consequently, positive charge accumulates on the top edge, leaving a deficit of positive charge (a net negative charge) on the bottom edge.

```text
Case 2: Negative Charge Carriers (q = -e)

        Top Edge (Accumulates - charges, Lower Potential)
       -  -  -  -  -  -  -  -  -  -  -
     +---------------------------------+
     |   ^ F_B                         |
     |   |                             | d
 I   |  (-) <---- v_d                  |   I
---> |                                 | --->
     |                                 |
     +---------------------------------+
       +  +  +  +  +  +  +  +  +  +  +
        Bottom Edge (Higher Potential)

Field B is directed INTO the page (x)

```

If the current is instead carried by **negative charges** (electrons), they must move to the left to produce a conventional current to the right. The velocity vector $\mathbf{v}_d$ points to the left. The cross product $\mathbf{v}_d \times \mathbf{B}$ points downward. However, because the charge $q$ is negative, the magnetic force $\mathbf{F}_B = q\mathbf{v}_d \times \mathbf{B}$ points **upward**.

Therefore, regardless of the sign of the charge carriers, the magnetic force always pushes them toward the same edge of the conductor (the top edge in our diagrams).

The crucial difference lies in the resulting potential difference. If the carriers are positive, the top edge becomes at a higher electric potential than the bottom edge. If the carriers are negative, the top edge becomes at a lower electric potential. By simply attaching a voltmeter to the top and bottom edges of the strip, Hall was able to determine the sign of the charge carriers. In typical metals like copper, the top edge becomes negative, proving conclusively that electric current in metals is carried by negatively charged electrons.

### The Hall Voltage

The accumulation of charge on the edges does not continue indefinitely. As charge builds up, it creates a transverse electric field across the width of the conductor, known as the **Hall field** ($\mathbf{E}_H$). This electric field exerts an electric force ($\mathbf{F}_E = q\mathbf{E}_H$) on the subsequent charge carriers that directly opposes the magnetic force.

Eventually, a dynamic equilibrium is reached where the opposing electric and magnetic forces perfectly balance each other, and the charge carriers flow straight through the center of the strip without further deflection:

$$|q|E_H = |q|v_d B$$

$$E_H = v_d B$$

Assuming the Hall electric field is uniform across the width $d$ of the conductor, the potential difference across the width is the **Hall voltage** ($\Delta V_H$):

$$\Delta V_H = E_H d = v_d B d$$

We can express this voltage in terms of measurable macroscopic macroscopic quantities. From Chapter 21, the current $I$ is related to the drift velocity by $I = nqAv_d$, where $n$ is the charge carrier density (number of carriers per unit volume), $q$ is the charge of a single carrier, and $A$ is the cross-sectional area. For our rectangular strip, $A = td$ (thickness times width).

Substituting $v_d = \frac{I}{nqtd}$ into our Hall voltage equation yields:

$$\Delta V_H = \left( \frac{I}{nqtd} \right) B d$$

$$\Delta V_H = \frac{IB}{nqt}$$

### The Hall Coefficient and Applications

The quantity $1/(nq)$ is a property of the specific material making up the conductor and is defined as the **Hall coefficient** ($R_H$):

$$R_H = \frac{1}{nq}$$

Substituting this into the Hall voltage equation gives $\Delta V_H = \frac{R_H I B}{t}$.

The Hall effect is of immense practical importance in modern physics and engineering:

1. **Determining Carrier Density:** By measuring the Hall voltage $\Delta V_H$, the current $I$, the magnetic field $B$, and the thickness $t$, physicists can directly calculate the charge carrier density $n$ of an unknown material.
2. **Semiconductor Physics:** The Hall effect is used to determine whether a semiconductor is "n-type" (electron dominant, $R_H < 0$) or "p-type" ("hole" dominant, $R_H > 0$).
3. **Hall Effect Sensors:** If a material with a known carrier density is used, the equation can be inverted to solve for $B$. A tiny piece of semiconductor carrying a known constant current can act as a highly precise, solid-state magnetic field sensor, widely used in anti-lock braking systems, fluid flow sensors, and smartphone compasses.

## Chapter Summary

* **The Magnetic Field and Force:** A magnetic field $\mathbf{B}$ exerts a magnetic force $\mathbf{F}_B$ on a moving charged particle. The force is perpendicular to both the particle's velocity $\mathbf{v}$ and the magnetic field. The fundamental equation is $\mathbf{F}_B = q\mathbf{v} \times \mathbf{B}$. Because the force is always perpendicular to velocity, a static magnetic field does no work on a charged particle and cannot change its kinetic energy.
* **Motion of Charged Particles:** A charged particle moving perpendicular to a uniform magnetic field undergoes uniform circular motion. The radius of the path is $r = \frac{mv}{|q|B}$. The angular speed (cyclotron frequency) is $\omega = \frac{|q|B}{m}$ and is independent of the particle's velocity and radius. If the velocity has a component parallel to the field, the resulting trajectory is a helix.
* **Force on a Current-Carrying Conductor:** A macroscopic wire carrying a current $I$ in a uniform magnetic field experiences a magnetic force given by $\mathbf{F}_B = I\mathbf{L} \times \mathbf{B}$, where $\mathbf{L}$ is a vector pointing in the direction of the current with a magnitude equal to the length of the wire segment.
* **Torque on a Current Loop:** A current loop in a uniform magnetic field experiences a torque that tends to align its magnetic dipole moment with the external field. The torque is $\boldsymbol{\tau} = \boldsymbol{\mu} \times \mathbf{B}$, where the magnetic dipole moment is $\boldsymbol{\mu} = NI\mathbf{A}$. The potential energy of the dipole in the field is $U = -\boldsymbol{\mu} \cdot \mathbf{B}$.
* **The Hall Effect:** When a current-carrying conductor is placed in a perpendicular magnetic field, the magnetic force deflects the charge carriers to one edge of the conductor. This creates a measurable transverse potential difference called the Hall voltage, $\Delta V_H = \frac{IB}{nqt}$. The Hall effect reveals the sign of the charge carriers and allows for the calculation of their number density $n$.
