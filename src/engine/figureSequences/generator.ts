import type {
  ColorKind,
  Difficulty,
  FigureQuestion,
  Frame,
  GridIndex,
  MovementRule,
  ShapeKind,
  SymbolProgram,
} from '../types';
import type { Prng } from '../prng';
import { PERIMETER_RING, simulateWithStates, type SimulationResult } from './simulate';
import {
  ALL_SHAPES,
  AXIS_DIRS,
  DIAG_DIRS,
  DIRECTION_CYCLES,
  ROTATABLE_SHAPES,
  SYMBOL_COLORS,
  isInferable,
} from './rules';
import { buildDistractorFrames } from './distractors';

const ROTATIONS = [0, 90, 180, 270] as const;

function pickCell(prng: Prng, taken: Set<string>, ringOnly: boolean): { row: GridIndex; col: GridIndex } | null {
  const cells: Array<{ row: GridIndex; col: GridIndex }> = [];
  if (ringOnly) {
    for (const c of PERIMETER_RING) if (!taken.has(`${c.row},${c.col}`)) cells.push(c);
  } else {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!taken.has(`${r},${c}`)) cells.push({ row: r as GridIndex, col: c as GridIndex });
      }
    }
  }
  if (cells.length === 0) return null;
  return prng.pick(cells);
}

function colorCycle(base: ColorKind, len: 2 | 3, prng: Prng): ColorKind[] {
  const others = prng.shuffle(SYMBOL_COLORS.filter((c) => c !== base));
  return [base, ...others.slice(0, len - 1)];
}

interface Role {
  movement: 'axis' | 'diag' | 'perimeter' | 'cycle';
  step: 1 | 2 | 'x+1';
  rotate: boolean;
  colored: boolean;
}

function sampleRoles(difficulty: Difficulty, prng: Prng): Role[] {
  if (difficulty === 'easy') {
    return [
      {
        movement: prng.chance(0.5) ? 'axis' : 'perimeter',
        step: prng.chance(0.6) ? 1 : 2,
        rotate: false,
        colored: false,
      },
    ];
  }

  if (difficulty === 'medium') {
    const k = prng.int(2, 3);
    return Array.from({ length: k }, () => {
      const movement = prng.pick(['axis', 'diag', 'perimeter', 'cycle'] as const);
      const extra = prng.chance(0.65) ? (prng.chance(0.5) ? 'rotate' : 'color') : 'none';
      return {
        movement,
        step: movement === 'cycle' ? 1 : prng.chance(0.7) ? 1 : (2 as const),
        rotate: extra === 'rotate',
        colored: extra === 'color',
      };
    });
  }

  // hard: ≥1 x+1 rule, ≥1 move+rotate+colour symbol, ≥1 diagonal bounce path
  const k = prng.int(3, 4);
  const roles: Role[] = [];
  roles.push({ movement: 'diag', step: prng.chance(0.5) ? 1 : 2, rotate: true, colored: true });
  roles.push({
    movement: prng.pick(['axis', 'diag', 'perimeter'] as const),
    step: 'x+1',
    rotate: prng.chance(0.5),
    colored: true,
  });
  for (let i = 2; i < k; i++) {
    const movement = prng.pick(['axis', 'diag', 'perimeter', 'cycle'] as const);
    const rotate = prng.chance(0.5);
    roles.push({
      movement,
      step: movement === 'cycle' ? 1 : prng.chance(0.7) ? 1 : (2 as const),
      rotate,
      colored: !rotate || prng.chance(0.4),
    });
  }
  return roles;
}

function samplePrograms(difficulty: Difficulty, prng: Prng): SymbolProgram[] | null {
  const roles = sampleRoles(difficulty, prng);

  // unique shapes; rotation-rule symbols draw from the rotation-visible pool
  const rotatablePool = prng.shuffle(ROTATABLE_SHAPES);
  const otherPool = prng.shuffle(ALL_SHAPES);
  const usedShapes = new Set<ShapeKind>();
  const baseColors = prng.shuffle(SYMBOL_COLORS);

  const taken = new Set<string>();
  const programs: SymbolProgram[] = [];

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const pool = role.rotate ? rotatablePool : otherPool;
    const shape = pool.find((s) => !usedShapes.has(s));
    if (!shape) return null;
    usedShapes.add(shape);

    const start = pickCell(prng, taken, role.movement === 'perimeter');
    if (!start) return null;
    taken.add(`${start.row},${start.col}`);

    let movement: MovementRule;
    if (role.movement === 'axis') {
      movement = { kind: 'axis-bounce', ...prng.pick(AXIS_DIRS), step: role.step, boundary: 'bounce' };
    } else if (role.movement === 'diag') {
      movement = {
        kind: 'axis-bounce',
        ...prng.pick(DIAG_DIRS),
        step: role.step,
        boundary: prng.chance(0.75) ? 'bounce' : 'slide',
      };
    } else if (role.movement === 'perimeter') {
      movement = { kind: 'perimeter', dir: prng.chance(0.5) ? 'cw' : 'ccw', step: role.step };
    } else {
      movement = { kind: 'direction-cycle', dirs: prng.pick(DIRECTION_CYCLES) };
    }

    const color = baseColors[i];
    programs.push({
      symbolId: `s${i + 1}`,
      shape,
      color,
      initialRotation: ROTATABLE_SHAPES.includes(shape) ? prng.pick(ROTATIONS) : 0,
      startRow: start.row,
      startCol: start.col,
      movement,
      ...(role.rotate
        ? {
            rotation: {
              dir: prng.chance(0.5) ? ('cw' as const) : ('ccw' as const),
              count:
                difficulty === 'hard' && role.step !== 'x+1' && prng.chance(0.25)
                  ? ('x+1' as const)
                  : (1 as const),
            },
          }
        : {}),
      ...(role.colored
        ? { colorRule: { cycle: colorCycle(color, prng.chance(0.6) ? 2 : 3, prng) } }
        : {}),
    });
  }
  return programs;
}

/** Every symbol must visibly change in ≥ 4 of the 5 transitions (§5.1). */
function changesGate(programs: SymbolProgram[], frames: Frame[]): boolean {
  for (const p of programs) {
    let changes = 0;
    for (let t = 0; t < 5; t++) {
      const a = frames[t].find((s) => s.symbolId === p.symbolId)!;
      const b = frames[t + 1].find((s) => s.symbolId === p.symbolId)!;
      if (a.row !== b.row || a.col !== b.col || a.rotation !== b.rotation || a.color !== b.color) {
        changes++;
      }
    }
    if (changes < 4) return false;
  }
  return true;
}

const SHAPE_NAMES: Record<ShapeKind, string> = {
  cross: 'X-cross',
  triangle: 'triangle',
  square: 'square',
  circle: 'circle',
  halfCircle: 'half-filled circle',
  halfSquare: 'half-filled square',
  tShape: 'T-shape',
  lShape: 'L-shape',
  plus: 'plus sign',
  star: 'star',
  diamond: 'diamond',
  hourglass: 'hourglass',
};

const DIR_NAMES: Record<string, string> = {
  '-1,0': 'up',
  '1,0': 'down',
  '0,-1': 'left',
  '0,1': 'right',
  '-1,-1': 'diagonally up-left',
  '-1,1': 'diagonally up-right',
  '1,-1': 'diagonally down-left',
  '1,1': 'diagonally down-right',
};

function describeProgram(p: SymbolProgram): string {
  const name = `${p.color[0].toUpperCase()}${p.color.slice(1)} ${SHAPE_NAMES[p.shape]}`;
  const parts: string[] = [];

  const m = p.movement;
  if (m.kind === 'axis-bounce') {
    const dir = DIR_NAMES[`${m.dr},${m.dc}`];
    const pace =
      m.step === 'x+1'
        ? 'accelerating +1 cell each transition (1, 2, 3, …)'
        : `${m.step} cell${m.step === 1 ? '' : 's'} per transition`;
    const wall = m.boundary === 'bounce' ? 'bouncing off the walls' : 'sliding along the wall';
    parts.push(`moves ${dir}, ${pace}, ${wall}`);
  } else if (m.kind === 'perimeter') {
    const pace =
      m.step === 'x+1'
        ? 'accelerating +1 cell each transition (x+1)'
        : `${m.step} cell${m.step === 1 ? '' : 's'} per transition`;
    parts.push(`walks the outer border ${m.dir === 'cw' ? 'clockwise' : 'counter-clockwise'}, ${pace}`);
  } else if (m.kind === 'direction-cycle') {
    const seq = m.dirs.map((d) => DIR_NAMES[`${d.dr},${d.dc}`]).join(', ');
    parts.push(`moves 1 cell in the repeating direction sequence ${seq}`);
  }

  if (p.rotation) {
    parts.push(
      p.rotation.count === 'x+1'
        ? `rotates ${p.rotation.dir === 'cw' ? 'clockwise' : 'counter-clockwise'} with accelerating 90° steps (90°, 180°, 270°, …)`
        : `rotates 90° ${p.rotation.dir === 'cw' ? 'clockwise' : 'counter-clockwise'} per transition`,
    );
  }
  if (p.colorRule) {
    parts.push(`cycles colours ${p.colorRule.cycle.join(' → ')}`);
  }
  return `${name}: ${parts.join('; ')}.`;
}

function collectRuleTags(programs: SymbolProgram[]): string[] {
  const tags = new Set<string>();
  for (const p of programs) {
    const m = p.movement;
    if (m.kind === 'axis-bounce') {
      if (m.dr !== 0 && m.dc !== 0) {
        tags.add(m.boundary === 'bounce' ? 'fig.move.diagonal.bounce' : 'fig.move.diagonal.slide');
      } else {
        tags.add('fig.move.axis');
      }
      if (m.step === 'x+1') tags.add('fig.accel.x+1');
    } else if (m.kind === 'perimeter') {
      tags.add('fig.move.perimeter');
      if (m.step === 'x+1') tags.add('fig.accel.x+1');
    } else if (m.kind === 'direction-cycle') {
      tags.add('fig.move.cycle');
    }
    if (p.rotation) {
      tags.add(p.rotation.dir === 'cw' ? 'fig.rotate.cw' : 'fig.rotate.ccw');
      if (p.rotation.count === 'x+1') tags.add('fig.accel.x+1');
    }
    if (p.colorRule) {
      tags.add(p.colorRule.cycle.length === 2 ? 'fig.color.cycle2' : 'fig.color.cycle3');
    }
  }
  if (programs.length >= 2) tags.add(`fig.multi.${programs.length}symbols`);
  return [...tags];
}

function buildImage(
  sim: SimulationResult,
  programs: SymbolProgram[],
  frameIdx: number,
  prng: Prng,
): { options: [Frame, Frame, Frame]; correct: 0 | 1 | 2 } | null {
  const distractors = buildDistractorFrames(programs, sim, frameIdx, prng);
  if (!distractors) return null;
  const tagged = prng.shuffle([
    { frame: sim.frames[frameIdx], isCorrect: true },
    { frame: distractors[0], isCorrect: false },
    { frame: distractors[1], isCorrect: false },
  ]);
  return {
    options: tagged.map((t) => t.frame) as [Frame, Frame, Frame],
    correct: tagged.findIndex((t) => t.isCorrect) as 0 | 1 | 2,
  };
}

export function generateFigureQuestion(difficulty: Difficulty, prng: Prng): FigureQuestion {
  const seed = prng.int(0, 2 ** 31 - 1);

  for (let attempt = 0; attempt < 500; attempt++) {
    const programs = samplePrograms(difficulty, prng);
    if (!programs) continue;

    const sim = simulateWithStates(programs, 6);
    if (!sim) continue;
    if (!changesGate(programs, sim.frames)) continue;
    if (!isInferable(programs, sim.frames)) continue;

    const image1 = buildImage(sim, programs, 4, prng);
    const image2 = buildImage(sim, programs, 5, prng);
    if (!image1 || !image2) continue;

    return {
      id: crypto.randomUUID(),
      type: 'figures',
      difficulty,
      seed,
      ruleTags: collectRuleTags(programs),
      givenFrames: sim.frames.slice(0, 4) as FigureQuestion['givenFrames'],
      image1,
      image2,
      ruleDescriptions: programs.map(describeProgram),
      program: programs,
    };
  }
  throw new Error(`figure generation exhausted retries (${difficulty})`);
}
