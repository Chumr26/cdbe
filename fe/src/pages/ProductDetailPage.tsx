import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Breadcrumb, Tab, Tabs, Form, Alert, Spinner } from 'react-bootstrap';
import { FaStar, FaShoppingCart, FaArrowLeft, FaBook, FaCalendar, FaLanguage, FaBuilding, FaBarcode, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import axios from 'axios';
import { productsAPI } from '../api/products.api';
import type { Product, Review } from '../api/products.api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ProductCard from '../components/products/ProductCard';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../utils/currency';
import { getLocalizedText } from '../utils/i18n';
import { getCategoryLabel } from '../utils/categoryLabel';
import { resolveAssetUrl } from '../utils/image';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const ProductDetailPage: React.FC = () => {
    const { t, i18n } = useTranslation();
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
    const [hoverRating, setHoverRating] = useState<number>(0);
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, i18n.language]);

    useEffect(() => {
        if (id) {
            loadReviews();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadProduct = async () => {
        try {
            const response = await productsAPI.getProduct(id!);
            setProduct(response.data);

            // Load related products from same category
            if (response.data.category) {
                loadRelatedProducts(response.data.category, id!);
            }
        } catch {
            setError(t('productDetail.loadError'));
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
        } catch (err: unknown) {
            setReviewsError(getErrorMessage(err, t('productDetail.loadReviewsError')));
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
                setReviewActionSuccess(t('productDetail.reviewUpdated'));
            } else {
                await productsAPI.createProductReview(id, {
                    rating: reviewRating,
                    comment: reviewComment
                });
                setReviewActionSuccess(t('productDetail.reviewSubmitted'));
            }

            await refreshProduct();
            await loadReviews();
        } catch (err: unknown) {
            setReviewActionError(getErrorMessage(err, t('productDetail.submitReviewError')));
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!id) return;
        if (!window.confirm(t('productDetail.deleteConfirm'))) return;

        setReviewSubmitting(true);
        setReviewActionError('');
        setReviewActionSuccess('');

        try {
            await productsAPI.deleteMyProductReview(id);
            setReviewActionSuccess(t('productDetail.reviewDeleted'));
            await refreshProduct();
            await loadReviews();
        } catch (err: unknown) {
            setReviewActionError(getErrorMessage(err, t('productDetail.deleteReviewError')));
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
        } catch {
            // Error handling is done in CartContext
        } finally {
            setAdding(false);
        }
    };

    const formatPrice = (p: Product) => {
        return formatMoney(p.price, 'USD');
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
    if (!product) return <Container className="py-5"><ErrorMessage message={t('productDetail.productNotFound')} /></Container>;

    const title = getLocalizedText(product.titleI18n, i18n.language) || product.title || '';
    const description = getLocalizedText(product.descriptionI18n, i18n.language) || product.description || '';
    const categoryLabel = getCategoryLabel(product.category, t, i18n);

    return (
        <Container className="py-4 py-lg-5 product-detail-page">
            <Breadcrumb className="mb-2 small">
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>{t('nav.home')}</Breadcrumb.Item>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/products' }}>{t('nav.products')}</Breadcrumb.Item>
                <Breadcrumb.Item active>{title}</Breadcrumb.Item>
            </Breadcrumb>

            <Button
                variant="link"
                size="sm"
                className="mb-4 p-0 text-decoration-none product-back-link"
                onClick={() => navigate('/products')}
            >
                <FaArrowLeft className="me-1" />
                {t('productDetail.backToProducts')}
            </Button>

            <Row className="g-4">
                <Col md={6} lg={5}>
                    <div className="position-sticky product-image-panel" style={{ top: '94px' }}>
                        <img
                            src={
                                resolveAssetUrl(product.coverImage?.url) ||
                                resolveAssetUrl(product.images?.[0]) ||
                                'https://placehold.co/400x600?text=No+Cover'
                            }
                            alt={title}
                            className="img-fluid rounded-4 product-detail-image"
                        />
                    </div>
                </Col>

                <Col md={6} lg={7}>
                    <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
                        <Badge bg="light" text="dark" className="border fw-semibold">{categoryLabel}</Badge>
                        {product.featured && <Badge bg="warning" text="dark" className="fw-semibold">{t('productDetail.featured')}</Badge>}
                    </div>

                    <h1 className="mb-1 product-detail-title">{title}</h1>
                    <p className="text-muted mb-3">{t('productDetail.by', { author: product.author })}</p>

                    <div className="mb-3 d-flex align-items-center">
                        <div className="me-2">
                            {renderStars(product.rating)}
                        </div>
                        <small className="text-muted">
                            {t('productDetail.ratingSummary', { rating: product.rating.toFixed(1), count: product.numReviews })}
                        </small>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-3 py-3 px-3 rounded-4 product-price-strip">
                        <div>
                            <h3 className="text-primary mb-0 fw-bold">{formatPrice(product)}</h3>
                        </div>
                        <div>
                            {product.stock > 0 ? (
                                <Badge bg="success" className="py-2 px-3 fw-semibold">
                                    {t('productDetail.inStock', { count: product.stock })}
                                </Badge>
                            ) : (
                                <Badge bg="danger" className="py-2 px-3 fw-semibold">{t('productDetail.outOfStock')}</Badge>
                            )}
                        </div>
                    </div>

                    {product.stock > 0 && (
                        <div className="mb-3">
                            <Button
                                variant={inCart ? "secondary" : "primary"}
                                className="w-100 rounded-3 fw-semibold py-2"
                                onClick={handleAddToCart}
                                disabled={adding || inCart}
                            >
                                <FaShoppingCart className="me-2" />
                                {inCart ? t('productDetail.inCart') : adding ? t('productDetail.adding') : t('productDetail.addToCart')}
                            </Button>
                        </div>
                    )}

                    <Tabs defaultActiveKey="description" className="mb-3 detail-tabs">
                        <Tab eventKey="description" title={t('productDetail.descriptionTab')}>
                            <div className="py-3 px-1">
                                {description ? (
                                    <p className="mb-0">{description}</p>
                                ) : (
                                    <p className="text-muted mb-0">{t('productDetail.noDescription')}</p>
                                )}
                            </div>
                        </Tab>

                        <Tab eventKey="details" title={t('productDetail.detailsTab')}>
                            <div className="py-3 px-1">
                                <dl className="row mb-0 small">
                                    {product.isbn && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaBarcode className="me-1" />
                                                {t('productDetail.details.isbn')}
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.isbn}</dd>
                                        </>
                                    )}

                                    <dt className="col-sm-4 text-muted mb-1">{t('productDetail.details.author')}</dt>
                                    <dd className="col-sm-8 mb-1">{product.author}</dd>

                                    {product.publisher && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaBuilding className="me-1" />
                                                {t('productDetail.details.publisher')}
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.publisher}</dd>
                                        </>
                                    )}

                                    {product.publicationYear && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaCalendar className="me-1" />
                                                {t('productDetail.details.publicationYear')}
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.publicationYear}</dd>
                                        </>
                                    )}

                                    {product.pageCount && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaBook className="me-1" />
                                                {t('productDetail.details.pages')}
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.pageCount}</dd>
                                        </>
                                    )}

                                    {product.language && (
                                        <>
                                            <dt className="col-sm-4 text-muted mb-1">
                                                <FaLanguage className="me-1" />
                                                {t('productDetail.details.language')}
                                            </dt>
                                            <dd className="col-sm-8 mb-1">{product.language}</dd>
                                        </>
                                    )}

                                    <dt className="col-sm-4 text-muted mb-1">{t('productDetail.details.category')}</dt>
                                    <dd className="col-sm-8 mb-1">
                                        <Badge bg="secondary">{categoryLabel}</Badge>
                                    </dd>
                                </dl>
                            </div>
                        </Tab>

                        <Tab eventKey="reviews" title={t('productDetail.reviewsTab')}>
                            <div className="py-3 px-1">
                                <div className="text-center py-2 surface-card">
                                    <h6 className="mb-2">{t('productDetail.customerReviews')}</h6>
                                    <div className="mb-1">{renderStars(product.rating)}</div>
                                    <p className="text-muted small mb-0">
                                        {t('productDetail.outOfFive', { rating: product.rating.toFixed(1), count: product.numReviews })}
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
                                    <div className="mb-3 mt-3 surface-card p-3 p-lg-4">
                                        <h6 className="mb-2">{myReview ? t('productDetail.editYourReview') : t('productDetail.writeReview')}</h6>
                                        <Form onSubmit={handleSubmitReview}>
                                            <Row className="g-2 align-items-end">
                                                <Col xs={12}>
                                                    <Form.Group controlId="reviewRating">
                                                        <Form.Label className="small text-muted">{t('productDetail.ratingLabel')}</Form.Label>
                                                        <div
                                                            className="review-star-picker"
                                                            onMouseLeave={() => setHoverRating(0)}
                                                            role="radiogroup"
                                                            aria-label={t('productDetail.ratingLabel')}
                                                        >
                                                            {[1, 2, 3, 4, 5].map((val) => {
                                                                const active = val <= (hoverRating || reviewRating);
                                                                return (
                                                                    <button
                                                                        key={val}
                                                                        type="button"
                                                                        className={`review-star-btn ${active ? 'active' : ''}`}
                                                                        onMouseEnter={() => setHoverRating(val)}
                                                                        onFocus={() => setHoverRating(val)}
                                                                        onClick={() => {
                                                                            setReviewRating(val);
                                                                            setHoverRating(0);
                                                                        }}
                                                                        aria-label={`${val} / 5`}
                                                                        aria-checked={reviewRating === val}
                                                                        role="radio"
                                                                        disabled={reviewSubmitting}
                                                                    >
                                                                        <FaStar />
                                                                    </button>
                                                                );
                                                            })}
                                                            <span className="review-star-value ms-2">{reviewRating}/5</span>
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={12}>
                                                    <Form.Group controlId="reviewComment">
                                                        <Form.Label className="small text-muted">{t('productDetail.commentOptional')}</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={2}
                                                            value={reviewComment}
                                                            onChange={(e) => setReviewComment(e.target.value)}
                                                            disabled={reviewSubmitting}
                                                            placeholder={t('productDetail.commentPlaceholder')}
                                                            className="focus-ring"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="d-flex gap-2 mt-2">
                                                <Button type="submit" variant="primary" disabled={reviewSubmitting}>
                                                    {reviewSubmitting ? t('productDetail.reviewSaving') : myReview ? t('productDetail.updateReview') : t('productDetail.submitReview')}
                                                </Button>

                                                {myReview && (
                                                    <Button
                                                        type="button"
                                                        variant="outline-danger"
                                                        disabled={reviewSubmitting}
                                                        onClick={handleDeleteReview}
                                                    >
                                                        {t('productDetail.delete')}
                                                    </Button>
                                                )}
                                            </div>

                                            <p className="text-muted small mt-2 mb-0">
                                                {t('productDetail.reviewNote')}
                                            </p>
                                        </Form>
                                    </div>
                                ) : (
                                    <Alert variant="info" className="py-2 mt-3">
                                        <Link to="/login">{t('nav.login')}</Link> {t('productDetail.loginToWriteReviewSuffix')}
                                    </Alert>
                                )}

                                <hr className="my-3" />

                                <h6 className="mb-2">{t('productDetail.allReviews')}</h6>
                                {reviewsLoading ? (
                                    <div className="text-center py-3">
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        <span className="text-muted small">{t('productDetail.loadingReviews')}</span>
                                    </div>
                                ) : reviewsError ? (
                                    <ErrorMessage message={reviewsError} />
                                ) : reviews.length === 0 ? (
                                    <p className="text-muted small mb-0">{t('productDetail.noReviews')}</p>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {reviews.map((review) => {
                                            const reviewerName =
                                                typeof review.userId === 'string'
                                                    ? t('productDetail.reviewerCustomer')
                                                    : `${review.userId.firstName} ${review.userId.lastName}`;
                                            const isMine = user ? getReviewUserId(review) === user._id : false;

                                            return (
                                                <div key={review._id} className="border rounded-3 p-3 bg-white">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <div className="fw-semibold small">
                                                                {reviewerName} {isMine ? t('productDetail.you') : ''}
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

            {relatedProducts.length > 0 && (
                <div className="mt-5">
                    <h4 className="section-title mb-3">{t('productDetail.relatedTitle', { category: categoryLabel })}</h4>
                    <Row className="g-4">
                        {relatedProducts.map((relatedProduct) => (
                            <Col key={relatedProduct._id} xs={12} sm={6} md={4} lg={3}>
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
