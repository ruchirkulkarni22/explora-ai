// clientVite/src/TrainingDeckGeneratorPage.jsx
import React, { useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  UploadCloud,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  XCircle,
  Download,
  CheckCircle,
  FileArchive,
} from "lucide-react";

const FileUploader = ({ onFileSelect, selectedFile, onFileRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0)
      setIsDragging(true);
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
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div className="w-full max-w-2xl mx-auto">
      <label
        htmlFor="file-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative cursor-pointer bg-white rounded-2xl border-4 border-dashed flex flex-col items-center justify-center p-12 transition-all ${
          isDragging
            ? "border-teal-600 bg-teal-50"
            : "border-gray-300 hover:border-teal-400"
        }`}
      >
        <UploadCloud
          className={`w-16 h-16 mb-4 transition-colors ${
            isDragging ? "text-teal-600" : "text-gray-400"
          }`}
        />
        <span
          className={`text-xl font-semibold transition-colors ${
            isDragging ? "text-teal-800" : "text-gray-700"
          }`}
        >
          {isDragging
            ? "Drop file here"
            : selectedFile
            ? "File selected"
            : "Drag & drop your Test Case Excel"}
        </span>
        <p
          className={`mt-2 transition-colors ${
            isDragging ? "text-teal-500" : "text-gray-500"
          }`}
        >
          A single .xlsx file is required.
        </p>
      </label>
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        className="sr-only"
        onChange={(e) => onFileSelect(e.target.files[0])}
        accept=".xlsx"
      />
      {selectedFile && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-700 text-center mb-3">
            Selected File:
          </h4>
          <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm max-w-md mx-auto">
            <span className="text-gray-800 truncate pr-2">
              {selectedFile.name}
            </span>
            <button
              onClick={onFileRemove}
              className="text-red-500 hover:text-red-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LoadingSpinner = ({ message }) => (
  <div className="flex flex-col items-center justify-center text-center p-8">
    <svg
      className="animate-spin -ml-1 mr-3 h-10 w-10 text-teal-600 mb-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <h3 className="text-xl font-semibold text-gray-800">
      Analyzing & Matching...
    </h3>
    <p className="text-teal-700 font-semibold mt-2">{message}</p>
  </div>
);
const ErrorDisplay = ({ message, onRetry }) => (
  <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg max-w-3xl mx-auto">
    <div className="flex">
      <div className="py-1">
        <AlertCircle className="h-6 w-6 text-red-400 mr-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-red-800">An Error Occurred</p>
        <p className="mt-2 text-md text-red-700">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);
const SuccessDisplay = ({ generatedFile, onDownload, onReset }) => {
  return (
    <div className="text-center p-8 bg-green-50 rounded-2xl max-w-4xl mx-auto border-2 border-green-200">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
      <h2 className="text-3xl font-bold text-gray-800 mb-3">
        Matching Complete!
      </h2>
      <p className="text-gray-600 mb-8">
        The AI has packaged the relevant training decks and a report into a
        single .zip file for you.
      </p>
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 text-left">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          Downloadable Archive Ready
        </h3>
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <FileArchive className="w-8 h-8 text-teal-600 mr-4" />
          <span className="font-semibold text-gray-700">
            {generatedFile.fileName}
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onDownload}
          className="w-full sm:w-auto bg-teal-600 text-white font-bold text-lg py-4 px-10 rounded-full shadow-lg hover:bg-teal-700 transition-all duration-300 flex items-center justify-center"
        >
          <Download className="w-6 h-6 mr-3" />
          Download Archive
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto text-teal-600 font-semibold hover:underline"
        >
          Analyze Another File
        </button>
      </div>
    </div>
  );
};

export default function TrainingDeckGeneratorPage({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedFile, setGeneratedFile] = useState(null);
  const resetState = useCallback(() => {
    setSelectedFile(null);
    setIsLoading(false);
    setError(null);
    setLoadingMessage("");
    setIsSuccess(false);
    setGeneratedFile(null);
  }, []);
  const handleFileSelect = (file) => {
    if (file) {
      if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Invalid file type. Please upload a .xlsx file.");
        setSelectedFile(null);
      }
    }
  };
  const handleFileRemove = () => setSelectedFile(null);
  const handleDownload = () => {
    if (!generatedFile || !generatedFile.downloadUrl) return;
    window.location.href = generatedFile.downloadUrl;
  };
  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select an Excel file to analyze.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setIsSuccess(false);
    setLoadingMessage("Uploading and preparing your file...");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      setLoadingMessage(
        "AI is reading PowerPoints and analyzing test cases... This may take a moment."
      );
      const response = await axios.post(
        "http://localhost:3001/api/generate-training-deck",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setGeneratedFile(response.data);
      setIsSuccess(true);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "An unknown server error occurred.";
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
      return (
        <SuccessDisplay
          generatedFile={generatedFile}
          onDownload={handleDownload}
          onReset={resetState}
        />
      );
    }
    return (
      <>
        <FileUploader
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          onFileRemove={handleFileRemove}
        />
        {error && (
          <div className="mt-8">
            <ErrorDisplay message={error} onRetry={handleSubmit} />
          </div>
        )}
        <div className="text-center mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selectedFile}
            className="bg-[#13294B] text-white font-bold text-lg py-4 px-10 rounded-full shadow-lg hover:bg-[#1C4A50] transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 flex items-center justify-center mx-auto"
          >
            <Sparkles className="w-6 h-6 mr-3" />
            Find & Package Decks
          </button>
        </div>
      </>
    );
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 font-semibold mb-8 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 mr-2" />
        Back to Home
      </button>
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#13294B] mb-3">
          Training Deck Finder
        </h1>
        <p className="text-lg text-gray-500 max-w-3xl mx-auto">
          Upload an Excel file of test cases. Our AI will find the most relevant
          training decks and package them into a single downloadable .zip file.
        </p>
      </div>
      {renderContent()}
    </div>
  );
}
