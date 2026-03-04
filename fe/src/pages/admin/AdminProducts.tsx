import React, { useState, useEffect, useCallback } from 'react';
import {
    Row,
    Col,
    Table,
    Button,
    Modal,
    Form,
    Alert,
} from 'react-bootstrap';
import { FaTrash, FaPlus } from 'react-icons/fa';
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
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminDataSection from '../../components/admin/AdminDataSection';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminToolbar from '../../components/admin/AdminToolbar';

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
            vi: '',
        },
        author: '',
        category: '',
        price: '',
        stock: '',
        descriptionI18n: {
            en: '',
            vi: '',
        },
        isbn: '',
        featured: false,
    });
    const [initialModalData, setInitialModalData] = useState(modalData);
    const [modalError, setModalError] = useState('');
    const [saving, setSaving] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
    const [coverImageChanged, setCoverImageChanged] = useState(false);

    // Delete Modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const fetchProducts = useCallback(
        async (page = 1) => {
            setLoading(true);
            try {
                const response = await productsAPI.getProducts({
                    page,
                    limit: 20,
                    sort: 'createdAt',
                    order: 'desc',
                });
                setProducts(response.data);
                setTotalPages(response.pages);
                setTotalItems(response.total);
                setCurrentPage(response.page);
                setSelectedProductIds([]);
            } catch {
                setError(t('admin.products.loadError'));
            } finally {
                setLoading(false);
            }
        },
        [t],
    );

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

    const buildModalData = (product: Product | null) => {
        if (product) {
            return {
                titleI18n: {
                    en: product.titleI18n?.en || product.title || '',
                    vi: product.titleI18n?.vi || product.title || '',
                },
                author: product.author,
                category: product.category,
                price: product.price.toString(),
                stock: product.stock.toString(),
                descriptionI18n: {
                    en:
                        product.descriptionI18n?.en ||
                        product.description ||
                        '',
                    vi:
                        product.descriptionI18n?.vi ||
                        product.description ||
                        '',
                },
                isbn: product.isbn || '',
                featured: product.featured,
            };
        }

        return {
            titleI18n: {
                en: '',
                vi: '',
            },
            author: '',
            category: categories.length > 0 ? categories[0].name : '',
            price: '',
            stock: '',
            descriptionI18n: {
                en: '',
                vi: '',
            },
            isbn: '',
            featured: false,
        };
    };

    const handleShowModal = (product: Product | null = null) => {
        setEditingProduct(product);
        const nextModalData = buildModalData(product);
        setModalData(nextModalData);
        setInitialModalData(nextModalData);
        setModalError('');
        setCoverImageFile(null);
        setCoverPreviewUrl(null);
        setCoverImageChanged(false);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setModalData(initialModalData);
        setCoverImageFile(null);
        setCoverPreviewUrl(null);
        setCoverImageChanged(false);
        setModalError('');
        setShowModal(false);
        setEditingProduct(null);
    };

    const handleResetModal = () => {
        setModalData(initialModalData);
        setCoverImageFile(null);
        setCoverPreviewUrl(null);
        setCoverImageChanged(false);
        setModalError('');
    };

    const handleModalChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const target = e.target as HTMLInputElement; // Type assertion to access checked property safely
        const value =
            target.type === 'checkbox' ? target.checked : target.value;
        if (target.name.includes('.')) {
            const [parentKey, childKey] = target.name.split('.') as [
                'titleI18n' | 'descriptionI18n',
                'en' | 'vi',
            ];
            setModalData((prev) => ({
                ...prev,
                [parentKey]: {
                    ...prev[parentKey],
                    [childKey]: value,
                },
            }));
            return;
        }

        setModalData({
            ...modalData,
            [target.name]: value,
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

            const response = editingProduct
                ? await productsAPI.updateProduct(editingProduct._id, formData)
                : await productsAPI.createProduct(formData);

            const savedProduct = response.data;

            setEditingProduct(savedProduct);
            const nextModalData = buildModalData(savedProduct);
            setModalData(nextModalData);
            setInitialModalData(nextModalData);
            setCoverImageFile(null);
            setCoverPreviewUrl(null);
            setCoverImageChanged(false);

            fetchProducts(currentPage);
        } catch (err: unknown) {
            setModalError(getErrorMessage(err, t('admin.products.saveError')));
        } finally {
            setSaving(false);
        }
    };

    const handleShowDeleteSelected = () => {
        if (!selectedProductIds.length) return;
        setShowDeleteModal(true);
    };

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId],
        );
    };

    const toggleSelectAllVisible = () => {
        const visibleIds = products.map((product) => product._id);
        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedProductIds.includes(id));

        setSelectedProductIds((prev) => {
            if (allSelected) {
                return prev.filter((id) => !visibleIds.includes(id));
            }
            const next = new Set([...prev, ...visibleIds]);
            return Array.from(next);
        });
    };

    const handleDeleteProduct = async () => {
        if (!selectedProductIds.length) return;

        try {
            await Promise.all(
                selectedProductIds.map((productId) =>
                    productsAPI.deleteProduct(productId),
                ),
            );

            fetchProducts(currentPage);
            setShowDeleteModal(false);
            setSelectedProductIds([]);
        } catch {
            setError(t('admin.products.deleteError'));
        }
    };

    const displayPrice = (p: Product) => formatMoney(p.price, 'USD');
    const isModalDirty =
        coverImageChanged ||
        JSON.stringify(modalData) !== JSON.stringify(initialModalData);
    const allVisibleSelected =
        products.length > 0 &&
        products.every((product) => selectedProductIds.includes(product._id));
    const coverUrl =
        coverPreviewUrl ||
        resolveAssetUrl(editingProduct?.coverImage?.url) ||
        resolveAssetUrl(editingProduct?.images?.[0]) ||
        'https://placehold.co/300x400?text=No+Cover';

    if (loading && !products.length) return <LoadingSpinner fullPage />;

    return (
        <div className="admin-page">
            <AdminPageHeader title={t('admin.products.title')} />

            <AdminToolbar
                left={
                    selectedProductIds.length > 0 ? (
                        <Button
                            variant="outline-danger"
                            className="rounded-3 fw-semibold"
                            onClick={handleShowDeleteSelected}
                        >
                            <FaTrash className="me-2" />
                            {t('admin.products.delete.selected', {
                                count: selectedProductIds.length,
                            })}
                        </Button>
                    ) : null
                }
                right={
                    <Button variant="primary" className="rounded-3 fw-semibold" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> {t('admin.products.addNew')}
                    </Button>
                }
            />

            {error && <Alert variant="danger">{error}</Alert>}

            <AdminDataSection
                desktop={
                    <Table responsive hover className="align-middle mb-0 admin-table">
                        <thead>
                            <tr>
                                <th className="admin-table__checkbox-cell">
                                    <Form.Check
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label={t('admin.products.table.selectAll')}
                                    />
                                </th>
                                <th>{t('admin.products.table.title')}</th>
                                <th>{t('admin.products.table.author')}</th>
                                <th>{t('admin.products.table.category')}</th>
                                <th>{t('admin.products.table.price')}</th>
                                <th>{t('admin.products.table.stock')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map((product) => (
                                    <tr
                                        key={product._id}
                                        className={`admin-table__row--selectable ${selectedProductIds.includes(product._id) ? 'admin-table__row--selected' : ''}`}
                                        onClick={() => handleShowModal(product)}
                                    >
                                        <td
                                            className="admin-table__checkbox-cell"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedProductIds.includes(product._id)}
                                                onChange={() => toggleProductSelection(product._id)}
                                                aria-label={t('admin.products.table.selectProduct')}
                                            />
                                        </td>
                                        <td>
                                            {getLocalizedText(product.titleI18n, i18n.language) || product.title || ''}
                                        </td>
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
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-4">
                                        {t('admin.products.table.empty')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                }
                mobile={
                    products.length > 0 ? (
                        products.map((product) => (
                            <div
                                key={product._id}
                                className={`admin-mobile-card admin-mobile-card--selectable ${selectedProductIds.includes(product._id) ? 'admin-mobile-card--selected' : ''}`}
                                onClick={() => handleShowModal(product)}
                            >
                                <div
                                    className="admin-mobile-card__row"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <span className="admin-mobile-card__label">{t('admin.products.table.select')}</span>
                                    <span className="admin-mobile-card__value">
                                        <Form.Check
                                            type="checkbox"
                                            checked={selectedProductIds.includes(product._id)}
                                            onChange={() => toggleProductSelection(product._id)}
                                            aria-label={t('admin.products.table.selectProduct')}
                                        />
                                    </span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.products.table.title')}</span>
                                    <span className="admin-mobile-card__value">
                                        {getLocalizedText(product.titleI18n, i18n.language) || product.title || ''}
                                    </span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.products.table.author')}</span>
                                    <span className="admin-mobile-card__value">{product.author}</span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.products.table.category')}</span>
                                    <span className="admin-mobile-card__value">{getCategoryLabel(product.category, t, i18n)}</span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.products.table.price')}</span>
                                    <span className="admin-mobile-card__value">{displayPrice(product)}</span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.products.table.stock')}</span>
                                    <span className="admin-mobile-card__value">
                                        <span className={`badge ${product.stock > 10 ? 'bg-success' : product.stock > 0 ? 'bg-warning' : 'bg-danger'}`}>
                                            {product.stock}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4">{t('admin.products.table.empty')}</div>
                    )
                }
                footer={
                    <>
                        <div>
                            {t('admin.products.pagination', {
                                shown: products.length,
                                total: totalItems,
                            })}
                        </div>
                        <AdminPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                }
            />

            {/* Create/Edit Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="xl" centered dialogClassName="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingProduct
                            ? t('admin.products.modal.editTitle')
                            : t('admin.products.modal.createTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveProduct}>
                    <Modal.Body>
                        {modalError && (
                            <Alert variant="danger">{modalError}</Alert>
                        )}
                        <Row className="g-4">
                            <Col md={4}>
                                <div
                                    className="border rounded bg-light d-flex align-items-center justify-content-center p-3"
                                    style={{ minHeight: '360px' }}
                                >
                                    <img
                                        src={coverUrl}
                                        alt={
                                            modalData.titleI18n.en ||
                                            modalData.titleI18n.vi ||
                                            'Cover'
                                        }
                                        className="img-fluid rounded"
                                        style={{
                                            maxHeight: '360px',
                                            objectFit: 'contain',
                                        }}
                                    />
                                </div>
                                <Form.Group className="mt-3">
                                    <Form.Label>
                                        {t('admin.products.modal.coverImage')}
                                    </Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        disabled={saving}
                                        className="focus-ring"
                                        onChange={(
                                            e: React.ChangeEvent<HTMLInputElement>,
                                        ) => {
                                            const file = e.target.files?.[0] ?? null;
                                            setCoverImageFile(file);
                                            setCoverImageChanged(Boolean(file));
                                        }}
                                    />
                                    <Form.Text className="text-muted">
                                        {t('admin.products.modal.coverHint')}
                                    </Form.Text>
                                </Form.Group>
                                <Form.Group className="mt-3">
                                    <Form.Label>
                                        {t('admin.products.modal.coverUrl')}
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        disabled
                                        readOnly
                                        value={coverUrl}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.titleEn',
                                                )}
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="titleI18n.en"
                                                value={modalData.titleI18n.en}
                                                onChange={handleModalChange}
                                                className="focus-ring"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.titleVi',
                                                )}
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="titleI18n.vi"
                                                value={modalData.titleI18n.vi}
                                                onChange={handleModalChange}
                                                className="focus-ring"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.author',
                                                )}
                                            </Form.Label>
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
                                            <Form.Label>
                                                {t('admin.products.modal.isbn')}
                                            </Form.Label>
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
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.category',
                                                )}
                                            </Form.Label>
                                            <Form.Select
                                                name="category"
                                                value={modalData.category}
                                                onChange={handleModalChange}
                                            >
                                                <option value="">
                                                    {t(
                                                        'admin.products.modal.selectCategory',
                                                    )}
                                                </option>
                                                {categories.map((cat) => (
                                                    <option
                                                        key={cat._id}
                                                        value={cat.name}
                                                    >
                                                        {getCategoryLabel(
                                                            cat.name,
                                                            t,
                                                            i18n,
                                                        )}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.price',
                                                )}
                                            </Form.Label>
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
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.stock',
                                                )}
                                            </Form.Label>
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
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.descriptionEn',
                                                )}
                                            </Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={10}
                                                name="descriptionI18n.en"
                                                value={
                                                    modalData.descriptionI18n.en
                                                }
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                {t(
                                                    'admin.products.modal.descriptionVi',
                                                )}
                                            </Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={10}
                                                name="descriptionI18n.vi"
                                                value={
                                                    modalData.descriptionI18n.vi
                                                }
                                                onChange={handleModalChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        label={t(
                                            'admin.products.modal.featured',
                                        )}
                                        name="featured"
                                        checked={modalData.featured}
                                        onChange={handleModalChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={handleResetModal}
                            disabled={saving || !isModalDirty}
                        >
                            {t('admin.products.modal.cancel')}
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={saving || !isModalDirty}
                        >
                            {saving
                                ? t('admin.products.modal.saving')
                                : t('admin.products.modal.save')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                dialogClassName="admin-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {t('admin.products.delete.title')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('admin.products.delete.bodySelected', {
                        count: selectedProductIds.length,
                    })}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        {t('admin.products.delete.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteProduct}>
                        {t('admin.products.delete.confirmSelected')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AdminProducts;
