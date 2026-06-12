// Node port of scripts/build.py — build the annotated review page from a reviewdata object/file.
// Same schema, same output, no dependencies. Used by `npx reviewviz build`.
const fs = require('fs');
const path = require('path');

const CATS = new Set(["fact", "question", "editorial", "commit", "experiment", "defer", "strength"]);

function build(dataOrPath, opts = {}) {
  const data = typeof dataOrPath === 'string' ? JSON.parse(fs.readFileSync(dataOrPath, 'utf8')) : dataOrPath;
  const reviewers = data.reviewers;
  if (!Array.isArray(reviewers) || !reviewers.length) throw new Error("data.reviewers must be a non-empty array");

  const misses = [];
  let totalHi = 0, totalReb = 0;
  for (const r of reviewers) {
    const text = (r.blocks || []).filter(b => b.t === 'p').map(b => b.x || '').join('\n');
    for (const h of (r.hi || [])) {
      totalHi++; if (h.reb) totalReb++;
      const cats = h.cats || (h.cat ? [h.cat] : []);     // accept single cat or cats[]
      if (!cats.length || cats.some(c => !CATS.has(c)))
        throw new Error(`${r.id}: cats ${JSON.stringify(cats)} not all in {${[...CATS].join('|')}}`);
      h.cats = cats;
      if (h.reb === undefined) h.reb = false;
      if (h.point === undefined) h.point = '—';
      if (h.note === undefined) h.note = '';
      if ((text.indexOf(h.s || '')) < 0) misses.push([r.id, h.s || '']);
    }
  }
  if (misses.length && !opts.allowMiss) {
    const lines = misses.map(([id, s]) => `  - ${id}: ${JSON.stringify(s.slice(0, 90))}`).join('\n');
    throw new Error(`${misses.length} highlight snippet(s) not found in the original text:\n${lines}\n` +
      `Fix the snippets (must be exact substrings) or pass --allow-miss.`);
  }

  const meta = data.meta || {};
  const title = opts.title || meta.title || "Reviewer Comments &amp; Rebuttal Triage";
  const subtitle = opts.subtitle || meta.subtitle ||
    "The original reviews, with the sentences that need a reply highlighted in place and colour-coded by what we should do about them.";
  const footer = opts.footer || meta.footer ||
    "Focus mode greys out everything except the must-reply sentences. Highlight colour = action (or rebuttal point).";

  const tpl = fs.readFileSync(opts.template || path.join(__dirname, '..', 'assets', 'template.html'), 'utf8');
  const out = { reviewers };
  const po = data.pointOrder || meta.pointOrder; if (po) out.pointOrder = po;
  const dr = data.drafts || meta.drafts; if (dr) out.drafts = dr;
  const pu = data.paperUrl || meta.paperUrl; if (pu) out.paperUrl = pu;
  const payload = JSON.stringify(out).replace(/<\//g, '<\\/');
  const html = tpl
    .replace('__DATA__', () => payload)              // function replacers: avoid $-substitution
    .replace('__TITLE__', () => title)
    .replace('__SUBTITLE__', () => subtitle)
    .replace('__FOOTER__', () => footer);
  return { html, reviewers: reviewers.length, totalHi, totalReb, misses };
}

module.exports = { build, CATS };
