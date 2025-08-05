// client/src/App.js
// This file now acts as a simple router, controlling which page is displayed.
// This improves modularity and makes the project easier to manage.

import React, { useState } from 'react';
import LandingPage from './LandingPage';
import BrdGeneratorPage from './BrdGeneratorPage';
import TestCaseGeneratorPage from './TestCaseGeneratorPage';
import './App.css'; // Assuming you have a general CSS file

export default function App() {
    // State to control which page is visible.
    // 'landing', 'brdGenerator', 'testCaseGenerator'
    const [page, setPage] = useState('landing');

    // Function to navigate between pages, passed down as a prop.
    const navigateTo = (pageName) => {
        setPage(pageName);
    };

    // Render the correct page component based on the current state.
    const renderContent = () => {
        switch (page) {
            case 'brdGenerator':
                return <BrdGeneratorPage onBack={() => navigateTo('landing')} />;
            case 'testCaseGenerator':
                return <TestCaseGeneratorPage onBack={() => navigateTo('landing')} />;
            case 'landing':
            default:
                return <LandingPage onNavigate={navigateTo} />;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {renderContent()}
            </div>
        </div>
    );
}