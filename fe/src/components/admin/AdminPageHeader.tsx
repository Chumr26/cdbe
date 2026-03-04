import React from 'react';

interface AdminPageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle, actions }) => {
    return (
        <div className="admin-page-header">
            <div>
                <h1 className="section-title mb-1">{title}</h1>
                {subtitle ? <p className="text-muted mb-0">{subtitle}</p> : null}
            </div>
            {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
        </div>
    );
};

export default AdminPageHeader;
