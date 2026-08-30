# Independent verification 5 — FAIL

**Candidate:** `5157efcc7ca6d9888b29af942ba1cb2a8876a870`  
**Live URL:** https://living-room-lobby.sociobot.in  
**Verified:** 2026-08-30

## Release verdict

**FAIL.** The static shell, service worker, and `/health` identify the requested
candidate, but the deployed backend does not reliably retain a real room between
requests. This prevents a family host and phone participant from playing
together. The required live rate limits are also not enforced.

## First-read result

Cold desktop visit: **PASS.** It says it is “party games for one shared TV”,
names families sharing a TV as the audience, and gives the visible first action
**Try it with sample data** with the explanation “See a ready Draw Together
round with three sample families.” Clicking it takes one click to `/demo`.

## Release-blocking defects

### P0 — real rooms are split across live backend instances

At 04:17 UTC a desktop host created room `2RAE`. A separate 390 px phone
context immediately tried to join it as “QA Shared” and received the displayed
recovery message:

```
That room is gone. Check the code or start a new one.
```

The host itself then displayed the same error. This is the core real-room flow,
not an optional path. Directly reading the just-created room twenty times
provided fresh independent confirmation: **5 x 200 and 15 x 404**. The 404
body was `{"error":"That room is gone. Check the code or start a new one."}`.

The source uses a local SQLite file and in-process state. `.factory/container-app.json`
requires one replica, but this live evidence means the effective deployment is
still routing requests to isolated state stores (or otherwise failing the same
shared-state boundary). `/health` is candidate `5157…`, so this is not a stale
frontend result.

### P0 — live per-client server rate limits are not enforced

The source documents and tests a 40 request/second API allowance and 12 room
creations/60 seconds. Fresh live probes with one constant
`X-Forwarded-For` client value found:

| Endpoint and probe | Expected | Observed |
| --- | --- | --- |
| `POST /api/demo`, 100 concurrent requests | 429 after 40, `Retry-After: 1` | **100 x 200**, no `Retry-After` |
| `POST /api/rooms`, 13 concurrent requests | 13th 429, `Retry-After: 60` | **13 x 200**, no `Retry-After` |

This violates the mandatory backend-service contract. It is consistent with
the observed multi-instance/local-limiter failure and is independently release
blocking.

## Required repair and re-verification

1. Make room and rate-limit state genuinely shared, or prove the actual deployed
   revision is pinned to exactly one running replica and stays that way.
2. Repeat a live host + independent phone join/start/draw test. Re-read the new
   room at least 20 times; every read and host update must be 200.
3. With one client, prove request 41 to `/api/demo` gets 429 with
   `Retry-After: 1`, and room creation 13 gets 429 with `Retry-After: 60`.
4. Do not accept this candidate based on local tests alone: they use one process
   and therefore cannot detect this deployment topology failure.

## Passed evidence

### Claim contract (run individually from a clean `npm ci` install)

All seven declared commands passed through the browser demo entry point:

- `@claim:demo-sandbox`
- `@claim:demo-real-room-isolation`
- `@claim:offline-reload`
- `@claim:same-origin-requests`
- `@claim:remote-controls`
- `@claim:shared-phone`
- `@claim:family-pack-price`

No `claims.json` problem or failing claim test was found.

### Local quality checks

- `npm ci`: success; 94 packages, 0 reported vulnerabilities.
- `npm test`: 4 Vitest and 10 Rust tests passed.
- `npm run check`: TypeScript and Cargo checks passed.
- `npm run test:browser`: passed, including local normal host/phone draw,
  shared-phone, boundary/rate, privacy, offline, keyboard, desktop/mobile,
  Axe, and 404 checks.
- Candidate production frontend build with
  `VITE_BUILD_ID=5157efcc7ca6d9888b29af942ba1cb2a8876a870 npm run build`:
  JS 53.68 KB raw / 19.45 KB gzip; CSS 17.41 KB raw / 4.89 KB gzip; hero
  106 KB. These are within the declared static budgets.
- The exact candidate static JavaScript hash matched live byte-for-byte:
  `5389a73f29f98853a56298ae1e0be29b2a6c91af38990c02fd6abe3d97a57757`.
- `https://living-room-lobby.sociobot.in/health` returned
  `{"build":"5157efcc7ca6d9888b29af942ba1cb2a8876a870","status":"ok"}`.

### Live UX, privacy, PWA, and headers

- Cold desktop and 390 px mobile pages: one `h1`, one `main`, no horizontal
  overflow on mobile, visible skip-link focus, no console/page errors.
- Playwright Axe WCAG 2 A/AA/2.1 A/AA: zero violations on desktop and 390 px;
  therefore zero serious/critical findings.
- Reduced-motion context exposed a `0.00001s` transition on the hero, rather
  than normal animation.
- Whole-page outgoing request logs for desktop and mobile contained only
  `https://living-room-lobby.sociobot.in`.
- Live `/demo` registered `/sw.js` with the candidate-named cache
  `living-room-lobby-5157efcc7ca6d9888b29af942ba1cb2a8876a870`; after first
  load, offline reload kept the ready Draw Together room and demo banner.
- Shell, assets, service worker, API, health, and 404 responses had CSP,
  HSTS, `nosniff`, frame denial, strict referrer policy, permissions policy,
  and intended cache headers. Hashed JS was immutable; shell/SW revalidated.
- `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, and
  manifest returned 200; arbitrary URL returned the designed 404 status/page.

## Build limitation

The Dockerfile was inspected and has the required multi-stage/non-root/PORT
shape, but this verifier container has no `docker` executable, so an actual
local Docker image build could not be run. The candidate-specific Vite build
and `BUILD_SHA=5157… cargo build --release --locked` both passed instead.
