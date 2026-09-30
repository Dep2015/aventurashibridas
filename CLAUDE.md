# CLAUDE.md — contexto del proyecto

Juego de plataformas 2D estilo Mario con tema andino. Phaser 3.80.1 + Vite, JavaScript con
módulos ES, sin TypeScript ni framework de UI. Textos de la interfaz y comentarios en español.

## Comandos
- `npm run dev` — servidor de desarrollo (puerto 5173)
- `npm run build` — build de producción en `dist/`
- `docker compose up -d --build` — compila y sirve el juego con Nginx en http://localhost:8080
- `?cine` en la URL recorre todas las cinemáticas sin jugar (`src/cine.js`); sirve para revisarlas.
- `?prueba` en la URL muestra el botón «🧪 Pruebas» (`src/prueba.js`): saltar a cualquier nivel, zona, jefe o cinemática,
  modo invencible. Para detener/arrancar escenas desde fuera usar `game.scene.stop/start` (inmediato), no
  `escena.scene.stop()` (queda en cola). `?nivel4` empieza directo en el Cusco.
- No hay tests automatizados. Para probar, `window.game` está expuesto en la consola:
  `game.scene.getScene('play')` da acceso a la escena (player, enemies, boss, blocks, etc.).

## Arquitectura
- Dos escenas de Phaser: `Play` (`src/scenes/Play.js`, nivel 1) y `Vuelo` (`src/scenes/Vuelo.js`, nivel 2, todo en el
  aire como Inkaxur). Al tomar las alas en la cumbre, `Play.takeWings()` hace el despegue y arranca `vuelo` con
  `{ score, coins, cetro }`. `ui.js` sabe cuál está activa: perder en el nivel 2 lo reintenta; ganar vuelve al nivel 1.
- Nivel 3 (`src/level3.js`): la mina vista desde arriba. `Cueva` (mapa por casillas de 48 px, pisos generados al azar,
  oscuridad con `luz3`) lanza `Batalla` (por turnos, como Pokémon; `scene.launch` + pausa de `cueva`, y al terminar
  `cueva.battleEnd('win'|'run'|'lose')`). El estado de la partida (energía, ítems, runas) vive en `cueva.run` y lo
  comparten. Después del piso 3, `Guarida` (tiempo real, como Depths of Elora, gravedad 0) contra Muqui Z y sus aliados;
  al vencerlo, el géiser (`geyserExit`) y la escena final (`final3`: termina con Inkaxur cayendo en la entrada del Cusco, donde empieza el nivel 4).
- `Escena` (`src/scenes/Escena.js`): escenas con imágenes entre niveles, definidas en `CUTSCENES` (`intro1` es el prólogo:
  se lanza encima del nivel 1 desde el botón «Comenzar» de la portada y al terminar muestra la elección de personaje;
  `intro2` antes del nivel 2, `intro3` antes del 3, `final3` al terminar el 3). Esc o «Saltar» terminan la escena. Se arranca con `{ cut, run, next: { key, data } }`; sin `next` muestra «Continuará».
  Las imágenes están en `public/assets/escenas/` (generadas con Higgsfield usando la portada como referencia de estilo).
  El prólogo (`intro1`) es un **video** (`video: 'assets/escenas/prologo.mp4'`, 36 s, Seedance 2.5 a partir de las 9
  imágenes `prologo*`, con música propia): sus `slides` solo llevan el texto y el segundo `t` del subtítulo. Si el
  navegador bloquea el sonido se reproduce sin sonido; Esc o «Saltar» lo terminan (un clic no). El original en calidad
  alta está en `art-source/escenas/prologo_video.mp4`.
  Las escenas que se reinician deben poner en `null` sus objetos en `create()` (se reutiliza la misma instancia).
- Nivel 4 (`src/level4.js`, escena `Cusco` en `src/scenes/Cusco.js`, enemigos y jefes en `src/entities/foes4.js`): el Cusco
  visto desde arriba como Zelda (Ocarina of Time). Recorrido real investigado: Arco de Santa Clara → Plaza San Francisco →
  Plaza de Armas → calle Loreto (Intik'ijllu) → Intipampa → Qorikancha; y Plaza de Armas → calle Suecia → Resbalosa →
  San Cristóbal → sendero → Sacsayhuamán. Cada área (`AREAS`) es un mapa de texto (casillas de 48 px, `CELLS`) con sus
  cosas (`things`); cambiar de área o de época reinicia la escena con el estado `run`. Mecánicas: quena (Q + flechas,
  `SONGS`: Canción del Tiempo junto a la piedra de los doce ángulos = Cusco de hoy ↔ Cusco inca; Canción del Inti = rayo
  de sol para los espejos y aturde al Supay), champi (Z, combo de 3), escudo (X, devuelve proyectiles), fijar enemigo
  (Shift), rodar (Espacio), cetro de choclo (V). Qorikancha: mallquis, llave, bloques sobre placas, espejos, Supay →
  cetro. Sacsayhuamán: guerreros incas zombis, piedra del tiempo, placas, Pachacútec zombi → Chakana (fin del primer
  vistazo). Cámaras: la principal (zoom `ZOOM` 1.35, sigue a Inkaxur; al entrar por primera vez a un área hace un plano
  general y se acerca) y otra para la interfaz sin zoom: todo objeto con scrollFactor 0 va solo a la de la interfaz
  (`setupCameras` los reparte antes de dibujar). Enemigos cazadores (`HUNT`): aparecen fuera de la vista y buscan a
  Inkaxur siguiendo un mapa de distancias por casillas (`computeFlow`/`flowStep`, rodean muros); fantasmas incas
  (`fantasma`): atraviesan todo y explotan al tocarlo (`ghostBoom`). En tiempos incas (salvo el Qorikancha) no aparecen.
  Al vencer al Supay o a Pachacútec: «ROUND 2» y la escena `Pelea` (`src/scenes/Pelea.js`, `{ back, rival }`; rivales en `RIVALS`): pelea de costado estilo Street Fighter II
  (barras, reloj de 99, cubrirse con atrás, barrida baja). Especiales = videos (Seedance 2.5, estilo de las cinemáticas;
  `public/assets/pelea/especial_*.mp4`, uno puede ir en partes). Barra de especial de dos niveles (`LV`, `MAXM`): Inkaxur
  nivel 1 P+O «Balón de gas» (−50 % al Supay) y nivel 2 P+M (antes entran Dominga y Litbru: `amigos()`)
  «Plasma de los tres» (también −50 %); el Supay nivel 1 «Sueño» y nivel 2 «Vuelo al cielo radiactivo» (antes, dos mallquis: `minionsRise('mallquis')`)
  (−50 % a Inkaxur; se interrumpen pegándole mientras brilla). Pachacútec: nivel 1 «Vara gigante», nivel 2 «Inkaxur de
  queso» (antes, dos guerreros incas zombis: `minionsRise('guerreros')`); lanza su vara como proyectil (cuadro 28). Los
  especiales de Inkaxur contra Pachacútec usan sus propios videos (`pacha_*.mp4`). Al ganar vuelve al área y aparece el
  cofre del cetro o de la Chakana (`rewardChest`). Hojas: `tools/pelea_sprites.py` (láminas en `art-source/pelea/`).
  `?nivel4` en la URL empieza directo ahí. Botones táctiles propios (`.g4` en index.html, `body.nivel4`; `touch[k + 'At']` =
  momento del último toque, `Cusco.tap(k)` lo cuenta una vez). Las cajas de choque de bloques son zonas que se recrean al empujarlos
  (un cuerpo estático movido a mano no actualiza su posición); al pasar un proyectil a otro grupo de física se le
  reinicia la velocidad (leerla antes). Arte: `tools/nivel4_sprites.py` (usa `tools/lamina_auto.py`, detección
  automática de figuras) sobre las láminas de `art-source/nivel4/` (Higgsfield GPT Image 2).
- Nivel 2: datos en `src/level2.js`; `Flyer` (Inkaxur volando, `entities/Flyer.js`); enemigos voladores en
  `entities/flyers.js` (`FLYERS`: spawn/update por tipo; proyectiles en `scene.balls` con `o.dmg`); jefe `Amaru`
  (`entities/Amaru.js`). `Powers` se reutiliza: con `scene.flying` la galleta es la de menta y va recta.
- La lógica está repartida en módulos:
  - `src/entities/Player.js` — clase `Player` (extiende `Arcade.Sprite`): movimiento, salto, tamaño, animación.
  - `src/entities/enemies.js` — tabla `KINDS` con `spawn` / `update` / `stomp` (y `touch` opcional) por tipo
    de enemigo. Para un enemigo nuevo, agregar una entrada ahí.
  - `src/entities/Boss.js` — clase `Boss` genérica con su máquina de estados; config por jefe en `BOSSES` (vida `hp`: Inka Locu 150,
    El Sacrificador 200; daños en `BOSS_DMG`).
  - Pelea con El Sacrificador (último jefe): caen artefactos cada 5 s (`ARTIFACT_EVERY` en `Play.js`: Casino, balón
    dorado, Casino, galleta). Inkaxur hace el doble de daño con lo que lanza (`Play.throwMul`). El hacha empuja
    (`projPush`, `Play.knockPlayer`).
  - Refuerzos: cuando el jefe llega a la mitad de su vida caen del cielo enemigos del nivel 1 (`Play.onBossHp`, `dropEnemy`).
  - `src/world.js` — construye fondos, sólidos, monedas y la salida del tramo (`buildExit`, zona invisible, sin bandera).
  - `src/hud.js` — marcador, textos flotantes, carteles y barra de vida del jefe.
  - `src/textures.js` — texturas generadas por código y animaciones.
  - `src/effects.js` — partículas (salpicaduras, pedazos que vuelan).
  - `src/items.js` — catálogo de ítems (`ITEMS`) que salen de las cajas; `src/powers.js` — clase `Powers`:
    poderes con duración (amuleto, taunt, bastón, gas, brújula) y lo que se lanza con C (galletas siempre,
    bastón, esfera de plasma) en el grupo `powers.shots`.
  - `src/input.js` — teclado + botones táctiles (`createControls`).
  - `src/ui.js` — overlays HTML: portada, selector de personaje, victoria y game over.
- Resolución lógica 960×544, escalada con `Phaser.Scale.FIT`. Tiles de 32 px (`TS`).
- Constantes en `src/config.js`: `GROUND_Y` (superficie del suelo, y = 480), `PLAYER` (física del jugador),
  rutas de assets.
- El nivel es una grilla de 442×17 construida en `buildLevel()` (`src/level.js`), que además trae todos los
  datos propios del nivel: enemigos, decoración (`props`), checkpoint, arena de Inka Locu, salida (`exitX`) y tiempo.
  **Sin bandera tipo Mario.** Desde la columna 152 (`HILL_X`) el nivel sube un **cerro de 5 niveles planos**
  (`L.hill`: `surface[x]` = fila de la superficie; filas negativas = por encima de la pantalla inicial), unidos por
  escaleras de 10 escalones (`stairsUp`, `STEPS`; cada escalón mide 2 columnas); cada nivel sube 11 filas y mide
  20 columnas (la cima, 30). La cima está en la fila −40. Solo las
  superficies y caras laterales tienen física; el relleno es imagen. El mundo y la cámara van de `TOP` (−2450) a 544;
  la cámara sube con el jugador en el cerro. Entre enemigos solo chocan de costado y en el piso (no se apilan); y se fija en la arena de la cima (`camLockY`). En la cima pelean en
  secuencia `arena.bosses` (Inka Locu y El Sacrificador, config en `BOSSES` de `Boss.js`); al vencer al último viene
  el baile (`celebrate`/`danceStep`; Inkaxur usa el cuadro 16 de `inkaxurVuelo`), se rompe la reja (`arena.gate`,
  `openGate`) y se sube una escalera de 20 escalones a la cumbre con 4 cubos (`hill.boxes`: Casino, balón dorado,
  báculo `baculo` → `Powers.cetro`, lanzado con V, y alas `alas` → `takeWings`). Los enemigos del cerro llevan la
  fila de su nivel: `[columna, tipo, fila]`.
- El fondo tiene paralaje vertical (`setScrollFactor(sx, sy)`): al subir, andenes y cordillera bajan, aparecen las
  nubes radiactivas (`nubesRad`) y arriba solo queda el cielo radiactivo.
- Las plataformas de la arena son móviles (`MovingPlatforms` en `world.js`, movimiento aleatorio; no están en `blocks`;
  `rideVelocity()` lleva al jugador con la plataforma).
- Doble salto solo en la pelea con los jefes (`Player.canDouble`, lo pone `Play.update`; `PLAYER.doubleJumpSpeed`).
  El suelo está en las filas 15–16. Tipos de celda: `ground`, `brick`, `coin`, `power`, `stone`, `plat`,
  `bwall` (pared de la arena del jefe, se destruye al vencerlo).
- `scene.blocks` es un diccionario `"x,y" → sprite sólido`. Úsalo para consultar el mapa
  (detección de paredes y bordes) en vez de `body.blocked.left/right`.
- El jugador **no** usa la gravedad del mundo: la física del salto está hecha a mano en `Player.move()`.
  Los enemigos sí usan la gravedad del mundo (1500).
- Profundidades (depth): fondos −20 a −10, decoración −4 a −2, tiles 0, bordes de acantilado 2,
  enemigos 8–9, jugador 10, HUD 50, textos grandes 60.
- Los fondos usan `scrollFactor` para el paralaje y se repiten alternando espejo (`setFlipX`).
  Las zonas de ciudad (`L.city`) muestran el fondo de calle colonial; el nivel 1 no tiene (es solo cordillera,
  sin casas ni pueblo, por pedido del usuario). `terr.png` es la capa de andenes sin casitas
  (`tools/fondos_sin_casas.py`; el original con casas está en `art-source/fondos_originales/`).
- Al abrir el juego se muestra la portada (`#splash`, imagen `public/assets/ui/portada.jpg`) con el botón
  «Comenzar»; mientras está abierta, `showOverlay()` deja el selector de personaje esperando detrás.

## Cuidados (bugs ya corregidos, no reintroducir)
- **Cambiar el tamaño del jugador** (`Player.setBig`): hay que llamar a `body.updateBounds()` y
  `body.reset(x, y)` conservando la velocidad; si no, el jugador se hunde en el suelo.
- **No cambiar el tamaño dentro de un callback de colisión/overlap.** (El café, que agrandaba, se quitó;
  `setBig` solo se usa al crear el jugador.)
- **Energía, no vidas:** el jugador tiene 100 puntos de energía (`Play.hp`, `MAX_HP`); `hurt(n)` resta con 1 s de
  invulnerabilidad, en 0 se acaba el juego. Caer a un pozo quita 30 y devuelve al último suelo firme (`safeX`).
  El marcador (retrato, barra, tiempo, puntos, monedas) está en HTML fuera del lienzo: `renderHud()` en `ui.js`.
- Las plataformas `plat` son sprites de 32×40 con cuerpo estático de 32×32 alineado arriba
  (`setSize(32, 32, false)` + `setOffset(0, 0)`).
- Las texturas del tileset y los fondos usan filtro NEAREST para evitar costuras entre tiles.
- **No usar `off` (ni otros nombres de métodos de Phaser como `on`, `emit`, `destroy`) como propiedad de un
  sprite**: pisa el método del EventEmitter y al destruirlo Phaser tira «child.off is not a function» y se congela la
  escena. (Pasó con la harpía: ahora es `hoverOff`.)
- **Superficie del pasto 3 px más abajo** (`sinkGrass` en `world.js`): las primeras filas del bloque de pasto son
  briznas sueltas, así que su cuerpo empieza en y + 3 (el suelo real queda en 483). Sin esto los personajes parecen
  flotar. Las plataformas bajan 1 px. En cuerpos estáticos no llamar a `updateFromGameObject()` (borra el offset).
- **Pared pegada** (`Player.againstWall`): no se empuja contra una pared que está justo al lado; si no, al saltar la
  cabeza se engancha en la unión de dos bloques (Arcade separa primero en Y) y el salto se corta. No usar
  `physics.world.forceX`: engancha al jugador en las uniones de los bloques del suelo.
- **Rendimiento** (medido: el nivel 1 pasaba 17 ms por cuadro, el Cusco 12–25 y la guarida de Muqui Z 26; ahora todo
  corre a 60 fps con ~1 ms de JS):
  - Nada de miles de imágenes sueltas: Phaser recorre todos los objetos en cada cuadro aunque estén fuera de cámara. Los
    bloques del nivel 1 que no cambian (suelo, piedra y todo el cerro) van en un Tilemap (`fixedTiles` en `world.js`,
    solo dibuja lo visible); sus sólidos son sprites invisibles (cuerpo + `blocks`). Para cambiar cómo se ve uno de esos
    bloques hay que tocar el Tilemap, no el sprite.
  - Un `Graphics` en WebGL se vuelve a triangular en cada cuadro aunque no cambie (las esquinas redondeadas son muy
    caras): las barras de objetos (`Cusco.drawBar`, `Guarida.drawSkillBar`) se dibujan en una RenderTexture y solo
    cuando cambia algo.
  - Nada de operaciones de RenderTexture en cada cuadro (`erase`/`fill` costaban ~17 ms): la oscuridad de la mina es una
    imagen fija con el hueco de la antorcha (`oscuro3`) que sigue a Inkaxur; la de la guarida (varias luces) se dibuja en
    un canvas 2D a 1/4 de resolución (`oscuroGuarida`).
  - Las hojas de sprites están en paleta de 256 colores (~4 veces menos peso): después de regenerar sprites con las
    herramientas, correr `python3 tools/optimizar_png.py` (guarda los originales en `art-source/png_originales/`; no
    toca los fondos opacos, que con 256 colores muestran escalones).
  - Los videos (especiales de la pelea y prólogo) están recomprimidos: H.264 CRF 26 + `faststart` (empiezan a verse
    antes de terminar de bajar); 52 → 30 MB con SSIM ~0,97–0,98. Originales en `art-source/videos_originales/`. Para
    un video nuevo: `python3 tools/optimizar_video.py` (necesita ffmpeg; en este Mac Intel Homebrew no lo instala, así
    que se hizo con ffmpeg en el sandbox de Higgsfield con los mismos parámetros).
- **Volver del pozo** (`fallInPit`): si el último suelo firme (`safeX`) quedó a la izquierda de la pantalla, la cámara
  retrocede. Si no, el borde de la cámara (que solo avanza) empuja a Xoxur dentro de un pilar y queda trabado.

## Assets
- `items.png` y `xoxur_inka.png` se generan con `tools/items_sprites.py` y `tools/xoxur_inka_sprites.py`
  (Pillow) a partir de las láminas de `art-source/`; no editarlos a mano.
- Sprite sheets en `public/assets/sprites/`; el mapa de cuadros está en `README.md`.
- Las láminas originales sin procesar están en `art-source/` (no se cargan en el juego).
- Algunas texturas se generan por código en `makeTextures()` (`src/textures.js`): monedas, café, bola de
  queso, ondas de polvo, marca de aviso de choclos.

## Próximos pasos planeados
Arte del ítem de las alas (hoy dibujo provisional `alasItem`); nivel 4: seguir hacia Machu Picchu (colocar el amuleto) y el Paititi. Diferenciar a los personajes, música, pausa, guardado de puntaje, nivel 2 (para el nivel 2, hacer que
`buildLevel` reciba el número de nivel y devuelva sus datos; `Play` ya no tiene datos del nivel 1 fijos).
