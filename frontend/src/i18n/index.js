// src/i18n/index.js — Synchronized with UIStore (single source of truth)
// NOTE: No JSX — uses createElement so this .js file works with Vite/OXC
import { createElement, createContext, useContext, useCallback } from 'react';
import { useUIStore } from '../context/store';
import ar from './ar';
import en from './en';

const DICTIONARIES = { ar, en };

export const I18nContext = createContext(null);

/* ── Deep-get helper: t('nav.dashboard') → 'لوحة التحكم' ── */
function deepGet(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path;
}

/* ── Provider — reads language from UIStore (single source) ── */
export function I18nProvider({ children }) {
  // Language is now owned by UIStore; i18n reads from it
  const { language: lang, setLanguage } = useUIStore();
  const dict = DICTIONARIES[lang] ?? DICTIONARIES['ar'];

  const t = useCallback(
    (key) => deepGet(dict, key),
    [dict]
  );

  // setLang updates UIStore which handles localStorage + dir attribute
  const setLang = useCallback((newLang) => {
    setLanguage(newLang);
  }, [setLanguage]);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }, [lang, setLang]);

  const value = {
    lang,
    setLang,
    toggleLang,
    t,
    isRTL: lang === 'ar',
    dir:   lang === 'ar' ? 'rtl' : 'ltr',
  };

  return createElement(I18nContext.Provider, { value }, children);
}

/* ── Hook ─────────────────────────────────────────────────── */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}

export default { I18nProvider, useTranslation };
