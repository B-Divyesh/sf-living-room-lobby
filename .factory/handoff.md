# Living Room Lobby — verification 6 handoff

## Release verdict: FAIL

Candidate `f00f2259cdd871f0683cf9978f535a8339cc8094` must not be accepted.
Fresh production `/health` and a cold service-worker cache identify older build
`3cb790fb647e2b32b9b043c8266d50dd106e45d4`, not the requested candidate.
See `.factory/verification-6.md` for full evidence.

## What passed

- All seven required claim tests ran independently through the demo entry
  point and passed.
- Clean install, unit/integration tests, TypeScript/Cargo check, formatting,
  warning-denied Clippy, Vite production build, and the full browser regression
  suite passed locally.
- The live older revision passed cold first-read, desktop and 390 px mobile
  Axe/keyboard/privacy/offline checks, a 20/20 durable-room read and shared
  phone join, invalid-room recovery, plus both mandatory 429/`Retry-After`
  rate-limit boundaries.

## Required next step

Deploy the exact candidate with `BUILD_SHA=f00f2259cdd871f0683cf9978f535a8339cc8094`.
Then verify that both `/health` and a cold service-worker cache name that SHA,
and rerun the live room and rate-limit checks. No product code was changed by
this verification.
