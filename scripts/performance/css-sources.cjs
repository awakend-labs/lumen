const { createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');
const path = require('node:path');
const fs = require('node:fs');
const { Scanner } = createRequire(require.resolve('@tailwindcss/postcss'))('@tailwindcss/oxide');
const results = [];
for (const source of ['repository', 'src']) {
  const samples = []; let candidates;
  for (let run = 0; run < 6; run++) {
    const start = performance.now();
    candidates = new Scanner({ sources: [{ base: source === 'src' ? path.join(process.cwd(), 'src') : process.cwd(), pattern: '**/*', negated: false }] }).scan();
    if (run) samples.push(performance.now() - start);
  }
  results.push({ source, candidates: candidates.length, warmMedianMs: +samples.sort((a,b) => a-b)[2].toFixed(2) });
}
const report = { environment: 'Installed Tailwind Oxide scanner; one warmup and five measured scans per source. Candidate counts are not generated CSS size or end-to-end build timings.', results };
fs.writeFileSync('docs/performance-css-results.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
