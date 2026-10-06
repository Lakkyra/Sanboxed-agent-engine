import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { userService } from '../services/user';
import { ragService } from '../services/rag';

export const ProfilePage = () => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [uploads, setUploads] = useState([]);
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [memoriesLoading, setMemoriesLoading] = useState(true);

    useEffect(() => {
        loadUploads();
        loadMemories();
    }, []);

    const loadUploads = async () => {
        try {
            const data = await ragService.listFiles();
            setUploads(data.files || []);
        } catch (error) {
            console.error('Failed to load uploads:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMemories = async () => {
        try {
            const data = await userService.getMemories();
            setMemories(data.memories || []);
        } catch (error) {
            console.error('Failed to load memories:', error);
        } finally {
            setMemoriesLoading(false);
        }
    };

    const handleClearMemories = async () => {
        if (window.confirm('Are you sure you want to clear all your memories? The AI will forget everything it learned about you.')) {
            setMemoriesLoading(true);
            try {
                await userService.clearMemories();
                setMemories([]);
            } catch (error) {
                console.error('Failed to clear memories:', error);
                alert('Failed to clear memories.');
            } finally {
                setMemoriesLoading(false);
            }
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (window.confirm('Are you sure you want to delete this file? It will be removed from your knowledge base.')) {
            try {
                await ragService.deleteFile(fileId);
                // Remove from local state to update UI immediately
                setUploads(uploads.filter(f => f.file_id !== fileId));
            } catch (error) {
                console.error('Failed to delete file:', error);
                alert('Failed to delete file.');
            }
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Header */}
            <header
                className="border-b sticky top-0"
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)'
                }}
            >
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Profile
                    </h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* User Info Card */}
                <div
                    className="rounded-xl border p-6 mb-6"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)'
                    }}
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                            style={{
                                backgroundColor: 'var(--accent)',
                                color: 'white'
                            }}
                        >
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {user?.name || 'User'}
                            </h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {user?.email || 'No email'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors"
                            style={{
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            {isDark ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-lg text-sm text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Uploaded Files */}
                <div
                    className="rounded-xl border p-6"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)'
                    }}
                >
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Uploaded Files
                    </h3>

                    {loading ? (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Loading...
                        </p>
                    ) : uploads.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            No files uploaded yet
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {uploads.map((file, idx) => (
                                <div
                                    key={idx}
                                    className="group relative rounded-lg border p-3 text-center transition-all hover:border-red-500/50"
                                    style={{
                                        backgroundColor: 'var(--input-bg)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                >
                                    <button
                                        onClick={() => handleDeleteFile(file.file_id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete file"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    {file.mime_type?.startsWith('image/') ? (
                                        <img
                                            src={file.cloudinary_url || file.url}
                                            alt={file.filename}
                                            className="w-full h-24 object-cover rounded mb-2"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-24 rounded mb-2 flex items-center justify-center"
                                            style={{ backgroundColor: 'var(--hover-bg)' }}
                                        >
                                            <svg className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }} title={file.filename}>
                                        {file.filename}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Memory Bank */}
                <div
                    className="rounded-xl border p-6 mt-6"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Memory Bank 🧠
                        </h3>
                        <button 
                            onClick={handleClearMemories}
                            disabled={memories.length === 0 || memoriesLoading}
                            className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                            Clear All Memories
                        </button>
                    </div>

                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                        AgentX continuously learns about you to provide better, more personalized answers. Here is what it currently remembers.
                    </p>

                    {memoriesLoading ? (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Loading memories...
                        </p>
                    ) : memories.length === 0 ? (
                        <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                            No memories extracted yet. Talk to the AI to let it learn about you!
                        </p>
                    ) : (
                        <div className="grid gap-3">
                            {memories.map((memory) => (
                                <div 
                                    key={memory.id} 
                                    className="p-4 rounded-lg border flex flex-col"
                                    style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                                            {memory.category || 'Fact'}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(memory.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {memory.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
