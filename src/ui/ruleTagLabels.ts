/** Human-readable names for engine rule tags — used in Results, Analytics,
 *  and drill suggestions. */
export const RULE_TAG_LABELS: Record<string, string> = {
  // figures
  'fig.move.axis': 'Straight-line movement with bounce',
  'fig.move.diagonal.bounce': 'Diagonal movement with bounce',
  'fig.move.diagonal.slide': 'Diagonal movement with wall slide',
  'fig.move.perimeter': 'Perimeter movement',
  'fig.move.cycle': 'Direction cycling',
  'fig.rotate.cw': 'Clockwise rotation',
  'fig.rotate.ccw': 'Counter-clockwise rotation',
  'fig.color.cycle2': '2-colour alternation',
  'fig.color.cycle3': '3-colour cycle',
  'fig.accel.x+1': 'x+1 acceleration',
  'fig.multi.2symbols': 'Two symbols in parallel',
  'fig.multi.3symbols': 'Three symbols in parallel',
  'fig.multi.4symbols': 'Four symbols in parallel',
  // equations
  'eq.vars2': 'Two-variable systems',
  'eq.vars3': 'Three-variable systems',
  'eq.vars4': 'Four-variable systems',
  'eq.op.mul': 'Multiplication forms',
  'eq.op.div': 'Division forms',
  'eq.hub': 'Hub equations (3–4 variables)',
  'eq.combine': 'Combining equations with coefficients',
  'eq.subst.depth1': 'Direct substitution',
  'eq.subst.depth2': 'Two-step substitution',
  'eq.subst.depth3': 'Deep substitution chains',
  // latin squares
  'lat.direct': 'Direct elimination',
  'lat.chain2': 'Short deduction chains',
  'lat.chain4plus': 'Long deduction chains (4+ steps)',
  'lat.hiddenSingle.row': 'Hidden singles in rows',
  'lat.hiddenSingle.col': 'Hidden singles in columns',
  'lat.clues.sparse': 'Sparse-clue grids',
  // general academic module — topic areas
  'gam.topic.mathematics': 'GAM · Mathematics',
  'gam.topic.computational-sciences': 'GAM · Computational Sciences',
  'gam.topic.natural-sciences': 'GAM · Natural Sciences',
  'gam.topic.engineering': 'GAM · Engineering',
  'gam.topic.business-administration': 'GAM · Business Administration',
  'gam.topic.economics': 'GAM · Economics',
  'gam.topic.social-sciences': 'GAM · Social Sciences',
  'gam.topic.humanities': 'GAM · Humanities',
  // general academic module — skills
  'gam.skill.concept': 'GAM · Conceptual understanding',
  'gam.skill.compute': 'GAM · Applying formulas',
  'gam.skill.transfer': 'GAM · Transfer to new scenarios',
  'gam.skill.read-chart': 'GAM · Reading charts & tables',
};

export function ruleTagLabel(tag: string): string {
  return RULE_TAG_LABELS[tag] ?? tag;
}
