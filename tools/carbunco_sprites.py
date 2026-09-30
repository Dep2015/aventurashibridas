"""Sprites de El Carbunco (zorro guerrero zombi con gema en la frente), nivel 3.

Uso:  python3 tools/carbunco_sprites.py
Entrada: art-source/nivel3/el_carbunco.webp (celdas verde oliva con grilla clara)
Salida:
  public/assets/sprites/carbunco.png        cuadros iguales, grilla de 8 columnas (mapa en README.md)
  public/assets/sprites/carbunco_rayo.png   rayo de la gema (para usar como proyectil)
  art-source/carbunco/*.png                 cada figura limpia en resolución original

Se quita el verde oliva de las celdas y sus líneas; los acercamientos a la cara pegados a algunas celdas se borran.
"""
import os
from PIL import Image
import amaru_sprites as am

ROOT = am.ROOT
SRC = os.path.join(ROOT, 'art-source/nivel3/el_carbunco.webp')
OLIVE = [(101, 110, 64), (100, 112, 68), (104, 110, 66), (97, 108, 60), (116, 128, 80), (110, 120, 74),
         (122, 134, 86), (92, 102, 58)]
TARGET_H = 100  # en reposo (con la lanza) mide casi 2 Xoxur: tamaño de jefe
INSET = 3       # el borde negro de cada celda

C6 = [(23, 103), (104, 183), (184, 262), (263, 342), (343, 422), (423, 503)]
row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
FIGURES = (
    [('reposo', b) for b in row(64, 158, C6)]
    + [('caminar', b) for b in row(197, 292, C6)]
    + [('correr', b) for b in row(337, 434, C6)]
    + [('salto', b) for b in row(478, 608, [(23, 104), (105, 199), (200, 326), (327, 421), (422, 503)])]
    + [('huesos', (23, 658, 104, 770)), ('lanza', (116, 658, 208, 770)),
       ('rayo_carga', (221, 658, 290, 770)), ('rayo_dispara', (290, 658, 410, 770)), ('provocacion', (421, 658, 503, 770))]
    + [('golpe_frente', (22, 813, 94, 882)), ('golpe_espalda', (103, 813, 175, 882)),
       ('golpe_frente_2', (22, 913, 94, 1000)), ('golpe_espalda_2', (103, 913, 175, 1000)),
       ('rafaga_rayos', (190, 813, 331, 995)), ('rodillas', (345, 813, 418, 882)), ('ko', (428, 813, 503, 882))]
)
# acercamientos a la cara que tapan parte de algunas celdas
ERASE = [(417, 178, 464, 230), (423, 311, 492, 352), (352, 712, 410, 770), (193, 816, 248, 872)]


def drop_specks(img, min_size=40):
    """Quita piezas sueltas chicas (restos de la grilla) y píxeles semitransparentes aislados."""
    from collections import deque
    p = img.load(); w, h = img.size; seen = set()
    for sy in range(h):
        for sx in range(w):
            if (sx, sy) in seen or p[sx, sy][3] == 0: continue
            pts = []; q = deque([(sx, sy)]); seen.add((sx, sy))
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)):
                    if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and p[n][3] > 0: seen.add(n); q.append(n)
            if len(pts) < min_size:
                for pt in pts: p[pt] = (0, 0, 0, 0)
    return img.crop(img.getbbox())


def main():
    im = Image.open(SRC).convert('RGB')
    px = im.load()
    for x0, y0, x1, y1 in ERASE:  # los acercamientos se pintan del verde de la celda antes de recortar
        for y in range(y0, y1):
            for x in range(x0, x1): px[x, y] = OLIVE[0]
    out = os.path.join(ROOT, 'art-source/carbunco'); os.makedirs(out, exist_ok=True)
    # umbral fino: el pelaje gris verdoso se parece a la celda; con más margen se volvía semitransparente
    # y al quitarle el verde quedaba morado
    am.LO, am.HI = 5, 14
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        box = (box[0] + INSET, box[1] + INSET, box[2] - INSET, box[3] - INSET)
        f = drop_specks(am.clean(im, box, OLIVE, erase_all=ERASE)); figs.append(f)
        f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[0].height
    print([f.size for f in figs])
    print('carbunco', am.pack([am.resize(f, scale) for f in figs], 'public/assets/sprites/carbunco.png', 8), len(figs), 'cuadros, escala', round(scale, 3))
    # rayo suelto: la parte cian del cuadro «dispara»
    ray = figs[FIGURES.index(next(f for f in FIGURES if f[0] == 'rayo_dispara'))]
    beam = am.pick(ray, (0, 0, ray.width, ray.height // 2),
                   lambda r, g, b: g > r + 60 and b > r + 40)
    beam.save(os.path.join(out, 'rayo.png'))
    print('carbunco_rayo', am.pack([am.resize(beam, scale)], 'public/assets/sprites/carbunco_rayo.png', 1))


if __name__ == '__main__':
    main()
