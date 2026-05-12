In Chapter 5, we saw how work changes an object's kinetic energy. But what if that energy isn't immediately expressed as motion? Here, we introduce *potential energy*—energy stored in a system's configuration, like a compressed spring or a boulder on a cliff. By categorizing forces as conservative or non-conservative, we will unlock one of physics' most profound principles: the Conservation of Mechanical Energy. This elegant framework allows us to bypass complex kinematic equations, tracking energy transformations to solve intricate motion problems with remarkable simplicity and speed.

## 6.1 Conservative and Non-conservative Forces

In Chapter 5, we established that work is the transfer of energy to or from a system via the application of a force, defined mathematically as $W = \int \mathbf{F} \cdot d\mathbf{r}$. As we transition to the broader concept of energy conservation, it is necessary to classify forces into two distinct categories based on how they do work: **conservative** and **non-conservative** forces. This distinction is the physical foundation for the concept of potential energy, which we will explore in the next section.

### Conservative Forces

A force is classified as **conservative** if the work it does on a particle moving between two points is entirely independent of the path taken by the particle.

> **Definition:** A force is conservative if the work done by that force on an object moving from an initial point $A$ to a final point $B$ depends only on the spatial coordinates of $A$ and $B$, and not on the trajectory connecting them.

Mathematically, if an object moves from point $A$ to point $B$ under the influence of a conservative force $\mathbf{F}_c$, the work done along Path 1 is exactly equal to the work done along Path 2:

$$W_{\text{Path 1}} = W_{\text{Path 2}}$$

$$\int_{\text{Path 1}} \mathbf{F}_c \cdot d\mathbf{r} = \int_{\text{Path 2}} \mathbf{F}_c \cdot d\mathbf{r}$$

```text
       Path 1 (Arbitrary Curve)
         .----------------.
        /                  \
      (A)                  (B)
        \                  /
         '----------------'
       Path 2 (Alternative Curve)

   For a conservative force, W_A→B is the same for both paths.

```

An equivalent, and often more useful, way to define a conservative force is by considering a closed path (a loop). If a particle starts at point $A$, travels along any path, and returns to exactly point $A$, the total net work done by a conservative force is zero.

$$\oint \mathbf{F}_c \cdot d\mathbf{r} = 0$$

The circular integral symbol ($\oint$) denotes that the integration is evaluated over a closed path. Because the system returns to its exact initial geometric configuration, no net energy is transferred by the conservative force over the complete cycle.

**Common Examples of Conservative Forces:**

* **Gravitational Force:** The work done by gravity depends only on the change in vertical height ($h$), not on whether you lift an object straight up or push it up a frictionless ramp.
* **Elastic (Spring) Force:** The work done by an ideal spring depends only on the initial and final stretch or compression positions ($x_i$ and $x_f$).
* **Electrostatic Force:** The force between two charged particles is conservative, leading to electric potential energy.

### Non-conservative Forces

A force is classified as **non-conservative** if the work it does on an object moving between two points *does* depend on the path taken.

> **Definition:** A force is non-conservative if it causes a transfer of mechanical energy to or from the system in a way that is path-dependent and typically irrecoverable.

The most common example of a non-conservative force is **kinetic friction**. Consider sliding a block across a rough table from point $A$ to point $B$. The work done by kinetic friction is always negative because the frictional force $\mathbf{f}_k$ is always directed opposite to the infinitesimal displacement $d\mathbf{r}$.

If you take a straight, short path, the friction does a certain amount of negative work. If you take a long, meandering path between the exact same two points, the friction acts over a much greater distance, doing significantly more negative work.

```text
 Path 1: Straight line (Shorter distance, less energy dissipated)
 (A) ----------------------------------------> (B)

 Path 2: Meandering path (Longer distance, more energy dissipated)
 (A) --.         .------.         .----------> (B)
        \       /        \       /
         '-----'          '-----'

```

Because $W_{\text{Path 1}} \neq W_{\text{Path 2}}$, kinetic friction is a non-conservative force. Over a closed loop (pushing a block from $A$ to $B$ and back to $A$), friction does negative work on the way there and negative work on the way back. The net work is strictly non-zero.

**Common Examples of Non-conservative Forces:**

* **Kinetic Friction:** Dissipates mechanical energy into thermal energy.
* **Air Resistance (Drag):** Dissipates mechanical energy into fluid flow and thermal energy.
* **Tension and Applied Forces:** A person pushing a box or a string pulling a mass generally do path-dependent work.

### Summary Comparison

| Property | Conservative Forces | Non-conservative Forces |
| --- | --- | --- |
| **Path Dependence** | Work done is independent of the path. | Work done depends on the path taken. |
| **Closed Path** | Net work done on a closed loop is zero ($\oint \mathbf{F} \cdot d\mathbf{r} = 0$). | Net work done on a closed loop is non-zero. |
| **Energy** | Mechanical energy is conserved; work can be recovered. | Mechanical energy is generally dissipated (e.g., as heat). |
| **Examples** | Gravity, Ideal Springs, Electrostatic force. | Friction, Air drag, Human pushes/pulls. |

The identification of conservative forces is crucial because *only conservative forces can have an associated potential energy function*. The irrecoverable nature of the work done by non-conservative forces means we cannot define a "friction potential energy." This realization guides our mathematical formulation of energy conservation in the sections to come.

## 6.2 Potential Energy

In Section 6.1, we established that conservative forces do work that is strictly independent of the path taken. This unique property allows us to introduce a powerful new concept: **potential energy** ($U$). Potential energy is the energy "stored" in a system due to the spatial arrangement or configuration of its interacting parts. It represents the system's *potential* to do kinetic work.

A crucial conceptual point must be made immediately: **an isolated object cannot possess potential energy**. Potential energy is inherently a property of a *system* of two or more objects interacting via a conservative force (for example, a book and the Earth interacting via gravity, or a block and a spring interacting via elastic forces).

### The Mathematical Definition of Potential Energy

We define the change in potential energy ($\Delta U$) of a system as the *negative* of the work done by the internal conservative force ($W_c$) when the system's configuration changes from an initial state to a final state.

$$ \Delta U = U_f - U_i = -W_c $$

Using the integral definition of work from Chapter 5, for a one-dimensional displacement along the $x$-axis, this relationship becomes:

$$ \Delta U = -\int_{x_i}^{x_f} F_x \, dx $$

> **Why the negative sign?**
> Consider dropping a ball. As the ball falls, the conservative force of gravity does *positive* work on it, increasing its kinetic energy. Concurrently, the system is losing its stored energy. Therefore, positive work done by the conservative force corresponds to a *decrease* in potential energy ($\Delta U < 0$). Conversely, if you lift the ball, gravity does *negative* work, and the system *gains* potential energy ($\Delta U > 0$).

### Gravitational Potential Energy

Let us apply this definition to a system consisting of the Earth and a particle of mass $m$ near the Earth's surface. In this region, the gravitational force is approximately constant, directed downward: $\mathbf{F}_g = -mg \mathbf{\hat{j}}$.

If the particle moves from an initial vertical position $y_i$ to a final position $y_f$, the work done by gravity is:

$$ W_g = \int_{y_i}^{y_f} (-mg) \, dy = -mg(y_f - y_i) $$

Applying our definition of potential energy change ($\Delta U = -W_g$):

$$ \Delta U_g = mg(y_f - y_i) = mgy_f - mgy_i $$

From this, we can define the **gravitational potential energy** function $U_g$ for a mass near the Earth's surface:

$$ U_g = mgy $$

#### The Arbitrary Nature of the Reference Point

Look closely at the definition $\Delta U = -W_c$. Physics is governed by *changes* in potential energy ($\Delta U$), not by absolute values of $U$. This means you are free to choose any convenient vertical level as your reference point where $U_g = 0$ (i.e., where $y = 0$).

```text
       Mass (m) at height y_f
        [ m ]  -------------------------- U_g = mgy_f
          | 
          |  Height change (h)
          |
        [ m ]  -------------------------- U_g = mgy_i (Let's set this as y=0)
       ======= Tabletop (Reference Level)

       ||||||| Floor -------------------- U_g is NEGATIVE relative to tabletop

```

Whether you define $y=0$ at the floor, the tabletop, or the center of the Earth, the *change* in potential energy ($\Delta U_g = mgh$) when moving the mass between two specific heights will remain exactly the same.

### Elastic Potential Energy

Now consider a system consisting of a block attached to an ideal, massless horizontal spring. The spring exerts a conservative restoring force described by Hooke's Law: $F_s = -kx$, where $k$ is the spring constant and $x$ is the displacement from the spring's equilibrium position.

If the block moves from an initial position $x_i$ to a final position $x_f$, the work done by the spring is:

$$ W_s = \int_{x_i}^{x_f} (-kx) \, dx = \left[ -\frac{1}{2}kx^2 \right]_{x_i}^{x_f} = -\frac{1}{2}kx_f^2 + \frac{1}{2}kx_i^2 $$

Applying the definition $\Delta U_s = -W_s$:

$$ \Delta U_s = \frac{1}{2}kx_f^2 - \frac{1}{2}kx_i^2 $$

This allows us to define the **elastic potential energy** function $U_s$:

$$ U_s = \frac{1}{2}kx^2 $$

```text
  Unstretched (Equilibrium)
  |--- \/\/\/\/\/\ --- [ m ]         x = 0  =>  U_s = 0
  |
  | Stretched
  |--- \/\/\/\/\/\/\/\ --- [ m ]     x > 0  =>  U_s = 1/2 kx^2
  |                         |
  |<----------------------->|
             +x

```

Unlike gravitational potential energy, the reference point for elastic potential energy is not arbitrary. The mathematics dictate that $U_s = 0$ naturally occurs at $x = 0$, the un-stretched equilibrium position of the spring. Furthermore, because the displacement $x$ is squared in the formula, the elastic potential energy of a spring is always strictly positive ($U_s \ge 0$), regardless of whether the spring is compressed ($x < 0$) or stretched ($x > 0$).

## 6.3 Conservation of Mechanical Energy

Having established that conservative forces allow us to define potential energy ($U$), we can now combine this concept with kinetic energy ($K$) to formulate one of the most fundamental principles in physics.

We define the **total mechanical energy** ($E_{\text{mech}}$) of a system as the algebraic sum of its kinetic energy and all forms of potential energy present within the system:

$$E_{\text{mech}} = K + U$$

Where $U$ can include gravitational potential energy ($U_g$), elastic potential energy ($U_s$), or any other form of potential energy.

### Deriving the Conservation Principle

Let us consider an isolated system where the *only* forces doing work on the objects within the system are internal conservative forces.

Recall the work-energy theorem from Chapter 5, which states that the net work done on a particle equals its change in kinetic energy:

$$W_{\text{net}} = \Delta K$$

If only conservative forces are doing work, then $W_{\text{net}} = W_c$. From Section 6.2, we know that the work done by a conservative force is equal to the negative change in potential energy:

$$W_c = -\Delta U$$

Substituting this into the work-energy theorem yields:

$$-\Delta U = \Delta K$$

Rearranging the terms gives us:

$$\Delta K + \Delta U = 0$$

This equation states that in our isolated, conservative system, the total change in mechanical energy is zero. We can expand the changes ($\Delta K = K_f - K_i$ and $\Delta U = U_f - U_i$) to write this in its most useful form:

$$(K_f - K_i) + (U_f - U_i) = 0$$

$$K_i + U_i = K_f + U_f$$

$$E_{\text{mech, i}} = E_{\text{mech, f}}$$

> **The Principle of Conservation of Mechanical Energy:**
> In an isolated system where only conservative forces cause energy transfers, the kinetic energy and potential energy can change, but their sum—the total mechanical energy of the system—remains strictly constant.

### Visualizing Energy Transfer: The Bar Chart

Energy bar charts are an excellent way to track the transformation of energy. Consider a ball dropped from rest at a height $h$. We will define the ground as $y=0$ so that $U_g = 0$ there.

```text
State 1: Just dropped (v = 0, max height)
[████████] U_g  (100% Potential)
[        ] K    (0% Kinetic)
[████████] E_mech (Total Energy)

State 2: Halfway down (v > 0, height = h/2)
[████    ] U_g  (50% Potential)
[████    ] K    (50% Kinetic)
[████████] E_mech (Total Energy)

State 3: Just before impact (v = max, height = 0)
[        ] U_g  (0% Potential)
[████████] K    (100% Kinetic)
[████████] E_mech (Total Energy)

```

As the ball falls, gravity does positive work, transferring energy from the gravitational potential "storage" into the kinetic energy of motion. Because gravity is a conservative force, no mechanical energy is "lost" from the system; it is merely transformed.

### Applications of Energy Conservation

The conservation of mechanical energy is a tremendously powerful problem-solving tool. It often allows us to find the speed of an object at a certain position without needing to use kinematics or integrate Newton's laws—especially when the path taken is curved or complex.

#### Example 1: The Roller Coaster

Consider a roller coaster car of mass $m$ starting from rest at the top of a hill of height $H$. Assuming the track is frictionless, the normal force from the track is always perpendicular to the displacement and therefore does zero work. Only the conservative force of gravity does work.

To find the speed $v$ of the car at a lower peak of height $h$:

1. **Define the system:** Car + Earth.
2. **Identify initial and final states:**

* Initial: At height $H$, $v_i = 0$.
* Final: At height $h$, $v_f = v$.

1. **Apply Conservation:**

$$K_i + U_i = K_f + U_f$$

$$0 + mgH = \frac{1}{2}mv^2 + mgh$$

Notice that the mass $m$ cancels out of the equation:

$$gH - gh = \frac{1}{2}v^2$$

$$v = \sqrt{2g(H - h)}$$

The final speed depends *only* on the change in vertical height, regardless of the loops, dips, or curves the track took to get there.

#### Example 2: The Horizontal Spring

Consider a block of mass $m$ on a frictionless horizontal surface attached to an ideal spring with constant $k$. You pull the block to the right a distance $A$ from equilibrium and release it from rest.

1. **Define the system:** Block + Spring.
2. **Initial State:** Stretched to $x = A$, velocity $v = 0$.

$$E_i = K_i + U_{s,i} = 0 + \frac{1}{2}kA^2$$

1. **Final State:** Block passing through equilibrium ($x = 0$), where it will have its maximum speed ($v_{\text{max}}$).

$$E_f = K_f + U_{s,f} = \frac{1}{2}mv_{\text{max}}^2 + 0$$

1. **Apply Conservation:**

$$\frac{1}{2}kA^2 = \frac{1}{2}mv_{\text{max}}^2$$

$$v_{\text{max}} = A\sqrt{\frac{k}{m}}$$

This continuous exchange between kinetic and elastic potential energy forms the basis of Simple Harmonic Motion, which we will explore extensively in Chapter 11.

## 6.4 Work Done by Non-conservative Forces

In Section 6.3, we explored the idealized scenario of an isolated system where only conservative forces do work. Under those strict conditions, the total mechanical energy of the system remains perfectly constant ($E_{\text{mech, i}} = E_{\text{mech, f}}$). However, in the real world, macroscopic systems almost always encounter non-conservative forces such as kinetic friction, fluid drag, or applied pushes and pulls from external agents.

When non-conservative forces are present, mechanical energy is no longer conserved. Instead, it is transferred into or out of the system, or transformed into non-mechanical forms of energy (like thermal energy).

### The Generalized Work-Energy Theorem

To understand how non-conservative forces affect a system, we return to the fundamental Work-Energy Theorem from Chapter 5, which states that the total net work done on a particle equals its change in kinetic energy:

$$W_{\text{net}} = \Delta K$$

We can split the net work into two distinct categories: the work done by conservative forces ($W_c$) and the work done by non-conservative forces ($W_{nc}$).

$$W_c + W_{nc} = \Delta K$$

Recall from Section 6.2 that the work done by a conservative force is equal to the negative change in potential energy ($W_c = -\Delta U$). Substituting this relationship into our equation yields:

$$-\Delta U + W_{nc} = \Delta K$$

Rearranging the terms to isolate the non-conservative work, we get:

$$W_{nc} = \Delta K + \Delta U$$

Since the total mechanical energy is defined as $E_{\text{mech}} = K + U$, the sum of the changes in kinetic and potential energy is exactly the change in total mechanical energy ($\Delta E_{\text{mech}}$). This leads to a profoundly important result:

$$W_{nc} = \Delta E_{\text{mech}}$$

$$W_{nc} = E_{\text{mech, f}} - E_{\text{mech, i}}$$

This equation states that **the work done by all non-conservative forces on a system equals the change in the total mechanical energy of that system.**

* If $W_{nc} > 0$ (e.g., a motor lifting an elevator), the system gains mechanical energy.
* If $W_{nc} < 0$ (e.g., air resistance slowing down a falling leaf), the system loses mechanical energy.
* If $W_{nc} = 0$, we recover the law of conservation of mechanical energy: $\Delta E_{\text{mech}} = 0$.

### Kinetic Friction and Thermal Energy

The most common non-conservative force encountered in mechanics is kinetic friction. Consider a block of mass $m$ sliding a distance $d$ across a rough horizontal floor. The force of kinetic friction ($\mathbf{f}_k$) points in the exact opposite direction of the displacement ($d\mathbf{r}$).

The work done by friction is:

$$W_f = \int \mathbf{f}_k \cdot d\mathbf{r} = -f_k d$$

Because $W_{nc} = \Delta E_{\text{mech}}$, the change in mechanical energy is strictly negative:

$$\Delta E_{\text{mech}} = -f_k d$$

```text
       Velocity (v) --->
       _________________
      |                 |
<---  |     Mass (m)    |
 f_k  |_________________|
================================== Rough Surface
      |------- d -------|

```

Where does this "lost" mechanical energy go? It is not destroyed; rather, it is transformed into **thermal energy** ($E_{\text{th}}$) in the block and the floor, making them slightly warmer. We define the increase in thermal energy as exactly equal to the magnitude of the work done by friction:

$$\Delta E_{\text{th}} = f_k d$$

If we consider a broader, fully closed system that includes the objects and their surrounding environment, we can state the most general form of the Law of Conservation of Energy. Energy can change forms (from kinetic to potential to thermal), but the grand total amount of energy remains constant:

$$\Delta K + \Delta U + \Delta E_{\text{th}} = 0$$

### Modified Energy Bar Charts

When kinetic friction acts on a system, we must account for the mechanical energy that gets dissipated into thermal energy. Consider a block sliding down a rough incline. It starts from rest at height $h$ and reaches the bottom with speed $v$.

```text
State 1: Top of the rough incline (v = 0)
[████████] U_g  (100% Mechanical Energy)
[        ] K    
[        ] E_th 
----------------
[████████] Total System Energy

State 2: Bottom of the rough incline (h = 0)
[        ] U_g  
[█████   ] K    (Less than 100% due to friction)
[███     ] E_th (Energy dissipated by friction)
----------------
[████████] Total System Energy

```

Because of the non-conservative work done by friction, the final kinetic energy at the bottom of the ramp is strictly less than the initial gravitational potential energy at the top.

### Applying the Equation

When solving problems involving non-conservative forces, the expanded energy equation is often the most direct path to the solution.

**Example Strategy: Block on a Rough Ramp**
A block of mass $m$ is released from rest at the top of a rough ramp of length $L$ and height $h$. The coefficient of kinetic friction is $\mu_k$. To find its speed at the bottom:

1. **Identify initial and final states:**

* Initial: $K_i = 0$, $U_i = mgh$.
* Final: $K_f = \frac{1}{2}mv^2$, $U_f = 0$.

1. **Calculate non-conservative work:**

* The normal force is $n = mg \cos\theta$.
* Friction is $f_k = \mu_k n = \mu_k mg \cos\theta$.
* Work done by friction: $W_{nc} = -f_k L = -\mu_k mg L \cos\theta$.

1. **Apply $W_{nc} = \Delta E_{\text{mech}}$:**

$$W_{nc} = (K_f + U_f) - (K_i + U_i)$$

$$-\mu_k mg L \cos\theta = \left(\frac{1}{2}mv^2 + 0\right) - (0 + mgh)$$

1. **Solve for $v$:**

$$mgh - \mu_k mg L \cos\theta = \frac{1}{2}mv^2$$

$$v = \sqrt{2g(h - \mu_k L \cos\theta)}$$

This framework neatly balances the "energy checkbook," allowing us to track exactly how much useful mechanical energy was drained by friction during the motion.

## 6.5 Energy Diagrams and Equilibrium

In our study of energy so far, we have largely relied on algebraic equations to find speeds, positions, and work done. However, for complex systems, equations can become cumbersome. A highly effective, visual alternative is the **energy diagram**—a graph showing the potential energy $U$ of a system as a function of the position $x$ of a particle within that system.

Energy diagrams allow us to determine the permitted regions of motion, identify turning points, and analyze the equilibrium states of the system, all without solving complex differential equations.

### Finding Force from Potential Energy

To understand energy diagrams, we must first establish a mathematical link between potential energy and force. Recall the definition of the change in potential energy in one dimension:

$$ \Delta U = -\int_{x_i}^{x_f} F_x \, dx $$

By taking the derivative of both sides with respect to position, we can invert this relationship. The component of a conservative force acting on an object is equal to the negative of the derivative of the potential energy function with respect to position:

$$ F_x = -\frac{dU}{dx} $$

Graphically, this means **the force acting on the particle is the negative of the slope of the $U(x)$ curve**.

* If the slope is positive (uphill), the force is in the negative $x$-direction (pushing it back downhill).
* If the slope is negative (downhill), the force is in the positive $x$-direction (again, pushing it downhill).
* Nature always "pushes" systems toward lower potential energy.

### Analyzing the Energy Diagram

Consider a particle of mass $m$ moving along the $x$-axis subject to a potential energy $U(x)$. If the system is isolated and only conservative forces act, the total mechanical energy $E$ is constant. On our diagram, $E$ is represented by a horizontal line.

Because total energy is the sum of kinetic and potential energy ($E = K + U$), we can easily visualize the kinetic energy at any point:

$$ K(x) = E - U(x) $$

Kinetic energy is simply the vertical distance between the total energy line $E$ and the potential energy curve $U(x)$.

```text
   U(x)
    ^ 
    |                             (Total Energy, E)
  E |---.---------------------------------.------------
    |   |    Unstable Eq.                 |
    |   |       x_2                       |
    |   |      __*__                      |
    |   |     /     \      Kinetic Energy |
    |   |    /       \          K(x)      |
    |   v   /         \        |--|       v
    |  .-. /           \    __*__        .-. 
    | (TP1)             \  / x_3 \      (TP2)
    |                    \/       \____/
    |
    +---|--------|----------|-------------|-----------> x
       x_1      x_2        x_3           x_4

```

#### Turning Points and Forbidden Regions

Because mass is positive and velocity squared is positive, kinetic energy cannot be negative ($K \ge 0$). Therefore, the particle can only exist in regions where the total energy line is at or above the potential energy curve ($E \ge U(x)$).

Points where the $E$ line intersects the $U(x)$ curve (like $x_1$ and $x_4$ in the diagram above) are called **turning points**. At a turning point:

1. $U(x) = E$
2. $K(x) = 0$ (the particle comes to a momentary halt)
3. The force (negative slope) causes the particle to reverse its direction, "turning" it around.

Regions where $U(x) > E$ are classically *forbidden regions*. The particle does not have enough total energy to enter these spaces.

### Types of Equilibrium

An object is in **static equilibrium** if the net force acting on it is zero. On an energy diagram, $F_x = 0$ wherever the slope of the $U(x)$ curve is zero ($dU/dx = 0$). These are the local maxima, local minima, and flat regions of the curve.

We classify equilibrium into three distinct types based on what happens if the particle is slightly displaced from its equilibrium position.

1. **Stable Equilibrium (Local Minima):**
Look at point $x_3$ in the diagram. It is at the bottom of a potential energy "valley." If the particle is displaced slightly to the right, the slope becomes positive, resulting in a force to the left. If displaced slightly to the left, the slope is negative, resulting in a force to the right. In both cases, the force acts as a *restoring force*, pushing the particle back toward $x_3$.

* *Mathematical condition:* $\frac{dU}{dx} = 0$ and $\frac{d^2U}{dx^2} > 0$
* *Analogy:* A marble resting at the bottom of a bowl.

1. **Unstable Equilibrium (Local Maxima):**
Look at point $x_2$. It is at the top of a potential energy "hill." If the particle is exactly at $x_2$, the net force is zero. However, if it is displaced even slightly to the right, the slope is negative, and the force pushes it further to the right—away from equilibrium. A slight displacement left results in a force pushing further left.

* *Mathematical condition:* $\frac{dU}{dx} = 0$ and $\frac{d^2U}{dx^2} < 0$
* *Analogy:* A marble balanced perfectly on top of an upside-down bowl.

1. **Neutral Equilibrium (Flat Regions):**
If the $U(x)$ curve is perfectly horizontal over a region, the slope is continuously zero. A particle displaced slightly within this region will experience no force and will simply remain at its new position.

* *Mathematical condition:* $\frac{dU}{dx} = 0$ and $\frac{d^2U}{dx^2} = 0$
* *Analogy:* A marble resting on a flat, horizontal table.

---

### Chapter Summary

* **Conservative Forces:** A force is conservative if the work it does on an object is independent of the path taken, or equivalently, if the net work done along any closed path is zero ($\oint \mathbf{F}_c \cdot d\mathbf{r} = 0$). Examples include gravity and ideal springs.
* **Potential Energy ($U$):** Energy associated with the configuration of a system of objects interacting via a conservative force. The change in potential energy is defined as the negative of the work done by the conservative force: $\Delta U = -W_c$.
* *Gravitational Potential Energy:* $U_g = mgy$ (near Earth's surface).
* *Elastic Potential Energy:* $U_s = \frac{1}{2}kx^2$.

* **Conservation of Mechanical Energy:** In an isolated system where only conservative forces do work, the total mechanical energy ($E_{\text{mech}} = K + U$) remains constant. $K_i + U_i = K_f + U_f$.
* **Non-conservative Forces:** Forces like friction and drag where the work done depends on the path. The work done by non-conservative forces equals the change in the total mechanical energy of the system: $W_{nc} = \Delta E_{\text{mech}}$. This often involves the conversion of mechanical energy into thermal energy ($\Delta E_{\text{th}} = f_k d$).
* **Energy Diagrams:** A graph of potential energy vs. position.
* Force is the negative slope of the curve: $F_x = -\frac{dU}{dx}$.
* Kinetic energy is the difference between total energy and potential energy: $K = E - U$.
* Equilibrium points occur where the slope is zero. They can be stable (local minima), unstable (local maxima), or neutral (flat regions).
