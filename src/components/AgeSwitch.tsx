import type { AgeBand } from '../games/catalog';
import { useTranslation } from '../hooks/useTranslation';
import { CORAL, INK, LEAF, hardShadow } from '../theme/blockTable';

interface AgeSwitchProps {
  value: AgeBand;
  onChange: (band: AgeBand) => void;
}

export function AgeSwitch({ value, onChange }: AgeSwitchProps) {
  const { t } = useTranslation();
  const options = [
    { band: 'little', emoji: '🧸', label: t.menu.agePreschool, fill: CORAL },
    { band: 'big', emoji: '🎒', label: t.menu.ageSchool, fill: LEAF },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4" role="group">
      {options.map(({ band, emoji, label, fill }) => {
        const active = value === band;
        return (
          <button
            key={band}
            type="button"
            data-testid={`age-mode-${band}`}
            aria-pressed={active}
            onClick={() => onChange(band)}
            className={`
              flex min-h-24 items-center justify-center gap-2 rounded-[1.6rem] border-[3px] px-3
              select-none touch-manipulation cursor-pointer outline-none transition-transform duration-75
              focus-visible:ring-4 focus-visible:ring-amber-400/70
              ${active ? 'translate-x-[3px] translate-y-[4px]' : 'active:translate-x-[5px] active:translate-y-[6px] active:[box-shadow:none]'}
            `}
            style={{
              backgroundColor: active ? fill : '#fff8ec',
              borderColor: INK,
              boxShadow: active ? hardShadow(2, 2) : hardShadow(),
              color: active ? '#fff' : INK,
            }}
          >
            <span className="text-4xl leading-none" aria-hidden>{emoji}</span>
            <span className="truncate text-lg font-black tracking-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AgeSwitch;
