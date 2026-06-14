In previous chapters, we explored foundational acid-base equilibria. However, real-world aqueous environments are rarely simple. This chapter delves into complex systems involving multiple simultaneous reactions. We begin with the common-ion effect and its crucial role in buffer solutions, which resist drastic pH changes. We then analyze dynamic pH curves during acid-base titrations. Finally, we examine the equilibrium of sparingly soluble salts via the solubility-product constant ($K_{sp}$), exploring how pH adjustments and complex ion formation can strategically manipulate precipitation to separate ion mixtures.

## 17.1 The Common-Ion Effect

In Chapter 14, we explored Le Châtelier's principle, which states that a system at equilibrium will shift to counteract any applied stress. In Chapter 16, we applied equilibrium concepts to the dissociation of weak acids and weak bases. We now combine these two concepts to examine what happens when a weak electrolyte and a strong electrolyte containing a shared (or "common") ion are present in the same solution.

The **common-ion effect** is the suppression of the ionization of a weak electrolyte by the presence of a common ion from a strong electrolyte. This phenomenon is a direct consequence of Le Châtelier's principle and plays a critical role in controlling the pH of aqueous solutions.

### Qualitative Analysis of the Common-Ion Effect

Consider an aqueous solution of acetic acid ($CH_3COOH$), a weak acid that partially dissociates into hydrogen ions and acetate ions:

$$CH_3COOH(aq) \rightleftharpoons H^+(aq) + CH_3COO^-(aq)$$

If we add sodium acetate ($CH_3COONa$) to this solution, it dissolves and dissociates completely because it is a soluble ionic salt (a strong electrolyte):

$$CH_3COONa(aq) \rightarrow Na^+(aq) + CH_3COO^-(aq)$$

Both substances produce the acetate ion, $CH_3COO^-$. Therefore, the acetate ion is the **common ion**.

According to Le Châtelier's principle, adding more product ($CH_3COO^-$) to the acetic acid equilibrium places a stress on the right side of the equation. The system will shift to the left to consume the excess acetate, forming more non-ionized $CH_3COOH$ and consuming $H^+$ in the process.

```text
Equilibrium:   CH₃COOH (aq)   ⇌   H⁺ (aq)   +   CH₃COO⁻ (aq)
                                                     ↑
Add CH₃COONa:                                 Added common ion
                                                     |
Shift:         <-------------------------------------+
               (Equilibrium shifts left, suppressing ionization)

```

Because the concentration of $H^+$ decreases as the equilibrium shifts to the left, the solution becomes less acidic, meaning the pH of the solution increases compared to a solution of pure acetic acid of the same concentration.

### Quantitative Analysis: Calculating pH with a Common Ion

To understand the magnitude of the common-ion effect, let us calculate the pH of a solution containing both a weak acid and a strong salt.

**Example Calculation:**
Determine the pH of a solution that is 0.10 M in acetic acid ($CH_3COOH$) and 0.10 M in sodium acetate ($CH_3COONa$). The acid-dissociation constant, $K_a$, for acetic acid is $1.8 \times 10^{-5}$.

**Step 1: Identify the major species in solution.**
The major species are $CH_3COOH$, $Na^+$, $CH_3COO^-$, and $H_2O$. The $Na^+$ ion is a spectator ion and has no acid-base properties. The relevant equilibrium is the dissociation of $CH_3COOH$.

**Step 2: Set up an ICE (Initial, Change, Equilibrium) table.**
Unlike a simple weak acid calculation where the initial concentration of the conjugate base is zero, here we must account for the initial $CH_3COO^-$ provided by the sodium acetate.

| &nbsp; | $CH_3COOH(aq)$ | $\rightleftharpoons$ | $H^+(aq)$ | $+$ | $CH_3COO^-(aq)$ |
| --- | --- | --- | --- | --- | --- |
| **Initial (M)** | 0.10 | &nbsp; | ~0 | &nbsp; | 0.10 |
| **Change (M)** | $-x$ | &nbsp; | $+x$ | &nbsp; | $+x$ |
| **Equilibrium (M)** | $0.10 - x$ | &nbsp; | $x$ | &nbsp; | $0.10 + x$ |

**Step 3: Substitute equilibrium concentrations into the $K_a$ expression.**

$$K_a = \frac{[H^+][CH_3COO^-]}{[CH_3COOH]}$$

$$1.8 \times 10^{-5} = \frac{(x)(0.10 + x)}{0.10 - x}$$

Because $K_a$ is very small, we can assume that $x$ (the amount of acid that dissociates) is negligible compared to 0.10 M. This approximation ($0.10 + x \approx 0.10$ and $0.10 - x \approx 0.10$) simplifies the math significantly:

$$1.8 \times 10^{-5} \approx \frac{(x)(0.10)}{0.10}$$

Solving for $x$:

$$x = 1.8 \times 10^{-5} \text{ M}$$

**Step 4: Calculate the pH.**
Since $x = [H^+]$, the hydrogen ion concentration is $1.8 \times 10^{-5}$ M.

$$\text{pH} = -\log[H^+]$$

$$\text{pH} = -\log(1.8 \times 10^{-5}) = 4.74$$

**Comparison to the Pure Acid:**
If we had calculated the pH of a 0.10 M solution of acetic acid *without* the added sodium acetate, the calculation would yield $[H^+] = 1.3 \times 10^{-3}$ M, resulting in a pH of 2.89. The addition of the common ion significantly suppressed the ionization of the acid, dropping the $[H^+]$ by a factor of nearly 100 and raising the pH from 2.89 to 4.74.

### The Common-Ion Effect in Weak Bases

The common-ion effect applies identically to weak base equilibria. Consider an aqueous solution of ammonia ($NH_3$), a weak base, mixed with ammonium chloride ($NH_4Cl$), a completely soluble strong electrolyte.

$$NH_3(aq) + H_2O(l) \rightleftharpoons NH_4^+(aq) + OH^-(aq)$$

$$NH_4Cl(aq) \rightarrow NH_4^+(aq) + Cl^-(aq)$$

Here, the ammonium ion ($NH_4^+$) is the common ion. The presence of the $NH_4^+$ ion from the salt pushes the weak base equilibrium to the left. This suppresses the ionization of $NH_3$, lowering the concentration of $OH^-$ ions compared to a pure ammonia solution, which consequently lowers the pH.

Understanding how common ions restrict the extent of ionization is fundamental to the study of buffer solutions, which rely entirely on the simultaneous presence of a weak acid and its conjugate base (or a weak base and its conjugate acid) to resist drastic changes in pH. We will explore these specific systems in Section 17.2.

## 17.2 Buffer Solutions and Capacity

Solutions that resist drastic changes in pH upon the addition of small amounts of strong acid or strong base are called **buffer solutions** (or simply buffers). The ability of a buffer to maintain a relatively constant pH is a direct application of the common-ion effect discussed in Section 17.1.

A classic example of a complex, naturally buffered system is human blood. The pH of blood must be maintained within a very narrow range (7.35 to 7.45); a drop below 7.35 or a rise above 7.45 can lead to severe medical complications or death. Buffer systems in the blood, such as the carbonic acid-bicarbonate system, ensure this stability.

### The Composition of a Buffer

To effectively resist pH changes in both directions (acidic and basic), a buffer must contain two components:

1. An **acidic component** to neutralize any added strong base ($OH^-$).
2. A **basic component** to neutralize any added strong acid ($H^+$).

Crucially, these two components must not consume each other in a neutralization reaction. This requirement is exclusively met by mixing a **weak acid and its conjugate base** (e.g., acetic acid and the acetate ion) or a **weak base and its conjugate acid** (e.g., ammonia and the ammonium ion).

A buffer cannot be made from a strong acid and its conjugate base (like $HCl$ and $Cl^-$) because the conjugate base of a strong acid is exceedingly weak and has negligible ability to neutralize added $H^+$.

### How Buffers Work: The Mechanism

Consider a generic buffer solution containing significant and roughly equal concentrations of a weak acid, $HA$, and its conjugate base, $A^-$. The system exists in equilibrium:

$$HA(aq) \rightleftharpoons H^+(aq) + A^-(aq)$$

When a strong electrolyte is introduced, the buffer components react to consume the added ions, preventing a large shift in the free $H^+$ concentration.

**1. Addition of a Strong Acid:**
When a strong acid is added, it introduces $H^+$ ions into the solution. According to Le Châtelier's principle, the system shifts to the left. In practical terms, the basic component of the buffer ($A^-$) reacts with the incoming $H^+$ to form more of the weak acid ($HA$).

$$H^+(aq) + A^-(aq) \rightarrow HA(aq)$$

Because the added $H^+$ is consumed to make a weak acid, the pH of the solution drops only slightly, rather than plummeting as it would in pure water.

**2. Addition of a Strong Base:**
When a strong base is added, it introduces $OH^-$ ions. The acidic component of the buffer ($HA$) neutralizes the hydroxide ions, producing water and more of the conjugate base ($A^-$).

$$OH^-(aq) + HA(aq) \rightarrow H_2O(l) + A^-(aq)$$

Because the added $OH^-$ is consumed, the pH of the solution rises only slightly.

```text
========================================================================
                  BUFFER MECHANISM AT A GLANCE
========================================================================
Initial State: Solution contains roughly equal amounts of HA and A⁻.

                      Addition of OH⁻
          --------------------------------------->
          [HA]                                [A⁻]
   Weak Acid Component                    Conjugate Base Component
          <---------------------------------------
                      Addition of H⁺

* Adding base shifts the balance: [HA] decreases, [A⁻] increases.
* Adding acid shifts the balance: [A⁻] decreases, [HA] increases.
* In both cases, the dangerous strong ions (H⁺ or OH⁻) are consumed.
========================================================================

```

### Buffer Capacity

While buffers are highly effective, their ability to neutralize added acid or base is not infinite. **Buffer capacity** is the amount of acid or base a buffer can neutralize before its pH changes appreciably.

Buffer capacity depends on the absolute concentrations of the buffer components ($HA$ and $A^-$).

* A solution that is 1.0 M in $CH_3COOH$ and 1.0 M in $CH_3COONa$ has the same pH as a solution that is 0.10 M in $CH_3COOH$ and 0.10 M in $CH_3COONa$.
* However, the 1.0 M buffer has a buffer capacity ten times greater than the 0.10 M buffer because it contains ten times the number of moles of the neutralizing agents.

Once the buffering components are depleted (for example, if enough strong acid is added to completely consume all the $A^-$), the buffer is "broken," and any further addition of strong acid will cause the pH to drop dramatically.

### Buffer Range

**Buffer range** is the specific pH range over which a buffer effectively neutralizes added acids and bases.

A buffer is most effective—and its capacity to absorb both acid and base is maximized—when the concentrations of the weak acid and its conjugate base are exactly equal ($[HA] = [A^-]$). As we will prove mathematically in the next section, when $[HA] = [A^-]$, the pH of the buffer is exactly equal to the $pK_a$ of the weak acid.

Therefore, when designing a buffer for a laboratory experiment, chemists select a weak acid whose $pK_a$ is as close as possible to the desired pH. Generally, a buffer is considered effective within a practical range of $\pm 1$ pH unit from the weak acid's $pK_a$:

$$\text{Effective Buffer Range} \approx pK_a \pm 1$$

If the ratio of the buffer components $\frac{[HA]}{[A^-]}$ becomes greater than 10 or less than 0.1, the buffer capacity in one direction becomes too low to be practically useful.

## 17.3 The Henderson-Hasselbalch Equation

In Section 17.1 and 17.2, we calculated the pH of buffer solutions by setting up ICE (Initial, Change, Equilibrium) tables and relying on the assumption that the change in concentration ($x$) is negligibly small compared to the initial concentrations. Because buffer calculations are ubiquitous in chemistry and biology, it is highly convenient to have a specialized mathematical tool that bypasses the need for an ICE table each time. This tool is the **Henderson-Hasselbalch equation**.

### Deriving the Equation

The Henderson-Hasselbalch equation is not a new fundamental principle; it is simply a mathematical rearrangement of the equilibrium-constant expression for a weak acid.

Consider the general dissociation of a weak acid, $HA$:

$$HA(aq) \rightleftharpoons H^+(aq) + A^-(aq)$$

The acid-dissociation constant ($K_a$) expression for this equilibrium is:

$$K_a = \frac{[H^+][A^-]}{[HA]}$$

To isolate the hydrogen ion concentration, we rearrange the equation:

$$[H^+] = K_a \times \frac{[HA]}{[A^-]}$$

Because it is more practical to work with pH rather than raw hydrogen ion concentrations, we take the negative base-10 logarithm ($-\log$) of both sides of the equation:

$$-\log[H^+] = -\log\left(K_a \times \frac{[HA]}{[A^-]}\right)$$

Using the logarithmic property $\log(xy) = \log x + \log y$, we can expand the right side:

$$-\log[H^+] = -\log K_a - \log\left(\frac{[HA]}{[A^-]}\right)$$

Recall that $\text{pH} = -\log[H^+]$ and $pK_a = -\log K_a$. Substituting these definitions into the equation yields:

$$\text{pH} = pK_a - \log\left(\frac{[HA]}{[A^-]}\right)$$

Finally, by inverting the fraction inside the logarithm, we change the sign of the log term, arriving at the standard form of the Henderson-Hasselbalch equation:

$$\text{pH} = pK_a + \log\left(\frac{[A^-]}{[HA]}\right)$$

More generally, this equation is expressed in terms of the conjugate acid-base pair:

$$\text{pH} = pK_a + \log\left(\frac{[\text{base}]}{[\text{acid}]}\right)$$

### Assumptions and Limitations

When using the Henderson-Hasselbalch equation, we typically plug in the **initial** concentrations of the acid and base components rather than the true equilibrium concentrations.

Why is this acceptable? In a buffer system containing appreciable amounts of both a weak acid and its conjugate base, the common-ion effect intensely suppresses the ionization of the acid (and the hydrolysis of the base). Therefore, the amount of $HA$ that dissociates or $A^-$ that reacts with water is exceptionally small. For almost all practical buffer calculations, the approximation $[\text{acid}]_{\text{initial}} \approx [\text{acid}]_{\text{equilibrium}}$ and $[\text{base}]_{\text{initial}} \approx [\text{base}]_{\text{equilibrium}}$ is perfectly valid.

*Note: This approximation fails only if the initial concentrations are extremely dilute (e.g., $< 10^{-3} \text{ M}$) or if the $K_a$ is relatively large, in which case the standard ICE table and quadratic formula must be used.*

### Interpreting Buffer Behavior

The Henderson-Hasselbalch equation provides immediate mathematical proof for the buffer characteristics discussed in Section 17.2:

**1. The Ideal Buffer Condition:**
When the concentration of the weak acid equals the concentration of its conjugate base ($[\text{acid}] = [\text{base}]$), the ratio $[\text{base}]/[\text{acid}]$ becomes 1.
Because $\log(1) = 0$, the equation simplifies to:

$$\text{pH} = pK_a + 0$$

$$\text{pH} = pK_a$$

This confirms that a buffer is centered perfectly around the $pK_a$ of its weak acid component.

**2. Asymmetrical Buffers:**
The pH of the buffer depends purely on the ratio of base to acid, which shifts the pH predictably above or below the $pK_a$:

```text
Ratio [Base]/[Acid]     Logarithmic Term      Resulting pH
------------------------------------------------------------------
   [Base] > [Acid]        log(>1) is positive    pH > pKₐ (More basic)
   [Base] = [Acid]        log(1)  is zero        pH = pKₐ (Ideal center)
   [Base] < [Acid]        log(<1) is negative    pH < pKₐ (More acidic)

```

### Example Calculation

**Problem:**
Calculate the pH of a buffer solution prepared by mixing 0.25 M lactic acid ($HC_3H_5O_3$) and 0.50 M sodium lactate ($NaC_3H_5O_3$). The $K_a$ for lactic acid is $1.4 \times 10^{-4}$.

**Solution:**
First, find the $pK_a$ of lactic acid:

$$pK_a = -\log(1.4 \times 10^{-4}) = 3.85$$

Identify the acid and the base:

* $[\text{acid}] = [HC_3H_5O_3] = 0.25 \text{ M}$
* $[\text{base}] = [C_3H_5O_3^-] = 0.50 \text{ M}$

Apply the Henderson-Hasselbalch equation:

$$\text{pH} = pK_a + \log\left(\frac{[\text{base}]}{[\text{acid}]}\right)$$

$$\text{pH} = 3.85 + \log\left(\frac{0.50}{0.25}\right)$$

$$\text{pH} = 3.85 + \log(2.0)$$

$$\text{pH} = 3.85 + 0.30 = 4.15$$

Because there is twice as much conjugate base as there is weak acid, it is logical that the final pH (4.15) is slightly higher (more basic) than the $pK_a$ (3.85) of the acid.

## 17.4 Acid-Base Titration Curves

In Chapter 4, we introduced acid-base titrations as a stoichiometric technique to determine the concentration of an unknown solution. Now, equipped with a deep understanding of chemical equilibrium and buffer systems, we can examine the dynamic changes in pH that occur throughout a titration.

An **acid-base titration curve** is a graph plotting the pH of the analyte solution as a function of the volume of titrant added. These curves are not merely visual aids; they provide profound insights into the nature of the acid or base, allow us to determine the $pK_a$ of weak electrolytes, and dictate the appropriate selection of pH indicators.

The shape of a titration curve depends heavily on the strengths of the acid and base involved. We will analyze the three most common scenarios.

### Strong Acid–Strong Base Titrations

Consider the titration of a strong acid (like $HCl$) with a strong base (like $NaOH$). The net ionic equation for this neutralization is simply the formation of water:

$$H^+(aq) + OH^-(aq) \rightarrow H_2O(l)$$

The titration curve for this process can be divided into four distinct regions:

1. **Initial State:** Before any base is added, the pH is determined solely by the concentration of the strong acid. Because strong acids dissociate completely, $[H^+]$ equals the initial acid concentration, resulting in a very low pH.
2. **Before the Equivalence Point:** As $NaOH$ is added, the $H^+$ ions are gradually consumed. The pH rises, but very slowly at first, because the scale is logarithmic and a large amount of $H^+$ remains unneutralized.
3. **The Equivalence Point:** At the equivalence point, the moles of added base exactly equal the moles of initial acid. All $H^+$ and $OH^-$ have reacted to form water. The only ions remaining in solution are the spectator ions (e.g., $Na^+$ and $Cl^-$). Because these ions do not hydrolyze (they do not affect pH), the solution is perfectly neutral, and the **pH is exactly 7.00**. The curve shows a dramatic, vertical spike in pH at this volume.
4. **After the Equivalence Point:** Once past the equivalence point, excess $NaOH$ is being added to the solution. The pH is determined entirely by the concentration of the unreacted $OH^-$ ions, resulting in a plateau at a high pH.

```text
====================================================================
         TITRATION CURVE: STRONG ACID vs. STRONG BASE
====================================================================
   pH
   14 |                                      . . . . . . .
      |                                    .
   12 |                                  .
      |                                .
   10 |                              .
      |                              |
    8 |                              |
      | - - - - - - - - - - - - - - -|- - Equivalence Point (pH 7)
    6 |                              |
      |                              |
    4 |                              .
      |                            .
    2 | . . . . . . . . . . . . .
      +--------------------------------|------------------------>
                                     V_eq          Volume of Base (mL)

```

### Weak Acid–Strong Base Titrations

The titration of a weak acid (like acetic acid, $CH_3COOH$) with a strong base ($NaOH$) is far more complex due to the equilibria involved. The curve differs from the strong acid scenario in several crucial ways:

1. **Initial State:** The initial pH is higher than that of a strong acid of the same concentration because the weak acid only partially dissociates. $K_a$ must be used to calculate the initial $[H^+]$.
2. **The Buffer Region:** As the strong base is added, it neutralizes some of the weak acid, converting it into its conjugate base:

$$CH_3COOH(aq) + OH^-(aq) \rightarrow CH_3COO^-(aq) + H_2O(l)$$

The solution now contains significant amounts of both $CH_3COOH$ and its conjugate base, $CH_3COO^-$. This is the definition of a buffer system. Consequently, the curve flattens out, resisting large changes in pH.
3. **The Half-Equivalence Point:** This is a mathematically pivotal moment in the buffer region. When exactly half the volume of base required to reach the equivalence point has been added, exactly half of the weak acid has been converted to its conjugate base.
Therefore, $[\text{acid}] = [\text{base}]$. According to the Henderson-Hasselbalch equation from Section 17.3:

$$\text{pH} = pK_a + \log(1) = pK_a$$

At the half-equivalence point, the pH of the solution is precisely equal to the $pK_a$ of the weak acid. This is the most reliable experimental method for determining a weak acid's dissociation constant.
4. **The Equivalence Point:** At the equivalence point, all of the weak acid has been neutralized and converted to its conjugate base ($CH_3COO^-$). Unlike the strong acid scenario, this conjugate base is not a mere spectator ion; it is a weak base that reacts with water (hydrolysis):

$$CH_3COO^-(aq) + H_2O(l) \rightleftharpoons CH_3COOH(aq) + OH^-(aq)$$

Because this hydrolysis generates $OH^-$ ions, **the pH at the equivalence point of a weak acid–strong base titration is always greater than 7.00**.
5. **After the Equivalence Point:** Beyond the equivalence point, the pH is controlled by the excess strong base. The contribution of $OH^-$ from the weak conjugate base is entirely suppressed by the common-ion effect, so the curve closely mirrors the post-equivalence region of a strong acid titration.

```text
====================================================================
         TITRATION CURVE: WEAK ACID vs. STRONG BASE
====================================================================
   pH
   14 |                                      . . . . . . .
      |                                    .
   12 |                                  .
      |                                .
   10 |                              .
      | - - - - - - - - - - - - - - -|- - Equivalence Point (pH > 7)
    8 |                              |
      |                            .
    6 |             Buffer Region  |
      |          . . . . . . . . .   
    4 |      .                       <--- pH = pKₐ at half-equivalence
      |  .
    2 | 
      +------------------|-------------|------------------------>
                   0.5 V_eq           V_eq         Volume of Base (mL)

```

### Weak Base–Strong Acid Titrations

The titration of a weak base (like ammonia, $NH_3$) with a strong acid (like $HCl$) is essentially the inverse of the weak acid curve.

* The curve begins at a high pH.
* As acid is added, a buffer region forms consisting of the weak base and its conjugate acid (e.g., $NH_3$ and $NH_4^+$).
* At the half-equivalence point, the $pOH$ equals the $pK_b$ of the weak base (or, equivalently, the pH equals the $pK_a$ of the conjugate acid).
* At the equivalence point, all the weak base has been converted into its conjugate acid. Because the conjugate acid hydrolyzes to donate protons to water ($NH_4^+ + H_2O \rightleftharpoons NH_3 + H_3O^+$), **the pH at the equivalence point is always less than 7.00**.

### Titrations of Polyprotic Acids

Polyprotic acids, such as carbonic acid ($H_2CO_3$) or phosphoric acid ($H_3PO_4$), possess more than one ionizable proton. These protons are not removed simultaneously; they are neutralized sequentially.

If the acid-dissociation constants ($K_{a1}, K_{a2}$, etc.) differ by a factor of at least $10^3$, the titration curve will display a distinct, separated "step" with its own equivalence point for each acidic proton.

For example, the titration of $H_3PO_4$ with $NaOH$ exhibits three buffering regions and three equivalence points. The first equivalence point corresponds to the complete conversion of $H_3PO_4$ to $H_2PO_4^-$, the second corresponds to the conversion of $H_2PO_4^-$ to $HPO_4^{2-}$, and the third corresponds to the formation of $PO_4^{3-}$. The volume of titrant required to reach each successive equivalence point is identical, provided the concentration of the titrant remains constant.

## 17.5 Solubility Equilibria and the Solubility-Product Constant ($K_{sp}$)

In Chapter 4, we categorized ionic compounds as either "soluble" or "insoluble" using a set of empirical solubility rules. While this binary classification is highly useful for predicting the outcomes of basic precipitation reactions, it is actually an oversimplification. In reality, even the most "insoluble" ionic compounds dissolve in water to *some* minute extent.

When a sparingly soluble solid is placed in water, it dissolves until the solution becomes saturated. At this point, a dynamic equilibrium is established between the undissolved solid lattice and the aqueous ions in solution. Because this is an equilibrium process, it is governed by the exact same thermodynamic principles we applied to gases and weak acids.

### The Solubility-Product Constant ($K_{sp}$)

Consider the dissolution of barium sulfate ($BaSO_4$), a sparingly soluble salt used as a radiocontrast agent in medical imaging. When solid $BaSO_4$ is added to water, the following equilibrium is established:

$$BaSO_4(s) \rightleftharpoons Ba^{2+}(aq) + SO_4^{2-}(aq)$$

We can write an equilibrium-constant expression for this process. Recall from Chapter 14 that the concentrations of pure solids and pure liquids are constant and are therefore excluded from equilibrium expressions. Consequently, the equilibrium constant for the dissolution of a solid depends only on the concentrations of the ions in solution.

This specific equilibrium constant is called the **solubility-product constant**, denoted as $K_{sp}$. For barium sulfate, the expression is:

$$K_{sp} = [Ba^{2+}][SO_4^{2-}]$$

For a more complex salt, such as calcium phosphate ($Ca_3(PO_4)_2$), the stoichiometric coefficients from the balanced chemical equation become the exponents in the $K_{sp}$ expression:

$$Ca_3(PO_4)_2(s) \rightleftharpoons 3Ca^{2+}(aq) + 2PO_4^{3-}(aq)$$

$$K_{sp} = [Ca^{2+}]^3[PO_4^{3-}]^2$$

### Distinguishing Solubility and $K_{sp}$

It is crucial not to confuse the terms *solubility* and *solubility-product constant*. They are closely related but represent distinctly different quantities:

* **Solubility:** The maximum quantity of a substance that will dissolve in a given volume of solvent to form a saturated solution. It is an extensive property that can change with environmental conditions (like the presence of common ions or pH). It is typically expressed in grams per liter (g/L).
* **Molar Solubility:** The number of moles of solute that dissolve to form one liter of saturated solution. It is expressed in moles per liter (mol/L or M).
* **Solubility-Product Constant ($K_{sp}$):** An equilibrium constant. For a given solute and solvent, its value is constant at a specific temperature, regardless of other ions present in the solution. It is a unitless number.

**Important Note on Comparing Solubilities:** You can only directly compare the $K_{sp}$ values of two different salts to determine which is more soluble *if* they produce the same total number of ions upon dissolution (e.g., comparing $AgCl$ to $BaSO_4$). If the salts have different stoichiometries (e.g., $AgCl$ vs. $PbCl_2$), you must calculate and compare their actual molar solubilities, as the exponents in the $K_{sp}$ expressions will distort a direct comparison.

### Calculating $K_{sp}$ from Experimental Solubility

If the experimental solubility of a sparingly soluble salt is known, we can calculate its $K_{sp}$.

**Example:**
The molar solubility of silver chromate ($Ag_2CrO_4$) in pure water at 25°C is $6.5 \times 10^{-5}$ M. Calculate its $K_{sp}$.

**Step 1: Write the balanced dissociation equation and the $K_{sp}$ expression.**

$$Ag_2CrO_4(s) \rightleftharpoons 2Ag^+(aq) + CrO_4^{2-}(aq)$$

$$K_{sp} = [Ag^+]^2[CrO_4^{2-}]$$

**Step 2: Determine the equilibrium concentrations of the ions.**
Because every 1 mole of $Ag_2CrO_4$ that dissolves produces 2 moles of $Ag^+$ and 1 mole of $CrO_4^{2-}$, the ion concentrations are dictated by the molar solubility:

* $[CrO_4^{2-}] = 6.5 \times 10^{-5}$ M
* $[Ag^+] = 2 \times (6.5 \times 10^{-5} \text{ M}) = 1.3 \times 10^{-4}$ M

**Step 3: Substitute the concentrations into the $K_{sp}$ expression.**

$$K_{sp} = (1.3 \times 10^{-4})^2(6.5 \times 10^{-5})$$

$$K_{sp} = (1.69 \times 10^{-8})(6.5 \times 10^{-5})$$

$$K_{sp} = 1.1 \times 10^{-12}$$

### Calculating Solubility from $K_{sp}$

Conversely, if we know the $K_{sp}$ of a substance from a reference table, we can calculate its molar solubility in pure water using an ICE table.

Let the variable $x$ represent the molar solubility (the moles of solid that dissolve per liter).

**Example:**
Calculate the molar solubility of calcium fluoride ($CaF_2$) at 25°C. The $K_{sp}$ for $CaF_2$ is $3.9 \times 10^{-11}$.

**Step 1: Set up the ICE table.**

| &nbsp; | $CaF_2(s)$ | $\rightleftharpoons$ | $Ca^{2+}(aq)$ | $+$ | $2F^-(aq)$ |
| --- | --- | --- | --- | --- | --- |
| **Initial (M)** | Solid | &nbsp; | 0 | &nbsp; | 0 |
| **Change (M)** | $-x$ | &nbsp; | $+x$ | &nbsp; | $+2x$ |
| **Equilibrium (M)** | Solid | &nbsp; | $x$ | &nbsp; | $2x$ |

*Notice that the solid $CaF_2$ is ignored in the concentration columns, as its quantity does not affect the equilibrium position.*

**Step 2: Substitute equilibrium expressions into $K_{sp}$.**

$$K_{sp} = [Ca^{2+}][F^-]^2$$

$$3.9 \times 10^{-11} = (x)(2x)^2$$

**Step 3: Solve for $x$.**
Be careful to square both the coefficient and the variable inside the parentheses:

$$3.9 \times 10^{-11} = (x)(4x^2)$$

$$3.9 \times 10^{-11} = 4x^3$$

$$x^3 = \frac{3.9 \times 10^{-11}}{4} = 9.75 \times 10^{-12}$$

$$x = \sqrt[3]{9.75 \times 10^{-12}} = 2.1 \times 10^{-4}$$

The molar solubility of calcium fluoride is **$2.1 \times 10^{-4}$ M**. This means that exactly $2.1 \times 10^{-4}$ moles of solid $CaF_2$ will dissolve in 1.0 liter of pure water before the solution becomes saturated.

## 17.6 Factors That Affect Solubility (pH and Complex Ions)

The solubility-product constant ($K_{sp}$) is an equilibrium constant, meaning its value at a given temperature cannot be changed by the addition of other chemicals. However, the *position* of the equilibrium—and thus the measurable macroscopic solubility of a solid—can be dramatically altered if other species in the solution react with the ions produced by the dissolving solid.

By applying Le Châtelier's principle, we can manipulate solubility. We have already seen how adding a common ion decreases solubility (Section 17.1). In this section, we will examine how changing the pH or introducing ligands that form complex ions can significantly increase the solubility of otherwise highly insoluble compounds.

### The Effect of pH on Solubility

The pH of a solution greatly affects the solubility of any sparingly soluble salt that contains a **basic anion**. A basic anion is the conjugate base of a weak acid (such as $F^-$, $CO_3^{2-}$, $S^{2-}$, or $PO_4^{3-}$) or the hydroxide ion ($OH^-$) itself.

Consider the dissolution of magnesium hydroxide, the active ingredient in "milk of magnesia":

$$Mg(OH)_2(s) \rightleftharpoons Mg^{2+}(aq) + 2OH^-(aq)$$

If this system is at equilibrium and we add a strong acid, we are increasing the concentration of $H^+$ ions. The $H^+$ ions will immediately react with the $OH^-$ ions in solution in a neutralization reaction to form water:

$$H^+(aq) + OH^-(aq) \rightarrow H_2O(l)$$

This neutralization essentially removes $OH^-$ from the product side of the solubility equilibrium. According to Le Châtelier's principle, the system will shift to the right to replace the lost $OH^-$, causing more solid $Mg(OH)_2$ to dissolve.

This same principle applies to salts of weak acids. Consider calcium fluoride ($CaF_2$):

$$CaF_2(s) \rightleftharpoons Ca^{2+}(aq) + 2F^-(aq)$$

The fluoride ion ($F^-$) is the conjugate base of the weak acid hydrofluoric acid ($HF$). Therefore, $F^-$ is a weak base. If we lower the pH by adding a strong acid like $HNO_3$, the excess protons will bind to the fluoride ions:

$$H^+(aq) + F^-(aq) \rightleftharpoons HF(aq)$$

```text
========================================================================
             EFFECT OF ACID ON THE SOLUBILITY OF CaF₂
========================================================================

                 CaF₂ (s)   ⇌   Ca²⁺ (aq)  +  2F⁻ (aq)
                                               |
              Added H⁺ reacts with F⁻          |
              to form weak acid HF:            v
                                        H⁺ + F⁻ ⇌ HF

       Result: The secondary reaction acts as a "sink" for F⁻.
               Because [F⁻] drops, the primary equilibrium must 
               shift to the right. More CaF₂ dissolves.
========================================================================

```

Because the concentration of free $F^-$ drops, the primary dissolution equilibrium shifts to the right, and the solubility of $CaF_2$ increases.

**Crucial Exception:** The solubility of a salt containing the anion of a *strong acid* is unaffected by changes in pH. For example, silver chloride ($AgCl$) contains the chloride ion ($Cl^-$), which is the conjugate base of the strong acid $HCl$. Because $Cl^-$ has virtually zero basicity, it will not react with added $H^+$. Therefore, the solubility of $AgCl$ in highly acidic solutions is identical to its solubility in pure water.

**General Rule:** *The solubility of slightly soluble salts containing basic anions increases as the solution becomes more acidic. The solubility of salts containing neutral anions is unaffected by pH.*

### Solubility and the Formation of Complex Ions

A **complex ion** consists of a central metal ion bonded to a group of surrounding molecules or ions, known as **ligands**. Common ligands include water ($H_2O$), ammonia ($NH_3$), the cyanide ion ($CN^-$), and the hydroxide ion ($OH^-$).

The formation of a complex ion can drastically increase the solubility of a metal salt. Let us return to silver chloride ($AgCl$), which has a very low $K_{sp}$ ($1.8 \times 10^{-10}$) and is practically insoluble in pure water and strong acids.

$$AgCl(s) \rightleftharpoons Ag^+(aq) + Cl^-(aq) \quad \quad K_{sp} = 1.8 \times 10^{-10}$$

If we add a concentrated solution of ammonia ($NH_3$) to solid $AgCl$, the solid rapidly dissolves. This happens because silver ions have a very strong affinity for ammonia molecules, forming the diamminesilver(I) complex ion:

$$Ag^+(aq) + 2NH_3(aq) \rightleftharpoons Ag(NH_3)_2^+(aq)$$

The equilibrium constant for the formation of a complex ion is called the **formation constant ($K_f$)**. For this reaction, $K_f = 1.7 \times 10^7$. This massive $K_f$ value indicates that the equilibrium lies extremely far to the right; almost all free $Ag^+$ in the presence of $NH_3$ is converted into the complex ion.

When $AgCl$ is placed in an ammonia solution, both equilibria operate simultaneously. The formation of the complex ion acts as a massive "sink" for $Ag^+$. As $NH_3$ binds the $Ag^+$, the concentration of free $Ag^+$ drops nearly to zero, pulling the $AgCl$ solubility equilibrium far to the right until the solid completely dissolves.

We can find the overall equilibrium constant for the dissolution of $AgCl$ in $NH_3$ by adding the two reactions together and multiplying their equilibrium constants:

$$AgCl(s) \rightleftharpoons Ag^+(aq) + Cl^-(aq) \quad \quad \quad \quad \quad K_{sp} = 1.8 \times 10^{-10}$$

$$Ag^+(aq) + 2NH_3(aq) \rightleftharpoons Ag(NH_3)_2^+(aq) \quad \quad \quad K_f = 1.7 \times 10^7$$

**-----------------------------------------------------------------------------------------**

$$AgCl(s) + 2NH_3(aq) \rightleftharpoons Ag(NH_3)_2^+(aq) + Cl^-(aq) \quad K_{overall} = K_{sp} \times K_f = 3.1 \times 10^{-3}$$

While $3.1 \times 10^{-3}$ might not seem massive, it is roughly ten million times larger than the $K_{sp}$ of $AgCl$ in pure water, demonstrating the profound mobilizing power of complex ion formation.

### Amphoterism

We learned in Chapter 16 that an amphoteric substance can act as either an acid or a base. In the context of solubility, **amphoteric oxides and hydroxides** are slightly soluble compounds that dissolve in both strong acids and strong bases, even though they are practically insoluble in neutral water.

Examples of amphoteric metals include aluminum, zinc, tin, and lead. Consider aluminum hydroxide, $Al(OH)_3$:

1. **In acidic solutions:** It dissolves via the pH effect, as the added protons neutralize its basic hydroxide ions.

$$Al(OH)_3(s) + 3H^+(aq) \rightarrow Al^{3+}(aq) + 3H_2O(l)$$

1. **In strongly basic solutions:** It dissolves due to the formation of a complex ion. The central aluminum ion binds to the excess hydroxide ions in solution to form the soluble aluminate complex ion, $Al(OH)_4^-$.

$$Al(OH)_3(s) + OH^-(aq) \rightleftharpoons Al(OH)_4^-(aq)$$

```text
                  Solubility Behavior of Al(OH)₃
        (Dissolves)         (Precipitates)        (Dissolves)
     <================= | ================= | =================>
    Low pH (Acidic)        Neutral pH ~ 7        High pH (Basic)
     Form: Al³⁺ (aq)       Form: Al(OH)₃(s)      Form: Al(OH)₄⁻ (aq)

```

Amphoterism is heavily utilized in industrial chemistry. For example, the Bayer process purifies bauxite ore (which contains $Al_2O_3$ and iron impurities) by soaking it in hot sodium hydroxide. The amphoteric aluminum oxide dissolves by forming complex ions, while the non-amphoteric iron oxide impurities remain solid and are easily filtered away.

## 17.7 Precipitation and Separation of Ions

In Section 17.5, we calculated the solubility of a compound from its $K_{sp}$ and vice versa. These calculations implicitly assume the system is already at equilibrium. However, a common practical problem in chemistry is determining whether a precipitate will form when two distinct solutions are mixed. To predict this, we must evaluate the system before it reaches equilibrium by using the **reaction quotient ($Q$)**.

### Predicting Precipitation Using the Reaction Quotient ($Q$)

Recall from Chapter 14 that the reaction quotient has the exact same mathematical form as the equilibrium constant, but it is calculated using the *initial* or *current* concentrations of the reactants and products, rather than the equilibrium concentrations.

For the general dissolution of a salt $M_aX_b$:

$$M_aX_b(s) \rightleftharpoons aM^{z+}(aq) + bX^{y-}(aq)$$

The reaction quotient, often called the **ion product** in the context of solubility, is defined as:

$$Q = [M^{z+}]^a[X^{y-}]^b$$

By comparing the value of the calculated ion product ($Q$) to the known solubility-product constant ($K_{sp}$), we can predict the behavior of the solution:

* **If $Q < K_{sp}$:** The solution is unsaturated. No precipitate will form. If any undissolved solid is present, it will continue to dissolve until $Q = K_{sp}$.
* **If $Q = K_{sp}$:** The solution is saturated and precisely at equilibrium. No further net change will occur.
* **If $Q > K_{sp}$:** The solution is temporarily supersaturated. The equilibrium will shift to the left, meaning a **precipitate will form** until the remaining ion concentrations decrease enough so that $Q = K_{sp}$.

**Example Calculation:**
Will a precipitate of lead(II) sulfate ($PbSO_4$) form if we mix 100.0 mL of 0.050 M $Pb(NO_3)_2$ with 400.0 mL of 0.010 M $Na_2SO_4$? The $K_{sp}$ of $PbSO_4$ is $1.6 \times 10^{-8}$.

**Step 1: Calculate the new concentrations upon mixing.**
When the solutions are mixed, the total volume becomes $100.0 \text{ mL} + 400.0 \text{ mL} = 500.0 \text{ mL}$. We must use the dilution equation ($M_1V_1 = M_2V_2$) to find the initial concentrations in the combined mixture before any reaction occurs.

$$[Pb^{2+}] = \frac{(0.050 \text{ M})(100.0 \text{ mL})}{500.0 \text{ mL}} = 0.010 \text{ M}$$

$$[SO_4^{2-}] = \frac{(0.010 \text{ M})(400.0 \text{ mL})}{500.0 \text{ mL}} = 0.0080 \text{ M}$$

**Step 2: Calculate the reaction quotient, $Q$.**
The relevant equilibrium is $PbSO_4(s) \rightleftharpoons Pb^{2+}(aq) + SO_4^{2-}(aq)$.

$$Q = [Pb^{2+}][SO_4^{2-}]$$

$$Q = (0.010)(0.0080) = 8.0 \times 10^{-5}$$

**Step 3: Compare $Q$ to $K_{sp}$.**
Because $8.0 \times 10^{-5} > 1.6 \times 10^{-8}$, $Q > K_{sp}$. A precipitate of lead(II) sulfate **will form**.

### Selective Precipitation

Differences in solubility can be exploited to separate a mixture of ions. **Selective precipitation** is the process of separating two or more ions in a solution by adding a reactant that precipitates one of the ions while leaving the others dissolved.

To achieve clean separation, the precipitating agent must be added slowly, and the $K_{sp}$ values of the potential precipitates must be significantly different.

Imagine a solution containing 0.10 M silver ions ($Ag^+$) and 0.10 M lead(II) ions ($Pb^{2+}$). Can we separate them by adding a source of chloride ions ($Cl^-$), such as a highly soluble $NaCl$ solution?

We must determine which ion precipitates first. This is done by calculating the minimum concentration of $Cl^-$ required to trigger precipitation for each metal.

**For Silver Chloride ($AgCl$):** $K_{sp} = 1.8 \times 10^{-10}$

$$[Cl^-]_{\text{required}} = \frac{K_{sp}}{[Ag^+]} = \frac{1.8 \times 10^{-10}}{0.10} = 1.8 \times 10^{-9} \text{ M}$$

**For Lead(II) Chloride ($PbCl_2$):** $K_{sp} = 1.7 \times 10^{-5}$

$$[Cl^-]_{\text{required}} = \sqrt{\frac{K_{sp}}{[Pb^{2+}]}} = \sqrt{\frac{1.7 \times 10^{-5}}{0.10}} = 1.3 \times 10^{-2} \text{ M}$$

Because silver chloride requires a drastically lower concentration of chloride ions to reach its solubility limit ($1.8 \times 10^{-9}$ M vs $1.3 \times 10^{-2}$ M), $AgCl$ will precipitate first. As we continue to slowly add $Cl^-$, nearly all the $Ag^+$ will precipitate out of the solution long before the $Cl^-$ concentration rises high enough to begin precipitating the $PbCl_2$. The solid $AgCl$ can then be separated from the $Pb^{2+}$-containing liquid via filtration.

### Qualitative Analysis of Metal Cations

The principles of selective precipitation, combined with the pH effects and complex ion formation discussed in Section 17.6, form the foundation of **qualitative analysis**—a classic laboratory method used to determine which specific ions are present in an unknown mixture.

While modern analytical instruments (like atomic absorption spectrometers) have largely replaced these wet-chemistry techniques, the classic separation scheme remains a masterclass in applying aqueous equilibrium principles. The process systematically separates cations into five major groups by sequentially adding specific precipitating agents.

```text
===========================================================================
           CLASSIC QUALITATIVE ANALYSIS SCHEME FOR CATIONS
===========================================================================

[Unknown Mixture of All Cations]
         |
         | Add cold dilute HCl (aq)
         v
+-----------------------+-------------------------------------------------+
| GROUP 1 PRECIPITATE   |  REMAINING SOLUTION (Groups 2-5)                |
| Insoluble Chlorides   |  Add H₂S in acidic medium (low pH, low [S²⁻])   |
| (Ag⁺, Pb²⁺, Hg₂²⁺)    |                                                 |
+-----------------------+        |                                        |
                                 v                                        |
                 +-----------------------+--------------------------------+
                 | GROUP 2 PRECIPITATE   | REMAINING SOLUTION (Groups 3-5)|
                 | Acid-Insoluble        | Add H₂S in basic medium        |
                 | Sulfides              | (high pH, high [S²⁻])          |
                 | (Cu²⁺, Bi³⁺, Cd²⁺,    |                                |
                 |  Sn⁴⁺, etc.)          |       |                        |
                 +-----------------------+       v                        |
                                 +-----------------------+----------------+
                                 | GROUP 3 PRECIPITATE   | REMAINING (4-5)|
                                 | Base-Insoluble        | Add (NH₄)₂CO₃  |
                                 | Sulfides/Hydroxides   |                |
                                 | (Al³⁺, Fe³⁺, Zn²⁺,    |      |         |
                                 |  Ni²⁺, etc.)          |      v         |
                                 +-----------------------+----------------+
                                                 | GROUP 4 PRECIPITATE    |
                                                 | Insoluble Carbonates   |
                                                 | (Ba²⁺, Ca²⁺, Sr²⁺)     |
                                                 +------------------------+
                                                              |
                                                    GROUP 5 (Soluble)
                                                    Alkali Metals & NH₄⁺
                                                    (Na⁺, K⁺)
===========================================================================

```

The success of Group 2 and Group 3 separation is a direct application of the common-ion effect and Le Châtelier's principle.

* In Group 2, the solution is highly acidic. The high $[H^+]$ suppresses the ionization of the weak acid $H_2S$, keeping the sulfide ion concentration ($[S^{2-}]$) extremely low. Only the most highly insoluble sulfides (Group 2) can precipitate.
* In Group 3, the solution is made basic. The $OH^-$ neutralizes $H^+$, causing the $H_2S$ equilibrium to shift right, vastly increasing $[S^{2-}]$. This higher concentration forces the more soluble sulfides (Group 3) to precipitate out of the remaining solution.

## Chapter Summary

Chapter 17 expanded our understanding of aqueous equilibria by introducing systems where multiple concurrent reactions take place.

* **The Common-Ion Effect:** The ionization of a weak electrolyte is suppressed by the addition of a strong electrolyte containing a shared ion, shifting the equilibrium toward the unionized reactant.
* **Buffer Solutions:** Solutions containing a weak acid and its conjugate base (or a weak base and its conjugate acid) resist drastic changes in pH. They function by neutralizing added strong acids and bases without mutually destroying the buffer components.
* **The Henderson-Hasselbalch Equation:** A logarithmic rearrangement of the $K_a$ expression ($\text{pH} = pK_a + \log([\text{base}]/[\text{acid}])$) that simplifies buffer pH calculations. A buffer is most effective when the ratio of base to acid is close to 1, meaning its effective range is roughly $pK_a \pm 1$.
* **Acid-Base Titrations:** Titration curves map the pH changes as a titrant is added to an analyte. The shape of the curve and the pH at the equivalence point depend entirely on the strengths of the reacting acid and base. The half-equivalence point in a weak acid/strong base titration reveals the $pK_a$ of the weak acid.
* **Solubility Equilibria ($K_{sp}$):** Sparingly soluble ionic compounds establish an equilibrium between the solid phase and aqueous ions. $K_{sp}$ provides a quantitative measure of this equilibrium limit.
* **Factors Affecting Solubility:** Solubility can be manipulated. Compounds containing basic anions show increased solubility in acidic solutions. Furthermore, the formation of complex ions (via Lewis acid-base interactions with ligands like $NH_3$ or $OH^-$) can drastically increase the solubility of transition metal salts. Amphoteric substances can dissolve in both strong acids and strong bases.
* **Precipitation and Separation:** The reaction quotient ($Q$) is compared against $K_{sp}$ to predict whether mixing two solutions will form a precipitate. Ions with significantly different $K_{sp}$ values can be isolated through selective precipitation, a principle widely utilized in qualitative analysis schemes.
