import { SND } from './audio.js';

/* ---------- ítems que salen de las cajas ----------
 * frame: cuadro en items.png
 * slides: se desliza por el suelo como el hongo de Mario; si no, queda flotando sobre la caja
 * apply: qué hace al tomarlo (los efectos con duración y las armas están en powers.js) */
export const ITEMS = {
  amuleto: { name: 'Amuleto: inmune 10 s', frame: 0, apply: s => s.powers.give('amuleto') },
  quipu:   { name: 'Quipu: +30 energía', frame: 1, apply: s => s.heal(30) },
  taunt:   { name: 'Taunt: aura roja', frame: 2, apply: s => s.powers.give('taunt') },
  baston:  { name: 'Bastón: lánzalo con C', frame: 3, apply: s => s.powers.give('baston') },
  casino:  { name: 'Casino: energía llena', frame: 5, slides: true, apply: s => s.heal(100) },
  gas:     { name: 'Balón de gas: vuela', frame: 7, apply: s => s.powers.give('gas') },
  plasma:  { name: 'Plasma: lánzala con C', frame: 8, apply: s => s.powers.give('plasma') },
  brujula: { name: 'Brújula: imán', frame: 9, apply: s => s.powers.give('brujula') },
  // solo Xoxur: se transforma en Xoxur Inka
  gasOro:  { name: 'Balón de gas dorado', frame: 10, apply: s => s.transformXoxur() },
  // cae del cielo en la pelea con el jefe final (1 de cada 4 artefactos)
  galleta: { name: 'Galleta: +10 energía', frame: 6, apply: s => s.heal(10) },
  // cubos de la cumbre (textura propia en vez de un cuadro de items.png)
  baculo:  { name: 'Báculo de Inka Locu: lánzalo con V', tex: 'baculo', scale: .5, apply: s => s.powers.giveCetro() },
  alas:    { name: '¡Alas!', tex: 'alasItem', apply: s => s.takeWings() }
};
// otros cuadros de items.png
export const ITEM_FRAMES = { choclo: 4, galleta: 6, baston: 3, plasma: 8, gasOroLanzado: [11, 12, 13] };

// el ítem sube desde la caja golpeada
export function spawnItem(scene, key, cx, cy) {
  const it = ITEMS[key];
  if (!it) return;
  const u = scene.powerups.create(cx, cy, it.tex || 'items', it.tex ? undefined : it.frame).setDepth(5);
  u.kind = key; u.slides = !!it.slides; u.ready = false; u.body.enable = false;
  if (it.tex) u.setScale(it.scale || 1); else u.body.setSize(26, 26);
  scene.tweens.add({
    targets: u, y: cy - 31, duration: 500, onComplete: () => {
      u.body.enable = true; u.body.reset(u.x, u.y); u.ready = true;
      if (u.slides) { u.setVelocityX(100); u.dir = 1; return; }
      // flota sobre la caja y late para llamar la atención
      u.body.setAllowGravity(false);
      scene.tweens.add({ targets: u, scale: u.scale * 1.15, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  });
}

export function collectItem(scene, u) {
  const it = ITEMS[u.kind], p = scene.player;
  u.destroy();
  scene.addScore(1000, p.x, p.y - 60); SND.up();
  scene.hud.popup(it.name, p.x, p.y - 92);
  it.apply(scene);
}
