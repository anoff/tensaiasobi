import { useState, useRef, useEffect } from 'react';
import KidButton from './KidButton';

interface ConfirmWipeButtonProps {
  
  onConfirm: () => void;
  
  label?: string;
  
  confirmLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}


export function ConfirmWipeButton({
  onConfirm,
  label = '🗑️',
  confirmLabel = '🗑️ ?',
  size = 'md',
  className = '',
  ...props
}: ConfirmWipeButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (confirming) {
      // Second tap — execute wipe
      setConfirming(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      onConfirm();
    } else {
      // First tap — enter confirm state
      setConfirming(true);
      timerRef.current = setTimeout(() => {
        setConfirming(false);
      }, 2000);
    }
  };

  return (
    <KidButton
      color="red"
      size={size}
      onClick={handleClick}
      className={`
        transition-all
        ${confirming ? 'animate-shake ring-4 ring-red-300/60 scale-110' : ''}
        ${className}
      `}
      data-testid={props['data-testid']}
    >
      {confirming ? confirmLabel : label}
    </KidButton>
  );
}

export default ConfirmWipeButton;
