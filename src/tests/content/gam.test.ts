import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { GAM_BANK } from '../../content/gam/bank';
import { GAM_TOPIC_AREAS } from '../../engine/types';
import { gamContentHash, validateGamPassage } from '../../engine/gam/validate';
import { assembleGamExam, assembleGamSet, GAM_EXAM } from '../../engine/gam/assemble';

/** Every $…$ segment in a text, without the delimiters. */
function mathSegments(text: string): string[] {
  return [...text.replace(/\\\$/g, '').matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
}

describe('GAM seed bank integrity', () => {
  it('ships ≥16 passages: 2 per official topic area', () => {
    expect(GAM_BANK.length).toBeGreaterThanOrEqual(16);
    for (const area of GAM_TOPIC_AREAS) {
      const inArea = GAM_BANK.filter((p) => p.topicArea === area);
      expect(inArea.length, `topic area '${area}'`).toBeGreaterThanOrEqual(2);
    }
  });

  it('ships ≥100 questions in total', () => {
    const total = GAM_BANK.reduce((sum, p) => sum + p.questions.length, 0);
    expect(total).toBeGreaterThanOrEqual(100);
  });

  it('every passage passes the full validator', () => {
    for (const p of GAM_BANK) {
      const res = validateGamPassage(p);
      expect(res.reasons, `passage '${p.id}'`).toEqual([]);
      expect(res.ok).toBe(true);
    }
  });

  it('passage ids and content hashes are unique', () => {
    expect(new Set(GAM_BANK.map((p) => p.id)).size).toBe(GAM_BANK.length);
    expect(new Set(GAM_BANK.map((p) => gamContentHash(p))).size).toBe(GAM_BANK.length);
  });

  it('every area offers both an accessible and a challenging passage', () => {
    for (const area of GAM_TOPIC_AREAS) {
      const diffs = GAM_BANK.filter((p) => p.topicArea === area).map((p) => p.difficulty);
      expect(
        diffs.some((d) => d === 'easy' || d === 'medium'),
        `'${area}' needs an easy/medium passage`,
      ).toBe(true);
      expect(
        diffs.some((d) => d === 'medium' || d === 'hard'),
        `'${area}' needs a medium/hard passage`,
      ).toBe(true);
    }
  });

  it('all inline math parses with KaTeX', () => {
    for (const p of GAM_BANK) {
      const texts = [
        p.passageMarkdown,
        ...p.questions.flatMap((q) => [q.stem, ...q.options, q.explanation]),
      ];
      for (const text of texts) {
        for (const segment of mathSegments(text)) {
          expect(
            () => katex.renderToString(segment, { throwOnError: true }),
            `passage '${p.id}': $${segment}$`,
          ).not.toThrow();
        }
      }
    }
  });

  it('question mix: every passage carries at least two distinct skill kinds', () => {
    for (const p of GAM_BANK) {
      const skills = new Set(p.questions.flatMap((q) => q.skillTags));
      expect(skills.size, `passage '${p.id}'`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('GAM bank supports every practice mode', () => {
  it('quick drill: 1 passage from every single area assembles', () => {
    for (const area of GAM_TOPIC_AREAS) {
      const set = assembleGamSet({ seed: 7, passageCount: 1, topicAreas: [area] }, GAM_BANK);
      expect(set.passages.length).toBe(1);
      expect(set.questions.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('exam blueprint stays in band for 300 consecutive seeds', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const exam = assembleGamExam(seed, GAM_BANK);
      expect(exam.passages.length).toBe(GAM_EXAM.passageCount);
      expect(exam.questions.length).toBeGreaterThanOrEqual(GAM_EXAM.minQuestions);
      expect(exam.questions.length).toBeLessThanOrEqual(GAM_EXAM.maxQuestions);
    }
  });
});
