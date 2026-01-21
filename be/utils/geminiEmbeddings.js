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

const buildProductEmbeddingText = (product) => {
  if (!product) return '';

  const descriptionI18n = product.descriptionI18n || {};
  const descEn =
    typeof descriptionI18n.get === 'function'
      ? descriptionI18n.get('en')
      : descriptionI18n.en;
  const descVi =
    typeof descriptionI18n.get === 'function'
      ? descriptionI18n.get('vi')
      : descriptionI18n.vi;

  const parts = [
    product.title,
    product.author,
    product.category,
    product.isbn,
    product.publisher,
    product.language,
    product.description,
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

  const model = getEnv('GEMINI_EMBED_MODEL', 'text-embedding-004');
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
