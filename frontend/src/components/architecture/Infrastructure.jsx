import { useInView } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconChip, IconArrowRight, IconLock } from './icons';

const PIPELINE = [
    { k: 'push', label: 'Push to main', detail: 'Backend or frontend repo.' },
    { k: 'test', label: 'Backend tests', detail: 'Full pytest suite, GitHub Actions.' },
    { k: 'deploy', label: 'Deploy triggers', detail: 'Only after tests pass — rsync to a fresh versioned dir.' },
    { k: 'build', label: 'Build & swap', detail: 'docker build, old container kept (renamed) for rollback.' },
    { k: 'health', label: 'Health check', detail: 'Auto rolls back to the previous container on failure.' },
];

const NODES = [
    {
        title: 'Backend',
        host: 'AWS EC2 · application host',
        detail: 'Amazon Linux 2023, Docker container chatbot-backend behind nginx + Let’s Encrypt.',
        tags: ['api.example.com', 'non-root UID 1001', '--cap-drop=ALL'],
        accent: true,
    },
    {
        title: 'LLM gateway · parser · sandbox',
        host: 'AWS EC2 · services host',
        detail: 'One box, three services behind nginx with a shared API-key gate: OmniRoute (Node → Gemini), the custom PDF parser microservice, and the gVisor Sandbox Execution Service.',
        tags: ['OmniRoute', 'pdf-parser', 'sandbox-service.service · gVisor'],
    },
    {
        title: 'Managed data layer',
        host: 'external, not self-hosted',
        detail: 'Conversation/user data, vectors, cache and generated-image storage all live in managed services — nothing stateful runs on the app box itself.',
        tags: ['MongoDB Atlas', 'Qdrant', 'Redis', 'Cloudinary'],
    },
    {
        title: 'Frontend',
        host: 'Vercel',
        detail: 'Auto-deploys straight from GitHub on every push to main — no pipeline to babysit.',
        tags: ['app.example.com', 'auto-deploy on push'],
    },
];

function PipelineStage({ s, i, inView }) {
    return (
        <div className="flex flex-col items-center text-center px-1">
            <div
                className="w-3 h-3 rounded-full -translate-y-1/2"
                style={{
                    background: 'var(--arch-accent)',
                    boxShadow: inView ? '0 0 10px var(--arch-accent)' : 'none',
                    transition: `box-shadow .4s ${i * 0.15 + 0.3}s`,
                }}
            />
            <div className="arch-mono text-[10px] mb-2" style={{ color: 'var(--arch-text-faint)' }}>
                {String(i + 1).padStart(2, '0')}
            </div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--arch-text)' }}>{s.label}</div>
            <div className="text-[11.5px] leading-snug mt-1" style={{ color: 'var(--arch-text-dim)' }}>{s.detail}</div>
        </div>
    );
}

export function Infrastructure() {
    const [ref, inView] = useInView({ threshold: 0.3 });

    return (
        <Section id="infra">
            <SectionHead
                index={12}
                eyebrow="Infrastructure & deployment"
                title="What's actually running, and how it gets there."
                lede="No orchestration platform, no Kubernetes — two purpose-built EC2 boxes, a managed data layer, and a GitHub Actions pipeline that replaced what used to be a manual SSH session for every release."
            />

            <Reveal delay={80}>
                <div ref={ref} className="arch-panel mt-10 p-5 sm:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <IconArrowRight width={15} height={15} style={{ color: 'var(--arch-accent)' }} />
                        <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>deploy pipeline · GitHub Actions</span>
                    </div>
                    <div className="w-full overflow-x-auto">
                        <div className="min-w-[640px]">
                            <svg viewBox="0 0 1000 8" className="w-full h-2" preserveAspectRatio="none" aria-hidden="true">
                                <line x1="4" y1="4" x2="996" y2="4" stroke="var(--arch-line-strong)" strokeWidth="1" />
                                <line
                                    x1="4" y1="4" x2="996" y2="4"
                                    stroke="var(--arch-accent)" strokeWidth="1.5"
                                    className="arch-draw" style={{ '--len': 992 }}
                                />
                            </svg>
                            <div className="grid grid-cols-5 gap-3 -mt-1">
                                {PIPELINE.map((s, i) => <PipelineStage key={s.k} s={s} i={i} inView={inView} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </Reveal>

            <Reveal delay={140}>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    {NODES.map((n) => (
                        <div
                            key={n.title}
                            className="arch-panel p-5"
                            style={n.accent ? { borderColor: 'var(--arch-accent-line)' } : undefined}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--arch-bg-inset)', border: '1px solid var(--arch-line)', color: 'var(--arch-accent)' }}>
                                        <IconChip width={16} height={16} />
                                    </div>
                                    <div>
                                        <div className="text-[14px] font-medium" style={{ color: 'var(--arch-text)' }}>{n.title}</div>
                                        <div className="arch-mono text-[10.5px] mt-0.5" style={{ color: 'var(--arch-text-faint)' }}>{n.host}</div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[12.5px] leading-relaxed mt-3" style={{ color: 'var(--arch-text-dim)' }}>{n.detail}</p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {n.tags.map((t) => <Tag key={t} tone={n.accent ? 'accent' : 'default'}>{t}</Tag>)}
                            </div>
                        </div>
                    ))}
                </div>
            </Reveal>

            <Reveal delay={180}>
                <div className="arch-panel-inset mt-4 p-4 flex items-start gap-3">
                    <IconLock width={16} height={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--arch-accent)' }} />
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--arch-text-dim)' }}>
                        The sandbox host is never exposed to the public internet directly — only reachable from the backend box.
                        Sandboxed code itself runs as a dedicated non-root UID under <span className="arch-mono">--cap-drop=ALL</span>,
                        with only <span className="arch-mono">SETUID / SETGID / CHOWN / DAC_OVERRIDE</span> added back — the minimum
                        needed to manage per-conversation workspace ownership, nothing more.
                    </p>
                </div>
            </Reveal>

            <div className="mt-5 flex flex-wrap gap-2">
                <Tag>two purpose-built boxes, not a cluster</Tag>
                <Tag>versioned rollback, not just the latest tag</Tag>
                <Tag tone="accent">tests gate every deploy</Tag>
            </div>
        </Section>
    );
}
