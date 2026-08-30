# Living Room Lobby — repair 9 handoff

## Release status: ready to deploy

This repair addresses the P1/P3 findings in independent verification 7
(`.factory/verification-7.md`) for base candidate
`6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`.

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
locally. Deployment identity is verified by `scripts/verify-release.mjs` after
the configured container rollout.

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
