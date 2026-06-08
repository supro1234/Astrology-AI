import React, { createContext, useContext, useState } from 'react';
import { storage, KEYS } from '../utils/storage';
import translations from '../utils/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => storage.get(KEYS.LANG) || 'en');

  const changeLang = (newLang) => {
    setLang(newLang);
    storage.set(KEYS.LANG, newLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
