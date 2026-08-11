export type GameDifficulty = 'easy' | 'medium' | 'hard';

/** Props shared by the quiz-style game screens */
export interface GameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
  challengeMode?: boolean;
}
