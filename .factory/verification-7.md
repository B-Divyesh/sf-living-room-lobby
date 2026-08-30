# Independent verification 7 — FAIL

**Candidate:** `6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`  
**Live URL:** https://living-room-lobby.sociobot.in  
**Verified:** 2026-08-30

## Verdict

**FAIL — the deployed candidate works, but it violates the mandatory claims
contract.** The live landing page makes visitor-facing claims that have no
corresponding entry and observable test in `.factory/claims.json`. The claims
acceptance rule explicitly makes any such unlisted claim a release failure.

The deployment identity itself is correct: a fresh `GET /health` returned
`{"build":"6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7","status":"ok"}`, and a
fresh browser installed service-worker cache
`living-room-lobby-6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`.

## Defects

### P1 — unlisted visitor-facing claims (release-blocking)

The following current landing-page promises are not represented in
`.factory/claims.json`, and therefore have no claim-tagged demo-entry test:

- “Try the sample without an account.”
- “Free games stay free.”
- The displayed capacity promises: “2–10 players” for Draw Together and Point
  Panic, and “3–12 players” for Pass & Guess (and the two Family Pack games).

The first is one of the required three first-screen facts. The capacity labels
are quantitative product promises. Existing `demo-sandbox`, `shared-phone`,
and `family-pack-price` tests do not assert accountlessness, enduring free-tier
availability, or those player-count boundaries. Add one claim and exactly one
observable demo test per retained promise, or remove/reword the promise. This
is a contract failure even though the listed claims pass.

### P3 — invalid room-code recovery logs a browser console error

Submitting `ZZZZ` correctly shows the polite recovery message “That room is
gone. Check the code or start a new one.” However Chromium logs
`Failed to load resource: the server responded with a status of 404 ()` for
`POST /api/rooms/ZZZZ/join`. The 404 is expected and user recovery works, so
this is not the release decision; avoid treating an expected invalid-input path
as a console error if a clean action-level console is required.

## Required claim contract — PASS for every listed claim

From the clean candidate checkout, after `npm ci` (94 packages; 0 reported
vulnerabilities), each exact command from `.factory/claims.json` passed
independently through the demo entry point:

| Claim | Exact command | Result |
| --- | --- | --- |
| demo-sandbox | `npm run test:browser -- --grep @claim:demo-sandbox` | PASS |
| demo-real-room-isolation | `npm run test:browser -- --grep @claim:demo-real-room-isolation` | PASS |
| offline-reload | `npm run test:browser -- --grep @claim:offline-reload` | PASS |
| same-origin-requests | `npm run test:browser -- --grep @claim:same-origin-requests` | PASS |
| remote-controls | `npm run test:browser -- --grep @claim:remote-controls` | PASS |
| shared-phone | `npm run test:browser -- --grep @claim:shared-phone` | PASS |
| family-pack-price | `npm run test:browser -- --grep @claim:family-pack-price` | PASS |

## Local candidate verification — PASS

- `npm test`: 4 Vitest tests, 4 release-delivery Node tests, and 17 Rust unit/
  integration tests passed.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run build` passed and produced `dist/`: JS 53.64 KB raw / 19.72 KB gzip;
  CSS 17.41 KB raw / 4.89 KB gzip.
- `npm run test:browser` passed. It exercises the local production build,
  390 px layout, host/phone Draw Together, shared-phone play, keyboard/D-pad,
  room reads, demo isolation, offline reload, privacy capture, Axe, styled
  404, and both rate-limit paths.
- `LICENSE` is MIT. `/privacy` and `/terms` are present. No `docker` executable
  or repository `verify-url.sh` is available in this verification environment;
  the exact frontend production build and backend binary/browser suite passed.

## Fresh live verification — PASS except defects above

### First read

Cold live first screen says **“Party games for one shared TV”** and **“Play
together on your TV.”** It says it is for families sharing one TV where kids
and relatives need not all have a phone. The visible first action is **“Try it
with sample data”**, with the immediate result “See a ready Draw Together round
with three sample families.” It opens `/demo` in one click. This answers what
it does, for whom, and what to click first in plain words, and meets the
one-click sample-demo requirement.

### End-to-end, input, privacy, and access

- A desktop host created live room `DNRQ`; a separate 390 px context joined as
  a shared-phone player. Keyboard Tab reached the skip link; ArrowRight moved
  host focus from Draw Together to Point Panic; Enter entered Draw Together
  with the TV canvas and phone draw pad. The room then entered Pass & Guess,
  including its Pass card. No page errors or console errors occurred in this
  normal flow.
- Invalid code recovery is described in P3 above.
- Fresh landing-to-demo request capture observed only
  `https://living-room-lobby.sociobot.in`; no third-party origin was requested.
  The demo received an isolated workspace via `POST /api/demo`, used only
  `demo:living-room-lobby:*` browser keys, and showed the “nothing is saved to
  a real room” banner.
- Axe WCAG 2 A/AA/2.1 A/AA scans had zero serious or critical findings on the
  desktop landing page and 390 px landing/demo pages. At 390 px there was no
  horizontal overflow, exactly one `main` and one `h1`, and the focused skip
  link had a visible moss `4px` outline. Reduced-motion media was active.
- In a fresh mobile context, after worker installation and switching offline,
  `/demo` reloaded with `DRAW TOGETHER` and its demo banner present.

### Server, headers, cache, and limits

- Health and service-worker identity match the exact candidate as stated in
  the verdict. `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`,
  `/sitemap.xml`, and `/manifest.webmanifest` returned 200; an arbitrary route
  returned the designed 404 page.
- Shell responses use `no-cache, must-revalidate`; health/API use `no-store`.
  The live hashed JS and CSS use `public, max-age=31536000, immutable`.
  Measured live assets are 53,681 B JS / 19,426 B gzip and 17,411 B CSS /
  4,875 B gzip, within the stated budgets.
- Headers include CSP with response-header `frame-ancestors 'none'`, HSTS,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict referrer
  policy, and a restrictive permissions policy.
- Backend allowance is enforced for one live client: 41 simultaneous
  `POST /api/demo` requests returned **40 × 200 and 1 × 429** with
  `Retry-After: 1`; after the window reset, 13 `POST /api/rooms` requests
  returned **12 × 200 and 1 × 429** with `Retry-After: 60`.

## Re-verification gate

Add testable entries to `.factory/claims.json` for every retained promise
listed under P1, with each test starting at the demo entry point and asserting
the stated observable outcome. Then rerun all claim commands and this live
verification. No deployment repair is needed: live build and service-worker
identity already match `6d6f41f…`.
