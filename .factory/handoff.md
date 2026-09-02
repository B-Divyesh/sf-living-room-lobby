# Living Room Lobby repair 14 handoff

## Status

Repair ready for the container deployment command. The old public release was
reproduced before this repair; the deployment command now makes a public
identity gate the final action and exits non-zero on any mismatch.

## Repair

- Reproduced verification 14 on 2 September 2026: the requested candidate was
  `46e5c90a59020178fa492c03a2ecb17209d7be34`, while uncached `/health`
  returned `98b506e1632464092cdc4e9add8c3b33265c1d53`.
- The same cold fetch found old shell `/assets/index-BOEZBkgG.js`, old
  JavaScript identity, and worker cache
  `living-room-lobby-98b506e1632464092cdc4e9add8c3b33265c1d53`.
  Compact reproduction evidence is in
  `.factory/evidence/repair-14-before-health.json`,
  `.factory/evidence/repair-14-before-health.headers.txt`, and
  `.factory/evidence/repair-14-before-identity.txt`.
- Added `scripts/release-gate.mjs`. It uses fresh public requests and browser
  contexts to require the candidate in `/health`, service-worker source,
  emitted JavaScript, cold worker cache, and footer before running the real
  desktop-host/390 px shared-phone check.
- `scripts/deploy-container.sh` runs that gate only after it has built the
  committed SHA, stopped the old revision, checked the ready image, durable
  `/data` mount, scale boundary, and durable-room handover.
- Regression coverage now names the exact candidate and stale identities from
  verification 14 and proves each stale public identity surface is rejected.

## Verification

From a clean install:

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
./scripts/deploy-container.sh --validate-only
npm run build
npm run test:browser
```

The repair run passed the Vitest suite (6 tests), Node contract/release suite
(10 tests), Rust tests, TypeScript/Rust checks, formatting, Clippy with warnings
denied, production frontend build, deployment-configuration validation, and
the desktop/TV/390 px browser suite. The browser suite covers keyboard/remote,
Axe, offline reload/update, privacy requests, demo isolation, rate limits, and
a real shared-phone flow.

Deploy a committed checkout with:

```sh
./scripts/deploy-container.sh
```

Its final `release-gate` output is the deployment evidence. It includes the
candidate, health build, worker cache, emitted shell asset, footer identity,
and retained 390 px shared-phone room. It fails instead of handing off if any
public identity is older than the candidate.

## Known gaps

Physical Samsung Tizen, LG webOS, Fire TV Silk, and device-orientation hardware
remain unavailable. Chromium covers TV viewport, 390 px touch, keyboard/remote,
reduced motion, and offline behavior.
