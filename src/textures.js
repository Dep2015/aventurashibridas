import { SHEETS, GW, GH } from './config.js';

/* ---------- texturas generadas por código ---------- */
export function makeTextures(scene) {
  if (scene.textures.exists('coinT')) return;
  const T = (key, w, h, fn) => { const g = scene.make.graphics({ add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };

  // moneda
  T('coinT', 20, 26, g => {
    g.fillStyle(0x8a5a00).fillEllipse(10, 13, 20, 26); g.fillStyle(0xffd84a).fillEllipse(10, 13, 16, 22);
    g.fillStyle(0xf2a900).fillRect(8, 6, 4, 14); g.fillStyle(0xfff3b0).fillRect(5, 6, 2, 8);
  });
  // alas (cubo de la cumbre). Dibujo provisional hasta tener el arte del ítem
  T('alasItem', 48, 34, g => {
    [-1, 1].forEach(sd => {
      g.fillStyle(0x5a3a1a).fillEllipse(24 + sd * 11, 13, 24, 16);
      g.fillStyle(0xf4f1e8).fillEllipse(24 + sd * 11, 12, 21, 12);
      g.fillStyle(0x5a3a1a).fillEllipse(24 + sd * 15, 21, 15, 9).fillEllipse(24 + sd * 19, 27, 9, 6);
      g.fillStyle(0xd8d2c2).fillEllipse(24 + sd * 15, 20, 12, 6).fillEllipse(24 + sd * 19, 26, 6, 4);
    });
    g.fillStyle(0x8a5a00).fillCircle(24, 15, 5); g.fillStyle(0xffd84a).fillCircle(24, 15, 3.5);
  });
  // bola de queso (proyectil del queso mutante)
  T('ball', 18, 18, g => {
    g.fillStyle(0x8a5a00).fillCircle(9, 9, 9); g.fillStyle(0xf5d23c).fillCircle(9, 9, 7);
    g.fillStyle(0xc9a21a).fillCircle(6, 7, 2).fillCircle(12, 11, 2).fillCircle(10, 5, 1); g.fillStyle(0xfff1a0).fillRect(5, 3, 3, 2);
  });
  // onda de polvo del jefe y marca de aviso de choclos
  T('wave', 40, 16, g => { g.fillStyle(0x7c4526, .9).fillEllipse(20, 10, 40, 12); g.fillStyle(0xc89a64, .9).fillEllipse(20, 8, 30, 8); g.fillStyle(0xffe08a).fillEllipse(20, 6, 14, 4); });
  T('warn', 28, 8, g => { g.fillStyle(0xffc93c, .85).fillEllipse(14, 4, 28, 8); g.fillStyle(0xe94b3c).fillEllipse(14, 4, 12, 4); });
  // pedazo de ladrillo
  T('shard', 12, 12, g => { g.fillStyle(0x7e3a1c).fillRect(0, 0, 12, 12); g.fillStyle(0xc8683a).fillRect(1, 1, 10, 9); });
}

/* ---------- animaciones ---------- */
export function createAnims(scene) {
  if (scene.anims.exists('xoxur-idle')) return;
  const A = (key, sheet, start, end, frameRate) =>
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(sheet, { start, end }), frameRate, repeat: -1 });
  for (const c in SHEETS) {
    scene.anims.create({ key: c + '-idle', frames: scene.anims.generateFrameNumbers(c, { start: 0, end: 5 }), frameRate: 6, repeat: -1, yoyo: true });
    A(c + '-walk', c, 6, 11, 11);
    A(c + '-run', c, 12, 17, 15);
  }
  A('llama-walk', 'llama', 0, 5, 7); A('llama-run', 'llama', 6, 11, 13);
  A('cheese-run', 'cheese', 0, 5, 16);
  A('imata-walk', 'imata', 0, 5, 8); A('imata-run', 'imata', 6, 11, 16);
  A('boss-walk', 'boss', 0, 5, 8); A('boss-run', 'boss', 6, 11, 15);
  A('jaguar-walk', 'jaguar', 0, 7, 9); A('jaguar-run', 'jaguar', 0, 7, 17);
  A('cuy-walk', 'cuy', 8, 13, 10);
}

// animaciones del nivel 2 (vuelo de Inkaxur y enemigos voladores); también las usa el despegue del nivel 1
export function createFlightAnims(scene) {
  const A = (key, sheet, frames, frameRate, repeat = -1) => {
    if (scene.anims.exists(key) || !scene.textures.exists(sheet)) return;
    scene.anims.create({ key, frames: frames.map(frame => ({ key: sheet, frame })), frameRate, repeat });
  };
  const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  A('vuelo-flotar', 'inkaxurVuelo', R(2, 7), 6);
  A('vuelo-volar', 'inkaxurVuelo', R(2, 7), 12);
  A('vuelo-dash', 'inkaxurVuelo', R(8, 13), 14);
  A('vuelo-despegue', 'inkaxurVuelo', R(14, 19), 7, 0);
  A('menta-spin', 'galletaMenta', [0, 1, 2], 12);
  A('condor-fly', 'condor', R(0, 5), 10);
  A('carga-fly', 'condorCarga', [0, 1], 5);
  A('zombi-cae', 'zombiAndina', [0, 1], 6);
  A('harpia-fly', 'harpia', R(10, 14), 12);
  A('cuyv-fly', 'cuyVolador', R(2, 7), 10);
  A('choclo-fly', 'chocloRad', R(0, 7), 10);
  A('hacha-gira', 'chocloHacha', R(0, 3), 14);
}

// nivel 3 (mina, vista desde arriba): piso de roca, escalera, luz de la antorcha, sombra; y animaciones
export function createCaveAssets(scene, FOES) {
  const T = (key, w, h, fn) => { if (scene.textures.exists(key)) return; const g = scene.make.graphics({ add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };
  // dos baldosas de piso de roca (48 px) con piedritas
  [0, 1].forEach(v => T('suelo3_' + v, 48, 48, g => {
    g.fillStyle(v ? 0x3b3129 : 0x40352c).fillRect(0, 0, 48, 48);
    g.fillStyle(0x4a3e33).fillRect(0, 0, 48, 2).fillRect(0, 0, 2, 48);
    g.fillStyle(0x2c241e).fillRect(0, 46, 48, 2).fillRect(46, 0, 2, 48);
    const dots = v ? [[10, 12], [30, 8], [22, 30], [38, 36], [6, 38]] : [[14, 20], [34, 14], [26, 38], [8, 6], [40, 28]];
    dots.forEach(([x, y], i) => { g.fillStyle(i % 2 ? 0x5a4c3e : 0x2a221c).fillRect(x, y, 3 + (i % 2), 2 + (i % 2)); });
  }));
  // escalera que baja al siguiente piso
  T('escalera3', 48, 48, g => {
    g.fillStyle(0x120d0a).fillRect(4, 4, 40, 40);
    for (let i = 0; i < 5; i++) { g.fillStyle(0x6b5a48 - i * 0x0a0806).fillRect(6 + i * 3, 8 + i * 7, 36 - i * 6, 5); }
    g.lineStyle(2, 0x8a7560).strokeRect(4, 4, 40, 40);
  });
  // sombra bajo los personajes
  T('sombra3', 40, 14, g => { g.fillStyle(0x000000, .45).fillEllipse(20, 7, 40, 14); });
  // luz de la antorcha: degradado radial (se usa para «borrar» la oscuridad)
  if (!scene.textures.exists('luz3')) {
    const r = 210, c = scene.textures.createCanvas('luz3', r * 2, r * 2), ctx = c.getContext();
    const grd = ctx.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.55, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, r * 2, r * 2); c.refresh();
  }
  // oscuridad de la mina ya con el hueco de la antorcha: una sola imagen que sigue a Inkaxur (antes se borraba la luz en
  // una RenderTexture en cada cuadro). Cubre dos pantallas (el jugador puede estar en cualquier lugar de la pantalla);
  // se hace a 1/4 de resolución y se agranda ×4 (es un degradado: no se nota)
  if (!scene.textures.exists('oscuro3')) {
    const q = 4, w = GW * 2 / q, h = GH * 2 / q, r = 210 / q, c = scene.textures.createCanvas('oscuro3', w, h), ctx = c.getContext();
    ctx.fillStyle = 'rgba(0,0,0,.82)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(.55, 'rgba(0,0,0,.85)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h); c.refresh();
  }
  // Inkaxur caminando en el mapa: una animación por dirección
  if (scene.textures.exists('inkaxurMapa')) ['down', 'up', 'left', 'right'].forEach((d, i) => {
    if (!scene.anims.exists('mapa-' + d)) scene.anims.create({ key: 'mapa-' + d, frames: scene.anims.generateFrameNumbers('inkaxurMapa', { start: i * 4, end: i * 4 + 3 }), frameRate: 8, repeat: -1 });
  });
  // animaciones de los enemigos (reposo y caminar)
  for (const k in FOES) {
    const f = FOES[k], sh = f.sheet;
    if (!scene.textures.exists(sh)) continue;
    const mk = (key, [a, b], rate) => { if (!scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(sh, { start: a, end: b }), frameRate: rate, repeat: -1 }); };
    mk(k + '-idle3', f.map.idle, 6); mk(k + '-walk3', f.map.walk, 10);
  }
}
