# 📬 API Testing Guide

## Quick Test with PowerShell

### 1. Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

### 2. Register User

```powershell
$body = @{
    email = "john@test.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### 3. Login

```powershell
$body = @{
    email = "john@test.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

# Save token for later use
$token = $response.token
Write-Host "Token saved: $token"
```

**The token is now stored in `$token` variable for next requests!**

### 4. Get Products (No auth)

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/products"
```

### 5. Get Categories (No auth)

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/categories"
```

### 6. Get User Profile (Auth required)

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/users/profile" `
    -Headers $headers
```

### 7. Add to Cart (Auth required)

First, get a product ID from the products list, then:

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$body = @{
    productId = "PRODUCT_ID_HERE"
    quantity = 2
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/cart/items" `
    -Method Post `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
```

### 8. View Cart (Auth required)

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/cart" `
    -Headers $headers
```

### 9. Create Order (Auth required)

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$body = @{
    shippingAddress = @{
        firstName = "John"
        lastName = "Doe"
        street = "123 Main St"
        city = "New York"
        state = "NY"
        zipCode = "10001"
        country = "USA"
        phoneNumber = "+1234567890"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/orders" `
    -Method Post `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
```

### 10. Admin Login

```powershell
$body = @{
    email = "admin@bookstore.com"
    password = "admin123"
} | ConvertTo-Json

$adminResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

# Save admin token
$adminToken = $adminResponse.token
Write-Host "Admin token saved: $adminToken"
```

### 11. Get Dashboard Stats (Admin only)

```powershell
$headers = @{
    Authorization = "Bearer $adminToken"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/admin/dashboard" `
    -Headers $headers
```

---

## Postman Collection

Create a new Postman collection with these requests:

### Environment Variables

Set these in Postman environment:

-   `base_url`: http://localhost:5000
-   `token`: (set automatically from login response)
-   `admin_token`: (set automatically from admin login)

### Collection Structure

#### 1. Auth Folder

-   **Register** - POST `{{base_url}}/api/auth/register`
-   **Login** - POST `{{base_url}}/api/auth/login`
    -   Tests tab: `pm.environment.set("token", pm.response.json().token);`
-   **Get Me** - GET `{{base_url}}/api/auth/me`
-   **Logout** - POST `{{base_url}}/api/auth/logout`
-   **Forgot Password** - POST `{{base_url}}/api/auth/forgot-password`
-   **Change Password** - PUT `{{base_url}}/api/auth/change-password`

#### 2. Categories Folder

-   **Get All Categories** - GET `{{base_url}}/api/categories`
-   **Get Category** - GET `{{base_url}}/api/categories/:id`
-   **Create Category** (Admin) - POST `{{base_url}}/api/categories`
-   **Update Category** (Admin) - PUT `{{base_url}}/api/categories/:id`
-   **Delete Category** (Admin) - DELETE `{{base_url}}/api/categories/:id`

#### 3. Products Folder

-   **Get All Products** - GET `{{base_url}}/api/products`
-   **Get Featured Products** - GET `{{base_url}}/api/products/featured`
-   **Get Product** - GET `{{base_url}}/api/products/:id`
-   **Search Products** - GET `{{base_url}}/api/products?search=clean`
-   **Filter by Category** - GET `{{base_url}}/api/products?category=Technology`
-   **Filter by Price** - GET `{{base_url}}/api/products?minPrice=10&maxPrice=30`
-   **Create Product** (Admin) - POST `{{base_url}}/api/products`
-   **Update Product** (Admin) - PUT `{{base_url}}/api/products/:id`
-   **Delete Product** (Admin) - DELETE `{{base_url}}/api/products/:id`

#### 4. User Profile Folder

-   **Get Profile** - GET `{{base_url}}/api/users/profile`
-   **Update Profile** - PUT `{{base_url}}/api/users/profile`
-   **Add Address** - POST `{{base_url}}/api/users/addresses`
-   **Update Address** - PUT `{{base_url}}/api/users/addresses/:id`
-   **Delete Address** - DELETE `{{base_url}}/api/users/addresses/:id`

#### 5. Shopping Cart Folder

-   **Get Cart** - GET `{{base_url}}/api/cart`
-   **Add to Cart** - POST `{{base_url}}/api/cart/items`
-   **Update Quantity** - PUT `{{base_url}}/api/cart/items/:productId`
-   **Remove from Cart** - DELETE `{{base_url}}/api/cart/items/:productId`
-   **Clear Cart** - DELETE `{{base_url}}/api/cart`

#### 6. Orders Folder

-   **Create Order** - POST `{{base_url}}/api/orders`
-   **Get My Orders** - GET `{{base_url}}/api/orders`
-   **Get Order** - GET `{{base_url}}/api/orders/:id`
-   **Cancel Order** - PATCH `{{base_url}}/api/orders/:id/cancel`

#### 7. Admin Folder

-   **Admin Login** - POST `{{base_url}}/api/auth/login`
    -   Tests tab: `pm.environment.set("admin_token", pm.response.json().token);`
-   **Get Dashboard** - GET `{{base_url}}/api/admin/dashboard`
-   **Get All Users** - GET `{{base_url}}/api/admin/users`
-   **Get User** - GET `{{base_url}}/api/admin/users/:id`
-   **Update User** - PUT `{{base_url}}/api/admin/users/:id`
-   **Delete User** - DELETE `{{base_url}}/api/admin/users/:id`
-   **Get All Orders** - GET `{{base_url}}/api/admin/orders`
-   **Update Order Status** - PATCH `{{base_url}}/api/admin/orders/:id/status`

---

## Sample Request Bodies

### Register

```json
{
    "email": "customer@test.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
}
```

### Login

```json
{
    "email": "customer@test.com",
    "password": "password123"
}
```

### Add to Cart

```json
{
    "productId": "675a1234567890abcdef1234",
    "quantity": 2
}
```

### Create Order

```json
{
    "shippingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "street": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA",
        "phoneNumber": "+1234567890"
    }
}
```

### Create Product (Admin)

```json
{
    "title": "New Book Title",
    "isbn": "978-1-23-456789-0",
    "author": "Author Name",
    "description": "Book description here",
    "category": "Fiction",
    "price": 24.99,
    "stock": 50,
    "images": ["https://example.com/image.jpg"]
}
```

### Create Category (Admin)

```json
{
    "name": "Mystery",
    "description": "Mystery and thriller books"
}
```

### Update Order Status (Admin)

```json
{
    "orderStatus": "shipped",
    "trackingNumber": "TRACK123456"
}
```

---

## Thunder Client (VS Code Extension)

1. Install Thunder Client extension in VS Code
2. Create new request
3. Set method and URL
4. Add headers if needed:
    - `Content-Type: application/json`
    - `Authorization: Bearer YOUR_TOKEN`
5. Add body for POST/PUT requests
6. Click Send

---

## Testing Flow

### Customer Flow:

1. Register → Get token
2. Browse products
3. Add products to cart
4. View cart
5. Create order
6. View order history
7. Cancel order (if pending)

### Admin Flow:

1. Login as admin → Get admin token
2. View dashboard statistics
3. Manage products (CRUD)
4. Manage categories (CRUD)
5. View all orders
6. Update order status
7. Manage users

---

## Response Examples

### Success Response:

```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

### Error Response:

```json
{
    "success": false,
    "message": "Error description"
}
```

### Login Response:

```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "675a1234567890abcdef1234",
        "email": "customer@test.com",
        "role": "customer",
        "firstName": "John",
        "lastName": "Doe"
    }
}
```

---

## Common Headers

### All Protected Routes:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### POST/PUT Requests:

```
Content-Type: application/json
```

---

## Tips

1. **Save tokens** - Copy token after login for subsequent requests
2. **Check MongoDB** - Use MongoDB Compass to view data
3. **Check logs** - Watch terminal for server logs
4. **Test in order** - Follow the customer/admin flow
5. **Check stock** - Some operations require sufficient stock
6. **Use real data** - Replace placeholder IDs with actual MongoDB ObjectIds

---

## Troubleshooting

**401 Unauthorized:**

-   Check token is included in Authorization header
-   Token might be expired (default: 7 days)
-   Format: `Bearer YOUR_TOKEN`

**404 Not Found:**

-   Check URL is correct
-   Check ID exists in database

**400 Bad Request:**

-   Check request body format
-   Validate required fields
-   Check data types

**403 Forbidden:**

-   Admin-only route requires admin token
-   Check user role

---

## Ready to Test!

1. Start MongoDB
2. Run `npm run db:setup` (first time only)
3. Run `npm run dev`
4. Start testing with cURL, Postman, or Thunder Client!
