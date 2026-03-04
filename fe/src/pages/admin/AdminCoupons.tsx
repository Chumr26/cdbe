import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { adminAPI } from '../../api/admin.api';
import type { Coupon } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatMoney } from '../../utils/currency';
import { useTranslation } from 'react-i18next';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminDataSection from '../../components/admin/AdminDataSection';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminToolbar from '../../components/admin/AdminToolbar';

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
  const { t } = useTranslation();
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
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);

  const toDateInputValue = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const buildFormState = (coupon: Coupon | null): CouponFormState => {
    if (coupon) {
      return {
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
      };
    }

    return {
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
    };
  };

  const [form, setForm] = useState<CouponFormState>(buildFormState(null));
  const [initialForm, setInitialForm] = useState<CouponFormState>(buildFormState(null));

  const fetchCoupons = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getCoupons(page, 10);
      setCoupons(response.data);
      setTotalPages(response.pages);
      setTotalItems(response.total);
      setCurrentPage(response.page);
      setSelectedCouponIds([]);
    } catch {
      setError(t('admin.coupons.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const formatPrice = (price: number) => formatMoney(price, 'VND');

  const handleShowModal = (coupon: Coupon | null = null) => {
    setEditingCoupon(coupon);
    setModalError('');
    const nextForm = buildFormState(coupon);
    setForm(nextForm);
    setInitialForm(nextForm);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setForm(initialForm);
    setShowModal(false);
    setEditingCoupon(null);
    setModalError('');
  };

  const handleResetModal = () => {
    setForm(initialForm);
    setModalError('');
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
      setInitialForm(form);
    } catch (err: unknown) {
      type AxiosLikeError = { response?: { data?: { message?: string } }; message?: string };
      const e = err as AxiosLikeError;
      setModalError(e?.response?.data?.message || e?.message || t('admin.coupons.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleShowDisableSelected = () => {
    if (!selectedCouponIds.length) return;
    setShowDisableModal(true);
  };

  const toggleCouponSelection = (couponId: string) => {
    setSelectedCouponIds((prev) =>
      prev.includes(couponId)
        ? prev.filter((id) => id !== couponId)
        : [...prev, couponId],
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = coupons.map((coupon) => coupon._id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedCouponIds.includes(id));

    setSelectedCouponIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const next = new Set([...prev, ...visibleIds]);
      return Array.from(next);
    });
  };

  const handleDisable = async () => {
    if (!selectedCouponIds.length) return;
    try {
      await Promise.all(
        selectedCouponIds.map((couponId) => adminAPI.disableCoupon(couponId)),
      );
      await fetchCoupons(currentPage);
      setShowDisableModal(false);
      setSelectedCouponIds([]);
    } catch {
      setError(t('admin.coupons.disableError'));
    }
  };

  const isFormDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const allVisibleSelected =
    coupons.length > 0 &&
    coupons.every((coupon) => selectedCouponIds.includes(coupon._id));

  if (loading && !coupons.length) return <LoadingSpinner fullPage />;

  return (
    <div className="admin-page">
      <AdminPageHeader title={t('admin.coupons.title')} />

      <AdminToolbar
        left={
          selectedCouponIds.length > 0 ? (
            <Button
              variant="outline-danger"
              className="rounded-3 fw-semibold"
              onClick={handleShowDisableSelected}
            >
              <FaTrash className="me-2" />
              {t('admin.coupons.disable.selected', { count: selectedCouponIds.length })}
            </Button>
          ) : null
        }
        right={
          <Button variant="primary" className="rounded-3 fw-semibold" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" /> {t('admin.coupons.addNew')}
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
                    aria-label={t('admin.coupons.table.selectAll')}
                  />
                </th>
                <th>{t('admin.coupons.table.code')}</th>
                <th>{t('admin.coupons.table.type')}</th>
                <th>{t('admin.coupons.table.value')}</th>
                <th>{t('admin.coupons.table.minSubtotal')}</th>
                <th>{t('admin.coupons.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length > 0 ? (
                coupons.map((c) => (
                  <tr
                    key={c._id}
                    className={`admin-table__row--selectable ${selectedCouponIds.includes(c._id) ? 'admin-table__row--selected' : ''}`}
                    onClick={() => handleShowModal(c)}
                  >
                    <td
                      className="admin-table__checkbox-cell"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Form.Check
                        type="checkbox"
                        checked={selectedCouponIds.includes(c._id)}
                        onChange={() => toggleCouponSelection(c._id)}
                        aria-label={t('admin.coupons.table.selectCoupon')}
                      />
                    </td>
                    <td>
                      <strong>{c.code}</strong>
                      {c.name ? <div className="text-muted" style={{ fontSize: '0.9rem' }}>{c.name}</div> : null}
                    </td>
                    <td>{c.type === 'percent' ? t('admin.coupons.type.percent') : t('admin.coupons.type.fixed')}</td>
                    <td>
                      {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}
                      {c.type === 'percent' && typeof c.maxDiscountAmount === 'number'
                        ? <div className="text-muted" style={{ fontSize: '0.9rem' }}>{t('admin.coupons.max', { amount: formatPrice(c.maxDiscountAmount) })}</div>
                        : null}
                    </td>
                    <td>{typeof c.minSubtotal === 'number' ? formatPrice(c.minSubtotal) : '-'}</td>
                    <td>
                      <Badge bg={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? t('admin.coupons.status.active') : t('admin.coupons.status.inactive')}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4">{t('admin.coupons.table.empty')}</td>
                </tr>
              )}
            </tbody>
          </Table>
        }
        mobile={
          coupons.length > 0 ? (
            coupons.map((c) => (
                <div
                  key={c._id}
                  className={`admin-mobile-card admin-mobile-card--selectable ${selectedCouponIds.includes(c._id) ? 'admin-mobile-card--selected' : ''}`}
                  onClick={() => handleShowModal(c)}
                >
                  <div
                    className="admin-mobile-card__row"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="admin-mobile-card__label">{t('admin.coupons.table.select')}</span>
                    <span className="admin-mobile-card__value">
                      <Form.Check
                        type="checkbox"
                        checked={selectedCouponIds.includes(c._id)}
                        onChange={() => toggleCouponSelection(c._id)}
                        aria-label={t('admin.coupons.table.selectCoupon')}
                      />
                    </span>
                  </div>
                <div className="admin-mobile-card__row">
                  <span className="admin-mobile-card__label">{t('admin.coupons.table.code')}</span>
                  <span className="admin-mobile-card__value">{c.code}</span>
                </div>
                <div className="admin-mobile-card__row">
                  <span className="admin-mobile-card__label">{t('admin.coupons.table.type')}</span>
                  <span className="admin-mobile-card__value">{c.type === 'percent' ? t('admin.coupons.type.percent') : t('admin.coupons.type.fixed')}</span>
                </div>
                <div className="admin-mobile-card__row">
                  <span className="admin-mobile-card__label">{t('admin.coupons.table.value')}</span>
                  <span className="admin-mobile-card__value">
                    {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}
                  </span>
                </div>
                <div className="admin-mobile-card__row">
                  <span className="admin-mobile-card__label">{t('admin.coupons.table.status')}</span>
                  <span className="admin-mobile-card__value">
                    <Badge bg={c.isActive ? 'success' : 'secondary'}>
                      {c.isActive ? t('admin.coupons.status.active') : t('admin.coupons.status.inactive')}
                    </Badge>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">{t('admin.coupons.table.empty')}</div>
          )
        }
        footer={
          <>
            <div>{t('admin.coupons.pagination', { shown: coupons.length, total: totalItems })}</div>
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        }
      />

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered dialogClassName="admin-modal">
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingCoupon ? t('admin.coupons.modal.editTitle') : t('admin.coupons.modal.createTitle')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalError && <Alert variant="danger">{modalError}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>{t('admin.coupons.modal.code')}</Form.Label>
              <Form.Control
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder={t('admin.coupons.modal.codePlaceholder')}
                required
                disabled={saving}
                className="focus-ring"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('admin.coupons.modal.name')}</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('admin.coupons.modal.namePlaceholder')}
                disabled={saving}
                className="focus-ring"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('admin.coupons.modal.description')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={t('admin.coupons.modal.descriptionPlaceholder')}
                disabled={saving}
                className="focus-ring"
              />
            </Form.Group>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>{t('admin.coupons.modal.type')}</Form.Label>
                  <Form.Select name="type" value={form.type} onChange={handleChange} disabled={saving}>
                    <option value="percent">{t('admin.coupons.type.percent')}</option>
                    <option value="fixed">{t('admin.coupons.type.fixed')}</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>{t('admin.coupons.modal.value')}</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="value"
                    value={form.value}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    className="focus-ring"
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>{t('admin.coupons.modal.maxDiscountAmount')}</Form.Label>
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
                  <Form.Label>{t('admin.coupons.modal.minSubtotal')}</Form.Label>
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
                  <Form.Label>{t('admin.coupons.modal.startsAt')}</Form.Label>
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
                  <Form.Label>{t('admin.coupons.modal.endsAt')}</Form.Label>
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
                  <Form.Label>{t('admin.coupons.modal.usageLimitTotal')}</Form.Label>
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
                  <Form.Label>{t('admin.coupons.modal.usageLimitPerUser')}</Form.Label>
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
                label={t('admin.coupons.modal.active')}
                checked={form.isActive}
                onChange={handleChange}
                disabled={saving}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleResetModal} disabled={saving || !isFormDirty}>
              {t('admin.coupons.modal.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !isFormDirty}>
              {saving ? t('admin.coupons.modal.saving') : t('admin.coupons.modal.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Disable Confirmation Modal */}
      <Modal show={showDisableModal} onHide={() => setShowDisableModal(false)} dialogClassName="admin-modal">
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.coupons.disable.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t('admin.coupons.disable.bodySelected', { count: selectedCouponIds.length })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDisableModal(false)}>
            {t('admin.coupons.disable.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDisable}>
            {t('admin.coupons.disable.confirmSelected')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminCoupons;
