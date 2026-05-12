From the life-saving jolt of a defibrillator to the memory cells in your smartphone, storing and releasing electrical energy is fundamental to modern technology. This chapter introduces the capacitor, a ubiquitous circuit component designed for this exact purpose. We will explore how a capacitor's physical geometry determines its capacitance—its ability to store charge—and how combining capacitors in series and parallel allows us to tailor their overall behavior. Finally, we will investigate how inserting insulating materials, known as dielectrics, drastically enhances performance by interacting with electric fields at the molecular level.

## 20.1 Definition and Calculation of Capacitance

Whenever two electrically conducting objects are separated by an insulator (or a vacuum), they form a **capacitor**. Capacitors are fundamental components in nearly all electronic circuits, serving vital roles from smoothing power supply outputs and tuning radios to storing the immense energy needed to fire a medical defibrillator. In this section, we define the property of capacitance and establish a systematic method for calculating it for various geometric arrangements.

### The Definition of Capacitance

Imagine two isolated conductors of any arbitrary shape. If we transfer electrons from one conductor to the other, one will acquire a net positive charge, $+Q$, and the other will acquire an equal and opposite net negative charge, $-Q$.

Because these charges create an electric field in the space between the conductors, there exists a potential difference, $V$, between them. Experimental observation and the principles of electrostatics (specifically Gauss's Law, as explored in Chapter 19) tell us that the magnitude of the charge $Q$ on either conductor is directly proportional to the magnitude of the potential difference $V$ between them.

We write this relationship as:

$$Q = CV$$

The proportionality constant, $C$, is called the **capacitance** of the arrangement. Rearranging the formula gives the formal definition:

$$C = \frac{Q}{V}$$

Capacitance is a measure of a capacitor's ability to store charge per unit of potential difference. Because $Q$ and $V$ are strictly proportional in electrostatics, **capacitance is a constant that depends solely on the geometry of the conductors** (their shapes, sizes, and relative positions) and the insulating material between them. It does not depend on the amount of charge $Q$ or the applied voltage $V$.

**Units:** The SI unit of capacitance is the farad (F), named in honor of Michael Faraday. Based on the equation above, one farad is equal to one coulomb per volt:

$$1 \text{ F} = 1 \text{ C/V}$$

Because the coulomb is an exceptionally large unit of charge, the farad is consequently a very large unit of capacitance. In practical circuits, you will frequently encounter microfarads ($\mu\text{F}$, $10^{-6}\text{ F}$), nanofarads ($\text{nF}$, $10^{-9}\text{ F}$), and picofarads ($\text{pF}$, $10^{-12}\text{ F}$).

---

### A General Strategy for Calculating Capacitance

To calculate the capacitance of a specific geometric arrangement of two conductors, you can follow a straightforward, four-step process:

1. **Assume a charge:** Assume the conductors carry equal and opposite charges $+Q$ and $-Q$.
2. **Find the Electric Field ($\vec{E}$):** Use Gauss's Law (Section 19.2) or Coulomb's Law to find an expression for the electric field in the region between the conductors in terms of $Q$.
3. **Find the Potential Difference ($V$):** Calculate the potential difference between the conductors by integrating the electric field along a path from the negative conductor to the positive conductor:

$$V = \int_{-}^{+} \vec{E} \cdot d\vec{s}$$

*(Note: We are concerned only with the magnitude of the potential difference, so $V$ is always taken as positive).*
4. **Calculate $C$:** Substitute the expression for $V$ into the definition $C = \frac{Q}{V}$. The variable $Q$ will cancel out, leaving an expression dependent only on geometry and fundamental constants.

Let us apply this strategy to three classic capacitor geometries: parallel plates, coaxial cylinders, and concentric spheres.

---

### 1. The Parallel-Plate Capacitor

The most common and fundamental configuration is the parallel-plate capacitor, consisting of two identical flat, parallel conducting plates, each with surface area $A$, separated by a small distance $d$.

```text
       Area A, Charge +Q
    _________________________
    + + + + + + + + + + + + +
    | | | | | | | | | | | | |  Electric Field (E)
    v v v v v v v v v v v v v
    - - - - - - - - - - - - - 
    -------------------------
       Area A, Charge -Q
    
    |<--------- d --------->|

```

**Step 1:** Assume charges $+Q$ and $-Q$ on the plates. The surface charge density is $\sigma = \frac{Q}{A}$.
**Step 2:** Assuming $d$ is very small compared to the dimensions of the plates, we can ignore edge effects (fringing fields). The electric field between the plates is uniform. From our application of Gauss's Law to conducting plates, the field magnitude is:

$$E = \frac{\sigma}{\epsilon_0} = \frac{Q}{\epsilon_0 A}$$

**Step 3:** Because the electric field is uniform, the magnitude of the potential difference is simply the field times the distance:

$$V = Ed = \frac{Qd}{\epsilon_0 A}$$

**Step 4:** Using the definition of capacitance:

$$C = \frac{Q}{V} = \frac{Q}{\left(\frac{Qd}{\epsilon_0 A}\right)} = \frac{\epsilon_0 A}{d}$$

This elegant result confirms that capacitance depends only on geometry. To increase the capacitance of a parallel-plate capacitor, you must either increase the plate area $A$ or decrease the separation distance $d$.

---

### 2. The Cylindrical Capacitor

Consider a solid cylindrical conductor of radius $a$ surrounded by a coaxial cylindrical conducting shell of inner radius $b$. Let the length of both cylinders be $L$, where $L \gg b$ so we can neglect end effects. This is the basic geometry of a coaxial cable used in telecommunications.

**Step 1:** Assume the inner cylinder carries charge $+Q$ and the outer shell carries charge $-Q$. The linear charge density is $\lambda = \frac{Q}{L}$.
**Step 2:** Using a cylindrical Gaussian surface of radius $r$ (where $a < r < b$) and length $\ell$, Gauss's Law yields the electric field:

$$E = \frac{\lambda}{2\pi\epsilon_0 r} = \frac{Q}{2\pi\epsilon_0 L r}$$

The field points radially outward from the inner to the outer cylinder.
**Step 3:** The potential difference is found by integrating the electric field radially from $a$ to $b$:

$$V = \int_{a}^{b} E \, dr = \int_{a}^{b} \frac{Q}{2\pi\epsilon_0 L r} \, dr = \frac{Q}{2\pi\epsilon_0 L} \ln\left(\frac{b}{a}\right)$$

**Step 4:** Applying the capacitance formula:

$$C = \frac{Q}{V} = \frac{Q}{\left[ \frac{Q}{2\pi\epsilon_0 L} \ln\left(\frac{b}{a}\right) \right]} = \frac{2\pi\epsilon_0 L}{\ln(b/a)}$$

Here, capacitance scales linearly with the length $L$ of the cylinder and is heavily dependent on the ratio of the outer to inner radii.

---

### 3. The Spherical Capacitor

A spherical capacitor consists of a solid conducting sphere of radius $a$ surrounded by a concentric conducting spherical shell of inner radius $b$.

**Step 1:** Assume charge $+Q$ on the inner sphere and $-Q$ on the outer shell.
**Step 2:** By Gauss's Law, the electric field in the space between the spheres ($a < r < b$) is equivalent to that of a point charge at the center:

$$E = \frac{Q}{4\pi\epsilon_0 r^2}$$

**Step 3:** We integrate the electric field from the inner sphere to the outer sphere to find $V$:

$$V = \int_{a}^{b} E \, dr = \int_{a}^{b} \frac{Q}{4\pi\epsilon_0 r^2} \, dr = \frac{Q}{4\pi\epsilon_0} \left[ -\frac{1}{r} \right]_a^b = \frac{Q}{4\pi\epsilon_0} \left( \frac{1}{a} - \frac{1}{b} \right) = \frac{Q(b-a)}{4\pi\epsilon_0 ab}$$

**Step 4:** The capacitance is therefore:

$$C = \frac{Q}{V} = 4\pi\epsilon_0 \frac{ab}{b-a}$$

#### The Isolated Sphere

An interesting limit arises if we imagine an isolated spherical conductor of radius $R$. We can treat this as a spherical capacitor where the outer shell is infinitely far away ($b \to \infty$).

Taking the limit of the spherical capacitor formula as $b \to \infty$ (where the term $\frac{ab}{b-a} \approx \frac{ab}{b} = a$), and replacing $a$ with $R$, we find the capacitance of a single isolated sphere:

$$C = 4\pi\epsilon_0 R$$

This demonstrates that even a single isolated object has the capacity to store charge, with Earth itself acting as the theoretical "second plate" at infinity.

## 20.2 Capacitors in Series and Parallel

In electronic circuits, capacitors are rarely used in isolation. They are frequently combined in various configurations to achieve a specific desired capacitance or to withstand certain voltages. When analyzing or designing circuits, it is highly useful to replace a complex combination of capacitors with a single **equivalent capacitance** ($C_{eq}$).

The equivalent capacitance is the value of a single, hypothetical capacitor that would store the exact same amount of charge—and therefore the same amount of energy—as the entire combination when connected to the same potential difference. We will analyze the two most fundamental ways to connect electrical components: in parallel and in series.

### Capacitors in Parallel

Two or more capacitors are connected in parallel when they are wired across the same two points in a circuit, as illustrated in the diagram below.

```text
          +-----------+-----------+
          |           |           |
          |         -----       -----
 Battery  |         ----- C_1   ----- C_2
    V     |           |           |
          |           |           |
          +-----------+-----------+

```

When capacitors are connected in parallel, the top plates of both capacitors are connected directly to the positive terminal of the battery (or voltage source), and the bottom plates are connected directly to the negative terminal.

Because perfectly conducting wires are assumed to have no resistance, there is no potential drop along the wires themselves. Consequently, **the potential difference ($V$) across each capacitor in a parallel combination is exactly the same, and is equal to the voltage of the source.**

$$V_1 = V_2 = V$$

When the battery is connected, it pulls electrons from the top plates and pushes them to the bottom plates until the voltage across the capacitors equals the battery's voltage. The total charge $Q_{tot}$ delivered by the battery is split between the capacitors. The conservation of charge requires that the total charge stored by the equivalent capacitor must equal the sum of the charges stored on the individual capacitors:

$$Q_{tot} = Q_1 + Q_2$$

Using the definition of capacitance ($Q = CV$), we can rewrite the charges in terms of capacitance and voltage:

* Charge on capacitor 1: $Q_1 = C_1V$
* Charge on capacitor 2: $Q_2 = C_2V$
* Total charge for the equivalent capacitor: $Q_{tot} = C_{eq}V$

Substituting these into the total charge equation yields:

$$C_{eq}V = C_1V + C_2V$$

Because the voltage $V$ is the same for all terms, we can divide it out to find the equivalent capacitance for two capacitors in parallel:

$$C_{eq} = C_1 + C_2$$

This logic easily extends to any number of capacitors, $n$, connected in parallel. The general formula is:

$$C_{eq} = C_1 + C_2 + C_3 + \dots + C_n = \sum_{i=1}^{n} C_i \quad \text{(Parallel Combination)}$$

**Key Insight:** Connecting capacitors in parallel always results in an equivalent capacitance that is *greater* than any of the individual capacitances in the group. Physically, connecting capacitors in parallel is equivalent to increasing the total surface area of the capacitor plates, which proportionally increases the capacity to store charge.

---

### Capacitors in Series

Two or more capacitors are connected in series when they are wired one after another in a single path, meaning the same wire connects the bottom plate of the first capacitor to the top plate of the second, and so on.

```text
          +-------||-----------||-------+
          |       C_1          C_2      |
          |                             |
 Battery  |                             |
    V     |                             |
          +-----------------------------+

```

When a voltage $V$ is applied across a series combination, the battery removes electrons from the leftmost plate of $C_1$ and deposits them on the rightmost plate of $C_2$, giving them charges of $+Q$ and $-Q$, respectively.

The inner plates (the right plate of $C_1$ and the left plate of $C_2$) are electrically isolated from the battery. They form a neutral "H-shaped" conducting segment. As the outer plates become charged, they induce a separation of charge on this isolated central segment. The $+Q$ charge on the leftmost plate attracts $-Q$ to the adjacent plate, which forces $+Q$ to the next plate.

Therefore, **the magnitude of charge ($Q$) on all plates in a series combination is exactly the same.**

$$Q_1 = Q_2 = Q_{tot} = Q$$

While the charge is uniform, the total potential difference provided by the battery must be distributed among the capacitors. By the principle of conservation of energy, the total voltage $V$ is the sum of the individual potential differences across each capacitor:

$$V_{tot} = V_1 + V_2$$

Using the capacitance formula, we can express the voltage across each component as $V = \frac{Q}{C}$:

* Voltage across capacitor 1: $V_1 = \frac{Q}{C_1}$
* Voltage across capacitor 2: $V_2 = \frac{Q}{C_2}$
* Total voltage across the equivalent capacitor: $V_{tot} = \frac{Q}{C_{eq}}$

Substituting these expressions into the voltage equation gives:

$$\frac{Q}{C_{eq}} = \frac{Q}{C_1} + \frac{Q}{C_2}$$

Dividing out the common charge $Q$ yields the formula for the equivalent capacitance of two capacitors in series:

$$\frac{1}{C_{eq}} = \frac{1}{C_1} + \frac{1}{C_2}$$

For any number of capacitors, $n$, connected in series, the reciprocal of the equivalent capacitance is the sum of the reciprocals of the individual capacitances:

$$\frac{1}{C_{eq}} = \frac{1}{C_1} + \frac{1}{C_2} + \frac{1}{C_3} + \dots + \frac{1}{C_n} = \sum_{i=1}^{n} \frac{1}{C_i} \quad \text{(Series Combination)}$$

**Key Insight:** Connecting capacitors in series always results in an equivalent capacitance that is *less* than the smallest individual capacitance in the series chain. Physically, placing capacitors in series is analogous to increasing the separation distance between the outermost plates, which reduces the overall ability of the system to store charge for a given voltage.

### Analyzing Complex Circuit Networks

Many practical circuits contain networks of capacitors that are combinations of both series and parallel connections. To find the equivalent capacitance of a complex circuit, you must break the circuit down into simpler segments.

1. Identify any sub-groups of capacitors that are purely in series or purely in parallel.
2. Calculate the equivalent capacitance for those sub-groups.
3. Redraw the circuit using the newly calculated equivalent capacitors.
4. Repeat the process iteratively until the entire network is reduced to a single equivalent capacitance ($C_{eq}$). Once $C_{eq}$ is found, you can work backward through your redrawn diagrams to find the charge and voltage on any individual capacitor in the original circuit.

## 20.3 Energy Stored in an Electric Field

Many of the most important applications of capacitors—from the flash in a camera to the life-saving burst of a defibrillator—rely not just on their ability to store charge, but on their ability to store and quickly release electrical energy. To understand how a capacitor stores energy, we must examine the work required to charge it.

### The Work of Charging a Capacitor

Imagine an initially uncharged capacitor. If you want to move a small amount of positive charge from one plate to the other, you must do work against the electric field that begins to build up between the plates.

At the very beginning, when the plates are uncharged, transferring the first electron requires practically no work because there is no opposing electric field. However, as charge accumulates, a potential difference $v$ develops across the plates. To transfer an additional infinitesimal bit of charge, $dq$, from the negative plate to the positive plate, an external agent (like a battery) must do a small amount of work, $dW$.

By the definition of electric potential (work per unit charge), this incremental work is:

$$dW = v \, dq$$

At any intermediate stage during the charging process, the potential difference $v$ across the capacitor is related to the amount of charge $q$ currently on the plates by the capacitance: $v = \frac{q}{C}$. Substituting this into our work equation gives:

$$dW = \frac{q}{C} \, dq$$

To find the total work, $W$, required to charge the capacitor from a completely uncharged state ($q = 0$) to its final charge ($q = Q$), we integrate this expression:

$$W = \int_{0}^{Q} \frac{q}{C} \, dq = \frac{1}{C} \left[ \frac{q^2}{2} \right]_0^Q = \frac{Q^2}{2C}$$

By the work-energy theorem, the work done by the battery is stored as electric potential energy, $U$, in the capacitor. Therefore, the energy stored is:

$$U = \frac{1}{2} \frac{Q^2}{C}$$

Because the final charge, capacitance, and final voltage $V$ are related by $Q = CV$, we can substitute to express this stored energy in two other very useful, equivalent forms:

$$U = \frac{1}{2} CV^2 = \frac{1}{2} QV$$

The choice of which formula to use depends on which parameters of the circuit remain constant. For instance, if a capacitor is connected to a battery, its voltage $V$ is constant, making $U = \frac{1}{2}CV^2$ the most convenient choice.

### A Graphical Interpretation

The charging process can be easily visualized using a graph of the potential difference $v$ versus the charge $q$. Because $v = \frac{1}{C}q$, the graph is a straight line passing through the origin with a slope of $\frac{1}{C}$.

```text
       Potential 
      Difference (v)
          ^
        V |                                 *  Final State (Q, V)
          |                               * |
          |                             *   |
          |                           *     |   Area under the curve
          |                         *       |   = Total Work (U)
          |                       *         |   = 1/2 * base * height
          |                     *           |   = 1/2 * Q * V
          |                   *             |
          |      dW = v*dq  * |<-- dq -->|  |
          |               *   |          |  |
          |             *     |          |  |
          |           *       +----------+  |
          |         *                       |
          |       *                         |
          +---------------------------------------------> Charge (q)
                                            Q

```

The incremental work $dW = v \, dq$ corresponds to the area of a narrow rectangular strip of height $v$ and width $dq$. The total work $W$ is the total area under the $v$ versus $q$ curve. Because the curve is a triangle, the area is simply $\frac{1}{2} \cdot \text{base} \cdot \text{height}$, which immediately yields $U = \frac{1}{2}QV$.

### Energy Density of an Electric Field

We have established *how much* energy is stored in a capacitor, but *where* exactly is this energy located?

While it is mathematically sound to say the energy is stored in the charges residing on the plates, it is far more profound—and entirely consistent with modern physics—to state that **the energy is stored in the electric field itself**.

To see this, let us analyze a parallel-plate capacitor. The energy stored is $U = \frac{1}{2}CV^2$. We know from Section 20.1 that the capacitance is $C = \frac{\epsilon_0 A}{d}$, and the voltage is related to the uniform electric field between the plates by $V = Ed$. Substituting these into the energy equation:

$$U = \frac{1}{2} \left( \frac{\epsilon_0 A}{d} \right) (Ed)^2$$

$$U = \frac{1}{2} \epsilon_0 A d E^2$$

Notice the term $A \cdot d$. The area of the plates multiplied by the distance between them is exactly the volume over which the electric field exists. If we divide the total energy $U$ by this volume, we arrive at the **energy density**, $u_E$ (energy per unit volume):

$$u_E = \frac{U}{\text{Volume}} = \frac{\frac{1}{2} \epsilon_0 A d E^2}{Ad}$$

$$u_E = \frac{1}{2} \epsilon_0 E^2$$

This result represents a conceptual leap. Although we derived it using the specific geometry of a parallel-plate capacitor, **this equation is universally valid.** Wherever an electric field $E$ exists in a vacuum—whether it is created by a capacitor, a point charge, or a radio antenna—there is energy stored in that space, with a density proportional to the square of the electric field magnitude. This idea of fields carrying energy will become critically important when we study electromagnetic waves in Chapter 25.

## 20.4 Capacitors with Dielectrics

In previous sections, we assumed the space between capacitor plates was a vacuum (or air, which behaves very much like a vacuum electrically). In practice, however, the space between the conducting plates of most commercial capacitors is filled with a non-conducting material called a **dielectric**. Common dielectric materials include paper, mica, ceramic, plastics like Mylar, and various metal oxides.

Introducing a dielectric serves three crucial engineering functions:

1. **Mechanical separation:** It provides a physical barrier that keeps the conducting plates from coming into contact, even when they are separated by microscopic distances.
2. **Increased maximum operating voltage:** Dielectrics can sustain higher electric fields than air before breaking down and conducting electricity.
3. **Increased capacitance:** Most importantly, a dielectric increases the capacitance of a capacitor by a predictable factor.

### The Dielectric Constant

In 1837, Michael Faraday made a fundamental discovery: if the space between the plates of a capacitor is completely filled with a dielectric material, the capacitance increases by a dimensionless factor $\kappa$ (the Greek letter kappa), called the **dielectric constant** of the material.

If $C_0$ represents the capacitance of a given capacitor in a vacuum, its capacitance $C$ with a dielectric completely filling the space between the electrodes is:

$$C = \kappa C_0$$

Because inserting a dielectric always increases capacitance, the dielectric constant $\kappa$ is always greater than 1 for any material. For a perfect vacuum, $\kappa = 1$ exactly. For air at standard temperature and pressure, $\kappa \approx 1.00059$, which is so close to 1 that we typically use $C_0$ for air-filled capacitors in calculations. Other materials have significantly higher values, such as paper ($\kappa \approx 3.7$), glass ($\kappa \approx 5.6$), and pure water ($\kappa \approx 80$).

For a parallel-plate capacitor, the presence of a dielectric modifies the capacitance formula to:

$$C = \kappa \frac{\epsilon_0 A}{d} = \frac{\epsilon A}{d}$$

Here, we have introduced $\epsilon = \kappa \epsilon_0$, known as the **permittivity of the material**. The constant $\epsilon_0$ is the permittivity of free space.

### The Effect of a Dielectric on Voltage and Charge

To understand the physical consequences of the formula $C = \kappa C_0$, we must examine what happens when we insert a dielectric under two distinct physical conditions: when the capacitor is electrically isolated, and when it remains connected to a voltage source.

#### Scenario 1: The Isolated Capacitor (Constant Charge)

Imagine a parallel-plate capacitor in a vacuum. We connect it to a battery, charge it to a voltage $V_0$ so it acquires a charge $Q_0$, and then **disconnect the battery**. The capacitor is now electrically isolated, meaning the charge $Q_0$ is trapped on the plates and cannot change.

If we now insert a dielectric of constant $\kappa$ between the plates, the capacitance increases to $C = \kappa C_0$. Since the charge $Q$ remains equal to $Q_0$, the new potential difference $V$ across the plates must change according to $V = \frac{Q}{C}$:

$$V = \frac{Q_0}{\kappa C_0} = \frac{V_0}{\kappa}$$

Because $\kappa > 1$, the potential difference *decreases*.

Since the distance $d$ between the plates has not changed, the magnitude of the uniform electric field ($E = \frac{V}{d}$) must also decrease by the same factor:

$$E = \frac{E_0}{\kappa}$$

```text
    Isolated Capacitor (Constant Charge Q)
    
    Vacuum (C_0, V_0, E_0)       Dielectric Inserted (C = \kappa C_0)
    + + + + + + + + + +          + + + + + + + + + +
    | | | | | | | | | |          | | | | | | | | | |  <-- E-field is
    v v v v v v v v v v          v v v v v v v v v v      weaker
    - - - - - - - - - -          - - - - - - - - - -

```

The physical reason for this reduction in the electric field will be explained in detail in Section 20.5 (A Molecular Model of a Dielectric).

#### Scenario 2: The Connected Capacitor (Constant Voltage)

Now consider a different scenario. A vacuum capacitor is connected to a battery with voltage $V_0$. This time, we **leave the battery connected** while we insert the dielectric.

Because the battery remains connected, the potential difference across the capacitor cannot change; it is fixed at $V_0$. As the dielectric slides in, the capacitance increases to $C = \kappa C_0$. To maintain the voltage $V_0$ with a larger capacitance, the battery must supply additional charge to the plates. The new charge $Q$ is:

$$Q = CV_0 = (\kappa C_0) V_0 = \kappa Q_0$$

The charge on the plates *increases* by a factor of $\kappa$. Because the voltage $V$ and the plate separation $d$ remain constant, the overall electric field ($E = \frac{V}{d}$) between the plates remains exactly the same as it was before the dielectric was inserted.

### Dielectric Strength

While a dielectric increases a capacitor's ability to store charge, there is a limit to the electric field any insulating material can withstand. If the electric field applied across a dielectric becomes too large, it can tear electrons away from their parent atoms. The material suddenly ionizes and becomes a conductor, allowing a massive spark or arc of current to pass through it. This catastrophic failure is called **dielectric breakdown**.

The maximum electric field magnitude that a material can withstand without undergoing breakdown is called its **dielectric strength**, denoted by $E_{max}$.

For any capacitor with a specific plate separation $d$, the dielectric strength dictates the maximum safe operating voltage, or breakdown voltage ($V_{max}$):

$$V_{max} = E_{max} d$$

For example, the dielectric strength of dry air is approximately $3 \times 10^6 \text{ V/m}$. Polycarbonate, a common plastic used in capacitors, has a dielectric strength of roughly $30 \times 10^6 \text{ V/m}$. A capacitor utilizing polycarbonate can therefore be subjected to a voltage ten times higher than an identical air-filled capacitor before failing.

### Energy Stored with a Dielectric

The energy stored in a capacitor is also affected by the presence of a dielectric. Let's revisit our isolated capacitor scenario (Constant $Q$).

The initial energy in the vacuum capacitor was $U_0 = \frac{Q_0^2}{2C_0}$. After the dielectric is inserted, the charge remains $Q_0$, but the capacitance increases to $\kappa C_0$. The new energy is:

$$U = \frac{Q_0^2}{2(\kappa C_0)} = \frac{U_0}{\kappa}$$

The stored energy *decreases*. Where did the energy go? As the dielectric is inserted into the fringing electric field at the edges of the capacitor, it experiences a net inward electrostatic force. The capacitor essentially "sucks" the dielectric in. If you were holding the dielectric, it would do work on your hand as it was pulled between the plates.

Conversely, if the battery remains connected (Constant $V$), the energy $U_0 = \frac{1}{2} C_0 V_0^2$ changes to $U = \frac{1}{2} (\kappa C_0) V_0^2 = \kappa U_0$. In this case, the stored energy *increases*. The extra energy is provided by the work done by the battery as it pumps additional charge onto the plates.

## 20.5 A Molecular Model of a Dielectric

In Section 20.4, we established a macroscopic, empirical rule: inserting a dielectric into an isolated capacitor reduces the electric field between its plates by a factor of $\kappa$ (so $E = E_0 / \kappa$). To understand *why* this reduction occurs, we must look at the microscopic, molecular structure of the dielectric material.

### Polar and Nonpolar Molecules

Dielectric materials are insulators, meaning they do not contain free electrons that can drift through the material. All electrons are tightly bound to their parent atoms or molecules. However, these molecules interact with external electric fields in one of two ways, depending on whether they are polar or nonpolar.

**1. Polar Molecules:**
Some molecules, like water ($\text{H}_2\text{O}$), have an inherent asymmetry in their charge distribution. Even though the molecule is electrically neutral overall, the "center of gravity" of its positive charge does not perfectly coincide with the "center of gravity" of its negative charge. These molecules possess a permanent **electric dipole moment**.
In the absence of an external electric field, thermal agitation causes these polar molecules to be oriented randomly, resulting in a net dipole moment of zero for the macroscopic material. When an external electric field $\vec{E}_0$ is applied, it exerts a torque on these dipoles, tending to align them parallel to the field.

**2. Nonpolar Molecules:**
Molecules like symmetrically bonded oxygen ($\text{O}_2$) or nitrogen ($\text{N}_2$) have perfectly coinciding centers of positive and negative charge; they have no permanent dipole moment. However, when placed in an external electric field $\vec{E}_0$, the field pushes the positive nuclei in the direction of the field and pulls the negative electron clouds in the opposite direction. This slight separation of charge creates an **induced dipole moment**.

### Polarization and Bound Charge

Whether the molecules are polar or nonpolar, the macroscopic result of applying an external electric field is the same: the material becomes **polarized**. The molecular dipoles align (or are induced to align) with the external field.

Let us visualize a slab of dielectric material placed between the charged plates of a capacitor.

```text
  Free Charge (+Q, +\sigma)                  Free Charge (-Q, -\sigma)
  |                                                              |
  |      Bound Charge (-\sigma_ind)      Bound Charge (+\sigma_ind)  |
  |        |                                           |         |
  +        -    [-  +]      [-  +]      [-  +]         +         -
  +        -    [-  +]      [-  +]      [-  +]         +         -
  +        -    [-  +]      [-  +]      [-  +]         +         -
  +        -    [-  +]      [-  +]      [-  +]         +         -
  |        |                                           |         |
  |        -------------------->  E_0 -------------------->      |
  |              <------------- E_ind -------------              |
  |                                                              |

```

Inside the bulk of the dielectric, the positive tail of one dipole sits right next to the negative head of an adjacent dipole. These internal charges effectively cancel each other out, leaving the bulk of the material electrically neutral.

However, at the surfaces of the dielectric slab, this cancellation does not occur.

* On the surface adjacent to the positive capacitor plate, there is a layer of uncompensated negative molecular charges.
* On the surface adjacent to the negative capacitor plate, there is a layer of uncompensated positive molecular charges.

These surface charges are called **bound charges** because they belong to the molecules of the dielectric and are not free to move across the gap or through the wires. We denote the surface density of these bound charges as $\sigma_{ind}$ (induced surface charge density), to distinguish them from the free charge density $\sigma$ on the conducting plates.

### The Induced Electric Field

Because there is now a layer of positive charge on one side of the dielectric and a layer of negative charge on the other, these bound charges create their own internal electric field, the **induced electric field** ($\vec{E}_{ind}$).

As shown in the diagram above, $\vec{E}_{ind}$ points from the positive bound charge to the negative bound charge. Crucially, **this induced field points in the exact opposite direction to the external field $\vec{E}_0$ created by the capacitor plates.**

The net electric field $\vec{E}$ inside the dielectric is the vector superposition of the external field and the induced field. Since they point in opposite directions, the magnitude of the net field is the difference of their magnitudes:

$$E = E_0 - E_{ind}$$

This is the physical mechanism behind the dielectric effect: **the alignment of molecular dipoles creates a reverse internal field that partially cancels the external field, weakening the overall electric field within the material.**

### Relating Microscopic and Macroscopic Views

We can now connect this molecular model (involving $E_{ind}$) back to our macroscopic definition involving the dielectric constant ($\kappa$). We know experimentally that the net field is weakened by a factor of $\kappa$:

$$E = \frac{E_0}{\kappa}$$

Substituting this into our superposition equation gives:

$$\frac{E_0}{\kappa} = E_0 - E_{ind}$$

Rearranging to solve for the induced field:

$$E_{ind} = E_0 \left( 1 - \frac{1}{\kappa} \right)$$

We can also express this in terms of charge densities. In the gap between the plates and the dielectric, the external field is governed by the free charge density on the plates: $E_0 = \frac{\sigma}{\epsilon_0}$. The induced field is created by the bound charges on the surface of the dielectric, so $E_{ind} = \frac{\sigma_{ind}}{\epsilon_0}$. Substituting these into the equation above yields a relationship between the free charge and the bound charge:

$$\frac{\sigma_{ind}}{\epsilon_0} = \frac{\sigma}{\epsilon_0} \left( 1 - \frac{1}{\kappa} \right)$$

$$\sigma_{ind} = \sigma \left( 1 - \frac{1}{\kappa} \right)$$

This equation confirms that the induced bound charge $\sigma_{ind}$ is always less than the free charge $\sigma$. If the dielectric were replaced by a vacuum ($\kappa = 1$), the equation yields $\sigma_{ind} = 0$, as expected. If the material were replaced by a perfect conductor (where the internal field must be zero, implying $\kappa \to \infty$), the equation yields $\sigma_{ind} = \sigma$, meaning the induced charges would completely cancel the external field.

---

## Chapter Summary

* **Capacitance ($C$)** is defined as the ratio of the magnitude of the charge on either conductor to the magnitude of the potential difference between them: $C = \frac{Q}{V}$. The SI unit is the farad (F), where $1 \text{ F} = 1 \text{ C/V}$.
* Capacitance depends only on the physical geometry of the conductors and the insulating material between them.
* **Parallel-Plate Capacitor:** $C = \frac{\epsilon_0 A}{d}$
* **Cylindrical Capacitor:** $C = \frac{2\pi\epsilon_0 L}{\ln(b/a)}$
* **Spherical Capacitor:** $C = 4\pi\epsilon_0 \frac{ab}{b-a}$

* **Capacitors in Parallel:** The potential difference is the same across each capacitor. The equivalent capacitance is the simple sum:

$$C_{eq} = C_1 + C_2 + C_3 + \dots$$

* **Capacitors in Series:** The magnitude of charge is the same on all plates. The reciprocal of the equivalent capacitance is the sum of the reciprocals:

$$\frac{1}{C_{eq}} = \frac{1}{C_1} + \frac{1}{C_2} + \frac{1}{C_3} + \dots$$

* **Energy Stored in a Capacitor ($U$):** The work required to charge a capacitor is stored as electric potential energy:

$$U = \frac{Q^2}{2C} = \frac{1}{2}CV^2 = \frac{1}{2}QV$$

* **Energy Density ($u_E$):** The energy stored in a capacitor resides in the electric field itself. The energy per unit volume in any electric field is:

$$u_E = \frac{1}{2}\epsilon_0 E^2$$

* **Dielectrics:** An insulating material placed between the plates of a capacitor increases its capacitance by a dimensionless factor $\kappa$ (the dielectric constant): $C = \kappa C_0$.
* **Molecular Model:** A dielectric increases capacitance because its molecules polarize in an external electric field. This polarization creates bound surface charges that generate an induced, opposing electric field ($E_{ind}$), which weakens the net electric field ($E = E_0/\kappa$) and reduces the potential difference for a given charge.
