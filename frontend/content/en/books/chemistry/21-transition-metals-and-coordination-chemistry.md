From the vibrant blue of copper solutions to the iron in our blood, transition metals drive remarkably diverse chemistry. Unlike main-group elements, these metals utilize partially filled *d* orbitals to exhibit incredible versatility, boasting multiple oxidation states, unique magnetic behaviors, and exceptional catalytic power. In this chapter, we explore the electronic structure of the *d*-block and delve into coordination chemistry. We investigate how these metals bond with ligands to form intricate complexes, and employ Crystal-Field Theory to decode the origins of their brilliant colors and magnetic properties.

## 21.1 Properties of the Transition Metals

The transition metals comprise the large block of elements in the center of the periodic table. Formally, a transition metal is defined by the IUPAC as an element whose atom has a partially filled $d$ subshell, or which can give rise to cations with an incomplete $d$ subshell. These elements occupy groups 3 through 12 and are collectively referred to as the $d$-block.

```text
       Main Group                                       Main Group
       1   2                                   13  14  15  16  17  18
     +---+---+                               +---+---+---+---+---+---+
   1 |   |   |                               |   |   |   |   |   |   |
     +---+---+-------------------------------+---+---+---+---+---+---+
   2 |   |   |                               |   |   |   |   |   |   |
     +---+---+-------------------------------+---+---+---+---+---+---+
   3 |   |   |                               |   |   |   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
   4 |   |   | Sc| Ti| V | Cr| Mn| Fe| Co| Ni| Cu| Zn|   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
   5 |   |   | Y | Zr| Nb| Mo| Tc| Ru| Rh| Pd| Ag| Cd|   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
   6 |   |   |La*| Hf| Ta| W | Re| Os| Ir| Pt| Au| Hg|   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
               ^
               |____ The d-block (Transition Metals)

```

Because of their partially filled $d$ orbitals, transition metals exhibit a set of characteristic physical and chemical properties that distinguish them from the main-group metals (the $s$- and $p$-blocks).

### General Physical Properties

Transition metals are what we typically envision when we think of "metals." They are hard, possess high melting and boiling points, are excellent conductors of heat and electricity, and exhibit high densities. These macroscopic properties are a direct consequence of their atomic structure and metallic bonding.

Unlike $s$-block metals like sodium or potassium, which contribute only one or two valence electrons to the "sea of electrons" in a metallic crystal lattice, transition metals can delocalize both their $ns$ and $(n-1)d$ electrons. This greater number of delocalized electrons results in substantially stronger metallic bonds.

The table below contrasts the physical properties of a typical $s$-block metal (Potassium) with a typical transition metal (Iron) from the same period:

```text
+-----------------------+---------------------+---------------------+
| Property              | Potassium (Group 1) | Iron (Group 8)      |
+-----------------------+---------------------+---------------------+
| Melting Point (°C)    | 63.5                | 1538                |
| Boiling Point (°C)    | 759                 | 2862                |
| Density (g/cm³)       | 0.86                | 7.87                |
| Hardness (Mohs scale) | 0.4 (cuts w/ knife) | 4.0 (hard, rigid)   |
| Atomic Radius (pm)    | 227                 | 126                 |
+-----------------------+---------------------+---------------------+

```

### Trends in Atomic Radii and the Lanthanide Contraction

In Chapter 6, we established that atomic radii generally decrease from left to right across a period due to increasing effective nuclear charge ($Z_{eff}$). This trend is also observed across a given transition metal series, but the decrease is much less pronounced than in the main-group elements.

As protons are added to the nucleus across a transition series, the added electrons enter the inner $(n-1)d$ subshell rather than the outermost $ns$ subshell. These inner $d$ electrons shield the outer $s$ electrons from the increasing nuclear charge fairly effectively. Consequently, the $Z_{eff}$ experienced by the outermost electrons increases only slightly, leading to a relatively small contraction in atomic radius across the row.

When comparing atomic radii down a group, an unexpected phenomenon occurs:

```text
    Atomic Radius (pm) vs. Group Number
    
    180 |   * (Y)
        |    \ 
    170 |     \               * (La - 5d series)
        |      \             /
    160 |       \           /   * (Zr, Hf) --- 4d and 5d are nearly identical!
        |        * (Sc)    /   /|
    150 |         \       /   / |
        |          \     /   /  |
    140 |           \   /   /   |   * (Nb, Ta)
        |            \ /   /    |  /|
    130 |             *---*-----*-*-*---*---*---*---* (3d series: Ti to Cu)
        |                 
    120 |                 
        +---------------------------------------------------
           3    4    5    6    7    8    9   10   11   12
                          Group Number

```

Moving from the first transition series (3d, Period 4) to the second (4d, Period 5), there is an expected increase in atomic radius due to the addition of a new principal quantum shell ($n=5$). However, when moving from the second series to the third (5d, Period 6), the atomic radii **do not increase**. For example, Zirconium (Zr, 160 pm) and Hafnium (Hf, 159 pm) have virtually identical sizes.

This anomaly is known as the **lanthanide contraction**. Between the 4d and 5d series lies the lanthanide series (elements 58–71), where the $4f$ subshell is being filled. The $4f$ orbitals have complex, multi-lobed shapes that provide very poor shielding for the outer electrons. As 14 protons are added to the nucleus across the lanthanide series, the poor shielding of the $4f$ electrons causes a significant increase in $Z_{eff}$, which pulls the electron cloud inward. By the time we reach the 5d transition metals, this contraction perfectly offsets the expected increase in size from adding the $n=6$ shell.

Because the 4d and 5d metals in a given group have nearly identical atomic radii and similar electron configurations, their chemical properties are strikingly similar, making them notoriously difficult to separate in nature (e.g., Zr and Hf, or Nb and Ta).

### Magnetic Properties

The presence of partially filled $d$ orbitals gives rise to notable magnetic properties in transition metals and their compounds.

Substances interact with external magnetic fields in different ways:

* **Diamagnetism:** Occurs in substances where all electrons are paired. Diamagnetic materials are slightly repelled by a magnetic field.
* **Paramagnetism:** Occurs in substances with one or more unpaired electrons. The magnetic moments of the spinning electrons align with the external field, causing the substance to be attracted into the magnetic field. The strength of the attraction increases with the number of unpaired electrons.
* **Ferromagnetism:** A much stronger form of paramagnetism observed in solid metals like iron, cobalt, and nickel. In these metals, the unpaired electrons of adjacent atoms interact and align parallel to one another in microscopic regions called *magnetic domains*. When an external field is applied, these domains align perfectly, creating a powerful magnetic attraction. Furthermore, this alignment can be permanently "locked" in place, resulting in a permanent magnet.

The magnetic moment ($\mu$) of a transition metal complex is primarily due to electron spin and can be approximated using the spin-only formula:

$$ \mu = \sqrt{n(n+2)} \ \mu_B $$

where $n$ is the number of unpaired electrons, and $\mu_B$ is the Bohr magneton (a fundamental unit of magnetic moment). Transition metal properties heavily depend on $n$, which shifts as oxidation states change (explored further in Section 21.2).

### Catalytic Activity

Transition metals and their compounds are remarkably effective catalysts in both biological and industrial systems. Their catalytic prowess stems from two main factors based on their electron structure:

1. **Variable Oxidation States:** Because $ns$ and $(n-1)d$ electrons are close in energy, transition metals can easily undergo oxidation and reduction, allowing them to act as electron transfer agents in homogeneous catalysis.
2. **Surface Adsorption:** In solid metals, the empty or partially filled $d$ orbitals can interact with the electron clouds of reactant molecules. This interaction temporarily binds the reactants to the metal surface (adsorption), weakening the bonds within the reactant molecules and lowering the activation energy for the reaction.

Prominent examples include iron in the Haber-Bosch process for synthesizing ammonia, palladium and platinum in automotive catalytic converters, and the cobalt-containing vitamin $B_{12}$ in biological enzymatic pathways.

## 21.2 Electron Configurations and Oxidation States of Transition Metals

Understanding the chemical behavior of transition metals requires a close examination of their electron configurations. The interplay between the $ns$ and $(n-1)d$ orbitals dictates not only how these elements form ions but also their ability to exhibit a wide variety of oxidation states—a defining characteristic of transition metal chemistry.

### Ground State Electron Configurations

Following the Aufbau principle introduced in Chapter 5, electrons fill the lowest energy orbitals first. For elements in the fourth period (the first transition series), the $4s$ orbital is slightly lower in energy than the $3d$ subshell for the neutral potassium and calcium atoms. Therefore, the $4s$ orbital fills first. As we cross the transition metals from scandium (Sc) to zinc (Zn), electrons progressively fill the $3d$ subshell.

The general electron configuration for the first row of transition metals is $[Ar] 4s^2 3d^x$, where $x$ ranges from 1 to 10. However, the energy difference between the $4s$ and $3d$ orbitals is remarkably small, leading to notable exceptions to the standard filling order.

```text
Table 21.2.1: Electron Configurations of the First Transition Series

Element     Symbol    Z     Expected Configuration    Actual Configuration
--------------------------------------------------------------------------
Scandium    Sc        21    [Ar] 4s² 3d¹              [Ar] 4s² 3d¹
Titanium    Ti        22    [Ar] 4s² 3d²              [Ar] 4s² 3d²
Vanadium    V         23    [Ar] 4s² 3d³              [Ar] 4s² 3d³
Chromium    Cr        24    [Ar] 4s² 3d⁴              [Ar] 4s¹ 3d⁵   <-- Exception
Manganese   Mn        25    [Ar] 4s² 3d⁵              [Ar] 4s² 3d⁵
Iron        Fe        26    [Ar] 4s² 3d⁶              [Ar] 4s² 3d⁶
Cobalt      Co        27    [Ar] 4s² 3d⁷              [Ar] 4s² 3d⁷
Nickel      Ni        28    [Ar] 4s² 3d⁸              [Ar] 4s² 3d⁸
Copper      Cu        29    [Ar] 4s² 3d⁹              [Ar] 4s¹ 3d¹⁰  <-- Exception
Zinc        Zn        30    [Ar] 4s² 3d¹⁰             [Ar] 4s² 3d¹⁰

```

**The Chromium and Copper Anomalies:**
Notice that chromium and copper deviate from the expected pattern.

* **Chromium** promotes one $4s$ electron to the $3d$ subshell to achieve a $[Ar] 4s^1 3d^5$ configuration. This arrangement provides exactly one unpaired electron in each of the five $3d$ orbitals. A half-filled $d$ subshell minimizes electron-electron repulsion and maximizes exchange energy, resulting in a slightly lower, more stable overall energy state.
* **Copper** similarly promotes a $4s$ electron to achieve a $[Ar] 4s^1 3d^{10}$ configuration. The completely filled $d$ subshell offers exceptional symmetry and stability.

Similar anomalies occur in the heavier transition metal series (e.g., molybdenum and silver), though the rules become more complex due to the interplay of orbital energies, electron-electron repulsions, and relativistic effects in heavier nuclei.

### Formation of Transition Metal Ions

A common pitfall in chemistry is assuming that the last electrons to fill an atom are the first to be removed when an ion forms. While this "first in, last out" logic works for main-group elements, it **does not apply** to transition metals.

When transition metals ionize to form cations, they **always lose their valence $s$ electrons before they lose their $d$ electrons.**

Why does this happen? In a neutral atom, the $4s$ and $3d$ orbitals are extremely close in energy. However, when electrons are removed to form a cation, the effective nuclear charge ($Z_{eff}$) increases. This increased nuclear pull stabilizes the $3d$ orbitals more drastically than the $4s$ orbital because the $d$ orbitals are less shielded and penetrate closer to the nucleus. Consequently, in transition metal ions, the $3d$ orbitals are undeniably lower in energy than the $4s$ orbitals.

**Example: Iron ($Fe$) to Iron(II) ($Fe^{2+}$) and Iron(III) ($Fe^{3+}$)**

* Neutral Fe: $[Ar] 4s^2 3d^6$
* $Fe^{2+}$ ion: $[Ar] 3d^6$ *(The two 4s electrons are lost)*
* $Fe^{3+}$ ion: $[Ar] 3d^5$ *(Two 4s electrons and one 3d electron are lost)*

Because all transition metals easily lose their $ns^2$ electrons, the $+2$ oxidation state is ubiquitous across the $d$-block.

### Variable Oxidation States

Unlike main-group metals, which typically exhibit a single stable oxidation state (e.g., $+1$ for alkali metals, $+2$ for alkaline earth metals), transition metals are renowned for exhibiting multiple oxidation states. This is a direct consequence of the energy similarities between the $ns$ and $(n-1)d$ electrons; the energy required to remove successive $d$ electrons is not prohibitively large, allowing both $s$ and $d$ electrons to participate in chemical bonding.

The chart below illustrates the observed oxidation states for the first row of transition metals. The most stable and common oxidation states are marked with an asterisk (*).

```text
    Highest Oxidation States Peak at Manganese
    
    +7 |                 (Mn*)
    +6 |             (Cr*) Mn  Fe 
    +5 |         (V*) Cr   Mn  Fe 
    +4 |     Ti*  V   Cr   Mn* Fe  Co 
    +3 | Sc* Ti   V   Cr*  Mn  Fe* Co* Ni  Cu 
    +2 |     Ti   V   Cr   Mn* Fe* Co* Ni* Cu* Zn*
    +1 |                                       Cu*
       +---------------------------------------------
         Sc  Ti   V   Cr   Mn  Fe  Co  Ni  Cu  Zn

```

**Key Trends in Oxidation States:**

1. **Reaching the Maximum:** From scandium to manganese, the maximum oxidation state increases and corresponds perfectly to the total number of valence electrons ($4s + 3d$). For example, manganese ($4s^2 3d^5$) can lose or share all seven valence electrons to reach a $+7$ oxidation state, as seen in the permanganate ion ($MnO_4^-$).
2. **The Decline:** After manganese, the maximum oxidation state steadily decreases. Although iron ($4s^2 3d^6$) has eight valence electrons, an $+8$ oxidation state is virtually non-existent for it. As nuclear charge increases across the period, the $3d$ electrons are pulled closer to the nucleus and held more tightly, making them increasingly difficult to remove or share.
3. **Low Oxidation States:** At the right end of the series, $+2$ becomes the dominant oxidation state (resulting primarily from the loss of the $4s^2$ electrons). Copper uniquely forms a stable $+1$ ion by losing its single $4s$ electron, leaving a stable, full $[Ar] 3d^{10}$ core.

### Oxidation State and Chemical Behavior

The oxidation state of a transition metal profoundly dictates the nature of the chemical bonds it forms and its acid-base properties.

* **Low Oxidation States (+1, +2, +3):** The metal atom has a relatively low charge density. It tends to form **ionic bonds** by completely transferring electrons to nonmetals (e.g., $FeCl_2$, $NiO$). Compounds with metals in low oxidation states act as basic oxides in aqueous solutions.
* **High Oxidation States (+4, +5, +6, +7):** The metal atom is highly electron-deficient. Stripping away 6 or 7 electrons to form a bare cation like $Mn^{7+}$ or $Cr^{6+}$ is energetically impossible due to immense ionization energies. Instead, metals in high oxidation states form highly **covalent bonds** with electronegative atoms like oxygen or fluorine. They frequently exist as covalent polyatomic anions, such as chromate ($CrO_4^{2-}$), dichromate ($Cr_2O_7^{2-}$), or permanganate ($MnO_4^-$). These high-oxidation-state compounds typically form strongly acidic oxides.

## 21.3 Coordination Compounds and Complex Ions

Transition metal ions rarely exist in isolation. In aqueous solutions or in solid crystalline forms, these positively charged metal ions strongly attract electron-rich species. This interaction leads to the formation of structurally intricate assemblies known as coordination compounds.

A **coordination compound** is any neutral chemical compound that contains a complex ion. A **complex ion** (or coordination complex) consists of a central metal atom or ion that is chemically bonded to one or more surrounding molecules or anions.

### The Coordinate Covalent Bond

To understand how a complex ion is held together, we must look at the nature of its chemical bonds. In a standard covalent bond, each participating atom contributes one electron to form a shared pair. However, in a complex ion, the bonding operates differently.

The species surrounding the central metal are called **ligands**. A ligand is a molecule or an anion that possesses at least one unshared pair of valence electrons (a lone pair). The central transition metal ion, particularly due to its positive charge and available empty $s$, $p$, and $d$ orbitals, acts as an electron-pair acceptor.

This interaction is a classic **Lewis acid-base reaction**:

* **Lewis Base:** The ligand acts as the electron-pair donor.
* **Lewis Acid:** The central metal ion acts as the electron-pair acceptor.

When the ligand donates its lone pair into the empty orbital of the metal ion, it forms a **coordinate covalent bond** (sometimes called a dative bond). While the origin of the shared electrons is different from a standard covalent bond, once formed, a coordinate covalent bond behaves exactly like any other covalent bond.

### Alfred Werner and the Coordination Sphere

In the late 19th century, Swiss chemist Alfred Werner developed the foundational theory of coordination chemistry to explain the baffling properties of these transition metal compounds. Werner proposed that transition metal ions exhibit two different types of valency (bonding capacity):

1. **Primary Valence:** This corresponds to the **oxidation state** of the central metal ion. It dictates the charge of the metal and is satisfied by the presence of negative ions (anions) to balance the overall charge of the compound.
2. **Secondary Valence:** This corresponds to the **coordination number**, which is the total number of donor atoms from the ligands directly bonded to the central metal ion. This valence is satisfied by ligands (either neutral molecules or anions) that form the complex ion itself.

Werner's theory established the concept of the **coordination sphere**. When writing the chemical formula for a coordination compound, the central metal and its bonded ligands—the inner coordination sphere—are enclosed in square brackets. Any ions required to balance the charge of the complex are placed outside the brackets and make up the outer sphere (or counterions).

```text
       Inner Coordination Sphere          Outer Sphere (Counterions)
       (The Complex Ion)

            [ Co(NH₃)₆ ] Cl₃
              ^    ^     ^
              |    |     |
      Central |    |     |
      Metal --+    |     +-- Counterions (balance the +3 
      Ion          |         charge of the complex ion)
                   |
             Ligands (6 Ammonia molecules)

```

In the example above, $[Co(NH_3)_6]Cl_3$, the solid crystal contains $[Co(NH_3)_6]^{3+}$ cations and $Cl^-$ anions. If this compound is dissolved in water, the chloride ions dissociate and move freely, but the six ammonia molecules remain firmly covalently bonded to the cobalt ion.

### Determining the Charge of a Complex Ion

Because ligands can be neutral molecules (like $NH_3$ or $H_2O$) or anions (like $Cl^-$ or $CN^-$), the overall charge of a complex ion can be positive, negative, or zero.

The net charge of a complex ion is simply the algebraic sum of the oxidation state of the central metal ion and the total charge contributed by all the ligands:

$$ \text{Charge of Complex} = (\text{Oxidation State of Metal}) + \sum (\text{Charges of Ligands}) $$

**Example 1: A Cationic Complex**
Consider the complex ion $[Cu(NH_3)_4]^{2+}$.

* The charge of the copper ion is $+2$.
* Ammonia ($NH_3$) is a neutral molecule, so its charge is $0$.
* Total charge = $(+2) + 4(0) = +2$.

**Example 2: An Anionic Complex**
Consider the complex ion $[Fe(CN)_6]^{4-}$.

* The cyanide ligand ($CN^-$) carries a $-1$ charge. There are six of them, contributing a total of $-6$.
* If the overall charge is $-4$, we can determine the oxidation state of iron ($x$):

$$ x + 6(-1) = -4 $$

$$ x = +2 $$

* Therefore, the central metal is Iron(II).

**Example 3: A Neutral Complex**
Consider the complex $[Pt(NH_3)_2Cl_2]$.

* Platinum is in the $+2$ oxidation state.
* It is bonded to two neutral ammonia ligands $(0)$ and two chloride ligands ($-1$ each).
* Total charge = $(+2) + 2(0) + 2(-1) = 0$.
Because the net charge is zero, this is a neutral coordination compound and does not require any external counterions.

## 21.4 Common Ligands and Coordination Numbers

The architecture of a coordination complex is defined by two primary factors: the nature of the ligands surrounding the central transition metal, and the total number of points of attachment, known as the coordination number.

### Coordination Numbers and Geometry

The **coordination number** of a metal ion in a complex is the total number of ligand donor atoms to which it is directly bonded. It is crucial to distinguish this from the oxidation state; for instance, in $[Co(NH_3)_6]^{3+}$, the oxidation state of cobalt is $+3$, but its coordination number is $6$.

Coordination numbers for transition metals typically range from $2$ to $8$, but $4$ and $6$ are by far the most common. The coordination number dictates the geometric shape of the complex ion.

* **Coordination Number 2:** Complexes with a coordination number of 2 are almost exclusively linear. This geometry is predominantly found with $d^{10}$ metal ions, such as $Cu^+$, $Ag^+$, and $Au^+$.
* *Example:* The diamminesilver(I) ion, $[Ag(NH_3)_2]^+$, used in Tollens' reagent.

* **Coordination Number 4:** These complexes adopt either a tetrahedral or a square planar geometry.
* *Tetrahedral* geometries are common for $d^{10}$ complexes like $[Zn(NH_3)_4]^{2+}$ and complexes with large halide ligands like $[CoCl_4]^{2-}$.
* *Square planar* geometries are highly characteristic of $d^8$ metal ions, particularly $Pt^{2+}$, $Pd^{2+}$, and $Ni^{2+}$ (under certain conditions). The anticancer drug cisplatin, $Pt(NH_3)_2Cl_2$, is a classic square planar complex.

* **Coordination Number 6:** This is the most common coordination number across the transition metals, universally adopting an **octahedral** geometry. In an octahedron, six ligands surround the metal center at $90^\circ$ angles along the x, y, and z axes.
* *Example:* The hexaaquairon(III) ion, $[Fe(H_2O)_6]^{3+}$.

Several factors influence the coordination number a metal will adopt. **Size** is a primary constraint: larger metal ions can accommodate more ligands, while bulkier ligands will physically crowd each other, forcing a lower coordination number. **Charge** also plays a role; high oxidation state metals draw ligands in more tightly, increasing repulsion between ligands and sometimes restricting the coordination number.

### Classification of Ligands by Denticity

Ligands act as Lewis bases, donating electron pairs to the central metal. We classify ligands based on their **denticity** (from the Latin *dens*, meaning tooth), which refers to the number of donor atoms a single ligand molecule uses to "bite" or bind to the metal ion.

#### 1. Monodentate Ligands

Monodentate ("one-toothed") ligands possess a single donor atom that binds to the metal. They can be neutral molecules or anions. While molecules like water and ammonia have multiple lone pairs, their geometry only allows them to donate one pair to a single metal center at a time.

```text
Table 21.4.1: Common Monodentate Ligands

Neutral Ligands                 Anionic Ligands
------------------------        ---------------------------
Formula   Name in Complex       Formula   Name in Complex
------------------------        ---------------------------
H₂O       aqua                  F⁻        fluoro (or fluorido)
NH₃       ammine                Cl⁻       chloro (or chlorido)
CO        carbonyl              Br⁻       bromo (or bromido)
NO        nitrosyl              OH⁻       hydroxo
                                CN⁻       cyano
                                SCN⁻      thiocyanato 

```

#### 2. Bidentate Ligands

Bidentate ("two-toothed") ligands have two separate donor atoms within the same molecule, spaced far enough apart that both can simultaneously coordinate to the same metal ion. This simultaneous binding creates a ring structure that includes the metal atom.

Two of the most common bidentate ligands are:

* **Ethylenediamine (en):** A neutral molecule with the formula $H_2N-CH_2-CH_2-NH_2$. Both nitrogen atoms have a lone pair they can donate.
* **Oxalate ion (ox):** A polyatomic anion, $C_2O_4^{2-}$, where two of the oxygen atoms act as donors.

When a bidentate ligand binds to a metal, it forms a five- or six-membered metallocycle.

```text
Coordination of Ethylenediamine ("en") to a Metal (M):

       H₂N ──── CH₂
        │        │
   M ───┼        │      <-- Forms a stable 5-membered ring
        │        │
       H₂N ──── CH₂

```

Because ethylenediamine is bidentate, it takes only *three* "en" molecules to satisfy a coordination number of $6$. The complex $[Co(en)_3]^{3+}$ contains three bidentate ligands, filling all six octahedral positions around the cobalt(III) ion.

#### 3. Polydentate Ligands and Chelating Agents

Ligands that possess three or more donor atoms are known as polydentate ligands. A prime example is **ethylenediaminetetraacetate (EDTA)**, a hexadentate ("six-toothed") ligand.

EDTA has six donor atoms: two nitrogen atoms and four oxygen atoms (from four acetate groups). A single EDTA$^{4-}$ ion can completely wrap around a central metal ion, satisfying a coordination number of 6 all by itself.

```text
Donor Sites of the EDTA⁴⁻ Ligand:

      O⁻                   O⁻
       \                   /
  O == C -- CH₂     CH₂ -- C == O
              \     /
               N -- N           <-- 2 Nitrogen donors
              /     \               4 Oxygen donors
  O == C -- CH₂     CH₂ -- C == O
       /                   \
      O⁻                   O⁻

```

### The Chelate Effect

Bidentate and polydentate ligands are broadly referred to as **chelating agents** (from the Greek *chela*, meaning crab's claw), because they grasp the metal ion like a claw. The complexes they form are called chelates.

Chelates exhibit a remarkable thermodynamic stability compared to complexes formed by similar monodentate ligands. This phenomenon is known as the **chelate effect**.

Consider the replacement of six ammonia molecules (monodentate) with three ethylenediamine molecules (bidentate) around a nickel(II) ion:

$$ [Ni(NH_3)_6]^{2+} (aq) + 3 \text{ en} (aq) \rightleftharpoons [Ni(en)_3]^{2+} (aq) + 6 NH_3 (aq) $$

This reaction proceeds strongly to the right. The stability is primarily driven by **entropy** (a concept explored in Chapter 15). In this reaction, 4 reactant molecules (one complex ion and three 'en' molecules) react to produce 7 product molecules (one new complex ion and six ammonia molecules). An increase in the number of free, independent particles in solution leads to a significant increase in the entropy ($\Delta S > 0$) of the system, making the formation of the chelate highly favorable.

Because of their immense stability, chelating agents like EDTA are heavily utilized in analytical chemistry (to titrate metal ions), in medicine (as antidotes for heavy metal poisoning, like lead), and in commercial products (to bind hard-water ions in detergents).

## 21.5 Isomerism in Coordination Compounds

Isomers are compounds that share the exact same chemical formula but possess different structural arrangements of their atoms. Because transition metals can accommodate multiple ligands in various geometries, coordination compounds exhibit a rich diversity of isomerism.

In coordination chemistry, isomers often display starkly different physical and chemical properties, such as differing colors, solubilities, melting points, and biological reactivities. Isomerism in these complexes is broadly divided into two major classes: **structural isomerism** and **stereoisomerism**.

### Structural Isomerism

Structural isomers (also called constitutional isomers) have different connectivities. This means the actual chemical bonds within the molecules are different. The two most common types in coordination chemistry are linkage isomerism and coordination-sphere isomerism.

#### 1. Linkage Isomerism

Linkage isomerism occurs when a complex contains an **ambidentate ligand**—a ligand capable of coordinating to the central metal through more than one type of donor atom.

A classic example involves the nitrite ion ($NO_2^-$). It can bind to a metal center using a lone pair on the nitrogen atom or a lone pair on one of the oxygen atoms. The resulting complexes have different structures and distinct properties.

```text
Linkage Isomers of the [Co(NH₃)₅(NO₂)]²⁺ complex:

1. Nitro isomer (N-bonded):   [Co] ── NO₂   (Yellow-brown color)
2. Nitrito isomer (O-bonded): [Co] ── ONO   (Red color)

```

Another common ambidentate ligand is the thiocyanate ion ($SCN^-$), which can bond through either the sulfur atom (forming a thiocyanato complex) or the nitrogen atom (forming an isothiocyanato complex).

#### 2. Coordination-Sphere Isomerism

This type of isomerism arises when ligands and counterions exchange places between the inner coordination sphere and the outer sphere. The composition of the complex ion itself changes, even though the overall stoichiometric formula of the solid compound remains identical.

Consider the compound with the empirical formula $CrCl_3 \cdot 6H_2O$. It exists as three distinct coordination-sphere isomers:

* **$[Cr(H_2O)_6]Cl_3$**: A violet compound where all six water molecules are ligands in the inner sphere, and all three chlorides are free counterions in the solid lattice. Dissolving this yields three moles of free $Cl^-$ per mole of complex.
* **$[Cr(H_2O)_5Cl]Cl_2 \cdot H_2O$**: A light green compound where one chloride has displaced a water molecule in the inner sphere. The displaced water molecule becomes trapped in the outer crystal lattice as water of hydration. Dissolving this yields only two moles of free $Cl^-$.
* **$[Cr(H_2O)_4Cl_2]Cl \cdot 2H_2O$**: A dark green compound where two chlorides are directly bonded to the chromium. Dissolving this yields only one mole of free $Cl^-$.

### Stereoisomerism

Stereoisomers have the exact same chemical bonds and connectivity, but the atoms are arranged differently in three-dimensional space. The two primary forms of stereoisomerism are geometric isomerism and optical isomerism.

#### 1. Geometric Isomerism

Geometric isomers differ in the spatial relationships of specific ligands relative to one another. They are most commonly observed in square planar and octahedral geometries.

**Cis-Trans Isomerism:**
When two identical ligands are adjacent to each other (at a $90^\circ$ angle), the isomer is designated as **cis**. When they are opposite each other (at a $180^\circ$ angle), the isomer is designated as **trans**.

This is critically important in the square planar complex $Pt(NH_3)_2Cl_2$.

```text
Geometric Isomers of Pt(NH₃)₂Cl₂ (Square Planar)

       Cl       NH₃                 Cl       NH₃
         \     /                      \     /
           Pt                           Pt
         /     \                      /     \
       Cl       NH₃                 NH₃       Cl

      cis-platin                    trans-platin
  (adjacent ligands)             (opposite ligands)

```

*Clinical Note:* The *cis* isomer (cisplatin) is a highly effective, widely used chemotherapy drug for treating testicular and ovarian cancers. The *trans* isomer, despite having the exact same atoms, is completely ineffective against cancer due to its inability to bind correctly to DNA.

Cis-trans isomerism also occurs in octahedral complexes, such as $[Co(NH_3)_4Cl_2]^+$. If the two chloride ligands are next to each other on the octahedron, it is the *cis* isomer (violet). If they are on opposite poles, it is the *trans* isomer (green).

**Fac-Mer Isomerism:**
A different type of geometric isomerism occurs in octahedral complexes that have three ligands of one type and three of another, generalized as $MA_3B_3$ (e.g., $[Co(NH_3)_3Cl_3]$).

* **Facial (fac) isomer:** The three identical ligands occupy the three corners of a single triangular face of the octahedron.
* **Meridional (mer) isomer:** The three identical ligands lie on a single plane that bisects the complex, forming an arc around the "meridian" of the metal ion.

#### 2. Optical Isomerism

Optical isomers, or **enantiomers**, are molecules that are exact mirror images of each other but cannot be superimposed upon one another, much like your left and right hands. A molecule that is non-superimposable on its mirror image is described as **chiral**.

In coordination chemistry, optical isomerism is predominantly found in octahedral complexes containing bidentate chelating agents, such as ethylenediamine (en).

Consider the complex $[Co(en)_3]^{3+}$. Because the bidentate ligands form rings around the metal, they can arrange in a left-handed helix or a right-handed helix.

```text
Conceptualizing Chirality in [Co(en)³]³⁺:

Imagine a three-bladed propeller. 
Even if the blades are identical, a propeller angled to push air forward 
when spun clockwise is the non-superimposable mirror image of a propeller 
angled to push air forward when spun counter-clockwise.

The three "en" rings wrap around the Cobalt ion in a similar propeller-like 
(helical) fashion, creating two distinct enantiomers: 
the Δ (delta, right-handed) and Λ (lambda, left-handed) isomers.

```

Unlike structural or geometric isomers, a pair of enantiomers has identical physical properties (same boiling point, color, density) and identical chemical reactivity in standard environments. They differ in only two highly specific ways:

1. **Interaction with chiral environments:** Enantiomers will react differently with other chiral molecules (which is vital in biological systems, where almost all enzymes are chiral).
2. **Optical activity:** If plane-polarized light is passed through a solution containing a single enantiomer, the plane of the light will be rotated. One enantiomer will rotate the light to the right (dextrorotatory), while its mirror image will rotate the light by the exact same amount to the left (levorotatory). A mixture containing equal amounts of both enantiomers is called a racemic mixture and results in zero net rotation.

## 21.6 Color and Magnetism in Coordination Chemistry

One of the most striking features of transition metal complexes is their wide array of vibrant colors and their diverse magnetic properties. Unlike compounds of the main-group elements, which are typically white or colorless and diamagnetic, coordination compounds display properties that change dramatically depending on the specific metal, its oxidation state, and the ligands attached to it.

The study of these macroscopic properties—color and magnetism—provides a direct window into the microscopic electronic structure of the complex.

### The Phenomenon of Color in Complexes

For a substance to appear colored, it must absorb certain wavelengths of visible light (electromagnetic radiation spanning approximately 400 nm to 700 nm) while transmitting or reflecting others.

When white light—which contains all the wavelengths of the visible spectrum—passes through a solution containing a transition metal complex, the complex absorbs specific energies of light. The light that is *not* absorbed passes through the solution and hits our eyes. Therefore, the color we perceive is the **complementary color** to the color of the light that was absorbed.

Complementary colors can be conceptualized using a standard color wheel. Colors directly opposite each other on the wheel are complementary.

```text
       Complementary Color Wheel

                Orange
           Red  (600nm)  Yellow
        (650nm) \  |  /  (580nm)
                 \ | /
      Violet -----[*]----- Green
      (400nm)    / | \   (520nm)
                /  |  \
           Blue (450nm) Blue-Green

```

If a complex absorbs orange light (around 600 nm), the transmitted light will appear blue. Conversely, if a complex absorbs blue light, it will appear orange.

```text
Table 21.6.1: Absorbed vs. Observed Colors in Transition Metal Complexes

Wavelength Absorbed (nm) | Color Absorbed    | Color Observed
-------------------------|-------------------|----------------------
400 - 430                | Violet            | Yellow-Green
430 - 480                | Blue              | Yellow
480 - 490                | Green-Blue        | Orange
490 - 560                | Green             | Red
560 - 580                | Yellow-Green      | Violet
580 - 600                | Yellow            | Dark Blue
600 - 650                | Orange            | Blue
650 - 700                | Red               | Green

```

### The Energy of Light Absorption

Why does a complex absorb visible light in the first place? According to quantum mechanics, atoms and molecules can only absorb energy in specific, quantized amounts. When a photon of light is absorbed, its energy is used to excite an electron from a lower energy state to a higher energy state.

The energy difference ($\Delta E$) between these two states must exactly match the energy of the absorbed photon. We can relate this energy to the wavelength ($\lambda$) or frequency ($\nu$) of the absorbed light using the Planck-Einstein relation:

$$ \Delta E = h\nu = \frac{hc}{\lambda} $$

where:

* $h$ is Planck's constant ($6.626 \times 10^{-34} \text{ J}\cdot\text{s}$)
* $c$ is the speed of light ($3.00 \times 10^8 \text{ m/s}$)
* $\lambda$ is the wavelength of the absorbed light in meters

In most transition metal complexes, this $\Delta E$ perfectly aligns with the energies of photons in the visible light spectrum. The excitation occurring is the movement of an electron from one $d$ orbital to another $d$ orbital of slightly higher energy (a $d-d$ transition).

### Magnetism in Coordination Compounds

As introduced in Section 21.1, the magnetic properties of a transition metal are dictated by its electrons:

* **Diamagnetic** complexes have all their electrons paired. They are slightly repelled by a magnetic field.
* **Paramagnetic** complexes have one or more unpaired electrons. They are attracted to a magnetic field, and the strength of the attraction is proportional to the number of unpaired electrons.

By placing a coordination compound in a magnetic balance (such as a Gouy balance), chemists can measure its magnetic moment ($\mu$) and determine exactly how many unpaired electrons are present in the central metal ion.

### The Ligand Puzzle: Why Properties Change

The most fascinating aspect of coordination chemistry is that the color and magnetism of a complex are not determined solely by the identity of the metal ion; the ligands exert a massive influence. Changing the ligands around a central metal ion alters both the color and the magnetic properties of the complex.

**The Color Puzzle:**
Consider the Nickel(II) ion in aqueous solution, which exists as the hexaaquanickel(II) complex, $[Ni(H_2O)_6]^{2+}$. This solution is green, meaning it primarily absorbs red light. If we add ammonia ($NH_3$) to the solution, the water ligands are displaced to form $[Ni(NH_3)_6]^{2+}$. The solution turns a deep, vibrant blue, meaning it now primarily absorbs orange/yellow light. The shift to a shorter absorbed wavelength indicates that the energy gap ($\Delta E$) for the electron transition has increased simply by changing the ligands from $H_2O$ to $NH_3$.

**The Magnetism Puzzle:**
The influence of ligands on magnetism is even more striking. Consider two different octahedral complexes of Iron(II), which has a $3d^6$ electron configuration:

1. **$[Fe(H_2O)_6]^{2+}$**: Magnetic measurements show that this complex is highly **paramagnetic**, containing 4 unpaired electrons.
2. **$[Fe(CN)_6]^{4-}$**: Magnetic measurements show that this complex is entirely **diamagnetic**, containing 0 unpaired electrons.

How can the exact same metal ion ($Fe^{2+}$) have 4 unpaired electrons when surrounded by water, but 0 unpaired electrons when surrounded by cyanide ions?

To explain how ligands alter the energy gap ($\Delta E$) responsible for color, and how they force electrons to either remain unpaired or pair up, we require a robust theoretical model of the bonding in coordination complexes. This model is known as Crystal-Field Theory.

## 21.7 Crystal-Field Theory

To explain the vibrant colors and intriguing magnetic properties of coordination compounds introduced in Section 21.6, chemists rely on **Crystal-Field Theory (CFT)**. Developed independently by Hans Bethe and John Hasbrouck van Vleck in the 1930s, CFT is a model that highlights the effects of the electronic repulsion between the ligands and the electrons of the central transition metal.

Unlike valence bond theory, which focuses on orbital overlap and covalent bonds, CFT utilizes a purely electrostatic approach. It treats the ligands as negative point charges (or point dipoles, in the case of neutral molecules like $H_2O$ and $NH_3$) and examines how these charges influence the energies of the metal's five $d$ orbitals.

### The Five $d$ Orbitals

In an isolated gaseous transition metal ion, all five $d$ orbitals ($d_{xy}$, $d_{xz}$, $d_{yz}$, $d_{x^2-y^2}$, and $d_{z^2}$) are **degenerate**, meaning they have the exact same energy.

However, they have different shapes and orientations in space:

* The **$d_{x^2-y^2}$** and **$d_{z^2}$** orbitals have their electron density concentrated directly *along* the x, y, and z axes.
* The **$d_{xy}$**, **$d_{xz}$**, and **$d_{yz}$** orbitals have their electron density situated in the planes *between* the x, y, and z axes.

When ligands approach the metal ion to form a complex, their negative electron clouds repel the electrons residing in the metal's $d$ orbitals. This repulsion raises the overall energy of the $d$ orbitals. More importantly, because the ligands approach from specific geometric directions, they do not repel all five $d$ orbitals equally.

### Crystal-Field Splitting in Octahedral Complexes

In an octahedral complex, six ligands approach the central metal ion precisely along the x, y, and z axes.

Because the $d_{x^2-y^2}$ and $d_{z^2}$ orbitals point directly at the approaching ligands, the electrons in these orbitals experience severe electrostatic repulsion. Their energy is driven sharply upward. Conversely, the $d_{xy}$, $d_{xz}$, and $d_{yz}$ orbitals point between the approaching ligands; they experience less direct repulsion, so their energy is relatively lower.

This unequal repulsion breaks the degeneracy of the $d$ orbitals, splitting them into two distinct energy levels:

1. **$e_g$ set:** The two higher-energy orbitals ($d_{x^2-y^2}$, $d_{z^2}$).
2. **$t_{2g}$ set:** The three lower-energy orbitals ($d_{xy}$, $d_{xz}$, $d_{yz}$).

The energy difference between these two sets is called the **crystal-field splitting energy**, denoted by **$\Delta_o$** (the "o" stands for octahedral).

```text
Energy Level Diagram for an Octahedral Complex

Energy
  ^
  |                     ___   ___   e_g (d_x²-y², d_z²)
  |                    /   \
  |                   /     \
  |       ___ ___ ___ ___ ___    + ---  <-- Splitting Energy (Δ_o)
  |       Isolated    \     /    + ---
  |       Metal Ion    \   /
  |      (Degenerate)   ___   ___   ___  t_2g (d_xy, d_xz, d_yz)
  |
  |      (Spherical    (Octahedral 
  |         Field)        Field)

```

### Explaining Color: The Magnitude of $\Delta_o$

The splitting energy ($\Delta_o$) in most transition metal complexes perfectly matches the energy of photons in the visible light spectrum. When an electron in the lower $t_{2g}$ level absorbs a photon of appropriate energy, it is excited to the higher $e_g$ level.

$$ \Delta_o = \frac{hc}{\lambda} $$

The exact magnitude of $\Delta_o$ dictates the wavelength ($\lambda$) of light absorbed, and thus the complementary color observed. Two factors primarily determine the size of $\Delta_o$: the oxidation state of the metal (higher charges draw ligands closer, increasing repulsion and $\Delta_o$) and the identity of the ligands.

### The Spectrochemical Series

Ligands are ranked by their ability to split the $d$ orbitals into a list known as the spectrochemical series.

* **Weak-field ligands** cause a small splitting (small $\Delta_o$). They tend to absorb lower-energy light (longer wavelengths, like red) and produce complexes that look green or blue.
* **Strong-field ligands** cause a large splitting (large $\Delta_o$). They tend to absorb higher-energy light (shorter wavelengths, like blue or violet) and produce complexes that look yellow, orange, or red.

```text
The Spectrochemical Series (Increasing $\Delta_o$)

Weak-Field Ligands <--------------------------------> Strong-Field Ligands
I⁻ < Br⁻ < S²⁻ < SCN⁻ < Cl⁻ < F⁻ < OH⁻ < H₂O < NH₃ < en < NO₂⁻ < CN⁻ < CO

```

### Explaining Magnetism: High-Spin vs. Low-Spin

The magnitude of $\Delta_o$ also solves the magnetism puzzle from Section 21.6. When adding electrons to the split $d$ orbitals, the first three electrons always go into the three empty $t_{2g}$ orbitals, following Hund's rule.

The critical choice occurs for the fourth, fifth, sixth, and seventh electrons. They have two options:

1. Pair up with existing electrons in the lower-energy $t_{2g}$ orbitals, requiring **pairing energy ($P$)** to overcome the repulsion of placing two electrons in the same orbital.
2. Jump the energy gap to occupy the higher-energy $e_g$ orbitals, requiring the **splitting energy ($\Delta_o$)**.

The system will always choose the path of lowest energy.

**Case 1: Weak-Field Ligands (High-Spin Complexes)**
If the ligands are weak-field (e.g., $H_2O$), the splitting energy is small ($\Delta_o < P$). It is easier for electrons to jump to the $e_g$ orbitals than to pair up. This maximizes the number of unpaired electrons, creating a **high-spin complex**.

**Case 2: Strong-Field Ligands (Low-Spin Complexes)**
If the ligands are strong-field (e.g., $CN^-$), the splitting energy is large ($\Delta_o > P$). It requires too much energy to jump the gap. The electrons are forced to pair up in the lower $t_{2g}$ orbitals. This minimizes the number of unpaired electrons, creating a **low-spin complex**.

```text
The Iron(II) Puzzle Solved: d⁶ Electron Configurations

   [Fe(H₂O)₆]²⁺                           [Fe(CN)₆]⁴⁻
 Weak-field (Small Δ_o)                 Strong-field (Large Δ_o)
    High-Spin Complex                      Low-Spin Complex

       e_g   ↑_   ↑_                       e_g   __   __
            |                                   |  ^
            | Δ_o < P                           |  | Δ_o > P
            |                                   |  |
       t_2g  ↑↓   ↑_   ↑_                  t_2g  ↑↓   ↑↓   ↑↓

  (4 Unpaired e⁻ -> Paramagnetic)        (0 Unpaired e⁻ -> Diamagnetic)

```

### Tetrahedral and Square Planar Splitting

Crystal-field splitting is not limited to octahedral geometries; different geometries produce different splitting patterns.

**Tetrahedral Complexes:**
In a tetrahedral geometry, four ligands approach the metal from the corners of a tetrahedron. None of the $d$ orbitals point directly at these ligands, but the $d_{xy}$, $d_{xz}$, and $d_{yz}$ orbitals point *closer* to them than the $d_{x^2-y^2}$ and $d_{z^2}$ orbitals do. Consequently, the splitting pattern is the exact inverse of the octahedral case.

Furthermore, because there are only four ligands (instead of six) and none point directly at the orbitals, the tetrahedral splitting energy ($\Delta_t$) is much smaller—typically only about $4/9$ the size of $\Delta_o$. Because $\Delta_t$ is almost always smaller than the pairing energy ($\Delta_t < P$), almost all tetrahedral complexes are **high-spin**.

**Square Planar Complexes:**
In a square planar geometry (typically associated with $d^8$ metals like $Pt^{2+}$ and $Pd^{2+}$), the ligands approach exclusively along the x and y axes. This causes an extreme repulsion for the $d_{x^2-y^2}$ orbital, driving its energy immensely high. The resulting four-level splitting pattern is highly complex but strongly favors the pairing of the 8 electrons in the lower four orbitals, leaving the extremely high-energy $d_{x^2-y^2}$ orbital empty. Thus, square planar complexes are almost universally **diamagnetic**.

## Chapter Summary

* **Properties of Transition Metals:** The transition metals ($d$-block) exhibit characteristic physical properties (high density, high melting points) driven by metallic bonding involving both $s$ and $d$ electrons. Atomic radii remain relatively constant across a period due to shielding, while the lanthanide contraction causes 4d and 5d metals to share similar sizes and chemical properties. Transition metals display diverse magnetic behaviors and serve as potent catalysts.
* **Electron Configurations and Oxidation States:** Transition metals typically fill the $(n-1)d$ subshell after the $ns$ subshell, with notable exceptions (Cr, Cu) to maximize stability. When forming ions, they uniquely lose their outermost $ns$ electrons *before* their $(n-1)d$ electrons. Their ability to utilize both $s$ and $d$ valence electrons results in multiple stable oxidation states.
* **Coordination Compounds:** These consist of a central transition metal ion bonded to surrounding molecules or anions called ligands via coordinate covalent bonds. The inner coordination sphere acts as a distinct, stable unit, while counterions in the outer sphere balance the overall charge.
* **Ligands and Geometry:** Ligands act as Lewis bases, while the metal is a Lewis acid. The coordination number (typically 2, 4, or 6) defines the geometry (linear, tetrahedral/square planar, or octahedral). Polydentate ligands (chelating agents) bind at multiple sites, forming extraordinarily stable complexes due to the chelate effect.
* **Isomerism:** Coordination compounds exhibit structural isomerism (linkage and coordination-sphere) where connectivity differs, and stereoisomerism (geometric and optical) where 3D spatial arrangement differs. Notably, geometric isomers (like *cis* and *trans*) can have drastically different biological effects.
* **Color, Magnetism, and CFT:** Crystal-Field Theory models the electrostatic repulsion between ligands and $d$ electrons, which breaks the degeneracy of the $d$ orbitals. The resulting splitting energy ($\Delta$) determines the color of light absorbed by the complex. The spectrochemical series dictates whether ligands cause small splitting (weak-field, high-spin, highly paramagnetic) or large splitting (strong-field, low-spin, weakly paramagnetic/diamagnetic).
