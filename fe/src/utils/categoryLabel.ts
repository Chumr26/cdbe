import type { TFunction, i18n as I18nInstance } from 'i18next';

export const getCategoryLabel = (rawCategory: string, t: TFunction, i18n: I18nInstance) => {
  const trimmed = rawCategory?.trim();
  if (!trimmed) return rawCategory;

  const normalized = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const key = (() => {
    if (trimmed === 'nonFiction') return 'nonFiction';
    if (trimmed === 'selfHelp') return 'selfHelp';

    switch (normalized) {
      case 'non-fiction':
        return 'nonFiction';
      case 'self-help':
        return 'selfHelp';
      case 'childrens':
      case 'children':
      case 'childrens-books':
        return 'children';
      default:
        return normalized;
    }
  })();

  const footerKey = `footer.categories.${key}`;
  if (i18n.exists(footerKey)) return t(footerKey);

  const homeKey = `home.categories.${key}`;
  if (i18n.exists(homeKey)) return t(homeKey);

  return rawCategory;
};
