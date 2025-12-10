import React, { useEffect, useState } from 'react';
import { Modal, List, Avatar, Button, message, Tag, Popconfirm, Select, Typography, Space, Checkbox } from 'antd';
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

    // State quản lý thông tin nhóm chi tiết
    const [groupDetail, setGroupDetail] = useState(null);

    // State quản lý Modal Thêm thành viên
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [adding, setAdding] = useState(false);

    // --- STATE MỚI: Tùy chọn chia sẻ lịch sử ---
    const [shareHistory, setShareHistory] = useState(true); // Mặc định là CÓ cho xem
    // ------------------------------------------

    // 1. LOAD CHI TIẾT NHÓM
    useEffect(() => {
        if (visible && group) {
            fetchGroupDetails();
        }
    }, [visible, group]);

    const fetchGroupDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/groups/${group.realGroupId}`);
            setMembers(res.data.members || []);
            setGroupDetail(res.data);
        } catch (error) {
            console.error("Lỗi tải thông tin nhóm:", error);
            message.error("Không thể tải thông tin nhóm");
        } finally {
            setLoading(false);
        }
    };

    // 2. CHUẨN BỊ DANH SÁCH ĐỂ THÊM
    const openAddMemberModal = async () => {
        try {
            // Lọc: Chỉ lấy những người CHƯA có trong nhóm và KHÔNG phải Bot
            const existingUsernames = members.map(m => m.username);
            const availableUsers = users.filter(u =>
                !u.isGroup &&
                u.username !== 'bot' &&
                !existingUsernames.includes(u.username)
            );

            setCandidates(availableUsers);
            setSelectedUsers([]);
            setShareHistory(true); // Reset về mặc định mỗi khi mở modal
            setIsAddModalOpen(true);
        } catch (error) {
            message.error("Lỗi tải danh sách người dùng");
        }
    };

    // 3. XỬ LÝ THÊM THÀNH VIÊN (CÓ GỬI KÈM shareHistory)
    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;
        setAdding(true);
        try {
            await api.post(`/groups/${group.realGroupId}/add`, {
                members: selectedUsers,
                shareHistory: shareHistory // <--- QUAN TRỌNG: Gửi tham số này xuống Backend
            });

            message.success("Đã thêm thành viên mới!");
            setIsAddModalOpen(false);
            fetchGroupDetails();
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
            refreshGroups();
            setRecipient('bot');
            onClose();
        } catch (error) {
            message.error("Lỗi rời nhóm");
        }
    };

    // 5. XỬ LÝ XÓA THÀNH VIÊN
    const handleRemoveMember = async (targetUsername) => {
        try {
            await api.post(`/groups/${group.realGroupId}/remove`, { targetUsername });
            message.success(`Đã xóa ${targetUsername} khỏi nhóm`);
            fetchGroupDetails();
        } catch (error) {
            message.error("Lỗi xóa thành viên (Có thể bạn không phải Admin)");
        }
    };

    const adminUsername = groupDetail?.adminUsername || group?.adminUsername;
    const isAdmin = currentUser === adminUsername;

    return (
        <>
            <Modal
                title={
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 30}}>
                        <span>Thành viên: {group?.displayName}</span>
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
                                        {item.username === adminUsername && <Tag color="gold" icon={<CrownOutlined />}>Trưởng nhóm</Tag>}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
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

                    {/* --- CHECKBOX TÙY CHỌN LỊCH SỬ --- */}
                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
                        <Checkbox
                            checked={shareHistory}
                            onChange={e => setShareHistory(e.target.checked)}
                        >
                            <Text>Cho phép thành viên mới xem lại tin nhắn cũ</Text>
                        </Checkbox>
                        <div style={{ fontSize: '12px', color: '#888', marginLeft: '24px', marginTop: '4px' }}>
                            {shareHistory
                                ? "Họ sẽ thấy toàn bộ cuộc trò chuyện từ trước đến nay."
                                : "Họ chỉ thấy những tin nhắn bắt đầu từ lúc được thêm vào."}
                        </div>
                    </div>
                    {/* ---------------------------------- */}

                    {candidates.length === 0 && <div style={{color: '#999'}}>Không còn ai để thêm vào nhóm này.</div>}
                </div>
            </Modal>
        </>
    );
};

export default GroupInfoModal;