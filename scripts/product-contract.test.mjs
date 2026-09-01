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
