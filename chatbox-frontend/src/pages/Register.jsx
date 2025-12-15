import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageTitle from "../components/common/PageTitle.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const { t } = useSettings();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Gọi API đăng ký
            await api.post('/auth/register', values);
            message.success('Đăng ký thành công! Đang chuyển hướng...');

            // Chuyển sang trang Verify kèm email
            navigate(`/verify?email=${values.email}`);
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data || "Đăng ký thất bại!";
            message.error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t('registerTitle')} subtitle={t('registerSubtitle')}>
            <PageTitle title={t('registerTitle')} />

            <Form name="register" onFinish={onFinish} layout="vertical" size="large">

                {/* Field: Họ và tên (Khớp với Backend fullName) */}
                <Form.Item name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                    <Input prefix={<IdcardOutlined style={{ color: '#1890ff' }} />} placeholder={t('fullName')}/>
                </Form.Item>

                <Form.Item name="username" rules={[{ required: true, message: 'Vui lòng nhập username!' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#1890ff' }} />} placeholder={t('username')} />
                </Form.Item>

                <Form.Item name="email" rules={[{ required: true, message: 'Nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}>
                    <Input prefix={<MailOutlined style={{ color: '#1890ff' }} />} placeholder={t('email')} />
                </Form.Item>

                <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu!' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
                    <Input.Password prefix={<LockOutlined style={{ color: '#1890ff' }} />} placeholder={t('password')} />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: '45px', borderRadius: '6px' }}>
                        {t('registerFree')}
                    </Button>
                </Form.Item>

                <div style={{ textAlign: 'center' }}>
                    {t('haveAccount')} <Link to="/login" style={{ color: '#1890ff', fontWeight: 'bold' }}>{t('login')}</Link>
                </div>
            </Form>
        </AuthLayout>
    );
};

export default Register;