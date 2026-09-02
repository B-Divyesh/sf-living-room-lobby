# Polish 2 — complete finding map

Repair source before evidence documentation: `4d90728ca76805a93776acb386cc47aad36d3cfd`.
The public release is `https://living-room-lobby.sociobot.in`.

## Review 1 findings

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-1-1 | Kept the full sample action inside the first screen at desktop and TV heights. | `@regression:desktop-first-viewport`; `.factory/evidence/polish-1-first-screen-1440x900.png` |
| F-1-2 | Reserved command-rail space and kept the longest prompt whole and visible. | `@regression:prompt-rail-geometry`; `.factory/evidence/polish-1-demo-1440x900.png` |
| F-1-3 | Added Spanish instructions and picture-only prompts. | `@claim:language-light-round` |
| F-1-4 | Covered the TV host plus shared-phone round. | `@claim:shared-tv-phone-round` |
| F-1-5 | Added and tested the room-code join page; clarified the personal-phone instruction again in round 2. | `@claim:join-code-path`; round-2 copy contract |
| F-1-6 | Removed the unneeded framework and hosted-assets promise from README. | README source review |
| F-1-7 | Removed the unneeded Rust, Axum, and SQLx promise from README. | README source review |
| F-1-8 | Removed the unsupported old-browser promise. | README source review; full browser suite |
| F-1-9 | Removed the unlisted SQLite path and rate-bucket promise. | README source review |
| F-1-10 | Removed the unlisted single-container promise. | README source review |
| F-1-11 | Removed unsupported minimum toolchain versions. | README source review |
| F-1-12 | Removed the internal database fallback description. | README source review |
| F-1-13 | Removed the unlisted runtime-user guarantee. | README source review |
| F-1-14 | Removed the unlisted build-identity prose. | README source review; `npm run test:live` |
| F-1-15 | Kept only the deployment command instead of an unlisted invariant claim. | `./scripts/deploy-container.sh --validate-only` |
| F-1-16 | Removed the deployment-process promise, including its round-2 reintroduction. | Round-2 product contract test |
| F-1-17 | Removed the deployment-abort promise. | README source review |
| F-1-18 | Replaced test-coverage prose with the command itself. | `npm test` |
| F-1-19 | Replaced the long browser-test promise with the command itself. | `npm run test:browser` |
| F-1-20 | Removed the unlisted accessibility bundle claim while retaining tested behavior. | `@regression:mobile-a11y`; Axe checks at desktop and 390 px |
| F-1-21 | Removed README release assertions and retained tested footer provenance. | `@claim:art-provenance` |
| F-1-22 | Uses the shared header, footer, skip link, metadata, and recovery action on a real HTTP 404. | `@regression:styled-404` |
| F-1-23 | Announces route headings after forward and Back navigation. | `@regression:route-announcement` |
| F-1-24 | Added the landing-page **What is stored** section. | retention, demo, license, and tracker claim tests |
| F-1-25 | Links README directly to the public demo. | README link contract test |
| F-1-26 | Replaced the long demo sentence with two short sentences. | `.factory/copy-audit.md` |
| F-1-27 | Describes demo progress in visitor language; internal keys remain only in demo documentation. | `.factory/copy-audit.md`; `.factory/demo.md` |
| F-1-28 | Removed the decorative join label. | Landing source review |
| F-1-29 | Uses **Enter the room code**. | `.factory/copy-audit.md` |
| F-1-30 | Uses **Join room**. | `@claim:join-code-path` |
| F-1-31 | Explains how the TV and phones work together. | `@claim:shared-tv-phone-round` |
| F-1-32 | Says every connected phone contributes to the TV picture. | `@claim:shared-tv-canvas` |
| F-1-33 | Uses title case for every game name. | `.factory/copy-audit.md`; catalogue tests |
| F-1-34 | Removed the unexplained staging setting sentence. | README source review |
| F-1-35 | Uses **three sample players**. | `@claim:demo-sandbox`; `.factory/copy-audit.md` |

## Review 2 findings

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-2-1 | Enforced each game’s minimum and maximum in demo UI and the real-room API. Rejections say how many players must join or sit out. | `@claim:player-count-limits`; `claim_player_count_limits_are_enforced_at_every_boundary`; `.factory/evidence/polish-2-live-player-limit.png` |
| F-2-2 | The claim moves focus with ArrowRight, presses Enter, and requires Point Panic’s playable arena to open. | `@claim:remote-controls`; `.factory/evidence/polish-2-live-remote-enter.png` |
| F-2-3 | Replaced the 31-word deployment promise with “Run this command to deploy a committed checkout.” | Round-2 product contract test |
| F-2-4 | Replaced “Scan once” with “Use the TV room code to join.” | `@claim:join-code-path`; round-2 product contract test |
| F-2-5 | Renamed the disclosure control to **Verify a Family Pack license**. | Round-2 product contract test; `.factory/evidence/polish-2-live-first-screen.png` |
| F-2-6 | Replaced checkout jargon with “Buying extra games is not available yet.” | `@claim:family-pack-unavailable`; round-2 product contract test |

## Local verification

- All 20 exact commands in `.factory/claims.json` passed sequentially from clean clone `/tmp/lrl-claims-WjiYdw`.
- `npm test`: 6 Vitest, 10 Node contract, and 21 Rust tests passed.
- `npm run check`, Rust format, Clippy with warnings denied, `npm run build`, and deployment validation passed.
- `npm run test:browser` passed the complete browser, responsive, accessibility, privacy, offline, routing, and real-room suite.
- `/opt/fleet/lib/verify-url.sh` reported one heading, one main, `lang=en`, all image alternatives, labelled buttons, and no console errors.
- Lighthouse mobile scored 100 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO. FCP was 1.4 s, LCP 1.6 s, CLS 0, and TBT 10 ms.
- Built assets are 58.02 KB JavaScript and 19.17 KB CSS before gzip.

## Live verification

Deployed commit `98b506e1632464092cdc4e9add8c3b33265c1d53` at
`https://living-room-lobby.sociobot.in`.

- `/health`, the JavaScript asset, service-worker cache, and footer all identify
  the exact deployed commit. The deployment retained its pre-rollout room.
- A cold live browser found all three rewritten phrases, no console errors, no
  page errors, zero desktop/mobile Axe violations, and only the product origin.
- The sample stayed available after a cold offline reload. Reset and the
  separate `demo:` storage namespace remained intact. A fresh direct
  `/?demo=1` context also proved its banner, seed, reset, and isolation.
- Arrow keys moved focus and Enter opened Draw Together in a real three-player
  room. The phone completed the Pass & Guess handoff.
- Every game’s minimum and maximum was exercised against the live room API.
  Exact boundaries started; one below or above was rejected. A thirteenth room
  player was also rejected.
- The first action fit 1366×768, 1440×900, and 1920×1080. The longest sample
  prompt stayed above the command rail at all three sizes.
- `/`, `/demo`, `/privacy`, and `/terms` returned their route-specific titles,
  one `h1`, one `main`, and canonical URL. The styled unknown route returned
  HTTP 404 with the shared skeleton. Forward and Back navigation restored focus
  and route announcements.
- The live API allowed 40 same-client requests and returned one `429` with
  `Retry-After: 1` for request 41.
- Screenshots: `.factory/evidence/polish-2-live-first-screen.png`,
  `.factory/evidence/polish-2-live-player-limit.png`, and
  `.factory/evidence/polish-2-live-remote-enter.png`.
