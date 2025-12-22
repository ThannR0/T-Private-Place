import api from './api';

const paymentApi = {
    // Tạo giao dịch (Nạp/Donate)
    createTransaction: (data) => {
        // data: { amount, method: 'BANK', type: 'DEPOSIT' | 'DONATE' }
        return api.post('/payment/create', data);
    },

    // Lấy lịch sử
    getHistory: () => api.get('/payment/history'),

    // Lấy thống kê biểu đồ
    getStats: () => api.get('/payment/stats'),

    // API giả lập người dùng tự xác nhận (cho mượt UX)
    confirm: (code) => api.post(`/payment/confirm/${code}`)
};

export default paymentApi;