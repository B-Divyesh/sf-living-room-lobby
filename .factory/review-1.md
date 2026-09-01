# Review 1 — Living Room Lobby

## Verdict: FAIL

Reviewed on 1 September 2026 against the live site and checkout
`b6b1cb223f480f94dab22a0f803091c06fcba351`. The live application identifies
release `e46876d434aa1df25d4e8ffc3d50a005b945a3a9`; the checkout differs from that
release only in earlier verification documents.

There are three blocking findings. The first action is below a common desktop
viewport, the seeded Draw Together prompt is partly covered on desktop/TV
layouts, and the shipped English-only play flow does not yet satisfy the brief's
non-English-relative use case. All listed claim tests pass, but claims coverage
is incomplete for statements in the landing page and README. Minor copy and
route-structure findings also remain.

## Cold first read

No scrolling was used before recording these answers.

| Context | What does it do? | For whom? | What should I click first? | Result |
| --- | --- | --- | --- | --- |
| 390×844 phone | It provides party games played around one TV. | Families, including kids and relatives who do not each have a phone. | **Try it with sample data**. | Clear; the action occupies `y=548.33–602.33` and is fully visible. |
| 1366×768 desktop | It provides party games played around one TV. | Families, including kids and relatives who do not each have a phone. | Cannot confirm without scrolling. | Blocking; the action starts at `y=831.33`, below the 768 px viewport. |
| 1440×900 desktop confirmation | The purpose and audience are clear. | Families sharing one TV. | **Try it with sample data** is readable at the bottom edge. | The control occupies `y=849.89–903.89`, so it is clipped by 3.89 px. |

The exact first-screen copy is useful: “Play together on your TV” and “For
families sharing one TV, these games let kids and relatives play without
everyone needing a phone.” The desktop layout, rather than those words, prevents
the first action from consistently appearing on the first screen.

## Blocking findings

### F-1-1 — Primary sample action is below the desktop first screen

- Exact location: landing hero, **Try it with sample data**.
- Observed: at 1366×768 the control begins at `y=831.33`; at 1440×900 its lower
  3.89 px is clipped. The 390×844 layout is correct.
- Impact: a first-time desktop or TV-browser visitor cannot confirm what to
  select first without scrolling.
- Required fix: use a height-aware hero type scale and spacing rule so the
  complete primary action remains within the initial viewport at 1366×768,
  1440×900, and 1920×1080. Add a browser assertion that its bounding box has
  `top >= 0` and `bottom <= innerHeight` at each size.

### F-1-2 — The seeded game prompt is covered on desktop and TV layouts

- Exact location: `/demo`, Draw Together, prompt **BIRTHDAY CAKE**.
- Observed: at 1440×900 the prompt box spans `y=348.38–970.41`, while the fixed
  command rail begins at `y=808`. At 1920×1080 the prompt ends at `y=1047` and
  the rail begins at `y=988`. The last prompt characters are behind the rail.
- Impact: the main instruction for the core drawing game cannot be read at once
  on the product's intended large-screen layout.
- Required fix: keep whole words, cap the prompt size by available panel height,
  and reserve the command-rail height in the stage layout. Add visual geometry
  checks for the longest shipped prompt at 1366×768, 1440×900, and 1920×1080.

### F-1-3 — The non-English-relative job is not delivered

- Exact locations: the opportunity brief names “non-English relatives”; the
  metadata promises “language-light party games”; shipped prompts include
  **BIRTHDAY CAKE**, **ELEPHANT**, **BICYCLE**, and English-only instructions.
- Observed: there is no language choice, translated instruction set, or
  language-neutral illustrated prompt set. Pass & Guess and Draw Together
  require a player to understand English words.
- Impact: a household in the product's named audience cannot complete core game
  rounds as described.
- Required fix: add a room language choice and translated host/phone instructions,
  plus an illustrated prompt option that does not require reading. Keep this
  local and deterministic; model-generated text is not needed. Add a listed
  claim and demo test that completes one round in a non-English locale.

## Unlisted claim findings

Every command currently listed in `.factory/claims.json` passes. The following
README or landing statements are still claims a visitor or operator could rely
on, but they do not have their own claims entry. For each item, either add the
specified observable test and claim entry or remove the statement.

| ID | Exact quote and location | Why it remains unconfirmed | Concrete fix |
| --- | --- | --- | --- |
| F-1-4 | Landing: “Party games for one shared TV”; README: “Living Room Lobby brings phone-optional party games to a smart-TV browser.” | No claim covers the overall shared-TV and phone-optional workflow across a host and participant. | Add a clean demo claim that opens the host at a TV viewport and completes a shared-phone round at 390 px. |
| F-1-5 | Landing join section: “Use the code shown on the TV.” and “Scan once.” | The claim inventory does not cover the displayed-code or scan-to-join path. | Add a claim that creates a room, follows the rendered join URL, joins, and appears on the host screen. |
| F-1-6 | README Architecture: “Vite + strict TypeScript, with no UI framework or hosted assets.” | Same-origin demo coverage confirms hosted requests, but the stack and framework statements are not listed. | Split the sentence; list a source inspection test for the stack, or omit stack details that are not part of the product contract. |
| F-1-7 | README Architecture: “Rust 2021, Axum, and SQLite via SQLx.” | This implementation statement has no claims entry. | Add a source/build assertion tied to a claim, or move it to maintainer notes outside the claimed product description. |
| F-1-8 | README Architecture: “HTTP polling for old WebKit/Chromium TV browsers.” | Existing remote-control tests use current Chromium and do not confirm old-browser compatibility. | Name the minimum tested browser versions and run them, or rewrite to “Room updates use HTTP polling.” |
| F-1-9 | README Architecture: “Room state and server-side rate-limit buckets in SQLite at `/data/lobby.db`.” | Retention is tested, but the production path and request-limit storage statement are not listed together. | Add a configuration/integration claim that confirms both use the mounted SQLite file. |
| F-1-10 | README Architecture: “One container serves the compiled frontend and API on `PORT`.” | No claim entry confirms the single-image start and configured port. | Add a container smoke claim, or remove this statement until that check can run in the standard sandbox. |
| F-1-11 | README Develop: “Requirements: Node 22+, npm, and Rust 1.85+.” | The supported minimum toolchain versions are not tested. | Pin and test the minimum versions in CI, then list that claim; otherwise state only the versions used for this release. |
| F-1-12 | README Develop: “The server defaults to `sqlite:///data/lobby.db?mode=rwc` when `/data` exists, falling back to `sqlite://data/lobby.db?mode=rwc` for a standalone binary.” | A Rust unit test exists, but the statement is absent from `claims.json`. | Add the existing test as a claim entry and keep this 16-word sentence. |
| F-1-13 | README Container: “The production image runs as an unprivileged user and starts with only `PORT` configured.” | The current sandbox does not run the image, and no claim entry names this behavior. | Add a container inspection/smoke claim or remove the production guarantee. |
| F-1-14 | README Container: “`BUILD_SHA` defaults to `dev` for plain local builds; the factory supplies the full immutable commit SHA during its tarball build, and the compiled `/health` response identifies that release.” | This is 29 words, uses release jargon, and is not a listed claim. | Split it: “Local builds use `dev` as the build ID. Factory builds use the commit ID, which `/health` returns.” Add the existing release verifier as the claim test. |
| F-1-15 | README deployment: “Its checked-in `.factory/container-app.json` requires the durable `/data` mount and fixes both replica counts at one.” | The deployment invariant is not in the claim inventory. | Add `./scripts/deploy-container.sh --validate-only` as a claim test. |
| F-1-16 | README deployment: “The script tags the image with the full source commit, passes that same value as `BUILD_SHA`, waits for the exact revision to become ready, then checks uncached `/health` and a new service-worker cache before reporting success.” | This 37-word operational promise is not listed and combines five checks. | Split it into short statements and add the release-verifier test as one named claim. |
| F-1-17 | README deployment: “It aborts if `/data` is no longer the `sf-living-room-lobby-data` mount or scale is no longer exactly one replica.” | The behavior is testable but absent from `claims.json`. | Add validation fixtures that confirm both rejection cases and list the claim. |
| F-1-18 | README testing: “`npm test` runs prompt/catalogue tests and Rust API room-flow tests.” | This test-coverage statement is absent from the inventory. | Add a lightweight command-contract claim, or rewrite the section as a command table without coverage promises. |
| F-1-19 | README testing: “`npm run test:browser` starts a clean local product server and verifies desktop and 390 px flows, keyboard/remote controls, Axe WCAG 2 A/AA checks, real host/phone play, immediate room reads, demo privacy, and a cold-cache offline reload.” | This 36-word sentence contains many independently relied-on checks; only some are listed as claims. | Split it into one short sentence per checked behavior and list any retained product promise. |
| F-1-20 | README accessibility: “The UI has a skip link, one page-level heading, labelled controls, visible focus, a keyboard-scrollable mobile game catalogue, a remote D-pad navigation path, 44 px navigation targets, reduced-motion behavior, and offline feedback.” | This 32-word accessibility promise is not represented by one complete claim test. | Split it and add one accessibility-baseline claim that checks every retained item at desktop and 390 px. |
| F-1-21 | README ending: “MIT licensed.” and “Generated-image provenance and visual tokens are documented in `.factory/design.md`.” | Both are factual release statements without claims entries. | Add source checks for `LICENSE`, the generated source asset, prompt record, and design record, or remove the statements from claim-bearing copy. |

## Structure and navigation findings

### F-1-22 — The designed 404 does not use the standard page skeleton

- Exact location: any unknown route, such as `/not-a-real-page`.
- Observed: it correctly returns 404 and offers **Go to Living Room Lobby**, but
  it has no standard header, footer, skip link, meta description, canonical,
  Open Graph image, Twitter card, manifest, or apple-touch icon.
- Impact: navigation and product identity change at the recovery page, and the
  route does not meet the required metadata baseline.
- Required fix: serve a product-styled 404 with the shared header/footer and
  complete metadata while preserving the 404 status and recovery link.

### F-1-23 — Route changes have focus but no route announcement region

- Exact location: SPA navigation in `frontend/src/main.ts`.
- Observed: Privacy navigation and browser Back correctly focus the new `h1`,
  but there is no dedicated polite live region that announces route changes.
- Impact: a screen-reader user may receive focus without the required explicit
  route announcement.
- Required fix: add a persistent `aria-live="polite"` route-status element and
  update it with the new page heading after navigation. Add a browser check for
  its text on forward and back navigation.

### F-1-24 — The landing-page skeleton omits the plain privacy section

- Exact location: between **Choose a game** and **Family Pack**.
- Observed: privacy facts appear on `/privacy` and in the hero, but the required
  “what it does not do / privacy” landing section is absent.
- Impact: a first-time visitor must leave the landing page to understand room
  retention, browser storage, and request behavior.
- Required fix: add a short **What is stored** section covering six-hour real
  rooms, isolated sample data, local license storage, and no advertising or
  analytics. Reuse the existing tested claims.

### F-1-25 — The README demo link goes to the wrong site location

- Exact location: `README.md:6`, `[/demo](/demo)`.
- Observed: on GitHub this resolves to `https://github.com/demo`, not the live
  Living Room Lobby demo.
- Impact: a README visitor cannot follow the documented one-click demo path.
- Required fix: link to
  `https://living-room-lobby.sociobot.in/demo` and add a README link check.

## Copy findings

### F-1-26 — The README demo instruction exceeds the sentence limit

- Exact quote: “Open /demo or choose Try it with sample data on the landing
  page to see a ready Draw Together round with Asha, Marcos, and Lee and Bo.”
- Observed: 27 words.
- Required rewrite: “Open the demo to join Asha, Marcos, Lee, and Bo in a ready
  Draw Together round.”

### F-1-27 — The README describes storage with internal terminology

- Exact quote: “Playable state uses `demo:living-room-lobby:` browser storage
  and is discarded by Start for real.”
- Impact: “playable state” and a storage-key prefix do not tell a visitor what
  they can expect.
- Required rewrite: “The demo saves progress in this browser. Start for real
  clears that sample progress.” Keep the key name in `.factory/demo.md`.

### F-1-28 — “01 / JOIN” is a decorative label

- Exact location: landing join panel.
- Impact: it repeats the section purpose without giving an instruction.
- Required fix: remove it, or replace it with the useful heading **Join a room**.

### F-1-29 — “Enter the four marks” is unclear and inconsistent

- Exact location: landing join-panel heading.
- Impact: the form calls the same value a **Room code**; “marks” introduces a
  second, less familiar term.
- Required rewrite: **Enter the room code**.

### F-1-30 — “Step into the lobby” does not name the button result

- Exact location: join form submit button.
- Impact: the phrase is figurative and does not confirm that the action joins a
  room.
- Required rewrite: **Join room**.

### F-1-31 — The hero caption is a slogan rather than useful guidance

- Exact quote: “One screen brings the room together.”
- Impact: it does not explain how the TV and phones work together.
- Required rewrite: “The TV shows the game while players share or use phones.”

### F-1-32 — The Draw Together card uses a metaphor

- Exact quote: “One picture. Every hand.”
- Impact: “Every hand” does not explain that connected phones add to the shared
  canvas.
- Required rewrite: “Everyone draws on one shared TV picture.”

### F-1-33 — Game names use inconsistent capitalization

- Exact locations: **Draw Together** in the hero and README demo paragraph;
  **Draw together**, **Point panic**, **Pass & guess**, **Statue switch**, and
  **Colour chorus** elsewhere.
- Impact: the same games look like different labels in instructions and cards.
- Required fix: choose title case for game names and use it in the landing page,
  README, claims, demo, Privacy, and Terms.

### F-1-34 — The staging configuration sentence uses unexplained terms

- Exact quote: “Set `VITE_BILLING_BASE` only when building against the factory’s
  staging license verification API.”
- Impact: “staging” and “verification API” are not explained for the person
  running the project.
- Required rewrite: “Most builds need no billing setting. Factory test builds
  may set `VITE_BILLING_BASE` to the test license service.”

### F-1-35 — “Three sample families” does not match the sample labels

- Exact quote: “See a ready Draw Together round with three sample families.”
- Observed: the three entries are Asha, Marcos, and Lee and Bo; two look like
  individual names and one is a pair.
- Required rewrite: “See a ready Draw Together round with three sample players.”

## Complete copy audit

Counts treat hyphenated terms, paths, version numbers, and abbreviations as one
word. Code blocks are commands rather than sentences and are not counted. The
tables include headings and action labels because those have separate plain-word
requirements. No banned marketing word appears.

### Landing page

| Text | Words | Result |
| --- | ---: | --- |
| Party games for one shared TV | 6 | F-1-4 claim |
| Play together on your TV. | 5 | pass |
| For families sharing one TV, these games let kids and relatives play without everyone needing a phone. | 17 | F-1-4 claim |
| Try it with sample data | 5 | pass |
| Start a real room | 4 | pass |
| Join a room | 3 | pass |
| See a ready Draw Together round with three sample families. | 10 | F-1-35 |
| Try the sample without an account. | 6 | listed claim |
| Sample play never changes a real room. | 7 | listed claim |
| Extra games are not available yet. | 6 | listed claim |
| Use a TV remote to move and choose. | 9 | listed claim |
| One screen brings the room together. | 6 | F-1-31 |
| 01 / JOIN | 2 | F-1-28 |
| Enter the four marks | 4 | F-1-29 |
| Use the code shown on the TV. | 7 | F-1-5 claim |
| Room code | 2 | pass |
| Your name or family name | 5 | pass |
| How are you playing? | 4 | pass |
| My own phone | 3 | pass |
| Pass one phone | 3 | pass |
| Step into the lobby | 4 | F-1-30 |
| Choose how to play | 4 | pass |
| Three ways to play | 4 | pass |
| TV remote | 2 | pass |
| Host with arrows and OK. | 5 | pass |
| Shared phone | 2 | pass |
| Pass it after each turn. | 6 | pass |
| Personal phone | 2 | pass |
| Scan once. | 2 | F-1-5 claim |
| Games with short prompts | 4 | pass |
| Choose a game | 3 | pass |
| Use the left and right arrow keys to browse all free games. | 12 | pass |
| Draw together | 2 | F-1-33 |
| One picture. | 2 | F-1-32 |
| Every hand. | 2 | F-1-32 |
| 2–10 players | 2 | listed claim |
| Point panic | 2 | F-1-33 |
| Aim your phone. | 3 | listed claim |
| Hit the shape. | 3 | listed claim |
| 2–10 players | 2 | listed claim |
| Pass & guess | 2 | F-1-33 |
| One phone. | 2 | listed claim |
| Everyone plays. | 2 | listed claim |
| 3–12 players | 2 | listed claim |
| Family Pack | 2 | pass |
| Extra games are not available yet | 6 | listed claim |
| Hosted checkout is being set up. | 6 | listed claim |
| Statue switch and Colour chorus stay locked. | 7 | listed claim; F-1-33 |
| Free games stay free. | 4 | listed claim |
| Have a Family Pack license from an earlier purchase? | 9 | pass |
| Check it | 2 | pass |
| License token | 2 | pass |
| Verify license | 2 | pass |
| Party games for one shared TV. | 6 | F-1-4 claim |
| Original AI-assisted artwork | 3 | F-1-21 claim |
| Built by Param Factory | 4 | pass |

### README

| Text | Words | Result |
| --- | ---: | --- |
| Living Room Lobby | 3 | clear title |
| Living Room Lobby brings phone-optional party games to a smart-TV browser. | 11 | F-1-4 claim |
| It is for multigenerational families sharing one screen. | 8 | pass |
| Open /demo or choose Try it with sample data on the landing page to see a ready Draw Together round with Asha, Marcos, and Lee and Bo. | 27 | F-1-26 |
| A demo visit gets its own 24-hour sample workspace. | 9 | listed claim |
| Playable state uses demo:living-room-lobby: browser storage and is discarded by Start for real. | 13 | F-1-27 |
| It never uses or changes a real room. | 8 | listed claim |
| The free room includes: | 4 | clear lead-in |
| Draw together: every connected phone contributes to one TV canvas. | 10 | listed claim; F-1-33 |
| Point panic: tilt a phone or use the accessible arrow pad to aim. | 13 | listed claim; F-1-33 |
| Pass & guess: one shared phone moves around the room after every clue. | 12 | listed claim |
| Family Pack checkout is not available yet. | 7 | listed claim |
| Statue switch and Colour chorus stay locked while checkout registration is completed. | 12 | listed claim; F-1-33 |
| Draw together, Point panic, and Pass & guess remain free. | 9 | listed claim; F-1-33 |
| If you have an earlier Family Pack license, you can paste it into the app to check its status. | 19 | listed claim |
| Architecture | 1 | clear heading |
| Vite + strict TypeScript, with no UI framework or hosted assets | 10 | F-1-6 |
| Rust 2021, Axum, and SQLite via SQLx | 7 | F-1-7 |
| HTTP polling for old WebKit/Chromium TV browsers | 7 | F-1-8 |
| Room state and server-side rate-limit buckets in SQLite at /data/lobby.db | 10 | F-1-9 |
| One container serves the compiled frontend and API on PORT | 10 | F-1-10 |
| Develop | 1 | clear heading |
| Requirements: Node 22+, npm, and Rust 1.85+. | 7 | F-1-11 claim |
| The server defaults to sqlite:///data/lobby.db?mode=rwc when /data exists, falling back to sqlite://data/lobby.db?mode=rwc for a standalone binary. | 16 | F-1-12 claim |
| Override with DATABASE_URL; set PORT to change the default 8080. | 11 | pass |
| Set VITE_BILLING_BASE only when building against the factory’s staging license verification API. | 14 | F-1-34 |
| Container | 1 | clear heading |
| Open http://localhost:8080. | 2 | pass |
| The production image runs as an unprivileged user and starts with only PORT configured. | 14 | F-1-13 claim |
| BUILD_SHA defaults to dev for plain local builds; the factory supplies the full immutable commit SHA during its tarball build, and the compiled /health response identifies that release. | 29 | F-1-14 |
| For the factory deployment, run ./scripts/deploy-container.sh from a clean, committed checkout with Azure access. | 14 | pass |
| Its checked-in .factory/container-app.json requires the durable /data mount and fixes both replica counts at one. | 15 | F-1-15 claim |
| Room state and per-client limits use the SQLite file at that path. | 12 | F-1-9 claim |
| Do not scale this deployment until those stores are replaced by shared services. | 13 | clear instruction |
| The script tags the image with the full source commit, passes that same value as BUILD_SHA, waits for the exact revision to become ready, then checks uncached /health and a new service-worker cache before reporting success. | 37 | F-1-16 |
| It aborts if /data is no longer the sf-living-room-lobby-data mount or scale is no longer exactly one replica. | 18 | F-1-17 claim |
| Testing and accessibility | 3 | clear heading |
| npm test runs prompt/catalogue tests and Rust API room-flow tests. | 10 | F-1-18 claim |
| npm run test:browser starts a clean local product server and verifies desktop and 390 px flows, keyboard/remote controls, Axe WCAG 2 A/AA checks, real host/phone play, immediate room reads, demo privacy, and a cold-cache offline reload. | 36 | F-1-19 |
| The claim commands live in .factory/claims.json and all start from the demo route. | 13 | confirmed by inspection |
| The UI has a skip link, one page-level heading, labelled controls, visible focus, a keyboard-scrollable mobile game catalogue, a remote D-pad navigation path, 44 px navigation targets, reduced-motion behavior, and offline feedback. | 32 | F-1-20 |
| Privacy and license | 3 | clear heading |
| See /privacy and /terms in the running application. | 8 | pass |
| Family Pack license tokens and the last verification result remain in the browser’s local storage. | 15 | listed claim |
| MIT licensed. | 2 | F-1-21 claim |
| Generated-image provenance and visual tokens are documented in .factory/design.md. | 9 | F-1-21 claim |

## Demo and sandbox checks

- One click from the landing action opens `/demo` in a fresh context.
- The first demo screen shows Round 3 of Draw Together, three players, the
  **BIRTHDAY CAKE** prompt, and a seeded three-colour drawing.
- The banner remains visible and says sample data is not saved to a real room.
- **Next round** changes Round 3 to Round 4; **Reset demo** restores Round 3.
- Demo state uses only `demo:living-room-lobby:*` local/session keys.
- **Start for real** returns to `/`, removes the banner, and removes all demo
  keys.
- The request log contains only the product origin and `POST /api/demo`; it
  contains no real-room API request.
- Offline reload, same-origin requests, and real-room isolation all pass their
  independently run claim checks.

The demo therefore meets the one-click and isolation requirements, subject to
blocking finding F-1-2 for prompt readability.

## Claim test results

Each command was run separately from the clean checkout after `npm ci`.

| Claim ID | Result | Evidence checked |
| --- | --- | --- |
| `demo-sandbox` | PASS | Seed, namespace, reset, and Start for real |
| `account-free-sample` | PASS | Fresh unauthenticated `/demo` |
| `demo-real-room-isolation` | PASS | No `/api/rooms` request or real-room row |
| `offline-reload` | PASS | New mobile context, offline reload |
| `same-origin-requests` | PASS | Complete demo request log |
| `remote-controls` | PASS | Arrow focus movement |
| `shared-phone` | PASS | Pass & Guess handoff screen |
| `family-pack-unavailable` | PASS | No checkout, locked extras, free game opens |
| `free-game-availability` | PASS | All three free games open |
| `player-count-limits` | PASS | All five visible ranges |
| `shared-tv-canvas` | PASS | Phone drawing changes TV canvas |
| `point-controls` | PASS | Tilt option, labelled arrows, saved position |
| `room-retention` | PASS | Six-hour SQLite boundary |
| `no-advertising-or-analytics` | PASS | Same-origin scripts and requests |
| `minimal-join-data` | PASS | Code, display name, and play mode only |
| `license-status` | PASS | Inactive notice, local cache, direct Sociobot check |

No listed claim is untested and no listed claim test fails. Findings F-1-4
through F-1-21 cover statements that are not yet listed.

## Prior finding confirmation

No earlier `.factory/review-*.md` or `.factory/polish-*.md` file exists. The
accumulated handoff contains earlier verification and repair findings; each was
checked again.

| Earlier finding | Live confirmation | Source/test confirmation | Result |
| --- | --- | --- | --- |
| Stale deployed release identity | `/health`, the service-worker cache, and footer all identify `e46876d…`. | `scripts/verify-release.mjs e46876d… <live URL>` passes. | fixed |
| Mobile sample action below 390×844 | Full action is at `y=548.33–602.33`. | Mobile layout rule and full browser suite pass. | fixed |
| Family Pack link returned 404 | No purchase link is present; the page says checkout is unavailable. | `family-pack-unavailable` passes. | fixed |
| Missing account-free, free-game, and player-range claims | All three entries are present. | Each exact claim command passes. | fixed |
| Inactive license had no visible status | Live fixture shows “This license is no longer active. Extra games remain locked.” | `license-status` passes. | fixed |
| Invalid room code logged a failed response | Live `ZZZZ` join returns the recovery message through HTTP 200 with no console error. | Full browser suite and Rust recovery test pass. | fixed |
| New release could fail while opening durable SQLite | Live health is stable and current. | All 19 Rust tests pass, including current-schema, lock-wait, pool, and recovery checks. | fixed |

The desktop first-screen issue in F-1-1 is a wider-viewport regression not
covered by the earlier 390 px fix. The complete README claim inventory in this
review is broader than the three visitor claims corrected in the earlier round.

## Structure, accessibility, and visual checks that pass

- `/`, `/demo`, `/privacy`, and `/terms` return 200; the designed unknown route
  returns 404 and its home link works.
- Home, Demo, Privacy, and Terms use route-specific titles, one `h1`, one
  `main`, `lang="en"`, canonical URLs, descriptions, favicon, social image, and
  no missing image alt text.
- SPA link navigation starts the new route at the top; Back restores the prior
  home scroll position; forward, Back, and direct link navigation focus the new
  `h1`.
- Home and demo checks recorded no console or page errors.
- Axe WCAG 2/2.1 A/AA checks report zero violations at 390 px and desktop; the
  full repository browser suite also passes.
- `robots.txt`, `sitemap.xml`, manifest, favicon, apple-touch icon, hero image,
  and 1200×630 social image all return 200. The sitemap lists all four real
  routes.
- The concrete-and-moss system, clipped shapes, generated living-room art, hard
  shadows, and TV-scale type are product-specific rather than a generic
  software landing template. Provenance is recorded in `.factory/design.md`.
- The production JavaScript is 53.87 KB raw and 19.80 KB gzip; CSS is 17.57 KB
  raw and 4.93 KB gzip.
- `npm test`, `npm run check`, `npm run build`, and the full
  `npm run test:browser` suite pass.

## Missed leverage

F-1-3 is the missed product leverage: a language selector plus a fully
illustrated prompt set is directly implied by the brief and would make the games
usable by non-English relatives. This does not call for a model service; static,
reviewed translations and images are more dependable for family play. No other
import, export, sync, or model-assisted feature is an obvious requirement for a
temporary living-room game session.

## What would make this perfect

Resolve every finding above, then confirm the full first action and longest game
prompt at all three desktop/TV viewports. Complete a non-English demo round,
make the README demo link open the live sample, give the 404 the standard
skeleton, add route announcements and the landing privacy section, and align
every retained claim with exactly one clean-sandbox test. Re-run the full copy
audit and all claim commands; the next review should have zero flagged rows.
