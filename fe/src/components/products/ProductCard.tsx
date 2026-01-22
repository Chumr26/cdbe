import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import type { Product } from '../../api/products.api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../../utils/currency';
import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '../../utils/i18n';

interface ProductCardProps {
    product: Product;
    onAddToCart?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const { t, i18n } = useTranslation();
    const { isInCart, addToCart } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const inCart = isInCart(product._id);
    const title = getLocalizedText(product.titleI18n, i18n.language) || product.title || '';
    const description = getLocalizedText(product.descriptionI18n, i18n.language) || product.description || '';

    // Smart image source selection: API cover > uploaded cover > legacy images > placeholder
    const getImageSource = () => {
        if (product.coverImage?.url) {
            return product.coverImage.url;
        }
        if (product.images && product.images.length > 0) {
            return product.images[0];
        }
        return 'https://via.placeholder.com/300x400?text=No+Cover';
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!inCart) {
            try {
                await addToCart(product._id, 1);
            } catch {
                // Error handling is done in CartContext
            }
        }
    };

    const getCategoryLabel = (rawCategory: string) => {
        const trimmed = rawCategory.trim();
        if (!trimmed) return rawCategory;

        const normalized = trimmed
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/_+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const key = (() => {
            if (trimmed === 'nonFiction') return 'nonFiction';
            if (trimmed === 'selfHelp') return 'selfHelp';

            switch (normalized) {
                case 'non-fiction':
                    return 'nonFiction';
                case 'self-help':
                    return 'selfHelp';
                case 'childrens':
                case 'children':
                case 'childrens-books':
                    return 'children';
                default:
                    return normalized;
            }
        })();

        const footerKey = `footer.categories.${key}`;
        if (i18n.exists(footerKey)) return t(footerKey);

        const homeKey = `home.categories.${key}`;
        if (i18n.exists(homeKey)) return t(homeKey);

        return rawCategory;
    };

    const categoryLabel = getCategoryLabel(product.category);

    return (
        <Card className="h-100 shadow-sm hover-shadow product-card">
            <div className="position-relative">
                <Card.Img
                    variant="top"
                    src={getImageSource()}
                    alt={title}
                    style={{ height: '400px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                />
                {product.featured && (
                    <Badge bg="warning" className="position-absolute top-0 end-0 m-2">
                        {t('productCard.featured')}
                    </Badge>
                )}
                {product.stock === 0 && (
                    <Badge bg="danger" className="position-absolute top-0 start-0 m-2">
                        {t('productCard.outOfStock')}
                    </Badge>
                )}
            </div>
            <Card.Body className="d-flex flex-column">
                <Card.Title className="text-truncate" title={title}>
                    <Link to={`/products/${product._id}`} className="text-decoration-none text-dark">
                        {title}
                    </Link>
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted text-truncate">
                    {t('productCard.by', { author: product.author })}
                </Card.Subtitle>
                <div className="mb-2">
                    <Badge bg="secondary" className="me-1">{categoryLabel}</Badge>
                    <span className="text-warning">
                        <FaStar /> {product.rating.toFixed(1)} ({product.numReviews})
                    </span>
                </div>
                <Card.Text className="text-truncate" style={{ maxHeight: '3em' }}>
                    {description}
                </Card.Text>
                <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0 text-primary">{formatMoney(product.price, 'USD')}</h5>
                        <small className="text-muted">{t('productCard.stock', { count: product.stock })}</small>
                    </div>
                    <Button
                        variant={inCart ? "secondary" : "primary"}
                        className="w-100"
                        onClick={handleAddToCart}
                        disabled={product.stock === 0 || inCart}
                    >
                        {product.stock === 0
                            ? t('productCard.outOfStock')
                            : inCart
                                ? t('productCard.inCart')
                                : t('productCard.addToCart')}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ProductCard;
