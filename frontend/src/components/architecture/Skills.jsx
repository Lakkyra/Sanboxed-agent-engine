import { useState } from 'react';
import { Section, SectionHead, Reveal, Tag } from './primitives';
import { IconSkills, IconArrowRight } from './icons';

const SKILLS = [
    { name: 'create-pptx', desc: 'Compose a structured slide deck from an outline.' },
    { name: 'spreadsheet-analyst', desc: 'Normalize messy tabular data before analysis.' },
    { name: 'web-research', desc: 'Multi-source research with citations.' },
];

const MANUAL = `---
name: spreadsheet-analyst
description: Normalize messy tabular data before analysis.
triggers: [csv, xlsx, dedupe, missing values, normalize]
---

## When to use
Reach for this before any analysis when the input
is a raw export you did not produce yourself.

## Procedure
1. Profile column types + null density with pandas.
2. Coerce dtypes; parse dates to ISO-8601.
3. Drop exact-duplicate rows; flag fuzzy dupes.
4. Impute or annotate missing values explicitly.
...`;

export function Skills() {
    const [loaded, setLoaded] = useState(false);

    return (
        <Section id="skills">
            <SectionHead
                index={4}
                eyebrow="Skills"
                title="Manuals the agent opens on demand — not stuffed into every prompt."
                lede="Skills are markdown documents with YAML frontmatter, mirroring Anthropic's Claude Skills. The agent sees only names and descriptions until it decides a task needs one — then it loads the full body. Two levels, minimal context tax."
            />

            <Reveal delay={80}>
                <div className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)] gap-4 items-stretch">
                    {/* Level 1: the index */}
                    <div className="arch-panel p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>list_skills()</span>
                            <Tag>level 1 · cheap</Tag>
                        </div>
                        <div className="space-y-2">
                            {SKILLS.map((s) => {
                                const isTarget = s.name === 'spreadsheet-analyst';
                                return (
                                    <button
                                        key={s.name}
                                        onClick={() => isTarget && setLoaded(true)}
                                        className="arch-panel-inset arch-lift w-full text-left flex items-center gap-3 px-3 py-2.5"
                                        style={isTarget && loaded ? { borderColor: 'var(--arch-accent-line)' } : undefined}
                                    >
                                        <IconSkills width={16} height={16} style={{ color: isTarget ? 'var(--arch-accent)' : 'var(--arch-text-dim)' }} />
                                        <div className="min-w-0">
                                            <div className="arch-mono text-[12.5px] truncate" style={{ color: 'var(--arch-text)' }}>{s.name}</div>
                                            <div className="text-[11.5px] truncate" style={{ color: 'var(--arch-text-faint)' }}>{s.desc}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11.5px] mt-3" style={{ color: 'var(--arch-text-faint)' }}>
                            Built-ins live on disk; user skills live in MongoDB.
                        </p>
                    </div>

                    {/* connector */}
                    <div className="flex lg:flex-col items-center justify-center gap-2">
                        <button
                            onClick={() => setLoaded(true)}
                            className="arch-mono text-[10px] px-2.5 py-1.5 rounded-full flex items-center gap-1.5 arch-lift"
                            style={{ border: '1px solid var(--arch-accent-line)', color: 'var(--arch-accent-bright)', background: 'var(--arch-accent-wash)' }}
                        >
                            load_skill
                            <IconArrowRight width={13} height={13} className="hidden lg:block" />
                            <IconArrowRight width={13} height={13} className="lg:hidden rotate-90" />
                        </button>
                    </div>

                    {/* Level 2: the loaded body */}
                    <div className="arch-panel p-5 relative overflow-hidden" style={loaded ? { borderColor: 'var(--arch-accent-line)' } : undefined}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="arch-mono text-[11px]" style={{ color: 'var(--arch-text-faint)' }}>load_skill(&quot;spreadsheet-analyst&quot;)</span>
                            <Tag tone={loaded ? 'accent' : 'default'}>level 2 · full body</Tag>
                        </div>
                        {loaded ? (
                            <pre className="arch-mono text-[11px] leading-[1.6] whitespace-pre-wrap timeline-node-in" style={{ color: 'var(--arch-text-dim)' }}>
                                {MANUAL}
                            </pre>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center gap-2">
                                <IconSkills width={26} height={26} style={{ color: 'var(--arch-text-faint)' }} />
                                <p className="text-[12.5px] max-w-[16rem]" style={{ color: 'var(--arch-text-faint)' }}>
                                    Body stays out of context until loaded. Pick a skill on the left to pull its manual in.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Reveal>
        </Section>
    );
}
