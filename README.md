# Living Room Lobby

Living Room Lobby is a small set of language-light party games made for a
smart-TV browser. It is for multigenerational families who do not have a game
console or laptop at the TV, and for groups where not everyone has—or should
need—a phone.

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
- Compact one-second HTTP polling for old WebKit/Chromium TV browsers
- Six-hour ephemeral rooms; no accounts and no player profiles
- One container serves the compiled frontend and API on `PORT`

## Develop

Requirements: Node 22+, npm, and Rust 1.85+.

```sh
npm install
npm run dev          # frontend on :5173, proxies API to :8080
npm run dev:server   # backend on :8080 in another shell
npm run check
npm test
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

## Testing and accessibility

`npm test` runs prompt/catalogue tests and Rust API room-flow tests. The UI has
a skip link, one page-level heading, labelled controls, visible focus, a remote
D-pad navigation path, 44 px minimum targets, reduced-motion behavior, and
offline feedback. Test a room with one normal tab and one private/mobile tab.

## Privacy and license

See `/privacy` and `/terms` in the running application. Room state expires
after six hours. Family Pack license tokens remain only in the browser’s local
storage and are verified against the Sociobot API at most daily.

MIT licensed. Generated-image provenance and visual tokens are documented in
[`.factory/design.md`](.factory/design.md).
