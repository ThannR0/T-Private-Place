import React, { useState } from 'react';
import { Form, Input, Button, message, Checkbox, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
import { useNavigate, Link } from "react-router-dom";
import api from '../services/api';
import { useChat } from "../context/ChatContext.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageTitle from "../components/common/PageTitle.jsx";

const Login = () => {
    const navigate = useNavigate();
    const { loginUser } = useChat();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Gọi API Login
            const response = await api.post('/auth/login', values);

            // Chuẩn bị dữ liệu lưu trữ
            const dataToSave = {
                ...response.data,
                // Fallback: Nếu backend chưa trả fullName, dùng username
                fullName: response.data.fullName || response.data.username
            };

            // Gọi hàm loginUser của Context để lưu và update State
            loginUser(dataToSave);

            message.success('Chào mừng trở lại!');
            navigate('/chat'); // Chuyển hướng
        } catch (error) {
            console.error("Lỗi đăng nhập: ", error);
            const errorMsg = error.response?.data || "Tài khoản hoặc mật khẩu không đúng!";
            message.error(typeof errorMsg === 'string' ? errorMsg : "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Đăng nhập" subtitle="Nhập thông tin để truy cập tài khoản của bạn.">
            <PageTitle title="Đăng nhập" />

            <Form
                name="login_form"
                layout="vertical"
                initialValues={{ remember: true }}
                onFinish={onFinish}
                size="large"
            >
                <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
                >
                    <Input prefix={<UserOutlined style={{ color: '#1890ff' }} />} placeholder="Tên đăng nhập" />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                >
                    <Input.Password prefix={<LockOutlined style={{ color: '#1890ff' }} />} placeholder="Mật khẩu" />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox>Ghi nhớ tôi</Checkbox>
                    </Form.Item>
                    <Link to="/forgot-password" style={{ color: '#1890ff', fontWeight: 500 }}>Quên mật khẩu?</Link>
                </div>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: '45px', borderRadius: '6px', fontSize: '16px' }}>
                        Đăng nhập
                    </Button>
                </Form.Item>

                <Divider plain><span style={{ color: '#ccc', fontSize: '12px' }}>Hoặc đăng nhập với</span></Divider>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                    <Button icon={<GoogleOutlined />} block>Google</Button>
                    <Button icon={<GithubOutlined />} block>GitHub</Button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    Chưa có tài khoản? <Link to="/register" style={{ color: '#1890ff', fontWeight: 'bold' }}>Đăng ký ngay</Link>
                </div>
            </Form>
        </AuthLayout>
    );
};

export default Login;