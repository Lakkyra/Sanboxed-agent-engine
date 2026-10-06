import React, { useState, useEffect, useRef } from 'react';
import { ragService } from '../../services/rag';

export const DocumentUploadModal = ({ isOpen, onClose, onUploadComplete, onCancelled, onUploadStarted }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    // Real detail from the backend (services/ingestion_job_service.py sets
    // this at each stage, e.g. "Parsing document with LlamaParse...") —
    // there's no real percentage-complete available server-side, so this
    // replaces what used to be a fake incrementing progress bar with an
    // honest indeterminate indicator instead.
    const [progressMessage, setProgressMessage] = useState('');
    const [chunksCount, setChunksCount] = useState(null);
    const [error, setError] = useState(null);
    // Recursive setTimeout polling (pollJobStatus below) doesn't stop itself
    // just because the modal closed — this flag is checked at the top of
    // every poll so a cancel actually halts it instead of silently polling
    // in the background forever.
    const cancelledRef = useRef(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setFile(null);
            setUploading(false);
            setStatus('');
            setProgressMessage('');
            setChunksCount(null);
            setError(null);
            cancelledRef.current = false;
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Distinguishes "closed before doing anything" (no notice needed) from
    // "cancelled a real in-progress upload" (worth telling the user about —
    // see onCancelled, surfaced as a banner above the sidebar's Knowledge
    // base card).
    const handleCancel = () => {
        if (uploading) {
            cancelledRef.current = true;
            onCancelled?.(file?.name);
        }
        onClose();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const pollJobStatus = async (jobId) => {
        if (cancelledRef.current) return;
        try {
            const data = await ragService.pollIngestionJob(jobId);
            if (cancelledRef.current) return;
            setStatus(data.status);
            setProgressMessage(data.progress_message || '');

            if (data.status === 'completed' || data.status === 'complete') {
                setChunksCount(typeof data.chunks_count === 'number' ? data.chunks_count : null);
                setTimeout(() => {
                    onUploadComplete();
                    onClose();
                }, 1000);
            } else if (data.status === 'failed') {
                setError(data.error || data.progress_message || 'Ingestion failed');
                setUploading(false);
            } else {
                // queued / parsing / embedding — all still in progress.
                setTimeout(() => pollJobStatus(jobId), 2000);
            }
        } catch (err) {
            console.error('Polling error', err);
            setError('Failed to get status. Process might still be running.');
            setUploading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setUploading(true);
        setStatus('uploading');
        setProgressMessage('Uploading...');
        setError(null);

        try {
            const data = await ragService.uploadFile(file);
            if (data.job_id) {
                setStatus('queued');
                setProgressMessage('Queued for processing');
                onUploadStarted?.();
                pollJobStatus(data.job_id);
            } else {
                // Synchronous processing fallback (if backend changes)
                setStatus('completed');
                setTimeout(() => {
                    onUploadComplete();
                    onClose();
                }, 1000);
            }
        } catch (err) {
            setError('Failed to upload file. Please try again.');
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Upload Knowledge Document</h2>
                    <button onClick={handleCancel} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {!uploading ? (
                        <>
                            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                                onClick={() => document.getElementById('file-upload').click()}>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.txt,.md,.json,.csv"
                                />
                                <div className="text-4xl mb-4">📄</div>
                                <p className="text-gray-300 font-medium">
                                    {file ? file.name : "Click to select a file"}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Supports PDF, TXT, MD
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Upload
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="py-8 text-center space-y-4">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>

                            <div>
                                {/* Real detail from the backend job (e.g. "Parsing document with
                                    LlamaParse...") instead of a generic capitalized status word —
                                    there's no true percentage available, so no percentage is implied. */}
                                <p className="text-white font-medium">
                                    {status === 'complete' || status === 'completed'
                                        ? `Indexed${typeof chunksCount === 'number' ? ` — ${chunksCount} chunk${chunksCount === 1 ? '' : 's'}` : ''}`
                                        : (progressMessage || `${status}...`)}
                                </p>
                                <p className="text-sm text-gray-400 mt-1">This may take a minute for large files</p>
                            </div>

                            {/* Indeterminate — matches the same "we don't know exactly how far
                                along this is" rail used elsewhere (composer's generating state). */}
                            <div className="w-full h-1 rounded-full overflow-hidden bg-gray-700">
                                <div className="ax-rail" />
                            </div>

                            <button
                                onClick={handleCancel}
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel upload
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
