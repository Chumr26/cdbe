const axios = require('axios');

const getEnv = (key, fallback) => {
  const value = process.env[key] || fallback;
  return value;
};

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
};

const getI18nValue = (i18nMapOrObject, lang) => {
  if (!i18nMapOrObject) return undefined;
  if (typeof i18nMapOrObject.get === 'function') return i18nMapOrObject.get(lang);
  return i18nMapOrObject[lang];
};

const CATEGORY_I18N = {
  'Fiction': { en: 'Fiction', vi: 'Tiểu thuyết' },
  'Non-Fiction': { en: 'Non-Fiction', vi: 'Phi hư cấu' },
  'Science': { en: 'Science', vi: 'Khoa học' },
  'Technology': { en: 'Technology', vi: 'Công nghệ' },
  'Self-Help': { en: 'Self-Help', vi: 'Kỹ năng sống' },
  'History': { en: 'History', vi: 'Lịch sử' },
  'Biography': { en: 'Biography', vi: 'Tiểu sử' },
  'Children': { en: 'Children', vi: 'Thiếu nhi | Trẻ em' },
  'Romance': { en: 'Romance', vi: 'Lãng mạn' },
  'Thriller': { en: 'Thriller', vi: 'Giật gân | Trinh thám' }
};

const getCategoryLabels = (category) => {
  if (!category) return {};
  const entry = CATEGORY_I18N[category];
  if (!entry) return { en: category, vi: category };
  return entry;
};

const buildProductEmbeddingText = (product) => {
  if (!product) return '';

  const titleI18n = product.titleI18n || {};
  const descriptionI18n = product.descriptionI18n || {};
  const titleEn = getI18nValue(titleI18n, 'en');
  const titleVi = getI18nValue(titleI18n, 'vi');
  const descEn = getI18nValue(descriptionI18n, 'en');
  const descVi = getI18nValue(descriptionI18n, 'vi');
  const categoryLabels = getCategoryLabels(product.category);
  const categoryEn = categoryLabels.en;
  const categoryVi = categoryLabels.vi;

  const parts = [
    titleEn,
    titleVi,
    product.author,
    categoryEn,
    categoryVi,
    product.isbn,
    product.publisher,
    product.language,
    descEn,
    descVi
  ];

  return normalizeText(parts.filter(Boolean).join(' | '));
};

const embedText = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = getEnv('GEMINI_EMBED_MODEL', 'gemini-embedding-001');
  const input = normalizeText(text);
  if (!input) {
    throw new Error('Cannot embed empty text');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const response = await axios.post(endpoint, {
    content: {
      parts: [{ text: input }]
    }
  });

  const embedding = response?.data?.embedding?.values;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Invalid embedding response from Gemini');
  }

  return embedding;
};

module.exports = {
  embedText,
  buildProductEmbeddingText
};
