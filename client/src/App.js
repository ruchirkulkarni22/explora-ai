// client/src/App.js
// This version integrates a full BPMN.io diagram editor for in-browser editing of process flows.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileText, TestTube2, Presentation, Loader2, UploadCloud, ChevronLeft, AlertCircle, CheckCircle, Download, KeyRound, Sparkles, Workflow, Square, CheckSquare, XCircle, FileArchive, Edit, Image, FileCode } from 'lucide-react';
import BpmnJS from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';


// --- BPMN Editor Component ---
const BpmnEditor = ({ bpmnXml, onBack, diagramName }) => {
    const canvasRef = useRef(null);
    const modelerRef = useRef(null);
    const [isModelerReady, setIsModelerReady] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        const modeler = new BpmnJS({
            container: canvasRef.current,
            keyboard: {
                bindTo: window
            }
        });
        modelerRef.current = modeler;

        const openDiagram = async (xml) => {
            try {
                await modeler.importXML(xml);
                const canvas = modeler.get('canvas');
                canvas.zoom('fit-viewport');
                setIsModelerReady(true);
            } catch (err) {
                console.error('Error importing BPMN XML', err);
            }
        };

        if (bpmnXml) {
            openDiagram(bpmnXml);
        }

        return () => {
            modeler.destroy();
            setIsModelerReady(false);
        };
    }, [bpmnXml]);

    const handleExport = async (type) => {
        if (!modelerRef.current) return;

        try {
            if (type === 'svg') {
                const { svg } = await modelerRef.current.saveSVG();
                downloadFile(`${diagramName}.svg`, svg, 'image/svg+xml');
            } else {
                const { xml } = await modelerRef.current.saveXML({ format: true });
                downloadFile(`${diagramName}.bpmn`, xml, 'application/xml');
            }
        } catch (err) {
            console.error('Failed to export', err);
        }
    };

    const downloadFile = (filename, data, mimeType) => {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col p-4 border-2 border-gray-200">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                 <button onClick={onBack} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"><ChevronLeft className="w-5 h-5 mr-2" />Back to Results</button>
                 <h3 className="text-xl font-bold text-gray-800">{diagramName}</h3>
                 <div className="flex items-center gap-4">
                    <button onClick={() => handleExport('bpmn')} disabled={!isModelerReady} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-all disabled:bg-gray-400">
                        <FileCode className="w-5 h-5" /> Export BPMN
                    </button>
                     <button onClick={() => handleExport('svg')} disabled={!isModelerReady} className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-green-700 transition-all disabled:bg-gray-400">
                        <Image className="w-5 h-5" /> Export SVG
                    </button>
                 </div>
            </div>
            <div ref={canvasRef} className="flex-grow w-full h-full bg-gray-50 rounded-lg border">
                {!isModelerReady && <div className="flex items-center justify-center h-full"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>}
            </div>
        </div>
    );
};


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

const SuccessDisplay = ({ onReset, generatedArtifacts, onEditDiagram }) => {
    const handleDownload = (artifact) => {
        const byteCharacters = atob(artifact.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
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
    
    // Separate artifacts into downloadable and editable
    const downloadableArtifacts = Object.entries(generatedArtifacts).filter(([, artifact]) => artifact.type !== 'bpmn');
    const editableArtifacts = Object.entries(generatedArtifacts).filter(([, artifact]) => artifact.type === 'bpmn');

    return (
        <div className="text-center p-8 bg-green-50 rounded-2xl max-w-4xl mx-auto border-2 border-green-200">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Generation Complete!</h2>
            <p className="text-gray-600 mb-8">Your selected artifacts are ready.</p>
            
            <div className="space-y-6">
                {/* Render Editable Artifacts (Diagrams) */}
                {editableArtifacts.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow space-y-4">
                         <h4 className="font-semibold text-lg text-gray-800">Editable Process Flows</h4>
                         {editableArtifacts.map(([key, artifact]) => (
                             <div key={key}>
                                 <button onClick={() => onEditDiagram(artifact)} className="w-full bg-blue-600 text-white font-bold text-lg py-3 px-6 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center">
                                    <Edit className="w-6 h-6 mr-3" />
                                    Edit {artifact.fileName.replace('.bpmn', '')}
                                </button>
                             </div>
                         ))}
                    </div>
                )}

                {/* Render Downloadable Artifacts */}
                {downloadableArtifacts.length > 0 && (
                     <div className="bg-white p-4 rounded-lg shadow">
                         <h4 className="font-semibold text-lg text-gray-800 mb-3">Downloadable Documents</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {downloadableArtifacts.map(([key, artifact]) => (
                                 <button key={key} onClick={() => handleDownload(artifact)} className="w-full bg-indigo-600 text-white font-bold text-lg py-3 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center">
                                    <Download className="w-6 h-6 mr-3" />
                                    Download {key.charAt(0).toUpperCase() + key.slice(1)}
                                </button>
                            ))}
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
    const [page, setPage] = useState('landing'); // landing, brdGenerator, diagramEditor
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [generatedArtifacts, setGeneratedArtifacts] = useState({});
    const [diagramToEdit, setDiagramToEdit] = useState(null); // Holds the BPMN XML for the editor
    
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
        { id: 'brd', label: 'Unified BRD (.docx)', icon: <FileText className="w-6 h-6 text-indigo-500 mr-3" />},
        { id: 'anonymized', label: 'Anonymized Texts (.zip)', icon: <FileArchive className="w-6 h-6 text-gray-500 mr-3" />},
        { id: 'mapping', label: 'Consolidated Key (.csv)', icon: <KeyRound className="w-6 h-6 text-yellow-500 mr-3" />},
        { id: 'asisFlow', label: 'As-Is Process Flow', icon: <Workflow className="w-6 h-6 text-blue-500 mr-3" />},
        { id: 'tobeFlow', label: 'To-Be Process Flow', icon: <Workflow className="w-6 h-6 text-green-500 mr-3" />}
    ];

    const resetState = useCallback(() => {
        setSelectedFiles([]);
        setIsLoading(false);
        setError(null);
        setIsSuccess(false);
        setGeneratedArtifacts({});
        setDiagramToEdit(null);
    }, []);
    
    const handleBackToResults = () => {
        setDiagramToEdit(null);
        setPage('brdGenerator');
    };

    const handleEditDiagram = (diagramArtifact) => {
        setDiagramToEdit(diagramArtifact);
        setPage('diagramEditor');
    };

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
            {isSuccess && !diagramToEdit && <SuccessDisplay onReset={resetState} generatedArtifacts={generatedArtifacts} onEditDiagram={handleEditDiagram} />}

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
    
    const renderContent = () => {
        switch(page) {
            case 'landing':
                return renderLandingPage();
            case 'diagramEditor':
                return <BpmnEditor bpmnXml={diagramToEdit.content} onBack={handleBackToResults} diagramName={diagramToEdit.fileName} />;
            case 'brdGenerator':
            default:
                return renderBrdGeneratorPage();
        }
    }

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {renderContent()}
            </div>
        </div>
    );
}
