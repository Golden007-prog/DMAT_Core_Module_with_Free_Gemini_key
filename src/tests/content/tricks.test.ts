import { createElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { TRICKS, tricksForRuleTag, type TrickLevel, type TrickSubtest } from '../../content/tricks';
import { RULE_TAG_LABELS } from '../../ui/ruleTagLabels';
import Learn from '../../ui/screens/Learn';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Floor per subtest — the library is only useful if no subtest is a stub. */
const MIN_PER_SUBTEST: Record<TrickSubtest, number> = {
  figures: 25,
  equations: 25,
  latin: 25,
  gam: 10,
  pacing: 12,
  mindset: 8,
};

describe('trick library', () => {
  it('holds at least 110 tricks', () => {
    expect(TRICKS.length).toBeGreaterThanOrEqual(110);
  });

  it('has unique kebab-case ids', () => {
    const ids = TRICKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id, `id "${id}" is not kebab-case`).toMatch(KEBAB);
    }
  });

  it('has no empty titles, bodies or examples', () => {
    for (const t of TRICKS) {
      expect(t.title.trim(), t.id).not.toBe('');
      expect(t.body.trim(), t.id).not.toBe('');
      if (t.example !== undefined) expect(t.example.trim(), t.id).not.toBe('');
    }
  });

  it('bodies carry real content, not one-liners', () => {
    for (const t of TRICKS) {
      expect(t.body.length, `${t.id} body is too thin`).toBeGreaterThan(60);
    }
  });

  it('tags every trick with rule tags the analytics screen knows', () => {
    for (const t of TRICKS) {
      for (const tag of t.ruleTags ?? []) {
        expect(RULE_TAG_LABELS[tag], `${t.id} references unknown rule tag "${tag}"`).toBeDefined();
      }
    }
  });

  it('keeps the subtest distribution sane', () => {
    for (const [subtest, min] of Object.entries(MIN_PER_SUBTEST) as Array<[TrickSubtest, number]>) {
      const n = TRICKS.filter((t) => t.subtest === subtest).length;
      expect(n, `${subtest} has only ${n} tricks`).toBeGreaterThanOrEqual(min);
    }
  });

  it('uses every level', () => {
    for (const level of ['core', 'sharp', 'elite'] as TrickLevel[]) {
      expect(TRICKS.some((t) => t.level === level), `no ${level} tricks`).toBe(true);
    }
  });

  it('links rule tags back to techniques', () => {
    // the tags the engine emits most often must each reach at least one trick
    for (const tag of ['fig.accel.x+1', 'fig.move.perimeter', 'eq.hub', 'lat.direct']) {
      expect(tricksForRuleTag(tag).length, `no trick covers ${tag}`).toBeGreaterThan(0);
    }
  });
});

describe('Learn renders the library', () => {
  afterEach(cleanup);

  it('mounts every trick title (bodies stay mounted, so Ctrl+F finds them)', () => {
    const { container } = render(createElement(Learn));
    for (const t of TRICKS) {
      expect(screen.getAllByText(t.title).length, `${t.id} missing from Learn`).toBeGreaterThan(0);
    }
    // bodies are hidden, not unmounted
    for (const t of TRICKS.slice(0, 10)) {
      expect(container.querySelector(`#trick-${t.id}`), `${t.id} body not mounted`).not.toBeNull();
    }
  });

  it('survives a 360px viewport: nothing forces a horizontal scroll', () => {
    const { container } = render(createElement(Learn));

    // no fixed pixel widths wider than a 360px phone minus the card padding
    for (const el of container.querySelectorAll<HTMLElement>('[style*="width"]')) {
      const w = /width:\s*(\d+)px/.exec(el.getAttribute('style') ?? '');
      if (w) expect(Number(w[1]), `inline width ${w[1]}px is too wide`).toBeLessThanOrEqual(320);
    }
    for (const el of container.querySelectorAll('[class*="w-["], [class*="min-w-["]')) {
      const cls = el.getAttribute('class') ?? '';
      const m = /(?:^|\s)(?:min-)?w-\[(\d+)px\]/.exec(cls);
      if (m) expect(Number(m[1]), `${cls} pins a width past 320px`).toBeLessThanOrEqual(320);
    }

    // the filter rows (every child is a filter chip) must wrap rather than
    // form a strip the user cannot scroll
    const chipRows = [...new Set([...container.querySelectorAll('button[aria-pressed]')].map((b) => b.parentElement))]
      .filter((p): p is HTMLElement => !!p)
      .filter((p) => [...p.children].every((c) => c.matches('button[aria-pressed]')));
    expect(chipRows.length, 'no filter rows found').toBeGreaterThanOrEqual(2);
    for (const row of chipRows) {
      const cls = row.className;
      expect(cls, 'filter row neither wraps nor scrolls').toMatch(/flex-wrap|overflow-x-auto/);
      expect(cls, 'filter row must not clip its chips').not.toMatch(/overflow-hidden|flex-nowrap/);
    }

    // wide code examples scroll inside their own box
    for (const pre of container.querySelectorAll('pre')) {
      expect(pre.className, 'example block cannot scroll').toContain('overflow-x-auto');
    }
  });
});
