"""Separa las láminas del cuy zombi (fondo blanco con grilla, como la de Xoxur Inka).

Uso:  python3 tools/cuy_sprites.py
Entrada: art-source/enemigo_cuy_zombi.webp (volador, nivel 2) y art-source/enemigo_cuy_terrestre.webp (nivel 1)
Salida:
  public/assets/sprites/cuy_volador.png      cuy volador, cuadros iguales, grilla de 6 columnas (mapa en README.md)
  public/assets/sprites/cuy_proyectiles.png  0 galleta de menta, 1 balón de gas, 2 galleta girando
  public/assets/sprites/cuy_terrestre.png    cuy terrestre (reemplaza al escarabajo del nivel 1)
  art-source/cuy/*.png                       cada figura limpia en resolución original
"""
import os
from PIL import Image
from xoxur_inka_sprites import figures, shrink

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCALE = 0.4  # el cuy es más chico que el jugador
# los cuyes llevan un borde negro de 1 px para que se noten sobre el fondo (pedido del usuario)
B, C = 'bottom', 'center'  # apoyado en el suelo / centrado (en el aire)

# Cada lámina: franjas entre las líneas de la grilla (y0, y1, x1, x0[, título]), cantidad de figuras y anclaje.
# El orden de las franjas es el orden de los cuadros en la hoja.
SHEETS = {
    'volador': {
        'src': 'art-source/enemigo_cuy_zombi.webp',
        'text_erase': [(380, 522, 522, 548)],  # «…TRANSITION)» toca las manos del 3.er cuadro de despegue
        'bands': [
            ('reposo',       (152, 232, 363, 54), 2, [B, C]),         # frontal, lateral
            ('vuelo',        (267, 374, 984, 54), 6, [C] * 6),        # vuelo tambaleante
            ('vuelo_rapido', (409, 515, 984, 54), 6, [C] * 6),        # vuelo a toda velocidad
            ('despegue',     (527, 644, 984, 54, 551), 6, [B, B, B, C, C, C]),
            ('ataque',       (680, 762, 828, 54), 5, [C] * 5),        # golpe x3, látigo de quipus x2
            ('provocacion',  (680, 762, 984, 836), 1, [B]),
            ('danio',        (797, 877, 984, 54), 6, [C, C, C, B, B, B]),  # golpe, caída, estrellado
            ('lanzar',       (910, 989, 381, 53), 2, [C] * 2),        # lanzar galleta de menta
        ],
        'out': 'public/assets/sprites/cuy_volador.png',
        'extra': ('objetos', (910, 989, 739, 390), 3, 'public/assets/sprites/cuy_proyectiles.png'),
    },
    'terrestre': {
        'src': 'art-source/enemigo_cuy_terrestre.webp',
        # etiquetas (F1, SW1, WS1, TR1, IG1…) en la esquina inferior derecha de las celdas: quedan pegadas a las figuras
        'text_erase': [(r - 42, b - 21, r - 1, b) for b in (232, 374, 515, 644) for r in (209, 363, 518, 673, 828, 984)]
                      + [(r - 34, 968, r - 1, 989) for r in (504, 622, 739)],
        'bands': [
            ('t_reposo',      (152, 232, 363, 54), 2, [B, B]),        # frontal, lateral
            ('t_encorvado',   (267, 374, 984, 54), 6, [B] * 6),       # caminata encorvada
            ('t_caminar',     (409, 515, 984, 54), 6, [B] * 6),       # caminar de perfil
            ('t_correr',      (551, 644, 984, 54), 6, [B] * 6),
            ('t_accion',      (680, 762, 828, 54), 5, [B] * 5),       # 3 poses + látigo de quipus x2
            ('t_provocacion', (680, 762, 984, 836), 1, [B]),
            ('t_danio',       (797, 877, 984, 54), 6, [B] * 6),       # golpe, giro, caído, estrellado
            ('t_extra',       (910, 989, 381, 53), 3, [B] * 3),       # condiro, retroceso, carga andina
            ('t_recolectar',  (910, 989, 739, 390), 3, [B] * 3),      # recoger ítems
        ],
        'out': 'public/assets/sprites/cuy_terrestre.png',
    },
}


def erase_text(im, rects):
    """Pinta de blanco el texto de un título que toca a una figura (solo píxeles negros/grises)."""
    px = im.load()
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1):
            for x in range(x0, x1):
                p = px[x, y]
                if max(p) < 110 and max(p) - min(p) < 25: px[x, y] = (255, 255, 255)


def outline(im, color=(20, 14, 10, 255), pad=1):
    """Borde negro de 1 px alrededor de la figura (para que se note sobre el fondo)."""
    im2 = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad)); im2.alpha_composite(im, (pad, pad))
    p = im2.load(); out = im2.copy(); o = out.load(); w, h = im2.size
    for y in range(h):
        for x in range(w):
            if p[x, y][3] >= 128: continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and p[x + dx, y + dy][3] >= 128
                   for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                o[x, y] = color
    return out


def pack(frames, anchors, path, cols=6):
    FW = -(-max(f.width for f in frames) // 4) * 4; FH = -(-max(f.height for f in frames) // 4) * 4
    cols = min(cols, len(frames)); rows = -(-len(frames) // cols)
    sheet = Image.new('RGBA', (FW * cols, FH * rows))
    for i, (f, a) in enumerate(zip(frames, anchors)):
        x = (FW - f.width) // 2
        y = FH - f.height if a == B else (FH - f.height) // 2
        sheet.alpha_composite(f, ((i % cols) * FW + x, (i // cols) * FH + y))
    sheet.save(os.path.join(ROOT, path))
    return FW, FH


def main():
    out = os.path.join(ROOT, 'art-source/cuy'); os.makedirs(out, exist_ok=True)
    for name, cfg in SHEETS.items():
        im = Image.open(os.path.join(ROOT, cfg['src'])).convert('RGB')
        erase_text(im, cfg['text_erase'])
        frames, anchors = [], []
        for key, band, count, anchor in cfg['bands']:
            figs = figures(im, band)
            print(key, len(figs), [f.size for f in figs])
            assert len(figs) == count, (key, len(figs))
            for i, f in enumerate(figs, 1): f.save(os.path.join(out, f'{key}_{i}.png'))
            frames += [outline(shrink(f, SCALE)) for f in figs]; anchors += anchor
        print(name, pack(frames, anchors, cfg['out']), len(frames), 'cuadros')
        if 'extra' in cfg:
            key, band, count, path = cfg['extra']
            figs = figures(im, band); assert len(figs) == count, (key, len(figs))
            for i, f in enumerate(figs, 1): f.save(os.path.join(out, f'{key}_{i}.png'))
            print(key, pack([shrink(f, SCALE) for f in figs], [C] * count, path))  # proyectiles sin borde


if __name__ == '__main__':
    main()
