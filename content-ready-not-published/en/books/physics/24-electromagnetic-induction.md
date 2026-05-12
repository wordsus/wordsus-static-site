In earlier chapters, we learned that electric currents create magnetic fields. But can a magnetic field produce an electric current? In the 1830s, Michael Faraday and Joseph Henry discovered the answer: yes, but only if the magnetic environment is *changing*. This phenomenon, known as electromagnetic induction, is the foundational principle behind the generators and transformers that power our modern world. In this chapter, we will explore the laws governing induction, understand the origins of motional EMF, and discover how a changing magnetic flux gives rise to induced electric fields and the concept of inductance in electrical circuits.

## 24.1 Faraday's Law of Induction

In the preceding chapters, we established that electric currents and moving charges act as sources of magnetic fields. In 1831, Michael Faraday in England and Joseph Henry in the United States independently discovered the converse phenomenon: magnetic fields can be used to produce electric currents. However, they observed that a *steady* magnetic field does not induce a current in a stationary circuit. An electric current is only induced when the magnetic environment surrounding the circuit is *changing*.

This phenomenon is known as **electromagnetic induction**, and the current produced is called an **induced current**. The corresponding electromotive force required to drive this current is called an **induced EMF** ($\mathcal{E}$).

### Magnetic Flux

To formulate a quantitative law for electromagnetic induction, we must first define the concept of **magnetic flux** ($\Phi_B$). Analogous to the electric flux discussed in Section 19.1, magnetic flux represents the number of magnetic field lines passing through a given surface area.

Consider a surface area divided into infinitesimal elements $d\mathbf{A}$, where the vector direction of $d\mathbf{A}$ is normal (perpendicular) to the surface. If the magnetic field in that region is $\mathbf{B}$, the magnetic flux through the surface is defined by the surface integral:

$$ \Phi_B = \int \mathbf{B} \cdot d\mathbf{A} $$

If the magnetic field $\mathbf{B}$ is uniform over a flat surface of area $A$, the integral simplifies to the scalar (dot) product:

$$ \Phi_B = \mathbf{B} \cdot \mathbf{A} = B A \cos \theta $$

Here, $\theta$ is the angle between the magnetic field vector $\mathbf{B}$ and the normal vector $\mathbf{A}$.

The SI unit of magnetic flux is the **weber** (Wb), named after German physicist Wilhelm Eduard Weber. From the equation above, we can see that $1 \text{ Wb} = 1 \text{ T} \cdot \text{m}^2$.

### Faraday's Law

Faraday's foundational insight was that the magnitude of the induced EMF in a conductive loop is directly proportional to the rate at which the magnetic flux through the loop changes with time. This observation is formalized as **Faraday's Law of Induction**:

$$ \mathcal{E} = - \frac{d\Phi_B}{dt} $$

The negative sign in this equation is of profound physical significance. It indicates the *direction* of the induced EMF and the resulting induced current, a concept governed by **Lenz's Law** (which will be explored in detail in Section 24.3). In short, the negative sign signifies that the induced EMF creates a current whose own magnetic field opposes the original change in magnetic flux.

If the circuit is a coil consisting of $N$ tightly wound identical turns, the magnetic flux links all the turns. The total induced EMF is the sum of the EMFs induced in each individual turn:

$$ \mathcal{E} = - N \frac{d\Phi_B}{dt} $$

### Methods of Inducing an EMF

Because magnetic flux is determined by the equation $\Phi_B = B A \cos \theta$, Faraday's law reveals that an EMF can be induced in a loop by changing any of these three variables over time:

1. **Changing the magnitude of the magnetic field ($B$):** Moving a permanent magnet toward or away from a stationary coil, or changing the current in a nearby electromagnet.
2. **Changing the area of the loop ($A$):** Mechanically expanding, shrinking, or deforming a flexible loop within a steady magnetic field.
3. **Changing the angle ($\theta$):** Rotating the loop within a constant magnetic field, which is the foundational operating principle of electrical generators.

```text
       MOTION OF MAGNET
         (Changes B)
        ----------->               
                                   
      -------.                     
     |   N   |  ))))        _.-=-._    
     |       |  ))))      .'       '.  
     |   S   |  ))))     /           \ 
      -------'          |    Coil     | ---> Induced Current (I)
         |               \           /     Measured by Galvanometer
    Bar Magnet            '._     _.'  
                            '-=-'      

```

*Figure 24.1: A classic demonstration of Faraday's Law. As the north pole of the magnet is pushed toward the coil, the magnetic flux through the coil increases, inducing an EMF and a measurable current. If the magnet is held stationary, the flux is constant ($d\Phi_B/dt = 0$), and the induced current drops to zero.*

### The Universal Nature of Faraday's Law

It is crucial to recognize that the loop of wire itself is merely a detector of the induced EMF. The true physical implication of Faraday's Law is that a changing magnetic field induces an electric field in the surrounding space, regardless of whether a physical conductor is present to carry a current. This generalized concept of induced electric fields connects directly to Maxwell's equations, which form the bedrock of classical electromagnetism.

## 24.2 Motional EMF

In Section 24.1, we saw that a changing magnetic flux induces an EMF in a stationary loop. However, an EMF can also be induced when a conductor moves through a steady magnetic field. This specific type of induced electromotive force is called **motional EMF**.

To understand the origin of motional EMF, we can rely on the principles of magnetic force developed in Chapter 22, specifically the Lorentz force on moving charges, rather than immediately invoking Faraday's Law.

### A Conducting Rod in a Magnetic Field

Consider a straight conducting rod of length $L$ moving with a constant velocity $\mathbf{v}$ through a uniform magnetic field $\mathbf{B}$ that is directed into the page, perpendicular to the rod's motion.

Because the rod is a conductor, it contains free electrons. As the rod moves, these electrons move along with it and therefore experience a magnetic force given by:

$$ \mathbf{F}_B = q(\mathbf{v} \times \mathbf{B}) $$

Using the right-hand rule for a positive charge moving to the right in a magnetic field directed into the page, the force is directed upward. However, since electrons carry a negative charge, the magnetic force pushes them *downward* toward the bottom end of the rod.

As electrons accumulate at the bottom, they leave a net positive charge at the top. This separation of charge creates an internal electric field $\mathbf{E}$ directed from the positive top to the negative bottom. This electric field exerts a downward electric force ($\mathbf{F}_E = q\mathbf{E}$) on the remaining free electrons, which directly opposes the magnetic force.

The charge continues to separate until equilibrium is reached, where the downward electric force exactly balances the upward magnetic force:

$$ |q|E = |q|vB $$

$$ E = vB $$

Because the electric field is uniform along the length of the rod, the potential difference (EMF) across the ends of the rod is $\Delta V = EL$. Substituting $E = vB$, we find the magnitude of the motional EMF:

$$ \mathcal{E} = vBL $$

This equation holds true as long as the velocity, the magnetic field, and the length of the rod are mutually perpendicular. As long as the rod moves, this potential difference is maintained, making the rod act like a battery.

### Motional EMF in a Complete Circuit

Now, let us place the moving rod on a pair of stationary, frictionless conducting rails connected by a resistor with resistance $R$. This creates a closed electrical circuit.

```text
       x      x      x      x      x      x      x
                         Magnetic Field B (into page)
       .----------------------------------.
       |                                  |
       |                                  |
       \                                  O
     R /                                  | v
       \                                  | --->
       |                                  O
       |                                  |
       '----------------------------------'
       x      x      x      x      x      x      x
       |<-------------- x --------------->|

```

*Figure 24.2: A conducting rod of length L slides on conducting rails with velocity v. A uniform magnetic field B is directed into the page. The motion changes the area of the loop, inducing an EMF.*

Because there is an EMF across the moving rod, a current $I$ will flow through the circuit. According to Ohm's Law, the magnitude of this induced current is:

$$ I = \frac{\mathcal{E}}{R} = \frac{vBL}{R} $$

We can also derive this exact result using Faraday's Law of Induction. The circuit forms a rectangular loop of area $A = Lx$, where $x$ is the horizontal position of the rod. The magnetic flux through this loop is:

$$ \Phi_B = BA = B(Lx) $$

As the rod moves to the right, $x$ increases, meaning the flux through the loop is increasing. According to Faraday's Law, the magnitude of the induced EMF is the rate of change of the magnetic flux:

$$ |\mathcal{E}| = \left| \frac{d\Phi_B}{dt} \right| = \frac{d}{dt} (BLx) $$

Since $B$ and $L$ are constant, we can pull them out of the derivative. The rate of change of position, $dx/dt$, is simply the velocity $v$ of the rod:

$$ |\mathcal{E}| = BL \frac{dx}{dt} = vBL $$

This perfectly matches the result derived from the Lorentz force. Faraday's Law and the magnetic force on moving charges are beautifully consistent frameworks for understanding motional EMF.

### Energy Conservation in Motional EMF

When the induced current $I$ flows through the sliding rod, the rod becomes a current-carrying conductor in a magnetic field. Consequently, it experiences a magnetic force $\mathbf{F}_{\text{mag}}$.

Using the right-hand rule, we find that the induced current flows counterclockwise (upward through the rod). A rod carrying an upward current in a magnetic field directed into the page experiences a magnetic force directed to the *left*, opposing the rod's motion:

$$ F_{\text{mag}} = ILB $$

To keep the rod moving to the right at a constant velocity, an external agent (like a hand pulling the rod) must apply an external force $F_{\text{app}}$ to the right, equal in magnitude to $F_{\text{mag}}$:

$$ F_{\text{app}} = F_{\text{mag}} = ILB = \left( \frac{vBL}{R} \right) LB = \frac{vB^2L^2}{R} $$

The external agent is doing mechanical work on the system. The rate at which this work is done is the mechanical power input, $P_{\text{mech}}$:

$$ P_{\text{mech}} = F_{\text{app}} v = \left( \frac{vB^2L^2}{R} \right) v = \frac{v^2B^2L^2}{R} $$

Simultaneously, the induced current dissipates electrical energy in the resistor as heat (Joule heating). The electrical power dissipated, $P_{\text{elec}}$, is:

$$ P_{\text{elec}} = I^2 R = \left( \frac{vBL}{R} \right)^2 R = \frac{v^2B^2L^2}{R} $$

Notice that $P_{\text{mech}} = P_{\text{elec}}$. The mechanical work done by the external agent is entirely converted into electrical energy, which is then dissipated as thermal energy in the resistor. This demonstrates that electromagnetic induction is governed by the universal principle of the conservation of energy.

## 24.3 Lenz's Law

In Section 24.1, we introduced Faraday's Law of Induction, $\mathcal{E} = - d\Phi_B/dt$. We noted that the negative sign is of profound physical significance. In 1834, shortly after Faraday's initial discovery, the Russian physicist Heinrich Lenz formulated a rule that elegantly explains this negative sign and provides a reliable method for determining the direction of an induced current.

**Lenz's Law** states that the induced current in a closed conducting loop will flow in such a direction that the magnetic field it produces *opposes the change* in magnetic flux that originally produced it.

It is absolutely vital to emphasize the word *change*. The induced magnetic field does not necessarily oppose the original magnetic field itself; rather, it opposes the *variation* (increase or decrease) of the flux.

### Understanding "Opposition to Change"

To apply Lenz's Law correctly, it is helpful to think of a conducting loop as a system that inherently resists any alteration to its current magnetic state. We can break this behavior down into two primary scenarios:

1. **Increasing Magnetic Flux:** If the magnetic flux through a loop is increasing, the loop attempts to reduce it. It does this by inducing a current whose own magnetic field ($\mathbf{B}_{\text{ind}}$) points in the *opposite* direction to the external, changing magnetic field ($\mathbf{B}_{\text{ext}}$).
2. **Decreasing Magnetic Flux:** If the magnetic flux through a loop is decreasing, the loop attempts to maintain it. It does this by inducing a current whose magnetic field ($\mathbf{B}_{\text{ind}}$) points in the *same* direction as the external magnetic field ($\mathbf{B}_{\text{ext}}$).

### A Systematic Approach

Determining the direction of an induced current can sometimes be counterintuitive. By following a strict four-step procedure, you can confidently apply Lenz's Law to any problem:

1. **Identify $\mathbf{B}_{\text{ext}}$:** Determine the direction of the external magnetic field penetrating the loop.
2. **Assess the Change:** Determine whether the magnetic flux ($\Phi_B$) through the loop is *increasing* or *decreasing*.
3. **Determine $\mathbf{B}_{\text{ind}}$:**

* If flux is *increasing*, $\mathbf{B}_{\text{ind}}$ must point opposite to $\mathbf{B}_{\text{ext}}$.
* If flux is *decreasing*, $\mathbf{B}_{\text{ind}}$ must point in the same direction as $\mathbf{B}_{\text{ext}}$.

1. **Apply the Right-Hand Rule:** Point the thumb of your right hand in the direction of the induced magnetic field ($\mathbf{B}_{\text{ind}}$). Your fingers will naturally curl in the direction of the induced current ($I_{\text{ind}}$).

```text
       SCENARIO A: Magnet approaching loop      SCENARIO B: Magnet receding from loop
       (Flux is INCREASING)                     (Flux is DECREASING)
                                           
          S               N                        S               N
       -------         -------                  -------         -------
      |   S   | ----->|   N   |                |   S   | <-----|   N   |
       -------         -------                  -------         -------
         Velocity (v)                             Velocity (v)
                                           
        B_ext points RIGHT                        B_ext points RIGHT
        B_ind must point LEFT                     B_ind must point RIGHT
                                           
              .--- -> ---.                              .--- <- ---.
             /     I      \                            /     I      \
            |      ^       |                          |      v       |
            |   (B_ind)    |                          |   (B_ind)    |
            |    <---      |                          |    --->      |
             \            /                            \            /
              '--- <- ---'                              '--- -> ---'
          Induced Current (I)                       Induced Current (I)
           (Counter-clockwise                        (Clockwise from 
           from right view)                           right view)

```

*Figure 24.3: Application of Lenz's Law. In Scenario A, the approaching North pole increases rightward flux. The loop induces a leftward field to oppose this, requiring a counter-clockwise current. In Scenario B, the receding North pole decreases rightward flux. The loop induces a rightward field to "replace" the lost flux, requiring a clockwise current.*

### Lenz's Law and the Conservation of Energy

Lenz's Law is not merely a convenient rule of thumb for finding vectors; it is a direct and necessary consequence of the universal law of **Conservation of Energy**.

Consider what would happen if Lenz's Law were reversed—if the induced current produced a magnetic field that *aided* the change in flux. In Figure 24.3 (Scenario A), an approaching North pole would induce a current that created a *South* pole on the near side of the loop. This South pole would attract the approaching magnet, pulling it in even faster.

As the magnet accelerated, the rate of change of flux would increase, inducing an even larger current, which would produce a stronger South pole, causing even greater acceleration. The magnet's kinetic energy and the electrical energy in the loop would increase infinitely, without any external work being done. This is a clear violation of the conservation of energy.

Because energy must be conserved, the induced current must create a magnetic field that repels the approaching magnet (by forming a North pole on the near side). The external agent pushing the magnet must do mechanical work against this repulsive magnetic force. It is this mechanical work that is converted into the electrical energy of the induced current, perfectly mirroring the energy transfer we calculated for motional EMF in Section 24.2.

## 24.4 Induced Electric Fields

Up to this point in our discussion of Faraday's Law, we have focused on the induced EMF and current within a physical conducting loop, such as a wire. However, a profound shift in our understanding of electromagnetism occurs when we ask a simple question: What happens if we remove the conducting wire, but keep the changing magnetic field?

The answer is that the underlying physical reality remains. The changing magnetic field does not just affect the electrons within a wire; it fundamentally alters the surrounding space itself.

### The General Form of Faraday's Law

When an induced current $I$ flows in a conducting ring, there must be a force driving those conduction electrons around the loop. We know that the force capable of doing work on a stationary or slowly moving charge is an electric force ($\mathbf{F}_E = q\mathbf{E}$). Therefore, an induced EMF ($\mathcal{E}$) directly implies the existence of an **induced electric field** ($\mathbf{E}$).

The work $W$ done by this electric field in moving a test charge $q_0$ once around the loop is given by:

$$ W = q_0 \mathcal{E} $$

Alternatively, we can express this work as the line integral of the electric force over the closed circular path:

$$ W = \oint \mathbf{F}_E \cdot d\mathbf{s} = q_0 \oint \mathbf{E} \cdot d\mathbf{s} $$

Equating these two expressions for work and dividing by $q_0$, we obtain the relationship between the induced EMF and the induced electric field:

$$ \mathcal{E} = \oint \mathbf{E} \cdot d\mathbf{s} $$

We can now substitute this result into our original formulation of Faraday's Law ($\mathcal{E} = -d\Phi_B/dt$) to yield a more general and fundamental form:

$$ \oint \mathbf{E} \cdot d\mathbf{s} = - \frac{d\Phi_B}{dt} $$

This equation is one of the four pillars of classical electromagnetism, known collectively as Maxwell's equations. It states that a changing magnetic flux induces an electric field that circulates around the region of the changing flux. This is true whether there is a physical conductor present in that space or if it is a complete vacuum.

### Properties of the Induced Electric Field

To visualize this phenomenon, consider a cylindrical region of space containing a uniform magnetic field $\mathbf{B}$ directed into the page. Suppose the magnitude of this field is increasing at a steady rate ($dB/dt > 0$).

```text
       x      x      x      x      x
          . - ~ ~ ~ - . 
       x /      E      \ x    B_ext (increasing, into page)
        |       ^       |     
       x|       |       |x    E-field is counterclockwise
        |       <--+    |     (opposing the increase)
       x \             / x
          ` - _ _ _ - '  
       x      x      x      x      x

```

*Figure 24.4: A uniform magnetic field directed into the page is confined to a cylindrical region. As the magnetic field increases, an induced electric field is created. The electric field lines form closed, concentric circles.*

According to Lenz's Law, an imaginary conducting ring placed in this region would develop a counterclockwise current to oppose the increasing inward flux. Therefore, the induced electric field $\mathbf{E}$ that drives this hypothetical current must also form closed, counterclockwise circular loops.

This reveals a critical distinction between the electric fields we studied in electrostatics (Chapters 18-20) and the electric fields induced by changing magnetic flux:

1. **Electrostatic Fields:** Created by stationary electric charges. The field lines begin on positive charges and end on negative charges. Because the electrostatic force is conservative, the work done moving a charge around *any* closed path is exactly zero ($\oint \mathbf{E}_{\text{static}} \cdot d\mathbf{s} = 0$). Consequently, we can define a scalar electric potential $V$.
2. **Induced Electric Fields:** Created by changing magnetic fields. The field lines form continuous, closed loops with no beginning or end. Because the line integral over a closed path is non-zero ($\oint \mathbf{E}_{\text{ind}} \cdot d\mathbf{s} \neq 0$), the induced electric field is **non-conservative**.

Because the work done by an induced electric field on a charge moving around a closed path is not zero, the concept of electric potential energy—and therefore electric potential ($V$)—lacks meaning for an induced electric field. If a charge completes a full loop in Figure 24.4, it gains energy continuously; it does not return to its original potential state.

This principle is exploited practically in the **betatron**, a type of particle accelerator. Instead of using a static potential difference to accelerate electrons, a betatron uses a rapidly varying magnetic field to induce a strong, circular electric field in a vacuum chamber, accelerating electrons to immense speeds as they orbit.

## 24.5 Inductance and RL Circuits

In the previous sections, we saw how a changing magnetic flux from an external source or mechanical motion induces an EMF in a circuit. We now consider a phenomenon where a circuit induces an EMF upon *itself* simply by having a changing current.

### Self-Inductance

Consider an isolated circuit consisting of a battery, a switch, and a coil of wire. When the switch is closed, the current does not instantaneously jump to its maximum value. As the current $I$ begins to increase, it generates a growing magnetic field $\mathbf{B}$ within the coil. This increasing magnetic field causes an increasing magnetic flux through the coil itself.

According to Faraday's Law, this increasing flux induces an EMF in the coil. By Lenz's Law, this induced EMF must oppose the change that created it—meaning it opposes the *increase* in current. It acts like a temporary, backwards-facing battery, often referred to as a **back-EMF**.

Because the magnetic field produced by the coil is directly proportional to the current ($B \propto I$), the total magnetic flux linking the $N$ turns of the coil is also proportional to the current:

$$ N\Phi_B = LI $$

The proportionality constant $L$ is called the **self-inductance** (or simply **inductance**) of the coil. It depends entirely on the geometric properties of the coil (size, shape, number of turns) and the magnetic properties of the core material.

Using Faraday's Law, we can express the induced back-EMF ($\mathcal{E}_L$) in terms of the rate of change of the current:

$$ \mathcal{E}_L = - \frac{d(N\Phi_B)}{dt} = -L \frac{dI}{dt} $$

The SI unit of inductance is the **henry** (H), named after Joseph Henry. From the equation above, $1 \text{ H} = 1 \text{ V}\cdot\text{s}/\text{A}$. A circuit element designed specifically to have a known inductance is called an **inductor**, commonly represented in circuit diagrams by a coiled wire symbol.

### Inductance of a Solenoid

To find the inductance of a specific geometry, we can use $L = N\Phi_B / I$. Consider a long solenoid of length $l$, cross-sectional area $A$, and a total of $N$ turns. The magnetic field inside an ideal solenoid is uniform and given by $B = \mu_0 n I$, where $n = N/l$ is the number of turns per unit length.

The magnetic flux through one turn is $\Phi_B = BA = \mu_0 (N/l) I A$. Therefore, the total inductance is:

$$ L = \frac{N \Phi_B}{I} = \frac{N (\mu_0 (N/l) I A)}{I} = \frac{\mu_0 N^2 A}{l} $$

Since the volume of the solenoid core is $V = Al$, we can also write $L = \mu_0 n^2 V$. Notice that the current $I$ has canceled out; the inductance depends strictly on the physical dimensions of the solenoid.

### RL Circuits

A circuit that contains a resistor $R$ and an inductor $L$ in series with a voltage source is called an **RL circuit**. Because the inductor opposes any change in current, the current in an RL circuit cannot change instantaneously.

```text
               Switch (S)
         .-------o  o-------.
         |                  |
        ---                 |
       | + |  Battery      ===  Inductor
       | - |  (EMF)        | |    (L)
        ---                ===
         |                  |
         |                  |
         '------\/\/\-------'
               Resistor 
                 (R)

```

*Figure 24.5: A simple RL circuit. When the switch is closed, the inductor opposes the sudden rise in current, causing the current to grow gradually rather than instantly.*

**Current Growth:**
Suppose the switch in Figure 24.5 is closed at time $t = 0$. Applying Kirchhoff's loop rule clockwise around the circuit gives:

$$ \mathcal{E} - IR - L\frac{dI}{dt} = 0 $$

This is a first-order differential equation for the current $I(t)$. Solving this equation with the initial condition $I(0) = 0$ yields:

$$ I(t) = \frac{\mathcal{E}}{R} \left( 1 - e^{-Rt/L} \right) $$

We define the **inductive time constant** $\tau = L/R$. This represents the time required for the current to reach approximately 63.2% of its maximum, steady-state value ($\mathcal{E}/R$).

* At $t = 0$, $I = 0$. An ideal inductor initially acts like an open circuit, completely blocking the current flow.
* As $t \to \infty$, $dI/dt \to 0$, the back-EMF disappears, and $I \to \mathcal{E}/R$. The inductor acts like an ordinary wire with zero resistance.

**Current Decay:**
If the circuit is suddenly altered to bypass the battery but keep the inductor and resistor connected in a closed loop, the current will not instantly drop to zero. The inductor opposes the *decrease* in current by inducing a forward EMF. The loop equation becomes $0 - IR - L\frac{dI}{dt} = 0$, and the solution is an exponential decay:

$$ I(t) = I_0 e^{-Rt/L} $$

where $I_0$ is the initial current in the circuit before the battery was removed.

### Energy Stored in a Magnetic Field

When an inductor prevents a current from rising instantly, the battery must do work against the induced back-EMF to establish the current. This work is not lost as heat (like in a resistor); rather, it is stored as potential energy in the magnetic field of the inductor, analogous to how a capacitor stores energy in an electric field.

The rate at which the battery does work against the inductor is the power $P$:

$$ P = \frac{dW}{dt} = I |\mathcal{E}_L| = I \left( L \frac{dI}{dt} \right) $$

To find the total energy $U_B$ stored in the inductor when a steady current $I$ is established, we integrate the work $dW = L I \, dI$ from zero to the final current $I$:

$$ U_B = \int_{0}^{I} L I' \, dI' = \frac{1}{2} L I^2 $$

This energy is recovered when the current decreases to zero, which is why an RL circuit can maintain a decaying current even after the main power source is removed.

## Chapter Summary

* **Faraday's Law of Induction:** A changing magnetic flux $\Phi_B$ through a loop induces an electromotive force (EMF). The magnitude of the induced EMF is given by $\mathcal{E} = -d\Phi_B/dt$. Magnetic flux is defined as $\Phi_B = \int \mathbf{B} \cdot d\mathbf{A}$.
* **Motional EMF:** A conductor of length $L$ moving with velocity $v$ perpendicularly through a steady magnetic field $B$ experiences an induced EMF of $\mathcal{E} = vBL$, as a direct consequence of the magnetic Lorentz force on charge carriers.
* **Lenz's Law:** The negative sign in Faraday's Law indicates that the induced current will flow in a direction that produces a magnetic field opposing the *change* in magnetic flux. This is a manifestation of the conservation of energy.
* **Induced Electric Fields:** A changing magnetic field induces a non-conservative electric field in space, governed by the generalized equation $\oint \mathbf{E} \cdot d\mathbf{s} = -d\Phi_B/dt$. This field forms closed continuous loops.
* **Inductance:** The generation of an induced EMF in a circuit due to a change in its own current is called self-induction. The back-EMF is $\mathcal{E}_L = -L(dI/dt)$, where $L$ is the inductance.
* **RL Circuits:** Circuits containing a resistor and an inductor experience exponential growth or decay of current, governed by the time constant $\tau = L/R$. An inductor stores energy in its magnetic field given by $U_B = \frac{1}{2}LI^2$.
