const { connectDB, closeDB } = require('../config/database');

async function createCollections() {
  try {
    const db = await connectDB();
    
    console.log('📦 Creating collections...\n');

    // Create collections
    const collections = [
      'users',
      'products', 
      'categories',
      'carts',
      'orders',
      'transactions',
      'email_logs'
    ];

    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } catch (error) {
        if (error.code === 48) {
          console.log(`⚠️  Collection already exists: ${collectionName}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n🔍 Creating indexes...\n');

    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('✅ Created index: users.email (unique)');

    await db.collection('products').createIndex({ isbn: 1 }, { unique: true });
    console.log('✅ Created index: products.isbn (unique)');

    await db.collection('products').createIndex({ title: "text", author: "text" });
    console.log('✅ Created index: products.title, author (text search)');

    await db.collection('products').createIndex({ category: 1 });
    console.log('✅ Created index: products.category');

    await db.collection('categories').createIndex({ name: 1 }, { unique: true });
    console.log('✅ Created index: categories.name (unique)');

    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    console.log('✅ Created index: orders.orderNumber (unique)');

    await db.collection('orders').createIndex({ userId: 1 });
    console.log('✅ Created index: orders.userId');

    await db.collection('carts').createIndex({ userId: 1 });
    console.log('✅ Created index: carts.userId');

    await db.collection('carts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✅ Created TTL index: carts.expiresAt (auto-cleanup)');

    await db.collection('transactions').createIndex({ orderId: 1 });
    console.log('✅ Created index: transactions.orderId');

    await db.collection('email_logs').createIndex({ userId: 1 });
    console.log('✅ Created index: email_logs.userId');

    console.log('\n🎉 Database setup completed successfully!\n');

  } catch (error) {
    console.error('❌ Error creating database:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

// Run the script
createCollections();
