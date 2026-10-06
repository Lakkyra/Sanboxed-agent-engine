import { useState } from 'react';
import { memo } from 'react';

// Conversations may or may not carry a timestamp depending on how they were
// created. Grouping is purely presentational, so it degrades gracefully: if we
// can't read a date off any conversation, everything lands in one "Recent"
// group and the list looks exactly as it did before, just restyled.
function bucketFor(conv) {
    const raw = conv.updated_at || conv.created_at || conv.last_message_at;
    if (!raw) return null;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const diffDays = Math.floor((startOfToday.getTime() - t) / dayMs);

    if (t >= startOfToday.getTime()) return 'Today';
    if (diffDays < 1) return 'Yesterday';
    if (diffDays < 7) return 'Previous 7 days';
    if (diffDays < 30) return 'Previous 30 days';
    return 'Older';
}

const ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older', 'Recent'];

function groupConversations(conversations) {
    const groups = new Map();
    for (const conv of conversations) {
        const label = bucketFor(conv) || 'Recent';
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(conv);
    }
    return ORDER.filter(l => groups.has(l)).map(label => ({ label, items: groups.get(label) }));
}

// Memoized: sidebar content doesn't need to reflect the actively-streaming
// message, so it should skip the re-render storm during generation as long
// as its own props (conversations, selection, stable callbacks) don't change.
const ConversationSidebarComponent = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onDeleteConversation,
    onRenameConversation
}) => {
    // id of the conversation currently being renamed inline, plus its draft
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState('');

    const startRename = (e, conv) => {
        e.stopPropagation();
        e.preventDefault();
        setEditingId(conv.id);
        setDraft(conv.title || '');
    };

    const commitRename = (conv) => {
        const next = draft.trim();
        setEditingId(null);
        // No-op if unchanged or emptied — don't spend a request, and never
        // let a blank title through (the server rejects it with a 422 anyway).
        if (!next || next === conv.title) return;
        onRenameConversation(conv.id, next);
    };
    if (!conversations || conversations.length === 0) {
        return (
            <div className="px-3 py-8 text-center">
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    No conversations yet
                </p>
            </div>
        );
    }

    const handleDelete = (e, conv) => {
        e.stopPropagation();
        e.preventDefault();

        const title = conv.title || 'this conversation';
        if (window.confirm(`Delete "${title}"?`)) {
            console.log('Deleting conversation:', conv.id);
            onDeleteConversation(conv.id);
        }
    };

    const groups = groupConversations(conversations);

    return (
        <div className="py-1">
            {groups.map((group) => (
                <div key={group.label}>
                    <div
                        className="text-[11px] font-semibold uppercase tracking-[0.05em] px-2 pt-3.5 pb-1.5"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {group.label}
                    </div>

                    {group.items.map((conv) => {
                        const isActive = currentConversationId === conv.id;
                        return (
                            <div
                                key={conv.id}
                                className="group relative flex items-center gap-1 px-2.5 py-[7px] rounded-[9px] text-[13.5px] transition-colors cursor-pointer"
                                style={{
                                    backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                                    border: `1px solid ${isActive ? 'var(--border-color)' : 'transparent'}`,
                                    boxShadow: isActive ? 'var(--shadow-1)' : 'none',
                                    fontWeight: isActive ? 500 : 400,
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {isActive && (
                                    <span
                                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r"
                                        style={{ backgroundColor: 'var(--accent)' }}
                                    />
                                )}

                                {editingId === conv.id ? (
                                    <input
                                        autoFocus
                                        value={draft}
                                        maxLength={200}
                                        onChange={(e) => setDraft(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={() => commitRename(conv)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); commitRename(conv); }
                                            if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                                        }}
                                        className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] rounded-[6px] px-1 py-0.5"
                                        style={{
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--accent)',
                                        }}
                                    />
                                ) : (
                                    <button
                                        onClick={() => onSelectConversation(conv)}
                                        onDoubleClick={(e) => startRename(e, conv)}
                                        className="flex-1 text-left truncate min-w-0"
                                        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                                        title={conv.title || 'New conversation'}
                                    >
                                        {conv.title || 'New conversation'}
                                    </button>
                                )}

                                {editingId !== conv.id && (
                                    <button
                                        onClick={(e) => startRename(e, conv)}
                                        className="p-1 rounded-md flex-none transition-all opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)]"
                                        style={{ color: 'var(--text-tertiary)' }}
                                        title="Rename"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                                            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" />
                                        </svg>
                                    </button>
                                )}

                                <button
                                    onClick={(e) => handleDelete(e, conv)}
                                    className="p-1 rounded-md flex-none transition-all opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)]"
                                    style={{ color: 'var(--text-tertiary)' }}
                                    title="Delete"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export const ConversationSidebar = memo(ConversationSidebarComponent);
