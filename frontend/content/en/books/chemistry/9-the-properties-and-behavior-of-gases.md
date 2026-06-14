Though often invisible, gases are fundamental to our existence. Unlike solids and liquids, gases expand to fill their containers and are highly compressible. In this chapter, we will explore the predictable macroscopic behavior of gases by examining the relationships between pressure, volume, temperature, and amount. These relationships culminate in the empirical gas laws and the ideal-gas equation. We will also delve into the kinetic-molecular theory—the microscopic model explaining these phenomena—and discover why real gases eventually deviate from ideal behavior under extreme physical conditions.

## 9.1 Characteristics of Gases and Gas Pressure

While we interact with solids and liquids constantly in our daily lives in highly visible ways, gases often go unnoticed because most are colorless and odorless. However, the atmosphere that surrounds us—a complex mixture of nitrogen, oxygen, argon, and trace gases—is fundamental to life and exhibits profound physical properties. Unlike solids and liquids, which have definite volumes, gases behave uniquely due to the large distances separating their particles.

### General Characteristics of Gases

Gases share a set of physical properties that distinguish them from the condensed states of matter (liquids and solids):

* **Expandability and Compressibility:** A gas will spontaneously expand to fill its container completely. Consequently, the volume of a gas is always equal to the volume of its container. Conversely, gases are highly compressible. When pressure is applied, the volume of a gas decreases significantly.
* **Homogeneous Mixing:** When two or more gases are introduced into the same container, they rapidly and completely mix to form a homogeneous mixture (a solution), regardless of their chemical identities. For example, the Earth's atmosphere is a homogeneous mixture of several gases.
* **Low Density:** Gases have much lower densities than liquids and solids. While the density of water is approximately 1.0 g/mL, the density of air at room temperature is roughly 0.0012 g/mL.

These macroscopic properties arise directly from the particulate nature of matter (introduced in Chapter 1). In a gas, molecules are relatively far apart and move rapidly, interacting minimally with one another except during collisions.

### The Concept of Pressure

Among the most important properties of a gas is the pressure it exerts on its surroundings. In physics, pressure ($P$) is defined as the force ($F$) exerted per unit of area ($A$):

$$P = \frac{F}{A}$$

Gases exert pressure on any surface they contact because gas molecules are in constant, random motion, continuously colliding with the walls of their container. While the force of a single molecular collision is imperceptible, the cumulative force of astronomical numbers of molecules striking the walls every second results in a steady, measurable macroscopic pressure.

### Atmospheric Pressure and the Barometer

The Earth's gravity pulls gas molecules in the atmosphere toward the surface, resulting in **atmospheric pressure**. We do not feel this pressure because the fluids within our bodies exert an outward pressure that perfectly balances the inward atmospheric pressure.

Atmospheric pressure is measured using a device called a **barometer**, invented in 1643 by Evangelista Torricelli, a student of Galileo. A simple mercury barometer consists of a long glass tube closed at one end, filled completely with mercury (Hg), and inverted into a dish of mercury.

```text
       Closed End
       __________
       |        |
       | Vacuum | <-- P = 0
       |________|
       |        |
       |        | } h (Height of mercury column)
       |        |
 ______|        |______
|      |        |      | <-- Atmospheric Pressure exerts
|      |________|      |     force on the mercury surface
|   Mercury Pool       |
|______________________|

```

The mercury in the tube falls until the pressure exerted by its weight at the base of the column perfectly balances the atmospheric pressure pushing down on the surface of the mercury in the dish. At sea level and 0 °C, standard atmospheric pressure supports a mercury column exactly 760 mm high.

### Units of Pressure

Because pressure is $F/A$, its fundamental SI unit is derived from the SI units of force (the newton, N) and area (square meters, $m^2$). One newton per square meter is defined as one **pascal (Pa)**:

$$1 \text{ Pa} = 1 \text{ N/m}^2$$

Because the pascal is a very small unit of pressure, the **kilopascal (kPa)** is often used.

In chemistry, however, non-SI units based on the barometer are frequently utilized. The most common are the millimeter of mercury (mmHg), the torr (named after Torricelli), and the atmosphere (atm).

**Standard atmospheric pressure** is defined exactly as the pressure sufficient to support a column of mercury 760 mm high. The relationships between these units are essential for stoichiometric and thermodynamic calculations:

$$1 \text{ atm} = 760 \text{ mmHg} = 760 \text{ torr} = 101,325 \text{ Pa} = 101.325 \text{ kPa}$$

Another unit frequently used in meteorology and physical chemistry is the **bar**:

$$1 \text{ bar} = 10^5 \text{ Pa} = 100 \text{ kPa}$$

*(Note: 1 atm is slightly greater than 1 bar; specifically, $1 \text{ atm} = 1.01325 \text{ bar}$.)*

### Measuring the Pressure of Confined Gases: The Manometer

While a barometer measures the pressure of the atmosphere, a **manometer** is used to measure the pressure of a gas confined within a closed container.

The most common type is the open-tube manometer, which consists of a U-shaped tube partially filled with a nonvolatile liquid (often mercury). One end of the U-tube is connected to the gas container, and the other end is open to the atmosphere.

```text
               Open to atmosphere (P_atm)
                       |   |
  Confined             |   |
    Gas                |   |
  _______              |   |
 /       \             |___| <-- Mercury level 2
|   Gas   |            |   |
 \_______/             |   | } \Delta h (difference in height)
     |  |______________|   |
     |   ______________    | <-- Mercury level 1
     |  |              |___|
     |__|

```

The pressure of the gas ($P_{gas}$) is determined by comparing the heights of the mercury in the two arms of the U-tube:

1. **If the gas pressure equals atmospheric pressure:** The mercury levels in both arms are completely equal ($\Delta h = 0$).
2. **If the gas pressure is greater than atmospheric pressure:** The gas pushes the mercury down on the flask side and up on the open side. The pressure of the gas is the atmospheric pressure plus the pressure exerted by the difference in the height of the mercury column ($\Delta h$).

$$P_{gas} = P_{atm} + \Delta h$$

1. **If the gas pressure is less than atmospheric pressure:** The atmosphere pushes the mercury down on the open side and up on the flask side. The pressure of the gas is the atmospheric pressure minus the pressure exerted by the column difference.

$$P_{gas} = P_{atm} - \Delta h$$

Understanding how to quantify gas pressure and convert between its various units is the critical first step in exploring the mathematical relationships between pressure, volume, temperature, and moles of a gas, which are codified in the empirical gas laws discussed in the next section.

## 9.2 The Empirical Gas Laws (Boyle, Charles, Avogadro)

The physical state of a given quantity of gas is fully described by four macroscopic variables: pressure ($P$), volume ($V$), temperature ($T$), and the amount of gas, usually expressed in moles ($n$). Early experiments in chemistry revealed that these four variables are not independent; altering one often forces a predictable change in another.

By holding two of these variables constant, scientists in the 17th, 18th, and 19th centuries were able to isolate and study the relationship between the remaining two. These foundational observations are known as the empirical gas laws.

### Boyle's Law: The Pressure-Volume Relationship

In 1662, the British chemist Robert Boyle used a J-shaped glass tube partially filled with mercury to trap a small volume of air. By adding more mercury to the open end of the tube, Boyle increased the pressure on the trapped air and observed a corresponding decrease in its volume.

Boyle discovered that the volume of a fixed quantity of gas maintained at a constant temperature is inversely proportional to the pressure. This means that if you double the pressure of a gas, its volume is halved. Mathematically, this inverse relationship is expressed as:

$$V \propto \frac{1}{P}$$

$$PV = \text{constant}$$

Because the product of pressure and volume is a constant for a given sample of gas at a constant temperature, we can establish a highly useful equation for a gas undergoing a change in conditions:

$$P_1V_1 = P_2V_2$$

*(Where $P_1$ and $V_1$ are the initial conditions, and $P_2$ and $V_2$ are the final conditions).*

We can visualize Boyle's Law through plain text graphical representations. Plotting volume versus pressure yields a hyperbolic curve, while plotting volume versus the inverse of pressure ($1/P$) yields a straight line passing through the origin.

```text
       Volume vs. Pressure                  Volume vs. 1/Pressure
 
   V |                                  V |
     |  *                                 |                  * 
     |    *                               |                *
     |      *                             |              *
     |        *                           |            *
     |          * * * *                   |          *
     |___________________                 |________*__________
               P                                  1/P

```

### Charles's Law: The Temperature-Volume Relationship

Hot air balloons rise because air expands when heated; as its volume increases, its density decreases compared to the cooler surrounding air. The relationship between gas volume and temperature was quantified by the French scientist Jacques Charles in 1787.

Charles observed that for a fixed quantity of gas at a constant pressure, the volume of the gas increases linearly with temperature. However, a critical detail emerges when extrapolating this linear relationship to lower temperatures. Regardless of the gas used, if the volume-temperature line is extrapolated to a volume of zero, the temperature always intercepts the axis at exactly -273.15 °C.

```text
              Volume vs. Temperature (Celsius)

         V |
           |                           * (Gas C)
           |                     *
           |               *           * (Gas B)
           |         *           *
           |   *           *           * (Gas A)
           |         *           *
  ---------|---*-----------*-----------*---------
   -273.15 |         0           100         200  
           |             Temperature (°C)

```

This absolute minimum temperature, where a theoretical gas would have zero volume, was defined by Lord Kelvin as **absolute zero**. This observation necessitated the creation of the Kelvin temperature scale, where 0 K = -273.15 °C.

Charles's Law states that the volume of a fixed amount of gas maintained at constant pressure is directly proportional to its absolute temperature (in Kelvin).

$$V \propto T$$

$$\frac{V}{T} = \text{constant}$$

For a gas undergoing a change in temperature or volume at constant pressure, the relationship is:

$$\frac{V_1}{T_1} = \frac{V_2}{T_2}$$

*Crucial Note: In all gas law calculations, temperatures MUST be expressed in Kelvin. Using Celsius will result in mathematical errors, particularly because Celsius temperatures can be zero or negative.*

### Avogadro's Law: The Quantity-Volume Relationship

In 1808, Joseph Louis Gay-Lussac observed the law of combining volumes: at a given pressure and temperature, the volumes of gases that react with one another are in the ratios of small whole numbers. Three years later, Amedeo Avogadro interpreted Gay-Lussac's observation by proposing a radical hypothesis: **equal volumes of gases at the same temperature and pressure contain equal numbers of molecules.**

For example, 1 liter of hydrogen gas and 1 liter of oxygen gas at the same temperature and pressure contain the exact same number of molecules, despite oxygen molecules being significantly heavier than hydrogen molecules.

Avogadro's Law mathematically states that the volume of a gas maintained at constant temperature and pressure is directly proportional to the number of moles ($n$) of the gas:

$$V \propto n$$

$$\frac{V}{n} = \text{constant}$$

When comparing two different states of a gas at constant $T$ and $P$, we use:

$$\frac{V_1}{n_1} = \frac{V_2}{n_2}$$

A direct consequence of Avogadro's Law is that at standard temperature and pressure (STP, defined as 0 °C and 1 atm), one mole of *any* ideal gas occupies exactly 22.4 liters. This value is known as the standard molar volume.

By understanding how volume responds to isolated changes in pressure, temperature, and molar quantity, we have the mathematical foundation necessary to combine all these variables into a single, comprehensive equation of state, which will be explored in the next section.

## 9.3 The Ideal-Gas Equation

In the previous section, we examined three empirical gas laws that describe how the volume of a gas responds to changes in pressure, temperature, and molar quantity when all other variables are held constant. These relationships can be summarized as proportionalities:

* **Boyle’s Law:** $V \propto \frac{1}{P}$ (at constant $n$ and $T$)
* **Charles’s Law:** $V \propto T$ (at constant $n$ and $P$)
* **Avogadro’s Law:** $V \propto n$ (at constant $P$ and $T$)

Because volume is proportional to all three of these quantities simultaneously, we can combine them into a single, overarching proportionality:

$$V \propto \frac{nT}{P}$$

To convert this proportionality into an equality, we must introduce a proportionality constant. In chemistry, this constant is denoted by the letter $R$ and is known as the **ideal-gas constant** (or universal gas constant). Inserting $R$ yields:

$$V = R\left(\frac{nT}{P}\right)$$

Rearranging this expression to eliminate the fraction provides one of the most fundamental and famous equations in all of chemistry, the **ideal-gas equation**:

$$PV = nRT$$

```text
+-------------------------------------------------------------+
|                THE IDEAL-GAS EQUATION                       |
|                                                             |
|                       P V = n R T                           |
|                                                             |
|  P = Pressure (must match the pressure unit in R)           |
|  V = Volume (usually in liters, L)                          |
|  n = Amount of gas (in moles, mol)                          |
|  R = Ideal-Gas Constant                                     |
|  T = Absolute Temperature (MUST be in Kelvin, K)            |
+-------------------------------------------------------------+

```

### The Ideal Gas Constant ($R$)

The value and units of $R$ depend entirely on the units chosen for pressure and volume, as temperature must always be in Kelvin and the quantity must always be in moles.

To determine the value of $R$, we can consider a gas at standard temperature and pressure (STP: 0 °C or 273.15 K, and 1 atm). As noted in Avogadro's Law, exactly 1 mole of an ideal gas at STP occupies 22.414 L. Solving the ideal-gas equation for $R$ yields:

$$R = \frac{PV}{nT} = \frac{(1.000 \text{ atm})(22.414 \text{ L})}{(1.000 \text{ mol})(273.15 \text{ K})} = 0.08206 \frac{\text{L}\cdot\text{atm}}{\text{mol}\cdot\text{K}}$$

When performing calculations using $PV = nRT$, it is critical to select the value of $R$ that matches the units of pressure provided in the problem.

**Common Values of the Ideal-Gas Constant ($R$)**

| Value | Units | Applications |
| --- | --- | --- |
| $0.08206$ | $\text{L}\cdot\text{atm}/(\text{mol}\cdot\text{K})$ | Standard gas law problems involving atmospheres. |
| $62.36$ | $\text{L}\cdot\text{torr}/(\text{mol}\cdot\text{K})$ | Gas law problems where pressure is in torr or mmHg. |
| $8.314$ | $\text{J}/(\text{mol}\cdot\text{K})$ | Thermodynamics and equations involving energy (SI unit). |
| $8.314$ | $\text{L}\cdot\text{kPa}/(\text{mol}\cdot\text{K})$ | Gas law problems where pressure is in kilopascals. |

*(Note: $1 \text{ J} = 1 \text{ kPa}\cdot\text{L}$. Therefore, the numerical value for $R$ in terms of Joules is identical to the value in terms of $\text{L}\cdot\text{kPa}$.)*

### What is an "Ideal" Gas?

The ideal-gas equation is a model. An **ideal gas** is a hypothetical substance whose pressure, volume, and temperature behavior is described perfectly by the equation $PV = nRT$ under all conditions.

In reality, no perfectly ideal gas exists. The ideal-gas equation assumes two things about the microscopic nature of the gas:

1. The molecules of the gas do not interact with one another (no attractive or repulsive forces).
2. The combined volume of the gas molecules themselves is zero (they are treated as point masses taking up no physical space compared to the container).

While these assumptions are technically false, the ideal-gas equation is remarkably accurate for almost all real gases at ordinary temperatures and pressures (such as room temperature and 1 atm). Under these conditions, molecules are moving quickly enough and are far enough apart that their interactions and their physical volumes are practically negligible. Deviations from ideal behavior only become significant at high pressures or very low temperatures, a topic that will be explored in Section 9.8.

### The Combined Gas Law

The ideal-gas equation is particularly useful when dealing with a single state of a gas. However, if a gas undergoes a change in conditions, we can isolate the constants to relate the initial state to the final state.

If the number of moles ($n$) remains constant (i.e., gas is neither added nor allowed to escape a closed container), then the ratio of $PV$ to $T$ must equal the constant $nR$:

$$\frac{PV}{T} = nR = \text{constant}$$

Because this ratio is a constant for a fixed quantity of gas, the ratio at the initial conditions (state 1) must equal the ratio at the final conditions (state 2). This relationship is known as the **combined gas law**:

$$\frac{P_1V_1}{T_1} = \frac{P_2V_2}{T_2}$$

This powerful equation encompasses Boyle's and Charles's laws. If temperature is held constant ($T_1 = T_2$), the denominators cancel, leaving Boyle's Law ($P_1V_1 = P_2V_2$). If pressure is held constant ($P_1 = P_2$), the numerators simplify to yield Charles's Law ($V_1/T_1 = V_2/T_2$). The combined gas law allows us to solve for any single missing variable when a trapped gas undergoes simultaneous changes in pressure, volume, and temperature.

## 9.4 Applications of the Ideal-Gas Equation: Density and Molar Mass

The ideal-gas equation, $PV=nRT$, is a powerful tool for describing the physical state of a gas. Beyond calculating pressure, volume, temperature, or moles, we can algebraically manipulate this equation to determine two other crucial properties of a gas: its density and its molar mass.

Unlike solids and liquids, whose densities are relatively constant regardless of conditions, the density of a gas is highly sensitive to changes in temperature and pressure. Understanding this relationship is fundamental to explaining phenomena ranging from the buoyancy of a hot air balloon to the stratification of the Earth's atmosphere.

### Calculating Gas Density

Density ($d$) is defined as mass ($m$) per unit volume ($V$).

$$d=\frac{m}{V}$$

To relate density to the ideal-gas equation, we must express the number of moles ($n$) in terms of mass and molar mass. The number of moles of a substance is equal to its mass in grams divided by its molar mass ($\mathcal{M}$) in grams per mole:

$$n=\frac{m}{\mathcal{M}}$$

We can substitute this expression for $n$ into the ideal-gas equation:

$$PV=\frac{m}{\mathcal{M}}RT$$

Next, we rearrange the equation to group mass and volume together, isolating $m/V$ on one side of the equality. We do this by dividing both sides by volume ($V$) and multiplying both sides by molar mass ($\mathcal{M}$):

$$\frac{P\mathcal{M}}{RT}=\frac{m}{V}$$

Because $m/V$ is the definition of density ($d$), we arrive at a new, highly useful equation for the density of an ideal gas:

$$d=\frac{P\mathcal{M}}{RT}$$

```text
+-------------------------------------------------------------+
|                DERIVING GAS DENSITY                         |
|                                                             |
|  1. Start with ideal gas law:      PV = nRT                 |
|  2. Substitute n = m/M:            PV = (m/M)RT             |
|  3. Rearrange to isolate m/V:      m/V = PM / RT            |
|  4. Substitute d for m/V:          d = PM / RT              |
|                                                             |
|  Where:                                                     |
|  d = density (g/L)                                          |
|  P = pressure (atm)                                         |
|  M = molar mass (g/mol)                                     |
|  R = 0.08206 L·atm/(mol·K)                                  |
|  T = absolute temperature (K)                               |
+-------------------------------------------------------------+

```

*(Note: Because gas volumes are typically measured in liters, gas density is usually expressed in units of grams per liter, g/L, unlike the g/mL or g/cm³ standard used for liquids and solids.)*

#### Implications of the Density Equation

The equation $d=\frac{P\mathcal{M}}{RT}$ mathematically confirms several observable behaviors of gases:

1. **Density and Molar Mass:** At a given temperature and pressure, the density of a gas is directly proportional to its molar mass. Heavier gas molecules, such as carbon dioxide ($\mathcal{M}=44.01\text{ g/mol}$), result in a denser gas than lighter molecules, such as helium ($\mathcal{M}=4.00\text{ g/mol}$). This is why helium balloons float; they are less dense than the surrounding air.
2. **Density and Pressure:** Density is directly proportional to pressure. Compressing a gas into a smaller volume forces the same mass into less space, increasing the density.
3. **Density and Temperature:** Density is inversely proportional to temperature. Heating a gas at constant pressure causes it to expand, distributing its mass over a larger volume and thereby lowering its density. This principle allows hot air balloons to rise: the heated air inside the envelope is less dense than the cooler atmospheric air outside.

### Determining Molar Mass of an Unknown Gas

The ability to relate the macroscopic properties of a gas (pressure, volume, temperature, and mass) to its molar mass provides chemists with a straightforward experimental method for identifying unknown volatile substances.

By rearranging the gas density equation to solve for molar mass ($\mathcal{M}$), we obtain:

$$\mathcal{M}=\frac{dRT}{P}$$

Alternatively, substituting $d=m/V$ back into the expression yields an equation that directly utilizes experimental laboratory measurements:

$$\mathcal{M}=\frac{mRT}{PV}$$

#### The Dumas Method

A classic laboratory application of this formula is the Dumas method for determining the molar mass of a volatile liquid (a liquid that vaporizes easily). The procedure involves the following conceptual steps:

1. A small sample of the unknown volatile liquid is placed in a flask of known volume ($V$) and mass.
2. The flask is submerged in a boiling water bath at a known temperature ($T$). The heat vaporizes the liquid completely.
3. As the liquid turns into a gas, it expands, pushing all the original air out of the flask through a tiny pinhole. Once the liquid is entirely vaporized, the flask is filled exclusively with the vapor of the unknown substance.
4. Because the flask is open to the atmosphere via the pinhole, the pressure of the vapor inside the flask equals the atmospheric pressure in the laboratory ($P$).
5. The flask is removed from the heat and quickly cooled, condensing the vapor back into a liquid.
6. The flask is weighed again. The difference between this final mass and the empty flask mass gives the mass of the condensed vapor ($m$).

With all four variables ($m$, $P$, $V$, and $T$) experimentally determined, the molar mass ($\mathcal{M}$) of the substance can be calculated. Once the molar mass is known, it can be combined with empirical formula data (discussed in Chapter 3) to determine the exact molecular formula of an unknown compound.

## 9.5 Gas Mixtures, Partial Pressures, and Mole Fractions

Thus far, our discussion has focused primarily on the behavior of pure gases. However, in nature and in the laboratory, we frequently encounter mixtures of gases. The air we breathe, for example, is a complex mixture of nitrogen, oxygen, argon, carbon dioxide, and water vapor.

A fundamental premise of the kinetic-molecular theory (which will be formally detailed in Section 9.6) is that gas molecules at ordinary temperatures and pressures are so far apart that they act independently of one another. Therefore, in a mixture of non-reacting ideal gases, each gas behaves exactly as if it were the only gas present in the container.

### Dalton's Law of Partial Pressures

In 1801, John Dalton—the same scientist who formulated the modern atomic theory—made a critical observation regarding gas mixtures. He discovered that the total pressure exerted by a mixture of gases is equal to the sum of the pressures that each individual gas would exert if it were present alone.

The pressure exerted by a single specific component in a mixture is called its **partial pressure**. Dalton’s observation is codified as **Dalton's Law of Partial Pressures**:

$$P_{total} = P_1 + P_2 + P_3 + \dots$$

*(Where $P_{total}$ is the total pressure of the mixture, and $P_1, P_2, P_3, \dots$ are the partial pressures of the individual gases).*

```text
  Flask 1 (Gas A)      Flask 2 (Gas B)         Flask 3 (Mixture A + B)
  Volume = 5.0 L       Volume = 5.0 L          Volume = 5.0 L
  Temp = 300 K         Temp = 300 K            Temp = 300 K

    [ .  .  . ]          [ *  *  * ]             [ .  *  .  * ]
    [  .  .   ]    +     [  *  *   ]      =      [  *  .  *   ]
    [ .  .  . ]          [ *  *  * ]             [ *  .  *  . ]
    
    P_A = 2.0 atm        P_B = 3.0 atm           P_total = 5.0 atm

```

We can prove this relationship using the ideal-gas equation. If each gas behaves independently, we can write a separate ideal-gas equation for each component:

$$P_1 = \frac{n_1RT}{V} \quad \text{and} \quad P_2 = \frac{n_2RT}{V}$$

Substituting these expressions into Dalton's Law yields:

$$P_{total} = \frac{n_1RT}{V} + \frac{n_2RT}{V} + \dots$$

Factoring out the common terms ($RT/V$), we get:

$$P_{total} = (n_1 + n_2 + \dots)\left(\frac{RT}{V}\right) = n_{total}\left(\frac{RT}{V}\right)$$

This equation demonstrates a profound characteristic of ideal gases: the total pressure of a mixture depends solely on the *total number of moles* of gas present, completely independent of the identity or nature of the gas molecules.

### Mole Fractions

Because the pressure of a gas in a mixture is directly proportional to the number of moles of that gas, we can relate partial pressure to the mixture's composition using a dimensionless concentration unit called the **mole fraction**.

The mole fraction, usually denoted by the symbol $X$, is the ratio of the number of moles of one component to the total number of moles in the mixture. For a component $A$:

$$X_A = \frac{\text{moles of } A}{\text{total moles}} = \frac{n_A}{n_{total}}$$

The sum of the mole fractions of all components in a mixture must always equal 1.

By taking the ratio of the partial pressure of gas $A$ ($P_A$) to the total pressure ($P_{total}$), we can see how mole fraction directly links to pressure:

$$\frac{P_A}{P_{total}} = \frac{n_A(RT/V)}{n_{total}(RT/V)} = \frac{n_A}{n_{total}} = X_A$$

Rearranging this relationship provides a highly useful equation for calculating the partial pressure of a gas when the total pressure and the mole fraction are known:

$$P_A = X_A P_{total}$$

**Example:** Dry atmospheric air is approximately 78% nitrogen ($N_2$) and 21% oxygen ($O_2$) by volume, which means their mole fractions are roughly $X_{N_2} = 0.78$ and $X_{O_2} = 0.21$. If the total atmospheric pressure is 1.00 atm, the partial pressures are simply $P_{N_2} = 0.78 \text{ atm}$ and $P_{O_2} = 0.21 \text{ atm}$.

### Collecting Gases Over Water

A classic application of Dalton's Law of Partial Pressures occurs in the laboratory when a gas is collected by the displacement of water. Many gases that are insoluble in water, such as oxygen or hydrogen, are produced in a reaction vessel and then bubbled through a tube into an inverted bottle filled with water.

```text
               Inverted Collection Bottle
               ________________
              |                |
              | Gas + H2O vapor| <-- Collected gas mixture
              | o  o  o  o  o  | 
              |________________| <-- Water level inside bottle
              |                |
              |       | |      | <-- Delivery tube from reaction
              |       | |      |
   ___________|       | |      |___________
  |                                        | <-- P_atm pushes on water
  |             Water Trough               | 
  |________________________________________|

```

As the gas bubbles rise to the top of the inverted bottle, they displace the water downward. However, the gas collected at the top of the bottle is not pure. Because liquid water is present, some of it evaporates into the gas space. Therefore, the total volume of gas collected is a mixture of the desired gas and water vapor.

According to Dalton's Law, the total pressure inside the collection bottle is the sum of the partial pressure of the collected gas and the partial pressure of the water vapor:

$$P_{total} = P_{gas} + P_{H_2O}$$

If the water levels inside and outside the collection bottle are made equal, the total pressure inside the bottle ($P_{total}$) perfectly matches the atmospheric pressure in the room, which can be read from a laboratory barometer.

The partial pressure of the water vapor ($P_{H_2O}$, also known as the vapor pressure of water) depends strictly on the temperature of the liquid water. These values are well-documented and can be found in reference tables.

To find the pressure of the *dry* gas (which is necessary if you wish to use the ideal-gas equation to calculate the moles of gas produced), you must subtract the water vapor pressure from the total atmospheric pressure:

$$P_{gas} = P_{total} - P_{H_2O}$$

Failure to account for the partial pressure of water vapor when collecting a gas over water will result in an artificially high calculated value for the moles of gas produced, as the water molecules are mistakenly counted as product molecules.

## 9.6 The Kinetic-Molecular Theory of Gases

The empirical gas laws (Boyle's, Charles's, and Avogadro's) and the ideal-gas equation describe *how* gases behave when subjected to changes in pressure, volume, temperature, and quantity. However, they do not explain *why* gases behave this way. To understand the physical reasons behind these macroscopic properties, we must look at the microscopic behavior of the individual particles that make up the gas.

In the 19th century, physicists such as Rudolf Clausius, James Clerk Maxwell, and Ludwig Boltzmann developed the **kinetic-molecular theory** (KMT). This model yields a theoretical framework that perfectly accounts for the macroscopic properties of ideal gases by analyzing the motion of their microscopic particles.

### Postulates of the Kinetic-Molecular Theory

The kinetic-molecular theory is based on five fundamental postulates that describe an ideal gas:

1. **Continuous, Random Motion:** Gases consist of large numbers of particles (atoms or molecules) that are in continuous, random, straight-line motion. They change direction only when they collide with one another or with the walls of their container.
2. **Negligible Particle Volume:** The combined volume of all the molecules of the gas is negligible relative to the total volume of the container. The majority of a gas's volume is simply empty space.
3. **Negligible Intermolecular Forces:** Attractive and repulsive forces between gas molecules are negligible. Gas particles act totally independent of one another.
4. **Perfectly Elastic Collisions:** Energy can be transferred between molecules during collisions, but the collisions are perfectly elastic. This means the total kinetic energy of the molecules remains constant, provided the temperature is held constant.
5. **Proportionality of Kinetic Energy to Temperature:** The average kinetic energy of the molecules is directly proportional to the absolute temperature (in Kelvin). At any given temperature, the molecules of *all* gases have the same average kinetic energy.

### Translating Microscopic Behavior to Macroscopic Laws

We can use the postulates of KMT to understand the macroscopic gas laws we observed empirically in earlier sections:

* **Pressure and Boyle's Law ($P \propto 1/V$):** Gas pressure is the result of molecules colliding with the container walls. If the volume of a container is halved while the temperature remains constant, the molecules have less distance to travel before hitting a wall. This leads to twice as many collisions per second per unit area, effectively doubling the pressure.
* **Temperature and Charles's Law ($V \propto T$):** If the absolute temperature of a gas is increased, the average kinetic energy—and thus the average speed—of the molecules increases (Postulate 5). The molecules strike the walls more frequently and with greater force. To keep the pressure constant, the volume of the container must expand so that the molecules have further to travel, restoring the original collision rate per unit area.
* **Dalton's Law of Partial Pressures:** Because gas molecules do not attract or repel one another and the volume of the particles is negligible (Postulates 2 and 3), the presence of one type of gas molecule does not affect the behavior of another. Therefore, the total pressure is simply the sum of the independent collision forces of each gas.

### Molecular Speeds and Kinetic Energy

The kinetic energy ($E_k$) of a single molecule in motion is given by the physics equation:

$$E_k = \frac{1}{2}mu^2$$

where $m$ is the mass of the molecule and $u$ is its speed. Because a gas sample contains a massive number of molecules moving at various speeds, it is more useful to look at the **average kinetic energy** ($\overline{E}_k$).

According to KMT, average kinetic energy is directly proportional to absolute temperature. The exact mathematical relationship for one mole of an ideal gas is:

$$\overline{E}_k = \frac{3}{2}RT$$

*(Where $R$ is the ideal-gas constant, specifically the energy value $8.314 \text{ J}/(\text{mol}\cdot\text{K})$).*

This equation is profound: it dictates that a sample of hydrogen gas ($H_2$) and a sample of heavy sulfur hexafluoride gas ($SF_6$) at the exact same temperature will have the exact same average kinetic energy.

However, because $E_k = \frac{1}{2}mu^2$, if a light molecule and a heavy molecule have the same kinetic energy, the light molecule must be moving significantly faster to compensate for its smaller mass.

We characterize the speed of gas molecules using the **root-mean-square (rms) speed**, denoted as $u_{rms}$. The rms speed is the speed of a molecule possessing a kinetic energy identical to the average kinetic energy of the sample. We can derive it by equating the two kinetic energy expressions and solving for speed:

$$\frac{1}{2}\mathcal{M}u_{rms}^2 = \frac{3}{2}RT$$

$$u_{rms} = \sqrt{\frac{3RT}{\mathcal{M}}}$$

*Critical Note on Units:* To calculate $u_{rms}$ in meters per second (m/s), $R$ must be $8.314 \text{ J}/(\text{mol}\cdot\text{K})$ and the molar mass ($\mathcal{M}$) **must be expressed in kilograms per mole (kg/mol)**, not grams per mole, because $1 \text{ Joule} = 1 \text{ kg}\cdot\text{m}^2/\text{s}^2$.

### The Maxwell-Boltzmann Distribution

While $u_{rms}$ gives us a representative average speed, not all molecules in a gas move at that speed. In fact, molecular speeds vary over a wide range. The distribution of these speeds is described by the **Maxwell-Boltzmann distribution**.

```text
       |
     F |      *  (T1: Lower Temperature, e.g., 273 K)
     r |    *   *
     a |   *     *
     c |  *       *
     t | *         *       * (T2: Higher Temperature, e.g., 1000 K)
     i | *          *    *   *
     o |*            *  *      *
     n |*             **         * * * 
       |*             *                * * * * * * *
       +---------------------------------------------
              u_mp(T1)       u_mp(T2)
                     Molecular Speed (m/s)

```

The curve shows the fraction of molecules moving at any given speed. The peak of the curve represents the most probable speed ($u_{mp}$). Notice two key behaviors in the distribution:

1. **Effect of Temperature:** At higher temperatures (T2), the entire curve flattens and shifts to the right. The average speed is higher, and there is a much broader spread (distribution) of molecular speeds.
2. **Effect of Molar Mass:** If we plotted two different gases at the *same* temperature, the lighter gas would look like the T2 curve (shifted right, broader), while the heavier gas would look like the T1 curve (shifted left, taller peak). Lighter gases move faster on average and have a wider distribution of speeds than heavier gases at the same temperature.

## 9.7 Molecular Effusion and Diffusion

The kinetic-molecular theory (KMT) dictates that gas molecules are in constant, rapid, and random motion. This relentless movement manifests in two distinct but closely related macroscopic phenomena regarding how gases travel and mix: **effusion** and **diffusion**.

While both processes depend heavily on the speeds of the gas molecules, they describe fundamentally different physical scenarios.

### Molecular Effusion

**Effusion** is the process by which a gas escapes from its container through a microscopic hole (a pinhole) into an evacuated space (a vacuum).

Imagine a sealed box containing a gas, with a tiny puncture in one wall. As the molecules bounce randomly around the container, occasionally one will strike the exact location of the pinhole and escape.

```text
       Gas Container              Vacuum
     _________________       _________________
    |                 |     |                 |
    |   *    *     *  |     |                 |
    |      *     *    |     |                 |
    |  *      *       +-----+                 |
    |     *      *  -----> * (escaped molecule)
    |  *      *       +-----+                 |
    |      *       *  |     |                 |
    |   *      *      |     |                 |
    |_________________|     |_________________|
                         
                       Pinhole

```

Because an effusion event requires a molecule to "find" the hole, the rate of effusion—the number of molecules escaping per unit of time—is directly proportional to the speed of the molecules. Faster molecules will collide with the walls (and the pinhole) more frequently.

In Section 9.6, we determined that the root-mean-square speed ($u_{rms}$) of a gas molecule is inversely proportional to the square root of its molar mass ($\mathcal{M}$):

$$u_{rms} = \sqrt{\frac{3RT}{\mathcal{M}}}$$

In 1846, the Scottish chemist Thomas Graham discovered this relationship empirically. **Graham's Law of Effusion** states that the effusion rate of a gas is inversely proportional to the square root of its molar mass.

If we compare the effusion rates ($r$) of two different gases under identical conditions of temperature and pressure, we can set up a ratio. Because the terms $3$, $R$, and $T$ are constant for both gases, they cancel out, yielding:

$$\frac{r_1}{r_2} = \sqrt{\frac{\mathcal{M}_2}{\mathcal{M}_1}}$$

This equation mathematically demonstrates that lighter gases effuse much faster than heavier gases. For example, helium gas ($\mathcal{M} = 4.00 \text{ g/mol}$) effuses roughly 2.7 times faster than nitrogen gas ($\mathcal{M} = 28.02 \text{ g/mol}$) under the same conditions. This is why a helium-filled latex balloon deflates noticeably overnight; the small helium atoms effuse through the microscopic pores of the latex much faster than atmospheric nitrogen and oxygen can effuse into the balloon.

#### Application: Isotope Enrichment

Graham's Law has profound real-world applications, most notably in the enrichment of uranium for nuclear reactors and weaponry. Naturally occurring uranium consists mostly of the non-fissile U-238 isotope, with less than 1% being the fissile U-235 isotope. To separate them, uranium solid is converted into uranium hexafluoride gas ($UF_6$).

Because the molar mass of $^{235}UF_6$ is slightly less than that of $^{238}UF_6$, the lighter isotope effuses through a porous barrier infinitesimally faster ($\sim 1.004$ times faster). By cascading the gas through thousands of successive porous barriers, scientists can gradually enrich the concentration of the U-235 isotope.

### Molecular Diffusion

**Diffusion** is the spread of one substance throughout a space or throughout a second substance. When a bottle of concentrated ammonia is opened at the front of a classroom, the odor eventually reaches the students in the back. This is diffusion: the ammonia gas molecules are mixing into the surrounding air.

```text
    Initial State (Barrier in place)      Final State (After Diffusion)
    _____________________________         _____________________________
   |             |               |       |                             |
   |  *   *   *  |   .   .   .   |       |  *   .   *   .   *   .   *  |
   |    *   *    | .   .   .   . |  -->  |    .   *   .   *   .   *    |
   |  *   *   *  |   .   .   .   |       |  .   *   .   *   .   *   .  |
   |_____________|_______________|       |_____________________________|
       Gas 1          Gas 2                        Mixture

```

Like effusion, diffusion occurs faster at higher temperatures and for molecules with lower molar masses. In fact, Graham's law is often used to approximate the relative rates of diffusion of two gases.

However, diffusion is a significantly more complex process than effusion. While a molecule of ammonia might have an rms speed of over 600 meters per second at room temperature, the scent does not cross a 10-meter room in a fraction of a second; it takes several minutes.

#### The Mean Free Path

Why does diffusion take so long when the molecules are moving so fast? The answer lies in molecular collisions.

In effusion, gas molecules move uninterrupted through a vacuum once they pass the pinhole. In diffusion, a gas molecule must navigate through a dense crowd of other gas molecules (such as the nitrogen and oxygen in the air). The ammonia molecule travels only a microscopic distance before it collides with an air molecule, bouncing off and drastically changing its direction.

This zig-zag, randomized movement is highly inefficient for traveling in a straight line. The average distance a molecule travels between collisions is called its **mean free path**.

At standard atmospheric pressure, the mean free path of a typical gas molecule is roughly $60 \text{ nm}$ ($6 \times 10^{-8} \text{ m}$), and the molecule undergoes billions of collisions every single second. Therefore, while the *speed* of the molecule is extremely high, its *directional displacement* (its progress in a specific direction) is quite slow.

As pressure increases, the molecules are forced closer together, decreasing the mean free path and further slowing the rate of diffusion. Conversely, at high altitudes where the air pressure is much lower, the mean free path increases, and gases diffuse more rapidly.

## 9.8 Real Gases and Deviations from Ideal Behavior

The ideal-gas equation ($PV = nRT$) and the kinetic-molecular theory provide a remarkably elegant and accurate model for understanding the behavior of gases under everyday conditions. However, this model is based on two fundamental assumptions that are not strictly true:

1. Gas molecules possess no volume of their own (they are point masses).
2. Gas molecules exert no attractive or repulsive forces on one another.

Because these assumptions are approximations, no perfectly "ideal" gas exists in nature. All gases are **real gases**. While real gases behave ideally at relatively low pressures (around 1 atm or lower) and high temperatures, their behavior deviates significantly from the ideal-gas equation under extreme conditions.

### The Compressibility Factor ($Z$)

To quantify how much a real gas deviates from ideal behavior, physical chemists use a ratio called the **compressibility factor ($Z$)**. It is defined as:

$$Z = \frac{PV}{nRT}$$

For 1 mole of a perfectly ideal gas under any conditions, $Z$ is always exactly equal to 1. If we plot $Z$ against pressure for real gases, we can easily visualize their deviations.

```text
       Compressibility Factor (Z) vs. Pressure at 300 K

     Z |
   2.0 |                                      * (H2)
       |                                     *
   1.5 |                                    *      * (N2)
       |                                   *      * 
   1.0 |----------------------------------*------*------- Ideal Gas (Z=1)
       |                   *             *      *
   0.5 |              *                 *      *
       |         *                     *      *  (CH4)
       |      *                       *      *
     0 +---*-------------------------*------*-----------------
           0           200           400           600           
                             Pressure (atm)

```

As the graph illustrates, at low pressures (near 0 atm), all gases converge at $Z = 1$, behaving ideally. However, as pressure increases, the curves diverge dramatically.

### Causes of Non-Ideal Behavior

The deviations shown in the $Z$ vs. $P$ graph are driven by the failure of the two kinetic-molecular theory assumptions under extreme conditions:

#### 1. The Effect of Molecular Volume (High Pressure)

As pressure is drastically increased, the gas is compressed into a much smaller volume. The empty space between the molecules shrinks. Eventually, the physical volume occupied by the gas molecules themselves becomes a significant fraction of the total volume of the container.

Because the molecules take up space, the "free" volume available for them to move in is less than the actual volume of the container. The gas cannot be compressed as much as an ideal gas would be, resulting in a volume that is *larger* than predicted by $PV = nRT$. This causes the compressibility factor ($Z$) to rise above 1, a phenomenon dominated by repulsive forces between electron clouds as molecules are forced too close together. This explains why the curves for $H_2$ and $N_2$ slope upwards at high pressures.

#### 2. The Effect of Intermolecular Forces (Low Temperature / Moderate Pressure)

When a gas is cooled, the average kinetic energy of its molecules decreases. As the molecules slow down, they spend more time in close proximity to one another during collisions. This allows the weak attractive forces between molecules (intermolecular forces) to take effect.

Because molecules are pulling on each other, they strike the container walls with less force and less frequency than they would if they were acting totally independently. This reduces the overall pressure of the gas to a value *lower* than predicted by the ideal-gas equation. This effect causes the compressibility factor ($Z$) to drop below 1. For gases with stronger intermolecular attractions, like methane ($CH_4$) or water vapor, this dip below the $Z=1$ line is particularly pronounced at moderate pressures before the volume effect eventually drives the curve back up.

### The van der Waals Equation

In 1873, the Dutch physicist Johannes van der Waals formulated an equation of state that corrects the ideal-gas equation to account for the behavior of real gases. He introduced two empirical constants, $a$ and $b$, which are unique to each specific gas.

* **The Pressure Correction ($\frac{an^2}{V^2}$):** This term accounts for intermolecular attractions. The constant $a$ represents the strength of the attraction between molecules. Because these attractions reduce the pressure striking the walls, van der Waals *added* this term to the observed pressure ($P$) to represent the ideal pressure.
* **The Volume Correction ($nb$):** This term accounts for the finite volume of the gas molecules. The constant $b$ represents the physical volume occupied by one mole of the molecules. By *subtracting* $nb$ from the container volume ($V$), van der Waals isolated the "free" volume actually available to the gas.

Substituting these corrected terms into the ideal-gas equation ($P_{ideal} \times V_{ideal} = nRT$) yields the **van der Waals equation**:

$$\left(P + \frac{an^2}{V^2}\right)(V - nb) = nRT$$

```text
+-------------------------------------------------------------+
|               THE VAN DER WAALS EQUATION                    |
|                                                             |
|           (P + an²/V²)    ×    (V - nb)    =   nRT          |
|            ^^^^^^^^^^          ^^^^^^^^                     |
|         Corrected Pressure   Corrected Volume               |
|         (accounts for        (accounts for                  |
|         attractions)         molecular size)                |
+-------------------------------------------------------------+

```

By utilizing experimentally determined values for $a$ and $b$, the van der Waals equation provides highly accurate predictions for the properties of real gases, even under conditions of high pressure and low temperature where the ideal-gas law completely fails.

## Chapter Summary

* **Characteristics of Gases:** Gases expand to fill their containers, are highly compressible, form homogeneous mixtures, and have low densities compared to liquids and solids.
* **Gas Pressure:** Pressure is force per unit area. Atmospheric pressure is measured with a barometer, while confined gas pressure is measured with a manometer. Standard pressure is $1 \text{ atm} = 760 \text{ mmHg} = 760 \text{ torr} = 101.325 \text{ kPa}$.
* **Empirical Gas Laws:**
* *Boyle's Law:* Volume is inversely proportional to pressure at constant $T$ and $n$ ($P_1V_1 = P_2V_2$).
* *Charles's Law:* Volume is directly proportional to absolute temperature (Kelvin) at constant $P$ and $n$ ($V_1/T_1 = V_2/T_2$).
* *Avogadro's Law:* Volume is directly proportional to moles of gas at constant $P$ and $T$.

* **The Ideal-Gas Equation:** The empirical laws combine to form $PV = nRT$, where $R$ is the ideal-gas constant. This equation accurately describes the macroscopic state of a hypothetical ideal gas.
* **Density and Molar Mass:** The ideal gas law can be rearranged to calculate gas density ($d = P\mathcal{M}/RT$) or to find the molar mass of an unknown volatile substance ($\mathcal{M} = dRT/P$).
* **Gas Mixtures:** Dalton's Law of Partial Pressures states that the total pressure of a gas mixture is the sum of the partial pressures of its individual components ($P_{total} = P_1 + P_2 + \dots$). Partial pressure is linked to a component's mole fraction ($P_A = X_A P_{total}$).
* **The Kinetic-Molecular Theory (KMT):** KMT explains macroscopic gas behavior by modeling gases as point masses in constant, random motion with perfectly elastic collisions and negligible intermolecular forces. Average kinetic energy is directly proportional to absolute temperature ($\overline{E}_k = \frac{3}{2}RT$).
* **Effusion and Diffusion:** Effusion is the escape of gas through a tiny hole into a vacuum; diffusion is the spread of a gas through a space or another substance. Graham's Law states that the rate of effusion is inversely proportional to the square root of the gas's molar mass ($r \propto 1/\sqrt{\mathcal{M}}$).
* **Real Gases:** Gases deviate from ideal behavior at high pressures (due to the finite volume of molecules) and low temperatures (due to intermolecular attractions). The van der Waals equation mathematically corrects for these deviations using gas-specific constants ($a$ and $b$).
