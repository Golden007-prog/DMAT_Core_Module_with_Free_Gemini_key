import type { GamTopicArea } from '../engine/types';

/** Display names for the eight official GAM topic areas. */
export const GAM_TOPIC_LABELS: Record<GamTopicArea, string> = {
  mathematics: 'Mathematics',
  'computational-sciences': 'Computational Sciences',
  'natural-sciences': 'Natural Sciences',
  engineering: 'Engineering',
  'business-administration': 'Business Administration',
  economics: 'Economics',
  'social-sciences': 'Social Sciences',
  humanities: 'Humanities',
};

/** Chip styling per area — color-blind-safe because the chip always carries
 *  the text label; color is reinforcement, never the only signal. */
export const GAM_TOPIC_CHIP: Record<GamTopicArea, string> = {
  mathematics: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  'computational-sciences': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  'natural-sciences': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  engineering: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  'business-administration': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  economics: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  'social-sciences': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  humanities: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
};

export const GAM_SKILL_LABELS: Record<string, string> = {
  'gam.skill.concept': 'Concept',
  'gam.skill.compute': 'Computation',
  'gam.skill.transfer': 'Transfer',
  'gam.skill.read-chart': 'Chart reading',
};
