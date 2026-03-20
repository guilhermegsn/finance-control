import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';

const resources = {
  en: en // Simplificado: o JSON já tem a estrutura de namespaces
};

const deviceLanguage = Localization.getLocales()[0].languageCode || 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',// deviceLanguage.startsWith('en') ? 'en' : 'pt',
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
    ns: ['common', 'auth', 'errors'], 
    defaultNS: 'common',            
    keySeparator: false,
    nsSeparator: ':',
    // Adicione isso para ajudar a debugar se o texto sumir de novo:
    debug: __DEV__, 
  });

export default i18n;