import React, { useState } from 'react';
import { Layout, Form, Input, Button, Card, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext'; // 1. Import Settings
import { useNavigate } from 'react-router-dom';
import PageTitle from "../components/common/PageTitle.jsx";

const { Content } = Layout;
const { Title } = Typography;

const ChangePassword = () => {
    const [loading, setLoading] = useState(false);
    const { currentUser } = useChat();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { t } = useSettings(); // 2. Lấy hàm dịch

    const onFinish = async (values) => {
        setLoading(true);
        const token = localStorage.getItem('token'); // Fix typo 'acccessToken'

        if (!token){
            message.error(t('sessionExpired') || "Phiên đăng nhập hết hạn");
            setLoading(false);
            return;
        }
        try {
            // Lưu ý: Đảm bảo URL API đúng với cấu hình của bạn
            const response = await fetch('http://localhost:8081/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: currentUser,
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword
                }),
            });

            if (response.ok) {
                message.success(t('updateSuccess'));
                form.resetFields();
                localStorage.removeItem('token');
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            } else {
                const errorText = await response.text();
                message.error('Lỗi: ' + errorText);
            }
        } catch (error) {
            console.error("Change pass error:", error);
            message.error(t('connectionError') || 'Không thể kết nối đến máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    // Style chung cho các ô Input để tái sử dụng
    const inputStyle = {
        backgroundColor: 'var(--input-bg)',
        color: 'var(--text-color)',
        border: '1px solid var(--border-color)'
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)', transition: 'background 0.3s' }}>
            <PageTitle title={t('changePasswordTitle')} />

            <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <Card
                    style={{
                        width: 500, marginTop: 40,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        // SỬA CARD CHO DARK MODE
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                    title={
                        <Title level={3} style={{ textAlign: 'center', margin: 0, color: 'var(--text-color)' }}>
                            {t('changePasswordTitle')}
                        </Title>
                    }
                >
                    <Form
                        form={form}
                        name="change_password"
                        layout="vertical"
                        onFinish={onFinish}
                        autoComplete="off"
                    >
                        {/* Mật khẩu hiện tại */}
                        <Form.Item
                            label={<span style={{ color: 'var(--text-color)' }}>{t('currentPassword')}</span>}
                            name="currentPassword"
                            rules={[{ required: true, message: t('currentPassword') + '!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
                                placeholder={t('currentPassword')}
                                style={inputStyle} // Áp dụng style màu
                            />
                        </Form.Item>

                        {/* Mật khẩu mới */}
                        <Form.Item
                            label={<span style={{ color: 'var(--text-color)' }}>{t('newPassword')}</span>}
                            name="newPassword"
                            rules={[
                                { required: true, message: t('newPassword') + '!' },
                                { min: 6, message: t('passwordMin') }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
                                placeholder={t('newPassword')}
                                style={inputStyle}
                            />
                        </Form.Item>

                        {/* Nhập lại mật khẩu mới */}
                        <Form.Item
                            label={<span style={{ color: 'var(--text-color)' }}>{t('confirmPasswordLabel')}</span>}
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: t('confirmPasswordLabel') + '!' },
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
                                prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
                                placeholder={t('confirmPasswordLabel')}
                                style={inputStyle}
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                size="large"
                                style={{ background: '#6600cc', borderColor: '#6600cc', marginTop: 10 }}
                            >
                                {t('saveChanges')}
                            </Button>
                        </Form.Item>

                        <div style={{ textAlign: 'center' }}>
                            <Button
                                type="link"
                                onClick={() => navigate('/chat')}
                                style={{ color: 'var(--text-secondary)' }} // Màu chữ link
                            >
                                {t('backToChat')}
                            </Button>
                        </div>
                    </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default ChangePassword;