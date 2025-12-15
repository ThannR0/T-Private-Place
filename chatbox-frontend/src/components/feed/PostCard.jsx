import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Avatar, Typography, Button, Image, Input, List, Popover, message, Dropdown, Modal, Tooltip } from 'antd';
import {
    CommentOutlined, MoreOutlined, EditOutlined, DeleteOutlined,
    MessageOutlined, InfoCircleOutlined, SendOutlined, LikeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from '../../utils/common';
import api from '../../services/api';
import { useSettings } from "../../context/SettingsContext.jsx";

const { Text, Paragraph } = Typography;
const { confirm } = Modal;

// --- ĐỊNH NGHĨA BỘ ICON CẢM XÚC ---
const REACTION_ICONS = {
    LIKE: { icon: "👍", label: "Thích", color: "#1890ff" },
    LOVE: { icon: "❤️", label: "Yêu thích", color: "#f5222d" },
    HAHA: { icon: "😆", label: "Haha", color: "#faad14" },
    WOW:  { icon: "😮", label: "Wow", color: "#faad14" },
    SAD:  { icon: "😢", label: "Buồn", color: "#faad14" },
    ANGRY:{ icon: "😡", label: "Phẫn nộ", color: "#f5222d" }
};

const PostCard = ({ post, onRemove }) => {
    const navigate = useNavigate();
    const { setRecipient, currentUser, currentFullName, currentAvatar, feedUpdate, users } = useChat();
    const { t } = useSettings();

    // --- STATE ---
    // reactions: Map { "username": "TYPE" }
    const [reactions, setReactions] = useState(post.reactions || {});
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    // Tìm reaction của mình
    const myReactionType = reactions[currentUser];

    const [showAllComments, setShowAllComments] = useState(false);
    const [commentInput, setCommentInput] = useState("");
    const [loadingComment, setLoadingComment] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const inputRef = useRef(null);

    // --- ĐỒNG BỘ REALTIME ---
    useEffect(() => {
        // Cập nhật từ Props ban đầu
        setReactions(post.reactions || {});
        setLikeCount(post.likeCount || 0);
        if (!isEditing) setEditContent(post.content);
    }, [post]);

    useEffect(() => {
        // Cập nhật từ Socket (Feed Update)
        if (feedUpdate && String(feedUpdate.postId) === String(post.id)) {
            if (feedUpdate.type === 'POST_REACTION_UPDATE') {
                setReactions(feedUpdate.reactions || {});
                setLikeCount(feedUpdate.likeCount);
            }
        }
    }, [feedUpdate, post.id]);

    // --- HANDLERS ---
    const handleReact = async (type) => {
        // Optimistic UI: Cập nhật giao diện ngay lập tức
        const oldReactions = { ...reactions };
        const oldMyReaction = myReactionType;

        const newReactions = { ...reactions };
        if (oldMyReaction === type) {
            delete newReactions[currentUser]; // Gỡ
        } else {
            newReactions[currentUser] = type; // Cập nhật/Thêm mới
        }

        setReactions(newReactions);
        setLikeCount(Object.keys(newReactions).length);

        try {
            await api.post(`/posts/${post.id}/react`, { type });
        } catch (error) {
            // Rollback nếu lỗi
            setReactions(oldReactions);
            setLikeCount(Object.keys(oldReactions).length);
            message.error("Lỗi kết nối!");
        }
    };

    const handleComment = async () => {
        if (!commentInput.trim()) return;
        setLoadingComment(true);
        try {
            await api.post(`/posts/${post.id}/comments`, { content: commentInput });
            setCommentInput(""); setShowAllComments(true);
        } catch (e) { message.error("Lỗi bình luận"); }
        finally { setLoadingComment(false); }
    };

    const handleDelete = () => {
        confirm({
            title: t('deletePostConfirm'), content: t('deletePostDesc'),
            okText: t('delete'), okType: 'danger', cancelText: t('cancel'),
            onOk: async () => {
                try { await api.delete(`/posts/${post.id}`); message.success(t('deleteSuccess')); if (onRemove) onRemove(post.id); }
                catch (e) { message.error("Lỗi xóa"); }
            },
        });
    };

    const handleUpdate = async () => {
        try { await api.put(`/posts/${post.id}`, { content: editContent }); message.success(t('updateSuccess')); setIsEditing(false); }
        catch (e) { message.error("Lỗi cập nhật"); }
    };

    const handleFocusComment = () => { setShowAllComments(true); setTimeout(() => inputRef.current?.focus(), 100); };
    const handleViewProfile = () => navigate(`/profile/${post.username}`);
    const handleChat = () => { setRecipient(post.username); navigate('/chat'); };

    // --- HELPER RENDERS ---

    // 1. THANH CHỌN CẢM XÚC (POPOVER)
    const reactionSelector = (
        <div style={{ display: 'flex', gap: 10, padding: '5px' }}>
            {Object.keys(REACTION_ICONS).map(type => (
                <Tooltip key={type} title={REACTION_ICONS[type].label}>
                    <div
                        style={{ fontSize: '24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                        className="emoji-hover" // Class hover phóng to (cần thêm vào css)
                        onClick={() => handleReact(type)}
                    >
                        {REACTION_ICONS[type].icon}
                    </div>
                </Tooltip>
            ))}
        </div>
    );

    // 2. TOOLTIP NGƯỜI THẢ TIM (WHO REACTED?)
    const reactionTooltipContent = useMemo(() => {
        const names = Object.keys(reactions).map(uname => {
            if (uname === currentUser) return t('you');
            const u = users.find(x => x.username === uname); // Tìm trong list users online để lấy tên đẹp
            return u ? u.displayName : uname;
        });

        if (names.length === 0) return null;
        if (names.length <= 5) return names.join(', ');
        return `${names.slice(0, 5).join(', ')} và ${names.length - 5} người khác`;
    }, [reactions, users, currentUser, t]);

    // 3. TOOLTIP NGƯỜI BÌNH LUẬN (WHO COMMENTED?)
    const commentTooltipContent = useMemo(() => {
        if (!post.comments || post.comments.length === 0) return null;
        // Lấy danh sách người comment (unique)
        const uniqueCommenters = [...new Set(post.comments.map(c => c.fullName || c.username))];

        if (uniqueCommenters.length <= 5) return uniqueCommenters.join(', ');
        return `${uniqueCommenters.slice(0, 5).join(', ')}...`;
    }, [post.comments]);

    // 4. HIỂN THỊ ICON ĐÃ CHỌN TRÊN NÚT LIKE
    const currentReactionIcon = myReactionType ? (
        <span style={{ marginRight: 5 }}>{REACTION_ICONS[myReactionType].icon}</span>
    ) : <LikeOutlined />;

    const currentReactionText = myReactionType ? (
        <span style={{ color: REACTION_ICONS[myReactionType].color, fontWeight: 600 }}>
            {REACTION_ICONS[myReactionType].label}
        </span>
    ) : t('like');

    // 5. HIỂN THỊ TỔNG HỢP ICON (Góc trái dưới bài viết)
    const reactionSummary = useMemo(() => {
        if (likeCount === 0) return null;
        // Lấy top 3 loại icon nhiều nhất
        const counts = {};
        Object.values(reactions).forEach(type => { counts[type] = (counts[type] || 0) + 1; });
        const topTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3);

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, paddingLeft: 15 }}>
                <div style={{ display: 'flex' }}>
                    {topTypes.map((type, idx) => (
                        <div key={type} style={{ zIndex: 3 - idx, marginLeft: idx === 0 ? 0 : -5, background: 'var(--bg-color)', borderRadius: '50%', border: '2px solid var(--bg-color)' }}>
                            <span style={{ fontSize: '16px' }}>{REACTION_ICONS[type].icon}</span>
                        </div>
                    ))}
                </div>
                <Tooltip title={reactionTooltipContent}>
                    <Text type="secondary" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {likeCount > 0 && likeCount}
                    </Text>
                </Tooltip>
            </div>
        );
    }, [reactions, likeCount, reactionTooltipContent]);


    // --- RENDER CHÍNH ---
    const menuItems = [
        { key: 'edit', label: t('editPost'), icon: <EditOutlined />, onClick: () => setIsEditing(true) },
        { key: 'delete', label: t('deletePost'), icon: <DeleteOutlined />, danger: true, onClick: handleDelete },
    ];

    const userPopoverContent = (
        <div style={{ width: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                <Avatar size={50} src={getAvatarUrl(post.username, post.fullName, post.userAvatar)} />
                <div>
                    <Text strong style={{ fontSize: 16, display: 'block', color: 'var(--text-color)' }}>{post.fullName || post.username}</Text>
                    <Text type="secondary" style={{ color: 'var(--text-secondary)' }}>@{post.username}</Text>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                {post.username !== currentUser && <Button type="primary" icon={<MessageOutlined />} block onClick={handleChat}>{t('messsage')}</Button>}
                <Button icon={<InfoCircleOutlined />} block onClick={handleViewProfile}>{t('profile')}</Button>
            </div>
        </div>
    );

    const cardTitle = (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Popover content={userPopoverContent} title={null} trigger="hover" overlayInnerStyle={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
                <Avatar size={40} src={getAvatarUrl(post.username, post.fullName, post.userAvatar)} style={{ cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={handleViewProfile} />
            </Popover>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Popover content={userPopoverContent} title={null} trigger="hover" overlayInnerStyle={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
                    <Text strong style={{ fontSize: '15px', cursor: 'pointer', color: 'var(--text-color)' }} onClick={handleViewProfile}>
                        {post.fullName || post.username}
                    </Text>
                </Popover>
                <Text type="secondary" style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                    {new Date(post.createdAt).toLocaleString()}
                </Text>
            </div>
        </div>
    );

    const commentsToShow = showAllComments ? post.comments : post.comments.slice(0, 2);

    return (
        <Card
            style={{ marginBottom: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
            styles={{ header: { borderBottom: 'none', padding: '15px 15px 0 15px' }, body: { padding: '0 15px 5px 15px' } }}
            title={cardTitle}
            extra={post.username === currentUser && (
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                    <Button type="text" icon={<MoreOutlined style={{ fontSize: 20, color: 'var(--text-secondary)' }} />} />
                </Dropdown>
            )}
            actions={[
                // --- NÚT LIKE VỚI POPOVER CẢM XÚC ---
                <Popover content={reactionSelector} title={null} trigger="hover" overlayInnerStyle={{ borderRadius: '20px', padding: '5px' }}>
                    <Button
                        type="text"
                        key="like"
                        onClick={() => handleReact(myReactionType ? myReactionType : 'LIKE')} // Click thường -> Like/Unlike
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {currentReactionIcon}
                        {currentReactionText}
                    </Button>
                </Popover>,

                // --- NÚT BÌNH LUẬN VỚI TOOLTIP ---
                <Tooltip title={commentTooltipContent ? `Đã bình luận: ${commentTooltipContent}` : "Chưa có bình luận"}>
                    <Button type="text" key="comment" icon={<CommentOutlined />} onClick={handleFocusComment} style={{ color: 'var(--text-secondary)' }}>
                        {post.comments.length > 0 ? t('commentCount').replace('{{count}}', post.comments.length) : t('comment')}
                    </Button>
                </Tooltip>
            ]}
        >
            {/* NỘI DUNG */}
            <div style={{ marginTop: '5px', marginBottom: '10px' }}>
                {isEditing ? (
                    <div>
                        <Input.TextArea value={editContent} onChange={(e) => setEditContent(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }} style={{ marginBottom: 10, backgroundColor: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
                        <div style={{ textAlign: 'right', gap: 10, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={() => setIsEditing(false)}>{t('cancel')}</Button>
                            <Button type="primary" size="small" onClick={handleUpdate}>{t('update')}</Button>
                        </div>
                    </div>
                ) : (
                    <Paragraph style={{ fontSize: '15px', whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>{post.content}</Paragraph>
                )}
            </div>

            {/* ẢNH/VIDEO */}
            {post.imageUrl && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '15px', border: '1px solid var(--border-color)', background: '#000', display: 'flex', justifyContent: 'center' }}>
                    {post.mediaType === 'VIDEO' ? <video src={post.imageUrl} controls style={{ maxWidth: '100%', maxHeight: '500px' }} /> : <Image src={post.imageUrl} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }} />}
                </div>
            )}

            {/* --- HIỂN THỊ TỔNG HỢP REACTION (MỚI) --- */}
            {reactionSummary}

            {/* KHU VỰC BÌNH LUẬN */}
            <div style={{ background: 'var(--bg-secondary)', margin: '0 -15px', padding: '10px 15px', borderTop: '1px solid var(--border-color)' }}>
                <List
                    dataSource={commentsToShow} split={false} locale={{ emptyText: <span /> }}
                    renderItem={cmt => (
                        <List.Item style={{ padding: '4px 0', border: 'none' }}>
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                                <Avatar size="small" src={getAvatarUrl(cmt.username, cmt.fullName, cmt.avatar)} style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${cmt.username}`)} />
                                <div style={{ background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '15px', flex: 1, border: '1px solid var(--border-color)' }}>
                                    <Text strong style={{ fontSize: '12px', marginRight: 5, cursor: 'pointer', color: 'var(--text-color)' }} onClick={() => navigate(`/profile/${cmt.username}`)}>{cmt.fullName || cmt.username}</Text>
                                    <Text style={{ color: 'var(--text-color)' }}>{cmt.content}</Text>
                                </div>
                            </div>
                        </List.Item>
                    )}
                />

                {post.comments.length > 2 && !showAllComments && (
                    <Button type="link" onClick={() => setShowAllComments(true)} style={{ paddingLeft: 0, fontSize: '12px', color: '#1890ff' }}>
                        {t('viewMoreComments').replace('{{count}}', post.comments.length - 2)}
                    </Button>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <Avatar size="small" src={getAvatarUrl(currentUser, currentFullName, currentAvatar)} />
                    <Input
                        ref={inputRef}
                        placeholder={t('writeComment').replace('{{name}}', currentFullName || currentUser)}
                        style={{ borderRadius: 20, background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                        value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onPressEnter={handleComment}
                        suffix={<Button type="text" size="small" icon={<SendOutlined style={{ color: 'var(--text-secondary)' }} />} onClick={handleComment} loading={loadingComment} />}
                    />
                </div>
            </div>
        </Card>
    );
};

export default PostCard;