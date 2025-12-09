import React, { useState, useMemo } from 'react'; // 1. Thêm useState, useMemo
import { List, Avatar, Input, Badge } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { getStatusColor } from '../../utils/common';

// 2. Hàm hỗ trợ tìm kiếm Tiếng Việt không dấu (Đặt ngoài component cho gọn)
const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase();
}

const UserList = () => {
    const { recipient, setRecipient, users } = useChat();
    const [searchText, setSearchText] = useState(''); // 3. State lưu từ khóa

    // 4. Logic lọc user (Sử dụng useMemo để tối ưu hiệu năng)
    const filteredUsers = useMemo(() => {
        // Nếu không nhập gì thì trả về toàn bộ
        if (!searchText.trim()) return users;

        const keyword = removeVietnameseTones(searchText);

        return users.filter(user => {
            // ĐIỀU KIỆN 1: Luôn giữ lại BOT
            if (user.username === 'bot') return true;

            // ĐIỀU KIỆN 2: Tìm theo Tên hiển thị (displayName)
            const name = removeVietnameseTones(user.displayName || '');
            // ĐIỀU KIỆN 3: Tìm theo Username (nếu muốn)
            const username = removeVietnameseTones(user.username || '');

            return name.includes(keyword) || username.includes(keyword);
        });
    }, [users, searchText]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '15px' }}>
                <Input
                    placeholder="Tìm bạn bè..."
                    prefix={<SearchOutlined />}
                    style={{ borderRadius: '20px' }}
                    // 5. Gắn sự kiện onChange
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear // Cho phép bấm dấu X để xóa nhanh
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <List
                    itemLayout="horizontal"
                    dataSource={filteredUsers} // 6. Thay users bằng filteredUsers
                    locale={{ emptyText: 'Không tìm thấy ai...' }} // Text khi không tìm thấy
                    renderItem={(item) => (
                        <List.Item
                            style={{
                                padding: '12px 20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: recipient === item.username ? '#e6f7ff' : 'transparent',
                                borderRight: recipient === item.username ? '4px solid #1890ff' : 'none'
                            }}
                            onClick={() => setRecipient(item.username)}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Badge dot status={getStatusColor(item.status)} offset={[-5, 30]}>
                                        <Avatar src={item.avatar} size={45} icon={<UserOutlined />} />
                                    </Badge>
                                }
                                title={
                                    // Highlight tên nếu được chọn
                                    <span style={{ fontWeight: recipient === item.username ? 'bold' : 'normal' }}>
                                        {item.displayName}
                                    </span>
                                }
                                description={
                                    <span style={{ fontSize: '12px', color: '#999' }}>
                                        {item.username === 'bot'
                                            ? 'Luôn sẵn sàng'
                                            : (item.status === 'BUSY' ? 'Đang bận' : item.status)}
                                    </span>
                                }
                            />
                        </List.Item>
                    )}
                />
            </div>
        </div>
    );
};

export default UserList;