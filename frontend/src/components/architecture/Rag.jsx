import { useInView } from './hooks';
import { Section, SectionHead, Reveal, Tag } from './primitives';

const STAGES = [
    { k: 'upload', label: 'Upload', detail: 'Drop in a PDF, doc, or dataset.' },
    { k: 'parse', label: 'Parse', detail: 'Extract text, tables & images — structure preserved.' },
    { k: 'chunk', label: 'Chunk', detail: 'Split into overlapping, retrievable passages.' },
    { k: 'embed', label: 'Embed → Qdrant', detail: 'Vectorize and index in the vector store.' },
    { k: 'retrieve', label: 'Retrieve', detail: 'Pull the top matching chunks to ground the answer.' },
];

export function Rag() {
    const [ref, inView] = useInView({ threshold: 0.35 });

    return (
        <Section id="rag">
            <SectionHead
                index={6}
                eyebrow="RAG pipeline"
                title="From a raw document to a grounded answer."
                lede="Uploads run asynchronously — the API hands back a job id immediately and streams progress. Web search runs alongside vector search so one failing source never sinks retrieval."
            />

            <Reveal delay={80}>
                <div ref={ref} className={`arch-panel mt-10 p-5 sm:p-8 ${inView ? 'is-in' : ''}`}>
                    <div className="w-full overflow-x-auto">
                        <div className="min-w-[640px]">
                            {/* connective track */}
                            <svg viewBox="0 0 1000 8" className="w-full h-2" preserveAspectRatio="none" aria-hidden="true">
                                <line x1="4" y1="4" x2="996" y2="4" stroke="var(--arch-line-strong)" strokeWidth="1" />
                                <line
                                    x1="4" y1="4" x2="996" y2="4"
                                    stroke="var(--arch-accent)" strokeWidth="1.5"
                                    className="arch-draw" style={{ '--len': 992 }}
                                />
                            </svg>

                            <div className="grid grid-cols-5 gap-3 -mt-1">
                                {STAGES.map((s, i) => (
                                    <div key={s.k} className="flex flex-col items-center text-center px-1">
                                        <div
                                            className="w-3 h-3 rounded-full -translate-y-1/2"
                                            style={{
                                                background: 'var(--arch-accent)',
                                                boxShadow: inView ? '0 0 10px var(--arch-accent)' : 'none',
                                                transition: `box-shadow .4s ${i * 0.18 + 0.4}s`,
                                            }}
                                        />
                                        <div className="arch-mono text-[10px] mb-2" style={{ color: 'var(--arch-text-faint)' }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </div>
                                        <div className="text-[13px] font-medium" style={{ color: 'var(--arch-text)' }}>{s.label}</div>
                                        <div className="text-[11.5px] leading-snug mt-1" style={{ color: 'var(--arch-text-dim)' }}>{s.detail}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-5 flex flex-wrap items-center gap-2" style={{ borderTop: '1px solid var(--arch-line)' }}>
                        <Tag tone="cool">Qdrant vector store</Tag>
                        <Tag>async job + polling</Tag>
                        <Tag>vector ∥ web search</Tag>
                        <Tag>fail-soft retrieval</Tag>
                    </div>
                </div>
            </Reveal>
        </Section>
    );
}
