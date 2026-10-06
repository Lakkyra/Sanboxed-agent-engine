
export const ConversationItem = ({ conversation, isActive, onClick, onDelete }) => {
    return (
        <div
            className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group border ${isActive
                ? 'bg-gradient-to-r from-primary-600/80 to-secondary-600/80 text-white border-white/20 shadow-lg'
                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5 text-slate-300'
                }`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                        {conversation.title || 'New Conversation'}
                    </h3>
                    <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                        {new Date(conversation.created_at).toLocaleDateString()}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conversation.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:backdrop-blur-md ${isActive ? 'text-white hover:bg-red-500/80' : 'text-red-400 hover:bg-red-500/20'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
