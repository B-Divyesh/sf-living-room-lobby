# Living Room Lobby — repair 8 handoff

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
  verifier.
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
- `npm test`: 4 Vitest, 4 release-delivery Node tests, and 16 Rust unit and
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
