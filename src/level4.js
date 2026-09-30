/* ---------- nivel 4: el Cusco (vista desde arriba, como Zelda) ----------
 * Primer vistazo: de la entrada del Cusco al Qorikancha (el cetro de oro con punta de choclo) y a Sacsayhuamán (la
 * Chakana de oro). El recorrido sigue las calles reales: Arco de Santa Clara → Plaza San Francisco → calle Marqués →
 * Plaza de Armas → calle Loreto (Intik'ijllu, entre los muros incas del Acllawasi y el Amarucancha) → Intipampa →
 * Qorikancha; y Plaza de Armas → calle Suecia → Huaynapata → calle Resbalosa (escalinata) → San Cristóbal → sendero
 * del cerro → Sacsayhuamán (tres murallas en zigzag, torreones, explanada de Chuquipampa, Rodadero y Trono del Inca).
 * Mecánicas de Ocarina of Time: la quena (canciones con las flechas), templos con puzles, viaje en el tiempo (la
 * piedra de los doce ángulos: el Cusco de hoy ↔ el Cusco inca) y combate con fijación de enemigo (Shift).
 *
 * Mapas: una fila de texto por fila de casillas de 48 px. Cada carácter es una casilla (CELLS); algunas cambian según
 * la época ('hoy' o 'inca'). Las cosas (carteles, personajes, cofres, bloques, puertas, enemigos, decorados, salidas)
 * van en `things`, en coordenadas de casilla; `era` limita una cosa a una época. */

export const T4 = 48;

// baldosas de public/assets/nivel4/tiles.png: 0–15 Cusco de hoy, 16–31 Cusco inca, 32–47 templos
// muros: [arriba, frente]; se dibuja el frente cuando la casilla de abajo no es del mismo muro
export const CELLS = {
  '.': { hoy: 0, inca: 16 },                    // calle empedrada
  ',': { hoy: 1, inca: 31 },                    // plaza (losas hoy; arena de la Huacaypata en tiempos incas)
  'v': { hoy: 2, inca: 18 },                    // pasto
  ':': { hoy: 3, inca: 17 },                    // sendero de tierra
  '=': { hoy: 13, inca: 29 },                   // escalinata
  'x': { hoy: 12, inca: 18, toxic: true },      // charco radiactivo (solo hoy hace daño)
  'm': { hoy: 2, inca: 19 },                    // maizal (en tiempos incas)
  'f': { hoy: 11, inca: 27, solid: true },      // jardinera con flores / kantutas
  'r': { hoy: 15, inca: 26, solid: true },      // escombros / andén
  '~': { hoy: 9, inca: 25, solid: true },       // agua
  'X': { hoy: 0, inca: 16, solid: true },       // bajo un decorado grande (se ve el suelo, no se pasa)
  'A': { hoy: 0, inca: 16, arch: true },        // bajo el Arco de Santa Clara (se pasa por debajo; solo existe hoy)
  '#': { wall: { hoy: [4, 5], inca: [4, 21] } },             // muro inca
  'n': { wall: { hoy: [4, 22], inca: [4, 22] } },            // muro inca con nicho trapezoidal
  'C': { house: true },                                       // casa colonial (hoy) / casa inca de techo de ichu
  'D': { house: true, door: true },                           // puerta de casa
  'S': { wall: { hoy: [7, 6], inca: [33, 24] } },             // convento de Santo Domingo / muros de oro del Qorikancha
  'K': { hoy: 0, inca: null, wallInca: [4, 21], solid: true },  // bajo la catedral (hoy) / palacio inca (antes)
  'R': { hoy: 41, inca: 39, solid: 'hoy' },     // piedra gigante caída (hoy) / explanada libre (en tiempos incas)
  'Y': { hoy: 39, inca: 41, solid: 'inca' },    // piedras de la obra en construcción (solo en tiempos incas)
  // templos
  'W': { wall: { hoy: [33, 34], inca: [33, 34] } },           // muro de oro (Templo del Sol)
  'w': { wall: { hoy: [36, 37], inca: [36, 37] } },           // muro de piedra oscura con nicho y antorcha
  'Z': { wall: { hoy: [41, 40], inca: [41, 40] } },           // muralla megalítica de Sacsayhuamán
  'k': { hoy: 44, inca: 44 },                   // piso de piedra con incrustaciones de oro
  'd': { hoy: 35, inca: 35 },                   // piso de piedra oscura
  'u': { hoy: 32, inca: 32 },                   // piso de oro con el sol
  'g': { hoy: 28, inca: 28 },                   // piso de oro
  'p': { hoy: 47, inca: 47 },                   // alfombra con tocapus
  'U': { hoy: 38, inca: 38 },                   // piso del Uku Pacha (grietas rojas)
  'l': { hoy: 46, inca: 46, solid: true },      // pozo de fuego
  'a': { hoy: 45, inca: 45, solid: true },      // pozo de agua oscura
  'E': { hoy: 39, inca: 39 },                   // pasto de la explanada
  's': { hoy: 42, inca: 42 },                   // escalones de piedra
  'b': { hoy: 43, inca: 43 }                    // tierra con huesos
};

/* ---------- canciones de la quena ----------
 * Q abre la quena; las flechas tocan las notas. Una canción se reconoce al tocar sus 6 notas seguidas. */
export const NOTES = { up: { f: 784, s: '▲' }, left: { f: 659, s: '◀' }, right: { f: 587, s: '▶' }, down: { f: 523, s: '▼' } };
export const SONGS = {
  tiempo: { name: 'Canción del Tiempo', notes: ['right', 'up', 'down', 'right', 'up', 'down'],
    desc: 'Junto a una piedra del tiempo, viaja entre el Cusco de hoy y el Cusco inca.' },
  sol: { name: 'Canción del Inti', notes: ['left', 'right', 'up', 'left', 'right', 'up'],
    desc: 'Llama la luz del Sol: enciende sus rayos, abre puertas del Inti y aturde a las criaturas del Uku Pacha.' }
};

/* ---------- enemigos ----------
 * sheet: hoja; fr: cuadros por animación; hp, speed, touch (daño al tocar); shot: ataque a distancia; shield: se cubre
 * de frente (hay que pegarle de costado o por detrás, o justo después de que ataca). Todos miran a la derecha. */
export const FOES4 = {
  // zombis de las calles (los del nivel 1, con hojas nuevas que tienen ataques): la llama muerde y escupe; la imata
  // araña y revolea su bolsa
  llama: { name: 'Llama zombi', sheet: 'llama4', scale: 1, fr: { idle: [0, 3], walk: [4, 9], atk: [10, 14], spit: [15, 19], hit: [20, 21], ko: [22, 24] },
    hp: 20, speed: 80, touch: 8, aggro: 260, melee: { range: 62, dmg: 10 }, spit: { every: 3600, dmg: 8 } },
  imata: { name: 'Imata', sheet: 'imata4', scale: 1, fr: { idle: [0, 3], walk: [4, 9], atk: [10, 14], bag: [15, 19], hit: [20, 21], ko: [22, 25] },
    hp: 24, speed: 92, touch: 8, aggro: 270, melee: { range: 66, dmg: 12 } },
  // fantasma inca: atraviesa muros, se lanza sobre Inkaxur y explota al tocarlo (rodar lo esquiva); un golpe lo deshace
  fantasma: { name: 'Fantasma inca', sheet: 'fantasma4', scale: 1, fr: { idle: [0, 3], rush: [4, 7], boom: [8, 12] },
    hp: 8, speed: 62, rush: 150, touch: 0, aggro: 9999, ghost: true, boom: { dmg: 16, r: 74 } },
  mallqui: { name: 'Mallqui', sheet: 'mallqui4', scale: 1, fr: { idle: [0, 3], walk: [4, 9], atk: [10, 14], hit: [15, 16], ko: [17, 20], orb: [21, 22] },
    hp: 30, speed: 62, touch: 8, aggro: 380, keep: 170, shot: { every: 2600, dmg: 10, speed: 250 }, float: true },
  guerrero: { name: 'Guerrero inca zombi', sheet: 'guerrero4', scale: 1, fr: { idle: [0, 2], walk: [3, 8], atk: [9, 13], block: [14, 15], hit: [16, 17], ko: [18, 21] },
    hp: 45, speed: 78, touch: 10, aggro: 320, shield: true, thrust: { range: 92, dmg: 15 }, sling: { every: 3800, dmg: 8, speed: 330 } }
};

// jefes: Supay (Qorikancha) y Pachacútec zombi (Sacsayhuamán)
export const BOSSES4 = {
  supay: { name: 'Supay', sheet: 'supay4', hp: 520, scale: 1, body: [70, 46],
    fr: { idle: [0, 3], walk: [4, 7], fire: [8, 12], summon: [13, 16], hit: [17, 18], ko: [19, 21], ball: [22, 23] },
    portrait: { url: 'assets/nivel4/supay.png', sheet: [1568, 608], fig: [8, 4, 180, 146] } },
  pachacutec: { name: 'Pachacútec zombi', sheet: 'pachacutec4', hp: 700, scale: .82, body: [80, 46],
    fr: { idle: [0, 3], walk: [4, 10], swing: [11, 16], slam: [17, 21], hit: [22, 23], ko: [24, 27] },
    portrait: { url: 'assets/nivel4/pachacutec.png', sheet: [2256, 856], fig: [40, 10, 200, 200] } }
};

/* ---------- áreas ---------- */
const LORETO_TXT = 'Calle Loreto: los incas la llamaban Intik\'ijllu, «el callejón del Sol». A un lado, el muro del Acllawasi, la casa de las escogidas; al otro, el Amarucancha, el palacio de Huayna Cápac. Lleva al Qorikancha.';

export const AREAS = {
  // Arco de Santa Clara y Plaza San Francisco: aquí cae Inkaxur
  santaclara: {
    name: 'Arco de Santa Clara', map: [
      'CCCCCCCCCCCCCCCCCCCCCC....CCCCCC',
      'CCCXXXXCCCCCCCCCCCCCCC....CCCCCC',
      'CCCXXXXCCCCCDCCCCCCCCC....CCCDCC',
      'CC............................CC',
      'CC............................CC',
      'CC..,,,,,,,,,,,,,,,,,,,,,,,,..CC',
      'CC..,vvvvfvvvvv,,vvvvfvvvvv,..CC',
      'CC..,vvvvvvvvvv,,vvvvvvvvvv,..CC',
      'rr..,vvvvfvvvvv,,vvvvfvvvvv,..CC',
      'rr..,,,,,,,,,,,,,,,,,,,,,,,,..CC',
      'CC..,vvvvfvvvvv,,vvvvfvvvvv,..CC',
      'CC..,vvvvvvvvvv,,vvvvvvvvvv,..CC',
      'CC..,vvvvfvvvvv,,vvvvfvvvvv,..CC',
      'CC..,,,,,,,,,,,,,,,,,,,,,,,,..CC',
      'CC............................CC',
      'CC.......x..............x.....CC',
      'CCCCCCCCCCCC........CCCCCCCCCCCC',
      'CCCCCCCCCCCC........CCCCCCCCCCCC',
      'CCCCCCCDCCCC........CCCCDCCCCCCC',
      '############AAAAAAAA############',
      '############........############',
      'rrrrrrrrrrrr........rrrrrrrrrrrr',
      'rrrrrrrrrrrr..r..r..rrrrrrrrrrrr',
      'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr'
    ],
    start: [16, 17],
    things: [
      { t: 'decor', k: 'catedral', x: 5, y: 3, scale: .42, era: 'hoy', label: 'Iglesia de San Francisco' },
      { t: 'decor', k: 'molle', x: 10, y: 8, scale: .7 }, { t: 'decor', k: 'molle', x: 22, y: 12, scale: .7 },
      { t: 'decor', k: 'eucalipto', x: 21, y: 7, scale: .6 },
      { t: 'decor', k: 'carreta', x: 27, y: 4.2, scale: .8, era: 'hoy', solid: [27, 4, 2, 1] },
      { t: 'decor', k: 'farol', x: 3, y: 4.5, scale: .6, era: 'hoy' }, { t: 'decor', k: 'farol', x: 28, y: 15.5, scale: .6, era: 'hoy' },
      { t: 'sign', x: 18, y: 20, era: 'hoy', text: 'Arco de Santa Clara (1835). Por aquí entraban al Cusco los viajeros que venían de Lima. La calle Marqués sube a la Plaza de Armas.' },
      { t: 'sign', x: 16, y: 21, text: 'Más allá solo hay escombros. No hay vuelta atrás: el Cusco te necesita.' },
      { t: 'sign', x: 3, y: 10, text: 'Calle Santa Clara → Mercado de San Pedro. Bloqueada por escombros.' },
      { t: 'sign', x: 25, y: 3, text: 'Calle Marqués ↑ Plaza de Armas' },
      { t: 'npc', k: 'runa', x: 13, y: 9, era: 'inca', text: ['Este es el camino al Contisuyo, una de las cuatro regiones del Tawantinsuyo.', 'Todos los caminos del imperio salen de la Huacaypata, la gran plaza del Cusco.'] },
      { t: 'foe', k: 'llama', x: 10, y: 14, era: 'hoy' }, { t: 'foe', k: 'imata', x: 22, y: 6, era: 'hoy' }, { t: 'foe', k: 'llama', x: 7, y: 9, era: 'hoy' },
      { t: 'foe', k: 'imata', x: 26, y: 12, era: 'hoy' }, { t: 'foe', k: 'fantasma', x: 16, y: 7, era: 'hoy' },
      { t: 'exit', x: 22, y: 0, w: 4, h: 1, to: 'plaza', at: [9, 27] }
    ]
  },

  // Plaza de Armas (la Huacaypata de los incas)
  plaza: {
    name: 'Plaza de Armas', incaName: 'Huacaypata', map: [
      'CCCCCC...CCCCCCCKKKKKKKKCCCCCCCCCCCCCCCC',
      'CCCCCC...CCCCCCCKKKKKKKKCCCCCCCCCCCCCCCC',
      'CCCDCC...CCCCCCCKKKKKKKKCCCCCCCDCCCCCCCC',
      'CC..............KKKKKKKK.......CCCCCCCCC',
      'CC..............KKKKKKKK........#n#n#n#n',
      'CC..............KKKKKKKK................',
      'CC......................................',
      'CC..,,,,,,,,,,,,,,,,,,,,,,,,,,..#n#n#n#n',
      'CC..,vvvvvvvvv,,,,,,vvvvvvvvv,..CCCCCCCC',
      'CC..,vfvvvvvfv,,,,,,vfvvvvvfv,..CCCCCCCC',
      'CC..,vvvvvvvvv,,,,,,vvvvvvvvv,..CCCCCCDC',
      'CC..,vvvvvvvvv,,,,,,vvvvvvvvv,........rr',
      'CC..,,,,,,,,,,,,,,,,,,,,,,,,,,........rr',
      'CC..,,,,,,,,,,,XXX,,,,,,,,,,,,..KKKKKKKK',
      'CC..,,,,,,,,,,,XXX,,,,,,,,,,,,..KKKKKKKK',
      'CC..,,,,,,,,,,,,,,,,,,,,,,,,,,..KKKKKKKK',
      'CC..,vvvvvvvvv,,,,,,vvvvvvvvv,..KKKKKKKK',
      'CC..,vfvvvvvfv,,,,,,vfvvvvvfv,........rr',
      'CC..,vvvvvvvvv,,,,,,vvvvvvvvv,........rr',
      'CC..,vvvvvvvvv,,,,,,vvvvvvvvv,..CCCCCCCC',
      'CC..,,,,,,,,,,,,,,,,,,,,,,,,,,..CCCCCCCC',
      'CC..............................CCCCDCCC',
      'CC.......x.................x....#n#CCCCC',
      'CCCCCCC....CCCCCCCCCCCCCCCC.....#n#CCCCC',
      'CCCCCCC....CCCCCCCCCCCCCCCC.....#n#CCCCC',
      'CCCCDCC....CCCCCCCDCCCCCCCC.....#n#CCCCC',
      '#######....#################....#n######',
      '#######....#################....########',
      '#######....#################....########'
    ],
    start: [9, 27],
    things: [
      { t: 'decor', k: 'catedral', x: 20, y: 6, scale: .78, era: 'hoy', label: 'Catedral del Cusco' },
      { t: 'decor', k: 'catedral', x: 36, y: 16.9, scale: .52, era: 'hoy', label: 'Iglesia de la Compañía de Jesús' },
      { t: 'decor', k: 'fuente', x: 16.5, y: 15, scale: .62, era: 'hoy' },
      { t: 'decor', k: 'paqcha', x: 16.5, y: 15, scale: .9, era: 'inca' },
      { t: 'decor', k: 'molle', x: 7, y: 10, scale: .6 }, { t: 'decor', k: 'molle', x: 26, y: 18, scale: .6 },
      { t: 'decor', k: 'farol', x: 4, y: 12, scale: .6, era: 'hoy' }, { t: 'decor', k: 'farol', x: 29, y: 5, scale: .6, era: 'hoy' },
      { t: 'decor', k: 'carreta', x: 12, y: 21.2, scale: .8, era: 'hoy', solid: [11, 21, 2, 1] },
      // calle Hatunrumiyoc: el muro del palacio de Inca Roca y la piedra de los doce ángulos (piedra del tiempo)
      { t: 'stone', x: 36, y: 5.2 },
      { t: 'sign', x: 34, y: 6, text: 'Calle Hatunrumiyoc. En el muro del palacio de Inca Roca está la piedra de los doce ángulos: encaja perfecta con todas sus vecinas. Dicen que guarda el tiempo del Cusco.' },
      { t: 'sign', x: 39, y: 5, text: 'Cuesta de San Blas: llena de escombros. No se puede pasar.' },
      { t: 'sign', x: 30, y: 23, text: LORETO_TXT },
      { t: 'sign', x: 5, y: 3, text: 'Calle Suecia ↑ Huaynapata · calle Resbalosa · San Cristóbal · Sacsayhuamán' },
      { t: 'sign', x: 11, y: 22, text: 'Calle Marqués ↓ Plaza San Francisco · Arco de Santa Clara' },
      { t: 'npc', k: 'paqo', x: 13, y: 18, era: 'hoy', id: 'paqo' },
      { t: 'npc', k: 'paqo', x: 18.5, y: 17.5, era: 'inca', id: 'willaq', tint: 0xffe08a },
      { t: 'npc', k: 'nusta', x: 8, y: 12, era: 'inca', text: ['La Huacaypata es el centro del mundo: de aquí salen los caminos a los cuatro suyos.', 'El Qorikancha, la casa del Inti, está bajando por el callejón del Sol, el Intik\'ijllu.'] },
      { t: 'npc', k: 'runa', x: 25, y: 12, era: 'inca', text: ['Arriba, en el cerro, el Inca Pachacútec manda levantar Sacsayhuamán.', 'Dicen que el Cusco tiene forma de puma: Sacsayhuamán es su cabeza.'] },
      { t: 'foe', k: 'llama', x: 8, y: 6, era: 'hoy' }, { t: 'foe', k: 'imata', x: 24, y: 9, era: 'hoy' },
      { t: 'foe', k: 'llama', x: 22, y: 20, era: 'hoy' }, { t: 'foe', k: 'imata', x: 34, y: 11, era: 'hoy' },
      { t: 'foe', k: 'imata', x: 6, y: 20, era: 'hoy' }, { t: 'foe', k: 'llama', x: 28, y: 15, era: 'hoy' },
      { t: 'foe', k: 'fantasma', x: 20, y: 11, era: 'hoy' }, { t: 'foe', k: 'fantasma', x: 12, y: 16, era: 'hoy' },
      { t: 'exit', x: 7, y: 28, w: 4, h: 1, to: 'santaclara', at: [23.5, 1] },
      { t: 'exit', x: 28, y: 28, w: 4, h: 1, to: 'loreto', at: [11.5, 1] },
      { t: 'exit', x: 6, y: 0, w: 3, h: 1, to: 'sancristobal', at: [6, 38] }
    ]
  },

  // Calle Loreto (Intik'ijllu), la plaza Intipampa y el Qorikancha (hoy: el convento de Santo Domingo encima)
  loreto: {
    name: 'Calle Loreto · Intipampa', incaName: 'Intik\'ijllu · Intipampa', map: [
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      '##########....##########',
      'CCCCCC####....####CCCCCC',
      'CCCCDC####....####CDCCCC',
      'CC....................CC',
      'CC.,,,,,,,,,,,,,,,,,,.CC',
      'CC.,,,,,,,,,,,,,,,,,,.CC',
      'CC.,,vvvv,,,,,,vvvv,,.CC',
      'CC.,,vvvv,,,,,,vvvv,,.CC',
      'CC.,,,,,,,,,,,,,,,,,,.CC',
      'CC.,,,,,,,,,,,,,,,,,,.CC',
      'CC....................CC',
      'SSSSSSSSSS....SSSSSSSSSS',
      'SSSSSSSSSSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSSSSSSSSSS',
      '########################'
    ],
    start: [11.5, 1],
    things: [
      // la puerta del templo: hoy la del convento (cerrada); en tiempos incas, el gran portal cubierto de oro
      { t: 'door', k: 'puerta_llave', x: 10, y: 22, w: 4, era: 'hoy', locked: 'convento' },
      { t: 'door', k: 'puerta_sol', x: 10, y: 22, w: 4, era: 'inca', open: true, id: 'portal' },
      { t: 'exit', x: 10, y: 22, w: 4, h: 1, to: 'qorikancha', at: [17.5, 2], era: 'inca' },
      { t: 'sign', x: 9, y: 21, era: 'hoy', text: 'Convento de Santo Domingo. Los españoles lo levantaron encima del Qorikancha, el Templo del Sol, usando sus muros incas como cimiento. El oro ya no está… en este tiempo.' },
      { t: 'sign', x: 13, y: 12, text: LORETO_TXT },
      { t: 'decor', k: 'llama_oro', x: 6.5, y: 18.8, scale: .6, era: 'inca' }, { t: 'decor', k: 'maiz_oro', x: 17, y: 18.8, scale: .6, era: 'inca' },
      { t: 'decor', k: 'farol', x: 3, y: 15.5, scale: .6, era: 'hoy' }, { t: 'decor', k: 'carreta', x: 18, y: 15.4, scale: .75, era: 'hoy', solid: [17, 15, 2, 1] },
      { t: 'npc', k: 'nusta', x: 5, y: 16, era: 'inca', text: ['El Qorikancha es la casa del Inti. Sus muros están cubiertos de láminas de oro.', 'Adentro hay recintos para la Killa, las estrellas, el rayo y el arcoíris… y el gran disco del Sol.', 'Pero desde que el Supay subió del Uku Pacha, los mallquis ya no descansan.'] },
      { t: 'foe', k: 'imata', x: 12, y: 8, era: 'hoy' }, { t: 'foe', k: 'llama', x: 6, y: 17, era: 'hoy' }, { t: 'foe', k: 'llama', x: 18, y: 19, era: 'hoy' },
      { t: 'foe', k: 'imata', x: 11, y: 3, era: 'hoy' }, { t: 'foe', k: 'fantasma', x: 12, y: 16, era: 'hoy' },
      { t: 'exit', x: 10, y: 0, w: 4, h: 1, to: 'plaza', at: [29.5, 26] }
    ]
  },

  // el Qorikancha (solo en tiempos incas): patio con la fuente, recintos de la Luna, las Estrellas, el Arcoíris, el
  // Rayo y, al fondo, el Templo del Sol, donde está el Supay
  qorikancha: {
    name: 'Qorikancha', fixedEra: 'inca', indoor: true, map: [
      'WWWWWWWWWWWWWWWW....WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWW....WWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWkkkkkkkkkkkkWWWWWWWWWWWW',
      'wwwwwwwwwwWWkkkkkkkkkkkkWWwwwwwwwwww',
      'wddddddddwWWkkkkkkkkkkkkWWwddddddddw',
      'wddddddddwwwwwwwkkkkwwwwwwwddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wdddddddd.kkkkkkkXXkkkkkkk.ddddddddw',
      'wdddddddd.kkkkkkkkkkkkkkkk.ddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wddddddddwkkkkkkkkkkkkkkkkwddddddddw',
      'wwwwwwwwwwkkkkkkkkkkkkkkkkwwww..wwww',
      'wwwwwwwwww..wwWWWWW..WWWWWWwww..wwww',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wppppppppppppwWuuuuuuuuuuuWwdddddddw',
      'wwwwwwwwwwwwwwWuuuuuuuuuuuWwwwwwwwww',
      'wwwwwwwwwwwwwwWuuuuuuuuuuuWwwwwwwwww',
      'wwwwwwwwwwwwwwWuuuuuuuuuuuWwwwwwwwww',
      'wwwwwwwwwwwwwwWWWWWWWWWWWWWwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww'
    ],
    start: [17.5, 2],
    things: [
      { t: 'decor', k: 'paqcha', x: 17.5, y: 11, scale: .7 },   // la fuente de piedra del patio
      { t: 'decor', k: 'llama_oro', x: 11.5, y: 7.2, scale: .55 }, { t: 'decor', k: 'maiz_oro', x: 24.5, y: 7.2, scale: .55 },
      { t: 'decor', k: 'llama_oro', x: 24.5, y: 14.2, scale: .55 }, { t: 'decor', k: 'maiz_oro', x: 11.5, y: 14.2, scale: .55 },
      { t: 'sign', x: 15, y: 3, text: 'Qorikancha, «el recinto de oro». Aquí se veneraba al Inti. Alrededor del patio están los recintos de la Killa (la Luna), las Chaskas (las estrellas), el K\'uychi (el arcoíris) e Illapa (el rayo). Al fondo, el Templo del Sol.' },
      // Templo de la Luna (oeste): los mallquis de las coyas; al vencerlos aparece un cofre con una llave
      { t: 'label', x: 5, y: 4.4, text: 'Templo de la Killa' },
      { t: 'foe', k: 'mallqui', x: 3, y: 7, group: 'luna' }, { t: 'foe', k: 'mallqui', x: 7, y: 7, group: 'luna' },
      { t: 'foe', k: 'mallqui', x: 3, y: 13, group: 'luna' }, { t: 'foe', k: 'mallqui', x: 7, y: 13, group: 'luna' },
      { t: 'chest', x: 4, y: 10, item: 'llave', appear: 'luna', id: 'cofreLuna' },
      // Templo del Arcoíris (suroeste): puerta con llave; dos bloques sobre dos placas abren la puerta de las Estrellas
      { t: 'door', k: 'puerta_llave', x: 10, y: 16, w: 2, id: 'arcoiris', lock: 'llave' },
      { t: 'label', x: 6.5, y: 18.4, text: 'Templo del K\'uychi' },
      { t: 'plate', x: 3, y: 20, group: 'arcoiris' }, { t: 'plate', x: 9, y: 20, group: 'arcoiris' },
      { t: 'block', x: 4, y: 23 }, { t: 'block', x: 8, y: 23 },
      { t: 'sign', x: 6, y: 25, text: 'Siete colores del K\'uychi, dos piedras para dos ofrendas. Empújalas sobre los altares.' },
      // Templo de las Estrellas (este): puerta del Sol; espejos que llevan el rayo del Inti hasta el disco
      { t: 'door', k: 'puerta_sol', x: 26, y: 10, w: 2, rot: true, id: 'estrellas', opens: 'arcoiris' },
      { t: 'label', x: 30.5, y: 4.4, text: 'Templo de las Chaskas' },
      { t: 'window', x: 30, y: 4, dir: [0, 1] },   // tragaluz: con la Canción del Inti entra el rayo de sol
      { t: 'mirror', x: 30, y: 12, m: '/' }, { t: 'mirror', x: 33, y: 12, m: '\\' }, { t: 'mirror', x: 28, y: 12, m: '/' },
      { t: 'target', x: 33, y: 7, opens: 'inti' },
      { t: 'sign', x: 28, y: 5, text: 'Cuando el Inti mira por la ventana, sus rayos buscan su disco. Toca la Canción del Inti y gira los espejos con Z.' },
      // Templo del Rayo (sureste): tres entradas, dos mallquis y un cofre
      { t: 'label', x: 32, y: 18.4, text: 'Templo de Illapa' },
      { t: 'foe', k: 'mallqui', x: 30, y: 21 }, { t: 'foe', k: 'mallqui', x: 33, y: 24 },
      { t: 'foe', k: 'fantasma', x: 13, y: 8 }, { t: 'foe', k: 'fantasma', x: 22, y: 13 },
      { t: 'chest', x: 34, y: 19, item: 'casino', id: 'cofreRayo' },
      // Templo del Sol (sur): la puerta se abre con el rayo; adentro, el Supay
      { t: 'door', k: 'puerta_sol', x: 19, y: 16, w: 2, id: 'inti', opens: 'inti' },
      { t: 'decor', k: 'disco_sol', x: 20.5, y: 29.4, scale: .8 },
      { t: 'decor', k: 'brasero_on', x: 15.5, y: 18, scale: .8, solid: [15, 17, 1, 1] }, { t: 'decor', k: 'brasero_on', x: 25.5, y: 18, scale: .8, solid: [25, 17, 1, 1] },
      { t: 'boss', k: 'supay', x: 20, y: 23, arena: [15, 17, 11, 12] },
      { t: 'exit', x: 16, y: 0, w: 4, h: 1, to: 'loreto', at: [11.5, 21] }
    ]
  },

  // calle Suecia, Huaynapata, calle Resbalosa (escalinata), San Cristóbal y el sendero del cerro a Sacsayhuamán
  sancristobal: {
    name: 'Calle Resbalosa · San Cristóbal', incaName: 'Camino a Sacsayhuamán', map: [
      'ZZZZZZZZZZZ....ZZZZZZZZZZZ',
      'ZZZZZZZZZZZ....ZZZZZZZZZZZ',
      'vvvvvvvvvvv::::vvvvvvvvvvv',
      'vvvvvvvvvv::::vvvvvvvvvvvv',
      'vvvvvvvvv:::vvvvvvvvvvvvvv',
      'vv#####vv::vvvvvv#######vv',
      'vvvvvvvvv::vvvvvvvvvvvvvvv',
      'vvvvvvvvvv:::::vvvvvvvvvvv',
      'vvvvvvvvvvvvvv::vvvvvvvvvv',
      'vvv#######vvvvv::vvvvvvvvv',
      'vvvvvvvvvvvvvvvv::vvvvvvvv',
      'vvvvvvvvvvvvvvv:::vvvvvvvv',
      'rrrrrrrrrrrrr..::rrrrrrrrr',
      'CCXXXXXCC,,,,,,,,,,,,,,rrr',
      'CCXXXXXCC,,,,,,,,,,,,,,,rr',
      'CC.......,,,,,,,,,,,,,,,,r',
      'CC.......,,,,,,,,,,,,,,,,#',
      'CCCCCCCCCCCCCCC...CCCCCCCC',
      'CCCCCCCCCCCCCCC===CCCCCCCC',
      'CCCCCCCCCCCCCCC...CCCCCCCC',
      'CCCCCCCCCCCCCCC===CCCCCCCC',
      'CCCCCCCCCCCCCCD...DCCCCCCC',
      'CCCCCCCCCCCCCCC===CCCCCCCC',
      'CCCCCCCCCCCCCCC...CCCCCCCC',
      'CCCCCCCCCCCCCCC===CCCCCCCC',
      'CCCCCCCCCCCCCCC...CCCCCCCC',
      'CCCCCCCCCCCCCCC===CCCCCCCC',
      'CCCCCCCCCCCCCCC...CCCCCCCC',
      'CCCCCCCCCCCCCCC===CCCCCCCC',
      'CCCCCCCCCCCCCCC...CCCCCCCC',
      'CCCCC..............CCCCCCC',
      'CCCCC..............CCCCCCC',
      'CCCCC..CCCCCCCCCCCCCCCCCCC',
      'CCCCC..CCCCCCCCCCCCCCCCCCC',
      'CCCCD..DCCCCCCCCCCCCCCCCCC',
      'CCCCC..CCCCCCCCCCCCCCCCCCC',
      'CCCCC..CCCCCCCCCCCCCCCCCCC',
      'CCCCC..CCCCCCCCCCCCCCCCCCC',
      'CCCCC...CCCCCCCCCCCCCCCCCC',
      'CCCCC...CCCCCCCCCCCCCCCCCC'
    ],
    start: [6, 38],
    things: [
      { t: 'sign', x: 7, y: 38, text: 'Calle Suecia: sube una cuadra y dobla a la derecha por Huaynapata.' },
      { t: 'sign', x: 14, y: 30, text: 'Calle Resbalosa: una calle angosta de escalones de piedra que sube hasta San Cristóbal.' },
      { t: 'decor', k: 'catedral', x: 4.5, y: 15, scale: .42, era: 'hoy', label: 'Iglesia de San Cristóbal' },
      { t: 'sign', x: 24, y: 15, era: 'hoy', text: 'Mirador de San Cristóbal: desde aquí se ve todo el Cusco… bajo el cielo radiactivo. En el cerro de enfrente, el Cristo Blanco.' },
      { t: 'barrier', x: 15, y: 20, w: 3, h: 1, era: 'inca' },
      { t: 'npc', k: 'runa', x: 16, y: 19, era: 'inca', text: ['Arriba, los hombres del Inca levantan la gran fortaleza de Sacsayhuamán.', 'Nadie puede subir mientras se construye.'] },
      { t: 'decor', k: 'eucalipto', x: 5, y: 3, scale: .7 }, { t: 'decor', k: 'eucalipto', x: 21, y: 4, scale: .7 },
      { t: 'decor', k: 'eucalipto', x: 3, y: 8, scale: .65 }, { t: 'decor', k: 'eucalipto', x: 22, y: 10, scale: .7 },
      { t: 'decor', k: 'molle', x: 12, y: 6, scale: .6 }, { t: 'decor', k: 'eucalipto', x: 19, y: 7, scale: .6 },
      { t: 'sign', x: 17, y: 3, text: 'Sacsayhuamán ↑ La entrada está sellada con un choclo de oro.' },
      { t: 'door', k: 'puerta_choclo', x: 11, y: 1, w: 4, id: 'sacsay', lock: 'cetro' },
      { t: 'foe', k: 'llama', x: 11, y: 30, era: 'hoy' }, { t: 'foe', k: 'imata', x: 16, y: 25, era: 'hoy' },
      { t: 'foe', k: 'guerrero', x: 13, y: 8, era: 'hoy' }, { t: 'foe', k: 'guerrero', x: 10, y: 3, era: 'hoy' },
      { t: 'foe', k: 'imata', x: 7, y: 31, era: 'hoy' }, { t: 'foe', k: 'llama', x: 16, y: 22, era: 'hoy' }, { t: 'foe', k: 'guerrero', x: 18, y: 15, era: 'hoy' },
      { t: 'foe', k: 'fantasma', x: 20, y: 9, era: 'hoy' }, { t: 'foe', k: 'fantasma', x: 6, y: 14, era: 'hoy' },
      { t: 'exit', x: 5, y: 39, w: 3, h: 1, to: 'plaza', at: [7, 1] },
      { t: 'exit', x: 11, y: 0, w: 4, h: 1, to: 'sacsayhuaman', at: [21.5, 40] }
    ]
  },

  // Sacsayhuamán: torreones arriba del cerro, tres murallas en zigzag (los dientes del puma), la explanada de
  // Chuquipampa y, del otro lado, el Rodadero con el Trono del Inca
  sacsayhuaman: {
    name: 'Sacsayhuamán', map: [
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'ZZEEEEEEEEEZZZZZZZEEEEEEEEZZZZZZZZEEEEEEEEZZ',
      'ZZEEEEEEEEEEEZZZEEEEEEEEEEEEZZZEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEZZ',
      'ZZZZZZZZZZZZZZZZZZZZ....ZZZZZZZZZZZZZZZZZZZZ',
      'ZZZZZZZZZZZZZZZZZZZZ....ZZZZZZZZZZZZZZZZZZZZ',
      'ZZZ::ZZZ::ZZZ::ZZZ::::::::ZZZ::ZZZ::ZZZ::ZZZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZRRZZZZZZZZZ',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZRRZZZZZZZZZ',
      'ZZZ::ZZZ::ZZZ::ZZZ::ZZZ::ZZZ::ZZZvvZZZ::ZZZZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZZZZZZZZZZZZZZZZZZZZZ..ZZZZZZZZZZZZZZZZZZZZZ',
      'ZZZZZZZZZZZZZZZZZZZZZ..ZZZZZZZZZZZZZZZZZZZZZ',
      'ZZZ::ZZZ::ZZZ::ZZZ::Z..Z::ZZZ::ZZZ::ZZZ::ZZZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'Zvvvvvv#######vvvvvvvvvvvvvvvv#######vvvvvvZ',
      'Zvvvvvv#vvvvv#vvvvvvvvvvvvvvvv#vvvvv#vvvvvvZ',
      'Zvvvvvv#vvvvv#vvvvvvvvvvvvvvvv#vvvvv#vvvvvvZ',
      'Zvvvvvv###v###vvvvvvvvvvvvvvvv###v###vvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvZ',
      'ZZZZZZZZZZZZZZZZZZZZ....ZZZZZZZZZZZZZZZZZZZZ'
    ],
    start: [21.5, 40],
    things: [
      { t: 'sign', x: 19, y: 39, text: 'Sacsayhuamán. Dicen que el Cusco tiene forma de puma: Sacsayhuamán es su cabeza y sus tres murallas en zigzag, los dientes. Algunas piedras pesan más de cien toneladas.' },
      // torreones de la cima (quedan sus cimientos)
      { t: 'label', x: 10, y: 34.4, text: 'Sallaqmarca' }, { t: 'label', x: 33, y: 34.4, text: 'Paucamarca' },
      { t: 'ring', x: 22, y: 36, r: 2.2, label: 'Muyucmarca' },
      { t: 'foe', k: 'guerrero', x: 8, y: 38, era: 'hoy' }, { t: 'foe', k: 'guerrero', x: 36, y: 38, era: 'hoy' },
      { t: 'foe', k: 'guerrero', x: 18, y: 35, era: 'hoy' }, { t: 'foe', k: 'fantasma', x: 30, y: 34, era: 'hoy' }, { t: 'foe', k: 'fantasma', x: 12, y: 26, era: 'hoy' },
      { t: 'foe', k: 'fantasma', x: 34, y: 19, era: 'hoy' },
      { t: 'npc', k: 'runa', x: 25, y: 38, era: 'inca', text: ['Llevamos las piedras desde las canteras con sogas y rampas.', 'El Inca Pachacútec quiere una fortaleza digna de la cabeza del puma.'] },
      // tercera muralla: T'iopunku (abierta). Segunda terraza: la piedra caída tapa Ajawanapunku; con la piedra del tiempo se pasa
      { t: 'label', x: 22, y: 30.4, text: 'T\'iopunku' },
      { t: 'foe', k: 'guerrero', x: 10, y: 27, era: 'hoy' }, { t: 'foe', k: 'guerrero', x: 30, y: 26, era: 'hoy' }, { t: 'foe', k: 'guerrero', x: 18, y: 28, era: 'hoy' },
      { t: 'stone', x: 38, y: 27.2 },
      { t: 'sign', x: 36, y: 28, text: 'Una piedra gigante cayó sobre la puerta de Ajawanapunku. Hace quinientos años todavía no estaba ahí…' },
      { t: 'label', x: 34, y: 22.4, text: 'Ajawanapunku' },
      { t: 'npc', k: 'runa', x: 31, y: 25, era: 'inca', text: ['¿Esta piedra? Todavía la estamos subiendo por la rampa.', 'Pasa por la puerta, pero no te quedes: allá arriba cortamos piedra y el camino está lleno de bloques.'] },
      // primera terraza: dos bloques sobre dos placas abren Wiracochapunku, la puerta de la explanada
      { t: 'stone', x: 40, y: 18.2 },
      { t: 'plate', x: 12, y: 17, group: 'wiracocha' }, { t: 'plate', x: 31, y: 17, group: 'wiracocha' },
      { t: 'block', x: 12, y: 20 }, { t: 'block', x: 30, y: 20 },
      { t: 'barrier', x: 14, y: 16, w: 16, h: 6, era: 'inca' },   // en tiempos incas la terraza está llena de piedras de la obra
      { t: 'door', k: 'puerta_sol', x: 20, y: 13, w: 4, id: 'wiracocha', opens: 'wiracocha' },
      { t: 'label', x: 22, y: 12.4, text: 'Wiracochapunku' },
      { t: 'foe', k: 'guerrero', x: 22, y: 18, era: 'hoy' },
      // la explanada de Chuquipampa: Pachacútec zombi. Al fondo, el Rodadero y el Trono del Inca; la Chincana
      { t: 'decor', k: 'trono', x: 22, y: 3.6, scale: .8, solid: [21, 2, 2, 2] },
      { t: 'label', x: 22, y: 1.4, text: 'Trono del Inca · Rodadero' },
      { t: 'decor', k: 'escalera', x: 38, y: 3.4, scale: .6, obj: true, label: 'Chincana' },
      { t: 'boss', k: 'pachacutec', x: 22, y: 8, arena: [2, 2, 40, 11] },
      { t: 'exit', x: 20, y: 41, w: 4, h: 1, to: 'sancristobal', at: [13, 2] }
    ]
  }
};

// diálogos del paqo (hoy, en la Plaza de Armas) y del Willaq Umu (el sumo sacerdote, en tiempos incas)
export const TALKS = {
  paqo: {
    first: ['¡Inkaxur! Te vi caer del cielo. Soy el paqo de la plaza.',
      'La Pachamama me dijo que vendrías. Para salvar el Cusco necesitas el cetro de oro del Qorikancha: con él se abren las puertas incas.',
      'Pero el Qorikancha quedó enterrado bajo el convento de Santo Domingo… en este tiempo.',
      'Toma esta quena. Te enseñaré la Canción del Tiempo: ▶ ▲ ▼ ▶ ▲ ▼.',
      'Tócala junto a la piedra de los doce ángulos, en la calle Hatunrumiyoc, y verás el Cusco de los incas.'],
    again: ['La Canción del Tiempo: ▶ ▲ ▼ ▶ ▲ ▼. Tócala con Q junto a la piedra de los doce ángulos.'],
    after: ['¡Tienes el cetro! Ahora sube por la calle Suecia y la Resbalosa hasta Sacsayhuamán. Allí te espera la Chakana de oro.']
  },
  willaq: {
    first: ['Viajero del mañana… soy el Willaq Umu, sumo sacerdote del Inti.',
      'El Supay subió del Uku Pacha, el mundo de abajo, y tomó el Templo del Sol. Los mallquis, nuestros ancestros, ya no descansan.',
      'Aprende la Canción del Inti: ◀ ▶ ▲ ◀ ▶ ▲. La luz del Sol abre sus puertas y el Supay no la soporta.',
      'El Qorikancha está bajando por el Intik\'ijllu, el callejón del Sol.'],
    again: ['La Canción del Inti: ◀ ▶ ▲ ◀ ▶ ▲. Contra el Supay, tócala: la luz del Inti lo aturde.']
  }
};

// ítems que se muestran al abrir un cofre o recibirlos (texto del cartel)
export const GOT = {
  quena: '¡Conseguiste la quena! Pulsa Q para tocarla.',
  tiempo: '¡Aprendiste la Canción del Tiempo! ▶ ▲ ▼ ▶ ▲ ▼',
  sol: '¡Aprendiste la Canción del Inti! ◀ ▶ ▲ ◀ ▶ ▲',
  llave: '¡Una llave del Qorikancha!',
  casino: '¡Un Casino! Pulsa E para recuperar toda la energía.',
  cetro: '¡El cetro de oro con punta de choclo! Abre las puertas incas y lanza granos de oro con V.',
  chakana: '¡La Chakana de oro!'
};
