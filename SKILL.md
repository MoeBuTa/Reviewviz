---
name: reviewviz
description: Render peer-review comments as an interactive, offline HTML page showing the ORIGINAL review text with the sentences needing a reply highlighted in place, colour-coded by action (correct a factual error, answer a question, editorial fix, commit to a change, suggested supplementary experiment, revision-only, or strength). Reviewer tabs, an All-reviewers view, and a By-point tab that groups comments under priority-ordered rebuttal points, each with an editable rebuttal draft. Focus mode greys out all but the must-reply sentences; legend chips jump to the matching section. Use when the user wants to visualize, triage, or highlight reviewer comments, plan a rebuttal or response letter, or see what needs replying. Inputs: paste the reviewer comments or give a link (OpenReview/forum/PDF URL), plus the paper PDF or source so factual corrections can be verified; source code and any prior response letter help.
---

# reviewviz

Produce one self-contained HTML page that shows each reviewer's **original text** with the
sentences that need a reply **highlighted in place**, colour-coded by the action they need.
The page has: reviewer **tabs** plus an **All reviewers** view; a **By point** tab that groups
comments under priority-ordered rebuttal points, **each with an editable rebuttal draft underneath**;
a **Focus** toggle that greys out everything except the must-reply sentences; a **Hide** toggle; and
a **colour-by Action / Point** switch whose **legend chips jump to the matching By-point section**.

## Inputs to ask the user for

To build an accurate page you must have:

1. **The reviewer comments** — either the user **pastes the verbatim text**, or they give a
   **link** (an OpenReview forum/PDF URL, or any page/file containing the reviews). For an
   OpenReview link, run `python3 "$SKILL_DIR/scripts/fetch_openreview.py" <url>` to dump a
   **public** forum's reviews as markdown. If the venue is private (a guest gets HTTP 403 / no
   notes), say so and ask the user to **paste** the reviews instead.
2. **The paper PDF** (or its LaTeX/source) — so you can *verify* each "the review says X is
   missing, but it actually IS in §Y / Table Z" claim **before** tagging it `fact`. Accurate
   factual corrections are the whole point of the page, so do not guess: if the paper is not
   provided, ask for it (or the relevant sections) before asserting any `fact` correction.

Optional, for stronger grounding (ask for these if available):

- the **source code / artifact repository** and any **appendix / supplementary** — to confirm
  what experiments, tables, layers, and definitions actually exist;
- a **prior response letter, notes, or word limit** — to set the `reb` flags (what you will
  actually answer), the `point` groupings, and the per-point rebuttal `drafts`.

When the user is an author rebutting their own paper, by default treat real, in-review reviews as
**confidential**: build the page locally and keep `reviewdata.json` / `reviews.html` out of any
public repo. Only the synthetic example data ships publicly.

## Quick start

1. Get the reviews as text (paste, or fetch a link). A markdown `reviews.md`, one paragraph per
   line, is convenient.
2. Build a `reviewdata.json` (schema below): the original text as **blocks**, plus **highlight
   spans** (each an exact substring of the text), priority-ordered `pointOrder`, and a `drafts`
   map of one rebuttal draft per point.
3. Build and open:

```bash
python3 "$SKILL_DIR/scripts/build.py" --data reviewdata.json --out reviews.html
open reviews.html        # macOS; xdg-open on Linux
```

`build.py` **fails if any highlight span is not an exact substring** of the original text (so
highlights can't silently go missing). Pass `--allow-miss` only to preview. (A dependency-free
Node builder, `npx reviewviz build --data reviewdata.json --out reviews.html`, is equivalent.)

## Data schema (`reviewdata.json`)

```json
{
  "meta": { "title": "...", "subtitle": "...", "footer": "..." },
  "pointOrder": ["Baselines", "Architecture", "Clarifications", "Editorial"],
  "drafts": {
    "Baselines": "Our rebuttal draft for the baselines point. The omitted method is a different stage, and we add ...",
    "Architecture": "The ablation in Table 4 already isolates the architecture from the data ..."
  },
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
  highlight shows a two-colour underline in the text and one chip per tag in the By-point view.
  (A single `"cat": "fact"` is also accepted.)
- **pointOrder** (top level, optional) — the order the **By point** tab lists points; put the
  acceptance-gating points first. Falls back to first-seen order.
- **drafts** (top level, optional) — maps a `point` name to the **editable rebuttal draft** shown
  under that point in the By-point tab. Write one concise draft per point; users can edit it in the
  page (changes persist in `localStorage`) and copy it out.
- **hi.reb** — `true` if this sentence gets a reply in the rebuttal you are writing → gets the
  gold ★ and stays lit in Focus mode. Keep it honest to your word budget.
- **hi.point** — the rebuttal point / theme (e.g. `Baselines`, `Clarifications`), or `"—"` for
  none. Used by the "colour-by Point" mode and to attach the draft.
- **hi.note** — one short line on what you'll do / where the evidence is (light inline HTML ok).

## Action taxonomy (the colour code)

| cat | colour | meaning | reply? |
|-----|--------|---------|--------|
| `fact` | green | The review **misstates what is or is not in the paper**. Correct it, citing §/Table. | yes |
| `question` | blue | A **direct question** you answer from the paper. | yes |
| `editorial` | amber | Concrete wording / figure / equation / typo fix. | yes (bundled) |
| `commit` | purple | A fair improvement for the **camera-ready** (cite, tighten, add example). | brief / defer |
| `experiment` | pink | A **suggested supplementary experiment** (new run/ablation a reviewer asks for). | venue-dependent |
| `defer` | slate | **Framing / advisory** ("define the problem", "tone down"). Not a factual error or a question. | no |
| `strength` | teal | Positive comment. Acknowledge only. | no |

Rebuttal-eligibility depends on the venue. For strict ≤N-word venues that bar new results, only
`fact` and `question` are squarely in scope; `editorial`/`commit` get a one-line mention; new
`experiment` runs go to the revision. For venues that allow rebuttal experiments (e.g. ACL ARR,
many ML conferences), `experiment` items are often the strongest replies. Set `reb` and the per-point
`drafts` to reflect the rebuttal you are actually writing.

## Workflow

1. **Get the reviews** — paste, or fetch a link (`scripts/fetch_openreview.py`). Use reviewer
   comments only; exclude meta-reviews and author responses unless asked otherwise.
2. **Split** each review into atomic comments and into `blocks` (headings + paragraphs).
3. **Classify** each comment: praise → `strength`; a concrete question → `question`; a claim that
   something is absent/unquantified/undefined but actually IS in the paper → `fact` (verify first);
   a typo/figure fix → `editorial`; a reasonable camera-ready change → `commit`; a requested new
   run → `experiment`; otherwise framing → `defer`.
4. **Pick a span** `s` for each comment: a verbatim, unique phrase from its paragraph.
5. **Group** comments into `point`s, order them in `pointOrder` (acceptance-gating first), and
   write a `drafts` entry per point.
6. **Build** with `build.py` (or `npx reviewviz build`) and fix any unmatched spans it reports.

### Helper for markdown reviews

If the reviews are in a markdown file (headings as `###`/`**bold**`, one paragraph per line),
a tiny Node parser can turn the file into `blocks` and attach a highlight spec + drafts, validating
every span. See `examples/make_data.js` for a working, self-contained example to copy: it splits
`examples/reviews.md` into blocks and carries an inline `HI` spec of `[span, cats, point, reb,
note]` rows (where `cats` may be a string or an array) plus a `DRAFTS` map, erroring on any span
that is not found.

## Tips

- Keep `point` names short and consistent — they become the "colour-by Point" palette, the
  By-point section order, and the draft keys, and can mirror your response-letter section titles.
- Be comprehensive: tag **every** atomic comment, including `defer`/`strength`, so the page is an
  honest coverage map. The tab badges and the counter then show exactly what is and isn't covered.
- Spans must not overlap within a paragraph; if two comments touch, shorten one.
- The page is fully offline. Re-run the build after editing `reviewdata.json`.
- To change categories or colours globally, edit `assets/template.html` (`CAT` object and the
  `:root` colour variables).
