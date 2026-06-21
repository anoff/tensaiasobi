import React from 'react';
import KidButton from './KidButton';

interface HomeButtonProps {
  onClick: () => void;
}

export function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <KidButton
      color="purple"
      size="sm"
      onClick={onClick}
      className="!py-2 !px-4 shadow-[0_4px_0_0_#7c3aed] active:translate-y-[2px] active:shadow-[0_1px_0_0_#7c3aed]"
    >
      🏠 Home
    </KidButton>
  );
}

export default HomeButton;
