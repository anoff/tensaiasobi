# Add new mini-game — Magnet Fishing 🧲

**Type**: Feature  
**Learning category**: Physics / Cause-Effect — magnetism  
**Target age**: 5–7 years

## Concept

Drag a magnet across a “junkyard” to pull out only magnetic objects; non-magnetic items wiggle and stay behind.

## Core mechanic

- Drag the magnet with one finger.
- Magnetic items snap to the magnet; non-magnetic items wiggle and remain.
- Drop collected items into the metal bin to win.

## Difficulty tiers

| Tier | Behavior |
|------|----------|
| Easy | 3 magnetic / 1 non-magnetic; large targets; auto-attract |
| Medium | 5 magnetic / 3 non-magnetic; smaller targets |
| Hard | 7 magnetic / 5 non-magnetic; magnet can hold max 3 items at once |

## Multilingual notes

- Emoji-only items; translate title/help text only.
- Add keys such as `magnetFishing.title`, `.subtitle`, `.help`, `.victory`.
- All five locales must be updated: `en`, `de`, `ja`, `ko`, `fr`.

## Star reward

Use `starMultiplier(difficulty)` with a base of 2 stars → Easy 2×, Medium 6×, Hard 10×.

## Implementation outline

- New component: `src/games/MagnetFishing.tsx`
- Add `Screen` entry and launcher in `src/App.tsx`.
- Add translation keys to `en`, `de`, `ja`, `ko`, `fr`.
- Touch events: `onTouchStart` / `onTouchMove` to track magnet position.
- Snap/drop logic with collision detection against object and bin zones.

## Acceptance criteria

- [ ] Drag mechanic works on mobile with one finger.
- [ ] Magnetic vs non-magnetic feedback is immediate and visually distinct.
- [ ] Difficulty selector affects item count and magnet capacity.
- [ ] Victory awards stars via `onStarEarned`.
- [ ] All visible text uses `useTranslation`.
