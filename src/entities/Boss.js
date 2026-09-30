import Phaser from 'phaser';
import { TS } from '../config.js';
import { sfx, SND } from '../audio.js';
import { ITEM_FRAMES } from '../items.js';

// la vida de cada jefe está en su configuración (hp); se muestra en el panel, debajo de la energía del jugador
// daño que recibe según el ataque
export const BOSS_DMG = { stomp: 20, plasma: 20, baston: 10, cetro: 15, galleta: 4 };

/* ---------- jefes de la cima del cerro (primero Inka Locu, después El Sacrificador) ----------
 * Máquina de estados: drop → intro → walk → ataque (jump | charge | shower | throw) → stun → walk…
 * Se vuelven más rápidos a medida que pierden vida.
 * f: cuadros de cada pose en su hoja · body: [ancho, alto, offsetX, offsetY] del cuerpo de colisión
 * attacks: ataques que elige al azar · proj: textura del arma que lanza (vuelve como bumerán)
 * bigJump: el salto de frente hace retumbar todo (sacude la pantalla y daña si estás en el piso)
 * portrait: figura de reposo dentro de la hoja, para el retrato del panel */
export const BOSSES = {
  inka: {
    key: 'boss', name: 'Inka Locu', hp: 150, walk: 'boss-walk', run: 'boss-run', body: [34, 72, 47, 92],
    f: { fall: 15, intro: 31, crouch: 12, up: 14, down: 15, land: 16, raise: 17, release: 17, hurt: 18, remains: 19, ko: 20 },
    attacks: ['jump', 'charge', 'shower', 'throw'], proj: 'baculo', projBody: 22, projDmg: 20, jumpV: -760, bigJump: false,
    portrait: { url: 'assets/sprites/inka_locu.png', sheet: [1024, 820], fig: [675, 411, 57, 81] }
  },
  jaguar: {
    // mide 4 Xoxur; el cuerpo de colisión (190 px) deja pasar bajo las plataformas de la arena
    key: 'jaguar', name: 'El Sacrificador', hp: 200, walk: 'jaguar-walk', run: 'jaguar-run', body: [80, 190, 138, 94],
    f: { fall: 18, intro: 23, crouch: 16, up: 17, down: 18, land: 19, raise: 20, release: 21, hurt: 24, remains: 30, ko: 29 },
    attacks: ['jump', 'charge', 'throw'], proj: 'hacha', projBody: 40, projDmg: 10, projPush: true, jumpV: -840, bigJump: true,
    portrait: { url: 'assets/sprites/jaguar.png', sheet: [2848, 1136], fig: [84, 352, 187, 216] }
  }
};

export class Boss {
  constructor(scene, cfg) {
    this.scene = scene; this.cfg = cfg;
    const A = this.arena = scene.L.arena;
    this.floor = A.floorY;
    const b = this.sprite = scene.physics.add.sprite((A.x1 - 5) * TS, this.floor - 480, cfg.key, cfg.f.fall).setDepth(9);
    const [bw, bh, ox, oy] = cfg.body;
    b.body.setSize(bw, bh).setOffset(ox, oy);
    this.proj = null;
    b.setFlipX(true);
    this.maxHp = cfg.hp; this.hp = cfg.hp; this.state = 'drop'; this.until = 0; this.dir = -1; this.inv = 0; this.last = ''; this.next = null;

    // el jefe atraviesa las plataformas (son para que Xoxur se suba): solo se apoya en el piso de la arena
    scene.physics.add.collider(b, scene.solids, null, (x, t) => (t === b ? x : t).getData('type') !== 'plat');
    scene.physics.add.overlap(scene.player, b, () => this.onTouch());
    // lanzamientos del jugador: la galleta y el bastón le quitan poco (el plasma explota aparte)
    scene.physics.add.overlap(scene.powers.shots, b, (x, y) => this.onShot(x === b ? y : x));

    // rugido de entrada
    [196, 185, 175, 165].forEach((f, i) => scene.time.delayedCall(i * 180, () => sfx(f, f * .7, .3, 'sawtooth', .07)));
    scene.hud.banner(cfg.name);
    scene.hud.showBoss(true, cfg); scene.hud.drawBossBar(this.hp, this.maxHp);
  }

  get alive() { return this.state !== 'dead'; }
  // 0 con vida llena, 3 al borde de la muerte: acelera sus ataques
  get rage() { return (this.maxHp - this.hp) / this.maxHp * 3; }

  freeze() { this.sprite.setVelocity(0, 0); }

  walk(time) {
    this.state = 'walk'; this.sprite.play(this.cfg.walk);
    this.until = time + (1300 + Math.random() * 1000) / (1 + this.rage * .3);
  }

  // elige un ataque distinto al anterior
  attack(time) {
    const b = this.sprite, f = this.cfg.f;
    const opts = this.cfg.attacks.filter(o => o !== this.last);
    const pick = opts[Math.floor(Math.random() * opts.length)]; this.last = pick;
    b.anims.stop(); b.setVelocityX(0);
    if (pick === 'throw') {
      // alza el arma y la arroja hacia el jugador; vuelve como un bumerán
      this.state = 'throw'; b.setFrame(f.raise); this.until = time + 450; this.thrown = false;
      sfx(180, 420, .3, 'sawtooth', .06);
    } else if (pick === 'shower') {
      this.state = 'shower'; b.setFrame(f.raise); this.until = time + 2800;
      sfx(300, 900, .5, 'triangle', .08); this.scene.cameras.main.flash(180, 255, 220, 120);
      this.chocloShower(6 + this.rage * 2);
    } else {
      this.state = 'crouch'; this.next = pick; b.setFrame(f.crouch); this.until = time + (pick === 'jump' ? 480 : 380);
      sfx(110, 200, .3, 'sawtooth', .06);
    }
  }

  throwProjectile() {
    const s = this.scene, b = this.sprite, dir = this.dir, cfg = this.cfg;
    b.setFrame(cfg.f.release);
    // a la altura de Xoxur (con El Sacrificador, el pecho queda muy arriba): hay que saltarla
    const y = Math.max(b.body.center.y - 10, this.floor - 60);
    const o = this.proj = s.physics.add.image(b.x + dir * 40, y, cfg.proj).setDepth(10);
    o.body.setAllowGravity(false); o.body.setSize(cfg.projBody, cfg.projBody);
    o.setVelocityX(dir * 440); o.setAngularVelocity(dir * 900);
    o.born = s.time.now; o.back = false;
    s.physics.add.overlap(s.player, o, () => {
      if (s.dead || s.won || s.time.now < (o.nextHit || 0)) return;
      o.nextHit = s.time.now + 600;  // un golpe por pasada (el proyectil vuelve como bumerán)
      s.hurt(cfg.projDmg);
      // el hacha de El Sacrificador además empuja a Xoxur en la dirección en que vuela
      if (cfg.projPush) s.knockPlayer(Math.sign(o.body.velocity.x) || dir);
    });
    sfx(300, 700, .2, 'sawtooth', .06);
  }

  // el arma va, se frena y vuelve a la mano del jefe
  updateProjectile(time) {
    const o = this.proj; if (!o || !o.active) return;
    const b = this.sprite, A = this.arena;
    if (!o.back && (time - o.born > 750 || o.x < (A.x0 + 1) * TS || o.x > A.x1 * TS)) o.back = true;
    if (o.back) {
      const dx = b.x - o.x, dy = b.body.center.y - o.y, d = Math.hypot(dx, dy) || 1;
      o.setVelocity(dx / d * 480, dy / d * 480);
      if (d < 36) { o.destroy(); this.proj = null; }
    }
  }

  // lluvia de choclos dorados: primero una marca de aviso en el piso, luego cae el choclo
  chocloShower(n) {
    const s = this.scene, A = this.arena, span = (A.x1 - A.x0 - 2) * TS;
    const cancelled = () => !this.alive || s.dead;
    for (let i = 0; i < n; i++) {
      const x = (A.x0 + 1) * TS + ((i + Math.random()) / n) * span;
      s.time.delayedCall(250 + i * 200 + Math.random() * 150, () => {
        if (cancelled()) return;
        const w = s.add.image(x, this.floor - 2, 'warn').setDepth(4);
        s.tweens.add({ targets: w, alpha: .2, duration: 120, yoyo: true, repeat: 3 });
        s.time.delayedCall(520, () => {
          w.destroy(); if (cancelled()) return;
          const c = s.choclos.create(x, this.floor - 560, 'items', ITEM_FRAMES.choclo).setDepth(9).setScale(1.2).setAngle(90);
          c.body.setSize(22, 22); c.setAngularVelocity(Phaser.Math.Between(-200, 200)); c.setVelocityY(120);
          sfx(900, 500, .12, 'triangle', .04);
          s.time.delayedCall(3000, () => c.active && c.destroy());
        });
      });
    }
  }

  // onda de polvo que corre por el piso de la arena
  spawnWave(x, dir, speed = 300) {
    const w = this.scene.waves.create(x + dir * 34, this.floor - 8, 'wave').setDepth(9);
    w.body.setSize(34, 12); w.setVelocityX(dir * speed);
    this.scene.time.delayedCall(1500, () => w.active && w.destroy());
  }

  // aterrizaje del salto; el de El Sacrificador hace retumbar todo
  land(time) {
    const s = this.scene, b = this.sprite, cam = s.cameras.main, cfg = this.cfg;
    b.setVelocityX(0); b.setFrame(cfg.f.land);
    if (cfg.bigJump) {
      cam.shake(650, .03); sfx(60, 25, .8, 'square', .16);
      [-1, 1].forEach(d => { this.spawnWave(b.x, d, 360); s.time.delayedCall(220, () => this.alive && this.spawnWave(b.x, d, 260)); });
      const p = s.player;
      if (p.body.blocked.down && !s.dead) { s.hurt(15); s.hud.popup('¡Retumba!', p.x, p.y - 90); }
    } else {
      cam.shake(260, .014); sfx(80, 35, .45, 'square', .14);
      this.spawnWave(b.x, -1); this.spawnWave(b.x, 1);
    }
    this.state = 'stun'; this.until = time + (cfg.bigJump ? 1000 : 800);
  }

  update(time) {
    if (!this.alive) return;
    const s = this.scene, b = this.sprite, A = this.arena, cam = s.cameras.main, f = this.cfg.f;
    this.updateProjectile(time);
    const dx = s.player.x - b.x, onGround = b.body.blocked.down;
    const speedUp = 1 + this.rage * .25;
    const face = () => { this.dir = Math.sign(dx) || this.dir; b.setFlipX(this.dir < 0); };
    b.setAlpha(time < this.inv ? (Math.floor(time / 60) % 2 ? .35 : 1) : 1);

    switch (this.state) {
      case 'drop':
        if (onGround) { cam.shake(350, .012); sfx(90, 40, .5, 'square', .12); this.state = 'intro'; this.until = time + 1400; b.setFrame(f.intro); }
        break;
      case 'throw':
        b.setVelocityX(0);
        if (!this.thrown && time > this.until) { face(); this.throwProjectile(); this.thrown = true; this.until = time + 2200; }
        if (this.thrown && (!this.proj || time > this.until)) { this.proj?.destroy(); this.proj = null; this.walk(time); }
        break;
      case 'intro':
        b.setVelocityX(0); if (time > this.until) this.walk(time);
        break;
      case 'walk':
        face(); b.setVelocityX(70 * speedUp * this.dir); if (time > this.until) this.attack(time);
        break;
      case 'crouch':
        b.setVelocityX(0);
        if (time > this.until) {
          face();
          if (this.next === 'jump') {
            const tx = Phaser.Math.Clamp(s.player.x, (A.x0 + 3) * TS, (A.x1 - 3) * TS);
            b.setVelocity(Phaser.Math.Clamp(tx - b.x, -420, 420), this.cfg.jumpV); b.setFrame(f.up);
            this.state = 'air'; this.until = time + 150; sfx(200, 600, .25, 'square', .06);
          } else { this.state = 'charge'; b.play(this.cfg.run); }
        }
        break;
      case 'air':
        b.setFrame(b.body.velocity.y < 0 ? f.up : f.down);
        if (onGround && time > this.until) this.land(time);
        break;
      case 'charge':
        b.setVelocityX(330 * speedUp * this.dir); b.setFlipX(this.dir < 0);
        if ((this.dir < 0 && b.body.left < (A.x0 + 1) * TS + 4) || (this.dir > 0 && b.body.right > A.x1 * TS - 4)) {
          b.anims.stop(); b.setFrame(f.hurt); b.setVelocityX(0); cam.shake(200, .01); sfx(120, 50, .3, 'square', .1);
          this.state = 'stun'; this.until = time + 1100;
        }
        break;
      case 'stun': case 'shower':
        b.setVelocityX(0); if (time > this.until) this.walk(time);
        break;
      case 'hurt':
        b.setVelocityX(0);
        if (time > this.until) { this.state = 'crouch'; this.next = 'charge'; b.setFrame(f.crouch); this.until = time + 300; }
        break;
    }
  }

  // contacto con el jugador: pisotón o daño
  onTouch() {
    const s = this.scene, p = s.player, b = this.sprite;
    if (!this.alive || this.state === 'drop' || s.dead || s.won) return;
    if (p.isStomping(b.body.top, 24)) {
      p.bounce(s.controls.jumpHeld(), -700, -560);
      this.damage(BOSS_DMG.stomp);
      return;
    }
    s.hurt(25);
  }

  onShot(o) {
    const s = this.scene;
    if (!o.active || !this.alive || this.state === 'drop') return;
    if (o.kind === 'plasma') { s.powers.explodePlasma(o); return; }
    if (o.kind === 'baston' || o.kind === 'cetro') {
      if (s.time.now < (o.nextBossHit || 0)) return;  // el bastón y el báculo atraviesan: un golpe por pasada
      o.nextBossHit = s.time.now + 400; o.back = true;
      this.chip(BOSS_DMG[o.kind] * s.throwMul());
    } else {
      s.powers.crumble(o);
      this.chip(BOSS_DMG.galleta * s.throwMul());
    }
  }

  // daño chico que no interrumpe al jefe: parpadeo breve, sin invulnerabilidad larga
  chip(n) {
    const s = this.scene, b = this.sprite;
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - n); s.hud.drawBossBar(this.hp, this.maxHp); s.onBossHp(this.hp, this.maxHp);
    b.setTintFill(0xffffff); s.time.delayedCall(70, () => b.active && b.clearTint());
    sfx(260, 140, .08, 'square', .05);
    if (this.hp <= 0) { s.addScore(1000, b.x, b.y - 80); this.die(); }
  }

  // quitar vida (pisotón o esfera de plasma); tras un golpe queda invulnerable un momento
  damage(n) {
    const s = this.scene, b = this.sprite;
    if (!this.alive || this.state === 'drop' || s.time.now < this.inv) return;
    this.hp = Math.max(0, this.hp - n); this.inv = s.time.now + 1400; s.hud.drawBossBar(this.hp, this.maxHp); s.onBossHp(this.hp, this.maxHp);
    s.addScore(1000, b.x, b.y - 80);
    SND.stomp(); sfx(160, 60, .5, 'sawtooth', .1); s.cameras.main.shake(180, .01);
    if (this.hp <= 0) this.die();
    else { this.state = 'hurt'; b.anims.stop(); b.setFrame(this.cfg.f.hurt); b.setVelocity(0, 0); this.until = s.time.now + 650; }
  }

  die() {
    const s = this.scene, b = this.sprite, f = this.cfg.f;
    this.state = 'dead'; b.anims.stop(); b.setFrame(f.ko); b.setVelocity(0, 0); b.setAlpha(1);
    b.body.checkCollision.none = true; b.body.setAllowGravity(false);
    this.proj?.destroy(); this.proj = null;
    s.choclos.clear(true, true); s.waves.clear(true, true);
    s.addScore(5000); s.hud.banner(`¡${this.cfg.name} cayó!`);
    s.time.delayedCall(600, () => b.setFrame(f.remains));
    s.tweens.add({ targets: b, alpha: 0, delay: 1600, duration: 700 });
    s.time.delayedCall(2300, () => { b.destroy(); s.onBossDefeated(this); });
  }
}
