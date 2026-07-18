import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GAM_INFO } from '../../content/gamInfo';
import {
  checkField,
  FIELDS_DATA_COVERAGE,
  GROUP_LABELS,
  type CheckerVerdict,
} from '../../content/affectedFields';

const VERDICT_UI: Record<
  CheckerVerdict,
  { label: string; style: string; body: string }
> = {
  listed: {
    label: 'On the list',
    style: 'border-accent/50 bg-accent-tint/40 dark:border-accent-dark/50 dark:bg-accent/10',
    body: 'This field appears in the official list — the dMAT with the General Academic Module applies to Master’s applicants with this previous degree (SoSe 2027 intake onward).',
  },
  'separate-assessment': {
    label: 'Separate APS assessment',
    style: 'border-warning/50 bg-warning/10',
    body: 'Sector-specific degrees like this require separate formal assessment by APS — the dMAT requirement may apply only after that classification.',
  },
  'not-automatic': {
    label: 'Not automatically covered',
    style: 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900',
    body: 'The official guidance names this kind of degree as NOT automatically covered. The officially printed degree title/branch decides — check the official list and, in doubt, ask APS.',
  },
  'not-found': {
    label: 'Not in our data',
    style: 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900',
    body: 'We did not find this degree in our encoded list. That is NOT a clearance — check the official PDF and the APS India guidance; the official degree title on your certificate decides.',
  },
};

function FieldChecker() {
  const [query, setQuery] = useState('');
  const result = useMemo(() => checkField(query), [query]);
  const ui = VERDICT_UI[result.verdict];

  return (
    <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
      <h3 className="text-lg font-bold">Check your bachelor&rsquo;s degree</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Type your degree or branch (e.g. &ldquo;Mechanical Engineering&rdquo;, &ldquo;B.Com&rdquo;,
        &ldquo;BBA&rdquo;, &ldquo;BCA&rdquo;) — matched against the official v1.0 list of affected
        fields (29 June 2026).
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type your bachelor's degree…"
        aria-label="Your bachelor's degree"
        className="mt-3 w-full rounded-lg border border-zinc-300 bg-surface px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-700 dark:bg-surface-dark"
      />
      {query.trim().length >= 2 && (
        <div className={`mt-3 rounded-lg border-2 p-4 ${ui.style}`} role="status">
          <p className="font-bold">{ui.label}</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{ui.body}</p>
          {result.matches.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-zinc-200/60 pt-3 text-sm dark:border-zinc-700/60">
              {result.matches.map((m) => (
                <li key={m.name}>
                  <span className="font-semibold">{m.name}</span>
                  {m.group && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {GROUP_LABELS[m.group]}
                    </span>
                  )}
                  {m.verdict !== 'listed' && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {VERDICT_UI[m.verdict].label}
                    </span>
                  )}
                  {m.note && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{m.note}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Guidance only — the list is not exhaustive{FIELDS_DATA_COVERAGE === 'summary' ? ' and our encoded copy is a condensed version of the official PDF' : ''}. The official degree
            title/branch on your certificate decides, and APS makes the final classification.
            Taking the dMAT never substitutes for formal recognition.{' '}
            <a
              href={GAM_INFO.links.apsIndia}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent underline dark:text-accent-dark"
            >
              Official list &amp; FAQ (aps-india.de)
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

const TIMELINE = [
  { date: '29 Jun 2026', what: 'Registration opens (g.a.s.t. portal)' },
  { date: '15 Sep 2026', what: 'Registration closes for the first India cycle' },
  { date: '26 Sep 2026', what: 'First India test date' },
  { date: '12 Oct 2026', what: 'Certificates available in the participant portal' },
  { date: 'SoSe 2027', what: 'First intake where affected APS applications need the dMAT' },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Who has to take the dMAT?',
    a: "Master's applicants from India whose previous degree falls into one of three field groups — Engineering; Commerce/Accounting/Finance/Economics; Business/Management — for APS applications from the Summer Semester 2027 intake onward. They take the dMAT with the General Academic Module.",
  },
  {
    q: 'Who is NOT affected?',
    a: "Bachelor's applicants, PhD applicants, and officially confirmed exchange/partnership/double-degree participants. Also exempt: anyone who completed APS online registration or shipped complete APS documents before 29 June 2026, or who already holds an APS certificate.",
  },
  {
    q: 'What does it cost and where do I register?',
    a: 'The fee for the India/APS cohort is €150, charged by g.a.s.t. Registration runs through the g.a.s.t. portal (center search → dMAT exams). The exam is taken digitally at licensed test centers.',
  },
  {
    q: 'What if my score is low?',
    a: 'A low score does NOT automatically deny the APS certificate. The dMAT result appears on the APS certificate, and each university decides how to use the score in admissions.',
  },
  {
    q: 'How is the dMAT scored?',
    a: 'You receive a percentile rank and a standardized dMAT score from 0–200 with a mean of 100. The certificate is valid indefinitely.',
  },
  {
    q: 'What is in the exam?',
    a: 'The Core Module (Figure Sequences, Mathematical Equations, Latin Squares — 20 tasks / 25 minutes each) plus the General Academic Module (90 minutes of passage-based single-choice questions across eight academic fields). The full sitting is about 3.5 hours including a 30-minute break. Everything is in English, no notes are allowed, and unanswered questions simply count as wrong — so always answer.',
  },
  {
    q: 'Does CoreForge use real dMAT questions?',
    a: 'No. Every question here is original content generated for this free, unofficial practice tool, modeled on the officially documented formats. Official sample materials note that sample difficulty does not necessarily reflect the real test.',
  },
];

/** "Do I need the dMAT?" — the standalone info page for the India/APS
 *  requirement, with the affected-fields checker. Static, crawlable, and
 *  linked from Landing, Footer, and the GAM hub. */
export default function DmatInfo() {
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Do I need the dMAT?</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        The <strong>dMAT (digital Master Assessment Test)</strong> is a standardized study-aptitude
        test for admission of international applicants to Master&rsquo;s programmes in Germany, run
        by g.a.s.t./TestDaF-Institut with support from the DAAD. From <strong>2026</strong> it is
        part of the <strong>APS India</strong> verification process: affected applicants for the{' '}
        <strong>Summer Semester 2027 intake and later</strong> must take the dMAT with the{' '}
        <strong>General Academic Module</strong>.
      </p>

      <div className="mt-6">
        <FieldChecker />
      </div>

      <h2 className="mt-8 text-xl font-bold">The three affected field groups</h2>
      <ul className="mt-2 space-y-2">
        {GAM_INFO.india.affectedGroups.map((g) => (
          <li
            key={g}
            className="rounded-lg border border-zinc-200 bg-surface px-4 py-2.5 text-sm font-medium dark:border-zinc-800 dark:bg-surface-dark-alt"
          >
            {g}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Note: standalone Computer Science, BCA and IT degrees are <strong>not</strong> automatically
        covered — only Engineering branches such as &ldquo;Computer Science and Engineering&rdquo;
        are. Sector-specific management degrees (Hotel, Tourism, Aviation, Healthcare…) require
        separate APS assessment.
      </p>

      <h2 className="mt-8 text-xl font-bold">Key facts</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {[
              ['Fee (India/APS cohort)', `€${GAM_INFO.india.feeEur}`],
              ['Language', GAM_INFO.test.language],
              ['Format', GAM_INFO.test.format],
              ['Total duration', GAM_INFO.test.totalDurationText],
              ['General Academic Module', `${GAM_INFO.gam.durationMinutes} minutes, passage-based single choice (4 options)`],
              ['Notes', GAM_INFO.test.noNotes],
              ['Scoring', GAM_INFO.test.scoring],
              ['Certificate', GAM_INFO.test.certificateValidity],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-zinc-100 dark:border-zinc-800">
                <th scope="row" className="w-48 py-2 pr-4 text-left align-top font-semibold">
                  {k}
                </th>
                <td className="py-2 text-zinc-600 dark:text-zinc-300">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-bold">First India cycle — timeline</h2>
      <ol className="mt-3 space-y-0">
        {TIMELINE.map((t, i) => (
          <li key={t.date} className="relative flex gap-4 pb-5">
            <span className="flex flex-col items-center" aria-hidden="true">
              <span className="mt-1 h-3 w-3 flex-none rounded-full bg-accent dark:bg-accent-dark" />
              {i < TIMELINE.length - 1 && <span className="w-px flex-1 bg-zinc-300 dark:bg-zinc-700" />}
            </span>
            <span>
              <span className="timer-digits block text-sm font-bold">{t.date}</span>
              <span className="block text-sm text-zinc-600 dark:text-zinc-300">{t.what}</span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-6 text-xl font-bold">Frequently asked questions</h2>
      <div className="mt-2 space-y-2">
        {FAQ.map((f) => (
          <details
            key={f.q}
            className="group rounded-card border border-zinc-200 bg-surface p-4 dark:border-zinc-800 dark:bg-surface-dark-alt"
          >
            <summary className="cursor-pointer font-semibold marker:text-accent">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 rounded-card border-2 border-accent/30 bg-accent-tint/40 p-5 dark:border-accent-dark/30 dark:bg-accent/10">
        <h2 className="text-lg font-bold">Ready to prepare?</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          CoreForge covers the complete dMAT free of charge: unlimited Core Module practice plus the
          General Academic Module — topic drills, timed sets, and the full 3.5-hour simulation.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/gam"
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover"
          >
            Practice the General Academic Module
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 font-semibold dark:border-zinc-700"
          >
            Core Module practice
          </Link>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Official sources
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {[
          ['d-mat.de — official test site & preparatory materials', GAM_INFO.links.officialSite],
          ['g.a.s.t. portal — registration & center search', GAM_INFO.links.registration],
          ['aps-india.de/dmat — APS India: requirement, FAQ, affected-fields PDF', GAM_INFO.links.apsIndia],
          ['daad.de', GAM_INFO.links.daad],
        ].map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline dark:text-accent-dark"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        CoreForge is a free, unofficial practice tool with no affiliation to g.a.s.t., TestDaF-Institut,
        APS, or the DAAD. Facts on this page are stated as of {GAM_INFO.asOf} and can change — always
        verify against the official sources above.
      </p>
    </section>
  );
}
