In Chapter 8, we explored rotational dynamics. Now, we complete our mechanics foundation by introducing angular momentum, the rotational counterpart to linear momentum. Using the vector cross product, we will define this quantity and explore its profound conservation law, explaining phenomena from spinning skaters to collapsing stars. We will also establish the exact translational and rotational conditions required for an extended body to achieve static equilibrium. Finally, we move beyond perfectly rigid bodies to examine how real materials stretch, shear, and compress under applied forces through the principles of elasticity.

## 9.1 The Vector (Cross) Product

In Chapter 5, we explored the scalar (dot) product, a method of multiplying two vectors to yield a single scalar quantity, which was essential for understanding work and energy. As we transition into the study of rotational dynamics, torque, and angular momentum, we require a different method of vector multiplication—one where the product of two vectors results in a third, entirely new vector. This operation is known as the **vector product** or **cross product**.

Given any two vectors $\vec{A}$ and $\vec{B}$, their vector product is written as $\vec{A}\times\vec{B}$ (read as "A cross B") and defines a new vector $\vec{C}$:

$$\vec{C}=\vec{A}\times\vec{B}$$

To fully define the vector $\vec{C}$, we must specify both its magnitude and its direction.

### Magnitude of the Cross Product

The magnitude of the cross product is given by the product of the magnitudes of the two vectors and the sine of the angle between them:

$$|\vec{C}|=AB\sin\theta$$

where $A$ and $B$ are the magnitudes of vectors $\vec{A}$ and $\vec{B}$, and $\theta$ is the angle between them when they are drawn tail-to-tail ($0^\circ\le\theta\le180^\circ$, or $0\le\theta\le\pi$ radians).

Geometrically, the magnitude $AB\sin\theta$ represents the area of the parallelogram formed by $\vec{A}$ and $\vec{B}$ as adjacent sides. Because $\sin(0^\circ)=\sin(180^\circ)=0$, the cross product of any two parallel or anti-parallel vectors is zero. Consequently, the cross product of any vector with itself is always zero ($\vec{A}\times\vec{A}=0$).

### Direction of the Cross Product: The Right-Hand Rule

The vector $\vec{C}$ is uniquely oriented such that it is perpendicular to the plane formed by vectors $\vec{A}$ and $\vec{B}$. However, there are two possible directions perpendicular to any plane. To determine which of these two directions is correct, we use the **right-hand rule**.

```text
The Right-Hand Rule (RHR):

      (Thumb points along C = A x B)
             ^
             |
             |
             |
             +---------> (Fingers point along A)
            /
           /
          v
  (Fingers curl toward B)

```

**Steps to apply the right-hand rule:**

1. Point the outstretched fingers of your right hand in the direction of the first vector, $\vec{A}$.
2. Curl your fingers toward the direction of the second vector, $\vec{B}$, closing the smallest angle $\theta$ between them.
3. Your extended right thumb now points in the direction of the resulting vector, $\vec{C}$.

### Properties of the Cross Product

Because the direction of the result depends strictly on the order of multiplication, the cross product is **not commutative**. If you evaluate $\vec{B}\times\vec{A}$, you must curl your fingers from $\vec{B}$ to $\vec{A}$, which flips your hand upside down and forces your thumb to point in the exact opposite direction. Therefore, the cross product is **anti-commutative**:

$$\vec{A}\times\vec{B}=-(\vec{B}\times\vec{A})$$

Other important mathematical properties include:

* **Distributive over addition:** $\vec{A}\times(\vec{B}+\vec{C})=(\vec{A}\times\vec{B})+(\vec{A}\times\vec{C})$
* **Multiplication by a scalar ($c$):** $c(\vec{A}\times\vec{B})=(c\vec{A})\times\vec{B}=\vec{A}\times(c\vec{B})$

### The Cross Product in Unit Vector Notation

To calculate the cross product algebraically, it is highly useful to evaluate the cross products of the standard Cartesian unit vectors: $\hat{i}$, $\hat{j}$, and $\hat{k}$.

Because the angle between a unit vector and itself is $0^\circ$, their cross product is zero:

$$\hat{i}\times\hat{i}=\hat{j}\times\hat{j}=\hat{k}\times\hat{k}=0$$

Because the unit vectors are mutually orthogonal (the angle between any pair is $90^\circ$, and $\sin90^\circ=1$), the magnitude of the cross product of any two distinct unit vectors is exactly $1$. Applying the right-hand rule to the standard $xyz$-coordinate system yields the following cyclic permutations:

```text
Cyclic Permutation of Unit Vectors:

       (+) Direction: Clockwise
       (-) Direction: Counter-clockwise
       
             (j)
            ^   \
           /     v
         (i) <--- (k)

```

Following the cyclic arrows (alphabetical order) yields a positive result, while going against the arrows yields a negative result:

$$\hat{i}\times\hat{j}=\hat{k} \quad \text{and} \quad \hat{j}\times\hat{i}=-\hat{k}$$

$$\hat{j}\times\hat{k}=\hat{i} \quad \text{and} \quad \hat{k}\times\hat{j}=-\hat{i}$$

$$\hat{k}\times\hat{i}=\hat{j} \quad \text{and} \quad \hat{i}\times\hat{k}=-\hat{j}$$

Using these relationships, we can express the cross product of two arbitrary vectors $\vec{A} = A_x\hat{i} + A_y\hat{j} + A_z\hat{k}$ and $\vec{B} = B_x\hat{i} + B_y\hat{j} + B_z\hat{k}$ by expanding the distributive property. A more compact and memorable way to write this expansion is using a $3\times3$ matrix determinant:

$$\vec{A}\times\vec{B}=\begin{vmatrix}\hat{i}&\hat{j}&\hat{k}\\A_x&A_y&A_z\\B_x&B_y&B_z\end{vmatrix}$$

Expanding this determinant along the top row gives the formal algebraic definition of the cross product:

$$\vec{A}\times\vec{B}=(A_yB_z-A_zB_y)\hat{i}-(A_xB_z-A_zB_x)\hat{j}+(A_xB_y-A_yB_x)\hat{k}$$

Notice the mandatory minus sign preceding the $\hat{j}$ component in the expansion—a common source of errors in calculation. Mastering both the algebraic determinant method and the geometric right-hand rule is crucial for calculating torque and angular momentum in the upcoming sections.

## 9.2 Angular Momentum of a Particle and a System

Just as linear momentum ($\vec{p}=m\vec{v}$) is a fundamental concept for describing the translational motion of an object, **angular momentum** ($\vec{L}$) is the rotational analog used to describe the rotational motion of an object relative to a specific point or axis. Having established the mathematical machinery of the cross product in the previous section, we can now formally define this crucial quantity.

### Angular Momentum of a Single Particle

Consider a single particle of mass $m$ moving with a linear velocity $\vec{v}$, giving it a linear momentum $\vec{p}=m\vec{v}$. The angular momentum $\vec{L}$ of this particle with respect to a chosen origin $O$ is defined as the vector product of its position vector $\vec{r}$ and its linear momentum vector $\vec{p}$:

$$\vec{L}=\vec{r}\times\vec{p}$$

It is critical to note that angular momentum is not an absolute property of the particle's motion alone; its value and direction depend fundamentally on the choice of the origin $O$ from which the position vector $\vec{r}$ is measured.

The SI unit for angular momentum is $\text{kg}\cdot\text{m}^2/\text{s}$, which can also be written as joule-seconds ($\text{J}\cdot\text{s}$).

**Magnitude and Direction**

Using the definition of the cross product, the magnitude of the angular momentum is:

$$L=rp\sin\phi=rmv\sin\phi$$

where $\phi$ is the angle between the position vector $\vec{r}$ and the linear momentum vector $\vec{p}$ when drawn tail-to-tail.

```text
Geometry of Angular Momentum:

                y ^
                  |          p = mv
                  |         ^
                  |        /
                  |       / \
                  |      /   \ phi
                  |     /     -----
               r  |    /      
                  |   /
                  |  /
                  | /
                  |/
Origin (O) -------+---------------------> x
                 /
                /
               v z

```

By applying the right-hand rule from Section 9.1 to the diagram above, pointing your fingers along $\vec{r}$ and curling them toward $\vec{p}$, your thumb points along the positive $z$-axis. Therefore, in this specific case, $\vec{L}$ points out of the page.

We can also express the magnitude in terms of a "lever arm" or perpendicular distance, similar to how we calculate torque. If we extend the line of action of the momentum vector, the perpendicular distance from the origin to this line is $r_{\perp}=r\sin\phi$. Therefore:

$$L=r_{\perp}p$$

Alternatively, we can resolve the momentum into radial and tangential components. Only the tangential component of momentum ($p_{\perp}=p\sin\phi$) contributes to the angular momentum:

$$L=rp_{\perp}$$

### Newton's Second Law in Angular Form

For translational motion, Newton's second law is expressed as $\vec{F}_{\text{net}}=\frac{d\vec{p}}{dt}$. We can find the rotational equivalent by taking the time derivative of the angular momentum of a particle:

$$\frac{d\vec{L}}{dt}=\frac{d}{dt}(\vec{r}\times\vec{p})$$

Using the product rule for derivatives (which preserves the order of the cross product), we get:

$$\frac{d\vec{L}}{dt}=\left(\frac{d\vec{r}}{dt}\times\vec{p}\right)+\left(\vec{r}\times\frac{d\vec{p}}{dt}\right)$$

Let us analyze the two terms on the right side:

1. The velocity is $\vec{v}=\frac{d\vec{r}}{dt}$, so the first term is $(\vec{v}\times m\vec{v})$. Because the cross product of any vector with itself (or a parallel vector) is zero, this entire term vanishes.
2. From Newton's second law, $\frac{d\vec{p}}{dt}=\vec{F}_{\text{net}}$, so the second term becomes $(\vec{r}\times\vec{F}_{\text{net}})$.

Recall from Chapter 8 that torque is defined as $\vec{\tau}=\vec{r}\times\vec{F}$. Therefore, $\vec{r}\times\vec{F}_{\text{net}}$ is the net torque, $\vec{\tau}_{\text{net}}$, acting on the particle. This yields **Newton's second law for rotation**:

$$\vec{\tau}_{\text{net}}=\frac{d\vec{L}}{dt}$$

*The net external torque acting on a particle is equal to the time rate of change of its angular momentum.*

### Angular Momentum of a System of Particles

Real physical objects are rarely single isolated particles; they are systems composed of many particles. The total angular momentum of a system of particles ($\vec{L}_{\text{sys}}$) is simply the vector sum of the individual angular momenta of all the particles in the system:

$$\vec{L}_{\text{sys}}=\sum_{i=1}^{n}\vec{L}_i=\sum_{i=1}^{n}(\vec{r}_i\times\vec{p}_i)$$

To find how the total angular momentum changes over time, we differentiate this sum:

$$\frac{d\vec{L}_{\text{sys}}}{dt}=\sum_{i=1}^{n}\frac{d\vec{L}_i}{dt}=\sum_{i=1}^{n}\vec{\tau}_i$$

The sum of all torques $\sum\vec{\tau}_i$ includes both *internal* torques (exerted by particles within the system on each other) and *external* torques (exerted by outside agents). However, according to Newton's third law, the internal forces occur in equal and opposite action-reaction pairs that act along the line connecting the interacting particles. Consequently, the internal torques perfectly cancel each other out.

The time rate of change of the total angular momentum of a system is therefore determined entirely by the **net external torque**:

$$\vec{\tau}_{\text{net, ext}}=\frac{d\vec{L}_{\text{sys}}}{dt}$$

### Angular Momentum of a Rigid Body

In Chapter 8, we studied rigid bodies rotating about a fixed axis. We can connect our general definition of angular momentum to the moment of inertia ($I$) and angular velocity ($\vec{\omega}$).

Imagine a rigid body rotating with angular velocity $\omega$ about the $z$-axis. Every point mass $m_i$ within the body moves in a circle of radius $r_{\perp, i}$ with a linear speed $v_i=r_{\perp, i}\omega$. The angular momentum magnitude of the $i$-th particle with respect to the axis of rotation is:

$$L_{i}=r_{\perp, i}(m_iv_i)=m_ir_{\perp, i}^2\omega$$

Summing over all particles in the rigid body gives the total angular momentum about the rotation axis:

$$L_{\text{sys}}=\left(\sum m_ir_{\perp, i}^2\right)\omega$$

The term in the parentheses is the moment of inertia, $I$. Therefore, for a rigid body rotating about a fixed axis of symmetry, the angular momentum vector simplifies to:

$$\vec{L}=I\vec{\omega}$$

This is the rotational equivalent of $\vec{p}=m\vec{v}$, reinforcing the symmetry between linear and angular dynamics. If the net external torque is zero, the derivative $\frac{d\vec{L}_{\text{sys}}}{dt}$ must be zero, implying that $\vec{L}_{\text{sys}}$ remains constant. This profound consequence leads us directly into the conservation of angular momentum.

## 9.3 Conservation of Angular Momentum

In Section 9.2, we established that the net external torque on a system dictates the rate at which its total angular momentum changes:

$$\vec{\tau}_{\text{net, ext}}=\frac{d\vec{L}_{\text{sys}}}{dt}$$

This relationship leads directly to one of the most powerful and fundamental principles in all of physics. If the net external torque acting on a system is zero, then the time derivative of the angular momentum is zero ($\frac{d\vec{L}_{\text{sys}}}{dt}=0$). Consequently, the total angular momentum of the system must remain constant in time.

This is the principle of **conservation of angular momentum**:

$$\vec{L}_i=\vec{L}_f$$

*If the net external torque on a system is zero, the total angular momentum of the system is conserved, in both magnitude and direction.*

### Conservation of Angular Momentum for Deformable Bodies

For a rigid body rotating about a fixed axis, we found that $L=I\omega$. In linear mechanics, the mass of an object rarely changes, so conservation of linear momentum ($m_iv_i=m_fv_f$) usually just means velocity is constant. However, in rotational mechanics, a system can easily change its moment of inertia ($I$) through internal forces by altering its mass distribution relative to the axis of rotation.

Because internal forces cannot exert a net external torque on the system, angular momentum is conserved even if the moment of inertia changes. Thus, for a system rotating about a fixed axis with zero external torque:

$$I_i\omega_i=I_f\omega_f$$

This equation explains why an object's angular velocity can increase or decrease without any outside twisting force.

```text
Visualizing Angular Momentum Conservation:

      State 1: Mass Distributed Out      State 2: Mass Pulled In
      (Large I, Small angular speed)     (Small I, Large angular speed)
       
              m       m                          m m 
               \  O  /                            O  
                --|--                           --|--
                  |                               |  
                 / \                             / \ 

         I_i is Large                       I_f is Small
         omega_i is Small                   omega_f is Large
         
                      L_i  =  L_f
                 I_i * omega_i = I_f * omega_f

```

**Classic Examples:**

* **The Ice Skater:** A spinning figure skater enters a spin with their arms and a leg extended, maximizing their moment of inertia ($I_i$). When they pull their limbs in tightly against their body, their moment of inertia decreases dramatically ($I_f < I_i$). To conserve angular momentum, their angular velocity must increase proportionately ($\omega_f > \omega_i$), resulting in a rapid blur of a spin.
* **The Diver and Gymnast:** A diver leaving a springboard pushes off with a slow rotation and an extended body. By tucking their knees into their chest, they reduce $I$, increasing $\omega$ enough to complete several somersaults before hitting the water. They extend their body again right before entry to decrease $\omega$ and enter the water cleanly.
* **Collapsing Stars:** When a massive star exhausts its nuclear fuel, its core can collapse under gravity to form a neutron star. A core the size of Earth might collapse to a radius of just 10 kilometers. Because $I \propto R^2$, the moment of inertia drops to a tiny fraction of its original value. To conserve angular momentum, the star's slow rotation accelerates to dozens or hundreds of revolutions per second, creating what we observe as a pulsar.

### Directional Conservation: The Vector Nature

Because $\vec{L}$ is a vector, conservation of angular momentum applies to all three spatial dimensions independently. If the net external torque is zero along a specific axis (say, the $z$-axis), then the $z$-component of angular momentum ($L_z$) is conserved, even if external torques exist along the $x$ or $y$ axes.

Furthermore, the conservation of the *direction* of the angular momentum vector is what gives spinning objects their remarkable stability. A spinning gyroscope or a thrown American football strongly resists forces that attempt to tip its axis of rotation, an effect heavily utilized in navigation systems and ballistics.

**The Rotating Stool and Bicycle Wheel:**
Consider a student sitting at rest on a frictionless rotating stool, holding a bicycle wheel spinning horizontally. Initially, the angular momentum of the system (student + stool + wheel) points upward.

1. $\vec{L}_{\text{initial}} = \vec{L}_{\text{wheel (up)}}$
2. If the student flips the spinning wheel upside down, the wheel's angular momentum now points downward.
3. Because there is no external torque on the (student + stool + wheel) system along the vertical axis, the total vertical angular momentum must remain unchanged.
4. To compensate for the wheel's new downward angular momentum, the student and the stool must begin to rotate in the original direction of the wheel, creating an upward angular momentum $\vec{L}_{\text{student}}$ such that:

$$\vec{L}_{\text{wheel (down)}} + \vec{L}_{\text{student (up)}} = \vec{L}_{\text{initial (up)}}$$

This demonstrates that angular momentum is not merely a bookkeeping number, but a strict geometric law governing the universe.

## 9.4 Conditions for Static Equilibrium

In Chapter 4, we established that a particle is in mechanical equilibrium when the net external force acting on it is zero ($\sum\vec{F}=0$). For a single point particle, this single condition is sufficient to guarantee that it will not accelerate. However, real physical objects are extended bodies, not mere points. For an extended rigid body, having a net force of zero ensures only that its center of mass will not accelerate translationally. The object could still undergo rotational acceleration if the applied forces create a net twist or torque.

Therefore, for an extended rigid body to remain completely at rest—a state known as **static equilibrium**—two distinct conditions must be simultaneously satisfied: one for translational motion and one for rotational motion.

### The First Condition: Translational Equilibrium

The first condition for static equilibrium dictates that the object must have zero translational acceleration ($\vec{a}=0$). According to Newton's second law ($\vec{F}_{\text{net}}=m\vec{a}$), this requires that the vector sum of all external forces acting on the body must be zero:

$$\sum\vec{F}_{\text{ext}}=0$$

Because force is a vector, this condition must hold true for all three independent spatial directions. In a standard Cartesian coordinate system, this single vector equation breaks down into three scalar equations:

$$\sum F_x = 0, \quad \sum F_y = 0, \quad \sum F_z = 0$$

If these equations are satisfied, the object's center of mass is either at rest or moving with a constant velocity. For *static* equilibrium, we specifically require that the center of mass is at rest ($v=0$).

### The Second Condition: Rotational Equilibrium

The second condition addresses the rotational motion of the object. For a body to have zero angular acceleration ($\vec{\alpha}=0$), Newton's second law for rotation ($\vec{\tau}_{\text{net}}=I\vec{\alpha}$) dictates that the vector sum of all external torques acting on the body must be zero:

$$\sum\vec{\tau}_{\text{ext}}=0$$

Similar to the force condition, this vector equation must be satisfied about any axis of rotation:

$$\sum \tau_x = 0, \quad \sum \tau_y = 0, \quad \sum \tau_z = 0$$

For *static* equilibrium, the object must also have zero initial angular velocity ($\omega=0$).

### Choosing the Axis of Rotation

A profound and highly useful theorem in statics states: *If a body is in translational equilibrium ($\sum\vec{F}=0$), then the net torque acting on it will be identical regardless of where you choose the axis of rotation.*

If the net torque is zero about one axis, it is zero about *every* conceivable axis.

This gives you a massive strategic advantage when solving physics problems. Because torque depends on the distance from the pivot point ($\tau=rF\sin\theta$), a force acting directly *through* the pivot point has a lever arm of zero ($r=0$) and therefore exerts zero torque. By cleverly placing your imaginary axis of rotation precisely where an unknown force acts, you immediately eliminate that unknown variable from your torque equation.

```text
Static Equilibrium of a Balanced Beam (Seesaw)

        y ^
          |      F_N (Normal force from fulcrum)
          |       ^
          |       |
          +-------|----------------------> x
         /        | pivot              \
        /         |                     \
      m_1 g       v                     m_2 g
                m_beam g

      |--- r_1 ---|-------- r_2 --------|

```

In the diagram above, a beam rests on a fulcrum. To determine the unknown forces, we apply both equilibrium conditions:

1. **Translational:** $\sum F_y = F_N - m_1g - m_{\text{beam}}g - m_2g = 0$
2. **Rotational:** If we choose the fulcrum as the pivot point, $F_N$ and the beam's weight (if centered) create no torque. The rotational condition simplifies to balancing the torques of the two masses: $(r_1)(m_1g) - (r_2)(m_2g) = 0$.

### The Center of Gravity

When applying the rotational equilibrium condition, we must account for the torque produced by the object's own weight. Gravity does not pull on a single point; it pulls on every microscopic atom within the extended body. However, calculating millions of individual microscopic torques is impossible.

Fortunately, the sum of all these infinitesimal torques is mathematically identical to the torque that would be produced if the *entire weight of the object* acted at a single, specific point. This point is called the **center of gravity (CG)**.

$$\vec{\tau}_{\text{gravity}}=\vec{r}_{\text{cg}}\times M\vec{g}$$

In situations where the gravitational field ($\vec{g}$) is uniform over the entire extent of the object—which is true for nearly all everyday engineering and architectural applications on Earth's surface—the center of gravity is located at the exact same coordinates as the **center of mass**. Thus, when drawing free-body diagrams for rigid bodies in static equilibrium, you simply draw a single downward force vector of magnitude $Mg$ originating from the object's center of mass.

## 9.5 Elasticity, Stress, and Strain

Up to this point in our study of mechanics, including the conditions for static equilibrium in Section 9.4, we have treated solid objects as perfectly rigid. A perfectly rigid body does not bend, stretch, or compress regardless of the magnitude of the forces applied to it. In reality, absolutely rigid bodies do not exist; all materials deform to some extent when subjected to external forces.

The study of these deformations and the internal forces that resist them falls under the domain of **elasticity**. To quantify elasticity across different materials independent of their specific size or shape, physicists and engineers use two fundamental concepts: stress and strain.

### Stress and Strain

**Stress** is a measure of the deforming force applied to an object per unit of cross-sectional area. It characterizes the strength of the external agent causing the deformation.

$$\text{Stress} = \frac{F}{A}$$

The SI unit of stress is the newton per square meter ($\text{N}/\text{m}^2$), which is given the special name **pascal** ($\text{Pa}$). This is the exact same unit used for pressure.

**Strain** is a measure of the degree of deformation. It is the geometric response of the material to the applied stress, defined as the ratio of the change in a dimension to the original dimension. Because it is a ratio of two lengths (or two volumes), strain is a dimensionless quantity.

In 1676, Robert Hooke discovered that for relatively small deformations, the stress and strain in a material are directly proportional. This is the generalized form of Hooke's Law:

$$\text{Stress} = \text{Elastic Modulus} \times \text{Strain}$$

The proportionality constant is called the **elastic modulus**. It represents the stiffness of the material—a larger modulus means the material requires a greater stress to produce a given strain. Depending on the nature of the applied force, we define three specific types of stress, strain, and corresponding moduli.

### 1. Young's Modulus (Tension and Compression)

When external forces act perpendicular to the cross-sectional area of an object, attempting to stretch or compress it along its length, the object is subject to **tensile stress** (stretching) or **compressive stress** (squashing).

```text
Tensile Stress:

      Original length (L_0)
      |-------------------|
                           
      |===================|           ---
  <-F |                   | F ->       | Cross-sectional
      |===================|           --- Area (A)
                           
      |-------------------|---|
          Stretched (L_0 + Delta L)

```

The tensile (or compressive) strain is the fractional change in length: $\Delta L / L_0$. The corresponding elastic modulus is called **Young's modulus ($Y$)**:

$$Y = \frac{\text{Tensile Stress}}{\text{Tensile Strain}} = \frac{F_{\perp}/A}{\Delta L/L_0}$$

Materials with a high Young's modulus, like steel, are very rigid and resist changes in length. Materials with a low Young's modulus, like rubber, stretch easily.

### 2. Shear Modulus

When forces are applied parallel (tangential) to the surfaces of an object, they attempt to slide layers of the material past one another. This is known as **shear stress**.

```text
Shear Stress:
                       F_parallel ->
        +-------------------+
       /                   /|
      /                   / | Height (h)
     /                   /  |
    +-------------------+   +
    | Fixed Base        |

    <--- Delta x ---> (displacement of the top surface)

```

The shear strain is defined as the ratio of the horizontal displacement ($\Delta x$) of the sheared face to the height ($h$) of the object. The corresponding modulus is the **shear modulus ($S$)**:

$$S = \frac{\text{Shear Stress}}{\text{Shear Strain}} = \frac{F_{\parallel}/A}{\Delta x/h}$$

### 3. Bulk Modulus (Volume Deformation)

When an object is submerged in a fluid, the fluid exerts a uniform inward force perpendicular to all its surfaces. This type of stress, called **volume stress** or pressure ($\Delta P$), causes the object's total volume to decrease without changing its overall shape.

The volume strain is the fractional change in volume: $\Delta V / V_0$. The corresponding modulus is the **bulk modulus ($B$)**:

$$B = \frac{\text{Volume Stress}}{\text{Volume Strain}} = -\frac{\Delta P}{\Delta V/V_0}$$

We include a negative sign in the definition because an increase in pressure (positive $\Delta P$) always results in a decrease in volume (negative $\Delta V$). The negative sign ensures that the bulk modulus $B$ is a positive value. The reciprocal of the bulk modulus ($1/B$) is known as the **compressibility** of the material.

### The Stress-Strain Curve

While the generalized Hooke's Law dictates a linear relationship between stress and strain, this proportionality only holds true up to a certain point. If we gradually increase the tensile stress on a metal wire and plot the resulting strain, we observe several distinct regions.

```text
Typical Stress-Strain Curve for a Metal:

  Stress (F/A)
    ^
    |                       Ultimate Strength
    |                             *  
    |                          .     .  Fracture
    |                       .           *
    |             Yield   . 
    |             Point .    (Plastic Region)
    | Elastic       * 
    | Limit      .
    |         .
    |      .   (Elastic Region)
    |   .
    | .   (Linear Region: Hooke's Law applies)
    |
    +----------------------------------------> Strain (Delta L / L_0)

```

1. **Proportional Limit:** The highest stress at which stress is directly proportional to strain (the curve is a straight line).
2. **Elastic Limit (Yield Point):** The maximum stress the material can endure and still return to its original length when the force is removed. Up to this point, the deformation is *elastic*.
3. **Plastic Region:** Beyond the elastic limit, the material undergoes *plastic deformation*. It will stretch significantly with very little additional stress. If the force is removed here, the object will have a permanent, irreversible deformation.
4. **Ultimate Strength:** The absolute maximum stress the material can withstand.
5. **Fracture Point:** The point at which the material physically breaks or snaps.

## Chapter Summary

* **The Cross Product:** The vector (cross) product of two vectors $\vec{A}$ and $\vec{B}$ yields a third vector $\vec{C} = \vec{A} \times \vec{B}$ that is perpendicular to both. Its magnitude is $|\vec{C}| = AB\sin\theta$, and its direction is determined by the right-hand rule. The cross product is anti-commutative: $\vec{A} \times \vec{B} = -(\vec{B} \times \vec{A})$.
* **Angular Momentum:** The rotational analog of linear momentum. For a single particle, $\vec{L} = \vec{r} \times \vec{p}$. For a rigid body rotating about a fixed symmetric axis, $L = I\omega$.
* **Newton's Second Law for Rotation:** The net external torque on a system is equal to the time rate of change of its total angular momentum: $\vec{\tau}_{\text{net, ext}} = \frac{d\vec{L}_{\text{sys}}}{dt}$.
* **Conservation of Angular Momentum:** If the net external torque acting on a system is zero, the total angular momentum of the system remains constant ($\vec{L}_i = \vec{L}_f$). Internal forces can change a system's moment of inertia, resulting in a change in angular velocity ($I_i\omega_i = I_f\omega_f$) without any external torque.
* **Static Equilibrium:** For an extended rigid body to remain completely at rest, it must satisfy two conditions simultaneously:

1. Translational Equilibrium: The net external force must be zero ($\sum\vec{F} = 0$).
2. Rotational Equilibrium: The net external torque about *any* chosen axis must be zero ($\sum\vec{\tau} = 0$).

* **Elasticity:** Real objects deform under stress. Stress is the applied force per unit area ($F/A$), and strain is the resulting fractional deformation. Within the elastic limit, stress is proportional to strain via an elastic modulus (Young's modulus for length, Shear modulus for shape, Bulk modulus for volume).
