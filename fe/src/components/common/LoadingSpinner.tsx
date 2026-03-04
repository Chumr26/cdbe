import React from 'react';
import { Spinner, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
    fullPage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullPage = false }) => {
    const { t } = useTranslation();

    if (fullPage) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
                <div className="surface-card px-4 py-3 d-flex align-items-center gap-3">
                    <Spinner animation="border" role="status" variant="primary">
                        <span className="visually-hidden">{t('common.loading')}</span>
                    </Spinner>
                    <span className="text-muted fw-medium">{t('common.loading')}</span>
                </div>
            </Container>
        );
    }

    return (
        <div className="text-center my-4 py-2">
            <Spinner animation="border" role="status" variant="primary" className="me-2">
                <span className="visually-hidden">{t('common.loading')}</span>
            </Spinner>
            <span className="text-muted">{t('common.loading')}</span>
        </div>
    );
};

export default LoadingSpinner;
