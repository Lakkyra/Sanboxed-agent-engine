// DictationClient — voice-to-TEXT only, the sibling of VoiceClient with
// everything about a full agent turn stripped out: no TTS, no agent, no
// tool events, no credit gating. Talks to backend/routes/voice_routes.py's
// /voice/dictate endpoint, which is a deliberately separate and much
// simpler route than /voice/ws for exactly this reason.
//
// One utterance per connection by design, matching the actual UX this is
// for: press the mic, speak, press again, the transcribed text lands in
// the message box. There's no ongoing session to manage.

import { wsUrlFromApiBase } from './voiceClient';

const CAPTURE_SAMPLE_RATE = 16000;
const CAPTURE_BUFFER_SIZE = 4096;

function floatTo16BitPCM(float32Array) {
    const out = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out.buffer;
}

export class DictationClient {
    constructor({ onTranscriptPartial, onTranscriptFinal, onAudioLevel, onDone, onError } = {}) {
        this.callbacks = { onTranscriptPartial, onTranscriptFinal, onAudioLevel, onDone, onError };
        this.ws = null;
        this.captureCtx = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.processorNode = null;
        this.isRecording = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const url = wsUrlFromApiBase('/voice/dictate');
            this.ws = new WebSocket(url);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => {
                this.callbacks.onError?.('WebSocket connection error');
                reject(err);
            };
            this.ws.onmessage = (event) => this._handleMessage(event);
            this.ws.onclose = () => { this.ws = null; };
        });
    }

    _handleMessage(event) {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }
        switch (msg.type) {
            case 'transcript_partial':
                this.callbacks.onTranscriptPartial?.(msg.text);
                break;
            case 'transcript_final':
                // Sarvam (the default STT provider) has no true token-by-token
                // interim stream — each 'transcript_final' IS the live update,
                // arriving roughly every ~600-800ms of accumulated speech
                // WHILE the user is still talking (voice/sarvam_stt.py sends
                // one WAV-wrapped chunk per that window and gets a segment
                // back), not just once at the end. Previously dropped
                // entirely here (fell through to default), which is why the
                // dictation box only ever showed text after you stopped
                // talking instead of growing live.
                this.callbacks.onTranscriptFinal?.(msg.text);
                break;
            case 'done':
                this.callbacks.onDone?.(msg.text || '');
                break;
            case 'error':
                this.callbacks.onError?.(msg.message);
                break;
            default:
                break;
        }
    }

    async startRecording() {
        if (this.isRecording) return;
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Same capture approach as VoiceClient — Chrome honors a requested
        // sampleRate on AudioContext construction, so no separate resample
        // step is needed to match the backend's 16kHz expectation.
        this.captureCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: CAPTURE_SAMPLE_RATE });
        this.sourceNode = this.captureCtx.createMediaStreamSource(this.mediaStream);
        this.processorNode = this.captureCtx.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);

        this.processorNode.onaudioprocess = (e) => {
            if (!this.isRecording) return;
            const input = e.inputBuffer.getChannelData(0);
            // Peak amplitude of this buffer (~256ms), fed to the UI for a
            // real waveform reacting to actual mic input, not a canned
            // animation — cheap to compute (one pass, already have the
            // samples in hand for the PCM conversion below).
            let peak = 0;
            for (let i = 0; i < input.length; i++) {
                const abs = Math.abs(input[i]);
                if (abs > peak) peak = abs;
            }
            this.callbacks.onAudioLevel?.(peak);
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(floatTo16BitPCM(input));
            }
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.captureCtx.destination);
        this.isRecording = true;
    }

    stopRecording() {
        if (!this.isRecording) return;
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
    }

    // Discards the utterance in progress — stops capture and closes the
    // socket WITHOUT sending end_utterance, so the server never runs
    // stream_transcribe's finalization at all and no 'done' ever comes
    // back. Distinct from stopRecording(), which asks the server to
    // finalize and reply with the transcript.
    cancel() {
        this.isRecording = false;
        this.processorNode?.disconnect();
        this.sourceNode?.disconnect();
        this.mediaStream?.getTracks().forEach((t) => t.stop());
        this.captureCtx?.close();
        this.processorNode = null;
        this.sourceNode = null;
        this.mediaStream = null;
        this.captureCtx = null;
        this.ws?.close();
        this.ws = null;
    }

    disconnect() {
        this.stopRecording();
        this.ws?.close();
        this.ws = null;
    }
}
