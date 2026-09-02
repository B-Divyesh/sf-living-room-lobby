import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('@claim:art-provenance the footer disclosure matches the shipped original asset record', async () => {
  const [page, design, hero] = await Promise.all([
    readFile(new URL('../frontend/src/main.ts', import.meta.url), 'utf8'),
    readFile(new URL('../.factory/design.md', import.meta.url), 'utf8'),
    readFile(new URL('../frontend/public/assets/lobby-hero.webp', import.meta.url)),
  ]);
  assert.match(page, /Original AI-assisted artwork/);
  assert.match(design, /lobby-hero\.webp/);
  assert.match(design, /Param Factory Azure image deployment/);
  assert.ok(hero.length > 0, 'The disclosed hero asset must ship with the product.');
});

test('README links to the live demo instead of a GitHub-relative path', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /https:\/\/living-room-lobby\.sociobot\.in\/demo/);
  assert.doesNotMatch(readme, /\]\(\/demo\)/);
});

test('review 2 copy is plain, result-focused, and does not restore deployment promises', async () => {
  const [page, readme, catalog] = await Promise.all([
    readFile(new URL('../frontend/src/main.ts', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../.factory/catalog-description.txt', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /Use the TV room code to join\./);
  assert.match(page, /Verify a Family Pack license/);
  assert.match(page, /Buying extra games is not available yet\./);
  assert.doesNotMatch(page, /Scan once\.|Hosted checkout|purchase\? Check it/);
  assert.doesNotMatch(readme, /builds the exact Git SHA|preserves a probe room/);
  assert.match(readme, /Run this command to deploy a committed checkout\./);
  assert.ok(catalog.trim().length <= 120, 'The catalog description exceeds 120 characters.');
  assert.match(catalog.trim(), /^Play\b/, 'The catalog description must begin with a verb.');
});
