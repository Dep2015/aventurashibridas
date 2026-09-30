import Phaser from 'phaser';
import { CHARS, GROUND_Y, TS, PLAYER as P } from '../config.js';
import { SND } from '../audio.js';

/* ---------- jugador ----------
 * No usa la gravedad del mundo: la física del salto está hecha a mano en move()
 * (gravedad suave subiendo con el botón presionado, fuerte al soltar o caer;
 * coyote time y buffer de salto). */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, ch) {
    super(scene, x, GROUND_Y - 32, ch, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.ch = ch;
    this.body.setAllowGravity(false);
    this.body.setSize(24, 54, false).setOffset(24, 10);
    this.setDepth(10);

    this.big = false;
    this.facing = 1; this.jumping = false; this.prevVy = 0;
    this.lastGround = -1e9; this.lastJump = -1e9;
    this.invuln = 0; this.pushedUntil = 0;
    this.bumped = false; this.headHits = [];
    this.jetpack = false; this.thrusting = false;  // balón de gas (lo maneja Powers)
    this.canDouble = false;                         // doble salto: lo habilita la escena durante la pelea con los jefes
    this.throwAt = -1e9;                            // último lanzamiento (animación de lanzar)

    this.setBig(false);
    this.y = GROUND_Y - 32 * this.scaleY;
    this.body.reset(this.x, this.y);
  }

  setCharacter(ch) { this.ch = ch; this.setTexture(ch, 0); this.anims.play(ch + '-idle', true); }

  // Cambiar de tamaño conservando los pies en el mismo lugar. Hay que llamar a
  // updateBounds() y reset() conservando la velocidad, o el jugador se hunde en el suelo.
  // No llamar dentro de un callback de colisión/overlap.
  setBig(b) {
    const bottom = this.y + 32 * this.scaleY;
    this.big = b; this.setScale(b ? P.bigScale : 1);
    this.y = bottom - 32 * this.scaleY;
    const v = this.body.velocity.clone();
    this.body.updateBounds(); this.body.reset(this.x, this.y); this.body.setVelocity(v.x, v.y);
  }

  // ¿viene cayendo sobre algo cuyo borde superior es top?
  isStomping(top, tolerance) {
    return (this.prevVy > 40 || this.body.velocity.y > 40) && this.body.bottom <= top + tolerance;
  }

  // rebote al pisar a un enemigo: más alto si se mantiene el salto
  bounce(held, strong, weak) { this.body.setVelocityY(held ? strong : weak); this.jumping = true; this.doubleUsed = false; }

  // colisión con un sólido: registrar golpes con la cabeza para el siguiente update()
  onSolid(t) {
    const pb = this.body;
    if (this.prevVy < 0 && Math.abs(t.x - this.x) < 26 && t.body.bottom <= pb.top + 3 && t.body.bottom >= pb.top - 6) this.headHits.push(t);
  }

  // bloque más cercano golpeado con la cabeza (uno por salto)
  takeHeadHit() {
    let hit = null;
    if (this.headHits.length && !this.bumped) {
      this.headHits.sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x));
      this.bumped = true; hit = this.headHits[0];
    }
    this.headHits = [];
    return hit;
  }

  move(time, dt, input, camLeft) {
    const pb = this.body;
    let vx = pb.velocity.x, vy = pb.velocity.y;
    const onGround = pb.blocked.down;
    if (onGround) { this.lastGround = time; if (vy >= 0) { this.jumping = false; this.bumped = false; this.doubleUsed = false; } }
    if (input.pressed) this.lastJump = time;

    // horizontal con inercia
    const pushed = time < this.pushedUntil;
    const dir = pushed ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxV = input.run ? P.runSpeed : P.walkSpeed;
    let skid = false;
    if (dir !== 0) {
      if (vx !== 0 && Math.sign(vx) !== dir && onGround) { vx += dir * P.skidDecel * dt; skid = Math.abs(vx) > 40; }
      else vx += dir * (onGround ? (input.run ? P.accelRun : P.accelWalk) : P.accelAir) * dt;
      if (Math.abs(vx) > maxV) vx = Math.sign(vx) * Math.max(maxV, Math.abs(vx) - P.overSpeedDecel * dt);
      if (!skid) this.facing = dir;
    } else {
      const fr = (pushed ? P.frictionPushed : onGround ? P.frictionGround : P.frictionAir) * dt;
      vx = Math.abs(vx) <= fr ? 0 : vx - Math.sign(vx) * fr;
    }

    // salto: buffer + coyote time, altura según velocidad
    if (!pushed && time - this.lastJump < P.jumpBufferMs && time - this.lastGround < P.coyoteMs && !this.jumping) {
      vy = -(P.jumpSpeed + Math.abs(vx) * P.jumpSpeedBonus);
      this.jumping = true; this.lastJump = -1e9; this.lastGround = -1e9; SND.jump();
    } else if (this.canDouble && !pushed && input.pressed && !onGround && time - this.lastGround >= P.coyoteMs && !this.doubleUsed && !this.jetpack) {
      // doble salto (solo en la pelea con los jefes): una vez en el aire; se recupera al tocar el suelo o al pisar a un enemigo
      vy = -P.doubleJumpSpeed; this.jumping = true; this.doubleUsed = true; this.lastJump = -1e9;
      SND.jump(); this.puff();
    }
    // gravedad doble: suave subiendo con botón, fuerte al soltar o caer
    const grav = (vy < 0 && input.held && this.jumping) ? P.jumpGravity : P.fallGravity;
    vy = Math.min(vy + grav * dt, P.maxFall);
    // balón de gas: mantener el salto en el aire impulsa hacia arriba (sin salir de la pantalla)
    this.thrusting = this.jetpack && input.held && !onGround && !pushed;
    if (this.thrusting) {
      // la velocidad máxima de subida baja a 0 al acercarse al borde superior: queda flotando
      const maxUp = 300 * Phaser.Math.Clamp((pb.top - 24) / 110, 0, 1);
      vy = vy < -maxUp ? Math.min(vy + 2500 * dt, -maxUp) : Math.max(vy - 3400 * dt, -maxUp);
      this.jumping = true;
    }

    // pegado a una pared: no empujar contra ella. Si no, al saltar la cabeza se engancha en la unión entre
    // dos bloques de la pared (la física separa primero en Y) y el salto se corta
    if (vx !== 0 && this.againstWall(Math.sign(vx))) vx = 0;

    // la cámara solo avanza: no dejar que el jugador salga por la izquierda
    if (pb.left < camLeft) { this.x += camLeft - pb.left; if (vx < 0) vx = 0; }

    pb.setVelocity(vx, vy);
    this.prevVy = vy;
    this.animate(time, onGround, skid, vx, vy);
  }

  // ¿hay un bloque sólido justo al lado (side = 1 derecha, −1 izquierda) a la altura del cuerpo?
  againstWall(side) {
    const pb = this.body, blocks = this.scene.blocks;
    if (!blocks) return false;
    const tx = Math.floor((side > 0 ? pb.right + 1 : pb.left - 1) / TS);
    for (let ty = Math.floor((pb.top + 2) / TS); ty <= Math.floor((pb.bottom - 5) / TS); ty++) {
      if (blocks[tx + ',' + ty]) return true;
    }
    return false;
  }

  // animación de lanzar (fila 5 de la hoja): 25 brazo atrás, 24 brazo estirado
  startThrow(time) { this.throwAt = time; }

  // nubecita bajo los pies (doble salto)
  puff() {
    const s = this.scene, y = this.body.bottom;
    for (let i = -1; i <= 1; i++) {
      const c = s.add.circle(this.x + i * 10, y, 6, 0xffffff, .8).setDepth(9);
      s.tweens.add({ targets: c, x: c.x + i * 14, y: y + 10, scale: 1.8, alpha: 0, duration: 320, onComplete: () => c.destroy() });
    }
  }

  animate(time, onGround, skid, vx, vy) {
    const sinceThrow = time - this.throwAt;
    // la pose de lanzar es de pie: solo en el suelo (en el aire se ve la pose de salto)
    if (sinceThrow < 260 && onGround && !(this.jumping && vy < 0)) { this.anims.stop(); this.setFrame(sinceThrow < 90 ? 25 : 24); }
    else if (!onGround || this.jumping && vy < 0) { this.anims.stop(); this.setFrame(vy < 0 ? 20 : CHARS[this.ch].fall); }
    else if (skid) { this.anims.stop(); this.setFrame(18); }
    else if (Math.abs(vx) < 12) this.anims.play(this.ch + '-idle', true);
    else if (Math.abs(vx) > 200) { this.anims.play(this.ch + '-run', true); this.anims.timeScale = Math.abs(vx) / 240; }
    else { this.anims.play(this.ch + '-walk', true); this.anims.timeScale = Math.max(.6, Math.abs(vx) / 140); }
    this.setFlipX(skid ? this.facing > 0 : this.facing < 0);
    // parpadeo de invulnerabilidad
    this.setAlpha(time < this.invuln ? (Math.floor(time / 70) % 2 ? .3 : 1) : 1);
  }
}
