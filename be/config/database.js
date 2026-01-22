require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'bookstore';

let client = null;

async function connectDB() {
  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000
      ),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 60000),
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
      retryWrites: true,
    });
    await client.connect();
    console.log('✅ Connected to MongoDB');
  }
  return client.db(dbName);
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    console.log('🔌 Disconnected from MongoDB');
  }
}

module.exports = { connectDB, closeDB };
