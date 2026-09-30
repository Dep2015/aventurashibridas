/* ---------- modo cinemáticas ----------
 * Con ?cine en la URL (por ejemplo http://localhost:8080/?cine) el juego recorre solo todas las escenas con imágenes
 * y sus transiciones, sin jugar: prólogo → despegue en la cumbre → entrada al nivel 2 → victoria sobre el Amaru →
 * caída a la mina (nivel 3) → pelea con Muqui Z resuelta → géiser → final del nivel 3 → el Cusco (nivel 4) → el cetro del
 * Qorikancha → la Chakana de Sacsayhuamán.
 * Cada paso espera a que termine el anterior (se revisa cada 300 ms). */
export const CINE = new URLSearchParams(location.search).has('cine');

export function startCine(game) {
  if (!CINE) return;
  const S = k => game.scene.getScene(k);
  const active = k => !!S(k)?.sys.isActive();
  const $ = id => document.getElementById(id);
  const later = (ms, fn) => setTimeout(fn, ms);
  const steps = [
    // portada → «Comenzar»: empieza el prólogo
    { when: () => !$('splash').hidden && S('play')?.player, run: () => later(1200, () => $('startBtn').click()) },
    // después del prólogo aparece la elección de personaje → «Jugar»
    { when: () => !active('escena') && !$('ov').hidden, run: () => later(800, () => $('ovBtn').click()) },
    // nivel 1: directo a la cumbre (reja abierta, báculo) y toma las alas → despegue y entrada al nivel 2
    { when: () => S('play')?.running, run: () => {
      const s = S('play');
      s.bossStarted = true; s.bossDone = true; s.openGate(); s.powers.giveCetro();
      s.player.body.reset(424 * 32, -61 * 32 - 40);
      later(1800, () => s.takeWings());
    } },
    // nivel 2: se ve un momento y se vence al Amaru → caída a la mina
    { when: () => active('vuelo') && S('vuelo').running, run: () => later(3500, () => S('vuelo').win()) },
    // nivel 3: se ve la mina un momento y se pasa a la guarida de Muqui Z
    { when: () => active('cueva') && S('cueva').player, run: () => later(3500, () => S('cueva').scene.start('guarida', { run: S('cueva').run })) },
    // guarida: Muqui Z cae → géiser y escena final
    { when: () => active('guarida') && S('guarida').boss?.alive, run: () => later(3000, () => {
      const g = S('guarida');
      g.hurt = () => {};
      g.boss.hp = 1; g.damageFoe(g.boss, 5, false);
    }) },
    // nivel 4: se ve el Cusco un momento, la escena del cetro (vuelve al Cusco) y la de la Chakana
    { when: () => active('cusco') && S('cusco').player && !S('cusco').busy, run: () => later(3500, () => { const c = S('cusco'); c.run.has.cetro = true; c.cutscene('cetro4'); }) },
    { when: () => active('cusco') && S('cusco').player && S('cusco').run.has.cetro && !S('cusco').busy, run: () => later(3000, () => S('cusco').cutscene('chakana4')) }
  ];
  let i = 0;
  const timer = setInterval(() => {
    const st = steps[i];
    if (!st) { clearInterval(timer); return; }
    if (st.when()) { i++; st.run(); }
  }, 300);
}
