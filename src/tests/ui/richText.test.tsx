import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PassageBody, RichText } from '../../ui/components/RichText';
import type { GamFigure } from '../../engine/types';

describe('RichText', () => {
  it('renders bold, math fallback, and literal escaped dollars', () => {
    render(<RichText text={'A **key term**, math $x^2$, price 10\\$ flat.'} />);
    expect(screen.getByText('key term').tagName).toBe('STRONG');
    // KaTeX loads lazily; initial render falls back to raw TeX in <code>
    expect(screen.getByText('x^2').tagName).toBe('CODE');
    expect(screen.getByText(/price 10\$ flat/)).toBeInTheDocument();
  });
});

describe('PassageBody', () => {
  const FIG: GamFigure = {
    id: 'demo-chart',
    svg: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
    caption: 'A demo chart',
    alt: 'A circle representing the demo data',
  };

  it('renders paragraphs, tables in scroll containers, and figures with alt text', () => {
    const md = [
      'First paragraph with **bold**.',
      '| Col A | Col B |\n|---|---|\n| 1 | 2 |',
      '{{fig:demo-chart}}',
      'Last paragraph.',
    ].join('\n\n');
    const { container } = render(<PassageBody markdown={md} figures={[FIG]} />);

    expect(screen.getByRole('columnheader', { name: 'Col A' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    const tableWrap = container.querySelector('.overflow-x-auto');
    expect(tableWrap).not.toBeNull();

    expect(screen.getByRole('img', { name: FIG.alt })).toBeInTheDocument();
    expect(screen.getByText(FIG.caption)).toBeInTheDocument();
    expect(screen.getByText('Last paragraph.')).toBeInTheDocument();
  });

  it('skips the markdown alignment row and keeps cell math', () => {
    const md = '| $|E_p|$ | Meaning |\n|---|---|\n| $> 1$ | elastic |';
    render(<PassageBody markdown={md} />);
    expect(screen.getByText('elastic')).toBeInTheDocument();
    expect(screen.queryByText('---')).toBeNull();
  });
});
