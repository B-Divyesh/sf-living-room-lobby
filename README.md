# Living Room Lobby

Living Room Lobby brings phone-optional party games to a smart-TV browser. It
is for multigenerational families sharing one screen.

Open [/demo](/demo) or choose **Try it with sample data** on the landing page
to see a ready Draw Together round with Asha, Marcos, and Lee and Bo. A demo
visit gets its own 24-hour sample workspace. Playable state uses
`demo:living-room-lobby:` browser storage and is discarded by **Start for
real**. It never uses or changes a real room.

The free room includes:

- **Draw together:** every connected phone contributes to one TV canvas.
- **Point panic:** tilt a phone or use the accessible arrow pad to aim.
- **Pass & guess:** one shared phone moves around the room after every clue.

The optional $12 one-time Family Pack adds Statue switch and Colour chorus.
Purchases use Sociobot’s hosted license checkout; this repository contains no
payment-provider code or product IDs.

## Architecture

- Vite + strict TypeScript, with no UI framework or hosted assets
- Rust 2021, Axum, and SQLite via SQLx
- HTTP polling for old WebKit/Chromium TV browsers
- Local room sessions and no player profiles
- One container serves the compiled frontend and API on `PORT`

## Develop

Requirements: Node 22+, npm, and Rust 1.85+.

```sh
npm install
npm run dev          # frontend on :5173, proxies API to :8080
npm run dev:server   # backend on :8080 in another shell
npm run check
npm test
npm run test:browser  # production-browser, keyboard, Axe, offline, and privacy checks
npm run build        # reproducible frontend output in dist/
```

The server defaults to `sqlite://data/lobby.db?mode=rwc`. Override with
`DATABASE_URL`; set `PORT` to change the default `8080`. Set
`VITE_BILLING_BASE` only when building for the factory’s staging billing API.

## Container

```sh
docker build --build-arg BUILD_SHA="$(git rev-parse HEAD)" -t living-room-lobby .
docker run --rm -p 8080:8080 -v lobby-data:/app/data living-room-lobby
```

Open `http://localhost:8080`. The production image runs as an unprivileged
user and starts with only `PORT` configured. `BUILD_SHA` defaults to `dev` for
plain local builds; the factory supplies the full immutable commit SHA during
its tarball build, and the compiled `/health` response identifies that release.

For the factory deployment, run `./scripts/deploy-container.sh` from a clean,
committed checkout with Azure access. Its checked-in
`.factory/container-app.json` deliberately fixes both replica counts at one:
room state and per-client limits use local SQLite and process memory. Do not
scale this deployment until those stores are replaced by shared services.

## Testing and accessibility

`npm test` runs prompt/catalogue tests and Rust API room-flow tests. `npm run
test:browser` starts a clean local product server and verifies desktop and 390
px flows, keyboard/remote controls, Axe WCAG 2 A/AA checks, real host/phone
play, immediate room reads, demo privacy, and a cold-cache offline reload. The
claim commands live in [`.factory/claims.json`](.factory/claims.json) and all
start from the demo route.

The UI has a skip link, one page-level heading, labelled controls, visible
focus, a keyboard-scrollable mobile game catalogue, a remote D-pad navigation
path, 44 px navigation targets, reduced-motion behavior, and offline feedback.

## Privacy and license

See `/privacy` and `/terms` in the running application. Family Pack license
tokens remain in the browser’s local storage.

MIT licensed. Generated-image provenance and visual tokens are documented in
[`.factory/design.md`](.factory/design.md).
