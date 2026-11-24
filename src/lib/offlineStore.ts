import { useEffect, useState } from 'react';
import type { FarmRecord, LanguageCode, Product } from '../types/agrismart';

const KEYS = {
  LANGUAGE: 'agrismart_rdc_lang',
  FARM_RECORDS: 'agrismart_rdc_farm_records',
  FAVORITES: 'agrismart_rdc_favorites',
  CACHED_PRODUCTS: 'agrismart_rdc_cached_products',
  LOCAL_EVENTS: 'agrismart_rdc_local_events',
  QUIZ_SCORES: 'agrismart_rdc_quiz_scores',
  COMPLETED_LESSONS: 'agrismart_rdc_completed_lessons',
  MOBILE_MONEY_INTENTS: 'agrismart_rdc_mm_intents',
  LOCAL_PROFILE: 'agrismart_rdc_local_profile',
  ONBOARDING_DONE: 'agrismart_rdc_onboarding_done',
};

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export function safeLoadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSaveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded; keep app running smoothly
  }
}

export function loadLanguage(): LanguageCode {
  const val = localStorage.getItem(KEYS.LANGUAGE);
  if (val === 'fr' || val === 'ln' || val === 'sw' || val === 'kg' || val === 'lua') {
    return val;
  }
  return 'fr';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem(KEYS.LANGUAGE, lang);
  } catch {
    // ignore
  }
}

export function loadLocalFarmRecords(): FarmRecord[] {
  return safeLoadJSON<FarmRecord[]>(KEYS.FARM_RECORDS, []);
}

export function saveLocalFarmRecords(records: FarmRecord[]): void {
  safeSaveJSON(KEYS.FARM_RECORDS, records);
}

export function loadCachedProducts(): Product[] {
  return safeLoadJSON<Product[]>(KEYS.CACHED_PRODUCTS, []);
}

export function saveCachedProducts(products: Product[]): void {
  safeSaveJSON(KEYS.CACHED_PRODUCTS, products.slice(0, 60));
}

export function loadFavorites(): string[] {
  return safeLoadJSON<string[]>(KEYS.FAVORITES, []);
}

export function saveFavorites(ids: string[]): void {
  safeSaveJSON(KEYS.FAVORITES, ids);
}

export { KEYS as OFFLINE_KEYS };
