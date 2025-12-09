import React, { useEffect, useState } from 'react';
import { Modal, List, Avatar, Button, message, Tag, Popconfirm, Select, Typography, Space } from 'antd';
import { UserOutlined, DeleteOutlined, UserAddOutlined, CrownOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from '../../utils/common';

const { Text } = Typography;
const { Option } = Select;

const GroupInfoModal = ({ visible, onClose, group }) => {
    const { currentUser, refreshGroups, setRecipient, users } = useChat();

    // State quản lý danh sách thành viên
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    // State quản lý thông tin nhóm chi tiết (để lấy adminUsername chính xác)
    const [groupDetail, setGroupDetail] = useState(null);

    // State quản lý Modal Thêm thành viên
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [candidates, setCandidates] = useState([]); // Danh sách người có thể thêm
    const [selectedUsers, setSelectedUsers] = useState([]); // Người được chọn để thêm
    const [adding, setAdding] = useState(false);

    // 1. LOAD CHI TIẾT NHÓM
    useEffect(() => {
        if (visible && group) {
            fetchGroupDetails();
        }
    }, [visible, group]);

    const fetchGroupDetails = async () => {
        setLoading(true);
        try {
            // Gọi API lấy chi tiết: bao gồm members và adminUsername
            const res = await api.get(`/groups/${group.realGroupId}`);
            setMembers(res.data.members || []);
            setGroupDetail(res.data); // Lưu chi tiết nhóm để check quyền Admin
        } catch (error) {
            console.error("Lỗi tải thông tin nhóm:", error);
            message.error("Không thể tải thông tin nhóm");
        } finally {
            setLoading(false);
        }
    };

    // 2. CHUẨN BỊ DANH SÁCH ĐỂ THÊM (Lọc người đã có)
    const openAddMemberModal = async () => {
        try {
            // Lấy toàn bộ user trong hệ thống (hoặc lấy từ Context users)
            // Ở đây ta dùng users từ Context cho nhanh, hoặc gọi API /users nếu cần mới nhất
            // const res = await api.get('/users');
            // const allUsers = res.data;

            // Lọc: Chỉ lấy những người CHƯA có trong nhóm và KHÔNG phải Bot
            const existingUsernames = members.map(m => m.username);
            const availableUsers = users.filter(u =>
                !u.isGroup &&
                u.username !== 'bot' &&
                !existingUsernames.includes(u.username)
            );

            setCandidates(availableUsers);
            setSelectedUsers([]);
            setIsAddModalOpen(true);
        } catch (error) {
            message.error("Lỗi tải danh sách người dùng");
        }
    };

    // 3. XỬ LÝ THÊM THÀNH VIÊN (Ai cũng được thêm)
    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;
        setAdding(true);
        try {
            await api.post(`/groups/${group.realGroupId}/add`, {
                usernames: selectedUsers // DTO backend là List<String> usernames (hoặc members)
                // Lưu ý: Kiểm tra lại DTO Backend của bạn là 'usernames' hay 'members'
                // Nếu DTO là CreateGroupRequest dùng chung thì là 'members'
                // Sửa lại cho khớp Backend:
                , members: selectedUsers
            });

            message.success("Đã thêm thành viên mới!");
            setIsAddModalOpen(false);
            fetchGroupDetails(); // Load lại danh sách ngay
        } catch (error) {
            message.error("Lỗi thêm thành viên");
        } finally {
            setAdding(false);
        }
    };

    // 4. XỬ LÝ RỜI NHÓM
    const handleLeave = async () => {
        try {
            await api.post(`/groups/${group.realGroupId}/leave`);
            message.success("Đã rời nhóm!");
            refreshGroups(); // Reload Sidebar
            setRecipient('bot'); // Quay về bot
            onClose();
        } catch (error) {
            message.error("Lỗi rời nhóm");
        }
    };

    // 5. XỬ LÝ XÓA THÀNH VIÊN (Chỉ Admin)
    const handleRemoveMember = async (targetUsername) => {
        try {
            await api.post(`/groups/${group.realGroupId}/remove`, { targetUsername });
            message.success(`Đã xóa ${targetUsername} khỏi nhóm`);
            fetchGroupDetails(); // Load lại list
        } catch (error) {
            message.error("Lỗi xóa thành viên (Có thể bạn không phải Admin)");
        }
    };

    // Xác định Admin (Dùng dữ liệu mới fetch về cho chính xác)
    const adminUsername = groupDetail?.adminUsername || group?.adminUsername;
    const isAdmin = currentUser === adminUsername;

    return (
        <>
            <Modal
                title={
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 30}}>
                        <span>Thành viên: {group?.displayName}</span>
                        {/* Nút Thêm Thành Viên (Ai cũng thấy) */}
                        <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={openAddMemberModal}>
                            Thêm người
                        </Button>
                    </div>
                }
                open={visible}
                onCancel={onClose}
                footer={[
                    <Button key="leave" danger onClick={handleLeave}>Rời nhóm</Button>,
                    <Button key="close" onClick={onClose}>Đóng</Button>
                ]}
            >
                <List
                    loading={loading}
                    itemLayout="horizontal"
                    dataSource={members}
                    renderItem={(item) => (
                        <List.Item
                            actions={
                                // Logic Xóa: Chỉ Admin mới thấy nút xóa và không xóa chính mình
                                isAdmin && item.username !== currentUser ? [
                                    <Popconfirm
                                        title="Xóa thành viên?"
                                        description={`Bạn muốn mời ${item.fullName || item.username} ra khỏi nhóm?`}
                                        onConfirm={() => handleRemoveMember(item.username)}
                                        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                                    >
                                        <Button type="text" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                ] : []
                            }
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={getAvatarUrl(item.username, item.fullName, item.avatar)} icon={<UserOutlined />} />}
                                title={
                                    <Space>
                                        <Text strong>{item.fullName || item.username}</Text>
                                        {/* Tag Admin */}
                                        {item.username === adminUsername && <Tag color="gold" icon={<CrownOutlined />}>Trưởng nhóm</Tag>}
                                        {/* Tag Bạn */}
                                        {item.username === currentUser && <Tag color="blue">Bạn</Tag>}
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            {/* --- MODAL CON: THÊM THÀNH VIÊN --- */}
            <Modal
                title="Thêm thành viên mới"
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                onOk={handleAddMembers}
                confirmLoading={adding}
                okText="Thêm"
                cancelText="Hủy"
            >
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Chọn người muốn thêm..."
                    onChange={setSelectedUsers}
                    value={selectedUsers}
                    optionLabelProp="label"
                >
                    {candidates.map(u => (
                        <Option key={u.username} value={u.username} label={u.displayName}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Avatar src={u.avatar} size="small" />
                                {u.displayName}
                            </div>
                        </Option>
                    ))}
                </Select>
                {candidates.length === 0 && <div style={{marginTop: 10, color: '#999'}}>Không còn ai để thêm vào nhóm này.</div>}
            </Modal>
        </>
    );
};

export default GroupInfoModal;