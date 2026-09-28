import KidButton from './KidButton';
import { useTranslation } from '../hooks/useTranslation';

interface HomeButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  onClick: () => void;
}

export function HomeButton({ onClick, ...props }: HomeButtonProps) {
  const { t } = useTranslation();
  return (
    <KidButton
      color="purple"
      size="sm"
      onClick={onClick}
      aria-label={t.common.home}
      className="!py-2 !px-4"
      {...props}
    >
      🏠
    </KidButton>
  );
}

export default HomeButton;
