import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { parserService } from '../services/parser';

const MODES = [
    { id: 'auto', label: 'Auto', hint: 'digital pages free, scanned → region' },
    { id: 'digital', label: 'Digital', hint: 'embedded text only — no model, ~free' },
    { id: 'wholepage', label: 'Whole-page VLM', hint: '1 Gemini call per page' },
    { id: 'region', label: 'Region (hybrid)', hint: 'DocLayout-YOLO → crop → Gemini per region' },
];

function Stat({ label, value, sub }) {
    return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
            <div className="mt-0.5 text-lg font-semibold text-neutral-100">{value}</div>
            {sub && <div className="text-xs text-neutral-500">{sub}</div>}
        </div>
    );
}

function scoreColor(s) {
    if (s == null) return 'text-neutral-400 border-neutral-700';
    if (s >= 85) return 'text-emerald-300 border-emerald-700 bg-emerald-950/40';
    if (s >= 65) return 'text-amber-300 border-amber-700 bg-amber-950/40';
    return 'text-red-300 border-red-800 bg-red-950/40';
}

/** One page: original render on the left, extracted markdown on the right. */
function PageCard({ ev }) {
    const figs = ev.figures || [];
    const j = ev.judge;
    const components = {
        img: ({ src, alt }) => {
            // markdown now references figures by filename (page06_fig1.png)
            const key = (src || '').replace(/^attachment:/, '');
            const im = figs.find((f) => f.filename === key || f.id === key || f.id === key.replace(/\.png$/, ''));
            if (im) return <img src={`data:image/png;base64,${im.b64}`} alt={alt || im.filename || im.id}
                className="my-2 max-w-full rounded border border-neutral-700" />;
            return <em className="text-neutral-500">[fig {src}]</em>;
        },
    };
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
                <span className="font-medium text-neutral-200">Page {ev.page}</span>
                <span className="flex items-center gap-3 text-neutral-500">
                    {j && <span className={`rounded border px-2 py-0.5 font-semibold ${scoreColor(j.score)}`}>
                        judge {j.score != null ? `${j.score}/100` : '—'}
                    </span>}
                    <span className="rounded bg-neutral-800 px-2 py-0.5">{ev.mode}</span>
                    <span className="font-mono">{ev.seconds}s</span>
                    {figs.length > 0 && <span>{figs.length} fig</span>}
                </span>
            </div>
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                <div className="border-neutral-800 p-3 md:border-r">
                    {ev.page_image
                        ? <img src={`data:image/png;base64,${ev.page_image}`} alt={`page ${ev.page}`}
                            className="mx-auto max-h-[80vh] w-auto rounded border border-neutral-800" />
                        : <div className="py-10 text-center text-xs text-neutral-600">no preview</div>}
                </div>
                <div className="max-h-[80vh] overflow-auto p-4">
                    <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-neutral-950 prose-table:text-xs prose-img:my-2 prose-headings:mt-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                            {ev.markdown || '_(empty)_'}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>

            {/* Extracted figure crops — shown clearly so you can eyeball them */}
            {figs.length > 0 && (
                <div className="border-t border-neutral-800 p-3">
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-neutral-500">Extracted figures ({figs.length})</div>
                    <div className="flex flex-wrap gap-3">
                        {figs.map((f) => (
                            <div key={f.id} className="w-48 rounded-lg border border-neutral-800 bg-neutral-950 p-2">
                                <img src={`data:image/png;base64,${f.b64}`} alt={f.filename || f.id}
                                    className="mb-1 w-full rounded border border-neutral-800" />
                                <div className="font-mono text-[10px] text-neutral-500">{f.filename || f.id}</div>
                                <div className="text-[11px] text-neutral-300">{f.caption}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Judge critique */}
            {j && (j.verdict || (j.issues && j.issues.length > 0)) && (
                <div className="border-t border-neutral-800 p-3 text-xs">
                    <span className="text-neutral-500">Judge: </span>
                    <span className="text-neutral-300">{j.verdict}</span>
                    {j.issues?.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-neutral-400">
                            {j.issues.map((it, i) => <li key={i}>{it}</li>)}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ParserPage() {
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState('auto');
    const [maxPages, setMaxPages] = useState(0);
    const [useJudge, setUseJudge] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | running | done | error
    const [error, setError] = useState(null);
    const [pages, setPages] = useState([]);       // per-page events
    const [totalPages, setTotalPages] = useState(0);
    const [totals, setTotals] = useState(null);   // final 'done' event
    const [running, setRunning] = useState({ vlm_calls: 0, input_tokens: 0, output_tokens: 0 });
    const [health, setHealth] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        parserService.health().then(setHealth).catch(() => setHealth({ reachable: false }));
    }, []);

    const run = useCallback(async () => {
        if (!file) return;
        setStatus('running'); setError(null); setPages([]); setTotals(null);
        setTotalPages(0); setRunning({ vlm_calls: 0, input_tokens: 0, output_tokens: 0 });
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            await parserService.parseStream(file, mode, Number(maxPages) || 0, useJudge, (ev) => {
                if (ev.type === 'start') setTotalPages(ev.pages);
                else if (ev.type === 'page') {
                    setPages((p) => [...p, ev]);
                    if (ev.cost) setRunning(ev.cost);
                } else if (ev.type === 'done') { setTotals(ev); setStatus('done'); }
                else if (ev.type === 'error') { setError(ev.error); setStatus('error'); }
            }, ctrl.signal);
            setStatus((s) => (s === 'running' ? 'done' : s));
        } catch (e) {
            if (e.name !== 'AbortError') { setError(e.message || 'Parse failed'); setStatus('error'); }
        }
    }, [file, mode, maxPages, useJudge]);

    const stop = () => { abortRef.current?.abort(); setStatus('done'); };

    const cost = totals?.cost || running;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-white">PDF Parser <span className="text-neutral-500">— eval bench</span></h1>
                        <p className="text-sm text-neutral-500">Live per-page parse: original page ↔ extracted markdown, with cost &amp; time.</p>
                    </div>
                    <Link to="/chat" className="text-sm text-neutral-400 hover:text-white">← Back to chat</Link>
                </div>

                <div className="mb-5 flex items-center gap-2 text-xs">
                    <span className={`inline-block h-2 w-2 rounded-full ${health?.reachable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-neutral-500">
                        parser service {health?.reachable ? 'online' : 'offline'}
                        {health?.service?.vision_model && ` · ${health.service.vision_model}`}
                    </span>
                </div>

                {/* Controls */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:border-neutral-500">
                            {file ? file.name : 'Choose PDF…'}
                            <input type="file" accept="application/pdf" className="hidden"
                                onChange={(e) => { setFile(e.target.files?.[0] || null); setPages([]); setTotals(null); setStatus('idle'); }} />
                        </label>
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                            max pages
                            <input type="number" min="0" value={maxPages}
                                onChange={(e) => setMaxPages(e.target.value)}
                                className="w-16 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-200" title="0 = all" />
                        </div>
                        {status === 'running'
                            ? <button onClick={stop} className="ml-auto rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white">Stop</button>
                            : <button onClick={run} disabled={!file}
                                className="ml-auto rounded-lg bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-40">Parse</button>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {MODES.map((m) => (
                            <button key={m.id} onClick={() => setMode(m.id)} title={m.hint} disabled={status === 'running'}
                                className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50 ${mode === m.id
                                    ? 'border-white bg-white text-black' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-neutral-600">{MODES.find((m) => m.id === mode)?.hint}</p>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                            <input type="checkbox" checked={useJudge} disabled={status === 'running'}
                                onChange={(e) => setUseJudge(e.target.checked)} className="accent-emerald-500" />
                            LLM judge <span className="text-neutral-600">(Sonnet scores each page vs its image)</span>
                        </label>
                    </div>
                </div>

                {error && <div className="mt-5 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>}

                {/* Live status bar */}
                {(status === 'running' || status === 'done') && (
                    <div className="sticky top-0 z-10 mt-5 rounded-lg border border-neutral-800 bg-neutral-950/90 px-4 py-3 backdrop-blur">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            {status === 'running'
                                ? <span className="flex items-center gap-2 text-emerald-400">
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                                    Parsing page {pages.length + 1}{totalPages ? ` / ${totalPages}` : ''}…
                                </span>
                                : <span className="text-neutral-300">✓ Done — {pages.length} page{pages.length !== 1 ? 's' : ''}
                                    {totals?.timing && ` in ${totals.timing.total_s}s`}</span>}
                            <span className="ml-auto flex gap-4 font-mono text-xs text-neutral-400">
                                <span>{cost.vlm_calls || 0} VLM calls</span>
                                <span>{(cost.input_tokens || 0).toLocaleString()} in / {(cost.output_tokens || 0).toLocaleString()} out tok</span>
                                {totals?.cost?.est_usd != null && <span className="text-neutral-200">${totals.cost.est_usd}</span>}
                            </span>
                        </div>
                        {totalPages > 0 && (
                            <div className="mt-2 h-1 w-full overflow-hidden rounded bg-neutral-800">
                                <div className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${Math.min(100, (pages.length / totalPages) * 100)}%` }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Final stats */}
                {totals && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <Stat label="Pages" value={totals.pages} />
                        <Stat label="Total time" value={`${totals.timing?.total_s}s`} />
                        <Stat label="VLM calls" value={totals.cost?.vlm_calls ?? 0} />
                        <Stat label="Tokens" value={`${(totals.cost?.input_tokens ?? 0).toLocaleString()} / ${(totals.cost?.output_tokens ?? 0).toLocaleString()}`} sub="in / out" />
                        <Stat label="Parse cost" value={`$${totals.cost?.est_usd ?? 0}`} sub={totals.cost?.judge_est_usd ? `+ $${totals.cost.judge_est_usd} judge` : undefined} />
                        <div className={`rounded-lg border px-4 py-3 ${scoreColor(totals.judge_avg)}`}>
                            <div className="text-[11px] uppercase tracking-wide opacity-70">Judge score</div>
                            <div className="mt-0.5 text-lg font-semibold">{totals.judge_avg != null ? `${totals.judge_avg}/100` : '—'}</div>
                            <div className="text-xs opacity-70">avg over pages</div>
                        </div>
                    </div>
                )}

                {/* Per-page live cards */}
                <div className="mt-5 space-y-4">
                    {pages.map((ev) => <PageCard key={ev.page} ev={ev} />)}
                    {status === 'running' && (
                        <div className="rounded-xl border border-dashed border-neutral-800 py-8 text-center text-sm text-neutral-600">
                            working on page {pages.length + 1}{totalPages ? ` of ${totalPages}` : ''}…
                        </div>
                    )}
                </div>

                {status === 'idle' && !error && (
                    <div className="mt-12 text-center text-sm text-neutral-600">Choose a PDF and a mode, then Parse. Pages stream in as they finish.</div>
                )}
            </div>
        </div>
    );
}
