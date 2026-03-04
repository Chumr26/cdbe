import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FaChartLine, FaBoxOpen, FaShoppingCart, FaUsers, FaTags } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const AdminShell: React.FC = () => {
    const { t } = useTranslation();

    const navItems = [
        { to: '/admin', label: t('admin.nav.dashboard'), icon: <FaChartLine /> },
        { to: '/admin/products', label: t('admin.nav.products'), icon: <FaBoxOpen /> },
        { to: '/admin/orders', label: t('admin.nav.orders'), icon: <FaShoppingCart /> },
        { to: '/admin/users', label: t('admin.nav.users'), icon: <FaUsers /> },
        { to: '/admin/coupons', label: t('admin.nav.coupons'), icon: <FaTags /> },
    ];

    return (
        <div className="container-fluid py-3 py-lg-4 admin-shell">
            <div className="admin-shell__layout">
                <aside className="surface-card admin-sidebar p-3 p-lg-4">
                    <div className="admin-sidebar__title">{t('admin.nav.panel')}</div>
                    <nav className="admin-sidebar__nav" aria-label="Admin navigation">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/admin'}
                                className={({ isActive }) =>
                                    `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                                }
                            >
                                <span className="admin-sidebar__icon" aria-hidden="true">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <section className="admin-shell__content">
                    <Outlet />
                </section>
            </div>
        </div>
    );
};

export default AdminShell;
