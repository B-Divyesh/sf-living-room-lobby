# Living Room Lobby polish 2 handoff

## Status

All findings in review 1 and review 2 are repaired. Game capacity is now a real
rule in both the sample and backend. TV remote selection has an observable
Enter/OK test. The three flagged phrases and unsupported README deployment
promise are gone.

The complete finding-by-finding record is in [polish-2.md](polish-2.md).

## Verification

- Every one of the 20 exact `.factory/claims.json` commands passed from fresh
  clone `/tmp/lrl-claims-WjiYdw`.
- `npm test` passed 6 Vitest, 10 Node contract, and 21 Rust tests.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run build` produced `dist/`. Initial assets are 58.02 KB JavaScript and
  19.17 KB CSS before gzip.
- `npm run test:browser` passed desktop, TV, 390 px mobile, 200% text reflow,
  real host/phone play, keyboard/remote, Axe, privacy, rate-limit, and offline
  checks.
- `/opt/fleet/lib/verify-url.sh` passed locally with no console errors.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; FCP 1.4 s, LCP 1.6 s, CLS 0, TBT 10 ms.
- `./scripts/deploy-container.sh --validate-only` passed for port 8080,
  durable `/data`, and one replica.

## Run and verify

```sh
npm ci
npm test
npm run check
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
npm run test:browser
./scripts/deploy-container.sh --validate-only
npm run build
```

## Known gaps

Physical Samsung Tizen, LG webOS, Fire TV Silk, and device-orientation hardware
were unavailable. Chromium 145 covered TV viewports, 390 px touch, remote keys,
the labelled tilt fallback, reduced motion, and offline use.

## Deployment

Deployed commit: `98b506e1632464092cdc4e9add8c3b33265c1d53`.

`./scripts/deploy-container.sh` built and published only
`sf-living-room-lobby`, retained the pre-rollout room, and verified the exact
backend, JavaScript, service-worker cache, footer, and 390 px shared-phone flow.

Cold public checks passed at
`https://living-room-lobby.sociobot.in`:

- all three copy rewrites are present;
- every advertised game boundary is enforced by the live API;
- Arrow navigation plus Enter opens a game in a real room;
- home and demo have zero Axe violations and no console/page errors;
- demo traffic is same-origin, isolated, resettable, and reloads offline;
- titles, canonicals, focus announcements, legal pages, styled 404, and every
  discovered link passed;
- first-screen and prompt/rail geometry passed at 1366×768, 1440×900, and
  1920×1080;
- request 41 returned `429` with `Retry-After: 1` after 40 allowed requests.

Evidence screenshots are
`.factory/evidence/polish-2-live-first-screen.png`,
`.factory/evidence/polish-2-live-player-limit.png`, and
`.factory/evidence/polish-2-live-remote-enter.png`. The URL verifier output is
under `.factory/evidence/polish-2-live-verify/`.
