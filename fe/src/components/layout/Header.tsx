import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Form, Button } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaSearch, FaBook } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Header: React.FC = () => {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const { cartCount, isBouncing } = useCart();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
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
                bg="dark"
                variant="dark"
                expand="lg"
                fixed="top"
                className="shadow-sm py-2"
            >
                <Container className="px-4">
                    {/* Brand Section - Left */}
                    <Navbar.Brand as={Link} to="/" className="fw-bold me-4">
                        <FaBook className="me-2" />
                        CDBE Bookstore
                    </Navbar.Brand>

                    <Navbar.Toggle aria-controls="basic-navbar-nav" />

                    <Navbar.Collapse id="basic-navbar-nav">
                        {/* Left Navigation */}
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="/">Home</Nav.Link>
                            <Nav.Link as={Link} to="/products">Products</Nav.Link>
                        </Nav>

                        {/* Center Search Box */}
                        <Form
                            className="d-flex mx-auto my-2 my-lg-0"
                            style={{ maxWidth: '500px', width: '100%' }}
                            onSubmit={handleSearch}
                        >
                            <Form.Control
                                type="search"
                                placeholder="Search books by title, author, or ISBN..."
                                className="me-2"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button variant="outline-light" type="submit" className="d-flex align-items-center px-3">
                                <FaSearch />
                            </Button>
                        </Form>

                        {/* Right Navigation */}
                        <Nav className="ms-auto align-items-center">
                            {isAuthenticated ? (
                                <>
                                    <Nav.Link as={Link} to="/cart" className="position-relative">
                                        <FaShoppingCart size={18} />
                                        {cartCount > 0 && (
                                            <h6
                                                className={`position-absolute text-primary ${isBouncing ? 'cart-bounce' : ''}`}
                                                style={{ top: 0, right: '30%' }}
                                            >
                                                {cartCount}
                                            </h6>
                                        )}
                                    </Nav.Link>
                                    <NavDropdown
                                        title={
                                            <>
                                                <FaUser size={16} className="me-2" />
                                                {user?.firstName || 'Account'}
                                            </>
                                        }
                                        id="user-dropdown"
                                        align="end"
                                    >
                                        <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/orders">My Orders</NavDropdown.Item>
                                        {isAdmin && (
                                            <>
                                                <NavDropdown.Divider />
                                                <NavDropdown.Item as={Link} to="/admin">Admin Dashboard</NavDropdown.Item>
                                                <NavDropdown.Item as={Link} to="/admin/coupons">Manage Coupons</NavDropdown.Item>
                                            </>
                                        )}
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
                                    </NavDropdown>
                                </>
                            ) : (
                                <>
                                    <Nav.Link as={Link} to="/login">Login</Nav.Link>
                                    <Nav.Link as={Link} to="/register">
                                        <Button variant="outline-light" size="sm">Sign Up</Button>
                                    </Nav.Link>
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
