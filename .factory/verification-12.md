# Independent verification 12

**Result: FAIL.**

Tested candidate: `0d258ba18e1242960760907b601f06d15e4f7857`  
Tested public URL: `https://living-room-lobby.sociobot.in`  
Work order: `living-room-lobby-verify-12`  
Verification date: 2 September 2026 UTC

## Release decision

The candidate is not accepted because its required product artwork disappears
at the specified 390 px phone width. The image request succeeds and the image
reports a natural size of 1200×800, but the rendered hero is a nearly uniform
dark rectangle. The defect reproduces from 320 through 560 px in Chromium
145, in both the local candidate build and the matching live deployment.

This contradicts the responsive design contract in `.factory/design.md`, which
says the phone treatment shows a shallow crop of the atmospheric hero. It also
makes a large mobile section look like a failed image load. In a browser-only
diagnostic, either removing `.hero-art`'s inherited `overflow: hidden` or
positioning the image above the figure pseudo-element makes the art render.
No product code was changed during this verification.

## First-read and claims gates

The first-read gate passes. A cold visit says **“Play together on your TV.”**
It identifies families sharing one TV, including children and relatives who do
not each need a phone. **Try it with sample data** is the first action and says
it opens a ready Draw Together round with three players. At 390×844 the action
fits in the first viewport: y=598.5 px, height=54 px. One click opens `/demo`
with three sample players and the persistent sample-data banner.

`.factory/claims.json` exists and declares 20 claims. The initial literal
pre-install invocations established that a clean clone has no executable Vite
dependency (`vite: not found`); the source-only art test and Rust retention test
ran. Following the repository's required `npm ci` setup (94 packages, zero
reported vulnerabilities), every exact manifest command was run again from the
clean candidate and passed: **20 passed, 0 failed**.

Passed IDs: `shared-tv-phone-round`, `join-code-path`,
`language-light-round`, `art-provenance`, `demo-sandbox`,
`account-free-sample`, `demo-real-room-isolation`, `offline-reload`,
`same-origin-requests`, `remote-controls`, `shared-phone`,
`family-pack-unavailable`, `free-game-availability`, `player-count-limits`,
`shared-tv-canvas`, `point-controls`, `room-retention`,
`no-advertising-or-analytics`, `minimal-join-data`, and `license-status`.
Landing-page and README product claims have corresponding manifest entries.

## Candidate checks

| Check | Result and evidence |
| --- | --- |
| Identity and cleanliness | PASS — checkout began clean at the exact requested SHA. |
| Install | PASS — `npm ci`; 94 packages, 0 vulnerabilities. |
| Unit/integration/contract tests | PASS — `npm test`: 5 Vitest, 9 Node, and 19 Rust tests. |
| Type and Rust checks | PASS — `npm run check`. |
| Formatting and lint | PASS — `cargo fmt --all -- --check`; `cargo clippy --all-targets --locked -- -D warnings`. |
| Full browser suite | PASS — `npm run test:browser`; all claim and regression checks completed. |
| Exact frontend build | PASS — `VITE_BUILD_ID=0d258ba… npm run build`; `dist/` produced. |
| Exact backend build | PASS — `BUILD_SHA=0d258ba… cargo build --release --locked`. |
| Container contract | PASS — `./scripts/deploy-container.sh --validate-only`; port 8080, `/data`, one replica. Docker/Podman was unavailable for a local image build. |
| URL verifier | PASS — factory `verify-url.sh` against local and live roots: HTTP 200, title, `lang=en`, one h1/main, alt text, labelled buttons, and no console errors. |

Production assets are 57,672 B JavaScript (20,751 B gzip), 19,049 B CSS
(5,243 B gzip), and 108,076 B for the mobile hero. These are within the
200 KB JS, 50 KB CSS, and 300 KB hero budgets.

## End-to-end and backend evidence

A fresh live desktop host and independent 390×844 shared phone created room
`34S5`, joined as **QA Family**, drew two persisted points on the TV canvas,
completed Pass & Guess for a score of 1, and moved the Point Panic pointer from
y=50 to y=42 using its labelled arrow controls. The phone showed all four
arrows and the optional tilt control. Neither page emitted a console or page
error.

Independent candidate API checks passed:

- 1- and 20-character names are accepted; empty and 21-character names are
  rejected. Invalid play mode, stage, language, credentials, excess drawing
  points, and unknown actions return clear 400/401 responses.
- A missing-room join returns the documented recoverable envelope. Point
  coordinates clamp to 0–100. The twelfth player joins; the thirteenth receives
  “This room already has 12 players.”
- 100 concurrent room creations using distinct client keys returned 100 unique
  room codes.
- A shared-phone player persisted after graceful backend stop/restart against
  the same temporary SQLite database, and the public room response exposed no
  token.
- The live allowance is enforced. `/api/demo` allowed 40 requests in a
  one-second burst; request 41 returned `429` and `Retry-After: 1`.
  `/api/rooms` allowed 12 creations per minute; request 13 returned `429` and
  `Retry-After: 60`. Route-layer and integration coverage apply the 40/second
  limit to all room endpoints; `/health` is intentionally exempt.

## Deployment identity

`RELEASE_VERIFY_ATTEMPTS=1 npm run test:live -- 0d258ba… <url>` passed. It
created and reloaded an independent shared-phone room and proved the full SHA
across the backend, service worker, JavaScript, and footer.

| Surface | Live evidence |
| --- | --- |
| `/health` | `0d258ba18e1242960760907b601f06d15e4f7857` |
| Worker cache | `living-room-lobby-0d258ba18e1242960760907b601f06d15e4f7857` |
| JavaScript | `/assets/index-Dnj9ZqBe.js`, byte-identical to candidate (`bf5e7b1d…`) |
| CSS | `/assets/index-7xCbShEC.css`, byte-identical to candidate (`bafaaafa…`) |
| HTML | Byte-identical to candidate (`4a528413…`) |
| `sw.js` | Byte-identical to candidate (`bca6798b…`) |

## Privacy, security, PWA, and caching

- A fresh demo/reset/exit flow contacted only
  `https://living-room-lobby.sociobot.in`, sent no Authorization header, and
  used only `demo:living-room-lobby:*` storage. **Start for real** removed all
  demo keys.
- Browser-observed responses provide CSP with header-only `frame-ancestors`,
  HSTS, `nosniff`, `DENY` framing, referrer policy, and permissions policy.
  API and health responses are `no-store`; HTML and `sw.js` revalidate; hashed
  JS/CSS are cached for one year as immutable.
- A fresh mobile worker controlled `/demo`, held only the exact release cache,
  and reloaded the populated Draw Together screen offline. A synthetic update
  using the shipped worker changed from an old cache to the exact candidate
  cache, deleted the old cache after activation, and reloaded offline.
- `/`, `/demo`, `/privacy`, `/terms`, `robots.txt`, and `sitemap.xml` return
  200. `/404` and an unknown route return the designed recovery page with 404.
  Every rendered same-origin link returned its expected response.
- No account is required, so the Entra condition does not apply. Runtime AI is
  not useful to the brief's local family-game job, so there is no missed AI
  step.

## Accessibility and performance

- Axe WCAG 2 A/AA found zero violations, including zero serious/critical
  findings, on desktop and 390 px Home, Demo, Privacy, and Terms.
- Every tested route has `lang=en`, a route-specific title, one h1, and one
  main. The first Tab reaches **Skip to the game** with a visible 4 px moss
  outline; Enter focuses the h1. ArrowRight moves between both game controls
  and game choices.
- At 390 px with 200% root text, Home and Demo each remain exactly 390 px wide;
  no visible interactive target is below 44 px. Reduced motion caps animation
  and transition duration at 0.01 ms.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.4 s, LCP 1.4 s, CLS 0, TBT 0 ms, 185 KiB transfer.
- The mobile hero failure is not detected by Axe because the loaded `<img>`
  still has valid alt text; it is a rendering/design-contract failure.

## Findings

| Severity | Finding | Required follow-up |
| --- | --- | --- |
| **High** | The hero artwork is invisible at 390 px and other common phone widths (reproduced from 320–560 px). The loaded image paints as a dark slab rather than the promised mobile crop. At 390 px, the image-only screenshot entropy is 0.496; at 580 px it is 7.157. | Fix the mobile stacking/clipping interaction around `.hero-art` and its image, then add a visual/pixel-variance regression at 390 px and repeat live mobile QA. |

Physical Samsung Tizen, LG webOS, Fire TV Silk, and real device-orientation
hardware were unavailable. D-pad, touch, reduced-motion, responsive, offline,
and labelled tilt-fallback behavior were exercised in Chromium 145.
