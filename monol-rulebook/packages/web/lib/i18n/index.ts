/**
 * Internationalization (i18n) Configuration
 *
 * Provides translation support for Korean and English.
 */

export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
};

export interface TranslationKeys {
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    sort: string;
    more: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    confirm: string;
    close: string;
  };
  auth: {
    login: string;
    logout: string;
    signUp: string;
    forgotPassword: string;
    loginWithGitHub: string;
    welcomeBack: string;
    newAccount: string;
  };
  nav: {
    dashboard: string;
    teams: string;
    rules: string;
    proposals: string;
    marketplace: string;
    analytics: string;
    settings: string;
    help: string;
  };
  team: {
    create: string;
    join: string;
    leave: string;
    members: string;
    settings: string;
    invite: string;
    role: {
      owner: string;
      admin: string;
      member: string;
      viewer: string;
    };
  };
  rule: {
    create: string;
    edit: string;
    delete: string;
    enable: string;
    disable: string;
    severity: {
      error: string;
      warning: string;
      info: string;
    };
    category: string;
    tags: string;
    examples: string;
    goodExamples: string;
    badExamples: string;
    exceptions: string;
  };
  proposal: {
    create: string;
    submit: string;
    approve: string;
    reject: string;
    requestChanges: string;
    merge: string;
    status: {
      draft: string;
      pending: string;
      approved: string;
      rejected: string;
      merged: string;
    };
  };
  marketplace: {
    browse: string;
    adopt: string;
    publish: string;
    trending: string;
    popular: string;
    recent: string;
    reviews: string;
    rating: string;
    downloads: string;
  };
  analytics: {
    compliance: string;
    violations: string;
    trends: string;
    leaderboard: string;
    period: {
      day: string;
      week: string;
      month: string;
      year: string;
    };
  };
  errors: {
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    networkError: string;
    validationError: string;
  };
}

export type TranslationFunction = (key: string, params?: Record<string, string | number>) => string;

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return key if not found
    }
  }

  return typeof current === 'string' ? current : path;
}

/**
 * Create translation function
 */
export function createTranslator(
  translations: Record<string, unknown>
): TranslationFunction {
  return (key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations, key);

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      });
    }

    return value;
  };
}

/**
 * Date formatting by locale
 */
export const dateFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  ko: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  en: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
};

export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, dateFormats[locale]).format(d);
}

export function formatRelativeTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  if (diffDay < 30) return rtf.format(-diffDay, 'day');

  return formatDate(d, locale);
}

/**
 * Number formatting by locale
 */
export function formatNumber(num: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatCompactNumber(num: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(num);
}
