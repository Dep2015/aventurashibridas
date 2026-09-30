/* ---------- modo demostración ----------
 * Con ?demo en la URL (por ejemplo http://localhost:8080/?demo) Xoxur juega solo todo el nivel 1:
 * corre por el llano, abre algunas cajas, sube el cerro y pelea con los dos jefes. No pierde energía.
 * El piloto automático aprieta las mismas teclas que el jugador (controls.keys). */
import { TS } from './config.js';

export const DEMO = new URLSearchParams(location.search).has('demo');

// cajas que abre en el camino (columnas): amuleto, balón de gas dorado, quipu, casino y plasma
const BOXES = [19, 38, 65, 109, 111];

// abrir la portada y empezar la partida sin tocar nada
export function autoStartDemo() {
  if (!DEMO) return;
  const click = (id, ms) => setTimeout(() => document.getElementById(id)?.click(), ms);
  click('startBtn', 1500);
  click('ovBtn', 3500);
}

// se llama en cada create() de la escena (también al reiniciar)
export function attachDemo(scene) {
  const d = { t: 0, boxes: BOXES.slice(), hold: 0, waitItem: 0, above: false };
  const fn = () => step(scene, d);
  scene.events.on('preupdate', fn);
  scene.events.once('shutdown', () => scene.events.off('preupdate', fn));
}

function step(s, d) {
  const p = s.player, c = s.controls, k = c?.keys;
  if (!p || !k) return;
  d.t++;
  const release = () => ['r', 'l', 'z', 'x'].forEach(n => { k[n].isDown = false; });
  if (!s.running || s.won || s.dead) { release(); return; }

  const pb = p.body, onG = pb.blocked.down, now = s.time.now;
  const tx = Math.floor(p.x / TS), ty = Math.floor((pb.bottom - 4) / TS), fy = Math.floor((pb.bottom + 4) / TS);
  const solid = (x, y) => !!s.blocks[x + ',' + y];
  const wall = solid(tx + 1, ty) || solid(tx + 1, ty - 1);
  // pozo adelante: sin suelo en las 2 columnas siguientes
  const pit = onG && !s.bossStarted && !solid(tx + 1, fy) && !solid(tx + 2, fy);
  const foes = s.enemies.getChildren().filter(e => e.active && !e.dead && e.x > p.x - 10 && e.x - p.x < 330 && Math.abs(e.y - p.y) < 90);
  const near = foes.some(e => e.x - p.x < 95);
  const boss = s.boss && !s.boss.dead ? s.boss : null;

  // próxima caja: ya abierta (o pasada hace rato) → la siguiente
  while (d.boxes.length) {
    const b = s.blocks[d.boxes[0] + ',11'];
    if (b && b.getData('type') === 'power' && tx <= d.boxes[0] + 3) break;
    if (b && b.getData('type') !== 'power') d.waitItem = now + 700;  // recién abierta: esperar el ítem
    d.boxes.shift();
  }
  const box = d.boxes[0];
  // ítem flotando o deslizándose cerca (sale de la caja que se acaba de abrir)
  const item = s.powerups.getChildren().find(u => u.active && Math.abs(u.x - p.x) < 260 && u.y > p.y - 260);

  let right = !s.bossDone, left = false, jump = false, run = !s.bossStarted;
  if (boss) {  // mantener distancia del jefe y saltar de vez en cuando
    const dx = boss.x - p.x;
    right = dx > 260; left = dx > 0 && dx < 150;
    jump = onG && d.t % 90 === 0;
  } else if (item || now < d.waitItem) {
    run = false;
    if (!item || !item.ready) { right = left = false; }
    else if (item.slides) { right = item.x > p.x + 4; left = item.x < p.x - 4; jump = onG && Math.abs(item.x - p.x) < 40 && item.y < pb.top; }
    else {
      // flota sobre la caja: saltar desde la primera columna libre a la izquierda (sin bloques arriba)
      // y avanzar en el aire para caer encima de la fila de cajas y tocarlo
      const up = pb.bottom <= item.y + 20;  // ya está arriba, sobre la caja o los ladrillos
      let lc = Math.floor(item.x / TS) - 1;
      while (lc > 0 && (solid(lc, 11) || solid(lc, 10))) lc--;
      const tgt = lc * TS + TS / 2 - 4;
      if (onG && up) { right = item.x > p.x + 4; left = item.x < p.x - 4; }
      else if (onG) { right = p.x < tgt - 5; left = p.x > tgt + 5; jump = !right && !left; }
      else {
        // en cuanto los pies pasan por encima de la caja, avanzar hasta caer sobre ella
        if (pb.bottom < item.y + 12) d.above = true;
        right = d.above && item.x > p.x; left = false;
      }
      if (onG) d.above = false;
    }
  } else if (box !== undefined && tx >= box - 4) {
    // caja adelante: ubicarse justo debajo y saltar
    const bx = box * TS + TS / 2;
    run = false; right = p.x < bx - 4; left = p.x > bx + 4;
    jump = onG && !right && !left;
  } else {
    jump = onG && (wall || pit || near);
  }

  k.r.isDown = right; k.l.isDown = left; k.x.isDown = run;
  // mantener el salto presionado 0,6 s (salto alto); soltar al menos unos cuadros antes del siguiente
  if (jump && d.hold < -3) { k.z._justDown = true; d.hold = 36; }
  k.z.isDown = d.hold-- > 0;
  if ((foes.length || boss) && d.t % 12 === 0) k.c._justDown = true;  // lanzar galletas
}
