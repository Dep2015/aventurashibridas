import Phaser from 'phaser';
import { GW, GH } from '../config.js';
import { SND, sfx } from '../audio.js';
import { createControls, touch } from '../input.js';
import { showOverlay, renderHud, setLevelName, showBossPanel, renderBoss } from '../ui.js';
import { makeTextures, createFlightAnims, createCaveAssets } from '../textures.js';
import { Hud } from '../hud.js';
import { FOES, RUNES } from '../level3.js';
import { preloadMina, MAP_STAND } from './Cueva.js';

/* ---------- guarida de Muqui Z: pelea en tiempo real (como Depths of Elora) ----------
 * Vista desde arriba, movimiento libre. Muqui Z pelea con la ayuda de todos los enemigos del nivel 3.
 * Controles: WASD / flechas moverse · C o clic: galleta (hacia donde apuntas) · 1: látigo de quipus (alrededor,
 * aturde) · 2 o V: báculo (va y vuelve) · 3: esfera de plasma · Shift o X: esquivar · Q: quipu · E: Casino.
 * El estado de la partida (energía, ítems, runas) llega de la mina en `run`; al perder se repite solo esta pelea. */
const W = 1600, H = 1100;                // tamaño de la guarida
const SPEED = 215, DASH = 560;
const BOSS = { name: 'Muqui Z', hp: 1000, scale: .85,  // mucha vida: Inkaxur le hace el doble de daño
  portrait: { url: 'assets/sprites/minero.png', sheet: [1888, 1392], fig: [30, 16, 175, 216] } };
// habilidades: tecla, enfriamiento (ms), daño
const SKILLS = {
  galleta: { key: 'C', cd: 420, dmg: [10, 13] },
  quipus: { key: '1', cd: 4000, dmg: [18, 22] },
  baculo: { key: '2', cd: 2800, dmg: [24, 30] },
  plasma: { key: '3', cd: 1500, dmg: [45, 55] },
  esquivar: { key: '⇧', cd: 1100 }
};
// ayudantes: vida, velocidad, daño al tocar, ataque a distancia
const HELP = {
  sapazo: { hp: 40, speed: 95, touch: 8, scale: .9 },
  tulixta: { hp: 45, speed: 80, touch: 6, keep: 230, shot: { every: 2200, dmg: 8, poison: true, color: 0x9dff6a }, scale: .95 },
  jumpe: { hp: 50, speed: 85, touch: 10, keep: 180, shot: { every: 2600, dmg: 12, color: 0x7dffb0, big: true }, scale: .9 },
  aracura: { hp: 36, speed: 110, touch: 5, keep: 200, shot: { every: 3000, dmg: 6, poison: true, color: 0xb6ff5a }, scale: 1.05 },
  carbunco: { hp: 110, speed: 90, touch: 14, ray: { every: 4200, dmg: 20 }, scale: .55 }
};
const FRAMES = { sapazo: { hit: 32, ko: 40 }, tulixta: { hit: 34, ko: 40 }, jumpe: { hit: 34, ko: 40 }, aracura: { hit: null, ko: null }, carbunco: { hit: 28, ko: 34 } };

export class Guarida extends Phaser.Scene {
  constructor() { super('guarida'); }

  init(d) {
    // copia para poder repetir la pelea con lo que se traía de la mina
    this.startData = { run: JSON.parse(JSON.stringify(d.run)) };
    this.run = JSON.parse(JSON.stringify(d.run));
  }

  preload() { preloadMina(this); }

  create() {
    makeTextures(this); createFlightAnims(this); createCaveAssets(this, FOES);
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(48, 48, W - 96, H - 96);
    this.cameras.main.setBounds(0, 0, W, H).setBackgroundColor('#0b0806');
    this.hud = new Hud(this);
    this.controls = createControls(this);
    const K = Phaser.Input.Keyboard.KeyCodes, kb = this.input.keyboard;
    this.key1 = kb.addKey(K.ONE); this.key2 = kb.addKey(K.TWO); this.key3 = kb.addKey(K.THREE);
    this.keyQ = kb.addKey(K.Q); this.keyE = kb.addKey(K.E);
    this.lastFire = touch.fireAt; this.lastFire2 = touch.fire2At;
    setLevelName('Nivel 3 · Guarida de Muqui Z');
    this.buildArena();

    // Inkaxur
    this.pShadow = this.add.image(0, 0, 'sombra3');
    const p = this.player = this.physics.add.sprite(W * .25, H * .5, 'inkaxurMapa', 0).setOrigin(.5, .94).setScale(.95);
    p.body.setCircle(14, 18, 38); p.body.setCollideWorldBounds(true);
    this.dir = 'right';
    this.face = { x: 1, y: 0 }; this.invuln = 0; this.dashUntil = 0; this.poisonUntil = 0; this.nextPoison = 0; this.smoke = null;
    this.cds = {}; this.dead = false; this.won = false;
    this.cameras.main.startFollow(p, true, .12, .12);

    // grupos
    this.foes = this.physics.add.group();
    this.foeShots = this.physics.add.group();
    this.myShots = this.physics.add.group();
    this.drops = this.physics.add.group();
    this.corpses = [];
    this.physics.add.collider(p, this.rocks);
    this.physics.add.collider(this.foes, this.rocks);
    this.physics.add.collider(this.foes, this.foes);
    this.physics.add.overlap(p, this.foes, (pl, e) => { if (!e.dead) this.hurt(e.cfg.touch); });
    this.physics.add.overlap(p, this.foeShots, (pl, o) => { this.hurt(o.dmg, o.poison); o.destroy(); });
    this.physics.add.overlap(this.myShots, this.foes, (o, e) => this.shotHit(o, e));
    this.physics.add.overlap(p, this.drops, (pl, u) => this.takeDrop(u));
    this.physics.add.collider(this.myShots, this.rocks, o => { if (o.kind === 'galleta') this.puff(o); else if (o.kind === 'baculo') o.back = true; else if (o.kind === 'plasma') this.explode(o); });

    // Muqui Z
    const b = this.boss = this.physics.add.sprite(W * .75, H * .5, 'minero', 0).setOrigin(.5, .92).setScale(BOSS.scale);
    b.body.setSize(90, 60).setOffset(73, 160); b.body.setCollideWorldBounds(true); b.body.setImmovable(true);
    b.play('muqui-idle3');
    b.hp = b.max = BOSS.hp; b.state = 'intro'; b.until = this.time.now + 1800; b.alive = true; b.phase = 0;
    this.physics.add.collider(b, this.rocks);
    this.physics.add.collider(p, b, () => { if (b.alive) this.hurt(15); });
    this.physics.add.overlap(this.myShots, b, (x, y) => this.shotHit(x === b ? y : x, b));
    showBossPanel(true, BOSS); renderBoss(b.hp, b.max);

    // los primeros ayudantes
    ['sapazo', 'tulixta', 'jumpe', 'aracura'].forEach((k, i) => this.spawnHelper(k, W * .62 + (i % 2) * 120, H * .3 + i * 140));
    this.nextDrop = this.time.now + 9000; this.dropIdx = 0;
    this.nextHelper = this.time.now + 14000;

    // oscuridad (menos que en la mina: hay faroles) y luz de la antorcha
    // Se dibuja en un canvas 2D a 1/4 de resolución (son degradados) que se sube como textura y se agranda ×4.
    // Borrar las luces en una RenderTexture costaba ~17 ms por cuadro (cada operación de WebGL cambia de framebuffer).
    this.darkTex = this.textures.exists('oscuroGuarida') ? this.textures.get('oscuroGuarida') : this.textures.createCanvas('oscuroGuarida', GW / 4, GH / 4);
    this.dark = this.add.image(0, 0, 'oscuroGuarida').setOrigin(0).setScale(4).setScrollFactor(0).setDepth(900);
    this.events.once('shutdown', () => this.barG.destroy());
    this.buildSkillBar();
    this.input.on('pointerdown', ptr => { if (!this.dead && !this.won) this.throwGalleta(ptr.worldX, ptr.worldY); });
    this.hud.banner('¡Muqui Z!', '#ff8a7a');
    this.time.delayedCall(900, () => this.hud.banner('¡Con sus aliados!', '#ffd84a'));
    this.updateHud();
  }

  /* ---------- escenario ---------- */
  buildArena() {
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(-10);
    const wall = this.make.image({ key: 'piedra3', add: false }).setOrigin(0).setScale(48 / 62, 48 / 69);
    for (let y = 0; y < H; y += 48) for (let x = 0; x < W; x += 48) {
      const border = x < 48 || y < 48 || x >= W - 48 || y >= H - 48;
      if (border) rt.draw(wall, x, y); else rt.draw('suelo3_' + (((x + y) / 48) % 2), x, y);
    }
    wall.destroy();
    // rocas para cubrirse (sólidas)
    this.rocks = this.physics.add.staticGroup();
    [[520, 330], [520, 780], [1080, 330], [1080, 780], [800, 200], [800, 900]].forEach(([x, y]) => {
      const r = this.rocks.create(x, y, 'piedra3').setScale(1.1).setDepth(y);
      r.refreshBody();
    });
    // faroles (dan luz) y huesos
    this.lamps = [[160, 160], [W - 160, 160], [160, H - 160], [W - 160, H - 160], [800, 550]];
    this.lamps.forEach(([x, y]) => this.add.image(x, y, 'farol3').setOrigin(.5, 1).setScale(.55).setDepth(y));
    [[350, 560], [1250, 560], [700, 420], [900, 700]].forEach(([x, y]) => this.add.image(x, y, 'huesos3').setOrigin(.5, 1).setScale(.45).setDepth(y - 30));
  }

  /* ---------- barra de habilidades (abajo) ---------- */
  buildSkillBar() {
    const st = { fontFamily: '"Luckiest Guy", "Arial Black", sans-serif', fontSize: '14px', color: '#fff', stroke: '#1d2a44', strokeThickness: 4 };
    // la barra se dibuja en una textura y solo cuando cambia (un Graphics con esquinas redondeadas se vuelve a
    // triangular en cada cuadro en WebGL)
    this.barG = this.make.graphics({ add: false }); this.barState = null;
    this.bar = this.add.renderTexture(GW / 2 - 2 * 64 - 32, GH - 74, 4 * 64 + 64, 64).setOrigin(0).setScrollFactor(0).setDepth(950);
    const icons = { galleta: ['galletaMenta', 0, .9], quipus: ['items', 1, .8], baculo: ['baculo', undefined, .35], plasma: ['items', 8, .8], esquivar: null };
    this.slots = Object.keys(SKILLS).map((k, i) => {
      const x = GW / 2 + (i - 2) * 64, y = GH - 42;
      let ic = null;
      if (icons[k]) { const [tex, f, s] = icons[k]; ic = this.add.image(x, y, tex, f).setScale(s).setScrollFactor(0).setDepth(951); if (k === 'baculo') ic.setAngle(45); }
      else ic = this.add.text(x, y, '»', { ...st, fontSize: '28px' }).setOrigin(.5).setScrollFactor(0).setDepth(951);
      const lab = this.add.text(x - 25, y - 27, SKILLS[k].key, st).setScrollFactor(0).setDepth(952);
      const cnt = this.add.text(x + 26, y + 26, '', st).setOrigin(1).setScrollFactor(0).setDepth(952);
      return { k, x, y, ic, lab, cnt };
    });
    this.itemTxt = this.add.text(GW - 16, 14, '', { ...st, fontSize: '16px', align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(952);
  }
  drawSkillBar(time) {
    const state = this.slots.map(s => {
      s.frac = Math.max(0, (this.cds[s.k] || 0) - time) / SKILLS[s.k].cd;
      s.off = (s.k === 'baculo' && !this.run.cetro) || (s.k === 'plasma' && !this.run.inv.plasma);
      return (s.off ? 'x' : '') + Math.ceil(s.frac * 26);
    }).join(',') + this.run.inv.plasma;
    this.itemTxt.setText(`Q quipu x${this.run.inv.quipu}   E Casino x${this.run.inv.casino}\n` +
      Object.entries(this.run.runes).map(([k, n]) => `${RUNES[k].name} ${'I'.repeat(n)}`).join('\n'));
    if (state === this.barState) return;
    this.barState = state;
    const g = this.barG; g.clear();
    this.slots.forEach(s => {
      g.fillStyle(0x1d2a44, .75).fillRoundedRect(s.x - 28, s.y - 28, 56, 56, 8);
      const frac = s.frac, off = s.off;
      if (frac > 0 || off) g.fillStyle(0x000000, .6).fillRect(s.x - 26, s.y - 26 + 52 * (off ? 0 : 1 - frac), 52, off ? 52 : 52 * frac);
      g.lineStyle(2, frac > 0 || off ? 0x5a4a3a : 0xffd84a).strokeRoundedRect(s.x - 28, s.y - 28, 56, 56, 8);
      s.cnt.setText(s.k === 'plasma' ? 'x' + this.run.inv.plasma : '');
    });
    this.bar.clear().draw(g, -this.bar.x, -this.bar.y);
  }

  updateHud() { renderHud({ hp: this.run.hp, max: this.run.maxHp, score: this.run.score, coins: this.run.coins, time: 0, char: 'xoxurInka' }); }

  /* ---------- ayudantes de Muqui Z ---------- */
  spawnHelper(kind, x, y) {
    const c = HELP[kind], f = FOES[kind];
    const e = this.foes.create(x, y, f.sheet, f.map.idle[0]).setOrigin(.5, .9).setScale(c.scale);
    e.body.setCircle(Math.min(e.width, e.height) * .28, e.width / 2 - Math.min(e.width, e.height) * .28, e.height * .55);
    e.kind = kind; e.cfg = c; e.hp = e.max = c.hp; e.dead = false; e.stunUntil = 0; e.poisonUntil = 0; e.nextPoison = 0;
    e.nextShot = this.time.now + 1500 + Math.random() * 1500; e.channel = null;
    e.play(kind + '-walk3');
    // aparece desde el suelo
    e.setAlpha(0); this.tweens.add({ targets: e, alpha: 1, duration: 400 });
    return e;
  }

  updateHelpers(time, dt) {
    const p = this.player, b = this.boss;
    this.foes.getChildren().forEach(e => {
      if (e.dead) return;
      e.setDepth(e.y);
      if (time < e.poisonUntil && time > e.nextPoison) { e.nextPoison = time + 1000; this.damageFoe(e, 3, false, true); if (e.dead) return; }
      if (time < e.stunUntil) { e.setVelocity(0, 0); return; }
      const c = e.cfg, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      // Aracura revive a los caídos (canaliza 2 s junto a los restos)
      if (e.kind === 'aracura' && this.corpses.length) {
        const r = this.corpses.reduce((a, q) => Phaser.Math.Distance.Between(e.x, e.y, q.x, q.y) < Phaser.Math.Distance.Between(e.x, e.y, a.x, a.y) ? q : a);
        const rd = Phaser.Math.Distance.Between(e.x, e.y, r.x, r.y);
        if (rd > 40) { this.physics.moveTo(e, r.x, r.y, c.speed * 1.2); e.setFlipX(r.x < e.x); e.channel = null; return; }
        e.setVelocity(0, 0);
        if (!e.channel) { e.channel = time + 2000; this.hud.popup('Aracura cura…', e.x, e.y - 60); }
        else if (time > e.channel) { e.channel = null; this.revive(r); }
        return;
      }
      // moverse: los de ataque a distancia guardan distancia, el resto persigue
      let vx = dx / d * c.speed, vy = dy / d * c.speed;
      if (c.keep && d < c.keep) { vx = -vx * .7; vy = -vy * .7; }
      else if (c.keep && d < c.keep + 60) { vx = -dy / d * c.speed * .6; vy = dx / d * c.speed * .6; }  // rodea
      e.setVelocity(vx, vy); e.setFlipX(dx < 0);
      // ataques a distancia
      if (c.shot && time > e.nextShot && d < 520) {
        e.nextShot = time + c.shot.every + Math.random() * 600;
        this.foeShot(e.x, e.y - e.displayHeight * .5, p.x, p.y - 20, 300, c.shot);
      }
      // el Carbunco: carga el rayo de la gema (línea de aviso) y dispara
      if (c.ray && time > e.nextShot && d < 600) {
        e.nextShot = time + c.ray.every;
        this.carbuncoRay(e);
      }
    });
    // cada tanto llega otro ayudante si hay pocos
    if (b.alive && time > this.nextHelper) {
      this.nextHelper = time + 16000;
      if (this.foes.getChildren().filter(e => !e.dead).length < 5) this.callHelpers(1);
    }
  }

  callHelpers(n, withCarbunco = false) {
    const kinds = ['sapazo', 'tulixta', 'jumpe', 'aracura'];
    const list = Array.from({ length: n }, () => Phaser.Utils.Array.GetRandom(kinds));
    if (withCarbunco) list.push('carbunco');
    list.forEach((k, i) => {
      const corner = Phaser.Utils.Array.GetRandom([[200, 200], [W - 200, 200], [200, H - 200], [W - 200, H - 200]]);
      this.spawnHelper(k, corner[0] + i * 30, corner[1]);
    });
  }

  foeShot(x, y, tx, ty, speed, s) {
    const o = this.add.circle(x, y, s.big ? 16 : 9, s.color, .9).setDepth(2000);
    this.physics.add.existing(o); this.foeShots.add(o);
    o.body.setCircle(s.big ? 16 : 9);
    this.physics.moveTo(o, tx, ty, speed);
    o.dmg = s.dmg; o.poison = !!s.poison;
    this.time.delayedCall(2600, () => o.active && o.destroy());
    sfx(s.big ? 200 : 500, s.big ? 90 : 250, .15, 'square', .04);
    return o;
  }

  carbuncoRay(e) {
    const p = this.player, ang = Phaser.Math.Angle.Between(e.x, e.y - 60, p.x, p.y - 20);
    const g = this.add.graphics().setDepth(2000);
    g.lineStyle(4, 0x7dffea, .5).lineBetween(e.x, e.y - 60, e.x + Math.cos(ang) * 900, e.y - 60 + Math.sin(ang) * 900);
    e.setVelocity(0, 0); e.anims.stop(); e.setFrame(25); e.stunUntil = this.time.now + 1100;
    sfx(200, 800, .8, 'sawtooth', .04);
    this.time.delayedCall(900, () => {
      g.clear();
      if (!e.active || e.dead) { g.destroy(); return; }
      e.setFrame(26);
      g.lineStyle(14, 0x7dffea, .9).lineBetween(e.x, e.y - 60, e.x + Math.cos(ang) * 900, e.y - 60 + Math.sin(ang) * 900);
      this.cameras.main.shake(150, .005);
      // ¿Inkaxur está sobre la línea del rayo?
      const px = p.x - e.x, py = (p.y - 20) - (e.y - 60), along = px * Math.cos(ang) + py * Math.sin(ang);
      const perp = Math.abs(-px * Math.sin(ang) + py * Math.cos(ang));
      if (along > 0 && along < 900 && perp < 26) this.hurt(e.cfg.ray.dmg);
      this.time.delayedCall(200, () => { g.destroy(); if (e.active && !e.dead) e.play('carbunco-walk3'); });
    });
  }

  revive(r) {
    this.corpses = this.corpses.filter(q => q !== r);
    r.sprite.destroy();
    const e = this.spawnHelper(r.kind, r.x, r.y);
    e.setTint(0x9dff6a); this.time.delayedCall(600, () => e.active && e.clearTint());
    this.hud.popup(`¡Aracura revivió a ${FOES[r.kind].name}!`, e.x, e.y - 70);
    sfx(300, 900, .4, 'triangle', .06);
  }

  /* ---------- Muqui Z ---------- */
  updateBoss(time) {
    const b = this.boss, p = this.player;
    if (!b.alive) return;
    b.setDepth(b.y);
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (b.state === 'intro') { if (time > b.until) { b.state = 'walk'; b.until = time + 1500; } return; }
    if (b.state === 'walk') {
      b.setVelocity(dx / d * 70, dy / d * 70); b.setFlipX(dx < 0);
      if (!b.anims.isPlaying || b.anims.currentAnim.key !== 'muqui-walk3') b.play('muqui-walk3');
      if (time > b.until) this.bossAttack(time, d);
    } else if (time > b.until) { b.state = 'walk'; b.until = time + 1200 + Math.random() * 900 - b.phase * 200; }
  }

  bossAttack(time, d) {
    const b = this.boss, p = this.player;
    b.setVelocity(0, 0); b.anims.stop();
    const pick = d < 190 ? 'farol' : Phaser.Utils.Array.GetRandom(['puno', 'puno', 'pico', 'humo']);
    b.state = 'attack'; b.until = time + 1300;
    if (pick === 'farol') {
      // golpe con farol y pico alrededor (aviso: un anillo)
      b.setFrame(29);
      const ring = this.add.circle(b.x, b.y - 30, 150, 0xff5a4a, .18).setStrokeStyle(3, 0xff5a4a).setDepth(1).setScale(.3);
      this.tweens.add({ targets: ring, scale: 1, duration: 650 });
      this.time.delayedCall(650, () => {
        ring.destroy(); if (!b.alive) return;
        b.setFrame(32); this.cameras.main.shake(200, .01); SND.stomp();
        if (Phaser.Math.Distance.Between(b.x, b.y - 30, p.x, p.y) < 160) this.hurt(20);
      });
    } else if (pick === 'puno') {
      // puño de humo: se estira hacia Inkaxur
      b.setFrame(24);
      this.time.delayedCall(350, () => {
        if (!b.alive) return;
        b.setFrame(26);
        this.foeShot(b.x + (p.x > b.x ? 60 : -60), b.y - 90, p.x, p.y - 20, 520, { dmg: 16, color: 0x7dffb0, big: true });
      });
    } else if (pick === 'pico') {
      // lanza el pico: va y vuelve
      b.setFrame(38);
      this.time.delayedCall(300, () => {
        if (!b.alive) return;
        b.setFrame(40);
        const o = this.physics.add.image(b.x, b.y - 100, 'pico3').setScale(.45).setDepth(2000);
        this.foeShots.add(o); o.body.setCircle(40, 30, 10); o.dmg = 18;
        o.setAngularVelocity(720);
        this.physics.moveTo(o, p.x, p.y - 20, 460);
        this.time.delayedCall(900, () => { if (o.active) this.physics.moveTo(o, b.x, b.y - 100, 460); });
        this.time.delayedCall(1900, () => o.active && o.destroy());
      });
    } else {
      // humo del farol: una nube donde está Inkaxur que lo frena y lo daña de a poco
      b.setFrame(28);
      const cx = p.x, cy = p.y - 10;
      const cloud = this.add.circle(cx, cy, 110, 0x6a8a3a, .35).setDepth(1);
      this.tweens.add({ targets: cloud, alpha: .55, duration: 400, yoyo: true, repeat: 5, onComplete: () => cloud.destroy() });
      this.smoke = { x: cx, y: cy, until: time + 4400, next: 0 };
    }
  }

  // Muqui Z llama a los enemigos de la mina cuando pierde vida
  bossPhase() {
    const b = this.boss, frac = b.hp / b.max;
    const phases = [.75, .5, .25];
    while (b.phase < phases.length && frac <= phases[b.phase]) {
      b.phase++;
      this.hud.banner('¡Muqui Z llama a sus aliados!', '#ff8a7a');
      this.cameras.main.shake(300, .006);
      this.callHelpers(2, b.phase === 2);
    }
  }

  /* ---------- ataques de Inkaxur ---------- */
  aim() {
    const ptr = this.input.activePointer;
    return ptr.isDown ? { x: ptr.worldX, y: ptr.worldY } : { x: this.player.x + this.face.x * 300, y: this.player.y - 20 + this.face.y * 300 };
  }
  ready(k, time) { return time >= (this.cds[k] || 0); }
  use(k, time) { this.cds[k] = time + SKILLS[k].cd; }
  dmgOf(k) {
    const r = this.run.runes, [a, b] = SKILLS[k].dmg;
    return a + Math.floor(Math.random() * (b - a + 1)) + (k === 'galleta' ? 3 * (r.galleta || 0) : k === 'baculo' ? 6 * (r.baculo || 0) : 0);
  }

  throwGalleta(tx, ty) {
    const time = this.time.now;
    if (!this.ready('galleta', time)) return;
    this.use('galleta', time);
    const p = this.player;
    const o = this.physics.add.sprite(p.x, p.y - 30, 'galletaMenta', 0).play('menta-spin').setDepth(2000);
    this.myShots.add(o); o.kind = 'galleta'; o.body.setCircle(11, 5, 5);
    this.physics.moveTo(o, tx, ty, 560);
    this.time.delayedCall(900, () => o.active && this.puff(o));
    this.pose(24); sfx(700, 350, .1, 'square', .05);
  }

  quipus(time) {
    if (!this.ready('quipus', time)) return;
    this.use('quipus', time);
    const p = this.player, R = 110;
    const ring = this.add.circle(p.x, p.y - 20, R, 0xffd84a, .2).setStrokeStyle(5, 0xff5a4a).setDepth(1999).setScale(.2);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.pose(23); sfx(500, 200, .2, 'sawtooth', .06);
    const hitIt = e => {
      if (Phaser.Math.Distance.Between(p.x, p.y - 20, e.x, e.y - 20) < R + 30) {
        e.stunUntil = time + 1200;
        this.damageFoe(e, this.dmgOf('quipus'));
      }
    };
    this.foes.getChildren().filter(e => !e.dead).forEach(hitIt);
    if (this.boss.alive && Phaser.Math.Distance.Between(p.x, p.y, this.boss.x, this.boss.y) < R + 90) this.damageFoe(this.boss, this.dmgOf('quipus'));
  }

  baculo(time) {
    if (!this.run.cetro || !this.ready('baculo', time) || this.myShots.getChildren().some(o => o.kind === 'baculo')) return;
    this.use('baculo', time);
    const p = this.player, a = this.aim();
    const o = this.physics.add.image(p.x, p.y - 30, 'baculo').setScale(.6).setDepth(2000);
    this.myShots.add(o); o.kind = 'baculo'; o.body.setCircle(18, -5, 25); o.hitSet = new Set(); o.born = time;
    o.setAngularVelocity(1000);
    this.physics.moveTo(o, a.x, a.y, 620);
    this.pose(24); sfx(300, 700, .18, 'sawtooth', .05);
  }

  plasma(time) {
    if (!this.run.inv.plasma || !this.ready('plasma', time)) return;
    this.use('plasma', time); this.run.inv.plasma--;
    const p = this.player, a = this.aim();
    const o = this.physics.add.image(p.x, p.y - 30, 'items', 8).setBlendMode(Phaser.BlendModes.ADD).setDepth(2000);
    this.myShots.add(o); o.kind = 'plasma'; o.body.setCircle(14, 6, 6);
    this.physics.moveTo(o, a.x, a.y, 420);
    this.time.delayedCall(700, () => o.active && this.explode(o));
    this.pose(24); sfx(200, 900, .3, 'triangle', .08);
  }

  explode(o) {
    const x = o.x, y = o.y; o.destroy();
    this.cameras.main.flash(200, 150, 255, 190); this.cameras.main.shake(200, .008);
    const ring = this.add.circle(x, y, 20, 0x7dffb0, .5).setDepth(2001).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    const dmg = this.dmgOf('plasma');
    this.foes.getChildren().filter(e => !e.dead && Phaser.Math.Distance.Between(x, y, e.x, e.y - 20) < 150).forEach(e => this.damageFoe(e, dmg));
    if (this.boss.alive && Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y - 80) < 190) this.damageFoe(this.boss, dmg);
  }

  puff(o) {
    const s = this.add.circle(o.x, o.y, 8, 0x9dffb0, .8).setDepth(2001);
    this.tweens.add({ targets: s, scale: 2.5, alpha: 0, duration: 250, onComplete: () => s.destroy() });
    o.destroy();
  }

  shotHit(o, e) {
    if (!o.active || e.dead || (e === this.boss && !this.boss.alive)) return;
    if (o.kind === 'plasma') { this.explode(o); return; }
    if (o.kind === 'baculo') {
      if (o.hitSet.has(e)) return;
      o.hitSet.add(e); o.back = true;
      this.damageFoe(e, this.dmgOf('baculo'));
      return;
    }
    this.damageFoe(e, this.dmgOf('galleta'));
    this.puff(o);
  }

  // daño a un ayudante o al jefe: crítico (runa del cóndor), veneno (runa), números flotantes
  damageFoe(e, n, canCrit = true, isPoison = false) {
    const r = this.run.runes, isBoss = e === this.boss;
    let crit = false;
    if (canCrit && Math.random() < .06 + .08 * (r.condor || 0)) { n *= 2; crit = true; }
    if (isBoss && !isPoison) n *= 2;  // Inkaxur hace el doble de daño a los jefes
    e.hp = Math.max(0, e.hp - n);
    e.setTintFill(isPoison ? 0x9dff6a : 0xffffff); this.time.delayedCall(80, () => e.active && e.clearTint());
    const t = this.add.text(e.x + Phaser.Math.Between(-16, 16), e.y - e.displayHeight * .8, (crit ? '¡CRÍTICO! ' : '') + n,
      { fontFamily: '"Luckiest Guy", sans-serif', fontSize: crit ? '28px' : '22px', color: crit ? '#ff8a3a' : isPoison ? '#9dff6a' : '#ffd84a', stroke: '#1d2a44', strokeThickness: 5 }).setOrigin(.5).setDepth(3000);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    if (!isPoison) sfx(260, 140, .08, 'square', .05);
    if (!isPoison && r.veneno && Math.random() < .15 * r.veneno) { e.poisonUntil = this.time.now + 3000; e.nextPoison = this.time.now + 1000; }
    if (isBoss) {
      renderBoss(e.hp, e.max);
      if (e.hp <= 0) this.bossDies(); else this.bossPhase();
      return;
    }
    const fr = FRAMES[e.kind];
    if (e.hp > 0) { if (fr.hit != null) { e.anims.stop(); e.setFrame(fr.hit); this.time.delayedCall(250, () => e.active && !e.dead && e.play(e.kind + '-walk3')); } return; }
    // cae: quedan sus restos (Aracura puede revivirlo)
    e.dead = true; e.setVelocity(0, 0); e.body.enable = false; e.anims.stop();
    if (fr.ko != null) e.setFrame(fr.ko);
    this.run.score += 300; this.run.coins += 2; this.updateHud();
    const heal = 5 * (r.quipu || 0);
    if (heal) { this.run.hp = Math.min(this.run.maxHp, this.run.hp + heal); this.updateHud(); }
    this.tweens.add({ targets: e, alpha: .45, duration: 400 });
    e.setTint(0x777777);
    this.corpses.push({ kind: e.kind, x: e.x, y: e.y, sprite: e });
    if (Math.random() < .3) this.drop(Phaser.Utils.Array.GetRandom(['quipu', 'plasma', 'coins']), e.x, e.y);
  }

  // pose de lanzar (cuadros de costado de xoxur_inka.png) por un momento; después vuelve a la hoja del mapa
  pose(frame) {
    const p = this.player, a = this.aim();
    this.poseUntil = this.time.now + 220; p.anims.stop();
    p.setTexture('xoxurInka', frame).setFlipX(a.x < p.x);
  }

  /* ---------- ítems ---------- */
  drop(kind, x, y) {
    const frame = { casino: 5, quipu: 1, plasma: 8, coins: null }[kind];
    const u = kind === 'coins' ? this.drops.create(x, y - 20, 'coinT') : this.drops.create(x, y - 20, 'items', frame);
    u.kind = kind; u.setDepth(y);
    this.tweens.add({ targets: u, y: u.y - 10, duration: 500, yoyo: true, repeat: -1 });
    this.time.delayedCall(15000, () => u.active && u.destroy());
  }
  takeDrop(u) {
    const k = u.kind; u.destroy(); SND.coin();
    if (k === 'coins') { this.run.coins += 3; this.run.score += 600; this.hud.popup('+3 monedas', this.player.x, this.player.y - 70); }
    else { this.run.inv[k]++; this.hud.popup({ casino: '¡Casino!', quipu: '¡Quipu!', plasma: '¡Esfera de plasma!' }[k], this.player.x, this.player.y - 70); }
    this.updateHud();
  }
  useItem(k) {
    if (!this.run.inv[k] || this.run.hp >= this.run.maxHp) return;
    this.run.inv[k]--;
    this.run.hp = Math.min(this.run.maxHp, this.run.hp + (k === 'casino' ? this.run.maxHp : 30));
    SND.up(); this.player.setTint(0x9dff6a); this.time.delayedCall(300, () => this.player.clearTint());
    this.hud.popup(k === 'casino' ? '¡Energía llena!' : '+30', this.player.x, this.player.y - 70);
    this.updateHud();
  }

  /* ---------- daño a Inkaxur ---------- */
  hurt(n, poison) {
    const now = this.time.now;
    if (this.dead || this.won || now < this.invuln || now < this.dashUntil) return;
    this.run.hp = Math.max(0, this.run.hp - n); this.invuln = now + 800;
    if (poison) { this.poisonUntil = now + 3000; this.nextPoison = now + 1000; }
    SND.hurt(); this.cameras.main.shake(120, .005);
    this.hud.popup('-' + n, this.player.x, this.player.y - 70);
    this.updateHud();
    if (this.run.hp <= 0) this.die();
  }

  /* ---------- fin ---------- */
  bossDies() {
    const b = this.boss;
    b.alive = false; b.setVelocity(0, 0); b.anims.stop(); b.setFrame(36);
    this.run.score += 8000; this.run.coins += 50; this.updateHud();
    SND.stomp(); this.cameras.main.flash(400, 255, 230, 150); this.cameras.main.shake(600, .012);
    this.tweens.add({ targets: b, alpha: 0, angle: -20, delay: 600, duration: 1200 });
    // sus ayudantes huyen: caen todos
    this.foes.getChildren().filter(e => !e.dead).forEach(e => { e.dead = true; e.body.enable = false; this.tweens.add({ targets: e, alpha: 0, duration: 600 }); });
    this.foeShots.clear(true, true);
    showBossPanel(false);
    this.won = true;
    this.hud.banner('¡Venciste a Muqui Z!', '#9dff6a');
    this.time.delayedCall(1600, () => this.geyserExit());
  }

  // final: se abre un géiser en una esquina de la guarida, Inkaxur camina hasta él y sale disparado hacia arriba;
  // después viene la escena final con las dos imágenes (Escena.js)
  geyserExit() {
    const p = this.player, gx = W - 170, gy = 170;  // esquina de arriba a la derecha
    this.add.ellipse(gx, gy, 96, 36, 0x1a120c).setStrokeStyle(3, 0x6a5a4a).setDepth(gy - 40);
    const steam = this.time.addEvent({ delay: 110, loop: true, callback: () => {
      const c = this.add.circle(gx + Phaser.Math.Between(-22, 22), gy - 8, Phaser.Math.Between(6, 12), 0xdff6ff, .6).setDepth(gy + 50);
      this.tweens.add({ targets: c, y: c.y - 70, alpha: 0, scale: 2, duration: 700, onComplete: () => c.destroy() });
    } });
    this.hud.popup('¡Un géiser!', gx, gy - 70);
    this.lamps.push([gx, gy + 40]);  // el vapor también ilumina un poco
    // camina solo hasta el géiser
    const tx = gx, ty = gy + 8, dx = tx - p.x, dy = ty - p.y;
    const dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    p.body.enable = false;
    p.setTexture('inkaxurMapa').setFlipX(false).play('mapa-' + dir);
    this.tweens.add({
      targets: p, x: tx, y: ty, duration: Phaser.Math.Distance.Between(p.x, p.y, tx, ty) / 200 * 1000,
      onUpdate: () => { p.setDepth(p.y); this.pShadow.setPosition(p.x, p.y - 2).setDepth(p.y - 1); },
      onComplete: () => {
        p.anims.stop(); p.setFrame(MAP_STAND.down);
        this.cameras.main.shake(700, .006); sfx(80, 60, .8, 'sawtooth', .08);
        this.time.delayedCall(700, () => {
          steam.remove();
          // erupción: columna de agua y vapor, y Inkaxur sale volando con los brazos arriba
          const col = this.add.rectangle(gx, gy + 12, 76, 10, 0xbfefff, .85).setOrigin(.5, 1).setDepth(gy + 60);
          this.tweens.add({ targets: col, displayHeight: 1000, duration: 500, ease: 'Quad.out' });
          this.time.addEvent({ delay: 60, repeat: 30, callback: () => {
            const d = this.add.circle(gx + Phaser.Math.Between(-60, 60), gy + Phaser.Math.Between(-40, 10), Phaser.Math.Between(4, 9), 0xe8fbff, .8).setDepth(gy + 61);
            this.tweens.add({ targets: d, x: d.x + Phaser.Math.Between(-80, 80), y: d.y - Phaser.Math.Between(40, 160), alpha: 0, duration: 600, onComplete: () => d.destroy() });
          } });
          this.cameras.main.stopFollow(); this.pShadow.setVisible(false);
          p.setTexture('inkaxurVuelo', 16).setDepth(gy + 62);
          SND.win(); this.cameras.main.shake(500, .012);
          this.tweens.add({ targets: p, y: p.y - 900, delay: 150, duration: 1400, ease: 'Quad.in' });
          this.time.delayedCall(1300, () => this.cameras.main.fadeOut(700, 255, 255, 255));
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('escena', { cut: 'final3', run: this.run, next: { key: 'cusco', data: { score: this.run.score, coins: this.run.coins } } }));
        });
      }
    });
  }

  die() {
    this.dead = true; SND.die();
    this.player.setVelocity(0, 0); this.player.anims.stop(); this.player.setTexture('xoxurInka', 33);
    this.foes.getChildren().forEach(e => e.setVelocity && e.setVelocity(0, 0));
    this.boss.setVelocity(0, 0);
    showBossPanel(false);
    this.time.delayedCall(1200, () => showOverlay('over', { score: this.run.score }));
  }

  /* ---------- bucle ---------- */
  update(time, delta) {
    this.drawDark();
    this.drawSkillBar(time);
    if (this.dead || this.won) return;
    const p = this.player, k = this.controls.keys, J = Phaser.Input.Keyboard.JustDown;
    // movimiento libre en 8 direcciones
    let mx = ((k.r.isDown || k.d.isDown || touch.right) ? 1 : 0) - ((k.l.isDown || k.a.isDown || touch.left) ? 1 : 0);
    let my = ((k.dn.isDown || k.s.isDown || touch.down) ? 1 : 0) - ((k.up.isDown || k.w.isDown || touch.jump) ? 1 : 0);
    if (mx || my) { const l = Math.hypot(mx, my); mx /= l; my /= l; this.face = { x: mx, y: my }; }
    let sp = SPEED * (this.smoke && time < this.smoke.until && Phaser.Math.Distance.Between(p.x, p.y, this.smoke.x, this.smoke.y) < 120 ? .5 : 1);
    if ((J(k.sh) || J(k.x)) && this.ready('esquivar', time)) {
      this.use('esquivar', time); this.dashUntil = time + 200; SND.jump();
      this.dashDir = (mx || my) ? { x: mx, y: my } : this.face;
    }
    if (time < this.dashUntil) p.setVelocity(this.dashDir.x * DASH, this.dashDir.y * DASH);
    else p.setVelocity(mx * sp, my * sp);
    // humo del farol: daño de a poco
    if (this.smoke && time < this.smoke.until && time > this.smoke.next && Phaser.Math.Distance.Between(p.x, p.y, this.smoke.x, this.smoke.y) < 120) { this.smoke.next = time + 800; this.hurt(4); }
    // veneno
    if (time < this.poisonUntil && time > this.nextPoison) { this.nextPoison = time + 1000; this.run.hp = Math.max(0, this.run.hp - 3); this.hud.popup('-3', p.x, p.y - 70); this.updateHud(); if (this.run.hp <= 0) { this.die(); return; } }
    // ataques
    if (J(k.c) || (touch.fireAt !== this.lastFire && (this.lastFire = touch.fireAt, true))) { const a = this.aim(); this.throwGalleta(a.x, a.y); }
    if (J(this.key1)) this.quipus(time);
    if ((J(this.key2) || J(k.v) || (touch.fire2At !== this.lastFire2 && (this.lastFire2 = touch.fire2At, true)))) this.baculo(time);
    if (J(this.key3)) this.plasma(time);
    if (J(this.keyQ)) this.useItem('quipu');
    if (J(this.keyE)) this.useItem('casino');
    // báculo: vuelve a la mano
    this.myShots.getChildren().forEach(o => {
      if (o.kind !== 'baculo') return;
      if (!o.back && time - o.born > 420) o.back = true;
      if (o.back) { this.physics.moveTo(o, p.x, p.y - 30, 680); if (Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y - 30) < 30) o.destroy(); }
    });
    // animación de Inkaxur (de costado al ir a los lados, de frente al subir/bajar)
    if (time > (this.poseUntil || 0)) {
      if (p.texture.key !== 'inkaxurMapa') p.setTexture('inkaxurMapa', MAP_STAND[this.dir]).setFlipX(false);
      if (mx || my) { this.dir = Math.abs(mx) >= Math.abs(my) ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down'); p.anims.play('mapa-' + this.dir, true); }
      else { p.anims.stop(); p.setFrame(MAP_STAND[this.dir]); }
    }
    p.setAlpha(time < this.invuln || time < this.dashUntil ? (Math.floor(time / 70) % 2 ? .4 : 1) : 1);
    p.setDepth(p.y); this.pShadow.setPosition(p.x, p.y - 2).setDepth(p.y - 1);
    this.updateHelpers(time, delta / 1000);
    this.updateBoss(time);
    // ítems que caen durante la pelea (como en las otras peleas con jefes)
    if (time > this.nextDrop) {
      this.nextDrop = time + 12000;
      const k2 = ['casino', 'plasma', 'quipu', 'plasma'][this.dropIdx++ % 4];
      this.drop(k2, Phaser.Math.Between(200, W - 200), Phaser.Math.Between(200, H - 200));
    }
  }

  // oscuridad con la luz de la antorcha de Inkaxur y de los faroles
  drawDark() {
    const cam = this.cameras.main, p = this.player, c = this.darkTex, ctx = c.context, q = 4;  // (el canvas está a 1/4)
    const luz = this.textures.get('luz3').getSourceImage();
    // hueco de luz: el degradado de la antorcha (radio 210 × escala) borra la oscuridad
    const hole = (x, y, sc) => { const r = 210 * sc / q; ctx.drawImage(luz, (x - cam.scrollX) / q - r, (y - cam.scrollY) / q - r, r * 2, r * 2); };
    ctx.globalCompositeOperation = 'copy'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'destination-out';
    hole(p.x, p.y - 30, 1.5);
    this.lamps.forEach(([x, y]) => hole(x, y - 40, .7));
    if (this.boss.alive) hole(this.boss.x, this.boss.y - 100, .7);
    ctx.globalCompositeOperation = 'source-over';
    c.refresh();
  }
}
