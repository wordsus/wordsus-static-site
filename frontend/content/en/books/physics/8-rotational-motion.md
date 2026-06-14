Our mechanics study has so far focused on translational motion, treating objects as simple particles. But what happens when an object spins, twists, or rolls? In this chapter, we bridge the gap between linear and rotational mechanics. We will discover that every linear concept—position, velocity, acceleration, mass, and force—has a precise rotational counterpart. By defining new variables like angular velocity, moment of inertia, and torque, we will build a powerful framework to analyze spinning fans, turning gears, and rolling wheels, unlocking a complete description of rigid body dynamics.

## 8.1 Angular Position, Velocity, and Acceleration

Up to this point in our study of mechanics, we have primarily treated objects as particles, meaning we ignored their spatial extent and assumed all their mass was concentrated at a single point. This approximation is highly effective for describing the translational motion of a car on a highway or a planet orbiting the Sun. However, when a solid object rotates—like a spinning wheel, a ceiling fan, or a diver performing a somersault—the particle model is no longer sufficient. Different parts of the object move at different speeds and in different directions.

To analyze rotational motion, we introduce the concept of a **rigid body**: an extended object whose size and shape remain perfectly constant as it moves. In a rigid body, the relative distance between any two internal points does not change. While perfectly rigid bodies do not exist in nature (due to elasticity, which we will explore in Chapter 9), the rigid body model is an excellent approximation for many real-world objects.

We begin our analysis of rigid body rotation by defining the angular equivalents of the linear kinematics variables we established in Chapter 2: position, velocity, and acceleration.

### Angular Position

Consider a flat, rigid object rotating about a fixed axis that is perpendicular to the page. We can establish a reference frame by choosing a fixed point as the origin $O$, with the rotation axis passing through it. We then draw a fixed reference line, typically the positive x-axis.

To specify the position of any point $P$ on the object, we use its polar coordinates $(r, \theta)$.

```text
               y
               |
               |      P 
               |     /|
               |  r / |
               |   /  | s (arc length)
               |  /   |
               | / θ  |
        -------|/-----|-- x (Fixed reference line)
               O

```

As the object rotates, the distance $r$ from the origin to point $P$ remains constant because the body is rigid. The only coordinate that changes is the angle $\theta$, which we call the **angular position**.

The angular position $\theta$ is defined by the ratio of the arc length $s$, measured along the circular path of point $P$, to the radius $r$:

$$ \theta = \frac{s}{r} $$

Because $\theta$ is the ratio of two lengths, it is a dimensionless quantity. However, to distinguish angular measurements, we assign it the artificial unit of **radians** (rad).

When a point completes one full revolution, the arc length $s$ is equal to the circumference of the circle, $2\pi r$. Therefore, the angular position for one full revolution is:

$$ \theta = \frac{2\pi r}{r} = 2\pi \text{ rad} $$

This gives us the essential conversion factor between revolutions, degrees, and radians:
1 rev = 360° = $2\pi$ rad

*Sign Convention:* By standard convention in physics, angular positions measured counterclockwise from the reference line are positive, and those measured clockwise are negative.

### Angular Displacement

If an object rotates from an initial angular position $\theta_i$ to a final angular position $\theta_f$, it undergoes an **angular displacement** $\Delta\theta$:

$$ \Delta\theta = \theta_f - \theta_i $$

Just like linear displacement $\Delta x$, angular displacement can be positive or negative depending on the direction of rotation.

### Angular Velocity

In Section 2.2, we defined linear velocity as the rate of change of linear position. Similarly, **angular velocity** is the rate of change of angular position.

If an object undergoes an angular displacement $\Delta\theta$ over a time interval $\Delta t$, the **average angular velocity**, denoted by the Greek letter omega ($\omega$), is:

$$ \omega_{\text{avg}} = \frac{\Delta\theta}{\Delta t} $$

To find the exact angular velocity at a specific moment in time, we take the limit as the time interval approaches zero. This defines the **instantaneous angular velocity**, $\omega$, as the time derivative of the angular position:

$$ \omega = \lim_{\Delta t \to 0} \frac{\Delta\theta}{\Delta t} = \frac{d\theta}{dt} $$

The standard SI unit for angular velocity is radians per second (rad/s).

Because the body is rigid, all points on the object rotate through the same angle $\theta$ in the same amount of time. Therefore, **every point on a rotating rigid body has the same angular velocity**.

*Note on Vector Nature:* While we treat $\omega$ as a scalar with a positive or negative sign for fixed-axis rotation, it is technically a vector ($\vec{\omega}$). According to the right-hand rule (which we will formalize in Chapter 9), if you curl the fingers of your right hand in the direction of rotation, your extended thumb points along the axis of rotation in the direction of the angular velocity vector.

### Angular Acceleration

When the angular velocity of a rigid body changes over time, the body experiences **angular acceleration**, denoted by the Greek letter alpha ($\alpha$).

The **average angular acceleration** over a time interval $\Delta t$ is the change in angular velocity $\Delta\omega$ divided by the time interval:

$$ \alpha_{\text{avg}} = \frac{\Delta\omega}{\Delta t} $$

The **instantaneous angular acceleration**, $\alpha$, is the limit of this average as $\Delta t$ approaches zero, which is the first time derivative of angular velocity and the second time derivative of angular position:

$$ \alpha = \lim_{\Delta t \to 0} \frac{\Delta\omega}{\Delta t} = \frac{d\omega}{dt} = \frac{d^2\theta}{dt^2} $$

The standard SI unit for angular acceleration is radians per second squared (rad/s²).

Just as with linear motion, if the angular velocity and angular acceleration have the same sign, the rotation is speeding up. If they have opposite signs, the rotation is slowing down.

### Summary of Kinematic Analogies

The definitions of rotational variables mathematically mirror those of 1D linear kinematics. This parallel structure is powerful because it allows us to adapt the mathematical tools and intuition we built in Chapter 2 directly to rotational motion.

| Concept | Linear Quantity | Rotational Quantity | Relationship |
| --- | --- | --- | --- |
| **Position** | $x$ | $\theta$ | $\theta = s/r$ |
| **Displacement** | $\Delta x = x_f - x_i$ | $\Delta\theta = \theta_f - \theta_i$ | - |
| **Velocity** | $v = dx/dt$ | $\omega = d\theta/dt$ | - |
| **Acceleration** | $a = dv/dt$ | $\alpha = d\omega/dt$ | - |

In the next section, we will use this exact structural parallel to derive the equations for rotational kinematics under constant angular acceleration.

## 8.2 Kinematics of Rotational Motion

In Section 2.4, we developed a powerful set of kinematic equations to describe the linear motion of a particle experiencing constant acceleration. Because the mathematical definitions of angular position ($\theta$), angular velocity ($\omega$), and angular acceleration ($\alpha$) are identical in form to their linear counterparts ($x$, $v$, and $a$), the resulting kinematic equations for rotational motion share the exact same mathematical structure.

For the remainder of this section, we will restrict our analysis to rigid bodies rotating about a fixed axis with **constant angular acceleration** ($\alpha = \text{constant}$). This is a common and highly applicable physical situation, analogous to a freely falling object or a car accelerating steadily along a straight road.

### The Rotational Kinematic Equations

We can derive the equations of rotational kinematics directly from the definitions of $\omega$ and $\alpha$, using the exact same calculus or algebraic techniques used in Chapter 2.

**1. Angular Velocity as a Function of Time**
Starting from the definition of constant angular acceleration, $\alpha = d\omega/dt$, we can integrate with respect to time to find the angular velocity at any later time $t$. If the initial angular velocity at $t = 0$ is $\omega_i$, we obtain:

$$ \omega_f = \omega_i + \alpha t $$

This equation tells us that the angular velocity changes linearly with time when angular acceleration is constant.

**2. Angular Position as a Function of Time**
We know that angular velocity is the time derivative of angular position: $\omega = d\theta/dt$. Substituting our expression for $\omega_f$ from the previous equation and integrating from an initial position $\theta_i$ to a final position $\theta_f$, we get the angular displacement $\Delta\theta = \theta_f - \theta_i$:

$$ \Delta\theta = \omega_i t + \frac{1}{2}\alpha t^2 $$

This parabolic relationship indicates that the angle swept out by the rotating object depends on both its initial rotational speed and its constant angular acceleration.

**3. Angular Velocity as a Function of Position**
Often, we are given the angular displacement but not the time interval. By algebraically eliminating time $t$ from the first two equations, we derive a relationship between angular velocity, angular acceleration, and angular displacement:

$$ \omega_f^2 = \omega_i^2 + 2\alpha \Delta\theta $$

**4. Angular Displacement using Average Angular Velocity**
Finally, if the angular acceleration is constant, the average angular velocity over a time interval $t$ is simply the arithmetic mean of the initial and final angular velocities. The angular displacement is this average velocity multiplied by time:

$$ \Delta\theta = \frac{1}{2}(\omega_i + \omega_f)t $$

### Comparison of Linear and Rotational Kinematics

The table below summarizes the four core kinematic equations for both linear and rotational motion. Recognizing this symmetry is one of the most effective ways to master rotational mechanics; if you know the linear equations, you already know the rotational ones.

| Linear Motion (Constant $a$) | Rotational Motion (Constant $\alpha$) | Missing Variable |
| --- | --- | --- |
| $v_f = v_i + at$ | $\omega_f = \omega_i + \alpha t$ | Displacement ($\Delta x$ or $\Delta\theta$) |
| $\Delta x = v_i t + \frac{1}{2}at^2$ | $\Delta\theta = \omega_i t + \frac{1}{2}\alpha t^2$ | Final Velocity ($v_f$ or $\omega_f$) |
| $v_f^2 = v_i^2 + 2a\Delta x$ | $\omega_f^2 = \omega_i^2 + 2\alpha \Delta\theta$ | Time ($t$) |
| $\Delta x = \frac{1}{2}(v_i + v_f)t$ | $\Delta\theta = \frac{1}{2}(\omega_i + \omega_f)t$ | Acceleration ($a$ or $\alpha$) |

### Problem-Solving Strategy for Rotational Kinematics

When solving problems involving rotational kinematics, the general approach is identical to the one used for 1D linear motion:

1. **Define a Coordinate System:** Establish the axis of rotation and choose a positive direction for rotation. By standard convention, counterclockwise (CCW) is positive and clockwise (CW) is negative.
2. **List Knowns and Unknowns:** Identify the values given in the problem for $\Delta\theta$, $\omega_i$, $\omega_f$, $\alpha$, and $t$. Ensure strict adherence to your sign convention. For example, a wheel spinning CCW but slowing down has a positive $\omega$ but a negative $\alpha$.
3. **Check Units:** While equations often work with mixed units like revolutions per minute (rev/min or rpm), it is best practice—and often mandatory when moving to dynamics in later sections—to convert all angular quantities to standard SI units: radians for $\theta$, rad/s for $\omega$, and rad/s² for $\alpha$.
4. **Select the Appropriate Equation:** Choose the kinematic equation that contains your desired unknown and the variables you already know.
5. **Solve and Evaluate:** Isolate the unknown, calculate the result, and verify that the sign and magnitude of your answer make physical sense.

## 8.3 Rotational Kinetic Energy and Moment of Inertia

A rotating rigid body consists of many individual particles, each moving in a circular path. Because these particles are in motion, the object as a whole possesses kinetic energy. This energy is not a new, mysterious form of energy; it is simply the sum of the translational kinetic energies of all the individual particles that make up the rigid body.

By expressing this sum in terms of the object's rotational variables, we can develop a highly convenient framework for analyzing the energy of rotating systems.

### Deriving Rotational Kinetic Energy

Imagine a rigid body rotating with an angular velocity $\omega$ about a fixed axis. Let's consider the object as a collection of $n$ distinct particles. A single particle $i$, with mass $m_i$, is located at a perpendicular distance $r_i$ from the axis of rotation and moves with a linear speed $v_i$.

```text
         Axis of Rotation (ω)
                 |
                 |      r_1
        m_1 O----+
                 |
                 |               r_2
                 +------------------------O m_2
                 |
                 |   r_3
                 +---------O m_3
                 |

```

The translational kinetic energy of this single particle is:

$$ K_i = \frac{1}{2}m_i v_i^2 $$

To find the total kinetic energy $K$ of the rigid body, we sum the kinetic energies of all its constituent particles:

$$ K = \sum_{i=1}^{n} K_i = \sum_{i=1}^{n} \frac{1}{2}m_i v_i^2 $$

From Section 8.1, we know the relationship between linear speed and angular velocity for a rotating particle is $v_i = r_i \omega$. Because the body is rigid, every particle rotates with the exact same angular velocity $\omega$. Substituting this relationship into our sum gives:

$$ K = \sum_{i=1}^{n} \frac{1}{2}m_i (r_i \omega)^2 = \sum_{i=1}^{n} \frac{1}{2}m_i r_i^2 \omega^2 $$

Since $\frac{1}{2}$ and $\omega^2$ are constant for all particles in the rigid body at any given instant, we can factor them out of the summation:

$$ K_R = \frac{1}{2} \left( \sum_{i=1}^{n} m_i r_i^2 \right) \omega^2 $$

We denote this as $K_R$ to specify **rotational kinetic energy**.

### Moment of Inertia

The quantity enclosed in the parentheses in the equation above is of profound importance in rotational mechanics. We define this quantity as the **moment of inertia**, denoted by $I$:

$$ I = \sum_{i=1}^{n} m_i r_i^2 $$

The SI unit for moment of inertia is the kilogram-meter squared ($\text{kg} \cdot \text{m}^2$).

Substituting $I$ back into our energy equation yields a beautifully simple expression for rotational kinetic energy:

$$ K_R = \frac{1}{2}I\omega^2 $$

Notice the striking structural parallel to translational kinetic energy, $K = \frac{1}{2}mv^2$. In rotational mechanics, the moment of inertia $I$ plays the exact same role that mass $m$ plays in translational mechanics.

However, there is a crucial distinction: while mass is an intrinsic property of an object, **moment of inertia depends on both the mass of the object and how that mass is distributed relative to the axis of rotation.** Mass located further from the axis (larger $r$) contributes significantly more to the moment of inertia because the distance is squared. Consequently, it is much harder to start or stop the rotation of a heavy wheel if most of its mass is concentrated at the outer rim compared to a wheel where the mass is concentrated near the central hub.

### Moment of Inertia for Continuous Objects

For a continuous, solid object (like a cylinder, sphere, or rod), we cannot simply sum discrete particles. Instead, we must take the limit as the mass of the individual particles approaches zero, which transforms the summation into an integral:

$$ I = \lim_{\Delta m_i \to 0} \sum_{i} r_i^2 \Delta m_i = \int r^2 \, dm $$

Here, $dm$ represents an infinitesimal mass element, and $r$ is its perpendicular distance from the rotation axis. Using calculus, physicists have determined the moments of inertia for various standard geometric shapes assuming uniform density.

*Common Moments of Inertia (Uniform Objects of Mass $M$):*

* **Hoop or thin cylindrical shell (axis through center):** $I = MR^2$
* **Solid cylinder or disk (axis through center):** $I = \frac{1}{2}MR^2$
* **Solid sphere (axis through center):** $I = \frac{2}{5}MR^2$
* **Thin spherical shell (axis through center):** $I = \frac{2}{3}MR^2$
* **Long thin rod (axis through center):** $I = \frac{1}{12}ML^2$
* **Long thin rod (axis through one end):** $I = \frac{1}{3}ML^2$

### The Parallel-Axis Theorem

The standard formulas listed above calculate the moment of inertia for an axis passing through the object's center of mass ($I_{\text{CM}}$). But what if the object is rotating about a different axis?

If you know the moment of inertia $I_{\text{CM}}$ about an axis passing through the center of mass, you can easily find the moment of inertia $I$ about *any* parallel axis using the **parallel-axis theorem**:

$$ I = I_{\text{CM}} + Md^2 $$

Where:

* $I_{\text{CM}}$ is the moment of inertia about the center of mass axis.
* $M$ is the total mass of the object.
* $d$ is the perpendicular distance between the center of mass axis and the new parallel axis.

```text
          Axis through CM         New Parallel Axis
                 |                       |
                 |                       |
                 | <------- d ---------> |
              .--|--.                    |
            .'   |   '.                  |
           /     |     \                 |
          |     (CM)    |                |
           \     |     /                 |
            '.   |   .'                  |
              '--|--'                    |
                 |                       |

```

The parallel-axis theorem mathematically confirms our physical intuition: an object's moment of inertia is always minimized when the axis of rotation passes through its center of mass. Shifting the axis of rotation away from the center of mass always increases the rotational inertia by an amount exactly equal to $Md^2$.

## 8.4 Torque and Newton's Second Law for Rotation

In Chapter 4, we learned that a net linear force causes an object to experience linear acceleration ($F_{\text{net}} = ma$). We now ask the corresponding question for rotational motion: what causes an object to experience an angular acceleration? The answer is a **torque**.

Just as force is a push or a pull that tends to cause translational motion, torque is a twist or a turning effort that tends to cause rotational motion.

### The Concept of Torque

Imagine trying to open a heavy door. Experience tells you three things:

1. **Magnitude of Force:** Pushing harder makes the door open faster.
2. **Distance:** It is much easier to open the door by pushing at the outer edge (near the doorknob) than by pushing close to the hinges.
3. **Angle:** Pushing perfectly perpendicular to the door is highly effective, whereas pushing parallel to the door (directly toward the hinges) causes no rotation at all.

Torque, denoted by the Greek letter tau ($\tau$), quantifies these three observations. The magnitude of the torque produced by a force $F$ applied at a distance $r$ from the axis of rotation is defined as:

$$ \tau = rF \sin\theta $$

Where:

* $r$ is the distance from the pivot point (axis of rotation) to the point where the force is applied.
* $F$ is the magnitude of the applied force.
* $\theta$ is the angle between the position vector $\vec{r}$ and the force vector $\vec{F}$ when they are drawn tail-to-tail.

The SI unit of torque is the Newton-meter ($\text{N}\cdot\text{m}$). While this is dimensionally equivalent to the Joule (the unit of work and energy), torque and work are entirely different physical quantities. To avoid confusion, torque is always expressed in $\text{N}\cdot\text{m}$ and never in Joules.

### Interpreting the Torque Equation

There are two highly useful ways to conceptually group the terms in the torque equation: $\tau = r(F \sin\theta)$ and $\tau = F(r \sin\theta)$.

**1. The Tangential Component of Force ($F_\perp = F \sin\theta$)**
Any force applied to a rigid body can be resolved into two components: a radial component pointing directly toward or away from the pivot, and a tangential component perpendicular to the radial line.

```text
                  F_perp = F sin(θ)  (Causes rotation)
                  ^
                  |
                  |     F (Applied force)
                  |    /
                  |   /
                  |  / 
                  | /  θ
   Pivot O--------|/ - - - - - - > Radial line
           r      Point of         (F_radial causes NO rotation)
                  application

```

The radial component ($F \cos\theta$) tries to pull the object off its pivot but provides zero turning effort. Only the perpendicular component ($F_\perp = F \sin\theta$) contributes to rotation. Therefore, $\tau = r F_\perp$.

**2. The Moment Arm ($r_\perp = r \sin\theta$)**
Alternatively, we can extend an imaginary line along the direction of the force vector; this is called the *line of action*. The perpendicular distance from the pivot to this line of action is called the **moment arm** or **lever arm** ($r_\perp$).

```text
                             Line of Action
   Pivot O                     /
          \                   /
           \                 /
   Moment   \ r_perp        / F (Applied force)
   Arm       \             /
              \    θ      /
               \         /
                +-------/ Point of application
                   r

```

Using this geometric perspective, torque is the product of the entire force magnitude and the moment arm: $\tau = F r_\perp$. This explains why a wrench works: by using a long handle, you drastically increase the moment arm, allowing a modest force to generate a massive torque.

*Sign Convention:* Torque is a vector quantity (which we will formalize using the cross product in Chapter 9). For fixed-axis rotation, we assign a positive sign to torques that tend to cause counterclockwise (CCW) rotation and a negative sign to torques that tend to cause clockwise (CW) rotation.

### Newton's Second Law for Rotation

We have established that torque causes an object to rotate. Now we connect torque to angular acceleration mathematically.

Consider a single particle of mass $m$ attached to a massless, rigid rod of length $r$, pivoting about a fixed point. A tangential force $F_t$ is applied to the particle. According to Newton's Second Law for linear motion:

$$ F_t = ma_t $$

Where $a_t$ is the tangential acceleration. From Section 8.2, we know the relationship between tangential and angular acceleration is $a_t = r\alpha$. Substituting this into the equation:

$$ F_t = m(r\alpha) $$

To bring torque into the equation, we multiply both sides by the radius $r$:

$$ rF_t = mr^2\alpha $$

The left side of the equation, $rF_t$, is exactly the torque $\tau$ applied to the particle. On the right side, the quantity $mr^2$ is the particle's moment of inertia, $I$ (as defined in Section 8.3). Substituting these terms yields:

$$ \tau = I\alpha $$

While we derived this for a single particle, the principle holds true for an extended rigid body. By summing the torques on all the individual mass elements of a rigid body, the internal forces (and their corresponding internal torques) cancel out according to Newton's Third Law. We are left only with the sum of the external torques.

This gives us **Newton's Second Law for Rotation**:

$$ \sum \tau = I\alpha $$

Or, in words: The net external torque acting on a rigid body is equal to the body's moment of inertia multiplied by its angular acceleration.

### Summary of Dynamics Analogies

Just as we saw a perfect structural parallel between linear and rotational kinematics, we now see a perfect parallel in dynamics.

| Concept | Linear Dynamics | Rotational Dynamics |
| --- | --- | --- |
| **Cause of Motion** | Force ($F$) | Torque ($\tau$) |
| **Inertia** | Mass ($m$) | Moment of Inertia ($I$) |
| **Newton's Second Law** | $\sum F = ma$ | $\sum \tau = I\alpha$ |

This parallel means that rotational dynamics problems can be solved using the exact same framework as linear dynamics problems. You will still draw a free-body diagram, but instead of just summing the forces, you will also identify the pivot point, determine the moment arms for each force, and sum the torques to find the resulting angular acceleration.

## 8.5 Rolling Motion

Up to this point, we have analyzed pure translational motion (an object moving through space without rotating) and pure rotational motion (an object spinning about a fixed axis). However, some of the most common motions in our daily lives—a bicycle wheel moving down the street, a bowling ball gliding down a lane, or a billiard ball rolling across a table—involve a combination of both.

This combined motion is called **rolling motion**. In this section, we will focus specifically on **rolling without slipping**, which occurs when there is no relative motion between the object and the surface at the exact point of contact.

### The Kinematics of Rolling

To understand rolling, it is incredibly helpful to view it as the superposition (addition) of two distinct motions: pure translation of the center of mass and pure rotation about the center of mass.

Consider a wheel of radius $R$ rolling in a straight line on a flat surface. As the wheel rotates through an angular displacement $\theta$, the wheel moves forward by a linear distance $s$. Because the wheel rolls without slipping, the arc length of the wheel's outer edge that lays down on the ground must exactly equal the linear distance traveled by the wheel's center of mass (CM).

From our definition of angular position in Section 8.1, $s = R\theta$. Therefore, the position of the center of mass is directly linked to the angle of rotation. Taking the time derivative of both sides gives us the central condition for rolling without slipping:

$$ v_{\text{CM}} = R\omega $$

Taking one more time derivative links the linear acceleration of the center of mass to the angular acceleration:

$$ a_{\text{CM}} = R\alpha $$

**The Velocity Profile**

Because rolling is a combination of translation and rotation, different points on the wheel have wildly different linear velocities as measured by an observer standing on the ground.

Let's look at three key points on the wheel: the center of mass ($C$), the top of the wheel ($T$), and the bottom contact point ($P$).

1. **Pure Translation:** Every point on the wheel moves forward with velocity $v_{\text{CM}}$.
2. **Pure Rotation:** Point $T$ moves forward with tangential velocity $R\omega$, Point $P$ moves backward with tangential velocity $-R\omega$, and the center $C$ is stationary.
3. **Rolling (Translation + Rotation):** We add the velocity vectors.

```text
       Pure Translation     +      Pure Rotation      =        Rolling Motion
                                                             
           v_CM ---->               v_T = Rω ---->             v_T = 2v_CM -------->
         . '   ' .                . '   ' .                  . '   ' .
       '           '            '           '              '           '
      |             |          |             |            |             |
      |   C ---->   |          |      C      |            |   C ---->   |
      |     v_CM    |          |             |            |     v_CM    |
       .           .            .           .              .           .
         ' . _ . '                ' . _ . '                  ' . _ . '
           v_CM ---->               v_P = -Rω <----            v_P = 0

```

The result is fascinating and slightly counterintuitive: **at the exact moment a point on the tire touches the ground, its instantaneous velocity is zero**. It is momentarily at rest. Meanwhile, the top of the wheel is moving forward at exactly twice the speed of the car ($v_T = v_{\text{CM}} + R\omega = 2v_{\text{CM}}$). If you have ever noticed that the top spokes of a moving bicycle wheel look like a blur while the bottom spokes are clearly visible, you were observing this physical reality!

### Kinetic Energy of a Rolling Object

Because a rolling object is undergoing both translation and rotation, it possesses both translational and rotational kinetic energy. The total kinetic energy is simply the sum of the two:

$$ K_{\text{total}} = K_{\text{trans}} + K_{\text{rot}} $$

$$ K_{\text{total}} = \frac{1}{2}Mv_{\text{CM}}^2 + \frac{1}{2}I_{\text{CM}}\omega^2 $$

Using the rolling without slipping condition ($v_{\text{CM}} = R\omega$), we can express $\omega$ as $v_{\text{CM}}/R$ and substitute it into the energy equation. This reveals why different shapes race down a ramp at different speeds.

For example, consider a solid cylinder ($I = \frac{1}{2}MR^2$) and a hoop ($I = MR^2$) of the same mass and radius released from the top of an incline. The hoop has more of its mass concentrated far from the axis of rotation, giving it a larger moment of inertia. As potential energy converts to kinetic energy, the hoop must "spend" a larger fraction of its available energy to get rotating, leaving less energy available for translational speed. Consequently, the solid cylinder will always beat the hoop to the bottom of the ramp, regardless of their relative masses or radii!

### The Role of Friction in Rolling

We learned earlier that the point of contact $P$ has an instantaneous velocity of zero. Because there is no relative sliding between the tire and the road at that point, the friction acting on a rolling object is **static friction** ($f_s$), not kinetic friction.

This static friction force is absolutely essential. If you attempt to accelerate a car on perfectly smooth ice (zero friction), the tires will spin ($\alpha > 0$) but the car will not move forward ($a_{\text{CM}} = 0$). The static friction force points forward, pushing the car down the road, while simultaneously providing a torque that opposes the engine's rotation to maintain the condition $v_{\text{CM}} = R\omega$.

Because static friction acts at a point that is momentarily at rest, it does zero work on the rolling object. This means that, unlike kinetic friction which transforms mechanical energy into thermal energy (heat), rolling without slipping **conserves mechanical energy**.

## Chapter Summary

* **Angular Kinematics:** The rotation of rigid bodies is described by angular position ($\theta$), angular velocity ($\omega = d\theta/dt$), and angular acceleration ($\alpha = d\omega/dt$). These are analogous to linear position, velocity, and acceleration.
* **Constant Angular Acceleration:** When $\alpha$ is constant, the kinematic equations for rotation exactly mirror the 1D linear kinematic equations (e.g., $\omega_f = \omega_i + \alpha t$ and $\Delta\theta = \omega_i t + \frac{1}{2}\alpha t^2$).
* **Moment of Inertia ($I$):** This is the rotational equivalent of mass. It measures an object's resistance to changes in its rotational motion and depends on both the total mass and how that mass is distributed relative to the axis of rotation ($I = \int r^2 dm$).
* **Parallel-Axis Theorem:** If the moment of inertia through the center of mass is $I_{\text{CM}}$, the moment of inertia about any parallel axis separated by a distance $d$ is $I = I_{\text{CM}} + Md^2$.
* **Rotational Kinetic Energy:** The kinetic energy of a rotating rigid body is given by $K_R = \frac{1}{2}I\omega^2$.
* **Torque ($\tau$):** Torque is the rotational equivalent of force, representing the twisting effort that causes angular acceleration. It is calculated as $\tau = rF\sin\theta$, where $r$ is the distance to the pivot and $\theta$ is the angle between the position and force vectors.
* **Newton's Second Law for Rotation:** The net external torque acting on an object is proportional to its angular acceleration: $\sum \tau = I\alpha$.
* **Rolling Motion:** Rolling without slipping is a combination of translation of the center of mass and rotation about the center of mass. It requires static friction and is governed by the conditions $v_{\text{CM}} = R\omega$ and $a_{\text{CM}} = R\alpha$. The total kinetic energy of a rolling object is $K = \frac{1}{2}Mv_{\text{CM}}^2 + \frac{1}{2}I_{\text{CM}}\omega^2$.
