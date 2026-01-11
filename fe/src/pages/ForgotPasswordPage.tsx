import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/auth.api';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (axios.isAxiosError(err)) {
            const message = (err.response?.data as { message?: string } | undefined)?.message;
            return message || err.message || fallback;
        }
        if (err instanceof Error) return err.message;
        return fallback;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const response = await authAPI.forgotPassword(email);
            setMessage({ type: 'success', text: response.message || t('auth.forgot.successFallback') });
            setEmail('');
        } catch (error: unknown) {
            setMessage({
                type: 'danger',
                text: getErrorMessage(error, t('auth.forgot.errorFallback'))
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-5">
            <div className="d-flex justify-content-center">
                <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-sm">
                    <Card.Body className="p-4">
                        <div className="text-center mb-4">
                            <h2 className="mb-1">{t('auth.forgot.title')}</h2>
                            <p className="text-muted">{t('auth.forgot.subtitle')}</p>
                        </div>

                        {message && (
                            <Alert variant={message.type} className="mb-4">
                                {message.text}
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>{t('auth.forgot.emailLabel')}</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder={t('auth.forgot.emailPlaceholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100 mb-3"
                                disabled={submitting}
                            >
                                {submitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
                            </Button>
                        </Form>

                        <div className="text-center mt-3">
                            <Link to="/login" className="text-decoration-none">
                                <i className="bi bi-arrow-left me-1"></i> {t('auth.forgot.backToLogin')}
                            </Link>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default ForgotPasswordPage;
