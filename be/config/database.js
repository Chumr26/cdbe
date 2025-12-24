require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'bookstore';

let client = null;

async function connectDB() {
  if (!client) {
    client = new MongoClient(uri);
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
