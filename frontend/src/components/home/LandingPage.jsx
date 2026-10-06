import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Icon = ({ d, className = 'w-4 h-4', strokeWidth = 1.9 }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d={d} />
    </svg>
);

const P = {
    mark: 'M4 17l6-6-6-6M12 19h8',
    arrow: 'M5 12h13M13 6l6 6-6 6',
    check: 'M20 6L9 17l-5-5',
    code: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
    file: 'M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7zM14 2v5h5',
    book: 'M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5zM8 3v18',
    plug: 'M12 3v18M3 12h18',
    spark: 'M12 2l2.6 6.3L21 9.3l-4.7 4.3 1.2 6.4L12 17l-5.5 3 1.2-6.4L3 9.3l6.4-1z',
    image: 'M3 7a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3zM4 17l5-4 4 3 3-2 4 3',
    brain: 'M12 3a5 5 0 00-5 5 4 4 0 00-1 7.9V19a2 2 0 002 2h8a2 2 0 002-2v-3.1A4 4 0 0017 8a5 5 0 00-5-5z',
    globe: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3a15 15 0 010 18a15 15 0 010-18',
    search: 'M18 11a7 7 0 11-14 0 7 7 0 0114 0zM20 20l-3.5-3.5',
    sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
    download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
    mic: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
};

const gridStyle = {
    backgroundImage: 'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
    backgroundSize: '64px 64px',
    WebkitMaskImage: 'radial-gradient(80% 62% at 50% 12%, #000, transparent 78%)',
    maskImage: 'radial-gradient(80% 62% at 50% 12%, #000, transparent 78%)',
};

const Card = ({ span = '', children }) => (
    <div
        className={`${span} rounded-[18px] border p-6 transition-all duration-200 hover:-translate-y-0.5`}
        style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border-color)',
            boxShadow: 'var(--shadow-1)'
        }}
    >
        {children}
    </div>
);

const CardIcon = ({ d, tone = 'accent' }) => (
    <div
        className="w-9 h-9 rounded-[10px] grid place-items-center mb-4 border"
        style={{
            backgroundColor: tone === 'violet' ? 'var(--violet-soft)' : 'var(--accent-soft)',
            borderColor: tone === 'violet' ? 'var(--violet-line)' : 'var(--accent-line)',
            color: tone === 'violet' ? 'var(--violet)' : 'var(--accent)'
        }}
    >
        <Icon d={d} className="w-[17px] h-[17px]" />
    </div>
);

export const LandingPage = () => {
    const { user, loading } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const isLoggedIn = !loading && user;

    const primaryTo = isLoggedIn ? '/chat' : '/signup';
    const primaryLabel = isLoggedIn ? 'Open workspace' : 'Start for free';

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* ───────── Nav ───────── */}
            <nav
                className="sticky top-0 z-50 border-b"
                style={{
                    backgroundColor: 'var(--glass)',
                    backdropFilter: 'blur(16px) saturate(150%)',
                    borderColor: 'var(--border-color)'
                }}
            >
                <div className="max-w-[1120px] mx-auto px-7 h-[62px] flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo-mark.png" alt="" className="h-[26px] w-[26px] object-contain flex-none" />
                        <b className="text-[15.5px] font-semibold tracking-[-0.025em]">AgentX</b>
                    </Link>

                    <div className="hidden md:flex gap-1 ml-auto">
                        <a href="#capabilities" className="text-[13.5px] px-3 py-1.5 rounded-[9px] transition-colors hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-secondary)' }}>Capabilities</a>
                        <a href="#how" className="text-[13.5px] px-3 py-1.5 rounded-[9px] transition-colors hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-secondary)' }}>How it works</a>
                        <Link to="/architecture" className="text-[13.5px] px-3 py-1.5 rounded-[9px] transition-colors hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-secondary)' }}>Architecture</Link>
                    </div>

                    <div className="flex items-center gap-2 md:ml-0 ml-auto">
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-[9px] grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                            style={{ color: 'var(--text-secondary)' }}
                            title={isDark ? 'Light mode' : 'Dark mode'}
                        >
                            <Icon d={isDark ? P.sun : P.moon} className="w-[15px] h-[15px]" strokeWidth={1.8} />
                        </button>

                        {!isLoggedIn && (
                            <Link to="/login" className="text-[13.5px] font-medium px-3 py-2 rounded-[11px] transition-colors hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-secondary)' }}>
                                Sign in
                            </Link>
                        )}
                        <Link
                            to={primaryTo}
                            className="flex items-center gap-2 text-[13.5px] font-medium px-4 py-2 rounded-[11px] transition-all duration-150 hover:-translate-y-px"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: '0 4px 16px -5px var(--accent-line)' }}
                        >
                            {primaryLabel}
                            <Icon d={P.arrow} className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ───────── Hero ───────── */}
            <header className="relative overflow-hidden pt-[88px]">
                <div className="absolute inset-x-0 -top-[120px] h-[760px] pointer-events-none"
                    style={{ background: 'radial-gradient(65% 55% at 50% 0%, var(--accent-soft), transparent 72%)' }} />
                <div className="absolute inset-0 pointer-events-none" style={gridStyle} />

                <div className="relative max-w-[1120px] mx-auto px-7 text-center">
                    <h1 className="font-semibold tracking-[-0.038em] leading-[1.03] mb-6"
                        style={{ fontSize: 'clamp(40px, 6.1vw, 72px)' }}>
                        Most chatbots can talk.<br />
                        This one has a{' '}
                        <span className="font-serif italic" style={{ color: 'var(--accent)' }}>computer</span>.
                    </h1>

                    <p className="text-[17.5px] leading-[1.65] max-w-[60ch] mx-auto mb-9" style={{ color: 'var(--text-secondary)' }}>
                        AgentX gives your assistant a real sandbox — Python, a shell, a filesystem, your documents
                        and your connected tools — then shows you every step it takes. Ask for a deck; watch it get built.
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center mb-5">
                        <Link
                            to={primaryTo}
                            className="flex items-center gap-2 text-[14.5px] font-medium px-5 py-3 rounded-[13px] transition-all duration-150 hover:-translate-y-px"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: '0 4px 16px -5px var(--accent-line)' }}
                        >
                            {primaryLabel}
                            <Icon d={P.arrow} className="w-[15px] h-[15px]" strokeWidth={2.2} />
                        </Link>
                        <a
                            href="#how"
                            className="flex items-center gap-2 text-[14.5px] font-medium px-5 py-3 rounded-[13px] border transition-all duration-150 hover:-translate-y-px"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-1)' }}
                        >
                            See how a turn runs
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-5 justify-center text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>
                        {['No credit card', 'Isolated sandbox per user'].map(t => (
                            <span key={t} className="flex items-center gap-1.5">
                                <Icon d={P.check} className="w-3.5 h-3.5" strokeWidth={2.2} />
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Product shot */}
                <div className="relative max-w-[1120px] mx-auto px-7 mt-14">
                    <div
                        className="rounded-t-[20px] border border-b-0 overflow-hidden mx-auto max-w-[960px]"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-3)' }}
                    >
                        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)' }}>
                            <div className="flex gap-1.5">
                                {[0, 1, 2].map(i => <span key={i} className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: 'var(--border-strong)' }} />)}
                            </div>
                            <span className="mx-auto text-[11.5px] font-mono px-3.5 py-0.5 rounded-md border"
                                style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)' }}>
                                agentx.app/chat
                            </span>
                            <span className="w-[38px]" />
                        </div>

                        <div className="flex min-h-[392px]">
                            <div className="w-[186px] flex-none border-r p-3.5 hidden sm:block" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                <div className="flex items-center gap-2 text-[11.5px] font-medium border rounded-[9px] px-2.5 py-1.5 mb-3.5"
                                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                                    <Icon d="M12 5v14M5 12h14" className="w-3 h-3" strokeWidth={2} />
                                    New chat
                                </div>
                                {['Q3 regional sales deck', 'Refactor auth middleware', 'Parse invoices from Drive', 'Vector search tuning', 'Explain checkpoints'].map((t, i) => (
                                    <div key={t} className="text-[11.5px] px-2 py-1.5 rounded-[7px] mb-0.5 truncate"
                                        style={i === 0
                                            ? { backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', fontWeight: 500 }
                                            : { color: 'var(--text-tertiary)' }}>
                                        {t}
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 p-6 flex flex-col min-w-0">
                                <div className="self-end max-w-[74%] rounded-[14px] rounded-br-[4px] border px-3.5 py-2.5 text-[12.8px] mb-5"
                                    style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)' }}>
                                    Pull the top 5 regions by growth from the Q3 report and build me a one-pager.
                                </div>

                                <div className="flex gap-2.5 mb-3.5">
                                    <span className="w-[19px] h-[19px] rounded-[6px] grid place-items-center flex-none border"
                                        style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }}>
                                        <Icon d={P.mark} className="w-2.5 h-2.5" strokeWidth={2.6} />
                                    </span>
                                    <span className="text-[12.8px] leading-relaxed">
                                        Pulling the figures from your knowledge base, then building the deck in the sandbox.
                                    </span>
                                </div>

                                {[
                                    { icon: P.search, name: 'search_knowledge_base', sub: '4 chunks', t: '1.2s', tone: 'accent' },
                                    { icon: P.spark, name: 'load_skill', sub: 'pptx-builder', t: '0.1s', tone: 'violet' },
                                    { icon: P.code, name: 'run_python', sub: 'build_onepager.py', t: '4.7s', tone: 'violet' },
                                ].map(s => (
                                    <div key={s.name} className="flex items-center gap-2 ml-7 mb-1.5 px-2.5 py-1.5 border rounded-[9px] text-[11.5px]"
                                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)' }}>
                                        <span style={{ color: s.tone === 'violet' ? 'var(--violet)' : 'var(--accent)' }}>
                                            <Icon d={s.icon} className="w-3 h-3" strokeWidth={2} />
                                        </span>
                                        <span className="font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                                        <span className="truncate" style={{ color: 'var(--text-tertiary)' }}>{s.sub}</span>
                                        <span className="ml-auto text-[10.5px] flex-none" style={{ color: 'var(--text-tertiary)' }}>{s.t}</span>
                                    </div>
                                ))}

                                <div className="ml-7 mb-2.5 rounded-[10px] p-2.5 border"
                                    style={{ backgroundColor: 'var(--term-bg)', borderColor: 'rgba(255,255,255,.06)' }}>
                                    <pre className="font-mono text-[10.6px] leading-[1.7] whitespace-pre-wrap" style={{ color: 'var(--term-fg)' }}>
{`region  rev_m  growth
  APAC   8.42    34.2
 LATAM   3.11    28.9`}
                                        <span style={{ color: '#4ade80' }}>{'\n✓'}</span>
                                        {' wrote outputs/Q3_Onepager.pptx '}
                                        <span style={{ color: 'var(--term-dim)' }}>(6 slides)</span>
                                    </pre>
                                </div>

                                <div className="ml-7 mb-3 flex items-center gap-2.5 px-3 py-2.5 border rounded-[11px]"
                                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
                                    <span className="w-7 h-7 rounded-[8px] grid place-items-center flex-none text-[8px] font-bold text-white"
                                        style={{ background: 'linear-gradient(150deg,#e2703a,#c2410c)' }}>PPTX</span>
                                    <span className="min-w-0">
                                        <span className="block text-[11.8px] font-medium truncate">Q3_Regional_Onepager.pptx</span>
                                        <span className="block text-[10.3px]" style={{ color: 'var(--text-tertiary)' }}>6 slides · 1.4 MB</span>
                                    </span>
                                    <span className="ml-auto flex-none" style={{ color: 'var(--text-tertiary)' }}>
                                        <Icon d={P.download} className="w-3.5 h-3.5" strokeWidth={1.8} />
                                    </span>
                                </div>

                                {/* mini composer */}
                                <div className="mt-auto border rounded-[15px]"
                                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
                                    <div className="px-3.5 py-2.5 text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>Reply to AgentX…</div>
                                    <div className="flex items-center gap-1.5 px-2 pb-2">
                                        <span className="px-2 py-1 rounded-[8px] text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                            <Icon d="M12 5v14M5 12h14" className="w-3 h-3" strokeWidth={2} />
                                        </span>
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] text-[11px] border"
                                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
                                            Tools · 6
                                        </span>
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] text-[11px] border"
                                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
                                            RAG
                                        </span>
                                        <span className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-[8px] text-[11px] border"
                                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                            Gemini 3.5 Flash
                                        </span>
                                        <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center flex-none"
                                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' }}>
                                            <Icon d="M12 20V5M12 5l-6 6M12 5l6 6" className="w-3 h-3" strokeWidth={2.4} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ───────── Stack strip ───────── */}
            <div className="border-y py-6" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)' }}>
                <div className="max-w-[1120px] mx-auto px-7 flex flex-wrap items-center justify-center gap-x-9 gap-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: 'var(--text-tertiary)' }}>Built on</span>
                    {['LangGraph', 'Gemini', 'FastAPI', 'Qdrant', 'MongoDB', 'Redis', 'MCP'].map(t => (
                        <b key={t} className="text-[14px] font-medium tracking-[-0.015em]" style={{ color: 'var(--text-secondary)' }}>{t}</b>
                    ))}
                </div>
            </div>

            {/* ───────── Capabilities ───────── */}
            <section id="capabilities" className="py-24">
                <div className="max-w-[1120px] mx-auto px-7">
                    <div className="max-w-[64ch] mb-12">
                        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.07em] mb-4" style={{ color: 'var(--accent)' }}>
                            <span className="w-[22px] h-px" style={{ backgroundColor: 'var(--accent-line)' }} />
                            Capabilities
                        </div>
                        <h2 className="font-semibold tracking-[-0.032em] leading-[1.12] mb-3.5" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
                            Not a wrapper. <span className="font-serif italic" style={{ color: 'var(--text-secondary)' }}>A workspace.</span>
                        </h2>
                        <p className="text-[16px] leading-[1.65]" style={{ color: 'var(--text-secondary)' }}>
                            Every capability below runs behind one agent loop — it decides what to reach for,
                            and you see the receipts in the transcript.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5">
                        <Card span="lg:col-span-4">
                            <CardIcon d={P.code} tone="violet" />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">A real Python sandbox, per user</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Its own virtualenv, its own filesystem, its own <code className="font-mono text-[12.5px]" style={{ color: 'var(--text-primary)' }}>pip install</code>.
                                The agent writes code, runs it, reads the traceback, and fixes it — the same loop a developer uses.
                            </p>
                            <div className="mt-4 rounded-[11px] p-3 border" style={{ backgroundColor: 'var(--term-bg)', borderColor: 'rgba(255,255,255,.06)' }}>
                                <pre className="font-mono text-[11px] leading-[1.75] whitespace-pre-wrap" style={{ color: 'var(--term-fg)' }}>
                                    <span style={{ color: 'var(--term-dim)' }}>$</span>{' pip install openpyxl '}
                                    <span style={{ color: 'var(--term-dim)' }}>--quiet</span>{'\n'}
                                    <span style={{ color: '#c792ea' }}>import</span>{' pandas '}<span style={{ color: '#c792ea' }}>as</span>{' pd\n'}
                                    <span style={{ color: 'var(--term-dim)' }}>{'> ValueError: no sheet named \'Regions\''}</span>{'\n'}
                                    <span style={{ color: 'var(--term-dim)' }}># retrying with sheet_name=0</span>{'\n'}
                                    <span style={{ color: '#4ade80' }}>✓</span>{' 6 rows written to outputs/growth.xlsx'}
                                </pre>
                            </div>
                        </Card>

                        <Card span="lg:col-span-2">
                            <CardIcon d={P.file} />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Real files out</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Decks, spreadsheets, documents and charts — generated in the sandbox, downloadable from the message.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {[['PPTX', 'linear-gradient(150deg,#e2703a,#c2410c)'], ['XLSX', 'linear-gradient(150deg,#22a565,#15803d)'], ['DOCX', 'linear-gradient(150deg,#4b82e8,#1d4ed8)'], ['PDF', 'linear-gradient(150deg,#e8544b,#b91c1c)']].map(([label, bg]) => (
                                    <span key={label} className="flex items-center gap-2 border rounded-[9px] pl-1.5 pr-2.5 py-1.5 text-[11.5px]"
                                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                                        <span className="w-[19px] h-[19px] rounded-[5px] grid place-items-center text-[6.5px] font-bold text-white" style={{ background: bg }}>{label}</span>
                                        {label.toLowerCase()}
                                    </span>
                                ))}
                            </div>
                        </Card>

                        <Card span="lg:col-span-3">
                            <CardIcon d={P.book} />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Agentic RAG over your documents</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Upload a PDF and it's parsed for tables and figures, chunked, embedded into Qdrant —
                                then searched <em>and</em> cross-checked against the live web, in parallel.
                            </p>
                            <div className="mt-4 flex flex-col gap-2">
                                {[['Q3_Regional_Report.pdf · p.12', 91, true], ['pricing_2026.xlsx · Sheet1', 79, true], ['web · sector benchmarks', 64, false]].map(([label, pct, isDoc]) => (
                                    <div key={label} className="flex items-center gap-2.5 text-[11.8px] border rounded-[9px] px-2.5 py-1.5"
                                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                                        <span style={{ color: isDoc ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                                            <Icon d={isDoc ? P.search : P.globe} className="w-3 h-3" strokeWidth={2} />
                                        </span>
                                        <span className="truncate">{label}</span>
                                        <span className="ml-auto w-[52px] h-1 rounded-full flex-none overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
                                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card span="lg:col-span-3">
                            <CardIcon d={P.plug} />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Bring your own tools over MCP</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Connect any Model Context Protocol server and its tools land in the agent's toolbox
                                the same turn — no redeploy, no code change.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {[['Google Drive', true], ['Filesystem', true], ['Notion', false], ['GitHub', false]].map(([name, live]) => (
                                    <span key={name} className="flex items-center gap-2 border rounded-full pl-2 pr-3 py-1.5 text-[11.8px]"
                                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full"
                                            style={live
                                                ? { backgroundColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' }
                                                : { backgroundColor: 'var(--text-tertiary)' }} />
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </Card>

                        <Card span="lg:col-span-2">
                            <CardIcon d={P.spark} tone="violet" />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Skills, loaded on demand</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Markdown playbooks the agent discovers and reads only when relevant — so the system
                                prompt stays small and the behaviour stays specific.
                            </p>
                        </Card>

                        <Card span="lg:col-span-2">
                            <CardIcon d={P.image} />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Reads screenshots</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Drop in a dashboard, a whiteboard photo or an error screen and it works from what it sees.
                            </p>
                        </Card>

                        <Card span="lg:col-span-2">
                            <CardIcon d={P.brain} />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Remembers you</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                A memory bank quietly extracts durable facts — your stack, your projects — and carries
                                them into every new chat.
                            </p>
                        </Card>

                        <Card span="lg:col-span-2">
                            <CardIcon d={P.mic} tone="violet" />
                            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] mb-1.5">Live voice mode</h3>
                            <p className="text-[13.8px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>
                                Talk to the same agent out loud — same tools, same sandbox, same memory — with a
                                live transcript alongside the conversation.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* ───────── How it works ───────── */}
            <section id="how" className="pb-24">
                <div className="max-w-[1120px] mx-auto px-7">
                    <div className="max-w-[64ch] mb-12">
                        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.07em] mb-4" style={{ color: 'var(--accent)' }}>
                            <span className="w-[22px] h-px" style={{ backgroundColor: 'var(--accent-line)' }} />
                            How a turn runs
                        </div>
                        <h2 className="font-semibold tracking-[-0.032em] leading-[1.12] mb-3.5" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
                            You see <span className="font-serif italic" style={{ color: 'var(--text-secondary)' }}>every step</span>, not just the answer.
                        </h2>
                        <p className="text-[16px] leading-[1.65]" style={{ color: 'var(--text-secondary)' }}>
                            No black box. Each tool call is a row in the transcript with its arguments, its output and
                            how long it took — expandable when you care, collapsed when you don't.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 rounded-[18px] border overflow-hidden"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                        {[
                            ['01', 'Ask in plain language', 'Pick a model, flip on the tools you want from the message bar, attach a file if you have one. No settings trip required.'],
                            ['02', 'The agent picks its tools', 'One ReAct loop decides what to search, what to run and what to write — and streams each decision as it happens.'],
                            ['03', 'You get artifacts, with receipts', 'Files land as downloadable cards, sources land as citations, and the console output is right there if you want to audit it.'],
                        ].map(([n, title, body], i) => (
                            <div key={n} className={`p-7 ${i < 2 ? 'md:border-r border-b md:border-b-0' : ''}`} style={{ borderColor: 'var(--border-color)' }}>
                                <span className="inline-block font-mono text-[11px] rounded-md px-2 py-0.5 mb-4 border"
                                    style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
                                    {n}
                                </span>
                                <h4 className="text-[15.5px] font-semibold tracking-[-0.018em] mb-1.5">{title}</h4>
                                <p className="text-[13.5px] leading-[1.62]" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                            </div>
                        ))}
                    </div>

                    {/* Architecture strip */}
                    <div className="mt-3.5 rounded-[18px] border p-7" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                            {[
                                ['Message', null],
                                ['agent_node · Gemini', 'accent'],
                                ['tool_node · parallel', 'violet'],
                                ['Stream', null],
                            ].map(([label, tone], i, arr) => (
                                <span key={label} className="flex items-center gap-2.5">
                                    <span className="flex items-center border rounded-[11px] px-3.5 py-2 text-[12.5px] whitespace-nowrap"
                                        style={tone === 'accent'
                                            ? { borderColor: 'var(--accent-line)', backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 500 }
                                            : tone === 'violet'
                                                ? { borderColor: 'var(--violet-line)', backgroundColor: 'var(--violet-soft)', color: 'var(--violet)', fontWeight: 500 }
                                                : { borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                                        {label}
                                    </span>
                                    {i < arr.length - 1 && <span style={{ color: 'var(--text-tertiary)' }}>→</span>}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
                            {['sandbox', 'skills', 'qdrant search', 'web search', 'mcp servers', 'memory bank'].map(t => (
                                <span key={t} className="border rounded-[11px] px-2.5 py-1.5 text-[11.5px]"
                                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────── Quote ───────── */}
            <section className="pb-24">
                <div className="max-w-[74ch] mx-auto px-7 text-center">
                    <p className="font-serif italic tracking-[-0.02em] leading-[1.32] mb-5" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>
                        “The interesting part isn't that it answers. It's that it opens a terminal, gets it wrong,
                        reads the error, and tries again — and you can watch the whole thing.”
                    </p>
                    <div className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>— from the project write-up</div>
                </div>
            </section>

            {/* ───────── Final CTA ───────── */}
            <section className="pb-24">
                <div className="max-w-[1120px] mx-auto px-7">
                    <div className="relative rounded-[26px] border overflow-hidden px-10 py-[72px] text-center"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
                        <div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(60% 60% at 50% 0%, var(--accent-soft), transparent 70%)' }} />
                        <div className="relative">
                            <h2 className="font-semibold tracking-[-0.032em] leading-[1.12] mb-3" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
                                Give your assistant a computer.
                            </h2>
                            <p className="text-[16px] leading-[1.65] max-w-[52ch] mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
                                Free to start. Your own sandbox in about four seconds.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <Link
                                    to={primaryTo}
                                    className="flex items-center gap-2 text-[14.5px] font-medium px-5 py-3 rounded-[13px] transition-all duration-150 hover:-translate-y-px"
                                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: '0 4px 16px -5px var(--accent-line)' }}
                                >
                                    {primaryLabel}
                                    <Icon d={P.arrow} className="w-[15px] h-[15px]" strokeWidth={2.2} />
                                </Link>
                                <Link
                                    to="/architecture"
                                    className="text-[14.5px] font-medium px-5 py-3 rounded-[13px] border transition-all duration-150 hover:-translate-y-px"
                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-1)' }}
                                >
                                    Read the architecture
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────── Footer ───────── */}
            <footer className="border-t py-11" style={{ borderColor: 'var(--border-color)' }}>
                <div className="max-w-[1120px] mx-auto px-7 flex flex-wrap gap-6 items-start">
                    <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-3">
                            <img src="/logo-mark.png" alt="" className="h-[26px] w-[26px] object-contain flex-none" />
                            <b className="text-[15.5px] font-semibold tracking-[-0.025em]">AgentX</b>
                        </div>
                        <p className="text-[13.3px] max-w-[34ch]" style={{ color: 'var(--text-secondary)' }}>
                            An agentic AI workspace with a sandbox, retrieval and MCP tools.
                        </p>
                    </div>

                    <div className="min-w-[130px]">
                        <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] mb-3" style={{ color: 'var(--text-tertiary)' }}>Product</div>
                        <Link to="/chat" className="block text-[13.3px] py-0.5 transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>Chat</Link>
                        <Link to="/rag-test" className="block text-[13.3px] py-0.5 transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>Test retrieval</Link>
                        <Link to="/mcp-servers" className="block text-[13.3px] py-0.5 transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>MCP servers</Link>
                    </div>

                    <div className="min-w-[130px]">
                        <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] mb-3" style={{ color: 'var(--text-tertiary)' }}>Developers</div>
                        <Link to="/architecture" className="block text-[13.3px] py-0.5 transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>Architecture</Link>
                        <Link to="/profile" className="block text-[13.3px] py-0.5 transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>Your profile</Link>
                    </div>

                    <div className="w-full mt-9 pt-5 border-t flex flex-wrap items-center justify-between gap-4 text-[12.5px]"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
                        <span>© {new Date().getFullYear()} AgentX</span>
                        <div className="flex items-center gap-4">
                            <Link to="/privacy" className="transition-colors hover:text-[var(--text-primary)]">Privacy Policy</Link>
                            <Link to="/terms" className="transition-colors hover:text-[var(--text-primary)]">Terms of Service</Link>
                        </div>
                        <span>Built with LangGraph, FastAPI and React.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
