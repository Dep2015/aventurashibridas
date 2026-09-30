// Constantes globales, rutas de assets y datos de personajes
export const TS = 32, GW = 960, GH = 544;
// superficie del suelo (filas 15–16 de la grilla)
export const GROUND_Y = 15 * TS;
export const WORLD_GRAVITY = 1500;

// física del jugador (px/s y px/s²); el jugador no usa la gravedad del mundo
export const PLAYER = {
  walkSpeed: 155, runSpeed: 260,
  accelWalk: 480, accelRun: 620, accelAir: 420,
  skidDecel: 1500, overSpeedDecel: 500,
  frictionGround: 780, frictionAir: 120, frictionPushed: 60,
  jumpSpeed: 600, jumpSpeedBonus: 0.16, doubleJumpSpeed: 560,  // salto más alto + doble salto (para el cerro)
  jumpGravity: 1050, fallGravity: 2500, maxFall: 700,
  coyoteMs: 90, jumpBufferMs: 120,
  bigScale: 1.3, hurtInvulnMs: 1600
};

// personajes: mismo mapa de cuadros de 72×64 (README.md). xoxurInka es la transformación del balón de gas dorado
export const SHEETS = {
  xoxur: "assets/sprites/xoxur.png", litbru: "assets/sprites/litbru.png", dominga: "assets/sprites/dominga.png",
  xoxurInka: "assets/sprites/xoxur_inka.png"
};
export const CHARS = {
  xoxur: { name: 'Xoxur', fall: 19 }, litbru: { name: 'Litbru', fall: 21 }, dominga: { name: 'Dominga', fall: 21 },
  xoxurInka: { name: 'Inkaxur', fall: 21 }
};
// personaje elegido (se cambia desde la pantalla de inicio)
export const state = { char: 'xoxur' };

// sprite sheets de enemigos, jefe e ítems: [ruta, ancho de cuadro, alto de cuadro]
export const SPRITE_SHEETS = {
  llama: ["assets/sprites/llama_zombi.png", 48, 64],
  cheese: ["assets/sprites/queseso.png", 60, 64],
  imata: ["assets/sprites/imata.png", 52, 64],
  boss: ["assets/sprites/inka_locu.png", 128, 164],  // Inka Locu v2 (tools/inka_locu_sprites.py)
  jaguar: ["assets/sprites/jaguar.png", 356, 284],   // El Sacrificador (tools/sacrificador_sprites.py)
  cuy: ["assets/sprites/cuy_terrestre.png", 52, 40],
  // ítems: cuadros de 40×40 (mapa en README.md)
  items: ["assets/sprites/items.png", 40, 40]
};

// nivel 2 (en el aire, como Inkaxur): hojas de sprites [ruta, ancho de cuadro, alto de cuadro]; mapas en README.md
export const SPRITE_SHEETS_2 = {
  inkaxurVuelo: ["assets/sprites/inkaxur_vuelo.png", 96, 64],   // tools/inkaxur_vuelo_sprites.py
  galletaMenta: ["assets/sprites/galleta_menta.png", 32, 32],   // galleta que lanza Inkaxur volando
  condor: ["assets/sprites/condor_zombi.png", 96, 88],
  saliva: ["assets/sprites/saliva.png", 44, 24],
  condorCarga: ["assets/sprites/condor_carga.png", 92, 76],
  zombiAndina: ["assets/sprites/zombi_andina.png", 40, 28],
  harpia: ["assets/sprites/harpia.png", 84, 80],
  cuyVolador: ["assets/sprites/cuy_volador.png", 72, 44],
  cuyProy: ["assets/sprites/cuy_proyectiles.png", 28, 28],
  chocloRad: ["assets/sprites/choclo_radiactivo.png", 124, 120],
  chocloHacha: ["assets/sprites/choclo_radiactivo_hacha.png", 36, 40],
  amaru: ["assets/sprites/amaru.png", 344, 232],
  amaruAtq: ["assets/sprites/amaru_ataques.png", 112, 80]
};
// fondos y nubes del nivel 2
export const TSET_2 = {
  cielo2: "assets/nivel2/fondos/cielo.png", mtnLejos2: "assets/nivel2/fondos/montanas_lejanas.png",
  mtnCerca2: "assets/nivel2/fondos/montanas_cercanas.png", nubesBajas2: "assets/nivel2/fondos/nubes_bajas.png"
  // las nubes que hacen daño (assets/nivel2/nubes/) se quitaron del nivel por pedido del usuario
};

// nivel 3 (la mina, vista desde arriba): enemigos [ruta, ancho de cuadro, alto de cuadro] y bloques/objetos
export const SPRITE_SHEETS_3 = {
  // Inkaxur caminando en 4 direcciones (tools/inkaxur_mapa_sprites.py): 0–3 abajo, 4–7 arriba, 8–11 izquierda, 12–15 derecha
  inkaxurMapa: ["assets/sprites/inkaxur_mapa.png", 64, 64],
  sapazo: ["assets/sprites/sapazo.png", 108, 56],
  tulixta: ["assets/sprites/tulixta.png", 60, 56],
  jumpe: ["assets/sprites/jumpe.png", 64, 60],
  aracura: ["assets/sprites/aracura.png", 48, 44],
  carbunco: ["assets/sprites/carbunco.png", 156, 164],
  minero: ["assets/sprites/minero.png", 236, 232]
};
export const TSET_3 = {
  piedra3: "assets/nivel3/bloques/piedra.png", piedra3b: "assets/nivel3/bloques/piedra_2.png",
  cofre3: "assets/nivel3/bloques/bloque_moneda.png", cofre3usado: "assets/nivel3/bloques/bloque_usado.png",
  vasija3: "assets/nivel3/objetos/vasija.png", cristal3: "assets/nivel3/objetos/cristal.png",
  huesos3: "assets/nivel3/objetos/huesos.png", farol3: "assets/nivel3/objetos/farol.png",
  raices3: "assets/nivel3/objetos/raices.png", fondoRocoso3: "assets/nivel3/fondos/fondo_rocoso.png",
  pico3: "assets/sprites/minero_pico.png"
};

// fondos y tiles que se cargan (mtnCity, city y las casas siguen en public/assets pero el nivel 1 no los usa)
export const TSET = {
  skyRad: "assets/nivel2/fondos/cielo.png", nubesRad: "assets/nivel2/fondos/nubes_bajas.png",
  tormenta: "assets/backgrounds/tormenta.png",  // nubes de tormenta radiactiva (franja media del fondo)  // cielo radiactivo (el nivel 1 lo usa; sky.png, el celeste, queda sin usar)
  mtn: "assets/backgrounds/mtn.png", terr: "assets/backgrounds/terr.png",
  fg0: "assets/backgrounds/fg0.png", fg1: "assets/backgrounds/fg1.png", fg2: "assets/backgrounds/fg2.png",
  fg3: "assets/backgrounds/fg3.png", fg4: "assets/backgrounds/fg4.png",
  tiles: "assets/tiles/tiles.png", plat: "assets/tiles/plat.png",
  edgeEnd: "assets/tiles/edgeEnd.png", edgeStart: "assets/tiles/edgeStart.png",
  llamaGold: "assets/tiles/llamaGold.png", choclo: "assets/tiles/choclo.png",
  baculo: "assets/sprites/inka_baculo.png",  // báculo que lanza Inka Locu
  hacha: "assets/sprites/jaguar_hacha.png"    // hacha T dorada que lanza El Sacrificador
};
// cuadros del tileset
export const TF = { grass: [0, 1, 2, 3], dirt: [4, 5], brick: 6, crate: 7, used: 8, stone: [9, 10, 11], ptop: 12, pmid: 13, pbase: 14 };

// nivel 4 (el Cusco, vista desde arriba): hojas generadas con tools/nivel4_sprites.py (mapas de cuadros en level4.js)
export const SPRITE_SHEETS_4 = {
  tiles4: ["assets/nivel4/tiles.png", 48, 48],                 // 0–15 Cusco de hoy, 16–31 Cusco inca, 32–47 templos
  inkaxurAccion: ["assets/nivel4/inkaxur_accion.png", 74, 64], // champi, escudo, quena, tesoro, rodar, daño
  mallqui4: ["assets/nivel4/mallqui.png", 78, 66],
  guerrero4: ["assets/nivel4/guerrero.png", 110, 86],
  supay4: ["assets/nivel4/supay.png", 196, 152],
  pachacutec4: ["assets/nivel4/pachacutec.png", 282, 214],
  npcs4: ["assets/nivel4/npcs.png", 46, 62],                   // paqo 0–5, ñusta 6–8, runa 9–11
  llama4: ["assets/nivel4/llama.png", 64, 64],
  imata4: ["assets/nivel4/imata.png", 70, 60],
  bolaFuego4: ["assets/nivel4/bola_fuego.png", 66, 36],   // proyectiles: la cabeza a la derecha, la cola a la izquierda
  orbe4: ["assets/nivel4/orbe.png", 80, 32],
  fantasma4: ["assets/nivel4/fantasma.png", 68, 70]         // fantasma inca: flotar 0–3, lanzarse 4–7, explotar 8–12
};
// imágenes sueltas del nivel 4: ítems (i4_), objetos de los puzles (o4_) y decorados (d4_)
export const IMAGES_4 = Object.fromEntries([
  ...['cetro_choclo', 'chakana', 'quena', 'champi', 'escudo', 'llave', 'llave_jefe', 'mullu'].map(k => ['i4_' + k, `assets/nivel4/items/${k}.png`]),
  ...['bloque', 'placa', 'placa_on', 'espejo', 'brasero', 'brasero_on', 'cofre', 'cofre_abierto', 'puerta_sol', 'puerta_abierta', 'puerta_choclo',
    'puerta_llave', 'escalera', 'piedra_tiempo', 'disco_pedestal', 'muro_roto', 'portal'].map(k => ['o4_' + k, `assets/nivel4/objetos/${k}.png`]),
  ...['fuente', 'catedral', 'casa', 'eucalipto', 'molle', 'llama_oro', 'maiz_oro', 'disco_sol', 'trono', 'carreta', 'farol', 'paqcha'].map(k => ['d4_' + k, `assets/nivel4/decor/${k}.png`])
]);
