import React from 'react';
import { Tooltip, Avatar } from 'antd';
import { useChat } from '../../context/ChatContext';

const MessageReactions = ({ reactions, isMyMessage }) => {
    const { users, currentUser } = useChat();

    if (!reactions || Object.keys(reactions).length === 0) return null;

    // 1. Gom nhóm reaction (Đếm số lượng mỗi loại)
    // Output: { "❤️": ["user1", "user2"], "👍": ["user3"] }
    const grouped = {};
    Object.entries(reactions).forEach(([username, emoji]) => {
        if (!grouped[emoji]) grouped[emoji] = [];
        grouped[emoji].push(username);
    });

    // 2. Hàm tạo nội dung Tooltip (Hiển thị tên người thả)
    const getTooltipContent = (usernames) => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                {usernames.map(u => {
                    const user = users.find(user => user.username === u);
                    // Nếu là mình thì hiện "Bạn", người khác hiện tên hiển thị
                    return <span key={u}>{u === currentUser ? "Bạn" : (user?.displayName || u)}</span>
                })}
            </div>
        );
    };

    return (
        <div style={{
            display: 'flex', gap: '4px', marginTop: '-10px', marginBottom: '5px', zIndex: 2,
            justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
            paddingRight: isMyMessage ? '5px' : 0, paddingLeft: !isMyMessage ? '5px' : 0
        }}>
            {Object.entries(grouped).map(([emoji, userList]) => (
                <Tooltip key={emoji} title={getTooltipContent(userList)} color="var(--bg-secondary)">
                    <div style={{
                        background: 'var(--bg-color)', // Nền trùng màu chat window để nổi bật
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px', padding: '2px 6px',
                        fontSize: '11px', cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', gap: '3px',
                        color: 'var(--text-color)'
                    }}>
                        <span>{emoji}</span>
                        <span style={{ fontWeight: 500 }}>{userList.length}</span>
                    </div>
                </Tooltip>
            ))}
        </div>
    );
};

export default MessageReactions;