import type { ColorKind, PlacedSymbol } from '../types';

/** Official-look palette (§3.1). White keeps a dark outline; every shape is
 *  drawn with fill + outline so no rule is encoded in colour alone. */
export const SYMBOL_HEX: Record<ColorKind, string> = {
  black: '#1A1A1A',
  pink: '#C6316E',
  yellow: '#F2C230',
  orange: '#E8762C',
  green: '#3E9B4F',
  blue: '#2C5FA8',
  white: '#FFFFFF',
};

const OUTLINE = '#1A1A1A';

/** Geometric glyphs inside a 40×40 cell with ~15% padding, all legible at
 *  40 px and distinguishable in the four 90° rotations where relevant. */
function shapePath(symbol: PlacedSymbol, fill: string) {
  const common = { fill, stroke: OUTLINE, strokeWidth: 1.6, strokeLinejoin: 'round' as const };
  switch (symbol.shape) {
    case 'cross':
      return (
        <g>
          <rect x={17} y={5} width={6} height={30} transform="rotate(45 20 20)" {...common} />
          <rect x={17} y={5} width={6} height={30} transform="rotate(-45 20 20)" {...common} />
        </g>
      );
    case 'triangle':
      return <polygon points="20,7 33,33 7,33" {...common} />;
    case 'square':
      return <rect x={9} y={9} width={22} height={22} {...common} />;
    case 'circle':
      return <circle cx={20} cy={20} r={13} {...common} />;
    case 'halfCircle':
      return (
        <g>
          <circle cx={20} cy={20} r={13} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.6} />
          <path d="M20,7 A13,13 0 0 0 20,33 Z" {...common} />
        </g>
      );
    case 'halfSquare':
      return (
        <g>
          <rect x={9} y={9} width={22} height={22} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.6} />
          <rect x={9} y={9} width={11} height={22} {...common} />
        </g>
      );
    case 'tShape':
      return <path d="M8,8 H32 V15 H23.5 V33 H16.5 V15 H8 Z" {...common} />;
    case 'lShape':
      return <path d="M11,7 H18 V26 H30 V33 H11 Z" {...common} />;
    case 'plus':
      return <path d="M16.5,8 H23.5 V16.5 H32 V23.5 H23.5 V32 H16.5 V23.5 H8 V16.5 H16.5 Z" {...common} />;
    case 'star':
      return (
        <polygon
          points="20,6 23.5,15.3 33.3,15.7 25.7,21.9 28.2,31.4 20,26 11.8,31.4 14.3,21.9 6.7,15.7 16.5,15.3"
          {...common}
        />
      );
    case 'diamond':
      return <polygon points="20,6 34,20 20,34 6,20" {...common} />;
    case 'hourglass':
      return <path d="M8,8 H32 L22,20 L32,32 H8 L18,20 Z" {...common} />;
  }
}

/** One placed symbol, positioned and rotated inside a FigureGrid. */
export function SymbolGlyph({ symbol, cellSize = 40 }: { symbol: PlacedSymbol; cellSize?: number }) {
  const scale = cellSize / 40;
  const x = symbol.col * cellSize;
  const y = symbol.row * cellSize;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale}) rotate(${symbol.rotation} 20 20)`}
      data-symbol={symbol.symbolId}
    >
      {shapePath(symbol, SYMBOL_HEX[symbol.color])}
    </g>
  );
}
