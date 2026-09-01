# Living Room Lobby demo

Open `/demo` or choose **Try it with sample data** on the landing page.

The demo starts in a ready Draw Together round. Asha, Marcos, and Lee and Bo
are already in the room, with a shared birthday-cake picture prompt and scores. On a
new demo visit, `POST /api/demo` creates a random isolated sample workspace
that expires in 24 hours. It does not use the real `rooms` table. The host can
move to the other shipped games; Pass & Guess includes a shared-phone sample
session for browser tests.

Interactive demo state is browser-local. Initial provisioning also creates an
isolated server-side sample workspace that expires after 24 hours. It never
reads or writes the real `rooms` table:

- `localStorage`: `demo:living-room-lobby:room`
- `sessionStorage`: `demo:living-room-lobby:session`
- `sessionStorage`: `demo:living-room-lobby:workspace`

**Reset demo** restores the shipped sample. **Start for real** removes both
demo keys before returning to `/`; real room keys and room API routes are never
read or written while `/demo` is active.

In the host lobby, choose **English**, **Español**, or **Picture prompts (no
words)** before starting a round. Spanish changes the core host and phone
instructions. Picture prompts show the same prompt as a symbol.
