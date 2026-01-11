import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import type { Product } from '../../api/products.api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatVnd, usdToVnd } from '../../utils/currency';

interface ProductCardProps {
    product: Product;
    onAddToCart?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const { isInCart, addToCart } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const inCart = isInCart(product._id);

    const priceVnd = typeof (product as Product & { priceVnd?: number }).priceVnd === 'number'
        ? (product as Product & { priceVnd?: number }).priceVnd!
        : usdToVnd(product.price);

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

    return (
        <Card className="h-100 shadow-sm hover-shadow product-card">
            <div className="position-relative">
                <Card.Img
                    variant="top"
                    src={getImageSource()}
                    alt={product.title}
                    style={{ height: '400px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                />
                {product.featured && (
                    <Badge bg="warning" className="position-absolute top-0 end-0 m-2">
                        Featured
                    </Badge>
                )}
                {product.stock === 0 && (
                    <Badge bg="danger" className="position-absolute top-0 start-0 m-2">
                        Out of Stock
                    </Badge>
                )}
            </div>
            <Card.Body className="d-flex flex-column">
                <Card.Title className="text-truncate" title={product.title}>
                    <Link to={`/products/${product._id}`} className="text-decoration-none text-dark">
                        {product.title}
                    </Link>
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted text-truncate">
                    by {product.author}
                </Card.Subtitle>
                <div className="mb-2">
                    <Badge bg="secondary" className="me-1">{product.category}</Badge>
                    <span className="text-warning">
                        <FaStar /> {product.rating.toFixed(1)} ({product.numReviews})
                    </span>
                </div>
                <Card.Text className="text-truncate" style={{ maxHeight: '3em' }}>
                    {product.description}
                </Card.Text>
                <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0 text-primary">{formatVnd(priceVnd)}</h5>
                        <small className="text-muted">{product.stock} in stock</small>
                    </div>
                    <Button
                        variant={inCart ? "secondary" : "primary"}
                        className="w-100"
                        onClick={handleAddToCart}
                        disabled={product.stock === 0 || inCart}
                    >
                        {product.stock === 0 ? 'Out of Stock' : inCart ? '✓ In Cart' : 'Add to Cart'}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ProductCard;
