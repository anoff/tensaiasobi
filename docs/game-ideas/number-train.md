# Add new mini-game - Number Train

**Type**: Feature  
**Learning category**: Numeracy - quantity-to-numeral mapping and number order  
**Target age**: 5-7 years

## Goal

Help children connect counted emoji passengers with written numerals, then extend that understanding to one more, one less, and number order.

## Proposed Changes

- Add `src/games/NumberTrain.tsx`, accepting the standard `GameProps`.
- Add a `numberTrain` screen, launcher, and game rendering branch in `src/App.tsx`.
- Add `numberTrain` strings to `src/locales/en.ts`, `de.ts`, `ja.ts`, `ko.ts`, and `fr.ts`.
- Keep round generation and train position local; no API, database, or persistent score is required.
- Reuse `GameConfetti`, `DifficultySelector`, `KidButton`, `shuffle`, and the existing game sounds.

## UI/UX Details

- Render a large train with its passenger count shown as emoji people or animals.
- Render large numbered station targets below the train; drag the train to the station matching the answer.
- Easy and medium ask for the exact count. Hard asks for one more or one less, indicated by `+1` or `-1` alongside an animated passenger arriving or leaving.
- Correct drop: train moves into the station, plays `playSuccess()`, then awards stars and starts a new round.
- Incorrect drop: station gate gently closes, the train returns to its start, and `playError()` plays.
- Use pointer/touch-safe drag handling with `onTouchStart` and `onTouchMove`; target stations must be at least 96px.

| Tier | Rules |
|------|-------|
| Easy | Count 1-5 passengers; choose among three numbered stations |
| Medium | Count 1-10 passengers; choose among five numbered stations |
| Hard | Count within 1-20; solve one-more or one-less with five stations |

- Reward exactly one base star with this game-local multiplier: Easy `1`, Medium `2`, Hard `5`. Call `onStarEarned(1 | 2 | 5)` after a correct drop; do not use shared `starMultiplier`.

## Verification Plan

- Add focused generator tests or assertions for valid passenger counts, valid one-more/one-less results, and target station inclusion.
- Manually verify the train can be dragged with one finger and cannot be dropped outside the game stage.
- Manually verify incorrect and correct station feedback, and star awards of 1, 2, and 5.
- Run the project's type check, lint, and test commands.

## Acceptance Criteria

- [ ] The game teaches quantity-to-numeral matching without requiring reading.
- [ ] Difficulty controls the quantity range, choice count, and one-more/one-less behavior.
- [ ] The train is playable using touch alone with chunky station targets.
- [ ] Correct rounds award 1, 2, or 5 stars for easy, medium, or hard respectively.
- [ ] All visible text comes from `useTranslation`.
