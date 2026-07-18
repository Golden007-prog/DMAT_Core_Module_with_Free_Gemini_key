import type { GamPassage } from '../../engine/types';

/** Mathematics seed passages — 100% original content, format modeled on the
 *  official GAM preparatory samples (passage teaches → questions apply). */
export const MATHEMATICS_PASSAGES: GamPassage[] = [
  {
    id: 'math-matrix-transformations',
    topicArea: 'mathematics',
    title: 'Matrices as Linear Transformations',
    difficulty: 'medium',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `A **matrix** is a rectangular array of numbers. A $2 \\times 2$ matrix is written as

$M = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$

and it acts on a vector $\\vec{v} = (x, y)$ through the **matrix–vector product**:

$M\\vec{v} = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}$

Each coordinate of the result combines one **row** of the matrix with the vector: the first row produces the new first coordinate, and the second row produces the new second coordinate. For example, the matrix $T = \\begin{pmatrix} 2 & 1 \\\\ 1 & 3 \\end{pmatrix}$ sends the vector $(2, 1)$ to $(2 \\cdot 2 + 1 \\cdot 1,\\; 1 \\cdot 2 + 3 \\cdot 1) = (5, 5)$.

Because this rule treats every point of the plane in the same proportional way, a matrix describes a **linear transformation**: it may rotate, stretch, shear or reflect the plane, but it always keeps the origin fixed and maps straight lines to straight lines. The **columns** of the matrix have a direct geometric meaning: the first column $(a, c)$ is the image of the unit vector $(1, 0)$, and the second column $(b, d)$ is the image of the unit vector $(0, 1)$.

A single number summarises how a transformation changes areas. The **determinant** of $M$ is

$\\det M = ad - bc$

Its absolute value is the **area scale factor** of the transformation. The **unit square** — the square with corners $(0,0)$, $(1,0)$, $(1,1)$ and $(0,1)$, with area $1$ — is mapped to a **parallelogram** spanned by the two column vectors, and the area of that parallelogram equals $|\\det M|$. More generally, every region of the plane has its area multiplied by $|\\det M|$. If $\\det M = 0$, the transformation squashes the whole plane onto a single line (or even a single point), so all areas collapse to zero. A negative determinant means that the transformation additionally flips the orientation of the plane, like a mirror image.

{{fig:matrix-parallelogram}} shows the effect of the example matrix $T$: the corner $(1, 0)$ of the unit square is sent to the first column $(2, 1)$, the corner $(0, 1)$ is sent to the second column $(1, 3)$, and the square becomes a tilted parallelogram. Its area is $|\\det T| = |2 \\cdot 3 - 1 \\cdot 1| = 5$, so this transformation makes every figure five times larger in area.`,
    figures: [
      {
        id: 'matrix-parallelogram',
        svg: `<svg viewBox="0 0 320 260">
  <polygon points="40,216 152,168 208,24 96,72" fill="#A3195B" fill-opacity="0.22" stroke="#A3195B" stroke-width="2"/>
  <rect x="40" y="168" width="56" height="48" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
  <line x1="24" y1="216" x2="298" y2="216" stroke="currentColor" stroke-width="1.5"/>
  <polygon points="306,216 296,212 296,220" fill="currentColor"/>
  <line x1="40" y1="234" x2="40" y2="18" stroke="currentColor" stroke-width="1.5"/>
  <polygon points="40,10 36,20 44,20" fill="currentColor"/>
  <line x1="96" y1="213" x2="96" y2="219" stroke="currentColor" stroke-width="1.5"/>
  <line x1="152" y1="213" x2="152" y2="219" stroke="currentColor" stroke-width="1.5"/>
  <line x1="208" y1="213" x2="208" y2="219" stroke="currentColor" stroke-width="1.5"/>
  <line x1="37" y1="168" x2="43" y2="168" stroke="currentColor" stroke-width="1.5"/>
  <line x1="37" y1="72" x2="43" y2="72" stroke="currentColor" stroke-width="1.5"/>
  <text x="92" y="232" font-size="12" font-family="sans-serif" fill="currentColor">1</text>
  <text x="148" y="232" font-size="12" font-family="sans-serif" fill="currentColor">2</text>
  <text x="204" y="232" font-size="12" font-family="sans-serif" fill="currentColor">3</text>
  <text x="24" y="172" font-size="12" font-family="sans-serif" fill="currentColor">1</text>
  <text x="24" y="76" font-size="12" font-family="sans-serif" fill="currentColor">3</text>
  <text x="28" y="231" font-size="12" font-family="sans-serif" fill="currentColor">0</text>
  <text x="302" y="232" font-size="12" font-family="sans-serif" fill="currentColor">x</text>
  <text x="48" y="16" font-size="12" font-family="sans-serif" fill="currentColor">y</text>
  <text x="156" y="184" font-size="12" font-family="sans-serif" fill="currentColor">(2, 1)</text>
  <text x="52" y="64" font-size="12" font-family="sans-serif" fill="currentColor">(1, 3)</text>
  <text x="212" y="20" font-size="12" font-family="sans-serif" fill="currentColor">(3, 4)</text>
</svg>`,
        caption:
          'The matrix T maps the grey unit square to the pink parallelogram spanned by its column vectors (2, 1) and (1, 3).',
        alt: 'Coordinate plane with a small grey unit square at the origin and a larger tilted pink parallelogram with corners at (0, 0), (2, 1), (3, 4) and (1, 3).',
      },
    ],
    questions: [
      {
        id: 'math-matrix-transformations-q1',
        type: 'gam',
        passageId: 'math-matrix-transformations',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, what is the geometric meaning of the two columns of a $2 \\times 2$ matrix?',
        options: [
          'They are the images of the unit vectors $(1, 0)$ and $(0, 1)$ under the transformation',
          'They are the fixed points of the transformation, which never move',
          'They give the areas of the unit square before and after the transformation',
          'They are the coordinates of the origin before and after the transformation',
        ],
        correct: 0,
        explanation:
          'The passage states that the first column is the image of the unit vector $(1, 0)$ and the second column is the image of $(0, 1)$, so the columns record where the transformation sends the two unit vectors. The origin is the one point a linear transformation always keeps fixed, so the columns cannot describe its movement, and areas are summarised by the determinant — a single number — rather than by the columns themselves.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.concept'],
      },
      {
        id: 'math-matrix-transformations-q2',
        type: 'gam',
        passageId: 'math-matrix-transformations',
        difficulty: 'easy',
        seed: 0,
        stem: 'Let $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 1 \\end{pmatrix}$ and $\\vec{v} = \\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix}$. What is the product $A\\vec{v}$?',
        options: ['$(8, 9)$', '$(11, 7)$', '$(9, 8)$', '$(2, 3)$'],
        correct: 0,
        explanation:
          'The first coordinate combines the first row with the vector, $1 \\cdot 2 + 2 \\cdot 3 = 8$, and the second row gives $3 \\cdot 2 + 1 \\cdot 3 = 9$, so the image is $(8, 9)$. The result $(11, 7)$ comes from combining the vector with the columns instead of the rows, $(9, 8)$ swaps the two coordinates of the correct result, and $(2, 3)$ multiplies only the diagonal entries while ignoring the off-diagonal terms.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.compute'],
      },
      {
        id: 'math-matrix-transformations-q3',
        type: 'gam',
        passageId: 'math-matrix-transformations',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is the determinant of the matrix $B = \\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix}$?',
        options: ['$10$', '$14$', '$-10$', '$12$'],
        correct: 0,
        explanation:
          'The formula gives $\\det B = ad - bc = 3 \\cdot 4 - 1 \\cdot 2 = 12 - 2 = 10$. The value $14$ results from adding the two products instead of subtracting them, $-10$ reverses the subtraction to $bc - ad$, and $12$ ignores the product of the off-diagonal entries entirely.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.compute'],
      },
      {
        id: 'math-matrix-transformations-q4',
        type: 'gam',
        passageId: 'math-matrix-transformations',
        difficulty: 'medium',
        seed: 0,
        stem: 'The parallelogram in {{fig:matrix-parallelogram}} is the image of the unit square under the matrix $T = \\begin{pmatrix} 2 & 1 \\\\ 1 & 3 \\end{pmatrix}$. What is the area of this parallelogram?',
        options: ['$5$', '$6$', '$7$', '$1$'],
        correct: 0,
        explanation:
          'The image of the unit square has area equal to the absolute value of the determinant: $|\\det T| = |2 \\cdot 3 - 1 \\cdot 1| = |6 - 1| = 5$. An area of $6$ forgets to subtract the off-diagonal product $1 \\cdot 1$, an area of $7$ adds that product instead of subtracting it, and an area of $1$ would mean the transformation preserves areas, which only happens when the determinant has absolute value one.',
        skillTags: ['gam.skill.read-chart', 'gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.read-chart', 'gam.skill.compute'],
      },
      {
        id: 'math-matrix-transformations-q5',
        type: 'gam',
        passageId: 'math-matrix-transformations',
        difficulty: 'medium',
        seed: 0,
        stem: 'A transformation matrix $C$ satisfies $\\det C = 0$. According to the passage, what does this transformation do to the plane?',
        options: [
          'It squashes the whole plane onto a single line or point, so every area collapses to zero',
          'It leaves every point of the plane exactly where it is',
          'It rotates the plane while preserving all areas',
          'It flips the plane like a mirror image while keeping areas unchanged',
        ],
        correct: 0,
        explanation:
          'The passage states that a zero determinant squashes the whole plane onto a single line or even a single point, so all areas collapse to zero. Leaving every point in place describes the identity transformation, whose determinant is $1$, and preserving areas requires a determinant of absolute value one rather than zero; a mirror-image flip corresponds to a negative determinant, not to a zero one.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.concept'],
      },
      {
        id: 'math-matrix-transformations-q6',
        type: 'gam',
        passageId: 'math-matrix-transformations',
        difficulty: 'medium',
        seed: 0,
        stem: 'A drawing program transforms every figure with the matrix $S = \\begin{pmatrix} 3 & 0 \\\\ 0 & 2 \\end{pmatrix}$. A logo has an area of $4\\,\\text{cm}^2$ before the transformation. What is its area afterwards?',
        options: [
          '$24\\,\\text{cm}^2$',
          '$20\\,\\text{cm}^2$',
          '$12\\,\\text{cm}^2$',
          '$8\\,\\text{cm}^2$',
        ],
        correct: 0,
        explanation:
          'The determinant of the scaling matrix is $3 \\cdot 2 - 0 \\cdot 0 = 6$, and the passage says every region has its area multiplied by this factor, so the logo grows from $4\\,\\text{cm}^2$ to $6 \\cdot 4 = 24\\,\\text{cm}^2$. An answer of $20\\,\\text{cm}^2$ adds the two scale factors to get $5$ instead of multiplying them, while $12\\,\\text{cm}^2$ and $8\\,\\text{cm}^2$ each apply only one of the two stretch factors to the area.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'math-conditional-probability',
    topicArea: 'mathematics',
    title: 'Conditional Probability in Quality Control',
    difficulty: 'hard',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `A factory produces metal housings for electric motors. Before shipping, every housing passes through an automated optical scanner that either **flags** it as possibly defective or **passes** it. To evaluate the scanner, engineers inspected a batch of 1000 housings by hand and compared the true condition of each part with the scanner's verdict. The results are summarised in the following **two-way frequency table**:

| | Flagged | Passed | Total |
|---|---|---|---|
| **Defective** | 90 | 10 | 100 |
| **Intact** | 90 | 810 | 900 |
| **Total** | 180 | 820 | 1000 |

A **conditional probability** is the probability of an event given that another event is known to have occurred. In a frequency table it is computed by restricting attention to the group named in the condition and dividing:

$P(A \\mid B) = \\dfrac{\\text{number of cases with both } A \\text{ and } B}{\\text{number of cases with } B}$

The condition determines the denominator. For example, the probability that a **defective** housing is flagged uses only the defective row: $P(\\text{flagged} \\mid \\text{defective}) = \\dfrac{90}{100} = 0.90$. This quantity is called the **sensitivity** of the scanner. Its counterpart for intact parts is the **false positive rate**: the probability that an **intact** housing is nevertheless flagged, computed from the intact row alone.

The order of conditioning matters. $P(\\text{flagged} \\mid \\text{defective})$ asks "of the defective parts, how many are flagged?", whereas $P(\\text{defective} \\mid \\text{flagged})$ asks "of the flagged parts, how many are really defective?" — a different denominator and, in general, a different value.

The share of defective parts in the whole batch — here $100/1000 = 10\\%$ — is called the **base rate**. When the base rate is low, intact parts far outnumber defective ones, so even a small false positive rate applied to the large intact group produces many false alarms. These false alarms accumulate in the flagged column, where they compete with the true detections. As a result, a scanner can be highly accurate on each group separately and still be wrong about a large fraction of the parts it flags. Ignoring this effect — judging the flagged parts by the scanner's accuracy alone — is known as **base-rate neglect**.`,
    questions: [
      {
        id: 'math-conditional-probability-q1',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'medium',
        seed: 0,
        stem: 'According to the passage, how do $P(\\text{flagged} \\mid \\text{defective})$ and $P(\\text{defective} \\mid \\text{flagged})$ relate to each other?',
        options: [
          'They condition on different groups: the first is computed among the defective housings, the second among the flagged housings',
          'There is no difference: conditional probability is symmetric in its two events',
          'The first is always larger than the second, because the defective housings form the smaller group',
          'They differ only when the scanner makes no classification errors at all',
        ],
        correct: 0,
        explanation:
          'The condition names the group that forms the denominator: the sensitivity $P(\\text{flagged} \\mid \\text{defective})$ is computed among the 100 defective housings and equals $0.90$, while $P(\\text{defective} \\mid \\text{flagged})$ is computed among the 180 flagged housings and equals $0.50$. The two values differ, so conditional probability is not symmetric, and although the first happens to be larger in this table, no general rule guarantees that ordering.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.concept'],
      },
      {
        id: 'math-conditional-probability-q2',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'medium',
        seed: 0,
        stem: 'Using the frequency table, what is the sensitivity of the scanner, $P(\\text{flagged} \\mid \\text{defective})$?',
        options: [
          '$90/100 = 0.90$',
          '$90/180 = 0.50$',
          '$90/1000 = 0.09$',
          '$180/1000 = 0.18$',
        ],
        correct: 0,
        explanation:
          'Sensitivity conditions on the defective housings, so the denominator is the defective row total: $90/100 = 0.90$. Dividing by $180$ conditions on the flagged column and answers a different question, $90/1000 = 0.09$ is the joint share of housings that are defective and flagged at the same time, and $180/1000 = 0.18$ is the overall probability of being flagged regardless of condition.',
        skillTags: ['gam.skill.read-chart', 'gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.read-chart', 'gam.skill.compute'],
      },
      {
        id: 'math-conditional-probability-q3',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is the false positive rate of the scanner, i.e. the probability that an intact housing is nevertheless flagged?',
        options: [
          '$90/900 = 0.10$',
          '$90/180 = 0.50$',
          '$810/900 = 0.90$',
          '$90/1000 = 0.09$',
        ],
        correct: 0,
        explanation:
          'The false positive rate conditions on the intact housings: of the 900 intact parts, 90 are flagged, so the rate is $90/900 = 0.10$. The value $810/900 = 0.90$ is the probability that an intact part is correctly passed — the complement, not the false positive rate — and $90/180 = 0.50$ mistakenly divides by the flagged column total instead of the intact row total.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.compute'],
      },
      {
        id: 'math-conditional-probability-q4',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'hard',
        seed: 0,
        stem: 'The scanner has just flagged a housing. Based on the table, what is the probability that this housing is actually defective?',
        options: ['$0.50$', '$0.90$', '$0.10$', '$0.09$'],
        correct: 0,
        explanation:
          'Conditioning on the flag restricts attention to the flagged column: of the 180 flagged housings, 90 are truly defective, so the probability is $90/180 = 0.50$. The value $0.90$ answers the reversed question of how likely a defective part is to be flagged, $0.10$ is the base rate of defects in the whole batch, and $0.09$ is the joint probability $90/1000$ rather than a conditional one.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.compute'],
      },
      {
        id: 'math-conditional-probability-q5',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'hard',
        seed: 0,
        stem: 'The scanner classifies 90% of the defective housings and 90% of the intact housings correctly, yet only half of the flagged housings are actually defective. According to the passage, what explains this?',
        options: [
          'The intact housings are far more numerous, so their small error rate produces about as many false alarms as there are true detections',
          'The scanner is much less accurate on intact housings than on defective ones',
          'A sample of 1000 housings is too small for the calculated probabilities to be meaningful',
          'Half of all flagged housings turn out to be defective in every batch, regardless of the defect rate',
        ],
        correct: 0,
        explanation:
          'With 900 intact housings, the 10% false positive rate produces $0.10 \\cdot 900 = 90$ false alarms — exactly as many as the 90 true detections — so the flagged group splits evenly. The scanner is equally accurate (90%) on each group, so unequal accuracy cannot be the explanation, and the even split follows from this particular 10% base rate rather than from a law that holds in every batch.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.concept'],
      },
      {
        id: 'math-conditional-probability-q6',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'medium',
        seed: 0,
        stem: 'A housing has been passed by the scanner. What is the probability that it is nevertheless defective?',
        options: [
          '$10/820 \\approx 1.2\\%$',
          '$10/100 = 10\\%$',
          '$10/1000 = 1\\%$',
          '$820/1000 = 82\\%$',
        ],
        correct: 0,
        explanation:
          'Conditioning on a passed verdict restricts attention to the passed column: of the 820 passed housings, 10 are defective, so the probability is $10/820 \\approx 1.2\\%$. Dividing by 100 instead gives the miss rate among the defective parts — the reversed conditioning — and $10/1000 = 1\\%$ is the joint share of housings that are defective and passed at the same time, not a probability conditioned on the verdict.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.compute'],
      },
      {
        id: 'math-conditional-probability-q7',
        type: 'gam',
        passageId: 'math-conditional-probability',
        difficulty: 'hard',
        seed: 0,
        stem: 'The factory improves its process so that only 1% of housings are defective, while the scanner keeps its sensitivity of 0.90 and its false positive rate of 0.10. What happens to the probability that a flagged housing is actually defective?',
        options: [
          'It falls well below 0.50, because false alarms from the large intact group come to dominate the flagged housings',
          'It stays at 0.50, because the properties of the scanner itself have not changed',
          'It rises towards 0.90, because fewer defective housings are left to be missed',
          'It becomes exactly equal to the sensitivity of 0.90',
        ],
        correct: 0,
        explanation:
          'In a batch of 1000 with a 1% defect rate, the scanner flags about $0.90 \\cdot 10 = 9$ of the defective housings but also $0.10 \\cdot 990 = 99$ of the intact ones, so only about $9/108 \\approx 8\\%$ of the flagged parts are defective — far below $0.50$. The probability cannot stay fixed when the base rate changes, and setting it equal to the sensitivity of $0.90$ repeats the confusion between the two directions of conditioning.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.mathematics', 'gam.skill.transfer'],
      },
    ],
  },
];
