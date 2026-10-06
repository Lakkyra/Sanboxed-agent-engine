import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/admin';

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

const fmt = (n, dec = 0) => (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = (n) => `$${(n ?? 0).toFixed(6)}`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '—';

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, color = 'var(--accent)' }) => (
    <div className="rounded-xl border p-5 flex gap-4 items-start transition-all hover:shadow-lg"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: color + '22', color }}>
            {icon}
        </div>
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
        </div>
    </div>
);

// ─── SVG line chart ───────────────────────────────────────────────────────────

const LineChart = ({ data, xKey, yKey, color = 'var(--accent)', label }) => {
    if (!data?.length) return <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>No data</div>;
    const W = 600, H = 140, PAD = 30;
    const values = data.map(d => d[yKey] ?? 0);
    const maxV = Math.max(...values, 1);
    const pts = data.map((d, i) => ({
        x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
        y: H - PAD - ((d[yKey] ?? 0) / maxV) * (H - PAD * 2),
    }));
    const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
    const fill = pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},${H - PAD} ${pts[0].x},${H - PAD}`;
    return (
        <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                <polygon points={fill} fill={color} fillOpacity="0.12" />
                <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
                {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
                ))}
                {/* X axis labels: first, middle, last */}
                {[0, Math.floor((data.length - 1) / 2), data.length - 1].map(i => (
                    data[i] && <text key={i} x={pts[i]?.x} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{data[i][xKey]?.slice(5)}</text>
                ))}
            </svg>
        </div>
    );
};

// ─── Horizontal bar chart ──────────────────────────────────────────────────────

const BarChart = ({ data, nameKey, valueKey, color = 'var(--accent)' }) => {
    if (!data?.length) return <div className="h-20 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>No data</div>;
    const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);
    return (
        <div className="space-y-2">
            {data.slice(0, 8).map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-xs truncate text-right" style={{ color: 'var(--text-secondary)' }} title={d[nameKey]}>{d[nameKey]}</div>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${((d[valueKey] ?? 0) / max) * 100}%`, backgroundColor: color }} />
                    </div>
                    <div className="w-12 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(d[valueKey])}</div>
                </div>
            ))}
        </div>
    );
};

// ─── Main Dashboard Page ───────────────────────────────────────────────────────

export const AdminDashboard = () => {
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [users, setUsers] = useState([]);
    const [daily, setDaily] = useState([]);
    const [models, setModels] = useState([]);
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [ov, us, da, mo, to] = await Promise.all([
                    adminService.getOverview(),
                    adminService.getUsers(1, 50),
                    adminService.getDailyUsage(),
                    adminService.getModelUsage(),
                    adminService.getToolUsage(),
                ]);
                setOverview(ov);
                setUsers(us.users || []);
                setDaily(da.daily || []);
                setModels(mo.models || []);
                setTools(to.tools || []);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    if (loading) return (
        <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
        </div>
    );

    if (error) return (
        <div className="h-screen flex items-center justify-center flex-col gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <p className="text-red-400 font-medium">⚠️ {error}</p>
            <button onClick={() => navigate('/chat')} className="text-sm underline" style={{ color: 'var(--accent)' }}>← Back to Chat</button>
        </div>
    );

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="sticky top-0 z-20 border-b px-6 py-4 flex items-center justify-between"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/chat')} className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Platform analytics & cost monitoring</p>
                    </div>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                    🔐 Admin
                </span>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

                {/* ── Overview Cards ── */}
                <section>
                    <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Platform Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard icon="👥" label="Total Users"    value={fmt(overview?.total_users)}         color="#6366f1" />
                        <StatCard icon="🗂️" label="Conversations"  value={fmt(overview?.total_conversations)} color="#8b5cf6" />
                        <StatCard icon="💬" label="Messages"       value={fmt(overview?.total_messages)}      color="#0ea5e9" />
                        <StatCard icon="📅" label="Today"          value={fmt(overview?.messages_today)}      color="#10b981" />
                        <StatCard icon="🔢" label="Total Tokens"   value={fmt((overview?.total_input_tokens ?? 0) + (overview?.total_output_tokens ?? 0))} color="#f59e0b" />
                        <StatCard icon="💰" label="Total Cost"     value={fmtUSD(overview?.total_cost_usd)}   color="#ef4444" sub="Gemini 2.5 Flash" />
                    </div>
                </section>

                {/* ── Charts Row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Daily activity */}
                    <div className="lg:col-span-2 rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📈 Daily Activity (30 days)</h2>
                        <LineChart data={daily} xKey="date" yKey="messages" label="AI responses per day" />
                    </div>

                    {/* Model usage */}
                    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🤖 Model Usage</h2>
                        <BarChart data={models} nameKey="model" valueKey="count" color="#6366f1" />
                    </div>
                </div>

                {/* Tool usage */}
                {tools.length > 0 && (
                    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🛠️ Tool Usage</h2>
                        <BarChart data={tools} nameKey="tool" valueKey="count" color="#10b981" />
                    </div>
                )}

                {/* ── Users Table ── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                            All Users ({users.length})
                        </h2>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border outline-none"
                            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                        {['User', 'Joined', 'Sessions', 'AI Turns', 'Input Tokens', 'Output Tokens', 'Cost (USD)', ''].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user, i) => (
                                        <tr key={user.id}
                                            className="border-t transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                                            style={{ borderColor: 'var(--border-color)' }}
                                            onClick={() => navigate(`/admin/users/${user.id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                                        style={{ backgroundColor: user.is_admin ? '#ef4444' : 'var(--accent)' }}>
                                                        {user.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {user.name} {user.is_admin && <span className="text-xs text-red-400 ml-1">admin</span>}
                                                        </p>
                                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(user.created_at)}</td>
                                            <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(user.conversations)}</td>
                                            <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(user.ai_messages)}</td>
                                            <td className="px-4 py-3 font-mono text-blue-400">{fmt(user.total_input_tokens)}</td>
                                            <td className="px-4 py-3 font-mono text-purple-400">{fmt(user.total_output_tokens)}</td>
                                            <td className="px-4 py-3 font-mono font-semibold text-green-400">{fmtUSD(user.total_cost_usd)}</td>
                                            <td className="px-4 py-3">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No users found.</div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
