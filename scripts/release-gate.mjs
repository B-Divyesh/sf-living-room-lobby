#!/usr/bin/env node
// The public URL is the authoritative release artifact.  A successful image
// build or a ready Container Apps revision is not enough: CDN, shell, and
// worker caches can each still expose an earlier immutable build.  Keep this
// small entry point separate from the fuller verifier so deployment and
// handoff always name the required release gate explicitly.
import { pathToFileURL } from 'node:url';
import { verifyRelease } from './verify-release.mjs';

export async function runReleaseGate(candidate, baseUrl) {
  const result = await verifyRelease(baseUrl, candidate);
  return { candidate, ...result };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  const [candidate, baseUrl = 'https://living-room-lobby.sociobot.in'] = process.argv.slice(2);
  try {
    const result = await runReleaseGate(candidate || '', baseUrl);
    console.log(JSON.stringify({ gate: 'passed', ...result }));
  } catch (error) {
    console.error(`release gate failed: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
