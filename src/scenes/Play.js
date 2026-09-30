import Phaser from 'phaser';
import { SHEETS, SPRITE_SHEETS, SPRITE_SHEETS_2, TSET, TF, TS, GW, GH, GROUND_Y, WORLD_GRAVITY, state } from '../config.js';
import { SND } from '../audio.js';
import { createControls } from '../input.js';
import { LW, TOP, buildLevel } from '../level.js';
import { showOverlay, hideOverlay, renderHud, setLevelName } from '../ui.js';
import { makeTextures, createAnims, createFlightAnims } from '../textures.js';
import { buildBackground, buildSolids, buildCoins, buildGalletas, MovingPlatforms } from '../world.js';
import { spawnItem, collectItem, ITEM_FRAMES, ITEMS } from '../items.js';
import { Powers } from '../powers.js';
import { splat, shatter, debris } from '../effects.js';
import { Hud } from '../hud.js';
import { DEMO, attachDemo } from '../demo.js';
import { Player } from '../entities/Player.js';
import { Boss, BOSSES } from '../entities/Boss.js';
import { spawnEnemies, updateEnemies, stompEnemy, touchEnemy, flipEnemy, dropEnemy } from '../entities/enemies.js';

// daño que recibe el jugador según qué lo golpea
const MAX_HP = 100;
const DMG = { enemy: 20, ball: 15, choclo: 2, wave: 20, pit: 30 };  // choclo: los choclos dorados del jefe
// pelea con el jefe: artefactos que caen del cielo cuando el jugador llega a la mitad de su energía,
// y Casino cada minuto mientras tenga 10 o menos
const RESCUE_ITEMS = ['amuleto', 'plasma', 'baston', 'quipu', 'taunt'];
const CASINO_EVERY = 60000;
// jefe final: cae un artefacto cada ARTIFACT_EVERY ms, en ciclos de 4: Casino, balón de gas dorado (si todavía no es
// Inkaxur; si no, uno al azar), Casino y galleta (no más de MAX_FALLEN a la vez)
const ARTIFACT_EVERY = 5000, MAX_FALLEN = 6;
// refuerzos del jefe: cuando llega a la mitad de su vida caen del cielo los enemigos del nivel 1
const REINFORCEMENTS = ['cuy', 'llama', 'cheese', 'imata', 'cuy', 'llama'];

/* ---------- escena principal: coordina el nivel, el jugador, los enemigos y el jefe ---------- */
export class Play extends Phaser.Scene {
  constructor() { super('play'); }

  init(d) {
    this.checkpoint = !!d.checkpoint;
    // energía (puntos de vida): se empieza con 100; al llegar a 0 se acaba el juego
    this.hp = MAX_HP; this.score = d.score ?? 0; this.coins = d.coins ?? 0;
    this.autostart = !!d.autostart;
  }

  preload() {
    const load = this.load, has = k => this.textures.exists(k);
    for (const k in TSET) if (!has(k)) {
      if (k === 'tiles') load.spritesheet(k, TSET[k], { frameWidth: 32, frameHeight: 32 });
      else if (k === 'plat') load.spritesheet(k, TSET[k], { frameWidth: 32, frameHeight: 40 });
      else load.image(k, TSET[k]);
    }
    // también las hojas del nivel 2: el despegue de la cumbre usa los cuadros de vuelo de Inkaxur
    const sheets = { ...SPRITE_SHEETS, ...SPRITE_SHEETS_2 };
    for (const k in sheets) if (!has(k)) {
      const [path, frameWidth, frameHeight] = sheets[k];
      load.spritesheet(k, path, { frameWidth, frameHeight });
    }
    for (const c in SHEETS) if (!has(c)) load.spritesheet(c, SHEETS[c], { frameWidth: 72, frameHeight: 64 });
  }

  create() {
    makeTextures(this);
    createAnims(this);
    createFlightAnims(this);
    setLevelName('Nivel 1 · Cordillera');
    const L = this.L = buildLevel();
    // el mundo sube por encima de la pantalla inicial (el cerro): TOP es negativo
    this.physics.world.setBounds(0, TOP, LW * TS, GH + 200 - TOP);
    this.physics.world.gravity.y = WORLD_GRAVITY;
    this.cameras.main.setBounds(0, TOP, LW * TS, GH - TOP).setBackgroundColor('#7ec8e3');

    // escenario
    buildBackground(this, L);
    ({ solids: this.solids, blocks: this.blocks, gate: this.gate } = buildSolids(this, L));
    this.movers = new MovingPlatforms(this, L);  // plataformas de la arena, con movimiento aleatorio
    this.coinGroup = buildCoins(this, L);
    this.galletas = buildGalletas(this, L, ITEM_FRAMES.galleta);

    // jugador
    const startX = this.checkpoint ? L.checkpointX * TS + 16 : L.startX * TS;
    this.player = new Player(this, startX, state.char);
    if (this.checkpoint) this.cameras.main.scrollX = startX - GW * 0.4;
    this.dead = false; this.won = false; this.safeX = startX; this.safeY = GROUND_Y;
    this.boss = null; this.bossStarted = false; this.bossDone = false; this.bossIndex = 0; this.camLock = null; this.camLockY = 0;
    this.reinforced = false; this.rescueDropped = false; this.nextCasino = 0;
    this.dancing = false;

    // enemigos, poderes y proyectiles
    this.enemies = this.physics.add.group();
    spawnEnemies(this, L, this.checkpoint ? L.arena.x0 + 1 : 0);
    this.powerups = this.physics.add.group();
    this.balls = this.physics.add.group();
    this.choclos = this.physics.add.group();
    this.waves = this.physics.add.group({ allowGravity: false });
    this.hud = new Hud(this);
    this.hud.showBoss(false);  // al reiniciar (intentar de nuevo) no debe quedar la vida del jefe anterior
    this.powers = new Powers(this);
    this.addColliders();
    this.timeLeft = L.time; this.clock = 0;
    this.controls = createControls(this);
    if (DEMO) attachDemo(this);  // ?demo: piloto automático

    this.running = false;
    if (this.autostart) this.begin(); else showOverlay('title');
    this.updateHud();
  }

  addColliders() {
    const P = this.physics.add, p = this.player;
    const hitPlayer = n => this.hurt(n);
    const playing = () => !this.dead && !this.won;

    P.collider(p, this.solids, (pl, t) => p.onSolid(t));
    P.collider(this.enemies, this.solids);
    P.collider(this.powerups, this.solids);
    // plataformas móviles: el jugador, los enemigos y los ítems se paran encima (los jefes no chocan con ellas)
    P.collider(p, this.movers.group);
    P.collider(this.enemies, this.movers.group);
    P.collider(this.powerups, this.movers.group);
    // entre enemigos solo chocan de costado y en el piso: si uno cae desde arriba lo atraviesa (no se apilan)
    P.collider(this.enemies, this.enemies, (a, b) => { a.dir *= -1; b.dir *= -1; },
      (a, b) => a.body.blocked.down && b.body.blocked.down);
    P.overlap(p, this.enemies, (pl, e) => this.onEnemy(e));
    P.collider(this.balls, this.solids, b => splat(this, b));
    P.overlap(p, this.balls, (pl, b) => { if (!playing()) return; splat(this, b); hitPlayer(DMG.ball); });
    P.overlap(p, this.coinGroup, (pl, c) => { c.destroy(); this.addCoin(c.x, c.y, false); });
    P.overlap(p, this.powerups, (pl, u) => { if (u.ready) collectItem(this, u); });
    P.overlap(p, this.galletas, (pl, c) => { c.destroy(); this.addScore(500, c.x, c.y - 10); SND.coin(); });
    P.collider(this.choclos, this.solids, c => shatter(this, c));
    P.overlap(p, this.choclos, (pl, c) => { if (!playing()) return; shatter(this, c); this.hurt(DMG.choclo, false); });  // golpe chico: no da invulnerabilidad
    // las ondas solo dañan si el jugador está en el suelo
    P.overlap(p, this.waves, () => { if (playing() && p.body.bottom >= this.L.arena.floorY - 14) hitPlayer(DMG.wave); });
    // proyectiles del jugador (galletas, bastón, plasma)
    const shots = this.powers.shots;
    P.overlap(shots, this.enemies, (o, e) => this.powers.shotHitsEnemy(o, e));
    P.collider(shots, this.solids, o => this.powers.shotHitsWall(o));
  }

  begin() { this.running = true; hideOverlay(); }

  // cambiar de personaje desde la pantalla de inicio
  setChar(c) { if (this.running || this.dead || this.won) return; this.player.setCharacter(c); }

  /* ---------- puntaje ---------- */
  // el marcador está fuera del lienzo (panel izquierdo, ui.js)
  updateHud() { renderHud({ hp: this.hp, max: MAX_HP, score: this.score, coins: this.coins, time: this.timeLeft, char: this.player.ch }); }

  addScore(n, x, y) {
    this.score += n; this.updateHud();
    if (x !== undefined) this.hud.popup(n, x, y);
  }

  addCoin(x, y, pop) {
    this.coins++; SND.coin();
    this.addScore(200);
    if (pop) {
      const c = this.add.image(x, y, 'coinT').setDepth(30);
      this.tweens.add({ targets: c, y: y - 70, duration: 260, yoyo: true, ease: 'Quad.out', onComplete: () => c.destroy() });
      this.tweens.add({ targets: c, scaleX: .2, duration: 120, yoyo: true, repeat: 3 });
    }
  }

  // balón de gas dorado: Xoxur se transforma en Xoxur Inka (hasta perder la vida)
  transformXoxur() {
    const p = this.player;
    if (p.ch !== 'xoxur') {
      this.hud.popup(p.ch === 'xoxurInka' ? '¡Ya eres Inkaxur!' : 'Solo Xoxur puede usarlo', p.x, p.y - 118);
      return;
    }
    p.setCharacter('xoxurInka'); this.updateHud();
    this.cameras.main.flash(250, 255, 215, 90);
    for (let i = 0; i < 3; i++) this.time.delayedCall(i * 120, () => this.powers.sparkle(p.x + Phaser.Math.Between(-16, 16), p.y - Phaser.Math.Between(0, 40)));
    this.hud.banner('¡INKAXUR!', '#ffd84a');
    if (this.boss?.alive) this.hud.popup('¡Daño x2 al jefe!', p.x, p.y - 118);
  }

  // multiplicador del daño de lo que lanza el jugador al jefe: Inkaxur hace el doble
  // (el jefe solo existe durante su pelea, así que vale solo ahí)
  throwMul() { return this.player.ch === 'xoxurInka' ? 2 : 1; }

  // empujón (hacha de El Sacrificador): Xoxur sale despedido hacia dir; el amuleto y el taunt lo protegen
  knockPlayer(dir) {
    const p = this.player;
    if (this.dead || this.won || this.powers.has('taunt') || this.powers.has('amuleto')) return;
    p.body.setVelocity(dir * 480, -320);
    p.pushedUntil = this.time.now + 450; p.jumping = true; p.lastGround = -1e9;
    this.cameras.main.shake(140, .006);
  }

  // recuperar energía (quipu +30, Casino la llena)
  heal(n) {
    this.hp = Math.min(MAX_HP, this.hp + n); this.updateHud();
    const p = this.player;
    this.hud.popup('+' + n, p.x + 30, p.y - 40);
    if (n >= MAX_HP) this.hud.banner('¡Energía llena!', '#7dff9a');
  }

  /* ---------- bloques ---------- */
  hitBlock(t) {
    const type = t.getData('type'), cx = t.x, cy = t.y;
    // enemigos parados encima salen volando
    this.enemies.getChildren().forEach(e => {
      if (!e.dead && e.body.enable && Math.abs(e.x - cx) < 30 && Math.abs(e.body.bottom - (cy - 16)) < 6) flipEnemy(this, e);
    });
    if (type === 'brick' && this.player.big) {
      SND.brk(); this.addScore(50);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) =>
        debris(this, cx + dx * 8, cy + dy * 8, 'shard', undefined, { vx: dx * 120, vy: dy < 0 ? -480 : -300, spin: dx * 400 }));
      delete this.blocks[t.getData('tx') + ',' + t.getData('ty')]; t.destroy();
      return;
    }
    if (['stone', 'bwall', 'plat', 'used', 'ground'].includes(type)) { SND.bump(); return; }
    this.tweens.add({ targets: t, y: cy - 10, duration: 70, yoyo: true });
    if (type === 'brick') { SND.bump(); return; }
    // caja con premio
    t.setFrame(TF.used); t.setData('type', 'used');
    if (type === 'coin') this.addCoin(cx, cy - 32, true);
    if (type === 'power') {
      SND.bump();
      spawnItem(this, this.L.boxItems[t.getData('tx') + ',' + t.getData('ty')], cx, cy);
    }
  }

  /* ---------- enemigos y jefe ---------- */
  onEnemy(e) {
    if (e.dead || this.dead || this.won) return;
    const p = this.player;
    // taunt vengativo: todo lo que tocas sale volando
    if (this.powers.has('taunt')) { flipEnemy(this, e); return; }
    if (p.isStomping(e.body.top, 16)) {
      stompEnemy(this, e);
      p.bounce(this.controls.jumpHeld(), -560, -360);
      return;
    }
    if (touchEnemy(this, e)) return;
    this.hurt(DMG.enemy);
  }

  // pelea en la cima: la cámara se fija en la arena y entra el jefe que toca (Inka Locu, luego El Sacrificador)
  startBoss() {
    const A = this.L.arena;
    this.bossStarted = true;
    this.camLock = A.x0 * TS;
    this.camLockY = A.floorY + 64 - GH;  // el piso de la arena queda abajo de la pantalla, como el suelo
    this.reinforced = false; this.rescueDropped = false;
    this.boss = new Boss(this, BOSSES[A.bosses[this.bossIndex]]);
    // al empezar la pelea con el último jefe (El Sacrificador) caen del cielo 2 paquetes de Casino
    if (this.bossIndex === A.bosses.length - 1) {
      [0, 1].forEach(i => this.time.delayedCall(900 + i * 450, () => this.dropItem('casino', this.arenaX(i, 2))));
      this.nextArtifact = this.time.now + 4000; this.artifactCount = 0;
    }
  }

  // el jefe perdió vida: a la mitad caen del cielo los enemigos del nivel 1 a ayudarlo,
  // repartidos por la arena y caminando unos hacia la izquierda y otros hacia la derecha
  onBossHp(hp, max) {
    if (this.reinforced || hp > max / 2 || hp <= 0) return;
    this.reinforced = true;
    this.hud.banner(`¡Refuerzos de ${this.boss.cfg.name}!`, '#ff8a7a');
    this.cameras.main.shake(300, .006);
    REINFORCEMENTS.forEach((kind, i) => this.time.delayedCall(i * 350, () => {
      if (this.boss?.alive) dropEnemy(this, kind, this.arenaX(i, REINFORCEMENTS.length), i % 2 ? -1 : 1, this.L.arena.floorY);
    }));
  }

  // un ítem cae del cielo (con gravedad) y queda en el suelo o sobre una plataforma
  dropItem(key, x) {
    const y = this.L.arena.floorY - 520;  // cae desde arriba de la pantalla de la arena
    const u = this.powerups.create(x, y, 'items', ITEMS[key].frame).setDepth(5);
    u.kind = key; u.slides = false; u.ready = true; u.body.setSize(26, 26);
    u.setVelocityY(60);
    const glow = this.add.circle(x, y, 18, 0xfff3b0, .35).setDepth(4);
    this.tweens.add({ targets: glow, scale: 1.4, alpha: .1, duration: 400, yoyo: true, repeat: -1 });
    const follow = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!u.active) { glow.destroy(); follow.remove(); return; }
      glow.setPosition(u.x, u.y);
    } });
  }

  // posición al azar dentro de la arena (en la parte visible)
  arenaX(i, n) {
    const A = this.L.arena, x0 = (A.x0 + 2) * TS, x1 = (A.x1 - 1) * TS;
    return x0 + ((i + .3 + Math.random() * .4) / n) * (x1 - x0);
  }

  // ayudas durante la pelea con el jefe según la energía del jugador
  bossRescue(time) {
    if (!this.boss || !this.boss.alive) return;
    if (!this.rescueDropped && this.hp <= MAX_HP / 2) {
      this.rescueDropped = true;
      this.hud.banner('¡Artefactos del cielo!', '#ffd84a');
      RESCUE_ITEMS.forEach((k, i) => this.time.delayedCall(i * 250, () => this.dropItem(k, this.arenaX(i, RESCUE_ITEMS.length))));
    }
    // jefe final: caen artefactos seguido (Casino cada 2, balón dorado y cada 4 una galleta)
    const A = this.L.arena;
    if (this.bossIndex === A.bosses.length - 1 && time >= this.nextArtifact) {
      this.nextArtifact = time + ARTIFACT_EVERY;
      if (this.powerups.countActive() < MAX_FALLEN) {
        const n = this.artifactCount++ % 4;
        const extra = this.player.ch === 'xoxur' ? 'gasOro' : Phaser.Utils.Array.GetRandom(RESCUE_ITEMS);
        const key = [ 'casino', extra, 'casino', 'galleta' ][n];
        this.dropItem(key, this.arenaX(Math.floor(Math.random() * 3), 3));
      }
    }
    if (this.hp <= 10 && time >= this.nextCasino) {
      this.nextCasino = time + CASINO_EVERY;
      this.dropItem('casino', this.arenaX(Math.floor(Math.random() * 3), 3));
      this.hud.popup('¡Casino!', this.player.x, this.player.y - 90);
    }
  }

  // un jefe desapareció: los refuerzos que quedan salen volando; si queda otro jefe, entra; si no, «Continuará»
  onBossDefeated() {
    this.boss = null;
    this.enemies.getChildren().slice().forEach(e => { if (e.awake && !e.dead && e.x > this.L.arena.x0 * TS) flipEnemy(this, e); });
    this.hud.showBoss(false);
    this.bossIndex++;
    if (this.bossIndex < this.L.arena.bosses.length) {
      this.time.delayedCall(1500, () => { if (!this.dead) this.startBoss(); });
      return;
    }
    this.bossDone = true;
    this.time.delayedCall(700, () => { if (!this.dead) this.celebrate(); });
  }

  /* ---------- después del último jefe: baile, la reja se rompe y se sigue subiendo ---------- */
  celebrate() {
    const p = this.player;
    this.dancing = true; this.danceAt = this.time.now; this.danceBeat = -1;
    this.powers.clear();  // el báculo (si ya lo tuviera) no se pierde
    p.body.setVelocity(0, 0);
    this.hud.banner('¡Victoria!', '#ffd84a');
    SND.win();
    this.time.delayedCall(3400, () => {
      if (this.dead) return;
      this.dancing = false;
      const p = this.player; p.setTexture(p.ch, 0); p.body.setOffset(24, 10);  // vuelve a su hoja normal
      this.openGate();
      this.camLock = null;  // la cámara vuelve a seguir a Xoxur
      this.hud.banner('¡Sigue subiendo!', '#7dffb0');
    });
  }

  // baile de la felicidad: saltitos al ritmo, girando, con los brazos arriba y notas musicales
  danceStep(time, dt) {
    const p = this.player, pb = p.body, beat = Math.floor((time - this.danceAt) / 300);
    let vy = pb.velocity.y + 1800 * dt;
    if (beat !== this.danceBeat) {
      this.danceBeat = beat;
      if (pb.blocked.down && beat % 2 === 0) vy = -340;
      if (beat % 2 === 0) this.hud.popup(beat % 4 ? '♫' : '♪', p.x + (beat % 4 ? 18 : -18), p.y - 50);
    }
    pb.setVelocity(0, vy);
    p.anims.stop();
    const air = !pb.blocked.down;
    if (p.ch === 'xoxurInka') {
      // Inkaxur: en el aire, la celebración con los brazos arriba de la lámina de vuelo (cuadros de 96 de ancho:
      // el cuerpo se corre 12 px para quedar en el mismo lugar)
      if (air) { p.setTexture('inkaxurVuelo', 16); pb.setOffset(36, 10); }
      else { p.setTexture('xoxurInka', beat % 4 < 2 ? 22 : 18); pb.setOffset(24, 10); }
    } else p.setFrame(air ? 29 : beat % 4 < 2 ? 22 : 18);
    p.setFlipX(beat % 4 >= 2);
  }

  // la reja de piedra que cerraba la subida se rompe en pedazos
  openGate() {
    SND.brk(); this.cameras.main.shake(300, .008);
    (this.gate || []).forEach((t, i) => this.time.delayedCall(i * 40, () => {
      if (!t.active) return;
      debris(this, t.x, t.y, 'shard', undefined, { vx: Phaser.Math.Between(-160, 160), vy: -380, spin: 400 });
      delete this.blocks[t.getData('tx') + ',' + t.getData('ty')]; t.destroy();
    }));
    this.gate = [];
  }

  // las alas del cuarto cubo: Inkaxur despega (corre, salta con los brazos arriba y sale volando)
  // y empieza el nivel 2, todo en el aire. Todo el nivel 2 se juega como Inkaxur
  takeWings() {
    const p = this.player, cam = this.cameras.main;
    this.hud.banner('¡Alas!', '#ffd84a');
    this.running = false; this.powers.until = {}; p.clearTint();
    p.body.setVelocity(0, 0); p.body.enable = false;
    p.setTexture('inkaxurVuelo', 14).setFlipX(false).setAlpha(1).setScale(1);
    p.play('vuelo-despegue');
    SND.up();
    this.tweens.add({ targets: p, x: p.x + 70, duration: 300 });
    this.tweens.add({ targets: p, x: p.x + 620, y: p.y - 420, delay: 420, duration: 1500, ease: 'Quad.in' });
    this.time.delayedCall(1300, () => cam.fadeOut(600, 20, 30, 20));
    // escena con imágenes (despega y ve a los enemigos del cielo) y después empieza el nivel 2
    cam.once('camerafadeoutcomplete', () => this.scene.start('escena', {
      cut: 'intro2', run: { hp: this.hp, maxHp: MAX_HP, score: this.score, coins: this.coins },
      next: { key: 'vuelo', data: { score: this.score, coins: this.coins, cetro: this.powers.cetro } }
    }));
  }

  /* ---------- daño, muerte y victoria ---------- */
  // restar energía; tras un golpe hay 1 s de invulnerabilidad (parpadeo)
  // grace = false para golpes chicos (choclos dorados): restan pero no dan el segundo de invulnerabilidad
  hurt(n, grace = true) {
    const p = this.player;
    if (DEMO) return;  // en la demostración no se pierde energía
    if (this.dead || this.won || this.time.now < p.invuln) return;
    if (this.powers.has('taunt') || this.powers.has('amuleto')) return;
    this.hp = Math.max(0, this.hp - n); this.updateHud();
    SND.hurt(); if (n >= 10) this.cameras.main.shake(120, .004);
    this.hud.popup('-' + n, p.x, p.y - 50);
    if (grace) p.invuln = this.time.now + 1000;
    if (this.hp <= 0) this.die();
  }

  // caer a un pozo: quita energía y vuelve al último suelo firme
  fallInPit() {
    const p = this.player;
    p.invuln = 0; this.hurt(DMG.pit);
    if (this.dead) return;
    p.x = this.safeX; p.y = this.safeY - 32 * p.scaleY - 60;
    p.body.reset(p.x, p.y); p.invuln = this.time.now + 1500;
    // la cámara solo avanza: si el suelo firme quedó a la izquierda de la pantalla (por ejemplo, detrás de un
    // pilar desde el que saltó al pozo), hay que retrocederla; si no, el borde empuja a Xoxur dentro del pilar
    const cam = this.cameras.main;
    if (this.camLock === null) cam.scrollX = Math.min(cam.scrollX, Math.max(0, this.safeX - GW * 0.4));
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.running = false; SND.die();
    this.powers.clear();
    this.boss?.freeze();
    const p = this.player;
    p.anims.stop(); p.setFrame(32); p.body.checkCollision.none = true;
    p.setVelocity(0, 0); p.setAlpha(1);
    this.time.delayedCall(450, () => { p.setFrame(35); p.setVelocity(0, -620); });
    this.time.delayedCall(2600, () => showOverlay('over', { score: this.score }));
  }

  // venció a El Sacrificador: Xoxur festeja y aparece «Continuará»
  win() {
    if (this.won || this.dead) return;
    this.won = true; this.running = false; SND.win();
    this.powers.clear();
    const p = this.player;
    p.body.setVelocity(0, 0); p.anims.stop(); p.setFrame(29); p.setFlipX(false);
    this.addScore(Math.ceil(this.timeLeft) * 10, p.x, p.y - 60);  // bonus por el tiempo que sobró
    this.time.delayedCall(1400, () => showOverlay('win', { score: this.score, coins: this.coins }));
  }


  /* ---------- bucle principal ---------- */
  update(time, delta) {
    const dt = Math.min(delta, 34) / 1000;
    const p = this.player, cam = this.cameras.main, L = this.L;

    updateEnemies(this, time);
    this.powerups.getChildren().slice().forEach(u => {
      if (!u.ready || !u.slides) return;
      if (u.body.blocked.left) u.dir = 1; else if (u.body.blocked.right) u.dir = -1;
      u.setVelocityX(100 * u.dir); if (u.y > GH + 100) u.destroy();
    });

    if (this.dead) { p.body.velocity.y = Math.min(p.body.velocity.y + 1500 * dt, 800); return; }
    if (!this.running) { if (!this.won) p.body.setVelocity(0, 0); return; }

    // golpe con la cabeza del paso anterior
    const hit = p.takeHeadHit();
    if (hit) this.hitBlock(hit);

    if (!this.checkpoint && p.x > L.checkpointX * TS) this.checkpoint = true;
    if (!this.bossStarted && p.x > (L.arena.x0 + 4) * TS) this.startBoss();
    this.boss?.update(time);
    this.bossRescue(time);

    // reloj
    this.timeLeft -= dt; this.clock += dt;
    if (this.clock > .25) { this.clock = 0; this.updateHud(); }
    if (this.timeLeft <= 0) { this.die(); return; }

    // cámara que solo avanza (o se fija en la arena de la cima)
    if (this.camLock !== null) cam.scrollX = Math.min(this.camLock, cam.scrollX + 700 * dt);
    else cam.scrollX = Phaser.Math.Clamp(Math.max(cam.scrollX, p.x - GW * 0.4), 0, LW * TS - GW);
    // en vertical: quieta en el llano; en el cerro sigue a Xoxur hacia arriba (suave)
    let ty = 0;
    if (this.camLock !== null) ty = this.camLockY;
    else if (p.x > (L.hill.x0 - 8) * TS) ty = Math.min(0, p.y - GH * 0.6);
    cam.scrollY += (Math.max(TOP, ty) - cam.scrollY) * Math.min(1, 5 * dt);

    this.powers.update(time, dt);
    this.movers.update(time, dt);
    // parado sobre una plataforma móvil: se mueve con ella
    const ride = p.body.blocked.down || p.body.touching.down ? this.movers.rideVelocity(p.body) : null;
    if (ride) { p.x += ride.vx * dt; if (ride.vy > 0) p.y += ride.vy * dt; }
    const input = this.controls.read();
    p.canDouble = this.bossStarted && !this.bossDone;  // doble salto solo contra Inka Locu y El Sacrificador
    if (this.dancing) this.danceStep(time, dt);
    else {
      p.move(time, dt, input, cam.scrollX);
      // borde derecho del mundo (la cumbre no tiene pared): no dejar que Xoxur se salga
      if (p.body.right > LW * TS) { p.x -= p.body.right - LW * TS; if (p.body.velocity.x > 0) p.body.setVelocity(0, p.body.velocity.y); }
      if (input.fire) this.powers.throw();
      if (input.fire2) this.powers.throwCetro();  // báculo de Inka Locu (V)
    }

    // último suelo firme (para volver después de caer a un pozo): con bloques debajo a ambos lados
    if (p.body.blocked.down) {
      const tx = Math.floor(p.x / TS), ty = Math.floor((p.body.bottom + 4) / TS);
      if (this.blocks[(tx - 1) + ',' + ty] && this.blocks[(tx + 1) + ',' + ty]) { this.safeX = p.x; this.safeY = p.body.bottom; }
    }
    if (p.y > GH + 40) this.fallInPit();
  }
}
