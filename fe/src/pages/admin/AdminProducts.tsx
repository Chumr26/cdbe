import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { productsAPI } from '../../api/products.api';
import type { Product } from '../../api/products.api';
import { categoriesAPI } from '../../api/categories.api';
import type { Category } from '../../api/categories.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminProducts: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [modalData, setModalData] = useState({
        title: '',
        author: '',
        category: '',
        price: '',
        stock: '',
        description: '',
        isbn: '',
        featured: false
    });
    const [modalError, setModalError] = useState('');
    const [saving, setSaving] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

    // Delete Modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const fetchProducts = async (page = 1) => {
        setLoading(true);
        try {
            const response = await productsAPI.getProducts({ page, limit: 10, sort: 'createdAt', order: 'desc' });
            setProducts(response.data);
            setTotalPages(response.pages);
            setTotalItems(response.total);
            setCurrentPage(response.page);
        } catch (err) {
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getCategories();
            setCategories(response.data);
        } catch (err) {
            console.error('Failed to load categories');
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const handlePageChange = (page: number) => {
        fetchProducts(page);
    };

    const handleShowModal = (product: Product | null = null) => {
        setEditingProduct(product);
        if (product) {
            setModalData({
                title: product.title,
                author: product.author,
                category: product.category,
                price: product.price.toString(),
                stock: product.stock.toString(),
                description: product.description || '',
                isbn: product.isbn || '',
                featured: product.featured
            });
        } else {
            // New product defaults
            setModalData({
                title: '',
                author: '',
                category: categories.length > 0 ? categories[0].name : '', // Default to first category if available
                price: '',
                stock: '',
                description: '',
                isbn: '',
                featured: false
            });
        }
        setModalError('');
        setCoverImageFile(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProduct(null);
    };

    const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement; // Type assertion to access checked property safely
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setModalData({
            ...modalData,
            [target.name]: value
        });
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setModalError('');

        try {
            // Use FormData for file upload
            const formData = new FormData();
            formData.append('title', modalData.title);
            formData.append('author', modalData.author);
            formData.append('category', modalData.category);
            formData.append('price', modalData.price);
            formData.append('stock', modalData.stock);
            formData.append('description', modalData.description);
            formData.append('isbn', modalData.isbn);
            formData.append('featured', modalData.featured.toString());

            if (coverImageFile) {
                formData.append('coverImage', coverImageFile);
            }

            if (editingProduct) {
                await productsAPI.updateProduct(editingProduct._id, formData);
            } else {
                await productsAPI.createProduct(formData);
            }

            fetchProducts(currentPage);
            handleCloseModal();
        } catch (err: any) {
            setModalError(err.response?.data?.message || err.message || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const handleShowDelete = (product: Product) => {
        setProductToDelete(product);
        setShowDeleteModal(true);
    };

    const handleDeleteProduct = async () => {
        if (!productToDelete) return;

        try {
            await productsAPI.deleteProduct(productToDelete._id);
            // Refresh list
            fetchProducts(currentPage);
            setShowDeleteModal(false);
            setProductToDelete(null);
        } catch (err) {
            setError('Failed to delete product');
        }
    };

    if (loading && !products.length) return <LoadingSpinner fullPage />;

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Product Management</h2>
                <Button variant="primary" onClick={() => handleShowModal()}>
                    <FaPlus className="me-2" /> Add New Product
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Title</th>
                                <th>Author</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map(product => (
                                    <tr key={product._id}>
                                        <td>{product.title}</td>
                                        <td>{product.author}</td>
                                        <td><span className="badge bg-info text-dark">{product.category}</span></td>
                                        <td>${product.price.toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${product.stock > 10 ? 'bg-success' : product.stock > 0 ? 'bg-warning' : 'bg-danger'}`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowModal(product)}>
                                                <FaEdit />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleShowDelete(product)}>
                                                <FaTrash />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-4">No products found</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                    <div>Showing {products.length} of {totalItems} products</div>
                    {totalPages > 1 && (
                        <Pagination className="mb-0">
                            <Pagination.Prev
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            />
                            {[...Array(totalPages)].map((_, i) => (
                                <Pagination.Item
                                    key={i + 1}
                                    active={i + 1 === currentPage}
                                    onClick={() => handlePageChange(i + 1)}
                                >
                                    {i + 1}
                                </Pagination.Item>
                            ))}
                            <Pagination.Next
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            />
                        </Pagination>
                    )}
                </Card.Footer>
            </Card>

            {/* Create/Edit Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingProduct ? 'Edit Product' : 'Add New Product'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveProduct}>
                    <Modal.Body>
                        {modalError && <Alert variant="danger">{modalError}</Alert>}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Title</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="title"
                                        value={modalData.title}
                                        onChange={handleModalChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Author</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="author"
                                        value={modalData.author}
                                        onChange={handleModalChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category</Form.Label>
                                    <Form.Select
                                        name="category"
                                        value={modalData.category}
                                        onChange={handleModalChange}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat._id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>ISBN</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="isbn"
                                        value={modalData.isbn}
                                        onChange={handleModalChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Price</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={modalData.price}
                                        onChange={handleModalChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Stock</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="stock"
                                        value={modalData.stock}
                                        onChange={handleModalChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="description"
                                value={modalData.description}
                                onChange={handleModalChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Featured Product"
                                name="featured"
                                checked={modalData.featured}
                                onChange={handleModalChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Cover Image</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const files = e.target.files;
                                    if (files && files[0]) {
                                        setCoverImageFile(files[0]);
                                    }
                                }}
                            />
                            <Form.Text className="text-muted">
                                Upload a custom cover image, or leave empty to fetch from API using ISBN
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Product'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete the product <strong>{productToDelete?.title}</strong>? This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteProduct}>
                        Delete Product
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminProducts;
