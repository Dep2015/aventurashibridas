"""Separa las láminas de enemigos (fondo verde con celdas) en sprites.

Uso:  python3 tools/enemigos_sprites.py
Entrada: art-source/enemigo_condor_zombi.webp, enemigo_condor_carga.webp y enemigo_harpia.webp
Salida:
  public/assets/sprites/condor_zombi.png  cóndor zombi, cuadros iguales en grilla de 6 columnas (mapa en README.md)
  public/assets/sprites/saliva.png        saliva corrosiva: 0 en vuelo, 1 salpicadura
  public/assets/sprites/condor_carga.png  cóndor que carga a la zombi andina (otro enemigo)
  public/assets/sprites/zombi_andina.png  zombi andina cayendo (lo que suelta el cóndor)
  public/assets/sprites/harpia.png        harpía guerrero andino
  art-source/condor/*.png                 cada figura limpia en resolución original (incluye los detalles)

Método (igual que items_sprites.py): se inunda desde el borde de cada zona todo lo que se parece a
los verdes del fondo o a las líneas de las celdas; la transparencia se suaviza según la distancia
al verde. Luego se separan las figuras por componentes conectados (los trocitos cercanos, como las
gotas de saliva, se pegan a su figura).
"""
import sys, os, math
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BGS = [(116, 137, 100), (147, 190, 151), (58, 117, 95), (53, 104, 73), (180, 220, 188), (66, 145, 131)]  # celda, panel, bordes
LO, HI = 16, 42
SCALE, SPIT_SCALE = 0.5, 0.4

# zonas por lámina: nombre -> (recorte, cantidad esperada, rectángulos a ignorar (títulos), distancia para pegar trocitos)
SHEETS = {
    'art-source/enemigo_condor_zombi.webp': {
        'vuelo':   ((22, 104, 1000, 290), 6, [(28, 94, 330, 131)], 10),
        'tierra':  ((25, 330, 1000, 486), 6, [], 10),
        'garra':   ((20, 566, 354, 742), 2, [], 10),
        'saliva':  ((386, 572, 1000, 742), 4, [], 60),   # las gotas quedan lejos de la bola
        'detalle': ((30, 843, 482, 986), 3, [], 10),
    },
    'art-source/enemigo_harpia.webp': {  # las celdas traen etiquetas (I1, W1…): no se pegan trocitos (ver ERASE)
        'h_reposo':  ((34, 134, 496, 258), 4, [], 0),
        'h_caminar': ((527, 134, 994, 258), 5, [], 0),
        'h_sprint':  ((30, 330, 994, 488), 6, [(40, 296, 990, 332)], 0),
        'h_ataque':  ((18, 586, 510, 742), 3, [(40, 560, 500, 598)], 12),  # el zarpazo es un trazo aparte
        'h_danio':   ((538, 596, 994, 742), 3, [], 0),
        'h_accion':  ((30, 842, 614, 982), 4, [], 6),                     # el brillo del amuleto
    },
    'art-source/enemigo_condor_carga.webp': {
        # vuelo con carga: las alas de los dos cuadros se tocan en x≈183, se separan ahí
        'carga_lat': ((18, 596, 183, 744), 1, [(30, 560, 350, 600)], 10),
        'carga_fro': ((183, 596, 364, 744), 1, [(30, 560, 350, 600)], 10),
        'lanzar':    ((384, 592, 690, 744), 2, [(395, 560, 860, 600)], 16), # pre-lanzamiento, lanzamiento
        'caida':     ((692, 606, 838, 712), 2, [], 4),                      # zombi cayendo (sin flechas ni texto)
        'regreso':   ((840, 592, 1000, 744), 1, [], 10),                    # regreso a vuelo
        'retrato':   ((338, 848, 480, 983), 1, [], 10),                     # primer plano de la zombi andina
    },
}


# etiquetas dentro de las celdas (texto negro): rectángulos donde se borran los píxeles grises/negros
ERASE = {
    'h_reposo':  [(x0 - 3, 232, x1 + 3, 256) for x0, x1 in ((126, 136), (242, 259), (358, 376), (474, 491))],
    'h_caminar': [(x0 - 3, 232, x1 + 3, 256) for x0, x1 in ((586, 605), (666, 693), (764, 783), (862, 888), (961, 988))],
    'h_sprint':  [(x0 - 3, 454, x1 + 3, 482) for x0, x1 in ((159, 170), (323, 339), (484, 499), (643, 667), (804, 820), (965, 981))],
}


def dist(a, b): return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def frame_line(p):
    r, g, b = p
    return g < 75 and g > r + 8 and g > b + 4 and (r + g + b) < 150


def zone_figures(im, box, count, ignore, merge, erase=()):
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0; px = im.load()
    alpha = [[255] * w for _ in range(h)]; bg = [[False] * w for _ in range(h)]
    # cerca de las líneas de las celdas, los píxeles verdosos de transición también son fondo
    line = [[frame_line(px[x0 + x, y0 + y]) for x in range(w)] for y in range(h)]
    near = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if line[y][x]:
                for dy in range(-3, 4):
                    for dx in range(-3, 4):
                        if 0 <= x + dx < w and 0 <= y + dy < h: near[y + dy][x + dx] = True
    greenish = lambda p: p[1] > p[0] + 8 and p[1] >= p[2]
    in_erase = lambda x, y: any(a <= x0 + x <= c and b <= y0 + y <= d for a, b, c, d in erase)
    label_px = lambda p: max(p) - min(p) < 28 and max(p) < 200  # texto negro y su borde gris
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or bg[y][x]: continue
        p = px[x0 + x, y0 + y]
        d = min(dist(p, c) for c in BGS)
        kill = line[y][x] or (near[y][x] and greenish(p)) or (in_erase(x, y) and label_px(p))
        if d >= HI and not kill: continue
        bg[y][x] = True
        alpha[y][x] = 0 if kill else int(255 * max(0, min(1, (d - LO) / (HI - LO))))
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # huecos encerrados (entre las patas, bajo las alas) del color exacto del fondo de la celda
    seen2 = [[False] * w for _ in range(h)]
    for sy in range(h):
        for sx in range(w):
            if bg[sy][sx] or seen2[sy][sx] or dist(px[x0 + sx, y0 + sy], BGS[0]) > 12: continue
            pts = []; q = deque([(sx, sy)]); seen2[sy][sx] = True
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and not seen2[ny][nx] and dist(px[x0 + nx, y0 + ny], BGS[0]) <= 22:
                        seen2[ny][nx] = True; q.append((nx, ny))
            if len(pts) > 25:
                for (x, y) in pts: alpha[y][x] = 0; bg[y][x] = True
    # componentes opacos
    lab = [[-1] * w for _ in range(h)]; comps = []
    for sy in range(h):
        for sx in range(w):
            if alpha[sy][sx] < 60 or lab[sy][sx] != -1: continue
            n = len(comps); pts = []; q = deque([(sx, sy)]); lab[sy][sx] = n
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and alpha[ny][nx] >= 60 and lab[ny][nx] == -1:
                        lab[ny][nx] = n; q.append((nx, ny))
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            box_ = [min(xs), min(ys), max(xs), max(ys)]
            bw, bh = box_[2] - box_[0] + 1, box_[3] - box_[1] + 1
            if len(pts) < 300 and sum(near[y][x] for x, y in pts) > .6 * len(pts):  # trocito sobre una línea de celda
                for (x, y) in pts: alpha[y][x] = 0
                continue
            if min(bw, bh) <= 4 and max(bw, bh) >= 4 * min(bw, bh) and max(bw, bh) > 8:  # restos de líneas de celda
                for (x, y) in pts: alpha[y][x] = 0
                continue
            if any(x0 + box_[0] >= a and y0 + box_[1] >= b and x0 + box_[2] <= c and y0 + box_[3] <= d for a, b, c, d in ignore):
                continue
            comps.append({'id': n, 'ids': {n}, 'size': len(pts), 'box': box_})
    comps.sort(key=lambda c: -c['size'])
    big, small = comps[:count], comps[count:]
    # pegar trocitos (gotas, plumas sueltas) a la figura cuya caja original esté más cerca
    orig = {id(b): list(b['box']) for b in big}
    gap = lambda b, cx, cy: max(0, orig[id(b)][0] - cx, cx - orig[id(b)][2]) + max(0, orig[id(b)][1] - cy, cy - orig[id(b)][3])
    for c in small:
        if c['size'] < (6 if merge > 20 else 30): continue  # motitas sueltas (salvo gotas de saliva)
        bx = c['box']; cx, cy = (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2
        best = min(big, key=lambda b: gap(b, cx, cy))
        if gap(best, cx, cy) < merge:
            B = best['box']
            best['ids'].add(c['id']); best['box'] = [min(B[0], bx[0]), min(B[1], bx[1]), max(B[2], bx[2]), max(B[3], bx[3])]
    big.sort(key=lambda c: c['box'][0])
    figs = []
    for c in big:
        X0, Y0, X1, Y1 = c['box']; X0, Y0 = max(0, X0 - 2), max(0, Y0 - 2); X1, Y1 = min(w - 1, X1 + 2), min(h - 1, Y1 + 2)
        fig = Image.new('RGBA', (X1 - X0 + 1, Y1 - Y0 + 1)); fp = fig.load()
        for y in range(Y0, Y1 + 1):
            for x in range(X0, X1 + 1):
                a = alpha[y][x]
                if a == 0: continue
                # píxel de la figura, o borde suave pegado a ella
                if lab[y][x] not in c['ids'] and not any(0 <= x + dx < w and 0 <= y + dy < h and lab[y + dy][x + dx] in c['ids']
                                                           for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)):
                    continue
                if a < 200 and near[y][x]: continue  # borde suave que en realidad es línea de celda
                r, g, b = px[x0 + x, y0 + y]
                if a < 255:
                    f = a / 255; bgc = min(BGS, key=lambda k: dist((r, g, b), k))
                    r, g, b = (max(0, min(255, int((v - (1 - f) * k) / f))) for v, k in zip((r, g, b), bgc))
                fp[x - X0, y - Y0] = (r, g, b, a)
        figs.append(fig.crop(fig.getbbox()))
    return figs


def shrink(im, s):
    return im.convert('RGBa').resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS).convert('RGBA')


def pack(frames, path, anchor='right', cols=6):
    """Arma una hoja con cuadros iguales. anchor: 'right' fija pico y patas (mira a la derecha), 'center' centra."""
    FW = -(-max(f.width for f in frames) // 4) * 4; FH = -(-max(f.height for f in frames) // 4) * 4
    cols = min(cols, len(frames)); rows = -(-len(frames) // cols)
    sheet = Image.new('RGBA', (FW * cols, FH * rows))
    for i, f in enumerate(frames):
        a = anchor[i] if isinstance(anchor, list) else anchor
        x = FW - f.width - 2 if a == 'right' else (FW - f.width) // 2  # 'center' y 'bottom' centran en x
        y = FH - f.height if a in ('right', 'bottom') else (FH - f.height) // 2
        sheet.alpha_composite(f, ((i % cols) * FW + x, (i // cols) * FH + y))
    sheet.save(os.path.join(ROOT, path))
    return FW, FH


def main():
    zones = {}
    for src, zdefs in SHEETS.items():
        im = Image.open(os.path.join(ROOT, src)).convert('RGB')
        for k, (box, count, ignore, merge) in zdefs.items():
            zones[k] = zone_figures(im, box, count, ignore, merge, ERASE.get(k, ()))
            print(k, [f.size for f in zones[k]])
    out_dir = os.path.join(ROOT, 'art-source/condor'); os.makedirs(out_dir, exist_ok=True)
    for k, figs in zones.items():
        for i, f in enumerate(figs, 1): f.save(os.path.join(out_dir, f'{k}_{i}.png'))
    sm = lambda figs, s=SCALE: [shrink(f, s) for f in figs]

    # cóndor zombi: vuelo 0–5, tierra 6–11, garra 12–13, escupir 14–15
    print('condor_zombi', pack(sm(zones['vuelo'] + zones['tierra'] + zones['garra'] + zones['saliva'][:2]),
                               'public/assets/sprites/condor_zombi.png'))
    # saliva: 0 en vuelo (centrada), 1 salpicadura (apoyada abajo)
    print('saliva', pack(sm(zones['saliva'][2:], SPIT_SCALE), 'public/assets/sprites/saliva.png', ['center', 'bottom']))
    # cóndor con carga: 0 lateral, 1 frontal, 2 pre-lanzamiento, 3 lanzamiento, 4 regreso a vuelo (sin carga)
    print('condor_carga', pack(sm(zones['carga_lat'] + zones['carga_fro'] + zones['lanzar'] + zones['regreso']),
                               'public/assets/sprites/condor_carga.png', ['right', 'center', 'right', 'right', 'right']))
    # harpía: reposo 0–3, caminar 4–8, sprint 9–14, ataque 15–17, daño 18–20, acciones 21–24
    print('harpia', pack(sm(zones['h_reposo'] + zones['h_caminar'] + zones['h_sprint'] + zones['h_ataque']
                            + zones['h_danio'] + zones['h_accion']), 'public/assets/sprites/harpia.png', 'bottom'))
    # zombi andina cayendo: 2 poses
    print('zombi_andina', pack(sm(zones['caida']), 'public/assets/sprites/zombi_andina.png', 'center'))


if __name__ == '__main__':
    main()
