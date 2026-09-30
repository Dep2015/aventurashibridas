"""Sprites del jefe final del nivel 3: Muqui Z, minero zombi (casco con linterna, farol, pico y puño de humo).

Uso:  python3 tools/minero_sprites.py
Entrada: art-source/nivel3/jefe_minero.webp (mismo estilo que las láminas del sapazo y de Tulixta)
Salida:
  public/assets/sprites/minero.png        cuadros iguales, grilla de 8 columnas (mapa en README.md)
  public/assets/sprites/minero_pico.png   pico lanzado (proyectil)
  art-source/minero/*.png                 cada figura limpia en resolución original

Tamaño: el jefe mide 4 veces a Xoxur (54 px) → 216 px de alto en reposo.
"""
import os
from jaguar_sprites import Sheet, shrink, pack, ROOT
from sapazo_sprites import figure

SRC = os.path.join(ROOT, 'art-source/nivel3/jefe_minero.webp')
TARGET_H = 4 * 54

row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
IDLE_X = [(63, 209), (216, 361), (368, 515)]
WALK_X = [(559, 697), (698, 836), (837, 975)]
FIGURES = (
    [('reposo', b) for b in row(158, 310, IDLE_X) + row(363, 515, IDLE_X)]
    + [('caminar', b) for b in row(158, 310, WALK_X) + row(387, 540, WALK_X)]
    + [('correr', b) for b in row(636, 790, [(63, 207), (218, 362), (373, 517), (528, 672), (677, 825), (828, 975)])]
    + [('salto', b) for b in row(892, 1046, [(63, 207), (218, 362), (373, 517), (531, 673), (688, 826), (840, 978)])]
    + [('puno_humo', b) for b in row(158, 310, [(1043, 1198), (1219, 1374), (1396, 1552)])]
    + [('impacto_puno', (1593, 158, 1748, 310)), ('farol', (1771, 158, 1928, 310))]
    + [('golpe_farol', b) for b in row(390, 543, [(1043, 1198), (1224, 1380), (1406, 1562), (1591, 1746), (1772, 1928)])]
    + [('danio', b) for b in row(657, 810, [(1043, 1192), (1206, 1354), (1369, 1482), (1497, 1611)])]
    + [('lanza_pico', b) for b in row(900, 1055, [(1043, 1202), (1218, 1378), (1571, 1731), (1747, 1907)])]
)
PICO = (1395, 900, 1555, 1055)


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/minero'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        f = figure(sh, box); figs.append(f); f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[0].height
    print('minero', pack([shrink(f, scale) for f in figs], 'public/assets/sprites/minero.png', 8), len(figs), 'cuadros, escala', round(scale, 3))
    pico = figure(sh, PICO); pico.save(os.path.join(out, 'pico.png'))
    print('minero_pico', pack([shrink(pico, scale)], 'public/assets/sprites/minero_pico.png', 1))


if __name__ == '__main__':
    main()
