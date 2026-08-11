# Add new mini-game - Fair Share Picnic

**Type**: Feature  
**Learning category**: Numeracy - equal grouping and early division  
**Target age**: 5-8 years

## Goal

Teach equal sharing by having children distribute snack emojis across friends' plates until each friend has the same quantity.

## Proposed Changes

- Add `src/games/FairSharePicnic.tsx`, accepting the standard `GameProps`.
- Add a `fairSharePicnic` screen, launcher, and game rendering branch in `src/App.tsx`.
- Add `fairSharePicnic` strings to `src/locales/en.ts`, `de.ts`, `ja.ts`, `ko.ts`, and `fr.ts`.
- Keep snack allocation local; no API, database, or persistent score is required.
- Reuse `GameConfetti`, `DifficultySelector`, `KidButton`, and existing game sounds.

## UI/UX Details

- Show a basket of large snack emoji and two to four illustrated friends with large empty plates.
- Drag one snack at a time to a plate. Snacks remain visibly grouped on their destination plate.
- Once all snacks are placed, automatically evaluate equality rather than requiring a text-based check button.
- Equal result: friends cheer, plates sparkle, `playSuccess()` and confetti run.
- Unequal result: the plates with too many or too few items pulse; allow the child to move snacks between plates without a reset.
- Use `onTouchStart` and `onTouchMove` for the drag path; plates and basket targets must be at least 96px.

| Tier | Rules |
|------|-------|
| Easy | Share 2-6 snacks equally between two friends |
| Medium | Share up to 12 snacks equally between two or three friends |
| Hard | Share up to 20 snacks equally between three or four friends; optionally include one explicitly labeled leftover basket |

- Reward exactly one base star with this game-local multiplier: Easy `1`, Medium `2`, Hard `3`. Call `onStarEarned(1 | 2 | 3)` after a solved round; do not use shared `starMultiplier`.

## Verification Plan

- Add focused generator tests or assertions confirming each generated round has an equal whole-number distribution, and hard-mode leftovers are intentional when included.
- Manually verify touch drag/drop, moving a snack between plates, incorrect distribution feedback, and success feedback.
- Manually verify star awards of 1, 2, and 3.
- Run the project's type check, lint, and test commands.

## Acceptance Criteria

- [ ] Every non-leftover round can be split evenly according to its friend count.
- [ ] The child can correct an uneven share by moving snacks instead of restarting.
- [ ] Difficulty increases snack and friend counts while retaining a <60-second round.
- [ ] Correct rounds award 1, 2, or 3 stars for easy, medium, or hard respectively.
- [ ] All visible text comes from `useTranslation`.
