import type { GamPassage } from '../../engine/types';

/** Business administration seed passages — 100% original content, format
 *  modeled on the official GAM preparatory samples (passage teaches →
 *  questions apply). */
export const BUSINESS_PASSAGES: GamPassage[] = [
  {
    id: 'ba-break-even-analysis',
    topicArea: 'business-administration',
    title: 'Break-Even Analysis: Costs, Contribution and Safety',
    difficulty: 'easy',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `Every producing firm faces two kinds of costs. **Fixed costs** are costs that do not depend on the number of units produced: rent for the workshop, salaries of permanent staff, insurance premiums and machine leasing fees. They must be paid in full even if the firm produces and sells nothing at all. **Variable costs**, by contrast, arise with every unit made — raw materials, production energy and piece-rate wages. If each unit causes variable costs of $v$ and the firm produces $Q$ units, total costs in a period are

$C(Q) = F + v \\cdot Q$

where $F$ denotes the total fixed costs of that period. Revenue is the selling price per unit times the quantity sold: $R(Q) = p \\cdot Q$.

The difference between the price and the variable cost of one unit is the **contribution margin per unit**, $m = p - v$. Each unit sold contributes this amount first towards covering the fixed costs; only once the fixed costs are fully covered does any further contribution become profit. The margin is therefore not the same as profit per unit: as long as fixed costs remain uncovered, the firm can sell many units and still make a loss.

The firm makes neither a profit nor a loss at the **break-even quantity** $Q^*$, where revenue exactly equals total cost. Setting $p \\cdot Q = F + v \\cdot Q$ and solving for $Q$ gives

$Q^* = \\dfrac{F}{p - v}$

The break-even quantity therefore falls when fixed costs fall or when the contribution margin per unit rises — for example through a higher price or cheaper materials.

Managers also want to know how far sales may drop before the firm slips into the loss zone. The **margin of safety** expresses the buffer between the actual sales volume $Q_a$ and the break-even quantity as a percentage of actual sales:

$\\text{margin of safety} = \\dfrac{Q_a - Q^*}{Q_a} \\times 100\\%$

A margin of safety of 30% means sales could fall by 30% before the firm reaches the break-even point.

Consider Lumina GmbH, a small workshop producing desk lamps. Its fixed costs are €12,000 per month, the variable cost per lamp is €14, and the selling price is €26 per lamp. Lumina currently sells 1,250 lamps per month. The chart in {{fig:break-even-chart}} plots Lumina's revenue line, total cost line and fixed-cost line against the monthly quantity; the marked intersection is analysed in the questions below.`,
    figures: [
      {
        id: 'break-even-chart',
        svg: `<svg viewBox="0 0 480 320" role="img" aria-label="Cost-revenue chart for Lumina GmbH">
  <line x1="60" y1="280" x2="450" y2="280" stroke="currentColor" stroke-width="1.5" />
  <line x1="60" y1="280" x2="60" y2="28" stroke="currentColor" stroke-width="1.5" />
  <text x="255" y="308" font-size="12" fill="currentColor" text-anchor="middle">Quantity (lamps per month)</text>
  <text x="60" y="18" font-size="12" fill="currentColor" text-anchor="start">Costs and revenue (€ per month)</text>
  <line x1="250" y1="280" x2="250" y2="285" stroke="currentColor" stroke-width="1" />
  <text x="250" y="298" font-size="12" fill="currentColor" text-anchor="middle">1,000</text>
  <line x1="440" y1="280" x2="440" y2="285" stroke="currentColor" stroke-width="1" />
  <text x="440" y="298" font-size="12" fill="currentColor" text-anchor="middle">2,000</text>
  <line x1="55" y1="225" x2="60" y2="225" stroke="currentColor" stroke-width="1" />
  <text x="52" y="229" font-size="12" fill="currentColor" text-anchor="end">12,000</text>
  <line x1="55" y1="160" x2="60" y2="160" stroke="currentColor" stroke-width="1" />
  <text x="52" y="164" font-size="12" fill="currentColor" text-anchor="end">26,000</text>
  <line x1="60" y1="225" x2="440" y2="225" stroke="currentColor" stroke-width="1" stroke-dasharray="6 4" />
  <text x="446" y="218" font-size="12" fill="currentColor" text-anchor="end">Fixed costs</text>
  <line x1="60" y1="225" x2="440" y2="95" stroke="currentColor" stroke-width="2" />
  <text x="446" y="88" font-size="12" fill="currentColor" text-anchor="end">Total cost</text>
  <line x1="60" y1="280" x2="440" y2="40" stroke="currentColor" stroke-width="2" />
  <text x="446" y="34" font-size="12" fill="currentColor" text-anchor="end">Total revenue</text>
  <line x1="250" y1="160" x2="250" y2="280" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />
  <line x1="60" y1="160" x2="250" y2="160" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />
  <circle cx="250" cy="160" r="5" fill="#A3195B" />
  <line x1="255" y1="167" x2="272" y2="194" stroke="currentColor" stroke-width="1" />
  <text x="275" y="205" font-size="12" fill="currentColor" text-anchor="start">Break-even point</text>
</svg>`,
        caption:
          'Cost-revenue chart for Lumina GmbH: total revenue, total cost and fixed costs against monthly quantity, with the break-even point marked.',
        alt: 'Line chart with quantity on the horizontal axis and euros on the vertical axis. A revenue line rises from the origin, a total cost line rises from the fixed-cost level of 12,000 euros with a flatter slope, and a dashed horizontal line marks fixed costs. The revenue and total cost lines intersect at 1,000 lamps and 26,000 euros; this intersection is marked as the break-even point.',
      },
    ],
    questions: [
      {
        id: 'ba-break-even-analysis-q1',
        type: 'gam',
        passageId: 'ba-break-even-analysis',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, which statement correctly characterizes fixed costs?',
        options: [
          'They must be paid in full even when the firm produces and sells nothing',
          'They grow with every additional unit the firm produces',
          'They equal the difference between the selling price and the variable cost per unit',
          'They only arise once production exceeds the break-even quantity',
        ],
        correct: 0,
        explanation:
          'The passage defines fixed costs as costs that do not depend on the quantity produced and must be paid even at zero output — rent, salaries and insurance are the examples given. Costs that grow with every unit are variable costs, the difference between price and variable cost per unit is the contribution margin, and fixed costs exist at every output level, not only beyond break-even.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.concept'],
      },
      {
        id: 'ba-break-even-analysis-q2',
        type: 'gam',
        passageId: 'ba-break-even-analysis',
        difficulty: 'easy',
        seed: 0,
        stem: 'What does the contribution margin per unit represent?',
        options: [
          'The amount each unit sold provides first for covering fixed costs and, once these are covered, for profit',
          'The profit the firm earns on each unit after all costs have been deducted',
          'The variable cost that each additional unit adds to total costs',
          'The revenue a unit generates before any costs are considered',
        ],
        correct: 0,
        explanation:
          'The passage defines the contribution margin per unit as $m = p - v$ — for Lumina, €26 − €14 = €12 per lamp — and explains that this amount first covers fixed costs and only then becomes profit. Treating it as profit per unit ignores that fixed costs must be covered first, which is exactly the distinction the passage warns about; the variable cost and the full unit revenue are components of the calculation, not the margin itself.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.concept'],
      },
      {
        id: 'ba-break-even-analysis-q3',
        type: 'gam',
        passageId: 'ba-break-even-analysis',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is the break-even quantity for Lumina GmbH?',
        options: [
          '1,000 lamps per month',
          'About 462 lamps per month',
          'About 857 lamps per month',
          '300 lamps per month',
        ],
        correct: 0,
        explanation:
          'The contribution margin per lamp is €26 − €14 = €12, so the break-even quantity is $Q^* = 12{,}000 / 12 = 1{,}000$ lamps. Dividing the fixed costs by the full price of €26 gives about 462 lamps but ignores that each unit also causes variable costs, and dividing by the variable cost of €14 gives about 857 lamps while ignoring the revenue side; 300 lamps would follow from wrongly adding price and variable cost in the denominator.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.compute'],
      },
      {
        id: 'ba-break-even-analysis-q4',
        type: 'gam',
        passageId: 'ba-break-even-analysis',
        difficulty: 'easy',
        seed: 0,
        stem: 'In the chart {{fig:break-even-chart}}, which feature marks the break-even quantity?',
        options: [
          'The quantity at which the total revenue line intersects the total cost line',
          'The quantity at which the total revenue line crosses the dashed fixed-cost line',
          'The point where the total cost line meets the vertical axis',
          'The quantity at which the vertical gap between the revenue and cost lines is widest',
        ],
        correct: 0,
        explanation:
          'Break-even means revenue equals total cost, so it lies where the revenue and total cost lines intersect — in the chart at 1,000 lamps and €26,000. Where the revenue line crosses the fixed-cost line, revenue covers only fixed costs and ignores the variable costs already incurred; the total cost line meets the vertical axis at the fixed-cost level for zero output; and the widest gap between the lines marks the largest profit in the plotted range, not the point of zero profit.',
        skillTags: ['gam.skill.read-chart'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.read-chart'],
      },
      {
        id: 'ba-break-even-analysis-q5',
        type: 'gam',
        passageId: 'ba-break-even-analysis',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is Lumina GmbH’s margin of safety at its current sales volume of 1,250 lamps per month?',
        options: ['20%', '25%', '80%', '125%'],
        correct: 0,
        explanation:
          'With actual sales of 1,250 lamps and a break-even quantity of 1,000 lamps, the margin of safety is $(1{,}250 - 1{,}000)/1{,}250 = 250/1{,}250 = 20\\%$: sales could fall by a fifth before Lumina reaches break-even. Dividing the buffer of 250 lamps by the break-even quantity instead of actual sales gives 25%, 80% is the share of current sales needed just to break even rather than the safety buffer, and 125% is the ratio of sales to the break-even quantity, not a percentage of sales.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.compute'],
      },
      {
        id: 'ba-break-even-analysis-q6',
        type: 'gam',
        passageId: 'ba-break-even-analysis',
        difficulty: 'medium',
        seed: 0,
        stem: 'A bakery has monthly fixed costs of €5,000, sells each loaf for €4.00 and incurs variable costs of €1.50 per loaf. Applying the method from the passage, what is its break-even quantity?',
        options: [
          '2,000 loaves per month',
          '1,250 loaves per month',
          'About 3,333 loaves per month',
          'About 909 loaves per month',
        ],
        correct: 0,
        explanation:
          'The contribution margin per loaf is €4.00 − €1.50 = €2.50, so the break-even quantity is $5{,}000 / 2.50 = 2{,}000$ loaves. Dividing the fixed costs by the full price of €4.00 gives 1,250 loaves and ignores the variable costs, dividing by the variable cost of €1.50 gives about 3,333 loaves and ignores the price, and about 909 loaves would result from adding price and variable cost to €5.50 instead of subtracting.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'ba-net-present-value',
    topicArea: 'business-administration',
    title: 'Net Present Value: Valuing Cash Flows over Time',
    difficulty: 'medium',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `A euro today is worth more than a euro next year — even in a world without inflation and without any risk of non-payment. The reason is that money available now can be put to work: invested at an annual interest rate of $r = 10\\%$, €100 today grows to €110 in one year and to €121 in two years. This principle is called the **time value of money**, and it means that cash flows occurring at different points in time must not simply be added together.

To make them comparable, future cash flows are converted into their **present value**: the amount that, invested today at rate $r$, would grow into exactly that future cash flow. A cash flow $Z$ arriving at the end of year $t$ has the present value

$PV = Z \\cdot \\dfrac{1}{(1+r)^t}$

The factor $\\dfrac{1}{(1+r)^t}$ is called the **discount factor** for year $t$; multiplying by it is called discounting. At $r = 10\\%$ the discount factor is $1/1.10 = 0.909$ for year 1 and $1/1.21 = 0.826$ for year 2 (both rounded to three decimal places; all calculations below use these rounded values). For example, €1,000 due in one year is worth 1,000 × 0.909 = €909 today. The rate $r$ represents the return of the best alternative use of the money, which is why it is also called the opportunity cost of capital.

The **net present value** (NPV) of an investment project is the sum of the present values of all its cash flows. The initial outlay $A_0$ occurs today ($t = 0$) and is therefore not discounted:

$NPV = -A_0 + \\dfrac{Z_1}{(1+r)^1} + \\dfrac{Z_2}{(1+r)^2} + \\dots$

The **NPV rule** follows directly: accept a project if its NPV is positive, because it then creates more value than investing the same money at rate $r$; reject it if the NPV is negative; at an NPV of exactly zero the firm is indifferent. Note that the size of a positive NPV is measured against zero, not against the initial outlay: even a small positive NPV means the project beats the best alternative. Because every discount factor $1/(1+r)^t$ shrinks when $r$ rises, a higher discount rate lowers the present value of future inflows — and with it the NPV of any project whose future cash flows are positive.

Delta Print GmbH is evaluating a new printing machine with the following expected cash flows:

| End of year | Cash flow |
|---|---|
| 0 (today) | −€9,000 |
| 1 | +€6,000 |
| 2 | +€5,000 |

The firm discounts at $r = 10\\%$ using the rounded factors given above.`,
    questions: [
      {
        id: 'ba-net-present-value-q1',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, why is a euro received today worth more than a euro received in one year?',
        options: [
          'A euro available today can be invested at rate r and grow to more than one euro within the year',
          'Prices always rise over time, so a euro buys less in the future than it does today',
          'Future payments are never certain to arrive, so they must be valued lower',
          'A euro today and a euro in one year are equally valuable as long as inflation is zero',
        ],
        correct: 0,
        explanation:
          'The passage grounds the time value of money purely in the investment opportunity: money available now can be invested at rate $r$, so €100 grows to €110 within a year at 10%. It explicitly states that this holds even without inflation and without any risk of non-payment, so explanations based on rising prices or uncertain payments substitute different concepts for the one taught, and claiming equal value under zero inflation denies the time value of money altogether.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.concept'],
      },
      {
        id: 'ba-net-present-value-q2',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'medium',
        seed: 0,
        stem: 'Using the formula from the passage, which value is closest to the discount factor for a cash flow at the end of year 3 at $r = 10\\%$?',
        options: ['0.751', '0.826', '0.700', '1.331'],
        correct: 0,
        explanation:
          'The discount factor for year 3 is $1/(1.10)^3 = 1/1.331 \\approx 0.751$. The value 0.826 is the year-2 factor, i.e. one year of discounting has been forgotten; 0.700 results from subtracting three times 10% linearly instead of compounding; and 1.331 is $(1.10)^3$ itself — compounding forward instead of discounting, which cannot be right because a discount factor must be smaller than 1.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.compute'],
      },
      {
        id: 'ba-net-present-value-q3',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is the present value of the cash flow Delta Print GmbH expects at the end of year 1?',
        options: ['€5,454.00', '€4,956.00', '€6,600.00', '€5,400.00'],
        correct: 0,
        explanation:
          'The year-1 cash flow of €6,000 is multiplied by the year-1 discount factor: 6,000 × 0.909 = €5,454.00. Using the year-2 factor of 0.826 gives €4,956.00 and discounts one year too far; €6,600.00 is 6,000 × 1.10, which compounds the amount forward instead of discounting it back; and €5,400.00 subtracts a flat 10% of the cash flow, which is not the same as dividing by 1.10.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.compute'],
      },
      {
        id: 'ba-net-present-value-q4',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'hard',
        seed: 0,
        stem: 'Using the rounded discount factors from the passage, what is the net present value of the printing machine project?',
        options: ['€584.00', '€9,584.00', '€2,000.00', '−€584.00'],
        correct: 0,
        explanation:
          'The present values of the inflows are 6,000 × 0.909 = €5,454.00 and 5,000 × 0.826 = €4,130.00, which sum to €9,584.00; subtracting the undiscounted outlay of €9,000 gives an NPV of €584.00. Reporting €9,584.00 forgets to subtract the initial outlay, €2,000.00 is the undiscounted sum 6,000 + 5,000 − 9,000 and ignores discounting entirely, and −€584.00 flips the sign as if the outlay exceeded the discounted inflows.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.compute'],
      },
      {
        id: 'ba-net-present-value-q5',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'medium',
        seed: 0,
        stem: 'Based on the NPV rule from the passage, what should Delta Print GmbH do with the printing machine project, and why?',
        options: [
          'Accept it, because its NPV is positive, so it creates more value than investing the €9,000 at 10%',
          'Reject it, because its NPV is much smaller than the initial outlay of €9,000',
          'Accept it, because the undiscounted inflows of €11,000 exceed the outlay of €9,000',
          'Reject it, because discounting always reduces future cash flows below their nominal value',
        ],
        correct: 0,
        explanation:
          'The NPV rule accepts any project with a positive NPV, and the passage stresses that a positive NPV is measured against zero, not against the size of the outlay — so the NPV of €584 means the machine beats investing €9,000 at 10%. Rejecting it because €584 is small relative to €9,000 applies exactly the comparison the passage rules out; justifying acceptance with the undiscounted surplus of €2,000 reaches a conclusion without discounting, which is the error the NPV method exists to avoid; and the fact that discounting shrinks nominal future amounts says nothing about whether a specific project is worthwhile.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.concept'],
      },
      {
        id: 'ba-net-present-value-q6',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'medium',
        seed: 0,
        stem: 'Suppose Delta Print GmbH keeps the same expected cash flows but discounts at a rate higher than 10%. What happens to the project’s NPV?',
        options: [
          'It decreases, because every future inflow is discounted more heavily',
          'It increases, because a higher rate means the invested money grows faster',
          'It stays the same, because the cash flows themselves have not changed',
          'It always becomes exactly zero, regardless of how high the rate is',
        ],
        correct: 0,
        explanation:
          'The passage states that every discount factor $1/(1+r)^t$ shrinks as $r$ rises, so the present values of the positive future inflows fall while the undiscounted outlay stays at €9,000 — the NPV therefore decreases. The idea that a higher rate raises the NPV confuses the growth of an alternative investment with the value of this project; unchanged cash flows do not imply unchanged present values, because the discount factors change; and the NPV reaches zero only at one particular rate, not at every higher rate.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.concept'],
      },
      {
        id: 'ba-net-present-value-q7',
        type: 'gam',
        passageId: 'ba-net-present-value',
        difficulty: 'hard',
        seed: 0,
        stem: 'A supplier offers Delta Print GmbH a choice: receive €5,000 today or €5,400 at the end of one year. Applying the passage’s method at $r = 10\\%$, which offer should the firm take?',
        options: [
          'The €5,000 today, because the present value of €5,400 in one year is only about €4,909',
          'The €5,400 in one year, because it is the larger amount of money',
          'The €5,400 in one year, because waiting for a payment always earns extra interest',
          'Either offer, because the two amounts differ by less than 10%',
        ],
        correct: 0,
        explanation:
          'Discounting the later payment gives 5,400 × 0.909 = €4,908.60, about €4,909 — less than the €5,000 available today, so the firm should take the money now; equivalently, €5,000 invested at 10% grows to €5,500 in a year, which beats €5,400. Preferring €5,400 for its larger nominal size ignores the time value of money, the interest on waiting accrues to the supplier rather than to the firm, and indifference would require the future payment to be exactly €5,500, so a smaller-than-10% gap is precisely why the offers are not equivalent.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.business-administration', 'gam.skill.transfer'],
      },
    ],
  },
];
