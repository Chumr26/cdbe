# 📚 Bookstore E-Commerce API

A complete REST API for an e-commerce bookstore built with Node.js, Express, MongoDB, and JWT authentication.

## 🚀 Features

- ✅ **User Authentication** - Register, login, JWT tokens, password reset
- ✅ **User Management** - Profile management, addresses
- ✅ **Product Catalog** - Books with search, filter, pagination
- ✅ **Categories** - Hierarchical category management
- ✅ **Shopping Cart** - Add, update, remove items
- ✅ **Order Processing** - Create orders, track status, cancel orders
- ✅ **Admin Dashboard** - User management, order management, statistics
- ✅ **Role-based Access** - Customer and Admin roles
- ✅ **Security** - Helmet, CORS, rate limiting, input validation

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy example env file
copy .env.example .env

# Edit .env and update:
# - JWT_SECRET (use a strong secret key)
# - MONGODB_URI (if not using localhost)
```

### 3. Start MongoDB
Make sure MongoDB is running:
```bash
# Windows (if installed as service)
net start MongoDB
```

### 4. Setup Database
```bash
npm run db:setup
```
This creates collections, indexes, and seeds sample data.

### 5. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

🎉 **API is now running at:** `http://localhost:5000`

## 📖 Documentation

👉 **See [QUICK-START.md](QUICK-START.md) for:**
- Complete API endpoint list
- Request/response examples
- Authentication guide
- Testing instructions

👉 **See [API-TODO.md](API-TODO.md) for:**
- Development roadmap
- Future features
- Implementation phases

## 🔑 Default Credentials

After seeding, you can login as admin:
- **Email:** admin@bookstore.com
- **Password:** admin123

⚠️ **Change this in production!**

## 📁 Project Structure

```
cdbe/
├── server.js              # Express app entry point
├── models/                # Mongoose schemas
├── controllers/           # Route controllers
├── routes/                # API routes
├── middleware/            # Custom middleware (auth, etc.)
├── utils/                 # Helper functions
├── scripts/               # Database setup scripts
├── config/                # Configuration files
└── .env                   # Environment variables
```

## 🛠️ Available Scripts

```bash
npm start          # Start server
npm run dev        # Start with nodemon (auto-reload)
npm run db:create  # Create database collections & indexes
npm run db:seed    # Seed sample data
npm run db:setup   # Run create + seed
```

## 🔒 Security Features

- JWT authentication
- Password hashing (bcrypt)
- Helmet.js security headers
- CORS protection
- Rate limiting (100 req/15min)
- Input validation & sanitization
- Role-based access control

## 🌐 API Endpoints Overview

| Group | Endpoints | Access |
|-------|-----------|--------|
| **Auth** | `/api/auth/*` | Public + Private |
| **Users** | `/api/users/*` | Private |
| **Categories** | `/api/categories/*` | Public + Admin |
| **Products** | `/api/products/*` | Public + Admin |
| **Cart** | `/api/cart/*` | Private |
| **Orders** | `/api/orders/*` | Private |
| **Admin** | `/api/admin/*` | Admin Only |

## 📊 Sample Data

After seeding, you get:
- 1 Admin user
- 6 Categories (Fiction, Non-Fiction, Science, Technology, Self-Help, History)
- 8 Sample books with different categories and prices

## 🧪 Testing

Use Postman, Thunder Client, or cURL to test endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Get products
curl http://localhost:5000/api/products

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","firstName":"Test","lastName":"User"}'
```

## 🚧 Future Enhancements

See [API-TODO.md](API-TODO.md) for the complete roadmap:

- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Email notifications (SendGrid/AWS SES)
- [ ] Product reviews & ratings
- [ ] Coupon/discount system
- [ ] Advanced analytics dashboard
- [ ] File upload (product images)
- [ ] Real-time notifications
- [ ] API documentation (Swagger)

## 📝 Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=bookstore
PORT=5000
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@bookstore.com
ADMIN_PASSWORD=admin123
```

## 🐛 Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env

**Port already in use:**
- Change PORT in .env
- Or stop other services on port 5000

**JWT errors:**
- Check JWT_SECRET is set
- Verify token format: `Bearer <token>`

## 📄 License

ISC

## 👨‍💻 Author

Built with ❤️ for learning purposes
