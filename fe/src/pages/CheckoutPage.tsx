import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { ordersAPI } from '../api/orders.api';
import type { ShippingAddress } from '../api/orders.api';
import { cartAPI } from '../api/cart.api';
import type { Cart } from '../api/cart.api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatMoney } from '../utils/currency';
import { useCart } from '../context/CartContext';
import { authAPI } from '../api/auth.api';
import { useTranslation } from 'react-i18next';

const CheckoutPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshCart } = useCart();
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');

    type PaymentMethod = 'cod' | 'payos';
    type UserAddress = {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
        isDefault?: boolean;
    };
    type UserProfile = {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        addresses?: UserAddress[];
    };
    type ApiErrorResponse = {
        message?: unknown;
    };

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

    const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
        firstName: '',
        lastName: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
        phoneNumber: '',
    });

    type FieldErrors = Partial<Record<keyof ShippingAddress, string>>;
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const validateShippingAddress = useCallback((addr: ShippingAddress): FieldErrors => {
        const errors: FieldErrors = {};
        const labels: Record<keyof ShippingAddress, string> = {
            firstName: t('checkout.firstName'),
            lastName: t('checkout.lastName'),
            street: t('checkout.street'),
            city: t('checkout.city'),
            state: t('checkout.state'),
            zipCode: t('checkout.zip'),
            country: t('checkout.country'),
            phoneNumber: t('checkout.phone'),
        };
        const requiredFields: Array<keyof ShippingAddress> = [
            'firstName',
            'lastName',
            'street',
            'city',
            'state',
            'zipCode',
            'country',
            'phoneNumber',
        ];

        for (const field of requiredFields) {
            if (!String(addr[field] ?? '').trim()) {
                errors[field] = t('validation.fieldRequired', { field: labels[field] });
            }
        }

        const phoneDigits = String(addr.phoneNumber ?? '').replace(/\D/g, '');
        if (phoneDigits && phoneDigits.length < 8) {
            errors.phoneNumber = t('validation.phoneMinDigits', { min: 8 });
        }

        const zip = String(addr.zipCode ?? '').trim();
        if (zip && zip.length < 3) {
            errors.zipCode = t('validation.zipMinChars', { min: 3 });
        }

        return errors;
    }, [t]);

    const applyBackendShippingErrorToField = useCallback((message: string): boolean => {
        // Backend sends: "Shipping address <field> is required" or "Shipping address <field> is invalid"
        const match = message.match(/^Shipping address ([a-zA-Z]+) (is required|is invalid)$/);
        if (!match) return false;

        const field = match[1] as keyof ShippingAddress;
        if (!(field in shippingAddress)) return false;

        const labels: Record<keyof ShippingAddress, string> = {
            firstName: t('checkout.firstName'),
            lastName: t('checkout.lastName'),
            street: t('checkout.street'),
            city: t('checkout.city'),
            state: t('checkout.state'),
            zipCode: t('checkout.zip'),
            country: t('checkout.country'),
            phoneNumber: t('checkout.phone'),
        };

        const humanMessage = (() => {
            if (match[2] === 'is required') return t('validation.fieldRequired', { field: labels[field] });
            return t('validation.invalidValue');
        })();

        setFieldErrors((prev) => ({
            ...prev,
            [field]: humanMessage,
        }));

        return true;
    }, [shippingAddress, t]);

    const loadUserProfile = useCallback(async () => {
        try {
            const response = await authAPI.getProfile();
            const user = response.data as UserProfile;

            // Start with personal info
            let newAddress: ShippingAddress = {
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'USA',
                phoneNumber: user.phoneNumber || '',
            };

            // Check for default address
            if (user.addresses && user.addresses.length > 0) {
                const defaultAddr = user.addresses.find((addr) => addr.isDefault);
                const addrToUse = defaultAddr || user.addresses[0];

                if (addrToUse) {
                    newAddress = {
                        ...newAddress,
                        street: addrToUse.street || '',
                        city: addrToUse.city || '',
                        state: addrToUse.state || '',
                        zipCode: addrToUse.zipCode || '',
                        country: addrToUse.country || 'USA',
                        // Keep user's phone/name if not in address object, or override if address object has them
                        // Mongoose schema for address doesn't usually have phone/name inside the array item unless specified
                    };
                }
            }

            setShippingAddress(newAddress);
        } catch (error) {
            console.error('Failed to load user profile for checkout autofill', error);
        }
    }, []);

    const loadCart = useCallback(async () => {
        try {
            const response = await cartAPI.getCart();
            if (!response.data || response.data.items.length === 0) {
                navigate('/cart');
                return;
            }
            setCart(response.data);
        } catch {
            setError(t('cart.loadError'));
        } finally {
            setLoading(false);
        }
    }, [navigate, t]);

    useEffect(() => {
        void loadCart();
        void loadUserProfile();
    }, [loadCart, loadUserProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setShippingAddress((prev) => ({
            ...prev,
            [name]: value,
        }));

        setFieldErrors((prev) => {
            if (!prev[name as keyof ShippingAddress]) return prev;
            const next = { ...prev };
            delete next[name as keyof ShippingAddress];
            return next;
        });
    };

    const handleClose = () => {
        setShowModal(false);
        navigate('/orders');
    };

    const getApiErrorMessage = (err: unknown): string | null => {
        if (!axios.isAxiosError(err)) return null;
        const data = err.response?.data as ApiErrorResponse | undefined;
        if (typeof data?.message === 'string') return data.message;
        if (typeof err.message === 'string' && err.message.length > 0) return err.message;
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const errors = validateShippingAddress(shippingAddress);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);

            const firstError = Object.values(errors).find((msg) => typeof msg === 'string' && msg.length > 0);
            setError(firstError || t('validation.correctHighlighted'));
            return;
        }

        setSubmitting(true);

        try {
            const response = await ordersAPI.createOrder(shippingAddress, paymentMethod);
            await refreshCart();
            const createdOrder = response.data;
            setOrderNumber(createdOrder.orderNumber);

            if (paymentMethod === 'payos') {
                try {
                    const paymentRes = await api.post('/payment/create-payment-link', {
                        orderId: createdOrder._id
                    });
                    if (paymentRes.data.checkoutUrl) {
                        window.location.href = paymentRes.data.checkoutUrl;
                        return; // Prevent modal showing
                    }
                } catch (payError: unknown) {
                    console.error('Payment creation failed', payError);
                    setError(t('checkout.paymentInitFailed'));
                    // Still show modal as order exists? Or navigate to order details?
                    // Let's show modal but with warning? defaulting to modal execution below
                }
            }

            setShowModal(true);
        } catch (err: unknown) {
            const apiMessage = getApiErrorMessage(err);
            if (apiMessage) {
                // Try to map backend validation to a field highlight.
                const mapped = applyBackendShippingErrorToField(apiMessage);
                if (mapped) {
                    setError(t('validation.correctHighlighted'));
                    return;
                }
                setError(apiMessage);
            }
            setError(apiMessage || t('checkout.errors.failedToPlaceOrder'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!cart) return null;

    const subtotal = cart.subtotal ?? cart.total;
    const discountTotal = cart.discountTotal ?? 0;
    const total = cart.total;

    return (
        <Container className="py-5">
            <h1 className="mb-4">{t('checkout.title')}</h1>
            {error && <ErrorMessage message={error} />}

            <Row>
                <Col lg={8}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5 className="mb-3">{t('checkout.paymentMethod')}</h5>
                            <Form.Group className="mb-4">
                                <div className="d-flex gap-3">
                                    <Form.Check
                                        type="radio"
                                        id="cod"
                                        label={t('checkout.cod')}
                                        name="paymentMethod"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="payos"
                                        label={t('checkout.payos')}
                                        name="paymentMethod"
                                        value="payos"
                                        checked={paymentMethod === 'payos'}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    />
                                </div>
                            </Form.Group>
                            <h5 className="mb-3">{t('checkout.shippingAddress')}</h5>
                            <Form noValidate onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.firstName')} *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="firstName"
                                                value={shippingAddress.firstName}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.firstName}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.firstName}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.lastName')} *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="lastName"
                                                value={shippingAddress.lastName}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.lastName}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.lastName}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3">
                                    <Form.Label>{t('checkout.street')} *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="street"
                                        value={shippingAddress.street}
                                        onChange={handleChange}
                                        isInvalid={!!fieldErrors.street}
                                        required
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {fieldErrors.street}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.city')} *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="city"
                                                value={shippingAddress.city}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.city}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.city}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.state')} *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="state"
                                                value={shippingAddress.state}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.state}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.state}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.zip')} *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="zipCode"
                                                value={shippingAddress.zipCode}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.zipCode}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.zipCode}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.country')} *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="country"
                                                value={shippingAddress.country}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.country}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.country}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>{t('checkout.phone')} *</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phoneNumber"
                                                value={shippingAddress.phoneNumber}
                                                onChange={handleChange}
                                                isInvalid={!!fieldErrors.phoneNumber}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldErrors.phoneNumber}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Button type="submit" variant="primary" size="lg" className="w-100" disabled={submitting}>
                                    {submitting ? t('checkout.placing') : t('checkout.place')}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5 className="mb-3">{t('checkout.orderSummary')}</h5>
                            <div className="d-flex justify-content-between mb-2">
                                <span>{t('checkout.subtotal')}</span>
                                <strong>{formatMoney(subtotal, 'VND')}</strong>
                            </div>
                            {discountTotal > 0 && (
                                <div className="d-flex justify-content-between mb-2">
                                    <span>{t('checkout.discount', { code: cart.coupon?.code ? ` (${cart.coupon.code})` : '' })}</span>
                                    <strong className="text-success">-{formatMoney(discountTotal, 'VND')}</strong>
                                </div>
                            )}
                            <div className="d-flex justify-content-between mb-2">
                                <span>{t('checkout.shipping')}</span>
                                <span className="text-success">{t('checkout.free')}</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between">
                                <strong>{t('checkout.total')}</strong>
                                <strong className="text-primary">{formatMoney(total, 'VND')}</strong>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{t('checkout.orderConfirmed')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center py-3">
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                        <h4 className="mt-3">{t('checkout.thankYou')}</h4>
                        <p className="text-muted">
                            {t('checkout.orderPlaced')}
                            <br />
                            {t('checkout.orderNumber')} <strong>{orderNumber}</strong>
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleClose}>
                        {t('checkout.viewOrders')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CheckoutPage;
