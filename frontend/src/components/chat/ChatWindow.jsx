import { useEffect, useRef, memo } from 'react';
import { Message } from './Message';

const ChatWindowComponent = ({ messages, loading, onOpenArtifact, conversationId, onRetry }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center px-6">
                    <div className="text-center max-w-lg mx-auto">
                        <img src="/logo-mark.png" alt="" className="w-12 h-12 object-contain mx-auto mb-5" />
                        <h1 className="text-[26px] font-semibold tracking-[-0.03em] mb-2.5" style={{ color: 'var(--text-primary)' }}>
                            What should we work on?
                        </h1>
                        <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            AgentX has a Python sandbox, your documents and your connected tools.
                            Ask a question, or hand it a task and watch each step as it runs.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto w-full py-6 px-4">
                    {messages.map((msg, index) => (
                        // Key by _id where we have one: retry swaps the last
                        // message for a new object at the same index, and a
                        // bare index key would make React reuse that DOM node,
                        // carrying the old message's action-bar state (an open
                        // dislike box, a lit-up rating) onto the new response.
                        <Message
                            key={msg._id || `idx-${index}`}
                            message={msg}
                            onOpenArtifact={onOpenArtifact}
                            conversationId={conversationId}
                            isLast={index === messages.length - 1}
                            onRetry={onRetry}
                        />
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 py-3 pl-[32px]">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-tertiary)' }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-tertiary)', animationDelay: '0.2s' }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-tertiary)', animationDelay: '0.4s' }} />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
    );
};

export const ChatWindow = memo(ChatWindowComponent);
