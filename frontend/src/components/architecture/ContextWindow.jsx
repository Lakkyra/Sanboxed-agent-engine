import { useInView } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';

const TOTAL_MESSAGES = 42;
const WINDOW = 30;
const BATCH = 10;

// A conversation long enough to have folded exactly one batch into the
// summary already, with the raw window still holding the most recent 30.
export function ContextWindow() {
    const [ref, inView] = useInView({ threshold: 0.3 });
    const dots = Array.from({ length: TOTAL_MESSAGES }, (_, i) => i);
    const cutoff = TOTAL_MESSAGES - WINDOW;

    return (
        <Section id="context">
            <SectionHead
                index={8}
                eyebrow="Context engineering"
                title="Compaction, not amnesia."
                lede="HistoryService keeps only the most recent 30 messages in the raw prompt — correct, but not unlimited. What ages out isn't dropped: ConversationSummaryService folds every batch of 10 aged-out messages into a running, word-capped summary that still rides along in the system prompt as its own section."
            />

            <Reveal delay={80}>
                <div ref={ref} className="arch-panel mt-10 p-5 sm:p-8">
                    <div className="flex items-center gap-[3px] flex-wrap">
                        {dots.map((i) => {
                            const inRawWindow = i >= cutoff;
                            return (
                                <span
                                    key={i}
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{
                                        background: inRawWindow ? 'var(--arch-accent)' : 'var(--arch-cool)',
                                        opacity: inView ? (inRawWindow ? 1 : 0.55) : 0,
                                        transition: `opacity .5s ${i * 0.014}s`,
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] arch-mono">
                        <span style={{ color: 'var(--arch-cool)' }}>● folded into summary, in batches of {BATCH}</span>
                        <span style={{ color: 'var(--arch-accent)' }}>● most recent {WINDOW} messages — sent raw</span>
                    </div>

                    <div className="mt-8 pt-6 grid sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--arch-line)' }}>
                        <div className="arch-panel-inset p-4">
                            <div className="text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--arch-text)' }}>Hard truncation</div>
                            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--arch-text-faint)' }}>
                                Everything before the window is simply gone. The agent has no idea a decision was made 60 messages ago.
                            </p>
                        </div>
                        <div className="arch-panel-inset p-4" style={{ borderColor: 'var(--arch-accent-line)' }}>
                            <div className="text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--arch-accent-bright)' }}>Compaction — what AgentX does</div>
                            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--arch-text-dim)' }}>
                                Aged-out messages are batched and summarized in the background, capped at 300 words, and folded back in as &quot;Earlier in this conversation.&quot;
                            </p>
                        </div>
                    </div>
                </div>
            </Reveal>

            <div className="mt-5 flex flex-wrap gap-2">
                <Tag>30-message raw window</Tag>
                <Tag>batched every 10, not per-turn</Tag>
                <Tag tone="accent">non-blocking background task</Tag>
            </div>
        </Section>
    );
}
