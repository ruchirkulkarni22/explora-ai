// client/src/App.js
// **DEFINITIVE FIX**: This version handles the new server response, which provides
// both a viewable HTML file and a separate editable .txt file for process flows.
// The UI is updated to present both options clearly to the user.

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { FileText, TestTube2, Presentation, Loader2, UploadCloud, ChevronLeft, AlertCircle, CheckCircle, Download, KeyRound, Sparkles, Workflow, Square, CheckSquare, XCircle, FileArchive, Eye, FileCode2 } from 'lucide-react';

// --- Helper Components ---
const Card = ({ icon, title, description, enabled = false, onClick }) => (
    <div onClick={enabled ? onClick : null} className={`bg-white rounded-2xl p-8 shadow-lg transition-all duration-300 ease-in-out transform ${enabled ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2 border-2 border-transparent hover:border-indigo-500' : 'opacity-50 cursor-not-allowed'}`}>
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-6">{icon}</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{description}</p>
        {!enabled && <div className="mt-4 inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">Work in Progress</div>}
    </div>
);

const FileUploader = ({ onFileSelect, selectedFiles, onFileRemove }) => (
    <div className="w-full max-w-2xl mx-auto">
        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-2xl border-4 border-dashed border-gray-300 flex flex-col items-center justify-center p-12 transition-all hover:border-indigo-400">
            <UploadCloud className="w-16 h-16 text-gray-400 mb-4" />
            <span className="text-xl font-semibold text-gray-700">{selectedFiles.length > 0 ? "Add more files or generate" : "Click to upload your documents"}</span>
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
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
        <h3 className="text-2xl font-semibold text-gray-700">Processing your documents...</h3>
        <p className="text-gray-500 mt-2">{message}</p>
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

const ArtifactCheckbox = ({ id, label, checked, onChange, icon }) => (
    <div onClick={() => onChange(id, !checked)} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'bg-indigo-50 border-indigo-500' : 'bg-white hover:bg-gray-50'}`}>
        {checked ? <CheckSquare className="w-6 h-6 text-indigo-600 mr-4" /> : <Square className="w-6 h-6 text-gray-400 mr-4" />}
        <div className="flex items-center">
            {icon}
            <span className={`font-semibold ${checked ? 'text-indigo-800' : 'text-gray-700'}`}>{label}</span>
        </div>
    </div>
);

const SuccessDisplay = ({ onReset, generatedArtifacts }) => {
    const handleAction = (artifact) => {
        const byteCharacters = atob(artifact.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: artifact.contentType });
        const url = window.URL.createObjectURL(blob);

        if (artifact.contentType === 'text/html') {
            // Open the self-contained HTML file in a new tab for viewing
            window.open(url, '_blank');
        } else {
            // Standard download logic for all other file types
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', artifact.fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        }
        // Do not revoke object URL for blobs opened in new tabs, as it might close prematurely.
        // The browser will handle cleanup when the tab is closed.
    };
    
    // Group flow artifacts together
    const asIsFlow = generatedArtifacts.asisFlow;
    const asIsFlowView = generatedArtifacts.asisFlowView;
    const toBeFlow = generatedArtifacts.tobeFlow;
    const toBeFlowView = generatedArtifacts.tobeFlowView;

    const otherArtifacts = Object.entries(generatedArtifacts).filter(([key]) => !key.toLowerCase().includes('flow'));

    return (
        <div className="text-center p-8 bg-green-50 rounded-2xl max-w-4xl mx-auto border-2 border-green-200">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Generation Complete!</h2>
            <p className="text-gray-600 mb-8">Your selected artifacts are ready.</p>
            
            <div className="space-y-6">
                {/* Render standard artifacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherArtifacts.map(([key, artifact]) => (
                         <button key={key} onClick={() => handleAction(artifact)} className="w-full bg-indigo-600 text-white font-bold text-lg py-3 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center">
                            <Download className="w-6 h-6 mr-3" />
                            Download {key.charAt(0).toUpperCase() + key.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Render As-Is Flow Artifacts */}
                {asIsFlow && asIsFlowView && (
                    <div className="bg-white p-4 rounded-lg shadow">
                         <h4 className="font-semibold text-lg text-gray-800 mb-3">As-Is Process Flow</h4>
                         <div className="flex justify-center gap-4">
                             <button onClick={() => handleAction(asIsFlowView)} className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-all flex items-center justify-center"><Eye className="w-5 h-5 mr-2" />View Flow</button>
                             <button onClick={() => handleAction(asIsFlow)} className="flex-1 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-gray-700 transition-all flex items-center justify-center"><FileCode2 className="w-5 h-5 mr-2" />Get Editable Code</button>
                         </div>
                    </div>
                )}
                
                {/* Render To-Be Flow Artifacts */}
                {toBeFlow && toBeFlowView && (
                     <div className="bg-white p-4 rounded-lg shadow">
                         <h4 className="font-semibold text-lg text-gray-800 mb-3">To-Be Process Flow</h4>
                         <div className="flex justify-center gap-4">
                             <button onClick={() => handleAction(toBeFlowView)} className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-all flex items-center justify-center"><Eye className="w-5 h-5 mr-2" />View Flow</button>
                             <button onClick={() => handleAction(toBeFlow)} className="flex-1 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-gray-700 transition-all flex items-center justify-center"><FileCode2 className="w-5 h-5 mr-2" />Get Editable Code</button>
                         </div>
                    </div>
                )}
            </div>

            <button onClick={onReset} className="mt-8 text-indigo-600 font-semibold hover:underline">
                Generate More Documents
            </button>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('landing');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [generatedArtifacts, setGeneratedArtifacts] = useState({});
    
    const [selectedArtifacts, setSelectedArtifacts] = useState({
        brd: true,
        anonymized: true,
        mapping: true,
        asisFlow: true,
        tobeFlow: true,
    });

    const handleCheckboxChange = (id, checked) => {
        setSelectedArtifacts(prev => ({ ...prev, [id]: checked }));
    };
    
    const handleFileSelect = (files) => {
        if (files) {
            setSelectedFiles(prevFiles => [...prevFiles, ...Array.from(files)]);
        }
    };

    const handleFileRemove = (indexToRemove) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const artifactOptions = [
        { id: 'brd', label: 'Unified BRD', icon: <FileText className="w-6 h-6 text-indigo-500 mr-3" />},
        { id: 'anonymized', label: 'Anonymized Texts (.zip)', icon: <FileArchive className="w-6 h-6 text-gray-500 mr-3" />},
        { id: 'mapping', label: 'Consolidated Key', icon: <KeyRound className="w-6 h-6 text-yellow-500 mr-3" />},
        { id: 'asisFlow', label: 'As-Is Process Flow', icon: <Workflow className="w-6 h-6 text-blue-500 mr-3" />},
        { id: 'tobeFlow', label: 'To-Be Process Flow', icon: <Workflow className="w-6 h-6 text-green-500 mr-3" />}
    ];

    const resetState = useCallback(() => {
        setSelectedFiles([]);
        setIsLoading(false);
        setError(null);
        setIsSuccess(false);
        setGeneratedArtifacts({});
    }, []);

    const handleGenerateClick = () => { setPage('brdGenerator'); resetState(); };
    const handleBackClick = () => { setPage('landing'); resetState(); };

    const handleSubmit = async () => {
        const artifactsToRequest = Object.keys(selectedArtifacts).filter(key => selectedArtifacts[key]);
        if (selectedFiles.length === 0) { setError("Please select at least one file."); return; }
        if (artifactsToRequest.length === 0) { setError("Please select at least one artifact to generate."); return; }
        
        setError(null);
        setIsLoading(true);
        setIsSuccess(false);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('artifacts', JSON.stringify(artifactsToRequest));

        try {
            const response = await axios.post('http://localhost:3001/api/generate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setGeneratedArtifacts(response.data);
            setIsSuccess(true);
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const renderLandingPage = () => (
        <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-800 mb-4">
                Welcome to <span className="text-indigo-600">Explora</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-16">
                Your AI-powered assistant for transforming project inputs into structured, actionable documents with a focus on privacy.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                <Card icon={<FileText className="w-8 h-8 text-indigo-600" />} title="Create BRD from Notes" description="Upload meeting notes to generate a .docx BRD. Also get the anonymized version used by the AI." enabled={true} onClick={handleGenerateClick} />
                <Card icon={<TestTube2 className="w-8 h-8 text-gray-600" />} title="Generate Test Cases" description="Analyze a BRD to automatically generate detailed test case scenarios." enabled={false} />
                <Card icon={<Presentation className="w-8 h-8 text-gray-600" />} title="Build Training Decks" description="Provide project documents to instantly create a professional PowerPoint presentation." enabled={false} />
            </div>
        </div>
    );

    const renderBrdGeneratorPage = () => (
         <div>
            <button onClick={handleBackClick} className="flex items-center text-indigo-600 font-semibold mb-8 hover:text-indigo-800 transition-colors"><ChevronLeft className="w-5 h-5 mr-2" />Back to Home</button>
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-3">BRD & Process Flow Generation</h1>
                <p className="text-lg text-gray-500 max-w-3xl mx-auto">Upload your documents and select which artifacts you'd like to generate.</p>
            </div>

            {isLoading && <LoadingSpinner message="AI is analyzing and generating your documents..." />}
            {isSuccess && <SuccessDisplay onReset={resetState} generatedArtifacts={generatedArtifacts} />}

            {!isLoading && !isSuccess && (
                <>
                    <FileUploader onFileSelect={handleFileSelect} selectedFiles={selectedFiles} onFileRemove={handleFileRemove} />
                    
                    <div className="max-w-4xl mx-auto mt-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Select Artifacts to Generate:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {artifactOptions.map(option => (
                                <ArtifactCheckbox key={option.id} id={option.id} label={option.label} checked={selectedArtifacts[option.id]} onChange={handleCheckboxChange} icon={option.icon} />
                            ))}
                        </div>
                    </div>

                    {error && <div className="mt-8"><ErrorDisplay message={error} onRetry={handleSubmit} /></div>}
                    <div className="text-center mt-8">
                        <button onClick={handleSubmit} disabled={selectedFiles.length === 0 || Object.values(selectedArtifacts).every(v => !v)} className="bg-indigo-600 text-white font-bold text-lg py-4 px-10 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 flex items-center justify-center mx-auto">
                            <Sparkles className="w-6 h-6 mr-3" />
                            Generate Selected Documents
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {page === 'landing' ? renderLandingPage() : renderBrdGeneratorPage()}
            </div>
        </div>
    );
}