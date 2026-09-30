import Phaser from 'phaser';
import { GW } from './config.js';
import { sfx } from './audio.js';
import { ITEMS, ITEM_FRAMES } from './items.js';
import { flipEnemy } from './entities/enemies.js';

// duración de los poderes temporales (ms)
const DURATION = { amuleto: 10000, taunt: 8000, gas: 6000, brujula: 15000, baston: 15000 };
const ORDER = ['amuleto', 'taunt', 'baston', 'plasma', 'gas', 'brujula'];
const THROW_CD = { galleta: 350, baston: 450, plasma: 600, cetro: 450 };

/* ---------- poderes y armas del jugador ----------
 * amuleto:  inmune al daño por 10 s (aura dorada)
 * taunt:    aura roja por 8 s: destruye todo lo que choca contigo
 * baston:   por 15 s lanzas el bastón (C): va y vuelve, atraviesa enemigos
 * plasma:   una esfera para lanzar (C): al explotar elimina a todos los enemigos en pantalla
 * gas:      mantener el salto en el aire te impulsa hacia arriba (6 s)
 * brujula:  atrae monedas y galletas cercanas (15 s)
 * Las galletas se lanzan siempre (C), sin límite.
 * cetro:    el báculo de Inka Locu (cubo de la cumbre): se lanza con V, va y vuelve como el bastón; no se pierde
 *           (lo lleva todo el nivel 2). */
export class Powers {
  constructor(scene) {
    this.scene = scene;
    this.until = {};
    this.plasma = 0;           // esferas de plasma listas para lanzar
    this.cetro = false;        // báculo de Inka Locu (V)
    this.aura = null; this.auraKind = null;
    this.nextPuff = 0; this.nextThrow = 0;
    this.shots = scene.physics.add.group({ allowGravity: false });
  }

  get now() { return this.scene.time.now; }

  has(k) { return k === 'plasma' ? this.plasma > 0 : (this.until[k] || 0) > this.now; }

  give(k) {
    const s = this.scene;
    if (k === 'plasma') { this.plasma++; return; }
    this.until[k] = this.now + DURATION[k];
    if (k === 'taunt') s.hud.banner('¡Venganza!', '#ff5a4a');
  }

  /* ---------- lanzar ---------- */
  // arma que se lanza con C: la esfera de plasma primero, luego el bastón y si no, una galleta
  throw() {
    const s = this.scene, p = s.player, now = this.now;
    if (now < this.nextThrow) return;
    const kind = this.plasma > 0 ? 'plasma' : this.has('baston') ? 'baston' : 'galleta';
    if (kind === 'baston' && this.shots.getChildren().some(o => o.kind === 'baston')) return;  // uno a la vez
    if (kind === 'galleta' && this.shots.getChildren().filter(o => o.kind === 'galleta').length >= 3) return;
    this.nextThrow = now + THROW_CD[kind];
    p.startThrow(now);
    if (kind === 'plasma') this.plasma--;
    // la galleta sale baja: alcanza a los enemigos chicos
    this.makeShot(kind, p.x + p.facing * 22, p.body.center.y + (kind === 'galleta' ? 6 : -4), p.facing);
  }

  // báculo de Inka Locu: se lanza con V (uno a la vez)
  giveCetro() { this.cetro = true; this.scene.hud.banner('¡Báculo de Inka Locu!', '#ffd84a'); }
  throwCetro() {
    const s = this.scene, p = s.player, now = this.now;
    if (!this.cetro || now < this.nextThrow || this.shots.getChildren().some(o => o.kind === 'cetro')) return;
    this.nextThrow = now + THROW_CD.cetro;
    p.startThrow(now);
    this.makeShot('cetro', p.x + p.facing * 22, p.body.center.y - 4, p.facing);
  }

  makeShot(kind, x, y, dir) {
    const o = kind === 'cetro'
      ? this.shots.create(x, y, 'baculo').setScale(.6).setDepth(11)
      : this.shots.create(x, y, 'items', ITEM_FRAMES[kind]).setDepth(11);
    o.kind = kind; o.dir = dir; o.born = this.now;
    if (kind === 'galleta' && this.scene.flying) {
      // en vuelo (nivel 2): la galleta de menta sale recta, girando
      o.setTexture('galletaMenta', 0).play('menta-spin'); o.body.setCircle(12, 4, 4);
      o.setVelocity(dir * 620, 0);
      sfx(700, 350, .1, 'square', .05);
    } else if (kind === 'galleta') {
      o.setScale(.7); o.body.setCircle(10, 10, 10);
      o.setVelocity(dir * 460, -60); o.setAngularVelocity(dir * 720);  // casi recto: ~300 px, a la altura de los enemigos chicos
      sfx(700, 350, .1, 'square', .05);
    } else if (kind === 'baston' || kind === 'cetro') {
      o.body.setSize(28, kind === 'cetro' ? 60 : 28); o.setVelocityX(dir * (kind === 'cetro' ? 580 : 520)); o.setAngularVelocity(dir * 1100);
      sfx(300, 700, .18, 'sawtooth', .05);
    } else {
      o.setBlendMode(Phaser.BlendModes.ADD); o.body.setCircle(14, 6, 6);
      o.setVelocity(dir * 380, -120); o.setAngularVelocity(dir * 400);
      sfx(200, 900, .3, 'triangle', .08);
    }
    return o;
  }

  // un proyectil del jugador tocó a un enemigo
  shotHitsEnemy(o, e) {
    if (!o.active || e.dead || !e.awake) return;
    if (o.kind === 'plasma') { this.explodePlasma(o); return; }
    flipEnemy(this.scene, e);
    if (o.kind === 'galleta') this.crumble(o);  // el bastón sigue de largo
  }

  shotHitsWall(o) {
    if (o.kind === 'galleta') this.crumble(o);
    else if (o.kind === 'plasma') this.explodePlasma(o);
    else if ((o.kind === 'baston' || o.kind === 'cetro') && !o.back) o.back = true;
  }

  crumble(o) {
    const s = this.scene;
    for (let i = 0; i < 4; i++) {
      const d = s.add.rectangle(o.x, o.y, 3, 3, i % 2 ? 0x8a5a2b : 0xd9a066).setDepth(30);
      s.tweens.add({ targets: d, x: o.x + Phaser.Math.Between(-16, 16), y: o.y + Phaser.Math.Between(-14, 10), alpha: 0, duration: 300, onComplete: () => d.destroy() });
    }
    o.destroy();
  }

  // la esfera explota: fuera todos los enemigos y proyectiles de la pantalla; al jefe le quita 1 vida
  explodePlasma(o) {
    const s = this.scene, cam = s.cameras.main, x = o.x, y = o.y;
    o.destroy();
    s.cameras.main.flash(300, 150, 255, 190); cam.shake(250, .01);
    sfx(120, 900, .5, 'sawtooth', .1);
    const ring = s.add.circle(x, y, 20, 0x7dffb0, .5).setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: ring, scale: 30, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    const left = cam.scrollX - 20, right = cam.scrollX + GW + 20;
    s.enemies.getChildren().slice().forEach(e => { if (e.awake && !e.dead && e.x > left && e.x < right) flipEnemy(s, e); });
    [s.balls, s.choclos, s.waves].forEach(g => g.clear(true, true));
    s.boss?.damage(20 * s.throwMul());  // Inkaxur: el doble
  }

  sparkle(x, y) {
    const s = this.scene;
    for (let i = 0; i < 5; i++) {
      const d = s.add.rectangle(x, y, 4, 4, i % 2 ? 0xffd84a : 0xfff3b0).setDepth(45);
      s.tweens.add({ targets: d, x: x + Phaser.Math.Between(-24, 24), y: y - Phaser.Math.Between(4, 30), alpha: 0, duration: 400, onComplete: () => d.destroy() });
    }
  }

  // aura alrededor del jugador: dorada (amuleto) o roja (taunt)
  setAura(kind) {
    if (kind === this.auraKind) return;
    this.aura?.destroy(); this.aura = null; this.auraKind = kind;
    if (!kind) return;
    const s = this.scene, col = kind === 'taunt' ? 0xff3a2a : 0xffd84a;
    this.aura = s.add.ellipse(0, 0, 62, 78, col, kind === 'taunt' ? .28 : .14).setStrokeStyle(3, col, .95).setDepth(11);
    s.tweens.add({ targets: this.aura, alpha: .45, duration: kind === 'taunt' ? 180 : 500, yoyo: true, repeat: -1 });
  }

  // cada cuadro, mientras se juega
  update(time, dt) {
    const s = this.scene, p = s.player;
    const cx = p.x, cy = p.body.center.y;

    // auras
    this.setAura(this.has('taunt') ? 'taunt' : this.has('amuleto') ? 'amuleto' : null);
    if (this.aura) {
      this.aura.setPosition(cx, cy).setScale(p.scaleY);
      // aura roja: destruye los proyectiles enemigos que la tocan
      if (this.auraKind === 'taunt') {
        [s.balls, s.choclos].forEach(g => g.getChildren().slice().forEach(b => {
          if (Math.abs(b.x - cx) < 38 && Math.abs(b.y - cy) < 46) b.destroy();
        }));
      }
    }
    if (this.auraKind === 'taunt') p.setTint(Math.floor(time / 90) % 2 ? 0xff5a4a : 0xffffff);
    else if (p.isTinted) p.clearTint();

    // proyectiles del jugador
    const cam = s.cameras.main;
    this.shots.getChildren().slice().forEach(o => {
      const age = time - o.born;
      if (o.kind === 'galleta') {
        if (!s.flying) o.body.velocity.y += 300 * dt;  // baja de a poco (en vuelo va recta)
        if (age > 1400) this.crumble(o);
      } else if (o.kind === 'plasma') {
        o.body.velocity.y += 500 * dt;
        if (age > 700) this.explodePlasma(o);
      } else {
        // bastón y báculo: van, se frenan y vuelven a la mano
        if (!o.back && age > 420) o.back = true;
        if (o.back) {
          const dx = p.x - o.x, dy = cy - o.y, d = Math.hypot(dx, dy) || 1;
          o.setVelocity(dx / d * 620, dy / d * 620);
          if (d < 24 || age > 2500) o.destroy();
        }
      }
      if (o.active && (o.x < cam.scrollX - 60 || o.x > cam.scrollX + GW + 60)) {
        if (o.kind === 'baston' || o.kind === 'cetro') o.back = true; else o.destroy();
      }
    });

    // brújula: imán de monedas y galletas
    if (this.has('brujula')) {
      [s.coinGroup, s.galletas].forEach(g => g.getChildren().forEach(c => {
        const dx = cx - c.x, dy = cy - c.y, d = Math.hypot(dx, dy);
        if (d > 200 || d < 1) return;
        const step = Math.min(d, 420 * dt);
        c.x += dx / d * step; c.y += dy / d * step; c.refreshBody();
      }));
    }

    // balón de gas: impulso y nubecitas
    p.jetpack = this.has('gas');
    if (p.thrusting && time > this.nextPuff) {
      this.nextPuff = time + 50;
      const puff = s.add.circle(cx + Phaser.Math.Between(-6, 6), p.body.bottom, Phaser.Math.Between(4, 7), 0xb58ad8, .7).setDepth(9);
      s.tweens.add({ targets: puff, y: puff.y + 26, scale: 1.8, alpha: 0, duration: 420, onComplete: () => puff.destroy() });
      if (Math.random() < .15) sfx(80, 60, .08, 'sawtooth', .02);
    }

    s.hud.drawPowers(this.list(time));
  }

  // íconos para el HUD: cuadro del ítem y fracción de tiempo restante (null = sin límite; count = cantidad)
  list(time) {
    return ORDER.filter(k => this.has(k)).map(k => k === 'plasma'
      ? { frame: ITEMS.plasma.frame, frac: null, count: this.plasma }
      : { frame: ITEMS[k].frame, frac: Math.max(0, (this.until[k] - time) / DURATION[k]) });
  }

  // al morir o ganar: quitar todo lo visible
  // quita los poderes con duración y las esferas; el báculo (cetro) se conserva
  clear() {
    this.until = {}; this.plasma = 0;
    this.setAura(null);
    this.shots.clear(true, true);
    const p = this.scene.player; p.clearTint(); p.jetpack = false; p.thrusting = false;
    this.scene.hud.drawPowers([]);
  }
}
