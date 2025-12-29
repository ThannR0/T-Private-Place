import React, {useEffect, useState} from 'react';
import {Layout, Menu, Button, Typography, Avatar, Dropdown, Space, Badge, Tag, message} from 'antd';
import {
    DashboardOutlined, UserOutlined, LogoutOutlined,
    SettingOutlined, DollarCircleOutlined, ShopOutlined,
    BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
    LineChartOutlined, GiftOutlined, CustomerServiceOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import AdminSupportDashboard from "../Support/AdminSupportDashhboard.jsx";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logoutUser, currentAvatar, currentFullName, currentUser, currentRole } = useChat();

    const [collapsed, setCollapsed] = useState(false);
    const [isChecking, setIsChecking] = useState(true); // Biến để chờ check quyền xong mới hiện giao diện

    // 🟢 2. Thêm useEffect để kiểm tra quyền Admin
    useEffect(() => {
        // Giả sử logic lưu quyền:
        // Cách A: Lấy từ Context (currentUser.role)
        // Cách B: Lấy từ localStorage (nếu bạn có lưu 'role' khi login)

        const role = currentUser?.role || localStorage.getItem('role');

        // Logic kiểm tra: Nếu chưa đăng nhập HOẶC không phải ADMIN
        if (!role || (role !== 'ADMIN' && role !== 'ROLE_ADMIN')) {
            // message.error("⛔ Bạn không có quyền truy cập trang quản trị!");
            navigate('/');
        } else {
            setIsChecking(false);
        }
    }, [currentRole, navigate]);


    const handleLogout = () => {
        logoutUser();
        navigate('/admin/login');
    };

    const userMenu = {
        items: [
            { key: '3', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
        ]
    };

    // --- CẤU HÌNH MENU MỚI ---
    const items = [
        // 1. Trang Giao dịch cũ (Giữ nguyên cho bạn)
        {
            key: '/admin/dashboard',
            icon: <DollarCircleOutlined />,
            label: 'Quản Lý Giao Dịch Banking',
            onClick: () => navigate('/admin/dashboard')
        },

        // 2. Trang Thống kê Mới (Đổi tên & Icon)
        {
            key: '/admin/market-stats',
            icon: <LineChartOutlined />,
            label: 'Thống Kê Doanh Thu',
            onClick: () => navigate('/admin/market-stats')
        },

        // 3. Các trang khác
        {
            key: '/admin/market',
            icon: <ShopOutlined />,
            label: 'Quản Lý Mua Bán',
            onClick: () => navigate('/admin/market')
        },
        {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: 'Quản Lý Người Dùng',
            onClick: () => navigate('/admin/users')
        },
        {
            key: '/admin/vouchers',
            icon: <GiftOutlined />, // Icon hộp quà
            label: 'Quản Lý Voucher',
            onClick: () => navigate('/admin/vouchers')
        },
        {
            key: '/admin/support',
            icon: <CustomerServiceOutlined />,
            label: 'Hỗ Trợ Người Dùng',
            onClick: () => navigate('/admin/support')
        }
    ];

    if (isChecking) {
        return <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>...</div>;
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={260}
                style={{
                    background: 'linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)',
                    boxShadow: '4px 0 15px rgba(0,0,0,0.1)'
                }}
            >
                <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {collapsed ? (
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>TP</div>
                    ) : (
                        <div>
                            <div style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: '1px' }}>PRIVATE PLACE</div>
                            <Tag color="gold" style={{ marginTop: 5, fontSize: 10 }}>ADMINISTRATOR</Tag>
                        </div>
                    )}
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    style={{ background: 'transparent', padding: '10px' }}
                />
            </Sider>

            <Layout style={{ background: '#f0f2f5' }}>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 99 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '16px', width: 64, height: 64 }}
                        />
                        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#333' }}>
                            {items.find(i => i.key === location.pathname)?.label || 'Trang quản trị'}
                        </Title>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <Badge count={5} dot>
                            <BellOutlined style={{ fontSize: 20, color: '#666', cursor: 'pointer' }} />
                        </Badge>
                        <Dropdown menu={userMenu} placement="bottomRight" arrow>
                            <Space style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: 8, transition: '0.3s', background: '#f9f9f9' }}>
                                <Avatar src={currentAvatar} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                <div style={{ lineHeight: '1.2' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{currentFullName || 'Admin'}</div>
                                </div>
                            </Space>
                        </Dropdown>
                    </div>
                </Header>

                <Content style={{ margin: '24px', minHeight: 280 }}>
                    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;