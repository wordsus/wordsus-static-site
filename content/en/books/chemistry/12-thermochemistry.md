Every chemical reaction and physical change is accompanied by a transfer of energy. From the heat released by burning fuel to the cooling of a chemical ice pack, understanding these energy transformations is essential. In this chapter, we explore thermochemistry: the study of heat flow in chemical systems. We will define the nature of energy and work, establish the First Law of Thermodynamics, and introduce enthalpy to quantify heat transfer. By mastering the principles of calorimetry and Hess's Law, you will learn how to measure, calculate, and predict the vital energy changes that govern the molecular world.

## 12.1 The Nature of Chemical Energy and Work

The study of chemistry extends beyond the composition and structure of matter; it is equally concerned with the energy changes that accompany chemical reactions and physical processes. The study of energy and its transformations is known as thermodynamics, and the specific branch examining the relationships between chemical reactions and energy changes that involve heat is called thermochemistry.

To understand thermochemistry, we must first establish a precise understanding of what energy is and how it manifests in chemical systems. Fundamentally, **energy** is defined as the capacity to do work or to transfer heat.

### Kinetic and Potential Energy

All forms of energy can be classified into two broad categories: kinetic energy and potential energy.

**Kinetic Energy ($E_k$)** is the energy of motion. The magnitude of kinetic energy for an object depends on its mass ($m$) and its velocity ($v$):

$$E_k = \frac{1}{2}mv^2$$

In chemistry, kinetic energy is most directly related to the random, continuous motion of atoms and molecules. This form of kinetic energy is often called thermal energy. As the temperature of a substance increases, the average kinetic energy of its constituent particles also increases.

**Potential Energy ($E_p$)** is the energy an object possesses by virtue of its position or chemical composition. It is "stored" energy. In the macroscopic world, a boulder at the top of a hill has gravitational potential energy. In the submicroscopic realm of chemistry, the most critical form of potential energy is **electrostatic potential energy** ($E_{el}$), which arises from the interactions between charged particles.

The electrostatic potential energy between two point charges ($Q_1$ and $Q_2$) separated by a distance ($d$) is given by:

$$E_{el} = \frac{\kappa Q_1 Q_2}{d}$$

where $\kappa$ is a constant of proportionality ($8.99 \times 10^9 \text{ J}\cdot\text{m/C}^2$).

* When $Q_1$ and $Q_2$ have the same sign (both positive or both negative), the particles repel each other, and $E_{el}$ is positive. The potential energy decreases as the particles move apart.
* When $Q_1$ and $Q_2$ have opposite signs, the particles attract each other, and $E_{el}$ is negative. The potential energy decreases (becomes more negative) as the particles move closer together.

Chemical energy—the energy stored within the structural units of chemical substances—is fundamentally potential energy. It is determined by the electrostatic attractions and repulsions between the electrons and nuclei within molecules. When chemical bonds are broken, energy must be absorbed to overcome these attractive forces. Conversely, when new chemical bonds are formed, energy is released.

### Systems and Surroundings

To analyze energy changes accurately, we must clearly define the specific part of the universe we are studying.

* **The System:** The specific portion of the universe singled out for study. In chemistry, the system usually consists of the reactants and products involved in a chemical or physical change.
* **The Surroundings:** Everything else in the universe outside the system. In a laboratory setting, the surroundings might include the solvent, the container (like a beaker or flask), the surrounding air, and the room itself.

```text
+-------------------------------------------------------------+
|                        THE UNIVERSE                         |
|                                                             |
|   +-----------------------------------------------------+   |
|   |                    SURROUNDINGS                     |   |
|   |                                                     |   |
|   |       +-------------------------------------+       |   |
|   |       |               SYSTEM                |       |   |
|   |       |        (Reactants -> Products)      |       |   |
|   |       +-------------------------------------+       |   |
|   |          ^                               |          |   |
|   |     Energy Transfer                 Energy Transfer |   |
|   |        (Inward)                        (Outward)    |   |
|   |                                                     |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+

```

Systems can be further classified based on how they interact with their surroundings:

1. **Open System:** Can exchange both mass and energy (usually in the form of heat) with its surroundings. An uncovered boiling pot of water is an open system.
2. **Closed System:** Can exchange energy, but not mass, with its surroundings. A sealed flask containing a chemical reaction is a closed system. Thermochemical studies are most frequently conducted in closed systems.
3. **Isolated System:** Can exchange neither mass nor energy with its surroundings. A perfectly insulated thermos bottle approximates an isolated system.

### Transferring Energy: Work and Heat

In a closed system, energy can be transferred between the system and the surroundings in only two ways: as work or as heat.

**Work ($w$)** is defined as the energy transferred when a force ($F$) moves an object through a distance ($d$):

$$w = F \times d$$

**Heat ($q$)** is the energy transferred from a hotter object to a colder one due to a difference in temperature.

#### Pressure-Volume ($P-V$) Work in Chemistry

While physicists often deal with mechanical work (like pushing a block or lifting a weight), the most common type of work performed by chemical systems is **pressure-volume work** (or $P-V$ work). This occurs when a gas expands or is compressed against a constant external pressure, such as the atmosphere or a movable piston in an engine.

Consider a gas confined in a cylinder with a movable piston of cross-sectional area $A$. The gas exerts a pressure inside, and the surroundings exert an external pressure ($P_{ext}$) against the piston. Pressure is defined as force per unit area ($P = F/A$), meaning the downward force exerted by the surroundings is $F = P_{ext} \times A$.

If the gas undergoes a chemical reaction that increases the number of gas molecules (or if it is heated), the gas will expand, pushing the piston upward by a distance $\Delta h$. The work done *by* the system *on* the surroundings is:

$$w_{expansion} = F \times \Delta h = (P_{ext} \times A) \times \Delta h$$

Since the product of the cross-sectional area ($A$) and the height change ($\Delta h$) equals the change in volume ($\Delta V$), we can substitute $\Delta V$ into the equation:

$$w_{expansion} = P_{ext} \Delta V$$

To maintain proper thermodynamic sign conventions—where energy leaving the system is mathematically negative—we define the formula for $P-V$ work as:

$$w = -P_{ext}\Delta V$$

* **Expansion:** If the gas expands, $\Delta V$ is positive ($V_{final} > V_{initial}$). Consequently, $w$ is negative, indicating that the system lost energy by doing work on its surroundings.
* **Compression:** If the gas is compressed, $\Delta V$ is negative ($V_{final} < V_{initial}$). The double negative makes $w$ positive, indicating that the surroundings did work on the system, adding energy to it.
* **Constant Volume:** If the volume does not change (as in a rigid, sealed container), $\Delta V = 0$, and no $P-V$ work is done ($w = 0$), regardless of how the pressure inside the container changes.

Understanding these fundamental definitions of energy, systems, heat, and work provides the necessary foundation to explore the conservation of energy, which will be formalized in the next section as the First Law of Thermodynamics.

## 12.2 The First Law of Thermodynamics

Having established the definitions of heat, work, and the boundaries between a system and its surroundings, we can now formulate one of the most fundamental principles of nature: the First Law of Thermodynamics. At its core, the First Law is a statement of the law of conservation of energy. It asserts that energy can be converted from one form to another, but it can be neither created nor destroyed.

In other words, the total energy of the universe is constant. Any energy lost by a system must be exactly balanced by an equivalent amount of energy gained by its surroundings, and vice versa.

### Internal Energy

To apply the First Law to chemical systems, we must define the total energy of the system. This is known as the **internal energy** ($E$, though sometimes denoted as $U$ in physics texts). The internal energy is the sum of all the kinetic and potential energies of all the components within the system. This includes the translational, rotational, and vibrational kinetic energies of the molecules, as well as the potential energy stored in chemical bonds and intermolecular forces.

Because a system is composed of an unimaginable number of particles moving and interacting continuously, it is impossible to measure the absolute value of the internal energy of a system. Fortunately, in thermodynamics, we are rarely concerned with the absolute internal energy. Instead, we are focused on the **change in internal energy** ($\Delta E$) that accompanies a chemical reaction or physical process.

We define the change in internal energy as the difference between the final energy of the system and its initial energy:

$$\Delta E = E_{final} - E_{initial}$$

In the context of a chemical reaction, the initial state refers to the reactants and the final state refers to the products:

$$\Delta E = E_{products} - E_{reactants}$$

* If $\Delta E$ is **positive** ($\Delta E > 0$), it indicates that the final internal energy is greater than the initial internal energy. The system has gained energy from its surroundings.
* If $\Delta E$ is **negative** ($\Delta E < 0$), it indicates that the final internal energy is less than the initial internal energy. The system has released energy to its surroundings.

### Relating $\Delta E$ to Heat and Work

As established in the previous section, a closed system can exchange energy with its surroundings only in the form of heat ($q$) or work ($w$). Therefore, the change in the internal energy of a system must be equal to the sum of the heat transferred to or from the system and the work done on or by the system.

This leads to the mathematical expression of the First Law of Thermodynamics:

$$\Delta E = q + w$$

When using this equation, we must strictly adhere to thermodynamic sign conventions. The signs for $q$ and $w$ are always assigned from the perspective of the *system*.

* **Heat ($q$):**
* When heat is added to the system from the surroundings, $q$ is positive ($+q$). The process is **endothermic**.
* When heat is lost by the system to the surroundings, $q$ is negative ($-q$). The process is **exothermic**.

* **Work ($w$):**
* When work is done *on* the system by the surroundings (e.g., compression of a gas), $w$ is positive ($+w$).
* When work is done *by* the system on the surroundings (e.g., expansion of a gas), $w$ is negative ($-w$).

By evaluating the signs of $q$ and $w$, we can determine the overall sign of $\Delta E$.

```text
+-------------------------------------------------------------+
|          Summary of Thermodynamic Sign Conventions          |
+-------------------+-----------------------------------------+
|     Variable      |                 Sign                    |
+-------------------+-----------------------------------------+
|     Heat (q)      |  + (System gains heat; endothermic)     |
|                   |  - (System loses heat; exothermic)      |
+-------------------+-----------------------------------------+
|     Work (w)      |  + (Work done ON the system)            |
|                   |  - (Work done BY the system)            |
+-------------------+-----------------------------------------+
| Internal Energy   |  + (Net energy gained by system)        |
| Change (\Delta E) |  - (Net energy lost by system)          |
+-------------------+-----------------------------------------+

```

### State Functions vs. Path Functions

When discussing internal energy, it is crucial to recognize that $E$ is a **state function**. A state function is a property of a system that depends only on its present state, or condition, and not on the path or history taken to reach that state.

The value of a state function depends solely on parameters like temperature, pressure, and the amount of substance present. Therefore, $\Delta E$ depends only on the initial and final states of the system, not on how the change occurred.

To illustrate this, consider a battery discharging. Whether the battery is short-circuited to quickly generate only heat, or hooked up to a motor to perform mechanical work while generating a smaller amount of heat, the total change in the battery's internal energy ($\Delta E$) will be identical in both scenarios as long as it starts fully charged and ends completely discharged.

However, heat ($q$) and work ($w$) are **not** state functions. They are *path functions*. The specific amounts of heat released and work performed depend entirely on how the process is carried out. In the battery example, the fast short-circuit produces a large $-q$ and zero $w$. The motor scenario produces a smaller $-q$ and a significant $-w$. While the individual values of $q$ and $w$ vary wildly depending on the path, their sum ($q + w$) will always equal the exact same $\Delta E$, perfectly upholding the First Law of Thermodynamics.

## 12.3 Enthalpy and State Functions

In the previous section, we established that the change in internal energy ($\Delta E$) is a measure of all heat and work exchanged by a system ($\Delta E = q + w$). However, in a typical chemistry laboratory setting, reactions are rarely carried out in sealed, constant-volume containers where the system is forced to perform no pressure-volume work ($w = 0$). Instead, most chemical reactions—from dissolving salt in a beaker to the combustion of wood in a campfire—occur in open containers under the constant atmospheric pressure of our environment.

When a reaction occurs at constant pressure, the system can expand or contract, meaning pressure-volume work ($w = -P\Delta V$) is often involved. To account for heat flow in these incredibly common constant-pressure scenarios, chemists define a new state function called **enthalpy**.

### Defining Enthalpy

Enthalpy, denoted by the symbol $H$, is formally defined as the internal energy of a system plus the product of its pressure and volume:

$$H = E + PV$$

Because internal energy ($E$), pressure ($P$), and volume ($V$) are all state functions—meaning their values depend only on the current state of the system and not on the path taken to reach it—**enthalpy ($H$) is also a state function**.

Just as with internal energy, it is impossible to measure the absolute enthalpy of a system. We can only measure the *change* in enthalpy ($\Delta H$) that occurs during a process. For a process occurring at constant pressure, the change in enthalpy is given by:

$$\Delta H = \Delta (E + PV) = \Delta E + P\Delta V$$

### Enthalpy and Heat Flow ($q_p$)

The true utility of enthalpy becomes apparent when we combine its definition with the First Law of Thermodynamics ($\Delta E = q + w$) and the definition of pressure-volume work ($w = -P\Delta V$).

If a process occurs at constant pressure and the only work done is pressure-volume work, we can substitute $q_p + w$ (where $q_p$ specifically denotes heat transferred at constant pressure) for $\Delta E$:

$$\Delta H = (q_p + w) + P\Delta V$$

Since $w = -P\Delta V$, it follows that $-w = P\Delta V$. Substituting this into the equation yields:

$$\Delta H = (q_p + w) - w$$

$$\Delta H = q_p$$

This mathematical proof leads to a fundamental principle in thermodynamics: **At constant pressure, the change in enthalpy ($\Delta H$) of a system is exactly equal to the heat gained or lost by the system.**

Because enthalpy is a state function, the heat flow at constant pressure ($q_p$) only depends on the initial and final states of the reaction, regardless of how many intermediate steps the reaction takes.

### Endothermic and Exothermic Processes

Because $\Delta H$ equals the heat transferred at constant pressure, the sign of $\Delta H$ directly indicates the direction of heat flow:

* **Positive $\Delta H$ ($\Delta H > 0$):** The system absorbs heat from its surroundings. The enthalpy of the products is greater than the enthalpy of the reactants. This is an **endothermic** process. Feeling a cold pack turn icy is an everyday example of an endothermic chemical reaction; the system is absorbing heat from your hand.
* **Negative $\Delta H$ ($\Delta H < 0$):** The system releases heat to its surroundings. The enthalpy of the products is less than the enthalpy of the reactants. This is an **exothermic** process. The combustion of gasoline is a highly exothermic reaction, releasing substantial heat to its surroundings.

These energy changes are often visualized using enthalpy diagrams (also called energy level diagrams):

```text
       ENDOTHERMIC PROCESS (ΔH > 0)             EXOTHERMIC PROCESS (ΔH < 0)
       
             Enthalpy (H)                             Enthalpy (H)
                  ^                                        ^
                  |      [Products]                        |    [Reactants]
                  |     -------------                      |   -------------
                  |           ^                            |         |
                  |           |                            |         |
                  |           | +ΔH (Heat Absorbed)        |         | -ΔH (Heat Released)
                  |           |                            |         |
                  |     -------------                      |   -------------
                  |      [Reactants]                       |     [Products]
                  +--------------------->                  +--------------------->
                    Reaction Progress                        Reaction Progress

```

### Comparing $\Delta H$ and $\Delta E$

While internal energy change ($\Delta E$) and enthalpy change ($\Delta H$) are distinct concepts, their numerical values are often very close for chemical reactions.

Consider the relationship $\Delta H = \Delta E + P\Delta V$.

1. **Reactions involving only solids and liquids:** The volumes of solids and liquids change very little during a reaction, meaning $\Delta V \approx 0$. Consequently, $P\Delta V \approx 0$, and $\Delta H \approx \Delta E$.
2. **Reactions involving gases:** If the number of moles of gas changes during a reaction, the volume will change significantly ($\Delta V \neq 0$). For example, in the combustion of hydrogen gas to form liquid water:

$$2\text{H}_2(g) + \text{O}_2(g) \rightarrow 2\text{H}_2\text{O}(l)$$

Here, 3 moles of gaseous reactants are converted into 0 moles of gaseous products. The volume of the system decreases sharply, meaning work is done *on* the system by the atmosphere ($-P\Delta V$ is positive). In this case, $\Delta E$ and $\Delta H$ will differ by the quantity $P\Delta V$.

However, even for reactions that produce or consume gases, the $P\Delta V$ term is usually quite small compared to the overall heat transfer ($q_p$). For instance, in the combustion of methane, $\Delta H$ is $-890 \text{ kJ}$, while the $P\Delta V$ work term is only about $-2.5 \text{ kJ}$. Therefore, for most practical chemical applications, $\Delta H$ is the primary focus, as it serves as an excellent and highly practical measure of the energetic changes occurring in a standard laboratory environment.

## 12.4 Enthalpies of Reaction ($\Delta H$)

Because the majority of chemical reactions in the laboratory and in nature occur under the constant pressure of Earth's atmosphere, we can use enthalpy ($H$) as our primary tool for measuring energy changes. The enthalpy change that accompanies a chemical reaction is called the **enthalpy of reaction**, or the **heat of reaction**, and is denoted as **$\Delta H_{rxn}$**.

We can express the enthalpy of a reaction mathematically by applying the concept of $\Delta H = H_{final} - H_{initial}$ to a chemical process:

$$\Delta H_{rxn} = H(\text{products}) - H(\text{reactants})$$

When we write a balanced chemical equation and explicitly state the corresponding enthalpy change ($\Delta H$) alongside it, we create a **thermochemical equation**.

Consider the highly exothermic combustion of methane gas ($\text{CH}_4$), the primary component of natural gas, with oxygen to form carbon dioxide and liquid water. The thermochemical equation for this process is:

$$\text{CH}_4(g) + 2\text{O}_2(g) \rightarrow \text{CO}_2(g) + 2\text{H}_2\text{O}(l) \quad \Delta H = -890.4 \text{ kJ}$$

The negative sign indicates that $890.4 \text{ kJ}$ of heat are released to the surroundings when one mole of methane reacts with two moles of oxygen.

When working with thermochemical equations, there are three critical guidelines you must follow to accurately interpret and manipulate energy changes.

### Guideline 1: Enthalpy is an Extensive Property

Properties in chemistry are either intensive (independent of the amount of substance, like temperature or density) or extensive (dependent on the amount of substance, like mass or volume). **Enthalpy is an extensive property.**

The magnitude of $\Delta H$ is directly proportional to the amount of reactant consumed in the process. The $\Delta H$ value given in a thermochemical equation specifically refers to the number of moles of substances dictated by the stoichiometric coefficients.

If you double the amount of matter reacting, you double the amount of heat released or absorbed. Using the methane combustion example, if we burn two moles of methane instead of one, we must multiply the entire equation, including the $\Delta H$ value, by two:

$$2\text{CH}_4(g) + 4\text{O}_2(g) \rightarrow 2\text{CO}_2(g) + 4\text{H}_2\text{O}(l) \quad \Delta H = -1780.8 \text{ kJ}$$

This extensive nature is highly practical. It allows chemists to use $\Delta H$ as a stoichiometric conversion factor to calculate the heat produced or absorbed by any given mass of reactant.

### Guideline 2: The Enthalpy Change for a Reverse Reaction is Equal in Magnitude but Opposite in Sign

If a chemical reaction is exothermic in the forward direction, it must be endothermic by the exact same amount in the reverse direction. This is a direct consequence of the First Law of Thermodynamics; energy cannot be created or destroyed.

If we reverse the combustion of methane—a process that would require us to input energy to convert carbon dioxide and water back into methane and oxygen—the sign of $\Delta H$ flips from negative to positive:

$$\text{CO}_2(g) + 2\text{H}_2\text{O}(l) \rightarrow \text{CH}_4(g) + 2\text{O}_2(g) \quad \Delta H = +890.4 \text{ kJ}$$

We can visualize this relationship using a simple enthalpy diagram. The absolute "distance" between the energy levels of the reactants and products is constant, but the direction of the arrow dictates whether heat is absorbed or released:

```text
    Enthalpy (H)
         ^
         |
         |      CH4(g) + 2O2(g)
         |     -----------------
         |        |         ^
         |        |         |
         |        | -890.4  | +890.4 
         |        |   kJ    |   kJ
         |        |         |
         |        V         |
         |     -----------------
         |      CO2(g) + 2H2O(l)
         |
         +------------------------>

```

### Guideline 3: Enthalpy Change Depends on the States of Reactants and Products

The physical state (solid, liquid, or gas) of every reactant and product must be specified in a thermochemical equation because phase changes themselves involve enthalpy changes.

Consider what happens if the combustion of methane produces water vapor ($\text{H}_2\text{O}(g)$) instead of liquid water ($\text{H}_2\text{O}(l)$).

$$\text{CH}_4(g) + 2\text{O}_2(g) \rightarrow \text{CO}_2(g) + 2\text{H}_2\text{O}(g) \quad \Delta H = -802.4 \text{ kJ}$$

Notice that less heat is released to the surroundings ($-802.4 \text{ kJ}$) compared to when liquid water is formed ($-890.4 \text{ kJ}$). Why does this happen?

Liquid water has less enthalpy than water vapor. To convert liquid water into a gas (boiling/vaporization), energy must be absorbed. If the reaction leaves the water in the gaseous state, the system retains some of that chemical energy to keep the water molecules spread apart. Specifically, it takes $88.0 \text{ kJ}$ of energy to vaporize two moles of liquid water. Therefore, producing water vapor "costs" the system some of the heat it would have otherwise released to the surroundings.

This makes it absolutely essential to write the phase subscripts—$(s)$, $(l)$, $(g)$, or $(aq)$—for every chemical species when dealing with thermochemical equations.

## 12.5 Principles of Calorimetry

The measurement of heat flow into or out of a system for chemical and physical processes is known as **calorimetry**. The apparatus used to measure this heat flow is called a **calorimeter**. Because we cannot directly measure the enthalpy or internal energy of a system, we instead measure the temperature change the system causes in its surroundings (the calorimeter and its contents) to calculate the heat transferred.

### Heat Capacity and Specific Heat

Before examining calorimeters, we must quantify how temperature responds to the addition or removal of heat. The temperature change experienced by an object when it absorbs a certain amount of heat depends on its **heat capacity** ($C$). The heat capacity of an object is the amount of heat required to raise its temperature by $1 \text{ K}$ (or $1\ ^\circ\text{C}$). The greater the heat capacity, the more heat is required to produce a given increase in temperature.

For pure substances, heat capacity is an extensive property; a swimming pool full of water has a vastly larger heat capacity than a cup of water. It is more useful to define the heat capacity for a specific, standardized amount of the substance:

* **Molar Heat Capacity ($C_m$):** The heat capacity of one mole of a substance.
* **Specific Heat Capacity (or specific heat, $C_s$):** The heat capacity of one gram of a substance.

Specific heat is determined experimentally by measuring the temperature change ($\Delta T$) that a known mass ($m$) of the substance undergoes when it gains or loses a specific quantity of heat ($q$):

$$C_s = \frac{q}{m \times \Delta T}$$

Rearranging this equation gives us the fundamental formula used in calorimetry to calculate heat flow:

$$q = m \times C_s \times \Delta T$$

Liquid water has an exceptionally high specific heat of $4.184 \text{ J/(g}\cdot^\circ\text{C)}$. This means it takes $4.184 \text{ J}$ of energy to raise the temperature of $1 \text{ g}$ of water by $1\ ^\circ\text{C}$. This property makes water an ideal surrounding medium for capturing and measuring heat in calorimeters.

### Constant-Pressure Calorimetry

For many reactions, particularly those occurring in aqueous solutions, a simple "coffee-cup" calorimeter is sufficient. This device consists of two nested Styrofoam cups, a loosely fitting cover, a thermometer, and a stirrer.

```text
       +------------------------+
       |                        |
       |      Thermometer       |
       |           |            |
       |     +-----|------+     |
       |     |     |      |     | <-- Cork/Styrofoam Lid
       |     |     |  |   |     | <-- Glass Stirrer
       |   +-|-----|--|---|-+   |
       |   | |     |  |   | |   |
       |   | |     V  V   | |   | <-- Nested Styrofoam Cups
       |   | |  ........  | |   |
       |   | |  ........  | |   | <-- Aqueous Reaction Mixture
       |   | +------------+ |   |
       |   +----------------+   |
       +------------------------+

```

Because the calorimeter is not sealed against the atmosphere, the reaction occurs under constant pressure. Therefore, the heat measured by this device is precisely the enthalpy change of the reaction ($\Delta H = q_p$).

When two aqueous solutions are mixed in the calorimeter, the reaction serves as the *system*, and the water (the bulk of the solution) serves as the *surroundings*. We assume the Styrofoam is a perfect insulator, meaning no heat is lost to the outside room. Thus, any heat released by the reaction ($q_{rxn}$) is perfectly absorbed by the solution ($q_{soln}$):

$$q_{rxn} + q_{soln} = 0$$

$$q_{rxn} = -q_{soln}$$

To find $q_{soln}$, we measure the mass of the solution, the temperature change ($\Delta T = T_{final} - T_{initial}$), and use the specific heat of the solution (which is usually approximated as the specific heat of pure water, $4.184 \text{ J/(g}\cdot^\circ\text{C)}$):

$$q_{soln} = m_{soln} \times C_{s,soln} \times \Delta T$$

* If the reaction is exothermic, it releases heat. The temperature of the solution rises ($\Delta T > 0$), making $q_{soln}$ positive and $q_{rxn}$ negative ($\Delta H < 0$).
* If the reaction is endothermic, it absorbs heat. The temperature of the solution falls ($\Delta T < 0$), making $q_{soln}$ negative and $q_{rxn}$ positive ($\Delta H > 0$).

### Constant-Volume (Bomb) Calorimetry

Reactions involving gases, such as combustion reactions, cannot be safely or accurately studied in a coffee-cup calorimeter. Instead, they are carried out in a **bomb calorimeter**.

The substance to be analyzed is placed in a small, heavy-walled steel container called the "bomb," which is then pressurized with pure oxygen gas. The bomb is submerged in a precisely measured volume of water inside a heavily insulated outer container.

```text
         +--------------------------------+
         |                                |
         |          Thermometer           |
         |               |                |
         |      +--------|--------+       |
         |      |        |        |       | <-- Insulated Outer Jacket
         |      |   +----|----+   |       |
         |      |   |    |    |   |       | <-- Water Bath
         |      |   |  +-|-+  |   |       |
         |      |   |  | * |  |   |       | <-- Steel Bomb (Constant Volume)
         |   |  |   |  +---+  |   |  |    | <-- Stirrer
         |   V  |   +---------+   |  V    |
         |      +-----------------+       |
         +--------------------------------+

```

An electrical current is passed through a fine wire to ignite the sample. Because the heavy steel bomb cannot expand or contract, the volume of the system is rigidly fixed ($\Delta V = 0$). As a result, no pressure-volume work is done ($w = -P\Delta V = 0$).

Because no work is done, the First Law of Thermodynamics ($\Delta E = q + w$) dictates that the heat transferred at constant volume ($q_v$) is exactly equal to the change in internal energy ($\Delta E$):

$$\Delta E = q_v$$

To calculate the heat released, we do not calculate the mass and specific heat of every individual component of the calorimeter. Instead, the entire calorimeter (bomb, water, stirrer, thermometer) is calibrated beforehand to determine its total heat capacity, known as the calorimeter constant ($C_{cal}$).

The heat absorbed by the calorimeter is simply the product of its total heat capacity and the temperature change:

$$q_{cal} = C_{cal} \times \Delta T$$

Because the calorimeter acts as an isolated system, the heat released by the reaction is completely absorbed by the calorimeter:

$$q_{rxn} = -q_{cal} = -C_{cal} \times \Delta T$$

It is important to remember that bomb calorimetry measures the internal energy change ($\Delta E$), not the enthalpy change ($\Delta H$), because the pressure inside the bomb changes during the reaction. However, as noted in earlier sections, the numerical difference between $\Delta E$ and $\Delta H$ is typically very small. By applying the ideal gas law to account for the change in the number of moles of gas, $\Delta E$ can be easily converted to $\Delta H$ to yield the standard enthalpy of combustion.

## 12.6 Hess's Law

As established in Section 12.3, enthalpy ($H$) is a state function. This fundamental property means that the change in enthalpy ($\Delta H$) for any chemical reaction depends solely on the initial state of the reactants and the final state of the products, completely independent of the specific pathway or the number of steps taken to get from one to the other.

In 1840, the Swiss-Russian chemist Germain Hess formalized this concept into a powerful predictive tool. **Hess's Law of Heat Summation** states that if a reaction is carried out in a series of steps, the $\Delta H$ for the overall reaction will equal the sum of the enthalpy changes for the individual steps.

Hess's Law is immensely practical because it allows us to calculate the enthalpy change for a reaction that might be impossible to measure directly in a laboratory (such as one that occurs too slowly, produces unwanted side products, or is too dangerous to perform). We can determine the unknown $\Delta H$ by mathematically combining the $\Delta H$ values of other, easily measurable reactions.

### Applying Hess's Law

To use Hess's Law, you manipulate a set of known thermochemical equations to algebraically add up to the desired target equation. When doing so, you must recall the guidelines for thermochemical equations discussed in Section 12.4:

1. **Reversing a reaction:** If you reverse the direction of a chemical equation, you must flip the sign of its $\Delta H$. An exothermic reaction becomes endothermic in reverse, and vice versa.
2. **Multiplying by a factor:** Enthalpy is an extensive property. If you multiply all the coefficients of an equation by a number (like 2, or 1/2), you must multiply the $\Delta H$ value by that exact same number.

### A Classical Example: The Formation of Carbon Monoxide

Consider the formation of carbon monoxide gas from graphite and oxygen:

$$\text{C}(s, \text{graphite}) + \frac{1}{2}\text{O}_2(g) \rightarrow \text{CO}(g) \quad \Delta H = ?$$

It is virtually impossible to measure this $\Delta H$ directly in a calorimeter. If you burn carbon in a limited supply of oxygen, you never get pure carbon monoxide; it will always be a mixture of unreacted carbon, carbon monoxide, and carbon dioxide.

However, we *can* easily and precisely measure the complete combustion of carbon to carbon dioxide, and the combustion of carbon monoxide to carbon dioxide. We can use these two known reactions as our steps:

**Step 1:** $\text{C}(s, \text{graphite}) + \text{O}_2(g) \rightarrow \text{CO}_2(g) \quad \Delta H_1 = -393.5 \text{ kJ}$
**Step 2:** $\text{CO}(g) + \frac{1}{2}\text{O}_2(g) \rightarrow \text{CO}_2(g) \quad \Delta H_2 = -283.0 \text{ kJ}$

Our goal is to rearrange these steps so that they add up to our target equation.

* **Looking at Step 1:** We need $\text{C}(s)$ on the reactant side. Step 1 has $\text{C}(s)$ on the reactant side, with the correct coefficient of 1. We will leave Step 1 exactly as it is.
* **Looking at Step 2:** We need $\text{CO}(g)$ on the *product* side of our target equation, but Step 2 has it on the reactant side. Therefore, we must **reverse** Step 2. When we reverse the equation, we change the sign of $\Delta H_2$ from negative to positive:

**Reversed Step 2:** $\text{CO}_2(g) \rightarrow \text{CO}(g) + \frac{1}{2}\text{O}_2(g) \quad \Delta H = +283.0 \text{ kJ}$

Now, we add Step 1 and the Reversed Step 2 together, cancelling out any chemical species that appear in equal amounts on both sides of the arrow (just like algebraic variables):

$$
\begin{array}{rll}
\text{C}(s) + \text{O}_2(g) & \rightarrow \text{CO}_2(g) & \Delta H = -393.5 \text{ kJ} \\
\text{CO}_2(g) & \rightarrow \text{CO}(g) + \frac{1}{2}\text{O}_2(g) & \Delta H = +283.0 \text{ kJ} \\
\hline
\text{C}(s) + \text{O}_2(g) + \text{CO}_2(g) & \rightarrow \text{CO}_2(g) + \text{CO}(g) + \frac{1}{2}\text{O}_2(g) & \Delta H_{total} = ?
\end{array}
$$

Notice that $\text{CO}_2(g)$ appears on both sides, so it cancels out entirely. We have one full $\text{O}_2(g)$ on the left and a half $\text{O}_2(g)$ on the right; the half cancels, leaving a net $\frac{1}{2}\text{O}_2(g)$ on the left:

$$\text{C}(s) + \frac{1}{2}\text{O}_2(g) \rightarrow \text{CO}(g)$$

Because our manipulated equations successfully added up to the target equation, we simply add their corresponding $\Delta H$ values to find the final enthalpy of reaction:

$$\Delta H_{target} = (-393.5 \text{ kJ}) + (+283.0 \text{ kJ}) = -110.5 \text{ kJ}$$

### Visualizing Hess's Law

We can represent this path-independence using an enthalpy diagram. Whether the carbon goes directly to carbon dioxide (one step) or stops at carbon monoxide first (two steps), the total drop in enthalpy is identical.

```text
       Enthalpy (H)
            ^
            |  C(s) + O2(g)
     0 kJ   | ---------------------
            |       |         |
            |       |         | Path B (Step 1)
            |       |         | ΔH = -110.5 kJ
            |       |         v
 -110.5 kJ  |       |     CO(g) + 1/2 O2(g)
            |       |    ---------------------
            |       |                 |
            | Path A (Direct)         | Path B (Step 2)
            | ΔH = -393.5 kJ          | ΔH = -283.0 kJ
            |       |                 |
            |       v                 v
 -393.5 kJ  | ---------------------
            |       CO2(g)
            +------------------------------------->

```

As the diagram illustrates, $\Delta H$ depends only on the starting point and the ending point. The overall energetic distance from $\text{C}(s) + \text{O}_2(g)$ down to $\text{CO}_2(g)$ is fixed at -393.5 kJ, proving that the sum of the two intermediate steps must equal the whole. This principle remains true regardless of how complex the reaction or how many steps are involved.

## 12.7 Standard Enthalpies of Formation

Hess's Law is a profoundly useful concept, but to calculate the enthalpy of a reaction using it, we need a source of known $\Delta H$ values. It would be impossible and overwhelmingly complex to tabulate the $\Delta H$ for every conceivable chemical reaction. Instead, chemists have established a baseline standard and tabulated the enthalpies for a specific, highly controlled type of reaction: the formation of a single compound from its constituent elements.

These values are known as **standard enthalpies of formation** ($\Delta H_f^\circ$).

### Standard States

The magnitude of an enthalpy change depends on the temperature, pressure, and state (gas, liquid, solid, or crystalline form) of the reactants and products. To ensure a universal baseline for comparing thermodynamic values, we define a **standard state** for all substances.

The standard state of a substance is its pure form at exactly $1 \text{ atm}$ of pressure. Although temperature is not formally part of the standard state definition, thermodynamic tables overwhelmingly report values at **$298 \text{ K}$ ($25\ ^\circ\text{C}$)**. For substances in an aqueous solution, the standard state is a concentration of exactly $1 \text{ M}$.

When the enthalpy change of a reaction is measured with all reactants and products in their standard states, it is called the **standard enthalpy of reaction** ($\Delta H_{rxn}^\circ$). The degree symbol ($^\circ$) specifically denotes standard state conditions.

### Defining $\Delta H_f^\circ$

The **standard enthalpy of formation** ($\Delta H_f^\circ$) of a compound is defined as the change in enthalpy that occurs when exactly *one mole* of the compound is formed from its constituent elements, with all substances in their standard states.

Because it is impossible to measure absolute enthalpy ($H$), we must define an arbitrary zero point, much like sea level is used as the zero point for measuring geographical altitude.

**By definition, the standard enthalpy of formation of the most stable form of any element in its standard state is zero.**

For example, at $298 \text{ K}$ and $1 \text{ atm}$, the most stable form of oxygen is diatomic oxygen gas ($O_2$); therefore, $\Delta H_f^\circ$ for $O_2(g)$ is $0 \text{ kJ/mol}$. The standard enthalpy of formation for ozone ($O_3(g)$), a less stable form of oxygen, is $+142.3 \text{ kJ/mol}$. Similarly, carbon exists in multiple solid forms (allotropes). Graphite is the most stable form at standard conditions, so its $\Delta H_f^\circ$ is zero, while diamond, being slightly less stable, has a $\Delta H_f^\circ$ of $+1.88 \text{ kJ/mol}$.

```text
+-------------------------------------------------------------+
|    Selected Standard Enthalpies of Formation at 298 K       |
+-------------------+---------+-------------------------------+
| Substance         | Formula |    ΔH_f° (kJ/mol)             |
+-------------------+---------+-------------------------------+
| Water (liquid)    | H2O(l)  |      -285.8                   |
| Water (gas)       | H2O(g)  |      -241.8                   |
| Carbon dioxide    | CO2(g)  |      -393.5                   |
| Methane           | CH4(g)  |       -74.8                   |
| Propane           | C3H8(g) |      -103.85                  |
| Ammonia           | NH3(g)  |       -46.1                   |
| Sodium chloride   | NaCl(s) |      -411.2                   |
| Oxygen (gas)      | O2(g)   |         0.0                   |
| Carbon (graphite) | C(s)    |         0.0                   |
| Carbon (diamond)  | C(s)    |        +1.88                  |
+-------------------+---------+-------------------------------+

```

Notice that the formation of most stable compounds from their elements is exothermic ($\Delta H_f^\circ < 0$).

### Calculating $\Delta H_{rxn}^\circ$ from $\Delta H_f^\circ$ Values

The true power of standard enthalpies of formation lies in their ability to let us calculate the standard enthalpy change for *any* reaction, as long as we know the $\Delta H_f^\circ$ values for all reactants and products.

Using Hess's Law, we can conceptually envision any chemical reaction breaking down its reactants completely into their elemental forms (the reverse of formation), and then recombining those elements to form the products.

This concept provides us with one of the most widely used equations in thermodynamics:

$$\Delta H_{rxn}^\circ = \sum n\Delta H_f^\circ(\text{products}) - \sum m\Delta H_f^\circ(\text{reactants})$$

In this equation:

* $\sum$ (sigma) means "the sum of."
* $n$ and $m$ represent the stoichiometric coefficients from the balanced chemical equation for the products and reactants, respectively.

### An Applied Calculation Example

Let us calculate the standard enthalpy of combustion for propane gas ($C_3H_8$), a common fuel used in grills. First, we write the balanced chemical equation:

$$C_3H_8(g) + 5O_2(g) \rightarrow 3CO_2(g) + 4H_2O(l)$$

Next, we apply the summation formula, pulling the necessary $\Delta H_f^\circ$ values from the table above:

$$\Delta H_{rxn}^\circ = [3(\Delta H_f^\circ \text{ of } CO_2) + 4(\Delta H_f^\circ \text{ of } H_2O)] - [1(\Delta H_f^\circ \text{ of } C_3H_8) + 5(\Delta H_f^\circ \text{ of } O_2)]$$

Substituting the numerical values (and remembering that $O_2(g)$ is an element in its standard state, so its value is zero):

$$\Delta H_{rxn}^\circ = [3(-393.5 \text{ kJ}) + 4(-285.8 \text{ kJ})] - [1(-103.85 \text{ kJ}) + 5(0 \text{ kJ})]$$

$$\Delta H_{rxn}^\circ = [-1180.5 \text{ kJ} - 1143.2 \text{ kJ}] - [-103.85 \text{ kJ}]$$

$$\Delta H_{rxn}^\circ = [-2323.7 \text{ kJ}] + 103.85 \text{ kJ}$$

$$\Delta H_{rxn}^\circ = -2219.85 \text{ kJ}$$

The reaction releases roughly $2220 \text{ kJ}$ of heat per mole of propane burned. By standardizing these formation enthalpies, chemists have created an elegant and universal framework to map the energy landscape of countless chemical processes without needing to step foot in a laboratory to perform calorimetry for every single one.

## Chapter Summary

* **Thermodynamics and Energy:** Energy is the capacity to do work or transfer heat. Chemical energy is a form of potential energy stored in chemical bonds. Systems are defined as the specific portion of the universe under study, while everything else is the surroundings. Energy is transferred between them via heat ($q$) or work ($w$).
* **The First Law of Thermodynamics:** Energy cannot be created or destroyed. The change in the internal energy ($\Delta E$) of a system is the sum of the heat transferred and the work done ($\Delta E = q + w$). Internal energy is a state function, depending only on the current state of the system, not the path taken.
* **Enthalpy ($H$):** A thermodynamic state function defined as $H = E + PV$. At constant pressure, the change in enthalpy ($\Delta H$) is exactly equal to the heat transferred ($q_p$). Reactions that release heat are exothermic ($\Delta H < 0$), and those that absorb heat are endothermic ($\Delta H > 0$).
* **Enthalpies of Reaction:** The enthalpy change accompanying a chemical reaction is an extensive property, meaning it scales proportionally with the amount of reactants. Reversing a reaction reverses the sign of $\Delta H$.
* **Calorimetry:** The experimental measurement of heat flow. Constant-pressure calorimetry measures $\Delta H$ directly, often using a coffee-cup calorimeter. Constant-volume (bomb) calorimetry measures $\Delta E$, which can be mathematically related back to $\Delta H$.
* **Hess's Law:** Because enthalpy is a state function, the overall $\Delta H$ for a reaction is the sum of the enthalpy changes of its individual steps. This allows for the calculation of unknown reaction enthalpies using known, related reactions.
* **Standard Enthalpies of Formation ($\Delta H_f^\circ$):** The enthalpy change for forming one mole of a substance from its most stable elements under standard conditions ($1 \text{ atm}$, usually $298 \text{ K}$). Elements in their standard states have a $\Delta H_f^\circ$ of zero. These values allow chemists to calculate the standard enthalpy of any reaction using the formula $\Delta H_{rxn}^\circ = \sum n\Delta H_f^\circ(\text{products}) - \sum m\Delta H_f^\circ(\text{reactants})$.
