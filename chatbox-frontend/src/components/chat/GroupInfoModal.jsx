import React, { useEffect, useState } from 'react';
import { Modal, List, Avatar, Button, message, Tag, Popconfirm, Select, Typography, Space, Checkbox } from 'antd';
import { UserOutlined, DeleteOutlined, UserAddOutlined, CrownOutlined, LogoutOutlined, SwapOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from '../../utils/common';
import { useSettings } from '../../context/SettingsContext';

const { Text } = Typography;
const { Option } = Select;

const GroupInfoModal = ({ visible, onClose, group }) => {
    const { currentUser, refreshGroups, setRecipient, users } = useChat();
    const { t } = useSettings(); // Lấy hàm dịch

    // State quản lý danh sách thành viên
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [groupDetail, setGroupDetail] = useState(null);

    // State Modal Thêm thành viên
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [adding, setAdding] = useState(false);
    const [shareHistory, setShareHistory] = useState(true);

    // --- STATE CHUYỂN QUYỀN ---
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [newAdmin, setNewAdmin] = useState(null);
    const [transferring, setTransferring] = useState(false);

    // 1. LOAD DATA
    useEffect(() => {
        if (visible && group) fetchGroupDetails();
    }, [visible, group]);

    const fetchGroupDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/groups/${group.realGroupId}`);
            setMembers(res.data.members || []);
            setGroupDetail(res.data);
        } catch (error) { message.error(t('errorLoadGroup')); }
        finally { setLoading(false); }
    };

    // 2. CHUẨN BỊ LIST ADD
    const openAddMemberModal = async () => {
        try {
            const existingUsernames = members.map(m => m.username);
            const availableUsers = users.filter(u => !u.isGroup && u.username !== 'bot' && !existingUsernames.includes(u.username));
            setCandidates(availableUsers); setSelectedUsers([]); setShareHistory(true); setIsAddModalOpen(true);
        } catch (error) { message.error(t('errorLoadUsers')); }
    };

    // 3. ADD MEMBERS
    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;
        setAdding(true);
        try {
            await api.post(`/groups/${group.realGroupId}/add`, { members: selectedUsers, shareHistory: shareHistory });
            message.success(t('successAddMember'));
            setIsAddModalOpen(false); fetchGroupDetails();
        } catch (error) { message.error(t('errorAddMember')); }
        finally { setAdding(false); }
    };

    // 4. LEAVE GROUP LOGIC
    const executeLeave = async () => {
        try {
            await api.post(`/groups/${group.realGroupId}/leave`);
            message.success(t('successLeaveGroup'));
            refreshGroups(); setRecipient('bot'); onClose();
        } catch (error) { message.error(t('errorLeaveGroup')); }
    };

    const onLeaveClick = () => {
        const isAdmin = currentUser === (groupDetail?.adminUsername || group?.adminUsername);
        if (isAdmin && members.length > 1) {
            setNewAdmin(null); setIsTransferModalOpen(true);
        } else {
            Modal.confirm({
                title: t('leaveGroup') + '?',
                content: t('confirmLeaveGroup').replace('{{name}}', group?.displayName),
                okText: t('leaveGroup'), okType: 'danger', cancelText: t('cancel'),
                onOk: executeLeave
            });
        }
    };

    const handleTransferAndLeave = async () => {
        if (!newAdmin) return message.warning(t('selectAdminWarning'));
        setTransferring(true);
        try {
            await api.put(`/groups/${group.realGroupId}/transfer-admin`, { newAdminUsername: newAdmin });
            message.success(t('transferSuccess'));
            await executeLeave();
            setIsTransferModalOpen(false);
        } catch (error) {
            console.error(error);
            message.error(t('transferError') + ": " + (error.response?.data || error.message));
        } finally { setTransferring(false); }
    };

    // 5. REMOVE MEMBER
    const handleRemoveMember = async (targetUsername) => {
        try {
            await api.post(`/groups/${group.realGroupId}/remove`, { targetUsername });
            message.success(t('successRemoveMember').replace('{{name}}', targetUsername));
            fetchGroupDetails();
        } catch (error) { message.error(t('errorRemoveMember')); }
    };

    const adminUsername = groupDetail?.adminUsername || group?.adminUsername;
    const isAdmin = currentUser === adminUsername;
    const potentialAdmins = members.filter(m => m.username !== currentUser);

    return (
        <>
            {/* MAIN MODAL */}
            <Modal
                title={
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 30}}>
                        <span>{t('membersTitle').replace('{{name}}', group?.displayName)}</span>
                        <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={openAddMemberModal}>{t('addPerson')}</Button>
                    </div>
                }
                open={visible} onCancel={onClose}
                footer={[
                    <Button key="leave" danger icon={<LogoutOutlined />} onClick={onLeaveClick}>{t('leaveGroup')}</Button>,
                    <Button key="close" onClick={onClose}>{t('close')}</Button>
                ]}
            >
                <List
                    loading={loading} itemLayout="horizontal" dataSource={members}
                    renderItem={(item) => (
                        <List.Item
                            actions={isAdmin && item.username !== currentUser ? [
                                <Popconfirm
                                    title={t('deleteMember')} description={t('confirmDeleteMember').replace('{{name}}', item.fullName || item.username)}
                                    onConfirm={() => handleRemoveMember(item.username)} okText={t('delete')} cancelText={t('cancel')} okButtonProps={{ danger: true }}
                                >
                                    <Button type="text" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                            ] : []}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={getAvatarUrl(item.username, item.fullName, item.avatar)} icon={<UserOutlined />} />}
                                title={
                                    <Space>
                                        <Text strong>{item.fullName || item.username}</Text>
                                        {item.username === adminUsername && <Tag color="gold" icon={<CrownOutlined />}>{t('admin')}</Tag>}
                                        {item.username === currentUser && <Tag color="blue">{t('you')}</Tag>}
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            {/* ADD MEMBER MODAL */}
            <Modal
                title={t('addMemberTitle')} open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)}
                onOk={handleAddMembers} confirmLoading={adding} okText={t('add')} cancelText={t('cancel')}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <Select
                        mode="multiple" style={{ width: '100%' }} placeholder={t('selectMemberPlaceholder')}
                        onChange={setSelectedUsers} value={selectedUsers} optionLabelProp="label"
                    >
                        {candidates.map(u => (
                            <Option key={u.username} value={u.username} label={u.displayName}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Avatar src={u.avatar} size="small" /> {u.displayName}
                                </div>
                            </Option>
                        ))}
                    </Select>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <Checkbox checked={shareHistory} onChange={e => setShareHistory(e.target.checked)}>
                            <Text style={{color: 'var(--text-color)'}}>{t('allowHistory')}</Text>
                        </Checkbox>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '24px', marginTop: '4px' }}>
                            {shareHistory ? t('historyYes') : t('historyNo')}
                        </div>
                    </div>
                    {candidates.length === 0 && <div style={{color: 'var(--text-secondary)'}}>{t('noCandidates')}</div>}
                </div>
            </Modal>

            {/* TRANSFER ADMIN MODAL (ĐÃ DỊCH & DARK MODE) */}
            <Modal
                title={
                    <Space>
                        <SwapOutlined style={{ color: '#1890ff' }} />
                        <Text strong>{t('transferAdminTitle')}</Text>
                    </Space>
                }
                open={isTransferModalOpen}
                onCancel={() => setIsTransferModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setIsTransferModalOpen(false)}>{t('cancel')}</Button>,
                    <Button key="submit" type="primary" danger loading={transferring} onClick={handleTransferAndLeave} disabled={!newAdmin}>
                        {t('transferAndLeave')}
                    </Button>
                ]}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {/* Hộp cảnh báo: Đã sửa màu để hợp Dark Mode */}
                    <div style={{
                        background: 'rgba(255, 77, 79, 0.1)', // Đỏ nhạt trong suốt (hợp cả 2 nền)
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 77, 79, 0.3)'
                    }}>
                        <Text type="danger">{t('transferWarning')}</Text>
                    </div>

                    <Text strong style={{color: 'var(--text-color)'}}>{t('selectSuccessor')}</Text>

                    <Select
                        style={{ width: '100%' }}
                        placeholder={t('selectAdminPlaceholder')}
                        onChange={setNewAdmin}
                        value={newAdmin}
                    >
                        {potentialAdmins.map(u => (
                            <Option key={u.username} value={u.username}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar src={getAvatarUrl(u.username, u.fullName, u.avatar)} size="small" />
                                    <span>{u.fullName || u.username}</span>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </div>
            </Modal>
        </>
    );
};

export default GroupInfoModal;