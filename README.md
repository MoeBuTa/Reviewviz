# ReviewAnalysis — Rebuttal Review Visualizer

An [Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) (for Claude Code) that turns
peer-review comments into a single, self-contained **interactive HTML page**: the *original*
review text with the sentences that need a reply **highlighted in place**, colour-coded by **what
to do about each one**.

It is built for planning a **rebuttal / author response**: at a glance you see what must be
answered, what is just an editorial fix, and what is framing you will defer to the camera-ready —
and you can prove your response covers everything.

![action colours: fact · question · editorial · commit · experiment · revision-only · strength](https://img.shields.io/badge/tags-7%20actions-blue)

---

## What the page gives you

- **Original text, highlighted in place.** Each reviewer's verbatim text is shown in full; the
  relevant sentences are underlined/tinted right where they appear (hover for the note).
- **Reviewer tabs + an "All reviewers" view** — read one reviewer or everyone at once.
- **"By point" tab** — every comment grouped under its rebuttal point (e.g. *Baselines*,
  *Self-consistency*, *Clarifications*), ordered by priority. **Click any item to jump to and
  flash its exact place in the text.**
- **Focus mode** — grey out everything except the must-reply sentences.
- **Hide mode** — collapse the non-highlighted paragraphs entirely (keyed on where the highlights
  actually are, so relevant comments outside "Weaknesses" are kept).
- **Colour by Action or by Rebuttal point**, with legend chips to filter.
- **Multiple tags per sentence** — one sentence can be, say, both a factual correction *and* a
  suggested experiment; it shows a two-colour underline and one chip per tag.
- **Must-reply (★) tracking** — a counter and per-tab badges show exactly what is and isn't
  covered by the response you are writing.

Fully client-side and offline — one HTML file you can open, share, or commit.

## Action taxonomy (the colour code)

| tag | colour | meaning | in the rebuttal? |
|-----|--------|---------|------------------|
| `fact` | green | The review **misstates what is / isn't in the paper**. Correct it, citing §/Table. | yes |
| `question` | blue | A **direct question** you answer from the paper. | yes |
| `editorial` | amber | A wording / figure / equation / typo fix. | yes (bundled) |
| `commit` | purple | A fair improvement for the **camera-ready** (cite, tighten, add example). | brief / defer |
| `experiment` | pink | A **suggested supplementary experiment** (a new run/ablation a reviewer asks for). | no (revision) |
| `defer` | slate | **Framing / advisory** ("define the problem", "tone down"). | no |
| `strength` | teal | Positive comment. Acknowledge only. | no |

---

## Install (as a Claude Code skill)

Clone the repo into your skills directory under the skill's name:

```bash
git clone https://github.com/MoeBuTa/ReviewAnalysis.git ~/.claude/skills/rebuttal-review-visualizer
```

Claude Code discovers it automatically (it reads each skill's `description`). Update later with
`git -C ~/.claude/skills/rebuttal-review-visualizer pull`.

> Project-scoped install: clone into `<your-project>/.claude/skills/rebuttal-review-visualizer`
> instead, to ship the skill with one repo.

## Using it with Claude

Just ask, in natural language — e.g. *"visualize these reviewer comments for my rebuttal"*,
*"triage these reviews"*, *"highlight what I need to reply to"*. Claude loads the skill and builds
the page.

**Give Claude these inputs** (the skill will ask if they're missing):

1. **The reviewer comments** — verbatim (paste, email, PDF text, or a file). *Required.*
2. **The paper PDF** (or its LaTeX/source). *Required for accuracy* — Claude must verify each
   "the review says X is missing, but it's actually in §Y" before tagging it a factual
   correction. Without the paper, those corrections would be guesses.
3. *Optional, for stronger grounding:* the **source code / artifact repo**, the
   **appendix / supplementary**, and any **prior response letter or the venue's word limit**
   (to set what you'll actually answer and how to group it).

Claude classifies every atomic comment, picks a verbatim span for each, builds `reviewdata.json`,
runs the build script, and hands you `reviews.html`.

## Using it manually / programmatically

The page is produced from a `reviewdata.json` by a small Python script (no dependencies):

```bash
python3 scripts/build.py --data reviewdata.json --out reviews.html
open reviews.html        # macOS; xdg-open on Linux
```

`build.py` **fails loudly if any highlight span is not an exact substring** of the original text,
so highlights can never silently drift off the words they annotate.

### Try the example

```bash
cd examples
node make_data.js                                  # reviews.md -> reviewdata.json
python3 ../scripts/build.py --data reviewdata.json --out reviews.html
open reviews.html
```

`examples/make_data.js` is a ~40-line, copy-me parser: it splits a markdown `reviews.md` into
blocks and carries an inline highlight spec, validating every span. Point it at your own
`reviews.md` and edit the spec.

### `reviewdata.json` schema

```json
{
  "meta": { "title": "...", "subtitle": "...", "footer": "..." },
  "pointOrder": ["Baselines", "Architecture", "..."],
  "reviewers": [
    {
      "id": "R1", "label": "Reviewer 1",
      "blocks": [
        { "t": "h", "x": "Weaknesses" },
        { "t": "p", "x": "It is impossible to tell whether the gains come from the architecture ..." }
      ],
      "hi": [
        { "s": "It is impossible to tell whether the gains come from the architecture",
          "cats": ["fact"], "point": "Architecture", "reb": true,
          "note": "<b>Correct:</b> the ablation in Table 4 isolates the architecture." },
        { "s": "One ablation removing the cache layer is needed",
          "cats": ["experiment", "commit"], "point": "Architecture", "reb": false,
          "note": "<b>Suggested experiment (camera-ready).</b>" }
      ]
    }
  ]
}
```

- **blocks** — the verbatim review, in order (`t:"h"` heading, `t:"p"` paragraph).
- **hi.s** — the exact substring to highlight (a unique phrase from its paragraph).
- **hi.cats** — one or more action tags (a single `"cat":"fact"` is also accepted).
- **hi.reb** — `true` if you actually answer it in the rebuttal → gets the ★ and stays lit in
  Focus mode.
- **hi.point** — the rebuttal point / theme, or `"—"` for none.
- **hi.note** — a short "what we'll do / where the evidence is" (light inline HTML ok).
- **pointOrder** — optional priority order for the "By point" tab.

## How it works

- The build script injects your data into `assets/template.html` (a single page of vanilla
  HTML/CSS/JS — the taxonomy and colours live in its `CAT` object and `:root` variables).
- Every highlight gets a stable anchor id in the "All" view; "By point" items resolve to it, so
  clicking jumps to and flashes the sentence.
- No build tools, no network. `scripts/build.py` is pure standard-library Python 3; the example
  helper needs Node only to parse markdown.

## Repository layout

```
SKILL.md                 # the skill definition Claude reads
assets/template.html     # the page template (styling + interactions)
scripts/build.py         # data -> HTML (validates every span)
examples/
  reviews.md             # synthetic sample reviews
  make_data.js           # markdown -> reviewdata.json parser to copy
```

## Privacy

Reviews and unpublished papers are confidential. The page is fully offline; keep your real
`reviewdata.json` / `reviews.html` out of any public repo (this repo's `.gitignore` excludes them
by default). The committed example data is synthetic.

## License

MIT — see [LICENSE](LICENSE).
