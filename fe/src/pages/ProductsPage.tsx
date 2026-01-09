import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Pagination } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { productsAPI } from '../api/products.api';
import type { Product, ProductFilters } from '../api/products.api';
import { categoriesAPI } from '../api/categories.api';
import type { Category } from '../api/categories.api';
import ProductCard from '../components/products/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { cartAPI } from '../api/cart.api';
import { useAuth } from '../context/AuthContext';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const ProductsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const { isAuthenticated } = useAuth();

    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        limit: 12,
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        minPrice: undefined,
        maxPrice: undefined,
        sort: 'createdAt',
        order: 'desc',
    });

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        loadProducts();
    }, [filters]);

    const loadCategories = async () => {
        try {
            const response = await categoriesAPI.getCategories();
            setCategories(response.data);
        } catch {
            console.error('Failed to load categories');
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await productsAPI.getProducts(filters);
            setProducts(response.data);
            setTotalPages(response.pages);
            setCurrentPage(response.page);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load products'));
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handlePageChange = (page: number) => {
        setFilters({ ...filters, page });
        window.scrollTo(0, 0);
    };

    const handleAddToCart = async (productId: string) => {
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        try {
            await cartAPI.addToCart(productId, 1);
            alert('Product added to cart!');
        } catch (err: unknown) {
            alert(getErrorMessage(err, 'Failed to add to cart'));
        }
    };

    return (
        <Container className="py-4">
            <h1 className="mb-4">Browse Books</h1>

            <Row>
                {/* Filters Sidebar */}
                <Col md={3} className="mb-4">
                    <div className="bg-light p-3 rounded">
                        <h5 className="mb-3">Filters</h5>

                        {/* Search */}
                        <Form.Group className="mb-3">
                            <Form.Label>Search</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search books..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </Form.Group>

                        {/* Category */}
                        <Form.Group className="mb-3">
                            <Form.Label>Category</Form.Label>
                            <Form.Select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        {/* Price Range */}
                        <Form.Group className="mb-3">
                            <Form.Label>Min Price</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="Min"
                                value={filters.minPrice || ''}
                                onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Max Price</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="Max"
                                value={filters.maxPrice || ''}
                                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </Form.Group>

                        {/* Sort */}
                        <Form.Group className="mb-3">
                            <Form.Label>Sort By</Form.Label>
                            <Form.Select
                                value={filters.sort}
                                onChange={(e) => handleFilterChange('sort', e.target.value)}
                            >
                                <option value="createdAt">Newest</option>
                                <option value="price">Price</option>
                                <option value="rating">Rating</option>
                                <option value="title">Title</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Order</Form.Label>
                            <Form.Select
                                value={filters.order}
                                onChange={(e) => handleFilterChange('order', e.target.value as 'asc' | 'desc')}
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </Form.Select>
                        </Form.Group>

                        <Button variant="secondary" className="w-100" onClick={() => setFilters({
                            page: 1,
                            limit: 12,
                            search: '',
                            category: '',
                            sort: 'createdAt',
                            order: 'desc',
                        })}>
                            Clear Filters
                        </Button>
                    </div>
                </Col>

                {/* Products Grid */}
                <Col md={9}>
                    {loading ? (
                        <LoadingSpinner />
                    ) : error ? (
                        <ErrorMessage message={error} />
                    ) : (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <p className="text-muted mb-0">
                                    Showing {products.length} products
                                </p>
                            </div>

                            <Row xs={1} sm={2} lg={3} className="g-4">
                                {products.map((product) => (
                                    <Col key={product._id}>
                                        <ProductCard product={product} onAddToCart={handleAddToCart} />
                                    </Col>
                                ))}
                            </Row>

                            {products.length === 0 && (
                                <div className="text-center py-5">
                                    <p className="text-muted">No products found. Try adjusting your filters.</p>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center mt-4">
                                    <Pagination>
                                        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                                        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />

                                        {[...Array(totalPages)].map((_, idx) => (
                                            <Pagination.Item
                                                key={idx + 1}
                                                active={idx + 1 === currentPage}
                                                onClick={() => handlePageChange(idx + 1)}
                                            >
                                                {idx + 1}
                                            </Pagination.Item>
                                        ))}

                                        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                                        <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default ProductsPage;
