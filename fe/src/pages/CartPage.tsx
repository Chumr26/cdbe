import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { cartAPI } from '../api/cart.api';
import type { Cart } from '../api/cart.api';
import { couponsAPI } from '../api/coupons.api';
import type { AvailableCoupon } from '../api/coupons.api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatMoney } from '../utils/currency';
import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '../utils/i18n';
import { resolveAssetUrl } from '../utils/image';

const CartPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
    const navigate = useNavigate();

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (axios.isAxiosError(err)) {
            const message = (err.response?.data as { message?: string } | undefined)?.message;
            return message || err.message || fallback;
        }
        if (err instanceof Error) return err.message;
        return fallback;
    };

    const loadCart = useCallback(async () => {
        try {
            const response = await cartAPI.getCart();
            setCart(response.data);
            setCouponCode(response.data.coupon?.code || '');

            setLoadingCoupons(true);
            try {
                const couponsResp = await couponsAPI.getAvailableCoupons();
                setAvailableCoupons(couponsResp.data || []);
            } catch {
                setAvailableCoupons([]);
            } finally {
                setLoadingCoupons(false);
            }
        } catch {
            setError(t('cart.loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    const applyCoupon = async () => {
        if (!couponCode.trim()) return;
        setApplyingCoupon(true);
        setCouponError('');

        try {
            const response = await cartAPI.applyCoupon(couponCode.trim());
            setCart(response.data);
            setCouponCode(response.data.coupon?.code || couponCode.trim().toUpperCase());
        } catch (err: unknown) {
            setCouponError(getErrorMessage(err, t('cart.applyCouponError')));
        } finally {
            setApplyingCoupon(false);
        }
    };

    const removeCoupon = async () => {
        setApplyingCoupon(true);
        setCouponError('');

        try {
            const response = await cartAPI.removeCoupon();
            setCart(response.data);
            setCouponCode('');
        } catch (err: unknown) {
            setCouponError(getErrorMessage(err, t('cart.removeCouponError')));
        } finally {
            setApplyingCoupon(false);
        }
    };

    const updateQuantity = async (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        try {
            const response = await cartAPI.updateCartItem(productId, newQuantity);
            setCart(response.data);
        } catch (err: unknown) {
            alert(getErrorMessage(err, t('cart.updateQuantityError')));
        }
    };

    const handleRemoveClick = (productId: string, productTitle: string) => {
        setItemToDelete({ id: productId, title: productTitle });
        setShowDeleteModal(true);
    };

    const confirmRemoveItem = async () => {
        if (!itemToDelete) return;

        try {
            const response = await cartAPI.removeFromCart(itemToDelete.id);
            setCart(response.data);
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err: unknown) {
            alert(getErrorMessage(err, t('cart.removeItemError')));
        }
    };

    const handleClearClick = () => {
        setShowClearModal(true);
    };

    const confirmClearCart = async () => {
        try {
            await cartAPI.clearCart();
            setCart(null);
            setShowClearModal(false);
        } catch (err: unknown) {
            alert(getErrorMessage(err, t('cart.clearCartError')));
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <Container className="py-5"><ErrorMessage message={error} /></Container>;

    const isEmpty = !cart || cart.items.length === 0;
    const subtotal = cart?.subtotal ?? cart?.total ?? 0;
    const discountTotal = cart?.discountTotal ?? 0;
    const total = cart?.total ?? 0;

    return (
        <Container className="py-5">
            <h1 className="mb-4">{t('cart.title')}</h1>

            {isEmpty ? (
                <Card className="text-center py-5">
                    <Card.Body>
                        <h3>{t('cart.emptyTitle')}</h3>
                        <p className="text-muted">{t('cart.emptySubtitle')}</p>
                        <Link to="/products">
                            <Button variant="primary">{t('cart.browseProducts')}</Button>
                        </Link>
                    </Card.Body>
                </Card>
            ) : (
                <Row>
                    <Col lg={8}>
                        <Card className="mb-4">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5>{t('cart.itemsTitle', { count: cart.items.length })}</h5>
                                    <Button variant="outline-danger" size="sm" onClick={handleClearClick}>
                                        {t('cart.clearCart')}
                                    </Button>
                                </div>

                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>{t('cart.table.product')}</th>
                                            <th>{t('cart.table.price')}</th>
                                            <th>{t('cart.table.quantity')}</th>
                                            <th>{t('cart.table.total')}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.items.map((item) => {
                                            const itemTitle = getLocalizedText(item.productId.titleI18n, i18n.language) || item.productId.title || '';

                                            return (
                                            <tr key={item.productId._id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <img
                                                            src={
                                                                resolveAssetUrl(item.productId.coverImage?.url) ||
                                                                resolveAssetUrl(item.productId.images?.[0]) ||
                                                                'https://via.placeholder.com/60x80?text=No+Cover'
                                                            }
                                                            alt={itemTitle}
                                                            style={{ width: '60px', height: '80px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                                                            className="me-3 rounded"
                                                        />
                                                        <div>
                                                            <Link to={`/products/${item.productId._id}`} className="text-decoration-none">
                                                                <strong>{itemTitle}</strong>
                                                            </Link>
                                                            <br />
                                                            <small className="text-muted">{t('productCard.by', { author: item.productId.author })}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="align-middle">{formatMoney(item.price, 'VND')}</td>
                                                <td className="align-middle">
                                                    <div className="d-flex align-items-center">
                                                        <Button
                                                            className="d-flex align-items-center justify-content-center p-2"
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() => updateQuantity(item.productId._id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <FaMinus />
                                                        </Button>
                                                        <span className="mx-3">{item.quantity}</span>
                                                        <Button
                                                            className="d-flex align-items-center justify-content-center p-2"
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() => updateQuantity(item.productId._id, item.quantity + 1)}
                                                            disabled={item.quantity >= item.productId.stock}
                                                        >
                                                            <FaPlus />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="align-middle">
                                                    <strong>{formatMoney(item.price * item.quantity, 'VND')}</strong>
                                                </td>
                                                <td className="align-middle">
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleRemoveClick(item.productId._id, itemTitle)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                        })}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4}>
                        <Card>
                            <Card.Body>
                                <h5 className="mb-3">{t('cart.orderSummary')}</h5>

                                <div className="mb-3">
                                    <Form.Label className="mb-2">{t('cart.coupon')}</Form.Label>
                                    <div className="d-flex flex-column gap-2">
                                        <Form.Select
                                            value={couponCode}
                                            disabled={applyingCoupon || loadingCoupons || availableCoupons.length === 0}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                        >
                                            <option value="">{loadingCoupons ? t('cart.loadingCoupons') : t('cart.selectCoupon')}</option>
                                            {availableCoupons.map((c) => (
                                                <option key={c._id} value={c.code}>
                                                    {c.code}
                                                    {c.type === 'percent'
                                                        ? t('cart.couponOffPercent', { value: c.value })
                                                        : t('cart.couponOffFixed', { amount: formatMoney(c.value, 'VND') })}
                                                </option>
                                            ))}
                                        </Form.Select>

                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="text"
                                                placeholder={availableCoupons.length > 0 ? t('cart.enterCodeWithCoupons') : t('cart.enterCode')}
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                disabled={applyingCoupon}
                                            />
                                            {cart?.coupon?.code ? (
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={removeCoupon}
                                                    disabled={applyingCoupon}
                                                >
                                                    {t('cart.remove')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline-primary"
                                                    onClick={applyCoupon}
                                                    disabled={applyingCoupon || !couponCode.trim()}
                                                >
                                                    {t('cart.apply')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {couponError && (
                                        <div className="text-danger mt-2" style={{ fontSize: '0.9rem' }}>
                                            {couponError}
                                        </div>
                                    )}
                                    {cart?.coupon?.code && !couponError && (
                                        <div className="text-success mt-2" style={{ fontSize: '0.9rem' }}>
                                            {t('cart.applied')} <strong>{cart.coupon.code}</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span>{t('cart.subtotal')}</span>
                                    <strong>{formatMoney(subtotal, 'VND')}</strong>
                                </div>
                                {discountTotal > 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>{t('cart.discount')}</span>
                                        <strong className="text-success">-{formatMoney(discountTotal, 'VND')}</strong>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between mb-2">
                                    <span>{t('cart.shipping')}</span>
                                    <span className="text-success">{t('cart.free')}</span>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between mb-3">
                                    <strong>{t('cart.table.total')}:</strong>
                                    <strong className="text-primary">{formatMoney(total, 'VND')}</strong>
                                </div>
                                <Button
                                    variant="primary"
                                    className="w-100"
                                    onClick={() => navigate('/checkout')}
                                >
                                    {t('cart.proceed')}
                                </Button>
                                <Link to="/products">
                                    <Button variant="outline-secondary" className="w-100 mt-2">
                                        {t('cart.continueShopping')}
                                    </Button>
                                </Link>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Delete Item Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center">
                        <FaExclamationTriangle className="text-warning me-2" />
                        {t('cart.confirmRemoveTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>{t('cart.confirmRemoveBody', { title: itemToDelete?.title ? `"${itemToDelete.title}"` : '' })}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        {t('cart.cancel')}
                    </Button>
                    <Button variant="danger" onClick={confirmRemoveItem}>
                        {t('cart.remove')}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Clear Cart Modal */}
            <Modal show={showClearModal} onHide={() => setShowClearModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center">
                        <FaExclamationTriangle className="text-warning me-2" />
                        {t('cart.confirmClearTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>{t('cart.confirmClearBody')}</p>
                    <p className="text-muted mb-0">{t('cart.cannotUndo')}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowClearModal(false)}>
                        {t('cart.cancel')}
                    </Button>
                    <Button variant="danger" onClick={confirmClearCart}>
                        {t('cart.clearCart')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CartPage;
