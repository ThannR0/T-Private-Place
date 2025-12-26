import React, { useEffect, useState } from 'react';
import {Row, Col, Button, Typography, Empty, message, Spin, FloatButton, Input, Select, DatePicker, Layout} from 'antd';
import { PlusOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import EventCard from '../../components/events/EventCard';
import CreateEventModal from '../../components/events/CreateEventModal';
import { useSettings } from '../../context/SettingsContext';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useLocation } from 'react-router-dom'; // 🟢 Thêm dòng này
const { Title, Text } = Typography;

const EventsPage = () => {
    const { currentUser } = useChat();
    const { t } = useSettings();
    const location = useLocation();
    // Data State
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [dateRange, setDateRange] = useState(null);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    // 1. Fetch
    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events');
            setEvents(res.data);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchEvents(); }, [location.key]);

    // --- LOGIC LỌC
    const filteredEvents = events.filter(event => {
        // 1. Lọc theo Tìm kiếm
        const lowerSearch = searchText.toLowerCase();
        const matchText =
            (event.title || "").toLowerCase().includes(lowerSearch) ||
            (event.locationName || "").toLowerCase().includes(lowerSearch);

        if (!matchText) return false;

        // 2. Lọc theo Loại
        if (filterType === 'mine' && event.creatorUsername !== currentUser) return false;
        if (filterType === 'joined' && !event.isJoined) return false;

        // 3. Lọc theo Ngày tháng
        if (dateRange) {
            const eventDate = dayjs(event.startTime);
            const startDate = dateRange[0].startOf('day');
            const endDate = dateRange[1].endOf('day');

            if (eventDate.isBefore(startDate) || eventDate.isAfter(endDate)) {
                return false;
            }
        }

        return true;
    });

    // 2. Logic Modal
    const openCreateModal = () => {
        setEditingEvent(null);
        setModalVisible(true);
    };

    const openEditModal = (event) => {
        setEditingEvent(event);
        setModalVisible(true);
    };

    // 3. XỬ LÝ LƯU
    const handleSaveEvent = async (formData, isEditMode) => {
        setModalLoading(true);
        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };
            if (isEditMode) {
                await api.put(`/events/update`, formData, config);
                message.success(t('updateSuccess') || "Cập nhật thành công!");
            } else {
                await api.post('/events/create', formData, config);
                message.success(t('createSuccess') || "Tạo sự kiện thành công!");
            }
            setModalVisible(false);
            fetchEvents();
        } catch (error) {
            message.error("Lỗi: " + (error.response?.data?.message || "Không thể lưu"));
        } finally {
            setModalLoading(false);
        }
    };

    // 4. Join / Leave
    const handleJoinEvent = async (eventId) => {
        try {
            const targetEvent = events.find(e => e.id === eventId);
            if (!targetEvent) return;

            if (!targetEvent.isJoined && targetEvent.participantCount >= targetEvent.maxParticipants) {
                message.error(t('fullSlot') || "Sự kiện đã hết chỗ!");
                return;
            }

            await api.post(`/events/${eventId}/join`);

            setEvents(prev => prev.map(ev => {
                if (ev.id === eventId) {
                    const isJoining = !ev.isJoined;

                    // 🟢 LOGIC FIX: Cập nhật luôn mảng participants giả lập
                    // Để khi bấm vào chi tiết, nó hiển thị avatar mình ngay lập tức
                    let newParticipants = ev.participants || [];
                    if (isJoining) {
                        // Thêm mình vào (giả lập object user hoặc string username tùy backend)
                        // Tốt nhất là thêm object có avatar để hiển thị đẹp
                        newParticipants = [
                            ...newParticipants,
                            { username: currentUser, fullName: currentUser, avatar: null } // Mock data
                        ];
                    } else {
                        // Xóa mình đi
                        newParticipants = newParticipants.filter(p => {
                            const pName = typeof p === 'string' ? p : p.username;
                            return pName !== currentUser;
                        });
                    }

                    return {
                        ...ev,
                        isJoined: isJoining,
                        participantCount: isJoining ? ev.participantCount + 1 : ev.participantCount - 1,
                        participants: newParticipants
                    };
                }
                return ev;
            }));

            // ... (phần message giữ nguyên)
        } catch (error) {
            message.error(t('connectionError') || "Lỗi kết nối");
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm(t('confirmDeleteEvent') || "Bạn chắc chắn muốn xóa?")) return;
        try {
            await api.delete(`/events/${eventId}`);
            message.success(t('deleteSuccess') || "Đã xóa!");
            setEvents(prev => prev.filter(e => e.id !== eventId));
        } catch (error) { message.error("Lỗi xóa"); }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)', transition: 'background 0.3s' }}>
        <div style={{padding: '20px 0', maxWidth: 1200, margin: '0 auto', backgroundColor: 'var(--bg-color)'}}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                padding: '0 20px'
            }}>
                <div>
                    {/* eventsTitle trong file cũ là "Sự kiện sắp tới", ở đây chỉ cần "Sự kiện" hoặc dùng luôn key cũ */}
                    <Title level={2} style={{margin: 0, color: 'var(--text-color)'}}>
                        <CalendarOutlined style={{marginRight: 10}}/> {t('eventsTitle') || "Sự kiện"}
                    </Title>
                    <Text style={{color: 'var(--text-secondary)'}}>
                        {t('explore') || "Khám phá các hoạt động"}
                    </Text>
                </div>
                <Button type="primary" size="large" icon={<PlusOutlined/>} onClick={openCreateModal} shape="round">
                    {t('createEvent') || "Tạo sự kiện"}
                </Button>
            </div>

            {/* --- THANH TÌM KIẾM & LỌC --- */}
            <div style={{marginBottom: 24, padding: '0 20px'}}>
                <Row gutter={[16, 16]}>
                    {/* Ô Tìm kiếm */}
                    <Col xs={24} md={10}>
                        <Input
                            placeholder={t('searchPlaceholder') || "Tìm kiếm..."}
                            prefix={<SearchOutlined style={{color: '#bfbfbf'}}/>}
                            size="large"
                            allowClear
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{borderRadius: 8}}
                        />
                    </Col>

                    {/* Ô Chọn Ngày (Sử dụng key mới thêm) */}
                    <Col xs={24} md={8}>
                        <DatePicker.RangePicker
                            placeholder={[t('startDate') || 'Từ ngày', t('endDate') || 'Đến ngày']}
                            size="large"
                            style={{width: '100%', borderRadius: 8}}
                            format="DD/MM/YYYY"
                            onChange={(dates) => setDateRange(dates)}
                        />
                    </Col>

                    {/* Ô Chọn Loại (Sử dụng key mới thêm) */}
                    <Col xs={24} md={6}>
                        <Select
                            defaultValue="all"
                            size="large"
                            style={{width: '100%'}}
                            onChange={val => setFilterType(val)}
                            options={[
                                {value: 'all', label: t('all') || 'Tất cả'},
                                {value: 'mine', label: t('myEvents') || 'Của tôi'},
                                {value: 'joined', label: t('joinedEvents') || 'Đã tham gia'},
                            ]}
                        />
                    </Col>
                </Row>
            </div>

            {loading ? <div style={{textAlign: 'center', padding: 50, backgroundColor: 'var(--bg-color)'}}><Spin size="large"/></div> : (
                filteredEvents.length === 0 ?
                    <Empty description={<span style={{color: 'var(--text-secondary)'}}>{t('noEvents') || "Chưa có sự kiện"}</span>}/>
                    : (
                        <Row gutter={[24, 24]} style={{padding: '0 10px'}}>
                            {filteredEvents.map(event => (
                                <Col xs={24} sm={12} lg={8} xl={6} key={event.id}>
                                    <EventCard
                                        event={event}
                                        currentUser={currentUser}
                                        onJoin={handleJoinEvent}
                                        onDelete={handleDeleteEvent}
                                        onEdit={openEditModal}
                                    />
                                </Col>
                            ))}
                        </Row>
                    )
            )}

            <CreateEventModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={handleSaveEvent}
                loading={modalLoading}
                initialData={editingEvent}
            />

            <FloatButton
                icon={<PlusOutlined/>}
                type="primary"
                onClick={openCreateModal}
                tooltip={t('createEvent') || "Tạo mới"}
            />
        </div>
        </Layout>
    );
};

export default EventsPage;