import { en } from './en';
import { de } from './de';
import { ja } from './ja';
import { fr } from './fr';
import { ko } from './ko';
import type { TranslationSchema } from './en';

export type Language = 'en' | 'de' | 'ja' | 'fr' | 'ko';

export const translations: Record<Language, TranslationSchema> = {
  en,
  de,
  ja,
  fr,
  ko,
};

export type { TranslationSchema };
