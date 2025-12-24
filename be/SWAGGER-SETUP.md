# 📄 Swagger API Documentation Setup - Complete

## ✅ Setup Complete!

All Swagger/OpenAPI documentation has been successfully added to your Bookstore API project.

---

## 🎯 What Was Added

### 1. **Enhanced Swagger Configuration** (`config/swagger.js`)
- Added complete schema definitions for all models
- Configured JWT Bearer authentication
- Added both local and production server URLs
- Customized UI appearance

### 2. **Documented All 39 API Endpoints**

#### **Auth Routes** (7 endpoints)
- ✅ POST `/api/auth/register` - Register new user
- ✅ POST `/api/auth/login` - Login user
- ✅ GET `/api/auth/me` - Get current user
- ✅ POST `/api/auth/logout` - Logout user
- ✅ POST `/api/auth/forgot-password` - Request password reset
- ✅ PUT `/api/auth/reset-password/:resetToken` - Reset password
- ✅ PUT `/api/auth/change-password` - Change password

#### **Product Routes** (6 endpoints)
- ✅ GET `/api/products` - Get all products (with filtering, search, pagination)
- ✅ GET `/api/products/featured` - Get featured products
- ✅ GET `/api/products/:id` - Get single product
- ✅ POST `/api/products` - Create product (Admin)
- ✅ PUT `/api/products/:id` - Update product (Admin)
- ✅ DELETE `/api/products/:id` - Delete product (Admin)

#### **Category Routes** (5 endpoints)
- ✅ GET `/api/categories` - Get all categories
- ✅ GET `/api/categories/:id` - Get category by ID/slug
- ✅ POST `/api/categories` - Create category (Admin)
- ✅ PUT `/api/categories/:id` - Update category (Admin)
- ✅ DELETE `/api/categories/:id` - Delete category (Admin)

#### **Cart Routes** (5 endpoints)
- ✅ GET `/api/cart` - Get user's cart
- ✅ POST `/api/cart/items` - Add item to cart
- ✅ PUT `/api/cart/items/:productId` - Update cart item
- ✅ DELETE `/api/cart/items/:productId` - Remove item from cart
- ✅ DELETE `/api/cart` - Clear entire cart

#### **Order Routes** (4 endpoints)
- ✅ POST `/api/orders` - Create order from cart
- ✅ GET `/api/orders` - Get user's orders
- ✅ GET `/api/orders/:id` - Get single order
- ✅ PATCH `/api/orders/:id/cancel` - Cancel order

#### **User Routes** (5 endpoints)
- ✅ GET `/api/users/profile` - Get user profile
- ✅ PUT `/api/users/profile` - Update profile
- ✅ POST `/api/users/addresses` - Add address
- ✅ PUT `/api/users/addresses/:id` - Update address
- ✅ DELETE `/api/users/addresses/:id` - Delete address

#### **Admin Routes** (7 endpoints)
- ✅ GET `/api/admin/users` - Get all users
- ✅ GET `/api/admin/users/:id` - Get user by ID
- ✅ PUT `/api/admin/users/:id` - Update user
- ✅ DELETE `/api/admin/users/:id` - Delete user
- ✅ GET `/api/admin/orders` - Get all orders
- ✅ PATCH `/api/admin/orders/:id/status` - Update order status
- ✅ GET `/api/admin/dashboard` - Get dashboard statistics

---

## 🚀 How to Access the Documentation

### **Step 1: Start Your Server**
```powershell
npm run dev
```

### **Step 2: Open Swagger UI**
Navigate to: **http://localhost:5000/api-docs**

### **Step 3: Test Endpoints**
1. Click on any endpoint to expand it
2. Click **"Try it out"**
3. Fill in the required parameters
4. Click **"Execute"** to test

---

## 🔐 Testing Protected Endpoints

Many endpoints require authentication. Here's how to test them:

### **1. Register or Login First**
- Use `/api/auth/register` or `/api/auth/login`
- Copy the JWT token from the response

### **2. Authorize in Swagger**
1. Click the **"Authorize"** button at the top right (🔒 icon)
2. Paste your token (no "Bearer" prefix needed)
3. Click **"Authorize"**
4. Click **"Close"**

### **3. Test Protected Endpoints**
Now you can test any endpoint that requires authentication!

---

## 📊 Available Schemas

The following data schemas are documented:

- **User** - User account information
- **Address** - Shipping/billing address
- **Product** - Book product details
- **Category** - Product category
- **Cart** - Shopping cart
- **CartItem** - Individual cart item
- **Order** - Order information
- **OrderItem** - Individual order item
- **Error** - Standard error response

---

## 🎨 Features

### **Interactive Testing**
- Test all endpoints directly from the browser
- See request/response examples
- View schema definitions
- Test authentication flows

### **Comprehensive Documentation**
- Request parameters with examples
- Response schemas with status codes
- Authentication requirements clearly marked
- Query parameters for filtering and pagination

### **JWT Authentication**
- Secure bearer token authentication
- Easy token management with Authorize button
- Clear security indicators on protected routes

---

## 📖 Example Usage

### **Testing Product Search**
1. Go to `GET /api/products`
2. Click "Try it out"
3. Enter query parameters:
   - `search`: "clean code"
   - `category`: "Technology"
   - `minPrice`: 20
   - `maxPrice`: 50
   - `sortBy`: "price"
   - `order`: "asc"
4. Click "Execute"

### **Creating an Order**
1. Login to get token
2. Click "Authorize" and paste token
3. Add items to cart using `POST /api/cart/items`
4. Create order using `POST /api/orders`
5. View order using `GET /api/orders/:id`

### **Admin Operations**
1. Login with admin credentials:
   - Email: `admin@bookstore.com`
   - Password: `admin123`
2. Authorize with admin token
3. Access admin endpoints like:
   - `GET /api/admin/dashboard`
   - `GET /api/admin/users`
   - `PATCH /api/admin/orders/:id/status`

---

## 🔍 Additional Features

### **Export API Docs**
You can export the OpenAPI specification:
- **JSON Format**: http://localhost:5000/api-docs.json
- Use this for:
  - Postman import
  - Client SDK generation
  - API gateway configuration

### **Organize by Tags**
Endpoints are grouped by:
- Auth
- Products
- Categories
- Cart
- Orders
- Users
- Admin

---

## 💡 Pro Tips

### **Tip 1: Save Time with Token**
After authorizing once, the token persists for all requests until you refresh the page.

### **Tip 2: Use Examples**
Every request body shows example values. Click "Example Value" to auto-fill.

### **Tip 3: Check Responses**
Swagger shows all possible response codes (200, 400, 401, 404, etc.) with examples.

### **Tip 4: Filter by Tag**
Use the search bar or click tags to filter endpoints by category.

### **Tip 5: Copy as cURL**
After executing, you can copy the request as a cURL command.

---

## 🎯 Quick Testing Workflow

### **For Customers:**
```
1. Register → Get token
2. Browse products → GET /api/products
3. Add to cart → POST /api/cart/items
4. Create order → POST /api/orders
5. View orders → GET /api/orders
```

### **For Admins:**
```
1. Login as admin → Get admin token
2. View dashboard → GET /api/admin/dashboard
3. Manage products → POST/PUT/DELETE /api/products
4. Manage orders → PATCH /api/admin/orders/:id/status
5. Manage users → GET/PUT/DELETE /api/admin/users
```

---

## 📚 Documentation URL

**Local Development:**
- Swagger UI: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs.json

**After Deployment:**
- Update the production URL in `config/swagger.js`

---

## 🎉 You're All Set!

Your API now has:
- ✅ Complete interactive documentation
- ✅ All 39 endpoints documented
- ✅ Schema definitions for all models
- ✅ JWT authentication support
- ✅ Request/response examples
- ✅ Easy testing interface

**Start your server and visit http://localhost:5000/api-docs to explore!**

---

## 🔗 Useful Links

- [Swagger UI Docs](https://swagger.io/tools/swagger-ui/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [JSDoc Comments Reference](https://github.com/Surnet/swagger-jsdoc/blob/master/docs/GETTING-STARTED.md)

---

**Happy Testing! 🚀**
