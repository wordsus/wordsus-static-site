In our study of electromagnetism thus far, we have focused on electrostatics—the behavior of electric charges at rest. We now shift our attention to electric charges in motion. This continuous flow of charge, known as electric current, is the foundation of almost all modern technology. In this chapter, we explore the microscopic origins of current and how materials resist this flow, culminating in Ohm's Law. We will examine electrical power and develop systematic techniques, including Kirchhoff's rules, to analyze complex networks of resistors. Finally, we will investigate time-dependent behavior in circuits containing both resistors and capacitors.

## 21.1 Electric Current and Drift Velocity

In our study of electrostatics, we analyzed charges that were at rest. When electric charges are set in motion, their flow constitutes an **electric current**. While current can exist in various media—such as ions moving in a liquid or gas—we will primarily focus on the flow of electrons through solid conductors, such as metal wires.

### Electric Current

Electric current is defined as the rate at which electric charge flows through a surface. Consider a wire with cross-sectional area $A$. If an amount of charge $\Delta Q$ passes through this area in a time interval $\Delta t$, the **average electric current** $I_{avg}$ is:

$$I_{avg} = \frac{\Delta Q}{\Delta t}$$

If the rate of flow varies with time, we define the **instantaneous electric current** $I$ as the limit of the average current as $\Delta t$ approaches zero:

$$I = \frac{dQ}{dt}$$

The SI unit of current is the **ampere** (A), named after the French physicist André-Marie Ampère. From the definition of current, one ampere is equal to one coulomb of charge passing through a surface per second:

$$1 \text{ A} = 1 \text{ C/s}$$

#### The Direction of Current

By historical convention, established long before the discovery of the electron, the direction of electric current is defined as the direction in which **positive** charges would flow. This is known as the *conventional current*.

In a typical metal conductor, the positive charges (the atomic nuclei) are fixed in a crystal lattice and cannot move. The charge carriers that actually flow are the negatively charged conduction electrons. Because electrons have a negative charge, their physical motion is exactly opposite to the direction of the conventional current.

```text
       Electric Field (E)
  ---------------------------->
  
  (+) -- v_d -->   Conventional Current (I)
                   Direction of positive charge flow
                   
  (-) <-- v_d --   Actual Electron Flow
                   Direction of negative charge flow

```

Whenever an electric field $\vec{E}$ is established within a conductor, the conventional current $I$ points in the same direction as $\vec{E}$, even though the electrons are moving in the opposite direction, $-\vec{E}$.

### A Microscopic View: Drift Velocity

To understand how charge flows through a material, we must look at the microscopic behavior of the charge carriers. In a metal, conduction electrons behave somewhat like a gas. When no electric field is present, these electrons move randomly at very high speeds (on the order of $10^6 \text{ m/s}$ due to thermal energy), constantly colliding with the fixed atoms of the lattice. Because this motion is entirely random, there is no net displacement of charge in any direction, and therefore the macroscopic current is zero.

When a battery or another power source establishes an electric field $\vec{E}$ inside the wire, the electrons experience an electric force $\vec{F}_e = -e\vec{E}$. This force causes them to accelerate in the direction opposite to the field. However, this acceleration is repeatedly interrupted by collisions with the lattice.

The result is a superimposed, very slow net motion opposite to the electric field. The average velocity of this net motion is called the **drift velocity** ($\vec{v}_d$).

Despite the high thermal speed of the electrons, the drift velocity is remarkably slow—often on the order of $10^{-4} \text{ m/s}$ (a fraction of a millimeter per second). When you flip a light switch, the light turns on almost instantaneously not because an electron traveled from the switch to the bulb at the speed of light, but because the electric field propagates through the wire at nearly the speed of light, initiating the slow drift of electrons everywhere in the circuit simultaneously.

### Relating Current to Drift Velocity

We can derive a direct mathematical relationship between the macroscopic current $I$ and the microscopic drift velocity $v_d$.

Consider a straight segment of wire with cross-sectional area $A$. Let $n$ represent the **number density** of the charge carriers (the number of mobile charge carriers per unit volume).

```text
        Area = A
     |------------|
     |            | ---> v_d
     |            |
     |------------|
      <--  Δx  -->
       Δx = v_d Δt

```

In a time interval $\Delta t$, the charge carriers move a distance $\Delta x = v_d \Delta t$. All the charge carriers within the cylindrical volume $V = A \Delta x$ will pass through the cross-sectional area at the right end of the segment during this time.

The number of charge carriers in this volume is the number density multiplied by the volume:

$$N = n V = n (A \Delta x) = n A v_d \Delta t$$

If each carrier has a charge $q$, the total charge $\Delta Q$ that passes through the area is:

$$\Delta Q = N q = (n A v_d \Delta t) q$$

Dividing both sides by $\Delta t$ gives us the rate of charge flow, which is the current $I$:

$$I = \frac{\Delta Q}{\Delta t} = n q A v_d$$

For a metal where the charge carriers are electrons, the magnitude of the charge is $q = e = 1.60 \times 10^{-19} \text{ C}$, yielding:

$$I = n e A v_d$$

### Current Density

Current is a scalar quantity, but in some situations—especially when dealing with non-uniform charge flow—it is more useful to define a vector quantity that describes the flow of charge at a specific point in space. This quantity is the **current density** ($\vec{J}$).

For a uniform current distributed evenly across a cross-sectional area $A$, the magnitude of the current density is the current per unit area:

$$J = \frac{I}{A}$$

The SI unit of current density is amperes per square meter ($\text{A/m}^2$).

Substituting our microscopic expression for current ($I = n q A v_d$) into the definition of current density, we obtain:

$$J = \frac{n q A v_d}{A} = n q v_d$$

Because current density is a vector, it is defined to point in the direction of the velocity of positive charge carriers. Thus, we can write it in vector form as:

$$\vec{J} = n q \vec{v}_d$$

If the charge carriers are negative (like electrons), $q$ is negative, which correctly mathematically aligns the vector $\vec{J}$ opposite to the electron's drift velocity $\vec{v}_d$. Regardless of the sign of the moving charges, $\vec{J}$ always points in the direction of the electric field $\vec{E}$ driving the current.

## 21.2 Resistance, Resistivity, and Ohm's Law

When an electric field is established in a conductor, the resulting current depends not only on the strength of the field (or the applied voltage) but also on the properties of the conductor itself. Different materials, and even different shapes of the same material, offer varying degrees of opposition to the flow of charge.

### Resistance

If we apply a potential difference $V$ across a conductor and measure the resulting current $I$, we define the macroscopic **resistance** ($R$) of that conductor as the ratio of the potential difference to the current:

$$R = \frac{V}{I}$$

Resistance is a measure of how much a specific object restricts the flow of electric current. The SI unit of resistance is the **ohm** (Ω), named in honor of Georg Simon Ohm. Based on the defining equation, one ohm is equal to one volt per ampere:

1 Ω = 1 V / 1 A

In a circuit diagram, a resistor (a device specifically designed to provide a specific amount of resistance) is represented by a zigzag line:

```text
    ---/\/\/\/\/\---
        Resistor

```

### Ohm's Law

In the 1820s, Georg Simon Ohm discovered that for many materials—including most metals—the ratio of the applied voltage to the current is a constant, independent of the applied voltage. This empirical relationship is known as **Ohm's Law**:

$$V = I R$$

It is crucial to understand that $R = V/I$ is the *definition* of resistance for any material, but $V = IR$ with a **constant** $R$ is Ohm's Law.

Materials and devices that obey Ohm's Law are called **ohmic**. In an ohmic device, if you double the voltage, the current exactly doubles. A graph of current versus voltage ($I-V$ curve) for an ohmic material is a straight line passing through the origin, where the slope is $1/R$.

Materials and devices that do not follow this linear relationship are called **non-ohmic**. A common example of a non-ohmic device is a semiconductor diode, which allows current to flow easily in one direction but strongly restricts it in the opposite direction.

```text
       I (Current)                            I (Current)
       |      /                               |      |
       |     /                                |      |
       |    /                                 |     /
       |   /                                  |   /
       |  /                                   |_/
       | /                                    |
  -----|/---------------- V              -----|------------------ V
       |                                      |
       |                                      |
       
         Ohmic Material                         Non-Ohmic (Diode)
      (Linear I-V Curve)                     (Non-linear I-V Curve)

```

### Resistivity

While resistance tells us about a specific *object* (like a piece of copper wire of a certain length and thickness), **resistivity** ($\rho$) is an intrinsic property of the *material* itself.

Experimentally, the resistance of a uniform conductor is directly proportional to its length ($L$) and inversely proportional to its cross-sectional area ($A$). The constant of proportionality is the resistivity:

$$R = \rho \frac{L}{A}$$

This makes intuitive sense: a longer wire provides more obstacles for the drifting electrons, increasing resistance. A wider wire provides a larger channel for the electrons to flow through, decreasing resistance.

The SI unit of resistivity is the ohm-meter (Ω·m). Good conductors, like silver and copper, have very low resistivities (on the order of 10⁻⁸ Ω·m). Good insulators, like glass and rubber, have exceedingly high resistivities (on the order of 10¹⁰ to 10¹⁴ Ω·m). Semiconductors, like silicon and germanium, fall in between.

### Conductivity and the Microscopic Form of Ohm's Law

The inverse of resistivity is **conductivity** ($\sigma$), which measures how easily a material allows charge to flow:

$$\sigma = \frac{1}{\rho}$$

The unit of conductivity is (Ω·m)⁻¹. Using the concepts of current density ($\vec{J}$) and the internal electric field ($\vec{E}$) introduced in the previous section, we can express Ohm's Law in a more fundamental, microscopic form. For an ohmic material, the current density at any point is directly proportional to the electric field at that point:

$$\vec{J} = \sigma \vec{E}$$

This equation shows that the local flow of charge carriers is driven entirely by the local electric field, scaled by the material's intrinsic ability to conduct.

### Temperature Dependence of Resistivity

The resistivity of a material is not perfectly constant; it depends on temperature. In most metals, resistivity increases as temperature increases. Macroscopically, as the material heats up, the atoms in the crystal lattice vibrate with greater amplitude. These heightened vibrations increase the cross-sectional area of the atoms from the perspective of the drifting electrons, leading to more frequent collisions and, consequently, greater resistivity.

Over a limited temperature range, the resistivity of a metal varies linearly with temperature according to the equation:

$$\rho = \rho_0 [1 + \alpha(T - T_0)]$$

Where:

* $\rho$ is the resistivity at temperature $T$
* $\rho_0$ is the resistivity at a reference temperature $T_0$ (usually 20°C)
* $\alpha$ is the **temperature coefficient of resistivity**, an empirical constant specific to the material, measured in (°C)⁻¹ or K⁻¹.

Because resistance is directly proportional to resistivity ($R \propto \rho$), the resistance of a specific conductor changes with temperature in the exact same manner:

$$R = R_0 [1 + \alpha(T - T_0)]$$

#### Superconductivity

At very low temperatures, a fascinating quantum mechanical phenomenon occurs in certain materials. Below a specific critical temperature ($T_c$), the resistivity of the material abruptly drops to absolutely zero. This state is called **superconductivity**. In a superconductor, an electric current can flow indefinitely without any loss of energy or generation of heat.

## 21.3 Electrical Power

In any electric circuit, a power source—such as a battery or a generator—provides the energy necessary to move charge carriers through the conducting path. As these charges move through circuit elements, this electrical energy is converted into other forms, such as mechanical work in a motor, light in a bulb, or thermal energy in a resistor. The rate at which this energy transfer occurs is known as **electrical power**.

### The General Power Equation

Consider a circuit element with a potential difference $V$ across its terminals. If an infinitesimal amount of charge $dq$ moves through this potential difference, the change in its electrical potential energy $dU$ is:

$$dU = dq \ V$$

By the principle of conservation of energy, this change in potential energy must equal the energy transferred to or from the circuit element. Power ($P$) is defined as the time rate of energy transfer. Taking the time derivative of the energy equation yields:

$$P = \frac{dU}{dt} = \frac{dq}{dt} V$$

Recall from Section 21.1 that the rate of charge flow, $dq/dt$, is the electric current $I$. Substituting $I$ into the equation gives us the general formula for electrical power:

$$P = I V$$

The SI unit of power is the **watt** (W). From the equation above, we can see that one watt is equal to one ampere multiplied by one volt ($1 \text{ W} = 1 \text{ A} \cdot 1 \text{ V}$). Because $1 \text{ V} = 1 \text{ J/C}$ and $1 \text{ A} = 1 \text{ C/s}$, it follows that $1 \text{ W} = 1 \text{ J/s}$, consistent with the mechanical definition of power.

This general equation applies to *any* device in a circuit. If current enters the higher-potential terminal of the device (like a resistor or a charging battery), the device absorbs energy from the circuit. If current leaves the higher-potential terminal (like a discharging battery), the device delivers energy to the circuit.

### Power Dissipated in a Resistor (Joule Heating)

When charge carriers move through a resistor, they experience collisions with the atomic lattice of the material, as discussed in the context of drift velocity. These collisions transfer kinetic energy from the charge carriers to the lattice, increasing the vibrational energy of the atoms. Macroscopically, this manifests as an increase in the temperature of the resistor. The conversion of electrical energy into thermal energy is called **Joule heating** (or ohmic heating).

```text
       Current (I)
     ----->-----
    |           |
   (+)         (-)   <-- Voltage (V) across resistor
    |           |
    [ Resistor ]  =====> Thermal Energy Dissipated 
    |   (R)     |        (Heat)
    |           |
     -----------

```

We can determine the exact rate at which a resistor dissipates thermal energy by combining the general power equation ($P = IV$) with Ohm's Law ($V = IR$).

If we substitute $V = IR$ into the power equation, we get power in terms of current and resistance:

$$P = I(IR) = I^2 R$$

Alternatively, if we substitute $I = V/R$ into the power equation, we obtain power in terms of voltage and resistance:

$$P = \left(\frac{V}{R}\right)V = \frac{V^2}{R}$$

These three equivalent expressions ($P = IV$, $P = I^2 R$, and $P = V^2/R$) are incredibly useful for circuit analysis.

* Use $P = I^2 R$ when analyzing components connected in series, as they all share the same current.
* Use $P = V^2/R$ when analyzing components connected in parallel, as they all share the same voltage.

### Energy Consumption and the Kilowatt-Hour

While the power rating of a device tells you the *rate* at which it uses energy, the total *amount* of energy consumed depends on how long the device is turned on. Total energy $E$ is the product of power and time:

$$E = P \Delta t$$

If you measure power in watts (Joules/second) and time in seconds, the resulting energy is in Joules. However, the Joule is a very small unit of energy for practical everyday electricity usage.

Utility companies measure and bill for electrical energy using a much larger unit called the **kilowatt-hour** (kWh). One kilowatt-hour is the total energy consumed by a device operating at a power of 1,000 watts (1 kilowatt) for exactly one hour.

We can easily convert between kilowatt-hours and Joules:

$$1 \text{ kWh} = (1000 \text{ W}) \times (3600 \text{ s}) = 3.6 \times 10^6 \text{ J}$$

To calculate the cost of operating an electrical device, you must determine the total energy consumed in kWh and multiply it by the utility company's rate:

$$\text{Cost} = (\text{Energy in kWh}) \times (\text{Cost per kWh})$$

## 21.4 Resistors in Series and Parallel

In practical electronic devices, circuits rarely consist of just a single battery and a single resistor. Instead, they contain multiple components connected together in various configurations. When analyzing these circuits, it is often useful to simplify them by replacing a combination of resistors with a single, hypothetical resistor that would draw the same total current from the power source. This single resistor is called the **equivalent resistance** ($R_{eq}$).

The two most fundamental ways to connect electrical components are in **series** and in **parallel**.

### Resistors in Series

Two or more resistors are connected in series if they are joined end-to-end along a single path, such that the exact same charge carriers must flow through each resistor in sequence.

```text
               R_1            R_2            R_3
      a  ----/\/\/\/\-------/\/\/\/\-------/\/\/\/\----  b
             |<-- V_1 -->|  |<-- V_2 -->|  |<-- V_3 -->|
             
             |----------------- V_ab -----------------|

```

Because there are no branching points (junctions) in a series connection, charge cannot accumulate or escape. By the principle of conservation of charge, the current must be identical everywhere along this path. Therefore, the current $I$ through each resistor is the same:

$$I_{total} = I_1 = I_2 = I_3 = I$$

However, as the current passes through each resistor, there is a drop in electric potential. The total potential difference $V_{ab}$ across the entire series combination must equal the sum of the individual potential drops across each resistor:

$$V_{ab} = V_1 + V_2 + V_3$$

Using Ohm's Law ($V = IR$) for each individual resistor, we can substitute into the voltage equation:

$$V_{ab} = I R_1 + I R_2 + I R_3 = I(R_1 + R_2 + R_3)$$

If we were to replace this entire combination with a single equivalent resistor $R_{eq}$ that draws the same current $I$ for the same total voltage $V_{ab}$, it would obey the equation $V_{ab} = I R_{eq}$. Comparing these two expressions, we find:

$$I R_{eq} = I(R_1 + R_2 + R_3)$$

Dividing by the common current $I$ gives the formula for the equivalent resistance of $n$ resistors in series:

$$R_{eq} = R_1 + R_2 + R_3 + \dots + R_n$$

**Key Characteristic of Series Circuits:** The equivalent resistance of a series combination is always *greater* than any individual resistance in the chain. If one component in a series circuit breaks (like an old-fashioned string of holiday lights), the single continuous path is broken, and current stops flowing through all components.

### Resistors in Parallel

Two or more resistors are connected in parallel if their terminals are connected to the same two nodes, providing multiple independent paths for the current to flow.

```text
                     Node a
                       |
             ---------------------
            |          |          |
           _|_        _|_        _|_
           \ / R_1    \ / R_2    \ / R_3
           / \        / \        / \
           _|_        _|_        _|_
            |          |          |
             ---------------------
                       |
                     Node b

```

Because all the resistors are connected directly between the same two points (Node a and Node b), the potential difference (voltage) across each resistor must be exactly the same:

$$V_{ab} = V_1 = V_2 = V_3 = V$$

However, the total current $I_{total}$ arriving at Node a splits and divides itself among the parallel branches. By the conservation of charge, the total current entering the junction must equal the sum of the currents in the individual branches:

$$I_{total} = I_1 + I_2 + I_3$$

Using Ohm's Law ($I = V/R$) to express the current in each branch, we get:

$$I_{total} = \frac{V}{R_1} + \frac{V}{R_2} + \frac{V}{R_3} = V \left( \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3} \right)$$

If we replace this parallel combination with a single equivalent resistor $R_{eq}$ across the same voltage $V$, the total current would be $I_{total} = V / R_{eq}$. Setting these two equations equal:

$$\frac{V}{R_{eq}} = V \left( \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3} \right)$$

Dividing by the common voltage $V$ yields the formula for the equivalent resistance of $n$ resistors in parallel:

$$\frac{1}{R_{eq}} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3} + \dots + \frac{1}{R_n}$$

**Key Characteristic of Parallel Circuits:** The equivalent resistance of a parallel combination is always *less* than the smallest individual resistance in the branches. Adding more resistors in parallel provides additional pathways for the charge to flow, which decreases the overall opposition to the current.

For the special case of exactly two resistors in parallel, the formula can be algebraically rearranged into a convenient "product over sum" form:

$$R_{eq} = \frac{R_1 R_2}{R_1 + R_2}$$

In a parallel circuit, if one branch is broken or removed, the other branches still maintain their independent closed paths to the voltage source. This is why household electrical outlets and appliances are wired in parallel; turning off a lamp does not shut off the power to the refrigerator.

### Analyzing Complex Circuits

Many practical circuits are combinations of both series and parallel connections. To find the total equivalent resistance of such a circuit, you can systematically reduce it by following these steps:

1. Identify any sub-groups of resistors that are in unambiguous series or parallel configurations.
2. Calculate the equivalent resistance for these sub-groups using the appropriate formulas.
3. Redraw the circuit, replacing the sub-groups with their single equivalent resistors.
4. Repeat the process on the simplified circuit until only a single equivalent resistor remains.

Once the total equivalent resistance and total current are known, you can work backward through your simplified diagrams to find the individual current and voltage drop for every specific component in the original network.

## 21.5 Kirchhoff's Rules

The techniques for analyzing series and parallel combinations learned in the previous section are powerful, but they are not sufficient for analyzing all circuits. Many practical circuits—such as those containing multiple power sources in different branches or complex "bridge" configurations—cannot be reduced to a single equivalent resistance.

To analyze these more complex circuits, we use two principles known as **Kirchhoff's Rules**, formulated by the German physicist Gustav Kirchhoff in 1845. These rules are formal applications of the fundamental laws of conservation of charge and conservation of energy.

### Terminology: Junctions and Loops

Before stating the rules, we must define two essential circuit terms:

* **Junction (or Node):** A point in a circuit where three or more conductors meet. At a junction, the path of the current branches or converges.
* **Loop:** Any closed conducting path in a circuit. To trace a loop, you start at any point, follow the wires through various components, and return to the exact starting point without crossing the same path twice.

### Kirchhoff's Junction Rule (Current Law)

The **Junction Rule** states that the sum of the currents entering any junction must equal the sum of the currents leaving that junction.

$$\sum I_{\text{in}} = \sum I_{\text{out}}$$

Alternatively, if we assign a positive sign to currents entering the junction and a negative sign to currents leaving, the algebraic sum of all currents at a junction is zero: $\sum I = 0$.

```text
            I_1
          ------>\
                  \
                   \
           I_2     /------> I_3
          ------->/
                 /
                /---------> I_4

```

*In this junction, the rule dictates that: $I_1 + I_2 = I_3 + I_4$*

**Physical Basis:** The Junction Rule is a direct consequence of the **conservation of electric charge**. Because charge cannot be created or destroyed, and because it cannot build up and accumulate steadily at any point in a standard circuit wire, whatever amount of charge flows into a junction per unit time must exactly equal the amount of charge flowing out per unit time.

### Kirchhoff's Loop Rule (Voltage Law)

The **Loop Rule** states that the algebraic sum of the changes in electric potential ($\Delta V$) encountered in a complete traversal of any closed loop in a circuit must be exactly zero.

$$\sum_{\text{closed loop}} \Delta V = 0$$

**Physical Basis:** The Loop Rule is an expression of the **conservation of energy**. The electric potential at a specific point in a circuit has a single, well-defined value. If you imagine a charge carrier moving around a complete loop and returning to its starting point, its final potential energy must be the same as its initial potential energy. Therefore, the total work done on the charge by all the circuit elements along the path must sum to zero.

#### Sign Conventions for the Loop Rule

Applying the Loop Rule requires strict adherence to a sign convention. You must first arbitrarily choose a direction (clockwise or counterclockwise) to traverse the loop. Then, you evaluate the change in potential ($\Delta V$) across each component as you pass through it in that chosen direction.

**1. Traversing a Resistor:**
When a current flows through a resistor, it flows from a region of higher potential to a region of lower potential (losing energy).

* If you traverse a resistor **in the same direction** as the assumed current, the potential drops. $\Delta V = -IR$.
* If you traverse a resistor **in the opposite direction** to the assumed current, the potential rises. $\Delta V = +IR$.

```text
       Assumed Current (I) ----->

       Path of Traversal ----->       Path of Traversal <-----
       ------/\/\/\/\------           ------/\/\/\/\------
                R                              R
          \Delta V = -IR                   \Delta V = +IR

```

**2. Traversing an Ideal Battery (EMF source):**
An ideal battery provides an electromotive force ($\mathcal{E}$). The positive terminal is at a higher potential than the negative terminal.

* If you traverse a battery from the negative (-) to the positive (+) terminal, the potential rises, regardless of the current's direction. $\Delta V = +\mathcal{E}$.
* If you traverse a battery from the positive (+) to the negative (-) terminal, the potential drops. $\Delta V = -\mathcal{E}$.

```text
       Path of Traversal ----->       Path of Traversal <-----
       -------| |----------           -------| |----------
             -   +                          -   +
         \Delta V = +\mathcal{E}        \Delta V = -\mathcal{E}

```

### Problem-Solving Strategy for Complex Circuits

To determine the unknown currents and voltages in a multi-loop circuit, follow this systematic procedure:

1. **Draw and Label:** Draw a clear circuit diagram. Label all known and unknown values (resistances, EMFs, internal resistances).
2. **Assign Currents:** For each distinct branch of the circuit, assign a current variable (e.g., $I_1, I_2, I_3$) and draw an arrow indicating its assumed direction. *Do not worry if you guess the direction incorrectly.* If your assumed direction is wrong, the mathematics will simply yield a negative value for that current, indicating it flows opposite to your arrow.
3. **Apply the Junction Rule:** Identify all the junctions in the circuit. Write down the Junction Rule equations. If a circuit has $N$ junctions, you can only generate $N - 1$ independent equations from this rule.
4. **Apply the Loop Rule:** Identify the closed loops in the circuit. Choose a traversal direction for each loop and write down the Loop Rule equations using the strict sign conventions. You need as many independent loop equations as are necessary to make the total number of equations (junction + loop) equal to the number of unknown variables.
5. **Solve the System of Equations:** Use algebraic techniques (such as substitution, elimination, or matrix methods) to solve the simultaneous linear equations for the unknown currents.

## 21.6 RC Circuits

Up to this point, we have analyzed circuits where the currents and voltages remain constant over time (steady-state direct current circuits). However, when a circuit contains both resistors and capacitors—known as an **RC circuit**—the currents, voltages, and charges change dynamically over a period of time when switches are opened or closed.

### Charging a Capacitor

Consider a simple series circuit consisting of an ideal battery with electromotive force $\mathcal{E}$, a resistor with resistance $R$, an initially uncharged capacitor with capacitance $C$, and an open switch.

```text
              Switch (S)       Resistor (R)
       a  -------_/  _---------/\/\/\/\-------  b
          |                                  |
         === \mathcal{E}                    --- C
          |                                 ---
          |                                  |
       d  ------------------------------------  c

```

At time $t = 0$, the switch is closed. Because the capacitor is initially uncharged ($Q = 0$), the potential difference across it is zero ($V_C = Q/C = 0$). At this exact instant, the battery sees only the resistor, and a maximum initial current $I_0 = \mathcal{E}/R$ begins to flow.

As time progresses, charge accumulates on the capacitor plates. This growing charge creates an increasing opposing potential difference across the capacitor, which reduces the potential difference available to drive current through the resistor. Consequently, the current in the circuit gradually decreases.

We can analyze this process rigorously using Kirchhoff's Loop Rule. Traversing the loop clockwise from point *d*:

$$\mathcal{E} - V_R - V_C = 0$$

Substituting Ohm's Law ($V_R = IR$) and the definition of capacitance ($V_C = Q/C$), we get:

$$\mathcal{E} - IR - \frac{Q}{C} = 0$$

Because the current $I$ is the rate at which charge accumulates on the capacitor, we can write $I = dQ/dt$. Substituting this into the loop equation yields a first-order linear differential equation for the charge $Q$ as a function of time:

$$R \frac{dQ}{dt} + \frac{Q}{C} = \mathcal{E}$$

By separating the variables and integrating from initial conditions ($t = 0, Q = 0$) to an arbitrary time $t$ and charge $Q$, we find the solution for the charge on the capacitor during the charging process:

$$Q(t) = C\mathcal{E} \left(1 - e^{-t/RC}\right)$$

Notice that as $t \rightarrow \infty$, the term $e^{-t/RC}$ approaches zero, and the charge approaches a maximum, asymptotic value of $Q_{max} = C\mathcal{E}$. At this fully charged state, the voltage across the capacitor equals the battery voltage, and the current drops to zero.

To find the current $I(t)$ as a function of time, we take the derivative of the charge equation:

$$I(t) = \frac{dQ}{dt} = \frac{\mathcal{E}}{R} e^{-t/RC} = I_0 e^{-t/RC}$$

```text
    Charge Q(t)                               Current I(t)
     |                                         |
 Q_m | . . . . . . . . . . . . .               |*\  (I_0)
     |             *                           | * \
     |         *                               |  *  \
     |      *                                  |   *   \
     |    *                                    |    *    \
     |  *                                      |      *      \
     | *                                       |        *        \
     |*                                        |           *        \
     +------------------------- t              +------------------------- t

```

### The Time Constant

The behavior of an RC circuit is characterized by how rapidly the capacitor charges or discharges. This rate is governed by the product of the resistance and the capacitance, a quantity defined as the **capacitive time constant** ($\tau$):

$$\tau = RC$$

The SI unit of the time constant is seconds (**s**), which is consistent with multiplying ohms by farads.

The time constant $\tau$ represents the time it takes for the current to drop to $1/e$ (approximately **36.8%**) of its initial value. Correspondingly, during charging, $\tau$ is the time required for the capacitor to reach $(1 - 1/e)$, or approximately **63.2%**, of its maximum theoretical charge. A circuit with a small time constant charges very quickly, while one with a large time constant charges slowly.

### Discharging a Capacitor

Now, suppose the capacitor has been fully charged to an initial charge $Q_0$ and a corresponding initial voltage $V_0 = Q_0/C$. If the battery is removed from the circuit and the switch is closed to form a simple loop containing only the charged capacitor and the resistor, the capacitor will begin to discharge.

```text
       a  ---------------------/\/\/\/\-------  b
          |                     Resistor (R) |
          |                                  |
          |                                 --- C (Initially charged
          |                                 ---    to Q_0)
          |                                  |
       d  ------------------------------------  c

```

Applying Kirchhoff's Loop Rule to this new discharging circuit (traversing clockwise and noting there is no battery):

$$-IR - \frac{Q}{C} = 0$$

During discharge, the current $I$ represents the *decrease* of charge on the capacitor plates, so $I = -dQ/dt$. Substituting this gives:

$$R \frac{dQ}{dt} + \frac{Q}{C} = 0$$

Separating variables and integrating from $t = 0$ (where $Q = Q_0$) yields exponential decay equations for both the charge and the current:

$$Q(t) = Q_0 e^{-t/RC}$$

$$I(t) = -\frac{dQ}{dt} = \left(\frac{Q_0}{RC}\right) e^{-t/RC} = I_0 e^{-t/RC}$$

During discharge, both the charge on the capacitor and the current in the circuit decay exponentially, approaching zero as $t \rightarrow \infty$. In one time constant ($\tau = RC$), the charge and voltage drop to **36.8%** of their initial values.

## Chapter Summary

* **Electric Current ($I$):** The rate of flow of electric charge, $I = dQ/dt$. Its SI unit is the ampere (A). Conventional current flows in the direction of a presumed positive charge carrier, which is opposite to the physical drift velocity ($\vec{v}_d$) of electrons.
* **Current Density ($\vec{J}$):** The current per unit cross-sectional area. It is related to drift velocity by $\vec{J} = nq\vec{v}_d$, where $n$ is the charge carrier number density.
* **Resistance ($R$) and Ohm's Law:** Resistance is the opposition to current flow, defined as $R = V/I$. Ohm's Law states that for many materials, $R$ is constant regardless of the applied voltage ($V = IR$).
* **Resistivity ($\rho$):** An intrinsic property of a material. The resistance of a uniform conductor is $R = \rho L / A$. Resistivity generally increases with temperature in metals.
* **Electrical Power ($P$):** The rate at which electrical energy is transferred or dissipated, given by $P = IV$. For a resistor, Joule heating can be calculated as $P = I^2R$ or $P = V^2/R$.
* **Resistors in Series and Parallel:**
* **Series:** Current is the same through all components. $R_{eq} = R_1 + R_2 + \dots + R_n$
* **Parallel:** Voltage is the same across all components. $1/R_{eq} = 1/R_1 + 1/R_2 + \dots + 1/R_n$

* **Kirchhoff's Rules:** Essential for analyzing complex circuits.
* **Junction Rule (Conservation of Charge):** $\sum I_{in} = \sum I_{out}$
* **Loop Rule (Conservation of Energy):** The algebraic sum of potential changes around any closed loop is zero ($\sum \Delta V = 0$).

* **RC Circuits:** Circuits with resistors and capacitors exhibit time-dependent behavior. Charges and currents change exponentially, governed by the time constant $\tau = RC$, which dictates the speed of the charging or discharging process.
