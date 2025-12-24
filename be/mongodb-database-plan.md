# MongoDB Database Plan for E-Commerce Bookstore

## Overview
Simple MongoDB schema for a bookstore with user auth, admin panel, payments, and email notifications.

---

## Collections (7 Total)

### 1. **users** - User accounts & authentication
```javascript
{
  email: String (unique),
  password: String (hashed),
  role: 'customer' | 'admin',
  firstName: String,
  lastName: String,
  phoneNumber: String,
  addresses: [{ street, city, state, zipCode, country }],
  passwordResetToken: String,
  isEmailVerified: Boolean,
  createdAt: Date
}
```
**Index:** email

### 2. **products** - Book catalog
```javascript
{
  title: String,
  isbn: String (unique),
  author: String,
  description: String,
  category: String,
  price: Number,
  stock: Number,
  images: [String],
  rating: Number,
  createdAt: Date
}
```
**Index:** isbn, title, category

### 3. **categories** - Book categories
```javascript
{
  name: String (unique),
  slug: String,
  description: String,
  parentCategory: ObjectId
}
```

### 4. **carts** - Shopping carts
```javascript
{
  userId: ObjectId,
  items: [{
    productId: ObjectId,
    quantity: Number,
    price: Number
  }],
  total: Number,
  expiresAt: Date
}
```
**Index:** userId

### 5. **orders** - Purchase orders
```javascript
{
  orderNumber: String (unique),
  userId: ObjectId,
  items: [{
    productId: ObjectId,
    title: String,
    quantity: Number,
    price: Number
  }],
  shippingAddress: Object,
  paymentStatus: 'pending' | 'completed' | 'failed',
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered',
  total: Number,
  createdAt: Date
}
```
**Index:** orderNumber, userId

### 6. **transactions** - Payment records
```javascript
{
  orderId: ObjectId,
  userId: ObjectId,
  gateway: 'stripe' | 'paypal',
  amount: Number,
  status: 'success' | 'failed' | 'refunded',
  transactionId: String,
  createdAt: Date
}
```
**Index:** orderId

### 7. **email_logs** - Email tracking
```javascript
{
  userId: ObjectId,
  email: String,
  type: 'welcome' | 'password_reset' | 'order_confirmation',
  status: 'sent' | 'failed',
  sentAt: Date
}
```
**Index:** userId, type

---

## mongodb.js Implementation Steps

### Step 1: Connect to MongoDB
```javascript
const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "bookstore";
```

### Step 2: Create Collections
```javascript
async function setupDatabase() {
  await client.connect();
  const db = client.db(dbName);
  
  // Create collections
  await db.createCollection('users');
  await db.createCollection('products');
  await db.createCollection('categories');
  await db.createCollection('carts');
  await db.createCollection('orders');
  await db.createCollection('transactions');
  await db.createCollection('email_logs');
}
```

### Step 3: Create Indexes
```javascript
async function createIndexes() {
  const db = client.db(dbName);
  
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('products').createIndex({ isbn: 1 }, { unique: true });
  await db.collection('products').createIndex({ title: "text", author: "text" });
  await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
  await db.collection('carts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
```

### Step 4: Seed Initial Data
```javascript
async function seedData() {
  const db = client.db(dbName);
  
  // Create admin user
  await db.collection('users').insertOne({
    email: 'admin@bookstore.com',
    password: 'hashed_password',
    role: 'admin',
    firstName: 'Admin',
    isEmailVerified: true,
    createdAt: new Date()
  });
  
  // Add categories
  await db.collection('categories').insertMany([
    { name: 'Fiction', slug: 'fiction' },
    { name: 'Non-Fiction', slug: 'non-fiction' },
    { name: 'Science', slug: 'science' }
  ]);
}
```

---

## Key Features

✅ **User Authentication**
- Password reset via email
- Email verification
- Role-based access (admin/customer)

✅ **Product Management**
- Book catalog with ISBN
- Inventory tracking
- Category organization

✅ **Shopping & Orders**
- Shopping cart (auto-expires)
- Order processing
- Order status tracking

✅ **Payment Integration**
- Stripe/PayPal support
- Transaction logging
- Payment status tracking

✅ **Email Notifications**
- Welcome emails
- Password reset
- Order confirmations

✅ **Admin Panel**
- Manage users
- Manage products
- View orders & transactions

---

## Quick Setup

1. Install MongoDB
2. Create `mongodb.js` file
3. Run setup script:
   ```javascript
   node mongodb.js
   ```
4. Connect your app to database
5. Implement payment gateway (Stripe/PayPal)
6. Configure email service (SendGrid/AWS SES)

---

## Security Notes

⚠️ **Important:**
- Hash passwords with bcrypt
- Never store credit card numbers
- Use HTTPS for all requests
- Validate all user inputs
- Use environment variables for secrets
