import React from 'react';

interface AdminToolbarProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
}

const AdminToolbar: React.FC<AdminToolbarProps> = ({ left, right }) => {
    if (!left && !right) return null;

    return (
        <div className="surface-card admin-toolbar p-3">
            <div className="admin-toolbar__left">{left}</div>
            <div className="admin-toolbar__right">{right}</div>
        </div>
    );
};

export default AdminToolbar;
