In previous chapters, we restricted our study of motion to a straight line. However, the physical world is three-dimensional. From a basketball arching toward a hoop to a car navigating a curved road, real-world phenomena require an expanded kinematic toolkit.

Here, we bridge the gap between linear movement and complex spatial trajectories. By combining vector mathematics with position, velocity, and acceleration, we uncover a powerful principle: multi-dimensional motion can be broken down into independent one-dimensional motions. This principle allows us to master projectile paths, decode uniform circular motion, and understand relative velocity across different frames of reference.

## 3.1 Position, Velocity, and Acceleration Vectors

In Chapter 2, we described the motion of an object moving along a straight line using scalar quantities with algebraic signs to denote direction. To describe the more general case of motion in two or three dimensions, we must fully utilize the vector mathematics introduced in Chapter 1. We begin by extending our fundamental kinematic definitions—position, displacement, velocity, and acceleration—into three-dimensional vector quantities.

### The Position Vector

The location of a particle in space is specified by its **position vector**, traditionally denoted by $\vec{r}$. This vector extends from the origin of a reference coordinate system to the current location of the particle.

Using Cartesian coordinates, a particle at point $(x, y, z)$ has a position vector given by:

$$\vec{r} = x\hat{i} + y\hat{j} + z\hat{k}$$

where $\hat{i}$, $\hat{j}$, and $\hat{k}$ are the unit vectors pointing along the positive x-, y-, and z-axes, respectively. As the particle moves, its coordinates $x$, $y$, and $z$ change with time, meaning the position vector is a function of time, $\vec{r}(t)$.

```text
       y ^
         |
         |                 Path of particle
         |               . . . .
         |             .         .
         |           .             .  P (x, y, z)
         |         .              /
         |       .               /
         |                     /
         |                   /  \vec{r}
         |                 /
         |               /
         |             /
         +-----------------------------> x
        / O
       /
      /
   z v

```

### Displacement

When a particle moves from an initial position to a final position during a time interval $\Delta t$, its change in position is called its **displacement**, denoted by $\Delta \vec{r}$.

If the particle is at position $\vec{r}_1$ at time $t_1$ and moves to position $\vec{r}_2$ at a later time $t_2$, the displacement vector is the difference between the final and initial position vectors:

$$\Delta \vec{r} = \vec{r}_2 - \vec{r}_1$$

By expressing each position vector in terms of its components, we can write the displacement vector as:

$$\Delta \vec{r} = (x_2 - x_1)\hat{i} + (y_2 - y_1)\hat{j} + (z_2 - z_1)\hat{k}$$

$$\Delta \vec{r} = \Delta x\hat{i} + \Delta y\hat{j} + \Delta z\hat{k}$$

The displacement vector represents the shortest straight-line distance and direction from the starting point to the ending point, regardless of the actual path taken by the particle.

### Average and Instantaneous Velocity

The **average velocity** ($\vec{v}_{avg}$) of a particle during a time interval $\Delta t$ is defined as the particle's displacement divided by that time interval:

$$\vec{v}_{avg} = \frac{\Delta \vec{r}}{\Delta t} = \frac{\Delta x}{\Delta t}\hat{i} + \frac{\Delta y}{\Delta t}\hat{j} + \frac{\Delta z}{\Delta t}\hat{k}$$

Because $\Delta t$ is a positive scalar, the average velocity vector always points in the exact same direction as the displacement vector $\Delta \vec{r}$.

To understand the motion at a specific, infinitely small moment in time, we use the **instantaneous velocity**, $\vec{v}$. Just as we did in one dimension, we find the instantaneous velocity by taking the limit of the average velocity as the time interval approaches zero. This is the derivative of the position vector with respect to time:

$$\vec{v} = \lim_{\Delta t \to 0} \frac{\Delta \vec{r}}{\Delta t} = \frac{d\vec{r}}{dt}$$

Substituting the component form of the position vector into the derivative yields:

$$\vec{v} = \frac{d}{dt}(x\hat{i} + y\hat{j} + z\hat{k}) = \frac{dx}{dt}\hat{i} + \frac{dy}{dt}\hat{j} + \frac{dz}{dt}\hat{k}$$

We can represent this more compactly by defining the scalar components of the velocity vector:

$$\vec{v} = v_x\hat{i} + v_y\hat{j} + v_z\hat{k}$$

where $v_x = dx/dt$, $v_y = dy/dt$, and $v_z = dz/dt$.

**Geometric Interpretation:** As $\Delta t$ shrinks toward zero, the point $\vec{r}_2$ slides along the path toward $\vec{r}_1$. In the limit, the displacement vector becomes tangent to the path. Therefore, the instantaneous velocity vector $\vec{v}$ is always tangent to the particle's path at the particle's position and points in the direction of motion.

```text
                Path
             .   .   .  
           .           .  
         .              * P ----> \vec{v} (Tangent)
        .                \
       .                  \
                          \vec{v}

```

### Average and Instantaneous Acceleration

When a particle's velocity changes from $\vec{v}_1$ to $\vec{v}_2$ over a time interval $\Delta t$, we define its **average acceleration** ($\vec{a}_{avg}$) as:

$$\vec{a}_{avg} = \frac{\vec{v}_2 - \vec{v}_1}{t_2 - t_1} = \frac{\Delta \vec{v}}{\Delta t}$$

The **instantaneous acceleration**, $\vec{a}$, is the limit of the average acceleration as $\Delta t$ approaches zero, which is the first derivative of the velocity vector and the second derivative of the position vector with respect to time:

$$\vec{a} = \lim_{\Delta t \to 0} \frac{\Delta \vec{v}}{\Delta t} = \frac{d\vec{v}}{dt} = \frac{d^2\vec{r}}{dt^2}$$

In component form, this is expressed as:

$$\vec{a} = \frac{dv_x}{dt}\hat{i} + \frac{dv_y}{dt}\hat{j} + \frac{dv_z}{dt}\hat{k} = a_x\hat{i} + a_y\hat{j} + a_z\hat{k}$$

Alternatively, in terms of position:

$$\vec{a} = \frac{d^2x}{dt^2}\hat{i} + \frac{d^2y}{dt^2}\hat{j} + \frac{d^2z}{dt^2}\hat{k}$$

### Independence of Motion

A profound consequence of vector mathematics in kinematics is that **motion in orthogonal directions is completely independent**. The equations for $\vec{v}$ and $\vec{a}$ show that the x-component of acceleration ($a_x$) only affects the x-component of velocity ($v_x$), which in turn only affects the x-coordinate of position. It has absolutely no effect on the y- or z-components.

This means that a complex two- or three-dimensional motion problem can always be broken down into two or three simpler, independent one-dimensional motion problems. This principle will be the fundamental strategy used to analyze projectile motion in the next section.

## 3.2 Projectile Motion

A common and highly practical application of two-dimensional kinematics is **projectile motion**. A projectile is any object that is launched into the air and moves under the sole influence of gravity. Whether it is a baseball hit by a bat, a rock thrown off a cliff, or a stream of water from a hose, all these objects follow the same underlying physical rules.

To analyze projectile motion, we make two simplifying assumptions:

1. The free-fall acceleration $\vec{g}$ is constant over the range of motion and is directed downward.
2. The effect of air resistance is negligible.

Under these conditions, the path of a projectile—called its **trajectory**—is always a parabola.

### The Independence of Horizontal and Vertical Motion

As established in Section 3.1, orthogonal components of motion are completely independent. This principle is the key to solving projectile motion problems. We can break the two-dimensional motion of a projectile into two separate, independent one-dimensional problems:

* **Horizontal Motion (x-axis):** Because gravity pulls only straight down, there is no acceleration in the horizontal direction ($a_x = 0$). Therefore, the horizontal velocity remains constant.
* **Vertical Motion (y-axis):** The projectile experiences a constant downward acceleration due to gravity ($a_y = -g$, assuming the positive y-direction is upward). This is identical to the one-dimensional free-fall motion discussed in Chapter 2.

```text
       y ^
         |                 v_y = 0
         |               .----*----.     Peak
         |             .      |      .
         |            /       | v_x    \
         |       \vec{v}     /        \vec{v}
         |         * . . . . .| . . . . .* 
         |        /|          |           \
         |   v_y / |          |            \ v_y (negative)
         |      /  |          |             \
         |     /   - v_x      |              - v_x
         |    *-----------------------------------*--> x
         |   /|                                   |
         |  / | \vec{v}_0                         v \vec{v} (final)
       0 +-----------------------------------------
                          Range (R)

```

### Kinematic Equations for a Projectile

Suppose a projectile is launched from an initial position $(x_0, y_0)$ with an initial velocity $\vec{v}_0$ at an angle $\theta_0$ above the horizontal. We can resolve the initial velocity into its $x$ and $y$ components using trigonometry:

$$v_{0x} = v_0 \cos\theta_0$$

$$v_{0y} = v_0 \sin\theta_0$$

We can now write the kinematic equations for both dimensions as functions of time $t$.

**For the horizontal motion ($a_x = 0$):**
The velocity is constant, so the horizontal position increases linearly with time.

* Velocity: $v_x = v_{0x} = v_0 \cos\theta_0$ (constant)
* Position: $x = x_0 + (v_0 \cos\theta_0)t$

**For the vertical motion ($a_y = -g$):**
The vertical motion is characterized by constant acceleration. We apply the standard one-dimensional kinematic equations:

* Velocity: $v_y = v_0 \sin\theta_0 - gt$
* Position: $y = y_0 + (v_0 \sin\theta_0)t - \frac{1}{2}gt^2$
* Velocity-Position: $v_y^2 = (v_0 \sin\theta_0)^2 - 2g(y - y_0)$

### The Equation of the Trajectory

We can mathematically prove that the trajectory of a projectile is parabolic by eliminating the time variable $t$ from the position equations. Assuming the launch point is the origin ($x_0 = 0$, $y_0 = 0$), we can solve the horizontal position equation for $t$:

$$t = \frac{x}{v_0 \cos\theta_0}$$

Substituting this expression for $t$ into the vertical position equation yields:

$$y = (v_0 \sin\theta_0)\left(\frac{x}{v_0 \cos\theta_0}\right) - \frac{1}{2}g\left(\frac{x}{v_0 \cos\theta_0}\right)^2$$

Simplifying this equation, we get the **equation of the trajectory**:

$$y = (\tan\theta_0)x - \left(\frac{g}{2v_0^2 \cos^2\theta_0}\right)x^2$$

This equation is of the form $y = ax - bx^2$, where $a$ and $b$ are constants. This is the standard algebraic equation for a parabola that passes through the origin and opens downward.

### Maximum Height and Horizontal Range

Two important characteristics of a projectile's trajectory are its maximum height and its horizontal range. We assume the projectile is launched from and lands at the same elevation ($y_0 = 0$ and final $y = 0$).

**Maximum Height ($h$):**
At the very peak of the trajectory, the projectile momentarily stops moving upward before beginning its descent. At this exact point, the vertical velocity is zero ($v_y = 0$). We can use this condition to find the time it takes to reach the peak, $t_A$:

$$0 = v_0 \sin\theta_0 - gt_A \implies t_A = \frac{v_0 \sin\theta_0}{g}$$

Substituting this time back into the vertical position equation gives the maximum height $h$:

$$h = \frac{v_0^2 \sin^2\theta_0}{2g}$$

**Horizontal Range ($R$):**
The horizontal range $R$ is the total horizontal distance the projectile travels before returning to its launch altitude. Because the parabola is symmetric, the total time of flight is twice the time it takes to reach the peak: $t_{total} = 2t_A$.

Substituting $t_{total}$ into the horizontal position equation ($x = v_{0x}t$):

$$R = (v_0 \cos\theta_0)\left(\frac{2v_0 \sin\theta_0}{g}\right) = \frac{v_0^2 (2 \sin\theta_0 \cos\theta_0)}{g}$$

Using the trigonometric identity $\sin(2\theta_0) = 2 \sin\theta_0 \cos\theta_0$, we arrive at the range equation:

$$R = \frac{v_0^2 \sin(2\theta_0)}{g}$$

This equation reveals a crucial property of projectile motion: for a given initial speed $v_0$, the maximum horizontal range is achieved when $\sin(2\theta_0)$ is at its maximum value of 1. This occurs when $2\theta_0 = 90^\circ$, meaning the optimal launch angle for maximum distance over level ground is $\theta_0 = 45^\circ$. Furthermore, complementary launch angles (such as $30^\circ$ and $60^\circ$) will result in the exact same horizontal range, though they will reach different maximum heights and have different flight times.

## 3.3 Uniform Circular Motion

When a particle moves in a circular path with a constant speed, the motion is described as **uniform circular motion**. Examples abound in nature and technology, from a car navigating a circular roundabout at a steady pace to a satellite in a circular orbit around the Earth.

It is crucial to distinguish between *speed* and *velocity* in this context. While the speed $v$ (the magnitude of the velocity vector) remains strictly constant, the *direction* of the particle's motion is continuously changing as it traces the circle. Because velocity is a vector, a change in its direction constitutes a change in velocity. Therefore, according to the kinematic definitions established in Section 3.1, a particle in uniform circular motion is constantly accelerating.

### The Velocity Vector

In uniform circular motion, the particle's path is a circle of constant radius $r$. At any given instant, the particle's instantaneous velocity vector $\vec{v}$ is tangent to the circular path.

```text
               v
               ^
               | \vec{v}
           . - * - . 
         /     |     \
        |      | \vec{r}  |
        |      +-------* ----> \vec{v}
        |      O       |
         \           /
           ` - . - ' 

```

Because the particle travels the full circumference of the circle, $2\pi r$, in a specific time interval called the **period**, denoted by $T$, we can relate the constant speed to the radius and the period:

$$v = \frac{2\pi r}{T}$$

The period is the time required for one complete revolution. The inverse of the period is the **frequency** ($f$), which represents the number of revolutions per unit time (usually measured in Hertz, $\text{Hz}$, where $1\text{ Hz} = 1\text{ rev/s}$):

$$f = \frac{1}{T}$$

Thus, the speed can also be written as:

$$v = 2\pi r f$$

### Centripetal Acceleration

To determine the magnitude and direction of the acceleration, we must examine how the velocity vector changes over a short time interval $\Delta t$. Consider a particle moving from point $P_1$ to point $P_2$ along a circle of radius $r$.

The position vectors $\vec{r}_1$ and $\vec{r}_2$ have the same magnitude ($r$) and are separated by an angle $\Delta\theta$. The velocity vectors $\vec{v}_1$ and $\vec{v}_2$ have the same magnitude ($v$) and are tangent to the circle at $P_1$ and $P_2$, meaning they are strictly perpendicular to $\vec{r}_1$ and $\vec{r}_2$, respectively. Because of this perpendicular geometry, the angle between $\vec{v}_1$ and $\vec{v}_2$ is also exactly $\Delta\theta$.

We can form two similar isosceles triangles: one from the position vectors and the displacement $\Delta\vec{r}$, and one from the velocity vectors and the change in velocity $\Delta\vec{v}$.

```text
    Position Triangle             Velocity Triangle

           * P_2                     
          /|                         *----> \vec{v}_2
   \vec{r}_2 / | \Delta\vec{r}                \  |
        /  |                       \ | \Delta\vec{v}
       /   |                        \|
      O----* P_1                     *
       \vec{r}_1                       \vec{v}_1

```

Because the triangles are geometrically similar, the ratio of their base to their side lengths must be equal:

$$\frac{|\Delta \vec{v}|}{v} = \frac{|\Delta \vec{r}|}{r}$$

Solving for the magnitude of the change in velocity yields:

$$|\Delta \vec{v}| = \frac{v}{r} |\Delta \vec{r}|$$

To find the magnitude of the average acceleration, we divide both sides by the time interval $\Delta t$:

$$a_{avg} = \frac{|\Delta \vec{v}|}{\Delta t} = \frac{v}{r} \left( \frac{|\Delta \vec{r}|}{\Delta t} \right)$$

To find the instantaneous acceleration $a$, we take the limit as $\Delta t \to 0$. In this limit, the ratio $|\Delta \vec{r}| / \Delta t$ becomes the instantaneous speed, $v$.

$$a = \frac{v}{r} (v) = \frac{v^2}{r}$$

This is the magnitude of the acceleration for a particle in uniform circular motion.

What about its direction? As $\Delta t$ approaches zero, the angle $\Delta\theta$ also approaches zero, and the vector $\Delta\vec{v}$ becomes completely perpendicular to the velocity vector $\vec{v}$. Since $\vec{v}$ is tangent to the circle, a vector perpendicular to it must point straight inward along the radius toward the center of the circle.

For this reason, this acceleration is called **centripetal acceleration** (from the Latin *centrum* meaning "center" and *petere* meaning "to seek"). We denote it as $a_c$:

$$a_c = \frac{v^2}{r}$$

```text
             . - ^ - . 
           /     |     \
          | \vec{v}<--*      |
          |       | \vec{a}_c|
 \vec{v} <----*---+----*----> \vec{v}
          |   \vec{a}_c|     |
          |      *-->\vec{v}|
           \     |     /
             ` - v - ' 

```

**Key Characteristics of Uniform Circular Motion:**

1. The velocity vector $\vec{v}$ is always tangent to the path.
2. The acceleration vector $\vec{a}_c$ always points toward the center of the circular path.
3. The velocity and acceleration vectors are always perpendicular to each other ($\vec{v} \perp \vec{a}_c$).
4. While the magnitudes $v$ and $a_c$ are constant, the vectors $\vec{v}$ and $\vec{a}_c$ are constantly changing direction.

Because the acceleration is strictly perpendicular to the velocity, it only changes the *direction* of the motion; it does not do any work to speed up or slow down the particle. We will explore the forces responsible for this centripetal acceleration when we apply Newton's Laws of Motion in Chapter 4.

## 3.4 Relative Motion in One and Two Dimensions

Velocity is not an absolute property of an object; it is always measured relative to a specific observer or coordinate system. This coordinate system is called a **frame of reference**. When you say a car is traveling at $25\text{ m/s}$, you implicitly mean it is traveling at that speed *relative to the surface of the Earth*. However, to another driver moving alongside the first car at the exact same speed, the first car appears completely stationary. The study of how different observers measure the velocity of the same object is called **relative motion**.

To analyze relative motion systematically, we use a subscript notation. The velocity of an object $A$ relative to a frame of reference $B$ is written as $\vec{v}_{AB}$.

A fundamental rule of this notation is that reversing the subscripts reverses the direction of the velocity vector:

$$\vec{v}_{AB} = -\vec{v}_{BA}$$

If a train ($A$) is moving east at $20\text{ m/s}$ relative to the ground ($B$), then the ground is moving west at $20\text{ m/s}$ relative to the passengers on the train.

### Relative Motion in One Dimension

Consider a passenger ($P$) walking forward inside a moving train ($T$). The train is moving relative to the ground ($G$). We have three distinct velocities:

1. $v_{PT}$: The velocity of the passenger relative to the train.
2. $v_{TG}$: The velocity of the train relative to the ground.
3. $v_{PG}$: The velocity of the passenger relative to the ground.

To find the velocity of the passenger relative to the ground, we add the velocity of the passenger relative to the train to the velocity of the train relative to the ground. The Galilean transformation equation for one-dimensional relative velocity is:

$$v_{PG} = v_{PT} + v_{TG}$$

Notice how the inner subscripts (in this case, $T$) "cancel out" to leave the outer subscripts ($P$ and $G$). This algebraic trick is an excellent way to check if you have set up your relative velocity equation correctly.

If the train is moving east at $15\text{ m/s}$ ($v_{TG} = +15\text{ m/s}$) and the passenger walks forward toward the front of the train at $2\text{ m/s}$ ($v_{PT} = +2\text{ m/s}$), the passenger's speed relative to the ground is $+17\text{ m/s}$. If the passenger turns around and walks toward the back of the train at the same speed ($v_{PT} = -2\text{ m/s}$), their velocity relative to the ground becomes $+13\text{ m/s}$.

### Relative Motion in Two Dimensions

The exact same logic applies when the motion occurs in two or three dimensions, but we must use vector addition rather than simple scalar arithmetic. The general relative velocity equation is:

$$\vec{v}_{PA} = \vec{v}_{PB} + \vec{v}_{BA}$$

Here, $\vec{v}_{PA}$ is the velocity of particle $P$ measured by observer $A$, $\vec{v}_{PB}$ is the velocity of $P$ measured by observer $B$, and $\vec{v}_{BA}$ is the velocity of frame $B$ relative to frame $A$.

A classic application of this principle is a boat crossing a flowing river. Let the boat be $B$, the water be $W$, and the Earth (the riverbank) be $E$. The equation relating these velocities is:

$$\vec{v}_{BE} = \vec{v}_{BW} + \vec{v}_{WE}$$

* $\vec{v}_{BW}$ is the velocity of the boat relative to the water. This is determined by the boat's motor and the direction it is steered (its heading).
* $\vec{v}_{WE}$ is the velocity of the water relative to the Earth (the river's current).
* $\vec{v}_{BE}$ is the velocity of the boat relative to the Earth. This is the actual path an observer on the shore sees the boat take.

Suppose a boat points its bow directly across a river (perpendicular to the current) with a speed $v_{BW}$. The river has a current $v_{WE}$ flowing downstream. Because the vectors are perpendicular, they form a right triangle.

```text
       Target Destination
               *
               |
               |       / Path seen from shore (\vec{v}_{BE})
  \vec{v}_{BW} |     /
 (Heading)     |   /
               | /
               O --------> \vec{v}_{WE} (Current)
          Launch Point

```

To find the magnitude of the boat's velocity relative to the shore ($v_{BE}$), we use the Pythagorean theorem:

$$v_{BE} = \sqrt{v_{BW}^2 + v_{WE}^2}$$

The direction of the boat's actual travel (the angle $\theta$ relative to the straight-across path) can be found using trigonometry:

$$\tan\theta = \frac{v_{WE}}{v_{BW}}$$

If the pilot wishes to travel exactly straight across the river to the target destination, they cannot point the boat straight across. They must point the boat upstream at an angle so that the downstream component of their heading perfectly cancels out the river's current. In that case, $\vec{v}_{BE}$ becomes the straight-across vector, and $\vec{v}_{BW}$ becomes the hypotenuse of the vector addition triangle.

---

## Chapter Summary

* **Kinematic Vectors:** Motion in two and three dimensions is described using the position vector $\vec{r}$, displacement $\Delta\vec{r}$, velocity $\vec{v} = d\vec{r}/dt$, and acceleration $\vec{a} = d\vec{v}/dt$. The velocity vector is always tangent to the particle's path.
* **Independence of Motion:** A fundamental principle of multi-dimensional kinematics is that motion along orthogonal axes (e.g., x, y, and z) are completely independent of one another and can be analyzed as separate one-dimensional problems.
* **Projectile Motion:** An object in free fall with an initial horizontal velocity follows a parabolic trajectory. The horizontal motion occurs at a constant velocity ($a_x = 0$), while the vertical motion is subject to constant gravitational acceleration ($a_y = -g$). The maximum range over level ground is achieved at a $45^\circ$ launch angle.
* **Uniform Circular Motion:** A particle moving in a circle of radius $r$ at a constant speed $v$ experiences a constant change in the *direction* of its velocity. This results in a **centripetal acceleration** of magnitude $a_c = v^2/r$ that is always directed toward the center of the circular path.
* **Relative Motion:** Velocity depends on the frame of reference from which it is measured. The velocity of object $A$ relative to frame $C$ can be found by introducing an intermediate frame $B$ using vector addition: $\vec{v}_{AC} = \vec{v}_{AB} + \vec{v}_{BC}$. Reversing the subscripts reverses the vector: $\vec{v}_{AB} = -\vec{v}_{BA}$.
