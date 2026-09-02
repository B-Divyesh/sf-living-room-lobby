# Independent verification 15

**Result: PASS — candidate is ready for release.**

Tested candidate: `5aa0299dc151b2ee16ac10be6f2e07be20a7bfd2`

Tested URL: `https://living-room-lobby.sociobot.in`

Date: 2 September 2026 UTC

## First read

PASS. On a cold 1440×900 visit, the first screen says **“Play together on
your TV.”** It identifies families sharing one TV, including kids and
relatives who do not each need a phone. The primary action is **“Try it with
sample data”**, and the adjacent sentence says it opens a ready Draw Together
round with three sample players. The action is also visible without scrolling
at 390×844. One click opens the ready sample and its persistent **“Demo —
sample data, nothing is saved to a real room”** banner.

Evidence: `evidence-15/live-first-read-desktop.png`,
`evidence-15/live-mobile-390.png`, and
`evidence-15/live-independent.json`.

## Candidate and deployment identity

PASS. The checkout HEAD is the requested candidate. A fresh public `/health`
response reports that full SHA. The public footer and service worker report
the same SHA, and the cold worker cache is
`living-room-lobby-5aa0299dc151b2ee16ac10be6f2e07be20a7bfd2`.

An exact candidate frontend build emitted `/assets/index-D7uU5jl5.js` and
`/assets/index-B2lU5tGs.css`. Each file was byte-for-byte identical to the live
asset:

- JavaScript SHA-256:
  `8c8600e715857e01e3294c0a5a45b4da3644f30896bf325533c29898b459a81e`
- CSS SHA-256:
  `da5b8ebbb872954209fa95fc972eee7089174c4db753e7b75634cd75ac4a7f77`

The repository live release gate also passed and retained a shared-phone
player after host and phone reloads.

## Mandatory claim tests

PASS. `.factory/claims.json` exists with 20 entries. After the required clean
`npm ci`, every literal command in the manifest passed through the demo or its
isolated Rust fixture. Passed IDs:

`shared-tv-phone-round`, `join-code-path`, `language-light-round`,
`art-provenance`, `demo-sandbox`, `account-free-sample`,
`demo-real-room-isolation`, `offline-reload`, `same-origin-requests`,
`remote-controls`, `shared-phone`, `family-pack-unavailable`,
`free-game-availability`, `player-count-limits`, `shared-tv-canvas`,
`point-controls`, `room-retention`, `no-advertising-or-analytics`,
`minimal-join-data`, and `license-status`.

Evidence: `evidence-15/claims-rerun.log` ends with `CLAIM_FAILURES 0`.
Landing and README claims are represented in the manifest; no unlisted
visitor-facing claim was found.

## Local candidate gates

| Check | Result |
| --- | --- |
| Clean install | PASS — `npm ci`, 94 packages, 0 vulnerabilities reported. |
| Unit/integration/contract tests | PASS — `npm test`: 6 Vitest, 10 Node, and 21 Rust tests. |
| Type and Rust checks | PASS — `npm run check`. |
| Format and lint | PASS — `cargo fmt --all -- --check`; Clippy with warnings denied. |
| Deployment validation | PASS — Dockerfile/port/data/replica contract accepted. |
| Frontend production build | PASS — `VITE_BUILD_ID=<candidate> npm run build`; `dist/` created. |
| Backend production build | PASS — `BUILD_SHA=<candidate> cargo build --release --locked`. |
| Full browser suite | PASS — `npm run test:browser`. |
| Live release gate | PASS — `npm run test:live -- <candidate> <URL>`. |

Docker is not installed in the verifier container, so a local image assembly
was unavailable. Both Dockerfile build stages were run directly with the exact
build identity, deployment configuration validation passed, and the deployed
artifact matched those candidate frontend bytes and backend identity.

## Independent product flow and recovery

PASS.

- A 390 px shared-phone player joined a newly created TV room. A second player
  joined, the host selected Spanish, and Draw Together showed Spanish
  instructions. Host and phone retained the same room after reload.
- A separate room accepted players 1 through 12 and rejected player 13 with a
  clear `400` capacity response.
- A 21-character name and unknown play mode returned `400`; a wrong host token
  returned `401`; an absent room returned `404`.
- The visible mistyped-code flow announced “That room is gone. Check the code
  or start a new one.” through `aria-live="polite"` without a console error.
- Twenty simultaneous reads of one room all returned `200` with the same
  durable state.
- The demo used only `demo:` browser storage, sent no account credential, and
  did not call a real-room endpoint.

Evidence: `evidence-15/live-independent.json`,
`evidence-15/live-invalid-recovery.json`, and screenshots in
`evidence-15/`.

## Backend limits, persistence, and load

PASS.

- General API allowance observed live: **40 requests per second per client**.
  A 45-request concurrent `POST /api/demo` burst returned 40 × `200` then
  5 × `429`; every `429` included `Retry-After: 1`.
- Stricter room-creation allowance observed live: **12 rooms per minute per
  client**. A 13-request `POST /api/rooms` burst returned 12 × `200` and
  1 × `429` with `Retry-After: 60`.
- Source routing and passing Rust integration coverage apply the general
  limiter to every `/api/demo` and `/api/rooms` endpoint. `/health` is the
  documented exemption.
- A 100-request concurrent room-read smoke completed 100/100 successfully.
  The 100 requests completed in 5.07 s through the single-connection SQLite
  boundary. A separate 100 req/s health smoke sustained 111.8 requests/s,
  with 559/559 `200`, no errors/timeouts, and 73 ms p99 latency.
- Live browser reloads retained host/player room state. Rust integration tests
  passed for two app instances sharing one SQLite store, `/data` selection,
  migration-lock recovery, and six-hour expiry. The live service was not
  restarted because the verifier is not authorized to restart production.

Evidence: `evidence-15/live-create-rate-limit.json`,
`evidence-15/live-load-smoke.json`, and
`evidence-15/live-load-100rps.json`.

## Privacy and security

PASS. A full sample visit through two games and reset made only same-origin
requests: document, self-hosted image, hashed JS/CSS, and `POST /api/demo`.
No request carried an Authorization header, and there were no cookies,
analytics, advertising, third-party fonts, or third-party scripts.

Response headers include CSP with response-header `frame-ancestors 'none'`,
HSTS, `nosniff`, `X-Frame-Options: DENY`, strict-origin referrer policy, and a
restricted permissions policy. `/health` is `no-store`; the shell and worker
revalidate; hashed assets are immutable for one year.

Evidence: `evidence-15/live-request-log.json` and the `*.headers.txt` files.

## Accessibility, responsive behavior, and PWA

PASS.

- Independent Axe WCAG 2 A/AA scans on desktop landing, desktop demo, and
  390 px landing returned zero violations, including zero serious/critical.
- `/`, `/demo`, `/privacy`, `/terms`, and the styled 404 each have a route
  title, `lang=en`, exactly one h1, one main landmark, canonical URL,
  description, and social image.
- Keyboard Tab first reaches the skip link with a visible 4 px moss outline.
  ArrowRight moved focus from Draw Together to Point Panic; Enter opened the
  game. There was no keyboard trap or console error.
- At 390×844 there was no horizontal overflow and no visible interactive
  target below 44 px. The full browser suite also passed 200% text reflow.
- Reduced-motion mode reduced all transition/animation durations to 0.01 ms
  with no infinite animation.
- A fresh service worker update installed the candidate cache. After the
  browser went offline, `/demo` reloaded with Draw Together and the persistent
  sample-data banner intact.
- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, language, h1, main,
  alt text, button names, and zero console errors.

## Performance and assets

PASS. Candidate production output is 58,025 B JavaScript (21.23 kB gzip),
19,170 B CSS (5.29 kB gzip), and a 108,076 B hero image. These are below the
200/50/300 kB budgets. The image is self-hosted and its provenance is recorded
in `.factory/design.md`.

Mobile Lighthouse: performance 100, accessibility 100, best practices 100,
SEO 100; FCP 1.2 s, LCP 1.3 s, TBT 50 ms, CLS 0, speed index 1.2 s. The lab
run had no interaction, so Lighthouse did not report INP.

Evidence: `evidence-15/lighthouse-summary.json` and
`evidence-15/frontend-candidate-build.log`.

## Defects by severity

- Critical: none.
- High: none.
- Medium: none.
- Low: none.

## Coverage limits

Physical Samsung Tizen, LG webOS, Fire TV Silk, and device-orientation hardware
were unavailable. Chromium covered TV-sized display, remote/D-pad keys, 390 px
touch, the labelled arrow fallback, reduced motion, service-worker update, and
offline reload.
