import { useState, useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';
import {
    IconUser, IconLayers, IconAgent, IconTools, IconBolt, IconArrowRight,
} from './icons';

// Each beat of a full request, with a mock elapsed timestamp so the timeline
// reads like a real trace.
const STEPS = [
    { t: '0.00s', icon: IconUser, actor: 'user', title: 'Prompt arrives', body: '"Pull last quarter\'s numbers from the sheet and chart the trend."' },
    { t: '0.02s', icon: IconLayers, actor: 'assemble', title: 'Context assembled', body: 'Memory (name, stack), relevant skills, and the enabled tool list are gathered for this turn.', tags: ['memory', 'skills', 'tools'] },
    { t: '0.14s', icon: IconAgent, actor: 'agent', title: 'agent_node reasons', body: 'OmniRoute → Gemini decides it needs data, then code. It emits two tool calls at once.', tags: ['OmniRoute → Gemini'] },
    { t: '0.31s', icon: IconTools, actor: 'tools', title: 'Tools run in the sandbox', body: 'knowledge_base_search retrieves the figures; sandbox_run_python renders the chart in the user venv — in parallel.', tags: ['RAG', 'sandbox_run_python'] },
    { t: '1.08s', icon: IconBolt, actor: 'verify', title: 'Self-verifies the chart', body: 'sandbox_analyze_image loads the PNG it just produced and confirms the trend line is correct before answering.', tags: ['sandbox_analyze_image'] },
    { t: '1.42s', icon: IconArrowRight, actor: 'answer', title: 'Answer streams back', body: 'No tool calls remain. The grounded, chart-backed reply streams to the client token by token.', tags: ['streamed'] },
];

const ACTOR_COLOR = {
    user: 'var(--arch-text-dim)',
    assemble: 'var(--arch-cool)',
    agent: 'var(--arch-accent)',
    tools: 'var(--arch-accent)',
    verify: 'var(--arch-accent)',
    answer: 'var(--arch-accent-bright)',
};

export function RequestFlow() {
    const [ref, inView] = useInView({ threshold: 0.25 });
    const reduced = useReducedMotion();
    const [revealed, setRevealed] = useState(0); // count of visible steps
    const timer = useRef(null);

    const play = () => {
        clearInterval(timer.current);
        setRevealed(0);
        if (reduced) {
            setRevealed(STEPS.length);
            return;
        }
        timer.current = setInterval(() => {
            setRevealed((r) => {
                if (r >= STEPS.length) {
                    clearInterval(timer.current);
                    return r;
                }
                return r + 1;
            });
        }, 900);
    };

    // Auto-play once when scrolled into view.
    useEffect(() => {
        if (inView && revealed === 0) play();
        return () => clearInterval(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView]);

    const done = revealed >= STEPS.length;

    return (
        <Section id="flow">
            <SectionHead
                index={11}
                eyebrow="End to end"
                title="One request, start to finish."
                lede="Everything above, in sequence: the prompt lands, context is assembled, the agent reasons, tools run in the sandbox, the agent checks its own work, and the answer streams back. This is a single turn of the loop."
            />

            <Reveal delay={80}>
                <div ref={ref} className="arch-panel mt-10 overflow-hidden">
                    {/* trace header */}
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--arch-line)' }}>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: done ? 'var(--arch-accent)' : 'var(--arch-text-faint)', transition: 'background .3s' }} />
                            <span className="arch-mono text-[11.5px]" style={{ color: 'var(--arch-text-dim)' }}>
                                trace · turn #1 {done ? '· complete' : '· running'}
                            </span>
                        </div>
                        <button
                            onClick={play}
                            className="arch-mono text-[11px] px-2.5 py-1 rounded-md arch-lift"
                            style={{ border: '1px solid var(--arch-line-strong)', color: 'var(--arch-text-dim)' }}
                        >
                            ↻ replay
                        </button>
                    </div>

                    {/* timeline */}
                    <div className="p-5 sm:p-7">
                        <ol className="relative" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {/* the spine */}
                            <span className="absolute top-1 bottom-1 w-px" style={{ left: 15, background: 'var(--arch-line)' }} />
                            <span
                                className="absolute top-1 w-px"
                                style={{
                                    left: 15,
                                    background: 'var(--arch-accent)',
                                    height: `${(Math.min(revealed, STEPS.length) / STEPS.length) * 100}%`,
                                    transition: 'height .8s cubic-bezier(0.65,0,0.35,1)',
                                    boxShadow: '0 0 8px var(--arch-accent-line)',
                                }}
                            />

                            {STEPS.map((s, i) => {
                                const shown = i < revealed;
                                const active = i === revealed - 1 && !done;
                                const Icon = s.icon;
                                const color = ACTOR_COLOR[s.actor];
                                return (
                                    <li
                                        key={i}
                                        className="relative pl-12 pb-7 last:pb-0"
                                        style={{
                                            opacity: shown ? 1 : 0.25,
                                            transform: shown ? 'none' : 'translateY(6px)',
                                            transition: 'opacity .5s, transform .5s',
                                        }}
                                    >
                                        {/* node */}
                                        <span
                                            className={`absolute flex items-center justify-center rounded-full ${active ? 'arch-node-active' : ''}`}
                                            style={{
                                                left: 4, top: 0, width: 24, height: 24,
                                                background: 'var(--arch-bg-raised-2)',
                                                border: `1px solid ${shown ? color : 'var(--arch-line-strong)'}`,
                                                color: shown ? color : 'var(--arch-text-faint)',
                                                transition: 'border-color .3s, color .3s',
                                            }}
                                        >
                                            <Icon width={13} height={13} />
                                        </span>

                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="arch-num text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>{s.t}</span>
                                            <span className="text-[14px] font-medium" style={{ color: 'var(--arch-text)' }}>{s.title}</span>
                                        </div>
                                        <p className="text-[13px] leading-relaxed mt-1 max-w-xl" style={{ color: 'var(--arch-text-dim)' }}>{s.body}</p>
                                        {s.tags && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {s.tags.map((t) => <Tag key={t} tone={s.actor === 'assemble' ? 'cool' : 'default'}>{t}</Tag>)}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>
            </Reveal>
        </Section>
    );
}
