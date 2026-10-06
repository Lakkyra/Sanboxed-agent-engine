import { useInView } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconMemory, IconArrowRight } from './icons';

const FACTS = [
    { label: 'name', value: 'Alex' },
    { label: 'stack', value: 'FastAPI · React · LangGraph' },
    { label: 'project', value: 'Sandboxed Agent Engine' },
    { label: 'prefers', value: 'concise answers, real code' },
];

export function Memory() {
    const [ref, inView] = useInView({ threshold: 0.4 });

    return (
        <Section id="memory">
            <SectionHead
                index={7}
                eyebrow="Memory bank"
                title="It remembers you between turns — quietly."
                lede="After each turn, a background task extracts durable facts — your name, your stack, your projects, your preferences — without blocking the response. The PromptBuilder folds the latest handful back into the system prompt so the next conversation already knows you."
            />

            <Reveal delay={80}>
                <div ref={ref} className={`arch-panel mt-10 p-5 sm:p-8 ${inView ? 'is-in' : ''}`}>
                    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-5 items-center">
                        {/* extracted facts */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <IconMemory width={16} height={16} style={{ color: 'var(--arch-accent)' }} />
                                <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>extracted in background</span>
                            </div>
                            <div className="space-y-2">
                                {FACTS.map((f, i) => (
                                    <div
                                        key={f.label}
                                        className="arch-panel-inset flex items-center gap-3 px-3 py-2"
                                        style={{
                                            opacity: inView ? 1 : 0,
                                            transform: inView ? 'none' : 'translateX(-8px)',
                                            transition: `opacity .5s ${i * 0.12}s, transform .5s ${i * 0.12}s`,
                                        }}
                                    >
                                        <span className="arch-mono text-[10.5px] uppercase tracking-wider w-14 flex-shrink-0" style={{ color: 'var(--arch-accent)' }}>{f.label}</span>
                                        <span className="text-[13px]" style={{ color: 'var(--arch-text)' }}>{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* arrow */}
                        <div className="flex md:flex-col items-center justify-center" style={{ color: 'var(--arch-text-faint)' }}>
                            <IconArrowRight className="hidden md:block" />
                            <IconArrowRight className="md:hidden rotate-90" />
                        </div>

                        {/* injected into next prompt */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>injected into next system prompt</span>
                            </div>
                            <div className="arch-panel-inset p-4 font-mono">
                                <pre className="arch-mono text-[11.5px] leading-[1.7] whitespace-pre-wrap" style={{ color: 'var(--arch-text-dim)' }}>
{`<memory>
  The user is Alex. Works in
  FastAPI, React and LangGraph.
  Building Sandboxed Agent Engine. Prefers concise
  answers with real, runnable code.
</memory>`}
                                </pre>
                                <span className="arch-cursor mt-1" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-5 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--arch-line)' }}>
                        <Tag>non-blocking (asyncio task)</Tag>
                        <Tag>~10 most recent injected</Tag>
                        <Tag tone="accent">GET / DELETE /api/users/memories</Tag>
                    </div>
                </div>
            </Reveal>
        </Section>
    );
}
