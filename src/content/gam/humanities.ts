import type { GamPassage } from '../../engine/types';

/** Humanities seed passages — 100% original content, format modeled on the
 *  official GAM preparatory samples (passage teaches → questions apply). */
export const HUMANITIES_PASSAGES: GamPassage[] = [
  {
    id: 'hum-argument-analysis',
    topicArea: 'humanities',
    title: 'Analyzing Arguments: Validity, Soundness and Informal Fallacies',
    difficulty: 'medium',
    estimatedMinutes: 15,
    source: 'seed',
    passageMarkdown: `An **argument** is a set of statements in which some statements, called **premises**, are offered as reasons for accepting another statement, the **conclusion**. Indicator words often mark this structure: "because", "since" and "given that" typically introduce premises, while "therefore", "thus" and "it follows that" introduce conclusions. The first task in analyzing any argument is to identify which statement is being argued for and which statements are doing the supporting.

Logicians evaluate deductive arguments on two separate levels. An argument is **valid** if the conclusion follows necessarily from the premises: if all premises were true, the conclusion could not possibly be false. Validity is a property of the argument's form alone — it says nothing about whether the premises really are true. An argument is **sound** if it is valid and all of its premises are in fact true. Every sound argument therefore has a true conclusion, but a valid argument need not be sound. Consider the following argument. Premise 1: All mammals can fly. Premise 2: Whales are mammals. Conclusion: Therefore, whales can fly. If the two premises were true, the conclusion would have to be true as well, so the argument is valid. Because the first premise is false, however, the argument is not sound. The reverse dissociation also occurs: an argument whose conclusion happens to be true is still invalid when that conclusion does not follow from the premises given.

Many everyday arguments fail in a less formal way. **Informal fallacies** are patterns of reasoning that can sound convincing while failing to support their conclusions. Four of the most common are:

| Fallacy | Pattern of error |
|---|---|
| **Ad hominem** | attacking the person who makes a claim instead of the claim itself |
| **Straw man** | misrepresenting an opponent's position and then refuting the distorted version |
| **False dilemma** | presenting exactly two options as the only possibilities when further alternatives exist |
| **Circular reasoning** | using the conclusion itself, openly or in disguised form, as one of the premises |

Two cautions apply when working with fallacies. First, a fallacious argument can still have a true conclusion: the fallacy shows that the reasons given fail to establish the conclusion, not that the conclusion is false. Rejecting a claim merely because someone defended it badly is itself a reasoning error. Second, identifying a fallacy is a matter of how the reasoning works, not of tone. A calmly and politely presented false dilemma remains a false dilemma, and an aggressively delivered argument is not automatically fallacious.`,
    questions: [
      {
        id: 'hum-argument-analysis-q1',
        type: 'gam',
        passageId: 'hum-argument-analysis',
        difficulty: 'easy',
        seed: 0,
        stem: 'According to the passage, what does it mean for a deductive argument to be valid?',
        options: [
          'If all of its premises were true, its conclusion could not possibly be false',
          'All of its premises are in fact true',
          'Its conclusion is in fact true',
          'Most listeners find its reasoning convincing',
        ],
        correct: 0,
        explanation:
          'The passage defines validity as a property of form: whenever all premises were true, the conclusion would have to be true as well. Whether the premises are actually true is a separate requirement that belongs to soundness, not validity, and a factually true conclusion can even sit atop an invalid argument. How convincing listeners find the reasoning concerns persuasion, which the passage separates from the logical analysis.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.concept'],
      },
      {
        id: 'hum-argument-analysis-q2',
        type: 'gam',
        passageId: 'hum-argument-analysis',
        difficulty: 'medium',
        seed: 0,
        stem: 'Which statement about sound arguments follows from the definitions in the passage?',
        options: [
          'A sound argument is valid and has only true premises, so its conclusion must be true',
          'A sound argument can have a false conclusion, provided its logical form is correct',
          'Every valid argument is also sound, because validity already concerns the premises',
          'An argument is sound whenever its conclusion turns out to be true',
        ],
        correct: 0,
        explanation:
          'Soundness requires validity plus actually true premises, and the passage notes that every sound argument therefore has a true conclusion — a false conclusion is impossible for a sound argument. The claim that every valid argument is sound is refuted by the flying-whales example, which is valid yet rests on a false premise. A true conclusion alone proves nothing, since the passage points out that even an invalid argument can end in a true statement.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.concept'],
      },
      {
        id: 'hum-argument-analysis-q3',
        type: 'gam',
        passageId: 'hum-argument-analysis',
        difficulty: 'medium',
        seed: 0,
        stem: 'How should the flying-whales argument presented in the passage be classified?',
        options: [
          'Valid but not sound, because the conclusion follows from the premises while one premise is false',
          'Sound but not valid, because the premises are acceptable while the conclusion is false',
          'Invalid, because its conclusion is factually false',
          'Valid and sound, because the conclusion follows necessarily from the premises',
        ],
        correct: 0,
        explanation:
          'If all mammals could fly and whales are mammals, whales would have to fly, so the form is valid; since the first premise is false, the argument fails the additional truth requirement and is not sound. Calling it invalid because whales cannot fly confuses the falsity of the conclusion with a defect of form, which the passage keeps separate. Calling it sound on the grounds that the conclusion follows ignores that soundness demands true premises on top of validity, and a sound-but-invalid argument is ruled out by definition.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.concept'],
      },
      {
        id: 'hum-argument-analysis-q4',
        type: 'gam',
        passageId: 'hum-argument-analysis',
        difficulty: 'easy',
        seed: 0,
        stem: 'A councillor responds to an engineer’s flood-protection proposal: "We can dismiss Ms. Brandt’s plan — she has lived in our town for barely two years, so she has no business telling us how to protect it." Which fallacy does the councillor commit?',
        options: [
          'Ad hominem, because the plan is rejected by attacking its author rather than its content',
          'Straw man, because the plan is replaced by a distorted version before being rejected',
          'False dilemma, because only two possible courses of action are acknowledged',
          'Circular reasoning, because the rejection of the plan is assumed from the outset',
        ],
        correct: 0,
        explanation:
          'The councillor says nothing about the technical content of the flood-protection plan and instead disqualifies its author over how long she has lived in the town — the pattern the passage defines as ad hominem. No distorted version of the plan is set up and attacked, so no straw man occurs, and no pair of exclusive alternatives is offered, so no false dilemma is present either.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
      {
        id: 'hum-argument-analysis-q5',
        type: 'gam',
        passageId: 'hum-argument-analysis',
        difficulty: 'medium',
        seed: 0,
        stem: 'Mr. Yilmaz proposes that the municipal library stay open late on two evenings per week. A colleague replies: "Keeping the library open around the clock every single day would exhaust the staff and wreck the budget, so Mr. Yilmaz’s idea must be rejected." Which fallacy does the colleague commit?',
        options: [
          'Straw man, because a modest proposal is replaced by an extreme version and that version is refuted',
          'Ad hominem, because the reply is directed against Mr. Yilmaz personally',
          'Circular reasoning, because the reply presupposes that the proposal is unaffordable',
          'False dilemma, because the reply allows nothing between the current hours and constant opening',
        ],
        correct: 0,
        explanation:
          'The proposal concerned two late evenings per week, but the colleague argues against round-the-clock opening every day — a distorted, far more extreme position — and treats its failure as a refutation of the original idea, which is exactly the straw man pattern from the passage. Mr. Yilmaz himself is never attacked, so no ad hominem is involved, and the colleague does offer reasons rather than assuming the conclusion, so the reasoning is not circular.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
      {
        id: 'hum-argument-analysis-q6',
        type: 'gam',
        passageId: 'hum-argument-analysis',
        difficulty: 'hard',
        seed: 0,
        stem: 'An advertisement states: "Our newspaper prints only verified facts. You can be sure of this, because the newspaper itself says so — and everything the newspaper says is a verified fact." Which fallacy does the advertisement commit?',
        options: [
          'Circular reasoning, because the newspaper’s reliability is presupposed by the very evidence offered for it',
          'Ad hominem, because the advertisement attacks the critics of the newspaper',
          'Straw man, because the advertisement misrepresents what skeptical readers actually claim',
          'False dilemma, because readers are told to trust the newspaper completely or not at all',
        ],
        correct: 0,
        explanation:
          'The advertisement supports the claim that the newspaper prints only facts by citing the newspaper’s own statement, and that statement counts as evidence only if the newspaper already prints only facts — the conclusion reappears as a premise, which the passage defines as circular reasoning. No critic is attacked or misquoted, so neither of the fallacies aimed at opponents applies, and no forced choice between exactly two alternatives is presented.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
    ],
  },
  {
    id: 'hum-source-criticism',
    topicArea: 'humanities',
    title: 'Source Criticism: Reading the Seestadt Archive',
    difficulty: 'hard',
    estimatedMinutes: 17,
    source: 'seed',
    passageMarkdown: `Historians cannot observe the past directly; they reconstruct it from **sources** — the documents, images and objects that the past has left behind. The first step of **source criticism** is classification. A **primary source** originates in the period under study and was produced by a participant or contemporary witness: letters, official records, newspapers of the day, photographs, account books. A **secondary source** was produced later and interprets or synthesizes primary material: monographs, journal articles, textbooks. Crucially, the classification is relative to the **research question**. A biography of a medieval king published in 1930 is a secondary source for the king's reign, but a primary source for a historian studying how writers of the 1930s portrayed the Middle Ages.

Three further criteria determine how much weight a source can carry. **Provenance** covers the origin and history of the source itself: who produced it, when, where and for whom, and through which hands it travelled before reaching the archive. A documented, unbroken chain of custody raises confidence; gaps leave room for forgery or later alteration. **Perspective** acknowledges that every source reflects its creator's viewpoint, purpose and intended audience. Bias does not make a source worthless: a one-sided text is still direct evidence of what its author wanted an audience to believe. But factual claims made in a source must always be weighed against the purpose for which it was written. **Corroboration**, finally, means checking a claim against other sources. A claim gains support only from **independent** sources: a later work that takes its information from an earlier source cannot corroborate that source, because the two rest on the same underlying testimony.

The municipal archive of Seestadt, a small harbour town, holds four items concerning the warehouse fire of March 1874:

| Item | Description |
|---|---|
| **Logbook** | the harbour master's daily logbook for 1874, containing an entry on the fire; kept in the town archive continuously since 1875 |
| **Newspaper report** | an article printed three days after the fire in a neighbouring town's newspaper, based on the accounts of travellers arriving from Seestadt |
| **Town history** | a history of Seestadt published in 1930 by a local schoolteacher; its chapter on the fire names the logbook and the newspaper report as its only sources |
| **Letter** | a letter dated one week after the fire and signed by a warehouse worker; bought from a private collector in 1990, with nothing known about where it was kept before that year |

One further circumstance matters. The harbour master was responsible for fire safety in the port, so his log records the fire from the position of an official whose own conduct could be called into question.`,
    questions: [
      {
        id: 'hum-source-criticism-q1',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'medium',
        seed: 0,
        stem: 'According to the passage, which feature makes a source a primary source for a given research question?',
        options: [
          'It originates in the period under study and comes from a participant or contemporary witness',
          'It is more reliable than any secondary source dealing with the same events',
          'It is the first source that a historian consults when beginning a project',
          'It survives as a handwritten original rather than in printed form',
        ],
        correct: 0,
        explanation:
          'The passage classifies a source as primary when it originates in the period under study and was produced by a participant or contemporary witness. Reliability plays no role in the classification — a primary source can be strongly biased, as the harbour master’s logbook shows — and the order in which a historian consults materials is irrelevant to what the sources are. Printed items such as newspapers of the day are listed among primary sources, so handwritten form is not the criterion either.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.concept'],
      },
      {
        id: 'hum-source-criticism-q2',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'medium',
        seed: 0,
        stem: 'The harbour master was responsible for fire safety in the port. Following the passage’s treatment of perspective, what should a historian conclude about his logbook?',
        options: [
          'It remains valuable evidence, but its statements about the causes of the fire must be weighed against the author’s interest in appearing blameless',
          'It must be set aside entirely, because an author with a personal stake cannot produce usable evidence',
          'Its account of the causes is the most reliable available, because responsibility for fire safety implies the greatest expertise',
          'The author’s personal stake turns the logbook into a secondary source',
        ],
        correct: 0,
        explanation:
          'The passage states that bias does not make a source worthless but that factual claims must be weighed against the author’s purpose; an official whose own conduct could be questioned has a motive to describe the causes of the fire in a self-protecting way. Setting the logbook aside entirely contradicts the passage’s explicit statement that one-sided sources retain value, and perspective has no effect on classification, so the logbook remains primary. Expertise in fire safety does not neutralize the author’s personal stake in how the fire is explained.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.concept'],
      },
      {
        id: 'hum-source-criticism-q3',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'hard',
        seed: 0,
        stem: 'The town history’s chapter on the fire agrees with the logbook about the number of warehouses destroyed. Why does this agreement add little support to the logbook’s figure?',
        options: [
          'The town history drew on the logbook and the newspaper report, so it is not an independent witness to the fire',
          'The town history is a secondary source, and secondary sources can never support any historical claim',
          'The town history appeared too long after the fire for its content to be admissible as evidence',
          'Its author was a schoolteacher rather than a trained historian, so its agreement carries no weight',
        ],
        correct: 0,
        explanation:
          'The passage requires corroborating sources to be independent, and the town history names the logbook and the newspaper report as its only sources — its figure therefore rests on the very testimony it appears to confirm. The claim that secondary sources can never support anything overstates the rule, which only excludes a work from corroborating the sources it was drawn from. The author’s profession is beside the point: the problem lies in the chain of information, not in the writer’s credentials.',
        skillTags: ['gam.skill.concept'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.concept'],
      },
      {
        id: 'hum-source-criticism-q4',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'medium',
        seed: 0,
        stem: 'Which feature of the warehouse worker’s letter most limits the weight it can carry as evidence about the fire?',
        options: [
          'Nothing is known about where it was kept before 1990, so the gap in provenance leaves room for forgery or later alteration',
          'Because it entered the archive only in 1990, the letter counts as a secondary source',
          'A private letter by a worker ranks below official records and therefore cannot serve as evidence',
          'Its author was personally involved in the events, which disqualifies the letter as testimony',
        ],
        correct: 0,
        explanation:
          'The passage ties confidence in a source to a documented chain of custody, and the letter’s whereabouts cannot be traced for more than a century — precisely the kind of gap that leaves room for forgery or later alteration. Classification depends on when and by whom a source was created, not on when a collector sold it, so the 1990 purchase does not make the letter secondary. Personal involvement is what makes a source primary in the first place, so it cannot be a ground for disqualification.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
      {
        id: 'hum-source-criticism-q5',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'hard',
        seed: 0,
        stem: 'A historian wants to confirm the basic facts of the fire through independent corroboration. Which combination of items comes closest to meeting the passage’s requirement?',
        options: [
          'The logbook and the newspaper report, because the report rests on travellers’ accounts rather than on the logbook',
          'The logbook and the town history, because the town history confirms the logbook in print',
          'The newspaper report and the town history, because two published texts outweigh one handwritten log',
          'The town history on its own, because it already combines the other accounts into a single narrative',
        ],
        correct: 0,
        explanation:
          'The newspaper report was compiled from the accounts of travellers arriving from Seestadt, a line of information separate from the harbour master’s log, so these two items come closest to independent corroboration. The town history cannot corroborate either of the items it names as its only sources, in print or otherwise, because it rests on the same underlying testimony. A single synthesis likewise adds no independent support, since combining dependent accounts creates no new witness.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
      {
        id: 'hum-source-criticism-q6',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'hard',
        seed: 0,
        stem: 'A researcher studying public debate about railway construction in the 1860s finds a pamphlet printed in 1868 by a railway company to persuade farmers to sell their land. Applying the passage’s criteria, how should the researcher treat the pamphlet?',
        options: [
          'As a primary source whose persuasive purpose must be taken into account: strong evidence of the company’s arguments, weaker evidence for its factual claims',
          'As a secondary source, because it interprets the railway project for a wider audience',
          'As unusable, because a text written to persuade cannot serve as historical evidence',
          'As reliable on matters of fact, because it was printed at the very time of the events',
        ],
        correct: 0,
        explanation:
          'The pamphlet originates in the 1860s from a participant in the debate, which makes it a primary source for that debate, and the passage adds that a one-sided text is direct evidence of what its author wanted an audience to believe. Its factual claims must still be weighed against its openly persuasive purpose, so being printed at the time of the events does not by itself make those claims reliable. Interpreting events for an audience does not turn a contemporary text into a secondary source, and excluding persuasive texts altogether contradicts the statement that bias does not make a source worthless.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
      {
        id: 'hum-source-criticism-q7',
        type: 'gam',
        passageId: 'hum-source-criticism',
        difficulty: 'hard',
        seed: 0,
        stem: 'A historian must classify a schoolbook chapter about the Roman Empire that was published in 1955. Applying the passage’s criteria, which classification is correct?',
        options: [
          'A secondary source for a study of the Roman Empire, but a primary source for a study of history teaching in the 1950s',
          'A primary source for the two studies alike, because the book itself is an object surviving from the past',
          'A secondary source for the two studies alike, because a textbook remains a textbook whatever the research question',
          'Unusable for either study, because schoolbooks simplify their subject matter',
        ],
        correct: 0,
        explanation:
          'The passage makes classification relative to the research question: for the Roman Empire, the 1955 chapter interprets much older material and is secondary, while for history teaching in the 1950s it is a document produced in the very period under study and is therefore primary. Mere age does not make a source primary — what counts is its relation to the period being investigated, so treating the label as fixed ignores the passage’s example of the 1930 biography. Simplification is a matter of perspective to be weighed, not a ground for excluding a source altogether.',
        skillTags: ['gam.skill.transfer'],
        ruleTags: ['gam.topic.humanities', 'gam.skill.transfer'],
      },
    ],
  },
];
