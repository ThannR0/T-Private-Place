import React from 'react';
import { Layout, Menu, Button, Typography, message } from 'antd';
import {
    DashboardOutlined,
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
    DollarCircleOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logoutUser } = useChat();

    const handleLogout = () => {
        logoutUser();
        message.success("Đã đăng xuất Admin");
        navigate('/admin/login');
    };

    // Menu Items
    const items = [
        {
            key: '/admin/dashboard',
            icon: <DollarCircleOutlined />,
            label: 'Quản lý Giao dịch',
            onClick: () => navigate('/admin/dashboard'),
        },
        {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: 'Quản lý Người dùng',
            // disabled: true,
            onClick: () => navigate('/admin/users'),
        },
        {
            key: '/admin/settings',
            icon: <SettingOutlined />,
            label: 'Cài đặt hệ thống',
            disabled: true,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 1. SIDEBAR (Thanh bên trái) */}
            <Sider width={250} theme="dark" collapsible>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #333' }}>
                    <div style={{
                        width: 40, height: 40, background: '#faad14', borderRadius: '50%',
                        margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: 20
                    }}>
                        A
                    </div>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>ADMIN PORTAL</span>
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    style={{ marginTop: 20 }}
                />

                <div style={{ position: 'absolute', bottom: 20, width: '100%', padding: '0 20px' }}>
                    <Button
                        type="primary"
                        danger
                        icon={<LogoutOutlined />}
                        block
                        onClick={handleLogout}
                    >
                        Đăng xuất
                    </Button>
                </div>
            </Sider>

            {/* 2. MAIN CONTENT (Nội dung bên phải) */}
            <Layout>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
                    <Title level={4} style={{ margin: 0 }}>Hệ Thống Quản Trị T Private Place</Title>
                    <span style={{ fontWeight: 'bold', color: '#555' }}>Admin</span>
                </Header>

                <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: '#f0f2f5' }}>
                    {/* 👇 Đây là nơi các trang con (AdminPaymentPage...) sẽ hiển thị */}
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;