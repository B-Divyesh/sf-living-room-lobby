# Living Room Lobby

Play phone-optional party games together on one shared TV. It is for families
with kids and relatives who may share a phone.

Try the ready sample at [living-room-lobby.sociobot.in/demo](https://living-room-lobby.sociobot.in/demo).
It opens a Draw Together round with Asha, Marcos, and Lee and Bo. The demo
saves progress in this browser. **Start for real** clears that sample progress.

Choose Spanish instructions or picture prompts when a player does not read
English. Use the room code or the join page shown by the TV to add a player.

## Run locally

Install dependencies, then use two terminals:

```sh
npm ci
npm run dev:server
```

```sh
npm run dev
```

Open the local address printed by Vite. The one-click sample is at `/demo`.

## Test and build

```sh
npm test
npm run check
npm run test:browser
npm run build
```

Each visitor-facing claim and its clean-sandbox command is listed in
[`.factory/claims.json`](.factory/claims.json).

## Deploy

Run the checked-in deployment command from a clean committed checkout with the
factory deployment access:

```sh
./scripts/deploy-container.sh
```

## Privacy and terms

Read the live [Privacy page](https://living-room-lobby.sociobot.in/privacy)
and [Terms page](https://living-room-lobby.sociobot.in/terms).

[License](LICENSE) · [Design and image provenance](.factory/design.md)
