import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { isIPv4 } from 'node:net';
import { networkInterfaces } from 'node:os';
import ipaddr from 'ipaddr.js';

const { loadEnvConfig } = createRequire(import.meta.url)('@next/env');
loadEnvConfig(process.cwd());
const host = process.env.MARGIN_HOST;
if (!host || !isIPv4(host) || ipaddr.parse(host).range() !== 'private') {
  console.error('Set MARGIN_HOST in .env.local to this computer’s private IPv4 address (for example 192.168.1.20).');
  process.exit(1);
}

const assignedAddresses = Object.values(networkInterfaces()).flatMap(entries => entries ?? []).filter(entry => entry.family === 'IPv4' && !entry.internal).map(entry => entry.address);
if (!assignedAddresses.includes(host)) {
  console.error(`MARGIN_HOST ${host} is not assigned to this runtime. Its IPv4 addresses are: ${assignedAddresses.join(', ') || '(none)'}. Run Margin on the computer that owns that address, or configure a deliberate port-forward from this runtime.`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const children = [
  spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', host], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'scripts/worker.ts'], { stdio: 'inherit', env: process.env }),
];
let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
for (const child of children) {
  child.on('error', error => {
    console.error('Could not start a Margin process:', error.message);
    process.exitCode = 1;
    stop();
  });
  child.on('exit', code => {
    if (!stopping) {
      process.exitCode = code ?? 1;
      stop();
    }
  });
}
