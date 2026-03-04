import React from 'react';
import { Card } from 'react-bootstrap';

interface AdminDataSectionProps {
    desktop: React.ReactNode;
    mobile?: React.ReactNode;
    footer?: React.ReactNode;
}

const AdminDataSection: React.FC<AdminDataSectionProps> = ({ desktop, mobile, footer }) => {
    return (
        <Card className="border-0 surface-card admin-data-section">
            <Card.Body className="p-0">
                <div className="admin-data-section__desktop">{desktop}</div>
                {mobile ? <div className="admin-data-section__mobile">{mobile}</div> : null}
            </Card.Body>
            {footer ? (
                <Card.Footer className="d-flex justify-content-between align-items-center bg-transparent border-0 pt-3">
                    {footer}
                </Card.Footer>
            ) : null}
        </Card>
    );
};

export default AdminDataSection;
