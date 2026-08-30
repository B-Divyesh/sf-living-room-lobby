# Living Room Lobby — verification-2 repair handoff

## Scope

This repair addresses every finding in independent verification report
`.factory/verification-2.md` for candidate
`ea84f3d9c78937a11447e7b7f8d35291f2f2f4c7`, without changing the TV-first
room model, the three free core games, the Family Pack, or the Rust/Axum +
SQLite container architecture.

## Reproduction and repair

The candidate was rebuilt before editing. At 390 px, Axe 4.13 reported the
exact serious `scrollable-region-focusable` violation for `.game-strip`; after
creating a Point Panic room it reported the exact serious
`aria-prohibited-attr` violation for `.target`. In a fresh browser context,
the candidate worker cache contained only `/`, `/privacy`, `/terms`, and the
hero. Clearing the HTTP cache, going offline, and reloading produced zero h1s,
an empty `#app`, and the expected JS/CSS HTML-MIME errors.

The repair makes the horizontally scrolling game catalogue an explicitly
labelled, keyboard-focusable region. Left and right arrows scroll it, respect
reduced motion, and do not leak into TV-remote navigation. Point Panic's target
is now a semantic image with the valid name “Moss target”. The mobile wordmark
and footer legal links are now real 44×44 px targets.

The release worker is built with the exact content-hashed JS and CSS names
read from Vite's final HTML. It precaches those assets with the shell. Its HTML
fallback is restricted to navigation requests; an unavailable asset receives a
504 response instead of the application HTML. The server's hashed-asset test
also accepts Vite URL-safe hashes that contain `-` or `_`, so the actual bundle
continues to receive immutable caching.

Room creation remains limited to 12 per forwarded client address per minute
with `429` and `Retry-After: 60`. Every room API route now also has a 40
requests/second per-client guard with `429` and `Retry-After: 1`. The product's
SQLite store and limiters are deliberately single-instance; deployment sets
this Container App to `maxReplicas: 1`, making the documented creation bound
hold at the ingress rather than weakening across replicas.

The Dockerfile now uses `rust:1-bookworm` rather than a pinned minor release,
and the final image carries the build SHA as OCI metadata while requiring only
`PORT` at runtime. The server logs whether its port and SQLite URL were
supplied or defaulted without printing values.

## Regression coverage

- `frontend/e2e/product-regression.mjs` is the production-browser regression
  suite. It covers desktop and 390 px pages, first-Tab skip navigation,
  remote Arrow/Enter game selection, Draw Together strokes, shared-phone Pass
  & Guess scoring, Point Panic D-pad recovery, console/page errors, and the
  previously failing Axe states.
- The same suite creates a completely fresh browser context for the cold
  offline reload. It verifies the exact hashed JS and CSS cache entries, clears
  the HTTP cache, reloads offline, and asserts the rendered home screen and
  absence of console errors.
- `.factory/claims.json` lists and runs the offline-reload and same-origin
  privacy claims. The latter records the complete normal free landing flow and
  accepts only the product origin.
- Rust integration coverage proves the all-routes rate-limit boundary;
  release tests cover worker shell injection, navigation-only fallback, Docker
  identity/runtime configuration, and a URL-safe Vite hash cache policy.

## Commands and evidence

Completed from a clean dependency install:

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
npm run test:browser
npm run test:browser -- --grep @claim:offline-reload
npm run test:browser -- --grep @claim:same-origin-requests
VITE_BUILD_ID=0123456789abcdef0123456789abcdef01234567 npm run build
BUILD_SHA=0123456789abcdef0123456789abcdef01234567 cargo build --release --locked
```

- `npm ci`: 94 packages installed; 0 vulnerabilities.
- `npm test`: 4 Vitest tests and 7 Rust unit/integration tests passed.
- Strict TypeScript, Cargo check, rustfmt, and Clippy with warnings denied
  passed.
- `npm run test:browser`: passed. Axe WCAG 2 A/AA had zero violations on
  desktop home, 390 px home, and host Point Panic. The regression also passed
  the keyboard and core shared-room flows with no console or page errors.
- Both claim commands passed from their own browser runs.
- The production output is 48.17 KB raw JS (18.03 KB gzip), 16.36 KB raw CSS
  (4.68 KB gzip), and a 108,076 B hero WebP.
- A release binary started from a new temporary directory with only `PORT`
  set created its local SQLite data directory, logged default/supplied config
  sources only, and returned the supplied 40-character build ID from
  `/health`. Root and `sw.js` revalidate; the generated JS/CSS are immutable;
  health/API are `no-store`; CSP, HSTS, Permissions-Policy, nosniff, frame
  denial, and referrer policy were present.
- Lighthouse 12.8.2 mobile against the local production shell: Performance
  100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.3 s,
  TBT 0 ms, CLS 0.

## Deployment and live verification

The committed source is built through the factory's standard container path;
the factory build arguments provide the commit SHA to both the Vite worker and
Rust `/health` binary. After deployment, verify:

```sh
curl -sS https://living-room-lobby.sociobot.in/health
curl -sSI https://living-room-lobby.sociobot.in/sw.js
```

The expected live health `build` value is the deployed commit SHA. The
Container App is constrained to one replica because its local SQLite room
store and rate limiter are single-instance by design.

## Known limits

Physical Samsung Tizen, LG webOS, Fire TV Silk, and hardware orientation were
not available. Chromium desktop and touch/mobile emulation exercise the
supported remote and D-pad fallback. Docker/Podman are unavailable locally,
so the Dockerfile's locked frontend and backend stages were exercised directly;
the final image is built by ACR during deployment.
