// client/src/pages/LoginPage.jsx
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            navigate('/'); // Redirect to home page on successful login
        } catch (err) {
            setError(err.message || 'Failed to login. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center -mt-10">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-12 h-12 text-teal-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Welcome Back</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-md">
                Sign in to your Explora account to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
                <div className="flex flex-col gap-4">
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 transition"
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 transition"
                    />
                </div>
                {/* --- NEW: Add the "Forgot Password?" link --- */}
                <div className="text-right mt-2">
                    <Link to="/forgot-password" className="text-sm font-semibold text-teal-600 hover:underline">
                        Forgot Password?
                    </Link>
                </div>
                {error && <p className="mt-4 text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-all disabled:bg-gray-400"
                >
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
            <p className="mt-6 text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-teal-600 hover:underline">
                    Sign Up
                </Link>
            </p>
        </div>
    );
}
