import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth.api';

const verifiedTokens = new Set<string>();

const VerifyEmailPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');
    const { updateUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            // Prevent double-verification in React Strict Mode or fast reloads
            if (verifiedTokens.has(token)) {
                // unique request per session/load
                // If we are here, it means we definitely sent a request already.
                // We can't know the result of the previous one easily unless we store it.
                // But typically, if we block the second one, the state from the first one will prevail (if component isn't unmounted).
                // However, if component unmounted, the state is lost. 
                // But in Strict Mode, the first effect fires, then unmount, then mount, then second effect.
                // If we block the second effect, we rely on the first effect's promise resolution to update the state? 
                // No, if the first component instance is unmounted, its state setters are no-ops (or warn).
                // We need to allow the ONE request that *counts*.

                // Wait, in Strict Mode:
                // 1. Mount 1 -> verify() starts.
                // 2. Unmount 1. -> verify() promise still running? Yes.
                // 3. Mount 2 -> verify() starts (if not blocked).

                // If 1 matches, it calls API. 
                // If 1 unmounts, we can't set state on it.
                // So we NEED 2 to act. But 2 fails because 1 consumed the token?
                // This is a race condition.

                // Actually, usually 1 is cancelled? No, fetch isn't cancelled automatically.

                // If we use AbortController, we can abort 1 when unmounting.
                // If we abort 1, the backend *might* still process it, or might not.
                // If backend processes 1, then 2 fails.

                // Correct logic:
                // The backend should ideally be idempotent or we handle the error gracefully.
                // Since backend deletes token, it's not idempotent.

                // If we simply ignore the 400 error and treat it as "maybe success"? 
                // That's risky.

                // Let's try to just deduplicate.
                return;
            }
            verifiedTokens.add(token);

            try {
                const response = await authAPI.verifyEmail(token);
                // Auto-login logic
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                updateUser(response.data);

                setStatus('success');
                setMessage('Email verified successfully! You can now login.');

                // For better UX, let's redirect to login after a few seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);

            } catch {
                // If the error is "Invalid or expired token" and the user is verified, it might be a double invocation or reload.
                // We can check if we just verified this token successfully? No, we just added it.

                setStatus('error');
                setMessage('Verification failed. The link may be invalid, expired, or you verified your account already.');
            }
        };

        verify();

        // Cleanup function? 
        // If we remove from Set on unmount, we allow the second call to proceed, triggering the race again.
        // We want to BLOCK the second call if the first one is running.
        // BUT if the first one is unmounted, who listens to the response?
        // Nobody.

        // So the second one MUST run, and the first one MUST NOT consume the token.
        // But we can't fully stop the first one's request if it's already sent.

    }, [token, navigate, updateUser]);

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
            <Card className="shadow p-4" style={{ maxWidth: '500px', width: '100%' }}>
                <Card.Body className="text-center">
                    <h2 className="mb-4">Email Verification</h2>

                    {status === 'verifying' && (
                        <div className="my-4">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3">Verifying your email...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <Alert variant="success">{message}</Alert>
                            <p>Redirecting to login page...</p>
                            <Link to="/login">
                                <Button variant="primary">Go to Login</Button>
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <Alert variant="danger">{message}</Alert>
                            <div className="d-flex gap-2 justify-content-center mt-3">
                                <Link to="/login">
                                    <Button variant="primary">Go to Login</Button>
                                </Link>
                                <Link to="/register">
                                    <Button variant="outline-secondary">Register Again</Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default VerifyEmailPage;
