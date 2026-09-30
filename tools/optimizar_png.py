"""Achica las hojas de sprites de public/assets/ pasándolas a paleta de 256 colores (PNG con transparencia).

Pesan ~4 veces menos y en los personajes no se nota la diferencia. Solo toca las imágenes con transparencia (hojas de
personajes, enemigos y objetos): los fondos opacos tienen degradados suaves (cielo, tormenta) y con 256 colores se ven
escalones, así que se dejan como están. Las que ya tienen paleta se saltan.

Antes de cambiar un archivo guarda el original en art-source/png_originales/ (misma ruta).
Correrlo otra vez después de regenerar sprites con las otras herramientas (items_sprites.py, pelea_sprites.py, ...).

Uso:  python3 tools/optimizar_png.py            (todo public/assets)
      python3 tools/optimizar_png.py --ver      (solo muestra qué haría)
"""
import os, sys, io, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/assets')
BACKUP = os.path.join(ROOT, 'art-source/png_originales')
MIN_TRANSPARENTE = .10   # fracción mínima de píxeles transparentes para considerarla una hoja de sprites


def main():
    solo_ver = '--ver' in sys.argv
    antes = despues = 0
    for dp, _, fs in os.walk(SRC):
        for f in sorted(fs):
            if not f.endswith('.png'): continue
            p = os.path.join(dp, f); rel = os.path.relpath(p, SRC)
            im = Image.open(p)
            if im.mode == 'P': continue
            im = im.convert('RGBA')
            alpha = im.getchannel('A').histogram()
            if sum(alpha[:16]) / (im.width * im.height) < MIN_TRANSPARENTE: continue   # opaca: fondo
            q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
            buf = io.BytesIO(); q.save(buf, 'PNG', optimize=True)
            s0, s1 = os.path.getsize(p), buf.tell()
            if s1 >= s0 * .9: continue
            antes += s0; despues += s1
            print(f'{s0 / 1e3:7.0f}K → {s1 / 1e3:6.0f}K  {rel}')
            if solo_ver: continue
            dst = os.path.join(BACKUP, rel)
            if not os.path.exists(dst):
                os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(p, dst)
            with open(p, 'wb') as fh: fh.write(buf.getvalue())
    print(f'total {antes / 1e6:.1f} MB → {despues / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
