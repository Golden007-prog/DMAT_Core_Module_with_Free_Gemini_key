import type { GamPassage } from '../../engine/types';

/** Lazy bank loader — the passage bank ships as its own chunk so the core
 *  bundle stays light; PWA precache still includes it for offline practice. */
export async function loadGamBank(): Promise<GamPassage[]> {
  const mod = await import('./bank');
  return mod.GAM_BANK;
}
