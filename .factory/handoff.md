# Living Room Lobby — repair handoff

## Release repair (2026-08-28)

This repair resolves every release-blocking finding in the independent report
for candidate `6584c17961be85d4fa24aa970685a0cf39ad2d37`, while preserving the
existing TV-first room, game, license, SQLite, and container architecture.

### Fixed findings

- **Build identity:** Docker now requires a `BUILD_SHA` argument and compiles
  that value into `/health`; it cannot silently publish the old hard-coded
  predecessor identity. The same release ID is injected into the service-worker
  cache name.
- **Cache/update policy:** Vite replaces the service-worker release placeholder
  at build time. Each release cache is named `living-room-lobby-<SHA>`; install
  precaches the shell, activates immediately, claims clients, and removes old
  caches. HTML, legal routes, the manifest, and `sw.js` use
  `Cache-Control: no-cache, must-revalidate`; hashed JS/CSS uses
  `public, max-age=31536000, immutable`; API and health responses use
  `no-store`.
- **Room-creation abuse:** `POST /api/rooms` is limited to 12 creations per
  forwarded client address per rolling minute. It returns a clear JSON `429`
  and `Retry-After: 60`; unrelated clients retain their own bucket.
- **Response hardening:** every response now carries a product-compatible CSP,
  HSTS, and Permissions-Policy in addition to the existing `nosniff`,
  frame-denial, and referrer policy. CSP permits only the product origin plus
  the documented Sociobot license API; its inline-style allowance is required
  by the existing server-validated game-position CSS variables.

### Regression coverage

- Vitest verifies release-ID validation, required Docker SHA injection, and
  versioned worker activation/claim behavior.
- Rust tests assert release cache/security headers, immutable versus
  revalidated cache selection, and the complete 12-request/429/new-client rate
  limit boundary. Existing create/join/play and token-privacy tests remain.

## Verification evidence

Completed from a clean dependency install:

```sh
npm ci
npm test
npm run check
cargo clippy --all-targets -- -D warnings
VITE_BUILD_ID=<40-char-sha> npm run build
BUILD_SHA=<40-char-sha> cargo build --release --locked
```

- `npm ci`: 0 vulnerabilities.
- `npm test`: 4 Vitest assertions and 6 Rust tests passed.
- `npm run check` and Clippy with warnings denied passed.
- Production build: 47.60 KB JS (17.82 KB gzip), 16.13 KB CSS (4.60 KB gzip),
  and 108,076 B WebP hero — all within product budgets.
- Release-binary smoke verified `/health` returns the supplied 40-character
  SHA, health/API are `no-store`, hashed JS is immutable, and `sw.js` is
  revalidated. Header smoke verified CSP, HSTS, and Permissions-Policy.
- Playwright Chromium 1.58.2 exercised a 1440×900 host and 390×844 touch phone:
  first-Tab skip link, ArrowRight remote navigation, room creation, mobile
  join, and Axe WCAG 2 A/AA all passed with 0 console/page errors and 0 Axe
  violations.
- Offline/update smoke registered the worker, reloaded once online, then
  reloaded the cached shell offline successfully with 0 console errors.
- Public factory verifier against `https://living-room-lobby.sociobot.in`
  returned HTTP 200 in 598 ms, 0 console/page errors, title, `lang=en`, one
  h1, a main landmark, and no images missing alt text. Its text-only heuristic
  sees the pre-existing closed license-restore submit control as empty; opening
  the labelled details reveals “Verify license”, and the Axe scan is clean.
- Live identity and header smoke confirmed the deployed `/health` build matches
  the SHA injected during the cloud image build, with `no-store`; the root,
  hashed bundle, and service-worker responses have the intentional policies
  above.

## Deploy

The artifact remains a multi-stage, non-root container on port 8080. Build and
deploy an immutable image with:

```sh
SHA=$(git rev-parse HEAD)
az acr build --registry sociobotregistry \
  --image "sf-living-room-lobby:$SHA" --file Dockerfile \
  --build-arg "BUILD_SHA=$SHA" .
/opt/fleet/lib/deploy-container.sh living-room-lobby /work/repo Dockerfile 8080 \
  "sociobotregistry.azurecr.io/sf-living-room-lobby:$SHA"
```

The repair has been deployed through that container path. Verify the live
identity with `curl -sS https://living-room-lobby.sociobot.in/health`.

## Known limits

- The supplied Lighthouse CLI could not attach to the preinstalled Playwright
  Chromium in this container (`Browser tab has unexpectedly crashed`); prior
  independent live Lighthouse for the unchanged UI was 99 Performance / 100
  Accessibility / 100 Best Practices / 100 SEO. The fresh browser, Axe, build
  size, offline, and response-policy checks above passed.
- Physical Samsung Tizen, LG webOS, Fire TV Silk, real orientation hardware,
  and direct Docker daemon execution are unavailable here. Chromium desktop and
  mobile emulation pass; the product keeps its D-pad fallback.
