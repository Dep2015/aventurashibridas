"""Convierte la lámina de Xoxur Inka (fondo blanco con grilla) en public/assets/sprites/xoxur_inka.png.

Uso:  python3 tools/xoxur_inka_sprites.py art-source/personaje_xoxur_inka.webp
Salida:
  public/assets/sprites/xoxur_inka.png   cuadros de 72×64, grilla de 6×6, mismo mapa que xoxur.png
  art-source/items/gas_oro.png           balón de gas dorado (ícono del ítem, lo usa items_sprites.py)
  art-source/items/gas_oro_lanzado_N.png balón lanzado (3 cuadros, para uso futuro)

Cada fila de la lámina se separa en figuras por componentes conectados; las etiquetas (F1, W1…)
se descartan por tamaño. Todas las figuras usan la misma escala (el reposo mide 54 px de alto,
como el Xoxur original) y se apoyan en el borde inferior del cuadro.
"""
import sys, os
from collections import deque
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'art-source/personaje_xoxur_inka.webp'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW, FH, TARGET_H = 72, 64, 54

# franjas de cada fila (entre las líneas de la grilla) y límite derecho
BANDS = {
    'idle':   (125, 233, 986),
    'walk':   (268, 377, 986),
    'run':    (413, 521, 986),
    'jump':   (538, 665, 986, 40, 557),  # más alta: los brazos del punto alto salen de la celda (título hasta y=557)
    'action': (717, 824, 986),
    'hurt':   (875, 983, 380),
    'canister': (875, 983, 745, 385),  # panel del medio: empieza en x=385
}
# cuadro de destino (mapa de README.md) para cada figura de cada fila, de izquierda a derecha
MAP = {
    'idle': [0, 1, 2, 3, 4, 5],
    'walk': [6, 7, 8, 9, 10, 11],
    'run': [12, 13, 14, 15, 16, 17],
    'jump': [18, 19, 20, 21, 22],           # agachado, despegue, punto alto, caída, aterrizaje
    'action': [23, 24, 25, 26, 27, 28, 29],  # golpe x3, lateral x2, recoger, celebración
    'hurt': [32, 33, 35],                   # golpe, tambaleo, K.O. (mareado)
}


def is_bg(p):
    r, g, b = p
    sat = max(p) - min(p)
    return (min(p) > 212 and sat < 20) or (sat < 18 and 90 < r < 236)  # blanco o línea gris


def figures(im, band, x0=40):
    """band: (y0, y1, x1[, x0[, título]]). título = y donde empiezan las celdas si la franja incluye el título de la fila."""
    y0, y1, x1 = band[:3]
    if len(band) > 3: x0 = band[3]
    header = band[4] if len(band) > 4 else None
    px = im.load(); w, h = x1 - x0, y1 - y0
    bg = [[False] * w for _ in range(h)]
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or bg[y][x] or not is_bg(px[x0 + x, y0 + y]): continue
        bg[y][x] = True
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # componentes del primer plano
    lab = [[-1] * w for _ in range(h)]; comps = []
    for sy in range(h):
        for sx in range(w):
            if bg[sy][sx] or lab[sy][sx] != -1: continue
            n = len(comps); pts = []; q = deque([(sx, sy)]); lab[sy][sx] = n
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and lab[ny][nx] == -1:
                        lab[ny][nx] = n; q.append((nx, ny))
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            comps.append({'pts': pts, 'box': [min(xs), min(ys), max(xs), max(ys)]})
    big = [c for c in comps if len(c['pts']) > 700]
    # pegar trocitos cercanos (estrellas de mareo, charco) a la figura grande más próxima
    for c in comps:
        if len(c['pts']) > 700 or len(c['pts']) < 12: continue
        bx = c['box']
        if header and bx[3] < header - y0 + 2 and bx[1] < header - y0 - 12: continue  # letras del título de la fila
        for b in big:
            B = b['box']
            if bx[0] > B[0] - 14 and bx[2] < B[2] + 14 and bx[1] > B[1] - 22 and bx[3] < B[3] + 6:
                # descartar etiquetas (F1, W1…) en la esquina inferior derecha de la celda
                if bx[3] > h - 30 and bx[0] > B[2] - 4: break
                b['pts'] += c['pts']; B[:] = [min(B[0], bx[0]), min(B[1], bx[1]), max(B[2], bx[2]), max(B[3], bx[3])]
                break
    big.sort(key=lambda c: c['box'][0])
    out = []
    for c in big:
        X0, Y0, X1, Y1 = c['box']
        fig = Image.new('RGBA', (X1 - X0 + 1, Y1 - Y0 + 1)); fp = fig.load()
        mask = set(c['pts'])
        for (x, y) in c['pts']:
            fp[x - X0, y - Y0] = px[x0 + x, y0 + y] + (255,)
        # borde suave: píxeles de fondo vecinos, con alfa según qué tan oscuros son (des-mezcla con blanco)
        for (x, y) in c['pts']:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) in mask or not (X0 <= nx <= X1 and Y0 <= ny <= Y1) or not (0 <= nx < w and 0 <= ny < h): continue
                r, g, b = px[x0 + nx, y0 + ny]
                a = max(0.0, min(1.0, (250 - (r + g + b) / 3) / 120))
                if a <= 0: continue
                col = tuple(max(0, min(255, int((v - (1 - a) * 255) / a))) for v in (r, g, b))
                fp[nx - X0, ny - Y0] = col + (int(a * 255),)
        out.append(fig)
    return out


def shrink(im, s):
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    return im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')


def head_center_x(im):
    """Centro horizontal de la parte de arriba (cabeza/torso): evita que el ciclo de caminata tiemble."""
    p = im.load(); top = int(im.height * .45); xs = []
    for y in range(top):
        for x in range(im.width):
            if p[x, y][3] > 128: xs.append(x)
    return sum(xs) / len(xs) if xs else im.width / 2


def main():
    im = Image.open(SRC).convert('RGB')
    rows = {k: figures(im, b) for k, b in BANDS.items()}
    for k, v in rows.items(): print(k, len(v), [f.size for f in v])
    scale = TARGET_H / rows['idle'][0].height
    sheet = Image.new('RGBA', (FW * 6, FH * 6))
    for k, frames in MAP.items():
        figs = rows[k]
        assert len(figs) == len(frames), (k, len(figs))
        for fig, f in zip(figs, frames):
            sm = shrink(fig, scale)
            if sm.width > FW or sm.height > FH:  # por si alguna pose no cabe
                sm = shrink(sm, min(FW / sm.width, FH / sm.height))
            cx = head_center_x(sm)
            x = int(round(36.5 - cx)); x = max(0, min(FW - sm.width, x))
            sheet.alpha_composite(sm, ((f % 6) * FW + x, (f // 6) * FH + FH - sm.height))
    # cuadros sin figura propia: 30 = golpe (32), 31 = tambaleo (33), 34 = tambaleo (33)
    cell = lambda f: sheet.crop(((f % 6) * FW, (f // 6) * FH, (f % 6) * FW + FW, (f // 6) * FH + FH))
    for dst, src in ((30, 32), (31, 33), (34, 33)):
        sheet.alpha_composite(cell(src), ((dst % 6) * FW, (dst // 6) * FH))
    sheet.save(os.path.join(ROOT, 'public/assets/sprites/xoxur_inka.png'))
    os.makedirs(os.path.join(ROOT, 'art-source/items'), exist_ok=True)
    cans = rows['canister']
    cans[0].save(os.path.join(ROOT, 'art-source/items/gas_oro.png'))
    for i, c in enumerate(cans, 1): c.save(os.path.join(ROOT, f'art-source/items/gas_oro_lanzado_{i}.png'))
    print('escala', round(scale, 3))


if __name__ == '__main__':
    main()
