import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { verifyParentIdentity } from '../utils/nativeParentAuth';

interface ParentGateProps {
  onSuccess: () => void;
  onClose: () => void;
}

function generateHardEquation(): { question: string; answer: number } {
  const type = Math.floor(Math.random() * 3);
  switch (type) {
    case 0: {
      // A * B - C
      const a = Math.floor(Math.random() * 6) + 7; // 7 to 12
      const b = Math.floor(Math.random() * 4) + 6; // 6 to 9
      const c = Math.floor(Math.random() * 11) + 5; // 5 to 15
      return {
        question: `${a} × ${b} - ${c}`,
        answer: a * b - c,
      };
    }
    case 1: {
      // (A + B) * C
      const a = Math.floor(Math.random() * 10) + 6; // 6 to 15
      const b = Math.floor(Math.random() * 6) + 5;  // 5 to 10
      const c = Math.floor(Math.random() * 4) + 4;  // 4 to 7
      return {
        question: `(${a} + ${b}) × ${c}`,
        answer: (a + b) * c,
      };
    }
    case 2:
    default: {
      // A * B + C
      const a = Math.floor(Math.random() * 6) + 7; // 7 to 12
      const b = Math.floor(Math.random() * 4) + 6; // 6 to 9
      const c = Math.floor(Math.random() * 16) + 5; // 5 to 20
      return {
        question: `${a} × ${b} + ${c}`,
        answer: a * b + c,
      };
    }
  }
}

export function ParentGate({ onSuccess, onClose }: ParentGateProps) {
  const [challenge] = useState(() => generateHardEquation());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const [showMath, setShowMath] = useState(() => !Capacitor.isNativePlatform());
  const [biometricFailed, setBiometricFailed] = useState(false);
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'parent-gate-title';
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (showMath) return;
    let cancelled = false;
    void verifyParentIdentity(t.parentGate.biometricReason).then((result) => {
      if (cancelled) return;
      if (result === 'success') {
        onSuccessRef.current();
        return;
      }
      setBiometricFailed(true);
      setShowMath(true);
    });
    return () => {
      cancelled = true;
    };
  }, [showMath, t.parentGate.biometricReason]);

  useEffect(() => {
    const focusables = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input, button') ?? []);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answer, 10) === challenge.answer) {
      onSuccess();
    } else {
      setError(true);
      setAnswer('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-3xl border-4 border-slate-300 p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-2xl font-bold text-slate-800 mb-2">{t.parentGate.title}</h2>
        {!showMath ? (
          <div className="space-y-6">
            <p className="text-slate-600 text-sm">{t.parentGate.biometricPending}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm"
            >
              {t.parentGate.cancel}
            </button>
          </div>
        ) : (
          <>
        <p className="text-slate-600 mb-6 text-sm">
          {biometricFailed ? t.parentGate.biometricFallback : t.parentGate.instruction}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-4xl font-extrabold text-indigo-600 mb-4 select-none">
            {challenge.question} = ?
          </div>

          <input
            type="number"
            value={answer}
            onChange={(e) => {
              setError(false);
              setAnswer(e.target.value);
            }}
            placeholder={t.parentGate.placeholder}
            className="w-full text-center text-3xl font-bold py-3 px-4 border-4 border-slate-200 focus:border-indigo-400 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 transition-colors"
            autoFocus
          />

          {error && (
            <p className="text-red-500 font-bold animate-bounce text-sm">
              {t.parentGate.error}
            </p>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
            >
              {t.parentGate.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
            >
              {t.parentGate.verify}
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ParentGate;
