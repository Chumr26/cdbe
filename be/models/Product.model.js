const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    titleI18n: {
        en: {
            type: String,
            required: [true, 'Product title (EN) is required'],
            trim: true
        },
        vi: {
            type: String,
            required: [true, 'Product title (VI) is required'],
            trim: true
        }
    },
    isbn: {
        type: String,
        unique: true,
        sparse: true // Allow null values but enforce uniqueness when present
    },
    author: {
        type: String,
        required: [true, 'Author is required'],
        trim: true
    },
    descriptionI18n: {
        en: {
            type: String,
            required: [true, 'Product description (EN) is required'],
            trim: true
        },
        vi: {
            type: String,
            required: [true, 'Product description (VI) is required'],
            trim: true
        }
    },
    category: {
        type: String,
        required: [true, 'Category is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    images: [String],
    coverImage: {
        source: {
            type: String,
            enum: ['api', 'upload', 'placeholder'],
            default: 'api'
        },
        url: {
            type: String,
            default: null
        }
    },
    publisher: {
        type: String,
        trim: true
    },
    publicationYear: {
        type: Number,
        min: 1000,
        max: new Date().getFullYear() + 1
    },
    pageCount: {
        type: Number,
        min: 1
    },
    language: {
        type: String,
        default: 'English'
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    numReviews: {
        type: Number,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    embedding: {
        type: [Number],
        default: undefined,
        select: false
    }
}, {
    timestamps: true
});

// Text index for search
productSchema.index({
    'titleI18n.en': 'text',
    'titleI18n.vi': 'text',
    author: 'text',
    'descriptionI18n.en': 'text',
    'descriptionI18n.vi': 'text'
});

module.exports = mongoose.model('Product', productSchema);
