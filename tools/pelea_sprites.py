"""Hojas de la pelea estilo Street Fighter (Round 2 contra el Supay) a partir de las láminas de art-source/pelea/
(Higgsfield, GPT Image 2). Usa la detección automática de lamina_auto.py.

Uso:  python3 tools/pelea_sprites.py
Salida (public/assets/pelea/):
  inkaxur.png  cuadros (mapa en src/scenes/Pelea.js): guardia 0–3, caminar 4–9, salto 10–12, agachado 13,
               cubrirse 14, cubrirse agachado 15, puño 16–18, patada 19–21, barrida 22–24, daño 25–26, K.O. 27–29,
               victoria 30–31
  supay.png    guardia 0–2, caminar 3–6, salto 7–10, cubrirse 11, zarpazo 12–15, embestida 16–18, coletazo 19–20,
               daño 21–22, K.O. 23–25, conjuro 26–27
  dominga.png, litbru.png  correr 0–5, guardia 6–9, cargar el plasma 10–12, festejar 13
  inkaxur_carga.png  Inkaxur cargando el plasma 0–2
  pachacutec.png  guardia 0–3, caminar 4–7, salto 8–10, cubrirse 11, vara 12–15, embestida 16–18, barrida 19–20,
               daño 21–22, K.O. 23–25, lanzar la vara 26–27, la vara sola (proyectil) 28, conjuro 29–30
  escenario.jpg  el Templo del Sol visto de costado (960×544)
  escenario_sacsayhuaman.jpg  la explanada de Sacsayhuamán (960×544)
"""
import os
from PIL import Image
from lamina_auto import load_rows, pack_rows, ROOT

SRC = lambda n: os.path.join(ROOT, 'art-source/pelea', n + '.png')
OUT = 'public/assets/pelea/'


def main():
    os.makedirs(os.path.join(ROOT, OUT), exist_ok=True)
    for name, out, h in (('lucha_inkaxur', 'inkaxur', 150), ('lucha_supay', 'supay', 205), ('lucha_pachacutec', 'pachacutec', 200)):
        rows = load_rows(SRC(name), work=2048)  # a resolución completa: los luchadores se ven grandes
        (fw, fh), idx, scale = pack_rows(rows, OUT + out + '.png', h, cols=8)
        print(out, f'cuadro {fw}x{fh}', 'filas', [(r[0], r[-1]) for r in idx], 'escala', scale)
    # los amigos que entran antes del plasma (correr 0–5, guardia 6–9, cargar 10–12, festejar 13) y la pose de carga de
    # Inkaxur (0–2); a la misma altura que Inkaxur
    for name, out, h, ref in (('lucha_dominga', 'dominga', 146, (1, 0)), ('lucha_litbru', 'litbru', 146, (1, 0)), ('lucha_carga', 'inkaxur_carga', 140, (0, 0))):
        rows = load_rows(SRC(name), work=2048)
        (fw, fh), idx, scale = pack_rows(rows, OUT + out + '.png', h, cols=8, ref=ref)
        print(out, f'cuadro {fw}x{fh}', 'filas', [(r[0], r[-1]) for r in idx], 'escala', scale)
    # escenarios: recorte al 960×544 del juego
    for src, out in (('escenario', 'escenario.jpg'), ('escenario_sacsa', 'escenario_sacsayhuaman.jpg')):
        im = Image.open(SRC(src)).convert('RGB')
        s = max(960 / im.width, 544 / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x0, y0 = (im.width - 960) // 2, (im.height - 544) // 2
        im.crop((x0, y0, x0 + 960, y0 + 544)).save(os.path.join(ROOT, OUT, out), quality=90)
        print(out, '960x544')


if __name__ == '__main__':
    main()
