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

1. **Math Pop 🎈**: Bubble-popping math quiz with adjustable difficulties (addition/subtraction).
2. **Odd One 🧐**: A categorization and logic puzzle for pre-readers.
3. **Animal Match 🐯**: Classic memory card game scaling from 2x2 to larger grids.
4. **Doodle Pad 🎨**: A canvas for drawing with rainbow gradients and stamping emojis.
5. **Mazes 🌀**: A procedurally generated maze solver with different sizes.
6. **Trace ✏️**: Learn shapes and motor control by tracing outlines.
7. **First Sound 🗣️**: Phonics and starting-letter recognition challenge.
8. **Emoji Match 🃏**: Speed matching card patterns using colorful emojis.
9. **Word Chain (Shiritori) 🗣️**: A fun word-building chain game.
10. **Magic Puzzle 🧩**: Jigsaw puzzle with interlocking pieces, silhouette guides, and dynamic SVG cuts.
11. **My Town 🏡**: A sandbox builder to place trees, houses, and roads using stars earned from other games.


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
