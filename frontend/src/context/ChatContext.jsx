import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const { user } = useAuth();

    // Initialize from localStorage
    const [selectedMcpServers, setSelectedMcpServers] = useState(() => {
        try {
            const saved = localStorage.getItem('selectedMcpServers_v2');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to parse selectedMcpServers_v2 from localStorage', e);
            return [];
        }
    });

    // Initialize selectedTools from localStorage (filter out old/invalid entries)
    const [selectedTools, setSelectedTools] = useState(() => {
        try {
            const saved = localStorage.getItem('selectedTools');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Filter out:
                // 1. Old mcp: prefixed entries
                // 2. Old Title Case entries (keep only snake_case)
                // Valid tool_ids are snake_case like: roll_dice, get_weather
                return parsed.filter(t =>
                    !t.startsWith('mcp:') &&
                    !t.includes(' ') && // Title Case has spaces
                    t === t.toLowerCase() // Must be lowercase
                );
            }
            return [];
        } catch (e) {
            console.error('Failed to parse selectedTools from localStorage', e);
            return [];
        }
    });

    // Initialize selectedModel from localStorage
    const [selectedModel, setSelectedModel] = useState(() => {
        const stored = localStorage.getItem('selectedModel');
        const validModels = ['antigravity/gemini-3.7-flash-medium'];
        if (stored && validModels.includes(stored)) {
            return stored;
        }
        return 'antigravity/gemini-3.7-flash-medium';
    });

    // Persist to localStorage whenever selection changes
    useEffect(() => {
        localStorage.setItem('selectedMcpServers_v2', JSON.stringify(selectedMcpServers));
    }, [selectedMcpServers]);

    useEffect(() => {
        localStorage.setItem('selectedTools', JSON.stringify(selectedTools));
    }, [selectedTools]);

    useEffect(() => {
        localStorage.setItem('selectedModel', selectedModel);
    }, [selectedModel]);

    // Load conversations when user state changes (e.g., after login)
    useEffect(() => {
        if (user) {
            loadConversations();
        } else {
            setConversations([]);
        }
    }, [user]);

    // useCallback below: `messages` lives in this context and changes on every
    // streamed token, so ChatProvider re-renders on every token regardless —
    // but without stable identities, every function here (and the `value`
    // object itself) would ALSO get a new reference on every one of those
    // re-renders, which cascades into every consumer's memoized children
    // (e.g. ConversationSidebar) losing their React.memo benefit during a
    // stream even though none of THEIR actual props changed.
    const loadConversations = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Transform _id to id for frontend compatibility
                const transformed = data.map(conv => ({
                    ...conv,
                    id: conv._id || conv.id
                }));
                setConversations(transformed);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }, []);


    const addMessage = useCallback((message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const renameConversation = useCallback(async (conversationId, title) => {
        // Optimistic: the sidebar updates immediately and rolls back if the
        // server rejects it (empty/too long, or not this user's conversation).
        let previous = null;
        setConversations(prev => prev.map(c => {
            if (c.id !== conversationId) return c;
            previous = c.title;
            return { ...c, title };
        }));
        setCurrentConversation(prev =>
            prev && prev.id === conversationId ? { ...prev, title } : prev
        );

        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title }),
            });
            if (!response.ok) throw new Error(`rename failed: ${response.status}`);
        } catch (error) {
            console.error('Failed to rename conversation:', error);
            if (previous !== null) {
                setConversations(prev => prev.map(c =>
                    c.id === conversationId ? { ...c, title: previous } : c
                ));
                setCurrentConversation(prev =>
                    prev && prev.id === conversationId ? { ...prev, title: previous } : prev
                );
            }
        }
    }, []);

    const deleteConversation = useCallback(async (conversationId) => {
        console.log('Deleting conversation:', conversationId);
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            console.log('Delete response status:', response.status);
            if (response.ok) {
                // Remove from local state
                setConversations(prev => prev.filter(c => c.id !== conversationId));
                // Clear current if deleted
                setCurrentConversation(prevConv => {
                    if (prevConv?.id === conversationId) {
                        setMessages([]);
                        return null;
                    }
                    return prevConv;
                });
                console.log('Conversation deleted successfully');
            } else {
                const errorData = await response.text();
                console.error('Delete failed:', response.status, errorData);
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    }, []);

    const toggleMcpServer = useCallback((server) => {
        if (!server) {
            setSelectedMcpServers([]);
            return;
        }

        setSelectedMcpServers((prev) => {
            const exists = prev.find(s => s.id === server.id);
            if (exists) {
                // Remove server from selection
                return prev.filter(s => s.id !== server.id);
            } else {
                // Add server to selection
                return [...prev, server];
            }
        });
    }, []);

    const value = useMemo(() => ({
        currentConversation,
        setCurrentConversation,
        messages,
        setMessages,
        addMessage,
        clearMessages,
        conversations,
        setConversations,
        deleteConversation,
        renameConversation,
        selectedMcpServers,
        toggleMcpServer,
        selectedModel,
        setSelectedModel,
        selectedTools,
        setSelectedTools,
    }), [currentConversation, messages, addMessage, clearMessages, conversations,
        deleteConversation, renameConversation, selectedMcpServers, toggleMcpServer, selectedModel, selectedTools]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
