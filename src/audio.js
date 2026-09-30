/* ---------- sonido simple ---------- */
let AC = null;
export function sfx(f1, f2, dur, type = 'square', vol = 0.08) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}
export const SND = {
  jump: () => sfx(300, 700, .18),
  coin: () => { sfx(988, 988, .07); setTimeout(() => sfx(1319, 1319, .25), 70); },
  stomp: () => sfx(400, 90, .14, 'triangle', .15),
  bump: () => sfx(140, 90, .1, 'triangle', .15),
  brk: () => sfx(200, 40, .25, 'sawtooth', .07),
  up: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => sfx(f, f, .1), i * 70)); },
  hurt: () => sfx(600, 150, .35, 'square', .07),
  die: () => { [494, 440, 392, 330, 262].forEach((f, i) => setTimeout(() => sfx(f, f * .98, .16), i * 130)); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => setTimeout(() => sfx(f, f, .15), i * 110)); }
};
