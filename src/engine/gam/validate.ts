import type {
  GamFigure,
  GamPassage,
  GamQuestion,
  ValidationResult,
} from '../types';
import { GAM_TOPIC_AREAS } from '../types';

/** Words that signal option-order-dependent phrasing: such a question must
 *  lock its option order so per-session shuffling can't scramble meaning. */
const ORDER_DEPENDENT = /\b(both|neither|all of the above|none of the above|only i\b|only ii\b|statements? i\b)/i;

/** Explanations must reference option CONTENT, never letters — letters are
 *  reassigned when options shuffle per session. */
const LETTER_REFERENCE = /(^|[^\w$])[a-d]\)(\s|$)|option\s+[a-d]\b/i;

const FIG_PLACEHOLDER = /\{\{fig:([a-z0-9-]+)\}\}/g;

/** `$…$` inline math must come in balanced pairs (KaTeX parse happens in the
 *  content test suite where the real renderer is loaded). */
export function mathDelimitersBalanced(text: string): boolean {
  // strip escaped dollars, then count the rest
  const stripped = text.replace(/\\\$/g, '');
  return (stripped.match(/\$/g) ?? []).length % 2 === 0;
}

function figureIds(text: string): string[] {
  return [...text.matchAll(FIG_PLACEHOLDER)].map((m) => m[1]);
}

function wordCount(markdown: string): number {
  return markdown
    .replace(FIG_PLACEHOLDER, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Question-level checks — standalone, so cached/pooled questions can be
 *  revalidated without their passage (same contract as the other subtests). */
export function validateGamQuestion(q: GamQuestion): ValidationResult {
  const reasons: string[] = [];

  if (q.type !== 'gam') reasons.push(`type must be 'gam', got '${q.type}'`);
  if (!q.id) reasons.push('missing id');
  if (!q.passageId) reasons.push('missing passageId');
  if (q.id && q.passageId && !q.id.startsWith(q.passageId)) {
    reasons.push(`id '${q.id}' must be prefixed with its passageId '${q.passageId}'`);
  }
  if (!q.stem?.trim()) reasons.push('empty stem');

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    reasons.push('exactly 4 options required (official format)');
  } else {
    if (q.options.some((o) => !o?.trim())) reasons.push('empty option');
    const normalized = q.options.map((o) => o.trim().toLowerCase());
    if (new Set(normalized).size !== 4) reasons.push('duplicate options');
    if (!q.lockOptionOrder && q.options.some((o) => ORDER_DEPENDENT.test(o))) {
      reasons.push('order-dependent option wording requires lockOptionOrder');
    }
  }

  if (!(q.correct === 0 || q.correct === 1 || q.correct === 2 || q.correct === 3)) {
    reasons.push(`correct must be 0–3, got ${String(q.correct)}`);
  }

  if (!q.explanation || q.explanation.trim().length < 30) {
    reasons.push('explanation missing or too short to be a worked solution');
  } else if (LETTER_REFERENCE.test(q.explanation)) {
    reasons.push('explanation references option letters — reference option content instead');
  }

  if (!Array.isArray(q.skillTags) || q.skillTags.length === 0) {
    reasons.push('at least one skillTag required');
  } else if (q.skillTags.some((t) => !t.startsWith('gam.skill.'))) {
    reasons.push("skillTags must be namespaced 'gam.skill.*'");
  }

  if (!Array.isArray(q.ruleTags) || !q.ruleTags.some((t) => t.startsWith('gam.topic.'))) {
    reasons.push("ruleTags must include the passage's 'gam.topic.<area>' tag");
  }

  for (const field of [q.stem, ...(q.options ?? []), q.explanation ?? '']) {
    if (typeof field === 'string' && !mathDelimitersBalanced(field)) {
      reasons.push(`unbalanced $ math delimiters in: "${field.slice(0, 40)}…"`);
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/** SVG is rendered with dangerouslySetInnerHTML and pool passages come from
 *  other users — anything scriptable is rejected outright, not sanitized. */
const SVG_FORBIDDEN =
  /<script|<foreignObject|<iframe|<embed|<object|javascript:|\bon[a-z]+\s*=|href\s*=|xlink:href/i;

function validateFigure(fig: GamFigure, reasons: string[]) {
  if (!fig.id) reasons.push('figure missing id');
  if (!fig.svg?.trimStart().startsWith('<svg')) {
    reasons.push(`figure '${fig.id}': svg must be inline <svg …> markup`);
  }
  if (fig.svg && SVG_FORBIDDEN.test(fig.svg)) {
    reasons.push(`figure '${fig.id}': svg contains scriptable content (script/event/link)`);
  }
  if (fig.svg && !/viewBox=/.test(fig.svg)) {
    reasons.push(`figure '${fig.id}': svg must set a viewBox so it can scale responsively`);
  }
  if (!fig.alt?.trim()) reasons.push(`figure '${fig.id}': missing alt text`);
  if (!fig.caption?.trim()) reasons.push(`figure '${fig.id}': missing caption`);
}

/** Full passage checks: structure, figures resolve, questions valid + tagged
 *  with this passage's topic. Runs over the whole bank at test time and over
 *  every AI/pool passage before it can enter a session. */
export function validateGamPassage(p: GamPassage): ValidationResult {
  const reasons: string[] = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? '')) {
    reasons.push(`passage id must be a kebab-case slug, got '${p.id}'`);
  }
  if (!GAM_TOPIC_AREAS.includes(p.topicArea)) {
    reasons.push(`unknown topicArea '${p.topicArea}'`);
  }
  if (!p.title?.trim()) reasons.push('missing title');
  if (!['easy', 'medium', 'hard'].includes(p.difficulty)) {
    reasons.push(`invalid difficulty '${p.difficulty}'`);
  }
  if (!['seed', 'ai+validated', 'pool'].includes(p.source)) {
    reasons.push(`invalid source '${p.source}'`);
  }
  if (!(p.estimatedMinutes >= 4 && p.estimatedMinutes <= 25)) {
    reasons.push(`estimatedMinutes ${p.estimatedMinutes} outside 4–25`);
  }

  const words = wordCount(p.passageMarkdown ?? '');
  if (words < 220 || words > 750) {
    reasons.push(`passage is ${words} words — must be 220–750 (official style ≈350–600)`);
  }
  if (!mathDelimitersBalanced(p.passageMarkdown ?? '')) {
    reasons.push('unbalanced $ math delimiters in passage');
  }

  const figs = p.figures ?? [];
  for (const fig of figs) validateFigure(fig, reasons);
  const knownFigs = new Set(figs.map((f) => f.id));
  if (knownFigs.size !== figs.length) reasons.push('duplicate figure ids');

  const referenced = new Set(figureIds(p.passageMarkdown ?? ''));
  for (const q of p.questions ?? []) for (const id of figureIds(q.stem)) referenced.add(id);
  for (const id of referenced) {
    if (!knownFigs.has(id)) reasons.push(`{{fig:${id}}} does not resolve to a figure`);
  }
  for (const id of knownFigs) {
    if (!referenced.has(id)) reasons.push(`figure '${id}' is never referenced`);
  }

  const qs = p.questions ?? [];
  if (qs.length < 5 || qs.length > 8) {
    reasons.push(`${qs.length} questions — official style is 5–8 per passage`);
  }
  const qIds = new Set(qs.map((q) => q.id));
  if (qIds.size !== qs.length) reasons.push('duplicate question ids');

  for (const q of qs) {
    if (q.passageId !== p.id) {
      reasons.push(`question '${q.id}' has passageId '${q.passageId}', expected '${p.id}'`);
    }
    if (!q.ruleTags.includes(`gam.topic.${p.topicArea}`)) {
      reasons.push(`question '${q.id}' missing ruleTag 'gam.topic.${p.topicArea}'`);
    }
    const check = validateGamQuestion(q);
    if (!check.ok) reasons.push(...check.reasons.map((r) => `question '${q.id}': ${r}`));
  }

  return { ok: reasons.length === 0, reasons };
}

/** Stable content hash for community-pool dedup: FNV-1a over the semantic
 *  content (prose + answers), ignoring ids/metadata so trivial re-slugging
 *  can't bypass dedup. */
export function gamContentHash(p: GamPassage): string {
  const semantic = JSON.stringify([
    p.topicArea,
    normalize(p.passageMarkdown),
    p.questions.map((q) => [normalize(q.stem), q.options.map(normalize).sort(), q.correct]),
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < semantic.length; i++) {
    h ^= semantic.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + '-' + semantic.length.toString(16);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
