# Review 2 — Living Room Lobby

## Verdict: FAIL

Reviewed 2026-09-02 from a fresh npm ci checkout at b1bc1e5. The public release identifies product commit 5e1b2b708a2da9a73d4cd2357155435a01873cf4; the checkout differs only by later QA documents. No product code was changed.

The cold first read, one-click demo, routing, privacy request log, and visual identity pass. The product fails because two retained claims are not tested as promised, a 31-word README deployment promise has no claim entry, and three visible phrases fail the plain-words check.

## Cold first read

No scrolling was used before recording these answers.

| Context | What does this do? | For whom? | What should I click first? | Result |
| --- | --- | --- | --- | --- |
| 390×844 phone | Party games played on one TV. | Families with children and relatives who may share a phone. | **Try it with sample data**. | Pass; complete action y=598.52–652.52. |
| 1440×900 desktop | Party games played on one TV. | Families sharing a TV. | **Try it with sample data**. | Pass; complete action y=734.25–788.25. |

The first screen says “Party games for one shared TV”, identifies families sharing a TV, and gives the sample action. It answers the job, audience, and first action in both requested viewports.

## Findings

### F-2-1 — Player-limit claim is only a label test, and the advertised limits are not enforced

- Severity: blocking.
- Exact quote/location: “2–10 players” for **Draw Together** and **Point Panic**; “3–12 players” for **Pass & Guess**; claim player-count-limits.
- Evidence: checkPlayerCountLimits() only checks displayed text and opens the free games with the seeded three-player room. It never tests a minimum, maximum, or rejection. src/rooms.rs:545 limits every room only at 12 players, while startGame() has no game-specific minimum or maximum check. Draw Together can start with one, 11, or 12 players despite its displayed 2–10 range.
- Why this misleads: hosts can reasonably plan a group from exact capacity labels; the test proves typography, not capacity.
- Concrete fix: enforce each game’s minPlayers and maxPlayers with an actionable message, or call the labels recommendations. Add a clean tagged test that proves the minimum and maximum work and the next player outside each range cannot start that game.

### F-2-2 — The remote-control claim does not test choosing

- Severity: blocking.
- Exact quote/location: “Use a TV remote to move and choose.”; claim remote-controls.
- Evidence: checkRemoteControls() at frontend/e2e/product-regression.mjs:663 presses ArrowRight and asserts focus movement only. It never presses Enter/OK or asserts a game or round action happens. Its sandbox description says only “use ArrowRight to move focus”.
- Why this misleads: remote operation is central to a smart-TV game. Focus movement does not establish choosing.
- Concrete fix: in the one @claim:remote-controls test, focus a game, use Arrow keys, press Enter, and assert its playable screen opens; repeat for the command rail or remove “and choose”.

### F-2-3 — README reintroduces an unlisted deployment claim and exceeds the copy limit

- Severity: blocking.
- Exact quote/location: README Deploy: “The command builds the exact Git SHA, preserves a probe room across the /data handoff, then checks /health, the service worker, JavaScript, footer, and a real desktop-host plus 390 px shared-phone join.”
- Evidence: 31 words; no .factory/claims.json entry. It combines build identity, durable storage, and six checks. This reopens the intent of review-1 F-1-16, which removed an unlisted long deployment-process promise.
- Why this misleads: maintainers may rely on all those outcomes, yet no listed observable test proves them.
- Concrete fix: remove the promise and retain the command, or split it into short facts with matching contract tests. Plain replacement: “Run this command to deploy a committed checkout.”

### F-2-4 — “Scan once” is unexplained and leaves the earlier join-path repair incomplete

- Severity: minor.
- Exact quote/location: **Personal phone**: “Scan once.”
- Evidence: it says neither what to scan nor the result. join-code-path follows an href and does not verify a QR scan flow. This is a partial regression of review-1 F-1-5.
- Why this loses a first-time visitor: a phone user does not know that the TV presents a room code or that scanning should open a join page.
- Concrete fix: replace it with “Use the TV room code to join.” If QR scanning remains the intended instruction, say “Scan the TV code to open the join page” and test the rendered QR payload.

### F-2-5 — “Check it” does not name the result of the Family Pack control

- Severity: minor.
- Exact quote/location: Family Pack disclosure: “Have a Family Pack license from an earlier purchase? Check it”.
- Why this loses a first-time visitor: the control opens license verification but does not name that result.
- Concrete fix: label it **Verify a Family Pack license**.

### F-2-6 — “Hosted checkout” is implementation jargon in a customer status message

- Severity: minor.
- Exact quote/location: “Hosted checkout is being set up.”
- Why this loses a first-time visitor: “hosted” is an internal delivery detail, not a customer outcome.
- Concrete fix: “Buying extra games is not available yet.” The existing unavailable-checkout claim can test it.

## Copy audit

Counts treat hyphenated words, emoji, paths, and labels as one word. Command blocks are commands rather than sentences. All unflagged copy is at or below 22 words, concrete, and consistently names room code, host, player, shared phone, demo, picture prompts, and Family Pack.

### Landing page

| Copy | Words | Result |
| --- | ---: | --- |
| Skip to the game | 4 | pass |
| Living Room Lobby | 3 | pass |
| Demo | 1 | pass |
| Privacy | 1 | pass |
| Ready | 1 | pass |
| Party games for one shared TV | 6 | shared-tv-phone-round |
| Play together on your TV. | 5 | pass |
| For families sharing one TV, these games let kids and relatives play without everyone needing a phone. | 17 | shared-tv-phone-round |
| Try it with sample data | 5 | result-naming action |
| Start a real room | 4 | result-naming action |
| Join a room | 3 | result-naming action |
| See a ready Draw Together round with three sample players. | 10 | demo-sandbox |
| Try the sample without an account. | 6 | account-free-sample |
| Sample play never changes a real room. | 7 | demo-real-room-isolation |
| Extra games are not available yet. | 6 | family-pack-unavailable |
| Use a TV remote to move and choose. | 9 | F-2-2 |
| The TV shows the game while players share or use phones. | 10 | shared-tv-phone-round |
| Enter the room code | 4 | clear heading |
| Use the code shown on the TV. | 7 | join-code-path |
| Room code | 2 | pass |
| Your name or family name | 5 | pass |
| How are you playing? | 4 | pass |
| My own phone | 3 | pass |
| Pass one phone | 3 | shared-phone |
| Join room | 2 | result-naming action |
| Choose how to play | 4 | clear heading |
| Three ways to play | 4 | clear heading |
| TV remote | 2 | pass |
| Host with arrows and OK. | 5 | remote-controls |
| Shared phone | 2 | pass |
| Pass it after each turn. | 5 | shared-phone |
| Personal phone | 2 | pass |
| Scan once. | 2 | F-2-4 |
| Games | 1 | clear section label |
| Choose a game | 3 | clear heading |
| Use the left and right arrow keys to browse all free games. | 12 | remote-controls |
| Draw Together | 2 | pass |
| Everyone draws on one shared TV picture. | 8 | shared-tv-canvas |
| 2–10 players | 2 | F-2-1 |
| Point Panic | 2 | pass |
| Aim your phone. | 3 | point-controls |
| Hit the shape. | 3 | point-controls |
| 2–10 players | 2 | F-2-1 |
| Pass & Guess | 3 | pass |
| One phone. | 2 | shared-phone |
| Everyone plays. | 2 | shared-phone |
| 3–12 players | 2 | F-2-1 |
| Privacy | 1 | clear section label |
| What is stored | 3 | clear heading |
| Real rooms keep names, scores, and game actions for up to six hours. | 12 | room-retention |
| Sample data is isolated and expires after 24 hours. | 9 | demo-sandbox |
| A Family Pack license check stays in this browser. | 9 | license-status |
| The app does not load advertising or analytics scripts. | 9 | no-advertising-or-analytics |
| Read privacy details | 3 | result-naming link |
| Family Pack | 2 | clear section label |
| Extra games are not available yet | 6 | family-pack-unavailable |
| Hosted checkout is being set up. | 6 | F-2-6 |
| Statue Switch and Colour Chorus stay locked. | 6 | family-pack-unavailable |
| Free games stay free. | 4 | free-game-availability |
| Have a Family Pack license from an earlier purchase? Check it | 11 | F-2-5 |
| License token | 2 | pass |
| Verify license | 2 | clear action |
| Party games for one shared TV. | 6 | shared-tv-phone-round |
| Original AI-assisted artwork | 3 | art-provenance |
| Built by Param Factory | 4 | pass |

### README

| Copy | Words | Result |
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
| Install dependencies, then use two terminals: | 6 | clear developer instruction |
| Open the local address printed by Vite. | 7 | developer instruction |
| The one-click sample is at /demo. | 6 | demo-sandbox |
| Test and build | 3 | clear heading |
| Each visitor-facing claim and its clean-sandbox command is listed in .factory/claims.json. | 9 | documentation fact |
| Deploy | 1 | clear heading |
| Run the checked-in deployment command from a clean committed checkout with the factory deployment access: | 14 | developer instruction |
| The command builds the exact Git SHA, preserves a probe room across the /data handoff, then checks /health, the service worker, JavaScript, footer, and a real desktop-host plus 390 px shared-phone join. | 31 | F-2-3; >22, jargon, unlisted |
| To repeat the public checks: | 5 | clear instruction |
| Privacy and terms | 3 | clear heading |
| Read the live Privacy page and Terms page. | 8 | clear links |
| License | 1 | clear link |
| Design and image provenance | 4 | clear link |

## Demo and sandbox

The first action opened /demo in one click. Its first screen was an active Draw Together round, not setup: round 3, three players, and 🎂 BIRTHDAY CAKE. The persistent banner said “Demo — sample data, nothing is saved to a real room”, gave the 24-hour workspace note, and exposed **Reset demo** and **Start for real**.

A fresh live context used only demo:living-room-lobby:* local/session keys. Its request log contained same-origin page assets and POST /api/demo; it contained neither /api/rooms nor a cross-origin request. Reset reprovisioned the sample without console errors. The declared sandbox test verifies Start-for-real cleanup.

## Claims gate

After fresh npm ci, every exact command in .factory/claims.json was run individually. All 20 commands completed without a failing test. npm test passed (5 Vitest, 9 Node, 19 Rust tests); npm run build produced dist/; and npm run test:live -- 5e1b2b708a2da9a73d4cd2357155435a01873cf4 https://living-room-lobby.sociobot.in passed identity plus a real desktop-host/390 px shared-phone probe.

That does not clear F-2-1 or F-2-2: the passing assertions are narrower than the claims, leaving capacity and Enter/OK selection untested.

## Earlier finding confirmation

| Earlier finding | Confirmation |
| --- | --- |
| F-1-1 | Fixed: sample action fully visible at 390×844 and 1440×900. |
| F-1-2 | Fixed: current demo prompt and command rail do not overlap; geometry regression remains. |
| F-1-3 | Fixed: English, Español, and picture prompts are present and tagged test covers translated/symbol rounds. |
| F-1-4 | Fixed: shared-TV/390 px shared-phone claim performs draw and score flow. |
| F-1-5 | Partly fixed by join-page testing, reopened by F-2-4’s unexplained scan wording. |
| F-1-6–F-1-21 | Fixed except the intent of F-1-16, reopened by F-2-3. Earlier unsupported implementation claims are gone. |
| F-1-22 | Fixed: arbitrary live route returns styled 404 with metadata, navigation, footer, and recovery. |
| F-1-23 | Fixed: Privacy navigation and Back focus h1 and update the polite route status. |
| F-1-24 | Fixed: landing has **What is stored** with four plain facts. |
| F-1-25 | Fixed: README points to absolute live /demo. |
| F-1-26–F-1-35 | Fixed except F-2-4–F-2-6. Earlier long demo copy, storage jargon, figurative join copy, capitalization, and sample-family wording are absent. |

## Structure, privacy, identity, and leverage

- /, /demo, /privacy, /terms, robots, sitemap, manifest, and every discovered same-origin link returned 200. Arbitrary route returned the designed 404 with HTTP 404.
- Checked routes have route-specific titles, one h1, one main, canonical, description, favicon, apple-touch, and OG/Twitter data. Privacy navigation and Back move focus to the h1 and update the live route message without console errors.
- A fresh demo request log remained same-origin. Response CSP includes frame-ancestors none; no remote font/script loaded.
- The concrete/moss, clipped-slab, chalk-display identity and original room art are distinct from a generic SaaS template and match .factory/design.md.
- No missed AI, import/export, or sync feature is implied by the brief. A model step would not improve this local, language-light party-game core.

## What would make this perfect

Enforce and boundary-test every player range; make the remote claim press Enter/OK; remove or test the README deployment statement; and apply the three copy rewrites above. Then rerun the full cold/live review. PASS requires zero findings and no behavior asserted only by copy.
