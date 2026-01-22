require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product.model');

const getI18nValue = (i18nMapOrObject, lang) => {
  if (!i18nMapOrObject) return undefined;
  if (typeof i18nMapOrObject.get === 'function') return i18nMapOrObject.get(lang);
  return i18nMapOrObject[lang];
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });

    console.log('🔧 Backfilling product i18n fields...');

    const cursor = Product.find({}).cursor();
    let processed = 0;
    let updated = 0;

    for await (const product of cursor) {
      processed += 1;

      const descriptionI18n = product.descriptionI18n || {};
      const descEn = getI18nValue(descriptionI18n, 'en') || product.description || '';
      const descVi = getI18nValue(descriptionI18n, 'vi') || product.description || '';

      const titleI18n = product.titleI18n || {};
      const titleEn = getI18nValue(titleI18n, 'en') || descEn || '';
      const titleVi = getI18nValue(titleI18n, 'vi') || descVi || '';

      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            titleI18n: { en: titleEn, vi: titleVi },
            descriptionI18n: { en: descEn, vi: descVi }
          },
          $unset: {
            title: '',
            description: ''
          }
        }
      );

      updated += 1;
      if (updated % 50 === 0) {
        console.log(`✅ Updated ${updated}/${processed}`);
      }
    }

    console.log(`🎉 Done. Processed ${processed}, updated ${updated}`);
  } catch (err) {
    console.error('❌ Backfill failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
