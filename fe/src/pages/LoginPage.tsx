import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

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
            setError(getErrorMessage(err, 'Failed to login. Please check your credentials.'));
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
                            <h2 className="text-center mb-4">Login</h2>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        label="Remember me"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    {/* Original Forgot password link removed as per instruction to move it */}
                                </div>

                                <Button variant="primary" type="submit" className="w-100 mb-3" disabled={loading}>
                                    {loading ? 'Logging in...' : 'Login'}
                                </Button>

                                <div className="text-center mb-3">
                                    <Link to="/forgot-password" className="text-decoration-none">
                                        Forgot password?
                                    </Link>
                                </div>
                            </Form>
                            <hr />
                            <p className="text-center mb-0">
                                Don't have an account? <Link to="/register">Sign up</Link>
                            </p>

                            {/* Development Helper */}
                            <div className="mt-4 p-3 bg-light rounded text-center">
                                <small className="text-muted d-block mb-2">Development Credentials</small>
                                <div className="d-flex gap-2 justify-content-center">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => {
                                            setEmail('admin@bookstore.com');
                                            setPassword('admin123');
                                        }}
                                    >
                                        Auto-fill Admin
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => {
                                            setEmail('john@test.com');
                                            setPassword('password123');
                                        }}
                                    >
                                        Auto-fill User
                                    </Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default LoginPage;
