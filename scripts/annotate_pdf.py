#!/usr/bin/env python3
"""Annotate the paper PDF with the reviewer comments, colour-coded by rebuttal point.

    python3 annotate_pdf.py --pdf paper.pdf --data reviewdata.json --out paper_annotated.pdf \
        [--base-url https://host/reviews.html]

Needs PyMuPDF:  pip install pymupdf

Each highlight in reviewdata.json may carry a `paperRef` — the spot in the paper the comment refers
to — as an object (or a list of them):

    "paperRef": { "find": "verbatim phrase present in the PDF", "label": "Fig. 4 (t-SNE)", "page": 12 }

`find` is located in the PDF (optionally restricted to 1-based `page`), highlighted in the colour of
its rebuttal `point` (the same palette the HTML page uses), given a popup carrying the reviewer
comment + the rebuttal note, and — when --base-url is set — a link to <base-url>#grp-<point-slug>,
so clicking the highlight in the paper opens that point in the rebuttal page.
"""
import argparse
import json
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF is required for annotate_pdf.py:  pip install pymupdf")

# Same point palette as assets/template.html (PT_PALETTE). Index = position in the points list.
PT_PALETTE = [
    "#15803d", "#1d4ed8", "#b45309", "#7c3aed", "#0f766e",
    "#be123c", "#9333ea", "#0891b2", "#ca8a04", "#475569",
]


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def slug(p):  # must match template.html slug(): 'grp-' + lower, non-alnum runs -> '-'
    return "grp-" + re.sub(r"[^a-z0-9]+", "-", p.lower())


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def points_in_order(data):
    order = data.get("pointOrder") or []
    seen = []
    for r in data.get("reviewers", []):
        for h in r.get("hi", []):
            p = h.get("point")
            if p and p != "—" and p not in seen:
                seen.append(p)
    return [p for p in order if p in seen] + [p for p in seen if p not in order]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--base-url", default=None, help="rebuttal page URL; highlights link to <url>#grp-<point>")
    a = ap.parse_args()

    with open(a.data, encoding="utf-8") as f:
        data = json.load(f)
    points = points_in_order(data)
    color_of = {p: PT_PALETTE[i % len(PT_PALETTE)] for i, p in enumerate(points)}

    doc = fitz.open(a.pdf)
    n_marks, unfound = 0, []
    for r in data.get("reviewers", []):
        rid = r.get("id", "?")
        for h in r.get("hi", []):
            refs = h.get("paperRef")
            if not refs:
                continue
            if isinstance(refs, dict):
                refs = [refs]
            point = h.get("point", "—")
            rgb = hex_rgb(color_of.get(point, "#475569"))
            title = f"{rid} · {point}" if point and point != "—" else rid
            note = strip_html(h.get("note", ""))
            content = strip_html(h.get("s", "")) + (f"\n\n-> {note}" if note else "")
            for ref in refs:
                find = ref.get("find")
                if not find:
                    continue
                pages = [ref["page"] - 1] if ref.get("page") else range(doc.page_count)
                placed = False
                for pi in pages:
                    if pi < 0 or pi >= doc.page_count:
                        continue
                    rects = doc[pi].search_for(find)
                    if not rects:
                        continue
                    page = doc[pi]
                    annot = page.add_highlight_annot(rects[0])  # first occurrence only
                    annot.set_colors(stroke=rgb)
                    annot.set_opacity(0.45)
                    annot.set_info(title=title, content=content)
                    annot.update()
                    if a.base_url:
                        page.insert_link({"kind": fitz.LINK_URI, "from": rects[0],
                                          "uri": f"{a.base_url}#{slug(point)}"})
                    n_marks += 1
                    placed = True
                    break
                if not placed:
                    unfound.append((rid, find[:60]))

    doc.save(a.out, garbage=3, deflate=True)
    print(f"wrote {a.out}: {n_marks} annotation(s) across {len(points)} point(s)"
          + (f", {len(unfound)} ref(s) NOT FOUND" if unfound else ""))
    for rid, f in unfound:
        print(f"  unfound: {rid}: {f!r}", file=sys.stderr)


if __name__ == "__main__":
    main()
