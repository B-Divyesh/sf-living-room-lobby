# Living Room Lobby — polish 1 handoff

## Repair

Implementation commit: `6629e6f58538dd3c53f5dc61eda79cc4b7988b9d`.

This repair resolves every finding in `.factory/review-1.md`: the first desktop
action fits the cold viewport; TV prompts reserve the command rail and retain
whole words; rooms offer Spanish instructions and picture prompts; the
one-click demo stays isolated; claims now cover the shared-TV/phone, join-code,
language-light, and footer-artwork promises; and the 404, live route
announcements, privacy landing section, README link, and copy audit are fixed.

## Verification before rollout

- Clean dependency install: `npm ci` (94 packages; 0 vulnerabilities).
- `npm test`: 5 Vitest tests, 6 Node contracts, and 19 Rust tests passed.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run build` passed: JavaScript 57.59 KB raw / 21.08 KB gzip; CSS 18.63 KB
  raw / 5.17 KB gzip.
- Every command in `.factory/claims.json` passed independently from the demo
  sandbox (20 total, including the Rust retention boundary and source-provenance
  contract).
- Browser regressions passed for Axe WCAG 2/2.1 A/AA, mobile controls, desktop
  and mobile first viewport, command-rail geometry at 1366×768/1440×900/
  1920×1080, Spanish/picture play, host/phone flow, storage/rate limits,
  offline reload, privacy requests, 404, route announcements, and invalid room
  recovery.
- `./scripts/deploy-container.sh --validate-only` passed: port 8080, durable
  `/data`, and one replica.

Local visual evidence:

- `.factory/evidence/polish-1-first-screen-1440x900.png`
- `.factory/evidence/polish-1-demo-1440x900.png`

## Rollout and cold live check

Deployed source: `75f801f3a4309edb73c5c0707020e578eccf144d`.
`./scripts/deploy-container.sh` completed with the owned product image and
one-replica durable `/data` configuration. The release verifier passed against
`https://living-room-lobby.sociobot.in`: `/health`, a cold service-worker cache,
and the footer all identify the deployed source.

A cold public Playwright check passed at 1440×900 and 390×844: first-screen
sample action, demo banner/reset path, Spanish Draw Together instructions,
prompt above the command rail, zero Axe WCAG 2/2.1 A/AA violations, route
announcement, and the 404 shell/metadata. Live evidence is in
`.factory/evidence/polish-1-live-first-screen-1440x900.png` and
`.factory/evidence/polish-1-live-demo-1440x900.png`.

## Known gaps

None. The unavailable Family Pack remains honestly unavailable; no purchase
link is shown until factory checkout registration exists.
