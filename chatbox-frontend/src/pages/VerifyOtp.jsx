import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { NumberOutlined, MailOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageTitle from "../components/common/PageTitle.jsx";

const { Text } = Typography;

const VerifyOtp = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const emailFromUrl = searchParams.get('email');
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (emailFromUrl) {
            form.setFieldsValue({ email: emailFromUrl });
        }
    }, [emailFromUrl, form]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Gọi API xác thực
            await api.post(`/auth/verify?email=${values.email}&otp=${values.otp}`);
            message.success('Kích hoạt thành công! Bạn có thể đăng nhập.');
            navigate('/login');
        } catch (error) {
            const errorMsg = error.response?.data || "Mã OTP không đúng!";
            message.error(typeof errorMsg === 'string' ? errorMsg : "Xác thực thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Xác thực OTP" subtitle="Mã xác minh đã được gửi đến email của bạn.">
            <PageTitle title="Verify OTP" />

            <Form form={form} name="verify" onFinish={onFinish} layout="vertical" size="large">
                <Form.Item name="email" rules={[{ required: true, message: 'Cần có email!' }]}>
                    <Input prefix={<MailOutlined style={{ color: '#1890ff' }} />} placeholder="Email đăng ký" disabled />
                </Form.Item>

                <Form.Item name="otp" rules={[{ required: true, message: 'Nhập mã OTP!' }]}>
                    <Input
                        prefix={<NumberOutlined style={{ color: '#1890ff' }} />}
                        placeholder="Mã OTP (6 số)"
                        maxLength={6}
                        style={{ textAlign: 'center', letterSpacing: '8px', fontWeight: 'bold', fontSize: '18px' }}
                    />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ height: '45px' }}>
                        Kích hoạt tài khoản
                    </Button>
                </Form.Item>

                <div style={{ textAlign: 'center' }}>
                    <Link to="/login">Quay lại đăng nhập</Link>
                </div>
            </Form>
        </AuthLayout>
    );
};

export default VerifyOtp;