In Chapter 11, we studied single oscillators. We now extend these principles to continuous media, where interconnected particles allow disturbances to travel macroscopic distances. A mechanical wave is a propagating disturbance that transports energy and momentum through a material medium without the net transfer of matter. From seismic tremors to the vibration of a guitar string, mechanical waves govern how energy moves through our physical world. In this chapter, we will classify wave types, develop mathematical models for their motion, calculate their speed and energy, and explore powerful phenomena like interference and standing waves.

## 12.1 Types of Mechanical Waves

In Chapter 11, we explored the physics of single oscillators, such as a mass on a spring or a swinging pendulum. While a single oscillating object confines its energy to a localized region of space, a collection of interacting oscillators can transport energy across macroscopic distances. This phenomenon is known as a **mechanical wave**.

A mechanical wave is a disturbance that travels through a material medium. As the wave propagates, it transfers energy and momentum from one location to another without the permanent, net transport of the medium itself. For a mechanical wave to exist, three conditions must be met:

1. **A source of disturbance:** An initial input of energy that displaces a portion of the medium from equilibrium.
2. **A medium:** A substance (solid, liquid, or gas) containing interconnected particles.
3. **A restorative physical mechanism:** Forces between the adjacent particles of the medium (such as tension or elasticity) that allow the disturbance to be passed from one particle to the next.

Mechanical waves are broadly classified into three categories based on how the particles of the medium move relative to the direction of the wave's propagation.

### Transverse Waves

In a **transverse wave**, the displacement of the medium's particles is strictly perpendicular to the direction of the wave's travel.

Consider a long, taut string. If you flick one end of the string sharply upward and then back down to its resting position, a single wave pulse travels down the length of the string. As the pulse passes any given point on the string, the local string particles move up and down, while the wave itself moves horizontally.

```text
    Transverse Wave Motion
    
      Particle Displacement (y)
          ^                 Wave Propagation (v)
          |                     -------->
          v 

      .   .   .   .   .   .   .   .   .   .   .
         / \             / \
        /   \           /   \
    ---/-----\---------/-----\---------
              \       /
               \     /
                \   /

```

Electromagnetic waves (which we will study in Chapter 25) are also transverse, though they are not mechanical and do not require a medium.

### Longitudinal Waves

In a **longitudinal wave**, the displacement of the medium's particles is parallel to the direction of the wave's travel.

A classic demonstration of a longitudinal wave involves a long, flexible spring (like a Slinky). If you push and pull continuously on one end of the spring along its length, you create regions where the coils are compressed together and regions where they are stretched apart. These regions, called **compressions** (areas of high density and pressure) and **rarefactions** (areas of low density and pressure), travel down the spring.

```text
    Longitudinal Wave Motion
    
      Particle Displacement (x)
         <----->            Wave Propagation (v)
                                -------->

    || | |  |   |   |  | | |||| | |  |   |   |  | | ||
    <-->    <------->  <-->     <------->    <-->
    Compression Rarefaction Compression Rarefaction

```

Sound waves in a fluid (gas or liquid) are the most common example of longitudinal mechanical waves, a topic we will explore in depth in Chapter 13.

### Surface Waves

Many waves in nature are not strictly transverse or longitudinal but a combination of both. **Surface waves**, such as ripples on the surface of a pond or ocean waves, travel along the boundary between two different media (like water and air).

When a water wave passes, a particle of water on the surface does not just move up and down, nor does it move simply back and forth. Instead, it undergoes a combination of transverse and longitudinal displacement, causing it to move in a roughly circular or elliptical path. The water particle moves forward at the crest of the wave and backward at the trough, returning nearly to its original position after the wave has passed.

### Key Wave Characteristics

Regardless of whether a wave is transverse or longitudinal, continuous periodic waves share fundamental spatial and temporal characteristics. If the source of the wave oscillates in Simple Harmonic Motion (SHM), the resulting wave is a periodic **sinusoidal wave**.

* **Amplitude ($A$):** The maximum displacement of a particle in the medium from its equilibrium position. Amplitude is related to the energy transported by the wave.
* **Wavelength ($\lambda$):** The spatial distance over which the wave's shape repeats. It is the distance between two consecutive identical points on the wave (e.g., from crest to crest or compression to compression).
* **Period ($T$):** The time required for one complete wavelength to pass a fixed point in space. It is exactly equal to the period of the oscillating source.
* **Frequency ($f$):** The number of complete wave cycles that pass a fixed point per unit time. Frequency and period are inversely related:

$$f = \frac{1}{T}$$

**Wave Speed vs. Particle Speed**

A crucial conceptual distinction must be made between the wave speed ($v$) and the particle speed.

* The **wave speed** ($v$) is the rate at which the disturbance (or energy) propagates through the medium. For a mechanical wave, this speed is determined entirely by the physical properties of the medium (such as its elasticity and inertia), not by the source.
* The **particle speed** is the rate at which an individual element of the medium oscillates around its equilibrium position. This speed changes constantly (like the mass on a spring in Chapter 11), whereas the wave speed in a uniform medium is constant.

Since a wave travels a distance of one wavelength ($\lambda$) in a time equal to one period ($T$), the wave speed can be expressed as:

$$v = \frac{\lambda}{T}$$

Substituting $f = 1/T$, we arrive at the fundamental wave relationship:

$$v = f \lambda$$

This equation demonstrates that for a wave traveling in a specific medium (where $v$ is constant), frequency and wavelength are inversely proportional. A higher-frequency source will produce shorter wavelengths in the medium, and vice versa. In Section 12.2, we will build upon these characteristics to construct a rigorous mathematical model of traveling waves.

## 12.2 Mathematical Description of a Traveling Wave

To analyze mechanical waves rigorously, we need a mathematical model that describes the position of any particle in the medium at any given time. Because the displacement of a particle depends on both its spatial location and the time of observation, we require a function of two variables: position ($x$) and time ($t$). This is known as the **wave function**, typically denoted as $y(x, t)$.

### The Wave Function of a Moving Pulse

Let us first consider a single wave pulse traveling along a string stretched along the $x$-axis. We define $y$ as the transverse displacement of the string from its equilibrium position.

Suppose the pulse is moving to the right (in the $+x$ direction) with a constant wave speed $v$. At time $t = 0$, the shape of the pulse can be described by some function $f(x)$. Thus, $y(x, 0) = f(x)$.

After a time $t$ has elapsed, the entire pulse has moved a distance $vt$ to the right without changing its shape. A point on the wave that was originally at position $x$ is now at position $x + vt$. To find the displacement of the string at position $x$ and time $t$, we must evaluate the original function $f$ at the position $(x - vt)$. Therefore, the wave function for a right-traveling wave is:

$$y(x, t) = f(x - vt)$$

By the same logic, if the wave pulse were traveling to the left (in the $-x$ direction), the wave function would be:

$$y(x, t) = f(x + vt)$$

```text
    A Wave Pulse Traveling to the Right

    t = 0                            t = Δt
      y                                y
      ^                                ^
      |      /\                        |          /\
      |     /  \                       |         /  \
    --+----/----\--------> x         --+--------/----\----> x
      |   x=0                          |      v*Δt

```

### The Sinusoidal Wave Equation

While the function $f(x \pm vt)$ applies to a wave of any shape, periodic waves generated by Simple Harmonic Motion (SHM) are of special interest. These are **sinusoidal waves**.

Let's assume the displacement of the string at $t = 0$ forms a perfect sine curve:

$$y(x, 0) = A \sin\left(\frac{2\pi}{\lambda} x\right)$$

Here, $A$ is the amplitude, and $\lambda$ is the wavelength. Notice that the function repeats itself every time $x$ increases by one wavelength $\lambda$ (since $\sin(2\pi) = \sin(0)$).

To make this wave travel to the right with speed $v$, we apply the rule established above and replace $x$ with $(x - vt)$:

$$y(x, t) = A \sin\left[\frac{2\pi}{\lambda} (x - vt)\right]$$

### Angular Wave Number and Angular Frequency

The equation above is physically correct but can be written more compactly by introducing two important wave parameters.

First, we define the **angular wave number** ($k$), which represents the spatial periodicity of the wave:

$$k = \frac{2\pi}{\lambda}$$

The SI unit for $k$ is radians per meter ($\text{rad/m}$).

Second, recall the **angular frequency** ($\omega$) from our study of oscillators in Chapter 11, which represents the temporal periodicity:

$$\omega = \frac{2\pi}{T} = 2\pi f$$

The SI unit for $\omega$ is radians per second ($\text{rad/s}$).

From Section 12.1, we established the wave speed equation $v = \lambda f$, which can be rewritten as $v = \lambda / T$. We can express the wave speed $v$ in terms of $k$ and $\omega$:

$$v = \frac{\lambda}{T} = \frac{2\pi/k}{2\pi/\omega} = \frac{\omega}{k}$$

If we distribute the $2\pi/\lambda$ term in our traveling wave equation, we get:

$$y(x, t) = A \sin\left(\frac{2\pi}{\lambda} x - \frac{2\pi}{\lambda} v t\right)$$

Substituting $k = 2\pi/\lambda$ and noting that $kv = \omega$, we arrive at the standard mathematical representation of a traveling sinusoidal wave:

$$y(x, t) = A \sin(kx - \omega t)$$

*(Note: For a wave traveling in the $-x$ direction, the sign between the terms becomes positive: $y(x, t) = A \sin(kx + \omega t)$).*

### Phase and the Phase Constant

The entire argument of the sine function, $(kx - \omega t)$, is called the **phase** of the wave. The phase determines the state of oscillation for a specific particle at a specific time.

If the particle at $x = 0$ does not have zero displacement at $t = 0$, we must add a **phase constant** ($\phi$) to the argument to shift the wave to match the initial conditions:

$$y(x, t) = A \sin(kx - \omega t + \phi)$$

### Particle Velocity and Acceleration

It is crucial to distinguish mathematically between the wave speed ($v = \omega/k$) moving horizontally, and the transverse velocity ($v_y$) of a particle in the medium moving vertically.

To find the velocity of a specific particle, we must fix its position ($x$ is treated as a constant) and look at how its displacement changes with time. This requires taking the **partial derivative** of the wave function with respect to time $t$:

$$v_y = \frac{\partial y}{\partial t} = \frac{\partial}{\partial t} [A \sin(kx - \omega t)] = -\omega A \cos(kx - \omega t)$$

The maximum particle speed is therefore $v_{y,\text{max}} = \omega A$.

Similarly, the transverse acceleration ($a_y$) of the particle is the second partial derivative of the wave function with respect to time:

$$a_y = \frac{\partial^2 y}{\partial t^2} = \frac{\partial}{\partial t} [-\omega A \cos(kx - \omega t)] = -\omega^2 A \sin(kx - \omega t)$$

Because $y = A \sin(kx - \omega t)$, we can rewrite this as:

$$a_y = -\omega^2 y$$

This is the defining differential equation for Simple Harmonic Motion. It mathematically proves that as a sinusoidal wave passes through a medium, every individual particle in that medium undergoes simple harmonic motion around its equilibrium position.

## 12.3 Speed and Energy of a Wave on a String

In Section 12.1, we established that the speed of a mechanical wave is determined solely by the properties of the medium through which it travels. For any mechanical wave, this speed depends on two competing physical characteristics of the medium: an **elastic property** (which determines the restoring forces between particles) and an **inertial property** (which determines how sluggishly the particles respond to those forces).

The general relationship for the speed of a mechanical wave can be expressed as:

$$v = \sqrt{\frac{\text{Elastic Property}}{\text{Inertial Property}}}$$

To see how this applies to a specific case, let us examine the speed of a transverse wave traveling along a stretched string.

### Wave Speed on a Stretched String

Consider a string of mass $m$ and length $L$. The inertial property of the string is described by its **linear mass density** ($\mu$), which is the mass per unit length:

$$\mu = \frac{m}{L}$$

The SI unit for linear mass density is kilograms per meter ($\text{kg/m}$).

The elastic property of the string is provided by the **tension** ($F_T$) applied to it. When a wave pulse travels along the string, the string is displaced from equilibrium, creating a slight curvature. The tension acts tangentially along the string, producing a net restoring force that pulls the displaced segment back toward the equilibrium position.

```text
    Restoring Force on a String Segment
    
           y
           ^          Δs (string segment)
           |        .-----. 
       F_T |      /         \      F_T
         \_|__  /             \  __/_ 
           \ |/                 \| /
            \         |            /
             \        |           / 
              \      F_net       /
               \      |         /
                \     v        /
     -----------+--------------+-------------> x

```

If we analyze a very small segment of the string of length $\Delta s$ at the peak of a wave pulse, we can treat it as an arc of a circle with radius $R$. The tension $F_T$ pulls on both ends of the segment. The horizontal components of the tension cancel each other out, but the vertical components add together to provide a net downward restoring force ($F_{\text{net}}$).

By applying Newton's Second Law to this segment and assuming the wave amplitude is relatively small, it can be shown that the speed $v$ of the transverse wave is:

$$v = \sqrt{\frac{F_T}{\mu}}$$

This equation confirms our intuitive expectations:

1. **Increasing the tension ($F_T$) increases the wave speed.** A tighter string snaps back to equilibrium more forcefully, allowing the disturbance to propagate faster.
2. **Increasing the linear mass density ($\mu$) decreases the wave speed.** A thicker, heavier string has more inertia, meaning its particles accelerate more slowly in response to the restoring force, slowing down the wave's propagation.

### Energy Transport by a Wave on a String

Mechanical waves transport energy from one region of space to another without transporting matter. As a sinusoidal wave travels along a string, it continuously transfers energy to the individual string segments, causing them to oscillate in Simple Harmonic Motion (SHM).

The energy possessed by any small mass element ($dm$) of the string consists of two forms:

1. **Kinetic Energy ($K$):** Due to the element's transverse velocity ($v_y$) as it moves up and down.
2. **Potential Energy ($U$):** Due to the element stretching as the string deforms from its straight, resting state.

Let us examine a small element of the string of length $dx$ and mass $dm = \mu dx$. The kinetic energy ($dK$) of this element is:

$$dK = \frac{1}{2} dm v_y^2$$

Recall from Section 12.2 that the transverse particle velocity is $v_y = -\omega A \cos(kx - \omega t)$. Substituting this and $dm$ into our kinetic energy expression yields:

$$dK = \frac{1}{2} (\mu dx) [-\omega A \cos(kx - \omega t)]^2 = \frac{1}{2} \mu \omega^2 A^2 \cos^2(kx - \omega t) dx$$

The potential energy ($dU$) is associated with the work done to stretch the string element. Unlike a mass-spring system in SHM where kinetic and potential energy trade off (one is maximum when the other is zero), in a traveling wave, **kinetic and potential energy are entirely in phase**.

When a string element is at its maximum displacement (a crest or trough), it momentarily comes to rest ($v_y = 0$), meaning its kinetic energy is zero. At this point, the string is momentarily parallel to the $x$-axis and unstretched, so its potential energy is also zero. Conversely, as the element passes through the equilibrium position ($y = 0$), its transverse speed is maximum, and the string's slope is steepest, meaning it is stretched the most. Thus, both kinetic and potential energies are at their maximum at the equilibrium position.

Because $dK = dU$ at every point, the total energy ($dE = dK + dU$) of the string element is simply twice the kinetic energy:

$$dE = \mu \omega^2 A^2 \cos^2(kx - \omega t) dx$$

### Power of a Wave

The rate at which energy is transported along the string is the power ($P$) of the wave. Power is the energy transferred per unit time ($P = dE/dt$). Since the wave moves a distance $dx$ in a time $dt$ with speed $v = dx/dt$, we can divide the total energy equation by $dt$:

$$P = \frac{dE}{dt} = \mu v \omega^2 A^2 \cos^2(kx - \omega t)$$

This equation gives the instantaneous power, which fluctuates rapidly with time as the cosine squared term oscillates between $0$ and $1$. For practical purposes, we are usually interested in the **average power** ($P_{\text{avg}}$) transmitted over one or more full wave cycles.

The average value of $\cos^2(\theta)$ over a full cycle is exactly $1/2$. Therefore, the average power transported by a sinusoidal wave on a string is:

$$P_{\text{avg}} = \frac{1}{2} \mu v \omega^2 A^2$$

This fundamental result reveals that the rate of energy transfer is proportional to:

* The wave speed ($v$)
* The square of the angular frequency ($\omega^2$)
* The square of the amplitude ($A^2$)

The proportionality to the square of the amplitude and the square of the frequency is a universal characteristic of all mechanical waves, not just waves on strings. If you double the amplitude of a wave, you increase the energy it carries by a factor of four.

## 12.4 Interference and Superposition

When two solid objects, such as two billiard balls, collide, they cannot occupy the same space at the same time; they bounce off one another and alter their trajectories. Mechanical waves, however, behave entirely differently. Because waves are not matter themselves but rather disturbances traveling *through* a medium, two or more waves can occupy the same region of space simultaneously.

When two waves intersect, they pass right through each other and emerge from the encounter with their original shapes and directions completely unaltered. But what happens to the medium *while* the waves are overlapping? This behavior is governed by the **Principle of Superposition**.

### The Principle of Superposition

The Principle of Superposition states that when two or more traveling waves interact in a medium, the net displacement of the medium at any point in space and time is simply the algebraic sum of the displacements of the individual waves.

Mathematically, if $y_1(x, t)$ and $y_2(x, t)$ are the wave functions of two individual waves, the resulting wave function $y(x, t)$ of the combined disturbance is:

$$y(x, t) = y_1(x, t) + y_2(x, t)$$

This principle holds true as long as the restoring forces in the medium are strictly proportional to the displacement (i.e., the medium obeys Hooke's Law). Such a medium is called a **linear medium**. For waves with extremely large amplitudes, this linearity breaks down, and superposition no longer strictly applies, but for our study of basic mechanical waves, we will assume a perfectly linear medium.

The physical phenomenon that results from the superposition of two or more waves is called **interference**.

### Mathematical Analysis of Interference

To understand how interference works, let us examine the simplest case: two sinusoidal waves traveling in the same direction (along the $+x$-axis), having the exact same amplitude ($A$), wavelength ($\lambda$), and angular frequency ($\omega$). However, we will assume they have a constant **phase difference** ($\phi$) relative to one another.

The wave functions for these two waves are:

$$y_1(x, t) = A \sin(kx - \omega t)$$

$$y_2(x, t) = A \sin(kx - \omega t + \phi)$$

Applying the Principle of Superposition, we add the two wave functions:

$$y(x, t) = A \sin(kx - \omega t) + A \sin(kx - \omega t + \phi)$$

To simplify this expression, we use the trigonometric identity for the sum of two sines: $\sin a + \sin b = 2 \cos\left(\frac{a - b}{2}\right) \sin\left(\frac{a + b}{2}\right)$.
Letting $a = kx - \omega t$ and $b = kx - \omega t + \phi$, we obtain the resultant wave equation:

$$y(x, t) = \left[ 2A \cos\left(\frac{\phi}{2}\right) \right] \sin\left(kx - \omega t + \frac{\phi}{2}\right)$$

This remarkable result tells us three things about the superimposed wave:

1. **It is a traveling wave:** The sine term, $\sin(kx - \omega t + \phi/2)$, indicates a wave moving in the $+x$ direction with the same frequency and wavelength as the original waves.
2. **It has a new phase constant:** The resultant wave has a phase of $\phi/2$, exactly halfway between the phases of the two original waves.
3. **It has a modified amplitude:** The term in the square brackets acts as the new amplitude of the resultant wave. This resultant amplitude, $A_{\text{res}}$, depends entirely on the phase difference $\phi$:

$$A_{\text{res}} = \left| 2A \cos\left(\frac{\phi}{2}\right) \right|$$

### Constructive and Destructive Interference

The value of the phase difference $\phi$ dictates the nature of the interference. There are two extreme cases of profound physical importance:

**1. Constructive Interference (In-Phase)**
If the two waves are exactly in phase, their crests align with crests, and their troughs align with troughs. This occurs when the phase difference is zero, or any integer multiple of $2\pi$ radians:

$$\phi = 0, 2\pi, 4\pi, 6\pi, \dots = 2m\pi \quad (\text{where } m = 0, 1, 2, \dots)$$

Plugging this into our amplitude equation, $\cos(m\pi) = \pm 1$, so the resultant amplitude is:

$$A_{\text{res}} = | 2A(\pm 1) | = 2A$$

The resulting wave has an amplitude twice that of the individual waves. The waves have reinforced each other perfectly.

```text
    Constructive Interference 

    Wave 1:    /\        /\        (Amplitude = A)
              /  \      /  \  
    ---------/----\----/----\---
                   \  /      \  
                    \/        \/

    Wave 2:    /\        /\        (Amplitude = A)
              /  \      /  \  
    ---------/----\----/----\---
                   \  /      \  
                    \/        \/

    Result:    /\        /\        (Amplitude = 2A)
              /  \      /  \  
             /    \    /    \ 
    --------/------\--/------\--
                    \/        \/
                    \/        \/

```

**2. Destructive Interference (Out-of-Phase)**
If the two waves are exactly completely out of phase, the crest of one wave perfectly aligns with the trough of the other. This occurs when the phase difference is an odd multiple of $\pi$ radians:

$$\phi = \pi, 3\pi, 5\pi, \dots = (2m + 1)\pi \quad (\text{where } m = 0, 1, 2, \dots)$$

Plugging this into our amplitude equation, $\cos((2m+1)\pi/2) = 0$, so the resultant amplitude is:

$$A_{\text{res}} = | 2A(0) | = 0$$

The resulting wave has an amplitude of zero everywhere. The two waves have completely canceled each other out, leaving the medium undisturbed.

```text
    Destructive Interference 

    Wave 1:    /\        /\        (Amplitude = A)
              /  \      /  \  
    ---------/----\----/----\---
                   \  /      \  
                    \/        \/

    Wave 2:         /\        /\   (Amplitude = A)
                   /  \      /  \  
    --------------/----\----/----\
             \  /      \  /
              \/        \/

    Result: ---------------------- (Amplitude = 0)

```

For phase differences that do not perfectly fit these two extremes (e.g., $\phi = \pi/2$), the interference is said to be *intermediate*. The resultant amplitude will be greater than 0 but less than $2A$.

### Phase Difference and Path Difference

How does a phase difference between two waves arise physically? While it can occur if two wave sources are oscillating out of sync, the most common and important cause of a phase difference is a **path difference**.

Imagine two identical, perfectly synchronized wave sources (Source 1 and Source 2) emitting waves. If we observe a specific point $P$ in the medium, the wave from Source 1 travels a distance $x_1$ to reach $P$, while the wave from Source 2 travels a distance $x_2$.

The difference in the distance traveled is the path difference: $\Delta x = |x_2 - x_1|$.

Because a spatial shift of one full wavelength ($\lambda$) corresponds to a phase shift of one full cycle ($2\pi$ radians), we can relate the path difference directly to the phase difference $\phi$:

$$\frac{\phi}{2\pi} = \frac{\Delta x}{\lambda} \implies \phi = \frac{2\pi}{\lambda} \Delta x$$

By substituting this relationship into our conditions for interference, we find:

* **Constructive Interference:** $\Delta x = m\lambda$ (The path difference is an integer number of wavelengths).
* **Destructive Interference:** $\Delta x = (m + \frac{1}{2})\lambda$ (The path difference is a half-integer number of wavelengths).

This concept of relating path difference to interference will become a cornerstone of our study of sound waves (Chapter 13) and physical optics (Chapter 27), explaining phenomena ranging from acoustic dead zones in concert halls to the iridescent colors seen in soap bubbles.

## 12.5 Standing Waves and Normal Modes

In Section 12.4, we explored the superposition of waves traveling in the same direction. A dramatically different and profoundly important phenomenon occurs when two identical waves travel through the same medium in *opposite* directions. This situation typically arises when a traveling wave reaches a boundary and reflects back upon itself. The superposition of the incident wave and the reflected wave creates a **standing wave**.

Unlike traveling waves, standing waves do not appear to move through the medium. Instead, they oscillate in place, creating distinct spatial patterns of maximum and zero displacement.

### The Mathematics of Standing Waves

Consider a stretched string along the $x$-axis. A wave traveling to the right (the incident wave) and a wave traveling to the left (the reflected wave) have the same amplitude ($A$), angular frequency ($\omega$), and angular wave number ($k$). Their wave functions are:

$$y_1(x, t) = A \sin(kx - \omega t)$$

$$y_2(x, t) = A \sin(kx + \omega t)$$

According to the Principle of Superposition, the resultant wave $y(x, t)$ is the sum of these two functions:

$$y(x, t) = A \sin(kx - \omega t) + A \sin(kx + \omega t)$$

We can simplify this using the trigonometric identity $\sin a + \sin b = 2 \sin\left(\frac{a+b}{2}\right) \cos\left(\frac{a-b}{2}\right)$:

$$y(x, t) = 2A \sin(kx) \cos(-\omega t)$$

Since the cosine function is even, $\cos(-\omega t) = \cos(\omega t)$. The final equation for the standing wave is:

$$y(x, t) = [2A \sin(kx)] \cos(\omega t)$$

This mathematical form is revealing. It is not a function of $(x \pm vt)$, meaning it is no longer a traveling wave. Instead, the equation separates the spatial dependence and the temporal dependence.

* The term $\cos(\omega t)$ tells us that every particle on the string oscillates in Simple Harmonic Motion with the same angular frequency $\omega$.
* The bracketed term, $2A \sin(kx)$, acts as a position-dependent amplitude. We can call this the amplitude function, $A(x)$.

### Nodes and Antinodes

Because the amplitude depends on position, different parts of the string oscillate with different maximum displacements.

**Nodes** are points where the amplitude is permanently zero. This occurs where $\sin(kx) = 0$.

$$kx = m\pi \quad (\text{where } m = 0, 1, 2, \dots)$$

Substituting $k = 2\pi/\lambda$, we find the positions of the nodes:

$$x = m\frac{\lambda}{2} = 0, \frac{\lambda}{2}, \lambda, \frac{3\lambda}{2}, \dots$$

Nodes are spaced exactly half a wavelength ($\lambda/2$) apart. These points never move; they represent locations of permanent destructive interference.

**Antinodes** are points where the amplitude reaches its maximum possible value of $2A$. This occurs where $\sin(kx) = \pm 1$.

$$kx = \left(m + \frac{1}{2}\right)\pi \quad (\text{where } m = 0, 1, 2, \dots)$$

Substituting $k = 2\pi/\lambda$ yields the positions of the antinodes:

$$x = \left(m + \frac{1}{2}\right)\frac{\lambda}{2} = \frac{\lambda}{4}, \frac{3\lambda}{4}, \frac{5\lambda}{4}, \dots$$

Antinodes are located exactly halfway between the nodes. They represent locations of permanent constructive interference.

### Boundary Conditions and Normal Modes

If we take a string of length $L$ and clamp it firmly at both ends (such as a guitar string), we impose physical constraints called **boundary conditions**. Because the string cannot move at the clamps, the ends of the string at $x = 0$ and $x = L$ must inherently be nodes.

The condition at $x = 0$ is naturally satisfied by our standing wave equation, since $\sin(0) = 0$.
To satisfy the condition at $x = L$, we must have:

$$2A \sin(kL) = 0$$

Since the amplitude $A$ cannot be zero (otherwise there is no wave), we must require $\sin(kL) = 0$. This means $kL$ must be an integer multiple of $\pi$:

$$k_n L = n\pi \quad (\text{where } n = 1, 2, 3, \dots)$$

Substituting $k_n = 2\pi/\lambda_n$, we find that only specific, discrete wavelengths can form standing waves on this string:

$$\lambda_n = \frac{2L}{n}$$

These allowed wavelengths correspond to specific frequencies. Using $v = f\lambda$, the allowed frequencies are:

$$f_n = \frac{v}{\lambda_n} = n\left(\frac{v}{2L}\right)$$

These specific, naturally occurring patterns of oscillation are called **normal modes**.

* **The Fundamental Mode ($n = 1$):** This is the simplest standing wave, consisting of one antinode bounded by the two nodes at the ends. The length of the string equals half a wavelength ($L = \lambda_1/2$). The corresponding frequency, $f_1 = v/2L$, is called the **fundamental frequency** or the **first harmonic**.
* **Higher Harmonics ($n > 1$):** The frequencies for $n = 2, 3, 4, \dots$ are integer multiples of the fundamental frequency ($f_n = n f_1$). These are called **harmonics** or overtones.

```text
    Standing Waves on a String Fixed at Both Ends

    n = 1 (First Harmonic / Fundamental)
    L = λ₁ / 2    ;    f₁ = v / 2L
    
    Node                 Antinode                 Node
     *---------------------------------------------*
      \                                           /
       \                                         /
        - - - - - - - - - - - - - - - - - - - - -
        /                                         \
       /                                           \
     *---------------------------------------------*

    n = 2 (Second Harmonic)
    L = λ₂        ;    f₂ = 2f₁
    
    Node       Antinode       Node       Antinode       Node
     *-------------------------*-------------------------*
      \                       / \                       /
       \                     /   \                     /
        - - - - - - - - - - -     - - - - - - - - - - -
        /                   \     /                   \
       /                     \   /                     \
     *-------------------------*-------------------------*

    n = 3 (Third Harmonic)
    L = 3λ₃ / 2   ;    f₃ = 3f₁
    
     N      A      N      A      N      A      N
     *-------------*-------------*-------------*
      \           / \           / \           /
       - - - - - -   - - - - - -   - - - - - -
      /           \ /           \ /           \
     *-------------*-------------*-------------*

```

Because the wave speed on a string is given by $v = \sqrt{F_T/\mu}$ (Section 12.3), we can write a comprehensive formula for the harmonic frequencies of a string fixed at both ends:

$$f_n = \frac{n}{2L} \sqrt{\frac{F_T}{\mu}}$$

This single equation explains how stringed instruments work:

1. Shortening the string (decreasing $L$) increases the frequency (higher pitch).
2. Tightening the string (increasing tension $F_T$) increases the frequency.
3. Using a thicker, heavier string (increasing linear mass density $\mu$) decreases the frequency.

When a guitar string is plucked, it rarely vibrates in just one mode. Instead, its motion is a complex superposition of the fundamental frequency and many higher harmonics simultaneously. It is the specific mixture of these harmonics—determined by where and how the string is plucked—that gives each instrument its unique tone quality, or timbre.

## Chapter Summary

* **Mechanical Waves:** A mechanical wave is a disturbance propagating through a medium, transferring energy and momentum without transporting the medium's matter. Waves can be classified as **transverse** (particle motion perpendicular to wave propagation) or **longitudinal** (particle motion parallel to wave propagation).
* **Wave Parameters:** All periodic waves are characterized by amplitude ($A$), wavelength ($\lambda$), period ($T$), frequency ($f$), and wave speed ($v$). These are related by the fundamental wave equation: $v = f\lambda$.
* **Mathematical Description:** A traveling sinusoidal wave moving in the $+x$ direction is described by the wave function $y(x, t) = A \sin(kx - \omega t)$, where $k = 2\pi/\lambda$ is the angular wave number and $\omega = 2\pi/T$ is the angular frequency. The wave speed can be expressed as $v = \omega/k$.
* **Speed and Energy:** The speed of a wave on a stretched string depends on the string's tension ($F_T$) and linear mass density ($\mu$): $v = \sqrt{F_T/\mu}$. The average power transported by this wave is proportional to the square of both its amplitude and its angular frequency: $P_{\text{avg}} = \frac{1}{2} \mu v \omega^2 A^2$.
* **Superposition and Interference:** When multiple waves overlap in a linear medium, their displacements add algebraically. This leads to **interference**. Constructive interference occurs when waves are in phase (path difference $\Delta x = m\lambda$), amplifying the disturbance. Destructive interference occurs when waves are exactly out of phase (path difference $\Delta x = (m + 1/2)\lambda$), canceling the disturbance.
* **Standing Waves:** Two identical waves traveling in opposite directions superimpose to form a standing wave, described by $y(x, t) = [2A \sin(kx)] \cos(\omega t)$. The medium forms fixed points of zero amplitude (**nodes**) separated by $\lambda/2$, and points of maximum amplitude (**antinodes**) situated halfway between the nodes.
* **Normal Modes:** A string of length $L$ fixed at both ends can only sustain standing waves that fit the boundary conditions (nodes at both ends). This restricts the allowed wavelengths to $\lambda_n = 2L/n$ and creates a quantized series of resonant frequencies called harmonics, given by $f_n = n(v/2L)$.
