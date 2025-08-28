// client/src/components/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    // If we are still checking for a token, show a loading indicator.
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    // If there is no user, redirect to the login page, preserving the location.
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If the route is for admins only and the user is not an admin,
    // redirect to an "Access Denied" page or the home page.
    // Preserving the state helps if you want to show a specific message.
    if (adminOnly && user.role !== 'admin') {
        // You could create a dedicated /access-denied page for a better UX
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // If all checks pass, render the requested page.
    return children;
};

export default ProtectedRoute;
