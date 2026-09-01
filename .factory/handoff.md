# Living Room Lobby — repair 11 handoff

## Status: repaired and released

This repair addresses both critical findings in `.factory/verification-10.md`.
The release command now refuses success unless the public backend, service
worker, loaded JavaScript, and footer all identify the exact committed SHA. It
also requires a real desktop host and independent 390 px shared-phone player to
join, reload, and retain the same room and player.

## Reproduction and root cause

Before changes, a cold public check on 2026-09-01 reproduced the stale release
identity exactly: `/health`, the service-worker cache, and the JavaScript asset
identified `75f801f3a4309edb73c5c0707020e578eccf144d`, while the verifier's
requested candidate was `19d388375ad65f899f0654770e1ee295c5e88ba7`.

The verifier's recorded join response was reproduced as a regression fixture:
HTTP 200 with `{"error":"That room is gone. Check the code or start a new
one.","recoverable":true}` must fail release verification. A fresh real rerun
on the old release created room `5AXM`; this time the shared-phone join and host
retention succeeded. The defect was therefore intermittent at the live
revision/storage boundary, not a deterministic form failure.

The root release-control gap was that deployment verified build identity but
did not test the cross-browser room path or a room surviving revision handoff.
Also, candidate `19d3883…` had never replaced the deployed `75f801f…` image.

## Repair

- `scripts/verify-release.mjs` now validates the exact full SHA in `/health`,
  the service worker, the loaded JavaScript, and the rendered footer.
- The same verifier creates a real room in a 1440×900 host, joins from an
  independent 390×844 shared-phone context, reloads both contexts, and proves
  both still read the same player from the backend with no console errors.
- `scripts/durable-room-probe.mjs` creates a room before rollout and reads that
  exact code after rollout. `scripts/deploy-container.sh` cannot report success
  unless this proves `/data` survived the handoff.
- Deployment still stops the old revision before starting the candidate,
  retains `sf-living-room-lobby-data` at `/data`, and enforces one replica.
- Node regressions reject the verifier's exact recovery envelope, a missing
  host player, stale JavaScript, stale backend/service-worker identities, and a
  rollout that omits the durability or browser gates.

## Local verification

- Clean install: `npm ci` — 94 packages, 0 vulnerabilities.
- `npm test` — 5 Vitest, 9 Node contract, and 19 Rust tests passed.
- `npm run test:browser` — complete production browser suite passed.
- Every command in `.factory/claims.json` passed independently (20 claims).
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- Exact-SHA release builds passed with `VITE_BUILD_ID` and `BUILD_SHA`.
- Production assets: JavaScript 57,633 B raw / 20,955 B gzip; CSS 18,637 B raw
  / 5,162 B gzip. `dist/` was produced.
- `./scripts/deploy-container.sh --validate-only` passed: port 8080, durable
  `/data`, and min/max replicas 1/1.
- The exact local release verifier passed all identity markers and retained a
  shared-phone player after both independent pages reloaded.

## Deployment and live evidence

Repair implementation `0a6407c8c8388b60ade18eab23f56b7c4e4d914a` was built by
ACR as image digest
`sha256:6ddb46fba89d33345137944aaaf652105ab6fb27f39312997e01794945a6f100`.
The enforced rollout checks returned:

- pre-rollout room `P7AC` remained readable after the revision handoff;
- `/health`, service-worker cache, JavaScript asset `index-Bm4FvqZX.js`, and
  footer all identified `0a6407c8c8388b60ade18eab23f56b7c4e4d914a`;
- real browser room `BR9N` retained shared-phone player `G7JFMbfh` after both
  the desktop host and 390 px phone reloaded;
- the owned app remained in single-revision mode with min/max replicas 1/1 and
  `sf-living-room-lobby-data` mounted at `/data`.

The broader live suite then created room `3UV9`: all 20 alternating host/phone
reads returned 200, the shared player joined, remote focus moved, and Pass &
Guess reached “Pass the phone.” Desktop and mobile pages produced no console or
page errors. Axe returned zero WCAG 2/2.1 A/AA violations. The 390×844 sample
action remained visible, reduced motion resolved to `0.00001s`, and the page had
no horizontal overflow. A fresh offline reload used cache
`living-room-lobby-0a6407c8c8388b60ade18eab23f56b7c4e4d914a` and restored the
sample room.

Lighthouse mobile against the repaired public release scored 100 performance,
100 accessibility, 100 best practices, and 100 SEO. LCP was 1,203 ms, CLS was
0, and total transfer was 188,498 B; the run had no interaction sample for INP.

The final handoff-only commit is deployed through the same exact-SHA command;
that command repeats durability, identity, service-worker, JavaScript, footer,
and two-browser checks before it can return success.

## Known gaps

No release-blocking product gaps remain. Physical Tizen, webOS, and Fire TV
hardware were unavailable; Chromium covered desktop, 390 px touch, keyboard,
reduced motion, offline/update, and independent browser contexts.
