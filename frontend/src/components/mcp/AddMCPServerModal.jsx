import { useState } from 'react';

const emptyPair = { key: '', value: '' };

function KeyValueEditor({ pairs, onChange, keyPlaceholder, valuePlaceholder, valueType = 'text' }) {
    const update = (idx, field, val) => {
        const next = pairs.slice();
        next[idx] = { ...next[idx], [field]: val };
        onChange(next);
    };
    const add = () => onChange([...pairs, { ...emptyPair }]);
    const remove = (idx) => onChange(pairs.filter((_, i) => i !== idx));

    return (
        <div className="space-y-2">
            {pairs.map((pair, idx) => (
                <div key={idx} className="flex gap-2">
                    <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => update(idx, 'key', e.target.value)}
                        className="input-minimal text-sm flex-1"
                        placeholder={keyPlaceholder}
                    />
                    <input
                        type={valueType}
                        value={pair.value}
                        onChange={(e) => update(idx, 'value', e.target.value)}
                        className="input-minimal text-sm flex-1"
                        placeholder={valuePlaceholder}
                    />
                    <button type="button" onClick={() => remove(idx)} className="px-2 text-red-500" title="Remove">
                        ✕
                    </button>
                </div>
            ))}
            <button type="button" onClick={add} className="text-xs" style={{ color: 'var(--accent)' }}>
                + Add {keyPlaceholder.toLowerCase()}
            </button>
        </div>
    );
}

function pairsToDict(pairs) {
    const dict = {};
    for (const { key, value } of pairs) {
        if (key.trim()) dict[key.trim()] = value;
    }
    return Object.keys(dict).length ? dict : null;
}

export const AddMCPServerModal = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [transport, setTransport] = useState('http');

    // stdio fields
    const [command, setCommand] = useState('');
    const [argsText, setArgsText] = useState('');
    const [envPairs, setEnvPairs] = useState([]);

    // sse/http fields
    const [url, setUrl] = useState('');

    const [authType, setAuthType] = useState('none');
    const [headerPairs, setHeaderPairs] = useState([{ key: 'Authorization', value: '' }]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setName(''); setTransport('http');
        setCommand(''); setArgsText(''); setEnvPairs([]);
        setUrl(''); setAuthType('none');
        setHeaderPairs([{ key: 'Authorization', value: '' }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const config = { name, transport, auth_type: authType };
            if (transport === 'stdio') {
                config.command = command;
                config.args = argsText.split(/\s+/).filter(Boolean);
                const env = pairsToDict(envPairs);
                if (env) config.env = env;
            } else {
                config.url = url;
                if (authType === 'headers') {
                    const headers = pairsToDict(headerPairs);
                    if (!headers) throw new Error('At least one header is required for header-based auth');
                    config.headers = headers;
                }
            }

            await onAdd(config);
            reset();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to add server');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-lg rounded-xl border shadow-lg p-6 pointer-events-auto max-h-[90vh] overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
                >
                    <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Add MCP Server
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                Server Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-minimal"
                                placeholder="My MCP Server"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                Transport
                            </label>
                            <select value={transport} onChange={(e) => setTransport(e.target.value)} className="input-minimal">
                                <option value="http">Streamable HTTP (current MCP spec — most remote servers)</option>
                                <option value="sse">SSE (legacy — older remote servers)</option>
                                <option value="stdio">stdio (local command/subprocess)</option>
                            </select>
                        </div>

                        {transport === 'stdio' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                        Command
                                    </label>
                                    <input
                                        type="text"
                                        value={command}
                                        onChange={(e) => setCommand(e.target.value)}
                                        className="input-minimal"
                                        placeholder="npx"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                        Arguments (space-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={argsText}
                                        onChange={(e) => setArgsText(e.target.value)}
                                        className="input-minimal"
                                        placeholder="-y @modelcontextprotocol/server-filesystem /path"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                        Environment Variables (optional)
                                    </label>
                                    <KeyValueEditor
                                        pairs={envPairs}
                                        onChange={setEnvPairs}
                                        keyPlaceholder="Name"
                                        valuePlaceholder="Value"
                                        valueType="password"
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                    Server URL
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="input-minimal"
                                    placeholder="https://example.com/mcp"
                                    required
                                />
                            </div>
                        )}

                        {transport !== 'stdio' && (
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                    Authentication
                                </label>
                                <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="input-minimal">
                                    <option value="none">None</option>
                                    <option value="headers">API Key / Bearer Token (custom headers)</option>
                                    <option value="oauth">OAuth 2.1</option>
                                </select>
                            </div>
                        )}

                        {transport !== 'stdio' && authType === 'headers' && (
                            <div
                                className="p-4 rounded-lg border space-y-2"
                                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}
                            >
                                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    HTTP Headers (sent on every request — e.g. Authorization: Bearer &lt;token&gt;)
                                </p>
                                <KeyValueEditor
                                    pairs={headerPairs}
                                    onChange={setHeaderPairs}
                                    keyPlaceholder="Header"
                                    valuePlaceholder="Value"
                                    valueType="password"
                                />
                            </div>
                        )}

                        {transport !== 'stdio' && authType === 'oauth' && (
                            <div
                                className="p-3 rounded-lg border text-xs"
                                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                            >
                                No client ID/secret needed — after saving, click <strong>Authorize</strong> on the
                                server card. Discovery, dynamic client registration, and PKCE are handled automatically
                                per the OAuth 2.1 spec.
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg text-sm text-red-500" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Adding...' : 'Add Server'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
