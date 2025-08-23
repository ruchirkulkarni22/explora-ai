// client/src/pages/SignupPage.jsx
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

export default function SignupPage() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signup(formData.name, formData.email, formData.password);
            navigate('/'); // Redirect to home on successful signup
        } catch (err) {
            setError(err.message || 'Failed to create account. The email might already be in use.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center -mt-10">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="w-12 h-12 text-teal-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Create Your Account</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-md">
                Join Explora to start generating documents with AI.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 transition"
                    />
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
                        placeholder="Password (min. 6 characters)"
                        value={formData.password}
                        onChange={handleChange}
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
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>
            <p className="mt-6 text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-teal-600 hover:underline">
                    Sign In
                </Link>
            </p>
        </div>
    );
}
