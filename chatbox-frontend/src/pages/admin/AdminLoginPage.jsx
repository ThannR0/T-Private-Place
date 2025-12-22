import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';

const { Title } = Typography;

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const { setCurrentUser } = useChat(); // Hàm set user vào context
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/login', values);

            // 🟢 SỬA LỖI: Backend trả về dạng phẳng, không có object 'user' lồng bên trong
            // Cấu trúc: { token: "...", username: "...", role: "ADMIN", ... }
            const { token, username, fullName, avatar, role } = res.data;

            // Tự tạo object user để lưu vào Context
            const user = { username, fullName, avatar, role };

            // 🛡️ CHECK QUYỀN (Logic đơn giản vì giờ role là String)
            if (role !== "ROLE_ADMIN") {
                message.error("Truy cập bị từ chối! Tài khoản không có quyền ROLE_ADMIN.");
                setLoading(false);
                return;
            }

            // Đăng nhập thành công
            localStorage.setItem('token', token);
            setCurrentUser(user);
            message.success("Chào mừng quay lại, Sếp!");
            navigate('/admin/dashboard');

        } catch (error) {
            console.error("LOGIN ERROR:", error);
            if (error.response && error.response.status === 401) {
                message.error("Sai tài khoản hoặc mật khẩu!");
            } else {
                message.error("Lỗi đăng nhập: " + (error.response?.data?.message || "Không xác định"));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            background: '#141414', // Nền đen cho ngầu và khác biệt
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <Card style={{ width: 400, borderRadius: 12, textAlign: 'center' }}>
                <SafetyCertificateOutlined style={{ fontSize: 40, color: '#faad14', marginBottom: 20 }} />
                <Title level={3} style={{ marginBottom: 30 }}>Quản Trị Hệ Thống</Title>

                <Form
                    name="admin_login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Nhập Username' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Tài khoản Admin" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Nhập Password' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu bảo mật" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}
                                style={{ background: '#faad14', borderColor: '#faad14', color: '#000', fontWeight: 'bold' }}>
                            ĐĂNG NHẬP
                        </Button>
                    </Form.Item>
                </Form>
                <div style={{ color: '#999', fontSize: 12 }}>
                    Khu vực hạn chế. IP của bạn đang được ghi lại.
                </div>
            </Card>
        </div>
    );
};

export default AdminLoginPage;