import Phaser from 'phaser';
import { GW, GH } from '../config.js';
import { SND, sfx } from '../audio.js';

/* ---------- Amaru Alado Zombi: jefe del nivel 2 (6 veces Xoxur: la lámina lo trae de 4, se dibuja a escala S) ----------
 * Vuela en el lado derecho de la última pantalla (mira a la izquierda en la lámina). Ataques:
 *  niebla:  echa por el hocico una niebla radiactiva que avanza hacia la izquierda
 *  hielo:   sacude las alas y caen puntas de agua congelada
 *  granizo: con la cola lanza bolas de granizo viscoso verde hacia Xoxur
 *  embestida: cruza la pantalla volando hacia Xoxur y vuelve
 * Cuadros de amaru.png: 0 vuelo, 1 avance, 2 aliento, 3 garras, 5 sacudir alas, 6 derrotado.
 * Ataques en amaru_ataques.png: 0 niebla, 1 punta de hielo, 2 bola de granizo verde. */
const S = 1.5;  // escala del sprite (pedido del usuario: 2 Xoxur más grande)

export const AMARU = {
  name: 'Amaru Alado Zombi', hp: 250,
  dmg: { contact: 25, niebla: 15, hielo: 15, granizo: 10 },
  hit: { galleta: 4, cetro: 15, baston: 10, plasma: 20 },
  portrait: { url: 'assets/sprites/amaru.png', sheet: [1032, 696], fig: [21, 16, 301, 216] }
};

export class Amaru {
  constructor(scene, x0) {
    const s = this.scene = scene;
    this.x0 = x0;  // borde izquierdo de la pantalla de la pelea
    this.hp = this.maxHp = AMARU.hp;
    const b = this.sprite = s.physics.add.sprite(x0 + GW + 320, GH / 2, 'amaru', 0).setDepth(8).setScale(S);
    b.body.setAllowGravity(false); b.body.setSize(200, 120).setOffset(80, 70);  // (en píxeles de la lámina: se escala con S)
    this.alive = true; this.state = 'enter'; this.until = 0; this.inv = 0; this.homeX = x0 + GW - 270;
    this.reinforced = false;
    s.hud.showBoss(true, AMARU); s.hud.drawBossBar(this.hp, this.maxHp);
    s.hud.banner(AMARU.name, '#9dff6a');
    s.cameras.main.shake(400, .006);
  }

  update(time) {
    if (!this.alive) return;
    const s = this.scene, b = this.sprite, p = s.player;
    const bob = Math.sin(time / 600) * 70;
    if (this.state === 'enter') {
      b.setVelocity((this.homeX - b.x) * 2, (GH / 2 - b.y) * 2);
      if (Math.abs(b.x - this.homeX) < 10) { this.state = 'idle'; this.until = time + 1400; }
    } else if (this.state === 'idle') {
      b.setVelocity((this.homeX - b.x) * 2, (GH / 2 + bob - b.y) * 2.5);
      if (b.frame.name !== 0) b.setFrame(0);
      if (time > this.until) this.attack(time);
    } else if (this.state === 'charge') {
      if (b.x < this.x0 + 140 || time > this.until) { this.state = 'return'; b.setFrame(0); }
    } else if (this.state === 'return') {
      b.setVelocity((this.homeX - b.x) * 2.2, (GH / 2 - b.y) * 2);
      if (Math.abs(b.x - this.homeX) < 16) { this.state = 'idle'; this.until = time + 900; }
    } else if (this.state === 'busy') {
      b.setVelocity(0, (GH / 2 + bob * .4 - b.y) * 2);
      if (time > this.until) { this.state = 'idle'; this.until = time + 1100 / (1 + this.rage()); b.setFrame(0); }
    }
    // la niebla hace daño mientras Xoxur esté dentro
    s.fog.getChildren().forEach(f => { if (f.x < this.x0 - 200) f.destroy(); });
  }

  rage() { return this.hp < this.maxHp / 2 ? .6 : 0; }

  attack(time) {
    const s = this.scene, b = this.sprite, p = s.player;
    const pick = Phaser.Utils.Array.GetRandom(['niebla', 'hielo', 'granizo', 'granizo', 'embestida']);
    this.state = 'busy'; this.until = time + 1300;
    if (pick === 'niebla') {
      b.setFrame(2); sfx(120, 60, .6, 'sawtooth', .06);
      s.time.delayedCall(300, () => {
        if (!this.alive) return;
        for (let i = 0; i < 3; i++) s.time.delayedCall(i * 160, () => {
          if (!this.alive) return;
          const f = s.fog.create(b.x - 150 * S, b.y - 20 * S + i * 22, 'amaruAtq', 0).setDepth(11).setAlpha(.85).setScale(1.5);
          f.body.setAllowGravity(false); f.body.setSize(70, 60); f.setVelocity(-190 - i * 20, Phaser.Math.Between(-30, 30));
          f.dmg = AMARU.dmg.niebla;
        });
      });
    } else if (pick === 'hielo') {
      b.setFrame(5); s.cameras.main.shake(300, .004); sfx(900, 300, .4, 'triangle', .05);
      const n = 6 + Math.round(this.rage() * 5);
      for (let i = 0; i < n; i++) s.time.delayedCall(i * 120, () => {
        if (!this.alive) return;
        const x = this.x0 + 60 + Math.random() * (GW - 460);
        const o = s.balls.create(x, -30, 'amaruAtq', 1).setDepth(11);
        o.body.setAllowGravity(false); o.body.setSize(26, 40).setOffset(43, 40); o.setVelocityY(300 + Math.random() * 120);
        o.dmg = AMARU.dmg.hielo;
      });
    } else if (pick === 'granizo') {
      b.setFrame(3); sfx(200, 80, .3, 'square', .05);
      s.time.delayedCall(250, () => {
        if (!this.alive) return;
        [-.25, 0, .25].forEach(a => {
          const tx = b.x + 90 * S, ty = b.y + 60 * S;  // la punta de la cola
          const dx = p.x - tx, dy = p.body.center.y - ty, ang = Math.atan2(dy, dx) + a;
          const o = s.balls.create(tx, ty, 'amaruAtq', 2).setDepth(11);
          o.body.setAllowGravity(false); o.body.setCircle(14, 42, 52); o.setVelocity(Math.cos(ang) * 320, Math.sin(ang) * 320);
          o.setAngularVelocity(300); o.dmg = AMARU.dmg.granizo;
        });
      });
    } else {
      // embestida: toma impulso y cruza la pantalla hacia Xoxur
      b.setFrame(1); this.state = 'charge'; this.until = time + 1600;
      const dy = Phaser.Math.Clamp(p.y - b.y, -200, 200);
      b.setVelocity(-560, dy); sfx(160, 60, .5, 'sawtooth', .08);
    }
  }

  // daño de lo que lanza Inkaxur (con el balón de oro, el doble: throwMul)
  onShot(o) {
    const s = this.scene;
    if (!o.active || !this.alive || this.state === 'enter') return;
    if (o.kind === 'plasma') { s.powers.explodePlasma(o); return; }
    if (o.kind === 'baston' || o.kind === 'cetro') {
      if (s.time.now < (o.nextBossHit || 0)) return;
      o.nextBossHit = s.time.now + 400; o.back = true;
    } else o.destroy();
    this.chip(AMARU.hit[o.kind] * s.throwMul());
  }

  // la esfera de plasma (Powers.explodePlasma) llama a damage()
  damage(n) { this.chip(n); }

  chip(n) {
    const s = this.scene, b = this.sprite;
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - n);
    s.hud.drawBossBar(this.hp, this.maxHp);
    b.setTintFill(0xffffff); s.time.delayedCall(70, () => b.active && b.clearTint());
    sfx(260, 140, .08, 'square', .05);
    if (!this.reinforced && this.hp <= this.maxHp / 2) { this.reinforced = true; s.onBossHalf(); }
    if (this.hp <= 0) this.die();
  }

  die() {
    const s = this.scene, b = this.sprite;
    this.alive = false; b.setFrame(6); b.setVelocity(0, 0);
    s.addScore(5000, b.x, b.y - 100);
    SND.stomp(); sfx(120, 40, 1, 'sawtooth', .1);
    s.cameras.main.flash(400, 190, 255, 140); s.cameras.main.shake(600, .012);
    [s.balls, s.fog].forEach(g => g.clear(true, true));
    s.tweens.add({ targets: b, y: GH + 260, angle: -25, delay: 700, duration: 1400, ease: 'Quad.in', onComplete: () => b.destroy() });
    s.hud.showBoss(false);
    s.time.delayedCall(1800, () => s.onBossDefeated());
  }
}
