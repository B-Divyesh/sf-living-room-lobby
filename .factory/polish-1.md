# Polish 1 — review repair evidence

Repair implementation: `6629e6f58538dd3c53f5dc61eda79cc4b7988b9d`.

| Finding | Change made | Evidence |
| --- | --- | --- |
| F-1-1 | Made the desktop hero height-aware and added 1366×768, 1440×900, and 1920×1080 action geometry checks. | `@regression:desktop-first-viewport`; first-screen screenshot |
| F-1-2 | Reserved the command-rail height, reduced prompt scale by panel width, and reject overlap or clipping. | `@regression:prompt-rail-geometry`; demo screenshot |
| F-1-3 | Added English, Español, and picture prompts; Spanish translates core host/phone instructions. | `@claim:language-light-round` |
| F-1-4 | Added a host-plus-390px shared-phone round claim. | `@claim:shared-tv-phone-round` |
| F-1-5 | Added the rendered host join-page URL and a join-path claim. | `@claim:join-code-path` |
| F-1-6 | Removed the README framework/hosted-assets implementation claim. | README review |
| F-1-7 | Removed the README Rust/Axum/SQLx implementation claim. | README review |
| F-1-8 | Removed the unsupported old-browser compatibility claim. | README review |
| F-1-9 | Removed the SQLite-path/rate-limit implementation claim. | README review |
| F-1-10 | Removed the single-container implementation claim. | README review |
| F-1-11 | Removed unsupported minimum-version guarantees. | README review |
| F-1-12 | Removed the internal database-path description. | README review |
| F-1-13 | Removed the unverified container-user/runtime guarantee. | README review |
| F-1-14 | Removed build-ID implementation copy. | README review |
| F-1-15 | Replaced deployment invariants prose with the direct deployment command. | `./scripts/deploy-container.sh --validate-only` |
| F-1-16 | Removed the long deployment-process promise. | README review |
| F-1-17 | Removed the deployment-abort promise. | README review |
| F-1-18 | Replaced test-coverage prose with a direct command. | `npm test` |
| F-1-19 | Replaced browser-test prose with a direct command. | `npm run test:browser` |
| F-1-20 | Removed the ungrouped accessibility promise; executable Axe regressions remain. | `@regression:mobile-a11y` |
| F-1-21 | Removed README release assertions and added a footer provenance claim. | `@claim:art-provenance` |
| F-1-22 | Rebuilt the 404 with header/footer, skip link, metadata, manifest, and recovery link. | `@regression:styled-404` |
| F-1-23 | Added persistent polite route announcements for forward and Back navigation. | `@regression:route-announcement` |
| F-1-24 | Added **What is stored** using retained tested facts. | retention, demo, license, and tracker claims |
| F-1-25 | Changed the README sample link to the absolute live `/demo` URL. | `README links to the live demo instead of a GitHub-relative path` |
| F-1-26–F-1-27 | Rewrote the README demo and storage sentences in plain words. | `.factory/copy-audit.md` |
| F-1-28 | Removed the decorative join label. | landing copy review |
| F-1-29 | Renamed the heading to **Enter the room code**. | landing copy review |
| F-1-30 | Renamed the submit action to **Join room**. | landing copy review |
| F-1-31 | Replaced the hero slogan with TV/phone guidance. | `.factory/copy-audit.md` |
| F-1-32 | Replaced the Draw Together metaphor with a shared-canvas description. | `@claim:shared-tv-canvas` |
| F-1-33 | Normalized game names to title case. | source and README review |
| F-1-34 | Removed the unexplained factory test-setting instruction. | README review |
| F-1-35 | Changed “families” to **sample players**. | `.factory/copy-audit.md` |

## Verification

All 20 declared claim commands were run from the clean dependency install.
`npm test`, `npm run check`, `cargo fmt --all -- --check`,
`cargo clippy --all-targets --locked -- -D warnings`, `npm run build`, and the
deployment configuration validation passed. Screenshots are
`.factory/evidence/polish-1-first-screen-1440x900.png` and
`.factory/evidence/polish-1-demo-1440x900.png`.

## Live recheck

Deployed source: `75f801f3a4309edb73c5c0707020e578eccf144d`.
`node scripts/verify-release.mjs 75f801f3a4309edb73c5c0707020e578eccf144d
https://living-room-lobby.sociobot.in` passed: `/health`, service-worker cache,
and footer all match. A cold live browser check passed the 1440×900 and 390×844
sample-action geometry, demo banner, Spanish Draw Together route, prompt/rail
geometry, Axe WCAG 2/2.1 A/AA, route announcement, and 404 header/footer.
Live screenshots: `.factory/evidence/polish-1-live-first-screen-1440x900.png`
and `.factory/evidence/polish-1-live-demo-1440x900.png`.
