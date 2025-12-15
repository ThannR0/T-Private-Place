import React, { useState } from 'react';
import { Typography, Button, Avatar, Badge, Popover, List, Modal } from 'antd';
import {
    PhoneOutlined, VideoCameraOutlined, InfoCircleOutlined, UserOutlined,
    RobotOutlined, UsergroupAddOutlined, ProfileOutlined, LogoutOutlined
} from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext'; // Import i18n
import { useNavigate } from 'react-router-dom';
import CreateGroupModal from "./CreateGroupModal";
import GroupInfoModal from "./GroupInfoModal";

const { Text } = Typography;

const ChatHeader = () => {
    const { recipient, users, leaveGroup } = useChat();
    const { t } = useSettings(); // Lấy hàm dịch
    const navigate = useNavigate();

    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [openInfo, setOpenInfo] = useState(false);

    const isBot = recipient === 'bot';

    // 1. Tìm User/Group
    const targetUser = users.find(u => u.username === recipient) || {
        username: recipient,
        displayName: isBot ? t('assistant') : recipient,
        status: 'OFFLINE',
        avatar: null
    };

    const isGroupChat = targetUser.isGroup === true;

    // --- 2. LOGIC TRẠNG THÁI & MÀU SẮC (ĐÃ SỬA LẠI) ---
    let statusText = t('offline');
    let statusColor = 'default'; // Mặc định màu xám

    if (isBot) {
        statusText = t('alwaysReady'); // 'Luôn sẵn sàng'
        statusColor = 'success';       // Xanh lá
    } else if (isGroupChat) {
        statusText = t('groupChat');   // 'Nhóm chat'
        statusColor = 'success';       // Xanh lá (hoặc processing - xanh dương tùy bạn)
    } else {
        switch (targetUser.status) {
            case 'ONLINE':
                statusText = t('active'); // 'Đang hoạt động'
                statusColor = 'success';  // Xanh lá
                break;
            case 'BUSY':
                statusText = t('busy');   // 'Đang bận'
                statusColor = 'error';    // Đỏ
                break;
            default:
                statusText = t('recentAccess'); // 'Truy cập gần đây'
                statusColor = 'default';        // Xám
        }
    }
    // ----------------------------------------------------

    // 3. Xử lý Rời nhóm
    const handleLeaveGroup = () => {
        setOpenInfo(false);
        Modal.confirm({
            title: t('leaveGroup') + '?',
            content: t('confirmLeaveGroup').replace('{{name}}', targetUser.displayName),
            okText: t('leaveGroup'), okType: 'danger', cancelText: t('cancel'),
            onOk: () => leaveGroup(targetUser.realGroupId)
        });
    };

    // 4. Menu Info
    const infoContent = (
        <List size="small" split={false} style={{ width: 220 }}>
            <List.Item
                style={{ cursor: 'pointer', padding: '10px', borderRadius: '5px', background: 'var(--bg-color)' }}
                onClick={() => {
                    setOpenInfo(false);
                    if (isGroupChat) setIsGroupInfoOpen(true);
                    else navigate(`/profile/${targetUser.username}`);
                }}
            >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-color)' }}>
                    {isGroupChat ? <ProfileOutlined /> : <UserOutlined />}
                    <span>{isGroupChat ? t('viewMembers') : t('viewProfile')}</span>
                </div>
            </List.Item>

            {isGroupChat ? (
                <List.Item style={{ cursor: 'pointer', padding: '10px', color: '#ff4d4f' }} onClick={handleLeaveGroup}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><LogoutOutlined /> <span>{t('leaveGroup')}</span></div>
                </List.Item>
            ) : (
                <List.Item style={{ cursor: 'pointer', padding: '10px', background: 'var(--bg-color)' }} onClick={() => { setOpenInfo(false); setIsCreateGroupOpen(true); }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-color)' }}><UsergroupAddOutlined /> <span>{t('createGroup')}</span></div>
                </List.Item>
            )}
        </List>
    );

    return (
        <div style={{
            padding: '0 15px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            height: '64px', flexShrink: 0, zIndex: 1,
            transition: 'background 0.3s'
        }}>
            {/* THÔNG TIN TRÁI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                {/* Badge Status Color */}
                <Badge dot status={statusColor} offset={[-5, 38]} style={{ width: 10, height: 10 }}>
                    <Avatar size={40} src={targetUser.avatar} icon={isBot ? <RobotOutlined /> : <UserOutlined />} style={{ border: '1px solid var(--border-color)' }} />
                </Badge>

                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Text strong style={{ fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-color)' }}>
                        {isBot ? t('assistant') : (targetUser.displayName || recipient)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{statusText}</Text>
                </div>
            </div>

            {/* NÚT PHẢI */}
            {!isBot && (
                <div style={{ display: 'flex', gap: '5px' }}>
                    <Button type="text" shape="circle" size="large" icon={<PhoneOutlined style={{ fontSize: 20, color: '#1890ff' }} />} />
                    <Button type="text" shape="circle" size="large" icon={<VideoCameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />} />

                    <Popover
                        content={infoContent}
                        title={t('options')}
                        trigger="click"
                        open={openInfo}
                        onOpenChange={setOpenInfo}
                        placement="bottomRight"
                        overlayInnerStyle={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                    >
                        <Button type="text" shape="circle" size="large" icon={<InfoCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />} />
                    </Popover>
                </div>
            )}

            {/* MODALS */}
            <CreateGroupModal visible={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />

            {isGroupChat && <GroupInfoModal visible={isGroupInfoOpen} onClose={() => setIsGroupInfoOpen(false)} group={targetUser} />}
        </div>
    );
};

export default ChatHeader;