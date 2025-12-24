# 🚀 Quick Start Guide

## What We Built

A complete REST API for an e-commerce bookstore with:
- ✅ User Authentication (JWT)
- ✅ Product Management
- ✅ Shopping Cart
- ✅ Order Processing
- ✅ Admin Dashboard
- ✅ Role-based Access Control

## Project Structure

```
cdbe/
├── server.js                    # Main entry point
├── config/
│   └── database.js             # MongoDB connection (for scripts)
├── models/
│   ├── User.model.js           # User schema
│   ├── Product.model.js        # Product schema
│   ├── Category.model.js       # Category schema
│   ├── Cart.model.js           # Cart schema
│   ├── Order.model.js          # Order schema
│   └── Transaction.model.js    # Transaction schema
├── controllers/
│   ├── auth.controller.js      # Auth logic
│   ├── user.controller.js      # User management
│   ├── category.controller.js  # Category management
│   ├── product.controller.js   # Product management
│   ├── cart.controller.js      # Cart management
│   ├── order.controller.js     # Order management
│   └── admin.controller.js     # Admin dashboard
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── category.routes.js
│   ├── product.routes.js
│   ├── cart.routes.js
│   ├── order.routes.js
│   └── admin.routes.js
├── middleware/
│   └── auth.middleware.js      # JWT & role verification
├── utils/
│   ├── tokenHelper.js          # JWT utilities
│   └── cryptoHelper.js         # Password reset tokens
└── scripts/
    ├── createDatabase.js       # Setup database
    └── seedDatabase.js         # Seed sample data
```

## 🎯 Setup Steps

### 1. Install Dependencies (Already Done ✅)
```bash
npm install
```

### 2. Configure Environment
Edit `.env` file and add your JWT secret:
```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=bookstore
PORT=5000
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
```

### 3. Start MongoDB
Make sure MongoDB is running on your machine:
```bash
# Windows (if installed as service)
net start MongoDB

# Or run manually
mongod
```

### 4. Setup Database
```bash
npm run db:setup
```
This will:
- Create all collections
- Create indexes
- Seed admin user and sample data

### 5. Start the Server
```bash
# Development mode (with nodemon)
npm run dev

# Or production mode
npm start
```

The API will be running at: `http://localhost:5000`

---

## 📋 Available API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login user | Public |
| GET | `/me` | Get current user | Private |
| POST | `/logout` | Logout user | Private |
| POST | `/forgot-password` | Request password reset | Public |
| PUT | `/reset-password/:token` | Reset password | Public |
| PUT | `/change-password` | Change password | Private |

### Users (`/api/users`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/profile` | Get user profile | Private |
| PUT | `/profile` | Update profile | Private |
| POST | `/addresses` | Add address | Private |
| PUT | `/addresses/:id` | Update address | Private |
| DELETE | `/addresses/:id` | Delete address | Private |

### Categories (`/api/categories`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all categories | Public |
| GET | `/:id` | Get single category | Public |
| POST | `/` | Create category | Admin |
| PUT | `/:id` | Update category | Admin |
| DELETE | `/:id` | Delete category | Admin |

### Products (`/api/products`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all products (with filters) | Public |
| GET | `/featured` | Get featured products | Public |
| GET | `/:id` | Get single product | Public |
| POST | `/` | Create product | Admin |
| PUT | `/:id` | Update product | Admin |
| DELETE | `/:id` | Delete product | Admin |

**Query Parameters for GET /products:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12)
- `category` - Filter by category
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `search` - Text search
- `sort` - Sort field (price, rating, createdAt)
- `order` - Sort order (asc, desc)

### Shopping Cart (`/api/cart`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get user cart | Private |
| POST | `/items` | Add item to cart | Private |
| PUT | `/items/:productId` | Update quantity | Private |
| DELETE | `/items/:productId` | Remove item | Private |
| DELETE | `/` | Clear cart | Private |

### Orders (`/api/orders`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create order from cart | Private |
| GET | `/` | Get user orders | Private |
| GET | `/:id` | Get single order | Private |
| PATCH | `/:id/cancel` | Cancel order | Private |

### Admin (`/api/admin`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users` | Get all users | Admin |
| GET | `/users/:id` | Get user details | Admin |
| PUT | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete user | Admin |
| GET | `/orders` | Get all orders | Admin |
| PATCH | `/orders/:id/status` | Update order status | Admin |
| GET | `/dashboard` | Get statistics | Admin |

---

## 🔑 Testing the API

### 1. Register a User
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### 2. Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "password123"
}
```

Response will include a `token`. Use this for authenticated requests.

### 3. Get Products (No auth required)
```bash
GET http://localhost:5000/api/products
```

### 4. Add to Cart (Requires auth)
```bash
POST http://localhost:5000/api/cart/items
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "productId": "PRODUCT_ID_FROM_DATABASE",
  "quantity": 2
}
```

### 5. Create Order (Requires auth)
```bash
POST http://localhost:5000/api/orders
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phoneNumber": "+1234567890"
  }
}
```

### 6. Admin Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@bookstore.com",
  "password": "admin123"
}
```

### 7. Get Dashboard Stats (Admin only)
```bash
GET http://localhost:5000/api/admin/dashboard
Authorization: Bearer ADMIN_TOKEN_HERE
```

---

## 🔒 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The token is returned when you:
- Register a new user
- Login
- Reset password

---

## 👤 Default Admin Account

After running `npm run db:seed`:
- **Email:** admin@bookstore.com
- **Password:** admin123

⚠️ **Change this in production!**

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 10,    // For list endpoints
  "page": 1,      // For paginated endpoints
  "pages": 5      // For paginated endpoints
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🧪 Testing with Postman/Thunder Client

1. Import the API endpoints from this guide
2. Create an environment with:
   - `base_url`: http://localhost:5000
   - `token`: (set after login)
3. Test the endpoints in order:
   - Auth → Products → Cart → Orders

---

## 🛠️ Development Tips

### Adding New Features
1. Create model in `models/`
2. Create controller in `controllers/`
3. Create routes in `routes/`
4. Register routes in `server.js`

### Database Changes
- Run `npm run db:create` to update indexes
- Run `npm run db:seed` to reset data

### Debugging
- Check server logs in terminal
- MongoDB logs: `mongod.log`
- Add `console.log()` in controllers for debugging

---

## 🎉 What's Next?

### Ready to implement:
- [ ] Payment gateway (Stripe/PayPal) - Phase 8
- [ ] Email notifications - Phase 9
- [ ] Product reviews - Phase 11
- [ ] Coupon system - Phase 10
- [ ] Admin analytics - Phase 12

### See `API-TODO.md` for the complete roadmap!

---

## 📝 Notes

- MongoDB must be running before starting the server
- JWT secret should be changed in production
- Use environment variables for sensitive data
- CORS is enabled for all origins (configure for production)
- Rate limiting: 100 requests per 15 minutes per IP

---

## 🐛 Common Issues

**Error: "MongooseServerSelectionError"**
- Solution: Make sure MongoDB is running

**Error: "JsonWebTokenError: jwt malformed"**
- Solution: Check Authorization header format

**Error: "User already exists"**
- Solution: Use a different email or delete existing user

**Port already in use**
- Solution: Change PORT in `.env` or stop other services on port 5000
