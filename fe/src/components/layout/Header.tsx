import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Form, Button } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaSearch, FaBook, FaHome, FaBookOpen, FaGlobe, FaSignInAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Header: React.FC = () => {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const { cartCount, isBouncing } = useCart();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const { t, i18n } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
        } else {
            navigate('/products');
        }
    };

    return (
        <>
            <style>
                {`
                    @keyframes cartBounce {
                        0%, 100% { transform: scale(1); }
                        25% { transform: scale(1.4); }
                        50% { transform: scale(0.9); }
                        75% { transform: scale(1.3); }
                    }
                    .cart-bounce {
                        animation: cartBounce 0.5s ease-in-out;
                    }
                `}
            </style>
            <Navbar
                variant="light"
                expand="lg"
                fixed="top"
                className={`site-navbar py-2 ${searchFocused ? 'header-search-focused' : ''}`}
            >
                <Container className="px-3 px-lg-4">
                    <Navbar.Brand as={Link} to="/" className="site-brand fw-bold me-4">
                        <FaBook className="me-2" size={18} />
                        Bookstore
                    </Navbar.Brand>

                    <Navbar.Toggle aria-controls="basic-navbar-nav" />

                    <Navbar.Collapse id="basic-navbar-nav">
                        <Form
                            className="site-search d-flex my-2 my-lg-0 order-0 order-lg-1"
                            onSubmit={handleSearch}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                    setSearchFocused(false);
                                }
                            }}
                        >
                            <Form.Control
                                type="search"
                                placeholder={t('search.placeholder')}
                                className="me-2 focus-ring"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button variant="primary" type="submit" className="d-flex align-items-center px-3">
                                <FaSearch />
                            </Button>
                        </Form>

                        <Nav className="me-auto order-1 order-lg-0">
                            <Nav.Link as={Link} to="/" className="site-nav-link">
                                <FaHome size={14} />
                                <span className="site-nav-text">{t('nav.home')}</span>
                            </Nav.Link>
                            <Nav.Link as={Link} to="/products" className="site-nav-link">
                                <FaBookOpen size={14} />
                                <span className="site-nav-text">{t('nav.products')}</span>
                            </Nav.Link>
                        </Nav>

                        <Nav className="ms-auto header-right-nav order-2">
                            {isAuthenticated ? (
                                <>
                                    <Nav.Link as={Link} to="/cart" className="position-relative site-nav-link">
                                        <FaShoppingCart size={18} />
                                        <span className="site-nav-text">{t('nav.cart')}</span>
                                        {cartCount > 0 && (
                                            <span className={`cart-count-badge ${isBouncing ? 'cart-bounce' : ''}`}>
                                                {cartCount}
                                            </span>
                                        )}
                                    </Nav.Link>
                                    <NavDropdown
                                        title={
                                            <span className="site-nav-link">
                                                <FaUser size={16} className="me-2" />
                                                <span className="site-nav-text">{user?.firstName || t('nav.account')}</span>
                                            </span>
                                        }
                                        id="user-dropdown"
                                        align="end"
                                        className="site-dropdown"
                                    >
                                        <NavDropdown.Item as={Link} to="/profile">{t('nav.profile')}</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/orders">{t('nav.myOrders')}</NavDropdown.Item>
                                        {isAdmin && (
                                            <>
                                                <NavDropdown.Divider />
                                                <NavDropdown.Item as={Link} to="/admin">{t('nav.dashboard')}</NavDropdown.Item>
                                            </>
                                        )}
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item onClick={handleLogout}>{t('nav.logout')}</NavDropdown.Item>
                                    </NavDropdown>

                                    <NavDropdown
                                        title={
                                            <span className="site-nav-link">
                                                <FaGlobe size={14} className="me-1" />
                                                <span className="site-nav-text">{t('nav.languages')}</span>
                                            </span>
                                        }
                                        id="language-dropdown"
                                        align="end"
                                        className="site-dropdown"
                                    >
                                        <NavDropdown.Item
                                            active={i18n.language?.startsWith('vi')}
                                            onClick={() => i18n.changeLanguage('vi')}
                                        >
                                            Tiếng Việt
                                        </NavDropdown.Item>
                                        <NavDropdown.Item
                                            active={i18n.language?.startsWith('en')}
                                            onClick={() => i18n.changeLanguage('en')}
                                        >
                                            English
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                </>
                            ) : (
                                <>
                                    <Nav.Link as={Link} to="/login" className="site-nav-link">
                                        <FaSignInAlt size={14} />
                                        <span className="site-nav-text">{t('nav.login')}</span>
                                    </Nav.Link>
                                    <NavDropdown
                                        title={
                                            <span className="site-nav-link">
                                                <FaGlobe size={14} className="me-1" />
                                                <span className="site-nav-text">{t('nav.languages')}</span>
                                            </span>
                                        }
                                        id="language-dropdown"
                                        align="end"
                                        className="site-dropdown"
                                    >
                                        <NavDropdown.Item
                                            active={i18n.language?.startsWith('vi')}
                                            onClick={() => i18n.changeLanguage('vi')}
                                        >
                                            Tiếng Việt
                                        </NavDropdown.Item>
                                        <NavDropdown.Item
                                            active={i18n.language?.startsWith('en')}
                                            onClick={() => i18n.changeLanguage('en')}
                                        >
                                            English
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                </>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </>
    );
};

export default Header;
