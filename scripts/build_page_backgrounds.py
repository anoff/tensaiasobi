"""Builds src/assets/stickers/pages/page_<shelf>.png: the My pages background for a scene shelf. AD review of PR #99: a
blank page shows only cream or the chosen background, no placeholder shapes, so the dashed outline slots are left out.

Same card recipe as the album outline page (alib.scene_page in the art workspace, read-only: paper card, 32 px corners,
4 px ink outline, (8, 9) hard ink shadow, 4 px ink-soft ground line 70 px above the bottom, 60 px side pad), drawn in the
My pages shape (A4 portrait, 1:sqrt 2) so it fills the page and its print 1:1.

Usage: python3 scripts/build_page_backgrounds.py [/path/to/tensaiasobi-art]   (default /workspace/tensaiasobi-art)
"""
import json, os, sys

sys.dont_write_bytecode = True
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = sys.argv[1] if len(sys.argv) > 1 else '/workspace/tensaiasobi-art'
sys.path.insert(0, os.path.join(ART, 'stickers', 'album', 'src'))
import alib  # noqa: E402
import outline  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

W = 900
H = round(W * 2 ** 0.5)
PAD = 60
OUT = os.path.join(REPO, 'src', 'assets', 'stickers', 'pages')
os.makedirs(OUT, exist_ok=True)
manifest = json.load(open(os.path.join(REPO, 'src', 'assets', 'stickers', 'album', 'manifest.json')))
for sc in manifest['scenes']:
    im = Image.new('RGBA', (W + 8, H + 9), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((8, 9, W + 7, H + 8), 32, fill=alib._rgb(alib.INK))
    d.rounded_rectangle((0, 0, W - 1, H - 1), 32, fill=outline.PAPER, outline=alib._rgb(alib.INK), width=4)
    gy = H - 70
    d.line((PAD - 20, gy, W - PAD + 20, gy), fill=alib._rgb(alib.INKSOFT), width=4)
    im.save(os.path.join(OUT, f'page_{sc["shelf"]}.png'), optimize=True)
    print(sc['shelf'], im.size)
