# Living Room Lobby repair handoff

## Status: PASS — deployed and publicly verified

This repair addresses every release blocker in independent verification 11 and
the controller's follow-up review without changing the researched product
scope: a shared-TV, phone-optional family game room still works with its real
SQLite backend, sample workspace, and free games.

## Repairs

- Reproduced the verifier's 390×844 / 200% text failure before editing. The
  home document was **583 px** wide for a 390 px viewport; its hero heading was
  **588.86 px** wide and was cut by the hero's `overflow: hidden`.
- Removed fixed grid minimums, allowed the hero grid children to shrink, added
  safe word-break opportunities in the display heading, and removed the
  clipping hero overflow. The mobile header, fixed command rail, play header,
  hero image edge, and toast now wrap or constrain themselves at enlarged text
  instead of expanding the document.
- The repaired Home and Demo at 390×844 / 200% text both measure exactly
  **390 px document width**. Home's heading is 358 px wide with equal client
  and scroll widths; its visible privacy-details control measures
  **304.14×53 px**. Evidence: `repair-12-before-390-200.png`,
  `repair-12-home-390-200.png`, and `repair-12-demo-390-200.png` in
  `.factory/evidence/`.
- The browser suite builds its UI with a 40-character immutable test identity,
  so text-resize coverage also catches a long release id in the footer. Footer
  identity text now wraps safely rather than enlarging the page.
- Added `@regression:mobile-text-resize-reflow`. It opens both Home and Demo
  in fresh touch-enabled 390×844 contexts, forces 200% root text, asserts no
  document overflow or clipped heading, verifies the hero does not hide
  enlarged content, and checks every visible link/button/input/select/summary
  target is at least 44×44 px. The privacy-details link has its own explicit
  44 px minimum target.
- Completed `.factory/copy-audit.md` with all default landing-page copy,
  including the three play modes, all game-card text, restore controls, and
  footer text. Claim mappings remain explicit.
- Kept the dynamic image build identity contract intact. The deployment script
  injects the committed SHA into both frontend and backend and refuses success
  unless `/health`, service-worker cache, footer, JavaScript bundle, and a real
  shared-phone room flow agree on that exact identity.

## Verification

Performed from a clean `npm ci` install:

- `npm test` — passed: 5 Vitest, 9 Node contract, and 19 Rust tests.
- `npm run check`, `cargo fmt --all -- --check`, and
  `cargo clippy --all-targets --locked -- -D warnings` — passed.
- `npm run test:browser` — passed all browser/claim/regression checks,
  including offline reload, request privacy, keyboard remote controls, desktop
  host plus 390 px shared-phone flow, limits, and the new text-resize test.
- `npm run build` — passed. Production assets: 57.63 KB JavaScript
  (21.11 KB gzip), 19.01 KB CSS (5.24 KB gzip), 108,076 B hero WebP.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:18080/` — passed: HTTP 200,
  route title, `lang=en`, one h1, main landmark, image alt, no unlabeled
  buttons, and no console errors.
- Playwright Axe WCAG 2 A/AA smoke checks returned zero violations for desktop
  Home and 390 px Home, Demo, and Privacy. The browser suite uses the same Axe
  integration on its critical host/player screens.
- `./scripts/deploy-container.sh --validate-only` remains the checked-in
  one-replica `/data` container contract. The release deployment runs that
  configuration and the release verifier as its final gate.

## Deployment and live proof

The checked-in deployment completed from a clean committed checkout using the
product's one-replica `/data` configuration. It built the scoped
`sociobotregistry.azurecr.io/sf-living-room-lobby:<commit>` image, retained a
probe room across the handover, and ran `scripts/verify-release.mjs` against
the public origin. That public gate confirmed the same immutable identity in
`/health`, the service-worker cache, footer, and JavaScript asset, then
completed an independent desktop-host/390 px shared-phone join after reload.

The final public 390×844 / 200% text check also passed on both Home and Demo:
each document measured 390 px wide, each h1 fit its 358 px content column, and
every visible interactive target was at least 44×44 px. The privacy-details
link measured 304.14×53 px. Run `./scripts/deploy-container.sh` again only for
a later committed change; it repeats the same identity and durable-state gate.

## Known gaps

No product defect is known from this repair. Physical Samsung Tizen, LG webOS,
Fire TV Silk, and real orientation hardware are not available in the worker;
the browser suite exercises the documented D-pad and labeled phone fallback.
