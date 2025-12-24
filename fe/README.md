# Bookstore Frontend

React + TypeScript + Vite frontend for the Bookstore e-commerce application.

## Features

- 🔐 User authentication (login, register)
- 📚 Product browsing with search and filters
- 🛒 Shopping cart functionality
- 📦 Order management
- 👨‍💼 Admin dashboard
- 📱 Responsive design with React Bootstrap

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Bootstrap** - UI components
- **React Router** - Routing
- **Axios** - HTTP client
- **React Icons** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5000/api
```

## Project Structure

```
src/
├── api/                 # API service layer
├── components/          # Reusable components
│   ├── common/         # Common components
│   ├── layout/         # Layout components
│   └── products/       # Product components
├── context/            # React context (Auth)
├── pages/              # Page components
│   └── admin/          # Admin pages
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Available Routes

### Public Routes
- `/` - Home page
- `/products` - Product listing
- `/products/:id` - Product details
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Requires Authentication)
- `/cart` - Shopping cart
- `/checkout` - Checkout page
- `/orders` - Order history

### Admin Routes (Requires Admin Role)
- `/admin` - Admin dashboard

## Default Admin Credentials

- **Email:** admin@bookstore.com
- **Password:** admin123

## Development

```bash
# Run development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features Implemented

✅ User authentication with JWT
✅ Product browsing with filters
✅ Shopping cart management
✅ Order placement and tracking
✅ Admin dashboard with statistics
✅ Responsive design
✅ Protected routes
✅ Error handling
✅ Loading states

## License

ISC
