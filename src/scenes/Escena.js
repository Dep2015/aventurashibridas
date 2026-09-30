import Phaser from 'phaser';
import { GW, GH } from '../config.js';
import { SND } from '../audio.js';
import { showOverlay, renderHud, setLevelName } from '../ui.js';

/* ---------- escenas con imágenes (entre niveles) ----------
 * Cada escena muestra algunas imágenes (generadas con Higgsfield, en el estilo de la portada) con un texto; cada una
 * se acerca despacio (efecto Ken Burns). Z, Espacio, Enter o un clic pasan a la siguiente (o solas después de unos
 * segundos); Esc o «Saltar» la terminan. Si la escena tiene `video`, en vez de imágenes se reproduce ese video y
 * los textos salen como subtítulos según su tiempo `t`; al terminar el video termina la escena. Al terminar arranca `next` ({ key, data } de otra escena); si la escena es
 * `title` (el prólogo, que va encima del nivel 1) muestra la elección de personaje; si no, la pantalla de «Continuará».
 *  intro1: prólogo en video antes del nivel 1 (Cusco, la bomba y el satélite, los incas de oro, los zombis, la Pachamama y
 *          sus dos amuletos: uno para el centro de Machu Picchu y otro para el disco del sol del Paititi)
 *  intro2: empieza el nivel 2 (Inkaxur despega con las alas y ve a los enemigos del cielo)
 *  intro3: empieza el nivel 3 (se le acaba el vuelo, cae del cielo y entra por un agujero a la mina)
 *  final3: termina el nivel 3 (el géiser lo saca de la mina, baja y cae en la entrada del Cusco: el nivel 4)
 *  cetro4: el cetro de oro del Qorikancha (vuelve al Cusco); chakana4: la Chakana de Sacsayhuamán (fin del primer vistazo)
 * `endTitle` / `endText`: el cartel del final cuando la escena no sigue con otra. */
export const CUTSCENES = {
  // el prólogo es un video (Seedance 2.5 en Higgsfield, hecho a partir de las 9 imágenes prologo*.jpg, con música
  // propia: calma al inicio y épica al final); los textos salen como subtítulos en el segundo `t` del video
  intro1: { level: 'Prólogo', char: 'xoxur', end: 'title', fade: 0x000000, video: 'assets/escenas/prologo.mp4', slides: [
    { t: 0, text: 'Cusco. Xoxur, Dominga y Litbru pasean por el campo, entre ruinas incas.' },
    { t: 2.5, text: '¡De pronto, una bomba choca contra un satélite de internet!' },
    { t: 6, text: 'Corren a refugiarse en las ruinas… y caen a una cámara secreta llena de incas de oro.' },
    { t: 10.5, text: 'Al salir, todo cambió: el cielo es radiactivo y los zombis invaden los Andes.' },
    { t: 14.5, text: 'En el cielo aparece la Pachamama: \"Ayúdenme a devolverle la vida a la tierra\".' },
    { t: 19, text: 'La Pachamama les entrega dos amuletos sagrados.' },
    { t: 23.5, text: '"Coloquen uno en el centro de Machu Picchu…"' },
    { t: 28, text: '"…y el otro en el Paititi, la ciudad de oro, en medio del disco del sol."' },
    { t: 31, text: '¡Xoxur, Dominga y Litbru corren a enfrentar a los enemigos!' }
  ] },
  intro2: { level: 'Nivel 2 · El cielo', slides: [
    { key: 'intro2_despegue', text: '¡Con las alas, Inkaxur despega desde la cumbre!' },
    { key: 'intro2_enemigos', text: 'En el cielo contaminado lo esperan los enemigos del nivel 2…' }
  ] },
  intro3: { level: 'Nivel 3 · La mina', slides: [
    { key: 'intro3_caida', text: '¡Oh, no! Al vencer al Amaru, a Inkaxur se le acaba el efecto de vuelo…' },
    { key: 'intro3_cueva', text: '…y cae por un agujero en la montaña: ¡la mina de Muqui Z!' }
  ] },
  // nivel 4: el cetro del Qorikancha y la Chakana de Sacsayhuamán (la última termina el primer vistazo del nivel 4)
  cetro4: { level: 'Nivel 4 · Qorikancha', slides: [
    { key: 'cusco4_cetro', text: '¡El Supay vuelve al Uku Pacha! Inkaxur levanta el cetro de oro con punta de choclo.' }
  ] },
  chakana4: { level: 'Nivel 4 · Sacsayhuamán', endTitle: '¡La Chakana de oro!', endText: 'Continuará: con el cetro y la Chakana, el camino sigue hacia Machu Picchu…', slides: [
    { key: 'cusco4_chakana', text: '¡Pachacútec descansa al fin! La Chakana de oro brilla y el cielo radiactivo empieza a limpiarse.' }
  ] },
  final3: { level: 'Nivel 3 · Final', slides: [
    { key: 'final3_salida', text: '¡El géiser lanza a Inkaxur fuera de la mina de Muqui Z!' },
    { key: 'final3_bajada', text: 'Desde el cielo, Inkaxur baja hacia una tierra nueva…' },
    { key: 'final3_cusco', text: '…¡y cae en la entrada de la ciudad del Cusco, invadida por los zombis!' }
  ] }
};
const HOLD = 5500;

export class Escena extends Phaser.Scene {
  constructor() { super('escena'); }

  init(d) { this.cut = CUTSCENES[d.cut]; this.run = d.run; this.nextScene = d.next; this.i = -1; this.busy = false; this.done = false; }

  preload() {
    if (this.cut.video) return;  // el video no se precarga: se va cargando mientras se reproduce
    this.cut.slides.forEach(s => { if (!this.textures.exists(s.key)) this.load.image(s.key, `assets/escenas/${s.key}.jpg`); });
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    setLevelName(this.cut.level);
    renderHud({ hp: this.run.hp, max: this.run.maxHp, score: this.run.score, coins: this.run.coins, time: 0, char: this.cut.char || 'xoxurInka' });
    this.box = this.add.rectangle(0, GH - 70, GW, 70, 0x0b0806, .75).setOrigin(0).setDepth(10);
    this.caption = this.add.text(GW / 2, GH - 35, '', { fontFamily: '"Luckiest Guy", "Arial Black", sans-serif', fontSize: '26px', color: '#ffd84a', stroke: '#1d2a44', strokeThickness: 6, align: 'center', wordWrap: { width: GW - 60 } }).setOrigin(.5).setDepth(11);
    this.hint = this.add.text(GW - 14, 12, 'Z / clic ▶', { fontFamily: 'sans-serif', fontSize: '14px', color: '#f4ecd8' }).setOrigin(1, 0).setDepth(11).setAlpha(.7);
    // saltar toda la escena (Esc o el botón)
    const skip = this.add.text(14, 12, 'Saltar ▶▶', { fontFamily: '"Luckiest Guy", sans-serif', fontSize: '16px', color: '#f4ecd8', backgroundColor: '#1d2a44cc', padding: { x: 8, y: 4 } })
      .setDepth(12).setInteractive({ useHandCursor: true });
    skip.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.skipAll(); });
    // aparece desde blanco (viene de un destello: géiser, despegue) o desde negro (el prólogo)
    const f = this.cut.fade ?? 0xffffff;
    this.cameras.main.fadeIn(600, f >> 16, (f >> 8) & 255, f & 255);
    this.vid = null; this.cue = -1;
    if (this.cut.video) { this.hint.setVisible(false); this.input.keyboard.on('keydown', ev => { if (ev.key === 'Escape') this.skipAll(); }); this.playVideo(); return; }
    this.input.keyboard.on('keydown', ev => { if (['z', ' ', 'Enter'].includes(ev.key)) this.next(); else if (ev.key === 'Escape') this.skipAll(); });
    this.input.on('pointerdown', () => this.next());
    this.next();
  }

  // escena en video: ocupa todo el alto (16:9, se recortan unos píxeles a los lados) y los subtítulos siguen su tiempo
  playVideo() {
    const E = Phaser.GameObjects.Events;
    const v = this.vid = this.add.video(GW / 2, GH / 2).loadURL(this.cut.video);
    v.on(E.VIDEO_CREATED, () => v.setDisplaySize(GH * 16 / 9, GH));
    // si el navegador no deja reproducir con sonido (sin un clic del jugador), se reproduce sin sonido
    v.on(E.VIDEO_LOCKED, () => v.setMute(true));
    v.on(E.VIDEO_COMPLETE, () => this.end());
    v.on(E.VIDEO_ERROR, () => this.end());
    v.on(E.VIDEO_UNSUPPORTED, () => this.end());
    v.play();
  }

  update() {
    if (!this.vid || this.done) return;
    const t = this.vid.getCurrentTime(), slides = this.cut.slides;
    let i = this.cue;
    while (i + 1 < slides.length && t >= slides[i + 1].t) i++;
    if (i === this.cue) return;
    this.cue = i;
    this.caption.setText(slides[i].text).setAlpha(0);
    this.tweens.add({ targets: this.caption, alpha: 1, duration: 400 });
  }

  // fundido a negro y fin de la escena
  end() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(600);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.vid?.stop(); this.finish(); });
  }

  // saltar lo que queda de la escena
  skipAll() {
    if (this.done) return;
    if (this.vid) { this.end(); return; }
    this.i = this.cut.slides.length - 1; this.busy = false;
    this.next();
  }

  // al terminar: la escena siguiente (el nivel que empieza), la elección de personaje (prólogo) o «Continuará»
  finish() {
    this.done = true;
    if (this.nextScene) { this.scene.start(this.nextScene.key, this.nextScene.data); return; }
    if (this.cut.end === 'title') { setLevelName('Nivel 1 · Cordillera'); this.scene.stop(); showOverlay('title'); return; }
    showOverlay('win', { title: this.cut.endTitle || '¡Nivel 3 completado!', text: this.cut.endText || 'Nivel 4: continuará…', score: this.run.score, coins: this.run.coins });
  }

  next() {
    if (this.busy) return;
    this.busy = true;
    this.timer?.remove();
    this.i++;
    const old = this.img;
    const slides = this.cut.slides;
    if (this.i >= slides.length) {
      this.cameras.main.fadeOut(600);
      this.cameras.main.once('camerafadeoutcomplete', () => this.finish());
      return;
    }
    const s = slides[this.i];
    const img = this.img = this.add.image(GW / 2, GH / 2, s.key).setAlpha(0);
    const cover = Math.max(GW / img.width, GH / img.height);
    img.setScale(cover);
    this.tweens.add({ targets: img, alpha: 1, duration: 700 });
    this.tweens.add({ targets: img, scale: cover * 1.08, duration: HOLD + 1500, ease: 'Sine.inOut' });  // se acerca despacio
    if (old) this.tweens.add({ targets: old, alpha: 0, duration: 700, onComplete: () => old.destroy() });
    this.caption.setText(s.text).setAlpha(0);
    this.tweens.add({ targets: this.caption, alpha: 1, delay: 400, duration: 500 });
    SND.up();
    this.time.delayedCall(800, () => { this.busy = false; });
    this.timer = this.time.delayedCall(HOLD, () => this.next());
  }
}
