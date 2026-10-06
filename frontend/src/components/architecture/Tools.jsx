import { Section, SectionHead, Reveal, Tag } from './primitives';
import {
    IconPython, IconShell, IconEdit, IconImage, IconSkills,
    IconRag, IconDrive, IconMcp, IconFileText,
} from './icons';

const TOOLS = [
    {
        name: 'sandbox_run_python',
        icon: IconPython,
        desc: 'Executes Python inside the user\'s own virtualenv. pip installs stay isolated per user; real wall-clock timeouts and output caps keep runaway code contained.',
        tags: ['sandboxed venv', 'timeout + caps'],
        always: true,
    },
    {
        name: 'sandbox_run_shell',
        icon: IconShell,
        desc: 'A shell scoped to the workspace root. Every call passes through a centralized guardrail hook first — path-escape attempts and destructive command patterns are blocked before anything runs.',
        tags: ['escape-guarded'],
        always: true,
    },
    {
        name: 'sandbox_edit_file',
        icon: IconEdit,
        desc: 'Surgical old → new text replacement on existing files, reporting +added / −removed lines — instead of rewriting a whole file and risking silent drift.',
        tags: ['diff-based'],
    },
    {
        name: 'sandbox_analyze_image',
        icon: IconImage,
        desc: 'A vision sub-call: loads an image and answers questions about it. Works on uploads and on images the agent itself generates — render a chart, then look at it to self-verify.',
        tags: ['self-verification'],
    },
    {
        name: 'sandbox_read_file_natively',
        icon: IconFileText,
        desc: 'Reads a file the way the model itself understands it best — PDFs and images go in as native multimodal input instead of a lossy text dump.',
        tags: ['multimodal input'],
        always: true,
    },
    {
        name: 'list_skills · load_skill',
        icon: IconSkills,
        desc: 'Discovery and retrieval for the skills library. The agent browses names + descriptions, then pulls a full manual into context only when it decides the task needs it.',
        tags: ['two-level'],
        always: true,
    },
    {
        name: 'knowledge base search',
        icon: IconRag,
        desc: 'Semantic retrieval over the user\'s ingested documents from the Qdrant vector store, grounding answers in real source chunks rather than the model\'s memory.',
        tags: ['RAG', 'Qdrant'],
    },
    {
        name: 'Google Drive',
        icon: IconDrive,
        desc: 'Reads and pulls content from connected Drive documents, brought in per user through an authenticated native integration.',
        tags: ['native'],
    },
    {
        name: 'connected MCP tools',
        icon: IconMcp,
        desc: 'Whatever tools the user\'s connected MCP servers expose, converted to first-class agent tools at runtime and cached with a 5-minute TTL.',
        tags: ['dynamic'],
    },
];

function ToolCard({ tool, i }) {
    const Icon = tool.icon;
    return (
        <Reveal delay={(i % 4) * 60}>
            <div className="arch-panel arch-lift h-full p-5 flex flex-col">
                <div className="flex items-start justify-between">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--arch-bg-inset)', border: '1px solid var(--arch-line)', color: 'var(--arch-accent)' }}
                    >
                        <Icon />
                    </div>
                    {tool.always && <Tag tone="accent">always on</Tag>}
                </div>
                <h3 className="arch-mono text-[14px] mt-4" style={{ color: 'var(--arch-text)' }}>
                    {tool.name}
                </h3>
                <p className="text-[13px] leading-relaxed mt-2 flex-1" style={{ color: 'var(--arch-text-dim)' }}>
                    {tool.desc}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                    {tool.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                </div>
            </div>
        </Reveal>
    );
}

export function Tools() {
    return (
        <Section id="tools">
            <SectionHead
                index={2}
                eyebrow="Tools ecosystem"
                title="A flat toolbelt, rebuilt every turn."
                lede="agent_node assembles one flat list each turn — always-on sandbox tools, skill discovery, the user's enabled native tools, and any live MCP tools — then binds them all to the model. agent_tool_node mirrors that exact map to execute the calls."
            />
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOOLS.map((t, i) => <ToolCard key={t.name} tool={t} i={i} />)}
            </div>
        </Section>
    );
}
