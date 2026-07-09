import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from '../translations/fr.json';
import ar from '../translations/ar.json';

export type Language = 'fr' | 'ar';

const LANGUAGE_KEY = '@kine_app_language';

export const saveLanguage = async (lang: Language) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export const loadLanguage = async (): Promise<Language> => {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  return (saved as Language) || 'fr';
};

export const switchLanguage = async (lang: Language) => {
  await i18n.changeLanguage(lang);
  await saveLanguage(lang);
  const isRTL = lang === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    // App will need to reload for RTL to fully take effect
  }
};

export const initI18n = async () => {
  const savedLang = await loadLanguage();
  const isRTL = savedLang === 'ar';
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);

  await i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
};

export default i18n;
