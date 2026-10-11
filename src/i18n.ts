import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

const localeCache: Record<string, Record<string, any>> = {};

async function loadLocaleData(language: string): Promise<Record<string, any>> {
  if (localeCache[language]) {
    return localeCache[language];
  }
  const mod = await import(`./locales/${language}.json`);
  const data = (mod.default || mod) as Record<string, any>;
  localeCache[language] = data;
  return data;
}

const ALL_NAMESPACES = [
  'translation',
  'app',
  'auth',
  'notifications',
  'profile',
  'notfound',
  'terms',
  'privacy',
  'story',
  'nav',
  'settings',
  'chatapp',
  'panels',
  'admin',
  'tutorial',
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(
    resourcesToBackend(async (language: string, namespace: string) => {
      const data = await loadLocaleData(language);
      if (namespace && namespace !== 'translation') {
        return data[namespace] || {};
      }
      return data;
    })
  )
  .init({
    fallbackLng: 'vi',
    defaultNS: 'translation',
    ns: ALL_NAMESPACES,
    debug: false,
    interpolation: {
      escapeValue: false, 
    }
  });

export default i18n;

