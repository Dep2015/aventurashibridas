"""Sprites de vuelo de Inkaxur (lámina «Xoxur Character Sprite Sheet v1.3 – Flight Edition»), para el nivel 2.

Uso:  python3 tools/inkaxur_vuelo_sprites.py
Entrada: art-source/inkaxur_vuelo.jpeg (fondo blanco con grilla gris, como la lámina de Inkaxur)
Salida:
  public/assets/sprites/inkaxur_vuelo.png   cuadros de 96×64, grilla de 8 columnas:
      0 reposo de frente, 1 flotando de costado, 2–7 volar, 8–13 volar rápido (dash),
      14–19 despegue (de pie → en vuelo), 20–24 ataque (golpe ×3, látigo de quipus ×2), 25 provocación,
      26–31 daño y derrota (golpe, golpe, tambaleo, caído, caído, estrellado), 32–33 lanzar la galleta
  public/assets/sprites/galleta_menta.png   galleta de menta lanzada: 3 cuadros de 32×32
Escala: la misma de Inkaxur (el reposo de frente mide 54 px de alto).
"""
import os
from PIL import Image
from xoxur_inka_sprites import figures, shrink, ROOT

SRC = os.path.join(ROOT, 'art-source/inkaxur_vuelo.jpeg')
FW, FH, COLS, TARGET_H = 96, 64, 8, 54

# franjas (y0, y1, x1, x0) dentro de las líneas de la grilla
BANDS = [
    ('reposo',   (150, 232, 363, 55), 2),
    ('volar',    (267, 374, 983, 55), 6),
    ('dash',     (410, 515, 983, 55), 6),
    ('despegue', (537, 644, 983, 55, 552), 6),  # los brazos del cuadro 3 salen de la celda (título hasta y=552)
    ('ataque',   (681, 762, 827, 55), 5),
    ('provoca',  (681, 762, 983, 836), 1),
    ('danio',    (798, 877, 983, 55), 6),
    ('lanzar',   (911, 990, 381, 55), 2),
]
COOKIE = (911, 990, 738, 391)
# cuadros apoyados en el piso (de pie); el resto va centrado en vertical (vuela)
STANDING = {0, 14, 15, 16, 25}


def main():
    im = Image.open(SRC).convert('RGB')
    figs = []
    for name, band, n in BANDS:
        row = figures(im, band, band[3])
        print(name, len(row), [f.size for f in row])
        assert len(row) == n, (name, len(row))
        figs += row
    scale = TARGET_H / figs[0].height
    rows = -(-len(figs) // COLS)
    sheet = Image.new('RGBA', (FW * COLS, FH * rows))
    for i, f in enumerate(figs):
        sm = shrink(f, scale)
        if sm.width > FW or sm.height > FH: sm = shrink(sm, min(FW / sm.width, FH / sm.height))
        x = (FW - sm.width) // 2
        y = FH - sm.height if i in STANDING else (FH - sm.height) // 2
        sheet.alpha_composite(sm, ((i % COLS) * FW + x, (i // COLS) * FH + y))
    sheet.save(os.path.join(ROOT, 'public/assets/sprites/inkaxur_vuelo.png'))
    print('inkaxur_vuelo', sheet.size, len(figs), 'cuadros, escala', round(scale, 3))

    cookies = figures(im, COOKIE, COOKIE[3])
    out = Image.new('RGBA', (32 * len(cookies), 32))
    for i, c in enumerate(cookies):
        sm = shrink(c, 28 / max(c.size))
        out.alpha_composite(sm, (i * 32 + (32 - sm.width) // 2, (32 - sm.height) // 2))
    out.save(os.path.join(ROOT, 'public/assets/sprites/galleta_menta.png'))
    print('galleta_menta', out.size, len(cookies))


if __name__ == '__main__':
    main()
