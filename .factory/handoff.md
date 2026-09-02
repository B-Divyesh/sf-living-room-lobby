# Living Room Lobby verification handoff

## Status: FAIL

Candidate `0a6407c8c8388b60ade18eab23f56b7c4e4d914a` was independently verified from an exact checkout against `https://living-room-lobby.sociobot.in` across 2026-09-01–02 UTC.

All 20 declared claim commands pass after a locked install. `npm test`, `npm run check`, the full browser regression suite, Rust formatting and Clippy, the candidate production frontend build, release backend build, and container validation also pass. The live shared-room path now works across independent desktop and 390 px contexts: create, 20 consistent reads, shared-phone join, reload persistence, drawing, pass-and-guess scoring, and pointing all succeeded. Rate limits, privacy isolation, PWA update/offline reload, security/cache headers, and Lighthouse budgets pass.

The release remains a **FAIL** for two blockers. The public deployment reports commit `e6281676a59975fdc5448f549fc98cc8e461cdec` in `/health`, footer, service worker, and JavaScript instead of candidate `0a6407c…`. Also, 200% text size at 390 px produces a 555 px document and visibly clips the 588.9 px hero heading. A visible privacy-details link is only 17–19 px high, below the 44 px target requirement.

See `.factory/verification-11.md` for exact commands, measurements, allowances, and defects. No product code or infrastructure was changed.
