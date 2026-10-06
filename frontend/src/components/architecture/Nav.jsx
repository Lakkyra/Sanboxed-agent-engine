import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight } from './icons';

const SECTIONS = [
    { id: 'loop', label: 'The loop' },
    { id: 'tools', label: 'Tools' },
    { id: 'sandbox', label: 'Sandbox' },
    { id: 'skills', label: 'Skills' },
    { id: 'mcp', label: 'MCP' },
    { id: 'rag', label: 'RAG' },
    { id: 'memory', label: 'Memory' },
    { id: 'context', label: 'Context engineering' },
    { id: 'guardrails', label: 'Guardrails & cost' },
    { id: 'lifecycle', label: 'Turn lifecycle' },
    { id: 'flow', label: 'End to end' },
    { id: 'infra', label: 'Infrastructure' },
];

export function TopBar() {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div
            className="fixed top-0 inset-x-0 z-50"
            style={{
                background: scrolled ? 'var(--glass)' : 'transparent',
                backdropFilter: scrolled ? 'blur(12px)' : 'none',
                borderBottom: `1px solid ${scrolled ? 'var(--arch-line)' : 'transparent'}`,
                transition: 'background .3s, border-color .3s',
            }}
        >
            <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5 group">
                    <span
                        className="w-6 h-6 rounded-md flex items-center justify-center arch-mono text-[12px] font-semibold"
                        style={{ background: 'var(--arch-accent)', color: 'var(--accent-ink)' }}
                    >
                        A
                    </span>
                    <span className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--arch-text)' }}>
                        AgentX
                    </span>
                    <span className="arch-mono text-[11px] hidden sm:inline" style={{ color: 'var(--arch-text-faint)' }}>
                        / architecture
                    </span>
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        to="/"
                        className="hidden sm:inline text-[13px] px-3 py-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--arch-text-dim)' }}
                    >
                        Home
                    </Link>
                    <Link
                        to="/chat"
                        className="arch-lift group inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-md"
                        style={{ border: '1px solid var(--arch-line-strong)', color: 'var(--arch-text)' }}
                    >
                        Launch
                        <IconArrowRight width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export function ProgressRail() {
    const [active, setActive] = useState('loop');

    useEffect(() => {
        const observers = [];
        SECTIONS.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const obs = new IntersectionObserver(
                (entries) => {
                    entries.forEach((e) => {
                        if (e.isIntersecting) setActive(id);
                    });
                },
                { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
            );
            obs.observe(el);
            observers.push(obs);
        });
        return () => observers.forEach((o) => o.disconnect());
    }, []);

    const go = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <nav className="arch-rail fixed left-6 xl:left-10 top-1/2 -translate-y-1/2 z-40" aria-label="Section navigation">
            <div className="flex flex-col gap-0.5">
                {SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => go(s.id)}
                        className={`arch-rail-dot ${active === s.id ? 'is-active' : ''}`}
                    >
                        <span className="arch-rail-tick" />
                        {s.label}
                    </button>
                ))}
            </div>
        </nav>
    );
}
