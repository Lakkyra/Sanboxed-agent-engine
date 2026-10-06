// AgentX — Architecture showcase.
// Monospace/mono-numeral typography and the motion vocabulary are scoped
// under `.arch-root` (see architecture.css), but every color token is a
// direct alias onto the same design tokens the chat page and landing page
// use (src/index.css) — same palette, same light/dark toggle.
//
// The system is presented as an isometric, click-to-explore map
// (ArchitectureMap.jsx) — each independent service is its own box; clicking
// one opens the detail instead of the page being a long scroll of prose.

import { Link } from 'react-router-dom';
import '../components/architecture/architecture.css';
import { TopBar } from '../components/architecture/Nav';
import { Hero } from '../components/architecture/Hero';
import { ArchitectureMap } from '../components/architecture/ArchitectureMap';
import { IconArrowRight } from '../components/architecture/icons';

export const ArchitecturePage = () => {
    return (
        <div className="arch-root">
            <TopBar />

            <main className="max-w-6xl mx-auto px-5 md:px-8">
                <Hero />

                <section id="map" className="pb-16" style={{ scrollMarginTop: '90px' }}>
                    <div className="flex items-baseline gap-3 mb-3">
                        <span className="arch-eyebrow">The system, end to end</span>
                    </div>
                    <h2 className="arch-h text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold max-w-3xl">
                        Eight independent services. Click any one.
                    </h2>
                    <p className="mt-4 text-[15px] leading-relaxed max-w-2xl" style={{ color: 'var(--arch-text-dim)' }}>
                        This isn't one app on one server — it's a frontend, an agent-driven backend, an LLM
                        gateway, a document parser, an isolated code-execution host, and a managed data layer,
                        each independently deployable. Click a box for what it does, why it's built that way,
                        and what breaks if you skip it.
                    </p>

                    <div className="mt-10">
                        <ArchitectureMap />
                    </div>
                </section>

                {/* Closing CTA */}
                <section className="py-24 text-center">
                    <hr className="arch-rule mb-16" />
                    <h2 className="arch-h text-[clamp(1.8rem,4vw,3rem)] font-semibold max-w-2xl mx-auto">
                        Stop prompting a chatbot.
                        <br />
                        <span style={{ color: 'var(--arch-text-dim)' }}>Start delegating to an agent.</span>
                    </h2>
                    <div className="mt-9 flex items-center justify-center gap-3">
                        <Link
                            to="/chat"
                            className="arch-lift group inline-flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-lg"
                            style={{ background: 'var(--arch-accent)', color: 'var(--accent-ink)' }}
                        >
                            Open the workspace
                            <IconArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            to="/"
                            className="arch-lift inline-flex items-center text-[14px] font-medium px-6 py-3 rounded-lg"
                            style={{ border: '1px solid var(--arch-line-strong)', color: 'var(--arch-text)' }}
                        >
                            Back to home
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-10 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--arch-line)' }}>
                    <span className="arch-mono text-[11.5px]" style={{ color: 'var(--arch-text-faint)' }}>
                        AgentX · single ReAct agent · Graph Builder v3
                    </span>
                    <span className="arch-mono text-[11.5px]" style={{ color: 'var(--arch-text-faint)' }}>
                        LangGraph · FastAPI · Qdrant · OmniRoute → Gemini
                    </span>
                </footer>
            </main>
        </div>
    );
};

export default ArchitecturePage;
