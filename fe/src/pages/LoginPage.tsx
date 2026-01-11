import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

type DevAccount = {
    email: string;
    role?: string;
    label?: string;
    password: string;
    isEmailVerified?: boolean;
};

const LoginPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [devAccounts, setDevAccounts] = useState<DevAccount[]>([]);
    const [selectedDevEmail, setSelectedDevEmail] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const loadDevAccounts = async () => {
            try {
                const res = await api.get('/auth/dev-accounts');
                const raw = (res.data as { data?: DevAccount[] } | undefined)?.data;
                if (!cancelled && Array.isArray(raw)) {
                    setDevAccounts(raw);
                }
            } catch {
                // Ignore: endpoint is dev-only and may not exist in production.
            }
        };

        loadDevAccounts();
        return () => {
            cancelled = true;
        };
    }, []);

    const fallbackDevAccounts = useMemo<DevAccount[]>(
        () => [
            {
                email: 'admin@bookstore.com',
                role: 'admin',
                label: 'admin: admin@bookstore.com',
                password: 'admin123',
                isEmailVerified: true
            },
            {
                email: 'john@test.com',
                role: 'customer',
                label: 'customer: john@test.com',
                password: 'password123',
                isEmailVerified: true
            }
        ],
        []
    );

    const visibleDevAccounts = devAccounts.length > 0 ? devAccounts : fallbackDevAccounts;

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
        setError('');
        setLoading(true);

        try {
            await login({ email, password }, rememberMe);
            navigate('/');
        } catch (err: unknown) {
            setError(getErrorMessage(err, t('auth.login.errorFallback')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={6} lg={5}>
                    <Card className="shadow">
                        <Card.Body className="p-4">
                            <h2 className="text-center mb-4">{t('auth.login.title')}</h2>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label>{t('auth.login.emailLabel')}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder={t('auth.login.emailPlaceholder')}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>{t('auth.login.passwordLabel')}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder={t('auth.login.passwordPlaceholder')}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        label={t('auth.login.rememberMe')}
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    {/* Original Forgot password link removed as per instruction to move it */}
                                </div>

                                <Button variant="primary" type="submit" className="w-100 mb-3" disabled={loading}>
                                    {loading ? t('auth.login.submitting') : t('auth.login.submit')}
                                </Button>

                                <div className="text-center mb-3">
                                    <Link to="/forgot-password" className="text-decoration-none">
                                        {t('auth.login.forgotPassword')}
                                    </Link>
                                </div>
                            </Form>
                            <hr />
                            <p className="text-center mb-0">
                                {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.signUpLink')}</Link>
                            </p>

                            {/* Development Helper */}
                            <div className="mt-4 p-3 bg-light rounded text-center">
                                <small className="text-muted d-block mb-2">{t('auth.login.devCredentials')}</small>
                                <Form.Select
                                    size="sm"
                                    value={selectedDevEmail}
                                    onChange={(e) => {
                                        const nextEmail = e.target.value;
                                        setSelectedDevEmail(nextEmail);

                                        const selected = visibleDevAccounts.find((a) => a.email === nextEmail);
                                        if (selected) {
                                            setEmail(selected.email);
                                            setPassword(selected.password);
                                        }
                                    }}
                                >
                                    <option value="">{t('auth.login.selectAccount')}</option>
                                    {visibleDevAccounts.map((a) => (
                                        <option key={a.email} value={a.email}>
                                            {`${a.label || `${a.role || 'user'}: ${a.email}`}${a.isEmailVerified === false ? ' (unverified)' : ''}`}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default LoginPage;
