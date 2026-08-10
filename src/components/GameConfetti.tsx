import Confetti from 'react-confetti';

interface GameConfettiProps {
  pieces?: number;
  recycle?: boolean;
}

export default function GameConfetti({ pieces = 150, recycle = false }: GameConfettiProps) {
  return (
    <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={pieces} recycle={recycle} />
  );
}
