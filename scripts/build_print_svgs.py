"""Builds src/assets/stickers/print/svg/print_<id>.svg (and print_acc_<id>.svg): every collectible and accessory
as a full vector die-cut (white cut, shelf rim as ONE <path id="rim">, ink edge, hard shadow as <path id="shadow">), for the print PDFs.

It reuses the Art Director's approved recipe read-only (tensaiasobi-art/phase1/src/plib.py full_sticker_svg, the
same masks as stickers.die_cut), so the vector print matches the 256 px PNGs in the app. Moods carry no rim in their
manifest; their rim is the token whose raster die-cut matches the committed PNG best. The print_ prefix keeps them
out of the PWA precache (vite.config.ts globIgnores).

Usage: python3 scripts/build_print_svgs.py [/path/to/tensaiasobi-art]   (default /workspace/tensaiasobi-art)
"""
import json, os, re, sys

sys.dont_write_bytecode = True
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = sys.argv[1] if len(sys.argv) > 1 else '/workspace/tensaiasobi-art'
sys.path.insert(0, os.path.join(ART, 'phase1', 'src'))
from plib import full_sticker_svg, trace, stk, INK, BUTTER, CORAL, LEAF, PEBBLE, COAL  # noqa: E402
import cairosvg, io  # noqa: E402
from scipy import ndimage  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from shapely.geometry import LineString  # noqa: E402

TOLERANCE = 0.12  # px of 256 (5 cm sticker: ~0.02 mm), far below print resolution


def simplify(d):
    """Thin the traced contours (Douglas-Peucker) so the SVGs stay small; 1 decimal is plenty for print."""
    out = []
    for part in re.findall(r'M[^MZ]+Z', d):
        pts = [tuple(map(float, xy.split())) for xy in re.split(r'\s*[ML]\s*', part[:-1]) if xy.strip()]
        line = LineString(pts + [pts[0]]).simplify(TOLERANCE)
        out.append('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in list(line.coords)[:-1]) + 'Z')
    return ''.join(out)

TOKENS = {'butter': BUTTER, 'coral': CORAL, 'leaf': LEAF, 'pebble': PEBBLE, 'coal': COAL}
A = os.path.join(REPO, 'src', 'assets', 'stickers')
OUT = os.path.join(A, 'print', 'svg')
os.makedirs(OUT, exist_ok=True)


def entries():
    album = json.load(open(f'{A}/album/manifest.json'))
    for s in album['stickers']:
        yield s['id'], 'album', s['svg'], s['file'], s.get('rim')
    for p in album['scenePieces']:
        yield p['id'], 'album', p['svg'], p['file'], p.get('rim')
    for m in json.load(open(f'{A}/moods/manifest.json'))['moods']:
        yield m['id'], 'moods', m['svg'], m['file'], m.get('rim')
    for g in json.load(open(f'{A}/general/manifest.json'))['stickers']:
        yield g['id'], 'general', g['svg'], g['file'], g.get('rim')


report = []
for sid, folder, svg, png, rim in entries():
    t = open(f'{A}/{folder}/{svg}').read()
    vb = re.search(r'viewBox="([^"]+)"', t).group(1)
    inner = re.sub(r'^<svg[^>]*>|</svg>\s*$', '', t.strip())
    ref = np.asarray(Image.open(f'{A}/{folder}/{png}').convert('RGBA')).astype(int)
    _, art4 = stk.render(inner, vb, stk.ART_BOX * stk.SS)
    diffs = {n: float(np.abs(np.asarray(stk.die_cut(art4, c).convert('RGBA')).astype(int) - ref).mean())
             for n, c in TOKENS.items() if rim in (None, n)}
    name = min(diffs, key=diffs.get)
    s, _ = full_sticker_svg(inner, vb, TOKENS[name])
    s = re.sub(r'(<path id="(?:shadow|edge|rim|cut)" d=")([^"]+)"', lambda m: m.group(1) + simplify(m.group(2)) + '"', s)
    open(f'{OUT}/print_{sid}.svg', 'w').write(s)
    report.append((sid, name, diffs[name]))

# Accessories: the accessories/src/acc.py recipe (art in its own box, centred on the 256 canvas; white cut 8, butter
# rim 3, ink edge 2, hard shadow (4, 5) px), traced the same way, so they overlay a print sticker 1:1 like the PNGs.
BAND, RIM, EDGE, SHADOW = 8, 3, 2, (4, 5)
for a in json.load(open(f'{A}/accessories/manifest.json'))['accessories']:
    t = open(f'{A}/accessories/{a["svg"]}').read()
    vb = re.search(r'viewBox="([^"]+)"', t).group(1)
    bx = int(float(re.search(r'width="([\d.]+)"', t).group(1)))
    inner = re.sub(r'^<svg[^>]*>|</svg>\s*$', '', t.strip())
    SS, N = 4, 256 * 4
    doc = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{bx * SS}" height="{bx * SS}">{inner}</svg>'
    art4 = np.array(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=doc.encode(), output_width=bx * SS, output_height=bx * SS))).convert('RGBA'))
    n = art4.shape[0]; o = (N - n - max(SHADOW) * SS) // 2
    canvas = np.zeros((N, N), bool); canvas[o:o + n, o:o + n] = art4[..., 3] > 127
    m = ndimage.binary_fill_holes(canvas); d = ndimage.distance_transform_edt(~m)
    F = lambda r: ndimage.binary_fill_holes(d <= r * SS)
    e, r, c = (simplify(trace(F(x))) for x in (BAND + RIM + EDGE, BAND + RIM, BAND))
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">'
         f'<path id="shadow" d="{e}" fill="{INK}" transform="translate({SHADOW[0]} {SHADOW[1]})"/>'
         f'<path id="edge" d="{e}" fill="{INK}"/><path id="rim" d="{r}" fill="{BUTTER}"/><path id="cut" d="{c}" fill="#ffffff"/>'
         f'<svg id="art" x="{o / SS}" y="{o / SS}" width="{bx}" height="{bx}" viewBox="{vb}">{inner}</svg></svg>')
    open(f'{OUT}/print_acc_{a["id"]}.svg', 'w').write(s)
    got = np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=256, output_height=256))).convert('RGBA')).astype(int)
    ref = np.asarray(Image.open(f'{A}/accessories/{a["file"]}').convert('RGBA')).astype(int)
    report.append(('acc_' + a['id'], 'butter', float(np.abs(got - ref).mean())))

worst = max(report, key=lambda r: r[2])
print(f'{len(report)} print SVGs -> {OUT}; worst raster match {worst[0]} ({worst[1]}) mean |diff| {worst[2]:.3f}')
