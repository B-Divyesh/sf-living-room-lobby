# Independent verification 3 — FAIL

**Work order:** `living-room-lobby-verify-3`  
**Candidate:** `a58442a15f6881217d08bf403937ebdc8cf5c099` (clean checkout before verification)  
**Live URL:** https://living-room-lobby.sociobot.in  
**Verified:** 2026-08-30 UTC

## Verdict

**FAIL.** The prior deployment-identity problem is fixed: live `/health` and a
fresh release binary both report `a58442a15f6881217d08bf403937ebdc8cf5c099`,
and the built HTML, JS, CSS, and hero image match live byte-for-byte.

This candidate nevertheless fails the acceptance contract in two release
blocking ways:

1. The cold first screen has no one-click **“Try it with sample data”** action.
   `/demo` is just the normal landing page: it has no sample room, no demo
   banner, no Reset demo, no Start for real action, and no isolated demo
   storage. Therefore the required demo-sandbox and the instruction to execute
   claims through its demo entry point cannot be met.
2. The live deployment does not have a shared room store. A fresh room was
   created successfully, then twenty immediate reads of that exact room through
   fresh requests returned **9 × 200 and 11 × 404**. A separate browser context
   likewise received “That room is gone” when joining a freshly hosted room.
   This makes the core host-TV/phone-player job unreliable.

## Mandatory first-read and demo evidence

Cold live page, 1440 × 900, first screen read:

> “No console. No pile of phones. Everyone gets a turn. Language-light party
> games that open right in your TV browser. Little kids can share. Grown-ups can
> just point and play.”

It communicates a TV-browser party-game purpose and mostly identifies its
family audience. The apparent first action is **“Start on this screen”**, which
creates a real room. It does not say “Try it with sample data” or say what a
sample action would show. There is no one-click sample/demo route. This alone
is a release-blocking first-read failure under the work order.

Fresh Playwright evidence for `https://living-room-lobby.sociobot.in/demo`:

```json
{
  "url": "https://living-room-lobby.sociobot.in/demo",
  "h1": ["Everyone getsa turn."],
  "demoBanner": 0,
  "resetDemo": 0,
  "startReal": 0,
  "sampleAction": 0,
  "localStorage": [],
  "sessionStorage": []
}
```

`.factory/claims.json` exists and lists two claims. Both exact commands pass
against the locally served root application, but neither uses a real demo entry
point because none exists:

```sh
npm run test:browser -- --grep @claim:offline-reload
npm run test:browser -- --grep @claim:same-origin-requests
```

The first verifies a service-worker cold offline reload; the second records
only local-product requests. Their pass result does not cure the missing
required sandbox.

## Clean local quality gates

Completed from the checked candidate after `npm ci` (94 packages installed,
`npm audit` reported 0 vulnerabilities):

| Command | Result |
| --- | --- |
| `npm test` | PASS — 4 Vitest tests and 7 Rust tests |
| `npm run check` | PASS — strict TypeScript and Cargo check |
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --all-targets --locked -- -D warnings` | PASS |
| `VITE_BUILD_ID=a584… npm run build` | PASS; `dist/` produced |
| `BUILD_SHA=a584… cargo build --release --locked` | PASS |
| `npm run test:browser` | PASS — desktop/mobile, keyboard, Axe, room flows, privacy, offline regression |
| both exact claim commands above | PASS |

The separately started release binary, run from a new temporary working
directory with only `PORT=18080`, returned:

```json
{"build":"a58442a15f6881217d08bf403937ebdc8cf5c099","status":"ok"}
```

Fresh production output is 48.17 KB raw / 18.03 KB gzip JS and 16.36 KB raw /
4.68 KB gzip CSS. The hero is 108,076 B WebP. All are inside the stated
static budgets.

## Live deployment, privacy, accessibility, and PWA

- `GET /health` returned HTTP 200 and the exact candidate SHA.
- SHA-256 values were identical for local/live `index.html`, JS, CSS, and
  `lobby-hero.webp`. The live files are therefore the candidate frontend.
- Cold desktop and 390 px mobile Playwright visits had no console/page errors
  during the normal landing flow. The first keyboard Tab reaches the skip link;
  desktop focus is a visible `rgb(183, 212, 61)` 4 px outline. Reduced-motion
  mobile reports no transform, `0.00001s` transition duration, and automatic
  scrolling. No body horizontal overflow was observed at 390 px.
- Axe 4.13 WCAG 2 A/AA/2.1 A/AA found zero serious or critical findings on
  desktop and 390 px landing pages. The repository browser suite also passed
  the host Point Panic state after the prior repair.
- Initial normal free-flow requests were only to
  `https://living-room-lobby.sociobot.in`; no cookie, tracker, third-party
  font, or CDN request was observed. This confirms the listed same-origin
  privacy claim for the normal free landing flow.
- Live shell and service-worker responses are `no-cache, must-revalidate`;
  hashed JS/CSS are `public, max-age=31536000, immutable`; API and health are
  `no-store`. CSP, HSTS, Permissions-Policy, nosniff, frame denial, and strict
  referrer policy are present.
- The active worker cache is
  `living-room-lobby-a58442a15f6881217d08bf403937ebdc8cf5c099`, contains the
  shell, hero, and exact hashed JS/CSS, and a browser-cache-cleared offline
  reload rendered the h1 and Start button without errors. `sw.js` has
  release-versioned cache cleanup, `skipWaiting`, and `clients.claim`, which is
  a sound worker-update policy.
- Room API allowance is live and enforced per supplied forwarded-client key:
  requests 1–12 to `POST /api/rooms` returned 200; request 13 returned 429
  with `Retry-After: 60`. For the all-route guard, reads 1–40 returned their
  normal 404, and request 41 returned 429 with `Retry-After: 1`.

## Core-flow failure and persistence boundary

Using two new Playwright contexts, the host created a room and the phone opened
`/?join=<code>`, entered a valid shared-family name, and submitted. The phone
remained on the join form with the in-product message:

> “That room is gone. Check the code or start a new one.”

To remove UI timing as a variable, one new room (`6B5M`) was created through
the public API, then read twenty times immediately with no-store, closed
connections. Results were 200 on reads 3, 4, 5, 10, 11, 15, 16, and 19; all
other reads were 404 with that same recovery JSON. This is direct evidence of
requests landing on different process-local SQLite databases/replicas. The
local source's single-instance room store is therefore not being deployed as a
single reachable instance, and there is no shared durable database.

## Defects

| Severity | Finding | Evidence and impact |
| --- | --- | --- |
| **Critical** | Live room state is split across instances. | A newly created room read 200 only 9/20 times and 404 11/20 times; a fresh phone context could not join a fresh host room. The product's essential shared-screen party game cannot reliably connect players. Deploy one replica as promised or move room state/rate-limit state to shared persistence before release. |
| **High** | No required one-click sample demo or isolated demo sandbox. | Landing and `/demo` contain no “Try it with sample data,” sample room, demo banner, Reset demo, Start for real, or separate storage namespace. Claims cannot be verified through a demo entry point. |
| **Medium** | First screen does not provide the required three plain facts or a sample-action explanation. | It has purpose/audience copy and real-room buttons, but no first-screen privacy/offline/price facts and no explanation of a demo result. |
| **Medium** | Claim inventory is incomplete for visitor-reliant page/README promises. | Claims JSON covers only offline reload and same-origin landing requests, while copy also promises language-light games, TV-remote friendliness, no account, shared-phone play, temporary six-hour rooms, room API limits, and one-time $12 Family Pack. The claims contract requires tests for claims retained in copy. |
| **Low** | Required site metadata and a real 404 asset are absent. | Built `index.html` has no canonical URL, Open Graph/Twitter metadata, favicon, or apple-touch icon. There is no `staticwebapp.config.json` or `404.html`; `/404` falls back to the ordinary home page rather than a designed 404. |

## Follow-up verification

After the two blocking defects are repaired, rerun the exact claims from a
fresh browser context at `/demo` (or `?demo=1`), then repeat the two-context
host/phone join test and a 20-request immediate room-read test. All reads must
reach the same persisted room. Physical Samsung Tizen, LG webOS, and Fire TV
Silk hardware was not available; Chromium desktop/mobile and D-pad fallback
were exercised.
