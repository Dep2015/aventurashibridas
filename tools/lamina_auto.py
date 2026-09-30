"""Recorta figuras de una lámina generada (fondo blanco, sin grilla) y arma una hoja de sprites.

A diferencia de las otras herramientas, no hace falta medir cajas a mano: detecta cada figura como un componente
conectado sobre el fondo blanco, pega los trocitos sueltos (chispas, notas, estelas) a la figura más cercana y
ordena las figuras por filas (de arriba abajo) y dentro de cada fila de izquierda a derecha.

Uso como módulo:
    from lamina_auto import load_rows, pack_rows, pack_fit, grid_tiles
    rows = load_rows('art-source/nivel4/mallqui.png')        # lista de filas; cada fila, lista de figuras RGBA
    pack_rows(rows, 'public/assets/sprites/mallqui.png', target_h=60)   # misma escala, apoyadas abajo
Uso directo (vista previa numerada para revisar la detección):
    python3 tools/lamina_auto.py art-source/nivel4/mallqui.png /tmp/preview.png
"""
import os, sys
from array import array
from collections import deque
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = 1400  # ancho de trabajo: la lámina se reduce a este ancho antes de buscar figuras


def is_bg(r, g, b):
    return min(r, g, b) > 222 and max(r, g, b) - min(r, g, b) < 26


def open_work(path, work=WORK):
    im = Image.open(path).convert('RGB')
    if im.width > work: im = im.resize((work, round(im.height * work / im.width)), Image.LANCZOS)
    return im


def load_rows(path, min_area=900, attach=26, row_overlap=.45, work=WORK):
    """Devuelve las figuras agrupadas en filas. min_area: tamaño mínimo (px, a ancho WORK) de una figura.
    work: ancho de trabajo (más grande = figuras más nítidas, pero más lento)."""
    im = open_work(path, work); w, h = im.size; px = im.load()
    k = (w / WORK) ** 2; min_area = round(min_area * k); attach = round(attach * w / WORK)
    bgm = bytearray(w * h)
    q = deque()
    for x in range(w): q.append((x, 0)); q.append((x, h - 1))
    for y in range(h): q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if bgm[i] or not is_bg(*px[x, y]): continue
        bgm[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    lab = array('i', [-1]) * (w * h)
    comps = []
    for sy in range(h):
        for sx in range(w):
            i0 = sy * w + sx
            if bgm[i0] or lab[i0] != -1: continue
            n = len(comps); lab[i0] = n; q = deque([i0]); pts = []
            x0 = x1 = sx; y0 = y1 = sy
            while q:
                i = q.popleft(); pts.append(i)
                x, y = i % w, i // w
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
                for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                    if 0 <= j < w * h and not bgm[j] and lab[j] == -1:
                        lab[j] = n; q.append(j)
            comps.append({'pts': pts, 'box': [x0, y0, x1, y1]})
    big = [c for c in comps if len(c['pts']) >= min_area]
    # trocitos sueltos: se pegan a la figura grande más cercana (si está cerca); si no, se descartan (letras, polvo)
    for c in comps:
        if len(c['pts']) >= min_area or len(c['pts']) < 6: continue
        bx = c['box']; best = None; bd = attach
        for b in big:
            B = b['box']
            dx = max(B[0] - bx[2], bx[0] - B[2], 0); dy = max(B[1] - bx[3], bx[1] - B[3], 0)
            d = max(dx, dy)
            if d < bd: bd = d; best = b
        if best:
            best['pts'] += c['pts']; B = best['box']
            B[:] = [min(B[0], bx[0]), min(B[1], bx[1]), max(B[2], bx[2]), max(B[3], bx[3])]
    # filas: una figura entra en una fila si se superpone en vertical con ella
    big.sort(key=lambda c: (c['box'][1] + c['box'][3]) / 2)
    rows = []
    for c in big:
        y0, y1 = c['box'][1], c['box'][3]
        for r in rows:
            ov = min(y1, r['y1']) - max(y0, r['y0'])
            if ov > row_overlap * min(y1 - y0, r['y1'] - r['y0']):
                r['c'].append(c); r['y0'] = min(r['y0'], y0); r['y1'] = max(r['y1'], y1); break
        else:
            rows.append({'y0': y0, 'y1': y1, 'c': [c]})
    rows.sort(key=lambda r: r['y0'])
    out = []
    for r in rows:
        r['c'].sort(key=lambda c: c['box'][0])
        out.append([cut(px, w, h, bgm, c) for c in r['c']])
    return out


def cut(px, w, h, bgm, c):
    X0, Y0, X1, Y1 = c['box']
    fig = Image.new('RGBA', (X1 - X0 + 1, Y1 - Y0 + 1)); fp = fig.load()
    mask = set(c['pts'])
    for i in c['pts']:
        x, y = i % w, i // w
        fp[x - X0, y - Y0] = px[x, y] + (255,)
    # borde suave: píxeles de fondo vecinos con alfa según qué tan oscuros son (des-mezcla con blanco)
    for i in c['pts']:
        x, y = i % w, i // w
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if not (X0 <= nx <= X1 and Y0 <= ny <= Y1) or (ny * w + nx) in mask: continue
            r, g, b = px[nx, ny]
            a = max(0.0, min(1.0, (250 - (r + g + b) / 3) / 120))
            if a <= 0: continue
            col = tuple(max(0, min(255, int((v - (1 - a) * 255) / a))) for v in (r, g, b))
            fp[nx - X0, ny - Y0] = col + (int(a * 255),)
    fig.box = c['box']
    return fig


def shrink(im, s):
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    return im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')


def pack_rows(rows, out, target_h, cols=8, ref=(0, 0), max_cell=None):
    """Todas las figuras a la misma escala (la figura ref mide target_h de alto), apoyadas abajo y centradas.
    Devuelve (ancho, alto) del cuadro y la lista de índices de cuadro por fila."""
    figs = [f for r in rows for f in r]
    scale = target_h / rows[ref[0]][ref[1]].height
    sm = [shrink(f, scale) for f in figs]
    fw = max(f.width for f in sm) + 2; fh = max(f.height for f in sm) + 2
    if max_cell: fw, fh = min(fw, max_cell[0]), min(fh, max_cell[1])
    fw += fw % 2; fh += fh % 2
    n = len(sm); nr = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (fw * cols, fh * nr))
    for i, f in enumerate(sm):
        if f.width > fw or f.height > fh: f = shrink(f, min(fw / f.width, fh / f.height))
        sheet.alpha_composite(f, ((i % cols) * fw + (fw - f.width) // 2, (i // cols) * fh + fh - f.height))
    os.makedirs(os.path.dirname(os.path.join(ROOT, out)), exist_ok=True)
    sheet.save(os.path.join(ROOT, out))
    idx, k = [], 0
    for r in rows: idx.append(list(range(k, k + len(r)))); k += len(r)
    return (fw, fh), idx, round(scale, 3)


def pack_fit(figs, out, size, cols=8):
    """Cada figura escalada para caber en un cuadro de size×size (íconos, objetos), centrada y apoyada abajo."""
    n = len(figs); nr = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (size * cols, size * nr))
    for i, f in enumerate(figs):
        f = shrink(f, min((size - 2) / f.width, (size - 2) / f.height))
        sheet.alpha_composite(f, ((i % cols) * size + (size - f.width) // 2, (i // cols) * size + size - 1 - f.height))
    sheet.save(os.path.join(ROOT, out))
    return sheet.size


def grid_tiles(path, n=4, size=48, inset=.06):
    """Baldosas en una grilla de n×n separadas por líneas blancas: devuelve las n² baldosas de size×size.
    Recorta un poco (inset) de cada borde para no arrastrar el blanco de las separaciones."""
    im = Image.open(path).convert('RGB'); W, H = im.size; px = im.load()
    def white_line(get, L, step=4):
        return sum(1 for t in range(0, L, step) if is_bg(*get(t))) > .9 * (L / step)
    cols = [x for x in range(W) if white_line(lambda t: px[x, t], H)]
    rows = [y for y in range(H) if white_line(lambda t: px[t, y], W)]
    def spans(lines, L):
        # tramos sin línea blanca = baldosas
        out, start = [], None
        ws = set(lines)
        for v in range(L):
            if v not in ws and start is None: start = v
            if (v in ws or v == L - 1) and start is not None:
                if v - start > L / (n * 3): out.append((start, v))
                start = None
        return out
    xs, ys = spans(cols, W), spans(rows, H)
    if len(xs) != n or len(ys) != n:  # sin separaciones claras: grilla pareja
        xs = [(round(i * W / n), round((i + 1) * W / n)) for i in range(n)]
        ys = [(round(i * H / n), round((i + 1) * H / n)) for i in range(n)]
    tiles = []
    for (y0, y1) in ys:
        for (x0, x1) in xs:
            dx, dy = round((x1 - x0) * inset), round((y1 - y0) * inset)
            tiles.append(im.crop((x0 + dx, y0 + dy, x1 - dx, y1 - dy)).resize((size, size), Image.LANCZOS))
    return tiles


def preview(rows, out):
    """Vista previa numerada (fila.columna) para revisar qué detectó."""
    pad = 10; th = 90
    lines = []
    for r in rows:
        s = th / max(f.height for f in r)
        lines.append([shrink(f, s) for f in r])
    W = max(sum(f.width + pad for f in l) for l in lines) + pad
    H = sum(th + 24 for _ in lines) + pad
    im = Image.new('RGB', (W, H), (235, 235, 235)); d = ImageDraw.Draw(im)
    y = pad
    for ri, l in enumerate(lines):
        x = pad
        for ci, f in enumerate(l):
            im.paste(f, (x, y + th - f.height), f); d.text((x, y + th + 4), f'{ri}.{ci}', fill=(200, 0, 0)); x += f.width + pad
        y += th + 24
    im.save(out)


if __name__ == '__main__':
    rows = load_rows(sys.argv[1])
    for i, r in enumerate(rows): print('fila', i, len(r), [f.size for f in r])
    if len(sys.argv) > 2: preview(rows, sys.argv[2])
