import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Button } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'success' | 'cancelled' | 'failed' | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);

    useEffect(() => {
        const statusParam = searchParams.get('status');
        const orderIdParam = searchParams.get('orderId');

        if (statusParam === 'success') {
            setStatus('success');
        } else if (statusParam === 'cancelled') {
            setStatus('cancelled');
        } else {
            setStatus('failed');
        }

        if (orderIdParam) {
            setOrderId(orderIdParam);
        }
    }, [searchParams]);

    return (
        <Container className="py-5 d-flex justify-content-center">
            <Card className="text-center shadow-lg p-5" style={{ maxWidth: '500px', width: '100%' }}>
                <Card.Body>
                    {status === 'success' ? (
                        <>
                            <FaCheckCircle className="text-success mb-3" size={60} />
                            <h2 className="mb-3">Thanh toán thành công!</h2>
                            <p className="text-muted mb-4">
                                Cảm ơn bạn đã mua sắm. Đơn hàng của bạn {orderId ? `#${orderId.slice(-6)}` : ''} đã được thanh toán thành công.
                            </p>
                            <div className="d-grid gap-2">
                                <Button as={Link} to="/orders" variant="primary">
                                    Xem đơn hàng
                                </Button>
                                <Button as={Link} to="/" variant="outline-secondary">
                                    Tiếp tục mua sắm
                                </Button>
                            </div>
                        </>
                    ) : status === 'cancelled' ? (
                        <>
                            <FaTimesCircle className="text-warning mb-3" size={60} />
                            <h2 className="mb-3">Thanh toán đã bị hủy</h2>
                            <p className="text-muted mb-4">
                                Bạn đã hủy giao dịch thanh toán.
                            </p>
                            <div className="d-grid gap-2">
                                <Button as={Link} to="/checkout" variant="primary">
                                    Thử lại
                                </Button>
                                <Button as={Link} to="/" variant="outline-secondary">
                                    Quay về trang chủ
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <FaTimesCircle className="text-danger mb-3" size={60} />
                            <h2 className="mb-3">Thanh toán thất bại</h2>
                            <p className="text-muted mb-4">
                                Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
                            </p>
                            <div className="d-grid gap-2">
                                <Button as={Link} to="/checkout" variant="primary">
                                    Thử lại
                                </Button>
                                <Button as={Link} to="/" variant="outline-secondary">
                                    Liên hệ hỗ trợ
                                </Button>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PaymentResult;
