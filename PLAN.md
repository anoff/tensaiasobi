# 📱 Implementation Plan (Vite + React + Tailwind + Mobile-First)

This document outlines the step-by-step process for building the Kids Play & Learn app, designed primarily for smartphone use in portrait mode. 

## Phase 1: Vite Setup & Mobile-Strict Configuration
- [ ] Initialize the project using Vite: `npm create vite@latest kids-mini-games -- --template react`
- [ ] **Viewport Lock:** Immediately update `index.html` to prevent zooming and scaling:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

```
 * [ ] Install UI Dependencies: npm install -D tailwindcss postcss autoprefixer and npm install react-confetti
 * [ ] Configure tailwind.config.js with a vibrant pastel/candy color palette. Use Tailwind's default mobile-first breakpoints.
## Phase 2: Native App Feel & The "Chunky" UI
 * [ ] **CSS Reset for Kids:** Add the following to your global styles.css to disable native browser behaviors that interrupt gameplay:
   ```css
   body {
     overscroll-behavior-y: contain; /* Prevents pull-to-refresh */
     user-select: none; /* Prevents text highlighting on accidental long-press */
     -webkit-touch-callout: none; /* Disables the iOS popup menu on long press */
     touch-action: manipulation; /* Disables double-tap to zoom */
   }
   
   ```
 * [ ] **Base Layout:** Set App.jsx to h-[100dvh] w-screen overflow-hidden flex flex-col bg-sky-50. Using 100dvh ensures the layout respects the dynamic mobile browser UI.
 * [ ] **Global UI Components:** Create the /src/components directory:
   * KidButton.jsx: A massive (min h-24 w-24), highly rounded (rounded-3xl) button. Prioritize touch responsiveness by utilizing heavy CSS bottom shadows that compress on :active.
   * HomeButton.jsx: A persistent, top-left 🏠 icon for easy game-switching.
## Phase 3: Core Infrastructure & State
 * [ ] Create a single-column, scrolling Main Menu screen utilizing a CSS Grid (grid-cols-2 for mobile, gap-4) of KidButton launchers.
 * [ ] Implement the parent settings dashboard behind a simple math gate to keep toddlers out.
 * [ ] Create a useLocalStorage custom hook to sync app settings and score statistics. Structure the global progress schema in localStorage.
## Phase 4: Game 1 - Bubble Pop Math
 * [ ] **State Management:** Create a custom useMathGame hook managing current numbers, selected level, score, and visual state.
 * [ ] **Mobile Layout:** Render the equation in massive text at the top (text-6xl or larger). Stack the 3 answer bubbles vertically or in a tight cluster in the bottom half of the screen where thumbs can easily reach.
 * [ ] **Feedback Loop:**
   * Correct answer: Trigger react-confetti and advance.
   * Incorrect answer: Apply a CSS animate-bounce or custom shake class to the button.
 * [ ] **Persistence:** Update the streak state on correct answers and save to localStorage.
## Phase 5: Developing Remaining Games
 * [ ] **Odd One Out:**
   * Build using simple arrays of emoji categories. Display options in a 2x2 grid that perfectly fills the center of a smartphone screen.
 * [ ] **Magic Doodle Pad:**
   * Build using a React useRef tied to an HTML5 <canvas> element.
   * **Crucial:** Implement native touch handlers (onTouchStart, onTouchMove, onTouchEnd) rather than mouse handlers to ensure flawless, multi-touch drawing on mobile.
 * [ ] **Animal Memory Match & Sight Word Splat:**
   * Build out using mobile-optimized grids (e.g., max 3 columns wide on mobile so the emoji cards remain large enough for clumsy fingers).
## Phase 6: PWA Conversion & Deployment
 * [ ] **Add to Home Screen (PWA):** Generate a manifest.json and basic Service Worker using a Vite PWA plugin (vite-plugin-pwa). This allows parents to "install" the web app to their phone's home screen.
 * [ ] Set up a GitHub Actions workflow (.github/workflows/deploy.yml) to automatically build and deploy to GitHub Pages.
```
