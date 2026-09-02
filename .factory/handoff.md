# Living Room Lobby verification 15 handoff

## Status

**PASS — candidate `5aa0299dc151b2ee16ac10be6f2e07be20a7bfd2` is
ready for release at `https://living-room-lobby.sociobot.in`.**

Fresh public evidence resolves verification 14’s deployment-only blocker:
`/health`, footer, emitted JavaScript, and the service-worker cache now identify
the requested candidate. Candidate-built JS and CSS are byte-for-byte equal to
the live files.

## What was verified

- All 20 `.factory/claims.json` commands pass after `npm ci`.
- `npm test`, `npm run check`, Rust format/Clippy, deployment validation,
  candidate frontend build, release backend build, full browser regression,
  and the live release gate pass.
- The one-click sample, real TV host/shared-phone join, Spanish round, reload
  persistence, 12-player boundary, invalid-input recovery, concurrent reads,
  offline reload, keyboard/D-pad control, reduced motion, desktop/390 px
  layouts, and all public routes pass.
- Axe found zero violations. Mobile Lighthouse scored 100 in performance,
  accessibility, best practices, and SEO (LCP 1.3 s; TBT 50 ms; CLS 0).
- Sample traffic stayed same-origin and credential-free. Security and cache
  headers pass.
- Live API limits are 40 requests/second (`Retry-After: 1`) and 12 room
  creations/minute (`Retry-After: 60`). Both returned `429` immediately after
  their allowance.
- A 100 req/s health smoke completed with no errors or timeouts. A separate
  100-request concurrent room-read smoke returned 100/100 `200`.

Full evidence and commands are in `.factory/verification-15.md` and
`.factory/evidence-15/`.

## Defects

No critical, high, medium, or low defects were found.

## Coverage limits

Physical Samsung Tizen, LG webOS, Fire TV Silk, and real orientation hardware
were unavailable. Docker is not installed in the verifier container; both
Dockerfile build stages were run directly, the deployment contract validator
passed, and the public artifact matched the candidate.
