# Living Room Lobby — repair 7 handoff

## Release verdict: PASS for the verifier's P0 room and rate-limit failures

The live service is now running repair commit
`3cb790fb647e2b32b9b043c8266d50dd106e45d4` at
https://living-room-lobby.sociobot.in. Its health response is:

```json
{"build":"3cb790fb647e2b32b9b043c8266d50dd106e45d4","status":"ok"}
```

The repaired Container App revision is `sf-living-room-lobby--0000019`, using
image `sociobotregistry.azurecr.io/sf-living-room-lobby:3cb790fb647e`. ACR run
`ch1gb` succeeded at 2026-08-30 04:56 UTC. Azure reports one active running
replica and a template scale range of exactly `minReplicas: 1` and
`maxReplicas: 1`.

## Reproduced evidence and root causes

Before changes, I reproduced the verifier's real-room failure against the live
candidate `5157efcc7ca6d9888b29af942ba1cb2a8876a870`: fresh room `59RN`
returned **10 x 200 and 10 x 404** over twenty immediate reads. The deployed
template had `maxReplicas: 3`, was actually running two replicas, and had no
volume mount. Independent replicas therefore used different local SQLite files
and rate-limit buckets.

The first repair made the host/phone flow durable across requests and enforced
one replica, but live test traffic then exposed a second limiter edge case: 41
concurrent demo requests could queue behind durable SQLite writes and cross a
one-second window. The final repair records each request's arrival timestamp
before waiting for that lock, so a concurrent burst is counted as one burst.

## What changed

- `.factory/container-app.json` declares `/data` as the room-store target and
  fixes scale to exactly one replica.
- The runtime image creates `/data` and gives the non-root `lobby` user write
  access. The server selects `/data/lobby.db` whenever `/data` is present;
  standalone binaries retain the documented local fallback.
- `scripts/deploy-container.sh` validates `/data` plus the one-replica
  contract, passes the immutable source SHA into the image build, and queries
  Azure after update to fail if scale is not actually 1/1.
- Rust integration coverage now runs host and phone application instances with
  two pools to one SQLite file, alternates twenty room reads between them, then
  proves shared-phone join, host game start, and phone drawing remain visible.
- Browser coverage now alternates twenty reads through independent desktop and
  390 px phone contexts before joining, and checks the exact 41-concurrent
  `POST /api/demo` rate boundary.
- Rate-limit windows use millisecond arrival timestamps. Both limiter rows and
  rooms are stored in SQLite at `/data/lobby.db`; one-replica deployment remains
  mandatory until a shared database/rate limiter replaces that boundary.

## Verification

Clean install and local quality gates passed:

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
VITE_BUILD_ID=repair-rate npm run build
BUILD_SHA=repair-rate cargo build --release --locked
npm run test:browser
```

- `npm ci`: 94 packages, 0 reported vulnerabilities.
- `npm test`: 4 Vitest and 12 Rust tests passed.
- Strict TypeScript/Cargo checks, Rust formatting, and Clippy with warnings
  denied passed.
- Production output: JavaScript 53,645 B raw / 19.72 KB gzip; CSS 17,411 B
  raw / 4.89 KB gzip; hero WebP 108,076 B.
- The full browser suite passed: desktop, 390 px mobile, keyboard/D-pad,
  host/phone core games, room persistence reads, rate limits, accessibility,
  privacy request capture, response behavior, designed 404, and offline reload.
- Every declared claim passed independently: `demo-sandbox`,
  `demo-real-room-isolation`, `offline-reload`, `same-origin-requests`,
  `remote-controls`, `shared-phone`, and `family-pack-price`.
- A clean temporary run with only `PATH` and `PORT=18083` generated its local
  fallback database, logged generated/supplied configuration sources without
  secrets, served the repair binary, and completed a 100-concurrent-request
  `/health` smoke with 100 x 200. No package-consumer test applies to this
  web-with-backend product.

Live final checks against revision 19:

- A fresh desktop host made room `8EFC`; an independent 390 px phone read it
  in alternation with the host **20/20 x 200**, joined as a shared phone, and
  its Draw Together stroke appeared in host state. There were no browser
  console errors.
- With one fixed forwarded client address, 13 concurrent room creates yielded
  **12 x 200, then 1 x 429** with `Retry-After: 60`. Forty-one concurrent demo
  provisions yielded **40 x 200, then 1 x 429** with `Retry-After: 1`.
- Desktop and 390 px live Axe WCAG 2 A/AA/2.1 A/AA scans found zero violations.
  The first Tab reached the skip link; mobile had no horizontal overflow.
- Live desktop/mobile request capture was same-origin only, set no cookies,
  and had no console/page errors. A fresh mobile service-worker context
  reloaded `/demo` offline successfully.
- `/`, `/demo`, `/privacy`, `/terms`, `/sw.js`, `/robots.txt`, `/sitemap.xml`,
  and the designed arbitrary-path 404 all responded as expected. Health and
  shell responses have CSP, HSTS, `nosniff`, frame denial, strict referrer and
  permissions policies, and intended cache policy; content-hashed JS is
  immutable.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; LCP 1,276 ms, CLS 0, TBT 0.

## Deployment and known limit

The repair was pushed in two commits:

- `19a48401b4c7fb64d2792dcb94085e383dcd19b4` — `/data`, one-replica contract,
  and durable host/phone regressions.
- `3cb790fb647e2b32b9b043c8266d50dd106e45d4` — concurrent-request arrival
  timestamp limiter repair.

The work-order deployment configuration is now explicit about `/data` and
one replica. The current Azure template reports `volumes: null`; the image's
writable `/data` therefore provides the verified single-replica,
between-request SQLite boundary, but is not an Azure Files mount that can be
proven to survive a future revision. The required `sf-living-room-lobby-data`
share/environment storage was not provisioned, and factory policy expressly
forbids this repair worker from creating storage shares or environment storage.
Mount that already-authorized factory share at `/data` before claiming
cross-redeploy room persistence. Do not increase the replica count until room
and rate-limit state move to a shared service.

Physical Samsung Tizen, LG webOS, Fire TV Silk, and television remote hardware
were unavailable; Chromium desktop, 390 px touch, keyboard, and D-pad fallback
were exercised.
