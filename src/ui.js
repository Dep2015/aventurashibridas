import { SHEETS, state } from './config.js';
import { sfx, SND } from './audio.js';

let game = null;
export function setGame(g) { game = g; }

/* ---------- overlays ---------- */
const ov = document.getElementById('ov'), ovT = document.getElementById('ovTitle'), ovX = document.getElementById('ovText'),
      ovS = document.getElementById('ovStats'), ovB = document.getElementById('ovBtn');
let ovMode = 'title';
const splash = document.getElementById('splash'), startBtn = document.getElementById('startBtn');
let splashOpen = true;
const isTouch = window.matchMedia('(pointer:coarse)').matches;
async function goLandscape() {
  if (!isTouch) return;
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (e) { /* iOS y algunos navegadores no lo permiten: basta con girar el teléfono */ }
}

document.querySelectorAll('.face').forEach(el => el.style.backgroundImage = `url(${SHEETS[el.dataset.c]})`);
document.querySelectorAll('.who').forEach(b => b.addEventListener('click', () => {
  if (b.getAttribute('aria-disabled') === 'true') return;  // personaje bloqueado
  state.char = b.dataset.c;
  document.querySelectorAll('.who').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  const sc = game && game.scene.getScene('play'); if (sc && sc.player) sc.setChar(state.char);
}));
export function showOverlay(mode, d = {}) {
  ovMode = mode;
  // con la portada abierta, el overlay espera detrás hasta que se pulse «Comenzar»
  if (splashOpen) { ov.hidden = true; return; }
  ov.hidden = false;
  if (mode === 'title') { ovT.textContent = 'Nivel 1'; ovX.textContent = 'Elige personaje. Pisa a los enemigos o lánzales galletas con C. Empiezas con 100 de energía. Sube el cerro: en la cima te esperan Inka Locu y El Sacrificador.'; ovS.hidden = true; ovB.textContent = 'Jugar'; }
  if (mode === 'win') { ovT.textContent = d.title || '¡Venciste a El Sacrificador!'; ovX.textContent = d.text || 'Continuará…'; ovS.hidden = false; ovS.textContent = `${d.score} puntos · ${d.coins} monedas`; ovB.textContent = 'Jugar de nuevo'; }
  if (mode === 'over') { ovT.textContent = 'Fin del juego'; ovX.textContent = 'Te quedaste sin energía.'; ovS.hidden = false; ovS.textContent = `${d.score} puntos`; ovB.textContent = 'Intentar de nuevo'; }
  setTimeout(() => ovB.focus(), 50);
}
/* ---------- portada ---------- */
startBtn.focus({ preventScroll: true });
startBtn.addEventListener('click', () => {
  if (!splashOpen) return;
  sfx(1, 1, .01, 'sine', 0.0001);  // desbloquea el audio con el gesto del usuario
  SND.up();
  goLandscape();
  splashOpen = false; splash.hidden = true;
  // la primera vez: el prólogo con imágenes (encima del nivel 1) y después la elección de personaje
  if (ovMode === 'title' && game) {
    ov.hidden = true;
    game.scene.run('escena', { cut: 'intro1', run: { hp: 100, maxHp: 100, score: 0, coins: 0 } });
    game.scene.bringToTop('escena');
  } else showOverlay(ovMode);
});
/* ---------- panel del jugador (fuera del lienzo) ---------- */
const hud = { face: document.getElementById('hudFace'), fill: document.getElementById('hpFill'), text: document.getElementById('hpText'),
  meter: document.getElementById('hpMeter'), time: document.getElementById('hudTime'), score: document.getElementById('hudScore'),
  coins: document.getElementById('hudCoins') };
let lastChar = null;
export function renderHud({ hp, max, score, coins, time, char }) {
  const pct = Math.max(0, hp) / max * 100;
  hud.fill.style.width = pct + '%';
  hud.fill.dataset.level = pct <= 25 ? 'low' : pct <= 50 ? 'mid' : 'ok';
  hud.text.textContent = Math.ceil(hp);
  hud.meter.setAttribute('aria-valuenow', String(Math.ceil(hp)));
  hud.time.textContent = Math.max(0, Math.ceil(time));
  hud.score.textContent = String(score).padStart(6, '0');
  hud.coins.textContent = coins;
  if (char !== lastChar) { hud.face.style.backgroundImage = `url(${SHEETS[char]})`; lastChar = char; }
}

const boss = { box: document.getElementById('bossSide'), fill: document.getElementById('bossFill'),
  text: document.getElementById('bossText'), meter: document.getElementById('bossMeter') };
// muestra/oculta la vida del jefe; con cfg pone su nombre y su retrato (figura de reposo recortada de su hoja)
let bossCfg = null;
export function showBossPanel(on, cfg) {
  boss.box.hidden = !on;
  if (cfg) { bossCfg = cfg; document.getElementById('bossName').textContent = cfg.name; fitBossFace(); }
}
function fitBossFace() {
  if (!bossCfg || boss.box.hidden) return;
  const el = document.getElementById('bossFace'), { url, sheet, fig } = bossCfg.portrait;
  const w = el.clientWidth, h = el.clientHeight, [fx, fy, fw, fh] = fig;
  const k = Math.min(w / fw, h / fh);
  el.style.backgroundImage = `url(${url})`;
  el.style.backgroundSize = `${sheet[0] * k}px ${sheet[1] * k}px`;
  el.style.backgroundPosition = `${-fx * k + (w - fw * k) / 2}px ${-fy * k + (h - fh * k)}px`;
}
window.addEventListener('resize', fitBossFace);
export function renderBoss(hp, max) {
  boss.fill.style.width = Math.max(0, hp) / max * 100 + '%';
  boss.text.textContent = Math.ceil(Math.max(0, hp));
  boss.meter.setAttribute('aria-valuenow', String(Math.ceil(Math.max(0, hp))));
  boss.meter.setAttribute('aria-valuemax', String(max));
}

// nombre del nivel en la cabecera
export function setLevelName(txt) { document.getElementById('lvlName').textContent = txt; }

// sin portada ni elección de personaje (para empezar directo en un nivel)
export function skipSplash() { splashOpen = false; splash.hidden = true; ov.hidden = true; ovMode = 'title'; }

export function hideOverlay() { ov.hidden = true; document.querySelector('#game canvas')?.focus(); }
ovB.addEventListener('click', () => {
  sfx(1, 1, .01, 'sine', 0.0001);
  goLandscape();
  const sc = game.scene.getScene('play'), fly = game.scene.getScene('vuelo'), cave = game.scene.getScene('cueva');
  const lair = game.scene.getScene('guarida'), ending = game.scene.getScene('escena'), cusco = game.scene.getScene('cusco');
  const inCusco = cusco && cusco.sys.isActive();
  const pelea = game.scene.getScene('pelea'), inPelea = pelea && pelea.sys.isActive();
  const inFlight = fly && fly.sys.isActive(), inCave = cave && (cave.sys.isActive() || cave.sys.isPaused()), inLair = lair && lair.sys.isActive();
  ov.hidden = true;
  if (ovMode === 'title') { ov.hidden = false; sc.begin(); return; }
  // perder en el nivel 2: se reintenta el nivel 2 desde su comienzo
  if (ovMode === 'over' && inFlight) { fly.scene.restart(fly.startData); return; }
  // perder el Round 2 contra el Supay: se repite la pelea
  if (ovMode === 'over' && inPelea) { pelea.scene.restart(pelea.startData); return; }
  // perder en el Cusco (nivel 4): se vuelve a entrar al área donde estaba, con lo que tenía al entrar
  if (ovMode === 'over' && inCusco) { cusco.scene.restart(cusco.startData); return; }
  if (inCusco) { game.scene.stop('cusco'); game.scene.start('play', { score: 0, coins: 0, autostart: true }); return; }
  // perder contra Muqui Z: se repite solo esa pelea (con lo que se traía de la mina)
  if (ovMode === 'over' && inLair) { lair.scene.restart(lair.startData); return; }
  if (inLair) { game.scene.stop('guarida'); game.scene.start('play', { score: 0, coins: 0, autostart: true }); return; }
  // después de la escena final del nivel 3: de nuevo desde el nivel 1
  if (ending && ending.sys.isActive()) { game.scene.stop('escena'); game.scene.start('play', { score: 0, coins: 0, autostart: true }); return; }
  // perder en el nivel 3: se reintenta el nivel 3 desde el piso 1
  if (ovMode === 'over' && inCave) { cave.scene.restart(cave.startData); return; }
  // ganar (o perder en el nivel 1): de nuevo desde el nivel 1
  if (inCave) { game.scene.stop('batalla'); game.scene.stop('cueva'); game.scene.start('play', { score: 0, coins: 0, autostart: true }); }
  else if (inFlight) { game.scene.stop('vuelo'); game.scene.start('play', { score: 0, coins: 0, autostart: true }); }
  else sc.scene.restart({ lives: 3, score: 0, coins: 0, autostart: true });
});
