import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Badge, Form, Button } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaSearch, FaBook } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { cartAPI } from '../../api/cart.api';

const Header: React.FC = () => {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const navigate = useNavigate();
    const [cartItemCount, setCartItemCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            loadCartCount();
        }
    }, [isAuthenticated]);

    const loadCartCount = async () => {
        try {
            const response = await cartAPI.getCart();
            const count = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
            setCartItemCount(count);
        } catch (error) {
            // Cart might be empty or error occurred
            setCartItemCount(0);
        }
    };

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
        <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold">
                    <FaBook className="me-2" />
                    Bookstore
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Form className="d-flex mx-auto my-2 my-lg-0" style={{ maxWidth: '400px', width: '100%' }} onSubmit={handleSearch}>
                        <Form.Control
                            type="search"
                            placeholder="Search books..."
                            className="me-2"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button variant="outline-light" type="submit">
                            <FaSearch />
                        </Button>
                    </Form>
                    <Nav className="ms-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/products">Products</Nav.Link>

                        {isAuthenticated ? (
                            <>
                                <Nav.Link as={Link} to="/cart" className="position-relative">
                                    <FaShoppingCart />
                                    {cartItemCount > 0 && (
                                        <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                                            {cartItemCount}
                                        </Badge>
                                    )}
                                </Nav.Link>
                                <NavDropdown title={<><FaUser /> {user?.firstName || 'Account'}</>} id="user-dropdown">
                                    <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                                    <NavDropdown.Item as={Link} to="/orders">My Orders</NavDropdown.Item>
                                    {isAdmin && (
                                        <>
                                            <NavDropdown.Divider />
                                            <NavDropdown.Item as={Link} to="/admin">Admin Dashboard</NavDropdown.Item>
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
    );
};

export default Header;
