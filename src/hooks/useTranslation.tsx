import React, { createContext, useContext, useState } from 'react';
import { translations, Language, TranslationSchema } from '../locales';

export type { Language };

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

function getBrowserLanguage(): Language {
  const lang = navigator.language || (navigator as any).userLanguage || 'en';
  const prefix = lang.slice(0, 2).toLowerCase();
  if (prefix === 'de') return 'de';
  if (prefix === 'ja') return 'ja';
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    if (saved === 'en' || saved === 'de' || saved === 'ja') {
      return saved as Language;
    }
    return getBrowserLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = translations[language];

  return (
    <React.Fragment>
      <I18nContext.Provider value={{ language, setLanguage, t }}>
        {children}
      </I18nContext.Provider>
    </React.Fragment>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
