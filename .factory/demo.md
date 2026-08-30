# Living Room Lobby demo

Open `/demo` or choose **Try it with sample data** on the landing page.

The demo starts in a ready Draw Together round. Asha, Marcos, and Lee and Bo
are already in the room, with a shared birthday-cake drawing and scores. On a
new demo visit, `POST /api/demo` creates a random isolated sample workspace
that expires in 24 hours. It does not use the real `rooms` table. The host can
move to the other shipped games; Pass & Guess includes a shared-phone sample
session for browser tests.

Demo state is browser-local only:

- `localStorage`: `demo:living-room-lobby:room`
- `sessionStorage`: `demo:living-room-lobby:session`
- `sessionStorage`: `demo:living-room-lobby:workspace`

**Reset demo** restores the shipped sample. **Start for real** removes both
demo keys before returning to `/`; real room keys and room API routes are never
read or written while `/demo` is active.
