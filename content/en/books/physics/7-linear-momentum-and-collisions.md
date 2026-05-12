Previous chapters analyzed motion using Newton's laws and the work-energy theorem. While energy is excellent for tracking forces over spatial distances, it struggles with interactions involving complex, rapidly changing forces over brief time intervals—such as car crashes, explosions, or atomic collisions.

To master these dynamic events, we introduce two powerful vector concepts: linear momentum and impulse. We will uncover one of the most profound principles in physics: the conservation of linear momentum. This fundamental law allows us to bypass messy internal forces to solve complex one- and two-dimensional collisions, ultimately leading us to the unifying concept of the center of mass.

## 7.1 Linear Momentum and Impulse

In previous chapters, we analyzed the motion of objects using Newton's laws and the concepts of work and energy. While the work-energy theorem is incredibly powerful, it deals with scalar quantities and is most useful when tracking changes over spatial distances. However, many physical interactions—particularly collisions and explosions—occur over very short time intervals and involve complex, rapidly changing forces. To analyze these situations, we introduce a new vector framework based on time rather than distance: the concepts of linear momentum and impulse.

### Linear Momentum

The **linear momentum** (often simply called momentum) of a particle is defined as the product of its mass and its velocity. We denote momentum with the vector $\vec{p}$:

$$ \vec{p} = m\vec{v} $$

Because mass $m$ is a positive scalar, the linear momentum vector always points in the same direction as the velocity vector $\vec{v}$. The SI unit for momentum is the kilogram-meter per second ($\text{kg} \cdot \text{m/s}$).

Momentum provides a quantitative measure of how difficult it is to stop a moving object. A heavy truck moving at $10 \text{ m/s}$ has a much larger momentum than a baseball moving at the same speed, and stopping the truck requires significantly more effort or time.

#### Newton's Second Law Revisited

In Chapter 4, Newton's second law was introduced as $\sum \vec{F} = m\vec{a}$. However, Isaac Newton originally formulated his second law in terms of momentum. The net external force acting on a particle is equal to the time rate of change of its linear momentum:

$$ \sum \vec{F} = \frac{d\vec{p}}{dt} $$

We can easily show that this reduces to the familiar form for objects with constant mass. Substituting $\vec{p} = m\vec{v}$ into the derivative yields:

$$ \sum \vec{F} = \frac{d(m\vec{v})}{dt} = m \frac{d\vec{v}}{dt} + \vec{v} \frac{dm}{dt} $$

For a particle of constant mass, $\frac{dm}{dt} = 0$, and since $\frac{d\vec{v}}{dt} = \vec{a}$, we recover $\sum \vec{F} = m\vec{a}$. The momentum formulation, however, is more general and remains valid even for systems where mass is changing over time, such as a rocket expelling fuel.

### Impulse and the Impulse-Momentum Theorem

When a baseball bat strikes a ball, the force exerted on the ball changes rapidly. It begins at zero the moment they touch, spikes to a massive peak as the ball compresses, and drops back to zero as the ball leaves the bat. Because the force varies so drastically, applying $\sum \vec{F} = m\vec{a}$ directly is mathematically cumbersome.

Instead, we integrate Newton's second law over time. Starting with $d\vec{p} = \sum \vec{F} dt$, we integrate both sides from an initial time $t_i$ to a final time $t_f$:

$$ \int_{\vec{p}_i}^{\vec{p}_f} d\vec{p} = \int_{t_i}^{t_f} \sum \vec{F} \, dt $$

$$ \vec{p}_f - \vec{p}_i = \int_{t_i}^{t_f} \sum \vec{F} \, dt $$

The quantity on the right side of this equation is defined as the **impulse** ($\vec{J}$) of the net force over the time interval $\Delta t = t_f - t_i$:

$$ \vec{J} = \int_{t_i}^{t_f} \sum \vec{F} \, dt $$

Impulse is a vector quantity that points in the same direction as the net force, and it shares the same SI units as momentum ($\text{kg} \cdot \text{m/s}$, which can also be written as Newton-seconds, $\text{N} \cdot \text{s}$).

Combining the two previous equations gives us the **Impulse-Momentum Theorem**:

$$ \vec{J} = \Delta \vec{p} $$

This theorem states that the impulse applied to a particle by a net force equals the change in the particle's linear momentum. It is the time-based analogue to the work-energy theorem ($W = \Delta K$), which relates force acting over a distance to changes in kinetic energy.

### Graphical Interpretation of Impulse

Because impulse is the time integral of force, it is geometrically equivalent to the area under a Force vs. Time curve.

```text
       F (Force)
       ^
       |
       |         * * *
 F_max |       *       *
       |      *         *
 F_avg |.....+...........+.....
       |    *:           :*
       |   * :   Area =  : *
       |  *  :  Impulse  :  *
       | *   :           :   *
       +----------------------------> t (Time)
            t_i         t_f

```

In many practical applications, the exact functional form of $\vec{F}(t)$ is unknown. We can bypass this by defining a constant **average force** ($\vec{F}_{\text{avg}}$) that delivers the exact same impulse over the same time interval $\Delta t$ as the actual time-varying force:

$$ \vec{J} = \vec{F}_{\text{avg}} \Delta t $$

Graphically, the rectangular area defined by $\vec{F}_{\text{avg}}$ and $\Delta t$ is exactly equal to the area under the complex $\vec{F}(t)$ curve (as indicated by the dotted line in the diagram above).

### Physical Applications

The relationship $\Delta \vec{p} = \vec{F}_{\text{avg}} \Delta t$ explains many everyday phenomena, particularly in safety engineering. If you drop a glass onto a hardwood floor, it will likely shatter, whereas dropping it from the same height onto a thick carpet might leave it intact.

In both scenarios, the glass undergoes the exact same change in momentum ($\Delta \vec{p}$): it goes from a falling velocity $v$ to zero. Because $\vec{J} = \Delta \vec{p}$, the impulse applied by the floor must be identical in both cases.

However, the carpet compresses, increasing the time interval ($\Delta t$) of the collision. Because the product $\vec{F}_{\text{avg}} \Delta t$ is constant, a larger $\Delta t$ mathematically requires a proportionally smaller $\vec{F}_{\text{avg}}$. Airbags in cars, crumple zones, and padded gym mats all rely on this precise principle: by extending the duration of an impact, the peak forces exerted on a body are drastically reduced, preventing structural failure or physical injury.

## 7.2 Conservation of Linear Momentum

In the previous section, we analyzed the momentum of a single particle. To unlock the full predictive power of momentum, we must expand our view to encompass a system of multiple interacting particles. By examining how momentum behaves within a system, we arrive at one of the most fundamental and universally applicable laws in physics.

### Systems and Forces

When analyzing multiple objects, we must first clearly define our **system**—the specific collection of particles or objects we are studying. Everything outside this defined boundary is the environment.

This distinction allows us to categorize forces into two types:

* **Internal forces:** Forces that particles within the system exert on one another.
* **External forces:** Forces exerted on the particles of the system by objects in the environment.

### Deriving the Conservation Law

Consider a simple system consisting of two objects, such as two billiard balls, moving toward each other on a frictionless table.

```text
       Before Collision                     During Collision
    
   m_1             m_2                    m_1      m_2
   (O)----->     <-----(O)                (O)======(O)
      v_1i           v_2i                 F_12    F_21
   -----------------------                -----------------------

```

When the balls collide, they exert forces on each other. Let $\vec{F}_{12}$ be the force exerted *on* ball 1 *by* ball 2, and $\vec{F}_{21}$ be the force exerted *on* ball 2 *by* ball 1. According to Newton's third law, these forces represent an action-reaction pair and must be equal in magnitude and opposite in direction:

$$ \vec{F}_{12} = -\vec{F}_{21} $$

Multiplying both sides by the time interval of the collision $\Delta t$ yields the impulse each ball experiences:

$$ \vec{F}_{12} \Delta t = -\vec{F}_{21} \Delta t $$

By the impulse-momentum theorem ($\vec{J} = \Delta \vec{p}$), the impulse on each ball is equal to its change in momentum:

$$ \Delta \vec{p}_1 = -\Delta \vec{p}_2 $$

Rearranging this equation, we find:

$$ \Delta \vec{p}_1 + \Delta \vec{p}_2 = 0 $$

The sum of the changes in momentum for the individual particles is zero. This means that whatever momentum is lost by one object is exactly gained by the other.

### Total Momentum of a System

We can define the total linear momentum of a system, $\vec{P}$, as the vector sum of the individual momenta of all particles in the system:

$$ \vec{P} = \vec{p}_1 + \vec{p}_2 + \dots + \vec{p}_n = \sum_{i=1}^{n} \vec{p}_i $$

Taking the time derivative of the total momentum gives us the net force on the system. When we sum all the forces acting on all particles, the internal forces cancel out entirely in action-reaction pairs (as shown in our two-ball example). The only forces that can change the total momentum of the system are external forces:

$$ \sum \vec{F}_{\text{ext}} = \frac{d\vec{P}}{dt} $$

This is the generalized form of Newton's second law for a system of particles.

### The Law of Conservation of Linear Momentum

If the net external force acting on a system is zero ($\sum \vec{F}_{\text{ext}} = 0$), then the time rate of change of the total momentum is zero ($\frac{d\vec{P}}{dt} = 0$). Such a system is called an **isolated system**.

For an isolated system, the total momentum remains constant over time. This is the **Law of Conservation of Linear Momentum**:

$$ \vec{P}_i = \vec{P}_f $$

Written out for our two-particle collision, this means the total momentum before the interaction equals the total momentum after the interaction:

$$ m_1\vec{v}_{1i} + m_2\vec{v}_{2i} = m_1\vec{v}_{1f} + m_2\vec{v}_{2f} $$

### Vector Nature and Components

Because momentum is a vector, the conservation law applies independently to each spatial dimension. If a system is isolated, momentum is conserved in all directions:

$$ P_{ix} = P_{fx} $$

$$ P_{iy} = P_{fy} $$

$$ P_{iz} = P_{fz} $$

Furthermore, momentum can be conserved in one direction even if it is not conserved in another. If the net external force in the x-direction is zero, then the x-component of the total momentum remains constant, regardless of whether external forces (like gravity) are acting in the y-direction.

### The Impulse Approximation

In the real world, perfectly isolated systems are rare. Friction, air resistance, and gravity are nearly always present. However, during a collision, explosion, or other brief impact, the internal forces between the interacting objects are incredibly large, while the interaction time ($\Delta t$) is extremely short.

Because the internal collision forces dwarf typical external forces (like friction) during this brief moment, the impulse delivered by external forces is negligible:

$$ \vec{J}_{\text{ext}} = \int \sum \vec{F}_{\text{ext}} \, dt \approx 0 $$

This assumption is known as the **impulse approximation**. It allows us to treat a system as isolated *just before* and *just after* an impact. For example, if two cars collide on a road, friction from the tires is an external force that will eventually stop the cars. But during the millisecond of the crash itself, friction contributes almost nothing compared to the crushing forces of the impact. Therefore, we can accurately use momentum conservation to relate the velocities of the cars immediately before they touch to their velocities immediately after they crumple together.

## 7.3 Elastic Collisions in One Dimension

When two objects collide, the forces they exert on each other are internal to the system. As we established in the previous section, if no net external force acts on the system, the total linear momentum is conserved. However, the total kinetic energy of the system is not necessarily conserved. During a collision, kinetic energy can be transformed into other forms of energy, such as thermal energy, sound, or the energy required to permanently deform the objects.

We classify collisions based on whether kinetic energy is conserved:

* An **elastic collision** is one in which the total kinetic energy of the system *is* conserved, as well as the total momentum.
* An **inelastic collision** is one in which the total kinetic energy is *not* conserved, even though momentum is conserved.

Perfectly elastic collisions only occur at the atomic and subatomic level. However, collisions between hard, macroscopic objects like billiard balls or steel marbles are often very close to being perfectly elastic. We can model them as elastic collisions with a high degree of accuracy.

### The Equations of an Elastic Collision

Consider two particles with masses $m_1$ and $m_2$ moving along a single axis (one dimension). Let their initial velocities before the collision be $v_{1i}$ and $v_{2i}$, and their final velocities after the collision be $v_{1f}$ and $v_{2f}$.

```text
       Before Collision
       
       m_1                 m_2
      ( O )----->       <---( O )
         v_1i                v_2i
       
       After Collision
       
             m_1       m_2
           <-( O )   ( O )----->
              v_1f      v_2f

```

Because the collision is elastic, we have two independent conservation equations.

**1. Conservation of Linear Momentum:**

$$ m_1v_{1i} + m_2v_{2i} = m_1v_{1f} + m_2v_{2f} $$

**2. Conservation of Kinetic Energy:**

$$ \frac{1}{2}m_1v_{1i}^2 + \frac{1}{2}m_2v_{2i}^2 = \frac{1}{2}m_1v_{1f}^2 + \frac{1}{2}m_2v_{2f}^2 $$

In a typical problem, the masses and initial velocities are known, and we must solve for the two unknown final velocities, $v_{1f}$ and $v_{2f}$. Solving this system of equations algebraically can be tedious because the kinetic energy equation is quadratic. However, we can manipulate these equations to find a much simpler relationship.

First, rearrange both equations so that terms involving $m_1$ are on the left and terms involving $m_2$ are on the right:

$$ m_1(v_{1i} - v_{1f}) = m_2(v_{2f} - v_{2i}) $$

$$ m_1(v_{1i}^2 - v_{1f}^2) = m_2(v_{2f}^2 - v_{2i}^2) $$

Next, factor the difference of squares in the kinetic energy equation:

$$ m_1(v_{1i} - v_{1f})(v_{1i} + v_{1f}) = m_2(v_{2f} - v_{2i})(v_{2f} + v_{2i}) $$

Now, divide this factored kinetic energy equation by the rearranged momentum equation. As long as a collision actually occurs (meaning the initial and final velocities aren't identical), the terms cancel out beautifully, leaving:

$$ v_{1i} + v_{1f} = v_{2f} + v_{2i} $$

Rearranging this to group the initial states and final states yields:

$$ v_{1i} - v_{2i} = -(v_{1f} - v_{2f}) $$

This is a profound result. The term $(v_{1i} - v_{2i})$ is the **relative velocity of approach** before the collision, and $(v_{1f} - v_{2f})$ is the **relative velocity of separation** after the collision. This equation tells us that in a one-dimensional elastic collision, the relative velocity of the two objects simply reverses direction, but its magnitude remains exactly the same, regardless of their masses.

### Solving for Final Velocities

We can now use our new, linear relative velocity equation alongside the linear momentum conservation equation to solve for the final velocities. By isolating $v_{2f}$ in the relative velocity equation and substituting it into the momentum equation, we arrive at the general solutions for 1D elastic collisions:

$$ v_{1f} = \left( \frac{m_1 - m_2}{m_1 + m_2} \right) v_{1i} + \left( \frac{2m_2}{m_1 + m_2} \right) v_{2i} $$

$$ v_{2f} = \left( \frac{2m_1}{m_1 + m_2} \right) v_{1i} + \left( \frac{m_2 - m_1}{m_1 + m_2} \right) v_{2i} $$

### Special Cases (Target at Rest)

The general equations look complex, but they simplify drastically in common physical scenarios. Let us examine what happens when the second particle (the target, $m_2$) is initially at rest, so $v_{2i} = 0$. The equations reduce to:

$$ v_{1f} = \left( \frac{m_1 - m_2}{m_1 + m_2} \right) v_{1i} $$

$$ v_{2f} = \left( \frac{2m_1}{m_1 + m_2} \right) v_{1i} $$

From these reduced equations, we can analyze three insightful special cases:

**Case 1: Equal Masses ($m_1 = m_2$)**
If an incoming particle strikes a stationary target of the exact same mass, substituting $m_1 = m_2$ into the equations yields $v_{1f} = 0$ and $v_{2f} = v_{1i}$. The projectile stops dead, and the target shoots forward with the projectile's original velocity. They completely swap momenta. This is the behavior you observe when a moving billiard ball strikes a stationary one head-on.

**Case 2: A Massive Target ($m_2 \gg m_1$)**
Imagine a ping-pong ball (projectile) bouncing off a bowling ball (target). In this limit, $m_1$ is negligible compared to $m_2$. The fraction $(m_1 - m_2)/(m_1 + m_2)$ approaches $-1$, and the fraction $2m_1/(m_1 + m_2)$ approaches $0$. Therefore, $v_{1f} \approx -v_{1i}$ and $v_{2f} \approx 0$. The light projectile bounces straight back with essentially the same speed, while the massive target barely budges.

**Case 3: A Massive Projectile ($m_1 \gg m_2$)**
Imagine a bowling ball (projectile) striking a stationary ping-pong ball (target). Now, $m_2$ is negligible. The fraction $(m_1 - m_2)/(m_1 + m_2)$ approaches $+1$, and the fraction $2m_1/(m_1 + m_2)$ approaches $2$. We find $v_{1f} \approx v_{1i}$ and $v_{2f} \approx 2v_{1i}$. The heavy projectile plows through without noticeably slowing down, and the light target is launched forward at twice the original speed of the projectile.

## 7.4 Inelastic Collisions in One Dimension

In the previous section, we explored perfectly elastic collisions, where both linear momentum and kinetic energy are conserved. However, in the macroscopic world, perfectly elastic collisions are an idealized approximation. Most real-world collisions—from a minor car fender-bender to a tennis racket striking a ball—are **inelastic collisions**.

In an inelastic collision, the total linear momentum of the isolated system is conserved, but the total macroscopic kinetic energy is *not* conserved. During the impact, some of the initial kinetic energy is transformed into other forms of energy, such as thermal energy, sound, or the internal energy required to permanently deform the objects (like the crushing of metal in a car crash).

### Perfectly Inelastic Collisions

Inelastic collisions can range from slightly inelastic (where only a small fraction of kinetic energy is lost) to a special extreme case known as a **perfectly inelastic collision**. In a perfectly inelastic collision, the two colliding objects stick together upon impact and move as a single combined mass afterward.

```text
       Before Collision
       
       m_1                 m_2
      ( O )----->       <---( O )
         v_1i                v_2i
       
       After Perfectly Inelastic Collision
       
             (m_1 + m_2)
             [ O_O ]----->
                v_f

```

Because the objects stick together, they share a single final velocity, $v_f$. This makes perfectly inelastic collisions much simpler to analyze than elastic ones, as we only need the conservation of momentum equation to find the final state of the system.

Applying the law of conservation of linear momentum to a one-dimensional perfectly inelastic collision:

$$ p_{i} = p_{f} $$

$$ m_1v_{1i} + m_2v_{2i} = (m_1 + m_2)v_f $$

We can easily solve this single equation for the final velocity of the combined mass:

$$ v_f = \frac{m_1v_{1i} + m_2v_{2i}}{m_1 + m_2} $$

Notice that the final velocity is a mass-weighted average of the initial velocities. If you know the masses and the initial velocities (remembering to use correct signs for the directions of the vectors), you can fully determine the motion of the system after the collision.

### Kinetic Energy Loss

Because a perfectly inelastic collision results in the maximum possible loss of kinetic energy for the system (while still obeying momentum conservation), it is instructive to calculate exactly how much energy is dissipated.

The total kinetic energy of the system before the collision is:

$$ K_i = \frac{1}{2}m_1v_{1i}^2 + \frac{1}{2}m_2v_{2i}^2 $$

The total kinetic energy after the collision, when the masses are combined, is:

$$ K_f = \frac{1}{2}(m_1 + m_2)v_f^2 $$

The change in kinetic energy is $\Delta K = K_f - K_i$. Because kinetic energy is lost to the environment or transformed into internal energy, $K_f$ will always be less than $K_i$, meaning $\Delta K$ will be negative. The magnitude of $\Delta K$ represents the energy dissipated during the deformation and impact.

#### Special Case: Target at Rest

Consider a common scenario: a moving object $m_1$ strikes a stationary target $m_2$ ($v_{2i} = 0$), and they stick together. The final velocity equation simplifies to:

$$ v_f = \left( \frac{m_1}{m_1 + m_2} \right) v_{1i} $$

Let us calculate the fraction of kinetic energy that remains in the system after this specific collision. The initial kinetic energy is simply $K_i = \frac{1}{2}m_1v_{1i}^2$. The final kinetic energy is:

$$ K_f = \frac{1}{2}(m_1 + m_2)v_f^2 = \frac{1}{2}(m_1 + m_2) \left( \frac{m_1}{m_1 + m_2} v_{1i} \right)^2 $$

Simplifying this expression gives:

$$ K_f = \frac{1}{2} \frac{m_1^2}{(m_1 + m_2)} v_{1i}^2 = \left( \frac{m_1}{m_1 + m_2} \right) \left( \frac{1}{2}m_1v_{1i}^2 \right) $$

$$ K_f = \left( \frac{m_1}{m_1 + m_2} \right) K_i $$

This result yields an important physical insight: the fraction of kinetic energy remaining in the system is $\frac{m_1}{m_1 + m_2}$.

* If a heavy object strikes a light stationary target ($m_1 \gg m_2$), the fraction is close to $1$, meaning very little kinetic energy is lost.
* If a light object strikes a heavy stationary target ($m_1 \ll m_2$), the fraction is close to $0$, meaning nearly all the initial kinetic energy is dissipated in the collision.

### General Inelastic Collisions

When two objects collide, deform, lose energy, but *bounce off* each other rather than sticking together, the collision is generally inelastic. These are the most mathematically complex collisions to solve because we have two unknown final velocities ($v_{1f}$ and $v_{2f}$) but only one valid conservation equation (momentum). The kinetic energy equation cannot be used directly without knowing exactly how much energy was lost.

To solve general inelastic problems, physicists and engineers introduce an empirical parameter called the **coefficient of restitution** ($e$), which is a measure of the "bounciness" of the collision. It is defined as the ratio of the relative velocity of separation to the relative velocity of approach:

$$ e = \frac{v_{2f} - v_{1f}}{v_{1i} - v_{2i}} $$

The coefficient $e$ is a dimensionless number ranging from $0$ to $1$:

* If $e = 1$, the collision is perfectly elastic (relative velocity is maintained, $K$ is conserved).
* If $e = 0$, the collision is perfectly inelastic (objects separate with zero relative velocity, meaning they stick together).
* If $0 < e < 1$, the collision is a general inelastic collision.

By using the momentum conservation equation alongside the coefficient of restitution equation, one can solve for the final velocities in any one-dimensional collision scenario.

## 7.5 Collisions in Two Dimensions

Up to this point, we have restricted our analysis of collisions to a single straight line. However, most real-world collisions do not occur perfectly head-on. When a moving billiard ball strikes another off-center, or when subatomic particles interact and scatter, the objects move in two or even three dimensions.

To analyze these complex interactions, we must remember that linear momentum is a vector quantity ($\vec{p} = m\vec{v}$). The law of conservation of linear momentum states that if the net external force on an isolated system is zero, the total vector momentum of the system remains constant.

### Vector Components and Conservation

Because momentum is a vector, its conservation applies independently to each spatial axis. In a two-dimensional collision occurring in the $xy$-plane, the total momentum in the $x$-direction is conserved, and the total momentum in the $y$-direction is conserved simultaneously.

For a system of two particles, we can break the master vector equation $\vec{P}_i = \vec{P}_f$ into two separate scalar equations:

**Conservation of Momentum (x-axis):**

$$ m_1v_{1ix} + m_2v_{2ix} = m_1v_{1fx} + m_2v_{2fx} $$

**Conservation of Momentum (y-axis):**

$$ m_1v_{1iy} + m_2v_{2iy} = m_1v_{1fy} + m_2v_{2fy} $$

By decomposing the velocities into their $x$ and $y$ components, we transform a complex two-dimensional vector problem into two manageable one-dimensional algebraic problems.

### Glancing Collisions (Target at Rest)

A very common analytical scenario is a **glancing collision**, where a moving projectile strikes a stationary target. This model is widely used in physics, from analyzing car crashes at intersections to studying Rutherford scattering in nuclear physics.

Let us define our coordinate system strategically. We will align the positive $x$-axis with the initial velocity vector of the incoming projectile ($m_1$). We place the target ($m_2$) at the origin. Because the target is initially at rest, $v_{2i} = 0$.

```text
       Before Collision                      After Collision
                                                   
                                                m_1     v_1f
                                                 ( O )--->
                                                 / 
                                                /  \ \theta
       m_1                 m_2               * - - - - - - - - x-axis
      ( O )========>      ( O )                 \  / \phi
         v_1i           (at rest)                \
                                                  ( O )--->
                                                m_2     v_2f

```

After the collision, the projectile $m_1$ scatters at an angle $\theta$ above the $x$-axis, and the target $m_2$ recoils at an angle $\phi$ below the $x$-axis. We define both $\theta$ and $\phi$ as positive angle magnitudes.

Let's apply our independent conservation equations to this specific geometry.

**1. $x$-axis Analysis:**
Initially, all of the system's momentum is carried by $m_1$ moving purely in the $x$-direction. After the collision, both masses have $x$-velocity components determined by the cosine of their respective scattering angles.

$$ m_1v_{1i} = m_1v_{1f} \cos\theta + m_2v_{2f} \cos\phi $$

**2. $y$-axis Analysis:**
Initially, there is absolutely zero movement in the $y$-direction, so the initial $y$-momentum is zero. After the collision, $m_1$ gains a positive $y$-momentum component, and $m_2$ gains a negative $y$-momentum component (pointing downward). For the total $y$-momentum to remain zero, these two components must perfectly cancel each other out.

$$ 0 = m_1v_{1f} \sin\theta - m_2v_{2f} \sin\phi $$

### Solving 2D Collision Problems

In the glancing collision scenario described above, there are seven distinct physical variables involved: $m_1, m_2, v_{1i}, v_{1f}, v_{2f}, \theta,$ and $\phi$.

Momentum conservation provides us with exactly two mathematical equations. Mathematically, this means if we know five of the variables (such as the masses, the initial velocity, and the final velocity and angle of one particle), we can solve for the remaining two. If more than two variables are unknown, the problem is undetermined, and we cannot find a unique solution without more information.

#### The Role of Kinetic Energy

If the two-dimensional collision is known to be **perfectly elastic**, we gain a third independent equation: the conservation of kinetic energy.

$$ \frac{1}{2}m_1v_{1i}^2 = \frac{1}{2}m_1v_{1f}^2 + \frac{1}{2}m_2v_{2f}^2 $$

Notice that kinetic energy is a scalar quantity. It does not have $x$ and $y$ components, and the scattering angles ($\theta$ and $\phi$) do not appear directly in this equation. The velocity terms here are the magnitudes (speeds) of the particles.

By utilizing this third equation alongside the two momentum equations, we can solve for up to three unknown variables. For example, if we only know the masses and the initial velocity of the projectile, the problem is still underdetermined even if it is elastic (we have three equations but four unknowns: $v_{1f}, v_{2f}, \theta, \phi$). However, if we measure just one final parameter—such as the scattering angle of the projectile, $\theta$—we can fully deduce the resulting speeds of both particles and the recoil angle of the target.

## 7.6 The Center of Mass

Up to this point, we have largely treated objects as dimensionless point particles. We have analyzed the trajectories of thrown baseballs, sliding blocks, and colliding cars as if all their mass were concentrated at a single, infinitely small location. In reality, macroscopic objects are extended bodies consisting of countless atoms, and systems can be composed of multiple distinct objects moving in different directions.

Fortunately, our "point particle" simplification is mathematically justified by a powerful concept: the **center of mass (CM)**. For any given system of particles or any extended object, there is a unique point in space that moves exactly as if all the system's mass were concentrated there and all external forces were applied directly to it.

### Defining the Center of Mass

The center of mass is a mass-weighted average of the positions of all the particles in a system.

#### System of Discrete Particles in One Dimension

Consider a simple one-dimensional system consisting of $n$ particles distributed along the $x$-axis. Each particle has a mass $m_i$ and is located at a position $x_i$. The total mass of the system is $M = \sum m_i$. The $x$-coordinate of the center of mass, $x_{\text{cm}}$, is defined as:

$$ x_{\text{cm}} = \frac{m_1x_1 + m_2x_2 + \dots + m_nx_n}{m_1 + m_2 + \dots + m_n} = \frac{1}{M} \sum_{i=1}^{n} m_ix_i $$

The center of mass is mathematically pulled toward the heavier masses. If two equal masses are placed at $x=0$ and $x=4$, their center of mass is exactly in the middle at $x=2$. However, if a massive object and a light object are connected, the center of mass lies much closer to the massive object.

```text
         m_1 = 3 kg                               m_2 = 1 kg
           [███]-------------------------------------[█]
             |                 ^                      |
            x=0             x_cm = 1                 x=4
                            (Balance Point)

```

In the illustration above, calculating the center of mass yields $x_{\text{cm}} = \frac{(3)(0) + (1)(4)}{3 + 1} = \frac{4}{4} = 1\text{ m}$. This is the point where the system would balance perfectly on a fulcrum.

#### System of Discrete Particles in Three Dimensions

For a system of particles distributed in three-dimensional space, we define the center of mass using position vectors. Let $\vec{r}_i$ be the position vector of the $i$-th particle. The position vector of the center of mass, $\vec{r}_{\text{cm}}$, is:

$$ \vec{r}_{\text{cm}} = \frac{1}{M} \sum_{i=1}^{n} m_i\vec{r}_i $$

This single vector equation is equivalent to three separate scalar equations for the $x$, $y$, and $z$ coordinates:

$$ x_{\text{cm}} = \frac{1}{M} \sum_{i=1}^{n} m_ix_i \quad \quad y_{\text{cm}} = \frac{1}{M} \sum_{i=1}^{n} m_iy_i \quad \quad z_{\text{cm}} = \frac{1}{M} \sum_{i=1}^{n} m_iz_i $$

#### Continuous Extended Bodies

A solid, continuous object (like a solid cylinder or a non-uniform rod) cannot be easily split into a few discrete masses. Instead, we treat it as a collection of an infinite number of infinitesimal mass elements, $dm$. The summation from our discrete formula becomes an integral over the entire body:

$$ \vec{r}_{\text{cm}} = \frac{1}{M} \int \vec{r} \, dm $$

For objects with a uniform density (where mass is evenly distributed throughout the volume), the center of mass always lies on its geometric center or axis of symmetry. For instance, the center of mass of a uniform sphere is exactly at its center, and the center of mass of a uniform rectangular plate is at the intersection of its diagonals. If the object has a "hole" or is hollow, the center of mass may lie in empty space outside the physical material, as is the case with a doughnut or a horseshoe.

### Velocity and Momentum of the Center of Mass

What happens when the particles in a system are moving? We can find the velocity of the center of mass ($\vec{v}_{\text{cm}}$) by taking the time derivative of the position vector $\vec{r}_{\text{cm}}$:

$$ \vec{v}_{\text{cm}} = \frac{d\vec{r}_{\text{cm}}}{dt} = \frac{1}{M} \sum_{i=1}^{n} m_i \frac{d\vec{r}_i}{dt} = \frac{1}{M} \sum_{i=1}^{n} m_i\vec{v}_i $$

Notice that the numerator in this expression, $\sum m_i\vec{v}_i$, is simply the sum of the individual momenta of all the particles ($\sum \vec{p}_i$). In section 7.2, we defined this as the total linear momentum of the system, $\vec{P}$. Multiplying both sides by $M$ yields a fundamental relationship:

$$ \vec{P} = M\vec{v}_{\text{cm}} $$

This equation tells us that **the total linear momentum of a system is equal to its total mass multiplied by the velocity of its center of mass**. This is incredibly powerful: regardless of how complicated the internal motions of a system are—whether it is a spinning galaxy or a swarm of bees—its total momentum can be calculated by tracking just one imaginary point.

Furthermore, if the system is isolated (no net external forces), we know that $\vec{P}$ is constant. Therefore, the velocity of the center of mass ($\vec{v}_{\text{cm}}$) must also be constant. In an isolated system, even if particles are colliding and shattering, the center of mass drifts along in a perfectly straight line at a constant speed.

### Newton's Second Law for a System of Particles

By taking the time derivative of the center of mass velocity, we find the acceleration of the center of mass ($\vec{a}_{\text{cm}}$):

$$ \vec{a}_{\text{cm}} = \frac{d\vec{v}_{\text{cm}}}{dt} = \frac{1}{M} \sum_{i=1}^{n} m_i\vec{a}_i $$

Multiplying by $M$ gives:

$$ M\vec{a}_{\text{cm}} = \sum_{i=1}^{n} m_i\vec{a}_i = \sum_{i=1}^{n} \vec{F}_i $$

The term $\sum \vec{F}_i$ represents the vector sum of *all* forces acting on *all* particles in the system. As we established earlier in the chapter, internal forces between particles in the system occur in equal and opposite action-reaction pairs, meaning they completely cancel each other out in the overall sum. The only forces that do not cancel are the external forces applied from outside the system.

This leads us to Newton's second law applied to a system of particles:

$$ \sum \vec{F}_{\text{ext}} = M\vec{a}_{\text{cm}} $$

This equation is the profound justification for everything we have done in mechanics so far. It dictates that the center of mass of any system of particles moves exactly as if all the system's mass were concentrated at that point and all external forces were applied directly to it.

If an artillery shell is fired in a parabolic trajectory and explodes mid-air into a thousand fragments, the internal forces of the explosion are immense. However, because those forces are internal, they do not affect the center of mass. Neglecting air resistance, the center of mass of the expanding cloud of shrapnel will continue to trace the exact same perfect parabola that the unbroken shell would have followed.

---

### Chapter Summary

* **Linear Momentum:** The linear momentum of a particle is a vector quantity defined as $\vec{p} = m\vec{v}$. Newton's second law can be expressed more generally as $\sum \vec{F} = \frac{d\vec{p}}{dt}$.
* **Impulse:** Impulse ($\vec{J}$) is the time integral of the net force over a time interval. The impulse-momentum theorem states that the impulse applied to an object equals its change in momentum: $\vec{J} = \int \vec{F} dt = \Delta \vec{p}$.
* **Conservation of Momentum:** If the net external force on an isolated system is zero, the total linear momentum of the system remains constant ($\vec{P}_i = \vec{P}_f$). Internal forces do not change the total momentum of a system.
* **Elastic Collisions:** An elastic collision is an interaction where both the total linear momentum and the total macroscopic kinetic energy of the system are conserved. In 1D, the relative velocity of approach equals the relative velocity of separation.
* **Inelastic Collisions:** In an inelastic collision, momentum is conserved, but kinetic energy is not; some is transformed into internal energy or dissipated. In a perfectly inelastic collision, the colliding objects stick together and share a final velocity.
* **Two-Dimensional Collisions:** Because momentum is a vector, its conservation applies independently to each spatial axis ($P_{ix} = P_{fx}$ and $P_{iy} = P_{fy}$). Solving these problems often involves decomposing velocity vectors into orthogonal components.
* **Center of Mass:** The center of mass is the unique balance point of a system ($\vec{r}_{\text{cm}} = \frac{1}{M}\sum m_i\vec{r}_i$). The total momentum of a system is equal to its total mass times the velocity of its center of mass ($\vec{P} = M\vec{v}_{\text{cm}}$).
* **System Dynamics:** The center of mass of an extended object or system moves exactly as if all its mass were concentrated at that point and all external forces were applied there ($\sum \vec{F}_{\text{ext}} = M\vec{a}_{\text{cm}}$), unaffected by internal forces.
