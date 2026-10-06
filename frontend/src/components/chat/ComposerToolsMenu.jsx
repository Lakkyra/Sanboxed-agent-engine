import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mcpServerService } from '../../services/mcpServer';
import { authService } from '../../services/auth';

// Native tools barely ever change within a session, and this menu now mounts
// lazily (only while the popover is open) instead of being permanently mounted
// inside the old slide-out settings panel. Cache the fetch at module scope so
// opening/closing the menu repeatedly doesn't re-hit /api/tools every time.
let _nativeToolsCache = null;

const Icon = ({ d, className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.9}
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d={d} />
    </svg>
);

const PATHS = {
    code: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
    skill: 'M12 2l2.6 6.3L21 9.3l-4.7 4.3 1.2 6.4L12 17l-5.5 3 1.2-6.4L3 9.3l6.4-1z',
    search: 'M18 11a7 7 0 11-14 0 7 7 0 0114 0zM20 20l-3.5-3.5',
    book: 'M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5zM8 3v18',
    globe: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3a15 15 0 010 18a15 15 0 010-18',
    plug: 'M12 3v18M3 12h18',
    plus: 'M12 5v14M5 12h14',
    wrench: 'M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-2.6 2.6-2-2z',
};

// Pick a reasonable glyph per native tool without hardcoding the tool list —
// the backend owns which tools exist, this is presentation only.
function iconForTool(toolId) {
    if (toolId.includes('search_knowledge_base') || toolId.includes('read_document')) return PATHS.book;
    if (toolId.includes('search') || toolId.includes('internet')) return PATHS.globe;
    if (toolId.includes('google_drive')) return PATHS.plug;
    return PATHS.wrench;
}

const CoreRow = ({ icon, title, desc }) => (
    <div className="ax-pop-item cursor-default">
        <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
            style={{ backgroundColor: 'var(--violet-soft)', borderColor: 'var(--violet-line)', color: 'var(--violet)' }}>
            <Icon d={icon} />
        </span>
        <span className="min-w-0">
            <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</span>
            <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>{desc}</span>
        </span>
        <span className="ml-auto text-[9.5px] font-semibold uppercase tracking-wider rounded px-1.5 py-px border flex-none"
            style={{ color: 'var(--violet)', backgroundColor: 'var(--violet-soft)', borderColor: 'var(--violet-line)' }}>
            core
        </span>
    </div>
);

export const ComposerToolsMenu = ({
    mcpServers,
    selectedMcpServers,
    onToggleMcpServer,
    selectedTools,
    onToolsChange,
}) => {
    const navigate = useNavigate();
    const [nativeTools, setNativeTools] = useState(_nativeToolsCache || []);
    const [mcpTools, setMcpTools] = useState({});
    const [googleDriveAuth, setGoogleDriveAuth] = useState(false);

    useEffect(() => {
        if (!_nativeToolsCache) loadNativeTools();
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const status = await authService.checkGoogleDriveStatus();
            setGoogleDriveAuth(status.authenticated);
        } catch (e) {
            console.error('Failed to check Google Drive status:', e);
        }
    };

    // Load tools for selected MCP servers (drives the per-server tool count badge)
    useEffect(() => {
        selectedMcpServers.forEach(server => {
            if (!mcpTools[server.id]) loadMcpToolsForServer(server);
        });
    }, [selectedMcpServers]);

    const loadNativeTools = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/tools`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                const tools = data.tools || data || [];
                _nativeToolsCache = tools;
                setNativeTools(tools);
            }
        } catch (error) {
            console.error('Failed to load native tools:', error);
        }
    };

    const loadMcpToolsForServer = async (server) => {
        setMcpTools(prev => ({ ...prev, [server.id]: { tools: [], loading: true, name: server.name } }));
        try {
            const result = await mcpServerService.testConnection(server.id);
            setMcpTools(prev => ({
                ...prev,
                [server.id]: { tools: result.tools || [], loading: false, name: server.name, status: result.status }
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

    // Unchanged from the previous ToolsSidebar implementation — the OAuth
    // routes live at /oauth (not /api/oauth) and the backend may answer with
    // either JSON {url} or a redirect, so both paths are handled.
    const handleGoogleLogin = async () => {
        const redirectUri = `${window.location.origin}/mcp-servers`;
        const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const authUrl = `${base}/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
        try {
            const response = await fetch(authUrl, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                credentials: 'include'
            });
            if (response.ok) {
                const { url } = await response.json();
                window.location.href = url;
            } else {
                window.location.href = authUrl;
            }
        } catch (error) {
            console.error('Login failed', error);
            window.location.href = authUrl;
        }
    };

    return (
        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-1.5">
            {/* Always-on sandbox capabilities — shown so the menu explains the
                product, but deliberately not toggleable (the agent always has them). */}
            <div className="ax-pop-label">Always available</div>
            <CoreRow icon={PATHS.code} title="Python & shell sandbox" desc="Isolated workspace per user" />
            <CoreRow icon={PATHS.skill} title="Skills" desc="Loaded on demand by the agent" />

            {/* Native tools */}
            {nativeTools.length > 0 && (
                <>
                    <div className="h-px mx-2 my-1.5" style={{ backgroundColor: 'var(--border-color)' }} />
                    <div className="ax-pop-label">Capabilities</div>
                    {nativeTools.map((tool) => {
                        const toolId = tool.tool_id || tool.name;
                        const displayName = tool.name || tool.tool_id;
                        const isSelected = selectedTools.includes(toolId);
                        const isGoogleDriveTool = toolId.includes('google_drive');
                        const canEnable = !isGoogleDriveTool || googleDriveAuth;

                        return (
                            <div
                                key={toolId}
                                className={`ax-pop-item ${!canEnable ? 'opacity-70' : ''}`}
                                onClick={() => canEnable && toggleTool(toolId)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (canEnable) toggleTool(toolId);
                                    }
                                }}
                            >
                                <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                                        borderColor: isSelected ? 'var(--accent-line)' : 'var(--border-color)',
                                        color: isSelected ? 'var(--accent)' : 'var(--text-secondary)'
                                    }}>
                                    <Icon d={iconForTool(toolId)} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-medium leading-tight truncate"
                                        style={{ color: 'var(--text-primary)' }}>
                                        {displayName}
                                    </span>
                                    {tool.description && (
                                        <span className="block text-[11.5px] leading-tight mt-px truncate"
                                            style={{ color: 'var(--text-tertiary)' }}>
                                            {tool.description}
                                        </span>
                                    )}
                                </span>

                                {isGoogleDriveTool && !googleDriveAuth ? (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleGoogleLogin(); }}
                                        className="ml-auto flex-none text-[11px] font-medium px-2 py-1 rounded-md transition-all hover:brightness-110"
                                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' }}
                                    >
                                        Connect
                                    </button>
                                ) : (
                                    <>
                                        {isGoogleDriveTool && googleDriveAuth && (
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await authService.disconnectGoogleDrive();
                                                    checkAuthStatus();
                                                    if (isSelected) toggleTool(toolId);
                                                }}
                                                className="ml-auto flex-none text-[11px] px-2 py-1 rounded-md border transition-colors"
                                                style={{
                                                    color: 'var(--text-secondary)',
                                                    borderColor: 'var(--border-color)',
                                                    backgroundColor: 'var(--surface-2)'
                                                }}
                                                title="Disconnect Google Drive"
                                            >
                                                Disconnect
                                            </button>
                                        )}
                                        <span className={`ax-switch ${isSelected ? 'is-on' : ''} ${isGoogleDriveTool && googleDriveAuth ? 'ml-1.5' : 'ml-auto'}`} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            {/* MCP servers */}
            <div className="h-px mx-2 my-1.5" style={{ backgroundColor: 'var(--border-color)' }} />
            <div className="ax-pop-label">MCP servers</div>
            {mcpServers.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    None configured yet.
                </p>
            ) : (
                mcpServers.map((server) => {
                    const isSelected = selectedMcpServers.some(s => s.id === server.id);
                    const serverTools = mcpTools[server.id];
                    const toolCount = serverTools?.tools?.length;

                    let statusText = 'idle · connects on use';
                    if (isSelected && serverTools?.loading) statusText = 'connecting…';
                    else if (isSelected && serverTools?.error) statusText = 'failed to connect';
                    else if (isSelected && toolCount > 0) statusText = `connected · ${toolCount} tool${toolCount > 1 ? 's' : ''}`;
                    else if (isSelected) statusText = 'connected';

                    return (
                        <div
                            key={server.id}
                            className="ax-pop-item"
                            onClick={() => onToggleMcpServer(server)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onToggleMcpServer(server);
                                }
                            }}
                        >
                            <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                style={{
                                    backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                                    borderColor: isSelected ? 'var(--accent-line)' : 'var(--border-color)',
                                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)'
                                }}>
                                <Icon d={PATHS.plug} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 text-[13px] font-medium leading-tight"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <span className="truncate">{server.name}</span>
                                    <span className="w-1.5 h-1.5 rounded-full flex-none"
                                        style={{ backgroundColor: isSelected && !serverTools?.error ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                                </span>
                                <span className="block text-[11.5px] leading-tight mt-px truncate"
                                    style={{ color: serverTools?.error ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                                    {statusText}
                                </span>
                            </span>
                            <span className={`ax-switch ml-auto ${isSelected ? 'is-on' : ''}`} />
                        </div>
                    );
                })
            )}

            <button type="button" className="ax-pop-item" onClick={() => navigate('/mcp-servers')}>
                <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                    style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    <Icon d={PATHS.plus} />
                </span>
                <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                        Manage MCP servers
                    </span>
                    <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>
                        Add, edit or remove connections
                    </span>
                </span>
            </button>
        </div>
    );
};
