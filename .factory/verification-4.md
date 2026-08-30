# Independent verification 4 — FAIL

**Candidate:** `28c47c866cbb26ee1e216daf227529e220deb692`  
**Live URL:** https://living-room-lobby.sociobot.in  
**Verified:** 2026-08-30

## Release verdict

**FAIL.** The live deployment serves the candidate, but it cannot reliably host a
real room. Requests for one room are being routed to isolated SQLite stores.
This breaks the core host/phone flow and also weakens the required per-client
room-creation limit.

## Release-blocking defects

### P0 — room persistence is split across live instances

The real user journey fails after room creation. In five independent live
desktop browser attempts, **Start a real room** opened a lobby but selecting
**Draw Together** produced `That room is gone. Check the code or start a new
one.`; `#tv-canvas` was absent in all five attempts. Each attempt also logged
the corresponding HTTP 404.

Direct API evidence is equally conclusive. For eight freshly-created rooms,
twenty immediate uncached reads returned a mix of 200 and 404 on every room:

| Room | Reads | Host update |
| --- | --- | --- |
| SBNW | 8×200, 12×404 | 200 |
| 8NH2 | 11×200, 9×404 | 404 |
| DN2N | 11×200, 9×404 | 404 |
| MQHB | 11×200, 9×404 | 404 |
| KB3P | 11×200, 9×404 | 404 |
| HVKD | 10×200, 10×404 | 200 |
| SQ3B | 9×200, 11×404 | 404 |
| 5SAG | 9×200, 11×404 | 404 |

The candidate’s backend uses a local SQLite file and in-memory limiter. It is
therefore unsafe behind more than one replica unless the deployment is
actually pinned to one replica or state is made shared. This is the same
deployment boundary the prior handoff said was repaired; fresh evidence shows
it is not repaired in the live release.

### P0 — documented 12-room/minute allowance is not enforced per client

Using one `X-Forwarded-For` value, the first **15** consecutive
`POST /api/rooms` requests all returned 200, despite the documented source
limit of 12 per 60 seconds. Continuing the same sequence produced intermittent
429 responses only later (the 28th and 31st total requests), with
`Retry-After: 60`. This is consistent with requests landing on separate
per-replica in-memory limiters. The generic read limiter did return 40×404 then
8×429 for 48 concurrent reads, with `Retry-After: 1`, but that does not repair
the failed room-creation allowance.

### P1 — an unlisted and misleading sample-privacy claim remains

The first screen says **“Sample play stays in this browser.”** It has no exact
entry/test in `.factory/claims.json`, as required by the claims contract. A
fresh demo visit sends `POST /api/demo` and the server persists a 24-hour row
in `demo_workspaces`; `.factory/demo.md` documents that backend workspace.
The product may truthfully say that sample interaction does not affect a real
room, but it must not imply browser-only storage while creating server-side
demo state. Remove or qualify the sentence and add the exact claim/test.

### P2 — arbitrary missing URLs do not reach the designed 404 recovery page

`/404` correctly returns a branded 404 page. An arbitrary unknown URL such as
`/this-does-not-exist` returns an empty 404 response (zero-byte body), and
Playwright treats navigation to it as a download. It has no recovery action.
This does not meet the required real 404 route for unknown paths.

## Required repair

1. Pin the actual live deployment to one replica and prove it after rollout,
   or replace local SQLite and in-memory rate limiting with shared services.
2. Repeat the live eight-room/20-read test and five browser host-start test:
   every read and host update must be 200.
3. Enforce room creation at 12 requests per client per 60 seconds across every
   live replica; verify the 13th receives 429 and `Retry-After: 60`.
4. Correct/test the sample-storage copy and route all unknown paths to the
   branded 404 page.

## Evidence that passed

### Mandatory claims, from a clean install

After `npm ci`, every exact command in `.factory/claims.json` passed against
the demo entry point:

- `@claim:demo-sandbox`
- `@claim:offline-reload`
- `@claim:same-origin-requests`
- `@claim:remote-controls`
- `@claim:shared-phone`
- `@claim:family-pack-price`

The initial command before dependency installation could not start because
`vite` was absent; this is expected in a clean clone. The complete rerun after
the locked install exited 0.

### Local quality gates

- `npm test`: 4 Vitest tests and 10 Rust tests passed.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run test:browser` passed, including local desktop/mobile, host/phone,
  demo, keyboard, Axe, privacy, and offline checks.
- Exact candidate builds passed with `VITE_BUILD_ID` and `BUILD_SHA` set to
  `28c47c866cbb26ee1e216daf227529e220deb692`. The bundle is 53.49 kB raw /
  19.70 kB gzip JS and 17.41 kB raw / 4.89 kB gzip CSS.
- The released binary started from a fresh directory with only `PORT=18080`
  supplied (plus `PATH` needed to execute it), generated its default database,
  logged default/supplied configuration sources without secrets, and returned
  the candidate SHA from `/health`.
- Docker/OCI build could not be run because this verification container has no
  `docker`, `podman`, or `buildah` executable. The live deployed candidate and
  standalone release-binary checks supply runtime evidence, but do not make
  the missing local container tool a pass.

### Live identity, UX, accessibility, privacy, and PWA checks

- `GET /health` returned
  `{"build":"28c47c866cbb26ee1e216daf227529e220deb692","status":"ok"}`.
  The live JS, CSS, and hero WebP SHA-256 values exactly match the locally
  candidate-built assets.
- Cold first read passed: the page plainly says it is party games for families
  sharing one TV, including children and relatives without phones; the first
  action is **Try it with sample data**, immediately explained as a ready Draw
  Together round. The first screen includes the required one-click demo.
- Normal `/demo` requests stayed on `living-room-lobby.sociobot.in`; no console
  or page errors occurred during the normal demo flow. Demo storage used only
  the documented `demo:living-room-lobby:` keys. The banner, reset, and
  start-real controls were present.
- Live Axe WCAG 2 A/AA/2.1 A/AA checks found zero violations on desktop demo
  and 390 px home. Keyboard D-pad movement, visible 4 px focus, 390 px layout
  without horizontal overflow, and reduced-motion styles passed.
- A live mobile `/demo` visit installed the service worker cache named
  `living-room-lobby-28c47c866cbb26ee1e216daf227529e220deb692`; after clearing
  HTTP cache and forcing offline, `/demo` reloaded with its h1 and demo banner
  and no errors.
- Live responses supplied CSP, HSTS, nosniff, frame denial, referrer policy,
  permissions policy, no-store API/health caching, and immutable caching for
  the hashed JS asset. `/`, `/demo`, `/privacy`, `/terms`, `/health`,
  `robots.txt`, sitemap, manifest, and service worker returned successfully.

## Notes

`/privacy` and `/terms` have correct titles and one h1. The existing README,
MIT license, design thesis, generated-art provenance, and demo documentation
are present. No sign-in is required. The Family Pack checkout was not invoked:
it is an explicit external Sociobot billing action, not required for the free
core-flow verification.
