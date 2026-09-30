"""Sprites de Inka Locu v2 (lámina «Undead Inca Supreme Boss»).

Uso:  python3 tools/inka_locu_sprites.py
Entrada: art-source/jefe_inka_locu_v2.jpg (celdas verde oliva con grilla, como la de El Carbunco)
Salida:
  public/assets/sprites/inka_locu.png     cuadros iguales, grilla de 8 columnas; misma numeración que usaba el jefe:
      0–5 caminar, 6–11 correr, 12 agachado, 13 despegue, 14 punto alto, 15 cayendo, 16 aterrizaje,
      17 báculo en alto con choclos (lluvia de choclos y lanzar el báculo), 18 golpe, 19 restos,
      20 de rodillas (K.O.), 21–26 reposo, 27 huesos, 28 báculo al frente, 29 amuleto, 30 quipu, 31 provocación,
      32 golpe de espaldas, 33 golpe 2, 34 de espaldas 2
  public/assets/sprites/inka_baculo.png   el báculo suelto (proyectil)
  art-source/inka_locu_v2/*.png           cada figura limpia en resolución original
Tamaño: 1,5 veces Xoxur (54 px) → 81 px de alto en reposo.
"""
import os
from PIL import Image
import amaru_sprites as am
from carbunco_sprites import OLIVE, drop_specks

# verde de las celdas + las líneas claras de su grilla (en esta lámina son más claras que en la del Carbunco)
BG = OLIVE + [(128, 144, 88), (120, 136, 80), (136, 152, 96), (132, 148, 92), (112, 128, 72), (104, 120, 72), (140, 156, 100)]

ROOT = am.ROOT
SRC = os.path.join(ROOT, 'art-source/jefe_inka_locu_v2.jpg')
TARGET_H = int(1.5 * 54)
INSET = 3
C6 = [(32, 144), (146, 256), (258, 368), (370, 480), (482, 592), (594, 706)]
row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]

FIGURES = (
    [('caminar', b) for b in row(278, 410, C6)]
    + [('correr', b) for b in row(472, 608, C6)]
    + [('agachado', (32, 670, 146, 852)), ('despegue', (148, 670, 278, 852)), ('punto_alto', (280, 670, 456, 852)),
       ('cayendo', (458, 670, 590, 852)), ('aterrizaje', (592, 670, 706, 852))]
    + [('lluvia_choclos', (264, 1138, 464, 1398)), ('golpe', (32, 1140, 132, 1256)), ('restos', (602, 1140, 706, 1256)),
       ('rodillas', (484, 1140, 588, 1256))]
    + [('reposo', b) for b in row(90, 222, C6)]
    + [('huesos', (32, 922, 146, 1080)), ('baculo_frente', (164, 922, 292, 1080)), ('amuleto', (310, 922, 438, 1080)),
       ('quipu', (458, 922, 576, 1080)), ('provocacion', (592, 922, 706, 1080))]
    + [('golpe_espalda', (144, 1140, 246, 1256)), ('golpe_2', (32, 1280, 132, 1396)), ('espalda_2', (144, 1280, 246, 1396))]
)
IDLE = 21  # primer cuadro de reposo (lo usa el retrato del panel)
# báculo suelto: la parte de la celda «báculo al frente» a la derecha de la mano
BACULO = (250, 930, 290, 1080)


def main():
    im = Image.open(SRC).convert('RGB')
    out = os.path.join(ROOT, 'art-source/inka_locu_v2'); os.makedirs(out, exist_ok=True)
    am.LO, am.HI = 6, 16
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        box = (box[0] + INSET, box[1] + INSET, box[2] - INSET, box[3] - INSET)
        f = drop_specks(am.clean(im, box, BG)); figs.append(f)
        f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[IDLE].height
    FW, FH = am.pack([am.resize(f, scale) for f in figs], 'public/assets/sprites/inka_locu.png', 8)
    print('inka_locu', (FW, FH), len(figs), 'cuadros, escala', round(scale, 3))
    # solo lo dorado/marrón (el báculo); fuera la mano verdosa que lo sostiene
    baculo = am.clean(im, BACULO, BG)
    baculo = drop_specks(am.pick(baculo, (0, 0, baculo.width, baculo.height), lambda r, g, b: r >= g - 4 and r > b + 10))
    # debajo de la cabeza del báculo solo queda el palo (± 4 px de su centro): fuera los restos de la mano
    bp = baculo.load(); w, h = baculo.size
    xs = [x for y in range(int(h * .85), h) for x in range(w) if bp[x, y][3] > 128]
    mid = sorted(xs)[len(xs) // 2] if xs else w // 2
    for y in range(int(h * .3), h):
        for x in range(w):
            if abs(x - mid) > 4: bp[x, y] = (0, 0, 0, 0)
    baculo = baculo.crop(baculo.getbbox())
    baculo.save(os.path.join(out, 'baculo.png'))
    b = am.resize(baculo, scale)
    b.save(os.path.join(ROOT, 'public/assets/sprites/inka_baculo.png'))
    print('inka_baculo', b.size)
    # datos para el retrato del panel (CSS): figura del cuadro de reposo dentro de la hoja
    idle = am.resize(figs[IDLE], scale)
    fx = (IDLE % 8) * FW + (FW - idle.width) // 2; fy = (IDLE // 8) * FH + FH - idle.height
    print('retrato: figura en', (fx, fy), 'tamaño', idle.size, 'hoja', (FW * 8, FH * (-(-len(figs) // 8))))


if __name__ == '__main__':
    main()
