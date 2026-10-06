import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chat';
import { mcpServerService } from '../../services/mcpServer';
import { ragService } from '../../services/rag'; // Import RAG Service
import { userService } from '../../services/user';

import { RightPanel } from './RightPanel';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatWindow } from './ChatWindow';
import { MessageInput } from './MessageInput';
import { SettingsPanel } from '../settings/SettingsPanel';
import { ContextFileSelector } from './ContextFileSelector';
import { DocumentUploadModal } from './DocumentUploadModal';
import { IngestionStatusList } from './IngestionStatusList';
import { VoiceWidget } from './VoiceWidget';

export const ChatPage = () => {
    const { conversations, currentConversation, setCurrentConversation, messages, setMessages, clearMessages, selectedMcpServers, toggleMcpServer, selectedModel, setSelectedModel, selectedTools, setSelectedTools, deleteConversation, renameConversation } = useChat();
    const { isDark, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [mcpServers, setMcpServers] = useState([]);
    const abortControllerRef = useRef(null);
    const voiceWidgetRef = useRef(null);
    // VoiceWidget renders nothing itself (see its own top-of-file comment) —
    // it reports status here via onStatusChange, and this gets handed
    // straight through to MessageInput, which renders it INSIDE the same
    // compact input bar used for typing (live transcript / "Listening…" /
    // "Processing…" / "AgentX is speaking…" as the bar's content, one
    // consolidated Stop control) rather than a separate floating pill.
    const [voiceStatus, setVoiceStatus] = useState(null);
    // useCallback: all four are passed into the memoized MessageInput (see
    // its own top-of-file comment) — voiceWidgetRef itself is stable, so
    // these have no real dependencies, but inline arrows here would still
    // hand MessageInput a new function identity on every ChatPage render.
    const handleOpenVoiceMode = useCallback(() => {
        voiceWidgetRef.current?.open();
    }, []);
    const handleVoiceToggleRecording = useCallback(() => {
        voiceWidgetRef.current?.toggleRecording();
    }, []);
    const handleVoiceStop = useCallback(() => {
        voiceWidgetRef.current?.stop();
    }, []);
    const handleVoiceEndSession = useCallback(() => {
        voiceWidgetRef.current?.endSession();
    }, []);

    // Credit usage/cap for the header pill — null only while loading.
    // Admins are exempt from the cap (see credit_service.py, unchanged —
    // this is a display-only difference): the pill still shows their spend
    // so it's not entirely invisible, just without a "/ $5" cap that would
    // imply a limit that doesn't actually apply to them.
    const [credits, setCredits] = useState(null);
    const refreshCredits = useCallback(async () => {
        try {
            const data = await userService.getCredits();
            setCredits(data);
        } catch {
            // Best-effort UI nicety — never block or error the chat over this.
        }
    }, []);
    useEffect(() => { refreshCredits(); }, [refreshCredits]);

    // Cancel an in-progress generation. Two independent things happen: abort
    // this tab's own fetch (instant local UI feedback — stops rendering
    // incoming events right away) AND tell the backend to actually cancel
    // the turn (chatService.stopGeneration) — necessary now that generation
    // runs as a detached background task (see turn_manager on the backend)
    // rather than being tied to this fetch; aborting the fetch alone no
    // longer stops the agent, it just stops THIS tab from watching it.
    // useCallback: passed as a prop to MessageInput — without a stable
    // identity it'd force MessageInput to re-render on every ChatPage render
    // (including every streamed token), same issue as onOpenArtifact below.
    const handleStopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (currentConversation?.id) {
            chatService.stopGeneration(currentConversation.id).catch((err) => {
                console.error('Failed to stop generation server-side:', err);
            });
        }
    }, [currentConversation]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);



    // RAG State
    const [isRagEnabled, setIsRagEnabled] = useState(false);
    const [contextFiles, setContextFiles] = useState([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    // Transient notice shown above the sidebar's Knowledge base card — e.g.
    // "Upload cancelled" — since closing the upload modal mid-upload used to
    // give zero feedback that the cancel actually registered.
    const [uploadNotice, setUploadNotice] = useState(null); // { message: string } | null

    // Right Panel State
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [rightPanelContent, setRightPanelContent] = useState(null); // { type, title, data }

    const [fileListVersion, setFileListVersion] = useState(0); // For refreshing the list

    const { conversationId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (conversationId) {
            if (currentConversation?.id !== conversationId) {
                const existing = conversations?.find(c => c.id === conversationId);
                const conv = existing || { id: conversationId };
                setCurrentConversation(conv);
                loadMessages(conversationId);
            }
        } else {
            if (currentConversation) {
                setCurrentConversation(null);
                clearMessages();
            }
        }
    }, [conversationId]);

    const loadMessages = async (id) => {
        setLoading(true);
        try {
            const data = await chatService.getMessages(id);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages:', error);
            setMessages([]);
        } finally {
            setLoading(false);
        }

        // The persisted history above never includes an in-progress turn
        // (it's only saved once the turn finishes) — so a reload landing on
        // a conversation whose generation is still running shows nothing
        // for it unless we explicitly check and reattach.
        try {
            const active = await chatService.checkActiveTurn(id);
            if (active) {
                await resumeGeneration(id);
            }
        } catch (error) {
            console.error('Failed to check/resume active turn:', error);
        }
    };

    // Reattaches to a turn that's already running (see loadMessages above).
    // Mirrors handleSendMessage's streaming plumbing but doesn't send
    // anything new — it just appends a fresh "live" assistant message and
    // feeds it from wherever the backend's turn_manager currently is,
    // replaying everything already generated before continuing live.
    const resumeGeneration = async (id) => {
        setMessages((prev) => [...prev, {
            role: 'assistant',
            content: '',
            timeline: [],
            timestamp: new Date().toISOString(),
            streaming: true,
        }]);
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            await chatService.resumeStream(id, (event) => handleStreamEvent(event), controller.signal);
            setMessages((prev) => {
                const updated = [...prev];
                // Must produce a NEW object (not mutate the existing one) — Message
                // is React.memo'd and compares the `message` prop by reference. An
                // in-place `delete` leaves the same object reference in the array,
                // so memo sees "unchanged" and never re-renders away the "working…"
                // shimmer, even though the turn actually finished (confirmed live).
                const { streaming, ...rest } = updated[updated.length - 1];
                updated[updated.length - 1] = rest;
                return updated;
            });
        } catch (error) {
            const stopped = error?.name === 'AbortError';
            // Narrow race: the turn finished between checkActiveTurn and this
            // call landing — nothing to resume, but the real completed
            // message is already persisted. Drop the empty placeholder and
            // just re-fetch history instead of showing a scary error for
            // something that actually succeeded.
            if (error?.message === 'No active generation to resume.') {
                setMessages((prev) => prev.slice(0, -1));
                await loadMessages(id);
                return;
            }
            if (!stopped) console.error('Failed to resume generation:', error);
            setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = { ...updated[updated.length - 1] };
                if (lastMsg.role === 'assistant') {
                    if (stopped) {
                        lastMsg.stopped = true;
                        lastMsg.stop_reason = 'user_stop';
                    } else {
                        // A specific backend-provided message (e.g. the credit-cap
                        // block) is more useful than the generic fallback — and for
                        // the credit case, also surface it as a banner (reusing the
                        // existing upload-notice mechanism) since it's actionable,
                        // not just a "something went wrong" bubble.
                        lastMsg.content = lastMsg.content || error?.message || 'Sorry, I encountered an error. Please try again.';
                        lastMsg.error = true;
                        if (error?.code === 'credit_limit_reached') {
                            setUploadNotice({ message: error.message });
                        }
                    }
                    delete lastMsg.streaming;
                    updated[updated.length - 1] = lastMsg;
                }
                return updated;
            });
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
            refreshCredits(); // a turn just spent money either way (success, error, or stop)
        }
    };

    useEffect(() => {
        loadMcpServers();
    }, []);

    const loadMcpServers = async () => {
        try {
            const data = await mcpServerService.getServers();
            const transformedData = data.map(server => ({
                ...server,
                id: server._id
            }));
            setMcpServers(transformedData);
        } catch (error) {
            console.error('Failed to load MCP servers:', error);
        }
    };

    const handleSelectConversation = useCallback((conversation) => {
        navigate(`/chat/${conversation.id}`);
    }, [navigate]);

    const handleNewConversation = useCallback(() => {
        navigate('/chat');
    }, [navigate]);

    // Appends to a chronologically-ordered timeline (narration text interleaved
    // with tool calls/skills/artifacts in the order they actually happened) —
    // mirrors services/chat_service.py's server-side timeline builder exactly,
    // so the live view and a reloaded conversation render identically.
    // useCallback: pure function of its arguments, stable identity so
    // handleStreamEvent (which closes over it) can also stay stable.
    const appendTimelineEvent = useCallback((timeline, event) => {
        const tl = [...timeline];
        if (event.type === 'text') {
            const last = tl[tl.length - 1];
            if (last && last.type === 'text') {
                tl[tl.length - 1] = { ...last, content: last.content + event.content };
            } else {
                tl.push({ type: 'text', content: event.content });
            }
        } else if (event.type === 'tool_call') {
            tl.push({ type: 'tool', ...event.data, status: 'running' });
        } else if (event.type === 'tool_output') {
            for (let i = tl.length - 1; i >= 0; i--) {
                if (tl[i].type === 'tool' && tl[i].name === event.data.name && tl[i].status === 'running') {
                    tl[i] = { ...tl[i], ...event.data, status: 'completed' };
                    break;
                }
            }
        } else if (event.type === 'skill_used') {
            tl.push({ type: 'skill', ...event.data });
        } else if (event.type === 'artifact_created') {
            tl.push({ type: 'artifact', ...event.data });
        } else if (event.type === 'files_created') {
            tl.push({ type: 'files_created', files: event.data });
        } else if (event.type === 'exec_output') {
            for (let i = tl.length - 1; i >= 0; i--) {
                if (tl[i].type === 'tool' && tl[i].status === 'running' && tl[i].name === event.data.tool) {
                    tl[i] = { ...tl[i], exec_output: [...(tl[i].exec_output || []), event.data] };
                    break;
                }
            }
        }
        return tl;
    }, []);

    const handleStreamEvent = useCallback((event) => {
        // NOTE: deliberately NOT wrapped in flushSync. This used to force a
        // synchronous, unbatched, full-tree re-render on EVERY single event —
        // fine for occasional text chunks, but exec_output (run_python/
        // run_shell streaming stdout) can fire hundreds or thousands of times
        // in a fast burst (e.g. a script iterating many files). flushSync'ing
        // every one of those hammered the main thread with back-to-back
        // blocking renders and froze the whole tab, not just this panel's
        // scrolling (confirmed live). Plain setState lets React 18's
        // automatic batching coalesce a rapid burst into far fewer renders,
        // which is what we actually want here — still feels live, just
        // doesn't block the browser.
        //
        // 'stopped' is handled separately from the timeline reducer below —
        // it's a terminal marker (server-side cancellation, via the Stop
        // button or a stop issued from another tab), not a piece of
        // rendered content, so it just flags the message and clears
        // `streaming` instead of going through appendTimelineEvent.
        // The real Mongo _id of the message just streamed. Without stamping
        // it on, the action bar (rate / retry) stays hidden until a reload.
        if (event.type === 'persisted') {
            setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                const lastMsg = { ...updated[lastIndex] };
                if (lastMsg.role === 'assistant') {
                    lastMsg._id = event.message_id;
                    updated[lastIndex] = lastMsg;
                }
                return updated;
            });
            return;
        }

        if (event.type === 'stopped') {
            setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                const lastMsg = { ...updated[lastIndex] };
                if (lastMsg.role === 'assistant') {
                    lastMsg.stopped = true;
                    lastMsg.stop_reason = event.reason || 'user_stop';
                    if (event.message_id) lastMsg._id = event.message_id;
                    delete lastMsg.streaming;
                    updated[lastIndex] = lastMsg;
                }
                return updated;
            });
            return;
        }

        setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            const lastMsg = { ...updated[lastIndex] };
            if (lastMsg.role === 'assistant') {
                lastMsg.timeline = appendTimelineEvent(lastMsg.timeline || [], event);

                // Keep the legacy grouped fields in sync too — some other
                // code (e.g. RightPanel openers) still reads message.content
                // directly for things like copy-to-clipboard of the final text.
                if (event.type === 'text') {
                    lastMsg.content += event.content;
                } else if (event.type === 'files_created') {
                    lastMsg.files_created = [...(lastMsg.files_created || []), ...event.data];
                }

                updated[lastIndex] = lastMsg;
            }
            return updated;
        });
    }, [appendTimelineEvent, setMessages]);

    // useCallback: passed to MessageInput/ChatWindow — its dependency list
    // deliberately excludes `messages`, so this identity stays stable across
    // an entire streaming burst (every token would otherwise force
    // MessageInput and every memoized Message to re-render, defeating
    // React.memo on both).
    const handleSendMessage = useCallback(async (message) => {
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            hasImages: uploadedImages.length > 0,
            attachments: uploadedImages.map(img => ({
                original_name: img.name || img.file?.name,
                mime_type: img.file?.type,
                sandbox_path: `uploads/${img.name || img.file?.name}`
            }))
        };
        setMessages((prev) => [...prev, userMessage]);

        const assistantMessage = {
            role: 'assistant',
            content: '',
            timeline: [],
            timestamp: new Date().toISOString(),
            streaming: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(true);
        const mcpServerIds = selectedMcpServers.map(s => s.id);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Auto-enable RAG tools if Toggle is ON
            let activeTools = [...selectedTools];
            if (isRagEnabled) {
                if (!activeTools.includes('search_knowledge_base')) activeTools.push('search_knowledge_base');
                if (!activeTools.includes('read_document_page')) activeTools.push('read_document_page');
            }

            let response;
            const currentImages = [...uploadedImages];
            setUploadedImages([]); // Clear preview immediately

            if (currentImages.length > 0) {
                response = await chatService.sendMessageStreamMultimodal(
                    message,
                    currentConversation?.id,
                    mcpServerIds,
                    selectedModel,
                    currentImages,
                    activeTools,
                    contextFiles, // Pass selected files
                    (event) => handleStreamEvent(event),
                    controller.signal
                );
            } else {
                response = await chatService.sendMessageStream(
                    message,
                    currentConversation?.id,
                    mcpServerIds,
                    selectedModel,
                    activeTools,
                    contextFiles, // Pass selected files
                    (event) => handleStreamEvent(event),
                    controller.signal
                );
            }

            if (!currentConversation && response.conversation_id) {
                navigate(`/chat/${response.conversation_id}`, { replace: true });
            }

            setMessages((prev) => {
                const updated = [...prev];
                // See the identical comment in resumeGeneration — must be a new
                // object reference, not an in-place mutation, or the memoized
                // Message never re-renders away the "working…" shimmer.
                const { streaming, ...rest } = updated[updated.length - 1];
                updated[updated.length - 1] = rest;
                return updated;
            });
        } catch (error) {
            const stopped = error?.name === 'AbortError';
            if (!stopped) console.error('Failed to send message:', error);
            setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = { ...updated[updated.length - 1] };
                if (lastMsg.role === 'assistant') {
                    if (stopped) {
                        // Clean user-initiated stop — keep whatever streamed so far,
                        // just mark it as stopped rather than showing an error.
                        lastMsg.stopped = true;
                    } else {
                        // A specific backend-provided message (e.g. the credit-cap
                        // block) is more useful than the generic fallback — and for
                        // the credit case, also surface it as a banner (reusing the
                        // existing upload-notice mechanism) since it's actionable,
                        // not just a "something went wrong" bubble.
                        lastMsg.content = lastMsg.content || error?.message || 'Sorry, I encountered an error. Please try again.';
                        lastMsg.error = true;
                        if (error?.code === 'credit_limit_reached') {
                            setUploadNotice({ message: error.message });
                        }
                    }
                    delete lastMsg.streaming;
                    updated[updated.length - 1] = lastMsg;
                }
                return updated;
            });
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
            refreshCredits(); // a turn just spent money either way (success, error, or stop)
        }
    }, [uploadedImages, selectedMcpServers, selectedTools, isRagEnabled, currentConversation,
        contextFiles, selectedModel, navigate, handleStreamEvent, setMessages]);

    const handleUploadComplete = useCallback((result) => {
        console.log("File indexed:", result);
        setFileListVersion(prev => prev + 1); // Refresh user's file list
    }, []);

    // useCallback: passed to ChatWindow -> every Message — this was the
    // actual bug that silently defeated Message.jsx's React.memo. A new
    // inline function here every render meant every Message's shallow prop
    // comparison always saw "onOpenArtifact changed", so the WHOLE message
    // list still re-rendered on every streamed token even after memoizing
    // Message itself.
    const handleOpenArtifact = useCallback((content) => {
        setRightPanelContent(content);
        setIsRightPanelOpen(true);
    }, []);

    // useCallback with a dep list that deliberately excludes `messages`:
    // this is passed through ChatWindow into EVERY memoized Message, so an
    // unstable identity here would defeat React.memo across the whole list and
    // re-render all of it on every streamed token — the same bug documented on
    // handleOpenArtifact above. Reads the current messages via the setter's
    // callback instead of closing over them.
    const handleRetryMessage = useCallback(async (message) => {
        if (!message?._id) return;
        const conversationId = currentConversation?.id;
        if (!conversationId) return;

        // Drop the response being replaced and stand up a fresh streaming
        // placeholder in its place, so the stream handler (which always
        // targets the last message) writes into the right slot.
        setMessages((prev) => {
            const trimmed = prev.filter((m) => m._id !== message._id);
            return [...trimmed, {
                role: 'assistant',
                content: '',
                timeline: [],
                timestamp: new Date().toISOString(),
                streaming: true,
            }];
        });
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            await chatService.retryMessage(
                conversationId,
                message._id,
                {
                    model: selectedModel,
                    enabledTools: selectedTools,
                    mcpServerIds: selectedMcpServers.map((s) => s.id),
                    selectedFiles: contextFiles,
                },
                handleStreamEvent,
                controller.signal,
            );
        } catch (error) {
            const stopped = error?.name === 'AbortError';
            if (!stopped) console.error('Failed to retry message:', error);
            setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                const lastMsg = { ...updated[lastIndex] };
                if (lastMsg.role === 'assistant') {
                    if (stopped) {
                        lastMsg.stopped = true;
                    } else {
                        lastMsg.content = lastMsg.content || 'Sorry, I could not regenerate that response. Please try again.';
                    }
                    delete lastMsg.streaming;
                    updated[lastIndex] = lastMsg;
                }
                return updated;
            });
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [currentConversation, selectedModel, selectedTools, selectedMcpServers,
        contextFiles, handleStreamEvent, setMessages]);

    // useCallback: all three are passed into the memoized MessageInput, which
    // now owns the inline model/tools/RAG controls. Inline arrows here would
    // re-render the composer on every streamed token, exactly the bug the
    // memo wrapping exists to prevent.
    const handleToggleRag = useCallback(() => setIsRagEnabled(prev => !prev), []);
    const handleOpenKnowledgeUpload = useCallback(() => setIsUploadModalOpen(true), []);
    const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
    // Passed to IngestionStatusList — fires once per job the first time it's
    // observed as complete, so the file selector picks up the newly-indexed
    // file without the user needing to do anything (e.g. toggling RAG off/on).
    const handleIngestionJobCompleted = useCallback(() => setFileListVersion(v => v + 1), []);

    // Forces IngestionStatusList to poll immediately (and reset its idle
    // backoff) the moment a new upload starts — see DocumentUploadModal's
    // onUploadStarted. Without this, a fresh upload after a long idle period
    // could sit unreflected in the sidebar for up to MAX_IDLE_POLL_MS.
    const [ingestionKick, setIngestionKick] = useState(0);
    const handleUploadStarted = useCallback(() => setIngestionKick(k => k + 1), []);

    // Fires when the upload modal is dismissed mid-upload (see DocumentUploadModal's
    // handleCancel) — shows a brief notice above the Knowledge base card, then
    // clears itself so it doesn't linger indefinitely.
    // NOTE: this only stops the modal from watching — there's no backend
    // cancellation wired up for the ingestion pipeline, so the job keeps
    // running server-side regardless. IngestionStatusList below will still
    // show it progressing to Indexed/Failed; the wording here is
    // deliberately honest about that instead of implying it actually stopped.
    const handleUploadCancelled = useCallback((filename) => {
        setUploadNotice({
            message: filename
                ? `Closed — ${filename} is still processing in the background`
                : 'Closed — upload still processing in the background',
        });
        setTimeout(() => setUploadNotice(null), 5000);
    }, []);

    const conversationTitle = currentConversation?.title || 'New chat';

    return (
        <div className="h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* ───────── Sidebar ───────── */}
            <div
                className={`${isSidebarOpen ? 'w-[268px]' : 'w-0'} flex-shrink-0 transition-all duration-200 overflow-hidden`}
                style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
                <div className="w-[268px] h-full flex flex-col border-r" style={{ borderColor: 'var(--border-color)' }}>

                    {/* Brand + rail actions */}
                    <div className="px-3 pt-3.5 pb-2">
                        <div className="flex items-center justify-between px-1 pb-3.5">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 rounded-[8px] -ml-1 pl-1 pr-1.5 py-0.5 transition-colors hover:bg-[var(--hover-bg)]"
                                title="Go to AgentX home"
                            >
                                <img src="/logo-mark.png" alt="" className="w-6 h-6 object-contain flex-none" />
                                <span className="text-[14.5px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                                    AgentX
                                </span>
                            </button>

                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => navigate('/rag-test')}
                                    className="w-7 h-7 rounded-lg grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title="Test retrieval"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M9 3h6M10 3v6.5L5.5 18a2 2 0 001.7 3h9.6a2 2 0 001.7-3L14 9.5V3M7.5 15h9" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="w-7 h-7 rounded-lg grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title="Collapse sidebar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="16" rx="2.5" />
                                        <path d="M9.5 4v16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleNewConversation}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] border text-[13.5px] font-medium transition-all duration-150 hover:-translate-y-px"
                            style={{
                                backgroundColor: 'var(--surface)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)',
                                boxShadow: 'var(--shadow-1)'
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            New chat
                        </button>
                    </div>

                    {/* Conversations */}
                    <div className="flex-1 overflow-y-auto px-3 min-h-0">
                        <ConversationSidebar
                            conversations={conversations}
                            currentConversationId={currentConversation?.id}
                            onSelectConversation={handleSelectConversation}
                            onDeleteConversation={deleteConversation}
                            onRenameConversation={renameConversation}
                        />
                    </div>

                    {/* Knowledge base */}
                    <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <IngestionStatusList onJobCompleted={handleIngestionJobCompleted} kick={ingestionKick} />
                        {uploadNotice && (
                            <div
                                className="mb-2 flex items-center gap-2 rounded-[10px] border px-2.5 py-2 text-[11.5px]"
                                style={{
                                    backgroundColor: 'var(--surface-2)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 004.18 21h15.64a2 2 0 001.87-3.86l-8.18-14.18a2 2 0 00-3.42 0z" />
                                </svg>
                                <span className="truncate">{uploadNotice.message}</span>
                                <button
                                    onClick={() => setUploadNotice(null)}
                                    className="ml-auto flex-none w-4 h-4 grid place-items-center rounded hover:bg-[var(--hover-bg)]"
                                    title="Dismiss"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div
                            className="rounded-[12px] border px-3 py-2.5"
                            style={{
                                backgroundColor: 'var(--surface)',
                                borderColor: 'var(--border-color)',
                                boxShadow: 'var(--shadow-1)'
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 flex-none" style={{ color: isRagEnabled ? 'var(--accent)' : 'var(--text-tertiary)' }}
                                    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5zM8 3v18" />
                                </svg>
                                <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Knowledge base
                                </span>
                                <button
                                    onClick={handleOpenKnowledgeUpload}
                                    className="ml-auto w-6 h-6 rounded-md grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title="Upload a document"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M12 20V8m0 0l-4 4m4-4l4 4M4 5h16" />
                                    </svg>
                                </button>
                            </div>

                            {isRagEnabled ? (
                                <div className="mt-1.5 -mx-1">
                                    <ContextFileSelector
                                        key={fileListVersion} // forces re-mount to fetch latest files when bumped
                                        onSelectionChange={setContextFiles}
                                    />
                                </div>
                            ) : (
                                <p className="mt-1.5 text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                                    Turn on <span style={{ color: 'var(--text-secondary)' }}>Agentic RAG</span> in the composer to pick context files.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ───────── Main ───────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header
                    className="h-[53px] flex-none flex items-center gap-3 px-4 border-b relative z-20"
                    style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--glass)',
                        backdropFilter: 'blur(14px) saturate(140%)'
                    }}
                >
                    {!isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-8 h-8 rounded-lg grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Open sidebar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                                <path d="M9.5 4v16" />
                            </svg>
                        </button>
                    )}

                    <span className="text-[13.5px] font-medium tracking-[-0.015em] truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
                        {conversationTitle}
                    </span>

                    <span
                        className="hidden sm:flex items-center gap-1.5 text-[11.5px] rounded-full border px-2.5 py-[3px] flex-none"
                        style={{
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' }}
                        />
                        Sandbox ready
                    </span>

                    {credits && (
                        <span
                            className="hidden sm:flex items-center gap-1.5 text-[11.5px] rounded-full border px-2.5 py-[3px] flex-none"
                            title={
                                credits.is_admin
                                    ? `$${credits.used_usd.toFixed(2)} used this billing period — admin accounts aren't capped`
                                    : `$${credits.used_usd.toFixed(2)} of $${credits.cap_usd.toFixed(2)} free-tier credit used this billing period`
                            }
                            style={{
                                borderColor: 'var(--border-color)',
                                // Same badge shape as "Sandbox ready", but nudges toward a
                                // warning tone as usage approaches the cap instead of a flat
                                // color — the number is more useful than a hard on/off state.
                                // Admins have no cap to approach, so always the neutral tone.
                                backgroundColor: !credits.is_admin && credits.used_usd >= credits.cap_usd ? 'var(--danger-soft, #fee2e2)' : 'var(--surface)',
                                color: !credits.is_admin && credits.used_usd >= credits.cap_usd ? 'var(--danger, #dc2626)' : 'var(--text-secondary)'
                            }}
                        >
                            {credits.is_admin
                                ? `$${credits.used_usd.toFixed(2)} used`
                                : `$${credits.used_usd.toFixed(2)} / $${credits.cap_usd.toFixed(2)}`}
                        </span>
                    )}

                    <div className="flex-1" />

                    <button
                        onClick={toggleTheme}
                        className="w-8 h-8 rounded-lg grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                        style={{ color: 'var(--text-secondary)' }}
                        title={isDark ? 'Light mode' : 'Dark mode'}
                    >
                        {isDark ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={handleOpenSettings}
                        className="w-8 h-8 rounded-lg grid place-items-center transition-colors hover:bg-[var(--hover-bg)]"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Settings"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 003.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H8a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V8a1.6 1.6 0 001.5 1H22a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
                        </svg>
                    </button>

                    <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />

                    {/* Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[12px] font-semibold transition-transform active:scale-95"
                            style={{
                                background: 'linear-gradient(150deg, #7c6cf0, #4f46e5)',
                                color: 'white'
                            }}
                        >
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </button>

                        {isProfileOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                <div
                                    className="ax-pop absolute right-0 top-full mt-2 w-60 z-50 p-1.5"
                                >
                                    <div className="px-2.5 py-2 mb-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                            {user?.name || 'User'}
                                        </p>
                                        <p className="text-[11.5px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                                            {user?.email || ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            navigate('/profile');
                                        }}
                                        className="ax-pop-item text-[13px]"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        View profile
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await logout();
                                            navigate('/login');
                                        }}
                                        className="ax-pop-item text-[13px]"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        Log out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* Chat Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <ChatWindow
                        messages={messages}
                        loading={loading}
                        onOpenArtifact={handleOpenArtifact}
                        conversationId={currentConversation?.id}
                        onRetry={handleRetryMessage}
                    />

                    <div className="relative flex-none px-4 pb-4 pt-1">
                        {/* Ambient glow above the composer while full voice mode is
                            active — decorative only, matching the reference (voice
                            mode gets this; plain dictation deliberately doesn't, it's
                            a much smaller, one-shot action that doesn't warrant the
                            same "something is live" ambient treatment). Sized/positioned
                            to bleed up into the chat area above the input bar, not
                            confined inside it. pointer-events-none so it never
                            intercepts clicks on the messages behind it. */}
                        {voiceStatus?.active && (
                            <div
                                className="ax-voice-glow absolute left-1/2 pointer-events-none"
                                aria-hidden="true"
                            />
                        )}
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            disabled={loading}
                            isGenerating={loading}
                            onStop={handleStopGeneration}
                            uploadedImages={uploadedImages}
                            onImagesChange={setUploadedImages}
                            selectedModel={selectedModel}
                            onModelChange={setSelectedModel}
                            mcpServers={mcpServers}
                            selectedMcpServers={selectedMcpServers}
                            onToggleMcpServer={toggleMcpServer}
                            selectedTools={selectedTools}
                            onToolsChange={setSelectedTools}
                            isRagEnabled={isRagEnabled}
                            onToggleRag={handleToggleRag}
                            contextFileCount={contextFiles.length}
                            onOpenKnowledgeUpload={handleOpenKnowledgeUpload}
                            onOpenSettings={handleOpenSettings}
                            onOpenVoiceMode={handleOpenVoiceMode}
                            voiceStatus={voiceStatus}
                            onVoiceToggleRecording={handleVoiceToggleRecording}
                            onVoiceStop={handleVoiceStop}
                            onVoiceEndSession={handleVoiceEndSession}
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            {isRightPanelOpen && (
                <RightPanel
                    content={rightPanelContent}
                    onClose={() => setIsRightPanelOpen(false)}
                />
            )}

            {/* Settings Panel (Slidable) — kept as the deep-settings escape hatch;
                the per-turn controls (model, tools, MCP, RAG) now live inline in
                the composer. */}
            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                mcpServers={mcpServers}
                selectedMcpServers={selectedMcpServers}
                onToggleMcpServer={toggleMcpServer}
                selectedTools={selectedTools}
                onToolsChange={setSelectedTools}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
            />

            {/* Document Upload Modal */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onCancelled={handleUploadCancelled}
                onUploadComplete={() => {
                    setFileListVersion(v => v + 1);
                    if (!isRagEnabled) setIsRagEnabled(true);
                }}
                onUploadStarted={handleUploadStarted}
            />

            <VoiceWidget
                ref={voiceWidgetRef}
                conversationId={currentConversation?.id}
                selectedMcpServers={selectedMcpServers}
                selectedTools={selectedTools}
                isRagEnabled={isRagEnabled}
                onStatusChange={setVoiceStatus}
            />
        </div>
    );
};
