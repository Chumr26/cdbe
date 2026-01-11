import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../api/orders.api';
import type { Order } from '../api/orders.api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../utils/currency';

const OrdersPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (axios.isAxiosError(err)) {
            const message = (err.response?.data as { message?: string } | undefined)?.message;
            return message || err.message || fallback;
        }
        if (err instanceof Error) return err.message;
        return fallback;
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const response = await ordersAPI.getOrders();
            setOrders(response.data);
        } catch {
            setError(t('orders.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm(t('orders.cancelConfirm'))) return;

        try {
            await ordersAPI.cancelOrder(orderId);
            loadOrders();
            alert(t('orders.cancelSuccess'));
        } catch (err: unknown) {
            alert(getErrorMessage(err, t('orders.cancelError')));
        }
    };

    const formatPrice = (price: number) => {
        return formatMoney(Number(price) || 0, 'VND');
    };

    const formatDate = (date: string) => {
        const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';
        return new Date(date).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'processing': return 'info';
            case 'shipped': return 'primary';
            case 'delivered': return 'success';
            case 'cancelled': return 'danger';
            default: return 'secondary';
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <Container className="py-5"><ErrorMessage message={error} /></Container>;

    return (
        <Container className="py-5">
            <h1 className="mb-4">{t('orders.title')}</h1>

            {orders.length === 0 ? (
                <Card className="text-center py-5">
                    <Card.Body>
                        <h3>{t('orders.emptyTitle')}</h3>
                        <p className="text-muted">{t('orders.emptySubtitle')}</p>
                        <Link to="/products">
                            <Button variant="primary">{t('orders.browseProducts')}</Button>
                        </Link>
                    </Card.Body>
                </Card>
            ) : (
                orders.map((order) => (
                    <Card key={order._id} className="mb-3">
                        <Card.Header className="bg-light">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>Order #{order.orderNumber}</strong>
                                    <br />
                                    <small className="text-muted">{t('orders.placedOn', { date: formatDate(order.createdAt) })}</small>
                                </div>
                                <div className="text-end">
                                    <Badge bg={getStatusVariant(order.orderStatus)} className="me-2">
                                        {order.orderStatus.toUpperCase()}
                                    </Badge>
                                    <Badge bg={order.paymentStatus === 'completed' ? 'success' : 'warning'}>
                                        {t('orders.payment', { status: order.paymentStatus })}
                                    </Badge>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>{t('orders.table.product')}</th>
                                        <th>{t('orders.table.quantity')}</th>
                                        <th>{t('orders.table.price')}</th>
                                        <th>{t('orders.table.total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.title}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatPrice(item.price)}</td>
                                            <td>{formatPrice(item.price * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div>
                                    <strong>{t('orders.total', { amount: formatPrice(order.total) })}</strong>
                                    <br />
                                    <small className="text-muted">
                                        {t('orders.shipTo', { address: `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}` })}
                                    </small>
                                </div>
                                {order.orderStatus === 'pending' && (
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleCancelOrder(order._id)}
                                    >
                                        {t('orders.cancel')}
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                ))
            )}
        </Container>
    );
};

export default OrdersPage;
