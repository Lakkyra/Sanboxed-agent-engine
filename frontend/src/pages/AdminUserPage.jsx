import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../services/admin';

const fmt = (n) => (n ?? 0).toLocaleString();
const fmtUSD = (n) => `$${(n ?? 0).toFixed(6)}`;
const fmtDate = (s) => s ? new Date(s).toLocaleString() : '—';

export const AdminUserPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminService.getUserSessions(userId)
            .then(d => setSessions(d.sessions || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
        </div>
    );

    const totalCost = sessions.reduce((s, c) => s + (c.total_cost_usd ?? 0), 0);

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <header className="sticky top-0 z-20 border-b px-6 py-4 flex items-center gap-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <button onClick={() => navigate('/admin')} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>User Sessions</h1>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{userId}</p>
                </div>
                <div className="ml-auto flex gap-6 text-sm">
                    <div className="text-center">
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(sessions.length)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sessions</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-green-400">{fmtUSD(totalCost)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Cost</p>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                {['Title', 'Date', 'Turns', 'Input Tokens', 'Output Tokens', 'Cost (USD)', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(s => (
                                <tr key={s.id} className="border-t cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                                    style={{ borderColor: 'var(--border-color)' }}
                                    onClick={() => navigate(`/admin/users/${userId}/sessions/${s.id}`)}>
                                    <td className="px-4 py-3 max-w-xs truncate font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</td>
                                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtDate(s.updated_at)}</td>
                                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(s.ai_turns)}</td>
                                    <td className="px-4 py-3 font-mono text-blue-400">{fmt(s.total_input_tokens)}</td>
                                    <td className="px-4 py-3 font-mono text-purple-400">{fmt(s.total_output_tokens)}</td>
                                    <td className="px-4 py-3 font-mono font-semibold text-green-400">{fmtUSD(s.total_cost_usd)}</td>
                                    <td className="px-4 py-3">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sessions.length === 0 && (
                        <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
