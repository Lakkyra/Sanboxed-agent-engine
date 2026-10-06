import { useEffect, useRef, useState } from 'react';
import { useInView } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconPlugLink } from './icons';

// Interactive: the server column keeps "producing tokens" on its own timer
// regardless of the connected flag — that's the whole point being
// demonstrated. Only the client column reacts to connected/resuming.
export function TurnLifecycle() {
    const [ref, inView] = useInView({ threshold: 0.3 });
    const [connected, setConnected] = useState(true);
    const [resuming, setResuming] = useState(false);
    const [tokens, setTokens] = useState(0);
    const [bufferedWhileGone, setBufferedWhileGone] = useState(0);
    const timer = useRef(null);

    useEffect(() => {
        if (!inView) return;
        timer.current = setInterval(() => {
            setTokens((t) => t + 1);
            setBufferedWhileGone((b) => (connected ? 0 : b + 1));
        }, 320);
        return () => clearInterval(timer.current);
    }, [inView, connected]);

    const handleDisconnect = () => {
        setConnected(false);
        setBufferedWhileGone(0);
    };
    const handleResume = () => {
        setResuming(true);
        setTimeout(() => {
            setConnected(true);
            setResuming(false);
        }, 900);
    };

    return (
        <Section id="lifecycle">
            <SectionHead
                index={10}
                eyebrow="Turn lifecycle"
                title="Closing the tab doesn't stop the agent."
                lede="Generation isn't tied to your HTTP request. ChatService spawns the turn as a detached background task (turn_manager.py) and attaches your stream as its first viewer. Close the tab, and the task keeps running server-side — reload, or open a second tab, and it resumes: replays everything already published, then keeps streaming live."
            />

            <Reveal delay={80}>
                <div ref={ref} className="arch-panel mt-10 p-5 sm:p-8">
                    <div className="grid md:grid-cols-2 gap-5 items-stretch">
                        {/* Server side — always running, indifferent to viewers */}
                        <div className="arch-panel-inset p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--arch-accent)', boxShadow: '0 0 8px var(--arch-accent)' }} />
                                <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>server · _run_turn() (detached asyncio.Task)</span>
                            </div>
                            <div className="mt-3">
                                <span className="arch-num text-[1.6rem] font-semibold" style={{ color: 'var(--arch-text)' }}>{tokens}</span>
                                <span className="text-[12px] ml-1.5" style={{ color: 'var(--arch-text-faint)' }}>tokens generated</span>
                            </div>
                            <p className="text-[12.5px] mt-2 leading-relaxed" style={{ color: 'var(--arch-text-dim)' }}>
                                Runs whether or not anyone is watching. Only <span className="arch-mono">POST /chat/&#123;id&#125;/stop</span> actually cancels it.
                            </p>
                            <div className="mt-3 h-[18px]">
                                {!connected && (
                                    <p className="text-[11.5px] arch-mono" style={{ color: 'var(--arch-accent-bright)' }}>
                                        +{bufferedWhileGone} buffered by turn_manager while disconnected
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Client side — the thing you can actually click */}
                        <div className="arch-panel-inset p-5 flex flex-col" style={{ opacity: connected ? 1 : 0.55, transition: 'opacity .3s' }}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: connected ? 'var(--arch-accent)' : 'var(--arch-text-faint)', transition: 'background .3s' }} />
                                <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>
                                    your tab · {connected ? 'viewer attached' : resuming ? 'resuming…' : 'disconnected'}
                                </span>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-5">
                                <IconPlugLink width={30} height={30} style={{ color: connected ? 'var(--arch-accent)' : 'var(--arch-text-faint)', transition: 'color .3s' }} />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDisconnect}
                                    disabled={!connected}
                                    className="arch-mono text-[11px] px-2.5 py-1.5 rounded-md arch-lift flex-1 disabled:opacity-40 disabled:pointer-events-none"
                                    style={{ border: '1px solid var(--arch-line-strong)', color: 'var(--arch-text-dim)' }}
                                >
                                    close tab
                                </button>
                                <button
                                    onClick={handleResume}
                                    disabled={connected || resuming}
                                    className="arch-mono text-[11px] px-2.5 py-1.5 rounded-md arch-lift flex-1 disabled:opacity-40 disabled:pointer-events-none"
                                    style={{ border: '1px solid var(--arch-accent-line)', color: 'var(--arch-accent-bright)', background: 'var(--arch-accent-wash)' }}
                                >
                                    resume in a new tab
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Reveal>

            <div className="mt-5 flex flex-wrap gap-2">
                <Tag>GET /chat/&#123;id&#125;/resume</Tag>
                <Tag>GET /chat/&#123;id&#125;/active-turn</Tag>
                <Tag tone="accent">single-process by design — the turn dies if the container does</Tag>
            </div>
        </Section>
    );
}
