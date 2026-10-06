import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let _initialized = false;

function initMermaid(isDark) {
    mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        themeVariables: isDark
            ? {
                background: '#1e1e2e',
                primaryColor: '#7c3aed',
                primaryTextColor: '#e2e8f0',
                lineColor: '#4b5563',
                secondaryColor: '#1e293b',
                tertiaryColor: '#0f172a',
              }
            : {
                primaryColor: '#7c3aed',
                primaryTextColor: '#1e1e2e',
                lineColor: '#6b7280',
              },
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
    });
    _initialized = true;
}

let _diagramCounter = 0;

export function MermaidDiagram({ chart, isDark }) {
    const containerRef = useRef(null);
    const [svg, setSvg]       = useState('');
    const [error, setError]   = useState(null);
    const idRef               = useRef(`mermaid-${++_diagramCounter}`);

    useEffect(() => {
        if (!chart?.trim()) return;

        initMermaid(isDark);
        setError(null);

        mermaid.render(idRef.current, chart.trim())
            .then(({ svg: rendered }) => {
                setSvg(rendered);
            })
            .catch((err) => {
                console.warn('Mermaid render error:', err);
                setError(err?.message || 'Failed to render diagram');
            });
    }, [chart, isDark]);

    if (error) {
        return (
            <div className="rounded-lg border p-4 my-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    ⚠️ Diagram render error — showing raw source
                </p>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                    {chart}
                </pre>
            </div>
        );
    }

    if (!svg) return null;

    return (
        <div
            ref={containerRef}
            className="mermaid-diagram my-4 flex justify-center overflow-x-auto rounded-lg p-4"
            style={{ backgroundColor: isDark ? '#1e1e2e' : '#f8fafc', border: '1px solid var(--border-color)' }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
