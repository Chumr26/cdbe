import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Alert, Badge, Form } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { adminAPI } from '../../api/admin.api';
import type { User } from '../../api/auth.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminDataSection from '../../components/admin/AdminDataSection';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminToolbar from '../../components/admin/AdminToolbar';

const AdminUsers: React.FC = () => {
    const { t, i18n } = useTranslation();
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
    const [showUserModal, setShowUserModal] = useState(false);
    const [activeUser, setActiveUser] = useState<User | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [savingCreateUser, setSavingCreateUser] = useState(false);
    const [createUserError, setCreateUserError] = useState('');
    const [createUserForm, setCreateUserForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'customer' as User['role'],
    });

    const fetchUsers = async (page = 1) => {
        setLoading(true);
        try {
            const response = await adminAPI.getUsers(page, 10);
            setUsers(response.data);
            setTotalPages(response.pages);
            setTotalItems(response.total);
            setCurrentPage(response.page);
            setSelectedUserIds([]);
        } catch {
            setError(t('admin.users.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    const handleShowUserModal = (user: User) => {
        setActiveUser(user);
        setShowUserModal(true);
    };

    const handleCloseUserModal = () => {
        setShowUserModal(false);
        setActiveUser(null);
    };

    const handleDeleteFromUserModal = () => {
        if (!activeUser) return;
        setUserToDelete(activeUser);
        setShowUserModal(false);
        setShowDeleteModal(true);
    };

    const handleShowDeleteSelected = () => {
        if (!selectedUserIds.length) return;
        setUserToDelete(null);
        setShowDeleteModal(true);
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    const toggleSelectAllVisible = () => {
        const visibleIds = users.map((user) => user._id);
        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedUserIds.includes(id));

        setSelectedUserIds((prev) => {
            if (allSelected) {
                return prev.filter((id) => !visibleIds.includes(id));
            }
            const next = new Set([...prev, ...visibleIds]);
            return Array.from(next);
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete && !selectedUserIds.length) return;

        try {
            if (userToDelete) {
                await adminAPI.deleteUser(userToDelete._id);
            } else {
                await Promise.all(
                    selectedUserIds.map((userId) => adminAPI.deleteUser(userId)),
                );
            }
            fetchUsers(currentPage);
            setShowDeleteModal(false);
            setUserToDelete(null);
            setSelectedUserIds([]);
        } catch {
            setError(t('admin.users.deleteError'));
        }
    };

    const handleOpenCreateModal = () => {
        setCreateUserError('');
        setCreateUserForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phoneNumber: '',
            role: 'customer',
        });
        setShowCreateModal(true);
    };

    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        setSavingCreateUser(false);
        setCreateUserError('');
    };

    const handleCreateUserChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = event.target;
        setCreateUserForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCreateUser = async (event: React.FormEvent) => {
        event.preventDefault();
        setSavingCreateUser(true);
        setCreateUserError('');

        try {
            await adminAPI.createUser({
                firstName: createUserForm.firstName.trim(),
                lastName: createUserForm.lastName.trim(),
                email: createUserForm.email.trim(),
                password: createUserForm.password,
                role: createUserForm.role,
                phoneNumber: createUserForm.phoneNumber.trim() || undefined,
            });
            await fetchUsers(currentPage);
            handleCloseCreateModal();
        } catch (err: unknown) {
            type AxiosLikeError = { response?: { data?: { message?: string } }; message?: string };
            const e = err as AxiosLikeError;
            setCreateUserError(e?.response?.data?.message || e?.message || t('admin.users.saveError'));
        } finally {
            setSavingCreateUser(false);
        }
    };

    const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';
    const allVisibleSelected =
        users.length > 0 &&
        users.every((user) => selectedUserIds.includes(user._id));

    if (loading && !users.length) return <LoadingSpinner fullPage />;

    return (
        <div className="admin-page">
            <AdminPageHeader title={t('admin.users.title')} />

            <AdminToolbar
                left={
                    selectedUserIds.length > 0 ? (
                        <Button
                            variant="outline-danger"
                            className="rounded-3 fw-semibold"
                            onClick={handleShowDeleteSelected}
                        >
                            <FaTrash className="me-2" />
                            {t('admin.users.delete.selected', { count: selectedUserIds.length })}
                        </Button>
                    ) : null
                }
                right={
                    <Button
                        variant="primary"
                        className="rounded-3 fw-semibold"
                        onClick={handleOpenCreateModal}
                    >
                        <FaPlus className="me-2" />
                        {t('admin.users.addNew')}
                    </Button>
                }
            />

            {error && <Alert variant="danger">{error}</Alert>}

            <AdminDataSection
                desktop={
                    <Table responsive hover className="align-middle mb-0 admin-table">
                        <thead>
                            <tr>
                                <th className="admin-table__checkbox-cell">
                                    <Form.Check
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label={t('admin.users.table.selectAll')}
                                    />
                                </th>
                                <th>{t('admin.users.table.name')}</th>
                                <th>{t('admin.users.table.email')}</th>
                                <th>{t('admin.users.table.role')}</th>
                                <th>{t('admin.users.table.joinedDate')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map(user => (
                                    <tr
                                        key={user._id}
                                        className={`admin-table__row--selectable ${selectedUserIds.includes(user._id) ? 'admin-table__row--selected' : ''}`}
                                        onClick={() => handleShowUserModal(user)}
                                    >
                                        <td
                                            className="admin-table__checkbox-cell"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user._id)}
                                                onChange={() => toggleUserSelection(user._id)}
                                                aria-label={t('admin.users.table.selectUser')}
                                            />
                                        </td>
                                        <td>{user.firstName} {user.lastName}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                                                {user.role === 'admin' ? t('admin.users.role.admin') : t('admin.users.role.customer')}
                                            </Badge>
                                        </td>
                                        <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-4">{t('admin.users.table.empty')}</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                }
                mobile={
                    users.length > 0 ? (
                        users.map((user) => (
                                <div
                                    key={user._id}
                                    className={`admin-mobile-card admin-mobile-card--selectable ${selectedUserIds.includes(user._id) ? 'admin-mobile-card--selected' : ''}`}
                                    onClick={() => handleShowUserModal(user)}
                                >
                                    <div
                                        className="admin-mobile-card__row"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <span className="admin-mobile-card__label">{t('admin.users.table.select')}</span>
                                        <span className="admin-mobile-card__value">
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user._id)}
                                                onChange={() => toggleUserSelection(user._id)}
                                                aria-label={t('admin.users.table.selectUser')}
                                            />
                                        </span>
                                    </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.users.table.name')}</span>
                                    <span className="admin-mobile-card__value">{user.firstName} {user.lastName}</span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.users.table.email')}</span>
                                    <span className="admin-mobile-card__value">{user.email}</span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.users.table.role')}</span>
                                    <span className="admin-mobile-card__value">
                                        <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                                            {user.role === 'admin' ? t('admin.users.role.admin') : t('admin.users.role.customer')}
                                        </Badge>
                                    </span>
                                </div>
                                <div className="admin-mobile-card__row">
                                    <span className="admin-mobile-card__label">{t('admin.users.table.joinedDate')}</span>
                                    <span className="admin-mobile-card__value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : '-'}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4">{t('admin.users.table.empty')}</div>
                    )
                }
                footer={
                    <>
                        <div>{t('admin.users.pagination', { shown: users.length, total: totalItems })}</div>
                        <AdminPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                }
            />

            <Modal show={showUserModal} onHide={handleCloseUserModal} centered dialogClassName="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title>{t('admin.users.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {activeUser ? (
                        <div className="row g-3">
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.firstName')}</Form.Label>
                                <Form.Control value={activeUser.firstName || ''} readOnly />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.lastName')}</Form.Label>
                                <Form.Control value={activeUser.lastName || ''} readOnly />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.table.email')}</Form.Label>
                                <Form.Control value={activeUser.email || ''} readOnly />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.table.role')}</Form.Label>
                                <Form.Control
                                    value={activeUser.role === 'admin' ? t('admin.users.role.admin') : t('admin.users.role.customer')}
                                    readOnly
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.phone')}</Form.Label>
                                <Form.Control value={activeUser.phoneNumber || '-'} readOnly />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.table.joinedDate')}</Form.Label>
                                <Form.Control
                                    value={activeUser.createdAt ? new Date(activeUser.createdAt).toLocaleDateString(locale) : '-'}
                                    readOnly
                                />
                            </div>
                        </div>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseUserModal}>
                        {t('admin.users.delete.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteFromUserModal} disabled={!activeUser}>
                        {t('admin.users.delete.confirm')}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered dialogClassName="admin-modal">
                <Modal.Header closeButton>
                    <Modal.Title>{t('admin.users.delete.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {userToDelete
                        ? t('admin.users.delete.body', { email: userToDelete.email || '' })
                        : t('admin.users.delete.bodySelected', { count: selectedUserIds.length })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        {t('admin.users.delete.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDeleteUser}>
                        {userToDelete ? t('admin.users.delete.confirm') : t('admin.users.delete.confirmSelected')}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showCreateModal} onHide={handleCloseCreateModal} centered dialogClassName="admin-modal">
                <Form onSubmit={handleCreateUser}>
                    <Modal.Header closeButton>
                        <Modal.Title>{t('admin.users.modal.createTitle')}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {createUserError ? <Alert variant="danger">{createUserError}</Alert> : null}

                        <div className="row g-3">
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.firstName')}</Form.Label>
                                <Form.Control
                                    name="firstName"
                                    value={createUserForm.firstName}
                                    onChange={handleCreateUserChange}
                                    required
                                    disabled={savingCreateUser}
                                    className="focus-ring"
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.lastName')}</Form.Label>
                                <Form.Control
                                    name="lastName"
                                    value={createUserForm.lastName}
                                    onChange={handleCreateUserChange}
                                    required
                                    disabled={savingCreateUser}
                                    className="focus-ring"
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.email')}</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={createUserForm.email}
                                    onChange={handleCreateUserChange}
                                    required
                                    disabled={savingCreateUser}
                                    className="focus-ring"
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.password')}</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={createUserForm.password}
                                    onChange={handleCreateUserChange}
                                    required
                                    minLength={6}
                                    disabled={savingCreateUser}
                                    className="focus-ring"
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.phone')}</Form.Label>
                                <Form.Control
                                    name="phoneNumber"
                                    value={createUserForm.phoneNumber}
                                    onChange={handleCreateUserChange}
                                    disabled={savingCreateUser}
                                    className="focus-ring"
                                />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>{t('admin.users.modal.role')}</Form.Label>
                                <Form.Select
                                    name="role"
                                    value={createUserForm.role}
                                    onChange={handleCreateUserChange}
                                    disabled={savingCreateUser}
                                    className="focus-ring"
                                >
                                    <option value="customer">{t('admin.users.role.customer')}</option>
                                    <option value="admin">{t('admin.users.role.admin')}</option>
                                </Form.Select>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseCreateModal} disabled={savingCreateUser}>
                            {t('admin.users.modal.cancel')}
                        </Button>
                        <Button variant="primary" type="submit" disabled={savingCreateUser}>
                            {savingCreateUser ? t('admin.users.modal.saving') : t('admin.users.modal.save')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminUsers;
