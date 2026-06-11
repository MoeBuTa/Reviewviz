// Self-contained example: parse examples/reviews.md into per-reviewer blocks, attach highlight
// spans + per-point rebuttal drafts, and write examples/reviewdata.json.
//   node make_data.js && python3 ../scripts/build.py --data reviewdata.json --out reviews.html
//   (or: node make_data.js && npx reviewviz build --data reviewdata.json --out reviews.html)
//
// Copy this file next to your own reviews.md and edit the HI spec + DRAFTS below.
const fs = require('fs');
const md = fs.readFileSync(__dirname + '/reviews.md', 'utf8');

// ---- parse markdown into reviewers -> blocks ----
// Rules: "## Review N" starts a reviewer; "###"/"**bold**" lines are sub-headings (t:h);
// every other non-empty line is one paragraph (t:p), with list/number/bold markup stripped.
const reviewers = [];
let cur = null;
for (const raw of md.split('\n')) {
  const line = raw.replace(/\s+$/, '');
  let m;
  if ((m = line.match(/^##\s+Review\s+(\d+)/))) { cur = { id: 'R' + m[1], label: 'Reviewer ' + m[1], blocks: [], hi: [] }; reviewers.push(cur); continue; }
  if (!cur) continue;
  if (line.trim() === '' || line.trim() === '---') continue;
  if ((m = line.match(/^#{3,6}\s+(.*)$/))) { cur.blocks.push({ t: 'h', x: m[1].trim() }); continue; }
  if ((m = line.match(/^\*\*(.+?)\*\*:?\s*$/))) { cur.blocks.push({ t: 'h', x: m[1].replace(/:$/, '').trim() }); continue; }
  const x = line.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
  if (x) cur.blocks.push({ t: 'p', x });
}

// ---- highlight spec: [span, cats, point, reb, note] ----
// span must be an EXACT substring of a paragraph; cats may be a string or an array.
const HI = {
  R1: [
    ["The paper tackles an important and timely problem", "strength", "—", false, "Acknowledge."],
    ["The evaluation omits the obvious baseline FooGuard and gives no reason for leaving it out", ["experiment", "commit"], "Baselines", true, "<b>We add</b> FooGuard, or justify scoping it out."],
    ["It is impossible to tell whether the gains come from the architecture or from the larger training set", "fact", "Architecture", true, "<b>Correct:</b> the ablation in Table 4 isolates the architecture from the data."],
    ["One ablation removing the cache layer is needed to isolate its contribution", ["experiment", "commit"], "Architecture", false, "<b>Suggested experiment (camera-ready):</b> add the cache-layer ablation."],
    ['What exactly does the term "bounded context" mean in Section 3?', "question", "Clarifications", true, "<b>Answer:</b> bounded context = the fixed window of inputs the method considers."],
    ["the text on page 6 says accuracy, so please make the wording consistent", "editorial", "Editorial", true, "Fix the F1 vs accuracy wording."],
  ],
  R2: [
    ["it is never said what counts as a failure in precise terms", "defer", "Scope", false, "<b>Camera-ready:</b> add a precise failure definition."],
    ["How were the thresholds 0.5 and 0.7 chosen?", "question", "Clarifications", true, "<b>Answer:</b> tuned on the dev split; a sweep shows they are stable."],
    ["The related work reads more as a list than an argument", "commit", "Related work", true, "<b>We will</b> tighten related work into an argument."],
  ],
};

// ---- one editable rebuttal draft per point (shown under the comments in the By-point tab) ----
const DRAFTS = {
  "Baselines": "FooGuard targets a different stage of the pipeline, so it is related work rather than a missing baseline. To address the concern directly we add it under our protocol; our method remains ahead while keeping the lower latency that motivates the design.",
  "Architecture": "The architecture and the larger training set are not changed together. Table 4 ablates the architecture with the data held fixed, isolating the architectural contribution. We will add the requested cache-layer ablation to the camera-ready for completeness.",
  "Scope": "We will sharpen the problem statement with a precise definition of failure in the camera-ready.",
  "Clarifications": "Bounded context is the fixed window of inputs the method considers, defined in Section 3. The thresholds 0.5 and 0.7 are tuned on the dev split, and a sweep shows performance is flat around them.",
  "Related work": "We will rewrite related work as an argument that positions each line against our setting, rather than a catalogue.",
  "Editorial": "We will make the metric wording consistent (F1 vs accuracy) on page 6 and in the captions.",
};

// attach + validate (errors on any span that is not found)
let miss = 0;
for (const r of reviewers) {
  const text = r.blocks.filter(b => b.t === 'p').map(b => b.x).join('\n');
  for (const [s, cat, point, reb, note] of (HI[r.id] || [])) {
    if (!text.includes(s)) { miss++; console.error(`NOT FOUND in ${r.id}: ${JSON.stringify(s.slice(0, 80))}`); }
    const cats = Array.isArray(cat) ? cat : [cat];
    r.hi.push({ s, cats, point, reb, note });
  }
}

const out = {
  meta: {
    title: "Example Paper — Reviewer Comments & Rebuttal Triage",
    subtitle: "Synthetic demo. The original reviews with must-reply sentences highlighted in place, colour-coded by action; the By-point tab groups them with an editable draft each.",
    footer: "Built with reviewviz. Replace this synthetic example with your real reviews.",
  },
  pointOrder: ["Baselines", "Architecture", "Scope", "Clarifications", "Related work", "Editorial"],
  drafts: DRAFTS,
  reviewers,
};
fs.writeFileSync(__dirname + '/reviewdata.json', JSON.stringify(out, null, 1));
console.log(`wrote reviewdata.json: ${reviewers.length} reviewers, ${reviewers.reduce((n, r) => n + r.hi.length, 0)} highlights, ${Object.keys(DRAFTS).length} drafts, ${miss} unmatched`);
if (miss) process.exitCode = 1;
