"""Sprites del jefe del nivel 2: Amaru Alado Zombi.

Uso:  python3 tools/amaru_sprites.py
Entrada (art-source/amaru/):
  amaru_poses.webp          7 poses sobre un tablero crema (falsa transparencia pintada)
  amaru_vuelo_ataques.png   vuelo y ataques (niebla + puntas de hielo, aliento), con marco y rótulo
  amaru_granizo.png         granizo viscoso verde (celda con fondo blanco y etiqueta «W4»)
Salida:
  public/assets/sprites/amaru.png         cuadros iguales, grilla de 3 columnas (mapa en README.md)
  public/assets/sprites/amaru_ataques.png 0 niebla radiactiva, 1 punta de hielo, 2 granizo verde, 3 lluvia de granizo
  art-source/amaru/limpio/*.png           cada figura limpia en resolución original

Tamaño: el jefe mide 4 veces a Xoxur (54 px) → 216 px de alto en su pose de vuelo.
"""
import os, math
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'art-source/amaru')
BOSS_H = 4 * 54
LO, HI = 16, 44

POSES = {  # imagen 1: recortes de cada pose; las montañitas decorativas se ignoran
    'src': 'amaru_poses.webp', 'bg': [(224, 218, 206), (242, 238, 225), (240, 240, 225)],
    'ignore': [(812, 236, 915, 318), (1262, 236, 1365, 320)],
    'poses': [
        ('vuelo',       (22, 24, 478, 356)),
        ('avance',      (520, 34, 908, 380)),
        ('aliento',     (930, 44, 1392, 382)),
        ('garras',      (4, 410, 384, 736)),
        ('enroscado',   (390, 462, 690, 736)),
        ('alas',        (730, 474, 1062, 750)),
        ('derrotado',   (1060, 618, 1400, 742)),
    ],
}
ATAQUES = {  # imagen 2: marco azul arriba, rótulo abajo a la izquierda
    'src': 'amaru_vuelo_ataques.png', 'bg': [(218, 212, 196), (236, 236, 218), (230, 226, 212)],
    'ignore': [],
    'erase': [(10, 159, 283, 183)],  # rótulo «ROW 2: FLIGHT FORWARD (HORIZONTAL)»
    'erase_all': [(421, 100, 476, 158), (656, 100, 712, 150)],  # montañitas (la cola no llega hasta ahí)
    'poses': [
        ('vuelo2',          (4, 9, 240, 168)),
        ('niebla_hielo',    (240, 9, 492, 176)),
        ('aliento_helado',  (484, 9, 718, 182)),
    ],
}
GRANIZO = {'src': 'amaru_granizo.png', 'bg': [(246, 246, 246), (240, 240, 240)], 'erase': [(94, 66, 119, 88)],
           'box': (3, 10, 118, 80)}


def dist(a, b): return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def clean(im, box, bgs, ignore=(), erase=(), erase_all=()):
    """Quita el fondo (tablero) de un recorte. Devuelve RGBA en coordenadas del recorte."""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0; px = im.load()
    near = lambda p: min(dist(p, c) for c in bgs)
    col = lambda x, y: px[x0 + x, y0 + y]
    erased = lambda x, y: any(a <= x0 + x <= c and b <= y0 + y <= d for a, b, c, d in erase_all) or (any(a <= x0 + x <= c and b <= y0 + y <= d for a, b, c, d in erase) and max(col(x, y)) - min(col(x, y)) < 30) \
        or (any(a <= x0 + x <= c and b <= y0 + y <= d for a, b, c, d in ignore)
            and not (col(x, y)[1] > col(x, y)[2] + 6 and col(x, y)[1] >= col(x, y)[0]))  # montaña: solo queda el verde de la cola
    alpha = [[255] * w for _ in range(h)]; bg = [[False] * w for _ in range(h)]
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or bg[y][x]: continue
        p = col(x, y); d = near(p)
        if d >= HI and not erased(x, y): continue
        bg[y][x] = True
        alpha[y][x] = 0 if erased(x, y) else int(255 * max(0, min(1, (d - LO) / (HI - LO))))
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # huecos encerrados del color del tablero (entre las vueltas de la cola, en las alas)
    seen = [[False] * w for _ in range(h)]
    for sy in range(h):
        for sx in range(w):
            if bg[sy][sx] or seen[sy][sx] or near(col(sx, sy)) > 12: continue
            pts = []; q = deque([(sx, sy)]); seen[sy][sx] = True
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and not seen[ny][nx] and near(col(nx, ny)) <= 24:
                        seen[ny][nx] = True; q.append((nx, ny))
            if len(pts) > 20:
                for (x, y) in pts: alpha[y][x] = 0
    # componentes: fuera las montañitas y las motas sueltas muy chicas
    lab = [[-1] * w for _ in range(h)]; keep = set(); n = 0
    for sy in range(h):
        for sx in range(w):
            if alpha[sy][sx] < 60 or lab[sy][sx] != -1: continue
            pts = []; q = deque([(sx, sy)]); lab[sy][sx] = n
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and alpha[ny][nx] >= 60 and lab[ny][nx] == -1:
                        lab[ny][nx] = n; q.append((nx, ny))
            xs = [x0 + p[0] for p in pts]; ys = [y0 + p[1] for p in pts]
            inside = any(min(xs) >= a and min(ys) >= b and max(xs) <= c and max(ys) <= d for a, b, c, d in ignore)
            if not inside and len(pts) >= 8: keep.add(n)
            n += 1
    out = Image.new('RGBA', (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            a = alpha[y][x]
            if a == 0: continue
            own = lab[y][x] in keep or (lab[y][x] == -1 and any(
                0 <= x + dx < w and 0 <= y + dy < h and lab[y + dy][x + dx] in keep for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)))
            if not own: continue
            r, g, b = col(x, y)
            if a < 255:
                f = a / 255; c = min(bgs, key=lambda k: dist((r, g, b), k))
                r, g, b = (max(0, min(255, int((v - (1 - f) * k) / f))) for v, k in zip((r, g, b), c))
            op[x, y] = (r, g, b, a)
    return out.crop(out.getbbox())


def pick(im, rect, test):
    """Copia los píxeles de un rectángulo de una figura limpia que cumplan test(r, g, b) (para separar efectos)."""
    out = Image.new('RGBA', im.size); p, o = im.load(), out.load()
    x0, y0, x1, y1 = rect
    for y in range(max(0, y0), min(im.height, y1)):
        for x in range(max(0, x0), min(im.width, x1)):
            if p[x, y][3] and test(*p[x, y][:3]): o[x, y] = p[x, y]
    return out.crop(out.getbbox())


def largest(im):
    """Solo la mancha opaca más grande."""
    w, h = im.size; p = im.load(); seen = set(); best = []
    for sy in range(h):
        for sx in range(w):
            if (sx, sy) in seen or p[sx, sy][3] < 60: continue
            pts = []; q = deque([(sx, sy)]); seen.add((sx, sy))
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and p[n][3] >= 60: seen.add(n); q.append(n)
            if len(pts) > len(best): best = pts
    keep = set(best); out = Image.new('RGBA', im.size); o = out.load()
    for y in range(h):
        for x in range(w):
            if p[x, y][3] and any((x + dx, y + dy) in keep for dx in (-1, 0, 1) for dy in (-1, 0, 1)): o[x, y] = p[x, y]
    return out.crop(out.getbbox())


def resize(im, s):
    return im.convert('RGBa').resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS).convert('RGBA')


def pack(frames, path, cols):
    FW = -(-max(f.width for f in frames) // 4) * 4; FH = -(-max(f.height for f in frames) // 4) * 4
    rows = -(-len(frames) // cols); sheet = Image.new('RGBA', (FW * cols, FH * rows))
    for i, f in enumerate(frames):  # centrado y apoyado abajo
        sheet.alpha_composite(f, ((i % cols) * FW + (FW - f.width) // 2, (i // cols) * FH + FH - f.height))
    sheet.save(os.path.join(ROOT, path)); return FW, FH


def main():
    out = os.path.join(A, 'limpio'); os.makedirs(out, exist_ok=True)
    figs = {}
    for cfg in (POSES, ATAQUES):
        im = Image.open(os.path.join(A, cfg['src'])).convert('RGB')
        for name, box in cfg['poses']:
            figs[name] = clean(im, box, cfg['bg'], cfg.get('ignore', ()), cfg.get('erase', ()), cfg.get('erase_all', ()))
            figs[name].save(os.path.join(out, name + '.png')); print(name, figs[name].size)
    g = GRANIZO; im = Image.open(os.path.join(A, g['src'])).convert('RGB')
    granizo = clean(im, g['box'], g['bg'], (), g['erase']); granizo.save(os.path.join(out, 'granizo.png'))

    # escala: el vuelo de la imagen 1 mide 4 Xoxur de alto; la imagen 2 se lleva a la misma escala
    s1 = BOSS_H / figs['vuelo'].height
    s2 = s1 * figs['vuelo'].height / figs['vuelo2'].height
    order = [('vuelo', s1), ('avance', s1), ('aliento', s1), ('garras', s1), ('enroscado', s1),
             ('alas', s1), ('derrotado', s1), ('niebla_hielo', s2), ('aliento_helado', s2)]
    print('amaru', pack([resize(figs[k], s) for k, s in order], 'public/assets/sprites/amaru.png', 3), 'escalas', round(s1, 3), round(s2, 3))

    # ataques sueltos (recuadros en la imagen original): niebla verde del hocico, una punta de hielo, granizo
    im2 = Image.open(os.path.join(A, ATAQUES['src'])).convert('RGB')
    only = lambda img, test: pick(img, (0, 0, img.width, img.height), test)
    niebla = only(clean(im2, (244, 76, 298, 134), ATAQUES['bg']), lambda r, g, b: g > r + 25 and g > b + 25)
    hielo = largest(only(clean(im2, (286, 10, 500, 124), ATAQUES['bg']), lambda r, g, b: b > r + 15 and b > 140))
    blob = largest(clean(im, (84, 26, 118, 66), g['bg']))
    for n, f in zip(['niebla', 'punta_hielo', 'granizo_bola'], [niebla, hielo, blob]): f.save(os.path.join(out, n + '.png'))
    fx = [resize(niebla, s2 * 1.2), resize(hielo, s2), resize(blob, 1.3), resize(granizo, 1.0)]
    print('amaru_ataques', pack(fx, 'public/assets/sprites/amaru_ataques.png', 4), [f.size for f in fx])

if __name__ == '__main__':
    main()
