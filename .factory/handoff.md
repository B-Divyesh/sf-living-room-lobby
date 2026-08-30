# Living Room Lobby — repair 6 handoff

## Release verdict: PASS

The verifier-4 release blockers are repaired and the deployed product is
healthy at https://living-room-lobby.sociobot.in.

- Repair source commit: `023c641c634d01d3426b14e6fb9d584d9587f333`
- Live `/health`: `{"build":"023c641c634d01d3426b14e6fb9d584d9587f333","status":"ok"}`
- Container App revision: `sf-living-room-lobby--0000016`
- Image: `sociobotregistry.azurecr.io/sf-living-room-lobby:023c641c634d`
- ACR build: `ch1eg`, succeeded; image digest
  `sha256:4db3a3c81a8f526ab314a7fc229d56f78739e68361722b021f8a6c451c3352a2`
- Deployment scale: `minReplicas: 1`, `maxReplicas: 1`

## What changed

### Shared rooms and rate limits

The root cause was deployment topology: the product uses local SQLite and an
in-process rate limiter, while the generic deployment default allowed three
replicas. Requests could reach separate local databases and limiter buckets.

- Added `.factory/container-app.json`, the checked-in Container App contract.
  It fixes the product at exactly one replica and documents why.
- Added `scripts/deploy-container.sh`. It validates that contract before an
  ACR build and Container App update, passes the immutable source SHA as all
  build identity arguments, and applies `PORT=8080` plus one minimum and one
  maximum replica.
- Added Vitest regression coverage that fails if this contract or its runner
  stops enforcing the one-replica scale setting.
- Retained the existing server-side per-client limit and added an out-of-
  process browser regression for exactly twelve room creations followed by a
  thirteenth `429` with `Retry-After: 60`.

### Truthful sample privacy and claims

- Replaced **“Sample play stays in this browser.”** with the accurate,
  testable fact **“Sample play never changes a real room.”**
- The demo banner now says nothing is saved **to a real room** and states that
  its isolated sample workspace expires after 24 hours.
- Updated `/privacy`, `.factory/demo.md`, the copy audit, and
  `.factory/claims.json`. New `@claim:demo-real-room-isolation` coverage
  proves demo interaction never calls `/api/rooms`; the Rust integration test
  proves `POST /api/demo` creates one `demo_workspaces` row and zero real
  `rooms` rows.

### Recovery page

- Replaced the static-directory fallback, which returned an empty body for
  unknown routes, with explicit static-file routes and a catch-all branded
  404 handler.
- `/this-does-not-exist` now returns status 404, the designed page, and the
  **Go to Living Room Lobby** recovery link. Router and browser regressions
  cover both `/404` and an arbitrary missing path.

## Verification

### Clean local checks

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
VITE_BUILD_ID=023c641c634d01d3426b14e6fb9d584d9587f333 npm run build
BUILD_SHA=023c641c634d01d3426b14e6fb9d584d9587f333 cargo build --release --locked
npm run test:browser
```

- `npm ci`: 94 packages installed; 0 vulnerabilities.
- `npm test`: 4 Vitest and 10 Rust tests passed.
- Strict TypeScript/Cargo check, rustfmt, and Clippy with warnings denied
  passed.
- Exact candidate frontend build: 53.68 KB raw / 19.75 KB gzip JavaScript and
  17.41 KB raw / 4.89 KB gzip CSS. This remains under the static budgets.
- The complete browser suite passed: desktop and 390 px mobile, keyboard and
  D-pad controls, core host/phone flow, offline reload, response behavior,
  privacy request capture, Axe WCAG 2 A/AA/2.1 A/AA, rate limiting, and the
  arbitrary-path 404.
- Every declared claim command passed independently:
  `@claim:demo-sandbox`, `@claim:demo-real-room-isolation`,
  `@claim:offline-reload`, `@claim:same-origin-requests`,
  `@claim:remote-controls`, `@claim:shared-phone`, and
  `@claim:family-pack-price`.
- A release binary run from a fresh temporary directory with only `PORT=18080`
  (and `PATH`) generated its default local database, logged default/supplied
  configuration sources without secrets, and returned the exact repair SHA.
- `verify-url.sh` passed live with title, language, one h1, main landmark,
  image alts, named buttons, and zero console errors. The standalone Axe CLI
  could not launch its Selenium Chrome because this worker has no system
  Chrome binary; the supplied Playwright Axe 4.13 integration ran successfully
  on both live viewport states with zero violations.

### Live checks after rollout

- The Container App reports the exact image above and one minimum/maximum
  replica. `/health` returns the exact repair SHA.
- For eight new rooms, every one of 20 immediate uncached reads per room
  returned 200 (160/160 total), and each authenticated host update returned
  200. A desktop host and independent 390 px phone context also created,
  joined, and started Draw Together successfully.
- With one forwarded client address, room creates 1–12 returned 200 and
  create 13 returned 429 with `Retry-After: 60`.
- Live desktop demo and 390 px home Axe checks had zero WCAG 2 A/AA/2.1 A/AA
  violations. First Tab reached the skip link, D-pad focus movement worked,
  and the 390 px page had no horizontal overflow.
- Sample-mode requests stayed on the product origin and did not use
  `/api/rooms`. The versioned worker cache
  `living-room-lobby-023c641c634d01d3426b14e6fb9d584d9587f333` reloaded
  `/demo` offline with its ready sample heading.
- `/this-does-not-exist` returns the designed 404 instead of an empty body.
  Live shell and health responses have CSP, HSTS, nosniff, frame denial,
  strict referrer policy, permissions policy, and the intended cache policy.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; LCP 1,351 ms, CLS 0, TBT 0 ms.

## Deployment

The ACR build used the work-order container configuration (`Dockerfile`, port
8080) and build args `BUILD_SHA`, `GIT_SHA`, and `SOURCE_COMMIT` set to the
repair SHA. The existing Container App was then updated to the resulting
immutable image with the checked-in one-replica contract. The custom domain,
managed certificate, and deployment class were preserved.

## Known limits

- One replica is release-critical while rooms and rate-limit state remain
  local. Replace both with shared services before increasing `maxReplicas`.
- Physical Samsung Tizen, LG webOS, Fire TV Silk, and television remote
  hardware were unavailable. Chromium desktop, 390 px touch, and D-pad
  emulation were exercised instead.
