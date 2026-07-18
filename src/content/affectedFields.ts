/**
 * dMAT India — affected previous-degree fields, transcribed in full from the
 * official "dMAT India — List of Affected Previous Degree Fields" v1.0
 * (29 June 2026, APS India) via aps-india.de. Every field name below is taken
 * verbatim from that PDF (sections 1–6).
 *
 * GUIDANCE ONLY. The PDF's own caveats govern: the list is guidance for
 * applicants and is NOT exhaustive; a field name containing "Engineering",
 * "Management", "Business", "Commerce", "Finance" or "Technology" is not
 * sufficient on its own; and APS India makes the final classification on the
 * basis of the official degree title, branch, major, honours subject,
 * specialisation, duration and applicable recognition rules. The checker must
 * never tell anyone they are "safe".
 */

export type FieldGroup = 'engineering' | 'commerce-economics' | 'business-management';

export type CheckerVerdict =
  | 'listed' // in one of the three groups → dMAT with GAM applies
  | 'separate-assessment' // section 5: APS decides case by case
  | 'not-automatic' // section 6 / section 4: named as NOT automatically covered
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

/** Section 5 — separate formal assessment. Not classified by the field name
 *  alone; may fall within the dMAT requirement only after APS classifies the
 *  official degree, and inclusion never confirms formal recognition. */
const SEP_DEFAULT_NOTE =
  'Requires separate formal APS assessment — not classified by the field name alone. May fall within the dMAT requirement only after APS classifies the official degree, and inclusion here does not confirm formal recognition.';
const sep = (name: string, aliases?: string[], note?: string): AffectedField => ({
  name,
  verdict: 'separate-assessment',
  aliases,
  note: note ?? SEP_DEFAULT_NOTE,
});

/** Section 6 (+ section-4 nuances) — NOT automatically covered unless the
 *  official degree title/branch is explicitly classified by APS as
 *  Engineering, Commerce / Accounting / Finance / Economics, or Business /
 *  Management. */
const NA_DEFAULT_NOTE =
  'Not automatically covered by the dMAT requirement unless the official degree title, branch, major or specialisation is explicitly classified by APS India as Engineering, Commerce / Accounting / Finance / Economics, or Business / Management.';
const na = (name: string, aliases?: string[], note?: string): AffectedField => ({
  name,
  verdict: 'not-automatic',
  aliases,
  note: note ?? NA_DEFAULT_NOTE,
});

/** Group 1 — Engineering branches (PDF section 1). B.E./B.Tech count where the
 *  official branch or specialisation is clearly an Engineering field. Order and
 *  wording follow the PDF; near-duplicate spellings are folded into `aliases`. */
const ENGINEERING: AffectedField[] = [
  eng('Advanced Manufacturing and Mechanical Systems Design'),
  eng('Aerodynamic Engineering'),
  eng('Aeronautical Engineering'),
  eng('Aerospace Engineering'),
  eng('Agricultural Engineering'),
  eng('Architectural Engineering'),
  eng('Applied Electronics and Instrumentation Engineering'),
  eng('Applied Electronics and Telecommunications Engineering'),
  eng('Automobile Engineering'),
  eng('Automotive Engineering'),
  eng('Automation Engineering'),
  eng('Biochemical Engineering'),
  eng('Biomedical Engineering', ['Bio-Medical Engineering']),
  eng('Bioengineering'),
  eng('Biotechnology and Biochemical Engineering'),
  eng('Biotechnology Engineering'),
  eng('CAD/CAM Engineering'),
  eng('Ceramic Engineering', ['Ceramics Engineering']),
  eng('Chemical Engineering'),
  eng('Civil and Structural Engineering'),
  eng('Civil Engineering'),
  eng('Civil Engineering (Construction Technology)'),
  eng('Civil Engineering (Public Health Engineering)'),
  eng('Civil Engineering and Planning'),
  eng('Civil Environmental Engineering'),
  eng('Communication Engineering', ['Communications Engineering']),
  eng('Computer and Communication Engineering'),
  eng('Computer Engineering'),
  eng('Computer Engineering and Application'),
  eng('Computer Networking and Engineering'),
  eng('Computer Science and Engineering'),
  eng('Computer Science Engineering'),
  eng('Computer Science and Systems Engineering'),
  eng('Construction Engineering'),
  eng('Construction Engineering and Management'),
  eng('Control System Engineering'),
  eng('Design Engineering'),
  eng('Electrical and Electronics Engineering'),
  eng('Electrical and Instrumentation Engineering'),
  eng('Electrical and Power Engineering'),
  eng('Electrical Engineering'),
  eng('Electrical Power Engineering'),
  eng('Electronic Engineering'),
  eng('Electronics and Communication Engineering'),
  eng('Electronics and Computer Engineering'),
  eng('Electronics and Electrical Engineering'),
  eng('Electronics and Instrumentation Engineering'),
  eng('Electronics and Telecommunication Engineering', ['Electronics and Telecommunications Engineering']),
  eng('Electronics Communication and Instrumentation Engineering'),
  eng('Electronics Engineering'),
  eng('Engineering Design'),
  eng('Environment Engineering'),
  eng('Environmental Engineering'),
  eng('Environmental Engineering and Management'),
  eng('Environmental Science and Engineering'),
  eng('Fashion and Apparel Engineering'),
  eng('Food Biotech Engineering'),
  eng('Food Engineering'),
  eng('Food Engineering and Technology'),
  eng('Geotechnical Engineering'),
  eng('Health Science and Water Engineering'),
  eng('Hydraulics Engineering'),
  eng('Industrial and Production Engineering'),
  eng('Industrial Engineering'),
  eng('Industrial Engineering and Management'),
  eng('Industrial Production Engineering'),
  eng('Industrial Safety and Engineering'),
  eng('Industrial Systems Engineering'),
  eng('Information Engineering'),
  eng('Information Science and Engineering'),
  eng('Information Technology and Engineering'),
  eng('Infrastructure Engineering'),
  eng('Infrastructure Engineering and Management'),
  eng('Instrumentation and Control Engineering'),
  eng('Instrumentation Engineering'),
  eng('Irrigation and Drainage Engineering'),
  eng('Irrigation Engineering'),
  eng('Machine Engineering'),
  eng('Maintenance Engineering'),
  eng('Manufacturing Engineering'),
  eng('Manufacturing Engineering and Automation'),
  eng('Manufacturing Engineering and Management'),
  eng('Manufacturing Science and Engineering'),
  eng('Manufacturing Systems Engineering'),
  eng('Marine Engineering'),
  eng('Materials Engineering'),
  eng('Mechanical and Automation Engineering'),
  eng('Mechanical Engineering'),
  eng('Mechanical Engineering Design'),
  eng('Mechanical System Design'),
  eng('Mechatronics Engineering'),
  eng('Medical Electronics Engineering'),
  eng('Metallurgical and Materials Engineering'),
  eng('Metallurgical Engineering'),
  eng('Mining Engineering'),
  eng('Naval Architecture and Ocean Engineering'),
  eng('Network Engineering'),
  eng('Optical Engineering'),
  eng('Petrochemical Engineering'),
  eng('Petroleum Engineering'),
  eng('Plastic Engineering', ['Plastics Engineering']),
  eng('Polymer Engineering'),
  eng('Power Electronics Engineering'),
  eng('Power Engineering'),
  eng('Power Systems Engineering'),
  eng('Production and Industrial Engineering'),
  eng('Production Engineering'),
  eng('Propulsion Engineering'),
  eng('Robotics and Automation Engineering'),
  eng('Safety and Fire Engineering'),
  eng('Shipbuilding Engineering'),
  eng('Software Engineering', undefined, 'Covered only if the official degree is awarded as an Engineering degree.'),
  eng('Soil and Water Conservation Engineering'),
  eng('Structural Engineering'),
  eng('Telecommunication Engineering'),
  eng('Textile Engineering'),
  eng('Textile Plant Engineering'),
  eng('Thermal Engineering'),
  eng('Tool and Die Engineering'),
  eng('Tool Engineering'),
  eng('Transportation Engineering'),
  eng('Transportation Engineering and Management'),
  eng('Transportation System Engineering'),
  eng('Water Resource Engineering'),
];

/** Group 2 — Commerce / Accounting / Finance / Economics (PDF section 2). */
const COMMERCE: AffectedField[] = [
  com('Bachelor of Commerce', ['B.Com', 'BCom']),
  com('B.Com Honours', ['B.Com (Hons)']),
  com('B.Com Accounting'),
  com('B.Com Accounting and Finance'),
  com('B.Com Banking and Insurance'),
  com('B.Com Computer Applications'),
  com('B.Com Corporate Secretaryship'),
  com('B.Com e-Commerce'),
  com('B.Com Finance'),
  com('B.Com Foreign Trade'),
  com('B.Com Forensic Accounting'),
  com('B.Com International Business and Finance'),
  com('B.Com Investment and Wealth Management'),
  com('B.Com Marketing'),
  com('B.Com Professional'),
  com('B.Com Risk Management'),
  com('B.Com Taxation'),
  com('B.Com Tourism and Travel Management', undefined, 'Covered if awarded as a Commerce degree and formally assessed accordingly.'),
  com('Commerce'),
  com('Commerce General'),
  com('Commerce Honours'),
  com('Commerce Professional'),
  com('Commerce with Computer Applications'),
  com('Commerce with Computers'),
  com('Commerce and Co-operation'),
  com('Commerce with Corporate Secretaryship'),
  com('Commerce with Finance and Taxation'),
  com('Commerce with Tax Procedure and Practice'),
  com('Accounting'),
  com('Accountancy'),
  com('Accounting and Finance'),
  com('Accounts and Finance'),
  com('Finance and Accounting'),
  com('Accounting and Financial Management'),
  com('Accounting and Taxation'),
  com('Accounting and Auditing'),
  com('Advanced Accounting and Auditing'),
  com('Advance Accounting and Auditing'),
  com('Auditing'),
  com('Corporate Accounting'),
  com('Cost Accounting'),
  com('Cost and Works Accounting'),
  com('Financial Accounting and Auditing'),
  com('Professional Accounting'),
  com('Finance'),
  com('Financial Management'),
  com('Finance Management'),
  com('Finance and Taxation'),
  com('Taxation and Finance'),
  com('Banking and Finance'),
  com('Banking and Insurance'),
  com('Insurance'),
  com('Financial Markets'),
  com('Capital Markets'),
  com('Financial Services'),
  com('International Finance'),
  com('International Accounting and Finance'),
  com('International Finance and Accounting'),
  com('Corporate Finance'),
  com('Investment Management'),
  com('Risk Management', undefined, 'Covered if awarded as a Commerce, Finance, Economics or Business degree.'),
  com('Taxation'),
  com('Economics'),
  com('Bachelor of Economics'),
  com('B.A. Economics'),
  com('B.Sc. Economics'),
  com('Economics Honours'),
  com('Applied Economics'),
  com('Business Economics'),
  com('Financial Economics'),
  com('Economics and Finance'),
  com('International Economics'),
  com('International Economics and Finance'),
  com('Development Economics'),
  com('Foreign Trade', undefined, 'Covered if awarded as a Commerce, Finance, Economics, Business or Management degree.'),
];

/** Group 3 — Business / Management (PDF section 3). Sector-specific management
 *  fields are handled under section 5 below. */
const BUSINESS: AffectedField[] = [
  bus('Bachelor of Business Administration', ['BBA']),
  bus('Bachelor of Business Management', ['BBM']),
  bus('Bachelor of Management Studies', ['BMS']),
  bus('Bachelor of Business Studies', ['BBS']),
  bus('Bachelor of Business Economics', ['BBE']),
  bus('Bachelor of International Business and Finance', ['BIBF']),
  bus('Business Administration'),
  bus('Business Management'),
  bus('Management Studies'),
  bus('Business Studies'),
  bus('General Management'),
  bus('International Business'),
  bus('International Business Management'),
  bus('International Business and Finance'),
  bus('Business Analytics'),
  bus('Information Systems Management'),
  bus('Rural Management'),
  bus('Business Administration with Finance'),
  bus('Business Administration with Marketing'),
  bus('Business Administration with Human Resource Management'),
  bus('Business Administration with International Business'),
  bus('Business Administration with Business Analytics'),
  bus('Business Administration with Financial Management'),
  bus('Business Administration with Computer Applications'),
  bus('Marketing'),
  bus('Marketing Management'),
  bus('Digital Marketing'),
  bus('Human Resource Management'),
  bus('Human Resources'),
  bus('HR Management'),
  bus('Human Resource Development'),
  bus('Operations Management'),
  bus('Logistics Management'),
  bus('Logistics and Supply Chain Management'),
  bus('Supply Chain Management'),
  bus('Retail Management'),
  bus('Entrepreneurship'),
  bus('Business Entrepreneurship'),
];
// Note: "Business Economics", "Foreign Trade" and "Financial Management" also
// appear in PDF section 3; they are represented once under COMMERCE above (both
// carry the same 'listed' verdict) to keep entry names unique.

/** Section 5 — fields requiring separate formal assessment. Not classified by
 *  the field name alone. Slash-groups in the PDF are folded into `aliases`. */
const SEPARATE_ASSESSMENT: AffectedField[] = [
  sep('BBA Hotel Management', ['BBA Hospitality Management'], 'Not treated as a formally recognised BBA qualification solely because the title contains "BBA". May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('BBA Tourism and Travel Management', ['BBA Travel and Tourism Management'], 'Not treated as a formally recognised BBA qualification solely because the title contains "BBA". May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('BBA Aviation Management', ['BBA Airline and Airport Management', 'BBA Airport Management'], 'Not treated as a formally recognised BBA qualification solely because the title contains "BBA". May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('BBA Hospital Administration', ['BBA Healthcare Management'], 'Not treated as a formally recognised BBA qualification solely because the title contains "BBA". May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('Bachelor of Hotel Management', ['BHM'], 'May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('Bachelor of Hotel Management and Catering Technology', ['BHMCT'], 'May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('Bachelor of Tourism and Travel Management', ['BTTM'], 'May fall within a business or management field only after APS classification; formal recognition remains subject to separate assessment.'),
  sep('Hotel Management', ['Hospitality Management', 'Hotel Management and Catering Technology', 'Hospitality and Hotel Administration'], 'Requires separate formal assessment of degree title, duration, institution and documents. The dMAT field list does not confirm recognition.'),
  sep('Tourism Management', ['Travel and Tourism Management', 'Tourism and Hospitality Management'], 'Requires separate formal assessment of degree title, duration, institution and documents. The dMAT field list does not confirm recognition.'),
  sep('Aviation Management', ['Airline and Airport Management', 'Airport Management'], 'Requires separate formal assessment of degree title, duration, institution and documents. The dMAT field list does not confirm recognition.'),
  sep('Hospital Administration', ['Healthcare Management'], 'Requires separate formal assessment of degree title, duration, institution and documents. The dMAT field list does not confirm recognition.'),
  sep('Construction Management', ['Infrastructure Management', 'Sports Management'], 'Not automatically included or recognised solely because the field contains "Management"; APS India assesses the official degree title, duration and field separately. Applies to these and similar sector-specific management fields.'),
];

/** Section 6 (with section-4 interdisciplinary guidance folded in) — fields NOT
 *  automatically included. The official degree title/branch decides; taking the
 *  dMAT never substitutes for formal recognition. */
const NOT_AUTOMATIC: AffectedField[] = [
  na('Standalone Technology degrees', undefined, 'Standalone Technology degrees without an Engineering designation are not automatically covered unless APS India classifies the official title as Engineering.'),
  na('B.Tech with a non-Engineering or unclear branch/specialisation', undefined, 'A B.Tech/B.E. is included only where the official branch is clearly Engineering (e.g. Mechanical Engineering, Civil Engineering, Computer Science and Engineering, Electronics and Communication Engineering). B.Tech alone is not used to include all Technology fields.'),
  na('Information Technology', undefined, 'Not automatically covered as a standalone field — "Information Technology and Engineering" as an Engineering branch is covered.'),
  na('Information and Communication Technology', undefined, 'Not automatically covered as a standalone field.'),
  na('Information Science and Technology', undefined, 'Not automatically covered as a standalone field — "Information Science and Engineering" as an Engineering branch is covered.'),
  na('Computer Applications', undefined, 'Standalone Computer Applications is not automatically covered unless APS India classifies the official title as Engineering, Commerce, Finance, Economics, Business or Management.'),
  na('Bachelor of Computer Applications', ['BCA'], 'Not automatically covered unless APS India classifies the official title as Engineering, Commerce, Finance, Economics, Business or Management.'),
  na('Computer Science', undefined, 'Standalone Computer Science (without an Engineering designation) is not automatically covered — Computer Science and Engineering, Computer Engineering, Information Science and Engineering and Information Technology and Engineering are.'),
  na('B.Sc. Computer Science', undefined, 'Not automatically covered — the Engineering branch "Computer Science and Engineering" is.'),
  na('B.Sc. Information Technology', undefined, 'Not automatically covered as a standalone field.'),
  na('B.Sc. Data Science', undefined, 'Not automatically covered as a standalone field.'),
  na('Artificial Intelligence', undefined, 'Not automatically covered as a standalone field unless APS India classifies the official title as Engineering.'),
  na('Artificial Intelligence and Machine Learning', undefined, 'Not automatically covered as a standalone field unless APS India classifies the official title as Engineering.'),
  na('Data Science', undefined, 'Not automatically covered as a standalone field unless APS India classifies the official title as Engineering.'),
  na('Cyber Security', undefined, 'Not automatically covered as a standalone field unless APS India classifies the official title as Engineering.'),
  na('Biotechnology', undefined, 'Biotechnology without an Engineering designation is not automatically covered — Biotechnology Engineering, Biochemical Engineering, Biomedical Engineering and Bioengineering are.'),
  na('B.Sc. Biotechnology', undefined, 'Not automatically covered — Biotechnology Engineering (B.E./B.Tech) is.'),
  na('B.Sc. Medical Biotechnology'),
  na('Microbiology'),
  na('Life Sciences'),
  na('Food Technology', undefined, 'Food Technology without an Engineering designation is not automatically covered — Food Engineering and Food Engineering and Technology are.'),
  na('Food Processing Technology', undefined, 'Food Processing Technology without an Engineering designation is not automatically covered.'),
  na('Textile Technology', undefined, 'Not automatically covered unless awarded as Textile Engineering.'),
  na('Leather Technology'),
  na('Packaging Technology'),
  na('Printing Technology'),
  na('Rubber Technology'),
  na('Architecture'),
  na('Planning'),
  na('Town Planning'),
  na('Interior Design'),
  na('Urban and Regional Planning'),
  na('Pharmacy'),
  na('Pharmaceutical Sciences'),
  na('Pharmaceutical Biotechnology'),
  na('Pharma Technology'),
  na('Agriculture', undefined, 'Not automatically covered unless awarded as Agricultural Engineering.'),
  na('Medical, Nursing, Physiotherapy and other health-science degrees'),
  na('Law'),
  na('Education'),
  na('Library and Information Sciences'),
  na('Pure Sciences', undefined, 'Not automatically covered, except Economics, which is listed under Commerce / Accounting / Finance / Economics above.'),
  na('Arts', undefined, 'Not automatically covered, except Economics, which is listed under Commerce / Accounting / Finance / Economics above.'),
  na('Humanities'),
  na('Social Sciences', undefined, 'Not automatically covered, except Economics, which is listed under Commerce / Accounting / Finance / Economics above.'),
];

export const AFFECTED_FIELDS: AffectedField[] = [
  ...ENGINEERING,
  ...COMMERCE,
  ...BUSINESS,
  ...SEPARATE_ASSESSMENT,
  ...NOT_AUTOMATIC,
];

/** Coverage marker: 'full' — the complete official v1.0 list (all six sections)
 *  is now transcribed verbatim. The UI must still present 'not-found' honestly
 *  and always link the official PDF, because the list is guidance and not
 *  exhaustive; APS India decides the final classification. */
export const FIELDS_DATA_COVERAGE: 'summary' | 'full' = 'full';

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
