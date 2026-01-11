import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Button, Modal, Form, Pagination, Alert, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { adminAPI } from '../../api/admin.api';
import type { Coupon } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatVnd } from '../../utils/currency';

type CouponFormState = {
  code: string;
  name: string;
  description: string;
  type: 'percent' | 'fixed';
  value: string;
  maxDiscountAmount: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  isActive: boolean;
};

const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [showDisableModal, setShowDisableModal] = useState(false);
  const [couponToDisable, setCouponToDisable] = useState<Coupon | null>(null);

  const [form, setForm] = useState<CouponFormState>({
    code: '',
    name: '',
    description: '',
    type: 'percent',
    value: '',
    maxDiscountAmount: '',
    minSubtotal: '',
    startsAt: '',
    endsAt: '',
    usageLimitTotal: '',
    usageLimitPerUser: '',
    isActive: true,
  });

  const fetchCoupons = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getCoupons(page, 10);
      setCoupons(response.data);
      setTotalPages(response.pages);
      setTotalItems(response.total);
      setCurrentPage(response.page);
    } catch {
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons(currentPage);
  }, [currentPage]);

  const formatPrice = (price: number) => formatVnd(price);

  const toDateInputValue = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const handleShowModal = (coupon: Coupon | null = null) => {
    setEditingCoupon(coupon);
    setModalError('');

    if (coupon) {
      setForm({
        code: coupon.code || '',
        name: coupon.name || '',
        description: coupon.description || '',
        type: coupon.type,
        value: coupon.value?.toString() ?? '',
        maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? '',
        minSubtotal: coupon.minSubtotal?.toString() ?? '',
        startsAt: toDateInputValue(coupon.startsAt),
        endsAt: toDateInputValue(coupon.endsAt),
        usageLimitTotal: coupon.usageLimitTotal?.toString() ?? '',
        usageLimitPerUser: coupon.usageLimitPerUser?.toString() ?? '',
        isActive: coupon.isActive,
      });
    } else {
      setForm({
        code: '',
        name: '',
        description: '',
        type: 'percent',
        value: '',
        maxDiscountAmount: '',
        minSubtotal: '',
        startsAt: '',
        endsAt: '',
        usageLimitTotal: '',
        usageLimitPerUser: '',
        isActive: true,
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setForm((prev) => ({
      ...prev,
      [target.name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError('');

    try {
      const payload: Partial<Coupon> = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
        type: form.type,
        value: Number(form.value),
        isActive: form.isActive,
      };

      if (form.maxDiscountAmount !== '') payload.maxDiscountAmount = Number(form.maxDiscountAmount);
      if (form.minSubtotal !== '') payload.minSubtotal = Number(form.minSubtotal);
      if (form.usageLimitTotal !== '') payload.usageLimitTotal = Number(form.usageLimitTotal);
      if (form.usageLimitPerUser !== '') payload.usageLimitPerUser = Number(form.usageLimitPerUser);
      if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
      if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();

      if (editingCoupon) {
        await adminAPI.updateCoupon(editingCoupon._id, payload);
      } else {
        await adminAPI.createCoupon(payload);
      }

      await fetchCoupons(currentPage);
      handleCloseModal();
    } catch (err: unknown) {
      type AxiosLikeError = { response?: { data?: { message?: string } }; message?: string };
      const e = err as AxiosLikeError;
      setModalError(e?.response?.data?.message || e?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleShowDisable = (coupon: Coupon) => {
    setCouponToDisable(coupon);
    setShowDisableModal(true);
  };

  const handleDisable = async () => {
    if (!couponToDisable) return;
    try {
      await adminAPI.disableCoupon(couponToDisable._id);
      await fetchCoupons(currentPage);
      setShowDisableModal(false);
      setCouponToDisable(null);
    } catch {
      setError('Failed to disable coupon');
    }
  };

  if (loading && !coupons.length) return <LoadingSpinner fullPage />;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Coupon Management</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>
          <FaPlus className="me-2" /> Add New Coupon
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Subtotal</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length > 0 ? (
                coupons.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.code}</strong>
                      {c.name ? <div className="text-muted" style={{ fontSize: '0.9rem' }}>{c.name}</div> : null}
                    </td>
                    <td>{c.type === 'percent' ? 'Percent' : 'Fixed'}</td>
                    <td>
                      {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}
                      {c.type === 'percent' && typeof c.maxDiscountAmount === 'number'
                        ? <div className="text-muted" style={{ fontSize: '0.9rem' }}>Max: {formatPrice(c.maxDiscountAmount)}</div>
                        : null}
                    </td>
                    <td>{typeof c.minSubtotal === 'number' ? formatPrice(c.minSubtotal) : '-'}</td>
                    <td>
                      <Badge bg={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleShowModal(c)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleShowDisable(c)}
                        disabled={!c.isActive}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4">No coupons found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
        <Card.Footer className="d-flex justify-content-between align-items-center">
          <div>Showing {coupons.length} of {totalItems} coupons</div>
          {totalPages > 1 && (
            <Pagination className="mb-0">
              <Pagination.Prev
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          )}
        </Card.Footer>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalError && <Alert variant="danger">{modalError}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Code</Form.Label>
              <Form.Control
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="WELCOME10"
                required
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Optional display name"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional description"
                disabled={saving}
              />
            </Form.Group>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="type" value={form.type} onChange={handleChange} disabled={saving}>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Value</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="value"
                    value={form.value}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Max Discount Amount (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="maxDiscountAmount"
                    value={form.maxDiscountAmount}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Min Subtotal (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="minSubtotal"
                    value={form.minSubtotal}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Starts At (optional)</Form.Label>
                  <Form.Control
                    type="date"
                    name="startsAt"
                    value={form.startsAt}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Ends At (optional)</Form.Label>
                  <Form.Control
                    type="date"
                    name="endsAt"
                    value={form.endsAt}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Usage Limit Total (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    name="usageLimitTotal"
                    value={form.usageLimitTotal}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Usage Limit Per User (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    name="usageLimitPerUser"
                    value={form.usageLimitPerUser}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mt-3">
              <Form.Check
                type="checkbox"
                name="isActive"
                label="Active"
                checked={form.isActive}
                onChange={handleChange}
                disabled={saving}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Disable Confirmation Modal */}
      <Modal show={showDisableModal} onHide={() => setShowDisableModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Disable Coupon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Disable coupon <strong>{couponToDisable?.code}</strong>? Customers will no longer be able to apply it.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDisableModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDisable}>
            Disable
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminCoupons;
