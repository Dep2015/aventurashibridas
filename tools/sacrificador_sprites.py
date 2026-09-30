"""Sprites de El Sacrificador (Jaguar Guerrero, jefe final del nivel 1), lámina v1.1 «Undead Edition».

Uso:  python3 tools/sacrificador_sprites.py
Entrada: art-source/jefe_jaguar_v2.jpg (celdas celestes con grilla; el jaguar no tiene azules)
Salida:
  public/assets/sprites/jaguar.png   cuadros iguales, grilla de 8 columnas:
      0–7 avanzar, 8–15 reposo, 16 agachado, 17 punto alto (salto de frente), 18 cayendo, 19 aterrizaje,
      20 lanzar hacha: anticipación, 21 soltar, 22 recuperación, 23 celebración, 24–26 daño,
      27 hacha en alto, 28 hacha lanzada, 29 de rodillas, 30 K.O.
  public/assets/sprites/jaguar_hacha.png   hacha T dorada (proyectil)
  art-source/sacrificador/*.png           cada figura limpia en resolución original
Tamaño: 4 veces Xoxur (54 px) → 216 px de alto en reposo.
"""
import os
from jaguar_sprites import Sheet, shrink, pack, ROOT
from sapazo_sprites import figure

SRC = os.path.join(ROOT, 'art-source/jefe_jaguar_v2.jpg')
TARGET_H = 4 * 54
C8 = [(48, 165), (167, 287), (289, 405), (407, 523), (525, 642), (644, 760), (762, 880), (882, 996)]
row = lambda y0, y1, xs: [(x0, y0, x1, y1) for x0, x1 in xs]
FIGURES = (
    [('avanzar', b) for b in row(292, 420, C8)]
    + [('reposo', b) for b in row(113, 238, C8)]
    + [('agachado', (48, 480, 163, 706)), ('punto_alto', (165, 480, 312, 706)),
       ('cayendo', (314, 480, 410, 706)), ('aterrizaje', (412, 480, 520, 706))]
    + [('anticipacion', (543, 480, 624, 572)), ('soltar', (626, 480, 712, 572)), ('recuperacion', (830, 480, 908, 572))]
    + [('celebracion', (543, 642, 674, 752))]
    + [('danio', b) for b in row(642, 752, [(688, 790), (790, 893), (893, 996)])]
    + [('hacha_alto', (48, 822, 178, 966)), ('hacha_lanzada', (190, 822, 404, 966)),
       ('rodillas', (418, 822, 536, 966)), ('ko', (550, 822, 734, 966))]
)
IDLE = 8
# la anticipación, soltar y recuperación (fila 4) y la celebración y el daño (fila 5) están dibujados más chicos
ROW_SCALE = {'anticipacion': 1.3, 'soltar': 1.3, 'recuperacion': 1.3, 'danio': 1.25}
AXE = (912, 480, 996, 572)


def main():
    sh = Sheet(SRC)
    out = os.path.join(ROOT, 'art-source/sacrificador'); os.makedirs(out, exist_ok=True)
    figs = []
    for i, (name, box) in enumerate(FIGURES):
        f = figure(sh, box); figs.append(f); f.save(os.path.join(out, f'{i:02d}_{name}.png'))
    scale = TARGET_H / figs[IDLE].height
    small = [shrink(f, scale * ROW_SCALE.get(n, 1)) for (n, _), f in zip(FIGURES, figs)]
    FW, FH = pack(small, 'public/assets/sprites/jaguar.png', 8)
    print('jaguar', (FW, FH), len(figs), 'cuadros, escala', round(scale, 3), [f.size for f in figs[:1]])
    axe = figure(sh, AXE); axe.save(os.path.join(out, 'hacha.png'))
    a = shrink(axe, scale * .55); a.save(os.path.join(ROOT, 'public/assets/sprites/jaguar_hacha.png'))
    print('hacha', a.size)
    idle = small[IDLE]
    fx = (IDLE % 8) * FW + (FW - idle.width) // 2; fy = (IDLE // 8) * FH + FH - idle.height
    print('retrato: figura en', (fx, fy), 'tamaño', idle.size, 'hoja', (FW * 8, FH * (-(-len(figs) // 8))))


if __name__ == '__main__':
    main()
