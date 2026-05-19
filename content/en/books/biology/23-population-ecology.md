Ecology is more than just a list of species; it is the study of dynamic interactions. In this chapter, we explore population ecology—the study of how and why populations change in size, structure, and distribution over time. From the rapid multiplication of bacteria to the slow growth of ancient redwoods, every species faces environmental limits. We will investigate mathematical models of growth, the natural forces regulating populations, and the evolutionary trade-offs between survival and reproduction. Finally, we apply these core biological principles to the growth and global footprint of the most dominant species on Earth: humans.

## 23.1 Population Density, Dispersion Patterns, and Demographics

At the foundational level of ecology, populations are the units of study. A **population** is defined as a group of individuals of a single species living in the same general area. Members of a population rely on the same resources, are influenced by similar environmental factors, and are highly likely to interact and breed with one another. To understand how populations interact with their environments, ecologists focus on three fundamental characteristics: density, dispersion, and demographics.

### Population Density

**Population density** is the number of individuals per unit area or volume. For example, the number of oak trees per square kilometer in a forest or the number of *Escherichia coli* bacteria per milliliter in a test tube represents density.

Because it is rarely practical or possible to count all individuals within the boundaries of a population, ecologists use a variety of sampling techniques to estimate densities and total population sizes. One widely used technique for mobile organisms is the **mark-recapture method**.

In this method, scientists capture a random sample of individuals, mark them (with a tag, band, or non-toxic paint), and then release them back into the population. After giving the marked individuals time to mix evenly with the unmarked members of the population, scientists capture a second set of individuals. The mathematical model assumes that the proportion of marked individuals in the second sample represents the proportion of marked individuals in the entire population.

The population size ($N$) is estimated using the following formula:

$$N = \frac{s \times n}{x}$$

Where:

* $s$ = number of individuals marked and released in the first sampling
* $n$ = total number of individuals caught in the second sampling
* $x$ = number of marked individuals recaptured in the second sampling

Density is not a static property; it changes continuously as individuals are added to or removed from a population. Additions occur through birth and **immigration** (the influx of new individuals from other areas), while removals occur through death and **emigration** (the movement of individuals out of a population).

### Dispersion Patterns

While density provides an average number of individuals across a given area, **dispersion** is the pattern of spacing among individuals within the boundaries of the population. Local densities may vary substantially, creating distinct patterns that provide insight into the environmental associations and social interactions of the species.

There are three primary patterns of dispersion:

**1. Clumped Dispersion**
In a clumped pattern, individuals are aggregated in patches. This is the most common pattern of dispersion in nature. It frequently results from an unequal distribution of resources (e.g., plants growing where soil conditions are optimal) or from social behaviors (e.g., wolves hunting in a pack or fish swimming in schools to avoid predators).

```text
    [ * * ]         [ * * * ]
    [ *   ]         [ * *   ]
    
            [ * * ]
            [ * * ]

```

**2. Uniform Dispersion**
A uniform (or evenly spaced) pattern of dispersion often results from direct interactions between individuals in the population. In animals, this is typically linked to territoriality—the defense of a bounded physical space against encroachment by other individuals. In plants, it can occur when individuals secrete chemicals that inhibit the germination and growth of nearby competitors.

```text
    *       *       *       *
    
    *       *       *       *
    
    *       *       *       *

```

**3. Random Dispersion**
In random dispersion, the position of each individual is independent of other individuals. This pattern occurs in the absence of strong attractions or repulsions among individuals and where key physical or chemical factors are relatively constant across the study area. Plants established by windblown seeds, such as dandelions, frequently display random dispersion.

```text
        *               *   *
    *           *               
            *       *       *
      *                   *

```

### Demographics

Density and dispersion are vital snapshots of a population, but populations fluctuate over time. **Demographics** is the study of the vital statistics of a population and how they change. Of particular interest to demographers are birth rates and death rates.

#### Life Tables

A **life table** is an age-specific summary of the survival pattern of a population. Originally developed by life insurance companies to estimate human life expectancy, ecologists construct life tables for wild populations by following the fate of a **cohort**—a group of individuals of the same age—from birth until all of the individuals are dead. By tracking the number of individuals that die in each age-group and analyzing the proportion surviving, ecologists can determine the survival and reproduction rates at different stages of the organism's life cycle.

#### Survivorship Curves

The data in a life table can be represented graphically in a **survivorship curve**, a plot of the proportion or numbers in a cohort still alive at each age. Because populations often start with a large number of individuals, survivorship curves are typically plotted on a logarithmic scale.

Ecologists generally classify survivorship curves into three generalized types:

```text
 Log 1000 | * * * * * * * * * * * * * 
 Number   |                           *
 of   100 | - - - - - - - - - - - - - - *  (Type I)
 Sur-     | .                           *
 vivors10 |   .               - - - - - -  (Type II)
          |     .       - - -            
        1 |       . - -                  
          | * * * * * * * * * * * * * * *  (Type III)
          +------------------------------
          0         Relative Age        100%

```

* **Type I:** The curve is relatively flat at the start, reflecting low death rates during early and middle life, and then drops steeply as death rates increase among older age-groups. This pattern is characteristic of large mammals, including humans, that produce few offspring but provide them with excellent care.
* **Type II:** The curve is intermediate, with a constant death rate over the organism's life span. This constant probability of dying at any age is seen in certain rodents, various invertebrates, some lizards, and many annual plants.
* **Type III:** The curve drops sharply at the start, reflecting very high death rates for the young, but flattens out as death rates decline for those few individuals that survive the early period of die-off. This curve is typical of organisms that produce very large numbers of offspring but provide little or no care, such as long-lived plants, many fishes, and most marine invertebrates.

## 23.2 Exponential and Logistic Models of Population Growth

To understand how populations change spatially and temporally, ecologists construct mathematical models that describe population growth. These models simplify complex natural processes into basic equations, allowing us to predict future population sizes and understand the factors that drive or constrain growth. Two fundamental models describe population dynamics: the exponential model and the logistic model.

### The Foundation of Population Growth

To build these models, we must first define the basic variables of population change. If we ignore the effects of immigration and emigration, a population grows when births exceed deaths and shrinks when deaths exceed births.

Let $N$ represent population size and $t$ represent time. The change in population size ($\Delta N$) over a specific time interval ($\Delta t$) can be defined by the number of births ($B$) minus the number of deaths ($D$):

$$\frac{\Delta N}{\Delta t} = B - D$$

Ecologists prefer to use **per capita** (per individual) rates to make these models applicable to populations of any size. Let $b$ be the annual per capita birth rate and $m$ (for mortality) be the per capita death rate. We can then calculate the expected number of births and deaths in a population of size $N$ as $B = bN$ and $D = mN$. Substituting these into our equation gives:

$$\frac{\Delta N}{\Delta t} = bN - mN$$

The difference between the per capita birth rate and death rate is the **per capita rate of increase**, denoted by $r$:

$$r = b - m$$

If $r > 0$, the population is growing; if $r < 0$, it is declining. If $r = 0$, there is **zero population growth (ZPG)**. Using the calculus language of differential equations for instantaneous rates of change, the fundamental equation for population growth becomes:

$$\frac{dN}{dt} = rN$$

### Exponential Population Growth

The **exponential model** describes population growth in an idealized environment with unlimited resources. Under these conditions, the population experiences its maximum possible per capita rate of increase, referred to as the intrinsic rate of increase ($r_{max}$). The equation for exponential growth is:

$$\frac{dN}{dt} = r_{max}N$$

The defining characteristic of exponential growth is that the size of the population increases at a constant proportion at each instant in time. However, because $N$ gets larger with each passing moment, the absolute number of individuals added to the population accelerates.

When graphed, exponential growth produces a characteristic **J-shaped curve**.

```text
 Population 
 Size (N)   |
            |                                  *
            |                                *
            |                              *
            |                            *
            |                          *
            |                        *
            |                     *
            |                 *
            |           *  *
            +------------------------------------
                           Time (t)

```

The J-shaped curve is a hallmark of populations rebounding from a catastrophic decline or populations introduced into a new environment where they face no predators and have abundant food (such as invasive species). However, no population can grow exponentially forever; eventually, resources become depleted, space runs out, or waste products accumulate to toxic levels.

### Logistic Population Growth

To model population growth more realistically, ecologists introduce the concept of **carrying capacity ($K$)**, defined as the maximum population size that a particular environment can sustain. Carrying capacity varies over time and space depending on the abundance of limiting resources such as food, water, nesting sites, or light.

The **logistic model** of population growth modifies the exponential model by incorporating $K$. As population size ($N$) approaches the carrying capacity ($K$), the per capita rate of increase approaches zero.

The mathematical equation for logistic growth is:

$$\frac{dN}{dt} = r_{max}N \frac{(K - N)}{K}$$

The expression $\frac{(K - N)}{K}$ represents the fraction of the carrying capacity that is still available for population growth.

* When $N$ is very small compared to $K$, the term $\frac{(K - N)}{K}$ is close to 1, and the population grows almost exponentially.
* When $N$ is large and approaching $K$, the term $\frac{(K - N)}{K}$ is close to 0, and population growth slows drastically.
* When $N = K$, the term is 0, and the population stops growing ($\frac{dN}{dt} = 0$).

When graphed, the logistic model produces an **S-shaped (sigmoid) curve**.

```text
 Population 
 Size (N)   |
            |                            * * * * * *  Carrying Capacity (K)
            |                          *
            |                        *
            |                      *
            |                    *
            |                  *
            |                *
            |             * 
            |         *
            |    * *
            +---------------------------------------
                           Time (t)

```

The logistic model assumes that populations adjust instantaneously to growth and approach the carrying capacity smoothly. In reality, there is often a delay before the negative effects of an increasing population are realized. As a result, many natural populations overshoot their carrying capacity temporarily, eventually dropping below $K$ as resource depletion takes its toll, often resulting in minor oscillations around the carrying capacity.

Despite these real-world fluctuations, the logistic model provides a critical foundational framework for understanding how environmental limits shape population dynamics and species survival.

## 23.3 Density-Dependent and Density-Independent Population Regulation

The logistic growth model establishes that populations eventually reach a carrying capacity ($K$), but it does not explain *why* growth slows down or *what* specific environmental factors dictate that capacity. To understand the mechanisms of population regulation, ecologists categorize the forces that limit population growth into two broad types: density-dependent factors and density-independent factors.

### Density-Dependent Regulation

A birth rate or death rate that changes as population density changes is said to be **density-dependent**. In these situations, the population regulates itself through negative feedback mechanisms. As population density increases, density-dependent factors exert a stronger influence, leading to a decrease in the per capita birth rate ($b$), an increase in the per capita death rate ($m$), or both.

When the birth rate equals the death rate, the population reaches an equilibrium density.

```text
       Rates |
             |   b (Birth rate declines with density)
             |      \             /
             |       \           /  m (Death rate increases with density)
             |        \         /
             |         \       /
             |          \     /    
             |           \   /     
             |            \ /      
             |             X       Equilibrium Density (where b = m)
             |            / \      
             |           /   \     
             +-----------------------------------------
                           Population Density

```

Density-dependent regulation is primarily driven by biological (biotic) interactions. Several interconnected mechanisms can cause this negative feedback:

* **Competition for Resources:** As a population grows, individuals must compete more fiercely for limited resources such as food, water, and space. In plants, this might mean competition for sunlight and soil nutrients, leading to lower seed production. In animals, food scarcity can lead to lower reproductive output and higher mortality.
* **Disease:** In dense populations, pathogens and parasites spread more easily from host to host. The transmission rate of an infectious disease is strongly density-dependent, meaning an outbreak can severely curtail population growth when crowding occurs.
* **Predation:** As a prey population builds up, predators may feed preferentially on that species, consuming a higher percentage of the individuals. Predators may also reproduce more successfully when prey is abundant, further increasing predatory pressure.
* **Territoriality:** For many animals, breeding space is a vital resource. If all available high-quality territories are occupied, surplus individuals are forced into suboptimal habitats or are entirely prevented from breeding, putting a cap on population growth.
* **Intrinsic (Physiological) Factors:** In some species, high density causes physiological changes even when food and shelter are abundant. For example, severe crowding in certain rodent populations triggers a stress syndrome that alters hormones, delaying sexual maturation, shrinking reproductive organs, and depressing the immune system.
* **Toxic Wastes:** The accumulation of metabolic wastes can poison a population. In laboratory cultures of microorganisms, such as yeast converting sugar to ethanol, the population eventually crashes as the concentration of ethanol reaches toxic levels.

### Density-Independent Regulation

A birth rate or death rate that does *not* change with population density is said to be **density-independent**. These factors affect the same percentage of individuals regardless of whether the population is small and sparse or large and crowded.

Density-independent factors are almost always abiotic (physical or chemical) aspects of the environment.

* **Extreme Weather:** Severe freezes, prolonged droughts, or extended heatwaves can cause widespread mortality regardless of how many individuals are present.
* **Natural Disasters:** Events like hurricanes, wildfires, floods, and volcanic eruptions can indiscriminately wipe out large fractions of a population.

In a purely density-independent scenario, the mortality rate forms a horizontal line when graphed against density, because the chance of surviving the event has nothing to do with how crowded the population is.

```text
       Rates |
             |   
             |   m (Death rate is constant regardless of density)
             |   - - - - - - - - - - - - - - - - - - - - - - 
             |
             |   b (Birth rate is constant regardless of density)
             |   - - - - - - - - - - - - - - - - - - - - - - 
             |             
             +-----------------------------------------
                           Population Density

```

### Population Dynamics: The Interaction of Factors

In reality, populations are rarely regulated by just one type of factor. **Population dynamics**—the complex study of how and why populations change in size over time—reveals that density-dependent and density-independent factors interact to shape an organism's life history.

For example, a sudden density-independent freeze might drastically reduce an insect population. For the survivors, density-dependent competition is temporarily relieved, allowing the population to grow exponentially in the spring. As the population recovers and density increases, density-dependent factors like predation and resource scarcity once again slow the growth rate.

#### Boom-and-Bust Cycles

While many populations remain relatively stable near their carrying capacity, some exhibit striking fluctuations known as boom-and-bust cycles. A classic example is the ~10-year cycle of the snowshoe hare and its primary predator, the Canada lynx, in the North American boreal forests.

```text
 High |      Hare          Hare          Hare
      |      /  \          /  \          /  \
 Pop. |     /    \ Lynx   /    \ Lynx   /    \
 Size |    /      /\     /      /\     /      \
      |   /      /  \   /      /  \   /        \
      |  /      /    \ /      /    \ /          \
 Low  +--------------------------------------------
          0            10            20   Years

```

Ecologists have debated the drivers of these cycles. Are they caused by density-dependent overgrazing of the hare's winter food supply (a bottom-up effect), or are they driven by density-dependent predation by the lynx (a top-down effect)? Experimental evidence suggests that both factors interact: high hare densities lead to food shortages and increased vulnerability, while high lynx populations drive the hare population into a severe "bust." The lynx population subsequently crashes due to starvation, allowing the hare population to "boom" once the vegetation recovers, starting the cycle anew.

## 23.4 Life History Traits and Reproductive Strategies (r- and K-selection)

The traits that affect an organism's schedule of reproduction and survival make up its **life history**. In biology, life history is not a conscious narrative chosen by the organism, but rather an evolutionary outcome reflecting the accumulated impact of natural selection. An organism's life history entails three main variables:

1. **Age at first reproduction:** When reproduction begins (age at maturity).
2. **Reproductive frequency:** How often the organism reproduces.
3. **Fecundity:** How many offspring are produced per reproductive episode.

### Semelparity vs. Iteroparity

Organisms exhibit two primary patterns of reproduction depending on their life history variables.

**Semelparity** (from the Latin *semel*, once, and *parito*, to beget) is characterized by a single, highly fecund reproductive episode before death. This is often referred to as "big-bang" reproduction. The Pacific salmon, for example, spends years growing in the ocean before returning to freshwater streams to spawn thousands of eggs and immediately die. Similarly, the agave plant (often called the "century plant") grows for years in arid climates, storing nutrients until an unusually wet year triggers it to send up a massive floral stalk, produce seeds, and die.

**Iteroparity** (from the Latin *itero*, to repeat) is characterized by repeated reproductive cycles over the organism's lifetime. Examples include most mammals, birds, and perennial plants. An oak tree produces acorns every year for centuries, and humans can produce offspring repeatedly throughout their reproductive years.

Natural selection tends to favor semelparity in environments where adult survival rates are low or highly variable, making it advantageous to pour all available energy into a single reproductive event. Iteroparity is favored in more dependable environments where adults are likely to survive long enough to breed again and where competition for resources is intense, favoring the production of fewer, better-provisioned offspring.

### Trade-offs and the Principle of Allocation

No organism can maximize all life history traits simultaneously. Because organisms have access to a finite amount of energy and resources, there is an inherent trade-off between reproduction and survival, as dictated by the **Principle of Allocation**. Energy allocated to producing offspring cannot be used for the parent's own somatic growth, immune defense, or maintenance.

Furthermore, there is a strict trade-off between the *quantity* and *quality* of offspring.

* **High Quantity, Low Quality:** Many plants (like dandelions) and animals (like oysters) produce massive numbers of tiny offspring. The energetic cost per offspring is exceedingly low. The evolutionary strategy relies on sheer numbers to ensure that at least a few individuals will successfully disperse, find a suitable habitat, and survive to adulthood.
* **Low Quantity, High Quality:** Other organisms produce only a few offspring but invest heavily in each one. Coconuts provide a massive endosperm (nutrient store) to sustain the seedling. Mammals invest heavily through gestation and lactation. This high investment increases the probability that the individual offspring will survive in a highly competitive environment.

### r- and K-selection

To organize these life history strategies ecologically, ecologists Robert MacArthur and E.O. Wilson introduced the concepts of r-selection and K-selection. These terms are directly derived from the mathematical variables of the logistic growth model discussed in Section 23.2: the intrinsic rate of increase ($r$) and the carrying capacity ($K$).

**r-selection (Density-Independent Selection)**
This strategy maximizes reproductive success in uncrowded, unpredictable environments where population densities are well below carrying capacity. In these settings, density-independent factors (like weather or disturbance) often dictate survival. The optimal strategy is to reproduce quickly and abundantly before the environment changes or the population is wiped out.

**K-selection (Density-Dependent Selection)**
This strategy maximizes competitive ability in stable, crowded environments where the population is at or near the carrying capacity ($K$). Under these conditions, competition for resources is intense. The optimal strategy is to produce fewer offspring but invest heavily in their competitive superiority, ensuring they can secure limited resources.

The following table summarizes the contrasting traits typically associated with these two strategies:

| Life History Trait | r-Selected Species | K-Selected Species |
| --- | --- | --- |
| **Development** | Rapid | Slow |
| **Maturation Time** | Early | Late |
| **Lifespan** | Short | Long |
| **Survivorship Curve** | Type III (high early mortality) | Type I (low early mortality) |
| **Fecundity** | Many small offspring | Few large offspring |
| **Reproductive Episodes** | Often semelparous (once) | Often iteroparous (repeated) |
| **Parental Care** | Little or none | Extensive |
| **Population Dynamics** | Highly variable (boom-and-bust) | Relatively stable (near $K$) |
| **Typical Habitat** | Disturbed, unpredictable | Stable, predictable |

#### The Life History Continuum

It is critical to note that r-selection and K-selection represent the extreme ends of a continuum, not absolute categories. Most species fall somewhere between the two extremes or exhibit a mix of traits. For example, sea turtles live a very long time and reproduce repeatedly (K-selected traits), but they produce large clutches of unprotected eggs with high infant mortality (r-selected traits). Therefore, while the r/K framework is a valuable heuristic tool for comparing broad ecological strategies, life histories in nature are extraordinarily diverse and finely tuned to specific evolutionary pressures.

## 23.5 Human Population Dynamics and Global Footprint

For most of human history, our population grew very slowly. High birth rates were offset by high death rates due to disease, famine, and environmental hazards. However, starting with the Industrial Revolution and accelerating through the 20th century with advancements in medicine, sanitation, and agriculture, the global human population entered a phase of exponential growth.

While the human population is still increasing in absolute numbers, the global rate of growth ($r$) peaked in the 1960s and has been declining ever since. This deceleration is primarily due to a phenomenon known as the **demographic transition**.

### The Demographic Transition

The demographic transition is a shift from high birth and death rates to low birth and death rates, which typically accompanies industrialization and improved living conditions.

1. **Pre-industrial stage:** High birth and death rates; population grows slowly.
2. **Transitional stage:** Death rates drop rapidly due to better health care and food production, but birth rates remain high; population grows exponentially.
3. **Industrial stage:** Birth rates begin to fall due to increased access to contraception, higher education for women, and shifts in cultural values; population growth slows.
4. **Post-industrial stage:** Birth rates equal death rates (or fall below them); population growth reaches zero or becomes negative.

### Age Structure Diagrams

To predict a population's future growth trends, demographers analyze its **age structure**—the relative number of individuals of each age in the population. Age structure is typically represented by a graphical pyramid, separating the population into males and females and categorizing them by age cohorts (e.g., pre-reproductive, reproductive, and post-reproductive years).

The shape of the pyramid provides immediate visual insight into the population's trajectory:

```text
             Rapid Growth (e.g., Sub-Saharan Africa)
Age 80+           | 
Age 60-79       ***|*** 
Age 40-59     *****|***** 
Age 20-39   *******|******* 
Age 0-19  *********|********* 
          (Broad base indicates a high birth rate and a 
           population that will double rapidly.)

             Zero or Slow Growth (e.g., United States)
Age 80+          **|** 
Age 60-79      ****|**** 
Age 40-59     *****|***** 
Age 20-39     *****|***** 
Age 0-19      *****|***** 
          (Relatively straight sides indicate birth rates 
           and death rates are roughly equal.)

             Negative Growth (e.g., Japan, Italy)
Age 80+         ***|*** 
Age 60-79     *****|***** 
Age 40-59      ****|**** 
Age 20-39       ***|*** 
Age 0-19         **|** 
          (Narrow base indicates birth rates have fallen 
           below replacement levels; population will shrink.)

```

Even if a population with a broad-based pyramid experiences an immediate drop in fertility to replacement levels (approximately 2.1 children per woman), the population will continue to grow for several decades. This phenomenon, known as **demographic momentum**, occurs because the massive cohort of young people currently at the base of the pyramid will eventually enter their reproductive years.

### The Global Ecological Footprint

The human population cannot grow indefinitely. We are bound by the Earth's carrying capacity ($K$). However, estimating $K$ for humans is complex because, unlike other animals, humans use technology to artificially increase carrying capacity (e.g., synthetic fertilizers, desalination) and exhibit massive variations in resource consumption depending on cultural and economic factors.

To address this, ecologists use the concept of the **ecological footprint**. An ecological footprint summarizes the aggregate land and water area required by a person, city, or nation to produce all the resources it consumes and to absorb all the waste it generates.

We can compare the human ecological footprint to Earth's **biocapacity** (the planet's biologically productive area).

* If the global ecological footprint is smaller than the biocapacity, human resource use is sustainable.
* If the global ecological footprint exceeds biocapacity, humanity is in an **ecological deficit**, drawing down natural capital (like ancient groundwater and old-growth forests) faster than it can be replenished, and accumulating waste (like atmospheric $CO_2$) faster than it can be absorbed.

Currently, estimates suggest humanity is significantly overshooting Earth's biocapacity. The footprint concept highlights that human population dynamics are not just about the absolute number of people ($N$), but also the per capita consumption rate. A small population with a massive per capita footprint can exert more pressure on the biosphere than a large population with a minimal footprint. Achieving global sustainability will require stabilizing both population growth and per capita resource consumption.

## Chapter Summary

**Chapter 23: Population Ecology**

* **23.1 Population Density, Dispersion Patterns, and Demographics:** Populations are localized groups of a single species. Ecologists study their density (individuals per unit area), dispersion (clumped, uniform, or random spacing), and demographics (vital statistics over time, illustrated by life tables and Type I, II, and III survivorship curves).
* **23.2 Exponential and Logistic Models of Population Growth:** Population growth is modeled mathematically. The exponential model ($\frac{dN}{dt} = r_{max}N$) describes unconstrained, J-shaped growth. The logistic model ($\frac{dN}{dt} = r_{max}N \frac{(K - N)}{K}$) incorporates carrying capacity ($K$), producing an S-shaped curve as growth slows due to resource limitations.
* **23.3 Density-Dependent and Density-Independent Population Regulation:** Populations are controlled by a mix of density-dependent biotic factors (competition, predation, disease, territoriality) that intensify as populations grow, and density-independent abiotic factors (weather, natural disasters) that affect populations regardless of their size.
* **23.4 Life History Traits and Reproductive Strategies (r- and K-selection):** Life history traits involve trade-offs between survival and reproduction. r-selected species prioritize high fecundity and rapid development in unpredictable environments, while K-selected species prioritize low fecundity and high parental investment in stable, competitive environments.
* **23.5 Human Population Dynamics and Global Footprint:** The human population has experienced unprecedented exponential growth, though the rate is now slowing due to the demographic transition. Age structure pyramids help predict future demographic trends. The ecological footprint concept demonstrates that Earth's carrying capacity depends on both population size and per capita resource consumption.
