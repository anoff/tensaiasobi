import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

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
  const { t } = useTranslation();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl border-4 border-slate-300 p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.parentGate.title}</h2>
        <p className="text-slate-600 mb-6 text-sm">
          {t.parentGate.instruction}
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
            className="w-full text-center text-3xl font-bold py-3 px-4 border-4 border-slate-200 focus:border-indigo-400 rounded-2xl outline-none transition-colors"
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
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm"
            >
              {t.parentGate.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm"
            >
              {t.parentGate.verify}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ParentGate;
