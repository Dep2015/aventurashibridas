"""Quita las casitas de la capa de andenes (terr.png) para que el nivel 1 sea solo cordillera.

Uso:  python3 tools/fondos_sin_casas.py
Entrada: art-source/fondos_originales/terr.png (copia original, con casas)
Salida:  public/assets/backgrounds/terr.png
Dentro de cada zona solo se reemplazan los píxeles «de casa» (techos rojizos, paredes claras, y 3 px alrededor
para los contornos y puertas) por la terraza que está al lado en la misma fila.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# (x0, y0, x1, y1, desplazamiento): el relleno se copia de x + desplazamiento
ZONES = [
    (108, 30, 216, 68, -103),  # dos casas, barriles y cerca (se copia la terraza de la izquierda)
    (664, 32, 736, 78, +72),   # casa y fardos (se copia la terraza de la derecha)
]

im = Image.open(os.path.join(ROOT, 'art-source/fondos_originales/terr.png')).convert('RGBA')
src = im.copy(); p, s = im.load(), src.load()
def house_like(c):
    r, g, b = c[:3]
    return (r > g + 22 and r > 110) or min(r, g, b) > 165  # techo/barril rojizo o pared clara


for x0, y0, x1, y1, dx in ZONES:
    core = {(x, y) for y in range(y0, y1) for x in range(x0, x1) if house_like(s[x, y])}
    mask = {(x + i, y + j) for x, y in core for i in range(-3, 4) for j in range(-3, 4)
            if x0 <= x + i < x1 and y0 <= y + j < y1}
    for x, y in mask:
        p[x, y] = s[x + dx, y]
im.save(os.path.join(ROOT, 'public/assets/backgrounds/terr.png'))
print('listo')
