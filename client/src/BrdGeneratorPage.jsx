// client/src/BrdGeneratorPage.js
// I've updated this file to include an option for downloading the anonymization package.

import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { FileText, UploadCloud, ChevronLeft, AlertCircle, Download, Sparkles, Workflow, Square, CheckSquare, XCircle, Edit, X, Send, Loader2, KeyRound } from 'lucide-react';
// Make sure to install it: npm install react-drawio
import { DrawIoEmbed } from 'react-drawio';


// --- Draw.io Editor Component (Full-Screen Modal) ---
const DrawioEditor = ({ xml, onBack, diagramName }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6 lg:p-10">
            <div className="w-full h-full bg-white rounded-2xl shadow-2xl flex flex-col border-2 border-gray-300 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50 flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{diagramName}</h3>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 bg-[#13294B] text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-[#1C4A50] transition-all"
                    >
                        <X className="w-5 h-5" />
                        <span>Close Editor</span>
                    </button>
                </div>
                <div className="flex-grow w-full h-full bg-gray-100">
                    <DrawIoEmbed
                        xml={xml}
                        urlParameters={{ ui: 'kennedy', spin: 1, zoom: '1', noExitBtn: 1 }}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Refinement Modal Component ---
const RefinementModal = ({ data, onCancel, onSubmit, flowType }) => {
    const [userRefinements, setUserRefinements] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const getFlowName = () => {
        if (flowType === 'asisFlow') return 'As-Is Process Flow';
        if (flowType === 'tobeFlow') return 'To-Be Process Flow';
        return 'Process Flow';
    };

    const handleSubmit = async () => {
        if (!userRefinements.trim()) {
            setError('Please provide additional details before submitting.');
            return;
        }
        setError('');
        setIsSubmitting(true);
        try {
            await onSubmit(userRefinements);
        } catch (e) {
            setError(e.message || "Failed to submit refinement. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">More Information Needed</h2>
                    <p className="text-gray-600 mt-2">
                        {data.message || `The AI determined the description for the ${getFlowName()} was not detailed enough. Please provide more specific steps or details below.`}
                    </p>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="font-semibold text-gray-700">Original Description (for context)</label>
                        <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-700 max-h-40 overflow-y-auto border">
                            <pre className="whitespace-pre-wrap font-sans">{data.originalText}</pre>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="refinements" className="font-semibold text-gray-700">Additional Details</label>
                        <textarea
                            id="refinements"
                            value={userRefinements}
                            onChange={(e) => setUserRefinements(e.target.value)}
                            placeholder="e.g., Step 1: The user logs in. Step 2: The system verifies credentials. Step 3: If successful, the user is redirected to the dashboard..."
                            className="mt-2 w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            rows="8"
                            readOnly={isSubmitting}
                        />
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                </div>
                <div className="flex justify-end items-center p-6 border-t bg-gray-50 rounded-b-2xl">
                    <button onClick={onCancel} disabled={isSubmitting} className="text-gray-600 font-semibold px-4 py-2 rounded-lg mr-4 hover:bg-gray-200 transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-indigo-700 transition-all flex items-center disabled:bg-indigo-300">
                        <Send className="w-5 h-5 mr-2" />
                        {isSubmitting ? 'Submitting...' : 'Submit Refinement'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Helper UI Components ---
const FileUploader = ({ onFileSelect, selectedFiles, onFileRemove }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <label
                htmlFor="file-upload"
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                className={`relative cursor-pointer bg-white rounded-2xl border-4 border-dashed flex flex-col items-center justify-center p-12 transition-all ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
            >
                <UploadCloud className={`w-16 h-16 mb-4 transition-colors ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`text-xl font-semibold transition-colors ${isDragging ? 'text-indigo-800' : 'text-gray-700'}`}>
                    {isDragging ? 'Drop files here' : (selectedFiles.length > 0 ? "Add more files or generate" : "Drag & drop files or click to upload")}
                </span>
                <p className={`mt-2 transition-colors ${isDragging ? 'text-indigo-500' : 'text-gray-500'}`}>
                    (.docx, .txt, .md)
                </p>
            </label>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => onFileSelect(e.target.files)} accept=".docx,.txt,.md" />
            {selectedFiles.length > 0 && (
                <div className="mt-6">
                    <h4 className="font-semibold text-gray-700 text-center mb-3">Selected Files:</h4>
                    <ul className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                        {selectedFiles.map((file, index) => (
                            <li key={index} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm">
                                <span className="text-gray-800 truncate pr-2">{file.name}</span>
                                <button onClick={() => onFileRemove(index)} className="text-red-500 hover:text-red-700"><XCircle className="w-5 h-5" /></button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const LoadingProgress = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-2xl mx-auto">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
        <h3 className="text-2xl font-semibold text-gray-800">Generating Artifacts...</h3>
        <p className="text-gray-600 mt-2">The AI is processing your documents. This may take a moment.</p>
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
    <div onClick={() => onChange(id, !checked)} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white hover:bg-gray-50'}`}>
        {checked ? <CheckSquare className="w-6 h-6 text-indigo-600 mr-4" /> : <Square className="w-6 h-6 text-gray-400 mr-4" />}
        <div className="flex items-center">
            {icon}
            <span className={`font-semibold ${checked ? 'text-indigo-800' : 'text-gray-700'}`}>{label}</span>
        </div>
    </div>
);

const SuccessDisplay = ({ onReset, generatedArtifacts, onEditDiagram }) => {
    const handleDownload = (artifact) => {
        const byteCharacters = atob(artifact.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: artifact.contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', artifact.fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    const downloadableArtifacts = Object.entries(generatedArtifacts).filter(([, artifact]) => (artifact.type === 'docx' || artifact.type === 'zip') && !artifact.needsRefinement);
    const editableArtifacts = Object.entries(generatedArtifacts).filter(([, artifact]) => artifact.type === 'drawio' && !artifact.needsRefinement);
    const getFlowDisplayName = (key) => key === 'asisFlow' ? 'As-Is Flow' : (key === 'tobeFlow' ? 'To-Be Flow' : 'Process Flow');
    const getDownloadDisplayName = (key) => {
        if (key === 'brd') return 'BRD Document';
        if (key === 'anonymizationData') return 'Anonymization Package';
        return 'Document';
    }


    return (
        <div className="text-center p-8 bg-green-50 rounded-2xl max-w-4xl mx-auto border-2 border-green-200">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Download className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Generation Complete!</h2>
            <p className="text-gray-600 mb-8">Your selected artifacts are ready to be downloaded or edited.</p>
            <div className="space-y-6">
                {editableArtifacts.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow space-y-4">
                        <h4 className="font-semibold text-lg text-gray-800">Editable Process Flows</h4>
                        {editableArtifacts.map(([key, artifact]) => (
                            <div key={key}>
                                <button onClick={() => onEditDiagram(artifact)} className="w-full bg-blue-600 text-white font-bold text-lg py-3 px-6 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center">
                                    <Edit className="w-6 h-6 mr-3" /> Edit {getFlowDisplayName(key)}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {downloadableArtifacts.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h4 className="font-semibold text-lg text-gray-800 mb-3">Downloadable Documents</h4>
                        <div className="flex justify-center flex-wrap gap-4">
                            {downloadableArtifacts.map(([key, artifact]) => (
                                <button key={key} onClick={() => handleDownload(artifact)} className="bg-indigo-600 text-white font-bold text-lg py-3 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center">
                                    <Download className="w-6 h-6 mr-3" /> Download {getDownloadDisplayName(key)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <button onClick={onReset} className="mt-8 text-indigo-600 font-semibold hover:underline">Generate More Documents</button>
        </div>
    );
};

// --- Main Page Component ---
export default function BrdGeneratorPage({ onBack }) {
    const [pageState, setPageState] = useState('generator');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [generatedArtifacts, setGeneratedArtifacts] = useState({});
    const [diagramToEdit, setDiagramToEdit] = useState(null);
    const [reqId, setReqId] = useState(null);
    const [refinementState, setRefinementState] = useState({ isOpen: false, data: null });

    // UPDATED: Added anonymizationData to the selection state
    const [selectedArtifacts, setSelectedArtifacts] = useState({
        brd: true,
        asisFlow: true,
        tobeFlow: true,
        anonymizationData: true,
    });

    const handleCheckboxChange = (id, checked) => setSelectedArtifacts(prev => ({ ...prev, [id]: checked }));

    const handleFileSelect = (files) => {
        if (files) {
            const newFiles = Array.from(files);
            const uniqueNewFiles = newFiles.filter(newFile => !selectedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size));
            setSelectedFiles(prevFiles => [...prevFiles, ...uniqueNewFiles]);
        }
    };

    const handleFileRemove = (indexToRemove) => setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));

    // UPDATED: Added the new checkbox option
    const artifactOptions = [
        { id: 'brd', label: 'Unified BRD', icon: <FileText className="w-6 h-6 text-indigo-500 mr-3" /> },
        { id: 'asisFlow', label: 'As-Is Process Flow', icon: <Workflow className="w-6 h-6 text-blue-500 mr-3" /> },
        { id: 'tobeFlow', label: 'To-Be Process Flow', icon: <Workflow className="w-6 h-6 text-green-500 mr-3" /> },
        { id: 'anonymizationData', label: 'Anonymization Package', icon: <KeyRound className="w-6 h-6 text-yellow-500 mr-3" /> }
    ];

    const resetState = useCallback(() => {
        setPageState('generator'); setSelectedFiles([]); setIsLoading(false); setError(null);
        setIsSuccess(false); setGeneratedArtifacts({}); setDiagramToEdit(null);
        setReqId(null);
        setRefinementState({ isOpen: false, data: null });
    }, []);

    const handleBackToResults = () => { setDiagramToEdit(null); setPageState('generator'); };
    const handleEditDiagram = (diagramArtifact) => { setDiagramToEdit(diagramArtifact); setPageState('diagramEditor'); };

    const handleInitialSubmit = async () => {
        const artifactsToRequest = Object.keys(selectedArtifacts).filter(key => selectedArtifacts[key]);
        if (selectedFiles.length === 0) { setError("Please select at least one file."); return; }
        if (artifactsToRequest.length === 0) { setError("Please select at least one artifact to generate."); return; }

        setError(null); setIsLoading(true); setIsSuccess(false);

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        formData.append('artifacts', JSON.stringify(artifactsToRequest));

        try {
            const response = await axios.post('http://localhost:3001/api/generate-brd', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            setReqId(response.data.reqId);
            setGeneratedArtifacts(response.data.artifacts);

            const refinementNeeded = Object.values(response.data.artifacts).find(art => art.needsRefinement);

            if (refinementNeeded) {
                setRefinementState({ isOpen: true, data: refinementNeeded });
            } else {
                setIsSuccess(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefinementSubmit = async (userRefinements) => {
        const { flowType, originalText, context } = refinementState.data;
        const baseName = selectedFiles[0].name.split('.')[0];
        
        try {
            const response = await axios.post('http://localhost:3001/api/refine-flow', {
                reqId,
                originalText,
                context,
                userRefinements,
                flowType,
                baseName
            });

            const newArtifacts = { ...generatedArtifacts, ...response.data };
            setGeneratedArtifacts(newArtifacts);

            const nextRefinement = Object.values(newArtifacts).find(art => art.needsRefinement);

            if (nextRefinement) {
                setRefinementState({ isOpen: true, data: nextRefinement });
            } else {
                setRefinementState({ isOpen: false, data: null });
                setIsSuccess(true);
            }
        } catch (err) {
            throw new Error(err.response?.data?.error || "Failed to process refinement.");
        }
    };

    return (
        <div>
            {refinementState.isOpen && (
                <RefinementModal
                    data={refinementState.data}
                    flowType={refinementState.data.flowType}
                    onCancel={() => setRefinementState({ isOpen: false, data: null })}
                    onSubmit={handleRefinementSubmit}
                />
            )}
            <div className={`${pageState === 'diagramEditor' ? 'hidden' : ''}`}>
                <button onClick={onBack} className="flex items-center text-gray-600 font-semibold mb-8 hover:text-gray-800 transition-colors"><ChevronLeft className="w-5 h-5 mr-2" />Back to Home</button>
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#13294B] to-[#006BA6]">
                        BRD & Process Flow Generation
                    </h1>
                    <p className="text-lg text-gray-500 max-w-3xl mx-auto">Upload your documents and select which artifacts you'd like our AI to generate.</p>
                </div>

                {isLoading && <LoadingProgress />}
                {isSuccess && <SuccessDisplay onReset={resetState} generatedArtifacts={generatedArtifacts} onEditDiagram={handleEditDiagram} />}

                {!isLoading && !isSuccess && (
                    <>
                        <FileUploader onFileSelect={handleFileSelect} selectedFiles={selectedFiles} onFileRemove={handleFileRemove} />
                        <div className="max-w-4xl mx-auto mt-10 p-6 bg-white/60 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Select Artifacts to Generate</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {artifactOptions.map(option => (
                                    <ArtifactCheckbox key={option.id} id={option.id} label={option.label} checked={selectedArtifacts[option.id]} onChange={handleCheckboxChange} icon={option.icon} />
                                ))}
                            </div>
                        </div>

                        {error && <div className="mt-8"><ErrorDisplay message={error} onRetry={handleInitialSubmit} /></div>}
                        <div className="text-center mt-10">
                            <button onClick={handleInitialSubmit} disabled={selectedFiles.length === 0 || Object.values(selectedArtifacts).every(v => !v)} className="bg-[#13294B] text-white font-bold text-lg py-4 px-10 rounded-full shadow-lg hover:bg-[#1C4A50] transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 flex items-center justify-center mx-auto">
                                <Sparkles className="w-6 h-6 mr-3" />
                                Generate Selected Documents
                            </button>
                        </div>
                    </>
                )}
            </div>
            {pageState === 'diagramEditor' && <DrawioEditor xml={diagramToEdit.content} onBack={handleBackToResults} diagramName={diagramToEdit.fileName} />}
        </div>
    );
}
