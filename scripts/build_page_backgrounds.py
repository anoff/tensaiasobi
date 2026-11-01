"""Builds src/assets/stickers/pages/page_<shelf>.png: each scene's album page WITHOUT the dashed outline slots, the
My pages background (AD review of PR #99: a blank page shows only cream or the chosen background, no placeholder shapes).

Same card as the outline page (alib.scene_page from the art workspace, read-only: paper card, ink outline + hard shadow,
ink-soft ground line, same size), with the slot layer left out, so My pages and the print PDF match the scene's frame.

Usage: python3 scripts/build_page_backgrounds.py [/path/to/tensaiasobi-art]   (default /workspace/tensaiasobi-art)
"""
import json, os, sys

sys.dont_write_bytecode = True
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = sys.argv[1] if len(sys.argv) > 1 else '/workspace/tensaiasobi-art'
sys.path.insert(0, os.path.join(ART, 'stickers', 'album', 'src'))
import alib  # noqa: E402
import outline  # noqa: E402
from PIL import Image  # noqa: E402

outline.slot_layer = lambda size, placed: Image.new('RGBA', size, (0, 0, 0, 0))  # no slots
OUT = os.path.join(REPO, 'src', 'assets', 'stickers', 'pages')
os.makedirs(OUT, exist_ok=True)
manifest = json.load(open(os.path.join(REPO, 'src', 'assets', 'stickers', 'album', 'manifest.json')))
for sc in manifest['scenes']:
    page = alib.scene_page(sc['pieces'], sc['page']['ground'], sc['page']['span'])
    ref = Image.open(os.path.join(REPO, 'src', 'assets', 'stickers', 'album', sc['page']['file']))
    assert page.size == ref.size, (sc['shelf'], page.size, ref.size)
    page.save(os.path.join(OUT, f'page_{sc["shelf"]}.png'), optimize=True)
    print(sc['shelf'], page.size)
