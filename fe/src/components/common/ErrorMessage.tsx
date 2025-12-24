import React from 'react';
import { Alert } from 'react-bootstrap';

interface ErrorMessageProps {
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    onClose?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, variant = 'danger', onClose }) => {
    return (
        <Alert variant={variant} dismissible={!!onClose} onClose={onClose} className="my-3">
            {message}
        </Alert>
    );
};

export default ErrorMessage;
