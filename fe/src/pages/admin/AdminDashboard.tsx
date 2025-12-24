import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaUsers, FaShoppingCart, FaDollarSign, FaBoxOpen } from 'react-icons/fa';
import { adminAPI } from '../../api/admin.api';
import type { DashboardStats } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const response = await adminAPI.getDashboard();
            setStats(response.data);
        } catch (err: any) {
            setError('Failed to load dashboard');
        } finally {
            setLoading(false);
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
    if (!stats) return null;

    return (
        <Container className="py-5">
            <h1 className="mb-4">Admin Dashboard</h1>

            <Row className="g-4 mb-4">
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaUsers size={40} className="text-primary mb-2" />
                            <h3>{stats.totalUsers}</h3>
                            <p className="text-muted mb-0">Total Users</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaShoppingCart size={40} className="text-success mb-2" />
                            <h3>{stats.totalOrders}</h3>
                            <p className="text-muted mb-0">Total Orders</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaDollarSign size={40} className="text-warning mb-2" />
                            <h3>{formatPrice(stats.totalRevenue)}</h3>
                            <p className="text-muted mb-0">Total Revenue</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm">
                        <Card.Body>
                            <FaBoxOpen size={40} className="text-danger mb-2" />
                            <h3>{stats.pendingOrders}</h3>
                            <p className="text-muted mb-0">Pending Orders</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {stats.lowStockProducts && stats.lowStockProducts.length > 0 && (
                <Card className="shadow-sm">
                    <Card.Header className="bg-warning text-dark">
                        <h5 className="mb-0">⚠️ Low Stock Alert</h5>
                    </Card.Header>
                    <Card.Body>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Author</th>
                                        <th>Category</th>
                                        <th>Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.lowStockProducts.map((product) => (
                                        <tr key={product._id}>
                                            <td>{product.title}</td>
                                            <td>{product.author}</td>
                                            <td>{product.category}</td>
                                            <td>
                                                <span className="badge bg-danger">{product.stock} left</span>
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
