import Phaser from 'phaser';
import { GW, GH } from '../config.js';
import { sfx } from '../audio.js';
import { flipEnemy } from './enemies.js';

/* ---------- enemigos voladores del nivel 2 ----------
 * Todos se dibujan mirando a la derecha (salvo el Amaru), así que se voltean para ir hacia Xoxur (a la izquierda).
 * Sus proyectiles van al grupo scene.balls con o.dmg (energía que quitan).
 *  condor:      cóndor zombi; vuela ondulando hacia la izquierda y escupe saliva corrosiva apuntando a Xoxur
 *  condorCarga: vuela alto y, al pasar sobre Xoxur, suelta a la zombi andina (cae)
 *  harpia:      harpía guerrera; se queda en el lado derecho de la pantalla y se lanza en picada contra Xoxur (2 golpes)
 *  cuyVolador:  cuy zombi volador; avanza tambaleando y lanza galletas de menta rectas
 *  chocloRad:   choclo zombi radiactivo (antes del jefe); flota a la derecha y lanza hachas a Xoxur (3 golpes) */
export const FLYER_DMG = { saliva: 15, zombi: 20, galleta: 10, hacha: 15 };
// los cóndores se dibujan más grandes: 1,5 veces Inkaxur volando (pedido del usuario)
const CONDOR_SCALE = 1.6;
const SCORE = { condor: 200, condorCarga: 300, harpia: 500, cuyVolador: 200, chocloRad: 800 };

const shoot = (s, key, frame, x, y, vx, vy, dmg, anim) => {
  const o = s.balls.create(x, y, key, frame).setDepth(9);
  o.body.setAllowGravity(false); o.setVelocity(vx, vy); o.dmg = dmg;
  if (anim) o.play(anim);
  return o;
};
// velocidad para ir de (x, y) hacia Xoxur
const aim = (s, x, y, speed) => {
  const p = s.player, dx = p.x - x, dy = p.body.center.y - y, d = Math.hypot(dx, dy) || 1;
  return [dx / d * speed, dy / d * speed];
};
// lugar de espera en el lado derecho de la pantalla (harpía y choclo)
const hoverX = (s, off) => s.cameras.main.scrollX + GW - off;

export const FLYERS = {
  condor: {
    spawn(s, x, y) {
      const e = s.enemies.create(x, y, 'condor', 0).play('condor-fly').setFlipX(true).setScale(CONDOR_SCALE);
      e.body.setSize(62, 40).setOffset(20, 30);  // (en píxeles de la lámina: se escala con el sprite)
      e.setVelocityX(-140); e.hp = 1; e.nextShot = s.time.now + 900 + Math.random() * 900;
      return e;
    },
    update(s, e, time) {
      e.body.velocity.y = Math.cos((time - e.t0) / 480) * 80;
      if (time > e.nextShot && e.x > s.player.x + 80 && e.x < s.cameras.main.scrollX + GW - 20) {
        e.nextShot = time + 2400;
        e.anims.stop(); e.setFrame(14);
        s.time.delayedCall(260, () => {
          if (!e.active || e.dead) return;
          e.setFrame(15);
          const mx = e.x - 34 * CONDOR_SCALE;  // el pico
          const [vx, vy] = aim(s, mx, e.y, 290);
          shoot(s, 'saliva', 0, mx, e.y, vx, vy, FLYER_DMG.saliva).setFlipX(vx < 0);
          sfx(220, 90, .18, 'sawtooth', .05);
          s.time.delayedCall(200, () => e.active && !e.dead && e.play('condor-fly'));
        });
      }
    }
  },

  condorCarga: {
    spawn(s, x, y) {
      const e = s.enemies.create(x, y, 'condorCarga', 0).play('carga-fly').setFlipX(true).setScale(CONDOR_SCALE);
      e.body.setSize(60, 56).setOffset(16, 12);
      e.setVelocityX(-170); e.hp = 1; e.loaded = true;
      return e;
    },
    update(s, e) {
      if (!e.loaded || e.x - s.player.x > 30 || e.x > s.cameras.main.scrollX + GW) return;
      e.loaded = false; e.anims.stop(); e.setFrame(2);
      s.time.delayedCall(180, () => {
        if (!e.active || e.dead) return;
        e.setFrame(3);
        const z = shoot(s, 'zombiAndina', 0, e.x, e.y + 34 * CONDOR_SCALE, -40, 60, FLYER_DMG.zombi, 'zombi-cae');
        z.body.setAllowGravity(true); z.body.setGravityY(-900);  // cae más lento que la gravedad del mundo
        sfx(300, 120, .2, 'triangle', .06);
        s.time.delayedCall(220, () => { if (e.active && !e.dead) { e.setFrame(4); e.setVelocityY(-70); } });
      });
    }
  },

  harpia: {
    spawn(s, x, y) {
      const e = s.enemies.create(x, y, 'harpia', 10).play('harpia-fly').setFlipX(true);
      e.body.setSize(50, 56).setOffset(18, 20);
      e.hp = 2; e.state = 'enter'; e.until = 0; e.dives = 0; e.hoverOff = 150 + Math.random() * 60; e.homeY = y;
      return e;
    },
    update(s, e, time) {
      const hx = hoverX(s, e.hoverOff);
      if (e.state === 'enter' || e.state === 'back') {
        const dx = hx - e.x, dy = e.homeY - e.y, d = Math.hypot(dx, dy);
        if (d < 12) { e.state = 'hover'; e.until = time + 1400 + Math.random() * 600; e.setVelocity(0, 0); e.play('harpia-fly', true); }
        else e.setVelocity(dx / d * 300, dy / d * 300);
        e.setFlipX(true);
      } else if (e.state === 'hover') {
        e.setVelocity(s.player.body.velocity.x > 0 ? 60 : 0, Math.sin(time / 260) * 40);
        if (time > e.until) {
          if (e.dives >= 3) { e.state = 'leave'; e.setVelocity(-420, -120); return; }
          e.state = 'dive'; e.dives++; e.until = time + 900;
          e.anims.stop(); e.setFrame(15);
          const [vx, vy] = aim(s, e.x, e.y, 440);
          s.time.delayedCall(180, () => { if (e.active && !e.dead) { e.setFrame(16); e.setVelocity(vx, vy); e.setFlipX(vx < 0); } });
          sfx(500, 200, .2, 'sawtooth', .05);
        }
      } else if (e.state === 'dive') {
        if (Math.abs(e.x - s.player.x) < 60) e.setFrame(17);
        if (time > e.until) { e.state = 'back'; e.play('harpia-fly', true); }
      }
    }
  },

  cuyVolador: {
    spawn(s, x, y) {
      const e = s.enemies.create(x, y, 'cuyVolador', 2).play('cuyv-fly').setFlipX(true);
      e.body.setSize(44, 26).setOffset(14, 9);
      e.setVelocityX(-110); e.hp = 1; e.nextShot = s.time.now + 700 + Math.random() * 1200;
      return e;
    },
    update(s, e, time) {
      e.body.velocity.y = Math.sin((time - e.t0) / 160) * 70;  // tambaleo
      if (time > e.nextShot && e.x > s.player.x + 60 && e.x < s.cameras.main.scrollX + GW - 10) {
        e.nextShot = time + 2200;
        e.anims.stop(); e.setFrame(32);
        s.time.delayedCall(200, () => {
          if (!e.active || e.dead) return;
          e.setFrame(33);
          shoot(s, 'cuyProy', 0, e.x - 26, e.y, -320, 0, FLYER_DMG.galleta).setAngularVelocity(-500);
          sfx(700, 350, .1, 'square', .04);
          s.time.delayedCall(200, () => e.active && !e.dead && e.play('cuyv-fly'));
        });
      }
    }
  },

  chocloRad: {
    spawn(s, x, y) {
      const e = s.enemies.create(x, y, 'chocloRad', 0).play('choclo-fly').setFlipX(true);
      e.body.setSize(44, 56).setOffset(40, 58);
      e.hp = 3; e.state = 'enter'; e.hoverOff = 170 + Math.random() * 80; e.homeY = y; e.nextShot = s.time.now + 1500;
      return e;
    },
    update(s, e, time) {
      const hx = hoverX(s, e.hoverOff);
      e.setVelocity((hx - e.x) * 2.5, (e.homeY + Math.sin(time / 420) * 50 - e.y) * 2.5);
      if (time > e.nextShot && e.x < s.cameras.main.scrollX + GW - 40) {
        e.nextShot = time + 2000 + Math.random() * 600;
        e.anims.stop(); e.setFrame(20);
        s.time.delayedCall(250, () => {
          if (!e.active || e.dead) return;
          e.setFrame(21);
          const [vx, vy] = aim(s, e.x - 30, e.y - 10, 330);
          shoot(s, 'chocloHacha', 0, e.x - 30, e.y - 10, vx, vy, FLYER_DMG.hacha, 'hacha-gira');
          sfx(300, 700, .18, 'sawtooth', .05);
          s.time.delayedCall(250, () => { if (e.active && !e.dead) { e.setFrame(22); s.time.delayedCall(200, () => e.active && !e.dead && e.play('choclo-fly')); } });
        });
      }
    }
  }
};

export function spawnFlyer(s, kind, x, y) {
  const e = FLYERS[kind].spawn(s, x, y);
  e.kind = kind; e.dead = false; e.awake = true; e.t0 = s.time.now; e.setDepth(8);
  e.body.setAllowGravity(false);
  return e;
}

export function updateFlyers(s, time, dt) {
  const left = s.cameras.main.scrollX - 200;
  s.enemies.getChildren().slice().forEach(e => {
    if (e.dead) return;
    if (e.x < left || e.y > GH + 120 || e.y < -200) { e.destroy(); return; }
    FLYERS[e.kind].update(s, e, time, dt);
  });
  s.balls.getChildren().slice().forEach(o => {
    if (o.x < left || o.x > s.cameras.main.scrollX + GW + 200 || o.y > GH + 60 || o.y < -120) o.destroy();
  });
}

// golpe de un proyectil de Inkaxur: resta vida y, si llega a 0, cae dando vueltas
export function hitFlyer(s, e, n) {
  if (e.dead) return;
  e.hp -= n;
  if (e.hp > 0) {
    e.setTintFill(0xffffff); s.time.delayedCall(80, () => e.active && e.clearTint());
    sfx(260, 140, .08, 'square', .05);
    return;
  }
  flipEnemy(s, e);
  e.setAngularVelocity(Phaser.Math.Between(-300, 300));
  s.addScore(SCORE[e.kind] || 100, e.x, e.y - 30);
}
