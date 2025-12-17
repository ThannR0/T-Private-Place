import axios from 'axios';

// Tạo một instance của Axios để dùng chung
const api = axios.create({
    baseURL: 'http://localhost:8081/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Trước khi gửi request, nếu có Token thì đính kèm vào Header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 403) {
            console.error("⛔ Bị chặn (403): Token hết hạn hoặc không có quyền!");
        }
        return Promise.reject(error);
    }
);

export default api;