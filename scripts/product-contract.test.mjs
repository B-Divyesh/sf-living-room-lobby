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
