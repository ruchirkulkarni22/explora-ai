// client/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Mail, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // --- NEW: State to hold the reset token ---
    const [resetToken, setResetToken] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setResetToken(null); // Clear previous token
        setLoading(true);
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setMessage('Reset link generated below (for development):');
            // --- NEW: Save the received token to state ---
            setResetToken(data.resetToken);
        } catch (err) {
            setError(err.response?.data?.error || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center -mt-10">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-12 h-12 text-teal-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Forgot Your Password?</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-md">
                Enter your email address to generate a password reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
                <div className="flex flex-col gap-4">
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 transition"
                    />
                </div>
                
                {error && <p className="mt-4 text-red-600">{error}</p>}
                
                <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-all disabled:bg-gray-400"
                >
                    {loading ? 'Generating...' : 'Generate Reset Link'}
                </button>
            </form>

            {/* --- NEW: Display the clickable reset link if it exists --- */}
            {resetToken && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg w-full max-w-sm text-center">
                    <p className="font-semibold text-green-800">{message}</p>
                    <Link
                        to={`/reset-password/${resetToken}`}
                        className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-blue-600 hover:underline break-all"
                    >
                        <KeyRound className="w-5 h-5" />
                        Click here to reset your password
                    </Link>
                </div>
            )}

            <p className="mt-6 text-gray-600">
                Remembered your password?{' '}
                <Link to="/login" className="font-semibold text-teal-600 hover:underline">
                    Sign In
                </Link>
            </p>
        </div>
    );
}
