In previous chapters, we explored kinematics, learning how to describe motion using velocity and acceleration. However, we have not yet answered a fundamental question: what actually *causes* an object's motion to change? Why does a resting object begin to move, or a speeding object come to a halt?

To answer this, we transition to the study of dynamics. In this chapter, we explore Sir Isaac Newton's three laws of motion—the bedrock of classical mechanics. By understanding force, mass, and the mutual interactions between bodies, we gain the powerful ability to not just describe, but predict and explain the mechanical behavior of the universe.

## 4.1 The Concepts of Force and Mass

In the previous chapters, we developed the tools of kinematics to describe *how* objects move, using concepts like displacement, velocity, and acceleration. However, kinematics does not address *why* objects move the way they do. What causes an object at rest to start moving? What causes a moving object to accelerate, decelerate, or change direction? The branch of physics that investigates the causes of motion and changes in motion is called **dynamics**. At the foundation of dynamics are two fundamental concepts: force and mass.

### The Concept of Force

In everyday language, a **force** is simply a push or a pull exerted on an object. When you push a heavy box across the floor, stretch a rubber band, or pull open a door, you are exerting a force.

Forces in nature can be broadly categorized into two classes based on how they interact with objects:

1. **Contact Forces:** These forces arise from the physical contact between two objects.

* *Examples:* The tension in a pulled rope, the friction between sliding surfaces, the upward push of a table on a resting book, or the force of a bat hitting a baseball.

1. **Field Forces (Action-at-a-Distance):** These forces do not require physical contact to transmit their effect. They act through empty space via a "field."

* *Examples:* The gravitational pull of the Earth on the Moon, the magnetic attraction between a magnet and a piece of iron, and the electric force between two protons.

Fundamentally, modern physics recognizes that all macroscopic contact forces actually originate from microscopic field forces—specifically, the electromagnetic repulsion between the atoms of the interacting objects.

```text
      CONTACT FORCE                       FIELD FORCE
      
        Applied Force                      Gravitational Force
         (Pushing)                           (No contact)
                                                 
      O                                       [ Earth ]
     /|\ ---> [ Box ]                            |
     / \                                         v
                                              ( Apple )

```

#### The Vector Nature of Force

Force is a **vector quantity**, meaning it is entirely specified only when both a magnitude (how strong the push or pull is) and a direction (where the push or pull is aimed) are given.

In the International System of Units (SI), the unit of force is the **newton** (N).

Because forces are vectors, they follow the rules of vector addition. When multiple forces act simultaneously on a single object, their combined effect is determined by the **net force** (or resultant force). The net force is the vector sum of all individual forces acting on the object:

$$ \vec{F}_{\text{net}} = \sum \vec{F} = \vec{F}_1 + \vec{F}_2 + \vec{F}_3 + \dots $$

If you push a block to the right with a force of 10 N and a friend pushes the same block to the left with a force of 4 N, the forces do not simply add up to 14 N. Because they point in opposite directions, the vector sum results in a net force of 6 N directed to the right.

```text
 VECTOR ADDITION OF FORCES:

 F_1 = 10 N (Right)
 +--------------------+>

 F_2 = 4 N (Left)
 <--------+

 F_net = 6 N (Right)
 +------------+>

```

### The Concept of Mass

While force is the influence that attempts to change an object's state of motion, **mass** is the property of the object that dictates how much it will resist that change.

Imagine kicking a soccer ball and a solid iron cannonball of the exact same size with the exact same effort (force). The soccer ball will rapidly accelerate and fly across the field. The cannonball will barely move, and you will likely break your toe. The cannonball resists the change to its state of motion much more than the soccer ball does.

This inherent resistance to changes in velocity is called **inertia**. Mass is the quantitative measure of an object's inertia. The greater the mass of a body, the less it will accelerate under the action of a given applied force.

Unlike force, mass is a **scalar quantity**; it has magnitude but no direction. It obeys the rules of ordinary arithmetic (e.g., a 3 kg mass combined with a 4 kg mass yields a 7 kg mass). The SI unit of mass is the **kilogram** (kg).

#### Mass vs. Weight

A common error is confusing mass with weight. In physics, these are entirely distinct quantities:

* **Mass ($m$):** An intrinsic, scalar property of an object that measures its inertia. It depends only on the amount of matter the object contains. An object's mass is the same whether it is on Earth, on the Moon, or floating in deep space.
* **Weight ($\vec{w}$):** A vector quantity representing the gravitational force exerted on an object by a massive body (like the Earth). Because weight is a force, it is measured in newtons (N), not kilograms. Weight depends on the local gravitational field.

For example, an astronaut with a mass of 80 kg has an approximate weight of 784 N on Earth. If that astronaut travels to the Moon, their mass remains exactly 80 kg, but their weight decreases to about 130 N because the Moon's gravitational pull is much weaker.

## 4.2 Newton's First and Second Laws

Before the revolutionary work of Galileo Galilei and Isaac Newton, the prevailing view—championed by Aristotle—was that the "natural state" of an object was to be at rest. It was believed that a continuous force was required to keep an object moving. Galileo realized that friction was the hidden force causing moving objects to slow down, and Newton formalized this insight into his foundational laws of motion.

### Newton's First Law of Motion

Newton's First Law, often called the **Law of Inertia**, describes the behavior of an object when no net external force acts upon it. It states:

> **An object at rest remains at rest, and an object in motion continues in motion with a constant velocity (that is, with a constant speed in a straight line), unless it is compelled to change that state by a net external force.**

In mathematical terms, if the net force is zero, the acceleration is zero:
If $\sum \vec{F} = 0$, then $\vec{a} = 0$, which implies $\vec{v} = \text{constant}$.

Notice that "at rest" is simply a special case of constant velocity where $\vec{v} = 0$. The first law tells us that a net force is not required to *sustain* motion; rather, a net force is required to *change* motion.

```text
 SCENARIO A: Object at Rest         SCENARIO B: Object in Motion
 
 v = 0                              v = 10 m/s (Constant)
 [ Block ]                          [ Block ] ------->
 
 F_net = 0                          F_net = 0
 a = 0                              a = 0

```

#### Inertial Reference Frames

Newton's First Law is not universally true in all observational frames of reference. For example, if you place a smooth ball on the floor of a bus, and the bus suddenly accelerates forward, the ball will appear to roll backward relative to the bus. No physical force pushed the ball backward; its apparent acceleration is entirely due to the acceleration of the bus.

Frames of reference where Newton's First Law is valid are called **inertial reference frames**. Any reference frame that moves with constant velocity relative to an inertial frame is itself an inertial frame. Conversely, any reference frame that is accelerating (like the stopping bus, or a rotating merry-go-round) is a **non-inertial reference frame**. In this textbook, unless otherwise stated, we assume our observations are made from an inertial reference frame (typically the surface of the Earth, which is a close enough approximation for most macroscopic phenomena).

### Newton's Second Law of Motion

While the first law describes what happens when the net force is zero, **Newton's Second Law** answers the crucial question: what happens when a net force *is* applied?

Newton's Second Law states that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass. The direction of the acceleration is the same as the direction of the net force.

Mathematically, this is expressed by one of the most important equations in physics:

$$ \sum \vec{F} = m\vec{a} $$

Where:

* $\sum \vec{F}$ (or $\vec{F}_{\text{net}}$) is the vector sum of all external forces acting on the object.
* $m$ is the mass of the object (a scalar).
* $\vec{a}$ is the resulting acceleration vector.

```text
 RELATIONSHIP BETWEEN FORCE, MASS, AND ACCELERATION:

 F_net
 +------------------>
 [      Mass, m     ] ----> a
 
 Since m is always positive, the acceleration vector (a) 
 must always point in the exact same direction as the 
 net force vector (F_net).

```

#### Vector Components of the Second Law

Because Newton's Second Law is a vector equation, it is equivalent to three separate scalar equations, one for each axis in a Cartesian coordinate system. When solving problems, it is almost always necessary to break the forces down into their components:

$$ \sum F_x = ma_x $$

$$ \sum F_y = ma_y $$

$$ \sum F_z = ma_z $$

If the net force in a particular direction is zero, the acceleration in that direction must also be zero. For example, a car accelerating horizontally along a flat road has a net force in the $x$-direction ($\sum F_x = ma_x$), but the net force in the vertical $y$-direction is zero ($\sum F_y = 0$), so the car does not accelerate up into the air or down into the asphalt.

#### Units of Force

Newton's Second Law provides the precise definition for the SI unit of force, the **newton (N)**. A force of one newton is defined as the amount of net force required to accelerate a one-kilogram mass at a rate of one meter per second squared.

$$ 1 \text{ N} = 1 \text{ kg} \cdot \text{m/s}^2 $$

If you push a $2 \text{ kg}$ object with a net force of $10 \text{ N}$, the second law dictates that its acceleration will be:

$$ a = \frac{\sum F}{m} = \frac{10 \text{ N}}{2 \text{ kg}} = 5 \text{ m/s}^2 $$

This confirms the concept of mass as a measure of inertia introduced in Section 4.1: for a given applied force, a larger mass $m$ will result in a smaller acceleration $a$.

## 4.3 Newton's Third Law and Action-Reaction Pairs

Newton’s first and second laws focus on a single object and how its motion is affected by the net force acting upon it. However, a force is not something an object possesses in isolation; rather, it is an interaction *between* two objects. You cannot push a wall without the wall simultaneously pushing back on you. This mutual interaction is the foundation of **Newton's Third Law of Motion**, which describes the fundamental symmetry of forces in nature.

Newton's Third Law states:

> **If object A exerts a force on object B, then object B simultaneously exerts an equal and opposite force on object A.**

In everyday language, this is often phrased as: "For every action, there is an equal and opposite reaction."

Mathematically, if we denote the force exerted by object A on object B as $\vec{F}_{AB}$ (the action) and the force exerted by object B on object A as $\vec{F}_{BA}$ (the reaction), the law is written as:

$$\vec{F}_{AB}=-\vec{F}_{BA}$$

The negative sign indicates that the two forces point in exactly opposite directions, while the equation establishes that their magnitudes are perfectly equal ($|\vec{F}_{AB}|=|\vec{F}_{BA}|$).

### Properties of Action-Reaction Pairs

To correctly apply Newton's Third Law, it is critical to understand the specific properties of action-reaction pairs. Misunderstanding these properties leads to some of the most common errors in physics.

**1. Forces Always Exist in Pairs**
There is no such thing as a solitary force in the universe. Forces always come in pairs. It is impossible to exert a force on a body without experiencing a force in return. Furthermore, the labels "action" and "reaction" are entirely arbitrary. Neither force causes the other, and neither precedes the other in time; they are simply two halves of a single simultaneous interaction.

**2. They Act on Different Objects**
This is the most crucial concept regarding the third law. An action-reaction pair consists of two forces acting on *two different free bodies*.

A common misconception is to assume that because action and reaction forces are equal and opposite, they should cancel each other out, resulting in no net force and no acceleration. They do **not** cancel each other out because they do not act on the same object.

```text
 MISCONCEPTION VS. REALITY

 [ Misconception ]
 Forces cancel out if they act on the SAME object:
 
  F_push = 10 N                 F_friction = 10 N
  ----------------> [ Block ] <----------------
  (Net Force = 0. This is NOT an action-reaction pair!)

 [ Reality ]
 Action-Reaction forces act on DIFFERENT objects:
 
 F_{B on A}                        F_{A on B}
 <-------------                   ------------->
 [ Object A ]                       [ Object B ]
 (Forces do not cancel. Object A accelerates left based on its mass; 
 Object B accelerates right based on its mass.)

```

**3. They are of the Same Type**
If the action force is a gravitational pull, the reaction force is also a gravitational pull. If the action is a normal contact force, the reaction is a normal contact force. You cannot have an action-reaction pair where one force is gravitational and the other is frictional.

### Real-World Applications

**Walking and Driving**
How do you walk forward? You might think you propel yourself forward, but from a dynamics perspective, you cannot exert a net force on yourself. When you walk, your foot pushes *backward* against the floor (friction). According to Newton's Third Law, the floor pushes *forward* against your foot with an equal and opposite frictional force. It is the floor pushing on you that accelerates you forward. The same principle applies to the tires of a car pushing backward on the asphalt.

```text
 WALKING FORWARD:
 
             \   /
              \ / 
   Leg ---->   |
              / \
 Foot pushes /   \ Floor pushes
 backward   /     \ forward on foot
 on floor  v       ^
 <---------+       +--------->

```

**Rockets and Jet Propulsion**
In the vacuum of space, there is no air for a rocket to push against. How, then, does a rocket accelerate? The rocket burns fuel and expels the exhaust gases backward out of its engine at high speeds. The "action" is the rocket pushing the gas backward. The "reaction" is the gas pushing the rocket forward.

**Gravity and Vastly Different Masses**
Consider an apple falling toward the Earth. The Earth exerts a downward gravitational force on the apple. By Newton's Third Law, the apple exerts an equal and opposite upward gravitational force on the Earth.

If the forces are exactly the same size, why do we only see the apple move? We can answer this by combining the third law with Newton's Second Law ($\vec{a}=\Sigma\vec{F}/m$).

Let $F$ be the magnitude of the gravitational force.

* Acceleration of the apple: $a_{\text{apple}} = \frac{F}{m_{\text{apple}}}$
* Acceleration of the Earth: $a_{\text{Earth}} = \frac{F}{m_{\text{Earth}}}$

Because the mass of the Earth ($m_{\text{Earth}}$) is astronomically larger than the mass of the apple ($m_{\text{apple}}$), the acceleration of the Earth is infinitesimally small—so small it is completely unmeasurable. The forces are identical in magnitude, but the *effects* of those forces (the accelerations) are vastly different due to the difference in inertia.

## 4.4 Applying Newton's Laws: Free-Body Diagrams

Newton’s second law, $\sum \vec{F} = m\vec{a}$, is the fundamental engine for solving problems in dynamics. However, applying it to real-world situations can quickly become confusing if you do not have a systematic way to identify and keep track of the forces involved. The most powerful tool for this task is the **free-body diagram** (FBD).

A free-body diagram is a simplified, isolated visual representation of a single object and all the external forces acting *on* it. By stripping away the environment and representing the object as a simple point (the particle model), you can clearly see how forces interact, allowing you to easily set up Newton's second law equations.

### Rules for Drawing a Free-Body Diagram

To successfully construct and use a free-body diagram, follow these structured steps:

**1. Isolate the Object of Interest**
Decide exactly which object's motion you are analyzing. If a problem involves multiple interacting objects (like a car towing a trailer), you must draw a separate free-body diagram for each object.

**2. Represent the Object as a Point**
Draw a prominent dot at the center of your coordinate system. This dot represents the object's center of mass. We assume all forces act at this single point.

**3. Identify All External Forces**
Carefully catalog every physical push or pull exerted *on* the object by its environment. Common forces include:

* **Weight ($w$ or $F_g$):** The force of gravity acting on the object. It always points straight down toward the center of the Earth. ($w = mg$)
* **Normal Force ($n$ or $F_N$):** The contact force exerted by a surface. It is always perpendicular (normal) to the surface.
* **Tension ($T$):** The pulling force exerted by a string, rope, or cable. It always points away from the object along the line of the string.
* **Friction ($f$):** The contact force that opposes sliding motion between surfaces. It is always parallel to the surface.
* **Applied Forces ($F_{\text{app}}$):** Any generic external pushes or pulls (e.g., a hand pushing a box).

*Crucial Note:* Never include forces that the object exerts *on* other things (Newton's third law reaction pairs are split between different FBDs). Furthermore, do not include "mass times acceleration" ($ma$) as a force; $ma$ is the *result* of the forces, not a force itself.

**4. Draw and Label the Force Vectors**
Draw arrows originating from the dot and pointing in the direction of each respective force. The length of the arrow should roughly estimate the relative magnitude of the force. Label each vector clearly.

**5. Establish a Coordinate System**
Draw an x-y coordinate axis. Usually, it is best to align one of the axes with the direction of the object's acceleration. If the object is accelerating horizontally, use standard vertical and horizontal axes. If the object is accelerating down a ramp, tilt your axes so the x-axis runs parallel to the ramp.

### Example 1: A Block Dragged Across a Rough Floor

Imagine a heavy wooden block being dragged to the right across a rough horizontal floor by a rope. We want to analyze the forces on the block.

* **Gravity:** Pulls the block straight down ($w$).
* **Normal Force:** The floor pushes the block straight up ($n$).
* **Tension:** The rope pulls the block to the right ($T$).
* **Friction:** The rough floor opposes the motion, pulling to the left ($f$).

```text
      y-axis
        ^
        |   n (Normal Force)
        |
        |
f <-----O-----> T (Tension)
        |      x-axis
        | 
        |
        v
        w (Weight)

```

From this FBD, writing Newton's second law in component form becomes a simple translation exercise:

* **x-direction:** $\sum F_x = T - f = ma_x$
* **y-direction:** $\sum F_y = n - w = 0$ (assuming the block doesn't lift off the floor)

### Example 2: A Block Sliding Down an Incline

Consider a block sliding down a frictionless inclined plane that is at an angle $\theta$ above the horizontal.

* **Gravity:** Still points straight down toward the center of the Earth ($w$).
* **Normal Force:** Points perpendicular to the surface of the incline ($n$).
* There is no friction (frictionless) and no tension (no ropes).

For problems on inclines, it is standard practice to **tilt the coordinate axes** so that the x-axis is parallel to the incline. This ensures that the acceleration is entirely along the x-axis, simplifying the math.

```text
        y-axis
         ^   n (Normal Force)
         |  /
         | /
         |/
 <-------O--------> x-axis
        /|
       / |
      /  v
         w (Weight)

```

Because the axes are tilted, the weight vector ($w$) is no longer aligned with the y-axis. It must be resolved into x and y components. Through geometry, the angle between the weight vector and the negative y-axis is equal to the incline angle $\theta$.

$$ w_x = mg \sin \theta \quad \text{(Component pulling down the incline)} $$

$$ w_y = mg \cos \theta \quad \text{(Component pressing into the incline)} $$

Now, applying Newton's second law yields:

* **x-direction:** $\sum F_x = mg \sin \theta = ma_x$
* **y-direction:** $\sum F_y = n - mg \cos \theta = 0$

Notice how the free-body diagram visually organizes the physics, making it clear that gravity is driving the acceleration down the plane ($mg \sin \theta$) while simultaneously dictating the magnitude of the normal force ($n = mg \cos \theta$).

## 4.5 Forces of Friction and Drag

In our previous idealized examples, we occasionally assumed surfaces were perfectly smooth to simplify the application of Newton's laws. In reality, all macroscopic interactions between surfaces or between an object and a fluid involve resistive forces that oppose relative motion. The two most common macroscopic resistive forces are **friction** and **drag**.

### Forces of Friction

Friction is a contact force parallel to the interface between two surfaces. Microscopically, even the smoothest-looking surfaces possess jagged peaks and valleys. When two surfaces are pressed together, these microscopic irregularities interlock. Furthermore, the atoms of the two surfaces come close enough to form temporary electromagnetic bonds (cold welding). To move the surfaces relative to one another, these bonds must be broken and the microscopic peaks sheared off, which requires a force.

We distinguish between two distinct regimes of friction: static and kinetic.

#### Static Friction

**Static friction** ($f_s$) is the force that opposes the *initiation* of motion. It acts parallel to the surfaces in contact and in the direction opposite to the impending motion.

A unique property of static friction is that it is not a constant value; it is a *responsive* force that exactly matches the applied force up to a certain limit. If you push a heavy crate with $10 \text{ N}$ of force and it doesn't move, static friction is exactly $10 \text{ N}$. If you push with $50 \text{ N}$ and it still doesn't move, static friction has increased to exactly $50 \text{ N}$.

Mathematically, static friction is expressed as an inequality:

$$ f_s \le \mu_s n $$

Here, $n$ is the magnitude of the normal force, and $\mu_s$ is the **coefficient of static friction**, a dimensionless constant that depends on the specific materials of the two surfaces (e.g., rubber on concrete has a high $\mu_s$, while ice on steel has a very low $\mu_s$).

Static friction reaches its maximum possible value just before the object breaks free and begins to slide. At this threshold of motion:

$$ f_{s,\text{max}} = \mu_s n $$

#### Kinetic Friction

Once the applied force exceeds $f_{s,\text{max}}$, the object snaps free and begins to slide. The resistive force is now **kinetic friction** ($f_k$), which opposes ongoing relative motion.

Unlike static friction, kinetic friction is generally considered to be independent of the applied force and largely independent of the sliding speed. It has a constant magnitude given by:

$$ f_k = \mu_k n $$

Where $\mu_k$ is the **coefficient of kinetic friction**. For any two dry surfaces, the kinetic coefficient is almost always strictly less than the static coefficient ($\mu_k < \mu_s$). This explains why it requires a larger force to get a heavy object moving than it does to keep it moving.

```text
 GRAPH OF FRICTION FORCE VS. APPLIED FORCE

 Friction Force (f)
   ^
   |       /| <--- Point of slipping (f_s,max = μ_s * n)
   |      / |
   |     /  |
   |    /   |   Constant sliding friction
   |   /    |--------------------------------- f_k = μ_k * n
   |  /     |
   | /      |
   |/       |
   +--------+--------------------------------> Applied Force
    Static              Kinetic
    Region              Region

```

### Drag Forces and Terminal Velocity

While friction acts between solid surfaces, an object moving through a fluid (a liquid or a gas) experiences a different type of resistive force called **drag** (or fluid resistance). Unlike solid kinetic friction, drag forces are highly dependent on the velocity of the object.

For macroscopic objects moving through air (like a falling baseball or a speeding car), the aerodynamic drag force $\vec{D}$ is proportional to the square of the object's speed:

$$ D = \frac{1}{2} C \rho A v^2 $$

Where:

* $C$ is the **drag coefficient**, a dimensionless number determined by the object's aerodynamic shape.
* $\rho$ is the density of the fluid (e.g., air density is roughly $1.2 \text{ kg/m}^3$).
* $A$ is the effective cross-sectional area of the object perpendicular to the velocity.
* $v$ is the speed of the object relative to the fluid.

The direction of the drag force is always perfectly opposite to the velocity vector of the object.

#### Terminal Velocity

Consider a sky diver stepping out of an airplane. Initially, their speed $v$ is zero, so the drag force $D$ is zero. The only force acting on them is gravity ($w = mg$), so they accelerate downward at $9.8 \text{ m/s}^2$.

However, as their speed $v$ increases, the upward drag force $D$ grows rapidly (proportional to $v^2$). According to Newton's second law, the net force dictates the acceleration:

$$ \sum F_y = mg - D = ma $$

$$ mg - \frac{1}{2} C \rho A v^2 = ma $$

As $v$ gets larger, the subtraction term grows, causing the net force and the acceleration ($a$) to steadily decrease. Eventually, the object reaches a speed where the upward drag force exactly equals the downward weight force ($D = mg$). At this exact point, the net force is zero, and acceleration drops to zero.

The object will no longer speed up. It has reached its maximum constant falling speed, known as **terminal velocity** ($v_T$). We can find this speed by setting $a = 0$ in our equation and solving for $v$:

$$ mg - \frac{1}{2} C \rho A v_T^2 = 0 $$

$$ v_T = \sqrt{\frac{2mg}{C \rho A}} $$

```text
 FALLING OBJECT: REACHING TERMINAL VELOCITY

 Time = 0s         Time = 3s           Time = 10s (Terminal Velocity)
 v = 0             v = medium          v = v_T (maximum, constant)
 D = 0             D = small           D = mg
 a = g             a < g               a = 0
 
   O                 ^ D                 ^ D
   |                 |                   |
   |                 O                   |
   v                 |                   O
   w                 v                   |
                     w                   v
                                         w

```

---

## Chapter Summary

* **Dynamics and Force:** Dynamics is the study of the causes of motion. A force is a vector quantity (measured in newtons, N) representing a push or pull. Mass is a scalar quantity measuring an object's inertia (resistance to changes in motion).
* **Newton's First Law:** An object's velocity remains constant unless acted upon by a net external force. This law defines inertial reference frames.
* **Newton's Second Law:** The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass: $\sum \vec{F} = m\vec{a}$.
* **Newton's Third Law:** Forces always occur in pairs. If object A exerts a force on object B, object B exerts an equal and opposite force on object A: $\vec{F}_{AB} = -\vec{F}_{BA}$. These forces act on different objects and do not cancel each other out.
* **Free-Body Diagrams (FBD):** A critical graphical tool used to isolate a single object and represent all external forces acting upon it, enabling the proper algebraic setup of Newton's second law equations.
* **Friction:** A contact force opposing sliding motion. Static friction prevents motion and varies up to a maximum ($f_{s,\text{max}} = \mu_s n$). Kinetic friction opposes ongoing motion and is modeled as a constant ($f_k = \mu_k n$).
* **Drag and Terminal Velocity:** Drag is a velocity-dependent resistive force experienced by objects moving through fluids. When an object in free-fall reaches a speed where the upward drag force equals its downward weight, it ceases accelerating and falls at a constant terminal velocity.
