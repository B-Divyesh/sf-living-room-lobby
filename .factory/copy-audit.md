# Landing copy audit

Audited 2026-09-01. Counts treat a number and a hyphenated term as one word.
No landing sentence exceeds 22 words or contains a banned plain-words term.

| Landing text | Words | Result |
| --- | ---: | --- |
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
| The TV shows the game while players share or use phones. | 10 | claim: shared-tv-phone-round |
| Enter the room code | 4 | pass |
| Use the code shown on the TV. | 7 | claim: join-code-path |
| Join room | 2 | pass |
| Everyone draws on one shared TV picture. | 8 | claim: shared-tv-canvas |
| What is stored | 3 | pass |
| Real rooms keep names, scores, and game actions for up to six hours. | 12 | claim: room-retention |
| Sample data is isolated and expires after 24 hours. | 9 | claim: demo-sandbox |
| A Family Pack license check stays in this browser. | 9 | claim: license-status |
| The app does not load advertising or analytics scripts. | 9 | claim: no-advertising-or-analytics |
| Statue Switch and Colour Chorus stay locked. | 6 | claim: family-pack-unavailable |

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
