#!/usr/bin/env python3
"""Fetch a *public* OpenReview forum's reviews and print them as markdown.

    python3 fetch_openreview.py <forum-url-or-id>

Accepts a full URL (https://openreview.net/forum?id=XXXX, or a /pdf?id= URL) or a bare forum id.
Prints each official review's content fields as markdown, ready to drop into reviewdata.json.

Only works when the venue exposes reviews to a guest. If the submission is private (the guest
API returns 403 / no notes), it says so — ask the author to PASTE the reviews instead. Stdlib only.
"""
import json
import re
import sys
import urllib.request
import urllib.error


def forum_id(s):
    m = re.search(r'[?&](?:id|forum)=([A-Za-z0-9_\-]+)', s)
    return m.group(1) if m else s.strip()


def get(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "reviewviz/0.1"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"_error": e.code}
    except Exception as e:  # noqa: BLE001
        return {"_error": str(e)}


def notes_for(fid):
    for base in ("https://api2.openreview.net", "https://api.openreview.net"):
        d = get(f"{base}/notes?forum={fid}&details=replies")
        notes = d.get("notes") if isinstance(d, dict) else None
        if notes:
            return notes, base
    return [], None


def val(v):
    # api2 wraps each field as {"value": ...}; api v1 is plain.
    if isinstance(v, dict) and "value" in v:
        return v["value"]
    return v


def is_review(note):
    inv = (" ".join(note.get("invitations", []) or []) + " " + str(note.get("invitation", ""))).lower()
    if "review" in inv and "meta" not in inv and "rebuttal" not in inv:
        return True
    keys = {k.lower() for k in (note.get("content", {}) or {})}
    return bool(keys & {"summary_of_weaknesses", "weaknesses", "soundness", "rating", "review", "strengths"})


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: fetch_openreview.py <forum-url-or-id>")
    fid = forum_id(sys.argv[1])
    notes, base = notes_for(fid)
    if not notes:
        print(f"# No public reviews for forum `{fid}`\n\n"
              "The OpenReview guest API returned no visible notes (the submission is likely private or "
              "anonymous-only). Ask the author to paste the reviewer comments instead, then build from those.")
        return
    reviews = [n for n in notes if is_review(n)]
    if not reviews:
        print(f"# Forum `{fid}`: {len(notes)} notes, none recognised as official reviews\n\n"
              "If reviews exist behind login, paste them instead.")
        return

    print(f"# Reviews for OpenReview forum `{fid}`\n")
    print(f"_{len(reviews)} review(s) via {base}. Reviewer comments only; "
          "meta-reviews and author responses are excluded._\n")
    skip = {"title"}
    for i, n in enumerate(reviews, 1):
        sig = (n.get("signatures") or ["?"])[0].split("/")[-1]
        print(f"## Review {i} — {sig}\n")
        for k, v in (n.get("content", {}) or {}).items():
            if k.lower() in skip:
                continue
            vv = val(v)
            if vv in (None, "") or isinstance(vv, (dict, list)):
                continue
            print(f"### {k.replace('_', ' ').strip().capitalize()}\n\n{vv}\n")
    print("\n---\n_Verify each claim against the paper before tagging a factual correction._")


if __name__ == "__main__":
    main()
