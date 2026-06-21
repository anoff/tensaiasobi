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

### 1. Bubble Pop Math
An auto-generating math quiz disguised as a fun bubble-popping game. 
- **Skills:** Addition and Subtraction.
- **Features:** A parent-accessible settings menu to adjust the difficulty (e.g., addition up to 5, addition up to 10). Saves current difficulty and daily "correct answer streaks" via `localStorage`.

### 2. Odd One Out
A visual categorization puzzle for pre-readers.
- **Skills:** Categorization, pattern recognition.
- **Gameplay:** Three emojis belong to the same category, while one does not. Tap the odd one out to win! Tracks completed levels.

### 3. Animal Memory Match
A classic memory card game using CSS grid and emojis.
- **Skills:** Working memory, spatial recall.
- **Gameplay:** Starts at a simple 2x2 grid for toddlers and scales up. Saves the child's fastest time/fewest flips record.

### 4. Magic Doodle Pad
A simple, frustration-free drawing board.
- **Skills:** Fine motor skills, creativity.
- **Gameplay:** Drag a finger to draw with rainbow gradients or stamp emojis. Includes a giant "trash can" button to clear the canvas.


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
