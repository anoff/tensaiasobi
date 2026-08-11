# Add new mini-game — Shadow Flashlight 🔦

**Type**: Feature  
**Learning category**: Physics / Cause-Effect — light and shadow  
**Target age**: 4–6 years

## Concept

A dark stage hides a mystery object. The child moves a small circular flashlight with their finger to reveal its silhouette, then taps the matching emoji from 2–3 choices.

## Core mechanic

- Drag a flashlight circle over a dark stage to reveal the hidden silhouette.
- Tap one of the answer choices to identify the object.
- Correct → full reveal + confetti; wrong → shake + try again.

## Difficulty tiers

| Tier | Behavior |
|------|----------|
| Easy | 2 choices; distinct shapes; larger flashlight radius |
| Medium | 3 choices; similar outlines; smaller radius |
| Hard | 3 choices; rotated/partial silhouette; smallest radius + distractor outlines |

## Multilingual notes

- Emoji-only or SVG silhouettes; no locale-specific assets.
- Add keys such as `shadowFlashlight.title`, `.subtitle`, `.help`, `.victory`.
- All five locales must be updated: `en`, `de`, `ja`, `ko`, `fr`.

## Star reward

Use `starMultiplier(difficulty)` with a base of 2 stars → Easy 2×, Medium 6×, Hard 10×.

## Implementation outline

- New component: `src/games/ShadowFlashlight.tsx`
- Add `Screen` entry and launcher in `src/App.tsx`.
- Add translation keys to all five locales.
- Use CSS `clip-path` or `mask-image` for the flashlight circle; update position from touch events.
- Hidden object can be rendered as a large emoji or SVG silhouette.

## Open questions

1. Should the revealed shape be a **filled black silhouette** or the normal colored emoji?
2. How many base stars should be awarded per round?
3. Should the flashlight radius be fixed per difficulty or configurable?

## Acceptance criteria

- [ ] Flashlight follows finger drag and stays within bounds.
- [ ] Object is only visible inside the beam.
- [ ] Answer choices are shown below/around the stage.
- [ ] Win condition triggers `playSuccess`, confetti, and `onStarEarned`.
- [ ] All visible text uses `useTranslation`.
