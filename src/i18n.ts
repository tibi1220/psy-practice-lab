import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readLocaleCookie } from './lib/locale';
import { resources } from './locales';

let language = 'en';
try {
  language = readLocaleCookie(document.cookie);
} catch {
  /* English also works when cookies are unavailable. */
}

void i18n.use(initReactI18next).init({
  resources,
  lng: language,
  supportedLngs: ['en', 'hu'],
  fallbackLng: 'en',
  defaultNS: 'translation',
  keySeparator: '.',
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
  react: { useSuspense: false },
});

export default i18n;
