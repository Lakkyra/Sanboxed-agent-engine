import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

export const ToolsSelector = ({ selectedTools, onToolsChange }) => {
    const [tools, setTools] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleDriveAuth, setGoogleDriveAuth] = useState(false);

    useEffect(() => {
        const init = async () => {
            await checkGoogleDriveAuth();
            await fetchTools();
        };
        init();
    }, []);

    const fetchTools = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tools`);
            const data = await response.json();
            setTools(data.tools);

            // Enable tools by default, but skip Google Drive tools if not authenticated
            if (selectedTools.length === 0 && data.tools.length > 0) {
                const toolsToEnable = data.tools.filter(tool => {
                    // Enable non-auth tools by default
                    if (!tool.requires_auth) return true;
                    // For Google Drive tools, only enable if authenticated
                    if (tool.category === 'google_drive') return googleDriveAuth;
                    return false;
                }).map(t => t.tool_id);

                onToolsChange(toolsToEnable);
            }
        } catch (error) {
            console.error('Failed to fetch tools:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkGoogleDriveAuth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google-drive/status`, {
                credentials: 'include'
            });
            const data = await response.json();
            setGoogleDriveAuth(data.authenticated);
        } catch (error) {
            console.error('Failed to check Google Drive auth:', error);
        }
    };

    const handleConnectGoogleDrive = () => {
        const redirectUri = `${API_BASE_URL}/oauth/google/callback`;
        window.location.href = `${API_BASE_URL}/oauth/google/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
    };

    const handleDisconnectGoogleDrive = async () => {
        if (!confirm('Are you sure you want to disconnect your Google Drive account?')) {
            return;
        }

        try {
            await fetch(`${API_BASE_URL}/oauth/google/disconnect`, {
                method: 'POST',
                credentials: 'include'
            });
            setGoogleDriveAuth(false);
            // Uncheck all Google Drive tools
            const nonGoogleDriveTools = selectedTools.filter(toolId => {
                const tool = tools.find(t => t.tool_id === toolId);
                return tool?.category !== 'google_drive';
            });
            onToolsChange(nonGoogleDriveTools);
        } catch (error) {
            console.error('Failed to disconnect Google Drive:', error);
            alert('Failed to disconnect Google Drive');
        }
    };

    const toggleTool = (toolId) => {
        const newSelected = selectedTools.includes(toolId)
            ? selectedTools.filter(id => id !== toolId)
            : [...selectedTools, toolId];
        onToolsChange(newSelected);
    };

    const toggleAll = () => {
        if (selectedTools.length === tools.length) {
            onToolsChange([]);
        } else {
            onToolsChange(tools.map(t => t.tool_id));
        }
    };

    // Group tools by category
    const groupedTools = tools.reduce((acc, tool) => {
        if (!acc[tool.category]) acc[tool.category] = [];
        acc[tool.category].push(tool);
        return acc;
    }, {});

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('.tools-selector')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative tools-selector">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-secondary flex items-center gap-2 text-sm"
                disabled={loading}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Tools ({selectedTools.length})</span>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute bottom-full mb-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Available Tools</h3>
                        <button
                            onClick={toggleAll}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            {selectedTools.length === tools.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-2">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">Loading tools...</div>
                        ) : tools.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No tools available</div>
                        ) : (
                            Object.entries(groupedTools).map(([category, categoryTools]) => (
                                <div key={category} className="mb-3">
                                    <div className="flex items-center justify-between px-2 mb-1">
                                        <div className="text-xs font-semibold text-gray-500 uppercase">
                                            {category.replace('_', ' ')}
                                        </div>
                                        {category === 'google_drive' && (
                                            <button
                                                onClick={googleDriveAuth ? handleDisconnectGoogleDrive : handleConnectGoogleDrive}
                                                className={`text-xs px-2 py-1 rounded ${googleDriveAuth
                                                        ? 'text-red-600 hover:bg-red-50'
                                                        : 'text-blue-600 hover:bg-blue-50'
                                                    }`}
                                            >
                                                {googleDriveAuth ? '🔓 Disconnect' : '🔐 Connect'}
                                            </button>
                                        )}
                                    </div>
                                    {categoryTools.map(tool => {
                                        const isGoogleDrive = tool.category === 'google_drive';
                                        const isDisabled = isGoogleDrive && !googleDriveAuth;

                                        return (
                                            <label
                                                key={tool.tool_id}
                                                className={`flex items-start gap-2 p-2 rounded transition-colors ${isDisabled
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'hover:bg-gray-50 cursor-pointer'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTools.includes(tool.tool_id)}
                                                    onChange={() => toggleTool(tool.tool_id)}
                                                    disabled={isDisabled}
                                                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-2">{tool.description}</div>
                                                    {tool.requires_auth && (
                                                        <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                            </svg>
                                                            <span>Requires authentication</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
