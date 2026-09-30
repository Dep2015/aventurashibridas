"""Sprites del choclo zombi radiactivo (enemigo volador del nivel 2, antes del jefe final).

Uso:  python3 tools/choclo_sprites.py
Entrada: art-source/enemigo_choclo_radiactivo.webp (mismo estilo que la lámina del Jaguar: fondo azul, celdas celestes)
Salida:
  public/assets/sprites/choclo_radiactivo.png       cuadros iguales, grilla de 8 columnas (mapa en README.md)
  public/assets/sprites/choclo_radiactivo_hacha.png hachas girando + hacha T dorada
  art-source/choclo/*.png                           cada figura limpia en resolución original
"""
import os
from jaguar_sprites import Sheet, shrink, pack, ROOT

SRC = os.path.join(ROOT, 'art-source/enemigo_choclo_radiactivo.webp')
TARGET_H = 81  # el choclo de pie (aterrizaje) mide 1,5 Xoxur
CELL = lambda i, y0, y1: (48 + i * 118.5, y0, 48 + (i + 1) * 118.5, y1)

FIGURES = (
    [('vuelo', CELL(i, 106, 240)) for i in range(8)]
    + [('vuelo_rapido', CELL(i, 288, 426)) for i in range(8)]  # los cuadros 6 y 7 traen un charco de baba
    + [('agachado', (50, 480, 170, 712)), ('despegue', (172, 480, 312, 712)),
       ('cayendo', (314, 480, 418, 712)), ('aterrizaje', (418, 480, 526, 712)),
       ('ataque', (540, 476, 632, 576)), ('soltar_hacha', (632, 476, 722, 576)),
       ('recuperacion', (838, 476, 920, 576)),
       ('aliento_carga', (548, 640, 690, 762)), ('aliento_suelta', (690, 640, 880, 762)),
       ('aliento_rayo', (880, 640, 1024, 762)),
       ('danio_aire', (46, 826, 176, 972)), ('danio_aire', (176, 826, 300, 972)),
       ('danio_frente', (300, 826, 440, 972)), ('rodillas', (440, 826, 560, 972)), ('ko', (560, 826, 750, 972))]
)
# la fila 4 (ataque con hacha) está dibujada más chica: el choclo de pie mide 88 px ahí y 122 px en la fila 3
ROW_SCALE = {'ataque': 1.4, 'soltar_hacha': 1.4, 'recuperacion': 1.4}
# cuatro hachas girando, unidas por la estela → un recuadro por hacha
AXES = [(718, 494, 744, 528), (744, 492, 771, 522), (771, 498, 800, 528), (800, 512, 838, 550)]
GOLD_AXE = (922, 478, 1008, 576)


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/choclo'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        box = tuple(int(v) for v in box)
        if name == 'soltar_hacha':  # es una sola pieza con las hachas que vuelan: se recorta a su celda
            f = max(sh.pieces(box, 200), key=lambda im: im.width * im.height)
        else:
            f = sh.figure(box)
        figs.append(f)
        f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    print([f.size for f in figs])
    scale = TARGET_H / figs[19].height  # 19 = aterrizaje
    frames = [shrink(f, scale * ROW_SCALE.get(n, 1)) for (n, _), f in zip(FIGURES, figs)]
    print('choclo_radiactivo', pack(frames, 'public/assets/sprites/choclo_radiactivo.png', 8), len(frames), 'cuadros, escala', round(scale, 3))

    axes = [max(sh.pieces(b, 40), key=lambda im: im.width * im.height) for b in AXES]
    gold = sh.figure(GOLD_AXE)
    for i, a in enumerate(axes, 1): a.save(os.path.join(out, f'hacha_{i}.png'))
    gold.save(os.path.join(out, 'hacha_dorada.png'))
    print('hachas', [a.size for a in axes])
    print('choclo_radiactivo_hacha', pack([shrink(a, scale * 1.4) for a in axes] + [shrink(gold, scale * .8)],
                                          'public/assets/sprites/choclo_radiactivo_hacha.png', 8, 'center'))


if __name__ == '__main__':
    main()
