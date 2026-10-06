
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mcpServerService } from '../../services/mcpServer';
import { MCPServerItem } from './MCPServerItem';
import { AddMCPServerModal } from './AddMCPServerModal';
import { useTheme } from '../../context/ThemeContext';

export const MCPServerManager = () => {
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    useEffect(() => {
        loadServers();
    }, []);

    const loadServers = async () => {
        try {
            const data = await mcpServerService.getServers();
            const transformedData = data.map(server => ({
                ...server,
                id: server._id
            }));
            setServers(transformedData);
        } catch (error) {
            console.error('Failed to load servers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddServer = async (config) => {
        const newServer = await mcpServerService.addServer(config);
        setServers([{ ...newServer, id: newServer._id }, ...servers]);
    };

    const handleDeleteServer = async (id) => {
        if (!confirm('Are you sure you want to delete this server?')) return;

        try {
            await mcpServerService.deleteServer(id);
            setServers(servers.filter(s => s.id !== id));
        } catch (error) {
            console.error('Failed to delete server:', error);
            alert('Failed to delete server');
        }
    };

    const handleTestConnection = async (id) => {
        return await mcpServerService.testConnection(id);
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-primary)' }}
            >
                <div style={{ color: 'var(--text-secondary)' }}>Loading servers...</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            {/* Header */}
            <header
                className="h-14 flex items-center justify-between px-4 border-b sticky top-0 z-10"
                style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)'
                }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>MCP Servers</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {isDark ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Server
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-3xl mx-auto p-6">
                {servers.length === 0 ? (
                    <div
                        className="text-center py-16 rounded-xl border border-dashed"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <svg
                            className="h-12 w-12 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No MCP servers</h3>
                        <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            Connect external tools and data sources to extend capabilities.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-secondary"
                        >
                            Connect First Server
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {servers.map((server) => (
                            <MCPServerItem
                                key={server.id}
                                server={server}
                                onDelete={handleDeleteServer}
                                onTest={handleTestConnection}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AddMCPServerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddServer}
            />
        </div>
    );
};
