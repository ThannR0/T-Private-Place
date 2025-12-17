import api from './api'; // Import instance axios gốc của bạn

const scheduleApi = {
    // Lấy lịch theo khoảng thời gian (Start - End)
    getSchedules: (start, end) => {
        return api.get('/schedules', {
            params: { start, end }
        });
    },

    create: (data) => api.post('/schedules/create', data),

    update: (data) => api.put('/schedules/update', data),

    delete: (id) => api.delete(`/schedules/${id}`),

    // Gọi AI tóm tắt
    getAiSummary: (date) => {
        return api.get('/schedules/summary', {
            params: { date } // date format: YYYY-MM-DD
        });
    }
};

export default scheduleApi;