import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth.api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

const ProfilePage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '', // Email usually read-only
        phoneNumber: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await authAPI.updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber
            });

            if (response.success) {
                updateUser(response.data);
                setSuccess('Profile updated successfully!');
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to update profile'));
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <LoadingSpinner fullPage />;

    return (
        <Container className="py-5">
            <h1 className="mb-4">My Profile</h1>
            <Row>
                <Col md={8}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <h4 className="mb-4">Personal Information</h4>
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>First Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Last Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="bg-light"
                                    />
                                    <Form.Text className="text-muted">
                                        Email cannot be changed directly.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Phone Number</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-end">
                                    <Button variant="primary" type="submit" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm mb-4">
                        <Card.Body>
                            <h4 className="mb-3">Account Summary</h4>
                            <div className="mb-2">
                                <strong>Role:</strong> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </div>
                            <div className="mb-2">
                                <strong>Member since:</strong> {'January 1, 2024' /* Placeholder, user.createdAt if available */}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ProfilePage;
