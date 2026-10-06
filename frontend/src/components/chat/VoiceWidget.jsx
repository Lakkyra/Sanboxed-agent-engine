// VoiceWidget — the LOGIC for the full speech-to-speech agent (session
// lifecycle, VoiceClient wiring, pushing turns into the shared chat). Owns
// no visible UI of its own at all — renders nothing, ever. Status is
// reported upward via onStatusChange, and MessageInput renders that status
// directly inside the SAME compact input bar used for typing (live
// transcript / "Listening…" / "Processing…" / "Claude is speaking…" as the
// bar's content, one consolidated Stop control), matching the reference
// product pattern the user pointed at — not a separate floating pill and
// not a separate expanded panel. ChatPage holds a ref and drives this
// component imperatively (open/toggleRecording/stop/endSession); it wires
// onStatusChange's payload straight through to MessageInput.
//
// Voice turns still get pushed into the SAME `messages` list the text
// composer uses (via useChat().addMessage) — that part is unchanged, only
// where the transient status/controls render has moved.
import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useChat } from '../../context/ChatContext';
import { VoiceClient } from '../../services/voiceClient';

const STATUS = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    READY: 'ready',
    RECORDING: 'recording',
    THINKING: 'thinking',
    SPEAKING: 'speaking',
    ERROR: 'error',
};

// Copy shown directly as the message bar's content while active — matches
// the reference's exact pattern ("Listening…" / "Processing…" / "Claude is
// speaking…" inside the same compact bar, not a separate panel).
const STATUS_LABEL = {
    [STATUS.CONNECTING]: 'Connecting…',
    [STATUS.READY]: 'Tap the mic to talk',
    [STATUS.RECORDING]: 'Listening…',
    [STATUS.THINKING]: 'Processing…',
    [STATUS.SPEAKING]: 'AgentX is speaking…',
    [STATUS.ERROR]: 'Error',
    [STATUS.IDLE]: '',
};

export const VoiceWidget = forwardRef(function VoiceWidget(
    { conversationId, selectedMcpServers = [], selectedTools = [], isRagEnabled = false, onStatusChange }, ref
) {
    const { addMessage, setMessages, setCurrentConversation, setConversations } = useChat();
    // Refs, not state — this component renders NOTHING, so re-rendering
    // itself on every status change would be pure waste. Read synchronously
    // in event handlers below; reported upward via onStatusChange whenever
    // something a caller might display or gate on actually changes.
    const activeRef = useRef(false);
    const statusRef = useRef(STATUS.IDLE);
    const partialTranscriptRef = useRef('');
    const errorMsgRef = useRef('');
    const activeToolRef = useRef('');
    const clientRef = useRef(null);

    const emitStatus = useCallback(() => {
        onStatusChange?.({
            active: activeRef.current,
            status: statusRef.current,
            label: errorMsgRef.current
                ? errorMsgRef.current
                : (activeToolRef.current ? `Running ${activeToolRef.current}…` : STATUS_LABEL[statusRef.current]),
            isError: !!errorMsgRef.current,
            partialTranscript: partialTranscriptRef.current,
            canRecord: statusRef.current === STATUS.READY,
            isRecording: statusRef.current === STATUS.RECORDING,
            // "Stop" is meaningful (visible/clickable) any time a turn is
            // actively in flight — recording, waiting on the agent, or being
            // spoken back. Not while READY (nothing to stop) or CONNECTING.
            canStop: statusRef.current === STATUS.RECORDING || statusRef.current === STATUS.THINKING || statusRef.current === STATUS.SPEAKING,
        });
    }, [onStatusChange]);
    // Whether a user bubble is already open for the utterance in progress —
    // the FIRST transcript_final creates it, later ones for the same
    // utterance append to it in place, rather than deferring everything
    // until the agent starts responding. That deferral was the actual cause
    // of "why can't I see live voice to text, I have to wait" — with Sarvam
    // STT (unlike Deepgram) each transcript_final is a real ~600ms-granular
    // segment, not a token stream, so it already reads as "live" on its
    // own; waiting for the ASSISTANT to start before showing the user's OWN
    // words back just adds dead air on top of Sarvam's arrival cadence,
    // compounding into the multi-second silence that was reported.
    const userMessageOpenRef = useRef(false);

    const appendUserTranscript = useCallback((text) => {
        if (!userMessageOpenRef.current) {
            userMessageOpenRef.current = true;
            addMessage({ role: 'user', content: text, timestamp: new Date().toISOString(), modality: 'voice' });
            return;
        }
        setMessages((prev) => {
            const updated = [...prev];
            const i = updated.length - 1;
            if (i < 0 || updated[i].role !== 'user') return prev;
            updated[i] = { ...updated[i], content: `${updated[i].content} ${text}`.trim() };
            return updated;
        });
    }, [addMessage, setMessages]);

    // ── Live assistant message in the MAIN chat ──────────────────────────
    // A voice turn streams into the conversation exactly like a text turn:
    // narration text and tool cards appear as they happen, rather than the
    // whole turn landing as one finished bubble at the end. The reducer below
    // mirrors ChatPage.jsx's appendTimelineEvent (which itself mirrors
    // chat_service.py's server-side builder) so live voice, live text, and a
    // reloaded conversation all render identically.
    const assistantOpenRef = useRef(false);

    const appendTimeline = (timeline, event) => {
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
        } else if (event.type === 'files_created') {
            tl.push({ type: 'files_created', files: event.data.files });
        }
        return tl;
    };

    const ensureAssistant = useCallback(() => {
        if (assistantOpenRef.current) return;
        assistantOpenRef.current = true;
        addMessage({
            role: 'assistant', content: '', timeline: [], files_created: [],
            streaming: true, modality: 'voice', timestamp: new Date().toISOString(),
        });
    }, [addMessage]);

    const patchAssistant = useCallback((event) => {
        setMessages((prev) => {
            const updated = [...prev];
            const i = updated.length - 1;
            if (i < 0 || updated[i].role !== 'assistant') return prev;
            const last = { ...updated[i] };
            last.timeline = appendTimeline(last.timeline || [], event);
            if (event.type === 'text') last.content = (last.content || '') + event.content;
            // Message-level files_created (not just the timeline entry) is
            // what actually drives the file/download card elsewhere — set it
            // live here instead of only in finalizeAssistant, so it doesn't
            // wait for the whole turn (including trailing audio) to finish.
            if (event.type === 'files_created') last.files_created = event.data.files;
            updated[i] = last;
            return updated;
        });
    }, [setMessages]);

    const finalizeAssistant = useCallback((msg) => {
        assistantOpenRef.current = false;
        setMessages((prev) => {
            const updated = [...prev];
            const i = updated.length - 1;
            if (i < 0 || updated[i].role !== 'assistant') return prev;
            const last = { ...updated[i] };
            // Server's copy is authoritative — it's what got persisted, so
            // adopting it here keeps the live view and a reload identical.
            if (msg?.response_text) last.content = msg.response_text;
            if (msg?.timeline?.length) last.timeline = msg.timeline;
            if (msg?.files_created?.length) last.files_created = msg.files_created;
            // Server-side cost-ceiling/credit-limit cutoff, distinct from a
            // user-pressed Stop (onInterrupted, below) — same 'stopped'
            // rendering either way (Message.jsx doesn't distinguish reasons
            // visually), but this is what makes a cost-limited turn look
            // like "the agent stopped here" instead of "the agent finished
            // normally with a suspiciously short answer."
            if (msg?.stopped) {
                last.stopped = true;
                last.stop_reason = msg.stop_reason;
            }
            delete last.streaming;
            updated[i] = last;
            return updated;
        });
    }, [setMessages]);

    const teardown = useCallback(() => {
        // If a turn is actively working (thinking/speaking), tell the
        // server to stop BEFORE yanking the connection — closing the raw
        // WebSocket while the backend is mid-send is exactly how a turn
        // silently keeps running server-side with nothing listening
        // (confirmed live: real tool calls — pip installs, ffmpeg
        // downloads — kept executing for a full extra turn after the
        // client had already disconnected). interrupt() is a fire-and
        // -forget JSON message; harmless if nothing is running.
        clientRef.current?.interrupt();
        clientRef.current?.disconnect();
        clientRef.current = null;
        activeRef.current = false;
        statusRef.current = STATUS.IDLE;
        partialTranscriptRef.current = '';
        activeToolRef.current = '';
        errorMsgRef.current = '';
        userMessageOpenRef.current = false;
        assistantOpenRef.current = false;
        emitStatus();
    }, [emitStatus]);

    const openVoice = useCallback(() => {
        activeRef.current = true;
        statusRef.current = STATUS.CONNECTING;
        errorMsgRef.current = '';
        emitStatus();

        const client = new VoiceClient({
            onOpen: () => {
                errorMsgRef.current = '';
                statusRef.current = STATUS.READY;
                emitStatus();
            },
            // An UNEXPECTED close (server-initiated, network drop — not
            // teardown(), which already clears activeRef itself before
            // disconnecting) used to only reset status, leaving activeRef
            // stuck true. In the old floating-pill UI that was a latent,
            // barely-noticeable bug (an empty-label pill idling in the
            // corner); here it would leave the composer's input bar
            // hijacked with nothing displayed and no way to type OR
            // reopen voice mode (open() no-ops while activeRef is true).
            //
            // NOT cleared on an ERROR close, though: the whole point of
            // ERROR is showing the user why it failed (bad mic permission,
            // connection refused, credit limit) — deactivating immediately
            // would hide that message before it could ever be read. ERROR
            // stays active until the user dismisses it themselves via Stop
            // (MessageInput routes Stop to endSession() specifically for
            // status === 'error', same as it does for READY).
            onClose: () => {
                if (statusRef.current === STATUS.ERROR) {
                    emitStatus();
                    return;
                }
                activeRef.current = false;
                statusRef.current = STATUS.IDLE;
                partialTranscriptRef.current = '';
                activeToolRef.current = '';
                userMessageOpenRef.current = false;
                assistantOpenRef.current = false;
                emitStatus();
            },
            onTranscriptPartial: (text) => {
                partialTranscriptRef.current = text;
                emitStatus();
            },
            // Deliberately does NOT touch status. Deepgram's Flux model emits
            // a FINAL mid-recording every time you pause for breath — it marks
            // the end of a turn segment, not the end of your utterance. Setting
            // THINKING here flipped the widget out of RECORDING while the mic
            // was still open, and since canRecord/canStop are keyed off status
            // that would have made the stop control unreachable: there was
            // then no way to end the utterance, so end_utterance never went
            // out and the turn hung in STT forever (confirmed live: a
            // connection with zero tool calls and no disconnect, mic
            // streaming the whole time).
            //
            // Pushed to the chat IMMEDIATELY (appendUserTranscript), not
            // deferred until the agent starts responding — that deferral used
            // to be the actual "no live voice-to-text, feels like waiting"
            // complaint, since it hid the user's own words behind however
            // long the agent took to produce a first token.
            onTranscriptFinal: (text) => {
                partialTranscriptRef.current = '';
                appendUserTranscript(text);
                emitStatus();
            },
            onAudioStart: () => {
                statusRef.current = STATUS.SPEAKING;
                emitStatus();
            },
            onTextDelta: (text) => {
                ensureAssistant();
                patchAssistant({ type: 'text', content: text });
            },
            onSkill: (name, content) => {
                ensureAssistant();
                patchAssistant({ type: 'skill_used', data: { name, content } });
            },
            // Tool cards render in the main chat (same as text); the input
            // bar's status label just echoes what's running so a long silent
            // tool stretch doesn't look like the agent has hung.
            onToolStart: (name, args) => {
                ensureAssistant();
                patchAssistant({ type: 'tool_call', data: { name, args } });
                activeToolRef.current = name;
                emitStatus();
            },
            onToolEnd: (name, result) => {
                patchAssistant({ type: 'tool_output', data: { name, result } });
                activeToolRef.current = '';
                emitStatus();
            },
            onFilesCreated: (files) => {
                ensureAssistant();
                patchAssistant({ type: 'files_created', data: { files } });
            },
            onDone: (msg) => {
                activeToolRef.current = '';
                userMessageOpenRef.current = false;
                // Speaking into a fresh "New chat" makes the BACKEND create the
                // conversation (the sandbox workspace is scoped per
                // conversation, so it can't be deferred). Adopt that id here,
                // otherwise the turn is persisted into a conversation this
                // screen never knows about: the sidebar wouldn't list it and a
                // reload would "lose" the exchange into a separate thread.
                if (msg?.conversation_id && !conversationId) {
                    const conv = { id: msg.conversation_id, title: msg.title || 'Voice chat' };
                    setCurrentConversation(conv);
                    setConversations((prev) => (
                        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
                    ));
                }
                const hasContent = msg?.response_text || msg?.timeline?.length || msg?.files_created?.length;
                if (hasContent) {
                    // The message is normally already on screen and streaming
                    // by now; ensureAssistant only creates one in the edge case
                    // where the turn produced output with no text deltas at all.
                    ensureAssistant();
                    finalizeAssistant(msg);
                }
                statusRef.current = STATUS.READY;
                emitStatus();
            },
            onInterrupted: () => {
                activeToolRef.current = '';
                userMessageOpenRef.current = false;
                // Leave the partial message on screen, flagged stopped — same
                // as a stopped text turn, and it matches what the backend
                // persists for an interrupted voice turn.
                if (assistantOpenRef.current) {
                    assistantOpenRef.current = false;
                    setMessages((prev) => {
                        const updated = [...prev];
                        const i = updated.length - 1;
                        if (i < 0 || updated[i].role !== 'assistant') return prev;
                        const last = { ...updated[i], stopped: true, stop_reason: 'user_stop' };
                        delete last.streaming;
                        updated[i] = last;
                        return updated;
                    });
                }
                statusRef.current = STATUS.READY;
                emitStatus();
            },
            // Server cut the turn short (credit cap or the absolute per-turn
            // cost ceiling) — arrives WHILE the turn is still finishing up,
            // before 'done'. Surfaced immediately rather than waiting, since
            // without this the turn would just go silent mid-sentence with
            // no visible explanation.
            onStopped: (reason) => {
                errorMsgRef.current = reason === 'credit_limit_reached'
                    ? "You've used your free credit for this period."
                    : 'This response got long enough that it was cut short.';
                emitStatus();
            },
            onCreditBlocked: () => {
                errorMsgRef.current = "You've used your free credit for this period.";
                statusRef.current = STATUS.ERROR;
                emitStatus();
            },
            onError: (msg) => {
                errorMsgRef.current = msg || 'Something went wrong.';
                statusRef.current = STATUS.ERROR;
                emitStatus();
            },
        });
        clientRef.current = client;

        // Same tool/MCP selection + RAG-toggle logic as ChatPage.jsx's
        // handleSendMessage — voice gets the same tool access as text chat.
        const mcpServerIds = selectedMcpServers.map((s) => s.id);
        const activeTools = [...selectedTools];
        if (isRagEnabled) {
            if (!activeTools.includes('search_knowledge_base')) activeTools.push('search_knowledge_base');
            if (!activeTools.includes('read_document_page')) activeTools.push('read_document_page');
        }

        client.connect(conversationId, { enabledTools: activeTools, mcpServerIds }).catch(() => {
            errorMsgRef.current = 'Could not connect to the voice service.';
            statusRef.current = STATUS.ERROR;
            emitStatus();
        });
        // The tool/MCP/RAG selections belong in here: with only
        // [conversationId], toggling a tool and THEN starting voice reused a
        // closure captured before the toggle, so the session silently ran with
        // the old tool set.
    }, [conversationId, selectedTools, selectedMcpServers, isRagEnabled, emitStatus,
        addMessage, appendUserTranscript, ensureAssistant, patchAssistant, finalizeAssistant,
        setMessages, setCurrentConversation, setConversations]);

    useEffect(() => () => clientRef.current?.disconnect(), []);

    // Click to start talking, click again to send — NOT hold-to-talk. Besides
    // being easier to use for anything longer than a sentence, this removes an
    // entire class of bug by construction: with press/release, startRecording()
    // is async (AudioContext resume + getUserMedia) and a short tap released
    // before it resolved, so the stop half was skipped entirely — mic left
    // open streaming forever, no end_utterance ever sent, and the turn hung in
    // STT without reaching the agent (confirmed live: stuck in
    // stream_transcribe for 67s, repeated transcripts, no reply). That was the
    // "sometimes it works, sometimes it doesn't" behaviour: it depended purely
    // on how long the button was held. A toggle has no such window.
    const startingRef = useRef(false);

    const finishUtterance = useCallback(() => {
        const sentAudio = clientRef.current?.stopRecording();
        // No audio actually reached the server (stopped almost immediately,
        // before a single capture buffer filled) — no turn is coming, so go
        // back to ready instead of waiting on a response that never arrives.
        statusRef.current = sentAudio ? STATUS.THINKING : STATUS.READY;
        emitStatus();
    }, [emitStatus]);

    const toggleRecording = useCallback(async () => {
        if (statusRef.current === STATUS.RECORDING) {
            finishUtterance();
            return;
        }
        if (statusRef.current !== STATUS.READY || startingRef.current) return;
        startingRef.current = true;
        try {
            await clientRef.current.startRecording();
            statusRef.current = STATUS.RECORDING;
            // Clear any leftover notice from the PREVIOUS turn (e.g. onStopped's
            // "cut short" message) — nothing else clears it between turns, so
            // without this a stale warning from an earlier response would sit
            // in the bar through an entire subsequent successful exchange.
            errorMsgRef.current = '';
            emitStatus();
        } catch (e) {
            errorMsgRef.current = 'Microphone access was denied or unavailable.';
            statusRef.current = STATUS.ERROR;
            emitStatus();
        } finally {
            startingRef.current = false;
        }
    }, [finishUtterance, emitStatus]);

    const handleStop = useCallback(() => {
        clientRef.current?.interrupt();
        // Don't wait for the server's "interrupted" reply to update the UI: if
        // the turn already finished server-side, that reply never comes and
        // the bar would sit on "AgentX is speaking…" forever with a dead Stop
        // control.
        activeToolRef.current = '';
        statusRef.current = STATUS.READY;
        emitStatus();
    }, [emitStatus]);

    // Imperative surface MessageInput drives the whole session through, via
    // ChatPage. Declared after the handlers above so the dependency array can
    // name them directly rather than suppressing exhaustive-deps — this is
    // the ONLY thing external callers ever touch; everything else about
    // session state stays internal, surfaced only through onStatusChange.
    useImperativeHandle(ref, () => ({
        open: () => { if (!activeRef.current) openVoice(); },
        toggleRecording,
        // "Stop" is one control that means different things depending on
        // what's actually happening, matching the reference: mid-recording it
        // finalizes and sends (same as tapping the mic again); mid-turn
        // (agent thinking, or speaking back) it interrupts. Session stays
        // open either way — this is "stop the current thing", not "hang up".
        stop: () => {
            if (statusRef.current === STATUS.RECORDING) {
                finishUtterance();
            } else if (statusRef.current === STATUS.THINKING || statusRef.current === STATUS.SPEAKING) {
                handleStop();
            }
        },
        endSession: teardown,
    }), [openVoice, toggleRecording, finishUtterance, handleStop, teardown]);

    // Never renders anything — see the module comment at the top.
    return null;
});
