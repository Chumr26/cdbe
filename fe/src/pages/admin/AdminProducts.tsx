import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Pagination, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import axios from 'axios';
import { productsAPI } from '../../api/products.api';
import type { Product } from '../../api/products.api';
import { categoriesAPI } from '../../api/categories.api';
import type { Category } from '../../api/categories.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../utils/currency';
import { getLocalizedText } from '../../utils/i18n';
import { getCategoryLabel } from '../../utils/categoryLabel';
import { resolveAssetUrl } from '../../utils/image';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const AdminProducts: React.FC = () => {
    const { t, i18n } = useTranslation();
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
        titleI18n: {
            en: '',
            vi: ''
        },
        author: '',
        category: '',
        price: '',
        stock: '',
        descriptionI18n: {
            en: '',
            vi: ''
        },
        isbn: '',
        featured: false
    });
    const [modalError, setModalError] = useState('');
    const [saving, setSaving] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

    // Delete Modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const response = await productsAPI.getProducts({ page, limit: 10, sort: 'createdAt', order: 'desc' });
            setProducts(response.data);
            setTotalPages(response.pages);
            setTotalItems(response.total);
            setCurrentPage(response.page);
        } catch {
            setError(t('admin.products.loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await categoriesAPI.getCategories();
            setCategories(response.data);
        } catch {
            console.error('Failed to load categories');
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts, fetchCategories]);

    useEffect(() => {
        if (!coverImageFile) {
            setCoverPreviewUrl(null);
            return;
        }

        const previewUrl = URL.createObjectURL(coverImageFile);
        setCoverPreviewUrl(previewUrl);

        return () => {
            URL.revokeObjectURL(previewUrl);
        };
    }, [coverImageFile]);

    const handlePageChange = (page: number) => {
        fetchProducts(page);
    };

    const handleShowModal = (product: Product | null = null) => {
        setEditingProduct(product);
        if (product) {
            setModalData({
                titleI18n: {
                    en: product.titleI18n?.en || product.title || '',
                    vi: product.titleI18n?.vi || product.title || ''
                },
                author: product.author,
                category: product.category,
                price: product.price.toString(),
                stock: product.stock.toString(),
                descriptionI18n: {
                    en: product.descriptionI18n?.en || product.description || '',
                    vi: product.descriptionI18n?.vi || product.description || ''
                },
                isbn: product.isbn || '',
                featured: product.featured
            });
        } else {
            // New product defaults
            setModalData({
                titleI18n: {
                    en: '',
                    vi: ''
                },
                author: '',
                category: categories.length > 0 ? categories[0].name : '', // Default to first category if available
                price: '',
                stock: '',
                descriptionI18n: {
                    en: '',
                    vi: ''
                },
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
        if (target.name.includes('.')) {
            const [parentKey, childKey] = target.name.split('.') as ['titleI18n' | 'descriptionI18n', 'en' | 'vi'];
            setModalData((prev) => ({
                ...prev,
                [parentKey]: {
                    ...prev[parentKey],
                    [childKey]: value
                }
            }));
            return;
        }

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
            formData.append('titleI18n.en', modalData.titleI18n.en);
            formData.append('titleI18n.vi', modalData.titleI18n.vi);
            formData.append('author', modalData.author);
            formData.append('category', modalData.category);
            formData.append('price', modalData.price);
            formData.append('stock', modalData.stock);
            formData.append('descriptionI18n.en', modalData.descriptionI18n.en);
            formData.append('descriptionI18n.vi', modalData.descriptionI18n.vi);
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
        } catch (err: unknown) {
            setModalError(getErrorMessage(err, t('admin.products.saveError')));
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
        } catch {
            setError(t('admin.products.deleteError'));
        }
    };

    const displayPrice = (p: Product) => formatMoney(p.price, 'USD');

    if (loading && !products.length) return <LoadingSpinner fullPage />;

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>{t('admin.products.title')}</h2>
                <Button variant="primary" onClick={() => handleShowModal()}>
                    <FaPlus className="me-2" /> {t('admin.products.addNew')}
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>{t('admin.products.table.title')}</th>
                                <th>{t('admin.products.table.author')}</th>
                                <th>{t('admin.products.table.category')}</th>
                                <th>{t('admin.products.table.price')}</th>
                                <th>{t('admin.products.table.stock')}</th>
                                <th>{t('admin.products.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map(product => (
                                    <tr key={product._id}>
                                        <td>{getLocalizedText(product.titleI18n, i18n.language) || product.title || ''}</td>
                                        <td>{product.author}</td>
                                        <td>
                                            <span className="badge bg-info text-dark">
                                                {getCategoryLabel(product.category, t, i18n)}
                                            </span>
                                        </td>
                                        <td>{displayPrice(product)}</td>
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
                                    <td colSpan={6} className="text-center py-4">{t('admin.products.table.empty')}</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                    <div>{t('admin.products.pagination', { shown: products.length, total: totalItems })}</div>
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
            <Modal show={showModal} onHide={handleCloseModal} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>{editingProduct ? t('admin.products.modal.editTitle') : t('admin.products.modal.createTitle')}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveProduct}>
                    <Modal.Body>
                        {modalError && <Alert variant="danger">{modalError}</Alert>}
                        <Row className="g-4">
                            <Col md={4}>
                                <div className="border rounded bg-light d-flex align-items-center justify-content-center p-3" style={{ minHeight: '360px' }}>
                                    <img
                                        src={
                                            coverPreviewUrl ||
                                            resolveAssetUrl(editingProduct?.coverImage?.url) ||
                                            resolveAssetUrl(editingProduct?.images?.[0]) ||
                                            'https://via.placeholder.com/300x400?text=No+Cover'
                                        }
                                        alt={modalData.titleI18n.en || modalData.titleI18n.vi || 'Cover'}
                                        className="img-fluid rounded"
                                        style={{ maxHeight: '360px', objectFit: 'contain' }}
                                    />
                                </div>
                                <Form.Group className="mt-3">
                                    <Form.Label>{t('admin.products.modal.coverImage')}</Form.Label>
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
                                        {t('admin.products.modal.coverHint')}
                                    </Form.Text>
                                </Form.Group>
                                <Form.Group className="mt-3">
                                    <Form.Label>{t('admin.products.modal.coverUrl')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        readOnly
                                        value={
                                            coverPreviewUrl ||
                                            resolveAssetUrl(editingProduct?.coverImage?.url) ||
                                            resolveAssetUrl(editingProduct?.images?.[0]) ||
                                            ''
                                        }
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.titleEn')}</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="titleI18n.en"
                                                value={modalData.titleI18n.en}
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.titleVi')}</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="titleI18n.vi"
                                                value={modalData.titleI18n.vi}
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.author')}</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="author"
                                                value={modalData.author}
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.isbn')}</Form.Label>
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
                                            <Form.Label>{t('admin.products.modal.category')}</Form.Label>
                                            <Form.Select
                                                name="category"
                                                value={modalData.category}
                                                onChange={handleModalChange}
                                            >
                                                <option value="">{t('admin.products.modal.selectCategory')}</option>
                                                {categories.map(cat => (
                                                    <option key={cat._id} value={cat.name}>
                                                        {getCategoryLabel(cat.name, t, i18n)}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.price')}</Form.Label>
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
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.stock')}</Form.Label>
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
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.descriptionEn')}</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={10}
                                                name="descriptionI18n.en"
                                                value={modalData.descriptionI18n.en}
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('admin.products.modal.descriptionVi')}</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={10}
                                                name="descriptionI18n.vi"
                                                value={modalData.descriptionI18n.vi}
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        label={t('admin.products.modal.featured')}
                                        name="featured"
                                        checked={modalData.featured}
                                        onChange={handleModalChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            {t('admin.products.modal.cancel')}
                        </Button>
                        <Button variant="primary" type="submit" disabled={saving}>
                            {saving ? t('admin.products.modal.saving') : t('admin.products.modal.save')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('admin.products.delete.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('admin.products.delete.body', { title: productToDelete ? getLocalizedText(productToDelete.titleI18n, i18n.language) : '' })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        {t('admin.products.delete.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteProduct}>
                        {t('admin.products.delete.confirm')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminProducts;
