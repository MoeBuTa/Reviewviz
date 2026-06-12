#!/usr/bin/env node
// reviewviz CLI — install the Claude Code skill, build a page, or fetch OpenReview reviews.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const cmd = args[0] && !args[0].startsWith('-') ? args[0] : (args[0] ? args[0] : 'install');

function arg(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }

function copyRec(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.name === '__pycache__' || e.name.endsWith('.pyc')) continue;
    e.isDirectory() ? copyRec(s, d) : fs.copyFileSync(s, d);
  }
}

function install() {
  const target = process.env.REVIEWVIZ_DIR || path.join(os.homedir(), '.claude', 'skills', 'reviewviz');
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'SKILL.md'), path.join(target, 'SKILL.md'));
  for (const d of ['assets', 'scripts']) {
    const src = path.join(ROOT, d);
    if (fs.existsSync(src)) copyRec(src, path.join(target, d));
  }
  console.log(`✓ installed reviewviz skill → ${target}`);
  console.log('  In Claude Code: run /reviewviz, or just ask "visualize these reviewer comments".');
  console.log('  Give it the reviewer comments (paste or a link) and the paper PDF.');
}

function build() {
  const data = arg('--data'), out = arg('--out');
  if (!data || !out) { console.error('usage: reviewviz build --data <reviewdata.json> --out <reviews.html> [--allow-miss]'); process.exit(2); }
  try {
    const res = require(path.join(ROOT, 'lib', 'build.js')).build(data, {
      allowMiss: args.includes('--allow-miss'), title: arg('--title'), subtitle: arg('--subtitle'), footer: arg('--footer'),
    });
    fs.writeFileSync(out, res.html);
    console.log(`wrote ${out}: ${res.reviewers} reviewers, ${res.totalHi} highlights, ${res.totalReb} must-reply` +
      (res.misses.length ? `, ${res.misses.length} UNMATCHED` : ', all snippets matched'));
  } catch (e) { console.error(String(e && e.message || e)); process.exit(1); }
}

function fetch() {
  const url = args[1];
  if (!url) { console.error('usage: reviewviz fetch <openreview-url-or-forum-id>'); process.exit(2); }
  const r = require('child_process').spawnSync('python3', [path.join(ROOT, 'scripts', 'fetch_openreview.py'), url], { stdio: 'inherit' });
  process.exit(r.status || 0);
}

function annotate() {
  const pdf = arg('--pdf'), data = arg('--data'), out = arg('--out'), base = arg('--base-url');
  if (!pdf || !data || !out) { console.error('usage: reviewviz annotate --pdf paper.pdf --data reviewdata.json --out paper_annotated.pdf [--base-url URL]'); process.exit(2); }
  const argv = [path.join(ROOT, 'scripts', 'annotate_pdf.py'), '--pdf', pdf, '--data', data, '--out', out];
  if (base) argv.push('--base-url', base);
  const r = require('child_process').spawnSync('python3', argv, { stdio: 'inherit' });
  process.exit(r.status || 0);
}

function help() {
  console.log(`reviewviz — visualize reviewer comments for a rebuttal

Usage:
  npx reviewviz [install]                       install the skill into ~/.claude/skills/reviewviz
  npx reviewviz build --data d.json --out r.html [--allow-miss]
                                                build an annotated review page (no Python needed)
  npx reviewviz annotate --pdf p.pdf --data d.json --out p_annot.pdf [--base-url URL]
                                                highlight the paper at each reviewer reference (needs: pip install pymupdf)
  npx reviewviz fetch <openreview-url>          print a public OpenReview forum's reviews as markdown
  npx reviewviz help

Set REVIEWVIZ_DIR to install the skill somewhere other than ~/.claude/skills/reviewviz.
After installing, use it in Claude Code by asking to "visualize these reviewer comments" (or /reviewviz);
provide the reviewer comments (paste or a link) and the paper PDF so factual corrections can be verified.`);
}

const table = { install, build, annotate, fetch, help, '--help': help, '-h': help };
(table[cmd] || install)();
