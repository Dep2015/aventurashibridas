# Xoxur — juego de plataformas andino

Juego de plataformas 2D estilo Mario clásico, hecho con **Phaser 3.80** y **Vite**.
Tres personajes jugables (Xoxur, Litbru y Dominga), cuatro tipos de enemigo y un jefe final
(Inka Locu) en un nivel 1 ambientado en la cordillera de los Andes.

## Cómo correrlo

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173 (se abre solo)
npm run build    # genera la versión final en dist/
npm run preview  # sirve dist/ para probar la versión final
```

### Con Docker

```bash
docker compose up -d --build   # compila y sirve el juego en http://localhost:8080
docker compose down            # lo detiene
```

La imagen compila con Node y sirve `dist/` con Nginx (`Dockerfile`, `nginx.conf`).
Después de cambiar el código hay que volver a correr `docker compose up -d --build`.

No abras `index.html` con doble clic: el navegador bloquea la carga de módulos e imágenes
desde `file://`. Usa siempre `npm run dev`.

`standalone/xoxur.html` es la versión de un solo archivo (con todas las imágenes incrustadas)
que se publicó en Claude. Funciona con doble clic, pero no se edita: es solo de referencia.

## Nivel 4: el Cusco

Vista desde arriba, como *Zelda: Ocarina of Time*. Inkaxur cae en la entrada del Cusco y recorre las calles reales:
Arco de Santa Clara → Plaza San Francisco → calle Marqués → Plaza de Armas (catedral, fuente, piedra de los doce ángulos en
Hatunrumiyoc) → calle Loreto (Intik'ijllu) → Intipampa → **Qorikancha**; y Plaza de Armas → calle Suecia → Huaynapata →
calle Resbalosa → San Cristóbal → sendero del cerro → **Sacsayhuamán** (torreones, tres murallas en zigzag, explanada de
Chuquipampa, Trono del Inca).

- **Quena** (Q, las flechas tocan): el paqo de la Plaza de Armas enseña la *Canción del Tiempo* (▶ ▲ ▼ ▶ ▲ ▼): junto a una
  piedra del tiempo se viaja entre el Cusco de hoy (radiactivo, con zombis) y el Cusco inca. En la Huacaypata inca, el
  Willaq Umu enseña la *Canción del Inti* (◀ ▶ ▲ ◀ ▶ ▲).
- **Combate**: Z golpe con el champi (combo de 3), X escudo (devuelve proyectiles; el fuego del Supay vuelve a él),
  Shift fijar al enemigo más cercano, Espacio rodar, C galleta, V granos de oro del cetro, E Casino.
- **Qorikancha** (solo en tiempos incas): Templo de la Killa (mallquis → llave), del K'uychi (dos bloques sobre dos
  altares), de las Chaskas (rayo de sol y espejos), de Illapa (cofre) y del Sol: el **Supay** → el cetro de oro con punta de choclo.
- **Round 2 contra el Supay** (estilo Street Fighter II): al vencerlo en el Templo del Sol aparece «ROUND 2» y empieza
  una pelea de costado. Z puño, X patada, atrás para cubrirse, ↓ + X barrida. La barra de ESPECIAL tiene **dos niveles**
  (el segundo se llena encima, de otro color): nivel 1 → **P + O** «Balón de gas» (le quita la mitad al Supay); nivel 2 →
  **P + M** «Plasma de los tres»: entran corriendo Dominga y Litbru, los tres cargan la esfera y viene el video (también le
  quita la mitad; si lo deja sin energía, lo manda fuera del planeta). El Supay tiene la misma barra: nivel 1 «Sueño del
  Supay», nivel 2 «Vuelo al cielo radiactivo» (antes salen dos mallquis del suelo); le quitan la mitad a Inkaxur y se
  interrumpen pegándole mientras brilla. Los especiales son videos.
- **Sacsayhuamán**: la puerta sellada con el choclo se abre con el cetro; guerreros incas zombis (se cubren con el escudo:
  pegarles de costado o después de que atacan); una piedra caída se esquiva viajando al pasado; dos bloques abren
  Wiracochapunku; en la explanada, **Pachacútec zombi** → la Chakana de oro. Continuará…
- **Round 2 contra Pachacútec**: igual que con el Supay, en la explanada de Sacsayhuamán. Inkaxur tiene los mismos dos
  especiales (con videos donde sale Pachacútec). Pachacútec lanza su vara girando; sus especiales: nivel 1 «Vara
  gigante» (la lanza, crece y aplasta a Inkaxur) y nivel 2 «Inkaxur de queso» (antes salen dos guerreros incas zombis; lo
  vuelve queso y se lo come). Al ganar aparece el cofre de la Chakana.
- **Enemigos:** además de los del mapa, van apareciendo zombis que buscan a Inkaxur (rodean casas y muros) y **fantasmas
  incas** que atraviesan las paredes y explotan al tocarlo (rodar los esquiva; un golpe los deshace).
- **Cámara:** al entrar a un área nueva se ve el plano general y luego la cámara se acerca y sigue a Inkaxur (Z salta el plano).
- `?nivel4` en la URL empieza directo en el Cusco.

**Para probar:** `?prueba` en la URL (por ejemplo http://localhost:8080/?prueba) muestra el botón «🧪 Pruebas» arriba a la
derecha: salta a cualquier nivel, zona o jefe (con todos los objetos del nivel 4), a cualquier cinemática, y activa el modo
invencible.

## Prólogo

Al pulsar «Comenzar» en la portada se ve la historia en un video de 36 s con subtítulos (`public/assets/escenas/prologo.mp4`,
hecho con Seedance 2.5 en Higgsfield a partir de 9 imágenes en el estilo de la portada, `prologo*.jpg`; música calma
al inicio y épica al final): Xoxur, Dominga y Litbru pasean entre ruinas incas en Cusco; una bomba
choca contra un satélite de internet; corren a las ruinas y caen a una cámara secreta con incas de oro; al salir, el
cielo es radiactivo y los zombis invaden los Andes; la Pachamama aparece en el cielo y pide ayuda; les entrega dos
amuletos: uno para el centro de Machu Picchu y otro para el Paititi, la ciudad de oro, en medio del disco del sol; y
los tres corren a enfrentar a los enemigos. **Esc o «Saltar»** lo salta. Después viene la elección de
personaje y el nivel 1. «Jugar de nuevo» no repite el prólogo.

**Ver todas las cinemáticas:** abre el juego con `?cine` (por ejemplo http://localhost:8080/?cine) y recorre solo el
prólogo, el despegue y la entrada al nivel 2, la caída a la mina (nivel 3) y el géiser con el final del nivel 3, sin
jugar (`src/cine.js`).

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Moverse | ← → o A D | ◀ ▶ |
| Lanzar (galleta, bastón, plasma) | C | 🍪 |
| Saltar (mantener = más alto) | Z, Espacio, ↑ o W | ▲ |
| Correr | X o Shift | Run |
| Lanzar el báculo de Inka Locu (si lo tienes) | V | V |
| Volar (nivel 2): subir / bajar | ↑ W Z Espacio / ↓ S | ▲ / ▼ |
| Volar rápido (nivel 2) | X o Shift | Run |
| Nivel 3 (mina): caminar / abrir vasijas y cofres | Flechas o WASD / Z o Espacio | ◀ ▶ ▲ ▼ / 🍪 |
| Batalla por turnos: elegir / volver | Flechas + Z o Enter / X o Esc | tocar la opción |
| Muqui Z: galleta / látigo / báculo / plasma | C o clic / 1 / 2 o V / 3 | 🍪 / — / V / — |
| Muqui Z: esquivar / quipu / Casino | Shift o X / Q / E | Run / — / — |

## Estructura

```
index.html                 Marcado de la página (portada, overlay, selector de personaje, botones táctiles)
src/
  main.js                  Arranca Phaser
  config.js                Constantes (GROUND_Y, física del jugador), rutas de assets, personajes, frames del tileset
  level.js                 buildLevel(): el nivel 1 (grilla de 442 × 17 tiles, el cerro, enemigos, decoración)
  level2.js                buildLevel2(): el nivel 2 en el aire (enemigos, monedas, casinos, ítems que caen)
  scenes/Play.js           Nivel 1: coordina el nivel, colisiones, puntaje, daño, jefes y despegue
  scenes/Vuelo.js          Nivel 2: Inkaxur vuela; enemigos voladores y el Amaru Alado Zombi
  entities/Flyer.js        Inkaxur volando (nivel 2)
  entities/flyers.js       Enemigos voladores del nivel 2 (cóndores, harpía, cuy volador, choclo radiactivo)
  entities/Amaru.js        Jefe del nivel 2
  level3.js                Nivel 3: generador de pisos al azar, enemigos y sus ataques, runas, botín
  scenes/Cueva.js          Nivel 3: la mina vista desde arriba (como Pokémon Red), casilla por casilla
  scenes/Batalla.js        Nivel 3: batalla por turnos (como Pokémon) contra los enemigos de la mina
  scenes/Guarida.js        Nivel 3: pelea en tiempo real contra Muqui Z y sus aliados (como Depths of Elora)
  scenes/Escena.js         Escenas con imágenes (`CUTSCENES`): prólogo, entrada a los niveles 2 y 3, final del 3
  entities/Player.js       Jugador: movimiento, salto, tamaño y animación
  entities/enemies.js      Enemigos: comportamiento de cada tipo (bicho, llama, queso, Imata)
  entities/Boss.js         Jefes del nivel 1 (Inka Locu y El Sacrificador)
  world.js                 Construye fondos, bloques, monedas y la salida del tramo
  hud.js                   Marcador, textos flotantes y barra del jefe
  textures.js              Texturas generadas por código y animaciones
  effects.js               Partículas
  ui.js                    Portada, pantallas de inicio / victoria / game over y selector de personaje
  audio.js                 Efectos de sonido sintetizados (WebAudio)
  input.js                 Teclado y botones táctiles
  styles.css               Estilos de la página
public/assets/
  ui/portada.jpg           Imagen de la portada («Aventuras Híbridas»)
  sprites/                 Sprite sheets limpios de personajes, enemigos y jefe
  tiles/                   Tileset, plataformas, bordes de acantilado y decoración
  backgrounds/             Capas de fondo (cielo, cordillera, andenes, ciudad, vegetación)
art-source/                Láminas originales tal como se generaron (referencia)
standalone/xoxur.html      Versión de un solo archivo (versión anterior, sin portada)
```

## Mapa de cuadros de los sprite sheets

**Personajes** (`xoxur.png`, `litbru.png`, `dominga.png`): cuadros de 72×64, grilla de 6×6.

| Cuadros | Uso |
|---|---|
| 0–5 | Reposo |
| 6–11 | Caminar |
| 12–17 | Correr |
| 18 | Agachado (también se usa al derrapar) |
| 19 | Despegue (Xoxur lo usa al caer) |
| 20 | Punto alto del salto (se usa al subir) |
| 21 | Caída (Litbru y Dominga la usan al caer) |
| 22 | Aterrizaje |
| 24–25 | Lanzar (25 brazo atrás, 24 brazo estirado; se usan al lanzar con C) |
| 29 | Celebración (al vencer a Inka Locu) |
| 32 | Golpe (inicio de la muerte) |
| 33 | De rodillas |
| 35 | K.O. |

Los demás cuadros son relleno. El cuadro de caída de cada personaje se define en `CHARS` (`config.js`).

**Inkaxur volando** (`inkaxur_vuelo.png`, cuadros de 96×64, grilla de 8 columnas; de `tools/inkaxur_vuelo_sprites.py`
desde `art-source/inkaxur_vuelo.jpeg`): 0 reposo de frente, 1 flotando, 2–7 volar, 8–13 volar rápido, 14–19 despegue,
20–24 ataque, 25 provocación, 26–31 daño y derrota, 32–33 lanzar la galleta. **16 es la celebración** (brazos arriba).
`galleta_menta.png` (32×32): la galleta de menta lanzada, 3 cuadros.

**Inkaxur en el mapa del nivel 3** (`inkaxur_mapa.png`, cuadros de 64×64, grilla de 4 columnas; de
`tools/inkaxur_mapa_sprites.py` desde `art-source/inkaxur_topdown.png`, lámina generada con **Higgsfield** (GPT Image 2.5)
tomando como referencia `art-source/personaje_xoxur_inka.webp`): 0–3 caminar hacia abajo (de frente), 4–7 hacia arriba
(de espaldas), 8–11 hacia la izquierda, 12–15 hacia la derecha.

**Inkaxur** (`xoxur_inka.png`): mismo mapa que los personajes. Es la transformación de Xoxur con el
balón de gas dorado. Trae además 23–27 ataque (golpe ×3, lateral ×2) y 28 recoger objeto; 30–31 y 34 son
copias de los cuadros de daño.

**Ítems** (`items.png`, cuadros de 40×40): 0 amuleto de Usnu, 1 quipu, 2 taunt vengativo, 3 bastón de choclo,
4 choclo de oro (proyectil de la lluvia), 5 paquete Casino, 6 galleta, 7 balón de gas, 8 esfera de plasma,
9 brújula, 10 balón de gas dorado, 11–13 balón dorado lanzado (antes, en el aire, al caer).

**Cóndor zombi** (`condor_zombi.png`, 96×88, grilla de 6 columnas; mira a la derecha, pico y patas fijos
entre cuadros): 0–5 vuelo, 6–11 caminar en tierra, 12–13 ataque de garra, 14–15 escupir (la lámina original
los trae recortados: solo cabeza y torso). Enemigo del nivel 2 (aún no programado). Se genera con `tools/enemigos_sprites.py`.
**Saliva corrosiva** (`saliva.png`, 44×28): 0 en vuelo, 1 salpicadura. Los primeros planos de la cabeza
quedan solo en `art-source/condor/`.

**Cóndor con carga** (`condor_carga.png`, 92×76, otro enemigo del nivel 2, pensado para una parte en el aire): 0 vuelo con carga
lateral, 1 vuelo con carga frontal, 2 pre-lanzamiento, 3 lanzamiento, 4 regreso a vuelo (ya sin carga).
**Zombi andina** (`zombi_andina.png`, 40×28): 0–1 cayendo (lo que suelta el cóndor). El primer plano de su cara
queda en `art-source/condor/retrato_1.png`. Ambos salen de `art-source/enemigo_condor_carga.webp` con el mismo script.

**Harpía guerrero andino** (`harpia.png`, 84×80, grilla de 6 columnas, figuras centradas y apoyadas abajo):
0–3 reposo, 4–8 caminar, 9–14 sprint volando (9 es el arranque, de frente), 15–17 ataque en carrera
(anticipación, lanzamiento, zarpazo), 18 golpe, 19 cayendo, 20 K.O., 21 abrir bolsa, 22 recoger,
23 usar el amuleto de Usnu (se cura), 24 provocación. Enemigo del nivel 2 (aún no programado).

**Cuy zombi terrestre** (`cuy_terrestre.png`, 52×40, con borde negro de 1 px, grilla de 6 columnas; enemigo del nivel 1, reemplaza al
escarabajo; mira a la derecha): 0 reposo de frente, 1 reposo de lado, 2–7 caminata encorvada, 8–13 caminar
(la que usa el juego), 14–19 correr, 20–22 poses, 23–24 látigo de quipus, 25 provocación, 26 golpe, 27–29 girándose,
30 caído, 31 estrellado (se usa al pisarlo), 32 condiro, 33 retroceso, 34 carga andina de espaldas, 35–37 recoger ítems.

**Cuy zombi volador** (`cuy_volador.png`, 72×44, con borde negro de 1 px, grilla de 6 columnas; enemigo del nivel 2, aún no programado):
0 reposo de frente, 1 reposo de lado, 2–7 vuelo tambaleante, 8–13 vuelo rápido, 14–19 despegue (14–16 en el
suelo, 17–19 ya volando), 20–22 golpe en vuelo, 23–24 látigo de quipus, 25 provocación, 26–28 golpe recibido,
29–31 caído y estrellado, 32–33 lanzar galleta de menta. Escala 0,4 (es más chico que el jugador).
**Proyectiles del cuy** (`cuy_proyectiles.png`, 28×28): 0 galleta de menta, 1 balón de gas, 2 galleta girando.
Se generan con `tools/cuy_sprites.py`.

**El Sacrificador** (Jaguar Guerrero; `jaguar.png` v2, 356×284, grilla de 8 columnas, de `tools/sacrificador_sprites.py`;
jefe final del nivel 1; mide 4 Xoxur): 0–7 avanzar, 8–15 reposo, 16 agachado, 17 punto alto, 18 cayendo,
19 aterrizaje, 20–22 lanzar hacha, 23 celebración, 24–26 daño, 27–28 hacha, 29 de rodillas, 30 K.O.
`jaguar_hacha.png`: el hacha que lanza. (Mapa de la versión anterior: 0–7 reposo, 8–15 avanzar, 16 agachado, 17 punto alto (salto de frente),
18 cayendo, 19 aterrizaje, 20 lanzar hacha: anticipación, 21 soltar, 22 recuperación, 23 celebración, 24–26 daño,
27 hacha en alto, 28 lanzar hacha, 29 de rodillas, 30 K.O. Ataques: lanzar el hacha y un salto súper fuerte de
frente que hace retumbar todo.
**Hachas del Jaguar** (`jaguar_hacha.png`, 48×44): 0–3 hacha girando en el aire, 4 hacha lanzada (fila 6),
5 hacha T dorada. Se generan con `tools/jaguar_sprites.py`.

**Choclo zombi radiactivo** (`choclo_radiactivo.png`, 124×120, grilla de 8 columnas; enemigo volador del nivel 2
que aparece antes del jefe final; aún no programado; mide 1,5 Xoxur): 0–7 vuelo, 8–15 vuelo rápido (13–14 con charco
de baba), 16 agachado, 17 despegue, 18 cayendo, 19 aterrizaje, 20 ataque con hacha, 21 soltar hacha, 22 recuperación,
23–25 aliento radiactivo (carga, suelta, rayo), 26–27 daño en el aire, 28 daño de frente, 29 de rodillas, 30 K.O.
**Hachas del choclo** (`choclo_radiactivo_hacha.png`, 36×40): 0–3 hacha girando, 4 hacha T dorada.
Se generan con `tools/choclo_sprites.py`.

**Amaru Alado Zombi** (`amaru.png`, 344×232, grilla de 3 columnas; jefe final del nivel 2, aún no programado;
mide 4 veces a Xoxur): 0 vuelo, 1 avance en vuelo, 2 aliento, 3 garras, 4 enroscado en tierra, 5 sacudir alas,
6 derrotado, 7 niebla radiactiva + puntas de hielo, 8 aliento helado.
**Ataques del Amaru** (`amaru_ataques.png`, 112×80): 0 niebla radiactiva (del hocico), 1 punta de hielo (de las
alas), 2 bola de granizo viscoso verde (de la cola), 3 lluvia de granizo. Se generan con `tools/amaru_sprites.py`
desde las tres imágenes de `art-source/amaru/`.

**Litbru en vuelo** (de `art-source/litbru_avioneta.webp`, con `tools/litbru_vuelo_sprites.py`; aún no se usa):
`litbru_avion.png` (116×72): 0 avioneta de frente con aura eléctrica, 1 de lado, 2 de lado acelerando (humo y
estela). `litbru_poder.png` (156×60): 0 anticipación (Litbru y los gatos cargan), 1 lanzamiento (los gatos disparan
plasma y fuego), 2 recuperación (explosión). `litbru_proyectiles.png` (48×20): 0 bola de plasma, 1 bola de fuego.

**Dominga en vuelo** (de `art-source/dominga_condor.webp`, con `tools/dominga_vuelo_sprites.py`; aún no se usa):
`dominga_condor.png` (112×80, grilla de 6 columnas; Dominga montada en un cóndor, a escala 1): 0–5 montar y disparar
fuego, 6–11 despegue, 12–16 vuelo con salto (preparar, subir, punto alto, bajar, aterrizar), 17–21 daño (golpe de
frente, de lado, cayendo, cayendo K.O., en el suelo), 22–27 vuelo, 28–32 poder final (cargar aura, aura, mega carga,
soltar mega bola, impacto), 33–37 de frente (alimentar al cóndor, revisar montura, mapa, festejo, fin del poder),
38–40 interacción (alimentar, mapa, festejo). `dominga_proyectiles.png` (88×88): 0 bola de fuego, 1 mega bola,
2 impacto del poder final.

**Sapazo** (`sapazo.png`, 108×56, grilla de 8 columnas; enemigo del nivel 3, aún no programado; mide ~1 Xoxur):
0–5 reposo, 6–11 caminar (con mochila, de lado), 12–17 correr y saltar (12–14 correr, 15 despegue, 16 salto,
17 aterrizaje), 18–20 correr de frente, 21–22 lengua (con cruces rojas), 23 lengua que se retrae, 24 boca que explota,
25 latigazo de lengua, 26 vómito, 27 agachado, 28 salto alto, 29 come, 30 recoger con la lengua, 31 atrapa una llama
esqueleto, 32–37 daño (32 golpe, 33 «HIT!», 34 «OUCH!», 35–36 golpe, 37 de espaldas), 38 de rodillas, 39 cae, 40 K.O.
Se genera con `tools/sapazo_sprites.py` desde `art-source/nivel3/enemigo_sapazo.webp`.

**Tulixta** (`tulixta.png`, 60×56, grilla de 8 columnas; mujer serpiente zombi, enemigo del nivel 3, aún no
programado; mide ~1 Xoxur): 0–5 reposo, 6–11 reptar, 12–17 correr, 18–23 salto (despegue, impulso, punto alto con
destello, cayendo, aterrizaje), 24–28 escupir veneno de frente, 29–33 escupir veneno de lado (chorro), 34–35 golpe
(«OUCH!»), 36–37 de espaldas, 38 de rodillas, 39 en el suelo, 40 K.O.
**Variantes** (`tulixta_mini.png`): 0 con alas doradas, 1 con alas plateadas y casco, 2 con caparazón dorado.
Se genera con `tools/tulixta_sprites.py` desde `art-source/nivel3/enemigo_tulixta.webp`.

**El Carbunco** (`carbunco.png`, 156×164, grilla de 8 columnas; zorro guerrero zombi con gema en la frente,
nivel 3, aún no programado; mide casi 2 Xoxur, tamaño de jefe): 0–5 reposo con lanza, 6–11 caminar, 12–17 correr,
18–22 salto (agachado, despegue, punto alto, cayendo, aterrizaje), 23 juega con huesos, 24 golpe de lanza,
25 carga el rayo de la gema, 26 dispara el rayo, 27 provocación, 28–31 golpe (frente, espalda, x2), 32 ráfaga de
rayos (poder de jefe), 33 de rodillas, 34 K.O. `carbunco_rayo.png`: el rayo suelto.
Se genera con `tools/carbunco_sprites.py` desde `art-source/nivel3/el_carbunco.webp` (lámina chica: se ve algo suave).

**El Jumpe** (`jumpe.png`, 64×60, grilla de 8 columnas; enemigo de humo verde del nivel 3, aún no programado;
mide ~1 Xoxur; su ataque es lanzar el puño): 0–5 reposo, 6–11 caminar, 12–17 correr y saltar, 18–22 puños de humo
(20 puño gigante, 21–22 de frente), 23–27 escupir humo, 28–33 **lanzar el puño** (preparar, estirar, puño lanzado,
impacto, retracción), 34–35 golpe («OUCH!»), 36–37 de espaldas, 38 de rodillas, 39 en el suelo, 40 K.O.
`jumpe_mini.png`: 4 figuras extra de la lámina (esqueleto, dos de humo, montículo).
Se genera con `tools/jumpe_sprites.py` desde `art-source/nivel3/el_jumpe.webp`.

**Aracura** (`aracura.png`, 48×44, grilla de 8 columnas; araña zombi del nivel 3, aún no programada; **cura a los
enemigos derrotados**): 0–5 reposo, 6–11 caminar, 12–14 escupir veneno (con cruz roja), 15–16 veneno de frente,
17–21 chorro de veneno de lado. La lámina es «Parte 1»: faltan daño y derrota.
Se genera con `tools/aracura_sprites.py` desde `art-source/nivel3/aracura.png`.

**Muqui Z** (`minero.png`, minero zombi, 236×232, grilla de 8 columnas; **jefe final del nivel 3**, aún no programado;
mide 4 Xoxur): 0–5 reposo, 6–11 caminar (con cola de humo, farol y pico), 12–17 correr, 18–23 salto,
24–26 puño de humo (se estira hasta un puño gigante), 27 impacto del puño («OUCH!»), 28 con el farol,
29–33 golpe con farol y pico, 34–37 daño (golpe, «OUCH!», de espaldas x2), 38–41 lanzar el pico.
`minero_pico.png`: el pico lanzado (proyectil). Se genera con `tools/minero_sprites.py`.

**Llama zombi** (`llama_zombi.png`, 48×64, 16 cuadros en 2 filas de 8): 0–5 caminar, 6–11 correr, 12–13 golpe, 14 golpe lateral, 15 de rodillas.

**Queseso** (`queseso.png`, 60×64, 10 cuadros): 0–5 correr, 6 forma con púas (lanzamiento), 7 golpe, 8 derritiéndose, 9 charco.

**Imata** (`imata.png`, 52×64, 17 cuadros): 0–5 caminar, 6–11 embestida, 12 provocación (descanso), 13 agachado (toma impulso), 14 golpe, 15 de rodillas, 16 restos de tela.

**Inka Locu** (`inka_locu.png`, 128×164, grilla de 8 columnas; versión 2, generada con `tools/inka_locu_sprites.py`
desde `art-source/jefe_inka_locu_v2.jpg`; mide 1,5 Xoxur): 0–5 caminar, 6–11 correr, 12 agachado, 13 despegue,
14 punto alto, 15 cayendo, 16 aterrizaje, 17 báculo en alto con choclos dorados (lluvia de choclos y lanzar el
báculo), 18 golpe, 19 restos, 20 de rodillas, 21–26 reposo, 27 huesos, 28 báculo al frente, 29 amuleto, 30 quipu,
31 provocación, 32–34 golpe (espaldas / frente). `inka_baculo.png`: el báculo que lanza. La hoja anterior quedó en
`art-source/fondos_originales/inka_locu_v1.png`.

**Tileset** (`tiles.png`, 32×32): 0–3 pasto, 4–5 tierra, 6 adobe, 7 bloque de moneda, 8 bloque usado, 9–11 piedra inca, 12–14 columna (capitel, fuste, base), 15 adobe alternativo.
**Plataformas** (`plat.png`, 32×40): 0 izquierda, 1 centro con textil, 2 centro liso, 3 derecha.

## Nivel 3: la mina de Muqui Z

Empieza con una **escena con dos imágenes** (al vencer al Amaru se le acaba el efecto de vuelo, cae del cielo y entra
por un agujero a la mina). Se juega **desde arriba, como Pokémon Red**, con ideas de «Depths of Elora». Inkaxur camina casilla por casilla por
una mina oscura (solo ve lo que alumbra su antorcha). **Cada partida los pisos son distintos** (cuartos al azar unidos
por pasillos). Hay 3 pisos; la escalera está en el cuarto más lejano.

- **Enemigos en el mapa:** patrullan y, si te ven (5 casillas), te persiguen. Al tocarlos empieza una **batalla por
  turnos como en Pokémon**: LUCHAR (galleta de menta, látigo de quipus que puede aturdir, báculo de Inka Locu, esfera
  de plasma; los fuertes esperan unos turnos), ÍTEMS (Casino, quipu), RUNAS, HUIR. Veneno, humo que baja la puntería
  y ataques cargados (El Carbunco). Los enemigos son más fuertes en pisos profundos.
- **Aracura** camina hasta los restos de los enemigos vencidos y **los revive**.
- **Piedras de runa** (cristales): eliges 1 de 3 runas; elegir la misma otra vez la sube de nivel (I → III): galleta
  afilada, piel de llama (+energía máxima), ojo de cóndor (críticos), quipu vital (curarte al ganar), báculo solar,
  pies ligeros (huir, te ven menos), veneno inverso.
- **Vasijas y cofres:** monedas, Casino, quipu, esferas de plasma o una runa.
- **Campanadas:** cada 80 pasos en un piso suena una campana, llegan 2 enemigos más y todos se hacen más fuertes.
- **Muqui Z** (después del piso 3): la pelea es **en tiempo real, como en Depths of Elora**, en su guarida, con
  movimiento libre, habilidades con enfriamiento (barra abajo), números de daño y críticos. Lo ayudan **todos los
  enemigos de la mina** (Sapazo, Tulixta, El Jumpe, Aracura que revive a los caídos, y El Carbunco con su rayo), y
  llama a más al perder vida (75 %, 50 %, 25 %). Muqui Z: puño de humo, lanza el pico (va y vuelve), golpe con farol y
  pico alrededor, humo del farol (frena y daña). 1000 de vida (Inkaxur le hace el doble). Si pierdes, se repite solo
  esta pelea. Al vencerlo se abre un **géiser** en una esquina: Inkaxur camina hasta él y sale disparado hacia arriba.
- **Escena final** (`scenes/Escena.js`): dos imágenes en el estilo de la portada, generadas con **Higgsfield**
  (GPT Image 2.5, con la portada y la lámina de Inkaxur como referencia): Inkaxur sale de la mina por el géiser y baja
  del cielo hacia una tierra nueva (el nivel 4). Están en `public/assets/escenas/` (originales en `art-source/escenas/`;
  `*_v1.png` es una primera versión con otro estilo). Luego «¡Nivel 3 completado! Nivel 4: continuará…».

## Fondos del nivel 2

En `public/assets/nivel2/`, generados con `tools/nivel2_fondos.py` desde `art-source/nivel2/`:

- `fondos/`: `cielo.png` (atmósfera contaminada con sol radiactivo), `montanas_lejanas.png`, `montanas_cercanas.png`,
  `nubes_bajas.png` (nubes verdes con choclos y partículas), `piso.png` (restos: cuerdas, balón de gas, galletas).
- `nubes/`: nubes negras, eléctricas y de granizo (grandes, chicas, piezas de borde, franjas), `rayo.png`,
  baldosa de hielo, carámbanos y texturas de lluvia/granizo.
- Las nubes (negras, de granizo y eléctricas) se probaron como obstáculos y se quitaron del nivel por pedido del
  usuario; los archivos quedan en `nubes/` por si se usan de adorno.

El nivel 1 usa el `cielo.png` radiactivo como cielo.

## Fondos del nivel 3 (cueva)

En `public/assets/nivel3/`, generados con `tools/nivel3_fondos.py` desde `art-source/nivel3/`. El nivel 3 usa las piedras
(paredes), el bloque moneda (cofres), los objetos (vasijas, cristales, faroles, huesos, raíces) y `fondo_rocoso.png` (fondo de
la batalla). El piso de roca, la escalera y la luz de la antorcha se dibujan por código (`createCaveAssets` en `textures.js`).

| Carpeta | Archivos |
|---|---|
| `fondos/` (paralaje) | `cielo_montanas.png` (cielo radiactivo con montañas, para la entrada), `fondo_rocoso.png` (fondo profundo de la caverna con santuario y ruinas), `vasijas.png` (vasijas, balón de gas y esqueletos), `puente_roto.png`, `piso.png` (piso de caverna con restos) |
| `cueva/` | `pared.png`, `piso_lodo.png`, `estalactitas.png`, `estalagmitas.png`, `formaciones.png`, `caverna_charco.png`, `rio_subterraneo.png`, `puente_cuerda.png`, `puente_piedra.png` (arco inca) |
| `bloques/` (64 px, el juego usa 32) | `ladrillo.png`, `ladrillo_2.png`, `ladrillo_3.png`, `bloque_moneda.png`, `bloque_usado.png`, `piedra.png`, `piedra_2.png`, `columna.png` |
| `objetos/` | `cristal.png`, `vasija.png`, `raices.png`, `farol.png`, `huesos.png` |

Las casas, el puesto de mercado y la llama de la lámina no se extrajeron.

## Enemigos

| Enemigo | Comportamiento | Puntos |
|---|---|---|
| Cuy zombi | Camina, gira en las paredes (reemplazó al escarabajo) | 100 |
| Llama zombi | Camina lento; si te acercas, te persigue corriendo | 200 |
| Queseso | Corre rápido, no se cae de los bordes, lanza bolas de queso en arco | 300 |
| Imata | Toma impulso y embiste; no quita vida, te empuja lejos | 250 |
| Inka Locu (jefe) | Vida 100. Salto con ondas de polvo, embestida, lluvia de choclos y lanza su báculo (va y vuelve, −20) | 1000 por golpe, 5000 al vencerlo |

## Energía e ítems

El jugador empieza con **100 de energía** (barra en el panel izquierdo, fuera del campo de juego, junto al retrato,
el tiempo, los puntos y las monedas). Un enemigo quita 20, la bola de queso 15, los choclos dorados 2, las ondas y el báculo de Inka Locu 20, el hacha de El Sacrificador 10 (y te empuja lejos), el jefe 25 y
caer a un pozo 30 (vuelves al último suelo firme). Con 0 se acaba el juego. **C** lanza: galletas siempre (sin
límite), o el bastón o la esfera de plasma si los tienes.

**El cerro:** después del punto de control se sube un cerro de 5 niveles planos y anchos (20 bloques), cada uno con
sus enemigos, unidos por escaleras de 10 escalones. El fondo cambia al subir hasta quedar solo el cielo radiactivo con
la tormenta (`backgrounds/tormenta.png`, nubes con rayos que llenan la franja entre el cielo y la cordillera). En la pelea con los jefes Xoxur tiene **doble salto** (Z dos veces) y la arena tiene plataformas bajas que se mueven
al azar (Xoxur viaja con la que está pisando; los jefes las atraviesan). En la cima pelean
primero Inka Locu y después **El Sacrificador** (Jaguar Guerrero, 4 veces Xoxur: lanza su hacha y su salto de frente
hace retumbar todo, −15 si estás en el piso). Al empezar su pelea caen del cielo 2 paquetes de Casino, y durante toda la pelea cae un artefacto cada 5 s en
ciclos de 4: Casino, balón de gas dorado (si ya eres Inkaxur, uno al azar: amuleto, plasma, bastón, quipu o taunt),
Casino y una galleta que da +10 de energía (máximo 6 a la vez). **Inkaxur hace el doble de daño al jefe** con todo
lo que lanza (galleta −8, bastón −20, plasma −40).

**Después de El Sacrificador:** Xoxur baila de felicidad (con la pose de brazos arriba si es Inkaxur), la reja de
piedra de la arena se rompe y se sigue subiendo: 20 escalones más hasta la cumbre, con 4 cubos: Casino, balón de gas
dorado, **el báculo de Inka Locu** (se lanza con **V**, va y vuelve, y se conserva todo el nivel 2) y **las alas**
(dibujo provisional por código, `alasItem` en `textures.js`, hasta tener su arte). Con las alas, Inkaxur despega
(corre, salta con los brazos arriba y sale volando), se ve una **escena con dos imágenes** (despega desde la cumbre y
vuela hacia los enemigos del cielo; generadas con Higgsfield en el estilo de la portada) y empieza el nivel 2.

## Nivel 2: el cielo

Todo el nivel es en el aire y se juega como **Inkaxur volando** (`inkaxur_vuelo.png`). La cámara solo avanza; en la
última pantalla aparece el jefe. **C** lanza la galleta de menta (recta), **V** el báculo si se trajo de la cumbre.
Elementos: monedas, casinos flotando y, cada 7 s, cae del cielo el arbusto rojo (taunt) o la bola de energía (plasma).
Chocar con un enemigo quita 20. Además de los enemigos colocados en el recorrido, cada 1,4–2,8 s aparece uno
al azar por la derecha (`random` en `level2.js`: máximo 8 a la vez; el choclo radiactivo solo cerca del jefe).
Los cóndores se dibujan a escala 1,6 (1,5 veces Inkaxur volando).

| Enemigo | Qué hace | Golpes |
|---|---|---|
| Cóndor zombi | Vuela ondulando y escupe saliva corrosiva apuntando a Xoxur (−15) | 1 |
| Cóndor con carga | Vuela alto y suelta a la zombi andina encima de Xoxur (−20) | 1 |
| Harpía guerrera | Espera a la derecha y se lanza en picada contra Xoxur (3 veces y se va) | 2 |
| Cuy zombi volador | Avanza tambaleando y lanza galletas de menta (−10) | 1 |
| Choclo zombi radiactivo | Antes del jefe: flota a la derecha y lanza hachas (−15) | 3 |

La galleta cuenta 1 golpe, el báculo 2 y el plasma elimina a todos. **Amaru Alado Zombi** (jefe, 250 de vida, 6 veces
Xoxur): niebla radiactiva del hocico (−15), puntas de hielo que caen al sacudir las alas (−15), bolas de granizo
viscoso verde con la cola (−10), embestida (−25). Como Inkaxur hace el doble de daño (galleta −8, báculo −30, plasma
−40). A la mitad de su vida llegan 2 cóndores de refuerzo; durante la pelea cae un ítem cada 8 s (Casino, taunt,
Casino, plasma). Al vencerlo sale «Nivel 3: la cueva. Continuará…». Si pierdes en el nivel 2, «Intentar de nuevo»
repite el nivel 2 (con los puntos y el báculo con que empezaste).

**Pelea con los jefes:** su vida (Inka Locu 150, El Sacrificador 200) aparece en el panel, debajo de la energía del jugador. Galleta −4, bastón −10,
pisotón y plasma −20. Cuando el jefe llega a la mitad de su vida (75 o 100), caen del cielo 6 enemigos del nivel 1 a ayudarlo (2 cuyes, 2 llamas,
un queseso y un Imata), caminando unos hacia la izquierda y otros hacia la derecha; si caen sobre una plataforma bajan
al suelo. Al vencer al jefe salen volando. En la lluvia de choclos caen choclos dorados que restan 2 cada uno. Cuando el jugador llega a 50 de energía caen del cielo amuleto, plasma, bastón, quipu y taunt
(una vez); con 10 o menos cae un Casino cada minuto. La arena tiene plataformas para subirse.

| Ítem | Efecto |
|---|---|
| Amuleto de Usnu | Inmune al daño por 10 s (aura dorada) |
| Quipu | +30 de energía |
| Taunt vengativo | Aura roja por 8 s: destruye todo lo que choca contigo |
| Bastón de choclo | Por 15 s lo lanzas con C: va, vuelve y atraviesa enemigos |
| Paquete Casino | Energía llena |
| Balón de gas | Vuelas manteniendo el salto por 6 s |
| Esfera de plasma | La lanzas con C: al explotar elimina a todos los enemigos en pantalla (y le quita 1 vida al jefe) |
| Brújula | Imán de monedas y galletas por 15 s |
| Balón de gas dorado | Solo Xoxur: se transforma en Inkaxur (está después del 3.er enemigo) |
| Galleta (suelta) | +500 puntos |

Las cajas y sus ítems están en `boxItems` (`level.js`, helper `box(x, y, ítem)`); el catálogo en `src/items.js` y
los poderes y lanzamientos en `src/powers.js`.

Los sprites se generan desde las láminas de `art-source/` con dos scripts (necesitan Pillow):

```bash
python3 tools/xoxur_inka_sprites.py   # Inkaxur + balón de gas dorado
python3 tools/items_sprites.py        # hoja de ítems (usa el balón dorado del paso anterior)
```

## Cómo agregar cosas

- **Un personaje:** prepara un sprite sheet con el mismo mapa de cuadros de 72×64, cópialo a
  `public/assets/sprites/`, agrégalo a `SHEETS` y `CHARS` en `config.js`, y añade un botón `.who`
  en `index.html`.
- **Un enemigo:** agrega su sheet a `SPRITE_SHEETS` (`config.js`), sus animaciones en `createAnims()`
  (`textures.js`) y una entrada en `KINDS` (`entities/enemies.js`) con `spawn`, `update` y `stomp`.
- **Un ítem:** agrega su dibujo a `items.png`, una entrada en `ITEMS` (`items.js`) y, si dura un tiempo,
  su efecto en `powers.js`. Luego asígnalo a una caja con `box(x, y, 'nombre')` en `level.js`.
- **Modificar el nivel:** todo está en `buildLevel()` de `level.js`, con helpers `put`, `pillar` y `stairs`.

## Pendientes

- Los tres personajes juegan igual; falta darles habilidades propias.
- Música de fondo (ahora solo hay efectos sintetizados).
- Pausa, guardado del mejor puntaje, más niveles.
- Probar los controles táctiles en un teléfono real.
- Afinar la dificultad jugando: las pruebas se hicieron en un navegador automático lento.
- Definir los poderes finales de los ítems (los actuales son provisionales).
- Usar los cuadros de ataque de Inkaxur y el balón dorado lanzado.

## Consejo para generar arte nuevo

Pide las láminas con **fondo de un solo color plano (magenta #FF00FF), sin grilla, sin bordes de
celda y sin texto dentro de las celdas**. Casi todo el trabajo de limpieza de las láminas actuales
fue quitar fondos con grilla, halos y etiquetas pegadas.
