require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const swaggerDocs = require('./config/swagger'); // Import Swagger config
const payOS = require('./utils/payos');

const app = express();

// Trust proxy - REQUIRED for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (only in production)
if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.'
    });
    app.use('/api', limiter);
    console.log('🔒 Rate limiting enabled');
} else {
    console.log('⚠️  Rate limiting disabled (development mode)');
}

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
    // Custom Morgan format with status text
    morgan.token('status-text', (req, res) => {
        const status = res.statusCode;
        const statusTexts = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
        };
        return statusTexts[status] || '';
    });

    app.use(morgan(':date[iso] :method :url :status :status-text :response-time ms - :res[content-length]'));
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Bookstore API',
        version: '1.0.0',
        status: 'running'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentRoutes = require('./routes/payment.routes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Initialize Swagger documentation (must be before 404 handler)
swaggerDocs(app, process.env.PORT || 5000);

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📄 Swagger docs available at http://localhost:${PORT}/api-docs`);
    // Add this to register the URL:
    if (process.env.NODE_ENV === 'development') {
        const PAYOS_WEBHOOK_URL = "https://newton-marked-aliya.ngrok-free.dev/api/payment/payos-webhook";

        try {
            await payOS.webhooks.confirm(PAYOS_WEBHOOK_URL);
            console.log('✅ PayOS Webhook confirmed!');
        } catch (error) {
            console.error('❌ Webhook setup failed:', error.message);
        }
    }
});
