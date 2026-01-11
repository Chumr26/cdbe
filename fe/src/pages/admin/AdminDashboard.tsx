import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { FaUsers, FaShoppingCart, FaDollarSign, FaBoxOpen } from 'react-icons/fa';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from 'recharts';
import { adminAPI } from '../../api/admin.api';
import type { AdvancedAnalytics, DashboardStats } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatVnd } from '../../utils/currency';
import { useTranslation } from 'react-i18next';

const AdminDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [dashboardResponse, analyticsResponse] = await Promise.all([
                adminAPI.getDashboard(),
                adminAPI.getAdvancedAnalytics(30),
            ]);
            setStats(dashboardResponse.data);
            setAnalytics(analyticsResponse.data);
        } catch {
            setError('Failed to load analytics dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => formatVnd(price);

    const timeSeriesTotals = useMemo(() => {
        if (!analytics?.timeSeries?.length) return null;
        const totals = analytics.timeSeries.reduce(
            (acc, p) => {
                acc.orders += p.orders;
                acc.revenue += p.revenue;
                acc.newUsers += p.newUsers;
                return acc;
            },
            { orders: 0, revenue: 0, newUsers: 0 }
        );
        return totals;
    }, [analytics]);

    const chartTheme = useMemo(
        () => ({
            primary: 'var(--bs-primary)',
            success: 'var(--bs-success)',
            info: 'var(--bs-info)',
            warning: 'var(--bs-warning)',
            danger: 'var(--bs-danger)',
            secondary: 'var(--bs-secondary)',
            muted: 'var(--bs-secondary-color)',
            grid: 'var(--bs-border-color)',
        }),
        []
    );

    const orderStatusPieData = useMemo(
        () => analytics?.distributions?.orderStatus?.map((d) => ({ name: d.key, value: d.count })) ?? [],
        [analytics]
    );

    const orderStatusColors = useMemo(
        () => [chartTheme.primary, chartTheme.success, chartTheme.warning, chartTheme.danger, chartTheme.info, chartTheme.secondary],
        [chartTheme]
    );

    const formatCompactCurrency = (value: number) => {
        const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';
        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value);
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <Container className="py-5"><ErrorMessage message={error} /></Container>;
    if (!stats || !analytics) return null;

    return (
        <Container className="py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="mb-1">{t('admin.dashboard.title')}</h1>
                    <div className="text-muted">{t('admin.dashboard.lastDays', { days: analytics.rangeDays })}</div>
                </div>
            </div>

            {/* Quick Links */}
            <Row className="mb-4">
                <Col md={3}>
                    <Button variant="outline-primary" className="w-100 py-3" onClick={() => window.location.href = '/admin/products'}>
                        <FaBoxOpen className="me-2" /> {t('admin.dashboard.manageProducts')}
                    </Button>
                </Col>
                <Col md={3}>
                    <Button variant="outline-success" className="w-100 py-3" onClick={() => window.location.href = '/admin/orders'}>
                        <FaShoppingCart className="me-2" /> {t('admin.dashboard.manageOrders')}
                    </Button>
                </Col>
                <Col md={3}>
                    <Button variant="outline-info" className="w-100 py-3" onClick={() => window.location.href = '/admin/users'}>
                        <FaUsers className="me-2" /> {t('admin.dashboard.manageUsers')}
                    </Button>
                </Col>
                <Col md={3}>
                    <Button variant="outline-warning" className="w-100 py-3" onClick={() => window.location.href = '/admin/coupons'}>
                        <FaDollarSign className="me-2" /> {t('admin.dashboard.manageCoupons')}
                    </Button>
                </Col>
            </Row>

            <Row className="g-4 mb-4">
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaUsers size={40} className="text-primary mb-2" />
                            <h3>{analytics.totals.newUsers}</h3>
                            <p className="text-muted mb-0">{t('admin.dashboard.newUsers')}</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaShoppingCart size={40} className="text-success mb-2" />
                            <h3>{analytics.totals.totalOrders}</h3>
                            <p className="text-muted mb-0">{t('admin.dashboard.orders')}</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaDollarSign size={40} className="text-warning mb-2" />
                            <h3>{formatPrice(analytics.totals.revenue)}</h3>
                            <p className="text-muted mb-0">{t('admin.dashboard.revenue')}</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaBoxOpen size={40} className="text-danger mb-2" />
                            <h3>{formatPrice(analytics.totals.avgOrderValue)}</h3>
                            <p className="text-muted mb-0">{t('admin.dashboard.avgOrderValue')}</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4 mb-4">
                <Col lg={8}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">{t('admin.dashboard.revenueOrdersTrend')}</h5>
                        </Card.Header>
                        <Card.Body style={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.timeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fill: chartTheme.muted }} minTickGap={24} />
                                    <YAxis yAxisId="left" tick={{ fill: chartTheme.muted }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: chartTheme.muted }} />
                                    <Tooltip
                                        formatter={(value: unknown, name?: string) => {
                                            const key = name || '';
                                            if (key === 'revenue') return [formatPrice(Number(value)), t('admin.dashboard.tooltip.revenue')] as const;
                                            return [String(value ?? ''), t('admin.dashboard.tooltip.orders')] as const;
                                        }}
                                        labelFormatter={(label) => t('admin.dashboard.tooltip.date', { date: label })}
                                    />
                                    <Legend />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="revenue"
                                        name={t('admin.dashboard.revenue')}
                                        stroke={chartTheme.primary}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="orders"
                                        name={t('admin.dashboard.orders')}
                                        stroke={chartTheme.success}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">{t('admin.dashboard.orderStatus')}</h5>
                        </Card.Header>
                        <Card.Body style={{ height: 320 }}>
                            {orderStatusPieData.length === 0 ? (
                                <div className="text-muted">{t('admin.common.noData')}</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip formatter={(value: unknown) => [String(value ?? ''), t('admin.dashboard.tooltip.orders')]} />
                                        <Legend />
                                        <Pie
                                            data={orderStatusPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius="55%"
                                            outerRadius="80%"
                                            paddingAngle={2}
                                        >
                                            {orderStatusPieData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={orderStatusColors[index % orderStatusColors.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4 mb-4">
                <Col lg={12}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">{t('admin.dashboard.newUsersPerDay')}</h5>
                            {timeSeriesTotals && (
                                <div className="text-muted">{t('admin.dashboard.totalNewUsers', { count: timeSeriesTotals.newUsers })}</div>
                            )}
                        </Card.Header>
                        <Card.Body style={{ height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.timeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fill: chartTheme.muted }} minTickGap={24} />
                                    <YAxis tick={{ fill: chartTheme.muted }} />
                                    <Tooltip
                                        formatter={(value: unknown) => [String(value ?? ''), t('admin.dashboard.tooltip.newUsers')]}
                                        labelFormatter={(label) => t('admin.dashboard.tooltip.date', { date: label })}
                                    />
                                    <Legend />
                                    <Bar dataKey="newUsers" name={t('admin.dashboard.newUsers')} fill={chartTheme.info} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4 mb-4">
                <Col md={6}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">{t('admin.dashboard.orderStatusDistribution')}</h5>
                        </Card.Header>
                        <Card.Body>
                            {analytics.distributions.orderStatus.length === 0 ? (
                                <div className="text-muted">{t('admin.common.noData')}</div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {analytics.distributions.orderStatus.map((d) => (
                                        <Badge bg="secondary" key={d.key}>
                                            {d.key}: {d.count}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">{t('admin.dashboard.paymentStatusDistribution')}</h5>
                        </Card.Header>
                        <Card.Body>
                            {analytics.distributions.paymentStatus.length === 0 ? (
                                <div className="text-muted">{t('admin.common.noData')}</div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {analytics.distributions.paymentStatus.map((d) => (
                                        <Badge bg="secondary" key={d.key}>
                                            {d.key}: {d.count}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{t('admin.dashboard.dailyTrends')}</h5>
                    {timeSeriesTotals && (
                        <div className="text-muted">
                            {t('admin.dashboard.dailyTotals', { orders: timeSeriesTotals.orders, revenue: formatPrice(timeSeriesTotals.revenue), newUsers: timeSeriesTotals.newUsers })}
                        </div>
                    )}
                </Card.Header>
                <Card.Body>
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>{t('admin.dashboard.table.date')}</th>
                                    <th>{t('admin.dashboard.table.orders')}</th>
                                    <th>{t('admin.dashboard.table.revenue')}</th>
                                    <th>{t('admin.dashboard.table.newUsers')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.timeSeries.map((p) => (
                                    <tr key={p.date}>
                                        <td>{p.date}</td>
                                        <td>{p.orders}</td>
                                        <td title={formatPrice(p.revenue)}>{formatCompactCurrency(p.revenue)}</td>
                                        <td>{p.newUsers}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card.Body>
            </Card>

            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                    <h5 className="mb-0">{t('admin.dashboard.topProducts')}</h5>
                </Card.Header>
                <Card.Body>
                    {analytics.topProducts.length === 0 ? (
                        <div className="text-muted">{t('admin.dashboard.noCompletedSales')}</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>{t('admin.dashboard.topProductsTable.title')}</th>
                                        <th>{t('admin.dashboard.topProductsTable.isbn')}</th>
                                        <th>{t('admin.dashboard.topProductsTable.qtySold')}</th>
                                        <th>{t('admin.dashboard.topProductsTable.revenue')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.topProducts.map((p) => (
                                        <tr key={p.productId}>
                                            <td>{p.title || t('admin.common.unknown')}</td>
                                            <td>{p.isbn || '-'}</td>
                                            <td>{p.quantitySold}</td>
                                            <td>{formatPrice(p.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {stats.lowStockProducts && stats.lowStockProducts.length > 0 && (
                <Card className="shadow-sm">
                    <Card.Header className="bg-warning text-dark">
                        <h5 className="mb-0">{t('admin.dashboard.lowStockAlert')}</h5>
                    </Card.Header>
                    <Card.Body>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>{t('admin.dashboard.lowStockTable.product')}</th>
                                        <th>{t('admin.dashboard.lowStockTable.author')}</th>
                                        <th>{t('admin.dashboard.lowStockTable.category')}</th>
                                        <th>{t('admin.dashboard.lowStockTable.stock')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.lowStockProducts.map((product) => (
                                        <tr key={product._id}>
                                            <td>{product.title}</td>
                                            <td>{product.author}</td>
                                            <td>{product.category}</td>
                                            <td>
                                                <span className="badge bg-danger">{t('admin.dashboard.lowStockTable.left', { count: product.stock })}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
};

export default AdminDashboard;
