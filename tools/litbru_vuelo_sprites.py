"""Sprites de Litbru en vuelo: avioneta con sus gatos y el poder de fuego y plasma.

Uso:  python3 tools/litbru_vuelo_sprites.py
Entrada: art-source/litbru_avioneta.webp (fondo azul con celdas celestes)
Salida:
  public/assets/sprites/litbru_avion.png        0 de frente (con aura eléctrica), 1 de lado, 2 de lado acelerando
  public/assets/sprites/litbru_poder.png        0 anticipación, 1 lanzamiento (gatos disparando), 2 recuperación
  public/assets/sprites/litbru_proyectiles.png  0 bola de plasma, 1 bola de fuego
  art-source/litbru_vuelo/*.png                 cada figura limpia en resolución original

La avioneta es azul acero y el aura celeste: no se puede usar «todo lo azulado es fondo» (como en el Jaguar).
Se recorta por dentro de cada celda y se quita solo el celeste exacto de la celda y sus líneas.
"""
import os
from PIL import Image
import amaru_sprites as am

ROOT = am.ROOT
SRC = os.path.join(ROOT, 'art-source/litbru_avioneta.webp')
BGS = [(149, 211, 229), (142, 206, 226), (156, 216, 234), (136, 200, 222), (170, 230, 244)]  # celda y líneas de su grilla
am.LO, am.HI = 14, 34
LITBRU_H = 58  # Litbru de pie en el juego (litbru.png, reposo)

AVION = [('frente', (59, 124, 358, 349)), ('lado', (399, 124, 712, 349)), ('lado_acelera', (827, 124, 1263, 349))]
PODER = [('anticipacion', (59, 436, 375, 684)), ('lanzamiento', (399, 436, 999, 684)), ('recuperacion', (1020, 436, 1318, 684))]
PROYECTILES = [('plasma', (768, 468, 832, 530)), ('fuego', (632, 530, 1000, 604))]


def main():
    im = Image.open(SRC).convert('RGB')
    out = os.path.join(ROOT, 'art-source/litbru_vuelo'); os.makedirs(out, exist_ok=True)
    figs = {}
    for name, box in AVION + PODER + PROYECTILES:
        figs[name] = am.clean(im, box, BGS)
        figs[name].save(os.path.join(out, name + '.png')); print(name, figs[name].size)
    # escala: Litbru de pie (anticipación) mide lo mismo que en el juego; en la fila de la avioneta está
    # dibujado ~1,2 veces más chico (se compara el ancho de la gorra)
    s2 = LITBRU_H / figs['anticipacion'].height
    s1 = s2 * 1.2
    print('litbru_avion', am.pack([am.resize(figs[n], s1) for n, _ in AVION], 'public/assets/sprites/litbru_avion.png', 3))
    print('litbru_poder', am.pack([am.resize(figs[n], s2) for n, _ in PODER], 'public/assets/sprites/litbru_poder.png', 3))
    print('litbru_proyectiles', am.pack([am.resize(figs[n], s2) for n, _ in PROYECTILES], 'public/assets/sprites/litbru_proyectiles.png', 2))
    print('escalas', round(s1, 3), round(s2, 3))


if __name__ == '__main__':
    main()
