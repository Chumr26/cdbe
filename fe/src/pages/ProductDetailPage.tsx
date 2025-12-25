import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Form, Breadcrumb, Tab, Tabs } from 'react-bootstrap';
import { FaStar, FaShoppingCart, FaArrowLeft, FaBook, FaCalendar, FaLanguage, FaBuilding, FaBarcode, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { productsAPI } from '../api/products.api';
import type { Product } from '../api/products.api';
import { cartAPI } from '../api/cart.api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ProductCard from '../components/products/ProductCard';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
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

            // Load related products from same category
            if (response.data.category) {
                loadRelatedProducts(response.data.category, id!);
            }
        } catch (err: any) {
            setError('Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const loadRelatedProducts = async (category: string, currentProductId: string) => {
        try {
            const response = await productsAPI.getProducts({ category });
            // Filter out current product and limit to 4 items
            if (response.data && Array.isArray(response.data)) {
                const filtered = response.data
                    .filter((p: Product) => p._id !== currentProductId)
                    .slice(0, 4);
                setRelatedProducts(filtered);
            }
        } catch (err) {
            console.error('Failed to load related products:', err);
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
            // Show success message
            const notification = document.createElement('div');
            notification.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
            notification.style.zIndex = '9999';
            notification.textContent = '✓ Product added to cart!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } catch (err: any) {
            const notification = document.createElement('div');
            notification.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
            notification.style.zIndex = '9999';
            notification.textContent = err.response?.data?.message || 'Failed to add to cart';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
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

    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < fullStars; i++) {
            stars.push(<FaStar key={i} className="text-warning" />);
        }
        if (hasHalfStar) {
            stars.push(<FaStarHalfAlt key="half" className="text-warning" />);
        }
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<FaRegStar key={`empty-${i}`} className="text-warning" />);
        }
        return stars;
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <Container className="py-5"><ErrorMessage message={error} /></Container>;
    if (!product) return <Container className="py-5"><ErrorMessage message="Product not found" /></Container>;

    return (
        <Container className="py-3">
            {/* Breadcrumb Navigation */}
            <Breadcrumb className="mb-2" style={{ fontSize: '0.9rem' }}>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Home</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/products' }}>Products</Breadcrumb.Item>
                <Breadcrumb.Item active>{product.title}</Breadcrumb.Item>
            </Breadcrumb>

            {/* Back Button */}
            <Button
                variant="link"
                size="sm"
                className="mb-3 p-0 text-decoration-none"
                onClick={() => navigate('/products')}
            >
                <FaArrowLeft className="me-1" />
                Back to Products
            </Button>

            <Row>
                {/* Book Cover Image - Larger */}
                <Col md={6} lg={5}>
                    <div className="position-sticky" style={{ top: '20px' }}>
                        <img
                            src={
                                product.coverImage?.url ||
                                product.images?.[0] ||
                                'https://via.placeholder.com/400x600?text=No+Cover'
                            }
                            alt={product.title}
                            className="img-fluid rounded shadow"
                            style={{ width: '100%', maxHeight: '700px', objectFit: 'contain' }}
                        />
                    </div>
                </Col>

                {/* Product Information - Compact */}
                <Col md={6} lg={7}>
                    {/* Category and Featured Badges */}
                    <div className="mb-2">
                        <Badge bg="secondary" className="me-2">{product.category}</Badge>
                        {product.featured && <Badge bg="warning" text="dark">Featured</Badge>}
                    </div>

                    {/* Title and Author */}
                    <h2 className="mb-1">{product.title}</h2>
                    <p className="text-muted mb-2">by {product.author}</p>

                    {/* Rating - Compact */}
                    <div className="mb-2 d-flex align-items-center">
                        <div className="me-2">
                            {renderStars(product.rating)}
                        </div>
                        <small className="text-muted">
                            {product.rating.toFixed(1)} ({product.numReviews} reviews)
                        </small>
                    </div>

                    {/* Price and Stock - Inline and Compact */}
                    <div className="d-flex align-items-center justify-content-between mb-3 py-2 px-3 bg-light rounded">
                        <div>
                            <h3 className="text-primary mb-0">{formatPrice(product.price)}</h3>
                        </div>
                        <div>
                            {product.stock > 0 ? (
                                <Badge bg="success" className="py-2 px-3">
                                    In Stock ({product.stock} available)
                                </Badge>
                            ) : (
                                <Badge bg="danger" className="py-2 px-3">Out of Stock</Badge>
                            )}
                        </div>
                    </div>

                    {/* Quantity and Add to Cart - Compact Inline */}
                    {product.stock > 0 && (
                        <div className="mb-3">
                            <Row className="g-2">
                                <Col xs={4} sm={3}>
                                    <Form.Label className="small mb-1">Quantity</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                    >
                                        {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {i + 1}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col xs={8} sm={9}>
                                    <Form.Label className="small mb-1">&nbsp;</Form.Label>
                                    <Button
                                        variant="primary"
                                        className="w-100"
                                        onClick={handleAddToCart}
                                        disabled={adding}
                                    >
                                        <FaShoppingCart className="me-2" />
                                        {adding ? 'Adding...' : 'Add to Cart'}
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* Tabbed Interface - Compact */}
                    <Tabs defaultActiveKey="description" className="mb-3">
                        {/* Description Tab */}
                        <Tab eventKey="description" title="Description">
                            <div className="py-2">
                                {product.description ? (
                                    <p className="mb-0">{product.description}</p>
                                ) : (
                                    <p className="text-muted mb-0">No description available.</p>
                                )}
                            </div>
                        </Tab>

                        {/* Details Tab */}
                        <Tab eventKey="details" title="Details">
                            <div className="py-2">
                                <dl className="row mb-0 small">
                                    {product.isbn && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaBarcode className="me-1" />
                                                ISBN
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.isbn}</dd>
                                        </>
                                    )}

                                    <dt className="col-sm-4 text-muted mb-1">Author</dt>
                                    <dd className="col-sm-8 mb-1">{product.author}</dd>

                                    {product.publisher && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaBuilding className="me-1" />
                                                Publisher
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.publisher}</dd>
                                        </>
                                    )}

                                    {product.publicationYear && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaCalendar className="me-1" />
                                                Publication Year
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.publicationYear}</dd>
                                        </>
                                    )}

                                    {product.pageCount && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaBook className="me-1" />
                                                Pages
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.pageCount}</dd>
                                        </>
                                    )}

                                    {product.language && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaLanguage className="me-1" />
                                                Language
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.language}</dd>
                                        </>
                                    )}

                                    <dt className="col-sm-4 text-muted mb-1">Category</dt>
                                    <dd className="col-sm-8 mb-1">
                                        <Badge bg="secondary">{product.category}</Badge>
                                    </dd>
                                </dl>
                            </div>
                        </Tab>

                        {/* Reviews Tab */}
                        <Tab eventKey="reviews" title="Reviews">
                            <div className="text-center py-3">
                                <h6>Customer Reviews</h6>
                                <p className="text-muted small mb-2">
                                    Review feature coming soon!
                                </p>
                                <div className="mb-1">
                                    {renderStars(product.rating)}
                                </div>
                                <p className="text-muted small mb-0">
                                    {product.rating.toFixed(1)} out of 5 ({product.numReviews} reviews)
                                </p>
                            </div>
                        </Tab>
                    </Tabs>
                </Col>
            </Row>

            {/* Related Books Section */}
            {relatedProducts.length > 0 && (
                <div className="mt-4">
                    <h4 className="mb-3">Related Books in {product.category}</h4>
                    <Row>
                        {relatedProducts.map((relatedProduct) => (
                            <Col key={relatedProduct._id} xs={12} sm={6} md={4} lg={3} className="mb-3">
                                <ProductCard product={relatedProduct} />
                            </Col>
                        ))}
                    </Row>
                </div>
            )}
        </Container>
    );
};

export default ProductDetailPage;
