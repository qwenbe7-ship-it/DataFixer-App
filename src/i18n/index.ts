import { en } from './en';
import { ko } from './ko';

export type Locale = 'ko' | 'en';
export type TranslationKey = keyof typeof ko;
export type TranslationParams = Record<string, string | number>;

export function detectLocale(language = typeof navigator === 'undefined' ? 'ko' : navigator.language): Locale {
  return language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export type Translator = (key: TranslationKey, params?: TranslationParams) => string;

export function createTranslator(locale: Locale): Translator {
  const dictionary = locale === 'ko' ? ko : en;
  return (key: TranslationKey, params: TranslationParams = {}): string => {
    let value = dictionary[key];
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  };
}

export { en, ko };
