const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const { embedText, buildProductEmbeddingText } = require('../utils/geminiEmbeddings');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const delayMs = parseInt(process.env.EMBED_DELAY_MS, 10) || 0;
  const maxItems = parseInt(process.env.EMBED_LIMIT, 10) || null;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });

    console.log('🔎 Backfilling product embeddings...');

    const cursor = Product.find({ isActive: true }).cursor();
    let processed = 0;
    let updated = 0;

    for await (const product of cursor) {
      processed += 1;
      if (maxItems && processed > maxItems) break;

      const text = buildProductEmbeddingText(product);
      if (!text) {
        console.warn(`⚠️  Skipping ${product._id} (empty text)`);
        continue;
      }

      try {
        const embedding = await embedText(text);
        await Product.updateOne({ _id: product._id }, { $set: { embedding } });
        updated += 1;
        console.log(`✅ Updated ${product._id} (${updated}/${processed})`);
      } catch (err) {
        console.error(`❌ Failed ${product._id}:`, err.message || err);
      }

      if (delayMs > 0) {
        await delay(delayMs);
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
