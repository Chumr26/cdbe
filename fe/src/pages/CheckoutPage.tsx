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
import { useCart } from '../context/CartContext';
import { authAPI } from '../api/auth.api';

const CheckoutPage: React.FC = () => {
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
            setError('Failed to load cart');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        void loadCart();
        void loadUserProfile();
    }, [loadCart, loadUserProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setShippingAddress({
            ...shippingAddress,
            [e.target.name]: e.target.value,
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
        setSubmitting(true);
        setError('');

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
                    setError('Order created but payment initialization failed. Please try paying from Order Details.');
                    // Still show modal as order exists? Or navigate to order details?
                    // Let's show modal but with warning? defaulting to modal execution below
                }
            }

            setShowModal(true);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err) || 'Failed to place order');
        } finally {
            setSubmitting(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!cart) return null;

    const subtotal = cart.subtotal ?? cart.total;
    const discountTotal = cart.discountTotal ?? 0;
    const total = cart.total;

    return (
        <Container className="py-5">
            <h1 className="mb-4">Checkout</h1>
            {error && <ErrorMessage message={error} />}

            <Row>
                <Col lg={8}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5 className="mb-3">Payment Method</h5>
                            <Form.Group className="mb-4">
                                <div className="d-flex gap-3">
                                    <Form.Check
                                        type="radio"
                                        id="cod"
                                        label="Cash on Delivery (COD)"
                                        name="paymentMethod"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="payos"
                                        label="Pay with PayOS"
                                        name="paymentMethod"
                                        value="payos"
                                        checked={paymentMethod === 'payos'}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    />
                                </div>
                            </Form.Group>
                            <h5 className="mb-3">Shipping Address</h5>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>First Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="firstName"
                                                value={shippingAddress.firstName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Last Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="lastName"
                                                value={shippingAddress.lastName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3">
                                    <Form.Label>Street Address *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="street"
                                        value={shippingAddress.street}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>City *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="city"
                                                value={shippingAddress.city}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>State *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="state"
                                                value={shippingAddress.state}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Zip Code *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="zipCode"
                                                value={shippingAddress.zipCode}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Country *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="country"
                                                value={shippingAddress.country}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone Number *</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phoneNumber"
                                                value={shippingAddress.phoneNumber}
                                                onChange={handleChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Button type="submit" variant="primary" size="lg" className="w-100" disabled={submitting}>
                                    {submitting ? 'Placing Order...' : 'Place Order'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5 className="mb-3">Order Summary</h5>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Subtotal:</span>
                                <strong>{formatPrice(subtotal)}</strong>
                            </div>
                            {discountTotal > 0 && (
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Discount{cart.coupon?.code ? ` (${cart.coupon.code})` : ''}:</span>
                                    <strong className="text-success">-{formatPrice(discountTotal)}</strong>
                                </div>
                            )}
                            <div className="d-flex justify-content-between mb-2">
                                <span>Shipping:</span>
                                <span className="text-success">FREE</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between">
                                <strong>Total:</strong>
                                <strong className="text-primary">{formatPrice(total)}</strong>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Order Confirmed!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center py-3">
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                        <h4 className="mt-3">Thank you for your order!</h4>
                        <p className="text-muted">
                            Your order has been placed successfully.
                            <br />
                            Order Number: <strong>{orderNumber}</strong>
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleClose}>
                        View My Orders
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CheckoutPage;
