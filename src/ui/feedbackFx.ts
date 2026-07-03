import { useSettings } from '../state/settingsStore';

/** Answer feedback effects: tiny WebAudio blips + optional vibration.
 *  Both are settings-gated and fail silently everywhere. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!useSettings.getState().soundEffects) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freqs: Array<[number, number]>, type: OscillatorType, volume = 0.06) {
  const a = audio();
  if (!a) return;
  let t = a.currentTime;
  for (const [freq, durMs] of freqs) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + durMs / 1000);
    t += durMs / 1000;
  }
}

function vibrate(pattern: number | number[]) {
  if (!useSettings.getState().haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export function fxCorrect() {
  blip([[660, 90], [880, 130]], 'sine');
  vibrate(15);
}

export function fxWrong() {
  blip([[220, 180]], 'triangle', 0.05);
  vibrate([30, 40, 30]);
}

export function fxTimeWarning() {
  blip([[520, 120], [520, 120]], 'sine', 0.05);
  vibrate(40);
}

export function fxPromotion() {
  blip([[523, 90], [659, 90], [784, 90], [1047, 180]], 'sine');
  vibrate([20, 30, 20, 30, 60]);
}
