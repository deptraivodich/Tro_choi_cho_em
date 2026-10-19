import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream } from 'node:fs';
const [label, seconds, entry, ...args] = process.argv.slice(2);
const output = process.env.ENERGY_ARTIFACT_DIR || 'artifacts/energy-defense-round35';
mkdirSync(output+'/logs', { recursive: true });
const log = createWriteStream(`${output}/logs/${label}.txt`);
const child = spawn(entry.endsWith('.py') ? 'python' : process.execPath, [entry, ...args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { process.stdout.write(data); log.write(data); });
const timeout = setTimeout(() => {
  console.error(`${label}: timeout after ${seconds}s`);
  if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill('SIGKILL');
}, Number(seconds) * 1000);
child.on('exit', code => { clearTimeout(timeout); log.end(); process.exitCode = code ?? 1; });
