import { useState, useRef, useEffect, memo } from 'react';
import { ComposerToolsMenu } from './ComposerToolsMenu';
import { DictationClient } from '../../services/dictationClient';

// The model list the backend actually accepts. Kept in lockstep with
// ChatContext's `validModels` guard and services/chat.js's default — adding an
// entry here without adding it there would silently fall back on reload.
const MODELS = [
    {
        id: 'antigravity/gemini-3.7-flash-medium',
        name: 'Gemini 3.7 Flash',
        desc: 'Balanced reasoning and speed',
    },
];

const Icon = ({ d, className = 'w-4 h-4', fill = 'none', strokeWidth = 1.8 }) => (
    <svg className={className} fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d={d} />
    </svg>
);

const P = {
    plus: 'M12 5v14M5 12h14',
    wrench: 'M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-2.6 2.6-2-2z',
    book: 'M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5zM8 3v18',
    chevron: 'M6 9l6 6 6-6',
    send: 'M12 20V5M12 5l-6 6M12 5l6 6',
    file: 'M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7zM14 2v5h5',
    image: 'M3 7a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3z',
    sliders: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    x: 'M5 5l14 14M19 5L5 19',
    spark: 'M12 2l2.6 6.3L21 9.3l-4.7 4.3 1.2 6.4L12 17l-5.5 3 1.2-6.4L3 9.3l6.4-1z',
    check: 'M20 6L9 17l-5-5',
};

// Three bouncing dots inside the Stop pill — matches the reference's "•••
// Stop" affordance (a lightweight "something is actively happening" cue
// living IN the button, not a separate spinner elsewhere).
const StopDots = () => (
    <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
            <span key={i} className="w-1 h-1 rounded-full ax-stopdot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
    </span>
);

// Memoized: without this, every ChatPage re-render (which happens on every
// streamed token during generation) re-rendered the input box too, even
// though none of its own props changed during a stream. Every prop below is
// therefore expected to be referentially stable across a stream — the parent
// passes useCallback'd handlers and context values, never inline literals.
const MessageInputComponent = ({
    onSendMessage,
    disabled,
    isGenerating = false,
    onStop,
    uploadedImages,
    onImagesChange,
    selectedModel,
    onModelChange,
    // inline settings (relocated from the slide-out SettingsPanel)
    mcpServers = [],
    selectedMcpServers = [],
    onToggleMcpServer,
    selectedTools = [],
    onToolsChange,
    isRagEnabled = false,
    onToggleRag,
    contextFileCount = 0,
    onOpenKnowledgeUpload,
    onOpenSettings,
    onOpenVoiceMode,
    // Full voice-mode status, reported by VoiceWidget (which renders nothing
    // itself — see its own top-of-file comment) via ChatPage. null/inactive
    // when no voice session is open.
    voiceStatus,
    onVoiceToggleRecording,
    onVoiceStop,
    onVoiceEndSession,
}) => {
    const [message, setMessage] = useState('');
    const [openMenu, setOpenMenu] = useState(null); // 'plus' | 'tools' | 'model' | null
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const textareaRef = useRef(null);
    const rootRef = useRef(null);

    // ── Dictation (voice-to-text into this box, NOT the full voice agent) ──
    // 'idle' | 'connecting' | 'recording' | 'transcribing'. The live
    // transcript (or a status word) is shown AS the same input bar's
    // content, and the toolbar's normal controls collapse to a small inline
    // waveform + X/✓, matching the reference exactly. dictationState and
    // voiceStatus are two independent systems that happen to share this one
    // rendering path (see activeVoice below) — only one can be active at a
    // time in practice (starting either is gated on the other being idle).
    const [dictationState, setDictationState] = useState('idle');
    const [dictationPreview, setDictationPreview] = useState('');
    // Rolling window of recent peak-amplitude samples (0-1) for the inline
    // waveform — real mic levels off the actual captured buffers
    // (dictationClient.js's onAudioLevel), not a canned animation. Fixed
    // length so the array is a stable shape to render; new samples push in,
    // old ones fall off the front, giving a live left-scrolling waveform.
    const DICTATION_WAVEFORM_BARS = 28;
    const [dictationLevels, setDictationLevels] = useState(() => new Array(28).fill(0));
    const dictationClientRef = useRef(null);

    const resetDictation = () => {
        setDictationState('idle');
        setDictationPreview('');
        setDictationLevels(new Array(DICTATION_WAVEFORM_BARS).fill(0));
        dictationClientRef.current = null;
    };

    // Disconnects a dictation session left mid-flight if the composer itself
    // unmounts (e.g. navigating away) — without this the mic stays open and
    // streaming into a WebSocket nobody is listening to anymore.
    useEffect(() => () => dictationClientRef.current?.disconnect(), []);

    const startDictation = async () => {
        if (dictationState !== 'idle' || voiceStatus?.active) return;
        setDictationState('connecting');
        setDictationPreview('');
        const client = new DictationClient({
            // Sarvam (default STT provider) has no true token-by-token
            // interim stream — each transcript_final IS the live update,
            // arriving roughly every ~600-800ms of speech WHILE the user is
            // still talking, not just once at the end. Accumulated here so
            // the preview grows through the utterance instead of appearing
            // all at once when you stop.
            onTranscriptFinal: (text) => {
                setDictationPreview((prev) => (prev ? `${prev} ${text}`.trim() : text));
            },
            onAudioLevel: (level) => {
                setDictationLevels((prev) => [...prev.slice(1), level]);
            },
            onDone: (text) => {
                // Server's copy is authoritative (same text the accumulated
                // preview should already show, but this is the source of
                // truth in case of any client-side accumulation drift).
                const finalText = text || dictationPreview;
                if (finalText) {
                    // Appended, not replaced — dictating into a box that
                    // already has typed text should extend it, matching how
                    // dictation works in every other text-input context.
                    setMessage((prev) => (prev ? `${prev} ${finalText}`.trim() : finalText));
                    requestAnimationFrame(() => textareaRef.current?.focus());
                }
                resetDictation();
            },
            onError: () => resetDictation(),
        });
        dictationClientRef.current = client;
        try {
            await client.connect();
            await client.startRecording();
            setDictationState('recording');
        } catch (e) {
            resetDictation();
        }
    };

    // Dictation gets its OWN two-button pair — X (discard) / ✓ (finalize +
    // insert) — distinct from voice mode's single consolidated Stop pill.
    // Two genuinely different products share the same input-bar rendering
    // slot: dictation is a one-shot "capture then review" action where
    // discard-vs-keep is the real decision the user is making every time,
    // so it stays two explicit buttons; voice mode is an ongoing session
    // where "stop" has one contextual meaning at a time, so one button
    // covers it. Matching the reference's own split between the two.
    const confirmDictation = () => {
        if (dictationState !== 'recording') return;
        dictationClientRef.current?.stopRecording();
        setDictationState('transcribing');
    };

    // Discards everything — no text reaches the message box. Tells the
    // CLIENT to close without ever sending end_utterance, so the server
    // never finalizes a transcript at all rather than us just ignoring
    // whatever comes back.
    const cancelDictation = () => {
        dictationClientRef.current?.cancel();
        resetDictation();
    };

    // ── Unified active-voice bar (dictation OR full voice mode) ───────────
    // Exactly one of these is ever true in practice. `label` is what's shown
    // AS the input bar's content; `micActive`/`onMic` govern the small mic
    // glyph that stays visible in the toolbar for voice mode (see the render
    // below) — only its READY state needs the glyph to be a real control
    // (tap to start the next utterance); everywhere else it's decorative.
    // Dictation carries onCancel/onConfirm (two buttons); voice mode carries
    // onStop (one button) — the render branches on `kind` to pick the layout.
    const activeVoice = dictationState !== 'idle'
        ? {
            kind: 'dictation',
            label: dictationPreview || (dictationState === 'connecting' ? 'Connecting…' : dictationState === 'transcribing' ? 'Processing…' : 'Listening…'),
            isError: false,
            isBusy: dictationState === 'transcribing',
            onCancel: cancelDictation,
            onConfirm: confirmDictation,
            canConfirm: dictationState === 'recording',
            levels: dictationLevels,
            micActive: false,
            onMic: null,
        }
        : voiceStatus?.active
            ? {
                kind: 'voice',
                label: voiceStatus.partialTranscript || voiceStatus.label,
                isError: voiceStatus.isError,
                isBusy: voiceStatus.status === 'connecting',
                // READY and ERROR both have nothing in flight to interrupt —
                // repurpose the same control to end the session outright
                // (dismissing an error this way is the ONLY way back to
                // normal typing, since VoiceWidget deliberately keeps an
                // error active/visible rather than auto-clearing it), so
                // Stop is never a dead button while a voice session is open.
                onStop: (voiceStatus.canRecord || voiceStatus.status === 'error') ? onVoiceEndSession : onVoiceStop,
                micActive: voiceStatus.canRecord,
                onMic: voiceStatus.canRecord ? onVoiceToggleRecording : null,
            }
            : null;

    const activeCount = selectedTools.length + selectedMcpServers.length;
    const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

    // Auto-grow the textarea with its content, capped so the composer can
    // never eat the conversation.
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [message]);

    // Close any open popover on outside click / Escape.
    useEffect(() => {
        if (!openMenu) return;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpenMenu(null);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [openMenu]);

    const toggleMenu = (name) => setOpenMenu(prev => (prev === name ? null : name));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            const isImage = file.type.startsWith('image/');
            const reader = new FileReader();

            reader.onloadend = () => {
                onImagesChange(prev => [...prev, {
                    file,
                    preview: isImage ? reader.result : null,
                    base64: reader.result.split(',')[1],
                    isImage,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    const removeImage = (index) => {
        onImagesChange(prev => prev.filter((_, i) => i !== index));
    };

    const hasChips = uploadedImages.length > 0 || isRagEnabled;

    return (
        <div className="max-w-3xl mx-auto w-full" ref={rootRef}>
            <form onSubmit={handleSubmit}>
                <div
                    className="relative rounded-[20px] border transition-all duration-200 focus-within:shadow-[var(--shadow-2),var(--ring)]"
                    style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border-color)',
                        boxShadow: 'var(--shadow-2)',
                    }}
                >
                    {/* Indeterminate progress rail while the agent is working */}
                    {isGenerating && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-[20px] pointer-events-none">
                            <div className="ax-rail" />
                        </div>
                    )}

                    {/* Context chips: attachments + active knowledge-base state */}
                    {hasChips && (
                        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                            {uploadedImages.map((img, index) => (
                                <span key={index}
                                    className="flex items-center gap-2 text-[11.5px] rounded-lg border pl-1 pr-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--surface-2)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-secondary)'
                                    }}>
                                    {img.isImage && img.preview ? (
                                        <img src={img.preview} alt="" className="w-5 h-5 rounded object-cover flex-none" />
                                    ) : (
                                        <span className="w-5 h-5 rounded grid place-items-center flex-none"
                                            style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                                            <Icon d={P.file} className="w-3 h-3" />
                                        </span>
                                    )}
                                    <span className="max-w-[140px] truncate" title={img.name}>{img.name}</span>
                                    <button type="button" onClick={() => removeImage(index)}
                                        className="w-3.5 h-3.5 grid place-items-center rounded transition-colors hover:bg-[var(--surface-3)]"
                                        style={{ color: 'var(--text-tertiary)' }} title="Remove">
                                        <Icon d={P.x} className="w-2.5 h-2.5" strokeWidth={3} />
                                    </button>
                                </span>
                            ))}

                            {isRagEnabled && (
                                <span className="flex items-center gap-2 text-[11.5px] rounded-lg border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--accent-soft)',
                                        borderColor: 'var(--accent-line)',
                                        color: 'var(--accent)'
                                    }}>
                                    <Icon d={P.book} className="w-3 h-3" />
                                    Knowledge base
                                    {contextFileCount > 0 && (
                                        <span className="opacity-80">· {contextFileCount} selected</span>
                                    )}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Hidden file inputs — one general, one image-only. Both feed
                        the same handler, so upload behaviour is unchanged. Kept
                        outside the idle/dictating split below since they're
                        invisible regardless and other code holds refs to them. */}
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden"
                        accept="image/*,.pdf,.txt,.md,.json,.csv,.xlsx,.xls,.doc,.docx" />
                    <input type="file" ref={imageInputRef} onChange={handleFileSelect} multiple className="hidden"
                        accept="image/*" />

                    {/* Text input — while a voice session (dictation OR full voice mode)
                        is active, this SAME element shows its live status/transcript
                        as content instead of typed text, matching the reference
                        exactly (no separate panel takes over the composer). */}
                    <textarea
                        ref={textareaRef}
                        value={activeVoice ? activeVoice.label : message}
                        onChange={activeVoice ? undefined : (e) => setMessage(e.target.value)}
                        onKeyDown={activeVoice ? undefined : handleKeyDown}
                        placeholder="Message AgentX…"
                        disabled={disabled || !!activeVoice}
                        readOnly={!!activeVoice}
                        rows={1}
                        className={`w-full resize-none outline-none bg-transparent text-[15px] leading-relaxed px-4 pt-3.5 pb-2 ${activeVoice ? 'italic' : ''}`}
                        style={{ color: activeVoice?.isError ? 'var(--danger, #dc2626)' : 'var(--text-primary)', maxHeight: '200px' }}
                    />

                    {/* Control row */}
                    <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1">

                        {/* + attach — stays visible during an active voice session too,
                            matching the reference (only the mic/model/tools cluster on
                            the right changes). Disabled rather than hidden, since an
                            attachment genuinely can't apply to a voice turn. */}
                        <div className="relative">
                            <button type="button" title="Attach" disabled={!!activeVoice}
                                onClick={() => toggleMenu('plus')}
                                className={`ax-cbtn w-8 justify-center px-0 disabled:opacity-40 ${openMenu === 'plus' ? 'is-open' : ''}`}>
                                <Icon d={P.plus} className="w-[18px] h-[18px]" />
                            </button>
                            {openMenu === 'plus' && (
                                <div className="ax-pop absolute bottom-full left-0 mb-2.5 w-[272px] p-1.5 z-50">
                                    <div className="ax-pop-label">Add to this message</div>
                                    <button type="button" className="ax-pop-item"
                                        onClick={() => { setOpenMenu(null); fileInputRef.current?.click(); }}>
                                        <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                            <Icon d={P.file} className="w-3.5 h-3.5" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>Upload file</span>
                                            <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>PDF, DOCX, CSV, images</span>
                                        </span>
                                    </button>
                                    <button type="button" className="ax-pop-item"
                                        onClick={() => { setOpenMenu(null); imageInputRef.current?.click(); }}>
                                        <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                            <Icon d={P.image} className="w-3.5 h-3.5" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>Add image</span>
                                            <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>Analysed with vision</span>
                                        </span>
                                    </button>
                                    {onOpenKnowledgeUpload && (
                                        <>
                                            <div className="h-px mx-2 my-1.5" style={{ backgroundColor: 'var(--border-color)' }} />
                                            <button type="button" className="ax-pop-item"
                                                onClick={() => { setOpenMenu(null); onOpenKnowledgeUpload(); }}>
                                                <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                                    style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }}>
                                                    <Icon d={P.book} className="w-3.5 h-3.5" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>Index to knowledge base</span>
                                                    <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>Parse, chunk and embed for RAG</span>
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tools + Agentic RAG — hidden during an active voice session,
                            matching the reference (neither appears in any of its
                            Listening/Processing/speaking states). The tool/RAG
                            SELECTION itself still applies to voice turns (VoiceWidget
                            reads selectedTools/isRagEnabled directly) — only these two
                            toggle buttons are hidden, nothing about what's enabled
                            changes just because the bar is showing voice status. */}
                        {!activeVoice && (
                        <>
                        <div className="relative">
                            <button type="button"
                                onClick={() => toggleMenu('tools')}
                                className={`ax-cbtn ${openMenu === 'tools' ? 'is-open' : activeCount > 0 ? 'is-on' : ''}`}>
                                <Icon d={P.wrench} className="w-[15px] h-[15px]" />
                                <span className="hidden sm:inline">Tools</span>
                                {activeCount > 0 && (
                                    <span className="min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold grid place-items-center"
                                        style={{
                                            backgroundColor: openMenu === 'tools' ? 'var(--surface-3)' : 'var(--accent)',
                                            color: openMenu === 'tools' ? 'var(--text-secondary)' : 'var(--accent-ink)'
                                        }}>
                                        {activeCount}
                                    </span>
                                )}
                            </button>
                            {openMenu === 'tools' && (
                                <div className="ax-pop absolute bottom-full left-0 mb-2.5 w-[336px] z-50">
                                    <ComposerToolsMenu
                                        mcpServers={mcpServers}
                                        selectedMcpServers={selectedMcpServers}
                                        onToggleMcpServer={onToggleMcpServer}
                                        selectedTools={selectedTools}
                                        onToolsChange={onToolsChange}
                                    />
                                </div>
                            )}
                        </div>

                        <button type="button" onClick={onToggleRag} title="Agentic RAG over your documents"
                            className={`ax-cbtn ${isRagEnabled ? 'is-on' : ''}`}>
                            <Icon d={P.book} className="w-[15px] h-[15px]" />
                            <span className="hidden md:inline">Agentic RAG</span>
                        </button>
                        </>
                        )}

                        {/* Model picker */}
                        <div className="relative ml-auto">
                            <button type="button"
                                onClick={() => toggleMenu('model')}
                                className={`ax-cbtn ${openMenu === 'model' ? 'is-open' : ''}`}
                                style={openMenu === 'model' ? undefined : {
                                    borderColor: 'var(--border-color)',
                                    backgroundColor: 'var(--surface)'
                                }}>
                                <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ backgroundColor: 'var(--accent)' }} />
                                <span className="max-w-[130px] truncate">{currentModel.name}</span>
                                <Icon d={P.chevron} className="w-3 h-3 flex-none" strokeWidth={2} />
                            </button>
                            {openMenu === 'model' && (
                                <div className="ax-pop absolute bottom-full right-0 mb-2.5 w-[300px] p-1.5 z-50">
                                    <div className="ax-pop-label">Model</div>
                                    {MODELS.map((m) => {
                                        const active = m.id === currentModel.id;
                                        return (
                                            <button key={m.id} type="button" className="ax-pop-item"
                                                style={active ? { backgroundColor: 'var(--hover-bg)' } : undefined}
                                                onClick={() => { onModelChange(m.id); setOpenMenu(null); }}>
                                                <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                                    style={{
                                                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                                                        borderColor: active ? 'var(--accent-line)' : 'var(--border-color)',
                                                        color: active ? 'var(--accent)' : 'var(--text-secondary)'
                                                    }}>
                                                    <Icon d={P.spark} className="w-3.5 h-3.5" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                                                    <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>{m.desc}</span>
                                                </span>
                                                {active && (
                                                    <span className="ml-auto flex-none" style={{ color: 'var(--accent)' }}>
                                                        <Icon d={P.check} className="w-4 h-4" strokeWidth={2.4} />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                    {onOpenSettings && (
                                        <>
                                            <div className="h-px mx-2 my-1.5" style={{ backgroundColor: 'var(--border-color)' }} />
                                            <button type="button" className="ax-pop-item"
                                                onClick={() => { setOpenMenu(null); onOpenSettings(); }}>
                                                <span className="w-7 h-7 rounded-[9px] grid place-items-center flex-none border"
                                                    style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                                    <Icon d={P.sliders} className="w-3.5 h-3.5" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>Advanced settings</span>
                                                    <span className="block text-[11.5px] leading-tight mt-px" style={{ color: 'var(--text-tertiary)' }}>Appearance and full tool panel</span>
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {activeVoice?.kind === 'dictation' ? (
                            <>
                                {/* Inline waveform — real mic peak-amplitude samples
                                    (dictationClient.js's onAudioLevel), not a canned
                                    loop, rendered as a dotted/bar strip matching the
                                    reference. Fills the space between the attach
                                    cluster and the X/✓ pair. */}
                                <div className="flex-1 flex items-center justify-center gap-[3px] h-5 px-1" aria-hidden="true">
                                    {activeVoice.levels.map((lvl, i) => (
                                        <span key={i} className="w-[3px] rounded-full flex-none"
                                            style={{
                                                height: `${Math.max(12, Math.min(100, lvl * 320))}%`,
                                                backgroundColor: 'var(--text-tertiary)',
                                                opacity: 0.4 + Math.min(0.6, lvl * 3),
                                                transition: 'height 90ms ease-out, opacity 90ms ease-out',
                                            }} />
                                    ))}
                                </div>

                                {/* Dictation: X (discard) / ✓ (finalize + insert) — two
                                    explicit buttons, matching the reference exactly.
                                    X always works (bails out of connecting/recording/
                                    transcribing alike). ✓ only does something while
                                    actively recording — nothing to confirm yet during
                                    connecting, and once transcribing you're already
                                    waiting on the one thing ✓ would have triggered. */}
                                <button type="button" onClick={activeVoice.onCancel} title="Cancel"
                                    className="w-8 h-8 rounded-full grid place-items-center flex-none transition-transform active:scale-95"
                                    style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-primary)' }}>
                                    <Icon d={P.x} className="w-3.5 h-3.5" strokeWidth={2.4} />
                                </button>
                                <button type="button" onClick={activeVoice.onConfirm} disabled={!activeVoice.canConfirm} title="Done"
                                    className="w-8 h-8 rounded-full grid place-items-center flex-none transition-transform active:scale-95 disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' }}>
                                    <Icon d={P.check} className="w-3.5 h-3.5" strokeWidth={2.8} />
                                </button>
                            </>
                        ) : activeVoice?.kind === 'voice' ? (
                            <>
                                {/* Mic glyph — a real control (tap to start the next
                                    utterance) only when voice mode is READY between
                                    turns; decorative everywhere else (recording/
                                    processing/speaking), since Stop is the one
                                    functional control there. */}
                                <button
                                    type="button"
                                    onClick={activeVoice.onMic || undefined}
                                    disabled={!activeVoice.onMic}
                                    title={activeVoice.onMic ? 'Tap to talk' : undefined}
                                    className="ax-cbtn w-8 justify-center px-0 disabled:opacity-60"
                                >
                                    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" />
                                    </svg>
                                </button>

                                {/* Stop — the ONE consolidated control for the ongoing
                                    voice session, matching the reference's "••• Stop"
                                    pill. Meaning is contextual (see activeVoice above):
                                    recording -> finalize+send; thinking/speaking ->
                                    interrupt; READY -> end the session (nothing else
                                    left to stop). */}
                                <button
                                    type="button"
                                    onClick={activeVoice.onStop}
                                    disabled={activeVoice.isBusy}
                                    title="Stop"
                                    className="h-[34px] px-3.5 rounded-[11px] flex-none flex items-center gap-1.5 text-[13px] font-medium transition-transform active:scale-95 disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' }}
                                >
                                    <StopDots />
                                    Stop
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Dictate — voice-to-TEXT into this box. Distinct from the
                                    voice-mode button below: no agent call, no spoken
                                    reply, just transcription. Hidden while a message is
                                    generating, same as Send, since there's nothing to
                                    dictate INTO. */}
                                {!isGenerating && (
                                    <button
                                        type="button"
                                        onClick={startDictation}
                                        disabled={disabled}
                                        title="Dictate"
                                        className="ax-cbtn w-8 justify-center px-0 disabled:opacity-50"
                                    >
                                        <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" />
                                        </svg>
                                    </button>
                                )}

                                {/* Voice mode — the full speech-to-speech agent. Opens
                                    VoiceWidget's active session (ChatPage owns the ref
                                    and drives it imperatively — VoiceWidget itself
                                    renders nothing); this button is just the entry point. */}
                                {!isGenerating && onOpenVoiceMode && (
                                    <button
                                        type="button"
                                        onClick={onOpenVoiceMode}
                                        title="Use voice mode"
                                        className="ax-cbtn w-8 justify-center px-0"
                                    >
                                        <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
                                            <path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4" />
                                        </svg>
                                    </button>
                                )}

                                {/* Send / Stop — becomes a Stop button while generating */}
                                {isGenerating ? (
                                    <button
                                        type="button"
                                        onClick={onStop}
                                        title="Stop generating"
                                        className="w-[34px] h-[34px] flex-none rounded-[11px] grid place-items-center transition-transform active:scale-95"
                                        style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="6" y="6" width="12" height="12" rx="2.5" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={disabled || !message.trim()}
                                        title="Send"
                                        className="w-[34px] h-[34px] flex-none rounded-[11px] grid place-items-center transition-all active:scale-95 disabled:cursor-default"
                                        style={message.trim() && !disabled ? {
                                            backgroundColor: 'var(--accent)',
                                            color: 'var(--accent-ink)',
                                            boxShadow: '0 2px 10px -3px var(--accent-line)'
                                        } : {
                                            backgroundColor: 'var(--surface-3)',
                                            color: 'var(--text-tertiary)'
                                        }}
                                    >
                                        <Icon d={P.send} className="w-[15px] h-[15px]" strokeWidth={2.2} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </form>

            <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                AgentX runs code in an isolated sandbox. Shift + Enter for a new line.
            </p>
        </div>
    );
};

export const MessageInput = memo(MessageInputComponent);
