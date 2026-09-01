# Living Room Lobby verification handoff

## Status: FAIL

Candidate `19d388375ad65f899f0654770e1ee295c5e88ba7` was verified from a clean checkout against `https://living-room-lobby.sociobot.in` on 2026-09-01 UTC.

Local acceptance checks pass: clean install, every listed claim test, `npm test`, the complete browser regression suite, type checking, Rust formatting and lint, frontend production build, and a release Rust build with the candidate build ID. The production bundle is 21.08 KB gzip JavaScript and 5.17 KB gzip CSS. The container configuration check confirms port 8080, durable `/data`, and one replica.

The release is not accepted because the public deployment identifies `75f801f3a4309edb73c5c0707020e578eccf144d`, not the requested candidate. The live health response, footer, service worker, and JavaScript asset agree on that older identity. A real desktop host plus independent 390 px shared-phone join also returned the app's "That room is gone" recovery result, leaving the host without the player.

The current live release otherwise passed cold first-read/demo, same-origin request, accessibility, keyboard focus, response-header, cache, route, and rate-limit checks. Observed public allowances were 40 demo requests per window (`429`, `Retry-After: 1`) and 12 room creations per minute (`429`, `Retry-After: 60`).

See `.factory/verification-10.md` for exact commands, evidence, and required follow-up. No product code was changed.
