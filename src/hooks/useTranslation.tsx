import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'de' | 'ja';

const translations = {
  en: {
    menu: {
      subtitle: "Fun play & learn games!",
      footer: "Made with ❤️ for learning",
      parents: "Parents",
      math: "Math Pop",
      odd: "Odd One",
      doodle: "Doodle",
      match: "Match",
    },
    parentGate: {
      title: "Parents Only 🔒",
      instruction: "Please solve this simple problem to verify you are a parent:",
      placeholder: "Answer",
      error: "Oops! Try again.",
      cancel: "Cancel",
      verify: "Verify",
    },
    parentDashboard: {
      title: "Settings ⚙️",
      subtitle: "Configure options for your children",
      sound: "Sound Effects 🔊",
      soundDesc: "Enable/disable synthesized audio cues",
      vibration: "Vibrations 📳",
      vibrationDesc: "Enable/disable haptic physical feedback",
      dangerZone: "Danger Zone ⚠️",
      dangerZoneDesc: "This resets streaks and drawing pads",
      resetBtn: "Reset All Progress",
      resetConfirm: "Are you sure you want to reset all progress?",
      close: "Close Settings",
    },
    mathGame: {
      title: "Solve the Equation!",
      help: "Tap the correct bubble!",
    },
    memoryMatch: {
      title: "Animal Match! 🐯",
      subtitle: "Flip cards to match the animal pairs!",
      victory: "🎉 Great job! You matched them all!",
      help: "Tap cards to flip them!",
    },
    oddOneOut: {
      title: "Odd One Out! 🧐",
      subtitle: "Find the emoji that doesn't fit!",
      help: "Tap the one that belongs to a different group!",
    },
    doodlePad: {
      title: "Magic Doodle! 🎨",
      subtitle: "Draw anything you like with your finger!",
      eraser: "Eraser",
    },
  },
  de: {
    menu: {
      subtitle: "Lern- und Spielspaß!",
      footer: "Mit ❤️ zum Lernen gemacht",
      parents: "Eltern",
      math: "Mathe Pop",
      odd: "Finde das Andere",
      doodle: "Malen",
      match: "Paare finden",
    },
    parentGate: {
      title: "Nur für Eltern 🔒",
      instruction: "Bitte löse diese einfache Aufgabe, um dich als Elternteil zu verifizieren:",
      placeholder: "Antwort",
      error: "Huch! Versuch es noch einmal.",
      cancel: "Abbrechen",
      verify: "Bestätigen",
    },
    parentDashboard: {
      title: "Einstellungen ⚙️",
      subtitle: "Einstellungen für deine Kinder anpassen",
      sound: "Soundeffekte 🔊",
      soundDesc: "Synthetisierte Soundeffekte aktivieren/deaktivieren",
      vibration: "Vibrationen 📳",
      vibrationDesc: "Haptisches Feedback aktivieren/deaktivieren",
      dangerZone: "Gefahrenbereich ⚠️",
      dangerZoneDesc: "Dies setzt alle Erfolge und das Malbrett zurück",
      resetBtn: "Fortschritt zurücksetzen",
      resetConfirm: "Bist du sicher, dass du den gesamten Fortschritt zurücksetzen möchtest?",
      close: "Einstellungen schließen",
    },
    mathGame: {
      title: "Löse die Aufgabe!",
      help: "Tippe auf die richtige Blase!",
    },
    memoryMatch: {
      title: "Tiersuche! 🐯",
      subtitle: "Drehe die Karten um, um Tierpaare zu finden!",
      victory: "🎉 Super gemacht! Du hast alle Paare gefunden!",
      help: "Tippe Karten an, um sie umzudrehen!",
    },
    oddOneOut: {
      title: "Finde das Andere! 🧐",
      subtitle: "Finde das Emoji, das nicht passt!",
      help: "Tippe das an, das zu einer anderen Gruppe gehört!",
    },
    doodlePad: {
      title: "Zaubermalen! 🎨",
      subtitle: "Male mit deinem Finger, was immer du willst!",
      eraser: "Radiergummi",
    },
  },
  ja: {
    menu: {
      subtitle: "たのしく あそんで まなぼう！",
      footer: "まなびのために ❤️ をこめて",
      parents: "ほごしゃ",
      math: "さんすうポップ",
      odd: "なかまはずれ",
      doodle: "おえかき",
      match: "しんけいすいじゃく",
    },
    parentGate: {
      title: "ほごしゃせんよう 🔒",
      instruction: "ほごしゃであることをかくにんするため、このもんだいを解いてください：",
      placeholder: "こたえ",
      error: "おっと！もういちどためしてね。",
      cancel: "キャンセル",
      verify: "かくにん",
    },
    parentDashboard: {
      title: "せってい ⚙️",
      subtitle: "こども向けの設定を調整します",
      sound: "おと 🔊",
      soundDesc: "サウンド効果 of オン/オフ",
      vibration: "バイブレーション 📳",
      vibrationDesc: "バイブレーション機能のオン/オフ",
      dangerZone: "きけんエリア ⚠️",
      dangerZoneDesc: "スコアとえをリセットします",
      resetBtn: "すべてのしんちょくをリセット",
      resetConfirm: "本当にすべての進捗をリセットしますか？",
      close: "とじる",
    },
    mathGame: {
      title: "もんだいを とこう！",
      help: "ただしいシャボンだまをタップしてね！",
    },
    memoryMatch: {
      title: "どうぶつあわせ！ 🐯",
      subtitle: "カードをめくってどうぶつのペアをみつけよう！",
      victory: "やったね！ぜんぶそろったよ！",
      help: "カードをタップしてめくってね！",
    },
    oddOneOut: {
      title: "なかまはずれ！ 🧐",
      subtitle: "なかまはずれの絵文字をみつけよう！",
      help: "ちがうグループのものをタップしてね！",
    },
    doodlePad: {
      title: "まほうのおえかき！ 🎨",
      subtitle: "ゆびで好きな絵をかいてね！",
      eraser: "けしごむ",
    },
  },
};

type TranslationKeys = typeof translations.en;

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
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
      return saved;
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
