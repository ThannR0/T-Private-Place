import React, { useState, useRef, useEffect } from 'react';
import { Card, Avatar, Typography, Button, Image, Input, List, Popover, message, Dropdown, Modal } from 'antd';
import {
    LikeOutlined, LikeFilled, CommentOutlined, ShareAltOutlined,
    MoreOutlined, EditOutlined, DeleteOutlined,
    MessageOutlined, InfoCircleOutlined, SendOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from '../../utils/common';
import api from '../../services/api';
import PageTitle from "../common/PageTitle.jsx";

const { Text, Paragraph } = Typography;
const { confirm } = Modal;

// Nhận prop onRemove để xử lý xóa bài ngay lập tức
const PostCard = ({ post, onRemove }) => {
    const navigate = useNavigate();
    const { setRecipient, currentUser, currentFullName, currentAvatar } = useChat();

    // --- STATE QUẢN LÝ GIAO DIỆN ---
    const [isLiked, setIsLiked] = useState(post.likedByMe);
    const [likeCount, setLikeCount] = useState(post.likeCount);

    const [showAllComments, setShowAllComments] = useState(false);
    const [commentInput, setCommentInput] = useState("");
    const [loadingComment, setLoadingComment] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const inputRef = useRef(null);

    // --- ĐỒNG BỘ DỮ LIỆU TỪ SOCKET/FEED CHA ---
    useEffect(() => {
        setLikeCount(post.likeCount);
        // Nếu không đang sửa thì cập nhật nội dung mới (nếu có người khác sửa)
        if (!isEditing) setEditContent(post.content);
    }, [post.likeCount, post.content]);

    // --- CÁC HÀM XỬ LÝ (HANDLERS) ---

    // 1. Chuyển sang trang Profile
    const handleViewProfile = () => {
        navigate(`/profile/${post.username}`);
    };

    // 2. Chuyển sang trang Chat
    const handleChat = () => {
        setRecipient(post.username);
        navigate('/chat');
    };

    // 3. Xử lý Like (Optimistic UI - Cập nhật ngay)
    const handleLike = async () => {
        const prevLiked = isLiked;
        const prevCount = likeCount;

        const newLiked = !prevLiked;
        setIsLiked(newLiked);
        setLikeCount(newLiked ? prevCount + 1 : prevCount - 1);

        try {
            await api.post(`/posts/${post.id}/like`);
        } catch (error) {
            console.error("Lỗi like:", error);
            // Hoàn tác nếu lỗi
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            message.error("Lỗi kết nối!");
        }
    };

    // 4. Xử lý Bình luận
    const handleComment = async () => {
        if (!commentInput.trim()) return;
        setLoadingComment(true);
        try {
            await api.post(`/posts/${post.id}/comments`, { content: commentInput });
            setCommentInput("");
            setShowAllComments(true);
        } catch (error) {
            message.error("Lỗi bình luận!");
        } finally {
            setLoadingComment(false);
        }
    };

    // 5. Xử lý Xóa bài viết
    const handleDelete = () => {
        confirm({
            title: 'Xóa bài viết?',
            content: 'Hành động này không thể hoàn tác.',
            okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await api.delete(`/posts/${post.id}`);
                    message.success("Đã xóa!");
                    // Gọi hàm của Cha để xóa bài khỏi danh sách ngay lập tức
                    if (onRemove) onRemove(post.id);
                } catch (error) { message.error("Lỗi xóa!"); }
            },
        });
    };

    // 6. Xử lý Cập nhật bài viết
    const handleUpdate = async () => {
        try {
            await api.put(`/posts/${post.id}`, { content: editContent });
            message.success("Đã cập nhật!");
            setIsEditing(false);
        } catch (error) { message.error("Lỗi cập nhật!"); }
    };

    // 7. Focus vào ô bình luận
    const handleFocusComment = () => {
        setShowAllComments(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // --- CẤU HÌNH GIAO DIỆN ---

    // Menu 3 chấm (Dropdown)
    const menuItems = [
        { key: 'edit', label: 'Chỉnh sửa', icon: <EditOutlined />, onClick: () => setIsEditing(true) },
        { key: 'delete', label: 'Xóa bài', icon: <DeleteOutlined />, danger: true, onClick: handleDelete },
    ];

    // Nội dung Popover khi hover Avatar
    const userPopoverContent = (
        <div style={{ width: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                <Avatar size={50} src={getAvatarUrl(post.username, post.fullName, post.userAvatar)} />
                <div>
                    <Text strong style={{ fontSize: 16, display: 'block' }}>{post.fullName || post.username}</Text>
                    <Text type="secondary">@{post.username}</Text>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                {post.username !== currentUser && (
                    <Button type="primary" icon={<MessageOutlined />} block onClick={handleChat}>Nhắn tin</Button>
                )}
                <Button icon={<InfoCircleOutlined />} block onClick={handleViewProfile}>Hồ sơ</Button>
            </div>
        </div>
    );

    // Tiêu đề Card (Avatar + Tên)
    const cardTitle = (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Popover content={userPopoverContent} title={null} trigger="hover">
                <Avatar
                    size={40}
                    src={getAvatarUrl(post.username, post.fullName, post.userAvatar)}
                    style={{ cursor: 'pointer' }}
                    onClick={handleViewProfile} // Bấm vào Avatar cũng sang Profile
                />
            </Popover>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Popover content={userPopoverContent} title={null} trigger="hover">
                    <Text strong style={{ fontSize: '15px', cursor: 'pointer' }} onClick={handleViewProfile}>
                        {post.fullName || post.username}
                    </Text>
                </Popover>
                <Text type="secondary" style={{ fontSize: '11px', fontWeight: 'normal' }}>
                    {new Date(post.createdAt).toLocaleString()}
                </Text>
            </div>
        </div>
    );

    const commentsToShow = showAllComments ? post.comments : post.comments.slice(0, 2);

    // --- RENDER ---
    return (
        <Card
            style={{ marginBottom: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            styles={{ header: { borderBottom: 'none', padding: '15px 15px 0 15px' }, body: { padding: '0 15px 5px 15px' } }}

            title={cardTitle}

            // Nút 3 chấm (Chỉ hiện nếu là chính chủ)
            extra={
                post.username === currentUser && (
                    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined style={{ fontSize: 20, color: '#666' }} />} />
                    </Dropdown>
                )
            }

            actions={[
                <Button
                    type="text" key="like"
                    icon={isLiked ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                    onClick={handleLike}
                    style={{ color: isLiked ? '#1890ff' : 'inherit' }}
                >
                    {likeCount > 0 ? `${likeCount} Thích` : 'Thích'}
                </Button>,
                <Button type="text" key="comment" icon={<CommentOutlined />} onClick={handleFocusComment}>
                    {post.comments.length > 0 ? `${post.comments.length} Bình luận` : 'Bình luận'}
                </Button>,
                // <Button type="text" key="share" icon={<ShareAltOutlined />}>Chia sẻ</Button>
            ]}
        >
            {/* Nội dung bài viết */}
            <div style={{ marginTop: '5px', marginBottom: '10px' }}>
                {isEditing ? (
                    <div>
                        <Input.TextArea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            autoSize={{ minRows: 2, maxRows: 6 }}
                            style={{ marginBottom: 10 }}
                        />
                        <div style={{ textAlign: 'right', gap: 10, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={() => setIsEditing(false)}>Hủy</Button>
                            <Button type="primary" size="small" onClick={handleUpdate}>Lưu</Button>
                        </div>
                    </div>
                ) : (
                    <Paragraph style={{ fontSize: '15px', whiteSpace: 'pre-wrap' }}>{post.content}</Paragraph>
                )}
            </div>

            {/* Ảnh bài viết */}
            {post.imageUrl && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #f0f0f0', background: '#000', display: 'flex', justifyContent: 'center' }}>
                    {post.mediaType === 'VIDEO' ? (
                        <video
                            src={post.imageUrl}
                            controls
                            style={{ maxWidth: '100%', maxHeight: '500px' }}
                        />
                    ) : (
                        <Image
                            src={post.imageUrl}
                            style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }}
                        />
                    )}
                </div>
            )}

            {/* Khu vực Bình luận */}
            <div style={{ background: '#f9f9f9', margin: '0 -15px', padding: '10px 15px', borderTop: '1px solid #f0f0f0' }}>
                <List
                    dataSource={commentsToShow}
                    split={false}
                    locale={{ emptyText: <span /> }}
                    renderItem={cmt => (
                        <List.Item style={{ padding: '4px 0', border: 'none' }}>
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                                {/* Avatar người bình luận (Bấm vào cũng sang profile) */}
                                <Avatar
                                    size="small"
                                    src={getAvatarUrl(cmt.username, cmt.fullName, cmt.avatar)}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/profile/${cmt.username}`)}
                                />
                                <div style={{ background: '#f0f2f5', padding: '8px 12px', borderRadius: '15px', flex: 1 }}>
                                    <Text strong style={{ fontSize: '12px', marginRight: 5, cursor: 'pointer' }} onClick={() => navigate(`/profile/${cmt.username}`)}>
                                        {cmt.fullName || cmt.username}
                                    </Text>
                                    <Text>{cmt.content}</Text>
                                </div>
                            </div>
                        </List.Item>
                    )}
                />

                {post.comments.length > 2 && !showAllComments && (
                    <Button type="link" onClick={() => setShowAllComments(true)} style={{ paddingLeft: 0, fontSize: '12px' }}>
                        Xem thêm {post.comments.length - 2} bình luận...
                    </Button>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <Avatar size="small" src={getAvatarUrl(currentUser, currentFullName, currentAvatar)} />
                    <Input
                        ref={inputRef}
                        // Placeholder hiện tên đẹp
                        placeholder={`Viết bình luận dưới tên ${currentFullName || currentUser}...`}
                        style={{ borderRadius: 20, background: '#f0f2f5', border: 'none' }}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onPressEnter={handleComment}
                        suffix={<Button type="text" size="small" icon={<SendOutlined />} onClick={handleComment} loading={loadingComment} />}
                    />
                </div>
            </div>
        </Card>
    );
};

export default PostCard;