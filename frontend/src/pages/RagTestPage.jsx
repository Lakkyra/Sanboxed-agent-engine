import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ragService } from '../services/rag';

const RagTestPage = () => {
    const [query, setQuery] = useState('');
    const [files, setFiles] = useState([]);
    const [chunks, setChunks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch available files on mount
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await api.get('/api/v1/rag/files');
                setFiles(response.data.files || []);
            } catch (err) {
                console.error("Failed to load files:", err);
                // Don't block UI, just empty list
            }
        };
        fetchFiles();
    }, []);

    const handleRetrieve = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setChunks([]);

        try {
            const response = await api.post('/api/v1/rag/retrieve', {
                message: query
            });
            setChunks(response.data.chunks || []);
        } catch (err) {
            console.error("Retrieval failed:", err);
            setError("Failed to retrieve context. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    // Tool Tester Logic
    const [toolDocId, setToolDocId] = useState('');
    const [toolPage, setToolPage] = useState(1);
    const [toolResult, setToolResult] = useState(null);
    const [toolLoading, setToolLoading] = useState(false);

    const handleReadPage = async (e) => {
        e.preventDefault();
        setToolLoading(true);
        setToolResult(null);
        try {
            const data = await ragService.readPage(toolDocId, toolPage);
            setToolResult(data);
        } catch (err) {
            setToolResult({ error: "Failed to read page. Check ID and Backend." });
        } finally {
            setToolLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-white">RAG Retrieval Verification 🕵️</h1>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <form onSubmit={handleRetrieve} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-2">Test Query</label>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., What is loss function?"
                            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Available Files: {files.length}
                            {files.length > 0 && (
                                <span className="ml-2 text-gray-400">
                                    ({files.map(f => f.filename || f).join(', ')})
                                </span>
                            )}

                        </div>
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className={`px-6 py-2 rounded font-medium ${loading
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {loading ? 'Retrieving...' : '🔍 Check Context'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
                    {error}
                </div>
            )}

            {chunks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Retrieved Chunks ({chunks.length})</h2>
                    {chunks.map((chunk, i) => (
                        <div key={i} className="bg-gray-800 border border-gray-700 rounded p-4 hover:border-blue-500 transition-colors">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-mono bg-blue-900 text-blue-200 px-2 py-1 rounded">
                                    Score: {chunk.score?.toFixed(4) || 'N/A'}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                    {chunk.metadata?.source || 'Unknown Source'}
                                </span>
                            </div>
                            <p className="text-gray-300 text-sm whitespace-pre-wrap font-mono bg-gray-900/50 p-3 rounded">
                                {chunk.content}
                            </p>
                            <div className="mt-2 text-xs text-gray-500 truncate">
                                Metadata: {JSON.stringify(chunk.metadata)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {chunks.length === 0 && !loading && !error && (
                <div className="text-center text-gray-500 mt-12">
                    Enter a query to see what the AI "reads" from your documents.
                </div>
            )}

            {/* --- Tool Tester Section --- */}
            <div className="mt-16 border-t border-gray-700 pt-8">
                <h1 className="text-2xl font-bold mb-6 text-white">Agent Tool Tester: Page Reader 📖</h1>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                    <form onSubmit={handleReadPage} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-gray-400 mb-2">DocStore ID (MongoDB ID)</label>
                            <input
                                type="text"
                                value={toolDocId}
                                onChange={(e) => setToolDocId(e.target.value)}
                                placeholder="e.g. 65a..."
                                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-gray-400 mb-2">Page No.</label>
                            <input
                                type="number"
                                value={toolPage}
                                onChange={(e) => setToolPage(e.target.value)}
                                min="1"
                                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={toolLoading || !toolDocId}
                            className={`px-6 py-3 rounded font-medium h-[50px] ${toolLoading
                                ? 'bg-gray-600'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                        >
                            {toolLoading ? 'Reading...' : 'Run Tool'}
                        </button>
                    </form>

                    {toolResult && (
                        <div className="mt-6 bg-black p-4 rounded overflow-auto max-h-96 border border-gray-700">
                            <pre className="text-green-400 text-xs font-mono">
                                {JSON.stringify(toolResult, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RagTestPage;
