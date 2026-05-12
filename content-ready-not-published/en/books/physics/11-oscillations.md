From the ticking of a clock to the invisible vibrations of atoms, oscillatory motion is everywhere. In this chapter, we explore the physics of periodic motion, starting with its most fundamental form: Simple Harmonic Motion (SHM). We will investigate how restoring forces cause objects to move in predictable patterns, analyzing the continuous exchange of kinetic and potential energy in mass-spring systems and pendulums. Finally, we will examine how real-world systems lose energy over time through damped oscillations, and how external periodic forces can drive them to dramatic extremes through the powerful phenomenon of resonance.

## 11.1 Simple Harmonic Motion (SHM)

Many systems in nature oscillate, from a vibrating guitar string to the atoms in a solid crystal. The most fundamental type of oscillation is **Simple Harmonic Motion (SHM)**. A particle undergoes SHM when the restoring force acting on it is directly proportional to its displacement from equilibrium and is directed opposite to the displacement.

### The Restoring Force and Hooke's Law

Consider a block of mass $m$ attached to an ideal, massless spring resting on a frictionless horizontal surface. As established in earlier discussions of force, the force exerted by the spring on the block is given by Hooke's Law:

$$F_x = -kx$$

* **$F_x$** is the restoring force.
* **$k$** is the force constant (or spring constant) of the spring, measured in N/m.
* **$x$** is the displacement of the block from its equilibrium position ($x = 0$).
* The negative sign indicates that the force always acts to restore the mass toward the equilibrium position.

```text
Equilibrium (x = 0): No net force
|    /\/\/\/\/\/\---| m |
|                   ---
|-------|-------|-------|
      -A        0       +A

Stretched (x > 0): Restoring force points left
|    /\/\/\/\/\/\/\/\---| m |  <-- F_x
|                       ---
|-------|-------|-------|
      -A        0       +A

Compressed (x < 0): Restoring force points right
|    /\/\/\---| m |  --> F_x
|             ---
|-------|-------|-------|
      -A        0       +A

```

### The Differential Equation of SHM

By applying Newton's Second Law ($F_{net} = ma_x$) to the mass-spring system, we can determine the kinematics of the oscillator:

$$-kx = ma_x$$

Since acceleration $a_x$ is the second derivative of position with respect to time ($a_x = \frac{d^2x}{dt^2}$), we can rewrite this as:

$$-kx = m\frac{d^2x}{dt^2}$$

$$\frac{d^2x}{dt^2} = -\frac{k}{m}x$$

This is a second-order linear differential equation. To simplify it, we define a new constant, the **angular frequency** ($\omega$):

$$\omega = \sqrt{\frac{k}{m}}$$

Substituting $\omega^2$ into the differential equation yields the defining mathematical condition for Simple Harmonic Motion:

$$\frac{d^2x}{dt^2} = -\omega^2 x$$

Any system whose acceleration is proportional to the negative of its displacement undergoes SHM.

### Kinematic Equations for SHM

The solution to the SHM differential equation provides the position of the particle as a function of time:

$$x(t) = A \cos(\omega t + \phi)$$

The parameters in this equation describe the physical characteristics of the motion:

* **Amplitude ($A$):** The maximum displacement from equilibrium. The system oscillates between $x = +A$ and $x = -A$.
* **Angular Frequency ($\omega$):** Measures how rapidly the oscillations occur, measured in rad/s.
* **Phase Constant ($\phi$):** Determines the initial position and velocity of the oscillator at $t = 0$.
* **Phase ($\omega t + \phi$):** The entire argument of the cosine function.

By taking successive time derivatives of the position function, we find the velocity $v(t)$ and acceleration $a(t)$ of the oscillator:

$$v(t) = \frac{dx}{dt} = -A\omega \sin(\omega t + \phi)$$

$$a(t) = \frac{dv}{dt} = -A\omega^2 \cos(\omega t + \phi)$$

Notice that $a(t) = -\omega^2 x(t)$, which perfectly satisfies our initial differential equation. The maximum values for speed and acceleration occur at different points in the cycle:

* **Maximum speed ($v_{max} = A\omega$):** Occurs as the mass passes through the equilibrium position ($x = 0$).
* **Maximum acceleration ($a_{max} = A\omega^2$):** Occurs at the turning points ($x = \pm A$) where the restoring force is greatest.

### Period and Frequency

The motion repeats itself after a specific time interval. The time required to complete one full cycle is the **period** ($T$). Because the cosine function repeats every $2\pi$ radians, the phase must increase by $2\pi$ over one period:

$$\omega T = 2\pi$$

$$T = \frac{2\pi}{\omega}$$

Substituting the expression for $\omega$ for a mass-spring system, we find:

$$T = 2\pi \sqrt{\frac{m}{k}}$$

The **frequency** ($f$) is the number of oscillations completed per unit time (measured in Hertz, Hz). It is the reciprocal of the period:

$$f = \frac{1}{T} = \frac{\omega}{2\pi} = \frac{1}{2\pi} \sqrt{\frac{k}{m}}$$

A crucial characteristic of SHM is that the period and frequency depend only on the mass $m$ and the force constant $k$. They are entirely independent of the amplitude $A$. A mass oscillating with a small amplitude completes a cycle in the exact same amount of time as it would oscillating with a large amplitude.

### Graphical Representation of SHM

Plotting position $x(t)$ versus time produces a sinusoidal curve. The distance between two consecutive peaks represents one full period ($T$), while the height of the peaks represents the amplitude ($A$).

```text
 x(t)
  ^
+A|      ***             ***
  |    *     *         *     *
 0|---*-------*-------*-------*---> t
  |  *         *     *         *
-A| *           *** *           ***
  |
  | |<------ T ------>|

```

The corresponding velocity and acceleration graphs are also sinusoidal but shifted in phase. Velocity is shifted by a quarter-cycle ($\pi/2$ rad) relative to position, and acceleration is shifted by a half-cycle ($\pi$ rad), meaning acceleration is precisely out of phase with position.

## 11.2 Energy in Simple Harmonic Motion

As a system undergoes simple harmonic motion (SHM), its energy continuously transforms back and forth between kinetic and potential forms. In an ideal oscillator—where there are no non-conservative forces like friction or air resistance—the total mechanical energy of the system remains perfectly constant.

### Kinetic Energy in SHM

The kinetic energy ($K$) of a particle of mass $m$ is given by the familiar equation $K = \frac{1}{2}mv^2$. We can substitute the velocity function for SHM, $v(t) = -A\omega \sin(\omega t + \phi)$, derived in the previous section:

$$K = \frac{1}{2}m \left( -A\omega \sin(\omega t + \phi) \right)^2$$

$$K = \frac{1}{2}mA^2\omega^2 \sin^2(\omega t + \phi)$$

Recall that the angular frequency is defined as $\omega = \sqrt{k/m}$, which means $\omega^2 = k/m$. By substituting $k = m\omega^2$ into the equation, we can express the kinetic energy strictly in terms of the force constant:

$$K = \frac{1}{2}kA^2 \sin^2(\omega t + \phi)$$

Because the sine squared function oscillates between 0 and 1, the kinetic energy fluctuates over time. It reaches its maximum value ($K_{max} = \frac{1}{2}kA^2$) when the mass passes through the equilibrium position ($x = 0$), where its speed is greatest. It drops to zero at the turning points ($x = \pm A$), where the mass momentarily stops.

### Potential Energy in SHM

The potential energy ($U$) of a system depends on the specific restoring force. For a mass-spring system, the elastic potential energy is $U = \frac{1}{2}kx^2$. Using the position function $x(t) = A \cos(\omega t + \phi)$, the potential energy as a function of time is:

$$U = \frac{1}{2}k \left( A \cos(\omega t + \phi) \right)^2$$

$$U = \frac{1}{2}kA^2 \cos^2(\omega t + \phi)$$

Like kinetic energy, potential energy oscillates between 0 and $\frac{1}{2}kA^2$. It is at its maximum at the turning points ($x = \pm A$), where the spring is maximally stretched or compressed. It is zero at the equilibrium position ($x = 0$), where the spring is relaxed.

### The Conservation of Total Mechanical Energy

The total mechanical energy ($E$) of the oscillator is the sum of its kinetic and potential energies:

$$E = K + U$$

$$E = \frac{1}{2}kA^2 \sin^2(\omega t + \phi) + \frac{1}{2}kA^2 \cos^2(\omega t + \phi)$$

Factoring out the common term yields:

$$E = \frac{1}{2}kA^2 \left[ \sin^2(\omega t + \phi) + \cos^2(\omega t + \phi) \right]$$

Applying the fundamental Pythagorean trigonometric identity, $\sin^2\theta + \cos^2\theta = 1$, the expression simplifies remarkably to:

$$E = \frac{1}{2}kA^2$$

This result reveals a profound characteristic of SHM: **the total mechanical energy is constant and is entirely determined by the force constant of the system and the square of the amplitude.** It does not change with time.

The relationship between $K$, $U$, and $E$ with respect to position can be visualized graphically:

```text
     Energy
        ^
      E |=================================== Total Energy (E = 1/2 kA^2)
        | *               .               *
        |   *           .   .           *  
        |     *       .       .       *    <-- Potential Energy (U)
        |       *   .           .   *      
        |         *               *        <-- Kinetic Energy (K)
      0 |---------*-------|-------*--------> Position (x)
                 -A       0      +A

```

*Legend: The asterisks (`*`) trace the parabolic potential energy curve $U(x) = \frac{1}{2}kx^2$. The dots (`.`) trace the inverted kinetic energy curve $K(x) = E - U(x)$.*

### Velocity as a Function of Position

The conservation of energy provides a powerful tool for analyzing the motion of the oscillator without relying directly on time. By setting the sum of kinetic and potential energy equal to the total energy at any arbitrary position $x$, we can find the velocity of the mass at that exact position:

$$K + U = E$$

$$\frac{1}{2}mv^2 + \frac{1}{2}kx^2 = \frac{1}{2}kA^2$$

We can multiply the entire equation by 2 to eliminate the fractions and then solve for $v^2$:

$$mv^2 + kx^2 = kA^2$$

$$mv^2 = kA^2 - kx^2$$

$$v^2 = \frac{k}{m}(A^2 - x^2)$$

Taking the square root of both sides gives the velocity as a function of position:

$$v = \pm \sqrt{\frac{k}{m}(A^2 - x^2)}$$

Or, substituting $\omega = \sqrt{k/m}$:

$$v = \pm \omega \sqrt{A^2 - x^2}$$

The $\pm$ sign correctly indicates that for any given position between $-A$ and $+A$, the particle could be moving in either the positive or negative direction. This equation perfectly confirms our earlier kinematic observations:

* When $x = \pm A$, $v = 0$ (the turning points).
* When $x = 0$, $v = \pm \omega A$ (the maximum speed occurs at equilibrium).

## 11.3 The Simple and Physical Pendulum

A pendulum is another classic example of an oscillating system. While a mass on a spring relies on an elastic restoring force, a pendulum relies on the gravitational force. We categorize pendulums into two models: the idealized simple pendulum and the more realistic physical pendulum.

### The Simple Pendulum

A **simple pendulum** is an idealized mechanical model consisting of a point mass (the bob), denoted by $m$, suspended by a massless, unstretchable string of length $L$. When pulled away from its vertical equilibrium position and released, the pendulum swings back and forth in a circular arc.

To understand its motion, we must analyze the forces acting on the bob. The two fundamental forces are the tension $T$ from the string and the gravitational force $mg$ acting straight down.

```text
       Pivot
      ///////
         |
         | \
         |  \ Length (L)
         |   \
         | θ  \
         |     \
         |      O  Mass (m)
         |     /| \
         |    / |  \  F_t = -mg sin(θ)
         |   /  |   v
         |  v   v
         |  T   mg

```

Because the bob moves along a circular arc, it is most convenient to define a coordinate axis along this arc. The displacement $s$ from equilibrium is the arc length, which is related to the angle $\theta$ (in radians) by the geometric relation $s = L\theta$.

We resolve the gravitational force into two components:

1. A radial component $mg \cos\theta$ that points outward along the line of the string. This component is balanced by the tension $T$ (along with providing the necessary centripetal force for the circular path).
2. A tangential component $mg \sin\theta$ that is tangent to the arc.

The tangential component is the only force acting in the direction of motion, so it serves as the restoring force $F_t$:

$$F_t = -mg \sin\theta$$

The negative sign indicates that the force always acts opposite to the angular displacement $\theta$, pushing the bob back toward equilibrium ($\theta = 0$).

Applying Newton's Second Law for tangential motion ($F_t = ma_t$):

$$-mg \sin\theta = m \frac{d^2s}{dt^2}$$

Since $s = L\theta$ and $L$ is constant, the tangential acceleration is $\frac{d^2s}{dt^2} = L \frac{d^2\theta}{dt^2}$. Substituting this in:

$$-mg \sin\theta = mL \frac{d^2\theta}{dt^2}$$

$$\frac{d^2\theta}{dt^2} = -\frac{g}{L} \sin\theta$$

This differential equation does *not* match the strict condition for simple harmonic motion (SHM), which requires the acceleration to be directly proportional to $\theta$, not $\sin\theta$. Therefore, the motion of a pendulum is generally not SHM.

#### The Small-Angle Approximation

However, if the pendulum swings through a small angle (typically less than $10^\circ$ or about $0.17$ rad), we can use the **small-angle approximation**, where $\sin\theta \approx \theta$ (when $\theta$ is measured in radians). With this approximation, the differential equation simplifies to:

$$\frac{d^2\theta}{dt^2} = -\frac{g}{L}\theta$$

This equation has the exact mathematical form of the SHM equation ($\frac{d^2x}{dt^2} = -\omega^2 x$), with $\theta$ replacing $x$. The angular frequency of the simple pendulum is therefore:

$$\omega = \sqrt{\frac{g}{L}}$$

The period $T$ of a simple pendulum undergoing small oscillations is:

$$T = \frac{2\pi}{\omega} = 2\pi \sqrt{\frac{L}{g}}$$

Remarkably, the period and frequency of a simple pendulum are entirely independent of its mass. A heavy pendulum bob and a light pendulum bob on strings of the same length will swing with the exact same period.

### The Physical Pendulum

In reality, objects are not point masses on massless strings. Any rigid body suspended from a fixed axis that does not pass through its center of mass will oscillate when displaced. This system is called a **physical pendulum**.

```text
          Pivot Axis (O)
           +
          / \
         / | \  Distance (d)
        /  |  \
       |   *   | Center of Mass (CM)
        \  |  /
         --|--
           v
           mg

```

Instead of analyzing linear forces along an arc, it is easier to analyze the rotational dynamics of the physical pendulum using torque. Suppose a rigid body of mass $m$ is pivoted at point $O$, which is a distance $d$ away from its center of mass (CM).

When the body is displaced by an angle $\theta$, gravity acts entirely at the center of mass. The torque $\tau$ about the pivot point $O$ is produced by the gravitational force. The lever arm for this force is $d \sin\theta$, so the restoring torque is:

$$\tau = -mgd \sin\theta$$

Applying Newton's Second Law for rotation ($\tau = I\alpha$, where $I$ is the moment of inertia about the pivot and $\alpha = \frac{d^2\theta}{dt^2}$):

$$-mgd \sin\theta = I \frac{d^2\theta}{dt^2}$$

$$\frac{d^2\theta}{dt^2} = -\left(\frac{mgd}{I}\right) \sin\theta$$

Once again, this is not exactly SHM. But applying the small-angle approximation ($\sin\theta \approx \theta$), we get:

$$\frac{d^2\theta}{dt^2} = -\left(\frac{mgd}{I}\right) \theta$$

This is the equation for SHM, with an angular frequency $\omega$ given by:

$$\omega = \sqrt{\frac{mgd}{I}}$$

The period of a physical pendulum for small oscillations is:

$$T = 2\pi \sqrt{\frac{I}{mgd}}$$

This formula can be used to measure the moment of inertia of complex, irregular objects by suspending them, measuring their mass and distance to the center of mass, and timing their period of oscillation.

Notice that if the physical pendulum is just a point mass $m$ at the end of a massless string of length $L$, then $d = L$ and the moment of inertia about the pivot is $I = mL^2$. Substituting these into the physical pendulum period equation yields $T = 2\pi \sqrt{mL^2 / (mgL)} = 2\pi \sqrt{L/g}$, neatly recovering the simple pendulum formula.

## 11.4 Damped Oscillations

In the ideal simple harmonic oscillators discussed previously, we assumed that no non-conservative forces were acting on the system. Under those ideal conditions, the total mechanical energy remains constant, and the system oscillates with a constant amplitude forever. In reality, all mechanical systems experience some form of friction or fluid drag. These forces dissipate mechanical energy, causing the amplitude of the oscillations to decrease over time. This process is known as **damping**, and the resulting motion is called a **damped oscillation**.

### The Damping Force and the Differential Equation

When an object moves through a fluid (like air or water) at relatively low speeds, it experiences a drag force that is approximately proportional to its velocity. This damping force ($F_d$) acts in the direction opposite to the motion:

$$F_d = -bv$$

* **$v$** is the velocity of the object ($v = \frac{dx}{dt}$).
* **$b$** is the damping constant, a property of the system that depends on the shape and size of the object and the viscosity of the fluid. Its SI unit is kg/s.
* The negative sign indicates that the force always opposes the velocity.

Let us add this damping force to an ideal mass-spring system. The net force acting on the mass $m$ is now the sum of the restoring force (Hooke's Law) and the damping force. Applying Newton's Second Law ($F_{net} = ma$):

$$-kx - bv = ma$$

Expressing velocity and acceleration as derivatives of position with respect to time ($v = \frac{dx}{dt}$ and $a = \frac{d^2x}{dt^2}$), we obtain the differential equation for damped harmonic motion:

$$-kx - b\frac{dx}{dt} = m\frac{d^2x}{dt^2}$$

$$m\frac{d^2x}{dt^2} + b\frac{dx}{dt} + kx = 0$$

### Underdamped Oscillations

If the damping constant $b$ is relatively small, the system will still oscillate, but its amplitude will gradually decay. This condition is called **underdamping**. The mathematical solution to the differential equation for an underdamped system is:

$$x(t) = A e^{-\frac{b}{2m}t} \cos(\omega' t + \phi)$$

This equation resembles the standard position function for SHM, $x(t) = A \cos(\omega t + \phi)$, but with two crucial differences:

1. **Exponential Decay Envelope:** The constant amplitude $A$ is replaced by a time-dependent amplitude, $A e^{-(b/2m)t}$. This term acts as an "envelope" that constrains the cosine wave, causing the maximum displacement to decrease exponentially over time.
2. **Damped Angular Frequency:** The angular frequency of the damped system ($\omega'$) is lower than the natural angular frequency ($\omega_0 = \sqrt{k/m}$) of the undamped system. It is given by:

$$\omega' = \sqrt{\frac{k}{m} - \left(\frac{b}{2m}\right)^2} = \sqrt{\omega_0^2 - \left(\frac{b}{2m}\right)^2}$$

Because $\omega'$ is smaller than $\omega_0$, the period of a damped oscillator ($T' = 2\pi / \omega'$) is slightly longer than the period of the same oscillator without damping.

```text
 x(t)
  ^
+A| .*.*.*.                           <-- Upper Envelope: +A e^{-(b/2m)t}
  | *       *  
  |*         *    .*.*.
  |           *  *     *
 0|------------**-------**----------> t
  |             *         *  *
  |            *           **
  |.*.*.*.*.*.*                   <-- Lower Envelope: -A e^{-(b/2m)t}
  |

```

### Energy in a Damped Oscillator

Because the amplitude $A(t) = A e^{-(b/2m)t}$ decreases over time, the total mechanical energy of the system is no longer constant. For an undamped oscillator, $E = \frac{1}{2}kA^2$. For a lightly damped oscillator, we substitute the time-dependent amplitude into the energy equation:

$$E(t) = \frac{1}{2}k \left( A e^{-\frac{b}{2m}t} \right)^2$$

$$E(t) = \frac{1}{2}kA^2 e^{-\frac{b}{m}t}$$

$$E(t) = E_0 e^{-\frac{b}{m}t}$$

Where $E_0$ is the initial mechanical energy at $t=0$. The total mechanical energy decreases exponentially, continuously transformed into internal thermal energy by the fluid drag. Notice that the energy decays twice as fast as the amplitude (the exponent is $-b/m$ rather than $-b/2m$).

### Critically Damped and Overdamped Systems

As the damping constant $b$ increases, the term under the square root in the $\omega'$ equation, $\omega_0^2 - (b/2m)^2$, approaches zero. Depending on the size of $b$, the system behaves in one of three distinct ways:

1. **Underdamped ($b < 2\sqrt{mk}$):** The system oscillates with exponentially decreasing amplitude, as described above. The term under the square root is positive, so $\omega'$ is a real number.
2. **Critically Damped ($b = 2\sqrt{mk}$):** The term under the square root becomes exactly zero, meaning the angular frequency $\omega'$ drops to zero. The system no longer oscillates. When displaced and released, a critically damped system returns to its equilibrium position in the shortest possible time without crossing the equilibrium point.
3. **Overdamped ($b > 2\sqrt{mk}$):** The damping force is so strong that the system returns to equilibrium very slowly, without oscillating. The fluid is highly viscous (e.g., a mass moving through thick honey).

```text
 x(t)
  ^
+A|***  
  |   \       (3) Overdamped
  |    \  
  |     \         (2) Critically Damped
  |      |  
  |      |            (1) Underdamped
  |       \   (3)
  |       |   (2)
  |        \  (1)
 0|---------\--|--------|--------------> t
  |          \ |       /
  |           \|      /
  |            * * * *

```

Engineers carefully tune damping constants depending on the application. For example, the suspension system of a car is designed to be slightly underdamped or critically damped so that the car returns to equilibrium smoothly after hitting a bump, without bouncing repeatedly (underdamped) or taking too long to restore its height (overdamped). Analog dial scales are critically damped so the needle settles on the correct measurement as quickly as possible.

## 11.5 Driven Oscillations and Resonance

In the preceding section, we saw that a damped oscillator left to itself will eventually come to rest. However, we can maintain the oscillations by applying an external, time-varying force to the system. When an oscillating system is continuously subjected to a periodic external force, it undergoes **driven oscillations** (or forced oscillations).

### The Driven Oscillator Equation

Consider a damped mass-spring system (with mass $m$, spring constant $k$, and damping constant $b$) subjected to an external driving force $F_{ext}$ that varies sinusoidally with time. We can express this driving force as:

$$F_{ext}(t) = F_0 \cos(\omega_d t)$$

* **$F_0$** is the maximum amplitude of the driving force.
* **$\omega_d$** is the **driving angular frequency**, which is determined entirely by the external source, not by the physical characteristics of the oscillator.

Adding this driving force to the restoring force ($-kx$) and the damping force ($-bv$), Newton's Second Law yields the differential equation for a driven, damped oscillator:

$$-kx - b\frac{dx}{dt} + F_0 \cos(\omega_d t) = m\frac{d^2x}{dt^2}$$

Rearranging into standard form:

$$m\frac{d^2x}{dt^2} + b\frac{dx}{dt} + kx = F_0 \cos(\omega_d t)$$

### Steady-State Motion

When the driving force is first applied, the motion of the mass is complex, consisting of a combination of its natural damped motion (the *transient* state) and the motion imposed by the driver. Because of damping, the transient motion eventually dies out.

What remains is the **steady-state motion**. In the steady state, the system oscillates at the exact same frequency as the driving force ($\omega_d$), regardless of its own natural frequency ($\omega_0 = \sqrt{k/m}$). The steady-state solution to the differential equation is:

$$x(t) = A \cos(\omega_d t + \phi)$$

While the system is forced to oscillate at $\omega_d$, the resulting amplitude $A$ and phase constant $\phi$ depend heavily on the relationship between the driving frequency $\omega_d$ and the natural frequency $\omega_0$. By substituting the steady-state solution back into the differential equation, the amplitude $A$ can be shown to be:

$$A = \frac{F_0}{\sqrt{m^2(\omega_0^2 - \omega_d^2)^2 + b^2\omega_d^2}}$$

### Resonance

The equation for amplitude $A$ reveals a profound physical phenomenon. Notice the term $(\omega_0^2 - \omega_d^2)^2$ in the denominator. If the driving frequency $\omega_d$ is very different from the natural frequency $\omega_0$, this term is large, making the denominator large and the resulting amplitude small.

However, if we tune the driving frequency so that it exactly matches the system's natural frequency ($\omega_d = \omega_0$), the term $(\omega_0^2 - \omega_d^2)^2$ becomes zero. At this specific frequency, the denominator reaches its minimum value (determined only by the damping constant $b$), and the amplitude $A$ reaches its maximum possible value.

This dramatic increase in amplitude when the driving frequency matches the natural frequency is called **resonance**. The natural frequency $\omega_0$ is often referred to as the **resonant frequency** of the system.

At resonance ($\omega_d = \omega_0$), the amplitude equation simplifies to:

$$A_{max} = \frac{F_0}{b\omega_0}$$

### The Effect of Damping on Resonance

The severity of the resonance peak depends entirely on the damping constant $b$.

* **Light Damping (small $b$):** The resonance peak is extremely high and narrow. The system is highly sensitive to the driving frequency; even a slight mismatch causes the amplitude to drop off rapidly.
* **Heavy Damping (large $b$):** The resonance peak is much lower and broader. The system absorbs energy from the driver over a wider range of frequencies, but never achieves a massive amplitude.

```text
 Amplitude (A)
      ^
      |      *      <-- Light damping (small b)
      |     * *     
      |    *   *    
      |   *     *        *    <-- Moderate damping
      |  *       *     *   *  
      | *         *   *     *      * * *  <-- Heavy damping (large b)
      |*           * *       *   *       *
     0|------------------|-----------------------> Driving Frequency (ω_d)
                         ω_0
                    (Resonance)

```

### Real-World Applications and Consequences

Resonance is a ubiquitous phenomenon across all branches of physics and engineering.

* **Mechanical Resonance:** Pushing a child on a swing requires timing the pushes to match the swing's natural frequency to achieve a high arc. Conversely, mechanical resonance can be destructive; marching soldiers break step when crossing a bridge to prevent their rhythmic footfalls from matching the bridge's resonant frequency and causing structural failure.
* **Acoustic Resonance:** Musical instruments rely on resonance. The body of a violin resonates with the vibrations of the strings, amplifying the sound. A singer can shatter a wine glass by sustaining a loud note at the exact resonant frequency of the glass.
* **Electromagnetic Resonance:** Tuning a radio to a specific station involves adjusting the capacitance or inductance in an electrical circuit so that its resonant frequency matches the frequency of the incoming broadcast radio waves, isolating that specific signal from all others.

## Chapter Summary

* **Simple Harmonic Motion (SHM)** occurs when a system is subject to a restoring force proportional to its displacement, $F_x = -kx$. The motion is described by the kinematic equation $x(t) = A \cos(\omega t + \phi)$.
* The **angular frequency** $\omega$, **period** $T$, and **frequency** $f$ of an SHM system are independent of the amplitude. For a mass-spring system, $\omega = \sqrt{k/m}$ and $T = 2\pi\sqrt{m/k}$.
* The **total mechanical energy** in an ideal SHM system is conserved: $E = K + U = \frac{1}{2}kA^2$. Energy continuously oscillates between kinetic and potential forms.
* A **simple pendulum** undergoes approximate SHM for small angles with a period $T = 2\pi\sqrt{L/g}$. A **physical pendulum** has a period $T = 2\pi\sqrt{I/(mgd)}$, demonstrating that rotational dynamics can also exhibit harmonic motion.
* **Damped oscillations** occur when non-conservative forces (like fluid drag, $F_d = -bv$) drain energy from the system. The amplitude decays exponentially over time. Systems can be underdamped (oscillating decay), critically damped (fastest return to equilibrium without oscillation), or overdamped (slow return without oscillation).
* **Driven oscillations** occur when an external periodic force is applied. **Resonance** is the phenomenon where the system's oscillation amplitude reaches a dramatic maximum because the driving frequency $\omega_d$ matches the system's natural resonant frequency $\omega_0$.
