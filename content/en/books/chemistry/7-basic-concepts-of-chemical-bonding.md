Matter rarely consists of isolated atoms. Instead, atoms interact to form the immense diversity of substances in our universe. But what forces hold these atoms together, and why do they combine in such specific ratios?

In this chapter, we explore the fundamental principles of chemical bonding. We will use Lewis symbols to track valence electrons and introduce the overarching driving force behind bond formation: the octet rule. By examining the spectrum between ionic and covalent bonding, you will learn to construct Lewis structures, understand the phenomenon of resonance, and calculate the energetic stability of chemical bonds.

## 7.1 Lewis Symbols and the Octet Rule

When atoms interact to form compounds, it is their outermost regions that come into contact first. Consequently, the chemical properties of an element—and how it bonds with other elements—are governed primarily by its valence electrons. In Chapter 5, we established that valence electrons are the electrons residing in the outermost occupied shell of an atom. To understand chemical bonding, we need a simple and intuitive way to keep track of these outermost electrons during chemical reactions.

In 1916, the American chemist G. N. Lewis proposed a system for visualizing valence electrons that remains an essential tool in chemistry today.

### Lewis Symbols

The **Lewis symbol** (or Lewis electron-dot symbol) for an element consists of the element's chemical symbol surrounded by dots, where each dot represents one valence electron.

The chemical symbol itself represents the "core" of the atom—the nucleus and all inner-shell (core) electrons. The dots are placed on the four sides of the atomic symbol: top, bottom, left, and right. When placing the dots, the standard convention is to place one dot on each of the four sides before pairing them up. This practice mirrors the behavior of electrons in degenerate orbitals (Hund's rule), although the four sides do not explicitly map to the $s$ and $p$ orbitals.

For example, carbon has the electron configuration $[\text{He}] 2s^2 2p^2$. It has four valence electrons. Its Lewis symbol is drawn by placing one electron on each side of the symbol "C":

```text
  ·
· C ·
  ·

```

Nitrogen, with the configuration $[\text{He}] 2s^2 2p^3$, has five valence electrons. We place one dot on each of the four sides, and then pair the fifth electron with one of the existing dots, resulting in one pair and three unpaired electrons:

```text
  ··
· N ·
  ·

```

Because elements in the same group (column) of the periodic table have the same number of valence electrons, they also have identical Lewis dot patterns. The table below illustrates the Lewis symbols for the main-group elements of the second period.

**Table 7.1: Lewis Symbols for the Period 2 Elements**

| Group | Element | Electron Configuration | Valence Electrons | Lewis Symbol |
| --- | --- | --- | --- | --- |
| 1A | Lithium | $[\text{He}] 2s^1$ | 1 | $\text{Li}\cdot$ |
| 2A | Beryllium | $[\text{He}] 2s^2$ | 2 | $\cdot\text{Be}\cdot$ |
| 3A | Boron | $[\text{He}] 2s^2 2p^1$ | 3 | $\cdot\dot{\text{B}}\cdot$ |
| 4A | Carbon | $[\text{He}] 2s^2 2p^2$ | 4 | $\cdot\dot{\text{C}}\cdot$ (with dot below) |
| 5A | Nitrogen | $[\text{He}] 2s^2 2p^3$ | 5 | $:\dot{\text{N}}\cdot$ (with dot below) |
| 6A | Oxygen | $[\text{He}] 2s^2 2p^4$ | 6 | $:\ddot{\text{O}}\cdot$ (with dot below) |
| 7A | Fluorine | $[\text{He}] 2s^2 2p^5$ | 7 | $:\ddot{\text{F}}:$ |
| 8A | Neon | $[\text{He}] 2s^2 2p^6$ | 8 | $:\ddot{\text{Ne}}:$ (with pair below) |

*(Note: The exact side chosen for the first dot or the first pair is arbitrary, as molecules freely rotate in space. The importance lies in the correct number of paired versus unpaired dots).*

### The Octet Rule

Notice the Lewis symbol for neon (Ne) in the table above. It is surrounded by eight electrons, representing a full valence shell configuration of $ns^2 np^6$. Noble gases (Group 8A) are famously unreactive; they exist in nature as monatomic gases and rarely form compounds. Their lack of reactivity implies that a full valence shell of eight electrons is an exceptionally stable arrangement, characterized by a high ionization energy and a negligible electron affinity.

Observation of the compounds formed by main-group elements reveals a profound pattern: atoms tend to gain, lose, or share electrons until they achieve an electron configuration identical to that of the nearest noble gas. Because this stable configuration involves eight valence electrons, this principle is known as the **octet rule**.

The octet rule states that atoms will undergo chemical reactions to achieve a stable octet (eight) of valence electrons.

There are two primary ways atoms can fulfill the octet rule:

1. **Electron Transfer (Ionic Bonding):** Atoms can completely transfer one or more electrons to another atom. Metals, which have low ionization energies, tend to lose electrons to form positively charged cations, leaving behind the full octet of the previous noble gas. Nonmetals, which have high electron affinities, tend to gain electrons to form negatively charged anions, completing their current valence shell.
2. **Electron Sharing (Covalent Bonding):** Atoms can share pairs of electrons with one another. By sharing, the same electrons count toward the octet of both participating atoms, allowing both to achieve stability without the complete transfer of charge.

#### A Note on the Exceptions

While the octet rule is a powerful predictive tool for understanding the stoichiometry and structure of countless compounds, it is a heuristic rather than an inviolable law of physics. The most prominent exception is hydrogen, which only requires two electrons (a "duet") to achieve the stable configuration of helium ($1s^2$). We will explore other notable exceptions, such as molecules with odd numbers of electrons or expanded valence shells, later in this chapter (Section 7.7). However, mastering the fundamental behavior of the octet is the essential first step in predicting how elements combine to form the vast array of matter in our universe.

## 7.2 The Energetics of Ionic Bonding

In the previous section, we established that ionic compounds form when electrons are transferred from a metal to a nonmetal, allowing both atoms to achieve a stable octet. However, utilizing the periodic trends discussed in Chapter 6, we encounter a thermodynamic paradox if we only consider the gas-phase transfer of electrons.

Consider the formation of sodium chloride. The first ionization energy of sodium is highly endothermic:

$$ \text{Na}(g) \rightarrow \text{Na}^+(g) + e^- \quad \Delta H = +496 \text{ kJ/mol} $$

The electron affinity of chlorine is exothermic, but not enough to offset the cost of ionizing sodium:

$$ \text{Cl}(g) + e^- \rightarrow \text{Cl}^-(g) \quad \Delta H = -349 \text{ kJ/mol} $$

If we add these two processes together, the net transfer of an electron from a sodium atom to a chlorine atom in the gas phase requires an input of $+147 \text{ kJ/mol}$. Yet, we know that the reaction between solid sodium and chlorine gas to form solid sodium chloride is violently exothermic. The missing piece of this energetic puzzle is the stabilization that occurs when these gas-phase ions pack together into a highly ordered, three-dimensional solid array.

### Lattice Energy

The principal driving force for the formation of ionic compounds is **lattice energy** ($\Delta H_{\text{lattice}}$). Lattice energy is defined as the energy required to completely separate one mole of a solid ionic compound into its gaseous ions. Because this process involves breaking the strong electrostatic attractions between oppositely charged ions, lattice energy is always a large, positive value (endothermic).

For sodium chloride, the lattice energy process is:

$$ \text{NaCl}(s) \rightarrow \text{Na}^+(g) + \text{Cl}^-(g) \quad \Delta H_{\text{lattice}} = +788 \text{ kJ/mol} $$

Conversely, the *formation* of the crystal lattice from gaseous ions releases this exact same amount of energy ($-788 \text{ kJ/mol}$). It is this massive release of energy during the formation of the solid lattice that more than compensates for the endothermic nature of electron transfer, driving the overall formation of the ionic compound.

### Coulomb's Law and Trends in Lattice Energy

The magnitude of a compound's lattice energy is governed by the electrostatic interactions between the ions. This relationship is described quantitatively by **Coulomb's law**, which states that the potential energy ($E$) of the interaction between two point charges ($Q_1$ and $Q_2$) separated by a distance ($d$) is proportional to the product of their charges divided by the distance between them:

$$ E = \kappa \frac{Q_1 Q_2}{d} $$

*(where $\kappa$ is a proportionality constant: $8.99 \times 10^9 \text{ J}\cdot\text{m/C}^2$)*

From this equation, we can deduce two cardinal rules for predicting relative lattice energies:

1. **Ion Charge:** Lattice energy increases dramatically as the charges of the ions increase. The product $Q_1 Q_2$ is the dominant factor. For example, the lattice energy of $\text{MgCl}_2$ ($+2$ and $-1$ ions) is roughly twice that of $\text{NaCl}$ ($+1$ and $-1$ ions). The lattice energy of $\text{MgO}$ ($+2$ and $-2$ ions) is nearly four times that of $\text{NaCl}$.
2. **Ion Size:** For compounds with similarly charged ions, lattice energy increases as the distance between the ions ($d$) decreases. Because ionic distance is determined by ionic radii, smaller ions can get closer together, resulting in stronger electrostatic attractions and higher lattice energies. Therefore, the lattice energy of $\text{LiF}$ is greater than that of $\text{KF}$.

### The Born-Haber Cycle

Because it is impossible to directly measure the lattice energy of an ionic solid in a single experiment, chemists use a theoretical construct called the **Born-Haber cycle**. Named after Max Born and Fritz Haber, this cycle applies Hess's law (which we will explore thoroughly in Chapter 12) to calculate lattice energy by breaking the formation of an ionic solid into a series of individual, measurable thermochemical steps.

Let us construct the Born-Haber cycle for the formation of $\text{NaCl}(s)$ from its elements in their standard states: $\text{Na}(s)$ and $\frac{1}{2}\text{Cl}_2(g)$.

**Step 1: Sublimation of sodium.** Solid sodium is vaporized to gaseous sodium atoms.

$$ \text{Na}(s) \rightarrow \text{Na}(g) \quad \Delta H_{\text{sub}} = +108 \text{ kJ/mol} $$

**Step 2: Dissociation of chlorine.** The diatomic chlorine molecule is broken into individual gaseous atoms.

$$ \frac{1}{2}\text{Cl}_2(g) \rightarrow \text{Cl}(g) \quad \frac{1}{2}D(\text{Cl-Cl}) = +122 \text{ kJ/mol} $$

**Step 3: Ionization of sodium.** The gaseous sodium atom loses an electron to form a cation.

$$ \text{Na}(g) \rightarrow \text{Na}^+(g) + e^- \quad IE_1 = +496 \text{ kJ/mol} $$

**Step 4: Electron affinity of chlorine.** The gaseous chlorine atom gains an electron to form an anion.

$$ \text{Cl}(g) + e^- \rightarrow \text{Cl}^-(g) \quad EA = -349 \text{ kJ/mol} $$

**Step 5: Lattice formation.** The gaseous ions combine to form the solid ionic lattice. (This is the reverse of the lattice energy definition, so the enthalpy change is $-\Delta H_{\text{lattice}}$).

$$ \text{Na}^+(g) + \text{Cl}^-(g) \rightarrow \text{NaCl}(s) \quad \Delta H = -\Delta H_{\text{lattice}} = ? $$

**Overall Reaction:** The sum of these five steps equals the standard enthalpy of formation ($\Delta H_f^\circ$) for sodium chloride.

$$ \text{Na}(s) + \frac{1}{2}\text{Cl}_2(g) \rightarrow \text{NaCl}(s) \quad \Delta H_f^\circ = -411 \text{ kJ/mol} $$

```text
    [Born-Haber Cycle for NaCl]
    
    Energy
      |                          Na⁺(g) + Cl(g) + e⁻
      |                         /                  \
      |               IE₁ (+496)|                   | EA (-349)
      |                         |                   v
      |                 Na(g) + Cl(g)            Na⁺(g) + Cl⁻(g)
      |                /                                   |
      |   ½ D (+122)  |                                    |
      |               |                                    |
      |        Na(g) + ½ Cl₂(g)                            |
      |              /                                     | -ΔH_lattice
      | Subl. (+108)|                                      | (Unknown)
      |             |                                      |
      |     Na(s) + ½ Cl₂(g)                               |
      |             \                                      |
      |   ΔH_f°      \                                     |
      |   (-411)      \                                    v
      +-------------------------------------------> NaCl(s)

```

By summing the energies of the cycle, we can algebraically solve for the lattice energy:

$$ \Delta H_f^\circ = \Delta H_{\text{sub}} + \frac{1}{2}D(\text{Cl-Cl}) + IE_1 + EA - \Delta H_{\text{lattice}} $$

$$ -411 = 108 + 122 + 496 + (-349) - \Delta H_{\text{lattice}} $$

$$ -411 = 377 - \Delta H_{\text{lattice}} $$

$$ \Delta H_{\text{lattice}} = +788 \text{ kJ/mol} $$

The Born-Haber cycle mathematically proves that the stability of ionic compounds is driven almost entirely by the immense thermodynamic stabilization provided by the crystalline lattice. Without it, the endothermic cost of creating ions would prevent ionic compounds from forming.

## 7.3 Covalent Bonding and Bond Lengths

We have seen that ionic bonds form when an element with a low ionization energy (a metal) reacts with an element with a high electron affinity (a nonmetal). However, what happens when two nonmetals interact? Because both atoms have relatively high ionization energies, neither is willing to completely surrender an electron. Instead, they achieve stability through **covalent bonding**—the sharing of valence electron pairs.

### The Nature of the Covalent Bond

The simplest example of a covalent bond is the hydrogen molecule, $\text{H}_2$. A single hydrogen atom has one valence electron ($1s^1$) and requires one more to achieve the stable "duet" configuration of helium. When two hydrogen atoms approach one another, their respective atomic orbitals overlap. The two electrons are shared between the atoms, spending the majority of their time in the region of space directly between the two nuclei.

Using Lewis symbols, this sharing is represented as:

```text
  H ·  +  · H   →   H : H   (or  H — H)

```

The line connecting the two atomic symbols represents a single covalent bond, consisting of one shared pair of electrons.

A covalent bond is held together by a delicate balance of electrostatic forces. Within the molecule, there are two types of repulsive forces: the two positively charged nuclei repel each other, and the two negatively charged electrons repel each other. Counteracting these repulsions is the attractive force between the positively charged nuclei and the negatively charged, shared electron pair located between them. The covalent bond is stable because the attractive forces pulling the nuclei toward the concentrated region of electron density between them are greater than the repulsive forces pushing them apart.

### Potential Energy and Internuclear Distance

The formation of a covalent bond can be quantified by observing how the potential energy of the system changes as two isolated atoms are brought closer together. This relationship is often visualized using a potential energy curve.

Imagine two isolated hydrogen atoms separated by an infinite distance. At this distance, there is no interaction between them, and the potential energy of the system is defined as zero. As the atoms begin to approach each other, the attractive forces between the nucleus of one atom and the electron of the other begin to take effect. The system becomes more stable, and the potential energy drops (becomes negative).

As the atoms continue to move closer, the potential energy continues to decrease until it reaches a minimum. At this exact point, the attractive and repulsive forces are perfectly balanced, representing the most stable configuration of the molecule.

If the atoms are forced even closer together, the internuclear repulsion (protons repelling protons) begins to dominate, causing the potential energy to spike dramatically upward.

```text
       Potential Energy (kJ/mol)
          |
        0 +--------------------------------------------- (Infinite separation)
          |                                .  .  .  .  .
          |                              .
          |                            .
          |                          . 
          |                        .   <-- (Attraction dominates)
     -200 +                      .
          |                    .
          |                   .
          |                  .
     -436 +-------* (Minimum Energy)
          |      / \ 
          |     /   \__ (Internuclear Distance)
          |    /
          |   /  <-- (Repulsion dominates)
          |  /
          | /
          +---------------------------------------------
                 0.74 Å

```

The distance between the nuclei at this minimum energy point is defined as the **bond length** (or bond distance). For the $\text{H}_2$ molecule, the bond length is $0.74 \text{ \AA}$ ($74 \text{ pm}$). The depth of the energy well—the amount of energy required to completely separate the atoms back to infinity—is the **bond energy** or bond enthalpy. For $\text{H}_2$, this is $436 \text{ kJ/mol}$.

### Multiple Bonds

The octet rule dictates that many nonmetals must share more than one pair of electrons to achieve a noble gas configuration.

When atoms share two pairs of electrons (four electrons total), they form a **double bond**. For example, in the oxygen molecule ($\text{O}_2$), each oxygen atom has six valence electrons. By sharing two pairs, both achieve an octet:

```text
  ··       ··         ··   ··
: O ·  +  · O :   →   O :: O   (or  O = O )
  ·         ·         ··   ··

```

When atoms share three pairs of electrons (six electrons total), they form a **triple bond**. The nitrogen molecule ($\text{N}_2$) is a classic example. Each nitrogen atom has five valence electrons and needs three more to complete its octet:

```text
  ·         ·
: N ·  +  · N :   →   : N ::: N :  (or  : N ≡ N :)
  ·         ·

```

### Trends in Bond Lengths

Bond lengths are determined by the sizes of the bonded atoms and the number of electron pairs they share. There are two primary trends to remember:

1. **Atomic Radius:** For a series of similar bonds, bond length increases as the atomic radii of the bonded atoms increase. For example, in the hydrogen halides, the $\text{H}-\text{X}$ bond gets progressively longer down the halogen group: $\text{H}-\text{F}$ ($0.92 \text{ \AA}$), $\text{H}-\text{Cl}$ ($1.27 \text{ \AA}$), $\text{H}-\text{Br}$ ($1.41 \text{ \AA}$), and $\text{H}-\text{I}$ ($1.61 \text{ \AA}$). This occurs because the valence electrons of larger atoms are further from the nucleus, forcing the bonded nuclei to remain further apart.
2. **Bond Order (Multiple Bonds):** As the number of shared electron pairs increases between two specific atoms, the bond length decreases. The higher concentration of negative charge between the nuclei pulls them closer together. This trend is clearly visible in carbon-carbon bonds:

**Table 7.2: Average Carbon-Carbon Bond Lengths**

| Bond Type | Bond Order | Number of Shared Electrons | Average Bond Length ($\text{\AA}$) |
| --- | --- | --- | --- |
| Single ($\text{C}-\text{C}$) | 1 | 2 | 1.54 |
| Double ($\text{C}=\text{C}$) | 2 | 4 | 1.34 |
| Triple ($\text{C}\equiv\text{C}$) | 3 | 6 | 1.20 |

As the bond order increases from single to triple, the bond becomes both shorter and stronger, a relationship we will explore mathematically in Section 7.8 when we discuss bond enthalpies.

## 7.4 Bond Polarity and Electronegativity

Up to this point, we have discussed chemical bonding as if it were strictly divided into two distinct categories: ionic bonds, where electrons are completely transferred, and covalent bonds, where electrons are shared equally. In reality, these two models represent the extreme ends of a continuous spectrum of bonding. Most chemical bonds fall somewhere in between, involving an unequal sharing of electrons. To understand this continuum, we must explore the concept of electronegativity.

### Electronegativity

**Electronegativity** is defined as the ability of an atom in a molecule to attract shared electrons to itself.

While electron affinity (discussed in Chapter 6) measures the energy change when an *isolated* atom gains an electron, electronegativity is a derived property that describes the behavior of an atom *within a chemical bond*.

The most widely used scale for electronegativity was developed by the American chemist Linus Pauling. On the Pauling scale, values are dimensionless and range from $0.7$ to $4.0$. Fluorine, the most electronegative element, is assigned a value of $4.0$. Cesium and francium, the least electronegative elements (sometimes called the most electropositive), have values of $0.7$.

Electronegativity generally follows predictable periodic trends:

1. **Across a Period:** Electronegativity increases from left to right across a period. As effective nuclear charge ($Z_{\text{eff}}$) increases, the nucleus exerts a stronger pull on the valence electrons, including those shared in a bond.
2. **Down a Group:** Electronegativity decreases from top to bottom down a group. As atomic radius increases, the shared electrons are further from the nucleus and experience more shielding from core electrons, reducing the nucleus's attractive pull.

**Table 7.3: Pauling Electronegativity Values for Select Main-Group Elements**

| Period | Group 1A | Group 2A | Group 3A | Group 4A | Group 5A | Group 6A | Group 7A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | $\text{H}$ ($2.1$) | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| **2** | $\text{Li}$ ($1.0$) | $\text{Be}$ ($1.5$) | $\text{B}$ ($2.0$) | $\text{C}$ ($2.5$) | $\text{N}$ ($3.0$) | $\text{O}$ ($3.5$) | $\text{F}$ ($4.0$) |
| **3** | $\text{Na}$ ($0.9$) | $\text{Mg}$ ($1.2$) | $\text{Al}$ ($1.5$) | $\text{Si}$ ($1.8$) | $\text{P}$ ($2.1$) | $\text{S}$ ($2.5$) | $\text{Cl}$ ($3.0$) |
| **4** | $\text{K}$ ($0.8$) | $\text{Ca}$ ($1.0$) | $\text{Ga}$ ($1.6$) | $\text{Ge}$ ($1.8$) | $\text{As}$ ($2.0$) | $\text{Se}$ ($2.4$) | $\text{Br}$ ($2.8$) |

*(Note: The noble gases are generally excluded from electronegativity scales because most of them do not form stable compounds.)*

### Polar and Nonpolar Covalent Bonds

We can use the difference in electronegativity ($\Delta EN$) between two bonded atoms to predict the nature of their bond.

**Nonpolar Covalent Bonds**
When two identical atoms bond (e.g., in $\text{Cl}_2$ or $\text{N}_2$), they have the exact same electronegativity ($\Delta EN = 0$). The electron pair is shared equally, spending an equal amount of time around both nuclei. This is a **nonpolar covalent bond**. Bonds between atoms with very similar electronegativities, such as carbon ($2.5$) and hydrogen ($2.1$), are also considered effectively nonpolar.

**Polar Covalent Bonds**
When two atoms with different electronegativities bond, the shared electrons are drawn more closely to the more electronegative atom. This unequal sharing creates a **polar covalent bond**.

Consider the hydrogen fluoride ($\text{HF}$) molecule. Fluorine ($4.0$) is significantly more electronegative than hydrogen ($2.1$). Consequently, the electron density is skewed toward the fluorine atom. This partial transfer of charge leaves the fluorine atom with a partial negative charge (denoted by $\delta^-$) and the hydrogen atom with a partial positive charge (denoted by $\delta^+$).

```text
    δ+    δ-
    H —— F

```

The bond is "polar" because it possesses two distinct electrical poles, much like a magnet.

### Dipole Moments

The polarity of a bond can be quantified by its **dipole moment** ($\mu$). Whenever two equal and opposite electrical charges ($Q+$ and $Q-$) are separated by a distance ($r$), a dipole is established. The magnitude of the dipole moment is given by the equation:

$$ \mu = Q \times r $$

Dipole moments are typically measured in **debyes** (D), where $1 \text{ D} = 3.34 \times 10^{-30} \text{ coulomb-meters (C}\cdot\text{m)}$.

If we know the bond length ($r$) and measure the dipole moment ($\mu$) experimentally, we can calculate the magnitude of the partial charge ($Q$) residing on the atoms. In polar molecules, $Q$ is always a fraction of the fundamental charge of a single electron ($1.60 \times 10^{-19} \text{ C}$). For instance, in the $\text{HF}$ molecule, the measured dipole moment dictates that the fluorine atom effectively "owns" about $41\%$ of the shared electron pair beyond its own half, leaving the hydrogen relatively electron-deficient.

### The Continuum of Bonding

By examining the $\Delta EN$ of a bond, we can place it on the continuum between purely nonpolar covalent and purely ionic. While there are no rigid dividing lines, chemists use general thresholds as a helpful guide:

```text
  ΔEN:   0.0                 0.4                 2.0                 3.3
         |--------------------|-------------------|-------------------|
Bond:    Nonpolar Covalent      Polar Covalent           Ionic
Sharing: Equal Sharing --------> Unequal Sharing ------> Electron Transfer

```

* **$\Delta EN < 0.4$**: The bond is largely nonpolar covalent (e.g., $\text{C}-\text{H}$ bond, $\Delta EN = 0.4$).
* **$0.4 \le \Delta EN < 2.0$**: The bond is polar covalent. The greater the difference, the more polar the bond (e.g., $\text{O}-\text{H}$ bond, $\Delta EN = 1.4$).
* **$\Delta EN \ge 2.0$**: The electron sharing is so unequal that an electron is effectively transferred, creating an ionic bond (e.g., $\text{Na}-\text{Cl}$ bond, $\Delta EN = 2.1$).

It is important to note that even bonds widely considered "ionic" have some degree of covalent character (electron sharing), and bonds considered "covalent" can have significant ionic character. The transition is gradual, governed by the relentless pull of the more electronegative nucleus.

## 7.5 Drawing Lewis Structures for Molecules and Polyatomic Ions

For simple diatomic molecules like $\text{H}_2$ or $\text{Cl}_2$, creating a Lewis structure is as intuitive as pushing the unpaired dots of their individual Lewis symbols together. However, as molecules become larger and more complex, relying on trial and error becomes frustrating and error-prone.

To deduce the correct Lewis structures for more complicated molecules and polyatomic ions, chemists use a systematic, step-by-step algorithm. This method ensures that the total number of valence electrons is accounted for and that the octet rule is satisfied to the greatest extent possible.

### The Systematic Method

**Step 1: Sum the valence electrons from all atoms.**
Use the periodic table to determine the number of valence electrons for each element in the compound.

* **For an anion (negative charge):** Add one electron to the total for each unit of negative charge.
* **For a cation (positive charge):** Subtract one electron from the total for each unit of positive charge.
*(Do not worry about which atom brought which electron; once combined, the valence electrons form a single pool shared by the entire molecule).*

**Step 2: Write the skeletal structure.**
Arrange the chemical symbols to show which atoms are connected. Knowing the central atom is key:

* The **least electronegative** element is usually the central atom.
* Hydrogen is an exception: it can only accommodate two electrons (one single bond) and therefore must *always* be a terminal (outer) atom.
* Halogens are often terminal atoms when bonded to elements with lower electronegativity.

**Step 3: Connect the atoms with single bonds.**
Draw a single line (representing two shared electrons) between the central atom and each terminal atom. Subtract two electrons from your total count for each bond drawn.

**Step 4: Complete the octets of the terminal atoms.**
Distribute the remaining electrons as lone pairs (pairs of dots) around the terminal atoms until each has eight electrons (or two for hydrogen). Subtract these placed electrons from your running total.

**Step 5: Place any leftover electrons on the central atom.**
If you have any electrons remaining after Step 4, place them as lone pairs on the central atom. (In Section 7.7, we will see that this step is how molecules end up with "expanded octets").

**Step 6: Form multiple bonds if the central atom lacks an octet.**
If the central atom does not have a complete octet after Step 5, you must use one or more lone pairs from the terminal atoms to form double or triple bonds with the central atom. This allows the atoms to share more electrons, helping the central atom reach an octet without depriving the terminal atom.

### Worked Examples

Let us apply this algorithm to three distinct scenarios: a simple molecule, a molecule requiring multiple bonds, and a polyatomic ion.

#### Example 1: Phosphorus Trichloride ($\text{PCl}_3$)

**Step 1: Sum the valence electrons.**
Phosphorus (Group 5A) has 5. Chlorine (Group 7A) has 7.
Total = $5 + (3 \times 7) = 26$ valence electrons.

**Step 2: Skeletal structure.**
Phosphorus ($EN = 2.1$) is less electronegative than chlorine ($EN = 3.0$). P is the central atom.

```text
      Cl  P  Cl
          Cl

```

**Step 3: Draw single bonds.**
Draw three single bonds connecting P to the three Cl atoms. This uses $6$ electrons ($3 \times 2 = 6$).
Remaining electrons = $26 - 6 = 20$.

```text
      Cl — P — Cl
           |
           Cl

```

**Step 4: Complete terminal octets.**
Add lone pairs to the three chlorine atoms until they each have eight. Each Cl needs $6$ more electrons. This uses $18$ electrons ($3 \times 6 = 18$).
Remaining electrons = $20 - 18 = 2$.

```text
        ··
   : Cl — P — Cl :
     ··   |   ··
        : Cl :
          ··

```

**Step 5: Place leftover electrons on the central atom.**
We have $2$ electrons remaining. We place them as a single lone pair on the central phosphorus atom.

```text
        ··
   : Cl — P — Cl :
     ··   |   ··
        : Cl :
          ··

```

**Step 6: Check octets.**
Each Cl is surrounded by $8$ electrons ($3$ lone pairs + $1$ bond). The P is surrounded by $8$ electrons ($1$ lone pair + $3$ bonds). The octet rule is satisfied, and the Lewis structure is complete.

#### Example 2: Hydrogen Cyanide ($\text{HCN}$)

**Step 1: Sum the valence electrons.**
Hydrogen (1) + Carbon (4) + Nitrogen (5) = $10$ valence electrons.

**Step 2: Skeletal structure.**
Hydrogen must be terminal. Carbon ($EN = 2.5$) is less electronegative than nitrogen ($EN = 3.0$), so carbon is central.

```text
      H  C  N

```

**Step 3: Draw single bonds.**
Two single bonds use $4$ electrons.
Remaining electrons = $10 - 4 = 6$.

```text
      H — C — N

```

**Step 4: Complete terminal octets.**
Hydrogen already has its full "duet" from the single bond, so it needs no more. We assign the remaining $6$ electrons to the terminal nitrogen atom.
Remaining electrons = $6 - 6 = 0$.

```text
               ··
      H — C — N :
               ··

```

**Step 5: Leftover electrons.**
There are $0$ electrons left.

**Step 6: Form multiple bonds.**
Check the octets. Nitrogen has $8$. Hydrogen has $2$. However, carbon only has $4$ electrons (from its two single bonds). To give carbon an octet without taking electrons away from nitrogen, we move two lone pairs from nitrogen to form a triple bond between carbon and nitrogen.

```text
      H — C ≡ N :

```

Now, carbon has $8$ electrons ($1$ single bond + $1$ triple bond), and nitrogen still has $8$ ($1$ triple bond + $1$ lone pair). The structure is complete.

#### Example 3: The Hydronium Ion ($\text{H}_3\text{O}^+$)

**Step 1: Sum the valence electrons.**
Hydrogen ($3 \times 1$) + Oxygen (6) = $9$. Because it is a cation with a $+1$ charge, we *subtract* one electron.
Total = $9 - 1 = 8$ valence electrons.

**Step 2: Skeletal structure.**
Hydrogen is always terminal. Oxygen is the central atom.

```text
      H  O  H
         H

```

**Step 3: Draw single bonds.**
Three single bonds use $6$ electrons.
Remaining electrons = $8 - 6 = 2$.

```text
      H — O — H
          |
          H

```

**Step 4: Complete terminal octets.**
All terminal hydrogen atoms already have two electrons. They need no lone pairs.

**Step 5: Leftover electrons.**
Place the remaining $2$ electrons as a lone pair on the central oxygen atom.

```text
          ··
      H — O — H
          |
          H

```

**Step 6: Check octets and format for an ion.**
Oxygen has $8$ electrons ($3$ bonds + $1$ lone pair). Every hydrogen has $2$. The configuration is stable. By convention, when drawing the Lewis structure of a polyatomic ion, we place the entire structure in square brackets and write the charge outside as a superscript.

```text
      [     ··     ]+
      [ H — O — H  ]
      [     |      ]
      [     H      ]

```

## 7.6 Resonance Structures and Formal Charge

When applying the systematic rules for drawing Lewis structures (outlined in Section 7.5), you will occasionally encounter situations where there is more than one valid way to distribute the valence electrons without violating the octet rule. When multiple valid Lewis structures can be drawn for a single molecule or polyatomic ion, we must employ the concepts of resonance and formal charge to understand its true structure.

### Resonance Structures

The ozone molecule ($\text{O}_3$) provides a classic example of this ambiguity. Ozone consists of a central oxygen atom bonded to two terminal oxygen atoms. The molecule has $18$ valence electrons. When we follow the steps to draw the Lewis structure, we find that we must form one double bond and one single bond to satisfy the octet of the central atom. However, we have a choice: should the double bond go to the left terminal oxygen, or the right?

In reality, both choices are equally valid:

```text
    ··       ··      ··            ··       ··      ··
  : O = O — O :  <--->  : O — O = O :
        ··   ··            ··   ··

```

These two diagrams are called **resonance structures** (or resonance contributors). The double-headed arrow ($\longleftrightarrow$) separating them is the standard chemical notation indicating that the structures are related by resonance.

It is crucial to understand what the double-headed arrow *does not* mean. The molecule is not rapidly flipping back and forth between a left-sided double bond and a right-sided double bond. Electrons are not oscillating. Instead, the true structure of the molecule is a permanent, simultaneous blend—a **resonance hybrid**—of all valid resonance structures.

Experimental evidence confirms this. If ozone alternated between the two structures, we would expect to measure two distinct bond lengths in the molecule: a shorter $\text{O}=\text{O}$ double bond (typically $1.21 \text{ \AA}$) and a longer $\text{O}-\text{O}$ single bond (typically $1.48 \text{ \AA}$). Instead, physical measurements reveal that both oxygen-oxygen bonds in ozone are identical in length: $1.28 \text{ \AA}$. This length is intermediate between a single and a double bond.

In the resonance hybrid, the second pair of electrons that makes up the double bond is not localized between two specific atoms; rather, it is **delocalized** across the entire $\text{O}-\text{O}-\text{O}$ framework. We can calculate the average "bond order" for a delocalized bond by dividing the total number of bonding pairs by the number of bonding regions. In ozone, there are $3$ bonding pairs shared across $2$ bonding regions, resulting in an average bond order of $1.5$.

### Formal Charge

Resonance structures for a molecule like ozone are equivalent in energy; they contribute equally to the resonance hybrid. However, for many molecules and polyatomic ions, we can draw non-equivalent Lewis structures. These structures might differ in their arrangement of single and multiple bonds, or even in the connectivity of their atoms. To evaluate which structure is the most stable and therefore the dominant contributor to the true molecular structure, chemists use a bookkeeping system called **formal charge**.

The formal charge ($FC$) of an atom in a molecule is the hypothetical charge the atom would have if all the atoms in the molecule had the exact same electronegativity (i.e., if all bonding electrons were shared perfectly equally).

The formula for calculating formal charge is:

$$ FC = (\text{Valence } e^-) - \left( \text{Nonbonding } e^- + \frac{1}{2}\text{Bonding } e^- \right) $$

A simpler, more practical way to remember this while looking at a Lewis structure is:

$$ FC = (\text{Valence } e^-) - (\text{Dots}) - (\text{Lines}) $$

Where "Dots" refers to the individual nonbonding electrons (two per lone pair) and "Lines" refers to the number of bonds connected to the atom (one for a single bond, two for a double, etc.).

#### Using Formal Charge to Select the Best Structure

When evaluating multiple Lewis structures for the same chemical species, apply the following three rules in order:

1. **The Neutrality Rule:** The sum of all formal charges in a neutral molecule must equal zero. The sum of all formal charges in a polyatomic ion must equal the overall charge of the ion.
2. **The Minimization Rule:** The most stable Lewis structure is the one in which the formal charges on individual atoms are closest to zero. Structures with large formal charges (e.g., $+2$ or $-2$) are highly unlikely to be major contributors.
3. **The Electronegativity Rule:** If a negative formal charge is unavoidable, the most stable structure will place the negative formal charge on the most electronegative atom.

#### Worked Example: The Cyanate Ion ($\text{NCO}^-$)

Let us determine the dominant resonance structure for the cyanate ion, $\text{NCO}^-$. The total number of valence electrons is $5 \text{ (N)} + 4 \text{ (C)} + 6 \text{ (O)} + 1 \text{ (charge)} = 16 \text{ e}^-$.

Carbon is the least electronegative element and serves as the central atom. We can arrange the $16$ valence electrons into three different structures that all satisfy the octet rule:

**Structure 1: Two double bonds**

```text
    ··         ··
  [  N = C = O  ]⁻
    ··         ··

```

* $FC \text{ on N} = 5 - 4 \text{ (dots)} - 2 \text{ (lines)} = -1$
* $FC \text{ on C} = 4 - 0 \text{ (dots)} - 4 \text{ (lines)} = 0$
* $FC \text{ on O} = 6 - 4 \text{ (dots)} - 2 \text{ (lines)} = 0$

**Structure 2: Triple bond to Nitrogen, single bond to Oxygen**

```text
              ··
  [ : N ≡ C — O : ]⁻
              ··

```

* $FC \text{ on N} = 5 - 2 \text{ (dots)} - 3 \text{ (lines)} = 0$
* $FC \text{ on C} = 4 - 0 \text{ (dots)} - 4 \text{ (lines)} = 0$
* $FC \text{ on O} = 6 - 6 \text{ (dots)} - 1 \text{ (line)} = -1$

**Structure 3: Single bond to Nitrogen, triple bond to Oxygen**

```text
    ··
  [ : N — C ≡ O : ]⁻
    ··

```

* $FC \text{ on N} = 5 - 6 \text{ (dots)} - 1 \text{ (line)} = -2$
* $FC \text{ on C} = 4 - 0 \text{ (dots)} - 4 \text{ (lines)} = 0$
* $FC \text{ on O} = 6 - 2 \text{ (dots)} - 3 \text{ (lines)} = +1$

**Analysis:**
All three structures have formal charges that sum to $-1$, fulfilling the Neutrality Rule.
Applying the Minimization Rule, we can immediately eliminate Structure 3. It possesses highly separated formal charges and a highly destabilizing $-2$ charge on nitrogen.
We are left to decide between Structure 1 and Structure 2. Both structures possess a single $-1$ formal charge and two $0$ formal charges. We must apply the Electronegativity Rule. Oxygen ($EN = 3.5$) is more electronegative than nitrogen ($EN = 3.0$). Therefore, Oxygen is better equipped to stabilize the negative formal charge.

Consequently, **Structure 2** ($[:\text{N}\equiv\text{C}-\ddot{\text{O}}:]^-$) is the most stable and represents the major contributor to the true resonance hybrid of the cyanate ion. Structure 1 is a minor contributor, and Structure 3 is energetically insignificant.

## 7.7 Exceptions to the Octet Rule

The octet rule is a foundational tool for understanding chemical bonding, accurately predicting the structures of countless molecules, particularly those composed of second-period elements like carbon, nitrogen, and oxygen. However, it is fundamentally a heuristic—a "rule of thumb"—rather than a strict law of nature. As we examine a broader range of molecules, we find three major categories of exceptions where the octet rule fails.

### 1. Molecules with an Odd Number of Electrons

For atoms to achieve complete octets, the total number of valence electrons in the molecule must be an even number, allowing all electrons to exist in pairs. If a molecule possesses an odd number of valence electrons, complete pairing is mathematically impossible, and at least one atom will not achieve a full octet.

Molecules with one or more unpaired electrons are known as **free radicals**. Because the unpaired electron represents an incomplete valence shell, free radicals are typically highly reactive.

A classic example is nitric oxide ($\text{NO}$), an important biological signaling molecule. Nitrogen contributes 5 valence electrons and oxygen contributes 6, for a total of 11 valence electrons. When we attempt to draw the Lewis structure, we are left with an unpaired electron.

```text
    ·       ··
  · N = O :
    ··

```

By calculating formal charges, we determine that the most stable resonance structure places the unpaired electron on the less electronegative nitrogen atom ($FC = 0$) rather than on the oxygen atom. Nitrogen is left with only seven valence electrons, violating the octet rule.

Another common odd-electron molecule is nitrogen dioxide ($\text{NO}_2$), an air pollutant with 17 valence electrons. Its dominant resonance structure features an unpaired electron on the central nitrogen, which again has only seven valence electrons.

### 2. Molecules with Less Than an Octet (Electron-Deficient)

A second, relatively rare category of exceptions involves compounds where a central atom has fewer than eight valence electrons. This phenomenon is primarily observed in compounds involving elements from Groups 2A and 3A, specifically beryllium ($\text{Be}$) and boron ($\text{B}$).

Consider boron trifluoride ($\text{BF}_3$). Boron has 3 valence electrons, and the three fluorine atoms bring 7 each, for a total of 24 valence electrons. The skeletal structure requires three single bonds between boron and the fluorines, using 6 electrons. The remaining 18 electrons perfectly complete the octets of the three terminal fluorine atoms.

```text
         ··
       : F :
         |
  ··           ··
: F —— B —— F :
  ··           ··

```

In this structure, the central boron atom is surrounded by only six electrons. We could technically satisfy the octet rule by moving a lone pair from one fluorine atom to create a double bond ($\text{B}=\text{F}$). However, let us evaluate the formal charges of that hypothetical double-bonded structure:

* Boron: $3 - 0 - 4 = -1$
* Double-bonded Fluorine: $7 - 4 - 2 = +1$

This arrangement forces a positive formal charge onto fluorine, the most electronegative element on the periodic table, while placing a negative charge on the much less electronegative boron. This is energetically highly unfavorable. Consequently, the structure with three single bonds—despite leaving boron with an incomplete octet—is the most accurate representation of $\text{BF}_3$.

Because molecules like $\text{BF}_3$ are "electron-deficient," they are highly reactive toward molecules that have unshared electron pairs (such as ammonia, $\text{NH}_3$). When they react, they form a **coordinate covalent bond**, a type of bond where both shared electrons originate from the same atom, finally completing the boron's octet.

### 3. Molecules with More Than an Octet (Expanded Octets)

The largest and most important class of exceptions consists of molecules in which the central atom is surrounded by more than eight valence electrons. This condition is known as an **expanded octet** or **hypervalence**.

Expanded octets are never observed for elements in the second period (such as C, N, O, or F). The second shell ($n=2$) contains only $2s$ and $2p$ orbitals, which can hold a maximum of eight electrons. There is physically no room for more.

However, elements in the third period and below (such as P, S, Cl, As, and Xe) have access to $d$ orbitals ($3d$, $4d$, etc.) in their valence shells. These largely empty $d$ orbitals can participate in bonding, allowing the central atom to accommodate 10, 12, or even more valence electrons. Furthermore, the larger atomic radii of period 3 elements and beyond allow more terminal atoms to physically pack around the central atom without causing extreme steric (spatial) repulsion.

A standard example is phosphorus pentachloride ($\text{PCl}_5$). Phosphorus acts as the central atom, forming five single bonds with five chlorine atoms. This places 10 electrons in the valence shell of the central phosphorus.

```text
           Cl
           |
      Cl — P — Cl
          / \
        Cl   Cl

```

Sulfur hexafluoride ($\text{SF}_6$) is an incredibly stable gas where the central sulfur atom is bonded to six fluorine atoms, accommodating an expanded octet of 12 valence electrons.

```text
          F   F
           \ /
        F — S — F
           / \
          F   F

```

#### Expanded Octets and Formal Charge

Expanded octets also frequently appear when applying the rules of formal charge. Often, a Lewis structure can be drawn that perfectly obeys the octet rule, but expanding the octet results in lower formal charges.

Consider the sulfate ion ($\text{SO}_4^{2-}$). If we draw the structure following strict octet rules, sulfur forms four single bonds with four oxygen atoms:

```text
       [    : O :    ]²⁻
       [      |      ]
       [ :O — S — O: ]
       [  ··  |  ··  ]
       [    : O :    ]

```

Calculating formal charges reveals a charge of $+2$ on the central sulfur, and $-1$ on all four oxygen atoms.

However, because sulfur is a period 3 element, it can expand its octet. If we convert two oxygen lone pairs into double bonds, the sulfur atom is surrounded by 12 electrons:

```text
       [      O      ]²⁻
       [      ||     ]
       [ :O — S — O: ]
       [  ··  ||  ·· ]
       [      O      ]

```

In this expanded structure, the formal charge on sulfur drops perfectly to $0$. Two oxygen atoms have a formal charge of $0$, and two have a formal charge of $-1$ (which sums to the correct $-2$ charge of the ion). Because this structure minimizes formal charge, it is considered a major resonance contributor, demonstrating that minimizing formal charge often takes precedence over strict adherence to the octet rule for elements in period 3 and beyond.

## 7.8 Bond Enthalpies and the Strengths of Covalent Bonds

The stability of a molecule is fundamentally determined by the strength of the covalent bonds holding its atoms together. We can quantify the strength of a bond by measuring the amount of energy required to break it. This quantity is known as the **bond enthalpy** (or bond energy), denoted by the symbol $D$.

Specifically, bond enthalpy is defined as the enthalpy change ($\Delta H$) required to break a particular bond in one mole of a gaseous substance. Because breaking a bond always requires an input of energy to overcome the electrostatic attractions between the nuclei and the shared electrons, bond enthalpies are always positive (endothermic) values.

Consider the chlorine molecule ($\text{Cl}_2$). The bond enthalpy is the energy required to break the $\text{Cl}-\text{Cl}$ bond and separate the atoms completely:

$$ \text{Cl}_2(g) \rightarrow 2\text{Cl}(g) \quad \Delta H = D(\text{Cl-Cl}) = 242 \text{ kJ/mol} $$

Conversely, because energy is conserved, the *formation* of a bond from isolated atoms is always an exothermic process. Forming one mole of $\text{Cl}-\text{Cl}$ bonds releases exactly $242 \text{ kJ}$ of energy.

### Average Bond Enthalpies

For diatomic molecules like $\text{Cl}_2$ or $\text{H}_2$, the bond enthalpy can be measured precisely. However, for polyatomic molecules, the energy required to break a specific bond can vary slightly depending on the rest of the molecule's structure.

For example, the energy required to break the first $\text{C}-\text{H}$ bond in methane ($\text{CH}_4$) is slightly different from the energy required to break the second, third, or fourth $\text{C}-\text{H}$ bond. To make thermochemical calculations manageable, chemists use **average bond enthalpies**, which are tabulated values representing the average energy required to break a particular type of bond across a wide variety of different molecules.

### Trends in Bond Strength

In Section 7.3, we learned that bond length decreases as bond order increases (from single to double to triple bonds). We can now correlate this spatial relationship with thermodynamic stability: as bond order increases, bond enthalpy increases.

Multiple bonds contain more shared electrons, creating a stronger electrostatic attraction between the nuclei and the bonding region. This stronger attraction pulls the atoms closer together (shorter bond length) and makes the bond much harder to break (higher bond enthalpy).

**Table 7.4: Average Bond Lengths and Enthalpies for Carbon and Nitrogen**

| Bond Type | Average Bond Length ($\text{\AA}$) | Average Bond Enthalpy ($\text{kJ/mol}$) |
| --- | --- | --- |
| $\text{C}-\text{C}$ | 1.54 | 348 |
| $\text{C}=\text{C}$ | 1.34 | 614 |
| $\text{C}\equiv\text{C}$ | 1.20 | 839 |
| $\text{N}-\text{N}$ | 1.47 | 163 |
| $\text{N}=\text{N}$ | 1.24 | 418 |
| $\text{N}\equiv\text{N}$ | 1.10 | 941 |

*(Note how the nitrogen-nitrogen triple bond is exceptionally strong, which accounts for the high stability and general unreactivity of nitrogen gas, $\text{N}_2$, in our atmosphere).*

### Estimating Enthalpies of Reaction

One of the most practical applications of average bond enthalpies is the ability to estimate the overall enthalpy change of a chemical reaction ($\Delta H_{\text{rxn}}$). We can envision any gas-phase reaction as a two-step process:

1. **Bond Breaking:** All the relevant reactant bonds are broken to form isolated gaseous atoms. This step is endothermic (requires energy).
2. **Bond Forming:** These isolated atoms recombine to form the new bonds of the products. This step is exothermic (releases energy).

The overall enthalpy of the reaction is the sum of these two energy changes:

$$ \Delta H_{\text{rxn}} \approx \sum (\text{Bond Enthalpies of bonds broken}) - \sum (\text{Bond Enthalpies of bonds formed}) $$

```text
               [Isolated Gaseous Atoms]
                      /        \
                     /          \
    Energy Input    /            \   Energy Released
  (Endothermic, +) /              \  (Exothermic, -)
                  /                \
        [Reactants]                 [Products]
      (Bonds Broken)              (Bonds Formed)

```

If the energy released by forming the new bonds is greater than the energy required to break the old bonds, the overall reaction is **exothermic** ($\Delta H < 0$). If breaking the old bonds requires more energy than is released upon forming the new ones, the reaction is **endothermic** ($\Delta H > 0$).

#### Worked Example

Let us estimate the enthalpy of reaction for the synthesis of hydrogen chloride gas from its elements:

$$ \text{H}_2(g) + \text{Cl}_2(g) \rightarrow 2\text{HCl}(g) $$

**Step 1: Identify bonds broken.**
We must break one $\text{H}-\text{H}$ bond and one $\text{Cl}-\text{Cl}$ bond.

* $D(\text{H-H}) = 436 \text{ kJ/mol}$
* $D(\text{Cl-Cl}) = 242 \text{ kJ/mol}$
* $\sum (\text{bonds broken}) = 436 + 242 = 678 \text{ kJ}$

**Step 2: Identify bonds formed.**
We are forming two $\text{H}-\text{Cl}$ bonds.

* $D(\text{H-Cl}) = 431 \text{ kJ/mol}$
* $\sum (\text{bonds formed}) = 2 \times 431 = 862 \text{ kJ}$

**Step 3: Calculate $\Delta H_{\text{rxn}}$.**

$$ \Delta H_{\text{rxn}} \approx 678 \text{ kJ} - 862 \text{ kJ} = -184 \text{ kJ} $$

The estimated enthalpy change is $-184 \text{ kJ}$. Because the value is negative, the reaction is exothermic. The thermodynamic driving force for this reaction is the formation of the strong $\text{H}-\text{Cl}$ bonds, which release more energy than is required to sever the bonds in the diatomic reactant molecules.

## Chapter Summary

In Chapter 7, we explored the fundamental principles that govern how atoms combine to form chemical compounds:

* **Valence Electrons and the Octet Rule:** Chemical bonding is driven by the tendency of atoms to achieve a stable electron configuration, typically a noble gas "octet." **Lewis symbols** provide a visual method for tracking valence electrons.
* **Ionic Bonding:** Occurs via the complete transfer of electrons from a metal to a nonmetal. The stability of ionic compounds is not due to the electron transfer itself, but rather the immense stabilization provided by the **lattice energy** upon the formation of the solid crystal lattice, a concept proven by the **Born-Haber cycle**.
* **Covalent Bonding:** Involves the sharing of valence electron pairs between nonmetals. **Bond length** is the internuclear distance at which the attractive and repulsive forces are perfectly balanced (the potential energy minimum).
* **Electronegativity and Polarity:** **Electronegativity** is an atom's ability to attract shared electrons. Differences in electronegativity between bonded atoms result in **polar covalent bonds**, creating partial charges and measurable **dipole moments**.
* **Lewis Structures and Resonance:** We use a systematic method to draw Lewis structures. When multiple valid structures can be drawn, they are **resonance structures**, and the true molecule is a delocalized hybrid of them all. We use **formal charge** to determine the most stable and dominant resonance contributor.
* **Exceptions to the Octet Rule:** The octet rule fails for molecules with an odd number of electrons (free radicals), severely electron-deficient molecules (like those of boron), and molecules with **expanded octets**. Expanded octets are common for elements in period 3 and beyond due to the availability of $d$ orbitals and larger atomic radii.
* **Bond Enthalpies:** **Bond enthalpy** is the energy required to break a specific covalent bond. As bond order increases, bonds become shorter and stronger. Average bond enthalpies can be used to estimate the overall enthalpy of a reaction ($\Delta H_{\text{rxn}}$) by comparing the energy required to break reactant bonds with the energy released by forming product bonds.
