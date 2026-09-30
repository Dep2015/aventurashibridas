import { GW } from './config.js';
import { showBossPanel, renderBoss } from './ui.js';

const FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const STYLE = { fontFamily: FONT, fontSize: '26px', color: '#ffffff', stroke: '#1d2a44', strokeThickness: 6 };

/* ---------- HUD: marcador, textos flotantes y barra del jefe ---------- */
export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.powerBg = scene.add.graphics().setScrollFactor(0).setDepth(49);
    this.powerIcons = []; this.powerCounts = [];
  }

  // poderes activos: íconos bajo el marcador con una barra de tiempo restante
  drawPowers(list) {
    while (this.powerIcons.length < list.length) {
      this.powerIcons.push(this.scene.add.image(0, 0, 'items', 0).setScrollFactor(0).setDepth(50).setScale(.9));
      this.powerCounts.push(this.scene.add.text(0, 0, '', { ...STYLE, fontSize: '16px', strokeThickness: 4 }).setOrigin(1, 1).setScrollFactor(0).setDepth(51));
    }
    const g = this.powerBg; g.clear();
    this.powerIcons.forEach((im, i) => {
      const p = list[i], txt = this.powerCounts[i];
      im.setVisible(!!p); txt.setVisible(!!p && p.count > 1); if (!p) return;
      const x = 34 + i * 46, y = 32;
      txt.setText('x' + p.count).setPosition(x + 21, y + 20);
      im.setFrame(p.frame).setPosition(x, y);
      g.fillStyle(0x1d2a44, .55).fillRoundedRect(x - 20, y - 20, 40, 40, 8);
      if (p.frac !== null) {
        g.fillStyle(0x1d2a44).fillRect(x - 18, y + 23, 36, 7);
        g.fillStyle(p.frac < .25 ? 0xe94b3c : 0xffc93c).fillRect(x - 17, y + 24, 34 * p.frac, 5);
      }
    });
  }

  // número que sube y se desvanece (en coordenadas del mundo)
  popup(text, x, y) {
    const t = this.scene.add.text(x, y, String(text), { fontFamily: FONT, fontSize: '20px', color: '#fff', stroke: '#1d2a44', strokeThickness: 4 })
      .setOrigin(.5).setDepth(40);
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // texto grande en el centro de la pantalla
  banner(txt, color = '#ffc93c') {
    // si ya hay carteles en pantalla, el nuevo va más abajo para no encimarse
    this.banners = (this.banners || []).filter(t => t.active);
    const y = 190 + this.banners.length * 72;
    const t = this.scene.add.text(GW / 2, y, txt, { fontFamily: FONT, fontSize: '56px', color, stroke: '#1d2a44', strokeThickness: 10 })
      .setOrigin(.5).setScrollFactor(0).setDepth(60).setScale(.4).setAlpha(0);
    this.banners.push(t);
    this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 350, ease: 'Back.out' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  }

  // la vida del jefe va en el panel izquierdo (HTML), debajo de la energía del jugador
  showBoss(on, cfg) { showBossPanel(on, cfg); }
  drawBossBar(hp, max) { renderBoss(hp, max); }
}
