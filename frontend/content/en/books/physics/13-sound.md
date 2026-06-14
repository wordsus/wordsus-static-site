From a gentle whisper to the roar of a jet engine, sound is a vital part of our physical world. Building on our study of mechanical waves in Chapter 12, this chapter explores the physics of sound—the most common type of longitudinal wave. We will examine how sound propagates as alternating waves of pressure and displacement through a medium, and how we quantify its energy using intensity and the logarithmic decibel scale. Finally, we will investigate fascinating wave behaviors unique to overlapping or moving sources, including spatial interference, the rhythmic pulsing of beats, the perceived frequency shifts of the Doppler effect, and the explosive energy of sonic booms.

## 13.1 Pressure and Displacement in Sound Waves

Sound waves are the most common example of longitudinal mechanical waves. While Chapter 12 primarily explored transverse waves on a string—where the medium oscillates perpendicular to the wave's propagation—sound waves traveling through a fluid (gas or liquid) feature oscillations that are parallel to the direction of propagation.

As a sound wave propagates through a medium, it displaces the microscopic particles of that medium from their equilibrium positions. This periodic displacement forces the particles closer together in some regions and spreads them further apart in others, creating a corresponding series of high-pressure and low-pressure regions. Therefore, a sound wave can be described mathematically in two mathematically equivalent ways: as a **displacement wave** or as a **pressure wave**.

### The Displacement Wave

Consider a sound wave propagating in the $+x$-direction through a fluid. We define $s(x, t)$ as the longitudinal displacement of a small volume element of the fluid from its equilibrium position $x$. Assuming the wave is harmonic, the displacement can be modeled as a cosine function:

$$s(x, t) = s_{\text{max}} \cos(kx - \omega t)$$

Here:

* $s_{\text{max}}$ is the **displacement amplitude**, the maximum distance a fluid element moves from its equilibrium position.
* $k = 2\pi / \lambda$ is the angular wave number.
* $\omega = 2\pi f$ is the angular frequency.

### The Pressure Wave

When the fluid elements are displaced, the volume occupied by the fluid changes, which inherently changes the fluid's density and pressure. We define the **pressure variation**, $\Delta P(x, t)$, as the gauge pressure—the fluctuation of the local pressure from the equilibrium, undisturbed pressure $P_0$ of the fluid.

To find the relationship between the displacement and the pressure variation, we use the definition of the bulk modulus, $B$, introduced in Chapter 9:

$$B = -\frac{\Delta P}{\Delta V / V}$$

Consider a fluid element in the shape of a cylinder with cross-sectional area $A$ and undisturbed length $\Delta x$. Its equilibrium volume is $V = A \Delta x$.

When a sound wave passes through, the left face of the cylinder is displaced by $s(x, t)$ and the right face is displaced by $s(x + \Delta x, t)$. The change in the cylinder's thickness is $\Delta s$, resulting in a change in volume $\Delta V = A \Delta s$.

Substituting these into the bulk modulus equation yields the fractional change in volume:

$$\frac{\Delta V}{V} = \frac{A \Delta s}{A \Delta x} = \frac{\Delta s}{\Delta x}$$

Taking the limit as $\Delta x \to 0$, the ratio $\Delta s / \Delta x$ becomes the partial derivative $\partial s / \partial x$. Substituting this back into the bulk modulus equation and solving for $\Delta P$ gives:

$$\Delta P = -B \frac{\partial s}{\partial x}$$

Now, we take the partial derivative of our displacement wave function with respect to $x$:

$$\frac{\partial s}{\partial x} = -k s_{\text{max}} \sin(kx - \omega t)$$

Substituting this derivative into our pressure equation yields the pressure wave function:

$$\Delta P(x, t) = B k s_{\text{max}} \sin(kx - \omega t)$$

This equation shows that the pressure variation is also a sinusoidal wave. We can define the maximum value of this variation as the **pressure amplitude**, $\Delta P_{\text{max}}$:

$$\Delta P_{\text{max}} = B k s_{\text{max}}$$

Using the relation between wave speed, bulk modulus, and fluid density ($v = \sqrt{B/\rho}$, which implies $B = \rho v^2$) and the wave relation $k = \omega/v$, we can express the pressure amplitude in terms of the fluid's physical properties:

$$\Delta P_{\text{max}} = (\rho v^2) \left(\frac{\omega}{v}\right) s_{\text{max}} = \rho v \omega s_{\text{max}}$$

### Phase Relationship Between Displacement and Pressure

Comparing the equations for $s(x,t)$ and $\Delta P(x,t)$ reveals a crucial physical property of sound waves: **the displacement wave and the pressure wave are $90^{\circ}$ ($\pi / 2$ radians) out of phase.**

When $s(x, t)$ is a cosine function, $\Delta P(x, t)$ is a sine function. This means that at a given point in space:

* When the displacement is at its maximum ($s = s_{\text{max}}$ or $-s_{\text{max}}$), the pressure variation is zero ($\Delta P = 0$). The fluid is neither compressed nor expanded at these nodes.
* When the displacement is zero ($s = 0$), the particles from adjacent regions have either moved toward this point (creating a **compression**, where $\Delta P$ is positive and maximum) or moved away from this point (creating a **rarefaction**, where $\Delta P$ is negative and minimum).

The plain text graphic below illustrates this spatial relationship at a fixed time ($t=0$):

```text
       Displacement s(x,0) = s_max * cos(kx)
       
 +s_max |  *                           *
        |      *                   *
      0 |---------*-------------*---------
        |             *       *
 -s_max |                 *
        +---------------------------------> x


       Pressure Variation ΔP(x,0) = ΔP_max * sin(kx)
       
+ΔP_max |                 *
        |             *       *
      0 |-*-------------*-------------*-
        |     *                   *
-ΔP_max |         *                   *
        +---------------------------------> x

```

In a compression, particles are clumped together, representing the peak of the pressure wave. In a rarefaction, particles are spread far apart, representing the trough of the pressure wave. Because the pressure wave describes the measurable variations that strike the human eardrum or a microphone diaphragm, it is often more practical to analyze sound using $\Delta P(x,t)$ rather than $s(x,t)$.

## 13.2 Sound Intensity and the Decibel Scale

As a sound wave propagates through a medium, it transports energy. For practical applications—such as determining how "loud" a sound is or ensuring safety limits in a noisy factory—we need a way to quantify this energy transfer. We do this using the concepts of sound intensity and the decibel scale.

### Sound Intensity

**Intensity** ($I$) is defined as the time-averaged rate at which energy is transported by a wave across a unit area perpendicular to the direction of propagation. Since the rate of energy transfer is power ($P$), intensity is equivalent to power per unit area:

$$I = \frac{P}{A}$$

The SI unit for intensity is watts per square meter ($\text{W/m}^2$).

In Section 13.1, we established that a sound wave can be described by its displacement amplitude ($s_{\text{max}}$) or its pressure amplitude ($\Delta P_{\text{max}}$). The intensity of a harmonic sound wave traveling through a fluid of density $\rho$ at speed $v$ is proportional to the square of either amplitude. Using the mechanical wave energy principles from Chapter 12, the intensity can be written as:

$$I = \frac{1}{2} \rho v \omega^2 s_{\text{max}}^2$$

Because pressure variations are generally easier to measure with microphones than microscopic particle displacements, it is often more useful to express intensity in terms of the pressure amplitude. Recalling from the previous section that $\Delta P_{\text{max}} = \rho v \omega s_{\text{max}}$, we can substitute this into our intensity equation to get:

$$I = \frac{\Delta P_{\text{max}}^2}{2 \rho v}$$

The product $\rho v$ is known as the **acoustic impedance** of the medium. This equation demonstrates that, for a given medium, the intensity of a sound wave is entirely determined by its pressure amplitude.

### Spherical Waves and the Inverse Square Law

If a point source emits sound uniformly in all directions, the wave fronts are concentric spheres expanding outward. Because the total power $P$ emitted by the source is conserved (assuming no energy is absorbed by the medium), the power must be spread over an increasingly larger surface area as the wave travels outward.

The surface area of a sphere of radius $r$ is $A = 4\pi r^2$. Therefore, the intensity of a spherical wave at a distance $r$ from the source is:

$$I = \frac{P}{4\pi r^2}$$

This relationship is known as the **inverse square law**. If you double your distance from a sound source, the area over which the sound energy is spread increases by a factor of four, and the intensity drops to one-fourth of its original value.

```text
Point Source (Power P)
   *  ----------->  [ Area A ]  ----------------------->  [    Area 4A    ]
                    Distance r                                Distance 2r
                    Intensity I                               Intensity I/4

```

### The Decibel Scale

The human ear is an incredibly sensitive and versatile detector. It can perceive sounds with intensities as low as $1.0 \times 10^{-12} \text{ W/m}^2$ (the **threshold of hearing**) and can tolerate sounds up to about $1.0 \text{ W/m}^2$ (the **threshold of pain**).

Because this range spans 12 orders of magnitude, a linear scale for sound intensity is cumbersome. Furthermore, human perception of loudness is roughly logarithmic; a sound must have ten times the intensity to be perceived as approximately twice as loud. To accommodate both the vast range of human hearing and its logarithmic nature, we use a logarithmic scale called the **sound level**, denoted by $\beta$.

The sound level is measured in **decibels** (dB) and is defined by the equation:

$$\beta = 10 \log_{10} \left( \frac{I}{I_0} \right)$$

Here:

* $I$ is the intensity of the sound.
* $I_0$ is the reference intensity, conventionally chosen as the threshold of hearing: $I_0 = 1.0 \times 10^{-12} \text{ W/m}^2$.
* $\log_{10}$ is the base-10 logarithm.

Because the decibel is defined as a ratio of two intensities, it is a dimensionless unit. The factor of 10 in the equation is what makes the unit a *deci*bel (one-tenth of a Bel, a unit originally named after Alexander Graham Bell).

#### Calculating Sound Levels

Using the decibel equation, we can calculate the sound levels for the extremes of human hearing:

* **Threshold of hearing:** $I = 1.0 \times 10^{-12} \text{ W/m}^2$.

$$\beta = 10 \log_{10} \left( \frac{1.0 \times 10^{-12}}{1.0 \times 10^{-12}} \right) = 10 \log_{10}(1) = 0 \text{ dB}$$

* **Threshold of pain:** $I = 1.0 \text{ W/m}^2$.

$$\beta = 10 \log_{10} \left( \frac{1.0}{1.0 \times 10^{-12}} \right) = 10 \log_{10}(10^{12}) = 120 \text{ dB}$$

Due to the properties of logarithms, multiplying the sound intensity by a factor of 10 adds exactly 10 dB to the sound level. Similarly, doubling the sound intensity adds approximately 3 dB to the sound level ($\log_{10}(2) \approx 0.301$, so $10 \log_{10}(2) \approx 3.0 \text{ dB}$).

**Table 13.1: Typical Sound Levels and Intensities**

| Source of Sound | Sound Level, $\beta$ (dB) | Intensity, $I$ ($\text{W/m}^2$) |
| --- | --- | --- |
| Jet engine (at 30 m) | 140 | 100 |
| Threshold of pain | 120 | 1 |
| Rock concert / loud thunder | 110 | $10^{-1}$ |
| Busy city traffic | 80 | $10^{-4}$ |
| Normal conversation | 60 | $10^{-6}$ |
| Quiet library | 40 | $10^{-8}$ |
| Rustling leaves | 10 | $10^{-11}$ |
| Threshold of hearing | 0 | $10^{-12}$ |

*Note: While intensity is an objective, measurable physical quantity, "loudness" is a subjective physiological response that depends on both the intensity and the frequency of the sound. The human ear is most sensitive to frequencies between $2000 \text{ Hz}$ and $5000 \text{ Hz}$, meaning a 40 dB sound at $3000 \text{ Hz}$ will sound considerably louder to a human than a 40 dB sound at $100 \text{ Hz}$.*

## 13.3 Interference of Sound Waves and Beats

In Chapter 12, we learned that when two or more mechanical waves overlap in the same medium, they obey the **principle of superposition**: the resultant displacement (or pressure variation) at any point is the algebraic sum of the displacements (or pressure variations) of the individual waves. When applied to sound waves, this principle leads to two distinct and important phenomena, depending on whether the interference occurs in space (spatial interference) or in time (beats).

### Spatial Interference

Consider two speakers driven by the same audio oscillator. Because they are driven by the same source, they emit sound waves that have the same frequency $f$, the same wavelength $\lambda$, and are initially in phase. If we place a microphone at some point $P$ in the space around the speakers, the sound waves from both speakers will overlap at $P$.

However, the waves travel different distances to reach the microphone. Let $L_1$ be the distance from Speaker 1 to point $P$, and $L_2$ be the distance from Speaker 2 to point $P$.

```text
       Speaker 1
           [ ]
            |  . .  L1
            |      . .
            |          . .
            |              . .  Point P (Microphone)
            |              . .
            |          . .
            |      . .  L2
           [ ]
       Speaker 2

```

The difference in the distance traveled by the two waves is called the **path difference**, denoted by $\Delta L$:

$$\Delta L = |L_1 - L_2|$$

Because the waves travel different distances, they may not arrive at point $P$ in phase. A path difference of one full wavelength ($\lambda$) corresponds to a phase shift of $2\pi$ radians. Therefore, the phase difference $\Delta \phi$ between the two waves arriving at $P$ is directly proportional to the path difference:

$$\Delta \phi = \frac{2\pi}{\lambda} \Delta L$$

The nature of the interference at point $P$ depends entirely on this path difference:

**1. Constructive Interference:**
If the path difference is zero or an integer multiple of the wavelength, the waves arrive at $P$ completely in phase (crest meets crest, or compression meets compression). Their pressure amplitudes add together to produce a maximum resultant sound intensity (a loud spot).

$$\Delta L = n\lambda \quad \text{where } n = 0, 1, 2, 3, \dots$$

**2. Destructive Interference:**
If the path difference is a half-integer multiple of the wavelength, the waves arrive at $P$ completely out of phase (compression meets rarefaction). The positive pressure variation of one wave cancels the negative pressure variation of the other, resulting in a minimum or zero sound intensity (a quiet spot).

$$\Delta L = \left(n + \frac{1}{2}\right)\lambda \quad \text{where } n = 0, 1, 2, 3, \dots$$

### Beats: Temporal Interference

Spatial interference occurs when two waves of the *same* frequency travel different paths. What happens if two waves have the *same path* (or originate from the same point) but have slightly *different frequencies*? The result is an interference pattern that varies in time, a phenomenon known as **beats**.

Imagine striking two tuning forks simultaneously. One fork vibrates at frequency $f_1$ and the other at a slightly different frequency $f_2$. At a fixed location (like your ear), the pressure variation from each tuning fork can be written as:

$$\Delta P_1 = \Delta P_{\text{max}} \cos(2\pi f_1 t)$$

$$\Delta P_2 = \Delta P_{\text{max}} \cos(2\pi f_2 t)$$

By the superposition principle, the total pressure variation is $\Delta P = \Delta P_1 + \Delta P_2$. To combine these, we use the trigonometric identity:
$\cos(a) + \cos(b) = 2 \cos\left(\frac{a-b}{2}\right) \cos\left(\frac{a+b}{2}\right)$.

Applying this identity, the resultant wave is:

$$\Delta P = \left[ 2 \Delta P_{\text{max}} \cos\left(2\pi \left(\frac{f_1 - f_2}{2}\right) t\right) \right] \cos\left(2\pi \left(\frac{f_1 + f_2}{2}\right) t\right)$$

This equation describes a new wave with two distinct components:

1. **The Carrier Wave:** The second cosine term oscillates at the average frequency, $f_{\text{avg}} = (f_1 + f_2) / 2$. This is the pitch you actually hear.
2. **The Amplitude Envelope:** The term in the square brackets acts as a slowly varying amplitude that modulates the carrier wave.

```text
   Amplitude Envelope modulating the rapid carrier wave
       _       _       _       _       _
      / \     / \     / \     / \     / \
     /|||\   /|||\   /|||\   /|||\   /|||\
    +-|||-+-+-|||-+-+-|||-+-+-|||-+-+-|||-+- Time
     \|||/   \|||/   \|||/   \|||/   \|||/
      \_/     \_/     \_/     \_/     \_/
       '       '       '       '       '
     LOUD    SOFT    LOUD    SOFT    LOUD

```

Because intensity is proportional to the square of the pressure amplitude, a maximum intensity (a "beat") is heard whenever the amplitude envelope reaches a maximum—either positive or negative. The cosine envelope reaches a magnitude of $2\Delta P_{\text{max}}$ twice in every full cycle of the modulating frequency $(f_1 - f_2)/2$.

Therefore, the number of beats heard per second, known as the **beat frequency** ($f_{\text{beat}}$), is exactly twice the modulating frequency:

$$f_{\text{beat}} = 2 \left| \frac{f_1 - f_2}{2} \right| = |f_1 - f_2|$$

For example, if you sound a $440 \text{ Hz}$ tuning fork and a $443 \text{ Hz}$ tuning fork together, you will hear a tone of $441.5 \text{ Hz}$ that pulses in loudness exactly $3$ times per second ($f_{\text{beat}} = |440 - 443| = 3 \text{ Hz}$). Musicians frequently use the phenomenon of beats to tune instruments; by sounding a known pitch alongside an out-of-tune string and adjusting the string's tension until the beats slow down and disappear ($f_{\text{beat}} = 0$), they ensure the frequencies are perfectly matched.

## 13.4 The Doppler Effect

Have you ever stood on a sidewalk and listened to an ambulance drive past? As it approaches, the siren has a high, piercing pitch. The moment it passes you and moves away, the pitch noticeably drops. This shift in perceived frequency due to the relative motion between a wave source and an observer is known as the **Doppler effect**, named after the Austrian physicist Christian Doppler who first described it in 1842.

While the Doppler effect applies to all types of waves, including light (electromagnetic waves), we will focus here on mechanical sound waves propagating through a stationary medium, such as still air. We will denote the speed of sound in this medium as $v$, the frequency of the sound emitted by the source as $f$, and the frequency heard by the observer as $f'$.

### Moving Observer, Stationary Source

Consider a stationary source emitting sound waves with a frequency $f$ and wavelength $\lambda$. Because the source is stationary, the wave fronts spread out symmetrically in all directions. The speed of sound $v$ is determined entirely by the properties of the medium.

If a stationary observer listens to this sound, they hear exactly the frequency emitted by the source: $f' = f$. However, imagine the observer begins moving toward the source with a velocity $v_O$.

The speed of the sound waves relative to the stationary medium is still $v$, but the speed of the sound waves *relative to the moving observer* increases. The observer is rushing headlong into the oncoming wave fronts, intercepting more wave crests per second than they would if standing still. The effective wave speed is $v' = v + v_O$.

Because the wavelength $\lambda$ in the air remains unchanged (the source is stationary), the observed frequency $f'$ is calculated using the wave relationship $v = \lambda f$:

$$f' = \frac{v'}{\lambda} = \frac{v + v_O}{\lambda}$$

Substituting $\lambda = v / f$ into the equation gives:

$$f' = \left(\frac{v + v_O}{v}\right) f = f \left(1 + \frac{v_O}{v}\right)$$

Since $(v + v_O) > v$, the observed frequency $f'$ is greater than the emitted frequency $f$.

Conversely, if the observer is moving *away* from the source, the relative speed of the waves hitting the observer decreases to $v' = v - v_O$. The observer hears a lower frequency:

$$f' = \left(\frac{v - v_O}{v}\right) f = f \left(1 - \frac{v_O}{v}\right)$$

### Moving Source, Stationary Observer

Now consider what happens when the observer is stationary, but the source is moving toward the observer with a velocity $v_S$.

In this scenario, the relative speed of the wave fronts hitting the observer remains $v$ because the observer is stationary relative to the medium. However, the physical spacing between the wave fronts—the wavelength—is altered.

As the source emits a wave crest and moves forward to emit the next one, it "catches up" to the first crest. This physically compresses the wave fronts in the direction of motion, creating a shorter wavelength $\lambda'$.

```text
    Stationary Source:                      Moving Source (Velocity v_S to the right):
    Wavefronts are concentric spheres.      Wavefronts bunch up in front, spread out behind.

                                            Observer A (Left)                Observer B (Right)
          (   (   (   *   )   )   )         (    (     (      (   *  )  )  ) )
                  <-- $\lambda$ -->                    <--- $\lambda'$ --->      <- $\lambda'$ ->

```

During one period $T$ of the wave, the source moves a distance $\Delta x = v_S T$. Therefore, the shortened wavelength $\lambda'$ in front of the source is:

$$\lambda' = \lambda - \Delta x = \lambda - v_S T$$

Using $T = 1 / f$ and $\lambda = v / f$, we can write:

$$\lambda' = \frac{v}{f} - \frac{v_S}{f} = \frac{v - v_S}{f}$$

The observer in front of the source hears a frequency $f'$ determined by the standard wave speed $v$ divided by this new, compressed wavelength $\lambda'$:

$$f' = \frac{v}{\lambda'} = \frac{v}{\left(\frac{v - v_S}{f}\right)} = f \left(\frac{v}{v - v_S}\right)$$

Because the denominator $(v - v_S)$ is smaller than the numerator $v$, the observed frequency $f'$ is higher than the emitted frequency $f$.

If the source is moving *away* from the observer (like Observer A in the diagram above), the wave fronts are stretched out. The source moves in the opposite direction of the emitted waves, increasing the wavelength by $v_S T$. This results in a lower observed frequency:

$$f' = f \left(\frac{v}{v + v_S}\right)$$

### The General Doppler Equation

We can combine all the possible scenarios—moving observer, moving source, or both moving simultaneously—into a single, general equation for the Doppler effect.

$$f' = f \left( \frac{v \pm v_O}{v \mp v_S} \right)$$

**Sign Convention Rules:**
To use this equation correctly, you must choose the correct signs in the numerator and the denominator. The simplest way to remember this is the "Toward = Top" rule:

* **Numerator ($v_O$):** Choose the **top sign ($+$)** if the observer is moving **toward** the source. Choose the bottom sign ($-$) if the observer is moving away.
* **Denominator ($v_S$):** Choose the **top sign ($-$)** if the source is moving **toward** the observer. Choose the bottom sign ($+$) if the source is moving away.

If either the observer or the source is stationary, simply substitute $0$ for $v_O$ or $v_S$, respectively.

*Note: The mechanical Doppler effect equations assume that neither $v_O$ nor $v_S$ exceeds the speed of sound $v$. If the source moves faster than the waves it produces ($v_S > v$), the equations break down, and a different physical phenomenon occurs, which we will explore in the next section.*

## 13.5 Shock Waves and Sonic Booms

In the previous section, we established the equations for the Doppler effect under the assumption that the speed of the source ($v_S$) is strictly less than the speed of sound in the medium ($v$). But what happens physically when a source accelerates to speeds equal to or greater than the speed of sound? This leads to the extreme wave phenomena known as shock waves and sonic booms.

### Mach Number and the Sound Barrier

To easily classify the speed of objects moving through a fluid, aerodynamicists use a dimensionless ratio called the **Mach number** ($\text{Ma}$), named after Austrian physicist Ernst Mach. It is defined as the ratio of the speed of the source to the speed of sound in that specific medium:

$$\text{Ma} = \frac{v_S}{v}$$

* **Subsonic flow:** $\text{Ma} < 1$ (The source moves slower than sound).
* **Transonic/Sonic flow:** $\text{Ma} \approx 1$ (The source moves at the speed of sound).
* **Supersonic flow:** $\text{Ma} > 1$ (The source moves faster than sound).

When an aircraft accelerates and approaches $\text{Ma} = 1$, the sound waves it emits in the forward direction cannot travel fast enough to get out of the aircraft's way. The wave fronts pile up directly in front of the aircraft, creating a wall of highly compressed air with massive pressure. This dense barrier of air is historically what pilots called the "sound barrier." Breaking through it requires significant thrust and aerodynamic engineering.

### The Mach Cone and Shock Waves

Once the aircraft exceeds the speed of sound ($\text{Ma} > 1$), it completely outruns the sound waves it produces. Because the source is moving faster than the wave propagation speed, the spherical wave fronts emitted at different times along the flight path overlap and interfere constructively along a V-shaped boundary (in 2D) or a conical surface (in 3D).

This surface of extreme constructive interference is a **shock wave**. It is a microscopic region where the pressure, temperature, and density of the fluid undergo an abrupt, almost discontinuous, increase.

We can determine the geometry of this shock wave by analyzing the wave fronts. Suppose an aircraft at time $t = 0$ is at position $O$ and emits a sound wave. After a time $t$, that wave has expanded into a sphere of radius $r = vt$. In that same amount of time, the aircraft has traveled a much greater distance $d = v_S t$ to its current position $S$.

The shock wave forms the tangent envelope that connects the aircraft's current position to all the expanding wave fronts behind it. This creates a cone, called the **Mach cone**.

```text
                     \
                       \    Mach Cone Boundary (Shock Wave)
                         \
                           \  |
                             \|
                               \
                                |\  Radius of wave = v*t
                                |  \
                                |    \
Emission point (t=0)            |      \
      O *-----------------------+--------* S  Source current position (t)
        |                       |   θ  /
        |                       |    /
        |<--- Distance = v_S*t ---->|

```

The half-angle of the cone's apex is known as the **Mach angle** ($\theta$). By drawing a right triangle from the initial emission point $O$, extending the radius of the wave $vt$ perpendicular to the tangent of the cone, and using the flight path $v_S t$ as the hypotenuse, we can derive the equation for the Mach angle:

$$\sin \theta = \frac{v t}{v_S t} = \frac{v}{v_S}$$

Since $\text{Ma} = v_S / v$, this can be written simply as:

$$\sin \theta = \frac{1}{\text{Ma}}$$

This equation shows that as the supersonic speed of the source increases, the Mach number increases, the fraction $1/\text{Ma}$ decreases, and the Mach angle $\theta$ becomes narrower. A high-speed bullet might create a very sharp, narrow cone, while a jet flying just above $\text{Ma} = 1$ creates a very wide cone.

### The Sonic Boom

A common misconception is that a "sonic boom" happens only once, at the exact moment an aircraft "breaks" the sound barrier. In reality, the shock wave (the Mach cone) is continuously generated as long as the aircraft travels at supersonic speeds.

The shock wave is swept backward and outward from the aircraft. If you are standing on the ground, you hear nothing as the supersonic aircraft flies directly overhead because the sound waves have not reached you yet; the aircraft is outrunning its own sound.

A moment later, the edge of the Mach cone sweeps over your position. Because the shock wave represents a massive, sudden change in air pressure (a massive constructive interference of countless wave fronts), your ears interpret this abrupt pressure spike as a deafening explosion—a **sonic boom**.

Typically, a supersonic aircraft creates a complex wave pattern, but it generally resolves into two primary shock waves: one generated by the nose of the aircraft (the bow shock) and one generated by the tail (the tail shock).

1. As the nose shock passes, the ambient air pressure jumps up sharply.
2. The pressure then steadily drops below normal atmospheric pressure as the length of the aircraft passes.
3. Finally, as the tail shock passes, the pressure abruptly jumps back up to normal atmospheric pressure.

This creates an "N-wave" pressure profile. Because of this, an observer on the ground will usually hear a distinctive "double boom" separated by a fraction of a second when a large supersonic aircraft passes by.

## Chapter Summary

**13.1 Pressure and Displacement in Sound Waves:** Sound is a longitudinal mechanical wave that travels through fluids via a series of compressions and rarefactions. It can be modeled as a displacement wave $s(x, t) = s_{\text{max}} \cos(kx - \omega t)$ or a pressure variation wave $\Delta P(x, t) = \Delta P_{\text{max}} \sin(kx - \omega t)$. The pressure and displacement waves are $90^{\circ}$ ($\pi / 2$) out of phase. The pressure amplitude is related to the displacement amplitude by $\Delta P_{\text{max}} = \rho v \omega s_{\text{max}}$.

**13.2 Sound Intensity and the Decibel Scale:** Sound intensity $I$ is the power transported across a unit area, $I = \Delta P_{\text{max}}^2 / (2\rho v)$. For a point source, intensity follows the inverse square law ($I = P / 4\pi r^2$). Because human hearing spans a vast range and is logarithmic, sound level $\beta$ is measured in decibels (dB) using the equation $\beta = 10 \log_{10}(I/I_0)$, where $I_0 = 1.0 \times 10^{-12} \text{ W/m}^2$ is the threshold of hearing.

**13.3 Interference of Sound Waves and Beats:** When two sound waves overlap in space, their path difference $\Delta L$ dictates the interference. Constructive interference occurs at $\Delta L = n\lambda$, and destructive interference at $\Delta L = (n + 0.5)\lambda$. When two waves of slightly different frequencies ($f_1$ and $f_2$) overlap, they create a temporal interference pattern called beats. The pulsing volume varies at the beat frequency, $f_{\text{beat}} = |f_1 - f_2|$.

**13.4 The Doppler Effect:** The perceived frequency of a sound shifts when there is relative motion between the source and the observer. The general equation is $f' = f [(v \pm v_O) / (v \mp v_S)]$. Use the top signs ($+$ in the numerator, $-$ in the denominator) when the observer and source move toward each other, and the bottom signs when they move away.

**13.5 Shock Waves and Sonic Booms:** When a source moves faster than the speed of sound in the medium ($v_S > v$), the Doppler equations no longer apply. The wave fronts pile up and form a conical shock wave called a Mach cone. The geometry of the cone is given by the Mach angle, $\sin \theta = v / v_S = 1 / \text{Ma}$. When this high-pressure cone sweeps over an observer, it is heard as a sonic boom.
