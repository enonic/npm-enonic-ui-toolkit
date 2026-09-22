const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar',
  'dv',
  'fa',
  'ha',
  'he',
  'ks',
  'ku',
  'ps',
  'sd',
  'ur',
  'yi',
]);

const ARABIC_SCRIPT_SUBTAG = 'arab';

export type LangAttributes = {
  lang?: string;
  dir?: 'rtl';
  spellCheck: true;
};

function isRtl(locale: string, language: string): boolean {
  return (
    RTL_LANGUAGES.has(language) || locale.split('-')[1]?.toLowerCase() === ARABIC_SCRIPT_SUBTAG
  );
}

/** `lang` and `dir` for an input editing content in `locale`; spellcheck on either way. */
export function getLangAttributes(locale: string | undefined): LangAttributes {
  if (locale == null || locale.length === 0) return { spellCheck: true };
  const normalized = locale.toLowerCase();
  const language = normalized.split('-')[0] ?? normalized;
  const attributes: LangAttributes = { lang: language, spellCheck: true };
  if (isRtl(normalized, language)) attributes.dir = 'rtl';
  return attributes;
}
