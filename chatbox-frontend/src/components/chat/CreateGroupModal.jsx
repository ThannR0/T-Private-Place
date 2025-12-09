import React, { useState } from 'react';
import { Modal, Input, Select, Button, message } from 'antd';
import { useChat } from '../../context/ChatContext';
import api from '../../services/api'; // Axios instance của bạn

const { Option } = Select;

const CreateGroupModal = ({ visible, onClose }) => {
    const { users, currentUser, refreshGroups } = useChat(); // refreshGroups: hàm mới ta sẽ thêm vào Context
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Lọc bỏ Bot và bản thân mình khỏi danh sách chọn
    const availableUsers = users.filter(u => u.username !== 'bot' && u.username !== currentUser);

    const handleCreate = async () => {
        if (!groupName || selectedMembers.length === 0) {
            return message.warning("Vui lòng nhập tên nhóm và chọn thành viên!");
        }

        setLoading(true);
        try {
            // Gọi API Backend đã viết ở Phần 1
            const res = await api.post('/groups/create', {
                name: groupName,
                members: [...selectedMembers, currentUser] // Thêm chính mình vào
            });

            message.success("Tạo nhóm thành công!");

            // Gọi hàm trong Context để reload danh sách chat (để hiện nhóm mới lên Sidebar)
            if(refreshGroups) refreshGroups(res.data);

            onClose();
            setGroupName('');
            setSelectedMembers([]);
        } catch (error) {
            message.error("Lỗi khi tạo nhóm");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Tạo nhóm chat mới"
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleCreate}>
                    Tạo nhóm
                </Button>,
            ]}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Input
                    placeholder="Đặt tên nhóm..."
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                />

                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Chọn thành viên"
                    onChange={setSelectedMembers}
                    value={selectedMembers}
                    optionLabelProp="label"
                >
                    {availableUsers.map(u => (
                        <Option key={u.username} value={u.username} label={u.displayName}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={u.avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                {u.displayName}
                            </div>
                        </Option>
                    ))}
                </Select>
            </div>
        </Modal>
    );
};

export default CreateGroupModal;