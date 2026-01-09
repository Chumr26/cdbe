/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { cartAPI } from '../api/cart.api';
import type { Cart } from '../api/cart.api';
import { useAuth } from './AuthContext';

interface CartContextType {
    cartItems: string[]; // Array of product IDs in cart
    cartCount: number; // Total number of items
    isInCart: (productId: string) => boolean;
    addToCart: (productId: string, quantity?: number) => Promise<void>;
    refreshCart: () => Promise<void>;
    triggerBounce: () => void;
    isBouncing: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [cartItems, setCartItems] = useState<string[]>([]);
    const [cartCount, setCartCount] = useState(0);
    const [isBouncing, setIsBouncing] = useState(false);

    // Load cart data
    const refreshCart = useCallback(async () => {
        if (!isAuthenticated) {
            setCartItems([]);
            setCartCount(0);
            return;
        }

        try {
            const response = await cartAPI.getCart();
            const cart: Cart = response.data;

            // Extract product IDs from cart items
            const productIds = cart.items.map(item => item.productId._id);
            setCartItems(productIds);

            // Calculate total count
            // Calculate total count (distinct items)
            const count = cart.items.length;
            setCartCount(count);
        } catch {
            // Cart might be empty or error occurred
            setCartItems([]);
            setCartCount(0);
        }
    }, [isAuthenticated]);

    // Load cart on mount and when auth changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshCart();
    }, [refreshCart]);

    // Check if a product is in cart
    const isInCart = useCallback((productId: string): boolean => {
        return cartItems.includes(productId);
    }, [cartItems]);

    // Trigger bounce animation
    const triggerBounce = useCallback(() => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500);
    }, []);

    // Add item to cart with bounce animation
    const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
        try {
            await cartAPI.addToCart(productId, quantity);
            await refreshCart();
            triggerBounce();

            // Show success toast
            const notification = document.createElement('div');
            notification.className = 'alert alert-success position-fixed start-50 translate-middle-x mt-3';
            notification.style.zIndex = '9999';
            notification.style.top = '60px';
            notification.textContent = '✓ Product added to cart!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } catch (error: unknown) {
            // Show error toast
            const notification = document.createElement('div');
            notification.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
            notification.style.zIndex = '9999';
            const message = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message || error.message
                : error instanceof Error
                    ? error.message
                    : 'Failed to add to cart';
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            throw error;
        }
    }, [refreshCart, triggerBounce]);

    const value: CartContextType = {
        cartItems,
        cartCount,
        isInCart,
        addToCart,
        refreshCart,
        triggerBounce,
        isBouncing,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
