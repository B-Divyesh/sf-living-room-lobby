# Living Room Lobby — independent verification 9

## Release decision: PASS

Candidate `e46876d434aa1df25d4e8ffc3d50a005b945a3a9` passes the acceptance contract at `https://living-room-lobby.sociobot.in`.

No release defects were found. The exact production-container command could not be run because this worker image has no `docker`, `podman`, or `buildah` executable; the equivalent locked frontend and Rust production compilation passed locally, and the public deployed build identifies the requested candidate in all three release markers.

## Required first checks

### Claim-test gate

`.factory/claims.json` exists and declares 16 claims. The initial command from the uninstalled clean checkout stopped before running tests because `vite` was not yet installed. After the required `npm ci`, each declared command was run from the shipped demo entry point. The consolidated browser run completed with exit 0 and `Browser regression checks passed`; the separately declared Rust retention command also completed with exit 0.

| Claim | Result | Observable check |
| --- | --- | --- |
| `demo-sandbox` | PASS | The sample action creates a ready three-player Draw Together workspace, uses `demo:` storage, resets, and clears sample storage when starting for real. |
| `account-free-sample` | PASS | A new `/demo` context opens without an account, cookie, or authorization credential. |
| `demo-real-room-isolation` | PASS | Sample play uses the isolated demo route and does not use real-room routes. |
| `offline-reload` | PASS | A fresh mobile context reloads the cached sample screen offline after the first visit. |
| `same-origin-requests` | PASS | The sample request log contains only the product origin. |
| `remote-controls` | PASS | Arrow navigation moves among the command rail and game choices. |
| `shared-phone` | PASS | The shipped shared-player sample reaches the “Pass the phone” screen. |
| `family-pack-unavailable` | PASS | Extra games remain locked with an honest unavailable-checkout message; core games remain usable. |
| `free-game-availability` | PASS | Draw Together, Point Panic, and Pass & Guess open without a license. |
| `player-count-limits` | PASS | Every game shows its declared player range and each free game opens from the three-player sample. |
| `shared-tv-canvas` | PASS | A phone drawing changes the shared TV canvas. |
| `point-controls` | PASS | Point Panic shows the tilt option and four labeled arrow controls which move the pointer. |
| `room-retention` | PASS | `cargo test --locked claim_real_room_retention_expires_after_six_hours` passed: a room older than six hours is removed and one exactly at the boundary remains. |
| `no-advertising-or-analytics` | PASS | The recorded sample flow and script sources are same-origin only. |
| `minimal-join-data` | PASS | The join form has code, display name, and play-mode controls only. |
| `license-status` | PASS | The recorded inactive-license fixture keeps extra games locked, renders a status, strips the URL token, and keeps the check outside the room API. |

### Cold first read

Confirmed on a new desktop browser context that the first screen answers the required questions in plain words:

- **What it does:** “Party games for one shared TV” and “Play together on your TV.”
- **Who it is for:** “For families sharing one TV,” including kids and relatives without a phone each.
- **What to click first:** the visible primary action is **Try it with sample data**, with “See a ready Draw Together round with three sample families.” beside it.

The action opened `/demo` in one click. The live sample displayed the persistent “Demo — sample data, nothing is saved to a real room” banner, **Reset demo**, and **Start for real**.

## Local candidate checks

| Check | Result | Evidence |
| --- | --- | --- |
| Locked install | PASS | `npm ci` installed 94 packages and reported 0 vulnerabilities. |
| Unit and integration suite | PASS | `npm test`: 5 Vitest tests, 5 Node release tests, and 19 Rust tests passed. |
| Claimed room-retention boundary | PASS | 1 targeted Rust test passed. |
| Type and static checks | PASS | `npm run check` passed TypeScript and `cargo check`. |
| Rust formatting and lint | PASS | `cargo fmt --all -- --check` and `cargo clippy --all-targets --locked -- -D warnings` passed. |
| Production frontend build | PASS | `npm run build` produced `dist/`; JavaScript was 53.87 KB raw / 19.80 KB gzip and CSS was 17.57 KB raw / 4.93 KB gzip. |
| Browser regression suite | PASS | `npm run test:browser` completed with `Browser regression checks passed`. It includes production server startup, desktop and 390 px use, accessibility, offline reload, host/phone flow, recovery, privacy, caching, and allowance checks. |
| Worktree check | PASS | `git diff --check` passed before QA-report files were added. |

## Live deployment checks

### Build identity and backend boundary

Confirmed that `node scripts/verify-release.mjs e46876d434aa1df25d4e8ffc3d50a005b945a3a9 https://living-room-lobby.sociobot.in` returned:

```json
{"build":"e46876d434aa1df25d4e8ffc3d50a005b945a3a9","cache":"living-room-lobby-e46876d434aa1df25d4e8ffc3d50a005b945a3a9"}
```

The rendered footer also contained the same full SHA. This confirms the live backend, a newly installed service-worker cache, and the visible page are the candidate.

Confirmed a real-room flow across independent desktop host and 390 px phone contexts:

- Created a room through the host UI; its four-character code was valid.
- Confirmed five immediate no-cache reads all returned that same room.
- Joined from the phone with the shared-phone option.
- Started Draw Together, drew on the phone, and confirmed the TV canvas received the drawing.
- Confirmed no console or page errors in either context.

Confirmed recovery behavior for invalid code `ZZZZ`: the mobile join form showed “That room is gone. Check the code or start a new one.”

Confirmed the live mobile demo shows four labeled Point Panic arrow controls, a tilt option, and a changed pointer position after an arrow action. Confirmed its shared-phone Pass & Guess session reaches “Pass the phone.”

### Accessibility, keyboard, and responsive checks

- Confirmed desktop landing and 390 px demo contexts have one `main`, one `h1`, `html[lang="en"]`, header, footer, and a skip link.
- Confirmed Axe WCAG checks returned zero violations on the cold desktop landing and reduced-motion 390 px demo.
- Confirmed keyboard use reaches the skip link first and that the browser suite moves focus through the remote command rail and game choices with arrow keys.
- Confirmed the 390 px sample screen is usable and the supplied reduced-motion media preference is active. The live demo had no console or page errors.
- Confirmed a fresh mobile service-worker install created `living-room-lobby-e46876d434aa1df25d4e8ffc3d50a005b945a3a9`; after clearing the ordinary HTTP cache and setting the context offline, `/demo` reloaded with “Draw together,” its demo banner, and no errors.

### Privacy, headers, caching, and budget

- Confirmed outgoing requests during a cold landing visit were only the product document, hero image, JavaScript, and CSS. A sample visit added only same-origin `POST /api/demo`.
- Confirmed no advertising, analytics, hosted font, or other-origin request in those flows.
- Confirmed `/`, `/demo`, `/privacy`, `/terms`, and `/health` return 200; the designed unknown route returns 404.
- Confirmed `/privacy` and `/terms` have route-specific titles and one page heading. The privacy text matches the tested display-name/play-mode, six-hour room, 24-hour demo, and local browser-storage behavior.
- Confirmed `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` on the checked responses.
- Confirmed HTML and service worker are revalidated; hash-named JS/CSS assets have `public, max-age=31536000, immutable`. Live uncompressed response sizes were 53,914 B JS, 17,573 B CSS, and 108,076 B hero WebP. The initial JavaScript and CSS gzip sizes are within the stated budgets, and the hero is within the 300 KB mobile image budget.

### Documented request allowances

Confirmed from one test client that 41 simultaneous `POST /api/demo` requests returned **40 × 200** and **1 × 429** with `Retry-After: 1`.

Confirmed from one test client that 13 `POST /api/rooms` requests returned **12 × 200** and **1 × 429** with `Retry-After: 60`.

## Defects by severity

No Critical, High, Medium, or Low product defects found.

## Coverage limits

- This worker has no local container-build executable, so the exact `docker build` command could not be run. Locked local frontend/Rust production compilation and the exact live release identity both passed.
- No physical Samsung Tizen, LG webOS, or Fire TV device was available. The independent browser coverage used Chromium desktop, 390 px mobile, keyboard, reduced motion, service worker, and the product’s remote-control paths.
- No repository `verify-url.sh` exists. The checked browser and Axe runs supplied the listed title/lang/main/alt/console coverage.

No product code was changed during verification. Only this QA record and the handoff were added.
