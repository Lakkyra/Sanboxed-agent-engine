import api from './api';

export const authService = {
    async signup(name, email, password) {
        const response = await api.post('/auth/signup', { name, email, password });
        // No need to store token, it's in the cookie
        return response.data;
    },

    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        // No need to store token, it's in the cookie
        return response.data;
    },

    async logout() {
        await api.post('/auth/logout');
        // Clear any local user data if we were caching it
    },

    async getCurrentUser() {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            return null;
        }
    },

    async checkGoogleDriveStatus() {
        try {
            const response = await api.get('/api/auth/google-drive/status');
            return response.data;
        } catch (error) {
            return { authenticated: false };
        }
    },

    async disconnectGoogleDrive() {
        try {
            const response = await api.post('/oauth/google/disconnect');
            return response.data;
        } catch (error) {
            return { success: false };
        }
    },
};
