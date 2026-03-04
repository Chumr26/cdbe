import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    FaArrowRight,
    FaBookOpen,
    FaCreditCard,
    FaGift,
    FaLock,
    FaQuoteLeft,
    FaRocket,
    FaSearch,
    FaShippingFast,
    FaShoppingBag,
    FaStar,
    FaUsers,
} from 'react-icons/fa';
import { productsAPI } from '../api/products.api';
import type { Product } from '../api/products.api';
import ProductCard from '../components/products/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated } = useAuth();

    const stats = [
        { value: '50k+', labelKey: 'titles' },
        { value: '120k+', labelKey: 'readers' },
        { value: '4.8/5', labelKey: 'rating' },
        { value: '24/7', labelKey: 'support' },
    ];

    const valueProps = [
        { titleKey: 'curated.title', descriptionKey: 'curated.description', icon: FaBookOpen },
        { titleKey: 'fastDelivery.title', descriptionKey: 'fastDelivery.description', icon: FaShippingFast },
        { titleKey: 'securePayment.title', descriptionKey: 'securePayment.description', icon: FaLock },
    ];

    const howItWorks = [
        { titleKey: 'discover.title', descriptionKey: 'discover.description', icon: FaSearch },
        { titleKey: 'choose.title', descriptionKey: 'choose.description', icon: FaShoppingBag },
        { titleKey: 'checkout.title', descriptionKey: 'checkout.description', icon: FaCreditCard },
    ];

    const testimonials = [
        { quoteKey: 'quote1', authorKey: 'author1' },
        { quoteKey: 'quote2', authorKey: 'author2' },
        { quoteKey: 'quote3', authorKey: 'author3' },
    ];

    const illustrationItems = [
        { icon: FaBookOpen, label: 'Fiction' },
        { icon: FaGift, label: 'Gift Picks' },
        { icon: FaStar, label: 'Bestsellers' },
        { icon: FaShippingFast, label: 'Quick Delivery' },
    ];

    const illustrationTickerItems = [...illustrationItems, ...illustrationItems, ...illustrationItems];


    useEffect(() => {
        loadFeaturedProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.language]);

    const loadFeaturedProducts = async () => {
        try {
            const response = await productsAPI.getFeaturedProducts();
            setFeaturedProducts(response.data);
        } catch {
            setError(t('home.featuredLoadError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <section className="hero-section py-5">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={6}>
                            <span className="hero-eyebrow">Curated for readers</span>
                            <h1 className="display-5 fw-bold mb-3 mt-2">{t('home.heroTitle')}</h1>
                            <p className="hero-subtitle mb-4">{t('home.heroSubtitle')}</p>
                            <div className="d-flex align-items-center gap-3 flex-wrap">
                                <Link to="/products">
                                    <Button variant="primary" size="lg" className="rounded-3 px-4 fw-semibold">
                                        {t('home.browseBooks')}
                                    </Button>
                                </Link>
                                <span className="hero-meta">50k+ titles • Daily updates</span>
                            </div>
                        </Col>
                        <Col lg={6} className="d-none d-lg-block">
                            <div className="hero-visual-wrap">
                                <span className="hero-glow hero-glow-1" />
                                <span className="hero-glow hero-glow-2" />
                                <img
                                    src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=400&fit=crop"
                                    alt="Books"
                                    className="img-fluid rounded-4 shadow hero-image"
                                />
                                <div className="hero-floating-chip chip-1">
                                    <FaStar />
                                    <span>4.8 Reader rating</span>
                                </div>
                                <div className="hero-floating-chip chip-2">
                                    <FaUsers />
                                    <span>120k+ readers</span>
                                </div>
                                <div className="hero-floating-chip chip-3">
                                    <FaRocket />
                                    <span>Fast shipping</span>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            <section className="py-4 home-illustration-band">
                <div className="home-illustration-marquee" aria-hidden="true">
                    <div className="home-illustration-content">
                        <div className="home-illustration-track">
                            {illustrationTickerItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div className="home-illustration-item" key={`a-${item.label}-${index}`}>
                                        <Icon />
                                        <span>{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="home-illustration-track">
                            {illustrationTickerItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div className="home-illustration-item" key={`b-${item.label}-${index}`}>
                                        <Icon />
                                        <span>{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-4 border-bottom bg-white home-stats-section">
                <Container>
                    <Row xs={2} md={4} className="g-3">
                        {stats.map((item, index) => (
                            <Col key={item.labelKey}>
                                <div
                                    className="surface-card p-3 p-md-4 text-center home-stat-card h-100 motion-rise"
                                    style={{ animationDelay: `${index * 120}ms` }}
                                >
                                    <p className="home-stat-value mb-1">{item.value}</p>
                                    <p className="text-muted mb-0">{t(`home.stats.${item.labelKey}`)}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            <Container className="py-5 home-featured-section">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                    <h2 className="section-title mb-0">{t('home.featuredTitle')}</h2>
                    <Link to="/products" className="featured-link">
                        {t('home.browseBooks')} <FaArrowRight size={12} />
                    </Link>
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <ErrorMessage message={error} />
                ) : (
                    <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                        {featuredProducts.map((product) => (
                            <Col key={product._id}>
                                <ProductCard product={product} />
                            </Col>
                        ))}
                    </Row>
                )}
                {!loading && !error && featuredProducts.length === 0 && (
                    <p className="text-center text-muted">{t('home.featuredEmpty')}</p>
                )}
            </Container>

            <section className="py-5 bg-white border-top border-bottom home-categories-section">
                <Container>
                    <h2 className="section-title text-center">{t('home.browseByCategory')}</h2>
                    <Row xs={2} md={3} lg={6} className="g-3">
                        {[
                            { slug: 'Fiction', labelKey: 'fiction' },
                            { slug: 'Non-Fiction', labelKey: 'nonFiction' },
                            { slug: 'Science', labelKey: 'science' },
                            { slug: 'Technology', labelKey: 'technology' },
                            { slug: 'Self-Help', labelKey: 'selfHelp' },
                            { slug: 'History', labelKey: 'history' },
                        ].map((category) => (
                            <Col key={category.slug}>
                                <Link to={`/products?category=${category.slug}`}>
                                    <div className="surface-card p-3 text-center category-tile hover-shadow">
                                        <h6 className="mb-0 fw-semibold">{t(`home.categories.${category.labelKey}`)}</h6>
                                    </div>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            <section className="py-5">
                <Container>
                    <div className="text-center mb-4">
                        <h2 className="section-title mb-2">{t('home.valueSectionTitle')}</h2>
                        <p className="section-subtitle">{t('home.valueSectionSubtitle')}</p>
                    </div>
                    <Row xs={1} md={3} className="g-4">
                        {valueProps.map((item, index) => {
                            const Icon = item.icon;
                            return (
                            <Col key={item.titleKey}>
                                <div
                                    className="surface-card p-4 h-100 home-feature-card motion-rise"
                                    style={{ animationDelay: `${index * 140}ms` }}
                                >
                                    <span className="home-card-icon">
                                        <Icon />
                                    </span>
                                    <h5 className="fw-bold mb-2">{t(`home.valueProps.${item.titleKey}`)}</h5>
                                    <p className="text-muted mb-0">{t(`home.valueProps.${item.descriptionKey}`)}</p>
                                </div>
                            </Col>
                            );
                        })}
                    </Row>
                </Container>
            </section>

            <section className="py-5 bg-white border-top border-bottom home-steps-section">
                <Container>
                    <div className="text-center mb-4">
                        <h2 className="section-title mb-2">{t('home.howItWorksTitle')}</h2>
                        <p className="section-subtitle">{t('home.howItWorksSubtitle')}</p>
                    </div>
                    <Row xs={1} md={3} className="g-4">
                        {howItWorks.map((item, index) => (
                            <Col key={item.titleKey}>
                                <div
                                    className="surface-card p-4 h-100 home-step-card motion-rise"
                                    style={{ animationDelay: `${index * 140}ms` }}
                                >
                                    <span className="home-card-icon home-card-icon--step">
                                        <item.icon />
                                    </span>
                                    <h5 className="fw-bold mb-2">{t(`home.howItWorks.${item.titleKey}`)}</h5>
                                    <p className="text-muted mb-0">{t(`home.howItWorks.${item.descriptionKey}`)}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            <section className="py-5 home-testimonials-section">
                <Container>
                    <div className="text-center mb-4">
                        <h2 className="section-title mb-2">{t('home.testimonialsTitle')}</h2>
                        <p className="section-subtitle">{t('home.testimonialsSubtitle')}</p>
                    </div>
                    <Row xs={1} md={3} className="g-4">
                        {testimonials.map((item, index) => (
                            <Col key={item.quoteKey}>
                                <div
                                    className="surface-card p-4 h-100 home-testimonial-card motion-rise"
                                    style={{ animationDelay: `${index * 140}ms` }}
                                >
                                    <span className="home-quote-icon"><FaQuoteLeft /></span>
                                    <p className="mb-3 home-testimonial-quote">“{t(`home.testimonials.${item.quoteKey}`)}”</p>
                                    <p className="mb-0 fw-semibold text-secondary">{t(`home.testimonials.${item.authorKey}`)}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            <Container className="py-5 text-center home-cta-wrap">
                <div className="surface-card p-4 p-md-5 cta-panel">
                    <h2 className="mb-3 fw-bold">{t('home.ctaTitle')}</h2>
                    <p className="lead text-muted mb-4">{t('home.ctaSubtitle')}</p>
                    {!isAuthenticated && (
                        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-3">
                            <Link to="/register">
                                <Button variant="primary" size="lg" className="rounded-3 px-4 fw-semibold">{t('home.signUpNow')}</Button>
                            </Link>
                            <Link to="/products">
                                <Button variant="outline-primary" size="lg" className="rounded-3 px-4 fw-semibold">{t('home.exploreCatalog')}</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </Container>
        </>
    );
};

export default Home;
