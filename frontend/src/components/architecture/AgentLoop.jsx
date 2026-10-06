import { useInView, useSequence } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';

// The seven beats of one ReAct turn. `focus` names which diagram element
// lights up for that beat.
const BEATS = [
    { focus: 'user', label: 'User message', detail: 'A prompt enters the graph as the newest turn.' },
    { focus: 'agent', label: 'agent_node reasons', detail: 'Tools are assembled and bound to the LLM, served via OmniRoute → Gemini.' },
    { focus: 'edge-out', label: 'Decides to act', detail: 'The model emits one or more tool calls in a single AI message.' },
    { focus: 'tools', label: 'agent_tool_node runs', detail: 'Every requested tool executes in parallel inside the sandbox.' },
    { focus: 'edge-back', label: 'Results return', detail: 'Tool outputs are appended and the loop re-enters agent_node.' },
    { focus: 'agent', label: 'Reasons again', detail: 'The agent inspects results and decides: call more tools, or finish.' },
    { focus: 'answer', label: 'Streams the answer', detail: 'No tool calls left → the final response streams back token by token.' },
];

function Node({ x, y, w, h, active, title, sub, mono }) {
    return (
        <g style={{ transition: 'opacity .3s' }}>
            <foreignObject x={x} y={y} width={w} height={h}>
                <div
                    className={`arch-panel h-full flex flex-col justify-center px-4 ${active ? 'arch-node-active' : ''}`}
                    style={{ background: active ? 'var(--arch-bg-raised-2)' : 'var(--arch-bg-raised)' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="arch-node-dot w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--arch-line-strong)' }} />
                        <span className={mono ? 'arch-mono text-[12.5px]' : 'text-[13px] font-medium'} style={{ color: 'var(--arch-text)' }}>
                            {title}
                        </span>
                    </div>
                    {sub && <div className="text-[11px] mt-1 pl-3.5" style={{ color: 'var(--arch-text-faint)' }}>{sub}</div>}
                </div>
            </foreignObject>
        </g>
    );
}

export function AgentLoop() {
    const [ref, inView] = useInView({ threshold: 0.3 });
    const [step] = useSequence(BEATS.length, { active: inView, interval: 1900, holdFrame: 3 });
    const beat = BEATS[step];
    const isFocus = (name) => beat.focus === name;

    return (
        <Section id="loop">
            <SectionHead
                index={1}
                eyebrow="The agent loop"
                title="Not a pipeline — a loop that runs until the work is done."
                lede="AgentX compiles to a two-node LangGraph: agent_node thinks, agent_tool_node acts. Control bounces between them until the model stops asking for tools. This is the whole engine."
            />

            <Reveal delay={80}>
                <div ref={ref} className={`arch-panel mt-10 p-5 sm:p-8 ${inView ? 'is-in' : ''}`}>
                    {/* Diagram */}
                    <div className="w-full overflow-x-auto">
                        <svg viewBox="0 0 720 260" className="w-full min-w-[560px]" role="img" aria-label="Agent reasoning loop diagram">
                            <defs>
                                <marker id="arrHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                                    <path d="M1,1 L6,4 L1,7" fill="none" stroke="var(--arch-text-faint)" strokeWidth="1.2" />
                                </marker>
                                <marker id="arrHeadA" markerWidth="9" markerHeight="9" refX="6" refY="4" orient="auto">
                                    <path d="M1,1 L6,4 L1,7" fill="none" stroke="var(--arch-accent)" strokeWidth="1.4" />
                                </marker>
                            </defs>

                            {/* USER → AGENT */}
                            <line x1="150" y1="60" x2="250" y2="60" stroke={isFocus('user') ? 'var(--arch-accent)' : 'var(--arch-line-strong)'} strokeWidth="1.3" markerEnd={isFocus('user') ? 'url(#arrHeadA)' : 'url(#arrHead)'} style={{ transition: 'stroke .3s' }} />

                            {/* AGENT → TOOLS (out) */}
                            <line x1="470" y1="60" x2="530" y2="60" stroke={isFocus('edge-out') ? 'var(--arch-accent)' : 'var(--arch-line-strong)'} strokeWidth="1.3" markerEnd={isFocus('edge-out') ? 'url(#arrHeadA)' : 'url(#arrHead)'} style={{ transition: 'stroke .3s' }} />
                            <text x="500" y="50" textAnchor="middle" className="arch-mono" fontSize="9" fill={isFocus('edge-out') ? 'var(--arch-accent)' : 'var(--arch-text-faint)'} style={{ transition: 'fill .3s' }}>tool_calls</text>

                            {/* TOOLS → AGENT (return loop, curved under) */}
                            <path d="M600,110 L600,175 Q600,190 585,190 L275,190 Q260,190 260,175 L260,110"
                                fill="none"
                                stroke={isFocus('edge-back') ? 'var(--arch-accent)' : 'var(--arch-line-strong)'}
                                strokeWidth="1.3"
                                strokeDasharray={isFocus('edge-back') ? '0' : '4 4'}
                                markerEnd={isFocus('edge-back') ? 'url(#arrHeadA)' : 'url(#arrHead)'}
                                style={{ transition: 'stroke .3s' }} />
                            <text x="430" y="205" textAnchor="middle" className="arch-mono" fontSize="9" fill={isFocus('edge-back') ? 'var(--arch-accent)' : 'var(--arch-text-faint)'} style={{ transition: 'fill .3s' }}>observations → loop back</text>

                            {/* AGENT → ANSWER (down) */}
                            <path d="M360,90 L360,130" fill="none" stroke={isFocus('answer') ? 'var(--arch-accent)' : 'var(--arch-line-strong)'} strokeWidth="1.3" markerEnd={isFocus('answer') ? 'url(#arrHeadA)' : 'url(#arrHead)'} style={{ transition: 'stroke .3s' }} />
                            <text x="372" y="115" textAnchor="start" className="arch-mono" fontSize="9" fill={isFocus('answer') ? 'var(--arch-accent)' : 'var(--arch-text-faint)'} style={{ transition: 'fill .3s' }}>END</text>

                            {/* Nodes */}
                            <Node x={40} y={38} w={110} h={44} active={isFocus('user')} title="User" sub="new turn" />
                            <Node x={250} y={30} w={220} h={60} active={isFocus('agent')} title="agent_node" sub="LLM · OmniRoute → Gemini" mono />
                            <Node x={530} y={30} w={150} h={60} active={isFocus('tools')} title="agent_tool_node" sub="parallel exec" mono />
                            <Node x={250} y={128} w={220} h={46} active={isFocus('answer')} title="Streamed answer" sub="token by token" />
                        </svg>
                    </div>

                    {/* Live caption */}
                    <div className="mt-5 pt-5 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderTop: '1px solid var(--arch-line)' }}>
                        <div className="flex items-center gap-1.5">
                            {BEATS.map((_, i) => (
                                <span key={i} className="h-1 rounded-full transition-all duration-300"
                                    style={{
                                        width: i === step ? 22 : 7,
                                        background: i === step ? 'var(--arch-accent)' : 'var(--arch-line-strong)',
                                    }} />
                            ))}
                        </div>
                        <div className="sm:ml-2">
                            <span className="arch-mono text-[12.5px]" style={{ color: 'var(--arch-accent-bright)' }}>{beat.label}</span>
                            <span className="text-[13px] mx-2" style={{ color: 'var(--arch-text-faint)' }}>—</span>
                            <span className="text-[13px]" style={{ color: 'var(--arch-text-dim)' }}>{beat.detail}</span>
                        </div>
                    </div>
                </div>
            </Reveal>

            <div className="mt-5 flex flex-wrap gap-2">
                <Tag>Redis-backed checkpointing</Tag>
                <Tag>tool map mirrored across both nodes</Tag>
                <Tag>pre / post hooks + result cache</Tag>
                <Tag tone="accent">no supervisor · no subgraphs</Tag>
            </div>
        </Section>
    );
}
