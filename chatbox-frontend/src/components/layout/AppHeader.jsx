import React, { useState } from 'react';
import { Layout, Typography, Avatar, Dropdown, Space, message, Badge, Button, Popover, List, Tooltip } from 'antd';
import {
    UserOutlined, LogoutOutlined, SettingOutlined, DownOutlined,
    ProfileOutlined, MessageOutlined, HomeOutlined, BellOutlined, LockOutlined,
    DeleteOutlined, ClearOutlined, CheckOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { getAvatarUrl } from "../../utils/common.js";
import AppLogo from "../common/AppLogo.jsx";
import SettingsModal from "../chat/SettingModal.jsx";

const { Header } = Layout;
const { Text } = Typography;

const AppHeader = () => {
    const navigate = useNavigate();
    const { t } = useSettings();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const {
        currentUser, currentFullName, currentAvatar, logoutUser, updateUserStatus, myStatus,
        notifications, unreadCount, markNotificationsRead,
        deleteNotification, clearAllNotifications, markOneRead
    } = useChat();

    const displayName = (currentFullName && currentFullName !== "undefined" && currentFullName !== "null")
        ? currentFullName : currentUser;
    const myAvatarUrl = getAvatarUrl(currentUser, currentFullName, currentAvatar);

    const handleLogout = () => { logoutUser(); message.info(t('logout')); navigate('/login'); };
    const handleChangeStatus = (status) => { updateUserStatus(status); };
    const handleProfile = () => { navigate('/profile'); };

    // --- XỬ LÝ CLICK VÀO THÔNG BÁO ---
    const handleClickNoti = (noti) => {
        // 1. Nếu chưa đọc thì gọi hàm markOneRead để đổi màu RIÊNG cái này
        if (!noti.read) {
            markOneRead(noti.id);
        }
        // 2. Chuyển trang
        if (noti.relatedPostId) {
            navigate(`/post/${noti.relatedPostId}`);
        }
    };

    const handleDeleteNoti = (e, id) => {
        e.stopPropagation();
        deleteNotification(id);
    };

    const items = [
        { key: 'status', label: t('status'), children: [
                { key: 's1', label: t('online'), onClick: () => handleChangeStatus('ONLINE') },
                { key: 's2', label: t('busy'), onClick: () => handleChangeStatus('BUSY') },
                { key: 's3', label: t('offline'), onClick: () => handleChangeStatus('OFFLINE') },
            ]},
        { key: '1', label: t('profile'), icon: <ProfileOutlined />, onClick: handleProfile },
        { key: '2', label: t('changePassword'), icon: <LockOutlined />, onClick: () => navigate('/change-password') },
        { key: '3', label: t('settings'), icon: <SettingOutlined />, onClick: () => setIsSettingsOpen(true) },
        { type: 'divider' },
        { key: '4', label: t('logout'), icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
    ];

    // --- TITLE CỦA POPOVER ---
    const popoverTitle = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 300 }}>
            <Text strong style={{ color: 'var(--text-color)' }}>{t('notifications')}</Text>
            <div style={{ display: 'flex', gap: 5 }}>
                {/* THÊM: Nút đánh dấu tất cả đã đọc thủ công (để tắt số đỏ nếu muốn) */}
                {unreadCount > 0 && (
                    <Tooltip title="Đánh dấu tất cả đã đọc">
                        <Button
                            type="text" size="small" icon={<CheckOutlined />}
                            style={{ color: '#1890ff', fontSize: 12 }}
                            onClick={markNotificationsRead}
                        >
                            Đã đọc
                        </Button>
                    </Tooltip>
                )}

                {/* Nút xóa tất cả */}
                {notifications.length > 0 && (
                    <Tooltip title="Xóa tất cả">
                        <Button
                            type="text" size="small" icon={<ClearOutlined />} danger
                            onClick={clearAllNotifications}
                        >
                            Xóa hết
                        </Button>
                    </Tooltip>
                )}
            </div>
        </div>
    );

    // --- LIST THÔNG BÁO ---
    const notificationContent = (
        <div style={{ width: 350, maxHeight: 400, overflowY: 'auto' }}>
            <List
                dataSource={notifications}
                locale={{ emptyText: <span style={{color:'var(--text-secondary)'}}>{t('noNotification')}</span> }}
                renderItem={item => (
                    <List.Item
                        onClick={() => handleClickNoti(item)}
                        style={{
                            cursor: 'pointer',
                            background: item.read ? 'var(--bg-color)' : 'var(--bg-hover)',
                            padding: '12px 15px',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                        actions={[
                            <Button
                                type="text" size="small" icon={<DeleteOutlined style={{color: 'var(--text-secondary)'}} />}
                                onClick={(e) => handleDeleteNoti(e, item.id)}
                            />
                        ]}
                    >
                        <List.Item.Meta
                            title={
                                <span style={{
                                    fontSize: 14,
                                    fontWeight: item.read ? 'normal' : '700',
                                    color: item.read ? 'var(--text-secondary)' : 'var(--text-color)'
                                }}>
                                    {item.content}
                                </span>
                            }
                            description={
                                <span style={{
                                    fontSize: 11,
                                    color: item.read ? 'var(--text-secondary)' : '#1890ff',
                                    fontWeight: item.read ? 'normal' : '500'
                                }}>
                                    {new Date(item.createdAt).toLocaleString()}
                                    {!item.read && <Badge status="processing" style={{marginLeft: 5}} />}
                                </span>
                            }
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
        <Header style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)',
            padding: '0 20px', height: '60px', zIndex: 10, transition: 'background 0.3s'
        }}>
            <div style={{cursor: 'pointer'}} onClick={() => navigate('/chat')}>
                <AppLogo size={42} showText={true}/>
            </div>

            <div style={{display: 'flex', gap: '20px'}}>
                <Tooltip title="Trang chủ">
                    <Button shape="circle" size="large" icon={<HomeOutlined/>} onClick={() => navigate('/feed')}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-color)',
                                border: '1px solid var(--border-color)'
                            }}/>
                </Tooltip>

                {/* --- THÊM NÚT SỰ KIỆN VÀO ĐÂY --- */}
                <Tooltip title="Sự kiện">
                    <Button shape="circle" size="large" icon={<CalendarOutlined/>} onClick={() => navigate('/events')}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-color)',
                                border: '1px solid var(--border-color)'
                            }}/>
                </Tooltip>
                {/* -------------------------------- */}

                <Tooltip title="Tin nhắn">
                    <Button shape="circle" size="large" icon={<MessageOutlined/>} onClick={() => navigate('/chat')}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-color)',
                                border: '1px solid var(--border-color)'
                            }}/>
                </Tooltip>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                <Popover
                    content={notificationContent}
                    title={popoverTitle}
                    trigger="click"
                    placement="bottomRight"
                    overlayInnerStyle={{backgroundColor: 'var(--bg-color)', color: 'var(--text-color)'}}
                    // --- ĐÃ XÓA DÒNG onOpenChange Ở ĐÂY ĐỂ SỬA LỖI ---
                >
                    <Badge count={unreadCount} overflowCount={99} size="small">
                        <Button shape="circle" icon={<BellOutlined style={{fontSize: 20}}/>}
                                style={{background: 'transparent', color: 'var(--text-color)', border: 'none'}}/>
                    </Badge>
                </Popover>

                <Dropdown menu={{items}} trigger={['click']}>
                    <div style={{cursor: 'pointer', padding: '5px', borderRadius: '6px' }}>
                        <Space>
                            <Badge dot status={getStatusColor(myStatus)} offset={[-2, 30]}>
                                <Avatar src={myAvatarUrl} />
                            </Badge>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                <Text strong style={{ fontSize: '14px', color: 'var(--text-color)' }}>{displayName}</Text>
                                <Text type="secondary" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                    {myStatus === 'ONLINE' ? t('online') : (myStatus === 'BUSY' ? t('busy') : t('offline'))}
                                </Text>
                            </div>
                            <DownOutlined style={{ fontSize: 10, color: 'var(--text-secondary)' }} />
                        </Space>
                    </div>
                </Dropdown>
            </div>

            <SettingsModal visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </Header>
    );
};

export default AppHeader;