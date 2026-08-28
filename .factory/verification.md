# Independent verification — FAIL

**Work order:** `living-room-lobby-verify-1`  
**Candidate checkout:** `6584c17961be85d4fa24aa970685a0cf39ad2d37` (clean `main`)  
**Live URL:** https://living-room-lobby.sociobot.in  
**Verified:** 2026-08-28

## Verdict

**FAIL.** The live application is functionally healthy and its public static
artifact is byte-identical to a fresh build of this checkout, but the required
backend build identity cannot identify the requested candidate: live
`/health` returns `8338bd8c9feb120e63c049486998bb259fc803ea`, not
`6584c17961be85d4fa24aa970685a0cf39ad2d37`.

This is not a transient HTTP failure. The candidate's Dockerfile hard-codes
that predecessor SHA as its default `BUILD_SHA`; rebuilding the backend with
that exact production-stage value returns the same predecessor identity.
Consequently it is impossible to use `/health` to confirm that the deployed
backend is candidate `6584c179…`, as required by this verification work order.

## Build and automated checks

- Clean install: `npm ci` passed; npm reported 0 vulnerabilities.
- `npm test` passed: 2 Vitest tests and 3 Rust tests.
- `npm run check` passed: strict TypeScript and `cargo check`.
- `cargo clippy --all-targets -- -D warnings` passed.
- `npm run build` passed. `dist/` contains 47,607 B JS (17,533 B gzip),
  16,134 B CSS (4,587 B gzip), and a 108,076 B WebP hero. All are inside the
  stated raw transfer budgets (200 KB JS, 50 KB CSS, 300 KB hero).
- `cargo build --release --locked` passed. A repeat with the Dockerfile's
  exact default value,
  `BUILD_SHA=8338bd8c9feb120e63c049486998bb259fc803ea cargo build --release --locked`,
  passed and returned that value from local `/health`.
- The exact Docker image could not be built because neither `docker` nor
  `podman` exists in this verifier container. Its two build stages were run
  with their locked production commands above.

## Live deployment and product exercise

Fresh public checks returned HTTP 200 for `/` and `/health`. The following
fresh-build files were byte-for-byte identical to the live responses:

| File | SHA-256 |
| --- | --- |
| `index.html` | `c416061ccd4295fb05fde9f6ddc02579d54053eb1c21bd20d88d92c4b965ed2e` |
| `assets/index-D9xQORDg.js` | `4bd93a8061d978fef345615663f4b92b4d8bf3e53b907c87a35767a8ea7888c5` |
| `assets/index-DXC0ml7y.css` | `edfddcb3dfaea77073f717fa057b8355c133c6a0e2de7ee67fafcaf695604785` |
| `assets/lobby-hero.webp` | `35f2d442b490c5ca01ebc8238901f8b3f5c5756af3eba2e134cc35a3d2129c2d` |
| `sw.js` | `e9aefd68a51505ffe927a799197e2a348cae69d1c4e7eda4bc1140c015532d26` |

Using Playwright Chromium 151 at 1440×900 and a touch-enabled 390×844
context, I created a room, joined it as a shared-phone family, verified the
host saw that participant, and exercised all three brief-critical free flows:

- Draw together: phone pointer input appeared on the TV canvas.
- Point panic: repeated D-pad-up boundary input remained usable and the
  Point action gave normal hit/miss feedback.
- Pass & guess: a shared-phone participant got the answer-covering “Pass the
  phone” screen and could recover to the next clue.

Malformed room-code submission produced the in-product recovery message
“That room is gone. Check the code or start a new one.” Empty/invalid name and
mode requests returned clear 400 JSON errors; bad host tokens returned 401;
an unknown action from a valid player returned 400.

Keyboard testing reached the skip link on first Tab and moved from Start to
Join with ArrowRight. The designed focus outline was visible. Reduced-motion
emulation produced `transform: none` on the hero and a `0.00001s` transition.
There were no desktop or mobile console/page errors. Axe WCAG 2 A/AA found 0
violations on the exercised host and shared-phone screens, including 0
serious/critical violations. Landing markup has a title, `lang=en`, one h1,
and a main landmark.

Mobile Lighthouse against the live URL: Performance 99, Accessibility 100,
Best Practices 100, SEO 100; LCP 1,352 ms, CLS 0, TBT 104 ms.

## Backend and privacy checks

- A release binary using a fresh temporary SQLite database created rooms,
  persisted a joined shared-phone player across a clean restart, and never
  exposed either host or player tokens in the public room snapshot.
- 100 simultaneous local `POST /api/rooms` requests completed with 100 unique
  room codes and 32-character host tokens. The service serializes writes with
  one application mutex, so this is appropriate only for the stated
  single-instance SQLite boundary.
- Browser request capture on the normal desktop flow showed only the product
  origin (document, local assets, and room API). No analytics/CDN request or
  hosted font was observed. Privacy and terms routes render; the stated
  session/local storage model is consistent with the privacy copy.
- PWA offline reload passed after registration: the cached shell rendered while
  offline.

## Defects

| Severity | Defect | Evidence / impact |
| --- | --- | --- |
| High | Backend build identity does not identify the candidate under test. | Live `/health` is `{"build":"8338bd8c…","status":"ok"}`. Candidate is `6584c179…`; the Dockerfile default itself embeds `8338bd8c…`. Static assets match, but backend delivery of this candidate cannot be proven. This is the release-blocking failure. |
| Medium | No explicit cache policy and service-worker cache is not release-versioned. | Live HTML, JS, CSS, image, and `sw.js` have no `Cache-Control`/ETag. `sw.js` fixes `CACHE` to `living-room-lobby-v1` and has no `skipWaiting`. Offline reload works now, but a deployment cannot reliably separate old and new offline shells. |
| Medium | Public room creation has no rate limiter. | The Rust router contains no rate-limit layer; unauthenticated clients can repeatedly create rooms and force SQLite cleanup/writes. This misses the backend-service contract's rate-limiting requirement. |
| Low | Browser response hardening is incomplete. | Live responses include `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`, but no Content-Security-Policy, HSTS, or Permissions-Policy. |

## Required next steps

1. Inject the actual deployment commit SHA (`6584c179…` for this candidate) at
   image build time and redeploy; then verify live `/health` returns it.
2. Version the service-worker cache per release, adopt an intentional update
   policy, and set immutable caching for hashed assets with appropriate HTML/
   service-worker revalidation.
3. Add server-side rate limiting and complete production security headers.
4. Re-run this verification after deployment. Physical Samsung Tizen, LG webOS,
   Fire TV Silk, and real orientation hardware remain unavailable in this
   container; the D-pad fallback was exercised instead.
