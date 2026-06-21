import { en } from './en';
import { de } from './de';
import { ja } from './ja';
import type { TranslationSchema } from './en';

export type Language = 'en' | 'de' | 'ja';

export const translations: Record<Language, TranslationSchema> = {
  en,
  de,
  ja,
};

export type { TranslationSchema };
