import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <nav
        aria-label="Footer"
        className="mx-auto mb-2 flex max-w-[1100px] flex-wrap justify-center gap-x-4 gap-y-1 px-4"
      >
        <Link to="/dmat-info" className="font-medium underline-offset-2 hover:underline">
          Do I need the dMAT?
        </Link>
        <a
          href="https://www.d-mat.de/en/"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Official test site
        </a>
        <a
          href="https://aps-india.de/dmat/"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          APS India
        </a>
        <a
          href="https://www.gast.de/portal/center-search/center-search/dmat/exams/worldwide?lang=en"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Register (g.a.s.t.)
        </a>
      </nav>
      <p className="mx-auto max-w-[1100px] px-4">
        Unofficial practice tool. Not affiliated with g.a.s.t., TestDaF-Institut, APS, or the DAAD.
        Question formats follow publicly documented dMAT task types; all questions are originally
        generated. dMAT is a trademark of its owners.
      </p>
    </footer>
  );
}
