import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertExactRelease,
  assertFooterIdentity,
  assertJavaScriptIdentity,
  assertSharedPhoneRetained,
} from './verify-release.mjs';
import { runReleaseGate } from './release-gate.mjs';

// These are the exact identities in independent verification 14. Keeping the
// reported pair here means the deploy gate cannot quietly regress to accepting
// the condition that blocked candidate 46e5c90 from release.
const candidate = '46e5c90a59020178fa492c03a2ecb17209d7be34';
const stale = '98b506e1632464092cdc4e9add8c3b33265c1d53';

test('reproduces verification 14 and rejects every stale public identity surface', () => {
  assert.throws(
    () => assertExactRelease(
      candidate,
      { build: stale, status: 'ok' },
      `const CACHE = 'living-room-lobby-${candidate}';`,
    ),
    /Backend release mismatch.*46e5c90.*98b506e/,
  );
  assert.throws(
    () => assertExactRelease(
      candidate,
      { build: candidate, status: 'ok' },
      `const CACHE = 'living-room-lobby-${stale}';`,
    ),
    /Service-worker release mismatch.*46e5c90.*98b506e/,
  );
  assert.throws(
    () => assertFooterIdentity(candidate, `Built by Param Factory · ${stale}`),
    /Footer release mismatch.*46e5c90.*98b506e/,
  );
  assert.throws(
    () => assertJavaScriptIdentity(
      candidate,
      '<script type="module" src="/assets/index-BOEZBkgG.js"></script>',
      `const build="${stale}"`,
    ),
    /JavaScript release mismatch.*46e5c90/,
  );
});

test('accepts only one exact full candidate identity', () => {
  assert.doesNotThrow(() => assertExactRelease(
    candidate,
    { build: candidate, status: 'ok' },
    `const CACHE = 'living-room-lobby-${candidate}';`,
  ));
  assert.throws(
    () => assertExactRelease(candidate.slice(0, 12), { build: candidate.slice(0, 12) }, `const CACHE = 'living-room-lobby-${candidate.slice(0, 12)}';`),
    /full lowercase Git SHA/,
  );
});

test('release gate rejects an invalid candidate before it can wait on a live URL', async () => {
  await assert.rejects(
    () => runReleaseGate('not-a-sha', 'http://127.0.0.1:1'),
    /full lowercase Git SHA/,
  );
});

test('rejects a footer that does not identify the exact candidate', () => {
  assert.doesNotThrow(() => assertFooterIdentity(candidate, `Built by Param Factory · ${candidate}`));
  assert.throws(
    () => assertFooterIdentity(candidate, `Built by Param Factory · ${stale}`),
    /Footer release mismatch.*46e5c90.*98b506e/,
  );
});

test('rejects JavaScript that does not identify the exact candidate', () => {
  const shell = '<script type="module" src="/assets/index-abcdefgh.js"></script>';
  assert.equal(assertJavaScriptIdentity(candidate, shell, `const build="${candidate}"`), '/assets/index-abcdefgh.js');
  assert.throws(
    () => assertJavaScriptIdentity(candidate, shell, `const build="${stale}"`),
    /JavaScript release mismatch.*46e5c90/,
  );
});

test('rejects the verifier-reproduced recovery envelope and a lost host player', () => {
  const joined = {
    room: { code: 'PLAY', players: [{ id: 'player-1', mode: 'shared' }] },
  };
  const retained = {
    room: { code: 'PLAY', players: [{ id: 'player-1', mode: 'shared' }] },
  };
  assert.doesNotThrow(() => assertSharedPhoneRetained('PLAY', joined, retained));
  assert.throws(
    () => assertSharedPhoneRetained(
      'PLAY',
      { error: 'That room is gone. Check the code or start a new one.', recoverable: true },
      retained,
    ),
    /Shared-phone join returned the recovery envelope.*That room is gone/,
  );
  assert.throws(
    () => assertSharedPhoneRetained('PLAY', joined, { room: { code: 'PLAY', players: [] } }),
    /host did not retain the shared-phone player/,
  );
});

test('deployment cannot report success before exact live identity verification', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const deployScript = await readFile(`${root}/scripts/deploy-container.sh`, 'utf8');
  const updatePosition = deployScript.indexOf('az containerapp update');
  const verifyPosition = deployScript.indexOf('node "$repo_dir/scripts/release-gate.mjs" "$source_sha"');
  const deactivatePosition = deployScript.indexOf('az containerapp revision deactivate');
  assert.match(deployScript, /source_sha=\$\(git -C "\$repo_dir" rev-parse HEAD\)/);
  assert.match(deployScript, /image_tag="\$app_name:\$source_sha"/);
  assert.match(deployScript, /--build-arg "BUILD_SHA=\$source_sha"/);
  assert.match(deployScript, /--revision-suffix "\$\{source_sha:0:12\}"/);
  assert.match(deployScript, /readarray -t actual_release/);
  assert.ok(updatePosition >= 0, 'Deployment must update the product container app.');
  assert.ok(
    deactivatePosition >= 0 && deactivatePosition < updatePosition,
    'Deployment must stop older revisions before the lock-free durable SQLite candidate starts.',
  );
  assert.ok(verifyPosition > updatePosition, 'Deployment must verify the exact candidate after the rollout.');
  assert.ok(
    deployScript.indexOf('properties.latestRevisionName') < verifyPosition
      && deployScript.indexOf('properties.latestReadyRevisionName') < verifyPosition,
    'Deployment must wait for the new revision to be ready before checking its public identity.',
  );
  assert.ok(
    deployScript.indexOf('sf-living-room-lobby-data') < verifyPosition,
    'Deployment must preserve the product data share at /data before reporting success.',
  );
  assert.ok(
    deployScript.indexOf('durable-room-probe.mjs" create') < updatePosition
      && deployScript.indexOf('durable-room-probe.mjs" verify') > updatePosition
      && deployScript.indexOf('durable-room-probe.mjs" verify') < verifyPosition,
    'Deployment must retain one real room across the revision handoff before checking the live flow.',
  );
  const gateScript = await readFile(`${root}/scripts/release-gate.mjs`, 'utf8');
  assert.match(gateScript, /import \{ verifyRelease \} from '.\/verify-release\.mjs';/);
  assert.match(gateScript, /release gate failed:/);
  assert.match(gateScript, /gate: 'passed'/);
  assert.equal(typeof runReleaseGate, 'function');
  const verifierScript = await readFile(`${root}/scripts/verify-release.mjs`, 'utf8');
  assert.match(verifierScript, /AbortSignal\.timeout\(20_000\)/);
  assert.match(verifierScript, /page\.locator\('footer'\)\.textContent\(\)/);
  assert.match(verifierScript, /const cacheNames = await page\.evaluate\(\(\) => caches\.keys\(\)\)/);
  assert.match(verifierScript, /\[`living-room-lobby-\$\{expected\}`\]/);
  assert.match(verifierScript, /assertFooterIdentity\(expected, footer\)/);
  assert.match(verifierScript, /assertJavaScriptIdentity\(expected, shell, javaScript\)/);
  assert.match(verifierScript, /viewport: \{ width: 390, height: 844 \}/);
  assert.match(verifierScript, /input\[value="shared"\]/);
  assert.match(verifierScript, /assertSharedPhoneRetained\(code, joined, hostRead\.body\)/);
});
