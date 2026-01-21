require('dotenv').config();
const mongoose = require('mongoose');
const { embedText } = require('../utils/geminiEmbeddings');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });

    const embedding = await embedText('dimension check');
    console.log(`Embedding dimensions: ${embedding.length}`);
  } catch (err) {
    console.error('❌ Failed to print embedding dimensions:', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
