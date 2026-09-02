# Independent verification 14

**Result: FAIL — do not release.**

Tested candidate: `46e5c90a59020178fa492c03a2ecb17209d7be34`  
Tested URL: `https://living-room-lobby.sociobot.in`  
Date: 2 September 2026 UTC

## Release-blocking finding

**Critical — the public deployment is not the candidate.** A fresh uncached
`GET /health` returned build `98b506e1632464092cdc4e9add8c3b33265c1d53`,
not `46e5c90a59020178fa492c03a2ecb17209d7be34`. A cold Playwright visit also
found `98b506e1632464092cdc4e9add8c3b33265c1d53` in the footer and its service
worker cache was `living-room-lobby-98b506e1632464092cdc4e9add8c3b33265c1d53`.
The deployed shell uses `/assets/index-BOEZBkgG.js`, while the candidate build
emits `/assets/index-B0SWWpbk.js`. Therefore the live evidence cannot approve
this candidate, even though the currently deployed older release is healthy.

Remediation: deploy the exact requested commit with `BUILD_SHA` set to the
full candidate SHA, then repeat exact-identity checks for `/health`, shell JS,
service-worker cache, and footer before requesting release verification.

## First read (cold live page)

PASS for the currently deployed release: the h1 is **“Play together on your
TV.”** The next sentence says it is for families sharing one TV, including
kids and relatives who do not each need a phone. The first action is **“Try it
with sample data”** and its adjacent text says it opens a ready Draw Together
round with three sample players. This is clear, plain, and has the required
one-click demo; it does not cure the deployment mismatch above.

## Required claim tests from the clean candidate

`.factory/claims.json` exists with 20 entries. After `npm ci`, every literal
test command listed there was run from this checkout through the product’s
demo/browser entry point. No command failed. A no-grep `npm run test:browser`
also completed the complete browser regression suite. Passed IDs:

`shared-tv-phone-round`, `join-code-path`, `language-light-round`,
`art-provenance`, `demo-sandbox`, `account-free-sample`,
`demo-real-room-isolation`, `offline-reload`, `same-origin-requests`,
`remote-controls`, `shared-phone`, `family-pack-unavailable`,
`free-game-availability`, `player-count-limits`, `shared-tv-canvas`,
`point-controls`, `room-retention`, `no-advertising-or-analytics`,
`minimal-join-data`, and `license-status`.

## Local candidate quality gates

| Check | Result |
| --- | --- |
| Clean dependency install | PASS — `npm ci`, 94 packages, 0 vulnerabilities reported. |
| Unit/integration/contract suite | PASS — `npm test`: 6 Vitest, 10 Node, 21 Rust tests. |
| Type/Rust checks | PASS — `npm run check`. |
| Format/lint | PASS — `cargo fmt --all -- --check`; `cargo clippy --all-targets --locked -- -D warnings`. |
| Production frontend build | PASS — `npm run build` produced `dist/`; JS 21.20 kB gzip and CSS 5.29 kB gzip. |
| Production backend build | PASS — `BUILD_SHA=46e5c90a59020178fa492c03a2ecb17209d7be34 cargo build --release --locked`. |
| Browser accessibility and functional suite | PASS — full `npm run test:browser`, which includes desktop/TV/390px, keyboard, demo isolation, offline, privacy, and Axe assertions. |

## Live QA observations (older deployment only)

- Desktop and 390×844 mobile: HTTP 200, no console or page errors, no mobile
  horizontal overflow. Tab first reaches the skip link with a designed 4 px
  `rgb(183, 212, 61)` outline. ArrowRight moves the focused nav action. With
  reduced motion, transition and animation durations were `0.00001s`.
- Axe Playwright WCAG 2 A/AA scans of `/demo` at desktop and 390 px reported
  zero violations, including zero serious/critical findings.
- A fresh `/demo` visit made only same-origin requests; the persistent banner
  says sample data is not saved to a real room. Once the service worker was
  ready, an offline reload retained Draw Together and the banner.
- Headers: CSP includes response-header `frame-ancestors 'none'`; HSTS,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict referrer
  policy, and permissions policy are present. `/health` is `no-store`; hashed
  JS is `public, max-age=31536000, immutable`; shell and worker revalidate.
- API allowance is enforced on the live old release: a single-client concurrent
  `POST /api/demo` burst returned 40 × 200 and then 5 × 429. Every 429 carried
  `Retry-After: 1`, so the observed allowance is 40 requests per second.

## Other findings

No additional serious or critical defects were found in the candidate’s local
testable surface. Physical Samsung Tizen, LG webOS, Fire TV Silk, and real
device orientation hardware were unavailable; Chromium covered TV-sized,
keyboard/D-pad, 390 px touch, labelled arrow-pad, reduced-motion, and offline
paths.
