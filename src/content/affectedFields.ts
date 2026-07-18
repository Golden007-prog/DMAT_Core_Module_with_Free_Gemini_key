/**
 * dMAT India — affected previous-degree fields, from the official
 * "List of Affected Previous Degree Fields" v1.0 (29 June 2026) via
 * aps-india.de. GUIDANCE ONLY: the official degree title/branch on the
 * certificate decides, and APS makes the final classification. The checker
 * must never tell anyone they are "safe".
 */

export type FieldGroup = 'engineering' | 'commerce-economics' | 'business-management';

export type CheckerVerdict =
  | 'listed' // in one of the three groups → dMAT with GAM applies
  | 'separate-assessment' // section 5: APS decides case by case
  | 'not-automatic' // section 4: named as NOT automatically covered
  | 'not-found'; // absent from our data → check official guidance

export interface AffectedField {
  name: string;
  verdict: Exclude<CheckerVerdict, 'not-found'>;
  group?: FieldGroup;
  aliases?: string[];
  note?: string;
}

export const GROUP_LABELS: Record<FieldGroup, string> = {
  engineering: 'Engineering',
  'commerce-economics': 'Commerce / Accounting / Finance / Economics',
  'business-management': 'Business / Management',
};

const eng = (name: string, aliases?: string[], note?: string): AffectedField => ({
  name,
  verdict: 'listed',
  group: 'engineering',
  aliases,
  note,
});
const com = (name: string, aliases?: string[], note?: string): AffectedField => ({
  name,
  verdict: 'listed',
  group: 'commerce-economics',
  aliases,
  note,
});
const bus = (name: string, aliases?: string[], note?: string): AffectedField => ({
  name,
  verdict: 'listed',
  group: 'business-management',
  aliases,
  note,
});

/** Group 1 — Engineering branches (B.E./B.Tech count when the official
 *  branch is clearly Engineering). */
const ENGINEERING: AffectedField[] = [
  eng('Aerospace Engineering'),
  eng('Aeronautical Engineering'),
  eng('Agricultural Engineering'),
  eng('Automobile Engineering', ['Automotive Engineering']),
  eng('Biochemical Engineering'),
  eng('Biomedical Engineering'),
  eng('Biotechnology Engineering', ['B.Tech Biotechnology'], 'Engineering biotech is covered — a B.Sc. in Biotechnology is not automatically covered.'),
  eng('Ceramic Engineering'),
  eng('Chemical Engineering'),
  eng('Civil Engineering'),
  eng('Computer Science and Engineering', ['CSE', 'Computer Engineering'], 'Covered as an Engineering branch — standalone Computer Science degrees (B.Sc./BCA) are not automatically covered.'),
  eng('Construction Engineering'),
  eng('Dairy Technology and Engineering'),
  eng('Electrical Engineering'),
  eng('Electrical and Electronics Engineering', ['EEE']),
  eng('Electronics Engineering'),
  eng('Electronics and Communication Engineering', ['ECE']),
  eng('Electronics and Instrumentation Engineering'),
  eng('Energy Engineering'),
  eng('Environmental Engineering'),
  eng('Food Process Engineering', undefined, 'Food *Engineering* is covered — Food Technology alone is not automatically covered unless clearly an Engineering degree.'),
  eng('Genetic Engineering'),
  eng('Geo-informatics Engineering'),
  eng('Industrial Engineering'),
  eng('Industrial and Production Engineering'),
  eng('Information Technology Engineering', ['B.Tech IT'], 'B.Tech in IT counts when the branch is officially Engineering — a standalone IT/BCA degree is not automatically covered.'),
  eng('Instrumentation Engineering'),
  eng('Instrumentation and Control Engineering'),
  eng('Manufacturing Engineering'),
  eng('Marine Engineering'),
  eng('Materials Engineering', ['Materials Science and Engineering']),
  eng('Mechanical Engineering'),
  eng('Mechatronics Engineering'),
  eng('Metallurgical Engineering', ['Metallurgy']),
  eng('Mining Engineering'),
  eng('Naval Architecture'),
  eng('Nuclear Engineering'),
  eng('Petroleum Engineering'),
  eng('Pharmaceutical Engineering'),
  eng('Plastics Engineering', ['Polymer Engineering']),
  eng('Power Engineering'),
  eng('Production Engineering'),
  eng('Robotics Engineering', ['Robotics and Automation']),
  eng('Software Engineering', ['B.Tech Software Engineering'], 'As an official Engineering branch (B.E./B.Tech).'),
  eng('Structural Engineering'),
  eng('Telecommunication Engineering'),
  eng('Textile Engineering', undefined, 'Textile *Engineering* is covered — Textile Technology alone is not automatically covered unless clearly an Engineering degree.'),
  eng('Transportation Engineering'),
  eng('Water Resource Engineering'),
];

/** Group 2 — Commerce / Accounting / Finance / Economics. */
const COMMERCE: AffectedField[] = [
  com('Commerce', ['B.Com', 'Bachelor of Commerce', 'B.Com Honours'], 'Including all B.Com specializations.'),
  com('Accounting', ['Accountancy', 'B.Com Accounting']),
  com('Accounting and Finance', ['BAF']),
  com('Finance', ['B.Com Finance']),
  com('Taxation', ['B.Com Taxation']),
  com('Banking and Insurance', ['BBI', 'B.Com Banking']),
  com('Financial Markets', ['BFM']),
  com('Economics', ['B.A. Economics', 'B.Sc. Economics', 'Economics Honours']),
  com('Applied Economics'),
  com('Business Economics', ['BBE']),
  com('Financial Economics'),
  com('International Economics'),
  com('Development Economics'),
];

/** Group 3 — Business / Management. */
const BUSINESS: AffectedField[] = [
  bus('Business Administration', ['BBA', 'Bachelor of Business Administration'], 'With any specialization.'),
  bus('Business Management', ['BBM', 'BMS', 'BBS'], 'With any specialization.'),
  bus('International Business and Finance', ['BIBF']),
  bus('Marketing', ['BBA Marketing']),
  bus('Human Resource Management', ['HR', 'HRM', 'BBA HR']),
  bus('Operations Management'),
  bus('Logistics and Supply Chain Management', ['Supply Chain', 'Logistics Management']),
  bus('Retail Management'),
  bus('Entrepreneurship'),
  bus('Business Analytics', ['BBA Business Analytics']),
  bus('Information Systems Management'),
  bus('Rural Management'),
];

/** Section 5 — sector-specific management: NOT automatically included;
 *  requires separate formal APS assessment and may fall under the
 *  requirement only after that classification. */
const SEPARATE_ASSESSMENT: AffectedField[] = [
  'Hotel Management',
  'Hospitality Management',
  'Tourism Management',
  'Travel and Tourism Management',
  'Aviation Management',
  'Hospital Management',
  'Healthcare Management',
  'Construction Management',
  'Sports Management',
  'Event Management',
].map((name) => ({
  name,
  verdict: 'separate-assessment' as const,
  note: 'Sector-specific management degrees require separate formal APS assessment — they may fall under the dMAT requirement only after APS classification.',
}));
SEPARATE_ASSESSMENT.push(
  { name: 'Bachelor of Hotel Management', verdict: 'separate-assessment', aliases: ['BHM', 'BHMCT'], note: 'Requires separate formal APS assessment.' },
  { name: 'Bachelor of Travel and Tourism Management', verdict: 'separate-assessment', aliases: ['BTTM'], note: 'Requires separate formal APS assessment.' },
);

/** Section 4 — interdisciplinary guidance: NOT automatically covered. The
 *  official degree title/branch decides; taking the dMAT never substitutes
 *  for formal recognition. */
const NOT_AUTOMATIC: AffectedField[] = [
  { name: 'Computer Science (standalone B.Sc./B.A.)', verdict: 'not-automatic', aliases: ['B.Sc. Computer Science', 'BSc CS'], note: 'Not automatically covered — only Engineering branches like "Computer Science and Engineering" are.' },
  { name: 'Computer Applications', verdict: 'not-automatic', aliases: ['BCA', 'Bachelor of Computer Applications'], note: 'Not automatically covered.' },
  { name: 'Information Technology (standalone)', verdict: 'not-automatic', aliases: ['B.Sc. IT'], note: 'Not automatically covered — B.Tech IT as an official Engineering branch is.' },
  { name: 'Artificial Intelligence (standalone)', verdict: 'not-automatic', aliases: ['B.Sc. AI'], note: 'Not automatically covered unless the official branch is an Engineering degree.' },
  { name: 'Data Science (standalone)', verdict: 'not-automatic', aliases: ['B.Sc. Data Science'], note: 'Not automatically covered unless the official branch is an Engineering degree.' },
  { name: 'Cyber Security (standalone)', verdict: 'not-automatic', note: 'Not automatically covered unless the official branch is an Engineering degree.' },
  { name: 'Biotechnology (B.Sc.)', verdict: 'not-automatic', aliases: ['B.Sc. Biotechnology'], note: 'Not covered — Biotechnology *Engineering* (B.E./B.Tech) is.' },
  { name: 'Life Sciences (B.Sc.)', verdict: 'not-automatic', note: 'Not covered by the list.' },
  { name: 'Food Technology', verdict: 'not-automatic', note: 'Not covered unless the degree is clearly an Engineering degree (e.g. Food Process Engineering).' },
  { name: 'Textile Technology', verdict: 'not-automatic', note: 'Not covered unless the degree is clearly an Engineering degree (e.g. Textile Engineering).' },
  { name: 'B.Tech (branch unclear)', verdict: 'not-automatic', aliases: ['BTech', 'B.E.'], note: 'A B.Tech/B.E. alone is not automatically included — the officially named branch must be clearly Engineering.' },
];

export const AFFECTED_FIELDS: AffectedField[] = [
  ...ENGINEERING,
  ...COMMERCE,
  ...BUSINESS,
  ...SEPARATE_ASSESSMENT,
  ...NOT_AUTOMATIC,
];

/** Honest coverage marker: 'summary' until the complete official v1.0 list
 *  (~150 engineering branches) is encoded verbatim. The UI must present a
 *  'not-found' result accordingly and always link the official PDF. */
export const FIELDS_DATA_COVERAGE: 'summary' | 'full' = 'summary';

/* ------------------------------- search ---------------------------------- */

/** lowercase, punctuation → spaces */
function basicNorm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** additionally strips degree-prefix noise ("Bachelor of", "B.Tech", …);
 *  can end up empty when the input IS just an abbreviation — callers must
 *  fall back to the basic form then. */
function strippedNorm(s: string): string {
  return basicNorm(
    s.toLowerCase().replace(/\b(bachelor of|bachelors? in|b\.?\s*(sc|a|com|e|tech)\b\.?|hons?\.?|honours)\b/g, ' '),
  );
}

export interface CheckerResult {
  verdict: CheckerVerdict;
  matches: AffectedField[];
}

function pairScore(q: string, t: string, allowTokenOverlap: boolean): number {
  if (!q || !t) return 0; // an empty side must never match anything
  if (t === q) return 100;
  if ((t.length >= 3 && q.includes(t)) || (q.length >= 3 && t.includes(q))) return 60;
  // token overlap only on prefix-stripped forms — otherwise noise words
  // like "bachelor of" count as evidence
  if (!allowTokenOverlap) return 0;
  const qTokens = q.split(' ').filter((x) => x.length > 1);
  const tTokens = new Set(t.split(' '));
  const hits = qTokens.filter((tok) => tTokens.has(tok)).length;
  if (hits > 0 && hits === qTokens.length) return 50;
  return hits * 15;
}

/** Substring/token match over names + aliases, best verdict first. Both the
 *  raw form ("b com") and the prefix-stripped form ("civil engineering")
 *  are compared, so abbreviations and full titles both resolve. */
export function checkField(query: string): CheckerResult {
  const qb = basicNorm(query);
  if (qb.length < 2) return { verdict: 'not-found', matches: [] };
  const qs = strippedNorm(query) || qb;

  const scored = AFFECTED_FIELDS.map((f) => {
    let score = 0;
    for (const raw of [f.name, ...(f.aliases ?? [])]) {
      const tb = basicNorm(raw);
      const ts = strippedNorm(raw) || tb;
      score = Math.max(score, pairScore(qs, ts, true), pairScore(qb, tb, false));
    }
    return { f, score };
  })
    .filter((x) => x.score >= 30)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { verdict: 'not-found', matches: [] };
  const matches = scored.slice(0, 6).map((x) => x.f);
  return { verdict: matches[0].verdict, matches };
}
