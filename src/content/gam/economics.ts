import type { GamPassage } from '../../engine/types';

/** Economics seed passages — 100% original content, format modeled on the
 *  official GAM preparatory samples (passage teaches → questions apply). */
export const ECONOMICS_PASSAGES: GamPassage[] = [
  {
    id: 'econ-price-elasticity',
    topicArea: 'economics',
    title: 'Price Elasticity of Demand',
    difficulty: 'medium',
    estimatedMinutes: 16,
    source: 'seed',
    passageMarkdown: `When the price of a good changes, the quantity that consumers demand changes as well. **Price elasticity of demand** measures how strongly quantity demanded responds to a price change. It is defined as

$E_p = \\dfrac{\\%\\Delta Q}{\\%\\Delta P}$

where $\\%\\Delta Q$ is the percentage change in quantity demanded and $\\%\\Delta P$ is the percentage change in price. Each percentage change is computed relative to its **initial** value: if a price rises from 10 to 11, then $\\%\\Delta P = (11 - 10)/10 = +10\\%$.

For ordinary goods, a price increase reduces quantity demanded, so $E_p$ is negative. Economists classify demand by the **absolute value** of $E_p$:

| $|E_p|$ | Classification | Meaning |
|---|---|---|
| $> 1$ | elastic | quantity responds more than proportionally |
| $= 1$ | unit elastic | quantity responds exactly proportionally |
| $< 1$ | inelastic | quantity responds less than proportionally |

Demand tends to be **more elastic** when close substitutes are available, when the good is a luxury rather than a necessity, when it takes a large share of the consumer's budget, and when consumers have more time to adjust. In the extreme case of **perfectly inelastic** demand, quantity demanded does not react to price at all: $E_p = 0$ and the demand curve is a vertical line.

Elasticity determines what a price change does to **total revenue** (price × quantity sold). If demand is inelastic, the gain from the higher price outweighs the small loss in quantity, so a price increase raises revenue. If demand is elastic, the loss in quantity dominates and the same price increase lowers revenue.

A market research firm observed the following weekly data for two goods, each after a price increase from €10.00 to €11.00:

| Good | Quantity before | Quantity after |
|---|---|---|
| A | 100 units | 95 units |
| B | 100 units | 80 units |

All other market conditions remained unchanged during the observation period, so the quantity changes can be attributed to the price change alone.`,
    questions: [
      {
        id: 'econ-price-elasticity-q1',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'easy',
        seed: 0,
        stem: 'Which of the following best describes what price elasticity of demand measures?',
        options: [
          'How strongly the quantity demanded of a good responds to a change in its price',
          'How strongly the price of a good responds to a change in production costs',
          'The absolute number of units by which demand falls when the price rises by one euro',
          'The share of a consumer’s budget that is spent on a particular good',
        ],
        correct: 0,
        explanation:
          'The passage defines price elasticity of demand as the percentage change in quantity demanded divided by the percentage change in price — that is, the responsiveness of quantity demanded to a price change. Cost pass-through is a different concept, the absolute unit change is not a percentage-based measure, and budget share is only one determinant of elasticity, not its definition.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.economics', 'gam.skill.concept'],
      },
      {
        id: 'econ-price-elasticity-q2',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'medium',
        seed: 0,
        stem: 'Using the observation table, what is the price elasticity of demand for Good A, and how is its demand classified?',
        options: [
          '$E_p = -0.5$; demand is inelastic',
          '$E_p = -2.0$; demand is elastic',
          '$E_p = -0.5$; demand is elastic',
          '$E_p = -1.0$; demand is unit elastic',
        ],
        correct: 0,
        explanation:
          'For Good A the quantity falls from 100 to 95, so $\\%\\Delta Q = -5\\%$, while the price rises from €10.00 to €11.00, so $\\%\\Delta P = +10\\%$. Therefore $E_p = -5/10 = -0.5$. Since $|E_p| = 0.5 < 1$, demand is inelastic. The value $-2.0$ comes from inverting the ratio, and classifying $0.5$ as elastic confuses the two categories.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.economics', 'gam.skill.compute'],
      },
      {
        id: 'econ-price-elasticity-q3',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'medium',
        seed: 0,
        stem: 'What is the price elasticity of demand for Good B, and how is its demand classified?',
        options: [
          '$E_p = -2.0$; demand is elastic',
          '$E_p = -0.5$; demand is inelastic',
          '$E_p = -2.0$; demand is inelastic',
          '$E_p = +2.0$; demand is unit elastic',
        ],
        correct: 0,
        explanation:
          'For Good B the quantity falls from 100 to 80, so $\\%\\Delta Q = -20\\%$, and the price change is again $+10\\%$. Thus $E_p = -20/10 = -2.0$, and since $|E_p| = 2 > 1$, demand is elastic. Classifying a magnitude of 2 as inelastic reverses the rule, and a positive elasticity would require quantity to rise with price, which contradicts the data.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.economics', 'gam.skill.compute'],
      },
      {
        id: 'econ-price-elasticity-q4',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, which change would tend to make the demand for a good MORE elastic?',
        options: [
          'Several close substitutes for the good become available',
          'The good comes to be regarded as a basic necessity',
          'The good takes up a smaller share of consumers’ budgets',
          'Consumers have less time to adjust their purchasing habits',
        ],
        correct: 0,
        explanation:
          'The passage lists the availability of close substitutes as a condition under which demand tends to be more elastic: consumers can easily switch away when the price rises. Necessity status, a smaller budget share, and less adjustment time are all named as conditions associated with less elastic demand, so each of the other statements reverses a determinant.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.economics', 'gam.skill.concept'],
      },
      {
        id: 'econ-price-elasticity-q5',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'hard',
        seed: 0,
        stem: 'By how much does the weekly total revenue from Good A change as a result of the price increase?',
        options: [
          'It increases by €45',
          'It decreases by €55',
          'It stays exactly the same',
          'It increases by €100',
        ],
        correct: 0,
        explanation:
          'Revenue before the change is €10.00 × 100 = €1000. After the change it is €11.00 × 95 = €1045, an increase of €45. This matches the passage’s rule: demand for Good A is inelastic, so the gain from the higher price outweighs the small quantity loss. An increase of €100 would ignore the quantity drop entirely, and unchanged revenue would require unit elasticity.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.economics', 'gam.skill.compute'],
      },
      {
        id: 'econ-price-elasticity-q6',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'medium',
        seed: 0,
        stem: 'A video-streaming service operates in a market with many similar competing services. Based on the passage, what should the service expect if it raises its subscription price?',
        options: [
          'Total revenue falls, because demand with many close substitutes is elastic',
          'Total revenue rises, because subscribers always value entertainment as a necessity',
          'Total revenue is unaffected, because streaming demand is perfectly inelastic',
          'Total revenue rises, because a higher price always increases revenue per subscriber',
        ],
        correct: 0,
        explanation:
          'Many close substitutes make demand elastic, and the passage states that with elastic demand the quantity loss dominates, so a price increase lowers total revenue. Treating entertainment as a necessity contradicts the substitute argument, perfectly inelastic demand would require quantity not to react at all, and the claim that a higher price always raises revenue ignores the quantity response entirely.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.economics', 'gam.skill.transfer'],
      },
      {
        id: 'econ-price-elasticity-q7',
        type: 'gam',
        passageId: 'econ-price-elasticity',
        difficulty: 'hard',
        seed: 0,
        stem: 'A patient requires a fixed dose of a life-saving medication that has no substitutes, and purchases exactly that dose regardless of its price. Which statement correctly describes the demand for this medication?',
        options: [
          'It is perfectly inelastic, with $E_p = 0$ and a vertical demand curve',
          'It is perfectly inelastic, with $E_p = 0$ and a horizontal demand curve',
          'It is unit elastic, because the same quantity is bought at every price',
          'It is highly elastic, because the medication is critically important to the buyer',
        ],
        correct: 0,
        explanation:
          'Quantity demanded does not react to price at all, which the passage defines as perfectly inelastic demand: $E_p = 0$ with a vertical demand curve. A horizontal curve would describe the opposite extreme of perfectly elastic demand, unit elasticity requires proportional (not zero) quantity response, and importance to the buyer makes demand less elastic, not more.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.economics', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'econ-supply-demand',
    topicArea: 'economics',
    title: 'Supply, Demand, and Market Equilibrium',
    difficulty: 'medium',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `In a competitive market, the interaction of many buyers and sellers determines the price of a good. The **demand curve** records, for each possible price, the total quantity that buyers are willing and able to purchase. It slopes downward: the higher the price, the less buyers purchase (the **law of demand**). The **supply curve** records the quantity that sellers are willing to offer at each price. It slopes upward, because a higher price makes additional production worthwhile.

The point where the two curves intersect is the **market equilibrium**: at the **equilibrium price**, quantity demanded exactly equals quantity supplied, and this common value is the **equilibrium quantity**. Consider a weekly market for bottled apple juice described by

$Q_d = 120 - 4P$ and $Q_s = 20 + 6P$

where $P$ is the price in euros and quantities are measured in units per week. Setting $Q_d = Q_s$ gives $120 - 4P = 20 + 6P$, hence $100 = 10P$. The equilibrium price is therefore $P^* = 10$ euros, and the equilibrium quantity is $Q^* = 120 - 4 \\cdot 10 = 80$ units. {{fig:supply-demand-market}} shows this market.

At any other price the market is out of balance. If the price lies **above** the equilibrium price, quantity supplied exceeds quantity demanded; the difference is called **excess supply** (a surplus). Sellers who are left with unsold units undercut one another, and the price falls back toward equilibrium. If the price lies **below** the equilibrium price, quantity demanded exceeds quantity supplied — an **excess demand** (a shortage) — and competition among buyers bids the price up. The equilibrium is therefore self-restoring.

A change in the good's **own price** moves the market **along** the existing curves; it never shifts them. A curve shifts only when some other influence changes. The **demand curve** shifts to the right — more is demanded at every price — when consumer income rises (for a normal good), when the price of a **substitute** rises, when buyers expect the good to become more expensive, or when the number of buyers grows; the opposite changes shift it to the left. The **supply curve** shifts to the right when input costs fall or production technology improves; it shifts to the left when input costs rise or when producers expect higher prices later and therefore hold back output today.

A single shift has predictable consequences: a rightward shift of demand raises the equilibrium price and the equilibrium quantity, while a leftward shift of supply raises the price but lowers the quantity. When the two curves shift at the same time, the direction of one equilibrium variable is certain, but the other depends on the relative size of the shifts and cannot be determined without further information. For example, if demand and supply both shift to the left, the equilibrium quantity certainly falls, but the price may rise, fall, or stay the same.`,
    figures: [
      {
        id: 'supply-demand-market',
        svg: `<svg viewBox="0 0 460 340" role="img">
  <line x1="60" y1="25" x2="60" y2="290" stroke="currentColor" stroke-width="1.5"/>
  <line x1="60" y1="290" x2="430" y2="290" stroke="currentColor" stroke-width="1.5"/>
  <path d="M 60 25 l -4 8 M 60 25 l 4 8 M 430 290 l -8 -4 M 430 290 l -8 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="60" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.55"/>
  <line x1="300" y1="160" x2="300" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.55"/>
  <line x1="60" y1="134" x2="336" y2="134" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.55"/>
  <line x1="276" y1="134" x2="276" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.55"/>
  <line x1="336" y1="134" x2="336" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.55"/>
  <line x1="180" y1="30" x2="360" y2="225" stroke="currentColor" stroke-width="2"/>
  <line x1="210" y1="225" x2="390" y2="95" stroke="currentColor" stroke-width="2"/>
  <line x1="276" y1="134" x2="336" y2="134" stroke="#A3195B" stroke-width="4"/>
  <circle cx="300" cy="160" r="4.5" fill="#A3195B"/>
  <text x="60" y="14" text-anchor="middle" font-size="12" fill="currentColor">Price (€)</text>
  <text x="245" y="332" text-anchor="middle" font-size="12" fill="currentColor">Quantity (units/week)</text>
  <text x="54" y="304" text-anchor="end" font-size="12" fill="currentColor">0</text>
  <text x="54" y="164" text-anchor="end" font-size="12" fill="currentColor">10</text>
  <text x="54" y="138" text-anchor="end" font-size="12" fill="currentColor">12</text>
  <text x="276" y="306" text-anchor="middle" font-size="12" fill="currentColor">72</text>
  <text x="300" y="306" text-anchor="middle" font-size="12" fill="currentColor">80</text>
  <text x="336" y="306" text-anchor="middle" font-size="12" fill="currentColor">92</text>
  <text x="368" y="238" font-size="13" font-weight="bold" fill="currentColor">D</text>
  <text x="396" y="96" font-size="13" font-weight="bold" fill="currentColor">S</text>
  <text x="312" y="166" font-size="13" font-weight="bold" fill="currentColor">E</text>
</svg>`,
        caption:
          'Weekly market for bottled apple juice: demand D, supply S, and equilibrium E. The dashed line at €12 lies above the equilibrium price; the highlighted segment marks the horizontal gap between the two curves at that price.',
        alt: 'Supply and demand diagram for bottled apple juice. Price in euros on the vertical axis, quantity in units per week on the horizontal axis. A downward-sloping demand line D and an upward-sloping supply line S cross at the equilibrium point E at a price of 10 euros and a quantity of 80 units. A dashed horizontal line at a price of 12 euros crosses the demand line at 72 units and the supply line at 92 units, and the horizontal gap between those two crossings is highlighted.',
      },
    ],
    questions: [
      {
        id: 'econ-supply-demand-q1',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'medium',
        seed: 0,
        stem: 'According to the passage, why can a price above the equilibrium price not persist in this market?',
        options: [
          'Unsold units accumulate, and competing sellers cut the price until the surplus disappears',
          'Buyers outbid one another for the good, pushing the price even higher',
          'The demand curve shifts to the right until it passes through the higher price',
          'Sellers immediately withdraw from the market until quantity demanded falls to zero',
        ],
        correct: 0,
        explanation:
          'Above the equilibrium price, quantity supplied exceeds quantity demanded, so sellers are left with unsold units and undercut one another until the price falls back to the equilibrium of €10. Buyers outbidding one another is the adjustment to a shortage, which occurs below the equilibrium price, not above it. The demand curve also does not shift in response to the good’s own price — a price change only moves the market along the existing curves.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.economics', 'gam.skill.concept'],
      },
      {
        id: 'econ-supply-demand-q2',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'medium',
        seed: 0,
        stem: 'In {{fig:supply-demand-market}}, a dashed horizontal line is drawn at a price of €12. What does the highlighted horizontal gap between the two curves at that price represent?',
        options: [
          'An excess supply of 20 units, because quantity supplied (92) exceeds quantity demanded (72)',
          'An excess demand of 20 units, because at €12 buyers want more than sellers are offering',
          'An excess supply of 164 units, the sum of the two quantities at €12',
          'An excess supply of 12 units, equal to the price at which the gap is measured',
        ],
        correct: 0,
        explanation:
          'At €12 the dashed line crosses the demand curve at 72 units and the supply curve at 92 units, so sellers offer 92 − 72 = 20 units more than buyers purchase: an excess supply of 20 units. Because €12 lies above the equilibrium price of €10, the market shows a surplus, so reading the gap as an excess demand reverses the direction of the imbalance. Adding the two quantities to get 164 confuses the sum with the difference, and 12 is the price at which the gap occurs, not the size of the gap.',
        skillTags: ['gam.skill.read-chart', 'gam.skill.compute'],
        ruleTags: ['gam.topic.economics', 'gam.skill.read-chart', 'gam.skill.compute'],
      },
      {
        id: 'econ-supply-demand-q3',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'medium',
        seed: 0,
        stem: 'Suppose a regulation fixes the price of apple juice at €8.00 for one week. Using the demand and supply equations from the passage, what is the market situation at this price?',
        options: [
          'An excess demand of 20 units',
          'An excess supply of 20 units',
          'An excess demand of 40 units',
          'The market is exactly in equilibrium at €8.00',
        ],
        correct: 0,
        explanation:
          'At €8 quantity demanded is $120 - 4 \\cdot 8 = 88$ units while quantity supplied is $20 + 6 \\cdot 8 = 68$ units, so buyers want 20 units more than sellers offer — an excess demand of 20 units. Because €8 lies below the equilibrium price of €10, the market has a shortage, so an excess supply of the same size reverses the direction of the imbalance. A gap of 40 units results from dropping the supply intercept of 20 when computing quantity supplied, and equilibrium would require the price to be €10, not €8.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.economics', 'gam.skill.compute'],
      },
      {
        id: 'econ-supply-demand-q4',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'easy',
        seed: 0,
        stem: 'Four changes are reported in the market for bottled apple juice. According to the passage, which of them causes a movement along the demand curve rather than a shift of the demand curve?',
        options: [
          'Retailers raise the selling price of apple juice itself',
          'The average income of consumers rises',
          'The price of orange juice, a substitute for apple juice, increases',
          'Consumers begin to expect apple juice to become more expensive next month',
        ],
        correct: 0,
        explanation:
          'The passage states that a change in the good’s own price moves the market along the curves and never shifts them, so a higher price of apple juice itself produces a movement along the demand curve. Rising income, a costlier substitute such as orange juice, and expectations of higher future prices are all listed as influences that shift the whole demand curve, because they change the quantity demanded at every price.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.economics', 'gam.skill.concept'],
      },
      {
        id: 'econ-supply-demand-q5',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'medium',
        seed: 0,
        stem: 'Apply the passage’s reasoning to the market for bicycles. Which of the following events would shift the supply curve for bicycles to the right?',
        options: [
          'The price of steel used for bicycle frames falls',
          'The market price of bicycles rises',
          'The average income of bicycle buyers rises',
          'Producers come to expect significantly higher bicycle prices next month',
        ],
        correct: 0,
        explanation:
          'A fall in the price of steel lowers input costs, and the passage names falling input costs as a cause of a rightward supply shift: producers offer more bicycles at every price. A rise in the market price of bicycles only moves sellers along the existing supply curve, higher consumer income shifts the demand curve rather than the supply curve, and producers who expect higher prices next month hold back output today, shifting supply to the left instead of the right.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.economics', 'gam.skill.transfer'],
      },
      {
        id: 'econ-supply-demand-q6',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'hard',
        seed: 0,
        stem: 'Consumer income rises and, since apple juice is a normal good, demand becomes $Q_d = 150 - 4P$ while the supply curve is unchanged. What are the new equilibrium price and quantity?',
        options: [
          '$P^* = 13$ euros and $Q^* = 98$ units',
          '$P^* = 10$ euros and $Q^* = 110$ units',
          '$P^* = 13$ euros and $Q^* = 68$ units',
          '$P^* = 17$ euros and $Q^* = 82$ units',
        ],
        correct: 0,
        explanation:
          'Setting the new demand equal to supply gives $150 - 4P = 20 + 6P$, so $130 = 10P$ and the new equilibrium price is €13; substituting back, $Q = 150 - 4 \\cdot 13 = 98$ units, which the supply side confirms since $20 + 6 \\cdot 13 = 98$. A quantity of 110 units keeps the old price of €10 and ignores that the resulting shortage bids the price up, 68 units comes from substituting €13 into the old demand curve instead of the new one, and €17 follows from adding the supply intercept of 20 instead of subtracting it when collecting terms.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.economics', 'gam.skill.compute'],
      },
      {
        id: 'econ-supply-demand-q7',
        type: 'gam',
        passageId: 'econ-supply-demand',
        difficulty: 'hard',
        seed: 0,
        stem: 'In the market for café coffee, the price of coffee beans — a production input — rises sharply, and at the same time tea, a substitute for coffee, becomes noticeably cheaper. Based on the passage, which statement about the new equilibrium is correct?',
        options: [
          'The equilibrium quantity falls, but the direction of the price change cannot be determined from the information given',
          'The equilibrium price certainly rises and the quantity falls, because more expensive inputs always raise the market price',
          'The equilibrium price and the equilibrium quantity certainly fall, because cheaper tea reduces the demand for coffee',
          'The equilibrium price and quantity stay unchanged, because the two opposing shifts cancel out exactly',
        ],
        correct: 0,
        explanation:
          'More expensive coffee beans raise input costs and shift the supply of café coffee to the left, while cheaper tea — a substitute becoming more attractive — shifts the demand for coffee to the left as well. The passage states that when demand and supply shift left together, the equilibrium quantity certainly falls while the price depends on the relative size of the two shifts. Claiming that the price certainly rises considers only the supply shift, claiming that it certainly falls considers only the demand shift, and an exact cancellation that leaves price and quantity unchanged would be a coincidence, not a general result.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.economics', 'gam.skill.transfer'],
      },
    ],
  },
];
