We now transition from mechanics to thermodynamics—the study of thermal energy. While mechanics tracks individual objects, thermodynamics uses macroscopic variables like temperature, pressure, and volume to describe systems with countless interacting particles. In this chapter, we establish the foundation of temperature via the Zeroth Law and explore how materials expand when heated. We will carefully distinguish between temperature and heat, define specific heat, and analyze the energy involved when substances change phase. Finally, we examine the three fundamental mechanisms of heat transfer: conduction, convection, and radiation.

## 15.1 Temperature and the Zeroth Law of Thermodynamics

The study of thermodynamics bridges the gap between the macroscopic world we observe and the microscopic interactions of countless particles. While mechanics (Part I) focuses on the motion of individual objects or well-defined systems, thermodynamics introduces new macroscopic variables—such as temperature, pressure, and volume—to describe the state of a system containing an extraordinarily large number of particles.

To understand these macroscopic principles, we must first establish a rigorous foundation for one of the most intuitive yet fundamental concepts in physics: **temperature**.

### Thermal Contact and Thermal Equilibrium

Imagine placing a hot cup of coffee on a table in a cool room. Experience dictates that over time, the coffee will cool down and the surrounding air will warm up slightly. Eventually, the coffee and the air will reach the same state of "hotness" or "coldness," and no further observable changes will occur.

To describe this process physically, we use the concepts of **thermal contact** and **thermal equilibrium**:

* **Thermal Contact:** Two objects are in thermal contact if they can exchange energy between them. This energy transfer, driven solely by a difference in their states, is what we will later formally define as *heat*.
* **Thermal Equilibrium:** A state achieved when two objects in thermal contact cease to exchange net energy. When thermal equilibrium is reached, all macroscopic properties (such as volume, pressure, and electrical resistance) become constant over time.

If we insulate our objects from the rest of the universe, they will inevitably evolve toward a state of mutual thermal equilibrium.

### The Zeroth Law of Thermodynamics

Consider three distinct systems: A, B, and C. Suppose system C is a specialized device used to measure thermal states (a rudimentary thermometer).

If we place system A in thermal contact with system C until they reach thermal equilibrium, their macroscopic properties will stabilize. If we then place system B in thermal contact with system C and find that no macroscopic properties change, we conclude that B and C are already in thermal equilibrium.

What happens if we then place system A directly in thermal contact with system B? Experimental evidence shows that no net energy exchange occurs between them. They are already in thermal equilibrium with one another. This empirical observation is formalized as the **Zeroth Law of Thermodynamics**:

> **The Zeroth Law of Thermodynamics:** If system A and system B are each in thermal equilibrium with a third system C, then system A and system B are in thermal equilibrium with each other.

We can visualize this logical relationship using a simple schematic:

```text
       Step 1: Independent Equilibrium
       
    +-----------+        +-----------+
    | System A  |        | System B  |
    +-----------+        +-----------+
          |                    |
   (Equilibrium)        (Equilibrium)
          |                    |
    +--------------------------------+
    |           System C             |
    +--------------------------------+

       Step 2: Conclusion by the Zeroth Law
       
    +-----------+        +-----------+
    | System A  |--------| System B  |
    +-----------+        +-----------+
                  (Equilibrium)

```

Though it may seem like a trivial statement of common sense, the Zeroth Law is profoundly important. It was formulated in the 1930s, long after the First and Second Laws of Thermodynamics, but it was designated "Zeroth" because it establishes the logical foundation for the entire field.

### Defining Temperature

The significance of the Zeroth Law is that it allows us to define the concept of **temperature** rigorously. Because systems in thermal equilibrium share some universal, measurable property, we call that property temperature ($T$).

Mathematically, the Zeroth Law states that if:

$$T_A = T_C$$

and

$$T_B = T_C$$

then it must follow that:

$$T_A = T_B$$

Therefore, **temperature is the physical property that determines whether two systems are in thermal equilibrium.**

1. If $T_A = T_B$, the systems are in thermal equilibrium. No net energy will be exchanged if they are placed in thermal contact.
2. If $T_A \neq T_B$, the systems are not in thermal equilibrium. If placed in thermal contact, energy will flow between them until their temperatures become equal.

Furthermore, the Zeroth Law validates the use of thermometers. If system C is a thermometer, we can use it to verify whether systems A and B are at the same temperature without ever bringing A and B into direct contact. This principle underpins all practical temperature measurements and scales, which will be explored in the next section.

## 15.2 Thermometers and Temperature Scales

Having established that temperature is the physical property governing thermal equilibrium, we need a reliable way to measure it. To do this, we use devices called **thermometers**, which rely on a fundamental principle: many physical properties of matter change predictably as they are heated or cooled.

A physical property that changes with temperature is called a **thermometric property**. Common examples include:

* The volume of a liquid (e.g., mercury or alcohol in a glass tube).
* The length of a solid (e.g., a bimetallic strip in a thermostat).
* The pressure of a gas held at a constant volume.
* The volume of a gas held at a constant pressure.
* The electrical resistance of a conductor (e.g., a platinum resistance thermometer).
* The color or spectrum of light emitted by a hot object (e.g., an infrared pyrometer).

By calibrating these changes against standardized reference points, we can construct practical temperature scales.

### The Celsius and Fahrenheit Scales

Historically, the most common temperature scales were created by choosing two easily reproducible reference states of water at standard atmospheric pressure: the freezing point (ice point) and the boiling point (steam point).

* **Celsius Scale ($^\circ$C):** Proposed by Anders Celsius in 1742. The freezing point of water is defined as 0°C, and the boiling point is defined as 100°C. The interval between them is divided into 100 equal parts, or degrees.
* **Fahrenheit Scale ($^\circ$F):** Developed by Daniel Gabriel Fahrenheit in 1724. The freezing point of water is defined as 32°F, and the boiling point is 212°F. The interval is divided into 180 equal degrees.

Because the Celsius scale has 100 degrees between the reference points and the Fahrenheit scale has 180 degrees, a change of 1.0°C is equivalent to a change of 1.8°F (since $180 / 100 = 9/5$). To convert a specific temperature reading from one scale to the other, we use the following linear relationships:

$$T_F = \frac{9}{5}T_C + 32$$

$$T_C = \frac{5}{9}(T_F - 32)$$

### The Constant-Volume Gas Thermometer

While liquid-in-glass thermometers are convenient, they have a flaw: different liquids expand at slightly different, non-linear rates. A thermometer using mercury might agree with one using alcohol at 0°C and 100°C, but they will give slightly different readings at 50°C.

To create a truly standard scale, physicists rely on the **constant-volume gas thermometer**. This device measures the pressure of a dilute gas (like helium) held at a fixed volume. As the temperature of the gas increases, its pressure increases in a highly linear fashion.

If we plot the pressure $P$ of various gases against their Celsius temperature $T_C$, we observe a remarkable phenomenon:

```text
  Pressure (P)
      ^
      |                        / Gas C
      |                      /
      |                    /   / Gas B
      |                  /   /
      |                /   /   / Gas A
      |              /   /   /
      |            /   /   /
      |          /   /   /
      |        /   /   /
      |      /   /   /
      |    /   /   /
      |  /   /   /
------+----+----+---------------------> Temperature (°C)
 -273.15   0   100

```

Different gases have different starting pressures, so their lines have different slopes. However, if we extrapolate the straight lines backward to the point where the gas pressure would theoretically drop to zero, **all the lines converge at exactly the same temperature: -273.15°C.**

### Absolute Zero and the Kelvin Scale

The universal convergence point at -273.15°C represents a fundamental limit in nature. Since pressure is a result of molecular collisions, a pressure of zero implies that all translational molecular motion has ceased. This lowest possible theoretical temperature is known as **absolute zero**.

The existence of absolute zero allows us to define an absolute temperature scale that does not depend on the arbitrary freezing or boiling points of water, nor on the specific properties of any one material. This is the **Kelvin scale** (K), the SI base unit for temperature, named after Lord Kelvin.

The Kelvin scale sets its zero point at absolute zero (0 K). The size of one "kelvin" (note that we do not use the degree symbol for kelvins) is defined to be exactly equal to one degree Celsius. Therefore, the relationship between the Kelvin and Celsius scales is a simple shift:

$$T_K = T_C + 273.15$$

Because the degree size is identical, a *change* in temperature is exactly the same on both scales:

$$\Delta T_K = \Delta T_C$$

### Summary of Temperature Scales

Here is a visual comparison of the three primary temperature scales, highlighting the key reference points:

```text
    Fahrenheit (°F)      Celsius (°C)        Kelvin (K)
      
      212 -------------- 100 -------------- 373.15  (Water boils)
       |                  |                   |
       |                  |                   |
       |                  |                   |
       72 --------------  22 -------------- 295.15  (Typical room temp)
       |                  |                   |
       |                  |                   |
       32 --------------   0 -------------- 273.15  (Water freezes)
       |                  |                   |
       |                  |                   |
     -108 -------------- -78 -------------- 195.15  (Dry ice sublimates)
       |                  |                   |
       |                  |                   |
     -459.67 ----------- -273.15 ----------   0     (Absolute zero)

```

In modern physics and thermodynamics, the Kelvin scale is almost exclusively used because many fundamental equations—such as the Ideal Gas Law and the formulas governing thermal radiation—require absolute temperature to yield correct physical results.

## 15.3 Thermal Expansion of Solids and Liquids

Most materials expand when heated and contract when cooled. This phenomenon, known as thermal expansion, plays a critical role in engineering and the natural world, dictating how bridges are constructed, how thermometers function, and even how lakes freeze.

### The Microscopic Origin of Expansion

To understand why materials expand, we must look at the microscopic behavior of atoms in a solid lattice. Atoms are held together by electromagnetic forces, acting like a network of masses connected by tiny springs. At any temperature above absolute zero, these atoms are in constant vibration.

The potential energy of an atomic bond can be modeled as a "well." However, this well is not perfectly symmetrical. As two atoms are pushed close together, the repulsive force increases much more sharply than the attractive force does when they are pulled apart.

```text
  Potential Energy (U)
      ^
      |   /                 As temperature (energy) increases,
      |  /                  the average distance between atoms
      | |                   shifts to the right due to the 
E_3   |-+----------+--      asymmetry of the curve.
      | |    o     |        
E_2   |-+--------+----      (o = average separation distance)
      |  \   o  /
E_1   |---+----+------
      |    \_o/
      +---------------------> Interatomic Distance (r)

```

As the temperature of the material increases, the atoms gain kinetic energy and vibrate with greater amplitude ($E_1 \rightarrow E_2 \rightarrow E_3$). Because the potential energy curve is shallower on the right side, the atoms spend more time further apart during their oscillation cycle. Consequently, the *average* interatomic separation increases, causing the macroscopic object to expand.

### Linear Expansion of Solids

For a one-dimensional solid object, such as a long metal rod, the change in length is directly proportional to its initial length and the change in temperature.

```text
      At Temperature T_0:
      |-----------------------------|
                    L_0

      At Temperature T_0 + ΔT:
      |-----------------------------|------|
                    L_0                ΔL

```

Experimentally, the change in length $\Delta L$ is given by the equation:

$$\Delta L = \alpha L_0 \Delta T$$

Where:

* $\Delta L$ is the change in length ($L - L_0$).
* $L_0$ is the initial length.
* $\Delta T$ is the change in temperature ($T - T_0$).
* $\alpha$ is the **coefficient of linear expansion**, a material-specific constant.

The unit for $\alpha$ is typically expressed as $^\circ\text{C}^{-1}$ or $\text{K}^{-1}$. Because a change of one degree Celsius equals a change of one kelvin, the numerical value of $\alpha$ is identical for both scales. The final length $L$ of the object can be written as:

$$L = L_0(1 + \alpha \Delta T)$$

*Note:* Thermal expansion is analogous to a photographic enlargement. If a metal plate has a hole in it, the hole does not shrink as the metal expands; rather, the hole expands at the exact same rate as if it were filled with the surrounding material.

### Area and Volume Expansion of Solids

Because solids expand in all directions, an increase in temperature also leads to an increase in area and volume.

For a rectangular plate of dimensions $L \times W$, the new area $A$ after a temperature increase is $A = L_0(1 + \alpha \Delta T) \times W_0(1 + \alpha \Delta T)$. Expanding this yields $A_0(1 + 2\alpha \Delta T + \alpha^2 \Delta T^2)$. Because $\alpha$ is typically very small (on the order of $10^{-5}$), the $\alpha^2$ term is negligible. We can therefore approximate the change in area $\Delta A$ as:

$$\Delta A \approx 2\alpha A_0 \Delta T$$

Similarly, the change in volume $\Delta V$ for a solid is proportional to its initial volume $V_0$:

$$\Delta V = \beta V_0 \Delta T$$

Where $\beta$ is the **coefficient of volume expansion**. For isotropic solids (materials that expand equally in all directions), the volume expansion coefficient is approximately three times the linear expansion coefficient:

$$\beta \approx 3\alpha$$

### Thermal Expansion of Liquids

Unlike solids, liquids do not have a defined shape or length, so we only consider their volume expansion. Liquids generally expand when heated, and their volumetric expansion is governed by the same equation used for solids:

$$\Delta V = \beta V_0 \Delta T$$

In general, liquids have significantly higher coefficients of volume expansion ($\beta$) than solids. This is why the liquid in a glass thermometer rises when heated; the liquid expands much more rapidly than the glass tube containing it.

### The Anomalous Expansion of Water

Most liquids expand uniformly as their temperature increases. Water, however, exhibits a highly unusual and ecologically vital anomaly.

When liquid water at room temperature is cooled, it contracts like a normal fluid. However, as it reaches $4^\circ\text{C}$, it reaches its maximum density. If cooled further from $4^\circ\text{C}$ down to its freezing point at $0^\circ\text{C}$, water actually *expands*.

```text
   Density (kg/m³)
      ^
 1000 |         *  *  * 
      |       *         *
  999 |     *             *
      |   *                 *
      | * 
      +---+----+----+----+----+---> Temperature (°C)
          0    4    8    12   16

```

This anomalous behavior occurs because of the hydrogen bonding between water molecules. As water nears its freezing point, the molecules begin to arrange themselves into an open, hexagonal crystalline structure (ice), which takes up more volume than the disorganized liquid state.

This property has profound environmental consequences. During winter, as the surface of a lake cools, the water becomes denser and sinks, pushing warmer water to the top. However, once the entire lake reaches $4^\circ\text{C}$, further cooling at the surface makes the water *less* dense. This cold water ($0^\circ\text{C}$ to $3^\circ\text{C}$) floats on top of the slightly warmer $4^\circ\text{C}$ water. Consequently, ice forms at the surface, creating an insulating layer that prevents the lower depths from freezing solid, thereby allowing aquatic life to survive the winter.

## 15.4 Heat Capacity and Specific Heat

When two objects at different temperatures are placed in thermal contact, energy flows from the hotter object to the colder one until thermal equilibrium is reached. This transfer of energy, driven solely by a temperature difference, is defined as **heat** ($Q$).

It is crucial to distinguish between temperature, internal energy, and heat. An object does not "contain" heat; it contains internal energy. Heat is strictly the *transfer* of energy across a system boundary. Because heat is a measure of energy transfer, its SI unit is the Joule (J). Historically, the **calorie** (cal) was defined as the amount of heat required to raise the temperature of 1 gram of water by 1°C. The mechanical equivalent of heat relates these units:

$$1 \text{ cal} = 4.186 \text{ J}$$

### Heat Capacity

If we add the same amount of heat to a glass of water and an iron skillet of the same mass, their temperatures will not increase by the same amount. The ratio of the heat $Q$ added to (or removed from) an object to the resulting temperature change $\Delta T$ is called the **heat capacity** ($C$) of the object:

$$C = \frac{Q}{\Delta T}$$

Or, rearranged to solve for heat:

$$Q = C \Delta T$$

Heat capacity is an *extensive* property, meaning it depends on the size or extent of the system. A bathtub full of water has a much larger heat capacity than a teacup of water. The SI unit for heat capacity is $\text{J/K}$ or $\text{J/}^\circ\text{C}$.

### Specific Heat

To define a property that is characteristic of the material itself, regardless of its mass, we use **specific heat** (often called specific heat capacity), denoted by the lowercase letter $c$. Specific heat is the heat capacity per unit mass:

$$c = \frac{C}{m} = \frac{Q}{m \Delta T}$$

This yields the fundamental heat transfer equation for a single phase of matter:

$$Q = mc \Delta T$$

Where:

* $Q$ is the heat transferred (positive if energy enters the system, negative if it leaves).
* $m$ is the mass of the substance.
* $c$ is the specific heat of the substance.
* $\Delta T = T_{\text{final}} - T_{\text{initial}}$ is the change in temperature.

Specific heat is an *intensive* property. The SI unit for specific heat is $\text{J/(kg} \cdot \text{K)}$ or $\text{J/(kg} \cdot ^\circ\text{C)}$.

Different materials respond to heat addition very differently. Metals generally have low specific heats, meaning they heat up and cool down rapidly. Water, on the other hand, has an unusually high specific heat ($4186 \text{ J/(kg}\cdot^\circ\text{C)}$).

```text
  Relative Specific Heats (Approximate)
  
  Water:    ████████████████████████████████████████ (4186 J/kg·°C)
  Ice:      ████████████████████ (2090 J/kg·°C)
  Aluminum: █████████ (900 J/kg·°C)
  Iron:     ████ (448 J/kg·°C)
  Lead:     █ (128 J/kg·°C)

```

The high specific heat of water moderates Earth's climate. Coastal regions experience less extreme temperature fluctuations than inland regions because the ocean absorbs massive amounts of solar energy during the day with only a small temperature increase, and slowly releases that energy at night.

### Molar Specific Heat

In physics and chemistry, especially when dealing with gases, it is often more convenient to describe the amount of a substance in terms of moles ($n$) rather than mass. The **molar specific heat** ($C_m$) is the heat capacity per mole:

$$Q = n C_m \Delta T$$

The SI unit for molar specific heat is $\text{J/(mol} \cdot \text{K)}$. We will explore molar specific heats in much greater detail when analyzing the kinetic theory of ideal gases in Chapter 16.

### Calorimetry

**Calorimetry** is the experimental technique used to measure the specific heat of a substance. It relies on the principle of conservation of energy. If we place a hot object (like a heated block of metal) into a colder fluid (like water) inside an insulated container, we assume that no energy escapes to the surrounding environment.

```text
       Basic Calorimeter Apparatus
       
       +-------------------------------+
       |       Insulating Jacket       |
       |   +-----------------------+   |
       |   |                       |   |
       |   |        Thermometer ---+---+--- [Read T_final]
       |   |            |          |   |
       |   |       [Stirrer]       |   |
       |   |            |          |   |
       |   |   ~~~~~~~~~~~~~~~~~~  |   |
       |   |   ~ Water (known m)~  |   |
       |   |   ~                ~  |   |
       |   |   ~   +--------+   ~  |   |
       |   |   ~   | Sample |   ~  |   |
       |   |   ~   +--------+   ~  |   |
       |   |   ~~~~~~~~~~~~~~~~~~  |   |
       |   +-----------------------+   |
       +-------------------------------+

```

Because the system is isolated, the heat lost by the hot object must exactly equal the heat gained by the cold water and the inner container of the calorimeter. Mathematically, the sum of all heat transfers within the isolated system is zero:

$$\sum Q = 0$$

$$Q_{\text{cold}} + Q_{\text{hot}} = 0$$

Expanding this using the specific heat equation, we get:

$$m_{\text{cold}} c_{\text{cold}} (T_{\text{final}} - T_{\text{cold, initial}}) + m_{\text{hot}} c_{\text{hot}} (T_{\text{final}} - T_{\text{hot, initial}}) = 0$$

Note that $\Delta T$ for the hot object will be negative (since $T_{\text{final}} < T_{\text{hot, initial}}$), causing $Q_{\text{hot}}$ to be negative, which balances the positive $Q_{\text{cold}}$. By measuring the initial temperatures, the masses, and the final equilibrium temperature, the specific heat of an unknown sample can be calculated with high precision.

## 15.5 Phase Changes and Latent Heat

In the previous section, we established that adding heat to a substance typically increases its temperature according to the equation $Q = mc\Delta T$. However, this relationship breaks down under specific conditions. If you place a pot of water on a stove and continuously add heat, the temperature of the water will rise until it reaches $100^\circ\text{C}$. Once it begins to boil, an interesting phenomenon occurs: despite the continuous addition of heat from the burner, the temperature of the water remains exactly at $100^\circ\text{C}$ until every last drop has turned into steam.

When a substance undergoes a physical transition from one state of matter to another—such as melting from a solid to a liquid, or boiling from a liquid to a gas—it undergoes a **phase change**. During a phase change, the temperature of the substance remains strictly constant.

### The Microscopic Mechanism of Phase Changes

Why does the temperature stop rising? Recall that temperature is a macroscopic measure of the average translational kinetic energy of the molecules in a substance. When heat is added to a solid (like ice) below its melting point, that energy causes the molecules to vibrate faster, increasing their kinetic energy and, consequently, the macroscopic temperature.

However, once the substance reaches its melting or boiling point, the added thermal energy is no longer used to increase the kinetic energy of the molecules. Instead, the energy is utilized to do work against the attractive intermolecular forces that bind the molecules together.

* **Melting:** Energy breaks the rigid lattice structure of the solid, allowing molecules to slide past one another to form a liquid.
* **Boiling:** Energy completely overcomes the attractive forces in the liquid, freeing the molecules to fly apart and form a gas.

Because the average kinetic energy of the molecules does not change during this bond-breaking process, the temperature remains constant.

### Latent Heat

The amount of heat energy required to change the phase of a given mass of a substance is called the **latent heat** ($L$). The term "latent" means hidden, referring to the fact that this added heat is not revealed by a change in temperature.

The total heat $Q$ required to change the phase of a mass $m$ of a substance is given by:

$$Q = \pm mL$$

The sign is chosen based on the direction of energy flow:

* Use the **positive sign ($+$)** when energy is entering the system (melting or boiling).
* Use the **negative sign ($-$)** when energy is leaving the system (freezing or condensing).

The SI unit for latent heat is Joules per kilogram ($\text{J/kg}$).

There are two primary types of latent heat, corresponding to the two main boundaries between states of matter:

1. **Latent Heat of Fusion ($L_f$):** The energy required to change a substance between the solid and liquid phases (melting/freezing).
2. **Latent Heat of Vaporization ($L_v$):** The energy required to change a substance between the liquid and gas phases (boiling/condensing).

For water at standard atmospheric pressure, these values are remarkably high:

* $L_f = 3.33 \times 10^5 \text{ J/kg}$
* $L_v = 2.26 \times 10^6 \text{ J/kg}$

*Note:* $L_v$ is significantly larger than $L_f$. Melting only requires breaking enough bonds to allow molecules to flow, while vaporization requires completely severing all bonds to separate the molecules by vast distances.

### The Heating Curve

We can visualize the interplay between specific heat and latent heat using a **heating curve**, which plots the temperature of a system as a function of the heat added. Consider a block of ice starting at $-20^\circ\text{C}$ that is slowly heated until it becomes steam at $120^\circ\text{C}$.

```text
    Temperature (°C)
        ^
    120 |                                                / Phase: Gas (Steam)
        |                                              /   (Q = mc_{steam}ΔT)
        |                                            /
    100 |------------------------------+-----------/
        |                              | Boiling (Q = mL_v)
        |                              | (Liquid and gas coexist)
        |                              |
        |                              |
        |                            / 
        |                          /   Phase: Liquid Water
        |                        /     (Q = mc_{water}ΔT)
      0 |----------+-----------/ 
        |          | Melting (Q = mL_f)
        |          | (Solid and liquid coexist)
        |        /
    -20 |------/  Phase: Solid Ice (Q = mc_{ice}ΔT)
        |
        +------------------------------------------------------> Heat Added (Q)

```

As the graph illustrates, the process occurs in five distinct stages:

1. **Warming the ice:** Heat increases the temperature of the solid ($Q = mc_{\text{ice}}\Delta T$).
2. **Melting the ice:** The temperature stalls at $0^\circ\text{C}$. The solid and liquid phases coexist. Heat drives the phase change ($Q = +mL_f$).
3. **Warming the water:** Once all the ice has melted, heat increases the temperature of the liquid ($Q = mc_{\text{water}}\Delta T$).
4. **Boiling the water:** The temperature stalls at $100^\circ\text{C}$. The liquid and gas phases coexist. Heat drives the phase change ($Q = +mL_v$). Note that the plateau for boiling is much longer than the one for melting due to the large value of $L_v$.
5. **Warming the steam:** Once all the water has vaporized, heat increases the temperature of the gas ($Q = mc_{\text{steam}}\Delta T$).

### Sublimation and Deposition

While melting and boiling are the most common phase changes, under certain conditions of pressure and temperature, a substance can bypass the liquid phase entirely.

* **Sublimation:** The direct transition from a solid to a gas (e.g., dry ice, which is solid carbon dioxide, sublimating at room temperature).
* **Deposition:** The direct transition from a gas to a solid (e.g., water vapor in the air freezing directly onto cold a window pane to form frost).

These processes are governed by the **Latent Heat of Sublimation ($L_s$)**.

### Phase Changes in Calorimetry

When solving calorimetry problems ($\sum Q = 0$) that involve phase changes, it is critical to track both the temperature changes and the phase transitions. For example, if you drop an ice cube at $-10^\circ\text{C}$ into a glass of warm water, the heat lost by the warm water must equal the heat gained by the ice to warm up to $0^\circ\text{C}$, *plus* the heat required to melt the ice, *plus* the heat required to warm the newly melted ice water to the final equilibrium temperature. Missing the latent heat term is one of the most common errors in thermodynamic calculations.

## 15.6 Mechanisms of Heat Transfer (Conduction, Convection, Radiation)

When two regions of a system (or two distinct systems) are at different temperatures, thermal energy will naturally flow from the hotter region to the colder one until thermal equilibrium is achieved. This transfer of energy is called heat. In physics, we classify the transfer of heat into three distinct mechanisms: **conduction**, **convection**, and **radiation**.

### 1. Conduction

**Conduction** is the transfer of heat through stationary matter by physical contact. It occurs at the microscopic level through two primary processes:

1. **Atomic/Molecular Collisions:** Faster-moving (hotter) particles collide with slower-moving (colder) neighbors, transferring kinetic energy. This happens in all solids, liquids, and gases.
2. **Free Electrons:** In metals, one or more valence electrons per atom become detached and can move freely through the atomic lattice. These "free electrons" carry thermal energy rapidly from the hot end to the cold end. This is why good electrical conductors (like copper and silver) are also excellent thermal conductors.

Imagine a solid rod of length $L$ and cross-sectional area $A$, with its ends maintained at two different temperatures, $T_H$ (hot) and $T_C$ (cold).

```text
       T_H (Hot)                                   T_C (Cold)
      +---------+                                 +---------+
      |         |  ====> Rate of Heat flow (P) ===> |         |
      |         |---------------------------------|         |
      |         |---------------------------------|         |
      +---------+                                 +---------+
                          Length (L)
                    Cross-sectional Area (A)

```

Experimentally, the rate of heat transfer $P$ (which is $Q/\Delta t$, measured in Watts or J/s) through the rod is directly proportional to the cross-sectional area and the temperature difference, and inversely proportional to the length. This is summarized by **Fourier's Law of Heat Conduction**:

$$P = \frac{Q}{\Delta t} = kA \frac{T_H - T_C}{L}$$

Where:

* $P$ is the power, or rate of heat transfer (Watts, W).
* $A$ is the cross-sectional area ($\text{m}^2$).
* $L$ is the thickness or length of the material (m).
* $(T_H - T_C)$ is the temperature difference across the material.
* $k$ is the **thermal conductivity**, a material-specific constant.

Materials with high $k$ values (like metals) are thermal conductors. Materials with very low $k$ values (like fiberglass, wood, and air) are thermal insulators.

### 2. Convection

**Convection** is the transfer of heat by the macroscopic, bulk movement of a fluid (a liquid or a gas). While conduction transfers heat *through* a material, convection transfers heat by *moving* the material itself.

There are two types of convection:

* **Natural Convection:** Driven by buoyant forces. When a fluid is heated, it expands (as discussed in Section 15.3), its density decreases, and it rises. Surrounding cooler, denser fluid rushes in to take its place, creating a continuous circulation loop called a convection current.
* **Forced Convection:** The fluid is moved artificially by a pump, fan, or blower (e.g., a car's water pump moving coolant, or a computer fan pushing hot air away from a CPU).

```text
              Cool air sinks           Warm air rises
                     \                   /
                      \                 /
                       V               ^
                     +-------------------+
                     |   \           /   |
                     |     \       /     |
                     |  Convection Loop  |
                     |       \   /       |
                     +-------------------+
                     ^^^^^^^^^^^^^^^^^^^^^
                        Heating Element

```

Unlike conduction and radiation, convection is incredibly complex to model mathematically because it depends on fluid dynamics, the geometry of the space, and the viscosity of the fluid. It is often described empirically using Newton's Law of Cooling for specific engineering applications, rather than a single universal fundamental equation.

### 3. Radiation

**Radiation** is the transfer of heat via electromagnetic waves. Unlike conduction and convection, which require a material medium to transfer energy, thermal radiation can travel through a perfect vacuum. This is how the immense thermal energy of the Sun reaches the Earth across 150 million kilometers of empty space.

All objects at a temperature above absolute zero emit thermal radiation due to the random thermal acceleration of the electric charges within their atoms. The rate at which an object radiates energy is given by the **Stefan-Boltzmann Law**:

$$P = \sigma A e T^4$$

Where:

* $P$ is the radiated power (Watts).
* $\sigma$ is the Stefan-Boltzmann constant ($\sigma \approx 5.67 \times 10^{-8} \text{ W}/(\text{m}^2\cdot\text{K}^4)$).
* $A$ is the surface area of the object ($\text{m}^2$).
* $T$ is the **absolute temperature** of the object in Kelvin (K). *Note: You must use Kelvin, not Celsius, for this equation.*
* $e$ is the **emissivity** of the object, a dimensionless number between 0 and 1.

Emissivity ($e$) describes how efficiently an object radiates and absorbs energy.

* An ideal radiator has $e = 1$ and is called a **blackbody**. It is both a perfect emitter and a perfect absorber of radiation.
* A highly reflective surface (like a shiny silver mirror) has an emissivity close to $0$. It reflects most radiation and emits very little.

Because an object is continuously emitting radiation to its surroundings and absorbing radiation from its surroundings, the *net* rate of heat transfer by radiation for an object at temperature $T$ in an environment at temperature $T_0$ is:

$$P_{\text{net}} = \sigma A e (T^4 - T_0^4)$$

If $T > T_0$, $P_{\text{net}}$ is positive, and the object is cooling down. If $T < T_0$, $P_{\text{net}}$ is negative, and the object is gaining net energy from its surroundings.

---

## Chapter 15 Summary

* **Temperature and the Zeroth Law:** The Zeroth Law of Thermodynamics states that if systems A and B are in thermal equilibrium with system C, they are in thermal equilibrium with each other. Temperature is the physical property that governs thermal equilibrium.
* **Temperature Scales:** The Celsius and Fahrenheit scales are historically based on the phase changes of water. The Kelvin scale is the absolute thermodynamic temperature scale, beginning at absolute zero ($0\text{ K} = -273.15^\circ\text{C}$), the point where classical molecular kinetic energy is zero.
* **Thermal Expansion:** Most solids and liquids expand when heated. Linear expansion is given by $\Delta L = \alpha L_0 \Delta T$, and volume expansion by $\Delta V = \beta V_0 \Delta T$. Water is anomalous; it contracts when heated from $0^\circ\text{C}$ to $4^\circ\text{C}$.
* **Specific Heat and Heat Capacity:** Heat ($Q$) is energy transferred due to a temperature difference. The heat required to change an object's temperature without a phase change is $Q = mc\Delta T$, where $c$ is the specific heat of the material. Calorimetry relies on the conservation of energy ($\sum Q = 0$) in isolated systems.
* **Phase Changes and Latent Heat:** During a phase change, temperature remains constant as added thermal energy breaks intermolecular bonds. The heat required for a phase change is $Q = \pm mL$, where $L$ is the latent heat of fusion ($L_f$) or vaporization ($L_v$).
* **Mechanisms of Heat Transfer:**
* *Conduction:* Transfer through physical contact, governed by Fourier's Law ($P = kA\frac{\Delta T}{L}$).
* *Convection:* Transfer via the bulk movement of fluids (natural or forced).
* *Radiation:* Transfer via electromagnetic waves, capable of traveling through a vacuum, governed by the Stefan-Boltzmann Law ($P = \sigma A e T^4$).
