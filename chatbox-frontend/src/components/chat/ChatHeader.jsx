import React, { useState } from 'react';
import { Typography, Button, Tooltip, Avatar, Badge, Popover, List, Modal } from 'antd';
import {
    PhoneOutlined, VideoCameraOutlined, InfoCircleOutlined, UserOutlined,
    RobotOutlined, UsergroupAddOutlined, ProfileOutlined, LogoutOutlined
} from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import CreateGroupModal from "./CreateGroupModal";
import GroupInfoModal from "./GroupInfoModal";

const { Text } = Typography;

const ChatHeader = () => {
    const { recipient, users, leaveGroup } = useChat();
    const navigate = useNavigate();

    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [openInfo, setOpenInfo] = useState(false);


    const isBot = recipient === 'bot';
    // 1. Tìm User/Group
    const targetUser = users.find(u => u.username === recipient) || {
        username: recipient,
        // Nếu là bot thì ép tên luôn, nếu không thì lấy recipient làm tên tạm
        displayName: isBot ? 'Trợ lý AI' : recipient,
        status: 'OFFLINE',
        avatar: null
    };

    const isGroupChat = targetUser.isGroup === true;

    // 2. Logic Trạng thái
    let statusText = 'Ngoại tuyến';
    let statusColor = 'default';

    if (isBot) {
        statusText = 'Luôn sẵn sàng'; statusColor = 'success';
    } else if (isGroupChat) {
        statusText = 'Nhóm chat'; statusColor = 'success';
    } else {
        switch (targetUser.status) {
            case 'ONLINE': statusText = 'Đang hoạt động'; statusColor = 'success'; break;
            case 'BUSY': statusText = 'Đang bận'; statusColor = 'error'; break;
            default: statusText = 'Truy cập gần đây'; statusColor = 'default';
        }
    }

    // 3. Xử lý Rời nhóm
    const handleLeaveGroup = () => {
        setOpenInfo(false);
        Modal.confirm({
            title: 'Rời nhóm?',
            content: `Bạn chắc chắn muốn rời nhóm "${targetUser.displayName}"?`,
            okText: 'Rời nhóm', okType: 'danger', cancelText: 'Hủy',
            onOk: () => leaveGroup(targetUser.realGroupId)
        });
    };



    // 4. Nội dung Pop-up Menu (i)
    const infoContent = (
        <List size="small" split={false} style={{ width: 220 }}>
            <List.Item
                style={{ cursor: 'pointer', padding: '10px', borderRadius: '5px' }}
                onClick={() => {
                    setOpenInfo(false);
                    if (isGroupChat) setIsGroupInfoOpen(true);
                    else navigate(`/profile/${targetUser.username}`);
                }}
            >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {isGroupChat ? <ProfileOutlined /> : <UserOutlined />}
                    <span>{isGroupChat ? 'Xem thành viên' : 'Xem trang cá nhân'}</span>
                </div>
            </List.Item>

            {isGroupChat ? (
                <List.Item style={{ cursor: 'pointer', padding: '10px', color: 'red' }} onClick={handleLeaveGroup}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><LogoutOutlined /> <span>Rời nhóm</span></div>
                </List.Item>
            ) : (
                <List.Item style={{ cursor: 'pointer', padding: '10px' }} onClick={() => { setOpenInfo(false); setIsCreateGroupOpen(true); }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><UsergroupAddOutlined /> <span>Tạo nhóm chat</span></div>
                </List.Item>
            )}
        </List>
    );

    return (
        <div style={{
            padding: '0 15px', borderBottom: '1px solid #eee', background: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            height: '64px', flexShrink: 0, zIndex: 1
        }}>
            {/* THÔNG TIN TRÁI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <Badge dot status={statusColor} offset={[-5, 38]} style={{ width: 10, height: 10 }}>
                    <Avatar size={40} src={targetUser.avatar} icon={isBot ? <RobotOutlined /> : <UserOutlined />} />
                </Badge>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Text strong style={{ fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isBot ? 'Trợ lý AI' : (targetUser.displayName || recipient)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{statusText}</Text>
                </div>
            </div>

            {/* NÚT PHẢI */}
            {!isBot && (
                <div style={{ display: 'flex', gap: '5px' }}>
                    <Button type="text" shape="circle" size="large" icon={<PhoneOutlined style={{ fontSize: 20, color: '#1890ff' }} />} />
                    <Button type="text" shape="circle" size="large" icon={<VideoCameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />} />
                    <Popover content={infoContent} title="Tùy chọn" trigger="click" open={openInfo} onOpenChange={setOpenInfo} placement="bottomRight">
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