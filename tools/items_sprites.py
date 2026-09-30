"""Limpia la lámina de ítems (fondo verde con grilla) y arma public/assets/sprites/items.png.

Uso:  python3 tools/items_sprites.py art-source/items_lamina.webp
      (antes, python3 tools/xoxur_inka_sprites.py: genera el balón de gas dorado)
Salida:
  art-source/items/<nombre>.png         cada ítem limpio en resolución original (referencia)
  public/assets/sprites/items.png       hoja de 40×40 por cuadro (orden en FRAMES)

Método: se toma el color de fondo de cada recorte, se inunda desde los bordes todo lo que se
parece al fondo y ahí la transparencia se calcula según la distancia al verde (así los brillos
quedan semitransparentes); luego se "des-mezcla" el verde de los bordes y se reduce con
alfa premultiplicado para no dejar halos.
"""
import sys, os, math
from collections import deque
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'art-source/items_lamina.webp'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = 40

# nombre: (recorte en la lámina, tamaño final (ancho o alto máx.), umbral bajo, umbral alto, solo_mayor)
ITEMS = {
    'amuleto': ((40, 90, 174, 210), 30, 18, 50, False),
    'quipu':   ((196, 80, 336, 210), 32, 18, 50, True),
    'taunt':   ((358, 80, 492, 210), 32, 22, 150, False),
    'baston':  ((30, 285, 200, 472), 34, 18, 50, True),
    'choclo':  ((352, 346, 428, 396), 24, 18, 50, True),
    'casino':  ((575, 60, 955, 300), 38, 18, 45, True),
    'galleta': ((685, 330, 845, 455), 22, 18, 45, True),
    'gas':     ((160, 585, 340, 870), 32, 18, 45, True),
    'plasma':  ((625, 595, 880, 850), 32, 20, 120, False),
    'brujula': ((812, 748, 908, 866), 22, 18, 45, True),
}
FRAMES = ['amuleto', 'quipu', 'taunt', 'baston', 'choclo', 'casino', 'galleta', 'gas', 'plasma', 'brujula',
          'gas_oro', 'gas_oro_lanzado_1', 'gas_oro_lanzado_2', 'gas_oro_lanzado_3']
# ítems que ya vienen limpios de otra lámina (tools/xoxur_inka_sprites.py): nombre -> tamaño final
EXTERNAL = {'gas_oro': 32, 'gas_oro_lanzado_1': 30, 'gas_oro_lanzado_2': 30, 'gas_oro_lanzado_3': 34}

# verdes de fondo: paneles oscuros y fondo claro con grilla
BGS = [(117, 139, 100), (151, 196, 158)]

# esfera de plasma y brújula (coordenadas de la lámina)
SPHERE_C, SPHERE_R = (750, 720), 118
COMPASS = [((861, 818), 44), ((875, 764), 12)]


def dist(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def border_bg(im):
    """Color de fondo: mediana de los píxeles del borde del recorte."""
    w, h = im.size; px = im.load()
    pts = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    return tuple(sorted(p[i] for p in pts)[len(pts) // 2] for i in range(3))


def is_frame_line(p):
    """Línea del marco de los paneles: casi negra y verdosa."""
    r, g, b = p[:3]
    return g < 70 and g > r + 8 and g > b + 8


def clean(name, box, lo, hi, largest):
    sheet = Image.open(SRC).convert('RGB')
    im = sheet.crop(box); w, h = im.size; px = im.load()
    bgs = [border_bg(im)] + BGS
    nearest = lambda p: min(bgs, key=lambda c: dist(p, c))
    ox, oy = box[0], box[1]

    alpha = [[255] * w for _ in range(h)]
    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or seen[y][x]: continue
        p = px[x, y]
        d = dist(p, nearest(p))
        frame = is_frame_line(p) and (oy + y in range(442, 447) or ox + x in range(34, 38))
        if d >= hi and not frame: continue
        seen[y][x] = True
        alpha[y][x] = 0 if frame else int(255 * max(0.0, min(1.0, (d - lo) / (hi - lo))))
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # texto de la etiqueta «LLUVIA CHOCLO DE ORO»
    if name == 'baston':
        for y in range(h):
            for x in range(w):
                if ox + x >= 76 and oy + y >= 446: alpha[y][x] = 0

    out = Image.new('RGBA', (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            a = alpha[y][x]; r, g, b = px[x, y]
            if 0 < a < 255:  # quitar el verde mezclado en bordes y brillos
                f = a / 255; bg = nearest((r, g, b))
                r, g, b = (max(0, min(255, int((c - (1 - f) * cb) / f))) for c, cb in zip((r, g, b), bg))
            op[x, y] = (r, g, b, a)

    if name == 'brujula':
        for y in range(h):
            for x in range(w):
                sx, sy = ox + x, oy + y
                if not any((sx - cx) ** 2 + (sy - cy) ** 2 <= r * r for (cx, cy), r in COMPASS):
                    op[x, y] = (0, 0, 0, 0)
    if name == 'plasma':
        # la brújula tapa parte de la esfera: rellenar con el punto opuesto (la esfera es simétrica)
        cx, cy = SPHERE_C
        for y in range(h):
            for x in range(w):
                sx, sy = ox + x, oy + y
                inside_sphere = (sx - cx) ** 2 + (sy - cy) ** 2 <= (SPHERE_R + 6) ** 2
                under_compass = any((sx - ccx) ** 2 + (sy - ccy) ** 2 <= (r + 3) ** 2 for (ccx, ccy), r in COMPASS)
                if not inside_sphere:
                    op[x, y] = (0, 0, 0, 0)  # fuera del resplandor solo queda grilla
                elif under_compass:
                    mx, my = 2 * cx - sx - ox, 2 * cy - sy - oy
                    op[x, y] = op[mx, my] if 0 <= mx < w and 0 <= my < h else (0, 0, 0, 0)

    if largest:
        out = keep_largest(out)
    return out.crop(out.getbbox())


def keep_largest(im):
    """Deja solo la mancha opaca más grande (quita destellos y trozos sueltos)."""
    w, h = im.size; p = im.load()
    label = [[-1] * w for _ in range(h)]; sizes = []
    for y0 in range(h):
        for x0 in range(w):
            if label[y0][x0] != -1 or p[x0, y0][3] < 40: continue
            n = len(sizes); cnt = 0; q = deque([(x0, y0)]); label[y0][x0] = n
            while q:
                x, y = q.popleft(); cnt += 1
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and label[ny][nx] == -1 and p[nx, ny][3] >= 40:
                        label[ny][nx] = n; q.append((nx, ny))
            sizes.append(cnt)
    if not sizes: return im
    best = sizes.index(max(sizes))
    out = im.copy(); o = out.load()
    for y in range(h):
        for x in range(w):
            if label[y][x] != best:
                # conservar el borde suave que toca a la mancha principal
                near = any(0 <= x + dx < w and 0 <= y + dy < h and label[y + dy][x + dx] == best
                           for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
                if not near: o[x, y] = (0, 0, 0, 0)
    return out


def fit(im, size):
    s = size / max(im.size)
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    return im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')


def main():
    os.makedirs(os.path.join(ROOT, 'art-source/items'), exist_ok=True)
    sheet = Image.new('RGBA', (CELL * len(FRAMES), CELL))
    cleaned = {}
    for i, name in enumerate(FRAMES):
        if name in EXTERNAL:
            size = EXTERNAL[name]
            full = Image.open(os.path.join(ROOT, f'art-source/items/{name}.png')).convert('RGBA')
        else:
            box, size, lo, hi, largest = ITEMS[name]
            full = clean(name, box, lo, hi, largest)
        cleaned[name] = full
        if name not in EXTERNAL: full.save(os.path.join(ROOT, f'art-source/items/{name}.png'))
        small = fit(full, size)
        sheet.alpha_composite(small, (i * CELL + (CELL - small.width) // 2, (CELL - small.height) // 2))
        print(f'{i:2d} {name:8s} {full.size} -> {small.size}')
    sheet.save(os.path.join(ROOT, 'public/assets/sprites/items.png'))


if __name__ == '__main__':
    main()
