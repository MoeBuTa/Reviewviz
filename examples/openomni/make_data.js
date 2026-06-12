#!/usr/bin/env node
/* PUBLIC example: OpenOmni demo paper, three official peer reviews -> reviewdata.json
 * The paper and its reviews are public (open reviews); reviewer comments only,
 * meta-review and author responses excluded.
 *
 *   node make_data.js
 *   python3 ../../scripts/build.py --data reviewdata.json --out reviews.html
 *   python3 ../../scripts/annotate_pdf.py --pdf openomni.pdf --data reviewdata.json \
 *       --out paper_annotated.pdf --base-url https://reviewviz-deploy.vercel.app
 */
const fs = require('fs');
const path = require('path');

const META = {
  title: "OpenOmni — Reviewer Comments & Response Triage",
  subtitle: "The three official reviews of the OpenOmni demo paper, with each must-reply sentence highlighted in place, colour-coded by action, and grouped into priority-ordered response points — each with an editable draft.",
  footer: "reviewviz · OpenOmni demo paper (public reviews), reviewer comments only. Focus greys out all but the must-reply sentences; the By-point tab carries an editable response draft per point."
};

// Points in priority order (most substantive first). Drives the By-point tab order.
const POINT_ORDER = [
  "Accuracy evaluation detail",
  "Dataset extraction & collection",
  "Visually-impaired use case",
  "Compute generalization",
  "Local data compression",
  "Editorial"
];

// One editable response draft per point (shown under the point in the By-point tab).
const DRAFTS = {
  "Accuracy evaluation detail":
    "Section 4.2 reports a human accuracy review rather than an automatic score. For each conversation in the GPT4O_ETE configuration an annotator assigned an overall quality score from 0 to 5 with a short justification, and the per-conversation statistics in Figure 7 aggregate these annotator scores. We will expand Section 4.2 to state who annotated, the rubric and score scale, how many conversations were judged, and how the speech-to-text WER and CER metrics are computed, so the meaning of the conversation accuracy statistics is unambiguous.",
  "Dataset extraction & collection":
    "OpenOmni supports dataset work through two concrete paths that the demo exposes. First, a segmentation script in the codebase lets a user mark start and end times to cut long videos, for example the US Presidential Debate, into per-conversation segments that are then run through the pipeline. Second, in a live deployment the client streams video and audio to storage together with exportable metadata reachable from the admin portal, so real sessions can be exported as annotated datasets including the raw audio and video. We will make this workflow explicit in Section 4.1 with the relevant interface and script references.",
  "Visually-impaired use case":
    "The visually-impaired assistant is included as a concrete, latency-tolerant deployment that exercises the full local pipeline, not as a core claim. It grounds the otherwise abstract latency and accuracy discussion in one runnable scenario and shows the kind of non-latency-critical application the framework already supports today. We will connect Section 4.3 back to the motivation in the introduction and state this scoping explicitly, and we are happy to condense the section if the reviewers prefer.",
  "Compute generalization":
    "The NVIDIA-3080 with 12GB is deliberately a low-end, widely available target, chosen to show that the local divide-and-conquer pipeline runs on commodity hardware rather than to report best-case latency. Because the Agent modules are containerized and decoupled, the same pipeline runs unchanged on larger GPUs, where the dominant LLM and vision-model inference steps shrink and end-to-end latency improves while the relative ordering of the configurations stays the same. We will add a short note on hardware sensitivity and the expected effect of greater compute.",
  "Local data compression":
    "This is a fair point and the paper already flags the risk: Section 3.2 notes that edge-side compression may cause information loss and reduce end-to-end performance. Local compression is offered as one option on the latency-accuracy frontier, not as a lossless default, and a deployer can disable it per component. We will make the tradeoff explicit and note that quantifying the accuracy cost of local compression is a natural use of OpenOmni's own benchmarking and annotation tools, which we will report in the revision.",
  "Editorial":
    "Thank you. We will fix the flagged wording: the GPT-4o and Gemini sentence (have demonstrated), respond appropriately with patience, the comma placement in the Kyutai sentence, the missing publication details for Liu et al. 2023, and the acronym capitalisation throughout the reference list."
};

const REVIEWERS = [
  {
    id: "qEif", label: "Reviewer qEif · Overall 7 (accept)",
    blocks: [
      { t: "h", x: "Summary" },
      { t: "p", x: "This paper introduces OpenOmni, an open-source framework designed to address the need for comprehensive, end-to-end solutions in the development and benchmarking of multimodal conversational agents, which is an interesting area." },
      { t: "h", x: "Limitations" },
      { t: "p", x: "(1) Pre-processing or compressing large data locally, if performed inaccurately, can significantly impair model performance. How can this be confirmed?" },
      { t: "p", x: "(2) The scenario tested using an NVIDIA-3080 GPU with 12GB of memory may be difficult to generalize. Has the author attempted to evaluate it under conditions of greater computing power?" },
      { t: "h", x: "Reasons to accept" },
      { t: "p", x: "Good writing and good logic." },
      { t: "h", x: "Reasons to reject" },
      { t: "p", x: "No" }
    ],
    hi: [
      ["Pre-processing or compressing large data locally, if performed inaccurately, can significantly impair model performance.", ["question", "commit"], "Local data compression", true,
        "Section 3.2 already flags that edge-side compression may cause information loss; it is one option on the latency-accuracy frontier, not a lossless default. We will quantify the cost using OpenOmni's own benchmarking tools.",
        { find: "compressing large data locally", label: "§5 (local compression)", page: 6 }],
      ["The scenario tested using an NVIDIA-3080 GPU with 12GB of memory may be difficult to generalize.", "question", "Compute generalization", true,
        "The 3080/12GB is a deliberately low-end, commodity target. The containerized Agent modules run unchanged on larger GPUs, where the dominant inference steps shrink and latency improves; configuration ordering is hardware-independent.",
        { find: "NVIDIA-3080 GPU with 12GB memory", label: "§4 (hardware setup)", page: 5 }],
      ["Good writing and good logic.", "strength", "—", false, ""]
    ]
  },
  {
    id: "byzd", label: "Reviewer byzd · Overall 8 (clear accept)",
    blocks: [
      { t: "h", x: "Summary" },
      { t: "p", x: "The paper presents an open-source tool that integrates speech-to-text and text-to-speech, computer vision, emotion detection, retrieval augmented generation and large language models into a customisable pipeline for developing multimodal conversational agents. The main contribution of the p is the customisable integration of these technologies in an end-to-end manner. In addition to a cloud implementation, the system can be deployed locally to ensure data privacy and improve latency." },
      { t: "h", x: "Quality" },
      { t: "p", x: "The work presented appears overall solid and in accordance with accepted practices in the field." },
      { t: "h", x: "Clarity" },
      { t: "p", x: "The paper is generally well-written, the descriptions and argumentation are mostly clear. The justification for selecting the specific case of conversational assistant for visually impaired persons could be motivated more clearly. The section on accuracy evaluation also needs to be described in more detail." },
      { t: "h", x: "Originality & Significance" },
      { t: "p", x: "Based on the descriptions given, the tool mainly implements pre-existing models with the originality arising mostly from the way they are integrated into the tool. The tool would likely be of interest to others in the field developing conversational agents. Section 4.1 also mentions that the tool provides for both \"extracting conversational datasets from videos\" and \"collecting data from real-world scenarios\", which would potentially be very useful for further development of multimodal datasets. However, it is not entirely clear in the paper how the tools facilitates this." },
      { t: "h", x: "Reasons to accept (strengths)" },
      { t: "p", x: "The tool described has potential to be useful for future development. The paper is generally well-written (although some specific parts could be clarified)." },
      { t: "h", x: "Reasons to reject (weaknesses)" },
      { t: "p", x: "The demonstration part (section 4) would need some clarification. The accuracy annotation in 4.2 is not explained sufficiently for the reader to get a clear idea what was done and what is behind the \"conversation accuracy statistics\" in Figure 7. Without any information about how the annotation was done, by whom etc., the relevance and significance of section 4.2 is unclear." },
      { t: "p", x: "Secondly, the example of \"indoor conversational robots assisting visually impaired individuals\" (p. 2, also addressed in section 4.3) seems very specific but also random and disconnected from the rest of the discussion. If this case some specific significance to the discussion as a whole, it should be justified better. If there is no particular significance, is this section (4.3) needed at all?" },
      { t: "p", x: "I do not see any particular risks." },
      { t: "h", x: "Questions and additional feedback" },
      { t: "p", x: "How does the tool facilitate extracting and collecting datasets? What is the purpose and significance of the accuracy assessment in section 4.2 and how was it done? What is the significance of the case of assistance for the visually impaired to the overall discussion?" },
      { t: "p", x: "Some minor observations (typos etc.) p 1" },
      { t: "p", x: "While proprietary systems like GPT-4o and Gemini demonstrating impressive integration of -> demonstrate / are demonstrating / have demonstrated ?" },
      { t: "p", x: "p 2: For instance, if a user initiates a conversation in a sad and urgent tone, the system should respond appropriately with patient. -> with the patient(?) If the implication is indeed that the \"user\" is also a \"patient\"? This assumption is not explained anywhere in the article, though." },
      { t: "p", x: "p 3: Recently, Kyutai, a technology company, from France released -> Recently, Kyutai, a technology company from France, released" },
      { t: "p", x: "p 7: Publication details are missing for Liu et al. 2023" },
      { t: "p", x: "Check and correct the capitalisation of acronyms in the reference list" }
    ],
    hi: [
      ["The work presented appears overall solid and in accordance with accepted practices", "strength", "—", false, ""],
      ["The paper is generally well-written, the descriptions and argumentation are mostly clear.", "strength", "—", false, ""],
      ["The justification for selecting the specific case of conversational assistant for visually impaired persons could be motivated more clearly.", ["defer", "commit"], "Visually-impaired use case", true,
        "The visually-impaired assistant is a concrete, latency-tolerant deployment that exercises the full local pipeline, not a core claim. We will tie §4.3 back to the introduction's motivation and state the scoping explicitly.",
        [{ find: "visually impaired individuals", label: "p.2 (motivation)", page: 2 }, { find: "Assist the visually impaired", label: "§4.3", page: 6 }]],
      ["The section on accuracy evaluation also needs to be described in more detail.", ["question", "commit"], "Accuracy evaluation detail", true,
        "We will expand §4.2 with the annotator, rubric, 0-5 score scale, number of conversations, and how WER/CER are computed.",
        { find: "conversation accuracy statistics", label: "Fig. 7 (accuracy)", page: 5 }],
      ["it is not entirely clear in the paper how the tools facilitates this.", ["question", "commit"], "Dataset extraction & collection", true,
        "Two concrete paths: a segmentation script that cuts long videos into per-conversation segments, and a live deployment that streams client audio/video to storage with exportable metadata via the admin portal. We will make this explicit in §4.1.",
        { find: "extracting conversational datasets from videos", label: "§4.1 (datasets)", page: 5 }],
      ["The accuracy annotation in 4.2 is not explained sufficiently for the reader to get a clear idea what was done and what is behind the \"conversation accuracy statistics\" in Figure 7.", ["question", "commit"], "Accuracy evaluation detail", true,
        "§4.2 is a human review: per conversation an annotator gives a 0-5 overall quality score plus a justification, aggregated in Figure 7. We will document who annotated and the rubric.",
        { find: "conversation accuracy statistics", label: "Fig. 7 (accuracy)", page: 5 }],
      ["the example of \"indoor conversational robots assisting visually impaired individuals\" (p. 2, also addressed in section 4.3) seems very specific but also random and disconnected from the rest of the discussion.", ["defer", "commit"], "Visually-impaired use case", true,
        "It is one runnable, latency-tolerant scenario chosen to ground the latency/accuracy discussion. We will justify it better and are happy to condense §4.3 if preferred.",
        { find: "visually impaired individuals", label: "p.2 (motivation)", page: 2 }],
      ["How does the tool facilitate extracting and collecting datasets?", "question", "Dataset extraction & collection", false,
        "Covered above: segmentation script + exportable streamed sessions."],
      ["What is the purpose and significance of the accuracy assessment in section 4.2 and how was it done?", "question", "Accuracy evaluation detail", false,
        "Covered above: human 0-5 quality scoring aggregated in Figure 7."],
      ["What is the significance of the case of assistance for the visually impaired to the overall discussion?", "question", "Visually-impaired use case", false,
        "Covered above: a concrete latency-tolerant deployment grounding the discussion."],
      ["demonstrating impressive integration of", "editorial", "Editorial", true,
        "Fix to \"have demonstrated impressive integration of\".",
        { find: "GPT-4o and Gemini have demonstrated", label: "abstract (p.1)", page: 1 }],
      ["the system should respond appropriately with patient", "editorial", "Editorial", false,
        "The paper already reads \"with patience\"; we will keep that wording and check the sentence.",
        { find: "respond appropriately with patience", label: "p.2", page: 2 }],
      ["Recently, Kyutai, a technology company, from France released", "editorial", "Editorial", false,
        "Fix comma placement to \"a technology company from France, released\".",
        { find: "a technology company from France", label: "p.3 (Kyutai)", page: 3 }],
      ["Publication details are missing for Liu et al. 2023", "editorial", "Editorial", false,
        "Add full venue/details for the Liu et al. 2023 reference.",
        { find: "Visual instruction tuning", label: "references (p.7)", page: 7 }],
      ["Check and correct the capitalisation of acronyms in the reference list", "editorial", "Editorial", false,
        "Normalise acronym capitalisation throughout the reference list."]
    ]
  },
  {
    id: "EbFc", label: "Reviewer EbFc · Overall 9 (strong accept)",
    blocks: [
      { t: "h", x: "Summary" },
      { t: "p", x: "Multimodal conversational agents are highly desirable for their ability to offer natural and human-like interactions. However, comprehensive end-to-end solutions for collaborative development and benchmarking are lacking. While proprietary systems like GPT-4 and Gemini demonstrate impressive integration of audio, video, and text with response times of 200-250ms, challenges remain in balancing latency, accuracy, cost, and data privacy." },
      { t: "p", x: "To address these issues, the authors developed OpenOmni, an open-source, end-to-end benchmarking tool that integrates advanced technologies like Speech-to-Text, Emotion Detection, Retrieval-Augmented Generation, and Large Language Models, with the flexibility to incorporate custom models. OpenOmni supports both local and cloud deployment, ensuring data privacy while enabling benchmarking for latency and accuracy." },
      { t: "h", x: "Review" },
      { t: "p", x: "The authors provide a highly flexible library that fosters rapid prototyping for multimodal conversational agents. Additionally, the framework includes analysis tools to monitor key metrics, such as task execution latency." },
      { t: "h", x: "Reasons to reject" },
      { t: "p", x: "Nice work, no major weakness." },
      { t: "h", x: "Reasons for best paper nomination" },
      { t: "p", x: "OpenOmni, an open-source library, offers a valuable contribution to this burgeoning field. By providing a unified framework for wrapping multimodal language models and integrating related tools, OpenOmni significantly streamlines the development of sophisticated multimodal agents." }
    ],
    hi: [
      ["The authors provide a highly flexible library that fosters rapid prototyping for multimodal conversational agents.", "strength", "—", false, ""],
      ["the framework includes analysis tools to monitor key metrics, such as task execution latency.", "strength", "—", false, ""],
      ["Nice work, no major weakness.", "strength", "—", false, ""],
      ["OpenOmni significantly streamlines the development of sophisticated multimodal agents.", "strength", "—", false, ""]
    ]
  }
];

// ---- assemble + validate ----------------------------------------------------
const misses = [];
const reviewers = REVIEWERS.map(r => {
  const text = r.blocks.filter(b => b.t === "p").map(b => b.x).join("\n");
  const hi = r.hi.map(([s, cat, point, reb, note, paperRef]) => {
    if (text.indexOf(s) < 0) misses.push([r.id, s]);
    return { s, cats: Array.isArray(cat) ? cat : [cat], point, reb, note, ...(paperRef ? { paperRef } : {}) };
  });
  return { id: r.id, label: r.label, blocks: r.blocks, hi };
});

if (misses.length) {
  console.error(`[openomni] ${misses.length} highlight span(s) not found verbatim:`);
  for (const [id, s] of misses) console.error(`  - ${id}: ${JSON.stringify(s.slice(0, 90))}`);
  process.exit(1);
}

const out = { meta: META, pointOrder: POINT_ORDER, drafts: DRAFTS, paperUrl: "paper_annotated.pdf", reviewers };
fs.writeFileSync(path.join(__dirname, "reviewdata.json"), JSON.stringify(out, null, 2));
const nHi = reviewers.reduce((a, r) => a + r.hi.length, 0);
const nReb = reviewers.reduce((a, r) => a + r.hi.filter(h => h.reb).length, 0);
console.log(`wrote reviewdata.json: ${reviewers.length} reviewers, ${nHi} highlights, ${nReb} must-reply, ${POINT_ORDER.length} points, ${Object.keys(DRAFTS).length} drafts`);
