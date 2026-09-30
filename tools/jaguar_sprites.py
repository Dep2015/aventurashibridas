"""Sprites del jefe final del nivel 1: Jaguar Guerrero (zombi, con hacha T dorada).

Uso:  python3 tools/jaguar_sprites.py
Entrada: art-source/jefe_jaguar_guerrero.webp (fondo azul con celdas celestes)
Salida:
  public/assets/sprites/jaguar.png        cuadros iguales, grilla de 8 columnas (mapa en README.md)
  public/assets/sprites/jaguar_hacha.png  hacha lanzada girando (varios cuadros) + hacha T dorada (ícono)
  art-source/jaguar/*.png                 cada figura limpia en resolución original

El jaguar no tiene azules: todo píxel azulado (o blanco azulado) es fondo. Cada figura es la unión de las
piezas cuyo centro cae dentro de su recuadro; los textos quedan fuera de los recuadros.
"""
import os, math
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art-source/jefe_jaguar_guerrero.webp')
BGS = [(205, 236, 245), (128, 194, 218), (180, 220, 236)]
TARGET_H = 112  # el reposo mide ~2 Xoxur de alto (Inka Locu mide ~93 px)

# recuadros de cada figura (coordenadas de la lámina), en el orden de la hoja
FIGURES = (
    [('reposo', (48 + i * 118.5, 112, 48 + (i + 1) * 118.5, 240)) for i in range(8)]
    + [('avanzar', (48 + i * 118.5, 292, 48 + (i + 1) * 118.5, 424)) for i in range(8)]
    + [('agachado', (50, 480, 170, 706)), ('punto_alto', (172, 480, 312, 706)),
       ('cayendo', (314, 480, 410, 706)), ('aterrizaje', (412, 480, 520, 706)),
       ('lanzar_anticipacion', (540, 478, 624, 574)), ('lanzar_suelta', (624, 478, 711, 574)),
       ('lanzar_recuperacion', (836, 478, 908, 574)), ('celebracion', (540, 636, 676, 752)),
       ('danio', (690, 636, 790, 752)), ('danio', (790, 636, 890, 752)), ('danio', (890, 636, 994, 752)),
       ('hacha_arriba', (46, 820, 180, 966)), ('lanzar_hacha', (188, 820, 338, 966)),
       ('rodillas', (416, 820, 536, 966)), ('ko', (548, 820, 742, 966))]
)
# celda «Thrown Object»: cuatro hachas girando (la 2.ª y la 3.ª se tocan) → un recuadro por hacha
AXES = [(707, 494, 735, 528), (735, 492, 762, 522), (762, 498, 790, 528), (792, 515, 827, 550)]
# las filas 4 (lanzar hacha) y 5 (celebración, daño) están dibujadas más chicas en la lámina:
# la misma pose (hacha en alto) mide 91 px en la fila 4 y 138 px en la fila 6
ROW_SCALE = {'lanzar_anticipacion': 1.5, 'lanzar_suelta': 1.5, 'lanzar_recuperacion': 1.5,
             'celebracion': 1.2, 'danio': 1.2}
AXE_ROW6 = (338, 840, 400, 900)      # hacha que vuela en la fila 6
GOLD_AXE = (912, 478, 994, 574)      # ícono «GOLDEN T-AXE»


def dist(a, b): return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))
def is_bg(p): r, g, b = p; return (b > r + 28 and b >= g - 4) or (min(p) > 200 and b >= r)


class Sheet:
    def __init__(self, path):
        self.im = Image.open(path).convert('RGB'); self.px = self.im.load(); W, H = self.im.size
        self.W, self.H = W, H
        fg = [[not is_bg(self.px[x, y]) for x in range(W)] for y in range(H)]
        self.lab = [[-1] * W for _ in range(H)]; self.comps = []
        for sy in range(H):
            for sx in range(W):
                if not fg[sy][sx] or self.lab[sy][sx] != -1: continue
                n = len(self.comps); pts = []; q = deque([(sx, sy)]); self.lab[sy][sx] = n
                while q:
                    x, y = q.popleft(); pts.append((x, y))
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < W and 0 <= ny < H and fg[ny][nx] and self.lab[ny][nx] == -1:
                            self.lab[ny][nx] = n; q.append((nx, ny))
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                self.comps.append({'pts': pts, 'c': ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)})

    def figure(self, box, min_size=6, clip=False):
        """Une las piezas cuyo centro cae en el recuadro (con clip, además recorta al recuadro)."""
        x0, y0, x1, y1 = box
        ids = {i for i, c in enumerate(self.comps) if len(c['pts']) >= min_size and x0 <= c['c'][0] < x1 and y0 <= c['c'][1] < y1}
        pts = [p for i in ids for p in self.comps[i]['pts'] if not clip or (x0 <= p[0] < x1 and y0 <= p[1] < y1)]
        return self.render(pts, ids)

    def pieces(self, box, min_size):
        """Cada pieza grande dentro del recuadro por separado, contando solo los píxeles del recuadro
        (así se separan cosas que la estela une con la celda vecina). Ordenadas de izquierda a derecha."""
        x0, y0, x1, y1 = box
        cells = {(x, y) for x in range(x0, x1) for y in range(y0, y1) if self.lab[y][x] != -1}
        seen, found = set(), []
        for start in sorted(cells):
            if start in seen: continue
            grp = []; q = deque([start]); seen.add(start)
            while q:
                x, y = q.popleft(); grp.append((x, y))
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if n in cells and n not in seen: seen.add(n); q.append(n)
            if len(grp) >= min_size: found.append(grp)
        found.sort(key=lambda g: min(p[0] for p in g))
        return [self.render(g, set()) for g in found]

    def render(self, pts, ids):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        X0, Y0, X1, Y1 = min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1
        out = Image.new('RGBA', (X1 - X0 + 1, Y1 - Y0 + 1)); o = out.load(); inside = set(pts)
        for x, y in pts: o[x - X0, y - Y0] = self.px[x, y] + (255,)
        # borde suave: vecinos de fondo, con alfa según qué tan lejos están del azul (des-mezcla)
        for x, y in pts:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) in inside or not (0 <= nx < self.W and 0 <= ny < self.H) or self.lab[ny][nx] != -1: continue
                p = self.px[nx, ny]; c = min(BGS, key=lambda k: dist(p, k)); a = max(0.0, min(1.0, dist(p, c) / 90))
                if a < .15: continue
                col = tuple(max(0, min(255, int((v - (1 - a) * k) / a))) for v, k in zip(p, c))
                o[nx - X0, ny - Y0] = col + (int(a * 255),)
        return out


def shrink(im, s):
    return im.convert('RGBa').resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS).convert('RGBA')


def pack(frames, path, cols, anchor='bottom'):
    FW = -(-max(f.width for f in frames) // 4) * 4; FH = -(-max(f.height for f in frames) // 4) * 4
    cols = min(cols, len(frames)); rows = -(-len(frames) // cols); sheet = Image.new('RGBA', (FW * cols, FH * rows))
    for i, f in enumerate(frames):
        y = FH - f.height if anchor == 'bottom' else (FH - f.height) // 2
        sheet.alpha_composite(f, ((i % cols) * FW + (FW - f.width) // 2, (i // cols) * FH + y))
    sheet.save(os.path.join(ROOT, path)); return FW, FH


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/jaguar'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        clip = name == 'lanzar_suelta'  # la estela une al jaguar con las hachas de la celda vecina
        f = sh.figure(tuple(int(v) for v in box), clip=clip); figs.append(f)
        f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    print([f.size for f in figs])
    scale = TARGET_H / figs[0].height
    print('jaguar', pack([shrink(f, scale * ROW_SCALE.get(n, 1)) for (n, _), f in zip(FIGURES, figs)], 'public/assets/sprites/jaguar.png', 8), len(figs), 'cuadros, escala', round(scale, 3))

    axes = [max(sh.pieces(b, 40), key=lambda im: im.width * im.height) for b in AXES] + [sh.figure(AXE_ROW6, 60)]
    gold = sh.figure(GOLD_AXE)
    for i, a in enumerate(axes, 1): a.save(os.path.join(out, f'hacha_{i}.png'))
    gold.save(os.path.join(out, 'hacha_dorada.png'))
    print('hachas', [a.size for a in axes])
    small = [shrink(a, scale * 1.5) for a in axes[:4]] + [shrink(axes[4], scale)]
    print('jaguar_hacha', pack(small + [shrink(gold, scale * .6)], 'public/assets/sprites/jaguar_hacha.png', 8, 'center'))


if __name__ == '__main__':
    main()
