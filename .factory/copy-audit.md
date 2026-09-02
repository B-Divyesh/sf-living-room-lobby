# Landing copy audit

Audited 2026-09-02, rechecked in polish round 3. This is the complete visitor-visible copy from the default
landing route (`/`), including header, focused skip link, join panel, game
cards, footer, and the default Family Pack disclosure. Counts treat numbers,
emoji, and hyphenated terms as one word. No sentence exceeds 22 words or uses a
banned plain-words term.

| Landing text | Words | Result |
| --- | ---: | --- |
| Skip to the game | 4 | pass |
| Living Room Lobby | 3 | pass |
| Demo | 1 | pass |
| Privacy | 1 | pass |
| Ready | 1 | pass |
| Party games for one shared TV | 6 | claim: shared-tv-phone-round |
| Play together on your TV. | 5 | pass |
| For families sharing one TV, these games let kids and relatives play without everyone needing a phone. | 17 | claim: shared-tv-phone-round |
| Try it with sample data | 5 | pass |
| Start a real room | 4 | pass |
| Join a room | 3 | pass |
| See a ready Draw Together round with three sample players. | 10 | claim: demo-sandbox |
| Try the sample without an account. | 6 | claim: account-free-sample |
| Sample play never changes a real room. | 7 | claim: demo-real-room-isolation |
| Extra games are not available yet. | 6 | claim: family-pack-unavailable |
| Use a TV remote to move and choose. | 8 | claim: remote-controls |
| The TV shows the game while players share or use phones. | 10 | claim: shared-tv-phone-round |
| Enter the room code | 4 | pass |
| Use the code shown on the TV. | 7 | claim: join-code-path |
| Room code | 2 | pass |
| Your name or family name | 5 | pass |
| How are you playing? | 4 | pass |
| My own phone | 3 | pass |
| Pass one phone | 3 | claim: shared-phone |
| Join room | 2 | pass |
| Choose how to play | 4 | pass |
| Three ways to play | 4 | pass |
| TV remote | 2 | pass |
| Host with arrows and OK. | 5 | claim: remote-controls |
| Shared phone | 2 | pass |
| Pass it after each turn. | 5 | claim: shared-phone |
| Personal phone | 2 | pass |
| Use the TV room code to join. | 7 | claim: join-code-path |
| Games | 1 | pass |
| Choose a game | 3 | pass |
| Use the left and right arrow keys to browse all free games. | 12 | claim: remote-controls |
| Draw Together | 2 | pass |
| Everyone draws on one shared TV picture. | 8 | claim: shared-tv-canvas |
| 2–10 players | 2 | claim: player-count-limits |
| Point Panic | 2 | pass |
| Aim your phone. | 3 | claim: point-controls |
| Hit the shape. | 3 | claim: point-controls |
| Pass & Guess | 3 | pass |
| One phone. | 2 | claim: shared-phone |
| Everyone plays. | 2 | claim: shared-phone |
| 3–12 players | 2 | claim: player-count-limits |
| What is stored | 3 | pass |
| Real rooms keep names, scores, and game actions for up to six hours. | 12 | claim: room-retention |
| Sample data is isolated and expires after 24 hours. | 9 | claim: demo-sandbox |
| A Family Pack license check stays in this browser. | 9 | claim: license-status |
| The app does not load advertising or analytics scripts. | 9 | claim: no-advertising-or-analytics |
| Read privacy details | 3 | pass |
| Family Pack | 2 | pass |
| Buying extra games is not available yet. | 7 | claim: family-pack-unavailable |
| Statue Switch and Colour Chorus stay locked. | 6 | claim: family-pack-unavailable |
| Free games stay free. | 4 | claim: free-game-availability |
| Verify a Family Pack license | 5 | result-naming control |
| License token | 2 | pass |
| Verify license | 2 | pass |
| Terms | 1 | pass |
| Original AI-assisted artwork | 3 | claim: art-provenance |
| Built by Param Factory | 4 | pass |

## Terminology

| Concept | Product word |
| --- | --- |
| TV creator view | host |
| Four-character shared session | room code |
| Phone participant | player |
| One device passed around | shared phone |
| Shipped isolated sample | demo |
| No-word symbols | picture prompts |
| Optional paid games | Family Pack |

## Round 3 catalog and Privacy inventory

`Play phone-optional family games on one shared TV.` is an 8-word, verb-first
catalog description and stays below the 120-character limit.

Round 3 added no landing copy. It registered the three existing Privacy-page
assurances as `no-account-required`, `real-room-session-storage`, and
`browser-storage-clear`; each has one observable browser test.
