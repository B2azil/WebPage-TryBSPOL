/**
 * Moduł narzędzi - współdzielone funkcje pomocnicze
 * Używane przez różne części aplikacji
 */

/**
 * Konwertuje tekst na URL-friendly slug
 * @param {string} text - Tekst do konwersji
 * @returns {string} - Slug
 */
export function slugify(text) {
  const map = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
    'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'a', 'Ć': 'c', 'Ę': 'e', 'Ł': 'l', 'Ń': 'n',
    'Ó': 'o', 'Ś': 's', 'Ź': 'z', 'Ż': 'z'
  };
  return String(text || '')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, m => map[m] || m)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Debounce - opóźnia wykonanie funkcji
 * @param {Function} fn - Funkcja do opóźnienia
 * @param {number} wait - Czas opóźnienia w ms
 * @returns {Function} - Funkcja z debounce
 */
export function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Sprawdza czy string jest prawidłowym URL
 * @param {string} string - String do sprawdzenia
 * @returns {boolean}
 */
export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Sprawdza czy string jest prawidłowym kolorem CSS
 * @param {string} str - String do sprawdzenia
 * @returns {boolean}
 */
export function isValidColor(str) {
  const s = new Option().style;
  s.color = str;
  return s.color !== '';
}

/**
 * Sanityzuje string dla bezpiecznego użycia w HTML
 * @param {string} str - String do sanityzacji
 * @returns {string}
 */
export function sanitizeString(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Sprawdza czy ścieżka lub URL jest prawidłowa
 * @param {string} path - Ścieżka do sprawdzenia
 * @returns {boolean}
 */
export function isValidPathOrUrl(path) {
  try {
    const url = new URL(path);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return typeof path === 'string' && path.trim().length > 0;
  }
}
