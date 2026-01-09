import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Pagination, Alert, Badge } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
import { adminAPI } from '../../api/admin.api';
import type { User } from '../../api/auth.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Delete Modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchUsers = async (page = 1) => {
        setLoading(true);
        try {
            const response = await adminAPI.getUsers(page, 10);
            setUsers(response.data);
            setTotalPages(response.pages);
            setTotalItems(response.total);
            setCurrentPage(response.page);
        } catch {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

    const handleShowDelete = (user: User) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await adminAPI.deleteUser(userToDelete._id);
            // Refresh list
            fetchUsers(currentPage);
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch {
            setError('Failed to delete user');
        }
    };

    if (loading && !users.length) return <LoadingSpinner fullPage />;

    return (
        <Container className="py-4">
            <h2 className="mb-4">User Management</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map(user => (
                                    <tr key={user._id}>
                                        <td>{user.firstName} {user.lastName}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                                                {user.role.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleShowDelete(user)}>
                                                <FaTrash />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-4">No users found</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                    <div>Showing {users.length} of {totalItems} users</div>
                    {totalPages > 1 && (
                        <Pagination className="mb-0">
                            <Pagination.Prev
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            />
                            {[...Array(totalPages)].map((_, i) => (
                                <Pagination.Item
                                    key={i + 1}
                                    active={i + 1 === currentPage}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </Pagination.Item>
                            ))}
                            <Pagination.Next
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            />
                        </Pagination>
                    )}
                </Card.Footer>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete user <strong>{userToDelete?.email}</strong>? This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteUser}>
                        Delete User
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminUsers;
