import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Form } from 'react-bootstrap';
import { FaStar, FaShoppingCart } from 'react-icons/fa';
import { productsAPI } from '../api/products.api';
import type { Product } from '../api/products.api';
import { cartAPI } from '../api/cart.api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (id) {
            loadProduct();
        }
    }, [id]);

    const loadProduct = async () => {
        try {
            const response = await productsAPI.getProduct(id!);
            setProduct(response.data);
        } catch (err: any) {
            setError('Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        setAdding(true);
        try {
            await cartAPI.addToCart(product!._id, quantity);
            alert('Product added to cart!');
            navigate('/cart');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to add to cart');
        } finally {
            setAdding(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <Container className="py-5"><ErrorMessage message={error} /></Container>;
    if (!product) return <Container className="py-5"><ErrorMessage message="Product not found" /></Container>;

    return (
        <Container className="py-5">
            <Row>
                <Col md={5}>
                    <img
                        src={product.images?.[0] || 'https://via.placeholder.com/400x600?text=No+Image'}
                        alt={product.title}
                        className="img-fluid rounded shadow"
                    />
                </Col>
                <Col md={7}>
                    <div className="mb-2">
                        <Badge bg="secondary">{product.category}</Badge>
                        {product.featured && <Badge bg="warning" className="ms-2">Featured</Badge>}
                    </div>
                    <h1 className="mb-3">{product.title}</h1>
                    <h5 className="text-muted mb-3">by {product.author}</h5>

                    <div className="mb-3">
                        <span className="text-warning me-2">
                            <FaStar /> {product.rating.toFixed(1)}
                        </span>
                        <span className="text-muted">({product.numReviews} reviews)</span>
                    </div>

                    {product.isbn && (
                        <p className="text-muted">ISBN: {product.isbn}</p>
                    )}

                    <h3 className="text-primary mb-3">{formatPrice(product.price)}</h3>

                    <div className="mb-3">
                        {product.stock > 0 ? (
                            <Badge bg="success">In Stock ({product.stock} available)</Badge>
                        ) : (
                            <Badge bg="danger">Out of Stock</Badge>
                        )}
                    </div>

                    {product.description && (
                        <div className="mb-4">
                            <h5>Description</h5>
                            <p>{product.description}</p>
                        </div>
                    )}

                    {product.stock > 0 && (
                        <div className="mb-4">
                            <Form.Group className="mb-3" style={{ maxWidth: '150px' }}>
                                <Form.Label>Quantity</Form.Label>
                                <Form.Select
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                >
                                    {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {i + 1}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleAddToCart}
                                disabled={adding}
                            >
                                <FaShoppingCart className="me-2" />
                                {adding ? 'Adding...' : 'Add to Cart'}
                            </Button>
                        </div>
                    )}

                    <div className="border-top pt-3 mt-4">
                        <h6>Product Details</h6>
                        <ul className="list-unstyled">
                            <li><strong>Category:</strong> {product.category}</li>
                            <li><strong>Author:</strong> {product.author}</li>
                            {product.isbn && <li><strong>ISBN:</strong> {product.isbn}</li>}
                            <li><strong>Rating:</strong> {product.rating.toFixed(1)} / 5.0</li>
                        </ul>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default ProductDetailPage;
