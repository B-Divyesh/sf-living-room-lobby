# Independent verification 11

**Result: FAIL.**

Tested candidate: `0a6407c8c8388b60ade18eab23f56b7c4e4d914a`  
Tested public URL: `https://living-room-lobby.sociobot.in`  
Work order: `living-room-lobby-verify-11`  
Verification window: 2026-09-01–02 UTC

## Release decision

The candidate is not accepted. The public service identifies base commit
`e6281676a59975fdc5448f549fc98cc8e461cdec`, not candidate `0a6407c…`.
Fresh `/health`, the rendered footer, `sw.js`, the JavaScript bundle, and the
repository's release verifier all agree on the older identity.

The candidate also fails the required 200% text-resize check. At 390×844 with
the root text size doubled, the document becomes 555 px wide and the hero h1
becomes 588.9 px wide. The right side of the headline and body copy is visibly
clipped. Live and candidate ship the same CSS (`04e16735…`), so this result
applies to the candidate rather than only to the stale backend release.

## Mandatory first-read and claims gate

The first-read test passes. A cold desktop and 390 px visit says “Play together
on your TV,” identifies families, kids, and relatives who do not each have a
phone, and makes **Try it with sample data** the primary action. The action says
that it opens a ready Draw Together round with three sample players. At 390 px
it is fully within the first viewport (top 530.5 px, bottom 584.5 px, height
54 px).

`.factory/claims.json` exists and declares 20 claims. After `npm ci`, every
declared command passed from the candidate's demo entry point:

- Browser claims passed for shared-TV/phone play, join code, language-light
  play, demo sandbox, account-free use, real-room isolation, offline reload,
  same-origin requests, TV-remote control, shared phone, Family Pack status,
  free games, player limits, shared canvas, point controls, privacy, minimal
  join data, and license status.
- `@claim:art-provenance` passed its Node contract test.
- `claim_real_room_retention_expires_after_six_hours` passed its Rust test.

Authoritative result: **20 passed, 0 failed**. The landing and README claims map
to entries in the manifest. `.factory/copy-audit.md` exists, but it does not
actually contain every landing sentence as required; it omits, among others,
the three play-mode descriptions and several game descriptions.

## Local candidate checks

| Check | Result and evidence |
| --- | --- |
| Clean identity/install | PASS — exact detached checkout `0a6407c…`; `npm ci` installed 94 packages and reported 0 vulnerabilities. |
| Unit/integration tests | PASS — `npm test`: 5 Vitest, 9 Node contract, and 19 Rust tests. |
| Full browser suite | PASS — `npm run test:browser` completed with “Browser regression checks passed.” |
| Type/lint/format | PASS — `npm run check`, `cargo fmt --all -- --check`, and `cargo clippy --all-targets --locked -- -D warnings`. |
| Production build | PASS — `VITE_BUILD_ID=0a6407c… npm run build`; `dist/` contains 57.63 KB JS / 21.12 KB gzip, 18.63 KB CSS / 5.17 KB gzip, and a 108,076 B hero image. |
| Backend release build | PASS — `BUILD_SHA=0a6407c… cargo build --release --locked`; local `/health` returned that exact SHA. |
| Container contract | PASS — `./scripts/deploy-container.sh --validate-only` confirmed port 8080, `/data`, and one replica. Docker/Podman was unavailable, so the two locked production stages were run directly. |

## Live end-to-end exercise

A fresh desktop host created room `WC9P`. An independent touch-enabled 390×844
phone performed 20 pre-join reads; all 20 returned the same room with HTTP 200.
The phone joined as shared player “QA Family,” and both pages retained that
player after reload. Draw Together persisted phone strokes to the TV room,
Pass & Guess increased the shared player's score, and Point Panic accepted 14
boundary-up actions and returned normal miss feedback. No console or page error
was recorded, and every browser request remained on the product origin.

Live boundary and recovery checks also passed:

- display names accept 1 and 20 characters and reject empty or 21-character
  values with a clear 400 response;
- invalid play mode, room stage, language, and player action return clear 400s;
- invalid credentials return 401; a missing-room join returns the documented
  recoverable envelope; coordinates clamp to 0–100;
- the twelfth player joins and the thirteenth is rejected with “This room
  already has 12 players.”

The candidate release binary independently handled 100 simultaneous room
creations from separate client keys with 100 HTTP 200 responses and 100 unique
codes. A shared-phone player persisted across a graceful stop/restart against
the same temporary SQLite database. The public room response did not expose a
token. Startup logs identified supplied database/port configuration without
printing a secret.

## Privacy, security, PWA, and performance

- A fresh live demo/reset/exit session contacted only
  `https://living-room-lobby.sociobot.in`. It used only the documented
  `demo:living-room-lobby:*` local/session-storage keys, and **Start for real**
  removed all demo keys.
- Browser-observed headers include CSP with header-only `frame-ancestors`,
  HSTS, `nosniff`, `DENY` framing, referrer policy, and permissions policy.
  API and health responses use `no-store`; HTML and `sw.js` revalidate; hashed
  JS/CSS use one-year immutable caching.
- The live request allowance was enforced: `/api/demo` allowed 40 requests in
  a one-second burst and request 41 returned `429` with `Retry-After: 1`;
  `/api/rooms` allowed 12 creations per minute and request 13 returned `429`
  with `Retry-After: 60`; a concurrent read burst likewise returned 40 normal
  route responses and one `429` with `Retry-After: 1`.
- A synthetic old-to-candidate service-worker update changed the controller,
  removed the old cache after activation, retained only
  `living-room-lobby-0a6407c…`, and reloaded the h1/main shell offline with no
  error.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.2 s, LCP 1.3 s, CLS 0, TBT 0 ms, 184 KiB total transfer.
  The candidate is within the JS, CSS, image, and first-load budgets.
- `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml` return
  200. `/404` and an unknown route return the designed 404 with status 404.
  Every rendered internal link returned 200.

No account is required, so the Entra sign-in condition does not apply. No
runtime AI feature is implied by the job, so there is no missed AI-assisted
step. Physical Samsung Tizen, LG webOS, Fire TV Silk, and real orientation
hardware were unavailable; D-pad and labeled phone controls were exercised in
Chromium instead.

## Accessibility evidence

- Axe WCAG 2 A/AA found zero violations, including zero serious/critical
  findings, on desktop and 390 px home/demo screens.
- Each tested page has `lang=en`, a route-specific title, one h1, and one main.
  First Tab focuses the skip link with a visible 4 px moss outline.
- ArrowRight moves between command-rail controls and game choices with the same
  visible outline. Privacy navigation updates the title, focuses the new h1,
  and announces “Privacy page.” Spanish instructions and the no-word cat
  picture prompt worked. Reduced-motion removed all nontrivial transitions.
- At normal text size there is no page overflow. The visible **Read privacy
  details** link is only 19 px high on desktop and 17 px high at 390 px, below
  the required 44 px target.
- At 200% text size on 390 px, both home and demo become 555 px wide. The home
  hero uses `overflow: hidden`; its 588.9 px h1 and adjacent content are visibly
  cut off. This fails the required text-resize/reflow check.

## Deployment identity evidence

| Surface | Live value | Candidate value |
| --- | --- | --- |
| `/health` | `e6281676a59975fdc5448f549fc98cc8e461cdec` | `0a6407c8c8388b60ade18eab23f56b7c4e4d914a` |
| Footer | `e6281676…` | expected `0a6407c…` |
| Service-worker cache | `living-room-lobby-e6281676…` | `living-room-lobby-0a6407c…` |
| JavaScript | live `index-XK1PWzwH.js`, SHA-256 `c772eefc…` | candidate `index-Bm4FvqZX.js`, SHA-256 `696f4477…` |
| `index.html` SHA-256 | `c7551bbc…` | `bdea67d4…` |

`RELEASE_VERIFY_ATTEMPTS=1 npm run test:live -- 0a6407c… <url>` failed with
“Backend release mismatch: expected 0a6407c…, received e6281676…”.

## Findings

| Severity | Finding | Required follow-up |
| --- | --- | --- |
| Critical | Public deployment is not candidate `0a6407c…`. | Deploy the exact candidate with `BUILD_SHA=0a6407c…`, then require `/health`, footer, service worker, and JS identity to agree before release. |
| High | 200% text resizing clips the primary home content and introduces 165 px of horizontal page overflow at 390 px. | Make display text wrap within the viewport at 200%, remove page-level horizontal overflow, and repeat home/demo resize checks. |
| Medium | The visible “Read privacy details” link has a 17–19 px high hit area. | Give the link a minimum 44×44 px interactive target without reducing its link affordance. |
| Low | `.factory/copy-audit.md` does not list every landing sentence. | Regenerate the audit from the complete rendered landing copy and retain claim mappings/word counts. |

No product code or infrastructure was changed during verification.
