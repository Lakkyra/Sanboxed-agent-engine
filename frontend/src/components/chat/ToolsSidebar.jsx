import { useState, useEffect } from 'react';
import { mcpServerService } from '../../services/mcpServer';
import { authService } from '../../services/auth';

export const ToolsSidebar = ({
    mcpServers,
    selectedMcpServers,
    onToggleMcpServer,
    selectedTools,
    onToolsChange
}) => {
    const [mcpTools, setMcpTools] = useState({});
    const [nativeTools, setNativeTools] = useState([]);
    const [googleDriveAuth, setGoogleDriveAuth] = useState(false);

    useEffect(() => {
        loadNativeTools();
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        const status = await authService.checkGoogleDriveStatus();
        setGoogleDriveAuth(status.authenticated);
    };

    // Load tools for selected MCP servers
    useEffect(() => {
        selectedMcpServers.forEach(server => {
            if (!mcpTools[server.id]) {
                loadMcpToolsForServer(server);
            }
        });
    }, [selectedMcpServers]);

    const loadNativeTools = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/tools`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setNativeTools(data.tools || data || []);
            }
        } catch (error) {
            console.error('Failed to load native tools:', error);
        }
    };

    const loadMcpToolsForServer = async (server) => {
        setMcpTools(prev => ({
            ...prev,
            [server.id]: { tools: [], loading: true, name: server.name }
        }));

        try {
            const result = await mcpServerService.testConnection(server.id);
            setMcpTools(prev => ({
                ...prev,
                [server.id]: {
                    tools: result.tools || [],
                    loading: false,
                    name: server.name,
                    status: result.status
                }
            }));
        } catch (error) {
            console.error(`Failed to load tools from ${server.name}:`, error);
            setMcpTools(prev => ({
                ...prev,
                [server.id]: { tools: [], loading: false, name: server.name, error: true }
            }));
        }
    };

    const toggleTool = (toolName) => {
        if (selectedTools.includes(toolName)) {
            onToolsChange(selectedTools.filter(t => t !== toolName));
        } else {
            onToolsChange([...selectedTools, toolName]);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            // 1. Get Authorization URL from Backend
            const redirectUri = `${window.location.origin}/mcp-servers`; // Simple redirect back to app
            // NOTE: OAuth routes are at /oauth, NOT /api/oauth
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // If you use JWT
                },
                credentials: 'include'
            });

            if (response.ok) {
                const { url } = await response.json();
                window.location.href = url; // Use the URL returned by the backend
            } else {
                // Fallback if the fetch fails (e.g. CORS or 307), though the backend returns JSON {url: ...} usually not
                // But wait, the backend endpoint returns RedirectResponse!
                // Fetch follows redirects automatically. This logic is flawed if we want to get the URL string.
                // For a RedirectResponse, we should just navigate directly.
                window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
            }
        } catch (error) {
            console.error("Login failed", error);
            // Fallback
            const redirectUri = `${window.location.origin}/mcp-servers`;
            window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
        }
    };

    return (
        <div className="space-y-4">
            {/* MCP Servers */}
            {mcpServers.length > 0 && (
                <div>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        MCP Servers
                    </div>
                    <div className="space-y-2">
                        {mcpServers.map((server) => {
                            const isSelected = selectedMcpServers.some(s => s.id === server.id);
                            const serverTools = mcpTools[server.id];

                            return (
                                <div key={server.id}>
                                    <label
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm"
                                        style={{
                                            backgroundColor: isSelected ? 'var(--hover-bg)' : 'transparent',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleMcpServer(server)}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="truncate flex-1">{server.name}</span>
                                        {isSelected && serverTools?.tools?.length > 0 && (
                                            <span
                                                className="text-xs px-1.5 py-0.5 rounded"
                                                style={{
                                                    backgroundColor: 'var(--accent)',
                                                    color: 'white'
                                                }}
                                            >
                                                {serverTools.tools.length}
                                            </span>
                                        )}
                                    </label>

                                    {/* Show MCP tools as tags (read-only) */}
                                    {isSelected && serverTools && (
                                        <div className="ml-7 mt-1">
                                            {serverTools.loading ? (
                                                <p className="text-xs py-1" style={{ color: 'var(--text-secondary)' }}>
                                                    Loading tools...
                                                </p>
                                            ) : serverTools.error ? (
                                                <p className="text-xs py-1 text-red-500">
                                                    Failed to load tools
                                                </p>
                                            ) : serverTools.tools.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {serverTools.tools.map((tool, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs px-2 py-1 rounded"
                                                            style={{
                                                                backgroundColor: 'var(--input-bg)',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        >
                                                            {tool.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs py-1" style={{ color: 'var(--text-secondary)' }}>
                                                    No tools available
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Native Tools */}
            {nativeTools.length > 0 && (
                <div>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Native Tools
                    </div>
                    <div className="space-y-1">
                        {nativeTools.map((tool) => {
                            // Use tool_id for backend compatibility, name for display
                            const toolId = tool.tool_id || tool.name;
                            const displayName = tool.name || tool.tool_id;
                            const isSelected = selectedTools.includes(toolId);

                            // Check for Google Drive tools
                            const isGoogleDriveTool = toolId.includes('google_drive');
                            const canEnable = !isGoogleDriveTool || googleDriveAuth;

                            return (
                                <div key={toolId}>
                                    <label
                                        className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${!canEnable ? 'opacity-70' : ''}`}
                                        style={{
                                            backgroundColor: isSelected ? 'var(--hover-bg)' : 'transparent',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => canEnable && toggleTool(toolId)}
                                            disabled={!canEnable}
                                            className="w-4 h-4 rounded mt-0.5"
                                        />
                                        <div className="min-w-0 flex-1 flex items-center justify-between">
                                            <div>
                                                <div className="truncate">{displayName}</div>
                                                {tool.description && (
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        {tool.description}
                                                    </div>
                                                )}
                                            </div>

                                            {isGoogleDriveTool && !googleDriveAuth && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleGoogleLogin();
                                                    }}
                                                    className="text-xs px-2 py-1 rounded transition-colors hover:brightness-110 ml-2"
                                                    style={{
                                                        backgroundColor: 'var(--accent)',
                                                        color: 'white'
                                                    }}
                                                >
                                                    Connect
                                                </button>
                                            )}
                                            
                                            {isGoogleDriveTool && googleDriveAuth && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        await authService.disconnectGoogleDrive();
                                                        checkAuthStatus();
                                                        // Also uncheck it if they disconnect
                                                        if (isSelected) toggleTool(toolId);
                                                    }}
                                                    className="text-xs px-2 py-1 rounded transition-colors hover:brightness-110 ml-2"
                                                    style={{
                                                        backgroundColor: 'var(--surface-color)',
                                                        color: 'var(--text-secondary)',
                                                        border: '1px solid var(--border-color)'
                                                    }}
                                                >
                                                    Disconnect
                                                </button>
                                            )}

                                            {isGoogleDriveTool && googleDriveAuth && (
                                                <span className="text-[10px] px-1.5 rounded ml-2 bg-green-500/20 text-green-500">
                                                    Connected
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {mcpServers.length === 0 && nativeTools.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                    No tools available
                </p>
            )}
        </div>
    );
};
