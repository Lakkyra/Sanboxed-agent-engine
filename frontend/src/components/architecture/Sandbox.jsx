import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconUser, IconFolder, IconVenv, IconLock, IconChip, IconArrowRight } from './icons';

function WorkspaceCell({ conv, active }) {
    const folders = [
        { name: 'uploads/', note: 'what this conversation sent in' },
        { name: 'outputs/', note: 'artifacts this conversation produced' },
        { name: 'work/', note: 'scratch space for this run' },
    ];
    return (
        <div
            className="arch-panel relative overflow-hidden p-5 flex-1"
            style={active ? { borderColor: 'var(--arch-accent-line)' } : undefined}
        >
            {/* scanning shimmer only on the active cell */}
            {active && (
                <div className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                    style={{
                        background: 'linear-gradient(180deg, var(--arch-accent-wash), transparent)',
                        animation: 'archScan 3.5s ease-in-out infinite',
                    }} />
            )}
            <div className="flex items-center gap-2.5 relative">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--arch-bg-inset)', border: '1px solid var(--arch-line)', color: 'var(--arch-text-dim)' }}>
                    <IconUser width={16} height={16} />
                </div>
                <div>
                    <div className="arch-mono text-[12.5px]" style={{ color: 'var(--arch-text)' }}>conversation {conv}</div>
                    <div className="arch-mono text-[10.5px]" style={{ color: 'var(--arch-text-faint)' }}>~/agentx_workspace/user/conversations/{conv}</div>
                </div>
            </div>

            <div className="mt-4 space-y-1.5 relative">
                {folders.map((f) => (
                    <div key={f.name} className="arch-panel-inset flex items-center gap-2.5 px-3 py-2">
                        <IconFolder width={15} height={15} style={{ color: 'var(--arch-accent)' }} />
                        <span className="arch-mono text-[12px]" style={{ color: 'var(--arch-text)' }}>{f.name}</span>
                        <span className="text-[11px] ml-auto hidden sm:block" style={{ color: 'var(--arch-text-faint)' }}>{f.note}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Sandbox() {
    return (
        <Section id="sandbox">
            <SectionHead
                index={3}
                eyebrow="Per-user, per-conversation sandbox"
                title="Isolation goes one level deeper than you'd expect."
                lede="Every user gets a persistent workspace with a lazily-created Python venv — shared across their conversations, since re-creating an interpreter per chat would be pure waste. But uploads/, outputs/ and work/ are scoped one level deeper, per conversation: file-creation detection snapshots outputs/ before a turn and diffs it after, and a shared-per-user (not per-conversation) folder once let one conversation's file write land inside a different, concurrent conversation's snapshot — confirmed live before the fix. sandbox_run_python and sandbox_run_shell execute inside that per-conversation root, and every path is checked against it before use."
            />

            <Reveal delay={80}>
                <div className="mt-10 flex flex-col md:flex-row items-stretch gap-4">
                    <WorkspaceCell conv="4f2a…" active />

                    {/* isolation divider */}
                    <div className="flex md:flex-col items-center justify-center gap-3 py-2 md:py-0 md:px-1">
                        <div className="hidden md:block flex-1 w-px" style={{ background: 'linear-gradient(var(--arch-line), transparent)' }} />
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--arch-line-strong)', background: 'var(--arch-bg-raised)', color: 'var(--arch-text-dim)' }}>
                            <IconLock width={16} height={16} />
                        </div>
                        <div className="hidden md:block flex-1 w-px" style={{ background: 'linear-gradient(transparent, var(--arch-line))' }} />
                        <div className="md:hidden flex-1 h-px" style={{ background: 'var(--arch-line)' }} />
                    </div>

                    <WorkspaceCell conv="9c31…" />
                </div>

                <div className="mt-3 flex items-center gap-2.5 px-1">
                    <IconVenv width={14} height={14} style={{ color: 'var(--arch-text-faint)' }} />
                    <span className="text-[11.5px]" style={{ color: 'var(--arch-text-faint)' }}>
                        Both conversations above belong to the <span className="arch-mono">same</span> user and share one <span className="arch-mono">venv/</span> — only uploads/outputs/work are split per conversation.
                    </span>
                </div>
            </Reveal>

            <div className="mt-5 flex flex-wrap gap-2">
                <Tag>isolated pip installs</Tag>
                <Tag>path-escape guarded</Tag>
                <Tag>persistent between sessions</Tag>
                <Tag tone="accent">idle workspaces reaped in background</Tag>
            </div>

            {/* Where the code actually runs — a separate host, not this process */}
            <Reveal delay={140}>
                <div className="arch-panel mt-6 p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="arch-panel-inset flex-1 w-full p-4 text-center">
                            <div className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>app server</div>
                            <div className="text-[13px] font-medium mt-1" style={{ color: 'var(--arch-text)' }}>agent_tool_node</div>
                            <div className="text-[11px] mt-0.5" style={{ color: 'var(--arch-text-faint)' }}>calls sandbox_run_python</div>
                        </div>

                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <IconArrowRight width={18} height={18} className="rotate-90 sm:rotate-0" style={{ color: 'var(--arch-text-faint)' }} />
                            <span className="arch-mono text-[9.5px] whitespace-nowrap" style={{ color: 'var(--arch-text-faint)' }}>network hop</span>
                        </div>

                        <div className="arch-panel-inset flex-1 w-full p-4 text-center" style={{ borderColor: 'var(--arch-accent-line)' }}>
                            <div className="flex items-center justify-center gap-1.5">
                                <IconChip width={14} height={14} style={{ color: 'var(--arch-accent)' }} />
                                <div className="arch-mono text-[11px]" style={{ color: 'var(--arch-accent)' }}>dedicated sandbox host</div>
                            </div>
                            <div className="text-[13px] font-medium mt-1" style={{ color: 'var(--arch-text)' }}>gVisor container per execution</div>
                            <div className="text-[11px] mt-0.5" style={{ color: 'var(--arch-text-faint)' }}>kernel-level isolation, not just a subprocess</div>
                        </div>
                    </div>

                    <p className="text-[12px] leading-relaxed mt-4 pt-4" style={{ color: 'var(--arch-text-dim)', borderTop: '1px solid var(--arch-line)' }}>
                        In remote execution mode, code doesn't run in the app's own container at all — it's streamed to a separate, network-isolated host and executed inside a gVisor sandbox. If that host is unreachable, the tool call fails with an explicit error instead of silently falling back to running the code locally: <span className="arch-mono" style={{ color: 'var(--arch-text)' }}>fail-closed by design</span>.
                    </p>
                </div>
            </Reveal>
        </Section>
    );
}
