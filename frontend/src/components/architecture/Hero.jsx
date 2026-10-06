import { Link } from 'react-router-dom';
import { useCountUp, useInView } from './hooks';
import { Tag } from './primitives';
import { IconArrowRight } from './icons';

// A quiet constellation backdrop: a sparse node graph rendered in SVG that
// drifts slowly. No blobs, no gradients — just hairline structure that hints
// at "a graph of tools" without shouting.
function Constellation() {
    const nodes = [
        [12, 22], [24, 58], [38, 30], [50, 72], [63, 40],
        [77, 66], [86, 28], [70, 18], [30, 84], [55, 14],
        [90, 52], [8, 68], [45, 48], [62, 84], [82, 82],
    ];
    const edges = [
        [0, 2], [2, 4], [4, 6], [1, 8], [3, 12], [12, 4],
        [9, 3], [7, 6], [10, 6], [5, 10], [11, 1], [13, 5],
        [12, 1], [4, 7], [14, 5],
    ];
    return (
        <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            style={{
                maskImage: 'radial-gradient(ellipse 75% 65% at 50% 42%, #000 30%, transparent 78%)',
                WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 42%, #000 30%, transparent 78%)',
            }}
        >
            {edges.map(([a, b], i) => (
                <line
                    key={i}
                    x1={nodes[a][0]} y1={nodes[a][1]}
                    x2={nodes[b][0]} y2={nodes[b][1]}
                    stroke="var(--arch-line-strong)"
                    strokeWidth="0.12"
                />
            ))}
            {nodes.map(([x, y], i) => {
                const accent = i % 5 === 0;
                return (
                    <g key={i} style={{ animation: `archDrift ${7 + (i % 5)}s ease-in-out ${i * 0.4}s infinite` }}>
                        <circle
                            cx={x} cy={y} r={accent ? 0.7 : 0.45}
                            fill={accent ? 'var(--arch-accent)' : 'var(--arch-text-faint)'}
                        />
                        {accent && (
                            <circle cx={x} cy={y} r="1.6" fill="none" stroke="var(--arch-accent-line)" strokeWidth="0.1" />
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function Stat({ value, suffix, label, decimals = 0 }) {
    const [ref, inView] = useInView({ threshold: 0.6 });
    const n = useCountUp(value, { active: inView, decimals });
    return (
        <div ref={ref}>
            <div className="arch-num text-[1.9rem] font-semibold" style={{ color: 'var(--arch-text)' }}>
                {n}
                <span style={{ color: 'var(--arch-accent)' }}>{suffix}</span>
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--arch-text-faint)' }}>{label}</div>
        </div>
    );
}

export function Hero() {
    return (
        <header className="relative pt-28 md:pt-36 pb-20">
            <div className="absolute inset-0 -z-0 pointer-events-none">
                <Constellation />
            </div>

            <div className="relative">
                <div className="arch-reveal is-in">
                    <Tag tone="accent" className="mb-6">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--arch-accent)' }} />
                        ReAct agent · v3 graph
                    </Tag>
                </div>

                <h1 className="arch-h font-semibold text-[clamp(2.6rem,7vw,5rem)] max-w-4xl">
                    One capable agent.
                    <br />
                    <span style={{ color: 'var(--arch-text-dim)' }}>A real workspace</span> around it.
                </h1>

                <p className="mt-7 text-[clamp(1rem,1.5vw,1.22rem)] leading-relaxed max-w-2xl" style={{ color: 'var(--arch-text-dim)' }}>
                    AgentX is an autonomous AI workspace: a single reasoning agent
                    given a sandboxed machine, a toolbelt, a skills library, and a
                    memory of you — then left to actually get the work done.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Link
                        to="/chat"
                        className="arch-lift group inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg"
                        style={{ background: 'var(--arch-accent)', color: 'var(--accent-ink)' }}
                    >
                        Open the workspace
                        <IconArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <a
                        href="#map"
                        className="arch-lift inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg"
                        style={{ border: '1px solid var(--arch-line-strong)', color: 'var(--arch-text)' }}
                    >
                        See how it thinks
                    </a>
                </div>

                <div className="mt-16 pt-10 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl" style={{ borderTop: '1px solid var(--arch-line)' }}>
                    <Stat value={2} label="graph nodes, one loop" suffix="" />
                    <Stat value={12} suffix="+" label="built-in agent tools" />
                    <Stat value={1} label="isolated venv per user" suffix="" />
                    <Stat value={5} label="min MCP tool cache TTL" suffix="m" />
                </div>
            </div>
        </header>
    );
}
