"""Fondos, tiles y elementos del nivel 3 (cueva).

Uso:  python3 tools/nivel3_fondos.py
Entrada: art-source/nivel3/fondos.webp (capas de paralaje, fondo verde) y art-source/nivel3/elementos.webp
         (tiles y piezas de cueva, fondo azul con celdas)
Salida en public/assets/nivel3/:
  fondos/    cielo_montanas.png, fondo_rocoso.png (opacos), vasijas.png, puente_roto.png, piso.png
  cueva/     paredes, piso, estalactitas, estalagmitas, río subterráneo, puentes (cuerda y piedra)
  bloques/   ladrillos, bloque de moneda, bloque usado, piedra
  objetos/   cristal, vasija, raíces, farol, huesos
Las casas, el puesto y la llama de la lámina no se usan (el usuario no quiere casas).
"""
import os
from PIL import Image
import amaru_sprites as am
from nivel2_fondos import drop_grid_lines

ROOT = am.ROOT
OUT = os.path.join(ROOT, 'public/assets/nivel3')
GREEN = [(151, 190, 149), (145, 190, 150), (165, 204, 163), (140, 184, 144), (158, 198, 156)]
# solo el azul de las celdas: la roca de las estalactitas es gris azulada y se borraría (las líneas de la grilla
# se quitan aparte con drop_grid_lines y, en las piezas opacas, con clear_cell_lines)
BLUE = [(44, 85, 110), (37, 76, 102), (40, 75, 100), (41, 78, 102), (47, 91, 115), (52, 96, 122), (100, 159, 187)]
LINE = (59, 105, 133)

# (hoja, carpeta, nombre, recuadro, opaco)
PIECES = [
    ('fondos', 'fondos', 'cielo_montanas', (41, 61, 983, 253), True),
    ('fondos', 'fondos', 'fondo_rocoso', (41, 296, 983, 568), True),  # abajo asoman los postes del puente
    ('fondos', 'fondos', 'vasijas', (20, 636, 500, 758), False),
    ('fondos', 'fondos', 'puente_roto', (516, 603, 1004, 758), False),  # sin la base del fondo rocoso ni la línea divisoria
    ('fondos', 'fondos', 'piso', (20, 815, 1005, 904), False),

    ('elementos', 'cueva', 'estalactitas', (41, 291, 172, 404), False),
    ('elementos', 'cueva', 'pared', (178, 291, 509, 404), True),
    ('elementos', 'cueva', 'estalagmitas', (41, 446, 172, 511), False),
    ('elementos', 'cueva', 'piso_lodo', (178, 446, 509, 511), True),
    ('elementos', 'cueva', 'formaciones', (41, 549, 172, 764), False),
    ('elementos', 'cueva', 'caverna_charco', (178, 549, 509, 764), True),
    ('elementos', 'cueva', 'rio_subterraneo', (41, 798, 509, 991), True),
    ('elementos', 'cueva', 'puente_cuerda', (516, 560, 988, 764), False),
    ('elementos', 'cueva', 'puente_piedra', (516, 798, 988, 877), False),

    ('elementos', 'bloques', 'ladrillo', (516, 261, 578, 324), True),
    ('elementos', 'bloques', 'bloque_moneda', (583, 261, 645, 324), True),
    ('elementos', 'bloques', 'ladrillo_2', (650, 261, 712, 324), True),
    ('elementos', 'bloques', 'ladrillo_3', (717, 261, 779, 324), True),
    ('elementos', 'bloques', 'bloque_usado', (784, 261, 846, 324), True),
    ('elementos', 'bloques', 'piedra', (516, 331, 578, 400), True),
    ('elementos', 'bloques', 'piedra_2', (583, 331, 645, 400), True),
    ('elementos', 'bloques', 'columna', (919, 333, 985, 511), False),

    ('elementos', 'objetos', 'cristal', (518, 913, 596, 990), False),
    ('elementos', 'objetos', 'vasija', (612, 913, 704, 990), False),
    ('elementos', 'objetos', 'raices', (708, 913, 802, 990), False),
    ('elementos', 'objetos', 'farol', (810, 913, 898, 990), False),
    ('elementos', 'objetos', 'huesos', (905, 913, 986, 990), False),
]


def patch(im):
    """Arreglos antes de recortar: el recuadro «Vistas de Caverna» tapa la esquina del fondo rocoso (se rellena
    con la roca de justo debajo, en espejo) y el rótulo del piso se tapa con el mismo piso más a la derecha."""
    f = im['fondos']; px = f.load()
    for y in range(f.height):  # línea divisoria clara del panel (x 510–513)
        for x in range(509, 515): px[x, y] = px[508, y] if x <= 511 else px[515, y]
    for y in range(296, 334):
        for x in range(853, 984):
            px[x, y] = px[x, 334 + (334 - y)]
    for y in range(878, 904):
        for x in range(28, 420):
            px[x, y] = px[x + 420, y]


def clear_cell_lines(img):
    """En piezas opacas hechas de varias celdas, repinta las columnas/filas de línea de celda con la vecina."""
    p = img.load(); w, h = img.size
    line = lambda c: c[2] > c[0] + 18 and c[1] > c[0] + 12  # azulado (las líneas; la roca es gris neutro)
    cols = [x for x in range(w) if sum(line(p[x, y]) for y in range(h)) > h * .5]
    rows = [y for y in range(h) if sum(line(p[x, y]) for x in range(w)) > w * .5]
    for x in cols:
        src = x - 1
        while src in cols and src > 0: src -= 1
        for y in range(h): p[x, y] = p[src, y]
    for y in rows:
        src = y - 1
        while src in rows and src > 0: src -= 1
        for x in range(w): p[x, y] = p[x, src]
    return img


def main():
    src = {k: Image.open(os.path.join(ROOT, f'art-source/nivel3/{k}.webp')).convert('RGB') for k in ('fondos', 'elementos')}
    patch(src)
    for sheet, sub, name, box, opaque in PIECES:
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
        if opaque:
            out = src[sheet].crop(box).convert('RGBA')
            if sheet == 'elementos': out = clear_cell_lines(out)
        else:
            am.LO, am.HI = (14, 34) if sheet == 'fondos' else (10, 26)
            out = am.clean(src[sheet], box, GREEN if sheet == 'fondos' else BLUE)
            if sheet == 'elementos': out = drop_grid_lines(out)
        out.save(os.path.join(OUT, sub, name + '.png'))
        print(f'{sub}/{name}', out.size)


if __name__ == '__main__':
    main()
