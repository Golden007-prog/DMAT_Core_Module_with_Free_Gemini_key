import type { GamPassage } from '../../engine/types';

/** Social-sciences seed passages — 100% original content, format modeled on
 *  the official GAM preparatory samples (passage teaches → questions apply). */
export const SOCIAL_SCIENCES_PASSAGES: GamPassage[] = [
  {
    id: 'soc-survey-sampling',
    topicArea: 'social-sciences',
    title: 'Survey Research: Sampling and Measurement',
    difficulty: 'easy',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `Social scientists rarely observe every person they want to draw conclusions about. The **population** is the entire group a study aims to describe; the **sample** is the smaller subset actually observed. Suppose a city administration wants to know how its 120,000 adult residents view a proposed cycling-lane network. Interviewing everyone is impractical, so the administration questions 800 residents instead. Here the population consists of all 120,000 adult residents, and the 800 interviewees form the sample. Conclusions about the population are justified only if the sample is **representative** — if its composition mirrors the population in the characteristics relevant to the research question.

The most reliable route to representativeness is **random sampling**: every member of the population has the same chance of being selected, for instance by drawing names from the complete residents' register. Random selection does not guarantee a perfect miniature of the population, but it prevents any group from being systematically favoured, and its typical deviation — the sampling error — shrinks as the sample grows. In a representative sample, each subgroup should appear in roughly its population proportion: if 55% of the city's adults live in the outer districts, then about 55% of a representative sample should come from the outer districts as well.

**Convenience sampling**, by contrast, recruits whoever is easiest to reach: passers-by on a single square, followers of one social-media account, or listeners who volunteer to call a radio programme. Such procedures invite **sampling bias**, a systematic difference between sample and population. Crucially, bias is a property of the selection procedure, not of the sample size. A biased sample of 200,000 respondents remains biased; enlarging it makes the estimate more precise, but not more correct.

Measurement raises two further problems. Abstract concepts such as "support for the network" or "political engagement" cannot be observed directly. They must be **operationalized** — translated into concrete, measurable indicators. Political engagement, for example, might be recorded as the number of elections a person has voted in during the past five years. An operationalization is a recipe for measurement; a verbal definition alone, however precise, measures nothing.

Second, the wording of questions matters. A **leading question** pushes respondents toward a particular answer through loaded or one-sided phrasing. The item "Do you agree that the city should stop wasting taxpayers' money on this project?" presupposes that money is being wasted, and agreement becomes the path of least resistance. Neutral wording presents the alternatives without emotionally charged vocabulary and without building an opinion into the question itself. Even a perfectly drawn random sample cannot repair the damage done by a biased instrument: sampling and measurement are separate stages, and a sound survey must succeed at each of them.`,
    questions: [
      {
        id: 'soc-survey-sampling-q1',
        type: 'gam',
        passageId: 'soc-survey-sampling',
        difficulty: 'easy',
        seed: 0,
        stem: 'The city administration questions 800 of the 120,000 adult residents about the cycling-lane network. Which statement correctly identifies the population and the sample of this survey?',
        options: [
          'Population: all 120,000 adult residents; sample: the 800 residents who are questioned',
          'Population: the 800 residents who are questioned; sample: all 120,000 adult residents',
          'Population: all residents who cycle regularly; sample: the residents who answer the questionnaire',
          'Population: all 120,000 adult residents; sample: the residents who support the cycling-lane network',
        ],
        correct: 0,
        explanation:
          'The population is the entire group the study aims to describe — all 120,000 adult residents — while the sample is the subset actually questioned, namely the 800 interviewees. Swapping the two labels reverses the definitions given in the passage. Restricting the population to regular cyclists redefines the group the city wants to learn about, and a sample made up of supporters would be selected by opinion rather than by a sampling procedure.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.concept'],
      },
      {
        id: 'soc-survey-sampling-q2',
        type: 'gam',
        passageId: 'soc-survey-sampling',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, what is the defining feature of a random sample?',
        options: [
          'Every member of the population has the same chance of being selected',
          'The interviewer selects respondents spontaneously, without following any plan',
          'The sample is guaranteed to mirror the population perfectly in every characteristic',
          'The sample consists of people who volunteer to take part in the survey',
        ],
        correct: 0,
        explanation:
          'The passage defines random sampling by the requirement that every member of the population has the same chance of being selected, for instance by drawing names from a complete register. Spontaneous, unplanned selection by an interviewer is convenience sampling, not randomness. A random sample is also not guaranteed to mirror the population perfectly — the passage says only that no group is systematically favoured — and relying on volunteers produces a self-selected sample rather than a random one.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.concept'],
      },
      {
        id: 'soc-survey-sampling-q3',
        type: 'gam',
        passageId: 'soc-survey-sampling',
        difficulty: 'easy',
        seed: 0,
        stem: 'In the city, 55% of adult residents live in the outer districts. Approximately how many respondents from the outer districts should a representative sample of 800 residents contain?',
        options: ['About 440', 'About 400', 'About 360', 'About 55'],
        correct: 0,
        explanation:
          'A representative sample reproduces population proportions, so the expected number of outer-district respondents is 55% of 800, which is 0.55 × 800 = 440. The figure 400 would assume an even split between outer districts and the rest of the city, 360 corresponds to the remaining 45% share, and 55 confuses the percentage itself with a count of respondents.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.compute'],
      },
      {
        id: 'soc-survey-sampling-q4',
        type: 'gam',
        passageId: 'soc-survey-sampling',
        difficulty: 'medium',
        seed: 0,
        stem: 'A researcher wants to include the concept "political engagement" in a survey. According to the passage, what does it mean to operationalize this concept?',
        options: [
          'To translate it into a concrete, measurable indicator, such as the number of elections a person has voted in during the past five years',
          'To formulate a precise verbal definition of political engagement',
          'To remove the concept from the survey, because it cannot be observed directly',
          'To let each respondent interpret political engagement in whatever way they personally understand it',
        ],
        correct: 0,
        explanation:
          'To operationalize a concept is to translate it into a concrete, measurable indicator — the passage gives counting the elections a person has voted in during the past five years as an example. A verbal definition, however precise, is explicitly described as measuring nothing. Dropping every concept that cannot be observed directly would abandon the measurement problem instead of solving it, and leaving the interpretation to each respondent yields incomparable answers rather than a defined measurement procedure.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.concept'],
      },
      {
        id: 'soc-survey-sampling-q5',
        type: 'gam',
        passageId: 'soc-survey-sampling',
        difficulty: 'medium',
        seed: 0,
        stem: 'A radio station invites its listeners to call in and vote on the cycling-lane network; 2,400 listeners call, and 78% of them oppose the network. What is the MAIN methodological problem with treating this result as the opinion of the city’s adult residents?',
        options: [
          'The callers are a self-selected convenience sample, so the result suffers from sampling bias regardless of how many people call',
          'The sample of 2,400 callers is too small to permit any conclusion about a city of 120,000 adults',
          'The call-in question must have contained loaded wording that pushed listeners toward opposition',
          'Opinions about infrastructure projects cannot be operationalized, so no survey could measure them',
        ],
        correct: 0,
        explanation:
          'Listeners who volunteer to call in select themselves into the sample — exactly the convenience-sampling procedure the passage warns about — and the resulting sampling bias does not disappear as the number of calls grows, because bias is a property of the selection procedure, not of size. The sample is not too small; 2,400 cases would be ample if they had been drawn at random. Nothing in the scenario mentions loaded wording, so a leading question is not the flaw shown, and agreement or disagreement with a concrete proposal is straightforward to operationalize.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.transfer'],
      },
      {
        id: 'soc-survey-sampling-q6',
        type: 'gam',
        passageId: 'soc-survey-sampling',
        difficulty: 'medium',
        seed: 0,
        stem: 'A questionnaire item reads: "Do you agree that the city should stop wasting taxpayers’ money on the poorly planned cycling-lane network?" Which methodological flaw does this item illustrate?',
        options: [
          'It is a leading question: loaded phrases presuppose a negative judgement and push respondents toward rejection',
          'It illustrates sampling bias, because only committed cyclists will answer such an item',
          'It shows a failed operationalization, because agreement with a statement can never serve as an indicator of opinion',
          'It contains no flaw, as long as it is administered to a correctly drawn random sample',
        ],
        correct: 0,
        explanation:
          'The item builds the loaded phrases "wasting taxpayers’ money" and "poorly planned" into the question, presupposing a negative judgement and making agreement the path of least resistance — the passage’s definition of a leading question. Sampling bias concerns who ends up in the sample, not how a question is worded. And the passage states explicitly that even a perfectly drawn random sample cannot repair a biased instrument, so correct sampling would not make the item acceptable.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'soc-correlation-causation',
    topicArea: 'social-sciences',
    title: 'Correlation Is Not Causation',
    difficulty: 'hard',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `When two variables are measured across many cases, their linear association can be summarized by a **correlation coefficient** $r$, which always lies between $-1$ and $+1$. The **sign** of $r$ gives the direction of the association: a positive coefficient means the two variables tend to rise together, while a negative coefficient means that one tends to fall as the other rises. The **strength** of the association is given by the absolute value $|r|$, not by the sign. As a working convention, this passage classifies $|r| \\ge 0.7$ as strong, values of $|r|$ from $0.3$ to $0.7$ as moderate, and $|r| < 0.3$ as weak; $r = 0$ indicates no linear association at all. Thus $r = -0.62$ marks a stronger association than $r = +0.48$.

A regional statistics office compiled the following correlations from observational data on 40 districts:

| Variable pair | Correlation $r$ |
|---|---|
| Weekly exercise hours and resting heart rate | $-0.62$ |
| Ice-cream sales and drowning incidents | $+0.55$ |
| Years of schooling and monthly income | $+0.48$ |
| Children's shoe size and vocabulary size | $+0.81$ |
| Daily screen time and sleep quality | $-0.34$ |

However strong, a correlation between two variables $X$ and $Y$ never shows by itself that $X$ causes $Y$. Three rival explanations must always be considered. First, causation may run in the opposite direction, from $Y$ to $X$ — **reverse causation**. Second, a **confounding variable** $Z$ may influence $X$ and $Y$ at the same time: summer heat raises ice-cream sales and also sends more people swimming, producing the drowning correlation without any causal link between the two. Third, in small samples an association can arise purely by **chance**, although this explanation loses plausibility as the number of cases grows.

These rivals are difficult to eliminate in an **observational study**, which records variables as they naturally occur, without intervening. Because nothing is manipulated, cases that differ in $X$ usually differ in many other respects as well, and any of those differences may be the true cause of $Y$. A **randomized experiment** avoids this problem: when participants are assigned to conditions at random, confounding variables are spread evenly across the groups, so a difference in outcomes can be attributed to the manipulated variable itself.

When experiments are impossible or unethical, several criteria can strengthen — though never prove — a causal interpretation of observational data: the presumed cause precedes the effect in time (**temporal order**); larger amounts of the cause accompany larger effects (a **dose–response relationship**); a plausible **mechanism** connects cause and effect; the association appears consistently across different populations and study designs; and known confounders have been measured and statistically controlled.`,
    questions: [
      {
        id: 'soc-correlation-causation-q1',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'medium',
        seed: 0,
        stem: 'According to the passage, what does a negative correlation coefficient between two variables indicate?',
        options: [
          'One variable tends to decrease as the other increases',
          'The association between the variables is weak',
          'There is no linear association between the variables',
          'The variables cannot stand in any causal relationship',
        ],
        correct: 0,
        explanation:
          'The sign of a correlation coefficient encodes the direction of the association, and a negative sign means one variable tends to fall as the other rises. Strength is carried by the absolute value, so a negative coefficient can mark a weak or a strong association alike. The absence of any linear association corresponds to a coefficient of 0, not to a negative one, and the sign says nothing about whether a causal relationship exists.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.concept'],
      },
      {
        id: 'soc-correlation-causation-q2',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'medium',
        seed: 0,
        stem: 'Which variable pair in the table shows the WEAKEST linear association?',
        options: [
          'Daily screen time and sleep quality',
          'Weekly exercise hours and resting heart rate',
          'Years of schooling and monthly income',
          'Children’s shoe size and vocabulary size',
        ],
        correct: 0,
        explanation:
          'Strength is compared by absolute value: $0.34$ is smaller than $0.48$, $0.55$, $0.62$ and $0.81$, so screen time and sleep quality ($r = -0.34$) show the weakest association in the table. Choosing exercise and resting heart rate treats the negative sign as if it made an association weaker, which the passage explicitly rules out. Schooling and income is merely the weakest of the positive pairs, and shoe size and vocabulary is the strongest association in the table, not the weakest.',
        skillTags: ['gam.skill.read-chart'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.read-chart'],
      },
      {
        id: 'soc-correlation-causation-q3',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'medium',
        seed: 0,
        stem: 'Using the classification given in the passage, how should the association between weekly exercise hours and resting heart rate ($r = -0.62$) be described?',
        options: [
          'Moderate and negative',
          'Strong and negative',
          'Moderate and positive',
          'Weak and negative',
        ],
        correct: 0,
        explanation:
          'The absolute value is $0.62$, which lies between $0.3$ and $0.7$, so the association is moderate; the negative sign means resting heart rate tends to fall as weekly exercise rises. Calling it strong would require an absolute value of at least $0.7$. Describing the direction as positive ignores the sign entirely, and calling the association weak would require an absolute value below $0.3$.',
        skillTags: ['gam.skill.compute'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.compute'],
      },
      {
        id: 'soc-correlation-causation-q4',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'hard',
        seed: 0,
        stem: 'Why can observational data alone never establish that a variable $X$ causes a variable $Y$?',
        options: [
          'Because nothing is manipulated, rival explanations such as reverse causation and confounding cannot be ruled out',
          'Because correlation coefficients measured in observational studies are systematically weaker than those measured in experiments',
          'Because observational studies cannot measure variables precisely enough to compute a correlation coefficient',
          'Because causation is established only when the correlation coefficient reaches exactly $+1$ or $-1$',
        ],
        correct: 0,
        explanation:
          'In an observational study nothing is manipulated, so cases that differ in one variable usually differ in many other respects as well; reverse causation and confounding therefore remain open explanations for any observed association. Measurement precision is not the issue — a perfectly measured correlation still permits the same rival explanations. And the claim that causation requires a coefficient of exactly plus or minus one is an invented rule that appears nowhere in the passage.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.concept'],
      },
      {
        id: 'soc-correlation-causation-q5',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'hard',
        seed: 0,
        stem: 'In the table, children’s shoe size and vocabulary size correlate at $r = +0.81$. Which interpretation of this finding is best supported by the passage?',
        options: [
          'A confounding variable — children’s age — increases shoe size and vocabulary size alike, producing the correlation without a causal link between the two',
          'Foot growth causes vocabulary growth, as the strength of the coefficient demonstrates',
          'Learning new words stimulates physical growth, so vocabulary size causes shoe size',
          'The coefficient must have arisen by chance, because a real association between shoe size and vocabulary would be absurd',
        ],
        correct: 0,
        explanation:
          'Age is a classic confounding variable: as children grow older, their feet grow and their vocabulary expands, which produces a strong correlation without any causal link between the two measures. Reading the coefficient as proof that foot growth drives vocabulary — or that vocabulary drives foot growth — commits exactly the confusion of correlation with causation the passage warns against, since strength never establishes causation. Chance is also implausible: the passage notes that chance associations lose plausibility as the number of cases grows, and $+0.81$ across 40 districts is a strong, systematic pattern.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.transfer'],
      },
      {
        id: 'soc-correlation-causation-q6',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'hard',
        seed: 0,
        stem: 'A public-health researcher wants to strengthen the causal claim that regular exercise lowers resting heart rate, which the table supports only with an observational correlation of $r = -0.62$. According to the passage, which additional piece of evidence would strengthen the causal interpretation the MOST?',
        options: [
          'A randomized experiment in which participants assigned to an exercise programme develop lower resting heart rates than participants assigned to a control group',
          'A repetition of the observational study with ten times as many districts, finding the same coefficient of $-0.62$',
          'A survey showing that most respondents personally believe that exercise lowers resting heart rate',
          'The observation that professional athletes, who train daily, have very low resting heart rates',
        ],
        correct: 0,
        explanation:
          'Random assignment spreads confounding variables evenly across the groups, so a lower resting heart rate in the exercise group can be attributed to the exercise itself — the passage presents the randomized experiment as the design that overcomes the weakness of observational data. Enlarging the observational study makes the estimate more precise but leaves confounding untouched. Respondents’ beliefs are opinions rather than evidence about a causal mechanism, and professional athletes are a self-selected group whose low heart rates could stem from many other characteristics, so that observation is still confounded.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.transfer'],
      },
      {
        id: 'soc-correlation-causation-q7',
        type: 'gam',
        passageId: 'soc-correlation-causation',
        difficulty: 'hard',
        seed: 0,
        stem: 'Across the neighbourhoods of a large city, an analyst finds a strong positive correlation between the number of police patrols and the number of recorded crimes, and concludes that patrols cause crime. Based on the passage, which rival explanation is MOST plausible?',
        options: [
          'Reverse causation: neighbourhoods that already experience more crime are assigned more patrols',
          'The analyst’s conclusion is justified, because the correlation is strong as well as positive',
          'The correlation must be coincidental, because no third variable could influence patrols and crimes at the same time',
          'Patrols and recorded crimes cannot truly be correlated, because patrols are intended to reduce crime',
        ],
        correct: 0,
        explanation:
          'The passage lists reverse causation as a rival explanation that must always be considered, and it fits this scenario directly: patrols are plausibly allocated to neighbourhoods because crime there is already high, so causation runs from crime to patrols. A strong, positive correlation is never by itself sufficient for a causal conclusion. Dismissing the association as coincidence ignores that a strong pattern across many neighbourhoods makes chance implausible, and denying that the correlation can exist because patrols are meant to reduce crime substitutes an expectation for the observed data.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.social-sciences', 'gam.skill.transfer'],
      },
    ],
  },
];
