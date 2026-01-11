import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { authAPI } from '../api/auth.api';
import { useTranslation } from 'react-i18next';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError(t('auth.reset.passwordMismatch'));
            return;
        }

        if (password.length < 6) {
            setError(t('auth.reset.passwordMin'));
            return;
        }

        if (!token) {
            setError(t('auth.reset.invalidToken'));
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await authAPI.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: unknown) {
            setError(getErrorMessage(err, t('auth.reset.errorFallback')));
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <Container className="py-5">
                <div className="d-flex justify-content-center">
                    <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-sm">
                        <Card.Body className="p-4 text-center">
                            <div className="mb-4">
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h3>{t('auth.reset.successTitle')}</h3>
                            <p className="text-muted">{t('auth.reset.successSubtitle')}</p>
                            <Link to="/login" className="btn btn-primary w-100">
                                {t('auth.reset.loginNow')}
                            </Link>
                        </Card.Body>
                    </Card>
                </div>
            </Container>
        );
    }

    return (
        <Container className="py-5">
            <div className="d-flex justify-content-center">
                <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-sm">
                    <Card.Body className="p-4">
                        <div className="text-center mb-4">
                            <h2 className="mb-1">{t('auth.reset.title')}</h2>
                            <p className="text-muted">{t('auth.reset.subtitle')}</p>
                        </div>

                        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>{t('auth.reset.newPassword')}</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder={t('auth.reset.newPasswordPlaceholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>{t('auth.reset.confirmPassword')}</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder={t('auth.reset.confirmPasswordPlaceholder')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </Form.Group>

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100"
                                disabled={submitting}
                            >
                                {submitting ? t('auth.reset.submitting') : t('auth.reset.submit')}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default ResetPasswordPage;
