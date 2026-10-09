export type Locale = 'en' | 'hu';
export const LOCALE_COOKIE = 'psy_locale';

export function readLocaleCookie(cookie: string): Locale {
  const value = cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(LOCALE_COOKIE + '='))
    ?.slice(LOCALE_COOKIE.length + 1);
  return value === 'hu' ? 'hu' : 'en';
}

export function localeCookie(
  locale: Locale,
  path = '/',
  secure = false,
): string {
  const safePath = path.startsWith('/') && !/[;\r\n]/.test(path) ? path : '/';
  return `${LOCALE_COOKIE}=${locale}; Path=${safePath}; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`;
}
