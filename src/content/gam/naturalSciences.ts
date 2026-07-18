import type { GamPassage } from '../../engine/types';

/** Natural-sciences seed passages — 100% original content, format modeled on
 *  the official GAM preparatory samples (passage teaches → questions apply). */
export const NATURAL_SCIENCES_PASSAGES: GamPassage[] = [
  {
    id: 'ns-ideal-gas-law',
    topicArea: 'natural-sciences',
    title: 'The Ideal Gas Law',
    difficulty: 'medium',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `The **ideal gas law** links the four quantities that describe a fixed sample of gas: its pressure $p$, its volume $V$, the amount of gas in moles $n$, and its absolute temperature $T$. The relationship is

$pV = nRT$

where $R = 8.314\\ \\text{J mol}^{-1}\\,\\text{K}^{-1}$ is the universal gas constant. The temperature here must always be the **absolute temperature**, measured in kelvin (K), which starts from absolute zero. A Celsius reading is converted by adding 273, so 27 °C is 300 K. Putting a Celsius value straight into the equation gives wrong answers, because the law measures temperature from absolute zero, not from the freezing point of water.

The equation shows how the variables trade off when a fixed sample of gas is changed. Two special cases occur again and again.

An **isothermal** change holds the temperature constant. With $n$ and $T$ fixed, the whole right-hand side $nRT$ is constant, so $pV$ is constant: $p_1 V_1 = p_2 V_2$. Pressure and volume are therefore **inversely** related — halving the volume doubles the pressure.

An **isobaric** change holds the pressure constant. Rearranging gives $V = (nR/p)\\,T$, so volume is **directly proportional** to absolute temperature: $\\dfrac{V_1}{T_1} = \\dfrac{V_2}{T_2}$. Heating a gas at constant pressure from 300 K to 600 K doubles its volume.

| Change | Held constant | Relationship |
|---|---|---|
| isothermal | $T$ | $p_1 V_1 = p_2 V_2$ |
| isobaric | $p$ | $\\dfrac{V_1}{T_1} = \\dfrac{V_2}{T_2}$ |
| isochoric | $V$ | $p_1/T_1 = p_2/T_2$ |

Temperature also carries a **kinetic interpretation**. In kinetic theory the molecules of a gas move about randomly, and the absolute temperature is a direct measure of their **average translational kinetic energy**: $\\bar{E}_k = \\tfrac{3}{2} k_B T$, where $k_B$ is Boltzmann's constant. Because the two are proportional, doubling the absolute temperature doubles the average kinetic energy of the molecules. Pressure itself arises from countless molecular collisions with the container walls, so raising the temperature makes the molecules strike faster and more often — which is why a sealed rigid vessel's pressure climbs as it is heated.

A laboratory holds a fixed quantity of an ideal gas in a cylinder that can be sealed by a movable, frictionless piston. Unless a question states otherwise, the gas behaves ideally throughout, and the amount of gas $n$ never changes during a process.`,
    questions: [
      {
        id: 'ns-ideal-gas-law-q1',
        type: 'gam',
        passageId: 'ns-ideal-gas-law',
        difficulty: 'easy',
        seed: 0,
        stem: 'In the ideal gas law $pV = nRT$, why must the temperature be expressed in kelvin rather than in degrees Celsius?',
        options: [
          'The law measures temperature from absolute zero, so a Celsius value would misstate T',
          'Kelvin and Celsius differ by a constant factor, so Celsius values are always too large',
          'The gas constant R is only defined for temperatures above 0 °C',
          'Volume can be negative on the Celsius scale but not on the kelvin scale',
        ],
        correct: 0,
        explanation:
          'The ideal gas law is built on absolute temperature, which is measured from absolute zero, so temperatures must be in kelvin; a Celsius value would misstate T and break the proportionality. Kelvin and Celsius differ by an additive 273, not by a multiplying factor, R carries no special restriction above 0 °C, and volume is never negative on either scale.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.concept'],
      },
      {
        id: 'ns-ideal-gas-law-q2',
        type: 'gam',
        passageId: 'ns-ideal-gas-law',
        difficulty: 'medium',
        seed: 0,
        stem: 'A sample of ideal gas occupies 6.0 L at a pressure of 100 kPa. It is compressed isothermally until its volume is 2.0 L. What is the new pressure?',
        options: ['300 kPa', 'About 33 kPa', '100 kPa', '600 kPa'],
        correct: 0,
        explanation:
          'Because the temperature is constant, $p_1 V_1 = p_2 V_2$, so $p_2 = p_1\\,V_1/V_2 = 100 \\times 6/2 = 300$ kPa. Multiplying by $V_2/V_1$ instead inverts the relationship and gives about 33 kPa, leaving the pressure at 100 kPa ignores the compression entirely, and 600 kPa is the product $p_1 V_1$ with the final volume left out of the division.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.compute'],
      },
      {
        id: 'ns-ideal-gas-law-q3',
        type: 'gam',
        passageId: 'ns-ideal-gas-law',
        difficulty: 'medium',
        seed: 0,
        stem: 'A gas is heated at constant pressure. Its volume is 3.0 L at 27 °C. What volume does it occupy at 327 °C?',
        options: ['6.0 L', 'About 36 L', '1.5 L', '3.0 L'],
        correct: 0,
        explanation:
          'At constant pressure volume is proportional to absolute temperature, so first convert to kelvin: 27 °C = 300 K and 327 °C = 600 K. Then $V_2 = V_1\\,T_2/T_1 = 3.0 \\times 600/300 = 6.0$ L. Using the Celsius numbers 327 and 27 gives about 36 L, inverting the temperature ratio gives 1.5 L, and leaving the volume unchanged ignores the heating.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.compute'],
      },
      {
        id: 'ns-ideal-gas-law-q4',
        type: 'gam',
        passageId: 'ns-ideal-gas-law',
        difficulty: 'medium',
        seed: 0,
        stem: 'According to the kinetic interpretation in the passage, what happens to the average translational kinetic energy of the molecules when the absolute temperature of the gas is doubled?',
        options: [
          'It doubles, because average kinetic energy is proportional to absolute temperature',
          'It quadruples, because kinetic energy grows with the square of the temperature',
          'It is unchanged, because kinetic energy depends only on the number of molecules',
          'It halves, because the same energy is shared among more frequent collisions',
        ],
        correct: 0,
        explanation:
          'The passage states that the average translational kinetic energy is $\\tfrac{3}{2} k_B T$, directly proportional to the absolute temperature, so doubling $T$ doubles it. Kinetic energy is not proportional to $T^2$, so it does not quadruple; it is not fixed by molecule count alone; and it rises with temperature rather than falling.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.concept'],
      },
      {
        id: 'ns-ideal-gas-law-q5',
        type: 'gam',
        passageId: 'ns-ideal-gas-law',
        difficulty: 'hard',
        seed: 0,
        stem: 'A rigid, sealed steel canister of ideal gas is moved from a 300 K room into a 450 K oven, and its volume cannot change. By what factor does the pressure inside change?',
        options: [
          'It rises by a factor of 1.5',
          'It stays the same, because the sealed canister holds a fixed amount of gas',
          'It rises by a factor of about 6.6',
          'It falls to two-thirds of its original value',
        ],
        correct: 0,
        explanation:
          'The canister is rigid, so the volume is fixed and $p_1/T_1 = p_2/T_2$. Then $p_2 = p_1 \\times 450/300 = 1.5\\,p_1$, a rise by a factor of 1.5. A sealed vessel fixes the amount of gas, not the pressure, so the pressure does not stay constant; using the Celsius readings 27 and 177 gives a wrong factor near 6.6; and 300/450 inverts the ratio to two-thirds.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.transfer'],
      },
      {
        id: 'ns-ideal-gas-law-q6',
        type: 'gam',
        passageId: 'ns-ideal-gas-law',
        difficulty: 'medium',
        seed: 0,
        stem: 'A sealed syringe contains trapped air at 200 kPa. Keeping the temperature constant, a technician pushes the plunger until the trapped air occupies half its original volume. What is the new pressure?',
        options: [
          '400 kPa',
          '100 kPa',
          '200 kPa',
          'It cannot be determined without the absolute temperature in kelvin',
        ],
        correct: 0,
        explanation:
          'The temperature is held constant, so $p_1 V_1 = p_2 V_2$; halving the volume doubles the pressure to 400 kPa. Halving the pressure to 100 kPa treats the relationship as direct rather than inverse, leaving it at 200 kPa ignores the compression, and the actual temperature is not needed because it cancels while it stays constant.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'ns-catalyst-saturation',
    topicArea: 'natural-sciences',
    title: 'Reaction Rate and Catalyst Saturation',
    difficulty: 'hard',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `Many industrial processes speed up a chemical conversion with a **catalyst** — a substance that accelerates a reaction without being consumed. Consider an immobilized catalyst packed into a reactor through which a **substrate** (the starting material) flows. The **reaction rate** $v$ is the amount of substrate converted to product per unit time. Engineers need to know how $v$ depends on the **substrate concentration** $[S]$ that is fed in.

At low substrate concentration most of the catalyst's active sites sit empty, so adding more substrate finds more free sites and the rate rises almost in **direct proportion** to $[S]$. As $[S]$ increases, the sites fill up. Once virtually every site is occupied and busy converting substrate, feeding in still more cannot help — the catalyst is working flat out. The rate then **levels off** at a ceiling called the **maximum rate**, written $v_{\\max}$.

This behaviour is captured by a **saturation curve**:

$v = \\dfrac{v_{\\max}\\,[S]}{K + [S]}$

Here $v_{\\max}$ is the plateau rate approached at very high concentration, and $K$ is the **half-saturation constant**: the substrate concentration at which the rate reaches exactly half of $v_{\\max}$. You can check this by substituting $[S] = K$, which gives $v = v_{\\max}/2$. A **smaller** $K$ therefore means the catalyst reaches high rates at lower substrate concentrations — it becomes half-saturated sooner.

{{fig:saturation-curve}}

Two regimes matter in practice. When $[S]$ is much smaller than $K$, the denominator is roughly $K$, so $v \\approx (v_{\\max}/K)\\,[S]$ — the rate is nearly proportional to concentration (a **first-order** region). When $[S]$ is much larger than $K$, the rate is close to $v_{\\max}$ and barely changes when more substrate is added (a **zero-order**, saturated region).

For the catalyst studied here, the operators measured a maximum rate of $v_{\\max} = 60\\ \\text{mmol L}^{-1}\\text{min}^{-1}$ and a half-saturation constant of $K = 2\\ \\text{mmol L}^{-1}$. Assume these values, and that the temperature and the amount of catalyst stay fixed, throughout the questions below. The saturation curve above is drawn for exactly these values, with the two dashed lines marking the maximum rate and the half-maximal point.`,
    figures: [
      {
        id: 'saturation-curve',
        svg: `<svg viewBox="0 0 320 240" role="img" aria-label="Saturation curve of reaction rate against substrate concentration">
  <line x1="40" y1="120" x2="300" y2="120" stroke="currentColor" stroke-opacity="0.12"/>
  <line x1="40" y1="40" x2="300" y2="40" stroke="currentColor" stroke-opacity="0.12"/>
  <line x1="40" y1="20" x2="40" y2="200" stroke="currentColor" stroke-width="1.5"/>
  <line x1="40" y1="200" x2="310" y2="200" stroke="currentColor" stroke-width="1.5"/>
  <line x1="40" y1="40" x2="300" y2="40" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3"/>
  <line x1="40" y1="120" x2="72.5" y2="120" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3"/>
  <line x1="72.5" y1="120" x2="72.5" y2="200" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 3"/>
  <polyline fill="none" stroke="#A3195B" stroke-width="2.5" points="40,200 56.2,146.7 72.5,120 88.8,104 105,93.3 137.5,80 170,72 202.5,66.7 235,62.9 267.5,60 300,58"/>
  <text x="35" y="204" font-size="11" text-anchor="end" fill="currentColor">0</text>
  <text x="35" y="124" font-size="11" text-anchor="end" fill="currentColor">30</text>
  <text x="35" y="44" font-size="11" text-anchor="end" fill="currentColor">60</text>
  <text x="248" y="34" font-size="12" fill="currentColor">v_max</text>
  <text x="80" y="114" font-size="11" fill="currentColor">half v_max</text>
  <text x="69" y="215" font-size="12" fill="currentColor">K</text>
  <text x="150" y="232" font-size="11" fill="currentColor">Substrate concentration [S]</text>
  <text transform="rotate(-90 12 118)" x="12" y="118" font-size="11" fill="currentColor">Reaction rate v</text>
</svg>`,
        caption:
          'Reaction rate v against substrate concentration [S] for the industrial catalyst. The rate rises steeply at low concentration and bends over toward the maximum rate v_max (upper dashed line); the lower dashed lines mark the half-maximal rate, reached at the half-saturation constant K.',
        alt: 'A saturation curve rising from the origin, steep at first and then flattening to approach a horizontal plateau at v_max on the vertical axis. A dashed horizontal line at half of v_max meets the curve directly above the point K on the horizontal axis.',
      },
    ],
    questions: [
      {
        id: 'ns-catalyst-saturation-q1',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'medium',
        seed: 0,
        stem: 'Reading the figure, what maximum rate does the curve approach at high substrate concentration?',
        options: [
          '60 mmol·L⁻¹·min⁻¹',
          '30 mmol·L⁻¹·min⁻¹',
          '53 mmol·L⁻¹·min⁻¹',
          '45 mmol·L⁻¹·min⁻¹',
        ],
        correct: 0,
        explanation:
          'The curve flattens toward the upper dashed line labelled the maximum rate, which lies on the 60 gridline, so $v_{\\max} = 60$. The lower dashed line at 30 is the half-maximal rate, the curve’s right-hand end near 53 has not yet reached the ceiling, and 45 is only a mid-curve reading, not the plateau.',
        skillTags: ['gam.skill.read-chart'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.read-chart'],
      },
      {
        id: 'ns-catalyst-saturation-q2',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'medium',
        seed: 0,
        stem: 'In this saturation model, what does the constant $K$ represent?',
        options: [
          'The substrate concentration at which the rate reaches half of its maximum',
          'The maximum rate the catalyst reaches when every active site is occupied',
          'The reaction rate measured when no substrate is present',
          'The substrate concentration at which the catalyst stops converting substrate',
        ],
        correct: 0,
        explanation:
          'The passage defines $K$ as the half-saturation constant — the substrate concentration giving half the maximum rate, since substituting $[S] = K$ yields $v = v_{\\max}/2$. It is not the maximum rate itself, not the rate at zero substrate (which is zero), and not a concentration at which the catalyst shuts down.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.concept'],
      },
      {
        id: 'ns-catalyst-saturation-q3',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'medium',
        seed: 0,
        stem: 'Why does the reaction rate level off at high substrate concentration instead of rising without limit?',
        options: [
          'Almost every active site is already occupied, so extra substrate cannot raise the conversion rate',
          'The substrate has been entirely consumed, so no further reaction is possible',
          'The catalyst breaks down once the substrate concentration becomes high',
          'A higher substrate concentration cools the mixture and slows the molecules',
        ],
        correct: 0,
        explanation:
          'At high concentration nearly all of the catalyst’s active sites are occupied, so additional substrate finds no free sites and the rate plateaus at $v_{\\max}$. The substrate is not used up (it is in excess), the catalyst is not destroyed, and raising the concentration does not change the temperature of the mixture.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.concept'],
      },
      {
        id: 'ns-catalyst-saturation-q4',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'hard',
        seed: 0,
        stem: 'Using $v_{\\max} = 60$ and $K = 2$ mmol/L, what is the reaction rate at a substrate concentration of 6 mmol/L?',
        options: [
          '45 mmol·L⁻¹·min⁻¹',
          '15 mmol·L⁻¹·min⁻¹',
          '60 mmol·L⁻¹·min⁻¹',
          '30 mmol·L⁻¹·min⁻¹',
        ],
        correct: 0,
        explanation:
          'Substituting into $v = v_{\\max}[S]/(K + [S])$ gives $60 \\times 6/(2 + 6) = 360/8 = 45$. Swapping the substrate and the constant in the numerator gives $60 \\times 2/8 = 15$; assuming the rate already sits at the maximum gives 60; and multiplying $K$ by $[S]$ in the denominator instead of adding gives $360/12 = 30$.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.compute'],
      },
      {
        id: 'ns-catalyst-saturation-q5',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'medium',
        seed: 0,
        stem: 'At what substrate concentration does the catalyst reach half of its maximum rate, and what is that rate?',
        options: [
          'A concentration of 2 mmol/L, giving a rate of 30 mmol·L⁻¹·min⁻¹',
          'A concentration of 1 mmol/L, giving a rate of 30 mmol·L⁻¹·min⁻¹',
          'A concentration of 2 mmol/L, giving a rate of 60 mmol·L⁻¹·min⁻¹',
          'A concentration of 4 mmol/L, giving a rate of 30 mmol·L⁻¹·min⁻¹',
        ],
        correct: 0,
        explanation:
          'By definition the half-maximal rate occurs at $[S] = K = 2$ mmol/L, where $v = v_{\\max}/2 = 30$. Halving $K$ to 1 or doubling it to 4 misplaces the half-saturation point, and pairing the concentration 2 with the full rate 60 confuses the maximum with the half-maximum.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.compute'],
      },
      {
        id: 'ns-catalyst-saturation-q6',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'hard',
        seed: 0,
        stem: 'A plant operator wants the conversion rate to stay nearly proportional to the substrate fed in, so that doubling the feed nearly doubles the output. Based on the model, in which region should the reactor run?',
        options: [
          'At substrate concentrations well below K, where the curve is nearly linear',
          'At substrate concentrations well above K, where the curve has flattened out',
          'Exactly at the concentration K, where the rate is half of its maximum',
          'At the highest concentration achievable, to push the rate to its maximum',
        ],
        correct: 0,
        explanation:
          'For nearly proportional output the reactor must run where $[S]$ is well below $K$: there the denominator is roughly $K$ and $v \\approx (v_{\\max}/K)\\,[S]$, so doubling the feed nearly doubles the rate. Well above $K$ the curve has plateaued, so extra feed barely changes output; at the concentration $K$ the response is already bending over; and chasing the highest concentration lands squarely in the saturated region.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.transfer'],
      },
      {
        id: 'ns-catalyst-saturation-q7',
        type: 'gam',
        passageId: 'ns-catalyst-saturation',
        difficulty: 'hard',
        seed: 0,
        stem: 'A rival catalyst has the same maximum rate but a smaller half-saturation constant K. At a low substrate concentration, how does its reaction rate compare with the original?',
        options: [
          'Faster, because a smaller K reaches a given fraction of the maximum rate at lower concentration',
          'Slower, because a smaller K lowers the maximum rate the catalyst can reach',
          'Identical, because the two catalysts share the same maximum rate',
          'Faster, because a smaller K raises the maximum rate the catalyst can reach',
        ],
        correct: 0,
        explanation:
          'With the same $v_{\\max}$ but a smaller $K$, the rival becomes half-saturated sooner, so at a low concentration its rate $v = v_{\\max}[S]/(K + [S])$ is higher because the smaller denominator makes the fraction larger. A smaller $K$ does not lower $v_{\\max}$, sharing $v_{\\max}$ does not make the rates equal away from saturation, and a smaller $K$ does not raise $v_{\\max}$.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.natural-sciences', 'gam.skill.transfer'],
      },
    ],
  },
];
