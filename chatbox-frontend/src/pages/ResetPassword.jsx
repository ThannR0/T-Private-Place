import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api'; // Dùng api instance chung
import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageTitle from "../components/common/PageTitle.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email'); // Lấy email từ URL
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { t } = useSettings();

    // Kiểm tra xem có email không, nếu không thì đá về trang quên mật khẩu
    useEffect(() => {
        if (!email) {
            message.error("Thiếu thông tin email!");
            navigate('/forgot-password');
        }
    }, [email, navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Gọi API Reset Password
            // Payload: { email, otp, newPassword }
            await api.post('/auth/reset-password', {
                email: email,
                otp: values.otp,
                newPassword: values.newPassword
            });

            message.success('Đổi mật khẩu thành công! Hãy đăng nhập ngay.');
            navigate('/login');
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data || "Đổi mật khẩu thất bại! Mã OTP sai hoặc hết hạn.";
            message.error(typeof errorMsg === 'string' ? errorMsg : "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t('resetTitle')} subtitle={t('resetSubtitle').replace('{{email}}', email)}>
            <PageTitle title="Đặt lại mật khẩu" />

            <Form
                form={form}
                name="reset_password"
                onFinish={onFinish}
                layout="vertical"
                size="large"
            >
                {/* Ô nhập OTP */}
                <Form.Item
                    name="otp"
                    rules={[{ required: true, message: 'Vui lòng nhập mã OTP!' }]}
                >
                    <Input
                        prefix={<KeyOutlined style={{ color: '#1890ff' }} />}
                        placeholder={t('otpPlaceholder')}
                        maxLength={6}
                        style={{ textAlign: 'center', letterSpacing: '8px', fontWeight: 'bold' }}
                    />
                </Form.Item>

                {/* Ô nhập Mật khẩu mới */}
                <Form.Item
                    name="newPassword"
                    rules={[
                        { required: true, message: t('confirmPasswordLabel') },
                        { min: 6, message: t('passwordMin') }
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined style={{ color: '#1890ff' }} />}
                        placeholder={t('newPassword')}
                    />
                </Form.Item>

                {/* Ô xác nhận mật khẩu */}
                <Form.Item
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(t('confirmMatchError')));
                            },
                        }),
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined style={{ color: '#1890ff' }} />}
                        placeholder={t('confirmPasswordLabel')}
                    />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: '45px' }}>
                        {t('confirmPassword')}
                    </Button>
                </Form.Item>
            </Form>
        </AuthLayout>
    );
};

export default ResetPassword;