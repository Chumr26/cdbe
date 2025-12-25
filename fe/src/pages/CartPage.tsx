import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaExclamationTriangle } from 'react-icons/fa';
import { cartAPI } from '../api/cart.api';
import type { Cart } from '../api/cart.api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const CartPage: React.FC = () => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            const response = await cartAPI.getCart();
            setCart(response.data);
        } catch (err: any) {
            setError('Failed to load cart');
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        try {
            const response = await cartAPI.updateCartItem(productId, newQuantity);
            setCart(response.data);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update quantity');
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
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to remove item');
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
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to clear cart');
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <Container className="py-5"><ErrorMessage message={error} /></Container>;

    const isEmpty = !cart || cart.items.length === 0;

    return (
        <Container className="py-5">
            <h1 className="mb-4">Shopping Cart</h1>

            {isEmpty ? (
                <Card className="text-center py-5">
                    <Card.Body>
                        <h3>Your cart is empty</h3>
                        <p className="text-muted">Add some books to get started!</p>
                        <Link to="/products">
                            <Button variant="primary">Browse Products</Button>
                        </Link>
                    </Card.Body>
                </Card>
            ) : (
                <Row>
                    <Col lg={8}>
                        <Card className="mb-4">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5>Cart Items ({cart.items.length})</h5>
                                    <Button variant="outline-danger" size="sm" onClick={handleClearClick}>
                                        Clear Cart
                                    </Button>
                                </div>

                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.items.map((item) => (
                                            <tr key={item.productId._id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <img
                                                            src={
                                                                item.productId.coverImage?.url ||
                                                                item.productId.images?.[0] ||
                                                                'https://via.placeholder.com/60x80?text=No+Cover'
                                                            }
                                                            alt={item.productId.title}
                                                            style={{ width: '60px', height: '80px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                                                            className="me-3 rounded"
                                                        />
                                                        <div>
                                                            <Link to={`/products/${item.productId._id}`} className="text-decoration-none">
                                                                <strong>{item.productId.title}</strong>
                                                            </Link>
                                                            <br />
                                                            <small className="text-muted">by {item.productId.author}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="align-middle">{formatPrice(item.price)}</td>
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
                                                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                                                </td>
                                                <td className="align-middle">
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleRemoveClick(item.productId._id, item.productId.title)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4}>
                        <Card>
                            <Card.Body>
                                <h5 className="mb-3">Order Summary</h5>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Subtotal:</span>
                                    <strong>{formatPrice(cart.total)}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Shipping:</span>
                                    <span className="text-success">FREE</span>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between mb-3">
                                    <strong>Total:</strong>
                                    <strong className="text-primary">{formatPrice(cart.total)}</strong>
                                </div>
                                <Button
                                    variant="primary"
                                    className="w-100"
                                    onClick={() => navigate('/checkout')}
                                >
                                    Proceed to Checkout
                                </Button>
                                <Link to="/products">
                                    <Button variant="outline-secondary" className="w-100 mt-2">
                                        Continue Shopping
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
                        Remove Item
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to remove <strong>{itemToDelete?.title}</strong> from your cart?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmRemoveItem}>
                        Remove
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Clear Cart Modal */}
            <Modal show={showClearModal} onHide={() => setShowClearModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center">
                        <FaExclamationTriangle className="text-warning me-2" />
                        Clear Cart
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to clear all items from your cart?</p>
                    <p className="text-muted mb-0">This action cannot be undone.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowClearModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmClearCart}>
                        Clear Cart
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CartPage;
