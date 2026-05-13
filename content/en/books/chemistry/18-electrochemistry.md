Electrochemistry is the study of the relationship between chemical change and electrical energy. While previous chapters focused on the heat released or absorbed by reactions, we will now examine how the transfer of electrons in oxidation-reduction (redox) reactions can be harnessed to generate an electric current. This spontaneous process is the foundation of the batteries that power our daily lives. Conversely, we will explore how applied electricity can force nonspontaneous chemical reactions to occur, enabling industrial processes like metal purification. Ultimately, this chapter bridges the gap between atomic-level electron transfer and macroscopic electrical power.

## 18.1 Assigning Oxidation States

In Section 4.4, we introduced oxidation-reduction (redox) reactions as processes involving the transfer of electrons between reactants. To systematically track these electron transfers—especially in complex molecules and polyatomic ions—chemists utilize a bookkeeping system known as **oxidation states** (or oxidation numbers).

The oxidation state of an atom is defined as the charge it would possess if all its bonds were 100% ionic. While formal charge (introduced in Section 7.6) assumes electrons are shared equally in a covalent bond, oxidation states assume that bonding electrons are assigned entirely to the more electronegative atom.

### The Hierarchy of Oxidation State Rules

Assigning oxidation states requires following a specific set of rules. Because conflicts can occasionally arise, these rules must be applied **hierarchically**; a rule higher on the list always takes precedence over a rule lower on the list.

**1. The Free Element Rule**
The oxidation state of an atom in a free, uncombined element is always exactly **0**.

> *Examples:* In $Cu$, $H_2$, $O_3$, and $P_4$, every atom has an oxidation state of 0.

**2. The Monatomic Ion Rule**
The oxidation state of a monatomic ion is equal to the net charge of the ion.

> *Examples:* For $Na^+$, the oxidation state is +1. For $S^{2-}$, it is -2.

**3. The Sum Rule**

* For a **neutral molecule**, the sum of the oxidation states of all atoms must equal **0**.
* For a **polyatomic ion**, the sum of the oxidation states of all atoms must equal the **net charge** of the ion.

**4. Specific Element Rules (In Order of Priority)**
When atoms are combined in compounds, assign their oxidation states in this exact order:

* **Group 1 (Alkali Metals):** Always +1 in compounds.
* **Group 2 (Alkaline Earth Metals):** Always +2 in compounds.
* **Fluorine (F):** Always -1 in compounds (as it is the most electronegative element).
* **Hydrogen (H):** Usually +1.
* *Exception:* When bonded to less electronegative elements (like in metal hydrides such as $NaH$ or $LiAlH_4$), hydrogen takes precedence and is assigned -1.

* **Oxygen (O):** Usually -2.
* *Exception 1:* In peroxides (containing the $O_2^{2-}$ ion, such as $H_2O_2$), oxygen is -1.
* *Exception 2:* In superoxides (containing the $O_2^-$ ion, such as $KO_2$), oxygen is -1/2.
* *Exception 3:* When bonded to fluorine (e.g., $OF_2$), rule order dictates F is -1, forcing O to be +2.

* **Group 17 (Halogens):** Usually -1.
* *Exception:* When bonded to oxygen or a lighter, more electronegative halogen (e.g., Cl in $ClO_4^-$), they can have positive oxidation states.

### Applying the Rules: Algebraic Determination

When confronted with a chemical formula, assign the known oxidation states using the rules above, and use simple algebra (via the Sum Rule) to solve for the unknown atom.

#### Example 1: A Neutral Compound

Determine the oxidation state of chromium (Cr) in potassium dichromate, $K_2Cr_2O_7$.

1. **Assign knowns:**

* Potassium (K) is a Group 1 metal $\rightarrow$ +1
* Oxygen (O) is usually $\rightarrow$ -2

1. **Set up the sum rule:** The compound is neutral, so the sum equals 0. Let $x$ be the oxidation state of Cr.

$$2(+1) + 2(x) + 7(-2) = 0$$

$$2 + 2x - 14 = 0$$

$$2x - 12 = 0$$

$$2x = 12$$

$$x = +6$$

**Visual Mapping:**

```text
 Oxidation State per atom:    +1      +6      -2
                              |       |       |
                 Formula:     K2     Cr2      O7
                              |       |       |
 Total contribution:        2(+1) + 2(+6) + 7(-2) = 0

```

#### Example 2: A Polyatomic Ion

Determine the oxidation state of carbon (C) in the oxalate ion, $C_2O_4^{2-}$.

1. **Assign knowns:** Oxygen is -2.
2. **Set up the sum rule:** The ion has a -2 charge. Let $x$ be the oxidation state of C.

$$2(x) + 4(-2) = -2$$

$$2x - 8 = -2$$

$$2x = +6$$

$$x = +3$$

#### Example 3: Conflicting Rules and Exceptions

Determine the oxidation state of sulfur (S) in the thiosulfate ion, $S_2O_3^{2-}$.

1. **Assign knowns:** Oxygen is -2.
2. **Set up the sum rule:** The ion has a -2 charge. Let $x$ be the oxidation state of S.

$$2(x) + 3(-2) = -2$$

$$2x - 6 = -2$$

$$2x = +4$$

$$x = +2$$

### Fractional Oxidation States

Occasionally, solving for an oxidation state yields a fraction. Consider the tetrathionate ion, $S_4O_6^{2-}$.

Letting $x$ be the oxidation state of sulfur:

$$4(x) + 6(-2) = -2$$

$$4x - 12 = -2$$

$$4x = 10$$

$$x = +2.5$$

A fractional oxidation state of +2.5 for a single atom is physically impossible, as electrons are indivisible entities. Fractional values arise because the calculated oxidation state is a **mathematical average** of several atoms of the same element in different bonding environments.

If we were to draw the Lewis structure for $S_4O_6^{2-}$ (relying on principles from Chapter 7), we would see that the two central sulfur atoms are bonded only to other sulfur atoms (oxidation state 0), while the two terminal sulfur atoms are bonded to oxygen (oxidation state +5).

$$Average = \frac{+5 + 0 + 0 + +5}{4} = +2.5$$

For the purposes of balancing redox equations (which we will cover in Section 18.2), treating the atoms as having an average, fractional oxidation state is entirely acceptable and mathematically sound.

## 18.2 Balancing Redox Equations via the Half-Reaction Method

While simple oxidation-reduction reactions can sometimes be balanced by inspection, many redox reactions—especially those occurring in aqueous solutions—are too complex to balance using simple trial and error. To handle these, chemists use the **half-reaction method**.

This systematic approach involves physically separating the overall chemical equation into two individual equations: one representing the oxidation process and the other representing the reduction process. After balancing each half-reaction separately, they are recombined to give the balanced overall equation.

### Balancing in Acidic Solution

Aqueous redox reactions often occur in acidic or basic environments, meaning that $H^+$ ions, $OH^-$ ions, and $H_2O$ molecules are present and can participate as reactants or products.

Follow this strict sequence of steps to balance a redox reaction in an **acidic** solution.

**Step 1: Separate the reaction into two half-reactions.**
Use oxidation states (Section 18.1) to identify which element is oxidized (loses electrons, oxidation state increases) and which is reduced (gains electrons, oxidation state decreases). Write the skeletal equations for the oxidation and reduction half-reactions.

**Step 2: Balance all elements *except* oxygen and hydrogen.**
Adjust the stoichiometric coefficients for the primary elements undergoing the redox change.

**Step 3: Balance oxygen atoms by adding water ($H_2O$).**
For every oxygen atom needed on one side of the equation, add one $H_2O$ molecule to that side.

**Step 4: Balance hydrogen atoms by adding protons ($H^+$).**
Because the reaction occurs in an acidic medium, $H^+$ is abundantly available. Add $H^+$ ions to the side deficient in hydrogen.

**Step 5: Balance the net charge by adding electrons ($e^-$).**
Add electrons to the more positive (or less negative) side of the half-reaction so that the total charge on the reactant side equals the total charge on the product side.

* In the **oxidation** half-reaction, electrons will appear on the **product** side.
* In the **reduction** half-reaction, electrons will appear on the **reactant** side.

**Step 6: Equalize the number of electrons transferred.**
Multiply one or both balanced half-reactions by appropriate integers so that the number of electrons lost in oxidation exactly equals the number of electrons gained in reduction.

**Step 7: Add the half-reactions and simplify.**
Add the two equations together. Cancel out identical species (like $e^-$, $H_2O$, and $H^+$) that appear on both sides of the arrow.

**Step 8: Final check.**
Verify that both the atoms and the overall electrical charges are balanced.

### Worked Example: Acidic Solution

**Problem:** Balance the reaction between the permanganate ion and the oxalate ion in an acidic solution.

$$MnO_4^- (aq) + C_2O_4^{2-} (aq) \rightarrow Mn^{2+} (aq) + CO_2 (g)$$

* **Step 1: Separate into half-reactions.**
* Manganese goes from +7 in $MnO_4^-$ to +2 in $Mn^{2+}$ (Reduction).
* Carbon goes from +3 in $C_2O_4^{2-}$ to +4 in $CO_2$ (Oxidation).
* *Reduction:* $MnO_4^- \rightarrow Mn^{2+}$
* *Oxidation:* $C_2O_4^{2-} \rightarrow CO_2$

* **Step 2: Balance elements other than O and H.**
* *Reduction:* $MnO_4^- \rightarrow Mn^{2+}$ (Mn is already balanced)
* *Oxidation:* $C_2O_4^{2-} \rightarrow 2CO_2$ (Added a 2 to balance Carbon)

* **Step 3: Balance O with $H_2O$.**
* *Reduction:* $MnO_4^- \rightarrow Mn^{2+} + 4H_2O$
* *Oxidation:* $C_2O_4^{2-} \rightarrow 2CO_2$ (Oxygen is already balanced: 4 on both sides)

* **Step 4: Balance H with $H^+$.**
* *Reduction:* $MnO_4^- + 8H^+ \rightarrow Mn^{2+} + 4H_2O$
* *Oxidation:* $C_2O_4^{2-} \rightarrow 2CO_2$ (No hydrogen present)

* **Step 5: Balance charge with $e^-$.**
* *Reduction:* Left side is -1 + 8(+1) = +7. Right side is +2. Add $5e^-$ to the left.

$$MnO_4^- + 8H^+ + 5e^- \rightarrow Mn^{2+} + 4H_2O$$

* *Oxidation:* Left side is -2. Right side is 0. Add $2e^-$ to the right.

$$C_2O_4^{2-} \rightarrow 2CO_2 + 2e^-$$

* **Step 6: Equalize electrons.**
* Multiply the reduction reaction by 2 (to get $10e^-$).

$$2MnO_4^- + 16H^+ + 10e^- \rightarrow 2Mn^{2+} + 8H_2O$$

* Multiply the oxidation reaction by 5 (to get $10e^-$).

$$5C_2O_4^{2-} \rightarrow 10CO_2 + 10e^-$$

* **Step 7: Add and simplify.**

$$2MnO_4^- + 16H^+ + 5C_2O_4^{2-} \rightarrow 2Mn^{2+} + 8H_2O + 10CO_2$$

* **Step 8: Final check.**
* **Atoms:** 2 Mn, 28 O, 16 H, 10 C on both sides.
* **Charge:** Left: 2(-1) + 16(+1) + 5(-2) = +4. Right: 2(+2) = +4. The equation is fully balanced.

### Balancing in Basic Solution

Reactions in basic solutions follow the exact same procedure as acidic solutions for Steps 1 through 7. However, because $H^+$ cannot exist in significant concentrations in a basic medium (which is rich in $OH^-$), an additional neutralization step is required at the end.

**The Basic Solution Modification:**
Once you have the completely balanced equation with $H^+$ (as if it were in an acidic solution), add an equal number of hydroxide ions ($OH^-$) to **both sides** of the equation to eliminate the $H^+$.

* On the side containing $H^+$, the $H^+$ and $OH^-$ will combine to form water molecules ($H_2O$).
* On the other side, the $OH^-$ will simply appear as a product or reactant.
* Finally, cancel out any redundant $H_2O$ molecules that now appear on both sides of the equation.

### Worked Example: Basic Solution

**Problem:** Balance the reaction between the permanganate ion and the cyanide ion in a basic solution.

$$MnO_4^- (aq) + CN^- (aq) \rightarrow MnO_2 (s) + CNO^- (aq)$$

* **Steps 1-5: Balance as if Acidic.**
* *Reduction:* $MnO_4^- + 4H^+ + 3e^- \rightarrow MnO_2 + 2H_2O$
* *Oxidation:* $CN^- + H_2O \rightarrow CNO^- + 2H^+ + 2e^-$

* **Step 6: Equalize electrons.**
* Multiply reduction by 2:

$$2MnO_4^- + 8H^+ + 6e^- \rightarrow 2MnO_2 + 4H_2O$$

* Multiply oxidation by 3:

$$3CN^- + 3H_2O \rightarrow 3CNO^- + 6H^+ + 6e^-$$

* **Step 7: Add and simplify (Acidic Intermediate).**
* Electrons cancel.
* $8H^+$ on the left and $6H^+$ on the right simplify to $2H^+$ on the left.
* $3H_2O$ on the left and $4H_2O$ on the right simplify to $1H_2O$ on the right.

$$2MnO_4^- + 3CN^- + 2H^+ \rightarrow 2MnO_2 + 3CNO^- + H_2O$$

* **Step 8: Convert to Basic.**
* We have $2H^+$ on the left. Add $2OH^-$ to **both sides**.

$$2MnO_4^- + 3CN^- + 2H^+ + 2OH^- \rightarrow 2MnO_2 + 3CNO^- + H_2O + 2OH^-$$

* Combine the $H^+$ and $OH^-$ on the left to form water.

$$2MnO_4^- + 3CN^- + 2H_2O \rightarrow 2MnO_2 + 3CNO^- + H_2O + 2OH^-$$

* Cancel out redundant water (one $H_2O$ can be removed from both sides).

$$2MnO_4^- + 3CN^- + H_2O \rightarrow 2MnO_2 + 3CNO^- + 2OH^-$$

* **Final Check:**
* **Atoms:** 2 Mn, 9 O, 3 C, 3 N, 2 H on both sides.
* **Charge:** Left: 2(-1) + 3(-1) = -5. Right: 3(-1) + 2(-1) = -5. The equation is fully balanced for a basic environment.

## 18.3 Voltaic (Galvanic) Cells and Cell Potentials

In Section 18.2, we learned how to separate an overall redox reaction into two distinct half-reactions. If a spontaneous redox reaction occurs by directly mixing the reactants in a single flask, the transfer of electrons happens directly between the particles, and the released energy is dissipated as heat. However, if we physically separate the oxidation half-reaction from the reduction half-reaction, we can force the transferred electrons to travel through an external wire. This flow of electrons constitutes an electric current that can be used to perform electrical work.

A device constructed to harness this electron flow from a spontaneous chemical reaction is called a **voltaic cell** (or **galvanic cell**).

### The Anatomy of a Voltaic Cell

To construct a functioning voltaic cell, several specific components are required. The physical separation is achieved by creating two **half-cells**, each containing an electrode and an electrolytic solution.

**1. The Electrodes**
Electrodes are solid conductive surfaces where the half-reactions take place.

* **The Anode:** The electrode where **oxidation** occurs. Because it is the source of the electrons being pushed into the external circuit, it is designated as the **negative (–)** terminal.
* **The Cathode:** The electrode where **reduction** occurs. Because electrons are pulled toward it to reduce the species in solution, it is designated as the **positive (+)** terminal.

> *Mnemonic Device:* **AN OX** and a **RED CAT** (Anode = Oxidation; Reduction = Cathode).

**2. The External Circuit**
A conductive wire connects the anode and cathode, allowing electrons to flow from the anode to the cathode. A voltmeter or a device (like a lightbulb) is often placed in this circuit to measure or utilize the current.

**3. The Salt Bridge**
If electrons simply flowed from the anode to the cathode, the anode compartment would quickly build up a net positive charge (as cations are produced), and the cathode compartment would build up a net negative charge (as cations are consumed). This charge imbalance would immediately halt the flow of electrons.

To maintain electrical neutrality, a **salt bridge**—a U-tube filled with a non-reactive electrolyte like $NaNO_3$ or $KCl$ suspended in a gel—connects the two compartments.

* **Anions** (e.g., $NO_3^-$) migrate toward the **anode** to neutralize the newly formed positive ions.
* **Cations** (e.g., $Na^+$) migrate toward the **cathode** to replace the positive ions consumed by reduction.

### Visualizing the Daniell Cell

One of the classic examples of a voltaic cell is the Daniell cell, which utilizes the spontaneous reaction between zinc metal and copper(II) ions:

$$Zn (s) + Cu^{2+} (aq) \rightarrow Zn^{2+} (aq) + Cu (s)$$

Below is a plain-text schematic of how this cell operates:

```text
          e⁻ ------> [ Voltmeter ] ------> e⁻
               |                       |
             ( - )                   ( + )
             Anode                  Cathode
           [Zn(s)]                  [Cu(s)]
             | |                      | |
             | |      Salt Bridge     | |
             | |======[ NaNO₃ ]=======| |
             | |                      | |
       Zn²⁺  | |  <-- NO₃⁻   Na⁺ -->  | |  Cu²⁺
       SO₄²⁻ |_|                      |_|  SO₄²⁻
     _________________          _________________
    |                 |        |                 |
    |  Zn²⁺ (aq)      |        |  Cu²⁺ (aq)      |
    |  SO₄²⁻ (aq)     |        |  SO₄²⁻ (aq)     |
    |_________________|        |_________________|
       Oxidation                  Reduction
    Zn → Zn²⁺ + 2e⁻            Cu²⁺ + 2e⁻ → Cu

```

As the cell operates, the zinc anode slowly dissolves, losing mass as solid $Zn$ is oxidized into aqueous $Zn^{2+}$. Conversely, the copper cathode gains mass as aqueous $Cu^{2+}$ ions are reduced to solid $Cu$ and plated onto the surface of the electrode.

### Cell Potential (Electromotive Force)

Why do electrons flow from the zinc electrode to the copper electrode and not the other way around? The flow occurs because there is a difference in electrical potential energy between the two electrodes. The electrons flow spontaneously from a region of higher potential energy (the anode) to a region of lower potential energy (the cathode), much like water flows spontaneously down a waterfall.

This difference in potential is called the **cell potential**, denoted as **$E_{cell}$**. Because it provides the "push" or driving force that moves the electrons through the wire, it is also referred to as the **electromotive force (emf)**.

Cell potential is measured in **volts (V)**. One volt is defined as the potential difference required to impart one joule (J) of energy to one coulomb (C) of electrical charge:

$$1 \text{ V} = 1 \text{ J/C}$$

For any spontaneous redox reaction operating in a voltaic cell, the cell potential will always be a positive value ($E_{cell} > 0$). The magnitude of $E_{cell}$ depends on the specific chemical reactions occurring, the concentrations of the solutions, and the temperature. We will explore how to calculate standard cell potentials from tabulated data in Section 18.4.

### Standard Cell Notation (Line Notation)

Drawing a full diagram of a voltaic cell every time a chemist wants to describe one is tedious. Instead, chemists use a shorthand representation known as **cell notation** or line notation.

The rules for constructing cell notation are as follows:

1. The **anode** (oxidation compartment) is always written on the **left**.
2. The **cathode** (reduction compartment) is always written on the **right**.
3. A single vertical line ($|$) represents a **phase boundary** (e.g., between a solid electrode and an aqueous solution).
4. A double vertical line ($||$) represents the **salt bridge** physically separating the two compartments.
5. Species in the same phase (e.g., two different ions in solution) are separated by a comma.
6. If a half-reaction does not involve a conductive solid (for instance, if the reaction is between two aqueous ions or involves a gas), an inert electrode like Platinum ($Pt$) or Graphite ($C$) is explicitly included at the far ends of the notation.

**Example 1: The Daniell Cell**
For the zinc-copper cell described earlier, the cell notation is:

$$Zn (s) | Zn^{2+} (aq) || Cu^{2+} (aq) | Cu (s)$$

**Example 2: A Cell with an Inert Electrode**
Consider a cell where solid magnesium is oxidized to $Mg^{2+}$, and aqueous iron(III) ($Fe^{3+}$) is reduced to aqueous iron(II) ($Fe^{2+}$). Because the reduction half-cell only contains aqueous species, an inert platinum electrode is used to transfer the electrons.

$$Mg (s) | Mg^{2+} (aq) || Fe^{3+} (aq), Fe^{2+} (aq) | Pt (s)$$

## 18.4 Standard Reduction Potentials

In Section 18.3, we established that a voltaic cell generates an electromotive force (emf) or cell potential ($E_{cell}$) that drives electrons through an external circuit. However, cell potential depends strongly on the concentrations of the reactants, the pressure of any gases involved, and the temperature.

To systematically compare the potentials of different cells, chemists define **standard conditions**:

* All dissolved species have a concentration of **1 M**.
* All gases have a partial pressure of **1 atm**.
* The temperature is specified, typically **298 K (25°C)**.

The cell potential under these specific conditions is called the **standard cell potential**, denoted as **$E^\circ_{cell}$** (pronounced "E-naught cell").

### The Standard Hydrogen Electrode (SHE)

The measured $E^\circ_{cell}$ of a voltaic cell represents the *difference* in electrical potential between the anode and the cathode. It is physically impossible to measure the potential of a single, isolated half-cell because the transfer of electrons requires both a donor and an acceptor.

To overcome this, chemists have established an arbitrary universal reference point. By international agreement, the **Standard Hydrogen Electrode (SHE)** is assigned a standard half-cell potential of exactly **0.00 V**.

The SHE consists of a platinum wire connected to a piece of platinum foil covered in finely divided platinum (which serves as an inert conductive surface and a catalyst). This electrode is immersed in a 1 M acidic solution ($H^+$), and hydrogen gas ($H_2$) at 1 atm is bubbled over it.

```text
         H₂ gas (1 atm) in
               │
               ▼
         ┌───────────┐
         │     |     │
         │    [Pt]   │ <--- Inert Platinum wire
         │     |     │
         │ ░░░░█░░░░ │ <--- Platinum foil
         │ ░░H⁺(1M)░ │ <--- 1 M Acidic solution
         └───────────┘

```

Depending on the other half-cell it is paired with, the SHE can act as either the cathode (where $H^+$ is reduced to $H_2$) or the anode (where $H_2$ is oxidized to $H^+$). The half-reaction for the SHE is written as a reduction:

$$2H^+ (aq, 1\text{ M}) + 2e^- \rightarrow H_2 (g, 1\text{ atm}) \quad E^\circ_{red} = 0.00 \text{ V}$$

### Standard Reduction Potentials ($E^\circ_{red}$)

Because any half-reaction can theoretically be forced to run in reverse, standardizing how we tabulate these potentials is crucial. By convention, all standard half-cell potentials are tabulated as **standard reduction potentials ($E^\circ_{red}$)**.

To determine the $E^\circ_{red}$ of any other half-cell, we simply connect it to a SHE and measure the overall $E^\circ_{cell}$.

For example, if we connect a standard zinc half-cell to a SHE, the voltmeter reads 0.76 V. Chemical analysis reveals that zinc is oxidized (it is the anode) and hydrogen is reduced (it is the cathode).

The overall standard cell potential is the difference between the standard reduction potential of the cathode and the standard reduction potential of the anode:

$$E^\circ_{cell} = E^\circ_{red}(\text{cathode}) - E^\circ_{red}(\text{anode})$$

Plugging in our known values for the zinc-SHE cell:

$$0.76 \text{ V} = 0.00 \text{ V} - E^\circ_{red}(Zn)$$

$$E^\circ_{red}(Zn) = -0.76 \text{ V}$$

Thus, the standard reduction potential for $Zn^{2+} + 2e^- \rightarrow Zn$ is -0.76 V. The negative sign indicates that $Zn^{2+}$ is harder to reduce than $H^+$, and consequently, $Zn$ metal is easier to oxidize than $H_2$ gas.

### Interpreting the Table of Standard Reduction Potentials

By comparing thousands of half-cells to the SHE, chemists have compiled extensive tables of standard reduction potentials. Below is an abbreviated table showcasing the general trends.

| Half-Reaction (Reduction) | $E^\circ_{red}$ (V) | Behavior |
| --- | --- | --- |
| $F_2 (g) + 2e^- \rightarrow 2F^- (aq)$ | +2.87 | **Most Positive:** Strongest tendency to be reduced. $F_2$ is an exceptionally strong oxidizing agent. |
| $Ag^+ (aq) + e^- \rightarrow Ag (s)$ | +0.80 | &nbsp; |
| $Cu^{2+} (aq) + 2e^- \rightarrow Cu (s)$ | +0.34 | &nbsp; |
| **$2H^+ (aq) + 2e^- \rightarrow H_2 (g)$** | **0.00** | **Reference Point (SHE)** |
| $Pb^{2+} (aq) + 2e^- \rightarrow Pb (s)$ | -0.13 | &nbsp; |
| $Zn^{2+} (aq) + 2e^- \rightarrow Zn (s)$ | -0.76 | &nbsp; |
| $Li^+ (aq) + e^- \rightarrow Li (s)$ | -3.05 | **Most Negative:** Least tendency to be reduced. $Li$ metal has the strongest tendency to be oxidized, making it a powerful reducing agent. |

**Key Takeaways from the Table:**

1. **Top of the Table (Large positive $E^\circ_{red}$):** The substances on the left side of the arrow are easily reduced, making them **strong oxidizing agents** (e.g., $F_2$, $O_2$, $MnO_4^-$).
2. **Bottom of the Table (Large negative $E^\circ_{red}$):** The substances on the right side of the arrow are easily oxidized, making them **strong reducing agents** (e.g., $Li$, $Na$, $Zn$).
3. **Predicting Spontaneity:** For a redox reaction to be spontaneous in a forward direction (forming a functional voltaic cell), the overall $E^\circ_{cell}$ must be positive. This means the half-reaction situated higher in the table will proceed as a reduction (cathode), and the half-reaction situated lower will be forced to reverse and proceed as an oxidation (anode).

### Calculating $E^\circ_{cell}$ from Tabulated Data

**Problem:** Calculate the standard cell potential for a voltaic cell based on the reaction between $Ag^+$ and $Pb$.

$$Pb (s) + 2Ag^+ (aq) \rightarrow Pb^{2+} (aq) + 2Ag (s)$$

**Step 1: Identify the oxidation and reduction half-reactions.**

* Reduction (Cathode): $Ag^+ \rightarrow Ag$ (oxidation state goes from +1 to 0)
* Oxidation (Anode): $Pb \rightarrow Pb^{2+}$ (oxidation state goes from 0 to +2)

**Step 2: Look up the standard reduction potentials for both species.**

* $E^\circ_{red}(\text{cathode}) = E^\circ_{red}(Ag) = +0.80 \text{ V}$
* $E^\circ_{red}(\text{anode}) = E^\circ_{red}(Pb) = -0.13 \text{ V}$

**Step 3: Apply the equation.**

$$E^\circ_{cell} = E^\circ_{red}(\text{cathode}) - E^\circ_{red}(\text{anode})$$

$$E^\circ_{cell} = 0.80 \text{ V} - (-0.13 \text{ V})$$

$$E^\circ_{cell} = +0.93 \text{ V}$$

#### A Crucial Note on Stoichiometry (Intensive Properties)

In the example above, two electrons are transferred ($Pb$ loses 2, each $Ag^+$ gains 1). To balance the overall equation, the silver half-reaction had to be multiplied by 2.

**However, we do NOT multiply the standard reduction potential by 2.**

Electrical potential is an **intensive property**, meaning it does not depend on the quantity of substance present. The potential difference (volts) is a measure of energy per unit of charge ($J/C$). While doubling the amount of reactants doubles the total *energy* (Joules) and the total *charge* (Coulombs) passing through the circuit, the *ratio* of energy to charge ($J/C$, or Volts) remains constant. Therefore, $E^\circ_{red}$ values are strictly independent of stoichiometric coefficients.

## 18.5 Thermodynamics of Redox Reactions

In Chapter 15, we established that the spontaneity of a chemical process is governed by the change in Gibbs free energy, $\Delta G$. A reaction is spontaneous if $\Delta G$ is negative. In Section 18.3, we learned that a voltaic cell operates spontaneously, driven by a positive cell potential, $E_{cell}$. Because both $\Delta G$ and $E_{cell}$ are measures of the driving force of a reaction, they must be fundamentally related.

This section bridges electrochemistry and thermodynamics, allowing us to quantify the exact relationship between electrical potential, free energy, and chemical equilibrium.

### Relating Cell Potential to Gibbs Free Energy

The maximum electrical work ($w_{max}$) that a voltaic cell can perform is equal to the total charge transferred multiplied by the cell potential. From thermodynamics, we know that the maximum useful work obtainable from a system at constant temperature and pressure is equal to the change in Gibbs free energy ($\Delta G$).

Therefore, the relationship between free energy and cell potential is expressed by the following equation:

$$\Delta G = -nFE_{cell}$$

Under standard-state conditions (1 M concentrations, 1 atm pressures, and typically 298 K), the relationship uses standard values:

$$\Delta G^\circ = -nFE^\circ_{cell}$$

Let us break down the variables in this equation:

* **$\Delta G^\circ$**: The standard change in Gibbs free energy, typically measured in joules (J) or kilojoules (kJ).
* **$n$**: A dimensionless positive integer representing the number of moles of electrons transferred in the balanced redox equation.
* **$F$**: Faraday's constant, which is the electrical charge of one mole of electrons. $F = 96,485$ C/mol. Because $1 \text{ V} = 1 \text{ J/C}$, Faraday's constant can also be expressed as $96,485$ J/(V$\cdot$mol), which is crucial for unit cancellation.
* **$E^\circ_{cell}$**: The standard cell potential in volts (V).

**Sign Convention and Spontaneity:**
The negative sign in the equation perfectly aligns the thermodynamic and electrochemical conventions for spontaneity:

* If $E^\circ_{cell}$ is positive (a spontaneous voltaic cell), $\Delta G^\circ$ will be negative (a thermodynamically spontaneous process).
* If $E^\circ_{cell}$ is negative (a nonspontaneous process requiring an electrolytic cell), $\Delta G^\circ$ will be positive.

### Connecting Cell Potential to the Equilibrium Constant ($K$)

Because a cell reaction is fundamentally a chemical equilibrium, the standard cell potential is intimately linked to the equilibrium constant, $K$.

In Section 15.7, we derived the relationship between standard free energy and the equilibrium constant:

$$\Delta G^\circ = -RT \ln K$$

Because we now have two separate equations defining $\Delta G^\circ$, we can set them equal to each other:

$$-nFE^\circ_{cell} = -RT \ln K$$

Solving for standard cell potential yields the **Nernst equation at equilibrium**:

$$E^\circ_{cell} = \frac{RT}{nF} \ln K$$

Where:

* **$R$**: The ideal gas constant, $8.314$ J/(mol$\cdot$K).
* **$T$**: The absolute temperature in Kelvin (K).
* **$K$**: The equilibrium constant ($K_c$ or $K_p$).

**The "0.0592 V" Shortcut**
Because electrochemical measurements are overwhelmingly performed at standard room temperature (298 K), chemists frequently consolidate the constants $R$, $T$, and $F$ into a single numerical value. Additionally, it is common to convert the natural logarithm ($\ln$) to a base-10 logarithm ($\log$) by multiplying by 2.303.

Substituting $R = 8.314$, $T = 298$, $F = 96,485$, and the $\log$ conversion factor, the equation simplifies dramatically:

$$E^\circ_{cell} = \frac{0.0592 \text{ V}}{n} \log K \quad \text{(at 298 K)}$$

This simplified form is highly practical for rapidly converting between standard potential and equilibrium.

* If $E^\circ_{cell} > 0$, then $K > 1$ (products are favored at equilibrium).
* If $E^\circ_{cell} < 0$, then $K < 1$ (reactants are favored at equilibrium).

### The Thermodynamic Triangle

The relationships derived above form a interconnected "thermodynamic triangle." If you know any one of these three fundamental standard values—$\Delta G^\circ$, $E^\circ_{cell}$, or $K$—you can mathematically determine the other two.

```text
                      ΔG°
                   /       \
                  /         \
    ΔG° = -nFE°  /           \  ΔG° = -RT ln K
                /             \
               /               \
             E° ________________ K
               
               E° = (RT/nF) ln K

```

### Worked Example: The Complete Thermodynamic Profile

**Problem:** Using standard reduction potentials from Section 18.4, determine the standard cell potential, the standard free energy change ($\Delta G^\circ$), and the equilibrium constant ($K$) at 298 K for the following reaction:

$$Cu (s) + 2Ag^+ (aq) \rightarrow Cu^{2+} (aq) + 2Ag (s)$$

**1. Calculate $E^\circ_{cell}$**
First, separate the reaction into half-reactions and find their standard reduction potentials:

* *Cathode (Reduction):* $Ag^+ + e^- \rightarrow Ag$ ($E^\circ_{red} = +0.80$ V)
* *Anode (Oxidation):* $Cu \rightarrow Cu^{2+} + 2e^-$ ($E^\circ_{red} = +0.34$ V)

$$E^\circ_{cell} = E^\circ_{red}(\text{cathode}) - E^\circ_{red}(\text{anode})$$

$$E^\circ_{cell} = 0.80 \text{ V} - 0.34 \text{ V} = +0.46 \text{ V}$$

*(The positive value confirms the forward reaction is spontaneous.)*

**2. Calculate $\Delta G^\circ$**
Determine $n$, the moles of electrons transferred. Because the copper half-reaction involves 2 electrons and the silver half-reaction must be multiplied by 2 to balance, $n = 2$.

$$\Delta G^\circ = -nFE^\circ_{cell}$$

$$\Delta G^\circ = -(2 \text{ mol e}^-)\left(96,485 \frac{\text{J}}{\text{V}\cdot\text{mol e}^-}\right)(0.46 \text{ V})$$

$$\Delta G^\circ = -88,766 \text{ J} = -88.8 \text{ kJ}$$

*(The negative free energy confirms spontaneity and represents the maximum useful work the cell can perform per mole of reaction.)*

**3. Calculate $K$**
Use the simplified equation for 298 K:

$$E^\circ_{cell} = \frac{0.0592}{n} \log K$$

$$0.46 = \frac{0.0592}{2} \log K$$

$$0.46 = 0.0296 \log K$$

$$\log K = 15.54$$

$$K = 10^{15.54} = 3.5 \times 10^{15}$$

*(The massive equilibrium constant indicates that the reaction proceeds almost to completion, heavily favoring the formation of products.)*

## 18.6 The Nernst Equation and Concentration Cells

In Section 18.4, we defined the standard cell potential ($E^\circ_{cell}$) based on strictly controlled standard conditions: 1 M concentrations for all aqueous species and 1 atm partial pressure for all gases. However, in real-world applications—from commercial batteries to biological cell membranes—conditions are rarely standard. Furthermore, even if a voltaic cell starts under standard conditions, the concentrations of reactants and products continuously change as the reaction proceeds.

To calculate the cell potential under non-standard conditions ($E_{cell}$), we must establish a mathematical relationship between the potential and the specific concentrations of the reactants and products at any given moment.

### Deriving the Nernst Equation

The dependence of cell potential on concentration is rooted in chemical thermodynamics. In Chapter 15, we saw that the free energy change under non-standard conditions ($\Delta G$) is related to the standard free energy change ($\Delta G^\circ$) and the reaction quotient ($Q$) by the following equation:

$$\Delta G = \Delta G^\circ + RT \ln Q$$

In Section 18.5, we established the relationships between free energy and cell potential: $\Delta G = -nFE_{cell}$ and $\Delta G^\circ = -nFE^\circ_{cell}$. Substituting these electrochemical definitions into the thermodynamic equation yields:

$$-nFE_{cell} = -nFE^\circ_{cell} + RT \ln Q$$

Dividing the entire equation by $-nF$ gives us the **Nernst equation**, named after the German chemist Walther Nernst who formulated it in 1889:

$$E_{cell} = E^\circ_{cell} - \frac{RT}{nF} \ln Q$$

Just as we did in Section 18.5, we can simplify this equation for reactions occurring at standard room temperature (298 K) by plugging in the constants $R$ ($8.314$ J/(mol$\cdot$K)), $T$ (298 K), and $F$ ($96,485$ C/mol), and converting the natural logarithm to a base-10 logarithm:

$$E_{cell} = E^\circ_{cell} - \frac{0.0592 \text{ V}}{n} \log Q \quad \text{(at 298 K)}$$

Where:

* **$E_{cell}$** is the non-standard cell potential.
* **$E^\circ_{cell}$** is the standard cell potential.
* **$n$** is the number of moles of electrons transferred in the balanced redox equation.
* **$Q$** is the reaction quotient, formulated exactly as it is for equilibrium constants (products over reactants, raised to their stoichiometric coefficients). Remember that pure solids and pure liquids are omitted from the $Q$ expression.

### Interpreting Cell Behavior as a Function of $Q$

The Nernst equation beautifully illustrates how a voltaic cell discharges over time.

* **When a cell is first constructed** with mostly reactants, $Q$ is very small ($Q < 1$). Therefore, $\log Q$ is a negative number. Subtracting a negative value increases the potential, meaning $E_{cell} > E^\circ_{cell}$. The cell provides a strong initial voltage.
* **As the reaction proceeds**, reactants are consumed and products are generated. The value of $Q$ steadily increases, meaning the subtraction term grows larger, and $E_{cell}$ steadily drops.
* **When the system reaches equilibrium**, $Q = K$. At this exact moment, the forward and reverse driving forces are equal, meaning the cell can no longer perform electrical work. The cell is "dead," and $E_{cell} = 0 \text{ V}$.

### Worked Example: Calculating Non-Standard Cell Potential

**Problem:** Calculate the cell potential at 298 K for a voltaic cell based on the following reaction if $[Cu^{2+}] = 2.0 \text{ M}$ and $[Ag^+] = 0.010 \text{ M}$.

$$Cu (s) + 2Ag^+ (aq) \rightarrow Cu^{2+} (aq) + 2Ag (s)$$

*(Recall from Section 18.5 that $E^\circ_{cell} = +0.46 \text{ V}$ and $n = 2$ for this reaction).*

**1. Set up the reaction quotient ($Q$).**
Only the aqueous ions are included in $Q$. Solid copper and solid silver are omitted.

$$Q = \frac{[Cu^{2+}]}{[Ag^+]^2}$$

**2. Plug the values into the Nernst equation.**

$$E_{cell} = E^\circ_{cell} - \frac{0.0592}{n} \log \left( \frac{[Cu^{2+}]}{[Ag^+]^2} \right)$$

$$E_{cell} = 0.46 - \frac{0.0592}{2} \log \left( \frac{2.0}{(0.010)^2} \right)$$

$$E_{cell} = 0.46 - 0.0296 \log \left( \frac{2.0}{0.0001} \right)$$

$$E_{cell} = 0.46 - 0.0296 \log(20000)$$

$$E_{cell} = 0.46 - 0.0296(4.30)$$

$$E_{cell} = 0.46 - 0.127 = +0.33 \text{ V}$$

*Analysis:* Because the concentration of the reactant ($Ag^+$) is low and the concentration of the product ($Cu^{2+}$) is high, the system is closer to equilibrium than it would be under standard conditions. Consequently, the actual cell potential (+0.33 V) is lower than the standard potential (+0.46 V).

### Concentration Cells

The Nernst equation reveals a fascinating possibility: a voltaic cell can be constructed using the *exact same* substance for both the anode and the cathode, provided the two compartments have different concentrations. This device is called a **concentration cell**.

Because the electrodes and the chemical species are identical, the standard cell potential ($E^\circ_{cell}$) for a concentration cell is always exactly **0.00 V**. However, the difference in concentration creates a non-standard environment. The system will spontaneously act to equalize the concentrations in both compartments, thereby driving an electron flow.

**The Principles of a Concentration Cell:**

1. **Oxidation** (Anode) must occur in the **less concentrated** (dilute) compartment. Oxidizing the solid metal electrode adds more cations to the solution, increasing its concentration.
2. **Reduction** (Cathode) must occur in the **more concentrated** compartment. Reducing the aqueous cations into solid metal removes them from solution, decreasing its concentration.

```text
       e⁻ ----> [ Voltmeter ] ----> e⁻
            |                   |
          (- Anode)          (+ Cathode)
           [Ni(s)]             [Ni(s)]
             | |                 | |
             | |                 | |
    Ni²⁺ <-- | |=== Salt Bridge ===| | --> Ni²⁺
    produces |_|                 |_| consumes
             ___                 ___
            |   |               |   |
            | ░ |  Dilute       | █ |  Concentrated
            | ░ |  0.01 M       | █ |  1.0 M
            |___|               |___|
            
      Ni (s) → Ni²⁺(aq) + 2e⁻    Ni²⁺(aq) + 2e⁻ → Ni (s)

```

#### Worked Example: The Nickel Concentration Cell

**Problem:** Determine the cell potential at 298 K for a concentration cell consisting of two nickel electrodes immersed in $Ni^{2+}$ solutions. The anode compartment has $[Ni^{2+}] = 0.0010 \text{ M}$, and the cathode compartment has $[Ni^{2+}] = 1.0 \text{ M}$.

**1. Write the half-reactions and the overall equation.**

* *Anode (dilute):* $Ni (s) \rightarrow Ni^{2+} (aq, 0.0010\text{ M}) + 2e^-$
* *Cathode (concentrated):* $Ni^{2+} (aq, 1.0\text{ M}) + 2e^- \rightarrow Ni (s)$
* *Overall:* $Ni^{2+} (aq, 1.0\text{ M}) \rightarrow Ni^{2+} (aq, 0.0010\text{ M})$

**2. Determine $n$ and $E^\circ_{cell}$.**

* $n = 2$ electrons transferred.
* $E^\circ_{cell} = 0.00 \text{ V}$ (because the electrodes are identical).

**3. Apply the Nernst equation.**
The reaction quotient $Q$ is the concentration of the product (the dilute solution) divided by the concentration of the reactant (the concentrated solution).

$$Q = \frac{[Ni^{2+}]_{dilute}}{[Ni^{2+}]_{concentrated}} = \frac{0.0010}{1.0} = 1.0 \times 10^{-3}$$

$$E_{cell} = 0.00 - \frac{0.0592}{2} \log (1.0 \times 10^{-3})$$

$$E_{cell} = -0.0296 \times (-3.00)$$

$$E_{cell} = +0.0888 \text{ V}$$

Though the voltage is small, it is positive and capable of doing work. As the cell operates, the dilute side will gradually become more concentrated, the concentrated side will become more dilute, and the voltage will steadily approach 0 V as the two concentrations equalize. Concentration gradients like these are fundamental to biological systems, such as the generation of action potentials in nerve cells via sodium and potassium ion gradients.

## 18.7 Primary and Secondary Batteries

While the voltaic cells discussed in Section 18.3, such as the Daniell cell, are excellent for demonstrating electrochemical principles, they are not practical for everyday use. They are bulky, contain fragile glass components, and are filled with liquid electrolytes that can easily spill. A true **battery** is a self-contained, portable power source consisting of one or more voltaic cells. When multiple cells are used, they are typically connected in series; their individual voltages add together to provide a higher total electromotive force (e.g., a standard 12 V car battery contains six 2 V cells).

Batteries are broadly classified into two categories based on their reversibility:

1. **Primary Batteries:** These are non-rechargeable. The redox reaction is essentially unidirectional. Once the limiting reactant is consumed and the system reaches equilibrium ($E_{cell} = 0$), the battery is "dead" and must be discarded.
2. **Secondary Batteries:** These are rechargeable. The electrochemical reaction can be reversed by passing an external electrical current through the cell in the opposite direction. This process, driven by an external power source, forces the nonspontaneous reverse reaction to occur, regenerating the original reactants.

### Primary Batteries: The Alkaline Battery

The most common primary battery in use today is the alkaline battery (e.g., standard AA, AAA, C, and D cells). It is a significant improvement over the older acidic dry cell (the Leclanché cell) because it maintains a more consistent voltage throughout its lifespan and is less prone to leaking.

The alkaline battery consists of a zinc anode and a manganese dioxide ($MnO_2$) cathode, separated by a porous membrane. The electrolyte is a concentrated paste of potassium hydroxide ($KOH$), providing the basic (alkaline) environment from which the battery gets its name.

**Half-Reactions (Discharge):**

* **Anode (Oxidation):** The anode is typically a zinc powder mixed with a gel, which maximizes the surface area for the reaction.

$$Zn (s) + 2OH^- (aq) \rightarrow ZnO (s) + H_2O (l) + 2e^-$$

* **Cathode (Reduction):** The cathode is a mixture of solid $MnO_2$ and graphite (to increase electrical conductivity).

$$2MnO_2 (s) + H_2O (l) + 2e^- \rightarrow Mn_2O_3 (s) + 2OH^- (aq)$$

* **Overall Reaction:**

$$Zn (s) + 2MnO_2 (s) \rightarrow ZnO (s) + Mn_2O_3 (s)$$

**Why does the voltage stay constant?**
If we recall the Nernst equation (Section 18.6), the cell potential drops as reactants are consumed and the reaction quotient ($Q$) increases. However, look closely at the overall reaction for the alkaline battery: all reactants and products are **solids**. Pure solids are excluded from the reaction quotient. Furthermore, the $OH^-$ ions consumed at the anode are exactly regenerated at the cathode. Because the overall composition of the electrolyte does not change significantly, $Q$ remains relatively constant, allowing the battery to maintain a steady voltage of ~1.5 V until the solid reactants are nearly exhausted.

### Secondary Batteries: The Lead-Acid Battery

The lead-acid battery is a robust, highly reliable secondary battery used primarily in internal combustion engine vehicles to power the starter motor and electrical systems. A typical 12 V automotive battery consists of six cells connected in series, each generating approximately 2 V.

**Anatomy and Chemistry:**

* **Anode:** A grid of lead alloy packed with spongy, finely divided lead ($Pb$).
* **Cathode:** A grid packed with lead dioxide ($PbO_2$).
* **Electrolyte:** An aqueous solution of sulfuric acid ($H_2SO_4$), typically around 38% by mass.

**Half-Reactions (Discharge):**

* **Anode (Oxidation):**

$$Pb (s) + HSO_4^- (aq) \rightarrow PbSO_4 (s) + H^+ (aq) + 2e^-$$

* **Cathode (Reduction):**

$$PbO_2 (s) + HSO_4^- (aq) + 3H^+ (aq) + 2e^- \rightarrow PbSO_4 (s) + 2H_2O (l)$$

* **Overall Reaction:**

$$Pb (s) + PbO_2 (s) + 2H_2SO_4 (aq) \rightarrow 2PbSO_4 (s) + 2H_2O (l)$$

**The Recharging Mechanism:**
Notice that the product of *both* the anode and cathode reactions is solid lead(II) sulfate ($PbSO_4$). Crucially, this solid is insoluble and adheres directly to the surfaces of the electrodes. Because the products remain physically trapped at the reaction sites, the battery can be easily recharged.

When the car's engine is running, an alternator forces current backwards through the battery. This acts as an electrolytic process (to be discussed in detail in Section 18.9), reversing the overall equation: $PbSO_4$ is converted back into $Pb$ at the anode and $PbO_2$ at the cathode.

Additionally, as the battery discharges, sulfuric acid is consumed and water is produced, lowering the density of the electrolyte. Mechanics can often test the "health" or charge state of a lead-acid battery simply by measuring the density of its fluid with a hydrometer.

### Secondary Batteries: The Lithium-Ion Battery

Lithium-ion (Li-ion) batteries power modern portable electronics (smartphones, laptops) and electric vehicles (EVs). They are the premier choice for portable power due to their exceptionally high **energy density**—they can store a massive amount of energy per unit of mass.

**Why Lithium?**

1. **Lightweight:** Lithium is the lightest solid element, keeping the battery's overall mass low.
2. **High Potential:** Looking back at the standard reduction potentials in Section 18.4, $Li^+$ has the most negative $E^\circ_{red}$ (-3.05 V). This means solid lithium is a remarkably powerful reducing agent, allowing Li-ion cells to produce a high voltage (typically around 3.7 V per cell, compared to the 1.5 V of an alkaline cell).

**The "Rocking-Chair" Mechanism:**
Unlike the batteries discussed above, a Li-ion battery does not rely on a solid metal electrode dissolving into aqueous ions. Instead, it operates on a principle called **intercalation**—the reversible insertion of ions into the physical spaces between the layers of a host material.

The electrolyte is a non-aqueous organic solvent containing dissolved lithium salts (water cannot be used because highly reactive lithium would explosively reduce it).

* **Anode:** Typically consists of graphite (carbon). The flat, hexagonal sheets of carbon atoms allow $Li^+$ ions to slip between the layers ($Li_x C_6$).
* **Cathode:** A transition metal oxide, such as lithium cobalt oxide ($LiCoO_2$), which also has a layered structure.

```text
       Discharging (Spontaneous Galvanic Operation)
       
       [Anode: Graphite]                      [Cathode: LiCoO₂]
       ( - )                                              ( + )
         | e⁻ -----> External Circuit -----> e⁻             |
         |                                                  |
         |           [Polymer Separator]                    |
         |                                                  |
        Li⁺  --------------------------------------------> Li⁺
  (Leaves carbon layers)                         (Enters oxide layers)

```

**Half-Reactions (Discharge):**

* **Anode:** Lithium atoms embedded in the graphite lose an electron and exit the layers as $Li^+$ ions.

$$Li_x C_6 \rightarrow x Li^+ + x e^- + C_6$$

* **Cathode:** $Li^+$ ions from the electrolyte enter the layers of the metal oxide, while the transition metal (e.g., Cobalt) is reduced to maintain charge balance.

$$Li_{1-x}CoO_2 + x Li^+ + x e^- \rightarrow LiCoO_2$$

During discharge, $Li^+$ ions migrate from the anode, through the electrolyte, to the cathode. When the battery is plugged into the wall to recharge, the external voltage forcefully "pumps" the $Li^+$ ions back out of the cathode and into the layers of the graphite anode. Because the ions simply rock back and forth between the two electrodes during charge and discharge cycles, these are often referred to as "rocking-chair" batteries.

## 18.8 Corrosion and Prevention

In our discussion of voltaic cells (Section 18.3), we harnessed spontaneous redox reactions to perform useful electrical work. However, when these spontaneous electrochemical processes occur naturally on the surfaces of metals exposed to the environment, they lead to material degradation. This destructive process is known as **corrosion**.

While many metals undergo corrosion (such as the green patina that forms on copper or the tarnishing of silver), the most economically devastating form of corrosion is the rusting of iron and steel. Over 20% of the iron produced annually is used simply to replace rusted structures.

### The Electrochemistry of Rusting

Rust is a hydrated form of iron(III) oxide, formulated as $Fe_2O_3 \cdot xH_2O$, where $x$ indicates a variable amount of water trapped in the crystal lattice. Iron does not rust in dry air or in oxygen-free water; both **oxygen and moisture** are strictly required.

The rusting process occurs because a droplet of water on the surface of iron acts as a miniature, naturally occurring voltaic cell.

**1. The Anodic Region (Oxidation)**
A pit or stress fracture in the iron surface often serves as the anode. Here, solid iron is oxidized into aqueous iron(II) ions, releasing electrons into the bulk metal.

$$Fe (s) \rightarrow Fe^{2+} (aq) + 2e^- \quad E^\circ_{red} = -0.44 \text{ V}$$

**2. The Cathodic Region (Reduction)**
The electrons travel through the conductive iron metal to the edge of the water droplet, where the concentration of dissolved oxygen is highest. This area acts as the cathode. Oxygen is reduced in the presence of hydrogen ions ($H^+$).

$$O_2 (g) + 4H^+ (aq) + 4e^- \rightarrow 2H_2O (l) \quad E^\circ_{red} = +1.23 \text{ V}$$

*(Note: Even in neutral water, there is a small concentration of $H^+$ from autoionization, and dissolved carbon dioxide forms carbonic acid, which lowers the pH and provides more $H^+$ to drive the reaction).*

**3. The Formation of Rust**
The $Fe^{2+}$ ions migrate through the water droplet toward the cathodic region. Once exposed to abundant dissolved oxygen at the surface of the droplet, the $Fe^{2+}$ is further oxidized to $Fe^{3+}$, which precipitates out as insoluble rust.

$$4Fe^{2+} (aq) + O_2 (g) + 4H_2O (l + 2x) \rightarrow 2Fe_2O_3 \cdot xH_2O (s) + 8H^+ (aq)$$

**Visualizing the Corrosion Cell:**

```text
                  O₂ (from air)
                       │
      Air              ▼
 ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      Water            O₂ + 4H⁺ + 4e⁻ → 2H₂O
      Droplet         /     (Cathode)
                     /
           Fe²⁺ ───> Rust (Fe₂O₃·xH₂O)
           migrates
                     \
      Iron Metal      \ Fe → Fe²⁺ + 2e⁻
 ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ (Anode) ┈┈┈┈┈┈┈┈
                        │
                        ▼
                   e⁻ flow through metal

```

**Factors Accelerating Corrosion:**

* **Low pH:** Acidic conditions provide more $H^+$, shifting the cathodic reduction of oxygen to the right.
* **Electrolytes (Salts):** Road salt ($NaCl$) or seawater drastically accelerates rusting. The ions improve the conductivity of the water droplet (acting like a highly efficient salt bridge), allowing the corrosion cell to operate at a much faster rate.

### Prevention of Corrosion

Because corrosion is an enormous economic and safety burden, chemists and engineers have developed several strategies to protect iron from oxidizing.

#### 1. Barrier Protection

The simplest method is to apply a physical barrier that prevents oxygen and water from reaching the iron surface.

* **Paint and Grease:** Coating a bridge in paint or a bicycle chain in grease physically blocks the elements. However, if the paint scratches, the exposed iron will immediately begin to rust. In fact, the rust can spread *underneath* the remaining paint, causing it to flake off.

#### 2. Galvanization

A more robust method is to coat the iron with a thin layer of a more active metal, most commonly zinc. Iron coated in zinc is called **galvanized iron**.

If we look at standard reduction potentials (Section 18.4):

* $Fe^{2+} + 2e^- \rightarrow Fe \quad (E^\circ_{red} = -0.44 \text{ V})$
* $Zn^{2+} + 2e^- \rightarrow Zn \quad (E^\circ_{red} = -0.76 \text{ V})$

Because zinc has a more negative reduction potential, it is easier to oxidize than iron. Even if the zinc coating is scratched and the underlying iron is exposed to water and oxygen, the iron will not rust. Instead, the zinc acts as the anode and is oxidized first, sacrificing itself to supply electrons to the iron (which is forced to act as the cathode, where $O_2$ is reduced).

#### 3. Cathodic Protection

Galvanization is a specific form of a broader technique known as **cathodic protection**. It is highly impractical to coat an entire underground oil pipeline or the massive hull of a steel ship with zinc.

Instead, large blocks of a highly reactive metal—typically magnesium ($Mg$) or zinc ($Zn$)—are attached directly to the steel structure or connected via a conductive wire.

* $Mg^{2+} + 2e^- \rightarrow Mg \quad (E^\circ_{red} = -2.37 \text{ V})$

The magnesium is far easier to oxidize than the iron. The magnesium block becomes the anode and undergoes oxidation. The electrons flow through the wire into the iron structure, turning the entire steel hull or pipe into a massive cathode. Because the iron is flooded with electrons, any stray $Fe^{2+}$ ions are immediately reduced back to solid $Fe$.

The block of magnesium is deliberately consumed over time and is thus referred to as a **sacrificial anode**. Maintenance crews routinely inspect the structure and simply bolt on a new sacrificial anode when the old one has dissolved away, preserving the structural integrity of the vastly more expensive iron framework.

## 18.9 Electrolytic Cells and Electrolysis

Throughout this chapter, we have focused primarily on spontaneous oxidation-reduction reactions ($\Delta G < 0$, $E_{cell} > 0$) that release energy, which can be harnessed via voltaic cells to perform useful electrical work. However, the principles of electrochemistry apply equally to nonspontaneous processes.

By applying an external direct current (DC) power source—such as a battery or a power supply—we can force a nonspontaneous redox reaction ($\Delta G > 0$, $E_{cell} < 0$) to occur. This process, driven by an external voltage, is called **electrolysis**, and the apparatus in which it occurs is an **electrolytic cell**.

### The Anatomy of an Electrolytic Cell

An electrolytic cell contains the same fundamental components as a voltaic cell: two electrodes immersed in an electrolyte, connected by an external circuit. However, the setup and the sign conventions differ significantly.

* **The Power Source:** A DC voltage source is required to "push" electrons in the nonspontaneous direction. The applied voltage must be greater than the magnitude of the negative $E_{cell}$ for the nonspontaneous reaction.
* **The Electrodes and Sign Conventions:**
* **Anode:** Oxidation still occurs at the anode. However, the external power source physically *pulls* electrons away from this electrode, making the anode the **positive (+)** terminal.
* **Cathode:** Reduction still occurs at the cathode. The external power source actively *pushes* electrons into this electrode, making the cathode the **negative (–)** terminal.
*(Note: This is the exact opposite of the sign convention in a spontaneous voltaic cell.)*

```text
               [ DC Power Source ]
               (-)             (+)
                │               │
             e⁻ │               │ e⁻
                ▼               ▲
             Cathode          Anode
               (-)             (+)
             [ Pt ]          [ Pt ]
                │               │
                │      ___      │
                │     |   |     │
        Cation ───┼──>| ░ |<──┼── Anion
        Reduction │   | ░ |   │ Oxidation
                │_____|___|_____│
                   Electrolyte
                   (Molten or aq)

```

### Electrolysis of Molten Salts

The simplest electrolytic cells involve molten (liquid) ionic compounds, because the only species present are the distinct cations and anions of the salt.

Consider the electrolysis of molten sodium chloride ($NaCl$). Solid $NaCl$ does not conduct electricity, but heating it above its melting point (801°C) frees the $Na^+$ and $Cl^-$ ions to move. If inert electrodes (like platinum or graphite) are inserted and a sufficient voltage is applied:

* **Cathode (Reduction):** Sodium cations migrate to the negative electrode and gain electrons.

$$2Na^+ (l) + 2e^- \rightarrow 2Na (l)$$

* **Anode (Oxidation):** Chloride anions migrate to the positive electrode and lose electrons.

$$2Cl^- (l) \rightarrow Cl_2 (g) + 2e^-$$

* **Overall Reaction:**

$$2NaCl (l) \rightarrow 2Na (l) + Cl_2 (g)$$

This process is the primary industrial method for isolating highly reactive metals (like sodium, magnesium, and aluminum) and halogens (like chlorine) from their naturally occurring ores.

### Electrolysis of Aqueous Solutions

When electrolyzing an aqueous solution, the situation becomes more complex. Water itself is an electroactive substance; it can be oxidized at the anode or reduced at the cathode. Therefore, water directly competes with the dissolved ions.

**1. Competition at the Cathode (Reduction)**
At the cathode, either the aqueous metal cation or the water molecules will be reduced. The species with the **more positive (or less negative) standard reduction potential** will be preferentially reduced.

* *Example:* In an aqueous $CuCl_2$ solution, $Cu^{2+}$ ($E^\circ_{red} = +0.34 \text{ V}$) is much easier to reduce than water ($E^\circ_{red} = -0.83 \text{ V}$). Copper metal will plate onto the cathode.
* *Example:* In an aqueous $NaCl$ solution, water is easier to reduce than $Na^+$ ($E^\circ_{red} = -2.71 \text{ V}$). Hydrogen gas will bubble off the cathode, and $OH^-$ ions will be left in solution:

$$2H_2O (l) + 2e^- \rightarrow H_2 (g) + 2OH^- (aq)$$

**2. Competition at the Anode (Oxidation)**
At the anode, either the aqueous anion or the water molecules will be oxidized. To determine the victor, we look at the reverse of the standard reduction potentials (oxidation potentials). The species easier to oxidize will react.

Water oxidizes to form oxygen gas and protons:

$$2H_2O (l) \rightarrow O_2 (g) + 4H^+ (aq) + 4e^- \quad (E^\circ_{red} = +1.23 \text{ V})$$

* *Overvoltage:* Thermodynamics predicts that water should be oxidized before the chloride ion ($Cl^- \rightarrow Cl_2$ has an $E^\circ_{red} = +1.36 \text{ V}$). However, the oxidation of water has a high kinetic barrier (activation energy). It requires an extra push of electrical potential, known as **overvoltage**, to proceed at a measurable rate. Due to this overvoltage, halogens like $Cl^-$ are often preferentially oxidized over water in concentrated aqueous solutions. Polyatomic ions like $SO_4^{2-}$ or $NO_3^-$, however, are highly stable and very difficult to oxidize; if they are present, water will be oxidized instead.

### Quantitative Aspects of Electrolysis

Because we can control the amount of electrical current flowing into an electrolytic cell, we can use stoichiometry to calculate exactly how much chemical product will be formed.

The mathematical relationship relies on three key definitions:

1. **Current ($I$):** Measured in Amperes (A). One ampere is defined as the flow of one Coulomb of charge per second ($1 \text{ A} = 1 \text{ C/s}$).
2. **Charge ($Q$):** Measured in Coulombs (C). The total charge passed through the cell is the product of current and time ($t$, in seconds).

$$Q = I \times t$$

1. **Faraday's Constant ($F$):** The charge of one mole of electrons ($96,485 \text{ C/mol}$).

By tracking the physical units, we can seamlessly link the macroscopic measurement of electrical current to the microscopic stoichiometry of the half-reaction:

$$\text{Current (A) } \xrightarrow{\times \text{ time (s)}} \text{ Charge (C) } \xrightarrow{\div \text{ Faraday's Constant}} \text{ Moles of } e^- \xrightarrow{\text{Stoichiometry}} \text{ Moles of Product}$$

#### Worked Example: Quantitative Electrolysis

**Problem:** An aqueous solution of $CuSO_4$ is electrolyzed using a steady current of 5.00 A for 30.0 minutes. Calculate the mass of solid copper plated onto the cathode.

**1. Calculate the total charge ($Q$) passed.**
First, convert time to seconds: $30.0 \text{ min} \times 60 \text{ s/min} = 1800 \text{ s}$

$$Q = I \times t$$

$$Q = (5.00 \text{ C/s}) \times (1800 \text{ s}) = 9.00 \times 10^3 \text{ C}$$

**2. Convert charge to moles of electrons.**

$$\text{Moles } e^- = \frac{9.00 \times 10^3 \text{ C}}{96,485 \text{ C/mol}} = 0.0933 \text{ mol } e^-$$

**3. Use stoichiometry to find the mass of copper.**
The reduction half-reaction is $Cu^{2+} (aq) + 2e^- \rightarrow Cu (s)$. Therefore, it takes 2 moles of electrons to produce 1 mole of solid copper.

$$\text{Mass } Cu = (0.0933 \text{ mol } e^-) \left( \frac{1 \text{ mol } Cu}{2 \text{ mol } e^-} \right) \left( \frac{63.55 \text{ g } Cu}{1 \text{ mol } Cu} \right)$$

$$\text{Mass } Cu = 2.96 \text{ g } Cu$$

## Chapter 18 Summary

* **Oxidation States and Balancing:** Oxidation states serve as a bookkeeping system to track electron transfer. Redox reactions in acidic or basic solutions are systematically balanced using the half-reaction method, separating the overall equation into individual oxidation and reduction processes, balancing mass (using $H_2O$ and $H^+$ or $OH^-$), and balancing charge using electrons.
* **Voltaic (Galvanic) Cells:** Spontaneous redox reactions can be harnessed to do electrical work by physically separating the oxidation (anode) and reduction (cathode) compartments. Electrons flow through an external circuit, while a salt bridge maintains electrical neutrality.
* **Standard Reduction Potentials ($E^\circ_{red}$):** The Standard Hydrogen Electrode (SHE) is defined as having a potential of exactly 0.00 V. All other half-reactions are measured against the SHE to determine their standard reduction potential. The overall standard cell potential is calculated as $E^\circ_{cell} = E^\circ_{red}(\text{cathode}) - E^\circ_{red}(\text{anode})$. Spontaneous reactions have a positive $E^\circ_{cell}$.
* **Thermodynamics of Redox Reactions:** The standard free energy change ($\Delta G^\circ$), standard cell potential ($E^\circ_{cell}$), and equilibrium constant ($K$) are interconnected via the equations $\Delta G^\circ = -nFE^\circ_{cell}$ and $E^\circ_{cell} = (RT/nF) \ln K$.
* **The Nernst Equation:** The cell potential under non-standard conditions ($E_{cell}$) depends on the concentrations of the reactants and products. The Nernst equation, $E_{cell} = E^\circ_{cell} - (RT/nF) \ln Q$, allows us to calculate this potential at any moment. As a cell approaches equilibrium ($Q = K$), the cell potential drops to 0 V. Concentration cells utilize the exact same chemical species in both compartments, generating a voltage purely driven by a difference in concentration.
* **Batteries:** Practical applications of voltaic cells include primary (non-rechargeable) batteries, like the alkaline cell, and secondary (rechargeable) batteries, like lead-acid and lithium-ion cells. Li-ion batteries operate via an intercalation mechanism, shuttling lithium ions between the anode and cathode.
* **Corrosion:** The spontaneous degradation of metals, such as the rusting of iron, is an electrochemical process requiring oxygen and moisture. It is prevented using barrier coatings, galvanization (zinc coating), or sacrificial anodes (cathodic protection).
* **Electrolytic Cells:** Nonspontaneous redox reactions can be forced to occur by applying an external voltage. In these cells, the anode is positive and the cathode is negative. When aqueous solutions are electrolyzed, water may compete with dissolved ions for oxidation or reduction. The mass of product generated during electrolysis can be calculated quantitatively using current, time, and Faraday's constant.
