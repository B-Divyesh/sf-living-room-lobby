# Independent verification 13

**Result: PASS.**

Tested candidate: `5e1b2b708a2da9a73d4cd2357155435a01873cf4`  
Tested public URL: `https://living-room-lobby.sociobot.in`  
Verification date: 2 September 2026 UTC

## Release decision

The candidate meets the researched brief and the factory acceptance contract.
The live backend reports the exact candidate SHA. The landing screen is clear
on a cold visit, offers the required one-click sample, and the sample opens a
ready shared-TV Draw Together round without an account.

## First read

Cold desktop visit: **“Play together on your TV.”** It says these are games
for families sharing one TV, including kids and relatives who do not each need
a phone. The first action is **“Try it with sample data”**, with adjacent copy
that says it opens a ready Draw Together round with three sample players. This
passes the plain-words and demo-sandbox gate.

## Required claim tests

`.factory/claims.json` exists and contains 20 claims. From the clean candidate
after `npm ci` and `cargo fetch --locked`, every literal command in that file
was run; no claim test failed. `npm run test:browser` was also run without a
grep, covering every browser claim and regression path in one shared pass.

Passed claim IDs: `shared-tv-phone-round`, `join-code-path`,
`language-light-round`, `art-provenance`, `demo-sandbox`,
`account-free-sample`, `demo-real-room-isolation`, `offline-reload`,
`same-origin-requests`, `remote-controls`, `shared-phone`,
`family-pack-unavailable`, `free-game-availability`, `player-count-limits`,
`shared-tv-canvas`, `point-controls`, `room-retention`,
`no-advertising-or-analytics`, `minimal-join-data`, and `license-status`.

## Local quality gates

| Check | Result |
| --- | --- |
| Clean install | PASS — `npm ci`: 94 packages, 0 reported vulnerabilities. |
| Unit/integration/contract tests | PASS — `npm test`: 5 Vitest, 9 Node, and 19 Rust tests. |
| Type, Rust, format, lint | PASS — `npm run check`, `cargo fmt --all -- --check`, and `cargo clippy --all-targets --locked -- -D warnings`. |
| Browser suite | PASS — `npm run test:browser`. |
| Production frontend build | PASS — exact `VITE_BUILD_ID=5e1b2b… npm run build`; `dist/` produced. |
| Production backend build | PASS — exact `BUILD_SHA=5e1b2b… cargo build --release --locked`. |
| Bundle budget | PASS — JS 21.14 kB gzip; CSS 5.29 kB gzip (budgets: 200 kB and 50 kB). |
| Local container image | Not run — Docker CLI is not installed in this verifier container. |

## Live independent QA

- `/health` returned `{"build":"5e1b2b708a2da9a73d4cd2357155435a01873cf4","status":"ok"}`.
- Desktop and 390×844 mobile loaded with HTTP 200, no console/page errors,
  no horizontal overflow, and visible 4 px focus outlines. ArrowRight moved
  command-rail focus; the first screen includes a skip link.
- Axe WCAG 2 A/AA on desktop landing/demo and 390 px landing found **zero
  serious or critical findings**. Reduced motion reduced transitions and
  animation to 0.01 ms.
- The live sample made only same-origin requests. It displayed its persistent
  “Demo — sample data, nothing is saved to a real room” banner, and a fresh
  service-worker-controlled `/demo` reloaded successfully offline.
- Header checks passed: CSP (including response-header `frame-ancestors`),
  HSTS, `nosniff`, `DENY` framing, referrer policy, permissions policy; HTML
  revalidates, `/health` is `no-store`, and hashed JS is one-year immutable.
- The API allowance is enforced: a concurrent 80-request POST burst to the
  isolated `/api/demo` workspace returned **40 × 200, then 40 × 429**;
  the 429 responses carried `Retry-After: 1`. This confirms the documented
  40 requests/second per-client limit without touching a real room.
- Visual inspection at 390 px confirms the repaired mobile hero artwork is
  present and the primary sample action remains within the first view.

## Findings

No release-blocking defects found. Physical Samsung Tizen, LG webOS, Fire TV
Silk, and hardware device orientation were unavailable; Chromium covered the
TV-sized, keyboard/D-pad, touch, mobile, offline, and labelled arrow-pad paths.
