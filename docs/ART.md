# Tensaiasobi art doc (draft for docs/ART.md)

Status: pitch draft, 2026-10-31. Everything here comes from the app's existing code unless it is marked **new**.
The source of truth for colours is `src/theme/blockTable.ts` (#69). If this doc and that file disagree, the file wins and this doc gets fixed.

## 1. The look in one line

A toy-block table: warm paper, chunky toy blocks with a 3 px ink outline and a hard offset shadow, emoji objects with a white sticker halo, and the app icon's simple drawn faces.

## 2. Palette tokens

| Token | Hex | Code name | Use |
|---|---|---|---|
| `ink` | `#2a1c14` | `INK` | Outlines, hard shadows, all text on light fills |
| `paper` | `#ffe7c2` | `PAPER` | Page background (`PLAY_MAT_STYLE`: 7 % ink dots on a 28 px grid), `theme-color` |
| `cream` | `#fff8ec` | AnswerBubble fill | Neutral tap fill, cards, the icon star's face |
| `coral` | `#ff4d3a` | `CORAL` | Language shelf, "try again" fill on a wrong answer |
| `leaf` | `#1f9a62` | `LEAF` | Logic shelf, right-answer fill |
| `butter` | `#ffc21a` | `BUTTER` | Numbers shelf, Home button, selected level |
| `chalk` | `#fffaf0` | `CHALK` | Just-for-fun shelf (1st of 3) |
| `pebble` | `#b8aea3` | `PEBBLE` | Just-for-fun shelf (2nd), dashed "not yet" outlines |
| `coal` | `#3a2e27` | `COAL` | Just-for-fun shelf (3rd), panda patches and arms |
| `blush` | `#ffab9b` | app icon | Cheeks on drawn faces (icon star, panda) |
| `ink-soft` **new** | `#6b5a4c` | none | Secondary text. Replaces `slate-400/500`. 5.5:1 on paper |
| `gold` **parked pitch** | `#e08a00` | none | Pitch only: gold rarity-tier sticker rim. ΔE00 16.4 vs butter, 26.5 vs coral |

Notebook sub-palette, only for the school answer sheet (`Notebook.tsx`, Tailwind `paper`, `paper-edge`, `paper-rule`, `ink`): `#FFFBEF`, `#EADFC4`, `#D3E3F1`, `#1E3A5F`. Use it only inside the notebook sheet.

**Retired:** the `candy-*` colours (`#FF6EB4 #4FC3F7 #69F0AE #FFD740 #CE93D8 #FFAB40`). `KidButton` already folds them onto coral, leaf and butter. They still remain in `GameConfetti` and 11 games. Ad-hoc Tailwind `purple`, `sky`, `indigo` and `slate` text colours are also retired.

## 3. Shelf colours

| Shelf | Emoji | Fill | Label on fill |
|---|---|---|---|
| Numbers | 🔢 | butter | ink |
| Language | 🔤 | coral | ink |
| Logic | 🧠 | leaf | ink |
| Just for fun | 🎲 | chalk → pebble → coal, cycling per tile | ink, white on coal |

One shelf, one colour, everywhere: the launcher tile, sticker-book page, sticker fill and any shelf badge. A game's own play area can use other colours. Its chrome (title, level picker, buttons) uses only the tokens above.

## 4. Typography

- Font: the Tailwind default system stack (`ui-sans-serif, system-ui, …`), which is SF Pro on iOS and Noto Sans or Roboto on Android. There is no web font, so there is no load cost. Keep it that way.
- Weight: `font-black` (900) for titles, tile labels and buttons, and `font-extrabold` (800) for helper lines. Nothing lighter on a kid screen.
- Sizes: screen title 30 px (24 on `short:`), tile label 13–14 px, answer numerals 48 px or more, helper line 12–14 px.
- Colour: always `ink`, or `ink-soft` for helper text. Titles are `slate-800` (navy) today. Move them to `ink` (brown).
- Kids 3–5 can't read, so text is a bonus. Every instruction also needs an icon, an animation or the panda.

## 5. Shape, outline, shadow, radius

- Outline: 3 px `ink` on every tappable block. The Simon/stage frame uses 4 px. Outlines are never grey or soft.
- Shadow: the hard offset shadow `hardShadow(5, 6)` (`5px 6px 0 0 ink`), or `3,4` on small items. There are no blurred shadows (`shadow-lg`, `shadow-2xl`).
- Press: move the block by its shadow offset and remove the shadow (`active:translate-x-[5px] translate-y-[6px] [box-shadow:none]`).
- Tilt: launcher tiles get a stable −4…+4° tilt from their id. Stickers use −8…+8°. Buttons inside a game stay straight.
- Radii in use, as the rule:
  - Tiles: `1.6rem` (`BlockTile`)
  - Buttons: `rounded-xl` (sm), `2xl` (md), `2rem` (lg), `2.5rem` (xl). These are the `KidButton` sizes.
  - Answer choices and stickers: `rounded-full`
  - Stage and cards: `2rem`
  - Avoid new one-off values (`[1.5rem]`, `[3rem]`, `[2.5rem]` on cards).
- Fills are flat. Gradients are allowed only inside a scene (water, sky). They are not allowed on chrome such as the star counter, buttons or cards.

## 6. Icon rule and sticker album

- **In-game objects stay emoji for now.** They cost no art, work in every language and match the platform. Launchers wrap emoji in `LauncherGlyph` with the 4 px white halo (`EMOJI_HALO`). Reuse that halo for emoji objects. Drawn art and haloed emoji may share a screen or a row: the white halo and the sticker's white cut read as the same family.
- **Characters and brand marks are drawn**, in the app-icon style: a 5 px ink line at 140 px (about 3 px on screen), flat fills from the palette, dot eyes, a small smile and blush cheeks. The cast is the drawn panda, fox, owl and tortoise (`characters/cast.md`). Don't mix emoji vendors (no Twemoji images).
- The 🐼 emoji stays **content** (Shadow, Animal Genie, word lists). The **mascot** is always the drawn panda, so kids never confuse the guide with an answer.

**Stickers are drawn die-cuts**, never emoji: art → white cut of about 6 % → 5 px rim in the shelf colour → 2 px ink edge → hard ink shadow (no blur), 256 px PNG + SVG, no text, readable at 48 px. Faces on objects are fine.

**The album is organised by shelf, not by game** (no game ids in names or the manifest). Files are `<prefix>_<nn>.png` with `manifest.json` keys `id`, `shelf`, `file`.

| Shelf | Prefix | Stickers | Rim | Character |
|---|---|---|---|---|
| Numbers | `numbers_01..12` | 12 | butter | owl |
| Language | `language_01..12` | 12 | coral | fox |
| Logic | `logic_01..12` | 12 | leaf | tortoise |
| Just for fun | `fun_01..12` | 12 | pebble / coal, alternating (chalk vanishes on paper) | panda (also the app host) |
| Moods | `mood_<character>_<mood>` | 16 | butter | each character: cheer, surprised, sleepy, proud |
| General | `general_thank_you` (+ the reward star) | 1 | butter | panda waving at a little house |

- **One character per shelf.** A shelf's stickers show only its own character, or objects with no character. Other animals (a crocodile, say) count as characters, so they don't go on a shelf either. Game mechanics are never shown.
- **Accessories are global** (crown, party hat, bow, cape, flower, headphones, heart, moustache, scarf, star clip, sunglasses, wizard hat). They fit every character and belong to no shelf.
- Totals (phase 1): 72 shelf stickers (18 per shelf, `<shelf>_01`..`_18`) + 16 moods + 16 scene stickers (the former scene-set pieces, 4 per shelf) + 1 thank-you sticker.

### Capsules, duplicates and the free book
- **Drops:** after every finished round there's a roll for one capsule, with p = 1/(2^(k+1)−1), where k is the capsules earned that day (100%, then 1/3, 1/7 and so on), resetting each morning. A capsule holds a sticker from the shelf just played. Capsules are earned only by playing; they're never bought with stars. Stars buy accessories.
- **Reveal:** the drawn capsule machine (capsule_machine) sits next to the 120 px panda on the award overlay. The knob turns, a capsule in the shelf colour rolls out, the kid taps it, it splits, and the sticker pops with the existing butter rays and card-in. That takes about 3 s. With reduced motion it's a static reveal. Sounds: capsule_twist, capsule_pop, plus shiny_sparkle for shiny stickers. No near-miss effects, no countdowns, no coin or slot visuals.
- **Shiny:** 10% of drops. The same art, with the shelf rim swapped for gold #e08a00 (promoted from parked) plus the sparkle overlay at the top-right. Gold is used only for shiny stickers.
- **Duplicates** stack. The collection shows an ink "×N" badge at the bottom-right of the sticker, and each copy can be placed on a page.
- **Book tabs** (tab icons, ink on cream):
  - My pages: blank paper pages, up to 20. **A page is always 9:16 portrait** (343×610 px at 375×812). Sticker positions are stored as 0..1 of the page, so draw every page background, including the phase 2 scene backgrounds, at 9:16 (for example 900×1600 px). Scene backgrounds follow "Scene pages" below.
  - Collection: grouped by shelf, with a pebble silhouette per missing sticker as in the §6 outline rule.
  - Scenes: the "New page" picker (see "Scene pages" below).
- **Editing:** drag from a bottom tray onto the page. Tap a sticker to select it, which shows an ink dashed box with a size handle (3 steps) and a rotate handle. Drag it back to the tray to remove it. Placed stickers keep the −8…+8° base tilt plus the kid's rotation. Accessories still paste on.
- **Print** is behind a 2-second parent hold. It gives a PDF of the current page (A4 or Letter portrait: the 9:16 page fitted to the sheet height inside 10 mm margins and centred, with white side margins; vector stickers, 200 dpi background, paper background on) and a sticker sheet PDF of all owned stickers at 5 cm with their die-cut rims, on white, with no shadows.

### Scene pages (replaces "Special scenes", PR 99)
Pages belong to no shelf and no game. "New page" offers **Blank** plus **20 scene themes**:
1 Playground · 2 Living room · 3 Park · 4 Beach · 5 Forest · 6 Farm · 7 Town street · 8 Kitchen · 9 Bedroom · 10 Garden · 11 Classroom · 12 Train station · 13 Harbour · 14 Campsite · 15 Snowy hill · 16 Under the sea · 17 Space · 18 Castle · 19 Market · 20 Summer festival (shrine, lanterns, stalls)

**A scene page is built from layers, picked by a seed stored on the page** (same seed = same page, on screen and in print):
1. **Sky / wall** – shared: outdoor day, evening, night; indoor cream, mint, peach wall. Seed picks 1 of the theme's allowed ones.
2. **Backdrop** – 2 per theme (far hills, skyline, shelves, waves…). Seed picks 1, may mirror it.
3. **Ground / floor** – 1 per theme. Ground line at 78 % of page height.
4. **Props** – 5 per theme, placed on the theme's 6 anchor slots (left, right, back-left, back-right, low-left, low-right). Seed picks 3–4 props, may mirror each.
- **Sticker room:** the middle of the page (x 15–85 %, y 30–76 %) stays free of props.
- **No characters and no animals** in scenes (one character per shelf). Objects only.
- **Backgrounds are quieter than stickers:** flat fills from the palette, ink line 3 px at 900 px wide (no hard shadow, no white cut, no rim), sky and wall at about 70 % saturation and light enough to print. Stickers must always pop on top.
- **Size:** every layer is drawn on the 9:16 canvas (900×1600 px PNG, transparent except the sky/wall); props as separate transparent PNGs at true size on that canvas.
- Files: `pages/sky_<id>.png`, `pages/<theme>_backdrop_<a|b>.png`, `pages/<theme>_ground.png`, `pages/<theme>_prop_<nn>.png`, plus `pages/themes.json` (theme id, allowed skies, files, anchors). Thumbnails are rendered from seed 1.
- A "shuffle" dice on a themed page re-rolls the seed; placed stickers keep their positions.
- **In the app:** approved layers and their `themes.json` are copied to `src/assets/stickers/pages/` by `scripts/import_scene_pages.py --all` (or `<theme ids>`; re-run without arguments to refresh the approved ones; stale files are removed). The app reads every file name, sky, slot and anchor from that `themes.json`; a theme not in it yet shows placeholder layers (flat sky or wall and the ground line).
- **The 16 former scene-set pieces stay owned stickers** and move into the Collection under their own shelf. Their outline pages are retired. Old scene-set pages with placed pieces become normal blank pages with the pieces where the kid put them. Nothing is taken away.

## 7. Mascot: Panda

| Pose | When |
|---|---|
| idle | Present in the corner slot during play, not animated (a slow blink is optional) |
| cheer | Round finished, sticker won, and Word Chain when Panda gets stuck |
| think | Panda's turn (Word Chain), a hint is about to appear, Animal Genie thinking |
| wave | Game opens, back on home, sticker book opens |
| sleepy | Session timer ends (`useSessionTimer` lock screen), 60 s without input |

Rules:
- One panda per screen, in one of three sizes: **24 px head chip** (speech chips, header), **72–80 px corner** (in game), **120 px+** only on the award overlay and the session-end screen.
- Placement: the **bottom-left corner slot**, outside the play area. It is never inside or over the stage, an answer or a tile, and never between the child and a target. On `short:` and `tiny:` screens the corner slot is dropped, and the panda appears only as the head chip and on the award overlay.
- `pointer-events: none`. The panda is never a tap target, so it can't be mis-tapped.
- It reacts only to positive or neutral events. It never frowns, cries or shakes its head. After a miss it shows `think` (a hint is coming), not sadness.
- Motion: the existing `card-in` pop (0.35 s) to appear, and a 2-frame bounce for cheer. Under `prefers-reduced-motion` the pose swaps with no movement.
- Speech: a chip with the head, max 4 words or one emoji. Panda never carries information the game needs.
- Art status: the poses in `panda_reactions.png` are **placeholders** made in the icon style. Final art should be one SVG per pose on a 140×154 viewBox.

## 8. Feedback language

| Moment | Effect (existing) | Rule |
|---|---|---|
| Right answer | Choice fills `leaf` and sinks into its shadow, plus a short burst (Dice Flash: 45-piece confetti) | Under 0.5 s and never blocks the next tap |
| Wrong answer | Choice fills `coral` and `animate-shake` runs (0.2 s × 2). Hints and replays come next. | Never a red ✕ screen, never "you lost", never 😢 |
| Round finished | `GameConfetti` (110–150 pieces) | Recolour to coral / leaf / butter / chalk with ink edges (**change**) |
| Stars | `FlyUpStar` "+N ⭐", counter pulse | Keep |
| Sticker won **new** | Panda cheer → sticker pops in (`card-in`) with butter rays on a 45 % ink scrim → flies into the book tray → tray closes. About 2.5 s and no tap needed. | Only after the round ends, while game taps are already off |
| Sound | Muted by default (`settings`), vibration optional | Effects must work with no sound |
| Reduced motion | Confetti off, animations at 0.01 ms | The sticker still appears (static), and the panda swaps pose |

**No fail screens.** Two places break this today: the Word Chain ん-rule end screen (🦁❌, red text, and in Japanese "負けちゃったよ 😢") and Sink or Float hard, where a miss ends the round with no stars. Both should end positively, for example "Panda gets a turn" or a retry.

## 9. Tap targets

- Kid targets: **96 px** minimum (`--game-tile: 6rem`), kept on 390×844 and 375×667. Only `tiny:` (320×568) drops to 72 px. Never go smaller.
- Gaps between kid targets: 12 px or more (`gap-3`/`gap-4`).
- Parent-only controls (settings, parent gate) can be 44 px.
- Decorations (panda, confetti, stickers on the award overlay) are `pointer-events: none`.

## 10. Accessibility and contrast

Measured (WCAG ratio):
- Ink on butter 10.2, on paper 13.7, on chalk 15.8, on coral 5.0, on leaf 4.6: **all pass**. This is why tile labels are ink on every fill (`tileLabelOn`).
- White on coral 3.3 and white on leaf 3.6 pass only for large bold text (19 px+ at 700+). `onFill()` puts white on coral and leaf in `KidButton`, which is OK at the `md` size and up but not for small labels.
- `slate-400` helper text on paper is **2.1 and fails**. It is used in 22 files (Simon, Pearl Finder help lines). Use `ink-soft` `#6b5a4c` (5.5).
- Never use colour alone: right and wrong also differ by motion (sink vs shake), and shelves also differ by emoji.
- Respect `prefers-reduced-motion`, as the app already does globally in `index.css`.

## 11. Do / Don't

Do
- Build chrome from `blockTable.ts` tokens, `KidButton`, `AnswerBubble`, `BlockTile` and `DifficultySelector`.
- Give every block a 3 px ink outline, a hard shadow and a press-into-shadow state.
- Use emoji with the white halo for objects, and drawn icon-style art for characters.
- Keep the panda in its slot and celebrate effort.

Don't
- Use soft grey borders, blurred shadows, gradients on chrome, or pastel Tailwind backgrounds (`bg-sky-50`, `purple-100`) for UI.
- Bring back `candy-*` colours or add a new accent colour (the purple Challenge button and the amber-gradient star pill are the last two).
- Put anything over an active tap target, or make the panda tappable.
- Show loss, a countdown punishment, or take away stars or stickers.
- Ship leftover template art (`src/assets/hero.png`, `react.svg`, `vite.svg` are unused Vite leftovers).
