import { API_BASE_URL } from '../config';

const adminFetch = (path) =>
    fetch(`${API_BASE_URL}${path}`, { credentials: 'include' }).then(async (r) => {
        if (!r.ok) throw new Error(`Admin API error: ${r.status}`);
        return r.json();
    });

export const adminService = {
    getOverview:      ()                          => adminFetch('/admin/overview'),
    getUsers:         (page = 1, limit = 20)      => adminFetch(`/admin/users?page=${page}&limit=${limit}`),
    getUserSessions:  (userId)                    => adminFetch(`/admin/users/${userId}/sessions`),
    getSessionTurns:  (userId, convId)            => adminFetch(`/admin/users/${userId}/sessions/${convId}`),
    getDailyUsage:    ()                          => adminFetch('/admin/usage/daily'),
    getModelUsage:    ()                          => adminFetch('/admin/usage/models'),
    getToolUsage:     ()                          => adminFetch('/admin/usage/tools'),
};
