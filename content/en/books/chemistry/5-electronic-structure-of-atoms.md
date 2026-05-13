What gives elements their unique chemical properties? The answer lies not in the nucleus, but in the arrangement of electrons. In this chapter, we explore the electronic structure of atoms. We begin by examining the nature of light, which provided the first vital clues about atomic behavior. We will trace the revolutionary discoveries that led from classical physics to quantum mechanics and wave-particle duality. Finally, we will learn to map electron probability using quantum numbers, orbitals, and electron configurations, unlocking the fundamental rules that govern all chemical reactivity.

## 5.1 The Wave Nature of Light and Electromagnetic Radiation

To understand the electronic structure of atoms, we must first explore the nature of light. Historically, much of our knowledge regarding the arrangement of electrons in atoms stems from observing how matter emits and absorbs light. The light we can see with our eyes is just one small part of a broader phenomenon known as **electromagnetic radiation**.

Electromagnetic radiation carries energy through space and exhibits wave-like behavior. In addition to visible light, other familiar forms of electromagnetic radiation include the radio waves that carry signals to our car antennas, the microwaves we use to heat food, and the X-rays used by doctors and dentists to image bones. Despite their different uses and apparent characteristics, all these forms of radiation share fundamental wave properties.

### Characteristics of Waves

A wave is a periodic oscillation that transmits energy through space. Water waves and sound waves are common examples, but unlike these, electromagnetic waves do not require a physical medium to travel through; they can travel through a vacuum.

To describe any wave, we rely on three primary characteristics:

1. **Wavelength ($\lambda$):** The distance between two corresponding points on consecutive waves, such as from one crest to the next crest, or from one trough to the next trough. It is usually measured in meters (m) or related metric prefixes, such as nanometers (nm) for visible light.
2. **Frequency ($\nu$):** The number of complete wave cycles that pass a given point in space per second. The standard unit for frequency is the hertz (Hz), where $1 \text{ Hz} = 1 \text{ cycle/s}$, or $\text{s}^{-1}$.
3. **Amplitude:** The vertical distance from the midline (equilibrium position) of a wave to its crest or trough. Amplitude relates to the intensity of the radiation—in the case of visible light, it corresponds to brightness.

```text
Displacement
     ^
     |      Crest
   A |      _---_                     _---_
     |    /       \                 /       \
-----|---/---------\---------------/---------\------> Distance
     |              \             /
     |               \           /
     |                ---___---
                         Trough
     
     |<-------------------------->|
             Wavelength (λ)

A = Amplitude

```

### The Speed of Light

One of the most profound discoveries in physics is that all electromagnetic radiation—regardless of its wavelength or frequency—travels at the exact same speed in a vacuum. This fundamental constant is known as the speed of light, denoted by the symbol $c$.

For most calculations, we use the value:

$$c = 3.00 \times 10^8 \text{ m/s}$$

Because the speed of a wave is the product of its wavelength and its frequency, there is a direct mathematical relationship between these properties for electromagnetic radiation:

$$c = \lambda \nu$$

This equation reveals an **inverse relationship** between wavelength and frequency. Because $c$ is a constant, as the wavelength of electromagnetic radiation increases, its frequency must proportionally decrease, and vice versa. Long waves have low frequencies, while short waves have high frequencies.

### The Electromagnetic Spectrum

The varying wavelengths and frequencies of electromagnetic radiation make up the **electromagnetic spectrum**. The spectrum encompasses a vast range of wavelengths, from gamma rays (which can be shorter than the diameter of an atom) to radio waves (which can be longer than a football field).

```text
High Frequency (ν) <-------------------------------------> Low Frequency (ν)
Short Wavelength (λ) <-----------------------------------> Long Wavelength (λ)

| Gamma Rays | X-Rays | Ultraviolet | VISIBLE | Infrared | Microwaves | Radio Waves |
                                        |
                                | V I B G Y O R |
                              400 nm <----> 750 nm

```

The human eye is only sensitive to a very narrow band of this spectrum, known as **visible light**. The visible spectrum spans from wavelengths of approximately 400 nm to 750 nm. Within this narrow window, different wavelengths correspond to the different colors we perceive, ranging from violet (around 400 nm, highest frequency visible) to red (around 750 nm, lowest frequency visible).

The order of colors in the visible spectrum, from longest wavelength to shortest, can be remembered using the classic mnemonic ROYGBIV (Red, Orange, Yellow, Green, Blue, Indigo, Violet).

### Example Calculation: Wavelength to Frequency Conversion

Because $c = \lambda \nu$, if either the wavelength or the frequency of electromagnetic radiation is known, the other can be easily calculated.

**Problem:**
A typical helium-neon laser used in supermarket barcode scanners emits red light with a wavelength of 633 nm. What is the frequency of this light?

**Solution:**
First, we must ensure our units match. Since the speed of light ($c$) is given in meters per second, the wavelength ($\lambda$) must be converted from nanometers to meters. Recall from Chapter 1 that $1 \text{ nm} = 10^{-9} \text{ m}$.

$$\lambda = 633 \text{ nm} \times \left( \frac{10^{-9} \text{ m}}{1 \text{ nm}} \right) = 6.33 \times 10^{-7} \text{ m}$$

Next, we rearrange the wave equation to solve for frequency ($\nu$):

$$\nu = \frac{c}{\lambda}$$

Substitute the known values into the equation:

$$\nu = \frac{3.00 \times 10^8 \text{ m/s}}{6.33 \times 10^{-7} \text{ m}}$$

$$\nu = 4.74 \times 10^{14} \text{ s}^{-1} \text{ (or } 4.74 \times 10^{14} \text{ Hz)}$$

This calculation demonstrates that an astonishingly large number of wave cycles—nearly 474 trillion—pass a given point every single second when red laser light is emitted.

## 5.2 Quantized Energy and Photons

While the wave model of light successfully explains many physical phenomena—such as how light bends around obstacles (diffraction) and how waves interact with one another (interference)—it fails to explain certain interactions between light and matter. By the late 19th century, physicists were struggling with two major experimental observations that the classical wave theory of light could not resolve: **blackbody radiation** (the emission of light from hot objects) and the **photoelectric effect** (the emission of electrons from metal surfaces struck by light).

### Planck and the Quantization of Energy

When a solid object is heated, it emits electromagnetic radiation. A blacksmith heating a horseshoe observes it glowing a dull red, then a brighter orange, and eventually a brilliant white as it gets hotter. According to classical physics, matter could absorb or emit any arbitrary amount of energy. Furthermore, classical wave theory predicted that an object at any temperature should emit intensely at very short wavelengths—a failed prediction famously known as the "ultraviolet catastrophe."

In 1900, the German physicist Max Planck solved this problem by making a radical assumption: energy can only be absorbed or released by atoms in discrete "chunks" of some minimum size. Planck gave the name **quantum** (meaning "fixed amount") to the smallest quantity of energy that can be emitted or absorbed as electromagnetic radiation.

Planck proposed that the energy ($E$) of a single quantum is directly proportional to the frequency ($\nu$) of the radiation:

$$E = h\nu$$

The constant of proportionality, $h$, is known as **Planck's constant** and has an incredibly small value:

$$h = 6.626 \times 10^{-34} \text{ J}\cdot\text{s}$$

Because energy can only be exchanged in whole-number multiples of $h\nu$ (e.g., $1h\nu$, $2h\nu$, $3h\nu$), we say that energy is **quantized**.

```text
Continuous vs. Quantized Energy

     Ramp (Continuous)                 Stairs (Quantized)
       /                                     ___ 3hv
      /                                  ___|
     /                               ___|    2hv
    /                            ___|    1hv
   /                            |    0hv

```

> *Analogy: Just as a person walking up a flight of stairs can only stand on specific steps and cannot hover between them, an atom can only absorb or emit specific, allowed quantities of energy.*

### Einstein and the Photoelectric Effect

In 1905, Albert Einstein used Planck's quantum theory to solve the second major mystery: the photoelectric effect. When light shines on a clean metal surface, the metal can eject electrons.

Classical wave theory predicted that if the incident light was dim, it would simply take more time for the wave's energy to "build up" enough to knock an electron loose. However, experiments showed a completely different reality: electrons are *only* ejected if the light exceeds a certain minimum frequency, called the **threshold frequency**. If the frequency is below this threshold, absolutely no electrons are emitted, regardless of how intensely the light shines or how long it remains on the metal.

Einstein explained this by proposing that light itself is not a continuous wave, but rather a stream of tiny energy packets, which he called **photons**. Each photon behaves like a particle of light, and its energy is given by Planck's equation:

$$E_{\text{photon}} = h\nu$$

When a photon strikes the metal surface, it transfers its entire energy to a single electron. If the photon's energy ($h\nu$) is less than the energy required to overcome the attractive forces holding the electron in the metal (a threshold value called the **work function**, $\Phi$), the electron cannot escape. If the photon's energy is greater than the work function, the electron is instantly ejected, and any excess energy becomes the kinetic energy of the escaping electron.

```text
The Photoelectric Effect

Incident Light (Photons)
   ~ ~ ~ ~ ~ ~ \         Ejected Electron (Kinetic Energy)
     ~ ~ ~ ~ ~  \          /
       ~ ~ ~ ~   \        /
                  \      /
 ==================*================== Metal Surface
   (-)   (-)   (-)   (-)   (-)   (-)   Work Function (Φ)
 =====================================

```

### The Dual Nature of Light

Einstein's explanation of the photoelectric effect established that light possesses both wave-like and particle-like characteristics. Depending on the experiment, light behaves either as a continuous wave (when traveling through space and exhibiting diffraction) or as a stream of discrete particles (when interacting with matter to transfer discrete packets of energy). This foundational concept of modern physics and chemistry is known as **wave-particle duality**.

### Example Calculation: Energy of a Photon

By combining Planck's equation ($E = h\nu$) with the wave equation from Section 5.1 ($c = \lambda \nu$), we can substitute $\nu = c/\lambda$ to calculate the energy of a photon directly from its wavelength:

$$E = \frac{hc}{\lambda}$$

**Problem:**
Calculate the energy of a single photon of red laser light with a wavelength of **633 nm**. Then, calculate the energy of exactly one mole of these photons.

**Solution:**
First, calculate the energy of one photon. We must convert the wavelength to meters so the units cancel properly with the speed of light ($1 \text{ nm} = 10^{-9} \text{ m}$).

$$E_{\text{photon}} = \frac{(6.626 \times 10^{-34} \text{ J}\cdot\text{s})(3.00 \times 10^8 \text{ m/s})}{633 \times 10^{-9} \text{ m}}$$

$$E_{\text{photon}} = 3.14 \times 10^{-19} \text{ J}$$

This is an exceedingly small amount of energy, appropriate for a single subatomic interaction. However, chemical reactions typically involve macroscopic amounts of matter. To find the energy of one mole of these photons, multiply the energy of a single photon by Avogadro's number ($N_A = 6.022 \times 10^{23} \text{ mol}^{-1}$):

$$E_{\text{mole}} = (3.14 \times 10^{-19} \text{ J/photon})(6.022 \times 10^{23} \text{ photons/mol})$$

$$E_{\text{mole}} = 1.89 \times 10^5 \text{ J/mol} = \mathbf{189 \text{ kJ/mol}}$$

This energy is comparable to the bond enthalpies of many chemical bonds, which explains why certain wavelengths of light possess enough energy to break bonds and initiate photochemical reactions.

## 5.3 Atomic Emission Spectra and the Bohr Model

In the 19th century, scientists studying light discovered that the radiation emitted by different substances under high temperatures or electrical excitation contained valuable clues about their atomic structure. Understanding how atoms emit light provided the crucial bridge between classical physics and the modern quantum mechanical model of the atom.

### Continuous Spectra vs. Line Spectra

When sunlight or the light from a standard incandescent light bulb is passed through a prism, the light is dispersed into a continuous rainbow of colors. This unbroken array of all wavelengths in the visible spectrum is called a **continuous spectrum**.

However, when a high voltage is applied to a glass tube containing a pure elemental gas (such as hydrogen, neon, or sodium) at low pressure, the gas emits light. If this emitted light is passed through a prism, a continuous spectrum is *not* produced. Instead, only a few specific, isolated wavelengths of light are seen, appearing as distinct, brightly colored lines against a black background. This is known as a **line spectrum** or atomic emission spectrum.

```text
Spectrum Types Comparison:

Continuous Spectrum (White Light):
[||||||||||||||||||||||||||||||||||||||||||] -> All colors blend seamlessly

Line Spectrum (Hydrogen Gas):
[  |       |           |                   | ] -> Only discrete lines appear
 410 nm  434 nm      486 nm              656 nm
 (Violet) (Blue)    (Blue-Green)          (Red)

```

Every element has a unique, characteristic line spectrum, functioning like an atomic "fingerprint." The fact that atoms only emit light at specific wavelengths implies that atoms can only lose specific, quantized amounts of energy. The classical models of the atom proposed in the early 20th century, such as Rutherford's nuclear model, could not explain why these discrete lines existed or why the electrons did not continuously lose energy and spiral into the nucleus.

### The Bohr Model of the Hydrogen Atom

In 1913, the Danish physicist Niels Bohr proposed a theoretical model to explain the line spectrum of the hydrogen atom. Building upon Planck's and Einstein's ideas of quantized energy, Bohr postulated three major principles for the behavior of the electron in a hydrogen atom:

1. **Quantized Orbits:** The electron moves in circular orbits around the nucleus, but only orbits of certain specific radii (and therefore specific energies) are permitted.
2. **Stationary States:** An electron in a permitted orbit is in an "allowed" energy state. It does not radiate energy and therefore does not spiral into the nucleus.
3. **Energy Transitions:** Energy is only emitted or absorbed by the electron when it transitions from one allowed orbit to another. This energy is emitted or absorbed as a photon, where $E_{\text{photon}} = h\nu$.

Bohr labeled each allowed orbit with an integer, $n$, called the **principal quantum number**, which can have values of $1, 2, 3, \ldots, \infty$. The orbit closest to the nucleus has $n = 1$. This is the lowest possible energy state for the hydrogen atom, known as the **ground state**.

When the electron absorbs a photon with the exact right amount of energy, it jumps to a higher, less stable orbit ($n = 2, 3, 4, \dots$). These higher energy states are called **excited states**. Because excited states are unstable, the electron quickly falls back down to a lower energy orbit, emitting a photon of light in the process.

```text
Bohr Model Energy Transitions

         n = 3 (Excited State)
        /                     \
      /     ---Photon emitted--->\  (Transition from n=3 to n=2)
    /        |                     \
   |      n = 2 (Excited State)     |
   |     /                       \  |
   |    |         (+) Nucleus     | |
   |     \                       /  |
   |      n = 1 (Ground State)      |
    \                              /
      \                          /
        \                      /


```

### Calculating Energy States and Transitions

Using classical physics laws and his new quantum rules, Bohr derived a mathematical equation to calculate the energy ($E_n$) of the electron in any given orbit $n$ of a hydrogen atom:

$$E_n = -R_H \left( \frac{1}{n^2} \right)$$

Here, $R_H$ is the **Rydberg constant**, which has a value of $2.18 \times 10^{-18} \text{ J}$. The negative sign indicates that the energy of the electron bound to the nucleus is lower than the energy of a free electron (where $n = \infty$ and $E_{\infty} = 0$). As $n$ increases, the radius of the orbit increases, and the energy of the electron becomes less negative (closer to zero).

```text
Energy Level Diagram for Hydrogen
Energy (E)
 ^
 | n = ∞ -------------------  E = 0 J (Electron completely removed)
 | ...
 | n = 4 -------------------  E_4 = -0.136 x 10^-18 J
 | n = 3 -------------------  E_3 = -0.242 x 10^-18 J
 |
 | n = 2 -------------------  E_2 = -0.545 x 10^-18 J
 |
 |
 |
 | n = 1 -------------------  E_1 = -2.18 x 10^-18 J  (Ground State)

```

When an electron transitions from an initial state ($n_i$) to a final state ($n_f$), the change in energy of the atom ($\Delta E$) can be calculated as:

$$\Delta E = E_f - E_i = \left[ -R_H \left( \frac{1}{n_f^2} \right) \right] - \left[ -R_H \left( \frac{1}{n_i^2} \right) \right]$$

Factoring out $-R_H$, we get:

$$\Delta E = -R_H \left( \frac{1}{n_f^2} - \frac{1}{n_i^2} \right)$$

* If $n_f < n_i$ (the electron falls to a lower energy level), $\Delta E$ is negative. The atom loses energy, and a photon is **emitted**.
* If $n_f > n_i$ (the electron is excited to a higher energy level), $\Delta E$ is positive. The atom gains energy, meaning a photon must be **absorbed**.

The energy of the photon involved in the transition must exactly equal the absolute value of the energy difference between the orbits:

$$E_{\text{photon}} = |\Delta E| = h\nu = \frac{hc}{\lambda}$$

### Example Calculation: Wavelength of Emitted Light

**Problem:**
Calculate the wavelength (in nm) of the photon emitted when a hydrogen atom undergoes a transition from $n = 4$ to $n = 2$.

**Solution:**
First, calculate the change in energy ($\Delta E$) for the atom using Bohr's equation:

$$\Delta E = -(2.18 \times 10^{-18} \text{ J}) \left( \frac{1}{2^2} - \frac{1}{4^2} \right)$$

$$\Delta E = -(2.18 \times 10^{-18} \text{ J}) \left( \frac{1}{4} - \frac{1}{16} \right)$$

$$\Delta E = -(2.18 \times 10^{-18} \text{ J}) (0.1875)$$

$$\Delta E = -4.09 \times 10^{-19} \text{ J}$$

The negative sign confirms that energy is released. The energy of the emitted photon is $+4.09 \times 10^{-19} \text{ J}$.
Next, use the relationship $E = hc / \lambda$ and rearrange to solve for wavelength ($\lambda$):

$$\lambda = \frac{hc}{E_{\text{photon}}}$$

$$\lambda = \frac{(6.626 \times 10^{-34} \text{ J}\cdot\text{s})(3.00 \times 10^8 \text{ m/s})}{4.09 \times 10^{-19} \text{ J}}$$

$$\lambda = 4.86 \times 10^{-7} \text{ m}$$

Finally, convert meters to nanometers:

$$\lambda = 4.86 \times 10^{-7} \text{ m} \times \left( \frac{1 \text{ nm}}{10^{-9} \text{ m}} \right) = \mathbf{486 \text{ nm}}$$

This corresponds exactly to the blue-green line in the hydrogen emission spectrum (the Balmer series).

### Limitations of the Bohr Model

While the Bohr model perfectly predicted the emission spectrum of the hydrogen atom and firmly introduced the concept of quantization into atomic structure, it had significant flaws:

1. It failed to predict the emission spectra of any atom containing more than one electron (such as helium).
2. It could not explain why some spectral lines are brighter than others or why they split into finer lines in the presence of a magnetic field.
3. Most importantly, it assumed that electrons behave strictly as classical particles moving in fixed, predictable, circular trajectories, which violates the laws of quantum mechanics that would be developed a decade later.

Despite these limitations, Bohr's core ideas—that energy is quantized and that electrons exist in discrete energy levels—remain fundamental to our modern understanding of the atom.

## 5.4 The Dual Nature of Matter and De Broglie's Hypothesis

Albert Einstein's explanation of the photoelectric effect demonstrated that light—long understood to be purely a wave—could also exhibit particle-like behavior. In 1924, a French physics graduate student named Louis de Broglie proposed a radically symmetrical question: if radiant energy can behave like a stream of particles, is it possible that matter, such as an electron, can exhibit wave-like properties?

De Broglie hypothesized that any moving particle or object has an associated wave. He proposed a mathematical relationship linking the particle properties of mass and velocity to the wave property of wavelength.

### The De Broglie Equation

De Broglie combined Einstein's mass-energy equivalence equation ($E=mc^2$) with Planck's equation for the energy of a photon ($E=hc/\lambda$). By setting them equal and substituting the speed of light ($c$) with the velocity of a general particle ($v$), he derived what is now known as the **de Broglie wavelength**:

$$ \lambda = \frac{h}{mv} $$

In this equation:

* $\lambda$ is the wavelength in meters (m).
* $h$ is Planck's constant ($6.626 \times 10^{-34} \text{ J}\cdot\text{s}$).
* $m$ is the mass of the particle in kilograms (kg).
* $v$ is the velocity of the particle in meters per second (m/s).

Because the product of mass and velocity ($mv$) is defined in classical physics as **momentum** ($p$), the equation is frequently written as:

$$ \lambda = \frac{h}{p} $$

De Broglie's equation suggests a universal **wave-particle duality** for all matter. However, notice the inverse relationship between mass and wavelength: as the mass of an object increases, its wavelength decreases. Because Planck's constant ($h$) is so infinitesimally small, macroscopic objects (like a thrown baseball or a moving car) have wavelengths that are entirely undetectable. It is only when we examine subatomic particles, like electrons with incredibly small masses, that the wave nature of matter becomes measurable and chemically significant.

### Explaining the Bohr Model

De Broglie's hypothesis brilliantly solved the central mystery of the Bohr model: why were only certain, specific electron orbits allowed?

If an electron behaves as a wave, it must fit continuously around the nucleus without canceling itself out. De Broglie argued that the allowed orbits in the Bohr model are simply the ones where the electron forms a **circular standing wave**.

Think of a plucked guitar string: only waves with specific frequencies (harmonics) can be sustained, while others quickly die out due to destructive interference. Similarly, for an electron's wave to persist around a nucleus, the total circumference of the orbit ($2\pi r$) must be an exact, whole-number multiple of the electron's wavelength ($n\lambda$).

$$ 2\pi r = n\lambda \quad \text{where } n = 1, 2, 3, \ldots $$

If the circumference is not a whole-number multiple of the wavelength, the wave will overlap with itself out of phase, leading to destructive interference and the rapid collapse of the wave.

```text
Electron Standing Waves in an Atom

      ALLOWED ORBIT (n = 4)                 FORBIDDEN ORBIT
      Constructive Interference             Destructive Interference
      Wave meets itself perfectly           Wave overlaps out of phase
                                          
             . -- ~ -- .                           . -- ~ -- .
         ~               ~                     ~               ~
       /                   \                 /                   \
      |          +          |               |          +      xxxx| 
       \                   /                 \                   /
         ~               ~                     ~               ~
             ' -- ~ -- '                           ' -- ~ -- '

      Circumference = 4λ                    Circumference = 4.3λ

```

### Experimental Verification: Electron Diffraction

A hypothesis requires experimental proof to become an accepted theory. If electrons truly behave like waves, they should exhibit **diffraction**—the bending and scattering of waves as they pass through narrow slits or around obstacles.

In 1927, American physicists Clinton Davisson and Lester Germer directed a beam of electrons at a nickel crystal. The closely spaced planes of nickel atoms acted exactly like a diffraction grating. To their astonishment, the electrons scattered to produce a diffraction pattern identical to the patterns produced by X-rays (which are known electromagnetic waves). The dual nature of matter was confirmed.

This discovery had profound technological implications. Because the wavelength of high-speed electrons is vastly shorter than the wavelengths of visible light, an electron beam can resolve details much smaller than a light microscope can. This principle led to the invention of the **electron microscope**, which allows scientists to image viruses, cellular structures, and even individual atoms.

### Example Calculation: Wavelength of an Electron vs. a Baseball

To understand why quantum effects apply to electrons but not everyday objects, we can calculate the de Broglie wavelength for both.

*Recall that the joule (J) is a derived unit: $1 \text{ J} = 1 \text{ kg}\cdot\text{m}^2/\text{s}^2$. Therefore, mass must always be in kilograms to ensure units cancel properly.*

**Problem A: The Electron**
Calculate the wavelength of an electron moving at a velocity of $5.97 \times 10^6 \text{ m/s}$. The mass of an electron is $9.11 \times 10^{-31} \text{ kg}$.

**Solution A:**

$$ \lambda = \frac{h}{mv} $$

$$ \lambda = \frac{6.626 \times 10^{-34} \text{ kg}\cdot\text{m}^2/\text{s}}{(9.11 \times 10^{-31} \text{ kg})(5.97 \times 10^6 \text{ m/s})} $$

$$ \lambda = 1.22 \times 10^{-10} \text{ m} = \mathbf{0.122 \text{ nm}} $$

This wavelength ($0.122 \text{ nm}$) is exactly on the scale of atomic radii and X-ray wavelengths. Therefore, the wave nature of the electron is critical to understanding atomic structure.

**Problem B: The Baseball**
Calculate the wavelength of a $0.145 \text{ kg}$ baseball moving at $40.0 \text{ m/s}$ (about 90 mph).

**Solution B:**

$$ \lambda = \frac{6.626 \times 10^{-34} \text{ kg}\cdot\text{m}^2/\text{s}}{(0.145 \text{ kg})(40.0 \text{ m/s})} $$

$$ \lambda = 1.14 \times 10^{-34} \text{ m} $$

This wavelength is unimaginably small—billions of times smaller than a single proton. At the macroscopic scale, the wave characteristics of a baseball are completely completely negligible, which is why classical physics (Newtonian mechanics) perfectly describes the motion of everyday objects.

## 5.5 Quantum Mechanics and Quantum Numbers

The discovery of the electron's wave-like nature necessitated a fundamental shift in how we describe atomic structure. The Bohr model, which depicted electrons traveling in precise, fixed circular orbits, was incompatible with the wave properties of matter. If an electron behaves as an extended wave, it cannot be pinpointed to a single, specific location at a given time.

### The Heisenberg Uncertainty Principle

This realization was formalized in 1927 by the German physicist Werner Heisenberg. Heisenberg concluded that the dual nature of matter places a fundamental limitation on how precisely we can know both the location and the momentum of a subatomic particle simultaneously. This is known as the **Heisenberg uncertainty principle**.

Mathematically, it is expressed as:

$$ \Delta x \cdot \Delta p \ge \frac{h}{4\pi} $$

Where $\Delta x$ is the uncertainty in position, $\Delta p$ is the uncertainty in momentum (mass times velocity, $m\Delta v$), and $h$ is Planck's constant.

Because $h$ is a non-zero constant, the product of the uncertainties must be greater than or equal to a minimum value. If we try to measure an electron's exact position (making $\Delta x$ very small), the uncertainty in its momentum ($\Delta p$) must become very large. In chemical terms, this means that if we know an electron is confined to a tiny space (like an atom), we cannot know its exact trajectory. Therefore, the concept of a defined electron "orbit" must be abandoned.

### The Schrödinger Wave Equation and Orbitals

In 1926, the Austrian physicist Erwin Schrödinger proposed an advanced mathematical model to describe the behavior of the electron in a hydrogen atom. This new approach, known as **quantum mechanics** (or wave mechanics), treats the electron entirely as a three-dimensional standing wave.

Schrödinger developed an equation (the Schrödinger wave equation) that incorporates both the wave-like and particle-like behaviors of the electron. While the full mathematics of the equation are beyond the scope of a general chemistry text, its conceptual result is foundational. Solving the equation for a specific energy state yields a mathematical function called a **wave function**, denoted by the Greek letter psi ($\psi$).

The wave function itself has no direct physical meaning. However, the *square* of the wave function, $\psi^2$, gives the **probability density**—the probability of finding the electron at a specific point in space relative to the nucleus.

Quantum mechanics replaces Bohr's circular *orbits* with **orbitals**. An orbital is a three-dimensional region in space around the nucleus where there is a high probability (usually 90% or 95%) of finding the electron.

```text
Bohr Model vs. Quantum Mechanical Model

      Bohr Model ("Orbit")                 Quantum Model ("Orbital")
      --------------------                 -------------------------
      Electron follows a strict,           Electron location is a fuzzy
      predictable circular path.           "cloud" of probability density.
                                           
             ---                                    . .. .
          /       \                              . . .... . .
         |    +    |                             . .. + ..  .
          \       /                              .  . .... . .
             ---                                    . .. .

      Known position/trajectory.           Only probability is known.

```

### Quantum Numbers

When Schrödinger's equation is solved for the hydrogen atom, it yields a series of wave functions (orbitals), each associated with a specific, quantized energy level. To mathematically describe the size, shape, and orientation of these different orbitals, quantum mechanics uses a set of integers known as **quantum numbers**.

Every orbital is uniquely defined by three quantum numbers: $n$, $l$, and $m_l$. Think of these three numbers as an electron's atomic "address" specifying exactly which orbital it occupies.

#### 1. The Principal Quantum Number ($n$)

The principal quantum number, $n$, determines the overall **energy level** and **size** of the orbital. As $n$ increases, the orbital becomes larger, and the electron spends more time farther from the nucleus. Consequently, the electron's energy increases (it becomes less tightly bound to the nucleus).

* Allowed values: $n$ must be a positive integer ($1, 2, 3, 4, \ldots, \infty$).
* Collection of orbitals: All orbitals with the same value of $n$ are said to be in the same **principal electron shell**.

#### 2. The Angular Momentum Quantum Number ($l$)

The angular momentum quantum number, $l$, defines the **shape** of the orbital.

* Allowed values: For a given principal shell $n$, $l$ can be any integer from $0$ up to $(n - 1)$.

$$ 0 \le l \le n - 1 $$

For example, if $n = 2$, the allowed values for $l$ are $0$ and $1$. If $n = 3$, the allowed values are $0, 1$, and $2$.

* Collection of orbitals: All orbitals with the same values of $n$ and $l$ form a **subshell**.
* Subshell designations: Instead of using numbers, chemists traditionally use letters to designate the different values of $l$.

| Value of $l$ | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| **Subshell Letter** | $s$ | $p$ | $d$ | $f$ |

Therefore, an orbital with $n = 3$ and $l = 1$ is called a **$3p$ orbital**. An orbital with $n = 4$ and $l = 2$ is a **$4d$ orbital**.

#### 3. The Magnetic Quantum Number ($m_l$)

The magnetic quantum number, $m_l$, describes the three-dimensional **orientation** of the orbital in space relative to the other orbitals in the atom.

* Allowed values: $m_l$ can have integral values ranging from $-l$ to $+l$, including zero.

$$ -l \le m_l \le +l $$

For example, if an electron is in a $p$ subshell ($l = 1$), the allowed values for $m_l$ are $-1, 0$, and $+1$. This means there are three distinct $p$ orbitals in that subshell, each pointing in a different direction.

* Number of orbitals: The total number of orbitals within a subshell is exactly equal to the number of allowed $m_l$ values, which is $2l + 1$.

### Summarizing Orbital Shells and Subshells

By applying the rules for the three quantum numbers, we can determine the exact architecture of an atom's electron shells.

1. The number of subshells within a principal shell $n$ is exactly equal to $n$.
2. The number of orbitals within a subshell is $2l + 1$.
3. The total number of orbitals within a principal shell $n$ is $n^2$.

```text
Hierarchical Organization of Quantum Numbers:

Shell (n)  -->  Subshell (l)  -->  Orbital (m_l)
(City)          (Street)           (House Number)

```

**Table: Quantum Numbers and Allowed Orbitals for the First Four Shells**

| Shell ($n$) | Subshell ($l$) | Designation | Allowed $m_l$ values | Number of Orbitals | Total Orbitals in Shell ($n^2$) |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | $1s$ | 0 | 1 | **1** |
| &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 2 | 0 | $2s$ | 0 | 1 | &nbsp; |
| 2 | 1 | $2p$ | -1, 0, +1 | 3 | **4** |
| &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 3 | 0 | $3s$ | 0 | 1 | &nbsp; |
| 3 | 1 | $3p$ | -1, 0, +1 | 3 | &nbsp; |
| 3 | 2 | $3d$ | -2, -1, 0, +1, +2 | 5 | **9** |
| &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 4 | 0 | $4s$ | 0 | 1 | &nbsp; |
| 4 | 1 | $4p$ | -1, 0, +1 | 3 | &nbsp; |
| 4 | 2 | $4d$ | -2, -1, 0, +1, +2 | 5 | &nbsp; |
| 4 | 3 | $4f$ | -3, -2, -1, 0, +1, +2, +3 | 7 | **16** |

This hierarchy establishes the foundation for understanding where electrons are likely to be found. In the next sections, we will explore the physical shapes of these orbitals and how electrons populate them to build the structure of complex atoms.

## 5.6 Shapes and Representations of Atomic Orbitals

Because quantum mechanics relies on probability rather than precise trajectories, we cannot draw a simple path to represent an electron's motion around a nucleus. Instead, we visualize orbitals using **electron density** maps.

The square of the wave function, $\psi^2$, represents the probability of finding an electron at a specific point in space. If we plot this probability in three dimensions, we get a cloud-like representation where the density of the cloud corresponds to the probability of finding the electron. To make these clouds easier to visualize and draw, chemists typically use **boundary surface diagrams**. These diagrams draw a solid surface that encloses the region in space where the probability of finding the electron is high—usually chosen to be 90%.

The shape of this boundary surface is determined entirely by the angular momentum quantum number, $l$.

### The $s$ Orbitals ($l = 0$)

When $l = 0$, the magnetic quantum number $m_l$ can only be 0. This single allowed value means there is only one orientation for an $s$ orbital in any given principal shell.

All $s$ orbitals are **spherically symmetrical**. This means the probability of finding the electron depends only on the distance from the nucleus ($r$), not on the direction. No matter which way you move away from the nucleus, the electron density drops off at the exact same rate.

As the principal quantum number $n$ increases ($1s$, $2s$, $3s$, etc.), the orbital becomes larger, meaning the electron spends more time further from the nucleus. Furthermore, orbitals with $n > 1$ contain internal structural features called **nodes**. A node is a region in space where the probability of finding an electron drops to exactly zero ($\psi^2 = 0$).

For $s$ orbitals, these nodes are spherical shells (like the layers of an onion) known as **radial nodes**.

* The $1s$ orbital has 0 nodes.
* The $2s$ orbital has 1 radial node.
* The $3s$ orbital has 2 radial nodes.

```text
Cross-Section of s Orbitals (Electron Density)

    1s Orbital               2s Orbital                  
       ___                    _______                    
     / . . \                / . . . . \                  
    | . + . |              | .  ___  . |                 
     \ . . /               | . /   \ . | <-- Inner high-density region
       ---                 | . | + | . |                 
                           | . \___/ . | <-- Spherical Node (zero density)
                            \ . . . . /  <-- Outer high-density region
                             \_______/                   

```

### The $p$ Orbitals ($l = 1$)

When $l = 1$, the magnetic quantum number $m_l$ can take three values: $-1$, $0$, and $+1$. Consequently, there are three $p$ orbitals in every shell starting from $n = 2$ (the $2p$, $3p$, $4p$ subshells, etc.).

Unlike the spherical $s$ orbitals, $p$ orbitals have a distinct, dumbbell-like shape. The electron density is concentrated in two distinct regions, or "lobes," situated on opposite sides of the nucleus. The nucleus itself lies exactly at the center between these two lobes, in a region where the electron density is zero.

Because the electron density is separated by a flat plane of zero probability, this type of node is called a **planar node** (or angular node).

The three $p$ orbitals in a subshell are identical in size and shape but differ in their spatial orientation. They are mutually perpendicular and are traditionally aligned along the x, y, and z axes of a Cartesian coordinate system. For convenience, they are labeled by the axis along which their lobes point: $p_x$, $p_y$, and $p_z$.

```text
Representations of the Three p Orbitals

      pz Orbital               py Orbital               px Orbital
          z                        z                        z
          |                        |                        |
        .-|-.                      |                      .-|-.
       /  |  \                     |                     / / \ \  (front)
      |   |   |            .-.     |     .-.            |-+---|-| y
       \  |  /            /   \    |    /   \            \ \ / /
    ------+------ y      |-----\---+---/-----| y          '-|-'
          |               \   /    |    \   /               |   (back)
          |                '-'     |     '-'                |
       .- | -.                     |                        |
      |   |   |                    |                        |
       \  |  /                     |                        |
        '-|-'                      |                        |

```

### The $d$ Orbitals ($l = 2$)

When $n = 3$ or greater, the $l = 2$ subshell is permitted. For $l = 2$, the allowed values of $m_l$ are $-2$, $-1$, $0$, $+1$, and $+2$. Therefore, there are five $d$ orbitals in a $d$ subshell.

The shapes of the $d$ orbitals are more complex. Four of the five $d$ orbitals possess a "cloverleaf" shape consisting of four lobes of electron density radiating outward from the nucleus, separated by two perpendicular planar nodes.

* The $d_{xy}$, $d_{xz}$, and $d_{yz}$ orbitals have their lobes pointing *between* the axes.
* The $d_{x^2-y^2}$ orbital has its cloverleaf lobes pointing directly *along* the x and y axes.

The fifth orbital, designated $d_{z^2}$, looks distinctly different. It consists of two major lobes pointing along the z-axis, with a "doughnut" of electron density (a torus) encircling the nucleus in the xy-plane. Despite its unique shape, the $d_{z^2}$ orbital has the exact same energy as the other four $d$ orbitals in an isolated atom.

### The $f$ Orbitals ($l = 3$)

When $n = 4$ or greater, the $l = 3$ subshell becomes available, containing seven $f$ orbitals (since $m_l$ ranges from $-3$ to $+3$).

The boundary surface diagrams for $f$ orbitals are highly complex, often featuring six or eight lobes, or multiple torus shapes. While they are crucial for understanding the chemistry of the lanthanide and actinide elements (found at the bottom of the periodic table), their intricate geometries are rarely involved in the fundamental bonding models discussed in general chemistry.

### Summarizing Nodes in Orbitals

Understanding where an electron *cannot* be is just as important as understanding where it *is*. The total number of nodes in any orbital is determined by its principal quantum number, $n$. Furthermore, the geometry of those nodes is dictated by the angular momentum quantum number, $l$.

The mathematical rules for nodes are as follows:

1. **Total number of nodes** $= n - 1$
2. **Number of angular (planar) nodes** $= l$
3. **Number of radial (spherical) nodes** $= n - l - 1$

For example, consider a $3p$ orbital:

* Total nodes $= 3 - 1 = \mathbf{2}$
* Angular nodes ($p$ means $l = 1$) $= \mathbf{1}$ (a flat plane passing through the nucleus)
* Radial nodes $= 3 - 1 - 1 = \mathbf{1}$ (a spherical shell inside the orbital)

As the energy level of an orbital increases, the total number of nodes increases. In quantum mechanics, a greater number of nodes directly corresponds to a higher energy state for the standing wave.

## 5.7 Electron Spin and the Pauli Exclusion Principle

The three quantum numbers we have discussed so far—$n$, $l$, and $m_l$—perfectly describe the size, shape, and spatial orientation of atomic orbitals. However, as spectroscopic techniques improved in the 1920s, scientists noticed a perplexing detail: many of the emission lines in the spectra of hydrogen and other elements were not single lines at all. Under high resolution, what appeared to be a single line was actually a closely spaced pair of lines, known as a line doublet.

The Schrödinger wave equation, using only three quantum numbers, could not explain these doublets. There had to be an additional property of the electron that allowed for two slightly different energy states within the same orbital.

### The Spin Magnetic Quantum Number ($m_s$)

In 1925, Dutch physicists George Uhlenbeck and Samuel Goudsmit proposed a solution: the electron must possess an intrinsic property akin to angular momentum. They suggested that an electron behaves as if it were a tiny sphere spinning on its own axis.

From classical physics, we know that a spinning sphere of electric charge generates a magnetic field. Therefore, if an electron is "spinning," it acts like a microscopic bar magnet with a north and south pole.

While the classical image of a literally spinning sphere is not perfectly accurate at the quantum level—electron spin is a fundamental, intrinsic quantum property with no exact macroscopic equivalent—the magnetic consequences are real. An electron's spin can only orient itself in one of two distinct, quantized directions relative to an external magnetic field: it can align *with* the field or *against* it.

To account for this, a fourth quantum number was introduced: the **spin magnetic quantum number**, designated **$m_s$**.

Because there are only two possible orientations, $m_s$ can only have two possible values:

$$m_s = +\frac{1}{2} \quad \text{or} \quad m_s = -\frac{1}{2}$$

These two states are commonly referred to as "spin-up" and "spin-down," respectively.

```text
Electron Spin as a Magnetic Dipole

      "Spin-Up" (m_s = +1/2)           "Spin-Down" (m_s = -1/2)
            North Pole                       South Pole
               ^                                |
               |                                |
            .--|--.                          .--|--.
          /    |    \                      /    |    \
         |     +     |  ---> Spin --->    |     +     | 
          \         /                      \         /
            '-----'                          '-----'
               |                                |
               |                                V
            South Pole                       North Pole

```

### The Stern-Gerlach Experiment

The concept of quantized electron spin was elegantly demonstrated by the Stern-Gerlach experiment (originally conducted in 1922, though its results were later fully explained by spin).

In this experiment, a beam of silver atoms was passed through an uneven (inhomogeneous) magnetic field. Silver atoms have a single, unpaired electron in their outermost shell. If the magnetic orientation of this electron were completely random (as classical physics would predict), the beam would spread out into a broad, continuous smear upon hitting a detector screen.

Instead, the beam cleanly split into exactly two distinct spots. Half of the atoms were deflected upward, and the other half were deflected downward. This proved unequivocally that the magnetic moment of the electron is quantized into exactly two states ($+1/2$ and $-1/2$).

### The Pauli Exclusion Principle

With the introduction of the fourth quantum number, we now have a complete "address" for any electron in an atom.

* **$n$** identifies the principal shell (city).
* **$l$** identifies the subshell (street).
* **$m_l$** identifies the specific orbital (house).
* **$m_s$** identifies the electron's spin state (the specific resident).

In 1925, the Austrian physicist Wolfgang Pauli formulated a fundamental rule regarding these quantum numbers, known as the **Pauli exclusion principle**.

The principle states: **No two electrons in the same atom can have the exact same set of four quantum numbers ($n, l, m_l, m_s$).**

### Consequences for Orbital Capacity

The Pauli exclusion principle has a profound and immediate consequence for how we build atoms.

Suppose we want to place electrons into a $1s$ orbital. For this orbital, $n = 1$, $l = 0$, and $m_l = 0$.

1. We can place a first electron in this orbital with a spin of $+1/2$. Its quantum numbers are $(1, 0, 0, +1/2)$.
2. We can place a second electron in this orbital, but to obey the Pauli exclusion principle, its fourth quantum number *must* be different. Therefore, its spin must be $-1/2$. Its quantum numbers are $(1, 0, 0, -1/2)$.
3. If we attempt to add a third electron, it must have either a spin of $+1/2$ or $-1/2$. Either choice will perfectly duplicate the quantum numbers of an electron already in the orbital, violating the Pauli exclusion principle.

Therefore, the Pauli exclusion principle dictates a strict limit: **An atomic orbital can hold a maximum of two electrons, and those two electrons must have opposite spins.** When two electrons occupy the same orbital with opposite spins, their magnetic fields cancel each other out, and the electrons are said to be **paired**.

```text
Representing Electrons in Orbitals

Chemists frequently use a box or a line to represent an orbital, 
and half-arrows to represent the electrons and their spins.

[ ↑ ]   An orbital with one electron (unpaired). 
        By convention, the first electron is usually drawn "spin-up".

[ ↑↓ ]  An orbital with two electrons (paired). 
        The arrows point in opposite directions, obeying the Pauli exclusion principle.

[ ↑↑ ]  INVALID. This violates the Pauli exclusion principle 
        (two electrons in the same orbital cannot have the same spin).

```

Because of this principle, the maximum number of electrons that can occupy a given subshell is strictly determined by the number of orbitals in that subshell:

* An **$s$ subshell** (1 orbital) can hold a maximum of **2** electrons.
* A **$p$ subshell** (3 orbitals) can hold a maximum of **6** electrons.
* A **$d$ subshell** (5 orbitals) can hold a maximum of **10** electrons.
* An **$f$ subshell** (7 orbitals) can hold a maximum of **14** electrons.

Understanding this capacity limit is the final piece of the puzzle needed to map out the exact arrangement of electrons for any element on the periodic table.

## 5.8 Electron Configurations and Orbital Diagrams

With a complete understanding of quantum numbers and the capacities of atomic orbitals, we can now map the exact location of every electron in an atom. The way in which electrons are distributed among the various orbitals of an atom is called its **electron configuration**.

The most stable, lowest-energy arrangement of electrons in an atom is known as its **ground state**. To determine the ground-state electron configuration of any element, we follow three fundamental rules that dictate how electrons "build up" around the nucleus.

### The Three Rules of Electron Filling

**1. The Aufbau Principle**
The word *Aufbau* is German for "building up." The Aufbau principle states that electrons fill orbitals starting with the lowest available energy level before occupying higher energy levels.

For the hydrogen atom, energy depends only on the principal quantum number, $n$. However, in multi-electron atoms, electron-electron repulsions cause the subshells within a principal shell to have different energies. The energy of subshells increases in the order $s < p < d < f$.

Because subshells of higher principal shells can overlap with those of lower shells in terms of energy (e.g., the $4s$ subshell is slightly lower in energy than the $3d$ subshell), we use a standard "diagonal rule" to remember the filling order:

```text
The Aufbau Diagonal Filling Chart:

      1s
     ↙
      2s    2p
     ↙     ↙
      3s    3p    3d
     ↙     ↙     ↙
      4s    4p    4d    4f
     ↙     ↙     ↙     ↙
      5s    5p    5d    5f
     ↙     ↙     ↙
      6s    6p    6d
     ↙     ↙
      7s    7p

Filling Order: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, 5s, 4d, 5p, 6s...

```

**2. The Pauli Exclusion Principle**
As discussed in Section 5.7, no two electrons in an atom can have the same four quantum numbers. In practical terms for drawing configurations, this means an orbital can hold a maximum of two electrons, and they must have opposite spins (one spin-up, one spin-down).

**3. Hund's Rule**
When electrons are placed in a set of **degenerate orbitals** (orbitals of the exact same energy, such as the three $2p$ orbitals), they will spread out to occupy empty orbitals single-file before pairing up. Hund's rule states that for degenerate orbitals, the lowest energy configuration is the one with the maximum number of unpaired electrons with parallel spins.

> *Analogy: Think of seats on a bus. Strangers will typically sit in empty rows first before they start sitting next to someone else. Electrons behave the same way in degenerate orbitals to minimize repulsive forces.*

### Writing Electron Configurations

The standard notation for an electron configuration consists of the principal quantum number ($n$), the subshell letter ($s, p, d, \text{or } f$), and a superscript indicating the number of electrons in that subshell.

Let us build the electron configurations for the first few elements:

* **Hydrogen (H, Z=1):** $1s^1$ (Read as "one-s-one")
* **Helium (He, Z=2):** $1s^2$
* **Lithium (Li, Z=3):** $1s^2 2s^1$
* **Beryllium (Be, Z=4):** $1s^2 2s^2$
* **Boron (B, Z=5):** $1s^2 2s^2 2p^1$

### Orbital Diagrams

While the superscript notation is concise, it does not explicitly show how electrons are arranged within the degenerate orbitals of a subshell. To visualize this, we use **orbital diagrams**.

In an orbital diagram, each orbital is represented by a box (or a line), and electrons are represented by half-arrows (↑ for spin-up, ↓ for spin-down). Let us examine the orbital diagrams for the elements carbon through neon to see Hund's rule in action.

```text
Carbon (C, Z=6):      1s² 2s² 2p²
1s: [↑↓]    2s: [↑↓]    2p: [↑ ][↑ ][  ]  <-- Electrons remain unpaired

Nitrogen (N, Z=7):    1s² 2s² 2p³
1s: [↑↓]    2s: [↑↓]    2p: [↑ ][↑ ][↑ ]  <-- Maximum unpaired electrons

Oxygen (O, Z=8):      1s² 2s² 2p⁴
1s: [↑↓]    2s: [↑↓]    2p: [↑↓][↑ ][↑ ]  <-- Pairing must now begin

Fluorine (F, Z=9):    1s² 2s² 2p⁵
1s: [↑↓]    2s: [↑↓]    2p: [↑↓][↑↓][↑ ]

Neon (Ne, Z=10):      1s² 2s² 2p⁶
1s: [↑↓]    2s: [↑↓]    2p: [↑↓][↑↓][↑↓]  <-- Noble gas (full shell)

```

### Condensed (Noble Gas) Core Configurations

As atoms get larger, writing the full electron configuration becomes tedious. To simplify, chemists use **condensed electron configurations**.

The inner-shell electrons of an atom tightly bound to the nucleus match the electron configuration of the noble gas that precedes the element on the periodic table. These are called **core electrons**. The electrons in the outermost shell are called **valence electrons**, and these are the ones primarily involved in chemical bonding.

We can abbreviate the core electrons by writing the symbol of the preceding noble gas in brackets, followed by the configuration of the valence electrons.

* **Sodium (Na, Z=11):**
* Full: $1s^2 2s^2 2p^6 3s^1$
* Condensed: $[\text{Ne}] 3s^1$

* **Chlorine (Cl, Z=17):**
* Full: $1s^2 2s^2 2p^6 3s^2 3p^5$
* Condensed: $[\text{Ne}] 3s^2 3p^5$

* **Iron (Fe, Z=26):**
* Full: $1s^2 2s^2 2p^6 3s^2 3p^6 4s^2 3d^6$
* Condensed: $[\text{Ar}] 4s^2 3d^6$

### Anomalies in Electron Configurations

While the Aufbau principle correctly predicts the ground state for most elements, there are notable exceptions, particularly among the transition metals. Two common anomalies occur in the first row of transition metals: chromium and copper.

Based on the diagonal filling rule, we would predict Chromium (Cr, Z=24) to be $[\text{Ar}] 4s^2 3d^4$. However, its actual experimental ground state is $[\text{Ar}] 4s^1 3d^5$.
Similarly, Copper (Cu, Z=29) is expected to be $[\text{Ar}] 4s^2 3d^9$, but it is actually $[\text{Ar}] 4s^1 3d^{10}$.

```text
Expected vs. Actual Orbital Diagram for Copper (Cu)

Expected: [Ar] 4s² 3d⁹
4s: [↑↓]    3d: [↑↓][↑↓][↑↓][↑↓][↑ ]

Actual:   [Ar] 4s¹ 3d¹⁰
4s: [↑ ]    3d: [↑↓][↑↓][↑↓][↑↓][↑↓]

```

These exceptions occur because exactly half-filled subshells (like $3d^5$) and completely filled subshells (like $3d^{10}$) are exceptionally stable arrangements. Moving one electron from the $4s$ orbital to the $3d$ orbital lowers the overall energy of the atom enough to offset the cost of taking an electron out of the lower-energy $4s$ state.

## Chapter Summary

* **The Nature of Light:** Electromagnetic radiation exhibits wave-like properties characterized by wavelength ($\lambda$) and frequency ($\nu$), which are inversely related by the speed of light ($c = \lambda\nu$).
* **Quantized Energy:** Energy is not continuous but is emitted or absorbed in discrete packets called quanta. Light also possesses particle-like properties, behaving as a stream of photons with energy proportional to frequency ($E = h\nu$).
* **Atomic Spectra and the Bohr Model:** Elements emit light at specific wavelengths (line spectra). The Bohr model explained the hydrogen spectrum by proposing that electrons orbit the nucleus in fixed, quantized energy levels.
* **Wave-Particle Duality:** De Broglie proposed that moving matter also exhibits wave properties ($\lambda = h/mv$). This duality requires that the precise location and momentum of an electron cannot both be known simultaneously (Heisenberg Uncertainty Principle).
* **Quantum Mechanics:** The Schrödinger wave equation treats the electron as a standing wave. Its solutions yield three-dimensional probability maps called orbitals.
* **Quantum Numbers:** Every electron in an atom is uniquely described by four quantum numbers: principal ($n$, size/energy), angular momentum ($l$, shape), magnetic ($m_l$, orientation), and spin magnetic ($m_s$, spin direction).
* **Electron Configuration:** The arrangement of electrons follows the Aufbau principle (lowest energy first), the Pauli exclusion principle (maximum two electrons per orbital with opposite spins), and Hund's rule (maximize unpaired electrons in degenerate orbitals). Configurations can be represented via $spdf$ notation, orbital diagrams, or condensed noble gas abbreviations.
