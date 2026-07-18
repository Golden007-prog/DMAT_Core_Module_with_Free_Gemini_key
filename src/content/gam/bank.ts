import type { GamPassage } from '../../engine/types';
import { MATHEMATICS_PASSAGES } from './mathematics';
import { COMPUTATIONAL_PASSAGES } from './computationalSciences';
import { NATURAL_SCIENCES_PASSAGES } from './naturalSciences';
import { ENGINEERING_PASSAGES } from './engineering';
import { BUSINESS_PASSAGES } from './businessAdministration';
import { ECONOMICS_PASSAGES } from './economics';
import { SOCIAL_SCIENCES_PASSAGES } from './socialSciences';
import { HUMANITIES_PASSAGES } from './humanities';

/** The full seed bank: 2 original passages per official topic area. */
export const GAM_BANK: GamPassage[] = [
  ...MATHEMATICS_PASSAGES,
  ...COMPUTATIONAL_PASSAGES,
  ...NATURAL_SCIENCES_PASSAGES,
  ...ENGINEERING_PASSAGES,
  ...BUSINESS_PASSAGES,
  ...ECONOMICS_PASSAGES,
  ...SOCIAL_SCIENCES_PASSAGES,
  ...HUMANITIES_PASSAGES,
];
