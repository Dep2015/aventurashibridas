"""Fondos, nubes y elementos del nivel 2 (atmósfera contaminada, tormentas).

Uso:  python3 tools/nivel2_fondos.py
Entrada: art-source/nivel2/fondos.webp (5 capas de paralaje) y art-source/nivel2/nubes.webp (nubes negras,
         eléctricas y de granizo)
Salida (a resolución original; el juego las escala como las capas del nivel 1):
  public/assets/nivel2/fondos/cielo.png, montanas_lejanas.png, montanas_cercanas.png, nubes_bajas.png, piso.png
  public/assets/nivel2/nubes/<tipo>_<pieza>.png  (negra_*, electrica_*, granizo_*)

Capas opacas (cielo, piso, rayo, baldosa de hielo, texturas de lluvia) se recortan tal cual.
El resto se recorta quitando el fondo de la lámina (amaru_sprites.clean) y borrando los títulos.
"""
import os
from PIL import Image
import amaru_sprites as am

ROOT = am.ROOT
OUT = os.path.join(ROOT, 'public/assets/nivel2')
GREEN = [(144, 186, 144), (150, 192, 150), (138, 180, 140), (160, 200, 160), (126, 170, 132), (154, 198, 156)]
GREY = [(182, 200, 212), (170, 188, 202), (160, 176, 192), (150, 166, 182), (190, 206, 218), (176, 194, 208)]

# (archivo, nombre, recuadro, opaco, rectángulos a borrar del todo)
FONDOS = [
    ('fondos', 'cielo', (40, 70, 986, 198), True, []),
    ('fondos', 'montanas_lejanas', (36, 204, 990, 372), False, [(32, 208, 402, 248)]),  # sin el título
    ('fondos', 'montanas_cercanas', (36, 326, 990, 514), False,
     [(32, 380, 410, 418),                                  # título «MONTANAS CERCANAS»
      (36, 326, 581, 372), (621, 326, 681, 372), (793, 326, 990, 372)]),  # base de las montañas lejanas
    ('fondos', 'nubes_bajas', (36, 546, 990, 710), False, [(32, 548, 380, 590)]),
    ('fondos', 'piso', (36, 736, 990, 874), False, [(32, 726, 245, 764), (650, 736, 990, 772)]),
]
N = 'nubes'
NUBES = (
    [(N, f'negra_{i + 1}', b, False, []) for i, b in enumerate(
        [(38, 43, 243, 142), (248, 43, 457, 142), (38, 148, 243, 250), (248, 148, 457, 250)])]
    + [(N, 'negra_borde_izq', (36, 284, 138, 478), False, []), (N, 'negra_grande', (142, 284, 352, 462), False, []),
       (N, 'negra_borde_der', (354, 284, 458, 478), False, [])]
    + [(N, f'negra_chica_{i + 1}', b, False, []) for i, b in enumerate(
        [(50, 500, 124, 550), (138, 492, 344, 558), (356, 494, 452, 558)])]
    + [(N, 'negra_franja_arriba', (36, 587, 458, 660), True, []), (N, 'negra_franja_abajo', (36, 672, 458, 750), True, [])]
    + [(N, f'electrica_{i + 1}', b, False, []) for i, b in enumerate(
        [(493, 43, 702, 142), (703, 43, 912, 142), (493, 148, 702, 250), (703, 148, 912, 250)])]
    + [(N, 'electrica_borde_izq', (492, 284, 594, 478), False, []), (N, 'electrica_grande', (598, 284, 808, 464), False, []),
       (N, 'electrica_borde_der', (810, 284, 916, 478), False, [])]
    + [(N, f'electrica_chica_{i + 1}', b, False, []) for i, b in enumerate(
        [(498, 486, 590, 568), (602, 486, 694, 568), (706, 486, 802, 568), (810, 486, 912, 572)])]
    + [(N, 'electrica_franja', (492, 585, 916, 654), False, []), (N, 'rayo', (658, 669, 750, 750), True, [])]
    + [(N, f'granizo_{i + 1}', b, False, []) for i, b in enumerate(
        [(950, 43, 1160, 142), (1162, 43, 1372, 142), (950, 148, 1160, 250), (1162, 148, 1372, 250)])]
    + [(N, 'granizo_nube_lluvia', (955, 284, 1054, 382), False, []), (N, 'granizo_bolas', (1066, 288, 1154, 372), False, []),
       (N, 'granizo_bolas_2', (1172, 292, 1254, 366), False, []), (N, 'granizo_nube_clara', (1268, 290, 1372, 372), False, []),
       (N, 'granizo_racimo', (972, 402, 1040, 458), False, []), (N, 'granizo_nube_chica', (1062, 404, 1154, 448), False, []),
       (N, 'granizo_baldosa_hielo', (953, 483, 1054, 574), True, []), (N, 'granizo_franja_carambanos', (950, 584, 1373, 652), False, [])]
    + [(N, f'granizo_lluvia_{i + 1}', b, True, []) for i, b in enumerate(
        [(952, 670, 1055, 750), (1057, 670, 1161, 750), (1163, 670, 1266, 750)])]
)


# donde se cruzan las dos capas de montañas (pico y santuario cercanos sobre la base de las lejanas) se separan
# por color: las cercanas son roca parda y dorado (cálidas); las lejanas, moradas y verde oscuro
OVERLAP = [(682, 326, 792, 376), (582, 352, 620, 376)]
warm = lambda p: p[0] > p[2] + 6 or (p[0] * 3 + p[1] * 6 + p[2]) / 10 > 82  # roca parda/clara o dorado


def fix_divider(im):
    """La lámina tiene una línea vertical clara pintada en x=509–513 (división del panel): se tapa con los vecinos."""
    px = im.load()
    for y in range(im.height):
        for x in range(509, 514):
            px[x, y] = px[508, y] if x <= 511 else px[514, y]


def drop_grid_lines(img):
    """Quita los restos de la grilla que quedan alrededor de las piezas recortadas:
    píxeles semitransparentes sin ningún vecino opaco (las líneas finas quedan medio transparentes)
    y piezas finas y rectas (1–3 px de grosor)."""
    from collections import deque
    p = img.load(); w, h = img.size
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] >= 230
    for y in range(h):
        for x in range(w):
            a = p[x, y][3]
            if 0 < a < 230 and not any(solid(x + i, y + j) for i in (-1, 0, 1) for j in (-1, 0, 1)):
                p[x, y] = (0, 0, 0, 0)
    seen = set()
    for sy in range(h):
        for sx in range(w):
            if (sx, sy) in seen or p[sx, sy][3] == 0: continue
            pts = []; q = deque([(sx, sy)]); seen.add((sx, sy))
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and p[n][3] > 0: seen.add(n); q.append(n)
            xs = [a for a, _ in pts]; ys = [b for _, b in pts]
            bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            if min(bw, bh) <= 3 and max(bw, bh) >= 10:
                for pt in pts: p[pt] = (0, 0, 0, 0)
    return img.crop(img.getbbox())


def only(im, keep_warm):
    """Copia de la lámina donde, en la zona de cruce, se pinta de fondo lo que no es de esa capa."""
    im = im.copy(); px = im.load()
    for x0, y0, x1, y1 in OVERLAP:
        for y in range(y0, y1):
            for x in range(x0, x1):
                if warm(px[x, y]) != keep_warm: px[x, y] = GREEN[0]
    return im


def fill_holes(img, box):
    """Huecos que dejó el pico cercano en la base de las montañas lejanas: se rellenan con el color de la
    misma montaña a su izquierda (solo debajo de la silueta, donde hay montaña por encima)."""
    p = img.load(); ox, oy = box[0], box[1]
    for x0, y0, x1, y1 in OVERLAP:
        for x in range(max(0, x0 - ox), min(img.width, x1 - ox + 4)):
            top = next((y for y in range(img.height) if p[x, y][3] > 200), None)
            if top is None: continue
            for y in range(max(top, y0 - oy), img.height):
                if p[x, y][3] < 200:
                    lx = x - 1
                    while lx > 0 and p[lx, y][3] < 200: lx -= 1
                    p[x, y] = p[lx, y]


def main():
    src = {k: Image.open(os.path.join(ROOT, f'art-source/nivel2/{k}.webp')).convert('RGB') for k in ('fondos', 'nubes')}
    fix_divider(src['fondos'])
    layer_src = {'montanas_lejanas': only(src['fondos'], False), 'montanas_cercanas': only(src['fondos'], True)}
    for sub, items in (('fondos', FONDOS), ('nubes', NUBES)):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
        for sheet, name, box, opaque, erase in items:
            im = layer_src.get(name, src[sheet])
            if opaque:
                out = im.crop(box).convert('RGBA')
            else:
                bgs = GREEN if sheet == 'fondos' else GREY
                # el granizo claro se parece al fondo gris: umbral más fino
                am.LO, am.HI = (10, 26) if name.startswith('granizo_') else (14, 34)
                out = am.clean(im, box, bgs, erase_all=erase)
                if sheet == 'nubes': out = drop_grid_lines(out)
            if name == 'montanas_lejanas': fill_holes(out, box)
            out.save(os.path.join(OUT, sub, name + '.png'))
            print(f'{sub}/{name}', out.size)


if __name__ == '__main__':
    main()
