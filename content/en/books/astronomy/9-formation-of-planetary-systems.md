The birth of a planetary system is intimately tied to the formation of its host star. This chapter traces the journey from diffuse interstellar gas to mature planetary architectures. We begin by examining the gravitational collapse of Giant Molecular Clouds, which produces spinning protoplanetary disks. Within these dusty crucibles, we will follow the assembly of microscopic grains into massive planetesimals, bypassing physical hurdles via aerodynamic instabilities. Finally, we explore how planetary migration dynamically reshapes these nascent systems before the surrounding gas disk is ultimately blown away by stellar radiation.

## 9.1 Interstellar Clouds and Gravitational Collapse

The formation of any planetary system is inextricably linked to the birth of its host star. This dual genesis begins in the vast, cold expanses of the interstellar medium (ISM), specifically within regions known as Giant Molecular Clouds (GMCs). To understand how a diffuse cloud of gas and dust transforms into a structured planetary system, we must first examine the physical conditions of these clouds and the gravitational mechanics that dictate their collapse.

### Properties of Giant Molecular Clouds

Giant Molecular Clouds are the most massive objects within the galactic disk, containing between $10^4$ and $10^6$ solar masses ($M_\odot$) of material spanning tens to hundreds of parsecs across. Despite their immense mass, these clouds are incredibly diffuse by terrestrial standards, with typical densities ranging from $10^3$ to $10^6$ particles per cubic centimeter.

The composition of a GMC is predominantly molecular hydrogen ($H_2$) and helium, heavily enriched with microscopic solid particles known as interstellar dust (composed of silicates, carbonaceous compounds, and ices). This dust plays a critical role in the cloud's evolution: it shields the interior from high-energy galactic ultraviolet radiation, allowing molecules to form and survive, and it acts as a highly efficient radiator, emitting thermal energy into space at infrared wavelengths.

Because of this efficient cooling and the shielding effect of the dust, the interiors of GMCs are among the coldest environments in the universe, with temperatures hovering between $10$ K and $30$ K. It is this extreme cold that makes star and planet formation possible.

### The Jeans Criterion for Collapse

A molecular cloud exists in a delicate tug-of-war between two primary opposing forces: the inward pull of its own gravity and the outward push of thermal gas pressure. (Magnetic fields and internal turbulence also provide significant support against collapse, but thermal pressure and gravity are the fundamental baseline).

For a cloud to begin the process of star formation, gravity must overcome thermal pressure. The physical condition required for this to occur was first derived by British physicist Sir James Jeans in the early 20th century. Jeans determined that for a given temperature and density, there is a critical mass—known as the **Jeans Mass ($M_J$)**—above which a cloud will inevitably collapse under its own weight.

The Jeans Mass is derived by equating the gravitational potential energy of a spherical cloud with its internal kinetic (thermal) energy, leading to the following expression:

$$M_J \approx \left( \frac{5kT}{G\mu m_H} \right)^{3/2} \left( \frac{3}{4\pi\rho} \right)^{1/2}$$

Where:

* $k$ is the Boltzmann constant.
* $T$ is the absolute temperature of the cloud.
* $G$ is the universal gravitational constant.
* $\mu$ is the mean molecular weight of the gas (approximately 2.33 for a standard mix of molecular hydrogen and helium).
* $m_H$ is the mass of a hydrogen atom.
* $\rho$ is the mass density of the cloud.

The mathematical structure of the Jeans mass reveals a profound astronomical truth: $M_J$ is proportional to $T^{3/2}$ and inversely proportional to $\rho^{1/2}$. Therefore, gravitational collapse is most easily triggered in environments that are **extremely cold** and **highly dense**.

### Triggers of Collapse

While some regions of a GMC may reach the Jeans criterion spontaneously through random turbulent motions creating localized overdensities, collapse is frequently externally triggered. A stable cloud can be pushed over the edge into gravitational collapse by sudden compression, which increases its density ($\rho$) and lowers the local Jeans mass. Common triggering mechanisms include:

1. **Supernova Shockwaves:** The explosive death of a nearby massive star sends a supersonic shockwave through the ISM, ramming into molecular clouds and compressing their leading edges.
2. **Spiral Density Waves:** As clouds orbit the galactic center, they pass through the spiral arms of the galaxy, which function as vast gravitational traffic jams. The increased gravitational potential compresses the clouds.
3. **Cloud-Cloud Collisions:** The turbulent motions of the galactic disk occasionally cause GMCs to collide, creating highly compressed shock interfaces where star formation proceeds rapidly.

### The Stages of Collapse and Fragmentation

Once the Jeans mass is exceeded, the cloud core begins to collapse. The timescale for this process, assuming thermal pressure becomes entirely negligible, is known as the **Free-Fall Time ($t_{ff}$)**:

$$t_{ff} = \sqrt{\frac{3\pi}{32G\rho}}$$

Notice that the free-fall time depends *only* on the initial density ($\rho$). Denser regions of the cloud collapse faster than less dense regions. Because GMCs are naturally clumpy and uneven, a collapsing cloud does not shrink into a single massive star. Instead, it undergoes **fragmentation**. As the cloud compresses, its overall density rises, which progressively lowers the local Jeans mass. Sub-regions within the cloud now exceed their own local Jeans criteria and collapse independently.

```text
Visualizing Isothermal Fragmentation:

Initial Large Cloud (Low Density, Cold)
[       *     *        *       ]  M > M_J
[   *       *      *       *   ]
[       *        *     *       ]
           |
           | Gravity pulls inward, density increases.
           v
Fragmenting Cloud (Higher Density, Still Cold)
[  (***)          (***)  ]
[          (***)         ]
[  (***)          (***)  ]
           |
           | Sub-regions now exceed local M_J.
           v
Individual Protostellar Cores
   (*)             (*)

           (*)

   (*)             (*)

```

During the early stages of collapse, the process is **isothermal** (constant temperature). As gravity compresses the gas, the collision rate between molecules increases, generating heat. However, because the cloud is extremely diffuse and "optically thin" to infrared radiation, the dust grains easily radiate this thermal energy out into deep space. The temperature remains at ~10 K, allowing the collapse to continue unhindered.

Eventually, the density at the center of each fragment becomes so high that the cloud becomes "optically thick." The infrared radiation can no longer escape and is trapped within the core. At this point, the collapse transitions from isothermal to **adiabatic**. The temperature rapidly spikes, thermal pressure skyrockets, and the free-fall collapse halts. The central object reaches hydrostatic equilibrium and officially becomes a protostar.

### The Role of Angular Momentum

As a cloud fragment collapses to form a protostar, it is never perfectly stationary; it possesses some slight initial rotation due to the turbulent currents of the GMC. As the cloud shrinks in radius, the laws of physics dictate that it must conserve **angular momentum ($L$)**:

$$L = I\omega \approx m r^2 \omega$$

Where $m$ is mass, $r$ is the radius of the cloud, and $\omega$ is the angular velocity. As the radius ($r$) decreases drastically during collapse, the rotational velocity ($\omega$) must increase exponentially to keep $L$ constant. This is the same physical mechanism that causes a figure skater to spin faster when they pull their arms inward.

This spin has a profound effect on the geometry of the collapse. Material falling inward along the axis of rotation encounters very little resistance and falls directly onto the protostar. However, material falling inward along the equator is opposed by extreme centrifugal force. Consequently, the spherical cloud flattens out into a spinning pancake of gas and dust. This structure is the crucible in which planets are forged, setting the stage for the next phase of planetary system evolution.

## 9.2 Protoplanetary Disks

As discussed in the previous section, the conservation of angular momentum prevents the entirety of a collapsing molecular cloud fragment from falling directly into the central protostar. Instead, the centrifugal force halts the equatorial collapse, resulting in a flattened, spinning structure known as a **circumstellar disk**, or more specifically in the context of planet formation, a **protoplanetary disk** (often abbreviated as a *proplyd*). These disks are the cosmic foundries in which all planetary bodies—from terrestrial worlds to gas giants and comets—are forged.

### Disk Kinematics and Accretion

The material within a protoplanetary disk is in orbit around the central protostar. To a first approximation, the gas and dust follow **Keplerian rotation**, meaning the gravitational pull of the central star strictly dictates the orbital velocity. The angular velocity $\Omega$ of the disk material at a distance $r$ from a star of mass $M_*$ is given by:

$$\Omega_K = \sqrt{\frac{GM_*}{r^3}}$$

Because $\Omega_K$ decreases with increasing distance $r$, the inner regions of the disk rotate much faster than the outer regions. This differential rotation creates immense shear forces between adjacent layers of gas. This shear, combined with magnetic fields penetrating the disk (an effect known as the *magnetorotational instability*, or MRI), drives turbulence.

Turbulence acts as a form of internal friction, or viscosity. It transfers angular momentum *outward*, allowing the bulk of the disk's mass to lose energy and spiral *inward* to accrete onto the protostar. Without this mechanism to shed angular momentum, the disk would remain entirely static, the star would cease growing, and planet formation would lack the dynamic environment necessary for growth.

### Temperature Gradients and the Frost Line

A protoplanetary disk is not a uniform environment; it exhibits a steep radial temperature gradient. The disk is heated primarily by two sources: viscous friction from the accreting gas and direct irradiation from the central protostar. As a result, the inner disk is fiercely hot, while the outer disk is extremely cold.

The temperature $T$ of a passively heated disk at a distance $r$ from the star can be approximated by a power law:

$$T(r) \approx T_0 \left( \frac{r}{r_0} \right)^{-q}$$

where $T_0$ is the temperature at a reference radius $r_0$, and the exponent $q$ typically lies between $0.5$ and $0.75$, depending on the disk's geometry and how it flares outward.

This temperature gradient establishes one of the most critical boundaries in planetary science: the **Frost Line** (or Snow Line).

* **Inside the Frost Line:** Temperatures are high enough that hydrogen compounds (like water, methane, and ammonia) exist strictly as vapor. The only materials that can condense into solid grains are refractory elements—metals (like iron) and silicate minerals. Because these materials constitute a tiny fraction of the cosmic abundance (~0.6%), there is very little solid building material available.
* **Outside the Frost Line:** The temperature drops below the condensation point of water (approximately 150 K at the low pressures of the solar nebula). Water vapor deposits directly into solid ice grains. Because hydrogen and oxygen are highly abundant, the total amount of solid mass available jumps by a factor of three to four.

In our solar system, the water frost line was located at approximately 2.7 Astronomical Units (AU), strategically positioned between the modern orbits of Mars and Jupiter.

### Structure: Flaring and Dust Settling

While we refer to them as "flattened" disks, protoplanetary disks possess a three-dimensional structure. Vertically, the disk exists in hydrostatic equilibrium: the vertical component of the star's gravity pulls gas down toward the midplane, while the gas's thermal pressure pushes it upward.

Because the star's gravitational pull weakens with distance, the outer edges of the disk are less constrained vertically than the inner edges. Consequently, the disk **flares** outward, growing thicker at greater distances, much like a trumpet bell. The scale height $H$ of a flared disk typically increases with radius according to $H \propto r^{5/4}$.

Concurrently, a critical process occurs involving the solid dust grains. While the gas is supported by thermal pressure, the microscopic dust grains are not. Over thousands of years, these grains collide, lose their vertical kinetic energy, and settle down into a razor-thin layer exactly at the disk's midplane.

```text
Cross-Sectional Anatomy of a Protoplanetary Disk

                             Gas envelope (Flared)
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           /                                                   \
          /                      Frost Line                     \
         /      Gas & Rock          |         Gas, Rock & Ice    \
        |         (Hot)             |             (Cold)          |
        | **************************|**************************** |  <-- Dense Dust Midplane
       (O) PROTOSTAR                |                             |
        | **************************|**************************** |
        |                           |                             |
         \                          |                            /
          \                         |                           /
           \                                                   /
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            <--- ~0.1 to 3 AU --->  |  <--- 3 to 100+ AU --->

```

This dense dust midplane is the exact location where planetesimals begin to form. The gas above and below the midplane remains relatively dust-free but continues to dictate the overall fluid dynamics of the system.

### Disk Dispersal

Protoplanetary disks are transient structures. Observational surveys of young star clusters reveal that by an age of 3 to 5 million years, the infrared signature of the dust disk has largely disappeared in most systems. By 10 million years, virtually all gas and dust are gone.

The disk is cleared through several mechanisms:

1. **Accretion:** Much of the inner disk material eventually falls onto the star.
2. **Planet Formation:** A small fraction of the material is swept up to form planets, moons, and minor bodies.
3. **Photoevaporation:** High-energy ultraviolet and X-ray photons from the central star heat the surface layers of the outer disk. This hot gas achieves escape velocity and boils off into interstellar space in a continuous wind.

The relatively short lifespan of the disk imposes a strict "ticking clock" on planet formation. Gas giant planets, in particular, must assemble their massive cores and capture their voluminous hydrogen and helium atmospheres before the disk undergoes complete photoevaporation.

## 9.3 Accretion and Planetesimal Formation

With the protoplanetary disk established and microscopic dust grains settled into a dense midplane, the stage is set for the actual assembly of planetary bodies. This process, spanning orders of magnitude in both size and mass, transforms micron-sized dust into macroscopic planets. The journey is not a simple, continuous progression; it is a multi-stage process governed by fundamentally different physical forces at different size scales.

### Dust Coagulation: From Microns to Macroscopic

In the extremely low-density environment of the disk's upper layers, collisions between microscopic dust grains are rare. However, once settled into the dense midplane, the collision rate skyrockets. At this microscopic scale (microns to millimeters), gravity is entirely negligible. Instead, the growth of particles is driven by **coagulation** via electromagnetic forces.

When two dust grains collide at low relative velocities (typically less than 1 meter per second), they stick together due to **Van der Waals forces**—weak, short-range electrostatic attractions arising from transient dipoles in the molecules. The icy mantles found on grains beyond the frost line make them particularly "sticky" compared to bare silicate grains in the inner disk, which is one reason why the cores of giant planets form more readily in the outer solar system.

These early collisions do not produce solid rocks. Instead, they form highly porous, fluffy, fractal-like structures. Over thousands of years, these aggregates grow from millimeters to centimeters in size, becoming what planetary scientists colloquially refer to as "pebbles."

### The Meter-Size Barrier: The Crisis of Accretion

As the aggregates grow from centimeters to about a meter in diameter, they encounter one of the most significant bottlenecks in theoretical astrophysics, known as the **meter-size barrier**. If classical coagulation were the only mechanism for growth, planet formation should theoretically halt at this size. The barrier is defined by two devastating problems: fragmentation and rapid orbital decay.

First, as particles grow larger, their relative velocities increase due to gas turbulence. When two meter-sized boulders collide, the impact energy exceeds the binding energy of the material. Instead of sticking together, they shatter, resetting the growth process.

Second, and more critically, meter-sized objects are subjected to intense aerodynamic drag, leading to rapid inward migration—a phenomenon known as **radial drift**.

To understand radial drift, we must examine the gas dynamics of the disk. The gas is supported not only by its orbital velocity but also by an outward radial pressure gradient (the inner disk is hotter and denser than the outer disk). Because of this outward pressure support, the gas does not need to orbit as fast as a solid body to maintain equilibrium; it orbits at a slightly **sub-Keplerian** velocity.

Solid bodies, however, do not feel gas pressure; they attempt to orbit at the true Keplerian velocity.

```text
The Mechanics of Radial Drift

                              Outward Gas Pressure
                                      <----
STAR (O) ........................................................... Disk Outer Edge

          Gas Orbit Vector (Sub-Keplerian):    [ ----> v_gas ]
          Solid Orbit Vector (Keplerian):      [ ------> v_solid ]


```

Because $v_{solid} > v_{gas}$, a solid object constantly plows through a slower-moving gas stream. It experiences a permanent aerodynamic headwind.

* **Microscopic dust** is perfectly coupled to the gas; it is carried along like a leaf in the wind and does not drift.
* **Massive planetesimals (km-sized)** have too much inertia; the thin gas barely affects them.
* **Meter-sized boulders**, however, exist at the worst possible intermediate scale (where the aerodynamic stopping time equals the orbital period). The headwind saps their orbital angular momentum at a catastrophic rate.

Models show that a 1-meter boulder at 1 AU would spiral into the central star in just 100 to 1,000 years—a blink of an eye in cosmic terms.

### The Streaming Instability

How do planetary systems overcome the meter-size barrier if the raw materials are constantly shattering or falling into the star? Modern astronomy resolves this paradox through a fluid dynamics mechanism known as the **streaming instability**.

Rather than relying on individual boulders sticking together one by one, the streaming instability acts on dense swarms of centimeter-to-decimeter-sized pebbles. As pebbles drift inward through the gas, they naturally clump together into localized filaments due to aerodynamic drafting (similar to a flock of birds or a peloton of cyclists).

When a clump of pebbles becomes sufficiently dense, it begins to drag the local gas along with it. This reduces the headwind for that specific clump. Because the headwind is reduced, the pebbles in the clump stop drifting inward as quickly. Meanwhile, pebbles behind the clump, still experiencing the full headwind, rapidly catch up and join the swarm.

This creates a powerful positive feedback loop. The pebble clouds grow incredibly dense until their collective mass triggers **gravitational collapse**. The entire cloud of pebbles collapses under its own weight, bypassing the fragile meter-size phase entirely, and instantly forming a solid **planetesimal** roughly 10 to 100 kilometers in diameter.

### Runaway and Oligarchic Growth

Once a body reaches a diameter of roughly 10 kilometers, it possesses sufficient mass for its own gravity to dominate its future evolution. Growth shifts from aerodynamic clumping to mutual gravitational accretion.

A planetesimal sweeping through a field of smaller debris does not just sweep up the material directly in its geometric path. Its gravity bends the trajectories of nearby objects, pulling them in. This effectively increases its target size, a phenomenon described by the **gravitational focusing** cross-section ($\sigma$):

$$\sigma = \pi R^2 \left( 1 + \frac{v_{esc}^2}{v_{rel}^2} \right)$$

Where:

* $R$ is the physical radius of the planetesimal.
* $v_{esc}$ is the escape velocity of the planetesimal.
* $v_{rel}$ is the relative velocity of the approaching debris.

Because escape velocity squared ($v_{esc}^2$) is proportional to the mass divided by the radius ($M/R$, which itself is proportional to $R^2$ for a constant density), the collision cross-section grows drastically as the body grows. Furthermore, as the planetesimal's mass increases, the rate at which it accretes mass ($dM/dt$) becomes proportional to $M^{4/3}$.

This leads to a phase known as **runaway growth**. The largest planetesimal in a given region grows much faster than its smaller neighbors, quickly distancing itself in mass and dominating its local orbital zone.

Eventually, the runaway body consumes most of the low-velocity pebbles and smaller planetesimals in its immediate vicinity. Its massive gravity also begins to "stir up" the remaining bodies, increasing their relative velocities ($v_{rel}$). Looking back at the gravitational focusing equation, a higher $v_{rel}$ dramatically reduces the $\frac{v_{esc}^2}{v_{rel}^2}$ term, making gravitational focusing less effective.

The system then transitions into **oligarchic growth**. The few remaining massive bodies—now termed planetary embryos or "oligarchs" (ranging from the mass of the Moon to that of Mars)—grow at slower, relatively equal rates. These oligarchs carve out distinct feeding zones within the disk, setting the initial architectural foundation of the nascent planetary system.

## 9.4 Migration and Clearing the Disk

For decades, the standard model of planet formation assumed that planets formed precisely where we observe them today. The discovery of "Hot Jupiters"—massive gas giants orbiting their host stars at fractions of an Astronomical Unit (AU)—completely upended this paradigm. A gas giant cannot form inside the frost line due to the lack of solid ices and the intense stellar heat. Therefore, these planets must have formed in the outer disk and subsequently moved inward. This process of orbital displacement is known as **planetary migration**.

Migration occurs because a newly formed planet does not exist in a vacuum; it is embedded within a massive, massive-rich protoplanetary disk. The gravitational interactions between the planet and the surrounding gas exchange angular momentum, causing the planet's orbit to expand or shrink.

### Type I Migration: The Fast Spiral

When a rocky terrestrial planet or a planetary embryo (typically less than 10 Earth masses, $M_\oplus$) orbits within the gas disk, its gravity gently perturbs the surrounding gas. Because the gas in the disk is undergoing differential Keplerian rotation, these perturbations shear out into spiral density waves, commonly referred to as "wakes."

The planet generates two distinct wakes:

1. **A leading wake** in the inner disk (where gas orbits faster than the planet).
2. **A trailing wake** in the outer disk (where gas orbits slower than the planet).

```text
Spiral Wakes and Gravitational Torques:

        Inner Disk (Faster Gas)
  <-------------------------------------- 
                 \   \
                  \   \ Leading Wake (Pulls planet forward, + Torque)
                   \   \
Star (O) ----------- (P) Planet -----------------
                        \   \
                         \   \ Trailing Wake (Pulls planet backward, - Torque)
                          \   \
  <-------------------------------------- 
        Outer Disk (Slower Gas)

```

The gas in these wakes exerts a gravitational pull (a torque) back on the planet. The leading wake pulls the planet forward, adding angular momentum. The trailing wake pulls backward, removing angular momentum.

Because the outer disk has a larger physical volume and the geometry of the spiral arms is asymmetrical, the trailing wake is generally more massive and sits closer to the planet. Consequently, the negative torque dominates. The planet loses angular momentum and rapidly spirals inward toward the star. This is **Type I migration**.

Mathematical models show that Type I migration is dangerously fast. An Earth-mass planet could theoretically spiral into its host star in less than $10^5$ years. Understanding how planets survive this rapid migration phase (possibly through complex thermodynamic effects in the gas that reverse the torque) remains an active area of astrophysical research.

### Type II Migration: Gap Clearing

If a planet grows massive enough (typically surpassing $50$ to $100 M_\oplus$, entering the regime of gas giants like Jupiter), its gravitational influence on the disk becomes overwhelming. The planet's gravity pushes gas away from its orbit faster than the disk's internal viscosity can replenish it.

This carves out a distinct, gas-empty annular trench in the protoplanetary disk known as a **gap**.

```text
Gap Clearing in Type II Migration:

Outer Gas Disk      |   GAP    |       Inner Gas Disk
********************|          |********************
********************|    (P)   |********************
********************|          |********************
                    ^          ^
                    |          |
              Lindblad Resonances repel gas

Planet (P) is massive enough to clear its orbital path.

```

Once a gap is cleared, Type I migration ceases because the spiral wakes are effectively detached from the planet. Instead, the planet becomes "locked" to the viscous evolution of the disk itself. As the internal friction of the disk causes the bulk of the gas to slowly spiral inward and accrete onto the star, the gap—and the planet within it—is dragged inward along with it. This is **Type II migration**.

Type II migration is significantly slower than Type I, operating on timescales of millions of years. This mechanism is the primary explanation for the existence of Hot Jupiters.

### Clearing the Disk

If planetary migration were allowed to continue indefinitely, all planets would eventually plunge into their host stars. The architecture of a planetary system is ultimately preserved by the disappearance of the protoplanetary disk. The "clock" of planet formation runs out when the disk is completely cleared, a process that typically takes 3 to 10 million years.

The disk is cleared through three primary mechanisms:

1. **Accretion:** A large fraction of the disk's gas simply spirals inward and is consumed by the growing protostar.
2. **Planet Formation:** A tiny percentage of the heavy elements is locked away into the bodies of planets, moons, and asteroids.
3. **Photoevaporation:** This is the most critical process for final clearing. As the central protostar approaches the Main Sequence, it emits intense high-energy radiation (Ultraviolet and X-rays). These photons strike the upper atmosphere of the outer disk, heating the gas to temperatures exceeding $10^4$ K. At this temperature, the thermal velocity of the gas molecules exceeds the local escape velocity. The gas boils away into interstellar space in a powerful, continuous wind.

Once the gas is entirely photoevaporated, orbital migration ceases entirely. The planets are stranded in their final (or near-final) orbits. The system enters a phase of late-stage gravitational scattering, where the remaining planetesimals are either absorbed, pulverized, or ejected into the system's outer fringes (forming structures akin to the Oort Cloud), leaving behind a mature, stable planetary system.

## Chapter Summary

Chapter 9 detailed the genesis of planetary systems, a process intimately bound to the life cycle of stars. We began in **Section 9.1** by examining Giant Molecular Clouds, where localized regions of cold, dense gas exceed the Jeans mass and undergo gravitational collapse to form protostars. In **Section 9.2**, we explored how the conservation of angular momentum forces the infalling material into a flattened, spinning protoplanetary disk. The disk's temperature gradient establishes the critical frost line, separating the rock-rich inner disk from the ice-rich outer disk.

**Section 9.3** detailed the bottom-up assembly of planets, tracking the coagulation of microscopic dust into pebbles. We saw how aerodynamic forces and the streaming instability allow these pebbles to bypass the perilous meter-size barrier, triggering gravitational collapse to form planetesimals. These planetesimals then grow through runaway and oligarchic accretion into planetary embryos and gas giant cores. Finally, in **Section 9.4**, we learned that planets are not static during formation. Gravitational interactions with the disk drive Type I and Type II migration, drastically altering orbital architectures until the central star's radiation photoevaporates the remaining gas, setting the final arrangement of the planetary system.
