import React, { useState, useRef } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import ConfirmWipeButton from '../components/ConfirmWipeButton';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation, Language } from '../hooks/useTranslation';
import { getCanvasCoords } from '../utils/canvas';
import { starMultiplier } from '../utils/difficulty';
import { useCanvasLoop } from '../hooks/useCanvasLoop';
import { spawnParticles, drawParticles, type Particle } from '../utils/particles';
import {
  getPixelCoord,
  getDistanceToPath,
  getPathSamples,
  getMarginSize as marginMultiplier,
  type Point,
} from '../utils/traceGeometry';

interface LetterStroke {
  points: Point[];
}

interface LetterDef {
  id: string;
  char: string;
  color: string;
  strokes: LetterStroke[];
}

export type LetterLevel = 'latin' | 'hiragana' | 'katakana' | 'hangul';

const PALETTE = [
  '#FF4D4D', '#FFAB40', '#FFD740', '#69F0AE', '#4FC3F7',
  '#7C4DFF', '#FF4081', '#00E5FF', '#CE93D8', '#FFF176',
];

/** Generates a series of points along an elliptical arc, used to approximate curved letter strokes. */
function arc(cx: number, cy: number, rx: number, ry: number, startDeg: number, endDeg: number, steps = 12): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + ((endDeg - startDeg) * i) / steps;
    const rad = (deg * Math.PI) / 180;
    pts.push({ x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) });
  }
  return pts;
}

function stroke(...points: Point[]): LetterStroke {
  return { points };
}

function makeLetters(chars: { char: string; strokes: LetterStroke[] }[]): LetterDef[] {
  return chars.map((c, idx) => ({
    id: `${c.char}-${idx}`,
    char: c.char,
    color: PALETTE[idx % PALETTE.length],
    strokes: c.strokes,
  }));
}

// Latin alphabet (A-Z), shared across English/German/French — a blocky, simplified stroke-order
// approximation designed to sit as a tracing guide on top of the real character glyph.
const LATIN_LETTERS: LetterDef[] = makeLetters([
  {
    char: 'A',
    strokes: [
      stroke({ x: 20, y: 85 }, { x: 50, y: 15 }),
      stroke({ x: 50, y: 15 }, { x: 80, y: 85 }),
      stroke({ x: 32, y: 62 }, { x: 68, y: 62 }),
    ],
  },
  {
    char: 'B',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 15 }, { x: 55, y: 15 }, { x: 68, y: 24 }, { x: 68, y: 40 }, { x: 55, y: 50 }, { x: 20, y: 50 }, { x: 58, y: 50 }, { x: 72, y: 62 }, { x: 72, y: 74 }, { x: 58, y: 85 }, { x: 20, y: 85 }),
    ],
  },
  {
    char: 'C',
    strokes: [
      stroke(...arc(50, 50, 32, 35, -60, -300, 16)),
    ],
  },
  {
    char: 'D',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke(...[{ x: 20, y: 15 }, ...arc(20, 50, 34, 35, -90, 90, 14), { x: 20, y: 85 }]),
    ],
  },
  {
    char: 'E',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 15 }, { x: 75, y: 15 }),
      stroke({ x: 20, y: 50 }, { x: 65, y: 50 }),
      stroke({ x: 20, y: 85 }, { x: 75, y: 85 }),
    ],
  },
  {
    char: 'F',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 15 }, { x: 75, y: 15 }),
      stroke({ x: 20, y: 50 }, { x: 65, y: 50 }),
    ],
  },
  {
    char: 'G',
    strokes: [
      stroke(...arc(50, 50, 32, 35, -60, -300, 16)),
      stroke({ x: 75, y: 50 }, { x: 75, y: 68 }, { x: 50, y: 68 }),
    ],
  },
  {
    char: 'H',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 80, y: 15 }, { x: 80, y: 85 }),
      stroke({ x: 20, y: 50 }, { x: 80, y: 50 }),
    ],
  },
  {
    char: 'I',
    strokes: [
      stroke({ x: 50, y: 15 }, { x: 50, y: 85 }),
    ],
  },
  {
    char: 'J',
    strokes: [
      stroke({ x: 65, y: 15 }, { x: 65, y: 70 }, { x: 58, y: 82 }, { x: 45, y: 82 }, { x: 35, y: 75 }),
    ],
  },
  {
    char: 'K',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 50 }, { x: 75, y: 15 }),
      stroke({ x: 20, y: 50 }, { x: 75, y: 85 }),
    ],
  },
  {
    char: 'L',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 85 }, { x: 75, y: 85 }),
    ],
  },
  {
    char: 'M',
    strokes: [
      stroke({ x: 20, y: 85 }, { x: 20, y: 15 }),
      stroke({ x: 20, y: 15 }, { x: 50, y: 60 }, { x: 80, y: 15 }, { x: 80, y: 85 }),
    ],
  },
  {
    char: 'N',
    strokes: [
      stroke({ x: 20, y: 85 }, { x: 20, y: 15 }),
      stroke({ x: 20, y: 15 }, { x: 80, y: 85 }),
      stroke({ x: 80, y: 85 }, { x: 80, y: 15 }),
    ],
  },
  {
    char: 'O',
    strokes: [
      stroke(...arc(50, 50, 32, 35, -90, 270, 20)),
    ],
  },
  {
    char: 'P',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 15 }, { x: 55, y: 15 }, { x: 68, y: 24 }, { x: 68, y: 40 }, { x: 55, y: 50 }, { x: 20, y: 50 }),
    ],
  },
  {
    char: 'Q',
    strokes: [
      stroke(...arc(50, 50, 32, 35, -90, 270, 20)),
      stroke({ x: 60, y: 62 }, { x: 78, y: 80 }),
    ],
  },
  {
    char: 'R',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 15 }, { x: 55, y: 15 }, { x: 68, y: 24 }, { x: 68, y: 40 }, { x: 55, y: 50 }, { x: 20, y: 50 }),
      stroke({ x: 45, y: 50 }, { x: 78, y: 85 }),
    ],
  },
  {
    char: 'S',
    strokes: [
      stroke({ x: 68, y: 25 }, { x: 50, y: 15 }, { x: 32, y: 22 }, { x: 28, y: 35 }, { x: 38, y: 45 }, { x: 62, y: 55 }, { x: 72, y: 65 }, { x: 68, y: 78 }, { x: 50, y: 85 }, { x: 32, y: 80 }),
    ],
  },
  {
    char: 'T',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 80, y: 15 }),
      stroke({ x: 50, y: 15 }, { x: 50, y: 85 }),
    ],
  },
  {
    char: 'U',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 20, y: 65 }, ...arc(50, 65, 30, 20, 180, 360, 10), { x: 80, y: 15 }),
    ],
  },
  {
    char: 'V',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 50, y: 85 }, { x: 80, y: 15 }),
    ],
  },
  {
    char: 'W',
    strokes: [
      stroke({ x: 15, y: 15 }, { x: 35, y: 85 }, { x: 50, y: 45 }),
      stroke({ x: 50, y: 45 }, { x: 65, y: 85 }, { x: 85, y: 15 }),
    ],
  },
  {
    char: 'X',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 80, y: 85 }),
      stroke({ x: 80, y: 15 }, { x: 20, y: 85 }),
    ],
  },
  {
    char: 'Y',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 50, y: 50 }),
      stroke({ x: 80, y: 15 }, { x: 50, y: 50 }, { x: 50, y: 85 }),
    ],
  },
  {
    char: 'Z',
    strokes: [
      stroke({ x: 20, y: 15 }, { x: 80, y: 15 }),
      stroke({ x: 80, y: 15 }, { x: 20, y: 85 }),
      stroke({ x: 20, y: 85 }, { x: 80, y: 85 }),
    ],
  },
]);

// Hiragana — a curated starter set (vowels + the "ka" row). Stroke order, direction and the
// rounded shapes of each glyph are derived from the KanjiVG stroke-path dataset
// (https://kanjivg.tagaini.net, CC BY-SA 3.0), downsampled into a simplified tracing corridor
// sized to sit directly on top of the rendered background character.
const HIRAGANA_LETTERS: LetterDef[] = makeLetters([
  {
    char: 'あ',
    strokes: [
      stroke({ x: 36, y: 38 }, { x: 59, y: 36.3 }),
      stroke({ x: 46.4, y: 29.4 }, { x: 44.2, y: 57.2 }, { x: 46.2, y: 69.7 }),
      stroke({ x: 55.3, y: 44.2 }, { x: 52.2, y: 54.8 }, { x: 41.9, y: 67 }, { x: 35.7, y: 68.9 }, { x: 32.4, y: 63.3 }, { x: 34.5, y: 56.9 }, { x: 41.5, y: 51 }, { x: 52.4, y: 47.6 }, { x: 61.4, y: 48.9 }, { x: 66.6, y: 53.2 }, { x: 67.5, y: 62.1 }, { x: 63.8, y: 67.9 }, { x: 55.7, y: 72 }),
    ],
  },
  {
    char: 'い',
    strokes: [
      stroke({ x: 30.7, y: 36.1 }, { x: 32.6, y: 57.3 }, { x: 38.7, y: 65.2 }, { x: 40.2, y: 60.4 }),
      stroke({ x: 59.3, y: 39.9 }, { x: 66.7, y: 48.6 }, { x: 69.6, y: 58.7 }),
    ],
  },
  {
    char: 'う',
    strokes: [
      stroke({ x: 42.1, y: 28.3 }, { x: 52.4, y: 30.2 }, { x: 49.1, y: 33 }),
      stroke({ x: 37.1, y: 43.2 }, { x: 41.6, y: 44 }, { x: 52.6, y: 40.1 }, { x: 57.2, y: 44.8 }, { x: 55.8, y: 59.8 }, { x: 44.3, y: 73 }),
    ],
  },
  {
    char: 'え',
    strokes: [
      stroke({ x: 41.3, y: 27 }, { x: 52.4, y: 29 }, { x: 48.9, y: 31.7 }),
      stroke({ x: 36.8, y: 44.7 }, { x: 53.2, y: 39.4 }, { x: 55.9, y: 41.2 }, { x: 32.4, y: 67.9 }, { x: 47.3, y: 56.4 }, { x: 52.3, y: 70 }, { x: 65.5, y: 70 }),
    ],
  },
  {
    char: 'お',
    strokes: [
      stroke({ x: 31.5, y: 39.2 }, { x: 35.2, y: 40.3 }, { x: 49.8, y: 36 }),
      stroke({ x: 41.8, y: 28.6 }, { x: 43.5, y: 33.2 }, { x: 42, y: 69.5 }, { x: 31.2, y: 63.7 }, { x: 32.4, y: 59 }, { x: 40.9, y: 53 }, { x: 50.7, y: 49.6 }, { x: 61, y: 49.7 }, { x: 67.7, y: 53.5 }, { x: 69.1, y: 60.9 }, { x: 64.3, y: 66.9 }, { x: 54.6, y: 70.4 }),
      stroke({ x: 59.3, y: 31.9 }, { x: 65.3, y: 36.6 }, { x: 64.6, y: 39.3 }),
    ],
  },
  {
    char: 'か',
    strokes: [
      stroke({ x: 32.5, y: 41.1 }, { x: 48.1, y: 39.2 }, { x: 53, y: 41.6 }, { x: 53.3, y: 52 }, { x: 50, y: 63.1 }, { x: 45.9, y: 68.5 }, { x: 42.3, y: 66 }),
      stroke({ x: 45.7, y: 29.4 }, { x: 43.1, y: 40.7 }, { x: 29.9, y: 66.7 }),
      stroke({ x: 61.8, y: 37.2 }, { x: 70.1, y: 51 }),
    ],
  },
  {
    char: 'き',
    strokes: [
      stroke({ x: 35.7, y: 36.5 }, { x: 56.4, y: 32.4 }),
      stroke({ x: 38.9, y: 46.7 }, { x: 61.1, y: 42.1 }),
      stroke({ x: 42.1, y: 27.5 }, { x: 62.1, y: 56.6 }, { x: 55.7, y: 55.1 }),
      stroke({ x: 37.5, y: 65.9 }, { x: 46.8, y: 70 }, { x: 58.7, y: 68.7 }),
    ],
  },
  {
    char: 'く',
    strokes: [
      stroke({ x: 52.5, y: 28 }, { x: 51.9, y: 32.1 }, { x: 39.9, y: 48.6 }, { x: 53.4, y: 71.7 }),
    ],
  },
  {
    char: 'け',
    strokes: [
      stroke({ x: 32.5, y: 30.6 }, { x: 30.9, y: 58 }, { x: 31.8, y: 64.1 }, { x: 34.7, y: 57 }),
      stroke({ x: 48.6, y: 41.1 }, { x: 67.7, y: 39.1 }),
      stroke({ x: 58.6, y: 27.6 }, { x: 59.9, y: 57.4 }, { x: 53.3, y: 70.7 }),
    ],
  },
  {
    char: 'こ',
    strokes: [
      stroke({ x: 38.1, y: 34.5 }, { x: 57.6, y: 34.2 }, { x: 50.7, y: 38.9 }),
      stroke({ x: 35.4, y: 57.5 }, { x: 37.8, y: 62.9 }, { x: 43.4, y: 66.2 }, { x: 62.5, y: 65.2 }),
    ],
  },
]);

// Katakana — matching set (vowels + the "ka" row). Stroke geometry is likewise derived from the
// KanjiVG dataset (https://kanjivg.tagaini.net, CC BY-SA 3.0) and simplified to fit the glyph box.
const KATAKANA_LETTERS: LetterDef[] = makeLetters([
  {
    char: 'ア',
    strokes: [
      stroke({ x: 31.8, y: 33.7 }, { x: 66.2, y: 30.3 }, { x: 66.8, y: 32.8 }, { x: 52.5, y: 42.8 }),
      stroke({ x: 48.8, y: 42.2 }, { x: 45.9, y: 56.2 }, { x: 37.7, y: 71.3 }),
    ],
  },
  {
    char: 'イ',
    strokes: [
      stroke({ x: 58.3, y: 28.2 }, { x: 47.2, y: 43.2 }, { x: 31.2, y: 55.9 }),
      stroke({ x: 50.6, y: 43.8 }, { x: 51.3, y: 73 }),
    ],
  },
  {
    char: 'ウ',
    strokes: [
      stroke({ x: 48.8, y: 27 }, { x: 49.6, y: 36.9 }),
      stroke({ x: 33.5, y: 36.5 }, { x: 34.6, y: 52.3 }),
      stroke({ x: 35, y: 39.2 }, { x: 65.3, y: 35.8 }, { x: 67.4, y: 37.5 }, { x: 57.6, y: 57.6 }, { x: 43.2, y: 72.4 }),
    ],
  },
  {
    char: 'エ',
    strokes: [
      stroke({ x: 36.6, y: 39.1 }, { x: 64.1, y: 37.2 }),
      stroke({ x: 48.9, y: 40.5 }, { x: 49, y: 60 }),
      stroke({ x: 29.2, y: 61.9 }, { x: 70.5, y: 60.9 }),
    ],
  },
  {
    char: 'オ',
    strokes: [
      stroke({ x: 29.5, y: 40.3 }, { x: 70.8, y: 38.6 }),
      stroke({ x: 52.9, y: 28 }, { x: 53.5, y: 69.1 }, { x: 52.3, y: 71.6 }, { x: 48.4, y: 68.3 }),
      stroke({ x: 52.9, y: 39.5 }, { x: 31, y: 61.8 }),
    ],
  },
  {
    char: 'カ',
    strokes: [
      stroke({ x: 32.9, y: 41.9 }, { x: 62.6, y: 39.3 }, { x: 66.5, y: 40.8 }, { x: 58.2, y: 66.4 }, { x: 55.2, y: 69.7 }, { x: 50, y: 67.4 }),
      stroke({ x: 50.4, y: 28.4 }, { x: 45.9, y: 47.9 }, { x: 33.4, y: 66 }),
    ],
  },
  {
    char: 'キ',
    strokes: [
      stroke({ x: 33.8, y: 41.8 }, { x: 64.6, y: 35.8 }),
      stroke({ x: 29.5, y: 56.3 }, { x: 69.8, y: 48.2 }),
      stroke({ x: 46.3, y: 28.2 }, { x: 54.1, y: 72.1 }),
    ],
  },
  {
    char: 'ク',
    strokes: [
      stroke({ x: 47, y: 29.9 }, { x: 37.5, y: 46.6 }),
      stroke({ x: 47.7, y: 35 }, { x: 62.2, y: 32 }, { x: 64, y: 34.3 }, { x: 52.3, y: 53.9 }, { x: 35.8, y: 69.8 }),
    ],
  },
  {
    char: 'ケ',
    strokes: [
      stroke({ x: 41.8, y: 28.9 }, { x: 38.4, y: 38.8 }, { x: 30.7, y: 50.1 }),
      stroke({ x: 40, y: 40.2 }, { x: 69.6, y: 36.5 }),
      stroke({ x: 55.3, y: 40.9 }, { x: 50.8, y: 57.3 }, { x: 41.1, y: 69.8 }),
    ],
  },
  {
    char: 'コ',
    strokes: [
      stroke({ x: 35.6, y: 38.7 }, { x: 64.9, y: 36.4 }, { x: 61.3, y: 60.7 }),
      stroke({ x: 34.1, y: 63 }, { x: 63.7, y: 61.9 }),
    ],
  },
]);

// Hangul — basic consonant jamo, whose geometric block-letter shapes map nicely onto straight strokes.
const HANGUL_LETTERS: LetterDef[] = makeLetters([
  {
    char: 'ㄱ',
    strokes: [
      stroke({ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 75, y: 80 }),
    ],
  },
  {
    char: 'ㄴ',
    strokes: [
      stroke({ x: 25, y: 20 }, { x: 25, y: 80 }, { x: 78, y: 80 }),
    ],
  },
  {
    char: 'ㄷ',
    strokes: [
      stroke({ x: 75, y: 20 }, { x: 25, y: 20 }),
      stroke({ x: 25, y: 20 }, { x: 25, y: 80 }, { x: 75, y: 80 }),
    ],
  },
  {
    char: 'ㄹ',
    strokes: [
      stroke({ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 75, y: 48 }, { x: 25, y: 48 }),
      stroke({ x: 25, y: 58 }, { x: 75, y: 58 }, { x: 75, y: 82 }, { x: 25, y: 82 }),
    ],
  },
  {
    char: 'ㅁ',
    strokes: [
      stroke({ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 75, y: 80 }, { x: 25, y: 80 }, { x: 25, y: 20 }),
    ],
  },
  {
    char: 'ㅂ',
    strokes: [
      stroke({ x: 25, y: 20 }, { x: 75, y: 20 }, { x: 75, y: 80 }, { x: 25, y: 80 }, { x: 25, y: 20 }),
      stroke({ x: 50, y: 20 }, { x: 50, y: 80 }),
    ],
  },
  {
    char: 'ㅅ',
    strokes: [
      stroke({ x: 50, y: 20 }, { x: 25, y: 80 }),
      stroke({ x: 50, y: 20 }, { x: 75, y: 80 }),
    ],
  },
  {
    char: 'ㅇ',
    strokes: [
      stroke(...arc(50, 50, 30, 30, -90, 270, 16)),
    ],
  },
  {
    char: 'ㅈ',
    strokes: [
      stroke({ x: 30, y: 22 }, { x: 70, y: 22 }),
      stroke({ x: 50, y: 22 }, { x: 25, y: 55 }, { x: 75, y: 55 }, { x: 35, y: 85 }),
    ],
  },
  {
    char: 'ㅎ',
    strokes: [
      stroke({ x: 40, y: 15 }, { x: 60, y: 15 }),
      stroke(...arc(50, 30, 10, 8, -90, 270, 8)),
      stroke(...arc(50, 65, 28, 22, -90, 270, 14)),
    ],
  },
]);

const LEVEL_DATA: Record<LetterLevel, LetterDef[]> = {
  latin: LATIN_LETTERS,
  hiragana: HIRAGANA_LETTERS,
  katakana: KATAKANA_LETTERS,
  hangul: HANGUL_LETTERS,
};

// Only surface the scripts that are relevant for the app's current language: Latin for
// English/German/French, Hiragana + Katakana for Japanese, and Hangul for Korean.
const LEVELS_BY_LANGUAGE: Record<Language, LetterLevel[]> = {
  en: ['latin'],
  de: ['latin'],
  fr: ['latin'],
  ja: ['hiragana', 'katakana'],
  ko: ['hangul'],
};

// Stroke validation thresholds — deliberately stricter than ShapeTrace's since letter formation
// requires better precision and correct stroke order.
const START_TOLERANCE_MULTIPLIER = 1.6; // How close the first drawn point must be to the stroke's numbered start marker.
const COVERAGE_TOLERANCE_MULTIPLIER = 1.3; // How close a drawn point must be to "cover" a sample of the target stroke.
const ACCURACY_THRESHOLD = 0.85; // Share of drawn points that must stay within the corridor margin.
const COMPLETION_THRESHOLD = 0.82; // Share of the target stroke that must be covered by drawn points.

export function LetterTrace({ playPop, playSuccess, playError, onStarEarned }: GameProps) {
  const { t, language } = useTranslation();
  const levels = LEVELS_BY_LANGUAGE[language];
  const [level, setLevel] = useState<LetterLevel>(levels[0]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showErrorShake, setShowErrorShake] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);

  const letters = LEVEL_DATA[level];
  const letter = letters[letterIndex];
  const activeStrokeIndex = completedStrokes.length;

  // Letter tracing is intentionally stricter than shape tracing: tighter corridors at every difficulty.
  const getMarginSize = (canvasWidth: number): number =>
    marginMultiplier(canvasWidth, difficulty, { easy: 0.1, medium: 0.06, hard: 0.035 });

  const resetProgress = () => {
    setCompletedStrokes([]);
    setCurrentPoints([]);
    setIsWon(false);
    setShowConfetti(false);
    setShowErrorShake(false);
    particlesRef.current = [];
  };

  const loadLetter = (idx: number) => {
    setLetterIndex(idx);
    resetProgress();
  };

  const changeLevel = (lvl: LetterLevel) => {
    playPop();
    setLevel(lvl);
    setLetterIndex(0);
    resetProgress();
  };

  const nextLetter = () => {
    playPop();
    const nextIdx = (letterIndex + 1) % letters.length;
    loadLetter(nextIdx);
  };

  useCanvasLoop(
    canvasRef,
    containerRef,
    (ctx, size) => {
      const marginSize = getMarginSize(size);

      const drawStrokePath = (points: Point[], strokeSize: number) => {
        ctx.beginPath();
        points.forEach((p, idx) => {
          const pt = getPixelCoord(p, strokeSize);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      };

      const drawStrokeMarker = (points: Point[], strokeSize: number, label: string, opts: { pulse: boolean; alpha: number; fill: string }) => {
        if (points.length === 0) return;
        const start = getPixelCoord(points[0], strokeSize);
        const radius = opts.pulse ? 11 + Math.sin(Date.now() / 150) * 3 : 9;

        ctx.save();
        ctx.globalAlpha = opts.alpha;
        ctx.fillStyle = opts.fill;
        if (opts.pulse) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = opts.fill;
        }
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, start.x, start.y);
        ctx.restore();
      };

      ctx.clearRect(0, 0, size, size);

      // 1. Background Silhouette Character
      ctx.save();
      ctx.globalAlpha = isWon ? 1.0 : 0.08;
      ctx.font = `${size * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!isWon) {
        ctx.fillStyle = '#000000';
      }
      ctx.fillText(letter.char, size / 2, size / 2);
      ctx.restore();

      if (!isWon) {
        letter.strokes.forEach((strokeDef, idx) => {
          const isDone = idx < activeStrokeIndex;
          const isActive = idx === activeStrokeIndex;

          if (!isDone) {
            // Shaded corridor margin + dashed guide line for strokes not yet drawn.
            ctx.save();
            ctx.globalAlpha = isActive ? 1 : 0.35;
            ctx.strokeStyle = `${letter.color}26`;
            ctx.lineWidth = marginSize * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            drawStrokePath(strokeDef.points, size);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = isActive ? 1 : 0.35;
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            drawStrokePath(strokeDef.points, size);
            ctx.restore();
          } else {
            // Already-completed strokes: render the child's actual ink permanently.
            const drawnPoints = completedStrokes[idx];
            if (drawnPoints && drawnPoints.length > 1) {
              ctx.save();
              ctx.strokeStyle = letter.color;
              ctx.lineWidth = Math.max(5, size * 0.02);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              drawnPoints.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();
              ctx.restore();
            }
          }

          // Numbered sequence marker at the start of every stroke.
          drawStrokeMarker(strokeDef.points, size, String(idx + 1), {
            pulse: isActive,
            alpha: isDone ? 0.55 : isActive ? 1 : 0.55,
            fill: isDone ? '#94A3B8' : isActive ? '#4CAF50' : '#CBD5E1',
          });
        });
      }

      // Player crayon drawing points for the stroke currently in progress.
      if (currentPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = letter.color;
        ctx.lineWidth = Math.max(5, size * 0.02);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = letter.color;
        ctx.beginPath();
        currentPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Draw particles
      drawParticles(ctx, particlesRef.current);
    },
    [letter, activeStrokeIndex, completedStrokes, currentPoints, isWon, difficulty],
    420
  );

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    isDrawingRef.current = true;
    playPop();
    setCurrentPoints([coords]);
    setShowErrorShake(false);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    setCurrentPoints((prev) => [...prev, coords]);

    if (Math.random() < 0.25) {
      spawnParticles(particlesRef.current, coords.x, coords.y, letter.color, 8);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || isWon) {
      isDrawingRef.current = false;
      return;
    }
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    const strokeDef = letter.strokes[activeStrokeIndex];
    if (!canvas || !strokeDef || currentPoints.length < 3) {
      playError();
      setShowErrorShake(true);
      setCurrentPoints([]);
      setTimeout(() => setShowErrorShake(false), 500);
      return;
    }

    const size = canvas.width;
    const marginSize = getMarginSize(size);
    const pixelPoints = strokeDef.points.map((p) => getPixelCoord(p, size));

    // Sequence check: the stroke must begin close to its numbered starting point.
    const startDistance = Math.hypot(
      currentPoints[0].x - pixelPoints[0].x,
      currentPoints[0].y - pixelPoints[0].y
    );
    const startsCorrectly = startDistance <= marginSize * START_TOLERANCE_MULTIPLIER;

    // Accuracy check: drawn points must stay within the corridor.
    let pointsInside = 0;
    currentPoints.forEach((pt) => {
      const dist = getDistanceToPath(pt, pixelPoints);
      if (dist <= marginSize) {
        pointsInside += 1;
      }
    });
    const accuracyRate = pointsInside / currentPoints.length;
    const isAccurate = accuracyRate >= ACCURACY_THRESHOLD;

    // Completeness check: the whole target stroke must be covered.
    const targetSamples = getPathSamples(pixelPoints);
    let coveredSamples = 0;
    targetSamples.forEach((sample) => {
      const isCovered = currentPoints.some((pt) => Math.hypot(pt.x - sample.x, pt.y - sample.y) <= marginSize * COVERAGE_TOLERANCE_MULTIPLIER);
      if (isCovered) coveredSamples += 1;
    });
    const completionRate = coveredSamples / Math.max(1, targetSamples.length);
    const isComplete = completionRate >= COMPLETION_THRESHOLD;

    if (startsCorrectly && isAccurate && isComplete) {
      playPop();
      const finishedStroke = currentPoints;
      setCompletedStrokes((prev) => {
        const next = [...prev, finishedStroke];
        if (next.length >= letter.strokes.length) {
          setIsWon(true);
          setShowConfetti(true);
          playSuccess();
          const multiplier = starMultiplier(difficulty);
          onStarEarned?.(3 * multiplier);
        }
        return next;
      });
      setCurrentPoints([]);
    } else {
      playError();
      setShowErrorShake(true);
      setCurrentPoints([]);
      setTimeout(() => setShowErrorShake(false), 500);
    }
  };

  const handleReset = () => {
    playPop();
    resetProgress();
  };

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full animate-fade-in">
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      {/* Level Selector: only the scripts relevant to the current language are shown */}
      {levels.length > 1 && (
      <div className="w-full flex justify-between bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 gap-1.5 select-none shrink-0">
        {levels.map((lvl) => (
          <button
            key={lvl}
            data-testid={`letter-trace-level-${lvl}`}
            onClick={() => changeLevel(lvl)}
            className={`
              flex-1 py-2 text-xs sm:text-sm font-black rounded-xl border-b-4 transition-all duration-75 outline-none cursor-pointer select-none
              ${level === lvl
                ? 'bg-candy-purple text-white border-purple-700 shadow-sm translate-y-[2px]'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 active:translate-y-[1px]'
              }
            `}
          >
            {t.letterTrace.levels[lvl]}
          </button>
        ))}
      </div>
      )}

      {/* Letter Palette Selector */}
      <div className="w-full flex justify-between bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0 gap-1.5 overflow-x-auto select-none mt-2">
        {letters.map((l, idx) => (
          <button
            key={l.id}
            data-testid="letter-trace-letter-option"
            onClick={() => { playPop(); loadLetter(idx); }}
            className={`
              w-11 h-11 flex items-center justify-center rounded-2xl text-2xl border-2 transition-all outline-none cursor-pointer shrink-0
              ${letterIndex === idx
                ? 'border-slate-800 bg-slate-100 scale-110 shadow-sm'
                : 'border-slate-200 bg-white hover:bg-slate-50'
              }
            `}
          >
            {l.char}
          </button>
        ))}
      </div>

      {/* Difficulty Sub-menu Selector */}
      <DifficultySelector
        selected={difficulty}
        options={['easy', 'medium', 'hard']}
        onChange={changeDifficulty}
        className="mt-2 shrink-0"
      />

      {/* Tracing Playground Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 w-full h-full min-h-[280px]">
        <div
          ref={containerRef}
          className={`relative border-8 border-slate-300 rounded-[2.5rem] overflow-hidden shadow-inner bg-white flex items-center justify-center w-full aspect-square max-w-[420px] ${showErrorShake ? 'animate-shake' : ''
            }`}
        >
          <canvas
            ref={canvasRef}
            data-testid="letter-trace-canvas"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full h-full cursor-crosshair touch-none"
          />

          {/* Victory Overlay Screen */}
          {isWon && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 space-y-4 z-20 overflow-y-auto">
              <span className="text-6xl sm:text-7xl animate-bounce">{letter.char}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 text-center leading-tight">
                {t.letterTrace.victory}
              </h2>
              <KidButton
                color="pink"
                size="md"
                data-testid="letter-trace-next"
                onClick={nextLetter}
                className="shadow-[0_6px_0_0_#d81b60] active:translate-y-[4px] whitespace-nowrap"
              >
                🌈 {t.letterTrace.nextLetter}
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Control Actions: Reset */}
      <div className="w-full flex justify-center gap-4 py-2 shrink-0 select-none">
        <ConfirmWipeButton
          onConfirm={handleReset}
          size="md"
          data-testid="letter-trace-reset"
          label={`🗑️ ${t.common.reset}`}
          confirmLabel={`🗑️ ${t.common.confirmReset}`}
          className="px-6 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2"
        />
      </div>

      {/* Bottom Help bar */}
      <div className="w-full text-center py-1 shrink-0">
        <span className="bg-white/90 border-2 border-slate-200 rounded-full px-5 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm inline-flex items-center gap-1.5">
          👉 {t.letterTrace.help}
        </span>
      </div>
    </div>
  );
}

export default LetterTrace;
