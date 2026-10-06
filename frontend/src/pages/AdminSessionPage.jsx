import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../services/admin';

const fmt = (n) => (n ?? 0).toLocaleString();
const fmtUSD = (n) => `$${(n ?? 0).toFixed(6)}`;
const fmtDate = (s) => s ? new Date(s).toLocaleString() : '—';

const RoleBadge = ({ role }) => (
    <span className="px-2 py-0.5 text-xs rounded-full font-medium"
        style={{
            backgroundColor: role === 'user' ? '#3b82f622' : '#8b5cf622',
            color: role === 'user' ? '#60a5fa' : '#a78bfa',
        }}>
        {role === 'user' ? '👤 User' : '🤖 AI'}
    </span>
);

export const AdminSessionPage = () => {
    const { userId, convId } = useParams();
    const navigate = useNavigate();
    const [turns, setTurns] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminService.getSessionTurns(userId, convId)
            .then(d => setTurns(d.turns || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, convId]);

    const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const aiTurns = turns.filter(t => t.role === 'model');
    const totalCost = aiTurns.reduce((s, t) => s + (t.cost_usd ?? 0), 0);
    const totalIn   = aiTurns.reduce((s, t) => s + (t.input_tokens ?? 0), 0);
    const totalOut  = aiTurns.reduce((s, t) => s + (t.output_tokens ?? 0), 0);

    if (loading) return (
        <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
        </div>
    );

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <header className="sticky top-0 z-20 border-b px-6 py-4 flex items-center gap-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <button onClick={() => navigate(`/admin/users/${userId}`)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Session Detail</h1>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{convId}</p>
                </div>
                <div className="flex gap-6 text-sm">
                    <div className="text-center">
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{turns.length}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Turns</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-blue-400">{fmt(totalIn)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Input Tokens</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-purple-400">{fmt(totalOut)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Output Tokens</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-green-400">{fmtUSD(totalCost)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Cost</p>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
                {turns.map((turn) => {
                    const id = turn._id || turn.id;
                    const isExpanded = expanded[id];
                    const tools = turn.tool_steps?.filter(t => t.name) || [];
                    return (
                        <div key={id} className="rounded-xl border overflow-hidden transition-all"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                            {/* Turn header */}
                            <div className="px-5 py-4 flex items-start justify-between gap-4 cursor-pointer"
                                onClick={() => toggle(id)}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <RoleBadge role={turn.role} />
                                    <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                        {turn.content?.slice(0, 120) || '(empty)'}
                                        {turn.content?.length > 120 && '…'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-5 shrink-0 text-xs">
                                    {turn.role === 'model' && (
                                        <>
                                            <span className="text-blue-400">{fmt(turn.input_tokens ?? 0)} in</span>
                                            <span className="text-purple-400">{fmt(turn.output_tokens ?? 0)} out</span>
                                            <span className="font-semibold text-green-400">{fmtUSD(turn.cost_usd ?? 0)}</span>
                                            {turn.model && <span className="px-2 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{turn.model}</span>}
                                        </>
                                    )}
                                    <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(turn.timestamp)}</span>
                                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                                    <pre className="text-xs whitespace-pre-wrap leading-relaxed rounded-lg p-3 overflow-auto max-h-72"
                                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                        {turn.content || '(no content)'}
                                    </pre>
                                    {tools.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Tools used:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {tools.map((t, i) => (
                                                    <span key={i} className="px-2 py-1 text-xs rounded-full"
                                                        style={{ backgroundColor: '#10b98122', color: '#34d399' }}>
                                                        🛠️ {t.name} — {t.status}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {turns.length === 0 && (
                    <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>No messages in this session.</div>
                )}
            </div>
        </div>
    );
};
