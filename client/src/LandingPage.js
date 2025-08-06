// client/src/LandingPage.js
// This new component displays the main landing page with the feature cards.

import React from 'react';
import { FileText, TestTube2, Presentation } from 'lucide-react';

// Reusable Card component for the landing page
const Card = ({ icon, title, description, enabled = false, onClick }) => (
    <div 
        onClick={enabled ? onClick : null} 
        className={`bg-white rounded-2xl p-8 shadow-lg transition-all duration-300 ease-in-out transform ${
            enabled 
            ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2 border-2 border-transparent hover:border-indigo-500' 
            : 'opacity-50 cursor-not-allowed'
        }`}
    >
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-6">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{description}</p>
        {!enabled && (
            <div className="mt-4 inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                Work in Progress
            </div>
        )}
    </div>
);

export default function LandingPage({ onNavigate }) {
    return (
        <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-800 mb-4">
                Welcome to <span className="text-indigo-600">Explora</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-16">
                Your AI-powered assistant for transforming project inputs into structured, actionable documents with a focus on privacy.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                <Card 
                    icon={<FileText className="w-8 h-8 text-indigo-600" />} 
                    title="Create BRD & Process Flows" 
                    description="Upload meeting notes or transcripts to generate a comprehensive BRD and process flow diagrams." 
                    enabled={true} 
                    onClick={() => onNavigate('brdGenerator')} 
                />
                <Card 
                    icon={<TestTube2 className="w-8 h-8 text-green-600" />} 
                    title="Generate Test Cases" 
                    description="Analyze a BRD to automatically generate detailed test case scenarios in an Excel file." 
                    enabled={true} 
                    onClick={() => onNavigate('testCaseGenerator')}
                />
                <Card 
                    icon={<Presentation className="w-8 h-8 text-gray-600" />} 
                    title="Build Training Decks" 
                    description="Provide project documents to instantly create a professional PowerPoint presentation." 
                    enabled={false} 
                />
            </div>
        </div>
    );
}