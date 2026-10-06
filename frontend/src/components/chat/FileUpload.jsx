import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ragService } from '../../services/rag';

export const FileUpload = ({ onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState(null);
    const [selectedType, setSelectedType] = useState("Auto (Detect)");

    const DOC_TYPES = [
        "Auto (Detect)", "Financial", "Legal", "Academic", "Textbook", "Resume",
        "Medical", "Slides", "Code Manual", "Email", "CAD", "Chat Log", "Fiction", "General"
    ];

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setStatus(null);
        setProgress(0);

        try {
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 500);

            // Pass the selectedType to the service
            const result = await ragService.uploadFile(file, selectedType);

            clearInterval(interval);
            setProgress(100);
            setStatus({ type: 'success', message: `Indexed: ${result.details.filename} (${result.details.strategy.type_category})` });

            if (onUploadComplete) onUploadComplete(result);
        } catch (error) {
            console.error('Upload failed:', error);
            setStatus({ type: 'error', message: 'Upload failed. Check server logs.' });
        } finally {
            setUploading(false);
            setTimeout(() => {
                setStatus(null);
                setProgress(0);
            }, 5000);
        }
    }, [onUploadComplete, selectedType]); // Added selectedType to dependency array

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false
    });

    return (
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>

            {/* Document Type Selector */}
            <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs p-2 rounded border bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)]"
                style={{ borderColor: 'var(--border-color)' }}
                disabled={uploading}
            >
                {DOC_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>

            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}
                `}
            >
                <input {...getInputProps()} />

                {uploading ? (
                    <div className="space-y-2">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Ingesting... {progress}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                                className="h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <svg className="mx-auto h-8 w-8" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {isDragActive ? 'Drop file here' : 'Index Document (PDF, etc)'}
                        </p>
                    </div>
                )}
            </div>

            {status && (
                <div className={`mt-2 text-xs px-2 py-1 rounded ${status.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                    {status.message}
                </div>
            )}
        </div>
    );
};
