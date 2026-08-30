import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertExactRelease } from './verify-release.mjs';

const candidate = 'f00f2259cdd871f0683cf9978f535a8339cc8094';
const stale = '3cb790fb647e2b32b9b043c8266d50dd106e45d4';

test('rejects the verifier-reproduced stale backend candidate', () => {
  assert.throws(
    () => assertExactRelease(
      candidate,
      { build: stale, status: 'ok' },
      `const CACHE = 'living-room-lobby-${candidate}';`,
    ),
    /Backend release mismatch.*f00f225.*3cb790f/,
  );
});

test('rejects the verifier-reproduced stale service-worker cache', () => {
  assert.throws(
    () => assertExactRelease(
      candidate,
      { build: candidate, status: 'ok' },
      `const CACHE = 'living-room-lobby-${stale}';`,
    ),
    /Service-worker release mismatch.*f00f225.*3cb790f/,
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

test('deployment cannot report success before exact live identity verification', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const deployScript = await readFile(`${root}/scripts/deploy-container.sh`, 'utf8');
  const updatePosition = deployScript.indexOf('az containerapp update');
  const verifyPosition = deployScript.indexOf('node "$repo_dir/scripts/verify-release.mjs" "$source_sha"');
  const deactivatePosition = deployScript.indexOf('az containerapp revision deactivate');
  assert.match(deployScript, /source_sha=\$\(git -C "\$repo_dir" rev-parse HEAD\)/);
  assert.match(deployScript, /image_tag="\$app_name:\$source_sha"/);
  assert.match(deployScript, /--build-arg "BUILD_SHA=\$source_sha"/);
  assert.match(deployScript, /--revision-suffix "\$\{source_sha:0:12\}"/);
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
});
