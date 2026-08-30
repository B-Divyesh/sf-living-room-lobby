# Living Room Lobby — visual thesis

## Direction: brutalist concrete and moss

Living Room Lobby should feel like a durable community play-space built into the
room, not a glossy phone app enlarged for a television. Broad concrete slabs,
painted court markings, stamped labels, and soft moss-like colour make the UI
legible from a sofa while keeping it welcoming to children and older relatives.
The interface is deliberately physical: selected controls rise, timers are solid
blocks, and players appear as numbered pebbles.

The product is single-mode dark because it is intended for a television in a
shared evening room. Every screen explicitly paints its background.

## Tokens

- `--ink: #f5f3e8` — warm chalk; primary text on dark concrete (12.5:1).
- `--night: #151a17` — charcoal-black room background.
- `--concrete: #2b322e` — primary slabs and panels.
- `--concrete-raised: #3c453f` — selected/focused surfaces.
- `--moss: #b7d43d` — living accent and primary action; paired with `#11150f`
  (10.8:1).
- `--lichen: #d9e7a3` — secondary highlight.
- `--clay: #ff8a5b` — warm team/action colour.
- `--sky: #82c7d8` — cool team/action colour.
- `--warning: #ffd166`, `--danger: #ff7b74`, `--success: #a8db78`.
- Texture is made in CSS with a low-opacity radial speckle, never a large
  decorative download.

## Type

- Display: `Arial Black`, `Arial`, system sans-serif. Its broad, compressed mass
  reads as stencilled recreation-centre signage from across a room.
- Utility/body: `Trebuchet MS`, `Segoe UI`, system sans-serif for friendly open
  counters and high legibility. No remote font requests.
- Scale: 16, 18, 24, 36, 56, and fluid 72–112 px for game prompts. Numbers use
  tabular figures. Copy measure never exceeds 68 characters.

## Spacing and shape

An 8 px base rhythm with 4 px for micro-alignment. Page gutters are 16 px on
phones and 4vw on TVs. Controls are at least 48 px high on phones and 64 px in
TV mode. Corners are clipped rather than softly rounded: 2–8 px radii, 3 px
borders, and hard 6 px shadows. Cards only separate actual choices or players.

## Interaction grammar

The host is fully operable by remote D-pad: arrows move among choices, Enter
activates, Escape goes back. A bright moss outline and hard shadow communicate
focus. Primary buttons depress by 3 px. Player phones use oversized single-task
controls with labels plus symbols. Status always includes words or shapes, never
colour alone. Network state is announced in a live region.

## Motion

State transitions use 180–240 ms opacity and short vertical transforms. Score
pebbles move with a single 300 ms ease-out. The drawing and tilt games contain no
ambient animation. Under `prefers-reduced-motion`, transforms and transitions are
disabled, countdown steps become instant, and no information is lost.

## Asset plan and provenance

One generated hero illustration establishes the shared-room world. All interface
marks, game icons, QR-like join tile, moss texture, and player pebbles are authored
in HTML/CSS/SVG and remain crisp on large TVs.

### Prompt sheet

- Subject: an empty multigenerational family play-space suggested through chairs,
  cushions, a TV, one shared phone, chalk gestures, and playful abstract figures;
  no identifiable people.
- World/materials: cast concrete wall and floor, moss growing in seams, cut-paper
  game tokens, chalk and screen glow.
- Light/lens: warm evening practical light, frontal editorial wide composition,
  slight axonometric depth, generous dark negative space.
- Palette words: charcoal concrete, warm chalk, vivid moss, clay orange, muted sky.
- Medium: tactile screen-print collage with crisp block shapes and subtle grain.
- Negative list: no text, no letters, no numbers, no logos, no watermark, no
  branded controllers, no photoreal faces, no gradients, no glossy app mockup.

Generated asset: `frontend/public/assets/lobby-hero.webp`, created 2026-08-27
using the Param Factory Azure image deployment via `/opt/fleet/lib/gen-image.sh`.
The complete prompt is stored at `assets/src/lobby-hero.prompt.json`. The asset is
original AI-generated artwork for this product and is disclosed in the footer.
`frontend/public/assets/lobby-social.webp` is a 1200×630 WebP crop derived from
that same original hero for Open Graph and Twitter previews; it introduces no
new imagery or text.

## Responsive intent

At TV widths the setup steps and hero share the screen and game controls remain
in a bottom command rail. At phone widths, the atmospheric hero becomes a shallow
header crop, setup stacks, and play screens show exactly one action at a time.
Join screens hide host-only controls. Safe-area padding protects bottom actions.
