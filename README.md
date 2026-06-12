# reviewviz

Turn peer-review comments into a single, self-contained **interactive HTML page**: the *original*
review text with the sentences that need a reply **highlighted in place**, colour-coded by **what
to do about each one**, and grouped into **priority-ordered rebuttal points — each with an editable
draft**.

Built for planning a **rebuttal / author response**. At a glance you see what must be answered,
what is just an editorial fix, and what is framing you will defer — and you can prove your response
covers everything. Ships as a [Claude Code](https://docs.claude.com/en/docs/claude-code/skills)
skill **and** a tiny `npx` CLI. Fully offline; one HTML file you can open, share, or keep private.

[![live demo](https://img.shields.io/badge/live%20demo-Vercel-000?logo=vercel&logoColor=white)](https://reviewviz-deploy.vercel.app) [![npm](https://img.shields.io/npm/v/reviewviz?logo=npm)](https://www.npmjs.com/package/reviewviz) ![tags: 7 actions](https://img.shields.io/badge/tags-7%20actions-blue) ![offline](https://img.shields.io/badge/runs-offline-success) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen) [![license: MIT](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

**▶ Live demo:** [reviewviz-deploy.vercel.app](https://reviewviz-deploy.vercel.app) — an example rendered with reviewviz, alongside the colour-linked [annotated paper PDF](https://reviewviz-deploy.vercel.app/paper_annotated.pdf).

---

## Quick start

**Use it inside Claude Code (recommended).** Install the skill, then just ask:

```bash
npx reviewviz            # installs the skill into ~/.claude/skills/reviewviz
```

```
/reviewviz      ·or·     "visualize these reviewer comments for my rebuttal"
```

Give Claude **(1)** the reviewer comments — *paste them, or give a link* (an OpenReview/forum/PDF
URL) — and **(2)** the paper PDF or source so factual corrections can be verified. Claude classifies
every comment, picks a verbatim span for each, groups them into points, drafts a rebuttal per point,
and hands you `reviews.html`.

**Or build a page yourself**, no Claude and no Python needed:

```bash
npx reviewviz build --data reviewdata.json --out reviews.html
```

## What the page gives you

- **Original text, highlighted in place.** Each reviewer's verbatim text is shown in full; the
  relevant sentences are underlined/tinted right where they appear (hover for the note).
- **Reviewer tabs + an "All reviewers" view** — read one reviewer or everyone at once.
- **"By point" tab** — every comment grouped under its rebuttal point, ordered by priority, with an
  **editable rebuttal draft under the comments** for each point (edit it in place — changes persist
  in `localStorage` — then **Copy**). Click any comment to jump to and flash its exact place in the text.
- **"Paper" tab (optional)** — embeds the *annotated paper PDF*: each reviewer reference is
  highlighted in its rebuttal-point colour, and a 📄 link on every comment jumps the embedded viewer
  to the referenced page.
- **Focus mode** — grey out everything except the must-reply sentences.
- **Hide mode** — collapse the non-highlighted paragraphs (keyed on where the highlights actually
  are, so relevant comments outside "Weaknesses" are kept).
- **Colour by Action or by Rebuttal point.** Legend chips **jump to the matching By-point section**.
- **Multiple tags per sentence** — one sentence can be both a factual correction *and* a suggested
  experiment; it shows a two-colour underline and one chip per tag.
- **Must-reply (★) tracking** — a counter and per-tab badges show exactly what is and isn't covered.

## Action taxonomy (the colour code)

| tag | colour | meaning | in the rebuttal? |
|-----|--------|---------|------------------|
| `fact` | green | The review **misstates what is / isn't in the paper**. Correct it, citing §/Table. | yes |
| `question` | blue | A **direct question** you answer from the paper. | yes |
| `editorial` | amber | A wording / figure / equation / typo fix. | yes (bundled) |
| `commit` | purple | A fair improvement for the **camera-ready** (cite, tighten, add example). | brief / defer |
| `experiment` | pink | A **suggested supplementary experiment** a reviewer asks for. | venue-dependent |
| `defer` | slate | **Framing / advisory** ("define the problem", "tone down"). | no |
| `strength` | teal | Positive comment. Acknowledge only. | no |

---

## Workflow: from reviewer comments to page

This is the pipeline the skill runs (and you can follow by hand). Stages 1–3 are the
**elicitation** — turning prose into structured, tagged comments; stage 4 is the **render**.

**1. Gather the reviews.** Paste them, or fetch a link (`npx reviewviz fetch <openreview-url>`).
Use reviewer comments only — exclude the meta-review and author responses unless asked. Also load
the **paper PDF / source**, so factual claims can be *verified* rather than guessed.

**2. Elicit** — read each review and break it down:

- **Segment** it into `blocks` (headings + verbatim paragraphs), and split the prose into *atomic*
  comments (one concern each).
- **Classify** every atomic comment with one or more action tags from the taxonomy above — e.g. a
  "missing from the paper" claim that is actually present → `fact` (check the paper first), a direct
  question → `question`, a typo/figure fix → `editorial`, a fair camera-ready change → `commit`, a
  requested new run → `experiment`, framing/advice → `defer`, praise → `strength`. A sentence can
  carry several tags.
- **Anchor** each comment to a verbatim `span` — a unique phrase from its paragraph — so it can be
  highlighted exactly where it appears.
- **Group & prioritise** the comments into rebuttal **points**, ordered acceptance-gating first
  (`pointOrder`), and mark which ones you will actually answer (`reb`).
- **Draft** one concise rebuttal per point (`drafts`), plus a one-line `note` per comment saying
  what you'll do or where the evidence is.

**3. Encode** the result as `reviewdata.json` (`blocks`, `hi`, `pointOrder`, `drafts` — schema
below). Every `span` must be an exact substring of the review text.

**4. Render** to a self-contained page — `npx reviewviz build` (or `scripts/build.py`). The build
**validates every span** and fails loudly if one has drifted, so a highlight can never silently
detach from the words it annotates.

**5. Triage & write.** Open the page: scan *All reviewers* with **Focus** on to see only what needs
a reply, jump **by point** or via a legend chip, edit the per-point **drafts** in place (they persist
in `localStorage`), and **Copy** them into your response letter. The ★ counter and tab badges show
what is still uncovered.

```
reviews (paste / fetch) ─▶ elicit: segment · classify · anchor · group · draft
                          ─▶ reviewdata.json ─▶ build (validate spans) ─▶ reviews.html ─▶ triage & copy
```

---

## Install

```bash
npx reviewviz               # from npm -> ~/.claude/skills/reviewviz   (set REVIEWVIZ_DIR to override)
```

Published on npm: [npmjs.com/package/reviewviz](https://www.npmjs.com/package/reviewviz). You can
also install straight from GitHub without npm:

```bash
npx github:MoeBuTa/reviewviz
```

Claude Code discovers the skill automatically (it reads each skill's `description`). To install it
into a single project instead, set `REVIEWVIZ_DIR=<project>/.claude/skills/reviewviz`.

## Providing the reviews

The skill accepts the reviews **two ways**:

- **Paste** the verbatim reviewer comments into the chat. Always works.
- **A link.** For an OpenReview forum, fetch the public reviews as markdown:

  ```bash
  npx reviewviz fetch https://openreview.net/forum?id=XXXXXX
  # or: python3 scripts/fetch_openreview.py https://openreview.net/forum?id=XXXXXX
  ```

  This works only when the venue exposes reviews to a guest. If the submission is **private** (the
  guest API returns 403 / no notes), the fetcher says so — paste the reviews instead.

Always also give Claude the **paper PDF or source**: factual corrections ("the review says X is
missing, but it's in §Y") must be *verified*, not guessed.

## Build it manually

The page is produced from a `reviewdata.json`. Two equivalent builders ship with the repo:

```bash
npx reviewviz build --data reviewdata.json --out reviews.html   # Node, zero deps
python3 scripts/build.py --data reviewdata.json --out reviews.html   # pure stdlib Python 3
```

Both **fail loudly if any highlight span is not an exact substring** of the original text, so
highlights can never silently drift off the words they annotate (`--allow-miss` to preview).

### Try the example

```bash
cd examples
node make_data.js                                              # reviews.md -> reviewdata.json
npx reviewviz build --data reviewdata.json --out reviews.html  # (or python3 ../scripts/build.py ...)
open reviews.html                                              # xdg-open on Linux
```

`examples/make_data.js` is a copy-me parser: it splits a markdown `reviews.md` into blocks and
carries an inline highlight spec **and per-point drafts**, validating every span. Point it at your
own `reviews.md` and edit the spec.

### `reviewdata.json` schema

```json
{
  "meta": { "title": "...", "subtitle": "...", "footer": "..." },
  "pointOrder": ["Baselines", "Architecture", "Clarifications", "Editorial"],
  "drafts": { "Baselines": "Rebuttal draft for the baselines point ...", "Architecture": "..." },
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
          "note": "<b>Correct:</b> the ablation in Table 4 isolates the architecture." }
      ]
    }
  ]
}
```

- **blocks** — the verbatim review, in order (`t:"h"` heading, `t:"p"` paragraph).
- **hi.s** — the exact substring to highlight (a unique phrase from its paragraph).
- **hi.cats** — one or more action tags (a single `"cat":"fact"` is also accepted).
- **hi.reb** — `true` if you actually answer it → gets the ★ and stays lit in Focus mode.
- **hi.point** — the rebuttal point / theme, or `"—"` for none.
- **hi.note** — a short "what we'll do / where the evidence is" (light inline HTML ok).
- **pointOrder** — optional priority order for the "By point" tab and the colours.
- **drafts** — optional map from a point name to its **editable rebuttal draft** (shown under the
  comments for that point).
- **hi.paperRef** — optional `{ "find": "phrase in the PDF", "label": "Fig. 4", "page": 12 }` (or a
  list): the spot in the paper the comment refers to.
- **paperUrl** — optional URL/path of the annotated PDF; enables the **Paper** tab + 📄 page-jumps.

## Annotated paper (link comments to the PDF)

Mark each reviewer reference on the paper itself, colour-matched to its rebuttal point:

```bash
npx reviewviz annotate --pdf paper.pdf --data reviewdata.json --out paper_annotated.pdf \
    --base-url https://host/reviews.html        # needs: pip install pymupdf
```

Give each comment a `paperRef` — a verbatim phrase that exists in the PDF plus its page. `annotate`
highlights it in the rebuttal-point colour with a popup (the comment + the rebuttal note), and
`--base-url` makes each highlight link to its point. Set `paperUrl` in the data, rebuild, and the
page grows a **Paper** tab that embeds the annotated PDF with a 📄 jump on every comment — see the
Paper tab in the [live demo](https://reviewviz-deploy.vercel.app).

## How it works

- The build injects your data into `assets/template.html` (one page of vanilla HTML/CSS/JS — the
  taxonomy and colours live in its `CAT` object and `:root` variables).
- Every highlight gets a stable anchor id; "By point" items and legend chips resolve to it, so
  clicking jumps to and flashes the target.
- No build tools, no network. The Node builder/CLI needs only Node ≥14; `scripts/build.py` is pure
  standard-library Python 3.

## Repository layout

```
SKILL.md                 # the skill definition Claude reads
bin/cli.js               # npx entry: install · build · fetch · help
lib/build.js             # data -> HTML (Node, zero deps)
scripts/build.py         # data -> HTML (pure stdlib Python 3) — equivalent to lib/build.js
scripts/fetch_openreview.py  # pull a PUBLIC OpenReview forum's reviews as markdown
assets/template.html     # the page template (styling + interactions)
examples/
  reviews.md             # synthetic sample reviews
  make_data.js           # markdown -> reviewdata.json parser (with drafts) to copy
```

## Privacy

Reviews and unpublished papers are confidential. The page is fully offline; keep your real
`reviewdata.json` / `reviews.html` (and any paper PDF) **out of any public repo** — this repo's
`.gitignore` excludes them by default. The only data committed here is the **synthetic** example.

## License

MIT — see [LICENSE](LICENSE).
