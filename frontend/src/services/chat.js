import api from './api';
import { API_BASE_URL } from '../config';

// Shared by sendMessageStream/sendMessageStreamMultimodal/resumeStream — all
// three consume the identical SSE wire format (see backend services/chat_service.py's
// turn_manager.publish() calls), so the parsing loop only needs to exist once.
async function _consumeSSE(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    let finalConversationId = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                    const err = new Error(data.error);
                    if (data.error_code) err.code = data.error_code;
                    throw err;
                }

                if (data.chunk) {
                    fullResponse += data.chunk;
                    onChunk({ type: 'text', content: data.chunk });
                }
                if (data.tool_call) {
                    onChunk({ type: 'tool_call', data: data.tool_call });
                }
                if (data.tool_output) {
                    onChunk({ type: 'tool_output', data: data.tool_output });
                }
                if (data.skill_used) {
                    onChunk({ type: 'skill_used', data: data.skill_used });
                }
                if (data.artifact_created) {
                    onChunk({ type: 'artifact_created', data: data.artifact_created });
                }
                if (data.files_created) {
                    onChunk({ type: 'files_created', data: data.files_created });
                }
                if (data.exec_output) {
                    onChunk({ type: 'exec_output', data: data.exec_output });
                }
                // Turn was cancelled server-side (stopGeneration, or a
                // resumed-elsewhere turn that got stopped) — distinct from
                // the client-side AbortError path (this tab's own fetch
                // being aborted), which is handled by the caller's catch
                // block instead. Both end up marking the message stopped.
                if (data.stopped) {
                    onChunk({ type: 'stopped', reason: data.stop_reason, message_id: data.message_id });
                }

                if (data.done) {
                    finalConversationId = data.conversation_id;
                    // Real Mongo _id of the message just streamed — without it
                    // the action bar (rate/retry) would be dead until reload.
                    if (data.message_id) onChunk({ type: 'persisted', message_id: data.message_id });
                }
            }
        }
    }

    return {
        response: fullResponse,
        conversation_id: finalConversationId,
    };
}

export const chatService = {
    async sendMessageStream(message, conversationId = null, mcpServerIds = [], model = "antigravity/gemini-3.7-flash-medium", enabledTools = [], selectedFiles = [], onChunk, signal = undefined) {
        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal,
            body: JSON.stringify({
                message,
                conversation_id: conversationId,
                mcp_server_ids: mcpServerIds,
                model: model,
                enabled_tools: enabledTools,
                selected_files: selectedFiles
            }),
        });

        const result = await _consumeSSE(response, onChunk);
        return {
            ...result,
            conversation_id: result.conversation_id ?? conversationId,
        };
    },

    async sendMessageStreamMultimodal(message, conversationId = null, mcpServerIds = [], model = 'antigravity/gemini-3.7-flash-medium', images = [], enabledTools = [], selectedFiles = [], onChunk, signal = undefined) {
        const formData = new FormData();
        formData.append('message', message);
        if (conversationId) formData.append('conversation_id', conversationId);
        if (mcpServerIds && mcpServerIds.length > 0) {
            formData.append('mcp_server_ids', JSON.stringify(mcpServerIds));
        }
        formData.append('model', model);
        if (enabledTools && enabledTools.length > 0) {
            formData.append('enabled_tools', JSON.stringify(enabledTools));
        }
        if (selectedFiles && selectedFiles.length > 0) {
            formData.append('selected_files', JSON.stringify(selectedFiles));
        }

        images.forEach((imgObj) => {
            if (imgObj.file) {
                formData.append('images', imgObj.file);
            } else {
                formData.append('images', imgObj); // fallback if it's already a File
            }
        });

        const response = await fetch(`${API_BASE_URL}/chat/stream/multimodal`, {
            method: 'POST',
            credentials: 'include',
            signal,
            body: formData,
        });

        const result = await _consumeSSE(response, onChunk);
        return {
            ...result,
            conversation_id: result.conversation_id ?? conversationId,
        };
    },

    // Reattach to an in-progress turn (e.g. the page was reloaded mid-generation)
    // and keep streaming it live — same event shapes as sendMessageStream, just
    // sourced from the backend's turn_manager replay+live-forward instead of
    // driving the agent directly.
    async resumeStream(conversationId, onChunk, signal = undefined) {
        const response = await fetch(`${API_BASE_URL}/chat/${conversationId}/resume`, {
            method: 'GET',
            credentials: 'include',
            signal,
        });
        return _consumeSSE(response, onChunk);
    },

    // Cheap check for whether this conversation has a turn in progress right
    // now — call before resumeStream (e.g. on page load) rather than always
    // opening a stream speculatively.
    async checkActiveTurn(conversationId) {
        const response = await api.get(`/chat/${conversationId}/active-turn`);
        return response.data.active;
    },

    // Cancels the conversation's in-progress turn server-side. The caller
    // should ALSO abort its own local fetch (if it's the tab that started
    // the turn) for instant UI feedback — this call is what makes the stop
    // durable regardless of which tab is watching.
    async stopGeneration(conversationId) {
        const response = await api.post(`/chat/${conversationId}/stop`);
        return response.data.stopped;
    },

    // Regenerate the conversation's most recent assistant response, replacing
    // it in place. Same SSE wire format as sendMessageStream, so it reuses the
    // identical _consumeSSE parser and the caller's identical onChunk wiring.
    async retryMessage(conversationId, messageId, { model, enabledTools = [], mcpServerIds = [], selectedFiles = [] } = {}, onChunk, signal = undefined) {
        const response = await fetch(`${API_BASE_URL}/chat/${conversationId}/messages/${messageId}/retry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal,
            body: JSON.stringify({
                model: model ?? null,
                enabled_tools: enabledTools,
                mcp_server_ids: mcpServerIds,
                selected_files: selectedFiles,
            }),
        });
        return _consumeSSE(response, onChunk);
    },

    // Thumbs up/down on an assistant message. rating === null clears it.
    async submitFeedback(conversationId, messageId, rating, reason = null) {
        const response = await api.patch(
            `/conversations/${conversationId}/messages/${messageId}/feedback`,
            { rating, reason }
        );
        return response.data;
    },

    async renameConversation(conversationId, title) {
        const response = await api.patch(`/conversations/${conversationId}`, { title });
        return response.data;
    },

    async getConversations() {
        const response = await api.get('/conversations');
        return response.data;
    },

    async getMessages(conversationId) {
        const response = await api.get(`/conversations/${conversationId}/messages`);
        return response.data;
    },

    async deleteConversation(conversationId) {
        const response = await api.delete(`/conversations/${conversationId}`);
        return response.data;
    },
};
