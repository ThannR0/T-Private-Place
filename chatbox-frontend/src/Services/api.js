import axios from 'axios';

// Tạo một instance của Axios để dùng chung
const api = axios.create({
    baseURL: 'http://localhost:8081/api', // Đường dẫn tới Backend Spring Boot
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

export default api;