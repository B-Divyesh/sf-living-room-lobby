# Review 3 — Living Room Lobby

## Verdict: FAIL

Reviewed 2 September 2026 against the public site and the supplied checkout
`67067716e0de4eb3891bb2537350c1ec39c9b168`. The live footer identifies product
build `5aa0299dc151b2ee16ac10be6f2e07be20a7bfd2`; the checkout's later commit adds
verification records only, not product code.

The cold first read, demo, listed claims, routing, accessibility, privacy request
capture, visual identity, and earlier repairs pass. The public Privacy page still
contains three visitor-facing storage/account assurances with no matching
`.factory/claims.json` entry or clean-sandbox claim test. The claims contract
requires every retained assurance to be listed and proved, so this review cannot
pass.

## Cold first read

No scrolling was used before answering.

| Context | What it does | For whom | First action | Result |
| --- | --- | --- | --- | --- |
| 390×844 phone | Party games on one shared TV. | Families, including children and relatives who can share a phone. | **Try it with sample data**. | Clear; the complete primary action is visible. |
| 1440×900 desktop | Party games on one shared TV. | Families sharing a TV. | **Try it with sample data**. | Clear; the complete primary action is visible. |

The first screen states “Party games for one shared TV”, “For families sharing
one TV…”, and “Try it with sample data”. It answers the job, audience, and next
action within one screen at both sizes.

## Findings

### F-3-1 — The Privacy page promises account-free real play without a listed claim

- Severity: BLOCKING.
- Exact quote/location: `/privacy`: “Living Room Lobby works without accounts.”
- Evidence: `account-free-sample` proves an unauthenticated **sample** visit only.
  `shared-tv-phone-round` creates and joins a room, but its declared claim does
  not promise account-free real play and its assertion does not inspect
  credentials, cookies, or account UI. No claim entry names this Privacy-page
  assurance.
- Why this matters: a family deciding whether to use a real room can reasonably
  rely on this statement; proving only the demo does not prove the stated scope.
- Concrete fix: add one `no-account-required` claim, for example “Starting or
  joining a real room does not require an account”, with one fresh desktop-host
  and 390 px phone test that creates and joins a real room and asserts no sign-in
  control, authorization credential, or account cookie. Otherwise rewrite the
  policy to the narrower, already proved “The sample works without an account.”

### F-3-2 — The Privacy page states the real-room session storage mechanism without a listed claim

- Severity: BLOCKING.
- Exact quote/location: `/privacy`, **On your device**: “A room session stays in
  session storage.”
- Evidence: no claim in `.factory/claims.json` names real-room session storage.
  `demo-sandbox` covers only `demo:` keys. `minimal-join-data` covers form
  fields, not the post-join storage boundary.
- Why this matters: this is a privacy/data-retention assurance for real-room
  visitors, and it is materially different from the demo namespace.
- Concrete fix: add a `real-room-session-storage` claim with a clean real-room
  host/join test that asserts the session is in session storage, not local
  storage, and is removed on Close room; or remove this implementation detail
  from the public policy.

### F-3-3 — The Privacy page promises browser-settings deletion without a listed claim

- Severity: BLOCKING.
- Exact quote/location: `/privacy`, **On your device**: “You can clear either
  in browser settings.”
- Evidence: no listed test exercises the documented deletion route. The existing
  Start-for-real test clears demo keys, which is not the stated real-room and
  license-data browser-settings action.
- Why this matters: it tells a privacy-conscious visitor how to remove data,
  but the page offers no product-specific evidence that the described data is
  actually limited to clearable browser storage.
- Concrete fix: delete this browser-general promise, or add a claim test that
  seeds a real-room session and license fixture, clears site storage in a fresh
  context, reloads, and verifies neither is restored.

## Copy audit

Counts treat hyphenated compounds, paths, emoji, and labels as one word. Command
blocks are commands, not sentences. No landing or README item exceeds 22 words,
uses banned marketing language, a mood heading, inconsistent game terminology,
or a non-result-naming action. `F-3-1`–`F-3-3` are Privacy-page claim findings,
not landing/README copy failures.

### Landing page

| Copy | Words | Check |
| --- | ---: | --- |
| Skip to the game | 4 | clear action |
| Living Room Lobby | 3 | wordmark |
| Demo | 1 | clear navigation |
| Privacy | 1 | clear navigation |
| Ready | 1 | status |
| Party games for one shared TV | 6 | shared-tv-phone-round |
| Play together on your TV. | 5 | plain headline |
| For families sharing one TV, these games let kids and relatives play without everyone needing a phone. | 17 | shared-tv-phone-round |
| Try it with sample data | 5 | result-naming action |
| Start a real room | 4 | result-naming action |
| Join a room | 3 | result-naming action |
| See a ready Draw Together round with three sample players. | 10 | demo-sandbox |
| Try the sample without an account. | 6 | account-free-sample |
| Sample play never changes a real room. | 7 | demo-real-room-isolation |
| Extra games are not available yet. | 6 | family-pack-unavailable |
| Use a TV remote to move and choose. | 9 | remote-controls |
| The TV shows the game while players share or use phones. | 10 | shared-tv-phone-round |
| Enter the room code | 4 | clear heading |
| Use the code shown on the TV. | 7 | join-code-path |
| Room code | 2 | clear label |
| Your name or family name | 5 | clear label |
| How are you playing? | 4 | clear label |
| My own phone | 3 | clear option |
| Pass one phone | 3 | shared-phone |
| Join room | 2 | result-naming action |
| Choose how to play | 4 | clear heading |
| Three ways to play | 4 | clear heading |
| TV remote | 2 | clear label |
| Host with arrows and OK. | 5 | remote-controls |
| Shared phone | 2 | clear label |
| Pass it after each turn. | 5 | shared-phone |
| Personal phone | 2 | clear label |
| Use the TV room code to join. | 7 | join-code-path |
| Games | 1 | clear section label |
| Choose a game | 3 | clear heading |
| Use the left and right arrow keys to browse all free games. | 12 | remote-controls |
| Draw Together | 2 | consistent name |
| Everyone draws on one shared TV picture. | 8 | shared-tv-canvas |
| 2–10 players | 2 | player-count-limits |
| Point Panic | 2 | consistent name |
| Aim your phone. | 3 | point-controls |
| Hit the shape. | 3 | point-controls/core-room-flow |
| 2–10 players | 2 | player-count-limits |
| Pass & Guess | 3 | consistent name |
| One phone. | 2 | shared-phone |
| Everyone plays. | 2 | shared-phone/shared-tv-phone-round |
| 3–12 players | 2 | player-count-limits |
| Privacy | 1 | clear section label |
| What is stored | 3 | clear heading |
| Real rooms keep names, scores, and game actions for up to six hours. | 12 | room-retention |
| Sample data is isolated and expires after 24 hours. | 9 | demo-sandbox |
| A Family Pack license check stays in this browser. | 9 | license-status |
| The app does not load advertising or analytics scripts. | 9 | no-advertising-or-analytics |
| Read privacy details | 3 | result-naming link |
| Family Pack | 2 | clear section label |
| Extra games are not available yet | 6 | clear heading; family-pack-unavailable |
| Buying extra games is not available yet. | 6 | family-pack-unavailable |
| Statue Switch and Colour Chorus stay locked. | 6 | family-pack-unavailable |
| Free games stay free. | 4 | free-game-availability |
| Verify a Family Pack license | 5 | result-naming disclosure |
| License token | 2 | clear label |
| Verify license | 2 | result-naming action |
| Party games for one shared TV. | 6 | shared-tv-phone-round |
| Original AI-assisted artwork | 3 | art-provenance |
| Built by Param Factory | 4 | attribution |

### README

| Copy | Words | Check |
| --- | ---: | --- |
| Living Room Lobby | 3 | clear title |
| Play phone-optional party games together on one shared TV. | 9 | shared-tv-phone-round |
| It is for families with kids and relatives who may share a phone. | 13 | shared-tv-phone-round |
| Try the ready sample at living-room-lobby.sociobot.in/demo. | 6 | demo-sandbox |
| It opens a Draw Together round with Asha, Marcos, and Lee and Bo. | 13 | demo-sandbox |
| The demo saves progress in this browser. | 7 | demo-sandbox |
| Start for real clears that sample progress. | 7 | demo-sandbox |
| Choose Spanish instructions or picture prompts when a player does not read English. | 12 | language-light-round |
| Use the room code or the join page shown by the TV to add a player. | 16 | join-code-path |
| Run locally | 2 | clear heading |
| Install dependencies, then use two terminals: | 6 | clear instruction |
| Open the local address printed by Vite. | 7 | clear instruction |
| The one-click sample is at /demo. | 6 | demo-sandbox |
| Test and build | 3 | clear heading |
| Each visitor-facing claim and its clean-sandbox command is listed in .factory/claims.json. | 9 | documentation fact |
| Deploy | 1 | clear heading |
| Run the checked-in deployment command from a clean committed checkout with the factory deployment access: | 14 | clear instruction |
| Run this command to deploy a committed checkout. | 8 | clear instruction |
| To repeat the public checks: | 5 | clear instruction |
| Privacy and terms | 3 | clear heading |
| Read the live Privacy page and Terms page. | 8 | clear links |
| License | 1 | clear link |
| Design and image provenance | 4 | clear link |

## Demo, privacy, and claims checks

- **Demo:** one click from the landing page and direct `/demo` both opened a
  ready Round 3 Draw Together room with Asha, Marcos, Lee and Bo, a birthday-cake
  prompt, scores, and a visible shared canvas. The persistent banner read
  “Demo — sample data, nothing is saved to a real room”; **Reset demo** restored
  it and **Start for real** removed all `demo:` local/session keys.
- **Isolation and request log:** a fresh demo visit sent only same-origin
  document/assets and `POST /api/demo` requests; it made no `/api/rooms` or
  cross-origin request. A cold 390 px service-worker visit reloaded `/demo`
  offline with the demo banner and Draw Together screen.
- **Claims:** after `npm ci` in a fresh `git clone`, every one of the 20 exact
  commands in `.factory/claims.json` completed successfully. `npm test` also
  passed (6 Vitest, 10 Node, and 21 Rust tests), and `npm run build` produced
  `dist/`.
- **No untested listed claim:** each current claim command passed. The three
  findings above concern assurances missing from the inventory, not a failed
  listed test.

## Earlier findings confirmation

Each earlier finding was rechecked on the live site and in current source.

| Earlier ID | Status | Confirmation |
| --- | --- | --- |
| F-1-1 | Fixed | Primary sample action is wholly visible at 390×844 and 1440×900. |
| F-1-2 | Fixed | Long demo prompt stays above the command rail. |
| F-1-3 | Fixed | English, Español, and picture prompts complete a tested round. |
| F-1-4 | Fixed | Desktop host and 390 px shared-phone round is claimed and tested. |
| F-1-5 | Fixed | The TV room code/join-page path is explained and tested. |
| F-1-6 | Fixed | README framework assertion remains removed. |
| F-1-7 | Fixed | README implementation-stack assertion remains removed. |
| F-1-8 | Fixed | Unsupported old-browser promise remains removed. |
| F-1-9 | Fixed | SQLite/rate-bucket implementation claim remains removed. |
| F-1-10 | Fixed | Single-container promise remains removed. |
| F-1-11 | Fixed | Untested minimum-version promise remains removed. |
| F-1-12 | Fixed | Internal database-path statement remains removed. |
| F-1-13 | Fixed | Runtime-user guarantee remains removed. |
| F-1-14 | Fixed | Build-ID implementation prose remains removed. |
| F-1-15 | Fixed | Deployment invariants prose remains replaced by a command. |
| F-1-16 | Fixed | Long deployment-process claim remains removed. |
| F-1-17 | Fixed | Deployment-abort promise remains removed. |
| F-1-18 | Fixed | Test-coverage claim remains replaced by commands. |
| F-1-19 | Fixed | Browser-suite coverage promise remains replaced by commands. |
| F-1-20 | Fixed | Ungrouped accessibility promise remains removed; Axe passes. |
| F-1-21 | Fixed | Art provenance has a declared source-contract claim. |
| F-1-22 | Fixed | Unknown route is a styled HTTP 404 with shared skeleton and metadata. |
| F-1-23 | Fixed | Forward and Back focus the new h1 and update the polite route status. |
| F-1-24 | Fixed | Landing includes the **What is stored** privacy section. |
| F-1-25 | Fixed | README demo link is absolute and opens the public demo. |
| F-1-26 | Fixed | README demo copy is under 22 words. |
| F-1-27 | Fixed | README hides storage-key jargon. |
| F-1-28 | Fixed | Decorative join label remains absent. |
| F-1-29 | Fixed | Heading says **Enter the room code**. |
| F-1-30 | Fixed | Submit action says **Join room**. |
| F-1-31 | Fixed | Hero explains the TV/phone relationship. |
| F-1-32 | Fixed | Draw Together names the shared-TV result. |
| F-1-33 | Fixed | Game names use title case consistently. |
| F-1-34 | Fixed | Staging-setting instruction remains removed. |
| F-1-35 | Fixed | Demo says **three sample players**. |
| F-2-1 | Fixed | Each game range is enforced at both boundaries in demo and real API tests. |
| F-2-2 | Fixed | Remote test moves focus and presses Enter to open Point Panic. |
| F-2-3 | Fixed | README uses the eight-word deployment instruction. |
| F-2-4 | Fixed | Personal-phone instruction names the TV room code and outcome. |
| F-2-5 | Fixed | Control says **Verify a Family Pack license**. |
| F-2-6 | Fixed | Customer copy says buying extra games is unavailable. |

## Structure, accessibility, and leverage

- `/`, `/demo`, `/?demo=1`, `/privacy`, `/terms`, all public assets, robots,
  sitemap, manifest, and discovered links returned 200. An arbitrary route
  returned the designed HTTP 404. Routes have route-specific titles, one h1,
  one main, description, canonical, OG/Twitter data, favicon, and apple touch
  icon. The sitemap lists all app routes.
- Axe WCAG 2/2.1 A/AA returned zero violations on desktop landing, 390 px demo,
  Privacy, and 404. No console or page errors appeared in the exercised live
  flows. CSP supplies `frame-ancestors` as a header; no remote font, script, or
  analytics request appeared.
- The concrete/moss palette, stamped headings, clipped slabs, command rail, and
  original room art match `.factory/design.md` and are distinct from a generic
  SaaS template.
- No AI step, import/export, or sync is an obvious missing need for this
  temporary local party-game flow. AI would not improve the stated job.

## What would make this perfect

List and prove the three remaining Privacy-page assurances, or narrow/remove
them as specified in `F-3-1`–`F-3-3`. Then rerun the full clean-clone claims
gate and live first-read review. A PASS requires zero unlisted assurances and
zero remaining findings.
