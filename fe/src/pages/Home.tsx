import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productsAPI } from '../api/products.api';
import type { Product } from '../api/products.api';
import ProductCard from '../components/products/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { cartAPI } from '../api/cart.api';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        loadFeaturedProducts();
    }, []);

    const loadFeaturedProducts = async () => {
        try {
            const response = await productsAPI.getFeaturedProducts();
            setFeaturedProducts(response.data);
        } catch (err: any) {
            setError('Failed to load featured products');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (productId: string) => {
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        try {
            await cartAPI.addToCart(productId, 1);
            alert('Product added to cart!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to add to cart');
        }
    };

    return (
        <>
            {/* Hero Section */}
            <div className="bg-primary text-white py-5">
                <Container>
                    <Row className="align-items-center">
                        <Col lg={6}>
                            <h1 className="display-4 fw-bold mb-3">Welcome to Bookstore</h1>
                            <p className="lead mb-4">
                                Discover your next favorite book from our extensive collection of titles across all genres.
                            </p>
                            <Link to="/products">
                                <Button variant="light" size="lg">Browse Books</Button>
                            </Link>
                        </Col>
                        <Col lg={6} className="d-none d-lg-block">
                            <img
                                src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=400&fit=crop"
                                alt="Books"
                                className="img-fluid rounded shadow"
                            />
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Featured Products Section */}
            <Container className="py-5">
                <h2 className="text-center mb-4">Featured Books</h2>
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <ErrorMessage message={error} />
                ) : (
                    <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                        {featuredProducts.map((product) => (
                            <Col key={product._id}>
                                <ProductCard product={product} onAddToCart={handleAddToCart} />
                            </Col>
                        ))}
                    </Row>
                )}
                {!loading && !error && featuredProducts.length === 0 && (
                    <p className="text-center text-muted">No featured products available.</p>
                )}
            </Container>

            {/* Categories Section */}
            <div className="bg-light py-5">
                <Container>
                    <h2 className="text-center mb-4">Browse by Category</h2>
                    <Row xs={2} md={3} lg={6} className="g-3">
                        {['Fiction', 'Non-Fiction', 'Science', 'Technology', 'Self-Help', 'History'].map((category) => (
                            <Col key={category}>
                                <Link to={`/products?category=${category}`} className="text-decoration-none">
                                    <div className="bg-white p-4 rounded text-center shadow-sm hover-shadow transition">
                                        <h5 className="mb-0">{category}</h5>
                                    </div>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>

            {/* Call to Action */}
            <Container className="py-5 text-center">
                <h2 className="mb-3">Start Your Reading Journey Today</h2>
                <p className="lead text-muted mb-4">
                    Join thousands of book lovers and discover your next great read.
                </p>
                {!isAuthenticated && (
                    <Link to="/register">
                        <Button variant="primary" size="lg">Sign Up Now</Button>
                    </Link>
                )}
            </Container>
        </>
    );
};

export default Home;
