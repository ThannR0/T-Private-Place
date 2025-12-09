import React from 'react';
import { Layout, Typography, Avatar, Dropdown, Space, message, Badge, Button, Popover, List } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, DownOutlined, ProfileOutlined, MessageOutlined, HomeOutlined, BellOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from "../../utils/common.js";
import AppLogo from "../common/AppLogo.jsx";
const { Header } = Layout;
const { Text } = Typography;

const AppHeader = () => {
    const navigate = useNavigate();

    // Lấy dữ liệu từ Context (Không tự kết nối socket nữa)
    const { currentUser, currentFullName, currentAvatar, logoutUser, updateUserStatus, myStatus, notifications, unreadCount, markNotificationsRead } = useChat();

    const displayName = (currentFullName && currentFullName !== "undefined" && currentFullName !== "null")
        ? currentFullName : currentUser;

    const myAvatarUrl = getAvatarUrl(currentUser, currentFullName, currentAvatar);

    const handleLogout = () => {
        logoutUser();
        message.info("Đã đăng xuất!");
        navigate('/login');
    };

    const handleChangeStatus = (status) => {
        updateUserStatus(status);
    };

    const handleProfile = () => {
        navigate('/profile');
    };

    const handleClickNoti = (noti) => {
        if (noti.relatedPostId) {
            navigate(`/post/${noti.relatedPostId}`);
        }
    };

    // Cấu hình menu thả xuống
    const items = [
        {
            key: 'status',
            label: 'Trạng thái',
            children: [ // Menu con
                { key: 's1', label: 'Online (Trực tuyến)', onClick: () => handleChangeStatus('ONLINE') },
                { key: 's2', label: 'Busy (Đang bận)', onClick: () => handleChangeStatus('BUSY') },
                { key: 's3', label: 'Offline (Ẩn)', onClick: () => handleChangeStatus('OFFLINE') },
            ]
        },
        {
            key: '1',
            label: 'Hồ sơ cá nhân',
            icon: <ProfileOutlined />,
            onClick: handleProfile,
        },
        {
            key: '2',
            label: 'Đổi mật khẩu',   // <--- COACH SỬA: Đổi tên label
            icon: <LockOutlined />,  // <--- COACH SỬA: Đổi icon cho hợp lý
            onClick: () => navigate('/change-password'), // <--- COACH SỬA: Điều hướng trang
        },
        {
            key: '3',
            label: 'Cài đặt',
            icon: <SettingOutlined />,
            onClick: () => message.info('Tính năng đang phát triển'),
        },
        {
            type: 'divider', // Dòng kẻ ngang phân cách
        },
        {
            key: '4',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            danger: true, // Màu đỏ cảnh báo
            onClick: handleLogout,
        },
    ];

    // Nội dung thông báo
    const notificationContent = (
        <div style={{ width: 300, maxHeight: 400, overflowY: 'auto' }}>
            <List
                dataSource={notifications}
                locale={{ emptyText: "Không có thông báo mới" }}
                renderItem={item => (
                    <List.Item
                        onClick={() => handleClickNoti(item)}
                        style={{ cursor: 'pointer', background: item.read ? '#fff' : '#e6f7ff', padding: '10px' }}
                    >
                        <List.Item.Meta
                            title={<span style={{ fontSize: 13 }}>{item.content}</span>}
                            description={<span style={{ fontSize: 10 }}>{new Date(item.createdAt).toLocaleString()}</span>}
                        />
                    </List.Item>
                )}
            />
        </div>
    );

    const getStatusColor = (status) => {
        if (!status) return 'default';
        const s = status.toUpperCase();
        return s === 'ONLINE' ? 'success' : (s === 'BUSY' ? 'error' : 'default');
    };

    return (
        <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 20px', height: '60px', zIndex: 10 }}>
            {/* LOGO */}
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/chat')}>
                <AppLogo size={42} showText={true}/>
            </div>

            {/* NAV BAR */}
            <div style={{display: 'flex', gap: '20px'}}>
                <Button shape="circle" size="large" icon={<HomeOutlined />} onClick={() => navigate('/feed')} />
                <Button shape="circle" size="large" icon={<MessageOutlined />} onClick={() => navigate('/chat')} />
            </div>

            {/* INFO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Popover
                    content={notificationContent}
                    title="Thông báo"
                    trigger="click"
                    placement="bottomRight"
                    onOpenChange={(open) => { if (open) markNotificationsRead(); }}
                >
                    <Badge count={unreadCount} overflowCount={99} size="small">
                        <Button shape="circle" icon={<BellOutlined style={{ fontSize: 20 }} />} />
                    </Badge>
                </Popover>

                <Dropdown menu={{ items }} trigger={['click']}>
                    <div style={{ cursor: 'pointer', padding: '5px', borderRadius: '6px' }}>
                        <Space>
                            <Badge dot status={getStatusColor(myStatus)} offset={[-2, 30]}>
                                <Avatar src={myAvatarUrl} />
                            </Badge>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                <Text strong style={{ fontSize: '14px' }}>{displayName}</Text>
                                <Text type="secondary" style={{ fontSize: '10px' }}>
                                    {myStatus === 'ONLINE' ? 'Trực tuyến' : (myStatus === 'BUSY' ? 'Đang bận' : 'Ẩn')}
                                </Text>
                            </div>
                            <DownOutlined style={{ fontSize: 10 }} />
                        </Space>
                    </div>
                </Dropdown>
            </div>
        </Header>
    );
};

export default AppHeader;