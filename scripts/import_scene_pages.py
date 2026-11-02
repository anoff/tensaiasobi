#!/usr/bin/env python3
"""Copy approved scene-page layers (docs/ART.md §6 "Scene pages") from the Artist's pages/ into the app.

Everything is read from the Artist's pages/themes.json: no file name is written here. The shared skies/walls
are always copied; of the themes only the approved ones are (the rest stay placeholder layers in the app).
The app copy of themes.json holds only those themes, and stale PNGs in the target are removed, so a re-run
after the Artist renames or recolours files leaves exactly what themes.json lists.

Usage:
  python3 scripts/import_scene_pages.py playground living_room     # approve these themes (replaces the list)
  python3 scripts/import_scene_pages.py --all                      # approve every theme in the Artist's themes.json
  python3 scripts/import_scene_pages.py                            # re-run: keep the themes approved last time
  --from DIR   the Artist's pages/ (default /workspace/tensaiasobi-art/scenes/pages)
"""
import argparse, json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, '..', 'src', 'assets', 'stickers', 'pages')
DEFAULT_SRC = '/workspace/tensaiasobi-art/scenes/pages'


def pngs(node):
    """Every *.png file name anywhere in a themes.json node (skies, theme-only skies, backdrops, ground, props)."""
    if isinstance(node, str):
        return [node] if node.endswith('.png') else []
    if isinstance(node, dict):
        return [f for v in node.values() for f in pngs(v)]
    if isinstance(node, list):
        return [f for v in node for f in pngs(v)]
    return []


def theme_sky_ids(t):
    s = t['skies']
    return list(s) if isinstance(s, dict) else [x if isinstance(x, str) else x['id'] for x in s]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('themes', nargs='*', help='approved theme ids (default: the ones already in the app)')
    ap.add_argument('--all', action='store_true', help="approve every theme in the Artist's themes.json")
    ap.add_argument('--from', dest='src', default=DEFAULT_SRC)
    a = ap.parse_args()
    src = json.load(open(os.path.join(a.src, 'themes.json')))
    dest_json = os.path.join(DEST, 'themes.json')
    approved = [t['id'] for t in src['themes']] if a.all else a.themes or ([t['id'] for t in json.load(open(dest_json))['themes']] if os.path.exists(dest_json) else [])
    by_id = {t['id']: t for t in src['themes']}
    missing = [t for t in approved if t not in by_id]
    if missing:
        sys.exit(f'not in {a.src}/themes.json: {missing}')
    themes = [by_id[t] for t in approved]
    for t in themes:
        own = {x['id'] for x in t['skies'] if isinstance(x, dict)} if isinstance(t['skies'], list) else set(t['skies'])
        bad = [s for s in theme_sky_ids(t) if s not in src['skies'] and s not in own]
        if bad:
            sys.exit(f'{t["id"]}: unknown skies {bad}')
    files = list(dict.fromkeys(pngs(src['skies']) + [f for t in themes for f in pngs(t)]))
    absent = [f for f in files if not os.path.isfile(os.path.join(a.src, f))]
    if absent:
        sys.exit(f'missing in {a.src}: {absent}')
    os.makedirs(DEST, exist_ok=True)
    for f in files:
        shutil.copyfile(os.path.join(a.src, f), os.path.join(DEST, f))
    stale = sorted(f for f in os.listdir(DEST) if f.endswith('.png') and f not in files)
    for f in stale:
        os.remove(os.path.join(DEST, f))
    out = {**src, 'themes': themes}
    with open(dest_json, 'w') as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    print(f'{len(files)} files ({len(src["skies"])} skies, themes: {", ".join(approved) or "none"}); removed {stale or "nothing"}')


if __name__ == '__main__':
    main()
