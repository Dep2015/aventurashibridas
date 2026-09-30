import Phaser from 'phaser';
import { GW, GH } from '../config.js';
import { SND, sfx } from '../audio.js';
import { FOES, MOVES, RUNES } from '../level3.js';

const FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const TXT = { fontFamily: 'sans-serif', fontSize: '20px', color: '#f4ecd8', wordWrap: { width: 500 } };
const BOX_Y = 430;  // caja de texto y menú (abajo)
const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));

/* ---------- batalla por turnos (como Pokémon) ----------
 * Se abre encima de la mina (la escena `cueva` queda en pausa). Arriba a la derecha el enemigo (de frente), abajo a la
 * izquierda Inkaxur. Menú: LUCHAR (4 ataques con enfriamiento), ÍTEMS (Casino, quipu), RUNAS (las que tienes), HUIR.
 * Teclado: flechas para elegir, Z / Espacio / Enter para aceptar, X / Esc para volver. También con el mouse o tocando.
 * Al terminar llama a cueva.battleEnd('win' | 'run' | 'lose'). */
export class Batalla extends Phaser.Scene {
  constructor() { super('batalla'); }

  init(d) {
    this.d = d; this.run = d.run;
    const f = this.f = FOES[d.foe];
    // más fuerte en pisos más profundos y con cada campanada
    this.mult = 1 + .15 * (d.floor - 1) + .1 * d.bells;
    this.foe = { hp: Math.round(f.hp * this.mult), max: Math.round(f.hp * this.mult), poison: 0, stun: false, charged: null };
    this.me = { poison: 0, blind: 0, cds: {} };
    this.over = false; this.menuItems = null;
  }

  create() {
    const f = this.f, d = this.d;
    // fondo de la caverna y las dos plataformas
    this.add.image(GW / 2, 0, 'fondoRocoso3').setOrigin(.5, 0).setDisplaySize(GW, BOX_Y).setTint(0x9a8a7a);
    this.add.rectangle(0, 0, GW, BOX_Y, 0x0b0806, .35).setOrigin(0);
    const efy = 250;
    this.add.ellipse(700, efy, 320, 70, 0x2a1f16, .9);
    this.add.ellipse(250, 418, 340, 74, 0x2a1f16, .9);
    // enemigo (de frente) y Inkaxur (de costado)
    const fh = this.textures.get(f.sheet).get(0).height;
    this.textures.get(f.sheet).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('xoxurInka').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.eSpr = this.add.sprite(700, efy + 6, f.sheet, f.battle.idle[0]).setOrigin(.5, 1).setScale(f.battle.h / fh).setFlipX(!!f.battle.flip);
    this.eSpr.play(d.foe + '-idle3');
    this.eHome = { x: this.eSpr.x, y: this.eSpr.y };
    this.pSpr = this.add.sprite(250, 424, 'xoxurInka', 6).setOrigin(.5, 1).setScale(2.6);
    this.pHome = { x: this.pSpr.x, y: this.pSpr.y };
    // cajas de vida
    this.eBox = this.infoBox(40, 36, f.name + (f.elite ? '  · ÉLITE' : ''));
    this.pBox = this.infoBox(575, 322, 'Inkaxur', true);
    // caja de texto y menú
    this.add.rectangle(0, BOX_Y, GW, GH - BOX_Y, 0x1d1510).setOrigin(0).setStrokeStyle(4, 0x8a7560);
    this.msg = this.add.text(28, BOX_Y + 18, '', TXT);
    this.cursor = this.add.text(0, 0, '▶', { fontFamily: FONT, fontSize: '20px', color: '#ffd84a' }).setVisible(false);
    this.input.keyboard.on('keydown', ev => this.onKey(ev));
    this.input.on('pointerdown', () => { if (!this.menuItems) this.skip = true; });
    this.refresh();
    this.intro();
  }

  infoBox(x, y, name, big) {
    const g = this.add.graphics();
    g.fillStyle(0xf4ecd8, .95).fillRoundedRect(x, y, 350, big ? 96 : 76, 10).lineStyle(4, 0x3a2a1a).strokeRoundedRect(x, y, 350, big ? 96 : 76, 10);
    const t = this.add.text(x + 16, y + 8, name, { fontFamily: FONT, fontSize: '20px', color: '#2a1f16' });
    const bar = this.add.graphics();
    const num = big ? this.add.text(x + 334, y + 62, '', { fontFamily: FONT, fontSize: '18px', color: '#2a1f16' }).setOrigin(1, 0) : null;
    const st = this.add.text(x + 16, y + (big ? 64 : 50), '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#7a2a8a', fontStyle: 'bold' });
    return { x, y, bar, num, st, shown: null };
  }

  // dibuja las barras de vida (con animación: la barra baja de a poco)
  refresh() {
    const draw = (b, hp, max, status) => {
      const target = Math.max(0, hp) / max;
      if (b.shown === null) b.shown = target;
      this.tweens.addCounter({ from: b.shown, to: target, duration: 350, onUpdate: tw => {
        const v = tw.getValue(); b.shown = v;
        b.bar.clear().fillStyle(0x3a2a1a).fillRoundedRect(b.x + 60, b.y + 38, 272, 16, 6);
        b.bar.fillStyle(v > .5 ? 0x46c35a : v > .2 ? 0xf0b429 : 0xe94b3c).fillRoundedRect(b.x + 62, b.y + 40, 268 * v, 12, 5);
      } });
      if (b.num) b.num.setText(`${Math.max(0, Math.ceil(hp))} / ${max}`);
      b.st.setText(status);
    };
    const fs = [this.foe.poison ? 'ENVENENADO' : '', this.foe.stun ? 'ATURDIDO' : '', this.foe.charged ? 'CARGANDO' : ''].filter(Boolean).join(' · ');
    const ms = [this.me.poison ? 'ENVENENADO' : '', this.me.blind ? 'SIN PUNTERÍA' : ''].filter(Boolean).join(' · ');
    draw(this.eBox, this.foe.hp, this.foe.max, fs);
    draw(this.pBox, this.run.hp, this.run.maxHp, ms);
    this.scene.get('cueva').updateHud();
  }

  /* ---------- mensajes ---------- */
  wait(ms) { return new Promise(r => this.time.delayedCall(ms, r)); }
  // escribe el mensaje letra por letra y espera un momento (Z o un toque lo adelanta)
  async say(text, hold = 750) {
    this.hideMenu(); this.skip = false;
    for (let i = 1; i <= text.length; i++) {
      if (this.skip) { i = text.length; }
      this.msg.setText(text.slice(0, i));
      if (!this.skip) await this.wait(18);
    }
    this.skip = false;
    for (let t = 0; t < hold && !this.skip; t += 50) await this.wait(50);
    this.skip = false;
  }

  /* ---------- menús ---------- */
  showMenu(items, { onBack, info } = {}) {
    this.hideMenu();
    this.menuItems = items; this.menuBack = onBack; this.menuInfo = info; this.sel = items.findIndex(i => !i.disabled);
    if (this.sel < 0) this.sel = 0;
    const x0 = 560, y0 = BOX_Y + 16;
    this.menuTexts = items.map((it, i) => {
      const x = x0 + (i % 2) * 200, y = y0 + Math.floor(i / 2) * 44;
      const t = this.add.text(x + 26, y, it.label, { fontFamily: FONT, fontSize: '19px', color: it.disabled ? '#7a6a5a' : '#f4ecd8', wordWrap: { width: 170 } })
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.sel = i; this.paintMenu(); });
      t.on('pointerdown', () => { this.sel = i; this.pick(); });
      return t;
    });
    this.paintMenu();
  }
  hideMenu() { (this.menuTexts || []).forEach(t => t.destroy()); this.menuTexts = null; this.menuItems = null; this.cursor.setVisible(false); }
  paintMenu() {
    const t = this.menuTexts[this.sel];
    this.cursor.setPosition(t.x - 24, t.y).setVisible(true);
    if (this.menuInfo) this.msg.setText(this.menuInfo(this.menuItems[this.sel]));
  }
  pick() {
    const it = this.menuItems?.[this.sel];
    if (!it || it.disabled) { sfx(140, 90, .08, 'square', .04); return; }
    sfx(700, 700, .05, 'square', .04);
    it.onPick();
  }
  onKey(ev) {
    const k = ev.key;
    if (!this.menuItems) { if (k === 'z' || k === ' ' || k === 'Enter') this.skip = true; return; }
    const n = this.menuItems.length;
    if (k === 'ArrowRight' || k === 'd') this.sel = Math.min(n - 1, this.sel + 1);
    else if (k === 'ArrowLeft' || k === 'a') this.sel = Math.max(0, this.sel - 1);
    else if (k === 'ArrowDown' || k === 's') this.sel = Math.min(n - 1, this.sel + 2);
    else if (k === 'ArrowUp' || k === 'w') this.sel = Math.max(0, this.sel - 2);
    else if (k === 'z' || k === ' ' || k === 'Enter') { this.pick(); return; }
    else if ((k === 'x' || k === 'Escape' || k === 'Backspace') && this.menuBack) { this.menuBack(); return; }
    else return;
    this.paintMenu();
  }

  mainMenu() {
    if (this.over) return;
    this.msg.setText(`¿Qué hará Inkaxur?`);
    const canRun = !this.f.elite;
    this.showMenu([
      { label: 'LUCHAR', onPick: () => this.fightMenu() },
      { label: 'ÍTEMS', onPick: () => this.itemMenu() },
      { label: 'RUNAS', onPick: () => this.runeInfo() },
      { label: 'HUIR', disabled: !canRun, onPick: () => this.tryRun() }
    ]);
  }

  fightMenu() {
    const items = MOVES.map(m => {
      const cd = this.me.cds[m.key] || 0;
      let disabled = cd > 0, label = m.name;
      if (m.needs === 'cetro' && !this.run.cetro) { disabled = true; label += ' (no lo tienes)'; }
      if (m.needs === 'plasma') { label += ` x${this.run.inv.plasma}`; disabled = this.run.inv.plasma <= 0; }
      if (cd > 0) label += ` (${cd})`;
      return { label, disabled, move: m, onPick: () => this.playerTurn(m) };
    });
    this.showMenu(items, {
      onBack: () => this.mainMenu(),
      info: it => `${it.move.name}: daño ${this.moveDmgText(it.move)}. ${it.move.desc}.${(this.me.cds[it.move.key] || 0) > 0 ? ` Listo en ${this.me.cds[it.move.key]} turno(s).` : ''}`
    });
  }
  moveDmgText(m) { const b = this.bonus(m); return `${m.dmg[0] + b}–${m.dmg[1] + b}`; }
  bonus(m) { const r = this.run.runes; return m.key === 'galleta' ? 3 * (r.galleta || 0) : m.key === 'baculo' ? 6 * (r.baculo || 0) : 0; }

  itemMenu() {
    const inv = this.run.inv;
    this.showMenu([
      { label: `Casino x${inv.casino}`, disabled: !inv.casino, onPick: () => this.useItem('casino') },
      { label: `Quipu x${inv.quipu}`, disabled: !inv.quipu, onPick: () => this.useItem('quipu') },
      { label: 'VOLVER', onPick: () => this.mainMenu() }
    ], { onBack: () => this.mainMenu(), info: it => it.label.startsWith('Casino') ? 'Casino: restaura toda la energía.' : it.label.startsWith('Quipu') ? 'Quipu: +30 de energía.' : 'Volver al menú.' });
  }

  async runeInfo() {
    const list = Object.entries(this.run.runes).map(([k, n]) => `${RUNES[k].name} ${'I'.repeat(n)}`);
    this.hideMenu();
    this.msg.setText(list.length ? 'Runas: ' + list.join(' · ') : 'Todavía no tienes runas. Búscalas en los cristales de la mina.');
    this.showMenu([{ label: 'VOLVER', onPick: () => this.mainMenu() }], { onBack: () => this.mainMenu() });
  }

  /* ---------- turno de Inkaxur ---------- */
  async useItem(k) {
    this.hideMenu();
    this.run.inv[k]--;
    const heal = k === 'casino' ? this.run.maxHp : 30;
    this.run.hp = Math.min(this.run.maxHp, this.run.hp + heal);
    SND.up();
    this.pSpr.setTint(0x9dff6a); this.time.delayedCall(300, () => this.pSpr.clearTint());
    this.refresh();
    await this.say(k === 'casino' ? 'Inkaxur abre un Casino: ¡energía llena!' : 'Inkaxur usa un quipu: +30 de energía.');
    await this.enemyTurn();
  }

  async tryRun() {
    this.hideMenu();
    const chance = .55 + .15 * (this.run.runes.pies || 0);
    if (Math.random() < chance) { await this.say('¡Escapaste!'); this.end('run'); return; }
    await this.say('¡No pudiste escapar!');
    await this.enemyTurn();
  }

  async playerTurn(m) {
    this.hideMenu();
    const f = this.f, foe = this.foe, r = this.run.runes;
    await this.say(`Inkaxur usa ${m.name}.`, 250);
    if (m.cd) this.me.cds[m.key] = m.cd + 1;  // +1: se descuenta al final de este mismo turno
    if (m.key === 'plasma') this.run.inv.plasma--;
    await this.attackAnim(m);
    if (Math.random() > (this.me.blind ? .7 : .95)) { await this.say('¡Falló!'); }
    else {
      let dmg = rnd(m.dmg) + this.bonus(m);
      const crit = Math.random() < .06 + .08 * (r.condor || 0);
      if (crit) dmg *= 2;
      foe.hp = Math.max(0, foe.hp - dmg);
      this.hitFx(this.eSpr, dmg, f.hit);
      this.refresh();
      await this.wait(350);
      if (crit) await this.say('¡Golpe crítico!', 450);
      if (foe.hp > 0 && m.stun && Math.random() < m.stun) { foe.stun = true; this.refresh(); await this.say(`¡${f.name} quedó aturdido!`, 500); }
      if (foe.hp > 0 && r.veneno && !foe.poison && Math.random() < .15 * r.veneno) { foe.poison = 3; this.refresh(); await this.say(`¡${f.name} se envenenó!`, 500); }
    }
    if (foe.hp <= 0) { await this.victory(); return; }
    await this.enemyTurn();
  }

  // animación del ataque de Inkaxur: lanza la galleta, el báculo o el plasma; el látigo es un golpe de cerca
  async attackAnim(m) {
    const p = this.pSpr, e = this.eSpr, ey = e.y - e.displayHeight * .5;
    p.setFrame(m.key === 'quipus' ? 23 : 25);
    if (m.key === 'quipus') {
      await new Promise(res => this.tweens.add({ targets: p, x: p.x + 330, y: p.y - 120, duration: 220, yoyo: true, onYoyo: () => { p.setFrame(24); sfx(500, 200, .15, 'sawtooth', .05); }, onComplete: res }));
    } else {
      p.setFrame(24);
      const o = m.key === 'galleta' ? this.add.sprite(p.x + 60, p.y - 90, 'galletaMenta', 0).play('menta-spin').setScale(1.4)
        : m.key === 'baculo' ? this.add.image(p.x + 60, p.y - 90, 'baculo').setScale(.8)
        : this.add.image(p.x + 60, p.y - 90, 'items', 8).setScale(1.6).setBlendMode(Phaser.BlendModes.ADD);
      sfx(m.key === 'plasma' ? 200 : 700, m.key === 'plasma' ? 900 : 350, .2, m.key === 'plasma' ? 'triangle' : 'square', .06);
      await new Promise(res => this.tweens.add({ targets: o, x: e.x, y: ey, angle: 720, duration: 380, ease: 'Quad.in', onComplete: res }));
      if (m.key === 'plasma') { this.cameras.main.flash(200, 150, 255, 190); }
      o.destroy();
    }
    p.setFrame(6);
  }

  // golpe recibido: parpadeo, cuadro de daño, sacudida y número de daño
  hitFx(spr, dmg, hitFrame) {
    SND.stomp(); this.cameras.main.shake(140, .006);
    spr.setTintFill(0xffffff); this.time.delayedCall(90, () => spr.clearTint());
    if (hitFrame != null) { spr.anims.stop(); spr.setFrame(hitFrame); this.time.delayedCall(400, () => spr.active && !this.over && spr === this.eSpr && spr.play(this.d.foe + '-idle3')); }
    const t = this.add.text(spr.x + Phaser.Math.Between(-20, 20), spr.y - spr.displayHeight * .7, '-' + dmg, { fontFamily: FONT, fontSize: '34px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 6 }).setOrigin(.5);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  /* ---------- turno del enemigo ---------- */
  chooseMove() {
    const f = this.f, foe = this.foe;
    if (foe.charged) { const m = foe.charged; foe.charged = null; return m; }
    let moves = f.moves;
    if (moves.some(m => m.heal)) {
      // cura solo si está herida
      moves = foe.hp < foe.max * .5 && Math.random() < .5 ? moves.filter(m => m.heal) : moves.filter(m => !m.heal);
    }
    return Phaser.Utils.Array.GetRandom(moves);
  }

  async enemyTurn() {
    const f = this.f, foe = this.foe, me = this.me, run = this.run;
    if (foe.stun) {
      foe.stun = false; this.refresh();
      await this.say(`¡${f.name} está aturdido y no puede atacar!`);
    } else {
      const m = this.chooseMove();
      if (m.charge) {
        foe.charged = m.then; this.refresh();
        this.eSpr.anims.stop(); this.eSpr.setFrame(m.frame);
        sfx(200, 800, .5, 'sawtooth', .05);
        await this.say(`${f.name} ${m.name.toLowerCase()}…`);
      } else {
        await this.say(`${f.name} usa ${m.name}.`, 250);
        this.eSpr.anims.stop(); this.eSpr.setFrame(m.frame);
        await new Promise(res => this.tweens.add({ targets: this.eSpr, x: this.eHome.x - 120, y: this.eHome.y + 30, duration: 200, yoyo: true, onComplete: res }));
        this.eSpr.play(this.d.foe + '-idle3');
        if (m.heal) {
          foe.hp = Math.min(foe.max, foe.hp + m.heal); SND.up(); this.refresh();
          await this.say(`${f.name} recupera ${m.heal} de vida.`);
        } else if (Math.random() > .9) await this.say('¡Inkaxur lo esquivó!');
        else {
          const dmg = Math.max(1, Math.round(m.dmg * this.mult * (.9 + Math.random() * .2)));
          run.hp = Math.max(0, run.hp - dmg);
          this.pSpr.setFrame(33); this.time.delayedCall(350, () => this.pSpr.setFrame(6));
          this.hitFx(this.pSpr, dmg, null);
          this.refresh();
          await this.wait(350);
          if (run.hp > 0 && m.poison && !me.poison) { me.poison = 3; this.refresh(); await this.say('¡Inkaxur se envenenó!', 500); }
          if (run.hp > 0 && m.blind) { me.blind = 2; this.refresh(); await this.say('¡El humo le baja la puntería a Inkaxur!', 500); }
        }
      }
    }
    if (run.hp <= 0) { await this.defeat(); return; }
    // fin de la ronda: veneno, enfriamientos
    if (foe.poison) {
      foe.poison--; const pd = Math.max(2, Math.round(foe.max * .06)); foe.hp = Math.max(0, foe.hp - pd); this.refresh();
      await this.say(`${f.name} sufre por el veneno (-${pd}).`, 500);
      if (foe.hp <= 0) { await this.victory(); return; }
    }
    if (me.poison) {
      me.poison--; run.hp = Math.max(0, run.hp - 4); this.refresh();
      await this.say('Inkaxur sufre por el veneno (-4).', 500);
      if (run.hp <= 0) { await this.defeat(); return; }
    }
    if (me.blind) me.blind--;
    for (const k in me.cds) if (me.cds[k] > 0) me.cds[k]--;
    this.refresh();
    this.mainMenu();
  }

  /* ---------- fin ---------- */
  async intro() {
    const f = this.f;
    this.eSpr.x += 400; this.pSpr.x -= 400;
    this.tweens.add({ targets: this.eSpr, x: this.eHome.x, duration: 500, ease: 'Quad.out' });
    this.tweens.add({ targets: this.pSpr, x: this.pHome.x, duration: 500, ease: 'Quad.out' });
    await this.wait(500);
    await this.say(f.elite ? `¡${f.name}, un enemigo élite, te ataca!` : `¡Un ${f.name} salvaje te ataca!`);
    this.mainMenu();
  }

  async victory() {
    this.over = true;
    const f = this.f, run = this.run;
    this.eSpr.anims.stop();
    if (f.ko != null) this.eSpr.setFrame(f.ko);
    this.tweens.add({ targets: this.eSpr, alpha: 0, y: this.eSpr.y + 30, delay: 400, duration: 600 });
    SND.win();
    this.pSpr.setTexture('inkaxurVuelo', 16).setScale(2.2);  // celebración: brazos arriba
    await this.say(`¡Venciste a ${f.name}!`);
    run.coins += f.coins; run.score += f.score;
    const heal = 5 * (run.runes.quipu || 0);
    if (heal) run.hp = Math.min(run.maxHp, run.hp + heal);
    this.refresh();
    await this.say(`Ganaste ${f.coins} monedas${heal ? ` y el quipu vital te cura ${heal}` : ''}.`);
    this.end('win');
  }

  async defeat() {
    this.over = true;
    this.pSpr.anims.stop(); this.pSpr.setFrame(35);
    await this.say('Inkaxur se quedó sin energía…', 1000);
    this.end('lose');
  }

  end(result) {
    const cueva = this.scene.get('cueva');
    this.scene.stop();
    this.scene.resume('cueva');
    cueva.battleEnd(result);
  }
}
