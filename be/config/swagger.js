const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bookstore API',
      version: '1.0.0',
      description: 'Complete API documentation for the E-commerce Bookstore application with authentication, product management, cart, orders, and admin features.',
      contact: {
        name: 'API Support',
        email: 'support@bookstore.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.bookstore.com/api',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: your-token-here',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', format: 'email', example: 'john@test.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
            addresses: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
            isEmailVerified: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string', example: '123 Main St' },
            city: { type: 'string', example: 'New York' },
            state: { type: 'string', example: 'NY' },
            zipCode: { type: 'string', example: '10001' },
            country: { type: 'string', example: 'USA' },
            isDefault: { type: 'boolean', example: true },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            title: { type: 'string', example: 'Clean Code' },
            isbn: { type: 'string', example: '978-0132350884' },
            author: { type: 'string', example: 'Robert C. Martin' },
            description: { type: 'string', example: 'A Handbook of Agile Software Craftsmanship' },
            category: { type: 'string', example: 'Technology' },
            price: { type: 'number', example: 39.99 },
            stock: { type: 'number', example: 50 },
            images: { type: 'array', items: { type: 'string' }, example: ['https://example.com/image1.jpg'] },
            rating: { type: 'number', example: 4.5 },
            isActive: { type: 'boolean', example: true },
            featured: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Technology' },
            slug: { type: 'string', example: 'technology' },
            description: { type: 'string', example: 'Books about technology and programming' },
            parentCategory: { type: 'string', nullable: true, example: null },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            productId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            quantity: { type: 'number', example: 2 },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            orderNumber: { type: 'string', example: 'ORD-1702834567890-A1B2' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            shippingAddress: { $ref: '#/components/schemas/Address' },
            paymentStatus: { type: 'string', enum: ['pending', 'completed', 'failed'], example: 'pending' },
            orderStatus: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], example: 'pending' },
            total: { type: 'number', example: 99.99 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            productId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            title: { type: 'string', example: 'Clean Code' },
            price: { type: 'number', example: 39.99 },
            quantity: { type: 'number', example: 2 },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ['./routes/*.js'], 
};

const specs = swaggerJsdoc(options);

const swaggerDocs = (app, port) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Bookstore API Docs',
  }));

  // Docs in JSON format
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📄 Swagger docs available at http://localhost:${port}/api-docs`);
};

module.exports = swaggerDocs;