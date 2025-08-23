// client/src/pages/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useParams(); // Get the token from the URL
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { data } = await api.post(`/auth/reset-password/${token}`, { password });
            setMessage(data.message);
            setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
        } catch (err) {
            setError(err.response?.data?.error || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center -mt-10">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <KeyRound className="w-12 h-12 text-teal-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Reset Your Password</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-md">
                Enter a new password for your account below.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
                <div className="flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="New Password (min. 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 transition"
                    />
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 transition"
                    />
                </div>
                {message && <p className="mt-4 text-green-600 font-semibold">{message}</p>}
                {error && <p className="mt-4 text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={loading || message} // Disable button after success
                    className="mt-6 w-full bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-all disabled:bg-gray-400"
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
        </div>
    );
}
