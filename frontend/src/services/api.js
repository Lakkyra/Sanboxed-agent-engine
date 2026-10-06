import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable sending cookies with requests
});

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Don't redirect for auth check endpoint - let it fail silently
            const isAuthCheck = originalRequest.url?.includes('/auth/me');

            // List of public pages that shouldn't trigger redirect
            const publicPaths = ['/', '/login', '/signup'];
            const isPublicPage = publicPaths.includes(window.location.pathname);

            // Only redirect if it's NOT an auth check AND NOT on a public page
            if (!isAuthCheck && !isPublicPage) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
