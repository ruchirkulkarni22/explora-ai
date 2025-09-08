// client/src/App.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react'; // For the loading fallback

// --- Import only necessary page components ---
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BrdGeneratorPage = lazy(() => import('./pages/BrdGeneratorPage'));
const TestCaseGeneratorPage = lazy(() => import('./pages/TestCaseGeneratorPage'));
const TrainingDeckGeneratorPage = lazy(() => import('./pages/TrainingDeckGeneratorPage'));

// --- Layout Components (Header & Footer) ---
// These components were missing from the previous version.
const Header = () => {
    // Simplified header without login/logout functionality
    return (
        <header className="bg-white shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <Link to="/" className="text-3xl font-extrabold" style={{ color: '#40c1ac' }}>
                        Explora
                    </Link>
                    {/* No user menu needed */}
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
                        {/* All routes are now directly accessible */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/brd-generator" element={<BrdGeneratorPage />} />
                        <Route path="/test-case-generator" element={<TestCaseGeneratorPage />} />
                        <Route path="/training-deck-generator" element={<TrainingDeckGeneratorPage />} />
                        
                        {/* Redirect any other routes to landing page */}
                        <Route path="*" element={<LandingPage />} />
                    </Routes>
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
