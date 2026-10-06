// VoiceClient — WebSocket client for the voice pipeline (backend/voice/,
// routes/voice_routes.py). Handles mic capture (PCM16 @16kHz, matching
// voice/stt.py's stream_transcribe default), streaming playback of the
// response audio (PCM32float @24kHz, matching voice/tts.py's
// OUTPUT_FORMAT), and the control-message protocol (end_utterance /
// interrupt).
//
// Kept dependency-free (no audio library) — just the Web Audio API and a
// native WebSocket, since the whole point of this module is being a small,
// self-contained wrapper.

import { API_BASE_URL } from '../config';

const CAPTURE_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
// Every chunk is scheduled at least this far ahead of "now" (not just the
// first one) — a continuous jitter cushion against the LLM's own uneven
// sentence-generation pace, which is what actually causes gaps in a
// cascaded pipeline: audio can only be produced as fast as the model
// writes the next sentence, and that pace is not realtime-steady.
//
// Sized from real measurement, not guessed. Live tool-using turns measured
// after the TurnSpeaker fix (voice/speaker.py) showed worst-case
// inter-chunk gaps of 547-656ms. At the previous 0.35s the buffer drained
// on every one of those — each drain is an audible stutter mid-sentence,
// which is exactly what "voice coming but stuttering a lot" was. 0.8s
// covers the measured worst case. The cost is ~0.45s more latency before
// speech starts, which is the right trade: a late start reads as thinking,
// a mid-sentence dropout reads as broken.
const PLAYBACK_LEAD_S = 0.8;

// ── Jitter buffer ────────────────────────────────────────────────────────
// PLAYBACK_LEAD_S above is a scheduling OFFSET, not a buffer, and that
// distinction is the whole reason speech used to stutter worst at the very
// start of a turn: the first chunk was scheduled 0.8s out while holding only
// ~90ms of audio, so the queue ran dry immediately and re-lagged on nearly
// every chunk afterwards until the producer happened to get ahead.
//
// Proven by replaying real production arrival traces through both designs:
// raising the offset 0.8s -> 1.5s changed NOTHING (7 starvations, 4.40s of
// inserted silence, identical) and merely delayed the start. Waiting for
// audio to ACCUMULATE is what actually helps, on the same trace:
//
//   current (offset 0.8s)          7 starvations   4.40s silence
//   prebuffer 1.0s                 3 starvations   4.35s silence
//   prebuffer 2.0s / refill 0.5s   1 starvation    1.06s silence
//
// The asymmetry is deliberate: a generous initial fill buys the producer
// (TTS, ~1.4-2x realtime but bursty) time to get ahead, while a mid-turn
// dry-out refills cheaply so a hiccup costs a short pause, not a long one.
const PREBUFFER_S = 2.0;
const REFILL_S = 0.5;
// If audio simply stops arriving, play whatever is buffered rather than
// waiting for a fill that may never come. Essential for short replies whose
// ENTIRE audio is under PREBUFFER_S — without this they would never play at
// all — and for the tail of every burst.
//
// 1000ms, NOT the ~250ms that looks natural for "the stream stopped": normal
// inter-chunk jitter on a real trace regularly exceeds 250ms (21 such gaps in
// a 104-chunk turn), so a short timer fires mid-fill and drains a half-full
// buffer — throwing away the very protection the prebuffer exists to provide.
// Replaying this exact algorithm over that trace shows it clearly:
//
//   flush  250ms -> 6 early drains, 6 starvations, 2.60s silence
//   flush  700ms -> 2 early drains, 3 starvations, 2.27s silence
//   flush 1000ms -> 0 early drains, 1 starvation,  0.51s silence
//
// Raising it further changes nothing, so 1000ms is the knee of the curve.
// End-of-turn does not depend on this timer anyway — the 'done' event drains
// the buffer immediately, so short replies never wait on it.
const BUFFER_FLUSH_MS = 1000;

// ── Connection watchdog ──────────────────────────────────────────────────
// The server sends {"type":"ping"} every 10s (routes/voice_routes.py). If
// nothing at all arrives for this long, the socket is treated as dead.
//
// This exists because a dropped voice connection does NOT reliably surface
// as a close event: mobile carrier NAT and proxies drop long-idle sockets
// half-open, so the server sees the client vanish while the browser still
// thinks it is connected. Observed in production on a tool-heavy turn (three
// analyze_image calls, 7-8s each, nothing sent in between): the server
// logged the disconnect and the UI sat on "AgentX is speaking..." forever,
// waiting on a socket that no longer existed.
//
// Generous relative to the 10s heartbeat — several heartbeats must be missed
// before giving up, so ordinary jitter or a brief background/lock-screen
// stall never trips it.
const WATCHDOG_TIMEOUT_MS = 35000;
// ScriptProcessorNode buffer size — smaller = lower latency but more
// overhead. 4096 is the common middle ground for speech capture.
const CAPTURE_BUFFER_SIZE = 4096;

// ── Incoming audio wire format: 8-bit mu-law ─────────────────────────────
// The server sends mu-law (voice/config.py's VOICE_WIRE_CODEC), not the
// raw Float32 this used to parse with `new Float32Array(buffer)`. That
// change is a bandwidth fix, not a cosmetic one: float32 @24kHz needs
// 768 kbps, and measured real-world throughput to the browser was ~414
// kbps — so the audio physically could not arrive in realtime and the
// player starved on nearly every chunk. mu-law is 192 kbps for the same
// audio.
//
// Decoding is a stateless per-byte transform, so a chunk still decodes on
// its own with no framing or buffering concerns — the streaming model is
// unchanged. The 256 possible byte values are expanded once into a lookup
// table so per-chunk work is a plain array read per sample.
const MULAW_TABLE = (() => {
    const table = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const u = ~i & 0xff;
        let t = ((u & 0x0f) << 3) + 0x84;
        t <<= (u & 0x70) >> 4;
        const pcm = (u & 0x80) ? (0x84 - t) : (t - 0x84);
        table[i] = pcm / 32768;
    }
    return table;
})();

function decodeMuLaw(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const out = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = MULAW_TABLE[bytes[i]];
    return out;
}

// Exported so services/dictationClient.js (the voice-to-text-only sibling
// of this module) can build its WS URL the same verified way, rather than
// re-implementing the "path?query as one string" percent-encoding trap
// this fixed (see the comment below) a second time.
export function wsUrlFromApiBase(pathname, searchParams) {
    // pathname and query MUST be set via their own setters — assigning a
    // "path?query=..." string to url.pathname treats the whole thing as a
    // literal path segment and percent-encodes the "?" instead of parsing
    // it as a delimiter (confirmed live: produced ".../voice/ws%3Fconversation_id=..."
    // and the connection never reached the route at all).
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = pathname;
    if (searchParams) {
        for (const [key, value] of Object.entries(searchParams)) {
            if (value != null) url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

function floatTo16BitPCM(float32Array) {
    const out = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out.buffer;
}

export class VoiceClient {
    constructor({ onTranscriptPartial, onTranscriptFinal, onAudioStart, onDone, onInterrupted, onError, onCreditBlocked, onOpen, onClose, onToolStart, onToolEnd, onTextDelta, onSkill, onStopped, onFilesCreated } = {}) {
        this.callbacks = { onTranscriptPartial, onTranscriptFinal, onAudioStart, onDone, onInterrupted, onError, onCreditBlocked, onOpen, onClose, onToolStart, onToolEnd, onTextDelta, onSkill, onStopped, onFilesCreated };

        this.ws = null;
        this.captureCtx = null;
        this.playbackCtx = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.processorNode = null;

        this._nextPlaybackTime = 0;
        this._playedFirstChunkThisTurn = false;
        // Jitter buffer state — see PREBUFFER_S. Chunks land in _pending
        // while buffering and are scheduled back-to-back once there is
        // enough of them to play through the producer's uneven pace.
        this._pending = [];
        this._pendingDuration = 0;
        this._buffering = true;
        this._bufferTarget = PREBUFFER_S;
        this._flushTimer = null;
        // Every AudioBufferSourceNode scheduled but not yet finished. Needed
        // because scheduling is FIRE AND FORGET: source.start(t) hands the
        // buffer to the audio thread, and nothing about closing the socket or
        // cancelling the turn server-side unschedules it. Without this list,
        // pressing Stop kept playing every second of speech already buffered
        // ahead of the playhead — the agent had stopped talking but the
        // browser hadn't.
        this._scheduledSources = [];
        // Set by interrupt(), cleared when the next utterance starts — drops
        // in-flight audio from the interrupted turn.
        this._suppressAudio = false;
        this.isRecording = false;
        this.isConnected = false;
        this._chunksSent = 0;
        this._bytesSent = 0;
        this._watchdogTimer = null;
    }

    /** Restarted on EVERY inbound frame (audio, event, or the server's
     *  heartbeat ping). Firing means nothing has arrived for
     *  WATCHDOG_TIMEOUT_MS, i.e. the connection is gone even though no close
     *  event was ever delivered. */
    _kickWatchdog() {
        if (this._watchdogTimer) clearTimeout(this._watchdogTimer);
        this._watchdogTimer = setTimeout(() => {
            this._watchdogTimer = null;
            if (!this.isConnected) return;
            this._stopPlayback();
            this.callbacks.onError?.('Connection lost. Please try again.');
            // close() fires onclose, which resets UI state — without this the
            // widget would stay stuck mid-turn, which is the exact bug this
            // watchdog exists to end.
            try { this.ws?.close(); } catch { /* already closing */ }
        }, WATCHDOG_TIMEOUT_MS);
    }

    _clearWatchdog() {
        if (this._watchdogTimer) {
            clearTimeout(this._watchdogTimer);
            this._watchdogTimer = null;
        }
    }

    connect(conversationId, { enabledTools, mcpServerIds } = {}) {
        return new Promise((resolve, reject) => {
            const url = wsUrlFromApiBase('/voice/ws', {
                conversation_id: conversationId || null,
                // Same tool/MCP selection the text chat composer already
                // sends on every turn — without this, voice only ever got
                // the always-on sandbox tools, never the user's enabled
                // RAG search, Google Drive, weather, or MCP servers.
                enabled_tools: enabledTools?.length ? enabledTools.join(',') : null,
                mcp_server_ids: mcpServerIds?.length ? mcpServerIds.join(',') : null,
            });
            this.ws = new WebSocket(url);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.isConnected = true;
                this._kickWatchdog();
                this.callbacks.onOpen?.();
                resolve();
            };
            this.ws.onerror = (err) => {
                this.callbacks.onError?.('WebSocket connection error');
                reject(err);
            };
            this.ws.onclose = () => {
                this.isConnected = false;
                this._clearWatchdog();
                this.callbacks.onClose?.();
            };
            this.ws.onmessage = (event) => this._handleMessage(event);
        });
    }

    disconnect() {
        this._clearWatchdog();
        this.stopRecording();
        this._stopPlayback();
        this.ws?.close();
        this.ws = null;
        this.playbackCtx?.close();
        this.playbackCtx = null;
    }

    _handleMessage(event) {
        // ANY inbound frame proves the connection is alive.
        this._kickWatchdog();
        if (event.data instanceof ArrayBuffer) {
            this._playAudioChunk(event.data);
            return;
        }
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }
        switch (msg.type) {
            // Server heartbeat. Carries no data — its only job is to keep
            // the socket from looking idle to intermediaries, and to reset
            // the watchdog above. Silently ignored beyond that.
            case 'ping':
                break;
            case 'transcript_partial':
                this.callbacks.onTranscriptPartial?.(msg.text);
                break;
            case 'transcript_final':
                this.callbacks.onTranscriptFinal?.(msg.text);
                break;
            case 'text_delta':
                this.callbacks.onTextDelta?.(msg.content);
                break;
            case 'skill':
                this.callbacks.onSkill?.(msg.name, msg.content);
                break;
            case 'tool_start':
                this.callbacks.onToolStart?.(msg.name, msg.args);
                break;
            case 'tool_end':
                this.callbacks.onToolEnd?.(msg.name, msg.result);
                break;
            // Sent as soon as the agent's own work (text + tool calls) is
            // done, which can be well before the trailing audio finishes
            // (TTS lags behind text) — lets a file/download show up without
            // waiting for the whole turn's speech to end.
            case 'files_created':
                this.callbacks.onFilesCreated?.(msg.files);
                break;
            case 'stopped':
                // Sent when the SERVER cuts a turn short — credit cap or the
                // absolute per-turn cost ceiling — as distinct from the
                // client-initiated 'interrupted' (Stop button). Arrives
                // before 'done', which also carries stop_reason on the final
                // persisted message so a reload shows the same state.
                this.callbacks.onStopped?.(msg.reason);
                break;
            case 'done':
                // The turn produced its last audio — nothing more is coming
                // to fill the buffer, so play whatever is still held rather
                // than letting the final words wait on a fill that will
                // never arrive.
                if (this._pending.length) this._drainBuffer();
                this._playedFirstChunkThisTurn = false;
                // Whole payload, not just the text: it also carries the
                // timeline / files_created / conversation_id the chat message
                // needs to render tool steps and downloads the way a text turn
                // does.
                this.callbacks.onDone?.(msg);
                break;
            case 'interrupted':
                this._stopPlayback();
                this.callbacks.onInterrupted?.();
                break;
            case 'credit_blocked':
                this.callbacks.onCreditBlocked?.();
                break;
            case 'error':
                this.callbacks.onError?.(msg.message);
                break;
            default:
                break;
        }
    }

    // ── Mic capture ────────────────────────────────────────────────────
    async startRecording() {
        if (this.isRecording) return;
        // New utterance — stale audio from an interrupted turn is long gone.
        this._suppressAudio = false;
        // Each turn starts its own buffer fill: the previous turn ended in
        // the "playing" state, and inheriting that would make this turn
        // schedule its very first fragment straight through — reintroducing
        // exactly the start-of-turn starvation the prebuffer exists to stop.
        this._buffering = true;
        this._bufferTarget = PREBUFFER_S;

        // Create (or resume) the PLAYBACK context here too, synchronously
        // within this real user-gesture-triggered call — not lazily on
        // first audio chunk arrival, which happens inside an async
        // WebSocket message handler and is NOT a user gesture. Browsers
        // create/leave AudioContexts in "suspended" state outside a
        // gesture and silently drop anything scheduled on them — no
        // error, no exception, chunks visibly arrive over the network
        // (confirmed live: real audio bytes in the Network tab) but
        // nothing audible ever plays. This is the standard, documented
        // fix (MDN: "resume the context in a user gesture handler").
        if (!this.playbackCtx) {
            this.playbackCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: PLAYBACK_SAMPLE_RATE });
            this._nextPlaybackTime = this.playbackCtx.currentTime;
        }
        await this.playbackCtx.resume();

        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Chrome honors a requested sampleRate on AudioContext construction
        // (resamples internally), so capture is already ~16kHz without a
        // separate resampling step.
        this.captureCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: CAPTURE_SAMPLE_RATE });
        this.sourceNode = this.captureCtx.createMediaStreamSource(this.mediaStream);
        this.processorNode = this.captureCtx.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);

        this._chunksSent = 0;
        this._bytesSent = 0;
        this.processorNode.onaudioprocess = (e) => {
            if (!this.isRecording || this.ws?.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = floatTo16BitPCM(input);
            this.ws.send(pcm16);
            this._chunksSent += 1;
            this._bytesSent += pcm16.byteLength;
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.captureCtx.destination);
        this.isRecording = true;
    }

    // Returns true if an utterance was actually handed to the server (i.e.
    // any audio was sent), false if there was nothing to process — the caller
    // needs to know, because showing "Thinking…" for an utterance the server
    // never received leaves the UI stuck forever.
    stopRecording() {
        if (!this.isRecording) return false;
        this.isRecording = false;
        this.processorNode?.disconnect();
        this.sourceNode?.disconnect();
        this.mediaStream?.getTracks().forEach((t) => t.stop());
        this.captureCtx?.close();
        this.processorNode = null;
        this.sourceNode = null;
        this.mediaStream = null;
        this.captureCtx = null;

        this.ws?.send(JSON.stringify({ type: 'end_utterance' }));
        return this._chunksSent > 0;
    }

    interrupt() {
        // Silence locally FIRST rather than waiting for the server's
        // "interrupted" reply: the round trip is real, and everything already
        // scheduled would keep playing until it arrived. If the turn happens
        // to have finished already, no reply comes back at all — so relying
        // on the server for this would leave audio playing with no way to
        // stop it.
        //
        // Suppression matters just as much as stopping: audio is produced
        // FASTER than realtime, so by the time an interrupt is sent the
        // server has already pushed seconds of speech that is still in
        // flight. Measured live: 49 further audio chunks arrived after the
        // interrupt was sent. Without this flag they would all be scheduled
        // and played, and Stop would appear to do nothing.
        this._suppressAudio = true;
        this._stopPlayback();
        this.ws?.send(JSON.stringify({ type: 'interrupt' }));
    }

    // ── Playback (gapless streamed PCM32 float chunks) ────────────────────
    _stopPlayback() {
        for (const src of this._scheduledSources) {
            try { src.stop(); } catch { /* already ended — stop() throws, harmless */ }
        }
        this._scheduledSources = [];
        this._nextPlaybackTime = this.playbackCtx ? this.playbackCtx.currentTime : 0;
        this._playedFirstChunkThisTurn = false;
        // Buffered-but-unscheduled audio must go too. Stop() only cancels
        // what was already handed to the audio thread, so without this the
        // next turn would open by playing the tail of the interrupted one.
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = null;
        }
        this._pending = [];
        this._pendingDuration = 0;
        this._buffering = true;
        this._bufferTarget = PREBUFFER_S;
    }

    _playAudioChunk(arrayBuffer) {
        // Dropped, not queued — see interrupt(): these are chunks the server
        // had already sent before it saw the interrupt.
        if (this._suppressAudio) return;
        // Fallback for any caller path that reaches here before
        // startRecording() ever ran (shouldn't happen in the normal
        // press-to-talk flow, but fail safe rather than throw).
        if (!this.playbackCtx) {
            this.playbackCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: PLAYBACK_SAMPLE_RATE });
            this._nextPlaybackTime = this.playbackCtx.currentTime;
        }

        const float32 = decodeMuLaw(arrayBuffer);
        if (!float32.length) return;

        // Buffering: hold the chunk until there is enough audio to play
        // through the producer's uneven pace, rather than starting on the
        // first fragment and starving.
        if (this._buffering) {
            this._pending.push(float32);
            this._pendingDuration += float32.length / PLAYBACK_SAMPLE_RATE;
            if (this._pendingDuration >= this._bufferTarget) {
                this._drainBuffer();
            } else {
                this._armFlushTimer();
            }
            return;
        }

        // Playing: if the queue has drained back to (or past) now, the
        // producer fell behind — go back to buffering instead of scheduling
        // an isolated fragment that will just starve again immediately.
        if (this._nextPlaybackTime <= this.playbackCtx.currentTime) {
            this._buffering = true;
            this._bufferTarget = REFILL_S;
            this._pending.push(float32);
            this._pendingDuration = float32.length / PLAYBACK_SAMPLE_RATE;
            this._armFlushTimer();
            return;
        }
        this._scheduleFloat32(float32);
    }

    _armFlushTimer() {
        if (this._flushTimer) clearTimeout(this._flushTimer);
        this._flushTimer = setTimeout(() => {
            this._flushTimer = null;
            if (this._pending.length) this._drainBuffer();
        }, BUFFER_FLUSH_MS);
    }

    /** Schedules everything buffered so far, contiguously, and resumes
     *  straight-through scheduling for subsequent chunks. */
    _drainBuffer() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = null;
        }
        const pending = this._pending;
        this._pending = [];
        this._pendingDuration = 0;
        this._buffering = false;
        // Start slightly ahead of the clock so the first scheduled buffer
        // isn't already in the past by the time the audio thread sees it.
        this._nextPlaybackTime = Math.max(
            this._nextPlaybackTime,
            this.playbackCtx.currentTime + 0.05,
        );
        for (const chunk of pending) this._scheduleFloat32(chunk);
    }

    _scheduleFloat32(float32) {
        const buffer = this.playbackCtx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
        buffer.copyToChannel(float32, 0);

        const source = this.playbackCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.playbackCtx.destination);

        const startAt = Math.max(this._nextPlaybackTime, this.playbackCtx.currentTime);
        source.start(startAt);
        this._scheduledSources.push(source);
        source.onended = () => {
            const i = this._scheduledSources.indexOf(source);
            if (i !== -1) this._scheduledSources.splice(i, 1);
        };
        this._nextPlaybackTime = startAt + buffer.duration;

        // Fired on the first audio actually SCHEDULED (not merely received),
        // so the UI flips to "speaking" when sound really starts rather than
        // while the buffer is still filling.
        if (!this._playedFirstChunkThisTurn) {
            this._playedFirstChunkThisTurn = true;
            this.callbacks.onAudioStart?.();
        }
    }
}
