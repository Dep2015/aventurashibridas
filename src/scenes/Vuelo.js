import Phaser from 'phaser';
import { GW, GH, SPRITE_SHEETS, SPRITE_SHEETS_2, TSET_2 } from '../config.js';
import { SND } from '../audio.js';
import { createControls } from '../input.js';
import { showOverlay, renderHud, setLevelName } from '../ui.js';
import { makeTextures, createFlightAnims } from '../textures.js';
import { Hud } from '../hud.js';
import { Powers } from '../powers.js';
import { ITEMS, collectItem } from '../items.js';
import { Flyer } from '../entities/Flyer.js';
import { spawnFlyer, updateFlyers, hitFlyer } from '../entities/flyers.js';
import { Amaru, AMARU } from '../entities/Amaru.js';
import { buildLevel2, L2W, ARENA_X } from '../level2.js';

const MAX_HP = 100;
// daño del choque con un enemigo
const DMG = { contact: 20 };
// enemigos que esperan en el lado derecho de la pantalla (aparecen desde el borde)
const HOVERERS = ['harpia', 'chocloRad'];
// pelea con el Amaru: cae un ítem cada DROP_EVERY ms
const DROPS = ['casino', 'taunt', 'casino', 'plasma'], DROP_EVERY = 8000;

/* ---------- nivel 2: el cielo ----------
 * Todo el nivel es en el aire: Inkaxur vuela con sus alas (Flyer). La cámara solo avanza; en la última pantalla
 * se fija y aparece el Amaru Alado Zombi. Los poderes (Powers) funcionan igual que en el nivel 1: C lanza la
 * galleta de menta (o plasma/bastón), V el báculo de Inka Locu si lo trajo de la cumbre. */
export class Vuelo extends Phaser.Scene {
  constructor() { super('vuelo'); }

  init(d = {}) {
    // lo necesario para reintentar el nivel 2 desde su comienzo
    this.startData = { score: d.score ?? 0, coins: d.coins ?? 0, cetro: !!d.cetro };
    this.score = this.startData.score; this.coins = this.startData.coins; this.hp = MAX_HP;
  }

  preload() {
    const load = this.load, has = k => this.textures.exists(k);
    const sheets = { items: SPRITE_SHEETS.items, ...SPRITE_SHEETS_2 };
    for (const k in sheets) if (!has(k)) { const [path, frameWidth, frameHeight] = sheets[k]; load.spritesheet(k, path, { frameWidth, frameHeight }); }
    for (const k in TSET_2) if (!has(k)) load.image(k, TSET_2[k]);
    if (!has('baculo')) load.image('baculo', 'assets/sprites/inka_baculo.png');
  }

  create() {
    makeTextures(this);
    createFlightAnims(this);
    this.flying = true;
    const L = this.L = buildLevel2();
    this.physics.world.setBounds(0, 0, L2W, GH);
    // el color del borde de abajo del cielo rellena lo que queda entre el cielo y las montañas
    this.cameras.main.setBounds(0, 0, L2W, GH).setBackgroundColor('#758140');
    this.buildBackground();

    // grupos (Powers usa balls, choclos, waves, coinGroup y galletas)
    const P = this.physics.add;
    this.enemies = P.group({ allowGravity: false });
    this.balls = P.group({ allowGravity: false });
    this.fog = P.group({ allowGravity: false });
    this.powerups = P.group({ allowGravity: false });
    this.choclos = P.group(); this.waves = P.group();
    this.coinGroup = P.staticGroup(); this.galletas = P.staticGroup();
    L.coins.forEach(([x0, n, y]) => { for (let i = 0; i < n; i++) this.coinGroup.create(x0 + i * 40, y, 'coinT'); });
    this.tweens.add({ targets: this.coinGroup.getChildren(), scaleX: .25, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    L.casinos.forEach(([x, y]) => this.floatItem('casino', x, y));

    const p = this.player = new Flyer(this, -60, GH / 2);
    this.hud = new Hud(this);
    this.powers = new Powers(this);
    this.powers.cetro = this.startData.cetro;  // el báculo de Inka Locu dura todo el nivel 2
    this.controls = createControls(this);

    P.overlap(p, this.enemies, (pl, e) => { if (!e.dead) this.hurt(DMG.contact); });
    P.overlap(p, this.balls, (pl, o) => { this.hurt(o.dmg); this.splash(o); });
    P.overlap(p, this.fog, (pl, f) => this.hurt(f.dmg));
    P.overlap(p, this.coinGroup, (pl, c) => { c.destroy(); this.addCoin(); });
    P.overlap(p, this.powerups, (pl, u) => { if (u.ready) collectItem(this, u); });
    P.overlap(this.powers.shots, this.enemies, (o, e) => this.shotHits(o, e));

    this.boss = null; this.bossStarted = false; this.bossDone = false; this.nextDrop = 0; this.dropIndex = 0;
    this.spawnIdx = 0; this.nextFall = this.time.now + 4000; this.fallIndex = 0;
    this.nextRandom = this.time.now + 2500;
    this.timeLeft = L.time; this.clock = 0;
    this.dead = false; this.won = false; this.running = true;
    this.introUntil = this.time.now + 1100;  // entra volando desde la izquierda
    this.hud.showBoss(false);
    setLevelName('Nivel 2 · El cielo');
    this.hud.banner('Nivel 2: ¡A volar!', '#9dff6a');
    this.updateHud();
  }

  /* ---------- escenario ---------- */
  // capas del fondo repetidas (alternando espejo) a lo largo del nivel, con paralaje horizontal
  buildBackground() {
    const layer = (key, y, scale, sx, depth, originY) => {
      const w = this.textures.get(key).getSourceImage().width * scale;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const need = GW + (L2W - GW) * sx + w;
      for (let i = 0; i * w < need; i++) {
        this.add.image(i * w, y, key).setOrigin(0, originY).setScale(scale).setScrollFactor(sx, 0).setDepth(depth).setFlipX(i % 2 === 1);
      }
    };
    layer('cielo2', 0, 3.2, .04, -20, 0);  // el cielo arriba; las montañas tapan la parte de abajo
    layer('mtnLejos2', GH - 30, 1.6, .12, -16, 1);
    layer('mtnCerca2', GH + 10, 1.4, .25, -15, 1);
    layer('nubesBajas2', GH + 50, 1.3, .5, -13, 1);
  }

  // ítem flotando que late (se toma al tocarlo)
  floatItem(key, x, y) {
    const u = this.powerups.create(x, y, 'items', ITEMS[key].frame).setDepth(7);
    u.kind = key; u.ready = true; u.body.setSize(26, 26);
    this.tweens.add({ targets: u, y: y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return u;
  }

  // enemigo al azar (además de los del recorrido): tipo según su peso, a una altura al azar, por la derecha
  randomEnemy(time) {
    const R = this.L.random, cam = this.cameras.main;
    if (this.bossStarted || time < this.nextRandom) return;
    this.nextRandom = time + Phaser.Math.Between(R.every[0], R.every[1]);
    const alive = this.enemies.getChildren().filter(e => !e.dead);
    if (alive.length >= R.maxAlive) return;
    const kinds = R.kinds.filter(([k, , minX]) => !minX || cam.scrollX >= minX)
      .filter(([k]) => !HOVERERS.includes(k) || alive.filter(e => HOVERERS.includes(e.kind)).length < 2);
    let r = Math.random() * kinds.reduce((a, k) => a + k[1], 0), kind = kinds[0][0];
    for (const [k, w] of kinds) { if ((r -= w) < 0) { kind = k; break; } }
    const y = kind === 'condorCarga' ? Phaser.Math.Between(70, 110) : Phaser.Math.Between(90, GH - 90);
    spawnFlyer(this, kind, cam.scrollX + GW + 80, y);
  }

  // cae del cielo un ítem (arbusto rojo o bola de energía), meciéndose, hasta salir por abajo
  fallItem(time) {
    if (time < this.nextFall || this.bossStarted) return;
    const F = this.L.falling, cam = this.cameras.main;
    this.nextFall = time + F.every;
    const k = F.items[this.fallIndex++ % F.items.length];
    const u = this.powerups.create(cam.scrollX + 260 + Math.random() * (GW - 380), -24, 'items', ITEMS[k].frame).setDepth(7);
    u.kind = k; u.ready = true; u.falling = true; u.body.setSize(26, 26);
    u.setVelocity(-20, 85);
    this.tweens.add({ targets: u, angle: { from: -12, to: 12 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /* ---------- energía, puntos ---------- */
  updateHud() { renderHud({ hp: this.hp, max: MAX_HP, score: this.score, coins: this.coins, time: this.timeLeft, char: 'xoxurInka' }); }
  addScore(n, x, y) { this.score += n; this.updateHud(); if (x !== undefined) this.hud.popup(n, x, y); }
  addCoin() { this.coins++; SND.coin(); this.addScore(200); }
  heal(n) { this.hp = Math.min(MAX_HP, this.hp + n); this.updateHud(); }
  throwMul() { return 2; }  // en el nivel 2 siempre es Inkaxur: lo que lanza al jefe hace el doble
  transformXoxur() { this.hud.popup('¡Ya eres Inkaxur!', this.player.x, this.player.y - 60); }

  hurt(n) {
    const p = this.player, now = this.time.now;
    if (this.dead || this.won || now < p.invuln || now < this.introUntil) return;
    if (this.powers.has('taunt') || this.powers.has('amuleto')) return;
    this.hp = Math.max(0, this.hp - n); this.updateHud();
    p.invuln = now + 1000; p.hurtAt = now;
    SND.hurt(); this.cameras.main.shake(120, n >= 20 ? .008 : .004);
    this.hud.popup('-' + n, p.x, p.y - 40);
    if (this.hp <= 0) this.die();
  }

  splash(o) {
    if (o.texture.key === 'saliva') {
      const s = this.add.image(o.x, o.y, 'saliva', 1).setDepth(12);
      this.tweens.add({ targets: s, alpha: 0, duration: 300, onComplete: () => s.destroy() });
    }
    o.destroy();
  }

  // proyectil de Inkaxur contra un enemigo: la galleta resta 1, el báculo 2 (una vez por pasada), el plasma arrasa
  shotHits(o, e) {
    if (!o.active || e.dead) return;
    if (o.kind === 'plasma') { this.powers.explodePlasma(o); return; }
    if (o.kind === 'cetro' || o.kind === 'baston') {
      o.hitSet = o.hitSet || new Set();
      if (o.hitSet.has(e)) return;
      o.hitSet.add(e); hitFlyer(this, e, 2);
    } else { this.powers.crumble(o); hitFlyer(this, e, 1); }
  }

  /* ---------- jefe ---------- */
  startBoss() {
    this.bossStarted = true;
    this.cameras.main.scrollX = ARENA_X;
    const b = this.boss = new Amaru(this, ARENA_X);
    this.physics.add.overlap(this.player, b.sprite, () => { if (b.alive) this.hurt(AMARU.dmg.contact); });
    this.physics.add.overlap(this.powers.shots, b.sprite, (x, y) => b.onShot(x === b.sprite ? y : x));
    this.nextDrop = this.time.now + 5000;
  }

  onBossHalf() {
    this.hud.banner('¡Refuerzos del Amaru!', '#ff8a7a');
    [[ARENA_X + GW + 60, 140], [ARENA_X + GW + 160, 400]].forEach(([x, y]) => spawnFlyer(this, 'condor', x, y));
  }

  onBossDefeated() { this.bossDone = true; this.win(); }

  // durante la pelea caen ítems de ayuda desde arriba
  bossDrops(time) {
    if (!this.boss?.alive || time < this.nextDrop) return;
    this.nextDrop = time + DROP_EVERY;
    if (this.powerups.countActive() >= 4) return;
    const k = DROPS[this.dropIndex++ % DROPS.length];
    const u = this.floatItem(k, ARENA_X + 80 + Math.random() * (GW - 400), -20);
    this.tweens.killTweensOf(u);
    this.tweens.add({ targets: u, y: 120 + Math.random() * 300, duration: 1600, ease: 'Quad.out' });
  }

  /* ---------- fin ---------- */
  win() {
    if (this.won || this.dead) return;
    this.won = true; this.running = false; SND.win();
    this.powers.clear();
    const p = this.player;
    p.body.setVelocity(0, 0); p.anims.stop(); p.setFrame(16); p.setFlipX(false); p.setAlpha(1);  // celebración: brazos arriba
    this.addScore(Math.ceil(this.timeLeft) * 10, p.x, p.y - 60);
    // Inkaxur baja a la mina: empieza el nivel 3 (vista desde arriba, batallas por turnos)
    this.hud.banner('¡Venciste al Amaru!', '#9dff6a');
    this.time.delayedCall(1800, () => this.cameras.main.fadeOut(600));
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('escena', {
      // escena con imágenes: se le acaba el vuelo y cae a la mina; después empieza el nivel 3
      cut: 'intro3', run: { hp: this.hp, maxHp: MAX_HP, score: this.score, coins: this.coins },
      next: { key: 'cueva', data: { score: this.score, coins: this.coins, cetro: this.powers.cetro } }
    }));
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.running = false; SND.die();
    this.powers.clear(); this.boss && (this.boss.alive = false);
    const p = this.player;
    p.anims.stop(); p.setFrame(29); p.setAlpha(1); p.body.setVelocity(0, -160);
    this.time.delayedCall(500, () => p.setFrame(30));
    this.time.delayedCall(1800, () => showOverlay('over', { score: this.score }));
  }

  /* ---------- bucle principal ---------- */
  update(time, delta) {
    const dt = Math.min(delta, 34) / 1000;
    const p = this.player, cam = this.cameras.main;
    if (this.dead) { p.body.velocity.y = Math.min(p.body.velocity.y + 900 * dt, 600); return; }
    if (!this.running) { p.body.setVelocity(0, 0); return; }

    this.timeLeft -= dt; this.clock += dt;
    if (this.clock > .25) { this.clock = 0; this.updateHud(); }
    if (this.timeLeft <= 0) { this.die(); return; }

    // cámara que solo avanza; en la última pantalla se fija y empieza la pelea
    if (!this.bossStarted) {
      cam.scrollX = Phaser.Math.Clamp(Math.max(cam.scrollX, p.x - GW * .35), 0, ARENA_X);
      if (cam.scrollX >= ARENA_X - 1) this.startBoss();
    }
    // enemigos: aparecen cuando la cámara llega a su x
    const E = this.L.enemies;
    while (this.spawnIdx < E.length && E[this.spawnIdx][0] <= cam.scrollX + GW + 60) {
      const [x, kind, y] = E[this.spawnIdx++];
      spawnFlyer(this, kind, HOVERERS.includes(kind) ? cam.scrollX + GW + 80 : Math.max(x, cam.scrollX + GW + 60), y);
    }
    this.randomEnemy(time);
    updateFlyers(this, time, dt);
    this.boss?.update(time);
    this.bossDrops(time);
    this.fallItem(time);
    this.powerups.getChildren().forEach(u => { if (u.falling && u.y > GH + 40) u.destroy(); });

    const input = this.controls.read();
    if (time < this.introUntil) {
      p.body.setVelocity(240, 0); p.anims.play('vuelo-volar', true); p.setFlipX(false);
    } else {
      p.move(time, dt, input, cam.scrollX + 6, cam.scrollX + GW - 6);
      if (input.fire) this.powers.throw();
      if (input.fire2) this.powers.throwCetro();
    }
    this.powers.update(time, dt);
  }
}
