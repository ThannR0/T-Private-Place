import React from 'react';
import { Navigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { message } from 'antd';

const AdminProtectedRoute = ({ children }) => {
    const { currentUser } = useChat();

    // Lấy role từ localStorage cho chắc ăn (vì currentUser trong context có thể chỉ là username string)
    // Lưu ý: Đây là check phía client để chuyển hướng nhanh. Backend vẫn phải check token.
    // Nếu bạn đã lưu đầy đủ user object vào currentUser thì dùng currentUser.role
    // Ở đây mình giả định lấy token để check đơn giản là đã login chưa
    const token = localStorage.getItem('token');

    // Nếu chưa đăng nhập
    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }

    // Logic này tùy thuộc vào cách bạn lưu role ở frontend
    // Tốt nhất là gọi API /me để check role, nhưng để đơn giản ta tạm cho qua nếu có token
    // (Vì API Admin bên trong sẽ chặn nếu token không phải Admin)

    return children;
};

export default AdminProtectedRoute;