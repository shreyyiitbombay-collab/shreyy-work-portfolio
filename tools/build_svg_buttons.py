#!/usr/bin/env python3
"""Turns the SVG buttons in assets/img/buttons/*.svg into the inline <svg> markup used in index.html, with every letter of the
label split into its own group (so js/main.js can roll the letters one by one on hover, exactly like the old text buttons).

Usage:  python3 tools/build_svg_buttons.py            -> prints the 4 snippets (and checks the letter counts)
        python3 tools/build_svg_buttons.py --write    -> also replaces them in index.html (between the <!--sb:NAME--> markers)

Each SVG must contain 2 <path>s: the label (a compound path, one subpath per letter outline / counter / dot) and the arrow.
LINE = height of one letter window (1.3em of the 20px label), Y0 = its top edge, both in the 48px-tall artwork's units."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUTTONS = {            # name -> (file, expected number of letters)
    'resume-sticky': ('resume-sticky.svg', 6),
    'resume':        ('resume.svg', 6),
    'linkedin':      ('linkedin.svg', 8),
    'see-more':      ('see-more-projects.svg', 24),
}
LINE, Y0 = 26, 11

def subpaths(d):
    return [m.strip() for m in re.findall(r'M[^M]*', d) if m.strip()]

def bbox(d):                      # control-point bounding box (absolute M L H V C Z paths, as exported by Figma)
    xs, ys, cx, cy = [], [], 0.0, 0.0
    for cmd, args in re.findall(r'([MLHVCZ])([^MLHVCZ]*)', d):
        n = [float(v) for v in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        if cmd in 'ML':
            for i in range(0, len(n), 2): cx, cy = n[i], n[i + 1]; xs.append(cx); ys.append(cy)
        elif cmd == 'H':
            for v in n: cx = v; xs.append(cx); ys.append(cy)
        elif cmd == 'V':
            for v in n: cy = v; xs.append(cx); ys.append(cy)
        elif cmd == 'C':
            for i in range(0, len(n), 6):
                for j in (0, 2, 4): xs.append(n[i + j]); ys.append(n[i + j + 1])
                cx, cy = n[i + 4], n[i + 5]
    return min(xs), max(xs), min(ys), max(ys)

def letters(d):
    """group subpaths into letters: a counter (hole), an i/j dot or the k's arm overlaps its letter's horizontal span"""
    groups = []                                  # each: [x0, x1, [subpath strings]]
    for sp in sorted(subpaths(d), key=lambda s: bbox(s)[0]):
        x0, x1, _, _ = bbox(sp)
        for g in groups:
            ov = min(x1, g[1]) - max(x0, g[0])
            if ov > 0:                           # touching/overlapping spans = the same letter (counters, dots, the k's stem + arm)
                g[0], g[1] = min(g[0], x0), max(g[1], x1); g[2].append(sp); break
        else:
            groups.append([x0, x1, [sp]])
    return [' '.join(g[2]) for g in sorted(groups, key=lambda g: g[0])]

def build(name, file, expect, uid):
    s = (ROOT / 'assets/img/buttons' / file).read_text(encoding='utf-8')
    w = re.search(r'viewBox="0 0 ([\d.]+) 48"', s).group(1)
    paths = re.findall(r'<path([^>]*)/>', s)
    ds = [re.search(r'd="([^"]*)"', a).group(1).replace('\n', ' ') for a in paths]
    ls = letters(ds[0])
    assert len(ls) == expect, f'{name}: found {len(ls)} letters, expected {expect}'
    arrow_attrs = re.sub(r'\s*d="[^"]*"', '', paths[1]).strip()
    out = [f'<svg class="svgbtn__art" viewBox="0 0 {w} 48" aria-hidden="true" focusable="false">',
           f'<defs><clipPath id="sbc-{uid}"><rect x="0" y="{Y0}" width="{w}" height="{LINE}"/></clipPath></defs>',
           f'<g clip-path="url(#sbc-{uid})" fill="#F8F8FF">']
    for l in ls:
        out.append(f'<g class="sb-in"><path d="{l}"/><path transform="translate(0 {LINE})" d="{l}"/></g>')
    out += ['</g>', f'<path {arrow_attrs} d="{ds[1]}"/>', '</svg>']
    return ''.join(out), float(w) / 48

if __name__ == '__main__':
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    for uid, (name, (file, expect)) in enumerate(BUTTONS.items(), 1):
        svg, ar = build(name, file, expect, uid)
        print(f'{name:14s} {expect} letters ok, --ar:{ar:.5g}, {len(svg)} bytes')
        if '--write' in sys.argv:
            pat = re.compile(rf'(<!--sb:{name}-->).*?(<!--/sb-->)', re.S)
            assert pat.search(html), f'markers for {name} not found in index.html'
            html = pat.sub(lambda m: m.group(1) + svg + m.group(2), html)
    if '--write' in sys.argv:
        (ROOT / 'index.html').write_text(html, encoding='utf-8'); print('index.html updated')
