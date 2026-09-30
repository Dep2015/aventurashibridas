import Phaser from 'phaser';
import { SND, sfx } from '../audio.js';
import { FOES4, BOSSES4 } from '../level4.js';

/* ---------- enemigos y jefes del nivel 4 (vista desde arriba, tiempo real) ----------
 * Todos los enemigos miran a la derecha en su hoja: flipX cuando miran a la izquierda.
 * La escena (Cusco.js) tiene: foes (grupo), foeShots (proyectiles enemigos), player, hurt(n, src), grid, etc. */

// animaciones de los enemigos, los jefes y los personajes del nivel 4
export function createAnims4(scene) {
  const mk = (key, sheet, [a, b], rate, repeat = -1, yoyo = false) => {
    if (scene.anims.exists(key) || !scene.textures.exists(sheet)) return;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(sheet, { start: a, end: b }), frameRate: rate, repeat, yoyo });
  };
  const loop = ['idle', 'walk', 'orb', 'ball'];
  for (const k in FOES4) { const f = FOES4[k]; for (const a in f.fr) mk(`${k}-${a}4`, f.sheet, f.fr[a], a === 'walk' ? 10 : a === 'idle' ? 6 : 12, loop.includes(a) ? -1 : 0); }
  for (const k in BOSSES4) { const f = BOSSES4[k]; for (const a in f.fr) mk(`${k}-${a}4`, f.sheet, f.fr[a], a === 'walk' ? 8 : a === 'idle' ? 6 : 10, loop.includes(a) ? -1 : 0); }
  mk('bola-fuego4', 'bolaFuego4', [0, 1], 10); mk('orbe4', 'orbe4', [0, 1], 8);
  mk('fantasma-idle4', 'fantasma4', [0, 3], 7); mk('fantasma-rush4', 'fantasma4', [4, 7], 10); mk('fantasma-boom4', 'fantasma4', [8, 12], 14, 0);
  mk('paqo-idle4', 'npcs4', [0, 2], 3, -1, true); mk('paqo-talk4', 'npcs4', [3, 5], 5, -1, true);
  mk('nusta-idle4', 'npcs4', [6, 8], 3, -1, true); mk('runa-idle4', 'npcs4', [9, 11], 3, -1, true);
}

/* ---------- enemigos comunes ---------- */
export function spawnFoe(scene, kind, x, y, extra = {}) {
  const c = FOES4[kind];
  const first = (c.fr.idle || c.fr.walk)[0];
  const e = scene.physics.add.sprite(x, y, c.sheet, first).setOrigin(.5, .95).setScale(c.scale);
  scene.foes.add(e);
  const r = Math.min(e.width, e.height) * .2;
  e.body.setCircle(r, e.width / 2 - r, e.height * .95 - r * 2);
  Object.assign(e, { kind, cfg: c, hp: c.hp, max: c.hp, dead: false, facing: 1, state: 'wander', until: 0, stunUntil: 0, knockUntil: 0,
    nextShot: scene.time.now + 1200 + Math.random() * 1500, nextAtk: 0, recoverUntil: 0, turnAt: 0, home: { x, y }, ...extra });
  e.play(`${kind}-${c.fr.idle ? 'idle' : 'walk'}4`);
  if (c.ghost) {
    // fantasma: flota atravesando muros y casas, semitransparente y titilando
    e.ghost = true; e.setAlpha(0);
    scene.tweens.add({ targets: e, alpha: { from: .55, to: .9 }, duration: 700, yoyo: true, repeat: -1 });
    return e;
  }
  e.setAlpha(0); scene.tweens.add({ targets: e, alpha: 1, duration: 300 });
  return e;
}

const face = (e, dx, time, slow) => {
  const want = dx < 0 ? -1 : 1;
  if (want !== e.facing && (!slow || time > e.turnAt)) { e.facing = want; e.turnAt = time + 650; }
  e.setFlipX(e.facing < 0);
};

export function updateFoes(scene, time) {
  const p = scene.player;
  scene.foes.getChildren().forEach(e => {
    if (e.dead) return;
    e.setDepth(e.y);
    const c = e.cfg, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (time < e.knockUntil) return;
    if (time < e.stunUntil || e.state === 'attack') { if (e.state !== 'attack') e.setVelocity(0, 0); return; }
    if (e.ghost) return updateGhost(scene, e, dx, dy, d, time);
    const walkAnim = `${e.kind}-walk4`;
    if ((d < c.aggro || e.hunt) && !scene.dead) {
      // persigue (los que atacan de lejos guardan distancia y rodean). Lejos, sigue el mapa de distancias de la
      // escena (rodea muros y casas) en vez de ir en línea recta
      let vx = dx / d * c.speed, vy = dy / d * c.speed;
      const step = d > (c.keep ? c.keep + 80 : 80) && scene.flowStep?.(e.x, e.y - 8);
      if (step) { const sx = step.x - e.x, sy = step.y - (e.y - 8), sd = Math.hypot(sx, sy) || 1; vx = sx / sd * c.speed; vy = sy / sd * c.speed; }
      if (c.keep && d < c.keep) { vx = -vx * .6; vy = -vy * .6; }
      else if (c.keep && d < c.keep + 70) { vx = -dy / d * c.speed * .7; vy = dx / d * c.speed * .7; }
      e.setVelocity(vx, vy); face(e, dx, time, c.shield);
      if (e.anims.currentAnim?.key !== walkAnim) e.play(walkAnim);
      // ataques
      if (c.shot && time > e.nextShot && d < 440) return castOrb(scene, e, time);
      if (c.thrust && time > e.nextAtk && d < c.thrust.range + 14 && Math.abs(dy) < 40) return thrust(scene, e, time);
      if (c.sling && time > e.nextShot && d > 190 && d < 430) return sling(scene, e, time);
      if (c.melee && time > e.nextAtk && d < c.melee.range) return melee(scene, e, time);
      if (c.spit && time > e.nextShot && d > 120 && d < 320) return spit(scene, e, time);
    } else {
      // deambula cerca de donde apareció
      if (time > e.until) {
        e.until = time + 1200 + Math.random() * 1800;
        const a = Math.random() * Math.PI * 2, back = Phaser.Math.Distance.Between(e.x, e.y, e.home.x, e.home.y) > 140;
        const tx = back ? e.home.x : e.x + Math.cos(a) * 80, ty = back ? e.home.y : e.y + Math.sin(a) * 80;
        if (Math.random() < .35 && !back) { e.setVelocity(0, 0); if (c.fr.idle) e.play(`${e.kind}-idle4`, true); }
        else { scene.physics.moveTo(e, tx, ty, c.speed * .5); face(e, tx - e.x, time); e.play(walkAnim, true); }
      }
    }
  });
}

// fantasma inca: flota hacia Inkaxur (más rápido de cerca) y al tocarlo explota
function updateGhost(scene, e, dx, dy, d, time) {
  if (e.state === 'boom' || scene.dead) { e.setVelocity(0, 0); return; }
  const c = e.cfg, sp = d < 220 ? c.rush : c.speed;
  e.setVelocity(dx / d * sp, dy / d * sp + Math.sin(time / 260 + e.x) * 18);
  e.facing = dx < 0 ? -1 : 1; e.setFlipX(e.facing < 0);
  const anim = d < 220 ? 'fantasma-rush4' : 'fantasma-idle4';
  if (e.anims.currentAnim?.key !== anim) e.play(anim);
  if (d < 46) ghostBoom(scene, e, true);
}

// el fantasma explota: si fue al tocar a Inkaxur hace daño alrededor (rodar lo esquiva); si lo golpearon, solo se deshace
export function ghostBoom(scene, e, harm) {
  if (e.state === 'boom') return;
  e.state = 'boom'; e.dead = true; e.body.enable = false; e.setVelocity(0, 0);
  scene.tweens.killTweensOf(e); e.setAlpha(1).setScale(e.scaleX * (harm ? 1.5 : 1.1)).setDepth(4000);
  e.play('fantasma-boom4');
  const x = e.x, y = e.y - 30, c = e.cfg;
  if (harm) {
    const ring = scene.add.circle(x, y, c.boom.r, 0x9ff6ff, .35).setDepth(3999).setBlendMode(Phaser.BlendModes.ADD).setScale(.3);
    scene.tweens.add({ targets: ring, scale: 1.2, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
    scene.cameras.main.shake(220, .01); sfx(120, 40, .5, 'sawtooth', .09); sfx(900, 200, .3, 'square', .05);
    if (Phaser.Math.Distance.Between(x, y, scene.player.x, scene.player.y - 20) < c.boom.r + 20) scene.hurt(c.boom.dmg, { x, y }, 320, true);
  } else sfx(700, 1400, .2, 'triangle', .05);
  e.once('animationcomplete', () => e.destroy());
  scene.time.delayedCall(900, () => e.active && e.destroy());
  scene.onFoeDead(e, !harm);
}

// ataque con animación: `hitAt` ms después se resuelve el golpe; al terminar vuelve a moverse
function attack(scene, e, time, anim, hitAt, total, onHit) {
  e.state = 'attack'; e.setVelocity(0, 0);
  e.play(anim);
  scene.time.delayedCall(hitAt, () => { if (!e.dead && e.active) onHit(); });
  scene.time.delayedCall(total, () => { if (e.dead || !e.active) return; e.state = 'chase'; });
}

function castOrb(scene, e, time) {
  const c = e.cfg; e.nextShot = time + c.shot.every + Math.random() * 800;
  attack(scene, e, time, `${e.kind}-atk4`, 330, 520, () => {
    const p = scene.player;
    const o = headShot(scene, 'orbe4', 'orbe4', e.x + e.facing * 30, e.y - 40, p.x, p.y - 24, c.shot.speed);
    o.dmg = c.shot.dmg;
    scene.time.delayedCall(2800, () => o.active && o.destroy());
    sfx(300, 120, .25, 'triangle', .06);
  });
}

function thrust(scene, e, time) {
  const c = e.cfg; e.nextAtk = time + 1500 + Math.random() * 700;
  e.setTint(0xff9a8a); scene.time.delayedCall(260, () => e.active && e.clearTint());
  attack(scene, e, time, `${e.kind}-atk4`, 300, 560, () => {
    const p = scene.player, dx = p.x - e.x;
    if (Math.sign(dx) === e.facing && Math.abs(dx) < c.thrust.range + 20 && Math.abs(p.y - e.y) < 40) scene.hurt(c.thrust.dmg, e);
    sfx(420, 160, .12, 'sawtooth', .05);
    e.recoverUntil = scene.time.now + 700;  // después de atacar queda descubierto
  });
}

function sling(scene, e, time) {
  const c = e.cfg; e.nextShot = time + c.sling.every + Math.random() * 900;
  const p = scene.player;
  const o = scene.physics.add.image(e.x + e.facing * 20, e.y - 44, 'piedra4').setDepth(3000);
  scene.foeShots.add(o); o.body.setCircle(6); o.dmg = c.sling.dmg;
  scene.physics.moveTo(o, p.x, p.y - 24, c.sling.speed);
  scene.time.delayedCall(2200, () => o.active && o.destroy());
  sfx(700, 300, .1, 'square', .03);
}

function melee(scene, e, time) {
  const c = e.cfg; e.nextAtk = time + 1400 + Math.random() * 600;
  const anim = c.fr.bag && Math.random() < .5 ? 'bag' : 'atk';  // la imata a veces revolea la bolsa
  attack(scene, e, time, `${e.kind}-${anim}4`, 260, 480, () => {
    const p = scene.player;
    if (Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) < c.melee.range + 16 && Math.sign(p.x - e.x) === e.facing) scene.hurt(c.melee.dmg, e);
  });
}

function spit(scene, e, time) {
  const c = e.cfg; e.nextShot = time + c.spit.every + Math.random() * 900;
  attack(scene, e, time, `${e.kind}-spit4`, 300, 520, () => {
    const p = scene.player;
    const o = scene.add.circle(e.x + e.facing * 34, e.y - 40, 8, 0x9dff6a, .95).setDepth(3000);
    scene.physics.add.existing(o); scene.foeShots.add(o); o.body.setCircle(8); o.dmg = c.spit.dmg;
    scene.physics.moveTo(o, p.x, p.y - 24, 300);
    scene.time.delayedCall(2200, () => o.active && o.destroy());
  });
}

// proyectil con cabeza y cola (bola de fuego, orbe): el origen y el cuerpo van en la cabeza, girado hacia donde va
function headShot(scene, sheet, anim, x, y, tx, ty, speed) {
  const o = scene.physics.add.sprite(x, y, sheet, 0).play(anim).setDepth(3000);
  const w = o.width, h = o.height, r = h * .42;
  o.setOrigin((w - h / 2) / w, .5);
  o.body.setCircle(r, w - h / 2 - r, h / 2 - r);
  scene.foeShots.add(o);
  const a = Phaser.Math.Angle.Between(x, y, tx, ty);
  o.setRotation(a); o.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
  return o;
}

// golpe a un enemigo común. `src` = de dónde viene el golpe (para el escudo y el empujón). Devuelve false si lo bloqueó.
export function hurtFoe(scene, e, n, src) {
  if (e.dead) return false;
  if (e.ghost) { e.hp -= n; scene.damageText(e, n); if (e.hp <= 0) ghostBoom(scene, e, false); else { e.setTintFill(0xffffff); scene.time.delayedCall(70, () => e.active && e.clearTint()); } return true; }
  const time = scene.time.now, c = e.cfg;
  // el guerrero se cubre con el escudo si el golpe viene de frente y no está atacando ni recuperándose
  if (c.shield && e.state !== 'attack' && time > e.recoverUntil && time > e.stunUntil && Math.sign(src.x - e.x) === e.facing) {
    e.anims.stop(); e.setFrame(c.fr.block[0]);
    scene.time.delayedCall(200, () => e.active && !e.dead && e.setFrame(c.fr.block[1]));
    scene.spark(e.x + e.facing * 26, e.y - 44);
    sfx(1200, 900, .08, 'square', .05); sfx(600, 500, .12, 'triangle', .04);
    return false;
  }
  e.hp -= n;
  scene.damageText(e, n);
  e.setTintFill(0xffffff); scene.time.delayedCall(70, () => e.active && e.clearTint());
  // empujón
  const a = Phaser.Math.Angle.Between(src.x, src.y, e.x, e.y);
  e.setVelocity(Math.cos(a) * 240, Math.sin(a) * 240); e.knockUntil = time + 150; e.state = 'chase';
  if (e.hp > 0) {
    if (c.fr.hit) { e.play(`${e.kind}-hit4`); scene.time.delayedCall(220, () => { if (e.active && !e.dead) e.play(`${e.kind}-walk4`); }); }
    sfx(260, 140, .08, 'square', .05);
    return true;
  }
  // cae
  e.dead = true; e.body.enable = false; e.setVelocity(0, 0); SND.stomp();
  if (c.fr.ko) e.play(`${e.kind}-ko4`); else e.setTint(0x777777);
  scene.tweens.add({ targets: e, alpha: 0, delay: 900, duration: 500, onComplete: () => e.destroy() });
  scene.onFoeDead(e);
  return true;
}

/* ---------- jefes ---------- */
export class Boss4 {
  constructor(scene, kind, x, y) {
    const c = this.cfg = BOSSES4[kind];
    this.scene = scene; this.kind = kind;
    const s = this.sprite = scene.physics.add.sprite(x, y, c.sheet, 0).setOrigin(.5, .96).setScale(c.scale);
    s.body.setSize(c.body[0] / c.scale, c.body[1] / c.scale).setOffset(s.width / 2 - c.body[0] / c.scale / 2, s.height * .96 - c.body[1] / c.scale);
    s.body.setImmovable(true); s.body.setCollideWorldBounds(true);
    s.play(`${kind}-idle4`);
    this.hp = this.max = c.hp; this.alive = true; this.state = 'intro'; this.until = scene.time.now + 1600;
    this.phase = 0; this.invuln = false; this.stunUntil = 0; this.vulnUntil = 0; this.facing = -1;
    s.boss = this;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time) {
    if (!this.alive) return;
    const s = this.sprite, p = this.scene.player, dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1;
    s.setDepth(s.y);
    if (time < this.stunUntil) { s.setVelocity(0, 0); return; }
    if (this.state === 'intro') { if (time > this.until) { this.state = 'walk'; this.until = time + 1800; } return; }
    if (this.state === 'walk') {
      const sp = (this.kind === 'supay' ? 72 : 64) * (this.phase >= 2 ? 1.25 : 1);
      s.setVelocity(dx / d * sp, dy / d * sp);
      this.facing = dx < 0 ? -1 : 1; s.setFlipX(this.facing < 0);
      if (s.anims.currentAnim?.key !== `${this.kind}-walk4`) s.play(`${this.kind}-walk4`);
      if (time > this.until) { s.setVelocity(0, 0); this.kind === 'supay' ? this.supayAttack(time, d) : this.pachaAttack(time, d); }
    } else if (this.state === 'charge') {
      // Pachacútec embiste
      if (time > this.until) { s.setVelocity(0, 0); this.rest(time, 900); }
    } else if (time > this.until) this.rest(time, 1400 + Math.random() * 800 - this.phase * 250);
  }

  rest(time, ms) { this.state = 'walk'; this.until = time + ms; this.invuln = false; }

  /* ----- Supay: bolas de fuego, invocar mallquis del Uku Pacha, pisotón ----- */
  supayAttack(time, d) {
    const s = this.sprite, sc = this.scene, c = this.cfg;
    const pick = d < 140 ? 'stomp' : (this.phase >= 1 && sc.foes.getChildren().filter(e => !e.dead).length < 3 && Math.random() < .35) ? 'summon' : 'fire';
    this.state = pick;
    if (pick === 'fire') {
      this.until = time + 1300;
      s.play('supay-fire4');
      sc.time.delayedCall(420, () => {
        if (!this.alive || time < 0) return;
        const p = sc.player, n = this.phase >= 2 ? 5 : 3, base = Phaser.Math.Angle.Between(s.x, s.y - 70, p.x, p.y - 24);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * .22;
          const o = headShot(sc, 'bolaFuego4', 'bola-fuego4', s.x + this.facing * 60, s.y - 70, s.x + this.facing * 60 + Math.cos(a) * 100, s.y - 70 + Math.sin(a) * 100, 290);
          o.dmg = 14; o.fire = true;
          sc.time.delayedCall(3200, () => o.active && o.destroy());
        }
        sfx(180, 60, .4, 'sawtooth', .07);
      });
    } else if (pick === 'summon') {
      // llamas verdes del Uku Pacha: mientras invoca no se le puede dañar
      this.until = time + 2200; this.invuln = true;
      s.play('supay-summon4');
      sc.hud.banner('¡Supay llama a los mallquis!', '#9dff6a');
      sc.time.delayedCall(900, () => { if (!this.alive) return; [[-160, 60], [160, 60]].forEach(([ox, oy]) => sc.spawnFoeAt('mallqui', s.x + ox, s.y + oy)); });
    } else {
      this.until = time + 1400;
      s.play('supay-idle4');
      this.ring(150, 650, 18);
    }
  }

  /* ----- Pachacútec: golpe de maza, salto con onda de choque, embestida, llama guerreros ----- */
  pachaAttack(time, d) {
    const s = this.sprite, sc = this.scene, p = sc.player;
    const pick = d < 150 ? 'swing' : (this.phase >= 2 && Math.random() < .4) ? 'charge' : 'slam';
    this.state = pick;
    if (pick === 'swing') {
      this.until = time + 1300;
      s.anims.stop(); s.setFrame(this.cfg.fr.swing[0]); s.setTint(0xffe08a);
      sc.time.delayedCall(380, () => {
        if (!this.alive) return;
        s.clearTint(); s.play('pachacutec-swing4');
        sc.time.delayedCall(200, () => {
          if (!this.alive) return;
          const dx = p.x - s.x, dd = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
          if (dd < 150 && (Math.sign(dx) === this.facing || Math.abs(dx) < 30)) sc.hurt(20, s, 260);
          sc.cameras.main.shake(120, .004); sfx(200, 80, .2, 'sawtooth', .06);
        });
      });
    } else if (pick === 'slam') {
      // salta hasta donde está Inkaxur (la sombra marca dónde cae) y golpea el suelo
      this.until = time + 2600;
      const tx = p.x, ty = p.y;
      const mark = sc.add.ellipse(tx, ty, 150, 54, 0xff5a4a, .25).setStrokeStyle(3, 0xff5a4a).setDepth(1);
      s.play('pachacutec-slam4'); s.body.enable = false;
      sc.tweens.add({ targets: s, x: tx, y: ty, duration: 720, ease: 'Sine.inOut' });
      sc.tweens.add({ targets: s, scaleX: s.scaleX * 1.12, scaleY: s.scaleY * 1.12, yoyo: true, duration: 360 });
      sc.time.delayedCall(740, () => {
        mark.destroy(); if (!this.alive) return;
        s.body.enable = true; s.body.reset(s.x, s.y);
        this.ring(180, 1, 18, 0xffd84a);
        sc.cameras.main.shake(300, .01); SND.stomp();
        // la maza queda clavada: un momento para pegarle (hace el doble de daño)
        this.vulnUntil = sc.time.now + 1300;
        sc.hud.popup('¡Ahora!', s.x, s.y - 170);
      });
    } else {
      this.until = time + 650; this.state = 'charge';
      const a = Phaser.Math.Angle.Between(s.x, s.y, p.x, p.y);
      s.setTint(0xff8a7a); sc.time.delayedCall(300, () => s.active && s.clearTint());
      sc.time.delayedCall(300, () => { if (this.alive) { s.setVelocity(Math.cos(a) * 520, Math.sin(a) * 520); s.play('pachacutec-walk4'); } });
    }
  }

  // onda de choque (anillo): aviso y luego daño a quien esté dentro (rodar la esquiva)
  ring(r, warn, dmg, color = 0xff5a4a) {
    const sc = this.scene, s = this.sprite, x = s.x, y = s.y - 10;
    const g = sc.add.circle(x, y, r, color, .15).setStrokeStyle(4, color).setDepth(1).setScale(.25);
    sc.tweens.add({ targets: g, scale: 1, duration: warn });
    sc.time.delayedCall(warn, () => {
      if (!this.alive) { g.destroy(); return; }
      sc.tweens.add({ targets: g, alpha: 0, scale: 1.15, duration: 250, onComplete: () => g.destroy() });
      if (Phaser.Math.Distance.Between(x, y, sc.player.x, sc.player.y) < r) sc.hurt(dmg, s, 300, true);
      sc.cameras.main.shake(160, .006);
    });
  }

  // golpe al jefe: `mul` extra (reflejo de su propia bola, aturdido)
  hit(n, src) {
    if (!this.alive) return false;
    const sc = this.scene, s = this.sprite, now = sc.time.now;
    if (this.invuln) { sc.spark(s.x, s.y - 90); sc.hud.popup('¡Inmune!', s.x, s.y - 160); return false; }
    if (now < this.stunUntil || now < this.vulnUntil) n *= 2;
    this.hp = Math.max(0, this.hp - n);
    sc.damageText(s, n);
    s.setTintFill(0xffffff); sc.time.delayedCall(70, () => s.active && s.clearTint());
    sfx(220, 120, .1, 'square', .06);
    renderBossHp(this);
    if (this.hp <= 0) { this.die(); return true; }
    // fases: a los 2/3 y 1/3 de la vida se enoja (y Pachacútec llama guerreros)
    const phases = [.66, .33];
    while (this.phase < phases.length && this.hp / this.max <= phases[this.phase]) {
      this.phase++;
      sc.cameras.main.shake(300, .006);
      if (this.kind === 'pachacutec') {
        sc.hud.banner('¡Pachacútec llama a su guardia!', '#ffd84a');
        [[-220, 0], [220, 0]].forEach(([ox, oy]) => sc.spawnFoeAt('guerrero', s.x + ox, s.y + oy));
      } else sc.hud.banner('¡El Supay se enfurece!', '#ff8a7a');
    }
    return true;
  }

  // la Canción del Inti aturde al Supay (el Uku Pacha no soporta la luz del Sol)
  stun(ms) {
    if (!this.alive) return;
    const s = this.sprite;
    this.stunUntil = this.scene.time.now + ms; this.invuln = false; this.state = 'walk'; this.until = this.stunUntil + 600;
    s.setVelocity(0, 0); s.play(`${this.kind}-hit4`);
    this.scene.hud.popup('¡Aturdido!', s.x, s.y - 170);
  }

  die() {
    const sc = this.scene, s = this.sprite;
    this.alive = false; s.setVelocity(0, 0); s.body.enable = false;
    s.play(`${this.kind}-ko4`);
    sc.cameras.main.flash(400, 255, 230, 150); sc.cameras.main.shake(600, .012); SND.stomp();
    sc.tweens.add({ targets: s, alpha: 0, delay: 900, duration: 900 });
    sc.onBossDefeated(this);
  }
}

function renderBossHp(b) { b.scene.renderBossBar(b.hp, b.max); }
