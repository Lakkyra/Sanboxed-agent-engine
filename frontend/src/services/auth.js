import api from './api';

export const authService = {
    async signup(name, email, password) {
        const response = await api.post('/auth/signup', { name, email, password });
        if (response.data?.token) {
            localStorage.setItem('auth_token', response.data.token);
        }
        return response.data;
    },

    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.data?.token) {
            localStorage.setItem('auth_token', response.data.token);
        }
        return response.data;
    },

    async logout() {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('auth_token');
        }
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
