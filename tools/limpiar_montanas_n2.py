"""Quita los restos de cielo (bloques gris verdoso y trazos) que quedaron sobre los picos de
public/assets/nivel2/fondos/montanas_cercanas.png. La roca es parda (rojo > verde); los restos no.

Uso:  python3 tools/limpiar_montanas_n2.py   (modifica el archivo; el original está en art-source/nivel2/)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'public/assets/nivel2/fondos/montanas_cercanas.png')
im = Image.open(P).convert('RGBA'); px = im.load()
n = 0
for y in range(0, 62):
    for x in range(530, 800):
        r, g, b, a = px[x, y]
        if a and (g >= r or b > g + 5):
            px[x, y] = (0, 0, 0, 0); n += 1
# puntitos sueltos que quedaron sobre el templo y a la derecha del pico
for (x0, y0, x1, y1) in ((545, 0, 590, 34), (750, 18, 760, 32)):
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3]: px[x, y] = (0, 0, 0, 0); n += 1
im.save(P)
print('píxeles quitados', n)
