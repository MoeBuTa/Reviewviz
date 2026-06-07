#!/usr/bin/env python3
"""Build an annotated reviewer-comment HTML page (original text + in-place highlights).

Usage:
    python build.py --data reviewdata.json --out reviews.html
        [--title ...] [--subtitle ...] [--footer ...] [--allow-miss]

reviewdata.json schema:
{
  "meta": {"title": "...", "subtitle": "...", "footer": "..."},   # optional
  "reviewers": [
    {
      "id": "R1", "label": "Reviewer 1",
      "blocks": [ {"t":"h","x":"Weaknesses"}, {"t":"p","x":"full paragraph text ..."}, ... ],
      "hi": [ {"s":"verbatim substring to highlight","cat":"fact","point":"Baselines",
               "reb":true,"note":"what we do"} , ... ]
    }, ...
  ]
}

Each "hi.s" MUST be an exact substring of one of that reviewer's block paragraphs, so it can
be highlighted in place. The build fails (listing the offenders) if any snippet is not found,
unless --allow-miss is given.
cat is one of: fact | question | editorial | commit | defer | strength.
"""
import argparse, json, os, sys

TEMPLATE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "template.html")
CATS = {"fact", "question", "editorial", "commit", "experiment", "defer", "strength"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--title")
    ap.add_argument("--subtitle")
    ap.add_argument("--footer")
    ap.add_argument("--allow-miss", action="store_true")
    a = ap.parse_args()

    with open(a.data, encoding="utf-8") as f:
        data = json.load(f)
    reviewers = data.get("reviewers")
    if not isinstance(reviewers, list) or not reviewers:
        sys.exit("data.reviewers must be a non-empty array")

    misses, total_hi, total_reb = [], 0, 0
    for r in reviewers:
        text = "\n".join(b.get("x", "") for b in r.get("blocks", []) if b.get("t") == "p")
        for h in r.get("hi", []):
            total_hi += 1
            total_reb += 1 if h.get("reb") else 0
            cats = h.get("cats") or ([h["cat"]] if h.get("cat") else [])  # accept single cat or cats[]
            if not cats or any(c not in CATS for c in cats):
                sys.exit(f"{r.get('id')}: cats {cats} not all in {sorted(CATS)} (snippet: {h.get('s','')[:60]!r})")
            h["cats"] = cats
            h.setdefault("reb", False); h.setdefault("point", "—"); h.setdefault("note", "")
            if h.get("s", "") not in text:
                misses.append((r.get("id"), h.get("s", "")))

    if misses:
        print(f"[build] {len(misses)} highlight snippet(s) not found in the original text:", file=sys.stderr)
        for rid, s in misses:
            print(f"  - {rid}: {s[:90]!r}", file=sys.stderr)
        if not a.allow_miss:
            sys.exit("Fix the snippets (must be exact substrings) or pass --allow-miss.")

    meta = data.get("meta", {})
    title = a.title or meta.get("title", "Reviewer Comments &amp; Rebuttal Triage")
    subtitle = a.subtitle or meta.get("subtitle",
        "The original reviews, with the sentences that need a reply highlighted in place and colour-coded by what we should do about them.")
    footer = a.footer or meta.get("footer",
        "Focus mode greys out everything except the must-reply sentences. Highlight colour = action (or rebuttal point).")

    with open(TEMPLATE, encoding="utf-8") as f:
        html = f.read()
    out_obj = {"reviewers": reviewers}
    point_order = data.get("pointOrder") or meta.get("pointOrder")
    if point_order:
        out_obj["pointOrder"] = point_order
    payload = json.dumps(out_obj, ensure_ascii=False).replace("</", "<\\/")
    html = (html.replace("__DATA__", payload)
                .replace("__TITLE__", title)
                .replace("__SUBTITLE__", subtitle)
                .replace("__FOOTER__", footer))
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {a.out}: {len(reviewers)} reviewers, {total_hi} highlights, {total_reb} must-reply"
          + (f", {len(misses)} UNMATCHED" if misses else ", all snippets matched"))

if __name__ == "__main__":
    main()
