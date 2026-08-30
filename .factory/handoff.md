# Living Room Lobby — repair 5 handoff

## Release verdict: PASS

The two release blockers in verification report 3 (`0fcb8945b09c51005162fcc98e6c6790b67e8dc4`) are repaired. The deployed artifact was built from `e75e06e50f88fc6c87a5c0ddc9418e1c13d16eb3` and live `/health` returns that exact SHA:

```json
{"build":"e75e06e50f88fc6c87a5c0ddc9418e1c13d16eb3","status":"ok"}
```

Live URL: https://living-room-lobby.sociobot.in

## What changed

### One-click, isolated demo

- `/demo` is now a real entry point, reachable from the first-screen **Try it with sample data** action.
- It opens a ready Draw Together round with the opinionated Asha, Marcos, and Lee and Bo sample. The persistent banner says **“Demo — sample data, nothing is saved”** and provides **Reset demo** and **Start for real**.
- Demo browser data uses only the `demo:living-room-lobby:` local/session-storage namespaces. Starting for real removes those namespaces before returning to `/`.
- `POST /api/demo` seeds a separate `demo_workspaces` SQLite table with a random workspace ID and an exact 24-hour expiry. It never reads or writes real `rooms` data. Demo interaction remains local to the sample, so no real-room API call is made during a demo.
- The worker precaches `/demo`; a first visit can then reload the sample offline.

### Shared rooms in production

The failed candidate allowed the Container App to scale to three replicas while using each replica’s local SQLite file. A host could create a room on one replica and a phone/read request could reach another file, causing the verifier’s 404s.

- The deployed Container App is explicitly constrained to `minReplicas: 1` and `maxReplicas: 1` (`sf-living-room-lobby--0000014`). This is the correct safe configuration for the existing local SQLite room store and in-memory per-client limiter.
- Rust regression coverage constructs two server instances against one SQLite database and proves all 20 immediate reads can retrieve the room. The production browser and live checks create separate TV/phone contexts, join a new room, make 20 immediate uncached reads, and draw from the phone.
- Before horizontally scaling this product, replace the local room store and limiter with a genuinely shared service. The current deployment must remain one replica.

### Release hardening retained and completed

- The server exposes a real styled 404 with a 404 status rather than serving the application shell for unknown assets.
- The Docker Rust stage now uses supported `rust:1-slim` and explicitly includes the compiled 404 document. A regression test prevents that build dependency from being dropped.
- The existing product behavior, accessibility fixes, remote control behavior, Family Pack flow, privacy, and original visual system were preserved.

## Regression coverage

- `frontend/e2e/product-regression.mjs` now covers the demo CTA, 24-hour seeded workspace, demo namespace/reset/start-real discard, same-origin demo requests, shell cache and offline `/demo` reload, remote navigation, shared-phone Pass & Guess, exact Family Pack price, desktop host/phone play, 390 px controls, console errors, and Axe WCAG 2 A/AA/2.1 A/AA states.
- Rust tests cover demo workspace isolation/TTL, API and room-creation limits with `Retry-After`, the styled 404/cache/security policy, normal room play, and 20 cross-app-instance reads against a common SQLite store.
- `frontend/src/release.test.ts` asserts the unpinned Rust base, build SHA propagation, and the 404 asset copied to the isolated Docker build stage.
- `.factory/claims.json` contains six claim entries. Each exact claim command was run independently from the final tree.

## Verification performed

Clean install and local gates:

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
VITE_BUILD_ID=e75e06e50f88fc6c87a5c0ddc9418e1c13d16eb3 npm run build
BUILD_SHA=e75e06e50f88fc6c87a5c0ddc9418e1c13d16eb3 cargo build --release --locked
npm run test:browser
```

Results:

- `npm ci`: 94 packages installed; 0 vulnerabilities.
- `npm test`: 4 Vitest and 10 Rust unit/integration tests passed.
- TypeScript, Cargo check, rustfmt, and Clippy with warnings denied passed.
- The final frontend build is 53.49 KB raw / 19.70 KB gzip JS and 17.41 KB raw / 4.89 KB gzip CSS.
- The full browser suite passed. It uses separate desktop (1440 px) and mobile (390 px) contexts; verifies Tab/skip navigation, Arrow/Enter remote control, touch play, host/phone joining, no console/page errors, privacy request capture, and independent service-worker offline contexts.
- Each declared claim command passed: `@claim:demo-sandbox`, `@claim:offline-reload`, `@claim:same-origin-requests`, `@claim:remote-controls`, `@claim:shared-phone`, and `@claim:family-pack-price`.
- An exact release binary was started from a fresh temporary directory with only `PORT=18080` set (plus the shell `PATH`). It generated/used the default local database, logged only configuration sources, and returned the exact build SHA from `/health`.
- `/opt/fleet/lib/verify-url.sh` passed locally and live: title, `lang`, one h1, main landmark, image alt coverage, named buttons, and zero browser console errors.
- The Playwright Axe 4.13 integration passed with zero WCAG 2 A/AA/2.1 A/AA violations on desktop home, 390 px home, Point Panic, and the live desktop/mobile site. The standalone `@axe-core/cli` was also attempted, but its ChromeDriver supports Chrome 152 while the supplied Playwright Chrome is 145; the supported Playwright Axe integration is the executed accessibility check.
- Lighthouse 12.8.2 against the exact local release shell: mobile Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.25 s, LCP 1.51 s, TBT 8 ms, CLS 0. Desktop was also 100/100/100/100 (FCP 0.35 s, LCP 0.38 s, TBT 16 ms, CLS 0).

Live release checks after deployment:

- Factory container deployment completed successfully. The app is revision `sf-living-room-lobby--0000014`, serving `e75e06e…`, with `minReplicas: 1` and `maxReplicas: 1`.
- Two independent live browser contexts created and joined a room, sent a phone drawing stroke, and completed 20 immediate uncached room reads with 20 HTTP 200 responses.
- Live desktop and 390 px browser checks passed: zero console/page errors, Axe clean states, keyboard/remote movement, demo banner/sample data, same-origin request capture, and an offline `/demo` reload after service-worker installation.
- Live route/status checks passed for `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js`, and `/health`; `/404` returns 404. CSP, HSTS, nosniff, frame denial, referrer policy, permissions policy, and shell/API/cache headers were present. The hashed JS bundle is immutable.
- A live non-mutating API probe made 41 same-client reads of a nonexistent room and received a 429 with `Retry-After: 1` after the allowed burst.

## Deployment

The standard container deployment command was run twice: once for the runtime repair and again for the final tested revision. The second build and rollout completed successfully. The replica constraint was re-applied after rollout because the deployment default is higher than this SQLite-backed product can safely support.

## Known limits and next steps

- Physical Samsung Tizen, LG webOS, Fire TV Silk, and television remote hardware were not available. Chromium desktop and 390 px touch/remote emulation were used.
- The single replica is intentional and release-critical. A future scale-out requires a shared room database and distributed rate limiter before changing `maxReplicas` above one.
