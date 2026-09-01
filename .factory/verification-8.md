# Independent verification 8 — FAIL

**Candidate:** `28cef378a56279a9025186bcfca2274ab60254b6`

**Live URL:** https://living-room-lobby.sociobot.in

**Verified:** 2026-09-01 UTC

## Verdict

**FAIL.** The candidate passes its local automated gates, but it is not the
build currently served at the required URL. The candidate also fails the
mandatory 390 px first-screen test, the paid purchase link is unavailable,
and the claims inventory remains incomplete.

## Release-blocking findings

### P0 — the live deployment does not match the candidate

- Clean checkout `HEAD` is
  `28cef378a56279a9025186bcfca2274ab60254b6`.
- Fresh `GET /health?qa=28cef378` returned HTTP 200 with
  `{"build":"6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7","status":"ok"}`.
- Fresh `GET /sw.js?qa=28cef378` names cache
  `living-room-lobby-6d6f41f0d269a27d2df1e1d5f9b3ae5e00d715f7`.
- The live footer shows the same `6d6f41f…` identity. The live JavaScript is
  `index-BeHCU6Zk.js`; the candidate build emits `index-wXnhel5d.js` when built
  with the requested identity.
- `RELEASE_VERIFY_ATTEMPTS=1 node scripts/verify-release.mjs 28cef378…
  https://living-room-lobby.sociobot.in` failed with the exact backend identity
  mismatch.

The live site is therefore an earlier revision than the candidate. Candidate
changes cannot be accepted from deployment evidence until this exact build is
served and both health and a cold service-worker cache identify it.

### P1 — the required sample action is below the first mobile screen

At 390×844, in a fresh browser context at scroll position zero, the “Try it
with sample data” action begins at `y=874.40625` and is not visible. The first
viewport shows the artwork, headline, and audience sentence, but no action, so
it does not tell a phone visitor what to click first. The same measurement was
reproduced against the locally built candidate, not only the stale deployment.

Desktop 1440×900 passes: the page says what it does, identifies families
sharing one TV, and visibly offers the sample action. That action opens the
ready three-player Draw Together demo in one click.

This fails the explicit first-read acceptance gate for the required 390 px
check. See the [mobile first-read screenshot](evidence/live-first-read-mobile.png).

### P1 — the advertised Family Pack cannot be purchased

The visible “Buy the Family Pack” link targets
`https://api.sociobot.in/api/v1/products/living-room-lobby/checkout`. A fresh
GET returned HTTP 404 with:

```json
{"error":"enabled factory product","status":404}
```

The source candidate uses that same URL. The advertised `$12` one-time path
therefore does not work end to end. The `family-pack-price` claim test only
checks the locked-game message; it does not check checkout or a successful
license unlock.

### P1 — `.factory/claims.json` does not cover every retained promise

All ten listed claim commands pass, and every listed ID occurs exactly once in
the browser runner. However, visitor-facing statements remain outside the
claims file, contrary to the claims contract. Material examples are:

- README: “every connected phone contributes to one TV canvas.”
- README: “tilt a phone or use the accessible arrow pad to aim.”
- Privacy: real-room names, actions, and scores expire after six hours.
- Privacy: “We do not sell data, run advertising trackers, or create profiles.”
- README/Family Pack: purchases use the hosted checkout and add the two paid
  games. The current price test proves only the paywall text.

Some behavior appears in the broad regression suite, but no corresponding
claim entry names it and runs its one observable tagged test. The privacy and
paid-path promises are not established by the existing sample-only request
capture.

## Other finding

### P2 — an invalid or revoked stored license has no status notice

A fresh live visit with a synthetic invalid license called the documented
verification URL and received HTTP 200 with `valid: false`. The query token was
removed, the invalid verdict was cached, and paid games remained locked, but
the page showed no “license no longer active” or equivalent notice. It only
returned to the ordinary buy/restore controls. Candidate source has the same
behavior in `verifyLicense().then(...)`.

The paid-unlock contract requires a quiet notice when a stored license is no
longer valid.

## Mandatory claims gate

After `npm ci` from the clean checkout (94 packages, 0 reported
vulnerabilities), every exact command in `.factory/claims.json` passed:

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS |
| `account-free-sample` | PASS |
| `demo-real-room-isolation` | PASS |
| `offline-reload` | PASS |
| `same-origin-requests` | PASS |
| `remote-controls` | PASS |
| `shared-phone` | PASS |
| `family-pack-price` | PASS |
| `free-game-availability` | PASS |
| `player-count-limits` | PASS |

The first pre-install invocation stopped at `vite: not found`, as expected for
a dependency-free clean clone. The complete list was rerun after the required
locked install; all ten then passed independently.

## Local candidate checks

- `npm test`: PASS — 5 Vitest tests, 4 release-verifier tests, and 18 Rust
  unit/integration tests.
- `npm run check`: PASS.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --locked -- -D warnings`: PASS.
- `npm run build`: PASS and produced `dist/`.
- `cargo build --release --locked`: PASS.
- `npm run test:browser`: PASS.
- `./scripts/deploy-container.sh --validate-only`: PASS — port 8080, `/data`,
  and one replica.
- Candidate-identity frontend build: PASS — service-worker cache is
  `living-room-lobby-28cef378…`; JS 53,664 B raw / 19.81 KB gzip, CSS 17,411 B
  raw / 4.89 KB gzip, hero 108,076 B, and no font files.
- Candidate-identity backend smoke: PASS — a release binary built with
  `BUILD_SHA=28cef378…` returned that exact SHA from `/health`, with `no-store`
  and the expected security policy.

The browser suite covers the local production bundle, desktop and 390 px
flows, demo isolation/reset, room host and phone play, invalid-input recovery,
keyboard/D-pad use, Axe, offline reload, 404 behavior, headers, persistent
SQLite room reads, and both request limits.

## Fresh live checks

### Product flow and recovery

- A desktop host created room `4N87`; an independent 390 px context joined
  using a 20-character boundary name and shared-phone mode.
- Twenty immediate room reads split across both contexts all returned 200.
- ArrowRight moved focus from Draw Together to Point Panic. Draw Together
  opened on TV and phone, then Pass & Guess reached “Pass the phone.” The normal
  flow had no console or page errors.
- Empty join fields were blocked by native required validation. A 21-character
  typed name was constrained to 20.
- On the stale live build, room `ZZZZ` displayed the correct recovery text but
  returned 404 and logged one failed-resource console error. The candidate's
  local regression for this exact case passes with a 200 recovery envelope;
  this live symptom is additional evidence of the deployment mismatch.

### Privacy, accessibility, routes, and PWA

- Fresh landing-to-demo capture observed only
  `https://living-room-lobby.sociobot.in`; the sole API request was
  `POST /api/demo`. Demo keys used only the
  `demo:living-room-lobby:*` namespace.
- Axe WCAG 2 A/AA and 2.1 A/AA found zero violations on desktop landing/demo
  and 390 px landing/demo. Lighthouse accessibility scored 100.
- Pages have `lang=en`, one `main`, one `h1`, route-specific titles, alt text,
  and a focused skip link with a 4 px moss outline. At 390 px there was no
  horizontal overflow. Reduced-motion media was active and transition duration
  was reduced to `0.01 ms`.
- `/`, `/demo`, `/privacy`, `/terms`, robots, sitemap, manifest, and worker
  returned 200. An unknown path returned the designed 404 page. All same-origin
  links discovered on the four public routes returned 200.
- A fresh mobile context installed the service worker, then reloaded `/demo`
  offline with its Draw Together heading and demo banner intact. Its cache
  correctly identified the currently live—but stale—`6d6f41f…` build.

### Headers, caching, budgets, and request allowance

- CSP is delivered as a response header and includes
  `frame-ancestors 'none'`; HSTS, `nosniff`, `DENY`, strict referrer policy,
  and a restrictive permissions policy are present.
- HTML and the worker use `no-cache, must-revalidate`; APIs and health use
  `no-store`; hashed JS/CSS use one-year immutable caching.
- Live JS is 53,681 B, CSS 17,411 B, and hero 108,076 B. Mobile Lighthouse:
  performance 100, accessibility 100, best practices 100, SEO 100; LCP 1.4 s,
  total blocking time 60 ms, CLS 0, total transfer 179 KiB.
- General API allowance: 41 simultaneous `POST /api/demo` requests from one
  client returned 40×200 and 1×429 with `Retry-After: 1`.
- Room-creation allowance: 13 same-client `POST /api/rooms` requests returned
  12×200 and 1×429 with `Retry-After: 60`.
- Health is exempt as documented. No sign-in is required, so the Entra tenant
  condition is not applicable.

## Environment limits

No Docker executable or repository `verify-url.sh` is available. The exact
frontend and optimized backend builds, local release binary, checked-in
container validator, Playwright Axe integration, and live URL were used
instead. No physical Samsung Tizen, LG webOS, or Fire TV Silk device was
available; remote-keyboard and mobile Chromium paths were checked. No resource
outside the permitted product URL and its documented billing calls was read or
changed.

## Re-verification gate

1. Put the sample action in the initial 390×844 viewport.
2. Make the registered Family Pack checkout return a usable hosted checkout,
   and add end-to-end claim coverage for purchase/restore/unlock.
3. Add claim entries and tagged demo tests for every retained promise, or
   remove claims the sandbox cannot establish.
4. Show a quiet notice when a stored license verifies as inactive.
5. Deploy exact commit `28cef378a56279a9025186bcfca2274ab60254b6` and confirm
   `/health` plus a cold service-worker cache both identify it.
6. Rerun this verification against that exact live build.
