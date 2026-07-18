import { describe, expect, it } from 'vitest';
import { AFFECTED_FIELDS, checkField } from '../../content/affectedFields';

describe('affected-fields data', () => {
  it('covers all three official groups and both nuance sections', () => {
    expect(AFFECTED_FIELDS.some((f) => f.group === 'engineering')).toBe(true);
    expect(AFFECTED_FIELDS.some((f) => f.group === 'commerce-economics')).toBe(true);
    expect(AFFECTED_FIELDS.some((f) => f.group === 'business-management')).toBe(true);
    expect(AFFECTED_FIELDS.some((f) => f.verdict === 'separate-assessment')).toBe(true);
    expect(AFFECTED_FIELDS.some((f) => f.verdict === 'not-automatic')).toBe(true);
  });

  it('has unique names', () => {
    const names = AFFECTED_FIELDS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('checkField', () => {
  it('finds clearly listed degrees', () => {
    expect(checkField('Mechanical Engineering').verdict).toBe('listed');
    expect(checkField('B.Com').verdict).toBe('listed');
    expect(checkField('BBA').verdict).toBe('listed');
    expect(checkField('economics').verdict).toBe('listed');
  });

  it('the official CS nuance: CSE is listed, standalone CS/BCA is not automatic', () => {
    expect(checkField('Computer Science and Engineering').verdict).toBe('listed');
    expect(checkField('BCA').verdict).toBe('not-automatic');
    expect(checkField('B.Sc. Computer Science').verdict).toBe('not-automatic');
  });

  it('sector management routes to separate assessment', () => {
    expect(checkField('Hotel Management').verdict).toBe('separate-assessment');
    expect(checkField('BHM').verdict).toBe('separate-assessment');
    expect(checkField('Tourism Management').verdict).toBe('separate-assessment');
  });

  it('never clears an unknown degree — verdict is not-found, not "safe"', () => {
    const r = checkField('Bachelor of Fine Arts');
    expect(r.verdict).toBe('not-found');
    expect(r.matches).toEqual([]);
  });

  it('ignores degree-prefix noise when matching', () => {
    expect(checkField('Bachelor of Commerce').verdict).toBe('listed');
    expect(checkField('B.Tech Civil Engineering').verdict).toBe('listed');
  });

  it('short or empty queries return nothing', () => {
    expect(checkField('').verdict).toBe('not-found');
    expect(checkField('b').verdict).toBe('not-found');
  });
});
