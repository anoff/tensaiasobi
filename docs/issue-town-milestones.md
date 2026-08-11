# Feature Issue 3: Milestone Mystery Presents (Hidden Trophies)

## 1. Goal
Create a periodic milestone reward loop where kids receive special gifts (such as high-value/legendary town items) when hitting star thresholds or daily streaks. The gift shouldn't just be handed over; the Town Builder must display a playful notification, and spawn a secret **Present Box (🎁)** hidden under grass squares in the town for the child to find and tap!

---

## 2. Proposed Changes & Implementation Strategy

### Step A: Track Earned Presents (`src/hooks/useStars.ts` or `src/App.tsx`)
1. Create a reactive state or local storage token `unopenedPresentsCount` (number).
2. Whenever stars cross milestones (e.g., every cumulative 100 stars built) or when streaks increment, increment `unopenedPresentsCount`.
3. Provide a way for the Town Builder to query and decrement this count once a present is uncovered.

### Step B: UI Present Notifications in Town (`src/games/TownBuilder.tsx`)
If `unopenedPresentsCount > 0`, render a charming present box badge 🎁 next to the Town icon on the main menu, and place a tiny floating notification banner in the town heading:
- *"Look! A surprise present is hidden in your town! Search the empty grass squares to find it!"*

### Step C: Hiding the Present box
On grid generation:
- Determine a random empty coordinate `{ row, col }` array.
- In this cell, instead of showing the blank "+" placeholder, render a subtly jiggly **Present Box (🎁)** animation!
```typescript
const isPresentCell = isTrialActive && hasPresent && ri === presentRow && ci === presentCol;
```

### Step D: Unboxing Extravaganza!
When the child taps the wiggle parent box:
1. Play a magical dramatic buildup roll (crescendo) and trigger full-screen confetti.
2. Render an elegant, massive overlay card showcasing a random **Legendary / Rare Item** they just discovered:
   - **Dragon** 🦖, **Space Rocket** 🚀, **Unicorn** 🦄, or **UFO** 🛸.
3. Automatically place that rare item onto their grid coordinate, adding it to their town layout permanently!
4. Decrement `unopenedPresentsCount`.

---

## 3. UI/UX Details

- **Suspenseful Animation:** Use a custom keyframe class `present-shimmy` that causes the present box to wiggle every 3 seconds to guide clumsy toddlers to its location on the grid.
- **Vibrant Audio:** Play a joyful chime chord (`playSuccess`) when they crack open the vault. No buying overlays, just pure, hard-earned happiness.

---

## 4. Verification Plan

### Manual Test Steps
1. Cheat the local storage state to trigger a present reward: set `unopenedPresentsCount` to 1.
2. Load the Town Builder. Confirm that a small present box alert banner appears at the top.
3. Look at the empty spaces. Find the jiggly present box `🎁` hidden on one of the grass tiles.
4. Tap the present box. Verify that:
   - A celebration overlay appears showing the unlocked Legendary dinosaur.
   - The tile turns into the new Legendary item.
   - The alert bar closes.
