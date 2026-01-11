import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container, Card } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const PaymentResult = () => {
    const { t } = useTranslation();
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
    const orderLabel = useMemo(() => (orderId ? `#${orderId.slice(-6)}` : ''), [orderId]);

    return (
        <Container className="py-5 d-flex justify-content-center">
            <Card className="text-center shadow-lg p-5" style={{ maxWidth: '500px', width: '100%' }}>
                <Card.Body>
                    {status === 'success' ? (
                        <>
                            <FaCheckCircle className="text-success mb-3" size={60} />
                            <h2 className="mb-3">{t('paymentResult.successTitle')}</h2>
                            <p className="text-muted mb-4">
                                {t('paymentResult.successMessage', { order: orderLabel })}
                            </p>
                            <div className="d-grid gap-2">
                                <Link to="/orders" className="btn btn-primary">
                                    {t('paymentResult.viewOrders')}
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary">
                                    {t('paymentResult.continueShopping')}
                                </Link>
                            </div>
                        </>
                    ) : status === 'cancelled' ? (
                        <>
                            <FaTimesCircle className="text-warning mb-3" size={60} />
                            <h2 className="mb-3">{t('paymentResult.cancelledTitle')}</h2>
                            <p className="text-muted mb-4">
                                {t('paymentResult.cancelledMessage')}
                            </p>
                            <div className="d-grid gap-2">
                                <Link to="/checkout" className="btn btn-primary">
                                    {t('paymentResult.retry')}
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary">
                                    {t('paymentResult.backHome')}
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <FaTimesCircle className="text-danger mb-3" size={60} />
                            <h2 className="mb-3">{t('paymentResult.failedTitle')}</h2>
                            <p className="text-muted mb-4">
                                {t('paymentResult.failedMessage')}
                            </p>
                            <div className="d-grid gap-2">
                                <Link to="/checkout" className="btn btn-primary">
                                    {t('paymentResult.retry')}
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary">
                                    {t('paymentResult.contactSupport')}
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
