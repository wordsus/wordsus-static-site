Life requires continuous energy, usually harvested from the chemical bonds of food. However, cells cannot use this fuel directly; they must convert it into a universal energy currency: ATP. In this chapter, we explore the elegant metabolic pathways that make this possible. We trace the journey of glucose as it is systematically dismantled, observing how electron transfers generate a proton gradient to drive ATP synthesis. We also examine how cells adapt and generate energy when oxygen is scarce, uncovering the fundamental bioenergetic processes that power all living things.

## 7.1 Redox Reactions and Electron Carriers

The breakdown of organic molecules is an exergonic process that ultimately yields the energy necessary to synthesize ATP. As introduced in Chapter 6, cellular work relies on the constant regeneration of ATP. But how exactly is the potential energy stored in the chemical bonds of complex molecules, such as glucose, converted into a form the cell can use? The answer lies in the transfer of electrons. Reactions that involve the partial or complete transfer of one or more electrons from one reactant to another are called **oxidation-reduction reactions**, or simply **redox reactions**.

### The Principles of Oxidation and Reduction

In a redox reaction, the loss of electrons from a substance is called **oxidation**, while the addition of electrons to another substance is known as **reduction**. (Note that adding negatively charged electrons *reduces* the overall positive charge of the atom or molecule, which is the origin of the term).

We can generalize these reactions with a simple formula:

$$Xe^- + Y \rightarrow X + Ye^-$$

In this generalized reaction, substance $X$, the electron donor, loses an electron and becomes oxidized. It is referred to as the **reducing agent** because it reduces substance $Y$. Conversely, substance $Y$, the electron acceptor, gains an electron and becomes reduced. It acts as the **oxidizing agent** because it oxidizes substance $X$.

Because an electron transfer requires both a donor and an acceptor, oxidation and reduction always occur together.

### Electronegativity and Shifts in Electron Sharing

Not all redox reactions involve the complete transfer of electrons from one substance to another. As discussed in Chapter 2, some chemical reactions change the degree of electron sharing in covalent bonds. This relies heavily on the concept of **electronegativity**, the affinity of an atom for the electrons in a covalent bond.

Oxygen is one of the most electronegative elements known. An electron loses potential energy when it shifts from a less electronegative atom toward a more electronegative one. Therefore, a redox reaction that relocates electrons closer to oxygen releases chemical energy that can be put to work.

This is the fundamental principle behind cellular respiration. Consider the summary equation for the breakdown of glucose:

$$C_6H_{12}O_6 + 6O_2 \rightarrow 6CO_2 + 6H_2O + \text{Energy}$$

In this process, the fuel (glucose) is oxidized, and oxygen is reduced. The electrons associated with the hydrogen atoms in glucose are transferred to oxygen, forming water. Because oxygen is highly electronegative, the electrons move to a lower energy state, releasing energy that the cell will capture to synthesize ATP.

### Electron Carriers: The Cell's Energy Shuttles

If cellular respiration oxidized glucose in a single explosive step, an enormous amount of energy would be released as heat, which would be useless (and dangerous) to the cell. Instead, cellular respiration breaks down glucose in a series of controlled, stepwise reactions.

Electrons are stripped from glucose at various stages. However, these electrons are not transferred directly to oxygen. Instead, they are usually passed first to specialized coenzymes called **electron carriers**. The most prominent electron carrier in cellular respiration is **nicotinamide adenine dinucleotide**, a derivative of the vitamin niacin. This molecule can exist in two distinct states: $NAD^+$ (its oxidized form) and $NADH$ (its reduced form).

Enzymes called **dehydrogenases** facilitate this transfer. A dehydrogenase removes a pair of hydrogen atoms (which consist of 2 electrons and 2 protons) from the substrate (the fuel molecule), thereby oxidizing it. The enzyme delivers the 2 electrons along with 1 proton to its coenzyme, $NAD^+$. The remaining proton is released as a hydrogen ion ($H^+$) into the surrounding solution.

The chemical mechanism of this reduction can be summarized as:

$$NAD^+ + 2e^- + 2H^+ \rightarrow NADH + H^+$$

By receiving two negatively charged electrons but only one positively charged proton, the $NAD^+$ has its charge neutralized, transforming into $NADH$.

```text
       Substrate                                           Oxidized Substrate
      (e.g., Malate)                                      (e.g., Oxaloacetate)
            |                                                     ^
            |          Dehydrogenase Enzyme                       |
            +--------------------X--------------------------------+
                                 |
                                 v
                              [NAD+]
                                 |
                                 |  (Gains 2e- and 1H+)
                                 v
                               [NADH] + [H+] 
                                 |
                                 |
                                 v
                     (Carries electrons to the 
                     Electron Transport Chain)

```

The name $NADH$ represents the core function of the molecule: it holds transferred electrons at a high energy level. Each $NADH$ molecule formed during respiration represents a discrete package of stored energy. This stored energy is eventually tapped to synthesize ATP when the electrons complete their "fall" down an energy gradient from $NADH$ to oxygen, a process that will be explored in detail in Section 7.4. Another related electron carrier, Flavin adenine dinucleotide ($FAD$), functions similarly but operates at slightly different energy levels, shuttling electrons as $FADH_2$.

## 7.2 Glycolysis: Harvesting Chemical Energy

The word **glycolysis** originates from the Greek roots *glykys*, meaning "sweet," and *lysis*, meaning "splitting." This translation—sugar splitting—perfectly describes the fundamental nature of this metabolic pathway. In glycolysis, a six-carbon glucose molecule is broken in half, yielding two three-carbon molecules. These smaller sugars are then oxidized and rearranged to form two molecules of a compound called **pyruvate**.

Glycolysis occurs in the cytosol of the cell, not within a specialized organelle. It is a nearly universal metabolic process, found in domains Archaea, Bacteria, and Eukarya. This widespread distribution, combined with the fact that it does not require oxygen ($O_2$), suggests that glycolysis is an ancient evolutionary pathway that originated long before oxygen accumulated in Earth's atmosphere.

### The Two Phases of Glycolysis

The pathway of glycolysis consists of a sequence of ten distinct chemical reactions, each catalyzed by a specific enzyme. These ten steps can be conceptually divided into two distinct phases: the **energy investment phase** and the **energy payoff phase**.

**1. The Energy Investment Phase**
As the name implies, the cell must actually spend energy to initiate the breakdown of glucose. During the first few steps of glycolysis, two molecules of ATP are consumed to phosphorylate the sugar intermediates. This added phosphate group makes the sugar molecule more reactive and unstable, priming it to be cleaved into two three-carbon sugars.

**2. The Energy Payoff Phase**
Following the split, the pathway yields an energy return. The two three-carbon sugars are oxidized, and electrons are transferred to the electron carrier $NAD^+$ (as discussed in Section 7.1), forming $NADH$. Simultaneously, energy is released to synthesize ATP. Because the glucose was split in two, all reactions in this phase occur twice for every one molecule of glucose that enters the pathway.

```text
=======================================================================
                   THE STAGES OF GLYCOLYSIS
=======================================================================

                 [ ENERGY INVESTMENT PHASE ]
                 
                 Glucose (6-carbon molecule)
                              |
     2 ATP  ------------>     |     <------------ 2 ADP
                              v
             Fructose-1,6-bisphosphate (6-carbon)
                              |
                        (Splitting)
                              |
              +---------------+---------------+
              |                               |
              v                               v
    Glyceraldehyde-3-phosphate (G3P)        G3P
              (3-carbon)                    (3-carbon)


                 [ ENERGY PAYOFF PHASE ]
                 
       2 G3P (from above)     
              |
              |   <------------ 2 NAD+ + 4e- + 4H+
              |   ------------> 2 NADH + 2H+
              |
              |   <------------ 4 ADP + 4 Pi
              |   ------------> 4 ATP
              v
       2 Pyruvate (3-carbon molecule) + 2 H2O

=======================================================================

```

### Substrate-Level Phosphorylation

The ATP generated during the energy payoff phase of glycolysis is produced through a mechanism called **substrate-level phosphorylation**.

In this process, an enzyme directly transfers a phosphate group from an organic substrate molecule (an intermediate in glycolysis) to ADP, forming ATP.

```text
       Enzyme
      /      \
    /          \
[Substrate-P]  [ADP]   ----->  [Substrate] + [ATP]

```

This direct transfer is distinct from *oxidative phosphorylation*, a more complex process we will encounter later in cellular respiration, which relies on an electron transport chain and an inorganic phosphate ($P_i$) pool to generate ATP. While substrate-level phosphorylation is less efficient and produces less ATP overall than oxidative phosphorylation, it is a rapid way for cells to generate usable energy directly from enzymatic reactions.

### The Net Accounting of Glycolysis

To understand the energy yield of glycolysis, we must look at the net accounting of the pathway. The overall reaction for glycolysis can be summarized as follows:

$$\text{Glucose} \rightarrow 2 \text{ Pyruvate} + 2 \text{ H}_2\text{O}$$

For energy carriers, the net yield is calculated by subtracting the initial investment from the final payoff:

**ATP:**

$$4 \text{ ATP (produced)} - 2 \text{ ATP (consumed)} \rightarrow 2 \text{ ATP (net gain)}$$

**NADH:**

$$2 \text{ NAD}^+ + 4e^- + 4H^+ \rightarrow 2 \text{ NADH} + 2H^+ \text{ (net gain)}$$

At the conclusion of glycolysis, all of the carbon originally present in the glucose molecule is accounted for in the two molecules of pyruvate; no carbon is released as $CO_2$ during this stage. However, the energy extracted thus far is only a small fraction of the chemical energy originally stored in glucose. The majority of the potential energy remains locked within the bonds of the two pyruvate molecules. If oxygen is present, these molecules will enter the mitochondrion (in eukaryotic cells) to undergo the next stages of cellular respiration: pyruvate oxidation and the citric acid cycle.

## 7.3 Pyruvate Oxidation and the Citric Acid Cycle

Glycolysis releases less than a quarter of the chemical energy stored in glucose. The majority of that energy remains stockpiled in the two molecules of pyruvate. In the presence of molecular oxygen ($O_2$), eukaryotic cells extract this remaining energy by transporting pyruvate into the mitochondrion, where the oxidation of glucose is completed. In aerobic prokaryotes, this process occurs in the cytosol.

### Pyruvate Oxidation: The Link Reaction

Upon entering the mitochondrion via active transport, pyruvate is first converted into a compound called **acetyl coenzyme A**, or **acetyl CoA**. This step, often referred to as the link reaction, bridges glycolysis and the citric acid cycle. It is accomplished by a multi-enzyme complex that catalyzes three sequential reactions:

1. **Decarboxylation:** Pyruvate's carboxyl group ($-COO^-$), which is fully oxidized and therefore holds little chemical energy, is removed and given off as a molecule of carbon dioxide ($CO_2$). This is the first step in cellular respiration where $CO_2$ is released.
2. **Oxidation:** The remaining two-carbon fragment is oxidized, and the extracted electrons are transferred to $NAD^+$, storing energy in the form of $NADH$.
3. **Attachment of Coenzyme A:** Finally, coenzyme A (CoA), a sulfur-containing compound derived from a B vitamin, is attached via its sulfur atom to the two-carbon intermediate, forming acetyl CoA.

Acetyl CoA has a high potential energy; in other words, the reaction of acetyl CoA to yield lower-energy products is highly exergonic. This molecule is now primed to feed its acetyl group into the citric acid cycle.

```text
=======================================================================
                        PYRUVATE OXIDATION
=======================================================================

      Pyruvate (3-carbon molecule)
               |
               | ----> Release of CO2
               |
               | ----> NAD+  +  2e-  +  2H+  ---->  NADH  +  H+
               |
               v
     Two-carbon fragment (Oxidized)
               |
               | <---- Coenzyme A (CoA)
               v
         Acetyl CoA (2-carbon acetyl group attached to CoA)

=======================================================================

```

### The Citric Acid Cycle

The **citric acid cycle**, also known as the Krebs cycle or the tricarboxylic acid (TCA) cycle, functions as a metabolic furnace that completely oxidizes the organic fuel derived from pyruvate. The cycle takes place within the mitochondrial matrix.

Unlike glycolysis, which is a linear pathway, the citric acid cycle forms a closed loop. The final product of the pathway is also the reactant that initiates the first step, allowing the cycle to run continuously as long as reactants are replenished.

#### Steps of the Cycle

The cycle has eight distinct steps, each catalyzed by a specific enzyme in the mitochondrial matrix:

1. **Introduction of Acetyl CoA:** The cycle begins when the two-carbon acetyl group of acetyl CoA combines with a four-carbon molecule called **oxaloacetate**. This reaction produces the six-carbon molecule **citrate** (the ionized form of citric acid, giving the cycle its name), and CoA is released to be reused.
2. **Isomerization:** Citrate is converted into its isomer, isocitrate, by the removal of one water molecule and the addition of another.
3. **First Oxidation and Decarboxylation:** Isocitrate is oxidized, reducing $NAD^+$ to $NADH$. The resulting compound loses a $CO_2$ molecule, leaving a five-carbon molecule ($\alpha$-ketoglutarate).
4. **Second Oxidation and Decarboxylation:** Another $CO_2$ is lost, and the remaining four-carbon compound is oxidized, reducing another $NAD^+$ to $NADH$. The remaining molecule attaches to coenzyme A, forming succinyl CoA.
5. **Substrate-Level Phosphorylation:** CoA is displaced by a phosphate group, which is then transferred to GDP, forming GTP. In many cells, GTP can then be used to synthesize ATP. The resulting four-carbon molecule is succinate.
6. **Third Oxidation (FAD reduction):** Two hydrogens are transferred from succinate to $FAD$, forming $FADH_2$ and oxidizing succinate to fumarate.
7. **Hydration:** The addition of a water molecule rearranges the bonds in fumarate, converting it to malate.
8. **Regeneration of Oxaloacetate:** Malate is oxidized, reducing a final $NAD^+$ to $NADH$ and regenerating oxaloacetate. This regeneration allows the cycle to begin again.

```text
=======================================================================
                     THE CITRIC ACID CYCLE (SUMMARY)
=======================================================================

                          [ Acetyl CoA (2C) ]
                                   |
                                   v
             +-----------> [ Citrate (6C) ] -----------+
             |                                         |
             |                                         v
   [ Oxaloacetate (4C) ]                         [ Isocitrate (6C) ]
             ^                                         |  --> NAD+ to NADH
             | <-- NAD+ to NADH                        |  --> Release CO2
             |                                         v
       [ Malate (4C) ]                    [ alpha-Ketoglutarate (5C) ]
             ^                                         |  --> NAD+ to NADH
             |                                         |  --> Release CO2
             | <-- FAD to FADH2                        v
     [ Succinate (4C) ] <---------------------- [ Succinyl CoA (4C) ]
                                |
                                +--> ADP + Pi to ATP (via GTP)

=======================================================================

```

### The Net Accounting of the Citric Acid Cycle

Because each glucose molecule yields *two* pyruvates, it takes *two* turns of the citric acid cycle to fully oxidize one molecule of glucose.

For each single turn of the cycle (per one acetyl CoA), the energy yield is:

* $3 \text{ NADH}$
* $1 \text{ FADH}_2$
* $1 \text{ ATP}$ (via substrate-level phosphorylation)

Accounting for the two pyruvates produced from one glucose, the total yield from the citric acid cycle alone is:

$$6 \text{ NADH} \quad + \quad 2 \text{ FADH}_2 \quad + \quad 2 \text{ ATP}$$

Additionally, $4 \text{ CO}_2$ molecules are released during the cycle (along with the $2 \text{ CO}_2$ released during pyruvate oxidation, accounting for all six carbon atoms originally present in glucose).

By the end of the citric acid cycle, glucose has been completely dismantled. However, the direct ATP yield is surprisingly low: only 4 ATP molecules per glucose (2 from glycolysis and 2 from the citric acid cycle). At this stage, the vast majority of the energy extracted from glucose is banked in the electron carriers $NADH$ and $FADH_2$. These high-energy electron carriers will soon deliver their cargo to the electron transport chain, setting the stage for the massive ATP payout of oxidative phosphorylation.

## 7.4 Oxidative Phosphorylation: Electron Transport and Chemiosmosis

Following glycolysis and the citric acid cycle, the direct yield of ATP is meager—only four molecules per molecule of glucose. At this point, the vast majority of the potential energy originally contained in the glucose bonds has been transferred to the electron carriers $NADH$ and $FADH_2$. These loaded carriers are now poised to cash in their energetic cargo.

The final stage of cellular respiration is **oxidative phosphorylation**, a process that couples the oxidation of these electron carriers to the massive production of ATP. Oxidative phosphorylation consists of two interconnected, yet distinct, phases: the electron transport chain and chemiosmosis.

### The Electron Transport Chain

The **electron transport chain (ETC)** is a collection of molecules, predominantly proteins, embedded in the highly folded inner membrane (cristae) of the mitochondrion in eukaryotes, or the plasma membrane in aerobic prokaryotes. The folding of the inner membrane greatly increases its surface area, providing space for thousands of copies of the chain in each mitochondrion.

Most components of the chain are multi-protein complexes numbered I through IV. Tightly bound to these proteins are prosthetic groups—nonprotein components essential for the catalytic functions of certain enzymes.

Electrons acquired from glucose by $NAD^+$ during glycolysis and the citric acid cycle are transferred from $NADH$ to the first molecule of the electron transport chain in Complex I. $FADH_2$ adds its electrons at a slightly lower energy level, directly to Complex II. As electrons move down the chain, they are passed between various carriers, including a small, mobile lipid called **ubiquinone** (or Coenzyme Q) and proteins called **cytochromes**.

Each subsequent carrier in the chain is more electronegative than the one before it. The electrons essentially "fall" down an energy gradient, releasing manageable amounts of energy at each step. At the very end of the chain, the electrons are passed to molecular oxygen ($O_2$), which is highly electronegative. The oxygen also picks up a pair of hydrogen ions ($H^+$) from the aqueous solution to form water.

$$\frac{1}{2} O_2 + 2e^- + 2H^+ \rightarrow H_2O$$

Crucially, **the electron transport chain makes no ATP directly**. Instead, it functions as an energy converter. As complexes I, III, and IV pass electrons along, they use the exergonic energy of the electron fall to pump $H^+$ ions from the mitochondrial matrix into the intermembrane space. This creates an $H^+$ concentration gradient across the membrane.

```text
=======================================================================
                   THE ELECTRON TRANSPORT CHAIN
=======================================================================

   INTERMEMBRANE SPACE (High H+ Concentration)
       H+              H+              H+              H+
   ----^---------------^---------------^--------------------------
       |               |               |
     [Complex I] ---> (Q) ---> [Complex III] ---> (Cyt c) ---> [Complex IV]
       ^               ^                                         |
       |               |                                         v
     NADH            FADH2                                  1/2 O2 + 2H+
       |               |                                         |
       v               v                                         v
     NAD+ + H+       FAD                                        H2O
   ---------------------------------------------------------------
   MITOCHONDRIAL MATRIX (Low H+ Concentration)

=======================================================================

```

### Chemiosmosis: The Energy-Coupling Mechanism

The pumping of $H^+$ into the intermembrane space creates an electrochemical gradient. Because biological membranes are fundamentally impermeable to ions, the $H^+$ cannot simply diffuse back across the membrane to equalize the concentration. They have a tendency to move back across the membrane down their gradient, a capacity to do work known as the **proton-motive force**.

The only way for $H^+$ to re-enter the mitochondrial matrix is through specific protein complexes built into the inner membrane, known as **ATP synthase**.

ATP synthase functions like a miniature, molecular turbine. The flow of $H^+$ ions through a specialized channel in the ATP synthase complex causes an internal rotor to spin. This mechanical rotation alters the conformation of the catalytic knob portion of the enzyme in the matrix, activating sites that bind ADP and inorganic phosphate ($P_i$) to synthesize ATP.

This process, in which energy stored in the form of a hydrogen ion gradient across a membrane is used to drive cellular work such as the synthesis of ATP, is called **chemiosmosis**.

```text
=======================================================================
               CHEMIOSMOSIS AND ATP SYNTHASE
=======================================================================

   INTERMEMBRANE SPACE (High H+ Concentration)
   H+    H+    H+    H+    H+    H+    H+
           \   |   /
            \  |  /  <--- H+ flows down its concentration gradient
   ===========[Rotor]=========== Inner Mitochondrial Membrane
              [Stalk]  <--- Rotation driven by H+ flow
               |   |
             [Catalytic]
             [  Knob   ]
                   \
               ADP + Pi ---> ATP 

   MITOCHONDRIAL MATRIX (Low H+ Concentration)

=======================================================================

```

Together, the electron transport chain and chemiosmosis constitute oxidative phosphorylation. The ETC creates the proton gradient, and chemiosmosis utilizes that gradient to make ATP.

### Accounting for Total ATP Production

Let's tally the overall energy harvest for one molecule of glucose undergoing cellular respiration:

1. **Glycolysis:** $2 \text{ ATP}$ (via substrate-level phosphorylation)
2. **Citric Acid Cycle:** $2 \text{ ATP}$ (via substrate-level phosphorylation)
3. **Oxidative Phosphorylation:** $\approx 26 - 28 \text{ ATP}$ (via chemiosmosis)

This brings the total maximum yield to roughly **30 to 32 ATP per glucose molecule**.

Why is the final number an estimate rather than an exact integer?

* First, phosphorylation and the redox reactions are not directly coupled, so the ratio of $NADH$ molecules to ATP molecules is not a whole number.
* Second, the ATP yield varies slightly depending on the specific shuttle system used to transport electrons from cytosolic $NADH$ (produced in glycolysis) into the mitochondrion.
* Finally, the proton-motive force generated by the ETC is occasionally used to drive other kinds of cellular work, such as the uptake of pyruvate from the cytosol, which reduces the total number of protons available for ATP synthase.

Despite these variables, the efficiency of cellular respiration is remarkable, capturing roughly 34% of the potential chemical energy in glucose. The remainder of the energy is lost as heat, which, in endothermic animals like humans, is used to maintain our relatively high body temperatures.

## 7.5 Anaerobic Respiration and Fermentation Pathways

Because oxygen is the final electron acceptor in the electron transport chain, oxidative phosphorylation is entirely dependent on an adequate supply of molecular oxygen ($O_2$). Without electronegative oxygen to pull electrons down the transport chain, oxidative phosphorylation eventually ceases.

However, cells still need to generate ATP to survive. There are two primary mechanisms by which certain cells can oxidize organic fuel and generate ATP without the use of oxygen: **anaerobic respiration** and **fermentation**. The fundamental distinction between these two processes lies in whether or not an electron transport chain is present.

### Anaerobic Respiration

Anaerobic respiration takes place in certain prokaryotic organisms that live in environments devoid of oxygen, such as marine sediments or animal intestines. These organisms possess an electron transport chain embedded in their plasma membrane, but they do not use oxygen as the final electron acceptor.

Instead, they utilize other, less electronegative substances. For example, some sulfate-reducing marine bacteria use the sulfate ion ($SO_4^{2-}$). In this case, hydrogen sulfide ($H_2S$), rather than water, is produced as a byproduct. While anaerobic respiration is highly efficient and utilizes a proton gradient to drive ATP synthase, the less electronegative final acceptors mean the electron "fall" releases less energy overall compared to aerobic respiration.

### Fermentation: Keeping Glycolysis Going

Fermentation is a simpler process that does not involve an electron transport chain or the citric acid cycle. It is essentially an extension of glycolysis that allows continuous generation of ATP by the substrate-level phosphorylation of glycolysis.

For glycolysis to continue functioning, there must be a sufficient supply of $NAD^+$ to accept electrons during the oxidation step. Under aerobic conditions, $NAD^+$ is continuously recycled from $NADH$ by the transfer of electrons to the electron transport chain. Under anaerobic conditions, if $NAD^+$ is not regenerated, the cell will deplete its pool of $NAD+$, and glycolysis will completely halt.

Fermentation pathways solve this problem by transferring electrons from $NADH$ to pyruvate (or a derivative of pyruvate). This oxidizes $NADH$ back to $NAD^+$, which can then be reused to oxidize sugar in glycolysis.

```text
=======================================================================
                      THE LOGIC OF FERMENTATION
=======================================================================

      [ Glucose ]
           |
           |  (Glycolysis)
           |    2 ADP + 2 Pi ----> 2 ATP (Net energy yield)
           v    2 NAD+       ----> 2 NADH
      [ 2 Pyruvate ] 
           |
           |  (Fermentation Reactions)
           |    2 NADH       ----> 2 NAD+ (Recycled back to glycolysis)
           v
   [ Fermentation End Products ]
     (e.g., Ethanol or Lactate)

=======================================================================

```

There are many types of fermentation, differing in the end products formed from pyruvate. Two of the most common types are alcohol fermentation and lactic acid fermentation.

#### Alcohol Fermentation

In **alcohol fermentation**, pyruvate is converted to ethanol (ethyl alcohol) in two steps.

1. **Decarboxylation:** Carbon dioxide is released from the pyruvate, converting the three-carbon pyruvate to a two-carbon compound called acetaldehyde.
2. **Reduction:** Acetaldehyde is reduced by $NADH$ to ethanol. This regenerates the supply of $NAD^+$ needed for the continuation of glycolysis.

$$ \text{Pyruvate} \xrightarrow{-\text{CO}_2} \text{Acetaldehyde} \xrightarrow{+\text{NADH}} \text{Ethanol} + \text{NAD}^+ $$

Many bacteria carry out alcohol fermentation under anaerobic conditions. The most well-known organism utilizing this pathway is yeast (a single-celled fungus). For millennia, humans have harnessed yeast's alcohol fermentation for brewing, winemaking, and baking. The $CO_2$ bubbles generated by yeast during alcohol fermentation are what allow bread dough to rise.

#### Lactic Acid Fermentation

In **lactic acid fermentation**, pyruvate is reduced directly by $NADH$ to form lactate as an end product, with no release of $CO_2$. (Lactate is the ionized form of lactic acid).

$$ \text{Pyruvate} + \text{NADH} + \text{H}^+ \rightarrow \text{Lactate} + \text{NAD}^+ $$

Lactic acid fermentation by certain fungi and bacteria is utilized in the dairy industry to make cheese and yogurt.

Human muscle cells also utilize lactic acid fermentation when the cardiovascular system cannot supply oxygen fast enough to meet the muscles' demand for ATP—for instance, during a strenuous sprint. The muscle cells switch from aerobic respiration to fermentation, generating ATP rapidly (though inefficiently) and accumulating lactate. The lactate is later transported by the blood to the liver, where it is converted back to pyruvate once oxygen becomes available again.

### Evolutionary Significance of Glycolysis

The universal role of glycolysis in both fermentation and respiration provides an evolutionary basis for this pathway. Ancient prokaryotes are thought to have used glycolysis to make ATP long before oxygen accumulated in Earth's atmosphere (which occurred roughly 2.7 billion years ago due to the emergence of photosynthetic cyanobacteria). Because glycolysis requires neither oxygen nor any membrane-bound organelles, it is considered a fundamental, ancient metabolic pathway inherited by almost all modern organisms.

## Chapter Summary

In Chapter 7, we explored how cells harvest the chemical energy stored in organic molecules to fuel cellular work.

* **Redox Reactions:** Cellular respiration relies on oxidation-reduction reactions. Energy is released as electrons are transferred from fuel molecules (like glucose) to more electronegative electron acceptors (like oxygen), often utilizing intermediate electron carriers such as $NAD^+$ and $FAD$.
* **Glycolysis:** Occurring in the cytosol, glycolysis splits glucose into two molecules of pyruvate, yielding a net of 2 ATP (via substrate-level phosphorylation) and 2 $NADH$.
* **Pyruvate Oxidation and the Citric Acid Cycle:** In the presence of oxygen, pyruvate enters the mitochondrion, is oxidized to acetyl CoA, and enters the citric acid cycle. The cycle completes the breakdown of glucose to $CO_2$, producing 2 ATP, 6 $NADH$, and 2 $FADH_2$ per glucose molecule.
* **Oxidative Phosphorylation:** The bulk of ATP production occurs here. $NADH$ and $FADH_2$ deliver electrons to the electron transport chain. The exergonic "fall" of electrons to $O_2$ drives the pumping of $H^+$ into the intermembrane space. The resulting proton-motive force powers ATP synthase via chemiosmosis, generating up to 28 ATP.
* **Anaerobic Respiration and Fermentation:** In the absence of oxygen, some cells use an alternative final electron acceptor in the ETC (anaerobic respiration), or rely entirely on glycolysis coupled with reactions that regenerate $NAD^+$ (fermentation), yielding much less ATP but allowing survival under anoxic conditions.
