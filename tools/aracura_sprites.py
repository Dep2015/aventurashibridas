"""Sprites de Aracura (araña zombi que cura a los enemigos derrotados), nivel 3.

Uso:  python3 tools/aracura_sprites.py
Entrada: art-source/nivel3/aracura.png (mismo estilo que la lámina del sapazo; es «Parte 1»: reposo, caminar, veneno)
Salida:
  public/assets/sprites/aracura.png   cuadros iguales, grilla de 8 columnas (mapa en README.md)
  art-source/aracura/*.png            cada figura limpia en resolución original
"""
import os
from jaguar_sprites import Sheet, shrink, pack, ROOT
from sapazo_sprites import figure

SRC = os.path.join(ROOT, 'art-source/nivel3/aracura.png')
TARGET_H = 40  # araña: más baja que Xoxur

row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
IDLE_X = [(36, 110), (114, 188), (193, 266)]
WALK_X = [(290, 360), (361, 430), (431, 500)]
FIGURES = (
    [('reposo', b) for b in row(77, 152, IDLE_X) + row(179, 254, IDLE_X)]
    + [('caminar', b) for b in row(77, 152, WALK_X) + row(191, 266, WALK_X)]
    + [('veneno', b) for b in row(77, 152, [(536, 616), (627, 708), (719, 800)])]
    + [('veneno_frente', b) for b in row(77, 152, [(821, 902), (915, 996)])]
    + [('veneno_lado', b) for b in row(193, 268, [(536, 616), (629, 710), (724, 806), (820, 902), (915, 996)])]
)


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/aracura'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        f = figure(sh, box); figs.append(f); f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[0].height
    print('aracura', pack([shrink(f, scale) for f in figs], 'public/assets/sprites/aracura.png', 8), len(figs), 'cuadros, escala', round(scale, 3))


if __name__ == '__main__':
    main()
