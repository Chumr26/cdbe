require('dotenv').config();
const { connectDB, closeDB } = require('../config/database');
const bcrypt = require('bcrypt');

async function seedData() {
  try {
    const db = await connectDB();
    
    console.log('🌱 Seeding database...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('categories').deleteMany({});
    await db.collection('products').deleteMany({});
    console.log('✅ Cleared existing data\n');

    // 1. Seed Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    
    const adminUser = await db.collection('users').insertOne({
      email: process.env.ADMIN_EMAIL || 'admin@bookstore.com',
      password: adminPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '+1234567890',
      addresses: [],
      passwordResetToken: null,
      isEmailVerified: true,
      createdAt: new Date()
    });
    console.log(`✅ Admin user created: ${adminUser.insertedId}\n`);

    // 1.1 Seed Sample Customer
    console.log('👤 Creating sample customer...');
    const userPassword = await bcrypt.hash('password123', 10);
    const customerUser = await db.collection('users').insertOne({
      email: 'john@test.com',
      password: userPassword,
      role: 'customer',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+0987654321',
      addresses: [],
      passwordResetToken: null,
      isEmailVerified: true,
      createdAt: new Date()
    });
    console.log(`✅ Customer user created: ${customerUser.insertedId}\n`);

    // 2. Seed Categories
    console.log('📚 Creating categories...');
    const categories = await db.collection('categories').insertMany([
      { 
        name: 'Fiction', 
        slug: 'fiction',
        description: 'Fictional books and novels',
        parentCategory: null
      },
      { 
        name: 'Non-Fiction', 
        slug: 'non-fiction',
        description: 'Real-world topics and biographies',
        parentCategory: null
      },
      { 
        name: 'Science', 
        slug: 'science',
        description: 'Science and technology books',
        parentCategory: null
      },
      { 
        name: 'Technology', 
        slug: 'technology',
        description: 'Programming and tech books',
        parentCategory: null
      },
      { 
        name: 'Self-Help', 
        slug: 'self-help',
        description: 'Personal development and motivation',
        parentCategory: null
      },
      { 
        name: 'History', 
        slug: 'history',
        description: 'Historical events and figures',
        parentCategory: null
      }
    ]);
    console.log(`✅ Created ${categories.insertedCount} categories\n`);

    // 3. Seed Sample Products
    console.log('📖 Creating sample products...');
    const products = await db.collection('products').insertMany([
      {
        title: 'The Great Gatsby',
        isbn: '978-0-7432-7356-5',
        author: 'F. Scott Fitzgerald',
        description: 'A classic American novel set in the Jazz Age',
        category: 'Fiction',
        price: 12.99,
        stock: 50,
        images: ['https://example.com/gatsby.jpg'],
        rating: 4.5,
        featured: false,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Clean Code',
        isbn: '978-0-13-235088-4',
        author: 'Robert C. Martin',
        description: 'A handbook of agile software craftsmanship',
        category: 'Technology',
        price: 39.99,
        stock: 30,
        images: ['https://example.com/cleancode.jpg'],
        rating: 4.8,
        featured: true,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Sapiens',
        isbn: '978-0-06-231609-7',
        author: 'Yuval Noah Harari',
        description: 'A brief history of humankind',
        category: 'History',
        price: 24.99,
        stock: 45,
        images: ['https://example.com/sapiens.jpg'],
        rating: 4.7,
        featured: false,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Atomic Habits',
        isbn: '978-0-73-521129-2',
        author: 'James Clear',
        description: 'An easy and proven way to build good habits',
        category: 'Self-Help',
        price: 16.99,
        stock: 60,
        images: ['https://example.com/atomic.jpg'],
        rating: 4.9,
        featured: true,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'A Brief History of Time',
        isbn: '978-0-55-338016-3',
        author: 'Stephen Hawking',
        description: 'From the Big Bang to black holes',
        category: 'Science',
        price: 18.99,
        stock: 25,
        images: ['https://example.com/hawking.jpg'],
        rating: 4.6,
        featured: false,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: '1984',
        isbn: '978-0-45-228423-4',
        author: 'George Orwell',
        description: 'A dystopian social science fiction novel',
        category: 'Fiction',
        price: 14.99,
        stock: 40,
        images: ['https://example.com/1984.jpg'],
        rating: 4.7,
        featured: true,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'The Pragmatic Programmer',
        isbn: '978-0-13-595705-9',
        author: 'David Thomas, Andrew Hunt',
        description: 'Your journey to mastery',
        category: 'Technology',
        price: 42.99,
        stock: 20,
        images: ['https://example.com/pragmatic.jpg'],
        rating: 4.8,
        featured: false,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Educated',
        isbn: '978-0-39-959251-0',
        author: 'Tara Westover',
        description: 'A memoir about education and family',
        category: 'Non-Fiction',
        price: 19.99,
        stock: 35,
        images: ['https://example.com/educated.jpg'],
        rating: 4.8,
        featured: false,
        isActive: true,
        createdAt: new Date()
      }
    ]);
    console.log(`✅ Created ${products.insertedCount} sample products\n`);

    // 4. Display Summary
    console.log('📊 Database Summary:');
    console.log(`   Users: ${await db.collection('users').countDocuments()}`);
    console.log(`   Categories: ${await db.collection('categories').countDocuments()}`);
    console.log(`   Products: ${await db.collection('products').countDocuments()}`);
    console.log(`   Carts: ${await db.collection('carts').countDocuments()}`);
    console.log(`   Orders: ${await db.collection('orders').countDocuments()}`);
    console.log(`   Transactions: ${await db.collection('transactions').countDocuments()}`);
    console.log(`   Email Logs: ${await db.collection('email_logs').countDocuments()}`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('🔑 Admin credentials:');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@bookstore.com'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
    console.log('🔑 Customer credentials:');
    console.log('   Email: john@test.com');
    console.log('   Password: password123\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

// Run the script
seedData();
