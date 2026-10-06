import { useState, useRef, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import { chatService } from '../../services/chat';
import { API_BASE_URL } from '../../config';
import { MermaidDiagram } from './MermaidDiagram';

// Tool identity by name — checks BOTH the current sandbox_-prefixed names and
// the pre-rename ones (Tier 2.5), since old messages already stored in the
// database use the old names forever and still need to render correctly.
const EXEC_TOOL_NAMES = new Set(['run_python', 'run_shell', 'sandbox_run_python', 'sandbox_run_shell']);
const EDIT_FILE_TOOL_NAMES = new Set(['edit_file', 'sandbox_edit_file']);
const READ_FILE_TOOL_NAMES = new Set(['read_file_natively', 'sandbox_read_file_natively', 'read_document_page']);

// Why a turn stopped mid-response — surfaced honestly instead of the old
// blanket "connection lost or stopped" text, which was actively misleading
// for the two server-side cutoffs (neither is a connection problem: it's a
// cost governor doing exactly what it's designed to do). Messages persisted
// before this field existed have no stop_reason, so 'user_stop' doubles as
// the fallback for those too.
const STOP_REASON_TEXT = {
    user_stop: 'Response was stopped before it finished.',
    turn_cost_ceiling: "This response was stopped because it reached this turn's cost limit. Try breaking the request into smaller steps.",
    credit_limit_reached: 'This response was stopped because your free-tier credit limit was reached.',
};

// Extension -> glyph colour. Purely cosmetic; unknown types fall back to slate.
const EXT_COLORS = {
    pptx: 'linear-gradient(150deg,#e2703a,#c2410c)',
    ppt: 'linear-gradient(150deg,#e2703a,#c2410c)',
    xlsx: 'linear-gradient(150deg,#22a565,#15803d)',
    xls: 'linear-gradient(150deg,#22a565,#15803d)',
    csv: 'linear-gradient(150deg,#22a565,#15803d)',
    docx: 'linear-gradient(150deg,#4b82e8,#1d4ed8)',
    doc: 'linear-gradient(150deg,#4b82e8,#1d4ed8)',
    pdf: 'linear-gradient(150deg,#e8544b,#b91c1c)',
    png: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    jpg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    jpeg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    gif: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    webp: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
};

const glyphFor = (ext) => EXT_COLORS[(ext || '').toLowerCase()] || 'linear-gradient(150deg,#64748b,#334155)';

const FileCreatedStep = ({ file, onClick }) => {
    const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase();
    return (
        <div
            className="group w-full rounded-[14px] border flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer transition-all duration-150 hover:-translate-y-px"
            style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-color)',
                boxShadow: 'var(--shadow-1)'
            }}
            onClick={(e) => {
                e.preventDefault();
                onClick({ type: 'file_preview', title: file.name, url: file.download_url, ext: file.ext });
            }}
            title="Click to preview"
        >
            <div
                className="w-9 h-9 rounded-[10px] flex-none grid place-items-center text-[8.5px] font-bold tracking-wide text-white"
                style={{ background: glyphFor(ext) }}
            >
                {ext ? ext.toUpperCase().slice(0, 4) : 'FILE'}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[13.5px] font-medium truncate transition-colors group-hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-primary)' }}>
                    {file.name}
                </span>
                <span className="text-[11.5px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {(file.size_bytes / 1024).toFixed(1)} KB · generated in sandbox
                </span>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    const a = document.createElement('a');
                    const fullUrl = file.download_url.startsWith('http')
                        ? file.download_url
                        : `${API_BASE_URL}${file.download_url.startsWith('/') ? '' : '/'}${file.download_url}`;
                    a.href = fullUrl;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }}
                className="flex-none flex items-center gap-1.5 text-[12.5px] font-medium px-2.5 py-1.5 rounded-[9px] border transition-colors hover:bg-[var(--hover-bg)]"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
                title="Download file"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <span className="hidden sm:inline">Download</span>
            </button>
        </div>
    );
};

// Cap how many lines actually get mounted as DOM nodes. Without this, a
// script that dumps thousands of lines (e.g. accidentally walking into
// .venv/site-packages) makes React re-render an ever-growing list on EVERY
// single streamed line — an O(n^2) cost as the array grows — which froze the
// whole tab, not just this panel (confirmed live: a run_python step walking
// third-party dependency internals locked up the entire page, not just
// scrolling within the terminal).
const _TERMINAL_MAX_LINES = 300;

const LiveTerminal = ({ outputs }) => {
    const terminalRef = useRef(null);
    // Only auto-scroll to bottom if the user was ALREADY at/near the bottom
    // before this update — otherwise a rapid flood of new lines fights any
    // manual scroll attempt by snapping back down after every single line.
    const wasNearBottomRef = useRef(true);

    const handleScroll = () => {
        const el = terminalRef.current;
        if (!el) return;
        wasNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };

    useEffect(() => {
        if (terminalRef.current && wasNearBottomRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [outputs]);

    if (!outputs || outputs.length === 0) return null;

    const truncatedCount = Math.max(0, outputs.length - _TERMINAL_MAX_LINES);
    const visible = truncatedCount > 0 ? outputs.slice(-_TERMINAL_MAX_LINES) : outputs;

    return (
        <div
            className="mx-3 mb-3 rounded-[11px] overflow-hidden flex flex-col font-mono text-[11.5px] leading-relaxed"
            style={{ backgroundColor: 'var(--term-bg)', color: 'var(--term-fg)', border: '1px solid rgba(255,255,255,.06)' }}
        >
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4ade80' }} />
                <span className="font-sans text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--term-dim)' }}>
                    stdout
                </span>
                {outputs.length > _TERMINAL_MAX_LINES && (
                    <span className="ml-auto font-sans text-[10px]" style={{ color: 'var(--term-dim)' }}>
                        {outputs.length.toLocaleString()} lines
                    </span>
                )}
            </div>
            <div ref={terminalRef} onScroll={handleScroll} className="p-3 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {truncatedCount > 0 && (
                    <div className="italic pb-1 mb-1" style={{ color: 'var(--term-dim)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                        …{truncatedCount.toLocaleString()} earlier lines hidden (showing the most recent {_TERMINAL_MAX_LINES})
                    </div>
                )}
                {visible.map((out, idx) => (
                    <div key={idx} style={{ color: out.stream === 'stderr' ? '#f87171' : 'inherit' }}>
                        {out.line}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Compact single-line diff pill for edit_file calls — a targeted text
// replacement, not a full file rewrite, so we show +added/-removed line
// counts instead of dumping the whole file's content.
const EditFileStep = ({ step }) => {
    const diff = step.diff;
    const filename = diff?.path?.split('/').pop() || diff?.path || (step.args?.path);
    return (
        <div
            className="rounded-[11px] border flex items-center gap-2.5 px-3 py-2"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-1)' }}
        >
            <svg className="w-4 h-4 flex-none" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-[13.5px] truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                {step.status === 'running' ? 'Editing file…' : step.status === 'interrupted' ? 'Edit interrupted' : (filename ? `Edited ${filename}` : 'Edited file')}
            </span>
            {filename && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded flex-none"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                    {filename}
                </span>
            )}
            {diff && (
                <span className="text-[11px] font-mono flex-none">
                    <span style={{ color: '#3fb950' }}>+{diff.added}</span>{' '}
                    <span style={{ color: '#f85149' }}>-{diff.removed}</span>
                </span>
            )}
        </div>
    );
};

const ToolStep = ({ step }) => {
    // Hooks first, unconditionally — the edit_file early-return below must
    // come after every hook call, not before, or their call order shifts
    // between renders depending on step.name.
    const { isDark } = useTheme();
    const isRunning = step.status === 'running';
    const [manualExpanded, setManualExpanded] = useState(null); // null = follow auto

    // Reset manual state when a new run starts
    useEffect(() => {
        if (isRunning) setManualExpanded(null);
    }, [isRunning]);

    if (EDIT_FILE_TOOL_NAMES.has(step.name)) {
        return <EditFileStep step={step} />;
    }

    const isCompleted = step.status === 'completed';
    const isInterrupted = step.status === 'interrupted';
    const isExecTool = EXEC_TOOL_NAMES.has(step.name);
    const expanded = manualExpanded !== null ? manualExpanded : isRunning;
    const toggleExpand = () => setManualExpanded(prev => !(prev !== null ? prev : isRunning));

    // Format args for display — for code tools, extract just the code field nicely
    const formatArgs = (args) => {
        if (!args) return null;
        if (typeof args === 'string') return args;
        if (isExecTool && args.code) return args.code;
        return JSON.stringify(args, null, 2);
    };

    const formattedArgs = formatArgs(step.args);
    const execLang = step.name.endsWith('run_shell') ? 'bash' : 'python';

    return (
        <div
            className="rounded-[11px] border overflow-hidden transition-all duration-150"
            style={{
                backgroundColor: 'var(--surface)',
                borderColor: isRunning ? 'var(--violet-line)' : 'var(--border-color)',
                boxShadow: 'var(--shadow-1)'
            }}
        >
            <button
                onClick={toggleExpand}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--hover-bg)]"
            >
                {/* Status icon */}
                {isCompleted ? (
                    <svg className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                ) : isInterrupted ? (
                    <svg className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5 flex-none animate-spin" style={{ color: 'var(--violet)' }} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                )}

                {/* Tool name — monospace, because it's a machine identifier */}
                <span className="text-[12.5px] font-mono font-medium flex-1 truncate tracking-tight"
                    style={{ color: 'var(--text-primary)' }}>
                    {step.name}
                </span>

                {isRunning && (
                    <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full flex-none"
                        style={{ backgroundColor: 'var(--violet-soft)', color: 'var(--violet)' }}>
                        RUNNING
                    </span>
                )}
                {isInterrupted && (
                    <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full flex-none"
                        style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
                        INTERRUPTED
                    </span>
                )}

                <svg
                    className={`w-3.5 h-3.5 flex-none transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    <path d="M9 6l6 6-6 6" />
                </svg>
            </button>

            {/* Details — smoothly grows/shrinks instead of snapping open/closed.
                Always mounted so the height transition has something to animate;
                grid-rows[0fr->1fr] avoids needing a fixed max-height guess. */}
            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                        {/* Input */}
                        {formattedArgs && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] px-3 pt-2.5 pb-1.5"
                                    style={{ color: 'var(--text-tertiary)' }}>
                                    {isExecTool ? 'Code' : 'Input'}
                                </p>
                                {isExecTool ? (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <SyntaxHighlighter
                                            style={isDark ? oneDark : oneLight}
                                            language={execLang}
                                            PreTag="div"
                                            customStyle={{ margin: 0, padding: '0 12px 10px', background: 'transparent', fontSize: '12px' }}
                                        >
                                            {formattedArgs}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <pre
                                        className="text-[12px] px-3 pb-2.5 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed"
                                        style={{ color: 'var(--text-secondary)', maxHeight: '200px', overflowY: 'auto' }}
                                    >
                                        {formattedArgs}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Live Terminal — shown while running AND after complete */}
                        {isExecTool && step.exec_output && step.exec_output.length > 0 && (
                            <LiveTerminal outputs={step.exec_output} />
                        )}

                        {/* Result — shown after completion */}
                        {step.result && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] px-3 pt-2.5 pb-1.5"
                                    style={{ color: 'var(--text-tertiary)' }}>
                                    Result
                                </p>
                                <pre
                                    className="text-[12px] px-3 pb-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed"
                                    style={{ color: 'var(--accent)', maxHeight: '150px', overflowY: 'auto' }}
                                >
                                    {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Icon shown in the timeline's connector-line node for each step type.
const TimelineIcon = ({ type, done }) => {
    const common = 'w-3.5 h-3.5';
    if (type === 'tool' && !done) {
        return (
            <svg className={`${common} animate-spin`} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
        );
    }
    const path = {
        tool: 'M20 6L9 17l-5-5',
        skill: 'M12 2l2.6 6.3L21 9.3l-4.7 4.3 1.2 6.4L12 17l-5.5 3 1.2-6.4L3 9.3l6.4-1z',
        artifact: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        files_created: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
        text: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    }[type] || 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';

    return (
        <svg className={common} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d={path} />
        </svg>
    );
};

// Two accents carry meaning consistently: violet = the agent's own machinery
// (a tool actively running, a skill being loaded), jade = a finished result.
function nodeTone(type, done) {
    if (type === 'tool' && !done) return { bg: 'var(--violet-soft)', bd: 'var(--violet-line)', fg: 'var(--violet)' };
    if (type === 'skill') return { bg: 'var(--violet-soft)', bd: 'var(--violet-line)', fg: 'var(--violet)' };
    if (type === 'tool' || type === 'artifact' || type === 'files_created') {
        return { bg: 'var(--accent-soft)', bd: 'var(--accent-line)', fg: 'var(--accent)' };
    }
    return { bg: 'var(--surface-2)', bd: 'var(--border-color)', fg: 'var(--text-tertiary)' };
}

// One node in the vertical connector-line timeline: an icon chip on the rail,
// with the step's content to its right. `last` skips the line segment below
// the final entry.
const TimelineNode = ({ type, done, last, children }) => {
    const tone = nodeTone(type, done);
    return (
        <div className="relative flex gap-3 timeline-node-in">
            {!last && (
                <div className="absolute left-[11.5px] top-7 bottom-0 w-px"
                    style={{ backgroundColor: 'var(--border-color)' }} />
            )}
            <div
                className="relative z-10 w-6 h-6 rounded-[8px] flex items-center justify-center flex-none transition-colors duration-300"
                style={{ backgroundColor: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}
            >
                <TimelineIcon type={type} done={done} />
            </div>
            <div className="flex-1 min-w-0 pb-4">{children}</div>
        </div>
    );
};

// Shared markdown renderer used for both narration segments and the final answer.
const MarkdownContent = ({ content, isDark, onOpenArtifact }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
            code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match?.[1] || '';
                const codeString = String(children).replace(/\n$/, '');

                if (!inline && lang === 'mermaid') {
                    return <MermaidDiagram chart={codeString} isDark={isDark} />;
                }

                if (!inline && match) {
                    return (
                        <details className="mb-4 rounded-[11px] overflow-hidden border group" style={{ borderColor: 'var(--border-color)' }}>
                            <summary
                                className="px-3.5 py-2 cursor-pointer font-medium text-[13px] transition-colors flex items-center justify-between select-none hover:bg-[var(--hover-bg)]"
                                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="font-mono text-[12px]">{lang}</span>
                                </div>
                            </summary>
                            <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                                <SyntaxHighlighter
                                    style={isDark ? oneDark : oneLight}
                                    language={lang}
                                    PreTag="div"
                                    customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8125rem' }}
                                    {...props}
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        </details>
                    );
                }
                return (
                    <code
                        className="px-1.5 py-0.5 rounded text-[0.9em] font-mono"
                        style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)' }}
                        {...props}
                    >
                        {children}
                    </code>
                );
            },
            a: ({ node, ...props }) => {
                const href = props.href || '';
                const isSandboxFile = href.includes('/api/outputs/my/') ||
                    (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#') && href.includes('.'));

                if (isSandboxFile) {
                    let filename = href.includes('/api/outputs/my/')
                        ? href
                        : href.replace(/^\/?outputs\//, '').replace(/^\/+/, '');
                    const url = href.includes('/api/outputs/my/') ? href : `/api/outputs/my/${filename}`;

                    return (
                        <a
                            {...props}
                            href={url}
                            onClick={(e) => {
                                e.preventDefault();
                                const label = Array.isArray(props.children) ? props.children[0] : props.children || 'File';
                                const ext = url.split('.').pop() || '';
                                onOpenArtifact({ type: 'file_preview', title: label, url: url, ext: ext.toLowerCase() });
                            }}
                            style={{ color: 'var(--accent)' }}
                            className="underline underline-offset-2 decoration-[var(--accent-line)] hover:decoration-[var(--accent)]"
                        >
                            {props.children}
                        </a>
                    );
                }
                return (
                    <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}
                        className="underline underline-offset-2 decoration-[var(--accent-line)] hover:decoration-[var(--accent)]">
                        {props.children}
                    </a>
                );
            },
            p({ children }) { return <p className="mb-3 last:mb-0 leading-[1.72]">{children}</p>; },
            ul({ children }) { return <ul className="list-disc pl-6 mb-3 space-y-1 marker:text-[var(--text-tertiary)]">{children}</ul>; },
            ol({ children }) { return <ol className="list-decimal pl-6 mb-3 space-y-1 marker:text-[var(--text-tertiary)]">{children}</ol>; },
        }}
    >
        {content}
    </ReactMarkdown>
);

// Renders message.timeline: a chronologically-ordered, connected sequence of
// narration text / tool calls / skills / artifacts / created files — mirrors
// how Claude's own agent transcript interleaves "thinking" with actions,
// instead of grouping everything by type into separate stacked sections.
// Minimum consecutive non-text steps before we collapse them into a single
// "Ran N commands, edited M files..." summary line (matching Claude's own
// transcript: a couple of steps stay visible inline, a whole cluster collapses).
const PHASE_COLLAPSE_THRESHOLD = 3;

function summarizePhase(entries) {
    let commands = 0, edited = 0, created = 0, read = 0;
    for (const e of entries) {
        if (e.type === 'tool' && EXEC_TOOL_NAMES.has(e.name)) commands++;
        else if (e.type === 'tool' && EDIT_FILE_TOOL_NAMES.has(e.name)) edited++;
        else if (e.type === 'tool' && READ_FILE_TOOL_NAMES.has(e.name)) read++;
        else if (e.type === 'files_created') created += (e.files?.length || 0);
        else if (e.type === 'artifact') created++;
    }
    const parts = [];
    if (commands) parts.push(`Ran ${commands} command${commands > 1 ? 's' : ''}`);
    if (edited) parts.push(`edited ${edited} file${edited > 1 ? 's' : ''}`);
    if (created) parts.push(created === 1 ? 'created a file' : `created ${created} files`);
    if (read) parts.push(read === 1 ? 'read a file' : `read ${read} files`);
    return parts.join(', ') || `${entries.length} steps`;
}

// Renders the actual body for one non-text timeline entry (shared between
// standalone rendering and rendering inside a collapsed phase group).
function renderTimelineEntryBody(entry, onOpenArtifact) {
    if (entry.type === 'tool') return <ToolStep step={entry} />;
    if (entry.type === 'skill') return <SkillStep skill={entry} onClick={onOpenArtifact} />;
    if (entry.type === 'artifact') return <ArtifactStep artifact={entry} onClick={onOpenArtifact} />;
    if (entry.type === 'files_created') {
        return (
            <div className="space-y-2">
                {entry.files.map((file, i) => <FileCreatedStep key={i} file={file} onClick={onOpenArtifact} />)}
            </div>
        );
    }
    return null;
}

// A collapsed cluster of tool/skill/artifact steps — auto-expanded while any
// step inside is still running, manually toggleable once the phase is done.
const PhaseGroup = ({ entries, onOpenArtifact }) => {
    const hasRunning = entries.some(e => e.status === 'running');
    const [manualExpanded, setManualExpanded] = useState(null);
    const expanded = manualExpanded !== null ? manualExpanded : hasRunning;

    useEffect(() => { if (hasRunning) setManualExpanded(null); }, [hasRunning]);

    return (
        <div>
            <button
                onClick={() => setManualExpanded(prev => !(prev !== null ? prev : hasRunning))}
                className="flex items-center gap-1.5 text-[13.5px] transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
            >
                <svg className={`w-3.5 h-3.5 flex-none transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" />
                </svg>
                {hasRunning ? (
                    <span className="ax-shimmer">{summarizePhase(entries)}</span>
                ) : (
                    summarizePhase(entries)
                )}
            </button>

            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="mt-2 ml-1">
                        {entries.map((entry, i) => (
                            <TimelineNode
                                key={i}
                                type={entry.type}
                                done={entry.status === 'completed' || entry.status === 'interrupted'}
                                last={i === entries.length - 1}
                            >
                                {renderTimelineEntryBody(entry, onOpenArtifact)}
                            </TimelineNode>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Groups a flat timeline into: standalone text nodes, standalone single steps
// (small clusters, kept inline), and phase groups (large clusters, collapsed).
function groupTimeline(timeline) {
    const groups = [];
    let run = [];
    const flushRun = () => {
        if (run.length === 0) return;
        if (run.length >= PHASE_COLLAPSE_THRESHOLD) {
            groups.push({ kind: 'phase', entries: run });
        } else {
            for (const e of run) groups.push({ kind: 'entry', entry: e });
        }
        run = [];
    };
    for (const entry of timeline) {
        if (entry.type === 'text') {
            flushRun();
            groups.push({ kind: 'text', entry });
        } else {
            run.push(entry);
        }
    }
    flushRun();
    return groups;
}

const AgentTimeline = ({ timeline, isDark, onOpenArtifact }) => {
    if (!timeline || timeline.length === 0) return null;
    const groups = groupTimeline(timeline);

    return (
        <div className="mb-3">
            {groups.map((group, idx) => {
                const last = idx === groups.length - 1;

                if (group.kind === 'text') {
                    if (!group.entry.content?.trim()) return null;
                    return (
                        <TimelineNode key={idx} type="text" last={last}>
                            <div className="prose prose-sm max-w-none pt-0.5 dark:prose-invert text-[14.8px]" style={{ color: 'var(--text-primary)' }}>
                                <MarkdownContent content={group.entry.content} isDark={isDark} onOpenArtifact={onOpenArtifact} />
                            </div>
                        </TimelineNode>
                    );
                }
                if (group.kind === 'phase') {
                    const anyRunning = group.entries.some(e => e.status === 'running');
                    return (
                        <TimelineNode key={idx} type="tool" done={!anyRunning} last={last}>
                            <PhaseGroup entries={group.entries} onOpenArtifact={onOpenArtifact} />
                        </TimelineNode>
                    );
                }
                // kind === 'entry'
                const entry = group.entry;
                return (
                    <TimelineNode key={idx} type={entry.type} done={entry.status === 'completed' || entry.status === 'interrupted'} last={last}>
                        {renderTimelineEntryBody(entry, onOpenArtifact)}
                    </TimelineNode>
                );
            })}
        </div>
    );
};

const SkillStep = ({ skill, onClick }) => {
    return (
        <button
            onClick={() => onClick({ type: 'skill', title: skill.name, data: skill.content })}
            className="w-full rounded-[11px] border flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--hover-bg)]"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-1)' }}
        >
            <span className="w-6 h-6 rounded-[8px] grid place-items-center flex-none border"
                style={{ backgroundColor: 'var(--violet-soft)', borderColor: 'var(--violet-line)', color: 'var(--violet)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 2l2.6 6.3L21 9.3l-4.7 4.3 1.2 6.4L12 17l-5.5 3 1.2-6.4L3 9.3l6.4-1z" />
                </svg>
            </span>
            <span className="text-[13.5px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Loaded skill</span>{' '}
                <span className="font-mono text-[12.5px]">{skill.name}</span>
            </span>
            <svg className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
};

const ArtifactStep = ({ artifact, onClick }) => {
    return (
        <button
            onClick={() => onClick({ type: 'artifact', title: artifact.name, data: artifact.content })}
            className="w-full rounded-[11px] border flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--hover-bg)]"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-1)' }}
        >
            <span className="w-6 h-6 rounded-[8px] grid place-items-center flex-none border"
                style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </span>
            <span className="text-[13.5px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Generated</span> {artifact.name}
            </span>
            <svg className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
};

// Attachment chips shown on a message (user uploads).
const AttachmentChips = ({ attachments, onOpenArtifact }) => (
    <div className="mb-2 flex flex-wrap gap-1.5 justify-end">
        {attachments.map((attachment, index) => {
            const name = attachment.original_name || attachment.name || 'File';
            const ext = name.split('.').pop()?.toLowerCase() || '';
            const isImage = attachment.mime_type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

            return (
                <button
                    key={index}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-[9px] border transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-2)' }}
                    onClick={() => {
                        if (attachment.cloudinary_url || attachment.sandbox_path) {
                            const url = attachment.cloudinary_url || `/api/outputs/my/${name}`;
                            onOpenArtifact({ type: 'file_preview', title: name, url: url, ext: ext });
                        }
                    }}
                    title="Preview file"
                >
                    <span className="w-5 h-5 rounded-[6px] grid place-items-center flex-none text-white text-[7px] font-bold"
                        style={{ background: glyphFor(ext) }}>
                        {isImage ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M3 7a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3z" />
                            </svg>
                        ) : (ext ? ext.toUpperCase().slice(0, 3) : 'F')}
                    </span>
                    <span className="text-[11.5px] font-medium max-w-[150px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {name}
                    </span>
                </button>
            );
        })}
    </div>
);


// Plain text of an assistant message, for copy + read-aloud. Mirrors the
// render-time fallback below: messages with a timeline keep their final answer
// as the last 'text' node, older ones only have .content.
function getMessageText(message) {
    if (message.content && message.content.trim()) return message.content;
    const texts = (message.timeline || []).filter(e => e.type === 'text' && e.content);
    return texts.length ? texts[texts.length - 1].content : '';
}

const ActionButton = ({ onClick, title, active, children }) => (
    <button
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-1.5 rounded-[7px] transition-colors hover:bg-[var(--hover-bg)]"
        style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
    >
        {children}
    </button>
);

const ICONS = {
    copy: ['M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.24a2 2 0 00-.6-1.43l-3.32-3.24A2 2 0 0014.69 2H10a2 2 0 00-2 2z', 'M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2'],
    check: ['M20 6L9 17l-5-5'],
    speak: ['M11 5L6 9H2v6h4l5 4V5z', 'M15.54 8.46a5 5 0 010 7.07', 'M19.07 4.93a10 10 0 010 14.14'],
    stopSpeak: ['M11 5L6 9H2v6h4l5 4V5z', 'M22 9l-6 6', 'M16 9l6 6'],
    up: ['M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3z', 'M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3'],
    down: ['M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3z', 'M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17'],
    retry: ['M23 4v6h-6', 'M20.49 15a9 9 0 11-2.12-9.36L23 10'],
};

const Ico = ({ name }) => (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        {ICONS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
);

// Copy / read-aloud / rate / retry. Only rendered once a message is fully
// persisted (it needs a real _id to rate or retry). Retry is deliberately
// last-message-only — see ChatService.retry for why the backend enforces the
// same restriction rather than trusting the UI to hide the button.
const MessageActionBar = ({ message, conversationId, isLast, onRetry }) => {
    const [copied, setCopied] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [rating, setRating] = useState(message.rating ?? null);
    const [showReason, setShowReason] = useState(false);
    const [reason, setReason] = useState('');

    // speechSynthesis is a global singleton — an utterance left running after
    // this message unmounts would keep talking over whatever comes next.
    useEffect(() => () => {
        try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { }
    }, []);

    const text = getMessageText(message);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) { console.error('Copy failed:', e); }
    };

    const handleSpeak = () => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        if (speaking) { synth.cancel(); setSpeaking(false); return; }
        synth.cancel();                    // never stack utterances
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        setSpeaking(true);
        synth.speak(u);
    };

    const send = async (next, why) => {
        const prev = rating;
        setRating(next);                   // optimistic
        try {
            await chatService.submitFeedback(conversationId, message._id, next, why || null);
        } catch (e) {
            setRating(prev);               // roll back if the write failed
            console.error('Feedback failed:', e);
        }
    };

    const handleUp = () => send(rating === 'up' ? null : 'up', null);

    const handleDown = () => {
        if (rating === 'down') { setShowReason(false); send(null, null); return; }
        setShowReason(true);
    };

    const submitReason = (withReason) => {
        setShowReason(false);
        send('down', withReason ? (reason.trim() || null) : null);
        setReason('');
    };

    return (
        <div className="mt-1.5">
            <div className="flex items-center gap-0.5 -ml-1.5">
                <ActionButton onClick={handleCopy} title={copied ? 'Copied' : 'Copy'} active={copied}>
                    <Ico name={copied ? 'check' : 'copy'} />
                </ActionButton>
                <ActionButton onClick={handleSpeak} title={speaking ? 'Stop' : 'Read aloud'} active={speaking}>
                    <Ico name={speaking ? 'stopSpeak' : 'speak'} />
                </ActionButton>
                <ActionButton onClick={handleUp} title="Good response" active={rating === 'up'}>
                    <Ico name="up" />
                </ActionButton>
                <ActionButton onClick={handleDown} title="Bad response" active={rating === 'down'}>
                    <Ico name="down" />
                </ActionButton>
                {isLast && onRetry && (
                    <ActionButton onClick={() => onRetry(message)} title="Try again">
                        <Ico name="retry" />
                    </ActionButton>
                )}
            </div>

            {showReason && (
                <div className="mt-2 p-2.5 rounded-[10px] border"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)' }}>
                    <textarea
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Optional: what went wrong?"
                        rows={2}
                        className="w-full text-[13px] bg-transparent outline-none resize-none"
                        style={{ color: 'var(--text-primary)' }}
                    />
                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                        <button
                            onClick={() => submitReason(false)}
                            className="text-[12px] px-2 py-1 rounded-[7px] hover:bg-[var(--hover-bg)]"
                            style={{ color: 'var(--text-tertiary)' }}
                        >Skip</button>
                        <button
                            onClick={() => submitReason(true)}
                            className="text-[12px] px-2.5 py-1 rounded-[7px] font-medium"
                            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >Submit</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Memoized: without this, EVERY message in the conversation re-renders on
// EVERY stream event (each new token/tool-call/exec_output line creates a
// new top-level `messages` array reference in ChatPage, and ChatWindow maps
// over the whole array). For a long conversation this means the entire
// history re-renders on every single streamed token, not just the message
// actively updating. React.memo's default shallow prop comparison correctly
// skips re-rendering any message whose own object reference hasn't changed
// (only the actively-streaming message gets a new one each event).
const MessageComponent = ({ message, onOpenArtifact, conversationId, isLast, onRetry }) => {
    const { isDark } = useTheme();
    const isUser = message.role === 'user';

    // A message saved via the client-disconnect partial-save path (browser
    // tab closed / navigated away / network dropped mid-turn) has
    // message.stopped === true and may contain a timeline entry that never
    // got a completion event — it will show status:'running' FOREVER since
    // no more events are ever coming for it. Render those as 'interrupted'
    // instead of leaving an infinite spinner with no explanation (previously
    // confirmed live: conversation 6a719b5fa11cf10ed1232e28, an analyze_image
    // step spun forever with nothing telling the user the turn was cut off).
    const displayTimeline = message.stopped && message.timeline
        ? message.timeline.map(e => e.status === 'running' ? { ...e, status: 'interrupted' } : e)
        : message.timeline;

    // ---------- user turn: right-aligned bubble, no avatar ----------
    if (isUser) {
        return (
            <div className="py-3">
                <div className="flex justify-end">
                    <div className="max-w-[80%] min-w-0">
                        {message.attachments && message.attachments.length > 0 && (
                            <AttachmentChips attachments={message.attachments} onOpenArtifact={onOpenArtifact} />
                        )}
                        <div
                            className="rounded-[18px] rounded-br-[6px] border px-4 py-2.5 text-[14.5px] leading-[1.6]"
                            style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)',
                                boxShadow: 'var(--shadow-1)'
                            }}
                        >
                            <div className="prose prose-sm max-w-none dark:prose-invert" style={{ color: 'var(--text-primary)' }}>
                                <MarkdownContent content={message.content} isDark={isDark} onOpenArtifact={onOpenArtifact} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- assistant turn ----------
    return (
        <div className="py-3">
            {/* Identity row */}
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-[22px] h-[22px] rounded-[7px] grid place-items-center flex-none border"
                    style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M4 17l6-6-6-6M12 19h8" />
                    </svg>
                </div>
                <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>AgentX</span>
                {message.streaming && (
                    <span className="text-[11px] ax-shimmer">working…</span>
                )}
            </div>

            <div className="pl-[32px] min-w-0">
                {/* Hallucination Warning */}
                {message.hallucination_warning && (
                    <div className="mb-3 px-3.5 py-2.5 rounded-[11px] text-[13px] flex items-start gap-2.5 border"
                        style={{ backgroundColor: 'rgba(180,116,12,.08)', borderColor: 'rgba(180,116,12,.28)', color: 'var(--text-primary)' }}>
                        <svg className="w-4 h-4 flex-none mt-0.5" style={{ color: 'var(--amber, #b4740c)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <strong className="font-semibold">Possible hallucination detected</strong>
                            <p className="opacity-80 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                The system could not fully verify this answer against your retrieved context. Please double-check the sources.
                            </p>
                        </div>
                    </div>
                )}

                {/* Agent timeline: narration interleaved chronologically with tool
                    calls/skills/artifacts, connected by a vertical line — matches
                    how the events actually happened, not grouped by type. */}
                {displayTimeline && displayTimeline.length > 0 ? (
                    <>
                        <AgentTimeline timeline={displayTimeline} isDark={isDark} onOpenArtifact={onOpenArtifact} />
                        {message.stopped && (
                            <div className="mt-1 mb-2 px-3 py-2 rounded-[10px] text-[12px] flex items-center gap-2 border"
                                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                                <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {STOP_REASON_TEXT[message.stop_reason] || STOP_REASON_TEXT.user_stop}
                            </div>
                        )}
                    </>
                ) : (
                    // Legacy fallback for messages saved before the timeline field
                    // existed: grouped-by-type sections, same as before.
                    <>
                        {message.toolSteps && message.toolSteps.length > 0 && (
                            <div className="mb-3 space-y-2">
                                {message.toolSteps.map((step, index) => (
                                    <ToolStep key={index} step={step} />
                                ))}
                            </div>
                        )}
                        {message.skills && message.skills.length > 0 && (
                            <div className="mb-3 space-y-2">
                                {message.skills.map((skill, index) => (
                                    <SkillStep key={index} skill={skill} onClick={onOpenArtifact} />
                                ))}
                            </div>
                        )}
                        {message.artifacts && message.artifacts.length > 0 && (
                            <div className="mb-3 space-y-2">
                                {message.artifacts.map((artifact, index) => (
                                    <ArtifactStep key={index} artifact={artifact} onClick={onOpenArtifact} />
                                ))}
                            </div>
                        )}
                        {message.files_created && message.files_created.length > 0 && (
                            <div className="mb-3 space-y-2">
                                {message.files_created.map((file, index) => (
                                    <FileCreatedStep key={index} file={file} onClick={onOpenArtifact} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Attachments on a non-user message (rare, but keep supported) */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="[&>div]:justify-start">
                        <AttachmentChips attachments={message.attachments} onOpenArtifact={onOpenArtifact} />
                    </div>
                )}

                {/* Message Content — for assistant messages with a timeline, the final
                    answer is already the last 'text' node in AgentTimeline above, so
                    this only renders for: legacy messages without a timeline, and the
                    "Working..." placeholder before any event arrives. */}
                {!(message.timeline && message.timeline.length > 0) && (
                    <div className="prose prose-sm max-w-none dark:prose-invert text-[14.8px]" style={{ color: 'var(--text-primary)' }}>
                        {message.content ? (
                            <MarkdownContent content={message.content} isDark={isDark} onOpenArtifact={onOpenArtifact} />
                        ) : (
                            !message.streaming ? null : (
                                <span className="text-[13.5px] ax-shimmer">Thinking…</span>
                            )
                        )}
                    </div>
                )}

                {/* Rating and retry both need a real persisted _id, so the bar
                    only appears once the turn has finished and been saved. */}
                {!message.streaming && message._id && conversationId && (
                    <MessageActionBar
                        message={message}
                        conversationId={conversationId}
                        isLast={isLast}
                        onRetry={onRetry}
                    />
                )}
            </div>
        </div>
    );
};

export const Message = memo(MessageComponent);
