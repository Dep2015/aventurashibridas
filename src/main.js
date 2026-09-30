import Phaser from 'phaser';
import './styles.css';
import { GW, GH } from './config.js';
import { Play } from './scenes/Play.js';
import { Vuelo } from './scenes/Vuelo.js';
import { Cueva } from './scenes/Cueva.js';
import { Batalla } from './scenes/Batalla.js';
import { Guarida } from './scenes/Guarida.js';
import { Escena } from './scenes/Escena.js';
import { Cusco } from './scenes/Cusco.js';
import { Pelea } from './scenes/Pelea.js';
import { setGame, showOverlay, skipSplash } from './ui.js';
import { autoStartDemo } from './demo.js';
import { startCine } from './cine.js';
import { startPrueba } from './prueba.js';

const start = () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: GW, height: GH, backgroundColor: '#7ec8e3',
    physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: true },
    scene: [Play, Vuelo, Cueva, Batalla, Guarida, Escena, Cusco, Pelea]
  });
  setGame(game);
  const refit = () => setTimeout(() => game.scale.refresh(), 120);
  window.addEventListener('resize', refit); window.addEventListener('orientationchange', refit);
  document.addEventListener('fullscreenchange', refit);
  // útil para depurar desde la consola del navegador
  window.game = game;
  autoStartDemo();  // ?demo en la URL: el juego se juega solo
  startCine(game);  // ?cine en la URL: recorre todas las cinemáticas
  startPrueba(game);  // ?prueba en la URL: panel para saltar a cualquier nivel, zona o jefe
  // ?nivel4 en la URL: empieza directo en el Cusco (para probar el nivel 4)
  if (new URLSearchParams(location.search).has('nivel4')) game.events.once('ready', () => {
    const go = () => { skipSplash(); game.scene.stop('play'); game.scene.start('cusco', {}); };
    const play = game.scene.getScene('play');
    if (play.player) go(); else play.events.once('create', () => setTimeout(go, 0));
  });
};

const fontsReady = document.fonts
  ? Promise.race([document.fonts.load('26px "Luckiest Guy"'), new Promise(r => setTimeout(r, 1500))])
  : Promise.resolve();
fontsReady.then(start, start);
