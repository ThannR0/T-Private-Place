import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, message, Spin, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PostCard from '../components/feed/PostCard';
import api from '../services/api';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext'; // 1. Import Settings

const { Content } = Layout;

const PostDetail = () => {
    const { postId } = useParams(); // ID từ URL (Cố định)
    const navigate = useNavigate();
    const { feedUpdate } = useChat();
    const { t } = useSettings(); // 2. Lấy hàm dịch

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/posts/${postId}`);
            setPost(res.data);
            setError(false);
        } catch (err) {
            console.error("Lỗi lấy bài viết:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (postId) fetchPost();
    }, [postId]);

    // --- LOGIC REAL-TIME (GIỮ NGUYÊN) ---
    useEffect(() => {
        if (feedUpdate && String(feedUpdate.postId) === String(postId)) {

            setPost(prev => {
                if (!prev) return prev;

                // A. Xử lý COMMENT
                if (feedUpdate.type === 'COMMENT_UPDATE') {
                    const exists = prev.comments.some(c => c.id === feedUpdate.comment.id);
                    if (exists) return prev;
                    return { ...prev, comments: [...prev.comments, feedUpdate.comment] };
                }

                // B. Xử lý REACTION (Thả tim/Haha...)
                if (feedUpdate.type === 'POST_REACTION_UPDATE') {
                    return {
                        ...prev,
                        reactions: feedUpdate.reactions,
                        likeCount: feedUpdate.likeCount
                    };
                }

                // C. Xử lý LIKE (Cũ - backup)
                if (feedUpdate.type === 'LIKE_UPDATE') {
                    return { ...prev, likeCount: feedUpdate.likeCount };
                }

                // D. Xử lý SỬA BÀI
                if (feedUpdate.type === 'POST_UPDATED') {
                    return { ...prev, content: feedUpdate.newContent };
                }

                return prev;
            });

            // E. Xử lý XÓA BÀI
            if (feedUpdate.type === 'POST_DELETED') {
                message.warning(t('postDeletedWarning')); // Dùng t()
                navigate('/feed');
            }
        }
    }, [feedUpdate, postId, navigate, t]);

    const handleRemoveSelf = () => {
        navigate('/feed');
    };

    return (
        <Layout style={{
            minHeight: '100vh',
            background: 'var(--bg-color)', // 3. Sửa nền theo Theme
            transition: 'background 0.3s'
        }}>
            <Content style={{ maxWidth: '700px', margin: '20px auto', width: '100%', padding: '0 15px' }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/feed')}
                    style={{
                        marginBottom: 15,
                        border: 'none',
                        background: 'transparent',
                        boxShadow: 'none',
                        color: 'var(--text-color)', // 4. Sửa màu chữ nút Back
                        fontSize: '16px'
                    }}
                >
                    {t('backToFeed')}
                </Button>

                {loading && <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>}

                {!loading && error && (
                    <div style={{ marginTop: 50 }}>
                        <Result
                            status="404"
                            title={<span style={{color: 'var(--text-color)'}}>{t('postNotFound')}</span>}
                            subTitle={<span style={{color: 'var(--text-secondary)'}}>{t('postNotFoundDesc')}</span>}
                            extra={
                                <Button type="primary" onClick={() => navigate('/feed')}>
                                    {t('backToHome')}
                                </Button>
                            }
                        />
                    </div>
                )}

                {!loading && !error && post && (
                    <PostCard post={post} onRemove={handleRemoveSelf} />
                )}
            </Content>
        </Layout>
    );
};

export default PostDetail;