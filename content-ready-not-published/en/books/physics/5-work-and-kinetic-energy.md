Previously, we used Newton's laws and kinematics to analyze motion, but this approach becomes difficult when dealing with variable forces or complex paths. This chapter introduces a highly effective alternative framework based on energy and work. We will precisely define work in physics and explore how it transfers energy into or out of systems, connecting these concepts via the Work-Energy Theorem. We will also examine power—the rate of energy transfer—and introduce the scalar dot product as our mathematical foundation. By shifting focus from forces to energy, you will gain a profound, simplified tool for analyzing physical systems.

## 5.1 Work Done by a Constant Force

In everyday language, the word "work" is used to describe any activity that requires physical or mental effort. In physics, however, **work** has a very specific, formal definition. Work is done on a system by an external force when that force causes a displacement of the system. If you push against a solid brick wall until you are exhausted, you may feel you have done a lot of work, but in the physics sense, because the wall has not moved, no work has been done.

For work to occur, two conditions must be met:

1. A force must act on the object.
2. The object must undergo a displacement, and there must be a component of the force parallel to the direction of that displacement.

### The Mathematical Definition of Work

Consider an object undergoing a displacement of magnitude $d$ along a straight line while a constant force of magnitude $F$ acts on it. If the force is applied at an angle $\theta$ relative to the direction of the displacement, the work $W$ done by that constant force is defined as the product of the displacement magnitude and the component of the force in the direction of the displacement.

$$W = F d \cos\theta$$

Here:

* $F$ is the magnitude of the constant force (always positive).
* $d$ is the magnitude of the displacement (always positive).
* $\theta$ is the angle between the force vector and the displacement vector.

Below is a schematic representation of a block being pulled by a constant force across a horizontal surface:

```text
               F
              /
             /
            /|  
           / | F*cos(θ)
          /  |
         / θ |
        +----|-----------------+
        |    v                 |
        |    ----------------> |  Displacement (d) --->
        +----------------------+
========================================

```

Because work is the product of a force (measured in Newtons) and a displacement (measured in meters), the SI unit of work is the Newton-meter (N·m). This combination of units is given a special name, the **Joule** (J), in honor of the English physicist James Prescott Joule.

1 J = 1 N·m

Although force and displacement are both vector quantities (as discussed in Chapters 1 and 3), work is a **scalar quantity**. It has a magnitude and a sign (positive or negative), but it does not have a direction in space. Note that the formal vector operation that multiplies two vectors to yield a scalar will be introduced later in Section 5.5.

### The Sign of Work: Positive, Negative, and Zero

Because $F$ and $d$ in our equation are magnitudes, they are strictly positive. Therefore, the sign of the work done is entirely determined by the $\cos\theta$ term. The angle $\theta$ between the force and displacement vectors dictates whether the work is positive, negative, or zero.

**1. Positive Work ($0^\circ \le \theta < 90^\circ$)**
When the force has a component in the same direction as the displacement, $\cos\theta$ is positive, making the work positive. Positive work implies that the force is attempting to speed the object up (transferring energy into the object).

* *Example:* Pushing a grocery cart down an aisle. If you push perfectly horizontally ($\theta = 0^\circ$), then $\cos(0^\circ) = 1$, and the equation simplifies to $W = Fd$.

**2. Zero Work ($\theta = 90^\circ$)**
When the force acts perpendicular to the direction of the displacement, $\cos(90^\circ) = 0$, meaning the work done by that specific force is zero. A force perpendicular to the motion does not speed up or slow down the object along its path.

* *Example:* Carrying a heavy box across a level room at a constant velocity. The upward normal force from your hands (and the downward force of gravity) acts at a 90° angle to the horizontal displacement. Therefore, neither gravity nor the normal force does any work on the box during the horizontal motion.

**3. Negative Work ($90^\circ < \theta \le 180^\circ$)**
When the force has a component in the direction opposite to the displacement, $\cos\theta$ is negative, making the work negative. Negative work implies the force is attempting to slow the object down (removing energy from the object).

* *Example:* The force of kinetic friction (introduced in Chapter 4) acting on a sliding block. Friction opposes the motion, meaning the angle between the frictional force and the displacement is 180°. Since $\cos(180^\circ) = -1$, the work done by friction is $W = -f_k d$.

### Net Work Done by Multiple Forces

In most realistic scenarios, multiple forces act on an object simultaneously. To find the **net work** ($W_{\text{net}}$) done on the object, you can use one of two equivalent methods:

**Method A: Sum of Individual Works**
Calculate the work done by each individual force separately using $W = F d \cos\theta$, and then add the individual scalar values together algebraically (keeping their positive or negative signs).

$$W_{\text{net}} = W_1 + W_2 + W_3 + \dots$$

**Method B: Work Done by the Net Force**
First, use vector addition (Newton's Second Law, Chapter 4) to find the net force ($F_{\text{net}}$) acting on the object. Then, calculate the work done by this single net force.

$$W_{\text{net}} = F_{\text{net}} d \cos\theta_{\text{net}}$$

Where $\theta_{\text{net}}$ is the angle between the net force vector and the displacement vector. Both methods will always yield the exact same result for a solid object.

## 5.2 Work Done by a Variable Force

In the previous section, we analyzed situations where the force acting on an object remained constant in both magnitude and direction. However, in nature, forces frequently change as an object moves. For example, the force required to stretch a rubber band increases the further you pull it, and the gravitational force between the Earth and a spacecraft decreases as the spacecraft travels further into space. We cannot use the simple equation $W = Fd\cos\theta$ for these situations because there is no single value for $F$.

To calculate the work done by a variable force, we must rely on graphical analysis and the mathematics of calculus.

### Graphical Interpretation of Work

Consider an object moving along the $x$-axis under the influence of a variable force, $F_x$, which changes its magnitude as a function of position, $x$. If we plot this force versus position, we get a curve rather than a horizontal line.

To find the work done as the object moves from an initial position $x_i$ to a final position $x_f$, we can imagine dividing the total displacement into many infinitesimally small segments, each of width $\Delta x$.

```text
  F_x 
   ^
   |           * * * *
   |         * | | | | *
   |       *   | | | |   *
   |      *    | | | |    *
   |     *     | | | |     *
   |    *      | | | |      *
   |   *       | | | |       *
   +-----------+-----+------------> x
              x_i   x_f

```

For any single tiny segment $\Delta x$, the force $F_x$ is approximately constant. The small amount of work $\Delta W$ done over this segment is simply the force during that segment multiplied by the tiny displacement:

$$\Delta W \approx F_x \Delta x$$

Geometrically, $F_x \Delta x$ is the area of a narrow rectangle of height $F_x$ and width $\Delta x$. The total work done over the entire displacement from $x_i$ to $x_f$ is approximately the sum of the areas of all these tiny rectangles:

$$W \approx \sum_{x_i}^{x_f} F_x \Delta x$$

As we make the segments $\Delta x$ smaller and smaller (approaching zero), the approximation becomes exact. In the language of calculus, this limit of the sum as $\Delta x \to 0$ is the **definite integral**. Therefore, the work done by a variable force is exactly equal to the area under the Force versus Position curve between $x_i$ and $x_f$.

$$W = \int_{x_i}^{x_f} F_x \, dx$$

### Application: Work Done by a Spring

A classic example of a variable force is the force exerted by an ideal spring. When you stretch or compress a spring from its natural, relaxed length (the equilibrium position, $x = 0$), the spring pushes or pulls back with a restoring force.

According to **Hooke's Law**, the force $F_s$ exerted by an ideal spring is directly proportional to the displacement $x$ from equilibrium:

$$F_s = -kx$$

Here, $k$ is the **spring constant** (or force constant), a measure of the spring's stiffness, expressed in Newtons per meter (N/m). The negative sign indicates that the spring force is a *restoring force*—it always points in the direction opposite to the displacement.

```text
 Equilibrium (x = 0):
 |----/\/\/\/\/\----[ Mass ]

 Stretched (x > 0):
 |----/\/\/\/\/\/\/\/\----[ Mass ] ---> Displacement (x)
                    <---- F_s (Spring Force)

 Compressed (x < 0):
 |----/\/\/\--[ Mass ]
       <--- Displacement (-x)
       ---> F_s (Spring Force)

```

Let us calculate the work $W_s$ done *by the spring* on an object as the object moves from an initial position $x_i$ to a final position $x_f$. We apply our integral definition of work:

$$W_s = \int_{x_i}^{x_f} F_s \, dx = \int_{x_i}^{x_f} (-kx) \, dx$$

Factoring out the constant $-k$ and evaluating the integral of $x \, dx$:

$$W_s = -k \left[ \frac{1}{2}x^2 \right]_{x_i}^{x_f}$$

$$W_s = \frac{1}{2}kx_i^2 - \frac{1}{2}kx_f^2$$

Notice the signs in this result:

* If you pull a block attached to a spring further away from equilibrium (e.g., from $x_i = 0$ to $x_f = x$), the magnitude of $x_f$ is greater than $x_i$. The work done *by the spring* is **negative** ($W_s = -\frac{1}{2}kx^2$). This makes sense because the spring force pulls in the opposite direction of the displacement.
* If you release the stretched spring and it moves back toward equilibrium (e.g., from $x_i = x$ to $x_f = 0$), the work done *by the spring* is **positive** ($W_s = \frac{1}{2}kx^2$). The spring force and the displacement are now in the same direction.

### Work Done *On* a Spring by an Applied Force

It is important to distinguish between the work done *by* the spring and the work done *on* the spring by an external agent (like your hand). If you stretch a spring slowly at a constant velocity, your applied force $F_{\text{app}}$ must be equal and opposite to the spring force at every point:

$$F_{\text{app}} = -F_s = -(-kx) = kx$$

The work done by your applied force is therefore the integral of positive $kx$:

$$W_{\text{app}} = \int_{x_i}^{x_f} (kx) \, dx = \frac{1}{2}kx_f^2 - \frac{1}{2}kx_i^2$$

If you start stretching from equilibrium ($x_i = 0$) to a final position $x$, the work you do is $W_{\text{app}} = \frac{1}{2}kx^2$. This positive work represents the energy you transfer into the spring system, which is stored as potential energy—a concept that will be formalized in Chapter 6.

## 5.3 Kinetic Energy and the Work-Energy Theorem

In the previous sections, we defined work as the product of force and displacement. But what is the physical consequence of doing work on an object? When a net external force acts on a system, it causes the system to accelerate. As the object accelerates over a displacement, its speed changes. This deep connection between work, force, and motion leads us to one of the most fundamental concepts in physics: energy.

### Deriving the Relationship

Let us examine a particle of mass $m$ moving in one dimension along the $x$-axis under the influence of a constant net force, $F_{\text{net}}$. Because the net force is constant, the particle undergoes constant acceleration, $a$.

From Newton's Second Law (Chapter 4), we know that $F_{\text{net}} = ma$.
The net work $W_{\text{net}}$ done on the particle as it moves through a displacement $\Delta x$ is:

$$W_{\text{net}} = F_{\text{net}} \Delta x = (ma) \Delta x$$

We can relate the acceleration and displacement to the particle's initial speed $v_i$ and final speed $v_f$ using the kinematic equation for constant acceleration (Chapter 2):

$$v_f^2 = v_i^2 + 2a\Delta x$$

Solving this equation for $a\Delta x$ yields:

$$a\Delta x = \frac{v_f^2 - v_i^2}{2}$$

Substituting this expression back into our equation for net work:

$$W_{\text{net}} = m \left( \frac{v_f^2 - v_i^2}{2} \right)$$

$$W_{\text{net}} = \frac{1}{2}mv_f^2 - \frac{1}{2}mv_i^2$$

Although we derived this using a constant force, the result holds entirely true for a variable force. Using the calculus definition of work from Section 5.2, we can substitute $F_{\text{net}} = m \frac{dv}{dt}$ and use the chain rule to change the variable of integration from position to velocity:

$$W_{\text{net}} = \int_{x_i}^{x_f} F_{\text{net}} \, dx = \int_{x_i}^{x_f} \left( m \frac{dv}{dt} \right) dx = \int_{v_i}^{v_f} m \left( \frac{dx}{dt} \right) dv = \int_{v_i}^{v_f} mv \, dv$$

Evaluating this integral gives the exact same result:

$$W_{\text{net}} = \left[ \frac{1}{2}mv^2 \right]_{v_i}^{v_f} = \frac{1}{2}mv_f^2 - \frac{1}{2}mv_i^2$$

### Kinetic Energy

The quantity $\frac{1}{2}mv^2$ appears so frequently in physics that we give it a special name: **kinetic energy** ($K$). Kinetic energy is the energy that an object possesses due to its motion.

$$K = \frac{1}{2}mv^2$$

Because it is constructed from a mass ($m$, which is always positive) and the square of a speed ($v^2$, which is also always positive), kinetic energy is a **scalar quantity** that is never negative. It does not depend on the direction of motion; a car moving north at 20 m/s has the exact same kinetic energy as an identical car moving south at 20 m/s.

From the definition, the SI unit of kinetic energy is kg·m²/s². Since we know that $1\text{ N} = 1\text{ kg}\cdot\text{m/s}^2$, we can rewrite the unit of kinetic energy as N·m, which is the definition of the **Joule** (J). Thus, kinetic energy is measured in the exact same units as work.

### The Work-Energy Theorem

By substituting our new definition of kinetic energy into our derivation for net work, we arrive at the **Work-Energy Theorem**:

$$W_{\text{net}} = K_f - K_i = \Delta K$$

The Work-Energy Theorem states that **the net work done on an object by all external forces equals the change in that object's kinetic energy.**

This theorem provides a powerful conceptual framework for analyzing motion. It tells us that work is the mechanism by which energy is transferred into or out of a system:

1. **Positive Net Work ($W_{\text{net}} > 0$):** The environment does work on the object, transferring energy into it. The final kinetic energy is greater than the initial kinetic energy, and the object **speeds up**.
2. **Negative Net Work ($W_{\text{net}} < 0$):** The object does work on the environment, transferring energy out of the system. The final kinetic energy is less than the initial kinetic energy, and the object **slows down**.
3. **Zero Net Work ($W_{\text{net}} = 0$):** There is no net transfer of energy. The kinetic energy remains constant, meaning the object's speed does not change (though its direction might, as in uniform circular motion).

```text
  CASE 1: Positive Net Work       CASE 2: Zero Net Work           CASE 3: Negative Net Work
  (Energy transferred IN)         (No net energy transfer)        (Energy transferred OUT)
  
      F_net --->                     F_net = 0                        <--- F_net
  [ m ] -----> v_i                [ m ] -----> v_i                [ m ] -----> v_i
   ...                             ...                             ...
  [ m ] -----------> v_f          [ m ] -----> v_f                [ m ] -> v_f
  
       v_f > v_i                       v_f = v_i                       v_f < v_i
      K increases                      K is constant                   K decreases

```

The Work-Energy Theorem is often much easier to use than Newton's laws and kinematics, particularly when forces are variable or paths are complex. Because work and kinetic energy are scalar quantities, you do not need to decompose vectors into $x$, $y$, and $z$ components to find an object's speed at a given point—you only need to know the initial speed and the total work done.

## 5.4 Power

When calculating the work done on an object or the energy transferred to it, time is not a factor. Lifting a 100 kg barbell 2 meters straight up requires the exact same amount of work whether it takes you 1 second or 10 seconds. However, the physical strain and the requirements of the mechanism doing the lifting are vastly different. To quantify how quickly work is done, physics introduces the concept of **power**.

Power is defined as the time rate at which work is done or energy is transferred.

### Average and Instantaneous Power

If an external force does an amount of work $W$ over a time interval $\Delta t$, the **average power** ($P_{\text{avg}}$) delivered during that interval is:

$$P_{\text{avg}} = \frac{W}{\Delta t}$$

Because the Work-Energy Theorem (Section 5.3) shows that work is a transfer of energy, we can also define average power more generally as the rate of energy transfer $\Delta E$:

$$P_{\text{avg}} = \frac{\Delta E}{\Delta t}$$

As with velocity and acceleration, we often want to know the power at a specific moment rather than an average over an interval. The **instantaneous power** ($P$) is the limiting value of the average power as the time interval $\Delta t$ approaches zero. In the language of calculus, instantaneous power is the derivative of work with respect to time:

$$P = \lim_{\Delta t \to 0} \frac{\Delta W}{\Delta t} = \frac{dW}{dt}$$

We can visualize this relationship graphically. If we plot the work done on a system as a function of time, the instantaneous power at any given moment is the slope of the tangent line to the curve at that point.

```text
  Work (W)
    ^
    |       Machine A (Steep slope = High Power)
    |      /
    |     /
    |    /      Machine B (Shallow slope = Low Power)
    |   /      /
    |  /      /
    | /      /
    |/      /
    +---------------------> Time (t)

```

*In the graph above, both Machine A and Machine B might eventually do the same total amount of work, but Machine A reaches that total in less time, meaning it has a higher power output.*

### Units of Power

Because power is work divided by time, its SI unit is Joules per second (J/s). This unit is used so frequently that it is given its own name: the **Watt** (W), in honor of the Scottish engineer and inventor James Watt.

$$1 \text{ W} = 1 \text{ J/s} = 1 \text{ kg}\cdot\text{m}^2/\text{s}^3$$

A 100 W lightbulb, for example, transforms 100 Joules of electrical energy into light and thermal energy every single second.

In engineering and the automotive industry, another common unit of power is the **horsepower** (hp). The conversion factor between horsepower and Watts is:

$$1 \text{ hp} = 746 \text{ W}$$

**A Note on the Kilowatt-Hour:**
Utility companies measure electrical energy consumption using a unit called the kilowatt-hour (kWh). Despite containing the word "watt," the kilowatt-hour is a unit of *energy*, not power. It is the amount of energy transferred by a 1-kilowatt (1000 W) device running continuously for 1 hour (3600 s).

$$1 \text{ kWh} = (1000 \text{ J/s})(3600 \text{ s}) = 3.6 \times 10^6 \text{ J}$$

### Power, Force, and Velocity

We can express power in terms of force and velocity, which is incredibly useful for analyzing moving vehicles or biological systems.

Consider an object moving a small distance $\Delta x$ along a straight line. If a constant force $F$ acts on the object at an angle $\theta$ relative to the displacement, the small amount of work done is $\Delta W = F \Delta x \cos\theta$.

If we divide both sides by the time interval $\Delta t$ it takes to undergo this displacement, we get:

$$P_{\text{avg}} = \frac{\Delta W}{\Delta t} = F \left( \frac{\Delta x}{\Delta t} \right) \cos\theta$$

Since $\Delta x / \Delta t$ is the average velocity $v_{\text{avg}}$, we can write:

$$P_{\text{avg}} = F v_{\text{avg}} \cos\theta$$

Taking the limit as $\Delta t \to 0$, the average velocity becomes the instantaneous velocity $v$, yielding the equation for instantaneous power:

$$P = F v \cos\theta$$

This equation reveals a crucial trade-off in mechanical systems like car transmissions or bicycle gears. For a motor or engine providing a maximum constant power output $P$, the force it can exert is inversely proportional to the speed. When a truck moves slowly (low $v$), the engine can provide a massive forward force (high $F$) to climb a steep hill. When the truck is moving at highway speeds (high $v$), the available forward force drops significantly.

## 5.5 The Scalar (Dot) Product of Two Vectors

In Sections 5.1 and 5.4, we encountered equations containing the product of two vector magnitudes and the cosine of the angle between them (e.g., $W = Fd\cos\theta$ and $P = Fv\cos\theta$). This specific mathematical operation—multiplying the magnitudes of two vectors and the cosine of their enclosed angle—appears so frequently in physics that it is defined as a formal mathematical operation called the **scalar product** or **dot product**.

Given any two vectors $\vec{A}$ and $\vec{B}$, their scalar product is written as $\vec{A} \cdot \vec{B}$ (read as "A dot B") and is defined as:

$$\vec{A} \cdot \vec{B} = AB \cos\theta$$

Here:

* $A$ is the magnitude of vector $\vec{A}$.
* $B$ is the magnitude of vector $\vec{B}$.
* $\theta$ is the angle between the two vectors when they are drawn tail-to-tail ($0^\circ \le \theta \le 180^\circ$).

As the name implies, the scalar product of two vectors yields a **scalar quantity** (a number with units, but no direction), not a new vector.

### Geometric Interpretation

The dot product can be understood geometrically as the product of the magnitude of one vector and the scalar projection of the second vector onto the first.

If we look at the term $B \cos\theta$, it represents the component of vector $\vec{B}$ that lies parallel to vector $\vec{A}$.

```text
           B
          ^
         /|
        / |
       /  |
      /   |
     /    |
    / θ   |
   +------+-----------> A
   |      |
   +------+
   B cos(θ)
(Projection of B along A)

```

Therefore, we can think of the dot product as:

$$\vec{A} \cdot \vec{B} = A (B \cos\theta) = (\text{magnitude of } \vec{A}) \times (\text{component of } \vec{B} \text{ along } \vec{A})$$

Because the operation is commutative, it is equally valid to think of it as the magnitude of $\vec{B}$ multiplied by the component of $\vec{A}$ along $\vec{B}$:

$$\vec{A} \cdot \vec{B} = B (A \cos\theta)$$

### Properties of the Scalar Product

The dot product obeys several important algebraic rules:

1. **Commutative Property:** The order of multiplication does not matter.

$$\vec{A} \cdot \vec{B} = \vec{B} \cdot \vec{A}$$

1. **Distributive Property:** The dot product distributes over vector addition.

$$\vec{A} \cdot (\vec{B} + \vec{C}) = \vec{A} \cdot \vec{B} + \vec{A} \cdot \vec{C}$$

1. **Parallel Vectors ($\theta = 0^\circ$):** If two vectors point in the exact same direction, $\cos(0^\circ) = 1$, so the dot product is simply the product of their magnitudes.

$$\vec{A} \cdot \vec{B} = AB$$

*(Consequently, the dot product of a vector with itself is the square of its magnitude: $\vec{A} \cdot \vec{A} = A^2$.)*
4. **Perpendicular Vectors ($\theta = 90^\circ$):** If two vectors are orthogonal (perpendicular), $\cos(90^\circ) = 0$. The dot product of any two perpendicular vectors is identically zero, regardless of their magnitudes.

$$\vec{A} \cdot \vec{B} = 0$$

### Calculating Dot Products Using Components

Often, vectors are given in unit-vector notation rather than by their magnitude and angle. Recall from Chapter 1 that $\hat{i}$, $\hat{j}$, and $\hat{k}$ are mutually perpendicular unit vectors pointing along the $x$, $y$, and $z$ axes, respectively.

Because they are mutually perpendicular and each has a magnitude of exactly 1, their dot products follow a simple pattern based on the properties above:

* $\hat{i} \cdot \hat{i} = \hat{j} \cdot \hat{j} = \hat{k} \cdot \hat{k} = (1)(1)\cos(0^\circ) = 1$
* $\hat{i} \cdot \hat{j} = \hat{j} \cdot \hat{k} = \hat{k} \cdot \hat{i} = (1)(1)\cos(90^\circ) = 0$

If we have two vectors expressed in component form:
$\vec{A} = A_x\hat{i} + A_y\hat{j} + A_z\hat{k}$
$\vec{B} = B_x\hat{i} + B_y\hat{j} + B_z\hat{k}$

We can find their dot product by multiplying them algebraically and applying the distributive property. All cross-terms (like $A_x\hat{i} \cdot B_y\hat{j}$) will evaluate to zero, leaving only the terms where the unit vectors match:

$$\vec{A} \cdot \vec{B} = A_x B_x + A_y B_y + A_z B_z$$

This component equation is extremely powerful because it allows you to calculate the dot product (and thus find angles between vectors in three-dimensional space) without needing to know the angle $\theta$ beforehand. By combining the two definitions of the dot product, the angle between any two vectors can be found using:

$$\cos\theta = \frac{A_x B_x + A_y B_y + A_z B_z}{AB}$$

### Work as a Dot Product

With the mathematical framework of the dot product established, we can write the definition of work in its most elegant and general form.

For a constant force $\vec{F}$ causing a displacement $\vec{d}$, the work done is the dot product of the force and displacement vectors:

$$W = \vec{F} \cdot \vec{d}$$

If the force varies as the object moves along a curved path in three-dimensional space, we represent an infinitesimally small displacement as the vector $d\vec{r} = dx\hat{i} + dy\hat{j} + dz\hat{k}$. The total work is then the general line integral of the dot product of the force and the infinitesimal displacement:

$$W = \int_{\vec{r}_i}^{\vec{r}_f} \vec{F} \cdot d\vec{r}$$

This formulation encompasses all previous definitions of work and forms the mathematical foundation for analyzing energy in complex, three-dimensional physical systems.

---

## Chapter Summary

* **Work by a Constant Force:** Work ($W$) is done when a force causes a displacement. For a constant force, $W = Fd\cos\theta$, where $\theta$ is the angle between the force vector and the displacement vector. The SI unit of work is the Joule (J).
* **Work by a Variable Force:** When a force changes with position, work is the area under the Force vs. Position graph. Mathematically, it is evaluated using the definite integral: $W = \int_{x_i}^{x_f} F_x \, dx$. A prime example is the work done by an ideal spring, which obeys Hooke's Law ($F_s = -kx$).
* **Kinetic Energy:** The energy associated with an object's motion is its kinetic energy, defined as $K = \frac{1}{2}mv^2$. Like work, it is a scalar quantity measured in Joules.
* **The Work-Energy Theorem:** The net work done on an object by all external forces is equal to the change in the object's kinetic energy: $W_{\text{net}} = \Delta K = K_f - K_i$.
* **Power:** Power ($P$) is the rate at which work is done or energy is transferred. Average power is $P_{\text{avg}} = W / \Delta t$, while instantaneous power is $P = dW/dt$. Power can also be expressed as $P = Fv\cos\theta$. The SI unit of power is the Watt (W), equivalent to 1 J/s.
* **The Scalar (Dot) Product:** The dot product of two vectors is a scalar operation defined as $\vec{A} \cdot \vec{B} = AB\cos\theta$. In component notation, it is calculated as $\vec{A} \cdot \vec{B} = A_x B_x + A_y B_y + A_z B_z$. Using this operation, work is fundamentally defined as the dot product of force and displacement: $W = \vec{F} \cdot \vec{d}$.
