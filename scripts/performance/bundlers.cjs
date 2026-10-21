const { spawn, spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const fs = require('node:fs');
const production = process.argv.includes('--production');
const selectedBundler = process.argv.find(arg => arg.startsWith('--bundler='))?.split('=')[1];
if (selectedBundler && !['webpack', 'turbopack'].includes(selectedBundler)) throw Error('Unknown bundler');
const results = [];
let active;
function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    if (result.status !== 0) child.kill('SIGTERM');
  }
  else child.kill('SIGTERM');
}
async function run(bundler, run) {
  const args = [require.resolve('next/dist/bin/next'), production ? 'build' : 'dev', ...(bundler === 'turbopack' ? ['--turbopack'] : []), ...(!production ? ['--port', '3113', '--hostname', '127.0.0.1'] : [])];
  const start = performance.now(); let output = '';
  const child = active = spawn(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', LUMEN_PERFORMANCE_RUN: '1', LUMEN_PERFORMANCE_BUNDLER: bundler }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise(resolve => child.once('exit', code => resolve(code)));
  const deadline = setTimeout(() => stop(child), 240000);
  try {
    return await new Promise(resolve => {
      let started = false;
      const collect = chunk => {
        output += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
        if (!production && !started && /Ready in/.test(output)) {
          started = true; const startupMs = performance.now() - start;
          console.log(`  ${bundler} ready in ${Math.round(startupMs)}ms`);
          (async () => {
            const requests = [];
            for (const route of ['/', '/body-json-review', '/login', '/body-json-review']) {
              const before = performance.now(); const response = await fetch(`http://127.0.0.1:3113${route}`, { signal: AbortSignal.timeout(90000) }); await response.text();
              if (!response.ok) throw Error(`Route failed with HTTP ${response.status}`);
              requests.push({ route, ms: +(performance.now()-before).toFixed(2) });
              console.log(`  ${route}: ${Math.round(performance.now()-before)}ms`);
            }
            resolve({ bundler, run, cache: run === 0 ? 'first run in isolated output directory' : 'warm', startupMs: +startupMs.toFixed(2), requests, success: true });
          })().catch(error => resolve({ bundler, run, success: false, reason: error.message, diagnostics: output.slice(-4000) }));
        }
      };
      child.stdout.on('data', collect); child.stderr.on('data', collect);
      exited.then(code => {
        if (production) resolve({ bundler, run, cache: run === 0 ? 'first run in isolated output directory' : 'warm', totalMs: +(performance.now()-start).toFixed(2), success: code === 0, ...(code !== 0 ? { reason: output.slice(-2500) } : {}) });
        else if (!started) resolve({ bundler, run, success: false, reason: output.slice(-2500) });
      });
    });
  } finally { clearTimeout(deadline); stop(child); await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]); active = undefined; }
}
async function main() {
  for (const bundler of selectedBundler ? [selectedBundler] : ['webpack', 'turbopack']) {
    for (let index = 0; index < 4; index++) {
      console.log(`Measuring ${production ? 'production build' : 'development'} ${bundler}, run ${index + 1}/4`);
      const result = await run(bundler, index); results.push(result);
      if (!result.success) break;
    }
  }
  const report = { environment: `${process.platform}, Node ${process.version}; sequential runs; one first run and three warm runs per successful candidate. ${production ? "Includes built-in checks." : "Development compilation does not replace production lint/type checks."} Development request timings are server request/compile measurements, not browser HMR. Cloudflare packaging is outside this benchmark.`, results };
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(`docs/performance-${production ? 'build' : 'dev'}${selectedBundler ? `-${selectedBundler}` : ''}-results.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
process.once('SIGINT', () => { stop(active); process.exit(130); });
main().catch(error => { stop(active); console.error(error); process.exitCode = 1; }).finally(() => {
  const file = 'tsconfig.json';
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  config.include = config.include.filter(item => !item.startsWith('.next-performance/'));
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
});
