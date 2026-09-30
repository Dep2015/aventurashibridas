/* ---------- modo de pruebas ----------
 * Con ?prueba en la URL (por ejemplo http://localhost:8080/?prueba) aparece el botón «🧪 Pruebas» arriba a la derecha:
 * un panel para saltar a cualquier nivel, zona o jefe, darse todos los objetos y ser invencible. Solo para probar. */
import { skipSplash, showBossPanel } from './ui.js';
import { ARENA_X } from './level2.js';

export const PRUEBA = new URLSearchParams(location.search).has('prueba');

// estado de partida del nivel 4 con todo (quena, las dos canciones, el cetro, llaves y Casinos)
const run4 = (area, pos, era = 'hoy', extra = {}) => ({
  hp: 100, maxHp: 100, score: 0, coins: 0, inv: { casino: 5, llave: 3 },
  has: { quena: true, cetro: true, chakana: false }, songs: { tiempo: true, sol: true },
  flags: { metPaqo: true }, blocks: {}, area, era, pos, intro: false, ...extra
});

export function startPrueba(game) {
  if (!PRUEBA) return;
  let god = false;
  const scenes = () => game.scene.getScenes(false);
  const stopAll = () => {
    // con el administrador de escenas (inmediato); this.scene.stop() de cada escena queda en cola y no llega a tiempo
    scenes().forEach(s => { if (s.sys.settings.status >= 2 && s.sys.settings.status < 8) game.scene.stop(s.sys.settings.key); });
    skipSplash(); showBossPanel(false);
    document.getElementById('ov').hidden = true;
  };
  // arranca una escena y, cuando ya tiene jugador, hace `then`
  const start = (key, data, then) => {
    stopAll();
    game.scene.start(key, data);
    if (!then) return;
    const t0 = performance.now();
    const wait = () => {
      const s = game.scene.getScene(key);
      if (s?.player && s.sys.isActive()) then(s);
      else if (performance.now() - t0 < 15000) setTimeout(wait, 150);
    };
    setTimeout(wait, 150);
  };
  const backPacha = () => run4('sacsayhuaman', [22, 17], 'hoy', { flags: { metPaqo: true, group_wiracocha: true, boss_pachacutec: true } });
  const flags4 = { metPaqo: true, clear_luna: true, chest_cofreLuna: true, door_qorikancha_arcoiris: true, group_arcoiris: true, group_inti: true, beam_qorikancha: true };

  const SECTIONS = [
    ['Nivel 1 · Cordillera', [
      ['Inicio', () => start('play', { score: 0, coins: 0, autostart: true })],
      ['Jefes (Inka Locu y El Sacrificador)', () => start('play', { score: 0, coins: 0, autostart: true }, s => { s.player.body.reset(334 * 32, -40 * 32 - 40); s.cameras.main.centerOn(s.player.x, s.player.y); })],
      ['Cumbre (las alas)', () => start('play', { score: 0, coins: 0, autostart: true }, s => {
        s.bossStarted = true; s.bossDone = true; s.openGate(); s.powers.giveCetro();
        s.player.body.reset(420 * 32, -61 * 32 - 40); s.cameras.main.centerOn(s.player.x, s.player.y);
      })]
    ]],
    ['Nivel 2 · El cielo', [
      ['Inicio', () => start('vuelo', { score: 0, coins: 0, cetro: true })],
      ['Amaru', () => start('vuelo', { score: 0, coins: 0, cetro: true }, s => { s.introUntil = 0; s.player.x = ARENA_X + 300; })]
    ]],
    ['Nivel 3 · La mina', [
      ['Piso 1', () => start('cueva', { score: 0, coins: 0, cetro: true })],
      ['Piso 3', () => start('cueva', { score: 0, coins: 0, cetro: true, floor: 3 })],
      ['Muqui Z', () => start('cueva', { score: 0, coins: 0, cetro: true }, s => { const run = s.run; game.scene.stop('cueva'); game.scene.start('guarida', { run }); })]
    ]],
    ['Nivel 4 · Cusco (con todo)', [
      ['Arco de Santa Clara', () => start('cusco', { run: run4('santaclara', null, 'hoy', { has: { quena: false, cetro: false }, songs: {}, flags: {}, inv: { casino: 1, llave: 0 }, intro: true }) })],
      ['Plaza de Armas (hoy)', () => start('cusco', { run: run4('plaza', [13, 20], 'hoy') })],
      ['Huacaypata (inca)', () => start('cusco', { run: run4('plaza', [18, 20], 'inca') })],
      ['Intipampa (inca)', () => start('cusco', { run: run4('loreto', [11.5, 18], 'inca') })],
      ['Qorikancha', () => start('cusco', { run: run4('qorikancha', [17.5, 3], 'inca', { has: { quena: true, cetro: false } }) })],
      ['Supay', () => start('cusco', { run: run4('qorikancha', [20, 18], 'inca', { has: { quena: true, cetro: false }, flags: flags4 }) })],
      ['Supay · Round 2 (pelea)', () => start('pelea', { back: run4('qorikancha', [20, 25], 'inca', { has: { quena: true, cetro: false }, flags: { ...flags4, boss_supay: true } }) })],
      ...[['sueno', 'Sueño del Supay'], ['vuelo', 'Vuelo al cielo radiactivo'], ['balon', 'Balón de gas'], ['plasma', 'Plasma de los tres']].map(([force, label]) =>
        ['Especial: ' + label, () => start('pelea', { force, back: run4('qorikancha', [20, 25], 'inca', { has: { quena: true, cetro: false }, flags: { ...flags4, boss_supay: true } }) })]),
      ['Calle Resbalosa', () => start('cusco', { run: run4('sancristobal', [16, 28], 'hoy') })],
      ['Sacsayhuamán', () => start('cusco', { run: run4('sacsayhuaman', [21.5, 40], 'hoy') })],
      ['Pachacútec', () => start('cusco', { run: run4('sacsayhuaman', [22, 15], 'hoy', { flags: { metPaqo: true, group_wiracocha: true } }) })],
      ['Pachacútec · Round 2 (pelea)', () => start('pelea', { rival: 'pachacutec', back: backPacha() })],
      ...[['vara', 'Vara gigante'], ['queso', 'Inkaxur de queso'], ['balonP', 'Balón de gas (Pacha)'], ['plasmaP', 'Plasma de los tres (Pacha)']].map(([force, label]) =>
        ['Especial: ' + label, () => start('pelea', { rival: 'pachacutec', force, back: backPacha() })])
    ]],
    ['Cinemáticas', [
      ['Prólogo (video)', () => start('escena', { cut: 'intro1', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } })],
      ['Despegue (nivel 2)', () => start('escena', { cut: 'intro2', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } })],
      ['Caída a la mina (nivel 3)', () => start('escena', { cut: 'intro3', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } })],
      ['Final del nivel 3', () => start('escena', { cut: 'final3', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } })],
      ['El cetro', () => start('escena', { cut: 'cetro4', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } })],
      ['La Chakana', () => start('escena', { cut: 'chakana4', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } })]
    ]]
  ];

  // botón y panel
  const btn = document.createElement('button');
  btn.id = 'pruebaBtn'; btn.textContent = '🧪 Pruebas';
  const panel = document.createElement('div');
  panel.id = 'pruebaPanel'; panel.hidden = true;
  const godBtn = document.createElement('button');
  const setGod = on => { god = on; godBtn.textContent = on ? '🛡 Invencible: SÍ' : '🛡 Invencible: no'; godBtn.classList.toggle('on', on); };
  godBtn.addEventListener('click', () => setGod(!god)); setGod(false);
  const head = document.createElement('div'); head.className = 'pr-head';
  head.innerHTML = '<b>Modo de pruebas</b>';
  head.appendChild(godBtn);
  panel.appendChild(head);
  SECTIONS.forEach(([title, items]) => {
    const h = document.createElement('div'); h.className = 'pr-title'; h.textContent = title; panel.appendChild(h);
    const row = document.createElement('div'); row.className = 'pr-row';
    items.forEach(([label, fn]) => {
      const b = document.createElement('button'); b.textContent = label;
      b.addEventListener('click', () => { panel.hidden = true; fn(); document.querySelector('#game canvas')?.focus(); });
      row.appendChild(b);
    });
    panel.appendChild(row);
  });
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  document.body.append(btn, panel);

  // invencible: la energía se rellena sola en la escena que esté activa
  setInterval(() => {
    if (!god) return;
    const S = k => { const s = game.scene.getScene(k); return s?.sys.isActive() ? s : null; };
    let s;
    if ((s = S('play')) && s.hp < 100) { s.hp = 100; s.updateHud?.(); }
    if ((s = S('vuelo')) && s.hp < 100) { s.hp = 100; s.updateHud?.(); }
    for (const k of ['cueva', 'guarida', 'cusco']) if ((s = game.scene.getScene(k)) && s.run && s.run.hp < s.run.maxHp && (s.sys.isActive() || s.sys.isPaused())) { s.run.hp = s.run.maxHp; s.updateHud?.(); }
  }, 150);
}
