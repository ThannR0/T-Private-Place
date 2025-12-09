import React, { useState } from 'react';
import { Layout, Form, Input, Button, Card, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import AppHeader from "../components/layout/AppHeader.jsx"; // Đảm bảo đường dẫn import đúng
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import PageTitle from "../components/common/PageTitle.jsx";

const { Content } = Layout;
const { Title } = Typography;

const ChangePassword = () => {
    const [loading, setLoading] = useState(false);
    const { currentUser } = useChat(); // Lấy email/username hiện tại từ context
    const navigate = useNavigate();
    const [form] = Form.useForm();


    const onFinish = async (values) => {
        setLoading(true);
        const token = localStorage.getItem('acccessToken') || localStorage.getItem('token');

        if (!token){
            message.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
            setLoading(false);
            return ;
        }
        try {
            // Gọi API Backend
            const response = await fetch('http://localhost:8081/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Thêm Authorization header nếu cần (ví dụ: 'Bearer ' + token)
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: currentUser, // Lấy từ context
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword
                }),
            });

            if (response.ok) {
                message.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
                form.resetFields();
                localStorage.removeItem('token');
                // localStorage.removeItem('user');
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            } else {
                const errorText = await response.text();
                message.error('Lỗi: ' + errorText);
            }
        } catch (error) {
            console.error("Change pass error:", error);
            message.error('Không thể kết nối đến máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <PageTitle title="Đổi mật khẩu" />
            <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <Card
                    style={{ width: 500, marginTop: 40, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    title={<Title level={3} style={{ textAlign: 'center', margin: 0 }}>Đổi Mật Khẩu</Title>}
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
                            label="Mật khẩu hiện tại"
                            name="currentPassword"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu cũ" />
                        </Form.Item>

                        {/* Mật khẩu mới */}
                        <Form.Item
                            label="Mật khẩu mới"
                            name="newPassword"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
                        </Form.Item>

                        {/* Nhập lại mật khẩu mới */}
                        <Form.Item
                            label="Xác nhận mật khẩu mới"
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ background: '#6600cc', borderColor: '#6600cc' }}>
                                Xác nhận đổi mật khẩu
                            </Button>
                        </Form.Item>

                        <div style={{ textAlign: 'center' }}>
                            <Button type="link" onClick={() => navigate('/chat')}>Quay lại nhắn tin</Button>
                        </div>
                    </Form>
                </Card>
            </Content>
        </Layout>
    );
};

export default ChangePassword;