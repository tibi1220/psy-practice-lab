import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '../i18n';
import { localeCookie } from '../lib/locale';
import type { Locale } from '../lib/locale';
import type { TranslationMessage } from '../lib/message';
import { sourceKeys } from '../locales/source-keys';

function textWithSpacing(
  t: TFunction,
  source: string,
  values: Record<string, unknown> = {},
): string {
  const text = source.trim();
  if (!text) return source;
  const key = sourceKeys[text] ?? text;
  return (
    source.slice(0, source.length - source.trimStart().length) +
    t(key, { ...values, defaultValue: text }) +
    source.slice(source.trimEnd().length)
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const updateDocument = () => {
      document.documentElement.lang =
        i18n.resolvedLanguage === 'hu' ? 'hu' : 'en-US';
    };
    updateDocument();
    i18n.on('languageChanged', updateDocument);
    return () => {
      i18n.off('languageChanged', updateDocument);
    };
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

// Resolve stored message values through i18next too (for translated shape names,
// row labels, and nested numerical statements), while leaving numbers untouched.
function messageValues(
  t: TFunction,
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (typeof value === 'string') return [key, textWithSpacing(t, value)];
      if (
        value &&
        typeof value === 'object' &&
        'key' in value &&
        'values' in value &&
        typeof value.key === 'string'
      ) {
        const message = value as TranslationMessage;
        return [
          key,
          textWithSpacing(t, message.key, messageValues(t, message.values)),
        ];
      }
      return [key, value];
    }),
  );
}

export function useTextTranslation() {
  const { t } = useTranslation();
  return useCallback(
    (source: string, values: Record<string, unknown> = {}) =>
      textWithSpacing(t, source, messageValues(t, values)),
    [t],
  );
}
export function useIntlLocale() {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === 'hu' ? 'hu-HU' : 'en-US';
}
export function LocalizedDate({ value }: { value: string }) {
  const locale = useIntlLocale();
  return (
    <>
      {new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))}
    </>
  );
}
export function Localized({
  children,
  message,
  id,
}: {
  children?: ReactNode;
  message?: TranslationMessage;
  id?: string;
}) {
  const t = useTextTranslation();
  return (
    <>
      {id
        ? t(id)
        : message
          ? t(message.key, message.values)
          : typeof children === 'string'
            ? t(children)
            : children}
    </>
  );
}
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hu' ? 'hu' : 'en';
  const changeLocale = (next: Locale) => {
    void i18n.changeLanguage(next);
    try {
      document.cookie = localeCookie(
        next,
        import.meta.env.BASE_URL,
        location.protocol === 'https:',
      );
    } catch {
      /* Switching remains usable when cookies are disabled. */
    }
  };
  return (
    <footer
      className='locale-footer border-t border-white/10 bg-slate-950 px-5 py-2 text-white'
      onKeyDownCapture={event => event.stopPropagation()}
      onKeyUpCapture={event => event.stopPropagation()}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-end gap-3'>
        <label
          className='text-sm text-slate-400'
          htmlFor='preferred-locale'
        >
          {t('common.language.label')}
        </label>
        <select
          id='preferred-locale'
          className='min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3 text-sm'
          value={locale}
          onChange={event => changeLocale(event.target.value as Locale)}
        >
          <option
            value='en'
            lang='en-US'
          >
            English (US)
          </option>
          <option
            value='hu'
            lang='hu'
          >
            Magyar
          </option>
        </select>
      </div>
    </footer>
  );
}
