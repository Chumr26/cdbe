import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { authAPI } from '../api/auth.api';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const ResetPasswordPage: React.FC = () => {
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
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!token) {
            setError('Invalid reset token');
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
            setError(getErrorMessage(err, 'Failed to reset password'));
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
                            <h3>Password Reset!</h3>
                            <p className="text-muted">Your password has been successfully reset. Redirecting to login...</p>
                            <Link to="/login" className="btn btn-primary w-100">
                                Login Now
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
                            <h2 className="mb-1">Reset Password</h2>
                            <p className="text-muted">Enter a new password for your account.</p>
                        </div>

                        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>New Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Confirm new password"
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
                                {submitting ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default ResetPasswordPage;
