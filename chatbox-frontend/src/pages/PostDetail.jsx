import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, message, Spin, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PostCard from '../components/feed/PostCard';
import api from '../services/api';
import { useChat } from '../context/ChatContext';

const { Content } = Layout;

const PostDetail = () => {
    const { postId } = useParams(); // ID từ URL (Cố định)
    const navigate = useNavigate();
    const { feedUpdate } = useChat();

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

    // --- LOGIC REAL-TIME (ĐÃ FIX LỖI LẶP) ---
    useEffect(() => {
        // Chỉ chạy khi có tin mới và tin đó liên quan đến bài viết này
        if (feedUpdate && feedUpdate.postId == postId) {

            setPost(prev => {
                if (!prev) return prev; // Nếu chưa load xong thì thôi

                // A. Xử lý COMMENT (Có check trùng để an toàn tuyệt đối)
                if (feedUpdate.type === 'COMMENT_UPDATE') {
                    // Kiểm tra xem comment này đã có trong list chưa (tránh duplicate)
                    const exists = prev.comments.some(c => c.id === feedUpdate.comment.id);
                    if (exists) return prev;

                    return { ...prev, comments: [...prev.comments, feedUpdate.comment] };
                }

                // B. Xử lý LIKE
                if (feedUpdate.type === 'LIKE_UPDATE') {
                    return { ...prev, likeCount: feedUpdate.likeCount };
                }

                // C. Xử lý SỬA BÀI
                if (feedUpdate.type === 'POST_UPDATED') {
                    return { ...prev, content: feedUpdate.newContent };
                }

                return prev;
            });

            // D. Xử lý XÓA BÀI (Xử lý ngoài setPost để chuyển trang)
            if (feedUpdate.type === 'POST_DELETED') {
                message.warning("Bài viết này đã bị xóa!");
                navigate('/feed');
            }
        }
    }, [feedUpdate, postId, navigate]); // <--- QUAN TRỌNG: Bỏ 'post' ra khỏi đây
    // -------------------------------------

    const handleRemoveSelf = () => {
        navigate('/feed');
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Content style={{ maxWidth: '700px', margin: '20px auto', width: '100%', padding: '0 15px' }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/feed')}
                    style={{ marginBottom: 15, border: 'none', background: 'transparent', boxShadow: 'none' }}
                >
                    Quay lại Newsfeed
                </Button>

                {loading && <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>}

                {!loading && error && (
                    <Result
                        status="404"
                        title="Không tìm thấy bài viết"
                        subTitle="Bài viết này có thể đã bị xóa hoặc không tồn tại."
                        extra={<Button type="primary" onClick={() => navigate('/feed')}>Về trang chủ</Button>}
                    />
                )}

                {!loading && !error && post && (
                    <PostCard post={post} onRemove={handleRemoveSelf} />
                )}
            </Content>
        </Layout>
    );
};

export default PostDetail;