import React, { useState, useMemo, useEffect } from 'react';
import { List, Avatar, Input, Badge, Collapse, Typography } from 'antd';
import { UserOutlined, SearchOutlined, TeamOutlined, CaretRightOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { getStatusColor } from '../../utils/common';
import dayjs from 'dayjs';
import { useSettings } from "../../context/SettingsContext.jsx";

const { Panel } = Collapse;
const { Text } = Typography;

const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.toLowerCase();
}

const UserList = () => {
    const { recipient, setRecipient, users, messages, currentUser } = useChat();
    const [searchText, setSearchText] = useState('');

    const { t } = useSettings();

    // --- 1. STATE QUẢN LÝ ---
    const [savedContacts, setSavedContacts] = useState(() => {
        if (!currentUser) return ['bot'];
        const saved = localStorage.getItem(`savedContacts_${currentUser}`);
        return saved ? JSON.parse(saved) : ['bot'];
    });

    const [lastReadTimes, setLastReadTimes] = useState(() => {
        if (!currentUser) return {};
        const saved = localStorage.getItem(`lastReadTimes_${currentUser}`);
        return saved ? JSON.parse(saved) : {};
    });

    // Helper: Update state & localStorage
    const updateSavedContacts = (newContacts) => {
        const unique = [...new Set(newContacts)];
        setSavedContacts(unique);
        localStorage.setItem(`savedContacts_${currentUser}`, JSON.stringify(unique));
    };

    const markAsRead = (username) => {
        if (!username) return;
        const now = new Date().getTime();
        setLastReadTimes(prev => {
            const newReads = { ...prev, [username]: now };
            localStorage.setItem(`lastReadTimes_${currentUser}`, JSON.stringify(newReads));
            return newReads;
        });
    };

    // --- 2. LOGIC ĐỒNG BỘ ---

    // A. Load lại từ localStorage khi đổi user
    useEffect(() => {
        if (currentUser) {
            const saved = localStorage.getItem(`savedContacts_${currentUser}`);
            setSavedContacts(saved ? JSON.parse(saved) : ['bot']);
            const reads = localStorage.getItem(`lastReadTimes_${currentUser}`);
            setLastReadTimes(reads ? JSON.parse(reads) : {});
        }
    }, [currentUser]);

    // B. Khi có tin nhắn mới -> Thêm vào list (FIX LỖI CRASH TẠI ĐÂY)
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];

            // 1. Kiểm tra nếu là tin nhắn nhóm -> Bỏ qua việc thêm vào savedContacts
            // (Vì nhóm luôn luôn hiển thị sẵn, không cần lưu vào danh sách cá nhân)
            if (lastMsg.type === 'GROUP') {
                // Vẫn cần xử lý đánh dấu đọc nếu đang mở nhóm đó
                // Tìm username của nhóm (dạng GROUP_ID)
                const groupUsername = `GROUP_${lastMsg.recipientId}`;
                if (recipient === groupUsername) {
                    markAsRead(groupUsername);
                }
                return;
            }

            // 2. Xử lý Chat Cá nhân (1-1)
            const targetId = lastMsg.senderId === currentUser ? lastMsg.recipientId : lastMsg.senderId;

            // Chỉ thêm nếu là chuỗi hợp lệ và chưa có trong list
            if (targetId && typeof targetId === 'string' && !savedContacts.includes(targetId)) {
                updateSavedContacts([...savedContacts, targetId]);
            }

            // 3. Đánh dấu đã đọc nếu đang mở
            if (recipient === targetId) {
                markAsRead(targetId);
            }
        }
    }, [messages]);

    // C. Khi chuyển đổi người chat -> Đọc ngay
    useEffect(() => {
        if (recipient) {
            markAsRead(recipient);
        }
    }, [recipient]);


    // --- 3. TÍNH TOÁN SỐ ĐỎ (UNREAD COUNT) ---
    const processedUsers = useMemo(() => {
        return users.map(user => {
            // Lọc tin nhắn của user/group này
            const userMsgs = messages.filter(m => {
                // Logic lọc tin nhắn an toàn hơn
                const isGroupMsg = m.type === 'GROUP';

                if (user.isGroup) {
                    // Nếu user trong list là Group -> Lấy tin có recipientId == realGroupId
                    // So sánh lỏng (==) đề phòng ID là số hoặc chuỗi
                    return isGroupMsg && m.recipientId == user.realGroupId;
                } else {
                    // Nếu là User cá nhân -> Lấy tin 1-1
                    return !isGroupMsg && (
                        (m.senderId === user.username && m.recipientId === currentUser) ||
                        (m.senderId === currentUser && m.recipientId === user.username)
                    );
                }
            });

            const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : null;
            const lastTime = lastMsg ? new Date(lastMsg.timestamp).getTime() : 0;

            let unreadCount = 0;

            // QUY TẮC: Đang mở chat -> 0
            if (user.username === recipient) {
                unreadCount = 0;
            } else {
                const lastRead = lastReadTimes[user.username] || 0;
                unreadCount = userMsgs.filter(m => {
                    const msgTime = new Date(m.timestamp).getTime();
                    const isFromMe = m.senderId === currentUser;
                    return !isFromMe && (msgTime > lastRead + 100);
                }).length;
            }

            return { ...user, lastTime, unreadCount };
        });
    }, [users, messages, lastReadTimes, recipient, currentUser]);


    // --- 4. RENDER GIAO DIỆN ---
    const { bot, groups, individuals, searchResults } = useMemo(() => {
        if (searchText.trim()) {
            const keyword = removeVietnameseTones(searchText);
            const results = processedUsers.filter(u => {
                const name = removeVietnameseTones(u.displayName || '');
                const uname = removeVietnameseTones(u.username || '');
                return name.includes(keyword) || uname.includes(keyword);
            });
            return { bot: [], groups: [], individuals: [], searchResults: results };
        }

        const visibleUsers = processedUsers.filter(u =>
            u.isGroup || u.username === 'bot' || savedContacts.includes(u.username)
        );

        const sorted = visibleUsers.sort((a, b) => b.lastTime - a.lastTime);

        return {
            bot: sorted.filter(u => u.username === 'bot'),
            groups: sorted.filter(u => u.isGroup),
            individuals: sorted.filter(u => !u.isGroup && u.username !== 'bot'),
            searchResults: []
        };
    }, [processedUsers, searchText, savedContacts]);

    const handleUserClick = (username) => {
        setRecipient(username);
        setSearchText('');
        // Logic thêm vào savedContacts chỉ dành cho user thường (để đề phòng)
        if (!username.startsWith('GROUP_') && username !== 'bot' && !savedContacts.includes(username)) {
            updateSavedContacts([...savedContacts, username]);
        }
    };

    const renderUserItem = (item) => (
        <List.Item
            key={item.username}
            style={{
                padding: '10px 15px', cursor: 'pointer', transition: 'all 0.2s',
                // Sửa màu hover: dùng biến --bg-hover thay vì màu cứng
                backgroundColor: recipient === item.username ? 'var(--bg-hover)' : 'transparent',
                borderLeft: recipient === item.username ? '4px solid #1890ff' : '4px solid transparent',
            }}
            onClick={() => handleUserClick(item.username)}
        >
            <List.Item.Meta
                avatar={
                    <Badge count={item.unreadCount} offset={[-5, 5]} color="#ff4d4f">
                        <div style={{ position: 'relative' }}>
                            <Avatar src={item.avatar} size={42} icon={item.isGroup ? <TeamOutlined /> : <UserOutlined />} />
                            {!item.isGroup && item.username !== 'bot' && (
                                <span style={{
                                    position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%',
                                    backgroundColor: getStatusColor(item.status),
                                    // Sửa viền: Trùng màu nền (trắng hoặc đen) để tạo khoảng cách
                                    border: '1px solid var(--bg-color)'
                                }} />
                            )}
                        </div>
                    </Badge>
                }
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {/* Sửa màu Tên: Dùng var(--text-color) */}
                        <Text strong={item.unreadCount > 0} ellipsis style={{ maxWidth: 120, color: 'var(--text-color)' }}>
                            {item.displayName}
                        </Text>
                        {/* Sửa màu Thời gian: Dùng var(--text-secondary) */}
                        {item.lastTime > 0 && <Text type="secondary" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                            {dayjs(item.lastTime).format('HH:mm')}
                        </Text>}
                    </div>
                }
                description={
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        {/* Sửa màu Nội dung chat cuối: Dùng biến thay vì #333/#999 */}
                        <Text type="secondary" style={{
                            fontSize: 11,
                            // Quan trọng: Nếu chưa đọc -> Màu chính, Đã đọc -> Màu phụ
                            color: item.unreadCount > 0 ? 'var(--text-color)' : 'var(--text-secondary)',
                            fontWeight: item.unreadCount > 0 ? 'bold' : 'normal'
                        }} ellipsis>
                            {item.username === 'bot' ? t('alwaysReady') : (item.isGroup ? t('groupChat') : `@${item.username}`)}
                        </Text>
                    </div>
                }
            />
        </List.Item>
    );

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            // Sửa màu nền và viền Container
            borderRight: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-color)'
        }}>
            <div style={{ padding: '15px 10px' }}>
                <Input
                    placeholder={t('searchPlaceholder')}
                    prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />} // Icon màu xám
                    style={{
                        borderRadius: '20px',
                        // Sửa màu ô Input: Nền input, viền, và màu chữ
                        backgroundColor: 'var(--input-bg)', // (VD: #f5f5f5 hoặc #262626)
                        border: 'none',
                        color: 'var(--text-color)'
                    }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scroll">
                {searchText ? (
                    <List
                        dataSource={searchResults}
                        renderItem={renderUserItem}
                        locale={{ emptyText: <span style={{color: 'var(--text-secondary)'}}>{t('noResults')}</span> }}
                    />
                ) : (
                    <>
                        {bot.map(u => renderUserItem(u))}
                        <Collapse defaultActiveKey={['users', 'groups']} ghost expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: 'var(--text-secondary)' }} />}>
                            {individuals.length > 0 && (
                                <Panel
                                    header={
                                        // Sửa màu Header nhóm
                                        <Text strong type="secondary" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {t('messagesHeader').replace('{{count}}', individuals.length)}
                                        </Text>
                                    }
                                    key="users"
                                >
                                    <List dataSource={individuals} renderItem={renderUserItem} split={false} />
                                </Panel>
                            )}
                            {groups.length > 0 && (
                                <Panel
                                    header={
                                        // Sửa màu Header nhóm
                                        <Text strong type="secondary" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {t('groupsHeader').replace('{{count}}', groups.length)}
                                        </Text>
                                    }
                                    key="groups"
                                >
                                    <List dataSource={groups} renderItem={renderUserItem} split={false} />
                                </Panel>
                            )}
                        </Collapse>
                        {individuals.length === 0 && groups.length === 0 && (
                            // Sửa màu thông báo trống
                            <div style={{textAlign:'center', marginTop:30, color: 'var(--text-secondary)' }}>
                                <SearchOutlined style={{fontSize:30, marginBottom:10}}/>
                                <div>{t('emptyList')}</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserList;