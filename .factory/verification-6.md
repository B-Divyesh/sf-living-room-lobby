# Independent verification 6 — FAIL

**Candidate:** `f00f2259cdd871f0683cf9978f535a8339cc8094`  
**Live URL:** https://living-room-lobby.sociobot.in  
**Verified:** 2026-08-30

## Verdict

**FAIL — the live deployment is not the requested candidate.** A cold live
`GET /health` returned:

```json
{"build":"3cb790fb647e2b32b9b043c8266d50dd106e45d4","status":"ok"}
```

The candidate checked out and tested locally is
`f00f2259cdd871f0683cf9978f535a8339cc8094`. The live service worker likewise
uses cache `living-room-lobby-3cb790fb647e2b32b9b043c8266d50dd106e45d4`.
This is fresh, direct evidence that the candidate has not been deployed, so
the release cannot be accepted as this candidate even though the older live
revision behaved correctly in the exercised flows.

## Release-blocking defect

### P0 — requested candidate is absent from production

`/health` and the installed service-worker cache both identify `3cb790f…`,
not `f00f225…`. Build identity is the product's authoritative deployed-revision
mechanism; a verifier cannot confirm a candidate whose backend and cached shell
identify another commit. Deploy the exact candidate with `BUILD_SHA` set to
`f00f2259cdd871f0683cf9978f535a8339cc8094`, then repeat the health and cold
service-worker identity checks.

## Required claim contract — PASS

From the clean candidate checkout, after `npm ci` (94 packages, 0 reported
vulnerabilities), every command in `.factory/claims.json` passed independently
through the demo entry point:

| Claim | Exact test | Result |
| --- | --- | --- |
| demo-sandbox | `npm run test:browser -- --grep @claim:demo-sandbox` | PASS |
| demo-real-room-isolation | `npm run test:browser -- --grep @claim:demo-real-room-isolation` | PASS |
| offline-reload | `npm run test:browser -- --grep @claim:offline-reload` | PASS |
| same-origin-requests | `npm run test:browser -- --grep @claim:same-origin-requests` | PASS |
| remote-controls | `npm run test:browser -- --grep @claim:remote-controls` | PASS |
| shared-phone | `npm run test:browser -- --grep @claim:shared-phone` | PASS |
| family-pack-price | `npm run test:browser -- --grep @claim:family-pack-price` | PASS |

## Local candidate verification — PASS

- `npm test`: 4 Vitest and 12 Rust tests passed.
- `npm run check`: TypeScript and Cargo checks passed.
- `npm run build`: passed and produced `dist/`. Initial assets: JavaScript
  53.64 KB raw / 19.72 KB gzip; CSS 17.41 KB raw / 4.89 KB gzip.
- `cargo fmt --all -- --check` and
  `cargo clippy --all-targets --locked -- -D warnings`: passed.
- `npm run test:browser`: passed. It covers the host/phone Draw Together flow,
  shared-phone flow, 390 px mobile, keyboard/D-pad movement, privacy request
  capture, demo isolation, designed 404, offline reload, Axe scans, and both
  documented rate limits.
- No Docker executable is available in this verifier container, so a local
  container-image build could not be run. The repository's exact frontend
  production build and backend browser entry point did pass.

## Fresh live evidence (older deployed revision only)

### First read — PASS

A cold page plainly says **“Party games for one shared TV”** and **“For
families sharing one TV…”**. Its visible first action is **“Try it with sample
data”**, accompanied by **“See a ready Draw Together round with three sample
families.”** It opens `/demo` in one click. Thus the first screen tells a new
visitor what it does, who it is for, and what to click first, and supplies the
required one-click sample demo.

### Product, recovery, accessibility, and privacy — PASS

- Live desktop and 390 px mobile `/demo`: one `main`, one `h1`, no horizontal
  overflow, no console/page errors, and zero Axe WCAG 2 A/AA/2.1 A/AA
  violations (therefore zero serious/critical findings). A reduced-motion
  context was used for those checks.
- Request capture over landing and demo flows contained only
  `https://living-room-lobby.sociobot.in`; no third-party request was observed.
- A new real room `SMUW` was read 20/20 times with status 200 from an
  independent 390 px context, and that context joined successfully as shared
  phone participant `Live QA`.
- Invalid room code `ZZZZ` recovers with the live, polite error: “That room is
  gone. Check the code or start a new one.”
- Per-client backend allowance is enforced live: 41 simultaneous
  `POST /api/demo` requests yielded 40 x 200 and 1 x 429 with `Retry-After: 1`;
  13 simultaneous `POST /api/rooms` requests yielded 12 x 200 and 1 x 429
  with `Retry-After: 60`.
- A fresh mobile context installed the worker, went offline, and reloaded
  `/demo` showing `✎ DRAW TOGETHER` and its demo banner without errors.

### Headers, routes, cache, and budget — PASS on the old revision

- `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, and
  `/manifest.webmanifest` returned 200. An arbitrary missing route returned a
  designed 404 page.
- Shell and health responses supplied CSP with response-header
  `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options: nosniff`, frame
  denial, strict referrer policy, permissions policy, and `no-cache,
  must-revalidate` shell caching. `/health` and API responses are `no-store`.
  The content-addressed live JS asset is `public, max-age=31536000, immutable`.
- The observed initial JavaScript and CSS gzip sizes are within the 200 KB JS
  and 50 KB CSS static budgets.

## Re-verification gate

Do not relabel this report PASS based on the healthy old service. First roll
out `f00f225…`; then a cold `/health` response and a newly installed service
worker cache must both name that exact SHA. Re-run the claim contract and
live rate-limit/room checks after the rollout.
