import { useEffect, useReducer } from 'react';
import type { GamFigure } from '../../engine/types';

/**
 * Markdown-lite renderer for GAM content: paragraphs, **bold**, | tables |,
 * $KaTeX$ inline math, {{fig:id}} figures. Deliberately tiny — the content
 * validator guarantees the input shape, so no general-purpose parser needed.
 * KaTeX loads lazily on first math render; raw TeX shows until then.
 */

/* ------------------------------ lazy KaTeX -------------------------------- */

type KatexModule = { renderToString(tex: string, opts?: object): string };
let katexModule: KatexModule | null = null;
let katexPromise: Promise<void> | null = null;
const katexWaiters = new Set<() => void>();

export function ensureKatex(): Promise<void> {
  if (!katexPromise) {
    katexPromise = Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(
      ([m]) => {
        katexModule = (m as { default?: KatexModule }).default ?? (m as unknown as KatexModule);
        for (const wake of katexWaiters) wake();
        katexWaiters.clear();
      },
    );
  }
  return katexPromise;
}

function MathSpan({ tex }: { tex: string }) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (katexModule) return;
    katexWaiters.add(force);
    void ensureKatex();
    return () => {
      katexWaiters.delete(force);
    };
  }, []);
  if (!katexModule) {
    return <code className="font-mono text-[0.9em] text-zinc-600 dark:text-zinc-300">{tex}</code>;
  }
  const html = katexModule.renderToString(tex, { throwOnError: false, output: 'html' });
  // eslint-disable-next-line react/no-danger -- KaTeX output from validated content
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ------------------------------- tokenizer -------------------------------- */

const ESCAPED_DOLLAR = '\u0000';

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'math'; value: string }
  | { kind: 'fig'; value: string };

function tokenize(raw: string): Token[] {
  const text = raw.replace(/\\\$/g, ESCAPED_DOLLAR);
  const re = /\{\{fig:([a-z0-9-]+)\}\}|\$([^$]+)\$|\*\*([^*]+)\*\*/g;
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'fig', value: m[1] });
    else if (m[2] !== undefined) out.push({ kind: 'math', value: m[2].replace(new RegExp(ESCAPED_DOLLAR, 'g'), '\\$') });
    else out.push({ kind: 'bold', value: m[3] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out.map((t) =>
    t.kind === 'text' || t.kind === 'bold'
      ? { ...t, value: t.value.replace(new RegExp(ESCAPED_DOLLAR, 'g'), '$') }
      : t,
  );
}

/* ------------------------------- components ------------------------------- */

export function FigureBlock({ figure }: { figure: GamFigure }) {
  return (
    <figure className="my-4">
      <div
        role="img"
        aria-label={figure.alt}
        className="mx-auto max-w-md [&>svg]:h-auto [&>svg]:w-full"
        // eslint-disable-next-line react/no-danger -- validator rejects scriptable SVG
        dangerouslySetInnerHTML={{ __html: figure.svg }}
      />
      <figcaption className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {figure.caption}
      </figcaption>
    </figure>
  );
}

/** Inline rich text: stems, options, explanations. Figures referenced inline
 *  render as their caption link-text (block figures belong to the passage). */
export function RichText({ text, figures }: { text: string; figures?: GamFigure[] }) {
  return (
    <>
      {tokenize(text).map((t, i) => {
        switch (t.kind) {
          case 'text':
            return <span key={i}>{t.value}</span>;
          case 'bold':
            return <strong key={i}>{t.value}</strong>;
          case 'math':
            return <MathSpan key={i} tex={t.value} />;
          case 'fig': {
            const fig = figures?.find((f) => f.id === t.value);
            return fig ? <FigureBlock key={i} figure={fig} /> : null;
          }
        }
      })}
    </>
  );
}

/* ------------------------------ block parser ------------------------------ */

interface Block {
  kind: 'paragraph' | 'table' | 'figure';
  lines: string[];
}

function splitBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of markdown.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every((l) => l.startsWith('|'))) blocks.push({ kind: 'table', lines });
    else if (lines.length === 1 && /^\{\{fig:[a-z0-9-]+\}\}$/.test(lines[0]))
      blocks.push({ kind: 'figure', lines });
    else blocks.push({ kind: 'paragraph', lines });
  }
  return blocks;
}

/** Split a table row on '|' — but never inside $math$, where '|' is a
 *  legitimate symbol (e.g. $|E_p|$). */
function cells(row: string): string[] {
  const inner = row.replace(/^\|/, '').replace(/\|\s*$/, '');
  const out: string[] = [];
  let cur = '';
  let inMath = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '$' && inner[i - 1] !== '\\') inMath = !inMath;
    if (ch === '|' && !inMath) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function TableBlock({ lines, figures }: { lines: string[]; figures?: GamFigure[] }) {
  const [header, ...rest] = lines;
  const body = rest.filter((l) => !/^\|[\s|:-]+\|$/.test(l));
  return (
    // wide tables scroll inside their own container — the page never does
    <div className="my-3 overflow-x-auto">
      <table className="w-auto min-w-[50%] border-collapse text-sm">
        <thead>
          <tr>
            {cells(header).map((c, i) => (
              <th
                key={i}
                scope="col"
                className="border-b-2 border-zinc-300 px-3 py-1.5 text-left font-semibold dark:border-zinc-600"
              >
                <RichText text={c} figures={figures} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {cells(row).map((c, i) => (
                <td
                  key={i}
                  className="border-b border-zinc-200 px-3 py-1.5 align-top dark:border-zinc-700"
                >
                  <RichText text={c} figures={figures} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Full passage body: block-level markdown with figures and tables. */
export function PassageBody({ markdown, figures }: { markdown: string; figures?: GamFigure[] }) {
  return (
    <div className="text-[15px] leading-relaxed sm:text-base sm:leading-[1.65]">
      {splitBlocks(markdown).map((block, i) => {
        if (block.kind === 'table') return <TableBlock key={i} lines={block.lines} figures={figures} />;
        if (block.kind === 'figure') {
          const id = block.lines[0].match(/^\{\{fig:([a-z0-9-]+)\}\}$/)![1];
          const fig = figures?.find((f) => f.id === id);
          return fig ? <FigureBlock key={i} figure={fig} /> : null;
        }
        return (
          <p key={i} className="my-3 first:mt-0 last:mb-0">
            <RichText text={block.lines.join(' ')} figures={figures} />
          </p>
        );
      })}
    </div>
  );
}
