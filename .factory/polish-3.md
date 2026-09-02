# Polish 3 — complete acceptance evidence

Released product commit: `d6d394c7a7e1b6a14bc3ab2e3e657ffa511b5187` at
`https://living-room-lobby.sociobot.in`.

Round 3 adds three observable Privacy claim tests. All earlier repairs remain
in place and were rechecked locally and cold on the live product.

## Finding map

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-1-1 | Sample action remains in the first screen. | `@regression:desktop-first-viewport`; `evidence-16/live-demo-round-3.json`; `live-first-read-desktop.png`. |
| F-1-2 | Long prompt remains above the command rail. | `@regression:prompt-rail-geometry`; live demo report and screenshot. |
| F-1-3 | English, Spanish, and picture prompts remain usable. | `@claim:language-light-round`; live demo report. |
| F-1-4 | Shared TV plus shared-phone round remains claimed. | `@claim:shared-tv-phone-round`; `live-release-gate.log`. |
| F-1-5 | TV code and join-page path remain tested. | `@claim:join-code-path`; live release gate. |
| F-1-6 | Removed framework/hosted-assets promise. | README source audit. |
| F-1-7 | Removed Rust/Axum/SQLx promise. | README source audit. |
| F-1-8 | Removed unsupported old-browser promise. | README audit; full browser suite. |
| F-1-9 | Removed SQLite/rate-bucket promise. | README source audit. |
| F-1-10 | Removed single-container promise. | README source audit. |
| F-1-11 | Removed untested minimum-version promise. | README source audit. |
| F-1-12 | Removed internal database-path prose. | README source audit. |
| F-1-13 | Removed runtime-user promise. | README source audit. |
| F-1-14 | Removed build-ID implementation prose. | README audit; live release gate. |
| F-1-15 | Kept a direct deployment command only. | `deploy-container.sh --validate-only`. |
| F-1-16 | Removed compound deployment-process promise. | README source audit. |
| F-1-17 | Removed deployment-abort promise. | README source audit. |
| F-1-18 | Kept direct test commands rather than coverage prose. | `npm test`; clean-clone log. |
| F-1-19 | Kept direct browser-test command rather than coverage prose. | `npm run test:browser`; `full-browser-local.log`. |
| F-1-20 | Removed unlisted accessibility bundle copy. | Local/live Axe reports. |
| F-1-21 | Kept source-provenance claim. | `@claim:art-provenance`; design record and hero asset. |
| F-1-22 | Kept styled HTTP 404 shared skeleton and metadata. | `@regression:styled-404`; `live-routes-axe.json`. |
| F-1-23 | Kept route focus and polite announcement. | `@regression:route-announcement`; live navigation recheck. |
| F-1-24 | Kept landing **What is stored** section. | Privacy claim inventory; live first-screen screenshot. |
| F-1-25 | Kept absolute README demo link. | README link contract test. |
| F-1-26 | Kept short README demo copy. | `.factory/copy-audit.md`. |
| F-1-27 | Kept internal storage names out of README. | Copy audit and `.factory/demo.md`. |
| F-1-28 | Kept decorative join label removed. | Landing audit; live screenshot. |
| F-1-29 | Kept **Enter the room code**. | `@claim:join-code-path`. |
| F-1-30 | Kept **Join room**. | `@claim:join-code-path`. |
| F-1-31 | Kept TV/phone hero guidance. | `@claim:shared-tv-phone-round`; live screenshot. |
| F-1-32 | Kept shared-TV canvas explanation. | `@claim:shared-tv-canvas`. |
| F-1-33 | Kept title-case game names. | Copy audit; live demo. |
| F-1-34 | Kept unexplained staging prose removed. | README source audit. |
| F-1-35 | Kept **three sample players**. | `@claim:demo-sandbox`; live demo. |
| F-2-1 | Kept all game limits enforced at boundaries. | `@claim:player-count-limits`; Rust boundary test. |
| F-2-2 | Kept remote Arrow and Enter/OK selection. | `@claim:remote-controls`. |
| F-2-3 | Kept short deployment instruction. | README source audit. |
| F-2-4 | Kept TV room-code guidance. | `@claim:join-code-path`; live release gate. |
| F-2-5 | Kept result-naming license control. | Product-contract test. |
| F-2-6 | Kept plain unavailable-checkout copy. | `@claim:family-pack-unavailable`. |
| F-3-1 | Added `no-account-required` for actual host and phone play. | Exact tagged command; clean-clone `claims-clean-clone.log`; live host/phone deployment gate. |
| F-3-2 | Added `real-room-session-storage` for session-only storage and leave cleanup. | Exact tagged command; clean-clone claim log. |
| F-3-3 | Added `browser-storage-clear` for real session plus license fixture deletion. | Exact tagged command; clean-clone claim log. |

## Verification

- A clean `git clone` ran `npm ci` and all 23 commands in `claims.json`; all
  passed. See [`claims-clean-clone.log`](evidence-16/claims-clean-clone.log).
- `npm test`, `npm run check`, `cargo fmt --all -- --check`, Clippy with
  warnings denied, `npm run build`, full `npm run test:browser`, and deployment
  validation passed.
- `verify-url.sh` found no console errors on local and live landing pages.
  Axe recorded zero WCAG 2/2.1 A/AA violations locally and live on `/`, `/demo`,
  `/privacy`, `/terms`, and 404; see `live-routes-axe.json`.
- Cold live checks cover first-screen geometry at 1366×768, 1440×900, and
  1920×1080, direct `?demo=1`, reset, isolation, offline reload, Spanish,
  picture prompts, and prompt/rail geometry. See `live-demo-round-3.json`,
  `live-first-read-desktop.png`, `live-first-read-mobile.png`, and
  `live-demo-desktop.png`.
- The deployment passed exact health/JavaScript/service-worker/footer identity,
  `/data`, one replica, durable-room, and 390 px shared-phone checks. See
  `live-release-gate.log`.
