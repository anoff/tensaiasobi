# Game catalog review (Oct 2026)

A pass over all 19 games plus the open issues, aimed at the "some games are too
hard" feedback. The result: one merge, difficulty fixes in seven games, and a home
screen sorted into four categories.

## What the open issues say

The feedback in #57, #67 and #74 is mostly about **friction, not missing content**:
things are too big for a phone, too hard to see, or too hard to read.

| Issue | Feedback | Status |
|---|---|---|
| #57 | Train / fruit buttons too large; remove the moon from Shadow; Pearl bubbles hard to see | Sizes fixed in #72; **moon removed and bubbles made opaque here** |
| #67 | Pearl bubbles should hide the pearl; Number Train should be tap-only; age grouping on home | Tap-only and age switch were already done; **bubbles fixed here** |
| #74 | One app-wide theme switch | Not in this pass |
| #30 | Explain what each game teaches | **Partly covered by the categories here** |
| #41, #44, #60, #64 | New game proposals (magnet, sink/float, surfing) | Placed in the categories below |

## Categories

Each learning category has one of the three existing toy colours. Just-for-fun
games use chalk, pebble and coal (white, grey, black). Only the fun shelf is
`kind: 'play'`, so a learn-first challenge hides exactly that section.

| Category | Colour | Preschool (🧸) | School (🎒) |
|---|---|---|---|
| 🔢 Numbers | butter | Math Pop, Number Train, Fair Share Picnic | + Balance |
| 🔤 Language | coral | Letters | Letters, First Sound, Word Chain |
| 🧠 Logic | leaf | Odd One, Match, Shadow, Pearl Finder, Magic Puzzle | Odd One, Match, Magic Puzzle, Tower Sort |
| 🎲 Just for fun | chalk / pebble / coal | Doodle, Trace, Mazes, Emoji Match, City Dispatch, My Town, Coupons | Mazes, Emoji Match, City Dispatch, My Town, Coupons |

## Changes per game

| Game | Problem | Change |
|---|---|---|
| **Math Pop + Fruit Math Pop** | Two tiles did the same thing (add/subtract, three answer lines). Preschool "easy" Math Pop asked for sums up to 18 with no pictures. School "hard" asked for 87 + 58. | **Merged into one Math Pop.** Easy: add within 5, with fruit pictures and dot tallies. Medium: ± within 10, pictures come back after a miss. Hard: ± within 20, bridging ten. Logic is now in `mathPopLogic.ts` with unit tests. |
| **Word Chain** | Always 9 pictures with no words, so a child had to name 9 emojis and know their first letters | Levels added. Easy: 3 labelled pictures. Medium (school start): 4 labelled pictures. Hard: 6 pictures without words, the old challenge. The Japanese ん trap only appears on hard. |
| **Balance** | A weight's value was hidden until you picked it up, so the child had to guess that a book weighs 3 | Easy and medium show dots on every weight. Hard keeps the hidden weights. |
| **Shadow** | 🌙 looked like 🍌 (#57). Medium had 5 choices and an oversized shadow, which was too hard for preschool. | Moon removed. Medium: 4 choices at normal size. Hard: 5 choices. |
| **Pearl Finder** | See-through bubbles didn't hide anything (#57, #67) | Bubbles are now opaque white-blue. |
| **Match** | Easy (2 pairs) to medium (6 pairs) was too big a jump | Easy now has 3 pairs. |
| **Odd One** | 👑 👜 🕶️ were "clothing", 🔔 was an "instrument", and 🎱 🏹 were "sports". Grown-ups argue about these. | Removed those emojis. |
| **Letters** | Preschool had no language game | Now available to preschool. Easy has the widest tracing tolerance. |
| **City Dispatch** | Timed arcade game listed as "learn" and school-only, although police / fire / ambulance suits age 4 too | Moved to Just for fun and opened to preschool. Easy is 1 event with 24 s. |

## Suggested new games

Ordered by how much they would fill a gap. The biggest gap is **preschool language**:
it only has Letters.

### 🔤 Language
1. **Letter Pairs** (preschool): match pairs of `A` ↔ `a`, or `A` ↔ 🍎. Reuses the Match grid and teaches letter shapes before First Sound.
2. **Syllable Drum** (preschool/school): a picture appears and the child taps the drum once per syllable (🦒 *Gi-raf-fe* = 3). Works without sound, which keeps it restaurant-safe.
3. **Missing Letter** (school): `M_USE` with three letter lines on the notebook sheet. It's the natural step after First Sound.
4. **Word Builder** (school): drag 3–4 letter tiles to spell a short word under a picture.

### 🔢 Numbers
1. **Dice Flash** (preschool): a dice face shows for one second, then the child taps the number. Teaches recognising small amounts at a glance.
2. **Crocodile Compare** (preschool/school): two groups or numbers, and the crocodile eats the bigger one (`<`, `>`).
3. **Clock Shop** (school): set a clock to whole and half hours.
4. **Coin Café** (school): pay for a snack with coins (€, ¥, $ per locale).

### 🧠 Logic
1. **Pattern Train** (both): 🔴🔵🔴🔵❓, so the child picks the next wagon. Reuses Number Train.
2. **Sink or Float** (#44) and **Magnet Fishing** (#41): cause and effect, with specs ready.
3. **Mini Sudoku** (school): 4×4 grid with emojis instead of numbers.
4. **Robot Path** (school): plan ⬆️➡️ arrows ahead, then press play. A first step into coding.

### 🎲 Just for fun
1. **Bodyboard Wave Rider** (#64): a timing game, which suits this shelf.
2. **Wave Surfer** (#60): it quizzes math under time pressure. That's better as a fun game than a learning one, since learning games should stay calm.
3. **Bubble Pop**: pop bubbles and nothing else, as a reward after a challenge.

## Not changed (yet)

- **First Sound** has no difficulty levels. Preschool could get a version with two letters plus the word shown.
- **Tower Sort** stays school-only. Its easy level (2 types, 12 scramble steps) could open it to older preschool kids later.
- A global theme switch (#74) and per-game explainer screens (#30) are still open.
