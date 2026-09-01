# Independent verification 10

**Result: FAIL.**

Tested candidate: `19d388375ad65f899f0654770e1ee295c5e88ba7`  
Tested public URL: `https://living-room-lobby.sociobot.in`  
Verification date: 2026-09-01 UTC

## Release decision

The checked repository is clean and at the requested candidate. The public service is not that candidate. Fresh `/health` returned HTTP 200 with `{"build":"75f801f3a4309edb73c5c0707020e578eccf144d","status":"ok"}`. The live footer, service-worker cache name, and loaded JavaScript asset also identify `75f801f3a4309edb73c5c0707020e578eccf144d`; the candidate build emits `assets/index-S33UJToS.js`, while the live shell loads `assets/index-SwAnKLNk.js`. This prevents acceptance of candidate `19d3883…`.

The live shared-room check also did not complete. A desktop host created room `PLAY`. A separate 390 px phone opened its rendered join page and submitted the shared-phone form. The join response was HTTP 200 with the recovery JSON `{"error":"That room is gone. Check the code or start a new one.","recoverable":true}`. The host did not show the player. The normal host-and-phone journey therefore does not work reliably at the public URL.

## First-read check

PASS for wording and demo availability. On a cold 1440 px visit, the page says that it offers party games on one shared TV for families, including kids and relatives without individual phones. It directs the visitor to **Try it with sample data**, which says it opens a ready Draw Together round with three sample players. The action is visible without scrolling at 390 px (54 px high, top at 531 px in an 844 px viewport).

## Claim-test gate

PASS locally. `.factory/claims.json` exists and declares 20 claims. After a clean `npm ci` (94 packages, 0 reported vulnerabilities), all declared claim tags passed from the shipped demo entry point. This includes the 18 browser claims for shared TV/phone play, join code, language choice, demo isolation, offline reload, request privacy, remote controls, free-game availability, player limits, canvas and pointing controls, and inactive-license handling. The source-art contract and the targeted six-hour retention boundary also passed.

| Claim command category | Result |
| --- | --- |
| `node --test --test-name-pattern @claim:art-provenance scripts/product-contract.test.mjs` | PASS |
| Each declared `npm run test:browser -- --grep @claim:…` browser tag | PASS (`Browser regression checks passed`) |
| `cargo test --locked claim_real_room_retention_expires_after_six_hours` | PASS (one test; older-than-six-hours removed, exact boundary kept) |

## Local candidate checks

| Check | Result and evidence |
| --- | --- |
| Unit and integration tests | PASS — `npm test`: 5 Vitest, 7 Node contract, and 19 Rust tests passed. |
| Browser regression suite | PASS — exact `npm run test:browser` completed with `Browser regression checks passed`. |
| Type and lint checks | PASS — `npm run check`, `cargo fmt --all -- --check`, and `cargo clippy --all-targets --locked -- -D warnings` completed successfully. |
| Production build | PASS — `npm run build` produced `dist/`; JS 57.59 KB raw / 21.08 KB gzip and CSS 18.63 KB raw / 5.17 KB gzip. `BUILD_SHA=19d3883… cargo build --release --locked` completed successfully. |
| Container configuration | PASS — `./scripts/deploy-container.sh --validate-only` confirmed port 8080, `/data`, and one replica. Docker was not installed in this verification container, so no local image build was run. |
| Accessibility and keyboard | PASS on the live current release at desktop and 390 px — one `main`, one page heading, first Tab reaches the skip link with a visible `rgb(183, 212, 61) solid 4px` focus outline, and Axe reported no serious or critical WCAG 2 A/AA findings. Reduced-motion styles resolve transitions and animations to `0.00001s`. |
| Console and page errors | PASS on cold `/` and `/demo` visits — none recorded. |
| Privacy request check | PASS on a fresh live `/demo` browser context — all recorded HTTP request origins were `https://living-room-lobby.sociobot.in`. |
| Headers and cache policy | PASS on the current live release — HTTPS, HSTS, CSP with response-header `frame-ancestors 'none'`, nosniff, DENY framing, referrer policy, permissions policy, `no-store` for health/API, revalidation for shell, and immutable caching for the hashed JS asset. |
| Routes | PASS on the current live release — `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml` returned 200; `/404` and an unknown path returned 404. |
| Request allowance | PASS on the current live release — one client received 40/41 HTTP 200 responses for `POST /api/demo`, then HTTP 429 with `Retry-After: 1`; one separate client received 12/13 HTTP 200 responses for `POST /api/rooms`, then HTTP 429 with `Retry-After: 60`. |
| Persistence/read concurrency | PASS for a focused current-release read check — after one room creation, 20 concurrent reads of that code returned 20 HTTP 200 responses. This does not remove the browser host/phone failure above. |

## Findings

| Severity | Finding | Evidence and required follow-up |
| --- | --- | --- |
| Critical | The public deployment does not match the requested candidate. | Health, footer, service worker, and assets identify `75f801f…`, not `19d3883…`. Deploy candidate `19d3883…` with that full build identity, then repeat cold health, service-worker, footer, and asset checks. |
| Critical | The live shared-phone join path is not reliable. | A real host room `PLAY` was created in one desktop context; a fresh 390 px phone received the product recovery response on `POST /api/rooms/PLAY/join`, and the host did not receive the player. Check the deployed revision and replica/storage routing, then repeat an independent desktop-host/phone-join/game-action flow successfully. |

No product code was changed during this verification.
