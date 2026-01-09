import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Breadcrumb, Tab, Tabs, Form, Alert, Spinner } from 'react-bootstrap';
import { FaStar, FaShoppingCart, FaArrowLeft, FaBook, FaCalendar, FaLanguage, FaBuilding, FaBarcode, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { productsAPI } from '../api/products.api';
import type { Product, Review } from '../api/products.api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ProductCard from '../components/products/ProductCard';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { isInCart, addToCart } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adding, setAdding] = useState(false);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState('');

    const [reviewRating, setReviewRating] = useState<number>(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewActionError, setReviewActionError] = useState('');
    const [reviewActionSuccess, setReviewActionSuccess] = useState('');

    const inCart = product ? isInCart(product._id) : false;

    useEffect(() => {
        if (id) {
            setLoading(true);
            setError('');
            loadProduct();
            loadReviews();
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

    const refreshProduct = async () => {
        if (!id) return;
        try {
            const response = await productsAPI.getProduct(id);
            setProduct(response.data);
        } catch {
            // Ignore refresh errors; main loader handles user-facing errors
        }
    };

    const loadReviews = async () => {
        if (!id) return;
        setReviewsLoading(true);
        setReviewsError('');
        try {
            const response = await productsAPI.getProductReviews(id, 1, 50);
            setReviews(response.data);
        } catch (err: any) {
            setReviewsError(err?.response?.data?.message || 'Failed to load reviews');
        } finally {
            setReviewsLoading(false);
        }
    };

    const getReviewUserId = (review: Review) => {
        return typeof review.userId === 'string' ? review.userId : review.userId._id;
    };

    const myReview = user ? reviews.find((r) => getReviewUserId(r) === user._id) : undefined;

    useEffect(() => {
        if (myReview) {
            setReviewRating(myReview.rating);
            setReviewComment(myReview.comment || '');
        } else {
            setReviewRating(5);
            setReviewComment('');
        }
    }, [user?._id, myReview?._id]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setReviewSubmitting(true);
        setReviewActionError('');
        setReviewActionSuccess('');

        try {
            if (myReview) {
                await productsAPI.updateMyProductReview(id, {
                    rating: reviewRating,
                    comment: reviewComment
                });
                setReviewActionSuccess('Review updated successfully');
            } else {
                await productsAPI.createProductReview(id, {
                    rating: reviewRating,
                    comment: reviewComment
                });
                setReviewActionSuccess('Review submitted successfully');
            }

            await refreshProduct();
            await loadReviews();
        } catch (err: any) {
            setReviewActionError(err?.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!id) return;
        if (!window.confirm('Delete your review?')) return;

        setReviewSubmitting(true);
        setReviewActionError('');
        setReviewActionSuccess('');

        try {
            await productsAPI.deleteMyProductReview(id);
            setReviewActionSuccess('Review deleted successfully');
            await refreshProduct();
            await loadReviews();
        } catch (err: any) {
            setReviewActionError(err?.response?.data?.message || 'Failed to delete review');
        } finally {
            setReviewSubmitting(false);
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

        if (inCart) {
            return; // Already in cart, do nothing
        }

        setAdding(true);
        try {
            await addToCart(product!._id, 1);
        } catch (err: any) {
            // Error handling is done in CartContext
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

                    {/* Add to Cart - Compact */}
                    {product.stock > 0 && (
                        <div className="mb-3">
                            <Button
                                variant={inCart ? "secondary" : "primary"}
                                className="w-100"
                                onClick={handleAddToCart}
                                disabled={adding || inCart}
                            >
                                <FaShoppingCart className="me-2" />
                                {inCart ? '✓ In Cart' : adding ? 'Adding...' : 'Add to Cart'}
                            </Button>
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
                            <div className="py-2">
                                <div className="text-center py-2">
                                    <h6 className="mb-2">Customer Reviews</h6>
                                    <div className="mb-1">{renderStars(product.rating)}</div>
                                    <p className="text-muted small mb-0">
                                        {product.rating.toFixed(1)} out of 5 ({product.numReviews} reviews)
                                    </p>
                                </div>

                                {reviewActionSuccess && (
                                    <Alert variant="success" className="py-2">
                                        {reviewActionSuccess}
                                    </Alert>
                                )}
                                {reviewActionError && (
                                    <Alert variant="danger" className="py-2">
                                        {reviewActionError}
                                    </Alert>
                                )}

                                {isAuthenticated ? (
                                    <div className="mb-3">
                                        <h6 className="mb-2">{myReview ? 'Edit Your Review' : 'Write a Review'}</h6>
                                        <Form onSubmit={handleSubmitReview}>
                                            <Row className="g-2 align-items-end">
                                                <Col xs={12} md={4}>
                                                    <Form.Group controlId="reviewRating">
                                                        <Form.Label className="small text-muted">Rating</Form.Label>
                                                        <Form.Select
                                                            value={reviewRating}
                                                            onChange={(e) => setReviewRating(Number(e.target.value))}
                                                            disabled={reviewSubmitting}
                                                        >
                                                            {[5, 4, 3, 2, 1].map((val) => (
                                                                <option key={val} value={val}>
                                                                    {val}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={12} md={8}>
                                                    <Form.Group controlId="reviewComment">
                                                        <Form.Label className="small text-muted">Comment (optional)</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={2}
                                                            value={reviewComment}
                                                            onChange={(e) => setReviewComment(e.target.value)}
                                                            disabled={reviewSubmitting}
                                                            placeholder="Share your thoughts..."
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="d-flex gap-2 mt-2">
                                                <Button type="submit" variant="primary" disabled={reviewSubmitting}>
                                                    {reviewSubmitting ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                                                </Button>

                                                {myReview && (
                                                    <Button
                                                        type="button"
                                                        variant="outline-danger"
                                                        disabled={reviewSubmitting}
                                                        onClick={handleDeleteReview}
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>

                                            <p className="text-muted small mt-2 mb-0">
                                                Only customers with a completed purchase can review.
                                            </p>
                                        </Form>
                                    </div>
                                ) : (
                                    <Alert variant="info" className="py-2">
                                        <Link to="/login">Login</Link> to write a review.
                                    </Alert>
                                )}

                                <hr className="my-3" />

                                <h6 className="mb-2">All Reviews</h6>
                                {reviewsLoading ? (
                                    <div className="text-center py-3">
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        <span className="text-muted small">Loading reviews...</span>
                                    </div>
                                ) : reviewsError ? (
                                    <ErrorMessage message={reviewsError} />
                                ) : reviews.length === 0 ? (
                                    <p className="text-muted small mb-0">No reviews yet.</p>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {reviews.map((review) => {
                                            const reviewerName =
                                                typeof review.userId === 'string'
                                                    ? 'Customer'
                                                    : `${review.userId.firstName} ${review.userId.lastName}`;
                                            const isMine = user ? getReviewUserId(review) === user._id : false;

                                            return (
                                                <div key={review._id} className="border rounded p-2">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <div className="fw-semibold small">
                                                                {reviewerName} {isMine ? '(You)' : ''}
                                                            </div>
                                                            <div className="small">{renderStars(review.rating)}</div>
                                                        </div>
                                                        <div className="text-muted small">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    {review.comment && (
                                                        <p className="small mb-0 mt-1">{review.comment}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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
