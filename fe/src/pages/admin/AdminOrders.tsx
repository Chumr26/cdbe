import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Pagination, Alert, Badge, Row, Col } from 'react-bootstrap';
import { FaEdit } from 'react-icons/fa';
import { adminAPI } from '../../api/admin.api';
import type { Order } from '../../api/orders.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filter state
    const [statusFilter, setStatusFilter] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [statusToUpdate, setStatusToUpdate] = useState('');
    const [updating, setUpdating] = useState(false);
    const [paymentStatusToUpdate, setPaymentStatusToUpdate] = useState('');
    const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
    const [modalError, setModalError] = useState('');

    const fetchOrders = async (page = 1, status = '') => {
        setLoading(true);
        try {
            const response = await adminAPI.getOrders(page, 10, status);
            setOrders(response.data);
            setTotalPages(response.pages);
            setTotalItems(response.total);
            setCurrentPage(response.page);
        } catch (err) {
            setError('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(currentPage, statusFilter);
    }, [currentPage, statusFilter]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1); // Reset to page 1 on filter change
    };

    const handleShowModal = (order: Order) => {
        setSelectedOrder(order);
        setStatusToUpdate(order.orderStatus);
        setPaymentStatusToUpdate(order.paymentStatus);
        setModalError('');
        setShowModal(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        setUpdating(true);
        try {
            await adminAPI.updateOrderStatus(selectedOrder._id, statusToUpdate);
            // Refresh
            fetchOrders(currentPage, statusFilter);
            setShowModal(false);
            setSelectedOrder(null);
        } catch (err: any) {
            setModalError(err.response?.data?.message || err.message || 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdatePaymentStatus = async () => {
        if (!selectedOrder) return;
        if ((selectedOrder.paymentMethod ?? 'payos') !== 'cod') return;

        setUpdatingPaymentStatus(true);
        try {
            const response = await adminAPI.updateCodPaymentStatus(
                selectedOrder._id,
                paymentStatusToUpdate as 'pending' | 'completed' | 'failed'
            );

            setSelectedOrder(response.data);
            fetchOrders(currentPage, statusFilter);
        } catch (err: any) {
            setModalError(err.response?.data?.message || err.message || 'Failed to update payment status');
        } finally {
            setUpdatingPaymentStatus(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'delivered': return 'success';
            case 'shipped': return 'info';
            case 'processing': return 'primary';
            case 'cancelled': return 'danger';
            default: return 'warning';
        }
    };

    if (loading && !orders.length) return <LoadingSpinner fullPage />;

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Order Management</h2>
                <Form.Select
                    style={{ width: '200px' }}
                    value={statusFilter}
                    onChange={handleFilterChange}
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </Form.Select>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 ? (
                                orders.map(order => (
                                    <tr key={order._id}>
                                        <td>{order.orderNumber || order._id.substring(0, 8).toUpperCase()}</td>
                                        <td>
                                            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                                            <br />
                                            <small className="text-muted">{order.shippingAddress.city}</small>
                                        </td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td>${order.total.toFixed(2)}</td>
                                        <td>
                                            <Badge bg={getStatusBadge(order.orderStatus)}>
                                                {order.orderStatus.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" onClick={() => handleShowModal(order)}>
                                                <FaEdit /> details
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-4">No orders found</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                    <div>Showing {orders.length} of {totalItems} orders</div>
                    {totalPages > 1 && (
                        <Pagination className="mb-0">
                            <Pagination.Prev
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            />
                            {[...Array(totalPages)].map((_, i) => (
                                <Pagination.Item
                                    key={i + 1}
                                    active={i + 1 === currentPage}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </Pagination.Item>
                            ))}
                            <Pagination.Next
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            />
                        </Pagination>
                    )}
                </Card.Footer>
            </Card>

            {/* View/Update Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Order Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modalError && <Alert variant="danger">{modalError}</Alert>}
                    {selectedOrder && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <h5>Order Info</h5>
                                    <p>
                                        <strong>ID:</strong> {selectedOrder._id}<br />
                                        <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}<br />
                                        <strong>Payment Method:</strong> {(selectedOrder.paymentMethod ?? 'payos').toUpperCase()}<br />
                                        <strong>Payment Status:</strong> {selectedOrder.paymentStatus}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <h5>Shipping Address</h5>
                                    <p>
                                        {selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}<br />
                                        {selectedOrder.shippingAddress.street}<br />
                                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}<br />
                                        {selectedOrder.shippingAddress.country}
                                    </p>
                                </Col>
                            </Row>

                            <h5>Items</h5>
                            <Table size="sm" className="mb-4">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Qty</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.title}</td>
                                            <td>${item.price.toFixed(2)}</td>
                                            <td>{item.quantity}</td>
                                            <td>${(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="text-end fw-bold">Total:</td>
                                        <td className="fw-bold">${selectedOrder.total.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </Table>

                            <Form.Group>
                                <Form.Label className="fw-bold">Update Order Status</Form.Label>
                                <div className="d-flex gap-2">
                                    <Form.Select
                                        value={statusToUpdate}
                                        onChange={(e) => setStatusToUpdate(e.target.value)}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </Form.Select>
                                    <Button variant="primary" onClick={handleUpdateStatus} disabled={updating}>
                                        {updating ? 'Updating...' : 'Update'}
                                    </Button>
                                </div>
                            </Form.Group>

                            {(selectedOrder.paymentMethod ?? 'payos') === 'cod' && (
                                <Form.Group className="mt-3">
                                    <Form.Label className="fw-bold">Update COD Payment Status</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Select
                                            value={paymentStatusToUpdate}
                                            onChange={(e) => setPaymentStatusToUpdate(e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                            <option value="failed">Failed</option>
                                        </Form.Select>
                                        <Button
                                            variant="secondary"
                                            onClick={handleUpdatePaymentStatus}
                                            disabled={updatingPaymentStatus}
                                        >
                                            {updatingPaymentStatus ? 'Updating...' : 'Update Payment'}
                                        </Button>
                                    </div>
                                </Form.Group>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminOrders;
