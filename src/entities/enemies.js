import Phaser from 'phaser';
import { TS, GW, GH, GROUND_Y } from '../config.js';
import { LW, LH } from '../level.js';
import { sfx, SND } from '../audio.js';

/* ---------- enemigos ----------
 * Cada tipo define spawn (crear el sprite), update (IA de cada cuadro) y stomp
 * (qué pasa al pisarlo). Los enemigos sí usan la gravedad del mundo. */

// dar la vuelta si no hay suelo delante (consulta el mapa, no body.blocked)
function turnAtEdge(scene, e) {
  if (e.dropsOff || !e.body.blocked.down) return;  // los refuerzos del jefe sí bajan de las plataformas
  const fx = Math.floor((e.x + e.dir * 16) / TS), fy = Math.floor((e.body.bottom + 4) / TS);
  if (fy < LH && fx >= 0 && fx < LW && !scene.blocks[fx + ',' + fy]) e.dir *= -1;
}

// animación de derrota: cambia de cuadro en los tiempos dados y se desvanece
function defeat(scene, e, frames, fadeDelay) {
  e.setFrame(frames[0][1]);
  frames.slice(1).forEach(([ms, f]) => scene.time.delayedCall(ms, () => e.active && e.setFrame(f)));
  scene.tweens.add({ targets: e, alpha: 0, delay: fadeDelay, duration: 400, onComplete: () => e.destroy() });
}

function imataRest(e, time) {
  e.state = 'rest'; e.until = time + 750; e.anims.stop(); e.setFrame(12); e.setVelocityX(0);
}

// Imata no hace daño: empuja al jugador (más fuerte si viene embistiendo)
function push(scene, e) {
  const time = scene.time.now, p = scene.player;
  if (time < e.pushCD) return;
  e.pushCD = time + 700;
  const charging = e.state === 'charge';
  const dir = charging ? e.dir : (Math.sign(p.x - e.x) || e.dir);
  p.body.setVelocity(dir * (charging ? 520 : 280), charging ? -330 : -120);
  p.pushedUntil = time + (charging ? 480 : 280); p.jumping = true; p.lastGround = -1e9;
  sfx(180, 70, .25, 'square', .1); scene.cameras.main.shake(120, charging ? 0.006 : 0.003);
  imataRest(e, time); e.dir = -dir;
}

function throwCheese(scene, e) {
  const dx = scene.player.x - e.x;
  e.throwing = true; e.dir = Math.sign(dx) || -1; e.setVelocityX(0);
  e.anims.stop(); e.setFrame(6); e.setFlipX(e.dir < 0);
  sfx(220, 440, .2, 'sawtooth', .05);
  scene.time.delayedCall(380, () => {
    if (!e.active || e.dead) return;
    const b = scene.balls.create(e.x + e.dir * 18, e.y - 10, 'ball').setDepth(9);
    b.body.setCircle(8, 1, 1); b.body.setGravityY(-700);
    const dist = Phaser.Math.Clamp(Math.abs(dx), 60, 380);
    b.setVelocity(e.dir * (170 + dist * 0.35), -260); b.setAngularVelocity(e.dir * 500);
    sfx(500, 180, .15, 'square', .05);
    scene.time.delayedCall(3500, () => b.active && b.destroy());
    scene.time.delayedCall(220, () => {
      if (!e.active || e.dead) return;
      e.throwing = false; e.play('cheese-run'); e.nextThrow = scene.time.now + 2000 + Math.random() * 900;
    });
  });
}

const KINDS = {
  // cuy zombi: camina, gira en las paredes y cae por los bordes (reemplaza al escarabajo)
  cuy: {
    spawn(scene, x, floor = GROUND_Y) {
      const e = scene.enemies.create(x, floor - 20, 'cuy', 8);
      // cuadro de 52×40 con borde negro
      e.body.setSize(20, 30).setOffset(16, 9); e.play('cuy-walk'); e.speed = 55;
      return e;
    },
    update(scene, e) { e.setVelocityX(e.speed * e.dir); e.setFlipX(e.dir < 0); },
    stomp(scene, e) {
      SND.stomp(); scene.addScore(100, e.x, e.y - 30);
      defeat(scene, e, [[0, 26], [120, 31]], 450);  // golpe y queda estrellado
    }
  },

  // llama zombi: camina lento y persigue al jugador si está cerca
  llama: {
    spawn(scene, x, floor = GROUND_Y) {
      const e = scene.enemies.create(x, floor - 32 * 1.2, 'llama', 0).setScale(1.2);
      e.body.setSize(24, 54).setOffset(12, 10); e.play('llama-walk'); e.speed = 32; e.chasing = false;
      return e;
    },
    update(scene, e) {
      const p = scene.player, dx = p.x - e.x, dy = Math.abs(p.y - e.y);
      const near = Math.abs(dx) < 230 && dy < 110 && !scene.dead;
      if (near && !e.chasing) { e.chasing = true; e.play('llama-run'); sfx(90, 60, .25, 'sawtooth', .05); }
      else if (e.chasing && (Math.abs(dx) > 340 || scene.dead)) { e.chasing = false; e.play('llama-walk'); }
      if (e.chasing && e.body.blocked.down && Math.abs(dx) > 8) e.dir = Math.sign(dx);
      e.setVelocityX((e.chasing ? 118 : e.speed) * e.dir); e.setFlipX(e.dir < 0);
    },
    stomp(scene, e) {
      SND.stomp(); sfx(160, 50, .4, 'sawtooth', .06); scene.addScore(200, e.x, e.y - 40);
      defeat(scene, e, [[0, 14], [220, 15]], 700);
    }
  },

  // queso mutante: corre y lanza bolas de queso
  cheese: {
    spawn(scene, x, floor = GROUND_Y) {
      const e = scene.enemies.create(x, floor - 32, 'cheese', 0);
      e.body.setSize(26, 48).setOffset(17, 16); e.play('cheese-run'); e.speed = 150; e.throwing = false; e.nextThrow = 0;
      return e;
    },
    update(scene, e, time) {
      if (e.throwing) { e.setVelocityX(0); return; }
      if (!e.nextThrow) e.nextThrow = time + 900;
      const p = scene.player, dx = p.x - e.x;
      const near = Math.abs(dx) < 380 && Math.abs(p.y - e.y) < 160 && !scene.dead;
      if (near && time > e.nextThrow && e.body.blocked.down) { throwCheese(scene, e); return; }
      turnAtEdge(scene, e);
      e.setVelocityX(e.speed * e.dir); e.setFlipX(e.dir < 0);
    },
    stomp(scene, e) {
      SND.stomp(); sfx(300, 60, .45, 'triangle', .1); scene.addScore(300, e.x, e.y - 40);
      defeat(scene, e, [[0, 7], [180, 8], [420, 9]], 900);
    }
  },

  // Imata: camina, se prepara y embiste; al tocarlo empuja en vez de dañar
  imata: {
    spawn(scene, x, floor = GROUND_Y) {
      const e = scene.enemies.create(x, floor - 32, 'imata', 0);
      e.body.setSize(24, 52).setOffset(14, 12); e.play('imata-walk');
      e.speed = 38; e.state = 'walk'; e.until = 0; e.nextCharge = 0; e.pushCD = 0;
      return e;
    },
    update(scene, e, time) {
      const p = scene.player, dx = p.x - e.x;
      const near = Math.abs(dx) < 300 && Math.abs(p.y - e.y) < 90 && !scene.dead;
      if (!e.nextCharge) e.nextCharge = time + 700;
      switch (e.state) {
        case 'walk':
          if (near && time > e.nextCharge && e.body.blocked.down) {
            e.state = 'wind'; e.until = time + 450; e.dir = Math.sign(dx) || -1;
            e.anims.stop(); e.setFrame(13); e.setVelocityX(0); e.setFlipX(e.dir < 0);
            sfx(120, 260, .35, 'sawtooth', .05);
            return;
          }
          turnAtEdge(scene, e);
          e.setVelocityX(e.speed * e.dir); e.setFlipX(e.dir < 0);
          break;
        case 'wind':
          e.setVelocityX(0);
          if (time > e.until) { e.state = 'charge'; e.until = time + 1500; e.play('imata-run'); }
          break;
        case 'charge': {
          e.setVelocityX(260 * e.dir); e.setFlipX(e.dir < 0);
          const wx = Math.floor((e.x + e.dir * 16) / TS), wy = Math.floor(e.body.center.y / TS);
          if (time > e.until || scene.blocks[wx + ',' + wy]) imataRest(e, time);
          break;
        }
        case 'rest':
          e.setVelocityX(0);
          if (time > e.until) { e.state = 'walk'; e.play('imata-walk'); e.nextCharge = time + 1600; }
          break;
      }
    },
    stomp(scene, e) {
      SND.stomp(); scene.addScore(250, e.x, e.y - 40);
      defeat(scene, e, [[0, 14], [200, 15], [500, 16]], 1000);
    },
    touch(scene, e) { push(scene, e); return true; }
  }
};

// crear los enemigos del nivel (desde el punto de control solo los que estén más adelante)
// [columna, tipo, fila de la superficie (15 = suelo; en el cerro, la de cada nivel)]
export function spawnEnemies(scene, L, fromTile = 0) {
  L.enemies.forEach(([tx, kind, row = 15]) => {
    if (tx < fromTile) return;
    const e = KINDS[kind].spawn(scene, tx * TS + 16, row * TS);
    e.kind = kind; e.awake = false; e.body.enable = false; e.setDepth(8);
  });
}

// refuerzo que cae del cielo (pelea con el jefe): ya despierto y caminando en la dirección dada
export function dropEnemy(scene, kind, x, dir, floor) {
  const e = KINDS[kind].spawn(scene, x, floor);
  e.kind = kind; e.awake = true; e.dir = dir; e.setDepth(8);
  e.dropsOff = true;  // si cae sobre una plataforma, camina hasta el borde y baja al suelo
  e.y = floor - 480 - Math.random() * 60; e.body.reset(e.x, e.y);
  return e;
}

export function updateEnemies(scene, time) {
  const camRight = scene.cameras.main.scrollX + GW;
  scene.enemies.getChildren().slice().forEach(e => {
    // despiertan al entrar en pantalla
    if (!e.awake && e.x < camRight + 48) { e.awake = true; e.body.enable = true; e.dir = -1; }
    if (!e.awake || e.dead) return;
    if (!scene.running) { e.setVelocityX(0); return; }
    if (e.body.blocked.left) e.dir = 1; else if (e.body.blocked.right) e.dir = -1;
    KINDS[e.kind].update(scene, e, time);
    if (e.y > GH + 100) e.destroy();
  });
}

// el jugador cayó encima
export function stompEnemy(scene, e) {
  e.dead = true; e.body.enable = false; e.anims.stop();
  KINDS[e.kind].stomp(scene, e);
}

// el jugador lo tocó de costado; devuelve true si el enemigo maneja el contacto (sin daño)
export function touchEnemy(scene, e) {
  return KINDS[e.kind].touch ? KINDS[e.kind].touch(scene, e) : false;
}

// golpe desde abajo (bloque golpeado con la cabeza)
export function flipEnemy(scene, e) {
  e.dead = true; SND.stomp(); scene.addScore(100, e.x, e.y - 20);
  e.setFlipY(true); e.anims.stop(); e.body.checkCollision.none = true; e.setVelocity(60, -380);
  e.body.setAllowGravity(true);  // los voladores (nivel 2) no tienen gravedad: al morir caen
  scene.time.delayedCall(1500, () => e.destroy());
}
