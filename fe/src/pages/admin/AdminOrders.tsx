import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Modal, Form, Pagination, Alert, Badge, Row, Col, Dropdown } from 'react-bootstrap';
import { FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { adminAPI } from '../../api/admin.api';
import type { Order } from '../../api/orders.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../utils/currency';
import { getLocalizedText } from '../../utils/i18n';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const AdminOrders: React.FC = () => {
    const { t, i18n } = useTranslation();
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

    const fetchOrders = useCallback(async (page = 1, status = '') => {
        setLoading(true);
        try {
            const response = await adminAPI.getOrders(page, 10, status);
            setOrders(response.data);
            setTotalPages(response.pages);
            setTotalItems(response.total);
            setCurrentPage(response.page);
        } catch {
            setError(t('admin.orders.loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchOrders(currentPage, statusFilter);
    }, [currentPage, statusFilter, fetchOrders]);

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
        } catch (err: unknown) {
            setModalError(getErrorMessage(err, t('admin.orders.updateStatusError')));
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
        } catch (err: unknown) {
            setModalError(getErrorMessage(err, t('admin.orders.updatePaymentStatusError')));
        } finally {
            setUpdatingPaymentStatus(false);
        }
    };

    const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'delivered': return 'success';
            case 'shipped': return 'info';
            case 'processing': return 'primary';
            case 'cancelled': return 'danger';
            default: return 'warning';
        }
    };

    const getOrderStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return t('admin.orders.filter.pending');
            case 'processing':
                return t('admin.orders.filter.processing');
            case 'shipped':
                return t('admin.orders.filter.shipped');
            case 'delivered':
                return t('admin.orders.filter.delivered');
            case 'cancelled':
                return t('admin.orders.filter.cancelled');
            default:
                return status;
        }
    };

    if (loading && !orders.length) return <LoadingSpinner fullPage />;

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>{t('admin.orders.title')}</h2>
                <Form.Select
                    style={{ width: '200px' }}
                    value={statusFilter}
                    onChange={handleFilterChange}
                >
                    <option value="">{t('admin.orders.filter.all')}</option>
                    <option value="pending">{t('admin.orders.filter.pending')}</option>
                    <option value="processing">{t('admin.orders.filter.processing')}</option>
                    <option value="shipped">{t('admin.orders.filter.shipped')}</option>
                    <option value="delivered">{t('admin.orders.filter.delivered')}</option>
                    <option value="cancelled">{t('admin.orders.filter.cancelled')}</option>
                </Form.Select>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>{t('admin.orders.table.order')}</th>
                                <th>{t('admin.orders.table.customer')}</th>
                                <th>{t('admin.orders.table.date')}</th>
                                <th>{t('admin.orders.table.total')}</th>
                                <th>{t('admin.orders.table.status')}</th>
                                <th>{t('admin.orders.table.actions')}</th>
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
                                        <td>{new Date(order.createdAt).toLocaleDateString(locale)}</td>
                                        <td>{formatMoney(order.total, 'VND')}</td>
                                        <td>
                                            <Badge bg={getStatusBadge(order.orderStatus)}>
                                                {order.orderStatus.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" onClick={() => handleShowModal(order)}>
                                                <FaEdit /> {t('admin.orders.table.details')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-4">{t('admin.orders.table.empty')}</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                    <div>{t('admin.orders.pagination', { shown: orders.length, total: totalItems })}</div>
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
                    <Modal.Title>{t('admin.orders.modal.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modalError && <Alert variant="danger">{modalError}</Alert>}
                    {selectedOrder && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <h5>{t('admin.orders.modal.orderInfo')}</h5>
                                    <p>
                                        <strong>{t('admin.orders.modal.id')}</strong> {selectedOrder._id}<br />
                                        <strong>{t('admin.orders.modal.date')}</strong> {new Date(selectedOrder.createdAt).toLocaleString(locale)}<br />
                                        <strong>{t('admin.orders.modal.paymentMethod')}</strong> {(selectedOrder.paymentMethod ?? 'payos').toUpperCase()}<br />
                                        <strong>{t('admin.orders.modal.paymentStatus')}</strong> {selectedOrder.paymentStatus}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <h5>{t('admin.orders.modal.shippingAddress')}</h5>
                                    <p>
                                        {selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}<br />
                                        {selectedOrder.shippingAddress.street}<br />
                                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}<br />
                                        {selectedOrder.shippingAddress.country}
                                    </p>
                                </Col>
                            </Row>

                            <h5>{t('admin.orders.modal.items')}</h5>
                            <Table size="sm" className="mb-4">
                                <thead>
                                    <tr>
                                        <th>{t('admin.orders.modal.itemsTable.product')}</th>
                                        <th>{t('admin.orders.modal.itemsTable.price')}</th>
                                        <th>{t('admin.orders.modal.itemsTable.qty')}</th>
                                        <th>{t('admin.orders.modal.itemsTable.total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{getLocalizedText(item.titleI18n, i18n.language) || item.title || ''}</td>
                                            <td>{formatMoney(item.price, 'VND')}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatMoney(item.price * item.quantity, 'VND')}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="text-end fw-bold">{t('admin.orders.modal.itemsTable.totalLabel')}</td>
                                        <td className="fw-bold">{formatMoney(selectedOrder.total, 'VND')}</td>
                                    </tr>
                                </tbody>
                            </Table>

                            <Form.Group>
                                <Form.Label className="fw-bold">{t('admin.orders.modal.updateOrderStatus')}</Form.Label>
                                <Row className="g-2 align-items-center">
                                    <Col xs={12} md>
                                        <Dropdown onSelect={(eventKey) => eventKey && setStatusToUpdate(eventKey)}>
                                            <Dropdown.Toggle variant="outline-secondary" className="w-100">
                                                {getOrderStatusLabel(statusToUpdate)}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="w-100">
                                                <Dropdown.Item eventKey="pending">{t('admin.orders.filter.pending')}</Dropdown.Item>
                                                <Dropdown.Item eventKey="processing">{t('admin.orders.filter.processing')}</Dropdown.Item>
                                                <Dropdown.Item eventKey="shipped">{t('admin.orders.filter.shipped')}</Dropdown.Item>
                                                <Dropdown.Item eventKey="delivered">{t('admin.orders.filter.delivered')}</Dropdown.Item>
                                                <Dropdown.Item eventKey="cancelled">{t('admin.orders.filter.cancelled')}</Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </Col>
                                    <Col xs={12} md="auto">
                                        <Button variant="primary" onClick={handleUpdateStatus} disabled={updating}>
                                            {updating ? t('admin.orders.modal.updating') : t('admin.orders.modal.update')}
                                        </Button>
                                    </Col>
                                </Row>
                            </Form.Group>

                            {(selectedOrder.paymentMethod ?? 'payos') === 'cod' && (
                                <Form.Group className="mt-3">
                                    <Form.Label className="fw-bold">{t('admin.orders.modal.updateCodPaymentStatus')}</Form.Label>
                                    <Row className="g-2 align-items-center">
                                        <Col xs={12} md>
                                            <Dropdown onSelect={(eventKey) => eventKey && setPaymentStatusToUpdate(eventKey)}>
                                                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                                                    {paymentStatusToUpdate || 'Pending'}
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu className="w-100">
                                                    <Dropdown.Item eventKey="pending">Pending</Dropdown.Item>
                                                    <Dropdown.Item eventKey="completed">Completed</Dropdown.Item>
                                                    <Dropdown.Item eventKey="failed">Failed</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </Col>
                                        <Col xs={12} md="auto">
                                            <Button
                                                variant="secondary"
                                                onClick={handleUpdatePaymentStatus}
                                                disabled={updatingPaymentStatus}
                                            >
                                                {updatingPaymentStatus ? t('admin.orders.modal.updating') : t('admin.orders.modal.updatePayment')}
                                            </Button>
                                        </Col>
                                    </Row>
                                </Form.Group>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>{t('admin.common.close')}</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminOrders;
