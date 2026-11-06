import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from '../hooks/useTranslation';
import { GAMES, GAME_CATEGORIES, type GameCategory, type GameId } from '../games/catalog';
import { gameUrl } from '../games/gameLink';
import { BUTTER, INK, hardShadow } from '../theme/blockTable';
import { CATEGORY_EMOJI, categoryFill } from '../theme/categories';
import { characterArt, characterForShelf } from '../data/stickers';
import { EmojiHalo, GUIDE_HALO_PX } from './EmojiHalo';
import { LauncherGlyph } from './LauncherGlyph';

/** Parents' guide (#30, #31): screen-lock tip plus what every game is and teaches. Lives behind the parent gate. */

const CREAM = '#fff8ec';
const INK_SOFT = '#6b5a4c';
const CARD_STYLE = { backgroundColor: CREAM, borderColor: INK, boxShadow: hardShadow(5, 6) } as const;

type LockPlatform = 'ios' | 'android';

function defaultLockPlatform(): LockPlatform {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';
  return /android/i.test(navigator.userAgent) ? 'android' : 'ios';
}

function LockTipCard() {
  const { t } = useTranslation();
  const lock = t.guide.lock;
  const [platform, setPlatform] = useState<LockPlatform>(defaultLockPlatform);
  const steps = platform === 'ios' ? lock.iosSteps : lock.androidSteps;

  return (
    <section data-testid="guide-lock" className="rounded-[2rem] border-[3px] p-4 mt-4" style={CARD_STYLE}>
      <h2 className="text-lg font-black" style={{ color: INK }}>{lock.title}</h2>
      <div role="tablist" className="grid grid-cols-2 gap-2 my-3">
        {(['ios', 'android'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            data-testid={`guide-lock-tab-${p}`}
            onClick={() => setPlatform(p)}
            className="h-11 rounded-xl border-[3px] text-sm font-black cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70"
            style={{ borderColor: INK, color: INK, backgroundColor: platform === p ? BUTTER : '#fff' }}
          >
            {p === 'ios' ? lock.ios : lock.android}
          </button>
        ))}
      </div>
      <ol className="flex flex-col gap-2" data-testid="guide-lock-steps">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] font-extrabold leading-[1.35]" style={{ color: INK }}>
            <span
              aria-hidden
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-2 text-[13px] font-black"
              style={{ backgroundColor: BUTTER, borderColor: INK }}
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {platform === 'android' && (
        <p className="mt-2 text-xs font-extrabold" style={{ color: INK_SOFT }}>{lock.androidNote}</p>
      )}
    </section>
  );
}

function ShelfHeader({ shelf }: { shelf: GameCategory }) {
  const { t } = useTranslation();
  const character = characterForShelf(shelf);
  const art = character ? characterArt(character.id, 'idle') : undefined;
  return (
    <h2 className="mt-[22px] mb-2.5 flex items-center gap-2 text-lg font-black" style={{ color: INK }}>
      {art ? (
        <img src={art} alt="" className="h-11 w-11 object-contain" />
      ) : (
        // No drawn character yet (Tortoise): the shelf block from the home screen.
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-[3px] text-lg leading-none"
          style={{ backgroundColor: categoryFill(shelf, 0), borderColor: INK }}
        >
          {CATEGORY_EMOJI[shelf]}
        </span>
      )}
      {t.menu.categories[shelf]}
    </h2>
  );
}

function CopyLinkButton({ id }: { id: GameId }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl(id));
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      data-testid={`guide-copy-${id}`}
      aria-label={t.guide.copyLink}
      onClick={copy}
      className="flex h-11 w-11 items-center justify-center rounded-xl border-2 bg-white text-lg cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70"
      style={{ borderColor: INK, color: INK }}
    >
      <span aria-hidden>{copied ? '✓' : '🔗'}</span>
      <span className="sr-only" aria-live="polite">{copied ? t.guide.copied : ''}</span>
    </button>
  );
}

interface ParentGuideProps {
  onBack: () => void;
}

export function ParentGuide({ onBack }: ParentGuideProps) {
  const { t } = useTranslation();
  // A web link would open the browser, not the app, so the native build gets no copy buttons.
  const showCopy = !Capacitor.isNativePlatform();

  return (
    <div data-testid="parent-guide" className="max-w-md mx-auto w-full pb-10 select-none" style={{ color: INK }}>
      <button
        type="button"
        data-testid="guide-back"
        onClick={onBack}
        className="mt-1.5 h-11 px-3.5 rounded-xl border-[3px] text-[15px] font-black cursor-pointer outline-none transition-all duration-75 active:translate-x-[3px] active:translate-y-[4px] active:[box-shadow:none] focus-visible:ring-4 focus-visible:ring-amber-400/70"
        style={{ backgroundColor: CREAM, borderColor: INK, color: INK, boxShadow: hardShadow(3, 4) }}
      >
        {t.guide.back}
      </button>
      <h1 className="mt-3.5 text-3xl font-black tracking-tight">{t.guide.title}</h1>
      <p className="mt-1 text-sm font-extrabold" style={{ color: INK_SOFT }}>{t.guide.intro}</p>

      <LockTipCard />

      {GAME_CATEGORIES.map((shelf) => (
        <section key={shelf} data-testid={`guide-shelf-${shelf}`}>
          <ShelfHeader shelf={shelf} />
          <div className="rounded-[2rem] border-[3px] px-3.5 py-1" style={CARD_STYLE}>
            {GAMES.filter((game) => game.category === shelf).map((game, i) => {
              const info = t.guide.games[game.id];
              return (
                <div
                  key={game.id}
                  data-testid={`guide-game-${game.id}`}
                  className={`grid grid-cols-[48px_1fr_44px] items-start gap-3 py-3 ${i > 0 ? 'border-t-2' : ''}`}
                  style={{ borderColor: 'rgba(42,28,20,0.1)' }}
                >
                  <span
                    aria-hidden
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px]"
                    style={{ backgroundColor: categoryFill(shelf, i), borderColor: INK }}
                  >
                    <EmojiHalo radius={GUIDE_HALO_PX} className="text-[26px] leading-none">
                      {'glyphSrc' in game && game.glyphSrc ? (
                        <LauncherGlyph emoji={game.emoji} src={game.glyphSrc} sizeClass="h-[26px] w-[26px]" />
                      ) : (
                        game.emoji
                      )}
                    </EmojiHalo>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black leading-tight">{t.menu[game.labelKey]}</h3>
                    <div className="mt-[3px] mb-1 flex gap-1">
                      {game.ageBands.map((band) => (
                        <span
                          key={band}
                          data-testid={`guide-age-${band}`}
                          className="rounded-full border-2 bg-white px-1.5 text-[11px] font-extrabold leading-4"
                          style={{ borderColor: INK }}
                        >
                          {band === 'little' ? `🧸 ${t.guide.agesLittle}` : `🎒 ${t.guide.agesBig}`}
                        </span>
                      ))}
                    </div>
                    <p className="mt-0.5 text-[13px] font-extrabold leading-[1.3]">{info.what}</p>
                    <p className="mt-0.5 text-[13px] font-extrabold leading-[1.3]" style={{ color: INK_SOFT }}>
                      <b className="font-black" style={{ color: INK }}>{t.guide.learns}</b> {info.learn}
                    </p>
                  </div>
                  {showCopy ? <CopyLinkButton id={game.id} /> : <span />}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default ParentGuide;
