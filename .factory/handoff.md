# Living Room Lobby — review 1 handoff

## Review status: FAIL

Completed a fresh first-read product review of the live 390 px and desktop
layouts, one-click demo, sandbox storage and request behavior, every listed
claim, earlier handoff findings, copy, routes, metadata, links, accessibility,
and visual identity. The complete report is `.factory/review-1.md`.

Three blocking findings remain:

- **Try it with sample data** is below a 1366×768 first viewport and is slightly
  clipped at 1440×900.
- The seeded **BIRTHDAY CAKE** prompt extends behind the fixed command rail at
  desktop and TV sizes.
- English-only prompts and instructions do not yet serve the brief's
  non-English-relative use case.

The review also records unlisted README/landing claims, an incomplete 404
skeleton, a missing route-announcement region and landing privacy section, a
misdirected README demo link, and specific plain-word copy findings. No product
code or deployment resource was changed.

Verification completed:

- `npm ci` — 94 packages, 0 reported vulnerabilities.
- All 16 exact `.factory/claims.json` checks passed independently.
- `npm test` — 5 Vitest, 5 Node, and 19 Rust tests passed.
- `npm run check` passed.
- `npm run build` passed: 53.87 KB JavaScript raw / 19.80 KB gzip; 17.57 KB CSS
  raw / 4.93 KB gzip.
- `npm run test:browser` passed.
- Fresh live Playwright checks confirmed demo reset/discard behavior,
  same-origin demo requests, forward/back focus, zero home/demo console errors,
  zero home Axe violations at mobile and desktop, and working real routes.
- The live release verifier passed for accepted application release
  `e46876d434aa1df25d4e8ffc3d50a005b945a3a9` across `/health`, the service
  worker cache, and the footer.

Temporary review scripts and screenshots were kept outside the committed
handoff. The committed tree contains only the review report and this appended
handoff section.

---

# Living Room Lobby — verification 9 handoff

## Release status: PASS

Independent QA accepted candidate `e46876d434aa1df25d4e8ffc3d50a005b945a3a9` at `https://living-room-lobby.sociobot.in`.

The deployed backend `/health`, a fresh service-worker cache, and the visible footer all identify that exact full SHA. Required claims, local test/type/lint/build checks, live host-and-phone play, sample isolation, invalid-input recovery, desktop/390 px use, keyboard/remote controls, reduced motion, Axe, offline reload, same-origin request capture, response headers/caching, and documented request allowances passed. The live API allowed 40 simultaneous demo provisions per client before `429` with `Retry-After: 1`, and 12 room creations per minute before `429` with `Retry-After: 60`.

See `.factory/verification-9.md` for exact evidence. No product defects were found and no product code was changed during verification.

Known coverage limits: this worker has no `docker`, `podman`, or `buildah`, so it could not execute the exact container-build command; locked local production compilation and the matching deployed build passed. No physical TV browser was available; desktop, 390 px mobile, keyboard, and remote-control browser paths were checked. No repository `verify-url.sh` exists; Playwright and Axe supplied the comparable checks.

---

# Living Room Lobby — repair 10 handoff

## Release status: repaired and ready for the exact-source deployment

This repair resolves every release blocker in independent verification 8
(`.factory/verification-8.md`) while keeping the Rust/Axum + SQLite container
and the existing demo, room, TV-remote, phone, and PWA behaviors.

### Reproduced before changing code

- The required stale-release check still failed against the permitted product
  URL: expected `28cef378a56279a9025186bcfca2274ab60254b6`, but `/health`
  returned `6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`.
- A fresh local production build at 390×844 placed **Try it with sample data**
  at `y=874.40625`, below the viewport.
- The documented shared checkout returned the verifier's operator-gated 404.
  It was not retried or changed: shared services are outside this work order.

### Repairs

- On phones the hero copy, including the sample action, now comes before the
  artwork. The exact 390×844 check now measures the complete action at
  `y=548.328125–602.328125`.
- The release verifier now requires the exact full SHA in all three places:
  `/health`, a cold service-worker cache, and the rendered footer. Its unit
  suite rejects a stale footer identity as well as stale backend and worker
  identities.
- Family Pack purchase copy and the broken checkout link were removed. The
  page honestly says hosted checkout is being set up, leaves Statue switch and
  Colour chorus locked, and keeps the three core games free. This is the
  closest useful behavior while the operator-owned checkout registration is
  unavailable.
- Stored inactive licenses now keep extra games locked and show the quiet,
  visible status: “This license is no longer active. Extra games remain
  locked.” Query tokens are stripped, the result is cached locally, and
  verification goes only to Sociobot rather than the room API.
- Added exact claims and regressions for the retained shared-TV canvas,
  Point Panic controls, six-hour room retention, no advertising/analytics
  scripts, minimal join data, unavailable checkout, and inactive licenses.
  The prior demo, offline, privacy, remote, shared-phone, free-game, and
  player-count claims remain covered.

### Local verification

- Clean dependency install: `npm ci` — 94 packages, 0 reported
  vulnerabilities.
- `npm test` passed: 5 Vitest tests, 5 release-verifier tests, and 19 Rust
  unit/integration tests.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run build` passed. Before the immutable release-ID build, JavaScript
  was 53.87 KB raw / 19.80 KB gzip and CSS 17.57 KB raw / 4.93 KB gzip.
- `npm run test:browser` passed. It covers desktop and 390 px flows,
  keyboard/D-pad, Axe WCAG 2/2.1 A/AA, demo isolation, real host/phone play,
  invalid-room recovery, response policies, 404, rate limits, privacy capture,
  offline reload, and service-worker caching.
- Every exact command in `.factory/claims.json` passed independently, including
  all 15 Playwright claim entry points and
  `cargo test --locked claim_real_room_retention_expires_after_six_hours`.
- `./scripts/deploy-container.sh --validate-only` confirms port 8080, durable
  `/data`, and exactly one replica. The Dockerfile accepts the factory's build
  SHA without `.git` and runs non-root.

### Deployment and live proof

The final deployment completed from the clean committed checkout with
`./scripts/deploy-container.sh`. It retained the permitted
`sf-living-room-lobby-data` mount at `/data`, kept scale at 1/1, and exited
only after `/health`, a cold service-worker cache, and the footer each matched
the exact immutable source SHA. The same release gate against the public URL
returned one matching backend SHA, `living-room-lobby-<that SHA>` cache, and
the footer build label.

The post-rollout command is reproducible directly:

```sh
node scripts/verify-release.mjs "$(git rev-parse HEAD)" https://living-room-lobby.sociobot.in
```

Fresh live Playwright checks also passed on desktop and 390×844 mobile: one
page-level heading, sample action, no purchase link, zero console errors, and
zero Axe WCAG 2/2.1 A/AA violations. The mobile sample action remained fully
visible at `y=548.328125`.

### Environment limits

No local Docker executable or repository `verify-url.sh` is available. The
browser suite supplies the Axe accessibility smoke test; no physical smart-TV
device was available, so Chromium remote-keyboard and 390 px mobile paths were
used. No forbidden service, database, key vault, or unrelated product resource
was read or changed.

---

# Living Room Lobby — verification 8 handoff

## Release status: FAIL

Independent QA of candidate
`28cef378a56279a9025186bcfca2274ab60254b6` at
https://living-room-lobby.sociobot.in **fails**. Full evidence is in
`.factory/verification-8.md`.

Release blockers:

- Live `/health`, the service-worker cache, and the footer identify
  `6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`, not the candidate.
- At 390×844 the sample action starts below the first viewport (`y=874.40625`),
  so the mandatory first screen does not show what to click first.
- The visible Family Pack checkout URL returns HTTP 404, so the paid path
  cannot be completed.
- Visitor-facing feature/privacy/paid promises remain absent from
  `.factory/claims.json`; the ten listed claim tests all pass, but the claim
  inventory is incomplete.

An invalid stored license also locks the games without the required quiet
status notice (P2). The stale live build still logs a 404 for invalid room-code
recovery; the candidate's exact local regression for that case passes.

Local candidate verification otherwise passes: locked install, all ten claim
commands, `npm test`, `npm run check`, Rust format/Clippy, frontend and optimized
backend builds, full Playwright suite, container configuration validation, and
an exact-SHA `/health` smoke. Fresh live checks passed normal host/shared-phone
play, twenty concurrent room reads, same-origin demo privacy, Axe, keyboard,
reduced motion, offline reload, security/cache headers, and limits of 40 API
requests per second plus 12 room creations per minute. Mobile Lighthouse scored
100/100/100/100 with LCP 1.4 s, CLS 0, and 179 KiB transferred.

No product code was changed during verification. No unrelated resource was
accessed or modified.

---

# Living Room Lobby — repair 9 handoff

## Release status: repair complete; deployment not run

This repair addresses the P1/P3 findings in independent verification 7
(`.factory/verification-7.md`) for base candidate
`6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`.
The repair commit is `85c8836a07e1844078bf262a74aa0f1e9cf30e1e` and was pushed to
`origin/main`.

### What changed

- Added the required, exact claim entries and one independently runnable demo
  test for each retained promise:
  - `account-free-sample` proves a fresh, unauthenticated `/demo` visit opens
    the ready room without an account step, cookie, or Authorization header.
  - `free-game-availability` opens Draw Together, Point Panic, and Pass &
    Guess from the unlicensed sample lobby and confirms no other origin is
    requested.
  - `player-count-limits` checks every visible chooser range: Draw Together,
    Point Panic, and Colour Chorus are `2–10 players`; Pass & Guess and Statue
    Switch are `3–12 players`. It also starts each free game with the shipped
    three-player sample. Game data now holds numeric min/max fields and derives
    each displayed range from them, preventing a label/data drift.
- Reproduced the exact `ZZZZ` failure before changing it: the old join action
  returned 404, displayed “That room is gone. Check the code or start a new
  one.”, and Chromium logged `Failed to load resource`. Missing-room joins now
  return a successful recovery JSON envelope. The frontend still turns that
  envelope into the same polite form error; normal missing-room reads retain
  HTTP 404 semantics.
- Added Rust route coverage for that recovery envelope and a 390 px Playwright
  regression that asserts the exact message, one 200 response, and zero
  console/page errors.

### Verification

- Clean install: `npm ci` — 94 packages, 0 vulnerabilities.
- `npm test` — 5 Vitest, 4 Node release tests, and 18 Rust tests passed.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run build` passed: JavaScript 53.62 KB raw / 19.78 KB gzip; CSS 17.41
  KB raw / 4.89 KB gzip.
- `npm run test:browser` passed. It runs production desktop and 390 px flows,
  keyboard/D-pad, Axe WCAG 2 A/AA/2.1 A/AA, privacy request capture, offline
  reload, service-worker shell checks, response-policy/404 checks, host/phone
  play, and both rate limits.
- Every exact command listed in `.factory/claims.json` passed independently:
  `demo-sandbox`, `account-free-sample`, `demo-real-room-isolation`,
  `offline-reload`, `same-origin-requests`, `remote-controls`, `shared-phone`,
  `family-pack-price`, `free-game-availability`, and `player-count-limits`.
- `npm run test:browser -- --grep @regression:invalid-room-code-recovery`
  passed after reproducing the previous failure.
- `cargo build --release --locked` passed. A release binary started from a
  clean temporary working directory with only `PORT=18182`; its generated
  local-fallback SQLite configuration, `/health`, shell cache policy, and CSP
  were verified.
- `./scripts/deploy-container.sh --validate-only` confirmed the checked-in
  container configuration: Dockerfile, port 8080, `/data`, and one replica.

### Known environment limits

No repository `verify-url.sh` or local `docker` executable is available in
this worker. The browser suite uses Playwright Axe integration for the required
accessibility scan; container configuration and the release binary were tested
locally.

The checked-in deployment script requires the shared `sociobotregistry` ACR
and `sociobot` resource group before it can update the permitted
`sf-living-room-lobby` Container App. The work-order safety boundary forbids
connecting to resources that are not `sf-living-room-lobby`, so this worker did
not execute that cloud rollout or its live identity check. No non-product Azure
resource was contacted. Run `./scripts/deploy-container.sh` from an authorized
factory deployment worker; it will build the pushed source, preserve `/data`,
and run `scripts/verify-release.mjs` against the live URL.

---

# Living Room Lobby — verification 7 handoff

## Release status: FAIL

Independent QA of candidate `6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7` at
https://living-room-lobby.sociobot.in **fails** on the mandatory claims
contract. See `.factory/verification-7.md` for complete evidence.

The candidate is correctly deployed: both `/health` and a fresh installed
service-worker cache name that exact full SHA. Local install, all listed claim
commands, `npm test`, `npm run check`, Rust format/Clippy, production build,
and full browser regression all pass. Live product, privacy, responsive,
keyboard, offline, Axe, cache/header, and rate-limit checks also pass.

Release blocker: the live landing page promises account-free sample use,
free-game availability, and game player-count limits without entries and
observable demo tests in `.factory/claims.json`. The factory claims contract
requires a listed test for each visitor-facing promise. Add the claims/tests or
remove/reword those promises, then re-verify. An invalid room code also logs an
expected 404 as a browser console error while showing correct recovery UI
(P3; non-blocking).

No product code was changed during verification.

---

# Prior builder repair handoff (historical)

## Release repair

This repair addresses independent verification 6
(`.factory/verification-6.md`). The verifier found that production was still
serving `3cb790f…` while candidate `f00f225…` had an unhealthy latest revision,
so neither `/health` nor a cold service-worker cache could identify the requested
source.

The failure was reproduced directly on the product Container App before the
repair. Revision `sf-living-room-lobby--0000020` had image
`sociobotregistry.azurecr.io/sf-living-room-lobby:f00f2259cdd8`, a durable
`sf-living-room-lobby-data` Azure File mount at `/data`, and one replica, but
was `ActivationFailed`/`Unhealthy`. Its application log ended with
`Execute(Database(SqliteError { code: 5, message: "database is locked" }))`
while SQLx was issuing its no-op migration bookkeeping statement.

## Root cause and changes

- A new revision starts beside the currently serving revision while both point
  at the durable SQLite file. SQLx's migration runner issues a write even when
  every migration is already applied, so that harmless check could lock out the
  candidate and leave ingress on the previous healthy revision.
- Startup now first reads the applied migration versions and checksums. A
  current schema starts without that bookkeeping write; actual new migrations
  retain a 10-second SQLite busy timeout and bounded lock retries.
- The durable production pool uses one SQLite connection. The product is one
  replica and already serializes writes; reusing that one connection prevents a
  schema-read connection from holding an Azure Files lock while migration setup
  needs to write.
- Azure Files rejects SQLite advisory file locks (confirmed with `flock` in
  the product container), so the `/data` connection uses SQLite's lock-free
  `unix-none` VFS. The deployment script first stops every active Living Room
  Lobby revision and waits for graceful shutdown before starting the sole next
  revision. This creates a short maintenance window but prevents overlapping
  writers on the durable share.
- A cancelled first migration had left `/data/lobby.db` at zero bytes plus a
  journal sidecar. Startup now moves only that invalid zero-byte database and
  any SQLite sidecars into `/data/recovery/` before opening SQLite. It never
  replaces a non-empty database, so valid room state remains untouched.
- `current_schema_starts_without_a_noop_migration_write` opens the current
  schema in SQLite `query_only` mode. It proves startup succeeds only because
  it does not try the no-op migration write. The existing locked-database
  regression confirms an actual migration wait retries instead of crash-looping.
- `scripts/deploy-container.sh` now refuses a dirty checkout, tags the image
  with the full source SHA, passes that exact value as `BUILD_SHA`, waits for
  the image's latest revision to be the ready revision, retains one replica and
  the `/data` `sf-living-room-lobby-data` mount, then runs a public identity
  verifier. Its Azure TSV parser reads every readiness field explicitly; the
  prior single-line parser could see the image but miss the ready-revision line.
- `scripts/verify-release.mjs` fetches uncached `/health` and `/sw.js`, then
  uses a new browser context to assert the sole cold service-worker cache is
  `living-room-lobby-<full-source-sha>`. Its unit tests reproduce both stale
  backend and stale worker values from verification 6 and reject them.

## Verification

Clean install and local product checks passed:

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
npm run build
npm run test:browser
./scripts/deploy-container.sh --validate-only
```

- `npm ci`: 94 packages, 0 reported vulnerabilities.
- `npm test`: 4 Vitest, 4 release-delivery Node tests, and 17 Rust unit and
  integration tests passed.
- TypeScript, Cargo check, Rust formatting, and warning-denied Clippy passed.
- Production frontend: JavaScript 53.64 KB raw / 19.72 KB gzip; CSS 17.41 KB
  raw / 4.89 KB gzip.
- The browser suite passed the live product entry point locally: desktop and
  390 px mobile, keyboard/D-pad, host/phone Draw Together, shared-phone Pass &
  Guess, room reads, both `429`/`Retry-After` limits, designed 404, response
  policy, same-origin privacy capture, cold offline reload, and Axe WCAG 2
  A/AA/2.1 A/AA scans with zero violations.
- Every `.factory/claims.json` command is covered by the browser suite and
  passed from the demo entry point. This web-with-backend product has no package
  consumer artifact.

No `verify-url.sh`, Docker, Podman, or Buildah executable is supplied in this
worker. The accessibility checks use the repository's Playwright Axe integration;
the locked frontend and backend production build commands passed locally. The
factory ACR build is the final OCI-image build.

## Deployment evidence and operation

Run the checked-in deployment script only from this clean, committed checkout:

```sh
./scripts/deploy-container.sh
```

It deploys the full `git rev-parse HEAD` value as both image identity and
`BUILD_SHA`; it exits nonzero unless the ready revision, uncached `/health`, and
a newly installed service-worker cache all identify that exact full source
commit. It also exits nonzero unless scale remains `1/1` and
`sf-living-room-lobby-data` remains mounted at `/data`.

The product keeps SQLite state only under `/data` in production and remains
single-replica. No unrelated service, database, key vault, or infrastructure
resource was accessed or changed.
