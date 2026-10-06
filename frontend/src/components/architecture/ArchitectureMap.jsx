import { useState, useEffect } from 'react';
import { Tag } from './primitives';
import {
    IconMonitor, IconAgent, IconMcp, IconFileText, IconChip, IconDatabase,
    IconGitBranch, IconUser, IconSkills, IconRag, IconMemory, IconShield,
    IconPlugLink, IconArrowRight,
} from './icons';

// ── Isometric box geometry ──────────────────────────────────────────────
// Three flat polygons (top / left / right) around a center point — no CSS
// 3D transforms, so text placed separately stays perfectly horizontal.
// Shading is a black overlay at increasing opacity per face, which darkens
// whatever the real surface color is without needing theme-specific values.
function isoFaces(cx, cy, halfW, halfH, depth) {
    const top = [[cx, cy - halfH], [cx + halfW, cy], [cx, cy + halfH], [cx - halfW, cy]];
    const left = [[cx - halfW, cy], [cx, cy + halfH], [cx, cy + halfH + depth], [cx - halfW, cy + depth]];
    const right = [[cx, cy + halfH], [cx + halfW, cy], [cx + halfW, cy + depth], [cx, cy + halfH + depth]];
    const toPts = (pts) => pts.map((p) => p.join(',')).join(' ');
    return { top: toPts(top), left: toPts(left), right: toPts(right) };
}

// Point at parameter t along the cubic bezier `M x1,y1 C x1,midY x2,midY x2,y2`
// (vertical-tangent S-curve) — used to place connection labels ON the curve
// at a chosen bias instead of always the raw midpoint, so a label can be
// pushed away from whichever endpoint's own text it would otherwise collide with.
function curvePoint(x1, y1, x2, y2, midY, t) {
    const mt = 1 - t;
    const c = [mt ** 3, 3 * mt ** 2 * t, 3 * mt * t ** 2, t ** 3];
    const x = c[0] * x1 + c[1] * x1 + c[2] * x2 + c[3] * x2;
    const y = c[0] * y1 + c[1] * midY + c[2] * midY + c[3] * y2;
    return { x, y };
}

function IsoBox({ x, y, w = 85, h = 42, depth = 36, active, dim, hub, onClick, label }) {
    const { top, left, right } = isoFaces(x, y, w, h, depth);
    return (
        <g
            onClick={onClick}
            style={{ cursor: 'pointer', opacity: dim ? 0.35 : 1, transition: 'opacity .25s, transform .2s', transform: active ? 'translateY(-3px)' : 'none' }}
            role="button"
            aria-label={label}
        >
            <ellipse cx={x} cy={y + depth + h + 5} rx={w * 0.8} ry={h * 0.32} fill="#000" opacity={active ? 0.16 : 0.09} />
            <polygon points={top} fill={hub ? 'var(--arch-accent-wash)' : 'var(--arch-bg-raised-2)'} />
            <polygon points={left} fill={hub ? 'var(--arch-accent-wash)' : 'var(--arch-bg-raised-2)'} />
            <polygon points={left} fill="#000" opacity={0.15} />
            <polygon points={right} fill={hub ? 'var(--arch-accent-wash)' : 'var(--arch-bg-raised-2)'} />
            <polygon points={right} fill="#000" opacity={0.32} />
            <polygon points={top} fill="none" stroke={active ? 'var(--arch-accent)' : hub ? 'var(--arch-accent-line)' : 'var(--arch-line-strong)'} strokeWidth={active ? 1.8 : 1.1} style={{ transition: 'stroke .2s' }} />
            <polygon points={left} fill="none" stroke="var(--arch-line)" strokeWidth="1" />
            <polygon points={right} fill="none" stroke="var(--arch-line)" strokeWidth="1" />
        </g>
    );
}

// ── Node registry — layout, no IPs, generous verified spacing ───────────
const NODES = {
    frontend: {
        title: 'Frontend', sub: 'Vercel', icon: IconMonitor,
        x: 620, y: 70, w: 92, h: 44, depth: 28,
        blurb: 'The React app you\'re looking at right now, built with React 18, Vite, and Tailwind. It ships completely on its own — there is no server to babysit and no build step a human has to trigger.',
        detail: 'Every push to the main branch on GitHub triggers Vercel to build a fresh static bundle and publish it to a global edge network, so the page you loaded was likely served from a server physically close to you rather than one central location. There is no server-side rendering step — the browser downloads the bundle, runs it, and it takes over from there. The app talks to the backend two different ways depending on what it needs: normal HTTPS requests for things like logging in or fetching the conversation list, and a persistent Server-Sent Events (SSE) connection specifically for live chat, which is what lets tokens appear on screen one at a time as the agent actually generates them instead of the whole reply arriving in one blocking chunk.',
        flow: { steps: [{ label: 'Your browser' }, { label: 'Vercel edge' }, { label: 'Backend API' }] },
        facts: [
            'Auto-deploys straight from GitHub on every push to main — no manual publish step.',
            'HTTPS for regular requests, Server-Sent Events for the live streaming chat response.',
            'Purely client-rendered — no server-side rendering, just a static bundle.',
        ],
        tags: ['Vercel', 'auto-deploy on push', 'React + Vite'],
    },
    backend: {
        title: 'Backend & Agent', sub: 'AWS EC2 · production host', icon: IconAgent,
        x: 620, y: 300, w: 145, h: 66, depth: 52, hub: true,
        blurb: 'FastAPI plus a single ReAct LangGraph agent — the actual "brain" of the system. Every other box on this map exists purely to serve this one.',
        loop: { nodes: ['agent_node', 'agent_tool_node'], note: 'agent_node assembles the full tool list and calls the model. If the model asks for tools, agent_tool_node runs every one of them in parallel and hands the results back — looping until the model has nothing left to call and streams a plain answer instead.' },
        tabs: true,
    },
    cicd: {
        title: 'CI/CD', sub: 'GitHub Actions', icon: IconGitBranch,
        x: 230, y: 210, w: 78, h: 36, depth: 26,
        blurb: 'Tests gate every deploy. A push that fails the test suite never reaches the production server at all.',
        detail: 'This replaced what used to be a fully manual process: SSH into the server, pull the code, rebuild the Docker image, and swap the running container by hand, every single time, with no safety net if something went wrong. Now a push to main first runs the entire automated test suite; only if every test passes does a second workflow trigger, which copies the new code to a freshly versioned directory on the server, builds a new Docker image, and swaps it in for the one that was running. The previous container is not deleted, it is stopped and renamed, so rolling back is a single command away rather than a fire drill. After the swap, an automated health check hits the live server; if it does not get a healthy response, the pipeline rolls the previous container back into place automatically, with no human paged at 2am to do it manually.',
        flow: {
            steps: [{ label: 'Push to main' }, { label: 'Run full test suite' }, { label: 'Build & swap container' }],
            branch: {
                label: 'health check after swap',
                outcomes: [
                    { cond: 'responds healthy', to: 'deploy stays live', tone: 'good' },
                    { cond: 'fails to respond', to: 'auto-rollback to previous container', tone: 'bad' },
                ],
            },
        },
        facts: [
            'Full test suite runs on every push or pull request to main.',
            'Deploy only triggers after every test passes.',
            'Old containers are kept, renamed, not deleted — instant rollback.',
        ],
        tags: ['tests gate deploy', 'auto-rollback', 'versioned, not just "latest"'],
    },
    omniroute: {
        title: 'OmniRoute', sub: 'LLM gateway', icon: IconMcp,
        x: 300, y: 625, w: 84, h: 40, depth: 32,
        blurb: 'A gateway service that sits between the backend and Google Gemini, so the application talks to one small, stable API instead of a specific model provider\'s SDK directly.',
        detail: 'Every request the agent makes to the language model actually goes to OmniRoute first, which forwards it to Gemini and streams the response straight back. This single point of indirection is what lets the model provider be swapped, load-balanced, or given caching and rate-limiting logic later without touching a single line of backend code — the backend only ever needs to know about OmniRoute\'s address. It runs as an always-on background service that restarts itself automatically if it ever crashes, and every request to it has to carry a shared key, so nothing reaches Gemini through this gateway without authorization.',
        flow: { steps: [{ label: 'Backend' }, { label: 'OmniRoute (key-gated)' }, { label: 'Google Gemini' }] },
        facts: [
            'Always-on background service, auto-restarts if it crashes.',
            'Gated by a shared key — nothing reaches it, or Gemini through it, without one.',
            'One indirection point means swapping model providers later doesn\'t touch backend code.',
        ],
        tags: ['LLM gateway', 'auto-restart', 'key-gated'],
    },
    parser: {
        title: 'PDF Parser', sub: 'document microservice', icon: IconFileText,
        x: 620, y: 660, w: 84, h: 40, depth: 32,
        blurb: 'A standalone service that extracts real structure — text, tables, and figures — from uploaded documents, instead of relying only on a third-party parsing API for everything.',
        detail: 'When a document is uploaded, it does not go straight to text extraction. The service first runs layout detection to understand the page\'s actual structure — where the tables are, where a figure sits versus a column of body text — because extracting a table as if it were a paragraph destroys the information in it. Only after layout is understood does it extract the text, tables, and figures separately, and the resulting chunks are sent onward to be embedded and stored in Qdrant for retrieval. It runs as its own container, fully independent of the backend\'s own deploy cycle, and keeps a self-contained dashboard recording every past parse run — filename, status, page count, duration — so a failed or slow parse can be diagnosed without digging through raw logs.',
        flow: {
            steps: [{ label: 'Document uploaded' }, { label: 'Detect layout' }, { label: 'Extract text / tables / figures' }],
            branch: {
                label: 'extraction result',
                outcomes: [
                    { cond: 'parsed cleanly', to: 'chunks sent to Data Layer (Qdrant)', tone: 'good' },
                    { cond: 'parse fails', to: 'recorded as failed, surfaced in the dashboard', tone: 'bad' },
                ],
            },
        },
        facts: [
            'Runs as its own container, independently deployable from the backend.',
            'Detects layout — tables, figures, columns — before extracting text, so structure isn\'t lost.',
            'Has its own self-contained dashboard recording every past parse run.',
        ],
        tags: ['own container', 'layout-aware', 'own dashboard'],
    },
    sandbox: {
        title: 'Sandbox', sub: 'isolated execution', icon: IconChip,
        x: 940, y: 625, w: 84, h: 40, depth: 32,
        blurb: 'Where the agent\'s code actually executes — a separate, network-isolated machine, running each execution inside a gVisor container. Not a subprocess inside the main app.',
        detail: 'When the agent decides to run Python or a shell command, that code is not executed as a subprocess of the backend process. It is streamed over the network to this dedicated host and run inside a gVisor container created just for that one execution. gVisor works by intercepting the code\'s system calls in userspace and only forwarding a narrow, audited subset down to the real kernel, which means even a serious exploit inside the sandboxed code has a far smaller surface to work with than a normal process would — this is meaningfully stronger than just dropping Linux capabilities on a subprocess, though the app does both. The host itself is never reachable from the public internet, only from the backend, and the whole design is fail-closed on purpose: if this host cannot be reached, the tool call returns an explicit error instead of quietly falling back to running the code locally, because a silent fallback would drop the security boundary at exactly the moment something is already wrong.',
        flow: {
            steps: [{ label: 'Backend requests execution' }, { label: 'Network hop to sandbox host' }],
            branch: {
                label: 'is the host reachable?',
                outcomes: [
                    { cond: 'reachable', to: 'runs inside a fresh gVisor container, result streamed back', tone: 'good' },
                    { cond: 'unreachable', to: 'explicit error — never silently runs locally', tone: 'bad' },
                ],
            },
        },
        facts: [
            'gVisor intercepts syscalls in userspace — kernel-level isolation, not just a dropped-capabilities subprocess.',
            'Never reachable from the public internet — only from the backend.',
            'Fail-closed by design: unreachable means an explicit error, never a silent local fallback.',
        ],
        tags: ['gVisor per run', 'fail-closed', 'not internet-reachable'],
    },
    data: {
        title: 'Data Layer', sub: 'managed, not self-hosted', icon: IconDatabase,
        x: 940, y: 850, w: 165, h: 46, depth: 30, quadrant: true,
        blurb: 'Everything that needs to persist lives in four managed services, each chosen for what it\'s actually good at, rather than one database trying to do every job.',
        detail: 'Nothing stateful runs on the application server itself, which means the backend container can be rebuilt from a clean image at any time without any risk of losing data — all of it already lives somewhere else, managed by a service built specifically for that kind of data.',
        quadrants: [
            { label: 'MongoDB', note: 'Users, conversations, messages, and the credit ledger — anything structured and relational-ish that the app reads and writes constantly.' },
            { label: 'Qdrant', note: 'Vector embeddings of uploaded documents, searched by similarity for retrieval-augmented answers — a job a normal database isn\'t built for.' },
            { label: 'Redis', note: 'Conversation-history cache, background job status, and rate limiting — all short-lived, high-frequency data. The app degrades gracefully if this is ever unreachable.' },
            { label: 'Cloudinary', note: 'Uploaded attachments and images the agent generates — binary data that doesn\'t belong in a database at all.' },
        ],
        tags: ['MongoDB Atlas', 'Qdrant', 'Redis (optional)', 'Cloudinary'],
    },
};

const PLATFORM_GROUP = { x1: 200, x2: 1040, y: 545, label: 'One shared host · three services behind one gate' };

// [from, to, label, labelT?] — labelT (0-1) biases the label along the curve
// away from a colliding endpoint; omit for the default (near-midpoint) spot.
const CONNECTIONS = [
    ['frontend', 'backend', 'HTTPS + SSE', 0.8],
    ['cicd', 'backend', 'deploys'],
    ['backend', 'omniroute', 'LLM calls'],
    ['backend', 'parser', 'parse requests'],
    ['backend', 'sandbox', 'code execution'],
    ['backend', 'data', 'reads / writes'],
    ['parser', 'data', 'stores chunks', 0.25],
];

// ── Backend node's internal architecture — shown as tabs in the dialog ──
const BACKEND_TABS = [
    { id: 'loop', label: 'Agent loop', icon: IconAgent, body: 'A single two-node ReAct graph, not a supervisor routing between subgraphs. agent_node assembles one flat tool list — always-on sandbox tools, skill discovery, the user\'s enabled tools, and any connected MCP tools — and binds them all to the model in one call. If the model asks for tools, agent_tool_node runs every requested call in parallel via asyncio.gather and loops back with the results. This replaced an earlier design that routed between 7 specialized subgraphs via an intent classifier, which added coordination overhead and made the classifier itself a single point of misrouting. A flat loop turned out simpler to reason about and debug.', tags: ['2-node LangGraph', 'no supervisor', 'Redis-backed checkpointing'] },
    { id: 'tools', label: 'Tools & skills', icon: IconSkills, body: 'Always-on sandbox tools (run Python, run a shell command, edit files, read files natively as images or PDFs rather than lossy text) are available every turn. Skills work differently: they\'re markdown manuals the agent discovers by name and one-line description first, and only loads in full — the entire procedure — when it actually decides a task needs it. Inlining every skill\'s full instructions into the prompt on every single turn would bloat context and dilute the model\'s attention on what\'s actually relevant right now, so the system deliberately keeps the expensive detail out of context until it\'s needed.', tags: ['sandbox_* tools', 'skills loaded on demand', 'two-level disclosure'] },
    { id: 'rag', label: 'RAG', icon: IconRag, body: 'When answering from documents, vector search against Qdrant and a web search run in parallel rather than one after the other, specifically so one source failing doesn\'t sink the whole retrieval — a slow or broken web search doesn\'t block document results from coming back. What comes back is graded for relevance and then checked for groundedness before the agent trusts it enough to answer with. Uploads themselves are asynchronous: the API hands back a job ID immediately, and the real parsing, chunking, and embedding work happens in the background while the user keeps chatting.', tags: ['parallel retrieval', 'groundedness check', 'async ingestion'] },
    { id: 'mcp', label: 'MCP', icon: IconMcp, body: 'External tool servers — Google Drive, filesystem access, and others — connect over stdio, Server-Sent Events, or Streamable HTTP, authenticating with either OAuth 2.1 or a plain API key depending on what the server supports. Once connected, the tools a server exposes are cached for 5 minutes so the agent isn\'t paying a network round trip to rediscover them on every single turn. The Google Drive connection specifically uses a narrow, non-sensitive OAuth scope rather than full account access — a deliberate choice to avoid the paid annual security assessment Google requires for broader access, at the cost of only being able to touch files a user explicitly shares rather than freely searching their whole Drive.', tags: ['5-min tool cache', 'OAuth 2.1 + PKCE', 'narrow Drive scope'] },
    { id: 'memory', label: 'Memory & context', icon: IconMemory, body: 'Two separate systems work together here. A memory bank extracts durable facts about the user — name, stack, ongoing projects, preferences — in the background after each turn, and folds the most recent ones back into the system prompt so a brand new conversation already has context. Separately, only the most recent 30 messages of a conversation are ever sent to the model raw; anything older than that is not simply dropped. It\'s batched, summarized in groups of 10 by a background call, and the resulting word-capped summary rides along in the prompt as its own section — compaction instead of hard amnesia.', tags: ['background extraction', 'batched summarization', 'compaction over truncation'] },
    { id: 'guardrails', label: 'Guardrails & cost', icon: IconShield, body: 'Every sandbox tool call passes through one centralized hook before it\'s allowed to run, checking for path-escape attempts and destructive shell patterns — a single place to maintain instead of every tool re-implementing its own version of the same check and someone inevitably forgetting one. On the cost side, a free-tier credit cap tracks real spend computed from actual token counts, not estimates, per user. If a turn is already in progress when the cap is hit, it\'s allowed to finish into a small grace buffer rather than being cut off mid-sentence — it\'s the next turn that actually gets blocked, a deliberate trade of a small bounded overrun for a much better experience right at the boundary.', tags: ['centralized hook', 'real token-based cost', 'grace buffer, not hard cutoff'] },
    { id: 'lifecycle', label: 'Turn lifecycle', icon: IconPlugLink, body: 'A chat turn runs as a background task detached from the HTTP request that started it, not tied to that one connection\'s lifetime. Closing the tab, refreshing the page, or a network drop no longer kills generation — the backend keeps running the turn regardless, and a later request (a reload, a second tab) can attach to it, replay everything already produced, and keep watching it stream live. This is explicitly single-process and in-memory: if the server itself crashes, the in-flight turn is lost along with it — a real tradeoff, accepted because it matches the app\'s current single-container scale, and because the much more common failure (a user\'s own tab or connection dropping) is the one this was actually built to fix.', tags: ['detached asyncio.Task', 'survives disconnects', 'single-process by design'] },
];

function MiniFlow({ flow }) {
    if (!flow) return null;
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 justify-center">
                {flow.steps.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="arch-panel-inset px-3 py-2 text-center" style={{ minWidth: 96 }}>
                            <div className="text-[12px] font-medium" style={{ color: 'var(--arch-text)' }}>{s.label}</div>
                        </div>
                        {i < flow.steps.length - 1 && <IconArrowRight width={15} height={15} style={{ color: 'var(--arch-text-faint)' }} />}
                    </div>
                ))}
            </div>

            {flow.branch && (
                <>
                    <div className="flex flex-col items-center mt-2">
                        <IconArrowRight width={15} height={15} style={{ color: 'var(--arch-text-faint)', transform: 'rotate(90deg)' }} />
                        <span className="arch-mono text-[10px] mt-0.5" style={{ color: 'var(--arch-text-faint)' }}>{flow.branch.label}</span>
                    </div>
                    <div className="flex flex-wrap items-stretch justify-center gap-3 mt-2">
                        {flow.branch.outcomes.map((o) => (
                            <div key={o.cond} className="arch-panel-inset px-3.5 py-2.5 text-center" style={{ minWidth: 150, borderColor: o.tone === 'bad' ? 'var(--danger)' : 'var(--arch-accent-line)' }}>
                                <div className="arch-mono text-[10px]" style={{ color: o.tone === 'bad' ? 'var(--danger)' : 'var(--arch-accent)' }}>{o.cond}</div>
                                <div className="text-[12px] mt-1" style={{ color: 'var(--arch-text)' }}>{o.to}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function DetailDialog({ node, onClose }) {
    const [tab, setTab] = useState(BACKEND_TABS[0].id);
    useEffect(() => setTab(BACKEND_TABS[0].id), [node]);
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    if (!node) return null;
    const Icon = node.icon;
    const activeTab = node.tabs ? BACKEND_TABS.find((t) => t.id === tab) : null;

    return (
        <div className="arch-map-scrim" onClick={onClose}>
            <div className="arch-map-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 p-6 pb-5" style={{ borderBottom: '1px solid var(--arch-line)' }}>
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0" style={{ background: 'var(--arch-accent-wash)', border: '1px solid var(--arch-accent-line)', color: 'var(--arch-accent)' }}>
                            <Icon width={20} height={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[18px] font-semibold" style={{ color: 'var(--arch-text)' }}>{node.title}</div>
                            <div className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>{node.sub}</div>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="arch-lift flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center" style={{ border: '1px solid var(--arch-line-strong)', color: 'var(--arch-text-dim)' }}>✕</button>
                </div>

                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 90px)' }}>
                    <p className="text-[14.5px] leading-relaxed max-w-2xl" style={{ color: 'var(--arch-text-dim)' }}>{node.blurb}</p>

                    {(node.flow || node.loop) && (
                        <div className="arch-panel mt-6 p-5">
                            <div className="arch-mono text-[10.5px] mb-4 text-center" style={{ color: 'var(--arch-text-faint)' }}>how this box works, inside</div>
                            {node.loop ? (
                                <>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="arch-panel-inset px-4 py-3 text-center"><span className="arch-mono text-[12.5px]" style={{ color: 'var(--arch-text)' }}>{node.loop.nodes[0]}</span></div>
                                        <div className="flex flex-col items-center gap-0.5" style={{ color: 'var(--arch-accent)' }}>
                                            <IconArrowRight width={16} height={16} />
                                            <IconArrowRight width={16} height={16} style={{ transform: 'rotate(180deg)' }} />
                                        </div>
                                        <div className="arch-panel-inset px-4 py-3 text-center"><span className="arch-mono text-[12.5px]" style={{ color: 'var(--arch-text)' }}>{node.loop.nodes[1]}</span></div>
                                    </div>
                                    <p className="text-[12.5px] leading-relaxed mt-4 text-center max-w-md mx-auto" style={{ color: 'var(--arch-text-dim)' }}>{node.loop.note}</p>
                                </>
                            ) : <MiniFlow flow={node.flow} />}
                        </div>
                    )}

                    {node.detail && (
                        <p className="text-[13.5px] leading-relaxed mt-5" style={{ color: 'var(--arch-text-dim)' }}>{node.detail}</p>
                    )}

                    {node.quadrants && (
                        <div className="arch-panel mt-6 p-5">
                            <div className="arch-mono text-[10.5px] mb-4 text-center" style={{ color: 'var(--arch-text-faint)' }}>four services, four jobs</div>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {node.quadrants.map((q) => (
                                    <div key={q.label} className="arch-panel-inset p-4">
                                        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--arch-text)' }}>{q.label}</div>
                                        <div className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--arch-text-dim)' }}>{q.note}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {node.tabs && (
                        <>
                            <div className="flex flex-wrap gap-1.5 mt-6">
                                {BACKEND_TABS.map((t) => {
                                    const TIcon = t.icon;
                                    const isActive = t.id === tab;
                                    return (
                                        <button key={t.id} onClick={() => setTab(t.id)}
                                            className="arch-lift flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-md"
                                            style={{ border: `1px solid ${isActive ? 'var(--arch-accent-line)' : 'var(--arch-line)'}`, background: isActive ? 'var(--arch-accent-wash)' : 'var(--arch-bg-inset)', color: isActive ? 'var(--arch-accent-bright)' : 'var(--arch-text-dim)' }}>
                                            <TIcon width={13} height={13} />{t.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {activeTab && (
                                <div className="mt-4">
                                    <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--arch-text-dim)' }}>{activeTab.body}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-3">{activeTab.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
                                </div>
                            )}
                        </>
                    )}

                    {node.facts && (
                        <ul className="mt-6 space-y-2.5">
                            {node.facts.map((f) => (
                                <li key={f} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'var(--arch-text)' }}>
                                    <span className="mt-[7px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--arch-accent)' }} />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {node.tags && (
                        <div className="flex flex-wrap gap-1.5 mt-6 pt-5" style={{ borderTop: '1px solid var(--arch-line)' }}>
                            {node.tags.map((t) => <Tag key={t} tone="accent">{t}</Tag>)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ArchitectureMap() {
    const [selected, setSelected] = useState(null);

    const linePaths = CONNECTIONS.map(([fromId, toId, label, labelT], i) => {
        const from = NODES[fromId];
        const to = NODES[toId];
        const fanOffset = fromId === 'backend' ? (i - 3) * 26 : 0;
        const x1 = from.x + fanOffset;
        const y1 = from.y + from.h + from.depth * 0.55;
        const x2 = to.x, y2 = to.y - to.h;
        const midY = (y1 + y2) / 2;
        const d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
        const p = curvePoint(x1, y1, x2, y2, midY, labelT ?? 0.5);
        return { key: `${fromId}-${toId}`, label, d, mx: p.x, my: p.y, fromId, toId };
    });

    const isDim = (id) => selected && selected !== id;

    return (
        <div className="arch-map-wrap">
            <div className="arch-map-canvas-outer">
                <svg viewBox="0 0 1240 1000" className="arch-map-canvas" role="img" aria-label="AgentX system map — click any box for detail">
                    <defs>
                        <marker id="mapArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                            <path d="M1,1 L6,4 L1,7" fill="none" stroke="var(--arch-line-strong)" strokeWidth="1.3" />
                        </marker>
                        <pattern id="mapGrid" width="34" height="34" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="var(--arch-line)" />
                        </pattern>
                    </defs>
                    <rect x="0" y="0" width="1240" height="1000" fill="url(#mapGrid)" opacity="0.6" />

                    <rect x={PLATFORM_GROUP.x1} y={PLATFORM_GROUP.y} width={PLATFORM_GROUP.x2 - PLATFORM_GROUP.x1} height="16" rx="8" fill="var(--arch-bg-inset)" stroke="var(--arch-line)" />
                    <text x={(PLATFORM_GROUP.x1 + PLATFORM_GROUP.x2) / 2} y={PLATFORM_GROUP.y - 15} textAnchor="middle" className="arch-mono" fontSize="10.5" fill="var(--arch-text-faint)">
                        {PLATFORM_GROUP.label}
                    </text>

                    {linePaths.map((c) => (
                        <g key={c.key} opacity={selected && selected !== c.fromId && selected !== c.toId ? 0.22 : 1} style={{ transition: 'opacity .25s' }}>
                            <path d={c.d} fill="none" stroke="var(--arch-line-strong)" strokeWidth="1.3" markerEnd="url(#mapArrow)" />
                            <rect x={c.mx - 40} y={c.my - 9} width="80" height="17" rx="8.5" fill="var(--arch-bg)" opacity="0.92" />
                            <text x={c.mx} y={c.my + 4} textAnchor="middle" className="arch-mono" fontSize="9.5" fill="var(--arch-text-dim)">{c.label}</text>
                        </g>
                    ))}

                    {Object.entries(NODES).map(([id, n]) => (
                        <IsoBox key={id} x={n.x} y={n.y} w={n.w} h={n.h} depth={n.depth}
                            active={selected === id} dim={isDim(id)} hub={n.hub}
                            onClick={() => setSelected(id)} label={n.title} />
                    ))}

                    {Object.entries(NODES).map(([id, n]) => {
                        const Icon = n.icon;
                        const labelY = n.y + n.depth + n.h + 26;
                        return (
                            <g key={`label-${id}`} opacity={isDim(id) ? 0.4 : 1} style={{ transition: 'opacity .25s', pointerEvents: 'none' }}>
                                <foreignObject x={n.x - 12} y={n.y - 12} width="24" height="24">
                                    <div style={{ color: selected === id || n.hub ? 'var(--arch-accent)' : 'var(--arch-text)' }}>
                                        <Icon width={20} height={20} />
                                    </div>
                                </foreignObject>
                                <text x={n.x} y={labelY} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--arch-text)">{n.title}</text>
                                <text x={n.x} y={labelY + 16} textAnchor="middle" className="arch-mono" fontSize="9.5" fill="var(--arch-text-faint)">{n.sub}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <DetailDialog node={selected ? NODES[selected] : null} onClose={() => setSelected(null)} />

            {!selected && (
                <div className="arch-map-hint">
                    <IconUser width={14} height={14} />
                    Click any box, a big detail view opens showing how it works inside and how it connects to everything else.
                </div>
            )}
        </div>
    );
}
