"""Sprites de Tulixta (mujer serpiente zombi), segundo enemigo del nivel 3 (cueva).

Uso:  python3 tools/tulixta_sprites.py
Entrada: art-source/nivel3/enemigo_tulixta.webp (mismo estilo que la lámina del sapazo)
Salida:
  public/assets/sprites/tulixta.png        cuadros iguales, grilla de 8 columnas (mapa en README.md)
  public/assets/sprites/tulixta_mini.png   las 3 variantes «Mini Chars» (alas doradas, alas plateadas, caparazón)
  art-source/tulixta/*.png                 cada figura limpia en resolución original
"""
import os
from jaguar_sprites import Sheet, shrink, pack, ROOT
from sapazo_sprites import figure

SRC = os.path.join(ROOT, 'art-source/nivel3/enemigo_tulixta.webp')
TARGET_H = 54  # en reposo mide ~1 Xoxur

row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
IDLE_X = [(43, 143), (148, 248), (253, 352)]
WALK_X = [(385, 478), (480, 573), (575, 669)]
FIGURES = (
    [('reposo', b) for b in row(111, 214, IDLE_X) + row(252, 356, IDLE_X)]
    + [('reptar', b) for b in row(111, 214, WALK_X) + row(270, 372, WALK_X)]
    + [('correr', b) for b in row(441, 545, [(43, 143), (150, 250), (256, 355), (363, 462), (466, 565), (570, 670)])]
    + [('salto', b) for b in row(622, 727, [(43, 143), (150, 250), (256, 355), (364, 462), (471, 568), (575, 670)])]
    + [('veneno_frente', b) for b in row(111, 214, [(716, 823), (838, 945), (960, 1067), (1094, 1201), (1217, 1324)])]
    + [('veneno_lado', b) for b in row(271, 375, [(716, 822), (840, 946), (965, 1073), (1093, 1200), (1218, 1325)])]
    + [('danio', b) for b in row(455, 558, [(716, 818), (829, 930), (941, 1019), (1030, 1107)])]
    + [('rodillas', (716, 623, 819, 727)), ('suelo', (829, 623, 930, 727)), ('ko', (944, 675, 1052, 735))]
)
MINI = [('mini_alas_doradas', (1205, 428, 1322, 512)), ('mini_alas_plateadas', (1134, 500, 1242, 600)),
        ('mini_caparazon', (1244, 518, 1336, 600))]


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/tulixta'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        f = figure(sh, box); figs.append(f); f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[0].height
    print('tulixta', pack([shrink(f, scale) for f in figs], 'public/assets/sprites/tulixta.png', 8), len(figs), 'cuadros, escala', round(scale, 3))
    minis = [figure(sh, b) for _, b in MINI]
    for (n, _), f in zip(MINI, minis): f.save(os.path.join(out, n + '.png'))
    print('tulixta_mini', pack([shrink(f, scale) for f in minis], 'public/assets/sprites/tulixta_mini.png', 3))


if __name__ == '__main__':
    main()
