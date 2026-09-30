import Phaser from 'phaser';
import { TS, GW, GH, GROUND_Y, TF } from './config.js';
import { LW, LH, TOP } from './level.js';

/* ---------- construcción del escenario a partir de los datos del nivel ---------- */

// cielo, paralaje, calles coloniales, vegetación y pueblo
export function buildBackground(scene, L) {
  const add = scene.add;
  const [c0, c1, c2, c3] = L.skyColors;
  const sky = add.graphics().setScrollFactor(0).setDepth(-20);
  sky.fillGradientStyle(c0, c0, c1, c1, 1); sky.fillRect(0, 0, GW, 150);
  sky.fillGradientStyle(c2, c2, c3, c3, 1); sky.fillRect(0, 150, GW, GH - 150);

  // filtro NEAREST para evitar costuras entre tiles
  [L.sky, 'tormenta', 'mtn', 'terr', 'fg0', 'fg1', 'fg2', 'fg3', 'fg4', 'tiles', 'plat']
    .forEach(k => scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST));

  // capas de paralaje: se repiten alternando espejo (cada copia al ancho real de su imagen).
  // sy = paralaje vertical: al subir el cerro, los andenes y la cordillera bajan y quedan atrás, aparecen
  // nubes radiactivas y arriba del todo solo se ve el cielo radiactivo (sy 0: siempre arriba de la pantalla)
  const layer = (n, key, y, scale, sx, sy, depth, originY) => {
    const w = scene.textures.get(key).getSourceImage().width * scale;
    for (let i = 0; i < n; i++) {
      add.image(i * w, y, key).setOrigin(0, originY).setScale(scale).setScrollFactor(sx, sy).setDepth(depth).setFlipX(i % 2 === 1);
    }
  };
  layer(3, L.sky, 0, L.skyScale || 1.6, .03, 0, -19, 0);
  // tormenta radiactiva: llena la franja entre el cielo y la cordillera (fija en pantalla, como el cielo).
  // Se le difumina el borde de arriba para que se funda con el cielo sin corte.
  if (!scene.textures.exists('tormentaFade')) {
    const src = scene.textures.get('tormenta').getSourceImage();
    const c = scene.textures.createCanvas('tormentaFade', src.width, src.height), ctx = c.getContext();
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    const fade = src.height * .5, g = ctx.createLinearGradient(0, 0, 0, fade);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    // destination-in borra todo lo que no cubre el relleno: se cubre la imagen entera (opaca debajo del difuminado)
    ctx.fillStyle = g; ctx.fillRect(0, 0, src.width, src.height);
    c.refresh(); c.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  layer(3, 'tormentaFade', 180, 1, .06, 0, -18, 0);  // imagen de 1980×366: llena de y 180 al suelo
  layer(4, 'mtn', 410, 1.5, .12, .35, -16, 1);  // cordillera (sin ciudad)
  layer(5, 'terr', 494, 1.5, .35, .6, -12, 1);
  layer(7, 'nubesRad', -1356, 1.6, .5, .85, -14, 1);  // nubes radiactivas: solo se ven cerca de la cima

  // zonas de ciudad: fondo de calle colonial
  const CF = .85, CS = 1.05, CW = 265 * CS;
  for (const [a, b] of L.city) {
    const x0 = a === 0 ? -20 : (a * TS - 700) * CF + 700, x1 = (b * TS - 260) * CF + 260;
    let n = 0;
    for (let x = x0; x < x1 - CW * .35; x += CW) {
      add.image(x, 490, 'city').setOrigin(0, 1).setScale(CS).setScrollFactor(CF).setDepth(-11).setFlipX(n++ % 2 === 1).setTint(0xcfc4b4);
    }
  }

  // vegetación y ruinas del frente (solo sobre suelo despejado)
  L.decor.forEach(([x, k]) => {
    const c = Math.floor(x);
    if (L.g[15][c] && !L.g[14][c]) add.image(x * TS, GROUND_Y + 4, k).setOrigin(.5, 1).setScale(.5).setDepth(-2);
  });

  // pueblo andino
  L.props.forEach(([x, key, scale = 1, depth = -3]) => {
    add.image(x * TS, GROUND_Y + 2, key).setOrigin(.5, 1).setScale(scale).setDepth(depth);
  });

  // columnas al fondo de la arena (en la cima del cerro), de 7 bloques de alto sobre el piso de la arena
  const floorRow = Math.round(L.arena.floorY / TS);
  for (const px of L.arenaPillars) for (let y = floorRow - 7; y <= floorRow - 1; y++) {
    const f = y === floorRow - 7 ? TF.ptop : y === floorRow - 1 ? TF.pbase : TF.pmid;
    add.image(px * TS + 16, y * TS + 16, 'tiles', f).setDepth(-10).setAlpha(.7).setTint(0xd8cfbf);
  }
}

// Los bloques que nunca cambian de aspecto (suelo, piedra y todo el cerro) se dibujan en un Tilemap, que solo dibuja
// las casillas que ve la cámara. Como imágenes sueltas eran más de 10 000 objetos que Phaser recorría en cada cuadro.
// Los sólidos siguen existiendo (sprites invisibles) por su cuerpo de física y para `blocks`.
function fixedTiles(scene) {
  const row0 = Math.floor(TOP / TS);  // primera fila (negativa: el cerro sube por encima de la pantalla inicial)
  const map = scene.make.tilemap({ tileWidth: TS, tileHeight: TS, width: LW, height: LH - row0 });
  const layer = map.createBlankLayer('fijos', map.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0), 0, row0 * TS).setDepth(0);
  return { put: (f, x, y) => layer.putTileAt(f, x, y - row0), remove: (x, y) => layer.removeTileAt(x, y - row0) };
}

// bloques sólidos; devuelve el grupo y el diccionario "x,y" → sprite
export function buildSolids(scene, L) {
  const solids = scene.physics.add.staticGroup();
  const blocks = {};
  const fixed = fixedTiles(scene);
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const t = L.g[y][x]; if (!t) continue;
    let s;
    if (t === 'ground' || t === 'stone') {
      // no cambian nunca: se ven en el Tilemap y el sprite queda invisible (solo cuerpo)
      const f = tileFrame(L.g, t, x, y);
      fixed.put(f, x, y);
      s = solids.create(x * TS + 16, y * TS + 16, 'tiles', f).setVisible(false);
      if (TF.grass.includes(f)) sinkGrass(s);
    } else if (t === 'plat') {
      // sprite de 32×40 con cuerpo de 32×32 alineado arriba
      const l = L.g[y][x - 1] === 'plat', r = L.g[y][x + 1] === 'plat';
      s = solids.create(x * TS + 16, y * TS + 20, 'plat', !l ? 0 : !r ? 3 : (x % 2 ? 1 : 2));
      s.body.setSize(32, 32, false); s.body.setOffset(0, 0);
    } else {
      const f = tileFrame(L.g, t, x, y);
      s = solids.create(x * TS + 16, y * TS + 16, 'tiles', f);
      if (TF.grass.includes(f)) sinkGrass(s);
    }
    s.setData('type', t); s.setData('tx', x); s.setData('ty', y);
    blocks[x + ',' + y] = s;
  }

  // el cerro: superficie de pasto, caras de piedra inca (sólidas) y relleno de tierra (solo imagen, sin física)
  L.hill.cells.forEach(([x, y, type, solid]) => {
    const f = type === 'grass' ? TF.grass[(x * 7 + 3) % 4] : type === 'stone' ? TF.stone[(x * 3 + y + 30) % 3] : TF.dirt[x % 2];
    fixed.put(f, x, y);
    if (!solid) return;
    const s = solids.create(x * TS + 16, y * TS + 16, 'tiles', f).setVisible(false);
    if (type === 'grass') sinkGrass(s);
    s.setData('type', 'ground'); s.setData('tx', x); s.setData('ty', y);
    blocks[x + ',' + y] = s;
  });
  // cubos de la cumbre (cajas con premio, como las del llano)
  L.hill.boxes.forEach(([x, y, item]) => {
    const s = solids.create(x * TS + 16, y * TS + 16, 'tiles', TF.crate);
    s.setData('type', 'power'); s.setData('tx', x); s.setData('ty', y);
    blocks[x + ',' + y] = s; L.boxItems[x + ',' + y] = item;
  });
  // reja de piedra que cierra la subida durante la pelea con los jefes (Play.openGate la rompe)
  const gate = [], G = L.arena.gate;
  for (let y = G.y0; y <= G.y1; y++) {
    const s = solids.create(G.x * TS + 16, y * TS + 16, 'tiles', y === G.y0 ? TF.ptop : TF.pmid).setDepth(1);
    s.setData('type', 'bwall'); s.setData('tx', G.x); s.setData('ty', y);
    blocks[G.x + ',' + y] = s; gate.push(s);
  }
  // bordes de acantilado en los pozos
  L.gaps.forEach(([a, b]) => {
    const hide = xs => xs.forEach(x => [15, 16].forEach(y => { blocks[x + ',' + y]?.setVisible(false); fixed.remove(x, y); }));
    if (!L.g[14][a - 1] && !L.g[14][a - 2]) { hide([a - 2, a - 1]); scene.add.image((a - 2) * TS, GROUND_Y - 3, 'edgeEnd').setOrigin(0, 0).setDepth(2); }
    if (!L.g[14][b] && !L.g[14][b + 1]) { hide([b, b + 1]); scene.add.image(b * TS, GROUND_Y - 3, 'edgeStart').setOrigin(0, 0).setDepth(2); }
  });
  return { solids, blocks, gate };
}

// Las primeras filas del bloque de pasto son briznas sueltas: el pasto lleno empieza unos 3 px más abajo.
// La superficie de choque se baja a ese punto para que personajes y objetos no parezcan flotar.
const GRASS_SINK = 3;
function sinkGrass(s) {
  // (en cuerpos estáticos no llamar a updateFromGameObject: vuelve al tamaño del sprite e ignora el offset)
  s.body.setSize(TS, TS - GRASS_SINK, false); s.body.setOffset(0, GRASS_SINK);
}

function tileFrame(g, t, x, y) {
  if (t === 'ground') return (y > 0 && g[y - 1][x] === 'ground') ? TF.dirt[x % 2] : TF.grass[(x * 7 + 3) % 4];
  if (t === 'coin' || t === 'power') return TF.crate;
  if (t === 'brick') return TF.brick;
  if (t === 'bwall') return y === 3 ? TF.ptop : y === 14 ? TF.pbase : TF.pmid;
  return TF.stone[(x * 3 + y) % 3];
}

/* ---------- plataformas móviles de la arena ----------
 * Cada plataforma (varias piezas seguidas en L.hill.plats) se mueve sola: elige un punto al azar cerca de su
 * lugar (±4 bloques en horizontal, ±1 en vertical: siempre al alcance de un salto), va hacia él a una
 * velocidad al azar, a veces se detiene un momento y elige otro. Los jefes las atraviesan. */
export class MovingPlatforms {
  constructor(scene, L) {
    this.scene = scene;
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
    const floorRow = Math.round(L.arena.floorY / TS);
    this.minY = (floorRow - 8) * TS; this.maxY = (floorRow - 3) * TS;           // bordes superiores permitidos
    this.minX = (L.arena.x0 + 2) * TS; this.maxX = (L.arena.x1 - 1) * TS;
    // agrupar las piezas seguidas de la misma fila
    const cells = [...L.hill.plats].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    this.sets = [];
    for (const [x, y] of cells) {
      const last = this.sets[this.sets.length - 1];
      if (last && last.row === y && last.x1 === x - 1) last.x1 = x; else this.sets.push({ row: y, x0: x, x1: x });
    }
    this.sets.forEach(set => {
      set.tiles = [];
      for (let x = set.x0; x <= set.x1; x++) {
        const f = x === set.x0 ? 0 : x === set.x1 ? 3 : (x % 2 ? 1 : 2);
        const t = this.group.create(x * TS + 16, set.row * TS + 20, 'plat', f);
        // la fila de arriba de la plataforma es semitransparente: la superficie empieza 1 px más abajo
        t.body.setSize(32, 31, false).setOffset(0, 1); t.setData('type', 'plat');
        set.tiles.push(t);
      }
      set.homeX = set.x0 * TS; set.homeY = set.row * TS; set.w = (set.x1 - set.x0 + 1) * TS;
      set.x = set.homeX; set.y = set.homeY; set.vx = 0; set.vy = 0; set.wait = 0;
      this.pickTarget(set);
    });
  }

  pickTarget(set) {
    const R = Phaser.Math.Between;
    set.tx = Phaser.Math.Clamp(set.homeX + R(-4, 4) * TS, this.minX, this.maxX - set.w);
    set.ty = Phaser.Math.Clamp(set.homeY + R(-1, 1) * TS, this.minY, this.maxY);
    set.speed = R(45, 95);
  }

  update(time, dt) {
    this.sets.forEach(set => {
      if (time < set.wait) { set.vx = set.vy = 0; }
      else {
        const dx = set.tx - set.x, dy = set.ty - set.y, d = Math.hypot(dx, dy);
        if (d < 3) {
          set.vx = set.vy = 0; this.pickTarget(set);
          if (Math.random() < .5) set.wait = time + Phaser.Math.Between(300, 1200);  // a veces se detiene
        } else { set.vx = dx / d * set.speed; set.vy = dy / d * set.speed; }
      }
      set.x += set.vx * dt; set.y += set.vy * dt;
      set.tiles.forEach((t, i) => { t.body.reset(set.x + i * TS + 16, set.y + 20); t.body.velocity.set(set.vx, set.vy); });
    });
  }

  // si el cuerpo está parado sobre una plataforma, devuelve su velocidad (para llevarlo con ella)
  rideVelocity(body) {
    for (const set of this.sets) {
      if (Math.abs(body.bottom - set.y) > 6) continue;
      if (body.right > set.x + 2 && body.left < set.x + set.w - 2) return { vx: set.vx, vy: set.vy };
    }
    return null;
  }
}

// monedas sueltas que giran
export function buildCoins(scene, L) {  // las filas pueden ser negativas (monedas sobre el cerro)
  const group = scene.physics.add.staticGroup();
  L.coins.forEach(([x, y]) => group.create(x * TS + 16, y * TS + 16, 'coinT'));
  scene.tweens.add({ targets: group.getChildren(), scaleX: .25, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  return group;
}

// galletas sueltas que laten
export function buildGalletas(scene, L, frame) {
  const group = scene.physics.add.staticGroup();
  L.galletas.forEach(([x, y]) => group.create(x * TS + 16, y * TS + 16, 'items', frame).setSize(22, 18));
  scene.tweens.add({ targets: group.getChildren(), scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  return group;
}

