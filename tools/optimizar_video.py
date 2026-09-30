"""Recomprime los videos de public/assets/ (especiales de la pelea y el prólogo) para que pesen menos al jugar por
internet, sin cambiar cómo se ven: H.264 a CRF 26 (preset lento), audio AAC 96 kb/s y «faststart» (el índice va al
principio del archivo, así el video empieza a reproducirse antes de terminar de bajar).

Guarda el original en art-source/videos_originales/ (misma ruta) y siempre recomprime desde ahí, así correrlo dos
veces no pierde calidad. Solo reemplaza el video si el nuevo pesa menos.

Necesita ffmpeg (brew install ffmpeg).
Uso:  python3 tools/optimizar_video.py
"""
import os, shutil, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/assets')
BACKUP = os.path.join(ROOT, 'art-source/videos_originales')
CRF = '26'


def main():
    antes = despues = 0
    for dp, _, fs in os.walk(SRC):
        for f in sorted(fs):
            if not f.endswith('.mp4'): continue
            p = os.path.join(dp, f); rel = os.path.relpath(p, SRC)
            orig = os.path.join(BACKUP, rel)
            if not os.path.exists(orig):
                os.makedirs(os.path.dirname(orig), exist_ok=True); shutil.copy2(p, orig)
            tmp = tempfile.mktemp(suffix='.mp4')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', orig,
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                            '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', tmp], check=True)
            s0, s1 = os.path.getsize(orig), os.path.getsize(tmp)
            antes += s0
            if s1 < os.path.getsize(p):
                shutil.move(tmp, p); despues += s1
                print(f'{s0 / 1e6:5.1f} MB → {s1 / 1e6:4.1f} MB  {rel}')
            else:
                os.remove(tmp); despues += os.path.getsize(p)
                print(f'{s0 / 1e6:5.1f} MB (sin cambio)  {rel}')
    print(f'total {antes / 1e6:.1f} MB → {despues / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
