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

// --- 1. DANH SÁCH THEME (COPY TỪ CREATE POST ĐỂ ĐỒNG BỘ) ---
const POST_THEMES = [
    { id: 'default', style: { background: 'transparent', color: 'var(--text-color)' }, icon: 'fa-pen' },

    // 🌊 Nature & Mood
    { id: 'ocean',   style: { background: 'linear-gradient(to right, #00c6ff, #0072ff)', color: '#fff' }, icon: 'fa-water' },
    { id: 'sunset',  style: { background: 'linear-gradient(to right, #f12711, #f5af19)', color: '#fff' }, icon: 'fa-sun' },
    { id: 'love',    style: { background: 'linear-gradient(to right, #fc466b, #3f5efb)', color: '#fff' }, icon: 'fa-heart' },
    { id: 'forest',  style: { background: 'linear-gradient(to right, #11998e, #38ef7d)', color: '#fff' }, icon: 'fa-tree' },
    { id: 'dark',    style: { background: 'linear-gradient(to right, #232526, #414345)', color: '#fff' }, icon: 'fa-moon' },
    { id: 'gold',    style: { background: 'linear-gradient(to right, #CAC531, #F3F9A7)', color: '#333' }, icon: 'fa-crown' },

    // 📘 Social Media Style
    { id: 'facebook', style: { background: 'linear-gradient(to right, #1877F2, #42A5F5)', color: '#fff' }, icon: 'fa-facebook' },
    { id: 'instagram', style: { background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)', color: '#fff' }, icon: 'fa-instagram' },
    { id: 'messenger', style: { background: 'linear-gradient(to right, #00B2FF, #006AFF)', color: '#fff' }, icon: 'fa-facebook-messenger' },
    { id: 'twitter', style: { background: 'linear-gradient(to right, #1DA1F2, #0d8ddb)', color: '#fff' }, icon: 'fa-twitter' },
    { id: 'tiktok', style: { background: 'linear-gradient(to right, #000000, #25F4EE, #FE2C55)', color: '#fff' }, icon: 'fa-music' },

    // 💎 Modern UI
    { id: 'neon', style: { background: 'linear-gradient(to right, #12c2e9, #c471ed, #f64f59)', color: '#fff' }, icon: 'fa-bolt' }
];

const PostCard = ({ post, onRemove }) => {
    // console.log("Post ID:", post.id, "Theme:", post.backgroundTheme);
    const navigate = useNavigate();
    const { setRecipient, currentUser, currentFullName, currentAvatar, feedUpdate, users } = useChat();
    const { t } = useSettings();

    // --- REACTION ICONS ---
    const REACTION_ICONS = useMemo(() => ({
        LIKE: { icon: "👍", label: t('like'), color: "#1890ff" },
        LOVE: { icon: "❤️", label: t('love'), color: "#f5222d" },
        HAHA: { icon: "😆", label: t('haha'), color: "#faad14" },
        WOW:  { icon: "😮", label: t('wow'), color: "#faad14" },
        SAD:  { icon: "😢", label: t('sad'), color: "#faad14" },
        ANGRY:{ icon: "😡", label: t('angry'), color: "#f5222d" }
    }), [t]);

    // --- STATE ---
    const [reactions, setReactions] = useState(post.reactions || {});
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const myReactionType = reactions[currentUser];

    const [showAllComments, setShowAllComments] = useState(false);
    const [commentInput, setCommentInput] = useState("");
    const [loadingComment, setLoadingComment] = useState(false);

    // State Edit
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);

    const inputRef = useRef(null);

    // --- EFFECTS ---
    useEffect(() => {
        setReactions(post.reactions || {});
        setLikeCount(post.likeCount || 0);
        if (!isEditing) setEditContent(post.content);
    }, [post]);

    useEffect(() => {
        if (feedUpdate && String(feedUpdate.postId) === String(post.id)) {
            if (feedUpdate.type === 'POST_REACTION_UPDATE') {
                setReactions(feedUpdate.reactions || {});
                setLikeCount(feedUpdate.likeCount);
            }
        }
    }, [feedUpdate, post.id]);

    // --- HANDLERS (Like, Comment, Delete...) ---
    const handleReact = async (type) => {
        const oldReactions = { ...reactions };
        const newReactions = { ...reactions };
        if (myReactionType === type) delete newReactions[currentUser];
        else newReactions[currentUser] = type;

        setReactions(newReactions);
        setLikeCount(Object.keys(newReactions).length);

        try { await api.post(`/posts/${post.id}/react`, { type }); }
        catch (error) {
            setReactions(oldReactions);
            setLikeCount(Object.keys(oldReactions).length);
            message.error(t('connectionError') || "Lỗi kết nối!");
        }
    };

    const handleComment = async () => {
        if (!commentInput.trim()) return;
        setLoadingComment(true);
        try {
            await api.post(`/posts/${post.id}/comments`, { content: commentInput });
            setCommentInput(""); setShowAllComments(true);
        } catch (e) { message.error(t('errorComment') || "Lỗi bình luận"); }
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

    // --- 2. HÀM RENDER NỘI DUNG BÀI VIẾT (QUAN TRỌNG NHẤT) ---
    const renderPostContent = () => {
        // A. CHẾ ĐỘ CHỈNH SỬA
        if (isEditing) {
            return (
                <div>
                    <Input.TextArea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        style={{ marginBottom: 10, backgroundColor: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                    />
                    <div style={{ textAlign: 'right', gap: 10, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="small" onClick={() => setIsEditing(false)}>{t('cancel')}</Button>
                        <Button type="primary" size="small" onClick={handleUpdate}>{t('update')}</Button>
                    </div>
                </div>
            );
        }

        // B. CHẾ ĐỘ HIỂN THỊ (THEME)
        // Tìm style tương ứng với themeId được lưu trong post
        const themeId = post.backgroundTheme;
        const theme = POST_THEMES.find(t => t.id === themeId);

        // Nếu có Theme và KHÔNG phải Default -> Render khối màu
        if (theme && themeId !== 'default') {
            return (
                <div style={{
                    ...theme.style, // Áp dụng background gradient và màu chữ
                    padding: '60px 20px', // Khoảng cách rộng như Facebook
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '24px',  // Chữ to
                    fontWeight: 'bold',
                    minHeight: '220px', // Chiều cao tối thiểu
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                    whiteSpace: 'pre-wrap', // Giữ xuống dòng
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)' // Hiệu ứng chiều sâu nhẹ
                }}>
                    {post.content}
                </div>
            );
        }

        // C. MẶC ĐỊNH (TEXT THƯỜNG)
        return (
            <Paragraph style={{ fontSize: '15px', whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>
                {post.content}
            </Paragraph>
        );
    };

    // --- HELPER RENDERS (Tooltip, Icon...) ---
    const reactionSelector = (
        <div style={{ display: 'flex', gap: 10, padding: '5px' }}>
            {Object.keys(REACTION_ICONS).map(type => (
                <Tooltip key={type} title={REACTION_ICONS[type].label}>
                    <div
                        style={{ fontSize: '24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                        className="emoji-hover"
                        onClick={() => handleReact(type)}
                    >
                        {REACTION_ICONS[type].icon}
                    </div>
                </Tooltip>
            ))}
        </div>
    );

    const reactionTooltipContent = useMemo(() => {
        const names = Object.keys(reactions).map(uname => {
            if (uname === currentUser) return t('you');
            const u = users.find(x => x.username === uname);
            return u ? u.displayName : uname;
        });

        if (names.length === 0) return null;
        if (names.length <= 5) return names.join(', ');
        return `${names.slice(0, 5).join(', ')} ${t('and')} ${names.length - 5} ${t('others')}`;
    }, [reactions, users, currentUser, t]);

    const commentTooltipContent = useMemo(() => {
        if (!post.comments || post.comments.length === 0) return null;
        const uniqueCommenters = [...new Set(post.comments.map(c => c.fullName || c.username))];
        if (uniqueCommenters.length <= 5) return uniqueCommenters.join(', ');
        return `${uniqueCommenters.slice(0, 5).join(', ')}...`;
    }, [post.comments]);

    const currentReactionIcon = myReactionType ? (
        <span style={{ marginRight: 5 }}>{REACTION_ICONS[myReactionType].icon}</span>
    ) : <LikeOutlined />;

    const currentReactionText = myReactionType ? (
        <span style={{ color: REACTION_ICONS[myReactionType].color, fontWeight: 600 }}>
            {REACTION_ICONS[myReactionType].label}
        </span>
    ) : t('like');

    const reactionSummary = useMemo(() => {
        if (likeCount === 0) return null;
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
    }, [reactions, likeCount, reactionTooltipContent, REACTION_ICONS]);

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
            <Popover content={userPopoverContent} title={null} trigger="hover" styles={{ body: { backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' } }}>
                <Avatar size={40} src={getAvatarUrl(post.username, post.fullName, post.userAvatar)} style={{ cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={handleViewProfile} />
            </Popover>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Popover content={userPopoverContent} title={null} trigger="hover" styles={{ body: { backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' } }}>
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

    // --- MAIN RENDER ---
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
                <Popover content={reactionSelector} title={null} trigger="hover" styles={{ body: { borderRadius: '20px', padding: '5px' } }}>
                    <Button type="text" key="like" onClick={() => handleReact(myReactionType ? myReactionType : 'LIKE')} style={{ color: 'var(--text-secondary)' }}>
                        {currentReactionIcon} {currentReactionText}
                    </Button>
                </Popover>,

                <Tooltip title={commentTooltipContent ? `${t('commentedBy')} ${commentTooltipContent}` : t('noCommentYet')}>
                    <Button type="text" key="comment" icon={<CommentOutlined />} onClick={handleFocusComment} style={{ color: 'var(--text-secondary)' }}>
                        {post.comments.length > 0 ? t('commentCount').replace('{{count}}', post.comments.length) : t('comment')}
                    </Button>
                </Tooltip>
            ]}
        >
            {/* 3. GỌI HÀM RENDER NỘI DUNG (ĐÃ BAO GỒM THEME VÀ EDIT) */}
            <div style={{ marginTop: '5px', marginBottom: '10px' }}>
                {renderPostContent()}
            </div>

            {/* ẢNH/VIDEO (Sẽ không hiện nếu đã có Theme - Logic bên CreatePost) */}
            {post.imageUrl && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '15px', border: '1px solid var(--border-color)', background: '#000', display: 'flex', justifyContent: 'center' }}>
                    {post.mediaType === 'VIDEO' ? <video src={post.imageUrl} controls style={{ maxWidth: '100%', maxHeight: '500px' }} /> : <Image src={post.imageUrl} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }} />}
                </div>
            )}

            {reactionSummary}

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