/* ---------- nivel 1 ---------- */
const HILL_X = 152;  // columna donde empieza el cerro
export const LW = 442, LH = 17;  // termina en el borde de la cumbre (sin pared: el cielo queda abierto para despegar)
// el cerro sube por encima de la fila 0 (filas negativas): la cámara también sube
export const TOP = -2450;  // borde superior del mundo (px)

export function buildLevel() {
  const g = Array.from({ length: LH }, () => Array(LW).fill(null));
  const gaps = [[58, 61], [90, 92], [127, 134]];
  for (let x = 0; x < HILL_X; x++) {  // desde HILL_X el suelo lo arma el cerro
    if (gaps.some(([a, b]) => x >= a && x < b)) continue;
    g[15][x] = 'ground'; g[16][x] = 'ground';
  }
  const put = (x, y, t) => { g[y][x] = t; };
  // caja con ítem (ver ITEMS en items.js)
  const boxItems = {};
  const box = (x, y, item) => { put(x, y, 'power'); boxItems[x + ',' + y] = item; };
  const pillar = (x, h) => { for (let i = 0; i < h; i++) { put(x, 14 - i, 'stone'); put(x + 1, 14 - i, 'stone'); } };
  const stairs = (x0, n, up) => {
    for (let i = 0; i < n; i++) { const h = up ? i + 1 : n - i; for (let j = 0; j < h; j++) put(x0 + i, 14 - j, 'stone'); }
  };

  put(14, 11, 'coin');
  [18, 20, 22].forEach(x => put(x, 11, 'brick')); box(19, 11, 'amuleto'); put(21, 11, 'coin'); box(20, 7, 'casino');
  pillar(30, 2); pillar(40, 3); pillar(48, 4);
  box(38, 11, 'gasOro');  // balón de gas dorado: después del 3.er enemigo (columna 36)
  [63, 64, 66].forEach(x => put(x, 11, 'brick')); box(65, 11, 'quipu');
  for (let x = 68; x <= 77; x++) put(x, 8, 'brick');
  box(72, 8, 'baston');
  box(80, 11, 'quipu'); box(83, 11, 'gas'); put(84, 11, 'brick'); box(85, 11, 'brujula');
  stairs(86, 4, true); stairs(92, 4, false);
  for (let x = 107; x <= 112; x++) put(x, 11, 'brick');
  box(109, 11, 'casino'); box(111, 11, 'plasma');
  pillar(120, 3);
  for (let x = 129; x <= 131; x++) put(x, 13, 'plat');
  box(146, 11, 'taunt'); put(147, 11, 'brick'); box(148, 11, 'amuleto');

  /* ---------- el cerro: 5 niveles planos y anchos (con enemigos), unidos por escaleras de 10 escalones ----------
   * surface[x] = fila de la superficie en la columna x (15 = suelo; negativas = más arriba que la pantalla inicial).
   * Cada escalón es de 2 bloques de ancho y 1 de alto. Nivel 5 (la cima) es la arena de los dos jefes. */
  const surface = {};
  const level = (a, b, row) => { for (let x = a; x <= b; x++) surface[x] = row; };
  const STEPS = 10;
  const stairsUp = (x0, fromRow, n = STEPS) => { for (let i = 0; i < n; i++) level(x0 + i * 2, x0 + i * 2 + 1, fromRow - 1 - i); };
  // 10 escalones de 1 bloque (2 de ancho) y el nivel un bloque más arriba del último: cada nivel sube 11 filas
  stairsUp(152, 15); level(172, 191, 4);       // escalera + nivel 1
  stairsUp(192, 4); level(212, 231, -7);       // escalera + nivel 2
  stairsUp(232, -7); level(252, 271, -18);     // escalera + nivel 3
  stairsUp(272, -18); level(292, 311, -29);    // escalera + nivel 4
  stairsUp(312, -29); level(332, 361, -40);    // escalera + nivel 5: la cima (arena de los jefes)
  // después de vencer a El Sacrificador: 20 escalones más hasta la cumbre con los 4 cubos
  // (una reja de piedra, arena.gate, cierra la subida durante la pelea)
  stairsUp(362, -40, 20); level(402, 441, -61);  // escalera + cumbre (llega al borde del mundo, sin pared)
  const cells = [];
  for (const k in surface) {
    const x = +k, h = surface[x];
    const nb = [surface[x - 1] ?? 15, surface[x + 1] ?? h];
    const face = Math.min(16, Math.max(...nb) - 1);  // filas con la cara al aire (sólidas); más abajo es relleno
    for (let y = h; y <= 16; y++) {
      const type = y === h ? 'grass' : y <= face ? 'stone' : 'dirt';
      cells.push([x, y, type, y <= Math.max(h, face)]);
    }
  }
  // plataformas de la arena, a alcance de un salto normal: 4 bloques sobre el piso y 3 más arriba
  // (los jefes las atraviesan: son solo para Xoxur)
  const plats = [];
  const platRow = (a, b, y) => { for (let x = a; x <= b; x++) plats.push([x, y]); };
  platRow(336, 338, -44); platRow(345, 347, -44); platRow(355, 357, -44); platRow(340, 342, -47); platRow(350, 352, -47);
  // los 4 cubos de la cumbre (4 filas sobre el piso, como las cajas del llano): Casino, balón de gas dorado,
  // el báculo de Inka Locu (se lanza con V) y las alas (llevan al nivel 2)
  const boxes = [[408, -65, 'casino'], [414, -65, 'gasOro'], [420, -65, 'baculo'], [426, -65, 'alas']];
  const hill = { x0: HILL_X, surface, cells, plats, boxes };

  const arena = { x0: 332, x1: 361, floorY: -40 * 32, bosses: ['inka', 'jaguar'],
    gate: { x: 362, y0: -62, y1: -42 } };  // reja de la subida: se rompe al vencer al último jefe
  const coins = [];
  const row = (a, b, y) => { for (let x = a; x <= b; x++) coins.push([x, y]); };
  row(25, 28, 12); row(51, 55, 9); row(69, 76, 7); row(97, 100, 12); row(115, 119, 12); row(129, 131, 11); row(137, 139, 11);
  row(178, 183, 1); row(218, 223, -10); row(258, 263, -21); row(298, 303, -32);  // monedas sobre los niveles del cerro

  return {
    g, gaps, arena, boxItems, hill,
    time: 500,          // segundos para terminar el nivel
    startX: 3,          // columna de inicio
    checkpointX: 150,   // columna del punto de control
    // cielo: textura y degradado de fondo (arriba, abajo del cielo, más abajo) en tonos del mismo cielo
    // skyScale: el cielo radiactivo es más bajo que el celeste; a 2,4 llega por detrás de los picos y no se ve el corte
    sky: 'skyRad', skyScale: 2.4, skyColors: [0x636d34, 0x78823d, 0x78823d, 0xa4ad73],
    city: [],           // tramos con fondo de calle colonial (el nivel 1 es solo cordillera)
    // monedas sueltas (ninguna dentro de la arena del jefe)
    coins,
    // galletas sueltas (500 puntos): en lugares difíciles
    galletas: [[31, 11], [41, 10], [49, 9], [59, 10], [91, 9], [121, 10], [130, 9], [197, 0], [277, -22]],
    enemies: [[24, 'cuy'], [34, 'cuy'], [36, 'cuy'], [45, 'llama'], [54, 'imata'], [66, 'cheese'], [71, 'cuy'], [75, 'llama'],
      [98, 'imata'], [102, 'cuy'], [105, 'llama'], [113, 'cheese'], [124, 'llama'], [136, 'imata'], [140, 'cuy'], [144, 'llama'], [149, 'cheese'],
      // cerro: [columna, tipo, fila de la superficie] — cada nivel plano tiene sus enemigos
      [176, 'cuy', 4], [182, 'llama', 4], [188, 'cheese', 4],
      [216, 'cheese', -7], [222, 'imata', -7], [228, 'cuy', -7],
      [256, 'llama', -18], [262, 'cheese', -18], [268, 'cuy', -18],
      [296, 'imata', -29], [302, 'llama', -29], [308, 'cheese', -29]],
    // vegetación y ruinas del frente: [columna, textura]
    decor: [[17, 'fg0'], [23, 'fg3'], [33, 'fg1'], [44, 'fg0'], [52.5, 'fg4'], [63, 'fg2'], [69, 'fg3'], [84, 'fg0'], [99, 'fg1'],
      [112, 'fg3'], [125, 'fg2'], [138, 'fg3'], [141, 'fg1'], [150, 'fg0']],
    // decoración: [columna, textura, escala, profundidad] (sin casas ni pueblo)
    props: [],
    // columnas decorativas al fondo de la arena (en la cima)
    arenaPillars: [337, 343, 349, 355]
  };
}
