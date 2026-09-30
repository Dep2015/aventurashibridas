import Phaser from 'phaser';
import { GH } from '../config.js';

/* ---------- Inkaxur volando (nivel 2) ----------
 * Vuela libre en 8 direcciones, sin gravedad: ←/→ avanzar y retroceder, ↑ (o Z/Espacio) subir, ↓ bajar.
 * X o Shift: vuelo rápido (dash). Cuadros de inkaxur_vuelo.png (mapa en README.md):
 * 1 flotando, 2–7 volar, 8–13 volar rápido, 26–27 golpe, 29–31 derrota, 32–33 lanzar la galleta. */
const FLY = { accel: 1500, max: 270, dash: 430, drag: 1100, vmax: 250 };

export class Flyer extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'inkaxurVuelo', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.ch = 'xoxurInka';
    this.body.setAllowGravity(false);
    this.body.setSize(58, 30).setOffset(20, 18);
    this.setDepth(10);
    this.facing = 1; this.invuln = 0; this.throwAt = -1e9; this.hurtAt = -1e9;
    this.jetpack = false; this.thrusting = false;
  }

  // lo usa Powers al lanzar
  startThrow(time) { this.throwAt = time; }

  move(time, dt, input, left, right) {
    const pb = this.body;
    let vx = pb.velocity.x, vy = pb.velocity.y;
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const max = input.run ? FLY.dash : FLY.max;
    const ease = (v, d, lim) => {
      if (d) return Phaser.Math.Clamp(v + d * FLY.accel * dt, -lim, lim);
      const f = FLY.drag * dt;
      return Math.abs(v) <= f ? 0 : v - Math.sign(v) * f;
    };
    vx = ease(vx, dx, max); vy = ease(vy, dy, FLY.vmax);
    if (Math.abs(vx) > max) vx = Math.sign(vx) * max;
    if (dx) this.facing = dx;
    // dentro de la pantalla: la cámara solo avanza
    if (pb.left < left && vx < 0) vx = 0;
    if (pb.right > right && vx > 0) vx = 0;
    if (pb.left < left) this.x += left - pb.left;
    if (pb.top < 8 && vy < 0) vy = 0;
    if (pb.bottom > GH - 20 && vy > 0) vy = 0;
    pb.setVelocity(vx, vy);
    this.animate(time, vx, input.run && dx !== 0);
  }

  animate(time, vx, dash) {
    const since = time - this.throwAt;
    if (time - this.hurtAt < 350) { this.anims.stop(); this.setFrame(26 + (Math.floor(time / 120) % 2)); }
    else if (since < 300) { this.anims.stop(); this.setFrame(since < 110 ? 32 : 33); }
    else if (dash) this.anims.play('vuelo-dash', true);
    else if (Math.abs(vx) > 30) this.anims.play('vuelo-volar', true);
    else this.anims.play('vuelo-flotar', true);
    this.setFlipX(this.facing < 0);
    this.setAlpha(time < this.invuln ? (Math.floor(time / 70) % 2 ? .3 : 1) : 1);
  }
}
