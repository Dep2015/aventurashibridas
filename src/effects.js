import Phaser from 'phaser';

/* ---------- partículas simples ---------- */

// salpicadura de una bola de queso
export function splat(scene, b) {
  if (!b.active) return;
  for (let i = 0; i < 4; i++) {
    const d = scene.add.circle(b.x, b.y, 3, 0xf5d23c).setDepth(30);
    scene.tweens.add({ targets: d, x: b.x + Phaser.Math.Between(-22, 22), y: b.y + Phaser.Math.Between(-24, 6), alpha: 0, duration: 380, onComplete: () => d.destroy() });
  }
  b.destroy();
}

// choclo que se rompe
export function shatter(scene, c) {
  if (!c.active) return;
  for (let i = 0; i < 5; i++) {
    const d = scene.add.rectangle(c.x, c.y, 4, 4, i % 2 ? 0xffd23c : 0x5c8a2e).setDepth(30);
    scene.tweens.add({ targets: d, x: c.x + Phaser.Math.Between(-26, 26), y: c.y + Phaser.Math.Between(-30, 4), alpha: 0, duration: 420, onComplete: () => d.destroy() });
  }
  c.destroy();
}

// pedazo que sale volando sin colisionar y desaparece
export function debris(scene, x, y, key, frame, { vx, vy, spin, scale = 1, life = 1400 }) {
  const s = scene.physics.add.image(x, y, key, frame).setDepth(30).setScale(scale);
  s.body.checkCollision.none = true;
  s.setVelocity(vx, vy); s.setAngularVelocity(spin);
  scene.time.delayedCall(life, () => s.destroy());
}
