import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, LOCALES, RTL_LANGS } from './translations.js';

const I18nContext = createContext(null);

const STORAGE_KEY = 'quizflow.lang';

function detectInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || 'fr').slice(0, 2);
  return translations[nav] ? nav : 'fr';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectInitial);

  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang, dir]);

  const t = useCallback(
    (key, vars) => {
      const parts = key.split('.');
      let node = translations[lang];
      for (const p of parts) {
        node = node?.[p];
        if (node === undefined) break;
      }
      if (node === undefined) {
        node = translations.en;
        for (const p of parts) {
          node = node?.[p];
          if (node === undefined) return key;
        }
      }
      if (typeof node !== 'string') return key;
      if (vars) return node.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
      return node;
    },
    [lang]
  );

  const fmtDate = useCallback(
    (value, opts) => {
      const d = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
      if (Number.isNaN(d.getTime())) return String(value);
      try { return new Intl.DateTimeFormat(LOCALES[lang], opts || { day: 'numeric', month: 'short', year: 'numeric' }).format(d); }
      catch { return d.toLocaleDateString(); }
    },
    [lang]
  );

  const timeAgo = useCallback(
    (value) => {
      const d = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
      const diff = Math.max(0, Date.now() - d.getTime());
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return t('time.justNow');
      if (mins < 60) return t('time.minAgo', { n: mins });
      const hours = Math.floor(mins / 60);
      if (hours < 24) return t('time.hourAgo', { n: hours });
      return t('time.dayAgo', { n: Math.floor(hours / 24) });
    },
    [t]
  );

  const value = useMemo(
    () => ({ lang, setLang, dir, t, fmtDate, timeAgo, locale: LOCALES[lang], isRtl: dir === 'rtl' }),
    [lang, dir, t, fmtDate, timeAgo]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
