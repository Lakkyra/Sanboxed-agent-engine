import api from './api';
import { API_BASE_URL } from '../config';

export const parserService = {
    /** Non-streaming parse (returns the whole result at once). */
    async parse(file, mode = 'auto', maxPages = 0) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('mode', mode);
        fd.append('max_pages', String(maxPages));
        const res = await api.post('/api/parser/parse', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 600000,
        });
        return res.data;
    },

    /** Streaming parse — calls onEvent(ev) for each SSE event: start | page | done | error. */
    async parseStream(file, mode, maxPages, judge, onEvent, signal) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('mode', mode);
        fd.append('max_pages', String(maxPages));
        fd.append('judge', String(!!judge));

        const res = await fetch(`${API_BASE_URL}/api/parser/parse/stream`, {
            method: 'POST',
            credentials: 'include',
            signal,
            body: fd,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop();
            for (const block of blocks) {
                const line = block.trim();
                if (line.startsWith('data:')) {
                    try { onEvent(JSON.parse(line.slice(5).trim())); } catch (_) { /* ignore */ }
                }
            }
        }
    },

    async health() {
        const res = await api.get('/api/parser/health');
        return res.data;
    },
};
