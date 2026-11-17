// Checks src/data.js before every build: required fields, matching description lengths
// (the site's cards are designed around them) and a case study for every project.
import { squad, bench, caseStudy } from '../src/data.js';
import { existsSync } from 'node:fs';

const errors = [];
const need = ['no', 'pos', 'title', 'repo', 'commits', 'tagline', 'about', 'points', 'stack'];
const range = (name, values, min, max) => values.forEach(([title, v]) => { if (v < min || v > max) errors.push(`${title}: ${name} is ${v} characters (want ${min}-${max})`); });

if (squad.length !== 11) errors.push(`Starting XI has ${squad.length} players, not 11`);
if (new Set(squad.map((p) => p.no)).size !== squad.length) errors.push('Shirt numbers must be unique');
squad.forEach((p) => need.forEach((k) => { if (p[k] == null) errors.push(`${p.title || '?'}: missing ${k}`); }));
range('tagline', squad.map((p) => [p.title, p.tagline.length]), 55, 68);
range('about', squad.map((p) => [p.title, p.about.length]), 180, 200);
range('point', squad.flatMap((p) => p.points.map((x) => [p.title, x.length])), 52, 70);
range('bench tagline', bench.map((b) => [b.title, b.tagline.length]), 76, 88);
[...squad, ...bench].forEach((p) => {
  const doc = caseStudy(p.title);
  if (!doc) errors.push(`${p.title}: no case study mapped`);
  else if (!existsSync(new URL(`../public${doc}`, import.meta.url))) errors.push(`${p.title}: ${doc} is missing`);
});

if (errors.length) { console.error('data check failed:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`data check passed: ${squad.length} starters, ${bench.length} on the bench, ${squad.length + bench.length} case studies`);
