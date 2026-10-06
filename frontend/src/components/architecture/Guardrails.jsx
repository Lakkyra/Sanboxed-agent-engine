import { useInView } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconShield, IconGauge } from './icons';

const CHECKS = [
    { label: 'Path stays inside this conversation\'s sandbox', tool: 'sandbox_run_python · sandbox_edit_file' },
    { label: 'No destructive pattern (rm -rf /, fork bombs, disk wipes)', tool: 'sandbox_run_shell' },
    { label: 'Every check lives in one hook, not copy-pasted per tool', tool: 'utils/hooks.py' },
];

function CreditMeter({ inView }) {
    const CAP = 5, GRACE = 1, SPEND = 3.2;
    const total = CAP + GRACE;
    const fillPct = inView ? Math.min(100, (SPEND / total) * 100) : 0;
    const capPct = (CAP / total) * 100;

    return (
        <div>
            <div className="flex items-baseline justify-between mb-3">
                <span className="arch-num text-[1.6rem] font-semibold" style={{ color: 'var(--arch-text)' }}>
                    ${SPEND.toFixed(2)}
                </span>
                <span className="text-[11.5px]" style={{ color: 'var(--arch-text-faint)' }}>of ${CAP.toFixed(2)} free-tier cap</span>
            </div>

            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--arch-bg-inset)' }}>
                <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${fillPct}%`, background: 'var(--arch-accent)', transition: 'width 1.3s cubic-bezier(0.65,0,0.35,1)' }}
                />
                <div className="absolute inset-y-0 w-[2px]" style={{ left: `${capPct}%`, background: 'var(--arch-text)' }} />
            </div>

            <div className="flex justify-between mt-2">
                <span className="arch-mono text-[10px]" style={{ color: 'var(--arch-text-faint)' }}>$0</span>
                <span className="arch-mono text-[10px]" style={{ color: 'var(--arch-text-dim)' }}>cap</span>
                <span className="arch-mono text-[10px]" style={{ color: 'var(--arch-text-faint)' }}>+$1 grace</span>
            </div>

            <p className="text-[12.5px] leading-relaxed mt-4" style={{ color: 'var(--arch-text-dim)' }}>
                A turn already in flight is allowed to finish into a $1 grace buffer past the cap
                rather than getting cut off mid-answer — the next turn is what actually gets blocked.
            </p>
        </div>
    );
}

export function Guardrails() {
    const [ref, inView] = useInView({ threshold: 0.35 });

    return (
        <Section id="guardrails">
            <SectionHead
                index={9}
                eyebrow="Guardrails & cost"
                title="Every tool call is checked. Every turn has a price."
                lede="Security and cost are both enforced centrally, not per-tool. A pre-tool hook checks every sandbox call before it runs; a per-turn cost computed from real token counts is checked against a free-tier cap before the next turn is allowed to start."
            />

            <Reveal delay={80}>
                <div ref={ref} className="mt-10 grid md:grid-cols-2 gap-4">
                    <div className="arch-panel p-5 sm:p-7">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--arch-bg-inset)', border: '1px solid var(--arch-line)', color: 'var(--arch-accent)' }}>
                                <IconShield width={17} height={17} />
                            </div>
                            <h3 className="text-[14.5px] font-medium" style={{ color: 'var(--arch-text)' }}>Pre-tool hook, run first</h3>
                        </div>
                        <div className="space-y-2.5">
                            {CHECKS.map((c, i) => (
                                <div
                                    key={c.label}
                                    className="arch-panel-inset flex items-start gap-3 px-3.5 py-3"
                                    style={{
                                        opacity: inView ? 1 : 0,
                                        transform: inView ? 'none' : 'translateY(6px)',
                                        transition: `opacity .5s ${i * 0.12}s, transform .5s ${i * 0.12}s`,
                                    }}
                                >
                                    <span
                                        className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--arch-accent-wash)', border: '1px solid var(--arch-accent-line)', color: 'var(--arch-accent)' }}
                                    >
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[12.5px]" style={{ color: 'var(--arch-text)' }}>{c.label}</div>
                                        <div className="arch-mono text-[10.5px] mt-0.5" style={{ color: 'var(--arch-text-faint)' }}>{c.tool}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="arch-panel p-5 sm:p-7">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--arch-bg-inset)', border: '1px solid var(--arch-line)', color: 'var(--arch-accent)' }}>
                                <IconGauge width={17} height={17} />
                            </div>
                            <h3 className="text-[14.5px] font-medium" style={{ color: 'var(--arch-text)' }}>Free-tier credit cap</h3>
                        </div>
                        <CreditMeter inView={inView} />
                    </div>
                </div>
            </Reveal>

            <div className="mt-5 flex flex-wrap gap-2">
                <Tag>fail-closed, not fail-open</Tag>
                <Tag>real token counts, not estimates</Tag>
                <Tag tone="accent">admin accounts tracked, never blocked</Tag>
            </div>
        </Section>
    );
}
