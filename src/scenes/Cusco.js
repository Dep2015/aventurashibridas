import Phaser from 'phaser';
import { GW, GH, SPRITE_SHEETS, SPRITE_SHEETS_2, SPRITE_SHEETS_3, SPRITE_SHEETS_4, IMAGES_4 } from '../config.js';
import { SND, sfx } from '../audio.js';
import { createControls, touch } from '../input.js';
import { showOverlay, renderHud, setLevelName, showBossPanel, renderBoss } from '../ui.js';
import { makeTextures, createFlightAnims, createCaveAssets } from '../textures.js';
import { Hud } from '../hud.js';
import { T4, CELLS, AREAS, SONGS, NOTES, BOSSES4, TALKS, GOT } from '../level4.js';
import { createAnims4, spawnFoe, updateFoes, hurtFoe, ghostBoom, Boss4 } from '../entities/foes4.js';

/* ---------- nivel 4: el Cusco (vista desde arriba, como Zelda: Ocarina of Time) ----------
 * Cada área (level4.js) es una escena reiniciada: al cambiar de área o de época se llama a scene.restart con el estado
 * de la partida (`run`), así no quedan objetos del área anterior. `startData` guarda el estado al entrar al área: al
 * perder se vuelve a empezar desde ahí.
 * Controles: flechas/WASD moverse · Z golpe con el champi (o hablar/abrir/girar) · X escudo (mantener) ·
 * Shift fijar al enemigo más cercano (mantener) · Espacio rodar · C galleta · V cetro · Q quena · E Casino. */
const SPEED = 190, ROLL = 430, FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const ZOOM = 1.35;      // acercamiento de la cámara al jugar (al entrar a un área nueva primero se ve el plano general)
// enemigos que van apareciendo y buscan a Inkaxur (además de los del mapa); FANTASMA = probabilidad de un fantasma inca
const HUNT = { santaclara: ['llama', 'imata'], plaza: ['llama', 'imata'], loreto: ['llama', 'imata'], sancristobal: ['llama', 'imata', 'guerrero'],
  sacsayhuaman: ['guerrero', 'guerrero'], qorikancha: ['mallqui'] };
const HUNT_MAX = 5, HUNT_EVERY = [4500, 7500], FANTASMA = .35;
const MAP_STAND = { down: 0, up: 4, left: 8, right: 12 };
// cuadros de inkaxur_accion.png: golpe abajo/arriba/costado, escudo, quena, levantar un tesoro, rodar, daño, K.O.
// (los de costado miran a la izquierda)
const ACC = { atk: { down: 0, up: 3, side: 6 }, shield: { down: 9, up: 10, side: 11 }, quena: 12, got: 14, roll: 15, hurt: 19, ko: 20 };
const COMBO = [12, 12, 18];  // daño de los tres golpes seguidos del champi

export class Cusco extends Phaser.Scene {
  constructor() { super('cusco'); }

  init(d = {}) {
    const run = d.run ? JSON.parse(JSON.stringify(d.run)) : {
      hp: 100, maxHp: 100, score: d.score ?? 0, coins: d.coins ?? 0,
      inv: { casino: 1, llave: 0 }, has: { quena: false, cetro: false, chakana: false }, songs: {},
      flags: {}, blocks: {}, area: 'santaclara', era: 'hoy', pos: null, intro: true
    };
    this.run = run;
    this.flash = d.flash;  // viene de un viaje en el tiempo
    this.startData = { run: JSON.parse(JSON.stringify({ ...run, hp: run.maxHp, intro: false })) };
  }

  preload() {
    const load = this.load, has = k => this.textures.exists(k);
    const sheets = { items: SPRITE_SHEETS.items, galletaMenta: SPRITE_SHEETS_2.galletaMenta, inkaxurMapa: SPRITE_SHEETS_3.inkaxurMapa, ...SPRITE_SHEETS_4 };
    for (const k in sheets) if (!has(k)) { const [path, frameWidth, frameHeight] = sheets[k]; load.spritesheet(k, path, { frameWidth, frameHeight }); }
    for (const k in IMAGES_4) if (!has(k)) load.image(k, IMAGES_4[k]);
    // barra de carga (la primera vez hay muchas imágenes)
    if (load.list.size) {
      const txt = this.add.text(GW / 2, GH / 2 - 34, 'Cargando el Cusco…', { fontFamily: FONT, fontSize: '26px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 6 }).setOrigin(.5);
      const bar = this.add.graphics();
      load.on('progress', v => bar.clear().fillStyle(0x1d2a44).fillRoundedRect(GW / 2 - 204, GH / 2 - 4, 408, 24, 8).fillStyle(0xffd84a).fillRoundedRect(GW / 2 - 200, GH / 2, 400 * v, 16, 6));
      load.once('complete', () => { txt.destroy(); bar.destroy(); });
    }
  }

  create() {
    makeTextures(this); createFlightAnims(this); createCaveAssets(this, {}); createAnims4(this);
    this.makeTextures4();
    this.physics.world.gravity.y = 0;
    const run = this.run, A = this.A = AREAS[run.area];
    this.era = A.fixedEra || run.era;
    this.hud = new Hud(this);
    this.controls = createControls(this);
    const K = Phaser.Input.Keyboard.KeyCodes, kb = this.input.keyboard;
    this.k = kb.addKeys({ q: K.Q, e: K.E, j: K.J, enter: K.ENTER, esc: K.ESC });
    // botones táctiles: se cuenta cada toque una sola vez (touch[k + 'At'] = momento del último toque)
    this.seen = {}; ['atk', 'act', 'fire2', 'roll', 'quena', 'casino', 'left', 'right', 'jump', 'down'].forEach(k => { this.seen[k] = touch[k + 'At']; });
    document.body.classList.add('nivel4');
    this.events.once('shutdown', () => document.body.classList.remove('nivel4'));
    setLevelName('Nivel 4 · ' + (this.era === 'inca' && A.incaName ? A.incaName : A.name));

    // grupos
    this.walls = this.physics.add.staticGroup();
    this.solids = this.physics.add.staticGroup();   // carteles, personajes, cofres, piedras, espejos (casillas sólidas)
    this.foes = this.physics.add.group();
    this.foeShots = this.physics.add.group();
    this.myShots = this.physics.add.group();
    this.drops = this.physics.add.group();
    this.things = []; this.doors = []; this.blocks = []; this.plates = []; this.mirrors = []; this.exits = [];
    this.boss = null; this.bossThing = null; this.fight = false;
    this.dialog = null; this.quena = null; this.busy = false; this.dead = false;

    this.buildMap();
    this.buildThings();

    // Inkaxur
    const [px, py] = run.pos || A.start;
    this.pShadow = this.add.image(0, 0, 'sombra3');
    const p = this.player = this.physics.add.sprite((px + .5) * T4, (py + .5) * T4 + 14, 'inkaxurMapa', 0).setOrigin(.5, .94);
    p.body.setCircle(13, 19, 34); p.body.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, this.W * T4, this.H * T4);
    this.dir = 'up'; this.face = { x: 0, y: -1 };
    this.invuln = 0; this.rollUntil = 0; this.cd = {}; this.atk = null; this.combo = 0; this.lastAtkEnd = 0;
    this.lock = null; this.pushT = 0; this.toxicAt = 0; this.exitGrace = this.time.now + 500;
    this.freePlayer();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.W * T4, this.H * T4).setBackgroundColor('#101010');
    // color de la época: verde radiactivo hoy, dorado en tiempos incas
    if (!A.indoor) this.add.rectangle(0, 0, GW, GH, this.era === 'hoy' ? 0x6aff3a : 0xffc860, this.era === 'hoy' ? .08 : .07).setOrigin(0).setScrollFactor(0).setDepth(2500);

    // colisiones
    const P = this.physics.add;
    P.collider(p, this.walls); P.collider(p, this.solids);
    const solid = e => !e.ghost, both = (a, b) => !a.ghost && !b.ghost;
    P.collider(this.foes, this.walls, null, solid); P.collider(this.foes, this.solids, null, solid); P.collider(this.foes, this.foes, null, both);
    this.doors.forEach(d => { P.collider(p, d.zone); P.collider(this.foes, d.zone, null, solid); });
    P.overlap(p, this.foes, (pl, e) => { if (e.dead || e.state === 'dead') return; if (e.ghost) ghostBoom(this, e, true); else this.hurt(e.cfg.touch, e); });
    P.overlap(p, this.foeShots, (pl, o) => this.shotHitsPlayer(o));
    P.overlap(this.myShots, this.foes, (o, e) => { if (!o.active || e.dead) return; hurtFoe(this, e, o.dmg, o); this.puff(o); });
    P.overlap(p, this.drops, (pl, u) => this.takeDrop(u));
    P.collider(this.myShots, this.walls, o => this.puff(o));
    P.collider(this.foeShots, this.walls, o => o.destroy());

    this.buildUI();
    this.updateHud();
    this.nextHunt = this.time.now + 3000; this.flowAt = 0;
    this.setupCameras();
    if (this.flash) cam.flash(700, 255, 255, 255); else { cam.fadeIn(350, 0, 0, 0); this.ui.fadeIn(350, 0, 0, 0); }
    this.areaTitle();
    // la primera vez en cada área (y época): plano general del mapa y después la cámara baja hasta Inkaxur
    const seen = `seen_${run.area}_${this.era}`;
    if (!run.flags[seen] && !this.flash) { run.flags[seen] = true; this.overview(); }
    else this.followPlayer();
    if (run.intro) { run.intro = false; this.afterOverview(() => this.say(null, [
      '¡Inkaxur cayó en el Cusco! Busca el Qorikancha y luego Sacsayhuamán.',
      'Z: golpe con el champi, hablar, abrir · X: escudo (mantener) · Shift: fijar al enemigo (mantener) · Espacio: rodar',
      'C: galleta · V: cetro · Q: quena (las flechas tocan las notas) · E: Casino'])); }
  }

  /* ---------- cámaras ----------
   * La principal ve el mundo con zoom; la de la interfaz (sin zoom) ve solo lo fijo en pantalla (scrollFactor 0).
   * Cada objeto nuevo se asigna a una de las dos justo antes de dibujar. */
  setupCameras() {
    const cam = this.cameras.main;
    this.ui = this.cameras.add(0, 0, GW, GH).setName('ui');
    const classify = o => { if (!o.active && !o.scene) return; if (o.scrollFactorX === 0) cam.ignore(o); else this.ui.ignore(o); };
    this.children.list.forEach(classify);
    let pending = [];
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, o => pending.push(o));
    this.events.on('postupdate', () => { if (pending.length) { pending.forEach(classify); pending = []; } });
  }
  followPlayer() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.W * T4, this.H * T4).setZoom(this.fight ? 1 : ZOOM).startFollow(this.player, true, .15, .15);
    this.overviewing = false;
    const fns = this.overviewFns || []; this.overviewFns = [];
    fns.forEach(f => f());
  }
  afterOverview(fn) { if (this.overviewing) (this.overviewFns = this.overviewFns || []).push(fn); else this.time.delayedCall(500, fn); }
  // plano general: todo el mapa a la vista, luego acercamiento hasta Inkaxur (Z / Espacio / Enter lo saltan)
  overview() {
    const cam = this.cameras.main, W = this.W * T4, H = this.H * T4, p = this.player;
    this.overviewing = true;
    cam.removeBounds(); cam.setZoom(Math.min(GW / W, GH / H)); cam.centerOn(W / 2, H / 2);
    this.overviewTimer = this.time.delayedCall(1900, () => {
      const vw = GW / ZOOM, vh = GH / ZOOM;
      const tx = Phaser.Math.Clamp(p.x, vw / 2, Math.max(vw / 2, W - vw / 2)), ty = Phaser.Math.Clamp(p.y, vh / 2, Math.max(vh / 2, H - vh / 2));
      cam.pan(tx, ty, 1000, 'Sine.easeInOut'); cam.zoomTo(ZOOM, 1000, 'Sine.easeInOut');
      this.overviewTimer = this.time.delayedCall(1020, () => this.followPlayer());
    });
  }
  skipOverview() {
    const cam = this.cameras.main;
    this.overviewTimer?.remove(); cam.panEffect.reset(); cam.zoomEffect.reset();
    this.followPlayer();
  }

  /* ---------- mapa de distancias hasta Inkaxur ----------
   * Recorrido por casillas (sin muros, bloques ni puertas cerradas) desde donde está Inkaxur. Los enemigos que lo
   * persiguen de lejos van a la casilla vecina más cercana a él: así rodean casas y muros. */
  computeFlow() {
    const W = this.W, H = this.H, p = this.player, dist = new Int16Array(W * H).fill(-1);
    const closed = new Set();
    this.doors.forEach(d => { if (!d.isOpen) for (let i = 0; i < d.w; i++) closed.add(d.rot ? `${d.x},${d.y + i}` : `${d.x + i},${d.y}`); });
    this.blocks.forEach(b => closed.add(`${b.cx},${b.cy}`));
    const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !this.grid[y][x] && !closed.has(x + ',' + y);
    const sx = Math.floor(p.x / T4), sy = Math.floor((p.y - 8) / T4);
    if (!free(sx, sy)) { this.flow = null; return; }
    const q = [sx + sy * W]; dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax, ny = y + ay, j = nx + ny * W;
        if (free(nx, ny) && dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); }
      }
    }
    this.flow = dist; this.flowFree = free;
  }
  // siguiente punto hacia Inkaxur desde (x, y) según el mapa de distancias (null si no hay camino)
  flowStep(x, y) {
    const f = this.flow; if (!f) return null;
    const W = this.W, cx = Math.floor(x / T4), cy = Math.floor(y / T4), cur = f[cx + cy * W];
    if (cur === undefined || cur < 0) return null;
    let best = null, bd = cur;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + ax, ny = cy + ay, v = f[nx + ny * W];
      if (v === undefined || v < 0 || v >= bd || nx < 0 || nx >= W) continue;
      if (ax && ay && (!this.flowFree(cx + ax, cy) || !this.flowFree(cx, cy + ay))) continue;  // sin cortar esquinas
      bd = v; best = { x: (nx + .5) * T4, y: (ny + .5) * T4 };
    }
    return best;
  }

  // cada tanto aparece un enemigo fuera de la vista que viene a buscar a Inkaxur (o un fantasma inca)
  huntSpawn(time) {
    const kinds = HUNT[this.run.area];
    if (!kinds || (this.era === 'inca' && this.run.area !== 'qorikancha') || this.fight || time < this.nextHunt) return;
    this.nextHunt = time + Phaser.Math.Between(...HUNT_EVERY);
    if (this.foes.getChildren().filter(e => !e.dead && e.hunt).length >= HUNT_MAX || !this.flow) return;
    const cam = this.cameras.main, v = cam.worldView, p = this.player;
    const ghost = Math.random() < FANTASMA;
    // una casilla libre, con camino hasta Inkaxur, fuera de la vista y no muy lejos
    const W = this.W, cands = [];
    for (let i = 0; i < this.flow.length; i++) {
      const dd = this.flow[i]; if (dd < 7 || dd > 22) continue;
      const x = (i % W + .5) * T4, y = (((i / W) | 0) + .5) * T4;
      if (x > v.x - 40 && x < v.right + 40 && y > v.y - 40 && y < v.bottom + 40) continue;
      cands.push([x, y]);
    }
    if (!cands.length) return;
    const [x, y] = Phaser.Utils.Array.GetRandom(cands);
    spawnFoe(this, ghost ? 'fantasma' : Phaser.Utils.Array.GetRandom(kinds), x, y + 14, { hunt: true });
  }

  /* ---------- texturas por código ---------- */
  makeTextures4() {
    const T = (key, w, h, fn) => { if (this.textures.exists(key)) return; const g = this.make.graphics({ add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };
    T('letrero4', 40, 44, g => {
      g.fillStyle(0x5a3a1a).fillRect(17, 20, 6, 24);
      g.fillStyle(0x3a2410).fillRoundedRect(2, 2, 36, 24, 4); g.fillStyle(0xb07a3a).fillRoundedRect(4, 4, 32, 20, 3);
      g.fillStyle(0x7a4a1a).fillRect(8, 9, 24, 2).fillRect(8, 14, 18, 2).fillRect(8, 19, 22, 2);
    });
    T('piedra4', 14, 14, g => { g.fillStyle(0x4a4a4a).fillCircle(7, 7, 7); g.fillStyle(0x8a8a8a).fillCircle(6, 6, 5); });
    T('grano4', 16, 20, g => { g.fillStyle(0x8a5a00).fillEllipse(8, 10, 16, 20); g.fillStyle(0xffd84a).fillEllipse(8, 10, 12, 16); g.fillStyle(0xfff3b0).fillEllipse(6, 7, 4, 6); });
    T('mira4', 30, 22, g => { g.fillStyle(0xff5a4a).fillTriangle(0, 0, 30, 0, 15, 20); g.fillStyle(0xffd84a).fillTriangle(6, 3, 24, 3, 15, 14); });
    T('ventana4', 48, 48, g => { g.fillStyle(0x1a1208).fillRect(8, 6, 32, 36); g.fillStyle(0xffe08a, .8).fillRect(12, 10, 24, 28); g.fillStyle(0xfff6c8).fillRect(18, 14, 12, 20); });
  }

  /* ---------- mapa ---------- */
  cell(x, y) { return this.A.map[y]?.[x]; }
  buildMap() {
    const A = this.A, era = this.era, map = A.map;
    const H = this.H = map.length, W = this.W = map[0].length;
    this.grid = Array.from({ length: H }, () => Array(W).fill(false));
    const rt = this.add.renderTexture(0, 0, W * T4, H * T4).setOrigin(0).setDepth(-10);
    const groupOf = ch => (ch === '#' || ch === 'n' || (ch === 'K' && era === 'inca')) ? '#' : (ch === 'C' || ch === 'D') ? 'C' : ch;
    const isWallCh = ch => { const c = CELLS[ch]; return !!c && (!!c.wall || !!c.house || (ch === 'K' && era === 'inca')); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = map[y][x], c = CELLS[ch];
      const below = map[y + 1]?.[x];
      const faceOn = below !== undefined && !(isWallCh(below) && groupOf(below) === groupOf(ch));
      let frame, solid = false;
      if (c.house) {
        solid = true;
        if (era === 'hoy') frame = faceOn ? (c.door ? 14 : x % 3 === 1 ? 8 : 6) : 7;
        else frame = faceOn ? (c.door ? 30 : x % 4 === 2 ? 22 : 21) : 23;
      } else if (c.wall || (ch === 'K' && era === 'inca')) {
        solid = true;
        const [top, face] = c.wall ? c.wall[era] : c.wallInca;
        frame = faceOn ? face : top;
      } else {
        frame = c[era];
        solid = c.solid === true || c.solid === era;
      }
      rt.drawFrame('tiles4', frame, x * T4, y * T4);
      this.grid[y][x] = solid;
    }
    this.drawArches();
    // cuerpos de los muros: una caja por cada tramo seguido de casillas sólidas en la fila
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        if (!this.grid[y][x]) { x++; continue; }
        const x0 = x; while (x < W && this.grid[y][x]) x++;
        const z = this.add.zone(x0 * T4, y * T4, (x - x0) * T4, T4).setOrigin(0);
        this.physics.add.existing(z, true); this.walls.add(z);
      }
    }
  }

  // el Arco de Santa Clara (solo existe hoy): un arco de piedra sobre la calle; se pasa por debajo y se dibuja encima
  // de los personajes
  drawArches() {
    if (this.era !== 'hoy') return;
    this.A.map.forEach((row, y) => {
      const a = row.indexOf('A'); if (a < 0) return;
      const b = row.lastIndexOf('A');
      const x0 = a * T4 - 16, x1 = (b + 1) * T4 + 16, top = y * T4 - 44, spring = y * T4 + 36, crown = y * T4 - 4;
      const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 - 18;
      const pts = [{ x: x0, y: top }, { x: x1, y: top }, { x: x1, y: spring + 12 }, { x: cx + hw, y: spring + 12 }];
      for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push({ x: cx + hw * Math.cos(Math.PI * t), y: spring - (spring - crown) * Math.sin(Math.PI * t) }); }
      pts.push({ x: cx - hw, y: spring + 12 }, { x: x0, y: spring + 12 });
      const g = this.add.graphics().setDepth(5000);
      g.fillStyle(0x000000, .25).fillRect(x0 + 6, top + 8, x1 - x0, 20);
      g.fillStyle(0x9a8f7c).fillPoints(pts, true).lineStyle(3, 0x3a342c).strokePoints(pts, true);
      // hileras de piedra, dovelas y la clave
      g.lineStyle(1, 0x6a604e);
      for (let yy = top + 12; yy < crown - 4; yy += 12) g.lineBetween(x0 + 3, yy, x1 - 3, yy);
      for (let i = 1; i < 12; i++) { const t = i / 12, ax = cx + hw * Math.cos(Math.PI * t), ay = spring - (spring - crown) * Math.sin(Math.PI * t); g.lineBetween(ax, ay, cx + (hw + 16) * Math.cos(Math.PI * t), ay - 16 * Math.sin(Math.PI * t) - 4); }
      g.fillStyle(0xc8bca4).fillRect(cx - 9, crown - 22, 18, 22).lineStyle(2, 0x3a342c).strokeRect(cx - 9, crown - 22, 18, 22);
      g.fillStyle(0xb0a48c).fillRect(x0 - 4, top - 8, x1 - x0 + 8, 10).lineStyle(2, 0x3a342c).strokeRect(x0 - 4, top - 8, x1 - x0 + 8, 10);
    });
  }

  // una casilla sólida extra (cosas, decorados): cuerpo estático + marca en la grilla
  solidCell(cx, cy, w = 1, h = 1) {
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) if (this.grid[y]) this.grid[y][x] = true;
    const z = this.add.zone(cx * T4, cy * T4, w * T4, h * T4).setOrigin(0);
    this.physics.add.existing(z, true); this.solids.add(z);
    return z;
  }
  blockZone(cx, cy) {
    const z = this.add.zone(cx * T4 + 1, cy * T4 + 1, T4 - 2, T4 - 2).setOrigin(0);
    this.physics.add.existing(z, true); this.solids.add(z);
    return z;
  }
  isFree(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H || this.grid[cy][cx]) return false;
    return !this.blocks.some(b => b.cx === cx && b.cy === cy);
  }

  /* ---------- cosas del área ---------- */
  buildThings() {
    const run = this.run, A = this.A, era = this.era, F = run.flags, id = run.area;
    A.things.forEach((t, i) => {
      if (t.era && t.era !== era) return;
      const cx = (t.x + .5) * T4, cy = (t.y + .5) * T4;
      const th = { ...t, i };
      switch (t.t) {
        case 'decor': {
          const key = (IMAGES_4['d4_' + t.k] ? 'd4_' : 'o4_') + t.k;
          const im = this.add.image(t.x * T4, t.y * T4, key).setOrigin(.5, 1).setScale(t.scale || 1).setDepth(t.y * T4 - 2);
          if (t.solid) this.solidCell(...t.solid);
          else if (['molle', 'eucalipto', 'farol'].includes(t.k)) this.solidCell(Math.round(t.x - .5), Math.floor(t.y - .01));
          if (t.label) this.label(t.x * T4, t.y * T4 - im.displayHeight - 8, t.label);
          break;
        }
        case 'label': this.label(cx, t.y * T4, t.text); break;
        case 'ring': {
          const g = this.add.graphics().setDepth(-5);
          g.lineStyle(10, 0x6a6a5a).strokeCircle(cx, cy, t.r * T4); g.lineStyle(4, 0x9a9a88).strokeCircle(cx, cy, t.r * T4 - 14);
          g.lineStyle(6, 0x6a6a5a).strokeCircle(cx, cy, t.r * T4 * .45);
          this.label(cx, cy - t.r * T4 - 10, t.label);
          break;
        }
        case 'sign': th.obj = this.add.image(cx, (t.y + 1) * T4 - 2, 'letrero4').setOrigin(.5, 1).setDepth(cy); this.solidCell(t.x, t.y); break;
        case 'stone': th.obj = this.add.image(cx, (Math.floor(t.y) + 1) * T4, 'o4_piedra_tiempo').setOrigin(.5, 1).setScale(.62).setDepth(cy);
          this.tweens.add({ targets: th.obj, alpha: .75, yoyo: true, repeat: -1, duration: 900 });
          th.y = Math.floor(t.y); this.solidCell(t.x, th.y); break;
        case 'npc': {
          const f = { paqo: 0, nusta: 6, runa: 9 }[t.k];
          th.obj = this.add.sprite(cx, (t.y + 1) * T4 - 4, 'npcs4', f).setOrigin(.5, 1).setDepth(cy).play(t.k + '-idle4');
          if (t.tint) th.obj.setTint(t.tint);
          this.solidCell(Math.floor(t.x), Math.floor(t.y));
          if (t.id === 'paqo' && !F.metPaqo) this.bubble(th.obj);
          if (t.id === 'willaq' && !run.songs.sol) this.bubble(th.obj);
          break;
        }
        case 'chest': {
          const opened = F['chest_' + t.id];
          th.opened = opened;
          th.obj = this.add.image(cx, (t.y + 1) * T4 - 2, opened ? 'o4_cofre_abierto' : 'o4_cofre').setOrigin(.5, 1).setScale(.9).setDepth(cy);
          if (t.appear && !F['clear_' + t.appear] && !opened) { th.obj.setVisible(false); th.hidden = true; }
          else th.zone = this.solidCell(t.x, t.y);
          break;
        }
        case 'block': {
          const saved = run.blocks[id]?.[this.blocks.length];
          const bx = saved ? saved[0] : t.x, by = saved ? saved[1] : t.y;
          // la imagen es solo el dibujo; el cuerpo es una zona estática que se vuelve a crear al empujarlo
          const b = this.add.image((bx + .5) * T4, (by + 1) * T4, 'o4_bloque').setOrigin(.5, 1).setDisplaySize(50, 56).setDepth((by + .5) * T4);
          b.cx = bx; b.cy = by; b.zone = this.blockZone(bx, by); this.blocks.push(b);
          break;
        }
        case 'plate': th.obj = this.add.image(cx, cy + 4, 'o4_placa').setDepth(-6).setScale(1.2); th.on = false; this.plates.push(th); break;
        case 'mirror': {
          const key = `mirror_${id}_${t.x}_${t.y}`;
          th.m = F[key] || t.m; th.key = key;
          th.obj = this.add.image(cx, (t.y + 1) * T4, 'o4_espejo').setOrigin(.5, 1).setScale(.65).setDepth(cy);
          th.mark = this.add.graphics().setDepth(cy + 1);
          this.drawMirror(th);
          this.solidCell(t.x, t.y); this.mirrors.push(th);
          break;
        }
        case 'window': th.obj = this.add.image(cx, cy - T4, 'ventana4').setDepth(-4); this.window = th; break;
        case 'target': th.obj = this.add.image(cx, (t.y + 1) * T4, 'o4_disco_pedestal').setOrigin(.5, 1).setScale(.62).setDepth(cy); this.solidCell(t.x, t.y); this.target = th; break;
        case 'barrier': {
          for (let y = t.y; y < t.y + t.h; y += 2) for (let x = t.x; x < t.x + t.w; x += 2) {
            this.add.image((x + 1) * T4, (y + 1.6) * T4, 'o4_bloque').setOrigin(.5, 1).setDisplaySize(64, 70).setDepth((y + 1) * T4).setTint(0xd8c8a8);
          }
          this.solidCell(t.x, t.y, t.w, t.h);
          break;
        }
        case 'door': this.makeDoor(th); break;
        case 'foe':
          if (t.group && F['clear_' + t.group]) return;
          th.obj = spawnFoe(this, t.k, cx, cy + 14, { group: t.group });
          break;
        case 'boss':
          // ya vencido: si todavía no se abrió su cofre (se vuelve del Round 2), el cofre está en el centro de la arena
          if (F['boss_' + t.k]) { if (!F['chest_jefe_' + t.k]) this.time.delayedCall(0, () => this.rewardChest(th)); return; }
          this.bossThing = th;
          break;
        case 'exit': {
          const z = this.add.zone(t.x * T4, t.y * T4, t.w * T4, t.h * T4).setOrigin(0);
          this.physics.add.existing(z, true); th.zone = z; this.exits.push(th);
          break;
        }
      }
      this.things.push(th);
    });
    // plataformas ya resueltas
    this.plates.forEach(pl => { if (F['group_' + pl.group]) { pl.on = true; pl.obj.setTexture('o4_placa_on'); } });
    this.beamOn = !!F['beam_' + id];
    this.beam = this.add.graphics().setDepth(2900).setBlendMode(Phaser.BlendModes.ADD);
    // el jefe aparece cuando se entra a su arena
    if (this.bossThing) {
      const b = this.bossThing;
      this.bossSprite = this.add.sprite((b.x + .5) * T4, (b.y + .5) * T4, BOSSES4[b.k].sheet, 0).setOrigin(.5, .96).setScale(BOSSES4[b.k].scale).setDepth(b.y * T4).setAlpha(.9);
      this.bossSprite.play(b.k + '-idle4');
    }
  }

  label(x, y, text) {
    this.add.text(x, y, text, { fontFamily: FONT, fontSize: '15px', color: '#ffe8a8', stroke: '#1d2a44', strokeThickness: 4, align: 'center' }).setOrigin(.5, 1).setDepth(4000).setAlpha(.9);
  }
  bubble(obj) {
    const b = this.add.text(obj.x, obj.y - obj.displayHeight - 6, '!', { fontFamily: FONT, fontSize: '26px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 5 }).setOrigin(.5, 1).setDepth(4000);
    this.tweens.add({ targets: b, y: b.y - 8, yoyo: true, repeat: -1, duration: 450 });
    obj.bubbleText = b;
  }

  /* ---------- puertas ---------- */
  makeDoor(th) {
    const t = th, F = this.run.flags;
    th.fid = `door_${this.run.area}_${t.id || t.i}`;
    const w = t.w * T4;
    const cx = t.rot ? (t.x + .5) * T4 : t.x * T4 + w / 2;
    const cy = t.rot ? t.y * T4 + w / 2 : (t.y + 1) * T4;
    th.obj = this.add.image(cx, cy, 'o4_' + t.k).setOrigin(.5, t.rot ? .5 : 1).setDepth(t.rot ? cy : (t.y + .6) * T4);
    const sc = w / th.obj.width;
    th.obj.setScale(sc, Math.min(sc, 1.25));
    if (t.rot) th.obj.setAngle(-90);
    th.zone = this.add.zone(t.x * T4, t.y * T4, t.rot ? T4 : w, t.rot ? w : T4).setOrigin(0);
    this.physics.add.existing(th.zone, true);
    this.doors.push(th);
    if (t.open || F[th.fid] || (t.opens && F['group_' + t.opens])) this.openDoor(th, true);
  }
  openDoor(th, silent) {
    if (th.isOpen) return;
    th.isOpen = true; th.zone.body.enable = false;
    th.obj.setTexture('o4_puerta_abierta');
    this.run.flags[th.fid] = true;
    if (!silent) { SND.up(); this.cameras.main.shake(200, .004); this.hud.popup('¡Se abrió la puerta!', th.obj.x, th.obj.y - 110); }
  }
  closeDoor(th) {
    th.isOpen = false; th.zone.body.enable = true;
    th.obj.setTexture('o4_' + th.k);
    SND.stomp(); this.cameras.main.shake(200, .006);
  }

  /* ---------- interfaz: barra de objetos, diálogo, quena ---------- */
  buildUI() {
    const st = { fontFamily: FONT, fontSize: '13px', color: '#fff', stroke: '#1d2a44', strokeThickness: 4 };
    // la barra se dibuja en una textura (una sola imagen) y no como Graphics: en WebGL un Graphics se vuelve a
    // triangular en cada cuadro aunque no cambie, y las esquinas redondeadas se comían casi todo el tiempo de dibujo
    this.barG = this.make.graphics({ add: false }); this.barState = null;   // (la escena se reinicia en cada área)
    this.events.once('shutdown', () => this.barG.destroy());
    this.bar = this.add.renderTexture(GW / 2 - 3 * 58 - 28, GH - 62, 6 * 58 + 56, 56).setOrigin(0).setScrollFactor(0).setDepth(6000);
    const slots = [['Z', 'i4_champi', .55, () => true], ['X', 'i4_escudo', .6, () => true], ['C', 'galletaMenta', .9, () => true, 0],
      ['V', 'i4_cetro_choclo', .5, () => this.run.has.cetro], ['Q', 'i4_quena', .55, () => this.run.has.quena],
      ['E', 'items', .8, () => this.run.inv.casino > 0, 5], ['', 'i4_llave', .6, () => this.run.inv.llave > 0]];
    this.slots = slots.map(([key, tex, s, on, frame], i) => {
      const x = GW / 2 + (i - 3) * 58, y = GH - 34;
      const ic = this.add.image(x, y, tex, frame).setScale(s).setScrollFactor(0).setDepth(6001);
      const lab = this.add.text(x - 23, y - 24, key, st).setScrollFactor(0).setDepth(6002);
      const cnt = this.add.text(x + 24, y + 22, '', st).setOrigin(1).setScrollFactor(0).setDepth(6002);
      return { x, y, ic, on, cnt, key };
    });
    this.eraTxt = this.add.text(GW - 12, 10, '', { ...st, fontSize: '15px' }).setOrigin(1, 0).setScrollFactor(0).setDepth(6002);
    this.lockMark = this.add.image(0, 0, 'mira4').setDepth(5500).setVisible(false);
  }
  // solo se redibuja cuando algo cambia (objetos, recarga de la galleta o del cetro, época)
  drawBar(time) {
    const state = this.slots.map(s => {
      const cdk = { C: 'galleta', V: 'cetro' }[s.key], left = cdk ? Math.max(0, (this.cd[cdk] || 0) - time) : 0;
      s.left = left; s.isOn = s.on();
      return (s.isOn ? 1 : 0) + ':' + Math.ceil(Math.min(1, left / 900) * 23);
    }).join(',') + this.run.inv.casino + ',' + this.run.inv.llave + this.era;
    if (state === this.barState) return;
    this.barState = state;
    const g = this.barG; g.clear();
    this.slots.forEach(s => {
      g.fillStyle(0x1d2a44, .75).fillRoundedRect(s.x - 25, s.y - 25, 50, 50, 8);
      if (s.left > 0) g.fillStyle(0x000000, .5).fillRect(s.x - 23, s.y - 23, 46, 46 * Math.min(1, s.left / 900));
      g.lineStyle(2, s.isOn ? 0xffd84a : 0x5a4a3a).strokeRoundedRect(s.x - 25, s.y - 25, 50, 50, 8);
      s.ic.setAlpha(s.isOn ? 1 : .25);
      s.cnt.setText(s.key === 'E' ? 'x' + this.run.inv.casino : s.key === '' ? 'x' + this.run.inv.llave : '');
    });
    this.bar.clear().draw(g, -this.bar.x, -this.bar.y);
    this.eraTxt.setText(this.era === 'hoy' ? 'Cusco de hoy' : 'Cusco inca');
  }
  areaTitle() {
    const A = this.A, name = this.era === 'inca' && A.incaName ? A.incaName : A.name;
    const t = this.add.text(GW / 2, 70, name, { fontFamily: FONT, fontSize: '34px', color: '#ffe8a8', stroke: '#1d2a44', strokeThickness: 8 }).setOrigin(.5).setScrollFactor(0).setDepth(6100).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 400, yoyo: true, hold: 1400, onComplete: () => t.destroy() });
  }
  updateHud() { renderHud({ hp: this.run.hp, max: this.run.maxHp, score: this.run.score, coins: this.run.coins, time: 0, char: 'xoxurInka' }); }
  renderBossBar(hp, max) { renderBoss(hp, max); }

  // diálogo abajo: una o varias líneas; Z / Enter avanza
  say(name, lines, onDone) {
    if (typeof lines === 'string') lines = [lines];
    this.stopPlayer();
    const box = this.add.graphics().setScrollFactor(0).setDepth(7000);
    box.fillStyle(0x0b0806, .88).fillRoundedRect(40, GH - 170, GW - 80, 116, 12).lineStyle(3, 0xffd84a).strokeRoundedRect(40, GH - 170, GW - 80, 116, 12);
    const nm = this.add.text(62, GH - 164, name || '', { fontFamily: FONT, fontSize: '18px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 4 }).setScrollFactor(0).setDepth(7001);
    const tx = this.add.text(62, GH - (name ? 138 : 156), '', { fontFamily: 'sans-serif', fontSize: '19px', color: '#f4ecd8', wordWrap: { width: GW - 130 }, lineSpacing: 4 }).setScrollFactor(0).setDepth(7001);
    const arrow = this.add.text(GW - 64, GH - 72, '▼', { fontSize: '16px', color: '#ffd84a' }).setScrollFactor(0).setDepth(7001);
    this.tweens.add({ targets: arrow, y: arrow.y + 5, yoyo: true, repeat: -1, duration: 350 });
    this.dialog = { lines: lines.slice(), box, nm, tx, arrow, onDone, shownAt: this.time.now };
    tx.setText(this.dialog.lines.shift());
  }
  advanceDialog() {
    const d = this.dialog;
    if (this.time.now - d.shownAt < 180) return;
    if (d.lines.length) { d.tx.setText(d.lines.shift()); d.shownAt = this.time.now; sfx(700, 700, .03, 'square', .02); return; }
    [d.box, d.nm, d.tx, d.arrow].forEach(o => o.destroy());
    this.dialog = null;
    this.freePlayer();
    d.onDone?.();
  }

  // la quena: flechas = notas; se reconocen las canciones aprendidas
  openQuena() {
    if (!this.run.has.quena || this.quena) return;
    this.stopPlayer();
    const p = this.player;
    p.anims.stop(); p.setTexture('inkaxurAccion', ACC.quena).setFlipX(false);
    const g = this.add.graphics().setScrollFactor(0).setDepth(7000);
    const x0 = GW / 2 - 250, y0 = 40;
    g.fillStyle(0x0b0806, .88).fillRoundedRect(x0, y0, 500, 170, 12).lineStyle(3, 0xffd84a).strokeRoundedRect(x0, y0, 500, 170, 12);
    for (let i = 0; i < 4; i++) g.lineStyle(1, 0x8a7a5a).lineBetween(x0 + 30, y0 + 50 + i * 14, x0 + 470, y0 + 50 + i * 14);
    const title = this.add.text(GW / 2, y0 + 8, 'Quena — flechas: tocar · Q / Esc: guardar', { fontFamily: FONT, fontSize: '16px', color: '#ffd84a' }).setOrigin(.5, 0).setScrollFactor(0).setDepth(7001);
    const known = Object.entries(SONGS).filter(([k]) => this.run.songs[k]).map(([k, s]) => `${s.name}: ${s.notes.map(n => NOTES[n].s).join(' ')}`);
    const list = this.add.text(x0 + 24, y0 + 112, known.length ? known.join('\n') : 'Todavía no sabes ninguna canción.', { fontFamily: 'sans-serif', fontSize: '15px', color: '#f4ecd8', lineSpacing: 3 }).setScrollFactor(0).setDepth(7001);
    this.quena = { g, title, list, notes: [], icons: [] };
  }
  closeQuena() {
    const q = this.quena; if (!q) return;
    [q.g, q.title, q.list, ...q.icons].forEach(o => o.destroy());
    this.quena = null; this.freePlayer();
  }
  playNote(n) {
    const q = this.quena, NOTE = NOTES[n];
    sfx(NOTE.f, NOTE.f * 1.01, .35, 'sine', .09); sfx(NOTE.f * 2, NOTE.f * 2, .2, 'triangle', .02);
    this.player.setFrame(ACC.quena + (q.notes.length % 2));
    q.notes.push(n); if (q.notes.length > 8) { q.notes.shift(); }
    q.icons.forEach(o => o.destroy());
    const x0 = GW / 2 - 200, ys = { up: 46, left: 60, right: 74, down: 88 };
    q.icons = q.notes.map((m, i) => this.add.text(x0 + i * 52, 40 + ys[m], NOTES[m].s, { fontSize: '20px', color: '#ffd84a' }).setOrigin(.5).setScrollFactor(0).setDepth(7002));
    for (const [k, s] of Object.entries(SONGS)) {
      if (!this.run.songs[k] || q.notes.length < s.notes.length) continue;
      if (s.notes.every((m, i) => q.notes[q.notes.length - s.notes.length + i] === m)) {
        this.busy = true;
        this.time.delayedCall(350, () => { this.melody(s.notes); });
        this.time.delayedCall(1500, () => { this.busy = false; this.closeQuena(); this.performSong(k); });
        return;
      }
    }
  }
  melody(notes) { notes.forEach((n, i) => this.time.delayedCall(i * 150, () => sfx(NOTES[n].f, NOTES[n].f, .18, 'sine', .08))); }

  performSong(k) {
    const p = this.player;
    this.hud.banner(SONGS[k].name, '#ffd84a');
    if (k === 'tiempo') {
      const stone = this.things.find(t => t.t === 'stone' && t.obj && Phaser.Math.Distance.Between(p.x, p.y, t.obj.x, t.obj.y) < 130);
      if (!stone || this.A.fixedEra) { this.hud.popup('La canción resuena… busca una piedra del tiempo', p.x, p.y - 80); return; }
      // viaje en el tiempo: la misma área en la otra época (los bloques quedan donde estaban)
      this.run.blocks[this.run.area] = this.blocks.map(b => [b.cx, b.cy]);
      this.run.era = this.era === 'hoy' ? 'inca' : 'hoy';
      this.run.pos = [p.x / T4 - .5, (p.y - 14) / T4 - .5];
      this.busy = true;
      this.cameras.main.flash(600, 200, 230, 255); sfx(200, 1400, 1.2, 'sine', .08);
      this.time.delayedCall(500, () => this.scene.restart({ run: this.run, flash: true }));
    } else if (k === 'sol') {
      this.cameras.main.flash(400, 255, 230, 120);
      if (this.window && Phaser.Math.Distance.Between(p.x, p.y, this.window.obj.x, this.window.obj.y) < 520) {
        this.beamOn = true; this.run.flags['beam_' + this.run.area] = true; this.hud.popup('¡Entra la luz del Inti!', p.x, p.y - 80);
      }
      if (this.boss?.alive && this.boss.kind === 'supay' && Phaser.Math.Distance.Between(p.x, p.y, this.boss.x, this.boss.y) < 700) this.boss.stun(3200);
      // las criaturas del Uku Pacha cercanas quedan aturdidas un momento
      this.foes.getChildren().forEach(e => { if (!e.dead && e.kind === 'mallqui' && Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y) < 300) e.stunUntil = this.time.now + 2000; });
    }
  }

  /* ---------- Inkaxur: quieto (diálogo, quena) / libre ---------- */
  stopPlayer() { this.player?.setVelocity(0, 0); this.frozen = true; }
  freePlayer() { this.frozen = false; }

  hurt(n, src, push = 180, unblockable = false) {
    const now = this.time.now, p = this.player;
    if (this.dead || now < this.invuln || now < this.rollUntil || this.frozen) return;
    // el escudo para lo que viene de frente
    if (!unblockable && this.shielding && src) {
      const dx = src.x - p.x, dy = src.y - p.y, d = Math.hypot(dx, dy) || 1;
      if ((dx * this.face.x + dy * this.face.y) / d > .3) {
        this.spark(p.x + this.face.x * 24, p.y - 26 + this.face.y * 16); sfx(1200, 900, .08, 'square', .05);
        p.setVelocity(-dx / d * push * .6, -dy / d * push * .6); this.knockUntil = now + 120;
        return;
      }
    }
    this.run.hp = Math.max(0, this.run.hp - n); this.invuln = now + 900;
    SND.hurt(); this.cameras.main.shake(120, .005);
    this.hud.popup('-' + n, p.x, p.y - 70);
    if (src) { const a = Phaser.Math.Angle.Between(src.x, src.y, p.x, p.y); p.setVelocity(Math.cos(a) * push, Math.sin(a) * push); this.knockUntil = now + 160; }
    this.updateHud();
    if (this.run.hp <= 0) this.die();
  }

  shotHitsPlayer(o) {
    if (!o.active || this.dead) return;
    const p = this.player, now = this.time.now;
    if (now < this.rollUntil) return;
    // con el escudo de frente el proyectil rebota (y ahora daña a los enemigos: ¡hasta al Supay con su fuego!)
    if (this.shielding) {
      const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1;
      if ((dx * this.face.x + dy * this.face.y) / d > .2) {
        // (la velocidad se lee antes de cambiar de grupo: al agregarlo a un grupo de física se reinicia)
        const v = { x: o.body.velocity.x, y: o.body.velocity.y }, sp = Math.max(260, Math.hypot(v.x, v.y) * 1.3);
        this.foeShots.remove(o); this.myShots.add(o);
        // como en Zelda: el fuego del jefe vuelve derecho hacia él; lo demás rebota para atrás
        const a = o.fire && this.boss?.alive ? Phaser.Math.Angle.Between(o.x, o.y, this.boss.x, this.boss.y - 60) : Math.atan2(-v.y, -v.x);
        o.body.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp); o.setRotation(a);
        o.dmg = o.fire ? 30 : o.dmg * 2; o.reflected = true;
        this.spark(o.x, o.y); sfx(1400, 700, .1, 'square', .05);
        return;
      }
    }
    this.hurt(o.dmg, o);
    o.destroy();
  }

  /* ---------- ataques de Inkaxur ---------- */
  aimVec() {
    const p = this.player;
    if (this.lock && !this.lock.dead && this.lock.active !== false) {
      const tx = this.lock.x, ty = this.lock.y, d = Math.hypot(tx - p.x, ty - p.y) || 1;
      return { x: (tx - p.x) / d, y: (ty - p.y) / d };
    }
    return this.face;
  }

  swing(time) {
    const p = this.player;
    this.combo = (this.atk || time - this.lastAtkEnd < 260) ? (this.combo + 1) % 3 : 0;
    this.atk = { start: time, hit: false, dmg: COMBO[this.combo] };
    sfx(this.combo === 2 ? 300 : 500, 150, .12, 'sawtooth', .05);
  }
  updateSwing(time) {
    const a = this.atk; if (!a) return false;
    const p = this.player, t = time - a.start;
    const side = this.dir === 'left' || this.dir === 'right';
    const base = ACC.atk[side ? 'side' : this.dir];
    p.anims.stop(); p.setTexture('inkaxurAccion', base + (t < 70 ? 0 : t < 170 ? 1 : 2)).setFlipX(this.dir === 'right');
    if (!a.hit && t >= 80) {
      a.hit = true;
      const v = this.aimVec(), hx = p.x + v.x * 40, hy = p.y - 20 + v.y * 30, R = 50;
      this.foes.getChildren().forEach(e => { if (!e.dead && Phaser.Math.Distance.Between(hx, hy, e.x, e.y - 20) < R + 16) hurtFoe(this, e, a.dmg, p); });
      if (this.boss?.alive && Phaser.Math.Distance.Between(hx, hy, this.boss.x, this.boss.y - 30) < R + 60) this.boss.hit(a.dmg, p);
    }
    if (t > 280) { this.atk = null; this.lastAtkEnd = time; return false; }
    return true;
  }

  throwGalleta(time) {
    if (time < (this.cd.galleta || 0)) return;
    this.cd.galleta = time + 380;
    const p = this.player, v = this.aimVec();
    const o = this.physics.add.sprite(p.x, p.y - 26, 'galletaMenta', 0).play('menta-spin').setDepth(3000);
    this.myShots.add(o); o.body.setCircle(11, 5, 5); o.dmg = 6;
    o.setVelocity(v.x * 540, v.y * 540);
    this.time.delayedCall(800, () => o.active && this.puff(o));
    sfx(700, 350, .1, 'square', .05);
  }
  throwGranos(time) {
    if (!this.run.has.cetro || time < (this.cd.cetro || 0)) return;
    this.cd.cetro = time + 900;
    const p = this.player, v = this.aimVec(), a0 = Math.atan2(v.y, v.x);
    [-.2, 0, .2].forEach(da => {
      const o = this.physics.add.image(p.x, p.y - 26, 'grano4').setDepth(3000).setRotation(a0 + da + Math.PI / 2);
      this.myShots.add(o); o.body.setCircle(8); o.dmg = 9;
      o.setVelocity(Math.cos(a0 + da) * 580, Math.sin(a0 + da) * 580);
      this.time.delayedCall(650, () => o.active && this.puff(o));
    });
    sfx(900, 1500, .15, 'triangle', .06);
  }

  puff(o) {
    if (!o.active) return;
    const s = this.add.circle(o.x, o.y, 8, 0xfff3b0, .8).setDepth(3001);
    this.tweens.add({ targets: s, scale: 2.4, alpha: 0, duration: 220, onComplete: () => s.destroy() });
    o.destroy();
  }
  spark(x, y) {
    for (let i = 0; i < 6; i++) {
      const s = this.add.rectangle(x, y, 4, 4, 0xfff3b0).setDepth(4000), a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, alpha: 0, duration: 220, onComplete: () => s.destroy() });
    }
  }
  damageText(e, n) {
    const t = this.add.text(e.x + Phaser.Math.Between(-14, 14), e.y - e.displayHeight * .85, String(n), { fontFamily: FONT, fontSize: '22px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 5 }).setOrigin(.5).setDepth(5000);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  /* ---------- enemigos ---------- */
  spawnFoeAt(kind, x, y) {
    x = Phaser.Math.Clamp(x, T4 * 1.5, (this.W - 1.5) * T4); y = Phaser.Math.Clamp(y, T4 * 1.5, (this.H - 1.5) * T4);
    const e = spawnFoe(this, kind, x, y);
    const g = this.add.circle(x, y - 10, 30, kind === 'mallqui' ? 0x9dff6a : 0xffd84a, .5).setDepth(1);
    this.tweens.add({ targets: g, scale: 2, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    return e;
  }
  onFoeDead(e, killed = true) {
    if (this.lock === e) this.lock = null;
    if (killed) {
      this.run.score += 200; this.updateHud();
      const r = Math.random();
      if (r < .38) this.drop('coin', e.x, e.y); else if (r < .52) this.drop('mullu', e.x, e.y);
    }
    // grupo vencido (los mallquis del Templo de la Luna): aparece el cofre
    if (e.group && !this.foes.getChildren().some(o => !o.dead && o.group === e.group)) {
      this.run.flags['clear_' + e.group] = true;
      const ch = this.things.find(t => t.t === 'chest' && t.appear === e.group);
      if (ch && ch.hidden) {
        ch.hidden = false; ch.obj.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: ch.obj, alpha: 1, duration: 500 });
        ch.zone = this.solidCell(ch.x, ch.y);
        SND.up(); this.hud.popup('¡Apareció un cofre!', ch.obj.x, ch.obj.y - 60);
      }
    }
  }
  drop(kind, x, y) {
    const u = kind === 'coin' ? this.drops.create(x, y - 16, 'coinT') : this.drops.create(x, y - 16, 'i4_mullu').setScale(.6);
    u.kind = kind; u.setDepth(y);
    this.tweens.add({ targets: u, y: u.y - 8, duration: 450, yoyo: true, repeat: -1 });
    this.time.delayedCall(12000, () => u.active && u.destroy());
  }
  takeDrop(u) {
    const k = u.kind; u.destroy(); SND.coin();
    if (k === 'coin') { this.run.coins++; this.run.score += 100; }
    else { this.run.hp = Math.min(this.run.maxHp, this.run.hp + 20); this.hud.popup('+20 (mullu)', this.player.x, this.player.y - 70); }
    this.updateHud();
  }

  /* ---------- jefes ---------- */
  startBoss() {
    const b = this.bossThing, cfg = BOSSES4[b.k];
    this.bossSprite.destroy();
    this.boss = new Boss4(this, b.k, (b.x + .5) * T4, (b.y + .5) * T4);
    const s = this.boss.sprite;
    this.physics.add.collider(s, this.walls);
    this.physics.add.collider(this.player, s, () => { if (this.boss.alive) this.hurt(12, s); });
    this.physics.add.overlap(this.myShots, s, (x, y) => {
      const o = x === s ? y : x;
      if (!o.active || !this.boss.alive) return;
      this.boss.hit(o.dmg, o); this.puff(o);
    });
    // se cierra la puerta por donde se entró
    this.arenaDoor = this.doors.find(d => d.isOpen && d.id && (d.id === 'inti' || d.id === 'wiracocha'));
    if (this.arenaDoor) this.closeDoor(this.arenaDoor);
    showBossPanel(true, cfg); renderBoss(this.boss.hp, this.boss.max);
    this.cameras.main.zoomTo(1, 700, 'Sine.easeInOut');
    this.hud.banner(cfg.name, '#ff8a7a');
    this.fight = true;
  }
  onBossDefeated(b) {
    this.run.flags['boss_' + b.kind] = true;
    this.run.score += 6000; this.run.coins += 30; this.updateHud();
    this.foes.getChildren().forEach(e => { if (!e.dead) hurtFoe(this, e, 999, b.sprite); });
    this.foeShots.clear(true, true);
    showBossPanel(false); this.fight = false;
    this.cameras.main.zoomTo(ZOOM, 900, 'Sine.easeInOut');
    this.hud.banner(b.kind === 'supay' ? '¡El Supay vuelve al Uku Pacha!' : '¡Pachacútec descansa!', '#9dff6a');
    if (this.arenaDoor) this.time.delayedCall(1200, () => this.openDoor(this.arenaDoor, true));
    // los jefes no se rinden: «ROUND 2», fundido a negro y la pelea de costado estilo Street Fighter (Pelea.js).
    // Al ganarla se vuelve acá y aparece el cofre (el cetro del Supay, la Chakana de Pachacútec)
    if (b.kind === 'supay' || b.kind === 'pachacutec') {
      this.busy = true; this.stopPlayer();
      this.time.delayedCall(1500, () => {
        const t = this.add.text(GW / 2, GH / 2 - 30, 'ROUND 2', { fontFamily: FONT, fontSize: '110px', color: '#ffd84a', stroke: '#1d0a0a', strokeThickness: 14 })
          .setOrigin(.5).setScrollFactor(0).setDepth(7500).setScale(.3).setAlpha(0);
        this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 300, ease: 'Back.out' });
        sfx(160, 700, .5, 'sawtooth', .08); this.cameras.main.shake(300, .006);
        this.time.delayedCall(1400, () => {
          this.cameras.main.fade(900, 0, 0, 0, true); this.ui.fade(900, 0, 0, 0, true);
          this.time.delayedCall(950, () => {
            const bt = this.bossThing, back = { ...this.run, pos: [bt.x, bt.y + 2] };
            this.scene.start('pelea', { back, rival: b.kind });
          });
        });
      });
      return;
    }
    // el premio: un cofre en el centro de la arena
    this.time.delayedCall(1800, () => this.rewardChest(this.bossThing));
  }

  rewardChest(bt) {
    const item = bt.k === 'supay' ? 'cetro' : 'chakana';
    const cx = Math.round(bt.x), cy = Math.round(bt.y) - 1;
    const th = { t: 'chest', x: cx, y: cy, item, id: 'jefe_' + bt.k, i: 999 };
    th.obj = this.add.image((cx + .5) * T4, (cy + 1) * T4 - 2, 'o4_cofre').setOrigin(.5, 1).setScale(1.1).setDepth((cy + .5) * T4).setAlpha(0);
    this.tweens.add({ targets: th.obj, alpha: 1, duration: 600 });
    th.zone = this.solidCell(cx, cy);
    this.things.push(th);
    SND.up();
  }

  /* ---------- interactuar (Z) ---------- */
  interactTarget() {
    const p = this.player, fx = p.x + this.face.x * 44, fy = p.y - 10 + this.face.y * 44;
    let best = null, bd = 46;
    this.things.forEach(t => {
      if (!['sign', 'npc', 'chest', 'stone', 'mirror', 'door', 'target'].includes(t.t) || !t.obj || t.hidden) return;
      if (t.t === 'door' && t.isOpen) return;
      let ox, oy;
      if (t.t === 'door') { ox = Phaser.Math.Clamp(fx, t.zone.x, t.zone.x + t.zone.width); oy = Phaser.Math.Clamp(fy, t.zone.y, t.zone.y + t.zone.height); }
      else { ox = (t.x + .5) * T4; oy = (Math.floor(t.y) + .5) * T4; }
      const d = Phaser.Math.Distance.Between(fx, fy, ox, oy);
      if (d < bd) { bd = d; best = t; }
    });
    return best;
  }
  interact(t) {
    const run = this.run, F = run.flags;
    if (t.t === 'sign') { this.say(null, t.text); return; }
    if (t.t === 'stone') { this.say(null, run.songs.tiempo ? 'La piedra de los doce ángulos brilla. Toca la Canción del Tiempo con Q.' : 'Una piedra perfecta, de doce ángulos. Parece que guarda algo… como un eco del pasado.'); return; }
    if (t.t === 'target') { this.say(null, 'Un pequeño disco de oro del Inti. Espera la luz del Sol.'); return; }
    if (t.t === 'mirror') {
      t.m = t.m === '/' ? '\\' : '/'; F[t.key] = t.m; this.drawMirror(t);
      sfx(900, 1200, .08, 'triangle', .05);
      return;
    }
    if (t.t === 'npc') {
      t.obj.bubbleText?.destroy(); t.obj.bubbleText = null;
      if (t.id === 'paqo') {
        if (run.has.cetro) { this.say('Paqo', TALKS.paqo.after); return; }
        if (F.metPaqo) { this.say('Paqo', TALKS.paqo.again); return; }
        t.obj.play('paqo-talk4');
        this.say('Paqo', TALKS.paqo.first, () => {
          t.obj.play('paqo-idle4');
          F.metPaqo = true; run.has.quena = true; run.songs.tiempo = true;
          this.itemGet('i4_quena', GOT.quena, () => this.say(null, GOT.tiempo));
        });
        return;
      }
      if (t.id === 'willaq') {
        if (run.songs.sol) { this.say('Willaq Umu', TALKS.willaq.again); return; }
        t.obj.play('paqo-talk4');
        this.say('Willaq Umu', TALKS.willaq.first, () => { t.obj.play('paqo-idle4'); run.songs.sol = true; this.itemGet('i4_quena', GOT.sol); });
        return;
      }
      this.say(t.k === 'nusta' ? 'Ñusta' : 'Runa', t.text);
      return;
    }
    if (t.t === 'chest') {
      if (t.opened) return;
      t.opened = true; F['chest_' + t.id] = true;
      t.obj.setTexture('o4_cofre_abierto');
      const it = t.item;
      if (it === 'llave') { run.inv.llave++; this.itemGet('i4_llave', GOT.llave); }
      else if (it === 'casino') { run.inv.casino++; this.itemGet('items', GOT.casino, null, 5); }
      else if (it === 'cetro') { run.has.cetro = true; this.itemGet('i4_cetro_choclo', GOT.cetro, () => this.cutscene('cetro4')); }
      else if (it === 'chakana') { run.has.chakana = true; this.itemGet('i4_chakana', GOT.chakana, () => this.cutscene('chakana4')); }
      return;
    }
    if (t.t === 'door') {
      if (t.locked === 'convento') { this.say(null, 'La puerta del convento está cerrada. Bajo estos muros coloniales se ven piedras incas perfectas…'); return; }
      if (t.lock === 'llave') {
        if (run.inv.llave > 0) { run.inv.llave--; this.openDoor(t); }
        else this.say(null, 'Una puerta cerrada con llave.');
        return;
      }
      if (t.lock === 'cetro') {
        if (run.has.cetro) { this.say(null, '¡El cetro de oro brilla! El choclo de la puerta se abre como una mazorca.', () => this.openDoor(t)); }
        else this.say(null, 'Una puerta inca sellada con un choclo de oro. Necesitas algo que la abra… ¿el cetro del Qorikancha?');
        return;
      }
      if (t.k === 'puerta_sol') this.say(null, 'Una puerta con el rostro del Inti. No tiene cerradura.');
    }
  }

  // levantar un objeto como en Zelda
  itemGet(tex, text, onDone, frame) {
    const p = this.player;
    this.stopPlayer(); this.busy = true;
    p.anims.stop(); p.setTexture('inkaxurAccion', ACC.got).setFlipX(false);
    const ic = this.add.image(p.x, p.y - 74, tex, frame).setDepth(6000).setScale(0);
    const s = ic.width > 60 ? 50 / Math.max(ic.width, ic.height) : .9;
    this.tweens.add({ targets: ic, scale: s * 1.2, y: p.y - 84, duration: 350, ease: 'Back.out' });
    SND.win();
    this.time.delayedCall(700, () => {
      this.busy = false;
      this.say(null, text, () => { ic.destroy(); p.setTexture('inkaxurMapa', MAP_STAND.down); this.dir = 'down'; this.updateHud(); onDone?.(); });
    });
  }

  cutscene(cut) {
    this.busy = true; this.stopPlayer();
    this.cameras.main.fade(700, 255, 255, 255, true); this.ui?.fade(700, 255, 255, 255, true);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (cut === 'cetro4') {
        // después del cetro se vuelve a la Intipampa (en tiempos incas), frente al templo
        const run = { ...this.run, area: 'loreto', era: 'inca', pos: [11.5, 20] };
        this.scene.start('escena', { cut, run: { hp: run.hp, maxHp: run.maxHp, score: run.score, coins: run.coins }, next: { key: 'cusco', data: { run } } });
      } else {
        this.scene.start('escena', { cut, run: { hp: this.run.hp, maxHp: this.run.maxHp, score: this.run.score, coins: this.run.coins } });
      }
    });
  }

  /* ---------- puzles ---------- */
  drawMirror(t) {
    const g = t.mark, x = (t.x + .5) * T4, y = (t.y + .5) * T4 - 20;
    g.clear().lineStyle(5, 0xfff6c8).lineBetween(x - 16, y + (t.m === '/' ? 16 : -16), x + 16, y + (t.m === '/' ? -16 : 16));
  }
  updateBeam() {
    const g = this.beam; g.clear();
    if (!this.beamOn || !this.window) return;
    const mir = {}; this.mirrors.forEach(m => { mir[m.x + ',' + m.y] = m; });
    let x = this.window.x, y = this.window.y, [dx, dy] = this.window.dir, px = (x + .5) * T4, py = (y - .3) * T4;
    const pts = [[px, py]];
    for (let n = 0; n < 80; n++) {
      x += dx; y += dy;
      const m = mir[x + ',' + y];
      if (m) {
        pts.push([(x + .5) * T4, (y + .5) * T4 - 20]);
        [dx, dy] = m.m === '/' ? [-dy, -dx] : [dy, dx];
        continue;
      }
      if (this.target && x === this.target.x && y === this.target.y) {
        pts.push([(x + .5) * T4, (y + .5) * T4 - 20]);
        this.litTarget();
        break;
      }
      if (x < 0 || y < 0 || x >= this.W || y >= this.H || this.grid[y][x]) { pts.push([(x + .5 - dx * .5) * T4, (y + .5 - dy * .5) * T4 - 20]); break; }
    }
    for (let i = 1; i < pts.length; i++) {
      g.lineStyle(14, 0xffc84a, .35).lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      g.lineStyle(5, 0xfff6c8, .9).lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }
  }
  litTarget() {
    const t = this.target, F = this.run.flags;
    if (F['group_' + t.opens]) return;
    F['group_' + t.opens] = true;
    t.obj.setTint(0xfff6a0);
    this.hud.banner('¡El disco del Inti brilla!', '#ffd84a');
    this.doors.filter(d => d.opens === t.opens).forEach(d => this.openDoor(d));
  }
  updatePlates() {
    const F = this.run.flags, groups = {};
    this.plates.forEach(pl => {
      const on = this.blocks.some(b => b.cx === pl.x && b.cy === pl.y);
      if (on !== pl.on && !F['group_' + pl.group]) { pl.on = on; pl.obj.setTexture(on ? 'o4_placa_on' : 'o4_placa'); if (on) sfx(400, 600, .12, 'triangle', .05); }
      (groups[pl.group] = groups[pl.group] || []).push(pl.on);
    });
    for (const g in groups) if (!F['group_' + g] && groups[g].every(Boolean)) {
      F['group_' + g] = true;
      this.hud.banner('¡Se abrió una puerta!', '#9dff6a');
      this.doors.filter(d => d.opens === g).forEach(d => this.openDoor(d));
    }
  }
  // empujar un bloque: caminar contra él un momento en una de las 4 direcciones
  tryPush(mx, my, dt) {
    const p = this.player;
    if (!(Math.abs(mx) > .9 || Math.abs(my) > .9)) { this.pushT = 0; return; }
    const dx = Math.abs(mx) > .9 ? Math.sign(mx) : 0, dy = dx ? 0 : Math.sign(my);
    const tx = Math.floor(p.x / T4) + dx, ty = Math.floor((p.y - 8) / T4) + dy;
    const b = this.blocks.find(o => o.cx === tx && o.cy === ty && !o.moving);
    const near = b && (dx ? Math.abs(p.x - (tx + .5) * T4) < T4 * .95 && Math.abs(p.y - 8 - (ty + .5) * T4) < T4 * .5 : Math.abs(p.y - 8 - (ty + .5) * T4) < T4 * 1.05 && Math.abs(p.x - (tx + .5) * T4) < T4 * .5);
    if (!near) { this.pushT = 0; return; }
    this.pushT += dt;
    if (this.pushT < .28) return;
    this.pushT = 0;
    const nx = tx + dx, ny = ty + dy;
    if (!this.isFree(nx, ny)) { sfx(120, 90, .08, 'triangle', .05); return; }
    b.moving = true; b.cx = nx; b.cy = ny;
    b.zone.destroy(); b.zone = this.blockZone(nx, ny);
    sfx(90, 60, .25, 'sawtooth', .06);
    this.tweens.add({ targets: b, x: (nx + .5) * T4, y: (ny + 1) * T4, duration: 220, onComplete: () => { b.moving = false; b.setDepth((ny + .5) * T4); this.updatePlates(); } });
  }

  goArea(to, at) {
    if (this.leaving) return;
    this.leaving = true; this.busy = true; this.stopPlayer();
    this.run.area = to; this.run.pos = at;
    // fade(…, force): arranca aunque la cámara tenga otro fundido a medias; y por si acaso, un respaldo por tiempo
    let done = false;
    const go = () => { if (done) return; done = true; this.scene.restart({ run: this.run }); };
    this.cameras.main.fade(260, 0, 0, 0, true); this.ui?.fade(260, 0, 0, 0, true);
    this.cameras.main.once('camerafadeoutcomplete', go);
    this.time.delayedCall(420, go);
  }

  die() {
    this.dead = true; SND.die();
    const p = this.player; p.setVelocity(0, 0); p.anims.stop(); p.setTexture('inkaxurAccion', ACC.ko);
    showBossPanel(false);
    this.time.delayedCall(1300, () => showOverlay('over', { score: this.run.score }));
  }

  tap(k) { const t = touch[k + 'At']; if (t !== undefined && t !== this.seen[k]) { this.seen[k] = t; return true; } return false; }

  /* ---------- bucle ---------- */
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, p = this.player, k = this.controls.keys, J = Phaser.Input.Keyboard.JustDown;
    this.drawBar(time);
    this.updateBeam();
    p.setDepth(p.y); this.pShadow.setPosition(p.x, p.y - 2).setDepth(p.y - 1);
    this.drops.getChildren().forEach(u => u.setDepth(u.y));
    if (this.dead) return;
    // diálogo y quena
    const zDown = J(k.z) || J(this.k.j) || this.tap('atk');
    if (this.dialog) { if (zDown || J(this.k.enter) || J(k.sp) || this.tap('roll')) this.advanceDialog(); return; }
    if (this.quena) {
      if (this.busy) return;
      if (J(this.k.q) || J(this.k.esc) || this.tap('quena')) { this.closeQuena(); return; }
      if (J(k.up) || J(k.w) || this.tap('jump')) this.playNote('up'); else if (J(k.dn) || J(k.s) || this.tap('down')) this.playNote('down');
      else if (J(k.l) || J(k.a) || this.tap('left')) this.playNote('left'); else if (J(k.r) || J(k.d) || this.tap('right')) this.playNote('right');
      return;
    }
    ['left', 'right', 'jump', 'down'].forEach(d => this.tap(d));  // (las flechas táctiles solo cuentan como notas en la quena)
    if (this.overviewing) { p.setVelocity(0, 0); if (zDown || J(k.sp) || J(this.k.enter)) this.skipOverview(); return; }
    if (this.busy || this.frozen) { p.setVelocity(0, 0); return; }

    // salidas del área
    if (time > this.exitGrace) for (const ex of this.exits) {
      const z = ex.zone;
      if (p.x > z.x && p.x < z.x + z.width && p.y - 10 > z.y - 8 && p.y - 10 < z.y + z.height + 8) { this.goArea(ex.to, ex.at); return; }
    }
    // el jefe despierta al entrar a su arena
    if (this.bossThing && !this.boss && !this.run.flags['boss_' + this.bossThing.k]) {
      const [ax, ay, aw, ah] = this.bossThing.arena, tx = p.x / T4, ty = p.y / T4;
      if (tx > ax && tx < ax + aw && ty > ay + .8 && ty < ay + ah) this.startBoss();
    }

    // fijar enemigo (mantener Shift): el más cercano a la vista
    if (k.sh.isDown || touch.lock) {
      if (!this.lock || this.lock.dead || !this.lock.active) {
        const cands = this.foes.getChildren().filter(e => !e.dead);
        if (this.boss?.alive) cands.push(this.boss.sprite);
        let best = null, bd = 380;
        cands.forEach(e => { const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; best = e; } });
        if (best && best !== this.lock) sfx(1000, 1400, .06, 'triangle', .04);
        this.lock = best;
      }
    } else this.lock = null;
    if (this.lock && (this.lock.dead || !this.lock.active || (this.lock.boss && !this.lock.boss.alive))) this.lock = null;
    this.lockMark.setVisible(!!this.lock);
    if (this.lock) this.lockMark.setPosition(this.lock.x, this.lock.y - this.lock.displayHeight - 12 + Math.sin(time / 120) * 4).setAngle(Math.sin(time / 200) * 10);

    // movimiento
    let mx = ((k.r.isDown || k.d.isDown || touch.right) ? 1 : 0) - ((k.l.isDown || k.a.isDown || touch.left) ? 1 : 0);
    let my = ((k.dn.isDown || k.s.isDown || touch.down) ? 1 : 0) - ((k.up.isDown || k.w.isDown || touch.jump) ? 1 : 0);
    const moving = mx || my;
    if (moving) { const l = Math.hypot(mx, my); mx /= l; my /= l; }
    this.shielding = (k.x.isDown || touch.shield) && time > this.rollUntil;
    // mirar: hacia el enemigo fijado o hacia donde camina
    const fv = this.lock ? this.aimVec() : moving ? { x: mx, y: my } : null;
    if (fv) {
      this.face = { x: fv.x, y: fv.y };
      this.dir = Math.abs(fv.x) >= Math.abs(fv.y) ? (fv.x < 0 ? 'left' : 'right') : (fv.y < 0 ? 'up' : 'down');
    }
    // rodar
    if ((J(k.sp) || this.tap('roll')) && time > (this.cd.roll || 0)) {
      this.cd.roll = time + 650; this.rollUntil = time + 320; this.rollDir = moving ? { x: mx, y: my } : this.face; SND.jump();
    }
    // Z: interactuar o golpear
    if (zDown) { const t = this.interactTarget(); if (t && !this.atk) { this.interact(t); return; } this.swing(time); }
    if (J(k.c) || this.tap('act')) this.throwGalleta(time);
    if (J(k.v) || this.tap('fire2')) this.throwGranos(time);
    if (J(this.k.q) || this.tap('quena')) { this.openQuena(); return; }
    if ((J(this.k.e) || this.tap('casino')) && this.run.inv.casino > 0 && this.run.hp < this.run.maxHp) {
      this.run.inv.casino--; this.run.hp = this.run.maxHp; SND.up(); this.hud.popup('¡Energía llena!', p.x, p.y - 70); this.updateHud();
    }

    // velocidad
    if (time < (this.knockUntil || 0)) { /* empujado */ }
    else if (time < this.rollUntil) p.setVelocity(this.rollDir.x * ROLL, this.rollDir.y * ROLL);
    else {
      const sp = SPEED * (this.shielding ? .45 : this.atk ? .35 : 1);
      p.setVelocity(mx * sp, my * sp);
    }
    if (moving && !this.atk) this.tryPush(mx, my, dt); else this.pushT = 0;

    // animación
    const swinging = this.updateSwing(time);
    if (!swinging) {
      const side = this.dir === 'left' || this.dir === 'right';
      if (time < this.rollUntil) { p.anims.stop(); p.setTexture('inkaxurAccion', ACC.roll + Math.min(3, Math.floor((320 - (this.rollUntil - time)) / 80))).setFlipX(this.rollDir.x > 0); }
      else if (this.shielding) { p.anims.stop(); p.setTexture('inkaxurAccion', ACC.shield[side ? 'side' : this.dir]).setFlipX(this.dir === 'right'); }
      else {
        if (p.texture.key !== 'inkaxurMapa') p.setTexture('inkaxurMapa', MAP_STAND[this.dir]).setFlipX(false);
        if (moving) p.anims.play('mapa-' + this.dir, true); else { p.anims.stop(); p.setFrame(MAP_STAND[this.dir]); }
      }
    }
    p.setAlpha(time < this.invuln ? (Math.floor(time / 70) % 2 ? .4 : 1) : 1);

    // charcos radiactivos (solo hoy)
    const ch = this.cell(Math.floor(p.x / T4), Math.floor((p.y - 6) / T4));
    if (this.era === 'hoy' && CELLS[ch]?.toxic && time > this.toxicAt) { this.toxicAt = time + 700; this.hurt(4, null, 0, true); }

    if (time > this.flowAt) { this.flowAt = time + 400; this.computeFlow(); }
    this.huntSpawn(time);
    updateFoes(this, time);
    this.boss?.update(time);
    // proyectiles reflejados que tocan al jefe
    if (this.boss?.alive) this.myShots.getChildren().forEach(o => {
      if (o.reflected && o.active && Phaser.Math.Distance.Between(o.x, o.y, this.boss.x, this.boss.y - 60) < 70) { this.boss.hit(o.dmg, o); this.puff(o); }
    });
  }
}
