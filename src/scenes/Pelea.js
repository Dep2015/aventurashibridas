import Phaser from 'phaser';
import { GW, GH, SPRITE_SHEETS_4 } from '../config.js';
import { SND, sfx } from '../audio.js';
import { createControls, touch } from '../input.js';
import { showOverlay, renderHud, setLevelName, showBossPanel } from '../ui.js';

/* ---------- Round 2: pelea de costado estilo Street Fighter II (Inkaxur contra el Supay o contra Pachacútec) ----------
 * Se llega al vencer al Supay en el Templo del Sol o a Pachacútec zombi en Sacsayhuamán (Cusco.js); el rival va en
 * `rival` ('supay' | 'pachacutec', config en RIVALS). Un solo round: gana quien deja al otro sin energía
 * (o quien tiene más energía cuando el reloj llega a 0).
 * Controles: ← → caminar (hacia atrás = cubrirse) · ↑ saltar · ↓ agacharse (↓ + atrás = cubrirse abajo) · Z puño ·
 * X patada (agachado: barrida, hay que cubrirse abajo). La barra de ESPECIAL tiene dos niveles (se llena pegando y
 * recibiendo golpes; el segundo nivel se llena encima, de otro color). Especiales, apretando dos teclas a la vez:
 *   P + O (nivel 1): «Balón de gas» — video; el rival pierde la mitad de su energía.
 *   P + M (nivel 2): «Plasma de los tres» — entran corriendo Dominga y Litbru, los tres cargan el plasma y viene el
 *   video; también le quita la mitad (si lo deja sin energía, sale disparado fuera del planeta).
 * Las indicaciones están fuera del juego (index.html).
 * Los videos de Inkaxur son distintos según el rival (salen el Supay o Pachacútec).
 * El rival tiene la misma barra. Supay: nivel 1 «Sueño del Supay», nivel 2 «Vuelo al cielo radiactivo» (antes salen del
 * suelo dos mallquis a su lado). Pachacútec: nivel 1 «Vara gigante» (lanza su vara, que crece y aplasta a Inkaxur),
 * nivel 2 «Inkaxur de queso» (lo vuelve queso y se lo come; antes salen dos guerreros incas zombis). Cada uno le quita a
 * Inkaxur la mitad de su energía. Antes de lanzarlos se ilumina un momento: si Inkaxur le pega en ese momento, lo
 * interrumpe. */
const LV = 100, MAXM = 200;   // barra de especial: dos niveles de 100
const FLOOR = 492, GRAV = 2300, LEFT = 60, RIGHT = GW - 60;
const FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const FIGHTERS = {
  inkaxur: { name: 'INKAXUR', sheet: 'luchaInkaxur', hp: 100, speed: 215, jump: 930, w: 70,
    fr: { idle: [0, 3], walk: [4, 9], jump: [10, 12], crouch: [13, 13], block: [14, 14], cblock: [15, 15], punch: [16, 18],
      kick: [19, 21], sweep: [22, 24], hurt: [25, 26], ko: [27, 29], win: [30, 31] } },
  supay: { name: 'SUPAY', sheet: 'luchaSupay', path: 'assets/pelea/supay.png', fw: 452, fh: 216, hp: 200, speed: 150, jump: 820, w: 120,
    fr: { idle: [0, 2], walk: [3, 6], jump: [7, 10], crouch: [11, 11], block: [11, 11], cblock: [11, 11], claw: [12, 15],
      charge: [16, 18], tail: [19, 20], hurt: [21, 22], ko: [23, 25], win: [26, 27], cast: [26, 27] }, hitY: 130 },
  // mismos nombres de golpes que el Supay (claw = vara, charge = embestida, tail = barrida con la vara, cast = bola dorada)
  // (cast lanza la vara como proyectil: cuadro 28)
  pachacutec: { name: 'PACHACÚTEC', sheet: 'luchaPachacutec', path: 'assets/pelea/pachacutec.png', fw: 280, fh: 202, scale: 1.15, hp: 200, speed: 150, jump: 820, w: 120,
    fr: { idle: [0, 3], walk: [4, 7], jump: [8, 10], crouch: [11, 11], block: [11, 11], cblock: [11, 11], claw: [12, 15],
      charge: [16, 18], tail: [19, 20], hurt: [21, 22], ko: [23, 25], throw: [26, 27], win: [29, 30], cast: [29, 30] }, hitY: 120, shot: 28 }
};
// rivales: luchador, escenario y especiales (los de Inkaxur y los propios)
const RIVALS = {
  supay: { fighter: 'supay', stage: 'escenarioSol', stagePath: 'assets/pelea/escenario.jpg', place: 'Templo del Sol',
    p1: 'balon', p2: 'plasma', r1: 'sueno', r2: 'vuelo', gana: 'EL SUPAY GANA' },
  pachacutec: { fighter: 'pachacutec', stage: 'escenarioSacsa', stagePath: 'assets/pelea/escenario_sacsayhuaman.jpg', place: 'Sacsayhuamán',
    p1: 'balonP', p2: 'plasmaP', r1: 'vara', r2: 'queso', gana: 'PACHACÚTEC GANA' }
};
// Dominga y Litbru (entran antes del plasma) y la pose de carga de Inkaxur; tools/pelea_sprites.py
const AMIGOS = {
  dominga: { sheet: 'luchaDominga', path: 'assets/pelea/dominga.png', fw: 172, fh: 166, fr: { run: [0, 5], idle: [6, 9], carga: [10, 12], win: [13, 13] } },
  litbru: { sheet: 'luchaLitbru', path: 'assets/pelea/litbru.png', fw: 152, fh: 160, fr: { run: [0, 5], idle: [6, 9], carga: [10, 12], win: [13, 13] } },
  inkaxur: { sheet: 'luchaCarga', path: 'assets/pelea/inkaxur_carga.png', fw: 148, fh: 142, fr: { carga: [0, 2] } }
};
// golpes: duración, cuándo pega (en ms desde que empieza), alcance, daño, aturdimiento, bajo (hay que cubrirse agachado)
const MOVES = {
  punch: { dur: 260, at: 90, range: 100, dmg: 6, stun: 260 },
  kick: { dur: 380, at: 150, range: 128, dmg: 9, stun: 330 },
  sweep: { dur: 380, at: 150, range: 122, dmg: 7, stun: 360, low: true, crouch: true },
  claw: { dur: 560, at: 250, range: 170, dmg: 10, stun: 340 },
  charge: { dur: 700, at: 200, range: 140, dmg: 12, stun: 420, dash: 520 },
  tail: { dur: 520, at: 230, range: 230, dmg: 9, stun: 360, low: true },
  cast: { dur: 700, at: 350, range: 0, dmg: 0, stun: 0, fireball: true }
};
// especiales (videos en public/assets/pelea/)
const SPECIALS = {
  balon: { who: 'p', cost: LV, name: '¡BALÓN DE GAS!', video: ['assets/pelea/especial_balon_1.mp4', 'assets/pelea/especial_balon_2.mp4'] },  // en dos partes
  plasma: { who: 'p', cost: MAXM, prelude: 'amigos', name: '¡PLASMA DE LOS TRES!', video: 'assets/pelea/especial_plasma.mp4' },
  sueno: { who: 'r', cost: LV, name: '¡SUEÑO DEL SUPAY!', video: 'assets/pelea/especial_sueno.mp4' },
  vuelo: { who: 'r', cost: MAXM, prelude: 'mallquis', name: '¡VUELO AL CIELO RADIACTIVO!', video: 'assets/pelea/especial_vuelo.mp4' },
  // contra Pachacútec
  balonP: { who: 'p', cost: LV, name: '¡BALÓN DE GAS!', video: 'assets/pelea/pacha_balon.mp4' },
  plasmaP: { who: 'p', cost: MAXM, prelude: 'amigos', name: '¡PLASMA DE LOS TRES!', video: 'assets/pelea/pacha_plasma.mp4' },
  vara: { who: 'r', cost: LV, tint: 0xffd84a, name: '¡VARA GIGANTE!', video: 'assets/pelea/pacha_vara.mp4' },
  queso: { who: 'r', cost: MAXM, tint: 0xfff07a, prelude: 'guerreros', name: '¡INKAXUR DE QUESO!', video: 'assets/pelea/pacha_queso.mp4' }
};
SPECIALS.sueno.tint = 0xc89aff; SPECIALS.vuelo.tint = 0x9dff6a;
const TIME = 99;

export class Pelea extends Phaser.Scene {
  constructor() { super('pelea'); }

  init(d = {}) {
    this.startData = JSON.parse(JSON.stringify(d));
    this.back = d.back;           // estado de la partida del Cusco para volver al ganar
    this.force = d.force;         // (pruebas) un especial que se lanza apenas empieza la pelea
    this.R = RIVALS[d.rival] || RIVALS.supay;
    this.score = d.back?.score ?? 0;
  }

  preload() {
    const load = this.load, has = k => this.textures.exists(k);
    if (!has('luchaInkaxur')) load.spritesheet('luchaInkaxur', 'assets/pelea/inkaxur.png', { frameWidth: 170, frameHeight: 154 });
    // solo la hoja del rival de esta pelea
    const R = FIGHTERS[this.R.fighter];
    if (!has(R.sheet)) load.spritesheet(R.sheet, R.path, { frameWidth: R.fw, frameHeight: R.fh });
    if (!has('bolaFuego4')) { const [path, frameWidth, frameHeight] = SPRITE_SHEETS_4.bolaFuego4; load.spritesheet('bolaFuego4', path, { frameWidth, frameHeight }); }
    if (!has(this.R.stage)) load.image(this.R.stage, this.R.stagePath);
    // Dominga, Litbru y la pose de carga de Inkaxur (entran antes del plasma); los mallquis (antes del vuelo del Supay)
    for (const k in AMIGOS) if (!has(AMIGOS[k].sheet)) load.spritesheet(AMIGOS[k].sheet, AMIGOS[k].path, { frameWidth: AMIGOS[k].fw, frameHeight: AMIGOS[k].fh });
    for (const k of ['mallqui4', 'guerrero4']) if (!has(k)) { const [path, frameWidth, frameHeight] = SPRITE_SHEETS_4[k]; load.spritesheet(k, path, { frameWidth, frameHeight }); }
  }

  create() {
    setLevelName('Nivel 4 · Round 2 · ' + this.R.place);
    showBossPanel(false);
    this.add.image(GW / 2, GH / 2, this.R.stage).setDisplaySize(GW, GH);
    this.makeAnims();
    this.controls = createControls(this);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.k = this.input.keyboard.addKeys({ p: K.P, o: K.O, m: K.M, esc: K.ESC });
    this.p = this.fighter('inkaxur', 250, 1);
    this.r = this.fighter(this.R.fighter, GW - 250, -1);
    this.p.foe = this.r; this.r.foe = this.p;
    this.shots = [];
    this.timeLeft = TIME; this.clock = 0;
    this.state = 'intro'; this.video = null; this.over = false;
    this.ai = { next: 0, hold: null, holdUntil: 0 };
    this.hud = this.add.graphics().setDepth(900);
    const st = (size, color = '#ffd84a') => ({ fontFamily: FONT, fontSize: size, color, stroke: '#1d0a0a', strokeThickness: 6 });
    this.names = [this.add.text(34, 14, FIGHTERS.inkaxur.name, st('20px', '#fff')).setDepth(901),
      this.add.text(GW - 34, 14, this.r.def.name, st('20px', '#fff')).setOrigin(1, 0).setDepth(901)];
    this.timerTxt = this.add.text(GW / 2, 40, String(TIME), st('38px')).setOrigin(.5).setDepth(901);
    this.meterTxt = [this.add.text(34, GH - 50, 'ESPECIAL', st('14px', '#9dff6a')).setDepth(901),
      this.add.text(GW - 34, GH - 50, 'ESPECIAL', st('14px', '#ff8a7a')).setOrigin(1, 0).setDepth(901)];
    this.updateHtmlHud();
    // «ROUND 2» y «¡PELEA!»
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.time.delayedCall(400, () => this.bigText('ROUND 2', '#ffd84a', 1300));
    this.time.delayedCall(1900, () => { this.bigText('¡PELEA!', '#ff5a3a', 800); sfx(200, 900, .3, 'sawtooth', .08); });
    this.time.delayedCall(2500, () => { this.state = 'fight'; if (this.force) this.special(this.force); });
    this.events.once('shutdown', () => { this.video = null; });  // (los objetos del video los destruye la escena)
  }

  makeAnims() {
    for (const k in FIGHTERS) {
      const f = FIGHTERS[k];
      if (!this.textures.exists(f.sheet)) continue;
      for (const a in f.fr) {
        const key = `${k}-${a}-lucha`;
        if (this.anims.exists(key)) continue;
        const [s, e] = f.fr[a];
        const loop = a === 'idle' || a === 'walk' || a === 'win';
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(f.sheet, { start: s, end: e }), frameRate: loop ? (a === 'walk' ? 10 : 7) : 12, repeat: loop ? -1 : 0, yoyo: a === 'idle' });
      }
    }
    for (const k in AMIGOS) for (const a in AMIGOS[k].fr) {
      const key = `${k}-${a}-lucha`; if (this.anims.exists(key)) continue;
      const [st, en] = AMIGOS[k].fr[a];
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(AMIGOS[k].sheet, { start: st, end: en }), frameRate: a === 'run' ? 14 : 8, repeat: a === 'win' ? 0 : -1, yoyo: a === 'carga' });
    }
    if (!this.anims.exists('guerrero-idle-lucha')) this.anims.create({ key: 'guerrero-idle-lucha', frames: this.anims.generateFrameNumbers('guerrero4', { start: 0, end: 2 }), frameRate: 6, repeat: -1, yoyo: true });
    if (!this.anims.exists('mallqui-idle-lucha')) this.anims.create({ key: 'mallqui-idle-lucha', frames: this.anims.generateFrameNumbers('mallqui4', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    if (!this.anims.exists('bola-fuego4')) this.anims.create({ key: 'bola-fuego4', frames: this.anims.generateFrameNumbers('bolaFuego4', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
  }

  fighter(kind, x, facing) {
    const def = FIGHTERS[kind];
    const spr = this.add.sprite(x, FLOOR, def.sheet, def.fr.idle[0]).setOrigin(.5, 1).setDepth(10).setScale(def.scale || 1);
    const shadow = this.add.ellipse(x, FLOOR - 2, def.w * 1.2, 16, 0x000000, .35).setDepth(5);
    const f = { kind, def, spr, shadow, x, y: FLOOR, vx: 0, vy: 0, facing, hp: def.hp, max: def.hp, meter: 0,
      state: 'idle', until: 0, move: null, moveAt: 0, hit: false, crouch: false, blocking: false, air: false };
    this.play(f, 'idle');
    return f;
  }

  play(f, a, force) {
    const key = `${f.kind}-${a}-lucha`;
    if (force || f.spr.anims.currentAnim?.key !== key) f.spr.play(key);
  }

  bigText(txt, color, ms) {
    const t = this.add.text(GW / 2, GH / 2 - 40, txt, { fontFamily: FONT, fontSize: '96px', color, stroke: '#1d0a0a', strokeThickness: 12 })
      .setOrigin(.5).setDepth(1000).setScale(.3).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 300, onComplete: () => t.destroy() });
    return t;
  }

  /* ---------- controles ---------- */
  // dirección actual relativa a donde mira Inkaxur: 'f' adelante, 'b' atrás, 'd' abajo, 'df' abajo-adelante, 'db'...
  readDir() {
    const k = this.controls.keys, f = this.p.facing;
    const right = k.r.isDown || k.d.isDown || touch.right, left = k.l.isDown || k.a.isDown || touch.left;
    const down = k.dn.isDown || k.s.isDown || touch.down, up = k.up.isDown || k.w.isDown || touch.jump;
    const fwd = f > 0 ? right : left, back = f > 0 ? left : right;
    return { fwd, back, down, up };
  }
  // dos teclas a la vez: las dos apretadas y una recién apretada (no importa el orden)
  combo(a, b) { const J = Phaser.Input.Keyboard.JustDown; const ja = J(a), jb = J(b); return (ja || jb) && a.isDown && b.isDown; }

  /* ---------- bucle ---------- */
  update(time, delta) {
    const dt = Math.min(delta, 40) / 1000;
    this.drawHud(time);
    if (this.state === 'video') { if (Phaser.Input.Keyboard.JustDown(this.k.esc)) this.endVideo(); return; }
    if (this.state === 'prelude') return;
    if (this.state === 'intro' || this.over) { this.physicsStep(this.p, dt); this.physicsStep(this.r, dt); this.face(); this.render(); return; }
    // reloj
    this.clock += dt;
    if (this.clock >= 1) { this.clock -= 1; this.timeLeft--; if (this.timeLeft <= 0) return this.timeUp(); }
    this.playerInput(time);
    this.aiStep(time);
    [this.p, this.r].forEach(f => { this.moveStep(f, time); this.physicsStep(f, dt); });
    this.separate();
    this.face();
    this.shotsStep(dt);
    this.render();
  }

  playerInput(time) {
    const p = this.p, k = this.controls.keys, J = Phaser.Input.Keyboard.JustDown;
    const d = this.readDir();
    const punch = J(k.z) || (touch.fireAt !== this.lastTouch && (this.lastTouch = touch.fireAt, true));
    const kick = J(k.x);
    const sp1 = this.combo(this.k.p, this.k.o), sp2 = this.combo(this.k.p, this.k.m);
    if (!this.free(p, time)) return;
    // especiales: P + O (balón de gas), P + M (plasma de los tres)
    if (sp2 && p.meter < MAXM) { this.flashMsg(p.meter < LV ? 'Llena la barra de ESPECIAL pegando' : '¡Falta el nivel 2 de la barra!', '#ffd84a'); return; }
    if (sp1 && p.meter < LV) { this.flashMsg('Llena la barra de ESPECIAL pegando', '#9dff6a'); return; }
    if (sp2) return this.special(this.R.p2);
    if (sp1) return this.special(this.R.p1);
    p.crouch = d.down && !p.air;
    if (!p.air) {
      if (d.up) { p.vy = -FIGHTERS.inkaxur.jump; p.vx = (d.fwd ? 1 : d.back ? -1 : 0) * p.facing * 220; p.air = true; p.state = 'jump'; SND.jump(); return; }
      if (punch) return this.attack(p, p.crouch ? 'sweep' : 'punch', time);
      if (kick) return this.attack(p, p.crouch ? 'sweep' : 'kick', time);
      p.blocking = d.back;
      p.vx = p.crouch ? 0 : d.fwd ? p.facing * FIGHTERS.inkaxur.speed : d.back ? -p.facing * FIGHTERS.inkaxur.speed * .75 : 0;
      p.state = p.crouch ? 'crouch' : p.vx ? 'walk' : 'idle';
    } else if (punch || kick) this.attack(p, kick ? 'kick' : 'punch', time);
  }

  free(f, time) { return !['attack', 'hurt', 'ko', 'cast', 'win', 'charge'].includes(f.state) && time >= f.until; }

  attack(f, name, time) {
    const m = MOVES[name];
    f.state = 'attack'; f.move = name; f.moveAt = time; f.until = time + m.dur; f.hit = false; f.blocking = false;
    if (!f.air) f.vx = m.dash ? f.facing * m.dash : 0;
    const anim = name === 'cast' && f.def.fr.throw ? 'throw' : name;
    this.play(f, anim, true);
    sfx(name === 'claw' || name === 'charge' ? 180 : 420, 150, .12, 'sawtooth', .05);
  }

  // avanzar el golpe: en su momento, ver si pega
  moveStep(f, time) {
    if (f.state === 'attack' && f.move) {
      const m = MOVES[f.move], t = time - f.moveAt;
      if (m.dash && t > 380) f.vx *= .85;
      if (!f.hit && t >= m.at) {
        f.hit = true;
        if (m.fireball) this.fireball(f);
        else this.tryHit(f, f.foe, m, time);
      }
      if (time >= f.until) { f.state = 'idle'; f.move = null; if (!f.air) f.vx = 0; }
    } else if (f.state === 'hurt' && time >= f.until) f.state = 'idle';
  }

  tryHit(a, b, m, time) {
    const dx = (b.x - a.x) * a.facing;
    if (dx < -20 || dx > m.range + b.def.w * .4) return;
    if (m.low && b.air) return;                                    // la barrida no pega en el aire
    if (b.state === 'ko') return;
    const blocked = b.blocking && !b.air && (!m.low || b.crouch) && this.free(b, time);
    if (blocked) {
      b.hp = Math.max(1, b.hp - 1); b.x += a.facing * 22; b.until = time + 140;
      this.spark(b.x - a.facing * 30, b.y - 100, 0x9ff6ff); sfx(1200, 900, .08, 'square', .05);
      this.gain(b, 3); this.gain(a, 2);
      return;
    }
    this.damage(b, m.dmg, a, m.stun, time);
    this.gain(a, a === this.p ? 12 : 8);
  }

  damage(b, n, a, stun, time) {
    b.hp = Math.max(0, b.hp - n);
    b.state = 'hurt'; b.until = time + stun; b.move = null; b.blocking = false;
    b.vx = a.facing * 180; if (b.air) b.vy = -300;
    this.play(b, 'hurt', true);
    this.spark(b.x - a.facing * 20, b.y - (b.def.hitY || 95), 0xffd84a);
    this.cameras.main.shake(90, .004); sfx(240, 90, .12, 'square', .07);
    this.gain(b, b === this.p ? 6 : 5);
    // un golpe interrumpe al rival cuando se ilumina para su especial
    if (b.charging) { b.charging.remove(); b.charging = null; b.spr.clearTint(); b.meter = Math.max(0, b.meter - 60); this.flashMsg('¡Lo interrumpiste!', '#9dff6a'); }
    this.updateHtmlHud();
    if (b.hp <= 0) this.ko(b);
  }

  gain(f, n) { f.meter = Math.min(MAXM, f.meter + n); }

  fireball(f) {
    let o;
    if (f.def.shot != null) {
      // Pachacútec lanza su vara, que va girando
      o = this.add.sprite(f.x + f.facing * 90, FLOOR - 110, f.def.sheet, f.def.shot).setOrigin(.5, .87).setDepth(12).setScale(f.def.scale || 1);
      o.spin = f.facing * 950;
    } else o = this.add.sprite(f.x + f.facing * 90, FLOOR - 120, 'bolaFuego4', 0).play('bola-fuego4').setDepth(12).setScale(1.3).setFlipX(f.facing < 0);
    o.vx = f.facing * 380; o.owner = f;
    this.shots.push(o);
    sfx(180, 60, .4, 'sawtooth', .07);
  }
  shotsStep(dt) {
    const time = this.time.now;
    this.shots = this.shots.filter(o => {
      o.x += o.vx * dt;
      if (o.spin) o.angle += o.spin * dt;
      const t = o.owner.foe;
      if (Math.abs(o.x - t.x) < t.def.w * .6 && !(t.air && t.y < FLOOR - 120) && !(t.crouch && !t.air && false)) {
        if (t.blocking && this.free(t, time)) { t.hp = Math.max(1, t.hp - 2); this.spark(o.x, o.y, 0x9ff6ff); sfx(1200, 900, .08, 'square', .05); this.gain(t, 4); }
        else this.damage(t, 8, o.owner, 300, time);
        o.destroy(); return false;
      }
      if (o.x < -60 || o.x > GW + 60) { o.destroy(); return false; }
      return true;
    });
  }

  physicsStep(f, dt) {
    if (f.air || f.y < FLOOR) { f.vy += GRAV * dt; f.y += f.vy * dt; }
    f.x += f.vx * dt;
    if (f.y >= FLOOR) { if (f.air && f.state === 'jump') f.state = 'idle'; f.y = FLOOR; f.vy = 0; if (f.air) { f.air = false; if (f.state !== 'hurt' && f.state !== 'ko') f.vx = 0; } }
    if (f.state === 'hurt' || f.state === 'ko') f.vx *= .9;
    f.x = Phaser.Math.Clamp(f.x, LEFT, RIGHT);
  }
  // los luchadores no se atraviesan
  separate() {
    const p = this.p, r = this.r, min = (p.def.w + r.def.w) / 2;
    const dx = r.x - p.x;
    if (Math.abs(dx) < min && Math.abs(p.y - r.y) < 120) {
      const push = (min - Math.abs(dx)) / 2 * Math.sign(dx || 1);
      p.x -= push; r.x += push;
      p.x = Phaser.Math.Clamp(p.x, LEFT, RIGHT); r.x = Phaser.Math.Clamp(r.x, LEFT, RIGHT);
    }
  }
  face() {
    [this.p, this.r].forEach(f => { if (!f.air && f.state !== 'attack' && f.state !== 'ko') f.facing = f.foe.x > f.x ? 1 : -1; });
  }

  render() {
    [this.p, this.r].forEach(f => {
      const s = f.spr;
      s.setPosition(f.x, f.y).setFlipX(f.facing < 0);
      f.shadow.setPosition(f.x, FLOOR - 2).setScale(1 - Math.min(.5, (FLOOR - f.y) / 400));
      if (f.state === 'attack' || f.state === 'hurt' || f.state === 'ko' || f.state === 'cast') return;
      if (f.state === 'win') { this.play(f, 'win'); return; }
      if (f.air) { this.play(f, 'jump'); return; }
      if (f.blocking && (f.foe.state === 'attack' || this.shots.some(o => o.owner === f.foe))) { s.anims.stop(); s.setFrame(f.def.fr[f.crouch ? 'cblock' : 'block'][0]); return; }
      if (f.crouch) { s.anims.stop(); s.setFrame(f.def.fr.crouch[0]); return; }
      this.play(f, f.state === 'walk' ? 'walk' : 'idle');
      if (f.state === 'walk') s.anims.timeScale = Math.sign(f.vx) === f.facing ? 1 : -1;
    });
  }

  /* ---------- el rival (la computadora) ---------- */
  aiStep(time) {
    const r = this.r, p = this.p, R = this.R, D = r.def;
    if (!this.free(r, time) || r.charging) { if (!r.air && r.state !== 'attack' && r.state !== 'charge') r.vx = 0; return; }
    const dist = Math.abs(p.x - r.x);
    // se cubre si Inkaxur le está pegando de cerca
    r.blocking = time < this.ai.holdUntil && this.ai.hold === 'block';
    if (time < this.ai.next) { if (this.ai.hold === 'walk') r.vx = r.facing * D.speed; else if (this.ai.hold === 'back') r.vx = -r.facing * D.speed * .7; else r.vx = 0; r.state = r.vx ? 'walk' : 'idle'; return; }
    this.ai.next = time + Phaser.Math.Between(260, 520); this.ai.hold = null;
    const rnd = Math.random();
    // especiales: con el nivel 2 lleno, el segundo; con el nivel 1, a veces el primero (si no, sigue cargando)
    if (r.meter >= MAXM && rnd < .4) return this.aiSpecial(time, R.r2);
    if (r.meter >= LV && r.meter < MAXM && rnd < .1) return this.aiSpecial(time, R.r1);
    if (p.state === 'attack' && dist < 190 && rnd < .5) { this.ai.hold = 'block'; this.ai.holdUntil = time + 420; r.vx = 0; return; }
    if (dist > 300) {
      if (rnd < .3) return this.attack(r, 'cast', time);
      this.ai.hold = 'walk'; return;
    }
    if (dist > 170) {
      if (rnd < .3) return this.attack(r, 'charge', time);
      if (rnd < .5) return this.attack(r, 'tail', time);
      this.ai.hold = 'walk'; return;
    }
    if (rnd < .45) return this.attack(r, 'claw', time);
    if (rnd < .7) return this.attack(r, 'tail', time);
    if (rnd < .8) { this.ai.hold = 'back'; return; }
    if (rnd < .88) { r.vy = -D.jump; r.vx = r.facing * 160; r.air = true; r.state = 'jump'; return; }
    this.ai.hold = 'block'; this.ai.holdUntil = time + 380;
  }
  // el rival se ilumina y prepara su especial: si Inkaxur le pega en ese momento, lo interrumpe
  aiSpecial(time, name) {
    const r = this.r;
    r.state = 'cast'; r.vx = 0; this.play(r, 'cast', true);
    r.spr.setTint(SPECIALS[name].tint || 0xffffff);
    this.flashMsg(SPECIALS[name].name, '#ff8a7a');
    sfx(100, 600, .9, 'sawtooth', .07);
    r.charging = this.time.delayedCall(1000, () => { r.charging = null; r.spr.clearTint(); this.special(name); });
  }

  /* ---------- especiales en video ---------- */
  special(name) {
    const S = SPECIALS[name], who = S.who === 'p' ? this.p : this.r;
    who.meter = Math.max(0, who.meter - S.cost);
    this.shots.forEach(o => o.destroy()); this.shots = [];
    [this.p, this.r].forEach(f => { f.vx = 0; f.move = null; f.state = f.state === 'ko' ? 'ko' : 'idle'; f.blocking = false; });
    this.render();
    if (S.prelude === 'amigos') { this.state = 'prelude'; this.amigos(() => this.playSpecial(name)); return; }
    if (S.prelude === 'mallquis' || S.prelude === 'guerreros') { this.state = 'prelude'; this.minionsRise(S.prelude, () => this.playSpecial(name)); return; }
    this.playSpecial(name);
  }

  // antes del plasma: Dominga y Litbru entran corriendo, se ponen junto a Inkaxur y los tres cargan la esfera
  amigos(done) {
    const p = this.p, f = p.facing, y = FLOOR;
    this.flashMsg('¡Dominga! ¡Litbru!', '#9dff6a');
    SND.up();
    // si Inkaxur está contra la pared, los amigos se ponen delante de él
    const behind = p.x - f * 150 >= LEFT && p.x - f * 150 <= RIGHT ? -f : f;
    const spots = [p.x + behind * 75, p.x + behind * 150].map(x => Phaser.Math.Clamp(x, LEFT, RIGHT));
    const team = ['dominga', 'litbru'].map((k, i) => {
      const A = AMIGOS[k], startX = behind < 0 ? (f > 0 ? -80 : GW + 80) : (f > 0 ? GW + 80 : -80);
      const s = this.add.sprite(startX, y, A.sheet, A.fr.run[0]).setOrigin(.5, 1).setDepth(9 - i).setFlipX(f < 0 ? true : false);
      s.play(k + '-run-lucha');
      s.setFlipX((spots[i] - startX) < 0);
      this.tweens.add({ targets: s, x: spots[i], duration: 750, ease: 'Sine.out', onComplete: () => { s.setFlipX(f < 0); s.play(k + '-carga-lucha'); } });
      return s;
    });
    this.allies = team;
    // los tres cargan: Inkaxur en su pose de carga y una esfera de plasma que crece delante de él
    this.time.delayedCall(800, () => {
      p.spr.play('inkaxur-carga-lucha'); p.state = 'cast';
      const orb = this.add.circle(p.x + f * 85, y - 90, 10, 0x9ff6ff, .9).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
      const glow = this.add.circle(orb.x, orb.y, 18, 0x9dff6a, .5).setDepth(29).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: [orb, glow], scale: 4, duration: 1300, ease: 'Quad.in' });
      this.tweens.add({ targets: glow, alpha: .9, yoyo: true, repeat: 5, duration: 110 });
      sfx(150, 1500, 1.3, 'sawtooth', .07); this.cameras.main.shake(1300, .004);
      this.time.delayedCall(1350, () => { orb.destroy(); glow.destroy(); done(); });
    });
  }
  // antes del nivel 2 del rival: dos mallquis (Supay) o dos guerreros incas zombis (Pachacútec) salen del suelo a su
  // lado, entre llamas verdes
  minionsRise(kind, done) {
    const r = this.r, mall = kind === 'mallquis';
    r.state = 'cast'; this.play(r, 'cast', true);
    this.flashMsg(mall ? '¡Los mallquis responden al Supay!' : '¡Los guerreros de Pachacútec!', '#ff8a7a');
    sfx(90, 400, 1.2, 'sawtooth', .07);
    this.minions = [-1, 1].map(side => {
      const x = Phaser.Math.Clamp(r.x + side * 210, LEFT + 20, RIGHT - 20);
      const flame = this.add.ellipse(x, FLOOR - 6, 120, 28, 0x9dff6a, .6).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
      const m = this.add.sprite(x, FLOOR + 60, mall ? 'mallqui4' : 'guerrero4', 0).setOrigin(.5, 1).setScale(mall ? 2.1 : 1.7).setDepth(12)
        .setFlipX(mall ? this.p.x < x : this.p.x > x).play(mall ? 'mallqui-idle-lucha' : 'guerrero-idle-lucha');
      this.tweens.add({ targets: m, y: FLOOR, duration: 700, ease: 'Back.out' });
      this.tweens.add({ targets: flame, scaleX: 1.4, alpha: .2, yoyo: true, repeat: 3, duration: 250, onComplete: () => flame.destroy() });
      return m;
    });
    this.time.delayedCall(1500, done);
  }

  playSpecial(name) {
    const S = SPECIALS[name];
    this.state = 'video';
    this.cameras.main.flash(300, 255, 255, 255);
    this.bigText(S.name, S.who === 'p' ? '#9dff6a' : '#ff8a7a', 700);
    this.time.delayedCall(700, () => {
      const bg = this.add.rectangle(0, 0, GW, GH, 0x000000).setOrigin(0).setDepth(2000);
      // uno o varios videos seguidos
      const list = [].concat(S.video);
      const v = this.add.video(GW / 2, GH / 2).loadURL(list[0]).setDepth(2001);
      const E = Phaser.GameObjects.Events;
      v.on(E.VIDEO_CREATED, () => v.setDisplaySize(GH * 16 / 9, GH));
      v.on(E.VIDEO_LOCKED, () => v.setMute(true));
      let part = 0;
      v.on(E.VIDEO_COMPLETE, () => { if (++part < list.length) { v.loadURL(list[part]); v.play(); } else this.endVideo(); });
      v.on(E.VIDEO_ERROR, () => this.endVideo());
      v.on(E.VIDEO_UNSUPPORTED, () => this.endVideo());
      v.play();
      const skip = this.add.text(GW - 14, 12, 'Esc: saltar', { fontFamily: 'sans-serif', fontSize: '14px', color: '#f4ecd8' }).setOrigin(1, 0).setDepth(2002).setAlpha(.7);
      this.video = { v, bg, skip, name };
    });
  }
  endVideo() {
    const V = this.video; if (!V) return;
    this.video = null;
    V.v.stop(); V.v.destroy(); V.bg.destroy(); V.skip.destroy();
    this.cameras.main.flash(400, 255, 255, 255);
    const time = this.time.now;
    const hit = (f, n) => { f.hp = Math.max(0, f.hp - n); this.play(f, 'hurt', true); f.state = 'hurt'; f.until = time + 700; this.cameras.main.shake(400, .012); SND.stomp(); };
    const S = SPECIALS[V.name];
    if (S.who === 'p') {
      // los dos especiales de Inkaxur le quitan la mitad de la energía al rival
      hit(this.r, Math.ceil(this.r.max * .5));
      if (S.prelude === 'amigos' && this.r.hp <= 0) {
        // sin energía: sale disparado fuera del planeta
        this.tweens.add({ targets: this.r.spr, y: -300, x: this.r.x + this.p.facing * 200, angle: 540, alpha: 0, duration: 900, ease: 'Quad.in' });
        this.r.shadow.setVisible(false); this.r.state = 'gone';
      }
    } else hit(this.p, Math.ceil(this.p.max * .5));
    this.updateHtmlHud();
    (this.allies || []).forEach((a, i) => { a.play(['dominga', 'litbru'][i] + '-win-lucha'); this.tweens.add({ targets: a, alpha: 0, delay: 900, duration: 500, onComplete: () => a.destroy() }); });
    (this.minions || []).forEach(m => this.tweens.add({ targets: m, y: FLOOR + 80, alpha: 0, duration: 600, onComplete: () => m.destroy() }));
    this.allies = null; this.minions = null;
    if (this.p.state === 'cast') this.p.state = 'idle';
    if (this.r.state === 'cast') this.r.state = 'idle';
    this.state = 'fight';
    if (this.r.hp <= 0) this.ko(this.r); else if (this.p.hp <= 0) this.ko(this.p);
  }

  /* ---------- fin ---------- */
  ko(loser) {
    if (this.over) return;
    this.over = true;
    const winner = loser.foe;
    if (loser.state !== 'gone') { loser.state = 'ko'; this.play(loser, 'ko', true); loser.vx = -loser.facing * 200; loser.vy = -350; loser.air = true; }
    winner.state = 'idle'; winner.vx = 0;
    this.bigText('K.O.', '#ff5a3a', 1500);
    SND.stomp(); this.cameras.main.shake(500, .01);
    this.time.delayedCall(1600, () => {
      winner.state = 'win';
      if (winner === this.p) { this.bigText('¡INKAXUR GANA!', '#ffd84a', 1800); SND.win(); this.time.delayedCall(2600, () => this.backToCusco()); }
      else { this.bigText(this.R.gana, '#ff8a7a', 1600); SND.die(); this.time.delayedCall(2000, () => showOverlay('over', { score: this.score })); }
    });
  }
  timeUp() {
    this.bigText('¡TIEMPO!', '#ffd84a', 1000);
    const pp = this.p.hp / this.p.max, rp = this.r.hp / this.r.max;
    this.time.delayedCall(900, () => this.ko(pp >= rp ? this.r : this.p));
  }
  backToCusco() {
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const run = { ...this.back, score: (this.back.score || 0) + 5000, coins: (this.back.coins || 0) + 20, hp: this.back.maxHp || 100 };
      this.scene.start('cusco', { run });
    });
  }

  /* ---------- barras (estilo Street Fighter) ---------- */
  drawHud(time) {
    const g = this.hud; g.clear();
    const bar = (x, w, frac, right) => {
      g.fillStyle(0x1d0a0a).fillRect(x - 3, 40, w + 6, 26);
      g.fillStyle(0xb81d1d).fillRect(x, 43, w, 20);
      const fw = w * Math.max(0, frac);
      g.fillStyle(0xffd84a).fillRect(right ? x + w - fw : x, 43, fw, 20);
      g.lineStyle(2, 0xfff3b0).strokeRect(x - 3, 40, w + 6, 26);
    };
    bar(34, 360, this.p.hp / this.p.max, false);
    bar(GW - 34 - 360, 360, this.r.hp / this.r.max, true);
    g.fillStyle(0x1d0a0a).fillCircle(GW / 2, 40, 30).lineStyle(3, 0xffd84a).strokeCircle(GW / 2, 40, 30);
    this.timerTxt.setText(String(Math.max(0, this.timeLeft)));
    // barras de especial: el nivel 1 se llena de un color y el nivel 2 encima, de otro
    const mbar = (x, m, right, c1, c2) => {
      g.fillStyle(0x1d0a0a, .85).fillRect(x - 2, GH - 30, 204, 14);
      const blink = Math.floor(time / 120) % 2;
      const fill = (frac, color, flash) => { const fw = 200 * Math.min(1, frac); g.fillStyle(flash && blink ? 0xffffff : color).fillRect(right ? x + 200 - fw : x, GH - 28, fw, 10); };
      fill(m / LV, c1, m >= LV && m < MAXM);
      if (m > LV) fill((m - LV) / LV, c2, m >= MAXM);
      g.lineStyle(1, 0xfff3b0, .6).strokeRect(x - 2, GH - 30, 204, 14);
    };
    mbar(34, this.p.meter, false, 0x9dff6a, 0xffd84a);
    mbar(GW - 34 - 200, this.r.meter, true, 0xff8a7a, this.R.fighter === 'supay' ? 0xc89aff : 0xffd84a);
    const lvTxt = (m, keys) => m >= MAXM ? `NIVEL 2 ¡LISTO!${keys ? ' P+O · P+M' : ''}` : m >= LV ? `NIVEL 1 ¡LISTO!${keys ? ' P+O' : ''}` : 'ESPECIAL';
    this.meterTxt[0].setText(lvTxt(this.p.meter, true));
    this.meterTxt[1].setText(lvTxt(this.r.meter, false));
  }
  updateHtmlHud() { renderHud({ hp: this.p.hp, max: this.p.max, score: this.score, coins: this.back?.coins ?? 0, time: this.timeLeft ?? TIME, char: 'xoxurInka' }); }

  flashMsg(txt, color) {
    const t = this.add.text(GW / 2, 118, txt, { fontFamily: FONT, fontSize: '26px', color, stroke: '#1d0a0a', strokeThickness: 6 }).setOrigin(.5).setDepth(1000);
    this.tweens.add({ targets: t, alpha: 0, y: 100, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }
  spark(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const s = this.add.rectangle(x, y, 6, 6, color).setDepth(50), a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, alpha: 0, duration: 240, onComplete: () => s.destroy() });
    }
    const c = this.add.circle(x, y, 10, color, .8).setDepth(49).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: 3, alpha: 0, duration: 200, onComplete: () => c.destroy() });
  }
}
