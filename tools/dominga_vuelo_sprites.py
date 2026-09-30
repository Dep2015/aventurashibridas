"""Sprites de Dominga en vuelo: montada en un cóndor, con ataque de fuego y poder final.

Uso:  python3 tools/dominga_vuelo_sprites.py
Entrada: art-source/dominga_condor.webp (lámina «Condor Rider»; fondo azul con celdas celestes)
Salida:
  public/assets/sprites/dominga_condor.png        cuadros iguales, grilla de 6 columnas (mapa en README.md)
  public/assets/sprites/dominga_proyectiles.png   0 bola de fuego, 1 mega bola de fuego, 2 impacto del poder final
  art-source/dominga_vuelo/*.png                  cada figura limpia en resolución original

Dominga lleva ropa verde azulada: se quita solo el celeste exacto de las celdas (como en litbru_vuelo_sprites.py).
El dibujo ya tiene tamaño de juego (celdas de ~64 px): se usa a escala 1, sin reescalar.
"""
import os
from PIL import Image
import amaru_sprites as am

ROOT = am.ROOT
SRC = os.path.join(ROOT, 'art-source/dominga_condor.webp')
BGS = [(142, 197, 236), (135, 190, 232), (150, 203, 240), (128, 185, 228), (160, 210, 242),   # celda y su grilla
       (78, 148, 205), (104, 154, 199), (111, 175, 217), (152, 211, 250), (6, 72, 118)]         # bordes de celda
am.LO, am.HI = 14, 34
INSET = 4  # el marco de cada celda mide ~3 px

L6 = [(40, 112), (115, 189), (191, 265), (268, 341), (344, 418), (421, 494)]  # columnas del panel izquierdo
ROWS = [
    ('fuego',       [(x0, 84, x1, 162) for x0, x1 in L6]),                 # montar y disparar fuego
    ('despegue',    [(x0, 200, x1, 278) for x0, x1 in L6]),
    ('salto',       [(41, 322, 113, 407), (114, 322, 204, 407), (205, 322, 327, 407), (333, 322, 421, 407), (424, 322, 492, 407)]),
    ('danio',       [(40, 455, 121, 540), (128, 455, 212, 540), (221, 455, 304, 540), (314, 455, 397, 540), (406, 455, 494, 540)]),
    ('vuelo',       [(538, 55, 610, 152), (611, 55, 688, 152), (688, 55, 764, 152), (765, 55, 840, 152), (840, 55, 914, 152), (915, 55, 988, 152)]),
    ('poder',       [(537, 198, 620, 284), (628, 198, 715, 284), (720, 198, 808, 284), (814, 198, 900, 284), (905, 198, 990, 284)]),
    ('frente',      [(536, 336, 628, 422), (633, 336, 720, 422), (724, 336, 811, 422), (818, 336, 898, 422), (902, 336, 990, 422)]),
    ('interaccion', [(521, 458, 603, 542), (608, 458, 686, 542), (691, 458, 778, 542)]),
]
# proyectiles: una bola de fuego del ataque, la mega bola y el impacto del poder final
PROJ = [('bola_fuego', (414, 127, 441, 155)), ('mega_bola', (866, 210, 900, 264)), ('impacto', (905, 198, 990, 284))]


def main():
    im = Image.open(SRC).convert('RGB')
    out = os.path.join(ROOT, 'art-source/dominga_vuelo'); os.makedirs(out, exist_ok=True)
    frames = []
    for row, boxes in ROWS:
        for i, box in enumerate(boxes, 1):
            box = (box[0] + INSET, box[1] + INSET, box[2] - INSET, box[3] - INSET)  # fuera el marco de la celda
            f = am.clean(im, box, BGS); frames.append(f)
            f.save(os.path.join(out, f'{row}_{i}.png'))
        print(row, [f.size for f in frames[-len(boxes):]])
    print('dominga_condor', am.pack(frames, 'public/assets/sprites/dominga_condor.png', 6), len(frames), 'cuadros')
    proj = [am.clean(im, box, BGS) for _, box in PROJ]
    for (n, _), f in zip(PROJ, proj): f.save(os.path.join(out, n + '.png'))
    print('dominga_proyectiles', am.pack(proj, 'public/assets/sprites/dominga_proyectiles.png', 3), [f.size for f in proj])


if __name__ == '__main__':
    main()
