// client/src/context/AuthProvider.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkUserSession = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUserSession();
    }, [checkUserSession]);

    // --- NEW: Add this useEffect to sync logout across tabs ---
    useEffect(() => {
        const handleStorageChange = (event) => {
            // This event fires in other tabs when localStorage changes.
            if (event.key === 'logout') {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setUser(data);
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const signup = async (name, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            setUser(data);
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Signup failed');
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            setUser(null);
            // --- NEW: Trigger the storage event for other tabs ---
            // This notifies other tabs that a logout has occurred.
            window.localStorage.setItem('logout', Date.now());
        }
    };

    const authContextValue = {
        user,
        loading,
        login,
        signup,
        logout,
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
