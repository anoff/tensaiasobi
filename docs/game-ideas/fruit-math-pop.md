# Add new mini-game - Fruit Math Pop

**Type**: Feature  
**Learning category**: Numeracy - concrete addition and subtraction  
**Target age**: 4-6 years

## Goal

Let children who can count up to five, but do not yet recognize numerals, practice addition and subtraction by watching emoji objects join or leave a tray and selecting the matching quantity.

## Proposed Changes

- Add `src/games/FruitMathPop.tsx`, accepting the standard `GameProps`.
- Add a `fruitMathPop` screen, launcher, and game rendering branch in `src/App.tsx`.
- Add `fruitMathPop` strings to `src/locales/en.ts`, `de.ts`, `ja.ts`, `ko.ts`, and `fr.ts`.
- Keep game state local; no API, database, or persisted score is required.
- Reuse `GameConfetti`, `DifficultySelector`, `AnswerBubble`, `shuffle`, and the existing game sounds.

## UI/UX Details

- Show one themed emoji group, an animated `+` or `-`, and a second group. For example: `🍎🍎🍎 + 🍎` or `🍌🍌🍌🍌🍌 - 🍌🍌`.
- Animate added objects into the tray and removed objects out of it before showing the choices, making the operation visible without text or numerals.
- Show two or three chunky answer bubbles containing emoji groups only, never a numeral.
- Correct choice: objects bounce, `playSuccess()` runs, confetti appears, and the next round begins after a short delay.
- Incorrect choice: selected bubble shakes, `playError()` runs, and the child can try again.
- Reuse Tower Sort's exact visual themes and cycling control:

| Theme | Emoji pool | Background |
|-------|------------|------------|
| Animals `🐶` | `🐶 🐱 🐼 🦊 🐸 🐰` | emerald / green / teal |
| Fruits `🍎` | `🍎 🍌 🍇 🍉 🍓 🍍` | rose / pink / orange |
| Space `🚀` | `🚀 🪐 ⭐ ☄️ 👽 🛸` | slate / indigo |
| Ocean `🐠` | `🐠 🐬 🐙 🦀 🐳 🦈` | sky / cyan / blue |

- Difficulty:

| Tier | Rules |
|------|-------|
| Easy | Addition only, totals 1-5, two answer groups |
| Medium | Addition and subtraction within 1-5, three answer groups |
| Hard | Addition and subtraction within 1-10, three answer groups; briefly hide the final tray before choices |

- Reward exactly one base star with this game-local multiplier: Easy `1`, Medium `2`, Hard `3`. Call `onStarEarned(1 | 2 | 3)` after a correct answer; do not use the shared `starMultiplier`, whose values differ.

## Verification Plan

- Add focused generator tests or assertions covering valid subtraction, answer inclusion, distinct answer choices, and each difficulty's quantity range.
- Manually verify every Tower Sort theme can be selected and its emoji pool supplies each round.
- Manually verify touch and click selection, retry after an incorrect answer, success animation, and awarded stars of 1, 2, and 3.
- Run the project's type check, lint, and test commands.

## Acceptance Criteria

- [ ] A child can complete easy rounds without reading or recognizing numerals.
- [ ] Each round visibly models joining or removing objects before answer selection.
- [ ] Easy, medium, and hard follow the defined ranges and answer counts.
- [ ] The four Tower Sort themes are reused without duplicating their emoji lists.
- [ ] Correct answers award 1, 2, or 3 stars for easy, medium, or hard respectively.
- [ ] All visible text comes from `useTranslation`.
