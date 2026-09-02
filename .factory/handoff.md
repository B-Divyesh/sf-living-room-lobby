# Living Room Lobby review 3 handoff

## Status

**FAIL — review only; no product code changed.**

The live product passes the demo, listed claim, routing, accessibility, and
earlier-finding checks. `.factory/review-3.md` records three blocking unlisted
privacy assurances that need claim entries/tests or copy changes.

## What was done

- Performed a fresh cold live review at 390×844 and 1440×900.
- Exercised `/demo`, Reset demo, Start for real, request logging, storage
  isolation, and cold offline reload.
- Ran every one of the 20 exact `.factory/claims.json` commands from a fresh
  `git clone` after `npm ci`; all passed.
- Ran `npm test` and `npm run build`; both passed.
- Checked all public routes, metadata, links, back/focus behavior, 404, and Axe
  WCAG 2/2.1 A/AA on representative desktop/mobile routes.
- Reconfirmed every finding from review 1 and review 2 against live behavior
  and current source.

## Remaining work

Resolve `F-3-1` through `F-3-3` in `.factory/review-3.md`. They concern
unlisted statements on `/privacy`; no behavior failed during this review.

## How to verify

```sh
npm ci
npm test
npm run build
```

Then run each command in `.factory/claims.json` from a clean checkout and
review `https://living-room-lobby.sociobot.in` at `/`, `/demo`, `/privacy`, and
`/terms`.
