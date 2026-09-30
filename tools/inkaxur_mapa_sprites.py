"""Sprites de Inkaxur caminando en 4 direcciones (vista desde arriba, para el mapa del nivel 3).

La lámina se generó con Higgsfield (GPT Image 2.5) tomando como referencia art-source/personaje_xoxur_inka.webp.

Uso:  python3 tools/inkaxur_mapa_sprites.py
Entrada: art-source/inkaxur_topdown.png (fondo blanco con grilla gris, 4 filas de 4 cuadros)
Salida:
  public/assets/sprites/inkaxur_mapa.png   cuadros de 64×64, grilla de 4 columnas:
      0–3 caminar hacia abajo (de frente), 4–7 hacia arriba (de espaldas),
      8–11 hacia la izquierda, 12–15 hacia la derecha
Escala: la misma de Inkaxur (el cuadro de frente mide 54 px de alto); las figuras se apoyan abajo.
"""
import os
from PIL import Image
from xoxur_inka_sprites import figures, shrink, head_center_x, ROOT

SRC = os.path.join(ROOT, 'art-source/inkaxur_topdown.png')
FW = FH = 64
TARGET_H = 54
# franjas (y0, y1, x1, x0) dentro de las líneas de la grilla
BANDS = [(130, 301, 983, 50), (344, 515, 983, 50), (557, 726, 983, 50), (770, 946, 983, 50)]


def main():
    im = Image.open(SRC).convert('RGB')
    rows = []
    for b in BANDS:
        r = figures(im, b, b[3])
        print(len(r), [f.size for f in r])
        assert len(r) == 4, b
        rows.append(r)
    scale = TARGET_H / rows[0][0].height
    sheet = Image.new('RGBA', (FW * 4, FH * 4))
    for ri, r in enumerate(rows):
        for ci, fig in enumerate(r):
            sm = shrink(fig, scale)
            if sm.width > FW or sm.height > FH: sm = shrink(sm, min(FW / sm.width, FH / sm.height))
            cx = head_center_x(sm)  # la cabeza queda en el mismo lugar en todos los cuadros (no tiembla)
            x = max(0, min(FW - sm.width, int(round(FW / 2 - cx))))
            sheet.alpha_composite(sm, (ci * FW + x, ri * FH + FH - sm.height))
    sheet.save(os.path.join(ROOT, 'public/assets/sprites/inkaxur_mapa.png'))
    print('inkaxur_mapa', sheet.size, 'escala', round(scale, 3))


if __name__ == '__main__':
    main()
