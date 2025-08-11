// App.jsx
// I have updated the UI based on your feedback.
// 1. The Explora logo in the Header now uses the color #40c1ac.
// 2. The "Sign in with Microsoft" button on the LoginPage now includes the official Microsoft logo.
// 3. The initial loading animation has been replaced with a simple, clean spinner.

import React, { useState, useEffect } from 'react';

// It's best practice to keep page components in their own files, so we'll continue to import them.
import LandingPage from './LandingPage.jsx';
import BrdGeneratorPage from './BrdGeneratorPage.jsx';
import TestCaseGeneratorPage from './TestCaseGeneratorPage.jsx';
import TrainingDeckGeneratorPage from './TrainingDeckGeneratorPage.jsx';

// All icons are imported at the top level.
import { LogOut, ShieldCheck } from 'lucide-react';

// --- Helper Component Definitions ---

/**
 * Header Component: Displays the app name and user status.
 */
function Header({ user, onLogout, onNavigateHome }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
        <header className="bg-white shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Left side: App Name / Logo */}
                    <div 
                        className="text-3xl font-extrabold cursor-pointer"
                        onClick={onNavigateHome}
                    >
                        <span style={{ color: '#40c1ac' }}>
                            Explora
                        </span>
                    </div>

                    {/* Right side: User Info or Login Button */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            // Logged-in state: User avatar and dropdown
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-3"
                                >
                                    <span className="font-semibold text-gray-700 hidden sm:inline">{user.name}</span>
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                        {user.initials}
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
                                        <button
                                            onClick={onLogout}
                                            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Logged-out state: Text indicating user should log in
                            <span className="text-gray-500 italic">Please log in to continue</span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

/**
 * Footer Component: A simple, clean footer for a professional finish.
 */
function Footer() {
    return (
        <footer className="bg-white mt-auto border-t">
            <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-gray-500">
                <p>&copy; {new Date().getFullYear()} Explora. All rights reserved.</p>
                <p className="text-sm mt-1">
                    Powered by AI, built for privacy and efficiency.
                </p>
            </div>
        </footer>
    );
}

/**
 * LoginPage Component: The dedicated screen for unauthenticated users.
 */
function LoginPage({ onLogin }) {
    return (
        <div className="flex flex-col items-center justify-center text-center -mt-10">
             <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-12 h-12" style={{color: '#40c1ac'}} />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Welcome to Explora</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl">
                Please sign in with your corporate Microsoft account to access the AI-powered document generation tools.
            </p>
            <div className="mt-8">
                <button
                    onClick={onLogin}
                    className="flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-sm hover:bg-gray-50 transition-all transform hover:scale-105"
                >
                    <svg className="w-6 h-6" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.91602 9.91614H0V0H9.91602V9.91614Z" fill="#F25022"/>
                        <path d="M21 9.91614H11.084V0H21V9.91614Z" fill="#7FBA00"/>
                        <path d="M9.91602 21H0V11.0839H9.91602V21Z" fill="#00A4EF"/>
                        <path d="M21 21H11.084V11.0839H21V21Z" fill="#FFB900"/>
                    </svg>
                    <span>Sign in with Microsoft</span>
                </button>
            </div>
            <p className="mt-6 text-sm text-gray-500">
                Your data is processed securely and is never stored permanently.
            </p>
        </div>
    );
}

/**
 * UPDATED: LoadingScreen Component
 * This now uses a simple and clean CSS spinner animation.
 */
function LoadingScreen() {
    return (
        <>
            {/* We can inject CSS directly for simple animations like this */}
            <style>
                {`
                    .loader {
                        border: 4px solid #f3f3f3; /* Light grey */
                        border-top: 4px solid #40c1ac; /* Explora color */
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center">
                <div className="loader"></div>
                <p className="mt-4 text-gray-500">Loading...</p>
            </div>
        </>
    );
}


// --- Main App Component ---
// This is the root component that will be rendered.
// It manages the state for the current page and the logged-in user.

// Mock user data for demonstration purposes.
const MOCK_USER = {
    name: 'Ruchir Kulkarni',
    email: 'ruchir.kulkarni@calfus.com',
    initials: 'RK'
};

export default function App() {
    const [page, setPage] = useState('landing');
    const [user, setUser] = useState(null); // 'null' means logged out
    const [isLoading, setIsLoading] = useState(true);

    // Simulate checking for an existing session on component mount
    useEffect(() => {
        const sessionCheckTimeout = setTimeout(() => {
            setIsLoading(false);
        }, 2000); // Increased time to better see the new animation
        return () => clearTimeout(sessionCheckTimeout);
    }, []);


    const handleLogin = () => {
        console.log("Simulating user login...");
        setUser(MOCK_USER);
        setPage('landing');
    };

    const handleLogout = () => {
        console.log("Simulating user logout...");
        setUser(null);
        setPage('landing');
    };

    const navigateTo = (pageName) => {
        setPage(pageName);
    };

    // Renders the main content based on the current page state
    const renderContent = () => {
        switch (page) {
            case 'brdGenerator':
                return <BrdGeneratorPage onBack={() => navigateTo('landing')} />;
            case 'testCaseGenerator':
                return <TestCaseGeneratorPage onBack={() => navigateTo('landing')} />;
            case 'trainingDeckGenerator':
                return <TrainingDeckGeneratorPage onBack={() => navigateTo('landing')} />;
            case 'landing':
            default:
                return <LandingPage onNavigate={navigateTo} />;
        }
    };

    // Show the new LoadingScreen component during the initial session check
    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="bg-gray-50 min-h-screen font-sans flex flex-col">
            <Header user={user} onLogout={handleLogout} onNavigateHome={() => setPage('landing')} />
            
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                {/* If the user is logged in, show the main content. Otherwise, show the login page. */}
                {user ? renderContent() : <LoginPage onLogin={handleLogin} />}
            </main>

            <Footer />
        </div>
    );
}
