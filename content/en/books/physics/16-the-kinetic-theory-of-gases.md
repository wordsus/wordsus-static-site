Previously, we explored thermodynamics using macroscopic properties like temperature and heat. To deeply understand gases, we must look at the microscopic level. This chapter introduces the Kinetic Theory of Gases, a model bridging the chaotic motion of countless individual molecules with measurable large-scale properties like pressure and volume. By applying Newton's laws to vast numbers of particles, we will uncover the true physical meaning of temperature, explore the statistical distribution of molecular speeds, and reveal the microscopic origins of the Ideal Gas Law and specific heat.

## 16.1 The Ideal Gas Law

In Chapter 15, we explored the concepts of temperature and heat, primarily focusing on how solids and liquids respond to thermal changes. Gases, however, behave differently. Because the intermolecular forces in a gas are very weak and the molecules are far apart, a gas will expand to fill any container it occupies. Consequently, the volume of a gas is largely determined by the size of its container, and its state is intimately linked to its pressure and temperature.

To describe the macroscopic state of a given mass of gas, we must specify four interdependent variables:

1. **Pressure ($P$)**
2. **Volume ($V$)**
3. **Temperature ($T$)**
4. **Amount of substance ($n$)**

Through centuries of experimentation, physicists and chemists discovered that at sufficiently low densities, all gases tend to exhibit the same simple relationships among these thermodynamic variables. A gas that perfectly obeys these relationships under all conditions is called an **ideal gas**. While no real gas is perfectly ideal, most gases at room temperature and standard atmospheric pressure behave approximately as ideal gases.

### The Empirical Gas Laws

The ideal gas law represents the synthesis of several empirical relationships discovered experimentally when one or more state variables were held constant:

* **Boyle’s Law:** At a constant temperature, the absolute pressure of a fixed mass of gas is inversely proportional to its volume.

$$P \propto \frac{1}{V} \quad \text{(constant } T \text{ and } n \text{)}$$

* **Charles’s Law:** At a constant pressure, the volume of a fixed mass of gas is directly proportional to its absolute temperature.

$$V \propto T \quad \text{(constant } P \text{ and } n \text{)}$$

* **Gay-Lussac’s Law:** At a constant volume, the absolute pressure of a fixed mass of gas is directly proportional to its absolute temperature.

$$P \propto T \quad \text{(constant } V \text{ and } n \text{)}$$

* **Avogadro's Law:** At a constant temperature and pressure, the volume of a gas is directly proportional to the number of moles of the gas.

$$V \propto n \quad \text{(constant } P \text{ and } T \text{)}$$

### The Equation of State

By combining these four proportionalities, we arrive at a single comprehensive equation of state for an ideal gas, known as the **Ideal Gas Law**:

$$PV = nRT$$

Where:

* $P$ is the absolute pressure (in Pascals, $\text{Pa}$)
* $V$ is the volume (in cubic meters, $\text{m}^3$)
* $n$ is the number of moles of the gas (in $\text{mol}$)
* $T$ is the absolute temperature (in Kelvin, $\text{K}$). **Note:** It is crucial that temperature is always expressed in Kelvin when using this equation.
* $R$ is the **universal gas constant**.

Because this relationship holds for any ideal gas regardless of its chemical composition, $R$ is a fundamental constant of nature. Its value depends on the units chosen for pressure and volume:

| Units for $P$ | Units for $V$ | Value of $R$ |
| --- | --- | --- |
| Pascals ($\text{Pa}$) | Cubic meters ($\text{m}^3$) | $8.314 \text{ J/(mol}\cdot\text{K)}$ |
| Atmospheres ($\text{atm}$) | Liters ($\text{L}$) | $0.08206 \text{ L}\cdot\text{atm/(mol}\cdot\text{K)}$ |

#### Graphical Representation: The $P$-$V$ Diagram

A common way to visualize the behavior of a gas is through a Pressure-Volume ($P$-$V$) diagram. If we hold the temperature constant (an *isothermal* process) and plot pressure against volume, the Ideal Gas Law ($P = \frac{nRT}{V}$) dictates that the resulting curve will be a hyperbola.

```text
       P
       |
       |  \
       |   \   Isotherms (T = constant)
       |    \
       |     \       T_high
       |      \ . . . . . .
       |       \           \ 
       |        \           \  T_low
       |         \           \
       |__________\___________\________ V

```

*As shown above, an isotherm at a higher temperature ($T_{\text{high}}$) lies further from the origin than an isotherm at a lower temperature ($T_{\text{low}}$), reflecting that at a given volume, a higher temperature requires a higher pressure.*

### The Ideal Gas Law in Terms of Molecules

While chemists often work with moles ($n$), physicists frequently prefer to analyze gases in terms of the discrete number of molecules ($N$). The number of moles is related to the total number of molecules by Avogadro's number ($N_A \approx 6.022 \times 10^{23} \text{ molecules/mol}$):

$$n = \frac{N}{N_A}$$

Substituting this into the Ideal Gas Law gives:

$$PV = \left(\frac{N}{N_A}\right)RT = N\left(\frac{R}{N_A}\right)T$$

The ratio $\frac{R}{N_A}$ appears so frequently in statistical mechanics and thermodynamics that it is given its own name and symbol: the **Boltzmann constant** ($k_B$).

$$k_B = \frac{R}{N_A} = 1.38 \times 10^{-23} \text{ J/K}$$

This allows us to write an alternative, equally valid form of the Ideal Gas Law:

$$PV = N k_B T$$

### Limitations of the Ideal Gas Law

The Ideal Gas Law is an approximation. It assumes that:

1. The volume occupied by the gas molecules themselves is entirely negligible compared to the volume of the container.
2. The molecules exert no attractive or repulsive forces on one another, except during perfectly elastic collisions.

Real gases deviate from this ideal behavior when these assumptions break down—specifically, at **high pressures** (where the molecules are forced close together and their own volume becomes significant) and **low temperatures** (where the molecules move slowly enough that intermolecular attractive forces become significant, eventually causing the gas to condense into a liquid). However, at standard temperature and pressure (STP: $0^\circ\text{C}$ and $1 \text{ atm}$), the ideal gas law introduces an error of only about $1\%$ to $2\%$ for most common gases, making it an exceptionally powerful tool in thermodynamics.

## 16.2 A Molecular Model of an Ideal Gas

In the previous section, we established the macroscopic relationship between pressure, volume, and temperature (the ideal gas law). We will now bridge the gap between macroscopic thermodynamics and microscopic mechanics by exploring the **Kinetic Theory of Gases**. This model explains the macroscopic behavior of a gas by treating it as a large collection of rapidly moving submicroscopic particles (atoms or molecules).

### Assumptions of the Kinetic Theory

To construct our mathematical model, we must make several simplifying assumptions about the nature of an ideal gas:

1. **Large Number of Particles:** The gas consists of a very large number of identical molecules ($N$) within a volume ($V$).
2. **Point Masses:** The molecules are treated as point particles. Their individual volumes are negligible compared to the total volume $V$ of the container.
3. **Random Motion:** The molecules are in continuous, random motion, moving in straight lines in all directions with a variety of speeds.
4. **No Intermolecular Forces:** The molecules exert no electrical or gravitational forces on one another, except during collisions.
5. **Elastic Collisions:** All collisions between molecules, and between molecules and the walls of the container, are perfectly elastic. This means macroscopic kinetic energy is strictly conserved.

### Deriving Pressure from Molecular Motion

Let us calculate the pressure exerted by a gas on the walls of a container based entirely on the classical mechanics of its molecules. Consider a gas containing $N$ molecules, each with mass $m$, enclosed in a cubical container with side length $L$.

```text
               Container Wall (Area A = L²)
               |             |
               |             |
     Velocity  |   ------>   |  1. Molecule approaches wall
      v_x      |      •      |
               |             |
               |   <------   |  2. Molecule rebounds elastically
     Velocity  |      •      |
     -v_x      |             |
               |<---- L ---->|

```

Focus on a single molecule moving with an $x$-component of velocity, $v_x$. When it collides elastically with the right-hand wall (which is perpendicular to the $x$-axis), its velocity changes from $+v_x$ to $-v_x$. The change in the molecule's momentum is:

$$\Delta p_x = p_{\text{final}} - p_{\text{initial}} = (-mv_x) - (mv_x) = -2mv_x$$

By Newton's Third Law, the momentum transferred *to the wall* during this single collision is $+2mv_x$.

After bouncing off the right wall, the molecule travels across the box to the left wall, bounces, and returns. The round-trip distance is $2L$. The time interval $\Delta t$ between consecutive collisions with the *same* right-hand wall is:

$$\Delta t = \frac{2L}{v_x}$$

Using Newton's Second Law in terms of momentum ($F = \frac{\Delta p}{\Delta t}$), the average force exerted on the wall by this *single* molecule over time is:

$$F_{\text{single}} = \frac{2mv_x}{\left(\frac{2L}{v_x}\right)} = \frac{mv_x^2}{L}$$

To find the total force $F$ on the wall, we must sum the contributions of all $N$ molecules:

$$F = \frac{m}{L} (v_{x1}^2 + v_{x2}^2 + \dots + v_{xN}^2)$$

We can express the sum of the squared velocities in terms of the average value of $v_x^2$, denoted as $\overline{v_x^2}$:

$$\overline{v_x^2} = \frac{v_{x1}^2 + v_{x2}^2 + \dots + v_{xN}^2}{N}$$

Substituting this back into the force equation yields:

$$F = \frac{Nm}{L} \overline{v_x^2}$$

Because the molecules move randomly in all three dimensions, there is no preferred direction. The average squared speeds in the $x$, $y$, and $z$ directions must be equal: $\overline{v_x^2} = \overline{v_y^2} = \overline{v_z^2}$. Since the total velocity squared is $v^2 = v_x^2 + v_y^2 + v_z^2$, it follows that the average squared speed is $\overline{v^2} = 3\overline{v_x^2}$, or:

$$\overline{v_x^2} = \frac{1}{3} \overline{v^2}$$

Therefore, the total force on the wall is $F = \frac{Nm}{3L} \overline{v^2}$. Pressure $P$ is force divided by the area of the wall ($A = L^2$). Since $L^3$ is the volume $V$ of the cubical container, we find:

$$P = \frac{F}{L^2} = \frac{Nm\overline{v^2}}{3L^3}$$

$$P = \frac{1}{3} \frac{N}{V} m \overline{v^2}$$

This is a profound result. It demonstrates that **macroscopic pressure is a direct result of the microscopic collisions of molecules**, depending on the number density ($\frac{N}{V}$), the mass of the molecules ($m$), and their average squared speed ($\overline{v^2}$).

### Molecular Interpretation of Temperature

We can manipulate the kinetic pressure equation to reveal the physical meaning of temperature. Let us rewrite the previous equation by separating a factor of $\frac{2}{2}$:

$$P = \frac{2}{3} \frac{N}{V} \left(\frac{1}{2} m \overline{v^2}\right)$$

$$PV = \frac{2}{3} N \left(\frac{1}{2} m \overline{v^2}\right)$$

Notice that the term $\frac{1}{2} m \overline{v^2}$ is the average translational kinetic energy ($\overline{K}$) of a single gas molecule. Recall the ideal gas law derived in Section 16.1: $PV = N k_B T$. By equating the right sides of these two equations, we get:

$$N k_B T = \frac{2}{3} N \left(\frac{1}{2} m \overline{v^2}\right)$$

Solving for the average translational kinetic energy:

$$\overline{K} = \frac{1}{2} m \overline{v^2} = \frac{3}{2} k_B T$$

This theorem is a cornerstone of statistical mechanics. It states that **the absolute temperature of an ideal gas is directly proportional to the average translational kinetic energy of its molecules**. Temperature is not just a measure of "hotness" or "coldness"; it is a direct macroscopic measure of the chaotic, microscopic motion of particles.

### Root-Mean-Square (rms) Speed

Because temperature is proportional to the average *squared* speed ($\overline{v^2}$), we can calculate a characteristic speed for the gas molecules. Taking the square root of $\overline{v^2}$ gives the **root-mean-square (rms) speed**:

$$v_{\text{rms}} = \sqrt{\overline{v^2}} = \sqrt{\frac{3 k_B T}{m}}$$

Since $k_B = \frac{R}{N_A}$ and the molar mass $M = m N_A$, we can also write the rms speed in terms of macroscopic quantities:

$$v_{\text{rms}} = \sqrt{\frac{3 R T}{M}}$$

This equation reveals that at a given temperature, lighter molecules (smaller $M$) move faster on average than heavier molecules. For example, at room temperature, lightweight hydrogen gas molecules move considerably faster than heavier oxygen gas molecules, even though both gases possess the same average kinetic energy per molecule.

## 16.3 Equipartition of Energy

In Section 16.2, we established that the average translational kinetic energy of a molecule in an ideal gas is $\overline{K} = \frac{3}{2} k_B T$. This energy is associated with the motion of the molecule's center of mass through three-dimensional space. Because the molecules move randomly, their velocity components in the $x$, $y$, and $z$ directions are entirely independent. We can write the average translational kinetic energy as the sum of the energies associated with each independent direction:

$$\overline{K} = \frac{1}{2}m\overline{v_x^2} + \frac{1}{2}m\overline{v_y^2} + \frac{1}{2}m\overline{v_z^2}$$

Since space is isotropic (the same in all directions), the average energy in each direction must be equal. Therefore, each of the three terms in the equation above contributes exactly one-third of the total average translational energy:

$$\frac{1}{2}m\overline{v_x^2} = \frac{1}{2}m\overline{v_y^2} = \frac{1}{2}m\overline{v_z^2} = \frac{1}{2} k_B T$$

This observation leads to a profound and general principle in classical statistical mechanics. We define a **degree of freedom** ($f$) as any independent mathematical term in the expression for the total energy of a system that is proportional to the square of a coordinate or a velocity component. A monatomic gas, like helium or neon, has exactly three degrees of freedom corresponding to translational motion in the $x$, $y$, and $z$ directions.

### The Equipartition Theorem

First formulated by James Clerk Maxwell and later generalized by Ludwig Boltzmann, the **theorem of equipartition of energy** states:

> In a system at thermal equilibrium at absolute temperature $T$, the available thermal energy is shared equally among all active degrees of freedom, and each active degree of freedom contributes an average energy of $\frac{1}{2} k_B T$ per molecule.

For a system containing $N$ molecules, each active degree of freedom contributes $\frac{1}{2} N k_B T$, or equivalently, $\frac{1}{2} n R T$ to the total internal energy of the system.

### Diatomic and Polyatomic Molecules

While monatomic gases only possess translational kinetic energy, molecules composed of two or more atoms have additional ways to store energy: rotation and vibration.

Consider a rigid diatomic molecule, such as oxygen ($\text{O}_2$) or nitrogen ($\text{N}_2$), modeled as a "dumbbell" consisting of two point masses connected by a massless rigid rod aligned along the $x$-axis.

```text
          y
          |     m1          m2
          |    (O)=========(O)
          |   /               \
          |  /                 \
    ______|/____________________\___ x (Internuclear axis)
         /
        /
       z

```

1. **Translational Degrees of Freedom:** The center of mass of the diatomic molecule can move in three dimensions, just like a monatomic gas. This gives **$3$ translational degrees of freedom**.
2. **Rotational Degrees of Freedom:** The molecule can rotate about its center of mass.

* Rotation about the $y$-axis and $z$-axis involves a significant moment of inertia ($I_y$ and $I_z$). Therefore, there are two rotational kinetic energy terms: $\frac{1}{2}I_y\omega_y^2$ and $\frac{1}{2}I_z\omega_z^2$.
* Rotation about the $x$-axis (the internuclear axis) involves a moment of inertia ($I_x$) that is vanishingly small because the mass of the atoms is concentrated almost entirely at their nuclei. In classical terms, $\frac{1}{2}I_x\omega_x^2 \approx 0$.
* Thus, a rigid diatomic molecule has **$2$ rotational degrees of freedom**.

According to the equipartition theorem, the average total energy of a single rigid diatomic molecule is the sum of its translational and rotational contributions:

$$\overline{E} = \left( 3 \times \frac{1}{2}k_B T \right) + \left( 2 \times \frac{1}{2}k_B T \right) = \frac{5}{2} k_B T$$

For **polyatomic molecules** with non-linear geometries (like $\text{H}_2\text{O}$ or $\text{CH}_4$), the moment of inertia is significant about all three spatial axes. Therefore, they generally possess **$3$ translational and $3$ rotational degrees of freedom**, totaling $f = 6$, yielding an average energy per molecule of $3 k_B T$.

### Vibrational Energy and Quantum Limitations

The bonds between atoms in a molecule are not completely rigid; they act more like microscopic springs. A diatomic molecule can vibrate along its internuclear axis. This vibration introduces two additional degrees of freedom: one for the kinetic energy of the oscillating masses, and one for the elastic potential energy stored in the "spring" bond.

If vibrational degrees of freedom were active, a diatomic molecule would have $f = 3 \text{ (trans)} + 2 \text{ (rot)} + 2 \text{ (vib)} = 7$ total degrees of freedom. However, classical equipartition fails to accurately predict the behavior of gases at extreme temperatures.

At room temperature, the collisions between gas molecules usually lack sufficient energy to excite the vibrational modes. The vibrational degrees of freedom are "frozen out" due to the quantized nature of energy levels—a phenomenon that classical physics could not explain and which became one of the earliest pieces of evidence for quantum mechanics. As temperature increases significantly, collisions become violent enough to overcome the quantum energy gap, and vibrational degrees of freedom become active.

### Total Internal Energy of an Ideal Gas

The total internal energy ($E_{\text{int}}$) of an ideal gas is simply the sum of the energies of all its constituent molecules. Since we assume ideal gas molecules do not interact (meaning there is no intermolecular potential energy), the internal energy depends *only* on temperature and the number of active degrees of freedom.

For $n$ moles of an ideal gas with $f$ active degrees of freedom, the internal energy is:

$$E_{\text{int}} = N \left( f \frac{1}{2} k_B T \right) = \frac{f}{2} n R T$$

| Type of Molecule | Active Degrees of Freedom ($f$) at Room Temp | Internal Energy ($E_{\text{int}}$) | Example |
| --- | --- | --- | --- |
| **Monatomic** | $3$ (Translational only) | $\frac{3}{2} n R T$ | $\text{He}, \text{Ne}, \text{Ar}$ |
| **Diatomic** | $5$ (3 Trans. + 2 Rot.) | $\frac{5}{2} n R T$ | $\text{N}_2, \text{O}_2, \text{CO}$ |
| **Polyatomic** | $6$ (3 Trans. + 3 Rot.) | $3 n R T$ | $\text{H}_2\text{O}, \text{CO}_2, \text{CH}_4$ |

This elegant relationship shows that the macroscopic internal energy of a gas is fundamentally tied to the microscopic structure and geometry of its molecules.

## 16.4 Molar Specific Heats of Ideal Gases

In Chapter 15, we defined specific heat as the amount of energy required to raise the temperature of a unit mass of a substance by one degree. For solids and liquids, we typically use the mass specific heat ($c$). However, for gases, it is far more convenient to describe the quantity of gas in terms of moles. We therefore define the **molar specific heat** ($C$) as the heat energy ($Q$) required to raise the temperature of one mole ($n = 1$) of a gas by one Kelvin ($\Delta T = 1 \text{ K}$):

$$Q = n C \Delta T$$

Unlike solids and liquids, the specific heat of a gas depends highly on the thermodynamic path taken during the heating process. A gas can be heated while its volume is held constant, or it can be heated while its pressure is held constant (allowing it to expand). These two distinct processes require different amounts of heat, leading to two distinct molar specific heats: $C_V$ (constant volume) and $C_P$ (constant pressure).

### Molar Specific Heat at Constant Volume ($C_V$)

Consider $n$ moles of an ideal gas confined in a rigid container with a fixed volume. If we add heat ($Q$) to this gas, its temperature increases by $\Delta T$. By definition, the heat added at constant volume is:

$$Q_V = n C_V \Delta T$$

Because the volume of the container cannot change ($\Delta V = 0$), the gas cannot do any macroscopic work on its surroundings ($W = 0$). According to the principle of conservation of energy (which we will formalize as the First Law of Thermodynamics in Chapter 17), all the added heat must go directly into increasing the total internal energy ($E_{\text{int}}$) of the gas:

$$Q_V = \Delta E_{\text{int}}$$

Therefore, we can relate the change in internal energy directly to the molar specific heat at constant volume:

$$\Delta E_{\text{int}} = n C_V \Delta T$$

In Section 16.3, we used the equipartition theorem to show that the internal energy of an ideal gas depends only on its temperature and the number of active degrees of freedom ($f$): $E_{\text{int}} = \frac{f}{2} n R T$. The change in internal energy for a given temperature change is simply:

$$\Delta E_{\text{int}} = \frac{f}{2} n R \Delta T$$

Equating our two expressions for $\Delta E_{\text{int}}$ allows us to derive a theoretical expression for $C_V$:

$$n C_V \Delta T = \frac{f}{2} n R \Delta T$$

$$C_V = \frac{f}{2} R$$

This remarkable result states that the molar specific heat at constant volume is a fundamental constant determined entirely by the molecular geometry (degrees of freedom) of the gas.

### Molar Specific Heat at Constant Pressure ($C_P$)

Now consider heating the same gas, but this time confined in a cylinder with a movable piston of constant weight. As heat is added, the gas expands to keep its pressure constant. The heat added in this process is:

$$Q_P = n C_P \Delta T$$

When a gas expands at constant pressure, it exerts a force on the piston over a distance, thus doing work ($W$) on its surroundings. The work done by the gas is given by $W = P \Delta V$. Using the ideal gas law at constant pressure ($P \Delta V = n R \Delta T$), we can express the work done as $W = n R \Delta T$.

Because energy is conserved, the total heat added ($Q_P$) must equal the energy required to raise the internal energy of the gas ($\Delta E_{\text{int}}$) *plus* the energy expended to do the expansion work ($W$):

$$Q_P = \Delta E_{\text{int}} + W$$

Substitute the expressions we have derived for each term:

$$n C_P \Delta T = n C_V \Delta T + n R \Delta T$$

Dividing entirely by $n \Delta T$ yields a fundamental relationship between the two specific heats, known as **Mayer's relation**:

$$C_P = C_V + R$$

This equation explains why $C_P$ is always greater than $C_V$. At constant volume, all added heat goes into raising the temperature. At constant pressure, some of the added heat is "spent" doing work to expand the container, so more total heat is required to achieve the same temperature increase.

### The Ratio of Specific Heats ($\gamma$)

The ratio of the molar specific heat at constant pressure to that at constant volume is a dimensionless quantity denoted by the Greek letter gamma ($\gamma$). This ratio plays a crucial role in adiabatic processes (processes where no heat is exchanged) and in determining the speed of sound in a gas.

$$\gamma = \frac{C_P}{C_V}$$

Using Mayer's relation ($C_P = C_V + R$) and our equipartition derivation for $C_V$ ($C_V = \frac{f}{2} R$), we can express $\gamma$ entirely in terms of degrees of freedom:

$$\gamma = \frac{C_V + R}{C_V} = 1 + \frac{R}{C_V} = 1 + \frac{R}{\left(\frac{f}{2}R\right)}$$

$$\gamma = 1 + \frac{2}{f}$$

### Summary of Theoretical Values

Using the degrees of freedom identified in Section 16.3, we can predict the molar specific heats for different types of ideal gases at room temperature:

| Gas Type | Active Degrees of Freedom ($f$) | $C_V$ | $C_P$ | $\gamma = C_P / C_V$ | Typical Examples |
| --- | --- | --- | --- | --- | --- |
| **Monatomic** | $3$ | $\frac{3}{2}R$ | $\frac{5}{2}R$ | $\frac{5}{3} \approx 1.67$ | $\text{He, Ne, Ar}$ |
| **Diatomic** | $5$ | $\frac{5}{2}R$ | $\frac{7}{2}R$ | $\frac{7}{5} = 1.40$ | $\text{N}_2, \text{O}_2, \text{CO}$ |
| **Polyatomic** | $6$ | $3R$ | $4R$ | $\frac{4}{3} \approx 1.33$ | $\text{H}_2\text{O, CO}_2, \text{CH}_4$ |

*Note: These theoretical predictions match experimental measurements exceptionally well for monatomic gases. For diatomic and polyatomic gases, experimental values deviate slightly due to the onset of vibrational degrees of freedom at higher temperatures, as discussed in the limitations of the equipartition theorem.*

## 16.5 The Distribution of Molecular Speeds and Mean Free Path

In Section 16.2, we used the kinetic theory of gases to determine the root-mean-square (rms) speed of molecules in an ideal gas. However, not all molecules in a gas move at exactly this speed. Because molecules are constantly colliding and exchanging kinetic energy, their individual speeds are continually changing. At any given instant, some molecules are nearly stationary, while a few are moving at extremely high speeds.

To fully understand the microscopic behavior of a gas, we must look at the statistical distribution of these speeds, a concept first derived by James Clerk Maxwell and later generalized by Ludwig Boltzmann.

### The Maxwell-Boltzmann Distribution

The distribution of speeds in a gas in thermal equilibrium is described by the **Maxwell-Boltzmann distribution function**, $f(v)$. This function represents the probability density of molecules having a specific speed $v$. Alternatively, if we multiply $f(v)$ by the total number of molecules $N$, we get $N(v)$, which tells us the number of molecules with speeds between $v$ and $v + dv$:

$$N(v) = 4\pi N \left( \frac{m}{2\pi k_B T} \right)^{3/2} v^2 e^{-\frac{mv^2}{2k_B T}}$$

Where:

* $m$ is the mass of a single molecule
* $k_B$ is the Boltzmann constant
* $T$ is the absolute temperature
* $v$ is the molecular speed
* $e$ is the base of the natural logarithm

The shape of this distribution is dictated by two competing factors in the equation:

1. The $v^2$ term, which dominates at low speeds and causes the probability to increase as speed increases. This accounts for the geometry of three-dimensional velocity space.
2. The exponential term $e^{-\frac{mv^2}{2k_B T}}$, known as the *Boltzmann factor*, which dominates at high speeds and causes the probability to drop off rapidly toward zero.

```text
    N(v)
     |
     |         .-^-.
     |        /  |  \
     |       /   |   \
     |      /    |    :
     |     /     |     \
     |    /      |      \
     |   /       |       `.
     |  /        |         `.
     | /         |           ` . _ 
     |/          |                 ` - . _
     +-----------+------+------+----------------> v
                v_mp   v_avg  v_rms

```

### Characteristic Speeds

From the Maxwell-Boltzmann distribution, we can extract three important characteristic speeds for a gas at a given temperature:

**1. The Most Probable Speed ($v_{mp}$):**
This is the speed corresponding to the peak of the distribution curve. It is the speed possessed by the largest number of molecules. We find it by setting the derivative of the distribution function with respect to $v$ equal to zero:

$$v_{mp} = \sqrt{\frac{2 k_B T}{m}} = \sqrt{\frac{2 R T}{M}}$$

**2. The Average Speed ($v_{avg}$):**
This is the simple mathematical mean of the speeds of all molecules in the gas. Because the distribution curve is skewed to the right (it has a long "tail" at high speeds), the average speed is slightly greater than the most probable speed:

$$v_{avg} = \sqrt{\frac{8 k_B T}{\pi m}} = \sqrt{\frac{8 R T}{\pi M}} \approx 1.60 \sqrt{\frac{R T}{M}}$$

**3. The Root-Mean-Square Speed ($v_{rms}$):**
As derived in Section 16.2, this speed corresponds directly to the average translational kinetic energy of the molecules. Because squaring the speeds gives heavier mathematical weight to the high-speed molecules in the tail of the distribution, $v_{rms}$ is the highest of the three characteristic speeds:

$$v_{rms} = \sqrt{\frac{3 k_B T}{m}} = \sqrt{\frac{3 R T}{M}} \approx 1.73 \sqrt{\frac{R T}{M}}$$

For any ideal gas, the order of these speeds is always strictly: **$v_{mp} < v_{avg} < v_{rms}$**.

### Temperature and Mass Dependence

The distribution curve is highly sensitive to both the temperature of the gas and the mass of its molecules:

* **Temperature:** As temperature increases, the average kinetic energy increases. The peak of the curve shifts to the right (higher speeds) and the curve flattens out and becomes broader. A hotter gas has a wider spread of molecular speeds.
* **Molar Mass:** At a constant temperature, lighter molecules move faster on average. The distribution curve for a light gas (like Helium) will be broad and shifted to the right, whereas the curve for a heavy gas (like Xenon) will be narrow and sharply peaked at a lower speed.

### Mean Free Path and Collision Frequency

While molecules move at incredibly high speeds (often hundreds of meters per second at room temperature), a gas released in one corner of a room takes time to diffuse to the other side. This is because molecules do not travel in straight lines from one wall to another; they constantly collide with each other, resulting in a zigzag path known as a *random walk*.

The average distance a molecule travels between successive collisions is called the **mean free path** ($\lambda$).

To derive an expression for $\lambda$, imagine a spherical molecule of diameter $d$ moving through a gas of stationary molecules. It will sweep out a "collision cylinder" with a cross-sectional area of $\pi d^2$. Any molecule whose center falls within this cylinder will be struck. The volume swept out in time $\Delta t$ at speed $v$ is $V_{\text{cylinder}} = (\pi d^2)(v \Delta t)$.

If the number of molecules per unit volume (the number density) is $N/V$, the number of collisions is the volume swept out multiplied by the number density. Because all molecules are actually moving, a relative velocity correction factor of $\sqrt{2}$ must be applied. The resulting equation for the mean free path is:

$$\lambda = \frac{1}{\sqrt{2} \pi d^2 \left(\frac{N}{V}\right)}$$

Notice that the mean free path depends inversely on the physical size of the molecules ($d$) and the density of the gas ($N/V$). Interestingly, $\lambda$ is completely independent of temperature, provided the volume of the gas remains constant.

The **collision frequency** ($f_{\text{coll}}$), which is the average number of collisions a single molecule undergoes per second, is simply its average speed divided by its mean free path:

$$f_{\text{coll}} = \frac{v_{avg}}{\lambda} = \sqrt{2} \pi d^2 v_{avg} \left(\frac{N}{V}\right)$$

At standard atmospheric pressure and room temperature, the mean free path of a typical air molecule is incredibly small—on the order of $10^{-7} \text{ m}$—and it undergoes billions of collisions every second.

---

## Chapter Summary

* **The Ideal Gas Law:** The macroscopic state of an ideal gas is described by the equation $PV = nRT$, or $PV = N k_B T$, where $R$ is the universal gas constant and $k_B$ is the Boltzmann constant.
* **Kinetic Theory of Gases:** Macroscopic pressure is the result of microscopic molecular collisions with the container walls: $P = \frac{1}{3} \frac{N}{V} m \overline{v^2}$.
* **Temperature and Kinetic Energy:** Absolute temperature is a direct measure of the average translational kinetic energy of gas molecules: $\overline{K} = \frac{3}{2} k_B T$.
* **Root-Mean-Square Speed:** The characteristic speed of gas molecules is $v_{rms} = \sqrt{\frac{3 R T}{M}}$.
* **Equipartition of Energy:** Each active degree of freedom (translational, rotational) contributes $\frac{1}{2} k_B T$ to the average energy of a molecule. Monatomic gases have 3 degrees of freedom ($f=3$); diatomic gases typically have 5 ($f=5$).
* **Molar Specific Heats:** The specific heat at constant volume is $C_V = \frac{f}{2} R$. The specific heat at constant pressure is $C_P = C_V + R$. Their ratio is $\gamma = C_P / C_V$.
* **Maxwell-Boltzmann Distribution:** The speeds of molecules in a gas are distributed statistically. The distribution depends on the temperature of the gas and the mass of the molecules.
* **Mean Free Path:** The average distance a molecule travels between collisions is $\lambda = \frac{1}{\sqrt{2} \pi d^2 (N/V)}$.
