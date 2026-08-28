# Living Room Lobby — build handoff

## Repair deployment QA — PASS (2026-08-28)

Candidate `8338bd8c9feb120e63c049486998bb259fc803ea` was recovered without a
product, visual, artifact-class, or runtime-architecture change. The only
repair is commit `a0d01c8dc625abf6bd420b3bdea4a61657dfdf81`, which embeds the
immutable candidate SHA in the production Rust compile so `/health` is a
meaningful delivery check. It was deployed as
`sociobotregistry.azurecr.io/sf-living-room-lobby:a0d01c8dc625` through the
current container worker path. The worker registered the custom hostname before
managed-certificate issuance; certificate issuance and HTTPS binding succeeded.

### Product QA evidence

- Clean dependency install: `npm ci` completed with 0 production and 0 total
  audit vulnerabilities.
- Frontend and backend tests: `npm test` passed — 2 Vitest tests and 3 Rust
  tests, including the focused health-response build-field regression.
- Type and backend checks: `npm run check` passed (`tsc --noEmit` and
  `cargo check`).
- Release builds: `npm run build` passed, producing `dist/` with 47.60 KB JS
  (17.82 KB gzip) and 16.13 KB CSS (4.60 KB gzip); `BUILD_SHA=8338bd8c9feb120e63c049486998bb259fc803ea cargo build --release --locked` passed.
- Local release smoke: `GET http://127.0.0.1:18080/` → HTTP 200 and
  `GET /health` → HTTP 200 with
  `{"build":"8338bd8c9feb120e63c049486998bb259fc803ea","status":"ok"}`.
- Public deployment smoke at `2026-08-28T00:31:39Z`: `GET
  https://living-room-lobby.sociobot.in/` → HTTP 200; `GET
  https://living-room-lobby.sociobot.in/health` → HTTP 200 with
  `{"build":"8338bd8c9feb120e63c049486998bb259fc803ea","status":"ok"}`.
- Public browser QA: `/opt/fleet/lib/verify-url.sh` exited successfully; page
  load was 544 ms with zero console/page errors, title present, `lang="en"`,
  one `<h1>`, a `<main>` landmark, and 0 images missing `alt`. The verifier's
  text-only heuristic counted the closed, labelled license-restore submit
  control as one empty button; the control exposes “Verify license” when its
  `<details>` section is opened. Axe WCAG 2 A/AA scan of the public root found
  0 violations.

### Repair outcome

Public product URL: `https://living-room-lobby.sociobot.in`.

No product behavior, games, billing flow, design direction, deployment class,
or persistence model was redesigned or converted. The working delivery path is
the root multi-stage Dockerfile and `/opt/fleet/lib/deploy-container.sh` on
port 8080.

## Shipped

- TV-first lobby with a real QR join URL, four-character fallback code, remote
  arrow/Enter navigation, expiring rooms, and live player presence.
- Three complete free games: collaborative drawing, phone-tilt or D-pad target
  pointing, and pass-the-phone guessing with a privacy screen between turns.
- Two Family Pack games: Statue switch and Colour chorus. The $12 one-time
  unlock uses Sociobot hosted checkout, URL license capture, daily verification,
  cached/offline verdicts, invalid-license relocking, and an accessible paste-to-
  restore form. No product ID or payment-provider integration is embedded.
- Rust/Axum API with validated edges, opaque host/player tokens, SQLite storage,
  six-hour cleanup, structured logs, secure response headers, `/health`, and
  graceful shutdown. Player tokens are never returned in public room snapshots.
- Responsive brutalist concrete-and-moss interface for TV and 390 px phones,
  original hero artwork, explicit loading/error/empty/offline states, legal
  pages, installable shell/service worker, and no third-party runtime assets.
- Multi-stage non-root Docker image serving `dist/` and the API on port 8080.

## Verification (2026-08-27)

- `npm test`: 2 Vitest tests and 3 Rust tests passed. The Rust integration test
  creates a room, joins as a shared-phone player, starts a game, sends a player
  action, and reads the synchronized state.
- `npm run check`: strict TypeScript and `cargo check` passed.
- `npm run build`: passed; `dist/index.html` exists at the deploy root.
- `cargo build --release --locked`: passed.
- `npm audit --omit=dev` and full `npm audit`: 0 vulnerabilities.
- Playwright end-to-end smoke: 1440×900 host and 390×844 shared-phone player
  joined the same room and opened Draw together; zero console/page errors.
- Axe on landing, active host game, and active phone game: 0 violations.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.28 s, CLS 0, total blocking time 0 ms.
- Production payload: 47.4 KB JS (17.8 KB gzip), 15.9 KB CSS (4.6 KB gzip),
  and 106 KB WebP hero.
- Local health load smoke: 500/500 successful requests at 402 requests/second.

## Run

```sh
npm install
npm test
npm run build
cargo run
```

Or build and run the root `Dockerfile`; persist `/app/data`. Configuration is
via `PORT`, `DATABASE_URL`, `RUST_LOG`, and build-time `VITE_BILLING_BASE`.

## Known gaps / next checks

- This worker had no Docker daemon, so the exact Dockerfile could not be run;
  both of its stages were verified independently with the same locked commands.
- Physical Samsung Tizen, LG webOS, Fire TV Silk, and device-orientation hardware
  were unavailable. Chromium desktop/mobile emulation passed; each sensor game
  has a non-sensor D-pad path.
- The factory must register and smoke-test the Sociobot paid product/return URL.
  The UI deliberately contains only the documented slug-based checkout URL.
- Room state is single-instance SQLite. Horizontal deployment would need shared
  PostgreSQL or sticky routing; this is intentionally outside the v1 single-
  container scope.
