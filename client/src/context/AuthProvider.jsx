// client/src/context/AuthProvider.jsx
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';
import { AuthContext } from './AuthContext'; // Import the context from the separate file

// This component is now the single default export from its own file.
export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({
                        id: decoded.user.id,
                        role: decoded.user.role,
                        name: decoded.user.name,
                        email: decoded.user.email,
                    });
                }
            } catch (error) {
                console.error("Invalid token:", error);
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            const decoded = jwtDecode(data.token);
            setUser({
                id: decoded.user.id,
                role: decoded.user.role,
                name: decoded.user.name,
                email: decoded.user.email,
            });
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const signup = async (name, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            localStorage.setItem('token', data.token);
            const decoded = jwtDecode(data.token);
            setUser({
                id: decoded.user.id,
                role: decoded.user.role,
                name: name,
                email: email,
            });
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Signup failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
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
