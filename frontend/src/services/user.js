import api from './api';

export const userService = {
    /**
     * Gets the user's extracted memories.
     */
    async getMemories() {
        const response = await api.get('/api/users/memories');
        return response.data;
    },

    /**
     * Clears all user memories.
     */
    async clearMemories() {
        const response = await api.delete('/api/users/memories');
        return response.data;
    },

    /**
     * Gets the current user's own credit usage/cap.
     */
    async getCredits() {
        const response = await api.get('/api/users/credits');
        return response.data;
    }
};
