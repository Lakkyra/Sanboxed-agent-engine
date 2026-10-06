import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ToolsSidebar } from '../chat/ToolsSidebar';

export const SettingsPanel = ({
    isOpen,
    onClose,
    mcpServers,
    selectedMcpServers,
    onToggleMcpServer,
    selectedTools,
    onToolsChange,
    selectedModel,
    onModelChange
}) => {
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-80 z-50 transform transition-transform duration-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
            >
                <div className="h-full flex flex-col border-l" style={{ borderColor: 'var(--border-color)' }}>
                    {/* Header */}
                    <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Settings</span>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors hover:bg-[var(--hover-bg)]"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Theme */}
                        <div>
                            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Appearance</h3>
                            <button
                                onClick={toggleTheme}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            >
                                <span className="text-sm">Theme</span>
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {isDark ? 'Dark' : 'Light'}
                                </span>
                            </button>
                        </div>

                        {/* Model */}
                        <div>
                            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Model</h3>
                            <select
                                value={selectedModel}
                                onChange={(e) => onModelChange(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                                style={{
                                    backgroundColor: 'var(--input-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="antigravity/gemini-3.7-flash-medium">Gemini 3.7 Flash (Medium)</option>
                            </select>
                        </div>

                        {/* MCP Servers Management */}
                        <div>
                            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>MCP Servers</h3>
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/mcp-servers');
                                }}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            >
                                <span className="text-sm">Manage MCP Servers</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Tools */}
                        <div>
                            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Tools</h3>
                            <ToolsSidebar
                                mcpServers={mcpServers}
                                selectedMcpServers={selectedMcpServers}
                                onToggleMcpServer={onToggleMcpServer}
                                selectedTools={selectedTools}
                                onToolsChange={onToolsChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
