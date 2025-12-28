import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/orders.api';
import type { ShippingAddress } from '../api/orders.api';
import { cartAPI } from '../api/cart.api';
import type { Cart } from '../api/cart.api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useCart } from '../context/CartContext';

const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { refreshCart } = useCart();
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');

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

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            const response = await cartAPI.getCart();
            if (!response.data || response.data.items.length === 0) {
                navigate('/cart');
                return;
            }
            setCart(response.data);
        } catch (err: any) {
            setError('Failed to load cart');
        } finally {
            setLoading(false);
        }
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const response = await ordersAPI.createOrder(shippingAddress);
            await refreshCart();
            setOrderNumber(response.data.orderNumber);
            setShowModal(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to place order');
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

    return (
        <Container className="py-5">
            <h1 className="mb-4">Checkout</h1>
            {error && <ErrorMessage message={error} />}

            <Row>
                <Col lg={8}>
                    <Card className="mb-4">
                        <Card.Body>
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
                    <Card>
                        <Card.Body>
                            <h5 className="mb-3">Order Summary</h5>
                            {cart.items.map((item) => (
                                <div key={item.productId._id} className="d-flex justify-content-between mb-2">
                                    <span>
                                        {item.productId.title} x {item.quantity}
                                    </span>
                                    <span>{formatPrice(item.price * item.quantity)}</span>
                                </div>
                            ))}
                            <hr />
                            <div className="d-flex justify-content-between mb-2">
                                <span>Subtotal:</span>
                                <strong>{formatPrice(cart.total)}</strong>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Shipping:</span>
                                <span className="text-success">FREE</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between">
                                <strong>Total:</strong>
                                <strong className="text-primary">{formatPrice(cart.total)}</strong>
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
