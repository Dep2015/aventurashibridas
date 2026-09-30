import Phaser from 'phaser';
import { GW, GH, SHEETS, SPRITE_SHEETS, SPRITE_SHEETS_2, SPRITE_SHEETS_3, TSET_3 } from '../config.js';
import { SND, sfx } from '../audio.js';
import { createControls, touch } from '../input.js';
import { showOverlay, renderHud, setLevelName } from '../ui.js';
import { makeTextures, createFlightAnims, createCaveAssets } from '../textures.js';
import { Hud } from '../hud.js';
import { T3, MAP_W, MAP_H, FLOORS, BELL_STEPS, FOES, FLOOR_FOES, RUNES, LOOT, buildFloor, key } from '../level3.js';

const MAX_HP = 100;
const STEP_MS = 170, RUN_STEP_MS = 110;  // tiempo de un paso (casilla)
const TIME = 900;                         // segundos para todo el nivel (el reloj se detiene en las batallas)
const ITEM_FRAME = { casino: 5, quipu: 1, plasma: 8 };
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
// primer cuadro de cada dirección en inkaxur_mapa.png (Inkaxur parado)
export const MAP_STAND = { down: 0, up: 4, left: 8, right: 12 };

// carga lo que usa el nivel 3 (la mina y la guarida); lo que ya está cargado no se vuelve a pedir
export function preloadMina(scene) {
  const load = scene.load, has = k => scene.textures.exists(k);
  const sheets = { items: SPRITE_SHEETS.items, inkaxurVuelo: SPRITE_SHEETS_2.inkaxurVuelo, galletaMenta: SPRITE_SHEETS_2.galletaMenta, ...SPRITE_SHEETS_3 };
  for (const k in sheets) if (!has(k)) { const [path, frameWidth, frameHeight] = sheets[k]; load.spritesheet(k, path, { frameWidth, frameHeight }); }
  if (!has('xoxurInka')) load.spritesheet('xoxurInka', SHEETS.xoxurInka, { frameWidth: 72, frameHeight: 64 });
  for (const k in TSET_3) if (!has(k)) load.image(k, TSET_3[k]);
  if (!has('baculo')) load.image('baculo', 'assets/sprites/inka_baculo.png');
}

/* ---------- nivel 3: la mina de Muqui Z, vista desde arriba (como Pokémon Red) ----------
 * Inkaxur camina casilla por casilla. Tocar a un enemigo abre la batalla por turnos (escena `batalla`, que
 * pausa esta). El estado de la partida (energía, ítems, runas) vive en `this.run` y la batalla lo modifica. */
export class Cueva extends Phaser.Scene {
  constructor() { super('cueva'); }

  init(d = {}) {
    this.startData = { score: d.score ?? 0, coins: d.coins ?? 0, cetro: d.cetro ?? true };
    this.run = {
      hp: MAX_HP, maxHp: MAX_HP, score: this.startData.score, coins: this.startData.coins, cetro: this.startData.cetro,
      inv: { casino: 1, quipu: 1, plasma: 0 }, runes: {}
    };
    this.floorN = d.floor || 1;
  }

  preload() { preloadMina(this); }

  create() {
    this.lastFire = touch.fireAt;
    // la escena se reinicia (reintentar, volver a entrar): lo de la partida anterior ya fue destruido
    this.player = null; this.shadow = null; this.dark = null;
    this.foes = []; this.remains = []; this.floorObjs = [];
    makeTextures(this);
    createFlightAnims(this);
    createCaveAssets(this, FOES);
    this.hud = new Hud(this);
    this.controls = createControls(this);
    this.hud.showBoss(false);
    setLevelName('Nivel 3 · La mina');
    this.timeLeft = TIME; this.clock = 0;
    this.dead = false;
    this.buildHud();
    this.enterFloor(this.floorN, true);
    this.events.on('resume', () => { this.inBattle = false; });
  }

  /* ---------- piso ---------- */
  enterFloor(n, first) {
    this.floorN = n;
    (this.floorObjs || []).forEach(o => o.destroy());
    this.floorObjs = [];
    const F = this.F = buildFloor(n);
    const add = o => { this.floorObjs.push(o); return o; };
    this.cameras.main.setBounds(0, 0, MAP_W * T3, MAP_H * T3).setBackgroundColor('#0b0806');
    // mapa: piso y paredes (solo las que tocan piso) en una textura
    const rt = add(this.add.renderTexture(0, 0, MAP_W * T3, MAP_H * T3).setOrigin(0).setDepth(-10));
    const wallImg = this.make.image({ key: 'piedra3', add: false }).setOrigin(0).setScale(T3 / 62, T3 / 69);
    const wallImg2 = this.make.image({ key: 'piedra3b', add: false }).setOrigin(0).setScale(T3 / 62, T3 / 69);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (!F.g[y][x]) rt.draw('suelo3_' + ((x * 7 + y * 3) % 2), x * T3, y * T3);
      else if (this.nearFloor(x, y)) rt.draw((x + y) % 3 ? wallImg : wallImg2, x * T3, y * T3);
    }
    wallImg.destroy(); wallImg2.destroy();
    this.blocked = new Set();
    const at = (p, k) => ({ x: p.x * T3 + T3 / 2, y: p.y * T3 + T3 / 2 });
    // decoración (no estorba)
    F.decor.forEach(d => { const w = at(d); add(this.add.image(w.x, w.y + 18, d.kind + '3').setOrigin(.5, 1).setScale(.5).setDepth(w.y - 20)); });
    // escalera
    if (F.stairs) { const w = at(F.stairs); this.stairsImg = add(this.add.image(w.x, w.y, 'escalera3').setDepth(-5)); }
    // piedra de runa (cristal que late)
    this.runeStone = null;
    if (F.rune) {
      const w = at(F.rune);
      const r = add(this.add.image(w.x, w.y + 20, 'cristal3').setOrigin(.5, 1).setScale(.6).setDepth(w.y));
      this.tweens.add({ targets: r, alpha: .6, duration: 600, yoyo: true, repeat: -1 });
      r.tile = F.rune; this.runeStone = r; this.blocked.add(key(F.rune));
    }
    // cofres y vasijas
    this.things = new Map();
    F.chests.forEach(c => { const w = at(c); const s = add(this.add.image(w.x, w.y, 'cofre3').setScale(.7).setDepth(w.y)); s.kind = 'cofre'; s.tile = c; this.things.set(key(c), s); this.blocked.add(key(c)); });
    F.vasijas.forEach(c => { const w = at(c); const s = add(this.add.image(w.x, w.y + 20, 'vasija3').setOrigin(.5, 1).setScale(.55).setDepth(w.y)); s.kind = 'vasija'; s.tile = c; this.things.set(key(c), s); this.blocked.add(key(c)); });
    // jugador
    if (!this.player) {
      this.shadow = this.add.image(0, 0, 'sombra3');
      this.player = this.add.sprite(0, 0, 'inkaxurMapa', 0).setOrigin(.5, .94).setScale(.9);
    }
    this.ptile = { ...F.start }; this.facing = 'down'; this.moving = false;
    this.placePlayer();
    // enemigos
    (this.foes || []).forEach(e => e.destroy()); (this.remains || []).forEach(r => r.sprite.destroy());
    this.foes = []; this.remains = [];
    F.foes.forEach(f => this.spawnFoe(f.kind, f));
    // oscuridad con la luz de la antorcha
    if (!this.dark) this.dark = this.add.image(0, 0, 'oscuro3').setScale(4).setScrollFactor(0).setDepth(900);
    this.steps = 0; this.bells = 0; this.grace = 0; this.inBattle = false; this.busy = false;
    this.cameras.main.startFollow(this.player, true, .15, .15);
    this.cameras.main.fadeIn(400);
    this.hud.banner(`Piso ${n} de ${FLOORS}`, '#ffd84a');
    if (first) this.hud.banner('Nivel 3: la mina', '#9dff6a');
    this.drawHud(); this.updateHud();
  }

  nearFloor(x, y) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.F.g[y + dy]?.[x + dx] === 0) return true;
    return false;
  }
  walkable(p) { return this.F.g[p.y]?.[p.x] === 0 && !this.blocked.has(key(p)) && !this.foes.some(e => e.tx === p.x && e.ty === p.y); }
  worldOf(p) { return { x: p.x * T3 + T3 / 2, y: p.y * T3 + T3 / 2 }; }

  placePlayer() {
    const w = this.worldOf(this.ptile);
    this.player.setPosition(w.x, w.y + 20).setDepth(w.y + 1);
    this.shadow.setPosition(w.x, w.y + 18).setDepth(w.y);
  }

  spawnFoe(kind, p) {
    const f = FOES[kind], w = this.worldOf(p);
    const e = this.add.sprite(w.x, w.y + 20, f.sheet, f.map.idle[0]).setOrigin(.5, .92).setScale(f.map.scale).setDepth(w.y);
    e.play(kind + '-idle3');
    e.kind = kind; e.tx = p.x; e.ty = p.y; e.nextMove = this.time.now + 600 + Math.random() * 900;
    e.bells = this.bells || 0;
    this.foes.push(e);
    return e;
  }

  /* ---------- panel dentro del juego: piso, campanas, ítems, runas ---------- */
  buildHud() {
    const st = { fontFamily: '"Luckiest Guy", "Arial Black", sans-serif', fontSize: '18px', color: '#fff', stroke: '#1d2a44', strokeThickness: 4 };
    this.hudBg = this.add.graphics().setScrollFactor(0).setDepth(950);
    this.hudFloor = this.add.text(18, 12, '', st).setScrollFactor(0).setDepth(951);
    this.hudBell = this.add.text(18, 38, '', { ...st, fontSize: '15px' }).setScrollFactor(0).setDepth(951);
    this.hudInv = [];
    ['casino', 'quipu', 'plasma'].forEach((k, i) => {
      const im = this.add.image(GW - 150 + i * 48, 26, 'items', ITEM_FRAME[k]).setScrollFactor(0).setDepth(951).setScale(.8);
      const t = this.add.text(GW - 132 + i * 48, 36, '', { ...st, fontSize: '14px' }).setScrollFactor(0).setDepth(952);
      this.hudInv.push([k, im, t]);
    });
    this.hudRunes = this.add.text(GW - 16, 56, '', { ...st, fontSize: '14px', align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(951);
  }
  drawHud() {
    const F = this.F, g = this.hudBg; g.clear();
    this.hudFloor.setText(`Piso ${this.floorN} de ${FLOORS}`);
    const left = BELL_STEPS - (this.steps % BELL_STEPS);
    this.hudBell.setText(`Campanadas: ${this.bells}   ·   próxima en ${left} pasos`);
    g.fillStyle(0x1d2a44, .6).fillRoundedRect(8, 6, 330, 56, 8).fillRoundedRect(GW - 178, 4, 170, 46, 8);
    g.fillStyle(0x3a2a1a).fillRect(18, 58, 300, 4); g.fillStyle(0xffc93c).fillRect(18, 58, 300 * (1 - left / BELL_STEPS), 4);
    this.hudInv.forEach(([k, im, t]) => t.setText('x' + this.run.inv[k]));
    this.hudRunes.setText(Object.entries(this.run.runes).map(([k, n]) => `${RUNES[k].name} ${'I'.repeat(n)}`).join('\n'));
  }
  updateHud() { renderHud({ hp: this.run.hp, max: this.run.maxHp, score: this.run.score, coins: this.run.coins, time: this.timeLeft, char: 'xoxurInka' }); }

  /* ---------- turno del jugador: moverse o interactuar ---------- */
  readInput() {
    const k = this.controls.keys, J = Phaser.Input.Keyboard.JustDown;
    const dir = (k.l.isDown || k.a.isDown || touch.left) ? 'left' : (k.r.isDown || k.d.isDown || touch.right) ? 'right'
      : (k.up.isDown || k.w.isDown || touch.jump) ? 'up' : (k.dn.isDown || k.s.isDown || touch.down) ? 'down' : null;
    const act = J(k.z) || J(k.sp) || J(k.c) || (touch.fireAt !== this.lastFire && (this.lastFire = touch.fireAt, true));
    return { dir, act, run: k.x.isDown || k.sh.isDown || touch.run };
  }

  tryStep(dir, run) {
    this.facing = dir;
    const [dx, dy] = DIRS[dir], to = { x: this.ptile.x + dx, y: this.ptile.y + dy };
    this.animWalk(dir, false);
    // chocar con algo: abrirlo / usarlo
    const thing = this.things.get(key(to));
    if (thing) { this.openThing(thing); return; }
    if (this.runeStone && this.runeStone.tile.x === to.x && this.runeStone.tile.y === to.y) { this.useRuneStone(); return; }
    const foe = this.foes.find(e => e.tx === to.x && e.ty === to.y);
    if (foe) { this.startBattle(foe); return; }
    if (!this.walkable(to)) return;
    this.moving = true;
    this.ptile = to;
    const w = this.worldOf(to), ms = run ? RUN_STEP_MS : STEP_MS;
    this.animWalk(dir, true);
    this.tweens.add({ targets: this.player, x: w.x, y: w.y + 20, duration: ms, onUpdate: () => this.player.setDepth(this.player.y - 19) });
    this.tweens.add({ targets: this.shadow, x: w.x, y: w.y + 18, duration: ms });
    this.time.delayedCall(ms, () => { this.moving = false; this.afterStep(); });
  }

  // caminar (o quedarse mirando) hacia una dirección: de frente, de espaldas o de costado
  animWalk(dir, walking) {
    const p = this.player;
    if (walking) p.anims.play('mapa-' + dir, true);
    else { p.anims.stop(); p.setFrame(MAP_STAND[dir]); }
  }

  afterStep() {
    const F = this.F;
    this.steps++;
    // campanada: cada BELL_STEPS pasos llegan 2 enemigos más y todos se hacen más fuertes
    if (this.steps % BELL_STEPS === 0) this.ringBell();
    // escalera
    if (F.stairs && this.ptile.x === F.stairs.x && this.ptile.y === F.stairs.y) { this.descend(); return; }
    this.drawHud();
    this.checkEncounter();
  }

  ringBell() {
    this.bells++;
    SND.bump(); [0, 250, 500].forEach(t => this.time.delayedCall(t, () => sfx(880, 860, .35, 'triangle', .06)));
    this.cameras.main.shake(250, .004);
    this.hud.banner(`¡Campanada ${this.bells}!`, '#ff8a7a');
    this.hud.popup('Llegan 2 enemigos más', this.player.x, this.player.y - 70);
    const kinds = FLOOR_FOES[this.floorN];
    for (let i = 0; i < 2; i++) {
      const p = this.farFreeTile(7);
      if (p) this.spawnFoe(Phaser.Utils.Array.GetRandom(kinds), p);
    }
  }

  farFreeTile(minDist) {
    for (let t = 0; t < 200; t++) {
      const p = { x: Phaser.Math.Between(1, MAP_W - 2), y: Phaser.Math.Between(1, MAP_H - 2) };
      if (this.walkable(p) && Math.abs(p.x - this.ptile.x) + Math.abs(p.y - this.ptile.y) >= minDist) return p;
    }
    return null;
  }

  // bajar: al siguiente piso, o después del último a la guarida de Muqui Z (pelea en tiempo real, Guarida.js)
  descend() {
    this.busy = true; SND.up();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.floorN >= FLOORS) this.scene.start('guarida', { run: this.run });
      else this.enterFloor(this.floorN + 1);
    });
  }

  /* ---------- vasijas, cofres y runas ---------- */
  openThing(t) {
    const tile = key(t.tile);
    this.things.delete(tile);
    const loot = Phaser.Utils.Array.GetRandom(LOOT[t.kind]);
    if (t.kind === 'vasija') {
      // la vasija se rompe y deja libre su casilla
      SND.brk(); this.blocked.delete(tile);
      this.tweens.add({ targets: t, alpha: 0, scale: .4, duration: 250, onComplete: () => t.destroy() });
    } else { SND.bump(); t.setTexture('cofre3usado'); }  // el cofre abierto sigue ocupando su casilla
    this.giveLoot(loot, t.x, t.y);
  }

  giveLoot(loot, x, y) {
    if (loot === 'coins') { const n = Phaser.Math.Between(3, 6); this.run.coins += n; this.run.score += n * 200; SND.coin(); this.hud.popup(`+${n} monedas`, x, y - 40); }
    else if (loot === 'rune') { this.pickRune(); }
    else { this.run.inv[loot]++; SND.up(); this.hud.popup({ casino: '¡Casino!', quipu: '¡Quipu!', plasma: '¡Esfera de plasma!' }[loot], x, y - 40); }
    this.drawHud(); this.updateHud();
  }

  useRuneStone() {
    const r = this.runeStone; this.runeStone = null;
    this.blocked.delete(key(r.tile));
    this.tweens.add({ targets: r, alpha: 0, y: r.y - 30, duration: 400, onComplete: () => r.destroy() });
    this.pickRune();
  }

  // elegir 1 de 3 runas (←/→ y Z, o clic/toque)
  pickRune() {
    this.busy = true;
    const keys = Phaser.Utils.Array.Shuffle(Object.keys(RUNES).filter(k => (this.run.runes[k] || 0) < 3)).slice(0, 3);
    if (!keys.length) { this.busy = false; return; }
    const objs = [], st = { fontFamily: '"Luckiest Guy", "Arial Black", sans-serif', color: '#fff', stroke: '#1d2a44', strokeThickness: 4 };
    const bg = this.add.rectangle(GW / 2, GH / 2, GW, GH, 0x000000, .65).setScrollFactor(0).setDepth(1000).setInteractive();
    objs.push(bg, this.add.text(GW / 2, 110, 'Elige una runa', { ...st, fontSize: '34px', color: '#9dff6a' }).setOrigin(.5).setScrollFactor(0).setDepth(1001));
    let sel = 0;
    const cards = keys.map((k, i) => {
      const lv = (this.run.runes[k] || 0) + 1, x = GW / 2 + (i - (keys.length - 1) / 2) * 250;
      const c = this.add.rectangle(x, 290, 220, 230, 0x2b2118).setStrokeStyle(4, 0x8a7560).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true });
      const t1 = this.add.text(x, 205, RUNES[k].name, { ...st, fontSize: '20px', align: 'center', wordWrap: { width: 200 } }).setOrigin(.5, 0).setScrollFactor(0).setDepth(1002);
      const t2 = this.add.text(x, 262, 'Nivel ' + 'I'.repeat(lv), { ...st, fontSize: '16px', color: '#ffd84a' }).setOrigin(.5, 0).setScrollFactor(0).setDepth(1002);
      const t3 = this.add.text(x, 300, RUNES[k].desc(lv), { fontFamily: 'sans-serif', fontSize: '16px', color: '#f4ecd8', align: 'center', wordWrap: { width: 190 } }).setOrigin(.5, 0).setScrollFactor(0).setDepth(1002);
      objs.push(c, t1, t2, t3);
      c.on('pointerdown', () => choose(i));
      c.on('pointerover', () => { sel = i; paint(); });
      return c;
    });
    const hint = this.add.text(GW / 2, 440, '←  →  para elegir · Z o Espacio para tomarla', { ...st, fontSize: '16px' }).setOrigin(.5).setScrollFactor(0).setDepth(1001);
    objs.push(hint);
    const paint = () => cards.forEach((c, i) => c.setStrokeStyle(4, i === sel ? 0xffd84a : 0x8a7560).setScale(i === sel ? 1.05 : 1));
    paint();
    const onKey = ev => {
      if (ev.key === 'ArrowLeft' || ev.key === 'a') { sel = (sel + keys.length - 1) % keys.length; paint(); }
      else if (ev.key === 'ArrowRight' || ev.key === 'd') { sel = (sel + 1) % keys.length; paint(); }
      else if (ev.key === 'z' || ev.key === ' ' || ev.key === 'Enter') choose(sel);
    };
    this.input.keyboard.on('keydown', onKey);
    const choose = i => {
      const k = keys[i];
      this.input.keyboard.off('keydown', onKey);
      this.run.runes[k] = (this.run.runes[k] || 0) + 1;
      if (k === 'llama') { this.run.maxHp += 15; this.run.hp += 15; }
      objs.forEach(o => o.destroy());
      SND.up(); this.hud.banner(RUNES[k].name + ' ' + 'I'.repeat(this.run.runes[k]), '#9dff6a');
      this.drawHud(); this.updateHud();
      this.time.delayedCall(200, () => { this.busy = false; });
    };
  }

  /* ---------- enemigos en el mapa ---------- */
  moveFoes(time) {
    const sight = 5 - (this.run.runes.pies || 0);
    this.foes.forEach(e => {
      if (e.moving || time < e.nextMove) return;
      e.nextMove = time + (e.kind === 'aracura' ? 520 : 700) + Math.random() * 500;
      const d = Math.abs(e.tx - this.ptile.x) + Math.abs(e.ty - this.ptile.y);
      let target = null;
      // Aracura va hacia los restos de un enemigo derrotado para revivirlo
      if (e.kind === 'aracura' && this.remains.length) {
        target = this.remains.reduce((a, r) => (Math.abs(r.x - e.tx) + Math.abs(r.y - e.ty) < Math.abs(a.x - e.tx) + Math.abs(a.y - e.ty) ? r : a));
        if (Math.abs(target.x - e.tx) + Math.abs(target.y - e.ty) <= 1) { this.revive(e, target); return; }
      } else if (d <= sight && time > this.grace) target = { x: this.ptile.x, y: this.ptile.y };
      let opts;
      if (target) {
        const sx = Math.sign(target.x - e.tx), sy = Math.sign(target.y - e.ty);
        opts = Math.abs(target.x - e.tx) > Math.abs(target.y - e.ty) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
        opts = opts.filter(([a, b]) => a || b);
      } else opts = Phaser.Utils.Array.Shuffle([[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]).slice(0, 2);
      for (const [dx, dy] of opts) {
        if (!dx && !dy) break;
        const to = { x: e.tx + dx, y: e.ty + dy };
        if (to.x === this.ptile.x && to.y === this.ptile.y) break;
        if (!this.walkable(to)) continue;
        e.tx = to.x; e.ty = to.y; e.moving = true;
        const w = this.worldOf(to);
        if (dx) e.setFlipX(dx < 0);
        e.play(e.kind + '-walk3', true);
        this.tweens.add({ targets: e, x: w.x, y: w.y + 20, duration: 300, onUpdate: () => e.setDepth(e.y - 20),
          onComplete: () => { e.moving = false; e.play(e.kind + '-idle3', true); this.checkEncounter(); } });
        break;
      }
    });
  }

  revive(aracura, r) {
    this.remains = this.remains.filter(x => x !== r);
    r.sprite.destroy();
    const e = this.spawnFoe(r.kind, { x: r.x, y: r.y });
    e.setTint(0x9dff6a); this.time.delayedCall(600, () => e.active && e.clearTint());
    this.hud.popup(`¡Aracura revivió a ${FOES[r.kind].name}!`, e.x, e.y - 60);
    sfx(300, 900, .4, 'triangle', .06);
  }

  checkEncounter() {
    if (this.inBattle || this.busy || this.moving || this.time.now < this.grace) return;
    const foe = this.foes.find(e => !e.moving && Math.abs(e.tx - this.ptile.x) + Math.abs(e.ty - this.ptile.y) <= 1);
    if (foe) this.startBattle(foe);
  }

  /* ---------- batalla ---------- */
  startBattle(foe) {
    if (this.inBattle) return;
    this.inBattle = true; this.battleFoe = foe;
    const mark = this.add.text(foe.x, foe.y - foe.displayHeight - 10, '!', { fontFamily: '"Luckiest Guy", sans-serif', fontSize: '40px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 6 }).setOrigin(.5).setDepth(5000);
    sfx(900, 1200, .15, 'square', .06);
    this.time.delayedCall(550, () => {
      mark.destroy();
      this.cameras.main.flash(250, 255, 255, 255);
      this.time.delayedCall(250, () => {
        this.scene.launch('batalla', { foe: foe.kind, floor: this.floorN, bells: foe.bells + this.bells, run: this.run });
        this.scene.pause();
      });
    });
  }

  // la escena de batalla llama esto al terminar: 'win', 'run' o 'lose'
  battleEnd(result) {
    const foe = this.battleFoe; this.battleFoe = null;
    this.updateHud(); this.drawHud();
    if (result === 'lose') { this.die(); return; }
    if (result === 'win') {
      this.foes = this.foes.filter(e => e !== foe);
      // quedan sus restos (Aracura puede revivirlos)
      const f = FOES[foe.kind];
      const r = { kind: foe.kind, x: foe.tx, y: foe.ty, sprite: this.add.sprite(foe.x, foe.y, f.sheet, f.ko ?? f.map.idle[0]).setOrigin(.5, .92).setScale(foe.scale).setDepth(foe.depth).setAlpha(.45).setTint(0x777777) };
      this.remains.push(r);
      foe.destroy();
    }
    this.grace = this.time.now + 1500;  // un momento sin encuentros al volver al mapa
  }

  /* ---------- fin ---------- */
  die() {
    this.dead = true; SND.die();
    this.player.anims.stop(); this.player.setTexture('xoxurInka', 33);
    this.time.delayedCall(1200, () => showOverlay('over', { score: this.run.score }));
  }

  /* ---------- bucle ---------- */
  update(time, delta) {
    this.drawDark();
    if (this.dead || this.inBattle) return;
    const dt = Math.min(delta, 34) / 1000;
    this.timeLeft -= dt; this.clock += dt;
    if (this.clock > .25) { this.clock = 0; this.updateHud(); }
    if (this.timeLeft <= 0) { this.die(); return; }
    this.moveFoes(time);
    if (this.busy || this.moving) return;
    const input = this.readInput();
    if (input.dir) this.tryStep(input.dir, input.run);
    else if (input.act) {
      // interactuar con lo que está enfrente (también se abre caminando hacia ello)
      const [dx, dy] = DIRS[this.facing], to = { x: this.ptile.x + dx, y: this.ptile.y + dy };
      const t = this.things.get(key(to));
      if (t) this.openThing(t);
    } else if (this.player.anims.isPlaying) this.animWalk(this.facing, false);  // se detiene mirando hacia donde iba
  }

  // oscuridad: todo negro salvo la luz de la antorcha alrededor de Inkaxur
  drawDark() {
    const cam = this.cameras.main, p = this.player;
    this.dark.setPosition(p.x - cam.scrollX, p.y - 30 - cam.scrollY);
  }
}
