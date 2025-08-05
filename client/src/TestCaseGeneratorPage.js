// client/src/TestCaseGeneratorPage.js
// This new component handles the UI and logic for the Test Case Generation feature.
// **UPDATED** with a new "Test Case Card" preview for better UX.

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { UploadCloud, ChevronLeft, AlertCircle, Sparkles, XCircle, Download, CheckCircle, Star, ListOrdered } from 'lucide-react';

// --- Reusable Helper Components ---

const FileUploader = ({ onFileSelect, selectedFiles, onFileRemove }) => (
    <div className="w-full max-w-2xl mx-auto">
        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-2xl border-4 border-dashed border-gray-300 flex flex-col items-center justify-center p-12 transition-all hover:border-indigo-400">
            <UploadCloud className="w-16 h-16 text-gray-400 mb-4" />
            <span className="text-xl font-semibold text-gray-700">{selectedFiles.length > 0 ? "Add more files or generate" : "Click to upload your BRD"}</span>
            <p className="text-gray-500 mt-2">(.docx, .txt, .md)</p>
        </label>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => onFileSelect(e.target.files)} accept=".docx,.txt,.md" />
        
        {selectedFiles.length > 0 && (
            <div className="mt-6">
                <h4 className="font-semibold text-gray-700 text-center mb-3">Selected Files:</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                    {selectedFiles.map((file, index) => (
                        <li key={index} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm">
                            <span className="text-gray-800 truncate pr-2">{file.name}</span>
                            <button onClick={() => onFileRemove(index)} className="text-red-500 hover:text-red-700">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

const LoadingSpinner = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8">
        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 className="text-xl font-semibold text-gray-800">Generating Test Cases...</h3>
        <p className="text-indigo-700 font-semibold mt-2">{message}</p>
    </div>
);

const ErrorDisplay = ({ message, onRetry }) => (
    <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg max-w-3xl mx-auto">
        <div className="flex">
            <div className="py-1"><AlertCircle className="h-6 w-6 text-red-400 mr-4" /></div>
            <div>
                <p className="text-xl font-bold text-red-800">An Error Occurred</p>
                <p className="mt-2 text-md text-red-700">{message}</p>
                <button onClick={onRetry} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Try Again</button>
            </div>
        </div>
    </div>
);

// **NEW**: Success screen component with card-based preview
const SuccessDisplay = ({ generatedFile, onDownload, onReset }) => {
    const previewData = generatedFile.preview || [];

    const PriorityBadge = ({ priority }) => {
        const lowerPriority = priority.toLowerCase();
        let colorClasses = "bg-gray-100 text-gray-800";
        if (lowerPriority.includes("critical")) {
            colorClasses = "bg-red-100 text-red-800";
        } else if (lowerPriority.includes("high")) {
            colorClasses = "bg-yellow-100 text-yellow-800";
        } else if (lowerPriority.includes("medium")) {
            colorClasses = "bg-blue-100 text-blue-800";
        }
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}><Star className="w-3 h-3 mr-1.5" />{priority}</span>;
    };

    return (
        <div className="text-center p-8 bg-green-50 rounded-2xl max-w-7xl mx-auto border-2 border-green-200">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Generation Complete!</h2>
            <p className="text-gray-600 mb-8">Your test case document with a live dashboard is ready to download.</p>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 text-left">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Document Preview</h3>
                <div className="space-y-4">
                    {previewData.map(testCase => (
                        <div key={testCase.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-indigo-700">{testCase.id}</h4>
                                <PriorityBadge priority={testCase.priority} />
                            </div>
                            <p className="text-gray-600 mt-1 mb-3">{testCase.summary}</p>
                            <div className="border-t border-gray-200 pt-2">
                                <h5 className="font-semibold text-sm text-gray-500 mb-2 flex items-center"><ListOrdered className="w-4 h-4 mr-2"/>Steps:</h5>
                                <ol className="list-decimal list-inside text-sm space-y-1">
                                    {testCase.steps.map(step => (
                                        <li key={step.number} className="text-gray-700">{step.description}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={onDownload} className="w-full sm:w-auto bg-indigo-600 text-white font-bold text-lg py-4 px-10 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center">
                    <Download className="w-6 h-6 mr-3" />
                    Download "{generatedFile.fileName}"
                </button>
                <button onClick={onReset} className="w-full sm:w-auto text-indigo-600 font-semibold hover:underline">
                    Generate Another
                </button>
            </div>
        </div>
    );
};


// --- Main Page Component ---
export default function TestCaseGeneratorPage({ onBack }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [generatedFile, setGeneratedFile] = useState(null);

    const resetState = useCallback(() => {
        setSelectedFiles([]);
        setIsLoading(false);
        setError(null);
        setLoadingMessage('');
        setIsSuccess(false);
        setGeneratedFile(null);
    }, []);

    const handleFileSelect = (files) => {
        if (files) {
            const newFiles = Array.from(files);
            const uniqueNewFiles = newFiles.filter(newFile => !selectedFiles.some(existingFile => existingFile.name === newFile.name));
            setSelectedFiles(prevFiles => [...prevFiles, ...uniqueNewFiles]);
        }
    };

    const handleFileRemove = (indexToRemove) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleDownload = () => {
        if (!generatedFile) return;
        const byteCharacters = atob(generatedFile.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: generatedFile.contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', generatedFile.fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            setError("Please select at least one file.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setIsSuccess(false);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            setLoadingMessage("Scanning documents and generating test cases...");
            const response = await axios.post('http://localhost:3001/api/generate-test-cases', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setGeneratedFile(response.data);
            setIsSuccess(true);

        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message={loadingMessage} />;
        }
        if (isSuccess) {
            return <SuccessDisplay generatedFile={generatedFile} onDownload={handleDownload} onReset={resetState} />;
        }
        return (
            <>
                <FileUploader onFileSelect={handleFileSelect} selectedFiles={selectedFiles} onFileRemove={handleFileRemove} />
                
                {error && <div className="mt-8"><ErrorDisplay message={error} onRetry={handleSubmit} /></div>}

                <div className="text-center mt-8">
                    <button 
                        onClick={handleSubmit} 
                        disabled={selectedFiles.length === 0} 
                        className="bg-indigo-600 text-white font-bold text-lg py-4 px-10 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 flex items-center justify-center mx-auto"
                    >
                        <Sparkles className="w-6 h-6 mr-3" />
                        Generate Test Cases
                    </button>
                </div>
            </>
        );
    };

    return (
        <div>
            <button onClick={onBack} className="flex items-center text-indigo-600 font-semibold mb-8 hover:text-indigo-800 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-2" />Back to Home
            </button>
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-3">Test Case Generation</h1>
                <p className="text-lg text-gray-500 max-w-3xl mx-auto">Upload a Business Requirements Document (BRD) to automatically generate test cases in an Excel format.</p>
            </div>
            {renderContent()}
        </div>
    );
}
