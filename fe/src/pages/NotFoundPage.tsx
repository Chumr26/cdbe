import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Container className="py-4 py-lg-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <div className="text-center surface-card p-4 p-md-5">
                        <div className="display-1 fw-bold text-muted">404</div>
                        <h1 className="h3 mt-3">{t('notFound.title')}</h1>
                        <p className="text-muted mb-4">{t('notFound.subtitle')}</p>

                        <div className="d-flex gap-2 justify-content-center flex-wrap">
                            <Link to="/" className="text-decoration-none">
                                <Button variant="primary" className="rounded-3 fw-semibold">{t('notFound.goHome')}</Button>
                            </Link>
                            <Button variant="outline-secondary" className="rounded-3" onClick={() => navigate(-1)}>
                                {t('notFound.goBack')}
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default NotFoundPage;
