import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
        <footer className="site-footer mt-5 py-5">
            <Container>
                <Row className="mb-4">
                    <Col lg={4} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">{t('footer.about.title')}</h5>
                        <p className="footer-muted small">
                            {t('footer.about.description')}
                        </p>
                        <div className="d-flex gap-3 mt-3">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                                className="footer-social-link"
                            >
                                <FaFacebook size={24} />
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                                className="footer-social-link"
                            >
                                <FaTwitter size={24} />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                                className="footer-social-link"
                            >
                                <FaInstagram size={24} />
                            </a>
                            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                                className="footer-social-link"
                            >
                                <FaYoutube size={24} />
                            </a>
                        </div>
                    </Col>

                    <Col lg={2} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">{t('footer.categories.title')}</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link to="/products?category=fiction" className="footer-link small">
                                    {t('footer.categories.fiction')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=non-fiction" className="footer-link small">
                                    {t('footer.categories.nonFiction')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=self-help" className="footer-link small">
                                    {t('footer.categories.selfHelp')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=children" className="footer-link small">
                                    {t('footer.categories.children')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products?category=academic" className="footer-link small">
                                    {t('footer.categories.academic')}
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    <Col lg={2} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">{t('footer.customerService.title')}</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link to="/help" className="footer-link small">
                                    {t('footer.customerService.helpCenter')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/shipping" className="footer-link small">
                                    {t('footer.customerService.shippingInfo')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/returns" className="footer-link small">
                                    {t('footer.customerService.returnsRefunds')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/orders" className="footer-link small">
                                    {t('footer.customerService.trackOrder')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/faq" className="footer-link small">
                                    {t('footer.customerService.faqs')}
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    <Col lg={2} md={6} className="mb-4">
                        <h5 className="mb-3 fw-bold">{t('footer.quickLinks.title')}</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link to="/" className="footer-link small">
                                    {t('footer.quickLinks.home')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/products" className="footer-link small">
                                    {t('footer.quickLinks.allBooks')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/about" className="footer-link small">
                                    {t('footer.quickLinks.aboutUs')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/contact" className="footer-link small">
                                    {t('footer.quickLinks.contact')}
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/privacy" className="footer-link small">
                                    {t('footer.quickLinks.privacyPolicy')}
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    <Col lg={2} md={12} className="mb-4">
                        <h5 className="mb-3 fw-bold">{t('footer.newsletter.title')}</h5>
                        <p className="footer-muted small mb-3">
                            {t('footer.newsletter.description')}
                        </p>
                        <Form onSubmit={handleSubscribe}>
                            <InputGroup>
                                <Form.Control
                                    type="email"
                                    placeholder={t('footer.newsletter.placeholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    size="sm"
                                    className="focus-ring"
                                />
                                <Button
                                    variant="primary"
                                    type="submit"
                                    size="sm"
                                    disabled={subscribed}
                                >
                                    {subscribed ? t('footer.newsletter.subscribed') : t('footer.newsletter.subscribe')}
                                </Button>
                            </InputGroup>
                        </Form>
                        {subscribed && (
                            <small className="text-success d-block mt-2">
                                {t('footer.newsletter.thankYou')}
                            </small>
                        )}
                    </Col>
                </Row>

                <hr className="footer-divider my-4" />

                <Row>
                    <Col md={6} className="mb-3">
                        <h6 className="mb-3 fw-bold">{t('footer.contact.title')}</h6>
                        <ul className="list-unstyled footer-muted small">
                            <li className="mb-2">
                                <FaMapMarkerAlt className="me-2" />
                                {t('footer.contact.address')}
                            </li>
                            <li className="mb-2">
                                <FaPhone className="me-2" />
                                <a href="tel:+842873089999" className="footer-link">
                                    +84 (28) 7308 9999
                                </a>
                            </li>
                            <li className="mb-2">
                                <FaEnvelope className="me-2" />
                                <a href="mailto:contact@cdbebookstore.com" className="footer-link">
                                    contact@cdbebookstore.com
                                </a>
                            </li>
                        </ul>
                    </Col>

                    <Col md={6} className="mb-3">
                        <h6 className="mb-3 fw-bold">{t('footer.payment.title')}</h6>
                        <div className="d-flex gap-3 align-items-center flex-wrap">
                            <FaCcVisa size={40} className="footer-muted" />
                            <FaCcMastercard size={40} className="footer-muted" />
                            <FaCcPaypal size={40} className="footer-muted" />
                            <FaCreditCard size={32} className="footer-muted" />
                            <div className="d-flex align-items-center footer-muted">
                                <FaShippingFast size={24} className="me-2" />
                                <small>{t('footer.payment.fastDelivery')}</small>
                            </div>
                        </div>
                    </Col>
                </Row>

                <hr className="footer-divider my-4" />

                <Row>
                    <Col className="text-center">
                        <p className="mb-0 footer-muted small">
                            &copy; {t('footer.bottom.copyright', { year: new Date().getFullYear() })} |
                            <Link to="/terms" className="footer-link ms-2">{t('footer.bottom.terms')}</Link> |
                            <Link to="/privacy" className="footer-link ms-2">{t('footer.bottom.privacy')}</Link>
                        </p>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
