import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    FaFacebook,
    FaTwitter,
    FaInstagram,
    FaYoutube,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaCreditCard,
    FaCcVisa,
    FaCcMastercard,
    FaCcPaypal,
    FaShippingFast
} from 'react-icons/fa';

const Footer: React.FC = () => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setTimeout(() => {
                setSubscribed(false);
                setEmail('');
            }, 3000);
        }
    };

    return (
        <footer className="bg-dark text-light mt-5 py-5">
            <Container>
                <Row className="mb-4">
                    <Col lg={3} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">About CDBE Bookstore</h5>
                        <p className="text-secondary small">
                            Welcome to CDBE Bookstore - your trusted destination for quality books.
                            We curate the finest selection across all genres to inspire and entertain readers of all ages.
                        </p>
                        <div className="d-flex gap-3 mt-3">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                                className="text-light" style={{ transition: 'color 0.3s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1877f2'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                                <FaFacebook size={24} />
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                                className="text-light" style={{ transition: 'color 0.3s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1da1f2'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                                <FaTwitter size={24} />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                                className="text-light" style={{ transition: 'color 0.3s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#e4405f'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                                <FaInstagram size={24} />
                            </a>
                            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                                className="text-light" style={{ transition: 'color 0.3s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff0000'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                                <FaYoutube size={24} />
                            </a>
                        </div>
                    </Col>

                    <Col lg={2} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">Categories</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link to="/products?category=fiction" className="text-secondary text-decoration-none small">
                                    Fiction
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=non-fiction" className="text-secondary text-decoration-none small">
                                    Non-Fiction
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=self-help" className="text-secondary text-decoration-none small">
                                    Self-Help
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=children" className="text-secondary text-decoration-none small">
                                    Children's Books
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=academic" className="text-secondary text-decoration-none small">
                                    Academic
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    <Col lg={2} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">Customer Service</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link to="/help" className="text-secondary text-decoration-none small">
                                    Help Center
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/shipping" className="text-secondary text-decoration-none small">
                                    Shipping Info
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/returns" className="text-secondary text-decoration-none small">
                                    Returns & Refunds
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/orders" className="text-secondary text-decoration-none small">
                                    Track Order
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/faq" className="text-secondary text-decoration-none small">
                                    FAQs
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    <Col lg={2} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">Quick Links</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link to="/" className="text-secondary text-decoration-none small">
                                    Home
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products" className="text-secondary text-decoration-none small">
                                    All Books
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/about" className="text-secondary text-decoration-none small">
                                    About Us
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/contact" className="text-secondary text-decoration-none small">
                                    Contact
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/privacy" className="text-secondary text-decoration-none small">
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    <Col lg={3} md={12} className="mb-4">
                        <h5 className="mb-3 fw-bold">Newsletter</h5>
                        <p className="text-secondary small mb-3">
                            Subscribe to get special offers, free giveaways, and exclusive deals.
                        </p>
                        <Form onSubmit={handleSubscribe}>
                            <InputGroup>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    size="sm"
                                />
                                <Button
                                    variant="primary"
                                    type="submit"
                                    size="sm"
                                    disabled={subscribed}
                                >
                                    {subscribed ? '✓ Subscribed!' : 'Subscribe'}
                                </Button>
                            </InputGroup>
                        </Form>
                        {subscribed && (
                            <small className="text-success d-block mt-2">
                                Thank you for subscribing!
                            </small>
                        )}
                    </Col>
                </Row>

                <hr className="border-secondary my-4" />

                <Row>
                    <Col md={6} className="mb-3">
                        <h6 className="mb-3 fw-bold">Contact Information</h6>
                        <ul className="list-unstyled text-secondary small">
                            <li className="mb-2">
                                <FaMapMarkerAlt className="me-2" />
                                123 Nguyen Van Linh, District 7, Ho Chi Minh City
                            </li>
                            <li className="mb-2">
                                <FaPhone className="me-2" />
                                <a href="tel:+842873089999" className="text-secondary text-decoration-none">
                                    +84 (28) 7308 9999
                                </a>
                            </li>
                            <li className="mb-2">
                                <FaEnvelope className="me-2" />
                                <a href="mailto:contact@cdbebookstore.com" className="text-secondary text-decoration-none">
                                    contact@cdbebookstore.com
                                </a>
                            </li>
                        </ul>
                    </Col>

                    <Col md={6} className="mb-3">
                        <h6 className="mb-3 fw-bold">We Accept</h6>
                        <div className="d-flex gap-3 align-items-center flex-wrap">
                            <FaCcVisa size={40} className="text-secondary" />
                            <FaCcMastercard size={40} className="text-secondary" />
                            <FaCcPaypal size={40} className="text-secondary" />
                            <FaCreditCard size={32} className="text-secondary" />
                            <div className="d-flex align-items-center text-secondary">
                                <FaShippingFast size={24} className="me-2" />
                                <small>Fast Delivery</small>
                            </div>
                        </div>
                    </Col>
                </Row>

                <hr className="border-secondary my-4" />

                <Row>
                    <Col className="text-center">
                        <p className="mb-0 text-secondary small">
                            &copy; {new Date().getFullYear()} CDBE Bookstore. All rights reserved. |
                            <Link to="/terms" className="text-secondary text-decoration-none ms-2">Terms of Service</Link> |
                            <Link to="/privacy" className="text-secondary text-decoration-none ms-2">Privacy Policy</Link>
                        </p>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
