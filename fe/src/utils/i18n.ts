export type LocalizedText = {
  en: string;
  vi: string;
};

const normalizeLang = (lang?: string) => (lang || 'en').split('-')[0].toLowerCase();

export const getLocalizedText = (
  value: Partial<Record<'en' | 'vi', string>> | undefined | null,
  lang?: string,
  fallbackOrder: Array<'en' | 'vi'> = ['en', 'vi']
): string => {
  if (!value) return '';
  const normalized = normalizeLang(lang) as 'en' | 'vi';
  if (value[normalized]) return value[normalized] as string;
  for (const fallback of fallbackOrder) {
    if (value[fallback]) return value[fallback] as string;
  }
  return '';
};
