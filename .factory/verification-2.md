# Independent verification 2 — FAIL

**Work order:** `living-room-lobby-verify-2`

**Candidate:** `ea84f3d9c78937a11447e7b7f8d35291f2f2f4c7` (clean `main`)

**Live URL:** https://living-room-lobby.sociobot.in

**Verified:** 2026-08-28 UTC

## Verdict

**FAIL.** The deployment-only failure from the prior report is repaired: live
`/health` reports the exact candidate SHA, and the candidate's built HTML, JS,
CSS, hero image, and release-versioned service worker are byte-identical to the
live responses. The smallest useful product also works end to end.

The candidate nevertheless misses the acceptance contract on fresh evidence:

1. Axe 4.13 reports a **serious** keyboard-access violation on the 390 px home
   page because the horizontally scrollable game strip is neither focusable nor
   contains focusable controls.
2. Axe reports a second **serious** ARIA violation in the core Point Panic host
   screen because `aria-label="Target"` is applied to a roleless `span`.
3. A cold offline reload renders an empty application and produces CSS/module
   MIME errors. The service worker precaches only HTML/legal routes and the hero,
   not the hashed JS/CSS, then incorrectly falls back to HTML for asset requests.

The definition of done explicitly requires no serious/critical Axe findings and
a functional offline state, so these are release-blocking even though the normal
online room flow is healthy.

## Clean build and repository gates

The tracked checkout was clean and `HEAD` was the candidate before testing.
Environment: Node 22.23.2, npm 10.9.8, Rust/Cargo 1.98.0, Playwright 1.58.2,
Chrome for Testing 145.0.7632.6, and Lighthouse 12.8.2.

- `npm ci`: passed; 94 packages installed, 0 vulnerabilities.
- `npm test`: passed; 4 Vitest tests and 6 Rust tests.
- `npm run check`: passed; strict TypeScript and `cargo check`.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --all-targets --locked -- -D warnings`: passed.
- Exact frontend build:
  `VITE_BUILD_ID=ea84f3d9c78937a11447e7b7f8d35291f2f2f4c7 npm run build` passed and
  produced `dist/`.
- Exact backend build:
  `BUILD_SHA=ea84f3d9c78937a11447e7b7f8d35291f2f2f4c7 cargo build --release --locked`
  passed.
- The release binary was started from a fresh temporary working directory with
  only `PORT=18080`; it created its SQLite database and returned the exact SHA
  from `/health`. SIGINT shutdown completed cleanly.
- Docker, Podman, Buildah, and nerdctl are unavailable in this verifier, so the
  final image could not be assembled locally. Both locked Dockerfile build-stage
  commands and the final runtime contract were exercised independently. The
  Dockerfile is multi-stage, does not read `.git`, and declares a non-root user.

Production output and budgets:

| Asset | Raw | Gzip where reported | Budget |
| --- | ---: | ---: | ---: |
| JS | 47,607 B | 17.82 KB | ≤ 200 KB |
| CSS | 16,134 B | 4.60 KB | ≤ 50 KB |
| Hero WebP | 108,076 B | n/a | ≤ 300 KB |

The source map is not requested on initial load. No hosted font, third-party
script, analytics, or tracking request was observed.

## Deployment identity and response policy

Fresh live evidence at verification time:

- `/health`: HTTP 200,
  `{"build":"ea84f3d9c78937a11447e7b7f8d35291f2f2f4c7","status":"ok"}`,
  `Cache-Control: no-store`.
- HTTP redirects to HTTPS with 301.
- Root HTML and `sw.js`: `no-cache, must-revalidate`; a conditional root request
  returned 304.
- Hashed JS/CSS: `public, max-age=31536000, immutable`.
- Non-hashed hero: `public, max-age=3600, must-revalidate`.
- All checked responses include CSP, HSTS, Permissions-Policy,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a strict
  referrer policy. No cookie is set on first load.
- CSP permits only the product origin plus the documented Sociobot production
  and pilot license endpoints; there are no payment-provider integrations in
  the product.

Candidate/live SHA-256 matches:

| File | SHA-256 |
| --- | --- |
| `index.html` | `c416061ccd4295fb05fde9f6ddc02579d54053eb1c21bd20d88d92c4b965ed2e` |
| `assets/index-D9xQORDg.js` | `4bd93a8061d978fef345615663f4b92b4d8bf3e53b907c87a35767a8ea7888c5` |
| `assets/index-DXC0ml7y.css` | `edfddcb3dfaea77073f717fa057b8355c133c6a0e2de7ee67fafcaf695604785` |
| `assets/lobby-hero.webp` | `35f2d442b490c5ca01ebc8238901f8b3f5c5756af3eba2e134cc35a3d2129c2d` |
| `sw.js` | `40b28436ab5a3f94e510a776efccd3f3d71d5c0c60a04b2ac7c351381a639b40` |

This proves that both the frontend and backend deployed at the tested URL match
the candidate. The previous build-identity failure is not present.

## End-to-end product exercise

Playwright exercised the live site at 1440×900 and in a touch-enabled 390×844
context:

- Created a room from the UI, joined through `/?join=<code>` as the shared-phone
  family “QA Family,” and confirmed the host showed `↻ sharing`.
- **Draw together:** a mobile pointer stroke posted 11 points and appeared in
  public room state for the TV canvas.
- **Point Panic:** 14 repeated Up presses exercised the aim boundary; Point gave
  the visible recovery/result message “So close — aim for the moss ring.”
- **Pass & Guess:** Pass covered the clue, “I have it” revealed the next clue,
  and “Got it +1” returned to the pass screen and raised the shared player's
  server score to 1.
- Attempting a locked Family Pack game produced the clear `$12 one-time` notice.
- A nonexistent room code produced “That room is gone. Check the code or start
  a new one.” in the bound live error region.
- Mobile pages had one h1 and no body-level horizontal overflow. Desktop and
  mobile screenshots showed no clipping of primary controls.
- Keyboard-only smoke passed: first Tab showed the skip link with a 4 px visible
  moss outline; after activation, the next Tab landed on “Start on this screen.”
  Enter created a room; ArrowRight focused Draw; Enter started it; ArrowRight
  then focused “Back to games,” and Enter returned to the lobby.
- Reduced-motion emulation produced no hero transform, `scroll-behavior: auto`,
  and a 0.00001 s control transition.
- Clean landing, privacy, terms, core game, and offline-warm-load checks produced
  no unexpected console or page errors. The deliberate invalid-room 404 is the
  only browser console network error in the combined negative-path run.

API boundary and recovery evidence against the rebuilt release binary:

- A 20-character name was accepted; empty and 21-character names were rejected
  with the documented 400. Invalid modes, stages, games, and actions
  returned clear 400 JSON; bad host/player tokens returned 401.
- Coordinates `(-900, 900)` were clamped to `(0, 100)`; an 80-character prompt
  was truncated to 60; round 1000 was clamped to 99; 81 drawing points were
  rejected. Malformed JSON returned 400.
- The first 12 players joined and the 13th was rejected. A join after play began
  was rejected with a recovery message.
- Public room snapshots contained neither host nor player tokens.
- Room state survived a clean process restart. After its timestamp was moved to
  21,601 seconds old, the room returned 404 and the next room creation removed
  its row, confirming the six-hour persistence boundary.
- 100 concurrent local room creations completed in 958 ms with 100 HTTP 200s,
  100 unique codes, and 100 correctly sized host tokens.
- Local rate-limit boundary passed: requests 1–12 returned 200, request 13
  returned 429 with `Retry-After: 60`, and a separate client bucket remained
  available.

## Accessibility

Passes:

- Title, `lang=en`, one h1 per exercised screen, one main landmark, labelled
  forms, meaningful hero alt text, no missing image alt, keyboard game control,
  designed focus, and reduced motion were confirmed.
- Axe WCAG 2 A/AA found 0 violations on desktop home, host lobby, host Draw,
  host Pass, shared-phone lobby, phone Draw, phone Point, phone Pass, Privacy,
  and Terms.
- Lighthouse mobile accessibility scored 100, but its single landing-page audit
  did not detect the two state/viewport-specific Axe failures below.

Failures:

- At 390 px, Axe 4.13 reports `scrollable-region-focusable` (serious, WCAG
  2.1.1/2.1.3) on `.game-strip`: “Element should have focusable content” or be
  focusable. Keyboard users cannot horizontally scroll to all catalogue cards.
- On the host Point Panic screen, Axe reports `aria-prohibited-attr` (serious,
  WCAG 4.1.2) on `.target`: `aria-label` is prohibited on the roleless `span`.
- Visible mobile hit areas below the product's 44×44 px requirement include the
  home wordmark (185×36), Privacy (42×15), and Terms (35×15).

## Performance

Fresh Lighthouse mobile results against the live URL:

| Category / metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1,201 ms |
| LCP | 1,201 ms |
| TBT | 0 ms |
| CLS | 0 |

Lighthouse had no interaction sample, so INP is unavailable. The separate Axe
state/viewport scans above are authoritative for the serious findings.

## Privacy, licensing, and PWA

- A fresh standard visit made requests only to
  `living-room-lobby.sociobot.in`, set no cookies, and left local/session storage
  empty. Privacy and Terms each rendered with one h1 and one main.
- Checkout points exactly to the Sociobot hosted endpoint. Invalid restore was
  sent only to the documented Sociobot verification endpoint, showed a recovery
  message, and removed the invalid token. A valid callback was stored, verified,
  and stripped from the URL. A fresh cached valid verdict unlocked without a
  network verification inside the one-day window.
- The active service worker and sole cache use the exact candidate SHA. A warm
  offline reload succeeded and showed “Offline practice.”
- A cold-cache check exposed the defect: after a fresh worker install, its cache
  contained only `/`, `/privacy`, `/terms`, and `/assets/lobby-hero.webp`.
  Clearing the ordinary HTTP cache and reloading offline left `#app` empty with
  zero h1s. The worker returned cached HTML for the missing CSS and JS, causing
  strict MIME errors for both resources.

## Defects

| Severity | Defect | Exact evidence / impact |
| --- | --- | --- |
| **High** | Two serious Axe failures in required responsive/core states. | Mobile `.game-strip` is not keyboard-scrollable (`scrollable-region-focusable`); Point Panic's target has invalid ARIA (`aria-prohibited-attr`). The acceptance contract requires zero serious/critical findings. |
| **Medium** | Cold offline reload is blank and emits two MIME errors. | The release cache omits hashed JS/CSS and the fetch fallback returns `/` HTML for asset requests. After clearing HTTP cache, offline reload had 0 h1s and an empty `#app`. |
| **Medium** | The intended 12/minute room-creation bound is replica-local in production. | Local request 13 returned 429 as tested. On live, a fresh same-client sequence accepted all first 13 and accepted 24 total before both apparent in-memory buckets were saturated. The limiter is stored in process-local `AppState`, so scaled deployment weakens the abuse boundary. |
| **Low** | Several visible mobile navigation targets miss the documented 44×44 px minimum. | Wordmark is 185×36; footer Privacy is 42×15 and Terms is 35×15 at 390 px. Primary game controls meet the target size. |

## Required next steps

1. Make the mobile game strip keyboard reachable/scrollable and give the Point
   Panic target a valid semantic role (or make it correctly decorative); rerun
   Axe on those exact states.
2. Include the content-hashed JS/CSS in the release shell cache and never use
   the HTML navigation fallback for script/style/image requests; repeat a cold
   HTTP-cache-cleared offline reload.
3. Move room-creation limiting to a shared deployment boundary or otherwise
   make the documented limit hold across replicas.
4. Increase the visible mobile header/footer link hit areas to 44×44 px.

Physical Samsung Tizen, LG webOS, Fire TV Silk, and real orientation hardware
were unavailable. Chromium mobile/desktop emulation and the Point Panic D-pad
fallback were exercised instead.
