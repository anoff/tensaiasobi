# Feature Issue 1: Interactive Play & Juicy VFX (Petting Zoo + Placement Confetti)

## 1. Goal
Make the Town Builder feel alive, highly responsive, and rewarding for children by merging interactive item tapping ("Petting Zoo" sounds & animations) with satisfying visual effects ("Placement Confetti" particle bursts on placement).

---

## 2. Proposed Changes & Implementation Strategy

### Step A: Placement Confetti FX (`src/games/TownBuilder.tsx`)
When a child purchases and places any item successfully, generate a high-velocity localized burst of physical particles (confetti/sparkles/stars) that erupts from the placed grid cell.
- Integrate or expand the existing particle physics system (derived from `src/utils/particles.ts`).
- Inside `handleBuyItem`, spawn a particle list centered on the selected `{ row, col }` coordinate, tracking gravity, drag, and randomized velocities.
- Render these particles on an absolute-overlay canvas or high-performance SVG layer sitting directly on top of the Town grid.

### Step B: The "Petting Zoo" Interaction Hook (`src/games/TownBuilder.tsx`)
Add full interactive tapped behavior on already existing structures.
- Modify `handleCellClick` to check if a cell is *already occupied*:
  ```typescript
  const handleCellClick = (row: number, col: number) => {
    if (longPressTriggered.current) return;
    const cell = grid[row][col];
    if (cell) {
      // Trigger interactive feedback!
      triggerItemFeedback(cell.itemId, row, col);
    } else {
      // Normal catalog placement
      setActiveCategory('buildings');
      setCatalogCell({ row, col });
      playPop();
    }
  };
  ```
- **Tap Feedback Profiles:**
  - **Animals (🐕, 🐈, 🐇, 🐦):** Play corresponding child-friendly animal vocalizations (woof/bark, meow, pop, chirp) and trigger a heavy bounce-scaling CSS animation.
  - **Vehicles (🚗, 🚚, 🚲, ⛵):** Play honks, sirens, or bell chimes and slide the item 10px laterally with a fast spring-back.
  - **Buildings (🏠, 🏪, 🏫, 🏰):** Play a door chime, spark rise, or window-gleam visual flash.
  - **Decorations (⛲, 🏮, 🚩):** Rotate or splash water droplets upward.

---

## 3. UI/UX Details

- **Responsive Touch Areas:** Placed emojis must have a generous collision padding so small children can easily tap them again.
- **Physical Feedback:** Combine audio effects with native Capacitor haptic vibrations (light double-tap feedback) where supported.
- **Visual Swelling:** Add a custom `@keyframes town-poke-swell` animation scale transition (`scale(1.2)`) that runs exactly once when an item is tapped.

---

## 4. Verification Plan

### Manual Test Steps
1. Open the Town Builder with plenty of stars.
2. Place a **Cat** (`🐈`). Verify that as soon as it lands, a festive splash of stars/confetti sprays outward from its tile.
3. Tap the placed **Cat** again. Confirm it plays a crisp meowing voice and swells dynamically.
4. Tap the placed **Car** (`🚗`). Confirm it plays a car horn and moves bouncy.

### Automated Tests
- Write element tests asserting that clicking an occupied tile triggers the item-specific pop function rather than opening the category catalog.
