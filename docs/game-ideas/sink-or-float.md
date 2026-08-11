# Add new mini-game — Sink or Float 🛁

**Type**: Feature  
**Learning category**: Physics / Cause-Effect — buoyancy, material density  
**Target age**: 4–7 years

## Concept

A child predicts whether objects sink or float, drops them into a water tank, and sees the result immediately.

## Core mechanic

- Tap an object, then tap the **water** zone (predict float) or the **down arrow** (predict sink).
- Object animates into the tank and bobs or drops.
- Correct → splash + confetti; wrong → gentle shake + try again.

## Difficulty tiers

| Tier | Behavior |
|------|----------|
| Easy | 2 obvious items; one prediction at a time |
| Medium | 3–4 items with mixed density clues |
| Hard | 4–5 items, some surprising; predict all before any drop |

## Multilingual notes

- Emoji-only objects; only title/help/subtitle require translation.
- Add keys such as `sinkOrFloat.title`, `.subtitle`, `.help`, `.victory`, `.floatLabel`, `.sinkLabel`.
- All five locales must be updated: `en`, `de`, `ja`, `ko`, `fr`.

## Star reward

Use `starMultiplier(difficulty)` with a base of 2 stars → Easy 2×, Medium 6×, Hard 10×.

## Implementation outline

- New component: `src/games/SinkOrFloat.tsx`
- Add `Screen` union entry in `src/App.tsx` and a launcher in `GAME_LAUNCHERS`.
- Add translation keys to all five locale files (`en`, `de`, `ja`, `ko`, `fr`).
- Reuse `GameConfetti`, `DifficultySelector`, `KidButton`.
- State: `objects`, `predictions`, `phase: 'playing' | 'success'`.

## Acceptance criteria

- [ ] One-finger tap interaction only.
- [ ] Round completes in < 60 seconds.
- [ ] Difficulty selector changes object count and complexity.
- [ ] Stars are awarded through `onStarEarned`.
- [ ] All visible strings use `useTranslation`.
