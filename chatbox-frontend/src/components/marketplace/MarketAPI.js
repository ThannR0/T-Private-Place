import api from '../../services/api';
import axios from 'axios';

const getHeader = () => {
    const token = localStorage.getItem('token'); // Hoặc nơi bạn lưu token
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};
export const marketApi = {
    // --- USER (Giữ nguyên) ---
    getAllProducts: () => api.get('/market/products'),
    createProduct: (formData) => {
        return axios.post('/api/market/products', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Bắt buộc dòng này để gửi file
                // Token Auth thường được axios interceptor tự thêm, nếu chưa thì thêm vào đây
                'Authorization': `Bearer ${localStorage.get('token')}`
            }
        });
    },

    // Kiểm tra xem user đã có shop chưa
    getMyShopInfo: () => api.get('/market/shop/me'),
    // Đăng ký shop mới
    registerShop: (formData) => {
        return axios.post('/api/market/shop/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Quan trọng
                'Authorization': `Bearer ${localStorage.get('token')}`
            }
        });
    },

    // Sửa (Update)
    updateVoucher: (id, data) => axios.put(`/market/vouchers/${id}`, data, getHeader()),


    // Voucher User
    getMyVouchers: () => axios.get('/market/vouchers/my-vouchers', getHeader()),
    hideVoucher: (id) => axios.put(`/market/vouchers/${id}/hide`, {}, getHeader()),

    // Voucher Admin
    getAllVouchers: () => axios.get('/market/vouchers/all', getHeader()), // Sửa lại đường dẫn nếu cần
    createVoucher: (data) => axios.post('/market/vouchers/create', data, getHeader()),
    deleteVoucher: (id) => axios.delete(`/market/vouchers/${id}`, getHeader()),
    syncVouchers: () => axios.post('/vouchers/admin/sync-missing', {}, getHeader()),

    // --- REVIEW ---
    // Lấy đánh giá của sản phẩm
    getProductReviews: (productId) => api.get(`/market/reviews/${productId}`),
    // Gửi đánh giá
    createReview: (data) => api.post('/market/reviews', data),
    getProductDetail: (id) => api.get(`/market/products/${id}`),

    // Lấy thông tin Shop công khai theo userId hoặc username
    getShopProfile: (username) => api.get(`/market/shop/profile/${username}`),

    // Lấy danh sách sản phẩm của một Shop cụ thể
    getShopProducts: (username) => api.get(`/market/shop/${username}/products`),

    // Cập nhật thông tin Shop (Cho chủ shop)
    updateShopInfo: (data) => api.put('/market/shop/update', data),

    createOrder: (data) => api.post('/market/orders/create', data),
    getMyOrders: () => api.get('/market/orders/my-orders'),
    updateOrderStatus: (id, status) => api.put(`/market/orders/${id}/status`, null, { params: { status } }),

    getPendingProducts: () => api.get('/admin/market/products/pending'),

    getAllProductsAdmin: () => api.get('/admin/market/products/all'),

    approveProduct: (id, approved) => api.put(`/admin/market/products/${id}/approve`, null, { params: { approved } }),

    deleteProduct: (id) => api.delete(`/admin/market/products/${id}`),


    getAllOrdersAdmin: () => api.get('/admin/market/orders'),

    getMyProducts: () => api.get('/market/my-products'),
    getMySales: () => api.get('/market/my-sales'),

    checkVoucher: (code) => api.get('/market/vouchers/check', { params: { code } }),
    adminUpdateOrderStatus: (id, status) => api.put(`/admin/market/orders/${id}/status`, null, { params: { status } }),

    getAdminStats: () => api.get('/admin/market/dashboard/stats'),
    getAdminRevenueChart: () => api.get('/admin/market/dashboard/chart'),
    getAdminAdvancedStats: () => api.get('/admin/market/dashboard/advanced'),



};