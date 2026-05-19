Survival for any complex animal depends on its ability to constantly monitor its internal and external environments and respond appropriately. This monumental task of coordination and control is managed by two interacting communication networks: the nervous system and the endocrine system. While the nervous system uses rapid electrical impulses along highly specialized cells called neurons to direct immediate, pinpoint responses (like moving a muscle), the endocrine system relies on chemical messengers called hormones broadcast through the bloodstream to regulate slower, sustained processes. Together, these systems maintain absolute homeostasis.

## 22.1 Neuron Structure, Glial Cells, and the Resting Potential

The nervous system is a highly complex communication network capable of receiving sensory input, integrating information, and directing motor output. At the foundation of this system are the specialized cells that transmit chemical and electrical signals, supported by an array of secondary cells that maintain the local environment.

### The Anatomy of a Neuron

Neurons are the fundamental units of the nervous system, uniquely adapted to process and transmit information. While they vary widely in shape depending on their specific role and location, most neurons share a common structural organization consisting of three primary regions: the cell body, dendrites, and the axon.

* **Cell Body (Soma):** The metabolic center of the neuron. It contains the nucleus, which houses the genetic material, and most of the cell's organelles, including the endoplasmic reticulum and ribosomes necessary for synthesizing neurotransmitters and other essential proteins.
* **Dendrites:** Highly branched, tree-like extensions radiating from the soma. Dendrites serve as the primary receiving antennas of the neuron, capturing chemical signals from other cells and converting them into small electrical impulses that travel toward the cell body.
* **Axon:** A typically single, long projection that conducts electrical impulses away from the cell body toward target cells.
* **Axon Hillock:** The cone-shaped region where the axon joins the cell body. This area serves as the neuron's "trigger zone," integrating incoming signals to determine whether an action potential will be fired.
* **Myelin Sheath:** A lipid-rich insulating layer wrapping around many axons, formed by specialized supporting cells. The sheath significantly increases the speed of electrical transmission.
* **Nodes of Ranvier:** Periodic gaps in the myelin sheath where the axonal membrane is exposed to the extracellular fluid. These nodes are densely packed with ion channels and are crucial for the rapid propagation of nerve impulses.
* **Synaptic Terminals:** The branched endings of the axon. These terminals store chemical messengers (neurotransmitters) and release them into the synapse to communicate with the next cell in the pathway.

```text
       Incoming Signals
             |
        \    |    /
         \   |   /
      ---- Dendrites ----
           \ | /
           [Soma] --- Nucleus
           /   \
      Axon Hillock  <-- Integration Zone
             |
          [Myelin]
             |      <-- Node of Ranvier
          [Myelin]
             |      <-- Axon
          [Myelin]
            / \
          /     \
   Synaptic Terminals
          |  |  |
      Outgoing Signals

```

### Glial Cells: The Unsung Heroes of the Nervous System

Neurons cannot function in isolation. They are vastly outnumbered by glial cells (or glia), which provide essential structural, metabolic, and immunological support. Unlike neurons, glia generally do not conduct electrical impulses, but they are indispensable for maintaining the homeostatic environment required for neuronal function.

The types of glial cells differ between the Central Nervous System (CNS; the brain and spinal cord) and the Peripheral Nervous System (PNS; all other nervous tissue).

**Table 22.1: Major Types of Glial Cells and Their Functions**

| Glial Cell Type | Location | Primary Functions |
| --- | --- | --- |
| **Astrocytes** | CNS | Provide structural support, regulate extracellular ion concentrations, transfer nutrients from blood vessels to neurons, and help form the blood-brain barrier. |
| **Oligodendrocytes** | CNS | Wrap around CNS axons to form the insulating myelin sheath. A single oligodendrocyte can myelinate multiple adjacent axons. |
| **Microglia** | CNS | Act as the primary immune defense of the CNS, scavenging and phagocytizing cellular debris, plaques, and infectious agents. |
| **Ependymal Cells** | CNS | Line the ventricles of the brain and the central canal of the spinal cord. Their cilia help circulate cerebrospinal fluid (CSF). |
| **Schwann Cells** | PNS | Form the myelin sheath around PNS axons. Unlike oligodendrocytes, a single Schwann cell wraps around only one segment of a single axon. |
| **Satellite Cells** | PNS | Surround neuron cell bodies within ganglia in the PNS, regulating the external chemical environment much like astrocytes do in the CNS. |

### The Resting Membrane Potential

For a neuron to transmit a signal, it must hold a reserve of potential energy. This energy exists as an electrical charge difference across the plasma membrane, known as the membrane potential. When a neuron is not actively transmitting a signal, this baseline electrical difference is called the **resting potential**.

In a typical mammalian neuron, the resting potential is between **-60 mV** and **-80 mV** (often simplified to **-70 mV**). The negative sign indicates that the inside of the cell is negatively charged relative to the outside.

This resting state is established and maintained by two primary factors: specific ion concentration gradients and the selective permeability of the plasma membrane.

#### Ion Gradients and the Sodium-Potassium Pump

The intracellular fluid (cytosol) and the extracellular fluid contain different concentrations of vital ions.

* **Potassium ($K^+$)** concentration is much higher *inside* the cell than outside.
* **Sodium ($Na^+$)** and **Chloride ($Cl^-$)** concentrations are much higher *outside* the cell than inside.
* Large **organic anions ($A^-$)**, such as proteins and nucleic acids, are trapped inside the cell and contribute to the internal negative charge.

These concentration gradients are actively maintained by the **sodium-potassium pump** ($Na^+/K^+$ ATPase). As discussed in Chapter 5, this transmembrane protein uses the energy of ATP hydrolysis to actively transport three $Na^+$ ions out of the cell for every two $K^+$ ions it brings in. Because it removes more positive charge than it imports, the pump is electrogenic, contributing directly to the net negative charge inside the cell.

#### Selective Permeability and Leak Channels

While the sodium-potassium pump establishes the gradients, the resting potential itself is largely determined by the movement of ions through passive ion channels, specifically **leak channels**, which are always open.

The plasma membrane of a resting neuron has many open $K^+$ leak channels but very few open $Na^+$ leak channels. Consequently, the membrane is highly permeable to $K^+$ and only slightly permeable to $Na^+$.

1. Because of the concentration gradient, $K^+$ diffuses out of the cell through leak channels.
2. As $K^+$ leaves, it carries positive charge away, leaving behind uncoordinated negative charges (from the trapped organic anions).
3. This creates an electrical gradient that begins to pull $K^+$ back into the cell.
4. Eventually, the chemical force pushing $K^+$ out is perfectly balanced by the electrical force pulling it in.

#### Mathematical Modeling of Membrane Potential

The theoretical equilibrium state for a single ion can be calculated using the **Nernst equation**. This equation determines the equilibrium potential ($E_{ion}$)—the specific membrane voltage at which there is no net movement of that particular ion across the membrane.

$$E_{ion} = \frac{RT}{zF} \ln\left(\frac{[Ion]_{out}}{[Ion]_{in}}\right)$$

Where:

* $R$ is the ideal gas constant.
* $T$ is the absolute temperature (in Kelvin).
* $z$ is the valence of the ion (e.g., $+1$ for $K^+$, $-1$ for $Cl^-$).
* $F$ is the Faraday constant.

At physiological temperature (37°C), the equation for a monovalent cation can be simplified using base-10 logarithms:

$$E_{ion} = 62 \log_{10} \left( \frac{[Ion]_{out}}{[Ion]_{in}} \right)$$

For $K^+$, the calculated Nernst equilibrium potential ($E_K$) is approximately **-90 mV**. However, the actual resting potential of a neuron is around **-70 mV**. This discrepancy exists because the membrane is not perfectly impermeable to other ions; a small amount of $Na^+$ constantly leaks inward, slightly depolarizing the cell (making it less negative) away from the pure potassium equilibrium.

To calculate the resting membrane potential ($V_m$) by accounting for the permeability ($P$) of all relevant ions simultaneously, neurobiologists use the **Goldman-Hodgkin-Katz (GHK) equation**:

$$V_m = \frac{RT}{F} \ln \left( \frac{P_K[K^+]_{out} + P_{Na}[Na^+]_{out} + P_{Cl}[Cl^-]_{in}}{P_K[K^+]_{in} + P_{Na}[Na^+]_{in} + P_{Cl}[Cl^-]_{out}} \right)$$

*(Note the inverted position of intracellular and extracellular concentrations for $Cl^-$ due to its negative valence).*

Because $P_K$ (potassium permeability) is significantly larger than $P_{Na}$ or $P_{Cl}$ at rest, the $K^+$ concentration gradient dominates the calculation, explaining why the resting potential remains so close to the potassium equilibrium potential. A disruption to this delicate balance sets the stage for electrical signaling, leading to the generation of action potentials.

## 22.2 Action Potentials and Conduction Along the Axon

The resting membrane potential provides a baseline state for the neuron, but the essence of neural communication lies in the rapid, transient changes to this potential. When a neuron is stimulated, its membrane permeability alters, causing ions to flow across the membrane and changing the local electrical charge. If this change is significant enough, it triggers an action potential—a massive, rapid depolarization that travels along the axon to communicate with other cells.

### Changes in Membrane Potential: Depolarization and Hyperpolarization

Stimuli received by a neuron's dendrites or cell body cause local changes in the membrane potential by opening or closing specific **ligand-gated ion channels** (channels that respond to chemical messengers). These localized shifts are called **graded potentials** because their magnitude varies directly with the strength of the stimulus.

Graded potentials can be divided into two categories based on how they alter the membrane voltage:

* **Depolarization:** A reduction in the magnitude of the membrane potential (the inside of the cell becomes *less* negative, e.g., moving from -70 mV toward -50 mV). This typically occurs when a stimulus opens $Na^+$ channels, allowing positively charged sodium ions to rush into the cell.
* **Hyperpolarization:** An increase in the magnitude of the membrane potential (the inside of the cell becomes *more* negative, e.g., moving from -70 mV to -80 mV). This often results from the opening of $K^+$ channels (allowing positive ions to exit) or $Cl^-$ channels (allowing negative ions to enter).

### The Action Potential: An All-or-None Response

While graded potentials decay over short distances, an **action potential** is a self-regenerating electrical signal capable of traveling vast distances along an axon without losing strength. Action potentials rely on **voltage-gated ion channels**, which open or close in response to changes in the membrane voltage itself.

Action potentials operate on an **all-or-none** principle. For an action potential to occur, a depolarizing graded potential must reach a specific voltage called the **threshold** (typically around -55 mV in mammalian neurons). If the depolarization reaches threshold, an action potential is guaranteed; if it does not reach threshold, no action potential occurs. The amplitude of the action potential is independent of the stimulus strength.

#### Phases of the Action Potential

The generation of an action potential follows a highly choreographed sequence of events involving voltage-gated $Na^+$ and $K^+$ channels:

1. **Resting State:** At resting potential (-70 mV), the voltage-gated $Na^+$ and $K^+$ channels are closed. The resting potential is maintained by leak channels and the sodium-potassium pump.
2. **Depolarization:** A stimulus opens some $Na^+$ channels. $Na^+$ flows into the cell, depolarizing the membrane. If the depolarization reaches the threshold (-55 mV), it triggers the opening of many more voltage-gated $Na^+$ channels.
3. **Rising Phase (The Action Potential):** The massive influx of $Na^+$ rapidly depolarizes the membrane, driving the membrane potential up to an extreme positive value, often peaking near +35 mV. The inside of the cell is now momentarily positive relative to the outside.
4. **Falling Phase (Repolarization):** Two key events occur almost simultaneously at the peak. First, voltage-gated $Na^+$ channels rapidly inactivate (a specialized "plug" blocks the channel pore), halting the influx of sodium. Second, voltage-gated $K^+$ channels, which are slower to respond to the initial threshold voltage, finally open fully. $K^+$ rapidly rushes *out* of the cell down its electrochemical gradient, restoring the internal negative charge.
5. **Undershoot (Hyperpolarization):** The voltage-gated $K^+$ channels are slow to close. Consequently, slightly more $K^+$ exits the cell than is necessary to restore the resting potential, driving the membrane potential briefly below -70 mV (closer to the $E_K$ of -90 mV). As the $K^+$ channels finally close, the leak channels and the sodium-potassium pump restore the membrane to its resting state.

```text
       +40 |         (3) Peak
           |        /   \
 Membrane  |       /     \
 Potential |      /       \  (4) Repolarization
   (mV)  0 |     /         \
           |    /           \
           |   /             \
       -55 |../(2) Threshold  \
           | /                 \          (1) Resting
       -70 |/                   \________/
           |                     \  (5) / Undershoot
           |                      \____/
           +-----------------------------------
                           Time (ms)

```

### The Refractory Period and Directionality

During the falling phase and early undershoot, a second action potential cannot be triggered, regardless of the stimulus strength. This interval is the **absolute refractory period**, and it occurs because the voltage-gated $Na^+$ channels remain inactivated and cannot be reopened until the membrane repolarizes to the resting potential.

Following this is the **relative refractory period**, during which a second action potential *can* be initiated, but only by a significantly stronger-than-normal stimulus, because the membrane is hyperpolarized and further away from threshold.

The absolute refractory period is critical because it dictates the unidirectional flow of the nerve impulse.

### Conduction of the Action Potential

An action potential does not literally travel down the axon; rather, it is continuously regenerated in a wave-like fashion.

When the membrane depolarizes at a specific site (e.g., the axon hillock), the inward rush of $Na^+$ creates a local electrical current. These positive ions diffuse laterally along the inside of the axon, depolarizing the adjacent region of the membrane. If this adjacent region reaches threshold, its voltage-gated $Na^+$ channels open, generating a new action potential there.

The action potential cannot propagate backward toward the cell body because the region of the membrane that just underwent an action potential is in its absolute refractory period. Therefore, the signal propagates in only one direction: toward the synaptic terminals.

#### Saltatory Conduction in Myelinated Axons

In unmyelinated axons, this step-by-step regeneration (continuous conduction) is relatively slow. In vertebrates, many axons are wrapped in a myelin sheath, a lipid-rich insulating layer formed by oligodendrocytes (CNS) or Schwann cells (PNS).

Myelin acts as an electrical insulator, preventing ions from leaking out across the plasma membrane. In myelinated axons, voltage-gated ion channels are restricted to the **nodes of Ranvier**, the bare gaps between myelin segments.

When an action potential occurs at a node, the inward current of $Na^+$ rapidly travels through the cytosol to the next node, experiencing very little leakage. This depolarizes the next node to threshold, triggering an action potential there. Because the electrical signal "jumps" from node to node rather than being regenerated at every point along the membrane, conduction is drastically faster and much more energy-efficient. This mechanism is known as **saltatory conduction** (from the Latin *saltare*, meaning "to leap").

## 22.3 Synaptic Transmission and Neurotransmitters

The action potential is a robust mechanism for long-distance communication along a single axon. However, a neural pathway rarely consists of a single neuron. To transmit information from one cell to the next—whether it is another neuron, a muscle fiber, or a gland—the signal must cross a specialized junction called a **synapse**.

While a minority of synapses in the animal kingdom are **electrical synapses** (where gap junctions allow ions to flow directly between cells for nearly instantaneous communication), the vast majority are **chemical synapses**. At a chemical synapse, the electrical signal of the action potential is briefly converted into a chemical signal, allowing for complex regulation, integration, and modification of neural circuits.

### The Anatomy of a Chemical Synapse

A chemical synapse involves two cells separated by a microscopic gap:

* **Presynaptic Neuron:** The transmitting cell that sends the signal.
* **Postsynaptic Cell:** The receiving cell (neuron, muscle, or gland) that detects the signal.
* **Synaptic Cleft:** The narrow extracellular space (typically 20-50 nanometers wide) separating the presynaptic and postsynaptic membranes.

Within the swollen terminal of the presynaptic axon (the synaptic knob), large numbers of membrane-bound sacs called **synaptic vesicles** reside. Each vesicle contains thousands of molecules of a chemical messenger known as a **neurotransmitter**.

```text
       Presynaptic Axon Terminal
      |                         |
      |   [Synaptic Vesicles]   |
      |     (::)       (::)     |
      |            |            |
 Ca2+ --> [Voltage-Gated Ca2+]  |
      |            |            |
      |      (Exocytosis)       |
      |____..____..____.._______|
           ..    ..    ..   <----- Neurotransmitters 
           ..    ..    ..          in Synaptic Cleft
       ____||____||____||_______
      |    ||    ||    ||       |
      |  [Ligand-Gated Channels]|
      |                         |
      |   Postsynaptic Cell     |

```

### The Sequence of Synaptic Transmission

When an action potential travels down the axon and arrives at the synaptic terminal, it triggers a precisely timed sequence of events that results in the release of neurotransmitters.

1. **Arrival of the Action Potential:** The wave of depolarization reaches the presynaptic terminal.
2. **Calcium Influx:** The depolarization causes voltage-gated calcium channels (Ca²⁺) in the terminal membrane to open. Because the concentration of Ca²⁺ is much higher outside the cell than inside, Ca²⁺ rushes into the presynaptic terminal.
3. **Vesicle Fusion:** The sudden rise in intracellular Ca²⁺ triggers specialized proteins (SNARE complexes) to draw the synaptic vesicles toward the presynaptic membrane. The vesicles fuse with the membrane, emptying their neurotransmitter contents into the synaptic cleft via exocytosis.
4. **Diffusion and Binding:** The released neurotransmitters diffuse across the narrow synaptic cleft and bind to specific receptor proteins on the postsynaptic membrane.
5. **Cellular Response:** The binding of the neurotransmitter initiates a response in the postsynaptic cell, typically by altering its membrane potential.

### Postsynaptic Potentials and Integration

The receptors on the postsynaptic membrane are generally **ligand-gated ion channels** (also called ionotropic receptors). When a neurotransmitter (the ligand) binds, the channel opens, allowing specific ions to flow across the membrane. This creates a localized, graded change in the membrane potential called a postsynaptic potential.

Postsynaptic potentials are divided into two categories based on their effect on the postsynaptic neuron's membrane voltage:

* **Excitatory Postsynaptic Potentials (EPSPs):** These occur when the neurotransmitter opens channels permeable to both Na⁺ and K⁺. The electrochemical gradient for Na⁺ is much stronger, so more Na⁺ enters the cell than K⁺ leaves. This causes a local *depolarization*, bringing the membrane potential closer to the threshold required to fire an action potential.
* **Inhibitory Postsynaptic Potentials (IPSPs):** These occur when the neurotransmitter opens channels highly permeable to K⁺ or Cl⁻. K⁺ exiting the cell or Cl⁻ entering the cell causes a local *hyperpolarization*, driving the membrane potential further away from the threshold, thus inhibiting the neuron from firing.

#### Neural Integration: Spatial and Temporal Summation

A single EPSP is rarely strong enough to trigger an action potential in the postsynaptic neuron. However, a single neuron may receive inputs from thousands of different presynaptic terminals simultaneously. The axon hillock serves as the neuron's integrating center, tallying all incoming EPSPs and IPSPs.

* **Spatial Summation:** Occurs when multiple EPSPs are generated simultaneously at different synapses along the dendrites and cell body. Their combined depolarizing effect can push the axon hillock to threshold.
* **Temporal Summation:** Occurs when a single presynaptic terminal fires repeatedly in rapid succession. The second EPSP arrives before the membrane has fully repolarized from the first, allowing the potentials to add together over time.

If the net effect of all summated potentials at the axon hillock reaches threshold (e.g., -55 mV), an action potential is fired. If IPSPs dominate or EPSPs are insufficient, the signal stops.

### Termination of the Signal

For a synapse to function effectively, the chemical signal must be brief. If neurotransmitters remained in the cleft indefinitely, the postsynaptic cell would be continuously stimulated or inhibited, paralyzing the circuit. The neurotransmitter is cleared from the synaptic cleft through three primary mechanisms:

1. **Enzymatic Degradation:** Specific enzymes in the synaptic cleft rapidly break down the neurotransmitter. For example, acetylcholinesterase breaks down acetylcholine.
2. **Reuptake:** Transport proteins in the presynaptic membrane actively pump the neurotransmitter back into the terminal, where it is repackaged into vesicles or broken down. Glial cells, particularly astrocytes, also assist in reuptake.
3. **Diffusion:** A fraction of the neurotransmitter simply diffuses away from the synaptic cleft into the surrounding extracellular fluid.

### Major Classes of Neurotransmitters

Evolution has conserved a variety of molecules to serve as neurotransmitters, allowing for immense diversity in neural signaling. A single neurotransmitter can have different—even opposite—effects depending on the specific receptor it binds to on the postsynaptic cell.

**Table 22.3: Major Neurotransmitter Classes and Examples**

| Class | Key Examples | Primary Functions and Characteristics |
| --- | --- | --- |
| **Acetylcholine** | Acetylcholine (ACh) | Vital for muscle stimulation at the neuromuscular junction. In the brain, it is involved in memory formation, learning, and arousal. |
| **Amino Acids** | Glutamate, GABA | **Glutamate** is the primary excitatory neurotransmitter in the central nervous system (CNS). **GABA** (gamma-aminobutyric acid) is the primary inhibitory neurotransmitter in the CNS. |
| **Biogenic Amines** | Dopamine, Serotonin, Norepinephrine | Synthesized from amino acids. They play central roles in regulating mood, sleep, attention, and the reward pathway. Imbalances are often linked to psychiatric disorders. |
| **Neuropeptides** | Endorphins, Substance P | Short chains of amino acids. **Endorphins** function as natural analgesics, decreasing pain perception and inducing euphoria. **Substance P** mediates pain signaling. |
| **Gases** | Nitric Oxide (NO) | Unlike others, it is not stored in vesicles but synthesized on demand. It diffuses freely across membranes to act as a localized retrograde messenger. |

## 22.4 Organization of the Vertebrate Central and Peripheral Nervous Systems

The vast networks of neurons in a vertebrate organism do not operate as a random assortment of wires; they are highly organized into a sophisticated, hierarchical architecture. At the broadest level, the vertebrate nervous system is divided into two continuous and interacting anatomical branches: the **Central Nervous System (CNS)** and the **Peripheral Nervous System (PNS)**.

### Hierarchical Organization of the Nervous System

To understand how sensory information is processed and how motor commands are executed, it is helpful to map the structural and functional divisions of the nervous system.

```text
                             [Nervous System]
                               /          \
                              /            \
         [Central Nervous System]        [Peripheral Nervous System]
           (Brain & Spinal Cord)           (Cranial & Spinal Nerves)
                                              /                 \
                                             /                   \
                                [Afferent Division]       [Efferent Division]
                                 (Sensory Input)           (Motor Output)
                                                             /            \
                                                            /              \
                                                [Motor System]       [Autonomic System]
                                                 (Voluntary)           (Involuntary)
                                                                       /      |      \
                                                                      /       |       \
                                                        [Sympathetic] [Parasympathetic] [Enteric]
                                                        (Arousing)     (Calming)       (Digestion)

```

### The Central Nervous System (CNS)

The CNS consists of the brain and the spinal cord. It is the integration and command center of the body, responsible for interpreting sensory input and dictating motor responses based on past experiences, reflexes, and current conditions.

* **The Brain:** The master control center, housed within the skull. It is responsible for complex integrative functions, including homeostasis, perception, movement, learning, and memory. The vertebrate brain is regionally specialized into the forebrain, midbrain, and hindbrain, each managing specific physiological and cognitive tasks.
* **The Spinal Cord:** A thick bundle of nerve tissue that runs longitudinally inside the vertebral column. It serves a dual purpose: acting as a two-way information highway between the brain and the PNS, and integrating simple motor responses independently of the brain, known as **reflexes** (e.g., the knee-jerk response).

#### Gray Matter and White Matter

A cross-section of the CNS reveals two distinct types of tissue:

* **Gray matter:** Primarily composed of neuron cell bodies, dendrites, and unmyelinated axons. It is the site of information integration. In the brain, gray matter forms the outer layer (cortex), whereas in the spinal cord, it is located internally in a butterfly shape.
* **White matter:** Consists of bundled axons that have myelin sheaths (which give the tissue its whitish appearance). White matter forms the tracts that transmit signals across different parts of the CNS. In the spinal cord, white matter lies on the outside, linking the CNS to sensory and motor neurons of the PNS.

#### Protection of the CNS

Because CNS tissue is delicate and vital, it is heavily protected. The brain and spinal cord are enclosed in bone (the skull and vertebrae) and wrapped in three protective connective tissue layers called the **meninges**. Furthermore, the hollow cavities of the brain (ventricles) and the central canal of the spinal cord are filled with **cerebrospinal fluid (CSF)**. Formed by filtration of arterial blood, CSF cushions the brain, supplies nutrients, and removes wastes.

### The Peripheral Nervous System (PNS)

The PNS acts as the communication lines linking all parts of the body to the CNS. It is composed of nerves (bundles of axons) and ganglia (clusters of neuron cell bodies). Nerves that originate from the brain are **cranial nerves**, while those originating from the spinal cord are **spinal nerves**.

Functionally, the PNS is divided into two primary directional pathways:

1. **Afferent (Sensory) Division:** Carries signals *toward* the CNS from sensory receptors located in the skin, internal organs, and specialized sensory organs (eyes, ears, etc.).
2. **Efferent (Motor) Division:** Carries commands *away from* the CNS to effectors, which are the muscles and glands that carry out the body's responses.

### Divisions of the Efferent PNS

The efferent division is further subdivided based on whether the motor control is conscious or subconscious.

#### The Motor System (Somatic Nervous System)

The motor system carries signals to skeletal muscles. This system can be voluntary, such as when you consciously decide to raise your arm, or involuntary, such as a somatic reflex. Because it primarily controls skeletal muscle, it is heavily involved in an organism's response to external environmental changes.

#### The Autonomic Nervous System (ANS)

The autonomic nervous system regulates the internal environment by controlling smooth muscle, cardiac muscle, and the organs of the digestive, cardiovascular, excretory, and endocrine systems. This control is generally involuntary. The ANS itself is subdivided into three networks: the sympathetic, parasympathetic, and enteric divisions.

The **enteric division** consists of a complex network of neurons localized entirely within the digestive tract, pancreas, and gallbladder. It controls secretion and smooth muscle peristalsis, functioning semi-independently but regulated by the other two autonomic divisions.

The **sympathetic** and **parasympathetic** divisions typically exert opposite (antagonistic) effects on the same target organs. This dual innervation allows the body to maintain precise homeostatic control.

**Table 22.4: Antagonistic Effects of the Sympathetic and Parasympathetic Divisions**

| Target Organ / System | Sympathetic Division ("Fight-or-Flight") | Parasympathetic Division ("Rest-and-Digest") |
| --- | --- | --- |
| **Heart** | Increases heart rate and contractility | Decreases heart rate |
| **Airways (Lungs)** | Relaxes bronchi (dilates to increase airflow) | Constricts bronchi |
| **Digestive Tract** | Inhibits motility and secretion | Stimulates motility and secretion |
| **Liver** | Stimulates glucose release into the blood | Stimulates gallbladder (bile release) |
| **Pupils (Eye)** | Dilates pupils (improves far/night vision) | Constricts pupils |
| **Adrenal Medulla** | Stimulates secretion of epinephrine/norepinephrine | No direct effect |

* **The Sympathetic Division:** Corresponds to arousal and energy generation (the "fight-or-flight" response). It prepares the body for intense physical activity in response to stress or danger.
* **The Parasympathetic Division:** Promotes calming and a return to self-maintenance functions (the "rest-and-digest" response). It conserves energy, lowers the heart rate, and enhances digestion.

## 22.5 Principles of Endocrine Signaling and Hormone Action

While the nervous system enables rapid, pinpoint communication, the **endocrine system** provides a slower, longer-lasting, and globally broadcast method of regulation. The endocrine system consists of glands, tissues, and cells that secrete hormones—chemical messengers that travel through the bloodstream to coordinate processes such as growth, development, metabolism, and reproduction.

Nervous and endocrine signaling are not entirely separate; they interact constantly. In fact, some neurons (neurosecretory cells) release signaling molecules directly into the blood, bridging the two systems.

### Modes of Chemical Signaling

Communication between cells is classified by the route the signal takes and the target cell it affects.

* **Endocrine Signaling:** Secreted molecules (hormones) diffuse into the bloodstream and trigger responses in target cells anywhere in the body.
* **Paracrine Signaling:** Secreted molecules diffuse locally through the extracellular fluid, triggering a response in neighboring cells.
* **Autocrine Signaling:** Secreted molecules diffuse locally and trigger a response in the very cell that secreted them.
* **Synaptic Signaling:** Neurotransmitters diffuse across synapses to trigger responses in cells of target tissues (neurons, muscles, or glands).
* **Neuroendocrine Signaling:** Neurohormones diffuse into the bloodstream from nerve endings and trigger responses in target cells elsewhere in the body.

### Chemical Classes of Hormones

Hormones vary widely in their molecular structure, which directly dictates how they interact with their target cells. Vertebrate hormones generally fall into three chemical classes:

1. **Polypeptides:** Chains of amino acids (e.g., insulin, glucagon). These are water-soluble (hydrophilic).
2. **Steroids:** Lipids synthesized from cholesterol (e.g., testosterone, cortisol). These are lipid-soluble (hydrophobic).
3. **Amines:** Synthesized from single amino acids like tyrosine or tryptophan (e.g., epinephrine, thyroxine). Amines can be either water-soluble or lipid-soluble, depending on their specific structure.

### Cellular Response Pathways: Solubility Determines Mechanism

The solubility of a hormone determines its journey from secretion to cellular response.

**Water-Soluble Hormones (Hydrophilic)**
Because they cannot cross the hydrophobic core of the plasma membrane, water-soluble hormones are secreted by exocytosis, travel freely in the bloodstream, and bind to **cell-surface receptors** on target cells.
Binding initiates a **signal transduction pathway**—a series of changes in cellular proteins that converts the extracellular chemical signal to a specific intracellular response. This often involves a second messenger, such as cyclic AMP (cAMP), and leads to a rapid cytoplasmic response, such as the activation of an enzyme, or a change in gene transcription.

**Lipid-Soluble Hormones (Hydrophobic)**
Lipid-soluble hormones diffuse freely out of the secretory cell. Because they are insoluble in blood plasma, they must bind to transport proteins to travel through the bloodstream. Upon reaching a target cell, they slip easily across the plasma membrane and bind to **intracellular receptors** located in the cytoplasm or nucleus. The hormone-receptor complex typically acts as a transcription factor, directly regulating gene expression. This process is generally slower but results in longer-lasting physiological changes.

```text
    WATER-SOLUBLE HORMONE                  LIPID-SOLUBLE HORMONE
    (e.g., Epinephrine)                    (e.g., Cortisol)
          |                                       |
    [Travels freely in blood]              [Bound to transport protein]
          |                                       |
          V                                       V
    [Extracellular Fluid]                 [Extracellular Fluid]
          |                                       |
    [Receptor on Membrane]-----------------[Plasma Membrane]
          |                                       | (Diffuses through)
    [Second Messenger]                            V
      (e.g., cAMP)                       [Intracellular Receptor]
          |                                       |
          V                                       V
    [Signal Transduction Cascade]          [Receptor-Hormone Complex]
          |                                       | (Enters Nucleus)
          V                                       V
    [Cytoplasmic Response /                [Gene Transcription &
     Altered Gene Expression]               Protein Synthesis]

```

### Multiple Effects of a Single Hormone

A single hormone can elicit vastly different responses in different target cells. This versatility depends on two factors:

1. The specific receptor for the hormone on or in the target cell.
2. The signal transduction pathways and effector proteins present inside the target cell.

For example, epinephrine (adrenaline) prepares the body for sudden action. When it binds to beta-receptors on liver cells, it triggers the breakdown of glycogen into glucose to fuel the body. When it binds to the exact same beta-receptors on the smooth muscle cells lining blood vessels of skeletal muscle, it causes the vessels to dilate, increasing blood flow. Yet, when it binds to alpha-receptors on blood vessels supplying the intestines, the vessels constrict, diverting blood away from the digestive system.

### The Hypothalamus and Pituitary Gland: The Master Regulators

The structural and functional intersection of the nervous and endocrine systems is located in the brain, at the **hypothalamus** and the **pituitary gland**.

The hypothalamus receives information from nerves throughout the body and initiates appropriate neuroendocrine signaling. Attached to its base is the pituitary gland, which has two distinct lobes:

* **The Posterior Pituitary:** An extension of the hypothalamus. It does not synthesize its own hormones. Instead, it stores and secretes two neurohormones made in the hypothalamus: **oxytocin** (which regulates milk secretion and uterine contractions) and **antidiuretic hormone (ADH)** (which regulates kidney function and water retention).
* **The Anterior Pituitary:** A distinct endocrine gland that synthesizes and secretes a diverse set of hormones. Its activity is strictly controlled by *releasing hormones* and *inhibiting hormones* secreted by the hypothalamus. Many anterior pituitary hormones are **tropic hormones**—hormones that have other endocrine glands as their targets (e.g., Thyroid-Stimulating Hormone, TSH, which prompts the thyroid gland to release thyroid hormone).

Through negative feedback loops, the products of these downstream glands ultimately inhibit the hypothalamus and anterior pituitary, maintaining hormonal balance and physiological homeostasis.

## Chapter Summary

* **Neurons** are specialized cells consisting of a cell body, dendrites for receiving signals, and an axon for transmitting signals. They are supported by various **glial cells** that maintain the chemical environment and provide myelin insulation.
* The **resting potential** (typically -70 mV) is an electrical gradient across the neuron's membrane, established by the sodium-potassium pump and selective ion leak channels.
* **Action potentials** are rapid, all-or-none depolarizations generated by voltage-gated ion channels. They propagate unidirectionally down the axon, a process greatly accelerated by myelin through saltatory conduction.
* Communication between cells occurs at **synapses**. At chemical synapses, action potentials trigger the exocytosis of **neurotransmitters**, which diffuse across the synaptic cleft, bind to postsynaptic receptors, and generate excitatory or inhibitory potentials.
* The vertebrate nervous system is divided into the **Central Nervous System (CNS)**, which integrates information, and the **Peripheral Nervous System (PNS)**, which transmits sensory input and motor output. The autonomic branch of the PNS maintains homeostasis via the antagonistic actions of its sympathetic and parasympathetic divisions.
* The **endocrine system** works alongside the nervous system, utilizing **hormones** to coordinate long-term physiological changes. Water-soluble hormones trigger rapid signaling cascades via cell-surface receptors, while lipid-soluble hormones alter gene expression via intracellular receptors. The hypothalamus and pituitary gland act as the primary neuroendocrine control center for the body.
