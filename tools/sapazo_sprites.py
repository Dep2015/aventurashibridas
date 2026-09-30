"""Sprites del sapazo (sapo zombi), primer enemigo del nivel 3 (cueva).

Uso:  python3 tools/sapazo_sprites.py
Entrada: art-source/nivel3/enemigo_sapazo.webp (fondo azul con celdas celestes; el sapo no tiene azules)
Salida:
  public/assets/sprites/sapazo.png   cuadros iguales, grilla de 8 columnas (mapa en README.md)
  art-source/sapazo/*.png            cada figura limpia en resolución original

Cada cuadro es la unión de las piezas cuyo centro cae en su celda, recortadas a la celda. Se descartan las
etiquetas (F1, W1…): piezas casi todas de gris oscuro neutro (texto negro).
"""
import os
from PIL import Image
from jaguar_sprites import Sheet, shrink, pack, ROOT

SRC = os.path.join(ROOT, 'art-source/nivel3/enemigo_sapazo.webp')
TARGET_H = 50  # el sapo en reposo mide ~1 Xoxur

row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
FIGURES = (
    [('reposo', b) for b in row(111, 214, [(50, 148), (153, 252), (258, 357)]) + row(252, 356, [(50, 148), (153, 252), (258, 357)])]
    + [('caminar', b) for b in row(111, 214, [(389, 482), (484, 577), (579, 673)]) + row(270, 372, [(389, 482), (484, 577), (579, 673)])]
    + [('correr_saltar', b) for b in row(441, 545, [(48, 148), (155, 252), (260, 358), (367, 465), (470, 570), (575, 673)])]
    + [('correr_frente', b) for b in row(111, 214, [(720, 820), (826, 926), (930, 1030)])]
    + [('lengua', (1034, 111, 1176, 214)), ('lengua_2', (1180, 111, 1327, 214))]
    + [('lengua_retrae', (720, 271, 925, 375)), ('boca_explota', (948, 271, 1053, 375)),
       ('lengua_latigo', (1093, 271, 1215, 375)), ('vomito', (1222, 271, 1327, 375))]
    + [('agachado', (720, 455, 822, 560)), ('salto_alto', (830, 455, 933, 560)), ('come', (944, 455, 1081, 560)),
       ('recoger', (1110, 455, 1215, 560)), ('llama_esqueleto', (1222, 455, 1327, 560))]
    + [('danio', b) for b in row(623, 727, [(48, 148), (155, 252), (262, 360), (368, 467), (475, 572), (580, 677)])]
    + [('rodillas', (720, 623, 823, 727)), ('cae', (832, 623, 935, 727)), ('ko', (944, 623, 1047, 727))]
)


def figure(sh, box):
    """Piezas dentro de la celda (3 px adentro, sin el borde), agrupadas solo con píxeles de la celda.
    Fuera las etiquetas (casi todo gris oscuro neutro) y las motas de menos de 6 px."""
    from collections import deque
    x0, y0, x1, y1 = box[0] + 3, box[1] + 3, box[2] - 3, box[3] - 3
    cells = {(x, y) for x in range(x0, x1) for y in range(y0, y1) if sh.lab[y][x] != -1}
    seen, keep = set(), []
    for start in sorted(cells):
        if start in seen: continue
        grp = []; q = deque([start]); seen.add(start)
        while q:
            x, y = q.popleft(); grp.append((x, y))
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in cells and n not in seen: seen.add(n); q.append(n)
        dark = sum(1 for x, y in grp if max(sh.px[x, y]) < 90 and max(sh.px[x, y]) - min(sh.px[x, y]) < 30)
        if len(grp) >= 6 and not (len(grp) < 600 and dark > .7 * len(grp)): keep += grp  # etiqueta: chica y casi negra
    return sh.render(keep, set())


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/sapazo'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        f = figure(sh, box); figs.append(f); f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[0].height
    print([f.size for f in figs])
    print('sapazo', pack([shrink(f, scale) for f in figs], 'public/assets/sprites/sapazo.png', 8), len(figs), 'cuadros, escala', round(scale, 3))


if __name__ == '__main__':
    main()
