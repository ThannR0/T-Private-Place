import React, { useState } from 'react';
import { Form, Input, Button, Result, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../services/api'; // Sử dụng chung instance axios với Login/Register
import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageTitle from "../components/common/PageTitle.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const ForgotPassword = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const { t } = useSettings();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Gọi API Backend: POST /auth/forgot-password
            // Coach đã đổi từ fetch sang api (axios) cho đồng bộ với dự án
            await api.post("/auth/forgot-password", { email: values.email });

            setSubmittedEmail(values.email);
            setIsSubmitted(true); // Chuyển sang giao diện thông báo thành công
        } catch (error) {
            console.error("Lỗi quên mật khẩu:", error);
            const errorMsg = error.response?.data || "Có lỗi xảy ra, vui lòng thử lại.";
            message.error(typeof errorMsg === 'string' ? errorMsg : "Gửi yêu cầu thất bại.");
        } finally {
            setLoading(false);
        }
    };

    // --- TRƯỜNG HỢP 1: ĐÃ GỬI THÀNH CÔNG (HIỆN THÔNG BÁO) ---
    if (isSubmitted) {
        return (
            <AuthLayout title={t('checkEmailTitle')} subtitle={t('checkEmailDesc').replace('{{email}}', submittedEmail)}>
                <PageTitle title="Đã gửi email" />

                <Result
                    status={t('checkEmailTitle')}
                    title="Kiểm tra email nhé!"
                    subTitle={
                        <span>
                            {t('checkEmailDesc').replace('{{email}}', submittedEmail)}
                        </span>
                    }
                    extra={[
                        <Link to={`/reset-password?email=${submittedEmail}`} key="next">
                            <Button type="primary" size="large" style={{ borderRadius: '6px' }}>
                                {t('enterOtpNow')}
                            </Button>
                        </Link>,
                        <div key="back" style={{ marginTop: '20px' }}>
                            <Link to="/login" style={{ color: '#888' }}>
                                <ArrowLeftOutlined /> {t('backToLogin')}
                            </Link>
                        </div>
                    ]}
                />
            </AuthLayout>
        );
    }

    // --- TRƯỜNG HỢP 2: FORM NHẬP EMAIL ---
    return (
        <AuthLayout title={t('forgotTitle')} subtitle={t('forgotSubtitle')}>
            <PageTitle title="Quên mật khẩu" />

            <Form
                name="forgot_password"
                layout="vertical"
                onFinish={onFinish}
                size="large"
            >
                <Form.Item
                    name="email"
                    rules={[
                        { required: true, message: 'Vui lòng nhập email đã đăng ký!' },
                        { type: 'email', message: 'Email không hợp lệ!' }
                    ]}
                >
                    <Input
                        prefix={<MailOutlined style={{ color: '#1890ff' }} />}
                        placeholder="name@example.com"
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                        style={{ height: '45px', borderRadius: '6px' }}
                    >
                        {loading ? t('sending') : t('sendOtp')}
                    </Button>
                </Form.Item>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <Link to="/login" style={{ color: '#595959', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeftOutlined /> {t('backToLogin')}
                    </Link>
                </div>
            </Form>
        </AuthLayout>
    );
};

export default ForgotPassword;