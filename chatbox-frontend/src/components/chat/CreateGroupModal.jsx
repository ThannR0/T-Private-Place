import React, { useState } from 'react';
import { Modal, Input, Select, Button, message } from 'antd';
import { useChat } from '../../context/ChatContext';
import api from '../../services/api';
import { useSettings } from "../../context/SettingsContext.jsx";

const { Option } = Select;

const CreateGroupModal = ({ visible, onClose }) => {
    // refreshGroups đã được export từ Context
    const { users, currentUser, refreshGroups } = useChat();
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    const { t } = useSettings();

    // Lọc bỏ Bot và bản thân
    const availableUsers = users.filter(u => u.username !== 'bot' && u.username !== currentUser && !u.isGroup);

    const handleCreate = async () => {
        if (!groupName || selectedMembers.length === 0) {
            return message.warning(t('warningGroupName'));
        }

        setLoading(true);
        try {
            const res = await api.post('/groups/create', {
                name: groupName,
                members: [...selectedMembers, currentUser]
            });

            message.success(t('successCreateGroup'));

            // --- CẬP NHẬT NGAY ---
            if(refreshGroups) refreshGroups();
            // ---------------------

            onClose();
            setGroupName('');
            setSelectedMembers([]);
        } catch (error) {
            message.error(t('errorCreateGroup'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={t('createGroupTitle')}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>{t('cancel')}</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleCreate}>
                    {t('create')}
                </Button>,
            ]}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Input
                    placeholder={t('groupNamePlaceholder')}
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                />

                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder={t('searchMemberPlaceholder')}
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