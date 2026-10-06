import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconMcp, IconLock, IconBolt } from './icons';

const TRANSPORTS = [
    { name: 'stdio', note: 'local process' },
    { name: 'SSE', note: 'server-sent events' },
    { name: 'Streamable HTTP', note: 'the modern transport' },
];

const SERVERS = ['github', 'filesystem', 'postgres', 'notion', 'linear', 'slack', 'sentry', 'stripe'];

export function MCP() {
    return (
        <Section id="mcp">
            <SectionHead
                index={5}
                eyebrow="MCP integration"
                title="Bring your own servers; the agent grows new tools."
                lede="Connect external tool servers over stdio, SSE, or Streamable HTTP. Authenticate with OAuth 2.1 — auto-discovery plus PKCE — or with API-key headers. Each connection is isolated per user, and its tools are converted to LangChain tools the moment they're needed."
            />

            <div className="mt-10 grid lg:grid-cols-3 gap-4">
                <Reveal>
                    <div className="arch-panel p-5 h-full">
                        <IconMcp style={{ color: 'var(--arch-accent)' }} />
                        <h3 className="text-[14px] font-medium mt-3" style={{ color: 'var(--arch-text)' }}>Three transports</h3>
                        <div className="mt-3 space-y-2">
                            {TRANSPORTS.map((t) => (
                                <div key={t.name} className="arch-panel-inset flex items-center justify-between px-3 py-2">
                                    <span className="arch-mono text-[12.5px]" style={{ color: 'var(--arch-text)' }}>{t.name}</span>
                                    <span className="text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>{t.note}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>

                <Reveal delay={70}>
                    <div className="arch-panel p-5 h-full">
                        <IconLock style={{ color: 'var(--arch-accent)' }} />
                        <h3 className="text-[14px] font-medium mt-3" style={{ color: 'var(--arch-text)' }}>Auth, handled</h3>
                        <p className="text-[13px] leading-relaxed mt-2" style={{ color: 'var(--arch-text-dim)' }}>
                            OAuth 2.1 with automatic authorization-server discovery and a PKCE
                            code-exchange flow — or a plain API-key header when that's all a server needs.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            <Tag tone="accent">OAuth 2.1</Tag>
                            <Tag>PKCE</Tag>
                            <Tag>API-key headers</Tag>
                            <Tag>per-user isolation</Tag>
                        </div>
                    </div>
                </Reveal>

                <Reveal delay={140}>
                    <div className="arch-panel p-5 h-full flex flex-col">
                        <IconBolt style={{ color: 'var(--arch-accent)' }} />
                        <h3 className="text-[14px] font-medium mt-3" style={{ color: 'var(--arch-text)' }}>Tools appear at runtime</h3>
                        <p className="text-[13px] leading-relaxed mt-2 flex-1" style={{ color: 'var(--arch-text-dim)' }}>
                            Connected servers' tools are cached with a 5-minute TTL, so the agent
                            gains them without a network round-trip on every turn.
                        </p>
                        <div className="mt-4 overflow-hidden" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
                            <div className="arch-marquee-track gap-2">
                                {[...SERVERS, ...SERVERS].map((s, i) => (
                                    <span key={i} className="arch-mono text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap" style={{ border: '1px solid var(--arch-line)', color: 'var(--arch-text-dim)', background: 'var(--arch-bg-inset)' }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </Section>
    );
}
