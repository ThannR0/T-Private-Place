import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd'; // Bỏ bớt các import thừa
import AppHeader from '../components/layout/AppHeader';
import PostCard from '../components/feed/PostCard';
import CreatePost from '../components/feed/CreatePost'; // 1. Import Component Đăng bài xịn
import api from '../services/api';
import { useChat } from '../context/ChatContext';
import PageTitle from "../components/common/PageTitle.jsx";
const { Content } = Layout;
import { useSettings } from "../context/SettingsContext.jsx";

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const { feedUpdate } = useChat(); // Lấy tín hiệu Real-time
    const { t } = useSettings();

    // Hàm tải danh sách bài viết
    const fetchPosts = async () => {
        try {
            const res = await api.get('/posts');

            setPosts(res.data);
        } catch (error) {
            message.error("Lỗi tải Newsfeed!");
        }
    };

    // Gọi lần đầu
    useEffect(() => {
        fetchPosts();
    }, []);

    // Lắng nghe Real-time (Socket)
    useEffect(() => {
        if (feedUpdate) {
            if (feedUpdate.type === 'NEW_POST') {
                // Nếu có bài mới -> Thêm vào đầu danh sách
                // Kiểm tra trùng để tránh hiện 2 lần (do Optimistic UI)
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPosts(prev => {
                    // Nếu bài đã có (do handleNewPostLocal thêm trước) -> Bỏ qua
                    if (prev.some(p => p.id === feedUpdate.post.id)) return prev;

                    return [feedUpdate.post, ...prev];
                });
            }
            if (feedUpdate.type === 'POST_REACTION_UPDATE') {
                setPosts(prev => prev.map(p =>
                    String(p.id) === String(feedUpdate.postId)
                        ? { ...p, reactions: feedUpdate.reactions, likeCount: feedUpdate.likeCount }
                        : p
                ));
            }
            else if (feedUpdate.type === 'POST_DELETED') {
                setPosts(prev => prev.filter(p => p.id !== feedUpdate.postId));
            }
            else if (feedUpdate.type === 'LIKE_UPDATE') {
                setPosts(prev => prev.map(p =>
                    p.id === feedUpdate.postId ? { ...p, likeCount: feedUpdate.likeCount } : p
                ));
            }
            else if (feedUpdate.type === 'COMMENT_UPDATE') {
                setPosts(prev => prev.map(p =>
                    p.id === feedUpdate.postId ? { ...p, comments: [...p.comments, feedUpdate.comment] } : p
                ));
            }
            else if (feedUpdate.type === 'POST_UPDATED') {
                setPosts(prev => prev.map(p =>
                    p.id === feedUpdate.postId ? { ...p, content: feedUpdate.newContent } : p
                ));
            }
            else if (feedUpdate.type === 'USER_UPDATE') {
                // Cập nhật avatar/tên của người đăng bài nếu họ đổi thông tin
                setPosts(prev => prev.map(post => {
                    if (post.username === feedUpdate.username) {
                        return { ...post, userAvatar: feedUpdate.newAvatar, fullName: feedUpdate.newFullName || post.fullName };
                    }
                    return post;
                }));
            }
        }
    }, [feedUpdate]);

    // Hàm này được gọi khi CreatePost đăng bài thành công
    // (Giúp hiện bài ngay lập tức cho chính mình mà không cần chờ Socket vòng về)
    const handleNewPostLocal = (newPost) => {
        setPosts(prev => {
            if (prev.some(p => p.id === newPost.id)){
                return prev;
            }
            return  [newPost, ...prev];
        });
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
            <PageTitle title= {t('newsfeed')}></PageTitle>

            <Content style={{ maxWidth: '700px', width: '100%', margin: '20px auto', padding: '0 15px' }}>

                {/* 2. SỬ DỤNG COMPONENT CREATE POST TẠI ĐÂY */}
                {/* Thay thế hoàn toàn cái Card nhập liệu cũ */}
                <CreatePost onPostCreated={handleNewPostLocal} />

                {/* Danh sách bài viết */}
                {posts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}

            </Content>
        </Layout>
    );
};

export default Feed;