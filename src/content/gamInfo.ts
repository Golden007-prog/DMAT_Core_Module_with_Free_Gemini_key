/**
 * Single source of truth for every dMAT / General Academic Module fact shown
 * in the UI. Facts can drift (dates, fees) — everything here carries an
 * `asOf` stamp and the UI renders it with that qualifier.
 *
 * Sources (checked July 2026):
 * - https://www.d-mat.de/en/ (official test site, preparatory materials)
 * - https://aps-india.de/dmat/ (APS India: who is affected, dates, fees)
 * - dMAT India "List of Affected Previous Degree Fields" v1.0, 29.06.2026
 */

export const GAM_INFO = {
  asOf: '2026-07-07',

  test: {
    name: 'dMAT — digital Master Assessment Test (digitaler Mastertest)',
    operator: 'g.a.s.t. e.V. / TestDaF-Institut, Bochum',
    developedWith: 'Universities of Ulm and Kassel; supported by the DAAD',
    language: 'English',
    format: 'digital, at licensed test centers; single-choice throughout',
    /** Core Module + one Subject Module, ≈3.5 h including a 30-minute break */
    totalDurationText: 'about 3.5 hours including a 30-minute break',
    breakMinutes: 30,
    noNotes: 'No note-taking is allowed anywhere in the exam.',
    guessing: 'Unanswered counts as wrong; no penalty for guessing is documented — never leave blanks.',
    scoring: 'Percentile rank plus a standardized dMAT score from 0–200 with mean 100.',
    certificateValidity: 'The certificate is valid indefinitely.',
  },

  gam: {
    name: 'General Academic Module',
    durationMinutes: 90,
    questionFormat: 'A reading passage followed by single-choice questions — exactly 4 options, exactly 1 correct.',
    mayContain: 'Passages, questions, and options may contain figures, tables, and formulas.',
    tests: 'Subject knowledge and application skill, not memorized facts — the passage gives the theory; the questions make you apply it.',
    topicAreas: [
      'mathematics',
      'computational sciences',
      'natural sciences',
      'engineering',
      'business administration',
      'economics',
      'social sciences',
      'humanities',
    ],
    officialCaveats: [
      'Official sample questions do not necessarily reflect the difficulty level of the real test.',
      'The published topics represent only a selection.',
    ],
  },

  india: {
    appliesFrom: 'APS applications for the Summer Semester 2027 intake and all later intakes',
    affectedGroups: [
      'Engineering',
      'Commerce / Accounting / Finance / Economics',
      'Business / Management',
    ],
    notAffected: [
      "Bachelor's applicants",
      'PhD applicants',
      'officially confirmed exchange, partnership, or double-degree programme participants',
    ],
    exemptions: [
      'APS online registration completed before 29 June 2026',
      'complete APS documents shipped before 29 June 2026',
      'an APS certificate already held',
    ],
    feeEur: 150,
    firstCycle: {
      registrationStart: '2026-06-29',
      registrationEnd: '2026-09-15',
      testDate: '2026-09-26',
      certificatesFrom: '2026-10-12',
    },
    resultOnApsCertificate:
      'The dMAT result appears on the APS certificate; for affected applicants the APS certificate is only issued after the dMAT certificate is submitted.',
    lowScoreRule:
      'A low score does NOT automatically deny the APS certificate — universities decide how to use the score in admissions.',
  },

  links: {
    officialSite: 'https://www.d-mat.de/en/',
    registration:
      'https://www.gast.de/portal/center-search/center-search/dmat/exams/worldwide?lang=en',
    apsIndia: 'https://aps-india.de/dmat/',
    daad: 'https://www.daad.de/en/',
  },
} as const;

/** Next official India test date as a Date (UTC midnight) — the Home
 *  countdown hides itself once this is in the past. */
export function nextIndiaTestDate(): Date {
  return new Date(`${GAM_INFO.india.firstCycle.testDate}T00:00:00Z`);
}
