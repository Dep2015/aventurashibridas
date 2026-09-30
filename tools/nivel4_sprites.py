"""Hojas de sprites, objetos, decorados y baldosas del nivel 4 (el Cusco), a partir de las láminas generadas con
Higgsfield (GPT Image 2) que están en art-source/nivel4/. Usa la detección automática de lamina_auto.py.

Uso:  python3 tools/nivel4_sprites.py
Salida (public/assets/nivel4/):
  inkaxur_accion.png  golpes con el champi, escudo, quena, levantar un tesoro, rodar, daño (mapa en README.md)
  mallqui.png guerrero.png supay.png pachacutec.png npcs.png llama.png imata.png   enemigos, jefes y personajes
  items/*.png  objetos/*.png  decor/*.png   una imagen por objeto
  tiles.png    baldosas de 48 px: 0–15 Cusco de hoy, 16–31 Cusco inca, 32–47 templos
Imprime los índices de cuadro de cada fila (se usan en src/level4.js).
"""
import os
from PIL import Image
from lamina_auto import load_rows, pack_rows, shrink, grid_tiles, ROOT

SRC = lambda n: os.path.join(ROOT, 'art-source/nivel4', n + '.png')
OUT = 'public/assets/nivel4/'


def merge(a, b):
    """Junta dos figuras que la detección separó (una estela, una bola de fuego) según su lugar en la lámina."""
    x0, y0 = min(a.box[0], b.box[0]), min(a.box[1], b.box[1])
    x1, y1 = max(a.box[2], b.box[2]), max(a.box[3], b.box[3])
    im = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1))
    im.alpha_composite(a, (a.box[0] - x0, a.box[1] - y0)); im.alpha_composite(b, (b.box[0] - x0, b.box[1] - y0))
    im.box = [x0, y0, x1, y1]
    return im


def sheet(name, target_h, fix=None, ref=(0, 0), cols=8):
    rows = load_rows(SRC(name))
    if fix: rows = fix(rows)
    (fw, fh), idx, scale = pack_rows(rows, OUT + name + '.png', target_h, cols=cols, ref=ref)
    print(f'{name}: cuadro {fw}x{fh}, escala {scale}, filas {[(r[0], r[-1]) for r in idx]}')


def singles(name, names_sizes, fix=None):
    rows = load_rows(SRC(name))
    if fix: rows = fix(rows)
    figs = [f for r in rows for f in r]
    assert len(figs) == len(names_sizes), (name, len(figs), len(names_sizes))
    os.makedirs(os.path.join(ROOT, OUT, name), exist_ok=True)
    for f, (n, h) in zip(figs, names_sizes):
        shrink(f, h / f.height).save(os.path.join(ROOT, OUT, name, n + '.png'))
    print(name, [n for n, _ in names_sizes])


def fix_inkaxur(r):
    # la estela del golpe de costado salió aparte: va con el cuadro del golpe
    r[2] = [r[2][0], merge(r[2][1], r[2][2]), r[2][3]]
    return r


def fix_mallqui(r):
    r[2] = r[2][:5]  # el último es la bola de maldición que ya salió de la mano (la bola va en la fila 4)
    return r


def fix_supay(r):
    r[2] = [r[2][0], merge(r[2][1], r[2][2]), r[2][3], r[2][4], r[2][5]]  # la última bola de fuego va sola
    return r


def group_close(figs, gap=30):
    """Junta las figuras que quedaron cerca (una explosión con chispas sueltas se detecta en pedazos)."""
    out = []
    for f in sorted(figs, key=lambda f: f.box[0]):
        if out and f.box[0] - out[-1].box[2] < gap: out[-1] = merge(out[-1], f)
        else: out.append(f)
    return out


def group_k(figs, k):
    """Agrupa los pedazos en k cuadros según su posición horizontal (k-medias en una dimensión)."""
    cx = [(f.box[0] + f.box[2]) / 2 for f in figs]
    lo, hi = min(cx), max(cx)
    cent = [lo + (hi - lo) * i / (k - 1) for i in range(k)]
    for _ in range(20):
        groups = [[] for _ in range(k)]
        for f, x in zip(figs, cx): groups[min(range(k), key=lambda i: abs(x - cent[i]))].append((f, x))
        cent = [sum(x for _, x in g) / len(g) if g else cent[i] for i, g in enumerate(groups)]
    out = []
    for g in groups:
        if not g: continue
        m = g[0][0]
        for f, _ in g[1:]: m = merge(m, f)
        out.append(m)
    return out


def fix_fantasma(r):
    r[2] = group_k(r[2], 5)
    return r


def fix_items(r):
    r[0] = [merge(r[0][0], r[0][1])] + r[0][2:]  # el brillo del cetro
    return r


def projectile(name, figs, h, out):
    """Proyectil en su propia hoja: cuadros iguales con la figura centrada (así el cuerpo de choque coincide)."""
    sm = [shrink(f, h / f.height) for f in figs]
    fw = max(f.width for f in sm) + 2; fh = max(f.height for f in sm) + 2
    im = Image.new('RGBA', (fw * len(sm), fh))
    for i, f in enumerate(sm): im.alpha_composite(f, (i * fw + (fw - f.width) // 2, (fh - f.height) // 2))
    im.save(os.path.join(ROOT, OUT, out))
    print(name, 'proyectil', fw, fh)


def projectiles():
    rows = load_rows(SRC('supay')); projectile('bola de fuego', rows[4][-2:], 34, 'bola_fuego.png')
    rows = load_rows(SRC('mallqui')); projectile('orbe', rows[4], 30, 'orbe.png')


def main():
    # Inkaxur: la escala sale del cuadro con el escudo de frente (fila 3, primero): 54 px, como en el mapa
    sheet('inkaxur_accion', 54, fix_inkaxur, ref=(3, 0), cols=6)
    sheet('mallqui', 62, fix_mallqui)
    sheet('guerrero', 84)
    sheet('supay', 150, fix_supay)
    sheet('pachacutec', 168)
    sheet('npcs', 58, cols=3)
    # zombis de las calles (los del nivel 1, ahora con ataques)
    sheet('llama', 60)
    if os.path.exists(SRC('imata')): sheet('imata', 58)
    if os.path.exists(SRC('fantasma')): sheet('fantasma', 62, fix_fantasma)
    singles('items', [('cetro_choclo', 64), ('chakana', 60), ('quena', 60), ('champi', 60),
                      ('escudo', 56), ('llave', 48), ('llave_jefe', 60), ('mullu', 44)], fix_items)
    singles('objetos', [('bloque', 60), ('placa', 34), ('placa_on', 34), ('espejo', 70), ('brasero', 52), ('brasero_on', 66),
                        ('cofre', 50), ('cofre_abierto', 58), ('puerta_sol', 104), ('puerta_abierta', 104), ('puerta_choclo', 104), ('puerta_llave', 104),
                        ('escalera', 96), ('piedra_tiempo', 86), ('disco_pedestal', 90), ('muro_roto', 96), ('portal', 70)])
    singles('decor', [('fuente', 190), ('catedral', 330), ('casa', 190), ('eucalipto', 170), ('molle', 140),
                      ('llama_oro', 90), ('maiz_oro', 96), ('disco_sol', 150), ('trono', 110),
                      ('carreta', 90), ('farol', 110), ('paqcha', 100)])
    # baldosas: 3 láminas de 4×4 → una hoja de 48 px
    tiles = []
    for n in ('tiles_presente', 'tiles_pasado', 'tiles_templos'): tiles += grid_tiles(SRC(n), 4, 48)
    t = Image.new('RGB', (48 * 16, 48 * 3))
    for i, im in enumerate(tiles): t.paste(im, ((i % 16) * 48, (i // 16) * 48))
    t.save(os.path.join(ROOT, OUT, 'tiles.png'))
    print('tiles', len(tiles))
    projectiles()


if __name__ == '__main__':
    main()
