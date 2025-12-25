import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { CartProvider } from '../../context/CartContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <CartProvider>
            <div className="d-flex flex-column min-vh-100">
                <Header />
                <main className="flex-grow-1" style={{ paddingTop: '56px' }}>
                    {children}
                </main>
                <Footer />
            </div>
        </CartProvider>
    );
};

export default Layout;
