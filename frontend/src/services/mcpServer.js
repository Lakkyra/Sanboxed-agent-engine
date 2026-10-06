import api from './api';
import { API_BASE_URL } from '../config';

export const mcpServerService = {
    async getServers() {
        const response = await api.get('/api/v1/mcp-servers');
        return response.data;
    },

    /**
     * config: {
     *   name, transport: 'stdio'|'sse'|'http',
     *   command, args, env,               // stdio
     *   url, headers,                     // sse/http
     *   auth_type: 'none'|'headers'|'oauth',
     * }
     */
    async addServer(config) {
        const response = await api.post('/api/v1/mcp-servers', config);
        return response.data;
    },

    async updateServer(id, data) {
        const response = await api.put(`/api/v1/mcp-servers/${id}`, data);
        return response.data;
    },

    async deleteServer(id) {
        const response = await api.delete(`/api/v1/mcp-servers/${id}`);
        return response.data;
    },

    async testConnection(id) {
        const response = await api.post(`/api/v1/mcp-servers/${id}/test`);
        return response.data;
    },

    /** Opens the OAuth authorization URL in a new tab. The backend handles
     * discovery + dynamic client registration + PKCE automatically — no
     * manual client_id/secret entry needed. */
    authorizeOAuth(id) {
        window.open(`${API_BASE_URL}/api/v1/mcp-servers/${id}/oauth/authorize`, '_blank', 'noopener,noreferrer');
    },

    async getOAuthStatus(id) {
        const response = await api.get(`/api/v1/mcp-servers/${id}/oauth/status`);
        return response.data;
    },
};
