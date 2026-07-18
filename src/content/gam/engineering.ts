import type { GamPassage } from '../../engine/types';

/** Engineering seed passages — 100% original content, format modeled on the
 *  official GAM preparatory samples (passage teaches → questions apply). */
export const ENGINEERING_PASSAGES: GamPassage[] = [
  {
    id: 'eng-dc-circuits',
    topicArea: 'engineering',
    title: 'Direct-Current Circuits: Ohm’s Law and Resistor Networks',
    difficulty: 'medium',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `Every electrical device, from a phone charger to an electric locomotive, contains circuits in which a **voltage source** drives an electric current through **resistors**. The voltage $U$ across a resistor (measured in volts, V), the current $I$ through it (in amperes, A) and its resistance $R$ (in ohms, Ω) are linked by **Ohm's law**:

$U = R \\cdot I$

At a fixed voltage the current is therefore inversely proportional to the resistance: doubling the resistance halves the current, and halving the resistance doubles it.

Resistors can be combined in two basic ways, and every larger network is built from these two patterns.

**Series connection.** The resistors form a single chain, so the same current passes through each of them. Their resistances simply add: $R_s = R_1 + R_2$. The source voltage is divided among the resistors in proportion to their resistances — the largest resistance receives the largest share of the voltage.

**Parallel connection.** The resistors form side-by-side branches between the same two nodes, so every branch experiences the **same voltage**. The reciprocals of the resistances add: $\\dfrac{1}{R_p} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}$, which for two resistors gives $R_p = \\dfrac{R_1 \\cdot R_2}{R_1 + R_2}$. For example, 12 Ω and 6 Ω in parallel combine to $R_p = 72/18 = 4$ Ω. The equivalent resistance of a parallel group is always **smaller** than its smallest branch, because every added branch opens an extra path for the current. The total current divides among the branches in inverse proportion to their resistances — the smallest resistance carries the largest current.

**Reducing a mixed network.** A circuit that mixes the two connection types is analysed step by step: first replace each parallel group by its equivalent resistance, then add the resistances that lie in series. Once the total resistance is known, Ohm's law gives the current drawn from the source, and applying the same law again yields the voltage across and the current through every individual resistor.

{{fig:dc-circuit}}

The circuit in the figure is used in the questions. A battery of 12 V drives a series resistor $R_1 = 2$ Ω, which is followed by two resistors $R_2 = 6$ Ω and $R_3 = 3$ Ω connected in parallel with each other. The connecting wires are assumed to be ideal, meaning they have no resistance of their own, and the battery maintains its full voltage at any current.`,
    figures: [
      {
        id: 'dc-circuit',
        svg: `<svg viewBox="0 0 460 230">
  <path d="M40 95 V40 H120 M190 40 H360 V90 M360 150 V200 H40 V113 M280 40 V90 M280 150 V200" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="22" y1="95" x2="58" y2="95" stroke="currentColor" stroke-width="2.5"/>
  <line x1="30" y1="113" x2="50" y2="113" stroke="currentColor" stroke-width="5"/>
  <rect x="120" y="26" width="70" height="28" fill="#A3195B" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
  <rect x="264" y="90" width="32" height="60" fill="#A3195B" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
  <rect x="344" y="90" width="32" height="60" fill="#A3195B" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
  <circle cx="280" cy="40" r="3.5" fill="currentColor"/>
  <circle cx="280" cy="200" r="3.5" fill="currentColor"/>
  <polygon points="108,40 96,34 96,46" fill="currentColor"/>
  <text x="66" y="108" font-size="12" fill="currentColor">12 V</text>
  <text x="155" y="16" font-size="12" fill="currentColor" text-anchor="middle">R1 = 2 Ω</text>
  <text x="254" y="124" font-size="12" fill="currentColor" text-anchor="end">R2 = 6 Ω</text>
  <text x="386" y="124" font-size="12" fill="currentColor">R3 = 3 Ω</text>
  <text x="97" y="62" font-size="12" font-style="italic" fill="currentColor" text-anchor="middle">I</text>
</svg>`,
        caption:
          'The circuit analysed in the questions: a 12 V battery in series with R1 = 2 Ω, followed by R2 = 6 Ω and R3 = 3 Ω connected in parallel.',
        alt: 'Circuit diagram: a 12 V battery connects through a series resistor R1 of 2 ohms to two parallel resistors, R2 of 6 ohms and R3 of 3 ohms. An arrow labelled I marks the current direction from the battery toward R1.',
      },
    ],
    questions: [
      {
        id: 'eng-dc-circuits-q1',
        type: 'gam',
        passageId: 'eng-dc-circuits',
        difficulty: 'easy',
        seed: 0,
        stem: 'A resistor is connected to a source whose voltage is held constant. According to the passage, what happens to the current through the resistor if its resistance is doubled?',
        options: [
          'The current is halved',
          'The current is doubled',
          'The current stays the same, because the source determines the current on its own',
          'The current falls to one quarter of its original value',
        ],
        correct: 0,
        explanation:
          'Ohm’s law can be rearranged to $I = U/R$, so at a fixed voltage the current is inversely proportional to the resistance: doubling $R$ cuts the current to half its previous value. A doubled current would require the resistance to be halved, not doubled. The current cannot stay unchanged, because the source fixes the voltage rather than the current, and a drop to one quarter would require the resistance to be multiplied by four.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.concept'],
      },
      {
        id: 'eng-dc-circuits-q2',
        type: 'gam',
        passageId: 'eng-dc-circuits',
        difficulty: 'easy',
        seed: 0,
        stem: 'Two resistors are connected in parallel. Which statement about their equivalent resistance $R_p$ follows from the passage?',
        options: [
          '$R_p$ is smaller than the smaller of the two individual resistances',
          '$R_p$ is the sum of the two individual resistances',
          '$R_p$ is the arithmetic mean of the two individual resistances',
          '$R_p$ always lies between the two individual resistances',
        ],
        correct: 0,
        explanation:
          'In a parallel connection the reciprocals add, giving $R_p = \\dfrac{R_1 \\cdot R_2}{R_1 + R_2}$, which is always smaller than either branch because every branch opens an additional path for the current — in the passage’s example, 12 Ω and 6 Ω combine to 4 Ω, below the smaller value 6 Ω. Adding the resistances is the rule for a series connection, and the arithmetic mean (9 Ω in that example) as well as any value between the two resistances lies above the true result.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.concept'],
      },
      {
        id: 'eng-dc-circuits-q3',
        type: 'gam',
        passageId: 'eng-dc-circuits',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is the total equivalent resistance of the circuit shown in {{fig:dc-circuit}}?',
        options: ['4 Ω', '11 Ω', '1 Ω', '2 Ω'],
        correct: 0,
        explanation:
          'The parallel pair combines to $\\dfrac{6 \\cdot 3}{6 + 3} = 2$ Ω, and adding the series resistor $R_1$ gives $2 + 2 = 4$ Ω in total. The value 11 Ω treats all three resistors as if they were connected in series, 2 Ω is the parallel pair alone with the series resistor forgotten, and 1 Ω results from treating the whole network as one large parallel group.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.compute'],
      },
      {
        id: 'eng-dc-circuits-q4',
        type: 'gam',
        passageId: 'eng-dc-circuits',
        difficulty: 'medium',
        seed: 0,
        stem: 'How large is the current through the resistor $R_3 = 3$ Ω in the circuit of the figure?',
        options: ['2 A', '1 A', '1.5 A', '3 A'],
        correct: 0,
        explanation:
          'The total resistance is 4 Ω, so the battery delivers $I = 12/4 = 3$ A, and this current flowing through the parallel pair’s equivalent resistance of 2 Ω produces a voltage of $3 \\cdot 2 = 6$ V across each branch. The 3 Ω branch therefore carries $6/3 = 2$ A. The value 1 A is the current in the 6 Ω branch rather than the 3 Ω branch, 1.5 A assumes the 3 A splits equally although the smaller resistance carries the larger share, and 3 A would mean the entire battery current passes through a single branch.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.compute'],
      },
      {
        id: 'eng-dc-circuits-q5',
        type: 'gam',
        passageId: 'eng-dc-circuits',
        difficulty: 'medium',
        seed: 0,
        stem: 'Two identical lamps are to be operated from a single battery. Based on the passage, which statement is correct?',
        options: [
          'Connected in parallel, each lamp receives the full battery voltage',
          'Connected in series, each lamp receives the full battery voltage',
          'Connected in parallel, the lamps divide the battery voltage so that each receives half',
          'Connected in series, each lamp carries a larger current than a single lamp connected on its own',
        ],
        correct: 0,
        explanation:
          'Parallel branches lie between the same two nodes, so lamps connected in parallel each experience the full battery voltage. In a series connection the two identical lamps divide the source voltage equally, so each receives only half — the claim that series lamps get the full voltage swaps the two rules. Series connection also doubles the total resistance, so the current is smaller than for a single lamp, not larger.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.transfer'],
      },
      {
        id: 'eng-dc-circuits-q6',
        type: 'gam',
        passageId: 'eng-dc-circuits',
        difficulty: 'medium',
        seed: 0,
        stem: 'A power strip connects several appliances in parallel to the mains supply, whose voltage stays constant. According to the passage, what happens as additional appliances are switched on?',
        options: [
          'The equivalent resistance of the group falls and the total current drawn from the supply rises',
          'The equivalent resistance of the group rises, because each new appliance adds its resistance to the total',
          'The total current stays the same and is simply shared out among more appliances',
          'Each appliance receives a smaller share of the mains voltage as more are added',
        ],
        correct: 0,
        explanation:
          'Every switched-on appliance adds another parallel branch, and each added branch lowers the equivalent resistance of the group below its smallest member. Because the mains voltage is fixed, Ohm’s law $I = U/R$ then forces the total current to rise. A rising total resistance would describe appliances chained in series, and a shrinking per-appliance voltage contradicts the parallel rule that every branch keeps the full supply voltage.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'eng-levers-moments',
    topicArea: 'engineering',
    title: 'Levers, Moments and Stability',
    difficulty: 'hard',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `When a force acts on a body that can rotate about a fixed **pivot**, its turning effect is called the **moment** (or torque) of the force. The moment $M$ equals the force $F$ multiplied by its **lever arm** $a$, the perpendicular distance between the pivot and the line along which the force acts:

$M = F \\cdot a$

With force in newtons (N) and distance in metres (m), moments are measured in newton-metres (N·m). Two consequences follow directly. First, the same force turns more strongly the farther from the pivot it is applied. Second, a force whose line of action passes through the pivot itself has a lever arm of zero and therefore no turning effect at all.

Every moment acts in a definite sense of rotation, either clockwise or counterclockwise about the pivot. A body free to rotate is in **rotational equilibrium** when the sum of all clockwise moments equals the sum of all counterclockwise moments. This **principle of moments** allows an unknown force or distance to be computed whenever the remaining quantities are known. A useful consequence: taking moments about the pivot makes every force that acts at the pivot drop out of the equation, because its lever arm is zero.

The weight of a body of mass $m$ is the downward force $W = m \\cdot g$; throughout this passage use $g = 10$ N/kg. Although weight is distributed over the whole body, it may be treated as a single force acting at one point, the **centre of gravity**. For a uniform beam the centre of gravity lies at the geometric midpoint.

Two devices set the scene for the questions. A playground **seesaw** consists of a uniform beam pivoted exactly at its centre of gravity, so the beam's own weight produces no moment. A child of mass 30 kg sits 2.0 m to the left of the pivot. A **tower crane** balances the moment of its hanging load against a fixed counterweight of 20,000 N mounted 3.0 m from the tower, on the side opposite the load; the load hangs from a trolley that can travel outward along the jib.

Finally, moments explain **stability**. A body standing on the ground rests on its **base**, the area enclosed by its points of contact. As long as the vertical line through the centre of gravity passes inside the base, the weight produces a restoring moment that turns the tilted body back onto its base, and it remains standing. If the body is tilted so far that this vertical line crosses outside the base, the weight's moment tips it over instead. A low centre of gravity and a wide base therefore make a body more stable, because it must be tilted through a larger angle before the line leaves the base.`,
    questions: [
      {
        id: 'eng-levers-moments-q1',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'medium',
        seed: 0,
        stem: 'According to the passage, which of the following changes increases the moment of a force about a pivot?',
        options: [
          'Applying the same force at a greater perpendicular distance from the pivot',
          'Moving the point of application closer to the pivot while keeping the force the same',
          'Directing the force so that its line of action passes through the pivot',
          'Halving the force while keeping the lever arm unchanged',
        ],
        correct: 0,
        explanation:
          'The moment is $M = F \\cdot a$, so applying the same force at a greater perpendicular distance increases its turning effect in direct proportion to the lever arm. Moving the force closer to the pivot shrinks the lever arm and weakens the moment, and halving the force halves the moment. A force whose line of action passes through the pivot has a lever arm of zero and produces no turning effect at all.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.concept'],
      },
      {
        id: 'eng-levers-moments-q2',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'medium',
        seed: 0,
        stem: 'A second child of mass 40 kg climbs onto the seesaw described in the passage, on the side opposite the 30 kg child. At what distance from the pivot must the 40 kg child sit so that the seesaw balances?',
        options: ['1.5 m', 'Approximately 2.7 m', '2.0 m', '15 m'],
        correct: 0,
        explanation:
          'The 30 kg child weighs 30 × 10 = 300 N and produces a moment of 300 N × 2.0 m = 600 N·m about the pivot; the 40 kg child weighs 400 N, so balance requires a distance of 600 ÷ 400 = 1.5 m. A distance of about 2.7 m scales the 2.0 m by 40/30 instead of 30/40 — but the heavier child must sit closer to the pivot, not farther away. Sitting at the same 2.0 m would balance only two equal weights, and 15 m comes from dividing 600 N·m by the mass of 40 kg instead of by the weight of 400 N.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.compute'],
      },
      {
        id: 'eng-levers-moments-q3',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'hard',
        seed: 0,
        stem: 'The crane’s trolley moves the load suspension point to 10.0 m from the tower, on the side opposite the counterweight. Ignoring the weight of the jib itself, what is the heaviest load that can hang there without creating a net moment about the tower?',
        options: ['6,000 N', 'Approximately 66,700 N', '20,000 N', '60,000 N'],
        correct: 0,
        explanation:
          'The counterweight provides a moment of 20,000 N × 3.0 m = 60,000 N·m about the tower, so a load 10.0 m out may weigh at most 60,000 ÷ 10.0 = 6,000 N. A load of 20,000 N simply matches the counterweight force and ignores the unequal lever arms, while 60,000 N confuses the moment (measured in N·m) with a force (measured in N). Roughly 66,700 N results from multiplying by the distance ratio 10/3 instead of dividing by it.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.compute'],
      },
      {
        id: 'eng-levers-moments-q4',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'hard',
        seed: 0,
        stem: 'A uniform beam of weight 200 N and length 4.0 m is attached to a wall by a hinge at its left end and held horizontal by a vertical rope fastened to its right end. What is the tension in the rope?',
        options: ['100 N', '200 N', '400 N', '50 N'],
        correct: 0,
        explanation:
          'Taking moments about the hinge makes the unknown hinge force drop out of the equation. The beam’s weight of 200 N acts at its centre of gravity, 2.0 m from the hinge, giving a moment of 200 N × 2.0 m = 400 N·m, so the rope pulling at 4.0 m must supply a tension of 400 ÷ 4.0 = 100 N. A tension of 200 N would mean the rope alone carries the whole weight although the hinge supports part of it, 400 N swaps the two lever arms, and 50 N divides the weight by the beam length without ever using the 2.0 m arm of the weight.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.compute'],
      },
      {
        id: 'eng-levers-moments-q5',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'medium',
        seed: 0,
        stem: 'Which statement about the centre of gravity is consistent with the passage?',
        options: [
          'It is the single point at which the entire distributed weight of a body can be treated as acting',
          'It is always located at the pivot about which the body rotates',
          'For a uniform beam, it lies at whichever end of the beam is heavier',
          'It is the point where the supporting forces from the ground act on the body',
        ],
        correct: 0,
        explanation:
          'The passage defines the centre of gravity as the one point at which a body’s distributed weight may be treated as a single acting force, lying at the geometric midpoint for a uniform beam. It coincides with the pivot only in special constructions such as the seesaw, so it is not always at the pivot; a uniform beam has no heavier end, since its mass is spread evenly; and supporting forces act at the contact points that form the base, not at the centre of gravity.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.concept'],
      },
      {
        id: 'eng-levers-moments-q6',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'hard',
        seed: 0,
        stem: 'A racing car is designed with a wide wheelbase and with its heavy components, such as the engine, mounted as low as possible. Based on the stability reasoning in the passage, why does this design make the car harder to overturn?',
        options: [
          'The car must be tilted through a larger angle before the vertical line through its centre of gravity leaves the base',
          'Mounting the components lower increases the car’s total weight, which presses it more firmly onto the road',
          'A wider wheelbase raises the centre of gravity, which strengthens the restoring moment',
          'The design removes every moment about the wheels, so the car cannot tip at any angle',
        ],
        correct: 0,
        explanation:
          'A body tips only once the vertical line through its centre of gravity crosses outside its base, and a low centre of gravity combined with a wide base means the car must tilt through a larger angle before that happens. Mounting components lower rearranges the mass but does not increase the car’s total weight, and a wider base does not raise the centre of gravity. Moments about the wheels are reduced rather than removed — a sufficiently large tilt would still overturn the car.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.transfer'],
      },
      {
        id: 'eng-levers-moments-q7',
        type: 'gam',
        passageId: 'eng-levers-moments',
        difficulty: 'medium',
        seed: 0,
        stem: 'A gardener uses a wheelbarrow, which works as a lever pivoted at the wheel axle: the load sits in the tray between the axle and the handles, and the gardener lifts at the handles. Where in the tray should a heavy sack be placed so that the smallest lifting force is needed?',
        options: [
          'Close to the wheel, so that the sack’s lever arm about the axle is as small as possible',
          'Close to the handles, so that the sack sits next to the point where the lifting force acts',
          'Exactly in the middle of the tray, because the moments then cancel automatically',
          'Anywhere in the tray — the position makes no difference, because the sack’s weight is the same everywhere',
        ],
        correct: 0,
        explanation:
          'With the wheel axle as the pivot, equilibrium requires the lifting force times the handle distance to equal the sack’s weight times its distance from the axle. Placing the sack close to the wheel makes its lever arm — and therefore its moment — small, so only a small force at the handles is needed. Loading near the handles enlarges the sack’s lever arm until the hands carry nearly the full weight, and the position clearly does matter, because the moment depends on the lever arm and not on the weight alone. A central placement produces no automatic cancellation either — the hands must still supply the balancing moment.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.engineering', 'gam.skill.transfer'],
      },
    ],
  },
];
