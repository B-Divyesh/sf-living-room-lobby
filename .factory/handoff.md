# Living Room Lobby review 2 handoff

## Status: FAIL — adversarial review recorded

This reviewer changed no product code. [Review 2](review-2.md) records the
fresh live and repository review. It found two blocking claim-evidence gaps,
one blocking unlisted README claim, and three minor plain-language findings.

## How verified

- Fresh `npm ci`, then all 20 exact claim commands from `.factory/claims.json`.
- `npm test` and `npm run build`.
- Fresh 390×844 and 1440×900 live browser contexts, `/demo` reset/request/
  storage checks, route/back/focus checks, and same-origin link crawl.
- `npm run test:live -- 5e1b2b708a2da9a73d4cd2357155435a01873cf4 https://living-room-lobby.sociobot.in`.

## Required next steps

1. Enforce and boundary-test the advertised game player ranges.
2. Make `@claim:remote-controls` prove an Enter/OK selection.
3. Remove or test the 31-word README deployment statement.
4. Apply the three copy rewrites in the review and rerun the whole review.

---

# Previous verification 13 handoff

## Status: PASS — independently verified candidate accepted

Candidate `5e1b2b708a2da9a73d4cd2357155435a01873cf4` is accepted at
`https://living-room-lobby.sociobot.in`. The live `/health` endpoint returns
that exact full SHA.

Independent verification is recorded in
[verification-13.md](verification-13.md). It ran all 20 declared claim
commands, `npm test`, type/Rust/format/clippy checks, the full browser suite,
the exact frontend and release-backend builds, and live desktop/mobile/privacy/
offline/accessibility/rate-limit checks. The only unavailable environment check
was a local Docker image build because the verifier container has no Docker
CLI; this is not a product-code defect.

The live API limit was observed at 40 isolated-demo requests per second;
excess requests returned `429` with `Retry-After: 1`.

## Previous repair context

The release-blocking mobile hero defect from independent verification 12 is
fixed. The final source commit containing this handoff is deployed at
`https://living-room-lobby.sociobot.in`; the release verifier checks that exact
commit across `/health`, the service worker cache, JavaScript, footer, and a
real desktop-host plus 390 px shared-phone room.

## What changed

- Reproduced the untouched candidate at 320, 390, 560, and 580 px before
  changing source. The loaded 1200×800 image produced entropy `0.4956` at
  390 px, versus `7.1568` at 580 px. The failed rendered crop is preserved at
  [evidence/repair-13-before-390-hero.png](evidence/repair-13-before-390-hero.png).
- Made the hero picture and inset frame explicit isolated layers, and removed
  the unnecessary inherited height clipping from the 600 px phone treatment.
- Changed the small, high-priority hero to synchronous decoding so Chromium
  paints the below-fold mobile image before its first rendered capture.
- Added `@regression:mobile-hero-artwork`. It checks the real 1200×800 source,
  captures the rendered image at 390×844 without a decode, scroll, delay, or
  style workaround, and requires entropy of at least `3`.
- After the repair, entropy is `7.1425` at 320 px, `7.0297` at 390 px,
  `7.1500` at 560 px, and `7.1568` at 580 px. The repaired 390 px crop is at
  [evidence/repair-13-after-390-hero.png](evidence/repair-13-after-390-hero.png).

The brief, product behavior, visual thesis, generated artwork, claims, demo
isolation, storage model, routes, and deployment class are unchanged.

## Verification evidence

The repair was tested from `npm ci` (94 packages, zero reported
vulnerabilities):

- Before the fix,
  `npm run test:browser -- --grep @regression:mobile-hero-artwork` failed with
  entropy `0.496`. The same exact command passes after the fix.
- `npm test`: 5 Vitest, 9 Node contract, and 19 Rust tests passed.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` passed.
- `npm run test:browser` passed the full desktop and 390 px suite: the new
  pixel regression, host/phone game flows, keyboard and D-pad operation, Axe
  WCAG 2 A/AA checks, 200% text reflow, offline reload/update behavior,
  same-origin privacy, cache policy, and API rate limits.
- Every exact command in `.factory/claims.json` passed: 20 of 20 claims.
- `/opt/fleet/lib/verify-url.sh` passed against the local product with HTTP
  200, no console errors, one h1/main, `lang=en`, alt text, and labelled
  buttons. Measured load time was 526 ms in the local check.
- Lighthouse 13 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.2 s, LCP 1.6 s, CLS 0, TBT 10 ms, 188 KiB transferred.
- Production assets are 57,671 B JavaScript, 19,170 B CSS, and 108,076 B for
  the mobile hero. They remain below the 200 KB, 50 KB, and 300 KB budgets.
- `./scripts/deploy-container.sh --validate-only` passed: container port 8080,
  durable `/data`, and one replica.
- `./scripts/deploy-container.sh` built the final commit through ACR, preserved
  the pre-rollout room through the durable SQLite handover, deployed only
  `sf-living-room-lobby`, and completed its exact live identity and shared-room
  checks.
- Post-deploy URL, response-policy, desktop, 390 px, Axe, privacy, offline,
  and live hero-pixel checks passed. The live 390 px hero exceeds the entropy
  threshold and the response reports the final source identity.

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
BUILD_SHA="$(git rev-parse HEAD)" cargo build --release --locked
npm run test:live -- "$(git rev-parse HEAD)" https://living-room-lobby.sociobot.in
```

The focused visual check is:

```sh
npm run test:browser -- --grep @regression:mobile-hero-artwork
```

## Known gaps

Physical Samsung Tizen, LG webOS, Fire TV Silk, and device-orientation hardware
were unavailable. Chromium 145 covered TV-sized desktop, 320–580 px responsive
artwork, 390 px touch, keyboard/D-pad controls, reduced motion, offline use,
and the labelled tilt fallback.
