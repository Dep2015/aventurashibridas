"""Sprites de El Jumpe (enemigo de humo verde que lanza el puño), nivel 3.

Uso:  python3 tools/jumpe_sprites.py
Entrada: art-source/nivel3/el_jumpe.webp (mismo estilo que las láminas del sapazo y de Tulixta)
Salida:
  public/assets/sprites/jumpe.png        cuadros iguales, grilla de 8 columnas (mapa en README.md)
  public/assets/sprites/jumpe_mini.png   las 4 figuras «Mini Chars»
  art-source/jumpe/*.png                 cada figura limpia en resolución original
"""
import os
from jaguar_sprites import Sheet, shrink, pack, ROOT
from sapazo_sprites import figure

SRC = os.path.join(ROOT, 'art-source/nivel3/el_jumpe.webp')
TARGET_H = 56  # en reposo mide ~1 Xoxur

row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
IDLE_X = [(48, 151), (154, 257), (260, 363)]
WALK_X = [(395, 490), (492, 587), (589, 685)]
FIGURES = (
    [('reposo', b) for b in row(108, 212, IDLE_X) + row(248, 352, IDLE_X)]
    + [('caminar', b) for b in row(108, 212, WALK_X) + row(264, 368, WALK_X)]
    + [('correr', b) for b in row(435, 540, [(48, 150), (156, 258), (264, 364), (372, 474), (476, 576), (580, 685)])]
    + [('punos_humo', b) for b in row(108, 212, [(731, 840), (854, 963), (977, 1090), (1123, 1233), (1250, 1360)])]
    + [('escupir_humo', b) for b in row(268, 372, [(731, 840), (857, 968), (987, 1098), (1120, 1230), (1249, 1360)])]
    + [('lanza_puno', b) for b in row(612, 716, [(48, 150), (155, 257), (262, 367), (370, 478), (480, 582), (585, 686)])]
    + [('danio', b) for b in row(447, 552, [(731, 834), (844, 946), (955, 1035), (1045, 1123)])]
    + [('rodillas', (731, 612, 834, 716)), ('suelo', (844, 612, 946, 716)), ('ko', (960, 648, 1064, 722))]
)
MINI = [('mini_esqueleto', (1193, 428, 1266, 492)), ('mini_humo', (1268, 418, 1337, 508)),
        ('mini_humo_2', (1193, 498, 1272, 588)), ('mini_monticulo', (1282, 508, 1368, 592))]


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/jumpe'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        f = figure(sh, box); figs.append(f); f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[0].height
    print('jumpe', pack([shrink(f, scale) for f in figs], 'public/assets/sprites/jumpe.png', 8), len(figs), 'cuadros, escala', round(scale, 3))
    minis = [figure(sh, b) for _, b in MINI]
    for (n, _), f in zip(MINI, minis): f.save(os.path.join(out, n + '.png'))
    print('jumpe_mini', pack([shrink(f, scale) for f in minis], 'public/assets/sprites/jumpe_mini.png', 4))


if __name__ == '__main__':
    main()
