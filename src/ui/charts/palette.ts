import { useThemeStore } from '../../state/themeStore';

/** Validated with the dataviz six-checks script against #FFFFFF and #1E1E24.
 *  Fixed order: figures → equations → latin (color follows the entity). */
export const SERIES_LIGHT = { figures: '#A3195B', equations: '#2C5FA8', latin: '#3E9B4F' } as const;
export const SERIES_DARK = { figures: '#D4437F', equations: '#5B8DDA', latin: '#4CAA69' } as const;

export function useChartPalette() {
  const theme = useThemeStore((s) => s.theme);
  const dark = theme === 'dark';
  return {
    series: dark ? SERIES_DARK : SERIES_LIGHT,
    grid: dark ? '#33333B' : '#ECECF0',
    axisText: dark ? '#9C9CA6' : '#71717A',
    ink: dark ? '#F4F4F5' : '#1B1B1F',
    surface: dark ? '#1E1E24' : '#FFFFFF',
    refLine: dark ? '#9C9CA6' : '#8A8A94',
    /** sequential berry ramp, light→dark (magnitude) */
    sequential: dark
      ? ['#4A2237', '#6E2450', '#932A66', '#C2417F', '#E06898']
      : ['#F7E6EE', '#E8B7CD', '#D583AB', '#BE4A84', '#A3195B'],
  };
}
