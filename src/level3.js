/* ---------- nivel 3: la mina de Muqui Z (vista desde arriba, como Pokémon Red) ----------
 * Se camina casilla por casilla por una cueva oscura; tocar a un enemigo abre una batalla por turnos (Batalla.js).
 * Ideas tomadas de «Depths of Elora»: cada partida los pisos cambian, piedras de runa (elegir 1 de 3 mejoras que
 * suben de nivel I a III), campanadas que traen más enemigos si te demoras, vasijas y cofres con ítems.
 * 3 pisos; al bajar del último se entra a la guarida de Muqui Z: esa pelea es en tiempo real (Guarida.js),
 * como en Depths of Elora, y lo ayudan todos los enemigos del nivel. */

export const T3 = 48;            // tamaño de la casilla (px)
export const MAP_W = 40, MAP_H = 30;
export const FLOORS = 3;         // pisos antes del del jefe
export const BELL_STEPS = 80;    // pasos por piso antes de cada campanada

// enemigos: hoja, cuadros (mapa y batalla), vida, ataques. Los ataques: dmg, veneno (por turno, 3 turnos),
// ciego (baja tu puntería 2 turnos), cura (a sí mismo), carga (el turno siguiente lanza `then`)
export const FOES = {
  sapazo: {
    name: 'Sapazo', sheet: 'sapazo', hp: 38, coins: 4, score: 300,
    map: { idle: [0, 5], walk: [6, 11], scale: .75 }, battle: { idle: [0, 5], h: 150 }, hit: 32, ko: 40,
    moves: [{ name: 'Lengua', dmg: 8, frame: 22 }, { name: 'Vómito', dmg: 5, poison: 3, frame: 26 }, { name: 'Salto', dmg: 11, frame: 28 }]
  },
  tulixta: {
    name: 'Tulixta', sheet: 'tulixta', hp: 42, coins: 5, score: 350,
    map: { idle: [0, 5], walk: [6, 11], scale: .8 }, battle: { idle: [0, 5], h: 160 }, hit: 34, ko: 40,
    moves: [{ name: 'Veneno', dmg: 6, poison: 3, frame: 26 }, { name: 'Chorro de veneno', dmg: 10, frame: 30 }, { name: 'Coletazo', dmg: 8, frame: 14 }]
  },
  jumpe: {
    name: 'El Jumpe', sheet: 'jumpe', hp: 48, coins: 6, score: 400,
    map: { idle: [0, 5], walk: [6, 11], scale: .75 }, battle: { idle: [0, 5], h: 160 }, hit: 34, ko: 40,
    moves: [{ name: 'Puño lanzado', dmg: 14, frame: 30 }, { name: 'Humo verde', dmg: 5, blind: true, frame: 25 }, { name: 'Puño de humo', dmg: 10, frame: 20 }]
  },
  aracura: {
    name: 'Aracura', sheet: 'aracura', hp: 34, coins: 4, score: 350,
    map: { idle: [0, 5], walk: [6, 11], scale: .9 }, battle: { idle: [0, 5], h: 120 }, hit: null, ko: null,
    // en el mapa revive a los enemigos derrotados; en batalla se cura a sí misma
    moves: [{ name: 'Veneno', dmg: 6, poison: 2, frame: 13 }, { name: 'Chorro de veneno', dmg: 9, frame: 19 }, { name: 'Curación', heal: 14, frame: 0 }]
  },
  carbunco: {
    name: 'El Carbunco', sheet: 'carbunco', hp: 90, coins: 15, score: 1500, elite: true,
    map: { idle: [0, 5], walk: [6, 11], scale: .45 }, battle: { idle: [0, 5], h: 230, flip: true }, hit: 28, ko: 34,
    moves: [{ name: 'Lanzazo', dmg: 14, frame: 24 }, { name: 'Carga la gema', charge: true, frame: 25, then: { name: 'Rayo de la gema', dmg: 26, frame: 26 } },
      { name: 'Ráfaga de rayos', dmg: 18, frame: 32 }]
  },
  // Muqui Z: su pelea es en tiempo real (Guarida.js); aquí solo su hoja y animaciones
  muqui: { name: 'Muqui Z', sheet: 'minero', map: { idle: [0, 5], walk: [6, 11] } }
};
// qué enemigos salen en cada piso (el Carbunco es un élite: uno en el piso 3)
export const FLOOR_FOES = { 1: ['sapazo', 'sapazo', 'tulixta', 'aracura'], 2: ['sapazo', 'tulixta', 'jumpe', 'aracura'], 3: ['tulixta', 'jumpe', 'jumpe', 'aracura'] };

// ataques de Inkaxur en batalla (cd = turnos de enfriamiento; needs = lo que hace falta tener)
export const MOVES = [
  { key: 'galleta', name: 'Galleta de menta', dmg: [10, 14], desc: 'Sin límite' },
  { key: 'quipus', name: 'Látigo de quipus', dmg: [14, 18], cd: 3, stun: .35, desc: '35 % de aturdir · espera 3' },
  { key: 'baculo', name: 'Báculo de Inka Locu', dmg: [22, 28], cd: 2, needs: 'cetro', desc: 'Espera 2 turnos' },
  { key: 'plasma', name: 'Esfera de plasma', dmg: [40, 48], needs: 'plasma', desc: 'Gasta una esfera' }
];

// runas (piedras de runa del mapa): se elige 1 de 3; elegir otra vez la misma la sube de nivel (máx. III)
export const RUNES = {
  galleta: { name: 'Galleta afilada', desc: n => `La galleta hace +${3 * n} de daño` },
  llama: { name: 'Piel de llama', desc: n => `+${15 * n} de energía máxima` },
  condor: { name: 'Ojo de cóndor', desc: n => `${8 * n} % más de golpe crítico` },
  quipu: { name: 'Quipu vital', desc: n => `Recuperas ${5 * n} de energía al ganar una batalla` },
  baculo: { name: 'Báculo solar', desc: n => `El báculo hace +${6 * n} de daño` },
  pies: { name: 'Pies ligeros', desc: n => `+${15 * n} % de huir y los enemigos te ven menos` },
  veneno: { name: 'Veneno inverso', desc: n => `${15 * n} % de envenenar al enemigo con cada golpe` }
};

// contenido de vasijas y cofres
export const LOOT = { vasija: ['coins', 'coins', 'quipu', 'plasma', 'casino'], cofre: ['casino', 'plasma', 'quipu', 'rune'] };

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- generador de pisos ----------
 * Cuartos al azar unidos por pasillos de 2 casillas. g[y][x]: 1 = pared, 0 = piso.
 * Devuelve el mapa, el inicio, la escalera (en el cuarto más lejano), la piedra de runa, cofres, vasijas,
 * decoración y enemigos. */
export function buildFloor(floor) {
  const g = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(1));
  const rooms = [];
  for (let tries = 0; tries < 200 && rooms.length < 8; tries++) {
    const w = rnd(5, 9), h = rnd(4, 7), x = rnd(1, MAP_W - w - 2), y = rnd(1, MAP_H - h - 2);
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  rooms.forEach(r => { for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) g[yy][xx] = 0; });
  // pasillos: cada cuarto con el siguiente (ordenados de izquierda a derecha) y uno extra para hacer vueltas
  rooms.sort((a, b) => a.cx - b.cx);
  const dig = (x, y) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (g[y + dy]?.[x + dx] !== undefined && y + dy < MAP_H - 1 && x + dx < MAP_W - 1) g[y + dy][x + dx] = 0; };
  const corridor = (a, b) => {
    const horizFirst = Math.random() < .5;
    let x = a.cx, y = a.cy;
    const stepX = () => { while (x !== b.cx) { dig(x, y); x += Math.sign(b.cx - x); } };
    const stepY = () => { while (y !== b.cy) { dig(x, y); y += Math.sign(b.cy - y); } };
    if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    dig(x, y);
  };
  for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i]);
  if (rooms.length > 3) corridor(rooms[0], rooms[rnd(2, rooms.length - 1)]);

  const start = { x: rooms[0].cx, y: rooms[0].cy };
  // escalera en la casilla de piso más lejana (por camino) del inicio
  const dist = bfs(g, start);
  let far = start, fd = 0;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (dist[y][x] > fd) { fd = dist[y][x]; far = { x, y }; }
  const used = new Set([key(start), key(far)]);
  const freeIn = r => {
    for (let t = 0; t < 40; t++) {
      const p = { x: rnd(r.x, r.x + r.w - 1), y: rnd(r.y, r.y + r.h - 1) };
      if (!g[p.y][p.x] && !used.has(key(p)) && Math.abs(p.x - start.x) + Math.abs(p.y - start.y) > 3) { used.add(key(p)); return p; }
    }
    return null;
  };
  const others = rooms.slice(1);
  const rune = freeIn(pick(others));
  const chests = [freeIn(pick(others)), freeIn(pick(others))].filter(Boolean);
  // vasijas y decoración: pegadas a una pared
  const wallSide = [];
  for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
    if (!g[y][x] && (g[y - 1][x] || g[y][x - 1] || g[y][x + 1]) && !used.has(key({ x, y }))) wallSide.push({ x, y });
  }
  const take = () => { const i = Math.floor(Math.random() * wallSide.length); const p = wallSide.splice(i, 1)[0]; if (p) used.add(key(p)); return p; };
  const vasijas = Array.from({ length: 5 }, take).filter(Boolean);
  const decor = Array.from({ length: 12 }, () => ({ ...take(), kind: pick(['huesos', 'cristal', 'raices', 'farol', 'huesos']) })).filter(d => d.x !== undefined);
  const foes = FLOOR_FOES[floor].concat(floor === 3 ? ['carbunco'] : []).map(kind => ({ kind, ...(freeIn(pick(others)) || freeIn(pick(others)) || far) }));
  return { floor, g, start, stairs: far, rune, chests, vasijas, decor, foes };
}

export const key = p => p.x + ',' + p.y;

// distancia por camino (4 direcciones) desde `from` a cada casilla de piso
export function bfs(g, from) {
  const d = g.map(r => r.map(() => -1));
  const q = [from]; d[from.y][from.x] = 0;
  while (q.length) {
    const p = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy;
      if (g[y]?.[x] === 0 && d[y][x] < 0) { d[y][x] = d[p.y][p.x] + 1; q.push({ x, y }); }
    }
  }
  return d;
}
