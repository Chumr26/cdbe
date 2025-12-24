import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer: React.FC = () => {
    return (
        <footer className="bg-dark text-light mt-5 py-4">
            <Container>
                <Row>
                    <Col md={4} className="mb-3">
                        <h5>About Bookstore</h5>
                        <p className="text-muted">
                            Your one-stop destination for all your favorite books. We offer a wide selection of books across various genres.
                        </p>
                        <div className="d-flex gap-3">
                            <a href="#" className="text-light"><FaFacebook size={24} /></a>
                            <a href="#" className="text-light"><FaTwitter size={24} /></a>
                            <a href="#" className="text-light"><FaInstagram size={24} /></a>
                        </div>
                    </Col>
                    <Col md={4} className="mb-3">
                        <h5>Quick Links</h5>
                        <ul className="list-unstyled">
                            <li><Link to="/" className="text-muted text-decoration-none">Home</Link></li>
                            <li><Link to="/products" className="text-muted text-decoration-none">Products</Link></li>
                            <li><Link to="/about" className="text-muted text-decoration-none">About Us</Link></li>
                            <li><Link to="/contact" className="text-muted text-decoration-none">Contact</Link></li>
                        </ul>
                    </Col>
                    <Col md={4} className="mb-3">
                        <h5>Contact Us</h5>
                        <ul className="list-unstyled text-muted">
                            <li><FaMapMarkerAlt className="me-2" />123 Book Street, Reading City</li>
                            <li><FaPhone className="me-2" />+1 234 567 8900</li>
                            <li><FaEnvelope className="me-2" />info@bookstore.com</li>
                        </ul>
                    </Col>
                </Row>
                <hr className="bg-light" />
                <Row>
                    <Col className="text-center text-muted">
                        <p className="mb-0">&copy; {new Date().getFullYear()} Bookstore. All rights reserved.</p>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
