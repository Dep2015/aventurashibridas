/* ---------- nivel 2: el cielo (todo en el aire, como Inkaxur) ----------
 * Posiciones en píxeles del mundo (x: 0 → L2W, y: 0 = arriba de la pantalla, GH = abajo).
 * La última pantalla (desde ARENA_X) es la pelea con el Amaru Alado Zombi. */
import { GW } from './config.js';

export const L2W = 12800;
export const ARENA_X = L2W - GW;

export function buildLevel2() {
  return {
    time: 400,
    // enemigos [x, tipo, y]: aparecen cuando la cámara llega a x (ver entities/flyers.js)
    enemies: [
      [1100, 'condor', 200], [1500, 'condor', 330], [1900, 'cuyVolador', 260], [2200, 'condor', 150],
      [2500, 'cuyVolador', 380], [2800, 'condorCarga', 90],
      [3200, 'cuyVolador', 200], [3400, 'cuyVolador', 340], [3700, 'condorCarga', 80], [4000, 'condor', 260],
      [4300, 'harpia', 220], [4700, 'cuyVolador', 420], [5000, 'condor', 180], [5200, 'condorCarga', 100],
      [5500, 'condor', 360],
      [5900, 'harpia', 180], [6300, 'cuyVolador', 300], [6600, 'condor', 150], [6800, 'condor', 400],
      [7100, 'condorCarga', 90], [7400, 'harpia', 330], [7800, 'cuyVolador', 220], [8100, 'condor', 300],
      [8400, 'cuyVolador', 160],
      // antes del jefe: los choclos zombis radiactivos
      [8800, 'chocloRad', 200], [9300, 'condor', 380], [9700, 'chocloRad', 330], [10100, 'harpia', 200],
      [10500, 'condorCarga', 90], [10800, 'chocloRad', 250], [11200, 'condor', 180]
    ].sort((a, b) => a[0] - b[0]),
    // además de los de arriba, cada cierto tiempo aparece un enemigo al azar por la derecha
    // (tipos con su peso; el choclo radiactivo solo desde minX, antes del jefe)
    random: {
      every: [1400, 2800], maxAlive: 8,
      kinds: [['condor', 34], ['cuyVolador', 30], ['condorCarga', 14], ['harpia', 12], ['chocloRad', 10, 8500]]
    },
    // filas de monedas [x inicial, cantidad, y]
    coins: [
      [600, 5, 300], [1600, 5, 250], [2400, 6, 180], [3300, 5, 300], [4100, 6, 420], [5300, 5, 250],
      [6200, 6, 280], [7000, 5, 120], [7700, 6, 300], [8600, 5, 250], [9600, 6, 300], [10400, 5, 180]
    ],
    // casinos flotando [x, y] (definido por el usuario: en el nivel 2 solo casinos, monedas y lo que cae del cielo)
    casinos: [[2400, 250], [5000, 380], [7600, 180], [10200, 320]],
    // cada `every` ms cae del cielo un ítem, alternando el arbusto rojo (taunt) y la bola de energía (plasma)
    falling: { every: 7000, items: ['taunt', 'plasma'] }
  };
}
