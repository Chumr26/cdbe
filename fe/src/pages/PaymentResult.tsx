import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container, Card } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();

    const status = useMemo(() => {
        const statusParam = searchParams.get('status');
        const code = searchParams.get('code');
        const cancel = searchParams.get('cancel');

        if (statusParam === 'success' || statusParam === 'PAID' || code === '00') return 'success';
        if (statusParam === 'cancelled' || cancel === 'true') return 'cancelled';
        return 'failed';
    }, [searchParams]);

    const orderId = useMemo(() => searchParams.get('orderId'), [searchParams]);

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
                                <Link to="/orders" className="btn btn-primary">
                                    Xem đơn hàng
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary">
                                    Tiếp tục mua sắm
                                </Link>
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
                                <Link to="/checkout" className="btn btn-primary">
                                    Thử lại
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary">
                                    Quay về trang chủ
                                </Link>
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
                                <Link to="/checkout" className="btn btn-primary">
                                    Thử lại
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary">
                                    Liên hệ hỗ trợ
                                </Link>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PaymentResult;
