# Feature Issue: Implement Child-Safe Freemium Model with RevenueCat & Local Sandbox Free Trial

## 1. Goal
Implement a non-invasive, child-safe **Freemium & One-Time Lifetime Purchase Model** ($9.99 / €9.99 / ¥1,500) that supports a genuine, serverless **3-Day Sandbox Free Trial** accessible only through the gated Parent Dashboard. 

To maintain maximum parent-trust and comply with Apple App Store Kids Category policies:
- Children must experience a 100% peaceful, lock-free playground (unlocked premium games are shown in the launcher; locked premium games are completely hidden rather than grayed out or padlocked).
- All promotion, upselling, and monetization triggers must sit behind the Math Gate inside the Parent Cabin.
- Free-tier users get 5 foundational games unrestricted. Premium/Trial users get all 12+ games.

---

## 2. Technical Design & Proposed Changes

### Step A: Create Premium Status & Sandbox Hook (`src/hooks/usePremium.ts`)
Create a new custom React hook to manage lifetime purchase status (via local storage or a future RevenueCat bridge) and the genuine 3-day sandbox free trial.

**Specification details:**
- Key `premium_purchased` (bool): Handled locally (acting as the bridge for successful RevenueCat transactions).
- Key `premium_trial_start` (string | null): ISO timestamp indicating when the Parent pressed "Start Free Trial".
- Verification: If the current time is within `3 days` (259,200,000 ms) of `premium_trial_start`, active trial returns `true`.

### Step B: Identify "Free Core" vs. "Premium Exclusive" Games
Update [src/App.tsx](src/App.tsx) and our game definition list to separate free core games from premium-exclusive ones.

*   **Free Core (5 Games):** Math (`math`), Odd One Out (`odd`), Doodle Pad (`doodle`), Memory Match (`memory`), Emoji Match (`emojiMatch`).
*   **Premium Exclusive (REST):** Maze, Shape Trace, Letter Trace, Anlaut, Shiritori, Puzzle, Dispatch, Physics, Tower Sort.

In `src/App.tsx`:
```typescript
const FREE_GAME_IDS = ['math', 'odd', 'doodle', 'memory', 'emojiMatch'];
```

### Step C: Menugrid Custom Filtering ([src/App.tsx](src/App.tsx))
Modify the `GAME_LAUNCHERS.map()` function in the main launcher menu so that premium games are *strictly hidden* if `!isPremium`.
```typescript
{GAME_LAUNCHERS.map((launcher) => {
  const isFree = FREE_GAME_IDS.includes(launcher.id);
  if (!isFree && !isPremium) return null; // Keep playground completely un-cluttered for free kids!
  
  const key = launcher.id;
  const allowed = !challengeActive || challengeAllowedGames[key];
  if (!allowed) return null;
  // Render launcher...
})}
```

### Step D: Update Parent Settings View (`src/components/ParentDashboard.tsx`)
Create a designated premium monetization and trial management panel inside the secure dashboard (which sits behind [src/components/ParentGate.tsx](src/components/ParentGate.tsx)).
- **Trial Not Started:** Show a lovely description of the indie developer project, highlight educational advantages of the extra games, and provide a single large button: **"🎁 Start Free 3-Day Trial (No Credit Card Necessary!)"**.
- **Trial Active:** Show a positive visual countdown timer (e.g., *"Trial Active: 2 Days remaining!"*) alongside a payment button to upgrade to the Lifetime Pass.
- **Trial Expired / Free Tier:** Clean upgrade prompt pointing to the **One-Time Lifetime Pass ($9.99)** to keep supporting development. Include a mock trigger labeled *"Restore Purchase"* or *"Purchase Pass"* integrating with RevenueCat / capacitor configuration.

---

## 3. UI & UX Aesthetics

- **Playground Aesthetics:** The child has zero awareness of paying or purchase restrictions. If they only have the free version, they see a beautifully complete 5-game selector screen without any lock icons or gray spaces.
- **Parent Hub Layout:** Rounded candy cards detailing:
  - 🎨 *More Tracing Paths*
  - 🚒 *Interactive Logic Games*
  - 🦁 *Vocal Language & Phonics*
- **Localized Wording:** Must integrate seamlessly across our target localization engines: [src/locales/en.ts](src/locales/en.ts), [src/locales/de.ts](src/locales/de.ts), [src/locales/ja.ts](src/locales/ja.ts), and [src/locales/ko.ts](src/locales/ko.ts).

---

## 4. Verification & Testing Plan

### Manual Verification Path
1. **First-time Install:** Run app, open child menu. Count that exactly 5 games exist.
2. **Access Parent Hub:** Enter Math Gate. Confirm that the "3-Day Trial" section says *"Trial Not Started"*.
3. **Begin Sandbox Trial:** Tap the button. Toast notification pops up, and a countdown displays.
4. **Child View Verification:** Go back to the main menu. All 12+ games should be instantly rendered card-by-card in full vibrant colors.
5. **Simulated Expired Trial:** Manually manipulate localStorage `premium_trial_start` to 4 days ago. Restart app. Verify that excess games hide gracefully and parent dashboard prompts for lifetime purchase.

### Automated Tests (`tests/freemium.spec.ts`)
Write standard Playwright tests:
- Asserts that premium-exclusive launchers do not present selector elements unless `isPremium` is active.
- Verifies entering parent gate and advancing trial state toggles layout lists correctly.
