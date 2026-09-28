export type AgeBand = 'little' | 'big';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

/** Props shared by the quiz-style game screens */
export interface GameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
  challengeMode?: boolean;
  /** Home age switch; sets the starting difficulty and which one is locked. */
  ageBand?: AgeBand;
}
