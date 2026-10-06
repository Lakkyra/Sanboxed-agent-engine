
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import { mcpServerService } from '../../services/mcpServer';

export const MCPServerItem = ({ server, onDelete, onTest }) => {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [oauthStatus, setOauthStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [mcpOauthPolling, setMcpOauthPolling] = useState(false);
    const pollRef = useRef(null);

    const isGenericOAuth = server.auth_type === 'oauth' && server.name !== 'Google Drive MCP';

    useEffect(() => {
        if (server.name === 'Google Drive MCP') {
            checkOAuthStatus();
        }
        // Auto-test on mount to show tools
        handleTest();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [server.id]);

    const handleAuthorizeMcpOAuth = () => {
        mcpServerService.authorizeOAuth(server.id);
        setMcpOauthPolling(true);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const status = await mcpServerService.getOAuthStatus(server.id);
                if (status.authorized) {
                    clearInterval(pollRef.current);
                    setMcpOauthPolling(false);
                    server.oauth_authorized = true;
                    handleTest();
                } else if (status.error) {
                    clearInterval(pollRef.current);
                    setMcpOauthPolling(false);
                    setTestResult({ status: 'error', error: status.error });
                }
            } catch {
                // keep polling — transient network error
            }
        }, 2000);
        // Stop polling after 6 minutes even if nothing happened (matches backend's 5 min flow timeout).
        setTimeout(() => { if (pollRef.current) { clearInterval(pollRef.current); setMcpOauthPolling(false); } }, 360000);
    };

    const checkOAuthStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google-drive/status`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setOauthStatus({ connected: data.authenticated, email: data.email });
            }
        } catch (error) {
            console.error('Failed to check OAuth status:', error);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your Google Drive account?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/oauth/google/disconnect`, {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                setOauthStatus({ connected: false });
            }
        } catch (error) {
            alert('Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await onTest(server.id);
            setTestResult(result);
        } catch (error) {
            setTestResult({ status: 'error', error: 'Failed to test connection' });
        } finally {
            setTesting(false);
        }
    };

    const toolCount = testResult?.tools?.length || 0;

    return (
        <div
            className="rounded-xl border p-4 transition-colors"
            style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {server.name}
                        </h3>
                        {testResult?.status === 'connected' && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: 'var(--accent)',
                                    color: 'white'
                                }}
                            >
                                {toolCount} tools
                            </span>
                        )}
                    </div>
                    <p className="text-xs truncate mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {server.transport === 'stdio'
                            ? `${server.command || ''} ${(server.args || []).join(' ')}`.trim()
                            : server.url}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {server.transport} · {server.auth_type}
                        {server.auth_type === 'oauth' && (
                            <> · {server.oauth_authorized ? '✓ authorized' : 'not authorized'}</>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-1 ml-2">
                    <button
                        onClick={handleTest}
                        disabled={testing}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Test connection"
                    >
                        {testing ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={() => onDelete(server.id)}
                        className="p-2 rounded-lg transition-colors hover:text-red-500"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Delete server"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Google Drive OAuth */}
            {server.name === 'Google Drive MCP' && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    {oauthStatus?.connected ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--accent)' }}>
                                ✓ Connected to Google Drive
                            </span>
                            <button
                                onClick={handleDisconnect}
                                disabled={loading}
                                className="text-xs text-red-500 hover:underline"
                            >
                                {loading ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                const redirectUri = `${API_BASE_URL}/oauth/google/callback`;
                                window.location.href = `${API_BASE_URL}/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors"
                            style={{
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Connect Google Drive
                        </button>
                    )}
                </div>
            )}

            {/* Generic OAuth 2.1 authorization (any non-Google-Drive oauth server) */}
            {isGenericOAuth && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    {server.oauth_authorized ? (
                        <span className="text-sm" style={{ color: 'var(--accent)' }}>
                            ✓ Authorized
                        </span>
                    ) : (
                        <button
                            onClick={handleAuthorizeMcpOAuth}
                            disabled={mcpOauthPolling}
                            className="w-full px-3 py-2 rounded-lg border text-sm transition-colors"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        >
                            {mcpOauthPolling ? 'Waiting for authorization…' : 'Authorize'}
                        </button>
                    )}
                </div>
            )}

            {/* Tools List (Expandable) */}
            {testResult?.status === 'connected' && toolCount > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <span>Available Tools ({toolCount})</span>
                        <svg
                            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {expanded && (
                        <div className="mt-2 space-y-1">
                            {testResult.tools.map((tool, idx) => (
                                <div
                                    key={idx}
                                    className="text-sm p-2 rounded-lg"
                                    style={{ backgroundColor: 'var(--input-bg)' }}
                                >
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {tool.name}
                                    </span>
                                    {tool.description && (
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                            {tool.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {testResult?.status === 'error' && (
                <div
                    className="mt-3 p-2 rounded-lg text-sm text-red-500"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                >
                    {testResult.error}
                </div>
            )}
        </div>
    );
};
