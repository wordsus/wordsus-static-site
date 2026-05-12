Motion is a fundamental aspect of the universe. In this chapter, we begin our exploration of mechanics by studying **kinematics**: the mathematical description of motion without considering the forces that cause it. To build a strong foundation, we restrict our focus to motion along a single straight line. We will define the core concepts of position, displacement, velocity, and acceleration, carefully distinguishing between their average and instantaneous values. We will then analyze the important special case of constant acceleration, including the physics of free-falling objects, and introduce the tools of calculus to describe varying motion.

## 2.1 Position, Displacement, and Distance

To begin our study of kinematics—the description of motion without regard to its causes—we must first establish how to specify where an object is and how its location changes. In this chapter, we restrict our focus to one-dimensional motion: motion along a straight line. To simplify our analysis, we will use the **particle model**, treating moving objects as point-like particles with mass but no size or internal structure.

### Position

The **position** of a particle is its location with respect to a chosen reference point, which we typically designate as the origin (zero point) of a coordinate system. In one-dimensional motion, we usually align the path of the particle with the x-axis.

To uniquely define a particle's position, we need both a numerical value (distance from the origin) and a sign (indicating direction relative to the origin).

```text
       Negative Direction (-)                 Positive Direction (+)
  <---------------------------------|--------------------------------->
   -4      -3      -2      -1       0       1       2       3       4     x (m)
                                  Origin

```

If a particle is located at **x = 3 m**, it is 3 meters in the positive direction from the origin. If it is located at **x = -2 m**, it is 2 meters in the negative direction.

### Displacement

When a particle moves from one position to another, it undergoes a change in position. This change is defined as **displacement**. If an object is at an initial position $x_i$ at an initial time $t_i$, and moves to a final position $x_f$ at a later time $t_f$, the displacement is calculated as the final position minus the initial position.

We use the Greek letter delta ($\Delta$) to denote a change in a quantity. Thus, the displacement $\Delta x$ is given by the equation:

$$\Delta x = x_f - x_i$$

Because it has both a magnitude (the number of meters) and a direction (indicated by a positive or negative sign in one dimension), displacement is a **vector quantity**.

* If $x_f > x_i$, the displacement $\Delta x$ is positive, indicating motion in the positive x-direction.
* If $x_f < x_i$, the displacement $\Delta x$ is negative, indicating motion in the negative x-direction.
* If $x_f = x_i$, the displacement is zero, regardless of what happened between the initial and final times.

**Visualizing Displacement:**

Consider a particle that starts at **x = 1 m** and moves to **x = 4 m**.

```text
     Initial (xi)                 Final (xf)
          |                            |
          v                            v
  <-------|--------|--------|--------|--------|-------> x (m)
          1        2        3        4        5
          
          |------- \Delta x = +3 m ------->|

```

Using our formula:

$$\Delta x = 4 - 1 = 3$$

The displacement is **+3 m**.

### Distance

In everyday language, "distance" and "displacement" are often used interchangeably, but in physics, they have distinctly different meanings. **Distance** (often denoted by $d$) is the length of the actual path traveled by an object.

Unlike displacement, distance is a **scalar quantity**. It only has a magnitude and is always positive; it contains no directional information. Furthermore, distance accounts for the entire journey, whereas displacement only considers the starting and ending points.

### Contrasting Displacement and Distance

To clearly see the difference between these two concepts, imagine a person who starts at the origin (**x = 0 m**), walks to **x = 5 m**, and then turns around and walks back to **x = 2 m**.

```text
                           Path 1: 5 m forward
          |------------------------------------------------->|
          |                                                  |
          |             Path 2: 3 m backward                 |
          |             |<-----------------------------------|
          v             v                                    v
  <-------|-------------|------------------------------------|-------> x (m)
          0             2                                    5
        Start         Finish

```

**Calculating Distance:**
The person walked 5 meters forward and 3 meters backward. The total length of the path traveled is the sum of these segments:
**d = 5 m + 3 m = 8 m**

**Calculating Displacement:**
To find the displacement, we only care about the initial position ($x_i = 0$) and the final position ($x_f = 2$). The intermediate steps do not matter.

$$\Delta x = x_f - x_i$$

$$\Delta x = 2 - 0 = 2$$

The displacement is **+2 m**.

Notice that the magnitude of the displacement (2 m) is significantly less than the total distance traveled (8 m). The magnitude of displacement will only equal the distance traveled if the object moves in a single, straight-line direction without ever turning back.

## 2.2 Average and Instantaneous Velocity

Displacement tells us how far and in what direction an object has moved, but it provides no information about how much time the journey took. To completely describe motion, we must know not only where an object is, but also how rapidly its position is changing. This brings us to the concepts of velocity and speed.

### Average Velocity

**Average velocity** is defined as an object's displacement $\Delta x$ divided by the time interval $\Delta t$ during which that displacement occurs.

If a particle is at position $x_i$ at time $t_i$ and at position $x_f$ at a later time $t_f$, the average velocity $v_{avg}$ is:

$$v_{avg} = \frac{\Delta x}{\Delta t} = \frac{x_f - x_i}{t_f - t_i}$$

Because displacement is a vector quantity and time is a positive scalar, average velocity is also a **vector quantity**. In one-dimensional motion, its direction is indicated by its sign:

* A **positive** average velocity indicates that, on average, the object moved in the positive x-direction ($x_f > x_i$).
* A **negative** average velocity indicates that, on average, the object moved in the negative x-direction ($x_f < x_i$).

The SI unit for velocity is meters per second (m/s).

### Average Speed

It is crucial to distinguish between average velocity and **average speed**. While velocity is based on displacement, speed is based on total distance traveled. Average speed is a scalar quantity defined as the total distance $d$ divided by the time interval $\Delta t$:

$$\text{Average Speed} = \frac{d}{\Delta t}$$

Because distance is always positive, average speed is always a positive scalar. If you run exactly one lap around a 400-meter track in 100 seconds, your total distance is 400 m, making your average speed $4.0 \text{ m/s}$. However, because you started and ended at the exact same location, your displacement is zero, meaning your average velocity for the lap is $0 \text{ m/s}$.

### Instantaneous Velocity

Average velocity gives a broad overview of motion over a time interval, but it fails to capture the details of the journey. If you drive a car 100 kilometers in 2 hours, your average velocity is 50 km/h. However, during those two hours, you likely stopped at red lights (velocity of 0 km/h) and drove on highways (velocity of 100 km/h).

To know how fast an object is moving and in what direction at a specific, precise moment, we use **instantaneous velocity** (often just called "velocity", denoted by $v$).

We find the instantaneous velocity by looking at the average velocity over progressively smaller time intervals. Mathematically, instantaneous velocity is the limit of the average velocity as the time interval $\Delta t$ approaches zero:

$$v = \lim_{\Delta t \to 0} \frac{\Delta x}{\Delta t} = \frac{dx}{dt}$$

In the language of calculus, the instantaneous velocity is the **derivative of position with respect to time**.

Just as with average velocity and speed, we define **instantaneous speed** as the magnitude of the instantaneous velocity vector. It is a scalar value representing how fast the particle is moving at a given instant, stripped of its directional sign. A velocity of $-20 \text{ m/s}$ corresponds to a speed of $20 \text{ m/s}$.

### Graphical Interpretation of Velocity

We can visualize these concepts using a **position-time graph** (or $x-t$ graph), where time is plotted on the horizontal axis and position on the vertical axis.

**Average Velocity as a Secant Line:**
The average velocity between two times, $t_1$ and $t_2$, is the slope of the straight line connecting the two corresponding points on the position-time curve. This connecting line is called a **secant line**.

```text
Position (x)
  ^
  |                           * (t_2, x_2)
  |                          /|
  |                        /  |
  |                      /    | \Delta x
  |                    /      |
  |      (t_1, x_1)  *--------+
  |                 /  \Delta t
  |               / 
  |    Secant   /
  |    Line   /
  +-----------------------------------> Time (t)
             t_1             t_2

```

$$\text{Slope of secant} = \frac{\text{Rise}}{\text{Run}} = \frac{\Delta x}{\Delta t} = v_{avg}$$

**Instantaneous Velocity as a Tangent Line:**
If we bring $t_2$ closer and closer to $t_1$ (letting $\Delta t \to 0$), the secant line pivots and ultimately becomes the **tangent line** at $t_1$. The instantaneous velocity at any given time is the slope of the tangent line to the position-time graph at that exact moment.

```text
Position (x)
  ^                                 Tangent Line
  |                                /
  |                              /
  |                            /
  |                          /
  |                        * (Slope = Instantaneous Velocity)
  |                      /|
  |            Curve   /  |
  |                  /    |
  |                /      |
  +-----------------------------------> Time (t)
                          t_1

```

* If the slope of the tangent line is steep and positive, the object has a high positive velocity.
* If the tangent line is perfectly horizontal, the slope is zero, meaning the instantaneous velocity is $0 \text{ m/s}$ (the object is momentarily at rest).
* If the slope is negative, the object is moving in the negative x-direction.

## 2.3 Average and Instantaneous Acceleration

Just as position can change with time (giving us velocity), velocity itself can change with time. When you step on the gas pedal of a car, apply the brakes, or turn a corner, your velocity changes. In physics, any change in velocity—whether it is a change in magnitude (speed), a change in direction, or both—is defined as **acceleration**.

Because we are currently restricting our study to one-dimensional motion, the direction of motion can only be forward or backward (indicated by positive and negative signs). Therefore, in this chapter, acceleration will primarily describe how an object speeds up or slows down in a straight line.

### Average Acceleration

**Average acceleration** is defined as the change in velocity $\Delta v$ divided by the time interval $\Delta t$ over which that change occurs.

If a particle has an initial velocity $v_i$ at time $t_i$ and a final velocity $v_f$ at time $t_f$, the average acceleration $a_{avg}$ is:

$$a_{avg} = \frac{\Delta v}{\Delta t} = \frac{v_f - v_i}{t_f - t_i}$$

Because velocity is a vector, acceleration is also a **vector quantity**. In the SI system, velocity is measured in meters per second (m/s) and time in seconds (s). Therefore, the SI unit for acceleration is meters per second per second, which is written as meters per second squared ($\text{m/s}^2$). An acceleration of $5 \text{ m/s}^2$ means that the velocity increases by $5 \text{ m/s}$ during every second of motion.

### Instantaneous Acceleration

Similar to the distinction between average and instantaneous velocity, average acceleration only tells us about the overall change over a specific time window. To know the acceleration of an object at a precise, fleeting moment, we use **instantaneous acceleration** (often just called "acceleration", denoted by $a$).

Instantaneous acceleration is the limit of the average acceleration as the time interval approaches zero:

$$a = \lim_{\Delta t \to 0} \frac{\Delta v}{\Delta t} = \frac{dv}{dt}$$

In calculus terms, instantaneous acceleration is the **first derivative of velocity with respect to time**.

Furthermore, since velocity is the first derivative of position ($v = \frac{dx}{dt}$), acceleration is the **second derivative of position with respect to time**:

$$a = \frac{d}{dt}\left(\frac{dx}{dt}\right) = \frac{d^2x}{dt^2}$$

### Speeding Up vs. Slowing Down

A common misconception is that a "positive acceleration" always means speeding up and a "negative acceleration" always means slowing down. **This is incorrect.** The sign of the acceleration simply indicates the direction of the acceleration vector along the coordinate axis.

To determine whether an object is speeding up or slowing down, you must compare the sign of the acceleration with the sign of the velocity:

1. **Speeding up:** If velocity and acceleration have the **same sign**, the object's speed is increasing. (e.g., A car moving in the positive direction and being pushed in the positive direction, or a car backing up and being pushed harder backward).
2. **Slowing down (Decelerating):** If velocity and acceleration have **opposite signs**, the object's speed is decreasing.

```text
  Velocity (v)  | Acceleration (a) | Motion Description
----------------|------------------|---------------------------------------
      +         |        +         | Moving forward, speeding up
      -         |        -         | Moving backward, speeding up
      +         |        -         | Moving forward, slowing down
      -         |        +         | Moving backward, slowing down

```

*Note: In physics, the term "deceleration" is rarely used as a distinct quantity; we simply say the acceleration vector points opposite to the velocity vector.*

### Graphical Interpretation of Acceleration

Just as we used a position-time graph to analyze velocity, we can use a **velocity-time graph** (or $v-t$ graph) to analyze acceleration.

On a $v-t$ graph:

* The **average acceleration** between two times is the slope of the secant line connecting those two points on the curve.
* The **instantaneous acceleration** at a specific time is the slope of the tangent line to the curve at that moment.

```text
Velocity (v)
  ^
  |                                   * (t_2, v_2)
  |                                 / |
  |                               /   |
  |             Curve           /     | \Delta v
  |                           /       |
  |          Tangent        /         |
  |        / (Slope = a)  *-----------+
  |      /              (t_1, v_1)   \Delta t
  |    /
  |  / 
  +--------------------------------------------> Time (t)
                         t_1         t_2

```

By observing the slope of a velocity-time graph, you can immediately tell what is happening to the acceleration:

* A positive slope means positive acceleration.
* A negative slope means negative acceleration.
* A horizontal line (slope of zero) means the acceleration is zero, indicating that the object is moving at a **constant velocity**.

## 2.4 Motion with Constant Acceleration

In the previous sections, we established the definitions of velocity and acceleration. While acceleration can vary in complex ways, there is a very common and highly useful special case: motion where the acceleration remains constant. When an object moves with constant acceleration, its velocity changes at a steady rate. This simplifies the mathematics of motion significantly and accurately describes many everyday phenomena, such as a car braking with a steady force or an object falling freely under the influence of gravity.

When acceleration is constant, the average acceleration over any time interval is equal to the instantaneous acceleration at any moment during that interval ($a_{avg} = a$). By defining our starting time as $t_i = 0$ and our final time as a generic time $t$, we can derive a set of powerful kinematic equations that relate position, velocity, acceleration, and time.

### The First Kinematic Equation: Velocity as a Function of Time

We begin with the definition of average acceleration:

$$a = \frac{v_f - v_i}{t - 0}$$

By rearranging this equation to solve for the final velocity $v_f$, we obtain the first kinematic equation:

$$v_f = v_i + at$$

This equation demonstrates a linear relationship between velocity and time. If you know an object's starting velocity and its constant acceleration, you can determine its exact velocity at any future time $t$.

### The Second Kinematic Equation: Displacement Using Average Velocity

When acceleration is constant, the velocity-time graph is a straight line. Because the velocity changes uniformly, the average velocity for the entire time interval is simply the arithmetic mean of the initial and final velocities:

$$v_{avg} = \frac{v_i + v_f}{2}$$

Recalling that displacement is average velocity multiplied by time ($\Delta x = v_{avg}t$), we can substitute the expression above to get the second kinematic equation:

$$\Delta x = \left(\frac{v_i + v_f}{2}\right)t$$

### The Third Kinematic Equation: Position as a Function of Time

We can geometrically derive the next equation by analyzing a velocity-time graph for an object undergoing constant acceleration. The displacement $\Delta x$ of an object is equal to the area under its velocity-time curve.

```text
Velocity (v)
  ^
  |                           * (t, v_f)
  |                         / |
  |                       /   |
  |             Triangle/     | Height = (v_f - v_i) = at
  |                   /       |
  |                 /         |
 v_i +---------------*---------+
  |  |               |         |
  |  |               |         |
  |  |   Rectangle   |         | Height = v_i
  |  |               |         |
  +--+-------------------------+----------> Time (t)
     0                         t

```

The total area under the graph between $t = 0$ and $t$ consists of two parts: a rectangle and a triangle.

1. **Area of the rectangle:** $A_{rect} = \text{base} \times \text{height} = t \times v_i = v_it$
2. **Area of the triangle:** $A_{tri} = \frac{1}{2} \times \text{base} \times \text{height} = \frac{1}{2} \times t \times (v_f - v_i)$

From our first equation, we know that $(v_f - v_i) = at$. Substituting this into the triangle's area gives:

$$A_{tri} = \frac{1}{2} \times t \times (at) = \frac{1}{2}at^2$$

Adding the two areas together yields the total displacement, which is our third kinematic equation:

$$\Delta x = v_it + \frac{1}{2}at^2$$

Alternatively, this equation can be written in terms of final position $x_f$ and initial position $x_i$:

$$x_f = x_i + v_it + \frac{1}{2}at^2$$

This reveals that position depends quadratically on time when acceleration is constant, resulting in a parabolic shape on a position-time graph.

### The Fourth Kinematic Equation: Velocity as a Function of Position

The first three equations all require knowing the time interval $t$. However, we often encounter problems where time is not given, and we are not asked to find it. We can derive a time-independent equation by isolating $t$ in the first equation ($t = \frac{v_f - v_i}{a}$) and substituting it into the second equation:

$$\Delta x = \left(\frac{v_i + v_f}{2}\right) \left(\frac{v_f - v_i}{a}\right)$$

Multiplying the fractions (and recognizing the difference of squares in the numerator) yields:

$$\Delta x = \frac{v_f^2 - v_i^2}{2a}$$

Rearranging to solve for $v_f^2$ gives the fourth kinematic equation:

$$v_f^2 = v_i^2 + 2a\Delta x$$

### Summary of the Kinematic Equations

These four equations, often referred to as the "Big Four" equations of kinematics, contain five variables: $\Delta x$, $v_i$, $v_f$, $a$, and $t$. Each equation connects four of these variables, meaning that each equation has one specific variable "missing."

When solving physics problems, identifying which variable is not given and not requested is the key to selecting the correct equation.

| Equation | Missing Variable | Useful For |
| --- | --- | --- |
| $v_f = v_i + at$ | $\Delta x$ | Finding velocity at a specific time. |
| $\Delta x = \left(\frac{v_i + v_f}{2}\right)t$ | $a$ | Finding displacement when acceleration is unknown but initial and final velocities are known. |
| $\Delta x = v_it + \frac{1}{2}at^2$ | $v_f$ | Finding displacement or time when final velocity is unknown. |
| $v_f^2 = v_i^2 + 2a\Delta x$ | $t$ | Finding velocity or displacement when time is unknown. |

**Problem-Solving Strategy for Kinematics:**

1. Establish a coordinate system. Choose which direction is positive and which is negative.
2. List the known values provided in the problem, ensuring their signs align with your coordinate system.
3. Identify the unknown variable you are trying to find.
4. Identify the "missing" variable (the one that is neither known nor asked for).
5. Select the kinematic equation from the table above that lacks that missing variable.
6. Substitute the known values into the equation and solve for the unknown.

## 2.5 Freely Falling Objects

One of the most common and important examples of motion with constant acceleration is the vertical motion of an object falling near the surface of the Earth. If we neglect the effects of air resistance—which is a valid approximation for dense objects falling over relatively short distances—we can treat such motion as an idealized case known as **free fall**.

In physics, "free fall" does not necessarily mean the object is moving downward. An object tossed straight up into the air is also considered to be in free fall from the moment it leaves your hand until the moment it is caught or hits the ground. Free fall simply means that **gravity is the only force acting on the object**.

### The Acceleration Due to Gravity ($g$)

It was the Italian scientist Galileo Galilei (1564–1642) who first deduced that, in the absence of air resistance, all objects dropped from the same height will fall with the same constant acceleration, regardless of their mass. A heavy iron ball and a light feather will hit the ground at exactly the same time if dropped in a vacuum.

This constant acceleration is called the **acceleration due to gravity**, and its magnitude is denoted by the letter $g$. Near the surface of the Earth, the average value of $g$ is approximately **9.80 m/s²**.

Because gravity always pulls objects toward the center of the Earth, the acceleration vector of a freely falling object always points straight down.

### Adapting the Kinematic Equations

Since free fall is a one-dimensional motion with constant acceleration, we can directly apply the four kinematic equations derived in Section 2.4. We only need to make a few conventional changes to our variables:

1. **Change the spatial variable:** Because the motion is vertical, we replace $x$ with $y$. Displacement becomes $\Delta y = y_f - y_i$.
2. **Define the coordinate system:** The standard convention is to define the upward direction as the positive y-direction (+y) and the downward direction as the negative y-direction (-y).
3. **Substitute the acceleration:** Because gravity pulls downward (in the negative direction), the acceleration $a$ is equal to $-g$. Therefore, we substitute $a = -9.80 \text{ m/s}^2$.

Making these substitutions, the kinematic equations for an object in free fall become:

$$v_{yf} = v_{yi} - gt$$

$$\Delta y = \left(\frac{v_{yi} + v_{yf}}{2}\right)t$$

$$\Delta y = v_{yi}t - \frac{1}{2}gt^2$$

$$v_{yf}^2 = v_{yi}^2 - 2g\Delta y$$

*Note: In these equations, $g$ is a positive magnitude (9.80). The negative sign indicating direction is explicitly written in the formulas.*

### Symmetry of Free Fall

When an object is thrown vertically upward, its motion is highly symmetrical. As it travels upward, its velocity is positive, but the acceleration is negative. Because velocity and acceleration have opposite signs, the object slows down.

Eventually, the object reaches its **maximum height**. At this exact, instantaneous turning point, the object is momentarily at rest. Therefore:

* **At the highest point, velocity is zero ($v_y = 0$).**
* **At the highest point, acceleration is still $-9.80 \text{ m/s}^2$.** (Gravity does not "turn off" at the top of the path; if it did, the object would hover there forever).

After reaching the peak, the object begins to fall. Now, both its velocity and acceleration are pointing downward (both are negative), so the object speeds up.

If the object returns to the exact same elevation from which it was launched, we can observe two important symmetries:

1. **Time Symmetry:** The time it takes for the object to travel from its launch point to its peak is exactly equal to the time it takes to fall from the peak back to the launch elevation.
2. **Speed Symmetry:** The speed of the object as it passes downward through a specific height is exactly the same as its speed when it passed upward through that same height. The velocity vectors will simply have opposite signs.

```text
      Vertical Position (y)
             ^
             |
             |       (O)  v = 0 m/s (Maximum Height)
             |      ^   |
      Slowing|     /    | Speeding
       Down  |   v_1   v_2   Up
             |   /      |
             | (O)     (O) (Speed at v_1 = Speed at v_2)
             | /        |
             |v_0      v_3 
             |/          |
 Launch y=0  +-(O)------(O)----------------> Time (or Path Offset)
               t=0     (Speed at v_0 = Speed at v_3)

```

**Problem-Solving Tip:** When analyzing a free fall problem where an object is thrown up and comes back down, you can often simplify the math by splitting the motion into two halves (the upward trip and the downward trip) and analyzing the point where $v_y = 0$.

## 2.6 Calculus Applications in Kinematics

In Section 2.4, we derived a set of kinematic equations based on the assumption that acceleration is strictly constant. However, in the real world, acceleration often changes over time. A car engine produces less acceleration as it shifts into higher gears, and the acceleration of a rocket increases as it burns off its massive fuel load. To analyze motion where acceleration is a variable function of time, $a(t)$, we must use the tools of calculus.

### Review: Derivatives in Kinematics

As established in earlier sections, instantaneous velocity and acceleration are defined as rates of change, which are mathematical derivatives.

If we know the position of a particle as a function of time, $x(t)$, we can find its velocity by taking the first derivative with respect to time:

$$v = \frac{dx}{dt}$$

Similarly, if we know the velocity as a function of time, $v(t)$, we can find the acceleration by taking the derivative of velocity, which is also the second derivative of position:

$$a = \frac{dv}{dt} = \frac{d^2x}{dt^2}$$

On a graph, the derivative represents the slope of the tangent line at any given point.

### Integrals in Kinematics

Calculus also provides a way to work backward. If we know the acceleration of an object, how do we find its velocity and position? We use the reverse process of differentiation: **integration**.

Geometrically, a definite integral calculates the area under a curve on a graph. As we saw conceptually in Section 2.4, the area under an acceleration-time graph is the change in velocity, and the area under a velocity-time graph is the displacement.

Starting with the definition of acceleration:

$$a = \frac{dv}{dt}$$

We can separate the differentials by multiplying both sides by $dt$:

$$dv = a \ dt$$

Now, we take the definite integral of both sides. We integrate velocity from an initial velocity $v_i$ to a final velocity $v_f$, and time from an initial time $t_i$ to a final time $t_f$:

$$\int_{v_i}^{v_f} dv = \int_{t_i}^{t_f} a(t) dt$$

Evaluating the left side gives the change in velocity:

$$v_f - v_i = \int_{t_i}^{t_f} a(t) dt$$

$$v_f = v_i + \int_{t_i}^{t_f} a(t) dt$$

We can apply the exact same mathematical logic to velocity to find position. Starting with $v = \frac{dx}{dt}$, we separate the variables to $dx = v \ dt$ and integrate:

$$\int_{x_i}^{x_f} dx = \int_{t_i}^{t_f} v(t) dt$$

Evaluating the left side yields the displacement:

$$x_f - x_i = \int_{t_i}^{t_f} v(t) dt$$

$$x_f = x_i + \int_{t_i}^{t_f} v(t) dt$$

These integral equations are universally true for one-dimensional motion, regardless of whether the acceleration is constant, increasing, decreasing, or oscillating.

### Deriving the Constant Acceleration Equations

To demonstrate the power of these integral relationships, let us apply them to the special case where acceleration is constant ($a(t) = a$). Assume the motion starts at $t_i = 0$ with an initial velocity $v_i$ and initial position $x_i$.

**Finding Velocity:**
We substitute the constant $a$ into our velocity integral:

$$v(t) = v_i + \int_{0}^{t} a \ dt$$

Because $a$ is a constant, we can pull it outside the integral:

$$v(t) = v_i + a \int_{0}^{t} dt$$

$$v(t) = v_i + a[t - 0]$$

$$v(t) = v_i + at$$

This is the exact first kinematic equation we derived algebraically in Section 2.4.

**Finding Position:**
Now, we substitute this new velocity function, $v(t) = v_i + at$, into our position integral:

$$x(t) = x_i + \int_{0}^{t} (v_i + at) dt$$

We integrate the polynomial term by term:

$$x(t) = x_i + \left[v_it + \frac{1}{2}at^2\right]_{0}^{t}$$

$$x(t) = x_i + v_it + \frac{1}{2}at^2$$

Through two simple steps of integration, we have rigorously derived the third kinematic equation.

### Motion with Non-Constant Acceleration

The true necessity of calculus emerges when acceleration is not constant. Consider a particle whose acceleration increases linearly with time, defined by the function $a(t) = ct$, where $c$ is a constant.

If the particle starts from rest ($v_i = 0$) at the origin ($x_i = 0$) at $t=0$, we can find its velocity and position functions by integrating.

**Velocity:**

$$v(t) = \int_{0}^{t} (ct) dt = \left[\frac{1}{2}ct^2\right]_{0}^{t} = \frac{1}{2}ct^2$$

**Position:**

$$x(t) = \int_{0}^{t} \left(\frac{1}{2}ct^2\right) dt = \left[\frac{1}{6}ct^3\right]_{0}^{t} = \frac{1}{6}ct^3$$

In this scenario, the position depends on the *cube* of time, a relationship that cannot be modeled by our standard kinematic equations. Whenever a problem presents acceleration or velocity as a time-dependent function rather than a fixed number, calculus is the required tool for solving the motion.

---

## Chapter Summary

* **Position, Displacement, and Distance:** Position is an object's location relative to a reference point. Displacement ($\Delta x$) is a vector representing the change in position ($\Delta x = x_f - x_i$). Distance is a scalar representing the total length of the path traveled.
* **Velocity and Speed:** Average velocity is displacement divided by the time interval ($v_{avg} = \frac{\Delta x}{\Delta t}$). Average speed is total distance divided by time. Instantaneous velocity is the derivative of position with respect to time ($v = \frac{dx}{dt}$).
* **Acceleration:** Average acceleration is the change in velocity divided by the time interval ($a_{avg} = \frac{\Delta v}{\Delta t}$). Instantaneous acceleration is the derivative of velocity with respect to time ($a = \frac{dv}{dt}$), which is also the second derivative of position ($a = \frac{d^2x}{dt^2}$).
* **Speeding Up vs. Slowing Down:** An object speeds up if its velocity and acceleration vectors point in the same direction (same sign). It slows down if they point in opposite directions (opposite signs).
* **Constant Acceleration:** When acceleration is steady, a specific set of kinematic equations connects position, velocity, acceleration, and time. These are only valid when $a$ is constant.
* **Free Fall:** In the absence of air resistance, all objects near Earth's surface fall with a constant downward acceleration of $g \approx 9.80 \text{ m/s}^2$.
* **Calculus Applications:** While derivatives yield instantaneous rates of change (finding $v$ from $x$, or $a$ from $v$), definite integrals calculate accumulated changes (finding $v$ from $a$, or $x$ from $v$). Integration represents finding the area under the curve on kinematic graphs.
