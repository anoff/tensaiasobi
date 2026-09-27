# tensaiasobi
give your kids something to do 

A modern, lightning-fast static web app designed for young children (ages 3-8). This project provides quick, educational, and fun mini-games perfect for short bursts of playtime, like waiting at a restaurant. 

**Live Demo:** [Insert GitHub Pages Link Here]

## 🎯 Project Goals
- **Instant Load & Performance:** Powered by Vite and React for snappy state transitions and rendering.
- **Progress Tracking:** Saves game settings and the child's streaks/milestones locally on the device using `localStorage`.
- **Kid-Friendly UX:** Mobile-first, massive tap targets, intuitive interactions, and strictly positive feedback loops (no "Game Over" screens).
- **Restaurant-Safe:** Muted by default. Relies on visual feedback (confetti, screen flashes, emojis) instead of sound effects.

## 🛠️ Tech Stack
- **Bundler & Tooling:** Vite (Fast, optimized production builds for GitHub Pages)
- **Frontend Framework:** React 18+ (Component-based architecture for game states)
- **Styling:** Tailwind CSS (For rapid, responsive layout development and heavy interactive feedback)
- **State Persistence:** Web Storage API (`localStorage`)
- **Hosting:** GitHub Pages

## 🕹️ The Games

Learning games (star challenges focus here first):

1. **Math Pop 🎈** — Addition/subtraction on a notebook answer sheet.
2. **Odd One 🧐** — Categorization for pre-readers.
3. **Animal Match 🐯** — Memory pairs.
4. **Letters ✏️** — Stroke tracing (Latin, Hiragana, Katakana, Hangul).
5. **First Sound 🔤** — Starting-letter / phonics.
6. **Word Chain 🔗** — Shiritori-style last-character matching.
7. **Magic Puzzle 🧩** — Interlocking SVG jigsaw.
8. **City Dispatch 🚒** — Send the right emergency vehicle.
9. **Balance ⚖️** — Seesaw physics.
10. **Tower Sort 🗼** — Stack matching emojis.
11. **Fruit Math Pop 🍎** — Count fruit, then pick the total.
12. **Number Train 🚂** — Count the passengers, tap the right station.
13. **Shadow 🔦** — Identify a silhouette with a flashlight.
14. **Fair Share Picnic 🧺** — Equal sharing / early division.
15. **Pearl Finder 🤿** — Sort pearls into matching clams.

Play games (unlock after a learn-first star goal):

16. **Doodle Pad 🎨** — Finger painting.
17. **Mazes 🗺️** — Path tracing through a generated maze.
18. **Trace ⭐** — Shape outlines.
19. **Emoji Match ⚡** — Dobble-style speed match.

Always available after a goal (and whenever learn-first is off):

- **My Town 🏘️** — Spend stars on a 6×6 sandbox.
- **Coupons 🎟️** — Parent-approved real-world rewards.


## 🚀 Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/anoff/tensaiasobi.git](https://github.com/anoff/tensaiasobi.git)
   cd tensaiasobi

```
 2. **Install dependencies:**
   ```bash
   npm install
   
   ```
 3. **Run the development server:**
   ```bash
   npm run dev
   
   ```
 4. **Build for GitHub Pages:**
   ```bash
   npm run build
   npm run preview
   
   ```
## 🤝 Contributing
Feel free to fork this project and add your own mini-games using React components. Just keep the dependencies light and the UI chunky!
