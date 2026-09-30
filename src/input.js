import Phaser from 'phaser';

/* ---------- controles táctiles ---------- */
export const touch = { left: false, right: false, run: false, jump: false, down: false, fire: false, fire2: false, jumpAt: -1e9, fireAt: -1e9, fire2At: -1e9 };
// nivel 4 (el Cusco): atk (champi / hablar), shield (escudo), act (galleta), lock (fijar), roll (rodar), quena, casino
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); touch[k] = true; b.classList.add('on'); touch[k + 'At'] = performance.now(); };
  const off = e => { e.preventDefault(); touch[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});

/* ---------- teclado + táctil ---------- */
export function createControls(scene) {
  const K = Phaser.Input.Keyboard.KeyCodes;
  const keys = scene.input.keyboard.addKeys({
    l: K.LEFT, r: K.RIGHT, a: K.A, d: K.D, z: K.Z, sp: K.SPACE, up: K.UP, w: K.W, x: K.X, sh: K.SHIFT, c: K.C, v: K.V, dn: K.DOWN, s: K.S
  });
  const jumpKeys = [keys.z, keys.sp, keys.up, keys.w];
  let touchJumpSeen = touch.jumpAt, touchFireSeen = touch.fireAt, touchFire2Seen = touch.fire2At;
  const jumpHeld = () => jumpKeys.some(k => k.isDown) || touch.jump;

  return {
    keys,
    jumpHeld,
    // estado de los controles en este cuadro; llamar una sola vez por update()
    read() {
      // JustDown consume la pulsación: se evalúan todas las teclas, sin cortocircuito
      const justDown = jumpKeys.map(k => Phaser.Input.Keyboard.JustDown(k));
      const pressed = justDown.some(Boolean) || touch.jumpAt !== touchJumpSeen;
      touchJumpSeen = touch.jumpAt;
      const fire = Phaser.Input.Keyboard.JustDown(keys.c) || touch.fireAt !== touchFireSeen;  // lanzar (C)
      touchFireSeen = touch.fireAt;
      const fire2 = Phaser.Input.Keyboard.JustDown(keys.v) || touch.fire2At !== touchFire2Seen;  // báculo (V)
      touchFire2Seen = touch.fire2At;
      return {
        left: keys.l.isDown || keys.a.isDown || touch.left,
        right: keys.r.isDown || keys.d.isDown || touch.right,
        run: keys.x.isDown || keys.sh.isDown || touch.run,
        held: jumpHeld(),
        pressed,
        fire,
        fire2,
        // en vuelo (nivel 2): subir con ↑/W/Z/Espacio, bajar con ↓/S
        up: jumpHeld(),
        down: keys.dn.isDown || keys.s.isDown || touch.down
      };
    }
  };
}
