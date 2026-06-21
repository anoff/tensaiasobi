import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface ParentGateProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ParentGate({ onSuccess, onClose }: ParentGateProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Generate simple addition puzzle for parents (numbers between 5 and 15)
    setNum1(Math.floor(Math.random() * 11) + 5);
    setNum2(Math.floor(Math.random() * 11) + 5);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answer, 10) === num1 + num2) {
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
            {num1} + {num2} = ?
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
