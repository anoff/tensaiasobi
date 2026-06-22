import KidButton from './KidButton';

interface HomeButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  onClick: () => void;
}

export function HomeButton({ onClick, ...props }: HomeButtonProps) {
  return (
    <KidButton
      color="purple"
      size="sm"
      onClick={onClick}
      className="!py-2 !px-4 shadow-[0_4px_0_0_#7c3aed] active:translate-y-[2px] active:shadow-[0_1px_0_0_#7c3aed]"
      {...props}
    >
      🏠
    </KidButton>
  );
}

export default HomeButton;
