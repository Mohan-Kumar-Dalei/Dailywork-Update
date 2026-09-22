/**
 * Chhoti si tick awaaz — picker scroll aur button click par.
 * WebAudio se banti hai, koi file download nahi hoti.
 */

let ctx = null;
let enabled = true;

// Ek hi click se do tone na bajein: itne ms ke andar dobara wahi awaaz skip.
const GAP_MS = 70;
let lastAt = 0;
let lastKind = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * @param {'tick'|'soft'|'done'} kind
 */
export function play(kind = 'tick') {
  if (!enabled) return;

  const now = Date.now();
  if (kind === lastKind && now - lastAt < GAP_MS) return;
  lastKind = kind;
  lastAt = now;

  const ac = audio();
  if (!ac) return;

  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  const preset = {
    tick: { freq: 1900, peak: 0.045, dur: 0.028 },
    soft: { freq: 1200, peak: 0.035, dur: 0.045 },
    done: { freq: 880, peak: 0.06, dur: 0.12 }
  }[kind] || { freq: 1800, peak: 0.04, dur: 0.03 };

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(preset.freq, t0);
  if (kind === 'done') osc.frequency.exponentialRampToValueAtTime(1320, t0 + preset.dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(preset.peak, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + preset.dur);

  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + preset.dur + 0.02);
}

export function setSound(on) { enabled = on; }
export function soundOn() { return enabled; }

