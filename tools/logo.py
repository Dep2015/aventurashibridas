"""Recorta el logo «Aventuras Híbridas» de la portada y le quita el cielo -> public/assets/ui/logo.png

Uso: python3 tools/logo.py
El logo tiene un contorno negro grueso: se inunda desde los bordes del recorte todo lo que no sea
oscuro (cielo, nubes, borde blanco) y luego se quita el cielo que haya quedado encerrado.
"""
import os
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOX = (606, 32, 1394, 262)   # solo «AVENTURAS HÍBRIDAS», sin «LEVEL 1»
WIDTH = 560                  # ~2× el tamaño en pantalla, para que se vea nítido


def lum(p): return (p[0] * 3 + p[1] * 6 + p[2]) / 10


def sky(p):
    r, g, b = p
    return (b > r + 25 and b > 180) or (min(p) > 215 and b >= r)


im = Image.open(os.path.join(ROOT, 'public/assets/ui/portada.jpg')).convert('RGB').crop(BOX)
w, h = im.size; px = im.load()
out = Image.new('RGBA', (w, h)); op = out.load()
seen = [[False] * w for _ in range(h)]
q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
while q:
    x, y = q.popleft()
    if not (0 <= x < w and 0 <= y < h) or seen[y][x] or lum(px[x, y]) < 70: continue
    seen[y][x] = True
    q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
for y in range(h):
    for x in range(w):
        p = px[x, y]
        op[x, y] = (0, 0, 0, 0) if seen[y][x] or sky(p) else p + (255,)
out = out.crop(out.getbbox())
s = WIDTH / out.width
out = out.convert('RGBa').resize((WIDTH, round(out.height * s)), Image.LANCZOS).convert('RGBA')
out.save(os.path.join(ROOT, 'public/assets/ui/logo.png'))
print(out.size)
