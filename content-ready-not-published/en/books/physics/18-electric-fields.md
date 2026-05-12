In Part I, we explored the macroscopic world governed by gravity and contact forces. We now turn to the fundamental interaction responsible for the structure of atoms, the properties of materials, and the foundation of modern technology: the electromagnetic force. This chapter introduces electrostatics—the study of electric charges at rest. We will examine the microscopic nature of electric charge, quantify the immense forces these isolated charges exert on one another using Coulomb's Law, and introduce the powerful concept of the electric field, a framework that entirely revolutionizes how we understand physical forces acting across empty space.

## 18.1 Electric Charge and Conservation

The electromagnetic force is one of the four fundamental forces of nature, responsible for the structure of atoms, the behavior of chemical reactions, and the properties of the materials we interact with daily. At the heart of electromagnetic phenomena is a fundamental property of matter known as **electric charge**.

### The Two Types of Charge

Through a series of simple experiments, such as rubbing a glass rod with silk or a plastic rod with fur, early physicists discovered that objects could acquire an "electrified" state. Observations of these electrified objects led to a fundamental rule of electrostatics:

> **Law of Charges:** Like charges repel each other, and opposite charges attract each other.

Benjamin Franklin (1706–1790) arbitrarily, but universally, named these two types of charges **positive** and **negative**. When a glass rod is rubbed with silk, the glass becomes positively charged and the silk becomes negatively charged.

```text
Interactions between charged spheres:

  (+) <---> (+)         (-) <---> (-)         (+) >---< (-)
    Repulsion             Repulsion             Attraction

```

### The Atomic Perspective

To understand the origin of electric charge, we must look at the structure of the atom. Atoms consist of a dense central nucleus containing positively charged **protons** and electrically neutral **neutrons**. Surrounding the nucleus is a cloud of much lighter, negatively charged **electrons**.

* **Proton:** Charge $+e$
* **Electron:** Charge $-e$
* **Neutron:** Charge $0$

In a macroscopic object, the number of protons generally equals the number of electrons, making the object electrically neutral overall. An object becomes charged only when there is an imbalance in these numbers. This imbalance occurs almost exclusively through the transfer of electrons, as protons are tightly bound within the nucleus. Removing electrons from an object leaves it with a net positive charge, while adding electrons gives it a net negative charge.

### Quantization of Charge

In 1909, Robert Millikan's famous oil-drop experiment demonstrated that electric charge is not continuous but exists in discrete packets. This means that electric charge is **quantized**. Any observable amount of electric charge $q$ must be an integer multiple of the fundamental unit of charge, $e$:

$$q = \pm ne$$

where $n = 0, 1, 2, 3, \dots$ and the fundamental charge $e$ has an accepted SI value of:

$$e \approx 1.602 \times 10^{-19} \text{ C}$$

The SI unit of charge is the **Coulomb (C)**. Because $e$ is incredibly small, a macroscopic charge of $1\text{ C}$ represents an enormous number of electrons (approximately $6.24 \times 10^{18}$ electrons). Therefore, everyday static charges are often measured in microcoulombs ($\mu\text{C}$) or nanocoulombs ($\text{nC}$).

*Note: While modern physics has revealed that quarks (the fundamental constituents of protons and neutrons) possess fractional charges of $\pm e/3$ or $\pm 2e/3$, they are never found isolated in nature due to color confinement. Thus, any freely observable macroscopic or microscopic charge remains an integer multiple of $e$.*

### Conservation of Electric Charge

Just as energy and linear momentum are conserved in isolated systems (as established in Part I of this text), electric charge obeys a strict conservation law.

> **The Law of Conservation of Electric Charge:** The algebraic sum of all the electric charges in any closed system is constant. Charge can be transferred from one object to another, but it cannot be created or destroyed.

When we rub a glass rod with silk, we do not create charge out of nothing. Instead, the mechanical work of friction provides the energy to strip a certain number of electrons from the surface atoms in the glass and transfer them to the silk. If the glass loses $10^{10}$ electrons, it acquires a charge of $+10^{10}e$. Simultaneously, the silk gains those exact $10^{10}$ electrons, acquiring a charge of $-10^{10}e$. The net change in charge for the isolated glass-silk system is strictly zero:

$$Q_{\text{initial}} = 0 \text{ C}$$

$$Q_{\text{final}} = (+10^{10}e) + (-10^{10}e) = 0 \text{ C}$$

This conservation law extends far beyond macroscopic friction to the fundamental realm of particle and nuclear physics. For example, in radioactive beta decay (which we will explore further in Chapter 30), a neutral neutron ($n^0$) transforms into a proton ($p^+$) and an electron ($e^-$), along with an uncharged antineutrino ($\bar{\nu}_e$):

$$n^0 \rightarrow p^+ + e^- + \bar{\nu}_e$$

Before the decay, the total charge of the isolated neutron is $0$. After the decay, the sum of the charges of the resulting particles is $(+e) + (-e) + 0 = 0$. The total charge of the universe, or any isolated sub-system within it, remains perfectly constant across all known physical processes.

## 18.2 Conductors, Insulators, and Induced Charges

While the law of conservation of charge dictates that the total charge in an isolated system remains constant, the way charge behaves *within* a specific material depends entirely on the material's atomic structure. Materials are generally classified into two broad categories based on their ability to allow electric charge to flow: conductors and insulators.

### Conductors and Insulators

**Conductors** are materials in which electric charges can move freely. The most common macroscopic conductors are metals, such as copper, aluminum, and silver.

In a solid metal, the outermost (valence) electrons of the atoms are only weakly bound to their respective nuclei. When atoms form a metallic solid, these outer electrons detach from their parent atoms and form a "sea of electrons" that wanders freely throughout the entire volume of the material. If a net charge is placed on a conductor, the mutual repulsion of the like charges will cause them to redistribute instantly, pushing them as far apart as possible until they reside entirely on the outer surface of the material.

**Insulators**, on the other hand, are materials in which electric charges cannot move freely. Common insulators include rubber, glass, wood, and dry air.

In an insulator, all electrons are tightly bound to their parent atoms or molecules. There is no sea of free electrons. If you rub a glass rod with silk to place a positive charge on it, that positive charge remains localized strictly at the location of the rubbing. The charge does not spread out over the surface of the rod because the electrons within the glass cannot flow to neutralize the localized positive regions.

*Note on Modern Materials: The boundary between conductors and insulators is not absolute. **Semiconductors** (like silicon and germanium) have electrical properties intermediate between those of conductors and insulators, and their conductivity can be precisely controlled by adding impurities—a property that forms the foundation of modern electronics. **Superconductors** are materials that, below a certain critical temperature, exhibit exactly zero electrical resistance, allowing charges to move without any loss of energy.*

### Charging by Conduction

When a charged object makes physical contact with a neutral conductor, charge is transferred between them. This process is called **charging by conduction**.

Imagine a negatively charged metal sphere (possessing excess electrons) brought into contact with a neutral metal sphere. The excess electrons on the charged sphere violently repel one another. Upon contact, the conductive path allows some of these electrons to escape onto the neutral sphere. If the two spheres are identical in size and shape, the electrons will distribute themselves evenly until the repulsive forces are balanced. If the initial charge was $-Q$, after separation, each identical sphere will hold a charge of $-Q/2$.

### Charging by Induction

It is also possible to charge a conductor without making any direct physical contact. This process, known as **charging by induction**, utilizes the free movement of electrons within a conductor in response to an external electric field.

Consider the process of charging a single metal sphere by induction using a grounding wire:

```text
Step 1: Neutral Conductor     Step 2: Rod Approaches        Step 3: Grounding
                               (Polarization occurs)         (Electrons repelled to ground)

      _ _ _                             _ _ _                         _ _ _
    /       \         (-)             / +   - \         (-)         / +     \      (-)
   |  + - +  |      --------         |  +   -  |      --------     |  +      |--- --------
   |  - + -  |      | -  - |         |  +   -  |      | -  - |     |  +      |  | | -  - |
    \ _ _ _ /       --------          \ _ + _ /       --------      \ _ + _ /   | --------
        |                                 |                             |       |
       ===                               ===                           ===   Ground 

```

1. **Neutral State:** A metal sphere is electrically neutral; its positive and negative charges are uniformly distributed.
2. **Polarization:** A negatively charged rod is brought close to (but not touching) the sphere. The free electrons in the metal are repelled to the far side of the sphere, leaving the near side with a net positive charge. The sphere is now *polarized*, though its net charge is still zero.
3. **Grounding:** A conducting wire connects the sphere to the Earth (a massive reservoir that can accept or supply an unlimited number of electrons). The repelled electrons on the far side of the sphere are pushed down the grounding wire into the Earth.
4. **Charging Complete:** The grounding wire is removed *before* the charged rod is taken away. The sphere now has a deficit of electrons. Once the negatively charged rod is finally removed, the remaining positive charge redistributes itself evenly over the sphere's surface. The sphere has been charged positively by induction.

### Induced Charges in Insulators (Polarization)

We know that a negatively charged balloon can stick to a neutral wooden wall. Since wood is an insulator, it does not have free electrons that can flow to the other side of the wall. How, then, does the attractive force arise?

The answer lies in **molecular polarization**. Even though the electrons in an insulator cannot migrate freely, the electron cloud of each individual atom or molecule can be slightly distorted by a nearby charge.

```text
   (-) Charged Balloon           Neutral Wall (Insulator)
                             Molecules stretch and polarize
      _ _ _ _ _              --------------------------------
    /           \            |  (+ -)  (+ -)  (+ -)  (+ -)  |
   |   -  -  -   |           |                              |
   |   -  -  -   |           |  (+ -)  (+ -)  (+ -)  (+ -)  |
    \ _ _ _ _ _ /            --------------------------------

```

When the negatively charged balloon is brought near the wall, it repels the electron clouds of the wall's surface atoms, pushing the negative charge center slightly away while pulling the positive nucleus slightly closer. This induces a layer of positive charge on the immediate surface of the wall and a corresponding layer of negative charge slightly deeper inside.

Because the induced positive charge layer is physically closer to the negative balloon than the induced negative layer, the attractive electrostatic force dominates over the repulsive force (a consequence of Coulomb's Law, which we will formally define in the next section). This net attractive force allows the balloon to stick to the neutral wall.

## 18.3 Coulomb's Law

In 1785, the French physicist Charles-Augustin de Coulomb systematically investigated the electric force between charged particles. Using a highly sensitive torsion balance—similar to the one Henry Cavendish would later use to measure the gravitational constant—Coulomb measured how the electric force varies with both the magnitude of the charges and the distance separating them. His findings culminated in what is now known as **Coulomb's Law**.

### The Scalar Form of Coulomb's Law

Coulomb discovered that the magnitude of the electrostatic force $F_e$ between two point charges is directly proportional to the product of the magnitudes of the charges and inversely proportional to the square of the distance between them.

Expressed mathematically, the magnitude of the force is:

$$F_e = k_e \frac{|q_1 q_2|}{r^2}$$

where:

* $q_1$ and $q_2$ are the values of the two point charges.
* $r$ is the distance separating the two charges.
* $k_e$ is a proportionality constant known as the **Coulomb constant**.

In SI units, the charge is measured in Coulombs (C) and the distance in meters (m), which means the force is measured in Newtons (N). The experimentally determined value of the Coulomb constant is exactly:

$$k_e = \frac{1}{4\pi\epsilon_0} \approx 8.9876 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2$$

For most practical calculations, $k_e$ is often approximated as $8.99 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2$. The constant $\epsilon_0$ (Greek letter epsilon with a zero subscript) is called the **permittivity of free space**, and it represents the capability of a vacuum to permit electric fields. Its value is:

$$\epsilon_0 = 8.8542 \times 10^{-12} \text{ C}^2/(\text{N}\cdot\text{m}^2)$$

Using $\epsilon_0$, Coulomb's Law is frequently written in the equivalent form:

$$F_e = \frac{1}{4\pi\epsilon_0} \frac{|q_1 q_2|}{r^2}$$

### The Vector Form of Coulomb's Law

Because force is a vector quantity, it possesses both magnitude and direction. The direction of the electrostatic force is determined by the rule established in Section 18.1: like charges repel, and opposite charges attract. The force is always directed along the straight line connecting the two charges (it is a *central force*).

```text
Interaction of Point Charges:

Like Charges (Repulsion):
      F_21                       r                      F_12
  <--------- (+) --------------------------------- (+) --------->
             q_1                                   q_2

Opposite Charges (Attraction):
                 F_21            r            F_12
           (+) --------->                 <--------- (-)
           q_1                                       q_2

```

We can express Coulomb's Law in a strict vector notation. Let $\mathbf{F}_{12}$ be the force exerted *by* charge $q_1$ *on* charge $q_2$. We define a unit vector $\hat{\mathbf{r}}_{12}$ that points outward from $q_1$ toward $q_2$:

$$\mathbf{F}_{12} = k_e \frac{q_1 q_2}{r^2} \hat{\mathbf{r}}_{12}$$

In this vector equation, we do not use absolute value signs for the charges.

* If $q_1$ and $q_2$ have the same sign (both positive or both negative), their product is positive. The force $\mathbf{F}_{12}$ is in the same direction as $\hat{\mathbf{r}}_{12}$, meaning $q_2$ is pushed away from $q_1$ (repulsion).
* If $q_1$ and $q_2$ have opposite signs, their product is negative. The force $\mathbf{F}_{12}$ points in the opposite direction of $\hat{\mathbf{r}}_{12}$, meaning $q_2$ is pulled toward $q_1$ (attraction).

By Newton's Third Law, the force exerted by $q_2$ on $q_1$, denoted as $\mathbf{F}_{21}$, is equal in magnitude but opposite in direction to $\mathbf{F}_{12}$:

$$\mathbf{F}_{21} = -\mathbf{F}_{12}$$

### The Principle of Superposition

Coulomb's Law describes the interaction between exactly two point charges. However, most real-world situations involve systems with many charges. To find the net electric force on a specific charge due to a collection of other charges, we use the **Principle of Superposition**.

The superposition principle states that when a number of charges interact, the total electrostatic force on any given charge is the vector sum of the individual forces exerted on it by all the other individual charges.

If we have a system of charges $q_1, q_2, q_3, \dots, q_n$, the net force $\mathbf{F}_1$ exerted on $q_1$ by all the other charges is:

$$\mathbf{F}_1 = \mathbf{F}_{21} + \mathbf{F}_{31} + \mathbf{F}_{41} + \dots + \mathbf{F}_{n1}$$

$$\mathbf{F}_1 = \sum_{i=2}^n \mathbf{F}_{i1} = \sum_{i=2}^n k_e \frac{q_i q_1}{r_{i1}^2} \hat{\mathbf{r}}_{i1}$$

It is crucial to remember that this is a *vector* addition, not a simple scalar addition. You must resolve each individual force vector into its $x$, $y$, and $z$ components before summing them to find the net force.

### Coulomb's Law vs. Newton's Law of Universal Gravitation

You may notice a striking mathematical similarity between Coulomb's Law and Newton's Law of Universal Gravitation ($F_g = G \frac{m_1 m_2}{r^2}$). Both are inverse-square laws, meaning the force drops off rapidly as the distance increases. However, there are two critical differences:

1. **Direction:** The gravitational force is strictly attractive, as mass is always positive. The electrostatic force can be either attractive or repulsive, depending on the signs of the interacting charges.
2. **Relative Strength:** The electrostatic force is immensely stronger than the gravitational force. The Coulomb constant ($k_e \approx 10^9$) is significantly larger than the gravitational constant ($G \approx 10^{-11}$). For example, the electrostatic repulsion between two protons is approximately $10^{36}$ times stronger than their mutual gravitational attraction. Gravity dominates on a macroscopic, planetary scale only because most large objects are electrically neutral, causing the immense electric forces to cancel out.

## 18.4 The Electric Field and Field Lines

Coulomb's Law provides a mathematical description of the force between two charges, but it introduces a conceptual puzzle: how does one charge "know" the other charge is there? This is the problem of *action at a distance*. To resolve this, physicists—most notably Michael Faraday—introduced the concept of a **field**.

Instead of thinking of charge $A$ exerting a force directly on charge $B$ across empty space, we say that charge $A$ alters the properties of the space around it, creating an **electric field**. When charge $B$ is placed in that space, it interacts locally with the electric field at its location, and this interaction produces the electric force.

### Defining the Electric Field

To define the electric field at a specific point in space, we imagine placing a small, positive **test charge** ($q_0$) at that point. We require this test charge to be infinitesimally small so that its own electric field does not disturb the arrangement of the source charges creating the field we are trying to measure.

If the test charge experiences an electric force $\mathbf{F}_e$, the electric field $\mathbf{E}$ at that location is defined as the electric force per unit charge:

$$\mathbf{E} \equiv \frac{\mathbf{F}_e}{q_0}$$

The electric field is a vector field. Its direction at any point is the direction of the electric force that would be exerted on a small *positive* test charge placed at that point.

From this definition, the SI unit for the electric field is Newtons per Coulomb (N/C).

Once the electric field at a point is known, the force on *any* charge $q$ placed at that point can be easily calculated:

$$\mathbf{F}_e = q\mathbf{E}$$

Notice that if $q$ is positive, the force is in the same direction as the field. If $q$ is negative, the force is in the opposite direction to the field.

### The Electric Field of a Point Charge

We can use Coulomb's Law to find the electric field generated by a single point charge $q$ (the source charge). If we place a positive test charge $q_0$ at a distance $r$ from $q$, the magnitude of the force on the test charge is $F_e = k_e |q q_0| / r^2$.

Dividing by $q_0$, we find the magnitude of the electric field created by the point charge $q$:

$$E = k_e \frac{|q|}{r^2}$$

In vector notation, the electric field is:

$$\mathbf{E} = k_e \frac{q}{r^2} \hat{\mathbf{r}}$$

where $\hat{\mathbf{r}}$ is a unit vector pointing radially outward from the source charge $q$. If $q$ is positive, $\mathbf{E}$ points radially outward away from the charge. If $q$ is negative, $\mathbf{E}$ points radially inward toward the charge.

Because electric forces obey the Principle of Superposition, electric fields do as well. The total electric field at a point due to a group of source charges is simply the vector sum of the individual electric fields created by each charge at that point:

$$\mathbf{E}_{\text{total}} = \sum_{i} \mathbf{E}_i = \sum_{i} k_e \frac{q_i}{r_i^2} \hat{\mathbf{r}}_i$$

### Electric Field Lines

To visualize the electric field, which is invisible, Michael Faraday introduced the concept of **electric field lines** (sometimes called lines of force). These are imaginary curves drawn through space that provide a map of the electric field.

There are four primary rules for drawing and interpreting electric field lines:

1. **Direction:** The electric field vector $\mathbf{E}$ is tangent to the electric field line at any point. The arrows on the lines indicate the direction of the field (the direction a positive test charge would be pushed).
2. **Origins and Terminations:** Field lines must begin on positive charges and end on negative charges. In the case of an excess of one type of charge, some lines will begin or end infinitely far away.
3. **Magnitude (Density):** The number of field lines per unit area passing perpendicular to the lines is proportional to the magnitude of the electric field in that region. Therefore, the field is stronger where the lines are drawn closer together, and weaker where they are farther apart.
4. **No Crossing:** Two electric field lines can never cross. If they did, it would imply that the electric field has two different directions at the point of intersection, which is physically impossible.

### Visualizing Common Charge Distributions

Using these rules, we can map out the electric fields for several fundamental charge configurations.

**1. Isolated Point Charges:**
For an isolated positive charge, the lines radiate outward symmetrically in all directions. For an isolated negative charge, the lines converge inward. As you move further from the charge, the lines naturally spread out, representing the inverse-square decrease in field strength ($1/r^2$).

```text
   Isolated Positive Charge          Isolated Negative Charge

        \     |     /                     \     |     /
         \    |    /                       \    |    /
          v   v   v                         v   v   v
      <---   (+)   --->                 --->   (-)   <---
          ^   ^   ^                         ^   ^   ^
         /    |    \                       /    |    \
        /     |     \                     /     |     \

```

**2. The Electric Dipole:**
An electric dipole consists of two point charges of equal magnitude but opposite sign, separated by a distance. The field lines originate on the positive charge and terminate on the negative charge, creating a distinct curved pattern. The field is strongest in the space directly between the two charges.

```text
                     Electric Dipole

                   . - - - - - > - - - - - .
                 /                           \
               /                               \
             |/                                 v|
            (+) --------------->--------------- (-)
             |\                                 ^|
               \                               /
                 \                           /
                   * - - - - - > - - - - - *

```

**3. Two Equal Positive Charges:**
When two like charges are placed near each other, their field lines repel one another. In the exact center between the two identical charges, the electric fields from each charge cancel out perfectly, creating a point where the net electric field is zero.

```text
                 Two Equal Positive Charges
       
        \   |   /                 \   |   /
         \  |  /                   \  |  /
      <--  (+)  .                 .  (+)  -->
         /  |  \                   /  |  \
        /   |   \                 /   |   \
                  \             /
                    v         v

```

## 18.5 Electric Fields of Continuous Charge Distributions

Up to this point, we have calculated the electric field produced by discrete point charges using the principle of superposition ($\mathbf{E}_{\text{total}} = \sum \mathbf{E}_i$). However, in many macroscopic applications, the charge is distributed over a line, a surface, or a volume. Because macroscopic objects contain an enormous number of fundamental charges, it is mathematically impractical—and largely unnecessary—to sum the individual fields of every single electron or proton. Instead, we treat the charge as being spread continuously over the object.

### The Integral Formulation

To calculate the electric field of a continuous charge distribution, we divide the charged object into infinitesimal elements of charge, denoted as $dq$. Each element is so small that it can be treated as a point charge.

The infinitesimal electric field $d\mathbf{E}$ produced by the charge element $dq$ at a point $P$ is given by Coulomb's Law:

$$d\mathbf{E} = k_e \frac{dq}{r^2} \hat{\mathbf{r}}$$

where $r$ is the distance from the charge element $dq$ to point $P$, and $\hat{\mathbf{r}}$ is a unit vector pointing from $dq$ toward $P$.

To find the total electric field $\mathbf{E}$ at point $P$, we apply the superposition principle by integrating over the entire continuous charge distribution:

$$\mathbf{E} = k_e \int \frac{dq}{r^2} \hat{\mathbf{r}}$$

Because this is a vector integral, we generally must evaluate it by breaking $d\mathbf{E}$ into its Cartesian components ($dE_x$, $dE_y$, $dE_z$) and integrating each component separately:

$$E_x = k_e \int \frac{dq}{r^2} \cos\theta_x \quad ; \quad E_y = k_e \int \frac{dq}{r^2} \cos\theta_y \quad ; \quad E_z = k_e \int \frac{dq}{r^2} \cos\theta_z$$

### Charge Densities

To perform the integration, the charge element $dq$ must be expressed in terms of the spatial coordinates. We do this by defining charge densities based on how the charge is distributed across the geometry of the object. We assume uniform distributions unless specified otherwise.

| Distribution Type | Symbol | Definition | Differential Form | SI Unit |
| --- | --- | --- | --- | --- |
| **Linear** (along a line/curve) | $\lambda$ | $\lambda = \frac{Q}{L}$ | $dq = \lambda \, dl$ | C/m |
| **Surface** (over an area) | $\sigma$ | $\sigma = \frac{Q}{A}$ | $dq = \sigma \, dA$ | C/m$^2$ |
| **Volume** (throughout a space) | $\rho$ | $\rho = \frac{Q}{V}$ | $dq = \rho \, dV$ | C/m$^3$ |

* For a thin charged rod along the x-axis, the length element is $dl = dx$, so $dq = \lambda \, dx$.
* For a charged disk in the xy-plane, an area element might be a thin ring of radius $r$ and width $dr$, so $dA = 2\pi r \, dr$, and $dq = \sigma(2\pi r) \, dr$.

### Strategy for Evaluating Continuous Electric Fields

Solving continuous charge problems generally follows a systematic set of steps:

1. **Define a Coordinate System:** Place the origin in a location that exploits the symmetry of the charge distribution (e.g., the center of a ring or the midpoint of a line).
2. **Identify Symmetry:** Look for components of the electric field that will cancel out. If the top half of a distribution produces a downward y-component and the bottom half produces an equal upward y-component, you can state $E_y = 0$ by symmetry and avoid integrating that component.
3. **Express $dq$:** Write $dq$ in terms of the appropriate charge density ($\lambda$, $\sigma$, or $\rho$) and spatial variables.
4. **Determine $r$ and $d\mathbf{E}$:** Express the distance $r$ and the relevant trigonometric functions (like $\cos\theta$) in terms of your integration variables using geometry.
5. **Integrate:** Set the appropriate geometric limits for the integral and solve.

### Example: The Electric Field of a Uniform Ring of Charge

Let us apply this strategy to find the electric field on the central axis of a uniformly charged ring.

Consider a ring of radius $a$ carrying a total positive charge $Q$, uniformly distributed. We want to find the electric field at a point $P$ lying on the central axis (the z-axis) at a distance $z$ from the center of the ring.

```text
               y (Ring lies in xy-plane)
               ^
          dq   |
          [=]--|----------
           |   |          \
         a |   |           \ r = \sqrt{a^2 + z^2}
           |   |            \
   --------+---+-------------*---------> z (central axis)
           |   |             P \  \theta
           |   |                \
           |   |                 v dE
               |                  \
                                   dE_z (along axis)

```

**Step 1 & 2: Symmetry**
Consider an infinitesimal charge element $dq$ at the top of the ring. It produces an electric field $d\mathbf{E}$ at point $P$ pointing diagonally downward and to the right. This vector can be resolved into a component along the z-axis ($dE_z$) and a component perpendicular to the axis ($dE_\perp$).

For every element $dq$ at the top of the ring, there is an identical element $dq$ at the exact bottom of the ring. The $dE_\perp$ from the bottom element will point upward, perfectly canceling the downward $dE_\perp$ from the top element. Therefore, by symmetry, the total perpendicular field is zero ($\int dE_\perp = 0$). We only need to evaluate the axial component, $E_z$.

**Step 3 & 4: Expressing the Variables**
From the geometry of the right triangle formed by $a$, $z$, and $r$, the distance from any charge element $dq$ on the ring to point $P$ is constant:

$$r = \sqrt{a^2 + z^2}$$

The component of the field along the z-axis is $dE_z = dE \cos\theta$. From the diagram, the angle $\theta$ is the same for all elements $dq$, and its cosine is:

$$\cos\theta = \frac{z}{r} = \frac{z}{\sqrt{a^2 + z^2}}$$

**Step 5: Integration**
We substitute these expressions into our integral for $E_z$:

$$E_z = \int dE \cos\theta = \int \left( k_e \frac{dq}{r^2} \right) \left( \frac{z}{r} \right) = k_e \int \frac{z \, dq}{r^3}$$

$$E_z = k_e \int \frac{z \, dq}{(a^2 + z^2)^{3/2}}$$

Because $z$ and $a$ are constants for a specific point $P$, the entire fraction can be pulled out of the integral:

$$E_z = \frac{k_e z}{(a^2 + z^2)^{3/2}} \int dq$$

The integral $\int dq$ is simply the sum of all the infinitesimal charges around the ring, which is the total charge $Q$. Therefore, the final electric field on the axis of the ring is:

$$\mathbf{E} = \frac{k_e Q z}{(a^2 + z^2)^{3/2}} \hat{\mathbf{k}}$$

*(Note: At distances far away from the ring where $z \gg a$, the $a^2$ term in the denominator becomes negligible, and the equation simplifies to $\mathbf{E} \approx k_e Q / z^2 \hat{\mathbf{k}}$. The ring behaves exactly like a point charge from a great distance, which is a useful logical check for our result.)*

## 18.6 Motion of Charged Particles in a Uniform Electric Field

When a charged particle is placed in an electric field, it experiences an electrostatic force. If the electric field is uniform—meaning it has the same magnitude and direction everywhere within a given region—the force exerted on the particle will be constant. This scenario allows us to perfectly merge the principles of electrostatics with the classical kinematics and Newtonian mechanics we developed in Part I of this text.

### Acceleration of a Charged Particle

According to our definition of the electric field, the force $\mathbf{F}_e$ on a particle with charge $q$ in an electric field $\mathbf{E}$ is:

$$\mathbf{F}_e = q\mathbf{E}$$

If the electrostatic force is the only significant force acting on the particle (often the case, as gravitational forces on subatomic particles are negligible compared to electric forces), it represents the net force. We can then apply Newton's Second Law of Motion ($\mathbf{F}_{\text{net}} = m\mathbf{a}$):

$$m\mathbf{a} = q\mathbf{E}$$

Solving for the acceleration $\mathbf{a}$ of the particle yields:

$$\mathbf{a} = \frac{q\mathbf{E}}{m}$$

This fundamental equation reveals several key insights:

1. **Constant Acceleration:** Because $q$, $m$, and $\mathbf{E}$ are all constants in a uniform field, the acceleration $\mathbf{a}$ is strictly constant. This means all the kinematic equations for constant acceleration (from Chapter 2) can be applied directly.
2. **Direction:** If the charge $q$ is positive, the acceleration is in the exact same direction as the electric field. If $q$ is negative, the acceleration is in the opposite direction of the field.
3. **Charge-to-Mass Ratio:** The acceleration depends directly on the particle's charge-to-mass ratio ($q/m$). An electron, having a much smaller mass than a proton, will experience a vastly greater acceleration in the same electric field, even though the magnitudes of their charges are identical.

### Case 1: Motion Parallel to the Electric Field

If a charged particle is released from rest in a uniform electric field, or if its initial velocity is parallel (or anti-parallel) to the field lines, it will move in a straight line. This is a purely one-dimensional kinematics problem.

For example, imagine an electron (charge $-e$, mass $m_e$) released from rest in a uniform electric field pointing in the $+x$ direction.

Because the charge is negative, the force and resulting acceleration point in the $-x$ direction:

$$a_x = -\frac{eE}{m_e}$$

We can use the standard kinematic equations to find its velocity or position at any time $t$:

$$v_x(t) = v_{0x} + a_x t = 0 - \left(\frac{eE}{m_e}\right)t$$

$$x(t) = x_0 + v_{0x}t + \frac{1}{2}a_x t^2 = x_0 - \frac{1}{2}\left(\frac{eE}{m_e}\right)t^2$$

### Case 2: Motion Perpendicular to the Electric Field

A more complex and practical application occurs when a charged particle enters a uniform electric field with an initial velocity perpendicular to the field lines. This setup is classic: it describes the deflection of electron beams in cathode ray tubes (CRTs) and the steering of ink droplets in inkjet printers.

Consider two horizontal parallel metal plates. The top plate is positively charged and the bottom plate is negatively charged, creating a uniform, downward-pointing electric field $\mathbf{E}$ between them. A particle with positive charge $+q$ and mass $m$ enters the region between the plates with an initial horizontal velocity $v_0$.

```text
            +  +  +  +  +  +  +  +  +  +  +  +   (Positive Plate)
            |  |  |  |  |  |  |  |  |  |  |  |
            v  v  v  v  v  v  v  v  v  v  v  v   Electric Field (E)
      ^ y     
      |                                   _ - > v_final
+q    |                        _ - ~ ~ 
o --> |            _ - ~ ~ 
v_0   |  - ~ ~ 
      +---------------------------------------> x
            -  -  -  -  -  -  -  -  -  -  -  -   (Negative Plate)

```

We can analyze this two-dimensional motion by separating it into horizontal ($x$) and vertical ($y$) components, exactly as we did for projectile motion in a gravitational field (Chapter 3).

**Horizontal Motion ($x$-direction):**
There is no component of the electric field in the horizontal direction, so there is no horizontal force.

$$a_x = 0$$

Therefore, the horizontal velocity remains constant:

$$v_x = v_0$$

The horizontal displacement at any time $t$ is:

$$x = v_0 t$$

**Vertical Motion ($y$-direction):**
The electric field points in the $-y$ direction. For a positive charge, the force and acceleration are also in the $-y$ direction:

$$a_y = -\frac{qE}{m}$$

Assuming the particle enters at $y=0$ with no initial vertical velocity ($v_{0y} = 0$), the vertical displacement is:

$$y = \frac{1}{2}a_y t^2 = -\frac{1}{2}\left(\frac{qE}{m}\right)t^2$$

**The Trajectory:**
To find the shape of the particle's path, we can eliminate time $t$ from the equations. From the horizontal equation, we know $t = x/v_0$. Substituting this into the vertical equation gives:

$$y = -\frac{1}{2}\left(\frac{qE}{m}\right)\left(\frac{x}{v_0}\right)^2 = -\left(\frac{qE}{2mv_0^2}\right)x^2$$

Because the terms in the parentheses are all constants, this equation takes the form $y = -Cx^2$. This is the mathematical equation for a downward-opening **parabola**. Just as a mass thrown horizontally in Earth's gravity follows a parabolic trajectory, a charged particle entering a uniform electric field perpendicularly follows a parabolic trajectory.

---

## Chapter Summary

* **Electric Charge:** Charge is a fundamental property of matter. There are two types: positive and negative. Like charges repel; opposite charges attract. Charge is quantized in units of $e \approx 1.602 \times 10^{-19} \text{ C}$ and is strictly conserved in all isolated systems.
* **Conductors and Insulators:** Conductors contain free electrons that allow charge to flow easily. Insulators have tightly bound electrons and prevent the free flow of charge. Conductors can be charged by direct conduction or by induction (without direct contact).
* **Coulomb's Law:** The electrostatic force between two point charges is directly proportional to the product of their charges and inversely proportional to the square of the distance between them: $\mathbf{F}_{12} = k_e \frac{q_1 q_2}{r^2} \hat{\mathbf{r}}_{12}$, where $k_e \approx 8.99 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2$.
* **The Electric Field:** The electric field $\mathbf{E}$ at a point in space is defined as the electric force $\mathbf{F}_e$ acting on a positive test charge $q_0$ placed at that point, divided by the test charge: $\mathbf{E} = \frac{\mathbf{F}_e}{q_0}$. The field due to a point charge is $\mathbf{E} = k_e \frac{q}{r^2} \hat{\mathbf{r}}$.
* **Field Lines:** Electric field lines provide a visual map of the field. They originate on positive charges, terminate on negative charges, and never cross. The density of the lines indicates the field strength.
* **Continuous Charge Distributions:** The electric field of a continuous object is found by integrating the differential fields $d\mathbf{E}$ produced by infinitesimal charge elements $dq$: $\mathbf{E} = k_e \int \frac{dq}{r^2} \hat{\mathbf{r}}$. This requires using linear ($\lambda$), surface ($\sigma$), or volume ($\rho$) charge densities.
* **Motion in a Uniform Field:** A charged particle in a uniform electric field experiences constant acceleration $\mathbf{a} = \frac{q\mathbf{E}}{m}$. A particle entering the field perpendicularly follows a parabolic trajectory, governed by the same kinematic equations used for mechanical projectile motion.
