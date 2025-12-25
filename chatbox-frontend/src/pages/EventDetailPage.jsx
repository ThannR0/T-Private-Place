import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {Card, Button, Typography, Tag, Row, Col, Avatar, message, Spin, Space, Divider, List, Layout} from 'antd';
import {
    CalendarOutlined, EnvironmentOutlined, UsergroupAddOutlined, ArrowLeftOutlined,
    CheckCircleOutlined, DeleteOutlined, EditOutlined, CrownOutlined,
    CompassFilled, TeamOutlined, WarningOutlined
} from '@ant-design/icons';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import api from '../services/api';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import CreateEventModal from '../components/events/CreateEventModal';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const LIBRARIES = ['places'];

// Helper Avatar an toàn
const getSafeAvatar = (user) => {
    if (!user) return "https://via.placeholder.com/150";
    if (typeof user === 'string') return `https://ui-avatars.com/api/?name=${user}&background=random`;
    if (user.avatar) return user.avatar;
    return `https://ui-avatars.com/api/?name=${user.fullName || "User"}&background=random`;
};

const EventDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useChat();
    const { t } = useSettings();

    // --- STATE ---
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

    // Load Map
    const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES
    });

    const fetchEvent = async () => {
        try {
            const res = await api.get(`/events/${id}`);
            setEvent(res.data);
        } catch (error) {
            console.error("Lỗi tải detail:", error);
            message.error(t('postNotFound') || "Không tìm thấy sự kiện!");
            navigate('/events');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchEvent(); }, [id]);

    const handleJoin = async () => {
        try {
            await api.post(`/events/${event.id}/join`);
            message.success(event.isJoined ? (t('cancelJoinSuccess') || "Đã hủy tham gia") : (t('joinSuccess') || "Đã tham gia!"));
            fetchEvent();
        } catch (error) { message.error("Lỗi kết nối: " + error.message); }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('confirmDeleteEvent') || "Bạn chắc chắn muốn xóa?")) return;
        try {
            await api.delete(`/events/${event.id}`);
            navigate('/events');
            message.success(t('deleteSuccess') || "Đã xóa!");
        } catch(e) { message.error("Lỗi xóa"); }
    };

    const handleUpdateEvent = async (formData) => {
        setEditLoading(true);
        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            await api.put(`/events/update`, formData, config);
            message.success(t('updateSuccess') || "Cập nhật thành công!");
            setIsEditModalOpen(false);
            fetchEvent();
        } catch (error) {
            message.error("Lỗi cập nhật: " + (error.response?.data?.message || "Vui lòng thử lại"));
        } finally { setEditLoading(false); }
    };

    const openExternalMap = () => {
        if (!event) return;
        const query = (event.latitude && event.longitude) ? `${event.latitude},${event.longitude}` : encodeURIComponent(event.address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    if (loading) return <div style={{textAlign:'center', padding: 100}}><Spin size="large" tip="Đang tải..." /></div>;
    if (!event) return null;

    const isOwner = currentUser && event.creatorUsername && (currentUser === event.creatorUsername);
    const isFull = event.maxParticipants && event.participantCount >= event.maxParticipants;
    const mapCenter = { lat: event.latitude || 21.0285, lng: event.longitude || 105.8542 };
    const startTime = event.startTime ? dayjs(event.startTime) : dayjs();
    const participantsData = Array.isArray(event.participants) ? event.participants : [];

    // --- STYLE ĐÃ SỬA LỖI (Quan trọng) ---
    // Sử dụng var(--bg-color) thay vì var(--card-bg) để khớp với index.css của bạn
    const cardStyle = {
        backgroundColor: 'var(--bg-color)', // Đảm bảo nền thẻ là màu Xám (#242526) khi ở Dark Mode
        borderColor: 'var(--border-color)',
        borderRadius: 16,
        overflow: 'hidden'
    };

    // Style cho text để đảm bảo luôn tương phản với nền
    const primaryTextStyle = { color: 'var(--text-color)' };
    const secondaryTextStyle = { color: 'var(--text-secondary)' };

    // Nút phụ (Back, Edit)
    const btnSecondaryStyle = {
        borderRadius: 8,
        backgroundColor: 'var(--input-bg)', // Dùng màu input cho nút phụ
        color: 'var(--text-color)',
        border: '1px solid var(--border-color)'
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)', transition: 'background 0.3s' }}>
        <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 15}}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} style={btnSecondaryStyle}>
                    {t('back') || "Quay lại"}
                </Button>
                {isOwner && (
                    <Space>
                        <Button icon={<EditOutlined />} onClick={() => setIsEditModalOpen(true)} style={btnSecondaryStyle}>
                            {t('edit') || "Sửa"}
                        </Button>
                        <Button danger icon={<DeleteOutlined />} onClick={handleDelete} style={{borderRadius: 8, background: 'var(--bg-color)'}}>
                            {t('delete') || "Xóa"}
                        </Button>
                    </Space>
                )}
            </div>

            {/* Banner */}
            <div style={{ height: 380, borderRadius: 24, overflow: 'hidden', position: 'relative', marginBottom: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '4px solid var(--bg-color)' }}>
                <img src={event.imageUrl || "https://via.placeholder.com/1000x400"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Event Cover" />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)', padding: '40px 30px' }}>
                    <Title level={1} style={{ color: '#fff', margin: 0 }}>{event.title}</Title>
                    <Space style={{marginTop: 15}} size="middle">
                        <Tag color="#108ee9" style={{fontSize: 16, padding: '8px 15px', borderRadius: 20, border:'none'}}>
                            <CalendarOutlined /> {startTime.format('HH:mm - DD/MM/YYYY')}
                        </Tag>
                        <Tag color="gold" style={{fontSize: 16, padding: '8px 15px', borderRadius: 20, border:'none'}}>
                            <EnvironmentOutlined /> {event.locationName}
                        </Tag>
                    </Space>
                </div>
            </div>

            <Row gutter={32}>
                <Col xs={24} lg={16}>
                    <Card style={cardStyle} bordered={false}>
                        <Title level={4} style={{marginTop: 0, color: 'var(--text-color)'}}>📖 {t('description') || "Chi tiết"}</Title>
                        <Paragraph style={{ fontSize: 16, whiteSpace: 'pre-line', ...primaryTextStyle }}>
                            {event.description || (t('noDesc') || "Chưa có mô tả.")}
                        </Paragraph>
                        <Divider style={{borderColor: 'var(--border-color)'}} />
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                            <Space align="start">
                                <EnvironmentOutlined style={{ fontSize: 24, color: '#ff4d4f', marginTop: 5 }} />
                                <div>
                                    <Text strong style={{ fontSize: 16, display:'block', ...primaryTextStyle }}>{event.locationName}</Text>
                                    <Text style={secondaryTextStyle}>{event.address}</Text>
                                </div>
                            </Space>
                            <Button type="primary" style={{background: '#52c41a', border: 'none', borderRadius: 20, color: '#fff'}} icon={<CompassFilled />} onClick={openExternalMap}>
                                {t('mapBtn') || "Chỉ đường"}
                            </Button>
                        </div>

                        {/* Map Area */}
                        <div style={{height: 350, borderRadius: 16, overflow: 'hidden', marginTop: 20, border: '1px solid var(--border-color)', position: 'relative'}}>
                            {loadError ? (
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', background:'var(--bg-hover)', color:'#ff4d4f'}}>
                                    <WarningOutlined style={{fontSize: 30, marginBottom: 10}}/>
                                    <b>Bản đồ lỗi hiển thị</b>
                                </div>
                            ) : isMapLoaded ? (
                                <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={15} options={{disableDefaultUI: true}}>
                                    <Marker position={mapCenter} />
                                </GoogleMap>
                            ) : <div style={{padding: 20, textAlign:'center', color: 'var(--text-secondary)'}}>Loading Map...</div>}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card style={{ ...cardStyle, textAlign: 'center' }} bordered={false}>
                        <Avatar src={event.creatorAvatar} size={80} style={{marginBottom: 10}} />
                        <Title level={4} style={{margin: 0, ...primaryTextStyle}}>{event.creatorName} <CrownOutlined style={{color:'gold'}}/></Title>
                        <Text style={secondaryTextStyle}>{t('organizer') || "Người tổ chức"}</Text>

                        <div style={{ marginTop: 20, marginBottom: 20 }}>
                            {isOwner ? (
                                <Button size="large" block disabled style={{borderRadius: 8, background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)'}}>
                                    {t('youAreHost')}
                                </Button>
                            ) : (
                                <Button
                                    type={event.isJoined ? "default" : "primary"}
                                    danger={event.isJoined}
                                    size="large" block
                                    icon={event.isJoined ? <UsergroupAddOutlined /> : <CheckCircleOutlined />}
                                    onClick={handleJoin}
                                    disabled={!event.isJoined && isFull}
                                    style={{
                                        borderRadius: 8, fontWeight: 600, height: 45,
                                        // Xử lý nút khi đã tham gia (trong suốt, viền đỏ, chữ đỏ/trắng)
                                        background: event.isJoined ? 'transparent' : undefined,
                                        borderColor: event.isJoined ? '#ff4d4f' : undefined,
                                        color: event.isJoined ? '#ff4d4f' : '#fff'
                                    }}
                                >
                                    {event.isJoined ? (t('cancelJoin') || "Hủy tham gia") : (isFull ? (t('fullSlot') || "Full") : (t('join') || "Tham gia"))}
                                </Button>
                            )}
                        </div>
                        <Divider style={{borderColor: 'var(--border-color)'}} />
                        <div style={{textAlign: 'left'}}>
                            <Space style={{marginBottom: 10, width: '100%', justifyContent:'space-between'}}>
                                <Text strong style={primaryTextStyle}><TeamOutlined /> {t('participantsList') || "Danh sách tham gia"}</Text>
                                <Tag color="blue">{event.participantCount} / {event.maxParticipants}</Tag>
                            </Space>
                            <div style={{maxHeight: 300, overflowY: 'auto'}}>
                                <List
                                    itemLayout="horizontal"
                                    dataSource={participantsData}
                                    renderItem={p => (
                                        <List.Item style={{padding: '8px 0', borderBottom: '1px solid var(--border-color)'}}>
                                            <List.Item.Meta
                                                avatar={<Avatar src={getSafeAvatar(p)} />}
                                                title={<Text style={{fontSize: 13, ...primaryTextStyle}}>{typeof p === 'string' ? p : p.fullName}</Text>}
                                            />
                                        </List.Item>
                                    )}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {isOwner && isEditModalOpen && (
                <CreateEventModal
                    visible={true}
                    onClose={() => setIsEditModalOpen(false)}
                    onCreate={handleUpdateEvent}
                    loading={editLoading}
                    initialData={event}
                />
            )}
        </div>
        </Layout>
    );
};

export default EventDetailPage;