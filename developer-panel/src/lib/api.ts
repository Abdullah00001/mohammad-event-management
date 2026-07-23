import axios from 'axios';

// API instance configured for standard developer panel requests
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // Crucial for cookie-based auth (accesstoken/refreshtoken)
});

// Response interceptor for automatic token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried this exact request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the session
        // Assuming the backend has a POST /admin/auth/refresh endpoint
        // Since withCredentials is true, the refreshtoken cookie will be sent automatically
        await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api'}/admin/auth/refresh`, {}, { withCredentials: true });

        // If successful, retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear context (optional fallback) and redirect to login
        // Real logic will likely hook into a global AuthProvider or window redirect
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
