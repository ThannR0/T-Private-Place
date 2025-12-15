import React, { useState } from 'react';
import { Form, Input, Button, message, Checkbox, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
import { useNavigate, Link } from "react-router-dom";
import api from '../services/api';
import { useChat } from "../context/ChatContext.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageTitle from "../components/common/PageTitle.jsx";
import { useSettings } from '../context/SettingsContext'; // 1. Import
import LanguageSelector from '../components/common/LanguageSelector'; // 2. Import Selector
const Login = () => {
    const navigate = useNavigate();
    const { loginUser } = useChat();
    const [loading, setLoading] = useState(false);
    const { t } = useSettings();

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
        <AuthLayout title={t('login')} subtitle={t('loginSubtitle')}>
            <LanguageSelector />
            <PageTitle title={t('login')} />

            <Form
                name="login_form"
                layout="vertical"
                initialValues={{ remember: true }}
                onFinish={onFinish}
                size="large"
            >
                <Form.Item
                    name="username"
                    rules={[{ required: true, message: t('username') + '!' }]}
                >
                    <Input prefix={<UserOutlined style={{ color: '#1890ff' }} />} placeholder={t('username')} />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: t('password') }]}
                >
                    <Input.Password prefix={<LockOutlined style={{ color: '#1890ff' }} />} placeholder={t('password')} />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox>{t('rememberMe')}</Checkbox>
                    </Form.Item>
                    <Link to="/forgot-password" style={{ color: '#1890ff', fontWeight: 500 }}>{t('forgotPassword')}</Link>
                </div>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: '45px', borderRadius: '6px', fontSize: '16px' }}>
                        {t('login')}
                    </Button>
                </Form.Item>

                <Divider plain><span style={{ color: '#ccc', fontSize: '12px' }}>{t('orLoginWith')}</span></Divider>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                    <Button icon={<GoogleOutlined />} block>Google</Button>
                    <Button icon={<GithubOutlined />} block>GitHub</Button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    {t('noAccount')} <Link to="/register" style={{ color: '#1890ff', fontWeight: 'bold' }}>{t('registerNow')}</Link>
                </div>
            </Form>
        </AuthLayout>
    );
};

export default Login;