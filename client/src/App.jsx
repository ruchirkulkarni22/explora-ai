// client/src/App.jsx
import React, { useContext, useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Loader2 } from 'lucide-react'; // For the loading fallback

// --- MODIFIED: Dynamically import all page and route components ---
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BrdGeneratorPage = lazy(() => import('./pages/BrdGeneratorPage'));
const TestCaseGeneratorPage = lazy(() => import('./pages/TestCaseGeneratorPage'));
const TrainingDeckGeneratorPage = lazy(() => import('./pages/TrainingDeckGeneratorPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// --- Icon Imports ---
import { LogOut, BarChart3 } from 'lucide-react';

// --- Layout Components (Header & Footer) ---
// These components were missing from the previous version.
const Header = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <Link to="/" className="text-3xl font-extrabold" style={{ color: '#40c1ac' }}>
                        Explora
                    </Link>
                    {user && (
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-3"
                            >
                                <span className="font-semibold text-gray-700 hidden sm:inline">{user.name}</span>
                                 <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-lg">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </button>
                            {dropdownOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-1 border"
                                    onMouseLeave={() => setDropdownOpen(false)}
                                >
                                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                                        Signed in as <br/>
                                        <strong className="text-gray-700 truncate block">{user.email}</strong>
                                    </div>
                                    {user.role === 'admin' && (
                                        <Link
                                            to="/admin"
                                            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <BarChart3 className="w-4 h-4" /> Admin Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const Footer = () => (
    <footer className="bg-white mt-auto border-t">
        <div className="container mx-auto py-6 px-4 text-center text-gray-500">
            &copy; {new Date().getFullYear()} Explora. All rights reserved.
        </div>
    </footer>
);

// --- NEW: Create a loading fallback component for Suspense ---
const LoadingFallback = () => (
    <div className="flex justify-center items-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
    </div>
);


export default function App() {
    return (
        <div className="bg-gray-50 min-h-screen font-sans flex flex-col">
            {/* --- FIX: Uncommented the Header and Footer --- */}
            <Header />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* --- MODIFIED: Wrap Routes in Suspense --- */}
                <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                        {/* Protected Routes */}
                        <Route path="/" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
                        <Route path="/brd-generator" element={<ProtectedRoute><BrdGeneratorPage /></ProtectedRoute>} />
                        <Route path="/test-case-generator" element={<ProtectedRoute><TestCaseGeneratorPage /></ProtectedRoute>} />
                        <Route path="/training-deck-generator" element={<ProtectedRoute><TrainingDeckGeneratorPage /></ProtectedRoute>} />
                        
                        {/* Admin Only Route */}
                        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboardPage /></ProtectedRoute>} />
                    </Routes>
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
