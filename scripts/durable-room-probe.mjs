#!/usr/bin/env node
import assert from 'node:assert/strict';

const [action, value, verifyBase] = process.argv.slice(2);
const configuredBase = action === 'create' ? value : verifyBase;
const baseUrl = (configuredBase || 'https://living-room-lobby.sociobot.in').replace(/\/$/, '');

async function createProbe() {
  const response = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 200, `Pre-rollout room probe returned HTTP ${response.status}.`);
  const result = await response.json();
  assert.match(result.code || '', /^[A-Z0-9]{4}$/, 'Pre-rollout room probe returned no room code.');
  process.stdout.write(`${result.code}\n`);
}

async function verifyProbe(code) {
  assert.match(code || '', /^[A-Z0-9]{4}$/, 'A four-character room probe code is required.');
  const response = await fetch(`${baseUrl}/api/rooms/${code}?durability-check=${Date.now()}`, {
    cache: 'no-store',
  });
  assert.equal(response.status, 200, `Room ${code} disappeared during the revision handoff.`);
  const result = await response.json();
  assert.equal(result?.room?.code, code, 'The post-rollout probe returned a different room.');
  process.stdout.write(`${JSON.stringify({ code, retainedAcrossRollout: true })}\n`);
}

try {
  if (action === 'create') await createProbe();
  else if (action === 'verify') await verifyProbe(value);
  else throw new Error('Usage: durable-room-probe.mjs create [base-url] | verify <code> [base-url]');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
