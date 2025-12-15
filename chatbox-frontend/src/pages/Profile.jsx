import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Avatar, Typography, Button, Spin, message, Tag,
    Row, Col, Modal, Form, Input, Select, DatePicker, Divider, Tooltip
} from 'antd';
import {
    UserOutlined, EditOutlined, ArrowLeftOutlined, MailOutlined,
    CalendarOutlined, CameraOutlined, PhoneOutlined, EnvironmentOutlined,
    IdcardOutlined, MessageOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useChat } from '../context/ChatContext';
import { getAvatarUrl } from '../utils/common';
import moment from 'moment';
import dayjs from 'dayjs';
import PostCard from '../components/feed/PostCard';
import CreatePost from '../components/feed/CreatePost';
import PageTitle from "../components/common/PageTitle.jsx";
import {useSettings} from "../context/SettingsContext.jsx";

const { Title, Text } = Typography;
const { Option } = Select;

const Profile = () => {
    const { targetUsername } = useParams();
    const navigate = useNavigate();

    // 1. LẤY DATA TỪ CONTEXT (Nguồn dữ liệu Realtime chuẩn nhất)
    const {
        currentUser, currentFullName, setCurrentAvatar,
        feedUpdate, users, myStatus, setRecipient
    } = useChat();

    // Xác định Profile của ai
    const isMyProfile = !targetUsername || targetUsername === currentUser;
    const usernameToFetch = isMyProfile ? currentUser : targetUsername;

    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    const [userPosts, setUserPosts] = useState([]);

    // State Modal & Form
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [form] = Form.useForm();
    const fileInputRef = useRef(null);

    const pageTitleName = userInfo ? (userInfo.fullName || userInfo.username) : "Hồ sơ";
    const { t } = useSettings();
    // 2. LOGIC TÍNH TOÁN TRẠNG THÁI (STATUS) REALTIME
    // - Nếu là mình: Lấy myStatus (đồng bộ với Header)
    // - Nếu là người khác: Tìm trong list 'users' (danh sách online từ socket)
    const realtimeStatus = isMyProfile
        ? myStatus
        : (users.find(u => u.username === usernameToFetch)?.status || userInfo?.status || 'OFFLINE');

    // 3. FETCH DỮ LIỆU BAN ĐẦU
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                if (usernameToFetch === 'bot') {
                    setUserInfo({
                        username: 'bot', fullName: 'Trợ lý AI',
                        avatar: 'https://robohash.org/bot?set=set1',
                        email: 'ai@chatbox.com', position: 'SUPPORT',
                        status: 'ONLINE'
                    });
                } else {
                    const res = await api.get(`/users/${usernameToFetch}`);
                    setUserInfo(res.data);

                    const postsRes = await api.get('/posts');
                    // Lọc bài của user này
                    const myPosts = postsRes.data.filter(p => p.username === usernameToFetch);
                    setUserPosts(myPosts);
                }
            } catch (error) {
                console.error("Lỗi tải profile:", error);
                if(isMyProfile) {
                    setUserInfo({ username: currentUser, fullName: currentFullName });
                }
                message.error("Không tìm thấy người dùng!");
                navigate('/feed');
            } finally {
                setLoading(false);
            }
        };

        if (usernameToFetch) fetchProfile();
    }, [usernameToFetch, navigate]);

    // 4. LẮNG NGHE SOCKET (REALTIME UPDATE)
    useEffect(() => {
        if (!feedUpdate) return;

        // A. CẬP NHẬT THÔNG TIN CÁ NHÂN (USER_UPDATE)
        if (feedUpdate.type === 'USER_UPDATE') {
            // 1. Nếu đang xem profile của người vừa update -> Cập nhật thông tin Header
            if (feedUpdate.username === usernameToFetch) {
                setUserInfo(prev => ({ ...prev, ...feedUpdate.data }));
            }

            // 2. Cập nhật Avatar/Tên trong danh sách bài viết (Deep Update)
            setUserPosts(prevPosts => prevPosts.map(post => {
                let updatedPost = { ...post };

                // Nếu người đăng bài đổi thông tin
                if (post.username === feedUpdate.username) {
                    // Ưu tiên lấy từ payload mới nhất, nếu không có thì giữ cũ
                    if (feedUpdate.newAvatar) updatedPost.userAvatar = feedUpdate.newAvatar;
                    if (feedUpdate.newFullName) updatedPost.fullName = feedUpdate.newFullName;
                }

                // Nếu người bình luận đổi thông tin
                if (post.comments && post.comments.length > 0) {
                    updatedPost.comments = post.comments.map(cmt => {
                        if (cmt.username === feedUpdate.username) {
                            return {
                                ...cmt,
                                avatar: feedUpdate.newAvatar || cmt.avatar,
                                fullName: feedUpdate.newFullName || cmt.fullName
                            };
                        }
                        return cmt;
                    });
                }
                return updatedPost;
            }));
        }

        // B. BÀI VIẾT MỚI (NEW_POST)
        else if (feedUpdate.type === 'NEW_POST' && feedUpdate.post.username === usernameToFetch) {
            setUserPosts(prev => {
                // Check trùng ID (convert sang string để an toàn)
                if (prev.some(p => String(p.id) === String(feedUpdate.post.id))) return prev;
                return [feedUpdate.post, ...prev];
            });
        }

        // C. LIKE / COMMENT / DELETE / EDIT (Dành cho PostCard)
        else if (feedUpdate.type === 'LIKE_UPDATE') {
            setUserPosts(prev => prev.map(p =>
                String(p.id) === String(feedUpdate.postId) ? { ...p, likeCount: feedUpdate.likeCount } : p
            ));
        }
        else if (feedUpdate.type === 'COMMENT_UPDATE') {
            setUserPosts(prev => prev.map(p => {
                if (String(p.id) === String(feedUpdate.postId)) {
                    // Check trùng comment
                    const exists = p.comments?.some(c => String(c.id) === String(feedUpdate.comment.id));
                    if(exists) return p;
                    return { ...p, comments: [...(p.comments || []), feedUpdate.comment] };
                }
                return p;
            }));
        }
        else if (feedUpdate.type === 'POST_DELETED') {
            setUserPosts(prev => prev.filter(p => String(p.id) !== String(feedUpdate.postId)));
        }
        else if (feedUpdate.type === 'POST_UPDATED') {
            setUserPosts(prev => prev.map(p =>
                String(p.id) === String(feedUpdate.postId) ? { ...p, content: feedUpdate.newContent } : p
            ));
        }

    }, [feedUpdate, usernameToFetch]);

    // 5. CÁC HÀM XỬ LÝ SỰ KIỆN

    // Xử lý đăng bài mới (Local Update)
    const handleNewPostLocal = (newPost) => {
        setUserPosts(prev => {
            if (prev.some(p => String(p.id) === String(newPost.id))) return prev;
            return [newPost, ...prev];
        });
    };

    // Nhấn nút nhắn tin
    const handleMessageClick = () => {
        setRecipient(usernameToFetch); // Set người nhận trong Context
        navigate('/chat'); // Chuyển sang trang chat
    };

    // Submit form chỉnh sửa
    const handleEditSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                dob: values.dob ? values.dob.format('YYYY-MM-DD') : null
            };

            await api.put(`/users/${currentUser}`, payload);
            message.success("Cập nhật hồ sơ thành công!");

            // Cập nhật UI ngay lập tức (Optimistic UI)
            setUserInfo(prev => ({ ...prev, ...payload }));
            setIsEditModalOpen(false);

            // Socket ở Backend sẽ lo việc báo cho người khác biết
        } catch (error) {
            message.error("Cập nhật thất bại.");
        }
    };

    // Upload Avatar
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        try {
            message.loading({ content: "Đang tải ảnh...", key: "upload" });
            const res = await api.post(`/users/${currentUser}/avatar`, formData);
            message.success({ content: "Đổi ảnh đại diện thành công!", key: "upload" });

            // Cập nhật Context để Header đổi theo ngay
            setCurrentAvatar(res.data);
            localStorage.setItem('avatar', res.data);

            // Local update profile hiện tại
            setUserInfo(prev => ({ ...prev, avatar: res.data }));
        } catch (error) {
            message.error({ content: "Lỗi upload ảnh", key: "upload" });
        }
    };

    // Mở modal edit và điền dữ liệu cũ
    const openEditModal = () => {
        form.setFieldsValue({
            fullName: userInfo.fullName,
            phone: userInfo.phone,
            hometown: userInfo.hometown,
            position: userInfo.position,
            dob: userInfo.dob ? dayjs(userInfo.dob) : null,
            email: userInfo.email
        });
        setIsEditModalOpen(true);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!userInfo) return null;

    const displayAvatar = getAvatarUrl(userInfo.username, userInfo.fullName, userInfo.avatar);

    // Màu sắc cho chức vụ
    const getPositionColor = (pos) => {
        const map = { 'PM': '#f50', 'BA': '#87d068', 'DEV': '#108ee9', 'TESTER': '#2db7f5', 'MANAGER': '#722ed1', 'NHANVIEN': 'default' };
        return map[pos] || 'default';
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: 50, transition: 'background 0.3s' }}>
            <PageTitle title={`${pageTitleName}`} />

            {/* --- 1. COVER PHOTO (GRADIENT ĐẸP HƠN) --- */}
            <div style={{
                height: '240px',
                // Gradient chuyển động nhẹ, hợp cả sáng và tối
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                marginBottom: '80px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                {!isMyProfile && (
                    <Button
                        type="text" icon={<ArrowLeftOutlined />}
                        style={{ position: 'absolute', top: 20, left: 20, color: '#fff', fontWeight: 600, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
                        onClick={() => navigate(-1)}
                    >
                        {t('back')}
                    </Button>
                )}
            </div>

            <div style={{ padding: '0 20px', maxWidth: '1100px', margin: '0 auto' }}>

                {/* --- 2. HEADER PROFILE --- */}
                <div style={{ position: 'relative', top: '-100px', display: 'flex', alignItems: 'flex-end', gap: '30px', flexWrap: 'wrap' }}>

                    {/* AVATAR BLOCK */}
                    <div style={{ position: 'relative' }}>
                        <Avatar
                            size={180}
                            src={displayAvatar}
                            style={{
                                // Viền Avatar: Trong Dark mode là màu nền tối, Light mode là trắng
                                border: '6px solid var(--bg-color)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                background: 'var(--bg-secondary)'
                            }}
                        />

                        {isMyProfile && (
                            <Tooltip title={t('uploadAvatar')}>
                                <Button
                                    shape="circle" icon={<CameraOutlined />}
                                    style={{
                                        position: 'absolute', top: 10, right: 10, zIndex: 10,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                        border: 'none', background: 'var(--bg-color)', color: 'var(--text-color)'
                                    }}
                                    onClick={() => fileInputRef.current.click()}
                                />
                            </Tooltip>
                        )}
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />

                        {/* Status Dot */}
                        <div style={{
                            position: 'absolute', bottom: 25, right: 25,
                            width: 24, height: 24, borderRadius: '50%',
                            background: realtimeStatus === 'ONLINE' ? '#52c41a' : (realtimeStatus === 'BUSY' ? '#ff4d4f' : '#bfbfbf'),
                            border: '4px solid var(--bg-color)', // Viền trùng màu nền
                            zIndex: 5
                        }} title={realtimeStatus} />
                    </div>

                    {/* NAME & ACTIONS */}
                    <div style={{ flex: 1, marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <Title level={2} style={{ margin: 0, fontWeight: 700, color: 'var(--text-color)' }}>
                                    {userInfo.fullName || userInfo.username}
                                </Title>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
                                    <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>@{userInfo.username}</Text>
                                    {userInfo.position && (
                                        <Tag color={getPositionColor(userInfo.position)} style={{ fontWeight: 'bold' }}>
                                            {userInfo.position}
                                        </Tag>
                                    )}
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                {isMyProfile ? (
                                    <Button type="primary" icon={<EditOutlined />} onClick={openEditModal} size="large" style={{ borderRadius: 6 }}>
                                        {t('editProfile')}
                                    </Button>
                                ) : (
                                    <Button type="primary" icon={<MessageOutlined />} onClick={handleMessageClick} size="large" style={{ borderRadius: 6 }}>
                                        {t('messsage')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 3. MAIN CONTENT --- */}
                <Row gutter={24} style={{ marginTop: '-60px' }}>

                    {/* LEFT: INFO CARD */}
                    <Col xs={24} md={8}>
                        <Card
                            title={<span style={{ color: 'var(--text-color)' }}>{t('personalInfo')}</span>}
                            bordered={false}
                            style={{
                                borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20,
                                background: 'var(--bg-secondary)' // Card nền tối
                            }}
                            headStyle={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <InfoItem icon={<MailOutlined />} label="Email" value={userInfo.email} />
                                <InfoItem icon={<PhoneOutlined />} label={t('phone')} value={userInfo.phone} />
                                <InfoItem icon={<CalendarOutlined />} label={t('dob')} value={userInfo.dob ? moment(userInfo.dob).format('DD/MM/YYYY') : null} />
                                <InfoItem icon={<EnvironmentOutlined />} label={t('hometown')} value={userInfo.hometown} />
                                <InfoItem icon={<IdcardOutlined />} label={t('position')} value={userInfo.position} />
                            </div>
                        </Card>
                    </Col>

                    {/* RIGHT: FEED */}
                    <Col xs={24} md={16}>
                        {isMyProfile && <CreatePost onPostCreated={handleNewPostLocal} />}

                        <Divider orientation="left" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                            {t('thisProfile')} - {userPosts.length} posts
                        </Divider>

                        {userPosts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onRemove={(id) => setUserPosts(prev => prev.filter(p => String(p.id) !== String(id)))}
                            />
                        ))}
                    </Col>
                </Row>
            </div>

            {/* --- 4. MODAL EDIT --- */}
            <Modal
                title={t('editProfile')}
                open={isEditModalOpen}
                onCancel={() => setIsEditModalOpen(false)}
                footer={null}
                centered
            >
                <Form layout="vertical" form={form} onFinish={handleEditSubmit}>
                    <Form.Item label="Email" name="email">
                        <Input disabled prefix={<MailOutlined />} style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }} />
                    </Form.Item>
                    <Form.Item label={t('fullName')} name="fullName" rules={[{ required: true }]}>
                        <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item label={t('phone')} name="phone"><Input prefix={<PhoneOutlined />} /></Form.Item>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item label={t('dob')} name="dob"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                        <Col span={12}><Form.Item label={t('hometown')} name="hometown"><Input prefix={<EnvironmentOutlined />} /></Form.Item></Col>
                    </Row>
                    <Form.Item label={t('position')} name="position">
                        <Select>
                            <Option value="MANAGER">Manager</Option>
                            <Option value="PM">Project Manager</Option>
                            <Option value="BA">Business Analyst</Option>
                            <Option value="DEV">Developer</Option>
                            <Option value="TESTER">Tester</Option>
                            <Option value="NHANVIEN">Employee</Option>
                        </Select>
                    </Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button onClick={() => setIsEditModalOpen(false)}>{t('cancel')}</Button>
                        <Button type="primary" htmlType="submit">{t('saveChanges')}</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

// Component con hiển thị Info (Đã chỉnh màu)
const InfoItem = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 18, color: 'var(--text-secondary)' }}>{icon}</div>
        <div>
            <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</Text>
            <div style={{ fontWeight: 500, color: value ? 'var(--text-color)' : 'var(--text-secondary)' }}>
                {value || '---'}
            </div>
        </div>
    </div>
);

export default Profile;