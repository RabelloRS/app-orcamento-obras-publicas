// api.js - Axios configuration
const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('resolve_auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

api.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        // Redirect to login if 401, but only if not already there
        if (!window.location.hash.includes('login')) {
            localStorage.removeItem('resolve_auth_token');
            window.location.hash = '#/login';
        }
    }
    return Promise.reject(error);
});

export default api;
