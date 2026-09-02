# Living Room Lobby — polish round 3 handoff

## Status

PASS. Product release `d6d394c7a7e1b6a14bc3ab2e3e657ffa511b5187` is live at
`https://living-room-lobby.sociobot.in`.

## What changed

- Added three Privacy claim entries and dedicated browser tests:
  `no-account-required`, `real-room-session-storage`, and
  `browser-storage-clear`.
- The tests use fresh real host and 390 px phone contexts. They prove no
  account UI/cookies/Authorization credential, session-only room state with
  leave cleanup, and storage deletion of real-room and license fixtures.
- Added a source contract so the three Privacy assurances cannot remain on the
  page without their matching claim entry and tagged test.
- Updated the catalog description to a short verb-first sentence.

## Verification

- Clean clone: `npm ci`, then all 23 exact claim commands passed. Evidence:
  `.factory/evidence-16/claims-clean-clone.log`.
- Local: `npm test`, `npm run check`, Rust format, Clippy with warnings denied,
  `npm run build`, `npm run test:browser`, and deployment validation passed.
- Accessibility: local and live Axe reports have zero violations on home, demo,
  Privacy, Terms, and 404. `verify-url.sh` found no live landing console errors.
- Privacy/offline: demo requests were same-origin, direct `?demo=1` remained
  isolated, Reset demo worked, and offline reload worked after first visit.
- Deployment: the exact image passed health, JavaScript, worker-cache, footer,
  `/data`, one-replica, durable-room, and desktop-host/390 px shared-phone
  checks. See `.factory/evidence-16/live-release-gate.log`.

## Run and verify

```sh
npm ci
npm test
npm run check
npm run test:browser
npm run build
```

Run every command in `.factory/claims.json`. Deploy a clean committed checkout
with `./scripts/deploy-container.sh`.

## Known gaps

None. Family Pack checkout remains honestly unavailable by design, with a
listed and tested unavailable state.
