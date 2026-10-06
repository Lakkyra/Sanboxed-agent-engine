import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config';
import { MermaidDiagram } from './MermaidDiagram';

// File type categories
const IMAGE_EXTS  = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']);
const PDF_EXTS    = new Set(['pdf']);
const TEXT_EXTS   = new Set(['md', 'txt', 'csv', 'json', 'html', 'py', 'js', 'ts', 'jsx', 'tsx', 'yaml', 'yml', 'sh', 'bash']);
const BINARY_EXTS = new Set(['docx', 'pptx', 'xlsx', 'xls', 'doc', 'ppt', 'zip', 'tar', 'gz']);

function getFileExt(title, extProp) {
    if (extProp) return extProp.toLowerCase().replace('.', '');
    const parts = (title || '').split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function getFullUrl(url) {
    if (!url) return url;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function DownloadPrompt({ title, url }) {
    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = getFullUrl(url);
        a.download = title;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const extIcons = {
        docx: '📄', doc: '📄',
        pptx: '📊', ppt: '📊',
        xlsx: '📈', xls: '📈',
        zip: '📦', tar: '📦', gz: '📦',
    };
    const ext = title.split('.').pop().toLowerCase();
    const icon = extIcons[ext] || '📁';

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6">
            <div className="flex flex-col items-center gap-3">
                <span className="text-6xl">{icon}</span>
                <p className="text-lg font-medium text-center" style={{ color: 'var(--text-primary)' }}>
                    {title}
                </p>
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                    This file type cannot be previewed in the browser.
                </p>
            </div>
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download {ext.toUpperCase()}
            </button>
        </div>
    );
}

export const RightPanel = ({ content, onClose }) => {
    const { isDark } = useTheme();
    const [fetchedData, setFetchedData] = useState(null);
    const [loading, setLoading]         = useState(false);
    const [fetchError, setFetchError]   = useState(null);
    const [pdfBlobUrl, setPdfBlobUrl]   = useState(null);

    if (!content) return null;

    const { type, title, data: initialData, url, ext: extProp } = content;
    const ext = getFileExt(title, extProp);

    const isImage  = IMAGE_EXTS.has(ext);
    const isPdf    = PDF_EXTS.has(ext);
    const isText   = TEXT_EXTS.has(ext);
    const isBinary = BINARY_EXTS.has(ext);
    const isMd     = ext === 'md' || type === 'skill';

    // For text files: fetch content. For PDFs: fetch as blob to bypass iframe CORS/auth issues.
    const needsTextFetch = type === 'file_preview' && isText && !initialData;
    const needsPdfFetch  = type === 'file_preview' && isPdf;

    useEffect(() => {
        setFetchedData(null);
        setFetchError(null);
        setPdfBlobUrl(null);

        if (needsTextFetch && url) {
            setLoading(true);
            fetch(getFullUrl(url), { credentials: 'include' })
                .then(res => {
                    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                    return res.text();
                })
                .then(text => { setFetchedData(text); setLoading(false); })
                .catch(err => { setFetchError(err.message); setLoading(false); });
        } else if (needsPdfFetch && url) {
            setLoading(true);
            fetch(getFullUrl(url), { credentials: 'include' })
                .then(res => {
                    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                    return res.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    setPdfBlobUrl(blobUrl);
                    setLoading(false);
                })
                .catch(err => { setFetchError(err.message); setLoading(false); });
        }

        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        };
    }, [url, type]);

    const displayData = needsTextFetch ? fetchedData : initialData;

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = getFullUrl(url);
        a.download = title;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div
            className="w-1/2 flex flex-col border-l h-full overflow-hidden transition-all duration-300"
            style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
            }}
        >
            {/* Header */}
            <div
                className="h-14 flex items-center justify-between px-4 border-b flex-shrink-0"
                style={{ borderColor: 'var(--border-color)' }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {type === 'skill' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-md border border-blue-500/20">SKILL</span>
                    ) : type === 'file_preview' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-500 rounded-md border border-purple-500/20">FILE</span>
                    ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-md border border-green-500/20">ARTIFACT</span>
                    )}
                    <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                </div>

                <div className="flex items-center gap-2">
                    {/* Copy button — only for text content */}
                    {displayData && (
                        <button
                            onClick={() => navigator.clipboard.writeText(displayData)}
                            className="p-1.5 rounded-md transition-colors hover:bg-[var(--hover-bg)]"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Copy to clipboard"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    )}
                    {/* Download button — always show for file_preview */}
                    {type === 'file_preview' && url && (
                        <button
                            onClick={handleDownload}
                            className="p-1.5 rounded-md transition-colors hover:bg-[var(--hover-bg)]"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Download file"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md transition-colors hover:bg-[var(--hover-bg)]"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Close panel"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex justify-center items-center flex-1">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading preview…</span>
                        </div>
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
                        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-red-400 text-center">Failed to load: {fetchError}</p>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                        >
                            Download instead
                        </button>
                    </div>
                ) : isImage ? (
                    <div className="flex justify-center items-center flex-1 p-4">
                        <img
                            src={getFullUrl(url)}
                            alt={title}
                            className="max-w-full max-h-full object-contain rounded-lg border"
                            style={{ borderColor: 'var(--border-color)' }}
                        />
                    </div>
                ) : isPdf ? (
                    pdfBlobUrl ? (
                        <iframe
                            src={pdfBlobUrl}
                            title={title}
                            className="flex-1 w-full border-0"
                            style={{ minHeight: 0 }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 gap-4">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>PDF could not be loaded.</p>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                            >
                                Download PDF
                            </button>
                        </div>
                    )
                ) : isBinary ? (
                    <DownloadPrompt title={title} url={url} />
                ) : isMd ? (
                    /* Rendered Markdown */
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar prose prose-sm max-w-none dark:prose-invert" style={{ color: 'var(--text-primary)' }}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const lang = match?.[1] || '';
                                    const codeStr = String(children).replace(/\n$/, '');
                                    if (!inline && lang === 'mermaid') {
                                        return <MermaidDiagram chart={codeStr} isDark={isDark} />;
                                    }
                                    return !inline ? (
                                        <SyntaxHighlighter style={isDark ? oneDark : oneLight} language={lang || 'text'} PreTag="div" customStyle={{ margin: '0.75rem 0', borderRadius: '0.5rem', fontSize: '0.8rem' }} {...props}>
                                            {codeStr}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className="px-1.5 py-0.5 rounded text-sm" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }} {...props}>{children}</code>
                                    );
                                },
                                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 pb-2 border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
                                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
                                p:  ({ children }) => <p className="mb-3 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
                                a:  ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} className="underline">{children}</a>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 pl-4 italic my-3" style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)' }}>{children}</blockquote>,
                                table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
                                th: ({ children }) => <th className="px-3 py-2 text-left font-semibold border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{children}</th>,
                                td: ({ children }) => <td className="px-3 py-2 border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>{children}</td>,
                            }}
                        >
                            {displayData || ''}
                        </ReactMarkdown>
                    </div>
                ) : (
                    /* Raw text / code files */
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <SyntaxHighlighter
                            style={isDark ? oneDark : oneLight}
                            language={ext || 'text'}
                            customStyle={{ margin: 0, borderRadius: 0, height: '100%', fontSize: '0.875rem' }}
                            showLineNumbers
                        >
                            {displayData || initialData || ''}
                        </SyntaxHighlighter>
                    </div>
                )}
            </div>
        </div>
    );
};
