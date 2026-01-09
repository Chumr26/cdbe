/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../api/auth.api';
import type { User, LoginCredentials, RegisterData } from '../api/auth.api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
    login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const loadUser = async () => {
            // Check localStorage ("Remember Me") first, then sessionStorage
            const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

            if (storedToken && storedUser) {
                setToken(storedToken);

                try {
                    // Handle potential invalid JSON or "undefined" string in localStorage
                    if (storedUser === "undefined") throw new Error("Invalid stored user");
                    setUser(JSON.parse(storedUser));
                } catch (parseError) {
                    console.error("Error parsing stored user:", parseError);
                    localStorage.removeItem('user');
                    // We can still try to fetch profile if token exists
                }

                // Verify token is still valid by fetching profile
                try {
                    const response = await authAPI.getProfile();
                    setUser(response.data);
                    localStorage.setItem('user', JSON.stringify(response.data));
                } catch {
                    // Token invalid, clear storage
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const login = async (credentials: LoginCredentials, rememberMe: boolean = false) => {
        const response = await authAPI.login(credentials);
        setToken(response.token);
        setUser(response.data);

        if (rememberMe) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.data));
        } else {
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('user', JSON.stringify(response.data));
        }
    };

    const register = async (data: RegisterData) => {
        await authAPI.register(data);
        // Do not auto-login after registration anymore because of email verification
        // The API now returns a message, handled by the caller
    };

    const logout = () => {
        authAPI.logout().catch(() => {
            // Ignore errors on logout
        });
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        register,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
