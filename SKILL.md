---
name: rebuttal-review-visualizer
description: Render peer-review comments as an interactive HTML page that shows the ORIGINAL review text with the sentences needing a reply highlighted in place, colour-coded by what to do about them (correct a factual error, answer a question, editorial fix, commit to a change, suggested supplementary experiment, revision-only, or strength). Reviewer tabs, an all-in-one view, a By-point tab, a focus mode that greys out everything except the must-reply sentences, and colour-by action or rebuttal point. Use when the user wants to visualize/triage reviewer comments, plan a rebuttal or response letter, highlight reviews, see what needs replying, or build a review HTML page. Ask the user for the paper PDF and the reviewer comments (and optionally the source code/docs) to ground the analysis.
---

# Rebuttal Review Visualizer

Produce one self-contained HTML page that shows each reviewer's **original text** with the
sentences that need a reply **highlighted in place**, colour-coded by the action they need.
The page has: reviewer **tabs** plus an **All reviewers** view, a **By point** tab, a **Focus**
toggle that greys out everything except the must-reply sentences, a **Hide** toggle, and a
**colour-by Action / Point** switch.

## Inputs to ask the user for

To build an accurate page you must have:

1. **The reviewer comments** — the verbatim text (pasted, emailed, PDF, or a file).
2. **The paper PDF** (or its LaTeX/source) — so you can *verify* each "the review says X is
   missing, but it actually IS in §Y / Table Z" claim **before** tagging it `fact`. Accurate
   factual corrections are the whole point of the page, so do not guess: if the paper is not
   provided, ask for it (or the relevant sections) before asserting any `fact` correction.

Optional, for stronger grounding (ask for these if available):

- the **source code / artifact repository** and any **appendix / supplementary** — to confirm
  what experiments, tables, layers, and definitions actually exist;
- a **prior response letter, notes, or word limit** — to set the `reb` flags (what you will
  actually answer) and the `point` groupings.

## Quick start

1. Get the reviews as text (a markdown file like `reviews.md` is ideal — one paragraph per line).
2. Build a `reviewdata.json` (schema below): the original text as **blocks**, plus **highlight
   spans** (each an exact substring of the text).
3. Build and open:

```bash
python "$SKILL_DIR/scripts/build.py" --data reviewdata.json --out reviews.html
open reviews.html        # macOS; xdg-open on Linux
```

`build.py` **fails if any highlight span is not an exact substring** of the original text (so
highlights can't silently go missing). Pass `--allow-miss` only to preview.

## Data schema (`reviewdata.json`)

```json
{
  "meta": { "title": "...", "subtitle": "...", "footer": "..." },
  "pointOrder": ["Baselines", "Judge model", "Self-consistency", "..."],
  "reviewers": [
    {
      "id": "R1", "label": "Reviewer 1",
      "blocks": [
        { "t": "h", "x": "Weaknesses" },
        { "t": "p", "x": "It is impossible to tell whether the gains come from the architecture or from the larger training set ..." }
      ],
      "hi": [
        { "s": "It is impossible to tell whether the gains come from the architecture",
          "cats": ["fact"], "point": "Architecture", "reb": true,
          "note": "<b>Correct:</b> the ablation in Table 4 isolates the architecture from the data." },
        { "s": "One ablation removing the cache layer is needed",
          "cats": ["experiment", "commit"], "point": "Architecture", "reb": false,
          "note": "<b>Suggested experiment (camera-ready).</b>" }
      ]
    }
  ]
}
```

- **blocks** — the verbatim review, in order. `t:"h"` = a sub-heading (Strengths, Problem
  statement, …); `t:"p"` = a paragraph. Keep the wording exact.
- **hi.s** — the **exact substring** of a paragraph to highlight (the salient phrase of a
  comment). Pick a phrase that occurs once.
- **hi.cats** — one or more action tags (taxonomy below). A sentence may need several actions,
  e.g. `["fact","experiment"]`. The first active tag drives the highlight colour; a multi-tag
  highlight shows a two-colour underline in the text and one chip per tag in the By-point view,
  and stays visible while any of its tags is enabled. (A single `"cat": "fact"` is also accepted.)
- **pointOrder** (top level, optional) — the order the **By point** tab lists points, e.g.
  acceptance-gating points first. Falls back to first-seen order.
- **hi.reb** — `true` if this sentence gets a reply in the rebuttal you are writing → gets the
  gold ★ and stays lit in Focus mode. Keep it honest to your word budget.
- **hi.point** — the rebuttal point / theme (e.g. `Baselines`, `Self-consistency`,
  `Clarifications`), or `"—"` for none. Used by the "colour-by Point" mode.
- **hi.note** — one short line on what you'll do / where the evidence is (light inline HTML ok).

## Action taxonomy (the colour code)

| cat | colour | meaning | reply? |
|-----|--------|---------|--------|
| `fact` | green | The review **misstates what is or is not in the paper**. Correct it, citing §/Table. | yes |
| `question` | blue | A **direct question** you answer from the paper. | yes |
| `editorial` | amber | Concrete wording / figure / equation / typo fix. | yes (bundled) |
| `commit` | purple | A fair improvement for the **camera-ready** (cite, tighten, add example). | brief / defer |
| `experiment` | pink | A **suggested supplementary experiment** (new run/ablation a reviewer asks for). | no (revision) |
| `defer` | slate | **Framing / advisory** ("define the problem", "tone down"). Not a factual error or a question. | no |
| `strength` | teal | Positive comment. Acknowledge only. | no |

Rebuttal-eligibility rule of thumb (strict ≤N-word venues): only `fact` and `question` are
squarely in scope; `editorial`/`commit` get a one-line mention; `defer`/`strength` go to the
revision. Set `reb` to reflect the rebuttal you are actually writing.

## Workflow

1. **Split** each review into atomic comments and into `blocks` (headings + paragraphs).
2. **Classify** each comment: praise → `strength`; a concrete question → `question`; a claim
   that something is absent/unquantified/undefined but actually IS in the paper → `fact` (verify
   first); a typo/figure fix → `editorial`; a reasonable camera-ready change → `commit`;
   otherwise framing → `defer`.
3. **Pick a span** `s` for each comment: a verbatim, unique phrase from its paragraph.
4. **Tag** `cats`, `point`, `reb`, `note`.
5. **Build** with `build.py` and fix any unmatched spans it reports.

### Helper for markdown reviews

If the reviews are in a markdown file (headings as `###`/`**bold**`, one paragraph per line),
a tiny Node parser can turn the file into `blocks` and attach a highlight spec, validating every
span. See `examples/make_data.js` for a working, self-contained example to copy: it splits
`examples/reviews.md` into blocks and carries an inline `HI` spec of `[span, cats, point, reb,
note]` rows (where `cats` may be a string or an array), erroring on any span that is not found.

## Tips

- Keep `point` names short and consistent — they become the "colour-by Point" palette and can
  mirror your response-letter section titles.
- Be comprehensive: tag **every** atomic comment, including `defer`/`strength`, so the page is an
  honest coverage map. The tab badges and the counter then show exactly what is and isn't covered.
- Spans must not overlap within a paragraph; if two comments touch, shorten one.
- The page is fully offline. Re-run `build.py` after editing `reviewdata.json`.
- To change categories or colours globally, edit `assets/template.html` (`CAT` object and the
  `:root` colour variables).
