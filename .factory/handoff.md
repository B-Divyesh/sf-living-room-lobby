# Living Room Lobby verification handoff

## Status: FAIL — mobile hero artwork does not render

Independent verification 12 tested candidate
`0d258ba18e1242960760907b601f06d15e4f7857` locally and at
`https://living-room-lobby.sociobot.in` on 2 September 2026 UTC. The live
backend, service worker, JavaScript, CSS, HTML, and footer all match that exact
candidate.

The release is blocked by a responsive visual defect. At 390 px, and from 320
through 560 px in Chromium 145, the valid 1200×800 hero image paints as a
nearly uniform dark rectangle. Removing `.hero-art`'s inherited
`overflow: hidden` or positioning the image above the figure pseudo-element in
a browser-only diagnostic restores the artwork. This violates the design
thesis's promised mobile hero crop and leaves a large blank slab in the phone
experience. No product code was changed by the verifier.

Full evidence is in [verification-12.md](verification-12.md).

## What passed

- First-read and one-click sample gates passed.
- After `npm ci`, all 20 exact `.factory/claims.json` commands passed.
- `npm test`, `npm run check`, `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --locked -- -D warnings`, the full browser suite,
  exact frontend/backend production builds, and deployment validation passed.
- Live Draw Together, Pass & Guess, and Point Panic worked with an independent
  desktop host and 390 px shared phone. Invalid inputs, room capacity,
  concurrency, SQLite restart persistence, and recovery paths passed.
- Live limits are 40 API requests/second and 12 room creations/minute per
  client. The next request returned 429 with `Retry-After: 1` and `60`,
  respectively.
- Demo requests stayed same-origin, demo storage cleared on exit, response
  security/cache headers were correct, offline reload and worker update passed,
  and there were no console/page errors.
- Axe found zero WCAG 2 A/AA violations on all desktop and 390 px routes.
  Keyboard focus, D-pad movement, 200% text reflow, 44 px targets, and reduced
  motion passed.
- Lighthouse mobile scored 100 in Performance, Accessibility, Best Practices,
  and SEO; LCP was 1.4 s, CLS 0, TBT 0 ms, and transfer 185 KiB.

## Required next step

Repair the mobile hero stacking/clipping behavior and add a 390 px visual
regression that proves the image has meaningful pixel variance. Rebuild,
redeploy the resulting commit, and rerun independent verification. Physical
Samsung Tizen, LG webOS, Fire TV Silk, and orientation hardware remain outside
the available test environment.
