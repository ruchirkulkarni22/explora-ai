// clientVite/src/App.jsx
import React, { useState } from 'react';
import LandingPage from './LandingPage.jsx';
import BrdGeneratorPage from './BrdGeneratorPage.jsx';
import TestCaseGeneratorPage from './TestCaseGeneratorPage.jsx';
import TrainingDeckGeneratorPage from './TrainingDeckGeneratorPage.jsx';
import './App.css';

export default function App() {
    const [page, setPage] = useState('landing');

    const navigateTo = (pageName) => {
        setPage(pageName);
    };

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

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {renderContent()}
            </div>
        </div>
    );
}